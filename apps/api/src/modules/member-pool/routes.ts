// My Pool home-card read routes — Story 8.2 (Task 2). The committed Epic-8 My Pool API surface.
//
// ONE route under /api/v1/member (member-session-gated, token-bearer like the member-home lock-in
// read): GET /active-contribution drives the topmost home-screen <ActiveContributionCard>.
// Session-guarded → automatically covered by the Story 1.14 login-wall CI gate; NOT added to the
// public allowlist (it is NOT public).

import { ActiveContributionCardResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberPoolHandlers } from './handlers.js';

const MEMBER_POOL_TAG = 'member-pool';

export function registerMemberPoolRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberPoolHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.get(
    '/api/v1/member/active-contribution',
    {
      schema: { response: { 200: ActiveContributionCardResponse }, tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
    },
    h.activeContribution,
  );
}
