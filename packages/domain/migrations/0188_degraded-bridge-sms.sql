-- Migration 0188 — the degraded-mode cycle-open SMS BRIDGE: its send record widened, and its Super Admin switch (Story 5.8b,
-- Task 2; `2026-10-28-415` FS8 (a), FS17 (a), FS18 (a); Panel `2026-10-28-414` Q1 A; AC3, AC12). Hand-authored — ⛔ never
-- regenerate (`db:generate` diffs against the 0020 snapshot → 42P07).
-- NUMBER (FS18 (a), a departure from `-366` decision 6 for this pair only, recorded in `-415`): 5.8b merges BEFORE 6.32, so
-- 5.8b takes 0188 and 6.32 renumbers its own 0188 (ground inspection) above this one at its rebase — allowed by `-332`
-- decision 2 because 6.32's 0188 had reached no shared database (2026-10-28). The `when` (1795837200033) sits above 0187's AND
-- above 6.32's 1795750800032 ([[project_sibling_migration_when_order_shared_db]]).
--
-- ── (1) `alert_sms_sends` admits the bridge (FS8 (a)) ───────────────────────────────────────────────────────────────────────
-- 0184's two CHECKs are REPLACED (⛔ 0184 edited): the message `cycle_open_bridge` and the occasion `cycle_open` — the string
-- the keyed store's scope and the cycle-open child's `fanOutCall` ALREADY use, so "occasion = scope" stays true. ⚠ 0184's
-- header says *"at most six texts per member per real cycle BY CONSTRUCTION"* — it is now SEVEN (the six per-member occasions
-- + the one bridge occasion): a SUPERSEDE IN PART of `-404`'s headline cap and its FS6 (a) / FS8 (d) (*"`occasion` CHECKed to
-- six literals"*), recorded in `-415`. The at-most-once key (alert, member, occasion) and the finished-row trigger are
-- unchanged. ⚠ LOCKSTEP with `ALERT_SMS_SEND_OCCASIONS` / `ALERT_SMS_SEND_MESSAGES` (schema/alert_sms_sends.ts) and the
-- contract's `AlertSmsMessage`.
-- Code review 2026-10-28 (second pass): (a) the occasion and the message are PAIRED — `cycle_open` ⇔ `cycle_open_bridge` (a new
-- CHECK; before it, `('day_10', 'cycle_open_bridge')` was admitted). (b) 0184's `detail` grammar is REPLACED to admit
-- `exhausted:ladder_delivered` — the terminal row the jobs seam writes when the ladder delivered a bridged alert and no send row
-- exists, so a later re-fan finds it and ⛔ texts. ⚠ LOCKSTEP with `ALERT_SMS_SEND_DETAIL_PATTERN` (the policy spec pins them).
--
-- ── (2) The Super Admin switch (FS17 (a); `-414` Q1's condition) ────────────────────────────────────────────────────────────
-- ONE Trust-wide switch for the bridge TEXT: `degraded_bridge_sms_switch` holds ONE row (id = 1), created OFF here — turning it
-- ON is go-live Row 43's LAST leg (i). Every change is ALSO a row of `degraded_bridge_sms_switch_changes` (who, when, ON / OFF,
-- a REQUIRED reason), APPEND-ONLY by trigger (⛔ UPDATE, ⛔ DELETE, ⛔ TRUNCATE — the 0011 posture, binding every role incl.
-- the BYPASSRLS service role). The control row may be UPDATEd (its state) and ⛔ DELETEd or TRUNCATEd (trigger), so the
-- "absent ⇒ OFF" reading never has to be trusted. Code review 2026-10-28 (second pass): every UPDATE of the control row must name a
-- NEW history row whose `enabled` equals the row's (trigger) — ⛔ a state change with no history, ⛔ a change attributed to the
-- wrong row; and the history's `audit_id` is NOT NULL (the one writer always runs under `withCompensatingAudit`). The fan-out
-- reads the control row ONCE per bridged job at its bridge attempt (`contribution-notify.ts`), so turning it OFF also stops texts
-- already queued.
-- GLOBAL tables (⛔ `pariwar_id` — the switch is Trust-wide): ENABLE + FORCE RLS with an explicit `USING (true)` SELECT policy
-- for `twt_app` — the audit_integrity_acknowledgements (0011) posture. `twt_app` gets SELECT ONLY: the change endpoint writes
-- through the BYPASSRLS service pool behind `requireGlobalPermission` (the new key, held by `super_admin` alone), so ⛔ write
-- policy is needed for `twt_app`, and a `twt_app` write is refused by its missing grant. ⚠ The history's `twt_app` SELECT is
-- kept (code review 2026-10-28 (second pass), family 6, re-examined): the read endpoint uses the service pool, but the jobs'
-- send-point read (`readDegradedBridgeSmsSwitch`, which JOINs the history) is modelled as `twt_app` while the jobs login's
-- posture is undecided (roster Row 26) — narrow that read to the control row before revoking it.
-- PII: a staff member's NAME — `changed_by_display`, the Super Admin's display-name snapshot (R5 attribution) — plus a staff
-- actor id and an operator-authored reason. ⛔ Member PII.

ALTER TABLE "alert_sms_sends" DROP CONSTRAINT "alert_sms_sends_occasion_check";--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_occasion_check" CHECK ("occasion" IN ('day_10', 'pending_match_escalated', 'mismatch:wrong_pool', 'mismatch:amount_mismatch', 'mismatch:entry_already_claimed', 'mismatch:sender_vpa_mismatch', 'cycle_open'));--> statement-breakpoint
ALTER TABLE "alert_sms_sends" DROP CONSTRAINT "alert_sms_sends_message_check";--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_message_check" CHECK ("message" IN ('deadline_not_recorded', 'payment_not_matched', 'payment_not_confirmed', 'cycle_open_bridge'));--> statement-breakpoint
-- Code review 2026-10-28 (second pass) — the bridge occasion carries the bridge message, and ONLY it carries it.
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_bridge_pairing_check" CHECK (("occasion" = 'cycle_open') = ("message" = 'cycle_open_bridge'));--> statement-breakpoint
ALTER TABLE "alert_sms_sends" DROP CONSTRAINT "alert_sms_sends_detail_vocabulary_check";--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(exhausted:outcome_unknown(:(api_unavailable|unknown):[A-Za-z0-9_.-]{1,64})?|(exhausted:)?rate_limited:[A-Za-z0-9_.-]{1,64}|exhausted:config_unavailable:secret_manager|exhausted:ladder_delivered|config:sms_messaging_unavailable|(invalid_number|carrier_reject|auth|dlt_template_not_approved):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint
CREATE TABLE "degraded_bridge_sms_switch_changes" (
	"change_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean NOT NULL,
	"changed_by_actor" uuid NOT NULL,
	"changed_by_display" text NOT NULL,
	"reason" text NOT NULL,
	"audit_id" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
-- A REQUIRED reason: non-blank, bounded (the declaration's reason bound).
ALTER TABLE "degraded_bridge_sms_switch_changes" ADD CONSTRAINT "degraded_bridge_sms_switch_changes_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 500);--> statement-breakpoint
-- WHO, by name: the Super Admin's `users.display_name` SNAPSHOT at change time (code review 2026-10-28, P2-2 — R5 attribution; a
-- later rename never rewrites history; ⛔ email-derived). Non-blank — the handler refuses a nameless account before any write.
ALTER TABLE "degraded_bridge_sms_switch_changes" ADD CONSTRAINT "degraded_bridge_sms_switch_changes_display_check" CHECK (char_length(btrim("changed_by_display")) >= 1);--> statement-breakpoint
CREATE INDEX "degraded_bridge_sms_switch_changes_changed_at_idx" ON "degraded_bridge_sms_switch_changes" USING btree ("changed_at");--> statement-breakpoint
CREATE TABLE "degraded_bridge_sms_switch" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"last_change_id" uuid,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
-- ONE row, ever.
ALTER TABLE "degraded_bridge_sms_switch" ADD CONSTRAINT "degraded_bridge_sms_switch_singleton_check" CHECK ("id" = 1);--> statement-breakpoint
ALTER TABLE "degraded_bridge_sms_switch" ADD CONSTRAINT "degraded_bridge_sms_switch_last_change_id_fk" FOREIGN KEY ("last_change_id") REFERENCES "public"."degraded_bridge_sms_switch_changes"("change_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⭐ Created OFF (FS17 (a)): go-live is a deliberate act by a named Super Admin.
INSERT INTO "degraded_bridge_sms_switch" ("id", "enabled") VALUES (1, false);--> statement-breakpoint
-- Grants: `twt_app` reads (the jobs' send-point read, the read endpoint); the BYPASSRLS service role writes (the change endpoint).
GRANT SELECT ON "degraded_bridge_sms_switch" TO twt_app;--> statement-breakpoint
GRANT SELECT ON "degraded_bridge_sms_switch_changes" TO twt_app;--> statement-breakpoint
GRANT SELECT, UPDATE ("enabled", "last_change_id", "updated_at") ON "degraded_bridge_sms_switch" TO twt_service;--> statement-breakpoint
GRANT SELECT, INSERT ON "degraded_bridge_sms_switch_changes" TO twt_service;--> statement-breakpoint
ALTER TABLE "degraded_bridge_sms_switch" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "degraded_bridge_sms_switch" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "degraded_bridge_sms_switch_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "degraded_bridge_sms_switch_changes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Global tables — no row is hidden from a `twt_app` reader (policies/degraded-bridge-sms-switch-rls.ts).
CREATE POLICY "degraded_bridge_sms_switch_global_select" ON "degraded_bridge_sms_switch" AS PERMISSIVE FOR SELECT TO "twt_app" USING (true);--> statement-breakpoint
CREATE POLICY "degraded_bridge_sms_switch_changes_global_select" ON "degraded_bridge_sms_switch_changes" AS PERMISSIVE FOR SELECT TO "twt_app" USING (true);--> statement-breakpoint
-- APPEND-ONLY history: ⛔ UPDATE / DELETE / TRUNCATE, for every role (incl. BYPASSRLS — a trigger binds it).
CREATE FUNCTION degraded_bridge_sms_switch_changes_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'degraded_bridge_sms_switch_changes is append-only (Story 5.8b, FS17 (a)): % rejected', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;--> statement-breakpoint
CREATE TRIGGER degraded_bridge_sms_switch_changes_no_update_delete
  BEFORE UPDATE OR DELETE ON degraded_bridge_sms_switch_changes
  FOR EACH ROW EXECUTE FUNCTION degraded_bridge_sms_switch_changes_reject_mutation();--> statement-breakpoint
CREATE TRIGGER degraded_bridge_sms_switch_changes_no_truncate
  BEFORE TRUNCATE ON degraded_bridge_sms_switch_changes
  FOR EACH STATEMENT EXECUTE FUNCTION degraded_bridge_sms_switch_changes_reject_mutation();--> statement-breakpoint
-- The control row: ⛔ DELETE / TRUNCATE (an absent row must never be what "OFF" rests on).
CREATE FUNCTION degraded_bridge_sms_switch_reject_removal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'degraded_bridge_sms_switch row cannot be removed (Story 5.8b, FS17 (a)): % rejected', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;--> statement-breakpoint
CREATE TRIGGER degraded_bridge_sms_switch_no_delete
  BEFORE DELETE ON degraded_bridge_sms_switch
  FOR EACH ROW EXECUTE FUNCTION degraded_bridge_sms_switch_reject_removal();--> statement-breakpoint
CREATE TRIGGER degraded_bridge_sms_switch_no_truncate
  BEFORE TRUNCATE ON degraded_bridge_sms_switch
  FOR EACH STATEMENT EXECUTE FUNCTION degraded_bridge_sms_switch_reject_removal();--> statement-breakpoint
-- Code review 2026-10-28 (second pass) — the control row moves ONLY with its history: each UPDATE names a NEW change, and that
-- change set the state the row now says. A dangling id passes here and is refused by the FK (23503), so that refusal stays the FK's.
CREATE FUNCTION degraded_bridge_sms_switch_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  change_enabled boolean;
BEGIN
  IF NEW.last_change_id IS NULL OR NEW.last_change_id IS NOT DISTINCT FROM OLD.last_change_id THEN
    RAISE EXCEPTION 'degraded_bridge_sms_switch: an update must name a NEW history row (Story 5.8b, FS17 (a))'
      USING ERRCODE = 'P0001';
  END IF;
  SELECT c.enabled INTO change_enabled FROM degraded_bridge_sms_switch_changes c WHERE c.change_id = NEW.last_change_id;
  IF FOUND AND change_enabled IS DISTINCT FROM NEW.enabled THEN
    RAISE EXCEPTION 'degraded_bridge_sms_switch: enabled = % but history row % set % (Story 5.8b, FS17 (a))',
      NEW.enabled, NEW.last_change_id, change_enabled
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER degraded_bridge_sms_switch_guard_update
  BEFORE UPDATE ON degraded_bridge_sms_switch
  FOR EACH ROW EXECUTE FUNCTION degraded_bridge_sms_switch_guard_update();
