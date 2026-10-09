// Story 6.24b — the SUSPICION NOTICES' claiming transaction under TRUE two-connection races (own-committing). Task 4.6;
// AC7b; `2026-10-08-295` RB3 / RB10, `2026-10-09-297` §2; checklist family 2 (code review 2026-10-09).
//
//   · N children of ONE (claim, purpose) at once — the claim-row `FOR UPDATE` serialises them: exactly ONE row, ONE
//     `begun`, the N−1 others `held_by_other` (the winner's row is within the lease) — ⛔ a second row, ⛔ a second claim;
//   · selection → a revision away → the claiming transaction, each on its OWN connection, COMMITTED in turn ⇒ `not_due`,
//     ⛔ row (a FRESH claim);
//   · the give-up (RB3 — ⛔ claim-row lock) finishing a row WHILE a child's claiming transaction is about to: the child's
//     UPDATE waits on the row, re-reads it `error` and reports `already_final` — ⛔ an outcome it did ⛔ write.
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients (the per-test BEGIN/ROLLBACK
// envelope would serialise everything). Each test proves the BLOCKING itself, then the single allowed outcome. A FRESH
// random Pariwar per test; cleanup table by table in replica mode — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import {
  CORRECTION_SEND_LEASE_MS,
  beginSuspicionNotice,
  expireExhaustedSuspicionNotices,
  selectDueSuspicionNotices,
  suspicionNoticeReclaimCutoff,
} from '../../../src/claim/index.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, PariwarId } from '../../../src/ids/index.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
/** How long B must stay pending while A holds the row (a blocked lock wait never resolves on its own). */
const BLOCKED_MS = 500;

describe.skipIf(!hasDatabase)('Story 6.24b — the suspicion notices\' claiming transaction (two connections, own-committing)', () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (pariwars.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) {
          await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[suspicion-notice-concurrency.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  function freshPariwar(): PariwarId {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    return pid;
  }

  /** `fn` in its OWN committed transaction as `twt_app` under `pid`. */
  async function onOwnTx<T>(pid: PariwarId, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, pid);
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** An OPEN transaction on its own client — as `twt_app` under `pid`, or the superuser (the BYPASSRLS pool's stand-in). */
  async function openTx(pid: PariwarId | null) {
    const client = await pool.connect();
    await client.query('BEGIN');
    if (pid !== null) {
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, pid);
    }
    return {
      client,
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
      },
    };
  }

  /** Track a promise's settlement without awaiting it. */
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

  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const begin = (client: pg.PoolClient, pid: PariwarId, cid: ClaimId, jobId: string, now = new Date()) =>
    beginSuspicionNotice(client, { pariwarId: pid, claimCaseId: cid, purpose: 'suspicion_refusal', jobId, now });

  async function rowsOf(cid: string) {
    const { rows } = await pool.query<{ outcome: string; detail: string | null; attempt_count: number; claimed_by_job: string | null }>(
      `SELECT outcome, detail, attempt_count, claimed_by_job FROM claim_suspicion_notices WHERE claim_case_id = $1 AND purpose = 'suspicion_refusal'`,
      [cid],
    );
    return rows;
  }

  /** Revise the live decision OFF `-239` (supersede + a new live row with another reason), committed. */
  async function reviseOff(pid: PariwarId, cid: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ decision_id: string }>(
        `UPDATE claim_verifier_decisions SET superseded_at = clock_timestamp() WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id`,
        [cid],
      );
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id)
         VALUES ($1, $2, 'denied', 'other', 'enc:v1:r', $3, 'Anita (District Admin)', $4)`,
        [cid, pid, randomUUID(), rows[0]!.decision_id],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  it('⭐ THREE children of one (claim, purpose) at once ⇒ ONE row, ONE `begun`; the two others WAIT on the claim row, then `held_by_other`', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const s = await onOwnTx(pid, (c) => refusedClaim(c, pid, randomUUID()));

    const a = await openTx(pid);
    expect(await begin(a.client, pid, s, 'job-a')).toMatchObject({ kind: 'begun', attemptCount: 1 });
    const b = await openTx(pid);
    const c = await openTx(pid);
    const fromB = track(begin(b.client, pid, s, 'job-b'));
    const fromC = track(begin(c.client, pid, s, 'job-c'));
    await pause(BLOCKED_MS);
    expect(fromB.state.settled, 'B must WAIT on the claim-row lock').toBe(false);
    expect(fromC.state.settled, 'C must WAIT on the claim-row lock').toBe(false);
    await a.commit();
    // ⚠ Each loser holds the claim row until ITS transaction ends (production's scope tx commits at once) — so commit
    // each as it settles, or the other waits on it to the lock timeout.
    const [outB, outC] = await Promise.all([
      fromB.settled.then(async (r) => (await b.commit(), r)),
      fromC.settled.then(async (r) => (await c.commit(), r)),
    ]);
    expect(outB).toEqual({ ok: true, value: { kind: 'held_by_other' } });
    expect(outC).toEqual({ ok: true, value: { kind: 'held_by_other' } });
    expect(await rowsOf(s)).toEqual([{ outcome: 'attempting', detail: null, attempt_count: 1, claimed_by_job: 'job-a' }]);
  });

  it('⭐ Task 4.6 — selection, a revision away, then the claim — each on its OWN connection, COMMITTED in turn ⇒ `not_due`, ⛔ row', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const s = await onOwnTx(pid, (c) => refusedClaim(c, pid, randomUUID()));
    const page = await selectDueSuspicionNotices(pool, { purpose: 'suspicion_refusal', after: null, limit: 100, allow: [pid] });
    expect(page.due.map((d) => d.claimCaseId)).toContain(s);
    await reviseOff(pid, s);
    expect(await onOwnTx(pid, (c) => begin(c, pid, s, 'job-1'))).toEqual({ kind: 'not_due' });
    expect(await rowsOf(s)).toEqual([]);
  });

  it('⭐ the give-up (⛔ claim-row lock) finishes a row a child is about to finish ⇒ the child WAITS on the row, then `already_final` — ⛔ an outcome it did ⛔ write', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const s = await onOwnTx(pid, (c) => refusedClaim(c, pid, randomUUID()));
    const now = new Date();
    const cutoff = suspicionNoticeReclaimCutoff(now);
    // A crash-left row: created before the cutoff, last claimed past the lease, by another job.
    await pool.query(
      `INSERT INTO claim_suspicion_notices (pariwar_id, claim_case_id, purpose, outcome, claimed_at, claimed_by_job, created_at)
       VALUES ($1, $2, 'suspicion_refusal', 'attempting', $3, 'crashed', $4)`,
      [pid, s, new Date(now.getTime() - CORRECTION_SEND_LEASE_MS - 1), new Date(cutoff.getTime() - 1)],
    );
    await reviseOff(pid, s); // the child's re-check will FAIL ⇒ it goes for the `error` UPDATE

    const g = await openTx(null);
    expect(await expireExhaustedSuspicionNotices(g.client, { cutoff, now, allow: [pid] })).toEqual([{ claimCaseId: s, purpose: 'suspicion_refusal' }]);
    const child = await openTx(pid);
    const fromChild = track(begin(child.client, pid, s, 'job-1', now));
    await pause(BLOCKED_MS);
    expect(fromChild.state.settled, 'the child\'s UPDATE must WAIT on the give-up\'s row lock').toBe(false);
    await g.commit();
    const out = await fromChild.settled;
    await child.commit();
    expect(out).toEqual({ ok: true, value: { kind: 'already_final' } });
    expect(await rowsOf(s)).toMatchObject([{ outcome: 'error', detail: 'exhausted:attempting_three_days', claimed_by_job: 'crashed' }]);
  });
});
