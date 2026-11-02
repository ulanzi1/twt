// Story 6.22 — the finding's LOCK ORDER as true two-connection races (own-committing). AC5, AC6; DL3 step 1, DL12 (d).
//
//   AC6 (a) — the death's INTAKE key held elsewhere ⇒ the finding WAITS (`pg_stat_activity`, ⛔ a sleep), holding ⛔ the
//             claim row while it does (the intake key FIRST). The ids' case is irrelevant here BY CONSTRUCTION
//             (`intakeAdvisoryLockKey` and the brand both lower-case — R2-13 (a)); AC6 (b) is the discriminating TR11 test.
//   AC6 (b) — the claim's `appeal:` key is built from the DB ROW's id (TR11): held under the lower-case id, a finding sent
//             with the UPPER-case id still waits — and, while it waits, it holds ⛔ the claim row (the keys come BEFORE the
//             row — AC5's 40P01 order, proven with a NOWAIT probe rather than a timing race).
//   AC6 (c) — a SECOND INTAKE racing an uncommitted finding waits on the intake key and then MINTS a new standing claim —
//             ⛔ never absorbed into the claim the finding closed (`tryConverge` (3b) / (3c) takes ⛔ claim-row lock, so
//             without the finding's intake key it would converge into it).
//   AC5     — the finding and an appeal writer (`initiateAppeal`) on ONE claim, both orders: one waits, ⛔ 40P01; finding
//             first ⇒ the appeal is REFUSED by its own state guard; appeal first ⇒ the finding closes the claim AND its
//             journey.
//
// ⚠ OWN-COMMITTING: a FRESH random Pariwar per test; cleanup table by table in replica mode — fixture cleanup ONLY.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { appealAdvisoryLockKey } from '../../../src/claim/appeal-lock.js';
import {
  AppealNotDeniedError,
  FraudInvestigationRefusedError,
  flagClaimForFraudInvestigation,
  initiateAppeal,
  intakeAdvisoryLockKey,
  recordFraudFinding,
  tryConverge,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimId as toClaimId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  type ClaimId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { seedOpenMemberStream } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const OPERATOR = 'a8a8a8a8-0000-4000-8000-000000000001';
const DA = 'd8d8d8d8-0000-4000-8000-000000000002';

describe.skipIf(!hasDatabase)('Story 6.22 — the finding\'s lock order (two connections, own-committing)', () => {
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
        console.error('[fraud-investigation-concurrency.spec] cleanup:', (e as Error).message);
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

  async function onOwnTx<T>(pid: PariwarId, fn: (client: pg.PoolClient) => Promise<T>, opts: { superuser?: boolean } = {}): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (!opts.superuser) {
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, pid);
      }
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

  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pid);
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    return {
      client,
      backendPid: rows[0]!.pid,
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

  /** Wait until `backendPid` is BLOCKED on a lock — proof the race is real, ⛔ never a sleep. */
  async function waitUntilBlocked(backendPid: number): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`,
        [backendPid],
      );
      if (rows[0]!.n === 1) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`backend ${backendPid} never blocked on a lock`);
  }

  function settle<T>(p: Promise<T>) {
    return p.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
  }

  const flag = (c: pg.PoolClient, pid: PariwarId, cid: ClaimId) =>
    flagClaimForFraudInvestigation(c, {
      claimCaseId: cid, pariwarId: pid, stepId: toStepId(randomUUID()), noteCiphertext: 'enc:v1:flag',
      actorId: OPERATOR, actorDisplay: 'Helpline Operator', actor: 'operator',
    });
  const find = (c: pg.PoolClient, pid: PariwarId, cid: string) =>
    recordFraudFinding(c, {
      claimCaseId: cid as ClaimId, pariwarId: pid, outcome: 'innocent', aliveConfirmation: 'in_person',
      stepId: toStepId(randomUUID()), findingId: toFindingId(randomUUID()), noteCiphertext: 'enc:v1:find',
      actorId: DA, actorDisplay: 'District Admin', actor: 'operator',
    });
  const stateOf = (pid: PariwarId, cid: string) =>
    onOwnTx(pid, async (c) => (await c.query<{ s: string }>('SELECT current_state::text AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]?.s);

  /** A flagged claim of a member with a real lifecycle (the intake door passes once the report is released — TR3). */
  async function flaggedClaim(pid: PariwarId, state: 'verifier_review' | 'denied' = 'verifier_review'): Promise<{ cid: ClaimId; mid: string }> {
    const mid = randomUUID();
    await onOwnTx(pid, async (c) => seedOpenMemberStream(bindScopedDb(c), pid, mid), { superuser: true });
    const cid =
      state === 'denied'
        ? await onOwnTx(pid, (c) => refusedClaim(c, pid, mid, { reason: 'other' }))
        : await onOwnTx(pid, (c) => claimAt(c, pid, mid, 'verifier_review', { bare: true }));
    await onOwnTx(pid, (c) => flag(c, pid, cid));
    return { cid, mid };
  }

  // R2-13 (a) — the upper-case ids below cannot fail this test for a CASE reason (the key and the brand both lower-case): it
  // proves the ORDER (intake key before the row). The case-sensitive leg is AC6 (b) (TR11 — the key built from the ROW's id).
  it('AC6 (a) — the INTAKE key held elsewhere ⇒ the finding WAITS holding ⛔ the claim row (the intake key FIRST), then commits — the same intake key whatever the ids\' case (by construction)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid, mid } = await flaggedClaim(pid);
    const holder = await openTx(pid);
    await holder.client.query('SELECT pg_advisory_xact_lock($1)', [intakeAdvisoryLockKey(pid, toMemberId(mid.toUpperCase())).toString()]);
    const b = await openTx(pid);
    const finding = settle(find(b.client, pid, cid.toUpperCase()));
    await waitUntilBlocked(b.backendPid);
    // ⭐ The intake key comes FIRST: while the finding waits on it, it holds ⛔ the claim row. (DL12's inner writer takes
    // the key too — but by then the OUTER writer already holds the row, so only the outer writer's own key-first order
    // keeps the row free here; without it this probe fails with 55P03.)
    const probe = await openTx(pid);
    const rowFree = await probe.client.query('SELECT 1 FROM claims WHERE claim_case_id = $1 FOR UPDATE NOWAIT', [cid]).then(
      () => true,
      (e: { code?: string }) => e.code,
    );
    await probe.rollback();
    expect(rowFree).toBe(true);
    await holder.commit();
    const out = await finding;
    expect(out.ok).toBe(true);
    await b.commit();
    expect(await stateOf(pid, cid)).toBe('closed');
  });

  it('AC6 (b) — the `appeal:` key comes from the ROW\'s id (TR11): held under the lower-case id, an UPPER-case request still waits', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid);
    const holder = await openTx(pid);
    await holder.client.query('SELECT pg_advisory_xact_lock($1)', [appealAdvisoryLockKey(pid, toClaimId(cid)).toString()]);
    const b = await openTx(pid);
    const finding = settle(find(b.client, pid, cid.toUpperCase()));
    await waitUntilBlocked(b.backendPid);
    // ⭐ AC5's ORDER, proven deterministically: while the finding waits on the `appeal:` key it holds ⛔ the claim row yet —
    // a third connection can still take it NOWAIT. (Row-before-key — the 40P01 order — fails this with 55P03.)
    const probe = await openTx(pid);
    const rowFree = await probe.client.query('SELECT 1 FROM claims WHERE claim_case_id = $1 FOR UPDATE NOWAIT', [cid]).then(
      () => true,
      (e: { code?: string }) => e.code,
    );
    await probe.rollback();
    expect(rowFree).toBe(true);
    await holder.commit();
    expect((await finding).ok).toBe(true);
    await b.commit();
  });

  it('AC6 (c) — a SECOND INTAKE racing an uncommitted finding waits, then MINTS a new standing claim — ⛔ absorbed into the closed one', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid, mid } = await flaggedClaim(pid);
    const a = await openTx(pid);
    await find(a.client, pid, cid); // holds the intake key, uncommitted
    const b = await openTx(pid);
    const intake = settle(
      tryConverge(b.client, {
        pariwarId: pid, deceasedMemberId: toMemberId(mid), intakeChannel: 'member_app', actor: 'member',
        claimantActorId: null, trigger: 'test_intake', actorId: null, auditId: randomUUID(),
      }),
    );
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const out = await intake;
    if (!out.ok) {
      await b.rollback();
      throw out.error;
    }
    await b.commit();
    expect(out.value.minted).toBe(true);
    expect(out.value.claimCaseId.toLowerCase()).not.toBe(cid.toLowerCase());
    expect(await stateOf(pid, cid)).toBe('closed');
  });

  it('AC5 — finding FIRST, then the appeal writer: the appeal waits, ⛔ 40P01, and is REFUSED by its own state guard', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid, 'denied');
    const a = await openTx(pid);
    await find(a.client, pid, cid);
    const b = await openTx(pid);
    const appeal = settle(initiateAppeal(b.client, { claimCaseId: cid, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' }));
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const out = await appeal;
    await b.rollback();
    // ⭐ REFUSED BY ITS OWN STATE GUARD — the appeal writer's `AppealNotDeniedError`, naming the state the finding left. A bare
    // "it failed" (or "it was not a deadlock") would also pass on a TypeError, a missing claim or a lock timeout (RA7).
    expect(out.ok).toBe(false);
    const refusal = (out as { error: unknown }).error;
    expect(refusal).toBeInstanceOf(AppealNotDeniedError);
    expect((refusal as AppealNotDeniedError).currentState).toBe('closed');
    expect((refusal as { code?: string }).code).not.toBe('40P01');
    expect(await stateOf(pid, cid)).toBe('closed');
  });

  it('AC5 — the appeal writer FIRST, then the finding: the finding waits, ⛔ 40P01, then closes the claim AND its new journey', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid, 'denied');
    const a = await openTx(pid);
    await initiateAppeal(a.client, { claimCaseId: cid, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
    const b = await openTx(pid);
    const finding = settle(find(b.client, pid, cid));
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const out = await finding;
    if (!out.ok) {
      await b.rollback();
      throw out.error;
    }
    await b.commit();
    expect(out.value.close).toEqual({ closed: true });
    expect(await stateOf(pid, cid)).toBe('closed');
    const journeys = await onOwnTx(pid, async (c) => (await c.query<{ status: string }>('SELECT status FROM claim_appeals WHERE claim_case_id = $1', [cid])).rows);
    expect(journeys.map((j) => j.status)).toEqual(['closed']);
  });

  // ── EXACTLY ONCE under concurrency (checklist family 2; code review 2026-11-02, RA6) ────────────────────────────────
  // Every race below holds the first writer's transaction OPEN, starts the second on another connection, waits until that
  // backend is blocked on a lock (⛔ a sleep), then commits the first. "Exactly one write, N-1 idempotent no-ops or typed
  // refusals, one event" is read back from the tables and the event stream — not inferred from the return values.

  /** The rows and events an investigation of ONE claim leaves behind. */
  const ledger = (pid: PariwarId, cid: string) =>
    onOwnTx(pid, async (c) => {
      const n = async (text: string) => Number((await c.query<{ n: string }>(text, [cid])).rows[0]!.n);
      const events = (type: string) => n(`SELECT count(*) AS n FROM events_log WHERE stream_id = $1 AND event_type = '${type}'`);
      return {
        flagSteps: await n("SELECT count(*) AS n FROM claim_fraud_investigation_steps WHERE claim_case_id = $1 AND step = 'flagged'"),
        foundSteps: await n("SELECT count(*) AS n FROM claim_fraud_investigation_steps WHERE claim_case_id = $1 AND step IN ('found_innocent', 'found_guilty')"),
        memberFindings: await n("SELECT count(*) AS n FROM claim_nominee_findings WHERE claim_case_id = $1 AND kind IN ('member_found_innocent', 'member_found_guilty')"),
        flaggedEvents: await events('claim.fraud_flagged'),
        releasedEvents: await events('claim.nominee_lock_released'),
        guiltyEvents: await events('claim.member_found_guilty'),
        closedEvents: await events('claim.closed'),
      };
    });

  const findWith = (c: pg.PoolClient, pid: PariwarId, cid: string, over: { outcome: 'innocent' | 'guilty'; stepId: ReturnType<typeof toStepId>; findingId: ReturnType<typeof toFindingId> }) =>
    recordFraudFinding(c, {
      claimCaseId: cid as ClaimId, pariwarId: pid, aliveConfirmation: 'in_person', noteCiphertext: 'enc:v1:find',
      actorId: DA, actorDisplay: 'District Admin', actor: 'operator', ...over,
    });
  const flagWith = (c: pg.PoolClient, pid: PariwarId, cid: ClaimId, stepId: ReturnType<typeof toStepId>) =>
    flagClaimForFraudInvestigation(c, {
      claimCaseId: cid, pariwarId: pid, stepId, noteCiphertext: 'enc:v1:flag', actorId: OPERATOR, actorDisplay: 'Helpline Operator', actor: 'operator',
    });

  /** A claim with a real member lifecycle, NOT yet flagged. */
  async function unflaggedClaim(pid: PariwarId): Promise<ClaimId> {
    const mid = randomUUID();
    await onOwnTx(pid, async (c) => seedOpenMemberStream(bindScopedDb(c), pid, mid), { superuser: true });
    return onOwnTx(pid, (c) => claimAt(c, pid, mid, 'verifier_review', { bare: true }));
  }

  /** Run `first` in an open transaction, start `second` on another connection, wait until it BLOCKS, commit `first`. */
  async function race<A, B>(pid: PariwarId, first: (c: pg.PoolClient) => Promise<A>, second: (c: pg.PoolClient) => Promise<B>) {
    const a = await openTx(pid);
    const firstValue = await first(a.client);
    const b = await openTx(pid);
    const pending = settle(second(b.client));
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const out = await pending;
    if (out.ok) await b.commit();
    else await b.rollback();
    return { firstValue, out };
  }

  const refusalReason = (out: { ok: false; error: unknown }) => {
    expect(out.error).toBeInstanceOf(FraudInvestigationRefusedError);
    return (out.error as FraudInvestigationRefusedError).reason;
  };

  it('RA6 — the SAME finding submitted twice at once: one writes, the other REPLAYS (same version) — one finding, one found step, one release, one close', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid);
    const same = { outcome: 'innocent' as const, stepId: toStepId(randomUUID()), findingId: toFindingId(randomUUID()) };
    const { firstValue, out } = await race(pid, (c) => findWith(c, pid, cid, same), (c) => findWith(c, pid, cid, same));
    if (!out.ok) throw out.error;
    expect(firstValue.replayed).toBe(false);
    expect(out.value.replayed).toBe(true);
    expect(out.value.eventVersion).toBe(firstValue.eventVersion);
    expect(await ledger(pid, cid)).toEqual({
      flagSteps: 1, foundSteps: 1, memberFindings: 1, flaggedEvents: 1, releasedEvents: 1, guiltyEvents: 0, closedEvents: 1,
    });
  });

  it('RA6 — an INNOCENT and a GUILTY finding on one claim at once: the first wins, the second is `already_found` — no guilty row, no guilty event', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid);
    const { out } = await race(
      pid,
      (c) => findWith(c, pid, cid, { outcome: 'innocent', stepId: toStepId(randomUUID()), findingId: toFindingId(randomUUID()) }),
      (c) => findWith(c, pid, cid, { outcome: 'guilty', stepId: toStepId(randomUUID()), findingId: toFindingId(randomUUID()) }),
    );
    expect(out.ok).toBe(false);
    expect(refusalReason(out as { ok: false; error: unknown })).toBe('already_found');
    expect(await ledger(pid, cid)).toEqual({
      flagSteps: 1, foundSteps: 1, memberFindings: 1, flaggedEvents: 1, releasedEvents: 1, guiltyEvents: 0, closedEvents: 1,
    });
  });

  it('RA6 — two flags with DIFFERENT step ids at once: the first writes, the second is `already_flagged` — one flag step, one flag event', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const cid = await unflaggedClaim(pid);
    const { out } = await race(pid, (c) => flagWith(c, pid, cid, toStepId(randomUUID())), (c) => flagWith(c, pid, cid, toStepId(randomUUID())));
    expect(out.ok).toBe(false);
    expect(refusalReason(out as { ok: false; error: unknown })).toBe('already_flagged');
    expect(await ledger(pid, cid)).toMatchObject({ flagSteps: 1, flaggedEvents: 1, foundSteps: 0, memberFindings: 0 });
  });

  it('RA6 — the SAME flag submitted twice at once: one writes, the other REPLAYS — one flag step, one flag event', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const cid = await unflaggedClaim(pid);
    const stepId = toStepId(randomUUID());
    const { firstValue, out } = await race(pid, (c) => flagWith(c, pid, cid, stepId), (c) => flagWith(c, pid, cid, stepId));
    if (!out.ok) throw out.error;
    expect(firstValue.replayed).toBe(false);
    expect(out.value.replayed).toBe(true);
    expect(out.value.eventVersion).toBe(firstValue.eventVersion);
    expect(await ledger(pid, cid)).toMatchObject({ flagSteps: 1, flaggedEvents: 1 });
  });
});
