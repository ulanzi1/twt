// `member_pariwar_selects` — single-use multi-Pariwar scope-select registry
// (Story 3.2, R2 / code-review PR-Patch-10).
//
// GLOBAL member-identity/auth carve-out, the sibling of `member_signup_continuations`.
// Issued at `/otp/verify` when one verified mobile maps to members in MULTIPLE Pariwars:
// the client must pick a scope before a full session is minted. The select token itself
// is a signed JWT (ES256, same key as the access token, short TTL) carrying the mobile
// blind index + a `jti`; this table enforces SINGLE-USE server-side so one OTP cannot be
// replayed to mint multiple full sessions (each a fresh 90d refresh) within the TTL.
// `/otp/select-pariwar`'s first call marks `consumed_at` (409 if already consumed).
//
// Only the `jti` + blind index live here — NEVER the plaintext mobile, never the token.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const memberPariwarSelects = pgTable('member_pariwar_selects', {
  // The select token's jti (PK) — the single-use anchor.
  jti: uuid('jti').primaryKey(),

  // The verified mobile's blind index (re-resolve memberships on select).
  mobileBlindIndex: text('mobile_blind_index').notNull(),

  // Short TTL (pariwarSelectTtlMs — default 5 min) + single-use burn.
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type MemberPariwarSelectRow = typeof memberPariwarSelects.$inferSelect;
export type MemberPariwarSelectInsert = typeof memberPariwarSelects.$inferInsert;
