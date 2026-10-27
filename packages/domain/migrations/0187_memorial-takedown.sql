-- Migration 0187 — THE MEMORIAL TAKE-DOWN: the nominee's request as the helpline recorded it, its one outcome, the approver email
-- outbox, and the `helpline` withdrawal's link to its request (Story 11b.4a, Task 2.2; Decision 2026-10-27-412 — MP6 / MP7 /
-- MP8 / MP10 / MP11 / MP14, author-commit; the Panel's `-392` items 4–5, `-393` M1 / M4, `-395` item 3, `-411` items 1, 4, 5).
-- Hand-authored — ⛔ never regenerate. Idempotent: `psql -f` twice succeeds (the type in a `duplicate_object` guard,
-- `CREATE TABLE IF NOT EXISTS` with every constraint inline, `ADD COLUMN IF NOT EXISTS`, each `ADD CONSTRAINT` on an existing
-- table in a `duplicate_object` guard, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER / POLICY IF EXISTS`, `CREATE INDEX IF NOT EXISTS`).
--
-- Three new tables — ⛔ no family free text and ⛔ no Tier-1 column in any of them (ids, timestamps, enums, STAFF display snapshots, and
-- the outbox's fixed-vocabulary `detail`):
--   · memorial_takedown_requests — one row per request the operator recorded after calling the nominee back (MP7:
--     `verified_by = 'called_back'`). `first_contact_at` is operator-entered (the nominee's first call or message — MP14 (b)),
--     bounded to within the 7 days before `received_at` (DB clock); `due_at = first_contact_at + 7 days` (stored — the helpdesk
--     SLA precedent). `submission_id` is the version SHOWN when the request was recorded; `handover_nominee_ref` the nominee
--     recorded on it (a snapshot). "One open request per drive" is ⛔ not expressible as an index (openness lives in the outcomes
--     table) — the handler enforces it under the pool lock.
--   · memorial_takedown_outcomes — ONE per request (PK): `taken_down` · `kept` · `superseded` (MP8 (c)).
--   · memorial_takedown_approver_emails — the approver email outbox (MP10 / MP11): the SAME columns, states, grants, CHECKs and
--     finished-row trigger as `claim_suspicion_staff_emails` (0152 + 0153 + 0154), keyed on the request; its own `detail`
--     vocabulary. ONE row per (request, approver), EVER; ONE request-level `no_target` row (recipient NULL) when ⛔ no approver is
--     eligible.
-- And `memorial_withdrawals` gains `takedown_request_id`: a `helpline` withdrawal points at its request (⛔ no reason — Trap 7: the
-- reason enum is the REVIEWER's, and a fifth ground is against `-391` item 7; ⛔ no internal note).
--
-- ⚠ Every CHECK naming the `helpline` actor compares `withdrawn_by::text` — 0186 added the value in the SAME migrator transaction
-- (55P04). ⛔ No DELETE grant, ⛔ no DELETE policy, ⛔ never `FOR ALL`. Statement order: types → CREATE → ALTER → GRANT → ENABLE →
-- FORCE → POLICY → trigger → indexes.

DO $$ BEGIN
  CREATE TYPE "public"."memorial_takedown_outcome" AS ENUM('taken_down', 'kept', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

-- ── (1) the requests ─────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "memorial_takedown_requests" (
	"request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"pool_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"handover_nominee_ref" uuid NOT NULL,
	"verified_by" text NOT NULL,
	"first_contact_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_display" text NOT NULL,
	CONSTRAINT "memorial_takedown_requests_pariwar_request_uq" UNIQUE ("pariwar_id", "request_id"),
	CONSTRAINT "memorial_takedown_requests_submission_fk" FOREIGN KEY ("pariwar_id", "submission_id") REFERENCES "public"."memorial_submissions"("pariwar_id", "submission_id") ON DELETE no action ON UPDATE no action,
	-- The shown version is THIS pool's.
	CONSTRAINT "memorial_takedown_requests_pool_submission_fk" FOREIGN KEY ("pool_id", "submission_id") REFERENCES "public"."memorial_submissions"("pool_id", "submission_id") ON DELETE no action ON UPDATE no action,
	-- MP7 — the one verification method today; a later one is a new value (and a new decision).
	CONSTRAINT "memorial_takedown_requests_verified_by_check" CHECK (verified_by = 'called_back'),
	-- MP14 (b) — the nominee's first contact is before the recording, and at most 7 days before it.
	CONSTRAINT "memorial_takedown_requests_first_contact_check" CHECK (first_contact_at <= received_at AND first_contact_at >= received_at - interval '7 days'),
	CONSTRAINT "memorial_takedown_requests_due_check" CHECK (due_at = first_contact_at + interval '168 hours'),
	CONSTRAINT "memorial_takedown_requests_actor_display_check" CHECK (length(btrim(actor_display)) > 0)
);--> statement-breakpoint

-- ── (2) the outcomes ─────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "memorial_takedown_outcomes" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"outcome" "memorial_takedown_outcome" NOT NULL,
	"decided_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_display" text NOT NULL,
	CONSTRAINT "memorial_takedown_outcomes_request_fk" FOREIGN KEY ("pariwar_id", "request_id") REFERENCES "public"."memorial_takedown_requests"("pariwar_id", "request_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "memorial_takedown_outcomes_actor_display_check" CHECK (length(btrim(actor_display)) > 0)
);--> statement-breakpoint

-- ── (3) the approver email outbox — 6.25's shape (0152 + 0153 + 0154), keyed on the request ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "memorial_takedown_approver_emails" (
	"notice_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"recipient_user_id" uuid,
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
	CONSTRAINT "memorial_takedown_approver_emails_request_fk" FOREIGN KEY ("pariwar_id", "request_id") REFERENCES "public"."memorial_takedown_requests"("pariwar_id", "request_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "memorial_takedown_approver_emails_recipient_user_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "memorial_takedown_approver_emails_outcome_check" CHECK ("outcome" IN ('attempting', 'accepted', 'rejected', 'no_target', 'error')),
	CONSTRAINT "memorial_takedown_approver_emails_no_target_recipient_check" CHECK (("recipient_user_id" IS NULL) = ("outcome" = 'no_target')),
	CONSTRAINT "memorial_takedown_approver_emails_attempt_count_check" CHECK ("attempt_count" >= 1),
	CONSTRAINT "memorial_takedown_approver_emails_attempting_claimed_check" CHECK ("outcome" <> 'attempting' OR ("claimed_at" IS NOT NULL AND "claimed_by_job" IS NOT NULL)),
	CONSTRAINT "memorial_takedown_approver_emails_detail_length_check" CHECK ("detail" IS NULL OR char_length("detail") <= 200),
	CONSTRAINT "memorial_takedown_approver_emails_first_detail_length_check" CHECK ("first_detail" IS NULL OR char_length("first_detail") <= 200),
	-- ⚠ LOCKSTEP with `MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN` (schema) — a spec pins the two equal.
	CONSTRAINT "memorial_takedown_approver_emails_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(no_approver|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_(not_taken_down|recipient_not_eligible|recipients_exist|request_has_rows)))$'),
	CONSTRAINT "memorial_takedown_approver_emails_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(no_approver|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_(not_taken_down|recipient_not_eligible|recipients_exist|request_has_rows)))$'),
	CONSTRAINT "memorial_takedown_approver_emails_parked_check" CHECK ("outcome" <> 'attempting' OR (("claimed_by_job" = 'sweep:held') = ("parked_at" IS NOT NULL))),
	CONSTRAINT "memorial_takedown_approver_emails_request_recipient_uq" UNIQUE NULLS NOT DISTINCT ("pariwar_id", "request_id", "recipient_user_id")
);--> statement-breakpoint

-- ── (4) the `helpline` withdrawal points at its request ─────────────────────────────────────────────────────────────────────
ALTER TABLE "memorial_withdrawals" ADD COLUMN IF NOT EXISTS "takedown_request_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "memorial_withdrawals" ADD CONSTRAINT "memorial_withdrawals_takedown_request_fk" FOREIGN KEY ("pariwar_id", "takedown_request_id") REFERENCES "public"."memorial_takedown_requests"("pariwar_id", "request_id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "memorial_withdrawals" ADD CONSTRAINT "memorial_withdrawals_takedown_request_iff_helpline" CHECK ((withdrawn_by::text = 'helpline') = (takedown_request_id IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
-- Trap 7 — a `helpline` row carries ⛔ no internal note (the operator writes ⛔ no free text about the family).
DO $$ BEGIN
  ALTER TABLE "memorial_withdrawals" ADD CONSTRAINT "memorial_withdrawals_helpline_no_note_check" CHECK (withdrawn_by::text <> 'helpline' OR internal_note_ciphertext IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
-- A staff withdrawal (`trust`, `helpline`) carries the staff display snapshot; a family one does ⛔ not. Re-created through `::text`.
ALTER TABLE "memorial_withdrawals" DROP CONSTRAINT IF EXISTS "memorial_withdrawals_actor_display_check";--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "memorial_withdrawals" ADD CONSTRAINT "memorial_withdrawals_actor_display_check" CHECK ((withdrawn_by::text IN ('trust', 'helpline')) = (actor_display IS NOT NULL) AND (actor_display IS NULL OR length(btrim(actor_display)) > 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

-- ── grants — append-only, save the outbox's 0152 / 0153 / 0154 column grants ───────────────────────────────────────────────
GRANT SELECT, INSERT ON "memorial_takedown_requests" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "memorial_takedown_outcomes" TO twt_app;--> statement-breakpoint
GRANT SELECT ON "memorial_takedown_approver_emails" TO twt_app;--> statement-breakpoint
GRANT INSERT ("pariwar_id", "request_id", "recipient_user_id", "outcome", "detail", "claimed_at", "claimed_by_job") ON "memorial_takedown_approver_emails" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("outcome", "provider_message_id", "detail", "first_detail", "attempt_count", "may_have_sent", "claimed_at", "claimed_by_job", "aging_since", "parked_at", "updated_at") ON "memorial_takedown_approver_emails" TO twt_app;--> statement-breakpoint

ALTER TABLE "memorial_takedown_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_takedown_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_takedown_outcomes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_takedown_outcomes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_takedown_approver_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_takedown_approver_emails" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "memorial_takedown_requests_tenant_isolation_select" ON "memorial_takedown_requests";--> statement-breakpoint
CREATE POLICY "memorial_takedown_requests_tenant_isolation_select" ON "memorial_takedown_requests" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_takedown_requests_tenant_isolation_insert" ON "memorial_takedown_requests";--> statement-breakpoint
CREATE POLICY "memorial_takedown_requests_tenant_isolation_insert" ON "memorial_takedown_requests" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_takedown_outcomes_tenant_isolation_select" ON "memorial_takedown_outcomes";--> statement-breakpoint
CREATE POLICY "memorial_takedown_outcomes_tenant_isolation_select" ON "memorial_takedown_outcomes" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_takedown_outcomes_tenant_isolation_insert" ON "memorial_takedown_outcomes";--> statement-breakpoint
CREATE POLICY "memorial_takedown_outcomes_tenant_isolation_insert" ON "memorial_takedown_outcomes" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_takedown_approver_emails_tenant_isolation_select" ON "memorial_takedown_approver_emails";--> statement-breakpoint
CREATE POLICY "memorial_takedown_approver_emails_tenant_isolation_select" ON "memorial_takedown_approver_emails" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_takedown_approver_emails_tenant_isolation_insert" ON "memorial_takedown_approver_emails";--> statement-breakpoint
CREATE POLICY "memorial_takedown_approver_emails_tenant_isolation_insert" ON "memorial_takedown_approver_emails" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_takedown_approver_emails_tenant_isolation_update" ON "memorial_takedown_approver_emails";--> statement-breakpoint
CREATE POLICY "memorial_takedown_approver_emails_tenant_isolation_update" ON "memorial_takedown_approver_emails" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- The finished-row guard — 0153 / 0154's, verbatim but for the table name.
CREATE OR REPLACE FUNCTION memorial_takedown_approver_emails_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.outcome <> 'attempting' THEN
    RAISE EXCEPTION
      'memorial_takedown_approver_emails: a finished row (%) is never updated — once per (request, recipient), ever (Story 11b.4a MP10)', OLD.outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.may_have_sent AND NOT NEW.may_have_sent THEN
    RAISE EXCEPTION
      'memorial_takedown_approver_emails: may_have_sent is set TRUE, never back (Story 11b.4a MP10)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.aging_since IS DISTINCT FROM OLD.aging_since
     AND (OLD.claimed_by_job IS DISTINCT FROM 'sweep:held' OR NEW.aging_since < OLD.aging_since) THEN
    RAISE EXCEPTION
      'memorial_takedown_approver_emails: aging_since moves only forward, and only on the re-claim of a parked row (Story 11b.4a MP10)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS memorial_takedown_approver_emails_guard_update ON memorial_takedown_approver_emails;--> statement-breakpoint
CREATE TRIGGER memorial_takedown_approver_emails_guard_update
  BEFORE UPDATE ON memorial_takedown_approver_emails
  FOR EACH ROW EXECUTE FUNCTION memorial_takedown_approver_emails_guard_update();--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "memorial_takedown_requests_pool_idx" ON "memorial_takedown_requests" USING btree ("pariwar_id", "pool_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memorial_takedown_requests_received_idx" ON "memorial_takedown_requests" USING btree ("pariwar_id", "received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memorial_withdrawals_takedown_request_idx" ON "memorial_withdrawals" USING btree ("pariwar_id", "takedown_request_id") WHERE "takedown_request_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memorial_takedown_approver_emails_attempting_idx" ON "memorial_takedown_approver_emails" USING btree ("aging_since", "claimed_at") WHERE "outcome" = 'attempting';
