// The Trust's review of the family memorial — ADMIN routes (Story 11b.4 — AC9; `#decision-2026-10-24-398` MA7).
//
//   GET  /api/v1/p/:pariwarId/memorial-reviews[?view=decided]
//   GET  /api/v1/p/:pariwarId/memorial-reviews/:submissionId
//   POST /api/v1/p/:pariwarId/memorial-reviews/:submissionId/decision
//   POST /api/v1/p/:pariwarId/memorial-reviews/:submissionId/withdraw-approval
//
// Every route: the admin session → the scope middleware (a Pariwar with ⛔ grant ⇒ `404 pariwar.not_found` first) →
// `memorial.review` at the `pariwar` dimension (a missing key ⇒ the standard 403). The input schemas are `.strict()`
// (AC6 — a decision posting `body` / `text` / `narrative` is a 400).

import {
  MemorialReviewDecisionInput,
  MemorialReviewDecisionResponse,
  MemorialReviewDetailResponse,
  MemorialReviewListQuery,
  MemorialReviewListResponse,
  MemorialWithdrawApprovalInput,
  MemorialWithdrawApprovalResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createMemorialReviewHandlers } from './handlers.js';

const TAG = 'memorial-review';

/** MA7 — held by `trustee_panel` (+ derived `super_admin`); `-391` Confirm 1 A. */
const MEMORIAL_REVIEW_KEY = 'memorial.review';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const SubmissionParam = z.object({ pariwarId: z.string().uuid(), submissionId: z.string().uuid() }).strict();

export function registerMemorialReviewRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemorialReviewHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const requireReview = requirePermissionHook(deps, MEMORIAL_REVIEW_KEY, { dimension: 'pariwar' });
  const guards = [adminSession, scope, requireReview];

  r.get(
    '/api/v1/p/:pariwarId/memorial-reviews',
    {
      schema: { params: PariwarParam, querystring: MemorialReviewListQuery, response: { 200: MemorialReviewListResponse }, tags: [TAG] },
      preHandler: guards,
    },
    h.list,
  );
  r.get(
    '/api/v1/p/:pariwarId/memorial-reviews/:submissionId',
    { schema: { params: SubmissionParam, response: { 200: MemorialReviewDetailResponse }, tags: [TAG] }, preHandler: guards },
    h.detail,
  );
  r.post(
    '/api/v1/p/:pariwarId/memorial-reviews/:submissionId/decision',
    {
      schema: { params: SubmissionParam, body: MemorialReviewDecisionInput, response: { 200: MemorialReviewDecisionResponse }, tags: [TAG] },
      preHandler: guards,
    },
    h.decide,
  );
  r.post(
    '/api/v1/p/:pariwarId/memorial-reviews/:submissionId/withdraw-approval',
    {
      schema: {
        params: SubmissionParam,
        body: MemorialWithdrawApprovalInput,
        response: { 200: MemorialWithdrawApprovalResponse },
        tags: [TAG],
      },
      preHandler: guards,
    },
    h.withdrawApproval,
  );
}
