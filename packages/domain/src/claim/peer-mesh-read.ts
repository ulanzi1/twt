// Peer-mesh candidate-roster snapshot read — Story 6.6 (Task 2; AC2).
//
// A transport-free accessor that captures the candidate member set at SELECTION TIME —
// the frozen input the pure engine (`peer-mesh.ts`) ranks and the audit-replay source
// (`candidate_snapshot`) persisted on `claim_peer_mesh_selections`. It reads ONLY the
// three non-PII signals the v1 `district_cohort_v1` metric needs (Decision D3): the
// opaque `member_id`, the member's LATEST posting `district` (plaintext non-PII), and
// `created_at` (the cohort proxy).
//
// ── Discipline (mirrors getMemberPostingLatest / getMemberKycProfile) ─────────
//   · Pure read — no decryption, no I/O beyond the query, no event emission. The job
//     orchestrates; this only reads.
//   · District is PLAINTEXT non-PII (`member_postings` header) — safe to select, persist,
//     and log. The encrypted `member_addresses` line is NEVER touched here.
//   · The roster is "active members" — the same ACTIVE semantics the validity service
//     uses (`ACTIVE_STATES = ['active']`). Domain cannot import @twt/validity-service
//     (that would cycle — validity-service depends on @twt/domain), so the active
//     predicate is expressed directly against the `members.state` enum here (RECORDED
//     variance from Task 2's "reuse validity.ACTIVE_STATES" — same value, legal import).
//   · NO user-controlled `.limit()` (so no domain-invariants clamp needed) — the whole
//     active roster is the candidate pool; the engine selects the top-5 deterministically.

import { and, asc, eq, ne, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshSelectionId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { members } from '../schema/members.js';
import { memberPostings } from '../schema/member_postings.js';
import {
  type ClaimPeerMeshSelectionRow,
  claimPeerMeshSelections,
} from '../schema/claim_peer_mesh_selections.js';
import {
  type ClaimPeerMeshPingRow,
  claimPeerMeshPings,
} from '../schema/claim_peer_mesh_pings.js';
import type { PeerMeshCandidate, PeerMeshDeceased } from './peer-mesh-metric-registry.js';

export interface PeerMeshCandidateSnapshotInput {
  pariwarId: PariwarId;
  /** The deceased — always excluded from their own claim's mesh. */
  deceasedMemberId: MemberId;
  /** Optional actor to exclude (e.g. the claimant/filer), if distinct from the deceased. */
  excludeActorId?: MemberId | null;
}

/**
 * Capture the peer-mesh candidate snapshot for a claim: every ACTIVE member in the
 * Pariwar except the deceased (and an optional excluded actor), each with their latest
 * posting district + `created_at`. Tenant-scoped (RLS + the explicit `pariwar_id`
 * predicate). Ordered by `member_id` so the persisted snapshot is stable for audit
 * (selection itself is order-independent — the engine imposes a total order).
 *
 * The latest district is the newest `member_postings` row (by `created_at`, then
 * `posting_id` as a deterministic tiebreak — mirrors `getMemberPostingLatest` semantics
 * with an added tiebreak so a bulk-seed created_at tie resolves the same every run).
 * Members with NO posting yield `district: null` (degrades to cohort+tiebreak ranking).
 *
 * CORRELATION FIX (review, live-DB flake): the subquery's WHERE clause references the
 * OUTER `members` row by a LITERAL `"members"."member_id"` / `"members"."pariwar_id"`
 * qualifier, NOT by interpolating the `members.memberId`/`members.pariwarId` Column
 * objects. Interpolating the Column object here renders as a BARE unqualified
 * `"member_id"` / `"pariwar_id"` (Drizzle drops the table prefix when the column is
 * referenced from within a projection scoped to that same table) — and because the
 * subquery's OWN `FROM member_postings p` also has columns of those exact names, Postgres
 * resolves the bare reference to the INNER `p.member_id`/`p.pariwar_id` (nearest-scope
 * wins), collapsing the correlation into an always-true `p.member_id = p.member_id`
 * tautology. The subquery then silently returns the latest posting across EVERY member
 * in the RLS-scoped tenant, not the outer row's own member — a live, reproducible
 * (~30-40% of runs) wrong-district bug, not merely a hypothetical.
 */
export async function getPeerMeshCandidateSnapshot(
  db: Db,
  input: PeerMeshCandidateSnapshotInput,
): Promise<PeerMeshCandidate[]> {
  const rows = await db
    .select({
      memberId: members.memberId,
      createdAt: members.createdAt,
      district: sql<string | null>`(
        SELECT p.district
        FROM ${memberPostings} p
        WHERE p.member_id = "members"."member_id" AND p.pariwar_id = "members"."pariwar_id"
        ORDER BY p.created_at DESC, p.posting_id DESC
        LIMIT 1
      )`,
    })
    .from(members)
    .where(
      and(
        eq(members.pariwarId, input.pariwarId),
        eq(members.state, 'active'),
        ne(members.memberId, input.deceasedMemberId),
        input.excludeActorId ? ne(members.memberId, input.excludeActorId) : undefined,
      ),
    )
    .orderBy(asc(members.memberId));

  return rows.map((r) => ({
    memberId: r.memberId,
    district: r.district,
    createdAt: r.createdAt,
  }));
}

/**
 * The deceased member's selection-relevant attributes (the comparator reference point):
 * their latest posting `district` (newest `member_postings` row, `created_at` DESC then
 * `posting_id` DESC) + their `created_at`. Returns `null` when the member row is missing.
 * Tenant-scoped. Non-PII (district plaintext + created_at).
 */
export async function getPeerMeshDeceasedAttributes(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<PeerMeshDeceased | null> {
  const rows = await db
    .select({
      createdAt: members.createdAt,
      // Literal outer-table qualifier — see the correlation-fix note on
      // getPeerMeshCandidateSnapshot above (same bug, same fix, same reason).
      district: sql<string | null>`(
        SELECT p.district
        FROM ${memberPostings} p
        WHERE p.member_id = "members"."member_id" AND p.pariwar_id = "members"."pariwar_id"
        ORDER BY p.created_at DESC, p.posting_id DESC
        LIMIT 1
      )`,
    })
    .from(members)
    .where(and(eq(members.pariwarId, pariwarId), eq(members.memberId, deceasedMemberId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { district: row.district, createdAt: row.createdAt };
}

/**
 * The persisted selection row for a claim (the audit-replay source), or `undefined` when
 * no selection exists yet. Tenant-scoped (RLS + the explicit `pariwar_id` predicate — a
 * cross-tenant guess resolves to `undefined`). The `claim_case_id` UNIQUE guarantees ≤1 row.
 */
export async function getPeerMeshSelectionByClaim(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimPeerMeshSelectionRow | undefined> {
  const rows = await db
    .select()
    .from(claimPeerMeshSelections)
    .where(
      and(
        eq(claimPeerMeshSelections.pariwarId, pariwarId),
        eq(claimPeerMeshSelections.claimCaseId, claimCaseId),
      ),
    )
    .limit(1);
  return rows[0];
}

/**
 * The delivery-neutral ping intents recorded for a selection (one per selected member).
 * Tenant-scoped. Ordered by `member_id` for stable reads.
 */
export async function getPeerMeshPingIntentsBySelection(
  db: Db,
  pariwarId: PariwarId,
  selectionId: PeerMeshSelectionId,
): Promise<ClaimPeerMeshPingRow[]> {
  return db
    .select()
    .from(claimPeerMeshPings)
    .where(
      and(
        eq(claimPeerMeshPings.pariwarId, pariwarId),
        eq(claimPeerMeshPings.selectionId, selectionId),
      ),
    )
    .orderBy(asc(claimPeerMeshPings.memberId));
}

/** A recorded peer-mesh response (from a `claim.peer_mesh_responded` annotation event). */
export interface PeerMeshResponse {
  readonly responderMemberId: string;
  readonly response: 'confirmed' | 'denied' | 'unknown';
}

/**
 * Read the recorded peer-mesh responses for a claim from `events_log` (event-log-as-truth) —
 * every `claim.peer_mesh_responded` event on the claim's stream, in append order. The
 * window-expiry job counts DISTINCT responders from this (a member responding twice is one
 * peer). Non-responses are ABSENCES — they never appear here, and are NEVER inferred as
 * `denied` (AC4). Tenant-scoped by RLS; filtered by `stream_id` (== claim_case_id).
 */
export async function getPeerMeshResponses(
  db: Db,
  claimCaseId: ClaimId,
): Promise<PeerMeshResponse[]> {
  const rows = await db
    .select({ payload: eventsLog.payload })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, claimCaseId),
        eq(eventsLog.eventType, 'claim.peer_mesh_responded'),
      ),
    )
    .orderBy(asc(eventsLog.eventVersion));

  return rows.map((r) => {
    const p = r.payload as { responder_member_id: string; response: PeerMeshResponse['response'] };
    return { responderMemberId: p.responder_member_id, response: p.response };
  });
}

/** Count of DISTINCT responders for a claim (the AR-61 sufficiency threshold input). */
export function distinctPeerMeshResponderCount(responses: readonly PeerMeshResponse[]): number {
  return new Set(responses.map((r) => r.responderMemberId)).size;
}
