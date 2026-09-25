// The District Admin's DEATH-CERTIFICATE REVIEW writer — Story 6.21a (Task 2; D1, D3, D4, D5, D14; AC1,
// AC2). Transport-free.
//
// `2026-09-20-235` Y: *"if no date is mentioned on death certificate then certificate is rejected, only
// certificate with clear date is acceptable."* `2026-09-20-236` BB: *"family will be asked to produce
// certificate with clear date without the claim being denied."* The District Admin reads the certificate
// and either ACCEPTS it — entering the date of death THEMSELVES (the system ⛔ never supplies it,
// invariant 1) — or REJECTS it with one of three reasons. Either way a note is REQUIRED. This writer
// VALIDATES and RECORDS; it ⛔ never decides, and it ⛔ never turns an accept into a reject (D4).
//
// ── The order (Task 2) ───────────────────────────────────────────────────────────────────────────────
//   (0) the SHAPE — display, note, verdict ⇔ date ⇔ reason, a real date: refused before any read;
//   (1) the claim-row `FOR UPDATE` lock — serializes this with the OCR job (which locks the same row
//       before moving "current", D2) and with every other claim write;
//   (2) the WINDOW (D3 — 6.20's determination window, reused);
//   (3) the TOKEN — the current upload must exist and be the one the District Admin looked at;
//   (4) the SUPERSESSION guard — the live review must be the one they saw;
//   (5) D4 — an accepted date must not be in the future (IST, against the injected `now`);
//   (6) supersede the live review (`re_reviewed` if it judged the current upload, `replaced` if an older
//       one), insert the new review, and emit `claim.death_certificate_reviewed` — ONE transaction.
//
// ⛔ A REJECTION IS NOT A DENIAL (invariant 2): ⛔ no lifecycle state moves, ⛔ no row in
// `claim_verifier_decisions` / the trustee / the R9 tables (invariant 6 — `getOriginalDeciderActorIds`
// would bar the District Admin from appeal review). The claim WAITS at the approval gate.
// ⛔ PII: the accepted date and the note arrive ALREADY ENCRYPTED (the handler encrypts under the Pariwar
// context); the plaintext date is used for validation only and ⛔ never persisted, logged or put in the
// event. ⛔ No `decrypt` in this file (the no-comparison fence, T5/T9).
// ⛔ D14 — the certificate token is a CURRENCY token, ⛔ not a credential: plain `===` on lower-cased ids,
// and ⛔ no constant-time comparator (the access-wrapper gate reads one as a verification context, T6).

import { and, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import { istDateOf } from '../cycle-calendar/holiday-resolver.js';
import type { ClaimId, DeathCertificateReviewId, DeathCertificateUploadId, PariwarId } from '../ids/index.js';
import {
  type DeathCertificateRejectionReason,
  type DeathCertificateReviewSupersessionReason,
  type DeathCertificateReviewVerdict,
  DEATH_CERTIFICATE_REJECTION_REASONS,
  claimDeathCertificateReviews,
} from '../schema/claim_death_certificate_reviews.js';
import { claims } from '../schema/claims.js';
import { readDeathCertificateSnapshot } from './death-certificate-approval.js';
import { DeathCertificateReviewRefusedError } from './errors.js';
import type { ClaimEventActor } from './events.js';
import { NOMINEE_DETERMINATION_RECORDABLE_STATES, isRealCalendarDate } from './nominee-determination-persist.js';
import { projectClaimState } from './project.js';

/**
 * D3 — the states in which a certificate may be reviewed: ⭐ 6.20's determination window, REUSED (⛔ never
 * copied). The review supplies the determination's cutoff, so it is only useful where a determination can
 * still follow it.
 */
export const DEATH_CERTIFICATE_REVIEWABLE_STATES = NOMINEE_DETERMINATION_RECORDABLE_STATES;

export interface RecordDeathCertificateReviewInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  readonly verdict: DeathCertificateReviewVerdict;
  /** The upload the District Admin looked at (the console's `certificateToken`). */
  readonly certificateToken: string;
  /** ACCEPT only — the PLAINTEXT date of death (`YYYY-MM-DD`) the District Admin entered. Validation only. */
  readonly acceptedDate: string | null;
  /** ACCEPT only — the same date, Tier-1-encrypted by the handler. */
  readonly acceptedDateCiphertext: string | null;
  /** REJECT only — one of the three reasons. */
  readonly rejectionReason: DeathCertificateRejectionReason | null;
  /** The REQUIRED note, Tier-1-encrypted by the handler (the handler refuses an empty note first). */
  readonly noteCiphertext: string;
  /** The live review the District Admin saw (`null` when there was none) — the supersession guard. */
  readonly expectedLiveReviewId: string | null;
  readonly actorId: string;
  /** Snapshotted server-side by the caller — ⛔ never email-derived, ⛔ never from the request. */
  readonly actorDisplay: string;
  readonly actor: ClaimEventActor;
  readonly auditId?: string;
  /** D4's clock — INJECTED. The route passes none (the wall clock); the fixtures pass a later one. */
  readonly now?: Date;
}

export interface RecordDeathCertificateReviewResult {
  readonly reviewId: DeathCertificateReviewId;
  /** The CURRENT upload the review was recorded against — server-confirmed (D14's token match), ⛔ not the
   * client-supplied `certificate_token` echoed back: this is what the caller should audit. */
  readonly uploadId: DeathCertificateUploadId;
  readonly verdict: DeathCertificateReviewVerdict;
  readonly supersededReviewId: DeathCertificateReviewId | null;
  readonly supersessionReason: DeathCertificateReviewSupersessionReason | null;
  readonly eventVersion: number;
}

/**
 * Record the District Admin's accept / reject review of the claim's current death certificate. See the
 * header for the order of every guard.
 *
 * @throws DeathCertificateReviewRefusedError (→ 409; `not_found` → 404)
 */
export async function recordDeathCertificateReview(
  client: pg.PoolClient,
  input: RecordDeathCertificateReviewInput,
): Promise<RecordDeathCertificateReviewResult> {
  const refuse = (reason: ConstructorParameters<typeof DeathCertificateReviewRefusedError>[1], detail: string) =>
    new DeathCertificateReviewRefusedError(input.claimCaseId, reason, detail);

  // (0) The shape.
  if (input.actorDisplay.trim() === '') {
    throw refuse('missing_display', 'a review is attributed to a named District Admin or not recorded');
  }
  // Plaintext non-emptiness is the contract's boundary check — this catches a caller that forgot to encrypt.
  if (input.noteCiphertext.trim() === '') throw refuse('missing_note', 'a note is required');
  if (input.verdict === 'accepted') {
    if (input.rejectionReason !== null) throw refuse('reason_on_accept', 'an accepted certificate carries no rejection reason');
    if (input.acceptedDate === null || input.acceptedDateCiphertext === null || !isRealCalendarDate(input.acceptedDate)) {
      throw refuse('invalid_date', 'accepting a certificate needs the real YYYY-MM-DD date of death read off it');
    }
  } else {
    if (input.acceptedDate !== null || input.acceptedDateCiphertext !== null) {
      throw refuse('date_on_reject', 'a rejected certificate carries no accepted date');
    }
    if (
      input.rejectionReason === null ||
      !(DEATH_CERTIFICATE_REJECTION_REASONS as readonly string[]).includes(input.rejectionReason)
    ) {
      throw refuse('missing_reason', 'rejecting a certificate needs one of the three reasons');
    }
  }

  const db = bindScopedDb(client);
  // Ids are lower-cased: the contract's `z.string().uuid()` is unbranded, and stored ids are lower-case.
  const token = input.certificateToken.toLowerCase();
  const expectedLiveId = input.expectedLiveReviewId?.toLowerCase() ?? null;

  // (1) The claim-row lock.
  const [claimRow] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .for('update');
  if (!claimRow) throw refuse('not_found', 'no such claim in this Pariwar');
  const state = claimRow.currentState as string;

  // (2) The window (D3).
  if (!(DEATH_CERTIFICATE_REVIEWABLE_STATES as readonly string[]).includes(state)) {
    throw refuse('not_reviewable', `a death certificate cannot be reviewed while the claim is '${state}'`);
  }

  // (3) The token — the current certificate must have an upload row (T12), and be the one looked at.
  const snapshot = await readDeathCertificateSnapshot(db, input.pariwarId, input.claimCaseId);
  if (snapshot.currentUploadId === null) {
    throw refuse('no_certificate', 'the claim has no current death certificate that can be reviewed');
  }
  if ((snapshot.currentUploadId as string).toLowerCase() !== token) {
    throw refuse('stale_certificate', 'a newer death certificate arrived after this one was opened — open it again');
  }

  // (4) The supersession guard.
  const live = snapshot.liveReview;
  const liveId = (live?.reviewId as string | undefined)?.toLowerCase() ?? null;
  if (liveId !== expectedLiveId) {
    throw refuse('stale_supersession', 'the review changed after the certificate was opened');
  }

  // (5) D4 — a date after today (IST) cannot be a date of death. ⛔ Never converted into a rejection: the
  // District Admin rejects with `date_of_death_in_future` themselves.
  if (input.verdict === 'accepted' && input.acceptedDate! > istDateOf(input.now ?? new Date())) {
    throw refuse('accept_future_date', 'the date of death is after today — reject the certificate instead');
  }

  // (6) Supersede the live review, insert the new one, emit the identity annotation.
  let supersessionReason: DeathCertificateReviewSupersessionReason | null = null;
  if (live !== null) {
    // `re_reviewed` — the live review judged the CURRENT upload; `replaced` — it judged an older one.
    supersessionReason = snapshot.currentReview !== null ? 're_reviewed' : 'replaced';
    const superseded = await db
      .update(claimDeathCertificateReviews)
      .set({ supersededAt: sql`now()`, supersededReason: supersessionReason })
      .where(
        and(
          eq(claimDeathCertificateReviews.pariwarId, input.pariwarId),
          eq(claimDeathCertificateReviews.reviewId, live.reviewId),
          isNull(claimDeathCertificateReviews.supersededAt),
        ),
      )
      .returning({ id: claimDeathCertificateReviews.reviewId });
    if (superseded.length === 0) throw refuse('stale_supersession', 'the live review was superseded concurrently');
  }

  const [row] = await db
    .insert(claimDeathCertificateReviews)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: claimRow.deceasedMemberId,
      uploadId: snapshot.currentUploadId,
      verdict: input.verdict,
      rejectionReason: input.verdict === 'rejected' ? input.rejectionReason : null,
      acceptedDateCiphertext: input.verdict === 'accepted' ? input.acceptedDateCiphertext : null,
      noteCiphertext: input.noteCiphertext,
      decidedByActorId: input.actorId,
      decidedByDisplay: input.actorDisplay,
      supersedesReviewId: live?.reviewId ?? null,
    })
    .returning({ reviewId: claimDeathCertificateReviews.reviewId });
  const reviewId = row!.reviewId;

  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.death_certificate_reviewed',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'death_certificate_review',
      actor: input.actor,
      review_id: reviewId,
      upload_id: snapshot.currentUploadId,
      verdict: input.verdict,
      rejection_reason: input.verdict === 'rejected' ? input.rejectionReason : null,
      supersedes_review_id: live?.reviewId ?? null,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return {
    reviewId,
    uploadId: snapshot.currentUploadId!,
    verdict: input.verdict,
    supersededReviewId: live?.reviewId ?? null,
    supersessionReason,
    eventVersion: projected.eventVersion,
  };
}
