// Story 6.21a — the District Admin's DEATH-CERTIFICATE REVIEW and its HISTORY (Task 5; D9, D10).
//
// `2026-09-20-235` Y: only a certificate with a clear date is acceptable. `2026-09-20-236` BB: a rejection
// asks the family for another WITHOUT the claim being denied. ⭐ The accept form's date starts EMPTY — the
// District Admin types it (invariant 1); the OCR reading is shown beside it, labelled as the OCR's.
// ⚠ The request is deliberately LOOSE on the verdict ⇔ date ⇔ reason coherence: the domain writer owns
// those refusals (`reason_on_accept`, `missing_reason`, `date_on_reject`, `invalid_date`) and AC1 requires
// each to reach the wire as its own `death_certificate_review.<reason>` 409 AND be audited — a zod
// superRefine here would turn them into an anonymous 400 with ⛔ no audit line.
// ⛔ Never imports `@twt/domain` (the browser-bundle rule). ALL objects `.strict()`.

import { z } from 'zod';

import { ReadableErasable } from './nominee-name-check.js';

/** A `YYYY-MM-DD` shape — the REAL-date check (⛔ `2026-02-30`) is the writer's `invalid_date`. */
const DateShape = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a YYYY-MM-DD calendar date');

export const DeathCertificateReviewVerdict = z.enum(['accepted', 'rejected']);
export type DeathCertificateReviewVerdict = z.output<typeof DeathCertificateReviewVerdict>;

/** The three ways a date is not "clear": absent, unclear, or impossible (after the day of review). */
export const DeathCertificateRejectionReason = z.enum([
  'no_date_of_death',
  'date_of_death_unclear',
  'date_of_death_in_future',
]);
export type DeathCertificateRejectionReason = z.output<typeof DeathCertificateRejectionReason>;

/** `POST …/admin/claims/:claimCaseId/death-certificate/review`. */
export const DeathCertificateReviewRequest = z
  .object({
    verdict: DeathCertificateReviewVerdict,
    /** The upload the District Admin looked at — the console item's `review.certificateToken`. */
    certificate_token: z.string().uuid(),
    /** ACCEPT — the date of death the District Admin read off the certificate and TYPED. */
    accepted_date: DateShape.optional(),
    /** REJECT — why the date is not clear. */
    rejection_reason: DeathCertificateRejectionReason.optional(),
    /** REQUIRED either way. Tier-1 at rest. ⛔ No `.min(1)`: an empty note must reach the writer's own
     * `missing_note` refusal (AC1) rather than an anonymous, unaudited 400 here. */
    note: z.string().trim().max(2000),
    /** The live review the District Admin saw (`null` for the first review) — the supersession guard. */
    expected_live_review_id: z.string().uuid().nullable(),
  })
  .strict();
export type DeathCertificateReviewRequest = z.output<typeof DeathCertificateReviewRequest>;

export const DeathCertificateReviewWriteResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    review_id: z.string().uuid(),
    verdict: DeathCertificateReviewVerdict,
    superseded_review_id: z.string().uuid().nullable(),
    supersession_reason: z.enum(['re_reviewed', 'replaced']).nullable(),
    event_version: z.number().int().positive(),
  })
  .strict();
export type DeathCertificateReviewWriteResponse = z.output<typeof DeathCertificateReviewWriteResponse>;

/** One review in the history. The date and note are DECRYPTED here, on the audited on-demand read. */
export const DeathCertificateHistoryReview = z
  .object({
    review_id: z.string().uuid(),
    verdict: DeathCertificateReviewVerdict,
    rejection_reason: DeathCertificateRejectionReason.nullable(),
    /** ACCEPTED only. ⚠ `ReadableErasable`, ⛔ not a date type: an RTBF-erased value is `anonymized`, a failed
     *  decrypt `unreadable` — ⛔ never a 500, ⛔ never the sentinel as a value (`2026-09-26-246` §2). */
    accepted_date: ReadableErasable.nullable(),
    note: ReadableErasable,
    decided_by_display: z.string(),
    decided_at: z.string().datetime(),
    superseded_at: z.string().datetime().nullable(),
    superseded_reason: z.enum(['re_reviewed', 'replaced']).nullable(),
  })
  .strict();
export type DeathCertificateHistoryReview = z.output<typeof DeathCertificateHistoryReview>;

/** One uploaded certificate — EVERY upload is listed, including never-reviewed ones (`-243`: all are kept). */
export const DeathCertificateHistoryUpload = z
  .object({
    upload_id: z.string().uuid(),
    /** ⚠ LOCKSTEP with `DEATH_CERTIFICATE_UPLOAD_CHANNELS` (`@twt/domain`'s `schema/claim_death_certificate_uploads.ts`)
     * and the migration's `channel` CHECK — contracts ⛔ never imports `@twt/domain` (a turbo cycle), so this
     * literal set is re-declared, not shared; keep all three in lockstep by hand. */
    channel: z.enum(['member_app', 'helpline']),
    uploaded_at: z.string().datetime(),
    /** Is this the claim's CURRENT certificate? */
    current: z.boolean(),
    /** `signed_url` is `null` when the storage lookup for THIS upload failed — the rest of the history still
     * renders; a storage hiccup on one old certificate ⛔ never fails the whole read. */
    preview: z.object({ signed_url: z.string().nullable(), content_type: z.string() }).strict(),
    reviews: z.array(DeathCertificateHistoryReview),
  })
  .strict();
export type DeathCertificateHistoryUpload = z.output<typeof DeathCertificateHistoryUpload>;

/** `GET …/admin/claims/:claimCaseId/death-certificate/history` — newest first. */
export const DeathCertificateHistoryResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    uploads: z.array(DeathCertificateHistoryUpload),
    /** `true` when the claim has more uploads than the server's history cap returned — every certificate
     * is kept forever (`-243`), so this is the caller's only signal that older uploads were left out. */
    truncated: z.boolean(),
  })
  .strict();
export type DeathCertificateHistoryResponse = z.output<typeof DeathCertificateHistoryResponse>;
