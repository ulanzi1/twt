// Story 6.37c (LD10, LD11; AC7) — the District Admin's CALL RECORD: a phone call to a person on a claim being chased (the
// correction chase or the certificate chase), the date, WHO answered (a role — ⛔ a name) and whether it reached the
// family (`2026-10-17-351` 5 A). A call recorded `reached` counts as reaching the person (D22) and ends their running
// delivery ladders. ⛔ Free text, ⛔ a name, ⛔ a number in a request or a DTO — the number is revealed ONLY by the
// step-up-gated read below, ONLY inside the call form.
// ⚠ LOCKSTEP with the domain's `CONTACT_CALL_ANSWERED_BY` / `CONTACT_CALL_OUTCOMES` / `CONTACT_LADDER_CHASES` and migration
// 0169's CHECKs — re-declared, ⛔ imported (contracts never import `@twt/domain`); pinned by
// `tests/contact-call-lockstep.test.ts`.

import { z } from 'zod';

import { CorrectionPersonKey, isRealCalendarDate } from './correction-chase.js';

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

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'a calendar date, YYYY-MM-DD')
  .refine(isRealCalendarDate, 'not a real calendar date');

/**
 * POST …/correction/calls and …/certificate-reminders/calls — the body. ⛔ `called_on` later than today (IST) or before
 * the claim was filed is the route's / writer's 400 (it needs a clock and the claim). `reached` only when the person
 * or a family member answered (`-351` 5 A — the DB CHECK says the same).
 */
export const RecordContactCallRequest = z
  .object({
    person_key: CorrectionPersonKey,
    called_on: IsoDate,
    answered_by: ContactCallAnsweredBy,
    outcome: ContactCallOutcome,
  })
  .strict()
  .refine((v) => v.outcome !== 'reached' || v.answered_by === 'the_person' || v.answered_by === 'family_member', {
    message: 'a call reaches the family only when the person or a family member answered',
    path: ['outcome'],
  });
export type RecordContactCallRequest = z.output<typeof RecordContactCallRequest>;

/** One recorded call as the panels show it. ⛔ A number, ⛔ a name of who answered (a role only). */
export const ContactCallDto = z
  .object({
    call_id: z.string().uuid(),
    person_key: CorrectionPersonKey,
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

/** GET …/calls/number?person_key= — the query. */
export const ContactCallNumberQuery = z.object({ person_key: CorrectionPersonKey }).strict();
export type ContactCallNumberQuery = z.output<typeof ContactCallNumberQuery>;

/**
 * The person's CURRENT number (after a 6.20 correction: the NEW one) — Tier-1 plaintext, behind a FRESH step-up
 * (`contact_call_number`), shown ONLY inside the call form; each read is audited; `Cache-Control: no-store`. `null` when
 * the person has ⛔ sendable number on record.
 */
export const ContactCallNumberResponse = z
  .object({
    person_key: CorrectionPersonKey,
    number: z.string().nullable(),
  })
  .strict();
export type ContactCallNumberResponse = z.output<typeof ContactCallNumberResponse>;
