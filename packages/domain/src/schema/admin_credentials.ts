// `admin_credentials` — first-factor password + the admin email (Story 1.9, AC-1).
//
// 1:1 with `users` (PK = user_id, FK → users.id). GLOBAL (carve-out family, R2).
//
// EMAIL IS TIER-1 PII (§2.7) but login is an equality lookup by email, and Tier-1
// ciphertext is non-deterministic (per-row DEK) so it cannot be queried. So the
// email is stored TWICE: `email_ciphertext` (Tier-1 envelope, for display/recovery)
// + `email_blind_index` (Tier-2 deterministic HMAC, UNIQUE, the login lookup key).
// Login = blindIndex(email) → unique-index hit → row → verify password/passkey.
// NEVER a plaintext email column; NEVER a plaintext lookup. The piiColumn(tier,…)
// annotations feed the Story 1.16b PII-shielding CI gate (D8-1.5).
//
// `password_hash` is the Argon2id(@node-rs/argon2) encoded string, PEPPERED via
// Argon2's keyed mode (the `secret` param, sourced from Secret Manager) — the
// pepper is NOT stored here (§2.3). Lockout counters live here (AC-1).

import { integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { UserId } from '../ids/index.js';
import { users } from './users.js';

export const adminCredentials = pgTable(
  'admin_credentials',
  {
    // PK = FK → users.id (1:1). Branded UserId at the TS layer.
    userId: uuid('user_id')
      .$type<UserId>()
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Tier-1 envelope ciphertext of the email (serialized `enc:v1:…` string).
    emailCiphertext: piiColumn(1, 'admin_email')('email_ciphertext').notNull(),

    // Tier-2 blind index (HMAC-SHA-256, deterministic) — the login equality key.
    emailBlindIndex: piiColumn(2, 'admin_email')('email_blind_index').notNull(),

    // Argon2id encoded hash (peppered via the secret param; pepper NOT stored).
    passwordHash: piiColumn(1, 'admin_password_hash')('password_hash').notNull(),

    // Lockout counters (AC-1). `locked_until` NULL = not locked.
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The login lookup index — UNIQUE so one email maps to exactly one admin.
    uniqueIndex('admin_credentials_email_blind_index_uq').on(t.emailBlindIndex),
  ],
);

export type AdminCredentialRow = typeof adminCredentials.$inferSelect;
export type AdminCredentialInsert = typeof adminCredentials.$inferInsert;
