// `member_nominees` — the member's declared nominee row-set (Story 3.4, Task 1).
//
// The SECOND member-PII table after 3.3b's `member_kyc_profiles`, and the persistence the
// 3.4 nominee-declaration SURFACE writes: one row per declared nominee (1 or 2), keyed on
// the COMPOSITE PK `(member_id, rank)`. `members` stays the PII-FREE lifecycle anchor
// (Story 3.1); nominee identity lands HERE so a re-declaration (latest-wins, delete-then-
// insert) replaces the effective row-set and the `member.nominees_declared` event records
// only the non-PII audit (count + split) on the stream (R1).
//
// TENANT-ISOLATED (mirrors `member_kyc_profiles` / `members`, NOT the global identity-auth
// carve-out). A nominee belongs to exactly one member in exactly one Pariwar; the in-scope
// declare write + the status read run under that Pariwar's `app.pariwar_id`. RLS in
// policies/member-nominees-rls.ts. Every nominee access is in-scope — there is NO pre-scope
// path (the declare/status routes are fully member-session-gated; cf. kyc.repo's callback).
//
// ── PII discipline (Dev Notes §"Nominee field sensitivity") ───────────────────────────
//   · name / mobile / address → Tier-1 envelope ciphertext (`piiColumn(1, 'member_nominee')`).
//     Unlike the MEMBER name (Tier-2 blind-indexed for dedup/search), a nominee name is never
//     searched or deduped, so plain Tier-1 ciphertext is correct. address is NULLABLE (AC1
//     marks it optional). NEVER logged; NEVER echoed back (the summary uses presence flags).
//   · relationship → Tier-3 plaintext text: low-sensitivity, not a direct identifier. The
//     value set is constrained in the contracts enum (data quality), NOT at the DB.
// The `piiColumn(tier, fieldClass)` annotations feed the Story 1.16b PII-shielding CI gate.
//
// ── CRITICAL: composite PK (member_id, rank) — NOT the kyc single-column pattern ──────
// A member declares 1–2 nominees, so `member_id` alone is NOT unique. The PK is
// `(member_id, rank)` where `rank smallint ∈ {1, 2}` (the third-argument `primaryKey({...})`
// pattern from `otp_rate_buckets.ts` — `member_kyc_profiles.ts`'s single-column PK cannot
// be mirrored here). `member_id` carries an FK → `members.member_id` `onDelete: 'cascade'`
// so RTBF (Story 3.12) sweeps the nominee rows when the member is deleted.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.
// Header style mirrors member_kyc_profiles.ts.

import { pgTable, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

export const memberNominees = pgTable(
  'member_nominees',
  {
    // The declaring member. FK → members.member_id keeps referential integrity; the in-scope
    // declare write runs under the member's Pariwar so the FK check sees the row (same RLS
    // family). RTBF (Story 3.12) deletes via cascade. NOT `.primaryKey()` — see composite PK below.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Nominee rank within the member's declaration: 1 = primary, 2 = secondary. Part of the PK.
    rank: smallint('rank').notNull(),

    // Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the nominee's name.
    nameCiphertext: piiColumn(1, 'member_nominee')('name_ciphertext').notNull(),

    // Tier-3 plaintext relationship label (e.g. spouse | child | parent | sibling | other).
    // Low-sensitivity, not a direct identifier; the value set is constrained in the contracts
    // enum, NOT at the DB (the kyc_transactions.status "text for the swap seam" posture).
    relationship: text('relationship').notNull(),

    // Tier-1 envelope ciphertext of the nominee's mobile (architecture §2.7 lists Mobile as Tier-1).
    mobileCiphertext: piiColumn(1, 'member_nominee')('mobile_ciphertext').notNull(),

    // Tier-1 envelope ciphertext of the nominee's address. NULLABLE — AC1 marks address optional.
    addressCiphertext: piiColumn(1, 'member_nominee')('address_ciphertext'),

    // Server-DERIVED split (R4): 100 for a sole nominee; 75 (rank 1) / 25 (rank 2) for two.
    // NEVER a client-supplied value — the server stamps it from the nominee count (Task 6).
    splitPct: smallint('split_pct').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  // Composite PK (member_id, rank) — the otp_rate_buckets.ts third-argument pattern.
  (t) => [primaryKey({ columns: [t.memberId, t.rank] })],
);

export type MemberNomineeRow = typeof memberNominees.$inferSelect;
export type MemberNomineeInsert = typeof memberNominees.$inferInsert;
