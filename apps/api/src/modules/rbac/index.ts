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

import type { AppDeps } from '../../context.js';
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
        onAuthorizationDenied: (denial) => {
          deps.auditSink.emit({
            type: 'authz.denied',
            actorId,
            pariwarId: scopeTx.pariwarId,
            traceId: request.requestContext.traceId,
            context: {
              permissionKey: denial.permissionKey,
              requiredScope: denial.requiredScope,
              targetLocator: denial.targetLocator,
            },
            at: deps.clock(),
          });
        },
      },
    );
  };
}
