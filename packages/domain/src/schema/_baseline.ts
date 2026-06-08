// Baseline schema for migration zero (0000_init-baseline).
//
// drizzle-kit needs at least one declaration to emit a migration. We declare
// the `drizzle` metadata schema explicitly so migration 0000 has substantive
// (one-line) DDL that proves the toolchain pipe + lands a row in
// `drizzle.__drizzle_migrations` for the AC-1 idempotency verification.
//
// The emitted SQL is manually patched in `migrations/0000_init-baseline.sql`
// to `CREATE SCHEMA IF NOT EXISTS "drizzle"` because drizzle-kit's migrator
// auto-creates the metadata schema BEFORE applying migration 0000 — without
// `IF NOT EXISTS`, the first apply would fail. See the migration file's
// header comment for the rationale.
//
// Substantive table declarations land in downstream Story schemas.

import { pgSchema } from 'drizzle-orm/pg-core';

export const drizzleMetadataSchema = pgSchema('drizzle');
