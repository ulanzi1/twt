// Reports library — shared template helpers (Story 10.7, Task 3).
//
// The scope-as-predicate narrowing decision (Decision 3) + the forced row cap. Every district-
// narrowable template resolves the actor's scope into one of three modes; the deny-deeper geo
// asymmetry ([[project_rbac_geo_scope_containment]]) lands as the `deny` mode until Story 1.18 (Geo-Tree Scope Resolver).

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
 *   · `deny`     — the actor is state/block/self-scoped → resolves NOTHING below its ceiling until the
 *     Story 1.18 (Geo-Tree Scope Resolver) (deny-deeper; the documented 10.3/10.4/10.5/10.6 asymmetry, not a bug).
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
    // state / block / self: no geo-tree resolver until Story 1.18 (Geo-Tree Scope Resolver) → deny-deeper.
    default:
      return { kind: 'deny' };
  }
}
