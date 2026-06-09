// Baseline schema placeholder for migration zero (0000_init-baseline).
//
// Migration 0000 has already been emitted (`migrations/0000_init-baseline.sql`)
// and the bootstrap `pgSchema('drizzle')` declaration that produced it has
// been removed from this file: keeping it would re-emit `CREATE SCHEMA "drizzle"`
// into migration 0001+ snapshots (without IF NOT EXISTS) and repeat the
// idempotency hole the 0000 hand-patch was authored to close. The migrator
// auto-creates the `drizzle` metadata schema before applying any migration,
// and 0000.sql holds the `IF NOT EXISTS` guard for re-application.
//
// Substantive table declarations land in downstream Story schemas
// (Stories 1.3 / 1.5 / 1.6 / 1.7 / 1.10 / 1.12 per architecture §1.x).
// This file remains as a marker so the directory has a baseline anchor.

export {};
