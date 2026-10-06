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
  type LateWarningReasonRequest,
  type LateWarningReasonResponse,
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
import { translateLaterApprovalWarningError } from './later-approval-warnings.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { encryptOptionalVerifierRationale } from './verifier-decision-crypto.js';
import { encryptLateWarningReasonNote } from './approval-warning-crypto.js';
import { groundInspectionRequiredMessage } from './ground-inspection-required-message.js';

/** Why a revise was refused, in words (`details.reason` carries the code). Exhaustive — a new reason must say why. */
const NOT_REVISABLE_MESSAGES: Record<claim.DecisionNotRevisableReason, string> = {
  out_of_window: 'The decision cannot be revised in the claim’s current state',
  no_live_decision: 'The decision cannot be revised in the claim’s current state',
  cross_outcome: 'A revision must keep the same outcome — a reversal is handled by the appeal flow (Story 6.16)',
  // Story 6.23a (NW7; NW18) — a written note is never replaced.
  warning_approval_final:
    'This claim shows a nominee-change warning (or one has already been answered), so this approval is final and its reason and note stay as written — a new warning is answered with a late-warning reason instead',
  warnings_not_current:
    'Whether a nominee-change warning shows is not known yet — re-record the nominee determination against the accepted death certificate first',
};

/** Map a verifier-decision domain error to its stable HTTP shape. Rethrows anything unknown. */
function translateDecisionError(err: unknown): never {
  if (err instanceof claim.VerifierDecisionClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  // Story 6.18 (AC4/AC6) — the nominee name-check approval gates. ⛔ NEITHER is a denial: `-226`
  // cl.7 makes a claim without both accounts WAIT, and cl.6 sends a name mismatch BACK for
  // correction. The messages say so, because "required" alone reads as a rejection.
  if (err instanceof claim.NomineeBankAccountsRequiredError) {
    throw new ConflictError(
      'This claim needs both bank accounts before it can be approved — it waits until they are added',
      'verifier_decision.bank_details_required',
      { live_account_count: err.liveAccountCount },
    );
  }
  // Story 6.20 (AC5, D15) — the SAME approval gate now asks for the District Admin's as-at-death
  // DETERMINATION first. ⛔ Never a denial: the claim WAITS for a human to say which declaration stands.
  // Story 6.21a (D7) — ⛔ NOT a denial: the claim WAITS for an accepted death certificate (`-236` BB).
  // Story 6.19a (D14) — the claim's CONTACT RECORD, checked AFTER the gate. ⛔ NOT a denial: the claim WAITS, and
  // the helpline can add what is missing in this state. `details.reason` only — ⛔ never a name or a value.
  if (err instanceof claim.ClaimContactRequiredError) {
    throw new ConflictError(
      'This claim needs the family’s contact details and their agreement to be contacted before it can be approved — it waits until they are added',
      'verifier_decision.claim_contact_required',
      { reason: err.reason },
    );
  }
  if (err instanceof claim.DeathCertificateAcceptanceRequiredError) {
    throw new ConflictError(
      'This claim needs an accepted death certificate with a clear date before it can be approved',
      'verifier_decision.death_certificate_acceptance_required',
      { reason: err.reason },
    );
  }
  // ⭐ Story 6.26a (GI11) — the claim WAITS for its ground inspection (`-263` FQ9 A) — ⛔ never a 500, ⛔ never a denial.
  if (err instanceof claim.GroundInspectionRequiredError) {
    throw new ConflictError(groundInspectionRequiredMessage(err.reason), 'verifier_decision.ground_inspection_required', {
      reason: err.reason,
    });
  }
  if (err instanceof claim.NomineeDeterminationRequiredError) {
    throw new ConflictError(
      'This claim needs the District Admin to determine which nominee declaration was in force at the death before it can be approved',
      'verifier_decision.nominee_determination_required',
      { reason: err.reason },
    );
  }
  if (err instanceof claim.NomineeNameCheckRequiredError) {
    throw new ConflictError(
      'This claim needs a current District Admin nominee name check before it can be approved',
      'verifier_decision.nominee_name_check_required',
      { reason: err.reason },
    );
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
      NOT_REVISABLE_MESSAGES[err.reason],
      'verifier_decision.not_revisable',
      { reason: err.reason },
    );
  }
  // Story 6.23a (NW6) — the ONE rule over the nominee-change warnings. ⛔ NEVER a denial: the claim is ⛔ not refused —
  // an approval needs a warning reason and a note. `details` carry kinds only — ⛔ never a name or a date.
  // ⭐ Story 6.23b — the words live ONCE in `later-approval-warnings.ts` (every later route maps the same refusals with
  // its own prefix), which also maps the WAIT: defensive here — P1's wait is vacuous (⛔ no live approval exists
  // while the District Admin approves), but an unmapped typed error would be a 500 (Trap 7).
  translateLaterApprovalWarningError(err, 'verifier_decision');
  // Story 6.20 (AC4, `-239`) — the post-death refusal needs a determination with a discarded version.
  if (err instanceof claim.PostDeathRefusalUngroundedError) {
    throw new ConflictError(
      'This refusal needs a nominee determination that marks a version as discarded — record the determination first',
      'verifier_decision.post_death_refusal_ungrounded',
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
    // `kinds: null` ⇔ ⛔ not known at the refusal (code review round 3) — the field is OMITTED, ⛔ never `[]`, which
    // would read as "no warning showed".
    warnings?: { readonly kinds: readonly string[] | null; readonly warningReasonCode: string | null },
  ): void {
    emitAuthAudit(deps, request, type, {
      actorId: ctx.actorId,
      pariwarId: ctx.pariwarId,
      context: {
        claim_case_id: ctx.claimCaseId,
        district: ctx.district,
        outcome,
        reason_code: reasonCode,
        // Story 6.23a (NW12) — codes and kinds only (⛔ never a name, a date or the note).
        ...(warnings !== undefined ? { warning_reason_code: warnings.warningReasonCode } : {}),
        ...(warnings?.kinds != null ? { approval_warning_kinds: [...warnings.kinds] } : {}),
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
            : await claim.adjudicateClaim(scopeTx.client, {
                ...base,
                outcome: body.outcome,
                warningReasonCode: body.warning_reason_code ?? null,
              });
        ok = true;
      } catch (err) {
        // Rejected attempts are audited too (AC10 — fail-closed AND audited, not just fail-closed).
        // Story 6.23a (NW12) — a `warning_reason_required` refusal carries the kinds it was refused over; a
        // `warning_reason_unavailable` refusal (the reason was replaced mid-flight) carries the code the actor
        // submitted, so the audit line explains the race — its kinds are ⛔ not known here, so they are OMITTED (⛔
        // never `[]`); an `…_ungrounded` refusal carries the code too, over the ⛔ no-warning claim it names (code
        // review round 3).
        auditDecision(
          request,
          'admin_claim.decision_rejected',
          ctx,
          body.outcome,
          body.reason_code,
          err instanceof claim.ApprovalWarningReasonRequiredError
            ? { kinds: err.kinds, warningReasonCode: body.warning_reason_code ?? null }
            : err instanceof claim.WarningReasonUnavailableError
              ? { kinds: null, warningReasonCode: err.warningReasonCode }
              : err instanceof claim.WarningReasonUngroundedError
                ? { kinds: [], warningReasonCode: body.warning_reason_code ?? null }
                : undefined,
        );
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
      auditDecision(
        request,
        auditType,
        ctx,
        body.outcome,
        body.reason_code,
        body.outcome === 'approved'
          ? { kinds: result.approvalWarningKinds ?? [], warningReasonCode: body.warning_reason_code ?? null }
          : undefined,
      );

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

    /**
     * POST …/admin/claims/:claimCaseId/verifier-decision/late-warning-reason — Story 6.23a (NW14; `-277` Q3 B): the
     * District Admin's (any `claim.approve` holder's at the district) reason and note for a nominee-change warning
     * that appeared AFTER the approval. Its OWN record (⛔ never a revision — fact 3): ⛔ no event, ⛔ no state change,
     * ⛔ no decision row. ⛔ No step-up (the decision route's posture). The note is encrypted FIRST; audited
     * post-commit with codes and counts only.
     */
    async postLateWarningReason(request: FastifyRequest, reply: FastifyReply): Promise<LateWarningReasonResponse> {
      const ctx = await contextOf(request);
      const body = request.body as LateWarningReasonRequest;
      const noteCiphertext = await encryptLateWarningReasonNote(body.note, ctx.pariwarId, deps.encryption);
      const auditLate = (type: AuthAuditEventType, extra: Record<string, unknown>) =>
        emitAuthAudit(deps, request, type, {
          actorId: ctx.actorId,
          pariwarId: ctx.pariwarId,
          context: {
            claim_case_id: ctx.claimCaseId,
            district: ctx.district,
            warning_reason_code: body.warning_reason_code,
            ...extra,
          },
        });

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result: claim.RecordLateWarningReasonResult;
      try {
        result = await claim.recordLateWarningReason(scopeTx.client, {
          claimCaseId: ctx.claimCaseId,
          pariwarId: ctx.pariwarId,
          warningReasonCode: body.warning_reason_code,
          noteCiphertext,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
        });
        ok = true;
      } catch (err) {
        auditLate('admin_claim.late_warning_reason_rejected', {
          refusal: err instanceof claim.LateWarningReasonRefusedError ? err.reason : (err as Error).name,
        });
        return translateLateWarningReasonError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      auditLate('admin_claim.late_warning_reason_recorded', {
        covered_key_count: result.coveredKeyCount,
        kinds: [...result.kinds],
      });
      void reply.status(201);
      return {
        claim_case_id: ctx.claimCaseId,
        record_id: result.recordId,
        covered_key_count: result.coveredKeyCount,
        kinds: [...result.kinds],
      };
    },
  };
}

/** NW14's refusals → stable HTTP. Exhaustive over the domain's reason union (a new reason fails typecheck here). */
function translateLateWarningReasonError(err: unknown): never {
  if (err instanceof claim.LateWarningReasonRefusedError) {
    const reason: claim.LateWarningReasonRefusal = err.reason;
    switch (reason) {
      case 'not_found':
        throw new NotFoundError('Claim not found', 'claim.not_found');
      case 'no_district_admin_approval':
        throw new ConflictError(
          'This claim has no live District Admin approval for a late-warning reason to answer',
          'verifier_decision.late_warning_reason.no_district_admin_approval',
        );
      case 'not_recordable_state':
        throw new ConflictError(
          'A late-warning reason cannot be recorded in the claim’s current state',
          'verifier_decision.late_warning_reason.not_recordable_state',
        );
      case 'determination_required':
        throw new ConflictError(
          'Record the nominee determination against the accepted death certificate first — the warnings are not known until then',
          'verifier_decision.late_warning_reason.determination_required',
        );
      case 'nothing_uncovered':
        throw new ConflictError(
          'Every warning that appeared after the approval is already answered by your own record',
          'verifier_decision.late_warning_reason.nothing_uncovered',
        );
      case 'missing_display':
        throw new ConflictError('A late reason is attributed to a named person', 'verifier_decision.late_warning_reason.missing_display');
      default: {
        const unreachable: never = reason;
        throw new Error(`unhandled late-warning refusal ${String(unreachable)}`);
      }
    }
  }
  return translateDecisionError(err);
}
