// The `-239` refusal's two downstream effects — live DB (:5433). Story 6.20 (Task 4 / Task 9; D14,
// AC13, T17; AC11 (v), (vi)).
//
//   (v)  ⭐ THE GROUND INSPECTION IS INHERITED: a claim refused with `post_death_nominee_change` has a
//        COMPLETED inspection; the true nominee's refile derives it as its source. ⛔ A claim denied for
//        ANY OTHER reason passes nothing on (the non-vacuity sibling).
//   (vi) ⚠ THE REFILE-DURING-APPEAL TRAP (T17): once the refused claim is at `appeal_stage_1`, a refile
//        inside ±30 days CONVERGES onto it — asserted as TODAY'S BEHAVIOUR, ⛔ never as a defect — and the
//        shipped AUTHORIZED OVERRIDE mints a distinct claim that still inherits (v).
// The refile path is the REAL `tryConverge` / `overrideIntakeAttempt`, so the claim ids and `created_at`
// ordering are production's.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  getConvergenceCandidate,
  getInheritedGroundInspectionSource,
  listNomineeRefusals,
  overrideIntakeAttempt,
  tryConverge,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, type ClaimId, type MemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const intake = (mid: MemberId, channel: schema.ClaimIntakeChannel, auditId: string) => ({
  pariwarId: PARIWAR_A,
  deceasedMemberId: mid,
  intakeChannel: channel,
  actor: 'member' as const,
  claimantActorId: null,
  trigger: 'test_intake',
  actorId: null,
  auditId,
});

async function forceState(client: Client, claimCaseId: string, state: string) {
  await client.query('RESET ROLE');
  await client.query("SET LOCAL app.claim_state_writer = 'on'");
  await client.query('UPDATE claims SET current_state = $1 WHERE claim_case_id = $2', [state, claimCaseId]);
  await client.query("SET LOCAL app.claim_state_writer = 'off'");
  await enterAppScope(client, PARIWAR_A);
}

async function refuse(tx: Tx, claimCaseId: ClaimId, reasonCode: 'post_death_nominee_change' | 'other') {
  await tx.insert(schema.claimVerifierDecisions).values({
    claimCaseId,
    pariwarId: PARIWAR_A,
    outcome: 'denied',
    reasonCode,
    rationaleCiphertext: 'enc:v1:rationale',
    actorId: randomUUID(),
    actorDisplay: 'Anita (District Admin)',
  });
}

async function completedInspection(tx: Tx, claimCaseId: ClaimId) {
  await tx.insert(schema.claimGroundInspections).values({
    claimCaseId,
    pariwarId: PARIWAR_A,
    district: 'Patna',
    inspectionStage: 'initial',
    inspectionSiteType: 'family_residence',
    inspectorActorId: randomUUID(),
    scheduledAt: new Date('2026-05-01T06:00:00.000Z'),
    status: 'completed',
    completedAt: new Date('2026-05-02T06:00:00.000Z'),
  });
}

describe.skipIf(!hasDatabase)('Story 6.20 — the `-239` refusal: inheritance + the refile trap (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ AC11(v) — the true nominee\'s REFILE inherits the refused claim\'s completed inspection', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const refused = await tryConverge(client, intake(mid, 'member_app', 'a1'));
    const refusedId = toClaimId(refused.claimCaseId);
    await completedInspection(tx, refusedId);
    await refuse(tx, refusedId, 'post_death_nominee_change');
    await forceState(client, refused.claimCaseId, 'denied');

    // A `denied` claim is terminal, so the refile is a FRESH claim (the path D17 assumes).
    const refile = await tryConverge(client, intake(mid, 'member_app', 'a2'));
    expect(refile.claimCaseId).not.toBe(refused.claimCaseId);

    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(refile.claimCaseId))).toBe(refused.claimCaseId);
    // ⛔ The refused claim does not inherit from itself (or from its successor).
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, refusedId)).toBeNull();
    // The Pariwar Admin's READ surface lists the refusal.
    expect((await listNomineeRefusals(tx, PARIWAR_A)).map((r) => r.claimCaseId)).toContain(refused.claimCaseId);
  });

  it('⛔ AC11(v) sibling — a claim denied for ANY OTHER reason passes NOTHING on', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const denied = await tryConverge(client, intake(mid, 'member_app', 'b1'));
    await completedInspection(tx, toClaimId(denied.claimCaseId));
    await refuse(tx, toClaimId(denied.claimCaseId), 'other');
    await forceState(client, denied.claimCaseId, 'denied');
    const refile = await tryConverge(client, intake(mid, 'member_app', 'b2'));
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(refile.claimCaseId))).toBeNull();
    expect((await listNomineeRefusals(tx, PARIWAR_A)).map((r) => r.claimCaseId)).not.toContain(denied.claimCaseId);
  });

  it('⛔ a `-239` refusal with ⛔ no COMPLETED inspection has nothing to pass on', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const refused = await tryConverge(client, intake(mid, 'member_app', 'c1'));
    await refuse(tx, toClaimId(refused.claimCaseId), 'post_death_nominee_change');
    await forceState(client, refused.claimCaseId, 'denied');
    const refile = await tryConverge(client, intake(mid, 'member_app', 'c2'));
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(refile.claimCaseId))).toBeNull();
  });

  it('⚠⚠ AC11(vi) / T17 — during the refuser\'s APPEAL a refile CONVERGES onto the refused claim (today\'s behaviour); the OVERRIDE mints a distinct claim that still inherits', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const refused = await tryConverge(client, intake(mid, 'member_app', 'd1'));
    const refusedId = toClaimId(refused.claimCaseId);
    await completedInspection(tx, refusedId);
    await refuse(tx, refusedId, 'post_death_nominee_change');
    await forceState(client, refused.claimCaseId, 'appeal_stage_1');

    // ⚠ `appeal_stage_1` is ⛔ not terminal, so inside ±30 days the refused claim IS the candidate …
    const candidate = await getConvergenceCandidate(tx, PARIWAR_A, mid, new Date(Date.now() - 30 * 86_400_000));
    expect(candidate?.claimCaseId).toBe(refused.claimCaseId);
    // … and a cross-channel refile lands as an attempt PENDING against it (⛔ a new claim is NOT minted).
    const refile = await tryConverge(client, intake(mid, 'helpline', 'd2'));
    expect(refile.claimCaseId).toBe(refused.claimCaseId);
    expect(refile.intakeAttemptId).toBeTruthy();

    // ⭐ The remedy is the SHIPPED authorized override, ⛔ never a new convergence rule.
    const ov = await overrideIntakeAttempt(client, {
      intakeAttemptId: refile.intakeAttemptId!,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannel: 'helpline',
      againstClaimCaseId: refusedId,
      reason: 'true nominee refile during the refuser\'s appeal (`-239`)',
      actor: 'operator',
      claimantActorId: null,
      decidedByActor: randomUUID(),
      auditId: 'd3',
    });
    expect(ov.newClaimCaseId).not.toBe(refused.claimCaseId);
    expect(await getInheritedGroundInspectionSource(tx, PARIWAR_A, toClaimId(ov.newClaimCaseId))).toBe(refused.claimCaseId);
  });
});
