-- Migration 0147 — the inspector's original-certificate record and the date / time of death (Story 6.26a,
-- Task 1.2; `2026-10-06-282` GI4 / GI5, amended by `-283` A6 / A7 and `-284` E2).
--
-- `-263` FQ11 A: at the inspection the inspector SEES the original death certificate, PHOTOGRAPHS it and RECORDS
-- whether it matches the uploaded copy. `-262` FQ8 C: the inspector records the date — and, if known, the time —
-- of death the family gives. `-264` FQ13 / `-281` Q2 A: a `certificate_check` records the date PRINTED on the
-- fresh original instead.
--
--   · claim_ground_inspection_photos.photo_kind — `site` (default; every pre-6.26 photo) | `original_certificate`.
--   · claim_ground_inspections:
--       original_certificate_verdict    — `matches` | `does_not_match` (plaintext, non-PII).
--       compared_certificate_upload_id  — the upload the inspector was SHOWN (re-asserted current under the claim
--                                         lock by the writer). FK ON DELETE NO ACTION — deliberately ⛔ not CASCADE:
--                                         a deleted upload must ⛔ never silently delete an inspection (`-243` keeps
--                                         every certificate; ⛔ nothing deletes an upload row except a claim's own
--                                         cascade, which reaches this table first). Single-column — the uploads
--                                         table's PK is `upload_id` (the 0122 / 0137 precedent).
--       death_date_ciphertext / death_time_ciphertext — Tier-1 (`piiColumn(1, 'ground_inspection')`).
--       death_date_source               — `family_statement` (a full visit) | `original_certificate` (a check).
--       death_date_index                — the keyed blind index of the `YYYY-MM-DD` date under the ONE field class
--                                         `DEATH_DATE_INDEX_FIELD_CLASS` (Story 6.26b compares it; ⛔ no decrypt).
--
-- ⭐ The completed-row CHECK is `NOT VALID`: a row completed before this migration has ⛔ no FQ11 record and is ⛔ never
-- backfilled ([[feedback_record_unattested_no_backfill]] — ⛔ not in production). ⚠ Postgres still re-checks it on
-- EVERY UPDATE of a row, so (a) it ⛔ never requires `death_date_index` — the member erasure NULLs it (GI13) — and
-- (b) the erasure touches only rows whose `death_date_ciphertext IS NOT NULL` (a pre-6.26 completed row would fail).
-- The two coherence CHECKs hold trivially on every existing row (all NULL) and are validated.
-- ⚠ `inspection_stage::text`: 0146's `certificate_check` cannot be named as an enum literal in the same migrator
-- transaction. Table grants (0055) already cover the new columns; ⛔ no new index (the `(claim_case_id, status)`
-- index serves every read). Hand-authored — ⛔ never regenerate.

CREATE TYPE "public"."ground_inspection_photo_kind" AS ENUM('site', 'original_certificate');--> statement-breakpoint
CREATE TYPE "public"."ground_inspection_certificate_verdict" AS ENUM('matches', 'does_not_match');--> statement-breakpoint
CREATE TYPE "public"."ground_inspection_death_date_source" AS ENUM('family_statement', 'original_certificate');--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" ADD COLUMN "photo_kind" "ground_inspection_photo_kind" DEFAULT 'site' NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD COLUMN "original_certificate_verdict" "ground_inspection_certificate_verdict";--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD COLUMN "compared_certificate_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD COLUMN "death_date_ciphertext" text;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD COLUMN "death_time_ciphertext" text;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD COLUMN "death_date_source" "ground_inspection_death_date_source";--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD COLUMN "death_date_index" text;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_compared_certificate_upload_id_fk" FOREIGN KEY ("compared_certificate_upload_id") REFERENCES "public"."claim_death_certificate_uploads"("upload_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The date's source follows the stage: a `certificate_check` records the printed date, every other stage the family's.
ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_death_date_source_stage_check" CHECK (
  "death_date_source" IS NULL
  OR ("inspection_stage"::text = 'certificate_check') = ("death_date_source" = 'original_certificate')
);--> statement-breakpoint
-- A time of death is the family's statement only (⛔ never on a certificate check).
ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_death_time_source_check" CHECK (
  "death_time_ciphertext" IS NULL OR "death_date_source" = 'family_statement'
);--> statement-breakpoint
-- `-282` GI4 / GI5 — every inspection completed from HERE ON carries its FQ11 record and its date.
-- ⚠ `NOT VALID` (see the header) — ⛔ never `VALIDATE` it while a pre-6.26 completed row exists.
ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_completed_death_facts_check" CHECK (
  "status" <> 'completed'
  OR (
    "original_certificate_verdict" IS NOT NULL
    AND "compared_certificate_upload_id" IS NOT NULL
    AND "death_date_source" IS NOT NULL
    AND "death_date_ciphertext" IS NOT NULL
  )
) NOT VALID;
