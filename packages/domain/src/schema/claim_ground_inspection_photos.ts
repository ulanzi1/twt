// `claim_ground_inspection_photos` — the ground-inspection photo child table (Story 6.7, Task 3; AC3).
//
// ONE row per uploaded photo, MANY per assignment (Decision D2 — NOT a `claim_documents` row:
// that table's UNIQUE (claim_case_id, document_type) caps it at one and its NOT NULL OCR/parity
// columns are the wrong shape). The photo BYTES live in object storage via the reusable Story 6.5
// `ClaimDocumentStorage` port; THIS table persists only the opaque object key + non-PII object
// metadata + the (nullable, encrypted) caption. NEVER the bytes; access is a short-lived signed
// URL minted from the key (never a public URL).
//
// The max-photo-count per assignment (20, a named const in ground-inspection-persist.ts) is
// enforced in the writer UNDER the parent-assignment row lock (a route-level pre-check would race,
// #7), not by a DB constraint here. ⭐ `2026-10-07-286` H2: at the cap, an `original_certificate` photo is
// still admitted while the assignment holds none stamped with the claim's CURRENT upload — the hard bound
// is 20 + one per certificate made current during the assignment.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
//   · caption_ciphertext (free-text — can name a person/place) → Tier-1 envelope ciphertext
//     (`piiColumn(1, 'ground_inspection')`), nullable. Encrypt-before-insert; ciphertext AS STORED.
//   · storage_object_key / content_type / byte_size → NON-PII (opaque key + object metadata).
//
// TENANT-ISOLATED (RLS predicate `pariwar_id`, the claims-rls construct). RLS in the SAME policy
// file as the parent (policies/claim-ground-inspections-rls.ts).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { DeathCertificateUploadId, GroundInspectionId, GroundInspectionPhotoId, PariwarId } from '../ids/index.js';
import { claimDeathCertificateUploads } from './claim_death_certificate_uploads.js';
import { claimGroundInspections } from './claim_ground_inspections.js';

/** Story 6.26a (GI4, migration 0147; `-263` FQ11 A) — what a photo shows: the site (default — every pre-6.26 photo)
 *  or the ORIGINAL death certificate the inspector held. Every completion needs ≥1 `original_certificate` photo
 *  STAMPED with the compared upload (`-286` H1 — `certificateUploadId`); the ≥1-photo rule counts every kind, and the
 *  cap of 20 keeps one reserved slot for the original's photo (`-286` H2). Non-PII. */
export const GROUND_INSPECTION_PHOTO_KINDS = ['site', 'original_certificate'] as const;
export const groundInspectionPhotoKindEnum = pgEnum('ground_inspection_photo_kind', GROUND_INSPECTION_PHOTO_KINDS);
export type GroundInspectionPhotoKind = (typeof GROUND_INSPECTION_PHOTO_KINDS)[number];

export const claimGroundInspectionPhotos = pgTable(
  'claim_ground_inspection_photos',
  {
    // Per-photo id (server-side gen_random_uuid()). Branded GroundInspectionPhotoId.
    photoId: uuid('photo_id').defaultRandom().primaryKey().$type<GroundInspectionPhotoId>(),

    // The assignment this photo belongs to. FK → claim_ground_inspections (cascade: deleting an
    // assignment sweeps its photos; deleting the claim cascades to the assignment, then here).
    groundInspectionId: uuid('ground_inspection_id')
      .notNull()
      .$type<GroundInspectionId>()
      .references(() => claimGroundInspections.groundInspectionId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded) — same construct as the parent so a
    // cross-tenant reader sees nothing on EITHER table.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The object-storage key (non-PII opaque path, namespaced by pariwar/claim/inspection/photo).
    // NOT the bytes; access is a short-lived signed URL minted from this key.
    storageObjectKey: text('storage_object_key').notNull(),

    // Non-PII object metadata.
    contentType: text('content_type').notNull(),
    byteSize: integer('byte_size').notNull(),

    // Operator free-text caption — CAN name a person/place → Tier-1 ciphertext, nullable (#11).
    captionCiphertext: piiColumn(1, 'ground_inspection')('caption_ciphertext'),

    // Story 6.26a (GI4) — site | original_certificate. NOT NULL DEFAULT 'site'.
    photoKind: groundInspectionPhotoKindEnum('photo_kind').notNull().default('site'),

    // ⭐ `2026-10-07-286` H1 (migration 0148) — on an `original_certificate` photo, the claim's CURRENT death-certificate
    // upload when it was added (the ONE current-upload rule); NULL on a `site` photo (CHECK) and on an original taken
    // while the claim had no current certificate. Completion counts only originals stamped with the COMPARED upload.
    // FK ON DELETE NO ACTION (0147's posture). Non-PII.
    certificateUploadId: uuid('certificate_upload_id')
      .$type<DeathCertificateUploadId>()
      .references(() => claimDeathCertificateUploads.uploadId, { onDelete: 'no action' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The read accessor joins photos by assignment; per-tenant RLS-aware planner hint.
    index('claim_ground_inspection_photos_ground_inspection_id_idx').on(t.groundInspectionId),
    index('claim_ground_inspection_photos_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type ClaimGroundInspectionPhotoRow = typeof claimGroundInspectionPhotos.$inferSelect;
export type ClaimGroundInspectionPhotoInsert = typeof claimGroundInspectionPhotos.$inferInsert;
