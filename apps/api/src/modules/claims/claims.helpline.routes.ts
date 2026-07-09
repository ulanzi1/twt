// Helpline-mediated claim-filing routes — Story 6.3 (Task 3).
//
// ONE scope-gated admin route under /api/v1/p/:pariwarId/admin/claims — the operator-console
// (Priya-path) intake. The exact member-validity admin chain (routes.ts:82–95) + the Story 1.9
// admin step-up gate:
//   [requireAdminSession, scopeResolutionHook, requirePermissionHook(claim.file),
//    requireStepUp('claim_file')]
//
// The permission hook fail-closes on deny (audited 403). requireStepUp('claim_file') satisfies
// architecture §2.2 (claim filing needs a fresh transactional step-up regardless of session
// state) via the OPERATOR's own admin step-up — the console drives the existing admin step-up
// request/verify endpoints with actionContext 'claim_file' before the intake POST; a
// StepUpRequiredError (structured 403) from the gate is the signal to run that elevation, NOT
// a hard error. There is NO nominee handover-OTP on this path (unlike the member-app flow) —
// operator authority + the verbal identity read-back is the trust anchor.

import {
  HelplineClaimIntakeRequest,
  HelplineClaimIntakeResponse,
  HelplineOperatorEventRequest,
  HelplineOperatorEventResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createHelplineClaimsHandlers } from './claims.helpline.handlers.js';

const HELPLINE_CLAIM_TAG = 'helpline-claim';

/** The Story 6.3 claim-INTAKE permission key (catalog v7) — the freeze-firing intake gate. */
const CLAIM_FILE_KEY = 'claim.file';
/** The admin step-up action context the intake route requires (§2.2 fresh-transactional-OTP
 *  leg, satisfied by the operator's OWN admin step-up — NOT a nominee handover OTP). */
const CLAIM_FILE_STEP_UP_CONTEXT = 'claim_file';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerHelplineClaimsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createHelplineClaimsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canFileClaim = requirePermissionHook(deps, CLAIM_FILE_KEY);
  const stepUp = requireStepUp(deps, CLAIM_FILE_STEP_UP_CONTEXT);

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/intake',
    {
      schema: {
        params: PariwarParam,
        body: HelplineClaimIntakeRequest,
        response: { 200: HelplineClaimIntakeResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      // The freeze-firing intake: permission + the operator's OWN fresh admin step-up (§2.2).
      preHandler: [adminSession, scope, canFileClaim, stepUp],
    },
    h.initiateHelplineIntake,
  );

  // Review Finding (AC4/AC5) — a non-freezing, audit-only line for a read-back confirmation or
  // an AR-61 escalation. Permission-gated only (no step-up: neither mutates claim/member state).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/operator-event',
    {
      schema: {
        params: PariwarParam,
        body: HelplineOperatorEventRequest,
        response: { 200: HelplineOperatorEventResponse },
        tags: [HELPLINE_CLAIM_TAG],
      },
      preHandler: [adminSession, scope, canFileClaim],
    },
    h.recordOperatorEvent,
  );
}
