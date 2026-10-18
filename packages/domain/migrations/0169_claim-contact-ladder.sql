-- Migration 0169 — the DELIVERY LADDER and the CALL RECORD (Story 6.37c, Task 1; AC8; `2026-10-17-350` ruling 2,
-- `-351` 4 A / 5 A / 6 A, `2026-10-18-355` LD2 / LD9 / LD10; ADR-0042).
--
-- ⭐ TWO NEW TABLES and the two send tables' purpose vocabularies widened — ⛔ an existing migration edited, ⛔ a column
-- of a send table touched (I2), ⛔ `delivered_at` (LD14 (d) — delivery lives in `sms_send_deliveries`, 6.37b).
--
-- (1) `claim_contact_ladders` — TENANT-scoped. ONE follow-up per (claim, chase, person) at a time, started by a
--     reminder the network REPORTED `undelivered` (`-351` 1 A, 4 A). It records the ladder's STEPS as IST dates (LD3 —
--     the reminders' own 10:00 rhythm, `-250` #5): the WhatsApp step (RECORDED skipped — LD1, `-356`), SMS 2, SMS 3 and
--     the conclusion date; how it ENDED (a delivered message, a reached call, a number change, a stop) or that it
--     CONCLUDED undelivered (`-350` ruling 1 — the mapping is READ-time, LD6: ⛔ a stored outcome is ever rewritten);
--     and the date its staff ask was written (LD9). ⛔ FK on `run_id`: the origin run lives in `claim_correction_runs`
--     OR `claim_certificate_reminder_runs` (kind-discriminated by `chase` — the pool `cycle_id` precedent), and
--     `origin_row_id` in the matching send table.
--     ⭐ I5 — ONE running ladder per (claim, chase, person): a partial UNIQUE, ⛔ an application check alone. ⭐ A row
--     is the origin of at most ONE ladder, EVER (UNIQUE `(chase, origin_row_id)`) — a stopped ladder KEEPS its origin, so
--     a lifted stop cannot re-send its steps (LD5).
-- (2) `claim_contact_calls` — TENANT-scoped, APPEND-ONLY. A District Admin's record of a phone call to a person (LD10):
--     the date, WHO answered (a role — ⛔ a name), whether it reached the family. ⛔ Free text, ⛔ a number, ⛔ a name.
--     A call recorded `reached` is the ONE new source of reach (I1 — ⛔ a provider input).
-- (3) The send tables gain `ladder_sms` (a ladder's SMS 2 / SMS 3 — the chase's OWN approved reminder, sent again, so
--     its CRQID is `cr` / `ce` + the row's own id and 6.37b's grammar / `send_kind` need ⛔ change) and
--     `ladder_escalation` (the ONE staff ask per concluded ladder). Each carries `subject_key = 'ladder:<id>[:<step>]'`
--     under a NEW partial UNIQUE `(claim_case_id, subject_key)` — the slot UNIQUE includes `slot_day` and
--     `recipient_key` and would ⛔ enforce "one per ladder step".
--     ⚠ LOCKSTEP (T9): `CORRECTION_REMINDER_PURPOSES` / `CERTIFICATE_REMINDER_PURPOSES` + the Drizzle `check()` copies +
--     the policy specs' purpose legs; the certificate purpose ↔ outcome CHECK (0141) is REPLACED with the two new
--     purposes placed — `ladder_sms` with the family outcomes, `ladder_escalation` with the staff ones.
--
-- GRANTS — G-a (`-347` DR5-G's house shape, as narrowed by `-354` decision 1): `SELECT, INSERT` + a column-limited
-- UPDATE on the ladder's MUTABLE columns only (⛔ identity, ⛔ the origin, ⛔ DELETE); the call record `SELECT, INSERT`
-- only. Per-command policies that MATCH the grants (⛔ a policy for an ungranted command).
-- ⚠ Jobs' PRODUCTION role is roster Row 26 (`jobs-db-role`, OPEN): today jobs runs on the BYPASSRLS service pool; under
-- Row 26's leading option (`SET LOCAL ROLE twt_app`) these grants and policies are what the ladder sweep runs under —
-- and its cross-tenant candidate scan would see ⛔ row, so the sweep refuses first (`canReadAcrossPariwars`, T24).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (hand-authored; drizzle-kit skips applied migrations by journal
-- `when`). DO NOT reset via DROP SCHEMA.

CREATE TABLE "claim_contact_ladders" (
	"ladder_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"chase" text NOT NULL,
	"run_id" uuid NOT NULL,
	"return_decision_id" uuid,
	"person_key" text NOT NULL,
	"recipient_number_hash" text NOT NULL,
	"origin_row_id" uuid NOT NULL,
	"origin_sent_on" date NOT NULL,
	"whatsapp_step" text NOT NULL,
	"sms2_due_on" date NOT NULL,
	"sms2_state" text DEFAULT 'pending' NOT NULL,
	"sms2_on" date,
	"sms2_row_id" uuid,
	"sms3_due_on" date,
	"sms3_state" text DEFAULT 'pending' NOT NULL,
	"sms3_on" date,
	"sms3_row_id" uuid,
	"conclude_on" date,
	"state" text DEFAULT 'running' NOT NULL,
	"end_detail" text,
	"ended_at" timestamp with time zone,
	"concluded_on" date,
	"escalated_on" date,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CONTACT_LADDER_CHASES` / `CONTACT_LADDER_STATES` (schema/claim_contact_ladders.ts).
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_chase_check" CHECK ("chase" IN ('correction', 'certificate'));--> statement-breakpoint
-- A correction ladder is scoped to its RETURN (every correction reader keys on it); a certificate chase has ⛔ return.
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_return_pair_check" CHECK (("chase" = 'correction') = ("return_decision_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_person_key_check" CHECK (length(btrim("person_key")) > 0);--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_number_hash_check" CHECK (length(btrim("recipient_number_hash")) > 0);--> statement-breakpoint
-- LD2 — `pending` or a recorded skip (`skipped:whatsapp_not_built`, `skipped:nominee_no_whatsapp`); row 6-37d may add values.
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_whatsapp_step_check" CHECK ("whatsapp_step" ~ '^(pending|skipped:[a-z_]{1,48})$');--> statement-breakpoint
-- LD3 — a step is `pending`, `sent` (one attempt was made), `satisfied` (that day's scheduled reminder was the step) or
-- a recorded skip; the date it RESOLVED is present exactly when it is ⛔ `pending`; the next date exists once it resolved.
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_sms2_state_check" CHECK ("sms2_state" ~ '^(pending|sent|satisfied|skipped:[a-z_]{1,48})$');--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_sms3_state_check" CHECK ("sms3_state" ~ '^(pending|sent|satisfied|skipped:[a-z_]{1,48})$');--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_sms2_on_pair_check" CHECK (("sms2_state" = 'pending') = ("sms2_on" IS NULL) AND ("sms2_state" = 'pending') = ("sms3_due_on" IS NULL));--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_sms3_on_pair_check" CHECK (("sms3_state" = 'pending') = ("sms3_on" IS NULL) AND ("sms3_state" = 'pending') = ("conclude_on" IS NULL));--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_step_order_check" CHECK ("sms2_due_on" > "origin_sent_on" AND ("sms3_state" = 'pending' OR "sms2_state" <> 'pending'));--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_state_check" CHECK ("state" IN ('running', 'ended_delivered', 'ended_call', 'ended_number_changed', 'ended_stopped', 'concluded_undelivered'));--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_ended_pair_check" CHECK (("state" = 'running') = ("ended_at" IS NULL));--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_concluded_pair_check" CHECK (("state" = 'concluded_undelivered') = ("concluded_on" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_escalated_check" CHECK ("escalated_on" IS NULL OR "state" = 'concluded_undelivered');--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_end_detail_check" CHECK ("end_detail" IS NULL OR ("end_detail" ~ '^[a-z_:]{1,64}$' AND "state" <> 'running'));--> statement-breakpoint
-- ⭐ I5 — ONE running ladder per (claim, chase, person).
CREATE UNIQUE INDEX "claim_contact_ladders_running_uq" ON "claim_contact_ladders" USING btree ("claim_case_id", "chase", "person_key") WHERE "state" = 'running';--> statement-breakpoint
-- ⭐ A send row is the origin of at most ONE ladder, ever (LD5).
CREATE UNIQUE INDEX "claim_contact_ladders_origin_uq" ON "claim_contact_ladders" USING btree ("chase", "origin_row_id");--> statement-breakpoint
CREATE INDEX "claim_contact_ladders_state_conclude_idx" ON "claim_contact_ladders" USING btree ("state", "conclude_on");--> statement-breakpoint
CREATE INDEX "claim_contact_ladders_pariwar_claim_idx" ON "claim_contact_ladders" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_contact_ladders" TO twt_app;--> statement-breakpoint
-- G-a — the ladder's IDENTITY (claim, chase, run, return, person, number, origin, the WhatsApp step, SMS 2's due date)
-- and `created_at` are ⛔ ever rewritten — only the step / state / escalation columns move. ⛔ DELETE.
GRANT UPDATE ("sms2_state", "sms2_on", "sms2_row_id", "sms3_due_on", "sms3_state", "sms3_on", "sms3_row_id", "conclude_on", "state", "end_detail", "ended_at", "concluded_on", "escalated_on", "updated_at") ON "claim_contact_ladders" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_contact_ladders_tenant_isolation_select" ON "claim_contact_ladders" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_ladders_tenant_isolation_insert" ON "claim_contact_ladders" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_ladders_tenant_isolation_update" ON "claim_contact_ladders" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE TABLE "claim_contact_calls" (
	"call_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"person_key" text NOT NULL,
	"chase" text NOT NULL,
	"ladder_id" uuid,
	"called_on" date NOT NULL,
	"answered_by" text NOT NULL,
	"outcome" text NOT NULL,
	"recorded_by_actor" text NOT NULL,
	"recorded_by_display" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_ladder_id_fk" FOREIGN KEY ("ladder_id") REFERENCES "public"."claim_contact_ladders"("ladder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CONTACT_CALL_ANSWERED_BY` / `CONTACT_CALL_OUTCOMES` (schema/claim_contact_calls.ts).
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_chase_check" CHECK ("chase" IN ('correction', 'certificate'));--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_answered_by_check" CHECK ("answered_by" IN ('the_person', 'family_member', 'someone_else', 'nobody'));--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_outcome_check" CHECK ("outcome" IN ('reached', 'not_reached'));--> statement-breakpoint
-- `-351` 5 A — a call REACHES the family only when the person or a family member answered.
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_reached_answered_check" CHECK ("outcome" <> 'reached' OR "answered_by" IN ('the_person', 'family_member'));--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_person_key_check" CHECK (length(btrim("person_key")) > 0);--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_recorded_by_check" CHECK (length(btrim("recorded_by_actor")) > 0 AND length(btrim("recorded_by_display")) > 0);--> statement-breakpoint
CREATE INDEX "claim_contact_calls_pariwar_claim_idx" ON "claim_contact_calls" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
-- APPEND-ONLY — ⛔ UPDATE, ⛔ DELETE.
GRANT SELECT, INSERT ON "claim_contact_calls" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_contact_calls" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_contact_calls_tenant_isolation_select" ON "claim_contact_calls" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_calls_tenant_isolation_insert" ON "claim_contact_calls" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) The send tables' purposes (0135-style replacement — ⛔ 0128 / 0135 / 0138 / 0141 edited).
ALTER TABLE "claim_correction_reminders" DROP CONSTRAINT "claim_correction_reminders_purpose_check";--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_purpose_check" CHECK ("purpose" IN ('family_sms', 'staff_reminder', 'staff_push', 'letter_chase', 'letter_second_due', 'replacement_reminder', 'escalation', 'closure_due', 'closure_escalation', 'staff_case_escalation', 'review_reminder', 'direction_reminder', 'closure_notice', 'closure_letter_chase', 'closure_letter_escalation', 'ladder_sms', 'ladder_escalation'));--> statement-breakpoint
-- ⭐ ONE row per ladder step (`ladder:<id>:2|3`) and ONE ask per ladder (`ladder:<id>`), whichever run / slot it keys on.
CREATE UNIQUE INDEX "claim_correction_reminders_ladder_uq" ON "claim_correction_reminders" USING btree ("claim_case_id", "subject_key") WHERE "purpose" IN ('ladder_sms', 'ladder_escalation');--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" DROP CONSTRAINT "claim_certificate_reminders_purpose_check";--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_purpose_check" CHECK ("purpose" IN ('family_sms', 'letter_chase', 'letter_escalation', 'ladder_sms', 'ladder_escalation'));--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" DROP CONSTRAINT "claim_certificate_reminders_purpose_outcome_check";--> statement-breakpoint
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_purpose_outcome_check" CHECK (
	("purpose" IN ('family_sms', 'ladder_sms') AND "outcome" IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded'))
	OR ("purpose" IN ('letter_chase', 'letter_escalation', 'ladder_escalation') AND "outcome" IN ('recorded', 'no_target'))
);--> statement-breakpoint
CREATE UNIQUE INDEX "claim_certificate_reminders_ladder_uq" ON "claim_certificate_reminders" USING btree ("claim_case_id", "subject_key") WHERE "purpose" IN ('ladder_sms', 'ladder_escalation');
