// Story 3.13 — staff check a TYPED-IN identity while the member is alive (Task 3.3; DL6–DL9, DL11, DL13).
//
//   · GET  /api/v1/p/:pariwarId/admin/members/identity-checks                    — the queue (DL11; ⛔ PII)
//   · GET  /api/v1/p/:pariwarId/admin/members/:memberId/identity-check           — the detail (DL8; one audited view)
//   · POST /api/v1/p/:pariwarId/admin/members/:memberId/identity-check           — record the act (Idempotency-Key)
//   · POST /api/v1/p/:pariwarId/admin/members/:memberId/identity-check/mobile    — the number, one audited press (DL6a)
//
// `2026-11-25-502` Q1 A (Trustee-ratified): an original government photo ID, in person or on a video call; *"nothing is
// copied or kept"*. ⇒ the request carries WHAT KIND of document was seen — ⛔ its number, ⛔ an image, ⛔ an upload (N5).
// Every object is `.strict()`: a body carrying a number-like field or an upload is a 400 (AC9).
// ⚠ The request is deliberately LOOSE on the outcome ⇔ evidence ⇔ reason ⇔ note coherence: the domain writer owns those
// refusals (`identity_validation.invalid_shape`, 400), one rule in one place (0218's CHECK, mirrored in TS).
// ⚠ MIRRORED, ⛔ imported: the domain owns every tuple below (`@twt/domain` `schema/member_identity_validations.ts`);
// contracts ⛔ never imports `@twt/domain` (the browser-bundle rule; a turbo cycle).
// `packages/contracts/tests/members-identity-check.test.ts` pins each pair equal.

import { z } from 'zod';

/** The staff member's result. */
export const IDENTITY_CHECK_OUTCOMES = ['confirmed', 'not_confirmed'] as const;
export const IdentityCheckOutcome = z.enum(IDENTITY_CHECK_OUTCOMES);
export type IdentityCheckOutcome = z.output<typeof IdentityCheckOutcome>;

/** How the original photo ID was shown (`-502` Q1 A). */
export const IDENTITY_CHECK_EVIDENCE_KINDS = ['photo_id_in_person', 'photo_id_video_call'] as const;
export const IdentityCheckEvidenceKind = z.enum(IDENTITY_CHECK_EVIDENCE_KINDS);
export type IdentityCheckEvidenceKind = z.output<typeof IdentityCheckEvidenceKind>;

/** WHICH government photo ID was seen — the kind only, ⛔ its number (N5). */
export const IDENTITY_CHECK_DOCUMENT_KINDS = [
  'aadhaar_card',
  'pan_card',
  'voter_id',
  'driving_licence',
  'passport',
  'government_service_id',
] as const;
export const IdentityCheckDocumentKind = z.enum(IDENTITY_CHECK_DOCUMENT_KINDS);
export type IdentityCheckDocumentKind = z.output<typeof IdentityCheckDocumentKind>;

/** Why staff could not confirm (DL9) — `not_confirmed` only. */
export const IDENTITY_CHECK_NOT_CONFIRMED_REASONS = [
  'details_do_not_match',
  'photo_does_not_match',
  'no_document_shown',
  'member_not_reached',
] as const;
export const IdentityCheckNotConfirmedReason = z.enum(IDENTITY_CHECK_NOT_CONFIRMED_REASONS);
export type IdentityCheckNotConfirmedReason = z.output<typeof IdentityCheckNotConfirmedReason>;

/** The lifecycle states a queued member can be in (DL4). */
export const IDENTITY_CHECK_QUEUE_STATES = ['lock-in', 'pending-valid'] as const;

/** The longest staff note, in CODE POINTS (DL9). */
export const IDENTITY_CHECK_NOTE_MAX_CODE_POINTS = 1000;
/** The queue's page cap (DL11; mirrors the domain's `IDENTITY_CHECK_QUEUE_LIMIT.cap`). */
export const IDENTITY_CHECK_QUEUE_MAX_LIMIT = 200;
/** The queue's `offset` ceiling (`-504` item 3) — far beyond any real list, well inside Postgres' integer range, so a huge value is a 400 and ⛔ a 500. */
export const IDENTITY_CHECK_QUEUE_MAX_OFFSET = 1_000_000;

/** The refusal codes the four routes answer with (DL4, DL5, DL13). */
export const IDENTITY_CHECK_ERROR_CODES = {
  notEligible: 'identity_validation.not_eligible',
  deathReported: 'identity_validation.death_reported',
  invalidShape: 'identity_validation.invalid_shape',
  notFound: 'identity_validation.not_found',
  idempotencyKeyRequired: 'identity_validation.idempotency_key_required',
  idempotencyInProgress: 'identity_validation.idempotency_in_progress',
  concurrent: 'identity_validation.concurrent',
  mobileUnavailable: 'identity_validation.mobile_unavailable',
  /** 503 (`-504` item 1): a typed-in field that exists could not be decrypted — staff are ⛔ shown a blank beside a live Confirm. */
  identityUnreadable: 'identity_validation.identity_unreadable',
  /** 503 (`-504` item 2): the audit line of a disclosure could not be written, so ⛔ the identity or the number is returned. */
  auditUnavailable: 'identity_validation.audit_unavailable',
} as const;

const IsoDateTime = z.string().datetime({ offset: true });

/** `GET …/admin/members/identity-checks` querystring — a BOUNDED `limit` and `offset` (forced pagination). */
export const IdentityCheckQueueQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(IDENTITY_CHECK_QUEUE_MAX_LIMIT).optional(),
    offset: z.coerce.number().int().min(0).max(IDENTITY_CHECK_QUEUE_MAX_OFFSET).optional(),
  })
  .strict();
export type IdentityCheckQueueQuery = z.output<typeof IdentityCheckQueueQuery>;

/** One queued member — ⛔ name, ⛔ mobile, ⛔ Tier-1 field (DL11, uniform withholding). */
export const IdentityCheckQueueEntry = z
  .object({
    member_id: z.string().uuid(),
    /** The first 8 hex characters of the member id — what staff read aloud. */
    short_member_id: z.string().length(8),
    signed_up_at: IsoDateTime,
    state: z.enum(IDENTITY_CHECK_QUEUE_STATES),
    district: z.string().nullable(),
    latest_outcome: IdentityCheckOutcome.nullable(),
    latest_decided_at: IsoDateTime.nullable(),
    attempt_count: z.number().int().min(0),
  })
  .strict();
export type IdentityCheckQueueEntry = z.output<typeof IdentityCheckQueueEntry>;

export const IdentityCheckQueueResponse = z
  .object({
    entries: z.array(IdentityCheckQueueEntry),
    /** Does the caller hold the CHECK key (the detail + the record)? A verifier / helpline operator does not (DL6a). */
    can_check: z.boolean(),
    /** Is there another page after this one (`-504` item 3)? A member staff could not reach never hides those behind them. */
    has_more: z.boolean(),
  })
  .strict();
export type IdentityCheckQueueResponse = z.output<typeof IdentityCheckQueueResponse>;

/** One act in the member's history (DL8). The note is carried for the LIVE act only. */
export const IdentityCheckHistoryEntry = z
  .object({
    validation_id: z.string().uuid(),
    outcome: IdentityCheckOutcome,
    evidence_kind: IdentityCheckEvidenceKind.nullable(),
    document_kind: IdentityCheckDocumentKind.nullable(),
    not_confirmed_reason: IdentityCheckNotConfirmedReason.nullable(),
    decided_by_display: z.string(),
    decided_at: IsoDateTime,
    live: z.boolean(),
    /** The LIVE act's note (decrypted, audited with the view); `null` for a superseded act or a note-less one. */
    note: z.string().nullable(),
  })
  .strict();
export type IdentityCheckHistoryEntry = z.output<typeof IdentityCheckHistoryEntry>;

/** `GET …/admin/members/:memberId/identity-check` — the detail (DL8). ⛔ The full mobile (DL6a's press only). */
export const IdentityCheckDetailResponse = z
  .object({
    member_id: z.string().uuid(),
    short_member_id: z.string().length(8),
    state: z.string(),
    signed_up_at: IsoDateTime,
    /** How the identity was recorded at joining — `manual` (typed in) | `digilocker`; `null` = no KYC record. */
    kyc_source: z.enum(['manual', 'digilocker']).nullable(),
    /**
     * The typed-in identity, decrypted — only while an identity check is AWAITED (`eligible`, no death claim standing;
     * `-504` item 1). `null` for an anonymized member, one without a KYC record, one who needs no check, or one with a
     * death claim standing.
     */
    identity: z
      .object({
        name: z.string().nullable(),
        date_of_birth: z.string().nullable(),
        /** The photo as stored (a `data:` URI); `null` when none was given. */
        photo: z.string().nullable(),
      })
      .strict()
      .nullable(),
    /** The MASKED mobile (last digits only) — the full number is DL6a's audited press. */
    masked_mobile: z.string().nullable(),
    posting: z.object({ district: z.string(), workplace_name: z.string().nullable() }).strict().nullable(),
    /** DL5 — a claim is filed for the member's death: the form is ⛔ shown. */
    death_reported: z.boolean(),
    /** DL4 — is an identity check awaited (the form shown)? */
    eligible: z.boolean(),
    history: z.array(IdentityCheckHistoryEntry),
  })
  .strict();
export type IdentityCheckDetailResponse = z.output<typeof IdentityCheckDetailResponse>;

/** `POST …/admin/members/:memberId/identity-check` (`Idempotency-Key` required). ⛔ Number, ⛔ upload (N5). */
export const IdentityCheckRecordRequest = z
  .object({
    outcome: IdentityCheckOutcome,
    evidence_kind: IdentityCheckEvidenceKind.nullable().optional(),
    document_kind: IdentityCheckDocumentKind.nullable().optional(),
    not_confirmed_reason: IdentityCheckNotConfirmedReason.nullable().optional(),
    /** Required for `not_confirmed` (the writer refuses without one); ≤ 1,000 code points. */
    note: z
      .string()
      .trim()
      .refine((s) => [...s].length <= IDENTITY_CHECK_NOTE_MAX_CODE_POINTS, {
        message: `a note of at most ${IDENTITY_CHECK_NOTE_MAX_CODE_POINTS} characters`,
      })
      .optional(),
  })
  .strict();
export type IdentityCheckRecordRequest = z.output<typeof IdentityCheckRecordRequest>;

export const IdentityCheckRecordResponse = z
  .object({
    validation_id: z.string().uuid(),
    outcome: IdentityCheckOutcome,
    superseded_validation_id: z.string().uuid().nullable(),
    /** The member's lifecycle state after the act (`active` only for a confirmation from `pending-valid`). */
    state: z.string(),
    kyc_completed: z.boolean(),
  })
  .strict();
export type IdentityCheckRecordResponse = z.output<typeof IdentityCheckRecordResponse>;

/** `POST …/admin/members/:memberId/identity-check/mobile` — the member's full number, ONE audited showing (DL6a). */
export const IdentityCheckMobileResponse = z
  .object({
    /** The canonical number (`+91…`). ⛔ Cached, ⛔ logged by any client. */
    mobile: z.string().min(1),
  })
  .strict();
export type IdentityCheckMobileResponse = z.output<typeof IdentityCheckMobileResponse>;
