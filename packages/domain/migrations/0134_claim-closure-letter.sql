-- Migration 0134 — the CLOSURE LETTERS (Story 6.19c, Task 1; AC6; `2026-10-01-274` 2 — Trustee-ratified: a family
-- reached only by post is sent a POSTED LETTER when their claim is closed, saying it was closed and how to file again
-- through the helpline or the District Admin; *"one more letter for the District Admin to post and record, as for the
-- correction letters"*).
--
-- ⭐ ITS OWN SMALL TABLE (the developer's call, `-274` Consequence 2 — ⛔ never an edit to 0129): a closure letter
-- belongs to a CLOSURE, ⛔ a run, and its rules differ from a correction letter's (ONE per person per closure, ⛔ no
-- second letter). ⭐ ONE letter per person per closure — the UNIQUE `(closure_id, person_key)`.
-- The record is a correction letter's (`-230` cl.3, `-250` #3): the posting date and a Tier-1 tracking number; within 14
-- days of posting, the delivery date and a screenshot — the 14-day overdue flag SHOWN, ⛔ nothing else. The delivery
-- columns are all-or-nothing (D6); the screenshot is ⛔ never here — only its key under the storage port's own prefix
-- (`…/closure-letter/{letterId}`), its type and size. ⚠ ⛔ NO VIRUS SCAN (as the correction letter's — recorded).
-- `twt_app`: SELECT / INSERT / UPDATE (column-narrowed to the delivery). ⛔ No DELETE.

CREATE TABLE "claim_closure_letters" (
	"letter_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closure_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"person_key" text NOT NULL,
	"posted_on" date NOT NULL,
	"tracking_number_ciphertext" text NOT NULL,
	"recorded_by_actor" text NOT NULL,
	"recorded_by_display" text NOT NULL,
	"delivered_on" date,
	"screenshot_storage_key" text,
	"screenshot_content_type" text,
	"screenshot_size_bytes" integer,
	"delivery_recorded_by_actor" text,
	"delivery_recorded_by_display" text,
	"delivery_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_closure_letters" ADD CONSTRAINT "claim_closure_letters_closure_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."claim_correction_closures"("closure_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_closure_letters" ADD CONSTRAINT "claim_closure_letters_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_closure_letters" ADD CONSTRAINT "claim_closure_letters_person_key_check" CHECK (length(btrim("person_key")) > 0);--> statement-breakpoint
ALTER TABLE "claim_closure_letters" ADD CONSTRAINT "claim_closure_letters_recorded_by_check" CHECK (length(btrim("recorded_by_actor")) > 0 AND length(btrim("recorded_by_display")) > 0);--> statement-breakpoint
ALTER TABLE "claim_closure_letters" ADD CONSTRAINT "claim_closure_letters_delivery_all_or_nothing_check" CHECK (
	(
		"delivered_on" IS NULL
		AND "screenshot_storage_key" IS NULL
		AND "screenshot_content_type" IS NULL
		AND "screenshot_size_bytes" IS NULL
		AND "delivery_recorded_by_actor" IS NULL
		AND "delivery_recorded_by_display" IS NULL
		AND "delivery_recorded_at" IS NULL
	) OR (
		"delivered_on" IS NOT NULL
		AND "screenshot_storage_key" IS NOT NULL
		AND "screenshot_content_type" IS NOT NULL
		AND "screenshot_size_bytes" IS NOT NULL
		AND "delivery_recorded_by_actor" IS NOT NULL
		AND "delivery_recorded_by_display" IS NOT NULL
		AND "delivery_recorded_at" IS NOT NULL
	)
);--> statement-breakpoint
ALTER TABLE "claim_closure_letters" ADD CONSTRAINT "claim_closure_letters_delivered_after_posted_check" CHECK ("delivered_on" IS NULL OR "delivered_on" >= "posted_on");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_closure_letters" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("delivered_on", "screenshot_storage_key", "screenshot_content_type", "screenshot_size_bytes", "delivery_recorded_by_actor", "delivery_recorded_by_display", "delivery_recorded_at", "updated_at") ON "claim_closure_letters" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_closure_letters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_closure_letters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_closure_letters_tenant_isolation_select" ON "claim_closure_letters" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_closure_letters_tenant_isolation_insert" ON "claim_closure_letters" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_closure_letters_tenant_isolation_update" ON "claim_closure_letters" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ `-274` 2 — ONE closure letter per person per closure (⛔ no second letter).
CREATE UNIQUE INDEX "claim_closure_letters_person_uq" ON "claim_closure_letters" USING btree ("closure_id", "person_key");--> statement-breakpoint
CREATE INDEX "claim_closure_letters_pariwar_claim_idx" ON "claim_closure_letters" USING btree ("pariwar_id", "claim_case_id");
