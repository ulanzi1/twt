// Member-validity + admin member-search routes — Story 4.7 (Task 4; D5).
//
// Two surfaces, two guard chains:
//   · Member-self: GET /api/v1/member/validity — member-session-gated (bearer token, like member-home /
//     medical / vyawastha-shulk). Session-guarded → covered by the Story 1.14 login-wall CI gate.
//   · Admin: GET /api/v1/p/:pariwarId/admin/members/:memberId/validity + POST …/admin/members/search —
//     the scoped admin chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(
//     member.view_validity)] (the rules-module precedent). Scope-resolution sets request.scopeTx +
//     request.scopeGrants; the permission hook fail-closes on deny (audited 403).

import { MemberSearchRequest, MemberSearchResponse, MemberValidityResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createMemberValidityHandlers } from './handlers.js';

const MEMBER_VALIDITY_TAG = 'member-validity';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const MemberValidityParam = z
  .object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() })
  .strict();

export function registerMemberValidityRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberValidityHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const viewValidity = requirePermissionHook(deps, h.MEMBER_VIEW_VALIDITY_KEY);
  const invalidateCache = requirePermissionHook(deps, h.VALIDITY_INVALIDATE_CACHE_KEY);

  // ── Member-self validity read (redacted, NOT audited) ────────────────────────────────────────────
  r.get(
    '/api/v1/member/validity',
    {
      schema: { response: { 200: MemberValidityResponse }, tags: [MEMBER_VALIDITY_TAG] },
      preHandler: [memberSession],
    },
    h.memberValidityRead,
  );

  // ── Admin validity read (scope-gated, AUDITED) ───────────────────────────────────────────────────
  r.get(
    '/api/v1/p/:pariwarId/admin/members/:memberId/validity',
    {
      schema: {
        params: MemberValidityParam,
        response: { 200: MemberValidityResponse },
        tags: [MEMBER_VALIDITY_TAG],
      },
      preHandler: [adminSession, scope, viewValidity],
    },
    h.adminValidityRead,
  );

  // ── Admin trustee "invalidate all" — emergency cache invalidation (Story 4.8 AC1c/AC3) ────────────
  // Gated on the dedicated validity.invalidate_cache WRITE key (code review 2026-07-05), NOT the
  // read-only viewValidity gate above — a caller who may merely READ validity must not be able to
  // force a tenant-wide cache invalidation.
  r.post(
    '/api/v1/p/:pariwarId/admin/validity-cache/invalidate-all',
    {
      schema: {
        params: PariwarParam,
        response: {
          200: z.object({ invalidated: z.literal(true), pariwarId: z.string().uuid() }).strict(),
        },
        tags: [MEMBER_VALIDITY_TAG],
      },
      preHandler: [adminSession, scope, invalidateCache],
    },
    h.adminInvalidateValidityCache,
  );

  // ── Admin member-search (the AR-65 compound read model) ──────────────────────────────────────────
  r.post(
    '/api/v1/p/:pariwarId/admin/members/search',
    {
      schema: {
        params: PariwarParam,
        body: MemberSearchRequest,
        response: { 200: MemberSearchResponse },
        tags: [MEMBER_VALIDITY_TAG],
      },
      preHandler: [adminSession, scope, viewValidity],
    },
    h.adminMemberSearch,
  );
}
