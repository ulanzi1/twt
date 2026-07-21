// Epic-8 pool-contribution UPI Intent + UTR self-attestation handlers — Story 8.4 (Task 3; AC1/AC2/AC3/AC5).
//
// The FIRST Epic-8 WRITE path. TWO routes:
//   · intent  — build a SERVER-authoritative `upi://pay` URL for the member's assigned live pool: resolve
//               the pool (the shared `resolveMemberLivePool` read seam) → resolve the nominee VPA
//               (server-side) → amount-lock to the pool's snapshotted `fixed_amount` → the DETERMINISTIC
//               `tr`. Returns the intent OR the first-class `{ available: false, reason }` fail-soft. The
//               client names NOTHING about the payment (payee/amount/tr) — R4.
//   · attest  — record the member's self-attested UTR as the yellow pill: re-resolve the pool
//               (server-authoritative), RECOMPUTE `tr` from (memberId, alertId) + compare (never trust a
//               client `tr` — R4), then append the idempotent `contribution.utr-attested` event. Records a
//               member CLAIM only — NEVER flips green (Epic 9's exclusive reconciliation).
//
// ── Module placement (D6, SETTLED) ──────────────────────────────────────────────────────────────────
// This lives in `modules/payment/` — the architecture's confirmed reserved module for "UPI Intent dispatch
// … Epic 8's contribution (member→nominee) surface" (architecture.md:4523,4599,4679; the fee flow
// deliberately stayed OUT of it). It REUSES the `member-pool/` READ seam (`resolveMemberLivePool`) — it does
// NOT re-implement pool resolution and does NOT put a write in the read-only module.
//
// ── The nominee-VPA gap (D1) ────────────────────────────────────────────────────────────────────────
// There is NO VPA in the substrate today (BigDev SETTLED path (b) — defer VPA collection to a dedicated
// story). So the intent path resolves to `{ available: false, reason: 'vpa_not_collected' }` as the
// EXPECTED shipped v1 state — the calm "not available yet — Get help" surface, never a `pa=undefined` URL.
// The ATTESTATION half is fully live (an out-of-band payer can still attest — 8.10). Everything is WIRED so
// the intent lights up with zero changes here once the VPA-collection substrate lands.

import {
  claim as claimDomain,
  contribution as contributionDomain,
  ids,
  pool as poolDomain,
} from '@twt/domain';
import type {
  ContributionAttestRequest,
  ContributionAttestResponse,
  ContributionIntentRequest,
  ContributionIntentResponse,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { resolveMemberLivePool } from '../member-pool/handlers.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** Mask a UTR for audit/logging — last 4 only (never the full self-attested ref; the vyawastha precedent). */
function maskUtr(utr: string): string {
  return utr.length <= 4 ? '****' : `****${utr.slice(-4)}`;
}

/** Build the FR-27 `tn` note grammar — the pool shortform + the canonical cycle reference (Latin, non-PII). */
function buildContributionNote(letterCode: string, canonicalIdentifier: string): string {
  return `Pool ${letterCode} — Sahyog ${canonicalIdentifier}`;
}

export function createPaymentHandlers(deps: AppDeps) {
  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
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
     * POST /api/v1/member/contribution/intent — build the server-authoritative UPI Intent, or return the
     * first-class `{ available: false, reason }` fail-soft (AC1/AC2/AC5). Never a 500 for an expected state.
     */
    async intent(request: FastifyRequest): Promise<ContributionIntentResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const body = (request.body ?? {}) as ContributionIntentRequest;
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();
      const preferredAccount = body.account ?? 1;

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // (1) The shared assigned-live-pool resolution (member active × live cycle × assigned pool).
        const chosen = await resolveMemberLivePool(scopeTx.tx, request, { memberId, pariwarId, now });
        if (chosen === null) {
          emitAuthAudit(deps, request, 'member_contribution.intent', {
            actorId: memberIdStr,
            pariwarId: pariwarIdStr,
            context: { available: false, reason: 'unassigned' },
          });
          ok = true;
          // No live pool → no alert to have attested against (review finding: the member's own
          // attestation state is member+alert scoped, not a global flag).
          return { available: false, reason: 'unassigned', myContribution: 'none' };
        }

        // The member's OWN yellow-pill state (AC4) — carried on EVERY branch below (review finding: a
        // member who already attested — even out-of-band, 8.10 — must not be re-shown the full pay flow
        // just because the VPA resolution happens to fail).
        const memberTr = poolDomain.deriveContributionReference({ memberId, alertId: chosen.alertId });
        const attested = await contributionDomain.hasAttestedContribution(scopeTx.tx, {
          pariwarId,
          alertId: chosen.alertId,
          tr: memberTr,
        });
        const myContribution = attested ? ('attested' as const) : ('none' as const);

        // (2) The nominee bank accounts for the pool's claim → the VPA resolver (server-side). Absence is a
        //     first-class state today (D1): no VPA column exists → { available:false, reason:'vpa_not_collected' }.
        const collectionAccounts = await claimDomain.getClaimNomineeBankAccountsCiphertext(
          scopeTx.tx,
          pariwarId,
          chosen.pool.claimCaseId,
        );
        const vpaResolution = contributionDomain.resolveNomineeVpa({ collectionAccounts, preferredAccount });
        if (!vpaResolution.available) {
          emitAuthAudit(deps, request, 'member_contribution.intent', {
            actorId: memberIdStr,
            pariwarId: pariwarIdStr,
            context: { available: false, reason: vpaResolution.reason },
          });
          ok = true;
          return { available: false, reason: vpaResolution.reason, myContribution };
        }

        // (3) The DETERMINISTIC tr + the amount-lock + the tn grammar → the server-authoritative URL.
        const tr = memberTr;
        const amountInr = chosen.pool.fixedAmount;
        const letterCode = poolDomain.poolLetterCode(chosen.pool.poolIndex);
        const tn = buildContributionNote(letterCode, chosen.pool.poolCanonicalIdentifier);
        const upiUrl = contributionDomain.buildContributionUpiUrl({
          vpa: vpaResolution.vpa,
          amountInr,
          tr,
          tn,
        });

        emitAuthAudit(deps, request, 'member_contribution.intent', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { available: true, amount_inr: amountInr, account: vpaResolution.account },
        });
        ok = true;
        return {
          available: true,
          upiUrl,
          tr,
          amountInr,
          vpa: vpaResolution.vpa,
          account: vpaResolution.account,
          myContribution,
        };
      } catch (err) {
        // Fail-soft for expected shapes is handled inline above; an unexpected error still audits + rethrows
        // (mapped to a 500 by the error middleware — a real defect, not an expected state).
        emitAuthAudit(deps, request, 'member_contribution.failure', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            phase: 'intent',
            // Mirror attest()'s labeling (review finding: the two catch blocks were asymmetric).
            reason: err instanceof ConflictError || err instanceof BadRequestError ? err.code : 'error',
          },
        });
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/member/contribution/attest — record the member's self-attested UTR (the yellow pill,
     * AC3/AC4). Server-authoritative: re-resolves the pool + RECOMPUTES `tr` (never trusts the client's —
     * R4). Idempotent on `tr`. Typed errors for expected states (unassigned / tr-mismatch) — never a 500.
     */
    async attest(request: FastifyRequest): Promise<ContributionAttestResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      // The same null-fallback `intent()` uses (review finding): a missing/empty body must surface as the
      // typed 400 below (bad UTR/tr shape), never an unguarded TypeError → raw 500.
      const body = (request.body ?? {}) as ContributionAttestRequest;
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // (1) Re-resolve the assigned live pool (server-authoritative — never trust a client-supplied pool).
        const chosen = await resolveMemberLivePool(scopeTx.tx, request, { memberId, pariwarId, now });
        if (chosen === null) {
          throw new ConflictError(
            'You are not assigned to a live pool right now',
            'contribution.unassigned',
          );
        }

        // (2) RECOMPUTE tr server-side from (memberId, alertId) and compare (R4 — never trust the client's
        //     tr blindly). A mismatch is an anomaly (stale/tampered client) → reject, don't write.
        const serverTr = poolDomain.deriveContributionReference({ memberId, alertId: chosen.alertId });
        if (body.tr !== serverTr) {
          throw new BadRequestError(
            'The payment reference does not match your assigned pool',
            'contribution.tr_mismatch',
          );
        }

        // (3) Append the idempotent yellow claim on the alert stream. Uses the raw scope-tx client (the
        //     projectMemberState precedent). The persisted payload carries the RAW utr (Epic 9 primary-matches
        //     it); the audit line masks it (last-4).
        const result = await contributionDomain.attestContributionUtr(scopeTx.client, {
          pariwarId,
          alertId: chosen.alertId,
          poolId: chosen.pool.poolId,
          memberId,
          tr: serverTr,
          utr: body.utr,
          actorId: memberIdStr,
        });

        emitAuthAudit(deps, request, 'member_contribution.attested', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            masked_utr: maskUtr(body.utr),
            idempotent: result.idempotent,
            // A same-tenant anomaly SIGNAL only (review finding, resolved non-blocking) — a DIFFERENT
            // member already self-attested this exact UTR. Never rejected, never reconciled here; Epic 9's
            // matcher owns real verification. Recorded so the pattern is visible in the audit trail.
            duplicate_utr_across_members: result.duplicateUtrAcrossMembers,
          },
        });
        ok = true;
        return { myContribution: 'attested', tr: serverTr, idempotent: result.idempotent };
      } catch (err) {
        emitAuthAudit(deps, request, 'member_contribution.failure', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            phase: 'attest',
            reason:
              err instanceof ConflictError || err instanceof BadRequestError ? err.code : 'error',
          },
        });
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
