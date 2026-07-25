// Nominee Console read route — Story 9.1 (Task 1). The committed Epic-9 Nominee Console API surface.
//
// ONE route under /api/v1/member (member-session-gated, token-bearer like the 8.2/8.3 My Pool reads):
// GET /nominee-console drives Sunita's `<NomineeConsole>` surface. Session-guarded → automatically covered
// by the Story 1.14 login-wall CI gate; NOT added to the public allowlist (it is a member self-view).
//
// The READ needs only the member session (the 8.2/8.3 posture). The console's WRITE actions (the Story 9.3
// bank-statement upload) will land their OWN routes behind `requireMemberStepUp('claim_handover')` — the
// documented step-up seam extending the claim_handover pattern; not built here.

import { NomineeConsoleResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createNomineeConsoleHandlers } from './handlers.js';

const NOMINEE_CONSOLE_TAG = 'nominee-console';

export function registerNomineeConsoleRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNomineeConsoleHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.get(
    '/api/v1/member/nominee-console',
    {
      schema: { response: { 200: NomineeConsoleResponse }, tags: [NOMINEE_CONSOLE_TAG] },
      preHandler: [memberSession],
    },
    h.nomineeConsole,
  );
}
