// Ground-inspection read accessor — Story 6.7 (Task 4; AC5). Transport-free.
//
// `getClaimGroundInspection` is the surface the Story 6.10 verifier console consumes (Decision
// D4 — 6.7 ships the accessor, 6.10 builds the mount). It returns every assignment for a claim
// (scheduled / completed / superseded / photo_refused / evidence_unavailable) + each assignment's
// photo rows. Ciphertext is returned AS STORED and object keys AS STORED — the ROUTE decrypts
// under its own encryption context + mints short-lived signed URLs from the keys (the
// getClaimDocuments / getClaimDocumentReview precedent — the accessor never decrypts or signs).
//
// ABSENCE IS A SIGNAL (AC5): a claim with NO inspection returns `[]` — a null/empty read is NOT
// neutral, it is the first-class "no ground-inspection signal yet" the verifier must acknowledge.
//
// Tenant-scoped by RLS + the explicit `pariwar_id` predicate (a cross-tenant claim_case_id /
// ground_inspection_id guess resolves to empty, never another Pariwar's data).

import { and, asc, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, GroundInspectionId, PariwarId } from '../ids/index.js';
import {
  type ClaimGroundInspectionRow,
  claimGroundInspections,
} from '../schema/claim_ground_inspections.js';
import {
  type ClaimGroundInspectionPhotoRow,
  claimGroundInspectionPhotos,
} from '../schema/claim_ground_inspection_photos.js';

/** One assignment + its photos (ciphertext + object keys AS STORED — the route decrypts + signs). */
export interface ClaimGroundInspectionWithPhotos {
  inspection: ClaimGroundInspectionRow;
  photos: ClaimGroundInspectionPhotoRow[];
}

/**
 * All ground-inspection assignments (with their photos) for a claim, oldest-first. Returns `[]`
 * when the claim has no inspection (the AC5 absence signal). Tenant-scoped.
 */
export async function getClaimGroundInspection(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimGroundInspectionWithPhotos[]> {
  const inspections = await db
    .select()
    .from(claimGroundInspections)
    .where(
      and(
        eq(claimGroundInspections.pariwarId, pariwarId),
        eq(claimGroundInspections.claimCaseId, claimCaseId),
      ),
    )
    .orderBy(asc(claimGroundInspections.createdAt));

  if (inspections.length === 0) return [];

  const inspectionIds = inspections.map((i) => i.groundInspectionId);
  const photos = await db
    .select()
    .from(claimGroundInspectionPhotos)
    .where(
      and(
        eq(claimGroundInspectionPhotos.pariwarId, pariwarId),
        inArray(claimGroundInspectionPhotos.groundInspectionId, inspectionIds),
      ),
    )
    .orderBy(asc(claimGroundInspectionPhotos.createdAt));

  const photosByInspection = new Map<string, ClaimGroundInspectionPhotoRow[]>();
  for (const photo of photos) {
    const bucket = photosByInspection.get(photo.groundInspectionId);
    if (bucket) bucket.push(photo);
    else photosByInspection.set(photo.groundInspectionId, [photo]);
  }

  return inspections.map((inspection) => ({
    inspection,
    photos: photosByInspection.get(inspection.groundInspectionId) ?? [],
  }));
}

/**
 * A single assignment (with photos) by id, tenant-scoped — the point read the route uses to
 * resolve the assignment's `district` for the D6 permission gate + the inspector guard. Returns
 * `null` when no such assignment exists in this Pariwar.
 */
export async function getGroundInspectionById(
  db: Db,
  pariwarId: PariwarId,
  groundInspectionId: GroundInspectionId,
): Promise<ClaimGroundInspectionWithPhotos | null> {
  const rows = await db
    .select()
    .from(claimGroundInspections)
    .where(
      and(
        eq(claimGroundInspections.pariwarId, pariwarId),
        eq(claimGroundInspections.groundInspectionId, groundInspectionId),
      ),
    )
    .limit(1);
  const inspection = rows[0];
  if (!inspection) return null;

  const photos = await db
    .select()
    .from(claimGroundInspectionPhotos)
    .where(
      and(
        eq(claimGroundInspectionPhotos.pariwarId, pariwarId),
        eq(claimGroundInspectionPhotos.groundInspectionId, groundInspectionId),
      ),
    )
    .orderBy(asc(claimGroundInspectionPhotos.createdAt));

  return { inspection, photos };
}
