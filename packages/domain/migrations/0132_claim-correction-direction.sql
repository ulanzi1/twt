-- Migration 0132 — the Super Admin's DIRECTIONS on a held claim (Story 6.19c, Task 1; AC14; the shared spec's D18;
-- `2026-09-27-256` cl.3 — a NEW power: the Super Admin may DIRECT the named Pariwar Admin or District Admin, who is
-- reminded and RECORDS what they did).
--
-- ⭐ Confined to an escalated / under-review closures row (the route's `409 closure.not_escalated`); `closure_id`
-- names it. ⭐ `kind`: only `restart_family_reminders` has a system effect — it opens a `direction` run through
-- 6.19b's opener (`opened_run_id`), which refuses unless the return's latest mark is `family` (`-267` §5a); `other`
-- is a record. A direction asks for a RECORD (a mark write, a letter, a name check, "no correction needed", …) —
-- ⛔ never a decision (`-273` §4).
-- ⭐ The RESPONSE is recorded by the named directee only (an identity check, ⛔ a key — D8) — all-or-nothing, once.
-- PII: the direction text and the response are Tier-1 ciphertext (the 6.19b mark-note precedent). ⛔ No RTBF path
-- reaches them (invariant 9 — recorded, ⛔ not fixed).
-- `twt_app`: SELECT / INSERT / UPDATE (column-narrowed to the response + the opened run). ⛔ No DELETE.

CREATE TABLE "claim_correction_directions" (
	"direction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closure_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"directed_to_actor" text NOT NULL,
	"directed_to_role" text NOT NULL,
	"kind" text NOT NULL,
	"text_ciphertext" text NOT NULL,
	"created_by_actor" text NOT NULL,
	"created_by_display" text NOT NULL,
	"opened_run_id" uuid,
	"response_ciphertext" text,
	"responded_at" timestamp with time zone,
	"responded_by_actor" text,
	"responded_by_display" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_closure_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."claim_correction_closures"("closure_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_opened_run_id_fk" FOREIGN KEY ("opened_run_id") REFERENCES "public"."claim_correction_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_role_check" CHECK ("directed_to_role" IN ('district_admin', 'pariwar_admin'));--> statement-breakpoint
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_kind_check" CHECK ("kind" IN ('restart_family_reminders', 'other'));--> statement-breakpoint
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_actors_check" CHECK (length(btrim("directed_to_actor")) > 0 AND length(btrim("created_by_actor")) > 0 AND length(btrim("created_by_display")) > 0);--> statement-breakpoint
-- ⛔ Only a restart opens a run.
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_run_by_kind_check" CHECK ("opened_run_id" IS NULL OR "kind" = 'restart_family_reminders');--> statement-breakpoint
-- The response is all-or-nothing.
ALTER TABLE "claim_correction_directions" ADD CONSTRAINT "claim_correction_directions_response_check" CHECK (
	(
		"response_ciphertext" IS NULL
		AND "responded_at" IS NULL
		AND "responded_by_actor" IS NULL
		AND "responded_by_display" IS NULL
	) OR (
		"response_ciphertext" IS NOT NULL
		AND "responded_at" IS NOT NULL
		AND "responded_by_actor" IS NOT NULL
		AND "responded_by_display" IS NOT NULL
	)
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_correction_directions" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("opened_run_id", "response_ciphertext", "responded_at", "responded_by_actor", "responded_by_display", "updated_at") ON "claim_correction_directions" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_correction_directions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_correction_directions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_correction_directions_tenant_isolation_select" ON "claim_correction_directions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_directions_tenant_isolation_insert" ON "claim_correction_directions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_directions_tenant_isolation_update" ON "claim_correction_directions" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_correction_directions_pariwar_claim_idx" ON "claim_correction_directions" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_correction_directions_closure_idx" ON "claim_correction_directions" USING btree ("closure_id");--> statement-breakpoint
CREATE INDEX "claim_correction_directions_directee_open_idx" ON "claim_correction_directions" USING btree ("pariwar_id", "directed_to_actor") WHERE "responded_at" IS NULL;
