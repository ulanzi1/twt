// Story 6.24a — the three per-death serialisations, as TRUE two-connection races (own-committing). `2026-10-07-292`.
//
//   RF15 — the per-death APPEAL key: an appeal INITIATION and a held claim's FINAL approval serialise, each judging the
//          90 days with the `clock_timestamp()` read AFTER the key (Trap 16) — so they resolve one way only: either the
//          appeal opens and the approval waits (`appeal_open`), or the approval proceeds and the initiation answers the
//          time-limit 409.
//   RF6  — the per-death REVERSAL key: two `-239` claims of one death reversed at once serialise (⛔ no 40P01) — one is
//          reversed, the other is CLOSED by it and its own reversal then finds it ⛔ not at a stage.
//   RF13 — `reviseDecision` takes the death's INTAKE lock first: a revision OFF `-239` racing a new claim's MINT waits
//          for it, then sees the minted claim and is refused (`SuspicionReasonLockedError`).
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients (the per-test BEGIN/ROLLBACK
// envelope would serialise everything). Each test proves the BLOCKING itself — B is still pending while A holds its key —
// then the single allowed outcome. A FRESH random Pariwar per test; cleanup table by table in replica mode (append-only
// triggers and RI cascades off) — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import {
  AppealStageMismatchError,
  AppealTimeLimitPassedError,
  SuspicionAppealPendingError,
  SuspicionReasonLockedError,
  initiateAppeal,
  reviewAppealStage1,
  reviseDecision,
  tryConverge,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, PariwarId } from '../../../src/ids/index.js';
import { driveClaimTo, seedNomineeNameCheck } from '../_helpers.js';
import { CIPHER, DA, REVIEWER, openAppeal, refusedClaim } from './_suspicion-refusal-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const DAY = 86_400_000;
const PA = 'a4a4a4a4-0000-4000-8000-000000000004';
/** How long B must stay pending while A holds the key (a blocked lock wait never resolves on its own). */
const BLOCKED_MS = 500;

describe.skipIf(!hasDatabase)('Story 6.24a — the per-death serialisations (two connections, own-committing)', () => {
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
        await c.query(`DELETE FROM idempotency_keys WHERE ${pariwars.map((_, i) => `key LIKE '%' || $${i + 1} || '%'`).join(' OR ')}`, pariwars);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[suspicion-refusal-concurrency.spec] cleanup:', (e as Error).message);
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

  /** An OPEN transaction on its own client (the caller commits / rolls back). */
  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pid);
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

  /** R — another claim of the death, approvable at its final vote (`verifier_approved`), COMMITTED. */
  async function approvableHeld(pid: PariwarId, mid: string): Promise<ClaimId> {
    const cid = toClaimId(randomUUID());
    await onOwnTx(pid, async (c) => {
      await driveClaimTo(c, pid, cid, mid, 'verifier_approved');
      await seedNomineeNameCheck(c, pid, cid);
    });
    return cid;
  }

  const vote = (client: pg.PoolClient, pid: PariwarId, cid: ClaimId) =>
    voteOnFrozenClaim(client, {
      claimCaseId: cid, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
    });

  it('RF15 (a) — the INITIATION holds the key first: the final approval BLOCKS, then reads the committed anchor ⇒ waits `appeal_open`', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = randomUUID();
    const s = await onOwnTx(pid, (c) => refusedClaim(c, pid, mid));
    const r = await approvableHeld(pid, mid);

    const a = await openTx(pid);
    await initiateAppeal(a.client, { claimCaseId: s, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
    const b = await openTx(pid);
    const approval = track(vote(b.client, pid, r));
    await pause(BLOCKED_MS);
    expect(approval.state.settled, 'the final approval must WAIT on the per-death key').toBe(false);
    await a.commit();
    const out = await approval.settled;
    await b.rollback();
    // ⭐ It read the anchor AFTER the initiation committed: `appeal_open` (⛔ not `appeal_not_filed` — the pre-key read).
    expect(out.ok).toBe(false);
    expect((out as { error: unknown }).error).toBeInstanceOf(SuspicionAppealPendingError);
    expect(((out as { error: SuspicionAppealPendingError }).error).reason).toBe('appeal_open');
  });

  it('RF15 (b) — the FINAL approval holds the key first (the 90 days passed): the initiation BLOCKS, then answers the time-limit 409', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = randomUUID();
    const s = await onOwnTx(pid, (c) => refusedClaim(c, pid, mid, { decidedAt: new Date(Date.now() - 100 * DAY) }));
    const r = await approvableHeld(pid, mid);

    const a = await openTx(pid);
    expect((await vote(a.client, pid, r)).claimState).toBe('state_trustee_approved');
    const b = await openTx(pid);
    const initiation = track(initiateAppeal(b.client, { claimCaseId: s, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' }));
    await pause(BLOCKED_MS);
    expect(initiation.state.settled, 'the initiation must WAIT on the per-death key').toBe(false);
    await a.commit();
    const out = await initiation.settled;
    await b.rollback();
    expect(out.ok).toBe(false);
    expect((out as { error: unknown }).error).toBeInstanceOf(AppealTimeLimitPassedError);
  });

  it('RF6 — two `-239` claims of one death reversed AT ONCE serialise (⛔ no 40P01): one is reversed, the other is CLOSED by it', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = randomUUID();
    const s1 = await onOwnTx(pid, async (c) => {
      const id = await refusedClaim(c, pid, mid);
      await openAppeal(c, pid, id);
      return id;
    });
    const s2 = await onOwnTx(pid, async (c) => {
      const id = await refusedClaim(c, pid, mid);
      await openAppeal(c, pid, id);
      return id;
    });
    const reverse = (cid: ClaimId) =>
      onOwnTx(pid, (c) =>
        reviewAppealStage1(c, {
          claimCaseId: cid, pariwarId: pid, decision: 'reversed', dispositionCategory: 'reconsideration_on_merits',
          reviewerActorId: REVIEWER, reviewerDisplay: 'Another District Admin', rationaleCiphertext: CIPHER, actor: 'operator',
        }),
      );
    const results = await Promise.allSettled([reverse(s1), reverse(s2)]);
    const won = results.filter((x) => x.status === 'fulfilled');
    const lost = results.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    // ⛔ not a deadlock — the loser met a CLOSED claim at its stage check.
    expect((lost[0]!.reason as { code?: string }).code).not.toBe('40P01');
    expect(lost[0]!.reason).toBeInstanceOf(AppealStageMismatchError);
    const states = await onOwnTx(pid, async (c) =>
      (await c.query<{ id: string; s: string }>('SELECT claim_case_id AS id, current_state AS s FROM claims WHERE claim_case_id = ANY($1)', [[s1, s2]])).rows,
    );
    expect(states.map((x) => x.s).sort()).toEqual(['closed', 'reversed']);
  });

  it('RF13 — a revision OFF `-239` racing a new claim\'s MINT waits on the intake lock, then sees the minted claim ⇒ `SuspicionReasonLockedError`', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = toMemberId(randomUUID());
    const s = await onOwnTx(pid, (c) => refusedClaim(c, pid, mid, { ground: true }));

    const a = await openTx(pid);
    const minted = await tryConverge(a.client, {
      pariwarId: pid, deceasedMemberId: mid, intakeChannel: 'helpline', actor: 'operator', claimantActorId: null, trigger: 'test_intake', actorId: null, auditId: randomUUID(),
    });
    expect(minted.minted).toBe(true);
    const b = await openTx(pid);
    const revision = track(
      reviseDecision(b.client, {
        claimCaseId: s, pariwarId: pid, outcome: 'denied', reasonCode: 'other', rationaleCiphertext: 'enc:v1:revised', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      }),
    );
    await pause(BLOCKED_MS);
    expect(revision.state.settled, 'the revision must WAIT on the intake lock').toBe(false);
    await a.commit();
    const out = await revision.settled;
    await b.rollback();
    expect(out.ok).toBe(false);
    expect((out as { error: unknown }).error).toBeInstanceOf(SuspicionReasonLockedError);
    expect(((out as { error: SuspicionReasonLockedError }).error).heldClaimCaseId).toBe(minted.claimCaseId);
  });
});
