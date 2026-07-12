// Shepherd surfaces — Story 6.12 (Task 5/6; AC3/AC5/AC6/AC7).
//
// TWO authenticated surfaces:
//   · member-app READ  — GET  /api/v1/member/claims/:claimCaseId/shepherd (the <ShepherdContactCard>
//     backing read). Claim-ownership asserted off the locked claim (the sibling nominee-bank/dpdpa
//     pattern — a member cannot probe another claim). Returns the live shepherd's display + role + contact
//     SNAPSHOT, or a typed `not_assigned` state.
//   · admin manual REASSIGN — POST …/admin/claims/:claimCaseId/shepherd/reassign (R6). Human-actor +
//     claim.assign_shepherd (district-dimension, server-derived) at the route; self-assignment prohibited
//     (AC5); manual-target fail-closed on a missing name / no contact channel (AC2). Re-emits the SAME
//     claim.shepherd_assigned event + atomic supersession (the domain writer), post-commit audit +
//     the SAME notification hook the assign worker fires (AC7 — one seam, both call sites).
//
// PII discipline (AC8): the member read is the ONLY surface that returns the contact snapshot (that IS the
// feature). The admin reassign response + audit line carry NON-PII routing coordinates + the authorized
// display ONLY — NEVER the shepherd's phone/WhatsApp.

import {
  type MemberShepherdResponse,
  type ShepherdReassignRequest,
  type ShepherdReassignResponse,
} from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import { consoleShepherdAssignedNotificationHook, type ShepherdAssignedNotificationHook } from '@twt/jobs';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ShepherdNotContactableError,
  ShepherdTargetNotEligibleError,
  UnauthorizedError,
} from '../../http-errors.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Map a shepherd domain error to its stable HTTP shape. Rethrows ApiErrors + anything unknown as-is. */
function translateShepherdError(err: unknown): never {
  if (err instanceof claim.ShepherdAssignmentClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (err instanceof claim.ShepherdSelfAssignmentError) {
    throw new ForbiddenError('A district admin cannot assign a claim to themselves', 'shepherd.self_assignment');
  }
  if (err instanceof claim.ShepherdReassignmentConflictError) {
    throw new ConflictError(
      'This claim’s shepherd was changed by someone else — reload and try again',
      'shepherd.reassignment_conflict',
    );
  }
  if (err instanceof claim.ShepherdAssignmentInvalidClaimStateError) {
    throw new ConflictError(
      'This claim is not in a state where a shepherd can be (re)assigned',
      'shepherd.invalid_claim_state',
    );
  }
  if (err instanceof claim.ClaimStreamConcurrencyError) {
    throw new ConflictError('This claim was updated concurrently — reload and try again', 'shepherd.stream_conflict');
  }
  throw err;
}

export function createShepherdHandlers(
  deps: AppDeps,
  notify: ShepherdAssignedNotificationHook = consoleShepherdAssignedNotificationHook,
) {
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  return {
    /**
     * GET /api/v1/member/claims/:claimCaseId/shepherd — the member-app <ShepherdContactCard> read. Claim
     * ownership asserted (deceased === session member — the sibling member-claim oracle guard). Returns the
     * live shepherd's display + role + contact snapshot, or a typed `not_assigned` state (no live shepherd
     * yet). Read-only + the contact snapshot IS the authorized member-facing surface (AC3/AC8).
     */
    async getShepherdMember(request: FastifyRequest, reply: FastifyReply): Promise<MemberShepherdResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const claimCaseIdBrand = ids.claimId(claimCaseId);
      const tx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const claimRow = await claim.getClaimCase(tx.tx, pariwarId, claimCaseIdBrand);
        if (!claimRow || claimRow.deceasedMemberId !== ids.memberId(memberIdStr)) {
          // No cross-claim oracle — a miss and a not-owned claim are indistinguishable (404).
          throw new NotFoundError('Claim not found', 'claim.not_found');
        }
        const shepherd = await claim.getLiveShepherd(tx.tx, pariwarId, claimCaseIdBrand);
        ok = true;
        void reply.status(200);
        if (!shepherd) return { status: 'not_assigned' };
        return {
          status: 'assigned',
          display_name: shepherd.displayName,
          role_label: claim.SHEPHERD_ROLE_LABEL,
          contact: { phone: shepherd.contact.phone, whatsapp: shepherd.contact.whatsapp },
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /**
     * POST …/admin/claims/:claimCaseId/shepherd/reassign — the R6 manual reassignment. The route chain
     * already proved a HUMAN admin + claim.assign_shepherd at the deceased's server-derived district +
     * tenant. Self-assignment (actor === target) is rejected (AC5); a target missing a display name or any
     * usable contact channel is blocked fail-closed (AC2 — NO fallback). Re-emits the SAME
     * claim.shepherd_assigned event + atomic supersession; post-commit audit + notify hook (AC7).
     */
    async reassignShepherd(request: FastifyRequest, reply: FastifyReply): Promise<ShepherdReassignResponse> {
      const scopeTx0 = request.scopeTx;
      const actorId = request.requestContext.actorId;
      const district = request.decisionDistrict;
      if (!scopeTx0 || !actorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      if (district == null) {
        // Defensive: the district-resolution preHandler + the district permission gate should have denied
        // a no-district claim already (403). Never reassign without an authorized district.
        throw new ForbiddenError('Authorization required', 'auth.forbidden');
      }
      const pariwarId = ids.pariwarId(scopeTx0.pariwarId);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const claimCaseIdBrand = ids.claimId(claimCaseId);
      const body = request.body as ShepherdReassignRequest;
      const targetActorId = body.target_shepherd_actor_id;

      // Self-assignment prohibited (AC5) — a clean early signal (the domain writer re-guards as a backstop).
      if (actorId === targetActorId) {
        auditReassign(request, 'admin_claim.shepherd_reassigned', actorId, pariwarId, claimCaseId, district, targetActorId, null, null, 'rejected_self');
        throw new ForbiddenError('A district admin cannot assign a claim to themselves', 'shepherd.self_assignment');
      }

      const scopeTx = await openScopeTx(deps, scopeTx0.pariwarId);
      let ok = false;
      let result: claim.ShepherdAssignmentResult;
      try {
        // Manual-target fail-closed (AC2): resolve the target's contactability FIRST; block on a missing
        // name / no channel BEFORE any write. NO fallback, no placeholder. Scope-validated (Review
        // Finding): the target must be an active district_admin at this claim's district/tenant, or the
        // lookup resolves to null exactly like a nonexistent user.
        const contact = await claim.getShepherdContactability(scopeTx.tx, pariwarId, district, targetActorId);
        if (!contact) {
          throw new ShepherdTargetNotEligibleError(targetActorId);
        }
        if (contact.displayName === null) {
          throw new AdminDisplayNameMissingError(targetActorId);
        }
        if (contact.contactPhone === null && contact.contactWhatsapp === null) {
          throw new ShepherdNotContactableError(targetActorId);
        }
        result = await claim.reassignShepherd(scopeTx.client, {
          claimCaseId: claimCaseIdBrand,
          pariwarId,
          district,
          targetShepherdActorId: targetActorId,
          targetDisplay: contact.displayName,
          targetContactPhone: contact.contactPhone,
          targetContactWhatsapp: contact.contactWhatsapp,
          assignmentReason: 'reassignment',
          actor: 'operator',
          actorId,
        });
        ok = true;
      } catch (err) {
        translateShepherdError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // POST-COMMIT audit (NON-PII — never the name/phone/WhatsApp, AC8).
      auditReassign(
        request,
        'admin_claim.shepherd_reassigned',
        actorId,
        pariwarId,
        claimCaseId,
        district,
        result.assignment.shepherdActorId,
        result.previousShepherdActorId,
        result.assignment.assignmentReason,
        'reassignment',
      );

      // POST-COMMIT notify (AC7 — the SAME hook the assign worker fires; best-effort, never throws out).
      try {
        notify({
          pariwarId: scopeTx0.pariwarId,
          claimCaseId,
          shepherdActorId: result.assignment.shepherdActorId,
          claimantActorId: null,
          assignmentReason: 'reassignment',
        });
      } catch {
        // A best-effort notification seam must never fail a committed reassignment.
      }

      void reply.status(201);
      return {
        assignment_id: result.assignment.assignmentId,
        claim_case_id: result.assignment.claimCaseId,
        shepherd_actor_id: result.assignment.shepherdActorId,
        shepherd_display: result.assignment.shepherdDisplay,
        role_label: claim.SHEPHERD_ROLE_LABEL,
        previous_shepherd_actor_id: result.previousShepherdActorId,
        assignment_reason: result.assignment.assignmentReason,
        assigned_at: result.assignment.assignedAt.toISOString(),
        claim_state: result.claimState,
      };
    },
  };

  /** Post-commit NON-PII audit line for a shepherd (re)assignment (never name/phone/WhatsApp — AC8). */
  function auditReassign(
    request: FastifyRequest,
    type: AuthAuditEventType,
    actorId: string,
    pariwarId: ids.PariwarId,
    claimCaseId: string,
    district: string,
    shepherdActorId: string | null,
    previousShepherdActorId: string | null,
    assignmentReason: string | null,
    disposition: string,
  ): void {
    emitAuthAudit(deps, request, type, {
      actorId,
      pariwarId,
      context: {
        claim_case_id: claimCaseId,
        district,
        previous_shepherd_actor_id: previousShepherdActorId,
        shepherd_actor_id: shepherdActorId,
        assignment_reason: assignmentReason,
        disposition,
      },
    });
  }
}
