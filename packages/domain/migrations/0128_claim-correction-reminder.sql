-- Migration 0128 — the correction REMINDER RECORD (Story 6.19b, Task 1 (c); AC2, AC3, AC4; the shared spec's D2 as
-- superseded by `2026-09-29-266` §1, `2026-09-29-267` §4 (the per-person `subject_key`), `2026-09-29-269` §4
-- (`rejected_unreachable`) and `2026-09-29-271` §1 (the number hash "reached" compares against).
--
-- ⭐ WHAT IT IS. One row per ATTEMPT at a slot of a run for one recipient and one purpose: a family SMS, a District
-- Admin reminder, a staff push, a letter chase, a second-letter reminder or an escalation. It records what is KNOWN,
-- ⛔ never what is hoped: `delivered_at` only from a real delivery signal (T1 — ⛔ none exists in v1), `accepted` is
-- a gateway accept, and `delivered` is ⛔ not a state. ⛔ Not `idempotency_keys` (T5: its TTL vacuum deletes lapsed
-- rows regardless of status) and ⛔ not a claim event.
-- ⭐ THE DEDUP IS THIS TABLE. UNIQUE `(run_id, slot_day, recipient_key, purpose, subject_key)` + the insert under the
-- trustee lock: every pg-boss queue in this codebase uses the `standard` policy, which enforces ⛔ no `singletonKey`
-- uniqueness, so a job's `singletonKey` is a label only.
-- ⚠ `subject_key` is NOT NULL DEFAULT '' — ⛔ never nullable: Postgres treats NULLs as distinct, so a nullable column
-- would silently void the UNIQUE. It holds the chased PERSON's key only for `letter_chase`, `letter_second_due` and
-- the letter-chase `escalation`; `''` for every other row (a `family_sms` row's person is its `recipient_key`).
-- ⭐ `staff_push` has its own partial UNIQUE on `(claim_case_id, recipient_key, sent_on)` — ONE push per staff member
-- per claim per IST day (D34), whichever run it was keyed on, so a sweep retry after a same-day mark switch cannot key
-- a second push on the new run. `staff_reminder` carries the same partial UNIQUE (D34: ONE scheduled District Admin
-- reminder per claim per day, across a switch).
-- ⚠ `purpose` is an OPEN set by migration: 6.19c adds its own values (the day-90 closure reminder, the directee's and
-- the Super Admin's reminders) by its own migration. `replacement_reminder` is reserved (⛔ written by nobody in v1 —
-- D21's single reminder IS the per-person `letter_second_due`).
-- ⚠ `recipient_number_hash` is a KEYED HASH (`blindIndex` under the `claim_contact_mobile` field class, bound to the
-- claim's REAL Pariwar) of the E.164 number an SMS went to — ⛔ never the login-key `mobileBlindIndex`, whose
-- namespace would make every row joinable to `member_identities`. ⛔ No number is ever stored here in the clear.
-- `twt_app`: SELECT / INSERT / UPDATE (the compare-and-set `attempting` → final). ⛔ No DELETE.

CREATE TABLE "claim_correction_reminders" (
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
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."claim_correction_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_recipient_version_id_fk" FOREIGN KEY ("recipient_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CORRECTION_REMINDER_PURPOSES` / `CORRECTION_REMINDER_OUTCOMES` (schema/claim_correction_chase.ts).
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_purpose_check" CHECK ("purpose" IN ('family_sms', 'staff_reminder', 'staff_push', 'letter_chase', 'letter_second_due', 'replacement_reminder', 'escalation'));--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_outcome_check" CHECK ("outcome" IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded', 'recorded'));--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_slot_day_check" CHECK ("slot_day" >= 0);--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_recipient_key_check" CHECK (length(btrim("recipient_key")) > 0);--> statement-breakpoint
-- An in-flight row always says WHEN it was claimed (the lease and the finaliser read it).
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_attempting_claimed_check" CHECK ("outcome" <> 'attempting' OR "claimed_at" IS NOT NULL);--> statement-breakpoint
-- ⭐ T1 / invariant 3 — a delivery time exists ONLY on a send the gateway accepted, and only from a real signal.
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_delivered_only_accepted_check" CHECK ("delivered_at" IS NULL OR "outcome" = 'accepted');--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_correction_reminders" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed, mirroring `claim_correction_runs` (0127): the slot's IDENTITY (run/slot/recipient/purpose/
-- subject) and `sent_on`/`late`/`created_at` are ⛔ never rewritten — only the compare-and-set / finalise columns.
GRANT UPDATE ("outcome", "provider_message_id", "detail", "first_detail", "recipient_version_id", "recipient_number_hash", "attempt_count", "claimed_at", "claimed_by_job", "updated_at") ON "claim_correction_reminders" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_correction_reminders_tenant_isolation_select" ON "claim_correction_reminders" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_reminders_tenant_isolation_insert" ON "claim_correction_reminders" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_reminders_tenant_isolation_update" ON "claim_correction_reminders" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ `-267` §4 — THE dedup key.
CREATE UNIQUE INDEX "claim_correction_reminders_slot_uq" ON "claim_correction_reminders" USING btree ("run_id", "slot_day", "recipient_key", "purpose", "subject_key");--> statement-breakpoint
-- ⭐ D34 — ONE staff push per staff member per claim per IST day, and ONE scheduled District Admin reminder.
CREATE UNIQUE INDEX "claim_correction_reminders_staff_push_day_uq" ON "claim_correction_reminders" USING btree ("claim_case_id", "recipient_key", "sent_on") WHERE "purpose" = 'staff_push';--> statement-breakpoint
CREATE UNIQUE INDEX "claim_correction_reminders_staff_reminder_day_uq" ON "claim_correction_reminders" USING btree ("claim_case_id", "recipient_key", "sent_on") WHERE "purpose" = 'staff_reminder';--> statement-breakpoint
-- ⭐ D34, extended: a same-day mark-switch supersession must not double a letter chase, its second-letter
-- reminder, or its escalation for the SAME chased person (`subject_key`) either.
CREATE UNIQUE INDEX "claim_correction_reminders_letter_chase_day_uq" ON "claim_correction_reminders" USING btree ("claim_case_id", "recipient_key", "subject_key", "sent_on") WHERE "purpose" IN ('letter_chase', 'letter_second_due', 'escalation');--> statement-breakpoint
-- The exhausted-row finaliser's cross-tenant scan.
CREATE INDEX "claim_correction_reminders_attempting_idx" ON "claim_correction_reminders" USING btree ("claimed_at") WHERE "outcome" = 'attempting';--> statement-breakpoint
CREATE INDEX "claim_correction_reminders_pariwar_claim_idx" ON "claim_correction_reminders" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_correction_reminders_run_idx" ON "claim_correction_reminders" USING btree ("run_id", "recipient_key");
