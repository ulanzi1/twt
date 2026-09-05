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
  NomineeAccountsResponse,
  NomineeBankAccountView,
  UpiFailureModeSchema,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import {
  decryptNomineeBankField,
  decryptNomineeBankFieldSoft,
  NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
} from '../claims/nominee-bank-crypto.js';
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
      // Story 9.9 (AC5): the donor's EXPLICIT chosen account (no UX-visible `?? 1` "primary" default — both
      // accounts are equal, the client names the choice). Passed through as-is; `resolveNomineeVpa`'s own
      // `preferredAccount = 1` fallback stays PURELY DEFENSIVE (a legacy/single-account caller that names
      // nothing), never a surfaced default.
      const preferredAccount = body.account;

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
     * GET /api/v1/member/contribution/nominee-accounts — the donor-facing nominee payment destinations
     * (Story 9.9; AC1/AC6). Resolves the member's assigned LIVE pool → its originating claim → ALL collected
     * nominee accounts (0, 1, or 2), decrypts each account's Tier-1 holder-name / account# / IFSC at the API
     * boundary (FAIL-SOFT to a distinct sentinel — never a 500, never a blank), and returns them as a STABLE
     * list ordered by `rank` (identity, NOT a priority — both accounts are EQUAL, the donor chooses). Absence
     * (no live pool / no accounts collected) is a first-class `{ available: false, reason }` — never a 404.
     * `bankName` is Tier-3 plaintext (passed through, no decrypt); `vpaPresent` is computed from the presence
     * of the VPA ciphertext WITHOUT decrypting it. The decrypted values are NEVER logged / emitted / audited.
     *
     * ⭐⛔⛔ **UNTOUCHED BY STORY 11b.11, AND SAYING SO IS PART OF THAT STORY.** `2026-09-04-190` cl.1
     * withdrew the banking coordinates from the PUBLIC Sahyog Vivran page; this is the MEMBER donor
     * path and it keeps every value — `accountHolderName`, the FULL `accountNumber`, `ifsc`,
     * `bankName` and `vpaPresent`. ⛔ A member must be able to PAY the family, and a masked account
     * number cannot be transferred to. ⚠⛔ It shares ⛔ NO code path with `pool/sahyog-vivran-read.ts`
     * (it reads `claim/nominee-bank-read.ts` directly) ⇒ ⛔ nothing the public withdrawal deleted was
     * deleted here, and ⛔ no well-meaning sweep may "finish the job" by narrowing this shape.
     * ⚠⛔ **AND THE VPA ITSELF IS ⛔ STILL NEVER SENT.** `NomineeBankAccountView` is `.strict()` and
     * declares `vpaPresent: z.boolean()`; the plaintext is consumed SERVER-SIDE into the UPI intent
     * (the `intent` handler above). ⭐ `2026-09-04-191` cl.1's *"shown to the logged-in member so they
     * can make the contribution"* is ALREADY SATISFIED by that path — its own follow-up records the
     * clause as a **confirmation**, with the build task being ⛔ NOT to regress it. ⛔ Adding `vpa` to
     * this wire would be a NEW Tier-1 exposure ⛔ nobody ruled on.
     *
     * ⚠⛔ **AND ONE ROUTED QUESTION IS ANSWERED HERE RATHER THAN LEFT OPEN.** 11b.3a's third review
     * found the PUBLIC bank block published regardless of the drive's OUTCOME — ⛔ no outcome
     * predicate, the only suppressor being the time-since-close masking verdict — so a DENIED or
     * APPEAL-REVERSED claim still published complete coordinates under FAIL-OPEN. It asked whether
     * this path owes the same predicate.
     * ⭐ **RULED: ⛔ NO PREDICATE IS ADDED, because one is already structurally present.**
     * `resolveMemberLivePool` returns `null` unless the member is `active` AND assigned in a cycle
     * whose alert is `live`. A drive reaches `live` only through a frozen cycle on an APPROVED claim
     * ⇒ a denied claim never reaches this handler at all, and an appeal-reversed one reaches it only
     * because the reversal RESTORED it — which is the direction the reversal was for. ⛔ The public
     * defect was that *"recent"* stood in for *"legitimate"*; here `live` IS the legitimacy gate.
     * ⚠ THE RESIDUAL, RECORDED ⛔ NOT HIDDEN: if an approval is ever reversed WHILE its cycle is
     * still `live`, this handler would keep serving coordinates until the cycle leaves `live`. ⛔ No
     * such path exists today, and inventing a suppression rule for it would be a NEW control ⛔ nobody
     * has ruled. ⇒ named here so it is inherited, ⛔ not rediscovered.
     */
    async nomineeAccounts(request: FastifyRequest): Promise<NomineeAccountsResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const chosen = await resolveMemberLivePool(scopeTx.tx, request, { memberId, pariwarId, now });
        if (chosen === null) {
          ok = true;
          return { available: false, reason: 'unassigned', myContribution: 'none' };
        }

        // The member's OWN yellow-pill state (mirrors intent) — so `/pay` can route an already-attested
        // member (even an out-of-band payer, 8.10) straight to confirmation without a needless account choice.
        const memberTr = poolDomain.deriveContributionReference({ memberId, alertId: chosen.alertId });
        const attested = await contributionDomain.hasAttestedContribution(scopeTx.tx, {
          pariwarId,
          alertId: chosen.alertId,
          tr: memberTr,
        });
        const myContribution = attested ? ('attested' as const) : ('none' as const);

        // The claim's nominee bank accounts (ciphertext AS STORED; tenant-scoped — a cross-tenant claim
        // resolves to []). `[]` ⇒ the first-class "not collected yet" absence, never a throw.
        const ciphertextRows = await claimDomain.getClaimNomineeBankAccountsCiphertext(
          scopeTx.tx,
          pariwarId,
          chosen.pool.claimCaseId,
        );
        if (ciphertextRows.length === 0) {
          ok = true;
          return { available: false, reason: 'accounts_not_collected', myContribution };
        }

        // Decrypt each account's Tier-1 display fields at the API boundary — FAIL-SOFT to a distinct sentinel
        // per field (never a 500, never a blank). `bankName` is Tier-3 (no decrypt); `vpaPresent` reads the
        // ciphertext PRESENCE only (the VPA plaintext is never decrypted here, never sent). Rows already come
        // ordered by account_rank (#1 → #2) — a STABLE list; the position carries no priority.
        //
        // `account_rank` is a smallint(1|2) at the schema level (Story 6.8), but a row outside that domain
        // would otherwise get silently coerced to rank 1 by a `?? 1`-style fallback — risking two accounts
        // both claiming identity `1`. Refuse instead: this is a data-corruption signal, not a donor-facing
        // degrade, so it surfaces as a 500 rather than a fail-soft sentinel.
        const fieldLog = (rank: number, field: string) => (err: unknown) =>
          request.log.error({ err, account_rank: rank, field }, 'nominee-account field decrypt failed — sentinel');
        const accounts: NomineeBankAccountView[] = await Promise.all(
          ciphertextRows.map(async (row): Promise<NomineeBankAccountView> => {
            if (row.accountRank !== 1 && row.accountRank !== 2) {
              throw new Error(`Unexpected nominee bank account_rank: ${String(row.accountRank)}`);
            }
            const [accountHolderName, accountNumber, ifsc] = await Promise.all([
              decryptNomineeBankFieldSoft(
                row.accountHolderNameCiphertext,
                pariwarIdStr,
                deps.encryption,
                fieldLog(row.accountRank, 'accountHolderName'),
              ),
              decryptNomineeBankFieldSoft(
                row.accountNumberCiphertext,
                pariwarIdStr,
                deps.encryption,
                fieldLog(row.accountRank, 'accountNumber'),
              ),
              decryptNomineeBankFieldSoft(
                row.ifscCiphertext,
                pariwarIdStr,
                deps.encryption,
                fieldLog(row.accountRank, 'ifsc'),
              ),
            ]);
            return {
              rank: row.accountRank,
              // `bank_name` is a NOT NULL Tier-3 column, but an empty string is not schema-impossible —
              // degrade it through the same distinct sentinel rather than ship a blank bank label.
              //
              // ⭐⛔ **HARDENED TO `.trim()` AT STORY 11b.11, AND THE REASON IT WAS RE-EXAMINED IS
              // RECORDED HONESTLY.** 11b.3a's third review routed a finding here claiming the member
              // path carried a LIVE 500: `bankName` passed through RAW against
              // `NomineeBankAccountView`'s `z.string().min(1)`, so an `''` from a real RBI-dataset
              // IFSC adapter would fail serialization and 500 the donor's payment screen.
              // ⛔⛔ **CHECKED AT THE CALL SITE AND THE 500 IS ⛔ NOT REACHABLE: THIS GUARD ALREADY
              // EXISTED AND PREDATES THE FINDING** — an `''` never reaches the schema, it becomes the
              // sentinel. ⇒ the finding is recorded as ⛔ NOT CONFIRMED on this path rather than
              // "fixed", because claiming a fix for a defect that was never live would misdescribe
              // both the code and the review.
              // ⚠⭐ **WHAT IS REAL IS THE MILDER RESIDUAL, AND IT IS FIXED HERE:** `.length > 0` lets
              // a WHITESPACE-ONLY `bank_name` through — it satisfies `.min(1)`, so there is no 500,
              // and it renders as a visually BLANK bank label on the screen where the donor picks
              // which account to pay. ⭐ That is the `district` lesson (11a.3) and the same treatment
              // `branch` already gets in `pool/sahyog-vivran-read.ts`. ⇒ trimmed before the test.
              // ⛔ The value is ⛔ not trimmed on the way OUT — only the emptiness test is trimmed —
              // so a bank name with real leading/trailing spacing is still shown as stored.
              bankName:
                row.bankName.trim().length > 0 ? row.bankName : NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
              accountHolderName,
              accountNumber,
              ifsc,
              vpaPresent: row.vpaCiphertext != null,
            };
          }),
        );

        // Audit the READ occurred — the account COUNT only, NEVER the decrypted PII (AC6).
        emitAuthAudit(deps, request, 'member_contribution.nominee_accounts_viewed', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { nominee_accounts: accounts.length },
        });
        ok = true;
        return { available: true, accounts, myContribution };
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
