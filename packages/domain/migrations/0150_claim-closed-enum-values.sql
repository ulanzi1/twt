-- Migration 0150 — the `closed` claim state and the `closed` appeal-journey status for Story 6.24a (Task 1.1; RF4).
--
-- `2026-10-07-292` RF4 (builds `-262` FQ5 A): when an appeal against a refusal on suspicion of a post-death nominee change
-- (`-239`, reason `post_death_nominee_change`) is ALLOWED, every other claim of the same death is CLOSED — ⛔ not refused,
-- ⛔ not appealable, ⛔ never a 6.19c closures row, ⛔ never `denied_no_appeal`. ⇒ `claim_lifecycle_state` gains `closed`
-- (a terminal state reached only through the `claim.closed` event), and a held claim closed mid-appeal moves its
-- `claim_appeals` anchor to a NEW `appeal_journey_status` value `closed` so ⛔ no open journey outlives its claim.
--
-- ⚠ ADD VALUE is its OWN migration file (the 0040 / 0120 / 0146 posture): a newly-added enum value cannot be USED in the
-- transaction that added it (55P04) — and drizzle's migrator applies every pending file in ONE transaction — so ⛔ nothing in
-- this file (nor any CHECK, index or default in a later file of the same run) names `'closed'` as an enum literal.
-- `IF NOT EXISTS` makes it re-apply-safe. Hand-authored — ⛔ never regenerate.

ALTER TYPE "claim_lifecycle_state" ADD VALUE IF NOT EXISTS 'closed';--> statement-breakpoint
ALTER TYPE "appeal_journey_status" ADD VALUE IF NOT EXISTS 'closed';
