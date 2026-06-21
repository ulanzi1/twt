// RBAC HTTP adapter (Story 1.9, AC-6, Task 3.3) — THE SECOND GUARD, after RLS.
//
// Mounts Story 1.8's framework-agnostic `requirePermission(key, scope,
// resourceLocator)` as a Fastify pre-handler. The actor's grants are loaded from
// `role_grants` scoped by the active `pariwar_id` (RLS returns only this Pariwar's
// rows), then the pure domain check decides allow/deny. On deny it yields the
// structured 403 (`AuthorizationDeniedError → ErrorResponse`) and fires the
// `onAuthorizationDenied` seam into the injectable audit sink (AC-9).
//
// Discharges D3-1.8 (the HTTP-middleware adapter for the framework-agnostic guard).

import { rbac } from '@twt/domain';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import type pg from 'pg';

import { ADMIN_GLOBAL_NAMESPACE, type AppDeps } from '../../context.js';
import type { ScopeTx } from '../../types.js';

interface RoleGrantRow {
  pariwar_id: string;
  role: string;
  scope_dimension: rbac.ScopeDimension;
  scope_value: string | null;
}

/**
 * Load the actor's effective grants in the active scope. Runs raw parameterized
 * SQL on the SCOPED client (RLS is set via `setPariwarScope`, so this returns only
 * the active Pariwar's grants) — keeps drizzle-orm out of apps/api. The W9-CR1.6
 * in-context guard: refuses to query unless the scope tx confirms scope is set.
 */
export async function loadActorGrants(
  scopeTx: ScopeTx,
  actorId: string,
): Promise<rbac.EffectiveGrant[]> {
  if (!scopeTx.scopeSet) {
    throw new Error('[rbac] refused to load grants: pariwar scope not set (W9-CR1.6 guard)');
  }
  const res = await scopeTx.client.query<RoleGrantRow>(
    `SELECT pariwar_id, role, scope_dimension, scope_value
       FROM role_grants
      WHERE user_id = $1`,
    [actorId],
  );
  return res.rows.map((r) => ({
    pariwarId: r.pariwar_id,
    role: r.role,
    scopeDimension: r.scope_dimension,
    scopeValue: r.scope_value,
  }));
}

/** Shared `authz.denied` audit-emission shape — the standard denial callback every permission gate in this module fires on deny. */
export function auditAuthorizationDenied(
  deps: AppDeps,
  request: FastifyRequest,
  actorId: string,
  pariwarId: string | null,
): (denial: rbac.AuthorizationDenial) => void {
  return (denial) => {
    deps.auditSink.emit({
      type: 'authz.denied',
      actorId,
      pariwarId,
      traceId: request.requestContext.traceId,
      context: {
        permissionKey: denial.permissionKey,
        requiredScope: denial.requiredScope,
        targetLocator: denial.targetLocator,
      },
      at: deps.clock(),
    });
  };
}

export interface RequirePermissionOptions {
  /** The scope dimension the action is required at. Default: `pariwar`. */
  dimension?: rbac.ScopeDimension;
  /**
   * Resolve the concrete target node from the request. Default: the active
   * `pariwarId` (a pariwar-wide action). Geo/self actions pass a custom resolver.
   */
  resolveValue?: (request: FastifyRequest) => string | null;
}

/**
 * Build a Fastify pre-handler enforcing `key`. MUST run AFTER scope-resolution
 * (which sets `request.scopeTx` + `request.scopeGrants`). On deny the domain guard
 * throws `AuthorizationDeniedError` → the error-mapping middleware renders the 403.
 */
export function requirePermissionHook(
  deps: AppDeps,
  key: string,
  opts: RequirePermissionOptions = {},
): preHandlerHookHandler {
  const dimension = opts.dimension ?? 'pariwar';
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      // Programming error — a permission-gated route was registered without the
      // session + scope-resolution pre-handlers ahead of it. Fail loud (500).
      throw new Error('[rbac] requirePermission ran without session + scope-resolution');
    }
    const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
    const value = opts.resolveValue ? opts.resolveValue(request) : scopeTx.pariwarId;

    rbac.requirePermission(
      {
        actorId,
        grants,
        key,
        resource: { dimension, value, pariwarId: scopeTx.pariwarId },
      },
      {
        onAuthorizationDenied: auditAuthorizationDenied(deps, request, actorId, scopeTx.pariwarId),
      },
    );
  };
}

// ── GLOBAL-scope gate (Story 1.15, AC-1a) — discharges D4-1.11a ────────────────
//
// `requirePermissionHook` above needs `request.scopeTx` (set from `/:pariwarId/`),
// so it hard-throws 500 on a GLOBAL route (no path param → no scope tx). That was
// the documented D4-1.11a landmine forcing the audit-log surface (and now the
// provisioning surface) to gate on `requireAdminSession` only. This is the missing
// primitive: a global-scope pre-handler that loads the actor's grants WITHOUT a
// scope tx and checks them at `global` scope.

/**
 * Load ALL of the actor's grants across every tenant — the union a GLOBAL-scope
 * check needs. A global route has no active `pariwar_id`, so there is no scope tx
 * to gate on (`loadActorGrants`'s W9-CR1.6 guard would throw). We instead query the
 * BYPASSRLS `servicePool` directly: with no `app.pariwar_id` set, RLS does not
 * filter, so this returns the actor's grant rows across ALL Pariwars. Same SQL +
 * same row→`EffectiveGrant` mapping as `loadActorGrants`.
 */
export async function loadGlobalActorGrants(
  pool: pg.Pool,
  actorId: string,
): Promise<rbac.EffectiveGrant[]> {
  const res = await pool.query<RoleGrantRow>(
    `SELECT pariwar_id, role, scope_dimension, scope_value
       FROM role_grants
      WHERE user_id = $1`,
    [actorId],
  );
  return res.rows.map((r) => ({
    pariwarId: r.pariwar_id,
    role: r.role,
    scopeDimension: r.scope_dimension,
    scopeValue: r.scope_value,
  }));
}

/**
 * Build a Fastify pre-handler enforcing `key` at GLOBAL scope — the sibling of
 * `requirePermissionHook` for routes that are NOT under `/p/:pariwarId/`. MUST run
 * AFTER `requireAdminSession` (which sets `request.requestContext.actorId`); a
 * missing actorId is a programming error → fail loud (500), the same contract as
 * `requirePermissionHook`.
 *
 * Loads grants from the BYPASSRLS `servicePool` (all tenants) and checks them
 * against a `global` resource locator. `ADMIN_GLOBAL_NAMESPACE` (the nil-UUID
 * sentinel) stands in for the absent active Pariwar; a `global` grant bypasses the
 * active-Pariwar filter regardless (check.ts L172), and a non-global grant can
 * never match the nil-UUID active scope → fail-closed deny. On deny the domain
 * guard fires the audit seam (`authz.denied`, `pariwarId: null`) then throws
 * `AuthorizationDeniedError` → the error-mapping middleware renders the 403.
 */
export function requireGlobalPermission(deps: AppDeps, key: string): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const actorId = request.requestContext.actorId;
    if (!actorId) {
      // Programming error — registered without `requireAdminSession` ahead of it.
      throw new Error('[rbac] requireGlobalPermission ran without an admin session');
    }
    const grants = await loadGlobalActorGrants(deps.servicePool, actorId);

    rbac.requirePermission(
      {
        actorId,
        grants,
        key,
        resource: { dimension: 'global', value: null, pariwarId: ADMIN_GLOBAL_NAMESPACE },
      },
      {
        onAuthorizationDenied: auditAuthorizationDenied(deps, request, actorId, null),
      },
    );
  };
}
