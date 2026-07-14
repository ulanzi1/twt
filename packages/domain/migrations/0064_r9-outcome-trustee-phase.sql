-- Migration 0064 — add the `r9_outcome` value to the state_trustee_decision_phase enum (Story 6.14, Task 4).
--
-- `finalizeR9Outcome` (r9-voting-persist.ts) writes ONE `claim_state_trustee_decisions` `phase='r9_outcome'`
-- metadata row per claim (AC0/AC4) — the R9 panel resolution surfaced on the same trustee decision transcript
-- as the freeze/vote/commit/routing phases. The `state_trustee_decision_phase` enum (migration 0062) does not
-- carry that value, so extend it here.
--
-- ⚠ A SEPARATE migration (NOT folded into 0063): 0063 was already applied, and a hand-authored migration is
-- never re-edited after apply (the drizzle journal skips by `when`, not SQL hash — [[project_live_db_test_gotchas]]).
-- ALTER TYPE ... ADD VALUE is permitted inside the migrator's transaction (PG 12+) BECAUSE the new value is
-- only ADDED here, never USED in the same transaction. `IF NOT EXISTS` keeps a re-run a no-op.

ALTER TYPE "public"."state_trustee_decision_phase" ADD VALUE IF NOT EXISTS 'r9_outcome';
