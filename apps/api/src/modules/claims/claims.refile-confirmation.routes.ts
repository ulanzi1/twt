// The RE-FILE CONFIRMATION route — Story 6.19c (AC15, D19). Its OWN route file: ⛔ not `claims.helpline.routes.ts` /
// `claims.convergence.routes.ts` (both sit in the human-actor gate's `ENROLMENT_OWED`, unscanned).
//
//   · POST …/admin/claims/:claimCaseId/refile-confirmation — key (6) `claim.confirm_refile` (district_admin +
//     helpline_operator), the authenticated-HUMAN chain [adminSession, scope, resolveRefileScope, requirePermissionHook].
//
// ⭐ The gate target moves with the caller (the 6.17 per-request-dimension shape): a caller holding key (6) at a
// pariwar-or-broader grant is gated at the Pariwar; any other at the CLOSED claim's server-derived posting district —
// ⛔ a fixed district gate would refuse a pariwar-ceiling operator on a deceased with ⛔ no resolvable district
// (`scopeContains` fails a `null` target closed before it reads the grant). A claim of another Pariwar resolves ⛔ no
// district and ⛔ no row: the gate fails closed, or the writer 404s.

import { RefileConfirmationRequest, RefileConfirmationResponse } from '@twt/contracts';
import { claim, ids, member as memberDomain, rbac } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { loadActorGrants, requirePermissionHook } from '../rbac/index.js';
import { REFILE_CONFIRM_KEY, createRefileConfirmationHandlers } from './claims.refile-confirmation.handlers.js';

const TAG = 'claim-refile-confirmation';

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

/** PreHandler: stash the gate target for THIS caller and THIS claim (see the header). Runs after scope resolution. */
function resolveRefileScope(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
    request.scopeGrants = grants;
    // ⚠ ONLY a grant whose role carries the key, at its OWN scope, may choose the target (the 6.18 queue's lesson).
    const broad = grants.some(
      (g) =>
        g.pariwarId === scopeTx.pariwarId &&
        (g.scopeDimension === 'pariwar' || g.scopeDimension === 'global') &&
        rbac.hasPermission([g], REFILE_CONFIRM_KEY, { dimension: g.scopeDimension, value: g.scopeValue, pariwarId: g.pariwarId }),
    );
    if (broad) {
      request.refileConfirmationScope = { dimension: 'pariwar', value: scopeTx.pariwarId };
      return;
    }
    const { claimCaseId } = request.params as { claimCaseId: string };
    const pariwarId = ids.pariwarId(scopeTx.pariwarId);
    const claimRow = await claim.getClaimCase(scopeTx.tx, pariwarId, ids.claimId(claimCaseId));
    const posting = claimRow ? await memberDomain.getMemberPostingLatest(scopeTx.tx, pariwarId, claimRow.deceasedMemberId) : null;
    request.refileConfirmationScope = { dimension: 'district', value: posting?.district ?? null };
  };
}

export function registerRefileConfirmationRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createRefileConfirmationHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canConfirm = requirePermissionHook(deps, REFILE_CONFIRM_KEY, {
    dimension: 'district',
    resolveDimension: (request: FastifyRequest): rbac.ScopeDimension => request.refileConfirmationScope?.dimension ?? 'district',
    resolveValue: (request: FastifyRequest): string | null => request.refileConfirmationScope?.value ?? null,
  });

  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/refile-confirmation',
    {
      schema: { params: ClaimParam, body: RefileConfirmationRequest, response: { 201: RefileConfirmationResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, resolveRefileScope(), canConfirm],
    },
    h.recordRefileConfirmation,
  );
}
