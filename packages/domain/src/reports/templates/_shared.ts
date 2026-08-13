// Reports library — shared template helpers (Story 10.7, Task 3).
//
// The scope-as-predicate narrowing decision (Decision 3) + the forced row cap. Every district-
// narrowable template resolves the actor's scope into one of three modes; the deny-deeper geo
// asymmetry ([[project_rbac_geo_scope_containment]]) lands as the `deny` mode.
//
// ⛔ `deny` IS NOT WAITING ON A RESOLVER. Story 1.18 shipped the geo-tree resolver (ADR-0038) and
// this mode deliberately did not change — see the per-dimension re-examination on
// `resolveDistrictNarrowing` below, which states why for each of `state` (single-valued type →
// Story 10.28), `block` (rank order — a resolver can only narrow) and `self` (not a tree node).

import { clampLimit } from '../../pagination.js';
import type { ResolvedReportScope } from '../types.js';

/** The forced-pagination ceiling for a report body (bounded even for a full-tenant read). */
export const REPORT_ROW_CAP = 50_000;

/** Clamp a report's row limit to `[1, REPORT_ROW_CAP]` — the domain forced-pagination invariant
 *  ([[project_domain_limit_clamp_and_savepoint_retry]]). v1 templates read the full (capped) set. */
export function reportRowLimit(limit?: number): number {
  return clampLimit(limit, { default: REPORT_ROW_CAP, cap: REPORT_ROW_CAP });
}

/**
 * How a district-narrowable template narrows for a resolved scope (Decision 3):
 *   · `district` — the actor is district-scoped → `WHERE district = <value>`.
 *   · `all`      — the actor is pariwar/global-scoped → no geo filter (RLS tenant-isolates underneath).
 *   · `deny`     — the actor is state/block/self-scoped → resolves NOTHING below its ceiling.
 *
 * ── ⭐ RE-EXAMINED AT STORY 1.18, AND THE ANSWER IS: `deny` STAYS. THE REASON CHANGES. ───────────
 *
 * This branch used to say "no geo-tree resolver until Story 1.18". That resolver now EXISTS and
 * genuinely authorizes a `state`-held grant against a district target — so the old reason expired,
 * and leaving it would have read as pending work that had in fact been delivered. The behaviour is
 * nevertheless UNCHANGED, for a different and more durable reason, stated per dimension:
 *
 *   · `state`  — ancestry makes the answer EXPRESSIBLE but not REPRESENTABLE. With a published tree
 *     the set of districts beneath Bihar is knowable, so the correct narrowing is
 *     `WHERE district IN (…)` — but `DistrictNarrowing` is SINGLE-VALUED, and so is
 *     `ResolvedReportScope`. Making either multi-valued is a cardinality change to Story 10.7's
 *     model, which is **Story 10.28**'s and only Story 10.28's ⛔ — Story 1.18 deliberately does not
 *     absorb it, even though it looks cheap from here. Narrowing to ONE district beneath the state
 *     would be worse than denying: a silent partial export with no signal that the rest were
 *     dropped, which is the exact failure Story 10.28 exists to remove.
 *   · `block`  — NOT resolver-fixable, ever. A block sits BELOW a district, so a block-scoped actor
 *     asking a district-columned report needs the district ABOVE it. A resolver answers "is X
 *     beneath Y" and can only ever NARROW; this needs the opposite. That is rank order (Family A),
 *     not a deferral. See `rbac/scope.ts` §RANK-ORDER.
 *   · `self`   — orthogonal to the geo tree by design (`rbac/scope.ts:50-55`); `GeoNode` excludes
 *     `self` BY TYPE. Never a node, so never narrowable.
 *
 * ⚠ AUTHORIZATION AND NARROWING ARE TWO DIFFERENT MECHANISMS, and conflating them is how
 * `reports.spec.ts`'s deny-deeper pin got read as an RBAC pin for three stories. `assembleReport`'s
 * `checkPermission` ALREADY ALLOWS a real `state_trustee` here (an exact-node match at the SAME
 * dimension — no resolver involved); the zero rows come from THIS function. Story 1.18 changed the
 * first mechanism and deliberately did not change the second.
 */
export type DistrictNarrowing =
  | { kind: 'all' }
  | { kind: 'district'; district: string }
  | { kind: 'deny' };

export function resolveDistrictNarrowing(resolvedScope: ResolvedReportScope): DistrictNarrowing {
  switch (resolvedScope.dimension) {
    case 'global':
    case 'pariwar':
      return { kind: 'all' };
    case 'district':
      return resolvedScope.value != null
        ? { kind: 'district', district: resolvedScope.value }
        : { kind: 'deny' };
    // state → Story 10.28 (multi-node cardinality); block → rank order; self → not a tree node.
    // See the per-dimension re-examination in the doc comment above.
    default:
      return { kind: 'deny' };
  }
}
