// `member_withdrawals` — the member's voluntary-withdrawal record + 12-month rejoin lock
// (Story 3.10, Task 1).
//
// The persistence the withdrawal SURFACE writes (FR-6): ONE row per member recording that they
// voluntarily withdrew (₹110 forfeited, history retained then anonymized by Story 3.12), the
// OPTIONAL exit reason, and the `rejoin_permitted_at` instant the 12-month rejoin lock lifts. The
// `members` table stays the PII-FREE lifecycle anchor (Story 3.1); the withdrawal detail lands HERE.
// The `member.withdrawal_completed` transition (frozen by Story 3.1) is the load-bearing state move —
// this row is the reason/lock sidecar the frozen `.strict()` auditShape-only event cannot carry (R1).
//
// TENANT-ISOLATED (mirrors `member_kyc_profiles` / `member_addresses`, NOT the global identity-auth
// carve-out). A withdrawal belongs to exactly one member in exactly one Pariwar; the in-scope confirm
// write runs under that Pariwar's `app.pariwar_id`. RLS in policies/member-withdrawals-rls.ts. The
// rejoin-lock READ at signup runs PRE-scope on the BYPASSRLS servicePool (member-auth.repo.ts) — a
// cross-tenant read that RLS-scoped access cannot serve (the signup handler has no scope yet).
//
// ── DEVIATION from the append-only Life Events tables (member_addresses/member_postings) ──────────
// This table GRANTs UPDATE (not INSERT-only). Two reasons: (1) the `aadhaar_hmac` seam column is
// DESIGNED to be backfilled by a later UPDATE (Story 3.3a — see below); (2) RTBF/anonymization
// (Story 3.12) may touch the row. It is a SINGLE-ROW-per-member record (PK = member_id), NOT
// append-only history — contrast member_addresses/member_postings, which are per-row INSERT-only.
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────────────
//   · reason_code            → NON-PII bounded dropdown value (contracts `WithdrawalReasonCode`);
//     stored as `text` NULLABLE (the value set is constrained in the contract, NOT at the DB — the
//     kyc_transactions.status / member_addresses.locale posture). Safe in the audit context.
//   · reason_text_ciphertext → the OPTIONAL free-text reason, Tier-1 envelope ciphertext
//     (`piiColumn(1, 'member_withdrawal')`). NEVER logged; NEVER echoed back; NEVER in any event /
//     audit payload (feeds the Story 1.16b PII-shielding CI gate). NULLABLE — the reason is optional.
//   · aadhaar_hmac           → NON-PII forward-compat SEAM (a deterministic HMAC, not raw PII; the
//     blind-index posture). NULLABLE — architecture §2.12 (line 1735) commits an Aadhaar-HMAC rejoin
//     key, but the full Aadhaar is masked to last-4 at the KYC provider boundary today (nothing to
//     HMAC at withdrawal time). v1 keys the lock on the mobile blind index (member_identities); this
//     column lets Story 3.3a backfill the architecture-committed Aadhaar-HMAC key WITHOUT a migration.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.
// Header style mirrors member_kyc_profiles.ts / member_addresses.ts.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

export const memberWithdrawals = pgTable('member_withdrawals', {
  // One withdrawal record per member (PK = member_id). FK → members.member_id keeps referential
  // integrity; the in-scope write runs under the member's Pariwar so the FK check sees the row (same
  // RLS family). RTBF (Story 3.12) deletes via cascade.
  memberId: uuid('member_id')
    .$type<MemberId>()
    .primaryKey()
    .references(() => members.memberId, { onDelete: 'cascade' }),

  // Multi-tenant scope (RLS predicate column; branded).
  pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

  // The bounded dropdown reason (contracts `WithdrawalReasonCode`). NON-PII; NULLABLE (optional).
  // `text` (not a pgEnum) — the value set is constrained in the contract, not at the DB.
  reasonCode: text('reason_code'),

  // Tier-1 envelope ciphertext of the OPTIONAL free-text reason. NULLABLE (the member may withdraw
  // with no free-text). NEVER echoed / logged / in any event or audit payload (R1).
  reasonTextCiphertext: piiColumn(1, 'member_withdrawal')('reason_text_ciphertext'),

  // When the withdrawal completed (clock-injected at the confirm handler; no raw Date.now()).
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'date' }).notNull(),

  // When the 12-month rejoin lock lifts (= withdrawn_at + 12 months; clock-injected). The signup
  // rejoin guard blocks a same-identity rejoin while `now < rejoin_permitted_at`.
  rejoinPermittedAt: timestamp('rejoin_permitted_at', { withTimezone: true, mode: 'date' }).notNull(),

  // Forward-compat SEAM for the architecture §2.12 Aadhaar-HMAC rejoin key (Story 3.3a backfill).
  // NON-PII (a deterministic HMAC). NULLABLE — v1 keys the lock on the mobile blind index; this stays
  // NULL until a later story backfills it via UPDATE (why this table grants UPDATE — header).
  aadhaarHmac: text('aadhaar_hmac'),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type MemberWithdrawalRow = typeof memberWithdrawals.$inferSelect;
export type MemberWithdrawalInsert = typeof memberWithdrawals.$inferInsert;
