// The Super Admin's WARNING-REASON LIST routes — Story 6.23a (Task 11; NW17; AC12).
//
//   GET  /api/v1/p/:pariwarId/admin/approval-warning-reasons                     → the list (active + history)
//   POST /api/v1/p/:pariwarId/admin/approval-warning-reasons                     → ADD a reason        (+ step-up)
//   POST /api/v1/p/:pariwarId/admin/approval-warning-reasons/:reasonId/replace   → REPLACE one         (+ step-up)
// ⛔ No PUT, ⛔ no PATCH, ⛔ no DELETE — and ⛔ no route that touches a label or a note: a reason is ⛔ never edited
// or deleted (NW16, NW18).
//
// The scoped admin chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(key)] — the
// `drive-target` reveal precedent (a Super-Admin-only key on a `/p/:pariwarId/admin/…` route). ⚠ Two stated
// departures from it: these routes are ⛔ not registered in `openapi/v1.yaml` (AC9 keeps it byte-identical; ⛔ nothing
// enforces registration, and the claims routes are ⛔ not registered either), and the admin console HAS a nav link
// (gated in `RootLayout.tsx` — advisory; THIS chain is the boundary).

import {
  ApprovalWarningReasonListResponse,
  ApprovalWarningReasonWriteRequest,
  ApprovalWarningReasonWriteResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import {
  APPROVAL_WARNING_REASON_MANAGE_KEY,
  APPROVAL_WARNING_REASON_STEP_UP_CONTEXT,
  createApprovalWarningReasonHandlers,
} from './handlers.js';

const TAG = 'approval-warning-reasons';
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ReasonParam = z.object({ pariwarId: z.string().uuid(), reasonId: z.string().uuid() }).strict();

export function registerApprovalWarningReasonRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createApprovalWarningReasonHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const chain = [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, APPROVAL_WARNING_REASON_MANAGE_KEY)];
  // Both writes need a FRESH step-up — AFTER the permission hook, so an unauthorized actor never reaches step-up.
  const writeChain = [...chain, requireStepUp(deps, APPROVAL_WARNING_REASON_STEP_UP_CONTEXT)];

  r.get(
    '/api/v1/p/:pariwarId/admin/approval-warning-reasons',
    { schema: { params: PariwarParam, response: { 200: ApprovalWarningReasonListResponse }, tags: [TAG] }, preHandler: chain },
    h.list,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/approval-warning-reasons',
    {
      schema: { params: PariwarParam, body: ApprovalWarningReasonWriteRequest, response: { 201: ApprovalWarningReasonWriteResponse }, tags: [TAG] },
      preHandler: writeChain,
    },
    h.add,
  );
  r.post(
    '/api/v1/p/:pariwarId/admin/approval-warning-reasons/:reasonId/replace',
    {
      schema: { params: ReasonParam, body: ApprovalWarningReasonWriteRequest, response: { 201: ApprovalWarningReasonWriteResponse }, tags: [TAG] },
      preHandler: writeChain,
    },
    h.replace,
  );
}
