// The correction CLOSURE — the Super Admin's routes and the directee's (Story 6.19c; AC14, AC17, D18).
//
//   Super Admin — at `dimension: 'pariwar'`; keys (4)/(5) are `super_admin` ONLY (a `pariwar_admin` → 403):
//   · GET  …/admin/correction/escalations                                     — key (5) `claim.review_escalated_closure`
//   · GET  …/admin/claims/:claimCaseId/correction/escalation                  — key (5)
//   · POST …/admin/claims/:claimCaseId/correction/escalation/review           — key (5)
//   · POST …/admin/claims/:claimCaseId/correction/escalation/directions       — key (5)
//   · POST …/admin/claims/:claimCaseId/correction/escalation/decision         — key (4) `claim.decide_escalated_closure`
//   The directee — `claim.view_nominee_name_check` + the IDENTITY check (the domain: the actor IS the named directee):
//   · GET  …/admin/correction/directions/mine                                 — a LIST (per-caller gate target)
//   · POST …/admin/claims/:claimCaseId/correction/directions/:directionId/response — at the claim's district
//
// The Super Admin's queue is per-Pariwar (`/p/:pariwarId/…`): the global role reaches it from the top-level nav through a
// Pariwar picker (AC8c) — ⛔ never a cross-tenant read. Every route composes the authenticated-HUMAN chain; every
// collection GET declares a bounded `limit`. Enrolled in the human-actor gate's COVERAGE_SET.

import {
  ClosureDecisionClaimResponse,
  ClosureDirectionRequest,
  ClosureDirectionResponse,
  ClosureDirectionResponseRequest,
  ClosureReviewRequest,
  CorrectionClosureDto,
  DirectionInboxResponse,
  EscalatedClosureDecisionRequest,
  EscalatedClosureDetailResponse,
  EscalatedClosuresResponse,
} from '@twt/contracts';
import { claim, rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import {
  ESCALATION_DECIDE_KEY,
  ESCALATION_REVIEW_KEY,
  createCorrectionEscalationHandlers,
} from './claims.correction-escalation.handlers.js';
import { NOMINEE_NAME_CHECK_VIEW_KEY } from './claims.nominee-name-check.handlers.js';
import { resolveNomineeNameCheckDistrict, resolveQueueScopeStash } from './claims.nominee-name-check.routes.js';

const TAG = 'claim-correction-escalation';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
const DirectionParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid(), directionId: z.string().uuid() })
  .strict();
const PageQuery = z.object({ limit: z.coerce.number().int().min(1).max(claim.CLOSURE_QUEUE_MAX_LIMIT).optional() }).strict();

export function registerCorrectionEscalationRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createCorrectionEscalationHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canReview = requirePermissionHook(deps, ESCALATION_REVIEW_KEY, { dimension: 'pariwar' });
  const canDecide = requirePermissionHook(deps, ESCALATION_DECIDE_KEY, { dimension: 'pariwar' });
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  const canViewAtDistrict = requirePermissionHook(deps, NOMINEE_NAME_CHECK_VIEW_KEY, {
    dimension: 'district',
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckDistrict ?? null,
  });
  const resolveInboxScope = resolveQueueScopeStash(NOMINEE_NAME_CHECK_VIEW_KEY);
  const canViewInbox = requirePermissionHook(deps, NOMINEE_NAME_CHECK_VIEW_KEY, {
    dimension: 'district',
    resolveDimension: (request: FastifyRequest): rbac.ScopeDimension => request.nomineeNameCheckQueueScope?.dimension ?? 'district',
    resolveValue: (request: FastifyRequest): string | null => request.nomineeNameCheckQueueScope?.value ?? null,
  });

  // ── The Super Admin ─────────────────────────────────────────────────────────────────────────────────────────

  r.get(
    '/api/v1/p/:pariwarId/admin/correction/escalations',
    {
      schema: { params: PariwarParam, querystring: PageQuery, response: { 200: EscalatedClosuresResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canReview],
    },
    h.getEscalations,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/escalation',
    {
      schema: { params: ClaimParam, response: { 200: EscalatedClosureDetailResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canReview],
    },
    h.getEscalation,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/escalation/review',
    {
      schema: { params: ClaimParam, body: ClosureReviewRequest, response: { 201: CorrectionClosureDto }, tags: [TAG] },
      preHandler: [adminSession, scope, canReview],
    },
    h.placeUnderReview,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/escalation/directions',
    {
      schema: { params: ClaimParam, body: ClosureDirectionRequest, response: { 201: ClosureDirectionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canReview],
    },
    h.recordDirection,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/escalation/decision',
    {
      schema: { params: ClaimParam, body: EscalatedClosureDecisionRequest, response: { 201: ClosureDecisionClaimResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, canDecide],
    },
    h.decideEscalation,
  );

  // ── The directee ────────────────────────────────────────────────────────────────────────────────────────────

  r.get(
    '/api/v1/p/:pariwarId/admin/correction/directions/mine',
    {
      schema: { params: PariwarParam, querystring: PageQuery, response: { 200: DirectionInboxResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveInboxScope, canViewInbox],
    },
    h.getDirectionInbox,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/correction/directions/:directionId/response',
    {
      schema: { params: DirectionParam, body: ClosureDirectionResponseRequest, response: { 201: ClosureDirectionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveDistrict, canViewAtDistrict],
    },
    h.respondToDirection,
  );
}
