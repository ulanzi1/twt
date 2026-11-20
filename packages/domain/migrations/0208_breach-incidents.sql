-- Migration 0208 — the personal data breach register (Story 14.3, Task 3; decision `2026-11-20-467` DL4, DL5, DL8; AC4).
-- Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot → 42P07).
-- NUMBER: the next free at the commit — main's highest is 0207 (`a7c99c6a`); the open siblings `story/6-22b-…` (0198) and
-- `story/6-39-…` (0192) sit on stale bases and re-derive at their own rebase. The `when` (1797996600050) sits above 0207's
-- 1797910200000 and above every sibling's ([[project_sibling_migration_when_order_shared_db]]).
--
-- TWO GLOBAL tables (⛔ `pariwar_id` — the Trust, not a Pariwar, is the Data Fiduciary):
--   · `breach_incidents`        — one row per incident, written once at open.
--   · `breach_incident_entries` — the incident's timeline. Its status, the Board report's due time and "what has been recorded" are
--     DERIVED from these rows by one pure function; ⛔ a mutable status column anywhere.
-- APPEND-ONLY, for every role (incl. the BYPASSRLS service login — a trigger binds it): ⛔ UPDATE, ⛔ DELETE, ⛔ TRUNCATE on either
-- table. The function raises `integrity_constraint_violation` (0192's choice; ⛔ 0188's `P0001`).
-- ⚠ FIRST OF ITS KIND, declared: RLS is ENABLED and FORCED with ZERO policies, and `twt_app` (the member-facing pool) gets ⛔ grant
-- at all — a member session can never read a breach record. This DEPARTS from 0188 (which grants `twt_app` SELECT under a
-- `USING (true)` policy) on purpose. Writes and reads go through the service pool behind `requireGlobalPermission('breach.manage')`.
-- GRANTS: `twt_service` gets SELECT + INSERT and nothing more. WHY exactly those: `twt_service` is a NOLOGIN NOBYPASSRLS group
-- (0002); production's service login is a separate BYPASSRLS login that is a MEMBER of it (0009's header). Role ATTRIBUTES are not
-- inherited through membership, GRANTs are; BYPASSRLS skips policies, ⛔ GRANTs — so the login needs these grants, and with them a
-- FORCE-RLS zero-policy table is readable by it. ⛔ UPDATE: so ⛔ `SELECT … FOR UPDATE / FOR SHARE` either (a row lock needs an
-- UPDATE privilege — 0142's header) — appends serialise on `pg_advisory_xact_lock(hashtext('breach_incident:' || id))` instead.
-- The superuser the tests connect as HIDES a missing grant; the regression spec executes the writes under a BYPASSRLS role IN ROLE
-- `twt_service`.
-- ORDER: `entry_seq` (GENERATED ALWAYS AS IDENTITY) orders an incident's entries everywhere; under the per-incident advisory lock
-- its order is the commit order. `recorded_at` is stamped by a BEFORE INSERT trigger with `clock_timestamp()` — ⛔ `now()`, which is
-- the transaction's START and can sort a lock-waiter before an earlier commit.
-- ⛔ FK from `opened_by` / `recorded_by` to `users` (0188's rationale: the record outlives the account, and an append-only row
-- could never let a `users` row be deleted).
-- PII: a staff member's display-name snapshot and id; operator-typed free text inside `payload` (the UI asks for member ids, never
-- names — guidance, not a control; the detail read is audited). ⛔ Member PII column: affected people are a COUNT, data categories
-- and Pariwar ids. ⇒ ⛔ RTBF scrub interplay.
-- ⚠ LOCKSTEP: the two `IN (…)` lists with `BREACH_DETECTION_SOURCES` / `BREACH_ENTRY_KINDS` (schema/breach_incidents.ts) and the
-- contracts mirror — the regression spec compares each tuple with `pg_get_constraintdef`.

CREATE TABLE "breach_incidents" (
	"incident_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_rehearsal" boolean NOT NULL,
	"title" text NOT NULL,
	"became_aware_at" timestamp with time zone NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"detection_source" text NOT NULL,
	"detection_signal_ref" text,
	"opened_by" uuid NOT NULL,
	"opened_by_display" text NOT NULL,
	"audit_id" uuid NOT NULL
);--> statement-breakpoint
ALTER TABLE "breach_incidents" ADD CONSTRAINT "breach_incidents_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 200);--> statement-breakpoint
-- The 72-hour clock starts at awareness; awareness cannot be later than the moment the record was opened.
ALTER TABLE "breach_incidents" ADD CONSTRAINT "breach_incidents_aware_before_opened_check" CHECK ("became_aware_at" <= "opened_at");--> statement-breakpoint
ALTER TABLE "breach_incidents" ADD CONSTRAINT "breach_incidents_detection_source_check" CHECK ("detection_source" IN ('audit_chain_break', 'pii_scrape_failure', 'validity_cache_alert', 'cross_tenant_read_anomaly', 'pii_export_volume', 'rls_bypass_attempt', 'out_of_hours_privileged_session', 'class_a_dead_letter', 'external_report', 'other'));--> statement-breakpoint
ALTER TABLE "breach_incidents" ADD CONSTRAINT "breach_incidents_detection_signal_ref_check" CHECK ("detection_signal_ref" IS NULL OR char_length(btrim("detection_signal_ref")) BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "breach_incidents" ADD CONSTRAINT "breach_incidents_display_check" CHECK (char_length(btrim("opened_by_display")) >= 1);--> statement-breakpoint
CREATE TABLE "breach_incident_entries" (
	"entry_id" uuid PRIMARY KEY NOT NULL,
	"entry_seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
	"incident_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_by_display" text NOT NULL,
	"audit_id" uuid NOT NULL
);--> statement-breakpoint
ALTER TABLE "breach_incident_entries" ADD CONSTRAINT "breach_incident_entries_incident_id_breach_incidents_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."breach_incidents"("incident_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_incident_entries" ADD CONSTRAINT "breach_incident_entries_kind_check" CHECK ("kind" IN ('assessment', 'timeline_event', 'mitigation', 'cause_findings', 'remedial', 'principals_notice_recorded', 'board_initial_recorded', 'board_report_recorded', 'board_extension_recorded', 'cert_in_report_recorded', 'owner_review', 'signoff_recorded', 'closed', 'note'));--> statement-breakpoint
ALTER TABLE "breach_incident_entries" ADD CONSTRAINT "breach_incident_entries_payload_object_check" CHECK (jsonb_typeof("payload") = 'object');--> statement-breakpoint
ALTER TABLE "breach_incident_entries" ADD CONSTRAINT "breach_incident_entries_display_check" CHECK (char_length(btrim("recorded_by_display")) >= 1);--> statement-breakpoint
CREATE INDEX "breach_incident_entries_incident_seq_idx" ON "breach_incident_entries" USING btree ("incident_id","entry_seq");--> statement-breakpoint
-- Grants: the service role reads and appends. ⛔ `twt_app`. ⛔ UPDATE / DELETE for anyone.
GRANT SELECT, INSERT ON "breach_incidents" TO twt_service;--> statement-breakpoint
GRANT SELECT, INSERT ON "breach_incident_entries" TO twt_service;--> statement-breakpoint
-- RLS on, forced, ZERO policies: a NOBYPASSRLS role sees no row even if it were ever granted SELECT.
ALTER TABLE "breach_incidents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "breach_incidents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "breach_incident_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "breach_incident_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- APPEND-ONLY: ⛔ UPDATE / DELETE / TRUNCATE on either table, for every role.
CREATE FUNCTION breach_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only — a breach record is never edited or deleted; a correction is a NEW entry (Story 14.3 N3): % rejected', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER breach_incidents_no_update_delete
  BEFORE UPDATE OR DELETE ON breach_incidents
  FOR EACH ROW EXECUTE FUNCTION breach_reject_mutation();--> statement-breakpoint
CREATE TRIGGER breach_incidents_no_truncate
  BEFORE TRUNCATE ON breach_incidents
  FOR EACH STATEMENT EXECUTE FUNCTION breach_reject_mutation();--> statement-breakpoint
CREATE TRIGGER breach_incident_entries_no_update_delete
  BEFORE UPDATE OR DELETE ON breach_incident_entries
  FOR EACH ROW EXECUTE FUNCTION breach_reject_mutation();--> statement-breakpoint
CREATE TRIGGER breach_incident_entries_no_truncate
  BEFORE TRUNCATE ON breach_incident_entries
  FOR EACH STATEMENT EXECUTE FUNCTION breach_reject_mutation();--> statement-breakpoint
-- `recorded_at` is the DB's clock at insert, ⛔ the writer's and ⛔ the transaction's start.
CREATE FUNCTION breach_incident_entries_stamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.recorded_at := clock_timestamp();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER breach_incident_entries_stamp
  BEFORE INSERT ON breach_incident_entries
  FOR EACH ROW EXECUTE FUNCTION breach_incident_entries_stamp();
