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
import { getClaimCase } from './read.js';
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

/** Thrown when a response is filed for a claim that has left `verification_in_progress`
 *  (review fix — prevents a false `from_state`/`to_state` audit trail on a resolved claim). */
export class PeerMeshClaimNotInVerificationError extends Error {
  constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[peer-mesh] claim ${claimCaseId} is '${currentState}', not 'verification_in_progress' — response rejected`,
    );
    this.name = 'PeerMeshClaimNotInVerificationError';
  }
}

/** Thrown when a response is filed after the selection's AR-61 disposition already
 *  resolved (review fix — a resolved outcome must not silently flip on a late response). */
export class PeerMeshWindowResolvedError extends Error {
  constructor(
    public readonly claimCaseId: string,
    public readonly outcome: PeerMeshOutcome,
  ) {
    super(`[peer-mesh] claim ${claimCaseId}'s peer-mesh window already resolved to '${outcome}'`);
    this.name = 'PeerMeshWindowResolvedError';
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
}

/**
 * Record a peer's response as a `claim.peer_mesh_responded` ANNOTATION event (AC4) — an
 * identity transition (`from_state === to_state === 'verification_in_progress'`) that does
 * NOT advance the primary state. Rejects a responder not in `selected_member_ids` (a
 * non-selected member cannot vote — non-manipulability), a claim no longer
 * `verification_in_progress` (review fix — no false audit trail on a resolved claim), an
 * already-resolved AR-61 disposition (review fix — no silent outcome flip), and a SECOND
 * response from an already-responded member (review fix — decided: reject, not append).
 *
 * The duplicate-response check is enforced TRANSACTIONALLY: it `SELECT ... FOR UPDATE`s
 * the member's own ping-intent row first (the natural one-row-per-selected-member lock
 * anchor — mirrors `niyamavali/drafts.ts`'s `getDraftForUpdateOrThrow` pattern), so two
 * concurrent responses from the same member serialize — the second waits, then re-reads
 * post-commit state and sees the first's event, guaranteeing exactly one committed
 * `claim.peer_mesh_responded` event per (claim, responder) even under a genuine race.
 *
 * Takes a raw `pg.PoolClient` (projectClaimState needs `SET LOCAL`); the caller owns the
 * scope-tx.
 */
export async function recordPeerMeshResponse(
  client: pg.PoolClient,
  input: RecordPeerMeshResponseInput,
): Promise<void> {
  const db = bindScopedDb(client);

  const selection = await getPeerMeshSelectionByClaim(db, input.pariwarId, input.claimCaseId);
  if (!selection) throw new PeerMeshSelectionNotFoundError(input.claimCaseId);
  if (!selection.selectedMemberIds.includes(input.responderMemberId)) {
    throw new PeerMeshResponderNotSelectedError(input.claimCaseId, input.responderMemberId);
  }
  if (selection.outcome !== 'pending') {
    throw new PeerMeshWindowResolvedError(input.claimCaseId, selection.outcome);
  }

  const claimRow = await getClaimCase(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new Error(`[recordPeerMeshResponse] claim ${input.claimCaseId} not found in scope`);
  if (claimRow.currentState !== 'verification_in_progress') {
    throw new PeerMeshClaimNotInVerificationError(input.claimCaseId, claimRow.currentState);
  }

  // Lock this member's ping-intent row — serializes concurrent duplicate submissions.
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
      from_state: 'verification_in_progress',
      to_state: 'verification_in_progress',
      trigger: 'peer_mesh_response',
      actor: 'member',
      responder_member_id: input.responderMemberId,
      response: input.response,
    },
    actorId: input.responderMemberId,
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
