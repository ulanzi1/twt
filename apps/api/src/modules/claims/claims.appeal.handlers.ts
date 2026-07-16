// Internal 3-stage appeal handlers — Story 6.16 (Task 7; AC1–AC11). The LAST story of Epic 6.
//
// The appeal surfaces (v1 admin actor = pariwar_admin/district_admin-as-Trustee-Lite, D-B):
//   · member/operator initiate (AC1/AC7)  — a denied claimant, or an operator on-behalf under AR-61.
//   · Stage-1 District-Admin review (AC2)  — reverse | advance; the D-D reviewer-conflict enforced in domain.
//   · Stage-2 panel open/vote/finalize/cancel (AC3) — the R9-shaped panel; finalize is the sole lifecycle write.
//   · Stage-3 Trustee discretion (AC4)     — reverse | uphold-final; uphold clears the freeze.
//   · decisions-by-reviewer audit (AC6)    — bounded, clamped, + the D-H sla_breached/elapsed_days fields.
//   · member appeal-status (AC7)           — eligibility + stage/outcome + the external-remedy disclosure.
//
// ── Concerns THIS file owns (the 6.11/6.13/6.14 posture) ────────────────────────────────────
// (1) ACTOR-DISPLAY (R5) resolves FIRST for every admin write — server-side from users.display_name;
//     NULL/empty → AdminDisplayNameMissingError (409) fail-closed.
// (2) The rationale (Tier-1 PII, AC10) is ENCRYPTED BEFORE the writer; reads DECRYPT AFTER authorization with
//     the decrypt-FAILURE-DISTINCT sentinel.
// (3) AUDIT IS A POST-COMMIT SINK — NON-PII (claim id + stage + decision/outcome + disposition + reason_code);
//     NEVER the rationale. Rejected attempts are audited too (fail-closed AND audited).
// (4) THE D-G GO-LIVE GATE — every STAGE-adjudication write checks the Pariwar's appeal_flow legal-review
//     status and fails-closed (503) until counsel clears it (AC8). Initiate is NOT gated (a claimant's right
//     to file must not be blocked by a trust-side config; the gate protects the ADJUDICATION, not the filing).

import {
  type AdminAppealCaseResponse,
  type AppealDecisionResponse,
  type AppealDecisionsByReviewerQuery,
  type AppealDecisionsByReviewerResponse,
  type AppealPanelFinalizeResponse,
  type AppealPanelSessionResponse,
  type AppealPanelVoteResponse,
  type AppealStage,
  type AppealStage1ReviewRequest,
  type AppealStage2CancelRequest,
  type AppealStage2FinalizeRequest,
  type AppealStage2OpenRequest,
  type AppealStage2VoteRequest,
  type AppealStage3DecideRequest,
  type InitiateAppealResponse,
  type MemberAppealStatusResponse,
} from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { CLAIM_APPEAL_VOTE_FIELD_CLASS } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  decryptAppealRationale,
  encryptAppealDecisionRationale,
  encryptAppealVoteRationale,
} from './appeal-crypto.js';

/** Map an appeal domain error to its stable HTTP shape. Rethrows ApiErrors + anything unknown as-is. */
function translateAppealError(err: unknown): never {
  if (err instanceof claim.AppealClaimNotFoundError || err instanceof claim.AppealPanelClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (err instanceof claim.AppealNotDeniedError) {
    throw new ConflictError('An appeal can only be initiated on a denied claim', 'appeal.not_denied');
  }
  if (err instanceof claim.AppealAlreadyExhaustedError) {
    throw new ConflictError('This claim already has an appeal journey', 'appeal.already_exhausted');
  }
  if (err instanceof claim.AppealStageMismatchError) {
    throw new ConflictError('This claim is not at the expected appeal stage', 'appeal.stage_mismatch');
  }
  if (err instanceof claim.AppealNoJourneyError) {
    throw new ConflictError('This claim has no appeal journey', 'appeal.no_journey');
  }
  if (err instanceof claim.AppealReviewerConflictError) {
    throw new ConflictError('You already adjudicated this claim — a Stage-1 reviewer must be independent', 'appeal.reviewer_conflict');
  }
  if (err instanceof claim.AppealDispositionCategoryError) {
    throw new BadRequestError('The disposition category is invalid for this decision', 'appeal.disposition_invalid');
  }
  if (err instanceof claim.AppealPanelClaimNotInStage2Error) {
    throw new ConflictError('This claim is not at appeal stage 2', 'appeal.not_stage2');
  }
  if (err instanceof claim.AppealPanelSessionExistsError) {
    throw new ConflictError('An appeal panel session already exists for this claim', 'appeal.panel_session_exists');
  }
  if (err instanceof claim.AppealPanelTooSmallError) {
    throw new BadRequestError('The appeal panel is below the minimum of two members', 'appeal.panel_too_small');
  }
  if (err instanceof claim.AppealPanelTooLargeError) {
    throw new BadRequestError('The appeal panel roster is too large', 'appeal.panel_too_large');
  }
  if (err instanceof claim.AppealPanelMemberUnauthorizedError) {
    throw new ForbiddenError('A designated panel member is not authorized to vote', 'appeal.panel_member_unauthorized');
  }
  if (err instanceof claim.AppealPanelNoLiveSessionError) {
    throw new ConflictError('This claim has no live appeal panel session', 'appeal.panel_no_live_session');
  }
  if (err instanceof claim.AppealPanelSessionFinalizedError) {
    throw new ConflictError('This appeal panel session is already finalized', 'appeal.panel_session_finalized');
  }
  if (err instanceof claim.AppealPanelActorNotOnPanelError) {
    throw new ForbiddenError('You are not a member of this appeal panel', 'appeal.not_on_panel');
  }
  if (err instanceof claim.AppealPanelVoteRevisionConflictError) {
    throw new ConflictError('Your vote was updated concurrently — reload and try again', 'appeal.vote_revision_conflict');
  }
  if (err instanceof claim.AppealPanelVoteConflictError) {
    throw new ConflictError('A live vote already exists — reload and try again', 'appeal.vote_conflict');
  }
  if (err instanceof claim.AppealPanelQuorumNotMetError) {
    throw new ConflictError('Not enough votes have been cast to finalize (quorum not met)', 'appeal.quorum_not_met', {
      cast_votes: err.castVotes,
      quorum_required: err.quorumRequired,
    });
  }
  if (err instanceof claim.AppealPanelDispositionRequiredError) {
    throw new BadRequestError('A disposition category is required when the panel reverses', 'appeal.disposition_required');
  }
  if (err instanceof claim.AppealPanelSessionAlreadySupersededError) {
    throw new ConflictError('This session was already cancelled — reload and try again', 'appeal.panel_session_superseded');
  }
  if (err instanceof claim.AppealPanelCancelUnauthorizedError) {
    throw new ForbiddenError('Cancelling a session with live votes requires an elevated actor', 'appeal.panel_cancel_unauthorized');
  }
  if (err instanceof claim.AppealCiphertextStorageError) {
    throw new BadRequestError('The rationale could not be stored', 'appeal.rationale_storage_invalid');
  }
  if (err instanceof claim.ClaimStreamConcurrencyError) {
    throw new ConflictError('This claim was updated concurrently — reload and try again', 'appeal.stream_conflict');
  }
  throw err;
}

function appealRejectionReason(err: unknown): string {
  return err instanceof Error ? err.name : 'unknown';
}

interface AdminAppealContext {
  actorId: string;
  pariwarId: ids.PariwarId;
  pariwarIdStr: string;
  actorDisplay: string;
}

export function createAppealHandlers(deps: AppDeps) {
  /** Establish the admin request context + resolve the R5 display snapshot FIRST (fail-closed on missing). */
  async function adminContextOf(request: FastifyRequest): Promise<AdminAppealContext> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) throw new AdminDisplayNameMissingError(actorId);
    return { actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId), pariwarIdStr: scopeTx.pariwarId, actorDisplay };
  }

  /** The D-G go-live gate (AC8) — fail-closed until counsel clears the Pariwar's appeal flow. Called INSIDE
   *  each stage-write's scope-tx (reads pariwar_appeal_config under the scope). Absent config ⇒ fail-closed. */
  async function assertAppealFlowLive(tx: { tx: Parameters<typeof claim.getAppealConfig>[0] }, pariwarId: ids.PariwarId): Promise<void> {
    const config = await claim.getAppealConfig(tx.tx, pariwarId);
    if (config.legalReviewStatus !== 'cleared') {
      throw new ServiceUnavailableError(
        'The appeal flow is pending legal review for this Pariwar and is not yet live',
        'appeal.pending_legal_review',
      );
    }
  }

  function audit(request: FastifyRequest, type: AuthAuditEventType, actorId: string, pariwarId: ids.PariwarId, context: Record<string, unknown>): void {
    emitAuthAudit(deps, request, type, { actorId, pariwarId, context });
  }

  function toDecisionResponse(decision: claim.AppealDecisionResult['decision'], claimState: string, reversed: boolean): AppealDecisionResponse {
    return {
      appeal_decision_id: decision.appealDecisionId,
      claim_case_id: decision.claimCaseId,
      stage: decision.stage,
      decision: decision.decision,
      disposition_category: decision.dispositionCategory,
      claim_state: claimState,
      reversed,
    };
  }

  return {
    // ── AC1 — member self-initiate (member session; pariwar from the session) ──
    async postMemberInitiate(request: FastifyRequest, reply: FastifyReply): Promise<InitiateAppealResponse> {
      const memberIdStr = request.requestContext.actorId;
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      let result: claim.InitiateAppealResult;
      try {
        // Ownership (IDOR guard): a member may only initiate an appeal on THEIR OWN claim — a mismatch is
        // treated as not-found (no cross-claim existence oracle, the claims.documents.handlers.ts precedent).
        const claimRow = await claim.getClaimCase(scopeTx.tx, pariwarId, claimCaseId);
        if (!claimRow || claimRow.claimantActorId !== memberIdStr) {
          throw new NotFoundError('Claim not found', 'claim.not_found');
        }
        result = await claim.initiateAppeal(scopeTx.client, {
          claimCaseId,
          pariwarId,
          initiatedByActor: memberIdStr,
          initiatedOnBehalf: false,
          actor: 'member',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', memberIdStr, pariwarId, { claim_case_id: claimCaseId, action: 'initiate', reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'member_claim.appeal_initiated', memberIdStr, pariwarId, { claim_case_id: claimCaseId, on_behalf: false });
      void reply.status(201);
      return {
        appeal_id: result.appeal.appealId,
        claim_case_id: result.appeal.claimCaseId,
        current_stage: result.appeal.currentStage,
        status: result.appeal.status,
        initiated_on_behalf: result.appeal.initiatedOnBehalf,
        claim_state: result.claimState,
      };
    },

    // ── AC1/AR-61 — operator on-behalf initiate (admin session; helpline capability) ──
    async postOperatorInitiate(request: FastifyRequest, reply: FastifyReply): Promise<InitiateAppealResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.InitiateAppealResult;
      try {
        result = await claim.initiateAppeal(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          initiatedByActor: ctx.actorId,
          initiatedOnBehalf: true,
          actor: 'operator',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, action: 'initiate_on_behalf', reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'member_claim.appeal_initiated', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, on_behalf: true });
      void reply.status(201);
      return {
        appeal_id: result.appeal.appealId,
        claim_case_id: result.appeal.claimCaseId,
        current_stage: result.appeal.currentStage,
        status: result.appeal.status,
        initiated_on_behalf: result.appeal.initiatedOnBehalf,
        claim_state: result.claimState,
      };
    },

    // ── AC7 — member appeal-status ──
    async getMemberStatus(request: FastifyRequest, reply: FastifyReply): Promise<MemberAppealStatusResponse> {
      const memberIdStr = request.requestContext.actorId;
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const tx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const claimRow = await claim.getClaimCase(tx.tx, pariwarId, claimCaseId);
        // Ownership (IDOR guard): a member may only see THEIR OWN claim's appeal status — a mismatch is
        // treated as not-found (no cross-claim existence oracle, the claims.documents.handlers.ts precedent).
        if (!claimRow || claimRow.claimantActorId !== memberIdStr) {
          throw new NotFoundError('Claim not found', 'claim.not_found');
        }
        const journey = await claim.getAppealJourney(tx.tx, pariwarId, claimCaseId);
        ok = true;
        void reply.status(200);
        return {
          claim_case_id: claimCaseId,
          claim_state: claimRow.currentState,
          can_initiate: claimRow.currentState === 'denied' && journey === undefined,
          appeal_status: journey?.status ?? null,
          current_stage: journey?.currentStage ?? null,
          appeal_exhausted: journey?.status === 'upheld_final',
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    // ── AC2 — Stage-1 District-Admin review ──
    async postStage1(request: FastifyRequest, reply: FastifyReply): Promise<AppealDecisionResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as AppealStage1ReviewRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.AppealDecisionResult;
      try {
        // D-G go-live gate + the KMS rationale encryption — gate FIRST so a Pariwar still pending legal
        // review is rejected (503) before spending a real KMS round-trip on data about to be discarded
        // (6.16 review finding).
        await assertAppealFlowLive(scopeTx, ctx.pariwarId);
        const rationaleCiphertext = await encryptAppealDecisionRationale(body.rationale, ctx.pariwarIdStr, deps.encryption);
        // D-D reviewer-conflict — enforced HERE too (not only inside the domain writer) so it is a genuine
        // defense-in-depth check "at BOTH the API and domain layers" per D-D/AC2, not a single enforcement
        // point reached transitively through the handler.
        const deciders = await claim.getOriginalDeciderActorIds(scopeTx.tx, ctx.pariwarId, claimCaseId);
        if (claim.isOriginalDecider(deciders, ctx.actorId)) {
          throw new claim.AppealReviewerConflictError(claimCaseId, ctx.actorId);
        }
        result = await claim.reviewAppealStage1(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          reviewerActorId: ctx.actorId,
          reviewerDisplay: ctx.actorDisplay,
          decision: body.decision,
          dispositionCategory: body.disposition_category ?? null,
          rationaleCiphertext,
          actor: 'operator',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, action: 'stage1', reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_appeal.stage1', ctx.actorId, ctx.pariwarId, {
        claim_case_id: claimCaseId,
        decision: body.decision,
        disposition_category: result.decision.dispositionCategory,
        reversed: result.reversedEventVersion !== null,
      });
      void reply.status(201);
      return toDecisionResponse(result.decision, result.claimState, result.reversedEventVersion !== null);
    },

    // ── AC3 — Stage-2 panel open ──
    async postStage2Open(request: FastifyRequest, reply: FastifyReply): Promise<AppealPanelSessionResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as AppealStage2OpenRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.AppealPanelSessionResult;
      try {
        await assertAppealFlowLive(scopeTx, ctx.pariwarId);
        result = await claim.openAppealPanel(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          panelActorIds: body.panel_actor_ids,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, action: 'stage2_open', reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_appeal.stage2_open', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, panel_size: result.session.panelActorIds.length });
      void reply.status(201);
      return toPanelSessionResponse(result.session);
    },

    // ── AC3 — Stage-2 cast/revise vote ──
    async postStage2Vote(request: FastifyRequest, reply: FastifyReply): Promise<AppealPanelVoteResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as AppealStage2VoteRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.AppealPanelVoteResult;
      try {
        // D-G go-live gate FIRST — before the KMS rationale encryption (6.16 review finding).
        await assertAppealFlowLive(scopeTx, ctx.pariwarId);
        const rationaleCiphertext = await encryptAppealVoteRationale(body.rationale, ctx.pariwarIdStr, deps.encryption);
        result = await claim.castAppealVote(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          vote: body.vote,
          rationaleCiphertext,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, action: 'stage2_vote', reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_appeal.stage2_vote', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, vote: result.vote.vote, revised: result.revised });
      void reply.status(201);
      return {
        vote_id: result.vote.voteId,
        session_id: result.vote.sessionId,
        claim_case_id: result.vote.claimCaseId,
        voter_actor_id: result.vote.voterActorId,
        voter_display: result.vote.voterDisplay,
        vote: result.vote.vote,
        cast_at: result.vote.castAt.toISOString(),
        revised: result.revised,
      };
    },

    // ── AC3 — Stage-2 finalize (step-up-gated at the route) ──
    async postStage2Finalize(request: FastifyRequest, reply: FastifyReply): Promise<AppealPanelFinalizeResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as AppealStage2FinalizeRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.AppealPanelFinalizeResult;
      let s: claim.AppealPanelFinalizeResult['session'];
      try {
        // D-G go-live gate FIRST — before the KMS rationale encryption (6.16 review finding).
        await assertAppealFlowLive(scopeTx, ctx.pariwarId);
        const rationaleCiphertext = await encryptAppealDecisionRationale(body.rationale, ctx.pariwarIdStr, deps.encryption);
        result = await claim.finalizeAppealOutcome(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          rationaleCiphertext,
          dispositionCategory: body.disposition_category ?? null,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        s = result.session;
        // Validate the finalize invariant BEFORE committing — a missing field must abort the tx, not orphan
        // an already-committed reversal/advance with a 500 and no audit line (the 6.16 review lesson).
        if (s.outcome === null || s.reverseCount === null || s.denyCount === null || s.finalizedDisplay === null || s.finalizedAt === null) {
          throw new Error(`[appeal] finalized session ${s.sessionId} is missing an outcome/count/display/finalized_at field`);
        }
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, action: 'stage2_finalize', reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_appeal.stage2_finalize', ctx.actorId, ctx.pariwarId, {
        claim_case_id: claimCaseId,
        outcome: s.outcome,
        reverse_count: s.reverseCount,
        deny_count: s.denyCount,
        disposition_category: result.decision.dispositionCategory,
        idempotent_replay: result.idempotentReplay,
      });
      void reply.status(200);
      return {
        session_id: s.sessionId,
        claim_case_id: s.claimCaseId,
        outcome: s.outcome,
        reverse_count: s.reverseCount,
        deny_count: s.denyCount,
        disposition_category: result.decision.dispositionCategory,
        finalized_display: s.finalizedDisplay,
        finalized_at: s.finalizedAt.toISOString(),
        claim_state: result.claimState,
        idempotent_replay: result.idempotentReplay,
      };
    },

    // ── AC3 — Stage-2 cancel ──
    async postStage2Cancel(request: FastifyRequest, reply: FastifyReply): Promise<AppealPanelSessionResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as AppealStage2CancelRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.AppealPanelSessionResult;
      try {
        await assertAppealFlowLive(scopeTx, ctx.pariwarId);
        result = await claim.cancelAppealPanel(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          reasonCode: body.reason_code,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, action: 'stage2_cancel', reason_code: body.reason_code, reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_appeal.stage2_cancel', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, reason_code: body.reason_code });
      void reply.status(200);
      return toPanelSessionResponse(result.session);
    },

    // ── AC4 — Stage-3 Trustee discretion (step-up-gated at the route) ──
    async postStage3(request: FastifyRequest, reply: FastifyReply): Promise<AppealDecisionResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as AppealStage3DecideRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.AppealDecisionResult;
      try {
        // D-G go-live gate FIRST — before the KMS rationale encryption (6.16 review finding).
        await assertAppealFlowLive(scopeTx, ctx.pariwarId);
        const rationaleCiphertext = await encryptAppealDecisionRationale(body.rationale, ctx.pariwarIdStr, deps.encryption);
        result = await claim.decideAppealStage3(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          reviewerActorId: ctx.actorId,
          reviewerDisplay: ctx.actorDisplay,
          decision: body.decision,
          dispositionCategory: body.disposition_category ?? null,
          rationaleCiphertext,
          actor: 'trustee',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_appeal.rejected', ctx.actorId, ctx.pariwarId, { claim_case_id: claimCaseId, action: 'stage3', reason: appealRejectionReason(err) });
        return translateAppealError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_appeal.stage3', ctx.actorId, ctx.pariwarId, {
        claim_case_id: claimCaseId,
        decision: body.decision,
        disposition_category: result.decision.dispositionCategory,
        reversed: result.reversedEventVersion !== null,
      });
      void reply.status(201);
      return toDecisionResponse(result.decision, result.claimState, result.reversedEventVersion !== null);
    },

    // ── Admin per-claim appeal case model (the Stage-1/2/3 surfaces read this) ──
    async getCase(request: FastifyRequest, reply: FastifyReply): Promise<AdminAppealCaseResponse> {
      const ctx = await adminContextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const now = new Date();
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        const claimRow = await claim.getClaimCase(tx.tx, ctx.pariwarId, claimCaseId);
        if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
        const journey = await claim.getAppealJourney(tx.tx, ctx.pariwarId, claimCaseId);
        const panel = await claim.getAppealPanel(tx.tx, ctx.pariwarId, claimCaseId);

        let session: AdminAppealCaseResponse['session'] = null;
        let tally: AdminAppealCaseResponse['tally'] = null;
        const votes: AdminAppealCaseResponse['votes'] = [];
        if (panel.session) {
          const s = panel.session;
          const members = await Promise.all(
            s.panelActorIds.map(async (actorId) => ({ actor_id: actorId, actor_display: (await getDisplayName(deps.pool, actorId)) ?? actorId })),
          );
          session = {
            session_id: s.sessionId,
            panel: members,
            quorum_required: s.quorumRequired,
            opened_display: s.openedDisplay,
            opened_at: s.openedAt.toISOString(),
            outcome: s.outcome,
            finalized_display: s.finalizedDisplay,
            finalized_at: s.finalizedAt ? s.finalizedAt.toISOString() : null,
          };
          // Herding/bias guard (the R9 precedent this panel mirrors): a peer's rationale is visible only once
          // the REQUESTING panelist has ALSO cast their own vote in this session — before that, withhold every
          // vote's rationale (6.16 review finding).
          const requesterHasVoted = panel.votes.some((v) => v.voterActorId === ctx.actorId);
          for (const v of panel.votes) {
            votes.push({
              vote_id: v.voteId,
              voter_actor_id: v.voterActorId,
              voter_display: v.voterDisplay,
              vote: v.vote,
              cast_at: v.castAt.toISOString(),
              rationale: requesterHasVoted
                ? await decryptAppealRationale(v.rationaleCiphertext, ctx.pariwarIdStr, CLAIM_APPEAL_VOTE_FIELD_CLASS, deps.encryption, (err) =>
                    request.log.error({ err, vote_id: v.voteId }, 'appeal vote rationale decrypt failed'),
                  )
                : null,
            });
          }
          const panelSize = s.panelActorIds.length;
          const computed = claim.computeAppealOutcome(panel.votes, panelSize);
          tally = {
            reverse_count: computed.reverse_count,
            deny_count: computed.deny_count,
            cast_votes: panel.votes.length,
            panel_size: panelSize,
            quorum_required: s.quorumRequired,
            provisional_outcome: computed.outcome,
            quorum_met: panel.votes.length >= s.quorumRequired,
          };
        }

        // D-H — the current stage's SLA status (read-time; null when not in an appeal stage).
        const stageOfState: Record<string, AppealStage | undefined> = {
          appeal_stage_1: '1',
          appeal_stage_2: '2',
          appeal_stage_3: '3',
        };
        const currentStage = stageOfState[claimRow.currentState];
        let sla: AdminAppealCaseResponse['sla'] = null;
        if (currentStage) {
          const status = await claim.computeStageSlaStatus(tx.tx, ctx.pariwarId, claimCaseId, currentStage, now);
          sla = { stage: currentStage, sla_days: status.slaDays, elapsed_days: status.elapsedDays, breached: status.breached };
        }

        ok = true;
        void reply.status(200);
        return {
          claim_case_id: claimCaseId,
          claim_state: claimRow.currentState,
          journey: journey
            ? { status: journey.status, current_stage: journey.currentStage, initiated_on_behalf: journey.initiatedOnBehalf }
            : null,
          session,
          votes,
          tally,
          sla,
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    // ── AC6 — decisions-by-reviewer audit query (+ D-H SLA fields) ──
    async getDecisionsByReviewer(request: FastifyRequest, reply: FastifyReply): Promise<AppealDecisionsByReviewerResponse> {
      const ctx = await adminContextOf(request);
      const query = request.query as AppealDecisionsByReviewerQuery;
      const sinceDays = query.sinceDays ?? 180;
      const now = new Date();
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        const config = await claim.getAppealConfig(tx.tx, ctx.pariwarId);
        const rows = await claim.getAppealDecisionsByReviewer(tx.tx, ctx.pariwarId, query.reviewerActorId, {
          ...(query.stage !== undefined ? { stage: query.stage } : {}),
          sinceDays,
          ...(query.limit !== undefined ? { limit: query.limit } : {}),
          now,
        });
        // D-H SLA status, batched (ONE query per distinct stage, not per row — the N+1 fix) and computed
        // against EACH decision's OWN decided_at — every row here is already-resolved, so using "now" would
        // make a promptly-decided row drift into "breached" purely as wall-clock time passes (6.16 review).
        const slaByKey = await claim.computeStageSlaStatusBatch(
          tx.tx,
          ctx.pariwarId,
          rows.map((r) => ({ claimCaseId: ids.claimId(r.claimCaseId), stage: r.stage, at: r.decidedAt })),
          config,
        );
        // AC6: NON-PII ONLY — the rationale ciphertext is deliberately never decrypted here (6.16 review).
        const decisions = rows.map((r) => {
          const sla = slaByKey.get(claim.stageSlaBatchKey(r.claimCaseId, r.stage))!;
          return {
            appeal_decision_id: r.appealDecisionId,
            claim_case_id: r.claimCaseId,
            stage: r.stage,
            decision: r.decision,
            disposition_category: r.dispositionCategory,
            decided_at: r.decidedAt.toISOString(),
            superseded_at: r.supersededAt ? r.supersededAt.toISOString() : null,
            sla_breached: sla.breached,
            elapsed_days: sla.elapsedDays,
          };
        });
        ok = true;
        void reply.status(200);
        return { reviewer_actor_id: query.reviewerActorId, since_days: sinceDays, decisions };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },
  };
}

function toPanelSessionResponse(session: claim.AppealPanelSessionResult['session']): AppealPanelSessionResponse {
  return {
    session_id: session.sessionId,
    claim_case_id: session.claimCaseId,
    pariwar_id: session.pariwarId,
    panel_actor_ids: session.panelActorIds,
    quorum_required: session.quorumRequired,
    opened_display: session.openedDisplay,
    opened_at: session.openedAt.toISOString(),
    outcome: session.outcome,
    superseded_at: session.supersededAt ? session.supersededAt.toISOString() : null,
  };
}
