// Story 5.11b — the ALERT SMS send record's BEGIN under TRUE two-connection races (own-committing). AC3; `2026-10-25-404` FS6 (a).
// The `suspicion-notice-concurrency.spec.ts` shape: real concurrent transactions on SEPARATE pool clients, the loser proven
// WAITING in a `Lock` on the named statement (`pg_stat_activity`, ⛔ a sleep), then the single allowed outcome.
//
//   · two workers BEGIN one (alert, member, occasion) at once — the unique index serialises them: A holds its begin open; B's
//     `INSERT … ON CONFLICT DO NOTHING` WAITS on A's uncommitted key; A commits; B inserts nothing, finds the row ⛔ `deferred`
//     and reports `taken` — ⛔ a second row, ⛔ a write to A's row; A's finalise lands `accepted`. ⛔ Keyed store here: it would
//     stop the second worker on its own and prove nothing about the record (AC3);
//   · two workers RE-CLAIM one `deferred` row at once — A's uncommitted compare-and-set holds the tuple, so B's begin waits on it:
//     exactly ONE `begun` (attempt 2), the other `taken`.
//
// A FRESH random Pariwar per test; cleanup in replica mode by Pariwar, then a leftover check — fixture cleanup ONLY.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { beginAlertSmsSend, finaliseAlertSmsSend, giveUpDeferredAlertSmsSend, lookupAlertSmsSend, type AlertSmsSendKey } from '../../../src/sms-delivery/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const WAIT_DEADLINE_MS = 10_000;

describe.skipIf(!hasDatabase)('Story 5.11b — the alert SMS send record\'s begin (two connections, own-committing)', () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const open = new Set<{ rollback: () => Promise<void> }>();

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      if (pariwars.length > 0) {
        await c.query('BEGIN');
        await c.query("SET LOCAL lock_timeout = '5s'");
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query(`DELETE FROM alert_sms_sends WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        await c.query(`DELETE FROM alerts WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        await c.query('COMMIT');
        const { rows } = await c.query<{ n: string }>(
          `SELECT (SELECT count(*) FROM alert_sms_sends WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM alerts WHERE pariwar_id::text = ANY($1)) AS n`,
          [pariwars],
        );
        if (Number(rows[0]!.n) !== 0) throw new Error(`cleanup left ${rows[0]!.n} row(s) of this spec's Pariwars`);
      }
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw new Error(`[alert-sms-sends-concurrency.spec] cleanup failed: ${(e as Error).message}`);
    } finally {
      c.release();
      await pool.end();
    }
  });

  afterEach(async () => {
    for (const tx of [...open]) await tx.rollback();
    open.clear();
  });

  /** A fresh Pariwar and its committed alert (as the superuser — the projector's guard set for the one INSERT). */
  async function freshKey(): Promise<AlertSmsSendKey> {
    const pariwarId = randomUUID();
    pariwars.push(pariwarId);
    const alertId = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(
        `INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count, current_state, state_event_version, created_by_actor)
         VALUES ($1, $2, $3, 1, 'live', 3, 'trustee-actor-1')`,
        [alertId, randomUUID(), pariwarId],
      );
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
    return { pariwarId, alertId, memberId: randomUUID(), occasion: 'day_10' };
  }

  async function openTx(pariwarId: string) {
    const client = await pool.connect();
    let done = false;
    const finish = async (statement: 'COMMIT' | 'ROLLBACK') => {
      if (done) return;
      done = true;
      open.delete(tx);
      try {
        await client.query(statement);
      } finally {
        client.release();
      }
    };
    const tx = {
      client,
      backendPid: 0,
      commit: () => finish('COMMIT'),
      rollback: () => finish('ROLLBACK').catch(() => undefined),
    };
    open.add(tx);
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, pariwarId);
      tx.backendPid = (await client.query<{ p: number }>('SELECT pg_backend_pid() AS p')).rows[0]!.p;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
    return tx;
  }

  async function waitingOn(backendPid: number): Promise<string> {
    const deadline = Date.now() + WAIT_DEADLINE_MS;
    for (;;) {
      const { rows } = await pool.query<{ query: string }>(
        `SELECT query FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`,
        [backendPid],
      );
      if (rows[0]) return rows[0].query.replace(/\s+/g, ' ').trim();
      if (Date.now() > deadline) throw new Error(`backend ${String(backendPid)} never reached a lock wait`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  function track<T>(p: Promise<T>) {
    const state = { settled: false };
    const settled = p.then(
      (v) => {
        state.settled = true;
        return { ok: true as const, value: v };
      },
      (e: unknown) => {
        state.settled = true;
        return { ok: false as const, error: e };
      },
    );
    return { state, settled };
  }

  const meta = { message: 'deadline_not_recorded' as const, locale: 'hi' as const };

  async function rowsOf(key: AlertSmsSendKey) {
    const { rows } = await pool.query<{ outcome: string; attempt_count: number; claim_token: string; provider_message_id: string | null }>(
      `SELECT outcome, attempt_count, claim_token, provider_message_id FROM alert_sms_sends WHERE alert_id = $1 AND member_id = $2 AND occasion = $3`,
      [key.alertId, key.memberId, key.occasion],
    );
    return rows;
  }

  it('⭐ two workers BEGIN one (alert, member, occasion) at once ⇒ B WAITS on A\'s key, then `taken`; ONE row; A\'s finalise lands `accepted`', { timeout: TIMEOUT }, async () => {
    const key = await freshKey();
    const a = await openTx(key.pariwarId);
    const fromA = await beginAlertSmsSend(a.client, { ...key, ...meta, claimToken: 'job-a:0' });
    expect(fromA).toMatchObject({ kind: 'begun', attemptCount: 1 });
    const b = await openTx(key.pariwarId);
    const fromB = track(beginAlertSmsSend(b.client, { ...key, ...meta, claimToken: 'job-b:0' }));
    // ⭐ B waits on A's uncommitted unique-index entry — ⛔ merely "not yet settled".
    expect(await waitingOn(b.backendPid)).toMatch(/^INSERT INTO alert_sms_sends .*ON CONFLICT .*DO NOTHING/);
    expect(fromB.state.settled).toBe(false);
    await a.commit();
    const outB = await fromB.settled;
    await b.commit();
    expect(outB).toEqual({ ok: true, value: { kind: 'taken' } });
    expect(await rowsOf(key)).toEqual([{ outcome: 'attempting', attempt_count: 1, claim_token: 'job-a:0', provider_message_id: null }]);
    // A finalises on its own scope (a fresh tx — production's finalise runs after the gateway call, ⛔ holding begin's tx).
    if (fromA.kind !== 'begun') throw new Error('unreachable');
    const fin = await openTx(key.pariwarId);
    expect(
      await finaliseAlertSmsSend(fin.client, {
        pariwarId: key.pariwarId,
        sendId: fromA.sendId,
        claimToken: 'job-a:0',
        outcome: 'accepted',
        detail: null,
        providerMessageId: 'req0001',
      }),
    ).toBe(true);
    await fin.commit();
    expect(await rowsOf(key)).toEqual([{ outcome: 'accepted', attempt_count: 1, claim_token: 'job-a:0', provider_message_id: 'req0001' }]);
  });

  it('⭐ two workers RE-CLAIM one `deferred` row at once ⇒ exactly ONE `begun` (attempt 2); the other WAITS on the row, then `taken`', { timeout: TIMEOUT }, async () => {
    const key = await freshKey();
    const seed = await openTx(key.pariwarId);
    const first = await beginAlertSmsSend(seed.client, { ...key, ...meta, claimToken: 'job-0:0' });
    if (first.kind !== 'begun') throw new Error('unreachable');
    await finaliseAlertSmsSend(seed.client, {
      pariwarId: key.pariwarId,
      sendId: first.sendId,
      claimToken: 'job-0:0',
      outcome: 'deferred',
      detail: 'rate_limited:http_429',
    });
    await seed.commit();

    const a = await openTx(key.pariwarId);
    expect(await beginAlertSmsSend(a.client, { ...key, ...meta, claimToken: 'job-a:1' })).toEqual({ kind: 'begun', sendId: first.sendId, attemptCount: 2 });
    const b = await openTx(key.pariwarId);
    const fromB = track(beginAlertSmsSend(b.client, { ...key, ...meta, claimToken: 'job-b:1' }));
    // B waits in begin — its INSERT's speculative check waits on the tuple A's uncommitted re-claim holds.
    expect(await waitingOn(b.backendPid)).toMatch(/^(INSERT INTO alert_sms_sends .*ON CONFLICT|UPDATE alert_sms_sends SET outcome = 'attempting')/);
    await a.commit();
    const outB = await fromB.settled;
    await b.commit();
    expect(outB).toEqual({ ok: true, value: { kind: 'taken' } });
    expect(await rowsOf(key)).toEqual([{ outcome: 'attempting', attempt_count: 2, claim_token: 'job-a:1', provider_message_id: null }]);
  });

  async function deferredNearExpiry() {
    const key = await freshKey();
    const seed = await openTx(key.pariwarId);
    const begun = await beginAlertSmsSend(seed.client, { ...key, ...meta, claimToken: 'seed:0' });
    if (begun.kind !== 'begun') throw new Error('seed did not begin');
    await finaliseAlertSmsSend(seed.client, { pariwarId: key.pariwarId, sendId: begun.sendId, claimToken: 'seed:0', outcome: 'deferred', detail: 'rate_limited:http_429' });
    await seed.commit();
    return { key, sendId: begun.sendId };
  }

  it('AP-P3 — begin locks an attempting row after an earlier deferred observation, blocking a concurrent 429 finalise until its guarded update finishes', { timeout: TIMEOUT }, async () => {
    const { key, sendId } = await deferredNearExpiry();
    const a = await openTx(key.pariwarId);
    expect((await lookupAlertSmsSend(a.client, key)).kind).toBe('deferred');
    const b = await openTx(key.pariwarId);
    expect(await beginAlertSmsSend(b.client, { ...key, ...meta, claimToken: 'b:1' })).toMatchObject({ kind: 'begun', attemptCount: 2 });
    await b.commit();
    // Stop A exactly after its lock SELECT, before its UPDATE. Always release the latch on assertion failure.
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let locked!: () => void;
    const reached = new Promise<void>(resolve => { locked = resolve; });
    let selected = -1;
    const wrapped: Parameters<typeof beginAlertSmsSend>[0] = { query: (async (text: string, values?: unknown[]) => {
      const result = await a.client.query(text, values);
      if (text.includes('SELECT send_id FROM alert_sms_sends')) {
        selected = result.rows.length;
        locked();
        await gate;
      }
      return result;
    }) as pg.PoolClient['query'] };
    const fromA = track(beginAlertSmsSend(wrapped, { ...key, ...meta, claimToken: 'a:1' }));
    try {
      await reached;
      expect(selected).toBe(1);
      const fin = await openTx(key.pariwarId);
      const finalised = track(finaliseAlertSmsSend(fin.client, { pariwarId: key.pariwarId, sendId, claimToken: 'b:1', outcome: 'deferred', detail: 'rate_limited:http_429' }));
      expect(await waitingOn(fin.backendPid)).toMatch(/^UPDATE alert_sms_sends/);
      release();
      expect(await fromA.settled).toEqual({ ok: true, value: { kind: 'taken' } });
      await a.commit();
      expect(await finalised.settled).toEqual({ ok: true, value: true });
      await fin.commit();
      expect(await rowsOf(key)).toEqual([{ outcome: 'deferred', attempt_count: 2, claim_token: 'b:1', provider_message_id: null }]);
    } finally {
      release();
      await fromA.settled;
      await a.rollback();
    }
  });

  it('FD-P2 — a fresh lookup cannot authorize reclaim after the row expires', { timeout: TIMEOUT }, async () => {
    const { key } = await deferredNearExpiry();
    const tx = await openTx(key.pariwarId);
    expect((await lookupAlertSmsSend(tx.client, key)).kind).toBe('deferred');
    // Age the committed row between the advisory lookup and the actual mutation.
    await pool.query("UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '31 minutes' WHERE alert_id = $1", [key.alertId]);
    expect(await beginAlertSmsSend(tx.client, { ...key, ...meta, claimToken: 'late:1' })).toEqual({ kind: 'taken' });
    await tx.commit();
    expect(await rowsOf(key)).toEqual([{ outcome: 'deferred', attempt_count: 1, claim_token: 'seed:0', provider_message_id: null }]);
  });

  it('FD-P2 — freshness is judged AFTER waiting on a row lock even when the blocker makes no update', { timeout: TIMEOUT }, async () => {
    const { key } = await deferredNearExpiry();
    await pool.query("UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '30 minutes' + interval '2 seconds' WHERE alert_id = $1", [key.alertId]);
    const blocker = await openTx(key.pariwarId);
    await blocker.client.query('SELECT send_id FROM alert_sms_sends WHERE alert_id = $1 FOR UPDATE', [key.alertId]);
    const waiter = await openTx(key.pariwarId);
    expect((await lookupAlertSmsSend(waiter.client, key)).kind).toBe('deferred');
    const begun = track(beginAlertSmsSend(waiter.client, { ...key, ...meta, claimToken: 'waiter:1' }));
    // This proves the lock wait; the later DB sleep advances the AGE boundary, not the concurrency assertion.
    expect(await waitingOn(waiter.backendPid)).toMatch(/SELECT send_id FROM alert_sms_sends .*FOR UPDATE/);
    await pool.query("SELECT pg_sleep(GREATEST(0, EXTRACT(EPOCH FROM updated_at + interval '30 minutes' - clock_timestamp())) + 0.05) FROM alert_sms_sends WHERE alert_id = $1", [key.alertId]);
    await blocker.commit();
    expect(await begun.settled).toEqual({ ok: true, value: { kind: 'taken' } });
    await waiter.commit();
    expect(await rowsOf(key)).toEqual([{ outcome: 'deferred', attempt_count: 1, claim_token: 'seed:0', provider_message_id: null }]);
  });

  it('FD-P3 — an expired observation cannot freeze a newly rate-limited attempt', { timeout: TIMEOUT }, async () => {
    const { key, sendId } = await deferredNearExpiry();
    await pool.query("UPDATE alert_sms_sends SET updated_at = clock_timestamp() - interval '30 minutes' + interval '2 seconds' WHERE alert_id = $1", [key.alertId]);
    const retry = await openTx(key.pariwarId);
    expect(await beginAlertSmsSend(retry.client, { ...key, ...meta, claimToken: 'new:1' })).toMatchObject({ kind: 'begun', attemptCount: 2 });
    // The old committed deferred tuple remains visible while retry's new attempt is uncommitted.
    await pool.query("SELECT pg_sleep(GREATEST(0, EXTRACT(EPOCH FROM updated_at + interval '30 minutes' - clock_timestamp())) + 0.05) FROM alert_sms_sends WHERE alert_id = $1", [key.alertId]);
    const observer = await openTx(key.pariwarId);
    expect((await lookupAlertSmsSend(observer.client, key)).kind).toBe('deferred_expired');
    await finaliseAlertSmsSend(retry.client, { pariwarId: key.pariwarId, sendId, claimToken: 'new:1', outcome: 'deferred', detail: 'rate_limited:http_429' });
    // Start the give-up while it still has to wait on the other worker's row.
    const gaveUp = track(giveUpDeferredAlertSmsSend(observer.client, { pariwarId: key.pariwarId, sendId, detail: 'exhausted:rate_limited:expired', onlyIfExpired: true }));
    expect(await waitingOn(observer.backendPid)).toMatch(/SELECT send_id FROM alert_sms_sends .*FOR UPDATE/);
    await retry.commit();
    expect(await gaveUp.settled).toEqual({ ok: true, value: false });
    expect((await lookupAlertSmsSend(observer.client, key)).kind).toBe('deferred');
    // Expiry is conditional, but the separate final-attempt give-up still intentionally closes a young row.
    expect(await giveUpDeferredAlertSmsSend(observer.client, { pariwarId: key.pariwarId, sendId, detail: 'exhausted:config_unavailable:secret_manager' })).toBe(true);
    await observer.commit();
    expect(await rowsOf(key)).toEqual([{ outcome: 'error', attempt_count: 2, claim_token: 'new:1', provider_message_id: null }]);
  });

});
