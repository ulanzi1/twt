-- Migration 0076 — backfill genesis pool_fixed_amount_schedule rows for pre-Story-7.5 Pariwars
-- (code review finding, Story 7.5).
--
-- Story 7.5's D5 disposition explicitly named this fallback: "If provisioning-time seeding is out
-- of this story's reach, the safe interim is a one-off migration/backfill seeding the genesis row
-- per existing Pariwar." `seedGenesisFixedAmount` was wired ONLY into the Pariwar-provisioning route
-- (apps/api/src/modules/pariwar-provisioning/index.ts), so it only ever fires for Pariwars created
-- AFTER this story ships. Any Pariwar provisioned BEFORE has zero pool_fixed_amount_schedule rows and
-- would hit PoolFixedAmountNotConfiguredError (fail-loud) on its next cycle spawn — exactly the
-- failure D5 says must not happen in practice.
--
-- `pariwar_passport` (Story 1.7) is the enumerable per-Pariwar identity table — one row per
-- provisioned Pariwar, cross-readable by its own carve-out RLS policy — so it is the correct
-- enumeration source for this backfill (superseding the Dev Agent Record's now-corrected claim that
-- "there is no enumerable pariwars base table pre-Epic-3").
--
-- Idempotent: only inserts for a pariwar_id with NO existing pool_fixed_amount_schedule row at all,
-- so re-running this migration (or a Pariwar that was ALREADY correctly genesis-seeded by the live
-- provisioning route before this migration runs) is a no-op for that row. Seeds version 1,
-- change_type='standard', effective_from=now() (matches seedGenesisFixedAmount's own shape),
-- fixed_amount=500 (the documented genesis default — mirrors the retired
-- POOL_SPAWN_FIXED_AMOUNT_INR / current POOL_GENESIS_FIXED_AMOUNT_INR default; a trustee re-sets it
-- via the standard-change / emergency-override workflow post-backfill same as any genesis-seeded row).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (the 0021-0075 discipline). Hand-authored DML only.

INSERT INTO "pool_fixed_amount_schedule"
  ("pariwar_id", "version", "fixed_amount", "effective_from", "effective_until", "change_type", "created_by_actor")
SELECT
  p.pariwar_id,
  1,
  500,
  now(),
  NULL,
  'standard',
  'system:backfill-genesis-seed-0076'
FROM "pariwar_passport" p
WHERE NOT EXISTS (
  SELECT 1 FROM "pool_fixed_amount_schedule" s WHERE s.pariwar_id = p.pariwar_id
);
