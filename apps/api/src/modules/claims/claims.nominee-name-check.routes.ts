// The nominee NAME CHECK routes — Story 6.18 (AC1, AC2, AC3).
//
//   · GET  /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check  — `claim.view_nominee_name_check`
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check  — `claim.check_nominee_name`
//
// ⭐ TWO KEYS ON ONE PATH, and that is the design (AC1). `2026-09-19-226` cl.1 gives the helpline
// operator the DUTY to make sure the names match at filing — so four roles must SEE — while cl.3
// reserves the REVIEW of a mismatch to the District Admin, so one role may RECORD. Gating both verbs
// on one key would either let the filer clear their own work or blind them to the names they are
// accountable for.
//
// Both are checked at `dimension: 'district'` against the deceased member's SERVER-DERIVED posting
// district (the Story 6.10 stash precedent — the client NEVER submits the authz district).

import { claim, ids, member as memberDomain } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NomineeNameCheckRequest, NomineeNameCheckResponse, NomineeNameCheckWriteResponse } from '@twt/contracts';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import {
  NOMINEE_NAME_CHECK_VIEW_KEY,
  NOMINEE_NAME_CHECK_WRITE_KEY,
  createNomineeNameCheckHandlers,
} from './claims.nominee-name-check.handlers.js';

const TAG = 'nominee-name-check';

const NameCheckParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

/**
 * PreHandler: derive the deceased member's latest posting district SERVER-SIDE and stash it so the
 * (synchronous) district `resolveValue` can read it — the client never submits the authz district.
 * Runs AFTER scope-resolution (needs `request.scopeTx`). A claim missing in this Pariwar stashes
 * `null` ⇒ the district gate fails closed to 403, so the boundary never leaks existence.
 */
function resolveNomineeNameCheckDistrict(): preHandlerHookHandler {
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
      request.nomineeNameCheckDistrict = null;
      return;
    }
    const posting = await memberDomain.getMemberPostingLatest(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      claimRow.deceasedMemberId,
    );
    request.nomineeNameCheckDistrict = posting?.district ?? null;
  };
}

export function registerNomineeNameCheckRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createNomineeNameCheckHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveNomineeNameCheckDistrict();
  // The authz district is the server-derived stash — the client value is never trusted.
  const districtFromStash = (request: FastifyRequest): string | null =>
    request.nomineeNameCheckDistrict ?? null;
  const requireView = requirePermissionHook(deps, NOMINEE_NAME_CHECK_VIEW_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });
  const requireCheck = requirePermissionHook(deps, NOMINEE_NAME_CHECK_WRITE_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });

  // AC2 — the two names, side by side. READ-ONLY, audited, human-actor-only.
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check',
    {
      schema: {
        params: NameCheckParam,
        response: { 200: NomineeNameCheckResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireView],
    },
    h.getNomineeNameCheck,
  );

  // AC3 — the District Admin records the verdict.
  // ⭐ BOTH keys are required on the write: `requireView` runs first because recording a judgement
  // about two names you may not look at would be incoherent, and `-226` cl.5 forbids proceeding
  // without a selected reason — a rule that only means something to someone who has SEEN the names.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check',
    {
      schema: {
        params: NameCheckParam,
        body: NomineeNameCheckRequest,
        response: { 201: NomineeNameCheckWriteResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireView, requireCheck],
    },
    h.postNomineeNameCheck,
  );
}
