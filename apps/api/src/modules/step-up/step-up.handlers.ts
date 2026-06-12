// step-up handlers (Story 1.9, Task 5) — request + verify glue.
//
// Both are session-gated (requireAdminSession). request mints + delivers (seamed)
// an OTP and audits the SEND (otp_hash, action_context, sent_at — never the code);
// verify checks it, sets the ~5-min elevated context on the session, and audits the
// CONSUME (or FAILURE).

import type {
  StepUpRequestRequest,
  StepUpRequestResponse,
  StepUpVerifyRequest,
  StepUpVerifyResponse,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import * as service from './step-up.service.js';

export function createStepUpHandlers(deps: AppDeps) {
  return {
    async request(request: FastifyRequest): Promise<StepUpRequestResponse> {
      const userId = request.session.userId as string; // requireAdminSession guarantees it
      const body = request.body as StepUpRequestRequest;
      const pariwarId = request.requestContext.pariwarId ?? null;

      const { code, otpHash, expiresAt } = await service.requestStepUp(
        deps,
        userId,
        body.actionContext,
        pariwarId,
      );
      await deps.stepUpDelivery.deliver({ code, actorId: userId, actionContext: body.actionContext });

      emitAuthAudit(deps, request, 'step_up.send', {
        actorId: userId,
        context: {
          otp_hash: otpHash,
          action_context: body.actionContext,
          sent_at: deps.clock().toISOString(),
        },
      });
      return {
        sent: true,
        expiresInSeconds: Math.max(1, Math.floor((expiresAt.getTime() - deps.clock().getTime()) / 1000)),
      };
    },

    async verify(request: FastifyRequest): Promise<StepUpVerifyResponse> {
      const userId = request.session.userId as string;
      const body = request.body as StepUpVerifyRequest;
      const result = await service.verifyStepUp(deps, userId, body.otp);
      if (!result.ok) {
        emitAuthAudit(deps, request, 'step_up.failure', { actorId: userId });
        throw new UnauthorizedError('Step-up verification failed', 'auth.step_up_failed');
      }
      const elevatedUntil = deps.clock().getTime() + deps.config.stepUpElevatedMs;
      request.session.elevatedUntil = elevatedUntil;
      request.session.elevatedAction = result.actionContext;
      emitAuthAudit(deps, request, 'step_up.consume', {
        actorId: userId,
        context: { action_context: result.actionContext },
      });
      return { elevated: true, elevatedUntil: new Date(elevatedUntil).toISOString() };
    },
  };
}
