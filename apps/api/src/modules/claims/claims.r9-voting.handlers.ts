// R9 special-case voting handlers — Story 6.14 (Task 8; AC0–AC10).
//
// The R9 panel surface (v1 actor = pariwar_admin-as-Trustee-Lite, D-B). Seven authenticated admin surfaces,
// all gated by claim.r9_vote @ dimension:'pariwar' (the route chain proves an authenticated HUMAN actor +
// the pariwar-wide permission + tenant, AC6); the finalize route ADDS an r9_finalize step-up.
//
// ── The two-authority write (AC0) ───────────────────────────────────────────────────────────
// ONLY finalize is lifecycle-changing — the domain writer writes BOTH the claim.r9_outcome LIFECYCLE event
// (via projectClaimState) AND the session/decision metadata in ONE committed scope-tx. open/vote/cancel are
// metadata-only. Claim STATE is never derived from the session/vote rows.
//
// ── Concerns THIS file owns (the 6.11/6.13 posture) ─────────────────────────────────────────
// (1) ACTOR-DISPLAY (R5/AC7) resolves FIRST, before any lock/tx, for EVERY verb — server-side from
//     users.display_name; NULL/empty → AdminDisplayNameMissingError (409) fail-closed, no event/row/audit.
// (2) The per-vote rationale (Tier-1 PII, AC10) is ENCRYPTED BEFORE the writer; the writer takes ciphertext.
//     The panel + votes-by-trustee reads DECRYPT AFTER authorization with the decrypt-FAILURE-DISTINCT
//     sentinel (never blank-collapsed).
// (3) AUDIT IS A POST-COMMIT SINK — NON-PII (claim id + clause/outcome/counts + reason_code); NEVER the
//     rationale (AC10). Rejected attempts are audited too (fail-closed AND audited).

import {
  type R9CancelRequest,
  type R9FinalizeResponse,
  type R9OpenSessionRequest,
  type R9PanelResponse,
  type R9QueueResponse,
  type R9SessionResponse,
  type R9VoteRequest,
  type R9VoteResponse,
  type R9VotesByTrusteeQuery,
  type R9VotesByTrusteeResponse,
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
import { decryptR9VoteRationale, encryptR9VoteRationale } from './r9-vote-crypto.js';

/** Map an R9-voting domain error to its stable HTTP shape. Rethrows ApiErrors + anything unknown as-is. */
function translateR9Error(err: unknown): never {
  if (err instanceof claim.R9ClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (err instanceof claim.R9ClaimNotRoutedError) {
    throw new ConflictError('This claim is not in the R9 voting queue', 'r9_voting.not_routed');
  }
  if (err instanceof claim.R9SessionExistsError) {
    throw new ConflictError('An R9 voting session already exists for this claim', 'r9_voting.session_exists');
  }
  if (err instanceof claim.R9ClauseNotVotableError) {
    throw new BadRequestError('The selected clause is not an R9-voting clause', 'r9_voting.clause_not_votable');
  }
  if (err instanceof claim.R9ClauseUnresolvableError) {
    throw new BadRequestError('The selected clause has no effective version', 'r9_voting.clause_unresolvable');
  }
  if (err instanceof claim.R9ClauseRuleCodeMissingError) {
    throw new BadRequestError('The selected clause has no rule_code in its registry payload', 'r9_voting.clause_rule_code_missing');
  }
  if (err instanceof claim.R9UnrecognizedVotingRequirementError) {
    throw new BadRequestError('The selected clause payload has no recognized voting-requirement key', 'r9_voting.voting_requirement_unrecognized');
  }
  if (err instanceof claim.R9ClaimNoLongerRoutableError) {
    throw new ConflictError('This claim is no longer in a routable state — finalize is blocked', 'r9_voting.claim_no_longer_routable');
  }
  if (err instanceof claim.R9PanelEmptyError) {
    throw new BadRequestError('The panel roster must not be empty', 'r9_voting.panel_empty');
  }
  if (err instanceof claim.R9PanelTooLargeError) {
    throw new BadRequestError('The panel roster is too large', 'r9_voting.panel_too_large');
  }
  if (err instanceof claim.R9PanelMemberUnauthorizedError) {
    throw new ForbiddenError('A designated panel member is not authorized to vote', 'r9_voting.panel_member_unauthorized');
  }
  if (err instanceof claim.R9NoLiveSessionError) {
    throw new ConflictError('This claim has no live R9 voting session', 'r9_voting.no_live_session');
  }
  if (err instanceof claim.R9SessionFinalizedError) {
    throw new ConflictError('This R9 voting session is already finalized', 'r9_voting.session_finalized');
  }
  if (err instanceof claim.R9ActorNotOnPanelError) {
    throw new ForbiddenError('You are not a member of this R9 voting panel', 'r9_voting.not_on_panel');
  }
  if (err instanceof claim.R9RationaleRequiredError) {
    throw new BadRequestError('A rationale is required for every vote', 'r9_voting.rationale_required');
  }
  if (err instanceof claim.R9CiphertextStorageError) {
    throw new BadRequestError('The rationale could not be stored', 'r9_voting.rationale_storage_invalid');
  }
  if (err instanceof claim.R9VoteRevisionConflictError) {
    throw new ConflictError('Your vote was updated concurrently — reload and try again', 'r9_voting.vote_revision_conflict');
  }
  if (err instanceof claim.R9VoteConflictError) {
    throw new ConflictError('A live vote already exists — reload and try again', 'r9_voting.vote_conflict');
  }
  if (err instanceof claim.R9QuorumNotMetError) {
    throw new ConflictError('Not enough votes have been cast to finalize (quorum not met)', 'r9_voting.quorum_not_met', {
      cast_votes: err.castVotes,
      quorum_required: err.quorumRequired,
    });
  }
  if (err instanceof claim.R9SessionAlreadySupersededError) {
    throw new ConflictError('This session was already cancelled — reload and try again', 'r9_voting.session_superseded');
  }
  if (err instanceof claim.ClaimStreamConcurrencyError) {
    throw new ConflictError('This claim was updated concurrently — reload and try again', 'r9_voting.stream_conflict');
  }
  throw err;
}

/** The error's class name for the 'rejected' audit line (non-PII) — so a rejected attempt is auditable
 *  for WHY, not just that it was rejected. `'unknown'` for a non-Error throw. */
function r9RejectionReason(err: unknown): string {
  return err instanceof Error ? err.name : 'unknown';
}

interface R9Context {
  actorId: string;
  pariwarId: ids.PariwarId;
  pariwarIdStr: string;
  /** The R5 decision-time display snapshot — resolved FIRST (fail-closed on missing). */
  actorDisplay: string;
}

export function createR9VotingHandlers(deps: AppDeps) {
  /**
   * Establish the request context + resolve the actor-display snapshot (R5/AC7) FIRST — before any lock or
   * tx, for EVERY verb. A missing/empty display name BLOCKS with AdminDisplayNameMissingError (409),
   * fail-closed: no event, no row, no audit line. NO fallback of any kind.
   */
  async function contextOf(request: FastifyRequest): Promise<R9Context> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) {
      throw new AdminDisplayNameMissingError(actorId);
    }
    return { actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId), pariwarIdStr: scopeTx.pariwarId, actorDisplay };
  }

  /** Post-action NON-PII audit line (never the rationale, AC10). */
  function audit(request: FastifyRequest, type: AuthAuditEventType, ctx: R9Context, context: Record<string, unknown>): void {
    emitAuthAudit(deps, request, type, { actorId: ctx.actorId, pariwarId: ctx.pariwarId, context });
  }

  /** Resolve panel-member ids → resolved R5 displays (read-display fallback to the id when none — not attribution). */
  async function resolvePanelMembers(actorIds: readonly string[]): Promise<Array<{ actor_id: string; actor_display: string }>> {
    return Promise.all(
      actorIds.map(async (actorId) => ({ actor_id: actorId, actor_display: (await getDisplayName(deps.pool, actorId)) ?? actorId })),
    );
  }

  function toSessionResponse(session: claim.R9SessionResult['session']): R9SessionResponse {
    return {
      session_id: session.sessionId,
      claim_case_id: session.claimCaseId,
      pariwar_id: session.pariwarId,
      clause_id: session.clauseId,
      clause_version_id: session.clauseVersionId,
      rule_code: session.ruleCode,
      voting_requirement: session.votingRequirement,
      panel_actor_ids: session.panelActorIds,
      quorum_required: session.quorumRequired,
      opened_display: session.openedDisplay,
      opened_at: session.openedAt.toISOString(),
      outcome: session.outcome,
      superseded_at: session.supersededAt ? session.supersededAt.toISOString() : null,
    };
  }

  return {
    /** GET …/admin/r9-voting/queue — the R9 voting queue (AC1). Cast, not a stronger generic: Fastify's
     *  ZodTypeProvider infers the querystring type at the ROUTE-registration call site, not on a handler
     *  declared separately from it, so a narrower `FastifyRequest<{Querystring: ...}>` here would conflict
     *  with the type the actual registered route resolves to. The route's attached `QueueQuery` zod schema
     *  is the real runtime guarantee (validated + coerced before this handler ever runs). */
    async getQueue(request: FastifyRequest, reply: FastifyReply): Promise<R9QueueResponse> {
      const ctx = await contextOf(request);
      const limit = (request.query as { limit?: number }).limit;
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        const items = await claim.getR9VotingQueue(tx.tx, ctx.pariwarId, limit !== undefined ? { limit } : {});
        ok = true;
        void reply.status(200);
        return {
          pariwar_id: ctx.pariwarIdStr,
          items: items.map((i) => ({
            claim_case_id: i.claimCaseId,
            deceased_member_id: i.deceasedMemberId,
            routing_actor_display: i.routingActorDisplay,
            routing_reason_code: i.routingReasonCode,
            session_open: i.sessionOpen,
          })),
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /** GET …/admin/r9-voting/:claimCaseId — the per-claim panel model (AC1). */
    async getPanel(request: FastifyRequest, reply: FastifyReply): Promise<R9PanelResponse> {
      const ctx = await contextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        const model = await claim.getR9Panel(tx.tx, ctx.pariwarId, claimCaseId);
        if (!model) throw new NotFoundError('Claim not found', 'claim.not_found');

        let session: R9PanelResponse['session'] = null;
        let tally: R9PanelResponse['tally'] = null;
        const votes: R9PanelResponse['votes'] = [];
        if (model.session) {
          const s = model.session;
          const panel = await resolvePanelMembers(s.panelActorIds);
          session = {
            session_id: s.sessionId,
            clause_id: s.clauseId,
            clause_version_id: s.clauseVersionId,
            rule_code: s.ruleCode,
            voting_requirement: s.votingRequirement,
            panel,
            quorum_required: s.quorumRequired,
            opened_by_actor: s.openedByActor,
            opened_display: s.openedDisplay,
            opened_at: s.openedAt.toISOString(),
            outcome: s.outcome,
            finalized_display: s.finalizedDisplay,
            finalized_at: s.finalizedAt ? s.finalizedAt.toISOString() : null,
          };
          for (const v of model.votes) {
            const rationale = await decryptR9VoteRationale(v.rationaleCiphertext, ctx.pariwarIdStr, deps.encryption, (err) =>
              request.log.error({ err, vote_id: v.voteId }, 'r9 vote rationale decrypt failed'),
            );
            votes.push({
              vote_id: v.voteId,
              voter_actor_id: v.voterActorId,
              voter_display: v.voterDisplay,
              vote: v.vote,
              cast_at: v.castAt.toISOString(),
              clause_version_id: v.clauseVersionId,
              rationale,
            });
          }
          const panelSize = s.panelActorIds.length;
          const computed = claim.computeR9Outcome(model.votes, panelSize, s.votingRequirement);
          tally = {
            approve_count: computed.approve_count,
            deny_count: computed.deny_count,
            cast_votes: model.votes.length,
            panel_size: panelSize,
            quorum_required: s.quorumRequired,
            provisional_outcome: computed.outcome,
            quorum_met: model.votes.length >= s.quorumRequired,
          };
        }
        ok = true;
        void reply.status(200);
        return {
          claim_case_id: model.claimCaseId,
          deceased_member_id: model.deceasedMemberId,
          current_state: model.currentState,
          session,
          votes,
          tally,
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /** POST …/admin/r9-voting/:claimCaseId/open — open a session (AC2). */
    async postOpen(request: FastifyRequest, reply: FastifyReply): Promise<R9SessionResponse> {
      const ctx = await contextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as R9OpenSessionRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.R9SessionResult;
      try {
        result = await claim.openR9VotingSession(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          clauseId: body.clause_id,
          panelActorIds: body.panel_actor_ids,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_r9_voting.rejected', ctx, {
          claim_case_id: claimCaseId,
          action: 'open',
          clause_id: body.clause_id,
          reason: r9RejectionReason(err),
        });
        return translateR9Error(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_r9_voting.open', ctx, {
        claim_case_id: result.session.claimCaseId,
        clause_id: result.session.clauseId,
        clause_version_id: result.session.clauseVersionId,
        panel_size: result.session.panelActorIds.length,
      });
      void reply.status(201);
      return toSessionResponse(result.session);
    },

    /** POST …/admin/r9-voting/:claimCaseId/vote — cast/revise a vote (AC3). */
    async postVote(request: FastifyRequest, reply: FastifyReply): Promise<R9VoteResponse> {
      const ctx = await contextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as R9VoteRequest;
      let rationaleCiphertext: claim.PreparedR9VoteCiphertext;
      try {
        rationaleCiphertext = await encryptR9VoteRationale(body.rationale, ctx.pariwarIdStr, deps.encryption);
      } catch (err) {
        audit(request, 'admin_r9_voting.rejected', ctx, { claim_case_id: claimCaseId, action: 'vote', reason: r9RejectionReason(err) });
        return translateR9Error(err);
      }
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.R9VoteResult;
      try {
        result = await claim.castR9Vote(scopeTx.client, {
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
        audit(request, 'admin_r9_voting.rejected', ctx, { claim_case_id: claimCaseId, action: 'vote', reason: r9RejectionReason(err) });
        return translateR9Error(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, 'admin_r9_voting.vote', ctx, {
        claim_case_id: result.vote.claimCaseId,
        vote: result.vote.vote,
        revised: result.revised,
      });
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

    /** POST …/admin/r9-voting/:claimCaseId/finalize — finalize the outcome (AC4). Step-up-gated at the route. */
    async postFinalize(request: FastifyRequest, reply: FastifyReply): Promise<R9FinalizeResponse> {
      const ctx = await contextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.R9FinalizeResult;
      try {
        result = await claim.finalizeR9Outcome(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_r9_voting.rejected', ctx, { claim_case_id: claimCaseId, action: 'finalize', reason: r9RejectionReason(err) });
        return translateR9Error(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      const s = result.session;
      // A finalized session's outcome/counts/finalized_display/finalized_at are set TOGETHER (the AC11 DB
      // CHECK coupling) — a session reaching this point (finalizeR9Outcome always returns a FINALIZED
      // session, never mid-open) is guaranteed non-null. Guarded explicitly rather than `!`-asserted so a
      // future regression surfaces as a controlled 500, not an unhandled TypeError on this ₹50L-stakes path.
      if (s.outcome === null || s.approveCount === null || s.denyCount === null || s.finalizedDisplay === null || s.finalizedAt === null) {
        throw new Error(`[r9-voting] finalized session ${s.sessionId} is missing an outcome/count/display/finalized_at field`);
      }
      audit(request, 'admin_r9_voting.finalize', ctx, {
        claim_case_id: s.claimCaseId,
        outcome: s.outcome,
        approve_count: s.approveCount,
        deny_count: s.denyCount,
        idempotent_replay: result.idempotentReplay,
      });
      void reply.status(200);
      return {
        session_id: s.sessionId,
        claim_case_id: s.claimCaseId,
        outcome: s.outcome,
        approve_count: s.approveCount,
        deny_count: s.denyCount,
        voting_requirement: s.votingRequirement,
        finalized_display: s.finalizedDisplay,
        finalized_at: s.finalizedAt.toISOString(),
        claim_state: result.claimState,
        idempotent_replay: result.idempotentReplay,
      };
    },

    /** POST …/admin/r9-voting/:claimCaseId/cancel — cancel/correct (AC5). */
    async postCancel(request: FastifyRequest, reply: FastifyReply): Promise<R9SessionResponse> {
      const ctx = await contextOf(request);
      const claimCaseId = ids.claimId((request.params as { claimCaseId: string }).claimCaseId);
      const body = request.body as R9CancelRequest;
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.R9SessionResult;
      try {
        result = await claim.cancelR9VotingSession(scopeTx.client, {
          claimCaseId,
          pariwarId: ctx.pariwarId,
          reasonCode: body.reason_code,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        ok = true;
      } catch (err) {
        audit(request, 'admin_r9_voting.rejected', ctx, {
          claim_case_id: claimCaseId,
          action: 'cancel',
          reason_code: body.reason_code,
          reason: r9RejectionReason(err),
        });
        return translateR9Error(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      // NON-PII audit — the reason_code + actor, NEVER the cancel rationale (AC10).
      audit(request, 'admin_r9_voting.cancel', ctx, { claim_case_id: result.session.claimCaseId, reason_code: body.reason_code });
      void reply.status(200);
      return toSessionResponse(result.session);
    },

    /** GET …/admin/r9-voting/votes-by-trustee — the votes-by-trustee transcript (AC8). */
    async getVotesByTrustee(request: FastifyRequest, reply: FastifyReply): Promise<R9VotesByTrusteeResponse> {
      const ctx = await contextOf(request);
      const query = request.query as R9VotesByTrusteeQuery;
      const sinceDays = query.sinceDays ?? 180;
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        const rows = await claim.getR9VotesByTrustee(tx.tx, ctx.pariwarId, query.actorId, { sinceDays });
        const votes = await Promise.all(
          rows.map(async (r) => ({
            vote_id: r.voteId,
            session_id: r.sessionId,
            claim_case_id: r.claimCaseId,
            vote: r.vote as R9VotesByTrusteeResponse['votes'][number]['vote'],
            cast_at: r.castAt.toISOString(),
            superseded_at: r.supersededAt ? r.supersededAt.toISOString() : null,
            clause_id: r.clauseId,
            clause_version_id: r.clauseVersionId,
            rule_code: r.ruleCode,
            voting_requirement: r.votingRequirement as R9VotesByTrusteeResponse['votes'][number]['voting_requirement'],
            panel_actor_ids: r.panelActorIds,
            session_outcome: r.sessionOutcome as R9VotesByTrusteeResponse['votes'][number]['session_outcome'],
            rationale: await decryptR9VoteRationale(r.rationaleCiphertext, ctx.pariwarIdStr, deps.encryption, (err) =>
              request.log.error({ err, vote_id: r.voteId }, 'r9 vote rationale decrypt failed'),
            ),
          })),
        );
        ok = true;
        void reply.status(200);
        return { actor_id: query.actorId, since_days: sinceDays, votes };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },
  };
}
