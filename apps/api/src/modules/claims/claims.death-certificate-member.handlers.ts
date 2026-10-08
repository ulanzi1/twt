// The FAMILY's death-certificate status read — Story 6.21b (Task 1; D1).
//
//   · GET /api/v1/member/claims/:claimCaseId/death-certificate — the member's own claim, own
//     session, read-only. `memberSession` only (⛔ no step-up — read-only, non-PII).
//
// The table-driven resolver (`resolveDeathCertificateFamilyStatus`) lives in the LEAF
// (`@twt/domain`'s `death-certificate-approval.ts`, 6.21a's — T8 keeps it one module) — this
// handler's ONLY job is to open ONE scope tx, assert ownership off the locked claim (the
// `getShepherdMember` sibling-oracle guard: a miss and a not-owned claim are both `claim.not_found`),
// and hand the claim's state + its death-certificate snapshot to that resolver. Story 6.19c adds the closure's member
// state (`closed_no_response`) and the re-file routing bit (`refile_requires_confirmation`, `-273` §9).

import type { MemberDeathCertificateStatusResponse } from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

export function createDeathCertificateMemberHandlers(deps: AppDeps) {
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
     * GET /api/v1/member/claims/:claimCaseId/death-certificate — the family's own status read (D1).
     * A miss and a not-owned claim are BOTH `404 claim.not_found` (no cross-claim existence oracle,
     * the `getShepherdMember` precedent).
     */
    async getDeathCertificateStatusMember(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<MemberDeathCertificateStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const claimCaseIdBrand = ids.claimId(claimCaseId);
      const tx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const claimRow = await claim.getClaimCase(tx.tx, pariwarId, claimCaseIdBrand);
        if (!claimRow || claimRow.deceasedMemberId !== ids.memberId(memberIdStr)) {
          throw new NotFoundError('Claim not found', 'claim.not_found');
        }
        const result = await claim.readDeathCertificateFamilyStatus(
          tx.tx,
          pariwarId,
          claimCaseIdBrand,
          claimRow.currentState,
        );
        // ⭐ Story 6.19c (`-273` §9) — the closure's member state and the re-file ROUTING BIT (D19's guard, read-only).
        const closedNoResponse = (await claim.readClosedClosureRow(tx.tx, pariwarId, claimCaseIdBrand)) !== null;
        const refileRequiresConfirmation = await claim.readRefileRequiresConfirmation(
          tx.tx,
          pariwarId,
          claimRow.deceasedMemberId,
        );
        // ⭐ Story 6.24a (`2026-10-07-292` RF2 v1.1) — ONE conjunct in this read only: a pointer claim on which a suspicion
        // refusal STANDS (refused on `-239`, under appeal) routes like a TERMINAL one, so the wizard — the refile — is
        // reachable on the device that filed it (`-261` D4 B's window). `claim_live`'s other consumers are unchanged.
        const suspicionStanding = await claim.isSuspicionRefusalStanding(tx.tx, pariwarId, claimCaseIdBrand);
        ok = true;
        void reply.status(200);
        return {
          status: result.status,
          replacement_reason: result.replacementReason,
          replacement_allowed: result.replacementAllowed,
          upload_allowed: result.uploadAllowed,
          certificate_token: result.certificateToken,
          claim_live: result.claimLive && !suspicionStanding,
          reassurance: result.reassurance,
          closed_no_response: closedNoResponse,
          refile_requires_confirmation: refileRequiresConfirmation,
          // ⭐ Story 6.24a (RF12 v1.3) — the closed claim's routing bit (the calm helpline screen, ⛔ not the wizard).
          claim_closed: claimRow.currentState === 'closed',
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },
  };
}
