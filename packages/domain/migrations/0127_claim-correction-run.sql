-- Migration 0127 — the correction-reminder RUNS (Story 6.19b, Task 1 (b); AC2; `2026-09-29-266` §1 as amended by
-- `2026-09-29-267` §1 and §3 — the shared spec's D2 SUPERSEDED).
--
-- ⭐ A RUN IS ITS OWN RECORD. Before `-266` the reminder record keyed on the return's `decision_id`, so D26's
-- family → staff → family switch on ONE return collided with the old run's rows and the family was silently never
-- reminded. A run is now one row: its kind (`family` | `staff` | `direction` — 6.19d adds its own kind by its own
-- migration), the mark or direction that opened it (`anchor_id` — ⛔ no FK: a direction is 6.19c's table), its day 0
-- (an IST calendar date) and how it ended.
-- ⭐ AT MOST ONE OPEN RUN PER CLAIM (`-267` §1 — ⚠ ⛔ not "per return": a vote supersedes a return without the
-- second-return path, and a second return can land while the first return's run is still open). The opener ends any
-- open run of the claim FIRST (`superseded`); the partial-unique index is the backstop.
-- ⭐ `end_reason` ∈ {superseded, day_90, mark_changed, decided} — ⛔ NO `resubmitted` (`-267` §3: resubmission
-- PAUSES a run, it never ends one — a 6.20 correction after resubmission un-sets it on the SAME return).
-- Hand-authored; ⛔ no backfill. `twt_app` may UPDATE only `ended_at` / `end_reason` (column-level grant) — a run's
-- identity, kind and day 0 are ⛔ never rewritten. ⛔ No DELETE.

CREATE TABLE "claim_correction_runs" (
	"run_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"return_decision_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"anchor_id" uuid NOT NULL,
	"day0" date NOT NULL,
	"opened_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" text
);--> statement-breakpoint
ALTER TABLE "claim_correction_runs" ADD CONSTRAINT "claim_correction_runs_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_runs" ADD CONSTRAINT "claim_correction_runs_return_decision_id_fk" FOREIGN KEY ("return_decision_id") REFERENCES "public"."claim_state_trustee_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CORRECTION_RUN_KINDS` / `CORRECTION_RUN_END_REASONS` (schema/claim_correction_chase.ts).
ALTER TABLE "claim_correction_runs" ADD CONSTRAINT "claim_correction_runs_kind_check" CHECK ("kind" IN ('family', 'staff', 'direction'));--> statement-breakpoint
ALTER TABLE "claim_correction_runs" ADD CONSTRAINT "claim_correction_runs_end_reason_check" CHECK ("end_reason" IS NULL OR "end_reason" IN ('superseded', 'day_90', 'mark_changed', 'decided'));--> statement-breakpoint
-- An ended run has a reason, and an open one has none.
ALTER TABLE "claim_correction_runs" ADD CONSTRAINT "claim_correction_runs_ended_pair_check" CHECK (("ended_at" IS NULL) = ("end_reason" IS NULL));--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_correction_runs" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("ended_at", "end_reason") ON "claim_correction_runs" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_correction_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_correction_runs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_correction_runs_tenant_isolation_select" ON "claim_correction_runs" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_runs_tenant_isolation_insert" ON "claim_correction_runs" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_runs_tenant_isolation_update" ON "claim_correction_runs" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ `-267` §1 — at most ONE open run per claim.
CREATE UNIQUE INDEX "claim_correction_runs_one_open_per_claim_uq" ON "claim_correction_runs" USING btree ("claim_case_id") WHERE "ended_at" IS NULL;--> statement-breakpoint
-- The daily sweep's cross-tenant enumeration of open runs (bounded, ordered).
CREATE INDEX "claim_correction_runs_open_idx" ON "claim_correction_runs" USING btree ("opened_at") WHERE "ended_at" IS NULL;--> statement-breakpoint
-- The sweep's D26 marker query: runs ended `mark_changed` in the last 36 hours.
CREATE INDEX "claim_correction_runs_ended_idx" ON "claim_correction_runs" USING btree ("ended_at") WHERE "ended_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "claim_correction_runs_pariwar_claim_idx" ON "claim_correction_runs" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_correction_runs_return_idx" ON "claim_correction_runs" USING btree ("return_decision_id");
