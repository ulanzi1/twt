// State-Trustee cycle-freeze handlers — Story 6.13 (Task 6; AC0/AC1/AC2/AC3/AC4/AC4b/AC5/AC6/AC8/AC9/AC10).
//
// The FIRST state_trustee-facing surface (v1 actor = pariwar_admin-as-Trustee-Lite, D-B). Three
// authenticated admin surfaces, all gated by cycle.freeze @ dimension:'pariwar' (the route chain proves an
// authenticated HUMAN actor + the pariwar-wide permission + tenant, AC7):
//   · GET  …/admin/cycle-freeze/pending  → the two-bucket pending list (AC1). Decrypts the verifier
//     rationale AFTER authorization at the route (the 6.10 ciphertext-as-stored rule, AC10).
//   · POST …/admin/cycle-freeze/decision → per-claim approve/deny/route/resolve (AC2/AC3/AC4/AC4b).
//   · POST …/admin/cycle-freeze/commit   → the step-up-gated bulk commit (AC5) + the POST-COMMIT
//     pool-spawn trigger (AC6 — fired from the HANDLER after the writer tx commits, never inside it).
//
// ── The two-authority write (AC0) ───────────────────────────────────────────────────────────
// Each lifecycle-changing verb writes BOTH the claim.* LIFECYCLE event (via the domain writer's
// projectClaimState) AND the claim_state_trustee_decisions DECISION-METADATA row in ONE committed
// scope-tx; routing writes metadata only (no lifecycle event). Claim STATE is never derived from the row.
//
// ── Concerns THIS file owns (the 6.11/6.12 posture) ─────────────────────────────────────────
// (1) ACTOR-DISPLAY (R5/AC8) resolves FIRST, before any lock/tx, for EVERY verb — server-side from
//     users.display_name; NULL/empty → AdminDisplayNameMissingError (409) fail-closed, no event/row/audit.
//     NO fallback (never email/UUID/role/placeholder/client input; the DTO is .strict()).
// (2) The rationale (Tier-1 PII, D-G) is ENCRYPTED BEFORE the writer; the writer takes ciphertext.
// (3) AUDIT IS A POST-COMMIT SINK — NON-PII (claim/commit id + outcome/phase + reason_code); NEVER the
//     rationale (D-G/AC10). Rejected attempts are audited too (fail-closed AND audited).
// (4) The domain writer's typed guards map to stable 4xx here; the advisory lock + state guards + unique
//     indexes give idempotency (AC9). The commit is idempotent on the client-generated commit_id (AC5).
// (5) The POST-COMMIT pool-spawn trigger is best-effort + self-healing: a failure NEVER rolls back the
//     committed freeze; the cycle_freeze_commits.trigger_delivered flag makes the fire idempotent (AC6).

import {
  type CycleFreezeCommitRequest,
  type CycleFreezeCommitResponse,
  type CycleFreezeDecisionRequest,
  type CycleFreezeDecisionResponse,
  type CycleFreezePendingResponse,
} from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import { consolePoolSpawnTrigger, type PoolSpawnTrigger } from '@twt/jobs';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { encryptOptionalTrusteeRationale } from './state-trustee-decision-crypto.js';
import { decryptVerifierRationale } from './verifier-decision-crypto.js';

/** Map a cycle-freeze domain error to its stable HTTP shape. Rethrows ApiErrors + anything unknown as-is. */
function translateCycleFreezeError(err: unknown): never {
  if (err instanceof claim.TrusteeClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (err instanceof claim.ClaimNotFreezeVotableError) {
    throw new ConflictError(
      'This claim cannot be voted on in its current state',
      'cycle_freeze.not_votable',
      { state: err.currentState },
    );
  }
  if (err instanceof claim.ClaimNotRoutableError) {
    throw new ConflictError(
      'This claim cannot be routed to R9 in its current state',
      'cycle_freeze.not_routable',
      { state: err.currentState },
    );
  }
  if (err instanceof claim.EscalationNotResolvableError) {
    throw new ConflictError(
      'This escalation cannot be resolved in the claim’s current state',
      'cycle_freeze.escalation_not_resolvable',
    );
  }
  if (err instanceof claim.EscalationResolutionConflictError) {
    throw new ConflictError(
      'This escalation was resolved by someone else — reload and try again',
      'cycle_freeze.escalation_conflict',
    );
  }
  if (err instanceof claim.TrusteeReasonCodeError) {
    throw new BadRequestError('The reason code is not valid for this decision', 'cycle_freeze.reason_invalid');
  }
  if (err instanceof claim.TrusteeDecisionConflictError) {
    throw new ConflictError(
      'A decision for this claim/phase already exists — reload and try again',
      'cycle_freeze.decision_conflict',
      { phase: err.phase },
    );
  }
  if (err instanceof claim.ClaimAlreadyRoutedError) {
    throw new ConflictError(
      'This claim was routed to R9 and cannot be voted on',
      'cycle_freeze.already_routed',
    );
  }
  if (err instanceof claim.CommitIdOwnershipConflictError) {
    throw new ConflictError(
      'This commit_id was already used by a different actor',
      'cycle_freeze.commit_id_ownership_conflict',
    );
  }
  if (err instanceof claim.CommitIdCollisionError) {
    throw new ConflictError('This commit_id is already in use', 'cycle_freeze.commit_id_collision');
  }
  if (err instanceof claim.ClaimStreamConcurrencyError) {
    throw new ConflictError('This claim was updated concurrently — reload and try again', 'cycle_freeze.stream_conflict');
  }
  throw err;
}

interface CycleFreezeContext {
  actorId: string;
  pariwarId: ids.PariwarId;
  pariwarIdStr: string;
  /** The R5 decision-time display snapshot — resolved FIRST (fail-closed on missing). */
  actorDisplay: string;
}

export function createCycleFreezeHandlers(
  deps: AppDeps,
  trigger: PoolSpawnTrigger = consolePoolSpawnTrigger,
) {
  /**
   * Establish the request context + resolve the actor-display snapshot (R5/AC8) FIRST — before any lock or
   * tx, for EVERY verb. A missing/empty display name BLOCKS with AdminDisplayNameMissingError (409),
   * fail-closed: no event, no decision row, no audit line. NO fallback of any kind.
   */
  async function contextOf(request: FastifyRequest): Promise<CycleFreezeContext> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) {
      throw new AdminDisplayNameMissingError(actorId);
    }
    return {
      actorId,
      pariwarId: ids.pariwarId(scopeTx.pariwarId),
      pariwarIdStr: scopeTx.pariwarId,
      actorDisplay,
    };
  }

  /** Post-commit NON-PII audit line (never the rationale, D-G/AC10). */
  function audit(
    request: FastifyRequest,
    type: AuthAuditEventType,
    ctx: CycleFreezeContext,
    context: Record<string, unknown>,
  ): void {
    emitAuthAudit(deps, request, type, { actorId: ctx.actorId, pariwarId: ctx.pariwarId, context });
  }

  function toDecisionResponse(result: claim.TrusteeDecisionResult): CycleFreezeDecisionResponse {
    return {
      decision_id: result.decision.decisionId,
      claim_case_id: result.decision.claimCaseId,
      pariwar_id: result.decision.pariwarId,
      phase: result.decision.phase,
      outcome: result.decision.outcome,
      reason_code: result.decision.reasonCode ?? null,
      actor_display: result.decision.actorDisplay,
      decided_at: result.decision.decidedAt.toISOString(),
      claim_state: result.claimState,
    };
  }

  return {
    /**
     * GET …/admin/cycle-freeze/pending — the two-bucket pending list (AC1). Reads the compound model, then
     * decrypts the verifier rationale AFTER authorization (fail-soft to '' — a decrypt failure never 500s
     * the authorized list; the 6.10 posture).
     */
    async getPending(request: FastifyRequest, reply: FastifyReply): Promise<CycleFreezePendingResponse> {
      const ctx = await contextOf(request);
      const tx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      try {
        const pending = await claim.getCycleFreezePending(tx.tx, ctx.pariwarId);
        const mapCase = async (c: claim.CycleFreezePendingCase) => {
          let verifierRationale: string | null = null;
          if (c.verifierRationaleCiphertext) {
            try {
              verifierRationale = await decryptVerifierRationale(
                c.verifierRationaleCiphertext,
                ctx.pariwarIdStr,
                deps.encryption,
              );
            } catch (err) {
              verifierRationale = ''; // fail-soft — never 500 the authorized list on one bad envelope
              request.log.error({ err, claim_case_id: c.claimCaseId }, 'verifier rationale decrypt failed');
            }
          }
          return {
            claim_case_id: c.claimCaseId,
            deceased_member_id: c.deceasedMemberId,
            current_state: c.currentState,
            verifier_decision_id: c.verifierDecisionId,
            verifier_actor_display: c.verifierActorDisplay,
            verifier_reason_code: c.verifierReasonCode,
            verifier_rationale: verifierRationale,
            signals_summary: c.signalsSummary,
            concealment_flags: c.concealmentFlags,
            routed_to_r9: c.routedToR9,
          };
        };
        const ready_to_freeze = await Promise.all(pending.readyToFreeze.map(mapCase));
        const escalated = await Promise.all(pending.escalated.map(mapCase));
        const voted_pending_commit = await Promise.all(pending.votedPendingCommit.map(mapCase));
        ok = true;
        void reply.status(200);
        return { pariwar_id: ctx.pariwarIdStr, ready_to_freeze, escalated, voted_pending_commit };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /**
     * POST …/admin/cycle-freeze/decision — the per-claim vote/route/resolve (AC2/AC3/AC4/AC4b). Dispatches
     * by action; the contract superRefine already enforced the D-F reason-code rules at the boundary, and
     * the domain writer re-checks (defense-in-depth).
     */
    async postDecision(request: FastifyRequest, reply: FastifyReply): Promise<CycleFreezeDecisionResponse> {
      const ctx = await contextOf(request);
      const body = request.body as CycleFreezeDecisionRequest;
      const claimCaseId = ids.claimId(body.claim_case_id);
      const rationaleCiphertext = await encryptOptionalTrusteeRationale(
        body.rationale,
        ctx.pariwarIdStr,
        deps.encryption,
      );

      const base = {
        claimCaseId,
        pariwarId: ctx.pariwarId,
        reasonCode: body.reason_code ?? null,
        rationaleCiphertext,
        actorId: ctx.actorId,
        actorDisplay: ctx.actorDisplay,
        actor: 'trustee' as const,
      };

      const auditType: AuthAuditEventType =
        body.action === 'route_to_r9'
          ? 'admin_cycle_freeze.route'
          : body.action === 'resolve_escalation'
            ? 'admin_cycle_freeze.escalation_resolved'
            : 'admin_cycle_freeze.vote';

      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.TrusteeDecisionResult;
      try {
        switch (body.action) {
          case 'approve':
            result = await claim.voteOnFrozenClaim(scopeTx.client, { ...base, outcome: 'approved' });
            break;
          case 'deny':
            result = await claim.voteOnFrozenClaim(scopeTx.client, { ...base, outcome: 'denied' });
            break;
          case 'route_to_r9':
            result = await claim.routeToR9(scopeTx.client, base);
            break;
          case 'resolve_escalation':
            if (body.escalation_outcome === undefined) {
              // Defense-in-depth (the reason-code precedent): the contract superRefine already requires
              // this, but a route/schema-wiring mistake must fail loud here too, not flow `undefined` into
              // a domain function typed to expect 'approved' | 'denied'.
              throw new BadRequestError(
                'escalation_outcome is required for resolve_escalation',
                'cycle_freeze.escalation_outcome_required',
              );
            }
            result = await claim.resolveEscalation(scopeTx.client, {
              ...base,
              outcome: body.escalation_outcome,
            });
            break;
          default:
            throw new BadRequestError('Unknown action', 'cycle_freeze.unknown_action');
        }
        ok = true;
      } catch (err) {
        audit(request, 'admin_cycle_freeze.rejected', ctx, {
          claim_case_id: body.claim_case_id,
          action: body.action,
          reason_code: body.reason_code ?? null,
        });
        return translateCycleFreezeError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      audit(request, auditType, ctx, {
        claim_case_id: result.decision.claimCaseId,
        phase: result.decision.phase,
        outcome: result.decision.outcome,
        reason_code: result.decision.reasonCode ?? null,
      });
      void reply.status(201);
      return toDecisionResponse(result);
    },

    /**
     * POST …/admin/cycle-freeze/commit — the step-up-gated bulk commit (AC5) + the POST-COMMIT pool-spawn
     * trigger (AC6). commitCycleFreeze owns the writer tx (DB work only); ONLY on a clean commit does the
     * HANDLER fire the injected PoolSpawnTrigger (best-effort, outside the tx) then flip trigger_delivered.
     * A trigger failure NEVER rolls back the committed freeze; a re-submitted commit_id is a no-op replay.
     */
    async postCommit(request: FastifyRequest, reply: FastifyReply): Promise<CycleFreezeCommitResponse> {
      const ctx = await contextOf(request);
      const body = request.body as CycleFreezeCommitRequest;
      const commitId = ids.cycleFreezeCommitId(body.commit_id);

      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.CommitCycleFreezeResult;
      let frozenRefs: Array<{ claimCaseId: string; deceasedMemberId: string }> = [];
      try {
        result = await claim.commitCycleFreeze(scopeTx.client, {
          pariwarId: ctx.pariwarId,
          commitId,
          actorId: ctx.actorId,
          actorDisplay: ctx.actorDisplay,
          actor: 'trustee',
        });
        // Capture the frozen {claim, deceased} refs INSIDE the committed tx (the trigger fires AFTER commit).
        frozenRefs = await claim.getFrozenClaimRefs(scopeTx.tx, ctx.pariwarId, result.committedClaimIds);
        ok = true;
      } catch (err) {
        audit(request, 'admin_cycle_freeze.rejected', ctx, { commit_id: body.commit_id, action: 'commit' });
        return translateCycleFreezeError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // Post-commit audit (NON-PII — the committed set size, never the rationale).
      audit(request, 'admin_cycle_freeze.committed', ctx, {
        commit_id: result.commit.commitId,
        committed_count: result.committedClaimIds.length,
        idempotent_replay: result.idempotentReplay,
      });

      // POST-COMMIT pool-spawn trigger (AC6) — fires whenever the commit's durable record hasn't yet
      // recorded a successful delivery, on a FRESH commit OR a re-submitted replay alike. This is what
      // makes redelivery actually self-healing (other suggestion #1 amended): a fresh commit whose trigger
      // throws leaves `trigger_delivered=false`, and the NEXT client retry of the SAME commit_id — which is
      // necessarily a replay — must still attempt delivery, not skip it. Best-effort: a failure here never
      // rolls back the durable freeze.
      //
      // A SESSION-scoped advisory lock (not the per-claim tx-scoped kind used elsewhere in this module)
      // guards the fire+flip as one critical section, held across the injected trigger's external call —
      // without it, two concurrent requests for the SAME commit_id (a double-click, two tabs, a client
      // retry racing a slow in-flight request) could both read `trigger_delivered = false` and both invoke
      // the trigger (review addendum, 2026-07-13). A losing request never blocks on the lock: if it can't
      // acquire it immediately, another request is already handling delivery for this commit_id, so this
      // one just returns its own (possibly stale) snapshot — still best-effort, never fails the response.
      let triggerDelivered = result.commit.triggerDelivered;
      if (!triggerDelivered) {
        const lockClient = await deps.pool.connect();
        try {
          const acquired = await claim.tryAcquireCommitTriggerLock(lockClient, result.commit.commitId);
          if (acquired) {
            try {
              const recheckTx = await openScopeTx(deps, ctx.pariwarIdStr);
              let recheckOk = false;
              let stillPending = true;
              try {
                stillPending = !(await claim.getCycleFreezeCommitTriggerDelivered(recheckTx.tx, ctx.pariwarId, commitId));
                recheckOk = true;
              } finally {
                await closeScopeTx(recheckTx, recheckOk);
              }
              if (stillPending) {
                try {
                  await trigger({
                    pariwar_id: ctx.pariwarIdStr,
                    commit_id: result.commit.commitId,
                    frozen_claims: frozenRefs.map((r) => ({
                      claim_case_id: r.claimCaseId,
                      deceased_member_id: r.deceasedMemberId,
                    })),
                    attestation: {
                      actor_id: ctx.actorId,
                      actor_display: ctx.actorDisplay,
                      committed_at: result.commit.committedAt.toISOString(),
                    },
                  });
                  const flipTx = await openScopeTx(deps, ctx.pariwarIdStr);
                  let flipOk = false;
                  try {
                    await claim.markCycleFreezeTriggerDelivered(flipTx.client, ctx.pariwarId, commitId);
                    flipOk = true;
                  } finally {
                    await closeScopeTx(flipTx, flipOk);
                  }
                  triggerDelivered = true;
                } catch {
                  // Best-effort, self-healing — a failed/slow trigger must never fail a durably-committed freeze.
                }
              } else {
                // Another request delivered it while we waited for the lock.
                triggerDelivered = true;
              }
            } finally {
              await claim.releaseCommitTriggerLock(lockClient, result.commit.commitId);
            }
          }
        } finally {
          lockClient.release();
        }
      }

      void reply.status(200);
      return {
        commit_id: result.commit.commitId,
        pariwar_id: result.commit.pariwarId,
        actor_display: result.commit.actorDisplay,
        committed_claim_ids: result.committedClaimIds,
        trigger_delivered: triggerDelivered,
        committed_at: result.commit.committedAt.toISOString(),
        idempotent_replay: result.idempotentReplay,
      };
    },
  };
}
