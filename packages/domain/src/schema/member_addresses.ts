// `member_addresses` — the member's address history (Story 3.9, Task 2).
//
// The address a member updates through the Life Events panel (FR-5). The raw address line lands
// HERE Tier-1-encrypted, while the `member.address_updated` event records only the non-PII
// presence marker on the stream (R1). Architecture §2.7 tiers a member address as Tier-1 (the
// PII-stripping field list includes `address`).
//
// ── APPEND-ONLY history — "prior value preserved" (AC1) ──────────────────────────────────
// AC1 requires the prior address be PRESERVED as history (NOT overwritten). So this table is
// APPEND-ONLY, mirroring `member_medical_disclosures` (NOT latest-wins like `member_nominees`):
// the PK is a PER-ROW `address_id`, a NEW row per update, and the migration GRANT is SELECT +
// INSERT only (no UPDATE, no DELETE beyond the FK cascade — immutable history). The "current"
// address is simply the newest row by `created_at` (getMemberAddressLatest).
//
// ── DEVIATION (Story 3.12 RTBF) ──────────────────────────────────────────────────────────
// Migration 0034 adds a NARROW column-level UPDATE grant on `address_line_ciphertext` ONLY, so
// RTBF anonymization (member/anonymize.ts) can overwrite the Tier-1 ciphertext with the anonymized
// sentinel. The rest of the row stays immutable; the FOR ALL tenant write policy already permits it.
//
// TENANT-ISOLATED (mirrors `member_medical_disclosures` / `members`). An address belongs to
// exactly one member in exactly one Pariwar; the in-scope update write + the history read run
// under that Pariwar's `app.pariwar_id`. RLS in policies/member-addresses-rls.ts. Every access
// is in-scope — there is NO pre-scope path (the Life Events routes are member-session-gated).
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────
//   · address_line → Tier-1 envelope ciphertext (`piiColumn(1, 'member_address')`). NEVER
//     logged; NEVER echoed back (the summary uses a presence flag). The `piiColumn(tier,
//     fieldClass)` annotation feeds the Story 1.16b PII-shielding CI gate.
//   · locale → NON-PII metadata (which locale the form was filled in; 'hi' | 'en').
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.
// Header style mirrors member_medical_disclosures.ts.

import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { AddressId, MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

export const memberAddresses = pgTable(
  'member_addresses',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded `AddressId`. A NEW
    // id per update — multiple rows over time are BY DESIGN (append-only history; cf.
    // member_medical_disclosures' per-row disclosure_id).
    addressId: uuid('address_id').defaultRandom().primaryKey().$type<AddressId>(),

    // The member whose address this is. FK → members.member_id keeps referential integrity; the
    // in-scope write runs under the member's Pariwar so the FK check sees the row (same RLS
    // family). RTBF (Story 3.12) deletes via cascade. NOT `.primaryKey()` — the PK is address_id.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the member's address line. Always
    // non-null (an address update always carries an address).
    addressLineCiphertext: piiColumn(1, 'member_address')('address_line_ciphertext').notNull(),

    // Which locale the form was filled in ('hi' | 'en'). NON-PII. The value set is constrained in
    // the contract, NOT at the DB (the kyc_transactions.status "text for the swap seam" posture).
    locale: text('locale').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The history-read lookup key (walk a member's addresses within a Pariwar, newest first).
    index('member_addresses_pariwar_member_idx').on(t.pariwarId, t.memberId),
  ],
);

export type MemberAddressRow = typeof memberAddresses.$inferSelect;
export type MemberAddressInsert = typeof memberAddresses.$inferInsert;
