// Epic-8 pool-contribution UPI Intent routes — Story 8.4 (Task 3). The FIRST Epic-8 WRITE surface.
//
// TWO member-session-gated POST routes under /api/v1/member/contribution (token-bearer like the
// member-pool read). Session-guarded → automatically covered by the Story 1.14 login-wall CI gate; NOT
// added to the public allowlist (these are NOT public — they write on behalf of the authenticated member).
// Both are body-returning POSTs, so `onRequest`/handler-return is the norm — no `onSend` hook is added
// (the Fastify onSend double-send hazard does not apply here).

import {
  ContributionAttestRequest,
  ContributionAttestResponse,
  ContributionIntentRequest,
  ContributionIntentResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createPaymentHandlers } from './handlers.js';

const PAYMENT_TAG = 'payment';

export function registerPaymentRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPaymentHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  // Build the server-authoritative UPI Intent (or the first-class no-VPA/unassigned fail-soft).
  r.post(
    '/api/v1/member/contribution/intent',
    {
      schema: {
        body: ContributionIntentRequest,
        response: { 200: ContributionIntentResponse },
        tags: [PAYMENT_TAG],
      },
      preHandler: [memberSession],
    },
    h.intent,
  );

  // Self-attest the UTR → the yellow pill (a member CLAIM; never the Epic-9 green flip).
  r.post(
    '/api/v1/member/contribution/attest',
    {
      schema: {
        body: ContributionAttestRequest,
        response: { 200: ContributionAttestResponse },
        tags: [PAYMENT_TAG],
      },
      preHandler: [memberSession],
    },
    h.attest,
  );
}
