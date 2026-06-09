-- Migration 0000 — init baseline (Story 1.2 substrate).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- This file was manually patched after `drizzle-kit generate` emitted it.
-- The original emitted line was `CREATE SCHEMA "drizzle"` (without IF NOT EXISTS).
-- Without `IF NOT EXISTS`, the migrator fails on any DB that already has the
-- `drizzle` schema (e.g., after a second `db:migrate` invocation), because the
-- migrator auto-creates the schema before applying migration 0000, then migration
-- 0000 itself would attempt to create it again. The IF NOT EXISTS makes 0000
-- idempotent. The snapshot at meta/0000_snapshot.json is unchanged; this patch
-- is a no-op against `drizzle-kit check`. If you must regenerate, re-apply this
-- patch manually before committing.

CREATE SCHEMA IF NOT EXISTS "drizzle";
