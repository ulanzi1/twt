-- Migration 0057 — CHECK constraint on claim_nominee_bank_accounts.account_rank (code review
-- follow-up on Story 6.8, 2026-07-11).
--
-- 0056 enforces the {1, 2} account-rank invariant only in application code
-- (`NomineeBankAccountSetError` in packages/domain/src/claim/nominee-bank-persist.ts). This adds
-- the DB-level backstop other rank-like columns in this codebase get, matching the drizzle schema
-- `check()` added alongside this migration in packages/domain/src/schema/claim_nominee_bank_accounts.ts.
--
-- ⚠ DO NOT fold this into 0056 — 0056 is already applied (drizzle skips by journal `when`, not SQL
-- hash, so editing an applied migration silently drops the change and risks 42P07 on a fresh apply).
-- See [[project_live_db_test_gotchas]].

ALTER TABLE "claim_nominee_bank_accounts"
  ADD CONSTRAINT "claim_nominee_bank_accounts_account_rank_check" CHECK ("account_rank" IN (1, 2));
