-- Migration 0184 — the ALERT SMS send record (Story 5.11b, Task 1; `2026-10-25-404` FS6 (a), FS8 (d), FS22; AC1). Hand-authored —
-- ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot). NUMBER: 0182 / 0183 belong to 11b.4 (`-366` decision 6); the
-- `when` sits above every sibling journal entry (a later `when` applied first makes drizzle skip the other —
-- [[project_sibling_migration_when_order_shared_db]]).
-- ⚠ 2026-10-25 REVIEW NOTE: 0182 / 0183 LANDED on origin/main (11b.4, `when` 1795232400026 / 1795318800027 — both BELOW this file's
-- 1795405200028); this branch was REBASED onto `69d7d27a` that day and the journal reads idx 182, 183, 184 with `when` strictly
-- increasing. A database that applied 0184 BEFORE 0182 / 0183 would skip them — recreate any such database.
--
-- ⭐ WHAT IT IS. ONE row per (alert, member, OCCASION) — the three contribution texts `-390` Q1 B owes a member the app (and
-- WhatsApp, where used) could not reach. The OCCASION is the keyed store's own scope (`day_10`, `pending_match_escalated`,
-- `mismatch:<reason>`): the alert id is per CYCLE, so a key without it would collide day 10 with the escalated text and every
-- mismatch reason (F4). The CHECK admits EXACTLY the six literals — it is FS8 (d)'s flood guard: at most six texts per member
-- per real cycle BY CONSTRUCTION (⛔ counter, ⛔ bucket); the producer builds the scope from a raw payload string, so this CHECK
-- is the boundary.
-- ⭐ AT MOST ONCE (I1). The UNIQUE key + `INSERT … ON CONFLICT DO NOTHING` in ONE scope transaction committed BEFORE the gateway
-- call; a found `accepted` row is `sent` with ⛔ send. Only `deferred` (a `rate_limited` answer — the gateway DEFINITELY did not
-- take it) is ever re-claimed (`deferred → attempting`, compare-and-set). Every `api_unavailable:*` / `unknown:*` (the gateway
-- MAY have taken it) and a crash-left `attempting` row past the lease are FINAL `error` / `exhausted:outcome_unknown…` (G14).
-- `send_id` is the CRQID's row id (kind `as`, DR3 extended); `provider_message_id` is REQUIRED on `accepted` (the correlator
-- matches a report by it — DR6 row 7 otherwise).
-- ⭐ THE CRQID KIND `as` (FS22) — 0167's two kind CHECKs are REPLACED (⛔ 0167 edited): the inbox's grammar and the delivery
-- record's kinds now admit `as`. ⚠ LOCKSTEP with `SMS_CORRELATION_KINDS` / `SMS_CORRELATION_ID_PATTERN` (correlation.ts) and
-- `SMS_SEND_KINDS` (schema/sms_send_deliveries.ts).
-- ⭐ A FINISHED ROW IS FROZEN (0155's shape): the trigger refuses ANY update of a row whose outcome is neither `attempting` nor
-- `deferred` — it binds every role, the owner included, at DEFAULT session settings (a superuser can DISABLE the trigger or set
-- `session_replication_role = replica` — the concurrency spec's cleanup does). The transitions it admits: `attempting → deferred → attempting → final`,
-- `attempting → final`, `deferred → error` (the final attempt), the stale-lease `attempting → error`. The correlator only READS.
-- PII: ⛔ number, ⛔ name, ⛔ hash (a keyed hash would cost one KMS HMAC per text and has ⛔ consumer — FS6). RTBF: ids only.
-- `twt_app`: SELECT, INSERT and UPDATE, column-narrowed; ⛔ DELETE — the record is ⛔ pruned.
-- ⚠ The grants bind `twt_app` only — jobs' production login is roster Row 26; the CHECKs bind EVERY role. The IDENTITY columns of an
-- in-flight row (pariwar_id, alert_id, member_id, occasion, send_id, created_at) are protected by the `twt_app` COLUMN GRANTS only —
-- the trigger does not guard them (review 2026-10-25, deferred: C1-W3).

CREATE TABLE "alert_sms_sends" (
	"send_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"alert_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"occasion" text NOT NULL,
	"message" text NOT NULL,
	"locale" text NOT NULL,
	"outcome" text NOT NULL,
	"detail" text,
	"provider_message_id" text,
	"claim_token" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
-- FS6 — the projector writes the `alerts` row before any fan-out (Task 0.1, 2026-10-25: proven for the three producers).
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_alert_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("alert_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `ALERT_SMS_SEND_OCCASIONS` / `ALERT_SMS_SEND_OUTCOMES` / `ALERT_SMS_SEND_DETAIL_PATTERN` (schema/alert_sms_sends.ts)
-- and the contract's `AlertSmsMessage` (the three messages).
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_occasion_check" CHECK ("occasion" IN ('day_10', 'pending_match_escalated', 'mismatch:wrong_pool', 'mismatch:amount_mismatch', 'mismatch:entry_already_claimed', 'mismatch:sender_vpa_mismatch'));--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_message_check" CHECK ("message" IN ('deadline_not_recorded', 'payment_not_matched', 'payment_not_confirmed'));--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_locale_check" CHECK ("locale" IN ('hi', 'en'));--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_outcome_check" CHECK ("outcome" IN ('attempting', 'deferred', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'refused', 'error'));--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_claim_token_check" CHECK (char_length("claim_token") BETWEEN 1 AND 200);--> statement-breakpoint
-- The correlator matches a report by the accepted request id (DR6 row 7 otherwise).
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_accepted_provider_id_check" CHECK ("outcome" <> 'accepted' OR "provider_message_id" IS NOT NULL);--> statement-breakpoint
-- The length CHECK is named BEFORE the grammar one (PG evaluates CHECKs in name order).
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_detail_length_check" CHECK ("detail" IS NULL OR char_length("detail") <= 200);--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ADD CONSTRAINT "alert_sms_sends_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(exhausted:outcome_unknown(:(api_unavailable|unknown):[A-Za-z0-9_.-]{1,64})?|(exhausted:)?rate_limited:[A-Za-z0-9_.-]{1,64}|exhausted:config_unavailable:secret_manager|config:sms_messaging_unavailable|(invalid_number|carrier_reject|auth|dlt_template_not_approved):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint
-- ⭐ THE once-only key (I1) — ⛔ `pool_id`: one text per occasion per cycle, whatever pool (FS8 (d)).
CREATE UNIQUE INDEX "alert_sms_sends_alert_member_occasion_uq" ON "alert_sms_sends" USING btree ("alert_id", "member_id", "occasion");--> statement-breakpoint
-- DR12 — the silence count reads accepted rows by their finalise time.
CREATE INDEX "alert_sms_sends_accepted_idx" ON "alert_sms_sends" USING btree ("updated_at") WHERE "outcome" = 'accepted';--> statement-breakpoint
CREATE INDEX "alert_sms_sends_pariwar_idx" ON "alert_sms_sends" USING btree ("pariwar_id");--> statement-breakpoint
-- INSERT — EXACTLY what `beginAlertSmsSend` writes (⛔ `send_id`, `attempt_count`, `created_at`, `updated_at` — their DEFAULTs).
GRANT SELECT ON "alert_sms_sends" TO twt_app;--> statement-breakpoint
GRANT INSERT ("pariwar_id", "alert_id", "member_id", "occasion", "message", "locale", "outcome", "claim_token") ON "alert_sms_sends" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed: the send's IDENTITY (`pariwar_id`, `alert_id`, `member_id`, `occasion`) and `created_at` are ⛔ ever rewritten.
-- `message` and `locale` are re-set by the `deferred → attempting` re-claim (review 2026-10-25, C1-P1): they record the language THIS
-- attempt sends — the member may have changed it since the `rate_limited` attempt. The re-claim is the only CODE that writes them; the
-- column grant itself does ⛔ restrict them to it (any `twt_app` UPDATE on the row may), so the guarantee lives in the domain function.
GRANT UPDATE ("outcome", "detail", "provider_message_id", "claim_token", "attempt_count", "message", "locale", "updated_at") ON "alert_sms_sends" TO twt_app;--> statement-breakpoint
ALTER TABLE "alert_sms_sends" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alert_sms_sends" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "alert_sms_sends_tenant_isolation_select" ON "alert_sms_sends" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alert_sms_sends_tenant_isolation_insert" ON "alert_sms_sends" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alert_sms_sends_tenant_isolation_update" ON "alert_sms_sends" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE FUNCTION alert_sms_sends_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.outcome NOT IN ('attempting', 'deferred') THEN
    RAISE EXCEPTION
      'alert_sms_sends: a finished row (%) is never updated — at most one text per (alert, member, occasion) (Story 5.11b, -404 FS6)', OLD.outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- A deferred row is re-claimed (→ `attempting`) or given up (→ `error`) — ⛔ accepted / rejected without a send in between.
  IF OLD.outcome = 'deferred' AND NEW.outcome NOT IN ('deferred', 'attempting', 'error') THEN
    RAISE EXCEPTION
      'alert_sms_sends: a deferred row moves only to attempting or error (Story 5.11b, -404 FS6)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER alert_sms_sends_guard_update
  BEFORE UPDATE ON alert_sms_sends
  FOR EACH ROW EXECUTE FUNCTION alert_sms_sends_guard_update();--> statement-breakpoint
-- FS22 — the CRQID kind `as` (DR3 extended). The inbox's grammar is DR3's ONE SQL copy; the delivery record names `as` sends.
ALTER TABLE "sms_delivery_report_inbox" DROP CONSTRAINT "sms_delivery_report_inbox_crqid_check";--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_crqid_check" CHECK ("crqid" IS NULL OR "crqid" ~ '^(cr|ce|sn|pm|as|ot)[0-9a-f]{32}$');--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" DROP CONSTRAINT "sms_send_deliveries_send_kind_check";--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_send_kind_check" CHECK ("send_kind" IN ('cr', 'ce', 'sn', 'pm', 'as'));
