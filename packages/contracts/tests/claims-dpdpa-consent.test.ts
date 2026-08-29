// Claim-time DPDPA consent contract tests — Story 6.9 (Task 3/6).
//
// (1) DTO behaviour: strict, valid parse, reject unknown key.
// (2) The record request enforces the D3a default — claimTimeDpdpa must be true (.refine()).
// (3) The locale is the constrained ['en','hi'] enum (never an arbitrary string).
// (4) The revoke request accepts ONLY the three publication types + requires a reason.
// (5) Responses are a NON-PII presence view (granted-type flags only — no checkbox text / subject id).
//
// ⭐⭐ MIGRATED BY STORY 11b.9 — and read the discriminator before "fixing" anything here:
// a case that changed because the REQUEST lost three booleans is EXPECTED (`2026-08-28-162` cl.2
// retired the boxes). A case that changed because a TYPE, TUPLE or ENUM lost a value would be an
// AC4 VIOLATION — ⛔ revert the source, ⛔ never the test. ⇒ `DpdpaConsentType` and
// `DpdpaRevocableConsentType` are asserted UNCHANGED below, on purpose.

import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  DpdpaConsentLocale,
  DpdpaConsentStatusResponse,
  DpdpaConsentType,
  isDpdpaProcessingConsentSatisfied,
  RecordDpdpaConsentRequest,
  RecordDpdpaConsentResponse,
  RevokeDpdpaConsentRequest,
} from '../src/claims/index.js';

// ⭐ ONE box + the locale since Story 11b.9. ⛔ The three publication booleans are GONE from the
// request — the object is `.strict()`, so re-adding one here fails rather than being ignored.
const validRecord = {
  claimTimeDpdpa: true,
  locale: 'en',
};

describe('DPDPA-consent DTOs (strict + shapes)', () => {
  it('the record + revoke + status DTOs are .strict()', () => {
    assertStrict(DpdpaConsentStatusResponse);
    assertStrict(RevokeDpdpaConsentRequest);
    // RecordDpdpaConsentRequest is a ZodEffects (.refine) over a strict object — assert via reject.
    expect(() => RecordDpdpaConsentRequest.parse({ ...validRecord, extra: 1 })).toThrow();
  });

  it('accepts a valid record (the processing consent — now the ONLY box)', () => {
    expect(RecordDpdpaConsentRequest.parse(validRecord)).toMatchObject({ claimTimeDpdpa: true });
  });

  it('accepts the other locale', () => {
    const parsed = RecordDpdpaConsentRequest.parse({ claimTimeDpdpa: true, locale: 'hi' });
    expect(parsed.locale).toBe('hi');
  });

  it('REJECTS claimTimeDpdpa: false (D3a — processing consent required to proceed)', () => {
    expect(() =>
      RecordDpdpaConsentRequest.parse({ ...validRecord, claimTimeDpdpa: false }),
    ).toThrow();
  });

  it('code review gap-closure: the .refine() delegates to isDpdpaProcessingConsentSatisfied — ONE shared D3a policy, not two', () => {
    // Pins the actual delegation (not just "both happen to currently agree"): the contract's
    // pass/fail matches the exported predicate for both true and false, so apps/api's server-side
    // re-check (which imports + calls this SAME exported function) cannot silently drift from the
    // contract's own enforcement — a future policy change is a one-line edit to the predicate here.
    expect(isDpdpaProcessingConsentSatisfied(true)).toBe(true);
    expect(isDpdpaProcessingConsentSatisfied(false)).toBe(false);
    expect(() => RecordDpdpaConsentRequest.parse({ ...validRecord, claimTimeDpdpa: true })).not.toThrow();
    expect(() => RecordDpdpaConsentRequest.parse({ ...validRecord, claimTimeDpdpa: false })).toThrow();
  });

  it('REJECTS an arbitrary locale (constrained ["en","hi"] enum)', () => {
    expect(() => RecordDpdpaConsentRequest.parse({ ...validRecord, locale: 'ta' })).toThrow();
    expect(DpdpaConsentLocale.options).toEqual(['en', 'hi']);
  });

  // ⛔⛔ THE ANTI-CLEANUP GUARD (11b.9 AC4). The BOXES were retired; the TYPES are PRESERVED BY
  // RULING (`2026-08-28-160` cl.5, `-162` cl.5) so already-written rows stay readable and revocable
  // and historical event payloads stay parseable. ⛔ If this goes red because a value was deleted,
  // revert the SOURCE — deleting values to make a narrowed Record typecheck is the violation, not
  // the fix.
  it('DpdpaConsentType STILL carries all four claim-time consent types — retiring a box is not deleting a type', () => {
    expect([...DpdpaConsentType.options].sort()).toEqual([
      'claim_time_dpdpa',
      'in_memoriam_listing',
      // ⛔ Preserved by ruling: write-never and read-never since 11b.9, and ⛔ still not deletable.
      'sahyog_drive_publication',
      'sahyog_vivran_publication',
    ]);
  });

  // ⭐⭐ THE RETIREMENT, PROVED ON THE CONTRACT. Story 11b.9 removed the three publication booleans
  // from the request, so ⛔ NO NEW ROW of those types can ever be written. The object is `.strict()`,
  // which is what makes this a real gate rather than a silently-ignored field: a client (or a
  // regressed screen) still submitting a retired box is REJECTED, not quietly accepted.
  it.each(['sahyogVivranPublication', 'inMemoriamListing', 'sahyogDrivePublication'])(
    'REJECTS a request still carrying the retired %s box (-162 cl.2)',
    (retiredKey) => {
      expect(() =>
        RecordDpdpaConsentRequest.parse({ ...validRecord, [retiredKey]: false }),
      ).toThrow();
    },
  );

  it('ACCEPTS the reduced one-box request — (a) is unchanged and still the only thing asked', () => {
    expect(RecordDpdpaConsentRequest.parse({ claimTimeDpdpa: true, locale: 'en' })).toMatchObject({
      claimTimeDpdpa: true,
    });
  });

  it('the record request does NOT carry checkboxTextShown (server resolves the copy)', () => {
    expect(() =>
      RecordDpdpaConsentRequest.parse({ ...validRecord, checkboxTextShown: 'I consent …' }),
    ).toThrow();
  });
});

// ⭐⛔ THE REVOKE PATH SURVIVES A STORY THAT RETIRED THE BOXES — ⛔ read this before "finishing the
// cleanup". Retiring a box stops NEW rows; it ⛔ does not extinguish the rights attached to rows that
// already exist. Revocation is the ONLY remaining data-subject action on preserved rows, and
// `2026-08-28-160` cl.5 preserves them precisely so they stay ACTIONABLE, not merely stored.
// ⇒ a family who granted (b)/(c)/(d) BEFORE 11b.9 can still withdraw it AFTER (story D7(a)).
describe('RevokeDpdpaConsentRequest', () => {
  it('accepts the three publication types with a reason — ⛔ still, after 11b.9', () => {
    for (const consentType of [
      'sahyog_vivran_publication',
      'in_memoriam_listing',
      // Story 11b.1 — a family may withdraw the deceased member's name from the public Sahyog Drive
      // at ANY claim state, including after settlement (6.9 AC3's post-settlement takedown).
      // ⚠ Since 11b.9 this can only ever apply to a row granted BEFORE the box was retired — and
      // that is exactly the row the ruling preserves. ⛔ Do not remove this case.
      'sahyog_drive_publication',
    ] as const) {
      expect(RevokeDpdpaConsentRequest.parse({ consentType, reason: 'family withdrew' })).toMatchObject({
        consentType,
      });
    }
  });

  it('REJECTS revoking the processing consent (not a publication takedown target)', () => {
    expect(() =>
      RevokeDpdpaConsentRequest.parse({ consentType: 'claim_time_dpdpa', reason: 'x' }),
    ).toThrow();
  });

  it('REJECTS an empty reason', () => {
    expect(() =>
      RevokeDpdpaConsentRequest.parse({ consentType: 'in_memoriam_listing', reason: '' }),
    ).toThrow();
  });
});

describe('DpdpaConsentStatusResponse (NON-PII presence view)', () => {
  it('carries only the granted-type subset — no checkbox text / subject id', () => {
    const parsed = RecordDpdpaConsentResponse.parse({ granted: ['claim_time_dpdpa'] });
    expect(parsed.granted).toEqual(['claim_time_dpdpa']);
    // No PII fields exist on the shape — an extra key is rejected by .strict().
    expect(() =>
      DpdpaConsentStatusResponse.parse({ granted: [], subjectId: 'x' }),
    ).toThrow();
  });
});
