// Session-introspection handler (Story 1.11b, DD-6) — GET /api/v1/auth/session.
//
// Returns the authenticated admin's id + the permission keys they hold at the
// GLOBAL ("national") scope ceiling, so the admin SPA can gate nav entries +
// routes (e.g. on `audit.verify`). This is the ONLY way the SPA learns an actor's
// grants: the session row carries only `userId`, and the per-tenant RBAC loader
// needs a `scopeTx` a global surface cannot produce.
//
// ── Why deps.servicePool + a raw role_grants read ─────────────────────────────
// A global surface has no `/:pariwarId/` → no `request.scopeTx`, so the normal
// `loadActorGrants`/`requirePermissionHook` path (which keys on the active tenant)
// is unavailable. We instead read the actor's grants directly through the BYPASSRLS
// service pool (no RLS context = ALL of the user's grant rows, across every tenant)
// and map them through the canonical `defaultRoleBundles` — the same posture the
// on-demand verify endpoint uses for the global chain (modules/audit-log/index.ts).
//
// ── "national" === scope_dimension = 'global' (ADR-0008) ──────────────────────
// The epics' "national scope" reconciled to the canonical `global` dimension
// (packages/domain/src/rbac/scope.ts — there is NO 'national' value; filtering on
// it returns zero rows). We collect the union of permission keys across every
// role_grants row at `scope_dimension = 'global'`. `super_admin` carries the full
// catalog at the `global` ceiling, so a super-admin's union includes `audit.verify`.
//
// The UI gate is ADVISORY — `requireAdminSession` is the real boundary on every
// endpoint; the endpoint-side `audit.verify` RBAC upgrade stays deferred (D4-1.11a).

import type { SessionResponse } from '@twt/contracts';
import { rbac } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { UnauthorizedError } from '../../../http-errors.js';

interface RoleGrantRow {
  role: string;
  scope_dimension: string;
}

/** The scope dimension the epics call "national" (ADR-0008 / scope.ts). */
const GLOBAL_SCOPE = 'global';

export function createSessionHandler(deps: AppDeps) {
  return async function session(request: FastifyRequest): Promise<SessionResponse> {
    // requireAdminSession guarantees userId; re-narrow for the type system.
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }

    // BYPASSRLS service pool: no `app.pariwar_id` context, so we read EVERY grant
    // row for this user (across all tenants), not just one tenant's.
    const { rows } = await deps.servicePool.query<RoleGrantRow>(
      'SELECT role, scope_dimension FROM role_grants WHERE user_id = $1',
      [userId],
    );

    // Union the permission keys of every role granted at the global ceiling.
    // Unknown role names fail closed (bundleForRole → undefined → no keys).
    const grants = new Set<string>();
    for (const row of rows) {
      if (row.scope_dimension !== GLOBAL_SCOPE) continue;
      const bundle = rbac.bundleForRole(row.role);
      if (!bundle) continue;
      for (const key of bundle.permissions) grants.add(key);
    }

    // Sorted for a deterministic wire payload (stable across reads + in tests).
    return { userId, nationalGrants: [...grants].sort() };
  };
}
