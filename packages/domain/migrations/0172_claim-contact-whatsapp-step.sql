-- Migration 0172 — the claimant's WHATSAPP STEP of the delivery ladder (Story 6.37d, Task 3; AC8; WS8, WS10, WS11; I4, I8;
-- `2026-10-17-350` ruling 2 (1), `-351` 4 A, `-357`, `2026-10-20-367`, `2026-10-20-368`). Hand-authored — ⛔ never regenerate
-- (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`). ⛔ DROP SCHEMA. A FORWARD migration —
-- ⛔ an edit of 0169 / 0170 / 0171 (all applied — [[project_live_db_test_gotchas]]).
--
-- (1) `claim_contact_ladders.whatsapp_step` MOVES ONCE (WS8 (i)). 0169 made it identity (⛔ in the UPDATE grant; its CHECK
--     `^(pending|skipped:…)$`; its comment: *"row 6-37d may add values"*). Now: `pending → sent | skipped:<reason>` and never
--     again — `sent` is written when the step's send row is CLAIMED (6.37c Debug Log (b) 2: a refusal at send still counts as
--     sent; the ladder runs on). The column joins the UPDATE grant, the CHECK gains `sent`, and a BEFORE UPDATE trigger refuses
--     any change FROM a non-`pending` value (it stays identity once decided) — the jobs pool bypasses the grant, the trigger
--     does ⛔. Ladders already written keep their recorded skip (`skipped:whatsapp_not_built` / `skipped:nominee_no_whatsapp`).
-- (2) `claim_contact_wa_sends` — TENANT-scoped. ONE row per ladder, EVER (`UNIQUE (ladder_id)` — I4): the step's send record,
--     on 6.31's crash-safe shape (0171): claimed `attempting` under the chase lock, an IN-FLIGHT MARKER (`send_started_at`) set
--     in its OWN committed CAS just before Meta, finished by compare-and-set. 6.37d's OWN marker mapping (⛔ 0171's, which ties
--     the marker to `accepted | rejected_recipient | error` and would refuse every `refused`): on a finished row the marker is
--     set EXACTLY when a WhatsApp call was made — `accepted`, `rejected_recipient`, `may_have_sent`, `refused`; ⛔ on `skipped`
--     / `no_target`. ⭐ `recipient_number_hash` is NOT NULL and written AT THE CLAIM (the ladder's own hash — the number whose
--     text failed), so the webhook worker's member-block isolation can match an in-flight or lapsed row (WS11 (2)).
--     ⭐ THE TRIGGER: identity ⛔ ever changes; once ⛔ `attempting` the send columns are frozen (0171's shape) EXCEPT the three
--     DELIVERY-STATUS columns the webhook worker writes — `delivered_at`, `failed_at`, `failure_code` — each set at most once
--     (NULL → value), only on an `accepted` row with a wamid (T28); while `attempting`: `attempt_count` ⛔ decreases,
--     `first_detail` is written once, `aging_since` moves only forward, the marker moves only NULL → set or set → NULL (0171's
--     re-stamp predicate VERBATIM).
-- (3) `claim_contact_wa_stops` — TENANT-scoped, APPEND-ONLY. A STOP keyword received on a Pariwar's WhatsApp number (WS10):
--     the number's KEYED hash in the LADDER's space (`claim_contact_mobile` — ⛔ the member login index; T21), bound to the
--     Pariwar ⇒ a stop ends claim WhatsApp to that number for every claim of THAT Pariwar. ⛔ An un-stop path in v1.
--
-- ⛔ PII in either new table: ids, a KEYED number hash, the wamid, the template NAME (a config value), a fixed-vocabulary
-- `detail` — ⛔ a name, ⛔ a number.
-- GRANTS — SELECT, INSERT + a column-limited UPDATE on the send columns (⛔ identity, ⛔ `created_at`, ⛔ DELETE); the stops
-- SELECT, INSERT only. Per-command policies that MATCH the grants. ⚠ A grant binds `twt_app` ONLY — ONE jobs pool runs every
-- worker (the dev superuser or a prod BYPASSRLS login; roster Row 26 `jobs-db-role`), so for jobs the TRIGGERS are the control.
-- ⚠ Checked BEFORE this file (Story 6.37d Task 3, 2026-10-20): two NEW tables (⛔ existing row can fail a CHECK); the ladder
-- CHECK is WIDENED (every existing value still passes); ⛔ object of these names on :5433 (`to_regclass` ⇒ NULL).
-- Statement order per table: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger (0119).

-- ── (1) The ladder's WhatsApp step ──────────────────────────────────────────────────────────────────────────────────────

-- WS8 (i) — `pending`, `sent` (the step's send row was claimed) or a recorded skip. ⚠ LOCKSTEP with the Drizzle `check()` copy
-- in schema/claim_contact_ladders.ts. (0169's comment *"row 6-37d may add values"* is answered here.)
ALTER TABLE "claim_contact_ladders" DROP CONSTRAINT IF EXISTS "claim_contact_ladders_whatsapp_step_check";--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_whatsapp_step_check" CHECK ("whatsapp_step" ~ '^(pending|sent|skipped:[a-z_]{1,48})$');--> statement-breakpoint
GRANT UPDATE ("whatsapp_step") ON "claim_contact_ladders" TO twt_app;--> statement-breakpoint
-- The quarter-hourly due-step selection reads only RUNNING ladders whose step is still `pending`.
CREATE INDEX "claim_contact_ladders_wa_pending_idx" ON "claim_contact_ladders" USING btree ("created_at") WHERE "whatsapp_step" = 'pending' AND "state" = 'running';--> statement-breakpoint

CREATE FUNCTION claim_contact_ladders_guard_whatsapp_step()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.whatsapp_step IS DISTINCT FROM OLD.whatsapp_step AND OLD.whatsapp_step <> 'pending' THEN
    RAISE EXCEPTION
      'claim_contact_ladders: the WhatsApp step (%) is decided once — pending → sent | skipped:<reason> (Story 6.37d WS8 (i))', OLD.whatsapp_step
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_contact_ladders_guard_whatsapp_step
  BEFORE UPDATE OF whatsapp_step ON claim_contact_ladders
  FOR EACH ROW EXECUTE FUNCTION claim_contact_ladders_guard_whatsapp_step();--> statement-breakpoint

-- ── (2) The send record ─────────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE "claim_contact_wa_sends" (
	"send_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ladder_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"chase" text NOT NULL,
	"recipient_number_hash" text NOT NULL,
	"template_name" text NOT NULL,
	"locale" text NOT NULL,
	"send_outcome" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"claimed_at" timestamp with time zone NOT NULL,
	"claimed_by_job" text NOT NULL,
	"aging_since" timestamp with time zone NOT NULL,
	"send_started_at" timestamp with time zone,
	"detail" text,
	"first_detail" text,
	"provider_message_id" text,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "claim_contact_wa_sends_ladder_uq" UNIQUE ("ladder_id"),
	CONSTRAINT "claim_contact_wa_sends_wamid_uq" UNIQUE ("provider_message_id")
);--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_ladder_id_fk" FOREIGN KEY ("ladder_id") REFERENCES "public"."claim_contact_ladders"("ladder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CONTACT_LADDER_WA_SEND_OUTCOMES` (schema/claim_contact_wa_sends.ts — a spec reads the CHECK).
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_send_outcome_check" CHECK ("send_outcome" IN ('attempting', 'accepted', 'rejected_recipient', 'may_have_sent', 'refused', 'skipped', 'no_target'));--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_chase_check" CHECK ("chase" IN ('correction', 'certificate'));--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_number_hash_check" CHECK (length(btrim("recipient_number_hash")) > 0);--> statement-breakpoint
-- ⚠ PG caps a regex bound at 255 (`{1,512}` is an invalid regex at RUN time) — 0171's `+` + `char_length` form.
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_template_name_check" CHECK ("template_name" ~ '^[a-z0-9_]+$' AND char_length("template_name") <= 512);--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_locale_check" CHECK ("locale" IN ('en', 'hi'));--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
-- ⭐ THE IN-FLIGHT MARKER — 6.37d's mapping (WS8 (ii)): on a finished row it is set EXACTLY when a WhatsApp call was made.
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_send_started_outcome_check" CHECK ("send_outcome" = 'attempting' OR ("send_outcome" IN ('accepted', 'rejected_recipient', 'may_have_sent', 'refused')) = ("send_started_at" IS NOT NULL));--> statement-breakpoint
-- An ACCEPTED send carries the wamid (the trail — statuses join by it).
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_accepted_check" CHECK ("send_outcome" <> 'accepted' OR "provider_message_id" IS NOT NULL);--> statement-breakpoint
-- A finished row says why (`detail` — REQUIRED: `COALESCE`, since a NULL `LIKE` would pass a CHECK), in the outcome's own
-- prefix; an `accepted` row's `detail` is free (NULL); an attempting row's note is ⛔ required.
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_outcome_detail_check" CHECK (
  CASE "send_outcome"
    WHEN 'may_have_sent' THEN COALESCE("detail", '') LIKE 'may\_have\_sent:%'
    WHEN 'rejected_recipient' THEN COALESCE("detail", '') LIKE 'rejected\_recipient:%'
    WHEN 'refused' THEN COALESCE("detail", '') LIKE 'refused:%'
    WHEN 'skipped' THEN COALESCE("detail", '') LIKE 'skipped:%'
    WHEN 'no_target' THEN COALESCE("detail", '') LIKE 'no\_target:%'
    ELSE true
  END
);--> statement-breakpoint
-- ⭐ WS11 — the delivery-status columns belong to an ACCEPTED send with a wamid; a failure code only with a failure.
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_status_check" CHECK (("delivered_at" IS NULL AND "failed_at" IS NULL) OR ("send_outcome" = 'accepted' AND "provider_message_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_failure_code_check" CHECK ("failure_code" IS NULL OR ("failed_at" IS NOT NULL AND "failure_code" ~ '^[0-9]{1,6}$'));--> statement-breakpoint
-- ⭐ THE `detail` GRAMMAR — ⚠ LOCKSTEP with `CONTACT_LADDER_WA_DETAIL_PATTERN` (schema/claim_contact_wa_sends.ts — a spec pins the
-- two equal). A fixed prefix, then `[a-z0-9_]{1,48}`; ⛔ a space, ⛔ `+`, ⛔ a run of 7+ digits (a bare phone number).
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(rate_limited|api_unavailable|decrypt_failed|hash_failed|marker_lost|may_have_sent|rejected_recipient|refused|skipped|no_target):[a-z0-9_]{1,48}$');--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(?!.*[0-9]{7})(rate_limited|api_unavailable|decrypt_failed|hash_failed|marker_lost|may_have_sent|rejected_recipient|refused|skipped|no_target):[a-z0-9_]{1,48}$');--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_contact_wa_sends" TO twt_app;--> statement-breakpoint
-- The SEND columns only — ⛔ `send_id`, `ladder_id`, `pariwar_id`, `claim_case_id`, `chase`, `recipient_number_hash`, `created_at`.
-- ⚠ LOCKSTEP with the trigger's `send_cols` / `status_cols` below.
GRANT UPDATE ("template_name", "locale", "send_outcome", "attempt_count", "claimed_at", "claimed_by_job", "aging_since", "send_started_at", "detail", "first_detail", "provider_message_id", "delivered_at", "failed_at", "failure_code", "updated_at") ON "claim_contact_wa_sends" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_contact_wa_sends_tenant_isolation_select" ON "claim_contact_wa_sends" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_wa_sends_tenant_isolation_insert" ON "claim_contact_wa_sends" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_wa_sends_tenant_isolation_update" ON "claim_contact_wa_sends" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_contact_wa_sends_claim_idx" ON "claim_contact_wa_sends" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
-- The sweep's lapsed scans read only the un-finished rows.
CREATE INDEX "claim_contact_wa_sends_attempting_idx" ON "claim_contact_wa_sends" USING btree ("claimed_at") WHERE "send_outcome" = 'attempting';--> statement-breakpoint
-- WS11 (2) — the member-block isolation looks a recipient up by its claim-space hash within the Pariwar.
CREATE INDEX "claim_contact_wa_sends_recipient_idx" ON "claim_contact_wa_sends" USING btree ("pariwar_id", "recipient_number_hash", "created_at");--> statement-breakpoint

CREATE FUNCTION claim_contact_wa_sends_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  identity_cols text[] := ARRAY['send_id', 'ladder_id', 'pariwar_id', 'claim_case_id', 'chase', 'recipient_number_hash', 'created_at'];
  send_cols text[] := ARRAY['template_name', 'locale', 'send_outcome', 'attempt_count', 'claimed_at', 'claimed_by_job', 'aging_since',
    'send_started_at', 'detail', 'first_detail', 'provider_message_id'];
  status_cols text[] := ARRAY['delivered_at', 'failed_at', 'failure_code'];
  col text;
  old_v jsonb;
  new_v jsonb;
BEGIN
  old_v := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(identity_cols) AS k);
  new_v := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(identity_cols) AS k);
  IF new_v IS DISTINCT FROM old_v THEN
    RAISE EXCEPTION 'claim_contact_wa_sends: a send row''s identity is never rewritten (Story 6.37d WS8 (ii))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  old_v := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(send_cols) AS k);
  new_v := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(send_cols) AS k);
  IF OLD.send_outcome <> 'attempting' AND new_v IS DISTINCT FROM old_v THEN
    RAISE EXCEPTION
      'claim_contact_wa_sends: a finished send (%) is never rewritten — one WhatsApp per ladder, ever (Story 6.37d I4)', OLD.send_outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- T28 — the delivery-status columns: each set at most once (NULL → value), only on an ACCEPTED row with a wamid.
  FOREACH col IN ARRAY status_cols LOOP
    IF (to_jsonb(NEW) -> col) IS DISTINCT FROM (to_jsonb(OLD) -> col) THEN
      IF (to_jsonb(OLD) -> col) <> 'null'::jsonb THEN
        RAISE EXCEPTION 'claim_contact_wa_sends: % is set once (Story 6.37d WS11)', col
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
      IF NEW.send_outcome <> 'accepted' OR NEW.provider_message_id IS NULL OR OLD.send_outcome <> 'accepted' THEN
        RAISE EXCEPTION 'claim_contact_wa_sends: % belongs to an accepted send with a wamid (Story 6.37d WS11)', col
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
    END IF;
  END LOOP;
  IF OLD.send_outcome = 'attempting' THEN
    IF NEW.attempt_count < OLD.attempt_count THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: attempt_count never decreases (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.first_detail IS NOT NULL AND NEW.first_detail IS DISTINCT FROM OLD.first_detail THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: first_detail is written once (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW.aging_since IS NULL OR NEW.aging_since < OLD.aging_since THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: aging_since moves only forward (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.send_started_at IS NOT NULL AND NEW.send_started_at IS NOT NULL AND NEW.send_started_at IS DISTINCT FROM OLD.send_started_at THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: the in-flight marker is set once per send — cleared only by a release, a transient or a finish (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_contact_wa_sends_guard
  BEFORE UPDATE ON claim_contact_wa_sends
  FOR EACH ROW EXECUTE FUNCTION claim_contact_wa_sends_guard();--> statement-breakpoint

-- ── (3) The stops ───────────────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE "claim_contact_wa_stops" (
	"stop_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"recipient_number_hash" text NOT NULL,
	"inbound_event_id" uuid NOT NULL,
	"stopped_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	-- A replayed inbound event records ⛔ a second stop.
	CONSTRAINT "claim_contact_wa_stops_event_uq" UNIQUE ("pariwar_id", "inbound_event_id")
);--> statement-breakpoint
ALTER TABLE "claim_contact_wa_stops" ADD CONSTRAINT "claim_contact_wa_stops_number_hash_check" CHECK (length(btrim("recipient_number_hash")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_contact_wa_stops" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_contact_wa_stops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_contact_wa_stops" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_contact_wa_stops_tenant_isolation_select" ON "claim_contact_wa_stops" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_wa_stops_tenant_isolation_insert" ON "claim_contact_wa_stops" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_contact_wa_stops_number_idx" ON "claim_contact_wa_stops" USING btree ("pariwar_id", "recipient_number_hash");
