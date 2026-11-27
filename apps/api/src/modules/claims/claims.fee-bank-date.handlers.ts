// The finance officer's BANK DATE for a joining fee recorded after the death — Story 6.39a (Task 3.5; DL3, DL5, DL8, DL9,
// DL10, DL12; AC3, AC4, AC9).
//
//   · GET  …/admin/fee-bank-dates                         — the two-section list (pariwar dimension) — `claim.record_fee_bank_date`
//   · POST …/admin/claims/:claimCaseId/fee-bank-date      — RECORD the bank date (district dimension + a FRESH step-up)
//
// `2026-11-21-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived before
// the death; they record that they did, with a reason, and it is audited."* Built `2026-11-27-510`; ruled `2026-11-27-511`.
//
// ⭐ ⛔ DECRYPT ANYWHERE ON THIS PATH (TR3, the 6.39a fence `it` block): the finance officer sees ⛔ name and ⛔ date of
// death (N2), and the handler only ENCRYPTS the note. ⭐ The typed statement reference is compared by the domain writer in
// TypeScript and then dropped: it is ⛔ logged, ⛔ audited, ⛔ echoed (N3, N6, TR5). ⭐ EVERY refusal the handler raises is
// audited `_rejected` with its code; the success with ids and the reason code ONLY. Mutations audit AFTER the transaction
// closes. ⛔ Read audit for the list (⛔ Tier-1 on it — DL12).

import { claim as claimDomain, ids, member as memberDomain } from '@twt/domain';
import type {
  FeeBankDateListQuery,
  FeeBankDateListResponse,
  FeeBankDateListRow,
  FeeBankDateRequest,
  FeeBankDateWriteResponse,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { encryptFeeBankDateNote } from './fee-bank-date-crypto.js';

/** DL8 — the finance officer's key (minted in `2026-11-27-510`). Gates BOTH routes. */
export const FEE_BANK_DATE_KEY = 'claim.record_fee_bank_date';

type RefusalReason = claimDomain.FeeBankDateRefusalReason;

function scopeOf(request: FastifyRequest) {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
}

const locator = (claimCaseId: string) => `claim:${claimCaseId.toLowerCase()}`;

/**
 * The staff words of each route-level refusal — `2026-11-27-510` DL11, APPROVED word for word. ⛔ Never a date, a reference
 * or a name. Exhaustive: a new refusal reason is a compile error here.
 */
const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  not_found: 'This claim could not be found. Reload the page.',
  window_closed: 'A bank date can no longer be recorded on this claim.',
  not_held: 'This claim is not held on its joining fee.',
  no_fee_receipt:
    "The record of the member's joining fee cannot be identified, so a bank date cannot be recorded. Please tell the Super Admin.",
  reference_mismatch:
    'This reference does not match the payment recorded for the member. Check that you have the right line on the statement.',
  in_future: 'That date is in the future.',
  before_joining: 'That date is before the member joined. Check the date on the statement.',
  invalid_reason: 'Something in the form is not right. Check each field and try again.',
  stale: 'This claim changed since you opened it. It has been reloaded — check again.',
  missing_display: 'Your account has no display name, so a bank date cannot be attributed to you. Ask a Super Admin to set it.',
};

/** Map a refusal onto HTTP: `fee_bank_date.<reason>` — 404 `not_found`, 400 `invalid_reason`, else 409. */
function translate(err: unknown): never {
  if (err instanceof claimDomain.FeeBankDateRefusedError) {
    const code = `fee_bank_date.${err.reason}`;
    const message = REFUSAL_MESSAGES[err.reason];
    if (err.reason === 'not_found') throw new NotFoundError(message, code);
    if (err.reason === 'invalid_reason') throw new BadRequestError(message, code);
    throw new ConflictError(message, code);
  }
  // The display-name refusal is the SAME approved line, under this route's code.
  if (err instanceof AdminDisplayNameMissingError) {
    throw new ConflictError(REFUSAL_MESSAGES.missing_display, 'fee_bank_date.missing_display');
  }
  // The claim stream moved under the write — the claim changed: the `stale` line (reload and look again).
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) {
    throw new ConflictError(REFUSAL_MESSAGES.stale, 'fee_bank_date.stale');
  }
  throw err;
}

/** The bounded reason code a refusal is audited with — ⛔ never a message with data in it. In lockstep with `translate`. */
function auditReason(err: unknown): string {
  if (err instanceof claimDomain.FeeBankDateRefusedError) return err.reason;
  if (err instanceof AdminDisplayNameMissingError) return 'missing_display';
  // DL12: the audit carries the refusal's CODE — a stream race answers `fee_bank_date.stale` (code review 2026-11-27).
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) return 'stale';
  return err instanceof Error ? err.name : 'unknown';
}

/** Best-effort audit emit: a failed audit write must ⛔ never turn a committed record into a 500, or mask a refusal. */
function emitAuthAuditBestEffort(
  deps: AppDeps,
  request: FastifyRequest,
  type: Parameters<typeof emitAuthAudit>[2],
  fields?: Parameters<typeof emitAuthAudit>[3],
): void {
  try {
    emitAuthAudit(deps, request, type, fields);
  } catch (err) {
    request.log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'fee-bank-date: audit emit failed');
  }
}

export function createFeeBankDateHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  return {
    /**
     * GET — the finance officer's list (DL10): two sections, each capped on its own. ⛔ Name, ⛔ date of death, ⛔ the check's
     * fee outcome. The posting district per row through the ONE geo reader the per-claim route's gate uses.
     */
    async getList(request: FastifyRequest): Promise<FeeBankDateListResponse> {
      const { scopeTx, pariwarId } = scopeOf(request);
      const query = (request.query ?? {}) as FeeBankDateListQuery;
      const list = await claimDomain.listClaimsHeldOnFee(scopeTx.tx, pariwarId, query.limit !== undefined ? { limit: query.limit } : {});
      const toWire = async (row: claimDomain.FeeBankDateListRow): Promise<FeeBankDateListRow> => {
        const posting = await memberDomain.getMemberPostingLatest(scopeTx.tx, pariwarId, row.deceasedMemberId);
        return {
          claim_case_id: row.claimCaseId,
          latest_posting_district: posting?.district ?? null,
          recorded_fee_date: row.recordedFeeDate,
          amount_inr: row.amountInr,
          reference_last4: row.referenceLast4,
          fee_date_source: row.feeDateSource,
          expected_live_check_id: row.liveCheckId,
          expected_live_record_id: row.liveRecord?.recordId ?? null,
          live_record: row.liveRecord
            ? {
                record_id: row.liveRecord.recordId,
                bank_credit_date: row.liveRecord.bankCreditDate,
                reason_code: row.liveRecord.reasonCode,
                recorded_by_display: row.liveRecord.decidedByDisplay,
                recorded_at: row.liveRecord.decidedAt.toISOString(),
              }
            : null,
        };
      };
      const held: FeeBankDateListRow[] = [];
      for (const row of list.held) held.push(await toWire(row));
      const recorded: FeeBankDateListRow[] = [];
      for (const row of list.recorded) recorded.push(await toWire(row));
      return { held, recorded, held_truncated: list.heldTruncated, recorded_truncated: list.recordedTruncated };
    },

    /**
     * POST — RECORD the bank date. The order of refusals is the writer's (shape → lock → window → held → payment →
     * reference → bounds → tokens); the handler adds only the display name (first) and the note's encryption.
     */
    async postBankDate(request: FastifyRequest, reply: FastifyReply): Promise<FeeBankDateWriteResponse> {
      const { scopeTx: outer, actorId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as FeeBankDateRequest;
      const p = outer.pariwarId;
      const pariwarId = ids.pariwarId(p);
      const cid = ids.claimId(claimCaseId);

      let result: claimDomain.RecordFeeBankDateResult | undefined;
      let failure: unknown;
      try {
        const display = await getDisplayName(deps.pool, actorId);
        if (display == null || display.trim() === '') throw new AdminDisplayNameMissingError(actorId);
        const noteCt = await encryptFeeBankDateNote(body.note, p, enc);
        const scopeTx = await openScopeTx(deps, p);
        let ok = false;
        try {
          result = await claimDomain.recordFeeBankDate(scopeTx.client, {
            claimCaseId: cid,
            pariwarId,
            statementReference: body.statement_reference,
            bankCreditDate: body.bank_credit_date,
            reasonCode: body.reason_code,
            noteCiphertext: noteCt,
            expectedLiveCheckId: body.expected_live_check_id,
            expectedLiveRecordId: body.expected_live_record_id,
            actorId,
            actorDisplay: display,
            actor: 'operator',
            now: deps.clock(),
          });
          ok = true;
        } finally {
          await closeScopeTx(scopeTx, ok);
        }
      } catch (err) {
        failure = err;
      }

      if (failure !== undefined || result === undefined) {
        emitAuthAuditBestEffort(deps, request, 'admin_claim.fee_bank_date_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: {
            claim_case_id: claimCaseId,
            // ⚠ Client-echoed, ⛔ domain-confirmed: the live check and record the finance officer SAW (`null` = none).
            expected_live_check_id: body.expected_live_check_id === null ? null : body.expected_live_check_id.toLowerCase(),
            expected_live_record_id: body.expected_live_record_id === null ? null : body.expected_live_record_id.toLowerCase(),
            reason_code: body.reason_code,
            reason: auditReason(failure),
            on: 'write',
          },
        });
        return translate(failure);
      }
      // The write COMMITTED — audited as recorded BEFORE anything else can fail. ⛔ No date, ⛔ no reference, ⛔ no note.
      emitAuthAuditBestEffort(deps, request, 'admin_claim.fee_bank_date_recorded', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: {
          claim_case_id: claimCaseId,
          record_id: result.recordId,
          fee_receipt_id: result.feeReceiptId,
          reason_code: result.reasonCode,
          superseded_record_id: result.supersededRecordId,
        },
      });
      void reply.status(201);
      return {
        claim_case_id: claimCaseId,
        record_id: result.recordId,
        superseded_record_id: result.supersededRecordId,
        event_version: result.eventVersion,
      };
    },
  };
}
