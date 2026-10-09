-- Migration 0153 — 0152's DB backstops + the give-up anchor (Story 6.25 code review ROUNDS 3–4 — Decision 2 option A and D3 option
-- A, the user's calls, 2026-10-09; `2026-10-09-300`; checklist families 5 / 1). Hand-authored — ⛔ never regenerate (`db:generate`
-- diffs against the 0020 snapshot).
--
-- ⭐ (1) THE `detail` VOCABULARY, MIRRORED. 0152 checked only `char_length <= 200`, so "a FIXED vocabulary, ⛔ ever provider
-- message text (SES error messages LIST addresses)" rested on every caller routing through `suspicionStaffEmailDetail`. These
-- CHECKs admit EXACTLY that builder's grammar — ⛔ `@`, ⛔ a space, ⛔ free text. ⚠ LOCKSTEP with
-- `SUSPICION_STAFF_EMAIL_DETAIL_PATTERN` (schema/claim_suspicion_staff_emails.ts — the writers assert the SAME pattern; a spec pins
-- the two equal). ⚠ The length CHECKs stay and are named BEFORE these (PG evaluates CHECKs in name order), so an over-long value
-- still reports the length CHECK.
-- ⭐ (2) A FINISHED ROW IS FROZEN, and `may_have_sent` NEVER GOES BACK. 0152's column-narrowed UPDATE grant covers `outcome` and
-- `may_have_sent`, so "once ever for FINISHED rows" (RE2) and "set TRUE, never back" (RE5) rested on every writer's
-- `outcome = 'attempting'` / `may_have_sent OR …` form. The trigger refuses ANY update of a row whose outcome is not
-- `attempting`, and `may_have_sent` true → false on an `attempting` row. ⛔ No DELETE / TRUNCATE arm: `twt_app` holds neither
-- (0152), and the claim FK's `ON DELETE cascade` must keep working.
-- ⭐ (3) THE GIVE-UP ANCHOR — `aging_since` (code review round 4, D3 option A; `2026-10-09-300` §2 (ii)). The three-IST-day give-up
-- counted from `created_at`, so a row that sat out a HOLD (parked — `claimed_by_job` = 'sweep:held') burned after ONE post-hold
-- child. The give-up now counts from `aging_since`, which re-claiming a PARKED row resets to now (a fresh three IST days of ordinary
-- retries). Existing rows start from their `created_at`. The give-up's partial index moves to it. Added BEFORE the trigger so the
-- backfill can touch finished rows.
-- ⚠ 0151 (`claim_suspicion_notices`) has the same gaps — ⛔ touched here (a joint 0151 hardening stays with its own deferred items).
-- ⚠ Never committed before this edit: a database that applied the EARLIER 0153 (round 3) needs the `aging_since` statements below
-- run by hand (the migrator skips by the journal `when`) — done on :5432 and :5433 on 2026-10-09.

ALTER TABLE "claim_suspicion_staff_emails" ADD COLUMN "aging_since" timestamp with time zone;--> statement-breakpoint
UPDATE "claim_suspicion_staff_emails" SET "aging_since" = "created_at";--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ALTER COLUMN "aging_since" SET DEFAULT clock_timestamp();--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ALTER COLUMN "aging_since" SET NOT NULL;--> statement-breakpoint
-- `aging_since` is ⛔ in the INSERT grant (its DEFAULT); UPDATE only by the re-claim of a parked row.
GRANT UPDATE ("aging_since") ON "claim_suspicion_staff_emails" TO twt_app;--> statement-breakpoint
DROP INDEX "claim_suspicion_staff_emails_attempting_idx";--> statement-breakpoint
CREATE INDEX "claim_suspicion_staff_emails_attempting_idx" ON "claim_suspicion_staff_emails" USING btree ("aging_since", "claimed_at") WHERE "outcome" = 'attempting';--> statement-breakpoint

ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(no_pariwar_admin|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_(refusal_not_standing|recipient_not_eligible|recipients_exist|claim_has_rows)))$');--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(no_pariwar_admin|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_(refusal_not_standing|recipient_not_eligible|recipients_exist|claim_has_rows)))$');--> statement-breakpoint

CREATE FUNCTION claim_suspicion_staff_emails_guard_update()
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
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_suspicion_staff_emails_guard_update
  BEFORE UPDATE ON claim_suspicion_staff_emails
  FOR EACH ROW EXECUTE FUNCTION claim_suspicion_staff_emails_guard_update();
