// Member pool-onboarding-tutorial route — Story 7.10 (Task 5; AC4).
//
// ONE member-session-gated endpoint (POST record outcome). Guarded by requireMemberSession (the
// MEMBER_SESSION_GUARD tag satisfies the login-wall fails-closed CI guard — an authenticated route that
// forgot the gate fails CI). Registers in openapi/v1.yaml (the EXPECTED diff — hand-authored in
// packages/contracts/scripts/emit-openapi.ts). The body is validated by the Zod contract; the success
// response is 204 (no body).

import { PoolOnboardingOutcomeRequest } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createPoolOnboardingHandlers } from './handlers.js';

const POOL_ONBOARDING_TAG = 'pool-onboarding';

export function registerPoolOnboardingRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPoolOnboardingHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.post(
    '/api/v1/member/pool-onboarding-tutorial',
    {
      schema: { body: PoolOnboardingOutcomeRequest, tags: [POOL_ONBOARDING_TAG] },
      preHandler: [memberSession],
    },
    h.record,
  );
}
