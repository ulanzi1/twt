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
import { PERMISSION_CATALOG_VERSION, isCatalogKey, type PermissionKey } from './permissions.js';
import { bundleForRole, defaultRoleBundles, type RoleBundle } from './roles.js';
import {
  SCOPE_DIMENSIONS,
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
  /**
   * Story 13.1 (QE18 (e)) — the `role_grants.id` this grant was loaded from, so an authorization SNAPSHOT can point at the
   * row. Set by the API loaders (`loadActorGrants` / `loadGlobalActorGrants`); absent for a test-built grant. It takes no
   * part in the check, and a row may later be deleted — the snapshot's tuple, ⛔ the id, is the record.
   */
  grantId?: string;
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
 * Story 13.1 (QE18 (a)) — THE per-grant test, extracted out of `hasPermission` so `hasPermission` and `authorizingGrant`
 * share ONE predicate and "allowed" and "which grant" can never disagree. Private: the key is already a catalog key and
 * the locator already resolved (the callers check both first, fail-closed).
 */
function grantAuthorizes(
  grant: EffectiveGrant,
  key: PermissionKey,
  resource: ResourceLocator,
  target: TargetLocator,
  lookup: (role: string) => RoleBundle | undefined,
  resolver: GeoTreeResolver,
): boolean {
  if (!isGrantScopeWellFormed(grant)) return false;

  // Active-Pariwar filter: a non-global grant only applies in its own Pariwar
  // (cross-scope inheritance forbidden, §3.13). A `global` grant (Super Admin)
  // applies cross-Pariwar by design.
  if (grant.scopeDimension !== 'global' && grant.pariwarId !== resource.pariwarId) {
    return false;
  }

  const bundle = lookup(grant.role);
  if (!bundle) return false; // unknown role carries no permissions → fail-closed

  if (!scopeWithinCeiling(grant.scopeDimension, bundle.scopeCeiling)) {
    return false;
  }

  // The role must carry the key AND the grant's scope must contain the target.
  if (!bundle.permissions.includes(key)) {
    return false;
  }
  return scopeContains(
    { dimension: grant.scopeDimension, value: grant.scopeValue },
    target,
    resolver,
  );
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
    if (grantAuthorizes(grant, key, resource, target, lookup, resolver)) return true;
  }
  return false;
}

/**
 * The deterministic order in which `authorizingGrant` asks the grants: the MOST SPECIFIC dimension first — the reverse of
 * `SCOPE_DIMENSIONS`' broad→narrow order, so `district` before `state` before `pariwar`, `global` last (the order
 * `matchingGrantRole` has used since Story 6.19b, `-270`) — then, ONLY among grants of the SAME dimension, by role, scope
 * value and grant id (code-unit order), so the answer does not depend on the order the grants were loaded in
 * (`loadActorGrants` has no `ORDER BY`).
 */
function compareGrantSpecificity(a: EffectiveGrant, b: EffectiveGrant): number {
  const bySpecificity = SCOPE_DIMENSIONS.indexOf(b.scopeDimension) - SCOPE_DIMENSIONS.indexOf(a.scopeDimension);
  if (bySpecificity !== 0) return bySpecificity;
  const byText = (x: string | null | undefined, y: string | null | undefined): number =>
    x === y ? 0 : (x ?? '') < (y ?? '') ? -1 : 1;
  return byText(a.role, b.role) || byText(a.scopeValue, b.scopeValue) || byText(a.grantId, b.grantId);
}

/**
 * Story 13.1 (QE18 (b)) — PURE: the grant that AUTHORIZES `key` on `resource` — when several do, the most specific (see
 * `compareGrantSpecificity`) — or `null` exactly when `hasPermission` denies (the same predicate, the same fail-closed
 * pre-checks). The repo's ONE answer to "which grant authorized": `matchingGrantRole` delegates here (TR13).
 * ⛔ It authorizes nothing by itself — a caller that needs a RECORD of the authorization uses `authorize` (via
 * `requirePermission`), which also binds the actor.
 */
export function authorizingGrant(
  grants: readonly EffectiveGrant[],
  key: string,
  resource: ResourceLocator,
  ctx?: Partial<AuthzContext>,
): EffectiveGrant | null {
  if (!isCatalogKey(key)) return null;
  if (!isResourceLocatorResolved(resource)) return null;

  const { bundles, resolver } = resolveContext(ctx);
  const lookup = bundleLookup(bundles);
  const target: TargetLocator = { dimension: resource.dimension, value: resource.value };

  for (const grant of [...grants].sort(compareGrantSpecificity)) {
    if (grantAuthorizes(grant, key, resource, target, lookup, resolver)) return grant;
  }
  return null;
}

/**
 * Story 13.1 (QE18) — a VERIFIED authorization RESULT: what authorized ONE act at ONE moment, produced only by the RBAC
 * check (`authorize`, called by `requirePermission`) — ⛔ a handler's assertion. A snapshot: it does not change when the
 * grant is later revoked, the role renamed or the catalog bumped. DEEP-FROZEN and registered in a module-private WeakSet,
 * so an object literal with the same fields is NOT verified (`isVerifiedAuthorization`) and a verified one cannot be
 * edited after the check. `pariwarId` is the RESOURCE's Pariwar (⛔ the grant's — a global grant carries its home
 * Pariwar); `grant.value` / `target.value` are `null` iff global.
 */
export interface VerifiedAuthorization {
  readonly permissionKey: string;
  readonly role: string;
  readonly pariwarId: string;
  readonly actorId: string;
  readonly grant: {
    readonly dimension: ScopeDimension;
    readonly value: string | null;
    readonly grantId?: string;
  };
  readonly target: {
    readonly dimension: ScopeDimension;
    readonly value: string | null;
  };
  readonly catalogVersion: number;
}

/** Every result `authorize` issued — identity, ⛔ contents (the freeze protects the contents). */
const VERIFIED_AUTHORIZATIONS = new WeakSet<object>();

/** Was `value` issued by `authorize` — ⛔ merely shaped like one? */
export function isVerifiedAuthorization(value: unknown): value is VerifiedAuthorization {
  return typeof value === 'object' && value !== null && VERIFIED_AUTHORIZATIONS.has(value);
}

/**
 * Story 13.1 (QE18 (b)) — run the check and, when it passes, ISSUE the `VerifiedAuthorization` for it: `authorizingGrant`
 * picks the grant, the actor comes from `params.actorId`, the Pariwar from `params.resource.pariwarId`. `null` exactly
 * when `hasPermission` denies. ⛔ It fires no denial seam and throws nothing — `requirePermission` is the guard.
 * ⚠ PURE over the grants it is given, so a caller could pass fabricated grants: its callers are pinned by a source fence
 * (`check.ts` itself, the two field-worker test fixtures — `apps/api/tests/integration/_field-worker-fixture.ts` and
 * `packages/domain/tests/integration/field-worker/_fixtures.ts` — and test files only). ⚠ `requirePermission` RETURNS this
 * result and is just as pure, so a SECOND fence (review R3-29, BigDev 2026-11-04) flags every USE of `requirePermission`'s
 * return value outside `check.ts` and the rbac hook (`apps/api/src/modules/rbac/index.ts`) — its other callers DROP it. Both
 * fences are drift guards against an honest mistake, not a security boundary (a dynamic reference is invisible to them).
 */
export function authorize(
  params: RequirePermissionParams,
  ctx?: Partial<AuthzContext>,
): VerifiedAuthorization | null {
  const grant = authorizingGrant(params.grants, params.key, params.resource, ctx);
  if (grant === null) return null;
  const result: VerifiedAuthorization = Object.freeze({
    permissionKey: params.key,
    role: grant.role,
    pariwarId: params.resource.pariwarId,
    actorId: params.actorId,
    grant: Object.freeze(
      grant.grantId === undefined
        ? { dimension: grant.scopeDimension, value: grant.scopeValue }
        : { dimension: grant.scopeDimension, value: grant.scopeValue, grantId: grant.grantId },
    ),
    target: Object.freeze({ dimension: params.resource.dimension, value: params.resource.value }),
    catalogVersion: PERMISSION_CATALOG_VERSION,
  });
  VERIFIED_AUTHORIZATIONS.add(result);
  return result;
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
 * THE GUARD (AC-4). The epic-named entry point. Calls `hasPermission` (since Story 13.1, through `authorize` — the same
 * predicate) and RETURNS the `VerifiedAuthorization` on an allow (QE18 (c) — every existing caller ignores it); on a deny
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
): VerifiedAuthorization {
  const resolved = resolveContext(ctx);
  const authorization = authorize(params, resolved);
  if (authorization !== null) {
    return authorization;
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
