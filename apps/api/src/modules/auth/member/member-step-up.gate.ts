// Member step-up gating middleware (Story 3.2, Task 7, AC-2).
//
// The member analogue of modules/step-up/gate.ts. A member route declares itself
// step-up-gated by adding `requireMemberStepUp(deps, actionContext)` AFTER
// `requireMemberSession` in its pre-handlers. It passes only when a FRESH elevation
// record (`elevated_until > now`) exists for THIS member AND the `action_context`
// matches EXACTLY — an elevation for action A never satisfies a gate on action B.
// On a miss it throws `StepUpRequiredError` → the structured 403 the client uses to
// drive the member step-up request/verify flow and retry.
//
// Elevation lives in a SERVER-SIDE record (member_step_up_elevations), NOT a client
// token (R4) — members have no `request.session`, and a token-embedded elevation
// would break per-OTP revocability (§2.2).

import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { StepUpRequiredError, UnauthorizedError } from '../../../http-errors.js';
import * as repo from './member-auth.repo.js';

export function requireMemberStepUp(deps: AppDeps, actionContext: string): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    // requireMemberSession must run first; actorId is the authenticated member.
    const memberId = request.requestContext.actorId;
    if (!memberId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    // P24: a DB error here would propagate as a 500, permanently blocking the gated
    // route for the duration of the outage. Catch and surface as step_up_required so
    // the client can attempt the step-up flow and try again.
    let fresh: boolean;
    try {
      fresh = await repo.hasFreshElevation(deps.pool, memberId, actionContext, deps.clock());
    } catch {
      throw new StepUpRequiredError(actionContext);
    }
    if (!fresh) {
      throw new StepUpRequiredError(actionContext);
    }
  };
}
