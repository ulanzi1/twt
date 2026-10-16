// Deterministic peer-mesh selection engine — Story 6.6 (Task 1; AC1, AC5).
//
// THE load-bearing primitive: `selectPeerMesh` picks the `count` (default 5) NEAREST
// members to ping for peer verification of a claim. It is PURE + DETERMINISTIC +
// REPLAYABLE — the single most important property in this story:
//
//   given (deceased, candidates, metric, count) the output member ids + their ORDER are
//   BYTE-IDENTICAL across replays and across machines.
//
// ── How determinism is guaranteed ─────────────────────────────────────────────
//   · NO clock, NO randomness, NO I/O, NO mutable module state. The function reads only
//     its arguments (mirrors the claim/state.ts reducer's purity contract).
//   · The comparator (from the metric registry) imposes a TOTAL ORDER — it ends in the
//     `memberId` tiebreak, so two distinct candidates NEVER compare equal. A total order
//     makes the top-N unique + resolution-order-independent (a partial order would leave
//     ties resolved by Array.sort's engine-specific behaviour → non-deterministic).
//   · Determinism is by PERSISTED SNAPSHOT, not by live query (Dev Notes): the CALLER
//     snapshots the candidate set at selection time + persists it; replay re-runs THIS
//     function on the persisted snapshot. This module only owns the pure ranking — it is
//     the caller's job (the select job / `persistPeerMeshSelection`) to freeze the input.
//
// ⭐ Story 6.36 (SW18 — `2026-10-14-330` supersedes 6.6's Decision D3 for new selections): the WORKPLACE is now an
// input — through a NEW registry entry (`workplace_named_v1`, `kind: 'grouped'`) and its own pure function
// (`selectPeerMeshGrouped`), ⛔ a branch inside `selectPeerMesh`. The ONE dispatch on the metric's `kind` is
// `runPeerMeshMetric`, used by the job AND by replay (`replayPeerMeshSelection`). DO NOT add geo / lat-lng /
// contribution-time inputs here — those substrate fields do not exist; a richer ranking lands as a NEW metric id.

import { createHash } from 'node:crypto';

import { memberId as toMemberId, type MemberId } from '../ids/index.js';
import type {
  ClaimPeerMeshSelectionRow,
  PeerMeshDistrictSnapshotRow,
  PeerMeshGroupedSnapshotRow,
  PeerMeshSource,
} from '../schema/claim_peer_mesh_selections.js';
import {
  resolvePeerMeshMetric,
  type PeerMeshCandidate,
  type PeerMeshCandidateGroup,
  type PeerMeshDeceased,
  type PeerMeshGroupedCandidate,
  type PeerMeshGroupedMetricConfig,
  type PeerMeshMetricConfig,
  type PeerMeshRankedMetricConfig,
} from './peer-mesh-metric-registry.js';

// NOTE: PeerMeshCandidate / PeerMeshDeceased / PeerMeshMetricConfig are re-exported from
// the claim barrel via `peer-mesh-metric-registry.js` (the canonical home) — NOT re-exported
// here, to avoid an ambiguous duplicate `export *` at the barrel.

/** The default mesh size (FR-39 — "the 5 nearest members"). */
export const DEFAULT_PEER_MESH_COUNT = 5;

/** Input to `selectPeerMesh`. `candidates` is the FROZEN snapshot (persisted for replay). */
export interface PeerMeshSelectionInput {
  readonly deceasedMemberId: MemberId;
  readonly claimCaseId: string;
  readonly deceased: PeerMeshDeceased;
  readonly candidates: readonly PeerMeshCandidate[];
  /** A RANKED metric (Story 6.36 AC3 — a caller holding a resolved union narrows first, or uses `runPeerMeshMetric`). */
  readonly metric: PeerMeshRankedMetricConfig;
  /** How many to select (default {@link DEFAULT_PEER_MESH_COUNT}). */
  readonly count?: number;
}

/** Output of `selectPeerMesh`. `selectedMemberIds` is the ORDERED top-N (order is load-bearing). */
export interface PeerMeshSelectionResult {
  /** The ordered nearest member ids (≤ `count`). Order == the metric's total order. */
  readonly selectedMemberIds: readonly MemberId[];
  /** How many were actually selected (< count when fewer candidates exist — degenerate case). */
  readonly selectedCount: number;
  readonly metricId: string;
  readonly metricVersion: number;
}

/**
 * Deterministically select the `count` nearest candidates. Pure — same input always
 * yields the same ordered output. When fewer than `count` candidates exist, returns as
 * many as available + the honest `selectedCount` (degenerate case — does NOT throw; the
 * caller decides whether too-few candidates is a problem).
 *
 * The input `candidates` array is NOT mutated (a defensive copy is sorted) so a caller
 * that re-uses the snapshot for replay sees the same array back.
 */
export function selectPeerMesh(input: PeerMeshSelectionInput): PeerMeshSelectionResult {
  const count = input.count ?? DEFAULT_PEER_MESH_COUNT;
  const { metric, deceased } = input;

  // Defensive copy → total-order sort (never mutate the caller's snapshot).
  const ordered = [...input.candidates].sort((a, b) => metric.compare(deceased, a, b));

  const selected = ordered.slice(0, Math.max(0, count)).map((c) => c.memberId);
  return {
    selectedMemberIds: selected,
    selectedCount: selected.length,
    metricId: metric.metricId,
    metricVersion: metric.metricVersion,
  };
}

// ── Story 6.36 — the grouped engine (`workplace_named_v1`; AC2; I7) ─────────────────────────────────────────────────

/** Input to {@link selectPeerMeshGrouped}. `candidates` is the FROZEN snapshot (persisted for replay). */
export interface PeerMeshGroupedSelectionInput {
  /**
   * The BRANDED (lower-case) id of the ANCHOR claim — the claim whose filing the cut is (`2026-10-16-340` call 1;
   * `resolvePeerMeshFilingCut`). It salts the rank key, so every claim anchored on the same filing ranks the same pool
   * the same way: a refile asks the same people. ⛔ The raw payload string.
   */
  readonly anchorClaimCaseId: string;
  readonly candidates: readonly PeerMeshGroupedCandidate[];
  readonly metric: PeerMeshGroupedMetricConfig;
}

/** Output of {@link selectPeerMeshGrouped}. `selectedMemberIds` is a PREFIX of `rankedMemberIds` (0163's trigger). */
export interface PeerMeshGroupedSelectionResult {
  /** Which group won; `null` when nobody can be asked. */
  readonly source: PeerMeshSource | null;
  readonly selectedMemberIds: readonly MemberId[];
  /** The winning group's ranking, truncated to `metric.rankedMax` (6.27c replaces a skipped person from it). */
  readonly rankedMemberIds: readonly MemberId[];
  readonly metricId: string;
  readonly metricVersion: number;
}

/** Thrown when a member id appears twice in a grouped input (a join duplicate would select one person twice). */
export class PeerMeshDuplicateCandidateError extends Error {
  constructor(public readonly memberId: string) {
    super(`[peer-mesh] duplicate candidate ${memberId} in the grouped input`);
    this.name = 'PeerMeshDuplicateCandidateError';
  }
}

/** The ranking key: sha256(anchorClaimCaseId + ':' + memberId) as lower-case hex — pure, deterministic, salted per ANCHOR. */
function rankKey(anchorClaimCaseId: string, memberId: string): string {
  return createHash('sha256').update(`${anchorClaimCaseId}:${memberId}`).digest('hex');
}

/** Order `part` by ascending rank key (ASCII compare — ⛔ locale-dependent `localeCompare`); member id breaks a tie. */
function orderByKey(anchorClaimCaseId: string, part: readonly PeerMeshGroupedCandidate[]): MemberId[] {
  return part
    .map((c) => ({ id: c.memberId, key: rankKey(anchorClaimCaseId, c.memberId) }))
    .sort((a, b) => (a.key !== b.key ? (a.key < b.key ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((x) => x.id);
}

/** A workplace split: its SETTLED colleagues first, then the rest — each by the rank key. */
function orderSplit(anchorClaimCaseId: string, all: readonly PeerMeshGroupedCandidate[], group: PeerMeshCandidateGroup): MemberId[] {
  const split = all.filter((c) => c.group === group);
  return [
    ...orderByKey(anchorClaimCaseId, split.filter((c) => c.settled)),
    ...orderByKey(anchorClaimCaseId, split.filter((c) => !c.settled)),
  ];
}

/**
 * Choose who is asked (`-310` CF4 A; `-331` SC1 A; 6.36a SW18 / SW22). Pure — ⛔ clock, ⛔ randomness, ⛔ I/O.
 *   · the WORKPLACE group = `workplace_previous` (present only when the previous workplace COUNTED) then
 *     `workplace_current`; within each, the settled first, then the rest; each part by the rank key;
 *   · the NAMED group = by the rank key alone (`settled` is ⛔ read for it);
 *   · the first non-empty group wins — ⛔ never two mixed, ⛔ a fill-up — capped at `workplaceCount` / `namedCount`;
 *     the ranking is the winning group's first `rankedMax` (an office of 600 never fails the job).
 * Throws {@link PeerMeshDuplicateCandidateError} on a duplicate member id. The input is ⛔ mutated.
 */
export function selectPeerMeshGrouped(input: PeerMeshGroupedSelectionInput): PeerMeshGroupedSelectionResult {
  const { anchorClaimCaseId, candidates, metric } = input;
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.memberId)) throw new PeerMeshDuplicateCandidateError(c.memberId);
    seen.add(c.memberId);
  }

  const workplace = [
    ...orderSplit(anchorClaimCaseId, candidates, 'workplace_previous'),
    ...orderSplit(anchorClaimCaseId, candidates, 'workplace_current'),
  ];
  const named = orderByKey(anchorClaimCaseId, candidates.filter((c) => c.group === 'named'));

  const [source, ranking, count]: [PeerMeshSource | null, MemberId[], number] =
    workplace.length > 0
      ? ['workplace', workplace, metric.workplaceCount]
      : named.length > 0
        ? ['named_by_member', named, metric.namedCount]
        : [null, [], 0];

  const rankedMemberIds = ranking.slice(0, metric.rankedMax);
  return {
    source,
    selectedMemberIds: rankedMemberIds.slice(0, Math.min(count, rankedMemberIds.length)),
    rankedMemberIds,
    metricId: metric.metricId,
    metricVersion: metric.metricVersion,
  };
}

// ── Story 6.36 — the ONE dispatch (AC3) ───────────────────────────────────────────────────────────────────────────────

/** A frozen candidate of EITHER metric — its shape must match the metric's `kind` ({@link runPeerMeshMetric} checks). */
export type PeerMeshSnapshotCandidate = PeerMeshCandidate | PeerMeshGroupedCandidate;

export interface PeerMeshRunInput {
  readonly metric: PeerMeshMetricConfig;
  /** The BRANDED claim id (the ranked metric's input). */
  readonly claimCaseId: string;
  /** The BRANDED ANCHOR claim id — the grouped rank key's salt (`2026-10-16-340` call 1); unread by the ranked metric. */
  readonly anchorClaimCaseId: string;
  readonly deceasedMemberId: MemberId;
  /** The 6.6 reference point — read by the ranked metric only. */
  readonly deceased: PeerMeshDeceased;
  readonly candidates: readonly PeerMeshSnapshotCandidate[];
}

/** The common result of either metric. `rankedMemberIds` / `source` are `null` for a ranked (6.6) metric. */
export interface PeerMeshRunResult {
  readonly metricId: string;
  readonly metricVersion: number;
  readonly source: PeerMeshSource | null;
  readonly selectedMemberIds: readonly MemberId[];
  readonly rankedMemberIds: readonly MemberId[] | null;
}

/** Thrown when a candidate's shape is not the metric's (a grouped row under a ranked metric, or the reverse). */
export class PeerMeshCandidateShapeError extends Error {
  constructor(public readonly metricId: string) {
    super(`[peer-mesh] a candidate's shape does not match metric ${metricId}`);
    this.name = 'PeerMeshCandidateShapeError';
  }
}

function isGroupedCandidate(c: PeerMeshSnapshotCandidate): c is PeerMeshGroupedCandidate {
  return 'group' in c;
}

/**
 * The ONE dispatch on the metric's `kind` — the select job AND replay call THIS (Story 6.36 AC3), so the two can never
 * run different code for the same stored id. Throws {@link PeerMeshCandidateShapeError} on a mismatched candidate.
 */
export function runPeerMeshMetric(input: PeerMeshRunInput): PeerMeshRunResult {
  const { metric } = input;
  if (metric.kind === 'grouped') {
    const candidates = input.candidates.map((c) => {
      if (!isGroupedCandidate(c)) throw new PeerMeshCandidateShapeError(metric.metricId);
      return c;
    });
    return selectPeerMeshGrouped({ anchorClaimCaseId: input.anchorClaimCaseId, candidates, metric });
  }
  const candidates = input.candidates.map((c) => {
    if (isGroupedCandidate(c)) throw new PeerMeshCandidateShapeError(metric.metricId);
    return c;
  });
  const r = selectPeerMesh({
    deceasedMemberId: input.deceasedMemberId,
    claimCaseId: input.claimCaseId,
    deceased: input.deceased,
    candidates,
    metric,
  });
  return {
    metricId: r.metricId,
    metricVersion: r.metricVersion,
    source: null,
    selectedMemberIds: r.selectedMemberIds,
    rankedMemberIds: null,
  };
}

/** A persisted snapshot row → the engine's candidate (ISO → `Date`, the id branded). */
export function peerMeshCandidateFromSnapshot(row: PeerMeshDistrictSnapshotRow | PeerMeshGroupedSnapshotRow): PeerMeshSnapshotCandidate {
  if ('group' in row) return { memberId: toMemberId(row.memberId), group: row.group, settled: row.settled };
  return { memberId: toMemberId(row.memberId), district: row.district, createdAt: new Date(row.createdAt) };
}

/**
 * Re-run a STORED selection from its persisted row ALONE (I7 — ⛔ a live re-read): the stored `metric_id` (⛔ the
 * default), the stored snapshot, the stored 6.6 reference point, the stored ANCHOR claim (`-340` call 1 — ⛔ re-derived
 * from live claims, which a later innocence finding could move). Byte-identical to what the job computed. A ranked (6.6)
 * row has ⛔ anchor and never reads one ⇒ its own claim id; a GROUPED row with ⛔ anchor THROWS (0163's "filled" CHECK
 * forbids it — ⛔ silently re-salted by its own claim, which would rank a refile differently).
 */
export function replayPeerMeshSelection(row: ClaimPeerMeshSelectionRow): PeerMeshRunResult {
  const metric = resolvePeerMeshMetric(row.metricId);
  if (metric.kind === 'grouped' && row.anchorClaimCaseId == null) {
    throw new Error(`[peer-mesh] selection ${row.selectionId} (${row.metricId}) has no anchor claim — it cannot be replayed`);
  }
  return runPeerMeshMetric({
    metric,
    claimCaseId: row.claimCaseId,
    anchorClaimCaseId: row.anchorClaimCaseId ?? row.claimCaseId,
    deceasedMemberId: row.deceasedMemberId,
    deceased: { district: row.deceasedDistrict, createdAt: row.deceasedCreatedAt },
    candidates: row.candidateSnapshot.map(peerMeshCandidateFromSnapshot),
  });
}
