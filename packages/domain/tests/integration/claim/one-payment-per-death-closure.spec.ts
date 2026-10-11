// Story 6.28 — the other open claims of a PAID death are CLOSED (OP4) and an allowed suspicion appeal closes a voted,
// unpaid claim (OP13). Live DB (:5433). `2026-10-11-318` Q1 A / Q4 A, `2026-10-11-319`.
//
//   AC4 core — the closure walk skips `closed` claims BEFORE its cap (a death with 50+ closed claims still closes its open one).
//   AC4 H(i) — `closeClaimsOfPaidDeath` (the commit's / a stopped writer's own-tx entry): every other CLOSABLE open claim of
//         a paid death is `closed` (`death_already_finally_approved`, `held_by_claim_case_id` = the paid claim), its live
//         processes ended — ⛔ never a `denied` / under-appeal claim, ⛔ never one on which RF1 stands, ⛔ never a refile
//         RF5's wait still holds; idempotent; a claim that only passed the VOTE closes ⛔ nothing.
//   AC4 H(ii) — a plain filing for a paid death CONVERGES into it (OP11); with the paid claim overridden apart (or
//         `settled`), a new filing — tryConverge or the override — is `closed` IN the mint's transaction, ⛔ not when RF5's
//         wait holds it; the writer returns `closed`.
//   AC4 H(iii) — a `denied` claim of a paid death can still appeal; reversed (stage 1, stage 3, the Stage-2 panel), it ends
//         `closed` in the reversal's transaction and the writer returns `closed`.
//   AC6 — in a paid death an allowed SUSPICION appeal still closes a held third claim through RF6 (`suspicion_appeal_allowed`)
//         BEFORE H(iii) closes the reversed claim.
//   AC9 — path (a): X voted, S refused for another reason, revised ONTO `-239`, appealed, ALLOWED ⇒ X `closed`
//         (`suspicion_appeal_allowed`, held by S), its routing / R9 session ended, the commit ⛔ never commits it, S passes
//         OP2; with X already `approved` ⇒ X reported `notClosed`, S closed by H(iii) (Invariant 3's residual).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  assertNoOtherFinalApprovalForDeath,
  closeClaimsOfPaidDeath,
  commitCycleFreeze,
  getConvergenceCandidate,
  hasLiveRoutedRow,
  initiateAppeal,
  openR9VotingSession,
  overrideIntakeAttempt,
  readOpenCorrectionRun,
  reviseDecision,
  routeToR9,
  tryConverge,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { getLiveCorrectionReturn } from '../../../src/claim/state-trustee-decision-persist.js';
import { readLiveR9VotingSession } from '../../../src/claim/r9-voting-persist.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, CycleFreezeCommitId, IntakeAttemptId, MemberId, PariwarId } from '../../../src/ids/index.js';
import type * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClauseVersion, seedRoleGrant } from '../_helpers.js';
import { returnedClaim } from './_correction-closure-fixture.js';
import { claimAt, emitClaim } from './_one-payment-fixtures.js';
import {
  DA,
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

const PA = 'a7a7a7a7-0000-4000-8000-000000000002';
const TRUSTEE = 'f7f7f7f7-0000-4000-8000-000000000003';
const R9_CLAUSE = 'niy.special-death.r9';
const PANEL = ['b7b7b7b7-0000-4000-8000-000000000011', 'b7b7b7b7-0000-4000-8000-000000000012', 'b7b7b7b7-0000-4000-8000-000000000013'];

const intake = (pid: PariwarId, mid: MemberId, channel: schema.ClaimIntakeChannel) => ({
  pariwarId: pid,
  deceasedMemberId: mid,
  intakeChannel: channel,
  actor: 'member' as const,
  claimantActorId: null,
  trigger: 'test_intake',
  actorId: null,
  auditId: randomUUID(),
});

const paidClose = (client: Client, pid: PariwarId, mid: MemberId) =>
  closeClaimsOfPaidDeath(client, { pariwarId: pid, deceasedMemberId: mid, actor: 'system', actorId: TRUSTEE });

async function closedEventOf(client: Client, cid: ClaimId): Promise<Record<string, unknown> | undefined> {
  const { rows } = await client.query<{ payload: Record<string, unknown> }>(
    `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.closed'`,
    [cid],
  );
  expect(rows.length).toBeLessThanOrEqual(1);
  return rows[0]?.payload;
}

/** A FRESH Pariwar (the commit's candidate set is Pariwar-wide). */
async function freshScope(client: Client): Promise<PariwarId> {
  const pid = toPariwarId(randomUUID());
  await enterAppScope(client, pid);
  return pid;
}

describe.skipIf(!hasDatabase)('Story 6.28 — closed: the other claims of a paid death (OP4) + OP13 (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('AC4 — the core and H(i)\'s own-tx entry (`closeClaimsOfPaidDeath`)', () => {
    it('closes every other CLOSABLE open claim — `death_already_finally_approved`, held by the paid claim; ⛔ never a refusal, an under-appeal claim, an RF1 claim or an RF5-held refile; a legacy voted claim closes too (R1 narrowed)', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      const open = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      const voted = await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved');
      const refused = await claimAt(client, PARIWAR_A, mid, 'denied');
      const appealing = await claimAt(client, PARIWAR_A, mid, 'appeal_stage_1');
      const res = await paidClose(client, PARIWAR_A, mid);
      expect(res.paidClaimCaseId).toBe(x);
      expect([...res.closed].sort()).toEqual([open, voted].sort());
      expect([...res.held].sort()).toEqual([refused, appealing].sort());
      expect(res.notClosed).toEqual([]);
      for (const c of [open, voted]) {
        expect(await stateOf(client, c)).toBe('closed');
        expect(await closedEventOf(client, c)).toMatchObject({
          trigger: 'death_already_finally_approved', held_by_claim_case_id: x, deceased_member_id: mid, actor: 'system',
        });
      }
      expect(await stateOf(client, refused)).toBe('denied');
      expect(await stateOf(client, appealing)).toBe('appeal_stage_1');
      expect(await stateOf(client, x)).toBe('approved');
      // Idempotent — a second run finds ⛔ nothing open.
      expect((await paidClose(client, PARIWAR_A, mid)).closed).toEqual([]);
    });

    it('a claim on which RF1 stands, and the refile RF5\'s wait holds, are ⛔ never closed (FQ5 decides that pair)', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'settled');
      const s = await refusedClaim(client, PARIWAR_A, mid); // `-239`, standing, within its 90 days
      const r = await claimAt(client, PARIWAR_A, mid, 'verifier_review'); // held by RF5's wait
      const res = await paidClose(client, PARIWAR_A, mid);
      expect(res.closed).toEqual([]);
      expect([...res.held].sort()).toEqual([s, r].sort());
      expect(await stateOf(client, r)).toBe('verifier_review');
    });

    it('a claim that only PASSED THE VOTE closes ⛔ nothing (F15 — R9 can still refuse it)', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved');
      const open = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      expect(await paidClose(client, PARIWAR_A, mid)).toEqual({ paidClaimCaseId: null, closed: [], held: [], notClosed: [] });
      expect(await stateOf(client, open)).toBe('verifier_approved');
    });

    it('the closed claim\'s live processes END — its correction return is superseded and its run ended (⛔ no chase after `closed`)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'family' });
      expect(await getLiveCorrectionReturn(getTx().tx, PARIWAR_A, c.cid)).toBeTruthy();
      expect(await readOpenCorrectionRun(getTx().tx, PARIWAR_A, c.cid)).toBeTruthy();
      const x = await claimAt(client, PARIWAR_A, c.mid, 'approved', { bare: true });
      const res = await paidClose(client, PARIWAR_A, c.mid);
      expect(res).toMatchObject({ paidClaimCaseId: x, closed: [c.cid] });
      expect(await getLiveCorrectionReturn(getTx().tx, PARIWAR_A, c.cid)).toBeFalsy();
      expect(await readOpenCorrectionRun(getTx().tx, PARIWAR_A, c.cid)).toBeFalsy();
    });

    it('⭐ the walk skips `closed` claims BEFORE its cap — a death with 50+ closed claims still closes its open one', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      // 51 closed claims, all with LOWER ids than the open one (so a cap applied before the filter would miss it).
      for (let i = 0; i < 51; i += 1) {
        await claimAt(client, PARIWAR_A, mid, 'closed', { claimCaseId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` });
      }
      const open = await claimAt(client, PARIWAR_A, mid, 'verifier_review', { claimCaseId: 'fffffffe-0000-4000-8000-000000000001' });
      const res = await paidClose(client, PARIWAR_A, mid);
      expect(res).toMatchObject({ paidClaimCaseId: x, closed: [open] });
    });
  });

  describe('AC4 — H(ii): a new claim minted for a paid death is closed IN the mint', () => {
    it('a plain same-channel filing for a PAID (approved) death CONVERGES into the paid claim (OP11 — ⛔ no mint)', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      const out = await tryConverge(client, intake(PARIWAR_A, mid, 'member_app'));
      expect(out).toMatchObject({ claimCaseId: x, minted: false, state: 'approved' });
    });

    it('the paid claim OVERRIDDEN APART: the override\'s mint is closed (returns `closed`); a later filing mints and is closed too', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved'); // its channel: member_app
      const parked = await tryConverge(client, intake(PARIWAR_A, mid, 'helpline'));
      expect(parked).toMatchObject({ claimCaseId: x, convergencePending: true });
      const over = await overrideIntakeAttempt(client, {
        intakeAttemptId: parked.intakeAttemptId as IntakeAttemptId, pariwarId: PARIWAR_A, deceasedMemberId: mid, intakeChannel: 'helpline',
        againstClaimCaseId: x, reason: 'different family', actor: 'operator', claimantActorId: null, decidedByActor: DA, auditId: randomUUID(),
      });
      expect(over.state).toBe('closed');
      expect(await stateOf(client, over.newClaimCaseId)).toBe('closed');
      expect(await closedEventOf(client, toClaimId(over.newClaimCaseId))).toMatchObject({ trigger: 'death_already_finally_approved', held_by_claim_case_id: x });
      // X is excluded from convergence for ever ⇒ a later filing MINTS — and is closed at once.
      expect(await getConvergenceCandidate(tx, PARIWAR_A, mid, new Date(0))).toBeUndefined();
      const later = await tryConverge(client, intake(PARIWAR_A, mid, 'member_app'));
      expect(later).toMatchObject({ minted: true, state: 'closed' });
      expect(await stateOf(client, later.claimCaseId)).toBe('closed');
    });

    it('a `settled` death (terminal — never a candidate): a filing mints and is closed', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'settled');
      const out = await tryConverge(client, intake(PARIWAR_A, mid, 'helpline'));
      expect(out).toMatchObject({ minted: true, state: 'closed' });
    });

    it('⛔ not when RF5\'s wait holds the new claim (OP4 (d))', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'settled');
      await refusedClaim(client, PARIWAR_A, mid); // `-239`, standing, ⛔ not appealed, within 90 days
      const out = await tryConverge(client, intake(PARIWAR_A, mid, 'helpline'));
      expect(out).toMatchObject({ minted: true, state: 'intake_converged' });
    });

    it('a filing for a death with ⛔ no payment committed mints OPEN, as today', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'denied');
      const out = await tryConverge(client, intake(PARIWAR_A, mid, 'helpline'));
      expect(out).toMatchObject({ minted: true, state: 'intake_converged' });
    });
  });

  describe('AC4 — H(iii): a refusal of a paid death keeps its appeal; reversed, it is closed', () => {
    it('stage 1 — `denied` can still initiate; reversed ⇒ `closed` in the reversal\'s tx; the writer returns `closed`', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      const y = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, y);
      expect(await stateOf(client, y)).toBe('appeal_stage_1');
      const out = await reverseAtStage1(client, PARIWAR_A, y);
      expect(out.claimState).toBe('closed');
      expect(await stateOf(client, y)).toBe('closed');
      expect(await closedEventOf(client, y)).toMatchObject({ trigger: 'death_already_finally_approved', held_by_claim_case_id: x });
    });

    it('stage 3 and the Stage-2 panel reversals close too', async () => {
      const { client } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'approved');
      const y3 = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, y3);
      await toStage2(client, PARIWAR_A, y3);
      await panelDecides(client, PARIWAR_A, y3, panel, 'deny');
      expect((await stage3(client, PARIWAR_A, y3, 'reversed')).claimState).toBe('closed');
      const y2 = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, y2);
      await toStage2(client, PARIWAR_A, y2);
      expect((await panelDecides(client, PARIWAR_A, y2, panel, 'reverse')).claimState).toBe('closed');
    });

    it('a reversal in a death with ⛔ no payment committed stays `reversed`', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved');
      const y = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      await openAppeal(client, PARIWAR_A, y);
      expect((await reverseAtStage1(client, PARIWAR_A, y)).claimState).toBe('reversed');
    });

    it('AC6 — a paid death\'s allowed SUSPICION appeal: RF6 closes the held third claim (`suspicion_appeal_allowed`) FIRST, then H(iii) closes S; X is reported, ⛔ not moved', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await openAppeal(client, PARIWAR_A, s);
      const r = await claimAt(client, PARIWAR_A, mid, 'verifier_review'); // held by RF5
      const out = await reverseAtStage1(client, PARIWAR_A, s);
      expect(out.heldClaims).toEqual({ applied: true, closed: [r], notClosed: [{ claimCaseId: x, state: 'approved' }] });
      expect(await closedEventOf(client, r)).toMatchObject({ trigger: 'suspicion_appeal_allowed', held_by_claim_case_id: s });
      expect(out.claimState).toBe('closed');
      expect(await closedEventOf(client, s)).toMatchObject({ trigger: 'death_already_finally_approved', held_by_claim_case_id: x });
      expect(await stateOf(client, x)).toBe('approved');
    });
  });

  describe('AC9 — OP13: the suspicion appeal closes a voted, UNPAID claim (path (a))', () => {
    async function seedR9(client: Client, pid: PariwarId): Promise<void> {
      await client.query('RESET ROLE');
      await seedClauseVersion(getTx().tx, pid, {
        clauseId: R9_CLAUSE,
        payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
      });
      for (const uid of PANEL) await seedRoleGrant(getTx().tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
      await enterAppScope(client, pid);
    }
    const reviseOnto = (client: Client, pid: PariwarId, cid: ClaimId) =>
      reviseDecision(client, {
        claimCaseId: cid, pariwarId: pid, outcome: 'denied', reasonCode: 'post_death_nominee_change', rationaleCiphertext: 'enc:v1:revised',
        actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      });

    it('X voted (and routed to R9 with a live session); S revised ONTO `-239`, appealed, ALLOWED ⇒ X `closed`, its routing + session ended, ⛔ never committed; S passes OP2', async () => {
      const { client, tx } = getTx();
      const pid = await freshScope(client);
      await seedR9(client, pid);
      const mid = toMemberId(randomUUID());
      // S — refused for ANOTHER reason (its determination seeded first — the `-239` revision's grounding needs it).
      const s = await refusedClaim(client, pid, mid, { reason: 'other', ground: true });
      const x = await claimAt(client, pid, mid, 'verifier_approved');
      expect((await voteOnFrozenClaim(client, {
        claimCaseId: x, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      })).claimState).toBe('state_trustee_approved');
      await routeToR9(client, { claimCaseId: x, pariwarId: pid, reasonCode: 'r9_special_case', rationaleCiphertext: null, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
      await openR9VotingSession(client, { claimCaseId: x, pariwarId: pid, clauseId: R9_CLAUSE, panelActorIds: PANEL, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
      // … then, AFTER X's vote, revised ONTO `-239` (path (a)).
      await reviseOnto(client, pid, s);
      await initiateAppeal(client, { claimCaseId: s, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
      const out = await reverseAtStage1(client, pid, s);
      expect(out.heldClaims).toEqual({ applied: true, closed: [x], notClosed: [] });
      expect(out.claimState).toBe('reversed');
      expect(await stateOf(client, x)).toBe('closed');
      expect(await closedEventOf(client, x)).toMatchObject({ trigger: 'suspicion_appeal_allowed', held_by_claim_case_id: s });
      expect(await hasLiveRoutedRow(tx, pid, x)).toBe(false);
      expect(await readLiveR9VotingSession(tx, pid, x)).toBeFalsy();
      const commit = await commitCycleFreeze(client, {
        pariwarId: pid, commitId: randomUUID() as unknown as CycleFreezeCommitId, actorId: TRUSTEE, actorDisplay: 'Trustee One', actor: 'trustee',
      });
      expect(commit.committedClaimIds).not.toContain(x);
      await expect(assertNoOtherFinalApprovalForDeath(tx, pid, s, mid)).resolves.toBeUndefined();
    });

    it('the same with X already `approved` ⇒ X reported `notClosed`; S is CLOSED by H(iii) (Invariant 3\'s after-payment residual — Q2 A)', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other', ground: true });
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      await reviseOnto(client, PARIWAR_A, s);
      await openAppeal(client, PARIWAR_A, s);
      const out = await reverseAtStage1(client, PARIWAR_A, s);
      expect(out.heldClaims).toEqual({ applied: true, closed: [], notClosed: [{ claimCaseId: x, state: 'approved' }] });
      expect(out.claimState).toBe('closed');
      expect(await closedEventOf(client, s)).toMatchObject({ trigger: 'death_already_finally_approved', held_by_claim_case_id: x });
      void emitClaim;
    });
  });
});
