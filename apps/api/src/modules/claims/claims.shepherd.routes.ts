// Shepherd manual-reassignment admin route — Story 6.12 (Task 6; AC5/AC6, R6).
//
// ONE scope-gated admin WRITE route — the human-initiated shepherd correction path FR-41 requires
// (AR-61 automatic fallback alone does not provide an ordinary administrative reassignment):
//   · POST …/admin/claims/:claimCaseId/shepherd/reassign → reassign the family's named contact.
//
// The route IS the security control (the 6.11 posture): an authenticated HUMAN admin session + the NEW
// `claim.assign_shepherd` WRITE key (catalog v14) at the deceased member's SERVER-DERIVED district +
// tenant match — fail-closed, audited. Being able to reassign the shepherd grants NO adjudication power
// (AC6) — this key is DISTINCT from claim.approve / claim.verify. District is derived server-side (the
// 6.10/6.11 pattern), never client-submitted: a preHandler replicates the (unexported, per-route)
// resolveDecisionDistrict shape and stashes it on `request.decisionDistrict`; no-district → 403.

import { claim, ids, member as memberDomain } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { ShepherdReassignRequest, ShepherdReassignResponse } from '@twt/contracts';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createShepherdHandlers } from './claims.shepherd.handlers.js';

const TAG = 'shepherd';

/** R6 (RATIFIED): the NEW `claim.assign_shepherd` WRITE key (catalog v14) — distinct from claim.approve. */
const CLAIM_ASSIGN_SHEPHERD_KEY = 'claim.assign_shepherd';

const ShepherdReassignParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() })
  .strict();

/**
 * PreHandler: derive the deceased member's latest posting district SERVER-SIDE and stash it so the
 * (synchronous) district `resolveValue` can read it (the client never submits the authz district). A
 * verbatim replica of the 6.10/6.11 `resolveDecisionDistrict` shape (those are unexported per-route
 * preHandlers a route cannot import — each surface copies the pattern locally). A claim missing in this
 * Pariwar stashes `null` (⇒ the district gate fails closed to 403).
 */
function resolveShepherdDistrict(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { claimCaseId } = request.params as { claimCaseId: string };
    const claimRow = await claim.getClaimCase(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      ids.claimId(claimCaseId),
    );
    if (!claimRow) {
      request.decisionDistrict = null;
      return;
    }
    const posting = await memberDomain.getMemberPostingLatest(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      claimRow.deceasedMemberId,
    );
    request.decisionDistrict = posting?.district ?? null;
  };
}

export function registerShepherdRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createShepherdHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveShepherdDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.decisionDistrict ?? null;
  const requireAssignShepherd = requirePermissionHook(deps, CLAIM_ASSIGN_SHEPHERD_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });

  // AC5/R6 — manual reassignment. Human-actor + claim.assign_shepherd + district. Self-assignment
  // prohibited + manual-target fail-closed are enforced in the handler.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/shepherd/reassign',
    {
      schema: {
        params: ShepherdReassignParam,
        body: ShepherdReassignRequest,
        response: { 201: ShepherdReassignResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireAssignShepherd],
    },
    h.reassignShepherd,
  );
}
