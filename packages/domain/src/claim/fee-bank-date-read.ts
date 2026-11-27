// The bank-date READS — the claim's live record, and the finance officer's two-section list (Story 6.39a, Task 2.2;
// DL4, DL6, DL10; AC3). Transport-free.
//
// ⛔ No ciphertext is opened here (the no-comparison fence, 6.39a's `it` block — TR3): this module reads ids, plaintext
// codes, the bank date (payment metadata) and the joining payment's plaintext recorded instant, amount and reference.
// ⛔ A name, ⛔ the date of death, ⛔ the check's `fee_outcome` is RETURNED (N2 — `same_day` beside a bank date IS the date
// of death); the list FILTERS on `fee_outcome` but never hands it out.
//
// ── The list (DL10) ────────────────────────────────────────────────────────────────────────────────────────────────
// TWO sections, each read and capped ON ITS OWN, so a claim already helped never pushes a held one past the cap:
//   · held     — in the review window, the LIVE check's `fee_outcome` blocks (`MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES`).
//                This includes a claim whose bank date is recorded and whose re-check is still owed (its live check
//                still blocks). ⛔ A claim nobody has CHECKED (DL5's only path: the District Admin records the check first);
//   · recorded — in the window, a LIVE bank-date record exists and the live check's fee half passes (listed only so a
//                wrong date can be corrected — DL5 (b)).
// The payment on a row is the one the LIVE CHECK names (`fee_receipt_id` — one join; ⛔ a second definition of "the
// joining receipt", ⛔ a per-row call of the reader). Longest-held first (the live check's `decided_at`).

import { and, asc, eq, inArray, isNotNull, isNull, notInArray } from 'drizzle-orm';

import { istDateOf, type CalendarDateString } from '../cycle-calendar/holiday-resolver.js';
import type { Db } from '../db.js';
import type {
  ClaimFeeBankDateId,
  ClaimId,
  ClaimMembershipCheckId,
  MemberId,
  PariwarId,
  VyawasthaShulkReceiptId,
} from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { type FeeBankDateReasonCode, claimFeeBankDates } from '../schema/claim_fee_bank_dates.js';
import { type MembershipCheckFeeDateSource, claimMembershipChecks } from '../schema/claim_membership_checks.js';
import { claims } from '../schema/claims.js';
import { vyawasthaShulkReceipts } from '../schema/vyawastha_shulk_receipts.js';
import { MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES } from './membership-check-approval.js';
import { CLAIM_REVIEW_WINDOW_STATES } from './review-window.js';

export const FEE_BANK_DATE_LIST_DEFAULT_LIMIT = 50;
export const FEE_BANK_DATE_LIST_MAX_LIMIT = 200;

/** The claim's LIVE bank-date record (⛔ the note). */
export interface LiveFeeBankDate {
  readonly recordId: ClaimFeeBankDateId;
  /** The joining payment it was matched to — the membership check considers it only while that is the joining one. */
  readonly feeReceiptId: VyawasthaShulkReceiptId;
  readonly bankCreditDate: CalendarDateString;
  readonly reasonCode: FeeBankDateReasonCode;
  readonly decidedByActorId: string;
  readonly decidedByDisplay: string;
  readonly decidedAt: Date;
}

/** Read the claim's LIVE bank-date record — `null` when none. RLS-scoped, with the explicit `pariwar_id` predicate. */
export async function getLiveFeeBankDate(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<LiveFeeBankDate | null> {
  const rows = await db
    .select({
      recordId: claimFeeBankDates.recordId,
      feeReceiptId: claimFeeBankDates.feeReceiptId,
      bankCreditDate: claimFeeBankDates.bankCreditDate,
      reasonCode: claimFeeBankDates.reasonCode,
      decidedByActorId: claimFeeBankDates.decidedByActorId,
      decidedByDisplay: claimFeeBankDates.decidedByDisplay,
      decidedAt: claimFeeBankDates.decidedAt,
    })
    .from(claimFeeBankDates)
    .where(
      and(
        eq(claimFeeBankDates.pariwarId, pariwarId),
        eq(claimFeeBankDates.claimCaseId, claimCaseId),
        isNull(claimFeeBankDates.supersededAt),
      ),
    );
  // Invariant (the partial unique index): at most one LIVE record per claim. Never silently pick one of two.
  if (rows.length > 1) {
    throw new Error(`fee-bank-date: expected at most one live record for claim ${claimCaseId}, got ${rows.length}`);
  }
  return rows[0] ?? null;
}

/**
 * ⭐ DL6 — the record the membership check CONSIDERS: the live record iff it names the JOINING payment (a record naming
 * any other payment — a raw fixture, a defence — is ignored, and the gate then answers `bank_date_recorded` until a new
 * record supersedes it: fail closed). Pure.
 */
export function considerableFeeBankDate(
  live: LiveFeeBankDate | null,
  joiningReceiptId: VyawasthaShulkReceiptId | string,
): LiveFeeBankDate | null {
  if (live === null) return null;
  return (live.feeReceiptId as string).toLowerCase() === (joiningReceiptId as string).toLowerCase() ? live : null;
}

/**
 * ⭐ DL6 — the fee date the check compares: the EARLIER of the bank date (when considered) and the recorded date. A bank
 * date LATER than the recorded one shows nothing of "arrived before the death" and is ⛔ used (TL4 — a later bank date
 * never counts against a family). `bank` only when STRICTLY earlier. Pure.
 */
export function chooseFeeDate(
  recordedPaidAt: Date,
  considered: Pick<LiveFeeBankDate, 'bankCreditDate'> | null,
): { readonly feeDate: CalendarDateString; readonly source: MembershipCheckFeeDateSource } {
  const recorded = istDateOf(recordedPaidAt);
  if (considered !== null && considered.bankCreditDate < recorded) {
    return { feeDate: considered.bankCreditDate, source: 'bank' };
  }
  return { feeDate: recorded, source: 'recorded' };
}

/** One row of the finance officer's list. ⛔ A name, ⛔ the date of death, ⛔ the check's fee outcome (N2). */
export interface FeeBankDateListRow {
  readonly claimCaseId: ClaimId;
  /** The deceased (the caller resolves the posting district through the ONE geo reader; ⛔ on the wire). */
  readonly deceasedMemberId: MemberId;
  /** The joining payment's RECORDED date, Indian calendar. */
  readonly recordedFeeDate: CalendarDateString;
  readonly amountInr: number;
  /** The stored reference's LAST FOUR — the page shows only these, so the typed reference is a real check (DL3). */
  readonly referenceLast4: string;
  readonly feeDateSource: MembershipCheckFeeDateSource;
  readonly liveCheckId: ClaimMembershipCheckId;
  readonly liveCheckDecidedAt: Date;
  readonly liveRecord: {
    readonly recordId: ClaimFeeBankDateId;
    readonly bankCreditDate: CalendarDateString;
    readonly reasonCode: FeeBankDateReasonCode;
    readonly decidedByDisplay: string;
    readonly decidedAt: Date;
  } | null;
}

export interface FeeBankDateList {
  readonly held: readonly FeeBankDateListRow[];
  readonly recorded: readonly FeeBankDateListRow[];
  readonly heldTruncated: boolean;
  readonly recordedTruncated: boolean;
}

type Section = 'held' | 'recorded';

async function readSection(db: Db, pariwarId: PariwarId, section: Section, limit: number) {
  const blocking = MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES as readonly string[] as string[];
  return db
    .select({
      claimCaseId: claims.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      paidAt: vyawasthaShulkReceipts.paidAt,
      amountInr: vyawasthaShulkReceipts.amountInr,
      utr: vyawasthaShulkReceipts.utr,
      feeDateSource: claimMembershipChecks.feeDateSource,
      liveCheckId: claimMembershipChecks.checkId,
      liveCheckDecidedAt: claimMembershipChecks.decidedAt,
      recordId: claimFeeBankDates.recordId,
      bankCreditDate: claimFeeBankDates.bankCreditDate,
      reasonCode: claimFeeBankDates.reasonCode,
      recordDisplay: claimFeeBankDates.decidedByDisplay,
      recordDecidedAt: claimFeeBankDates.decidedAt,
    })
    .from(claims)
    .innerJoin(
      claimMembershipChecks,
      and(
        eq(claimMembershipChecks.pariwarId, claims.pariwarId),
        eq(claimMembershipChecks.claimCaseId, claims.claimCaseId),
        isNull(claimMembershipChecks.supersededAt),
      ),
    )
    .innerJoin(
      vyawasthaShulkReceipts,
      and(
        eq(vyawasthaShulkReceipts.pariwarId, claims.pariwarId),
        eq(vyawasthaShulkReceipts.receiptId, claimMembershipChecks.feeReceiptId),
      ),
    )
    .leftJoin(
      claimFeeBankDates,
      and(
        eq(claimFeeBankDates.pariwarId, claims.pariwarId),
        eq(claimFeeBankDates.claimCaseId, claims.claimCaseId),
        isNull(claimFeeBankDates.supersededAt),
      ),
    )
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        inArray(claims.currentState, CLAIM_REVIEW_WINDOW_STATES as readonly string[] as never[]),
        section === 'held'
          ? inArray(claimMembershipChecks.feeOutcome, blocking as never[])
          : and(notInArray(claimMembershipChecks.feeOutcome, blocking as never[]), isNotNull(claimFeeBankDates.recordId)),
      ),
    )
    .orderBy(asc(claimMembershipChecks.decidedAt), asc(claimMembershipChecks.checkId))
    // ONE PAST the limit — `*_truncated` only when a claim was REALLY left out. ⚠ The `clampLimit(...)` call stays
    // INLINE in `.limit(...)` — the domain-accessor-invariants gate accepts nothing else.
    .limit(clampLimit(limit + 1, { default: FEE_BANK_DATE_LIST_DEFAULT_LIMIT + 1, cap: FEE_BANK_DATE_LIST_MAX_LIMIT + 1 }));
}

function toRow(r: Awaited<ReturnType<typeof readSection>>[number]): FeeBankDateListRow {
  return {
    claimCaseId: r.claimCaseId,
    deceasedMemberId: r.deceasedMemberId,
    recordedFeeDate: istDateOf(r.paidAt),
    amountInr: r.amountInr,
    referenceLast4: r.utr.slice(-4),
    feeDateSource: r.feeDateSource,
    liveCheckId: r.liveCheckId,
    liveCheckDecidedAt: r.liveCheckDecidedAt,
    liveRecord:
      r.recordId !== null && r.bankCreditDate !== null && r.reasonCode !== null && r.recordDisplay !== null && r.recordDecidedAt !== null
        ? {
            recordId: r.recordId,
            bankCreditDate: r.bankCreditDate,
            reasonCode: r.reasonCode,
            decidedByDisplay: r.recordDisplay,
            decidedAt: r.recordDecidedAt,
          }
        : null,
  };
}

/**
 * ⭐ DL10 — the finance officer's list, in its TWO sections, each capped on its own (`limit` per section — default 50,
 * max 200). Reads only; ⛔ nothing decrypted.
 */
export async function listClaimsHeldOnFee(
  db: Db,
  pariwarId: PariwarId,
  opts: { readonly limit?: number; readonly recordedLimit?: number } = {},
): Promise<FeeBankDateList> {
  const heldLimit = clampLimit(opts.limit, { default: FEE_BANK_DATE_LIST_DEFAULT_LIMIT, cap: FEE_BANK_DATE_LIST_MAX_LIMIT });
  const recordedLimit = clampLimit(opts.recordedLimit ?? opts.limit, {
    default: FEE_BANK_DATE_LIST_DEFAULT_LIMIT,
    cap: FEE_BANK_DATE_LIST_MAX_LIMIT,
  });
  const held = await readSection(db, pariwarId, 'held', heldLimit);
  const recorded = await readSection(db, pariwarId, 'recorded', recordedLimit);
  // ⚠ The two sections are two statements: a District Admin's re-check committed BETWEEN them could put one claim in BOTH
  // (code review 2026-11-27). A claim is listed ONCE — held wins (its row's tokens are the older read, and a POST from it is
  // refused `stale` and reloads, never a silent double).
  // Only the DISPLAYED held rows (an overflow row past the cap would otherwise vanish from both sections — fix-diff review).
  const heldIds = new Set(held.slice(0, heldLimit).map((r) => (r.claimCaseId as string).toLowerCase()));
  const recordedOnce = recorded.filter((r) => !heldIds.has((r.claimCaseId as string).toLowerCase()));
  return {
    held: held.slice(0, heldLimit).map(toRow),
    recorded: recordedOnce.slice(0, recordedLimit).map(toRow),
    heldTruncated: held.length > heldLimit,
    recordedTruncated: recorded.length > recordedLimit,
  };
}
