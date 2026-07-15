// Verifier concealment-linkage assessment admin route — Story 6.15 (Task 5; AC7, D-D/D-G).
//
// ONE scope-gated admin WRITE route — the verifier records/revises the concealment-linkage fact:
//   · POST …/admin/claims/:claimCaseId/concealment-assessment → record/revise (kind + optional note)
//
// The route IS the security control: an authenticated HUMAN admin session + the EXISTING `claim.verify`
// READ/verify key (the 6.10 verifier gate — a verifier annotates; the trustee alone DECIDES, D-B) at the
// deceased member's SERVER-DERIVED district + tenant match — fail-closed, audited.
//
// ── District is derived server-side, never client-submitted (the 6.10/6.11 pattern, D3) ─────────────
// A preHandler resolves the deceased member's latest posting district and stashes it on
// `request.decisionDistrict`; the sync `resolveValue` reads the stash. The client submits ONLY pariwarId +
// claimCaseId in the path (+ the kind/note body). No-district → fail-closed 403. (Verbatim reuse of the
// 6.11 `resolveDecisionDistrict` shape — the same human-actor chain the adjudication routes compose.)

import { claim, ids, member as memberDomain } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { ConcealmentAssessmentRequest, ConcealmentAssessmentResponse } from '@twt/contracts';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createConcealmentAssessmentHandlers } from './claims.concealment-assessment.handlers.js';

const TAG = 'concealment-assessment';

/** The EXISTING verifier-console READ/verify key (Story 6.10, catalog v13) — a verifier annotates; the
 *  State Trustee alone decides (D-B). No new key, no catalog bump. */
const CLAIM_VERIFY_KEY = 'claim.verify';

const AssessmentParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

/**
 * PreHandler: derive the deceased member's latest posting district SERVER-SIDE and stash it so the
 * (synchronous) district `resolveValue` can read it (the client never submits the authz district — D3).
 * A claim missing in this Pariwar stashes `null` (⇒ the district gate fails closed to 403), the same
 * fail-closed posture as no district.
 */
function resolveAssessmentDistrict(): preHandlerHookHandler {
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

export function registerConcealmentAssessmentRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createConcealmentAssessmentHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveAssessmentDistrict();
  const districtFromStash = (request: FastifyRequest): string | null => request.decisionDistrict ?? null;
  const requireVerify = requirePermissionHook(deps, CLAIM_VERIFY_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });

  // AC7 — record/revise the tri-state concealment assessment. Human-actor + claim.verify + district.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/concealment-assessment',
    {
      schema: {
        params: AssessmentParam,
        body: ConcealmentAssessmentRequest,
        response: { 201: ConcealmentAssessmentResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireVerify],
    },
    h.postAssessment,
  );
}
