-- Migration 0148 — the photo of the original is STAMPED with the certificate it was taken for (Story 6.26a,
-- second code review; `2026-10-07-286` H1 / H2, amending `-282` GI4 (i)).
--
-- `-281` Q2 A / Story 6.26a P1: the inspector must have held and photographed the original "for the certificate the
-- claim now relies on". Photos carried ⛔ no link to an upload, so a photo of a REPLACED certificate's original still
-- satisfied GI4 after the inspector re-compared against the new one.
--
--   · claim_ground_inspection_photos.certificate_upload_id — the claim's CURRENT death-certificate upload when an
--     `original_certificate` photo was added (the ONE current-upload rule, `currentDeathCertificateUploadIdSql`), or
--     NULL (a `site` photo; an original photographed while the claim had ⛔ no current certificate — it never counts).
--     Completion counts only original photos stamped with the COMPARED upload. FK ON DELETE NO ACTION — `0147`'s
--     posture: a deleted upload must ⛔ never silently delete evidence. Single-column (the uploads' PK, `0122`/`0137`).
--   · a CHECK: a `site` photo carries ⛔ no stamp. Validated — every existing row is NULL.
--
-- ⛔ No backfill: a pre-0148 original photo stays NULL and ⛔ never counts (test databases only — ⛔ not in production;
-- [[feedback_record_unattested_no_backfill]]). ⛔ No new index (photos are read by assignment). Table grants (`0055`)
-- already cover the new column. Hand-authored — ⛔ never regenerate.

ALTER TABLE "claim_ground_inspection_photos" ADD COLUMN "certificate_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" ADD CONSTRAINT "claim_ground_inspection_photos_certificate_upload_id_fk" FOREIGN KEY ("certificate_upload_id") REFERENCES "public"."claim_death_certificate_uploads"("upload_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" ADD CONSTRAINT "claim_ground_inspection_photos_certificate_stamp_kind_check" CHECK (
  "certificate_upload_id" IS NULL OR "photo_kind" = 'original_certificate'
);
