// The correction-return CHASE — the District Admin's request / response shapes (Story 6.19b, Task 7; AC5, AC16).
//
//   · POST …/admin/claims/:claimCaseId/correction/must-act                      — change WHO MUST ACT (key (7))
//   · POST …/admin/claims/:claimCaseId/correction/letters                       — record a POSTED letter (key (1))
//   · POST …/admin/claims/:claimCaseId/correction/letters/:letterId/delivery    — its delivery date + screenshot
//     (multipart: a `delivered_on` field, sent BEFORE the file, and ONE image file — ⛔ no JSON schema here)
//   · GET  …/admin/claims/:claimCaseId/correction/letters/address?person_key=   — the letter form's address (step-up)
//   · GET  …/admin/claims/:claimCaseId/correction/letters/:letterId/screenshot  — a TTL-limited signed read URL
//
// ⛔ Contracts never import `@twt/domain` ([[project_contracts_domain_bundle_boundary]]) — every vocabulary here is
// RE-DECLARED by hand. ⚠ ⛔ No lockstep test pins them to the domain yet (an open 6.19b review follow-up) — a change
// to a domain vocabulary must be mirrored here by hand. PII: the tracking number (in) and the address (out) are Tier-1 —
// the route encrypts / decrypts; ⛔ neither is ever echoed anywhere else.

import { z } from 'zod';


/**
 * Story 6.19b (AC16; `2026-09-27-258`, D25) — who must put a returned claim's bank details right. ⚠ LOCKSTEP with the
 * domain's `CORRECTION_MUST_ACT` and migration 0126's CHECK — re-declared, ⛔ not imported (contracts never import
 * `@twt/domain`). ⚠ This module imports ⛔ nothing from its sibling contract modules: `cycle-freeze.ts` and
 * `nominee-name-check.ts` both import IT, and a back-edge makes a runtime init cycle typecheck cannot see.
 */
export const CorrectionMustAct = z.enum(['family', 'staff']);
export type CorrectionMustAct = z.infer<typeof CorrectionMustAct>;

/** True only for a real calendar date — rejects a digit-shaped but impossible one (`2026-13-99`, `2026-02-30`).
 * Exported so the route layer can apply the SAME check to the multipart `delivered_on` field, which bypasses
 * this module's Zod schema entirely (it rides a raw multipart part, not the JSON body). */
export function isRealCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number) as [never, number, number, number];
  const asUtc = new Date(Date.UTC(y, mo - 1, d));
  return asUtc.getUTCFullYear() === y && asUtc.getUTCMonth() === mo - 1 && asUtc.getUTCDate() === d;
}

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'a calendar date, YYYY-MM-DD')
  .refine(isRealCalendarDate, 'not a real calendar date');

/** A chased person's stable key — `nominee:<uuid>` (the correction-chain root) or `claimant`. ⛔ Never a name. */
export const CorrectionPersonKey = z
  .string()
  .regex(/^(claimant|nominee:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/, 'a person key');
export type CorrectionPersonKey = z.infer<typeof CorrectionPersonKey>;

/** Notes cap — the trustee-rationale cap. */
export const CORRECTION_MUST_ACT_NOTE_MAX_CHARS = 500;
/** A postal tracking number is short; the cap keeps a pasted paragraph out. */
export const CORRECTION_LETTER_TRACKING_MAX_CHARS = 64;

// ── The mark change (AC16, key (7)) ──────────────────────────────────────────────────────────────────────────────

export const ChangeCorrectionMustActRequest = z
  .object({
    must_act: CorrectionMustAct,
    /** REQUIRED (D25) — why the District Admin changed who must act. Tier-1 at rest. */
    note: z
      .string()
      .max(CORRECTION_MUST_ACT_NOTE_MAX_CHARS)
      .refine((v) => v.trim().length > 0, 'a note is required when changing who must act'),
  })
  .strict();
export type ChangeCorrectionMustActRequest = z.output<typeof ChangeCorrectionMustActRequest>;

export const CorrectionRunKindDto = z.enum(['family', 'staff', 'direction']);

export const ChangeCorrectionMustActResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    must_act: CorrectionMustAct,
    /** The run the change opened (a switch), or `null`. */
    opened_run: z.object({ run_id: z.string().uuid(), kind: CorrectionRunKindDto, day0: IsoDate }).strict().nullable(),
  })
  .strict();
export type ChangeCorrectionMustActResponse = z.output<typeof ChangeCorrectionMustActResponse>;

// ── Letters (AC5, key (1)) ───────────────────────────────────────────────────────────────────────────────────────

export const RecordCorrectionLetterRequest = z
  .object({
    person_key: CorrectionPersonKey,
    /** ⛔ Later than today (IST) is the route's 400 `correction_letter.date_in_future` (it needs a clock); before the
     *  live return's IST date is the writer's 409 `correction_letter.posted_before_run`, and a second letter posted
     *  before the first letter's delivery date is its 409 `correction_letter.posted_before_first_delivery`. The same
     *  upper bound holds for `delivered_on`. */
    posted_on: IsoDate,
    tracking_number: z
      .string()
      .max(CORRECTION_LETTER_TRACKING_MAX_CHARS)
      .refine((v) => v.trim().length > 0, 'a tracking number is required'),
  })
  .strict();
export type RecordCorrectionLetterRequest = z.output<typeof RecordCorrectionLetterRequest>;

/** One letter as the queue and the form show it. ⛔ No tracking number, ⛔ no address, ⛔ no screenshot bytes. */
export const CorrectionLetterDto = z
  .object({
    letter_id: z.string().uuid(),
    person_key: CorrectionPersonKey,
    sequence: z.union([z.literal(1), z.literal(2)]),
    posted_on: IsoDate,
    /** ⛔ Un-recorded reads as `null` — ⛔ never inferred. */
    delivered_on: IsoDate.nullable(),
    /** `-250` #3 — 14 days after posting with ⛔ no recorded delivery, OR a delivery recorded later than that. Shown only. */
    overdue: z.boolean(),
    has_screenshot: z.boolean(),
    /**
     * `-273` §2 (Story 6.19c — renamed from `in_current_run`): the letter counts toward the person's two-letter limit
     * of the RETURN (≤ 2, the second after the first's delivery). Present on the QUEUE's letters (which span every run
     * of the live return — each one counts, so it is `true` there); absent on a single-letter write response.
     */
    counts_toward_limit: z.boolean().optional(),
  })
  .strict();
export type CorrectionLetterDto = z.output<typeof CorrectionLetterDto>;

export const RecordCorrectionLetterResponse = CorrectionLetterDto;
export type RecordCorrectionLetterResponse = CorrectionLetterDto;

export const CorrectionLetterAddressQuery = z.object({ person_key: CorrectionPersonKey }).strict();

export const CorrectionLetterAddressResponse = z
  .object({
    person_key: CorrectionPersonKey,
    /** Tier-1 plaintext — shown ONLY inside the letter form; each read is audited. */
    address: z.string(),
  })
  .strict();
export type CorrectionLetterAddressResponse = z.output<typeof CorrectionLetterAddressResponse>;

export const CorrectionLetterScreenshotResponse = z
  .object({ url: z.string().url(), expires_in_seconds: z.number().int().positive() })
  .strict();
export type CorrectionLetterScreenshotResponse = z.output<typeof CorrectionLetterScreenshotResponse>;

/** The screenshot's allowed MIME types (D6 — images only) and size cap (the claim-document 10 MiB). */
export const CORRECTION_LETTER_SCREENSHOT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// ── The queue's chase summary (AC8b) ─────────────────────────────────────────────────────────────────────────────

/** D30 — why the family cannot be reminded. */
export const CorrectionCannotRemindReason = z.enum(['undetermined', 'no_contact_record', 'agreement_not_live']);

/**
 * ONE person's reminder summary — by ROLE (`nominee` + rank, or `claimant`), ⛔ never a name.
 * `status`: `dead` (a dead number), `unreachable` (the network refused it, or ⛔ no sendable number), `reached`
 * (≥ 1 accepted to their current number), `not_yet` — in THAT precedence: a dead / unreachable finding in the current
 * number's epoch WINS over an earlier acceptance (it is what the letter track acts on; `found_dead_on` is set).
 */
export const CorrectionChasePersonDto = z
  .object({
    person_key: CorrectionPersonKey,
    role: z.enum(['nominee', 'claimant']),
    rank: z.union([z.literal(1), z.literal(2)]).nullable(),
    status: z.enum(['reached', 'dead', 'unreachable', 'not_yet']),
    found_dead_on: IsoDate.nullable(),
    reminders_accepted: z.number().int().nonnegative(),
    letters: z.array(CorrectionLetterDto),
  })
  .strict();
export type CorrectionChasePersonDto = z.output<typeof CorrectionChasePersonDto>;

export const CorrectionChaseSummaryDto = z
  .object({
    /** The live return this chase belongs to, or `null` (a claim here by the District Admin's own check). */
    return_decision_id: z.string().uuid().nullable(),
    /** Who must act — `null` on an unmarked return ("who must act: not set"). STAFF ONLY: who set it, and when. */
    must_act: CorrectionMustAct.nullable(),
    must_act_set_by: z.string().nullable(),
    must_act_set_at: z.string().nullable(),
    run: z
      .object({
        kind: CorrectionRunKindDto,
        day0: IsoDate,
        day_count: z.number().int(),
        open: z.boolean(),
        /** The IST date the run ended, `null` while it is open. */
        ended_on: IsoDate.nullable(),
        next_reminder_on: IsoDate.nullable(),
      })
      .strict()
      .nullable(),
    cannot_remind: CorrectionCannotRemindReason.nullable(),
    claimant_unresolved: z.boolean(),
    /** `-269` §2(b) — the family has corrected; the claim waits on YOUR check. */
    awaiting_check: z.boolean(),
    people: z.array(CorrectionChasePersonDto),
    /** A chase was escalated to the Pariwar Admin (the Pariwar Admin's filter). */
    escalated: z.boolean(),
  })
  .strict();
export type CorrectionChaseSummaryDto = z.output<typeof CorrectionChaseSummaryDto>;
