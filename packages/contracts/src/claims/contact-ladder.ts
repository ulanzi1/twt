// Story 6.37c (LD10, LD12) — the wire pieces the delivery LADDER adds to the two chase views, and the call record's DTO —
// a LEAF: it imports ⛔ any sibling contract module (`correction-chase.ts` ⛔ imports a sibling that imports it back — a
// runtime init cycle typecheck cannot see), so `correction-chase.ts`, `certificate-reminder.ts` and `contact-call.ts`
// all import from HERE. `isRealCalendarDate` and `CorrectionPersonKey` moved here from `correction-chase.ts` (which
// re-exports them — every existing import keeps working).
// ⚠ LOCKSTEP with the domain's `CONTACT_CALL_*`, `CONTACT_LADDER_FOLLOW_UP_STATES`, `CONTACT_LADDER_ASKS` and migration
// 0169's CHECKs — re-declared, ⛔ imported (contracts never import `@twt/domain`); pinned by `tests/contact-call-lockstep.test.ts`
// and `tests/certificate-reminder-lockstep.test.ts`.

import { z } from 'zod';

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

/** Who answered the call. ⚠ LOCKSTEP (see the header). */
export const CONTACT_CALL_ANSWERED_BY = ['the_person', 'family_member', 'someone_else', 'nobody'] as const;
export const ContactCallAnsweredBy = z.enum(CONTACT_CALL_ANSWERED_BY);
export type ContactCallAnsweredBy = z.infer<typeof ContactCallAnsweredBy>;

/** Did the call reach the family. ⚠ LOCKSTEP (see the header). */
export const CONTACT_CALL_OUTCOMES = ['reached', 'not_reached'] as const;
export const ContactCallOutcome = z.enum(CONTACT_CALL_OUTCOMES);
export type ContactCallOutcome = z.infer<typeof ContactCallOutcome>;

/** The surface a call was recorded from. ⚠ LOCKSTEP (see the header). */
export const CONTACT_CALL_CHASES = ['correction', 'certificate'] as const;
export const ContactCallChase = z.enum(CONTACT_CALL_CHASES);
export type ContactCallChase = z.infer<typeof ContactCallChase>;

/** One recorded call as the panels show it. ⛔ A number, ⛔ a name of who answered (a role only). */
export const ContactCallDto = z
  .object({
    call_id: z.string().uuid(),
    /** ⛔ The request's regex here — an OUTPUT field is ⛔ input-tightened (footgun #29(a)). */
    person_key: z.string(),
    chase: ContactCallChase,
    called_on: IsoDate,
    answered_by: ContactCallAnsweredBy,
    outcome: ContactCallOutcome,
    /** The recording admin's display name at the time (⛔ email-derived). */
    recorded_by: z.string(),
    recorded_at: z.string().datetime({ offset: true }),
  })
  .strict();
export type ContactCallDto = z.output<typeof ContactCallDto>;

/** LD12 — the person's latest follow-up (a delivery ladder) as staff see it. ⚠ LOCKSTEP (see the header). */
export const CONTACT_LADDER_FOLLOW_UP_STATES = ['running', 'concluded', 'ended_delivered', 'ended_call', 'ended_other'] as const;
export const ContactLadderFollowUpDto = z
  .object({
    state: z.enum(CONTACT_LADDER_FOLLOW_UP_STATES),
    started_on: IsoDate,
    /** A running follow-up's next date (its next text, or its conclusion); `null` otherwise. */
    next_step_on: IsoDate.nullable(),
    concluded_on: IsoDate.nullable(),
    /**
     * Story 6.37d (WS13) — which channel got through when the follow-up ended `ended_delivered` (a text, or the claimant's
     * WhatsApp); `null` for every other state.
     */
    delivered_by: z.enum(['text', 'whatsapp']).nullable(),
  })
  .strict();
export type ContactLadderFollowUpDto = z.output<typeof ContactLadderFollowUpDto>;

/** LD9 — the call-or-letter ask of a concluded follow-up (cap-aware). ⚠ LOCKSTEP (see the header). */
export const CONTACT_LADDER_ASKS = ['call_or_letter', 'call', 'letter', 'none'] as const;
export const ContactLadderAsk = z.enum(CONTACT_LADDER_ASKS);
export type ContactLadderAsk = z.infer<typeof ContactLadderAsk>;

/** LD12 — why a person reads unreachable: a number REFUSED at send, or reminders NOT DELIVERED (a concluded follow-up). */
export const UNREACHABLE_REASONS = ['refused', 'not_delivered'] as const;
export const UnreachableReason = z.enum(UNREACHABLE_REASONS);
export type UnreachableReason = z.infer<typeof UnreachableReason>;
