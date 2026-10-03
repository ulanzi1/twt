-- Migration 0139 — the certificate-reminder LETTERS (Story 6.19d, Task 1; AC4; `2026-10-03-276` CR9 — `-259` detail 1:
-- ONE posted letter to the person whose phone is dead, at their own address, recorded like the correction letters;
-- ⭐ `-275` Q1 A (Trustee-ratified): ONE letter per person per CLAIM, EVER — a G5 restart allows ⛔ no second letter).
--
-- ⭐ ITS OWN SMALL TABLE, shaped on 0134 (`claim_closure_letters`) COLUMN FOR COLUMN, with `run_id` (the run it was
-- recorded in — provenance) in place of `closure_id`. ⛔ Never an edit to 0129 / 0134.
-- ⭐ ONE letter per person per claim — the UNIQUE `(claim_case_id, person_key)`. (One letter per NUMBER is a code check in
-- the writer — CR6; ⛔ no index can express it.)
-- The record: the posting date and a Tier-1 tracking number; within 14 days of posting, the delivery date and a
-- screenshot — the 14-day overdue flag SHOWN, ⛔ nothing else. The delivery columns are all-or-nothing (D6); the
-- screenshot is ⛔ never here — only its key under the storage port's own prefix (`…/certificate-letter/{letterId}`),
-- its type and size. ⚠ ⛔ NO VIRUS SCAN (as the correction and closure letters — recorded).
-- `twt_app`: SELECT / INSERT / UPDATE (column-narrowed to the delivery). ⛔ No DELETE.

CREATE TABLE "claim_certificate_reminder_letters" (
	"letter_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
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
ALTER TABLE "claim_certificate_reminder_letters" ADD CONSTRAINT "claim_certificate_reminder_letters_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."claim_certificate_reminder_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_letters" ADD CONSTRAINT "claim_certificate_reminder_letters_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_letters" ADD CONSTRAINT "claim_certificate_reminder_letters_person_key_check" CHECK (length(btrim("person_key")) > 0);--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_letters" ADD CONSTRAINT "claim_certificate_reminder_letters_recorded_by_check" CHECK (length(btrim("recorded_by_actor")) > 0 AND length(btrim("recorded_by_display")) > 0);--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_letters" ADD CONSTRAINT "claim_certificate_reminder_letters_delivery_complete_check" CHECK (
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
ALTER TABLE "claim_certificate_reminder_letters" ADD CONSTRAINT "claim_certificate_reminder_letters_delivered_after_posted_check" CHECK ("delivered_on" IS NULL OR "delivered_on" >= "posted_on");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_certificate_reminder_letters" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("delivered_on", "screenshot_storage_key", "screenshot_content_type", "screenshot_size_bytes", "delivery_recorded_by_actor", "delivery_recorded_by_display", "delivery_recorded_at", "updated_at") ON "claim_certificate_reminder_letters" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_letters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_letters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_certificate_reminder_letters_tenant_isolation_select" ON "claim_certificate_reminder_letters" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_certificate_reminder_letters_tenant_isolation_insert" ON "claim_certificate_reminder_letters" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_certificate_reminder_letters_tenant_isolation_update" ON "claim_certificate_reminder_letters" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ `-275` Q1 A — ONE certificate letter per person per CLAIM, ever.
CREATE UNIQUE INDEX "claim_certificate_reminder_letters_person_uq" ON "claim_certificate_reminder_letters" USING btree ("claim_case_id", "person_key");--> statement-breakpoint
CREATE INDEX "claim_certificate_reminder_letters_pariwar_claim_idx" ON "claim_certificate_reminder_letters" USING btree ("pariwar_id", "claim_case_id");
