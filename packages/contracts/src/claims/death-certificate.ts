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

// ── Story 6.21b — the FAMILY's (and the helpline's) death-certificate status ────────────────────
// `2026-09-25-244`/`2026-09-26-247`/`2026-09-26-249` (D1). A FIVE-value status — ⛔ NEVER the
// domain's own four-value `DeathCertificateStatus` name (BW-C11) — table-driven, server-computed
// from ONE scope tx. Wire keys are snake_case (the shepherd/appeal post-filing-read precedent —
// `2026-09-26-248` corrects `-247` §3's "the client maps them"; every member method returns its
// contract type AS-IS, ⛔ no camelCase mapping layer). `.strict()`, per the contracts discipline.

/** The FIVE-value status a family (or the helpline, on their behalf) is shown. */
export const DeathCertificateFamilyStatus = z.enum([
  'not_needed',
  'missing',
  'awaiting_review',
  'accepted',
  'replacement_requested',
]);
export type DeathCertificateFamilyStatus = z.output<typeof DeathCertificateFamilyStatus>;

/** Why a replacement is being asked for — present only for `replacement_requested`. */
export const DeathCertificateReplacementReasonWire = z.enum(['unclear_date', 'future_date']);
export type DeathCertificateReplacementReasonWire = z.output<typeof DeathCertificateReplacementReasonWire>;

/** `-249` §4 — which reassurance line the family is shown; `null` for every status but `replacement_requested`. */
export const DeathCertificateReassurance = z.enum(['not_refused', 'still_open']);
export type DeathCertificateReassurance = z.output<typeof DeathCertificateReassurance>;

/**
 * `GET /api/v1/member/claims/:claimCaseId/death-certificate` — the member's own status read (D1).
 * ⛔ No note, date, reviewer or free text (invariant 3) — only the reason ENUM and our own copy.
 */
export const MemberDeathCertificateStatusResponse = z
  .object({
    status: DeathCertificateFamilyStatus,
    replacement_reason: DeathCertificateReplacementReasonWire.nullable(),
    replacement_allowed: z.boolean(),
    upload_allowed: z.boolean(),
    /** The CURRENT upload's id — opaque, non-PII, the marker's discriminator (`-247` §1). ⛔ Never shown. */
    certificate_token: z.string().uuid().nullable(),
    /** `state ∉ {denied, settled}` — the filing-entry redirect's own gate (`-249` §2). ⛔ Never shown. */
    claim_live: z.boolean(),
    reassurance: DeathCertificateReassurance.nullable(),
    /**
     * ⭐ Story 6.19c (`-273` §9) — this claim was CLOSED for no response (a `closed` closure row): the member sees
     * `closed_no_response`, ⛔ never `appeal_exhausted`. ⛔ Never a reason, a note or a date.
     */
    closed_no_response: z.boolean(),
    /**
     * ⭐ Story 6.19c (`-273` §9) — a ROUTING BIT, exactly D19's guard: the death has ⛔ no live claim, its most recent
     * terminal claim was closed for no response, and ⛔ no re-file confirmation waits. The claim-entry gate routes to the
     * calm "please call the helpline" state while it is true. ⛔ Never shown.
     */
    refile_requires_confirmation: z.boolean(),
  })
  .strict();
export type MemberDeathCertificateStatusResponse = z.output<typeof MemberDeathCertificateStatusResponse>;

/**
 * The wizard submit's 409 code that routes to the SAME re-file state as `refile_requires_confirmation` above
 * (`apps/api/src/modules/claims/claims.service.ts`'s `translateRefileRequiresConfirmation` — a phone without the
 * filed-claim pointer, e.g. a helpline-filed claim read from another device). Code review patch (2026-10-02):
 * canonical here — previously hand-duplicated as a literal string in `apps/mobile/lib/refile-helpline-copy.ts`
 * with no server-side link, so a server rename would have silently degraded the flow with nothing to catch it.
 */
export const REFILE_REQUIRES_CONFIRMATION_CODE = 'claim.refile_requires_confirmation';

/** One of the selected deceased member's live claims, with its D1 status (the helpline list, D5). */
export const DeathCertificateHelplineClaimStatus = z
  .object({
    claim_case_id: z.string().uuid(),
    claim_state: z.string(),
    created_at: z.string().datetime(),
    status: DeathCertificateFamilyStatus,
    replacement_reason: DeathCertificateReplacementReasonWire.nullable(),
    upload_allowed: z.boolean(),
    reassurance: DeathCertificateReassurance.nullable(),
    /** ⛔ No `certificate_token` here — the in-flight marker is a member-app-only concept (D5). */
  })
  .strict();
export type DeathCertificateHelplineClaimStatus = z.output<typeof DeathCertificateHelplineClaimStatus>;

/** `GET …/admin/members/:memberId/death-certificate/claims` — the selected member's live claims (D5). */
export const DeathCertificateHelplineClaimsResponse = z
  .object({
    member_id: z.string().uuid(),
    claims: z.array(DeathCertificateHelplineClaimStatus),
  })
  .strict();
export type DeathCertificateHelplineClaimsResponse = z.output<typeof DeathCertificateHelplineClaimsResponse>;
