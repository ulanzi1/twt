-- Migration 0154 — credit a PARKED staff email only the time it spent parked (Story 6.25 code review ROUND 5, D4 option A — the
-- user's call, 2026-10-09; `2026-10-09-301`, superseding `-300` §2 (ii)'s reset). Hand-authored — ⛔ never regenerate (`db:generate`
-- diffs against the 0020 snapshot).
--
-- ⭐ (1) `parked_at` — the instant a HELD sweep parked the row (`claimed_by_job` = 'sweep:held'); cleared by the re-claim. A CHECK
-- ties the two: an `attempting` row is parked ⟺ it carries `parked_at` (a finished row may keep it — the `-297` §2 finish and the
-- give-up never clear it, and the 0153 trigger freezes finished rows anyway).
-- ⭐ (2) Re-claiming a parked row moves `aging_since` FORWARD by (now − `parked_at`) — ⛔ to now (round 4's reset let one pre-flight
-- blip every few days keep a failing row `attempting` forever). The give-up's three IST days are three days of NON-parked time.
-- ⭐ (3) The 0153 trigger gains an arm: `aging_since` may change ONLY forward, and ONLY on the re-claim of a parked row.
-- Existing parked rows (if any) take `parked_at` = their `updated_at` (the park's own write) BEFORE the CHECK is added.

ALTER TABLE "claim_suspicion_staff_emails" ADD COLUMN "parked_at" timestamp with time zone;--> statement-breakpoint
UPDATE "claim_suspicion_staff_emails" SET "parked_at" = "updated_at" WHERE "outcome" = 'attempting' AND "claimed_by_job" = 'sweep:held';--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_parked_check" CHECK ("outcome" <> 'attempting' OR (("claimed_by_job" = 'sweep:held') = ("parked_at" IS NOT NULL)));--> statement-breakpoint
-- `parked_at` is ⛔ in the INSERT grant (a fresh row is never parked); UPDATE by the park (set) and the re-claim (clear).
GRANT UPDATE ("parked_at") ON "claim_suspicion_staff_emails" TO twt_app;--> statement-breakpoint

CREATE OR REPLACE FUNCTION claim_suspicion_staff_emails_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.outcome <> 'attempting' THEN
    RAISE EXCEPTION
      'claim_suspicion_staff_emails: a finished row (%) is never updated — once per (claim, recipient), ever (Story 6.25 RE2)', OLD.outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.may_have_sent AND NOT NEW.may_have_sent THEN
    RAISE EXCEPTION
      'claim_suspicion_staff_emails: may_have_sent is set TRUE, never back (Story 6.25 RE5)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- 0154 (`-301` §2 (ii)) — the give-up's anchor moves ONLY forward, and ONLY when a PARKED row is re-claimed.
  IF NEW.aging_since IS DISTINCT FROM OLD.aging_since
     AND (OLD.claimed_by_job IS DISTINCT FROM 'sweep:held' OR NEW.aging_since < OLD.aging_since) THEN
    RAISE EXCEPTION
      'claim_suspicion_staff_emails: aging_since moves only forward, and only on the re-claim of a parked row (Story 6.25, -301)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
