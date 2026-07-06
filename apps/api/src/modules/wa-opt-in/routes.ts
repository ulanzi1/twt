// Member WhatsApp opt-in routes — Story 5.4 (Task 6; AC1/AC4).
//
// Member-session-gated opt-in surface (POST mint / GET status / DELETE revoke) + the trustee admin_action
// force-opt-out on the scoped-admin chain [requireAdminSession, scopeResolutionHook,
// requirePermissionHook(member.moderate)] (the confirmed reuse — an admin acting on a member's opt-in is a
// moderation WRITE; NO catalog bump). All routes register in openapi/v1.yaml (the EXPECTED diff).

import {
  CreateWaOptInResponse,
  RevokeWaOptInResponse,
  WaOptInStatusResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createWaOptInHandlers } from './handlers.js';

const WA_OPT_IN_TAG = 'wa-opt-in';
/** The admin force-opt-out gate — the existing member.moderate key (no catalog bump; Story 5.4 D2). */
const MEMBER_MODERATE_KEY = 'member.moderate';

const AdminOptOutParams = z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() }).strict();

export function registerWaOptInRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createWaOptInHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // ── Member opt-in surface (requireMemberSession; token-bearer) ────────────────────────────────────
  r.post(
    '/api/v1/member/wa-opt-in',
    {
      schema: { response: { 200: CreateWaOptInResponse }, tags: [WA_OPT_IN_TAG] },
      preHandler: [memberSession],
    },
    h.mint,
  );
  r.get(
    '/api/v1/member/wa-opt-in',
    {
      schema: { response: { 200: WaOptInStatusResponse }, tags: [WA_OPT_IN_TAG] },
      preHandler: [memberSession],
    },
    h.status,
  );
  r.delete(
    '/api/v1/member/wa-opt-in',
    {
      schema: { response: { 200: RevokeWaOptInResponse }, tags: [WA_OPT_IN_TAG] },
      preHandler: [memberSession],
    },
    h.revoke,
  );

  // ── Trustee admin_action force opt-out (scoped-admin chain + member.moderate) ──────────────────────
  const chain = [
    requireAdminSession(deps),
    scopeResolutionHook(deps),
    requirePermissionHook(deps, MEMBER_MODERATE_KEY),
  ];
  r.post(
    '/api/v1/p/:pariwarId/admin/members/:memberId/wa-opt-out',
    {
      schema: {
        params: AdminOptOutParams,
        response: { 200: RevokeWaOptInResponse },
        tags: [WA_OPT_IN_TAG],
      },
      preHandler: chain,
    },
    h.adminOptOut,
  );
}
