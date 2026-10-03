// The correction CLOSURE — Story 6.19c (AC6, AC7 domain half, AC14, AC17; AC11c "Every AC6 409", "The approval
// re-checks the request", "One tx", "The `-251` approve", "The hold", "AC17"). Live DB; per-test ROLLBACK.
//
// ⭐ The clock: every writer takes `now` — a returned claim's family run opens TODAY (day 0), so "day 95" is simply
// `now = 10:00 IST on day 0 + 95` (⛔ no backdating needed for the 90 days). A person is REACHED by an `accepted`
// family SMS whose `recipient_number_hash` is their CURRENT number's (REAL envelopes, a fake KMS — the production hash).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  ClaimContactRequiredError,
  ClosureLetterRefusedError,
  RefileConfirmationRefusedError,
  RefileRequiresConfirmationError,
  listClosureLettersOwed,
  listEscalatedClosures,
  listOpenDirectionsFor,
  listPariwarClosureQueue,
  overrideIntakeAttempt,
  readApprovalNameHighlight,
  readClosureReadiness,
  readEscalatedClosureDetail,
  readRefileRequiresConfirmation,
  recordClosureLetter,
  recordClosureLetterDelivery,
  recordRefileConfirmation,
  tryConverge,
  voteOnFrozenClaim,
  approveNoCorrectionNeeded,
  assertCorrectionClaimNotHeld,
  decideNomineeCorrectionAsDistrictAdmin,
  decideNomineeCorrectionAsPariwarAdmin,
  endCorrectionRun,
  escalateStaffCase,
  isCorrectionClaimHeld,
  keepNoCorrectionNeeded,
  placeClosureUnderReview,
  raiseNomineeCorrection,
  recordClosureDirection,
  recordCorrectionLetter,
  recordCorrectionLetterDelivery,
  recordNoCorrectionNeeded,
  requestCorrectionClosure,
  resolveCorrectionChase,
  respondToClosureDirection,
  returnToDistrictAdmin,
  writeCorrectionMark,
} from '../../../src/claim/index.js';
import { istDateOf } from '../../../src/claim/correction-schedule.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
} from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  driveClaimTo,
  enterAppScope,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

import {
  TRUSTEE,
  DA,
  SA,
  HOUR,
  ENC,
  encryptNomineeMobile,
  tenAmIst,
  stateOf,
  eventTypesOf,
  markInput,
  returnedClaim,
  asSuperuser,
  familyRow,
  reachedClaim,
  request,
  approve,
  decline,
  superAdmin,
  expectRefused,
  closuresOf,
  resubmit,
  type Client,
  type Tx,
} from './_correction-closure-fixture.js';

describe.skipIf(!hasDatabase)('the correction closure — request, decision, hold, Super Admin, D27 (6.19c)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── AC6 — every request refusal, in its order ───────────────────────────────────────────────────────────────
  describe('AC6 — the request\'s refusals (each in its order)', () => {
    it('no_live_return — a claim with ⛔ no live return (a certificate wait alone ⛔ never qualifies — invariant 10)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, cid, toMemberId(randomUUID()), 'verifier_approved');
      await expectRefused(
        requestCorrectionClosure(client, { pariwarId: PARIWAR_A, claimCaseId: cid, actorId: DA, actorDisplay: 'DA', now: new Date(), noteCiphertext: 'x', crypto: ENC }),
        'no_live_return',
      );
    });

    it('request_pending, then escalated — a second request while one waits; and once declined, the claim is with the Super Admin', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      expect(await request(client, c)).toMatchObject({ state: 'requested', origin: 'declined_closure', requestFamilyRunId: c.runId });
      await expectRefused(request(client, c), 'request_pending');
      await decline(client, c);
      await expectRefused(request(client, c), 'escalated');
    });

    it('not_family_action — a staff-marked return (AC17), also at day 95', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'staff' });
      await familyRow(tx, c, 'accepted');
      await expectRefused(request(client, c), 'not_family_action');
    });

    it('too_early — day 89 of the family run; ⭐ a switch to `family` on day 60 counts from the NEW run (day 90 of it)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await expectRefused(request(client, c, c.day(89)), 'too_early');
      const s = await returnedClaim(client, { mustAct: 'staff' });
      const fam = await writeCorrectionMark(client, markInput(s.cid, 'family', s.day(60)));
      const run = fam.openedRun!;
      expect(run.day0).toBe(addCalendarDays(s.day0, 60));
      await familyRow(tx, s, 'accepted', { runId: run.runId, sentOn: addCalendarDays(run.day0, 1) });
      await expectRefused(request(client, s, s.day(95)), 'too_early');
      expect(await request(client, s, s.day(150))).toMatchObject({ state: 'requested', requestFamilyRunId: run.runId });
    });

    it('claim_routed_to_r9 — defensive (a routing row beside a return is refused at write; built raw here)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
           VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', 't', 'T')`,
          [c.cid, PARIWAR_A],
        ),
      );
      await expectRefused(request(client, c), 'claim_routed_to_r9');
    });

    it('⭐ claim_corrected — BOTH legs: a RESUBMITTED claim, and a family that rewrote and was ⛔ never re-checked (`-268`)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const resubmitted = await reachedClaim(client, tx, { timeline: true });
      await resubmit(client, tx, resubmitted);
      await expectRefused(request(client, resubmitted), 'claim_corrected');
      const partDone = await reachedClaim(client, tx, { timeline: true });
      await tx
        .update(schema.claimNomineeBankAccounts)
        .set({ updatedAt: new Date(partDone.returnedAt.getTime() + HOUR) })
        .where(eq(schema.claimNomineeBankAccounts.claimCaseId, partDone.cid));
      expect((await resolveCorrectionChase(tx, PARIWAR_A, partDone.cid)).familyPartDoneAt).not.toBeNull();
      await expectRefused(request(client, partDone), 'claim_corrected');
    });

    it('⭐ not_reached — ⛔ no accept; every slot `no_target` ⛔ without a delivered letter; the body names a COUNT and the ROLES only', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      const err = await expectRefused(request(client, c), 'not_reached');
      expect(err.notReached).toEqual({ count: 1, roles: ['nominee'] });
      await familyRow(tx, c, 'no_target', { slotDay: 1 });
      await familyRow(tx, c, 'no_target', { slotDay: 2 });
      await expectRefused(request(client, c), 'not_reached');
      // A DELIVERED letter reaches them (`-252` cl.1).
      const l = await recordCorrectionLetter(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, personKey: c.person.personKey, postedOn: addCalendarDays(c.day0, 3),
        trackingNumberCiphertext: 'enc:v1:t', actorId: DA, actorDisplay: 'DA', crypto: ENC,
      });
      await recordCorrectionLetterDelivery(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, letterId: l.letterId, deliveredOn: addCalendarDays(c.day0, 5),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
      });
      expect(await request(client, c)).toMatchObject({ state: 'requested' });
    });

    it('⭐ `-271` §1 — an accept to an OLD number does ⛔ not count (the hash is compared to the CURRENT number)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      await familyRow(tx, c, 'accepted', { hash: 'hmac-of-an-old-number' });
      await expectRefused(request(client, c), 'not_reached');
    });

    it('⭐ `-273` §1 — a person reached ONLY by a run-1 delivered letter IS reached in run 3 (family → staff → family)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      await familyRow(tx, c, 'rejected_invalid_number');
      const l = await recordCorrectionLetter(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, personKey: c.person.personKey, postedOn: addCalendarDays(c.day0, 2),
        trackingNumberCiphertext: 'enc:v1:t', actorId: DA, actorDisplay: 'DA', crypto: ENC,
      });
      await recordCorrectionLetterDelivery(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, letterId: l.letterId, deliveredOn: addCalendarDays(c.day0, 4),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
      });
      await writeCorrectionMark(client, markInput(c.cid, 'staff', c.day(5)));
      const run3 = (await writeCorrectionMark(client, markInput(c.cid, 'family', c.day(10)))).openedRun!;
      const now = tenAmIst(addCalendarDays(run3.day0, 90));
      expect(await request(client, c, now)).toMatchObject({ state: 'requested', requestFamilyRunId: run3.runId });
    });

    it('closure.claim_contact_required (D14) — the LAST refusal: everyone reached, but a nominee\'s address row is missing', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await asSuperuser(client, () =>
        client.query(
          `DELETE FROM claim_contact_nominees WHERE contact_id = (SELECT contact_id FROM claim_contacts WHERE claim_case_id = $1)`,
          [c.cid],
        ),
      );
      await expect(request(client, c)).rejects.toBeInstanceOf(ClaimContactRequiredError);
    });
  });

  // ── AC6 — the Pariwar Admin's approval: D1 in ONE transaction ───────────────────────────────────────────────
  describe('AC6 — the approval (D1) and the decline', () => {
    it('⭐ approve: the return superseded, frozen → denied → denied_no_appeal, a `frozen_vote`/`denied`/`other` row, the open run ended `decided`, the notice DUE for the reached person', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await request(client, c);
      const before = await eventTypesOf(tx, c.cid);
      const r = await approve(client, c);
      expect(r.chain).toMatchObject({ claimState: 'denied', deniedNoAppeal: true });
      expect(r.endedRun).toBe(true);
      expect((await eventTypesOf(tx, c.cid)).slice(before.length)).toEqual([
        'claim.state_trustee_frozen',
        'claim.state_trustee_denied',
        'claim.denied_no_appeal',
      ]);
      expect(await stateOf(tx, c.cid)).toBe('denied');
      const [ret] = await tx.select().from(schema.claimStateTrusteeDecisions).where(eq(schema.claimStateTrusteeDecisions.decisionId, c.returnId as never));
      expect(ret!.supersededAt).not.toBeNull();
      const [vote] = await tx
        .select()
        .from(schema.claimStateTrusteeDecisions)
        .where(and(eq(schema.claimStateTrusteeDecisions.claimCaseId, c.cid), eq(schema.claimStateTrusteeDecisions.phase, 'frozen_vote')));
      expect(vote).toMatchObject({ outcome: 'denied', reasonCode: 'other', supersededAt: null });
      expect(r.closure).toMatchObject({
        state: 'closed',
        pariwarDecision: 'approved',
        closureNoticeRunId: c.runId,
        closureNoticePersonKeys: [c.person.personKey],
        closureLetterPersonKeys: [],
        closureNoticeDoneAt: null,
      });
      expect(r.closure.closureNoticeDueAt).not.toBeNull();
      const [run] = await tx.select().from(schema.claimCorrectionRuns).where(eq(schema.claimCorrectionRuns.runId, c.runId));
      expect(run).toMatchObject({ endReason: 'decided' });
    });

    it('⭐ `-274` 2 — a person reached ONLY by post (number dead) gets ⛔ no text: a closure LETTER is owed instead; a run already ended `day_90` stays so (⛔ `decided`)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      await familyRow(tx, c, 'rejected_invalid_number');
      const l = await recordCorrectionLetter(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, personKey: c.person.personKey, postedOn: addCalendarDays(c.day0, 2),
        trackingNumberCiphertext: 'enc:v1:t', actorId: DA, actorDisplay: 'DA', crypto: ENC,
      });
      await recordCorrectionLetterDelivery(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, letterId: l.letterId, deliveredOn: addCalendarDays(c.day0, 4),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
      });
      expect(await endCorrectionRun(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, runId: c.runId, reason: 'day_90' })).toBe(true);
      await request(client, c);
      const r = await approve(client, c);
      expect(r.endedRun).toBe(false);
      expect(r.closure).toMatchObject({ closureNoticePersonKeys: [], closureLetterPersonKeys: [c.person.personKey] });
      // ⛔ No one to text ⇒ the notice outbox is done at once.
      expect(r.closure.closureNoticeDoneAt).not.toBeNull();
      const [run] = await tx.select().from(schema.claimCorrectionRuns).where(eq(schema.claimCorrectionRuns.runId, c.runId));
      expect(run).toMatchObject({ endReason: 'day_90' });
    });

    it('⭐ the approval re-checks the request: a 6.20 number change between request and approval ⇒ not_reached', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await request(client, c);
      const { correctionId } = await raiseNomineeCorrection(client, {
        claimCaseId: c.cid, pariwarId: PARIWAR_A, rank: 1, proposedNameCiphertext: 'enc:v1:n', proposedRelationship: 'spouse',
        proposedMobileCiphertext: await encryptNomineeMobile('9898989898'), proposedAddressCiphertext: null,
        raiseNoteCiphertext: 'enc:v1:r', raisedVia: 'helpline', raisedByActorId: randomUUID(),
      });
      const step = (actorId: string) => ({ correctionId, claimCaseId: c.cid, pariwarId: PARIWAR_A, outcome: 'approve' as const, noteCiphertext: 'enc:v1:s', actorId, actorDisplay: 'X' });
      await decideNomineeCorrectionAsDistrictAdmin(client, step(DA));
      await decideNomineeCorrectionAsPariwarAdmin(client, step(TRUSTEE));
      await seedNomineeDetermination(client, PARIWAR_A, c.cid);
      await expectRefused(approve(client, c), 'not_reached');
    });

    it('⭐ `-273` §3d — a request then a switch to `staff`: approve AND decline ⇒ request_lapsed, ⛔ no escalation row; a new request at day 90 of a LATER family run is accepted (the old row materialised `lapsed`)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await request(client, c);
      await writeCorrectionMark(client, markInput(c.cid, 'staff', c.day(95)));
      await expectRefused(approve(client, c), 'request_lapsed');
      await expectRefused(decline(client, c), 'request_lapsed');
      expect((await closuresOf(tx, c.cid)).map((r) => r.state)).toEqual(['requested']);
      // ⚠ AC11c listed "staff and back ⇒ too_early" — under `-273` §3d the request LAPSES first (a ⛔-family mark after it,
      // and a new family run): recorded in the story's Completion Notes. The later family run, at ITS day 90:
      const back = (await writeCorrectionMark(client, markInput(c.cid, 'family', c.day(100)))).openedRun!;
      await expectRefused(approve(client, c, c.day(101)), 'request_lapsed');
      await familyRow(tx, c, 'accepted', { runId: back.runId, sentOn: addCalendarDays(back.day0, 1) });
      const fresh = await request(client, c, tenAmIst(addCalendarDays(back.day0, 90)));
      expect(fresh).toMatchObject({ state: 'requested', requestFamilyRunId: back.runId });
      expect((await closuresOf(tx, c.cid)).map((r) => r.state)).toEqual(['lapsed', 'requested']);
    });

    it('⭐ decline (a REQUIRED note) ⇒ escalated, the claim HELD: a mark switch opens ⛔ no run either way; the cycle-freeze guard refuses', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await request(client, c);
      const r = await decline(client, c);
      expect(r.closure).toMatchObject({ state: 'escalated', pariwarDecision: 'declined' });
      expect(r.chain).toBeNull();
      expect(await isCorrectionClaimHeld(tx, PARIWAR_A, c.cid)).toBe(true);
      const toStaff = await writeCorrectionMark(client, markInput(c.cid, 'staff', c.day(97)));
      expect(toStaff.openedRun).toBeNull();
      const toFamily = await writeCorrectionMark(client, markInput(c.cid, 'family', c.day(98)));
      expect(toFamily.openedRun).toBeNull();
      await expectRefused(assertCorrectionClaimNotHeld(client, PARIWAR_A, c.cid), 'cycle_freeze_escalated');
      expect(await stateOf(tx, c.cid)).toBe('verifier_approved');
    });

    it('⭐ S-T9 — an escalation row for an EARLIER return holds ⛔ nothing on a later return', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx, { timeline: true });
      await request(client, c);
      await decline(client, c);
      expect(await isCorrectionClaimHeld(tx, PARIWAR_A, c.cid)).toBe(true);
      // The claim is corrected and returned AGAIN (the domain writer — the route refuses a return while held).
      await resubmit(client, tx, c);
      await returnToDistrictAdmin(client, {
        claimCaseId: c.cid, pariwarId: PARIWAR_A, reasonCode: 'other', rationaleCiphertext: 'enc:v1:again',
        actorId: TRUSTEE, actorDisplay: 'Pariwar Admin One', actor: 'trustee',
      });
      expect(await isCorrectionClaimHeld(tx, PARIWAR_A, c.cid)).toBe(false);
    });

    it('⭐ ONE transaction — a forced failure mid-chain (the decision row collides) leaves NOTHING: the return live, ⛔ no event, the row still `requested`', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await request(client, c);
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
           VALUES ($1, $2, 'frozen_vote', 'denied', 'other', 't', 'T')`,
          [c.cid, PARIWAR_A],
        ),
      );
      const before = await eventTypesOf(tx, c.cid);
      await client.query('SAVEPOINT chain');
      await expectRefused(approve(client, c), 'return_not_live');
      await client.query('ROLLBACK TO SAVEPOINT chain');
      expect(await eventTypesOf(tx, c.cid)).toEqual(before);
      const [ret] = await tx.select().from(schema.claimStateTrusteeDecisions).where(eq(schema.claimStateTrusteeDecisions.decisionId, c.returnId as never));
      expect(ret!.supersededAt).toBeNull();
      expect((await closuresOf(tx, c.cid)).map((r) => r.state)).toEqual(['requested']);
    });
  });

  // ── AC14 — the Super Admin ───────────────────────────────────────────────────────────────────────────────────
  describe('AC14 — the Super Admin\'s review, directions and decisions', () => {
    async function escalated(client: Client, tx: Tx, opts: { readonly timeline?: boolean } = {}) {
      const c = await reachedClaim(client, tx, opts);
      await request(client, c);
      await decline(client, c);
      return c;
    }

    it('review: escalated → under_review (a note); a second hold ⇒ already_under_review; a non-escalated claim ⇒ not_escalated', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx);
      const hold = () => placeClosureUnderReview(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: SA, actorDisplay: 'SA', now: c.day(98), noteCiphertext: 'enc:v1:r' });
      expect(await hold()).toMatchObject({ state: 'under_review' });
      await expectRefused(hold(), 'already_under_review');
      const other = await reachedClaim(client, tx);
      await expectRefused(
        placeClosureUnderReview(client, { pariwarId: PARIWAR_A, claimCaseId: other.cid, actorId: SA, actorDisplay: 'SA', now: other.day(98), noteCiphertext: 'x' }),
        'not_escalated',
      );
    });

    it('⭐ directions: `restart_family_reminders` opens a `direction` run (and ⛔ unless the mark is `family`); the named directee responds once — ⛔ anyone else', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx);
      const direct = (kind: 'restart_family_reminders' | 'other') =>
        recordClosureDirection(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: SA, actorDisplay: 'SA', now: c.day(99),
          directedToActor: DA, directedToRole: 'district_admin', kind, textCiphertext: 'enc:v1:d',
        });
      const restart = await direct('restart_family_reminders');
      expect(restart.openedRunId).not.toBeNull();
      const [run] = await tx.select().from(schema.claimCorrectionRuns).where(eq(schema.claimCorrectionRuns.runId, restart.openedRunId!));
      expect(run).toMatchObject({ kind: 'direction', day0: addCalendarDays(c.day0, 99), anchorId: restart.direction.directionId });
      await writeCorrectionMark(client, markInput(c.cid, 'staff', c.day(100)));
      await expectRefused(direct('restart_family_reminders'), 'direction_mark_not_family');
      const other = await direct('other');
      expect(other.openedRunId).toBeNull();
      const respond = (actorId: string) =>
        respondToClosureDirection(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId, actorDisplay: 'X', now: c.day(101), directionId: other.direction.directionId, responseCiphertext: 'enc:v1:done' });
      await expectRefused(respond(TRUSTEE), 'not_directee');
      expect(await respond(DA)).toMatchObject({ respondedByActor: DA });
      await expectRefused(respond(DA), 'direction_answered');
    });

    it('a hold or a direction on a NON-escalated claim ⇒ not_escalated', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await expectRefused(
        recordClosureDirection(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: SA, actorDisplay: 'SA', now: c.day(99),
          directedToActor: DA, directedToRole: 'district_admin', kind: 'other', textCiphertext: 'x',
        }),
        'not_escalated',
      );
    });

    it('⭐ close on a DECLINED-closure origin ⇒ D1 (`correction_closure_super_admin`), the reason checked; a wrong reason ⇒ reason_invalid', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx);
      await expectRefused(superAdmin(client, c, 'close', 'claim_not_payable'), 'reason_invalid');
      const r = await superAdmin(client, c, 'close', 'family_silent_after_reached');
      expect(r.closure).toMatchObject({ state: 'closed', superAdminDecision: 'closed', superAdminReason: 'family_silent_after_reached' });
      expect(r.chain).toMatchObject({ claimState: 'denied', deniedNoAppeal: true });
      expect(await stateOf(tx, c.cid)).toBe('denied');
    });

    it('⭐ code review Decision 3 (2026-10-02) — a D27 record during the hold makes `close` throw `not_family_action` (stale "family was silent" premise), but `refuse`/`approve` stay open', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx);
      await recordNoCorrectionNeeded(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: DA, actorDisplay: 'DA', now: c.day(99),
        markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
      });
      await expectRefused(superAdmin(client, c, 'close', 'family_silent_after_reached'), 'not_family_action');
      // `close` threw before writing anything — the escalated row is still decidable via `refuse`.
      const r = await superAdmin(client, c, 'refuse', 'claim_not_payable');
      expect(r.chain).toMatchObject({ claimState: 'denied' });
    });

    it('⭐ code review Decision 3 (2026-10-03, second pass) — the `approve` leg: after the same D27 record, the Super Admin can still APPROVE', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx);
      await recordNoCorrectionNeeded(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: DA, actorDisplay: 'DA', now: c.day(99),
        markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
      });
      await expectRefused(superAdmin(client, c, 'close', 'family_silent_after_reached'), 'not_family_action');
      const a = await superAdmin(client, c, 'approve', 'details_verified');
      expect(a.closure).toMatchObject({ state: 'approved', superAdminDecision: 'approved' });
    });

    it('⭐ refuse ⇒ `state_trustee_denied` with the chosen code, ⛔ `denied_no_appeal` (appealable once); after a used appeal ⇒ `denied_no_appeal`', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx);
      const r = await superAdmin(client, c, 'refuse', 'claim_not_payable');
      expect(r.chain).toMatchObject({ claimState: 'denied', deniedNoAppeal: false });
      expect(await eventTypesOf(tx, c.cid)).not.toContain('claim.denied_no_appeal');
      const used = await escalated(client, tx);
      // The claim already USED its one appeal (a journey row — `-255` F2's "unless").
      await asSuperuser(client, () =>
        client.query(
          `INSERT INTO claim_appeals (claim_case_id, pariwar_id, current_stage, initiated_by_actor, status) VALUES ($1, $2, '1', 'operator', 'upheld_final')`,
          [used.cid, PARIWAR_A],
        ),
      );
      const u = await superAdmin(client, used, 'refuse', 'other');
      expect(u.chain).toMatchObject({ deniedNoAppeal: true });
    });

    it('⭐ the `-251` approve — PERMITTED with a `does_not_match` check AND with ⛔ no check at all (the state recorded); ⛔ nothing paid otherwise', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const mismatch = await escalated(client, tx);
      await seedNomineeNameCheck(client, PARIWAR_A, mismatch.cid, { reuseAccounts: true, verdicts: ['matches', 'does_not_match'] });
      const a = await superAdmin(client, mismatch, 'approve', 'name_difference_accepted');
      expect(a).toMatchObject({ nameCheckWaived: true, approvalNameCheckState: 'does_not_match' });
      expect(a.closure).toMatchObject({ state: 'approved', nameCheckWaived: true, approvalNameCheckState: 'does_not_match' });
      expect(await stateOf(tx, mismatch.cid)).toBe('state_trustee_approved');
      const unchecked = await escalated(client, tx);
      await asSuperuser(client, async () => {
        await client.query("SET LOCAL session_replication_role = 'replica'");
        await client.query(`DELETE FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'`, [unchecked.cid]);
        await client.query("SET LOCAL session_replication_role = 'origin'");
      });
      expect(await superAdmin(client, unchecked, 'approve', 'name_difference_accepted')).toMatchObject({ approvalNameCheckState: 'never_checked' });
    });

    it('⭐ the `-251` approve still REFUSES without two accounts (the gate minus the name check — ⛔ nothing else waived)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx);
      await asSuperuser(client, () =>
        client.query(`DELETE FROM claim_nominee_bank_accounts WHERE claim_case_id = $1 AND account_rank = 2`, [c.cid]),
      );
      await expect(superAdmin(client, c, 'approve', 'name_difference_accepted')).rejects.toMatchObject({ name: 'NomineeBankAccountsRequiredError' });
    });

    it('⭐ `-273` §4 — a RESUBMITTED escalated claim: approve through the FULL gate (⛔ waived), and close ⇒ claim_corrected', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await escalated(client, tx, { timeline: true });
      await resubmit(client, tx, c);
      await expectRefused(superAdmin(client, c, 'close', 'family_silent_after_reached'), 'claim_corrected');
      expect(await superAdmin(client, c, 'approve', 'details_verified')).toMatchObject({ nameCheckWaived: false, approvalNameCheckState: 'passing' });
    });
  });

  // ── AC17 — the staff case, "no correction needed" ──────────────────────────────────────────────────────────
  describe('AC17 — the staff case at day 90, and "no correction needed" (D27)', () => {
    it('⭐ the day-90 escalation row (a record): ⛔ before day 90; idempotent; the claim HELD; then a close ⇒ staff_case_origin — ⭐ even after a direction back to `family`', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'staff' });
      expect(await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(89) })).toBeNull();
      const row = await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(90) });
      expect(row).toMatchObject({ origin: 'staff_case', state: 'escalated', requestFamilyRunId: null, pariwarDecision: null });
      expect(await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(91) })).toBeNull();
      expect(await isCorrectionClaimHeld(tx, PARIWAR_A, c.cid)).toBe(true);
      // `-274` 1a — directed back to the family, silent 90 days: STILL ⛔ closable (keyed on the ORIGIN).
      await writeCorrectionMark(client, markInput(c.cid, 'family', c.day(92)));
      await recordClosureDirection(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: SA, actorDisplay: 'SA', now: c.day(93),
        directedToActor: DA, directedToRole: 'district_admin', kind: 'restart_family_reminders', textCiphertext: 'x',
      });
      await familyRow(tx, c, 'accepted');
      await expectRefused(superAdmin(client, c, 'close', 'family_silent_after_reached', c.day(200)), 'staff_case_origin');
    });

    it('⭐ `-260` G1 — the Super Admin approves a staff case ONLY with a current passing check (a stale one ⇒ refused)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'staff' });
      await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(90) });
      await tx
        .update(schema.claimNomineeBankAccounts)
        .set({ updatedAt: new Date(Date.now() + 60_000) })
        .where(eq(schema.claimNomineeBankAccounts.claimCaseId, c.cid));
      await expect(superAdmin(client, c, 'approve', 'details_verified')).rejects.toMatchObject({ name: 'NomineeNameCheckRequiredError' });
      await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
      expect(await superAdmin(client, c, 'approve', 'details_verified')).toMatchObject({ nameCheckWaived: false, approvalNameCheckState: 'passing' });
    });

    it('⭐ D27 — the record sets the mark to `staff`; the approve is refused without a FRESH passing check, then approves through the full gate; a keep supersedes it', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'family' });
      const record = () =>
        recordNoCorrectionNeeded(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: DA, actorDisplay: 'DA', now: c.day(3),
          markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
        });
      const r = await record();
      expect(r.mark.mark.mustAct).toBe('staff');
      const approveD27 = () => approveNoCorrectionNeeded(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'PA', now: c.day(4), decisionRationaleCiphertext: 'enc:v1:x' });
      // The check seeded at filing is OLDER than the record ⇒ ⛔ in effect yet.
      await asSuperuser(client, async () => {
        await client.query("SET LOCAL session_replication_role = 'replica'");
        await client.query(`UPDATE events_log SET occurred_at = occurred_at - interval '1 hour' WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'`, [c.cid]);
        await client.query("SET LOCAL session_replication_role = 'origin'");
      });
      await expectRefused(approveD27(), 'check_required');
      // A keep supersedes the record (its mark is no longer the latest).
      await keepNoCorrectionNeeded(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'PA', now: c.day(5), mustAct: 'staff',
        noteCiphertext: 'enc:v1:keep', setByRole: 'pariwar_admin', hold: isCorrectionClaimHeld,
      });
      await expectRefused(approveD27(), 'no_record');
      // Recorded again, then a fresh passing check AFTER it ⇒ approved (full gate).
      await record();
      await asSuperuser(client, () => client.query(`UPDATE claim_correction_no_correction_records SET recorded_at = recorded_at - interval '1 minute' WHERE claim_case_id = $1`, [c.cid]));
      await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
      const ok = await approveD27();
      expect(ok.chain).toMatchObject({ claimState: 'state_trustee_approved', deniedNoAppeal: false });
    });

    it('⭐ D27 (2026-10-03) — "a check AFTER the record" is compared at MICROSECOND precision: a check in the SAME millisecond but later counts, an EQUAL one does ⛔ not — writer and queue agree', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'family' });
      await recordNoCorrectionNeeded(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: DA, actorDisplay: 'DA', now: c.day(3),
        markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
      });
      await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
      // Pin both instants inside ONE millisecond (…123): as JS `Date`s they are EQUAL — the old comparison's blind spot.
      const pin = (checkAt: string) =>
        asSuperuser(client, async () => {
          await client.query(`UPDATE claim_correction_no_correction_records SET recorded_at = '2026-06-01 10:00:00.123100+00' WHERE claim_case_id = $1`, [c.cid]);
          await client.query("SET LOCAL session_replication_role = 'replica'");
          await client.query(`UPDATE events_log SET occurred_at = $2 WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'`, [c.cid, checkAt]);
          await client.query("SET LOCAL session_replication_role = 'origin'");
        });
      const flag = async () => (await listPariwarClosureQueue(tx, PARIWAR_A, { limit: 200 })).find((i) => i.claimCaseId === c.cid)?.checkedAfterRecord;
      const approveD27 = () => approveNoCorrectionNeeded(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'PA', now: c.day(4), decisionRationaleCiphertext: 'enc:v1:x' });
      // EQUAL to the microsecond ⇒ ⛔ after.
      await pin('2026-06-01 10:00:00.123100+00');
      expect(await flag()).toBe(false);
      await expectRefused(approveD27(), 'check_required');
      // 100 µs LATER, the SAME millisecond ⇒ after: the queue offers the approve, and the writer takes it.
      await pin('2026-06-01 10:00:00.123200+00');
      expect(await flag()).toBe(true);
      const ok = await approveD27();
      expect(ok.chain).toMatchObject({ claimState: 'state_trustee_approved' });
    });

    it('⭐ `-273` §4 — D27\'s approve on a HELD claim ⇒ cycle_freeze_escalated, while the "no correction needed" RECORD is accepted', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'staff' });
      await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(90) });
      const r = await recordNoCorrectionNeeded(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: DA, actorDisplay: 'DA', now: c.day(91),
        markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
      });
      expect(r.record.markId).toBe(r.mark.mark.markId);
      await expectRefused(
        approveNoCorrectionNeeded(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'PA', now: c.day(92), decisionRationaleCiphertext: 'x' }),
        'cycle_freeze_escalated',
      );
      expect(await isCorrectionClaimHeld(tx, PARIWAR_A, c.cid)).toBe(true);
    });
  });

  it('⛔ a request ⛔ never touches the claim state (it decides nothing — invariant 1)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await reachedClaim(client, tx);
    const before = await eventTypesOf(tx, c.cid);
    await request(client, c);
    expect(await eventTypesOf(tx, c.cid)).toEqual(before);
    expect(await stateOf(tx, c.cid)).toBe('verifier_approved');
    expect(istDateOf(c.day(95))).toBe(addCalendarDays(c.day0, 95));
  });

  // ── AC15 — the re-file guard (both mint paths), and the member's routing bit ───────────────────────────────
  describe('AC15 — re-filing after a closure for silence (D19, T9)', () => {
    const intake = (mid: string, channel: 'member_app' | 'helpline', auditId: string) =>
      ({ pariwarId: PARIWAR_A, deceasedMemberId: toMemberId(mid), intakeChannel: channel, actor: 'member' as const, claimantActorId: null, trigger: 'test', actorId: null, auditId });

    async function closedClaim(client: Client, tx: Tx) {
      const c = await reachedClaim(client, tx);
      await request(client, c);
      await approve(client, c);
      return c;
    }

    it('⭐ BOTH mint paths are guarded: ⛔ without a confirmation ⇒ 409; a confirmation is CONSUMED by the mint; the routing bit follows', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await closedClaim(client, tx);
      expect(await readRefileRequiresConfirmation(tx, PARIWAR_A, c.mid)).toBe(true);
      await client.query('SAVEPOINT refile');
      await expect(tryConverge(client, intake(c.mid, 'member_app', 'r1'))).rejects.toBeInstanceOf(RefileRequiresConfirmationError);
      await client.query('ROLLBACK TO SAVEPOINT refile');
      const conf = await recordRefileConfirmation(client, {
        pariwarId: PARIWAR_A, closedClaimCaseId: c.cid, via: 'helpline', actorId: 'op', actorDisplay: 'Helpline Operator', noteCiphertext: 'enc:v1:n',
      });
      await expect(
        recordRefileConfirmation(client, { pariwarId: PARIWAR_A, closedClaimCaseId: c.cid, via: 'district_admin', actorId: DA, actorDisplay: 'DA', noteCiphertext: 'x' }),
      ).rejects.toMatchObject({ refusal: 'already_confirmed' });
      // ⭐ Once confirmed the routing bit is false (the wizard is open again).
      expect(await readRefileRequiresConfirmation(tx, PARIWAR_A, c.mid)).toBe(false);
      const r1 = await tryConverge(client, intake(c.mid, 'member_app', 'r2'));
      expect(r1.minted).toBe(true);
      const [consumed] = await tx.select().from(schema.claimRefileConfirmations).where(eq(schema.claimRefileConfirmations.confirmationId, conf.confirmationId));
      expect(consumed!.consumedByClaimCaseId).toBe(r1.claimCaseId);
      // ⭐ The confirmation is consumed and the new claim is LIVE ⇒ the old pointer ⛔ never traps the family.
      expect(await readRefileRequiresConfirmation(tx, PARIWAR_A, c.mid)).toBe(false);
      // The SECOND mint path — an override separating a cross-channel attempt — needs its own confirmation.
      const r2 = await tryConverge(client, intake(c.mid, 'helpline', 'r3'));
      expect(r2.convergencePending).toBe(true);
      const override = () =>
        overrideIntakeAttempt(client, {
          intakeAttemptId: r2.intakeAttemptId!, pariwarId: PARIWAR_A, deceasedMemberId: toMemberId(c.mid), intakeChannel: 'helpline',
          againstClaimCaseId: toClaimId(r1.claimCaseId), reason: 'distinct claimant', actor: 'operator', claimantActorId: null,
          decidedByActor: randomUUID(), auditId: 'o1',
        });
      await client.query('SAVEPOINT ov');
      await expect(override()).rejects.toBeInstanceOf(RefileRequiresConfirmationError);
      await client.query('ROLLBACK TO SAVEPOINT ov');
      await recordRefileConfirmation(client, { pariwarId: PARIWAR_A, closedClaimCaseId: c.cid, via: 'district_admin', actorId: DA, actorDisplay: 'DA', noteCiphertext: 'x' });
      expect((await override()).newClaimCaseId).not.toBe(r1.claimCaseId);
    });

    it('⭐ T9 — keyed on the CLOSURE row: an ordinary denied claim re-files freely; a confirmation on a claim ⛔ closed is refused', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const mid = toMemberId(randomUUID());
      const cid = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, cid, mid, 'verifier_approved');
      // An ORDINARY refusal (the vote's deny — the projector moves the state; ⛔ a closures row).
      await voteOnFrozenClaim(client, {
        claimCaseId: cid, pariwarId: PARIWAR_A, outcome: 'denied', reasonCode: 'documents_insufficient',
        rationaleCiphertext: 'enc:v1:r', actorId: TRUSTEE, actorDisplay: 'PA', actor: 'trustee',
      });
      expect(await stateOf(tx, cid)).toBe('denied');
      expect(await readRefileRequiresConfirmation(tx, PARIWAR_A, mid)).toBe(false);
      expect((await tryConverge(client, intake(mid, 'member_app', 'f1'))).minted).toBe(true);
      await expect(
        recordRefileConfirmation(client, { pariwarId: PARIWAR_A, closedClaimCaseId: cid, via: 'helpline', actorId: 'op', actorDisplay: 'Op', noteCiphertext: 'x' }),
      ).rejects.toBeInstanceOf(RefileConfirmationRefusedError);
    });
  });

  // ── `-274` 2 — the closure letter ──────────────────────────────────────────────────────────────────────────
  describe('`-274` 2 — the closure letter', () => {
    it('⭐ ONE per person per closure (a second ⇒ already_recorded); ⛔ owed ⇒ not_owed; ⛔ before the closure date; the delivery; listed as owed until delivered', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client);
      await familyRow(tx, c, 'rejected_invalid_number');
      const l = await recordCorrectionLetter(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, personKey: c.person.personKey, postedOn: addCalendarDays(c.day0, 2),
        trackingNumberCiphertext: 'enc:v1:t', actorId: DA, actorDisplay: 'DA', crypto: ENC,
      });
      await recordCorrectionLetterDelivery(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, letterId: l.letterId, deliveredOn: addCalendarDays(c.day0, 4),
        screenshotStorageKey: 'k', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
      });
      await request(client, c);
      const closed = await approve(client, c);
      const closedOn = istDateOf(closed.closure.closedAt!);
      const record = (personKey: string, postedOn = closedOn) =>
        recordClosureLetter(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, personKey, postedOn, trackingNumberCiphertext: 'enc:v1:ct', actorId: DA, actorDisplay: 'DA' });
      await expect(record('claimant')).rejects.toMatchObject({ refusal: 'not_owed' });
      await expect(record(c.person.personKey, addCalendarDays(closedOn, -1))).rejects.toMatchObject({ refusal: 'posted_before_closure' });
      expect((await listClosureLettersOwed(tx, PARIWAR_A, closedOn)).find((i) => i.claimCaseId === c.cid)?.people).toEqual([
        { personKey: c.person.personKey, letter: null },
      ]);
      const letter = await record(c.person.personKey);
      await expect(record(c.person.personKey)).rejects.toBeInstanceOf(ClosureLetterRefusedError);
      await recordClosureLetterDelivery(client, {
        pariwarId: PARIWAR_A, claimCaseId: c.cid, letterId: letter.letterId, deliveredOn: addCalendarDays(closedOn, 3),
        screenshotStorageKey: 'k2', screenshotContentType: 'image/png', screenshotSizeBytes: 1, actorId: DA, actorDisplay: 'DA',
      });
      expect((await listClosureLettersOwed(tx, PARIWAR_A, closedOn)).some((i) => i.claimCaseId === c.cid)).toBe(false);
    });
  });

  // ── The read models (AC8c) ─────────────────────────────────────────────────────────────────────────────────
  describe('the read models — readiness, the Pariwar Admin\'s queue, the Super Admin\'s queue, the inbox, the highlight', () => {
    it('⭐ readiness reports the FIRST refusal (the writer\'s own checks) and `null` when a request would pass', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      expect(await readClosureReadiness(tx, PARIWAR_A, c.cid, c.day(10), { crypto: ENC })).toMatchObject({ blocker: 'too_early', familyRunDay: 10, state: null });
      expect(await readClosureReadiness(tx, PARIWAR_A, c.cid, c.day(95), { crypto: ENC })).toMatchObject({ blocker: null });
      await request(client, c);
      expect(await readClosureReadiness(tx, PARIWAR_A, c.cid, c.day(95), { crypto: ENC })).toMatchObject({ blocker: 'request_pending', state: 'requested' });
      const unreached = await returnedClaim(client);
      expect(await readClosureReadiness(tx, PARIWAR_A, unreached.cid, unreached.day(95), { crypto: ENC })).toMatchObject({
        blocker: 'not_reached',
        notReached: { count: 1, roles: ['nominee'] },
      });
    });

    it('⭐ the Pariwar Admin\'s queue lists a pending request (⛔ a lapsed one) and a live D27 record; the Super Admin\'s lists the held claim with its detail; the directee\'s inbox; the highlight', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const pending = await reachedClaim(client, tx);
      await request(client, pending);
      const lapsed = await reachedClaim(client, tx);
      await request(client, lapsed);
      await writeCorrectionMark(client, markInput(lapsed.cid, 'staff', lapsed.day(96)));
      const d27 = await returnedClaim(client);
      await recordNoCorrectionNeeded(client, {
        pariwarId: PARIWAR_A, claimCaseId: d27.cid, actorId: DA, actorDisplay: 'DA', now: d27.day(3),
        markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
      });
      const queue = await listPariwarClosureQueue(tx, PARIWAR_A, { limit: 200 });
      expect(queue.some((i) => i.claimCaseId === pending.cid && i.kind === 'closure_request')).toBe(true);
      expect(queue.some((i) => i.claimCaseId === lapsed.cid)).toBe(false);
      expect(queue.find((i) => i.claimCaseId === d27.cid)).toMatchObject({ kind: 'no_correction_needed', held: false });

      const esc = await reachedClaim(client, tx);
      await request(client, esc);
      await decline(client, esc);
      await recordClosureDirection(client, {
        pariwarId: PARIWAR_A, claimCaseId: esc.cid, actorId: SA, actorDisplay: 'SA', now: esc.day(98),
        directedToActor: DA, directedToRole: 'district_admin', kind: 'other', textCiphertext: 'enc:v1:d',
      });
      expect((await listEscalatedClosures(tx, PARIWAR_A, { limit: 200 })).find((i) => i.claimCaseId === esc.cid)).toMatchObject({
        origin: 'declined_closure',
        state: 'escalated',
        openDirections: 1,
      });
      const detail = await readEscalatedClosureDetail(tx, PARIWAR_A, esc.cid);
      expect(detail).toMatchObject({ resubmitted: false, familyPartDone: false, nameCheckState: 'passing' });
      expect(detail!.marks.map((m) => m.mustAct)).toEqual(['family']);
      expect(await readEscalatedClosureDetail(tx, PARIWAR_A, pending.cid)).toBeNull();
      expect((await listOpenDirectionsFor(tx, PARIWAR_A, DA)).some((d) => d.direction.claimCaseId === esc.cid && d.stillHeld)).toBe(true);

      // `-273` §7 — the highlight: approved despite a mismatch.
      await seedNomineeNameCheck(client, PARIWAR_A, esc.cid, { reuseAccounts: true, verdicts: ['matches', 'does_not_match'] });
      expect(await readApprovalNameHighlight(tx, PARIWAR_A, esc.cid)).toBeNull();
      await superAdmin(client, esc, 'approve', 'name_difference_accepted');
      expect(await readApprovalNameHighlight(tx, PARIWAR_A, esc.cid)).toBe('approved_despite_name_mismatch');
    });

    it('⭐ code review Decision 9 (2026-10-02) — the highlight\'s OTHER wording: approved with ⛔ no current passing check at all (never_checked)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const esc = await reachedClaim(client, tx);
      await request(client, esc);
      await decline(client, esc);
      await asSuperuser(client, async () => {
        await client.query("SET LOCAL session_replication_role = 'replica'");
        await client.query(`DELETE FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'`, [esc.cid]);
        await client.query("SET LOCAL session_replication_role = 'origin'");
      });
      expect(await readApprovalNameHighlight(tx, PARIWAR_A, esc.cid)).toBeNull();
      const a = await superAdmin(client, esc, 'approve', 'name_difference_accepted');
      expect(a).toMatchObject({ nameCheckWaived: true, approvalNameCheckState: 'never_checked' });
      expect(await readApprovalNameHighlight(tx, PARIWAR_A, esc.cid)).toBe('approved_without_passing_check');
    });

    it('⭐ code review (2026-10-03, second pass) — with TWO approved+waived rows, the NEWEST decides: a newer `passing` approval is ⛔ shadowed by an older mismatch', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const esc = await reachedClaim(client, tx);
      await request(client, esc);
      await decline(client, esc);
      await seedNomineeNameCheck(client, PARIWAR_A, esc.cid, { reuseAccounts: true, verdicts: ['matches', 'does_not_match'] });
      await superAdmin(client, esc, 'approve', 'name_difference_accepted');
      expect(await readApprovalNameHighlight(tx, PARIWAR_A, esc.cid)).toBe('approved_despite_name_mismatch');
      // A LATER approval of the same claim (a second return, approved+waived with the check `passing`) — built by
      // cloning the row: a new id, a new return (FK triggers off — the shape is what this read must handle).
      await asSuperuser(client, async () => {
        await client.query("SET LOCAL session_replication_role = 'replica'");
        await client.query(
          `CREATE TEMP TABLE closure_clone ON COMMIT DROP AS
             SELECT * FROM claim_correction_closures WHERE claim_case_id = $1 AND state = 'approved'`,
          [esc.cid],
        );
        await client.query(
          `UPDATE closure_clone SET closure_id = gen_random_uuid(), return_decision_id = gen_random_uuid(),
                  approval_name_check_state = 'passing', super_admin_decided_at = super_admin_decided_at + interval '1 minute'`,
        );
        await client.query('INSERT INTO claim_correction_closures SELECT * FROM closure_clone');
        await client.query('DROP TABLE closure_clone');
        await client.query("SET LOCAL session_replication_role = 'origin'");
      });
      expect(await readApprovalNameHighlight(tx, PARIWAR_A, esc.cid)).toBeNull();
    });
  });
});
