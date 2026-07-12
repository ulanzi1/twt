// Verifier adjudication handlers — Story 6.11 (Task 4; AC0/AC2/AC3/AC5/AC8/AC9/AC10).
//
// The FIRST verifier WRITE. Two authenticated admin surfaces share the decision-strip verbs:
//   · POST …/admin/claims/:claimCaseId/verifier-decision         → approve / deny / escalate
//   · POST …/admin/claims/:claimCaseId/verifier-decision/revise  → same-outcome revise (step-up-gated)
//
// ── The two-authority write (AC0) ───────────────────────────────────────────────────────────
// Each verb writes BOTH the claim.verifier_* LIFECYCLE event (via the domain writer's projectClaimState
// — the LIFECYCLE authority) AND the claim_verifier_decisions DECISION-METADATA row (the
// DECISION-METADATA authority) in ONE committed scope-tx (the domain writer owns the advisory lock +
// claim row-lock + state guard + event + row). Claim STATE is never derived from the decision row.
//
// ── Concerns THIS file owns (the 6.8 nominee-bank posture) ──────────────────────────────────
// (1) ACTOR-DISPLAY (R5) resolves FIRST, before any lock/tx, for EVERY verb — server-side from
//     users.display_name; NULL/empty → AdminDisplayNameMissingError (409) fail-closed, no event/row/
//     audit line. NO fallback (never the email/UUID/role/placeholder/client input; the DTO is .strict()).
// (2) The rationale (Tier-1 PII, D-G) is ENCRYPTED BEFORE the writer; the writer takes ciphertext.
// (3) AUDIT IS A POST-COMMIT SINK — NON-PII (claim id + district + outcome + reason_code + actor);
//     NEVER the rationale (D-G — not on an audit line, log, index, or filter).
// (4) The domain writer's typed guards (ClaimNotInVerifierReviewError / ClaimNotEscalatableError /
//     ClaimDecisionNotRevisableError / ReasonCodeOutcomeMismatchError / DecisionRevisionConflictError)
//     map to stable 4xx here; the advisory lock + state guard + unique indexes give idempotency (AC9).

import {
  type VerifierDecisionRequest,
  type VerifierDecisionResponse,
  type VerifierDecisionReviseRequest,
} from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { encryptOptionalVerifierRationale } from './verifier-decision-crypto.js';

/** Map a verifier-decision domain error to its stable HTTP shape. Rethrows anything unknown. */
function translateDecisionError(err: unknown): never {
  if (err instanceof claim.VerifierDecisionClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (err instanceof claim.ClaimNotInVerifierReviewError) {
    throw new ConflictError(
      'The claim cannot be approved/denied in its current state',
      'verifier_decision.not_in_review',
      { state: err.currentState },
    );
  }
  if (err instanceof claim.ClaimNotEscalatableError) {
    throw new ConflictError(
      'The claim cannot be escalated in its current state',
      'verifier_decision.not_escalatable',
      { state: err.currentState },
    );
  }
  if (err instanceof claim.ClaimDecisionNotRevisableError) {
    throw new ConflictError(
      err.reason === 'cross_outcome'
        ? 'A revision must keep the same outcome — a reversal is handled by the appeal flow (Story 6.16)'
        : 'The decision cannot be revised in the claim’s current state',
      'verifier_decision.not_revisable',
      { reason: err.reason },
    );
  }
  if (err instanceof claim.ReasonCodeOutcomeMismatchError) {
    throw new BadRequestError(
      'The reason code is not valid for the chosen outcome',
      'verifier_decision.reason_outcome_mismatch',
    );
  }
  if (err instanceof claim.DecisionRevisionConflictError) {
    throw new ConflictError(
      'This decision was revised by someone else — reload and try again',
      'verifier_decision.revision_conflict',
    );
  }
  if (err instanceof claim.ClaimDecisionConflictError) {
    throw new ConflictError(
      'The claim already has a decision recorded — it must be revised, not repeated',
      'verifier_decision.already_decided',
      { outcome: err.existingOutcome },
    );
  }
  if (err instanceof claim.ClaimStreamConcurrencyError) {
    throw new ConflictError(
      'This claim was updated concurrently — reload and try again',
      'verifier_decision.stream_conflict',
    );
  }
  throw err;
}

interface DecisionContext {
  actorId: string;
  district: string;
  pariwarId: ids.PariwarId;
  claimCaseId: ids.ClaimId;
  /** The R5 decision-time display snapshot — resolved FIRST (fail-closed on missing). */
  actorDisplay: string;
}

export function createVerificationDecisionHandlers(deps: AppDeps) {
  /**
   * Establish the request context + resolve the actor-display snapshot (R5) FIRST — before any lock or
   * tx, for EVERY verb. A missing/empty display name BLOCKS with AdminDisplayNameMissingError (409),
   * fail-closed: no event, no decision row, no audit line. NO fallback of any kind.
   */
  async function contextOf(request: FastifyRequest): Promise<DecisionContext> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    const district = request.decisionDistrict;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    if (district == null) {
      // Defensive: the district-resolution preHandler + the district permission gate should have
      // denied a no-district claim already (403). Never adjudicate without an authorized district.
      throw new ForbiddenError('Authorization required', 'auth.forbidden');
    }
    const { claimCaseId } = request.params as { claimCaseId: string };
    // R5 — resolve the controlled staff-attribution display name server-side; block fail-closed if absent.
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) {
      throw new AdminDisplayNameMissingError(actorId);
    }
    return {
      actorId,
      district,
      pariwarId: ids.pariwarId(scopeTx.pariwarId),
      claimCaseId: ids.claimId(claimCaseId),
      actorDisplay,
    };
  }

  /** Post-commit NON-PII audit line (never the rationale, D-G). */
  function auditDecision(
    request: FastifyRequest,
    type: AuthAuditEventType,
    ctx: DecisionContext,
    outcome: string,
    reasonCode: string,
  ): void {
    emitAuthAudit(deps, request, type, {
      actorId: ctx.actorId,
      pariwarId: ctx.pariwarId,
      context: {
        claim_case_id: ctx.claimCaseId,
        district: ctx.district,
        outcome,
        reason_code: reasonCode,
      },
    });
  }

  /** Shape the NON-PII response (never the rationale). */
  function toResponse(result: claim.VerifierDecisionResult): VerifierDecisionResponse {
    return {
      decision_id: result.decision.decisionId,
      claim_case_id: result.decision.claimCaseId,
      pariwar_id: result.decision.pariwarId,
      outcome: result.decision.outcome,
      reason_code: result.decision.reasonCode,
      actor_display: result.decision.actorDisplay,
      decided_at: result.decision.decidedAt.toISOString(),
      supersedes_decision_id: result.decision.supersedesDecisionId ?? null,
      claim_state: result.claimState,
    };
  }

  return {
    /**
     * POST …/admin/claims/:claimCaseId/verifier-decision — approve / deny / escalate (outcome in body).
     * The route chain already proved an authenticated HUMAN actor + claim.approve at the deceased's
     * server-derived district + tenant (AC10). Approve/deny enter review in the write path (D-C);
     * escalate is its own identity annotation with its own guard (D-D).
     */
    async postDecision(request: FastifyRequest, reply: FastifyReply): Promise<VerifierDecisionResponse> {
      const ctx = await contextOf(request);
      const body = request.body as VerifierDecisionRequest;
      const rationaleCiphertext = await encryptOptionalVerifierRationale(
        body.rationale,
        ctx.pariwarId,
        deps.encryption,
      );

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result: claim.VerifierDecisionResult;
      try {
        const base = {
          claimCaseId: ctx.claimCaseId,
          pariwarId: ctx.pariwarId,
          reasonCode: body.reason_code,
          rationaleCiphertext,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'operator' as const,
        };
        result =
          body.outcome === 'escalated'
            ? await claim.escalateClaim(scopeTx.client, base)
            : await claim.adjudicateClaim(scopeTx.client, { ...base, outcome: body.outcome });
        ok = true;
      } catch (err) {
        // Rejected attempts are audited too (AC10 — fail-closed AND audited, not just fail-closed).
        auditDecision(request, 'admin_claim.decision_rejected', ctx, body.outcome, body.reason_code);
        return translateDecisionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      const auditType: AuthAuditEventType =
        body.outcome === 'approved'
          ? 'admin_claim.verifier_approved'
          : body.outcome === 'denied'
            ? 'admin_claim.verifier_denied'
            : 'admin_claim.verifier_escalated';
      auditDecision(request, auditType, ctx, body.outcome, body.reason_code);

      void reply.status(201);
      return toResponse(result);
    },

    /**
     * POST …/admin/claims/:claimCaseId/verifier-decision/revise — same-outcome reason/rationale
     * correction (D-E, AC5). Step-up-gated at the route. Atomic supersession + a dedicated
     * claim.verifier_decision_revised identity annotation (NOT a verdict re-emit).
     */
    async postRevise(request: FastifyRequest, reply: FastifyReply): Promise<VerifierDecisionResponse> {
      const ctx = await contextOf(request);
      const body = request.body as VerifierDecisionReviseRequest;
      const rationaleCiphertext = await encryptOptionalVerifierRationale(
        body.rationale,
        ctx.pariwarId,
        deps.encryption,
      );

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result: claim.VerifierDecisionResult;
      try {
        result = await claim.reviseDecision(scopeTx.client, {
          claimCaseId: ctx.claimCaseId,
          pariwarId: ctx.pariwarId,
          outcome: body.outcome,
          reasonCode: body.reason_code,
          rationaleCiphertext,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'operator',
          ...(body.supersedes_decision_id !== undefined
            ? { supersedesDecisionId: ids.verifierDecisionId(body.supersedes_decision_id) }
            : {}),
        });
        ok = true;
      } catch (err) {
        // Rejected attempts are audited too (AC10 — fail-closed AND audited, not just fail-closed).
        auditDecision(request, 'admin_claim.decision_rejected', ctx, body.outcome, body.reason_code);
        return translateDecisionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      auditDecision(request, 'admin_claim.decision_revised', ctx, body.outcome, body.reason_code);
      void reply.status(201);
      return toResponse(result);
    },
  };
}
