-- Migration 0206 — THE MOVE-NOTICE EMAIL: one send row per Story 13.1d notice (Story 13.1g, Task 1.1; decision `2026-11-12-463` AD2;
-- ADR-0045; the Panel's `-443` Q1 A: "Both District Admins are told by email and in the admin console"). Hand-authored — ⛔ never
-- regenerate. Idempotent: `psql -f` twice succeeds (`CREATE TABLE IF NOT EXISTS` with every constraint inline, each `ADD CONSTRAINT` on an
-- existing table in a `duplicate_object` guard, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER / POLICY IF EXISTS`, `CREATE INDEX IF NOT EXISTS`).
--
-- ⭐ `field_worker_notice_emails` — 0187's `memorial_takedown_approver_emails` (itself 0152 + 0153 + 0154's shape: states, CHECKs, the
-- finished-row trigger, the column grants), keyed on the NOTICE: `notice_id` is the PRIMARY KEY with ⛔ no default — it IS the notice's id —
-- so a notice is emailed at most ONCE, EVER (I2). ⛔ `recipient_user_id`: the recipient is the notice row's (one source of truth, I6); a
-- composite FK `(pariwar_id, notice_id)` points at it, backed by a NEW `UNIQUE (pariwar_id, notice_id)` on the notices (the 0157 / 0160
-- form). `skipped` (Q4 false at a FIRST claim — nothing was tried) replaces 0187's `no_target`; a RE-claim whose re-check fails is `error` /
-- `exhausted:recheck_not_eligible` (a prior attempt may have sent).
-- ⚠ The INSERT grant NAMES `notice_id` (0187's does not: its `notice_id` has a default) — copied as 0187's, every `twt_app` claim would be
-- refused 42501 and the superuser live tests would not see it (the policy spec pins it by `has_column_privilege`).
-- ⚠ GRANTS: `twt_app` ONLY, as 0152 / 0187 / 0205 (AD13): the production jobs login is granted ⛔ here — its posture is roster Row 26's and
-- the sweep's identity reads (Q2 / Q4) are Row 24 (b)'s. ⛔ DELETE grant, ⛔ DELETE policy, ⛔ `FOR ALL`.
-- PII: ⛔ (ids, an outcome, a fixed-vocabulary `detail`, a provider message id). ⛔ Pruned.
--
-- On `field_worker_notices` ONLY a UNIQUE (the FK's target) and an index on `created_at` (the sweep's due floor, AD3 (b)) — its guard
-- trigger, grants and policies are ⛔ touched; the sweep never writes it (I3).
-- Statement order: ALTER (the notices) → CREATE → GRANT → ENABLE → FORCE → POLICY → trigger → indexes.

-- ── (1) the notices: the FK's target and the due floor ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_pariwar_notice_uq" UNIQUE ("pariwar_id", "notice_id");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_worker_notices_email_due_idx" ON "field_worker_notices" USING btree ("created_at");--> statement-breakpoint

-- ── (2) the send table — 0187's shape, keyed on the notice ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "field_worker_notice_emails" (
	"notice_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"provider_message_id" text,
	"detail" text,
	"first_detail" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"may_have_sent" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_job" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"aging_since" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"parked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "field_worker_notice_emails_notice_fk" FOREIGN KEY ("pariwar_id", "notice_id") REFERENCES "public"."field_worker_notices"("pariwar_id", "notice_id") ON DELETE no action ON UPDATE no action,
	-- ⚠ LOCKSTEP with `FIELD_WORKER_NOTICE_EMAIL_OUTCOMES` (schema) — a spec pins the two equal.
	CONSTRAINT "field_worker_notice_emails_outcome_check" CHECK ("outcome" IN ('attempting', 'accepted', 'rejected', 'skipped', 'error')),
	-- A `skipped` row carries a `skipped:` detail, and only it does.
	CONSTRAINT "field_worker_notice_emails_skipped_detail_check" CHECK (("outcome" = 'skipped') = ("detail" IS NOT NULL AND "detail" LIKE 'skipped:%')),
	CONSTRAINT "field_worker_notice_emails_attempt_count_check" CHECK ("attempt_count" >= 1),
	CONSTRAINT "field_worker_notice_emails_attempting_claimed_check" CHECK ("outcome" <> 'attempting' OR ("claimed_at" IS NOT NULL AND "claimed_by_job" IS NOT NULL)),
	CONSTRAINT "field_worker_notice_emails_detail_length_check" CHECK ("detail" IS NULL OR char_length("detail") <= 200),
	CONSTRAINT "field_worker_notice_emails_first_detail_length_check" CHECK ("first_detail" IS NULL OR char_length("first_detail") <= 200),
	-- ⚠ LOCKSTEP with `FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN` (schema) — a spec pins the two equal.
	CONSTRAINT "field_worker_notice_emails_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(skipped:not_eligible|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_not_eligible))$'),
	CONSTRAINT "field_worker_notice_emails_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(skipped:not_eligible|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_not_eligible))$'),
	CONSTRAINT "field_worker_notice_emails_parked_check" CHECK ("outcome" <> 'attempting' OR (("claimed_by_job" = 'sweep:held') = ("parked_at" IS NOT NULL)))
);--> statement-breakpoint

-- ── grants — `twt_app` ONLY (AD13); the INSERT list names `notice_id` (AD2) ───────────────────────────────────────────────
GRANT SELECT ON "field_worker_notice_emails" TO twt_app;--> statement-breakpoint
GRANT INSERT ("notice_id", "pariwar_id", "outcome", "detail", "claimed_at", "claimed_by_job") ON "field_worker_notice_emails" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("outcome", "provider_message_id", "detail", "first_detail", "attempt_count", "may_have_sent", "claimed_at", "claimed_by_job", "aging_since", "parked_at", "updated_at") ON "field_worker_notice_emails" TO twt_app;--> statement-breakpoint

ALTER TABLE "field_worker_notice_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field_worker_notice_emails" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "field_worker_notice_emails_tenant_isolation_select" ON "field_worker_notice_emails";--> statement-breakpoint
CREATE POLICY "field_worker_notice_emails_tenant_isolation_select" ON "field_worker_notice_emails" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "field_worker_notice_emails_tenant_isolation_insert" ON "field_worker_notice_emails";--> statement-breakpoint
CREATE POLICY "field_worker_notice_emails_tenant_isolation_insert" ON "field_worker_notice_emails" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "field_worker_notice_emails_tenant_isolation_update" ON "field_worker_notice_emails";--> statement-breakpoint
CREATE POLICY "field_worker_notice_emails_tenant_isolation_update" ON "field_worker_notice_emails" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- The finished-row guard — 0187's (0153 / 0154's), verbatim but for the table name.
CREATE OR REPLACE FUNCTION field_worker_notice_emails_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.outcome <> 'attempting' THEN
    RAISE EXCEPTION
      'field_worker_notice_emails: a finished row (%) is never updated — once per notice, ever (Story 13.1g AD2)', OLD.outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.may_have_sent AND NOT NEW.may_have_sent THEN
    RAISE EXCEPTION
      'field_worker_notice_emails: may_have_sent is set TRUE, never back (Story 13.1g AD2)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.aging_since IS DISTINCT FROM OLD.aging_since
     AND (OLD.claimed_by_job IS DISTINCT FROM 'sweep:held' OR NEW.aging_since < OLD.aging_since) THEN
    RAISE EXCEPTION
      'field_worker_notice_emails: aging_since moves only forward, and only on the re-claim of a parked row (Story 13.1g AD2)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS field_worker_notice_emails_guard_update ON field_worker_notice_emails;--> statement-breakpoint
CREATE TRIGGER field_worker_notice_emails_guard_update
  BEFORE UPDATE ON field_worker_notice_emails
  FOR EACH ROW EXECUTE FUNCTION field_worker_notice_emails_guard_update();--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "field_worker_notice_emails_attempting_idx" ON "field_worker_notice_emails" USING btree ("aging_since", "claimed_at") WHERE "outcome" = 'attempting';
