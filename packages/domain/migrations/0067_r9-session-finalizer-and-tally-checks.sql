-- Migration 0067 — couple the finalizer-attribution fields to `outcome` and bound the tally by panel size
-- (Story 6.14 re-review, 2026-07-14; AC11).
--
-- Migration 0063 (already applied) couples `outcome` ⇄ `finalized_at` ⇄ `approve_count` ⇄ `deny_count` — all
-- move together — but left `finalized_by_actor`/`finalized_display` uncoupled: a future write-path bug could
-- leave a finalized session with a null finalizer identity and no DB-level guard would catch it. Also add a
-- CHECK bounding `approve_count + deny_count` by the immutable panel size, matching the panel-size-denominator
-- invariant `computeR9Outcome` already assumes in application code.
--
-- ⚠ A SEPARATE migration (NOT folded into 0063): 0063 was already applied, and a hand-authored migration is
-- never re-edited after apply ([[project_live_db_test_gotchas]]).

ALTER TABLE "claim_r9_voting_sessions" ADD CONSTRAINT "claim_r9_voting_sessions_outcome_finalized_by_actor_coupled" CHECK (("outcome" IS NULL) = ("finalized_by_actor" IS NULL));--> statement-breakpoint
ALTER TABLE "claim_r9_voting_sessions" ADD CONSTRAINT "claim_r9_voting_sessions_outcome_finalized_display_coupled" CHECK (("outcome" IS NULL) = ("finalized_display" IS NULL));--> statement-breakpoint
ALTER TABLE "claim_r9_voting_sessions" ADD CONSTRAINT "claim_r9_voting_sessions_tally_within_panel" CHECK ("outcome" IS NULL OR ("approve_count" + "deny_count" <= cardinality("panel_actor_ids")));
