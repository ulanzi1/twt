// Story 10.21 — off-portal DPDPA data-rights fulfilment ROUTES (AC3).
//
// ⛔ EVERY route here sits behind the FULL four-hook chain, and each hook is load-bearing:
//   requireAdminSession   — a staff session (this is an admin surface; the subject has no session)
//   scopeResolutionHook   — resolves the tenant scope tx the handlers write under (RLS)
//   requirePermissionHook — `member.data_rights` at `dimension: 'pariwar'`. ⛔ NOT `helpdesk.create`:
//                           filing a request and EXECUTING it on a member with no session are
//                           different authorities, which is the whole reason the key was minted.
//   requireStepUp         — a DISTINCT step-up context, so no other elevation satisfies it and this
//                           elevation satisfies nothing else.
//
// ⚠ THE STEP-UP CONTEXT IS AN UNGUARDED STRING. `requireStepUp` compares a bare string by equality and
// the contract has no allow-list, so distinctness holds by string inequality alone. Both this route AND
// the admin client's OTP-request call import `DATA_RIGHTS_STEP_UP_CONTEXT` — ⛔ never a literal. A typo
// here fails closed (tolerable); a typo on the OTP side yields an elevation that can NEVER satisfy this
// gate, with nothing anywhere naming the cause.
//
// ⛔ NO delivery route (AC-R1, Escalation 1), NO correction route (AC-R2, Escalation 2), and NO
// trustee-authority destination (AC-R3, Escalation 10). All three are RAISED AND UNANSWERED.

import { DATA_RIGHTS_STEP_UP_CONTEXT, OffPortalErasureRequest, OffPortalErasureResponse, OffPortalExportRequest, OffPortalExportResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requirePermissionHook } from '../rbac/index.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createMemberDataRightsHandlers } from './handlers.js';

const MEMBER_DATA_RIGHTS_TAG = 'member-data-rights';

/** The `member.data_rights` catalog key (v33), checked at the `pariwar` dimension. */
const MEMBER_DATA_RIGHTS_KEY = 'member.data_rights';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerMemberDataRightsRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberDataRightsHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const limits = namedRateLimits(deps);
  const requireDataRights = requirePermissionHook(deps, MEMBER_DATA_RIGHTS_KEY, { dimension: 'pariwar' });
  const stepUp = requireStepUp(deps, DATA_RIGHTS_STEP_UP_CONTEXT);

  // BUILD the access/portability artifact off-session. ⛔ Builds only — there is no download here.
  r.post(
    '/api/v1/p/:pariwarId/member-data-rights/export',
    {
      schema: {
        params: PariwarParam,
        body: OffPortalExportRequest,
        response: { 200: OffPortalExportResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.requestExport,
  );

  // EXECUTE erasure off-session. ⛔ IRREVERSIBLE — see the handler's advisory lock and the
  // `Idempotency-Key` requirement.
  r.post(
    '/api/v1/p/:pariwarId/member-data-rights/erasure',
    {
      schema: {
        params: PariwarParam,
        body: OffPortalErasureRequest,
        response: { 200: OffPortalErasureResponse },
        tags: [MEMBER_DATA_RIGHTS_TAG],
      },
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireDataRights, stepUp],
    },
    h.fulfilErasure,
  );
}
