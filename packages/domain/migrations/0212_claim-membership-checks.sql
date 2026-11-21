-- Migration 0212 — `claim_membership_checks`, the staff membership check before any drive (Story 6.39, Task 1.1; DL1;
-- AC1; author-commit `2026-11-21-472`). After 0210 / 0211 (the two `fee_paid_after_death` deny reasons, each alone).
--
-- The rulings: `2026-10-31-424` Q1 (a) C (staff check an identity nobody has checked, before any drive opens) and
-- `2026-10-31-430` Q1 B (staff compare the certificate's date of death with the date the joining fee was paid;
-- ⛔ drive if the fee came after). ONE recorded staff act per claim: a LIVE row; a re-check supersedes it.
--
-- ⛔ THE TABLE STORES ⛔ DATE (DL1). The death date is Tier-1 and has ONE home (the accepted certificate review this
-- row names); the fee date has ONE home (the receipt this row names). The row carries the OUTCOME of comparing them.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020. HAND-AUTHORED
-- WHOLE in 0122's statement order — table, FKs, CHECKs, grants, ENABLE / FORCE RLS, policies (mirroring
-- `src/policies/claim-membership-check-rls.ts`), indexes, triggers. No snapshot file. The roles exist since 0002.
--
-- ── Hand-supplements ─────────────────────────────────────────────────────────────────────────────────────────────────
--   1. GRANT SELECT, INSERT + a COLUMN-LEVEL GRANT UPDATE ("superseded_at", "superseded_reason", "note_ciphertext") to
--      twt_app AT BIRTH: the supersession (the writer) and the DPDPA-RTBF scrub of the optional note (DL14). ⛔ Other
--      column is updatable. A per-command UPDATE policy: without it the scrub matches 0 rows under FORCE (6.23a).
--   2. The append-only guard AT BIRTH, naming EVERY frozen column — all but the three granted ones
--      ([[project_append_only_guard_names_erasure_columns]]): `note_ciphertext` is deliberately OUT of the list, so the
--      scrub is writable and ⛔ later REPLACE of the guard is needed.
--   3. Supersession is ONE-WAY (0122's `claim_death_certificate_reviews_supersession_one_way`, copied).
-- ⛔ NO DELETE: ⛔ grant, ⛔ policy leg, ⛔ writer. Only an `ON DELETE cascade` (from `claims`, the certificate review or
-- the receipt's member) removes a row.

CREATE TABLE "claim_membership_checks" (
	"check_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"death_certificate_review_id" uuid NOT NULL,
	"fee_receipt_id" uuid NOT NULL,
	"fee_outcome" text NOT NULL,
	"identity_required" boolean NOT NULL,
	"identity_outcome" text NOT NULL,
	"identity_reason" text,
	"note_ciphertext" text,
	"decided_by_actor_id" text NOT NULL,
	"decided_by_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_reason" text
);--> statement-breakpoint
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The accepted review the comparison was computed against — the CURRENCY token (N4): a check is current only while
-- this is still the claim's current accepted review.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_death_certificate_review_id_fk" FOREIGN KEY ("death_certificate_review_id") REFERENCES "public"."claim_death_certificate_reviews"("review_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The JOINING receipt (DL3) whose `paid_at` was compared.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_fee_receipt_id_fk" FOREIGN KEY ("fee_receipt_id") REFERENCES "public"."vyawastha_shulk_receipts"("receipt_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `MEMBERSHIP_CHECK_FEE_OUTCOMES` / `…_IDENTITY_OUTCOMES` / `…_IDENTITY_REASONS` /
-- `…_SUPERSESSION_REASONS` (schema/claim_membership_checks.ts) and their `@twt/contracts` mirrors.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_fee_outcome_check" CHECK ("fee_outcome" IN ('before_death', 'same_day', 'after_death'));--> statement-breakpoint
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_identity_outcome_check" CHECK ("identity_outcome" IN ('not_required', 'confirmed', 'not_confirmed'));--> statement-breakpoint
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_display_check" CHECK (length(btrim("decided_by_display")) > 0);--> statement-breakpoint
-- N2 — the identity half is judged iff it was required: `not_required` ⇔ NOT `identity_required`.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_identity_required_coherence_check" CHECK (
	("identity_required" = false AND "identity_outcome" = 'not_required')
	OR ("identity_required" = true AND "identity_outcome" IN ('confirmed', 'not_confirmed'))
);--> statement-breakpoint
-- DL8 — `not_confirmed` carries one of the four reasons AND a note; any other outcome carries ⛔ reason (a note stays
-- optional there). ⚠ THE NULL TRAP (0119): every `IN` over a NULLABLE column is guarded by `IS NOT NULL`.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_identity_reason_coherence_check" CHECK (
	(
		"identity_outcome" = 'not_confirmed'
		AND "identity_reason" IS NOT NULL
		AND "identity_reason" IN ('name_differs', 'age_or_birth_date_differs', 'document_unreadable', 'other')
		AND "note_ciphertext" IS NOT NULL
	) OR (
		"identity_outcome" IN ('not_required', 'confirmed')
		AND "identity_reason" IS NULL
	)
);--> statement-breakpoint
-- Live, or superseded WITH a reason — never one without the other.
ALTER TABLE "claim_membership_checks" ADD CONSTRAINT "claim_membership_checks_supersession_coherence_check" CHECK (
	("superseded_at" IS NULL AND "superseded_reason" IS NULL)
	OR ("superseded_at" IS NOT NULL AND "superseded_reason" IS NOT NULL AND "superseded_reason" IN ('re_checked'))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_membership_checks" TO twt_app;--> statement-breakpoint
-- The supersession (DL1) and the DPDPA-RTBF scrub of the note (DL14). ⛔ No other column is writable.
GRANT UPDATE ("superseded_at", "superseded_reason", "note_ciphertext") ON "claim_membership_checks" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_membership_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_membership_checks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_membership_checks_tenant_isolation_select" ON "claim_membership_checks" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_membership_checks_tenant_isolation_insert" ON "claim_membership_checks" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_membership_checks_tenant_isolation_update" ON "claim_membership_checks" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_membership_checks_pariwar_id_idx" ON "claim_membership_checks" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_membership_checks_claim_case_id_idx" ON "claim_membership_checks" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_membership_checks_review_id_idx" ON "claim_membership_checks" USING btree ("death_certificate_review_id");--> statement-breakpoint
CREATE INDEX "claim_membership_checks_fee_receipt_id_idx" ON "claim_membership_checks" USING btree ("fee_receipt_id");--> statement-breakpoint
CREATE INDEX "claim_membership_checks_deceased_member_idx" ON "claim_membership_checks" USING btree ("pariwar_id", "deceased_member_id");--> statement-breakpoint
-- ⭐ DL1 — at most ONE live check per claim. The writer's conditional UPDATE is the interface; this index is the
-- truth, and a supersession race hits 23505.
CREATE UNIQUE INDEX "claim_membership_checks_one_live_per_claim_uq" ON "claim_membership_checks" USING btree ("claim_case_id") WHERE superseded_at IS NULL;--> statement-breakpoint

-- Append-only, structurally and COLUMN-AWARE (the 0122 idiom):
--   · UPDATE   — refused unless ONLY the granted columns changed: the two supersession columns (the writer) and
--                `note_ciphertext` (the RTBF scrub — deliberately absent from the list below).
--   · DELETE   — refused, EXCEPT an `ON DELETE cascade` (depth > 1).
--   · TRUNCATE — refused.
CREATE FUNCTION claim_membership_checks_reject_mutation()
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
--> statement-breakpoint
CREATE TRIGGER claim_membership_checks_no_update
  BEFORE UPDATE ON claim_membership_checks
  FOR EACH ROW EXECUTE FUNCTION claim_membership_checks_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_membership_checks_no_delete
  BEFORE DELETE ON claim_membership_checks
  FOR EACH ROW EXECUTE FUNCTION claim_membership_checks_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_membership_checks_no_truncate
  BEFORE TRUNCATE ON claim_membership_checks
  EXECUTE FUNCTION claim_membership_checks_reject_mutation();
--> statement-breakpoint

-- Supersession is ONE-WAY (a copy of 0122's `claim_death_certificate_reviews_supersession_one_way`): a LIVE row may
-- be superseded (both columns together — the CHECK); a SUPERSEDED row's stamp can ⛔ never change again, so a
-- superseded check — above all a superseded PASS — can ⛔ never be revived. The note scrub is untouched by this rule.
CREATE FUNCTION claim_membership_checks_supersession_one_way()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.superseded_at IS NOT NULL
     AND (NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
          OR NEW.superseded_reason IS DISTINCT FROM OLD.superseded_reason) THEN
    RAISE EXCEPTION
      'claim_membership_checks supersession is one-way — a superseded check is never revived or re-stamped (Story 6.39 DL1)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_membership_checks_supersession_one_way
  BEFORE UPDATE ON claim_membership_checks
  FOR EACH ROW EXECUTE FUNCTION claim_membership_checks_supersession_one_way();
