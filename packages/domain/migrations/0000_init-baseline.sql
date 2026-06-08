-- Migration 0000 — init baseline (Story 1.2 substrate).
--
-- The `drizzle` schema houses the `__drizzle_migrations` tracking table.
-- drizzle-kit's migrator auto-creates this schema before applying migration
-- 0000, so the DDL emitted by `drizzle-kit generate` is manually patched to
-- `CREATE SCHEMA IF NOT EXISTS` to make migration 0000 idempotent end-to-end.
-- The snapshot at meta/0000_snapshot.json still records the schema as part of
-- the cumulative state; this edit is a no-op against drizzle-kit `check`.

CREATE SCHEMA IF NOT EXISTS "drizzle";
