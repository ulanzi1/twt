// step-up gating middleware (Story 1.9, Task 5.3, AC-4).
//
// THE GATING DECISION lives here (not in the channel). A route declares itself
// step-up-gated by adding `requireStepUp(deps, actionContext)` to its pre-handlers.
// The hook passes only when the session carries a FRESH elevated context for that
// exact `actionContext`; otherwise it throws `StepUpRequiredError` → a structured
// 403 "step-up required" the client uses to drive the OTP request/verify flow. The
// elevated window is ~5 min (§2.2) and is bound to a single action_context so an
// elevation for operation A never satisfies a gate on operation B.

import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppDeps } from '../../context.js';
import { StepUpRequiredError } from '../../http-errors.js';

export function requireStepUp(deps: AppDeps, actionContext: string): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const now = deps.clock().getTime();
    const { elevatedUntil, elevatedAction } = request.session;
    const fresh =
      typeof elevatedUntil === 'number' &&
      elevatedUntil > now &&
      elevatedAction === actionContext;
    if (!fresh) {
      throw new StepUpRequiredError(actionContext);
    }
  };
}
