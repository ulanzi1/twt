-- Migration 0209 — the breach register after its code review (Story 14.3; decision `2026-11-20-471`; review 2026-11-20).
-- Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot → 42P07). A NEW migration, ⛔ an edit of 0208:
-- 0208 has been applied to test databases, and an applied migration is never rewritten.
-- NUMBER: the next free at the commit — 0208 (this branch) is the highest on any ref; the open siblings `story/6-22b-…` (0198) and
-- `story/6-39-…` (0192) sit on stale bases. The `when` (1797997500000) sits above 0208's 1797996600050 and every sibling's.
--
-- 1. The entry kinds widen to FIFTEEN: `board_extension_withdrawn` (decision `2026-11-20-471` call 1 — a wrong Board extension is
--    withdrawn by a new entry naming it; the due time falls back). LOCKSTEP: `BREACH_ENTRY_KINDS` (schema/breach_incidents.ts) and
--    the contracts mirror; the regression spec compares the list with `pg_get_constraintdef`. Re-created under the SAME name, so
--    every reader of the constraint name is unchanged. Every stored row satisfies the wider list (validated on re-add).
-- 2. `breach_incidents.opened_at` is STAMPED by a BEFORE INSERT trigger with `now()` (review finding: it was only a DEFAULT, so an
--    INSERT that supplied it could backdate the record and get past `breach_incidents_aware_before_opened_check`). `now()` — the
--    same value the DEFAULT gave — keeps the CHECK's meaning; the CHECK is evaluated AFTER the BEFORE trigger.

ALTER TABLE "breach_incident_entries" DROP CONSTRAINT "breach_incident_entries_kind_check";--> statement-breakpoint
ALTER TABLE "breach_incident_entries" ADD CONSTRAINT "breach_incident_entries_kind_check" CHECK ("kind" IN ('assessment', 'timeline_event', 'mitigation', 'cause_findings', 'remedial', 'principals_notice_recorded', 'board_initial_recorded', 'board_report_recorded', 'board_extension_recorded', 'board_extension_withdrawn', 'cert_in_report_recorded', 'owner_review', 'signoff_recorded', 'closed', 'note'));--> statement-breakpoint
-- `opened_at` is the DB's clock at insert, ⛔ the writer's.
CREATE FUNCTION breach_incidents_stamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.opened_at := now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER breach_incidents_stamp
  BEFORE INSERT ON breach_incidents
  FOR EACH ROW EXECUTE FUNCTION breach_incidents_stamp();
