// Verifier adjudication admin routes — Story 6.11 (Task 5; AC1/AC8/AC10, D-B).
//
// TWO scope-gated admin WRITE routes — the FIRST verifier WRITE surface:
//   · POST …/admin/claims/:claimCaseId/verifier-decision         → approve / deny / escalate
//   · POST …/admin/claims/:claimCaseId/verifier-decision/revise  → same-outcome revise (step-up-gated)
//
// The route IS the security control (AC10): an authenticated HUMAN admin session + the EXISTING
// `claim.approve` WRITE key (D-B — NOT granted to the technical `verifier` role; Anita adjudicates as a
// District Admin) at the deceased member's SERVER-DERIVED district + tenant match — fail-closed, audited.
//
// ── District is derived server-side, never client-submitted (the 6.10 pattern, D3) ──────────────────
// `requirePermissionHook`'s resolveValue is SYNCHRONOUS, but the authz district is an async DB
// derivation (the deceased member's latest posting district). A preHandler resolves it first and stashes
// it on `request.decisionDistrict`; the sync resolveValue reads the stash. The client submits ONLY
// pariwarId + claimCaseId in the path (+ the decision body). No-district → fail-closed 403.
//
// ── Revise is additionally step-up-gated (D-E) ──────────────────────────────────────────────────────
// A same-outcome revision requires a FRESH ~5-min elevation bound to `claim_decision_revise` (Story 1.9
// admin session step-up) — added AFTER the permission hook so an unauthorized actor never reaches step-up.

import { claim, ids, member as memberDomain } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { VerifierDecisionRequest, VerifierDecisionResponse, VerifierDecisionReviseRequest } from '@twt/contracts';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createVerificationDecisionHandlers } from './claims.verification-decision.handlers.js';

const TAG = 'verifier-decision';

/** D-B (RATIFIED): reuse the EXISTING `claim.approve` WRITE key — no new key, no catalog bump. */
const CLAIM_APPROVE_KEY = 'claim.approve';

/** The step-up action context for a decision revision (D-E; free-form string — no registry to extend). */
const REVISE_STEP_UP_CONTEXT = 'claim_decision_revise';

const DecisionParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

/**
 * PreHandler: derive the deceased member's latest posting district SERVER-SIDE and stash it so the
 * (synchronous) district `resolveValue` can read it (the client never submits the authz district — D3).
 * Verbatim reuse of the 6.10 `resolveVerifierConsoleDistrict` shape. A claim missing in this Pariwar
 * stashes `null` (⇒ the district gate fails closed to 403), the same fail-closed posture as no district.
 */
function resolveDecisionDistrict(): preHandlerHookHandler {
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
      // No claim in this Pariwar (RLS + explicit predicate; a cross-tenant guess also lands here).
      // Fail closed — the district gate denies (403); the authorization boundary must not leak existence.
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

export function registerVerificationDecisionRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createVerificationDecisionHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveDecisionDistrict();
  // The authz district is the server-derived stash — the client value is never trusted (D3).
  const districtFromStash = (request: FastifyRequest): string | null => request.decisionDistrict ?? null;
  const requireApprove = requirePermissionHook(deps, CLAIM_APPROVE_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });

  // AC1/AC10 — approve / deny / escalate (the decision strip). Human-actor + claim.approve + district.
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-decision',
    {
      schema: {
        params: DecisionParam,
        body: VerifierDecisionRequest,
        response: { 201: VerifierDecisionResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireApprove],
    },
    h.postDecision,
  );

  // AC5/D-E — same-outcome revise. Same human-actor chain + an ADDITIONAL step-up gate (after the
  // permission hook, so an unauthorized actor never reaches step-up).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-decision/revise',
    {
      schema: {
        params: DecisionParam,
        body: VerifierDecisionReviseRequest,
        response: { 201: VerifierDecisionResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireApprove, requireStepUp(deps, REVISE_STEP_UP_CONTEXT)],
    },
    h.postRevise,
  );
}
