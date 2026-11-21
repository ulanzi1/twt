-- Migration 0215 — the partner LEAD HANDOFF record (Story 12.5, Task 1.2; Decision `2026-11-21-483` QE4, QE6, QE10, QE16, QE21 (C),
-- QE24 (A); AC1). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal
-- `when`, which sits above every sibling's — [[project_sibling_migration_when_order_shared_db]]). A NEW table: ⛔ existing row can fail a
-- CHECK, ⛔ edit of an applied migration.
--
-- ⭐ WHAT IT IS. An OUTBOX and its delivery record in one: ONE row per lead, written by `recordLeadHandoff` in 12.3's lead transaction
-- (the same one as `module.lead_submitted`), then moved by the jobs sweep along the W table of QE6 (W14 added by `-487`) — and by two `twt_app` writers only:
-- erasure (W11) and the staff requeue (W13). AT LEAST ONCE (QE6 (A)): the partner dedupes on `Idempotency-Key: <lead_id>`.
-- ⭐ TR1 — the new `consent_type` value (0214) is ⛔ named here: drizzle applies every pending file in ONE transaction and an added enum
-- value cannot be used before it commits (55P04). The consent's TYPE is checked by `recordLeadHandoff`, ⛔ by a CHECK.
-- ⭐ THE GUARD is written FRESH (G2, TR17): the 13.1b twin forbids a return to `due` after a lapse, and the 0143 / 0156 erasure arms refuse
-- a ciphertext going NULL — this table needs both. It binds every role at DEFAULT settings (a superuser can DISABLE it or set
-- `session_replication_role = replica`).
-- ⚠ LOCKSTEP: the status list with `LEAD_HANDOFF_STATUSES`, the detail grammar with `LEAD_HANDOFF_DETAIL_PATTERN`, the reference grammar
-- with `LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN` (schema/marketplace_lead_handoffs.ts — the schema spec compares them).
-- `twt_app`: SELECT, a column-narrowed INSERT (W1), and UPDATE on EXACTLY the columns W11 and W13 write; ⛔ DELETE. FORCE RLS with THREE
-- per-command policies — the UPDATE one AT BIRTH, so erasure matches rows (without it the scrub matches 0 rows under FORCE — `-279` A12).
-- The sweep runs on the jobs login (roster Row 26; Row 54 (g) is its grant).
-- PII: `member_fields_ciphertext` alone (Tier-1, `module_lead_fields`). Statement order: CREATE → CHECKs → FKs → GRANT → ENABLE → FORCE →
-- POLICY → indexes → trigger (0202).

CREATE TABLE "marketplace_lead_handoffs" (
	"lead_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"consent_id" uuid NOT NULL,
	"envelope_version" smallint NOT NULL,
	"member_fields_ciphertext" text,
	"status" text DEFAULT 'due' NOT NULL,
	"outcome_detail" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claim_token" text,
	"claimed_at" timestamp with time zone,
	"held_since" timestamp with time zone,
	"partner_reference" text,
	"delivered_at" timestamp with time zone,
	"audit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_lead_handoffs_consent_id_unique" UNIQUE("consent_id")
);--> statement-breakpoint
-- ⚠ LOCKSTEP with `LEAD_HANDOFF_STATUSES`.
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_status_check" CHECK ("status" IN ('due', 'attempting', 'delivered', 'failed_delivery', 'cancelled'));--> statement-breakpoint
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_envelope_version_check" CHECK ("envelope_version" = 1);--> statement-breakpoint
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_attempt_count_check" CHECK ("attempt_count" >= 0);--> statement-breakpoint
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_claim_token_check" CHECK ("claim_token" IS NULL OR char_length("claim_token") BETWEEN 1 AND 200);--> statement-breakpoint
-- A row in flight names the claim that holds it and when the lease began: every settle and release is compare-and-set on the token.
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_attempting_claim_check" CHECK (("status" = 'attempting') = ("claim_token" IS NOT NULL) AND ("status" = 'attempting') = ("claimed_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_delivered_at_check" CHECK (("status" = 'delivered') = ("delivered_at" IS NOT NULL));--> statement-breakpoint
-- A cancelled row holds NO fields (`-484` Q4 A: "Removed at once if the send is stopped"; code review 2026-11-22, patch 2): W9, W11 and
-- W14 all write NULL and the purge (W12) never visits a cancelled row, so a writer that cancelled WITHOUT dropping them would keep them
-- for good. (A `status` that is never NULL makes this two-valued.)
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_cancelled_fields_check" CHECK ("status" <> 'cancelled' OR "member_fields_ciphertext" IS NULL);--> statement-breakpoint
-- ADVISORY (I3) — ⚠ LOCKSTEP with `LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN`.
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_partner_reference_check" CHECK ("partner_reference" IS NULL OR "partner_reference" ~ '^[A-Za-z0-9_.-]{1,64}$');--> statement-breakpoint
-- QE10 — ⚠ LOCKSTEP with `LEAD_HANDOFF_DETAIL_PATTERN`.
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_outcome_detail_check" CHECK ("outcome_detail" IS NULL OR "outcome_detail" ~ '^(delivered:http_2xx:2[0-9]{2}|released:(http_5xx:5[0-9]{2}|http_408|http_429|timeout|network|http_401|http_403|http_404|address_refused)|held:(signing_key|kms|audit|db|dns)_unavailable|lapsed:lease_expired|requeued:manual|failed_delivery:(http_4xx:4[0-9]{2}|http_3xx:3[0-9]{2}|port_refused|url_refused|fields_unreadable|retries_exhausted|outcome_unknown|hold_expired:(signing_key|kms|audit|db|dns))|cancelled:(consent_revoked|member_erased|member_withdrawn|member_terminated|account_frozen|death_reported|module_withdrawn))$');--> statement-breakpoint
-- QE4 — a FINAL status carries a detail of its own prefix, and that prefix appears with no other status; `released:` / `held:` /
-- `lapsed:` / `requeued:` only with `due` or `attempting` (a claim keeps the previous detail). ⚠ Each final branch says `IS NOT NULL`
-- itself: `NULL LIKE …` is NULL, and a CHECK that evaluates to NULL PASSES — without it a final row with no detail would be admitted.
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_status_detail_check" CHECK (("status" = 'delivered' AND "outcome_detail" IS NOT NULL AND "outcome_detail" LIKE 'delivered:%') OR ("status" = 'failed_delivery' AND "outcome_detail" IS NOT NULL AND "outcome_detail" LIKE 'failed_delivery:%') OR ("status" = 'cancelled' AND "outcome_detail" IS NOT NULL AND "outcome_detail" LIKE 'cancelled:%') OR ("status" IN ('due', 'attempting') AND ("outcome_detail" IS NULL OR "outcome_detail" ~ '^(released|held|lapsed|requeued):')));--> statement-breakpoint
-- A COMPOSITE FK (G16): an FK check ignores RLS, so a single column would let a row name another Pariwar's module.
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_module_fk" FOREIGN KEY ("pariwar_id", "module_id") REFERENCES "public"."marketplace_modules"("pariwar_id", "module_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Under the refuse-DELETE guard ⛔ cascade (G16). A member row is never deleted (erasure anonymizes).
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_member_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A consent row is never deleted (revoke is a mutate — Story 2.7).
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_consent_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent_records"("consent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
GRANT SELECT ON "marketplace_lead_handoffs" TO twt_app;--> statement-breakpoint
-- INSERT — EXACTLY what `recordLeadHandoff` writes (W1); every other column is its DEFAULT, so `due`, `attempt_count = 0` and
-- `next_attempt_at = now()` are forced.
GRANT INSERT ("lead_id", "pariwar_id", "module_id", "member_id", "consent_id", "envelope_version", "member_fields_ciphertext", "audit_id") ON "marketplace_lead_handoffs" TO twt_app;--> statement-breakpoint
-- UPDATE — erasure (W11: the ciphertext, `status`, `outcome_detail`, `updated_at`) and the requeue (W13: also `attempt_count`,
-- `next_attempt_at`, `held_since`). ⛔ The claim columns, ⛔ the reference, ⛔ the ids: only the sweep's login moves those.
GRANT UPDATE ("member_fields_ciphertext", "status", "outcome_detail", "updated_at", "attempt_count", "next_attempt_at", "held_since") ON "marketplace_lead_handoffs" TO twt_app;--> statement-breakpoint
ALTER TABLE "marketplace_lead_handoffs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_lead_handoffs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "marketplace_lead_handoffs_tenant_isolation_select" ON "marketplace_lead_handoffs" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_lead_handoffs_tenant_isolation_insert" ON "marketplace_lead_handoffs" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_lead_handoffs_tenant_isolation_update" ON "marketplace_lead_handoffs" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The claim (S3), ordered `next_attempt_at, updated_at` (TR6: ⛔ `created_at` — a failing head row would block the queue).
CREATE INDEX "marketplace_lead_handoffs_due_idx" ON "marketplace_lead_handoffs" USING btree ("next_attempt_at", "updated_at") WHERE status = 'due';--> statement-breakpoint
-- The lapse (W10).
CREATE INDEX "marketplace_lead_handoffs_attempting_idx" ON "marketplace_lead_handoffs" USING btree ("claimed_at") WHERE status = 'attempting';--> statement-breakpoint
-- The purge (W12).
CREATE INDEX "marketplace_lead_handoffs_purge_idx" ON "marketplace_lead_handoffs" USING btree ("updated_at") WHERE member_fields_ciphertext IS NOT NULL AND status IN ('delivered', 'failed_delivery');--> statement-breakpoint
CREATE INDEX "marketplace_lead_handoffs_pariwar_module_idx" ON "marketplace_lead_handoffs" USING btree ("pariwar_id", "module_id");--> statement-breakpoint
-- Erasure (W11), 12.3's status read, and K-13's "which partners received this member's details".
CREATE INDEX "marketplace_lead_handoffs_pariwar_member_idx" ON "marketplace_lead_handoffs" USING btree ("pariwar_id", "member_id");--> statement-breakpoint
CREATE FUNCTION marketplace_lead_handoffs_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'marketplace_lead_handoffs: a handoff row is never deleted (Story 12.5, QE4)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.lead_id IS DISTINCT FROM OLD.lead_id
     OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.module_id IS DISTINCT FROM OLD.module_id
     OR NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.consent_id IS DISTINCT FROM OLD.consent_id
     OR NEW.envelope_version IS DISTINCT FROM OLD.envelope_version
     OR NEW.audit_id IS DISTINCT FROM OLD.audit_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'marketplace_lead_handoffs: an identity column is never changed (Story 12.5, QE4)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- The fields only ever go NOT NULL → NULL: ⛔ another value, ⛔ back (W9, W11, W12).
  IF NEW.member_fields_ciphertext IS DISTINCT FROM OLD.member_fields_ciphertext
     AND NOT (OLD.member_fields_ciphertext IS NOT NULL AND NEW.member_fields_ciphertext IS NULL) THEN
    RAISE EXCEPTION
      'marketplace_lead_handoffs: the member fields only ever go from present to absent (Story 12.5, QE4)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- I10 — a FINAL row changes only by its fields going NULL (W11, W12) — or, for `failed_delivery`, by the requeue (W13).
  IF OLD.status IN ('delivered', 'failed_delivery', 'cancelled') THEN
    IF OLD.status = 'failed_delivery' AND NEW.status = 'due' THEN
      IF NEW.member_fields_ciphertext IS NULL THEN
        RAISE EXCEPTION
          'marketplace_lead_handoffs: a requeue needs the member fields (Story 12.5, W13)'
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
      RETURN NEW;
    END IF;
    IF (NEW.status, NEW.outcome_detail, NEW.attempt_count, NEW.next_attempt_at, NEW.claim_token, NEW.claimed_at, NEW.held_since,
        NEW.partner_reference, NEW.delivered_at)
       IS DISTINCT FROM
       (OLD.status, OLD.outcome_detail, OLD.attempt_count, OLD.next_attempt_at, OLD.claim_token, OLD.claimed_at, OLD.held_since,
        OLD.partner_reference, OLD.delivered_at)
       OR NEW.member_fields_ciphertext IS NOT DISTINCT FROM OLD.member_fields_ciphertext THEN
      RAISE EXCEPTION
        'marketplace_lead_handoffs: a final row (%) changes only by its member fields going absent, or a failed one by a requeue (Story 12.5, I10)', OLD.status
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  -- `due` → `attempting` (W2) or `cancelled` (W11, and W14 — the sweep's waiting pass, Decision `2026-11-22-487`); ⛔ `due → due`,
  -- ⛔ `due → failed_delivery` (a hold and a give-up happen from `attempting`).
  IF OLD.status = 'due' AND NEW.status NOT IN ('attempting', 'cancelled') THEN
    RAISE EXCEPTION
      'marketplace_lead_handoffs: a due row moves only to attempting or cancelled (Story 12.5, QE6)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- `attempting` → a settle, a release, a hold, a cancel or a lapse (W3–W10); `attempting → attempting` ONLY as erasure (W11): the
  -- fields go NULL and nothing else moves but `updated_at` — ⛔ a second claim over a held row.
  IF OLD.status = 'attempting' AND NEW.status = 'attempting' THEN
    IF (NEW.outcome_detail, NEW.attempt_count, NEW.next_attempt_at, NEW.claim_token, NEW.claimed_at, NEW.held_since,
        NEW.partner_reference, NEW.delivered_at)
       IS DISTINCT FROM
       (OLD.outcome_detail, OLD.attempt_count, OLD.next_attempt_at, OLD.claim_token, OLD.claimed_at, OLD.held_since,
        OLD.partner_reference, OLD.delivered_at)
       OR NEW.member_fields_ciphertext IS NOT DISTINCT FROM OLD.member_fields_ciphertext THEN
      RAISE EXCEPTION
        'marketplace_lead_handoffs: an attempting row is never re-claimed; it changes in place only by erasure (Story 12.5, QE6)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marketplace_lead_handoffs_guard
  BEFORE UPDATE OR DELETE ON marketplace_lead_handoffs
  FOR EACH ROW EXECUTE FUNCTION marketplace_lead_handoffs_guard();
