// Reconciliation review-queue admin routes — Story 9.8 (Task 5; AC1–AC7).
//
// SIX scope-gated admin routes — the trustee ADJUDICATION surface (a NEW module; the existing
// apps/api/src/modules/reconciliation/ is upload transport only):
//   · GET  …/admin/reconciliation-review/queue                        → the deadline-ordered open-case list
//   · GET  …/admin/reconciliation-review/cases/:caseKey               → one case's full review context
//   · POST …/admin/reconciliation-review/cases/:caseKey/confirm       → the ONLY manual confirm path (D2)
//   · POST …/admin/reconciliation-review/cases/:caseKey/reject        → the reject verdict (D1)
//   · POST …/admin/reconciliation-review/cases/:caseKey/recover       → facilitate-recovery (D7, no event)
//   · POST …/admin/reconciliation-review/cases/:caseKey/reverse       → review-and-reverse → held (D3)
//
// The route IS the security control (AC7): an authenticated HUMAN admin session + the NEW
// `reconciliation.review` key at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the review queue is
// Pariwar-wide, NOT district-derived; the cycle.freeze / claim.r9_vote precedent). Each WRITE is
// ADDITIONALLY step-up-gated on its OWN action context (an elevation for confirm never satisfies reject —
// distinct `reconciliation_review_{confirm|reject|recover|reverse}` contexts), added AFTER the permission
// hook so an unauthorized actor never reaches step-up. Each route inlines the human-actor chain explicitly
// (the human-actor CI gate scans the preHandler array statically — a shared/spread variable is opaque to it;
// the 6.13/6.14 pattern).

import {
  ReconciliationConfirmRequest,
  ReconciliationRecoverRequest,
  ReconciliationRejectRequest,
  ReconciliationReverseRequest,
  ReconciliationActionResponse,
  ReconciliationCaseDetail,
  ReconciliationQueueQuery,
  ReconciliationQueueResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createReconciliationReviewHandlers } from './handlers.js';

const TAG = 'reconciliation-review';

/** The NEW pariwar-dimension review key (Story 9.8, catalog v22). */
const RECONCILIATION_REVIEW_KEY = 'reconciliation.review';

/** Distinct step-up action contexts — an elevation for one action never satisfies another (AC7). */
const STEP_UP_CONFIRM = 'reconciliation_review_confirm';
const STEP_UP_REJECT = 'reconciliation_review_reject';
const STEP_UP_RECOVER = 'reconciliation_review_recover';
const STEP_UP_REVERSE = 'reconciliation_review_reverse';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const CaseParam = z.object({ pariwarId: z.string().uuid(), caseKey: z.string().min(1) }).strict();

export function registerReconciliationReviewRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createReconciliationReviewHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // reconciliation.review at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue defaults
  // to scopeTx.pariwarId, the cycle.freeze pariwar-wide precedent; no district derivation).
  const requireReview = requirePermissionHook(deps, RECONCILIATION_REVIEW_KEY, { dimension: 'pariwar' });

  // AC1 — the deadline-ordered queue (audited read).
  r.get(
    '/api/v1/p/:pariwarId/admin/reconciliation-review/queue',
    {
      schema: { params: PariwarParam, querystring: ReconciliationQueueQuery, response: { 200: ReconciliationQueueResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireReview],
    },
    h.getQueue,
  );

  // AC2 — one case's full review context (audited read).
  r.get(
    '/api/v1/p/:pariwarId/admin/reconciliation-review/cases/:caseKey',
    {
      schema: { params: CaseParam, response: { 200: ReconciliationCaseDetail }, tags: [TAG] },
      preHandler: [adminSession, scope, requireReview],
    },
    h.getCaseDetail,
  );

  // AC3 — confirm (the ONLY manual confirm path). Step-up-gated on its own context.
  r.post(
    '/api/v1/p/:pariwarId/admin/reconciliation-review/cases/:caseKey/confirm',
    {
      schema: { params: CaseParam, body: ReconciliationConfirmRequest, response: { 201: ReconciliationActionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireReview, requireStepUp(deps, STEP_UP_CONFIRM)],
    },
    h.postConfirm,
  );

  // AC4 — reject (a reconciliation.* verdict; member stays red, case closes, member notified).
  r.post(
    '/api/v1/p/:pariwarId/admin/reconciliation-review/cases/:caseKey/reject',
    {
      schema: { params: CaseParam, body: ReconciliationRejectRequest, response: { 201: ReconciliationActionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireReview, requireStepUp(deps, STEP_UP_REJECT)],
    },
    h.postReject,
  );

  // AC5 — facilitate-recovery (audited action only; NO outcome event; case stays OPEN).
  r.post(
    '/api/v1/p/:pariwarId/admin/reconciliation-review/cases/:caseKey/recover',
    {
      schema: { params: CaseParam, body: ReconciliationRecoverRequest, response: { 201: ReconciliationActionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireReview, requireStepUp(deps, STEP_UP_RECOVER)],
    },
    h.postRecover,
  );

  // AC6 — review-and-reverse (green→held; the substrate-committed reversal producer).
  r.post(
    '/api/v1/p/:pariwarId/admin/reconciliation-review/cases/:caseKey/reverse',
    {
      schema: { params: CaseParam, body: ReconciliationReverseRequest, response: { 201: ReconciliationActionResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireReview, requireStepUp(deps, STEP_UP_REVERSE)],
    },
    h.postReverse,
  );
}
