// Story 6.24b — the SUSPICION NOTICES' claiming transaction under TRUE two-connection races (own-committing). Task 4.6;
// AC7b; `2026-10-08-295` RB3 / RB10, `2026-10-09-297` §2; checklist family 2 (code review 2026-10-09).
//
//   · N children of ONE (claim, purpose) at once — the claim-row `FOR UPDATE` serialises them: exactly ONE row, ONE
//     `begun`, the N−1 others `held_by_other` (the winner's row is within the lease) — ⛔ a second row, ⛔ a second claim;
//   · selection → a revision away → the claiming transaction, each on its OWN connection, COMMITTED in turn ⇒ `not_due`,
//     ⛔ row (a FRESH claim);
//   · the give-up (RB3 — ⛔ claim-row lock) finishing a row WHILE a child's claiming transaction is about to — on BOTH
//     losing UPDATEs (the `-297` §2 `error` and RB15's `no_target`): the child's UPDATE waits on the row, re-reads it
//     `error` and reports `already_final` — ⛔ an outcome it did ⛔ write.
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients (the per-test BEGIN/ROLLBACK
// envelope would serialise everything). Each test proves WHERE the loser blocks — its backend is in a `Lock` wait on the
// named statement (`pg_stat_activity`, ⛔ a fixed sleep: under load a sleep passes before the lock is even reached) — then
// the single allowed outcome. Every open transaction is rolled back if a test fails (⛔ a lock left for the cleanup to
// hang on). A FRESH random Pariwar per test; cleanup table by table in replica mode, bounded by `lock_timeout`, then a
// leftover check — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  CORRECTION_SEND_LEASE_MS,
  beginSuspicionNotice,
  expireExhaustedSuspicionNotices,
  projectClaimState,
  selectDueSuspicionNotices,
  suspicionNoticeReclaimCutoff,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, PariwarId } from '../../../src/ids/index.js';
import type { SuspicionNoticePurpose } from '../../../src/schema/claim_suspicion_notices.js';
import { driveClaimTo, seedNomineeDeclaration } from '../_helpers.js';
import { openAppeal, refusedClaim, reverseAtStage1 } from './_suspicion-refusal-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
/** How long a backend may take to REACH its lock wait before the test calls it a failure. */
const WAIT_DEADLINE_MS = 10_000;

describe.skipIf(!hasDatabase)('Story 6.24b — the suspicion notices\' claiming transaction (two connections, own-committing)', () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  /** Transactions still open — rolled back after each test, so a failed assertion ⛔ leaves a lock behind. */
  const open = new Set<{ rollback: () => Promise<void> }>();

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (pariwars.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL lock_timeout = '5s'"); // ⛔ hang on a lock a failed test left (`afterEach` should have freed it)
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
        const { rows: left } = await c.query<{ n: string }>(
          `SELECT (SELECT count(*) FROM claims WHERE pariwar_id::text = ANY($1))
                + (SELECT count(*) FROM claim_suspicion_notices WHERE pariwar_id::text = ANY($1)) AS n`,
          [pariwars],
        );
        if (Number(left[0]!.n) !== 0) throw new Error(`cleanup left ${left[0]!.n} row(s) of this spec's Pariwars`);
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        throw new Error(`[suspicion-notice-concurrency.spec] cleanup failed: ${(e as Error).message}`);
      } finally {
        c.release();
        await pool.end();
      }
    } else {
      await pool.end();
    }
  });

  afterEach(async () => {
    for (const tx of [...open]) await tx.rollback();
    open.clear();
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

  /**
   * An OPEN transaction on its own client — as `twt_app` under `pid`, or the superuser (the BYPASSRLS pool's stand-in) —
   * with its backend pid (for `waitingOn`). Registered in `open` until committed or rolled back.
   */
  async function openTx(pid: PariwarId | null) {
    const client = await pool.connect();
    let done = false;
    const finish = async (sql: 'COMMIT' | 'ROLLBACK') => {
      if (done) return;
      done = true;
      open.delete(tx);
      try {
        await client.query(sql);
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
      if (pid !== null) {
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, pid);
      }
      tx.backendPid = (await client.query<{ p: number }>('SELECT pg_backend_pid() AS p')).rows[0]!.p;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
    return tx;
  }

  /**
   * Resolve once `backendPid` is in a `Lock` wait, returning the statement it waits in — ⛔ a fixed sleep (under load a
   * sleep can pass before the backend even reaches the lock). Fails after `WAIT_DEADLINE_MS`.
   */
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

  const begin = (client: pg.PoolClient, pid: PariwarId, cid: ClaimId, jobId: string, now = new Date(), purpose: SuspicionNoticePurpose = 'suspicion_refusal') =>
    beginSuspicionNotice(client, { pariwarId: pid, claimCaseId: cid, purpose, jobId, now });

  async function rowsOf(cid: string, purpose: SuspicionNoticePurpose = 'suspicion_refusal') {
    const { rows } = await pool.query<{ outcome: string; detail: string | null; attempt_count: number; claimed_by_job: string | null }>(
      `SELECT outcome, detail, attempt_count, claimed_by_job FROM claim_suspicion_notices WHERE claim_case_id = $1 AND purpose = $2`,
      [cid, purpose],
    );
    return rows;
  }

  /** A crash-left `attempting` row the give-up is due to take: created before `cutoff`, last claimed past the lease. */
  async function crashLeftRow(pid: PariwarId, cid: string, purpose: SuspicionNoticePurpose, now: Date, cutoff: Date): Promise<void> {
    await pool.query(
      `INSERT INTO claim_suspicion_notices (pariwar_id, claim_case_id, purpose, outcome, claimed_at, claimed_by_job, created_at)
       VALUES ($1, $2, $3, 'attempting', $4, 'crashed', $5)`,
      [pid, cid, purpose, new Date(now.getTime() - CORRECTION_SEND_LEASE_MS - 1), new Date(cutoff.getTime() - 1)],
    );
  }

  /**
   * R — a claim of S's death in `documents_pending`, CLOSED by S's allowed appeal (RF6); S has ⛔ determination, so RB15
   * resolves ⛔ recipient ⇒ the domain's `no_target` (`closed_no_determination`). Committed.
   */
  async function closedWithoutDetermination(pid: PariwarId): Promise<ClaimId> {
    const mid = randomUUID();
    return onOwnTx(pid, async (c) => {
      const db = bindScopedDb(c);
      await seedNomineeDeclaration(db, pid, mid, { declaredAt: new Date('2026-01-10T06:00:00.000Z') });
      await seedNomineeDeclaration(db, pid, mid, { declaredAt: new Date('2026-06-01T06:00:00.000Z'), ensureMember: false });
      const s = await refusedClaim(c, pid, mid);
      const r = toClaimId(randomUUID());
      await driveClaimTo(c, pid, r, mid, 'intake_pending');
      for (const [from, to, eventType] of [
        ['intake_pending', 'intake_converged', 'claim.intake_converged'],
        ['intake_converged', 'documents_pending', 'claim.documents_received'],
      ] as const) {
        await projectClaimState(c, {
          claimCaseId: r, pariwarId: pid, deceasedMemberId: toMemberId(mid), intakeChannels: ['member_app'], claimantActorId: null,
          eventType, payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system' } as never, actorId: null,
        });
      }
      await openAppeal(c, pid, s);
      await reverseAtStage1(c, pid, s);
      return r;
    });
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
    // ⭐ Both wait on the CLAIM ROW (`… FOR UPDATE`) — ⛔ merely "not yet settled".
    expect(await waitingOn(b.backendPid)).toMatch(/FROM claims .*FOR UPDATE$/);
    expect(await waitingOn(c.backendPid)).toMatch(/FROM claims .*FOR UPDATE$/);
    expect(fromB.state.settled || fromC.state.settled).toBe(false);
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
    await crashLeftRow(pid, s, 'suspicion_refusal', now, cutoff);
    await reviseOff(pid, s); // the child's re-check will FAIL ⇒ it goes for the `error` UPDATE

    const g = await openTx(null);
    expect(await expireExhaustedSuspicionNotices(g.client, { cutoff, now, allow: [pid] })).toEqual([{ claimCaseId: s, purpose: 'suspicion_refusal' }]);
    const child = await openTx(pid);
    const fromChild = track(begin(child.client, pid, s, 'job-1', now));
    // ⭐ It waits on the NOTICE row, in the `-297` §2 `error` UPDATE — ⛔ earlier (the claim row is ⛔ the give-up's).
    expect(await waitingOn(child.backendPid)).toMatch(/^UPDATE claim_suspicion_notices SET outcome = 'error'/);
    expect(fromChild.state.settled).toBe(false);
    await g.commit();
    const out = await fromChild.settled;
    await child.commit();
    expect(out).toEqual({ ok: true, value: { kind: 'already_final' } });
    expect(await rowsOf(s)).toMatchObject([{ outcome: 'error', detail: 'exhausted:attempting_three_days', claimed_by_job: 'crashed' }]);
  });

  it('⭐ …and the RB15 `no_target` UPDATE: the give-up wins ⇒ the child WAITS in that UPDATE, then `already_final` — ⛔ `no_target` reported', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const r = await closedWithoutDetermination(pid);
    const now = new Date();
    const cutoff = suspicionNoticeReclaimCutoff(now);
    await crashLeftRow(pid, r, 'closed_after_appeal', now, cutoff);

    const g = await openTx(null);
    expect(await expireExhaustedSuspicionNotices(g.client, { cutoff, now, allow: [pid] })).toEqual([{ claimCaseId: r, purpose: 'closed_after_appeal' }]);
    const child = await openTx(pid);
    const fromChild = track(begin(child.client, pid, r, 'job-1', now, 'closed_after_appeal'));
    expect(await waitingOn(child.backendPid)).toMatch(/^UPDATE claim_suspicion_notices SET outcome = 'no_target'/);
    expect(fromChild.state.settled).toBe(false);
    await g.commit();
    const out = await fromChild.settled;
    await child.commit();
    expect(out).toEqual({ ok: true, value: { kind: 'already_final' } });
    expect(await rowsOf(r, 'closed_after_appeal')).toMatchObject([{ outcome: 'error', detail: 'exhausted:attempting_three_days' }]);
  });
});
