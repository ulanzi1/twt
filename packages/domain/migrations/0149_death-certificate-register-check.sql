-- Migration 0149 — the District Admin's government death-register (CRS) check, and the accepted date's keyed index
-- (Story 6.26b, Task 1; `2026-10-06-282` GI8, GI13 [b]; `-262` FQ8 B; AC7, AC11b).
--
--   · claim_death_certificate_reviews.register_check — what the District Admin found when they looked the
--     certificate up on the government's online death register: `matches` / `does_not_match` /
--     `could_not_check` (`-262` FQ8 B; `-263` FQ11 covers "could not be checked online"). Plaintext — a code,
--     ⛔ never PII; ⛔ no certificate number is stored (GI8). Accepted reviews only: the WRITER requires it on an
--     accept and refuses it on a reject (`recordDeathCertificateReview`).
--   · claim_death_certificate_reviews.accepted_date_index — the keyed blind index of the accepted date of
--     death, under the inspection's `DEATH_DATE_INDEX_FIELD_CLASS` (6.26a), so the warning module compares the
--     family's date with the certificate's WITHOUT a decrypt (6.23a invariant 7; GI6). Accepted only.
--
-- ⚠⚠ "An ACCEPTED review carries both" is ⛔ NOT a CHECK — it is the writer's guard. Every pre-0149 accepted review
-- carries neither, and two existing UPDATEs rewrite those rows (the RTBF scrub sets `note_ciphertext` on every review
-- of the deceased; the writer's supersession stamps `superseded_at`) — such a CHECK would fail every erasure and make
-- every pre-0149 certificate un-re-reviewable. ⛔ No backfill (⛔ not in production; a re-review writes both —
-- [[feedback_record_unattested_no_backfill]]). The coherence CHECK below holds on EVERY existing row (both columns
-- are new, NULL) ⇒ VALIDATED, ⛔ not `NOT VALID`.
--
-- Grants: `0122` gave `twt_app` SELECT, INSERT + a column UPDATE on the two supersession columns and the two
-- ciphertexts. The RTBF scrub now also NULLs `accepted_date_index` (GI13 [b]) ⇒ a column UPDATE grant on it.
-- `register_check` gets ⛔ no UPDATE grant and joins the append-only trigger's deny-list (immutable — a later check is
-- a NEW review). `accepted_date_index` stays OUT of the deny-list (the scrub NULLs it — the ciphertext precedent).
-- Hand-authored — ⛔ never regenerate.

-- ⚠ LOCKSTEP with `DEATH_CERTIFICATE_REGISTER_CHECKS` (schema/claim_death_certificate_reviews.ts), `@twt/contracts`'
-- `DeathCertificateRegisterCheck` z.enum and the admin's local `RegisterCheck` type — re-declared, not shared, in four places.
ALTER TABLE "claim_death_certificate_reviews" ADD COLUMN "register_check" text;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ADD COLUMN "accepted_date_index" text;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_register_check_check" CHECK (
	"register_check" IS NULL OR "register_check" IN ('matches', 'does_not_match', 'could_not_check')
);--> statement-breakpoint
-- A REJECTED review carries neither column. (Null-safe: `verdict` is NOT NULL.)
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_register_check_coherence_check" CHECK (
	"verdict" <> 'rejected' OR ("register_check" IS NULL AND "accepted_date_index" IS NULL)
);--> statement-breakpoint
-- GI13 [b] — the DPDPA-RTBF scrub NULLs the index with the ciphertexts.
GRANT UPDATE ("accepted_date_index") ON "claim_death_certificate_reviews" TO twt_app;--> statement-breakpoint

-- The `0122` function restated whole, with `register_check` added to the immutable list. The triggers stay.
CREATE OR REPLACE FUNCTION claim_death_certificate_reviews_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.review_id IS DISTINCT FROM OLD.review_id
       OR NEW.claim_case_id IS DISTINCT FROM OLD.claim_case_id
       OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
       OR NEW.deceased_member_id IS DISTINCT FROM OLD.deceased_member_id
       OR NEW.upload_id IS DISTINCT FROM OLD.upload_id
       OR NEW.verdict IS DISTINCT FROM OLD.verdict
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.register_check IS DISTINCT FROM OLD.register_check
       OR NEW.decided_by_actor_id IS DISTINCT FROM OLD.decided_by_actor_id
       OR NEW.decided_by_display IS DISTINCT FROM OLD.decided_by_display
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
       OR NEW.supersedes_review_id IS DISTINCT FROM OLD.supersedes_review_id THEN
      RAISE EXCEPTION
        'claim_death_certificate_reviews is append-only — only the supersession stamp and the RTBF scrub may update a review (Story 6.21a D1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_death_certificate_reviews is append-only — a review is never deleted; a re-review supersedes it (Story 6.21a D1)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
