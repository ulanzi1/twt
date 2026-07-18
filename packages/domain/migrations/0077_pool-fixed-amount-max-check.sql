-- Migration 0077 — guard-rail ceiling on pool_fixed_amount_schedule.fixed_amount (code review
-- finding, Story 7.5).
--
-- Story 7.5 retired the boot-time POOL_SPAWN_FIXED_AMOUNT_INR env constant along with its
-- MAX_POOL_SPAWN_FIXED_AMOUNT_INR (1 crore INR) safety rail, leaving only a lower-bound (> 0) check
-- on the replacement per-Pariwar schedule. Reinstates the same ceiling as a DB CHECK (mirrors
-- pool_fixed_amount_schedule_amount_positive) so a misconfigured/fat-fingered trustee input (an
-- extra zero) cannot silently snapshot an absurd per-pool contribution via either write path.
-- Keep IN SYNC with pool/fixed-amount.ts MAX_POOL_FIXED_AMOUNT_INR.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (the 0021-0076 discipline). Hand-authored DDL only.

ALTER TABLE "pool_fixed_amount_schedule"
  ADD CONSTRAINT "pool_fixed_amount_schedule_amount_max" CHECK ("fixed_amount" <= 10000000);
