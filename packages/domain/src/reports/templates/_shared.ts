// Reports library — shared template helpers (Story 10.7, Task 3).
//
// The scope-as-predicate narrowing decision (Decision 3) + the forced row cap. Every district-
// narrowable template resolves the actor's scope into one of three modes; the deny-deeper geo
// asymmetry ([[project_rbac_geo_scope_containment]]) lands as the `deny` mode.
//
// ⛔ `deny` IS NOT WAITING ON A RESOLVER, AND IT IS NO LONGER WAITING ON A TYPE. Story 1.18 shipped
// the geo-tree resolver (ADR-0038) and Story 10.28 made the narrowing multi-valued; this mode
// deliberately did not change through either — see the per-dimension re-examination on
// `resolveDistrictNarrowing` below, which states why for each of `state` (no actor holds a
// district-narrowable report key at a `state` ceiling — "Closed by [edit]", no successor), `block`
// (rank order — a resolver can only narrow) and `self` (not a tree node).

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
 *   · `districts` — the actor is district-scoped → `WHERE district IN (<values>)`. ⭐ MULTI-VALUED
 *     since Story 10.28: an actor holding the key at Patna AND Gaya narrows to BOTH.
 *   · `all`       — the actor is pariwar/global-scoped → no geo filter (RLS tenant-isolates underneath).
 *   · `deny`      — the actor is state/block/self-scoped → resolves NOTHING below its ceiling.
 *
 * ── ⭐ RE-EXAMINED TWICE (STORY 1.18, THEN STORY 10.28). `deny` STAYS. THIS IS ITS THIRD REASON. ──
 *
 * ⚠ THE REASON ON THIS BRANCH HAS NOW BEEN WRONG TWICE, so read why this one is different. It first
 * said *"no geo-tree resolver until Story 1.18"* — which expired when Story 1.18 shipped the resolver
 * (ADR-0038). It then said *"`DistrictNarrowing` and `ResolvedReportScope` are SINGLE-VALUED"* —
 * which expired the moment Story 10.28 made them multi-valued, as this very file now proves. Both
 * described a MISSING MECHANISM, and mechanisms get built. The third reason describes a MISSING
 * ACTOR, and is stated per dimension:
 *
 *   · `state`  — ⛔ **Closed by [edit]. NO successor is minted, and this is deliberate.** It is not a
 *     deferral and must never be re-read as one. The cardinality that used to be the blocker is GONE
 *     (10.28), and the narrowing is still `deny` because **NO ROLE HOLDS A DISTRICT-NARROWABLE REPORT
 *     KEY AT A `state` CEILING**: `state_trustee` (`roles.ts:361-369`, ceiling `state`) holds
 *     `member.view_validity` but NOT `member.export_roster`, which lives only at `pariwar_admin`
 *     (`:341`) and `district_admin` (`:401`); `reconciliation.review` is pariwar-ceiling only. There
 *     is **no actor to serve** — zero live consumers, zero backlog consumers, no FR — and the
 *     district-ENUMERATION API a state→descendants expansion would need does not exist **because none
 *     was ever needed** (`GeoTreeResolver` is `contains`-only BY INTERFACE; `LoadedGeoTree.parents` is
 *     child→parent only). If a state-ceiling role ever gains such a key, THAT story raises the
 *     enumeration question with a live requirement attached. (Story 10.28, D3.)
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
 * first mechanism and deliberately did not change the second; Story 10.28 changed the second's
 * CARDINALITY and deliberately did not change its `state` VERDICT.
 */
export type DistrictNarrowing =
  | { kind: 'all' }
  | { kind: 'districts'; districts: readonly string[] } // ⭐ NON-EMPTY, guaranteed by the constructor
  | { kind: 'deny' };

/**
 * The ONE narrowing authority — both district-narrowable templates call it, and neither inlines a
 * second narrowing decision.
 *
 * ⛔ AN EMPTY VALUE SET RETURNS `deny`, AND THAT GUARANTEE LIVES HERE, AT THE SOURCE (Story 10.28,
 * D5) — so no consumer can ever hold an empty `districts` array. `WHERE district IN ()` is a Postgres
 * SYNTAX ERROR, and the smallest edit that makes that error go away is to DROP THE PREDICATE — which
 * converts a fail-closed deny into a FULL-TENANT EXPORT without touching a single line that mentions
 * authorization. Enforcing it at the two query sites by convention is exactly how that ships.
 * ⚠ Under D1 the empty case is already unreachable through a real actor's grants (a non-global scope
 * with an empty set is never produced; an actor with no district grant resolves to `null` and is
 * 403'd before any template runs). This is defence-in-depth, and this trap is what warrants it.
 */
export function resolveDistrictNarrowing(resolvedScope: ResolvedReportScope): DistrictNarrowing {
  switch (resolvedScope.dimension) {
    case 'global':
    case 'pariwar':
      return { kind: 'all' };
    case 'district':
      return resolvedScope.values.length > 0
        ? { kind: 'districts', districts: resolvedScope.values }
        : { kind: 'deny' };
    // state → no actor holds a district-narrowable key at a `state` ceiling (D3, "Closed by [edit]",
    // no successor); block → rank order; self → not a tree node. See the re-examination above.
    default:
      return { kind: 'deny' };
  }
}
