// Story 6.37c (LD10, LD11; AC7) — the District Admin's CALL RECORD: a phone call to a person on a claim being chased (the
// correction chase or the certificate chase), the date, WHO answered (a role — ⛔ a name) and whether it reached the
// family (`2026-10-17-351` 5 A). A call recorded `reached` counts as reaching the person (D22) and ends their running
// delivery ladders. ⛔ Free text, ⛔ a name, ⛔ a number in a request or a DTO — the number is revealed ONLY by the
// step-up-gated read below, ONLY inside the call form.
// ⚠ LOCKSTEP with the domain's `CONTACT_CALL_ANSWERED_BY` / `CONTACT_CALL_OUTCOMES` / `CONTACT_LADDER_CHASES` and migration
// 0169's CHECKs — re-declared, ⛔ imported (contracts never import `@twt/domain`); pinned by
// `tests/contact-call-lockstep.test.ts`.

import { z } from 'zod';

import {
  ContactCallAnsweredBy,
  ContactCallOutcome,
  CorrectionPersonKey,
  isRealCalendarDate,
} from './contact-ladder.js';

// The call DTO and its vocabularies live in the LEAF `contact-ladder.ts` (the chase views embed them — ⛔ a cycle).
export { CONTACT_CALL_ANSWERED_BY, CONTACT_CALL_CHASES, CONTACT_CALL_OUTCOMES, ContactCallAnsweredBy, ContactCallChase, ContactCallDto, ContactCallOutcome } from './contact-ladder.js';

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
