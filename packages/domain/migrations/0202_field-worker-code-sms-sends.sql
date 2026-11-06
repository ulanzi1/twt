-- Migration 0202 — the field-worker CODE SMS send record (Story 13.1b, Task 1; decision `2026-11-06-450`, AD1, AD3, AD8, AD11; AC1,
-- AC4 (g), AC9). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal
-- `when`, which sits above every sibling's — [[project_sibling_migration_when_order_shared_db]]). A NEW table: ⛔ existing row can fail
-- a CHECK, ⛔ edit of an applied migration ([[project_live_db_test_gotchas]]).
--
-- ⭐ WHAT IT IS. An OUTBOX: ONE row per worker id, written by `activateFieldWorker` in the approval's OWN transaction (AD1) — an
-- approval that rolls back leaves ⛔ row, one that commits cannot lose it. `pending_kyc → active` happens once in a worker's life, so
-- the UNIQUE key cannot fire; if it ever does the approval fails loudly, which is right for a broken invariant (⛔ `ON CONFLICT`).
-- ⭐ AT MOST ONCE (AD3, I2). A jobs sweep moves `due → attempting` and COMMITS before the gateway is called. Anything that MAY have
-- reached the gateway is final (`error` / `exhausted:outcome_unknown…`); only what DEFINITELY did not goes back to `due`.
-- ⭐ TWO CLOCKS (AD3). The lease and the release backoff are judged on `updated_at`, the max age on `created_at`, which ⛔ a release
-- moves — both `clock_timestamp()`, so two rows in one transaction do not tie ([[project_db_clock_ordering_tests_tie]]).
-- ⭐ THE DETAIL GRAMMAR IS NOT THE ALERT ONE: it bars SIX digits (the alert grammar bars seven), so neither a code nor a mobile can
-- rest in `detail` (TR9). ⚠ LOCKSTEP with `FIELD_WORKER_CODE_SMS_DETAIL_PATTERN` (schema/field_worker_code_sms_sends.ts).
-- ⭐ A FINISHED ROW IS FROZEN (0155's shape), and the trigger also refuses a change to an IDENTITY column on EVERY update, closing the
-- gap 0184 left (its C1-W3). It binds every role at DEFAULT settings (a superuser can DISABLE it or set
-- `session_replication_role = replica`).
-- ⭐ THE CRQID KIND `fw` (AD11) — 0184's two kind CHECKs are REPLACED (⛔ 0167 / 0184 edited). ⚠ LOCKSTEP with
-- `SMS_CORRELATION_KINDS` / `SMS_CORRELATION_ID_PATTERN` (correlation.ts) and `SMS_SEND_KINDS` (schema/sms_send_deliveries.ts).
-- `twt_app`: SELECT and a column-narrowed INSERT; ⛔ UPDATE, ⛔ DELETE (the API only ever writes `due`; only the sweep's login moves a
-- row — roster Row 49 (f), Row 26). FORCE RLS, TWO per-command policies: with ⛔ UPDATE grant, 0184's third would govern nothing (0199).
-- PII: ⛔ name, ⛔ mobile, ⛔ code, ⛔ hash — ids only. ⛔ Pruned: ⛔ job is built, and `-441` left "the full log" open.
-- Statement order: CREATE → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger (0178 / 0192).

CREATE TABLE "field_worker_code_sms_sends" (
	"send_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"field_worker_id" uuid NOT NULL,
	"activated_audit_id" uuid NOT NULL,
	"outcome" text DEFAULT 'due' NOT NULL,
	"detail" text,
	"provider_message_id" text,
	"claim_token" text,
	"locale" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "field_worker_code_sms_sends_pariwar_worker_uq" UNIQUE("pariwar_id","field_worker_id")
);--> statement-breakpoint
-- A composite FK: a single-column FK check bypasses RLS (the 0178 precedent), and a worker row is ⛔ ever deleted (erasure anonymizes).
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_worker_fk" FOREIGN KEY ("pariwar_id", "field_worker_id") REFERENCES "public"."field_workers"("pariwar_id", "field_worker_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_CODE_SMS_OUTCOMES`.
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_outcome_check" CHECK ("outcome" IN ('due', 'attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'skipped_not_active', 'error'));--> statement-breakpoint
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_locale_check" CHECK ("locale" IN ('hi', 'en'));--> statement-breakpoint
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_attempt_count_check" CHECK ("attempt_count" >= 0);--> statement-breakpoint
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_claim_token_check" CHECK ("claim_token" IS NULL OR char_length("claim_token") BETWEEN 1 AND 200);--> statement-breakpoint
-- A row in flight names the claim that holds it: settle and release are compare-and-set on the token.
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_attempting_token_check" CHECK ("outcome" <> 'attempting' OR "claim_token" IS NOT NULL);--> statement-breakpoint
-- The correlator matches a report by the accepted request id (DR6 row 7 otherwise).
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_accepted_provider_id_check" CHECK ("outcome" <> 'accepted' OR "provider_message_id" IS NOT NULL);--> statement-breakpoint
-- The length CHECK is named BEFORE the grammar one (PG evaluates CHECKs in name order).
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_detail_length_check" CHECK ("detail" IS NULL OR char_length("detail") <= 200);--> statement-breakpoint
ALTER TABLE "field_worker_code_sms_sends" ADD CONSTRAINT "field_worker_code_sms_sends_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{6})(exhausted:(expired|attempts|outcome_unknown(:(api_unavailable|unknown):[A-Za-z0-9_.-]{1,64})?)|config:[A-Za-z0-9_.-]{1,64}|config_unavailable:secret_manager|no_code|identity_unreadable:(envelope|key_rejected|authentication)|api_unavailable:(kms|audit|db)|(rate_limited|invalid_number|carrier_reject|auth|dlt_template_not_approved|unknown):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint
GRANT SELECT ON "field_worker_code_sms_sends" TO twt_app;--> statement-breakpoint
-- INSERT — EXACTLY what `enqueueFieldWorkerCodeSms` writes (every other column is its DEFAULT, so `due` / `attempt_count = 0` are forced).
GRANT INSERT ("pariwar_id", "field_worker_id", "activated_audit_id") ON "field_worker_code_sms_sends" TO twt_app;--> statement-breakpoint
ALTER TABLE "field_worker_code_sms_sends" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field_worker_code_sms_sends" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "field_worker_code_sms_sends_tenant_isolation_select" ON "field_worker_code_sms_sends" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_code_sms_sends_tenant_isolation_insert" ON "field_worker_code_sms_sends" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The claim and the lapse. ⛔ An index for the silence window (0184 has `alert_sms_sends_accepted_idx`): deliberate, at one text per worker.
CREATE INDEX "field_worker_code_sms_sends_open_idx" ON "field_worker_code_sms_sends" USING btree ("updated_at", "send_id") WHERE "outcome" IN ('due', 'attempting');--> statement-breakpoint
CREATE FUNCTION field_worker_code_sms_sends_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.outcome NOT IN ('due', 'attempting') THEN
    RAISE EXCEPTION
      'field_worker_code_sms_sends: a finished row (%) is never updated — at most one text per worker id (Story 13.1b, I2)', OLD.outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.send_id IS DISTINCT FROM OLD.send_id
     OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.field_worker_id IS DISTINCT FROM OLD.field_worker_id
     OR NEW.activated_audit_id IS DISTINCT FROM OLD.activated_audit_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'field_worker_code_sms_sends: an identity column is never changed (Story 13.1b, AD8)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- `due → attempting` (a claim), `due → error` (the max age); ⛔ `due → due`, ⛔ a final without a send in between.
  IF OLD.outcome = 'due' AND NEW.outcome NOT IN ('attempting', 'error') THEN
    RAISE EXCEPTION
      'field_worker_code_sms_sends: a due row moves only to attempting or error (Story 13.1b, AD8)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- `attempting → due` (a release), `attempting → <final>` (a settle, or the lease); ⛔ a second claim over a held row.
  IF OLD.outcome = 'attempting' AND NEW.outcome = 'attempting' THEN
    RAISE EXCEPTION
      'field_worker_code_sms_sends: a held row is never re-claimed (Story 13.1b, AD8)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_worker_code_sms_sends_guard_update
  BEFORE UPDATE ON field_worker_code_sms_sends
  FOR EACH ROW EXECUTE FUNCTION field_worker_code_sms_sends_guard_update();--> statement-breakpoint
-- AD11 — the CRQID kind `fw` (DR3 extended, as 0184 did for `as`). The inbox's grammar is DR3's ONE SQL copy; ⚠ the kind ORDER matches
-- `SMS_CORRELATION_ID_PATTERN` byte for byte (the inbox policy spec compares them).
ALTER TABLE "sms_delivery_report_inbox" DROP CONSTRAINT "sms_delivery_report_inbox_crqid_check";--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_crqid_check" CHECK ("crqid" IS NULL OR "crqid" ~ '^(cr|ce|sn|pm|as|fw|ot)[0-9a-f]{32}$');--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" DROP CONSTRAINT "sms_send_deliveries_send_kind_check";--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_send_kind_check" CHECK ("send_kind" IN ('cr', 'ce', 'sn', 'pm', 'as', 'fw'));
