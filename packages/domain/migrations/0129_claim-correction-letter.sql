-- Migration 0129 — the POSTED LETTERS of a correction run (Story 6.19b, Task 1 (d); AC5; the shared spec's D6 and
-- D20, `2026-09-29-266` §2 (D31) and `2026-09-29-267` §4 (the person's key)).
--
-- The rulings: `2026-09-20-230` 3 (a letter's tracking number, and within 14 days of sending its delivery date and a
-- screenshot), `2026-09-20-231` D (at most two letters; the second after the first's delivery), `2026-09-27-255` F5
-- (a letter to a person no channel can reach), `2026-09-27-250` #3/#4 (a late delivery is flagged, ⛔ never refused;
-- a letter stays recordable after the run ends).
-- ⭐ Keyed on the RUN and the PERSON (`person_key` — the same stable form as a reminder's `recipient_key`:
-- `nominee:<correction-chain root>` or `claimant`), so "at most two per person per run" is a UNIQUE on
-- `(run_id, person_key, sequence)` with `sequence` ∈ {1, 2}: a third is refused by the writer (409
-- `correction_letter.limit_reached`) with this index as the backstop.
-- ⚠ The TRACKING NUMBER is Tier-1 (`piiColumn(1, 'claim_correction_letter')`) — encrypted in the API handler, read
-- back only inside the letter form. The SCREENSHOT is ⛔ never here: only its storage key under the
-- `claimDocumentStorage` port's own prefix (`…/correction-letter/{letterId}`, D6), its content type and size.
-- ⚠ ⛔ NO VIRUS SCAN exists for the screenshot — recorded in `deferred-work.md`, ⛔ not fixed.
-- ⭐ STAFF-ENTERED EVIDENCE: the delivery columns are all-or-nothing (a delivery is recorded WITH its screenshot, D6);
-- an unrecorded field reads as unrecorded, ⛔ never inferred. `twt_app`: SELECT / INSERT / UPDATE. ⛔ No DELETE.

CREATE TABLE "claim_correction_letters" (
	"letter_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"person_key" text NOT NULL,
	"sequence" smallint NOT NULL,
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
ALTER TABLE "claim_correction_letters" ADD CONSTRAINT "claim_correction_letters_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."claim_correction_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_letters" ADD CONSTRAINT "claim_correction_letters_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_letters" ADD CONSTRAINT "claim_correction_letters_sequence_check" CHECK ("sequence" IN (1, 2));--> statement-breakpoint
ALTER TABLE "claim_correction_letters" ADD CONSTRAINT "claim_correction_letters_person_key_check" CHECK (length(btrim("person_key")) > 0);--> statement-breakpoint
ALTER TABLE "claim_correction_letters" ADD CONSTRAINT "claim_correction_letters_recorded_by_check" CHECK (length(btrim("recorded_by_actor")) > 0 AND length(btrim("recorded_by_display")) > 0);--> statement-breakpoint
-- A delivery is recorded WITH its screenshot and its attribution, or ⛔ not at all (D6).
ALTER TABLE "claim_correction_letters" ADD CONSTRAINT "claim_correction_letters_delivery_all_or_nothing_check" CHECK (
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
-- ⚠ A letter cannot be delivered before it was posted. (A LATE delivery — more than 14 days — is accepted and
-- flagged overdue by the read, ⛔ never refused here: `-250` #3.)
ALTER TABLE "claim_correction_letters" ADD CONSTRAINT "claim_correction_letters_delivered_after_posted_check" CHECK ("delivered_on" IS NULL OR "delivered_on" >= "posted_on");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_correction_letters" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed, mirroring `claim_correction_runs` (0127): the letter's IDENTITY (run/person/sequence),
-- `posted_on`, `tracking_number_ciphertext` and `recorded_by_*` are ⛔ never rewritten after insert — only the
-- delivery columns, written all-or-nothing (D6).
GRANT UPDATE ("delivered_on", "screenshot_storage_key", "screenshot_content_type", "screenshot_size_bytes", "delivery_recorded_by_actor", "delivery_recorded_by_display", "delivery_recorded_at", "updated_at") ON "claim_correction_letters" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_correction_letters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_correction_letters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_correction_letters_tenant_isolation_select" ON "claim_correction_letters" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_letters_tenant_isolation_insert" ON "claim_correction_letters" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_letters_tenant_isolation_update" ON "claim_correction_letters" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ D20 — at most two letters per person per run.
CREATE UNIQUE INDEX "claim_correction_letters_person_sequence_uq" ON "claim_correction_letters" USING btree ("run_id", "person_key", "sequence");--> statement-breakpoint
CREATE INDEX "claim_correction_letters_pariwar_claim_idx" ON "claim_correction_letters" USING btree ("pariwar_id", "claim_case_id");
