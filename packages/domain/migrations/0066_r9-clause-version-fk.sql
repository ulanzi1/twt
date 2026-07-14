-- Migration 0066 — add FK constraints on `clause_version_id` for the R9 voting tables (Story 6.14 code
-- review, 2026-07-14; AC2/AC11).
--
-- `claim_r9_voting_sessions.clause_version_id` (the registry snapshot resolved via `resolveByClauseId` at
-- open) and `claim_r9_votes.clause_version_id` (copied from the session at cast time) both reference
-- `clause_versions.clause_version_id` (Story 2.3) at the application layer, but migration 0063 (already
-- applied) did not declare the FK constraint — unlike the four other FKs on these tables. Add it here.
--
-- ⚠ A SEPARATE migration (NOT folded into 0063): 0063 was already applied, and a hand-authored migration is
-- never re-edited after apply ([[project_live_db_test_gotchas]]). Drizzle's generated FK name convention
-- (`<table>_<column>_fk`) is followed for consistency with the constraints 0063 already created.

ALTER TABLE "claim_r9_voting_sessions" ADD CONSTRAINT "claim_r9_voting_sessions_clause_version_id_fk" FOREIGN KEY ("clause_version_id") REFERENCES "public"."clause_versions"("clause_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_r9_votes" ADD CONSTRAINT "claim_r9_votes_clause_version_id_fk" FOREIGN KEY ("clause_version_id") REFERENCES "public"."clause_versions"("clause_version_id") ON DELETE no action ON UPDATE no action;
