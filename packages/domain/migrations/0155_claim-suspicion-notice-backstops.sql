-- Migration 0155 — 0151's DB backstops, the give-up anchor and the hold park (Story 6.29, Task 1; `2026-10-10-302` RN3, RN5, RN6,
-- RN8 — 6.25's 0153 / 0154 ADAPTED to the SMS notices). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020
-- snapshot).
--
-- ⭐ (1) THE GIVE-UP ANCHOR (RN3). The three-IST-day give-up counted from `created_at`, so a crash-left row of a purpose / Pariwar a
-- config gap HELD aged out with ⛔ retry (`-295` RB12 edge (iii)). `aging_since` (existing rows: their `created_at`) is the anchor; a
-- HELD sweep PARKS a stalled row (`claimed_by_job` = 'sweep:held', `parked_at` = the run's instant — `-302` RN2), and re-claiming it
-- moves `aging_since` FORWARD by the time it sat parked (`-301`'s rule). The CHECK: an `attempting` row is parked ⟺ it carries
-- `parked_at` (a finished row may keep it — the trigger freezes it anyway). Added BEFORE the trigger so the backfill can touch
-- finished rows. The give-up's partial index moves to the anchor.
-- ⭐ (2) THE `detail` GRAMMAR, MIRRORED (RN5). 0151 checked nothing — ⛔ even a length — so "⛔ PII, ⛔ provider free text" rested on
-- every writer. These CHECKs admit EXACTLY `suspicionNoticeDetail`'s grammar (⛔ a space, ⛔ `+`, ⛔ a run of 7+ digits — a bare phone
-- number). ⚠ LOCKSTEP with `SUSPICION_NOTICE_DETAIL_PATTERN` (schema/claim_suspicion_notices.ts — the writers assert the SAME pattern;
-- a spec pins the two equal). The length CHECKs are named BEFORE the grammar ones (PG evaluates CHECKs in name order).
-- ⭐ (3) A FINISHED ROW IS FROZEN (RN6). The trigger refuses ANY update of a row whose outcome is ⛔ `attempting`, and ANY change of
-- `aging_since` except FORWARD on the re-claim of a parked row. ⛔ `may_have_sent` (RN6 A — a known difference from 0153). ⛔ DELETE /
-- TRUNCATE arm: `twt_app` holds neither, and the claim FK's `ON DELETE cascade` must keep working.
-- ⭐ (4) THREE 6.24b ROUND-3 DEFERS CLOSED (RN8): an `attempting` row also names its holder (`claimed_by_job`); the INSERT grant is
-- column-narrowed to the writers' union; the partial index is asserted by name (the policy spec). ⚠ The grants bind `twt_app` only —
-- the production jobs login is a separate gap (roster Row 26); the CHECKs and the trigger bind EVERY role.
-- ⚠ Checked BEFORE this file (Task 1.1, 2026-10-10): :5432 and :5433 hold ⛔ 0151 row, so ⛔ existing value can fail a CHECK.

ALTER TABLE "claim_suspicion_notices" ADD COLUMN "aging_since" timestamp with time zone;--> statement-breakpoint
UPDATE "claim_suspicion_notices" SET "aging_since" = "created_at";--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ALTER COLUMN "aging_since" SET DEFAULT clock_timestamp();--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ALTER COLUMN "aging_since" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD COLUMN "parked_at" timestamp with time zone;--> statement-breakpoint
DROP INDEX "claim_suspicion_notices_attempting_idx";--> statement-breakpoint
CREATE INDEX "claim_suspicion_notices_attempting_idx" ON "claim_suspicion_notices" USING btree ("aging_since", "claimed_at") WHERE "outcome" = 'attempting';--> statement-breakpoint

-- RN8 (a) — an in-flight row says WHEN it was claimed AND by WHOM (the lease, the compare-and-set and the park read both).
ALTER TABLE "claim_suspicion_notices" DROP CONSTRAINT "claim_suspicion_notices_attempting_claimed_check";--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_attempting_claimed_check" CHECK ("outcome" <> 'attempting' OR ("claimed_at" IS NOT NULL AND "claimed_by_job" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_parked_check" CHECK ("outcome" <> 'attempting' OR (("claimed_by_job" = 'sweep:held') = ("parked_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_detail_length_check" CHECK ("detail" IS NULL OR char_length("detail") <= 200);--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_first_detail_length_check" CHECK ("first_detail" IS NULL OR char_length("first_detail") <= 200);--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(exhausted:(attempting_three_days|recheck_(not_standing|not_closed_by_appeal|appeal_(time_limit_passed|open|upheld_final)))|no_target:(not_effective|no_contact_record|no_sendable_number|closed_no_determination)|excluded:claimant_discarded_version|name:(none|erased|unresolvable)|decrypt_failed:(kyc|tier1)|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(?!.*[0-9]{7})(exhausted:(attempting_three_days|recheck_(not_standing|not_closed_by_appeal|appeal_(time_limit_passed|open|upheld_final)))|no_target:(not_effective|no_contact_record|no_sendable_number|closed_no_determination)|excluded:claimant_discarded_version|name:(none|erased|unresolvable)|decrypt_failed:(kyc|tier1)|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint

-- RN8 (b) — INSERT column-narrowed to EXACTLY the two writers' union (`beginSuspicionNotice`'s `attempting` claim and its finished
-- `no_target` row); ⛔ `notice_id`, `created_at`, `aging_since`, `attempt_count` (their DEFAULTs), ⛔ `parked_at` (a fresh row is never
-- parked). UPDATE gains the anchor (the parked re-claim) and `parked_at` (the park sets it, the re-claim clears it).
REVOKE INSERT ON "claim_suspicion_notices" FROM twt_app;--> statement-breakpoint
GRANT INSERT ("pariwar_id", "claim_case_id", "purpose", "outcome", "detail", "claimed_at", "claimed_by_job") ON "claim_suspicion_notices" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("aging_since", "parked_at") ON "claim_suspicion_notices" TO twt_app;--> statement-breakpoint

CREATE FUNCTION claim_suspicion_notices_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.outcome <> 'attempting' THEN
    RAISE EXCEPTION
      'claim_suspicion_notices: a finished row (%) is never updated — once per (claim, purpose), ever (Story 6.29, -302 RN6)', OLD.outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- `-302` RN3 — the give-up's anchor moves ONLY forward, and ONLY when a PARKED row is re-claimed.
  IF NEW.aging_since IS DISTINCT FROM OLD.aging_since
     AND (OLD.claimed_by_job IS DISTINCT FROM 'sweep:held' OR NEW.aging_since < OLD.aging_since) THEN
    RAISE EXCEPTION
      'claim_suspicion_notices: aging_since moves only forward, and only on the re-claim of a parked row (Story 6.29, -302 RN3)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_suspicion_notices_guard_update
  BEFORE UPDATE ON claim_suspicion_notices
  FOR EACH ROW EXECUTE FUNCTION claim_suspicion_notices_guard_update();
