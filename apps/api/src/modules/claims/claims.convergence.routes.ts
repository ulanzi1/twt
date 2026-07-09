// ICP convergence-resolution routes — Story 6.4 (Task 7).
//
// Three scope-gated admin routes under /api/v1/p/:pariwarId/admin/claims/convergence — the
// operator/trustee <ConvergenceDecisionStrip> back end. Mirrors the helpline claims chain
// (routes.ts): [requireAdminSession, scopeResolutionHook, requirePermissionHook(claim.file)].
//
// Permission key: REUSE `claim.file` (Open Question #3 recommended default — the operator already
// holds it; no RBAC catalog bump). A dedicated `claim.converge` key is optional future scope.
//
// Step-up posture:
//   · GET  /pending  — read-only, no step-up.
//   · POST /merge    — unions a channel into an EXISTING claim (no freeze) — permission-gated only.
//   · POST /override — MINTS a distinct claim (fires a freeze) → gated behind the operator's OWN
//                      fresh admin step-up (§2.2), exactly like the helpline intake route.

import {
  ConvergenceMergeRequest,
  ConvergenceMergeResponse,
  ConvergenceOverrideRequest,
  ConvergenceOverrideResponse,
  PendingIntakeAttemptsResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createConvergenceHandlers } from './claims.convergence.handlers.js';

const CONVERGENCE_TAG = 'claim-convergence';

/** REUSE the Story 6.3 claim-file permission key (Open Question #3 default — no catalog bump). */
const CLAIM_FILE_KEY = 'claim.file';
/** The override mints a claim → the operator's own fresh admin step-up (§2.2), like intake. */
const CLAIM_FILE_STEP_UP_CONTEXT = 'claim_file';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerConvergenceRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createConvergenceHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canFileClaim = requirePermissionHook(deps, CLAIM_FILE_KEY);
  const stepUp = requireStepUp(deps, CLAIM_FILE_STEP_UP_CONTEXT);

  r.get(
    '/api/v1/p/:pariwarId/admin/claims/convergence/pending',
    {
      schema: {
        params: PariwarParam,
        response: { 200: PendingIntakeAttemptsResponse },
        tags: [CONVERGENCE_TAG],
      },
      preHandler: [adminSession, scope, canFileClaim],
    },
    h.listPendingConvergence,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/convergence/merge',
    {
      schema: {
        params: PariwarParam,
        body: ConvergenceMergeRequest,
        response: { 200: ConvergenceMergeResponse },
        tags: [CONVERGENCE_TAG],
      },
      preHandler: [adminSession, scope, canFileClaim],
    },
    h.confirmMerge,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/convergence/override',
    {
      schema: {
        params: PariwarParam,
        body: ConvergenceOverrideRequest,
        response: { 200: ConvergenceOverrideResponse },
        tags: [CONVERGENCE_TAG],
      },
      // Mints a distinct claim (a freeze) → permission + the operator's OWN fresh admin step-up.
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    h.overrideConvergence,
  );
}
