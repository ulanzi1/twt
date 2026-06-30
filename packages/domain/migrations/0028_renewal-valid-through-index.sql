-- Migration 0028 — vyawastha_shulk_receipts.(member_id, valid_through DESC) index (Story 3.8, Task 5).
--
-- The renewal-lifecycle scheduler (apps/jobs member-renewal-lifecycle cron) selects its CANDIDATE
-- members via an INDEXED scan — the LATEST receipt per member (DISTINCT ON (member_id) … ORDER BY
-- member_id, valid_through DESC) filtered on `valid_through <= today + 91d` (the grace-end window). This
-- composite index serves both the per-member latest-row pick and the date range, so the daily tick is a
-- bounded index scan, NEVER a full-table replay of every member (the receipt table previously indexed
-- only (pariwar_id, member_id) + the unique (tr)).
--
-- ADDITIVE + NON-DESTRUCTIVE: a single CREATE INDEX, no table/column/DDL change. The schema-diff gate
-- (Story 1.16c) WILL flag this new index — that is the ONE expected schema touch for 3.8; reconcile it.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0028 are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` now would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- 0021-0027 → 42P07. So this file is HAND-AUTHORED, mirroring the 0027 index cadence. No snapshot is
-- emitted (matching 0021-0027); `drizzle-kit check` tolerates it.

CREATE INDEX "vyawastha_shulk_receipts_member_valid_through_idx" ON "vyawastha_shulk_receipts" USING btree ("member_id","valid_through" DESC);
