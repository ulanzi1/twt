// The RE-FILE CONFIRMATION — Story 6.19c (AC15, D19, `-254`).
//
//   · recordRefileConfirmation — key (6) `claim.confirm_refile`: a District Admin or a helpline operator records, with a
//     REQUIRED note, that the death of a claim CLOSED for no response may be filed again. Exactly ONE mint consumes it
//     (`tryConverge` or `overrideIntakeAttempt`, under the death's intake lock). `via` is the role the key is held
//     under: `district_admin` → `district_admin`, `helpline_operator` → `helpline`. ⛔ Any other role (a `super_admin`'s
//     auto-derived key) records ⛔ no confirmation — `-254` names the District Admin or the helpline — 403
//     `refile_confirmation.role_not_recordable`.
// The note is Tier-1 (`claim_refile_confirmation`); the audit line names the CLOSED claim and carries ⛔ no note.
// ⭐ Story 6.24a (`-261` D4 B) keeps a suspicion refusal's new claim apart at the convergence candidate; the guard still
// keys on the closures row, ⛔ never on `denied_no_appeal`, and FQ5's `closed` claim writes ⛔ no closures row (see
// `refile-guard.ts`).

import type { RefileConfirmationRequest, RefileConfirmationResponse } from '@twt/contracts';
import { claim, rbac, schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../http-errors.js';
import { geoTreeResolverForRequest, loadActorGrants } from '../rbac/index.js';
import { contextOf } from './claims.correction-chase.handlers.js';
import { actorDisplayOf, auditClaim, inWriteTx } from './claims.correction-closure.handlers.js';
import { CLAIM_REFILE_CONFIRMATION_FIELD_CLASS, encryptClosureField } from './correction-closure-crypto.js';

export const REFILE_CONFIRM_KEY = 'claim.confirm_refile';

/** The confirmation's refusals — `refile_confirmation.<code>` (`not_found` → 404), ⭐ exhaustive. */
function translateRefileError(err: unknown): never {
  if (err instanceof claim.RefileConfirmationRefusedError) {
    switch (err.refusal) {
      case 'not_found':
        throw new NotFoundError('Claim not found', 'refile_confirmation.not_found');
      case 'not_closed':
        throw new ConflictError('This claim was not closed for no response — a new claim needs no confirmation', 'refile_confirmation.not_closed');
      case 'not_most_recent':
        throw new ConflictError(
          'This is not the most recent claim for this death — confirm against the latest one',
          'refile_confirmation.not_most_recent',
        );
      case 'already_confirmed':
        throw new ConflictError('A re-file confirmation is already recorded and waiting to be used', 'refile_confirmation.already_confirmed');
      default: {
        const unreachable: never = err.refusal;
        throw new ConflictError('The confirmation cannot be recorded', `refile_confirmation.${String(unreachable)}`);
      }
    }
  }
  throw err;
}

export function createRefileConfirmationHandlers(deps: AppDeps) {
  return {
    /** POST …/admin/claims/:claimCaseId/refile-confirmation — key (6). */
    async recordRefileConfirmation(request: FastifyRequest, reply: FastifyReply): Promise<RefileConfirmationResponse> {
      const ctx = contextOf(request);
      const body = request.body as RefileConfirmationRequest;
      const target = request.refileConfirmationScope ?? { dimension: 'district' as const, value: null };
      const grants = request.scopeGrants ?? (await loadActorGrants(request.scopeTx!, ctx.actorId));
      const role = rbac.matchingGrantRole(
        grants,
        REFILE_CONFIRM_KEY,
        { dimension: target.dimension, value: target.value, pariwarId: ctx.pariwarIdStr },
        { resolver: geoTreeResolverForRequest(request) },
      );
      const via: schema.RefileConfirmationVia | null =
        role === 'district_admin' ? 'district_admin' : role === 'helpline_operator' ? 'helpline' : null;
      if (via === null) {
        throw new ForbiddenError(
          'A re-file confirmation is recorded by a District Admin or the helpline',
          'refile_confirmation.role_not_recordable',
        );
      }
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const noteCiphertext = await encryptClosureField(body.note, ctx.pariwarIdStr, CLAIM_REFILE_CONFIRMATION_FIELD_CLASS, deps.encryption);
      let row: schema.ClaimRefileConfirmationRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.recordRefileConfirmation(client, {
            pariwarId: ctx.pariwarId,
            closedClaimCaseId: ctx.claimCaseId,
            via,
            actorId: ctx.actorId,
            actorDisplay,
            noteCiphertext,
          }),
        );
      } catch (err) {
        translateRefileError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_refile.confirmed', { confirmation_id: row!.confirmationId, via });
      void reply.status(201);
      return { confirmation_id: row!.confirmationId, closed_claim_case_id: ctx.claimCaseIdStr, via };
    },
  };
}
