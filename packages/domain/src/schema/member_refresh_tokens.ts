// `member_refresh_tokens` — member session refresh-token store (Story 3.2, Task 3).
//
// GLOBAL member-identity/auth carve-out (R2): the refresh endpoint runs pre-scope
// (the client posts only the opaque token; no Pariwar cookie). Members use the §2.4
// hybrid: short-lived access JWT (≤15 min) + an OPAQUE high-entropy refresh token
// (NOT a JWT) stored HASHED here, rotated-on-use, per-device bound, 90-day TTL (R1).
//
// ── Rotation-on-use + reuse detection (§2.4) ──────────────────────────────────
// Each refresh mints a new token + stamps `rotated_at` on the prior row. Presenting
// an already-rotated (or revoked) token signals theft → the device's whole chain is
// revoked (`member_session.reuse_revoke` audit). `device_id` is sourced from THIS
// row on refresh (never the client) so the rotated token stays bound to one device.
// Refresh-token deletion/`revoked_at` is the revocation mechanism (§2.4 line 1426);
// `revokeAllMemberSessions(memberId)` (suspension cascade, §2.4 line 1428) clears them.

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';

export const memberRefreshTokens = pgTable(
  'member_refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Plain uuid (no FK to the RLS-forced `members`; this global table is pre-scope).
    memberId: uuid('member_id').$type<MemberId>().notNull(),

    // The session's Pariwar scope — self-describing so a rotated token reissues the
    // access token for the SAME scope (correct even when a multi-Pariwar member holds
    // sessions in several Pariwars on the same device).
    pariwarId: uuid('pariwar_id').$type<PariwarId>().notNull(),

    // The trusted device this refresh chain is bound to (client-supplied stable id).
    deviceId: text('device_id').notNull(),

    // SHA-256 of the opaque token (never the token itself).
    tokenHash: text('token_hash').notNull(),

    // 90-day TTL (R1) + rotation/revocation stamps (single-use rotation chain).
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Lookup-on-refresh by token hash (unique — one row per minted token).
    uniqueIndex('member_refresh_tokens_token_hash_uq').on(t.tokenHash),
    // Suspension cascade + device-chain revocation scan (revokeAllMemberSessions).
    index('member_refresh_tokens_member_idx').on(t.memberId),
    // Device-chain revoke on reuse detection.
    index('member_refresh_tokens_member_device_idx').on(t.memberId, t.deviceId),
  ],
);

export type MemberRefreshTokenRow = typeof memberRefreshTokens.$inferSelect;
export type MemberRefreshTokenInsert = typeof memberRefreshTokens.$inferInsert;
