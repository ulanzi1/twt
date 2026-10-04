// The REPLACEMENT-CERTIFICATE reminder — the District Admin's request / response shapes (Story 6.19d; AC4, AC5, AC8;
// `2026-10-03-276` CR9, CR11). Key (1) `claim.record_correction_letter` on every route.
//
//   · GET  …/admin/certificate-reminders                                              — the "Certificate reminders" list
//   · POST …/admin/claims/:claimCaseId/certificate-reminders/letters                  — record the ONE posted letter
//   · POST …/admin/claims/:claimCaseId/certificate-reminders/letters/:letterId/delivery — its delivery (multipart)
//   · GET  …/admin/claims/:claimCaseId/certificate-reminders/letters/address?person_key= — the address (fresh step-up)
//   · GET  …/admin/claims/:claimCaseId/certificate-reminders/letters/:letterId/screenshot — (the SAME step-up)
//
// ⛔ Contracts never import `@twt/domain` ([[project_contracts_domain_bundle_boundary]]) — the vocabularies are
// RE-DECLARED here and pinned to the domain by `certificate-reminder-lockstep.test.ts`. snake_case on the wire (the 6.19b
// contract's convention). ⚠ Response schemas are PARSED (`serializerCompiler`) — an output field is ⛔ never an
// input-tightened one (footgun #29(a)): the person key and dates are plain strings on the way out.
// PII: a tracking number is Tier-1 at rest (the route encrypts); ⛔ no name, ⛔ no number anywhere; the address only in
// the gated address read.

import { z } from 'zod';

import { CORRECTION_LETTER_TRACKING_MAX_CHARS, CorrectionPersonKey, isRealCalendarDate } from './correction-chase.js';

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'a calendar date, YYYY-MM-DD')
  .refine(isRealCalendarDate, 'not a real calendar date');

/** Why the family is waiting (the domain's `CERTIFICATE_RUN_CAUSES`). */
export const CERTIFICATE_REMINDER_CAUSES = ['rejected', 'missing'] as const;
/** The run's state on the list (the domain's `CertificateListRunState`). */
export const CERTIFICATE_REMINDER_RUN_STATES = ['open', 'paused', 'ended'] as const;
/** A person's role on the list (the domain's `CertificateListPersonRole`). */
export const CERTIFICATE_REMINDER_ROLES = ['nominee', 'claimant'] as const;
/**
 * Why a run is paused (the domain's `CertificatePauseReason`): `outside_window` — the claim left the review window;
 * `certificate_accepted` — the anchor upload itself stands accepted on a re-review; `certificate_not_rejected` — a
 * defensive third value for the SAME anchor upload going `missing`/`awaiting_review` on a re-review (unreachable by
 * construction today, per the domain's own trace — kept here only to stay exhaustive with it).
 */
export const CERTIFICATE_REMINDER_PAUSE_REASONS = ['outside_window', 'certificate_accepted', 'certificate_not_rejected'] as const;
/**
 * Why the family cannot be reminded (the domain's `CertificateCannotRemindReason`): `no_contact_record` — the claim
 * has no contact record at all; `agreement_not_live` — the contact record exists but its agreement to be contacted
 * (the consent record) isn't `live` (e.g. revoked).
 */
export const CERTIFICATE_REMINDER_CANNOT_REMIND = ['no_contact_record', 'agreement_not_live'] as const;
/** A person's SMS state (the domain's `CertificatePersonSmsState`). */
export const CERTIFICATE_REMINDER_SMS_STATES = [
  'not_yet_reminded',
  'reminded',
  'number_not_working',
  'unreachable',
  'no_number',
  'not_sent',
  'letter_delivered_no_sms',
] as const;

// ── Requests ─────────────────────────────────────────────────────────────────────────────────────────────────

export const RecordCertificateLetterRequest = z
  .object({
    person_key: CorrectionPersonKey,
    posted_on: IsoDate,
    tracking_number: z
      .string()
      .max(CORRECTION_LETTER_TRACKING_MAX_CHARS)
      .transform((v) => v.trim())
      .refine((v) => v.length > 0, 'a tracking number is required'),
  })
  .strict();
export type RecordCertificateLetterRequest = z.output<typeof RecordCertificateLetterRequest>;

export const CertificateLetterAddressQuery = z.object({ person_key: CorrectionPersonKey }).strict();
export type CertificateLetterAddressQuery = z.output<typeof CertificateLetterAddressQuery>;

// ── Responses ────────────────────────────────────────────────────────────────────────────────────────────────

export const CertificateLetterDto = z
  .object({
    letter_id: z.string().uuid(),
    person_key: z.string(),
    posted_on: z.string(),
    delivered_on: z.string().nullable(),
    /** Posted + 14 days with ⛔ no recorded delivery — SHOWN, ⛔ nothing else. */
    overdue: z.boolean(),
    has_screenshot: z.boolean(),
  })
  .strict();
export type CertificateLetterDto = z.output<typeof CertificateLetterDto>;
// ⭐ BOTH write routes (the letter, its delivery) respond with `CertificateLetterDto` itself — ⛔ no response alias (code
// review round 2: an alias with zero consumers is a second source that drifts).

export const CertificateReminderPersonDto = z
  .object({
    person_key: z.string(),
    role: z.enum(CERTIFICATE_REMINDER_ROLES),
    /** `A`, `B`, … — a display position, ⛔ never a rank; `null` for the claimant. */
    position: z.string().nullable(),
    sms_state: z.enum(CERTIFICATE_REMINDER_SMS_STATES),
    letter_eligible: z.boolean(),
    letter: CertificateLetterDto.omit({ person_key: true }).nullable(),
    /** The day-13 escalation's RECORD date — ⚠ the Pariwar Admin is ⛔ not notified in this version. */
    escalation_recorded_on: z.string().nullable(),
  })
  .strict();
export type CertificateReminderPersonDto = z.output<typeof CertificateReminderPersonDto>;

export const CertificateReminderItemDto = z
  .object({
    claim_case_id: z.string().uuid(),
    short_reference: z.string(),
    cause: z.enum(CERTIFICATE_REMINDER_CAUSES),
    run_state: z.enum(CERTIFICATE_REMINDER_RUN_STATES),
    pause_reason: z.enum(CERTIFICATE_REMINDER_PAUSE_REASONS).nullable(),
    // ⛔ No `.min(0)` — an OUTPUT schema stays loose (footgun #29(a)): one anomalous row must not 500 the whole list.
    run_day: z.number().int().nullable(),
    next_reminder_on: z.string().nullable(),
    cannot_remind: z.enum(CERTIFICATE_REMINDER_CANNOT_REMIND).nullable(),
    people: z.array(CertificateReminderPersonDto),
  })
  .strict();
export type CertificateReminderItemDto = z.output<typeof CertificateReminderItemDto>;

export const CertificateRemindersResponse = z
  .object({
    items: z.array(CertificateReminderItemDto),
    /** Claims were left out — the domain's bounded scan hit its cap, or more were visible than the page `limit`. */
    truncated: z.boolean(),
  })
  .strict();
export type CertificateRemindersResponse = z.output<typeof CertificateRemindersResponse>;

export const CertificateLetterAddressResponse = z.object({ person_key: z.string(), address: z.string() }).strict();
export type CertificateLetterAddressResponse = z.output<typeof CertificateLetterAddressResponse>;

export const CertificateLetterScreenshotResponse = z
  .object({ url: z.string().url(), expires_in_seconds: z.number().int().positive() })
  .strict();
export type CertificateLetterScreenshotResponse = z.output<typeof CertificateLetterScreenshotResponse>;
