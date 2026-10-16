// Peer-mesh metric registry — Story 6.6 (Task 1; AC1, Decision D3); Story 6.36 (Task 2; AC2, AC3 — SW18).
//
// The ONE authority for how the people asked about a death are chosen. Two entries, keyed by id:
//
//   · `district_cohort_v1` (6.6, `kind: 'ranked'`) — a total-order comparator: same posting district as the deceased,
//     then cohort proximity, then member_id. Kept so every stored 6.6 selection still REPLAYS (SF6); ⛔ the default.
//   · `workplace_named_v1` (6.36, `kind: 'grouped'`) — ⭐ THE DEFAULT. `-310` CF4 A (Trustee-ratified), `-331` SC1 A:
//     the members at the member's workplace (the previous one's first when the current run began < 90 days before the
//     filing; long-standing colleagues first); otherwise up to three people the member named who agreed; otherwise
//     nobody. ⛔ Never the district. SW18 (`2026-10-14-330`) supersedes 6.6's Decision D3 for new selections.
//
// RE-TUNE BY EDITING DATA, NEVER BY BRANCHING IN THE ENGINE: a changed ranking is a NEW entry with a NEW `metricId`
// (⛔ a version bump of a stored id — replay resolves the stored id). The engine (`peer-mesh.ts`) dispatches on `kind`
// in ONE function (`runPeerMeshMetric`), which the job AND replay both use. This mirrors the niyamavali registry's
// DISCIPLINE ("the engine reads config, never hardcodes") — NOT its structure: this is a static TypeScript table.

import type { MemberId } from '../ids/index.js';

/**
 * A candidate member for peer-mesh selection — the pure engine's per-candidate input
 * row (also the exact shape persisted in `candidate_snapshot`). All fields non-PII:
 * `memberId` (opaque id), `district` (plaintext posting district — nullable when the
 * member has no posting), `createdAt` (the cohort proxy).
 */
export interface PeerMeshCandidate {
  readonly memberId: MemberId;
  readonly district: string | null;
  readonly createdAt: Date;
}

/**
 * The deceased member's selection-relevant attributes (the comparator reference point).
 * Same non-PII fields as a candidate minus the id.
 */
export interface PeerMeshDeceased {
  readonly district: string | null;
  readonly createdAt: Date;
}

/**
 * A resolved RANKED metric config (`selectPeerMesh` consumes it). `compare` is a TOTAL-ORDER
 * comparator over candidates relative to the deceased: it returns <0 when `a` ranks
 * nearer than `b`, >0 when farther, and — because every metric MUST end in the
 * `memberId` tiebreak — NEVER 0 for two distinct candidates (that totality is what
 * makes the top-N replay-deterministic; see `peer-mesh.ts`).
 */
export interface PeerMeshRankedMetricConfig {
  readonly kind: 'ranked';
  readonly metricId: string;
  readonly metricVersion: number;
  /** Human-readable description of the ranking (audit / debugging only). */
  readonly describe: string;
  /** Total-order comparator relative to the deceased (see interface doc). */
  readonly compare: (deceased: PeerMeshDeceased, a: PeerMeshCandidate, b: PeerMeshCandidate) => number;
}

/**
 * Story 6.36 (AC2) — which group a `workplace_named_v1` candidate is in. ⚠ LOCKSTEP with `PeerMeshSnapshotGroup`
 * (`schema/claim_peer_mesh_selections.ts` — the persisted snapshot row).
 */
export type PeerMeshCandidateGroup = 'workplace_previous' | 'workplace_current' | 'named';

/**
 * Story 6.36 (AC2; I7) — a `workplace_named_v1` candidate (also the exact shape persisted in `candidate_snapshot`).
 * `settled` = the EARLIEST row of the candidate's current run at that workplace was RECORDED (`created_at`) 90 days or
 * more before the cut — ⛔ the self-declared `started_on` (6.36a SW22; `-331` SC1 A). Always `false` for `named`.
 */
export interface PeerMeshGroupedCandidate {
  readonly memberId: MemberId;
  readonly group: PeerMeshCandidateGroup;
  readonly settled: boolean;
}

/**
 * Story 6.36 (AC2) — a resolved GROUPED metric config (`selectPeerMeshGrouped` consumes it): the first non-empty group
 * wins — ⛔ never two mixed — capped at `workplaceCount` / `namedCount`; the stored ranking is the winning group's first
 * `rankedMax`.
 */
export interface PeerMeshGroupedMetricConfig {
  readonly kind: 'grouped';
  readonly metricId: string;
  readonly metricVersion: number;
  /** Human-readable description of the ranking (audit / debugging only). */
  readonly describe: string;
  /** How many are selected when the workplace group wins (FR-39's five). */
  readonly workplaceCount: number;
  /** How many are selected when the named group wins (`-310` CF4 A (2) — up to three). */
  readonly namedCount: number;
  /** The stored ranking's length cap (0163's `…_ranked_max500`). */
  readonly rankedMax: number;
}

/** A resolved metric config — discriminated on `kind` (Story 6.36 AC3). */
export type PeerMeshMetricConfig = PeerMeshRankedMetricConfig | PeerMeshGroupedMetricConfig;

/**
 * The default metric id — resolved when a caller does not pin an explicit one. ⭐ Story 6.36 (AC3) moved it to
 * `workplace_named_v1`; ⚠ every REPLAY passes the stored id (never the default).
 */
export const DEFAULT_PEER_MESH_METRIC_ID = 'workplace_named_v1';

/**
 * `district_cohort_v1` comparator (AC1). A strict lexicographic composition of three
 * keys, the last of which (`memberId`) guarantees totality:
 *   (1) DISTRICT MATCH FIRST — a candidate whose posting district equals the deceased's
 *       (both non-null) ranks ahead of one that does not. A null district on either side
 *       is NOT a match (we never treat "no posting" as co-located).
 *   (2) COHORT PROXIMITY — ascending `|candidate.createdAt − deceased.createdAt|` (ms).
 *   (3) MEMBER_ID ASCENDING — lexicographic string compare; the total-order tiebreak so
 *       two candidates equal on (1)+(2) still order deterministically (never a tie).
 */
function districtCohortV1Compare(
  deceased: PeerMeshDeceased,
  a: PeerMeshCandidate,
  b: PeerMeshCandidate,
): number {
  // (1) district match (true sorts first → treat match as 0, non-match as 1).
  const aMatch = a.district !== null && a.district === deceased.district ? 0 : 1;
  const bMatch = b.district !== null && b.district === deceased.district ? 0 : 1;
  if (aMatch !== bMatch) return aMatch - bMatch;

  // (2) cohort proximity — smaller |Δcreated_at| is nearer. Null deceased.createdAt
  //     cannot happen (a real deceased row always has created_at); guarded anyway by
  //     the numeric subtraction below producing a finite delta.
  const ref = deceased.createdAt.getTime();
  const aDelta = Math.abs(a.createdAt.getTime() - ref);
  const bDelta = Math.abs(b.createdAt.getTime() - ref);
  if (aDelta !== bDelta) return aDelta - bDelta;

  // (3) member_id ascending — the total-order tiebreak (string compare; ids are lowercased UUIDs).
  if (a.memberId < b.memberId) return -1;
  if (a.memberId > b.memberId) return 1;
  return 0;
}

// ⚠ A LITERAL id (Story 6.36 AC3) — it was `DEFAULT_PEER_MESH_METRIC_ID`, and moving the default would have RENAMED v1
// and broken the replay of every stored selection.
const districtCohortV1: PeerMeshRankedMetricConfig = {
  kind: 'ranked',
  metricId: 'district_cohort_v1',
  metricVersion: 1,
  describe:
    'Rank by same posting district as the deceased, then cohort proximity (|Δcreated_at|), then member_id ascending (total-order tiebreak).',
  compare: districtCohortV1Compare,
};

/** Story 6.36 (SW18) — the workplace, otherwise the named people, otherwise nobody. */
const workplaceNamedV1: PeerMeshGroupedMetricConfig = {
  kind: 'grouped',
  metricId: 'workplace_named_v1',
  metricVersion: 1,
  describe:
    "The deceased's workplace (the previous one's people first when it counts, then the current one's; settled colleagues first in each), otherwise the people they named who agreed, otherwise nobody — each part by ascending sha256(claimCaseId:memberId).",
  workplaceCount: 5,
  namedCount: 3,
  rankedMax: 500,
};

/**
 * The registry — the ONE authority, keyed by `metricId`. Adding a richer metric means
 * adding an entry HERE (+ its substrate), never adding a branch to the engine.
 */
export const PEER_MESH_METRIC_REGISTRY: Readonly<Record<string, PeerMeshMetricConfig>> = {
  [districtCohortV1.metricId]: districtCohortV1,
  [workplaceNamedV1.metricId]: workplaceNamedV1,
} as const;

/** Thrown when a caller pins a `metricId` that is not in the registry. */
export class UnknownPeerMeshMetricError extends Error {
  constructor(public readonly metricId: string) {
    super(`[peer-mesh] unknown metric id ${JSON.stringify(metricId)}`);
    this.name = 'UnknownPeerMeshMetricError';
  }
}

/**
 * Resolve a metric config. With no argument (or `undefined`) returns the default
 * (`workplace_named_v1` since Story 6.36). With an explicit id, returns that entry or throws
 * `UnknownPeerMeshMetricError` (a typo must fail loudly, never silently pick a default —
 * replay determinism depends on the SAME metric resolving every time).
 */
export function resolvePeerMeshMetric(metricId?: string): PeerMeshMetricConfig {
  const id = metricId ?? DEFAULT_PEER_MESH_METRIC_ID;
  const entry = PEER_MESH_METRIC_REGISTRY[id];
  if (!entry) throw new UnknownPeerMeshMetricError(id);
  return entry;
}
