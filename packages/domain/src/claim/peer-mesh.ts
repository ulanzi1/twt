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
// DO NOT add geo / lat-lng / school-proximity / contribution-time inputs here — those
// substrate fields do not exist (Decision D3). Richer ranking lands as a NEW metric
// registry entry, never as a new branch in this engine.

import type { MemberId } from '../ids/index.js';
import type {
  PeerMeshCandidate,
  PeerMeshDeceased,
  PeerMeshMetricConfig,
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
  readonly metric: PeerMeshMetricConfig;
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
