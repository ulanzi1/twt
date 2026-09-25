// The death-certificate REVIEW reads — Story 6.21a (Task 2; D8, D9, D10). Transport-free.
//
//   · `getCurrentAcceptedDeathCertificate` — the CURRENT, ACCEPTED review with its date CIPHERTEXT, for 6.20's
//     determination handler (D8: the handler decrypts and compares) and the timeline read (`accepted_certificate`).
//   · `listDeathCertificateHistory` — EVERY upload for a claim, newest first (including never-reviewed ones),
//     each with ALL its reviews (live and superseded) — the District Admin's on-demand history (D9).
//
// ⛔ No `decrypt` in the domain: every ciphertext is returned AS STORED, and the authorized, audited handler
// decrypts (6.20's decrypt-on-demand posture, T10). RLS-scoped plus the explicit `pariwar_id` predicate; every
// dynamic `.limit()` goes through `clampLimit` (T13).

import { and, desc, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, DeathCertificateReviewId, DeathCertificateUploadId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  type ClaimDeathCertificateReviewRow,
  claimDeathCertificateReviews,
} from '../schema/claim_death_certificate_reviews.js';
import {
  type DeathCertificateUploadChannel,
  claimDeathCertificateUploads,
} from '../schema/claim_death_certificate_uploads.js';
import { deathCertificateStatus, readDeathCertificateSnapshot } from './death-certificate-approval.js';

/** The current, accepted review — its id and its date AS STORED (Tier-1 ciphertext). */
export interface CurrentAcceptedDeathCertificate {
  readonly reviewId: DeathCertificateReviewId;
  readonly acceptedDateCiphertext: string;
}

/**
 * The claim's CURRENT, ACCEPTED death-certificate review, or `null` when the certificate is missing, awaiting
 * review or rejected. The date is ciphertext — the handler decrypts it.
 */
export async function getCurrentAcceptedDeathCertificate(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CurrentAcceptedDeathCertificate | null> {
  const snapshot = await readDeathCertificateSnapshot(db, pariwarId, claimCaseId);
  if (deathCertificateStatus(snapshot) !== 'accepted') return null;
  const reviewId = snapshot.currentReview!.reviewId;
  const [row] = await db
    .select({ acceptedDateCiphertext: claimDeathCertificateReviews.acceptedDateCiphertext })
    .from(claimDeathCertificateReviews)
    .where(
      and(
        eq(claimDeathCertificateReviews.pariwarId, pariwarId),
        eq(claimDeathCertificateReviews.reviewId, reviewId),
      ),
    );
  if (!row?.acceptedDateCiphertext) {
    // The DB CHECK only guarantees `IS NOT NULL`, not non-empty — an empty-string ciphertext on a review the
    // status derivation calls `accepted` is an anomaly, not the expected "no certificate" shape. Log it: the
    // caller still (correctly) treats it as "no readable date," but this should never happen silently.
    if (row) {
      console.warn(
        `death-certificate: review ${String(reviewId)} is ACCEPTED but its acceptedDateCiphertext is empty`,
      );
    }
    return null;
  }
  return { reviewId, acceptedDateCiphertext: row.acceptedDateCiphertext };
}

/** One upload in the history, with every review of it (newest first). Ciphertext AS STORED. */
export interface DeathCertificateHistoryUpload {
  readonly uploadId: DeathCertificateUploadId;
  readonly storageObjectKey: string;
  readonly contentType: string;
  readonly channel: DeathCertificateUploadChannel;
  readonly uploadedAt: Date;
  /** Is this upload the claim's CURRENT certificate? */
  readonly current: boolean;
  readonly reviews: readonly ClaimDeathCertificateReviewRow[];
}

/** The history read's result: the page, plus whether the claim has more uploads than the page held. */
export interface DeathCertificateHistoryPage {
  readonly uploads: DeathCertificateHistoryUpload[];
  /** `true` when the effective limit was hit — every certificate is kept forever (`-243`), so this is the
   * caller's only signal that older uploads exist beyond the page. */
  readonly truncated: boolean;
}

/** The history's default and hard cap on uploads (a family replaces a certificate a handful of times). */
export const DEATH_CERTIFICATE_HISTORY_DEFAULT_LIMIT = 50;
export const DEATH_CERTIFICATE_HISTORY_MAX_LIMIT = 100;

/**
 * EVERY uploaded death certificate for a claim, newest first — including never-reviewed ones — each with all
 * its reviews. Two statements, bounded. ⛔ No decryption.
 */
export async function listDeathCertificateHistory(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  opts: { readonly limit?: number } = {},
): Promise<DeathCertificateHistoryPage> {
  const snapshot = await readDeathCertificateSnapshot(db, pariwarId, claimCaseId);
  const uploads = await db
    .select()
    .from(claimDeathCertificateUploads)
    .where(
      and(
        eq(claimDeathCertificateUploads.pariwarId, pariwarId),
        eq(claimDeathCertificateUploads.claimCaseId, claimCaseId),
      ),
    )
    .orderBy(desc(claimDeathCertificateUploads.uploadedAt), desc(claimDeathCertificateUploads.uploadId))
    // T13 — the domain limit-clamp gate requires the clamp INLINE (a clamped variable reads as unclamped).
    .limit(
      clampLimit(opts.limit, { default: DEATH_CERTIFICATE_HISTORY_DEFAULT_LIMIT, cap: DEATH_CERTIFICATE_HISTORY_MAX_LIMIT }),
    );
  if (uploads.length === 0) return { uploads: [], truncated: false };
  // Existence probe for "is there at least one more upload beyond this page" — ⛔ NOT `uploads.length >=
  // effectiveLimit` (a false positive whenever the claim's upload count happens to equal the limit exactly).
  // `.offset(uploads.length).limit(1)` is exempt from the clamp gate (a fixed single-row bound).
  const beyond = await db
    .select({ uploadId: claimDeathCertificateUploads.uploadId })
    .from(claimDeathCertificateUploads)
    .where(
      and(
        eq(claimDeathCertificateUploads.pariwarId, pariwarId),
        eq(claimDeathCertificateUploads.claimCaseId, claimCaseId),
      ),
    )
    .orderBy(desc(claimDeathCertificateUploads.uploadedAt), desc(claimDeathCertificateUploads.uploadId))
    .offset(uploads.length)
    .limit(1);
  const truncated = beyond.length > 0;
  const reviews = await db
    .select()
    .from(claimDeathCertificateReviews)
    .where(
      and(
        eq(claimDeathCertificateReviews.pariwarId, pariwarId),
        inArray(
          claimDeathCertificateReviews.uploadId,
          uploads.map((u) => u.uploadId),
        ),
      ),
    )
    .orderBy(desc(claimDeathCertificateReviews.decidedAt));
  // ⭐ Newest first by the SUPERSESSION CHAIN, ⛔ not by `decided_at` alone: `decided_at` is `now()`, the
  // TRANSACTION clock, so two reviews written in one transaction tie. A claim's reviews form one chain
  // (`supersedes_review_id`), so walk it from each head (a review nothing supersedes).
  const byId = new Map(reviews.map((r) => [r.reviewId as string, r]));
  const supersededIds = new Set(reviews.map((r) => r.supersedesReviewId as string | null).filter((x) => x !== null));
  const position = new Map<string, number>();
  let next = 0;
  for (const head of reviews.filter((r) => !supersededIds.has(r.reviewId))) {
    for (let r: typeof head | undefined = head; r && !position.has(r.reviewId); ) {
      position.set(r.reviewId, next++);
      r = r.supersedesReviewId ? byId.get(r.supersedesReviewId) : undefined;
    }
  }
  reviews.sort((a, b) => (position.get(a.reviewId) ?? 0) - (position.get(b.reviewId) ?? 0));
  return {
    uploads: uploads.map((u) => ({
      uploadId: u.uploadId,
      storageObjectKey: u.storageObjectKey,
      contentType: u.contentType,
      channel: u.channel,
      uploadedAt: u.uploadedAt,
      current: snapshot.currentUploadId !== null && u.uploadId === snapshot.currentUploadId,
      reviews: reviews.filter((r) => r.uploadId === u.uploadId),
    })),
    truncated,
  };
}
