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
import { hmacOtpAuditCorrelation } from '../auth/shared/otp.js';
import type { StepUpDeliveryResult } from '../auth/shared/step-up-delivery.js';
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
      // Story 5.9 (Task 5): admin step-up OTP-over-SMS is DEFERRED (admins carry email only — no mobile
      // column; R4). Admin ALWAYS uses the always-stub `adminStepUpDelivery`, never the real SMS adapter.
      // `intent: 'step_up'` is passed for symmetry only — the stub ignores it and never reaches the gateway.
      const delivery = {
        code,
        actorId: userId,
        actionContext: body.actionContext,
        intent: 'step_up' as const,
        pariwarId,
      };
      // Mirror the member call sites (Story 5.9 review): the port contract permits any implementation to
      // throw on non-accept — audit + propagate rather than let an admin step-up request 500 with no record.
      let deliveryResult: StepUpDeliveryResult;
      try {
        deliveryResult = await deps.adminStepUpDelivery.deliver(delivery);
      } catch (err) {
        deps.adminStepUpDelivery.onPrimaryDeliveryFailure?.(delivery, err);
        emitAuthAudit(deps, request, 'step_up.failure', {
          actorId: userId,
          context: { reason: 'otp_delivery_failed' },
        });
        throw err;
      }

      // Story 5.9 (Task 4): harmonize to the member HMAC posture — record the non-invertible, linkable
      // `otp_audit_tag` (NOT the brute-forceable plain SHA-256 `otp_hash`). Task 3: record delivery metadata.
      emitAuthAudit(deps, request, 'step_up.send', {
        actorId: userId,
        context: {
          otp_audit_tag: hmacOtpAuditCorrelation(otpHash, deps.config.auditOtpCorrelationKey),
          action_context: body.actionContext,
          sent_at: deps.clock().toISOString(),
          delivery_channel: deliveryResult.channel,
          delivery_status: deliveryResult.status,
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
      // Story 5.9 (Task 4): tag the consume with the SAME HMAC correlation tag as the send so admin
      // send↔consume link (non-repudiation), as the member paths already do.
      emitAuthAudit(deps, request, 'step_up.consume', {
        actorId: userId,
        context: {
          action_context: result.actionContext,
          otp_audit_tag: hmacOtpAuditCorrelation(result.otpHash, deps.config.auditOtpCorrelationKey),
        },
      });
      return { elevated: true, elevatedUntil: new Date(elevatedUntil).toISOString() };
    },
  };
}
