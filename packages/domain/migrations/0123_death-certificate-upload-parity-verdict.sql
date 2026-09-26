-- Migration 0123 — each death-certificate UPLOAD keeps the parity verdict it received (Story 6.21a code
-- review, 2026-09-26; `2026-09-26-245` §1).
--
-- Before this, the OCR job wrote a certificate's parity verdict ONLY onto `claim_documents` — the CURRENT
-- certificate's row — so a replacement overwrote the verdict a verifier saw on the certificate it replaced
-- (evidence under `2026-09-21-238`). The certificate OBJECT was always kept; its Tier-1 OCR text is
-- re-derivable from it and stays only on `claim_documents` (`-245` §1 — our reading, ⛔ unratified). The
-- VERDICT is kept here, per upload.
--
-- ⛔ No PII: an outcome, the non-PII per-field flags and a confidence — the same three `claim_documents`
-- columns (0053), copied at INSERT by the OCR job, the table's sole writer. The 0122 grant (SELECT, INSERT)
-- and the append-only trigger already cover them: written once, ⛔ never updated.
-- NULLABLE, all three together: a row written before this migration has none (⛔ no backfill; ⛔ not in
-- production — T12's posture) — but every row written after it MUST carry one (the `NOT VALID` CHECK at the
-- end, `2026-09-26-246` §4). Hand-authored; ⛔ never regenerate 0122 (42P07).

ALTER TABLE "claim_death_certificate_uploads" ADD COLUMN "parity_outcome" "claim_document_parity_outcome";--> statement-breakpoint
ALTER TABLE "claim_death_certificate_uploads" ADD COLUMN "parity_flags" jsonb;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_uploads" ADD COLUMN "ocr_confidence" double precision;--> statement-breakpoint
-- All three or none (⚠ a CHECK treats NULL as passing, so each leg is stated explicitly).
ALTER TABLE "claim_death_certificate_uploads" ADD CONSTRAINT "claim_death_certificate_uploads_parity_verdict_check" CHECK (
  ("parity_outcome" IS NULL AND "parity_flags" IS NULL AND "ocr_confidence" IS NULL)
  OR ("parity_outcome" IS NOT NULL AND "parity_flags" IS NOT NULL AND "ocr_confidence" IS NOT NULL)
);--> statement-breakpoint
-- `2026-09-26-246` §4 — every row written from HERE ON carries its verdict (the OCR job always has one).
-- ⚠ `NOT VALID`: Postgres enforces it for new and updated rows but ⛔ does not validate rows written before
-- it — those keep their NULLs (⛔ no backfill). Never `VALIDATE` it while such rows exist.
ALTER TABLE "claim_death_certificate_uploads" ADD CONSTRAINT "claim_death_certificate_uploads_parity_verdict_required_check" CHECK ("parity_outcome" IS NOT NULL) NOT VALID;
