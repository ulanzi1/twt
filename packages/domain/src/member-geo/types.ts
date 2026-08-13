// Member→geo attribution TYPES — Story 1.19 (Task 2; AC1, AC2).
//
// ⭐ A LEAF MODULE, deliberately. It imports only `../schema/*` types and nothing from `geo-tree/`.
// A type-only import that later becomes a VALUE import across `member-geo` → `geo-tree` would
// materialize a module-init cycle that breaks CONSUMING packages at runtime while typecheck, lint
// and the local suite all stay green ([[project_type_only_import_cycle_trap]]). Keeping the shared
// shapes here means a consumer can name the contract without pulling in either implementation.

import type { GeoTreeNodeDimension } from '../schema/geo_tree_versions.js';

/**
 * WHY a level is absent. ⭐ A CLOSED FIVE-VALUE UNION (Decision `2026-08-13-103`, D6) — no additions
 * without a fresh ruling, so consumers can branch exhaustively and logs stay greppable.
 *
 * ⛔ A free-text reason is rejected on purpose: this is the *"anonymous" diagnostic log* discipline
 * ([[project_anonymous_diagnostic_log_convention]]) — the signal lives in a closed vocabulary, not
 * in prose a future reader has to parse.
 *
 * | reason                     | meaning                                                          |
 * |----------------------------|------------------------------------------------------------------|
 * | `no-posting-row`           | the member has NO `member_postings` row → **no geo at all**       |
 * | `no-tree-published`        | the Pariwar has published no tree (`loadGeoTree` → `null`)        |
 * | `node-not-in-tree`         | the district value is not a node in the in-force tree             |
 * | `no-ancestor-at-dimension` | the tree HAS the district, but nothing above it at that dimension |
 * | `no-member-attribute`      | PERMANENT — `block` (D5). No tree can ever supply it.             |
 */
export const MEMBER_GEO_ABSENCE_REASONS = [
  'no-posting-row',
  'no-tree-published',
  'node-not-in-tree',
  'no-ancestor-at-dimension',
  'no-member-attribute',
] as const;

/** Why a member-geo level could not be supplied. See {@link MEMBER_GEO_ABSENCE_REASONS}. */
export type MemberGeoAbsenceReason = (typeof MEMBER_GEO_ABSENCE_REASONS)[number];

/**
 * ⭐ TYPED ABSENCE — the Story 8.4 nominee-VPA discipline ([[project_nominee_vpa_deferred_seam]]).
 *
 * ⛔ `{available: false, reason}` and `null` are NOT the same value, and the difference is the whole
 * point of AC1: a null-collapsed level tells a consumer "no data", while a typed absence tells it
 * *which* of five distinguishable situations produced the gap. Never guess, never null-collapse.
 */
export type MemberGeoLevel =
  | { available: true; value: string }
  | { available: false; reason: MemberGeoAbsenceReason };

/**
 * A member's resolved geography. Every level is INDEPENDENTLY typed-absent.
 *
 * ⛔ **Nothing may imply a member necessarily resolves to all four levels.** A Pariwar publishing
 * only districts yields no `state` and no `block`, and that is a **first-class answer, not a
 * degraded one**.
 *
 * ── The realistic resolution matrix (D5) ────────────────────────────────────────────────────────
 * | level      | available when                                                                    |
 * |------------|-----------------------------------------------------------------------------------|
 * | `pariwar`  | **always** — it is `members.pariwar_id`, the tenancy key itself                    |
 * | `district` | the member has ≥1 `member_postings` row                                           |
 * | `state`    | ⋯ **and** the in-force tree contains that district **and** an ancestor at `state`  |
 * | `block`    | ⛔ **NEVER** — no member attribute exists (see `block` below)                      |
 */
export interface MemberGeoNode {
  /** Always available: the tenancy key. */
  pariwar: MemberGeoLevel;
  /** From the tree, by walking UP from the member's district. */
  state: MemberGeoLevel;
  /** The member's newest `member_postings.district` (D3 ordering). */
  district: MemberGeoLevel;
  /**
   * ⛔ **PERMANENTLY `{available: false, reason: 'no-member-attribute'}` (D5).**
   *
   * A posting supplies a **district**; ancestry walks **UP**; `block` sits **BELOW** `district`. So
   * no tree, however complete, can ever populate this — the resolver only walks
   * `descendant → ancestor` (`geo-tree/resolver.ts:152-157`). The reason is deliberately DISTINCT
   * from the tree-shaped absences: collapsing it into `node-not-in-tree` would tell a future reader
   * that a richer tree lights it up. It does not. Only a new member attribute would, and that is
   * not this story (Story 1.19 AC4 / scope boundary).
   */
  block: MemberGeoLevel;
}

/** The geo dimensions a member can be attributed at. Mirrors `GeoTreeNodeDimension` + `pariwar`. */
export type MemberGeoDimension = GeoTreeNodeDimension | 'pariwar';

/** Convenience constructor for a present level. */
export function geoPresent(value: string): MemberGeoLevel {
  return { available: true, value };
}

/** Convenience constructor for a typed-absent level. */
export function geoAbsent(reason: MemberGeoAbsenceReason): MemberGeoLevel {
  return { available: false, reason };
}

/**
 * The resolved `state` value, or `null` — the ONE place a typed absence is intentionally narrowed,
 * for consumers that genuinely only need "which state, if any".
 *
 * ⛔ Do NOT use this to store or pass geo around: it discards exactly the distinction AC1 exists to
 * preserve. It is a comparison helper for a predicate that is about to answer a boolean anyway.
 */
export function geoValueOrNull(level: MemberGeoLevel): string | null {
  return level.available ? level.value : null;
}
