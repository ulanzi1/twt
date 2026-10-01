// `matchingGrantRole` — Story 6.19b (AC16; `2026-09-29-270`). PURE.
//
// ⭐ WHY IT EXISTS. D25's mark records `set_by_role` — the role whose grant AUTHORISED the act (`-270`: `super_admin`
// when the actor acts through the Super Admin bundle). But the permission checks return a boolean, `void` or `{ ok }`
// — ⛔ never the matching grant (`check.ts`) — so a route cannot read the role off its own gate. This asks the SAME
// predicate (`hasPermission`) one grant at a time and returns the role of a grant that satisfies it.
// ⭐ A SCOPED grant is preferred over a `global` one: a Pariwar Admin who also holds `super_admin` records
// `pariwar_admin` for a Pariwar-scoped act — the role they exercised in that Pariwar, ⛔ not their widest one.
// ⭐ Among two SCOPED grants of different dimensions that both match, the MORE SPECIFIC one wins — `district` before
// `state` before `pariwar` (then `global` last), i.e. the REVERSE of `SCOPE_DIMENSIONS`' canonical broad→narrow order
// — ⛔ never caller-array order. Pinned by `tests/rbac/matching-grant.test.ts`.
// ⛔ It authorises NOTHING: call it only after the route's own gate passed; `null` means ⛔ no grant matched.
// ⚠ Pass the SAME `ctx` (resolver included) the route's own gate used — a bare-context re-check is ⛔ not
// guaranteed to be "the same predicate" the doc above claims, even if it happens to agree today.

import { type AuthzContext, type EffectiveGrant, type ResourceLocator, hasPermission } from './check.js';
import { SCOPE_DIMENSIONS } from './scope.js';

/** The role of a grant that holds `key` at a scope covering `resource` — most specific scope first, then `global` — or `null`. */
export function matchingGrantRole(
  grants: readonly EffectiveGrant[],
  key: string,
  resource: ResourceLocator,
  ctx?: Partial<AuthzContext>,
): string | null {
  const specificity = (g: EffectiveGrant): number => SCOPE_DIMENSIONS.indexOf(g.scopeDimension);
  const ordered = [...grants].sort((a, b) => specificity(b) - specificity(a));
  for (const grant of ordered) {
    if (hasPermission([grant], key, resource, ctx)) return grant.role;
  }
  return null;
}
