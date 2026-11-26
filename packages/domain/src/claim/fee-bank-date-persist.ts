// The finance officer's BANK-DATE writer — Story 6.39a (Task 3.2; DL3, DL4, DL5; N2, N3, N6; AC3, AC4). Transport-free.
//
// `2026-11-21-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived before
// the death; they record that they did, with a reason, and it is audited."* Built `2026-11-27-510`; the edges ruled
// `2026-11-27-511` (Q1 B, Q2 A, Q3 A, Q4 A).
// This writer RECORDS a fact — WHEN the money arrived — and ⛔ never WHETHER the claim may go ahead (N2): the District
// Admin's next membership check compares the dates (DL6), and until then the gate waits on `bank_date_recorded` (N4).
// It ⛔ never denies, approves or closes a claim (N5).
//
// ── The order (DL5) ──────────────────────────────────────────────────────────────────────────────────────────────
//   (0) the SHAPE — display (`missing_display`); a known reason, a real calendar date, a non-blank note (`invalid_reason`
//       — the contract refuses each first; this is the defence): refused before any read;
//   (1) the claim-row `FOR UPDATE` lock — the ONE lock the membership check and the certificate review take, so a bank
//       date, a check and an approval of one claim are serialized;
//   (2) the WINDOW — the membership check's own (`CLAIM_REVIEW_WINDOW_STATES`): a `denied` claim is refused; an appeal's
//       reversal puts it back (`reversed` — PQ1 B as ruled); corrections stop at `state_trustee_approved` (DL5);
//   (3) HELD — the live check's fee outcome blocks, OR a live record exists (so a wrong date can be corrected either way)
//       — else `not_held`; ⛔ live check ⇒ `not_held` (DL5's only path: the District Admin records the check FIRST);
//   (4) the JOINING payment — re-read under the lock (DL4), and it must be the one the live check names — else `stale`;
//   (5) the REFERENCE (N3, PQ2 A) — the typed statement reference must BE the joining payment's stored `utr`: both
//       trimmed, digits exactly, letters without regard to case (DL3). ⭐ Compared HERE, in TypeScript, on the `utr` read
//       under the lock — the typed value is ⛔ a query parameter anywhere (TR5: a failed query's message carries its
//       parameters into the 500 log);
//   (6) the BOUNDS (G10) — ⛔ after IST today (`in_future`), ⛔ before the member's IST joining date (`before_joining`);
//   (7) the TOKENS — the live check and the live record are still the ones the finance officer saw — else `stale`;
//   (8) supersede the live record (`re_recorded`), insert the new one, emit `claim.fee_bank_date_recorded` — ONE
//       transaction. A DB error on either write is re-thrown PARAMETER-FREE (ids and the SQLSTATE only — TR5), so ⛔ the
//       bank date or the note ciphertext reaches a log.
//
// ⛔ PII (N6): the note arrives ALREADY ENCRYPTED; ⛔ ciphertext is opened here (the 6.39a fence `it` block); the typed
// reference, the bank date and the note appear in ⛔ refusal message, event or return value.

import { and, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { type CalendarDateString, isRealCalendarDate, istDateOf } from '../cycle-calendar/holiday-resolver.js';
import { bindScopedDb } from '../db.js';
import type { ClaimFeeBankDateId, ClaimId, PariwarId, VyawasthaShulkReceiptId } from '../ids/index.js';
import { type FeeBankDateReasonCode, FEE_BANK_DATE_REASON_CODES, claimFeeBankDates } from '../schema/claim_fee_bank_dates.js';
import { claimMembershipChecks } from '../schema/claim_membership_checks.js';
import { claims } from '../schema/claims.js';
import { members } from '../schema/members.js';
import { FeeBankDateRefusedError, type FeeBankDateRefusalReason } from './errors.js';
import type { ClaimEventActor } from './events.js';
import { getLiveFeeBankDate } from './fee-bank-date-read.js';
import { MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES } from './membership-check-approval.js';
import { isInMembershipCheckWindow } from './membership-check-persist.js';
import { readJoiningFeeReceipt } from './membership-check-read.js';
import { projectClaimState } from './project.js';

/** The one-live-record partial unique index (0219) — the backstop behind the claim-row lock. */
export const CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX = 'claim_fee_bank_dates_one_live_per_claim_uq';

/**
 * ⭐ DL3 — is the reference typed from the statement the SAME reference as the stored one? Both trimmed; letters compared
 * without regard to case (the stored UTR is kept as the member typed it — the 22-character form admits either case, while
 * a statement prints capitals); digits exactly. ⛔ A looser match (PQ2 A). Pure.
 */
export function isSameStatementReference(typed: string, stored: string): boolean {
  const a = typed.trim();
  const b = stored.trim();
  return a.length > 0 && a.toUpperCase() === b.toUpperCase();
}

export interface RecordFeeBankDateInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  /** ⚠ SECRET-ish (TR5): compared in TypeScript with the stored `utr`, then dropped — ⛔ stored, logged or queried. */
  readonly statementReference: string;
  readonly bankCreditDate: CalendarDateString;
  readonly reasonCode: FeeBankDateReasonCode;
  /** The note, Tier-1-encrypted by the handler — REQUIRED. */
  readonly noteCiphertext: string;
  /** The live check the finance officer saw (`null` = none) — re-asserted under the lock. */
  readonly expectedLiveCheckId: string | null;
  /** The live bank-date record the finance officer saw (`null` = none) — re-asserted under the lock. */
  readonly expectedLiveRecordId: string | null;
  readonly actorId: string;
  /** Snapshotted server-side by the caller — ⛔ never email-derived, ⛔ never from the request. */
  readonly actorDisplay: string;
  readonly actor: ClaimEventActor;
  /** The server's clock — IST "today" for the `in_future` bound. */
  readonly now: Date;
  readonly auditId?: string;
}

export interface RecordFeeBankDateResult {
  readonly recordId: ClaimFeeBankDateId;
  readonly feeReceiptId: VyawasthaShulkReceiptId;
  readonly reasonCode: FeeBankDateReasonCode;
  readonly supersededRecordId: ClaimFeeBankDateId | null;
  readonly eventVersion: number;
}

/** A DB error's SQLSTATE and constraint (drizzle wraps the driver error; either may be on `.cause`). */
function pgFacts(err: unknown): { code: string | undefined; constraint: string | undefined } {
  const e = (err ?? {}) as { code?: unknown; constraint?: unknown; cause?: { code?: unknown; constraint?: unknown } | null };
  const code = e.code ?? e.cause?.code;
  const constraint = e.constraint ?? e.cause?.constraint;
  return { code: typeof code === 'string' ? code : undefined, constraint: typeof constraint === 'string' ? constraint : undefined };
}

/**
 * ⭐ TR5 — a DB error from this writer's statements, stripped of its PARAMETERS (drizzle's message is `Failed query: …
 * params: …`, which would carry the bank date and the note ciphertext into the 500 log). Ids and the SQLSTATE only.
 */
export class FeeBankDateWriteError extends Error {
  public readonly name = 'FeeBankDateWriteError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly step: 'supersede' | 'insert',
    public readonly code: string | undefined,
    public readonly constraint: string | undefined,
  ) {
    super(`[fee-bank-date] claim ${claimCaseId}: the ${step} failed (sqlstate ${code ?? 'unknown'}${constraint ? `, ${constraint}` : ''})`);
  }
}

/**
 * Record the finance officer's bank date for a claim's joining fee. See the header for the order of every guard.
 *
 * @throws FeeBankDateRefusedError (→ 409; `not_found` → 404; `invalid_reason` → 400), FeeBankDateWriteError (→ 500)
 */
export async function recordFeeBankDate(client: pg.PoolClient, input: RecordFeeBankDateInput): Promise<RecordFeeBankDateResult> {
  const refuse = (reason: FeeBankDateRefusalReason, detail: string) =>
    new FeeBankDateRefusedError(input.claimCaseId, reason, detail);

  // (0) The shape.
  if (input.actorDisplay.trim() === '') {
    throw refuse('missing_display', 'a bank date is attributed to a named finance officer or not recorded');
  }
  if (!(FEE_BANK_DATE_REASON_CODES as readonly string[]).includes(input.reasonCode)) {
    throw refuse('invalid_reason', 'an unknown reason');
  }
  if (!isRealCalendarDate(input.bankCreditDate)) throw refuse('invalid_reason', 'the bank date is not a real calendar date');
  if (input.noteCiphertext.trim() === '') throw refuse('invalid_reason', 'a bank date needs a note');

  const db = bindScopedDb(client);

  // (1) The claim-row lock.
  const [claimRow] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .for('update');
  if (!claimRow) throw refuse('not_found', 'no such claim in this Pariwar');
  const state = claimRow.currentState as string;

  // (2) The window.
  if (!isInMembershipCheckWindow(state)) {
    throw refuse('window_closed', `a bank date cannot be recorded while the claim is '${state}'`);
  }

  // (3) Held on its fee — the live check blocks, or a live record exists (a correction).
  const [liveCheck] = await db
    .select({ checkId: claimMembershipChecks.checkId, feeOutcome: claimMembershipChecks.feeOutcome, feeReceiptId: claimMembershipChecks.feeReceiptId })
    .from(claimMembershipChecks)
    .where(
      and(
        eq(claimMembershipChecks.pariwarId, input.pariwarId),
        eq(claimMembershipChecks.claimCaseId, input.claimCaseId),
        isNull(claimMembershipChecks.supersededAt),
      ),
    );
  if (!liveCheck) throw refuse('not_held', 'nobody has recorded a membership check on this claim yet');
  const liveRecord = await getLiveFeeBankDate(db, input.pariwarId, input.claimCaseId);
  if (!MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES.includes(liveCheck.feeOutcome) && liveRecord === null) {
    throw refuse('not_held', 'the membership check does not hold this claim on its joining fee');
  }

  // (4) The joining payment — re-read under the lock, and the one the live check names.
  const receipt = await readJoiningFeeReceipt(db, input.pariwarId, claimRow.deceasedMemberId);
  if (receipt === null) throw refuse('no_fee_receipt', "the member's joining payment cannot be identified");
  if ((receipt.receiptId as string).toLowerCase() !== (liveCheck.feeReceiptId as string).toLowerCase()) {
    throw refuse('stale', 'the joining payment is not the one the membership check names — reload');
  }

  // (5) The reference (N3) — in TypeScript, ⛔ in a query (TR5).
  if (!isSameStatementReference(input.statementReference, receipt.utr)) {
    throw refuse('reference_mismatch', "the statement's reference is not the joining payment's recorded one");
  }

  // (6) The bounds (G10).
  if (input.bankCreditDate > istDateOf(input.now)) throw refuse('in_future', 'the bank date is after today');
  const [member] = await db
    .select({ createdAt: members.createdAt })
    .from(members)
    .where(and(eq(members.pariwarId, input.pariwarId), eq(members.memberId, claimRow.deceasedMemberId)));
  if (!member) throw refuse('no_fee_receipt', "the member's record cannot be read");
  if (input.bankCreditDate < istDateOf(member.createdAt)) {
    throw refuse('before_joining', 'the bank date is before the member joined');
  }

  // (7) The tokens — ids are lower-cased (the contract's uuid is unbranded; stored ids are lower-case).
  const lower = (v: string | null) => (v === null ? null : v.toLowerCase());
  if ((liveCheck.checkId as string).toLowerCase() !== lower(input.expectedLiveCheckId)) {
    throw refuse('stale', 'the membership check changed since the list was opened — reload');
  }
  if (lower(liveRecord?.recordId ?? null) !== lower(input.expectedLiveRecordId)) {
    throw refuse('stale', 'the bank date on this claim changed since the list was opened — reload');
  }

  // (8) Supersede the live record, insert the new one, emit the identity annotation.
  const superseded = await db
    .update(claimFeeBankDates)
    .set({ supersededAt: sql`now()`, supersededReason: 're_recorded' })
    .where(
      and(
        eq(claimFeeBankDates.pariwarId, input.pariwarId),
        eq(claimFeeBankDates.claimCaseId, input.claimCaseId),
        isNull(claimFeeBankDates.supersededAt),
      ),
    )
    .returning({ id: claimFeeBankDates.recordId })
    .catch((err: unknown) => {
      const f = pgFacts(err);
      throw new FeeBankDateWriteError(input.claimCaseId, 'supersede', f.code, f.constraint);
    });
  const supersededRecordId = superseded[0]?.id ?? null;

  // ⛔ A raw 23505 to the caller: the one-live index is the backstop, its violation the same `stale` as (7). Not reachable
  // today (every inserter takes a KEY SHARE on the claim row through the FK, so it serialises with (1)) — proved by its
  // predicate only. Every other DB error is re-thrown parameter-free (TR5).
  const [row] = await db
    .insert(claimFeeBankDates)
    .values({
      pariwarId: input.pariwarId,
      claimCaseId: input.claimCaseId,
      deceasedMemberId: claimRow.deceasedMemberId,
      feeReceiptId: receipt.receiptId,
      bankCreditDate: input.bankCreditDate,
      reasonCode: input.reasonCode,
      noteCiphertext: input.noteCiphertext,
      decidedByActorId: input.actorId,
      decidedByDisplay: input.actorDisplay,
    })
    .returning({ recordId: claimFeeBankDates.recordId })
    .catch((err: unknown) => {
      const f = pgFacts(err);
      if (f.code === '23505' && f.constraint === CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX) {
        throw refuse('stale', 'another bank date became live while this one was being recorded — reload');
      }
      throw new FeeBankDateWriteError(input.claimCaseId, 'insert', f.code, f.constraint);
    });
  const recordId = row!.recordId;

  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.fee_bank_date_recorded',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'fee_bank_date',
      actor: input.actor,
      record_id: recordId,
      fee_receipt_id: receipt.receiptId,
      reason_code: input.reasonCode,
      superseded_record_id: supersededRecordId,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return {
    recordId,
    feeReceiptId: receipt.receiptId,
    reasonCode: input.reasonCode,
    supersededRecordId,
    eventVersion: projected.eventVersion,
  };
}
