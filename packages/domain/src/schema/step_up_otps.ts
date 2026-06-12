// `step_up_otps` — step-up OTP mechanism state (Story 1.9, AC-4).
//
// GLOBAL (carve-out family, R2). Stores ONLY the OTP hash (never the code, §2.2) +
// TTL (3 min) + the `action_context` the elevation gates + an INFORMATIONAL
// `pariwar_id` (the step-up may be requested inside an active scope, but the OTP
// itself is a global admin-identity artifact — not RLS-scoped). `consumed_at`
// burns the code (single-use); `attempts` backs the per-actor rate budget.
//
// Delivery is seamed (StepUpOtpDeliveryPort) — the real SMS-DLT transport is Story
// 5.6/5.9 (Reconciliation R3). This table is the mechanism's persistence only.

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';
import { users } from './users.js';

export const stepUpOtps = pgTable(
  'step_up_otps',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // The hash of the single-use code (never the code itself).
    otpHash: text('otp_hash').notNull(),

    // The operation the step-up gates (tagged into the audit line).
    actionContext: text('action_context').notNull(),

    // Informational only — the active Pariwar when requested. NOT an RLS key.
    pariwarId: uuid('pariwar_id').$type<PariwarId>(),

    // TTL (3 min) + single-use burn + attempt counter (abuse budget).
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    attempts: integer('attempts').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The "latest live OTP for this actor" lookup (invalidate-on-next + verify).
    index('step_up_otps_user_idx').on(t.userId),
  ],
);

export type StepUpOtpRow = typeof stepUpOtps.$inferSelect;
export type StepUpOtpInsert = typeof stepUpOtps.$inferInsert;
