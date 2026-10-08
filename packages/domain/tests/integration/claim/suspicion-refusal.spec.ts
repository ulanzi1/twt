// Story 6.24a — the refile after a suspicion refusal, live DB (:5433). `2026-10-07-292` RF1–RF8, RF13, RF14.
//
//   AC1 — kept apart (D4 B, RF2): a new filing for the death of a STANDING `-239` refusal MINTS — on the same channel as
//         the refused claim or another, with it `denied` or at any appeal stage — and ⛔ no attempt parks on it; any other
//         refusal, or a REVERSED `-239` one, converges as today; a revision OFF / ONTO `-239` moves candidacy.
//   AC2 — the wait (RF5): a FINAL approval waits (`appeal_not_filed` / `appeal_open`), proceeds on `upheld_final` /
//         `time_limit_passed`; the District Admin's (P1) ⛔ never; the order (after the inspection, before the late wait).
//   AC2b — the 90 days (RF14) at initiation, and the reason lock (RF13).
//   AC3 — closed (RF4, RF6) at each stage's reversal, its live processes ended, its effects.
//   AC4 — the cycle commit re-checks (RF7).
//   AC5 — the inheritance reads RF1 (RF8).
// Every appeal stage is driven through the REAL writers (Trap 19 — `_suspicion-refusal-fixtures.ts`).

import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  AppealNotDeniedError,
  AppealTimeLimitPassedError,
  GroundInspectionRequiredError,
  LateWarningReasonRequiredError,
  SuspicionAppealPendingError,
  SuspicionReasonLockedError,
  adjudicateClaim,
  assertClaimApprovable,
  assertRefileAllowed,
  assertSuspicionAppealDecidedForFinalApproval,
  closeClaimsHeldBySuspicionAppeal,
  commitCycleFreeze,
  getClaimByDeceasedMember,
  getConvergenceCandidate,
  getInheritedGroundInspectionSource,
  getPendingIntakeAttempts,
  noCorrectionHold,
  openR9VotingSession,
  projectClaimState,
  readStandingSuspicionRefusals,
  returnToDistrictAdmin,
  reviseDecision,
  suspicionRefusalAppealUntil,
  tryConverge,
  voteOnFrozenClaim,
  writeCorrectionMark,
} from '../../../src/claim/index.js';
import { addCalendarDays, istDateOf, istMidnightAt } from '../../../src/cycle-calendar/holiday-resolver.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, CycleFreezeCommitId, MemberId, PariwarId } from '../../../src/ids/index.js';
import { getMemberAccountOverlay } from '../../../src/member/overlay.js';
import { versionStandsAt } from '../../../src/claim/nominee-effective.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  currentUploadIdOf,
  driveClaimTo,
  enterAppScope,
  seedAcceptedDeathCertificate,
  seedClauseVersion,
  seedGroundInspection,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';
import {
  DA,
  appealAtStage,
  completedVisit,
  eventTypesOf,
  openAppeal,
  panelDecides,
  refusedClaim,
  reverseAtStage1,
  seedAppealPanel,
  stage3,
  stateOf,
  toStage2,
} from './_suspicion-refusal-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const DAY = 86_400_000;
const PA = 'a2a2a2a2-0000-4000-8000-000000000004';
const R9_CLAUSE = 'niy.special-death.r9';
const windowStart = () => new Date(Date.now() - 30 * DAY);

const intake = (mid: MemberId, channel: schema.ClaimIntakeChannel) => ({
  pariwarId: PARIWAR_A,
  deceasedMemberId: mid,
  intakeChannel: channel,
  actor: 'member' as const,
  claimantActorId: null,
  trigger: 'test_intake',
  actorId: null,
  auditId: randomUUID(),
});

/** A refusal dated so that its 90 days have PASSED (D = 100 IST days ago). */
const longAgo = () => new Date(Date.now() - 100 * DAY);

/** Emit raw lifecycle events through the projector (a claim NOT under test reaching a state — e.g. R past its vote). */
async function emit(client: Client, pid: PariwarId, cid: ClaimId, mid: string, from: string, to: string, eventType: string) {
  await projectClaimState(client, {
    claimCaseId: cid,
    pariwarId: pid,
    deceasedMemberId: toMemberId(mid),
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: eventType as never,
    payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system' } as never,
    actorId: null,
  });
}

/** R — another claim of the death, approvable at a FINAL approval (the default fixtures: certificate, accounts, name
 *  check, determination, a completed visit), in `verifier_approved`. */
async function approvableHeldClaim(client: Client, pid: PariwarId, mid: string): Promise<ClaimId> {
  const cid = toClaimId(randomUUID());
  await driveClaimTo(client, pid, cid, mid, 'verifier_approved');
  await seedNomineeNameCheck(client, pid, cid);
  return cid;
}

/** R in `state_trustee_approved` (past its vote) through events — the claim is ⛔ not the subject; the commit is. */
async function votedHeldClaim(client: Client, pid: PariwarId, mid: string): Promise<ClaimId> {
  const cid = await approvableHeldClaim(client, pid, mid);
  await emit(client, pid, cid, mid, 'verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
  await emit(client, pid, cid, mid, 'state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
  return cid;
}

const finalGate = (client: Client, pid: PariwarId, cid: ClaimId, mid: string, step: 'final' | 'district_admin' = 'final') =>
  assertClaimApprovable(getTx().tx, pid, cid, toMemberId(mid), { approvingActorIds: [PA], step });

const pending = (reason: 'appeal_not_filed' | 'appeal_open') => (err: unknown) =>
  err instanceof SuspicionAppealPendingError && err.reason === reason;

async function savepoint<T>(client: Client, fn: () => Promise<T>): Promise<T | unknown> {
  const name = `sp_${randomUUID().replace(/-/g, '')}`;
  await client.query(`SAVEPOINT ${name}`);
  try {
    const out = await fn();
    await client.query(`RELEASE SAVEPOINT ${name}`);
    return out;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    return err;
  }
}

describe.skipIf(!hasDatabase)('Story 6.24a — the refile after a suspicion refusal (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── AC1 — kept apart ──────────────────────────────────────────────────────────────────────────────────────────────
  describe('AC1 — kept apart (`-261` D4 B; RF2)', () => {
    for (const stage of [0, 1, 2, 3] as const) {
      for (const channel of ['member_app', 'helpline'] as const) {
        it(`S refused \`-239\` and ${stage === 0 ? '`denied`' : `at \`appeal_stage_${stage}\``} — a ${channel === 'member_app' ? 'SAME' : 'DIFFERENT'}-channel refile MINTS a new claim, ⛔ never S, ⛔ no attempt against S`, async () => {
          const { client, tx } = getTx();
          const panel = await seedAppealPanel(client, PARIWAR_A);
          const mid = toMemberId(randomUUID());
          const s = await refusedClaim(client, PARIWAR_A, mid);
          if (stage !== 0) await appealAtStage(client, PARIWAR_A, s, stage, panel);
          expect(await stateOf(client, s)).toBe(stage === 0 ? 'denied' : `appeal_stage_${stage}`);

          const refile = await tryConverge(client, intake(mid, channel));
          expect(refile.minted).toBe(true);
          expect(refile.claimCaseId).not.toBe(s);
          expect(refile.convergencePending).toBe(false);
          // S is ⛔ not a candidate (the refile is, now); the strip parks ⛔ nothing on S; the backstop never returns S.
          expect((await getConvergenceCandidate(tx, PARIWAR_A, mid, windowStart()))?.claimCaseId).toBe(refile.claimCaseId);
          const strip = await getPendingIntakeAttempts(tx, PARIWAR_A);
          expect(strip.flatMap((v) => v.candidates.map((c) => c.claimCaseId))).not.toContain(s);
          expect((await getClaimByDeceasedMember(tx, PARIWAR_A, mid))?.claimCaseId).toBe(refile.claimCaseId);
        });
      }
    }

    it('an attempt parked `pending` against S BEFORE its refusal is left with ⛔ no candidate once the refusal stands (the strip\'s mirror — recorded, ⛔ not migrated)', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const s = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, s, mid, 'verifier_review'); // S lives on `member_app`
      const parked = await tryConverge(client, intake(mid, 'helpline'));
      expect(parked).toMatchObject({ claimCaseId: s, convergencePending: true });
      const candidatesOf = async () =>
        (await getPendingIntakeAttempts(tx, PARIWAR_A)).find((v) => v.attempt.intakeAttemptId === parked.intakeAttemptId)?.candidates.map((c) => c.claimCaseId);
      expect(await candidatesOf()).toEqual([s]);
      // S is refused `-239` (the projector + its decision row) and appealed ⇒ it STANDS ⇒ ⛔ not a candidate for the attempt.
      await projectClaimState(client, {
        claimCaseId: s, pariwarId: PARIWAR_A, deceasedMemberId: mid, intakeChannels: ['member_app'], claimantActorId: null,
        eventType: 'claim.verifier_denied', payload: { from_state: 'verifier_review', to_state: 'denied', trigger: 'test', actor: 'operator' }, actorId: DA,
      });
      await tx.insert(schema.claimVerifierDecisions).values({
        claimCaseId: s, pariwarId: PARIWAR_A, outcome: 'denied', reasonCode: 'post_death_nominee_change', rationaleCiphertext: 'enc:v1:r', actorId: DA, actorDisplay: 'Anita (District Admin)',
      });
      await openAppeal(client, PARIWAR_A, s);
      expect(await candidatesOf()).toEqual([]); // the attempt row stays (history) — it lists with ⛔ no candidate
    });

    it('a refusal for ANY OTHER reason under appeal converges as today — same channel returns it (3b), another parks a pending attempt against it', async () => {
      const { client, tx } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const mid = toMemberId(randomUUID());
      const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await appealAtStage(client, PARIWAR_A, s, 1, panel);
      const same = await tryConverge(client, intake(mid, 'member_app'));
      expect(same).toMatchObject({ claimCaseId: s, minted: false, intakeAttemptId: null });
      const other = await tryConverge(client, intake(mid, 'helpline'));
      expect(other).toMatchObject({ claimCaseId: s, minted: false, convergencePending: true });
      const strip = await getPendingIntakeAttempts(tx, PARIWAR_A);
      expect(strip.find((v) => v.attempt.intakeAttemptId === other.intakeAttemptId)?.candidates.map((c) => c.claimCaseId)).toEqual([s]);
    });

    it('a `-239` refusal REVERSED on appeal no longer stands — the death\'s next filing converges onto it as before', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      await reverseAtStage1(client, PARIWAR_A, s);
      expect(await stateOf(client, s)).toBe('reversed');
      expect(await tryConverge(client, intake(mid, 'member_app'))).toMatchObject({ claimCaseId: s, minted: false });
    });

    it('a revision OFF `-239` makes S a candidate again (once appealed); ONTO `-239` makes it ⛔ not one', async () => {
      const { client, tx } = getTx();
      const off = toMemberId(randomUUID());
      const sOff = await refusedClaim(client, PARIWAR_A, off, { ground: true });
      await reviseDecision(client, revise(sOff, 'other'));
      await openAppeal(client, PARIWAR_A, sOff);
      expect((await getConvergenceCandidate(tx, PARIWAR_A, off, windowStart()))?.claimCaseId).toBe(sOff);

      const onto = toMemberId(randomUUID());
      const sOnto = await refusedClaim(client, PARIWAR_A, onto, { reason: 'other', ground: true });
      await reviseDecision(client, revise(sOnto, 'post_death_nominee_change'));
      await openAppeal(client, PARIWAR_A, sOnto);
      expect(await getConvergenceCandidate(tx, PARIWAR_A, onto, windowStart())).toBeUndefined();
      expect((await tryConverge(client, intake(onto, 'member_app'))).minted).toBe(true);
    });
  });

  // ── AC5 — the inheritance (RF8) ───────────────────────────────────────────────────────────────────────────────────
  describe('AC5 — the inheritance reads RF1 (RF8)', () => {
    it('a STANDING refusal and an UPHELD one are sources; a REVERSED one is ⛔ (its refile is closed)', async () => {
      const { client, tx } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      // Standing, under appeal at stage 1.
      const m1 = toMemberId(randomUUID());
      const s1 = await refusedClaim(client, PARIWAR_A, m1);
      await completedVisit(client, PARIWAR_A, s1);
      await openAppeal(client, PARIWAR_A, s1);
      const r1 = await tryConverge(client, intake(m1, 'helpline'));
      expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(r1.claimCaseId))).toBe(s1);
      // Upheld at stage 3.
      const m2 = toMemberId(randomUUID());
      const s2 = await refusedClaim(client, PARIWAR_A, m2);
      await completedVisit(client, PARIWAR_A, s2);
      await appealAtStage(client, PARIWAR_A, s2, 3, panel);
      await stage3(client, PARIWAR_A, s2, 'upheld');
      const r2 = await tryConverge(client, intake(m2, 'helpline'));
      expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(r2.claimCaseId))).toBe(s2);
      // Reversed — ⛔ not a source any more, and the refile is closed.
      const m3 = toMemberId(randomUUID());
      const s3 = await refusedClaim(client, PARIWAR_A, m3);
      await completedVisit(client, PARIWAR_A, s3);
      await openAppeal(client, PARIWAR_A, s3);
      const r3 = await tryConverge(client, intake(m3, 'helpline'));
      expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(r3.claimCaseId))).toBe(s3);
      await reverseAtStage1(client, PARIWAR_A, s3);
      expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(r3.claimCaseId))).toBeNull();
      expect(await stateOf(client, r3.claimCaseId)).toBe('closed');
    });
  });

  // ── AC3 — closed when the appeal is allowed ───────────────────────────────────────────────────────────────────────
  describe('AC3 — closed when the appeal is allowed (RF4, RF6)', () => {
    it('stage 1 — R in `verification_in_progress` is closed in the reversal\'s transaction (`claim.closed`, the payload, the event-count)', async () => {
      const { client, tx } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      const r = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, r, mid, 'verification_in_progress');
      const res = await reverseAtStage1(client, PARIWAR_A, s);
      expect(res.heldClaims).toEqual({ applied: true, closed: [r], notClosed: [] });
      expect(await stateOf(client, r)).toBe('closed');
      const [ev] = await tx
        .select()
        .from(schema.eventsLog)
        .where(and(eq(schema.eventsLog.streamId, r), eq(schema.eventsLog.eventType, 'claim.closed')));
      expect(ev!.payload).toEqual({
        from_state: 'verification_in_progress',
        to_state: 'closed',
        trigger: 'suspicion_appeal_allowed',
        actor: 'system',
        held_by_claim_case_id: s,
        deceased_member_id: mid,
      });
      // ⛔ never a denial, ⛔ never `denied_no_appeal`, ⛔ never a 6.19c closures row.
      const types = await eventTypesOf(client, r);
      expect(types).not.toContain('claim.denied_no_appeal');
      expect(types).not.toContain('claim.verifier_denied');
      expect(await tx.select().from(schema.claimCorrectionClosures).where(eq(schema.claimCorrectionClosures.claimCaseId, r))).toEqual([]);
    });

    it('stage 2 — R `denied` (another reason) is closed; R\'s own appeal can then ⛔ never be initiated (the not-denied 409)', async () => {
      const { client } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await appealAtStage(client, PARIWAR_A, s, 2, panel);
      const r = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      const res = await panelDecides(client, PARIWAR_A, s, panel, 'reverse');
      expect(res.claimState).toBe('reversed');
      expect(res.heldClaims?.closed).toEqual([r]);
      expect(await stateOf(client, r)).toBe('closed');
      await expect(openAppeal(client, PARIWAR_A, r)).rejects.toBeInstanceOf(AppealNotDeniedError);
    });

    it('stage 3 — R at `appeal_stage_1` (its anchor → `closed`) and R\' `reversed` are BOTH closed; a rolled-back reversal leaves them untouched', async () => {
      const { client, tx } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await appealAtStage(client, PARIWAR_A, s, 3, panel);
      const rAppeal = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, rAppeal);
      const rReversed = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, rReversed);
      expect((await reverseAtStage1(client, PARIWAR_A, rReversed)).heldClaims).toEqual({ applied: false, closed: [], notClosed: [] });

      // A reversal that ROLLS BACK closes ⛔ nothing.
      await client.query('SAVEPOINT rolled');
      await stage3(client, PARIWAR_A, s, 'reversed');
      await client.query('ROLLBACK TO SAVEPOINT rolled');
      expect(await stateOf(client, rAppeal)).toBe('appeal_stage_1');
      expect(await stateOf(client, rReversed)).toBe('reversed');

      const res = await stage3(client, PARIWAR_A, s, 'reversed');
      expect(res.heldClaims?.closed.slice().sort()).toEqual([rAppeal, rReversed].sort());
      expect(await stateOf(client, rAppeal)).toBe('closed');
      expect(await stateOf(client, rReversed)).toBe('closed');
      const [anchor] = await tx.select().from(schema.claimAppeals).where(eq(schema.claimAppeals.claimCaseId, rAppeal));
      expect(anchor!.status).toBe('closed');
      const [reversedAnchor] = await tx.select().from(schema.claimAppeals).where(eq(schema.claimAppeals.claimCaseId, rReversed));
      expect(reversedAnchor!.status).toBe('reversed'); // ⛔ not an open journey — left as it was
    });

    it('a reversal of a refusal with ANY OTHER reason closes ⛔ nothing', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, s);
      const r = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, r, mid, 'verifier_review');
      expect((await reverseAtStage1(client, PARIWAR_A, s)).heldClaims).toEqual({ applied: false, closed: [], notClosed: [] });
      expect(await stateOf(client, r)).toBe('verifier_review');
    });

    it('R already `state_trustee_approved` is ⛔ not moved — REPORTED for the caller\'s error log + audit (Trap 9)', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      const r = await votedHeldClaim(client, PARIWAR_A, mid);
      const res = await reverseAtStage1(client, PARIWAR_A, s);
      expect(res.heldClaims).toEqual({ applied: true, closed: [], notClosed: [{ claimCaseId: r, state: 'state_trustee_approved' }] });
      expect(await stateOf(client, r)).toBe('state_trustee_approved');
    });

    it('⭐ two `-239` refusals of one death: S1\'s reversal CLOSES S2, which then ⛔ never stands — S1\'s own final approval is ⛔ not held by it', async () => {
      const { client, tx } = getTx();
      const mid = randomUUID();
      const s1 = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s1);
      const s2 = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s2);
      await reverseAtStage1(client, PARIWAR_A, s1);
      expect(await stateOf(client, s2)).toBe('closed');
      expect(await readStandingSuspicionRefusals(tx, PARIWAR_A, toMemberId(mid))).toEqual([]);
      await seedNomineeNameCheck(client, PARIWAR_A, s1);
      await expect(finalGate(client, PARIWAR_A, s1, mid)).resolves.toBeUndefined();
    });

    it('the overlay — the CLOSED stream resolves; the member stays frozen while the reversed S lives', async () => {
      const { client, tx } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      const r = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, r, mid, 'verifier_review');
      await reverseAtStage1(client, PARIWAR_A, s);
      expect(await stateOf(client, r)).toBe('closed');
      const later = () => new Date(Date.now() + DAY);
      expect((await getMemberAccountOverlay(tx, toMemberId(mid), later())).accountFrozen).toBe(true); // S lives
      // Resolve S too (a fixture terminal annotation) ⇒ unfrozen ONLY if R's `claim.closed` resolved R's stream (red-check:
      // drop `claim.closed` from ACCOUNT_UNFREEZE_EVENT_TYPES and this stays frozen).
      await projectClaimState(client, {
        claimCaseId: s, pariwarId: PARIWAR_A, deceasedMemberId: toMemberId(mid), intakeChannels: ['member_app'], claimantActorId: null,
        eventType: 'claim.denied_no_appeal',
        payload: { from_state: 'reversed', to_state: 'reversed', trigger: 'test', actor: 'system', deceased_member_id: mid },
        actorId: null,
      });
      expect((await getMemberAccountOverlay(tx, toMemberId(mid), later())).accountFrozen).toBe(false);
    });

    it('closing R ENDS its live processes — the correction return (+ its run), an un-finalized R9 session and its routing; ⛔ no text after `closed`', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await client.query('RESET ROLE');
      await seedClauseVersion(tx, pid, { clauseId: R9_CLAUSE, payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' } });
      const r9Panel = [randomUUID(), randomUUID()];
      for (const uid of r9Panel) await seedRoleGrant(tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
      await enterAppScope(client, pid);
      const mid = randomUUID();
      const s = await refusedClaim(client, pid, mid);
      await openAppeal(client, pid, s);
      // R1 — returned for correction, its family run OPEN.
      const r1 = await approvableHeldClaim(client, pid, mid);
      await returnToDistrictAdmin(client, { claimCaseId: r1, pariwarId: pid, reasonCode: 'other', rationaleCiphertext: 'enc:v1:n', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
      const mark = await writeCorrectionMark(client, {
        pariwarId: pid, claimCaseId: r1, mustAct: 'family', actorId: PA, actorDisplay: 'Pariwar Admin', setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true, hold: noCorrectionHold,
      });
      expect(mark.openedRun).not.toBeNull();
      // R2 — routed to R9 with an OPEN (un-finalized) session.
      const r2 = await approvableHeldClaim(client, pid, mid);
      await tx.insert(schema.claimStateTrusteeDecisions).values({
        claimCaseId: r2, pariwarId: pid, phase: 'routing', outcome: 'routed_to_r9', reasonCode: 'r9_special_case', rationaleCiphertext: null, actorId: PA, actorDisplay: 'Pariwar Admin',
      });
      await openR9VotingSession(client, { claimCaseId: r2, pariwarId: pid, clauseId: R9_CLAUSE, panelActorIds: r9Panel, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });

      const res = await reverseAtStage1(client, pid, s);
      expect(res.heldClaims?.closed.slice().sort()).toEqual([r1, r2].sort());
      // R1 — the return superseded; the run ended `decided` (the 6.19b sweep pages ONLY open runs ⇒ ⛔ no text follows).
      const liveReturns = await tx
        .select()
        .from(schema.claimStateTrusteeDecisions)
        .where(and(eq(schema.claimStateTrusteeDecisions.claimCaseId, r1), eq(schema.claimStateTrusteeDecisions.phase, 'correction_return'), isNull(schema.claimStateTrusteeDecisions.supersededAt)));
      expect(liveReturns).toEqual([]);
      const runs = await tx.select().from(schema.claimCorrectionRuns).where(eq(schema.claimCorrectionRuns.claimCaseId, r1));
      expect(runs.map((x) => [x.endReason, x.endedAt !== null])).toEqual([['decided', true]]);
      // R2 — the session and the routing superseded.
      const sessions = await tx.select().from(schema.claimR9VotingSessions).where(eq(schema.claimR9VotingSessions.claimCaseId, r2));
      expect(sessions.every((x) => x.supersededAt !== null)).toBe(true);
      const routing = await tx
        .select()
        .from(schema.claimStateTrusteeDecisions)
        .where(and(eq(schema.claimStateTrusteeDecisions.claimCaseId, r2), eq(schema.claimStateTrusteeDecisions.phase, 'routing'), isNull(schema.claimStateTrusteeDecisions.supersededAt)));
      expect(routing).toEqual([]);
    });

    it('an un-finalized APPEAL panel on R (at `appeal_stage_2`) is superseded through the actor-free core', async () => {
      const { client, tx } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      const r = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, r);
      await toStage2(client, PARIWAR_A, r);
      const { openAppealPanel } = await import('../../../src/claim/index.js');
      await openAppealPanel(client, { claimCaseId: r, pariwarId: PARIWAR_A, panelActorIds: panel, actorId: panel[0]!, actorDisplay: 'P1', actor: 'trustee' });
      await reverseAtStage1(client, PARIWAR_A, s);
      expect(await stateOf(client, r)).toBe('closed');
      const sessions = await tx.select().from(schema.claimAppealPanelSessions).where(eq(schema.claimAppealPanelSessions.claimCaseId, r));
      expect(sessions).toHaveLength(1);
      expect(sessions[0]!.supersededAt).not.toBeNull();
    });

    it('the refile guard is ⛔ not changed: a death whose most recent terminal claim is `closed` (⛔ not a closures row) re-files freely', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      const r = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, r, mid, 'verifier_review');
      await reverseAtStage1(client, PARIWAR_A, s);
      // S ends terminal too (a later trustee refusal — a fixture), so the death has ⛔ no live claim and its most recent
      // terminal claim is the CLOSED R.
      await emit(client, PARIWAR_A, s, mid, 'reversed', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit(client, PARIWAR_A, s, mid, 'state_trustee_freeze', 'denied', 'claim.state_trustee_denied');
      expect(await assertRefileAllowed(tx, PARIWAR_A, mid)).toBeNull();
      expect((await tryConverge(client, intake(mid, 'member_app'))).minted).toBe(true);
    });

    it('`closeClaimsHeldBySuspicionAppeal` on a claim whose live decision is ⛔ `-239` applies nothing', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      const r = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, r, mid, 'verifier_review');
      expect(
        await closeClaimsHeldBySuspicionAppeal(client, { pariwarId: PARIWAR_A, deceasedMemberId: toMemberId(mid), reversedClaimCaseId: s, actor: 'system', actorId: DA }),
      ).toEqual({ applied: false, closed: [], notClosed: [] });
      expect(await stateOf(client, r)).toBe('verifier_review');
    });
  });

  // ── AC2 — the wait at final approval ──────────────────────────────────────────────────────────────────────────────
  describe('AC2 — the wait at final approval (RF5)', () => {
    it('S `not_filed` (within 90 days) ⇒ R\'s FINAL approval waits `appeal_not_filed`; P1 (`district_admin`) is ⛔ not held', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      await refusedClaim(client, PARIWAR_A, mid);
      const r = await approvableHeldClaim(client, PARIWAR_A, mid);
      await expect(finalGate(client, PARIWAR_A, r, mid)).rejects.toSatisfy(pending('appeal_not_filed'));
      await expect(finalGate(client, PARIWAR_A, r, mid, 'district_admin')).resolves.toBeUndefined();
    });

    it('S `open` ⇒ waits `appeal_open` — through the REAL final vote too (⛔ not a denial: R stays `verifier_approved`, ⛔ no event)', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      const r = await approvableHeldClaim(client, PARIWAR_A, mid);
      await expect(finalGate(client, PARIWAR_A, r, mid)).rejects.toSatisfy(pending('appeal_open'));
      const before = await eventTypesOf(client, r);
      const err = await savepoint(client, () =>
        voteOnFrozenClaim(client, {
          claimCaseId: r, pariwarId: PARIWAR_A, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
        }),
      );
      expect(err).toBeInstanceOf(SuspicionAppealPendingError);
      expect(await stateOf(client, r)).toBe('verifier_approved');
      expect(await eventTypesOf(client, r)).toEqual(before);
    });

    it('S `upheld_final` ⇒ decided ⇒ R\'s final approval proceeds (the real vote reaches `state_trustee_approved`)', async () => {
      const { client } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await appealAtStage(client, PARIWAR_A, s, 3, panel);
      await stage3(client, PARIWAR_A, s, 'upheld');
      const r = await approvableHeldClaim(client, PARIWAR_A, mid);
      const vote = await voteOnFrozenClaim(client, {
        claimCaseId: r, pariwarId: PARIWAR_A, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      expect(vote.claimState).toBe('state_trustee_approved');
    });

    it('S `time_limit_passed` (⛔ no appeal, refused 100 days ago) ⇒ decided ⇒ proceeds; S still STANDS (listed as `time_limit_passed`)', async () => {
      const { client, tx } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid, { decidedAt: longAgo() });
      const r = await approvableHeldClaim(client, PARIWAR_A, mid);
      await expect(finalGate(client, PARIWAR_A, r, mid)).resolves.toBeUndefined();
      expect((await readStandingSuspicionRefusals(tx, PARIWAR_A, toMemberId(mid))).map((x) => [x.claimCaseId, x.appeal])).toEqual([[s, 'time_limit_passed']]);
    });

    it('ORDER — after the ground inspection, BEFORE the late-warning wait (which stays LAST)', async () => {
      const { client, tx } = getTx();
      const mid = randomUUID();
      await refusedClaim(client, PARIWAR_A, mid);
      // ⛔ no inspection AND a standing refusal ⇒ the inspection answers first (its conjunct precedes RF5's).
      const noVisit = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, noVisit, mid, 'verifier_approved');
      await seedNomineeNameCheck(client, PARIWAR_A, noVisit, { inspection: 'skip' });
      await expect(finalGate(client, PARIWAR_A, noVisit, mid)).rejects.toBeInstanceOf(GroundInspectionRequiredError);
      // A claim failing the suspicion wait (and complete otherwise) answers the suspicion 409, ⛔ not the late-warning one.
      const r = await approvableHeldClaim(client, PARIWAR_A, mid);
      await expect(finalGate(client, PARIWAR_A, r, mid)).rejects.toBeInstanceOf(SuspicionAppealPendingError);
      // With ⛔ no refusal standing, the late-warning wait is still reached and still LAST — driven for real, on a claim
      // of an UNRELATED death (its own fresh Pariwar — 6.23b Trap 17's own construction: a District Admin approval over
      // a recent nominee change, then a certificate re-review that makes that change ALSO post-death — a NEW warning
      // key the earlier approval never covered). ⚠ Inlined rather than imported from
      // `approval-warnings-every-approver.spec.ts`'s own `determine`/redetermine pattern — safe here ONLY because
      // `finalGate` calls `assertClaimApprovable` directly (no contact-check conjunct in this path); a future reuse of
      // this inline copy on a path that DOES run the contact check would need that file's full RD19 handling too.
      const pid2 = toPariwarId(randomUUID());
      await enterAppScope(client, pid2);
      const cid2 = toClaimId(randomUUID());
      const mid2 = randomUUID();
      await driveClaimTo(client, pid2, cid2, mid2, 'verifier_review');
      await seedNomineeDeclaration(tx, pid2, mid2, { declaredAt: new Date(Date.now() - 300 * DAY), nominees: [{}, {}] });
      await seedNomineeDeclaration(tx, pid2, mid2, { declaredAt: new Date(Date.now() - 30 * DAY), nominees: [{}, {}] });
      const determine = async (date: string) => {
        await seedAcceptedDeathCertificate(client, { pariwarId: pid2, claimCaseId: cid2, date });
        const versions = await listNomineeDeclarationVersions(tx, pid2, toMemberId(mid2));
        await seedNomineeDetermination(client, pid2, cid2, {
          certificateDate: date,
          marks: versions.map((v) => ({ versionId: v.versionId, mark: versionStandsAt(v.effectiveAt, date) ? ('stands' as const) : ('discarded' as const) })),
        });
      };
      await determine(addCalendarDays(istDateOf(new Date()), 1));
      await seedNomineeNameCheck(client, pid2, cid2);
      await adjudicateClaim(client, {
        claimCaseId: cid2,
        pariwarId: pid2,
        outcome: 'approved',
        reasonCode: 'r5_d_natural_death',
        rationaleCiphertext: 'enc:v1:why',
        warningReasonCode: 'warnings_reviewed',
        actorId: DA,
        actorDisplay: 'District Admin',
        actor: 'operator',
      });
      await determine(addCalendarDays(istDateOf(new Date()), -45));
      // RD19 — the redetermination makes the recorded name check stale; re-record a PASSING one so the gate reaches
      // the late-warning conjunct (⛔ not the stale name check) — and still LAST, after the suspicion wait (vacuous
      // here — this death carries ⛔ no `-239` refusal) and the inspection (seeded by `seedNomineeNameCheck`'s default).
      await seedNomineeNameCheck(client, pid2, cid2);
      await expect(finalGate(client, pid2, cid2, mid2)).rejects.toBeInstanceOf(LateWarningReasonRequiredError);
    });

    it('a claim never waits on its OWN refusal (self excluded)', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid);
      // The conjunct itself, on S: its OWN standing refusal (`not_filed`) does ⛔ not hold it.
      await expect(assertSuspicionAppealDecidedForFinalApproval(getTx().tx, PARIWAR_A, s, toMemberId(mid))).resolves.toBeUndefined();
      // … while another claim of the death IS held by it (non-vacuity).
      const r = await approvableHeldClaim(client, PARIWAR_A, mid);
      await expect(assertSuspicionAppealDecidedForFinalApproval(getTx().tx, PARIWAR_A, r, toMemberId(mid))).rejects.toSatisfy(pending('appeal_not_filed'));
    });
  });

  // ── AC2b — the 90-day limit at initiation (RF14) and the reason lock (RF13) ─────────────────────────────────────────
  describe('AC2b — the 90 days (RF14) and the reason lock (RF13)', () => {
    /** A refusal whose current `-239` chain begins on IST date `today − ago`, mid-morning IST. */
    const refusedOnDaysAgo = (ago: number) => new Date(istMidnightAt(addCalendarDays(istDateOf(new Date()), -ago)).getTime() + 3 * 3_600_000);

    it('the boundary pair — refused on D = today − 90 ⇒ initiable (today is D + 90); D = today − 91 ⇒ the time-limit 409 with `appeal_until`', async () => {
      const { client } = getTx();
      const inside = await refusedClaim(client, PARIWAR_A, randomUUID(), { decidedAt: refusedOnDaysAgo(90) });
      await expect(openAppeal(client, PARIWAR_A, inside)).resolves.toMatchObject({ claimState: 'appeal_stage_1' });
      const outsideAt = refusedOnDaysAgo(91);
      const outside = await refusedClaim(client, PARIWAR_A, randomUUID(), { decidedAt: outsideAt });
      const err = await savepoint(client, () => openAppeal(client, PARIWAR_A, outside));
      expect(err).toBeInstanceOf(AppealTimeLimitPassedError);
      expect((err as AppealTimeLimitPassedError).appealUntil).toBe(suspicionRefusalAppealUntil(outsideAt));
      expect((err as AppealTimeLimitPassedError).appealUntil).toBe(addCalendarDays(istDateOf(new Date()), -1));
    });

    it('a refusal for ANY OTHER reason is initiable long past 90 days (6.16 D-E unchanged for it)', async () => {
      const { client } = getTx();
      for (const reason of ['other'] as const) {
        const s = await refusedClaim(client, PARIWAR_A, randomUUID(), { reason, decidedAt: new Date(Date.now() - 400 * DAY) });
        await expect(openAppeal(client, PARIWAR_A, s)).resolves.toMatchObject({ claimState: 'appeal_stage_1' });
      }
    });

    it('a revision that KEEPS `-239` does ⛔ not move D; a revision AWAY and BACK starts a NEW 90 days', async () => {
      const { client, tx } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid, { decidedAt: longAgo(), ground: true });
      // A note-only revision keeping `-239` — D stays 100 days ago ⇒ still past the limit.
      await reviseDecision(client, revise(s, 'post_death_nominee_change'));
      expect((await savepoint(client, () => openAppeal(client, PARIWAR_A, s))) as unknown).toBeInstanceOf(AppealTimeLimitPassedError);
      // AWAY (no other claim of the death ⇒ ⛔ not locked) and BACK ⇒ a new chain from today ⇒ initiable.
      await reviseDecision(client, revise(s, 'other'));
      await reviseDecision(client, revise(s, 'post_death_nominee_change'));
      expect((await readStandingSuspicionRefusals(tx, PARIWAR_A, toMemberId(mid)))[0]!.refusedOn).toBe(istDateOf(new Date()));
      await expect(openAppeal(client, PARIWAR_A, s)).resolves.toMatchObject({ claimState: 'appeal_stage_1' });
    });

    it('a revision ONTO `-239` of an old refusal starts D at the revision (⛔ not the denial) — the family gets its 90 days', async () => {
      const { client } = getTx();
      const s = await refusedClaim(client, PARIWAR_A, randomUUID(), { reason: 'other', decidedAt: longAgo(), ground: true });
      await reviseDecision(client, revise(s, 'post_death_nominee_change'));
      await expect(openAppeal(client, PARIWAR_A, s)).resolves.toMatchObject({ claimState: 'appeal_stage_1' });
    });

    it('RF13 — moving S OFF `-239` is refused while ANY other claim of the death is ⛔ not closed (a predating one, `denied`, `settled` included); a note-only revision passes', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const older = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' }); // PREDATES S, `denied`
      const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true });
      const locked = await savepoint(client, () => reviseDecision(client, revise(s, 'other')));
      expect(locked).toBeInstanceOf(SuspicionReasonLockedError);
      expect((locked as SuspicionReasonLockedError).heldClaimCaseId).toBe(older);
      await expect(reviseDecision(client, revise(s, 'post_death_nominee_change'))).resolves.toBeDefined();

      // A SETTLED other claim locks it too (still two payments).
      const mid2 = randomUUID();
      const s2 = await refusedClaim(client, PARIWAR_A, mid2, { ground: true });
      const settled = await votedHeldClaim(client, PARIWAR_A, mid2);
      await emit(client, PARIWAR_A, settled, mid2, 'state_trustee_approved', 'approved', 'claim.approved');
      await expect(savepoint(client, () => reviseDecision(client, revise(s2, 'other')))).resolves.toBeInstanceOf(SuspicionReasonLockedError);
    });

    it('RF13 — once every other claim of the death is `closed`, the reason may move', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      // The other claim of the death, CLOSED (a fixture `claim.closed` — the closure is ⛔ not the subject here).
      const other = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, other, mid, 'verifier_review');
      await projectClaimState(client, {
        claimCaseId: other, pariwarId: PARIWAR_A, deceasedMemberId: toMemberId(mid), intakeChannels: ['member_app'], claimantActorId: null,
        eventType: 'claim.closed',
        payload: { from_state: 'verifier_review', to_state: 'closed', trigger: 'suspicion_appeal_allowed', actor: 'system', held_by_claim_case_id: randomUUID(), deceased_member_id: mid },
        actorId: null,
      });
      const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true });
      await expect(reviseDecision(client, revise(s, 'other'))).resolves.toMatchObject({ decision: { reasonCode: 'other' } });
    });
  });

  // ── AC4 — the cycle commit re-checks (RF7) ────────────────────────────────────────────────────────────────────────
  describe('AC4 — the commit re-checks (RF7)', () => {
    const commit = (client: Client, pid: PariwarId) =>
      commitCycleFreeze(client, { pariwarId: pid, commitId: randomUUID() as CycleFreezeCommitId, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });

    it('R voted; then a revision ONTO `-239` of another claim of the death (inside its new 90 days) ⇒ the commit SKIPS R and keeps it; once that appeal is upheld, a later commit approves it', async () => {
      const { client } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const panel = await seedAppealPanel(client, pid);
      const mid = randomUUID();
      const s = await refusedClaim(client, pid, mid, { reason: 'other', ground: true });
      const r = await votedHeldClaim(client, pid, mid);
      await reviseDecision(client, { ...revise(s, 'post_death_nominee_change'), pariwarId: pid });
      const first = await commit(client, pid);
      expect(first.committedClaimIds).not.toContain(r);
      expect(await stateOf(client, r)).toBe('state_trustee_approved');
      expect(await eventTypesOf(client, r)).not.toContain('claim.approved');
      // The condition clears — S's appeal is upheld at stage 3.
      await appealAtStage(client, pid, s, 3, panel);
      await stage3(client, pid, s, 'upheld');
      const second = await commit(client, pid);
      expect(second.committedClaimIds).toContain(r);
      expect(await stateOf(client, r)).toBe('approved');
    });

    it('R voted relying on an INHERITED visit; the source is then CLOSED by a third claim\'s `-239` reversal (R ⛔ not closable — Trap 9) ⇒ the visit vanishes (RF8) ⇒ the commit SKIPS R; with its own visit, a later commit approves it', async () => {
      // ⚠ AC4 names "the source's refusal revised away" — RF13 now REFUSES that while R lives (R is ⛔ not closed), so the
      // reachable way an inherited visit vanishes after the vote is the source being CLOSED (it then ⛔ never stands — RF1).
      const { client } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const mid = randomUUID();
      // S — the source: refused on `-239` 100 days ago (decided, ⛔ not holding R), with a completed FULL visit.
      const s = await refusedClaim(client, pid, mid, { decidedAt: longAgo() });
      await completedVisit(client, pid, s);
      // R — ⛔ no visit of its own, its certificate check done (FQ13): complete by inheritance; voted past the gate.
      const r = toClaimId(randomUUID());
      await driveClaimTo(client, pid, r, mid, 'verifier_approved');
      await seedNomineeNameCheck(client, pid, r, { inspection: 'skip' });
      await seedGroundInspection(client, pid, r, { stage: 'certificate_check' });
      // (The inherited family date differs from R's certificate — a warning: the vote carries a reason, 6.23a.)
      const vote = await voteOnFrozenClaim(client, {
        claimCaseId: r, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why', warningReasonCode: 'warnings_reviewed',
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      expect(vote.claimState).toBe('state_trustee_approved');
      expect(await getInheritedGroundInspectionSource(getTx().tx, pid, r)).toBe(s);
      // T — a third claim of the death (created directly — its intake is ⛔ not the subject), refused on `-239` today,
      // appealed and REVERSED: it closes S (`denied` ⇒ closable) and reports R (⛔ not closable).
      const t = await refusedClaim(client, pid, mid);
      await openAppeal(client, pid, t);
      const reversal = await reverseAtStage1(client, pid, t);
      expect(reversal.heldClaims).toEqual({ applied: true, closed: [s].filter(Boolean).sort(), notClosed: [{ claimCaseId: r, state: 'state_trustee_approved' }] });
      expect(await getInheritedGroundInspectionSource(getTx().tx, pid, r)).toBeNull();
      expect((await commit(client, pid)).committedClaimIds).not.toContain(r);
      expect(await stateOf(client, r)).toBe('state_trustee_approved');
      expect(await eventTypesOf(client, r)).not.toContain('claim.approved');
      // The condition clears: R's OWN full visit, against its current certificate (a raw completed row — at
      // `state_trustee_approved` R is ⛔ not in the inspection window unless routed).
      const upload = await currentUploadIdOf(client, pid, r);
      await getTx().tx.insert(schema.claimGroundInspections).values({
        claimCaseId: r, pariwarId: pid, district: 'Patna', inspectionStage: 'initial', inspectionSiteType: 'family_residence', inspectorActorId: randomUUID(),
        scheduledAt: new Date(), status: 'completed', completedAt: new Date(), originalCertificateVerdict: 'matches', comparedCertificateUploadId: upload as never,
        deathDateCiphertext: 'enc:v1:death-date', deathDateSource: 'family_statement', deathDateIndex: 'fixture-death-date-index:2026-05-01',
      });
      expect((await commit(client, pid)).committedClaimIds).toContain(r);
      expect(await stateOf(client, r)).toBe('approved');
    });

    it('a normal claim commits exactly as today', async () => {
      const { client } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const r = await approvableHeldClaim(client, pid, randomUUID());
      await voteOnFrozenClaim(client, { claimCaseId: r, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
      expect((await commit(client, pid)).committedClaimIds).toEqual([r]);
    });
  });
});

function revise(cid: ClaimId, reasonCode: 'post_death_nominee_change' | 'other') {
  return {
    claimCaseId: cid,
    pariwarId: PARIWAR_A as PariwarId,
    outcome: 'denied' as const,
    reasonCode,
    rationaleCiphertext: 'enc:v1:revised',
    actorId: DA,
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator' as const,
  };
}
