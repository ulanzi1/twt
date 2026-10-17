-- Migration 0168 — MSG91 delivery reports: the DB backstops catch up with the projection (Story 6.37b, code review round 2,
-- 2026-10-18; I3, DR2, DR5-G). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator
-- skips by the journal `when`). A FORWARD migration, ⛔ an edit of 0167 (applied on :5433 — the 42P07 lesson).
--
-- ⭐ (a) THE PHONE-NUMBER BACKSTOP ON `failure_reason` (both tables). 0167 refused only 7 CONTIGUOUS ASCII digits; review round 1
-- (F1) made the handler mask every ≥ 7-numeral sequence with 1–3 non-letter characters between each pair (`+91 98123 45678`).
-- The CHECK now refuses 7 ASCII digits with 0–3 characters of an EXPLICIT ASCII separator class between each pair.
-- ⚠ The class is deliberately NARROWER than the handler's (`[^\p{L}\p{N}]`) and the digits are ASCII only — so anything this
-- CHECK refuses the handler has already masked, and a cleaned value can ⛔ fail the INSERT (a 5xx counts toward MSG91's
-- auto-pause). ⛔ `[[:alpha:]]` / `[[:punct:]]`: their meaning moves with the database's locale.
-- ⭐ (b) `reported_delivery_time` keeps only a TIMESTAMP SHAPE (`YYYY-MM-DD[ T]HH:MM[:SS[.f]][Z|±HH[:]MM]` — F3's two forms),
-- else NULL at the handler; the CHECK mirrors it EXACTLY (LOCKSTEP with `DELIVERY_TIME` in the api's msg91-sms-reports.ts). A
-- bare number (`919812345678`) in the field is ⛔ stored (I3). The field is record-only (T8), so a form outside the grammar
-- loses nothing correlation needs.
-- ⭐ (c) `twt_app`'s INSERT on the inbox narrowed to the SIX projection columns (DR2) — 0167 granted INSERT on the whole table, so a
-- `twt_app` writer could create a row already settled, leased or with a forged `received_at`. The only writer
-- (`persistSmsDeliveryReports`) writes exactly these six.
-- ⚠ `request_id` (`^[A-Za-z0-9]{1,64}$`, MSG91's own id) can still hold an all-digit value — a RESIDUAL recorded in ADR-0042: only
-- roster Row 33 (d)'s panel-template check keeps `{{telNum}}` out of it.
-- ⚠ The ADD CONSTRAINTs validate existing rows, so rows 0167 admitted that the new rules refuse are cleaned FIRST (a delivery time
-- outside the grammar ⇒ NULL — record-only, T8; a failure reason holding a separated number ⇒ NULL — the number is the thing I3
-- forbids). Idempotent: on a database with no such row the three UPDATEs touch nothing. ⚠ They clean only what the MIGRATING login can
-- see — both tables FORCE RLS, so a login that is neither superuser nor BYPASSRLS sees ⛔ row and the ADD CONSTRAINT then fails LOUDLY
-- (the migration rolls back) if such a row exists; the house migrator is the owner / superuser (0153 / 0155 do the same).
UPDATE "sms_delivery_report_inbox" SET "reported_delivery_time" = NULL WHERE "reported_delivery_time" IS NOT NULL AND "reported_delivery_time" !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]{1,6})?)?(Z|[+-][0-9]{2}:?[0-9]{2})?$';--> statement-breakpoint
UPDATE "sms_delivery_report_inbox" SET "failure_reason" = NULL WHERE "failure_reason" ~ '[0-9]([ ()+./,:;#_*-]{0,3}[0-9]){6}';--> statement-breakpoint
UPDATE "sms_send_deliveries" SET "failure_reason" = NULL WHERE "failure_reason" ~ '[0-9]([ ()+./,:;#_*-]{0,3}[0-9]){6}';--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" DROP CONSTRAINT IF EXISTS "sms_delivery_report_inbox_failure_reason_check";--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_failure_reason_check" CHECK ("failure_reason" IS NULL OR (length("failure_reason") <= 200 AND "failure_reason" !~ '[[:cntrl:]]' AND "failure_reason" !~ '[0-9]([ ()+./,:;#_*-]{0,3}[0-9]){6}'));--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" DROP CONSTRAINT IF EXISTS "sms_send_deliveries_failure_reason_check";--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_failure_reason_check" CHECK ("failure_reason" IS NULL OR (length("failure_reason") <= 200 AND "failure_reason" !~ '[[:cntrl:]]' AND "failure_reason" !~ '[0-9]([ ()+./,:;#_*-]{0,3}[0-9]){6}'));--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" DROP CONSTRAINT IF EXISTS "sms_delivery_report_inbox_reported_delivery_time_check";--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_reported_delivery_time_check" CHECK ("reported_delivery_time" IS NULL OR "reported_delivery_time" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]{1,6})?)?(Z|[+-][0-9]{2}:?[0-9]{2})?$');--> statement-breakpoint
REVOKE INSERT ON "sms_delivery_report_inbox" FROM twt_app;--> statement-breakpoint
GRANT INSERT ("request_id", "crqid", "status_code", "event_name", "failure_reason", "reported_delivery_time") ON "sms_delivery_report_inbox" TO twt_app;
