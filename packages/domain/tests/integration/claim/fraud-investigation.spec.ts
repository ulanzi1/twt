// Story 6.22 — the fraud register's investigation: the flag, the finding, the release and the close. Live DB.
//
//   AC2 — the leaf is blind to guilt (named for the Panel's Q1 — a ruling of A flips it visibly); `listStandingDeathReports`
//         lists exactly what `isDeathReportStanding` counts.
//   AC3 — the flag (any state, once; a same-id replay; ⛔ state change) and the Q7-named leg: a flagged claim with ⛔ finding
//         still passes BOTH approval gates (the built side C).
//   AC4 (domain half) — innocent ⇒ the finding, the release annotation, `claim.closed` (`fraud_finding_innocent`, ⛔ held_by),
//         the found step, in one transaction; the member unlocked unless another claim stands (listed in the result); an
//         `approved` claim is ⛔ closed (`committed`) and its overlay stays ON.
//   AC5 — the closure core runs: an appeal-stage claim's open journey is closed with it.
//   AC7 (domain half) — guilty ⇒ `member_found_guilty` + its annotation (carrying `deceased_member_id`), closed
//         `fraud_finding_guilty`, the leaf still TRUE and the account still frozen.
//   AC8 — a same-step retry replays (same version, ⛔ new event); a different finding id on a found claim is refused; a planted
//         primary-key collision surfaces as 23505 (⛔ "duplicate") — for BOTH member-finding writers.
//   AC9 — OP10: a claim held by a claim later fraud-closed reads `closed_member_alive`; the defensive trigger guard; a sibling's
//         OP10 behaviour unchanged; the `-291` Q2 B closure text ⛔ selects a fraud close.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  FraudInvestigationRefusedError,
  assertClaimApprovable,
  flagClaimForFraudInvestigation,
  isDeathReportStanding,
  isNomineeDeclarationLocked,
  listOpenFraudInvestigations,
  listStandingDeathReports,
  lockAndReadDeathReport,
  readClosedHolderRefusedBulk,
  readClosedMemberAliveBulk,
  recordFraudFinding,
  recordMemberGuiltFinding,
  recordMemberInnocenceFinding,
  selectDueSuspicionNotices,
  type FraudFindingOutcome,
  type RecordFraudFindingInput,
} from '../../../src/claim/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimId as toClaimId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  type ClaimId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { getMemberAccountOverlay } from '../../../src/member/overlay.js';
import { resolveRtbfLegality } from '../../../src/member/rtbf-legality.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope, seedNomineeNameCheck } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';
import { openAppeal, refusedClaim, reverseAtStage1, stateOf } from './_suspicion-refusal-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const OPERATOR = 'a6a6a6a6-0000-4000-8000-000000000001';
const DA = 'd6d6d6d6-0000-4000-8000-000000000002';
const PID = PARIWAR_A as PariwarId;

const flag = (client: Client, cid: ClaimId, over: Partial<Parameters<typeof flagClaimForFraudInvestigation>[1]> = {}) =>
  flagClaimForFraudInvestigation(client, {
    claimCaseId: cid,
    pariwarId: PID,
    stepId: toStepId(randomUUID()),
    noteCiphertext: 'enc:v1:flag-note',
    actorId: OPERATOR,
    actorDisplay: 'Helpline Operator',
    actor: 'operator',
    ...over,
  });

const findInput = (cid: ClaimId, outcome: FraudFindingOutcome, over: Partial<RecordFraudFindingInput> = {}): RecordFraudFindingInput => ({
  claimCaseId: cid,
  pariwarId: PID,
  outcome,
  aliveConfirmation: 'in_person',
  stepId: toStepId(randomUUID()),
  findingId: toFindingId(randomUUID()),
  noteCiphertext: 'enc:v1:finding-note',
  actorId: DA,
  actorDisplay: 'District Admin',
  actor: 'operator',
  ...over,
});

const find = (client: Client, cid: ClaimId, outcome: FraudFindingOutcome, over: Partial<RecordFraudFindingInput> = {}) =>
  recordFraudFinding(client, findInput(cid, outcome, over));

/** A fresh member's claim in `verifier_review`, through real events (the intake freezes the overlay). */
async function openClaim(client: Client, mid: string = randomUUID()): Promise<{ cid: ClaimId; mid: string }> {
  const cid = toClaimId(randomUUID());
  await driveClaimTo(client, PID, cid, mid, 'verifier_review');
  return { cid, mid };
}

async function eventsOf(client: Client, cid: string): Promise<{ type: string; payload: Record<string, unknown>; version: number }[]> {
  const { rows } = await client.query<{ t: string; p: Record<string, unknown>; v: string }>(
    'SELECT event_type AS t, payload AS p, event_version AS v FROM events_log WHERE stream_id = $1 ORDER BY event_version',
    [cid],
  );
  return rows.map((r) => ({ type: r.t, payload: r.p, version: Number(r.v) }));
}

async function stepsOf(client: Client, cid: string): Promise<{ step: string; alive: string | null; finding: string | null }[]> {
  const { rows } = await client.query<{ step: string; alive: string | null; finding: string | null }>(
    'SELECT step, alive_confirmation AS alive, finding_id::text AS finding FROM claim_fraud_investigation_steps WHERE claim_case_id = $1 ORDER BY acted_at, step',
    [cid],
  );
  return rows;
}

const frozen = async (client: Client, mid: string) => (await getMemberAccountOverlay(getTx().tx, toMemberId(mid), new Date())).accountFrozen;

async function refusal(promise: Promise<unknown>): Promise<string | undefined> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  return err instanceof FraudInvestigationRefusedError ? err.reason : `not a refusal: ${String(err)}`;
}

describe.skipIf(!hasDatabase)('Story 6.22 — the fraud investigation: flag, finding, release, close (live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('AC3 — the flag', () => {
    it('writes the step + `claim.fraud_flagged`, changes ⛔ state; the same step id REPLAYS; a different one is `already_flagged`', async () => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const { cid } = await openClaim(client);
      const stepId = toStepId(randomUUID());
      const first = await flag(client, cid, { stepId });
      expect(first).toMatchObject({ stepId, claimState: 'verifier_review', replayed: false });
      expect(await stateOf(client, cid)).toBe('verifier_review');
      const flagged = (await eventsOf(client, cid)).filter((e) => e.type === 'claim.fraud_flagged');
      expect(flagged).toHaveLength(1);
      expect(flagged[0]!.payload).toMatchObject({ step_id: stepId, from_state: 'verifier_review', to_state: 'verifier_review' });
      expect(JSON.stringify(flagged[0]!.payload)).not.toContain('flag-note');

      const again = await flag(client, cid, { stepId: toStepId(stepId.toUpperCase()) });
      expect(again).toMatchObject({ stepId, replayed: true, eventVersion: first.eventVersion });
      expect((await eventsOf(client, cid)).filter((e) => e.type === 'claim.fraud_flagged')).toHaveLength(1);
      expect(await refusal(flag(client, cid))).toBe('already_flagged');
    });

    it.each(['denied', 'settled', 'closed'] as const)('a claim in `%s` can be flagged (any state)', async (state) => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const cid = await claimAt(client, PID, randomUUID(), state);
      expect((await flag(client, cid)).claimState).toBe(state);
    });

    it('a flag with ⛔ note or ⛔ display name is refused; an unknown claim is `claim_not_found`', async () => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const { cid } = await openClaim(client);
      expect(await refusal(flag(client, cid, { noteCiphertext: ' ' }))).toBe('missing_note');
      expect(await refusal(flag(client, cid, { actorDisplay: '' }))).toBe('missing_display');
      expect(await refusal(flag(client, toClaimId(randomUUID())))).toBe('claim_not_found');
    });

    it('⭐ PQ7 (built C) — a FLAGGED claim with ⛔ finding still passes BOTH approval gates (a ruling of A or B flips this)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const atReview = toClaimId(randomUUID());
      await driveClaimTo(client, PID, atReview, mid, 'verifier_review');
      await seedNomineeNameCheck(client, PID, atReview, { inspection: 'completed' });
      await flag(client, atReview);
      await expect(
        assertClaimApprovable(tx, PID, atReview, toMemberId(mid), { approvingActorIds: [DA], step: 'district_admin' }),
      ).resolves.toBeUndefined();

      const mid2 = randomUUID();
      const atApproved = toClaimId(randomUUID());
      await driveClaimTo(client, PID, atApproved, mid2, 'verifier_approved');
      await seedNomineeNameCheck(client, PID, atApproved, { inspection: 'completed' });
      await flag(client, atApproved);
      await expect(
        assertClaimApprovable(tx, PID, atApproved, toMemberId(mid2), { approvingActorIds: [DA], step: 'final' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('the chain (N1)', () => {
    it('un-flagged ⇒ `not_flagged`; the flagger ⇒ `finder_is_flagger` (any case); a second finding ⇒ `already_found`; ⛔ proof of life ⇒ refused', async () => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const { cid } = await openClaim(client);
      expect(await refusal(find(client, cid, 'innocent'))).toBe('not_flagged');
      await flag(client, cid);
      expect(await refusal(find(client, cid, 'innocent', { actorId: OPERATOR.toUpperCase() }))).toBe('finder_is_flagger');
      expect(await refusal(find(client, cid, 'innocent', { aliveConfirmation: 'phone_call' as never }))).toBe('missing_alive_confirmation');
      expect(await refusal(find(client, cid, 'innocent', { noteCiphertext: '' }))).toBe('missing_note');
      await find(client, cid, 'innocent');
      expect(await refusal(find(client, cid, 'innocent'))).toBe('already_found');
      expect(await refusal(find(client, cid, 'guilty'))).toBe('already_found');
    });

    it('RA10 — an UNKNOWN outcome is refused BEFORE any write: ⛔ it takes the guilty writer, ⛔ a finding row, ⛔ an event', async () => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const { cid } = await openClaim(client);
      await flag(client, cid);
      const before = (await eventsOf(client, cid)).length;
      await expect(find(client, cid, 'maybe' as never)).rejects.toThrow(/unknown outcome maybe/);
      await expect(find(client, cid, undefined as never)).rejects.toThrow(/unknown outcome undefined/);
      expect((await eventsOf(client, cid)).length).toBe(before);
      const { rows } = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM claim_nominee_findings WHERE claim_case_id = $1', [cid]);
      expect(rows[0]!.n).toBe(0);
      expect(await stepsOf(client, cid)).toEqual([{ step: 'flagged', alive: null, finding: null }]);
    });

    it('RA11 — a step id already used on ANOTHER claim is `step_conflict` (⛔ a raw 23505) for the flag AND the finding', async () => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const one = await openClaim(client);
      const two = await openClaim(client);
      const stepId = toStepId(randomUUID());
      await flag(client, one.cid, { stepId });

      // The flag: the replay lookup is per claim, so only the insert meets the global primary key. The failing insert aborts the
      // statement's transaction state, so each leg runs under a SAVEPOINT the CALLER rolls back to (exactly what the API's scope
      // transaction does for any refusal).
      // ⚠ (code review PD8) What this test pins is the MAPPED REASON for both writers, and the control below. It does ⛔ prove that nothing
      // partial survives: the finding row and the annotation event are written BEFORE the step insert collides, but `ROLLBACK TO SAVEPOINT`
      // removes them whether or not the error was mapped, so an assertion on their absence AFTER the rollback holds with the fix deleted.
      // That the failed call leaves nothing behind is the caller's rollback, not this writer's code — and is not separately tested here.
      await client.query('SAVEPOINT collide_flag');
      expect(await refusal(flag(client, two.cid, { stepId }))).toBe('step_conflict');
      await client.query('ROLLBACK TO SAVEPOINT collide_flag');

      // The finding collides the same way (its step insert is step 5, after the member-finding row and annotation, before the close).
      await flag(client, two.cid);
      await client.query('SAVEPOINT collide_find');
      expect(await refusal(find(client, two.cid, 'innocent', { stepId }))).toBe('step_conflict');
      await client.query('ROLLBACK TO SAVEPOINT collide_find');

      // The CONTROL: the same claim with a fresh step id is accepted — so the refusals above were the collision, ⛔ a broken claim.
      expect((await find(client, two.cid, 'innocent')).close).toEqual({ closed: true });
    });
  });

  describe('AC4 — innocent: released and closed', () => {
    it('ONE transaction: the finding, the release annotation, `claim.closed` (`fraud_finding_innocent`, ⛔ held_by), the step; the member released; the overlay OFF', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const { cid, mid } = await openClaim(client);
      await flag(client, cid);
      expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(true);
      expect(await frozen(client, mid)).toBe(true);
      const findingId = toFindingId(randomUUID());
      const out = await find(client, cid, 'innocent', { findingId, aliveConfirmation: 'video_call' });

      expect(out).toMatchObject({ outcome: 'innocent', close: { closed: true }, otherStandingClaims: [], replayed: false });
      expect(await stateOf(client, cid)).toBe('closed');
      const events = await eventsOf(client, cid);
      const types = events.map((e) => e.type);
      expect(types.slice(-2)).toEqual(['claim.nominee_lock_released', 'claim.closed']);
      const closed = events.at(-1)!;
      expect(closed.payload).toMatchObject({ trigger: 'fraud_finding_innocent', finding_id: findingId, deceased_member_id: mid });
      expect(closed.payload).not.toHaveProperty('held_by_claim_case_id');
      expect(out.eventVersion).toBe(closed.version);
      for (const e of events) expect(JSON.stringify(e.payload)).not.toMatch(/finding-note|flag-note/);
      expect(await stepsOf(client, cid)).toEqual([
        { step: 'flagged', alive: null, finding: null },
        { step: 'found_innocent', alive: 'video_call', finding: findingId },
      ]);
      expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(false);
      expect(await frozen(client, mid)).toBe(false);
    });

    it('a SECOND standing claim keeps the member locked, the overlay ON, and is LISTED in the result', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const { cid, mid } = await openClaim(client);
      const { cid: second } = await openClaim(client, mid);
      await flag(client, cid);
      const out = await find(client, cid, 'innocent');
      expect(out.otherStandingClaims.map((c) => c.claimCaseId)).toEqual([second]);
      expect(out.otherStandingClaims[0]).toMatchObject({ currentState: 'verifier_review' });
      expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(true);
      expect(await frozen(client, mid)).toBe(true);
    });

    it('an `approved` claim: the finding and the release stand, the claim is ⛔ closed (`committed`), the overlay stays ON', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const cid = await claimAt(client, PID, mid, 'approved');
      await flag(client, cid);
      const out = await find(client, cid, 'innocent');
      expect(out.close).toEqual({ closed: false, reason: 'committed' });
      expect(await stateOf(client, cid)).toBe('approved');
      const last = (await eventsOf(client, cid)).at(-1)!;
      expect(last.type).toBe('claim.nominee_lock_released');
      expect(out.eventVersion).toBe(last.version);
      expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(false);
      expect(await frozen(client, mid)).toBe(true);
    });

    it('a claim ALREADY `closed` keeps its state — the finding is recorded (`already_closed`)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const cid = await claimAt(client, PID, randomUUID(), 'closed');
      await flag(client, cid);
      expect((await find(client, cid, 'innocent')).close).toEqual({ closed: false, reason: 'already_closed' });
      expect((await eventsOf(client, cid)).filter((e) => e.type === 'claim.closed')).toHaveLength(1);
    });
  });

  describe('AC5 — the closure core runs', () => {
    it('a claim under appeal (an OPEN journey) is closed and its journey closed with it', async () => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const cid = await refusedClaim(client, PID, mid, { reason: 'other' });
      await openAppeal(client, PID, cid);
      expect(await stateOf(client, cid)).toBe('appeal_stage_1');
      await flag(client, cid);
      expect((await find(client, cid, 'innocent')).close).toEqual({ closed: true });
      expect(await stateOf(client, cid)).toBe('closed');
      const { rows } = await client.query<{ status: string }>('SELECT status FROM claim_appeals WHERE claim_case_id = $1', [cid]);
      expect(rows.map((r) => r.status)).toEqual(['closed']);
    });
  });

  describe('AC7 (domain) — guilty', () => {
    it('⭐ PQ1 (built B) — `member_found_guilty` + its annotation, closed `fraud_finding_guilty`; the leaf STILL stands and the account STAYS frozen', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const { cid, mid } = await openClaim(client);
      await flag(client, cid);
      const findingId = toFindingId(randomUUID());
      const out = await find(client, cid, 'guilty', { findingId, aliveConfirmation: 'ground_inspection' });
      expect(out).toMatchObject({ outcome: 'guilty', close: { closed: true } });
      const { rows } = await client.query<{ kind: string }>('SELECT kind FROM claim_nominee_findings WHERE claim_case_id = $1', [cid]);
      expect(rows.map((r) => r.kind)).toEqual(['member_found_guilty']);
      const events = await eventsOf(client, cid);
      expect(events.slice(-2).map((e) => e.type)).toEqual(['claim.member_found_guilty', 'claim.closed']);
      expect(events.at(-2)!.payload).toMatchObject({ finding_id: findingId, deceased_member_id: mid });
      expect(events.at(-1)!.payload).toMatchObject({ trigger: 'fraud_finding_guilty', finding_id: findingId });
      expect(await stateOf(client, cid)).toBe('closed');
      // PQ1 — a ruling of A flips both of these to false.
      expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(true);
      expect(await frozen(client, mid)).toBe(true);
    });

    it('⭐ RA13 / AC2 — the leaf\'s CONSUMERS for a member found GUILTY: erasure is `death_reported`, the nominee declaration is locked, the withdrawal / Life Events gate reads "reported" — and for an INNOCENT member every one releases (the control)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const innocent = await openClaim(client);
      const guilty = await openClaim(client);
      await flag(client, innocent.cid);
      await flag(client, guilty.cid);
      // The three DOMAIN gates every consumer calls: the erasure resolver (`resolveRtbfLegality` — `rtbf.death_reported`), the
      // nominee-declaration lock (6.20), and the lock-then-read the withdrawal and Life Events handlers take. A `withdrawn`
      // member is the erasure resolver's input here: a standing report refuses it BEFORE its legal `withdrawn` route.
      const gates = async (mid: string) => ({
        erasure: (await resolveRtbfLegality(tx, PID, toMemberId(mid), 'withdrawn')).kind,
        nomineeDeclarationLocked: await isNomineeDeclarationLocked(tx, PID, toMemberId(mid)),
        withdrawalAndLifeEventsGateReadsReported: await lockAndReadDeathReport(client, PID, toMemberId(mid)),
      });
      const reported = { erasure: 'death_reported', nomineeDeclarationLocked: true, withdrawalAndLifeEventsGateReadsReported: true };
      expect(await gates(innocent.mid)).toEqual(reported); // before any finding both members are locked — the control's starting point
      expect(await gates(guilty.mid)).toEqual(reported);

      await find(client, innocent.cid, 'innocent');
      await find(client, guilty.cid, 'guilty');
      expect(await gates(innocent.mid)).toEqual({ erasure: 'legal', nomineeDeclarationLocked: false, withdrawalAndLifeEventsGateReadsReported: false });
      // PQ1 (built B) — a ruling of A flips this to the innocent row.
      expect(await gates(guilty.mid)).toEqual(reported);
    });
  });

  describe('AC8 — idempotence and targeted conflicts', () => {
    it.each(['innocent', 'guilty'] as const)('%s: the same step id REPLAYS (same version, ⛔ new event); a new step + finding id is `already_found`', async (outcome) => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const { cid } = await openClaim(client);
      await flag(client, cid);
      const input = findInput(cid, outcome);
      const first = await recordFraudFinding(client, input);
      const before = (await eventsOf(client, cid)).length;
      const again = await recordFraudFinding(client, { ...input, stepId: toStepId(input.stepId.toUpperCase() as never) });
      expect(again).toMatchObject({ replayed: true, eventVersion: first.eventVersion, close: first.close, findingId: input.findingId });
      expect((await eventsOf(client, cid)).length).toBe(before);
      expect(await refusal(find(client, cid, outcome))).toBe('already_found');
      // The same step id with the OTHER outcome is a different step — ⛔ a replay.
      expect(await refusal(recordFraudFinding(client, { ...input, outcome: outcome === 'innocent' ? 'guilty' : 'innocent' }))).toBe('step_conflict');
    });

    it.each([
      ['recordMemberInnocenceFinding', recordMemberInnocenceFinding],
      ['recordMemberGuiltFinding', recordMemberGuiltFinding],
    ] as const)('%s: a same-id retry replays; a different id is `duplicate`; a planted PRIMARY-KEY collision is 23505 (⛔ "duplicate")', async (_name, write) => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const { cid } = await openClaim(client);
      const { cid: other } = await openClaim(client);
      const findingId = toFindingId(randomUUID());
      const base = { pariwarId: PID, actorId: DA, actorDisplay: 'District Admin', actor: 'operator' as const };
      const first = await write(client, { ...base, claimCaseId: cid, findingId });
      expect(first.replayed).toBe(false);
      const again = await write(client, { ...base, claimCaseId: cid, findingId });
      expect(again).toEqual({ eventVersion: first.eventVersion, replayed: true });
      await expect(write(client, { ...base, claimCaseId: cid, findingId: toFindingId(randomUUID()) })).rejects.toMatchObject({ reason: 'duplicate' });
      await client.query('SAVEPOINT pk');
      const err = await write(client, { ...base, claimCaseId: other, findingId }).then(
        () => undefined,
        (e: unknown) => e as { code?: string; cause?: { code?: string }; reason?: string },
      );
      await client.query('ROLLBACK TO SAVEPOINT pk');
      expect(err?.reason).toBeUndefined();
      expect(err?.code ?? err?.cause?.code).toBe('23505');
    });
  });

  describe('RA12 — a member finding recorded OUTSIDE the investigation (the writer\'s `duplicate` and `replayed` branches)', () => {
    it('a DIFFERENT finding id ⇒ `already_found`; the SAME finding id ⇒ `already_found`; ⛔ found step, ⛔ close, ⛔ new event — and the claim STAYS on the work-list', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const { cid } = await openClaim(client);
      await flag(client, cid);
      // The low-level writer called DIRECTLY — what a seeded row or a future second caller would do. It has ONE production
      // caller today (`recordFraudFinding`), so this state is not reachable through the API; it is pinned, not endorsed.
      const outside = toFindingId(randomUUID());
      await recordMemberInnocenceFinding(client, { claimCaseId: cid, pariwarId: PID, findingId: outside, actorId: DA, actorDisplay: 'District Admin', actor: 'operator' });
      const before = (await eventsOf(client, cid)).length;

      expect(await refusal(find(client, cid, 'innocent'))).toBe('already_found'); // another finding id: the inner writer's `duplicate`
      expect(await refusal(find(client, cid, 'innocent', { findingId: outside }))).toBe('already_found'); // the same id: its replay

      expect(await stepsOf(client, cid)).toEqual([{ step: 'flagged', alive: null, finding: null }]);
      expect(await stateOf(client, cid)).toBe('verifier_review');
      expect((await eventsOf(client, cid)).length).toBe(before);
      // The residual, pinned: nothing can close this investigation through the finding writer, so it stays listed.
      expect((await listOpenFraudInvestigations(tx, PID, { isVisible: () => true })).map((r) => r.claimCaseId)).toContain(cid);
    });
  });

  describe('AC2 — the leaf and its list', () => {
    it('`listStandingDeathReports` lists exactly what `isDeathReportStanding` counts (a released claim dropped; ANY other state kept)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const released = (await openClaim(client, mid)).cid;
      const denied = await claimAt(client, PID, mid, 'denied');
      const settled = await claimAt(client, PID, mid, 'settled', { bare: true });
      await flag(client, released);
      await find(client, released, 'innocent');
      const listed = (await listStandingDeathReports(tx, PID, toMemberId(mid))).map((r) => r.claimCaseId).sort();
      expect(listed).toEqual([denied, settled].sort());
      expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(listed.length > 0);
      expect((await listStandingDeathReports(tx, PID, toMemberId(mid), { excludeClaimCaseId: denied })).map((r) => r.claimCaseId)).toEqual([settled]);
    });
  });

  describe('AC9 — OP10 and the close trigger', () => {
    it('⭐ a claim R closed `held_by` a claim C that is LATER fraud-closed reads `closed_member_alive` (the holder leg)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const c = await refusedClaim(client, PID, mid);
      await openAppeal(client, PID, c);
      const r = await claimAt(client, PID, mid, 'verifier_review');
      await reverseAtStage1(client, PID, c); // RF6 closes R `suspicion_appeal_allowed`, held by C
      expect(await stateOf(client, r)).toBe('closed');
      expect(await readClosedMemberAliveBulk(tx, PID, [r])).toEqual(new Set());
      await flag(client, c);
      await find(client, c, 'innocent');
      expect(await stateOf(client, c)).toBe('closed');
      expect(await readClosedMemberAliveBulk(tx, PID, [r, c])).toEqual(new Set([r, c]));
      // OP10's own read still says "held by a refused/closed claim" — the API lets `closed_member_alive` WIN (DL10 (iii)).
      expect(await readClosedHolderRefusedBulk(tx, PID, [r])).toEqual(new Set([r]));
    });

    // ⭐ The SAME raw payload shape twice (RA9): with a HELD trigger the claim IS labelled holder-refused — the control, which
    // proves the raw insert and the forced `closed` state really reach OP10's join — and with a FRAUD trigger it is NOT. Only
    // the trigger differs, so the second result is the guard, ⛔ a claim that never reached the join.
    it.each([
      ['a HELD trigger (the control) — IS labelled holder-refused', 'suspicion_appeal_allowed', true],
      ['a FRAUD trigger AND a `held_by` — is ⛔ labelled holder-refused (the defensive guard)', 'fraud_finding_innocent', false],
    ] as const)('the defensive guard — a raw `claim.closed` carrying %s', async (_label, trigger, labelled) => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const holder = await claimAt(client, PID, mid, 'denied');
      const x = toClaimId(randomUUID());
      await driveClaimTo(client, PID, x, mid, 'verifier_review');
      // Raw insert past the schema (the projector would refuse the fraud payload) — the only way to prove the guard.
      const inserted = await client.query(
        `INSERT INTO events_log (stream_id, pariwar_id, event_type, payload, event_version)
         SELECT $1, $2, 'claim.closed', $3::jsonb, max(event_version) + 1 FROM events_log WHERE stream_id = $1`,
        [x, PID, JSON.stringify({ from_state: 'verifier_review', to_state: 'closed', trigger, actor: 'system', held_by_claim_case_id: holder, deceased_member_id: mid })],
      );
      expect(inserted.rowCount).toBe(1);
      await client.query('RESET ROLE');
      await client.query("SET LOCAL app.claim_state_writer = 'on'");
      const forced = await client.query("UPDATE claims SET current_state = 'closed' WHERE claim_case_id = $1", [x]);
      expect(forced.rowCount).toBe(1); // the claim really is `closed` — else an empty result below proves nothing
      await enterAppScope(client, PID);
      expect(await readClosedHolderRefusedBulk(tx, PID, [x])).toEqual(labelled ? new Set([x]) : new Set());
    });

    it('a sibling claim of the same death keeps its OP10 behaviour; the `-291` Q2 B closure text ⛔ selects a fraud close', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const c = await refusedClaim(client, PID, mid);
      await openAppeal(client, PID, c);
      const r = await claimAt(client, PID, mid, 'verifier_review');
      await reverseAtStage1(client, PID, c);
      const before = await readClosedHolderRefusedBulk(tx, PID, [r]);
      const { cid: fraudClosed } = await openClaim(client, randomUUID());
      await flag(client, fraudClosed);
      await find(client, fraudClosed, 'innocent');
      expect(await readClosedHolderRefusedBulk(tx, PID, [r])).toEqual(before);
      const page = await selectDueSuspicionNotices(client, { purpose: 'closed_after_appeal', after: null, limit: 500, allow: [PID] });
      const due = page.due.map((d) => d.claimCaseId);
      expect(due).toContain(r);
      expect(due).not.toContain(fraudClosed);
    });
  });
});
