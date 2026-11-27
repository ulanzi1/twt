// `claim_fee_bank_dates` — the finance officer's record of the date the Trust's own bank statement shows a claim's joining
// fee arrived (Story 6.39a, Task 1.1; DL1; AC1; author-commit `2026-11-27-510`).
//
// `2026-11-21-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived before
// the death; they record that they did, with a reason, and it is audited."* ⇒ ONE recorded staff act per claim, by the
// Trust's finance officer (DL8), accepted only when the reference they type from the statement IS the joining payment's
// stored `utr` (N3 — compared by the writer, ⛔ stored here).
//
// ── Shape ────────────────────────────────────────────────────────────────────────────────────────────────────────
//   · At most ONE LIVE record per claim (the partial-unique index `WHERE superseded_at IS NULL`); a new record
//     supersedes it (`re_recorded`). Supersession is ONE-WAY (the 0212 trigger, copied).
//   · The record is a FACT, ⛔ a decision (N2): the District Admin's next membership check compares the EARLIER of
//     `bank_credit_date` and the recorded date with the date of death (DL6), by the ONE rule (`fee-death-date.ts`).
//   · `bank_credit_date` is a CALENDAR date (`mode: 'string'` — TR6: ⛔ a JS `Date`, whose UTC midnight shifts a day in
//     IST). Plaintext payment metadata, as the payment's `paid_at` — ⛔ scrubbed (the payment record is retained, FR-1).
//
// ── PII discipline ───────────────────────────────────────────────────────────────────────────────────────────────
//   · note_ciphertext → Tier-1, REQUIRED (Q2 B's "with a reason" — which statement, which line, what was seen).
//     Column-level UPDATE grant + UPDATE policy at birth for the DPDPA-RTBF scrub.
//   · decided_by_display → controlled STAFF data, snapshotted at decision time, ⛔ never email-derived.
//   · ⛔ Never in an event, a log line or an audit context: the note, the bank date, the typed reference, a name (N6).

import { sql } from 'drizzle-orm';
import { date, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import { CLAIM_FEE_BANK_DATE_FIELD_CLASS } from '../encryption/field-classes.js';
import type { ClaimFeeBankDateId, ClaimId, MemberId, PariwarId, VyawasthaShulkReceiptId } from '../ids/index.js';
import { claims } from './claims.js';
import { vyawasthaShulkReceipts } from './vyawastha_shulk_receipts.js';

/**
 * Why the recorded fee date is wrong (DL5 (d)) — a closed list; the note says the rest.
 * ⚠ LOCKSTEP with migration 0219's `claim_fee_bank_dates_reason_code_check` and `@twt/contracts`'
 * `FEE_BANK_DATE_REASON_CODES` (pinned by `claims-fee-bank-date.test.ts`).
 */
export const FEE_BANK_DATE_REASON_CODES = ['recorded_late_by_member', 'recorded_by_family_after_death', 'other'] as const;
export type FeeBankDateReasonCode = (typeof FEE_BANK_DATE_REASON_CODES)[number];

/** Why a record stopped being live — a later record replaced it. ⚠ LOCKSTEP with 0219's supersession CHECK. */
export const FEE_BANK_DATE_SUPERSESSION_REASONS = ['re_recorded'] as const;
export type FeeBankDateSupersessionReason = (typeof FEE_BANK_DATE_SUPERSESSION_REASONS)[number];

export const claimFeeBankDates = pgTable(
  'claim_fee_bank_dates',
  {
    recordId: uuid('record_id').defaultRandom().primaryKey().$type<ClaimFeeBankDateId>(),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // The deceased member (the `claims.deceased_member_id` cache — ⛔ no FK). The RTBF scrub keys on it.
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The JOINING payment the typed reference was matched to (N3).
    feeReceiptId: uuid('fee_receipt_id')
      .notNull()
      .$type<VyawasthaShulkReceiptId>()
      .references(() => vyawasthaShulkReceipts.receiptId, { onDelete: 'cascade' }),

    // The date the money arrived, as the Trust's statement shows it — a calendar date (TR6).
    bankCreditDate: date('bank_credit_date', { mode: 'string' }).notNull(),

    reasonCode: text('reason_code').notNull().$type<FeeBankDateReasonCode>(),

    // Tier-1 — the finance officer's note. REQUIRED.
    noteCiphertext: piiColumn(1, CLAIM_FEE_BANK_DATE_FIELD_CLASS)('note_ciphertext').notNull(),

    decidedByActorId: text('decided_by_actor_id').notNull(),
    decidedByDisplay: text('decided_by_display').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // NULL = the LIVE record for this claim.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
    supersededReason: text('superseded_reason').$type<FeeBankDateSupersessionReason>(),
  },
  (t) => [
    index('claim_fee_bank_dates_pariwar_id_idx').on(t.pariwarId),
    index('claim_fee_bank_dates_claim_case_id_idx').on(t.claimCaseId),
    index('claim_fee_bank_dates_fee_receipt_id_idx').on(t.feeReceiptId),
    index('claim_fee_bank_dates_deceased_member_idx').on(t.pariwarId, t.deceasedMemberId),
    // DL1 — at most ONE live record per claim (the supersession backstop).
    uniqueIndex('claim_fee_bank_dates_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
    // The target of `claim_membership_checks`' composite FK — a check names only a record of its OWN claim.
    unique('claim_fee_bank_dates_record_claim_uq').on(t.recordId, t.claimCaseId),
  ],
);

export type ClaimFeeBankDateRow = typeof claimFeeBankDates.$inferSelect;
export type ClaimFeeBankDateInsert = typeof claimFeeBankDates.$inferInsert;
