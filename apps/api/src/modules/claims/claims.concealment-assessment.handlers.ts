// Verifier concealment-linkage assessment handler — Story 6.15 (Task 5; AC7, D-D/D-E/D-G).
//
// The verifier records/revises a tri-state concealment-linkage assessment on a claim — the human-supplied
// `claim.concealed_ima_condition_linked` fact. A review ANNOTATION, NEVER an adjudication:
//   · POST …/admin/claims/:claimCaseId/concealment-assessment → record/revise (kind + optional note)
//
// ── The two-authority write (D-E) ───────────────────────────────────────────────────────────
// The domain writer (recordConcealmentAssessment) writes BOTH the claim_concealment_assessments row (the
// authoritative read model — layer 1) AND the claim.concealment_assessed IDENTITY event (layer 2) in ONE
// committed scope-tx. This audit line (layer 3) is an ADDITIONAL admin-action record — NEVER a substitute
// for the evidentiary event. Claim STATE is unchanged (the event is identity): no approval/denial, ever.
//
// ── Concerns THIS file owns (the 6.11 verifier-decision posture) ────────────────────────────
// (1) ACTOR-DISPLAY (R5) resolves FIRST, before any lock/tx — server-side from users.display_name;
//     NULL/empty → AdminDisplayNameMissingError (409) fail-closed, no event/row/audit line. NO fallback.
// (2) The optional note (Tier-1 PII, D-G) is ENCRYPTED BEFORE the writer; the writer takes ciphertext.
// (3) AUDIT IS A POST-COMMIT SINK — NON-PII (claim_case_id + kind + actor); NEVER the note (D-G).
// (4) The domain writer's typed guards (ConcealmentAssessmentClaimNotFoundError /
//     ConcealmentAssessmentRevisionConflictError) map to stable 4xx here.

import { type ConcealmentAssessmentRequest, type ConcealmentAssessmentResponse } from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { encryptOptionalConcealmentNote } from './concealment-assessment-crypto.js';

/** Map a concealment-assessment domain error to its stable HTTP shape. Rethrows anything unknown. */
function translateAssessmentError(err: unknown): never {
  if (err instanceof claim.ConcealmentAssessmentClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (err instanceof claim.ConcealmentAssessmentRevisionConflictError) {
    throw new ConflictError(
      'This assessment was revised by someone else — reload and try again',
      'concealment_assessment.revision_conflict',
    );
  }
  if (err instanceof claim.ConcealmentAssessmentBlockedStateError) {
    throw new ConflictError(
      'This claim is not in a valid state for a concealment assessment',
      'concealment_assessment.blocked_state',
      { state: err.currentState },
    );
  }
  throw err;
}

interface AssessmentContext {
  actorId: string;
  district: string;
  pariwarId: ids.PariwarId;
  claimCaseId: ids.ClaimId;
  /** The R5 decision-time display snapshot — resolved FIRST (fail-closed on missing). */
  actorDisplay: string;
}

export function createConcealmentAssessmentHandlers(deps: AppDeps) {
  /** Establish the request context + resolve the actor-display snapshot (R5) FIRST — before any lock or
   *  tx. A missing/empty display name BLOCKS with AdminDisplayNameMissingError (409), fail-closed: no
   *  event, no row, no audit line. NO fallback of any kind. */
  async function contextOf(request: FastifyRequest): Promise<AssessmentContext> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    const district = request.decisionDistrict;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    if (district == null) {
      // Defensive: the district-resolution preHandler + the district permission gate should have denied a
      // no-district claim already (403). Never annotate without an authorized district.
      throw new ForbiddenError('Authorization required', 'auth.forbidden');
    }
    const { claimCaseId } = request.params as { claimCaseId: string };
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

  /** Post-commit NON-PII audit line (never the note, D-G). */
  function audit(
    request: FastifyRequest,
    type: 'admin_concealment_assessment.write' | 'admin_concealment_assessment.rejected',
    ctx: AssessmentContext,
    kind: string,
  ): void {
    emitAuthAudit(deps, request, type, {
      actorId: ctx.actorId,
      pariwarId: ctx.pariwarId,
      context: {
        claim_case_id: ctx.claimCaseId,
        district: ctx.district,
        kind,
      },
    });
  }

  /** Shape the NON-PII response (never the note). */
  function toResponse(result: claim.RecordConcealmentAssessmentResult): ConcealmentAssessmentResponse {
    return {
      assessment_id: result.assessment.assessmentId,
      claim_case_id: result.assessment.claimCaseId,
      pariwar_id: result.assessment.pariwarId,
      kind: result.assessment.kind,
      actor_display: result.assessment.actorDisplay,
      created_at: result.assessment.createdAt.toISOString(),
      supersedes_assessment_id: result.supersededAssessmentId,
      claim_state: result.claimState,
    };
  }

  return {
    /**
     * POST …/admin/claims/:claimCaseId/concealment-assessment — record/revise a tri-state concealment
     * assessment. The route chain already proved an authenticated HUMAN actor + claim.verify at the
     * deceased's server-derived district + tenant. The write is a review annotation — no lifecycle change.
     */
    async postAssessment(request: FastifyRequest, reply: FastifyReply): Promise<ConcealmentAssessmentResponse> {
      const ctx = await contextOf(request);
      const body = request.body as ConcealmentAssessmentRequest;
      const noteCiphertext = await encryptOptionalConcealmentNote(body.note, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result: claim.RecordConcealmentAssessmentResult;
      try {
        result = await claim.recordConcealmentAssessment(scopeTx.client, {
          claimCaseId: ctx.claimCaseId,
          pariwarId: ctx.pariwarId,
          kind: body.kind,
          noteCiphertext,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'operator',
        });
        ok = true;
      } catch (err) {
        // Rejected attempts are audited too (fail-closed AND audited, not just fail-closed).
        audit(request, 'admin_concealment_assessment.rejected', ctx, body.kind);
        return translateAssessmentError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      audit(request, 'admin_concealment_assessment.write', ctx, body.kind);
      void reply.status(201);
      return toResponse(result);
    },
  };
}
