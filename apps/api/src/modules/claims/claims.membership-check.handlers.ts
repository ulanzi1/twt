// The District Admin's MEMBERSHIP CHECK before any drive — Story 6.39 (Task 3.5; DL2, DL3, DL4, DL8, DL10, DL11;
// AC3, AC4, AC9, AC10).
//
//   · GET  …/admin/claims/:claimCaseId/membership-check — the PREVIEW: the certificate's date of death beside the
//     joining fee's date, the comparison the system made, whether the identity must be judged, the KYC route, the
//     latest posting and the live check — `claim.check_membership`
//   · POST …/admin/claims/:claimCaseId/membership-check — RECORD the check — `claim.check_membership`
//
// `2026-10-31-424` Q1 (a) C: an identity nobody has checked *"is checked first, by staff, from the death documents and
// the details on record, before any drive opens."* `2026-10-31-430` Q1 B: *"staff compare the date of death on the
// certificate with the date the fee was paid, and ⛔ drive opens if the fee was paid after the death."*
//
// ⭐ THE SYSTEM COMPUTES THE COMPARISON (N3). This handler opens the accepted certificate's date (the domain never
// does — the no-comparison fence), reads the joining receipt, and compares the receipt's INDIAN calendar date with it.
// The request carries ⛔ date and ⛔ outcome: a client can neither supply nor override either. The writer re-asserts,
// under the claim-row lock, that the review and the receipt are still the ones compared.
// ⭐ The deceased's name and date of birth are ⛔ opened here — the verifier console's packet already carries them
// (`memberRecord`, audited there). ⛔ A second place that opens them (DL8).
// ⭐ Story 6.39a (DL6) — the BANK DATE: the claim's live bank-date record naming the joining payment (the finance officer's)
// is CONSIDERED, and the fee date is the EARLIER of its date and the recorded one (`chooseFeeDate` — a later bank date never
// counts against a family), fed to the ONE rule. The POST carries the record the staff member saw
// (`expected_fee_bank_date_id`, compared here, then re-asserted by the writer under the lock — `bank_date_changed`); the
// writer also refuses the person who recorded that date (`same_person`).
// ⭐ EVERY refusal is audited `_rejected` with its reason code; the success and the read with ids and outcome codes
// ONLY — ⛔ never either date, ⛔ never the note, ⛔ never a name (N7). Mutations audit AFTER the transaction closes.

import { claim as claimDomain, cycleCalendar, ids, member as memberDomain } from '@twt/domain';
import type {
  MembershipCheckPreviewResponse,
  MembershipCheckRequest,
  MembershipCheckWriteResponse,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptDeathCertificateReviewField } from './death-certificate-crypto.js';
import { encryptMembershipCheckNote } from './membership-check-crypto.js';

/** DL7 — the District Admin's membership-check key (minted in `2026-11-21-472`). Gates BOTH routes. */
export const MEMBERSHIP_CHECK_KEY = 'claim.check_membership';

type Log = FastifyRequest['log'];
type Db = Parameters<typeof claimDomain.getClaimCase>[0];
type RefusalReason = ConstructorParameters<typeof claimDomain.MembershipCheckRefusedError>[1];

function scopeOf(request: FastifyRequest) {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
}

async function resolveDisplay(deps: AppDeps, actorId: string): Promise<string> {
  const display = await getDisplayName(deps.pool, actorId);
  if (display == null || display.trim() === '') throw new AdminDisplayNameMissingError(actorId);
  return display;
}

const locator = (claimCaseId: string) => `claim:${claimCaseId.toLowerCase()}`;

/**
 * The staff words of each route-level refusal (DL10) — plain, for a District Admin. ⛔ Never a date or a name.
 * Exhaustive: a new refusal reason is a compile error here.
 */
const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  not_found: 'Claim not found',
  window_closed: 'A membership check can no longer be recorded on this claim.',
  certificate_not_accepted: 'Accept the death certificate first — the membership check compares its date of death with the joining fee.',
  stale: 'The certificate changed since the membership check was opened — open it again.',
  certificate_date_unreadable: 'The date of death on the accepted certificate cannot be read. Review the certificate again.',
  check_changed: 'The membership check on this claim changed since you opened it — open it again.',
  no_fee_receipt: "The record of the member's joining fee cannot be identified, so the membership check cannot be recorded. Please tell the Super Admin.",
  invalid_outcome: 'The identity answer does not fit this claim. Open the membership check again.',
  missing_display: 'Your account has no display name — the check cannot be recorded.',
  // Story 6.39a (DL11 — `2026-11-27-510`, approved word for word).
  bank_date_changed: "The finance officer recorded the bank's date since you opened this check. It has been reloaded — check again.",
  same_person: "You recorded the bank's date on this claim, so another person must record this check.",
};

/** Map a refusal onto HTTP: `membership_check.<reason>` — 404 `not_found`, 400 `invalid_outcome`, else 409. */
function translate(err: unknown): never {
  if (err instanceof claimDomain.MembershipCheckRefusedError) {
    const code = `membership_check.${err.reason}`;
    const message = REFUSAL_MESSAGES[err.reason];
    if (err.reason === 'not_found') throw new NotFoundError(message, code);
    if (err.reason === 'invalid_outcome') throw new BadRequestError(message, code);
    throw new ConflictError(message, code);
  }
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) {
    throw new ConflictError(
      'The claim changed while the membership check was being recorded — please try again',
      'membership_check.concurrent',
    );
  }
  throw err;
}

/** The bounded reason code a refusal is audited with — ⛔ never a message with data in it. In lockstep with `translate`. */
function auditReason(err: unknown): string {
  if (err instanceof claimDomain.MembershipCheckRefusedError) return err.reason;
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) return 'concurrent';
  return err instanceof Error ? err.name : 'unknown';
}

/** Best-effort audit emit: a failed audit write must ⛔ never turn a committed check into a 500, or mask a refusal. */
function emitAuthAuditBestEffort(
  deps: AppDeps,
  request: FastifyRequest,
  type: Parameters<typeof emitAuthAudit>[2],
  fields?: Parameters<typeof emitAuthAudit>[3],
): void {
  try {
    emitAuthAudit(deps, request, type, fields);
  } catch (err) {
    request.log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'membership-check: audit emit failed');
  }
}

/** The accepted certificate's date of death, as this handler can use it. */
type DeathDate =
  | { readonly state: 'none' }
  | { readonly state: 'readable'; readonly reviewId: string; readonly date: string }
  | { readonly state: 'unreadable' | 'anonymized'; readonly reviewId: string };

export function createMembershipCheckHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /**
   * Open the CURRENT accepted certificate's date of death. `none` while there is no accepted review; `anonymized` for
   * the RTBF sentinel (it DECRYPTS cleanly — it must be named, or it would be compared as a date); `unreadable` for a
   * failed / empty decrypt or a value that is not a real calendar date. ⛔ The date is never logged.
   */
  async function readDeathDate(db: Db, pariwarId: ids.PariwarId, claimCaseId: ids.ClaimId, p: string, log: Log): Promise<DeathDate> {
    const accepted = await claimDomain.getCurrentAcceptedDeathCertificate(db, pariwarId, claimCaseId);
    if (!accepted) return { state: 'none' };
    const reviewId = accepted.reviewId as string;
    let value: string;
    try {
      value = await decryptDeathCertificateReviewField(accepted.acceptedDateCiphertext, p, enc);
    } catch (err) {
      // ⚠ The class name only — ⛔ never the ciphertext or a fragment of a decrypt.
      log.warn({ err: err instanceof Error ? err.name : 'unknown', claimCaseId }, 'membership-check: accepted certificate date unreadable');
      return { state: 'unreadable', reviewId };
    }
    if (value === memberDomain.ANONYMIZED_SENTINEL) return { state: 'anonymized', reviewId };
    if (value === '' || !cycleCalendar.isRealCalendarDate(value)) return { state: 'unreadable', reviewId };
    return { state: 'readable', reviewId, date: value };
  }

  return {
    /**
     * GET — the PREVIEW. Decrypt-after-authorize (the route chain already held `claim.check_membership` at the
     * deceased's district); ONE audit line, ids and outcome codes only.
     */
    async getPreview(request: FastifyRequest): Promise<MembershipCheckPreviewResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const cid = ids.claimId(claimCaseId);
      const p = scopeTx.pariwarId;
      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, cid);
      if (!claimRow) throw new NotFoundError('Claim not found', 'membership_check.not_found');

      const deathDate = await readDeathDate(scopeTx.tx, pariwarId, cid, p, request.log);
      if (deathDate.state === 'unreadable' || deathDate.state === 'anonymized') {
        emitAuthAuditBestEffort(deps, request, 'admin_claim.membership_check_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: {
            claim_case_id: claimCaseId,
            death_certificate_review_id: deathDate.reviewId,
            reason: 'certificate_date_unreadable',
            date_state: deathDate.state,
            on: 'read',
          },
        });
        throw new ConflictError(REFUSAL_MESSAGES.certificate_date_unreadable, 'membership_check.certificate_date_unreadable');
      }

      const receipt = await claimDomain.readJoiningFeeReceipt(scopeTx.tx, pariwarId, claimRow.deceasedMemberId);
      const kyc = await claimDomain.readDeceasedKycStanding(scopeTx.tx, pariwarId, claimRow.deceasedMemberId);
      const live = await claimDomain.getLiveMembershipCheck(scopeTx.tx, pariwarId, cid);
      const gate = await claimDomain.membershipCheckApprovalState(scopeTx.tx, pariwarId, cid, claimRow.deceasedMemberId);
      // Story 6.39a (DL6) — the bank-date record the check would CONSIDER, and the date it would compare.
      const bankDate =
        receipt !== null
          ? claimDomain.considerableFeeBankDate(await claimDomain.getLiveFeeBankDate(scopeTx.tx, pariwarId, cid), receipt.receiptId)
          : null;
      const chosen = receipt !== null ? claimDomain.chooseFeeDate(receipt.paidAt, bankDate) : null;
      const feeOutcome =
        deathDate.state === 'readable' && chosen !== null
          ? claimDomain.compareFeeCalendarDateWithDeathDate(chosen.feeDate, deathDate.date)
          : null;

      // ⭐ Records WHO opened the certificate's date on WHICH claim — ⛔ never the date, ⛔ never the fee's date.
      emitAuthAuditBestEffort(deps, request, 'admin_claim.membership_check_read', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: {
          claim_case_id: claimCaseId,
          death_certificate_review_id: deathDate.state === 'readable' ? deathDate.reviewId : null,
          fee_receipt_found: receipt !== null,
          fee_outcome: feeOutcome,
          live_check_id: live?.checkId ?? null,
        },
      });

      return {
        claim_case_id: claimCaseId,
        window_open: claimDomain.isInMembershipCheckWindow(claimRow.currentState as string),
        expected_live_review_id: deathDate.state === 'readable' ? deathDate.reviewId : null,
        date_of_death: deathDate.state === 'readable' ? deathDate.date : null,
        fee_paid_on: receipt !== null ? claimDomain.feeDateOf(receipt.paidAt) : null,
        fee_date_source: chosen?.source ?? 'recorded',
        fee_bank_date: bankDate
          ? {
              record_id: bankDate.recordId,
              bank_credit_date: bankDate.bankCreditDate,
              reason_code: bankDate.reasonCode,
              recorded_by_display: bankDate.decidedByDisplay,
              recorded_at: bankDate.decidedAt.toISOString(),
            }
          : null,
        fee_receipt_found: receipt !== null,
        fee_outcome: feeOutcome,
        fee_blocks_approval: feeOutcome !== null && claimDomain.MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES.includes(feeOutcome),
        identity_required: claimDomain.isIdentityCheckRequired(kyc),
        kyc_route: claimDomain.membershipCheckKycRoute(kyc),
        // The district the route's permission check resolved — the deceased's latest posting (may be absent).
        latest_posting_district: request.nomineeNameCheckDistrict ?? null,
        live_check: live
          ? {
              check_id: live.checkId,
              fee_outcome: live.feeOutcome,
              identity_required: live.identityRequired,
              identity_outcome: live.identityOutcome,
              identity_reason: live.identityReason,
              has_note: live.hasNote,
              decided_by_display: live.decidedByDisplay,
              decided_at: live.decidedAt.toISOString(),
            }
          : null,
        gate: gate.passed ? { passed: true, reason: null } : { passed: false, reason: gate.reason },
      };
    },

    /**
     * POST — RECORD the check. The order of refusals is ONE order, the writer's: the shape → the claim → the window →
     * the accepted certificate → its currency (the review the staff member saw) → its date → the joining receipt →
     * (under the claim-row lock, in the writer) all of those again, then the identity half.
     */
    async postCheck(request: FastifyRequest, reply: FastifyReply): Promise<MembershipCheckWriteResponse> {
      const { scopeTx: outer, actorId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as MembershipCheckRequest;
      const p = outer.pariwarId;
      const pariwarId = ids.pariwarId(p);
      const cid = ids.claimId(claimCaseId);
      const refuse = (reason: RefusalReason, detail: string) => new claimDomain.MembershipCheckRefusedError(claimCaseId, reason, detail);

      let result: Awaited<ReturnType<typeof claimDomain.recordMembershipCheck>> | undefined;
      let failure: unknown;
      try {
        const actorDisplay = await resolveDisplay(deps, actorId);
        // An empty (whitespace-only) note is NO note — the contract trims it. A `not_confirmed` check then meets the
        // writer's own `invalid_outcome` rather than recording an empty note as if it were one.
        const notePlain = body.note !== undefined && body.note !== '' ? body.note : null;
        const identityReason = body.identity_reason ?? null;
        // The SHAPE first — before anything is read or opened (the writer's step 0, the same function).
        claimDomain.assertMembershipCheckShape({
          claimCaseId: cid,
          actorDisplay,
          identityOutcome: body.identity_outcome,
          identityReason,
          // Not yet encrypted: the shape check only asks whether a note is present.
          noteCiphertext: notePlain,
        });
        const noteCt = notePlain !== null ? await encryptMembershipCheckNote(notePlain, p, enc) : null;

        const scopeTx = await openScopeTx(deps, p);
        let ok = false;
        try {
          const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, cid);
          if (!claimRow) throw refuse('not_found', 'no such claim in this Pariwar');
          if (!claimDomain.isInMembershipCheckWindow(claimRow.currentState as string)) {
            throw refuse('window_closed', `the claim is '${claimRow.currentState as string}'`);
          }
          const deathDate = await readDeathDate(scopeTx.tx, pariwarId, cid, p, request.log);
          if (deathDate.state === 'none') {
            throw refuse('certificate_not_accepted', 'the claim has no current accepted death certificate');
          }
          // The review the staff member saw must still be the current accepted one (N4) — a currency token,
          // ⛔ a credential: plain `===` on lower-cased ids.
          if (deathDate.reviewId.toLowerCase() !== body.expected_live_review_id.toLowerCase()) {
            throw refuse('stale', 'the death certificate was reviewed again after the check was opened');
          }
          if (deathDate.state !== 'readable') {
            throw refuse('certificate_date_unreadable', `the accepted date is ${deathDate.state}`);
          }
          const receipt = await claimDomain.readJoiningFeeReceipt(scopeTx.tx, pariwarId, claimRow.deceasedMemberId);
          if (receipt === null) throw refuse('no_fee_receipt', "the member's joining receipt cannot be identified");

          // ⭐ Story 6.39a (DL6) — the bank-date record considered: still the one the staff member saw (a currency token).
          const bankDate = claimDomain.considerableFeeBankDate(
            await claimDomain.getLiveFeeBankDate(scopeTx.tx, pariwarId, cid),
            receipt.receiptId,
          );
          const seenBank = body.expected_fee_bank_date_id === null ? null : body.expected_fee_bank_date_id.toLowerCase();
          if ((bankDate === null ? null : (bankDate.recordId as string).toLowerCase()) !== seenBank) {
            throw refuse('bank_date_changed', 'the bank date on this claim changed after the check was opened');
          }

          // ⭐ N3 — the comparison, computed HERE from the stored facts: the EARLIER of the recorded date and the bank's
          // (DL6), by the ONE rule (DL2). ⛔ Nothing from the request.
          const { feeDate } = claimDomain.chooseFeeDate(receipt.paidAt, bankDate);
          const feeOutcome = claimDomain.compareFeeCalendarDateWithDeathDate(feeDate, deathDate.date);

          result = await claimDomain.recordMembershipCheck(scopeTx.client, {
            claimCaseId: cid,
            pariwarId,
            computedAgainstReviewId: deathDate.reviewId,
            feeReceiptId: receipt.receiptId,
            expectedLiveCheckId: body.expected_live_check_id,
            computedAgainstFeeBankDateId: bankDate?.recordId ?? null,
            feeOutcome,
            identityOutcome: body.identity_outcome,
            identityReason,
            noteCiphertext: noteCt,
            actorId,
            actorDisplay,
            actor: 'operator',
          });
          ok = true;
        } finally {
          await closeScopeTx(scopeTx, ok);
        }
      } catch (err) {
        failure = err;
      }

      if (failure !== undefined || result === undefined) {
        emitAuthAuditBestEffort(deps, request, 'admin_claim.membership_check_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: {
            claim_case_id: claimCaseId,
            // ⚠ Client-echoed, ⛔ NOT domain-confirmed (nothing was recorded) — ⛔ never
            // `death_certificate_review_id`, the name the success line reserves for the confirmed value.
            expected_live_review_id: body.expected_live_review_id.toLowerCase(),
            // ⚠ Client-echoed too: the live check the staff member SAW (`null` = none) — with the live row's own history,
            // it shows which check a `check_changed` refusal had not seen (code review 2026-11-21, family 8).
            expected_live_check_id: body.expected_live_check_id === null ? null : body.expected_live_check_id.toLowerCase(),
            identity_outcome: body.identity_outcome,
            reason: auditReason(failure),
            on: 'write',
          },
        });
        return translate(failure);
      }
      // The write COMMITTED — audited as recorded BEFORE anything else can fail. ⛔ No date, ⛔ no note.
      emitAuthAuditBestEffort(deps, request, 'admin_claim.membership_checked', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: {
          claim_case_id: claimCaseId,
          check_id: result.checkId,
          death_certificate_review_id: result.deathCertificateReviewId,
          fee_receipt_id: result.feeReceiptId,
          fee_outcome: result.feeOutcome,
          // Story 6.39a (DL12) — which date the outcome came from (a code).
          fee_date_source: result.feeDateSource,
          identity_required: result.identityRequired,
          identity_outcome: result.identityOutcome,
          identity_reason: result.identityReason,
          superseded_check_id: result.supersededCheckId,
        },
      });
      void reply.status(201);
      return {
        claim_case_id: claimCaseId,
        check_id: result.checkId,
        death_certificate_review_id: result.deathCertificateReviewId,
        fee_outcome: result.feeOutcome,
        identity_required: result.identityRequired,
        identity_outcome: result.identityOutcome,
        identity_reason: result.identityReason,
        superseded_check_id: result.supersededCheckId,
        event_version: result.eventVersion,
      };
    },
  };
}
