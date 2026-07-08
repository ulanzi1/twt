// Member-facing Terms & Conditions handlers — Story 3.6a (Task 5; AC3).
//
// The SECOND consent-registry consumer in apps/api (Story 3.5 medical was the first + built the
// template). `getEffective` returns the current effective T&C for the member's Pariwar (the
// PRECOMPUTED sanitized HTML — never re-rendered at read; the schema deliberately renders once at
// write). `accept` records a `tc_acceptance` consent via the audit-or-throw chain copied VERBATIM
// from `medical.handlers.ts` submit.
//
// ── Audit-or-throw chain (R4 — copy 3.5 exactly) ──────────────────────────────────────────────
// resolve the effective version (server-side — the client tcVersionId is advisory) →
// audit.withCompensatingAudit (ADR-0030: intent line FIRST, servicePool, NON-PII hash) →
// recordConsent({ auditId }) inside the member scope-tx → set ok=true after success → emitAuthAudit
// fire-and-forget LAST → a compensating `member_terms.accept_rolled_back` (5xx) audit line on a
// post-audit scope-tx rollback so the chain reconciles instead of over-counting (3.5's P1 patch —
// MANDATORY, now mechanized by the shared helper).
//
// ── PII discipline ────────────────────────────────────────────────────────────────────────────
// tc_acceptance is a NON-PII consent (the T&C body is public legal text). The audit hash covers
// only { tc_version_id, locale }; consent_payload carries { tcVersionId, locale } (operational
// context, not Tier-1 PII).

import { createHash } from 'node:crypto';

import {
  MemberTermsLocale,
  type MemberTermsAcceptRequest,
  type MemberTermsAcceptResponse,
  type MemberTermsResponse,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, consent, ids, member as memberDomain, termsAndConditions } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, ServiceUnavailableError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Lifecycle states in which a T&C acceptance is rejected (terminal — W-carryforward from 3.5). */
const TERMINAL_STATES = new Set(['withdrawn', 'anonymized']);

export function createMemberTermsHandlers(deps: AppDeps) {
  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /** The UI locale the member is viewing in — from the optional `?locale` query, default `en`. */
  function resolveLocale(request: FastifyRequest): MemberTermsLocale {
    const raw = (request.query as { locale?: unknown } | undefined)?.locale;
    const parsed = MemberTermsLocale.safeParse(raw);
    return parsed.success ? parsed.data : 'en';
  }

  return {
    /**
     * GET /api/v1/member/terms — the current effective T&C for the member's Pariwar. Emits the
     * precomputed `body_html_rendered` (NO read-time markdown render). 503 when no effective T&C is
     * provisioned for the Pariwar (a server-side gap, not a client error — the screen renders a
     * graceful unavailable state).
     */
    async getEffective(request: FastifyRequest): Promise<MemberTermsResponse> {
      const { pariwarIdStr } = memberCtx(request);
      const locale = resolveLocale(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const effective = await termsAndConditions.getEffectiveTc(scopeTx.tx, ids.pariwarId(pariwarIdStr));
        if (!effective) {
          throw new ServiceUnavailableError(
            'The Terms & Conditions are not available for this Pariwar',
            'terms.unavailable',
          );
        }
        const result: MemberTermsResponse = {
          tcVersionId: effective.tcVersionId,
          effectiveFrom: effective.effectiveFrom.toISOString(),
          html: effective.bodyHtmlRendered,
          locale,
        };
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/member/terms/accept — accept the current effective T&C. Records a `tc_acceptance`
     * consent via the audit-or-throw chain (R4). The effective version is resolved SERVER-SIDE; if it
     * cannot be resolved at accept time the whole accept fails atomically (409 `terms.unavailable`,
     * no orphan consent/audit). Rejected when the member is missing (clean 409) or terminal.
     */
    async accept(request: FastifyRequest): Promise<MemberTermsAcceptResponse> {
      const body = request.body as MemberTermsAcceptRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const traceId = request.requestContext.traceId ?? null;

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);

        // 1. Explicit member-existence probe FIRST (getMemberStateAt is non-nullable — a missing
        //    member replays to pending-kyc; this gives a clean 409 instead).
        const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
        if (!exists) {
          throw new ConflictError('Member not found', 'terms.member_not_found');
        }
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
        if (TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Member is in a terminal state — Terms & Conditions cannot be accepted',
            'terms.member_terminal',
          );
        }

        // 2. Resolve the effective T&C SERVER-SIDE (the client tcVersionId is advisory). No consent
        //    without a resolvable version (AC3) — fail atomically before any audit/consent write.
        const effective = await termsAndConditions.getEffectiveTc(scopeTx.tx, pariwarId);
        if (!effective) {
          throw new ConflictError(
            'The Terms & Conditions are not available for this Pariwar',
            'terms.unavailable',
          );
        }
        const tcVersionId = effective.tcVersionId;
        const locale = body.locale;

        // 3. Audit-or-throw (ADR-0030): the intent line is written FIRST (servicePool, its own tx) —
        //    the hash is over NON-PII only ({ tc_version_id, locale }) — then its id threads into
        //    recordConsent. On a later step's failure, withCompensatingAudit settles the chain with a
        //    5xx `member_terms.accept_rolled_back` line (the step-3 line survives the scope-tx rollback).
        return await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: pariwarIdStr,
            actorId: memberIdStr,
            actorRole: null,
            action: 'member_terms.accepted',
            resourceLocator: `member:${memberIdStr}:tc`,
            requestPayloadHash: createHash('sha256')
              .update(canonicalJsonStringify({ tc_version_id: tcVersionId, locale }), 'utf8')
              .digest('hex'),
            traceId,
          },
          mutate: async ({ auditId }) => {
            // 4. Record the consent (consent_artifact_ref = the resolved tcVersionId — the legal basis).
            const consentRow = await consent.recordConsent(scopeTx.tx, {
              pariwarId,
              subjectId: memberIdStr,
              consentType: 'tc_acceptance',
              consentArtifactRef: tcVersionId,
              grantedViaActor: 'member_self',
              consentPayload: { tcVersionId, locale },
              auditId,
            });

            const result: MemberTermsAcceptResponse = {
              accepted: true,
              consentId: consentRow.consentId,
              tcVersionId,
            };
            // 5. Set ok=true only after success; fire-and-forget audit LAST (NON-PII context).
            ok = true;
            emitAuthAudit(deps, request, 'member_terms.accepted', {
              actorId: memberIdStr,
              pariwarId: pariwarIdStr,
              context: { tc_version_id: tcVersionId },
            });
            return result;
          },
        });
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
