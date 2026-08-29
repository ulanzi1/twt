// ⛔⛔ THE ANTI-CLEANUP GUARD — Story 11b.9 (AC4 / AC9).
//
// Decisions `2026-08-28-160` cl.5 and `2026-08-28-162` cl.5 PRESERVE three `consent_type` values,
// their migrations, and every `consent_records` row already written — while Story 11b.9 makes all
// three WRITE-NEVER (the claim consent screen reduced to `claim_time_dpdpa` alone) and
// `sahyog_drive_publication` READ-NEVER as well (its render gate was de-authorised).
//
// ⇒ ⛔ THEY LOOK EXACTLY LIKE DEAD CODE, AND A FUTURE "CLEANUP" DELETING THEM WOULD BREAK THREE
// SEPARATE THINGS AT ONCE — none of which a normal test suite would catch:
//   1. HISTORICAL EVENTS become UNPARSEABLE. `claim/events.ts` derives
//      `claim.dpdpa_consent_recorded`'s `consent_types_granted` and `claim.dpdpa_consent_revoked`'s
//      `consent_type` from the two tuples asserted below. `events_log` is the source of truth and
//      its reducers must stay TOTAL.
//   2. PRESERVED ROWS become UNREADABLE and UN-REVOCABLE. The GET presence view and both revoke
//      routes are the last remaining data-subject actions on those rows (story D7(a)) — a family
//      who granted before 11b.9 can still SEE and WITHDRAW.
//   3. `DPDPA_CONSENT_COPY` in apps/api is `Record`-TOTAL over the enum: it is what keeps an
//      already-written row EXPLICABLE.
//
// ⚠⛔ THIS TEST IS THE TEETH ON A RULING, ⛔ not a schema snapshot. If it fails, the fix is to
// RESTORE THE SOURCE — ⛔ never to relax the test. Deleting any of these values requires a SEPARATE
// trustee decision finding they have no remaining purpose, and that decision would supersede this
// file rather than be worked around in it.

import { describe, expect, it } from 'vitest';

import {
  CLAIM_TIME_CONSENT_TYPES,
  CLAIM_TIME_PUBLICATION_CONSENT_TYPES,
  consentTypeEnum,
} from '../../src/schema/consent_records.js';

/** The three values preserved by ruling — retired as CAPTURE surfaces, ⛔ not deleted as TYPES. */
const PRESERVED_BY_RULING = [
  'sahyog_vivran_publication',
  'in_memoriam_listing',
  'sahyog_drive_publication',
] as const;

describe('consent types preserved by ruling (11b.9 AC4)', () => {
  it.each(PRESERVED_BY_RULING)(
    'keeps %s in the consent_type pgEnum — deleting it needs a separate decision (-160 cl.5 / -162 cl.5)',
    (value) => {
      expect(consentTypeEnum.enumValues).toContain(value);
    },
  );

  it('keeps sahyog_drive_publication even though nothing reads or writes it any more', () => {
    // The point of the guard: write-never + read-never is exactly what makes it look deletable.
    expect(consentTypeEnum.enumValues).toContain('sahyog_drive_publication');
  });

  it('keeps CLAIM_TIME_CONSENT_TYPES at all four values — the recorded-event payload derives from it', () => {
    expect([...CLAIM_TIME_CONSENT_TYPES]).toEqual([
      'claim_time_dpdpa',
      'sahyog_vivran_publication',
      'in_memoriam_listing',
      'sahyog_drive_publication',
    ]);
  });

  it('keeps CLAIM_TIME_PUBLICATION_CONSENT_TYPES at all three values — the revoked-event payload derives from it', () => {
    expect([...CLAIM_TIME_PUBLICATION_CONSENT_TYPES]).toEqual([...PRESERVED_BY_RULING]);
  });

  it('still carries claim_time_dpdpa — the one type 11b.9 leaves CAPTURED and unchanged', () => {
    expect(consentTypeEnum.enumValues).toContain('claim_time_dpdpa');
    expect(CLAIM_TIME_CONSENT_TYPES).toContain('claim_time_dpdpa');
    // ⛔ (a) authorises PROCESSING, not publication — it is deliberately NOT revocable here.
    expect([...CLAIM_TIME_PUBLICATION_CONSENT_TYPES]).not.toContain('claim_time_dpdpa');
  });
});
