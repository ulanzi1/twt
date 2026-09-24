// Nominee declaration routes — Story 3.4 (Task 5). The committed nominee member API surface.
//
// Two routes under /api/v1/member/nominees (member-session-gated, token-bearer like the 3.3b
// KYC surface): POST declares 1–2 nominees, GET reads the current declaration. Neither carries a
// step-up PREHANDLER (the member holds a fresh signup-continuation session at signup; R3). Story 3.9
// adds `requireMemberStepUp(deps, 'nominee_change')` on its Life Events UPDATE route, re-running the
// same declare handler. ⚠ Story 6.20 (D9, AR-24): the declare HANDLER itself now requires a fresh
// `nominee_change` step-up for a RE-declaration outside the wizard states — on this route too — because
// whether a submit is a change is only known inside its transaction. An INITIAL declaration needs none.

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
