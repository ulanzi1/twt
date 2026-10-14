-- Migration 0159 — WHO wrote a visit note, and WHO captioned a photo (Story 6.27b, code review round 2 Y8; BigDev
-- 2026-10-14 Y1 → A, AC7's "2026-10-14 — Y1 → A / Y2" line).
--
-- AC7 (X1 A) withholds from a reader whose own ground visit on the claim is pending every staff free-text note they did
-- ⛔ not write themselves — but the visit's `notes_ciphertext` is ONE column the scheduler writes (the briefing) and
-- the findings / completion / refusal writers OVERWRITE, and a photo carried ⛔ uploader, so ⛔ author could be told and
-- the inspector's OWN findings note and captions were withheld from them too. Two nullable, non-PII actor ids:
--   · claim_ground_inspections.notes_author_actor_id — the actor who last WROTE `notes_ciphertext` (schedule /
--     reschedule: the scheduler; findings / complete / refusal: the acting actor, the override holder when used),
--     stored through the domain's ONE actor-id normaliser (`normalizeActorId`: trimmed, lower-cased);
--   · claim_ground_inspection_photos.uploaded_by_actor_id — the actor who added the photo (its caption's author).
-- A CHECK on each: present ⇒ non-blank. ⛔ No backfill: a pre-0159 row stays NULL and its note / caption stays
-- withheld from a hidden reader (fail CLOSED — [[feedback_record_unattested_no_backfill]]; test databases only, ⛔ not in
-- production). ⛔ No new index (the columns are read with their row). Table grants and RLS (`0055`) already cover them.
-- Hand-authored — ⛔ never regenerate.

ALTER TABLE "claim_ground_inspections" ADD COLUMN "notes_author_actor_id" text;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_notes_author_check" CHECK (
  "notes_author_actor_id" IS NULL OR length(btrim("notes_author_actor_id")) > 0
);--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" ADD COLUMN "uploaded_by_actor_id" text;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" ADD CONSTRAINT "claim_ground_inspection_photos_uploaded_by_check" CHECK (
  "uploaded_by_actor_id" IS NULL OR length(btrim("uploaded_by_actor_id")) > 0
);
