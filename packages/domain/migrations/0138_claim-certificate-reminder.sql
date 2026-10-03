-- Migration 0138 — the certificate REMINDER RECORD (Story 6.19d, Task 1; AC2, AC3, AC5; `2026-10-03-276` CR1, CR6–CR8,
-- CR10). Shaped on 0128 (`claim_correction_reminders`), with 0130's lesson built in from the start.
--
-- ⭐ WHAT IT IS. One row per ATTEMPT at a slot of a certificate run for one recipient and one purpose: the family's text
-- message (`family_sms`), the District Admin's letter chase (`letter_chase`) or its day-13 escalation RECORD
-- (`letter_escalation` — ⚠ in v1 it reaches ⛔ no Pariwar Admin: ⛔ no push, ⛔ no Pariwar-Admin surface; CR10). It records
-- what is KNOWN, ⛔ never what is hoped: `delivered_at` only from a real delivery signal (⛔ none exists in v1), `accepted`
-- is a gateway accept, and `delivered` is ⛔ not a state. ⛔ Not `idempotency_keys`; ⛔ not a claim event.
-- ⭐ THE DEDUP IS THIS TABLE — UNIQUE `(run_id, slot_day, recipient_key, purpose, subject_key)` + the insert under the
-- claim-row lock (a pg-boss `singletonKey` is a label only).
-- ⚠ `subject_key` is NOT NULL DEFAULT '' — ⛔ never nullable (a NULL voids the UNIQUE). It holds the chased PERSON's key
-- on the two staff purposes; `''` on a `family_sms` row (whose person is its `recipient_key`) — a CHECK pins both.
-- ⭐ The staff day key INCLUDES `purpose` (0130's lesson): a chase and an escalation for the same person on one catch-up
-- morning must BOTH land.
-- ⚠ `recipient_number_hash` is a KEYED HASH (`blindIndex`, field class `claim_contact_mobile`, the claim's REAL Pariwar)
-- — ⛔ never `mobileBlindIndex`. ⭐ Unlike 0128 it is written on the `attempting` row (CR7's one departure — CR6's
-- one-text-per-number rule reads it there). ⛔ No number is ever stored here in the clear.
-- `twt_app`: SELECT / INSERT / UPDATE (the compare-and-set `attempting` → final, column-narrowed). ⛔ No DELETE.

CREATE TABLE "claim_certificate_reminders" (
	"reminder_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"slot_day" integer NOT NULL,
	"sent_on" date NOT NULL,
	"recipient_key" text NOT NULL,
	"purpose" text NOT NULL,
	"subject_key" text DEFAULT '' NOT NULL,
	"outcome" text NOT NULL,
	"late" boolean DEFAULT false NOT NULL,
	"recipient_version_id" uuid,
	"recipient_number_hash" text,
	"provider_message_id" text,
	"detail" text,
	"first_detail" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_job" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."claim_certificate_reminder_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_recipient_version_id_fk" FOREIGN KEY ("recipient_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CERTIFICATE_REMINDER_PURPOSES` / `CERTIFICATE_REMINDER_OUTCOMES` (schema/claim_certificate_reminder.ts).
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_purpose_check" CHECK ("purpose" IN ('family_sms', 'letter_chase', 'letter_escalation'));--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_outcome_check" CHECK ("outcome" IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded', 'recorded'));--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_slot_day_check" CHECK ("slot_day" >= 0);--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_recipient_key_check" CHECK (length(btrim("recipient_key")) > 0);--> statement-breakpoint
-- A family row names ⛔ no subject (its person is the recipient); a staff row ALWAYS names the chased person.
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_subject_key_check" CHECK (("purpose" = 'family_sms') = ("subject_key" = ''));--> statement-breakpoint
-- An in-flight row always says WHEN it was claimed (the lease and the finaliser read it).
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_attempting_claimed_check" CHECK ("outcome" <> 'attempting' OR "claimed_at" IS NOT NULL);--> statement-breakpoint
-- ⭐ Invariant 4 — a delivery time exists ONLY on a send the gateway accepted, and only from a real signal.
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_delivered_only_accepted_check" CHECK ("delivered_at" IS NULL OR "outcome" = 'accepted');--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_certificate_reminders" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed (0128's precedent): the slot's IDENTITY and `sent_on` / `late` / `created_at` are ⛔ never rewritten.
GRANT UPDATE ("outcome", "provider_message_id", "detail", "first_detail", "recipient_version_id", "recipient_number_hash", "attempt_count", "claimed_at", "claimed_by_job", "updated_at") ON "claim_certificate_reminders" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_certificate_reminders_tenant_isolation_select" ON "claim_certificate_reminders" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_certificate_reminders_tenant_isolation_insert" ON "claim_certificate_reminders" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_certificate_reminders_tenant_isolation_update" ON "claim_certificate_reminders" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ THE dedup key.
CREATE UNIQUE INDEX "claim_certificate_reminders_slot_uq" ON "claim_certificate_reminders" USING btree ("run_id", "slot_day", "recipient_key", "purpose", "subject_key");--> statement-breakpoint
-- ⭐ CR10 — ONE staff row per (claim, recipient, chased person, PURPOSE, IST day), whichever run it was keyed on.
CREATE UNIQUE INDEX "claim_certificate_reminders_staff_day_uq" ON "claim_certificate_reminders" USING btree ("claim_case_id", "recipient_key", "subject_key", "purpose", "sent_on") WHERE "purpose" IN ('letter_chase', 'letter_escalation');--> statement-breakpoint
-- The exhausted-row finaliser's cross-tenant scan.
CREATE INDEX "claim_certificate_reminders_attempting_idx" ON "claim_certificate_reminders" USING btree ("claimed_at") WHERE "outcome" = 'attempting';--> statement-breakpoint
CREATE INDEX "claim_certificate_reminders_pariwar_claim_idx" ON "claim_certificate_reminders" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_certificate_reminders_run_idx" ON "claim_certificate_reminders" USING btree ("run_id", "recipient_key");
