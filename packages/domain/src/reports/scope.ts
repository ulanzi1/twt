// Reports library — actor scope resolution (Story 10.7, Task 2; AC3).
//
// Resolves the BROADEST scope an actor is entitled to for a report's permission key — the (dimension,
// value) the template's `query` then pushes into its SQL predicate (Decision 3, scope-as-predicate).
//
//   · A District Admin holding `member.export_roster` at {district, 'Patna'} resolves to {district,
//     'Patna'} → the roster query narrows `WHERE district = 'Patna'`.
//   · A Pariwar Admin holding it at {pariwar, <pariwarId>} resolves to {pariwar} → no geo narrowing
//     (RLS tenant-isolates underneath); the actor sees the whole tenant.
//   · An actor holding the key at NO scope resolves to `null` → fail-closed (assembleReport denies).
//
// This is the REQUEST-time authorization scope AND the BUILD-time re-validation scope: the worker
// re-loads grants and re-resolves, so a grant revoked between request and build fails the build closed
// (no persisted resolved-scope column to go stale). Deny-deeper geo asymmetry
// ([[project_rbac_geo_scope_containment]]): a `state`-scoped actor's district-granular report resolves
// to {state} here, and the district-narrowing query returns nothing below that ceiling until the Epic-3
// geo-tree resolver lands — the same asymmetry 10.3/10.4/10.5/10.6 shipped, not a defect.

import type { EffectiveGrant } from '../rbac/check.js';
import { bundleForRole, defaultRoleBundles, type RoleBundle } from '../rbac/roles.js';
import { SCOPE_DIMENSIONS, scopeWithinCeiling } from '../rbac/scope.js';
import type { ResolvedReportScope } from './types.js';

/** Broadness rank: lower index in the canonical high→low set = broader. */
function broadnessRank(dimension: ResolvedReportScope['dimension']): number {
  return SCOPE_DIMENSIONS.indexOf(dimension);
}

/** A grant's scope is well-formed (mirror check.ts isGrantScopeWellFormed). */
function grantScopeWellFormed(grant: EffectiveGrant, pariwarId: string): boolean {
  if (grant.scopeDimension === 'global') return grant.scopeValue == null;
  if (grant.scopeValue == null) return false;
  if (grant.scopeDimension === 'pariwar') return grant.scopeValue === pariwarId;
  return true;
}

/**
 * Resolve the actor's broadest authorized scope for `key`, or `null` if they hold it at none. PURE +
 * fail-closed: an unknown role, a key not in the role's bundle, a grant exceeding its ceiling, or a
 * malformed grant scope all contribute nothing. Global grants apply cross-Pariwar; every other grant
 * must match the active `pariwarId` (the check.ts active-Pariwar filter).
 */
export function resolveActorReportScope(
  grants: readonly EffectiveGrant[],
  key: string,
  pariwarId: string,
  bundles: readonly RoleBundle[] = defaultRoleBundles,
): ResolvedReportScope | null {
  const lookup =
    bundles === defaultRoleBundles
      ? bundleForRole
      : (role: string): RoleBundle | undefined => bundles.find((b) => (b.role as string) === role);

  let best: ResolvedReportScope | null = null;

  for (const grant of grants) {
    if (!grantScopeWellFormed(grant, pariwarId)) continue;
    // Active-Pariwar filter: a non-global grant only applies in its own Pariwar.
    if (grant.scopeDimension !== 'global' && grant.pariwarId !== pariwarId) continue;

    const bundle = lookup(grant.role);
    if (!bundle) continue; // unknown role carries no permissions → fail-closed
    if (!scopeWithinCeiling(grant.scopeDimension, bundle.scopeCeiling)) continue;
    if (!(bundle.permissions as readonly string[]).includes(key)) continue;

    const candidate: ResolvedReportScope = { dimension: grant.scopeDimension, value: grant.scopeValue };
    // v1 LIMITATION (review finding — deferred, accepted): `ResolvedReportScope` is single-valued, so an
    // actor holding this key at TWO same-dimension nodes (e.g. `{district,'Patna'}` + `{district,'Gaya'}`)
    // resolves to whichever the strict-`<` tie-break keeps (the first-iterated), and the template narrows
    // to that ONE node — a multi-district admin silently exports only one district. Multi-value (`IN`-list)
    // scope lands with the Epic-3 geo-tree resolver ([[project_rbac_geo_scope_containment]]), which is the
    // same deferral horizon as deny-deeper geo; until then this is a documented limitation, not a bug.
    if (best === null || broadnessRank(candidate.dimension) < broadnessRank(best.dimension)) {
      best = candidate;
    }
  }

  return best;
}
