// RBAC scope dimensions + (dimension, value) grant model + hierarchical
// containment — Story 1.8 substrate (AC-2).
//
// THE LOAD-BEARING RECONCILIATION. The canonical scope-dimension set is the
// SUPERSET the seeded roles (FR-46) structurally require. Two source docs are
// each individually incomplete:
//
//   | Source                                   | Enum                                          | Missing                              |
//   |------------------------------------------|-----------------------------------------------|--------------------------------------|
//   | architecture §2.6 L1484 + FR-45 (prd L751) | block | district | state | pariwar | global  | no `self` — Field Worker / FR-53 needs it |
//   | epic / user story (epics.md L1120, L1127)   | national | state | district | pariwar | self  | no `block` — Block Admin needs it; `national` ≠ canonical `global` |
//
// A seeded role's scope MUST be expressible in the enum. Neither source can
// express all 12. → Canonical: the UNION the roles require —
// `global | pariwar | state | district | block | self`. Token decisions:
// `national` → `global` (matches architecture + FR-45); KEEP `block` (Block
// Admin); ADD `self` (Field Worker = `field_worker_self`, FR-53). Ordered ceiling
// high→low: `global > pariwar > state > district > block`, with `self` as the
// narrowest (own-records-only). This diverges from BOTH docs and is ratified in
// ADR-0008 + Decision 2026-06-11-044 + a correct-course note patching
// architecture §2.6 L1484 + epics.md L1127. Do NOT silently follow either source.
//
// Scope is `(dimension, value)` + hierarchical CONTAINMENT — not a flat enum
// compare. FR-45's worked example (Anita, District Admin, scope=Patna, can
// approve Patna claims but NOT Vaishali; prd.md L754) proves a grant carries the
// concrete node value and enforcement is containment of the action's target
// locator within the grant's `(dimension, value)`. Containment across the geo
// tree (state→district→block) needs a canonical org hierarchy that does NOT exist
// until Story 1.18 (Geo-Tree Scope Resolver) — so the geo-tree lookup is an INJECTABLE seam
// (default: deny-deeper). Exact-node, `global`, and `self` resolve now; deeper
// geo containment denies until a resolver is supplied (D-item: geo-tree seam).

/**
 * Canonical ordered scope-dimension set, high→low ceiling. Single source of
 * truth for both the domain union type and the `scope_dimension` pgEnum
 * (packages/domain/src/schema/role_grants.ts derives the enum from this tuple).
 */
export const SCOPE_DIMENSIONS = [
  'global',
  'pariwar',
  'state',
  'district',
  'block',
  'self',
] as const;

/** A scope dimension. See SCOPE_DIMENSIONS for the canonical ordered set. */
export type ScopeDimension = (typeof SCOPE_DIMENSIONS)[number];

/**
 * Geo/containment rank for the hierarchical dimensions, high→low (lower number =
 * broader). `self` is deliberately excluded — it is the narrowest dimension and
 * is handled by an explicit special case in `scopeContains`, NOT by numeric rank
 * (it is orthogonal to the geo tree: "own records only", not a node in it).
 */
const GEO_RANK: Record<Exclude<ScopeDimension, 'self'>, number> = {
  global: 0,
  pariwar: 1,
  state: 2,
  district: 3,
  block: 4,
};

const CEILING_RANK: Record<ScopeDimension, number> = {
  ...GEO_RANK,
  self: 5,
};

// ── §RANK-ORDER — the canonical explanation. Cited from every site that used to promise a resolver. ──
//
// Story 10.18 split the accumulated geo-deferral debt into two families, and this note is the answer to
// the first. Sites across `permissions.ts`, `roles.ts` and `apps/api` used to say a `state`-ceiling role
// would gain a `pariwar`-dimension capability "when the Epic-3 geo-tree resolver lands". **That promise
// was never true, and those comments were misdiagnoses rather than pending work.**
//
// A grant whose ceiling is `state` / `district` / `block` can NEVER satisfy a `pariwar`-dimension check,
// and NO organizational tree — however complete — changes that, because no resolver participates in
// either of the two lines that deny it:
//
//   1. `scopeWithinCeiling(dimension, ceiling)` reads **CEILING_RANK** (directly above) and is a PURE
//      NUMERIC COMPARE with **no resolver parameter at all**:
//          scopeWithinCeiling('pariwar', 'state')  →  1 >= 2  →  false
//      `pariwar` is rank 1 and `state` is rank 2 because this ordering is high→low: **lower number =
//      BROADER**. A Pariwar is the tenant; a state is a subdivision *within* it. So a state-ceiling grant
//      asking to act pariwar-wide is asking to act ABOVE its own ceiling.
//
//   2. `scopeContains` denies independently at the `tRank < gRank` guard (GEO_RANK-based), which also
//      runs BEFORE any resolver is consulted.
//
// ⚠ THE DISTINCTION THAT MATTERS. A resolver answers *"is node X beneath node Y in the tree?"* — it can
// only ever narrow. These sites need the opposite: a narrower grant authorizing a broader target. That is
// not a missing capability; it is the ordering working correctly. Supplying a resolver would not have
// solved it, and re-pointing these sites at the resolver story would preserve the error under a new date.
//
// ✅ WHERE A RESOLVER GENUINELY IS THE FIX (Family B) the sites say so and name **Story 1.18 — Geo-Tree
// Scope Resolver**: grant and target in the same tree with the target strictly NARROWER
// (`state`→`district`, `block`→`district` ancestry). Those are real deferrals. `denyDeeperGeoResolver`
// below is their fail-closed default.
//
// ✅ FOR MODERATION SPECIFICALLY, Story 10.18 IS the answer: the actor was never a `state_trustee`. It is
// the `trustee_panel` — a **pariwar-ceiling** body constituted by Niyamavali §8.7 (Decision
// `2026-08-10-096`), which satisfies the pariwar-dimension gate by construction.
//
// ⛔ Do NOT "fix" this by re-ranking `pariwar` and `state`. The permission-key + scope-dimension model is
// architectural **freeze row 9**; re-ranking would silently re-authorize every grant in the system. If it
// is ever right, it is an ADR and a story of its own.

/**
 * Is `dimension` at or below `ceiling` in the canonical high→low ordering? Used
 * by the authorization guard to ensure a bad grant row cannot grant a role broader
 * authority than its declared `scopeCeiling` (e.g. `district_admin` at `global`).
 */
export function scopeWithinCeiling(
  dimension: ScopeDimension,
  ceiling: ScopeDimension,
): boolean {
  return CEILING_RANK[dimension] >= CEILING_RANK[ceiling];
}

/** True for the geo-tree dimensions whose containment may need the resolver. */
function isGeoDimension(d: ScopeDimension): d is Exclude<ScopeDimension, 'self'> {
  return d !== 'self';
}

/**
 * A scope a grant is held at: `(dimension, value)`. `value` is the concrete node
 * — a Pariwar id (`pariwar`), a state/district/block name or id (geo dims), or
 * the owner/subject id (`self`). It is `null` for `global` (covers everything) and
 * MAY be the actor's own subject id for `self`.
 */
export interface GrantScope {
  dimension: ScopeDimension;
  value: string | null;
}

/**
 * The locator of the resource an action targets: which node, at which dimension.
 * `scopeContains` decides whether a grant's `(dimension, value)` covers it.
 * `value` is `null` only for a `global`-dimension target (rare) or an
 * unresolved locator (which fails closed — see `scopeContains`).
 */
export interface TargetLocator {
  dimension: ScopeDimension;
  value: string | null;
}

/** A node in the canonical org/geo tree (used by the resolver seam). */
export interface GeoNode {
  dimension: Exclude<ScopeDimension, 'self' | 'global'>;
  value: string;
}

/**
 * The injectable geo-tree containment seam. `contains(ancestor, descendant)`
 * answers "is `descendant` within `ancestor` in the canonical org tree?" — e.g.
 * `contains({state,'Bihar'}, {district,'Patna'})` → true iff Patna ∈ Bihar. The
 * canonical org tree lands with Story 1.18 (Geo-Tree Scope Resolver); until then the DEFAULT
 * resolver denies all cross-level geo containment (fail-closed). Deferred D-item
 * (geo-tree containment seam → Story 1.18 (Geo-Tree Scope Resolver)).
 */
export interface GeoTreeResolver {
  contains(ancestor: GeoNode, descendant: GeoNode): boolean;
}

/**
 * Default resolver: denies every cross-level geo containment. With it, only
 * exact-node (same dimension + same value), `global` (universal), and `self`
 * (own-records) resolve. A state→district or pariwar→block grant covers a
 * narrower target ONLY when a real resolver is injected. This is the fail-closed
 * default the seam guarantees until Story 1.18 (Geo-Tree Scope Resolver) builds the org tree.
 */
export const denyDeeperGeoResolver: GeoTreeResolver = {
  contains: () => false,
};

/**
 * Does a grant held at `grant` cover an action targeting `target`? Pure,
 * side-effect-free, fail-closed. Containment rules (in order):
 *
 *   1. `global` grant → covers everything.
 *   2. `self` grant → covers ONLY a `self` target whose owner value matches the
 *      grant's value (own records only).
 *   3. `global` target → covered only by a `global` grant (handled at 1) → deny.
 *   4. `self` target → covered by a `pariwar` grant (pariwar-wide authority
 *      reaches own-owned in-tenant resources); NOT by a narrower geo grant by
 *      default (we cannot place a self-target in the geo tree) → deny.
 *   5. both geo/pariwar dims: a target BROADER than the grant denies; a `pariwar`
 *      grant covers every in-tenant geo target; an EXACT same-dimension node
 *      matches on value; a strictly-narrower geo target defers to the resolver
 *      (default deny). A null/unresolved target value fails closed.
 */
export function scopeContains(
  grant: GrantScope,
  target: TargetLocator,
  resolver: GeoTreeResolver = denyDeeperGeoResolver,
): boolean {
  // Unresolved target locators fail closed. `global` is the only dimension whose
  // canonical target value may be null.
  if (target.dimension !== 'global' && target.value == null) return false;

  // (1) Global grant — universal authority.
  if (grant.dimension === 'global') return true;

  // (2) Self grant — own records only.
  if (grant.dimension === 'self') {
    return (
      target.dimension === 'self' &&
      grant.value != null &&
      grant.value === target.value
    );
  }

  // (3) A global target needs a global grant (handled above) → deny.
  if (target.dimension === 'global') return false;

  // (4) A self target: only a pariwar-ceiling grant reaches it by default. A
  // state/district/block grant cannot place a self-target in the geo tree, so it
  // fails closed (deny) until Story 1.18 (Geo-Tree Scope Resolver)'s org tree + a richer self-resolution lands.
  if (target.dimension === 'self') {
    return grant.dimension === 'pariwar';
  }

  // (5) Both grant and target are geo/pariwar dimensions.
  if (!isGeoDimension(grant.dimension) || !isGeoDimension(target.dimension)) {
    return false; // unreachable given the guards above, but fail-closed by default
  }
  const gRank = GEO_RANK[grant.dimension];
  const tRank = GEO_RANK[target.dimension];

  // Target broader than the grant → deny (a district grant cannot authorize a
  // state-wide action).
  if (tRank < gRank) return false;

  // A pariwar-ceiling grant covers every geo target within the (already
  // active-Pariwar-filtered) tenant.
  if (grant.dimension === 'pariwar') return true;

  // Exact same-dimension node — match on value (the Anita/Patna-vs-Vaishali case:
  // district=Patna covers district=Patna, NOT district=Vaishali). A null target
  // value here is an unresolved locator → fails closed.
  if (gRank === tRank) return grant.value != null && grant.value === target.value;

  // Strictly-narrower geo target (e.g. state grant → district target): defer to
  // the injected resolver. Null values fail closed.
  if (grant.value == null || target.value == null) return false;
  return resolver.contains(
    { dimension: grant.dimension, value: grant.value },
    { dimension: target.dimension, value: target.value },
  );
}
