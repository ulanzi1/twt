// Member home-screen read routes — Story 3.7 (Task 3). The committed lock-in home-widget API surface.
//
// ONE route under /api/v1/member (member-session-gated, token-bearer like the 3.5 medical / 3.6a terms
// / 3.6b vyawastha-shulk surfaces): GET /lock-in-status reads the lock-in clock for the home widget.
// Session-guarded → automatically covered by the Story 1.14 login-wall CI gate; NOT added to the
// allowlist (it is NOT public).

import { MemberLockInStatusResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberHomeHandlers } from './handlers.js';

const MEMBER_HOME_TAG = 'member-home';

export function registerMemberHomeRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberHomeHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.get(
    '/api/v1/member/lock-in-status',
    {
      schema: { response: { 200: MemberLockInStatusResponse }, tags: [MEMBER_HOME_TAG] },
      preHandler: [memberSession],
    },
    h.lockInStatus,
  );
}
