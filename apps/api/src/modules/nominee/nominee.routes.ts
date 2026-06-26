// Nominee declaration routes — Story 3.4 (Task 5). The committed nominee member API surface.
//
// Two routes under /api/v1/member/nominees (member-session-gated, token-bearer like the 3.3b
// KYC surface): POST declares 1–2 nominees, GET reads the current declaration. BOTH require a
// member session and NOTHING more — there is NO step-up preHandler at signup (the member
// holds a fresh signup-continuation session; R3). Story 3.9 adds `requireMemberStepUp(deps,
// 'nominee_change')` on its Life Events UPDATE route, re-running the same declare handler.

import { NomineeDeclareRequest, NomineeStatusResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createNomineeHandlers } from './nominee.handlers.js';

const NOMINEE_TAG = 'member-nominee';

export function registerNomineeRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNomineeHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.post(
    '/api/v1/member/nominees',
    {
      schema: {
        body: NomineeDeclareRequest,
        response: { 200: NomineeStatusResponse },
        tags: [NOMINEE_TAG],
      },
      preHandler: [memberSession],
    },
    h.declare,
  );

  r.get(
    '/api/v1/member/nominees',
    { schema: { response: { 200: NomineeStatusResponse }, tags: [NOMINEE_TAG] }, preHandler: [memberSession] },
    h.status,
  );
}
