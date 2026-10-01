-- Migration 0133 — the RE-FILE CONFIRMATIONS after a closure for no response (Story 6.19c, Task 1; AC15; the shared
-- spec's D19; `2026-09-27-254` — a claim closed for silence may be filed again ONLY through a person: the District
-- Admin or the helpline CONFIRMS, with a note).
--
-- ⭐ Keyed on the CLOSURE (invariant 8 / T9 — ⛔ never on `claim.denied_no_appeal`, which a stage-3 uphold emits too
-- and whose re-file stays free). `closed_claim_case_id` is the closed claim (the death's most recent terminal claim);
-- `closure_id` the `closed` closures row that makes the guard apply.
-- ⭐ CONSUMED by the mint, in the mint's own transaction (`consumed_by_claim_case_id` + `consumed_at`, all-or-nothing).
-- ⭐ At most ONE unconsumed confirmation per closed claim (the partial UNIQUE) — a second is the writer's 409.
-- PII: the note is Tier-1 ciphertext. ⛔ No RTBF path reaches it (invariant 9 — recorded, ⛔ not fixed).
-- `twt_app`: SELECT / INSERT / UPDATE (column-narrowed to the consumption). ⛔ No DELETE.

CREATE TABLE "claim_refile_confirmations" (
	"confirmation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"closed_claim_case_id" uuid NOT NULL,
	"closure_id" uuid NOT NULL,
	"via" text NOT NULL,
	"confirmed_by_actor" text NOT NULL,
	"confirmed_by_display" text NOT NULL,
	"note_ciphertext" text NOT NULL,
	"consumed_by_claim_case_id" uuid,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" ADD CONSTRAINT "claim_refile_confirmations_closed_claim_case_id_fk" FOREIGN KEY ("closed_claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" ADD CONSTRAINT "claim_refile_confirmations_closure_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."claim_correction_closures"("closure_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" ADD CONSTRAINT "claim_refile_confirmations_consumed_by_claim_case_id_fk" FOREIGN KEY ("consumed_by_claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" ADD CONSTRAINT "claim_refile_confirmations_via_check" CHECK ("via" IN ('district_admin', 'helpline'));--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" ADD CONSTRAINT "claim_refile_confirmations_confirmed_by_check" CHECK (length(btrim("confirmed_by_actor")) > 0 AND length(btrim("confirmed_by_display")) > 0);--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" ADD CONSTRAINT "claim_refile_confirmations_consumed_pair_check" CHECK (("consumed_by_claim_case_id" IS NULL) = ("consumed_at" IS NULL));--> statement-breakpoint
-- ⛔ A confirmation is ⛔ consumed by the very claim it re-opens.
ALTER TABLE "claim_refile_confirmations" ADD CONSTRAINT "claim_refile_confirmations_consumed_by_new_claim_check" CHECK ("consumed_by_claim_case_id" IS NULL OR "consumed_by_claim_case_id" <> "closed_claim_case_id");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_refile_confirmations" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("consumed_by_claim_case_id", "consumed_at") ON "claim_refile_confirmations" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_refile_confirmations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_refile_confirmations_tenant_isolation_select" ON "claim_refile_confirmations" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_refile_confirmations_tenant_isolation_insert" ON "claim_refile_confirmations" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_refile_confirmations_tenant_isolation_update" ON "claim_refile_confirmations" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ At most ONE unconsumed confirmation per closed claim.
CREATE UNIQUE INDEX "claim_refile_confirmations_one_open_per_claim_uq" ON "claim_refile_confirmations" USING btree ("closed_claim_case_id") WHERE "consumed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "claim_refile_confirmations_pariwar_member_idx" ON "claim_refile_confirmations" USING btree ("pariwar_id", "deceased_member_id");
