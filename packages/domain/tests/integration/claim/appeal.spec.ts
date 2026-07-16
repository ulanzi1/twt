// Internal 3-stage appeal — live-DB integration (Story 6.16, Task 11; AC1–AC5/AC9). Drives the domain
// writers against real Postgres under PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK. Asserts MEMBERSHIP
// / explicit values, never DROP SCHEMA.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  AppealDispositionCategoryError,
  AppealNotDeniedError,
  AppealPanelMemberUnauthorizedError,
  AppealPanelQuorumNotMetError,
  AppealPanelTooSmallError,
  AppealReviewerConflictError,
  cancelAppealPanel,
  castAppealVote,
  computeStageSlaStatus,
  decideAppealStage3,
  finalizeAppealOutcome,
  initiateAppeal,
  openAppealPanel,
  prepareAppealCiphertext,
  projectClaimState,
  reviewAppealStage1,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedRoleGrant } from '../_helpers.js';

const CLAIMANT = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0';
const VERIFIER = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const REVIEWER = 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'; // independent District Admin
const TRUSTEE = 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1';
const PANEL = ['c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2'];
const CIPHER = prepareAppealCiphertext('enc:v1:fake');

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

/** Drive a fresh claim to `denied` (via verifier_denied) through the projector. */
async function driveToDenied(client: Client, claimCaseId: ClaimId, deceased: MemberId): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      deceasedMemberId: deceased,
      intakeChannels: ['member_app'],
      claimantActorId: CLAIMANT,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: VERIFIER,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: deceased, intake_channel: 'member_app', claimant_actor_id: CLAIMANT });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'm', metric_version: 1 });
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  await emit('verifier_review', 'denied', 'claim.verifier_denied');
}

/** Insert the original verifier decision row so the D-D conflict derivation can see the original decider. */
async function insertVerifierDecision(tx: Tx, claimCaseId: ClaimId): Promise<void> {
  await tx.insert(schema.claimVerifierDecisions).values({
    claimCaseId,
    pariwarId: PARIWAR_A,
    outcome: 'denied',
    reasonCode: 'other',
    rationaleCiphertext: 'enc:v1:x',
    actorId: VERIFIER,
    actorDisplay: 'Original Verifier',
  });
}

async function setupDeniedClaim(client: Client, tx: Tx): Promise<{ claimCaseId: ClaimId; deceased: MemberId }> {
  for (const uid of PANEL) {
    await seedRoleGrant(tx, PARIWAR_A, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A });
  }
  await enterAppScope(client, PARIWAR_A);
  const claimCaseId = toClaimId(randomUUID());
  const deceased = toMemberId(randomUUID());
  await driveToDenied(client, claimCaseId, deceased);
  await insertVerifierDecision(tx, claimCaseId);
  return { claimCaseId, deceased };
}

async function claimState(tx: Tx, claimCaseId: ClaimId): Promise<string | undefined> {
  const rows = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, claimCaseId));
  return rows[0]?.currentState;
}

async function eventTypes(tx: Tx, claimCaseId: ClaimId): Promise<string[]> {
  const rows = await tx.select().from(schema.eventsLog).where(eq(schema.eventsLog.streamId, claimCaseId));
  return rows.map((r) => r.eventType);
}

async function reversedPayloads(tx: Tx, claimCaseId: ClaimId): Promise<Array<Record<string, unknown>>> {
  const rows = await tx
    .select()
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.streamId, claimCaseId), eq(schema.eventsLog.eventType, 'claim.reversed')));
  return rows.map((r) => r.payload as Record<string, unknown>);
}

const dec = (over: Partial<Parameters<typeof reviewAppealStage1>[1]> = {}) => ({
  pariwarId: PARIWAR_A,
  reviewerActorId: REVIEWER,
  reviewerDisplay: 'District Admin',
  rationaleCiphertext: CIPHER,
  dispositionCategory: null,
  actor: 'operator' as const,
  ...over,
});

describe.skipIf(!hasDatabase)('internal 3-stage appeal (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('AC1 — initiate from denied → appeal_stage_1 + an open journey anchor', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    const res = await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    expect(res.claimState).toBe('appeal_stage_1');
    expect(res.appeal.status).toBe('open');
    expect(res.appeal.currentStage).toBe('1');
    expect(await claimState(tx, claimCaseId)).toBe('appeal_stage_1');
  });

  it('AC1/AC5 — full ladder: stage1 advance → stage2 advance → stage3 reverse → reversed + claim.reversed(3)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });

    // Stage 1 — do-not-reverse → advance → appeal_stage_2.
    const s1 = await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    expect(s1.claimState).toBe('appeal_stage_2');

    // Stage 2 — open panel (2 members), tie vote (1 reverse / 1 deny) → advance → appeal_stage_3.
    await openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: PANEL, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'reverse', rationaleCiphertext: CIPHER, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'deny', rationaleCiphertext: CIPHER, actorId: PANEL[1]!, actorDisplay: 'P2', actor: 'trustee' });
    const s2 = await finalizeAppealOutcome(client, { claimCaseId, pariwarId: PARIWAR_A, rationaleCiphertext: CIPHER, dispositionCategory: null, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    expect(s2.session.outcome).toBe('advance');
    expect(s2.claimState).toBe('appeal_stage_3');

    // Stage 3 — reverse (+ disposition) → reversed + claim.reversed(3).
    const s3 = await decideAppealStage3(client, { ...dec(), claimCaseId, actor: 'trustee', reviewerActorId: TRUSTEE, decision: 'reversed', dispositionCategory: 'new_evidence_presented' });
    expect(s3.claimState).toBe('reversed');
    expect(s3.reversedEventVersion).not.toBeNull();
    expect(await claimState(tx, claimCaseId)).toBe('reversed');

    const payloads = await reversedPayloads(tx, claimCaseId);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({ from_state: 'reversed', to_state: 'reversed', reversed_at_stage: 3, disposition_category: 'new_evidence_presented' });
    // Anchor closed.
    const anchor = (await tx.select().from(schema.claimAppeals).where(eq(schema.claimAppeals.claimCaseId, claimCaseId)))[0];
    expect(anchor?.status).toBe('reversed');
  });

  it('AC2/AC5 — stage-1 reverse short path → reversed + claim.reversed(1)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    const s1 = await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'reversed', dispositionCategory: 'procedural_correction' });
    expect(s1.claimState).toBe('reversed');
    const payloads = await reversedPayloads(tx, claimCaseId);
    expect(payloads[0]).toMatchObject({ reversed_at_stage: 1, disposition_category: 'procedural_correction' });
  });

  it('AC4 — stage-3 uphold → denied + claim.denied_no_appeal (freeze-clearing terminal) + status upheld_final', async () => {
    const { client, tx } = getTx();
    const { claimCaseId, deceased } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    await openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: PANEL, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'deny', rationaleCiphertext: CIPHER, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'deny', rationaleCiphertext: CIPHER, actorId: PANEL[1]!, actorDisplay: 'P2', actor: 'trustee' });
    await finalizeAppealOutcome(client, { claimCaseId, pariwarId: PARIWAR_A, rationaleCiphertext: CIPHER, dispositionCategory: null, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });

    const s3 = await decideAppealStage3(client, { ...dec(), claimCaseId, actor: 'trustee', reviewerActorId: TRUSTEE, decision: 'upheld' });
    expect(s3.claimState).toBe('denied');
    const types = await eventTypes(tx, claimCaseId);
    expect(types).toContain('claim.denied_no_appeal');
    expect(types).not.toContain('claim.reversed');
    const dna = (await tx.select().from(schema.eventsLog).where(and(eq(schema.eventsLog.streamId, claimCaseId), eq(schema.eventsLog.eventType, 'claim.denied_no_appeal'))))[0];
    expect((dna?.payload as Record<string, unknown>).deceased_member_id).toBe(deceased);
    const anchor = (await tx.select().from(schema.claimAppeals).where(eq(schema.claimAppeals.claimCaseId, claimCaseId)))[0];
    expect(anchor?.status).toBe('upheld_final');
  });

  it('D-F — a second initiate after the journey exists is rejected (exactly one journey per claim)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    // Reverse it (journey → reversed), then a fresh initiate must still be rejected (unconditional uniqueness).
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'reversed', dispositionCategory: 'reconsideration_on_merits' });
    await expect(initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' })).rejects.toBeInstanceOf(AppealNotDeniedError);
  });

  it('D-D — a Stage-1 review by the ORIGINAL verifier is rejected (reviewer must be independent)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await expect(reviewAppealStage1(client, { ...dec({ reviewerActorId: VERIFIER }), claimCaseId, decision: 'advance' })).rejects.toBeInstanceOf(AppealReviewerConflictError);
    // An independent reviewer is allowed.
    await expect(reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' })).resolves.toBeTruthy();
  });

  it('AC1/D-E — initiating on a NON-denied claim is rejected (no deadline gate exists either way)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    // Now the claim is appeal_stage_1 — a re-initiate is rejected as not-denied (not as a window/deadline).
    await expect(initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' })).rejects.toBeInstanceOf(AppealNotDeniedError);
  });

  it('AC3/D-B — a single-member panel roster is rejected at open (minimum 2)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    await expect(openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: [PANEL[0]!], actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' })).rejects.toBeInstanceOf(AppealPanelTooSmallError);
  });

  it('AC3 (6.16 review — Task 11 coverage gap) — a designated panel member who does NOT hold claim.appeal_vote is rejected at open', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    // PANEL[0] holds claim.appeal_vote (seeded by setupDeniedClaim); an ungranted actor does not.
    const unauthorized = randomUUID();
    await expect(
      openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: [PANEL[0]!, unauthorized], actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' }),
    ).rejects.toBeInstanceOf(AppealPanelMemberUnauthorizedError);
    // No session was created by the rejected open.
    const sessions = await tx.select().from(schema.claimAppealPanelSessions).where(eq(schema.claimAppealPanelSessions.claimCaseId, claimCaseId));
    expect(sessions).toHaveLength(0);
  });

  it('AC3 — a finalize below quorum is rejected', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    await openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: PANEL, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    // Only one of two votes cast — quorum (2) not met.
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'reverse', rationaleCiphertext: CIPHER, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await expect(finalizeAppealOutcome(client, { claimCaseId, pariwarId: PARIWAR_A, rationaleCiphertext: CIPHER, dispositionCategory: null, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' })).rejects.toBeInstanceOf(AppealPanelQuorumNotMetError);
  });

  it('D-A (6.16 review) — finalize REJECTS a disposition_category on a non-reversing (advance) outcome', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    await openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: PANEL, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    // Both vote deny — quorum met, outcome is 'advance' (non-reversing).
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'deny', rationaleCiphertext: CIPHER, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'deny', rationaleCiphertext: CIPHER, actorId: PANEL[1]!, actorDisplay: 'P2', actor: 'trustee' });
    await expect(
      finalizeAppealOutcome(client, {
        claimCaseId,
        pariwarId: PARIWAR_A,
        rationaleCiphertext: CIPHER,
        dispositionCategory: 'procedural_correction',
        actorId: PANEL[0]!,
        actorDisplay: 'P1',
        actor: 'trustee',
      }),
    ).rejects.toBeInstanceOf(AppealDispositionCategoryError);
  });

  it('AC3 — cancel supersedes the session so a fresh panel can re-open', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    await openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: PANEL, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await cancelAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, reasonCode: 'wrong_panel', actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await expect(openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: PANEL, actorId: PANEL[1]!, actorDisplay: 'P2', actor: 'trustee' })).resolves.toBeTruthy();
  });

  it('6.16 review — cancelling a session WITH live votes still succeeds for a panelist (v1: every claim.appeal_vote holder is pariwar_admin, which ALSO holds claim.appeal_final — the elevated-cancel gate has no v1-reachable deny path yet; it is defense-in-depth for Epic 3s finer role split). Exercises the new live-vote-count branch.', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    await reviewAppealStage1(client, { ...dec(), claimCaseId, decision: 'advance' });
    await openAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, panelActorIds: PANEL, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await castAppealVote(client, { claimCaseId, pariwarId: PARIWAR_A, vote: 'reverse', rationaleCiphertext: CIPHER, actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' });
    await expect(
      cancelAppealPanel(client, { claimCaseId, pariwarId: PARIWAR_A, reasonCode: 'wrong_panel', actorId: PANEL[0]!, actorDisplay: 'P1', actor: 'trustee' }),
    ).resolves.toBeTruthy();
  });

  it('AC11/D-H — computeStageSlaStatus derives from the stage-entry event (never blocks a write)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupDeniedClaim(client, tx);
    await initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR_A, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' });
    // Within SLA (just entered) → not breached.
    const now = new Date();
    const within = await computeStageSlaStatus(tx, PARIWAR_A, claimCaseId, '1', now);
    expect(within.breached).toBe(false);
    expect(within.stageEnteredAt).not.toBeNull();
    // Far in the future → breached (read-time only; the write-path never consulted it).
    const future = new Date(now.getTime() + 999 * 24 * 60 * 60 * 1000);
    const breached = await computeStageSlaStatus(tx, PARIWAR_A, claimCaseId, '1', future);
    expect(breached.breached).toBe(true);
  });
});
