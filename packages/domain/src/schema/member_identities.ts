// `member_identities` — member mobile-number identity row (Story 3.2, Task 1).
//
// TENANT-ISOLATED (mirrors `members` / `consent_records`, NOT the global identity-
// auth carve-out). A member belongs to exactly one Pariwar; the in-scope profile
// reads run under that Pariwar's `app.pariwar_id`. The PRE-SCOPE login-by-mobile
// lookup (the person types a mobile before any Pariwar is known) reads this table
// via the BYPASSRLS `deps.servicePool` — the exact `admin-session.handler.ts`
// posture (R2). One mobile may map to member rows in MULTIPLE Pariwars (Pariwar-
// Passport, §2.5), so the uniqueness is per-Pariwar, not global.
//
// ── Mobile is Tier-1 PII AND a login equality key → BOTH columns (§2.7) ────────
//   · `mobile_ciphertext`   — Tier-1 envelope (storage/display), non-deterministic.
//   · `mobile_blind_index`  — deterministic HMAC-SHA-256 under the FIXED
//     `MEMBER_IDENTITY_NAMESPACE` (apps/api/src/context.ts), the login lookup key.
//     NEVER the plaintext mobile; the audit trail carries masked last-4 only.
//
// The `members` table stays PII-FREE (Story 3.1 — it is the lifecycle anchor); the
// mobile lands here so the lifecycle anchor stays clean AND the pre-scope lookup is
// a single-table servicePool read. Mobile is written by the signup flow (Story 3.6)
// in-scope; Story 3.2 READS it for returning-member login.

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

export const memberIdentities = pgTable(
  'member_identities',
  {
    // One identity row per member (PK = member_id). FK → members.member_id keeps
    // referential integrity; the in-scope INSERT (Story 3.6) runs under the member's
    // Pariwar so the FK check sees the row (same RLS family). Members are never
    // row-deleted (cascade is moot); RTBF (Story 3.12) deletes THIS row in place.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .primaryKey()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Tier-1 envelope ciphertext of the normalized mobile (display/recovery).
    mobileCiphertext: text('mobile_ciphertext').notNull(),

    // Deterministic blind index (HMAC under MEMBER_IDENTITY_NAMESPACE) — the login key.
    mobileBlindIndex: text('mobile_blind_index').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The pre-scope mobile → member(s) lookup (`WHERE mobile_blind_index = $1` via
    // servicePool). NOT unique on its own — the same mobile can resolve to members
    // in several Pariwars (R2 multi-membership).
    index('member_identities_mobile_blind_index_idx').on(t.mobileBlindIndex),
    // One mobile = one member PER Pariwar (OQ-UX-15 "one phone = one member" within a
    // tenant); cross-Pariwar duplicates are allowed (the multi-membership case).
    uniqueIndex('member_identities_pariwar_mobile_uq').on(t.pariwarId, t.mobileBlindIndex),
  ],
);

export type MemberIdentityRow = typeof memberIdentities.$inferSelect;
export type MemberIdentityInsert = typeof memberIdentities.$inferInsert;
