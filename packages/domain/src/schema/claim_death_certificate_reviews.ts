// `claim_death_certificate_reviews` — the District Admin's ACCEPT / REJECT verdict on one uploaded death
// certificate (Story 6.21a, Task 1; D1; AC1, AC2).
//
// `2026-09-20-235` Y: *"if no date is mentioned on death certificate then certificate is rejected, only
// certificate with clear date is acceptable."* `2026-09-20-236` BB: *"family will be asked to produce
// certificate with clear date without the claim being denied."* ⇒ the District Admin ACCEPTS a
// certificate by entering its date of death themselves (the system ⛔ never supplies it, invariant 1), or
// REJECTS it with one of three reasons. A rejection ⛔ never moves the lifecycle state (invariant 2).
//
// ⛔ A NEW TABLE, NOT `claim_verifier_decisions` / `claim_state_trustee_decisions` / the R9 tables
// (invariant 6): `getOriginalDeciderActorIds` unions actors from those three into the appeal
// reviewer-conflict set, so a review row there would bar the District Admin from reviewing an appeal.
//
// ── Shape ────────────────────────────────────────────────────────────────────────────────────────
//   · At most ONE LIVE review per claim (the partial-unique index `WHERE superseded_at IS NULL`).
//   · A review judges ONE upload (`upload_id`). It is CURRENT iff it is live AND its upload is the current
//     certificate (the upload whose key is `claim_documents.storage_object_key`).
//   · A new review supersedes the live one: `re_reviewed` when the live review judged the current upload,
//     `replaced` when it judged an older one. Supersession is ONE-WAY (the 0121 trigger, copied).
//
// ── PII discipline ───────────────────────────────────────────────────────────────────────────────
//   · accepted_date_ciphertext → Tier-1: the date of death the District Admin entered (`YYYY-MM-DD`),
//     accepted reviews only. Decrypted only in the authorized, audited history read and 6.20's timeline
//     read; ⛔ never in an event, a log line, an audit context or the console packet (T10).
//   · note_ciphertext → Tier-1, REQUIRED: the District Admin's reasoning.
//   · decided_by_display → controlled STAFF data, snapshotted at decision time, ⛔ never email-derived.
// Both ciphertext columns carry a column-level UPDATE grant for the DPDPA-RTBF scrub (D11).

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type {
  ClaimId,
  DeathCertificateReviewId,
  DeathCertificateUploadId,
  MemberId,
  PariwarId,
} from '../ids/index.js';
import { claimDeathCertificateUploads } from './claim_death_certificate_uploads.js';
import { claims } from './claims.js';

/** The District Admin's verdict. ⛔ No third value — they decide one way (`-235` Y). */
export const DEATH_CERTIFICATE_REVIEW_VERDICTS = ['accepted', 'rejected'] as const;
export type DeathCertificateReviewVerdict = (typeof DEATH_CERTIFICATE_REVIEW_VERDICTS)[number];

/**
 * Why a certificate was turned back. The three are the ONLY ways a date is not "clear": absent, unclear, or
 * impossible (a date after the day of review cannot be a date of death — BigDev 2026-09-25, reading (b)).
 */
export const DEATH_CERTIFICATE_REJECTION_REASONS = [
  'no_date_of_death',
  'date_of_death_unclear',
  'date_of_death_in_future',
] as const;
export type DeathCertificateRejectionReason = (typeof DEATH_CERTIFICATE_REJECTION_REASONS)[number];

/** Why a review stopped being live. */
export const DEATH_CERTIFICATE_REVIEW_SUPERSESSION_REASONS = ['re_reviewed', 'replaced'] as const;
export type DeathCertificateReviewSupersessionReason =
  (typeof DEATH_CERTIFICATE_REVIEW_SUPERSESSION_REASONS)[number];

export const claimDeathCertificateReviews = pgTable(
  'claim_death_certificate_reviews',
  {
    reviewId: uuid('review_id').defaultRandom().primaryKey().$type<DeathCertificateReviewId>(),

    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The deceased member (the `claims.deceased_member_id` cache — ⛔ no FK). The RTBF scrub keys on it.
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The certificate judged.
    uploadId: uuid('upload_id')
      .notNull()
      .$type<DeathCertificateUploadId>()
      .references(() => claimDeathCertificateUploads.uploadId, { onDelete: 'cascade' }),

    verdict: text('verdict').notNull().$type<DeathCertificateReviewVerdict>(),
    // Rejected only (the verdict-coherence CHECK).
    rejectionReason: text('rejection_reason').$type<DeathCertificateRejectionReason>(),

    // Tier-1 — the date of death the District Admin entered (`YYYY-MM-DD`). Accepted only.
    acceptedDateCiphertext: piiColumn(1, 'death_certificate_review')('accepted_date_ciphertext'),
    // Tier-1 — the REQUIRED note.
    noteCiphertext: piiColumn(1, 'death_certificate_review')('note_ciphertext').notNull(),

    decidedByActorId: text('decided_by_actor_id').notNull(),
    decidedByDisplay: text('decided_by_display').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // NULL = the LIVE review for this claim.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
    supersededReason: text('superseded_reason').$type<DeathCertificateReviewSupersessionReason>(),

    // The live review this one replaced (null on a first review). Self-FK.
    supersedesReviewId: uuid('supersedes_review_id')
      .$type<DeathCertificateReviewId>()
      .references((): AnyPgColumn => claimDeathCertificateReviews.reviewId),
  },
  (t) => [
    index('claim_death_certificate_reviews_pariwar_id_idx').on(t.pariwarId),
    index('claim_death_certificate_reviews_claim_case_id_idx').on(t.claimCaseId),
    index('claim_death_certificate_reviews_upload_id_idx').on(t.uploadId),
    index('claim_death_certificate_reviews_deceased_member_idx').on(t.pariwarId, t.deceasedMemberId),
    // D1 — at most ONE live review per claim (the supersession backstop).
    uniqueIndex('claim_death_certificate_reviews_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimDeathCertificateReviewRow = typeof claimDeathCertificateReviews.$inferSelect;
export type ClaimDeathCertificateReviewInsert = typeof claimDeathCertificateReviews.$inferInsert;
