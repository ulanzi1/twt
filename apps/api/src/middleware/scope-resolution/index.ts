// scope-resolution middleware (Story 1.9, AC-6, Task 3.1) — discharges D4-1.6.
//
// For a `/api/v1/p/:pariwarId/…` route it:
//   1. extracts `:pariwarId` from the path and re-parses it as a STRICT UUID at the
//      boundary (independent of auth output, §1.2) — a malformed id 404s (no
//      enumeration oracle), not 400, so a probe can't distinguish shapes.
//   2. opens a request transaction and calls `setPariwarScope` INSIDE it (the named
//      owner of the SET-LOCAL-needs-a-tx invariant) + `assertPariwarScopeSet`.
//   3. verifies the authenticated admin has a `role_grants` membership in that
//      Pariwar (the scoped grant load returns ≥1 row) — 0 rows → 404 (Pariwar
//      doesn't exist OR no membership; the two collapse, by design, to "not found").
//   4. caches the grants on the request (the RBAC adapter reuses them) and sets
//      `request.requestContext.pariwarId`.
//
// MUST run after `requireAdminSession` (which sets `requestContext.actorId`). The
// scope tx it opens is closed by the multi-tenant lifecycle hook.

import { ids } from '@twt/domain';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError } from '../../http-errors.js';
import { loadActorGrants } from '../../modules/rbac/index.js';
import { closeScopeTx, openScopeTx } from '../../modules/multi-tenant/scope-tx.js';

export function scopeResolutionHook(deps: AppDeps): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const actorId = request.requestContext.actorId;
    if (!actorId) {
      // requireAdminSession must precede scope-resolution. Loud (500) on misuse.
      throw new Error('[scope-resolution] ran without requireAdminSession');
    }

    const raw = (request.params as { pariwarId?: string }).pariwarId ?? '';
    // Strict-UUID re-parse at the boundary. A malformed id 404s (no oracle).
    let pariwarId: string;
    try {
      pariwarId = ids.pariwarId(raw);
    } catch {
      throw new NotFoundError('Pariwar not found', 'pariwar.not_found');
    }

    const scopeTx = await openScopeTx(deps, pariwarId);
    let attached = false;
    try {
      const grants = await loadActorGrants(scopeTx, actorId);
      // 0 grants → not a member (or Pariwar absent) → 404 (no enumeration oracle).
      if (grants.length === 0) {
        throw new NotFoundError('Pariwar not found', 'pariwar.not_found');
      }
      request.scopeTx = scopeTx;
      request.scopeGrants = grants;
      request.requestContext.pariwarId = pariwarId;
      attached = true;

      // Scope-change audit emission (§2.5) — actor entering an active Pariwar scope.
      deps.auditSink.emit({
        type: 'scope.change',
        actorId,
        pariwarId,
        traceId: request.requestContext.traceId,
        context: { newScope: pariwarId, roles: grants.map((g) => g.role) },
        at: deps.clock(),
      });
    } finally {
      // If we never attached (membership 404, or a DB error), close the tx here;
      // otherwise the multi-tenant lifecycle hook owns closing it.
      if (!attached) await closeScopeTx(scopeTx, false);
    }
  };
}
