-- Migration 0196 — `claim_nominee_findings` gains the GUILTY member finding (Story 6.22, Task 1.1; DL2; author-commit
-- `2026-11-01-438` item 2). ALONE, before 0197 (the investigation steps table that references it).
--
-- `-238` cl. 4: *"TWO OUTCOMES ONLY. An investigation finds the member innocent or guilty."* 0119 built only the innocent
-- kind. This migration:
--   (1) widens the kind CHECK to `member_found_guilty`;
--   (2) widens the rank coherence CHECK so a guilty finding carries NO rank — and KEEPS 0119's `"rank" IS NOT NULL` on the
--       disqualification arm (a CHECK passes on NULL: without it `FALSE OR NULL` = NULL and a NULL-rank disqualification
--       would be accepted);
--   (3) replaces the one-INNOCENCE-per-claim partial unique index with one MEMBER finding per claim, of EITHER kind (N2).
--       The predicate is spelled exactly as `MEMBER_FINDING_UNIQUE_PREDICATE` (`src/schema/claim_nominee_findings.ts`) —
--       the writers' targeted `ON CONFLICT … WHERE` must match it for Postgres to infer the index.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020, and the CHECKs live
-- ONLY in SQL (the TS schema declares none). HAND-AUTHORED; no snapshot file. ⛔ Backfill: the table has ⛔ production
-- writer before this story, so no existing row can collide with the wider index.

ALTER TABLE "claim_nominee_findings" DROP CONSTRAINT "claim_nominee_findings_kind_check";--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" ADD CONSTRAINT "claim_nominee_findings_kind_check" CHECK ("kind" IN ('member_found_innocent', 'member_found_guilty', 'nominee_disqualified'));--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" DROP CONSTRAINT "claim_nominee_findings_rank_coherence_check";--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" ADD CONSTRAINT "claim_nominee_findings_rank_coherence_check" CHECK (
  ("kind" IN ('member_found_innocent', 'member_found_guilty') AND "rank" IS NULL)
  OR ("kind" = 'nominee_disqualified' AND "rank" IS NOT NULL AND "rank" IN (1, 2))
);--> statement-breakpoint
DROP INDEX "claim_nominee_findings_one_innocence_per_claim_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "claim_nominee_findings_one_member_finding_per_claim_uq" ON "claim_nominee_findings" USING btree ("claim_case_id") WHERE kind IN ('member_found_innocent', 'member_found_guilty');
