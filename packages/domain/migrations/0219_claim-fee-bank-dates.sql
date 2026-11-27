-- Migration 0219 — `claim_fee_bank_dates`, the finance officer's record of the date the Trust's own bank statement shows a
-- joining fee arrived (Story 6.39a, Task 1.1; DL1; AC1; author-commit `2026-11-27-510`, building `2026-11-21-473` Q2 B
-- under `-474` item 1; the edges ruled `2026-11-27-511`). After 0218 (Story 3.13).
--
-- The ruling — `-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived
-- before the death; they record that they did, with a reason, and it is audited."* ONE recorded staff act per claim: a
-- LIVE row; a new record supersedes it (a wrong date is corrected by a new record — ⛔ a withdraw act, DL5).
--
-- ⛔ The record decides nothing (N2). It is a FACT the finance officer records; the District Admin's next membership check
-- compares the EARLIER of it and the recorded fee date with the date of death, by the ONE rule (`fee-death-date.ts`, DL2 /
-- DL6). The statement itself is ⛔ stored (DL3): the typed reference is compared with the joining payment's stored `utr`
-- and then dropped — it is ⛔ a column here.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020. HAND-AUTHORED
-- WHOLE in 0212's statement order — table, FKs, CHECKs, grants, ENABLE / FORCE RLS, policies (mirroring
-- `src/policies/claim-fee-bank-date-rls.ts`), indexes, triggers. No snapshot file. The roles exist since 0002.
--
-- ── Hand-supplements ─────────────────────────────────────────────────────────────────────────────────────────────────
--   1. GRANT SELECT, INSERT + a COLUMN-LEVEL GRANT UPDATE ("superseded_at", "superseded_reason", "note_ciphertext") to
--      twt_app AT BIRTH: the supersession (the writer) and the DPDPA-RTBF scrub of the note. ⛔ Other column is
--      updatable. A per-command UPDATE policy: without it the scrub matches 0 rows under FORCE (6.23a).
--   2. The append-only guard AT BIRTH, naming EVERY frozen column — all but the three granted ones
--      ([[project_append_only_guard_names_erasure_columns]]): `note_ciphertext` is deliberately OUT of the list.
--   3. Supersession is ONE-WAY (0212's trigger, copied).
--   4. `claim_membership_checks` gains `fee_date_source` + `fee_bank_date_id` (DL1 / DL6), their CHECKs, and its guard
--      `claim_membership_checks_reject_mutation()` is REPLACED to carry both in its chain (G7 / TR2 — a new column is
--      unguarded by the trigger until the function is replaced; the column grant alone hides the hole from twt_app).
-- ⛔ NO DELETE: ⛔ grant, ⛔ policy leg, ⛔ writer. Only an `ON DELETE cascade` (from `claims` or the receipt) removes a row.

CREATE TABLE "claim_fee_bank_dates" (
	"record_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"fee_receipt_id" uuid NOT NULL,
	"bank_credit_date" date NOT NULL,
	"reason_code" text NOT NULL,
	"note_ciphertext" text NOT NULL,
	"decided_by_actor_id" text NOT NULL,
	"decided_by_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_reason" text
);--> statement-breakpoint
ALTER TABLE "claim_fee_bank_dates" ADD CONSTRAINT "claim_fee_bank_dates_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The JOINING payment the typed reference was matched to (N3 — the writer compares the reference with ITS `utr`).
ALTER TABLE "claim_fee_bank_dates" ADD CONSTRAINT "claim_fee_bank_dates_fee_receipt_id_fk" FOREIGN KEY ("fee_receipt_id") REFERENCES "public"."vyawastha_shulk_receipts"("receipt_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `FEE_BANK_DATE_REASON_CODES` / `FEE_BANK_DATE_SUPERSESSION_REASONS` (schema/claim_fee_bank_dates.ts)
-- and the `@twt/contracts` mirror.
ALTER TABLE "claim_fee_bank_dates" ADD CONSTRAINT "claim_fee_bank_dates_reason_code_check" CHECK ("reason_code" IN ('recorded_late_by_member', 'recorded_by_family_after_death', 'other'));--> statement-breakpoint
ALTER TABLE "claim_fee_bank_dates" ADD CONSTRAINT "claim_fee_bank_dates_display_check" CHECK (length(btrim("decided_by_display")) > 0);--> statement-breakpoint
-- Q2 B's "with a reason": the note is REQUIRED (it says which statement — account, period, line — and what was seen).
ALTER TABLE "claim_fee_bank_dates" ADD CONSTRAINT "claim_fee_bank_dates_note_check" CHECK (length(btrim("note_ciphertext")) > 0);--> statement-breakpoint
-- Live, or superseded WITH a reason — never one without the other.
ALTER TABLE "claim_fee_bank_dates" ADD CONSTRAINT "claim_fee_bank_dates_supersession_coherence_check" CHECK (
	("superseded_at" IS NULL AND "superseded_reason" IS NULL)
	OR ("superseded_at" IS NOT NULL AND "superseded_reason" IS NOT NULL AND "superseded_reason" IN ('re_recorded'))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_fee_bank_dates" TO twt_app;--> statement-breakpoint
-- The supersession and the DPDPA-RTBF scrub of the note. ⛔ No other column is writable.
GRANT UPDATE ("superseded_at", "superseded_reason", "note_ciphertext") ON "claim_fee_bank_dates" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_fee_bank_dates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_fee_bank_dates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_fee_bank_dates_tenant_isolation_select" ON "claim_fee_bank_dates" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_fee_bank_dates_tenant_isolation_insert" ON "claim_fee_bank_dates" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_fee_bank_dates_tenant_isolation_update" ON "claim_fee_bank_dates" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_fee_bank_dates_pariwar_id_idx" ON "claim_fee_bank_dates" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_fee_bank_dates_claim_case_id_idx" ON "claim_fee_bank_dates" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_fee_bank_dates_fee_receipt_id_idx" ON "claim_fee_bank_dates" USING btree ("fee_receipt_id");--> statement-breakpoint
CREATE INDEX "claim_fee_bank_dates_deceased_member_idx" ON "claim_fee_bank_dates" USING btree ("pariwar_id", "deceased_member_id");--> statement-breakpoint
-- ⭐ DL1 — at most ONE live record per claim. The writer's conditional UPDATE is the interface; this index is the truth.
CREATE UNIQUE INDEX "claim_fee_bank_dates_one_live_per_claim_uq" ON "claim_fee_bank_dates" USING btree ("claim_case_id") WHERE superseded_at IS NULL;--> statement-breakpoint
-- The target of `claim_membership_checks`' COMPOSITE FK (below): a check can name only a record of its OWN claim (code review
-- 2026-11-27 — a single-column FK skips RLS and would accept another claim's record).
ALTER TABLE "claim_fee_bank_dates" ADD CONSTRAINT "claim_fee_bank_dates_record_claim_uq" UNIQUE ("record_id", "claim_case_id");--> statement-breakpoint

-- Append-only, structurally and COLUMN-AWARE (the 0212 idiom):
--   · UPDATE   — refused unless ONLY the granted columns changed: the two supersession columns (the writer) and
--                `note_ciphertext` (the RTBF scrub — deliberately absent from the list below).
--   · DELETE   — refused, EXCEPT an `ON DELETE cascade` (depth > 1).
--   · TRUNCATE — refused.
CREATE FUNCTION claim_fee_bank_dates_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.record_id IS DISTINCT FROM OLD.record_id
       OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
       OR NEW.claim_case_id IS DISTINCT FROM OLD.claim_case_id
       OR NEW.deceased_member_id IS DISTINCT FROM OLD.deceased_member_id
       OR NEW.fee_receipt_id IS DISTINCT FROM OLD.fee_receipt_id
       OR NEW.bank_credit_date IS DISTINCT FROM OLD.bank_credit_date
       OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
       OR NEW.decided_by_actor_id IS DISTINCT FROM OLD.decided_by_actor_id
       OR NEW.decided_by_display IS DISTINCT FROM OLD.decided_by_display
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at THEN
      RAISE EXCEPTION
        'claim_fee_bank_dates is append-only — only the supersession stamp and the RTBF scrub of the note may update a record (Story 6.39a DL1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_fee_bank_dates is append-only — a record is never deleted; a new record supersedes it (Story 6.39a DL1)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_fee_bank_dates_no_update
  BEFORE UPDATE ON claim_fee_bank_dates
  FOR EACH ROW EXECUTE FUNCTION claim_fee_bank_dates_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_fee_bank_dates_no_delete
  BEFORE DELETE ON claim_fee_bank_dates
  FOR EACH ROW EXECUTE FUNCTION claim_fee_bank_dates_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_fee_bank_dates_no_truncate
  BEFORE TRUNCATE ON claim_fee_bank_dates
  EXECUTE FUNCTION claim_fee_bank_dates_reject_mutation();
--> statement-breakpoint

-- Supersession is ONE-WAY (a copy of 0212's): a LIVE row may be superseded (both columns together — the CHECK); a
-- SUPERSEDED row's stamp can ⛔ never change again, so a superseded bank date can ⛔ never be revived.
CREATE FUNCTION claim_fee_bank_dates_supersession_one_way()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.superseded_at IS NOT NULL
     AND (NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
          OR NEW.superseded_reason IS DISTINCT FROM OLD.superseded_reason) THEN
    RAISE EXCEPTION
      'claim_fee_bank_dates supersession is one-way — a superseded record is never revived or re-stamped (Story 6.39a DL1)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_fee_bank_dates_supersession_one_way
  BEFORE UPDATE ON claim_fee_bank_dates
  FOR EACH ROW EXECUTE FUNCTION claim_fee_bank_dates_supersession_one_way();
--> statement-breakpoint

-- ── `claim_membership_checks` — which fee date the check compared (DL1 / DL6) ─────────────────────────────────────────
-- `fee_date_source` — `'recorded'` (the joining payment's recorded date) or `'bank'` (a live bank-date record's date, used
-- only when it is STRICTLY EARLIER — DL6). The DEFAULT `'recorded'` is TRUE for every check written before this migration
-- (6.39 compared the recorded date only) and keeps `seedPassedMembershipCheck` and its twins valid unchanged (TR1).
-- ⚠ Row `3-17-joining-and-renewal-fee-optional-switch` (G14 / TR13) will add a THIRD source (a member with ⛔ payment,
-- judged by submission): the vocabulary is ONE domain constant (`MEMBERSHIP_CHECK_FEE_DATE_SOURCES`) and the coherence
-- CHECK below is written one-way so a later source needs ⛔ rewrite of it.
ALTER TABLE "claim_membership_checks" ADD COLUMN "fee_date_source" text DEFAULT 'recorded' NOT NULL;--> statement-breakpoint
-- `fee_bank_date_id` — the live bank-date record the check CONSIDERED, whichever date won (DL6): the gate compares it with
-- the claim's live record (`bank_date_recorded`, DL7), so it is stored even when the recorded date was the earlier.
ALTER TABLE "claim_membership_checks" ADD COLUMN "fee_bank_date_id" uuid;--> statement-breakpoint
-- COMPOSITE (code review 2026-11-27): the record named must be one of the check's OWN claim. MATCH SIMPLE — a NULL
-- `fee_bank_date_id` (⛔ record considered) is not checked.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_fee_bank_date_id_fk" FOREIGN KEY ("fee_bank_date_id", "claim_case_id") REFERENCES "public"."claim_fee_bank_dates"("record_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `MEMBERSHIP_CHECK_FEE_DATE_SOURCES` (schema/claim_membership_checks.ts) and the contracts mirror.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_fee_date_source_check" CHECK ("fee_date_source" IN ('recorded', 'bank'));--> statement-breakpoint
-- ONE-WAY (DL6): `'bank'` ⇒ an id. `'recorded'` WITH an id is valid — a record was considered and the recorded date was the
-- earlier (a later bank date never counts against a family — TL4).
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_fee_bank_date_coherence_check" CHECK ("fee_date_source" <> 'bank' OR "fee_bank_date_id" IS NOT NULL);--> statement-breakpoint
CREATE INDEX "claim_membership_checks_fee_bank_date_id_idx" ON "claim_membership_checks" USING btree ("fee_bank_date_id");--> statement-breakpoint

-- ⭐ TR2 — the guard REPLACED with its FULL chain + the two new columns (0212's body, unchanged but for them).
-- ⚠ TR13: row `3-17-joining-and-renewal-fee-optional-switch` will `CREATE OR REPLACE` this SAME function — whichever
-- story lands SECOND must start from the other's body, or the first one's columns silently fall out of the guard with
-- every test green.
CREATE OR REPLACE FUNCTION claim_membership_checks_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.check_id IS DISTINCT FROM OLD.check_id
       OR NEW.claim_case_id IS DISTINCT FROM OLD.claim_case_id
       OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
       OR NEW.deceased_member_id IS DISTINCT FROM OLD.deceased_member_id
       OR NEW.death_certificate_review_id IS DISTINCT FROM OLD.death_certificate_review_id
       OR NEW.fee_receipt_id IS DISTINCT FROM OLD.fee_receipt_id
       OR NEW.fee_outcome IS DISTINCT FROM OLD.fee_outcome
       OR NEW.fee_date_source IS DISTINCT FROM OLD.fee_date_source
       OR NEW.fee_bank_date_id IS DISTINCT FROM OLD.fee_bank_date_id
       OR NEW.identity_required IS DISTINCT FROM OLD.identity_required
       OR NEW.identity_outcome IS DISTINCT FROM OLD.identity_outcome
       OR NEW.identity_reason IS DISTINCT FROM OLD.identity_reason
       OR NEW.decided_by_actor_id IS DISTINCT FROM OLD.decided_by_actor_id
       OR NEW.decided_by_display IS DISTINCT FROM OLD.decided_by_display
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at THEN
      RAISE EXCEPTION
        'claim_membership_checks is append-only — only the supersession stamp and the RTBF scrub of the note may update a check (Story 6.39 DL1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_membership_checks is append-only — a check is never deleted; a re-check supersedes it (Story 6.39 DL1)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
