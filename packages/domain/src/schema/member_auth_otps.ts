// `member_auth_otps` — member login + step-up OTP state (Story 3.2, Tasks 2 + 7).
//
// GLOBAL member-identity/auth carve-out (mirrors `step_up_otps`, R2): the login OTP
// is minted BEFORE any Pariwar scope is known (keyed by the mobile blind index), so
// this table cannot be tenant-RLS-scoped. Stores ONLY the OTP hash (never the code,
// §2.2) + TTL + single-use burn (`consumed_at`) + an attempt counter.
//
// ── Distinct OTP pools per intent (§2.2 line 1379) ────────────────────────────
// `intent` ('login' | 'step_up') separates the pools so a concurrent login-OTP and
// step-up-OTP can never share a value/slot. invalidate-on-next is keyed per
// (mobile_blind_index, intent) so minting a fresh login OTP does not burn a live
// step-up OTP and vice-versa.
//
// ── member_id is NULLABLE (R5) ────────────────────────────────────────────────
// At FIRST signup the member row does not exist yet (Story 3.6 mints member_id as
// the event-stream id), so a login OTP is keyed only by the mobile blind index;
// `member_id` is null. Returning-login + all step-up OTPs carry it.

import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId } from '../ids/index.js';

/** The two distinct member-OTP pools (§2.2 line 1379). */
// ⚠ Story 10.21 (migration 0104) added `data_export_delivery` — a DISTINCT pool for the member-direct
// export delivery grant. ⛔ It could NOT reuse `step_up`: `invalidateLiveOtps` clears the live OTP per
// (mobile, intent), so a shared pool would make a delivery OTP and a step-up OTP silently burn each
// other — a member mid-step-up would lose their delivery code, and vice versa, with no error anywhere.
// ⚠ TTL — REVISED (code-review decision, this story). `requestOtp` originally mapped this intent onto
// `stepUpOtpTtlMs` (3 min), on the reasoning that a SHORT TTL makes `primary_delivery_not_completed`
// resolve promptly. In review that was found to cut the other way: a 3-minute window lets element 2 of
// the AC-R1 fallback gate go true for ANY member who simply had not looked at their phone yet — not
// only one for whom the primary route had genuinely failed — which undercuts the gate's own stated
// purpose ("unreachable until the primary has genuinely been tried and failed", `2026-08-14-113` cl.1).
// `requestOtp` now maps this intent onto its OWN `dataExportDeliveryOtpTtlMs` (60 min, distinct from
// BOTH `loginOtpTtlMs` and `stepUpOtpTtlMs`). ⚠ This does NOT fully resolve the underlying tension —
// there remains no machine-verifiable signal that distinguishes "genuinely lost the mobile" from
// "hasn't checked it in an hour" (see `delivery.ts`'s `primaryDeliveryNotCompletedAt` header) — it only
// moves the false-positive window from minutes to an hour. Element 3 (the staff attestation) remains
// the load-bearing control for that distinction, by design.
export const MEMBER_OTP_INTENTS = ['login', 'step_up', 'data_export_delivery'] as const;
export type MemberOtpIntent = (typeof MEMBER_OTP_INTENTS)[number];
export const memberOtpIntentEnum = pgEnum('member_otp_intent', MEMBER_OTP_INTENTS);

export const memberAuthOtps = pgTable(
  'member_auth_otps',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // The OTP destination — present for BOTH intents (the mobile is the anchor).
    mobileBlindIndex: text('mobile_blind_index').notNull(),

    // NULL at first-signup login (no member yet, R5); set for returning login + step-up.
    // Plain uuid (no FK): this GLOBAL table is written pre-scope, and a cross-family FK
    // to the RLS-forced `members` would fail the FK check when no scope is set.
    memberId: uuid('member_id').$type<MemberId>(),

    // Pool discriminator — login vs step_up (distinct pools, §2.2).
    intent: memberOtpIntentEnum('intent').notNull(),

    // The gated operation (required for step_up; null for login).
    actionContext: text('action_context'),

    // The hash of the single-use code (never the code itself, §2.2).
    otpHash: text('otp_hash').notNull(),

    // TTL (login 5 min, step-up 3 min) + single-use burn + attempt counter.
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    attempts: integer('attempts').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // "latest live OTP for this (mobile, intent)" lookup (invalidate-on-next + verify).
    index('member_auth_otps_mobile_intent_idx').on(t.mobileBlindIndex, t.intent),
  ],
);

export type MemberAuthOtpRow = typeof memberAuthOtps.$inferSelect;
export type MemberAuthOtpInsert = typeof memberAuthOtps.$inferInsert;
