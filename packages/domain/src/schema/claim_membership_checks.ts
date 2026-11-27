// `claim_membership_checks` — the staff MEMBERSHIP CHECK recorded on a death claim before any drive opens
// (Story 6.39, Task 1; DL1; AC1; author-commit `2026-11-21-472`).
//
// `2026-10-31-424` Q1 (a) C: a claim for someone who typed in their own identity details, never verified since, is
// filed — *"but the identity is checked first, by staff, from the death documents and the details on record, before
// any drive opens."* `2026-10-31-430` Q1 B: *"Before any drive opens, staff compare the date of death on the
// certificate with the date the fee was paid, and ⛔ drive opens if the fee was paid after the death."*
// ⇒ ONE recorded staff act per claim, by the District Admin, with two halves: the FEE half (every claim — the SYSTEM
// computes it, N3) and the IDENTITY half (only for an identity nobody has checked — the staff member judges it, N2).
//
// ── Shape ────────────────────────────────────────────────────────────────────────────────────────────────────────
//   · At most ONE LIVE check per claim (the partial-unique index `WHERE superseded_at IS NULL`); a re-check
//     supersedes it. Supersession is ONE-WAY (the 0122 trigger, copied).
//   · A check names the ACCEPTED certificate review it was computed against (`death_certificate_review_id`) — the
//     CURRENCY token (N4): it is current only while that review is still the claim's current accepted one.
//   · ⛔ It stores ⛔ date. The death date is Tier-1 and has ONE home (the review); the fee date has ONE home (the
//     receipt `fee_receipt_id` names). The row carries the OUTCOME of comparing them.
//
// ── PII discipline ───────────────────────────────────────────────────────────────────────────────────────────────
//   · note_ciphertext → Tier-1, OPTIONAL — REQUIRED when the identity is `not_confirmed` (the coherence CHECK).
//     Column-level UPDATE grant + UPDATE policy at birth for the DPDPA-RTBF scrub (DL14).
//   · decided_by_display → controlled STAFF data, snapshotted at decision time, ⛔ never email-derived.
//   · ⛔ Never in an event, a log line or an audit context: the note, either date, a name (N7).

import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import { CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS } from '../encryption/field-classes.js';
import type {
  ClaimFeeBankDateId,
  ClaimId,
  ClaimMembershipCheckId,
  DeathCertificateReviewId,
  MemberId,
  PariwarId,
  VyawasthaShulkReceiptId,
} from '../ids/index.js';
import { claimDeathCertificateReviews } from './claim_death_certificate_reviews.js';
import { claimFeeBankDates } from './claim_fee_bank_dates.js';
import { claims } from './claims.js';
import { vyawasthaShulkReceipts } from './vyawastha_shulk_receipts.js';

/**
 * The fee half's result (DL2): the joining receipt's Indian calendar date against the accepted certificate's date
 * of death. Computed by the SYSTEM — ⛔ typed and ⛔ overridable by staff (N3). `same_day` STOPS the drive, as
 * `after_death` does (`2026-11-21-473` Q1 B — the gate's `MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES`); it stays its own
 * stored outcome so staff see "Paid on the day of death".
 * ⚠ LOCKSTEP with migration 0212's `claim_membership_checks_fee_outcome_check` and `@twt/contracts`'
 * `MEMBERSHIP_CHECK_FEE_OUTCOMES` (pinned by `claims-membership-check.test.ts`).
 */
export const MEMBERSHIP_CHECK_FEE_OUTCOMES = ['before_death', 'same_day', 'after_death'] as const;
export type MembershipCheckFeeOutcome = (typeof MEMBERSHIP_CHECK_FEE_OUTCOMES)[number];

/**
 * ⭐ Story 6.39a (DL1 / DL6) — WHICH fee date the check compared with the date of death:
 *   · `recorded` — the joining payment's recorded date (`istDateOf(paid_at)`) — every check before 6.39a, by the column
 *     DEFAULT;
 *   · `bank`     — the claim's live bank-date record's `bank_credit_date`, used only when it is STRICTLY EARLIER than the
 *     recorded date (a later bank date never counts against a family — TL4).
 * ⚠ Row `3-17-joining-and-renewal-fee-optional-switch` (G14 / TR13) EXTENDS this vocabulary with a third source (a member
 * with ⛔ payment, judged by submission) — the coherence CHECK (`'bank'` ⇒ an id) is one-way so that needs ⛔ rewrite of it.
 * ⚠ LOCKSTEP with migration 0219's `claim_membership_checks_fee_date_source_check` and `@twt/contracts`'
 * `MEMBERSHIP_CHECK_FEE_DATE_SOURCES` (pinned by `claims-membership-check.test.ts`).
 */
export const MEMBERSHIP_CHECK_FEE_DATE_SOURCES = ['recorded', 'bank'] as const;
export type MembershipCheckFeeDateSource = (typeof MEMBERSHIP_CHECK_FEE_DATE_SOURCES)[number];

/**
 * The identity half's result (DL8). `not_required` iff the deceased's identity was already checked (DL4);
 * otherwise the staff member's judgment. `not_confirmed` makes the claim WAIT — ⛔ it never denies (N5).
 * ⚠ LOCKSTEP with 0212's `…_identity_outcome_check` and the contracts mirror.
 */
export const MEMBERSHIP_CHECK_IDENTITY_OUTCOMES = ['not_required', 'confirmed', 'not_confirmed'] as const;
export type MembershipCheckIdentityOutcome = (typeof MEMBERSHIP_CHECK_IDENTITY_OUTCOMES)[number];

/** Why the identity could not be confirmed (DL8) — set iff `not_confirmed`. ⚠ LOCKSTEP with 0212 and the contract. */
export const MEMBERSHIP_CHECK_IDENTITY_REASONS = [
  'name_differs',
  'age_or_birth_date_differs',
  'document_unreadable',
  'other',
] as const;
export type MembershipCheckIdentityReason = (typeof MEMBERSHIP_CHECK_IDENTITY_REASONS)[number];

/** Why a check stopped being live — a later check replaced it. ⚠ LOCKSTEP with 0212's supersession CHECK. */
export const MEMBERSHIP_CHECK_SUPERSESSION_REASONS = ['re_checked'] as const;
export type MembershipCheckSupersessionReason = (typeof MEMBERSHIP_CHECK_SUPERSESSION_REASONS)[number];

export const claimMembershipChecks = pgTable(
  'claim_membership_checks',
  {
    checkId: uuid('check_id').defaultRandom().primaryKey().$type<ClaimMembershipCheckId>(),

    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The deceased member (the `claims.deceased_member_id` cache — ⛔ no FK). The RTBF scrub keys on it.
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The ACCEPTED review the comparison was computed against — the currency token (N4).
    deathCertificateReviewId: uuid('death_certificate_review_id')
      .notNull()
      .$type<DeathCertificateReviewId>()
      .references(() => claimDeathCertificateReviews.reviewId, { onDelete: 'cascade' }),

    // The JOINING receipt (DL3) whose `paid_at` was compared.
    feeReceiptId: uuid('fee_receipt_id')
      .notNull()
      .$type<VyawasthaShulkReceiptId>()
      .references(() => vyawasthaShulkReceipts.receiptId, { onDelete: 'cascade' }),

    feeOutcome: text('fee_outcome').notNull().$type<MembershipCheckFeeOutcome>(),

    // Story 6.39a (0219, DL6) — which fee date `fee_outcome` was computed from, and the live bank-date record the check
    // CONSIDERED, whichever date won (the gate's second currency token — DL7). `'bank'` ⇒ an id (one-way CHECK).
    feeDateSource: text('fee_date_source').notNull().default('recorded').$type<MembershipCheckFeeDateSource>(),
    // ⚠ The FK is COMPOSITE — `(fee_bank_date_id, claim_case_id)` → the record of the SAME claim (declared below).
    feeBankDateId: uuid('fee_bank_date_id').$type<ClaimFeeBankDateId>(),

    // N2 at the time of the check. The GATE re-reads the KYC record each time — this column is the record of
    // what the staff member was asked, ⛔ the gate's source.
    identityRequired: boolean('identity_required').notNull(),
    identityOutcome: text('identity_outcome').notNull().$type<MembershipCheckIdentityOutcome>(),
    // `not_confirmed` only (the coherence CHECK).
    identityReason: text('identity_reason').$type<MembershipCheckIdentityReason>(),

    // Tier-1 — the staff note. Required when `not_confirmed`, optional otherwise.
    noteCiphertext: piiColumn(1, CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS)('note_ciphertext'),

    decidedByActorId: text('decided_by_actor_id').notNull(),
    decidedByDisplay: text('decided_by_display').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // NULL = the LIVE check for this claim.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
    supersededReason: text('superseded_reason').$type<MembershipCheckSupersessionReason>(),
  },
  (t) => [
    index('claim_membership_checks_pariwar_id_idx').on(t.pariwarId),
    index('claim_membership_checks_claim_case_id_idx').on(t.claimCaseId),
    index('claim_membership_checks_review_id_idx').on(t.deathCertificateReviewId),
    index('claim_membership_checks_fee_receipt_id_idx').on(t.feeReceiptId),
    index('claim_membership_checks_deceased_member_idx').on(t.pariwarId, t.deceasedMemberId),
    index('claim_membership_checks_fee_bank_date_id_idx').on(t.feeBankDateId),
    // Story 6.39a (code review) — a check names only a bank-date record of its OWN claim.
    foreignKey({
      name: 'claim_membership_checks_fee_bank_date_id_fk',
      columns: [t.feeBankDateId, t.claimCaseId],
      foreignColumns: [claimFeeBankDates.recordId, claimFeeBankDates.claimCaseId],
    }).onDelete('cascade'),
    // DL1 — at most ONE live check per claim (the supersession backstop).
    uniqueIndex('claim_membership_checks_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimMembershipCheckRow = typeof claimMembershipChecks.$inferSelect;
export type ClaimMembershipCheckInsert = typeof claimMembershipChecks.$inferInsert;
