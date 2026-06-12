// Multi-tenant request integration (Story 1.9, AC-6, Task 3.2).
//
// Owns the per-request scope-tx LIFECYCLE: an `onSend` hook COMMITs (2xx/3xx) or
// ROLLBACKs the scope tx + releases the client before the response is written (so
// a future write route is correct), with an `onResponse` safety net. Also registers
// the demonstrative `/p/:pariwarId/…` routes that prove the scope-resolution + RBAC
// substrate end-to-end (hidden from the committed OpenAPI — substrate-proof, like
// Story 1.4's health route). Downstream epics register their own scoped routes with
// the same `[requireAdminSession, scopeResolutionHook, requirePermissionHook]` chain.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { closeScopeTx } from './scope-tx.js';

export function registerMultiTenant(app: FastifyInstance, deps: AppDeps): void {
  // Commit-on-success / rollback-on-error, before the payload is written.
  app.addHook('onSend', async (request, reply, payload) => {
    const scopeTx = request.scopeTx;
    if (scopeTx?.scopeSet) {
      await closeScopeTx(scopeTx, reply.statusCode < 400);
    }
    return payload;
  });

  // Safety net: if onSend never ran (dropped connection), ensure the tx is closed.
  app.addHook('onResponse', async (request) => {
    const scopeTx = request.scopeTx;
    if (scopeTx?.scopeSet) {
      await closeScopeTx(scopeTx, false);
    }
  });

  const session = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);

  // Membership-gated scope introspection — proves scope-resolution (404 on
  // non-member) + the scoped grant load. Any member of the Pariwar may call it.
  app.get(
    '/api/v1/p/:pariwarId/whoami',
    { schema: { hide: true }, preHandler: [session, scope] },
    (request) => {
      return {
        pariwarId: request.scopeTx?.pariwarId,
        actorId: request.requestContext.actorId,
        grants: (request.scopeGrants ?? []).map((g) => ({
          role: g.role,
          scopeDimension: g.scopeDimension,
          scopeValue: g.scopeValue,
        })),
      };
    },
  );

  // Permission-gated probe — proves the RBAC second guard (403 without audit.verify).
  app.get(
    '/api/v1/p/:pariwarId/audit/verify-probe',
    {
      schema: { hide: true },
      preHandler: [session, scope, requirePermissionHook(deps, 'audit.verify')],
    },
    () => ({ ok: true }),
  );
}
