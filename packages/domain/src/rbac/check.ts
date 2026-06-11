// Fail-closed authorization check + guard + audit seam — Story 1.8 (AC-4, AC-5).
//
// THE SECOND GUARD on every privileged action. RLS (Story 1.6) is the first: it
// stops cross-tenant DATA leak. This stops in-tenant ACTION by an under-privileged
// user (architecture §2.6 L1492 — "RLS then authz"). Where Story 1.6/1.7 made
// `pariwar_id` a data boundary, this makes `(permission-key, scope)` an action
// boundary.
//
// Two layers:
//   1. `hasPermission(grants, key, target)` — a PURE, side-effect-free predicate
//      (architecture's `requires(user, permission_key, target)`, §2.6 L1489).
//   2. `requirePermission(...)` — the epic-named guard (epics.md L1129) that calls
//      `hasPermission` and, on deny, throws a typed `AuthorizationDeniedError`
//      carrying the structured 403 denial AND fires the injectable audit seam.
//
// FRAMEWORK-AGNOSTIC. No Express/Hono/Fastify import — the HTTP-middleware adapter
// that mounts this on real routes (and the scope-resolution middleware that sets
// the active `pariwar_id`) is Story 1.9 (apps/api has no framework yet). Building
// middleware now would couple this primitive to a framework not yet chosen.
//
// FAIL-CLOSED is the invariant. Default-deny on EVERY uncertain path: unknown key
// (not in PERMISSION_CATALOG), no grant, unknown role, role scope exceeds its
// ceiling, malformed grant scope, scope mismatch, unresolved locator, missing
// geo-resolver → deny. Every "allow" path is explicit. The
// unit-test matrix (tests/rbac/check.test.ts) is the tripwire.
//
// CROSS-PARIWAR COMPOSITION (architecture §3.13 L2416-2421). A user's effective
// role set = the union of grants across their Pariwar memberships, evaluated per
// active scope. The active `pariwarId` (the `/p/<pariwar_id>/` URL path) selects
// which grants apply; cross-scope role inheritance is forbidden by default. So a
// State-Trustee grant in Pariwar A NEVER authorizes an action in Pariwar B — the
// predicate filters grants by the active `pariwarId` before matching the key. A
// `global`-scoped grant (Super Admin, the only global role) is the sole exception:
// it applies cross-Pariwar by design.

import {
  AuthorizationDeniedError,
  type AuthorizationDenial,
  type ErrorResponseShape,
} from '../errors.js';
import { isCatalogKey } from './permissions.js';
import { bundleForRole, defaultRoleBundles, type RoleBundle } from './roles.js';
import {
  denyDeeperGeoResolver,
  scopeContains,
  scopeWithinCeiling,
  type GeoTreeResolver,
  type ScopeDimension,
  type TargetLocator,
} from './scope.js';

/**
 * One grant the actor holds: `(pariwarId, role, scopeDimension, scopeValue)` — the
 * architecture §3.13 L2420 grant tuple `(user_id, pariwar_id, role)` plus the
 * `(dimension, value)` scope it is held at. Loaded from `role_grants` for the
 * actor by the HTTP middleware (Story 1.9). `scopeValue` is `null` only for
 * `global`; every non-global grant needs a concrete node value.
 */
export interface EffectiveGrant {
  pariwarId: string;
  role: string;
  scopeDimension: ScopeDimension;
  scopeValue: string | null;
}

/**
 * The resource an action targets, plus the active Pariwar that selects which
 * grants apply. `dimension` + `value` form the `TargetLocator`; `pariwarId` is the
 * active scope from the `/p/<pariwar_id>/` path. The epic's
 * `requirePermission(key, scope, resourceLocator)` positional signature maps to:
 * `scope` = `dimension`, `resourceLocator` = `{ value, pariwarId }`.
 */
export interface ResourceLocator {
  /** The scope dimension the target sits at (the epic's `scope` argument). */
  dimension: ScopeDimension;
  /** The concrete node (district name, pariwar id, owner id); `null` for global. */
  value: string | null;
  /** The active Pariwar the request is scoped to — selects which grants apply. */
  pariwarId: string;
}

/** Tunable context for the check: the (editable) bundles + the geo-tree resolver. */
export interface AuthzContext {
  /**
   * The role→permission bundles in effect. Defaults to the seeded
   * `defaultRoleBundles`; the admin path (Story 1.9+) passes the Super-Admin-edited
   * set (FR-44) so the check honours edits without code change.
   */
  bundles: readonly RoleBundle[];
  /** Geo-tree containment resolver (default: deny-deeper, fail-closed). */
  resolver: GeoTreeResolver;
  /**
   * The FR-47 authorization-denied audit seam (AC-5). Default no-op. Story 1.10
   * injects the tamper-evident audit sink here WITHOUT changing this code. NOT the
   * audit log itself — just the injection point.
   */
  onAuthorizationDenied: (denial: AuthorizationDenial) => void;
}

const DEFAULT_CONTEXT: AuthzContext = {
  bundles: defaultRoleBundles,
  resolver: denyDeeperGeoResolver,
  onAuthorizationDenied: () => undefined,
};

function resolveContext(ctx?: Partial<AuthzContext>): AuthzContext {
  if (!ctx) return DEFAULT_CONTEXT;
  return {
    bundles: ctx.bundles ?? DEFAULT_CONTEXT.bundles,
    resolver: ctx.resolver ?? DEFAULT_CONTEXT.resolver,
    onAuthorizationDenied:
      ctx.onAuthorizationDenied ?? DEFAULT_CONTEXT.onAuthorizationDenied,
  };
}

/**
 * Build a role→bundle lookup over an arbitrary bundle set (so admin-edited bundles
 * resolve, not just the seeded defaults). For the default set this is equivalent
 * to `bundleForRole`.
 */
function bundleLookup(
  bundles: readonly RoleBundle[],
): (role: string) => RoleBundle | undefined {
  if (bundles === defaultRoleBundles) return bundleForRole;
  const byRole = new Map(bundles.map((b) => [b.role as string, b]));
  return (role: string) => byRole.get(role);
}

function isResourceLocatorResolved(resource: ResourceLocator): boolean {
  if (resource.dimension === 'global') return resource.value == null;
  if (resource.value == null) return false;
  if (resource.dimension === 'pariwar') return resource.value === resource.pariwarId;
  return true;
}

function isGrantScopeWellFormed(grant: EffectiveGrant): boolean {
  if (grant.scopeDimension === 'global') return grant.scopeValue == null;
  if (grant.scopeValue == null) return false;
  if (grant.scopeDimension === 'pariwar') return grant.scopeValue === grant.pariwarId;
  return true;
}

/**
 * PURE fail-closed predicate: does the actor (via `grants`) hold `key` at a scope
 * that covers `resource`? Resolves effective grants → filters by active Pariwar →
 * matches the key in the role's bundle → checks scope containment. Returns `false`
 * on EVERY uncertain path (unknown/malformed key, no grant, unknown role, scope
 * mismatch, unresolved locator).
 */
export function hasPermission(
  grants: readonly EffectiveGrant[],
  key: string,
  resource: ResourceLocator,
  ctx?: Partial<AuthzContext>,
): boolean {
  // Unknown / malformed key → deny. Only enumerated catalog keys can ever allow.
  // The type guard narrows `key` to a branded `PermissionKey` for the rest of the
  // function, so the bundle membership check below is type-exact (no cast).
  if (!isCatalogKey(key)) return false;
  if (!isResourceLocatorResolved(resource)) return false;

  const { bundles, resolver } = resolveContext(ctx);
  const lookup = bundleLookup(bundles);
  const target: TargetLocator = { dimension: resource.dimension, value: resource.value };

  for (const grant of grants) {
    if (!isGrantScopeWellFormed(grant)) continue;

    // Active-Pariwar filter: a non-global grant only applies in its own Pariwar
    // (cross-scope inheritance forbidden, §3.13). A `global` grant (Super Admin)
    // applies cross-Pariwar by design.
    if (grant.scopeDimension !== 'global' && grant.pariwarId !== resource.pariwarId) {
      continue;
    }

    const bundle = lookup(grant.role);
    if (!bundle) continue; // unknown role carries no permissions → fail-closed

    if (!scopeWithinCeiling(grant.scopeDimension, bundle.scopeCeiling)) {
      continue;
    }

    // The role must carry the key AND the grant's scope must contain the target.
    if (!bundle.permissions.includes(key)) {
      continue;
    }
    if (
      scopeContains(
        { dimension: grant.scopeDimension, value: grant.scopeValue },
        target,
        resolver,
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Parameters for the `requirePermission` guard (the epic-named entry point). */
export interface RequirePermissionParams {
  /** The acting subject (user) id — echoed into the denial. */
  actorId: string;
  /** The actor's effective grants (loaded from `role_grants` by Story 1.9). */
  grants: readonly EffectiveGrant[];
  /** The required permission key (`<resource>.<action>`). */
  key: string;
  /** The target resource + active Pariwar (the epic's `scope` + `resourceLocator`). */
  resource: ResourceLocator;
}

/**
 * Build the structured denial (AC-5) for a failed check. Exposed for tests and for
 * a caller that wants the value without catching the throw.
 */
function denialOf(params: RequirePermissionParams): AuthorizationDenial {
  return {
    actorId: params.actorId,
    permissionKey: params.key,
    requiredScope: params.resource.dimension,
    targetLocator: {
      dimension: params.resource.dimension,
      value: params.resource.value,
    },
  };
}

/**
 * THE GUARD (AC-4). The epic-named entry point. Calls `hasPermission`; on a deny
 * it (1) fires the injectable audit seam, then (2) throws a typed
 * `AuthorizationDeniedError` carrying the structured 403 denial. Framework-agnostic
 * — the Story-1.9 HTTP adapter catches the throw and maps it to a 403
 * `ErrorResponse` via `error.toErrorResponse(requestId)`.
 *
 * The seam fires on EVERY deny (the FR-47 audit hook records the attempt) before
 * the throw. Default seam is a no-op, so this is inert until Story 1.10 wires the
 * sink.
 */
export function requirePermission(
  params: RequirePermissionParams,
  ctx?: Partial<AuthzContext>,
): void {
  const resolved = resolveContext(ctx);
  if (hasPermission(params.grants, params.key, params.resource, resolved)) {
    return;
  }
  const denial = denialOf(params);
  resolved.onAuthorizationDenied(denial);
  throw new AuthorizationDeniedError(denial);
}

/**
 * Non-throwing variant: returns the structured result of the check. Some callers
 * (batch authorization, UI capability probes) prefer a value over a throw. On
 * deny it still fires the audit seam and surfaces the `AuthorizationDeniedError`
 * instance (and its `.toErrorResponse(requestId)`) without throwing it.
 */
export type AuthorizationResult =
  | { ok: true }
  | { ok: false; denial: AuthorizationDenial; error: AuthorizationDeniedError };

export function checkPermission(
  params: RequirePermissionParams,
  ctx?: Partial<AuthzContext>,
): AuthorizationResult {
  const resolved = resolveContext(ctx);
  if (hasPermission(params.grants, params.key, params.resource, resolved)) {
    return { ok: true };
  }
  const denial = denialOf(params);
  resolved.onAuthorizationDenied(denial);
  return { ok: false, denial, error: new AuthorizationDeniedError(denial) };
}

export type { AuthorizationDenial, ErrorResponseShape };
