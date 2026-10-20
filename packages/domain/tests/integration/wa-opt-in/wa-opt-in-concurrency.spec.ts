// Story 5.12 review F1: two real connections, both transaction orderings and competing withdrawals.
// Pauses are at actual SQL boundaries; pg_stat_activity proves the competitor waits on the shared lock.
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { recordConsent } from '../../../src/consent/write.js';
import { bindScopedDb, createDb } from '../../../src/db.js';
import { consentId, memberId, pariwarId } from '../../../src/ids/index.js';
import { isOptInActive, isPeerMeshWaReminderOptedIn } from '../../../src/wa-opt-in/read.js';
import { activateOptIn, createPendingOptIn, endEveryWaYes } from '../../../src/wa-opt-in/write.js';

const url = process.env['DATABASE_URL'];

describe.skipIf(!url)('Story 5.12 — activation/withdrawal serialization (two live connections)', () => {
  let created: ReturnType<typeof createDb>;
  beforeAll(() => { created = createDb(url!, { max: 4, ssl: false }); });
  afterAll(async () => { await created.pool.end(); });

  async function fixture() {
    const pid = pariwarId(randomUUID());
    const mid = memberId(randomUUID());
    const a = await created.pool.connect();
    const b = await created.pool.connect();
    const subject = { pariwarId: pid, memberId: mid };
    const legacy = await created.pool.query<{ consent_id: string }>(
      `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, granted_via_actor, consent_payload, granted_at)
       VALUES ($1,$2,'whatsapp_opt_in','member_self','{}',now() - interval '2 days') RETURNING consent_id`, [pid, mid],
    );
    await created.pool.query(
      `INSERT INTO member_wa_opt_in
       (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, consent_id, matched_at, created_at)
       VALUES ($1,$2,'EXPIRED_24H_WINDOW',$3,'legacy',$4,now() - interval '2 days',now() - interval '2 days')`,
      [pid, mid, `TWT-${randomUUID().slice(0, 8).toUpperCase()}`, legacy.rows[0]!.consent_id],
    );
    await b.query('BEGIN');
    const pending = await createPendingOptIn(bindScopedDb(b), { ...subject, mobileBlindIndex: `test-${randomUUID()}` });
    await b.query('COMMIT');
    const withdrawal = (client: pg.PoolClient) => endEveryWaYes(bindScopedDb(client), {
      ...subject, toState: 'REVOKED', reason: 'concurrency regression', revokedAuditId: null,
    });
    const activate = async () => {
      const cid = consentId(randomUUID());
      // Same transaction as the worker. activateOptIn must itself serialize even a domain caller that
      // inserts its grant first; the worker additionally locks before creating the consent.
      await recordConsent(bindScopedDb(b), {
        pariwarId: pid, subjectId: mid, consentType: 'whatsapp_opt_in', grantedViaActor: 'member_self',
        consentPayload: {}, consentId: cid,
      });
      await activateOptIn(bindScopedDb(b), {
        pariwarId: pid, optInId: pending.optInId, consentId: cid, windowExpiresAt: new Date(Date.now() + 86400000),
      });
    };
    const cleanup = async () => {
      await a.query('ROLLBACK');
      await b.query('ROLLBACK');
      a.release(); b.release();
      await created.pool.query('DELETE FROM member_wa_opt_in WHERE pariwar_id=$1', [pid]);
      await created.pool.query('DELETE FROM consent_records WHERE pariwar_id=$1', [pid]);
    };
    const openCount = async () => Number((await created.pool.query<{ n: string }>(
      'SELECT count(*)::text AS n FROM consent_records WHERE pariwar_id=$1 AND subject_id=$2 AND revoked_at IS NULL', [pid, mid],
    )).rows[0]!.n);
    return { a, b, pid, mid, subject, withdrawal, activate, cleanup, openCount };
  }

  async function waitsOnAdvisory(pid: number, finished: () => boolean): Promise<boolean> {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const { rows } = await created.pool.query<{ wait_event: string | null }>(
        'SELECT wait_event FROM pg_stat_activity WHERE pid=$1', [pid],
      );
      if (rows[0]?.wait_event === 'advisory') return true;
      if (finished()) return false;
      await delay(10);
    }
    return false;
  }

  it('withdrawal before activation leaves the later yes ACTIVE with its own open consent', async () => {
    const f = await fixture();
    const original = f.a.query.bind(f.a);
    let release!: () => void;
    let reached!: () => void;
    const resume = new Promise<void>((r) => { release = r; });
    const paused = new Promise<void>((r) => { reached = r; });
    // Pause AFTER the real ACTIVE UPDATE, precisely where the old helper allowed a split state.
    f.a.query = (async (...args: Parameters<typeof original>) => {
      const result = await original(...args);
      const query = args[0] as unknown as string | { text: string };
      if (/^update "member_wa_opt_in"/i.test(typeof query === 'string' ? query : query.text)) {
        reached(); await resume;
      }
      return result;
    }) as typeof f.a.query;
    let running: Promise<unknown> | undefined;
    try {
      await f.a.query('BEGIN');
      const ending = f.withdrawal(f.a);
      await paused;
      const backend = (await f.b.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      await f.b.query('BEGIN');
      let finished = false;
      running = f.activate().then(() => f.b.query('COMMIT')).finally(() => { finished = true; });
      const waited = await waitsOnAdvisory(backend, () => finished);
      release();
      expect(await ending).toEqual({ movedOptInId: null, consentsRevoked: 1 });
      await f.a.query('COMMIT');
      await running;
      expect(waited).toBe(true);
      expect(await f.openCount()).toBe(1);
      expect(await isOptInActive(created.db, f.subject)).toBe(true);
      expect(await isPeerMeshWaReminderOptedIn(created.db, f.subject)).toBe(true);
    } finally {
      release();
      await f.a.query('ROLLBACK');
      await running?.catch(() => undefined);
      await f.cleanup();
    }
  });

  it('activation before withdrawal ends the ACTIVE row and every earlier consent', async () => {
    const f = await fixture();
    let running: Promise<Awaited<ReturnType<typeof f.withdrawal>>> | undefined;
    try {
      await f.b.query('BEGIN');
      await f.activate();
      const backend = (await f.a.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      await f.a.query('BEGIN');
      let finished = false;
      running = f.withdrawal(f.a).finally(() => { finished = true; });
      const waited = await waitsOnAdvisory(backend, () => finished);
      await f.b.query('COMMIT');
      const result = await running;
      await f.a.query('COMMIT');
      expect(waited).toBe(true);
      expect(result.movedOptInId).not.toBeNull();
      expect(result.consentsRevoked).toBe(2);
      expect(await f.openCount()).toBe(0);
      expect(await isOptInActive(created.db, f.subject)).toBe(false);
      expect(await isPeerMeshWaReminderOptedIn(created.db, f.subject)).toBe(false);
    } finally {
      await f.b.query('ROLLBACK');
      await running?.catch(() => undefined);
      await f.cleanup();
    }
  });

  it('two withdrawals produce one complete mutation and one idempotent no-op', async () => {
    const f = await fixture();
    let running: Promise<Awaited<ReturnType<typeof f.withdrawal>>> | undefined;
    try {
      await f.b.query('BEGIN'); await f.activate(); await f.b.query('COMMIT');
      await f.a.query('BEGIN');
      const first = await f.withdrawal(f.a);
      const backend = (await f.b.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      await f.b.query('BEGIN');
      let finished = false;
      running = f.withdrawal(f.b).finally(() => { finished = true; });
      const waited = await waitsOnAdvisory(backend, () => finished);
      await f.a.query('COMMIT');
      const second = await running;
      await f.b.query('COMMIT');
      expect(waited).toBe(true);
      expect(first.movedOptInId).not.toBeNull();
      expect(first.consentsRevoked).toBe(2);
      expect(second).toEqual({ movedOptInId: null, consentsRevoked: 0 });
      expect(await f.openCount()).toBe(0);
      expect(await isOptInActive(created.db, f.subject)).toBe(false);
    } finally {
      await f.a.query('ROLLBACK');
      await running?.catch(() => undefined);
      await f.cleanup();
    }
  });

  it('a consent-write failure rolls back the earlier state write and releases the member lock', async () => {
    const f = await fixture();
    try {
      await f.b.query('BEGIN'); await f.activate(); await f.b.query('COMMIT');
      // A nonexistent audit FK fails the SECOND UPDATE, after the ACTIVE row was already moved.
      await expect(created.db.transaction((tx) => endEveryWaYes(tx, {
        ...f.subject, toState: 'REVOKED', reason: 'second-write fault', revokedAuditId: randomUUID(),
      }))).rejects.toThrow();
      expect(await f.openCount()).toBe(2);
      expect(await isOptInActive(created.db, f.subject)).toBe(true);
      await f.a.query('BEGIN');
      expect((await f.withdrawal(f.a)).consentsRevoked).toBe(2);
      await f.a.query('COMMIT');
      expect(await isOptInActive(created.db, f.subject)).toBe(false);
    } finally {
      await f.cleanup();
    }
  });
});
