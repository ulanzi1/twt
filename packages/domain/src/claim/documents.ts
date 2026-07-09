// claim_documents read accessors — Story 6.5 (Task 2).
//
// TENANT-scoped, transport-free PRIMITIVES (the `getMemberKycProfile` precedent): NO HTTP,
// NO audit, NO event emission, NO decryption, NO signed-URL minting. The accessor returns
// the row(s) with the Tier-1 ciphertext columns AS STORED; the route/job decrypts the
// extracted-field envelopes under the request/job encryption context, and the route mints
// the short-lived signed URL from `storage_object_key`. Takes an explicit `pariwarId` for
// defense-in-depth alongside RLS (the kyc/claims accessor precedent).

import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimDocumentId, ClaimId, PariwarId } from '../ids/index.js';
import { getMemberKycProfile } from '../kyc/profile-read.js';
import type { MemberKycProfileRow } from '../schema/member_kyc_profiles.js';
import { type ClaimRow, claims } from '../schema/claims.js';
import {
  type ClaimDocumentRow,
  type ClaimDocumentType,
  claimDocuments,
} from '../schema/claim_documents.js';

/**
 * All documents uploaded against a claim (the verifier read model backing — Story 6.10
 * consumes it). Ordered by `created_at` for a stable list. Tenant-scoped (RLS + the explicit
 * predicate — a cross-tenant `claimCaseId` guess resolves to an empty list). Ciphertext AS
 * STORED (the caller decrypts).
 */
export async function getClaimDocuments(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimDocumentRow[]> {
  return db
    .select()
    .from(claimDocuments)
    .where(and(eq(claimDocuments.pariwarId, pariwarId), eq(claimDocuments.claimCaseId, claimCaseId)))
    .orderBy(asc(claimDocuments.createdAt));
}

/**
 * A single claim document by its id (the `<DocumentPreview>` / signed-URL read path). Returns
 * null when no row exists for the id in the Pariwar. Tenant-scoped; ciphertext AS STORED.
 */
export async function getClaimDocumentById(
  db: Db,
  pariwarId: PariwarId,
  claimDocumentId: ClaimDocumentId,
): Promise<ClaimDocumentRow | null> {
  const rows = await db
    .select()
    .from(claimDocuments)
    .where(
      and(
        eq(claimDocuments.pariwarId, pariwarId),
        eq(claimDocuments.claimDocumentId, claimDocumentId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The existing document row for a (claim, document_type), if any — the OCR job's idempotency
 * probe (AC4): a retried job reads this first and upserts the SAME row rather than
 * accumulating a duplicate. Tenant-scoped; ciphertext AS STORED.
 */
export async function getClaimDocumentByType(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  documentType: ClaimDocumentType,
): Promise<ClaimDocumentRow | null> {
  const rows = await db
    .select()
    .from(claimDocuments)
    .where(
      and(
        eq(claimDocuments.pariwarId, pariwarId),
        eq(claimDocuments.claimCaseId, claimCaseId),
        eq(claimDocuments.documentType, documentType),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The side-by-side verifier read model (AC5) — the ONE compound read backing the verifier console's
 * document-review panel (Story 6.10 consumes it; 6.5 ships the accessor + the `<VerifierReviewPanel>`
 * / `<DocumentPreview>` components). Bundles, in a small fixed number of reads (NO N+1 — the deceased
 * member is shared across all of a claim's documents, so their KYC profile is read ONCE):
 *   · the claim row (for the deceased member id + current state),
 *   · the claim's documents (parity outcome/flags/confidence + the extracted-field ciphertext),
 *   · the deceased member's KYC profile (name/DoB ciphertext) — the comparison source.
 * All PII columns are AS STORED (ciphertext); the route/console decrypts under its own encryption
 * context + mints the signed preview URL from each `storage_object_key`. Tenant-scoped (RLS + the
 * explicit predicates). Returns `null` when the claim does not exist in the Pariwar.
 */
export interface ClaimDocumentReview {
  claim: ClaimRow;
  documents: ClaimDocumentRow[];
  /** The deceased member's KYC profile (ciphertext AS STORED), or null when none is on file. */
  deceasedKyc: MemberKycProfileRow | null;
}

export async function getClaimDocumentReview(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimDocumentReview | null> {
  const claimRows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  const claim = claimRows[0];
  if (!claim) return null;

  const documents = await getClaimDocuments(db, pariwarId, claimCaseId);
  const deceasedKyc = await getMemberKycProfile(db, pariwarId, claim.deceasedMemberId);
  return { claim, documents, deceasedKyc };
}
