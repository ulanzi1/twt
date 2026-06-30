// `vyawastha_shulk_receipts` — the member's signup ₹110 Vyawastha Shulk receipt history (Story 3.6b,
// Task 1/2).
//
// Persisted on EVERY successful UTR self-attest (AR-67 — INDEFINITE retention; forward-compat for
// FR-100 future-benefit eligibility reconstruction). The receipt is a STAND-ALONE durable fact: it is
// written even when the 5-condition lock-in gate (AC2) is not satisfied — lock-in entry is a separate
// gated step (D3). The `tr` (the UPI Intent transaction-ref the server minted) is the idempotency key:
// a UNIQUE constraint makes a re-confirm with the same `tr` return the existing receipt rather than
// inserting a second row + re-emitting lifecycle events (AC1; architecture §"Idempotency" tr= store).
//
// ── APPEND-ONLY immutable receipt — GRANT SELECT, INSERT only ─────────────────────────────────────
// A receipt is never UPDATEd or DELETEd (beyond the FK cascade for RTBF, Story 3.12) — mirror the
// member_medical_disclosures / consent-records "no DELETE" append-only rationale + AR-67 indefinite
// retention. The migration GRANT is SELECT + INSERT only; RLS in the migration's tenant-isolation
// policies.
//
// TENANT-ISOLATED (mirrors member_medical_disclosures / members). A receipt belongs to exactly one
// member in exactly one Pariwar; the in-scope confirm write + the status/idempotency reads run under
// that Pariwar's `app.pariwar_id`.
//
// ── No PII (Tier-3 plaintext throughout) ──────────────────────────────────────────────────────────
// `tr` / `utr` / `amount_inr` / `payment_method` are payment metadata, not member PII (the UTR is a
// self-attested bank transaction ref; the architecture §2.7 does not classify it as encrypt-at-rest).
// No piiColumn() annotations — distinct from the member_kyc_profiles / nominees / medical PII tables.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase. Header style
// mirrors member_medical_disclosures.ts.

import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId, VyawasthaShulkReceiptId } from '../ids/index.js';
import { members } from './members.js';

export const vyawasthaShulkReceipts = pgTable(
  'vyawastha_shulk_receipts',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded.
    receiptId: uuid('receipt_id').defaultRandom().primaryKey().$type<VyawasthaShulkReceiptId>(),

    // The paying member. FK → members.member_id (RTBF cascade, Story 3.12). NOT the PK.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The UPI Intent transaction-ref the SERVER minted (`signup-{memberId}-{nonce}`) — the
    // idempotency key (UNIQUE). A re-confirm with the same `tr` returns this receipt (AC1).
    tr: text('tr').notNull(),

    // The member's self-attested UPI UTR (12-digit numeric OR 22-char alphanumeric NEFT/RTGS —
    // validated permissively at the contract; NOT matcher-verified — Epic 8 reconciliation is out of
    // scope). Recorded for later audit/refund analysis (AR-67).
    utr: text('utr').notNull(),

    // The fee amount in whole INR (v1 = 110), SERVER-authoritative (never client-supplied).
    amountInr: integer('amount_inr').notNull(),

    // How the fee was paid — v1 always 'upi_intent' (the value set is constrained at the app layer,
    // not the DB — the kyc_transactions.status "text for the swap seam" posture).
    paymentMethod: text('payment_method').notNull(),

    // DB-authoritative payment instant (§1.11).
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // paid_at + 1 year — the receipt's validity horizon (forward-compat for future-benefit
    // eligibility windows; the row itself is retained indefinitely per AR-67 regardless).
    validThrough: timestamp('valid_through', { withTimezone: true, mode: 'date' }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The status / idempotency lookup key (a member's receipts within a Pariwar).
    index('vyawastha_shulk_receipts_pariwar_member_idx').on(t.pariwarId, t.memberId),
    // Story 3.8 — the renewal-lifecycle scheduler's INDEXED candidate scan: the latest receipt per
    // member (DISTINCT ON (member_id) … ORDER BY member_id, valid_through DESC) filtered on the
    // grace-end window. Additive, non-destructive (migration 0028).
    index('vyawastha_shulk_receipts_member_valid_through_idx').on(
      t.memberId,
      t.validThrough.desc(),
    ),
    // The idempotency UNIQUE (AC1) — name matches the migration constraint so the receipt-write
    // accessor can narrow the 23505 to exactly this constraint (mirror 3.6a's identity narrowing).
    unique('vyawastha_shulk_receipts_tr_uq').on(t.tr),
    // Story 3.8 D2 — payment-integrity guard: one bank UTR per pariwar (scoped to pariwar, not
    // global, for test isolation). Matches the 0029 migration constraint name for receipt-write
    // narrowing (`isReceiptPariwarUtrDuplicate`).
    unique('vyawastha_shulk_receipts_pariwar_utr_uq').on(t.pariwarId, t.utr),
  ],
);

export type VyawasthaShulkReceiptRow = typeof vyawasthaShulkReceipts.$inferSelect;
export type VyawasthaShulkReceiptInsert = typeof vyawasthaShulkReceipts.$inferInsert;
