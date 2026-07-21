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
  ContributionFailureReportRequest,
  ContributionIntentRequest,
  ContributionIntentResponse,
  UpiFailureModeSchema,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { decryptNomineeBankField } from '../claims/nominee-bank-crypto.js';
import { resolveMemberLivePool } from '../member-pool/handlers.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/**
 * The member's SELF-CLASSIFIED UPI failure `mode` → its audit action name (Story 8.5, D2/AC3). The
 * diagnostic signal lives ENTIRELY in the action name — mode only, no free-text, no UTR/tr/amount/VPA — so
 * analytics can count failures by action without ever storing PII. Exhaustive over `UpiFailureModeSchema`
 * (a `satisfies Record<…>` so a future mode added to the enum without a mapping fails to compile).
 */
const FAILURE_ACTION_BY_MODE = {
  insufficient_balance: 'member_contribution.failure_insufficient_balance',
  wrong_pin: 'member_contribution.failure_wrong_pin',
  app_issue: 'member_contribution.failure_app_issue',
  network_issue: 'member_contribution.failure_network_issue',
  other: 'member_contribution.failure_other',
} as const satisfies Record<UpiFailureModeSchema, AuthAuditEventType>;

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

        // (2) The nominee bank accounts for the pool's claim → the VPA resolver (server-side). Story 8.13
        //     lights this seam up: each account's OPTIONAL `vpa_ciphertext` is DECRYPTED here at the API
        //     boundary (the domain never decrypts — KMS is app-layer) and fed to `resolveNomineeVpa` as a
        //     plaintext `vpa`. Passing the raw ciphertext rows would make the resolver read `undefined` →
        //     always `vpa_not_collected` → the feature silently never lights up (the load-bearing wiring).
        //     ⚠ PERF GUARDRAIL: `decryptTier1` is a real KMS round-trip per ciphertext; both accounts are
        //     decrypted (canSwitchAccount inspects the non-preferred one) in PARALLEL to protect the
        //     endpoint's <1s p95 UPI-intent-launch budget (Story 8.12's SM-1 demo measures this path).
        //     A decrypt failure (KMS hiccup / corrupt ciphertext) on either account degrades that ONE
        //     account to fail-soft `vpa: null` (never a 500) — the appeal-crypto precedent
        //     (`claims.appeal.handlers.ts`) for a Tier-1 decrypt on a fail-soft read path.
        const ciphertextRows = await claimDomain.getClaimNomineeBankAccountsCiphertext(
          scopeTx.tx,
          pariwarId,
          chosen.pool.claimCaseId,
        );
        const collectionAccounts = await Promise.all(
          ciphertextRows.map(async (row) => {
            const vpaCiphertext = row.vpaCiphertext ?? null;
            // The ciphertext is zeroed out to `null` once decrypted (or if there was none) — the augmented
            // row never carries BOTH the plaintext `vpa` and its own still-live ciphertext at once, limiting
            // this Tier-1 field's in-memory exposure window (review finding).
            if (vpaCiphertext === null) {
              return { ...row, vpaCiphertext: null, vpa: null };
            }
            try {
              const vpa = await decryptNomineeBankField(vpaCiphertext, pariwarIdStr, deps.encryption);
              return { ...row, vpaCiphertext: null, vpa };
            } catch (err) {
              request.log.error(
                { err, account_rank: row.accountRank },
                'nominee VPA decrypt failed — degrading to vpa_not_collected',
              );
              return { ...row, vpaCiphertext: null, vpa: null };
            }
          }),
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

        // FR-27 "Switch account" (AC3): the affordance is offered only when the OTHER account also
        // resolves a VPA (≥2 accounts carry one). A missing other account resolves to
        // account_not_found/vpa_not_collected → canSwitchAccount:false (never a silent substitution).
        const otherAccount = vpaResolution.account === 1 ? (2 as const) : (1 as const);
        const canSwitchAccount = contributionDomain.resolveNomineeVpa({
          collectionAccounts,
          preferredAccount: otherAccount,
        }).available;

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
          canSwitchAccount,
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

    /**
     * POST /api/v1/member/contribution/failure — record the member's SELF-CLASSIFIED UPI failure mode as a
     * best-effort, member-level audit line for analytics tuning (Story 8.5; AC3). "Anonymous" refers to the
     * failure DETAIL, not the audit subject: `actorId = memberId` (platform audit convention) but the mode is
     * carried ENTIRELY in the action name (`member_contribution.failure_<mode>`) — NO context payload, NO
     * free-text, NO UTR/tr/amount/VPA (D2). Diagnostic only — it appends NO `contribution.utr-attested`
     * event, touches no state machine, opens no scope-tx (there is no DB write — the single audit line goes
     * through the shared sink). Returns 204 (fire-and-forget — the pool-onboarding 204 shape). Never blocks
     * the coach: the client fires it fire-and-forget, so a failure here never strands the member's retry/attest.
     */
    async reportFailure(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { mode } = request.body as ContributionFailureReportRequest;

      // The mode lives in the action name — nothing further to carry, no context payload, no hash required.
      emitAuthAudit(deps, request, FAILURE_ACTION_BY_MODE[mode], {
        actorId: memberIdStr,
        pariwarId: pariwarIdStr,
      });

      void reply.status(204).send();
    },
  };
}
