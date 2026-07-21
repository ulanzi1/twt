// `claim_nominee_bank_accounts` — the claim-time dual disbursement accounts (Story 6.8, Task 3).
//
// ONE row per account, ranked #1 (primary) / #2 (secondary), keyed on the COMPOSITE PK
// `(claim_case_id, account_rank)` (the `member_nominees` `(member_id, rank)` precedent — a claim
// has at most one #1 and one #2). The two accounts are a CLAIM-SCOPED dual-account DISBURSEMENT
// CHANNEL — a RBI-UPI-per-payee-per-day-limit workaround + failover (D1 APPROVED) — NOT one row
// per declared nominee and NOT the 75/25 nominee split (that lives on `member_nominees.split_pct`,
// Story 3.4, an entirely separate concept). So there is deliberately NO `nominee_rank` column, NO
// FK to `member_nominees`, and NO holder-name-must-match-nominee linkage of any kind: the filer
// types a holder name per account, full stop.
//
// Bank collection is an ANNOTATION (D2) — it does NOT advance the claim's lifecycle state. This
// table has NO state trigger; `account_rank` / `ifsc_validated` / `bank_name` / `branch` are
// ordinary tenant-isolated columns (the peer-mesh `outcome` / ground-inspection `status` posture).
// The `claim.nominee_bank_recorded` identity annotation is emitted via `claim.projectClaimState`.
//
// ── PII discipline (D6 — architecture §2.7:1504-1505) ─────────────────────────────────
//   · account_holder_name / account_number / ifsc → Tier-1 envelope ciphertext
//     (`piiColumn(1, 'claim_nominee_bank')`). Encrypt-before-insert in the route; the read
//     accessor returns ciphertext AS STORED (the consumer decrypts). NEVER logged / echoed.
//   · vpa → Tier-1 envelope ciphertext, per-account, OPTIONAL (Story 8.13, migration 0080). The
//     nominee's own UPI VPA for the `pa=` payee (money IN, member → nominee — the payee side ONLY,
//     NOT the Story 9.4 sender/member VPA). NULLABLE by design — a nominee without a VPA is a
//     first-class state; the account#+IFSC disbursement path is unaffected and VPA is NEVER a
//     frozen-gate. Same field class as the three fields above → symmetric encrypt/decrypt.
//   · bank_name / branch → Tier-3 plaintext (public, IFSC-derived, non-identifying).
//   · account_rank (1/2) + ifsc_validated (bool) → non-PII plain columns.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_ground_inspections`). RLS in
// policies/claim-nominee-bank-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

export const claimNomineeBankAccounts = pgTable(
  'claim_nominee_bank_accounts',
  {
    // The claim this account is filed against (FK → claims; branded ClaimId == the events_log
    // stream_id). ON DELETE CASCADE mirrors claim_ground_inspections / claim_documents. Part of the PK.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Disbursement account rank: 1 = primary (#1), 2 = secondary (#2). Part of the composite PK
    // (a claim holds at most one #1 and one #2). NOT a nominee rank — D1 APPROVED (no nominee linkage).
    accountRank: smallint('account_rank').notNull(),

    // ── PII — Tier-1 envelope ciphertext (encrypt-before-insert; ciphertext AS STORED) ──
    accountHolderNameCiphertext: piiColumn(1, 'claim_nominee_bank')('account_holder_name_ciphertext').notNull(),
    accountNumberCiphertext: piiColumn(1, 'claim_nominee_bank')('account_number_ciphertext').notNull(),
    ifscCiphertext: piiColumn(1, 'claim_nominee_bank')('ifsc_ciphertext').notNull(),

    // The nominee's UPI VPA for the `pa=` payee — Tier-1 ciphertext, OPTIONAL (Story 8.13, migration
    // 0080). NULLABLE: a nominee without a VPA is a first-class state (do NOT chain `.notNull()`).
    vpaCiphertext: piiColumn(1, 'claim_nominee_bank')('vpa_ciphertext'),

    // ── Tier-3 plaintext — public, IFSC-derived, non-identifying ──
    bankName: text('bank_name').notNull(),
    branch: text('branch'),

    // Whether the IFSC passed format + branch lookup at claim time (D4). Non-PII.
    ifscValidated: boolean('ifsc_validated').notNull().default(false),

    // The actor who recorded this account (audit; non-PII actor id). Nullable.
    recordedByActor: text('recorded_by_actor'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Composite PK (claim_case_id, account_rank) — the member_nominees (member_id, rank) precedent.
    primaryKey({ columns: [t.claimCaseId, t.accountRank] }),
    // Per-tenant scans / RLS-aware planner hint (pariwar_id + claim_case_id — the read accessor filter).
    index('claim_nominee_bank_accounts_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    // Defense-in-depth behind NomineeBankAccountSetError (review finding, 2026-07-11) — the {1, 2}
    // invariant is app-enforced today; this backstops a direct/future writer that bypasses the app.
    check('claim_nominee_bank_accounts_account_rank_check', sql`${t.accountRank} IN (1, 2)`),
  ],
);

export type ClaimNomineeBankAccountRow = typeof claimNomineeBankAccounts.$inferSelect;
export type ClaimNomineeBankAccountInsert = typeof claimNomineeBankAccounts.$inferInsert;
