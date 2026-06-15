// `idempotency_keys` table — Story 1.12 substrate (Task 2, AC-2 / DD-2).
//
// The keyed store that makes queue consumers replay-safe: a handler `claim`s a
// key, runs once, `recordResult`s its output, and any later run with the same key
// observes the SAME stored result instead of re-executing (AC-4). The advisory-
// lock + ON CONFLICT mechanics live in packages/domain/src/idempotency/keyed-store.ts;
// this file is the table shape only.
//
// Source of truth: epics.md L1214-1230 (Story 1.12 + AR-58); the story file's DD-2
// (GLOBAL table, MUTABLE, RLS USING(true) WITH CHECK(true) carve-out); architecture
// §1.4 ("Postgres advisory locks + an idempotency-key table with TTL cleanup via
// pg-boss-scheduled vacuum job").
//
// ── GLOBAL, not tenant-scoped (DD-2) ──────────────────────────────────────────
// The keyed store is a cross-cutting infra primitive consumed by BOTH background
// workers (service pool / BYPASSRLS — no `app.pariwar_id` set) AND apps/api request
// handlers. Keys are domain-natural globally-unique strings; CALLERS namespace them
// with the tenant id where needed (e.g. `upi:${pariwarId}:${memberId}:${alertId}`).
// So there is no `pariwar_id` column — same GLOBAL class as audit_integrity_checks
// (Story 1.11a) and the identity/auth carve-out family. RLS is still ENABLE+FORCE'd
// for Story-1.6 regime-consistency, with a permissive `USING(true)` carve-out
// (policies/idempotency-keys-rls.ts / migration 0013).
//
// ── MUTABLE, NOT append-only (DD-2) ───────────────────────────────────────────
// Unlike audit_integrity_checks (INSERT-only verdict ledger), this table is
// mutated in normal operation: `recordResult` UPDATEs the row, expired-key reclaim
// UPDATEs it, and the TTL vacuum DELETEs expired rows (AC-5). So it gets the
// MUTABLE grant set (SELECT, INSERT, UPDATE, DELETE — the migration 0004
// `role_grants` pattern) and DELIBERATELY carries NO reject-mutation triggers
// (contrast the 0001/0006/0008 append-only tables).
//
// ── Naming discipline (architecture L3663-3677) ───────────────────────────────
//   - DB columns snake_case (created_at, completed_at, expires_at)
//   - TS field names camelCase (createdAt, completedAt, expiresAt)

import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** A claimed idempotency key is either still running (`pending`) or done (`completed`). */
export type IdempotencyKeyStatus = 'pending' | 'completed';

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    // The caller-supplied, globally-unique idempotency key (natural PK). Callers
    // namespace tenant operations into the key string (see header).
    key: text('key').primaryKey(),

    // Claim lifecycle: 'pending' after claim() acquires, 'completed' after
    // recordResult() persists the result. getResult() only returns for 'completed'.
    status: text('status').$type<IdempotencyKeyStatus>().notNull(),

    // The stored result, written by recordResult(). NULL while pending (or never
    // recorded). jsonb so getResult() returns the parsed value to both callers.
    result: jsonb('result'),

    // When the key was first claimed (or last reclaimed after expiry). Set from the
    // injected clock by the keyed store; defaultNow() is a DB-authoritative safety
    // net for any raw INSERT path.
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // When recordResult() completed the key. NULL while pending.
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),

    // TTL boundary: a key whose expires_at is in the past is treated as absent
    // (claim() reclaims it; the vacuum DELETEs it — AC-5). Set from clock()+ttl.
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    // Drives the TTL vacuum's `DELETE … WHERE expires_at < now()` (AC-5) and the
    // expired-row reclaim probe inside claim().
    index('idempotency_keys_expires_at_idx').on(t.expiresAt),
  ],
);

// Inferred row types for the keyed store (claim / recordResult / getResult).
export type IdempotencyKeyRow = typeof idempotencyKeys.$inferSelect;
export type IdempotencyKeyInsertRow = typeof idempotencyKeys.$inferInsert;
