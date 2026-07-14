// R9 special-case voting — live-DB integration (Story 6.14, Task 11; AC1/AC2/AC3/AC4/AC5/AC8/AC10).
//
// Drives the domain writers (openR9VotingSession / castR9Vote / finalizeR9Outcome / cancelR9VotingSession)
// + the read models (getR9VotingQueue / getR9Panel / getR9VotesByTrustee) against real Postgres under
// PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK. Asserts MEMBERSHIP / explicit values, never DROP
// SCHEMA. Two-connection concurrency lives in the sibling *-concurrency.spec.ts.

import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId, R9VotingSessionId } from '../../../src/ids/index.js';
import {
  cancelR9VotingSession,
  castR9Vote,
  finalizeR9Outcome,
  getR9Panel,
  getR9VotesByTrustee,
  getR9VotingQueue,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  projectClaimState,
  r9QuorumFor,
  R9ActorNotOnPanelError,
  R9ClaimNoLongerRoutableError,
  R9ClaimNotRoutedError,
  R9ClauseNotVotableError,
  R9NoLiveSessionError,
  R9PanelEmptyError,
  R9PanelMemberUnauthorizedError,
  R9QuorumNotMetError,
  R9RationaleRequiredError,
  R9SessionAlreadySupersededError,
  R9SessionExistsError,
  R9SessionFinalizedError,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClauseVersion, seedRoleGrant } from '../_helpers.js';

const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const PANEL = [
  'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
  'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
  'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
];
const R9_CLAUSE = 'niy.special-death.r9';
const CIPHER = prepareR9VoteCiphertext('enc:v1:fake-ciphertext');

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const openBase = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  clauseId: R9_CLAUSE,
  panelActorIds: PANEL,
  actorId: TRUSTEE,
  actorDisplay: 'Trustee One',
  actor: 'trustee' as const,
});

const voteBase = (claimCaseId: ClaimId, voter: string, vote: 'approve' | 'deny') => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  vote,
  rationaleCiphertext: CIPHER,
  actorId: voter,
  actorDisplay: `Panelist ${voter.slice(0, 4)}`,
  actor: 'trustee' as const,
});

const finalizeBase = (claimCaseId: ClaimId, finalizer: string) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  actorId: finalizer,
  actorDisplay: `Panelist ${finalizer.slice(0, 4)}`,
  actor: 'trustee' as const,
});

/** Drive a fresh claim to verifier_approved via the projector. */
async function driveToApproved(client: Client, claimCaseId: ClaimId, deceased: MemberId): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      deceasedMemberId: deceased,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceased,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
}

/** Insert the live routed_to_r9 routing row directly (6.13's routeToR9 output). */
async function insertRoutedRow(tx: Tx, claimCaseId: ClaimId): Promise<void> {
  await tx.insert(schema.claimStateTrusteeDecisions).values({
    claimCaseId,
    pariwarId: PARIWAR_A,
    phase: 'routing',
    outcome: 'routed_to_r9',
    reasonCode: 'r9_special_case',
    rationaleCiphertext: null,
    actorId: TRUSTEE,
    actorDisplay: 'Trustee One',
  });
}

/** Full setup: seed clause + panel grants (pre-scope), enter scope, drive claim, insert routing row. */
async function setupRoutedClaim(
  client: Client,
  tx: Tx,
  opts: { clauseVersion?: number } = {},
): Promise<{ claimCaseId: ClaimId; deceased: MemberId }> {
  await seedClauseVersion(tx, PARIWAR_A, {
    clauseId: R9_CLAUSE,
    version: opts.clauseVersion ?? 1,
    payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
  });
  for (const uid of PANEL) {
    await seedRoleGrant(tx, PARIWAR_A, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A });
  }
  await enterAppScope(client, PARIWAR_A);
  const claimCaseId = toClaimId(randomUUID());
  const deceased = toMemberId(randomUUID());
  await driveToApproved(client, claimCaseId, deceased);
  await insertRoutedRow(tx, claimCaseId);
  return { claimCaseId, deceased };
}

async function liveVotes(tx: Tx, sessionId: R9VotingSessionId) {
  return tx
    .select()
    .from(schema.claimR9Votes)
    .where(and(eq(schema.claimR9Votes.sessionId, sessionId), isNull(schema.claimR9Votes.supersededAt)));
}

async function claimState(tx: Tx, claimCaseId: ClaimId): Promise<string | undefined> {
  const rows = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, claimCaseId));
  return rows[0]?.currentState;
}

describe.skipIf(!hasDatabase)('R9 voting (PARIWAR_A scope)', () => {
  setupLiveDb();

  // ── AC2 — open ──
  it('AC2 — open snapshots the clause version + rule_code + voting_requirement + quorum + immutable panel', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);

    const { session } = await openR9VotingSession(client, openBase(claimCaseId));
    expect(session.clauseId).toBe(R9_CLAUSE);
    expect(session.ruleCode).toBe('R9');
    expect(session.votingRequirement).toBe('majority');
    expect(session.quorumRequired).toBe(2); // ⌊3/2⌋+1
    expect(session.panelActorIds).toEqual(PANEL);
    expect(session.clauseVersionId).toBeTruthy();
    expect(session.outcome).toBeNull();
  });

  it('AC2 — rejects a non-R9 clause / empty panel / unauthorized panel member / un-routed claim / duplicate session', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);

    await expect(openR9VotingSession(client, { ...openBase(claimCaseId), clauseId: 'niy.special-death.r5-e' })).rejects.toBeInstanceOf(
      R9ClauseNotVotableError,
    );
    await expect(openR9VotingSession(client, { ...openBase(claimCaseId), panelActorIds: [] })).rejects.toBeInstanceOf(R9PanelEmptyError);
    // A panelist with no claim.r9_vote grant.
    await expect(
      openR9VotingSession(client, { ...openBase(claimCaseId), panelActorIds: [...PANEL, randomUUID()] }),
    ).rejects.toBeInstanceOf(R9PanelMemberUnauthorizedError);

    // Open once (ok), then a second open is a conflict.
    await openR9VotingSession(client, openBase(claimCaseId));
    await expect(openR9VotingSession(client, openBase(claimCaseId))).rejects.toBeInstanceOf(R9SessionExistsError);
  });

  it('AC2 — de-duplicates a panel roster containing repeated actor ids (defense-in-depth beyond the contract layer)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, {
      ...openBase(claimCaseId),
      panelActorIds: [PANEL[0]!, PANEL[0]!, PANEL[1]!],
    });
    expect(session.panelActorIds).toEqual([PANEL[0], PANEL[1]]);
    expect(session.quorumRequired).toBe(r9QuorumFor(2));
  });

  it('AC2 — a claim with NO live routed_to_r9 row is not in the queue (not openable)', async () => {
    const { client, tx } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, {
      clauseId: R9_CLAUSE,
      payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
    });
    for (const uid of PANEL) {
      await seedRoleGrant(tx, PARIWAR_A, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A });
    }
    await enterAppScope(client, PARIWAR_A);
    const claimCaseId = toClaimId(randomUUID());
    await driveToApproved(client, claimCaseId, toMemberId(randomUUID()));
    // NO routing row inserted.
    await expect(openR9VotingSession(client, openBase(claimCaseId))).rejects.toBeInstanceOf(R9ClaimNotRoutedError);
  });

  // ── AC3 — vote ──
  it('AC3 — a non-panel actor cannot vote; rationale is required; a revise supersedes (one live vote)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, openBase(claimCaseId));

    // A non-panel r9_vote holder is rejected.
    const outsider = randomUUID();
    await seedRoleGrant(tx, PARIWAR_A, { userId: outsider, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A });
    await expect(castR9Vote(client, voteBase(claimCaseId, outsider, 'approve'))).rejects.toBeInstanceOf(R9ActorNotOnPanelError);

    // Empty ciphertext → rationale required. (A real caller can never construct an empty
    // PreparedR9VoteCiphertext — prepareR9VoteCiphertext itself rejects empty input — so this simulates a
    // type-system bypass to prove the domain write-path's own defense-in-depth still catches it.)
    await expect(
      castR9Vote(client, {
        ...voteBase(claimCaseId, PANEL[0]!, 'approve'),
        rationaleCiphertext: '' as unknown as ReturnType<typeof prepareR9VoteCiphertext>,
      }),
    ).rejects.toBeInstanceOf(R9RationaleRequiredError);

    // Cast, then revise — one live vote, the prior superseded, copies the session clause_version_id.
    const first = await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    expect(first.revised).toBe(false);
    expect(first.vote.clauseVersionId).toBe(session.clauseVersionId);
    const revised = await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'deny'));
    expect(revised.revised).toBe(true);
    expect(revised.vote.supersedesVoteId).toBe(first.vote.voteId);

    const live = await liveVotes(tx, session.sessionId);
    expect(live).toHaveLength(1);
    expect(live[0]!.vote).toBe('deny');
  });

  // ── AC4 — finalize ──
  it('AC4 — finalize below quorum is rejected; at quorum it computes, advances, supersedes routing, emits the event + decision row', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, openBase(claimCaseId));

    // One vote < quorum (2) → rejected.
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toBeInstanceOf(R9QuorumNotMetError);

    // Two approves (of 3) → majority → approved.
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));
    const result = await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(result.session.outcome).toBe('approved');
    expect(result.session.approveCount).toBe(2);
    expect(result.claimState).toBe('state_trustee_approved');
    expect(result.eventVersion).not.toBeNull();

    // The claim advanced (replay-derived).
    expect(await claimState(tx, claimCaseId)).toBe('state_trustee_approved');

    // The routed_to_r9 row is superseded (the approved claim rejoins the commit set).
    const liveRouting = await tx
      .select()
      .from(schema.claimStateTrusteeDecisions)
      .where(
        and(
          eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId),
          eq(schema.claimStateTrusteeDecisions.phase, 'routing'),
          isNull(schema.claimStateTrusteeDecisions.supersededAt),
        ),
      );
    expect(liveRouting).toHaveLength(0);

    // The claim.r9_outcome event landed (NON-PII — no display name / voter identity).
    const events = await tx.select().from(schema.eventsLog).where(eq(schema.eventsLog.streamId, claimCaseId));
    const outcomeEvent = events.find((e) => e.eventType === 'claim.r9_outcome');
    expect(outcomeEvent).toBeTruthy();
    const payload = outcomeEvent!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ outcome: 'approved', approve_count: 2, clause_id: R9_CLAUSE });
    expect(JSON.stringify(payload)).not.toContain('Panelist');
    expect(JSON.stringify(payload)).not.toContain('Trustee One');

    // The r9_outcome trustee decision row landed.
    const r9Rows = await tx
      .select()
      .from(schema.claimStateTrusteeDecisions)
      .where(and(eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId), eq(schema.claimStateTrusteeDecisions.phase, 'r9_outcome')));
    expect(r9Rows).toHaveLength(1);

    // Re-finalize is an idempotent short-circuit (no new event, no double-advance).
    const replay = await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.eventVersion).toBeNull();
    const eventsAfter = await tx.select().from(schema.eventsLog).where(eq(schema.eventsLog.streamId, claimCaseId));
    expect(eventsAfter.filter((e) => e.eventType === 'claim.r9_outcome')).toHaveLength(1);
    expect(session.sessionId).toBeTruthy();
  });

  it('AC4 — a deny majority finalizes to `denied`', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'deny'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'deny'));
    const result = await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(result.session.outcome).toBe('denied');
    expect(await claimState(tx, claimCaseId)).toBe('denied');

    // The routed_to_r9 row is superseded here too — a denied outcome also lifts the durable routing
    // exclusion (it just doesn't rejoin the cycle-freeze commit set), mirroring the approved-branch check.
    const liveRouting = await tx
      .select()
      .from(schema.claimStateTrusteeDecisions)
      .where(
        and(
          eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId),
          eq(schema.claimStateTrusteeDecisions.phase, 'routing'),
          isNull(schema.claimStateTrusteeDecisions.supersededAt),
        ),
      );
    expect(liveRouting).toHaveLength(0);
  });

  it('AC4 — finalize rejects when the claim state drifted out of the routable set since routing (R9ClaimNoLongerRoutableError)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));

    // Simulate some OTHER write path moving the claim out of R9_OUTCOME_FROM_STATES after routing (no real
    // event does this from verifier_approved today — this directly mimics the trigger-guarded write
    // projectClaimState itself performs, to exercise the guard without needing a second real event path).
    await client.query("SET LOCAL app.claim_state_writer = 'on'");
    await tx.update(schema.claims).set({ currentState: 'settled' }).where(eq(schema.claims.claimCaseId, claimCaseId));
    await client.query("SET LOCAL app.claim_state_writer = 'off'");

    await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toBeInstanceOf(
      R9ClaimNoLongerRoutableError,
    );
  });

  it('AC2 — a finalized (non-superseded) session blocks re-opening (only cancel unblocks it)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));
    await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));

    // Finalize ATOMICALLY supersedes the routed_to_r9 row too (AC4), so a reopen attempt is rejected at the
    // "not in the queue" guard (R9ClaimNotRoutedError) rather than ever reaching the session-exists check —
    // unlike cancel (AC5), which deliberately leaves the routing row live so a corrected session CAN reopen.
    // Both outcomes block reopening; this pins WHICH guard fires, distinguishing it from the cancel path.
    await expect(openR9VotingSession(client, openBase(claimCaseId))).rejects.toBeInstanceOf(R9ClaimNotRoutedError);
  });

  // ── AC5 — cancel ──
  it('AC5 — cancel supersedes the session + its votes, leaves routed_to_r9 live, and a fresh session can re-open', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));

    // Cancel by a PANEL member (AC5/re-review fix — cancel now requires panel membership, the TRUSTEE opener
    // is not necessarily on the panel and must not be able to cancel someone else's session).
    await cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, PANEL[0]!), reasonCode: 'wrong_clause' });

    // Session + its votes superseded.
    const live = await liveVotes(tx, session.sessionId);
    expect(live).toHaveLength(0);

    // The routing row stays live → a fresh session can open (with a corrected panel).
    const reopened = await openR9VotingSession(client, openBase(claimCaseId));
    expect(reopened.session.sessionId).not.toBe(session.sessionId);
  });

  it('AC5 — cancel requires panel membership — a non-panel actor (even the routing trustee who opened it) is rejected', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, TRUSTEE), reasonCode: 'wrong_clause' }),
    ).rejects.toBeInstanceOf(R9ActorNotOnPanelError);
  });

  it('AC5 — cancel fails closed on an already-finalized session', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));
    await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, PANEL[0]!), reasonCode: 'x' }),
    ).rejects.toBeInstanceOf(R9SessionFinalizedError);
  });

  it('AC5 — cancel-after-cancel is R9SessionAlreadySupersededError, distinct from R9NoLiveSessionError for a claim that never had a session', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, PANEL[0]!), reasonCode: 'wrong_clause' });

    // Already cancelled — the specific error (hasAnySession found a superseded row), not the generic
    // "never had a session" one. Once superseded, liveSession() no longer finds it, so this branch is
    // reached regardless of actor — TRUSTEE (a non-panel actor) is fine here, unlike the live-session path.
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, TRUSTEE), reasonCode: 'x' }),
    ).rejects.toBeInstanceOf(R9SessionAlreadySupersededError);

    // A DIFFERENT claim that never had a session at all gets the generic error instead.
    // (a distinct clauseVersion — this test's own tx already seeded R9_CLAUSE @ v1 above.)
    const { claimCaseId: neverOpened } = await setupRoutedClaim(client, tx, { clauseVersion: 2 });
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(neverOpened, TRUSTEE), reasonCode: 'x' }),
    ).rejects.toBeInstanceOf(R9NoLiveSessionError);
  });

  it('AC4 — finalize with no live session (never opened) is a typed 4xx', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toBeInstanceOf(R9NoLiveSessionError);
  });

  // ── AC1/AC8 — reads ──
  it('AC1/AC8 — the queue lists the routed claim (session_open flag), the panel model + tally, and votes-by-trustee (live + superseded)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId, deceased } = await setupRoutedClaim(client, tx);

    // Before a session: in the queue, session_open false.
    let queue = await getR9VotingQueue(tx, PARIWAR_A);
    expect(queue.map((q) => q.claimCaseId)).toContain(claimCaseId);
    expect(queue.find((q) => q.claimCaseId === claimCaseId)!.sessionOpen).toBe(false);

    const { session } = await openR9VotingSession(client, openBase(claimCaseId));
    // After open: still queued, session_open true.
    queue = await getR9VotingQueue(tx, PARIWAR_A);
    expect(queue.find((q) => q.claimCaseId === claimCaseId)!.sessionOpen).toBe(true);

    // Vote + revise → the transcript keeps both.
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'deny')); // revise

    const panel = await getR9Panel(tx, PARIWAR_A, claimCaseId);
    expect(panel).not.toBeNull();
    expect(panel!.deceasedMemberId).toBe(deceased);
    expect(panel!.session!.sessionId).toBe(session.sessionId);
    expect(panel!.votes).toHaveLength(1); // only the live (revised) vote

    // votes-by-trustee returns BOTH the live + the superseded vote for PANEL[0], each bound to session/rule.
    const transcript = await getR9VotesByTrustee(tx, PARIWAR_A, PANEL[0]!, {});
    expect(transcript).toHaveLength(2);
    for (const v of transcript) {
      expect(v.clauseId).toBe(R9_CLAUSE);
      expect(v.sessionId).toBe(session.sessionId);
      expect(v.panelActorIds).toEqual(PANEL);
    }
    expect(transcript.filter((v) => v.supersededAt !== null)).toHaveLength(1);
  });

  it('AC8 — getR9VotesByTrustee clamps a non-positive sinceDays to 1 instead of silently shifting the cutoff into the future', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));

    // sinceDays: 0 (or negative) must NOT silently exclude the vote just cast — the clamp floors it to 1.
    const transcript = await getR9VotesByTrustee(tx, PARIWAR_A, PANEL[0]!, { sinceDays: 0 });
    expect(transcript.length).toBeGreaterThan(0);
    const transcriptNegative = await getR9VotesByTrustee(tx, PARIWAR_A, PANEL[0]!, { sinceDays: -5 });
    expect(transcriptNegative.length).toBeGreaterThan(0);
  });
});
