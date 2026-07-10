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
// #7), not by a DB constraint here.
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

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { GroundInspectionId, GroundInspectionPhotoId, PariwarId } from '../ids/index.js';
import { claimGroundInspections } from './claim_ground_inspections.js';

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
