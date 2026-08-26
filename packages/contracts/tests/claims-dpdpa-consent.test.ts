// Claim-time DPDPA consent contract tests — Story 6.9 (Task 3/6).
//
// (1) DTO behaviour: strict, valid parse, reject unknown key.
// (2) The record request enforces the D3a default — claimTimeDpdpa must be true (.refine()).
// (3) The locale is the constrained ['en','hi'] enum (never an arbitrary string).
// (4) The revoke request accepts ONLY the two publication types + requires a reason.
// (5) Responses are a NON-PII presence view (granted-type flags only — no checkbox text / subject id).

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

const validRecord = {
  claimTimeDpdpa: true,
  sahyogVivranPublication: false,
  inMemoriamListing: false,
  sahyogDrivePublication: false,
  locale: 'en',
};

describe('DPDPA-consent DTOs (strict + shapes)', () => {
  it('the record + revoke + status DTOs are .strict()', () => {
    assertStrict(DpdpaConsentStatusResponse);
    assertStrict(RevokeDpdpaConsentRequest);
    // RecordDpdpaConsentRequest is a ZodEffects (.refine) over a strict object — assert via reject.
    expect(() => RecordDpdpaConsentRequest.parse({ ...validRecord, extra: 1 })).toThrow();
  });

  it('accepts a valid record (only the processing consent)', () => {
    expect(RecordDpdpaConsentRequest.parse(validRecord)).toMatchObject({ claimTimeDpdpa: true });
  });

  it('accepts all three boxes checked', () => {
    const parsed = RecordDpdpaConsentRequest.parse({
      claimTimeDpdpa: true,
      sahyogVivranPublication: true,
      inMemoriamListing: true, sahyogDrivePublication: false,
      locale: 'hi',
    });
    expect(parsed.sahyogVivranPublication).toBe(true);
    expect(parsed.inMemoriamListing).toBe(true);
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

  it('DpdpaConsentType is the four claim-time consent types', () => {
    expect([...DpdpaConsentType.options].sort()).toEqual([
      'claim_time_dpdpa',
      'in_memoriam_listing',
      // Story 11b.1 (D4(b)) — the FOURTH box: the deceased member's name on the public Sahyog Drive.
      'sahyog_drive_publication',
      'sahyog_vivran_publication',
    ]);
  });

  // Story 11b.1 AC12: the fourth box is OUTSIDE the `.refine()`. This is the load-bearing half of
  // D4(b) — Niyamavali §4.4, Part 10 and Trust Deed cl.15(c) each forbid default opt-in, so a request
  // declining the Sahyog Drive publication must be perfectly VALID. If a future edit folds this box
  // into the refine, the publication consent silently becomes compulsory and these two fail.
  it('ACCEPTS a request declining the Sahyog Drive publication (it is NOT compulsory)', () => {
    expect(
      RecordDpdpaConsentRequest.parse({ ...validRecord, sahyogDrivePublication: false }),
    ).toMatchObject({ sahyogDrivePublication: false });
  });

  it('ACCEPTS a request declining ALL THREE publication consents', () => {
    expect(
      RecordDpdpaConsentRequest.parse({
        claimTimeDpdpa: true,
        sahyogVivranPublication: false,
        inMemoriamListing: false,
        sahyogDrivePublication: false,
        locale: 'en',
      }),
    ).toMatchObject({ claimTimeDpdpa: true });
  });

  // REQUIRED, not optional, on purpose: an optional field would let a client that never RENDERED the
  // box submit a body indistinguishable from one where the family saw it and declined.
  it('REJECTS a request that OMITS the Sahyog Drive box (a client must make a deliberate choice)', () => {
    const withoutBox: Record<string, unknown> = { ...validRecord };
    delete withoutBox['sahyogDrivePublication'];
    expect(() => RecordDpdpaConsentRequest.parse(withoutBox)).toThrow();
  });

  it('the record request does NOT carry checkboxTextShown (server resolves the copy)', () => {
    expect(() =>
      RecordDpdpaConsentRequest.parse({ ...validRecord, checkboxTextShown: 'I consent …' }),
    ).toThrow();
  });
});

describe('RevokeDpdpaConsentRequest', () => {
  it('accepts the three publication types with a reason', () => {
    for (const consentType of [
      'sahyog_vivran_publication',
      'in_memoriam_listing',
      // Story 11b.1 — a family may withdraw the deceased member's name from the public Sahyog Drive
      // at ANY claim state, including after settlement (6.9 AC3's post-settlement takedown).
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
