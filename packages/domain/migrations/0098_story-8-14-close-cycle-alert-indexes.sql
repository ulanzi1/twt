-- Migration 0098 — close-of-cycle sweep index backing (Story 8.14, Review Finding). Two indexes only.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0097): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration (re-CREATE TABLE for
-- every table added since 0021, including `alerts` and `cycle_freeze_commits` themselves) and raises
-- 42P07 against an already-applied schema. This file is HAND-AUTHORED, carrying ONLY these two indexes.
-- No snapshot file is emitted.
--
-- The close-of-cycle sweep (`apps/jobs/src/scheduler/close-cycle-alert.ts`) runs hourly, cross-tenant,
-- BYPASSRLS, and its own header comment calls `cycle_freeze_commits.committed_at` "an indexed
-- prefilter" — it wasn't. Neither the `alerts.current_state = 'live'` filter nor the
-- `cycle_freeze_commits.committed_at <= $1 ORDER BY committed_at ASC` clause had a supporting index.

-- `live` is a small minority of `alerts` rows once cycles start closing/settling — a partial index
-- keeps the sweep's `WHERE current_state = 'live'` filter an index scan as the table grows.
CREATE INDEX "alerts_current_state_live_idx" ON "alerts" USING btree ("current_state") WHERE current_state = 'live';--> statement-breakpoint

-- Backs both the sweep's `committed_at <= $1` filter and its `ORDER BY committed_at ASC` clause.
CREATE INDEX "cycle_freeze_commits_committed_at_idx" ON "cycle_freeze_commits" USING btree ("committed_at");
