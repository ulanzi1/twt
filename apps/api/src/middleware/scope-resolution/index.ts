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
//   5. Story 1.18 — loads the Pariwar's in-force GEO TREE, ONCE, alongside the grants.
//
// MUST run after `requireAdminSession` (which sets `requestContext.actorId`). The
// scope tx it opens is closed by the multi-tenant lifecycle hook.
//
// ── ⭐ WHY THE GEO TREE LOADS HERE AND NOWHERE ELSE (Story 1.18, AC2) ──────────
// `rbac.hasPermission` is a PURE, SYNCHRONOUS predicate (ADR-0008 Decision 8) and
// `GeoTreeResolver.contains` is synchronous BY INTERFACE, so the resolver cannot
// query — the tree must be in memory BEFORE any permission check runs. This is the
// exact precedent `request.scopeGrants` already sets: loaded once here, consumed
// synchronously by every downstream gate. ⛔ Never load a tree inside a permission
// check, and never make `contains` async (that is architectural freeze row 9).
//
// A Pariwar that has published NO tree loads `null`, the RBAC adapter then passes
// NO resolver, and `denyDeeperGeoResolver` applies — today's behaviour, byte-identical.

import { geoTree, ids } from '@twt/domain';
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
      // Story 1.18 — the in-force geo tree, loaded ONCE per request beside the grants (AC2).
      // `null` = this Pariwar has published no tree, which is a first-class answer: downstream
      // gates then pass no resolver and deeper geo containment denies exactly as it does today.
      // Read on the SCOPED tx, so RLS confines it to this Pariwar's own subtree.
      // `pariwarId` is already the branded value returned by `ids.pariwarId(raw)` above; re-brand
      // for the domain signature without re-validating a string that was validated at :38.
      const tree = await geoTree.loadGeoTree(scopeTx.tx, ids.pariwarId(pariwarId), deps.clock());

      request.scopeTx = scopeTx;
      request.scopeGrants = grants;
      request.geoTree = tree;
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
      if (!attached) {
        await closeScopeTx(scopeTx, false).catch((closeErr: unknown) => {
          console.error('[scope-resolution] closeScopeTx failed during cleanup:', closeErr);
        });
      }
    }
  };
}
