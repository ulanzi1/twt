// The workplace LIST and the *"isn't listed"* QUEUE routes — Story 6.36c (Task 4.1; AC2, AC3; `-330` SW9 A, `-342`).
//
//   GET  /api/v1/p/:pariwarId/admin/workplaces                               → the list   (workplace.manage OR workplace.review)
//   POST /api/v1/p/:pariwarId/admin/workplaces                               → ADD        (workplace.manage + step-up)
//   POST /api/v1/p/:pariwarId/admin/workplaces/:workplaceId/rename           → a STAFF row (workplace.manage + step-up)
//   POST /api/v1/p/:pariwarId/admin/workplaces/:workplaceId/delist           →             (workplace.manage + step-up)
//   POST /api/v1/p/:pariwarId/admin/workplaces/:workplaceId/relist           →             (workplace.manage + step-up)
//   GET  /api/v1/p/:pariwarId/admin/workplace-requests                       → the queue  (workplace.review)
//   POST /api/v1/p/:pariwarId/admin/workplace-requests/:requestId/suggest    → SUGGEST    (workplace.review + step-up)
//   POST /api/v1/p/:pariwarId/admin/workplace-requests/:requestId/close      → CLOSE      (workplace.review + step-up)
// ⛔ No DELETE (a delisted entry stays on every posting — I3); ⛔ no route writes a posting; a Pariwar Admin (review alone)
// gets 403 on every list write (SW9 A — ONLY the Super Admin adds).
//
// The scoped admin chain [requireAdminSession, scopeResolutionHook, permission] — the approval-warning-reasons shape; step-up
// AFTER the permission hook, so an unauthorized actor never reaches step-up. The GET's either-of-two gate is the
// `requireNiyamavaliReadAccess` shape (`hasPermission(A) || hasPermission(B)`, else the audited 403 keyed on A). ⚠ Not
// registered in `openapi/v1.yaml` (the 6.23a / claims posture).

import {
  AdminWorkplaceAddRequest,
  AdminWorkplaceRenameRequest,
  AdminWorkplacesQuery,
  AdminWorkplacesResponse,
  AdminWorkplaceWriteResponse,
  WORKPLACE_MANAGE_STEP_UP_CONTEXT,
  WORKPLACE_REVIEW_STEP_UP_CONTEXT,
  WorkplaceRequestQueueQuery,
  WorkplaceRequestQueueResponse,
  WorkplaceRequestWriteResponse,
  WorkplaceSuggestRequest,
} from '@twt/contracts';
import { rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { auditAuthorizationDenied, requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createWorkplaceAdminHandlers, WORKPLACE_MANAGE_KEY, WORKPLACE_REVIEW_KEY } from './handlers.js';

const TAG = 'workplaces';
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const WorkplaceParam = z.object({ pariwarId: z.string().uuid(), workplaceId: z.string().uuid() }).strict();
const RequestParam = z.object({ pariwarId: z.string().uuid(), requestId: z.string().uuid() }).strict();

/** `workplace.manage` OR `workplace.review` at the active Pariwar; else the audited 403 keyed on `workplace.manage`. */
function requireWorkplaceListRead(deps: AppDeps): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new Error('[workplaces] read gate ran without session + scope-resolution');
    // Both keys are pariwar-dimension — the list is per-Pariwar, ⛔ a geographic subdivision (⛔ a geo-tree resolver).
    const grants = request.scopeGrants ?? [];
    const resource = { dimension: 'pariwar' as const, value: scopeTx.pariwarId, pariwarId: scopeTx.pariwarId };
    if (rbac.hasPermission(grants, WORKPLACE_MANAGE_KEY, resource) || rbac.hasPermission(grants, WORKPLACE_REVIEW_KEY, resource)) return;
    rbac.requirePermission(
      { actorId, grants, key: WORKPLACE_MANAGE_KEY, resource },
      { onAuthorizationDenied: auditAuthorizationDenied(deps, request, actorId, scopeTx.pariwarId) },
    );
  };
}

export function registerWorkplaceAdminRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createWorkplaceAdminHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const scoped = [requireAdminSession(deps), scopeResolutionHook(deps)];
  const manage = [...scoped, requirePermissionHook(deps, WORKPLACE_MANAGE_KEY)];
  const manageWrite = [...manage, requireStepUp(deps, WORKPLACE_MANAGE_STEP_UP_CONTEXT)];
  const review = [...scoped, requirePermissionHook(deps, WORKPLACE_REVIEW_KEY)];
  const reviewWrite = [...review, requireStepUp(deps, WORKPLACE_REVIEW_STEP_UP_CONTEXT)];

  r.get(
    '/api/v1/p/:pariwarId/admin/workplaces',
    {
      schema: { params: PariwarParam, querystring: AdminWorkplacesQuery, response: { 200: AdminWorkplacesResponse }, tags: [TAG] },
      preHandler: [...scoped, requireWorkplaceListRead(deps)],
    },
    h.list,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/workplaces',
    {
      schema: { params: PariwarParam, body: AdminWorkplaceAddRequest, response: { 201: AdminWorkplaceWriteResponse }, tags: [TAG] },
      preHandler: manageWrite,
    },
    h.add,
  );
  for (const [action, handler] of [
    ['rename', h.rename],
    ['delist', h.delist],
    ['relist', h.relist],
  ] as const) {
    r.post(
      `/api/v1/p/:pariwarId/admin/workplaces/:workplaceId/${action}`,
      {
        schema: {
          params: WorkplaceParam,
          ...(action === 'rename' ? { body: AdminWorkplaceRenameRequest } : {}),
          response: { 200: AdminWorkplaceWriteResponse },
          tags: [TAG],
        },
        preHandler: manageWrite,
      },
      handler,
    );
  }

  r.get(
    '/api/v1/p/:pariwarId/admin/workplace-requests',
    {
      schema: { params: PariwarParam, querystring: WorkplaceRequestQueueQuery, response: { 200: WorkplaceRequestQueueResponse }, tags: [TAG] },
      preHandler: review,
    },
    h.queue,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/workplace-requests/:requestId/suggest',
    {
      schema: { params: RequestParam, body: WorkplaceSuggestRequest, response: { 200: WorkplaceRequestWriteResponse }, tags: [TAG] },
      preHandler: reviewWrite,
    },
    h.suggest,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/workplace-requests/:requestId/close',
    { schema: { params: RequestParam, response: { 200: WorkplaceRequestWriteResponse }, tags: [TAG] }, preHandler: reviewWrite },
    h.close,
  );
}
