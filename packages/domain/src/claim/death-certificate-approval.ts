// The death certificate's CURRENT STATE and its APPROVAL CONJUNCT — Story 6.21a (D2, D6, D7, D16).
// Transport-free.
//
// `2026-09-20-235` Y: *"if no date is mentioned on death certificate then certificate is rejected, only
// certificate with clear date is acceptable."* `2026-09-20-236` BB: *"family will be asked to produce
// certificate with clear date without the claim being denied."* ⇒ a claim is approvable only with a
// CURRENT, ACCEPTED certificate; a missing, unreviewed or rejected one makes the claim WAIT (a typed
// 409), ⛔ never a denial.
//
// ⭐⭐ A LEAF, AND IT MUST STAY ONE (T8). `nominee-name-check.ts` imports this module (the outer approval
// helper runs the conjunct first), and `nominee-determination-persist.ts` imports `nominee-name-check.ts`
// and evaluates a constant from it at module load. So if THIS module imported the determination writer —
// or anything that does — the graph would close into a runtime init cycle the typecheck cannot see
// ([[project_type_only_import_cycle_trap]]). ⛔ Import ONLY schema tables, ids (types), `errors.ts` and the
// import-free `review-window.ts`.
// ⛔ And ⛔ no `decrypt` here (the no-comparison fence, T5/T9): this module reads ids, verdicts and reason
// codes — never a ciphertext.
//
// ── The vocabulary ─────────────────────────────────────────────────────────────────────────────────
//   · The CURRENT certificate is the upload whose `storage_object_key` equals the `claim_documents` row's
//     key (D2). A legacy row with ⛔ no upload row has no current upload (T12): no token, never reviewable.
//   · A review is CURRENT iff it is LIVE (`superseded_at IS NULL`) AND it judged the current upload. A live
//     review of an OLDER upload (a replacement arrived since) is ⛔ not current — the new certificate is
//     `awaiting_review` until the District Admin judges it.

import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type {
  ClaimDocumentId,
  ClaimId,
  DeathCertificateReviewId,
  DeathCertificateUploadId,
  PariwarId,
} from '../ids/index.js';
import type {
  DeathCertificateRejectionReason,
  DeathCertificateReviewVerdict,
} from '../schema/claim_death_certificate_reviews.js';
import { claims } from '../schema/claims.js';
import { nomineeDeterminations } from '../schema/nominee_determinations.js';
import { DeathCertificateAcceptanceRequiredError } from './errors.js';
import { CLAIM_REVIEW_WINDOW_STATES } from './review-window.js';

/** The live review of a claim's death certificate, as read (⛔ no ciphertext). */
export interface LiveDeathCertificateReview {
  readonly reviewId: DeathCertificateReviewId;
  readonly uploadId: DeathCertificateUploadId;
  readonly verdict: DeathCertificateReviewVerdict;
  readonly rejectionReason: DeathCertificateRejectionReason | null;
  readonly decidedByDisplay: string;
  readonly decidedAt: Date;
}

/** Everything the gates and surfaces need about a claim's death certificate, from ONE read. */
export interface DeathCertificateSnapshot {
  /** A `death_certificate` row exists on `claim_documents`. */
  readonly certificateRowExists: boolean;
  readonly claimDocumentId: ClaimDocumentId | null;
  /** The CURRENT upload — `null` when there is no row, or a legacy row with no upload row (T12). */
  readonly currentUploadId: DeathCertificateUploadId | null;
  /** The claim's LIVE review, current or not. */
  readonly liveReview: LiveDeathCertificateReview | null;
  /** The live review iff it judged the current upload; otherwise `null`. */
  readonly currentReview: LiveDeathCertificateReview | null;
}

/**
 * The certificate's status — ⭐ ONE definition every gate and surface derives from:
 *   · `missing`         — no `death_certificate` row at all;
 *   · `awaiting_review` — a row exists but has ⛔ no live CURRENT review;
 *   · `accepted`        — the current review accepted it;
 *   · `rejected`        — the current review rejected it: the family is asked for another.
 */
export type DeathCertificateStatus = 'missing' | 'awaiting_review' | 'accepted' | 'rejected';

/**
 * Read a claim's death-certificate snapshot in ONE statement: the `claim_documents` row, the upload whose key
 * is the row's key (the CURRENT certificate), and the claim's live review. RLS-scoped with the explicit
 * `pariwar_id` predicate on every table. ⛔ No ciphertext.
 */
export async function readDeathCertificateSnapshot(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<DeathCertificateSnapshot> {
  const result = await db.execute<{
    claim_document_id: string | null;
    current_upload_id: string | null;
    review_id: string | null;
    review_upload_id: string | null;
    verdict: DeathCertificateReviewVerdict | null;
    rejection_reason: DeathCertificateRejectionReason | null;
    decided_by_display: string | null;
    decided_at: string | Date | null;
  }>(sql`
    SELECT cd.claim_document_id,
           u.upload_id  AS current_upload_id,
           r.review_id,
           r.upload_id  AS review_upload_id,
           r.verdict,
           r.rejection_reason,
           r.decided_by_display,
           r.decided_at
      FROM (SELECT ${pariwarId}::uuid AS pariwar_id, ${claimCaseId}::uuid AS claim_case_id) k
      LEFT JOIN claim_documents cd
        ON cd.pariwar_id = k.pariwar_id
       AND cd.claim_case_id = k.claim_case_id
       AND cd.document_type = 'death_certificate'
      LEFT JOIN claim_death_certificate_uploads u
        ON u.pariwar_id = cd.pariwar_id
       AND u.claim_case_id = cd.claim_case_id
       AND u.storage_object_key = cd.storage_object_key
      LEFT JOIN claim_death_certificate_reviews r
        ON r.pariwar_id = k.pariwar_id
       AND r.claim_case_id = k.claim_case_id
       AND r.superseded_at IS NULL
  `);
  const rows = result.rows ?? [];
  // Invariant (enforced by a partial unique index, not by this query): at most one LIVE review per claim.
  // A violation would make this join return one row per extra live review — take the first, but never
  // silently: a caller relying on this snapshot would otherwise see an arbitrary review as "the" live one.
  if (rows.length > 1) {
    throw new Error(
      `death-certificate: expected at most one live review for claim ${claimCaseId}, got ${rows.length}`,
    );
  }
  const row = rows[0];
  const liveReview: LiveDeathCertificateReview | null =
    row?.review_id != null
      ? {
          reviewId: row.review_id as DeathCertificateReviewId,
          uploadId: row.review_upload_id as DeathCertificateUploadId,
          verdict: row.verdict!,
          rejectionReason: row.rejection_reason,
          decidedByDisplay: row.decided_by_display!,
          decidedAt: new Date(row.decided_at!),
        }
      : null;
  const currentUploadId = (row?.current_upload_id ?? null) as DeathCertificateUploadId | null;
  return {
    certificateRowExists: row?.claim_document_id != null,
    claimDocumentId: (row?.claim_document_id ?? null) as ClaimDocumentId | null,
    currentUploadId,
    liveReview,
    currentReview:
      liveReview !== null && currentUploadId !== null && liveReview.uploadId === currentUploadId ? liveReview : null,
  };
}

/** The status of a snapshot (see `DeathCertificateStatus`). Pure. */
export function deathCertificateStatus(snapshot: DeathCertificateSnapshot): DeathCertificateStatus {
  // A legacy row (T12: no upload row) has no current upload and so no token — it can ⛔ never be reviewed,
  // the same as no row at all. Treating it as `awaiting_review` would tell the family to wait for a review
  // that structurally can never happen, AND (via `isDeathCertificateUploadAllowedInReviewWindow`) block the
  // fresh upload that is the only way out. `missing` matches the write path's own `no_certificate` refusal.
  if (!snapshot.certificateRowExists || snapshot.currentUploadId === null) return 'missing';
  if (snapshot.currentReview === null) return 'awaiting_review';
  return snapshot.currentReview.verdict === 'accepted' ? 'accepted' : 'rejected';
}

/** Is the claim in the review window (6.21a D3 = 6.20's determination window = 6.18's check window)? */
export function isInDeathCertificateReviewWindow(claimState: string): boolean {
  return (CLAIM_REVIEW_WINDOW_STATES as readonly string[]).includes(claimState);
}

/**
 * ⭐ D6's upload predicate, INSIDE the review window — the ONE definition the upload guard and 6.21b's
 * `replacementAllowed` share. A `death_certificate` may be sent when there is none (`missing`, T3(b)) or the
 * current one was turned back (`rejected`). Refused when it is `accepted` (BigDev 2026-09-25: an accepted
 * certificate blocks further uploads) or `awaiting_review` (⛔ no silent pile-up of unreviewed replacements).
 */
export function isDeathCertificateUploadAllowedInReviewWindow(status: DeathCertificateStatus): boolean {
  return status === 'missing' || status === 'rejected';
}

/**
 * ⭐ D16 — the trigger 6.19's CC1 reminder (and 6.21b's family surfaces) are built on: is the family being
 * ASKED FOR ANOTHER certificate right now? True iff the claim is in the review window AND its current
 * certificate was REJECTED. ⛔ A claim that has left the window (denied for another reason, approved,
 * settled) is ⛔ not chased. ⛔ It is never a deadline: the claim simply waits (`-236` CC1, default stands).
 */
export async function isDeathCertificateReplacementRequested(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<boolean> {
  const [claimRow] = await db
    .select({ currentState: claims.currentState })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)));
  if (!claimRow || !isInDeathCertificateReviewWindow(claimRow.currentState as string)) return false;
  const snapshot = await readDeathCertificateSnapshot(db, pariwarId, claimCaseId);
  return deathCertificateStatus(snapshot) === 'rejected';
}

/**
 * ⭐ D7 — THE APPROVAL CONJUNCT. A claim may be approved only with a CURRENT, ACCEPTED death certificate,
 * AND — when a nominee determination is live — only if that determination was made against THIS accepted
 * review (so its as-at-death cutoff is the admissible certificate's date, invariant 4).
 *
 * ⭐ With ⛔ NO live determination it PASSES: the inner helper's `NomineeDeterminationRequiredError` answers
 * for that claim, so the operator is told the one thing that is actually missing.
 * ⛔ A NULL `death_certificate_review_id` (a 0119-era determination) is `determination_stale`, ⛔ never a pass.
 *
 * ⚠ MUST run INSIDE the caller's transaction, AFTER the claim-row lock (the review writer and the OCR job
 * both lock the claim row first, so a certificate cannot move under an approval).
 * Called ONLY by `assertClaimApprovable` (`nominee-name-check.ts`) — ⛔ never by `isReturnedClaimResubmitted`
 * (T4).
 *
 * @throws DeathCertificateAcceptanceRequiredError (→ 409). ⛔ NOT a denial.
 */
export async function assertDeathCertificateAcceptedForApproval(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  const snapshot = await readDeathCertificateSnapshot(db, pariwarId, claimCaseId);
  const status = deathCertificateStatus(snapshot);
  if (status === 'missing') throw new DeathCertificateAcceptanceRequiredError(claimCaseId, 'no_certificate');
  if (status === 'awaiting_review') throw new DeathCertificateAcceptanceRequiredError(claimCaseId, 'not_reviewed');
  if (status === 'rejected') throw new DeathCertificateAcceptanceRequiredError(claimCaseId, 'rejected');

  if (await isDeathCertificateDeterminationStale(db, pariwarId, claimCaseId, snapshot)) {
    throw new DeathCertificateAcceptanceRequiredError(claimCaseId, 'determination_stale');
  }
}

/**
 * The `determination_stale` predicate ABOVE, as a pure read — read-only, ⛔ no lock (this is an advisory
 * read for the console's OWN pre-emptive gate, never an enforcement point; the transactional check above
 * is the ONLY thing that actually blocks an approval). `true` iff a live nominee determination exists and
 * was made against a DIFFERENT review than the claim's current one (a re-review or replacement arrived
 * since, or a 0119-era determination with no linked review at all).
 *
 * ⛔ `snapshot`'s status is the caller's job to have already checked `accepted` — with anything else this
 * always answers `false` (nothing to compare `-243`'s LIVE review against).
 */
export async function isDeathCertificateDeterminationStale(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  snapshot: DeathCertificateSnapshot,
): Promise<boolean> {
  if (deathCertificateStatus(snapshot) !== 'accepted') return false;
  const [determination] = await db
    .select({ reviewId: nomineeDeterminations.deathCertificateReviewId })
    .from(nomineeDeterminations)
    .where(
      and(
        eq(nomineeDeterminations.pariwarId, pariwarId),
        eq(nomineeDeterminations.claimCaseId, claimCaseId),
        isNull(nomineeDeterminations.supersededAt),
      ),
    );
  if (!determination) return false;
  // D14 — an id is a currency token, ⛔ not a credential: plain `===` on lower-cased ids (T6).
  const linked = (determination.reviewId as string | null)?.toLowerCase() ?? null;
  return linked === null || linked !== (snapshot.currentReview!.reviewId as string).toLowerCase();
}
