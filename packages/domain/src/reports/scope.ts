// Reports library — actor scope resolution (Story 10.7, Task 2; AC3 · Story 10.28, AC1).
//
// Resolves the BROADEST dimension an actor is entitled to for a report's permission key, and EVERY
// node they hold it at, at that dimension — what the template's `query` then pushes into its SQL
// predicate (Decision 3, scope-as-predicate).
//
//   · A District Admin holding `member.export_roster` at {district, 'Patna'} resolves to {district,
//     ['Patna']} → the roster query narrows `WHERE district IN ('Patna')`.
//   · A District Admin holding it at {district,'Patna'} AND {district,'Gaya'} resolves to
//     {district, ['Gaya','Patna']} → `WHERE district IN ('Gaya','Patna')`. ⭐ BOTH, since Story 10.28.
//   · A Pariwar Admin holding it at {pariwar, <pariwarId>} resolves to {pariwar} → no geo narrowing
//     (RLS tenant-isolates underneath); the actor sees the whole tenant.
//   · An actor holding the key at NO scope resolves to `null` → fail-closed (assembleReport denies).
//
// ⭐ THE BROADEST-DIMENSION PICK IS UNCHANGED — a `pariwar` grant still beats a `district` grant.
// What Story 10.28 changed is that TIES AT THE WINNING DIMENSION ACCUMULATE instead of being
// discarded by a strict-`<` comparison. `values` is deduped and sorted HERE, at the producer (D1(ii)),
// so consumers never re-derive it: the SQL, the tests and the audit attribution are all deterministic.
//
// This is the REQUEST-time authorization scope AND the BUILD-time re-validation scope: the worker
// re-loads grants and re-resolves, so a grant revoked between request and build fails the build closed
// (no persisted resolved-scope column to go stale). Deny-deeper geo asymmetry
// ([[project_rbac_geo_scope_containment]]): a `state`-scoped actor's district-granular report resolves
// to {state} here, and the district-narrowing query returns nothing below that ceiling.
// ✅ THE AUTHORIZATION HALF IS RESOLVED (Story 1.18): a state-held grant now genuinely reaches a
// district target through the geo-tree resolver (ADR-0038), so `assembleReport`'s `checkPermission`
// no longer denies for want of ancestry.
// ⛔ THE QUERY HALF STILL DENIES FOR `state`, AND THE CARDINALITY CHANGE DID NOT ALTER THAT. The two
// mechanisms must not be conflated. `resolveActorReportScope` returns {state, ['Bihar']} and
// `templates/_shared.ts` narrows that to `deny` — no longer because the type is single-valued (it is
// not, since 10.28), but because NO ROLE HOLDS A DISTRICT-NARROWABLE REPORT KEY AT A `state` CEILING:
// there is no actor to serve, and the enumeration API a state→districts expansion would need does not
// exist because none was ever needed (D3, "Closed by [edit]", no successor). See `_shared.ts`'s
// per-dimension re-examination.

import type { EffectiveGrant } from '../rbac/check.js';
import { bundleForRole, defaultRoleBundles, type RoleBundle } from '../rbac/roles.js';
import { SCOPE_DIMENSIONS, scopeWithinCeiling, type ScopeDimension } from '../rbac/scope.js';
import type { ResolvedReportScope } from './types.js';

/** Broadness rank: lower index in the canonical high→low set = broader. */
function broadnessRank(dimension: ResolvedReportScope['dimension']): number {
  return SCOPE_DIMENSIONS.indexOf(dimension);
}

/**
 * A well-formed grant: `global` carries NO node value, and every other dimension carries one.
 * ⭐ This union is what lets `scopeValue` narrow to `string` below WITHOUT a null filter or a `!`
 * (Story 10.28, D1(iv)) — the well-formedness guard was already doing the work; it just was not
 * telling the type system. A defensive `.filter(Boolean)` on the value set would instead SWALLOW a
 * future well-formedness regression, where this rejects it and contributes nothing (fail-closed).
 * [Review fix] The non-global arm is constrained to `Exclude<ScopeDimension, 'global'>` — without it,
 * the union structurally still admitted `{ scopeDimension: 'global'; scopeValue: string }`, closed
 * only by the runtime guard below never producing that shape, not by the type itself.
 */
type WellFormedGrant = EffectiveGrant &
  (
    | { scopeDimension: 'global'; scopeValue: null }
    | { scopeDimension: Exclude<ScopeDimension, 'global'>; scopeValue: string }
  );

/** A grant's scope is well-formed (mirror check.ts isGrantScopeWellFormed). */
function grantScopeWellFormed(grant: EffectiveGrant, pariwarId: string): grant is WellFormedGrant {
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

  let bestDimension: ResolvedReportScope['dimension'] | null = null;
  let values = new Set<string>();

  for (const grant of grants) {
    if (!grantScopeWellFormed(grant, pariwarId)) continue;
    // Active-Pariwar filter: a non-global grant only applies in its own Pariwar.
    if (grant.scopeDimension !== 'global' && grant.pariwarId !== pariwarId) continue;

    const bundle = lookup(grant.role);
    if (!bundle) continue; // unknown role carries no permissions → fail-closed
    if (!scopeWithinCeiling(grant.scopeDimension, bundle.scopeCeiling)) continue;
    if (!(bundle.permissions as readonly string[]).includes(key)) continue;

    // ⭐ STORY 10.28 (AC1) — the broadest-dimension PICK is unchanged; the TIE-BREAK is what moved.
    // A strictly broader dimension WINS and discards the set accumulated for the narrower one; a
    // strictly narrower dimension contributes nothing; a TIE at the winning dimension ACCUMULATES.
    // (The old strict-`<` comparison silently kept the first-iterated grant and dropped the rest.)
    if (bestDimension === null || broadnessRank(grant.scopeDimension) < broadnessRank(bestDimension)) {
      bestDimension = grant.scopeDimension;
      values = new Set();
    } else if (broadnessRank(grant.scopeDimension) > broadnessRank(bestDimension)) {
      continue;
    }

    // `global` is the ONE dimension whose canonical value is null (`rbac/scope.ts:236`), so a global
    // scope carries the EMPTY set — the D1(i) invariant `dimension === 'global' ⇔ values.length === 0`.
    // For every other dimension `WellFormedGrant` has already narrowed `scopeValue` to `string`.
    if (grant.scopeDimension !== 'global') {
      values.add(grant.scopeValue);
    }
  }

  if (bestDimension === null) return null;
  // Dedupe (the `Set`) + sort AT THE PRODUCER (D1(ii)/D7): two roles at the SAME node yield ONE
  // entry, and the order is stable for the SQL `IN` list, the tests, and D4's audit attribution.
  return { dimension: bestDimension, values: [...values].sort() };
}
