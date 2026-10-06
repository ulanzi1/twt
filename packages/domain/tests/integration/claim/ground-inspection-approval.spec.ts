// Story 6.26a — the GROUND-INSPECTION APPROVAL GATE, at the domain, on real rows (Testing; AC1, AC3, AC6).
//
// `-263` FQ9 A (Trustee-ratified): every claim's ground inspection must be complete before the claim is approved; a
// refusal never waits for it; a claim whose visit cannot happen WAITS. `-285`: the final vote and R9 wait too.
// Each test in its own rolled-back transaction. A claim is made to wait by SUPERSEDING its completed assignments
// (`voidInspections`) — a superseded assignment counts for ⛔ nothing (GI2) — or by seeding ⛔ none (`inspection: 'skip'`).
// ⚠ ⛔ No TRUNCATE; ⛔ no `DROP SCHEMA` ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  GroundInspectionRequiredError,
  LateWarningReasonRequiredError,
  addGroundInspectionPhoto,
  adjudicateClaim,
  approveNoCorrectionNeeded,
  assertClaimApprovable,
  castR9Vote,
  completeGroundInspection,
  decideEscalatedClosure,
  escalateClaim,
  escalateStaffCase,
  finalizeR9Outcome,
  groundInspectionApprovalState,
  isCorrectionClaimHeld,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  projectClaimState,
  readGroundInspectionApprovalFacts,
  recordNoCorrectionNeeded,
  resolveEscalation,
  returnToDistrictAdmin,
  routeToR9,
  scheduleGroundInspection,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  SEEDED_NOMINEES_DECLARED_AT,
  driveClaimTo,
  enterAppScope,
  seedClauseVersion,
  seedDeathCertificate,
  seedGroundInspection,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';
import { DA as CC_DA, SA as CC_SA, TRUSTEE as CC_PA, asSuperuser, decline, reachedClaim, request, returnedClaim, type Returned } from './_correction-closure-fixture.js';

const DA = 'd6d6d6d6-0000-4000-8000-000000000001';
const PA = 'a6a6a6a6-0000-4000-8000-000000000002';
const V1 = 'b6b6b6b6-0000-4000-8000-000000000011';
const V2 = 'b6b6b6b6-0000-4000-8000-000000000012';
const V3 = 'b6b6b6b6-0000-4000-8000-000000000013';
const PANEL = [V1, V2, V3];
const R9_CLAUSE = 'niy.special-death.r9';
const INSPECTOR = '9a9a9a9a-0000-4000-8000-000000000099';
const DAY = 86_400_000;

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];
interface Ctx {
  client: Client;
  tx: Tx;
  pid: PariwarId;
  cid: ClaimId;
  mid: string;
}

const waits = (reason: 'no_completed_inspection' | 'certificate_check_required') => (e: unknown) =>
  e instanceof GroundInspectionRequiredError && e.reason === reason;

/** Supersede every completed assignment of the claim — it then counts for ⛔ nothing, and the claim WAITS. */
async function voidInspections(client: Client, cid: ClaimId): Promise<void> {
  await client.query(`UPDATE claim_ground_inspections SET status = 'superseded' WHERE claim_case_id = $1 AND status = 'completed'`, [cid]);
}

async function rowCounts(ctx: Pick<Ctx, 'client' | 'cid'>) {
  const q = async (sql: string) => (await ctx.client.query<{ n: number }>(sql, [ctx.cid])).rows[0]!.n;
  return {
    events: await q('SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1'),
    verifier: await q('SELECT count(*)::int AS n FROM claim_verifier_decisions WHERE claim_case_id = $1'),
    trustee: await q('SELECT count(*)::int AS n FROM claim_state_trustee_decisions WHERE claim_case_id = $1'),
    warningRecords: await q('SELECT count(*)::int AS n FROM claim_warning_approvals WHERE claim_case_id = $1'),
  };
}

/** AC1 — the approval refuses with the typed wait and writes NOTHING (⛔ decision, ⛔ event, ⛔ warning record). */
async function refusesAndWritesNothing(ctx: Pick<Ctx, 'client' | 'cid'>, fn: () => Promise<unknown>, match: (e: unknown) => boolean) {
  const before = await rowCounts(ctx);
  await ctx.client.query('SAVEPOINT gi_gate');
  await expect(fn()).rejects.toSatisfy(match);
  await ctx.client.query('ROLLBACK TO SAVEPOINT gi_gate');
  expect(await rowCounts(ctx)).toEqual(before);
}

/** Run `fn` and roll it back — for the "a refusal / escalation / route / return SUCCEEDS" legs on the same claim. */
async function succeedsThenUndo(client: Client, fn: () => Promise<unknown>): Promise<void> {
  await client.query('SAVEPOINT gi_ok');
  await fn();
  await client.query('ROLLBACK TO SAVEPOINT gi_ok');
}

async function emit(ctx: Ctx, from: string, to: string, eventType: string, extra: Record<string, unknown> = {}) {
  await projectClaimState(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    deceasedMemberId: toMemberId(ctx.mid),
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: eventType as never,
    payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
    actorId: null,
  });
}

/** A fully approvable claim at `state` (accounts, determination, name check, contact, accepted certificate), with the
 *  inspection `completed` (the fixture default) or ⛔ none (`skip`). `beforeScope` runs as the superuser. */
async function claimAt(
  state: 'verifier_review' | 'verifier_approved',
  opts: { inspection?: 'completed' | 'skip'; beforeScope?: (tx: Tx, pid: PariwarId) => Promise<void> } = {},
): Promise<Ctx> {
  const { client, tx } = getTx();
  const pid = toPariwarId(opts.beforeScope ? randomUUID() : PARIWAR_A);
  if (opts.beforeScope) {
    await client.query('RESET ROLE');
    await opts.beforeScope(tx, pid);
  }
  await enterAppScope(client, pid);
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await driveClaimTo(client, pid, cid, mid, state);
  await seedNomineeNameCheck(client, pid, cid, { inspection: opts.inspection ?? 'completed' });
  return { client, tx, pid, cid, mid };
}

const approve = (ctx: Ctx) =>
  adjudicateClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: 'r5_d_natural_death',
    rationaleCiphertext: 'enc:v1:why', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
  });
const deny = (ctx: Ctx) =>
  adjudicateClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'denied', reasonCode: 'concealment_flag_uphold',
    rationaleCiphertext: 'enc:v1:deny', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
  });
const escalate = (ctx: Ctx) =>
  escalateClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'escalated', reasonCode: 'r9_routed_to_voting',
    rationaleCiphertext: 'enc:v1:esc', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
  });
const vote = (ctx: Ctx, outcome: 'approved' | 'denied' = 'approved') =>
  voteOnFrozenClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome,
    reasonCode: outcome === 'denied' ? 'other' : null,
    rationaleCiphertext: outcome === 'denied' ? 'enc:v1:deny' : null,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
const route = (ctx: Ctx) =>
  routeToR9(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, reasonCode: 'r9_special_case', rationaleCiphertext: null,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
const giveBack = (ctx: Ctx) =>
  returnToDistrictAdmin(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, reasonCode: 'other', rationaleCiphertext: 'enc:v1:return',
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });

// ── R9 helpers ────────────────────────────────────────────────────────────────────────────────────────────────
async function seedR9(tx: Tx, pid: PariwarId): Promise<void> {
  await seedClauseVersion(tx, pid, {
    clauseId: R9_CLAUSE,
    payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
  });
  for (const uid of PANEL) await seedRoleGrant(tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
}
async function routeOpenAndVote(ctx: Ctx): Promise<void> {
  await route(ctx);
  await openR9VotingSession(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, clauseId: R9_CLAUSE, panelActorIds: PANEL,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
  for (const voter of [V1, V2]) {
    await castR9Vote(ctx.client, {
      claimCaseId: ctx.cid, pariwarId: ctx.pid, vote: 'approve',
      rationaleCiphertext: prepareR9VoteCiphertext(`enc:v1:vote-${voter.slice(-2)}`), warningReasonCode: null,
      actorId: voter, actorDisplay: `Panelist ${voter.slice(-2)}`, actor: 'trustee',
    });
  }
}
const finalize = (ctx: Ctx) =>
  finalizeR9Outcome(ctx.client, { claimCaseId: ctx.cid, pariwarId: ctx.pid, actorId: V1, actorDisplay: 'Finalizer', actor: 'trustee' });

/** Schedule → photograph the original → complete a FULL inspection of the claim through the REAL writers, in whatever
 *  window state it is in. Returns the completed event's payload. */
async function inspectNow(ctx: Ctx): Promise<Record<string, unknown>> {
  const facts = await readGroundInspectionApprovalFacts(ctx.tx, ctx.pid, ctx.cid);
  const { groundInspection } = await scheduleGroundInspection(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, district: 'Patna', inspectionStage: 'initial',
    inspectionSiteType: 'family_residence', inspectorActorId: INSPECTOR, scheduledAt: new Date(),
    scheduledByActor: INSPECTOR, idempotencyKey: randomUUID(),
  });
  const gid = groundInspection.groundInspectionId;
  await addGroundInspectionPhoto(ctx.client, {
    pariwarId: ctx.pid, groundInspectionId: gid, actingActorId: INSPECTOR,
    storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 100, photoKind: 'original_certificate',
  });
  await completeGroundInspection(ctx.client, {
    pariwarId: ctx.pid, groundInspectionId: gid, actingActorId: INSPECTOR, originalCertificateVerdict: 'matches',
    comparedCertificateUploadId: facts.currentUploadId,
    deathDate: { plaintext: '2026-06-01', ciphertext: 'enc:v1:d', index: 'idx', source: 'family_statement' },
  });
  const completed = await ctx.tx
    .select()
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.streamId, ctx.cid), eq(schema.eventsLog.eventType, 'claim.ground_inspection_completed')));
  // THIS assignment's event (a claim may already hold an earlier one — e.g. the refile's certificate check).
  return completed.map((e) => e.payload as Record<string, unknown>).find((p) => p['ground_inspection_id'] === gid)!;
}

async function stateOf(ctx: Ctx): Promise<string> {
  const [row] = await ctx.tx.select({ s: schema.claims.currentState }).from(schema.claims).where(eq(schema.claims.claimCaseId, ctx.cid));
  return row!.s;
}

describe.skipIf(!hasDatabase)('Story 6.26a — the ground-inspection approval gate (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── AC1 — every gate call WAITS; a refusal, an escalation, a route and a return ⛔ never do ────────────────────
  describe('AC1 — every one of the six gate calls (and the `-251` waived approve) waits; nothing else does', () => {
    it('P1 — the District Admin\'s approval waits (⛔ nothing written); a DENY and an ESCALATION on the same claim succeed; complete ⇒ approves', async () => {
      const ctx = await claimAt('verifier_review');
      await voidInspections(ctx.client, ctx.cid);
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('no_completed_inspection'));
      await succeedsThenUndo(ctx.client, async () => expect((await deny(ctx)).claimState).toBe('denied'));
      await succeedsThenUndo(ctx.client, () => escalate(ctx));
      await seedGroundInspection(ctx.client, ctx.pid, ctx.cid);
      expect((await approve(ctx)).claimState).toBe('verifier_approved');
    });

    it('P3 — the Pariwar Admin\'s final vote waits; a deny vote, a route to R9 and a return for correction succeed; complete ⇒ approves', async () => {
      const ctx = await claimAt('verifier_approved');
      await voidInspections(ctx.client, ctx.cid);
      await refusesAndWritesNothing(ctx, () => vote(ctx), waits('no_completed_inspection'));
      await succeedsThenUndo(ctx.client, async () => expect((await vote(ctx, 'denied')).claimState).toBe('denied'));
      await succeedsThenUndo(ctx.client, () => route(ctx));
      await succeedsThenUndo(ctx.client, () => giveBack(ctx));
      await seedGroundInspection(ctx.client, ctx.pid, ctx.cid);
      expect((await vote(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('P4 — R9 finalize waits; complete ⇒ the panel\'s approval finalizes', async () => {
      const ctx = await claimAt('verifier_approved', { beforeScope: seedR9 });
      await routeOpenAndVote(ctx);
      await voidInspections(ctx.client, ctx.cid);
      await refusesAndWritesNothing(ctx, () => finalize(ctx), waits('no_completed_inspection'));
      await seedGroundInspection(ctx.client, ctx.pid, ctx.cid);
      await finalize(ctx);
      expect(await stateOf(ctx)).toBe('state_trustee_approved');
    });

    describe('6.19c\'s three approvals — the Super Admin\'s FULL and `-251` WAIVED approves, and "no correction needed"', () => {
      const saApprove = (client: Client, c: Returned, reason: string) =>
        decideEscalatedClosure(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_SA, actorDisplay: 'Super Admin One', now: c.day(100),
          reason, noteCiphertext: 'enc:v1:sa-note', decisionRationaleCiphertext: 'enc:v1:sa-rationale', decision: 'approve',
        });

      it('the Super Admin\'s FULL-gate approve (staff case) waits; complete ⇒ approves', async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await returnedClaim(client, { mustAct: 'staff' });
        await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(90) });
        await voidInspections(client, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, () => saApprove(client, c, 'details_verified'), waits('no_completed_inspection'));
        await seedGroundInspection(client, PARIWAR_A, c.cid);
        expect((await saApprove(client, c, 'details_verified')).closure).toMatchObject({ state: 'approved' });
        void tx;
      });

      it('⭐ the `-251` WAIVED approve waives the name check ONLY — the inspection conjunct reaches it (`-263` Consequence 4)', async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await reachedClaim(client, tx);
        await request(client, c);
        await decline(client, c);
        await voidInspections(client, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, () => saApprove(client, c, 'name_difference_accepted'), waits('no_completed_inspection'));
        await seedGroundInspection(client, PARIWAR_A, c.cid);
        expect(await saApprove(client, c, 'name_difference_accepted')).toMatchObject({ nameCheckWaived: true });
      });

      it('"no correction needed" (D27) waits — and the inspection answers BEFORE the late-warning wait (AC1\'s order)', async () => {
        const { client } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await returnedClaim(client, { mustAct: 'family' });
        await recordNoCorrectionNeeded(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_DA, actorDisplay: 'DA', now: c.day(3),
          markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
        });
        await asSuperuser(client, () =>
          client.query(`UPDATE claim_correction_no_correction_records SET recorded_at = recorded_at - interval '1 minute' WHERE claim_case_id = $1`, [c.cid]),
        );
        await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
        const d27 = () =>
          approveNoCorrectionNeeded(client, {
            pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_PA, actorDisplay: 'PA', now: c.day(4),
            decisionRationaleCiphertext: 'enc:v1:note', warningReasonCode: 'warnings_reviewed',
          });
        // A LATE warning key nobody has answered (6.23b's construction: a recent nominee change + a live District
        // Admin approval) AND ⛔ no completed inspection ⇒ the INSPECTION answers first.
        await client.query('UPDATE claims SET created_at = $2 WHERE claim_case_id = $1', [c.cid, new Date(SEEDED_NOMINEES_DECLARED_AT.getTime() + 30 * DAY)]);
        await client.query(
          `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
           VALUES ($1, $2, 'approved', 'r5_d_natural_death', 'enc:v1:why', $3, 'District Admin One')`,
          [c.cid, PARIWAR_A, CC_DA],
        );
        await voidInspections(client, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, d27, waits('no_completed_inspection'));
        // Inspection complete ⇒ the NEXT conjunct (the late-warning wait) answers — the order holds.
        await seedGroundInspection(client, PARIWAR_A, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, d27, (e) => e instanceof LateWarningReasonRequiredError);
      });
    });

    it('the refusal ORDER: certificate → name check → inspection (assertClaimApprovable)', async () => {
      // ⛔ certificate, ⛔ inspection ⇒ the certificate answers.
      const noCert = await claimAt('verifier_approved', { inspection: 'skip' });
      await noCert.client.query('UPDATE claim_documents SET storage_object_key = $2 WHERE claim_case_id = $1', [noCert.cid, `gone/${randomUUID()}`]);
      await expect(assertClaimApprovable(noCert.tx, noCert.pid, noCert.cid, toMemberId(noCert.mid), { approvingActorIds: [PA] })).rejects.toMatchObject({
        name: 'DeathCertificateAcceptanceRequiredError',
      });
      // A failing name check, ⛔ inspection ⇒ the name check answers.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = randomUUID();
      await driveClaimTo(client, PARIWAR_A, cid, mid, 'verifier_approved');
      await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'], inspection: 'skip' });
      await expect(assertClaimApprovable(tx, PARIWAR_A, cid, toMemberId(mid), { approvingActorIds: [PA] })).rejects.toMatchObject({
        name: 'NomineeNameCheckRequiredError',
      });
      // Everything else in place, ⛔ inspection ⇒ the inspection answers.
      const noVisit = await claimAt('verifier_approved', { inspection: 'skip' });
      await expect(assertClaimApprovable(noVisit.tx, noVisit.pid, noVisit.cid, toMemberId(noVisit.mid), { approvingActorIds: [PA] })).rejects.toSatisfy(
        waits('no_completed_inspection'),
      );
    });
  });

  // ── AC3 — "waits" always has a way out (invariant 3; GI3 + `-283` A1) ──────────────────────────────────────────
  describe('AC3 — every path that reaches an approval with ⛔ no inspection can still get one, and then approves', () => {
    it('(a) DENIED with ⛔ no inspection → appeal → REVERSED: the final vote waits; an inspection is written IN `reversed`; the vote approves', async () => {
      const ctx = await claimAt('verifier_review', { inspection: 'skip' });
      await deny(ctx);
      await emit(ctx, 'denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
      await emit(ctx, 'appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
      await refusesAndWritesNothing(ctx, () => vote(ctx), waits('no_completed_inspection'));
      expect(await inspectNow(ctx)).toMatchObject({ from_state: 'reversed', to_state: 'reversed' });
      expect((await vote(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('(b) an ESCALATION resolved as approve with ⛔ no inspection → `verifier_approved`: the vote waits; inspected there; approves', async () => {
      const ctx = await claimAt('verifier_review', { inspection: 'skip' });
      await escalate(ctx);
      // `resolveEscalation`'s approve is ⛔ gated (6.18's design) — it reaches `verifier_approved` with ⛔ no inspection.
      await resolveEscalation(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: null,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      expect(await stateOf(ctx)).toBe('verifier_approved');
      await refusesAndWritesNothing(ctx, () => vote(ctx), waits('no_completed_inspection'));
      expect(await inspectNow(ctx)).toMatchObject({ from_state: 'verifier_approved', to_state: 'verifier_approved' });
      expect((await vote(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('(c) `-283` A1 — a REFILE R9-routed from `state_trustee_approved` whose inheritance VANISHES: finalize waits; inspected in `state_trustee_approved` while routed; R9 approves', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await client.query('RESET ROLE');
      await seedR9(tx, pid);
      await enterAppScope(client, pid);
      const mid = randomUUID();
      // The SOURCE: an earlier claim for the same death, refused on `-239`, with a completed FULL inspection.
      const source = toClaimId(randomUUID());
      await driveClaimTo(client, pid, source, mid, 'verification_in_progress');
      await seedDeathCertificate(client, { pariwarId: pid, claimCaseId: source });
      await seedGroundInspection(client, pid, source);
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'denied', 'post_death_nominee_change', 'enc:v1:r', $3, 'Anita (District Admin)')`,
        [source, pid, DA],
      );
      // The REFILE: ⛔ visit of its own; VISITED by inheritance; its OWN certificate check makes it complete (FQ13).
      const refile: Ctx = { client, tx, pid, cid: toClaimId(randomUUID()), mid };
      await driveClaimTo(client, pid, refile.cid, mid, 'verifier_approved');
      await seedNomineeNameCheck(client, pid, refile.cid, { inspection: 'skip' });
      expect(groundInspectionApprovalState(await readGroundInspectionApprovalFacts(tx, pid, refile.cid))).toEqual({
        complete: false,
        waitReason: 'certificate_check_required',
      });
      await seedGroundInspection(client, pid, refile.cid, { stage: 'certificate_check' });
      expect((await vote(refile)).claimState).toBe('state_trustee_approved');
      await routeOpenAndVote(refile);
      // The source's `-239` denial is revised to another reason — the inheritance (and so VISITED) vanishes.
      await asSuperuser(client, async () => {
        await client.query('UPDATE claim_verifier_decisions SET superseded_at = now() WHERE claim_case_id = $1', [source]);
        await client.query(
          `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
           VALUES ($1, $2, 'denied', 'other', 'enc:v1:r2', $3, 'Anita (District Admin)')`,
          [source, pid, DA],
        );
      });
      await enterAppScope(client, pid);
      await refusesAndWritesNothing(refile, () => finalize(refile), waits('no_completed_inspection'));
      expect(await inspectNow(refile)).toMatchObject({ from_state: 'state_trustee_approved', to_state: 'state_trustee_approved' });
      await finalize(refile);
      expect(await stateOf(refile)).toBe('state_trustee_approved');
      const [r9] = await tx.select().from(schema.eventsLog).where(and(eq(schema.eventsLog.streamId, refile.cid), eq(schema.eventsLog.eventType, 'claim.r9_outcome')));
      expect(r9!.payload).toMatchObject({ outcome: 'approved' });
    });
  });

  // ── AC6 — the refile (FQ13) ─────────────────────────────────────────────────────────────────────────────────────
  it('AC6 — a claim that INHERITS a full visit waits for its OWN certificate check against its current upload; after it, the gate passes', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = randomUUID();
    const source = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, source, mid, 'verification_in_progress');
    await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: source });
    await seedGroundInspection(client, PARIWAR_A, source);
    await client.query(
      `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
       VALUES ($1, $2, 'denied', 'post_death_nominee_change', 'enc:v1:r', $3, 'Anita (District Admin)')`,
      [source, PARIWAR_A, DA],
    );
    const refile: Ctx = { client, tx, pid: PARIWAR_A as PariwarId, cid: toClaimId(randomUUID()), mid };
    await driveClaimTo(client, PARIWAR_A, refile.cid, mid, 'verifier_review');
    await seedNomineeNameCheck(client, PARIWAR_A, refile.cid, { inspection: 'skip' });
    await refusesAndWritesNothing(refile, () => approve(refile), waits('certificate_check_required'));
    await seedGroundInspection(client, PARIWAR_A, refile.cid, { stage: 'certificate_check' });
    expect((await approve(refile)).claimState).toBe('verifier_approved');
  });
});
