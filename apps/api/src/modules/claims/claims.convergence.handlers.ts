// ICP convergence-resolution handlers — Story 6.4 (Task 7; AC2/AC3/AC4).
//
// The operator/trustee <ConvergenceDecisionStrip> back end — three scope-gated admin handlers:
//   · listPendingConvergence — the pending cross-channel attempts + their candidate claims (AC2/AC3).
//   · confirmMerge           — CONFIRM convergence: union the channel + flip the attempt converged (AC2/AC5).
//   · overrideConvergence    — treat as SEPARATE: record the override ledger row + mint a DISTINCT
//                              canonical claim (AC4). SHIPS LIVE — the account-frozen overlay is
//                              aggregate-safe (Story 6.4), so an override never weakens the freeze.
//
// ── Scope-tx discipline (the helpline handler template) ─────────────────────────────────
// Admin routes: [adminSession, scope, requirePermissionHook(claim.file), (+ step-up on override)]
// have run, so `request.scopeTx` (raw pg client + drizzle, pariwar scope set) is attached. The
// multi-tenant lifecycle hook COMMITs on 2xx / ROLLBACKs otherwise — these handlers do NOT open
// or close their own tx. Audit is emitted AFTER the write succeeds; a thrown resolution rolls back
// (nothing minted → no audit-silent freeze, so no compensating failure line is needed).
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// Every audit line is NON-PII: claim ids + intake_attempt_id + channel(s) + the resolving operator
// id + (override only) the operator-authored reason — NEVER caller/nominee PII.

import { randomUUID } from 'node:crypto';

import type {
  ClaimIntakeChannel,
  ConvergenceMergeRequest,
  ConvergenceMergeResponse,
  ConvergenceOverrideRequest,
  ConvergenceOverrideResponse,
  PendingIntakeAttemptsResponse,
} from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import type { AppDeps } from '../../context.js';
import { ConflictError, NotFoundError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';

/**
 * The resolution endpoints (confirmMerge/overrideConvergence) are channel-agnostic — the SAME
 * handler resolves an attempt regardless of whether it originated on member-app or helpline.
 * The audit event type must still reflect the attempt's ORIGINATING channel (mirrors the
 * `convergence_pending` precedent in claims.handlers.ts / claims.helpline.handlers.ts), so a
 * member-app-originated attempt's merge/override is never mislabeled `helpline_claim.*`
 * (Review Finding). `trustee_initiated` has no live intake handler yet — falls to the
 * operator-console prefix alongside `helpline`.
 */
function convergenceAuditType(
  intakeChannel: ClaimIntakeChannel,
  suffix: 'convergence_merged' | 'convergence_overridden',
): AuthAuditEventType {
  return intakeChannel === 'member_app' ? `member_claim.${suffix}` : `helpline_claim.${suffix}`;
}

export function createConvergenceHandlers(deps: AppDeps) {
  /** Read the scope-resolved (operator admin actor id, scope tx) or fail loud (500 — the route
   * chain guarantees both ran; a missing one is a wiring bug, not a client error). */
  function adminScopeCtx(request: FastifyRequest): {
    operatorId: string;
    scopeTx: NonNullable<FastifyRequest['scopeTx']>;
  } {
    const scopeTx = request.scopeTx;
    const operatorId = request.requestContext.actorId;
    if (!scopeTx || !operatorId) {
      throw new Error('[convergence] handler ran without adminSession + scope-resolution');
    }
    return { operatorId, scopeTx };
  }

  return {
    /**
     * GET /api/v1/p/:pariwarId/admin/claims/convergence/pending — the <ConvergenceDecisionStrip>
     * feed: every `pending` intake attempt + its candidate canonical claim(s), cross-channel (AC2/AC3).
     */
    async listPendingConvergence(request: FastifyRequest): Promise<PendingIntakeAttemptsResponse> {
      const { scopeTx } = adminScopeCtx(request);
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const views = await claim.getPendingIntakeAttempts(scopeTx.tx, pariwarId);
      return {
        pending: views.map((v) => ({
          intakeAttemptId: String(v.attempt.intakeAttemptId),
          deceasedMemberId: String(v.attempt.deceasedMemberId),
          intakeChannel: v.attempt.intakeChannel,
          createdAt: v.attempt.createdAt.toISOString(),
          candidates: v.candidates.map((c) => ({
            claimCaseId: String(c.claimCaseId),
            intakeChannels: c.intakeChannels,
            currentState: c.currentState,
            createdAt: c.createdAt.toISOString(),
          })),
        })),
      };
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/claims/convergence/merge — the operator CONFIRMS convergence.
     * Unions the attempt's channel into the canonical claim + flips the attempt `pending → converged`.
     * Appends NO lifecycle event (the claim is already `intake_converged`). Idempotent: a re-submitted
     * merge of an already-converged attempt is a no-op 200.
     */
    async confirmMerge(request: FastifyRequest): Promise<ConvergenceMergeResponse> {
      const body = request.body as ConvergenceMergeRequest;
      const { operatorId, scopeTx } = adminScopeCtx(request);
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const attemptId = ids.intakeAttemptId(body.intakeAttemptId);
      const claimCaseId = ids.claimId(body.claimCaseId);
      const auditId = randomUUID();

      const attempt = await claim.getIntakeAttempt(scopeTx.tx, pariwarId, attemptId);
      if (!attempt) throw new NotFoundError('Intake attempt not found', 'convergence.attempt_not_found');
      if (attempt.attemptStatus === 'overridden_separate') {
        throw new ConflictError('Attempt was overridden as separate', 'convergence.attempt_overridden');
      }

      // Validate `claimCaseId` is an actual convergence candidate for THIS attempt's death —
      // reuses `getConvergenceCandidate`'s non-terminal + ±30-day-window + AC4 override-apart
      // filters (anchored to the attempt's own `createdAt`, not "now") so a mismatched or
      // stale claimCaseId can never merge a channel into an unrelated death's claim (Review
      // Finding — this cross-check was previously entirely absent, breaking AC5).
      const windowStartAt = new Date(
        attempt.createdAt.getTime() - claim.CONVERGENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      );
      const candidate = await claim.getConvergenceCandidate(
        scopeTx.tx,
        pariwarId,
        attempt.deceasedMemberId,
        windowStartAt,
      );
      if (!candidate || candidate.claimCaseId !== claimCaseId) {
        throw new ConflictError(
          'Target claim is not a valid convergence candidate for this attempt',
          'convergence.invalid_candidate',
        );
      }

      const result = await claim.convergeIntakeAttempt(scopeTx.client, {
        intakeAttemptId: attemptId,
        pariwarId,
        deceasedMemberId: attempt.deceasedMemberId,
        canonicalClaimCaseId: claimCaseId,
        intakeChannel: attempt.intakeChannel,
        resolvedByActor: operatorId,
        auditId,
      });

      // Only fire the audit line on an ACTUAL merge — a re-submitted merge of an
      // already-converged attempt (`result.merged === false`) is an idempotent no-op and must
      // not add a fresh audit entry that misreads as a repeated real merge (Review Finding).
      if (result.merged) {
        emitAuthAudit(deps, request, convergenceAuditType(attempt.intakeChannel, 'convergence_merged'), {
          actorId: operatorId,
          pariwarId: scopeTx.pariwarId,
          context: {
            claim_case_id: body.claimCaseId,
            intake_attempt_id: body.intakeAttemptId,
            merged_channel: attempt.intakeChannel,
            intake_channels: result.intakeChannels,
            resolved_by: operatorId,
            audit_id: auditId,
          },
        });
      }

      return { merged: result.merged, claimCaseId: body.claimCaseId, intakeChannels: result.intakeChannels };
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/claims/convergence/override — the operator treats the pending
     * attempt as SEPARATE. Records the `convergence_overrides` ledger row (reason required) + mints a
     * DISTINCT canonical claim for the separated attempt (AC4). SHIPS LIVE (the overlay is aggregate-
     * safe — the second claim keeps the account frozen while it is non-terminal). Gated behind the
     * operator's own `claim_file` step-up (it mints a claim).
     */
    async overrideConvergence(request: FastifyRequest): Promise<ConvergenceOverrideResponse> {
      const body = request.body as ConvergenceOverrideRequest;
      const { operatorId, scopeTx } = adminScopeCtx(request);
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const attemptId = ids.intakeAttemptId(body.intakeAttemptId);
      const againstClaimCaseId = ids.claimId(body.againstClaimCaseId);
      const auditId = randomUUID();

      const attempt = await claim.getIntakeAttempt(scopeTx.tx, pariwarId, attemptId);
      if (!attempt) throw new NotFoundError('Intake attempt not found', 'convergence.attempt_not_found');
      if (attempt.attemptStatus !== 'pending') {
        throw new ConflictError('Attempt is already resolved', 'convergence.attempt_resolved');
      }
      const againstClaim = await claim.getClaimCase(scopeTx.tx, pariwarId, againstClaimCaseId);
      if (!againstClaim) throw new NotFoundError('Canonical claim not found', 'convergence.claim_not_found');
      if (String(againstClaim.deceasedMemberId) !== String(attempt.deceasedMemberId)) {
        throw new ConflictError(
          "Against-claim does not belong to this attempt's death",
          'convergence.invalid_against_claim',
        );
      }

      const result = await claim.overrideIntakeAttempt(scopeTx.client, {
        intakeAttemptId: attemptId,
        pariwarId,
        deceasedMemberId: ids.memberId(String(attempt.deceasedMemberId)),
        intakeChannel: attempt.intakeChannel,
        againstClaimCaseId,
        reason: body.reason,
        actor: 'operator',
        claimantActorId: attempt.claimantActorId,
        decidedByActor: operatorId,
        auditId,
      });

      emitAuthAudit(deps, request, convergenceAuditType(attempt.intakeChannel, 'convergence_overridden'), {
        actorId: operatorId,
        pariwarId: scopeTx.pariwarId,
        context: {
          intake_attempt_id: body.intakeAttemptId,
          against_claim_case_id: body.againstClaimCaseId,
          new_claim_case_id: result.newClaimCaseId,
          intake_channel: attempt.intakeChannel,
          // The operator-authored, NON-PII override rationale (AC4 audit line).
          reason: body.reason,
          decided_by: operatorId,
          audit_id: auditId,
        },
      });

      return { overridden: true, newClaimCaseId: result.newClaimCaseId, state: result.state };
    },
  };
}
