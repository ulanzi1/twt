// Peer-mesh "nearest" metric registry — Story 6.6 (Task 1; AC1, Decision D3).
//
// The ONE authority for how "nearest" is defined when the peer mesh selects the 5
// members to ping. FR-39 lists "district > block > school proximity + geographic
// distance + contribution-time-correlation", but the substrate supports almost none
// of that TODAY (Dev Notes "The `nearest` metric — Decision D3"):
//   · `members` has NO district/block/geo/cohort columns.
//   · `member_addresses.address_line` is Tier-1 CIPHERTEXT — unusable as a sort key + PII.
//   · `member_postings.district` IS plaintext non-PII — the ONE usable "district" signal.
//   · contribution-time-correlation is an Epic 8/9 concern (the engine must NEVER infer
//     contribution facts — see the engine-never-infers discipline).
//
// So v1 ships ONE metric — `district_cohort_v1` — expressed through this registry so
// richer metrics drop in as NEW registry entries (+ their substrate) WITHOUT touching
// the pure engine (`peer-mesh.ts`). This mirrors the niyamavali clause-registry
// DISCIPLINE ("the engine reads config, never hardcodes") — NOT its structure: the
// niyamavali registry is a DB-backed, amendment/diff-stored table; THIS registry is a
// static TypeScript table whose entries carry an explicit `metricVersion`. There is no
// DB registry, no amendment workflow, no diff-storage subsystem here.
//
// RE-TUNE BY EDITING DATA, NEVER BY BRANCHING IN THE ENGINE: to change the ranking,
// add a new entry with a bumped `metricVersion` (or a new `metricId`). The engine
// applies whatever comparator the resolved config carries.

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
 * A resolved metric config the pure engine consumes. `compare` is a TOTAL-ORDER
 * comparator over candidates relative to the deceased: it returns <0 when `a` ranks
 * nearer than `b`, >0 when farther, and — because every metric MUST end in the
 * `memberId` tiebreak — NEVER 0 for two distinct candidates (that totality is what
 * makes the top-N replay-deterministic; see `peer-mesh.ts`).
 */
export interface PeerMeshMetricConfig {
  readonly metricId: string;
  readonly metricVersion: number;
  /** Human-readable description of the ranking (audit / debugging only). */
  readonly describe: string;
  /** Total-order comparator relative to the deceased (see interface doc). */
  readonly compare: (deceased: PeerMeshDeceased, a: PeerMeshCandidate, b: PeerMeshCandidate) => number;
}

/** The default metric id — resolved when a caller does not pin an explicit one. */
export const DEFAULT_PEER_MESH_METRIC_ID = 'district_cohort_v1';

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

const districtCohortV1: PeerMeshMetricConfig = {
  metricId: DEFAULT_PEER_MESH_METRIC_ID,
  metricVersion: 1,
  describe:
    'Rank by same posting district as the deceased, then cohort proximity (|Δcreated_at|), then member_id ascending (total-order tiebreak).',
  compare: districtCohortV1Compare,
};

/**
 * The registry — the ONE authority, keyed by `metricId`. Adding a richer metric means
 * adding an entry HERE (+ its substrate), never adding a branch to the engine.
 */
export const PEER_MESH_METRIC_REGISTRY: Readonly<Record<string, PeerMeshMetricConfig>> = {
  [districtCohortV1.metricId]: districtCohortV1,
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
 * (`district_cohort_v1`). With an explicit id, returns that entry or throws
 * `UnknownPeerMeshMetricError` (a typo must fail loudly, never silently pick a default —
 * replay determinism depends on the SAME metric resolving every time).
 */
export function resolvePeerMeshMetric(metricId?: string): PeerMeshMetricConfig {
  const id = metricId ?? DEFAULT_PEER_MESH_METRIC_ID;
  const entry = PEER_MESH_METRIC_REGISTRY[id];
  if (!entry) throw new UnknownPeerMeshMetricError(id);
  return entry;
}
