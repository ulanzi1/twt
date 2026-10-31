// ERASURE vs CLAIM INTAKE — real multi-connection races (Story 6.38, Task 3.6; N3, DL3, AC5).
//
// Both legs CALL the shipped functions — `acquireErasureLocks` + `resolveRtbfLegality` (the erasure handlers' order) and
// `tryConverge` (the one mint path) — ⛔ a hand copy of either ([[feedback_stub_must_call_not_transcribe]]).
//
//   (i)  TWO-PARTY, over a member ALREADY erasable (`withdrawn`, terminated): in EITHER order ⛔ claim is minted — erasure
//        first ⇒ anonymized, then the intake is refused `erased`; intake first ⇒ refused `left` / `removed`, then erased.
//        (The DOOR closes this case, ⛔ the lock.)
//   (ii) ⭐ THREE-PARTY — the case the lock exists for: T1 = an intake for an `active` member holding the intake lock with
//        its claim minted and UNCOMMITTED; T2 = a write that makes the member erasable and COMMITS without the intake key;
//        T3 = an erasure, which must BLOCK on the intake key (server truth — `pg_blocking_pids`) and, once T1 commits, be
//        refused `death_reported`. Without the intake key in `acquireErasureLocks` T3 sees ⛔ committed claim and erases.
//        T2 runs as a moderation TERMINATION — the path still reachable (`moderateMember` takes ⛔ advisory lock) — and as a
//        WITHDRAWAL projector step. ⚠ BOTH are stand-ins, ⛔ the writers: the termination is this file's `terminate` (a
//        superuser append of the overlay pair `moderateMember` writes), the withdrawal a bare projector step — the withdrawal
//        ROUTE now takes the intake key itself (DL18, `lockAndReadDeathReport`), so through the route it would WAIT behind T1.
//        Each leg first proves T2 made the member ERASABLE (a lock-free legality read returns `legal` while T1's claim is
//        uncommitted — the erasure the lock prevents), then that T3 blocks. Three runs per kind (AC5 (ii)). (Rounds 4–5.)
//
// ⚠ Own-committing (⛔ setupLiveDb): real concurrent COMMITs on separate pool clients; cleanup by this suite's ids.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ClaimIntakeRefusedError, tryConverge } from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { MemberId } from '../../../src/ids/index.js';
import { projectMemberState } from '../../../src/member/project.js';
import { getCurrentMemberState } from '../../../src/member/read.js';
import { acquireErasureLocks, resolveRtbfLegality, type RtbfLegality } from '../../../src/member/rtbf-legality.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId(randomUUID()); // a fresh tenant — committed rows never pollute PARIWAR_A
const TIMEOUT = 20_000;

type Payload = Record<string, unknown>;
const ev = (from: string | null, to: string, extra: Payload = {}): Payload => ({ from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra });

describe.skipIf(!hasDatabase)('Story 6.38 — erasure vs claim intake, own-committing races', () => {
  let pool: pg.Pool;
  const createdMembers: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8 });
  });

  afterAll(async () => {
    if (createdMembers.length > 0) {
      const client = await pool.connect();
      try {
        // Append-only `events_log` and projector-only `members` / `claims` — `replica` sheds the triggers for this
        // test-only purge (FK cascades are triggers too, so children go first, explicitly).
        await client.query('BEGIN');
        await client.query("SET LOCAL session_replication_role = 'replica'");
        const claimIds = `SELECT claim_case_id FROM claims WHERE deceased_member_id = ANY($1::uuid[])`;
        await client.query(`DELETE FROM events_log WHERE stream_id IN (${claimIds})`, [createdMembers]);
        await client.query('DELETE FROM intake_attempts WHERE deceased_member_id = ANY($1::uuid[])', [createdMembers]);
        await client.query('DELETE FROM claims WHERE deceased_member_id = ANY($1::uuid[])', [createdMembers]);
        await client.query('DELETE FROM events_log WHERE stream_id = ANY($1::uuid[])', [createdMembers]);
        await client.query('DELETE FROM members WHERE member_id = ANY($1::uuid[])', [createdMembers]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error('[erasure-intake-race.spec] cleanup:', (e as Error).message);
      } finally {
        client.release();
      }
    }
    await pool.end();
  });

  async function beginScoped(): Promise<pg.PoolClient> {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR);
    return client;
  }
  async function end(client: pg.PoolClient, commit: boolean): Promise<void> {
    try {
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    } finally {
      client.release();
    }
  }
  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await beginScoped();
    try {
      const out = await fn(client);
      await end(client, true);
      return out;
    } catch (err) {
      await end(client, false).catch(() => undefined);
      throw err;
    }
  }
  const pidOf = async (c: pg.PoolClient): Promise<number> =>
    Number((await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid);
  async function blockedBy(waiter: number, holder: number, withinMs = 5000): Promise<boolean> {
    const deadline = Date.now() + withinMs;
    while (Date.now() < deadline) {
      const r = await pool.query<{ blockers: number[] }>('SELECT pg_blocking_pids($1) AS blockers', [waiter]);
      if ((r.rows[0]?.blockers ?? []).map(Number).includes(holder)) return true;
      await new Promise((res) => setTimeout(res, 25));
    }
    return false;
  }

  const step = (client: pg.PoolClient, memberId: MemberId, eventType: string, payload: Payload) =>
    projectMemberState(client, { memberId, pariwarId: PARIWAR, eventType: eventType as never, payload: payload as never, actorId: null });

  /** An `active` member (through the projector), optionally on to `withdrawn` / terminated. Committed. */
  async function seedMember(opts: { withdrawn?: boolean; terminated?: boolean } = {}): Promise<MemberId> {
    const memberId = toMemberId(randomUUID());
    createdMembers.push(memberId);
    await onOwnTx(async (c) => {
      await step(c, memberId, 'member.signup_initiated', ev(null, 'pending-kyc'));
      await step(c, memberId, 'member.kyc_completed', ev('pending-kyc', 'pending-fee'));
      await step(c, memberId, 'member.vyawastha_shulk_paid', ev('pending-fee', 'lock-in', { utr: 'SEED', amount_inr: 1 }));
      await step(c, memberId, 'member.lock_in_expired', ev('lock-in', 'active', { kyc_verified: true }));
      if (opts.withdrawn) await step(c, memberId, 'member.withdrawal_completed', ev('active', 'withdrawn'));
    });
    if (opts.terminated) await terminate(memberId);
    return memberId;
  }

  /** The moderation overlay's `suspended` → `terminated` pair, appended to the member's stream (superuser). */
  async function terminate(memberId: MemberId): Promise<void> {
    for (const eventType of ['member.moderation.suspended', 'member.moderation.terminated']) {
      await pool.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id)
         SELECT $1, $2, '{"reason_code":"conduct","actor":"trustee"}'::jsonb, COALESCE(max(event_version), 0) + 1, $3
           FROM events_log WHERE stream_id = $1`,
        [memberId, eventType, PARIWAR],
      );
    }
  }

  /** The erasure handlers' sequence: BOTH locks (intake → rtbf) → the replayed state → the ONE legality → the act. */
  async function erase(client: pg.PoolClient, memberId: MemberId): Promise<RtbfLegality> {
    await acquireErasureLocks(client, PARIWAR, memberId);
    const db = bindScopedDb(client);
    const state = await getCurrentMemberState(db, memberId);
    const legality = await resolveRtbfLegality(db, PARIWAR, memberId, state);
    if (legality.kind === 'legal') {
      await step(client, memberId, 'member.rtbf_anonymized', { from_state: legality.fromState, to_state: 'anonymized', trigger: 'rtbf_request', actor: 'member' });
    }
    return legality;
  }

  const intake = (memberId: MemberId, auditId: string) => ({
    pariwarId: PARIWAR,
    deceasedMemberId: memberId,
    intakeChannel: 'helpline' as const,
    actor: 'operator' as const,
    claimantActorId: null,
    trigger: 'race_intake',
    actorId: null,
    auditId,
  });

  async function committedClaims(memberId: MemberId): Promise<number> {
    const r = await pool.query('SELECT 1 FROM claims WHERE deceased_member_id = $1', [memberId]);
    return r.rowCount ?? 0;
  }
  async function committedState(memberId: MemberId): Promise<string> {
    return onOwnTx((c) => getCurrentMemberState(bindScopedDb(c), memberId));
  }

  // ── (i) TWO-PARTY ─────────────────────────────────────────────────────────────────────────────────────────────

  it.each([
    ['withdrawn', { withdrawn: true }],
    ['terminated', { terminated: true }],
  ] as const)('(i) %s — ERASURE first, holding its locks: the intake WAITS, then is refused `erased`; ⛔ claim', { timeout: TIMEOUT }, async (_l, opts) => {
    const mid = await seedMember(opts);
    let eraser: pg.PoolClient | undefined;
    let eraserOpen = false;
    let filed: Promise<unknown> | undefined;
    try {
      eraser = await beginScoped();
      eraserOpen = true;
      expect((await erase(eraser, mid)).kind).toBe('legal');
      const intakeClient = await beginScoped();
      const intakePid = await pidOf(intakeClient);
      const eraserPid = await pidOf(eraser);
      filed = tryConverge(intakeClient, intake(mid, 'i1')).finally(() => end(intakeClient, false));
      // Round 5: a handler NOW — with the lock removed the door refuses in milliseconds while `blockedBy` still polls, and an
      // un-handled rejection would add a second, misleading error. The awaits below still see the rejection.
      filed.catch(() => undefined);
      expect(await blockedBy(intakePid, eraserPid), 'the intake did not wait for the erasure\'s intake-key lock').toBe(true);
      await end(eraser, true);
      eraserOpen = false;
      const err = await filed.catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ClaimIntakeRefusedError);
      expect((err as ClaimIntakeRefusedError).reason).toBe('erased');
    } finally {
      if (eraserOpen && eraser) await end(eraser, false).catch(() => undefined);
      // Round 4: settle the intake on the FAILURE path too, so it ⛔ rejects unhandled or races `afterAll`'s `pool.end()`.
      if (filed) await filed.catch(() => undefined);
    }
    expect(await committedState(mid)).toBe('anonymized');
    expect(await committedClaims(mid)).toBe(0);
  });

  it.each([
    ['withdrawn', { withdrawn: true }, 'left'],
    ['terminated', { terminated: true }, 'removed'],
  ] as const)('(i) %s — INTAKE first: refused `%s` at the door; the erasure then proceeds; ⛔ claim', { timeout: TIMEOUT }, async (_l, opts, reason) => {
    const mid = await seedMember(opts);
    const err = await onOwnTx((c) => tryConverge(c, intake(mid, 'i2'))).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ClaimIntakeRefusedError);
    expect((err as ClaimIntakeRefusedError).reason).toBe(reason);
    expect((await onOwnTx((c) => erase(c, mid))).kind).toBe('legal');
    expect(await committedState(mid)).toBe('anonymized');
    expect(await committedClaims(mid)).toBe(0);
  });

  // ── (ii) THREE-PARTY — the case the intake key in `acquireErasureLocks` exists for ──────────────────────────────

  // AC5 (ii): repeated runs with ⛔ deadlock — three per kind (round 5 restored them; round 4 had cut them to one).
  it.each(
    ([
      ['a moderation TERMINATION', 'termination', 'active'],
      ['a withdrawal (projector step)', 'withdrawal', 'withdrawn'],
    ] as const).flatMap(([label, kind, state]) => [1, 2, 3].map((run) => [label, run, kind, state] as const)),
  )('⭐ (ii) T1 intake (uncommitted claim) · T2 %s COMMITS · T3 erasure BLOCKS, then is refused `death_reported` (run %i)', { timeout: TIMEOUT }, async (_l, _run, t2Kind, finalState) => {
    const mid = await seedMember();
    let t1: pg.PoolClient | undefined;
    let t1Open = false;
    let t3Result: Promise<RtbfLegality> | undefined;
    try {
      // T1 — passes the door on `active` and mints; holds the intake key with the claim UNCOMMITTED.
      t1 = await beginScoped();
      t1Open = true;
      const filed = await tryConverge(t1, intake(mid, 'ii1'));
      expect(filed.minted).toBe(true);
      // T2 — commits while T1 is open, taking ⛔ advisory lock. Stand-ins (header): the overlay pair `moderateMember` writes,
      // appended by `terminate`, or the withdrawal as a bare projector step (the route itself would wait on T1 — DL18).
      if (t2Kind === 'termination') await terminate(mid);
      else await onOwnTx((c) => step(c, mid, 'member.withdrawal_completed', ev('active', 'withdrawn')));
      // Round 5 — the COUNTERFACTUAL: T2 really made the member erasable. A legality read that takes ⛔ lock sees ⛔
      // committed claim and says `legal` — exactly the erasure T3 would commit without the intake key.
      const unlocked = await onOwnTx(async (c) => {
        const db = bindScopedDb(c);
        return resolveRtbfLegality(db, PARIWAR, mid, await getCurrentMemberState(db, mid));
      });
      expect(unlocked.kind, 'T2 did not make the member erasable — the leg would not test the lock').toBe('legal');
      // T3 — the erasure: must BLOCK on the intake key held by T1.
      const t3 = await beginScoped();
      const t3Pid = await pidOf(t3);
      const t1Pid = await pidOf(t1);
      t3Result = erase(t3, mid).then(
        async (l) => {
          await end(t3, l.kind === 'legal');
          return l;
        },
        async (e: unknown) => {
          await end(t3, false).catch(() => undefined);
          throw e;
        },
      );
      expect(await blockedBy(t3Pid, t1Pid), 'the erasure did not wait for the intake\'s lock (N3)').toBe(true);
      await end(t1, true);
      t1Open = false;
      const legality = await t3Result;
      expect(legality.kind).toBe('death_reported');
    } finally {
      if (t1Open && t1) await end(t1, false).catch(() => undefined);
      if (t3Result) await t3Result.catch(() => undefined);
    }
    // Both the claim and T2 stand; ⛔ erasure (a termination is an overlay — the lifecycle state stays `active`).
    expect(await committedClaims(mid)).toBe(1);
    expect(await committedState(mid)).toBe(finalState);
  });
});
