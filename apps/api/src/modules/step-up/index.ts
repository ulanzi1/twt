// Step-up OTP module (Story 1.9, Task 5, AC-4) — request/verify routes + a
// demonstrative step-up-gated probe that proves the gating decision end-to-end.
//
// Rate limit (§2.2 "rate-limited per actor + per IP"): the request route is keyed
// on `<actorId>|<ip>` — @fastify/rate-limit is registered AFTER @fastify/session,
// so the session is loaded and the actor id is available in the keyGenerator. The
// per-actor COST budget is additionally enforced by the mechanism itself
// (invalidate-on-next → one live OTP, + the attempt cap). The middleware owns the
// gating decision; the channel (Story 5.6/5.9) owns transport — R3.

import {
  StepUpRequestRequest,
  StepUpRequestResponse,
  StepUpVerifyRequest,
  StepUpVerifyResponse,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requireStepUp } from './gate.js';
import { createStepUpHandlers } from './step-up.handlers.js';

const STEP_UP_TAG = 'admin-step-up';

export function registerStepUpRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createStepUpHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const session = requireAdminSession(deps);

  const stepUpRate = {
    max: deps.config.stepUpRateMax,
    timeWindow: '1 minute',
    keyGenerator: (request: FastifyRequest): string =>
      `${request.session?.userId ?? 'anon'}|${request.ip}`,
  } as const;

  r.post(
    '/api/v1/auth/step-up/request',
    {
      schema: { body: StepUpRequestRequest, response: { 200: StepUpRequestResponse }, tags: [STEP_UP_TAG] },
      preHandler: [session],
      config: { rateLimit: stepUpRate },
    },
    h.request,
  );

  r.post(
    '/api/v1/auth/step-up/verify',
    {
      schema: { body: StepUpVerifyRequest, response: { 200: StepUpVerifyResponse }, tags: [STEP_UP_TAG] },
      preHandler: [session],
      config: { rateLimit: stepUpRate },
    },
    h.verify,
  );

  // Demonstrative step-up-gated route — proves the gate (403 without a fresh
  // elevation for this action_context; 200 with one). Hidden from the spec.
  app.post(
    '/api/v1/auth/step-up/protected-probe',
    { schema: { hide: true }, preHandler: [session, requireStepUp(deps, 'step_up.demo')] },
    () => ({ ok: true }),
  );
}
