// `member_signup_continuations` — single-use signup-continuation registry (Story 3.2, R5).
//
// GLOBAL member-identity/auth carve-out (R5): issued at `/otp/verify` when the
// verified mobile maps to NO existing member (first signup). The continuation token
// itself is a signed JWT (ES256, same key as the access token, TTL 30 min) carrying
// the mobile blind index as the identity anchor + a `jti`; this table enforces
// SINGLE-USE server-side. Story 3.6's first call marks `consumed_at` (409 if already
// consumed) and creates the member + upgrades to a full session.
//
// Only the `jti` + blind index live here — NEVER the plaintext mobile, never the token.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const memberSignupContinuations = pgTable('member_signup_continuations', {
  // The token's jti (PK) — the single-use anchor.
  jti: uuid('jti').primaryKey(),

  // The verified mobile's blind index (Story 3.6 looks up + creates the member by it).
  mobileBlindIndex: text('mobile_blind_index').notNull(),

  // 30-min TTL (R5 — spans the full signup wizard) + single-use burn.
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type MemberSignupContinuationRow = typeof memberSignupContinuations.$inferSelect;
export type MemberSignupContinuationInsert = typeof memberSignupContinuations.$inferInsert;
