// Peer-mesh persistence + response recording — Story 6.6 (Task 3/4/6).
//
// The write side of the peer-mesh substrate:
//   · persistPeerMeshSelection      — the immutable audit record (idempotent on claim_case_id).
//   · persistPeerMeshPingIntents     — ONE delivery-neutral ping intent per selected member.
//   · recordPeerMeshResponse         — the annotation-event writer (identity transition).
//   · resolvePeerMeshOutcome / extendPeerMeshWindow / skipPeerMesh — the mutable disposition writers.
//
// The selection snapshot + ids + metric are IMMUTABLE once written; only `outcome` /
// `response_window_expires_at` / `skip_reason` are mutated (plain non-`state` UPDATEs — no
// projector guard; the claim's own lifecycle state stays on `claims.current_state`).

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshSelectionId } from '../ids/index.js';
import {
  type ClaimPeerMeshSelectionRow,
  type PeerMeshOutcome,
  claimPeerMeshSelections,
} from '../schema/claim_peer_mesh_selections.js';
import { claimPeerMeshPings } from '../schema/claim_peer_mesh_pings.js';
import type { PeerMeshCandidate, PeerMeshDeceased } from './peer-mesh-metric-registry.js';
import { isClaimInAnswerWindow } from './answer-window.js';
import { lockClaimCase } from './read.js';
import { getPeerMeshResponses, getPeerMeshSelectionByClaim } from './peer-mesh-read.js';
import { projectClaimState } from './project.js';

/** Bounded, machine-readable skip reason for the zero-eligible-candidates disposition
 *  (review decision — never free-text system copy for this case). */
export const PEER_MESH_SKIP_REASON_NO_ELIGIBLE_CANDIDATES = 'no_eligible_candidates';

/** Input to {@link persistPeerMeshSelection}. `candidates` is the frozen snapshot. */
export interface PersistPeerMeshSelectionInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  deceasedMemberId: MemberId;
  /** The deceased's comparator reference point AT SELECTION TIME (review fix — AC2/AC5:
   *  persisted so replay never re-derives it live; a later member_postings row for the
   *  deceased must not change a past selection's replay result). */
  deceased: PeerMeshDeceased;
  metricId: string;
  metricVersion: number;
  /** The ordered selected member ids (≤5) — order is load-bearing. */
  selectedMemberIds: readonly MemberId[];
  /** The candidate set captured at selection time (persisted for byte-identical replay). */
  candidates: readonly PeerMeshCandidate[];
  /** When the response window closes (AR-61). */
  responseWindowExpiresAt: Date;
}

/**
 * Persist the deterministic selection row (AC2). IDEMPOTENT on `claim_case_id` — a re-run
 * finds the existing row (`onConflictDoNothing`) and returns it UNCHANGED (never rewriting
 * the immutable snapshot/ids/metric). Tenant-scoped (runs on the caller's scoped `db`).
 */
export async function persistPeerMeshSelection(
  db: Db,
  input: PersistPeerMeshSelectionInput,
): Promise<ClaimPeerMeshSelectionRow> {
  const candidateSnapshot = input.candidates.map((c) => ({
    memberId: c.memberId,
    district: c.district,
    createdAt: c.createdAt.toISOString(),
  }));

  const inserted = await db
    .insert(claimPeerMeshSelections)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: input.deceasedMemberId,
      deceasedDistrict: input.deceased.district,
      deceasedCreatedAt: input.deceased.createdAt,
      metricId: input.metricId,
      metricVersion: input.metricVersion,
      selectedMemberIds: [...input.selectedMemberIds],
      candidateSnapshot,
      responseWindowExpiresAt: input.responseWindowExpiresAt,
    })
    .onConflictDoNothing({ target: claimPeerMeshSelections.claimCaseId })
    .returning();

  if (inserted[0]) return inserted[0];

  // Conflict → the row already exists (a re-run). Read it back (the immutable audit record).
  const existing = await getPeerMeshSelectionByClaim(db, input.pariwarId, input.claimCaseId);
  if (!existing) {
    throw new Error(
      `[persistPeerMeshSelection] conflict on claim ${input.claimCaseId} but no row found in scope`,
    );
  }
  return existing;
}

/**
 * Persist ONE delivery-neutral ping intent per selected member (AC3, Decision D1).
 * IDEMPOTENT on `(selection_id, member_id)` — a re-run inserts nothing new (still exactly
 * N rows, never 2N). Returns the number of rows newly inserted. Tenant-scoped.
 */
export async function persistPeerMeshPingIntents(
  db: Db,
  selectionId: PeerMeshSelectionId,
  pariwarId: PariwarId,
  memberIds: readonly MemberId[],
): Promise<number> {
  if (memberIds.length === 0) return 0;
  const inserted = await db
    .insert(claimPeerMeshPings)
    .values(
      memberIds.map((memberId) => ({
        selectionId,
        pariwarId,
        memberId,
      })),
    )
    .onConflictDoNothing({
      target: [claimPeerMeshPings.selectionId, claimPeerMeshPings.memberId],
    })
    .returning();
  return inserted.length;
}

/** Thrown when a responder is not one of the selection's chosen 5 (non-manipulability). */
export class PeerMeshResponderNotSelectedError extends Error {
  constructor(
    public readonly claimCaseId: string,
    public readonly responderMemberId: string,
  ) {
    super(
      `[peer-mesh] responder ${responderMemberId} is not among the selected mesh for claim ${claimCaseId}`,
    );
    this.name = 'PeerMeshResponderNotSelectedError';
  }
}

/** Thrown when no selection row exists for a claim a response/disposition is filed against. */
export class PeerMeshSelectionNotFoundError extends Error {
  constructor(public readonly claimCaseId: string) {
    super(`[peer-mesh] no selection exists for claim ${claimCaseId}`);
    this.name = 'PeerMeshSelectionNotFoundError';
  }
}

/** Thrown when a selected member has already recorded a `claim.peer_mesh_responded` event
 *  for this claim (review fix — non-manipulability: one response per selected member). */
export class PeerMeshResponderAlreadyRespondedError extends Error {
  constructor(
    public readonly claimCaseId: string,
    public readonly responderMemberId: string,
  ) {
    super(
      `[peer-mesh] responder ${responderMemberId} already recorded a response for claim ${claimCaseId}`,
    );
    this.name = 'PeerMeshResponderAlreadyRespondedError';
  }
}

/**
 * Thrown when a reply arrives for a claim OUTSIDE the ANSWER WINDOW. ⭐ Story 6.27a (PM8) WIDENED it: 6.6 refused once the claim
 * left `verification_in_progress`; a neighbour's answer is now taken while an approval is still to come — the review states,
 * or `state_trustee_approved` under a live R9 routing (`claim/answer-window.ts`; `-311` item 3, ratified by `-324` A). The
 * class name is KEPT (the 6.26 GI3 precedent — `GroundInspectionClaimNotInVerificationError`). ⭐ 6.6's
 * `PeerMeshWindowResolvedError` is GONE: the 72-hour label no longer closes answering (it is ⛔ not recounted — the WINDOW
 * worker is monotonic), and ⛔ no other caller threw or caught it.
 */
export class PeerMeshClaimNotInVerificationError extends Error {
  constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(`[peer-mesh] claim ${claimCaseId} is '${currentState}', outside the answer window — response rejected`);
    this.name = 'PeerMeshClaimNotInVerificationError';
  }
}

/** Thrown when `skipPeerMesh` is called with an empty/whitespace-only reason (AC6 requires
 *  a *documented* reason — review fix, mirrors the Story 6.4 override-reason min-length gate). */
export class PeerMeshInvalidSkipReasonError extends Error {
  constructor(public readonly claimCaseId: string) {
    super(`[peer-mesh] claim ${claimCaseId}: skip reason must be a non-empty, non-whitespace string`);
    this.name = 'PeerMeshInvalidSkipReasonError';
  }
}

export interface RecordPeerMeshResponseInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  responderMemberId: MemberId;
  response: 'confirmed' | 'denied' | 'unknown';
  /** Optional caller-supplied audit id, threaded through the projector unchanged. */
  auditId?: string;
  /**
   * ⭐ Story 6.27a (PM7 (e)) — who recorded it: `'member'` (the neighbour, in the app — the DEFAULT, so 6.6's callers are
   * unchanged) or `'operator'` (the helpline, for a neighbour who phoned).
   */
  actor?: 'member' | 'operator';
  /** The event's `actor_id` — the operator for a helpline save; DEFAULTS to the responder. */
  actorId?: string;
}

/**
 * Record a peer's response as a `claim.peer_mesh_responded` ANNOTATION event (6.6 AC4) — an identity transition that does
 * NOT advance the primary state. Rejects a responder not in `selected_member_ids` (non-manipulability) and a SECOND
 * response from an already-responded member (one per selected member).
 *
 * ⭐ Story 6.27a (PM8, PM7 (e)) WIDENED it:
 *   · it is taken while the claim is in the ANSWER WINDOW (`isClaimInAnswerWindow` — an approval is still to come), ⛔ no
 *     longer only in `verification_in_progress`, and ⛔ no longer refused once the 72-hour label resolved (the label is
 *     ⛔ not recounted); `from_state` / `to_state` = the claim's CURRENT state;
 *   · ⭐ LOCK ORDER (Invariant 9 — STRUCTURAL, ⛔ never a caller convention): it takes the CLAIM row lock ITSELF
 *     (`lockClaimCase`) BEFORE the ping lock, the order every approval writer uses — so a reply racing an approval
 *     serializes on the claim row (⛔ no `eventVersion` collision, ⛔ no deadlock). Re-entrant when the caller (6.27a's
 *     reply writer) already holds both;
 *   · `actor` / `actorId` are parameters, defaulting to `'member'` / the responder.
 * The duplicate check re-reads the response events UNDER the ping lock. Takes a raw `pg.PoolClient` (projectClaimState
 * needs `SET LOCAL`); the caller owns the scope-tx.
 */
export async function recordPeerMeshResponse(
  client: pg.PoolClient,
  input: RecordPeerMeshResponseInput,
): Promise<void> {
  const db = bindScopedDb(client);

  // (1) The CLAIM row first (Invariant 9).
  const claimRow = await lockClaimCase(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new Error(`[recordPeerMeshResponse] claim ${input.claimCaseId} not found in scope`);
  if (!(await isClaimInAnswerWindow(db, input.pariwarId, input.claimCaseId, claimRow.currentState))) {
    throw new PeerMeshClaimNotInVerificationError(input.claimCaseId, claimRow.currentState);
  }

  const selection = await getPeerMeshSelectionByClaim(db, input.pariwarId, input.claimCaseId);
  if (!selection) throw new PeerMeshSelectionNotFoundError(input.claimCaseId);
  if (!selection.selectedMemberIds.includes(input.responderMemberId)) {
    throw new PeerMeshResponderNotSelectedError(input.claimCaseId, input.responderMemberId);
  }

  // (2) Then this member's ping row — serializes concurrent duplicate submissions.
  await db
    .select()
    .from(claimPeerMeshPings)
    .where(
      and(
        eq(claimPeerMeshPings.selectionId, selection.selectionId),
        eq(claimPeerMeshPings.memberId, input.responderMemberId),
      ),
    )
    .for('update');

  // Re-check (post-lock, post-commit-of-any-racing-writer) for an existing response.
  const priorResponses = await getPeerMeshResponses(db, input.claimCaseId);
  if (priorResponses.some((r) => r.responderMemberId === input.responderMemberId)) {
    throw new PeerMeshResponderAlreadyRespondedError(input.claimCaseId, input.responderMemberId);
  }

  await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.peer_mesh_responded',
    payload: {
      from_state: claimRow.currentState,
      to_state: claimRow.currentState,
      trigger: 'peer_mesh_response',
      actor: input.actor ?? 'member',
      responder_member_id: input.responderMemberId,
      response: input.response,
    },
    actorId: input.actorId ?? input.responderMemberId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });
}

/**
 * Set a selection's `outcome` (AC6). A plain non-`state` UPDATE (no projector guard).
 * MONOTONIC (review fix): the UPDATE is guarded `WHERE outcome = 'pending'`, so once an
 * outcome resolves (`sufficient` / `insufficient_responses_fallback` / `skipped`) a re-fire
 * of the window job (redelivery, a stray re-enqueue) can never silently flip it back —
 * this call becomes a no-op returning the ALREADY-resolved row unchanged. Tenant-scoped.
 * Throws only if no selection row exists at all.
 */
export async function resolvePeerMeshOutcome(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  outcome: PeerMeshOutcome,
): Promise<ClaimPeerMeshSelectionRow> {
  const rows = await db
    .update(claimPeerMeshSelections)
    .set({ outcome })
    .where(
      and(
        eq(claimPeerMeshSelections.pariwarId, pariwarId),
        eq(claimPeerMeshSelections.claimCaseId, claimCaseId),
        eq(claimPeerMeshSelections.outcome, 'pending'),
      ),
    )
    .returning();
  if (rows[0]) return rows[0];

  // Either no selection exists, or one exists but is already resolved (monotonic no-op).
  const existing = await getPeerMeshSelectionByClaim(db, pariwarId, claimCaseId);
  if (!existing) throw new PeerMeshSelectionNotFoundError(claimCaseId);
  return existing;
}

/**
 * Operator affordance: EXTEND the response window (AC6). Sets a later
 * `response_window_expires_at`; resets `outcome` to `pending` so a subsequent window-job
 * fire re-evaluates instead of leaving a stale resolved outcome. Tenant-scoped, DB-only —
 * this domain function does NOT itself re-enqueue the delayed `CLAIM_PEER_MESH_WINDOW` job
 * (domain has no `@twt/queue` dependency by design). Review fix: the caller MUST re-enqueue
 * at `newExpiresAt` — see `apps/jobs/src/claim-peer-mesh.ts`'s
 * `extendPeerMeshWindowAndReschedule`, the only sanctioned way to call this from a live
 * operator path (calling this function directly leaves the extension functionally inert).
 * The live operator UI + notification delivery remain deferred (Decision D1 seam).
 */
export async function extendPeerMeshWindow(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  newExpiresAt: Date,
): Promise<ClaimPeerMeshSelectionRow> {
  const rows = await db
    .update(claimPeerMeshSelections)
    .set({ responseWindowExpiresAt: newExpiresAt, outcome: 'pending' })
    .where(
      and(
        eq(claimPeerMeshSelections.pariwarId, pariwarId),
        eq(claimPeerMeshSelections.claimCaseId, claimCaseId),
      ),
    )
    .returning();
  if (!rows[0]) throw new PeerMeshSelectionNotFoundError(claimCaseId);
  return rows[0];
}

/**
 * Operator affordance: SKIP the peer mesh with a documented reason (AC6). Sets
 * `outcome = 'skipped'` + records the reason. NEVER advances the claim state / auto-denies —
 * peer-mesh is a signal the verifier weighs. Tenant-scoped.
 *
 * Review fix: `reason` must be non-empty after trimming ("a documented reason" per AC6) —
 * throws {@link PeerMeshInvalidSkipReasonError} on blank/whitespace-only input, mirroring
 * the Story 6.4 override-reason min-length gate. The trimmed value is what's persisted.
 */
export async function skipPeerMesh(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  reason: string,
): Promise<ClaimPeerMeshSelectionRow> {
  const trimmed = reason.trim();
  if (trimmed.length === 0) throw new PeerMeshInvalidSkipReasonError(claimCaseId);

  const rows = await db
    .update(claimPeerMeshSelections)
    .set({ outcome: 'skipped', skipReason: trimmed })
    .where(
      and(
        eq(claimPeerMeshSelections.pariwarId, pariwarId),
        eq(claimPeerMeshSelections.claimCaseId, claimCaseId),
      ),
    )
    .returning();
  if (!rows[0]) throw new PeerMeshSelectionNotFoundError(claimCaseId);
  return rows[0];
}
