// Member-app claim-filing handlers — Story 6.2 (Tasks 2 + 3; AC2/AC3/AC5/AC6).
//
// Three member-session-gated handlers for the Ravi-mode intake flow:
//   · requestHandoverOtp — send the handover-trust OTP to the nominee's mobile (AC2);
//   · verifyHandoverOtp  — verify it → record the `claim_handover` elevation (AC2);
//   · initiateIntake     — relationship-confirm → mint + freeze, idempotently (AC3).
//
// ── Scope-tx discipline (the nominee.handlers.ts template) ─────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but opens NO tx;
// each handler opens its own `openScopeTx`, passes the raw `scopeTx.client` to the projector
// (it issues `SET LOCAL app.claim_state_writer='on'`), and `closeScopeTx(scopeTx, ok)` in
// `finally` (COMMIT only on success). Audit is emitted AFTER the read succeeds and `ok` is
// set, so a rollback never leaves an emitted-but-uncommitted audit line.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// Every audit line is NON-PII: handover lines carry the HMAC-keyed otp correlation tag
// (never the code) + masked nominee mobile (last-4) ONLY; intake lines carry claim_case_id +
// deceased_member_id + intake_channel + relationship ONLY — NEVER any claimant PII.

import { randomUUID } from 'node:crypto';

import type {
  ClaimIntakeInitiateRequest,
  ClaimIntakeInitiateResponse,
  HandoverOtpResponse,
  HandoverOtpVerifyRequest,
  HandoverOtpVerifyResponse,
} from '@twt/contracts';
import { ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { StepUpRequiredError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { hmacOtpAuditCorrelation } from '../auth/shared/otp.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  CLAIM_HANDOVER_ACTION_CONTEXT,
  hasHandoverTrust,
  initiateIntake,
  sendHandoverOtp,
  verifyHandoverOtp,
} from './claims.service.js';

export function createClaimsHandlers(deps: AppDeps) {
  /** Read the authenticated (Ravi-mode) member's (memberId == the deceased, pariwarId) or
   * fail 401. In Ravi-mode the acting session IS the deceased member's (session.ts:1-15). */
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
     * POST /api/v1/member/claims/handover-otp — send the handover-trust OTP to the deceased's
     * primary nominee's declared mobile. Existence-defended: always `{ sent: true }`.
     */
    async requestHandoverOtp(request: FastifyRequest): Promise<HandoverOtpResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const outcome = await sendHandoverOtp(deps, scopeTx, {
          deceasedMemberId: ids.memberId(memberIdStr),
          pariwarId: ids.pariwarId(pariwarIdStr),
        });
        ok = true;
        emitAuthAudit(deps, request, 'member_claim.handover_otp_send', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            deceased_member_id: memberIdStr,
            nominee_mobile_masked: outcome.nomineeMobileMasked || null,
            delivered: outcome.otpHash !== null,
            ...(outcome.otpHash
              ? { otp_audit_tag: hmacOtpAuditCorrelation(outcome.otpHash, deps.config.auditOtpCorrelationKey) }
              : {}),
          },
        });
        return { sent: true, nomineeMobileMasked: outcome.nomineeMobileMasked };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/member/claims/handover-otp/verify — verify the submitted code. A match
     * records the `claim_handover` elevation the intake route requires.
     */
    async verifyHandoverOtp(request: FastifyRequest): Promise<HandoverOtpVerifyResponse> {
      const body = request.body as HandoverOtpVerifyRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      // No scope tx needed — the OTP pool + elevation are GLOBAL carve-out tables (deps.pool).
      const outcome = await verifyHandoverOtp(deps, { deceasedMemberId: ids.memberId(memberIdStr) }, body.code);
      emitAuthAudit(
        deps,
        request,
        outcome.verified ? 'member_claim.handover_otp_consume' : 'member_claim.handover_otp_failure',
        {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            deceased_member_id: memberIdStr,
            ...(outcome.otpHash
              ? { otp_audit_tag: hmacOtpAuditCorrelation(outcome.otpHash, deps.config.auditOtpCorrelationKey) }
              : {}),
          },
        },
      );
      return { verified: outcome.verified };
    },

    /**
     * POST /api/v1/member/claims/intake — relationship-confirm → mint claim_case_id + emit
     * claim.intake_initiated (→ freeze), idempotently. Gated by requireMemberStepUp(
     * 'claim_handover') in the route; a defensive re-check here fails closed if the elevation
     * lapsed between the preHandler and the write (an unverified handover must never freeze).
     */
    async initiateIntake(request: FastifyRequest): Promise<ClaimIntakeInitiateResponse> {
      const body = request.body as ClaimIntakeInitiateRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      // Defense-in-depth: the route preHandler already enforced handover-trust, but re-check
      // at the write boundary — the freeze is irreversible-by-client, so it must never fire
      // on a lapsed elevation.
      if (!(await hasHandoverTrust(deps, memberIdStr))) {
        throw new StepUpRequiredError(CLAIM_HANDOVER_ACTION_CONTEXT);
      }

      const auditId = randomUUID();
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const outcome = await initiateIntake(deps, scopeTx, {
          deceasedMemberId: ids.memberId(memberIdStr),
          pariwarId: ids.pariwarId(pariwarIdStr),
          auditId,
        });
        ok = true;
        emitAuthAudit(
          deps,
          request,
          outcome.created ? 'member_claim.intake_initiated' : 'member_claim.intake_idempotent',
          {
            actorId: memberIdStr,
            pariwarId: pariwarIdStr,
            context: outcome.created
              ? {
                  claim_case_id: outcome.claimCaseId,
                  deceased_member_id: memberIdStr,
                  intake_channel: 'member_app',
                  relationship: body.relationship,
                  audit_id: auditId,
                }
              : {
                  // Dedup hit: the ORIGINAL intake's relationship is what's actually on
                  // record (recorded in that intake's own audit line, not here) — this
                  // retry's relationship was NOT persisted or compared. Log it under a
                  // distinct key so this line never reads as "relationship updated."
                  claim_case_id: outcome.claimCaseId,
                  deceased_member_id: memberIdStr,
                  intake_channel: 'member_app',
                  relationship_submitted: body.relationship,
                  note: 'idempotent_hit_relationship_not_persisted',
                  audit_id: auditId,
                },
          },
        );
        return { claimCaseId: outcome.claimCaseId, state: outcome.state as ClaimIntakeInitiateResponse['state'] };
      } catch (err) {
        // An account-freezing operation must never fail audit-silently.
        emitAuthAudit(deps, request, 'member_claim.intake_failed', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            deceased_member_id: memberIdStr,
            intake_channel: 'member_app',
            audit_id: auditId,
            error: err instanceof Error ? err.name : 'unknown',
          },
        });
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
