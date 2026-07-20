// Member pool-onboarding-tutorial outcome handler — Story 7.10 (Task 5; AC4).
//
// ONE member-session-gated handler recording the tutorial completion/skip as a member-level action on
// the audit log (D1 — the codebase's "member-level event" convention; analytics derives from it). This
// event is STANDALONE — there is no paired state mutation — so it uses a plain `audit.writeAuditEntry`
// (single-line append) and does NOT need `withCompensatingAudit` (ADR-0030), which exists to pair a
// rollback-capable mutation with a compensatable audit line (contrast wa-opt-in, which pairs a consent
// write). The client fires this best-effort; the response is 204 (no body).
//
// `AuditEntryInput` requires more than `action`: it also needs `resourceLocator`, a `requestPayloadHash`
// (SHA-256 hex — NEVER the payload), and `responseStatus`. The outcome carries no PII, so hashing
// `{ outcome }` is safe.

import { createHash } from 'node:crypto';

import { audit } from '@twt/domain';
import type { PoolOnboardingOutcomeRequest } from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';

/** The member-level audit action per outcome (completion and skip are distinct — AC4). */
const ACTION_BY_OUTCOME = {
  completed: 'member.pool_onboarding_tutorial_completed',
  skipped: 'member.pool_onboarding_tutorial_skipped',
} as const;

/** SHA-256 hex of the audit request payload (non-PII — the outcome enum only). */
export function poolOnboardingAuditPayloadHash(input: { outcome: 'completed' | 'skipped' }): string {
  return createHash('sha256').update(JSON.stringify({ outcome: input.outcome })).digest('hex');
}

export function createPoolOnboardingHandlers(deps: AppDeps) {
  return {
    /** POST — record the member-level completion/skip outcome as a single audit line (204). */
    async record(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const memberId = request.requestContext.actorId;
      const pariwarId = request.requestContext.pariwarId;
      if (!memberId || !pariwarId) {
        // Defense-in-depth — requireMemberSession already guarantees both.
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { outcome } = request.body as PoolOnboardingOutcomeRequest;

      await audit.writeAuditEntry(deps.servicePool, {
        pariwarId,
        actorId: memberId,
        actorRole: null,
        action: ACTION_BY_OUTCOME[outcome],
        resourceLocator: `pariwar/${pariwarId}/member/${memberId}/pool-onboarding-tutorial`,
        requestPayloadHash: poolOnboardingAuditPayloadHash({ outcome }),
        responseStatus: 204,
        traceId: request.requestContext.traceId ?? null,
      });

      void reply.status(204).send();
    },
  };
}
