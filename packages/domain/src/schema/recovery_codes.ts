// `recovery_codes` — one-time-use backup codes (Story 1.9, AC-2).
//
// GLOBAL (carve-out family, R2). 10 provisioned at first WebAuthn enrollment,
// stored HASHED (never plaintext, §2.3). Each consumption is audited and the code
// burned (`consumed_at` set) — a consumed code never re-authorizes.

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { UserId } from '../ids/index.js';
import { users } from './users.js';

export const recoveryCodes = pgTable(
  'recovery_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // The hashed recovery code (never the plaintext).
    codeHash: text('code_hash').notNull(),

    // NULL = unused. Set (burned) on consumption — single-use.
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [index('recovery_codes_user_idx').on(t.userId)],
);

export type RecoveryCodeRow = typeof recoveryCodes.$inferSelect;
export type RecoveryCodeInsert = typeof recoveryCodes.$inferInsert;
