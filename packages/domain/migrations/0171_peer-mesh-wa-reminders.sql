-- Migration 0171 — the WhatsApp REMINDER's own record (Story 6.31, Task 1; AC1; WR1, WR10, I1; `2026-10-10-303` Q1 A,
-- `2026-10-10-311` PM7 (g) / Trap 17; `2026-10-19-365`). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the
-- 0020 snapshot; the migrator skips by the journal `when`). ⛔ DROP SCHEMA.
--
-- ⭐ WHY A SEPARATE TABLE (F1). The text's record lives ON the ping row (0156), under a REVOKE + column GRANT and a finished-row
-- trigger written for the TEXT (0156 / 0166). 0156's header: *"It freezes ONLY the delivery columns, so row 6-31's WhatsApp
-- reminder can keep its OWN record (Trap 17)."* A reminder column on the ping would need its own GRANT and sit under that
-- trigger ⇒ ONE row here per ping, ⛔ a column of `claim_peer_mesh_pings` touched, ⛔ a 0156 / 0166 object changed.
--
-- ⭐ I1 — ONCE EVER PER PING: `UNIQUE (ping_id)`. A row is created ONLY by the claim child's begin, under the claim → ping locks
-- (`INSERT … ON CONFLICT (ping_id) DO NOTHING`, then a compare-and-set) — ⛔ a set-based INSERT (T10). A begin that finds the
-- neighbour answered / the window closed / not opted in / ineligible writes a FINISHED `skipped_*` row, so the ping is ⛔ ever
-- judged twice. ⛔ A row for a ping that was never due (WR5 — ⛔ backfill).
-- ⭐ THE IN-FLIGHT MARKER (WR10): `send_started_at` is set in its OWN committed CAS immediately before the WhatsApp call and
-- cleared ONLY by a park (Meta answered with a refusal) or a pre-send / rate-limit transient. A lapsed `attempting` row WITH the
-- marker died mid-flight ⇒ finished `error` / `may_have_sent:lease_lapsed` by the sweep — ⛔ ever re-claimed (Meta has ⛔
-- idempotency key). The CHECKs below pin the marker to what each outcome means.
-- ⭐ THE FINISHED-ROW TRIGGER: once ⛔ `attempting`, ⛔ delivery column changes (0156's shape); while `attempting`:
-- `attempt_count` ⛔ decreases, `first_detail` is written once, `aging_since` moves only forward, and `send_started_at` moves
-- only NULL → set or set → NULL (⛔ re-stamped).
-- ⭐ THE `detail` GRAMMAR — ⚠ LOCKSTEP with `PEER_MESH_WA_REMINDER_DETAIL_PATTERN` (schema/claim_peer_mesh_wa_reminders.ts — a
-- spec pins the two equal). ⛔ A space, ⛔ `+`, ⛔ a run of 7+ digits (a bare phone number). ⛔ PII anywhere in the row: ids, a
-- KEYED number hash, the wamid, the template NAME (a config value), a fixed-vocabulary `detail` — ⛔ a name, ⛔ a number, ⛔ the
-- link code or the link (T11).
-- GRANTS — `SELECT, INSERT` + a column-limited UPDATE on the DELIVERY columns only (⛔ identity, ⛔ `created_at`, ⛔ DELETE —
-- the claim / ping cascades still work). Per-command policies that MATCH the grants. ⚠ Jobs' PRODUCTION role is roster Row 26
-- (`jobs-db-role`, OPEN — the sweep refuses first under an RLS-bound role, `canReadAcrossPariwars`).
-- ⚠ Checked BEFORE this file (Story 6.31 Task 1, 2026-10-19): a NEW table — ⛔ existing row can fail a CHECK; ⛔ object of this
-- name on :5432 or :5433 (`SELECT to_regclass('claim_peer_mesh_wa_reminders')` ⇒ NULL on both).
-- Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger (0119).

CREATE TABLE "claim_peer_mesh_wa_reminders" (
	"reminder_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ping_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"selection_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"send_outcome" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_job" text,
	"aging_since" timestamp with time zone,
	"parked_at" timestamp with time zone,
	"send_started_at" timestamp with time zone,
	"detail" text,
	"first_detail" text,
	"provider_message_id" text,
	"recipient_number_hash" text,
	"template_name" text,
	"locale" text,
	"locale_source" text,
	"send_updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "claim_peer_mesh_wa_reminders_ping_uq" UNIQUE ("ping_id")
);--> statement-breakpoint
-- The ping's OWNER (tenant, selection, neighbour) and the selection's claim — the reply tables' composite-FK shape (0157), so
-- a reminder can ⛔ name another Pariwar's ping or a claim that is ⛔ its selection's.
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_ping_owner_fk" FOREIGN KEY ("pariwar_id", "ping_id", "selection_id", "member_id") REFERENCES "public"."claim_peer_mesh_pings"("pariwar_id", "ping_id", "selection_id", "member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_selection_owner_fk" FOREIGN KEY ("pariwar_id", "selection_id", "claim_case_id") REFERENCES "public"."claim_peer_mesh_selections"("pariwar_id", "selection_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `PEER_MESH_WA_REMINDER_SEND_OUTCOMES` (schema/claim_peer_mesh_wa_reminders.ts).
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_send_outcome_check" CHECK ("send_outcome" IN ('attempting', 'accepted', 'rejected_recipient', 'no_target', 'error', 'skipped_answered', 'skipped_window_closed', 'skipped_not_opted_in', 'skipped_recipient_ineligible', 'skipped_late'));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_attempting_claimed_check" CHECK ("send_outcome" <> 'attempting' OR ("claimed_at" IS NOT NULL AND "claimed_by_job" IS NOT NULL AND "aging_since" IS NOT NULL));--> statement-breakpoint
-- The PARKED marker ⇔ `parked_at`, on EVERY row (WR5 — the late marking clears the two together).
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_parked_check" CHECK (("claimed_by_job" IS NOT DISTINCT FROM 'sweep:held') = ("parked_at" IS NOT NULL) AND ("parked_at" IS NULL OR "send_outcome" = 'attempting'));--> statement-breakpoint
-- ⭐ THE IN-FLIGHT MARKER (WR10): set only on a claimed row; ⛔ on a parked row; ⛔ on a skip; and on a finished row it is set
-- EXACTLY when a WhatsApp call was made (`accepted` / `rejected_recipient` / `error` — `error` is `may_have_sent:*` only).
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_send_started_claimed_check" CHECK ("send_started_at" IS NULL OR "claimed_at" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_send_started_parked_check" CHECK ("claimed_by_job" IS DISTINCT FROM 'sweep:held' OR "send_started_at" IS NULL);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_send_started_outcome_check" CHECK ("send_outcome" = 'attempting' OR ("send_outcome" IN ('accepted', 'rejected_recipient', 'error')) = ("send_started_at" IS NOT NULL));--> statement-breakpoint
-- An ACCEPTED reminder carries the wamid (the trail — WR11) and the number's keyed hash.
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_accepted_check" CHECK ("send_outcome" <> 'accepted' OR ("provider_message_id" IS NOT NULL AND "recipient_number_hash" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_locale_check" CHECK ("locale" IS NULL OR "locale" IN ('en', 'hi'));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_locale_source_check" CHECK ("locale_source" IS NULL OR "locale_source" IN ('pariwar_default'));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_template_name_check" CHECK ("template_name" IS NULL OR ("template_name" ~ '^[a-z0-9_]+$' AND char_length("template_name") <= 512));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(rate_limited:([0-9]{1,6}|none)|api_unavailable:[0-9]{3}|decrypt_failed:tier1|hash_failed:tier1|may_have_sent:(network|timeout|no_wamid|lease_lapsed|gateway_502|gateway_504|unknown)|(scope|held):[a-z0-9_]{1,48}|no_target:(no_sendable_number|name_none|name_erased|name_unresolvable))$');--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(?!.*[0-9]{7})(rate_limited:([0-9]{1,6}|none)|api_unavailable:[0-9]{3}|decrypt_failed:tier1|hash_failed:tier1|may_have_sent:(network|timeout|no_wamid|lease_lapsed|gateway_502|gateway_504|unknown)|(scope|held):[a-z0-9_]{1,48}|no_target:(no_sendable_number|name_none|name_erased|name_unresolvable))$');--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_peer_mesh_wa_reminders" TO twt_app;--> statement-breakpoint
-- The DELIVERY columns only — ⛔ `reminder_id`, `ping_id`, `pariwar_id`, `claim_case_id`, `selection_id`, `member_id`,
-- `created_at`. ⚠ LOCKSTEP with the trigger's `delivery_cols` below.
GRANT UPDATE ("send_outcome", "attempt_count", "claimed_at", "claimed_by_job", "aging_since", "parked_at", "send_started_at", "detail", "first_detail", "provider_message_id", "recipient_number_hash", "template_name", "locale", "locale_source", "send_updated_at") ON "claim_peer_mesh_wa_reminders" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_wa_reminders_tenant_isolation_select" ON "claim_peer_mesh_wa_reminders" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_wa_reminders_tenant_isolation_insert" ON "claim_peer_mesh_wa_reminders" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_wa_reminders_tenant_isolation_update" ON "claim_peer_mesh_wa_reminders" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_peer_mesh_wa_reminders_claim_idx" ON "claim_peer_mesh_wa_reminders" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
-- The sweep's lapsed / parked / late scans read only the un-finished rows.
CREATE INDEX "claim_peer_mesh_wa_reminders_attempting_idx" ON "claim_peer_mesh_wa_reminders" USING btree ("claimed_at") WHERE "send_outcome" = 'attempting';--> statement-breakpoint

CREATE FUNCTION claim_peer_mesh_wa_reminders_guard_delivery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  delivery_cols text[] := ARRAY['send_outcome', 'attempt_count', 'claimed_at', 'claimed_by_job', 'aging_since', 'parked_at',
    'send_started_at', 'detail', 'first_detail', 'provider_message_id', 'recipient_number_hash', 'template_name', 'locale',
    'locale_source', 'send_updated_at'];
  old_delivery jsonb;
  new_delivery jsonb;
BEGIN
  old_delivery := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(delivery_cols) AS k);
  new_delivery := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(delivery_cols) AS k);
  IF OLD.send_outcome <> 'attempting' AND new_delivery IS DISTINCT FROM old_delivery THEN
    RAISE EXCEPTION
      'claim_peer_mesh_wa_reminders: a finished reminder (%) is never rewritten — one reminder per ping, ever (Story 6.31 I1)', OLD.send_outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.send_outcome = 'attempting' THEN
    IF NEW.attempt_count < OLD.attempt_count THEN
      RAISE EXCEPTION 'claim_peer_mesh_wa_reminders: attempt_count never decreases (Story 6.31 WR1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.first_detail IS NOT NULL AND NEW.first_detail IS DISTINCT FROM OLD.first_detail THEN
      RAISE EXCEPTION 'claim_peer_mesh_wa_reminders: first_detail is written once (Story 6.31 WR1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW.aging_since IS NULL OR NEW.aging_since < OLD.aging_since THEN
      RAISE EXCEPTION 'claim_peer_mesh_wa_reminders: aging_since moves only forward (Story 6.31 WR1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.send_started_at IS NOT NULL AND NEW.send_started_at IS NOT NULL AND NEW.send_started_at IS DISTINCT FROM OLD.send_started_at THEN
      RAISE EXCEPTION 'claim_peer_mesh_wa_reminders: the in-flight marker is set once per send — cleared only by a park or a transient (Story 6.31 WR10)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_peer_mesh_wa_reminders_guard_delivery
  BEFORE UPDATE ON claim_peer_mesh_wa_reminders
  FOR EACH ROW EXECUTE FUNCTION claim_peer_mesh_wa_reminders_guard_delivery();
