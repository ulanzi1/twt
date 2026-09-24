// The nominee declaration history — TWO-CONNECTION concurrency (own-committing). Story 6.20 (Task 9;
// D1, D3, D4; AC11).
//
// ⭐ A real race needs real concurrent COMMITs on SEPARATE pool clients (the `*-concurrency.spec.ts`
// family, `nominee-bank-concurrency.spec.ts` the exemplar): each writer runs BEGIN → SET LOCAL ROLE
// twt_app → scope → work → COMMIT, raced or deliberately interleaved, asserting on ITS OWN ids and
// cleaning up by those ids.
//   · D1 — `(member_id, rank, version_no)` is UNIQUE: two committed writers of the same version, one wins.
//   · ⭐ D3 — THE LOCK RACE. The nominee edit and a claim intake take the SAME advisory lock
//     (`intakeAdvisoryLockKey`). Interleaved both ways: an intake holding the lock makes the edit WAIT and
//     then REFUSE (it sees the claim); an edit holding the lock makes the intake WAIT, and the edit lands
//     legitimately "before the claim".
//   · D4 — two District Admins determining the same claim at once: exactly ONE determination is live.
//   · D7 — a correction STEP raced (approve vs decline at step 2): exactly one wins, the other a typed 409;
//     and two claims' corrections for ONE member applied at once: one version, the other a TYPED refusal
//     (⛔ never a raw 23505 — code review 2026-09-24).
// ⭐ "WAITS" is PROVED from the server (`pg_blocking_pids`), ⛔ not inferred from a timer: a slow box can leave
// an unblocked promise pending for 400 ms. And every held transaction is released in a `finally`, so a
// failed expectation can never leak an open transaction holding the advisory lock.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  NomineeCorrectionRefusedError,
  NomineeDeclarationLockedError,
  NomineeDeterminationRefusedError,
  decideNomineeCorrectionAsDistrictAdmin,
  decideNomineeCorrectionAsPariwarAdmin,
  lockNomineeDeclarationForEdit,
  projectClaimState,
  raiseNomineeCorrection,
  recordNomineeDetermination,
  tryConverge,
} from '../../../src/claim/index.js';
import { MemberStreamConcurrencyError } from '../../../src/member/errors.js';
import { projectMemberState } from '../../../src/member/project.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import { seedNomineeDeclaration } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId(randomUUID()); // ⭐ a fresh tenant — committed rows never pollute PARIWAR_A
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('Story 6.20 — nominee history two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const members: string[] = [];
  const claims: string[] = [];

  async function begin(): Promise<pg.PoolClient> {
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
    const client = await begin();
    try {
      const out = await fn(client);
      await end(client, true);
      return out;
    } catch (err) {
      await end(client, false).catch(() => undefined);
      throw err;
    }
  }

  async function seedMember(opts: { viaProjector?: boolean } = {}): Promise<MemberId> {
    const mid = toMemberId(randomUUID());
    members.push(mid);
    await onOwnTx(async (c) => {
      if (opts.viaProjector) {
        // A correction's apply appends to the member STREAM, so it needs a real projected member.
        await projectMemberState(c, {
          memberId: mid,
          pariwarId: PARIWAR,
          eventType: 'member.signup_initiated',
          payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
          actorId: mid,
        });
      }
      await seedNomineeDeclaration(bindScopedDb(c), PARIWAR, mid, {
        declaredAt: new Date('2026-01-10T06:00:00.000Z'),
        ensureMember: !opts.viaProjector,
      });
    });
    return mid;
  }

  const pidOf = async (c: pg.PoolClient): Promise<number> =>
    Number((await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid);

  /** Poll until backend `waiter` is BLOCKED BY backend `holder` (server truth), or give up. */
  async function blockedBy(waiter: number, holder: number, withinMs = 5000): Promise<boolean> {
    const deadline = Date.now() + withinMs;
    while (Date.now() < deadline) {
      const r = await pool.query<{ blockers: number[] }>('SELECT pg_blocking_pids($1) AS blockers', [waiter]);
      if ((r.rows[0]?.blockers ?? []).map(Number).includes(holder)) return true;
      await new Promise((res) => setTimeout(res, 25));
    }
    return false;
  }

  /** Drive a claim for `mid` to `verification_in_progress` (the projector — ⛔ no convergence). */
  async function driveClaim(mid: MemberId): Promise<ClaimId> {
    const cid: ClaimId = toClaimId(randomUUID());
    claims.push(cid);
    await onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR,
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
    });
    return cid;
  }

  /** A committed determination (everything stands) + a raised correction the District Admin approved. */
  async function correctionAwaitingPariwarAdmin(mid: MemberId, cid: ClaimId): Promise<string> {
    const versions = await onOwnTx((c) => listNomineeDeclarationVersions(bindScopedDb(c), PARIWAR, mid));
    await onOwnTx((c) =>
      recordNomineeDetermination(c, {
        claimCaseId: cid,
        pariwarId: PARIWAR,
        certificateDate: '2099-01-01',
        certificateDateCiphertext: 'enc:v1:d',
        noteCiphertext: 'enc:v1:n',
        marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
        watermark: { rank1: Math.max(...versions.filter((v) => v.rank === 1).map((v) => v.versionNo)), rank2: null },
        expectedLiveDeterminationId: null,
        actorId: randomUUID(),
        actorDisplay: 'Anita',
        actor: 'operator',
      }),
    );
    const { correctionId } = await onOwnTx((c) =>
      raiseNomineeCorrection(c, {
        claimCaseId: cid,
        pariwarId: PARIWAR,
        rank: 1,
        proposedNameCiphertext: 'enc:v1:p',
        proposedRelationship: 'spouse',
        proposedMobileCiphertext: 'enc:v1:m',
        proposedAddressCiphertext: null,
        raiseNoteCiphertext: 'enc:v1:r',
        raisedVia: 'helpline',
        raisedByActorId: randomUUID(),
      }),
    );
    await onOwnTx((c) => decideNomineeCorrectionAsDistrictAdmin(c, stepInput(cid, correctionId, randomUUID(), 'approve')));
    return correctionId;
  }

  const stepInput = (cid: ClaimId, correctionId: string, actorId: string, outcome: 'approve' | 'decline') => ({
    correctionId: correctionId as never,
    claimCaseId: cid,
    pariwarId: PARIWAR,
    outcome,
    noteCiphertext: 'enc:v1:note',
    actorId,
    actorDisplay: 'An Admin',
  });

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 16, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[nominee-history-concurrency.spec] idle client error:', err.message));
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // Replica mode disables triggers — including the append-only one — for fixture cleanup ONLY.
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('DELETE FROM nominee_corrections WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM nominee_determination_items WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM nominee_determinations WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM member_nominee_versions WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM member_nominees WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM intake_attempts WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM claims WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM events_log WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM members WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      console.error('[nominee-history-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      c.release();
    }
    await pool.end();
  });

  it('⭐ D1 — two committed writers of the SAME (member, rank, version_no): exactly one wins, the other 23505', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const write = () =>
      onOwnTx((c) =>
        c.query(
          `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source,
             name_ciphertext, relationship, mobile_ciphertext, split_pct, recorded_at, effective_at)
           VALUES ($1, $2, 1, 2, gen_random_uuid(), 'declared', 'member', 'enc:v1:n', 'spouse', 'enc:v1:m', 100, now(), now())`,
          [mid, PARIWAR],
        ),
      );
    const results = await Promise.allSettled([write(), write()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect((rejected.reason as { code?: string }).code).toBe('23505');
  });

  it('⭐⭐ D3 — an INTAKE holding the lock makes the edit WAIT, then REFUSE (it sees the committed claim)', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const intake = await begin();
    const res = await tryConverge(intake, {
      pariwarId: PARIWAR,
      deceasedMemberId: mid,
      intakeChannel: 'member_app',
      actor: 'member',
      claimantActorId: null,
      trigger: 'race_intake',
      actorId: null,
      auditId: 'race-1',
    });
    claims.push(res.claimCaseId);

    let intakeOpen = true;
    try {
      const editClient = await begin();
      // ⚠ Both pids BEFORE the blocking call: a client's queries queue, so a pid lookup issued after it
      // would wait behind the very lock it is meant to observe.
      const editPid = await pidOf(editClient);
      const intakePid = await pidOf(intake);
      const edit = lockNomineeDeclarationForEdit(editClient, PARIWAR, mid).finally(() => end(editClient, false));
      // ⭐ Server truth: the edit's backend is BLOCKED BY the intake's (⛔ not "still pending after a timer").
      expect(await blockedBy(editPid, intakePid), 'the edit did not wait for the intake\'s lock').toBe(true);
      await end(intake, true);
      intakeOpen = false;
      await expect(edit).rejects.toBeInstanceOf(NomineeDeclarationLockedError);
    } finally {
      if (intakeOpen) await end(intake, false).catch(() => undefined);
    }
  });

  it('⭐⭐ D3 — an EDIT holding the lock makes the intake WAIT; the edit lands legitimately BEFORE the claim', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const edit = await begin();
    await lockNomineeDeclarationForEdit(edit, PARIWAR, mid);
    await seedNomineeDeclaration(bindScopedDb(edit), PARIWAR, mid, { declaredAt: new Date(), ensureMember: false });

    let editOpen = true;
    let res: Awaited<ReturnType<typeof tryConverge>>;
    try {
      const intakeClient = await begin();
      const intakePid = await pidOf(intakeClient);
      const editPid = await pidOf(edit);
      const intake = tryConverge(intakeClient, {
        pariwarId: PARIWAR,
        deceasedMemberId: mid,
        intakeChannel: 'member_app',
        actor: 'member',
        claimantActorId: null,
        trigger: 'race_intake',
        actorId: null,
        auditId: 'race-2',
      }).then(
        async (out) => {
          await end(intakeClient, true);
          return out;
        },
        async (err: unknown) => {
          await end(intakeClient, false).catch(() => undefined);
          throw err;
        },
      );
      expect(await blockedBy(intakePid, editPid), 'the intake did not wait for the edit\'s lock').toBe(true);
      await end(edit, true);
      editOpen = false;
      res = await intake;
    } finally {
      if (editOpen) await end(edit, false).catch(() => undefined);
    }
    claims.push(res.claimCaseId);

    // Both committed; the edit's version exists, and a FURTHER edit is now refused.
    const versions = await onOwnTx((c) => listNomineeDeclarationVersions(bindScopedDb(c), PARIWAR, mid));
    expect(versions.filter((v) => v.rank === 1)).toHaveLength(2);
    await expect(onOwnTx((c) => lockNomineeDeclarationForEdit(c, PARIWAR, mid))).rejects.toBeInstanceOf(
      NomineeDeclarationLockedError,
    );
  });

  it('⭐ D4 — two District Admins determining the same claim at once: exactly ONE is live, the other is a typed 409', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const cid: ClaimId = toClaimId(randomUUID());
    claims.push(cid);
    await onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR,
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
    });
    const versions = await onOwnTx((c) => listNomineeDeclarationVersions(bindScopedDb(c), PARIWAR, mid));
    const determine = () =>
      onOwnTx((c) =>
        recordNomineeDetermination(c, {
          claimCaseId: cid,
          pariwarId: PARIWAR,
          certificateDate: '2099-01-01',
          certificateDateCiphertext: 'enc:v1:d',
          noteCiphertext: 'enc:v1:n',
          marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
          watermark: { rank1: 1, rank2: null },
          expectedLiveDeterminationId: null,
          actorId: randomUUID(),
          actorDisplay: 'Anita',
          actor: 'operator',
        }),
      );
    const results = await Promise.allSettled([determine(), determine()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const loser = (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason;
    expect(loser).toBeInstanceOf(NomineeDeterminationRefusedError);
    expect((loser as NomineeDeterminationRefusedError).reason).toBe('stale_supersession');
    const live = await pool.query(
      'SELECT count(*)::int AS n FROM nominee_determinations WHERE claim_case_id = $1 AND superseded_at IS NULL',
      [cid],
    );
    expect(live.rows[0].n).toBe(1);
  });

  it('⭐ D7 — step 2 RACED (approve vs decline): exactly ONE wins, the other a typed `step_conflict`', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember({ viaProjector: true });
    const cid = await driveClaim(mid);
    const correctionId = await correctionAwaitingPariwarAdmin(mid, cid);
    const results = await Promise.allSettled([
      onOwnTx((c) => decideNomineeCorrectionAsPariwarAdmin(c, stepInput(cid, correctionId, randomUUID(), 'approve'))),
      onOwnTx((c) => decideNomineeCorrectionAsPariwarAdmin(c, stepInput(cid, correctionId, randomUUID(), 'decline'))),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const loser = (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason;
    expect(loser).toBeInstanceOf(NomineeCorrectionRefusedError);
    expect((loser as NomineeCorrectionRefusedError).reason).toBe('step_conflict');
    const row = await pool.query<{ step: string }>('SELECT step FROM nominee_corrections WHERE correction_id = $1', [correctionId]);
    expect(['applied', 'declined']).toContain(row.rows[0]!.step);
  });

  it('⭐ two CLAIMS\' corrections for ONE member applied at once: one version lands, the other is a TYPED refusal (⛔ never a raw 23505)', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember({ viaProjector: true });
    const cidA = await driveClaim(mid);
    const cidB = await driveClaim(mid);
    const corrA = await correctionAwaitingPariwarAdmin(mid, cidA);
    const corrB = await correctionAwaitingPariwarAdmin(mid, cidB);
    // Different claim rows ⇒ different claim-row locks: only the version UNIQUE (or the member stream)
    // stands between the two writers of rank 1's next version.
    const results = await Promise.allSettled([
      onOwnTx((c) => decideNomineeCorrectionAsPariwarAdmin(c, stepInput(cidA, corrA, randomUUID(), 'approve'))),
      onOwnTx((c) => decideNomineeCorrectionAsPariwarAdmin(c, stepInput(cidB, corrB, randomUUID(), 'approve'))),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const loser = (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason;
    const typed =
      loser instanceof MemberStreamConcurrencyError ||
      (loser instanceof NomineeCorrectionRefusedError && loser.reason === 'version_conflict');
    expect(typed, `the loser was ${String((loser as Error)?.name)} — ${String((loser as Error)?.message)}`).toBe(true);
    const v = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM member_nominee_versions WHERE member_id = $1 AND source = 'correction'",
      [mid],
    );
    expect(v.rows[0]!.n).toBe(1);
  });
});
