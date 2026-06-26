// KYC provider-abstraction contract tests — Story 3.3a (Task 1; AC1/AC4/AC5).
//
// The frozen seam's transport contracts: the neutral `KycProfile` / `KycError` shapes,
// the `KycErrorCode` taxonomy, and the thrown `KycProviderError` class + its envelope
// projection. Also asserts the abstraction is reachable from the `@twt/contracts` TOP
// barrel (the members/index.ts consume convention; the kyc/README subpath is NOT a
// resolvable import).

import { describe, expect, it } from 'vitest';

import * as topBarrel from '../src/index.js';
import { assertStrict } from '../src/_common/strict.js';
import {
  KYC_ERROR_RETRIABLE,
  KycCallbackPayload,
  KycError,
  KycErrorCode,
  KycInitiation,
  KycIntent,
  KycProfile,
  KycProviderError,
  KycTransactionStatus,
  KycVerificationStrength,
} from '../src/kyc/index.js';

describe('Story 3.3a — KYC abstraction is exported from the @twt/contracts top barrel', () => {
  it('exposes the frozen port + neutral shapes via the top barrel (AC3 consume convention)', () => {
    expect(topBarrel.KycProfile).toBe(KycProfile);
    expect(topBarrel.KycError).toBe(KycError);
    expect(topBarrel.KycProviderError).toBe(KycProviderError);
    expect(topBarrel.KycErrorCode).toBe(KycErrorCode);
  });
});

describe('KycProfile (AC4)', () => {
  const VALID: KycProfile = {
    aadhaarMaskedId: 'XXXX1234',
    name: 'Asha Devi',
    dob: '1990-01-01',
    photoUrl: 'handle://photo',
    verificationStrength: 'aadhaar_kyc',
  };

  it('is .strict()', () => {
    expect(() => assertStrict(KycProfile)).not.toThrow();
  });

  it('parses the exact five AC4 fields', () => {
    const parsed = KycProfile.parse(VALID);
    expect(parsed.aadhaarMaskedId).toBe('XXXX1234');
    expect(parsed.verificationStrength).toBe('aadhaar_kyc');
  });

  it('rejects an unknown top-level key (.strict())', () => {
    expect(KycProfile.safeParse({ ...VALID, fullAadhaar: '123412341234' }).success).toBe(false);
  });

  it('rejects an out-of-enum verificationStrength', () => {
    expect(KycProfile.safeParse({ ...VALID, verificationStrength: 'maybe' }).success).toBe(false);
  });

  it('verification-strength declares exactly the three values', () => {
    expect([...KycVerificationStrength.options].sort()).toEqual([
      'aadhaar_kyc',
      'self_declared',
      'unverified',
    ]);
  });
});

describe('KycErrorCode taxonomy (AC5)', () => {
  it('declares the three AC5-named codes plus the four additive refinements', () => {
    expect([...KycErrorCode.options].sort()).toEqual([
      'certificate_stale',
      'provider_unavailable',
      'signature_invalid',
      'transaction_expired',
      'transaction_not_found',
      'user_consent_denied',
      'verification_failed',
    ]);
  });

  it('the three AC5-named codes are present', () => {
    for (const code of ['provider_unavailable', 'user_consent_denied', 'verification_failed']) {
      expect(KycErrorCode.options).toContain(code);
    }
  });

  it('KYC_ERROR_RETRIABLE marks only provider_unavailable retriable', () => {
    expect(KYC_ERROR_RETRIABLE.provider_unavailable).toBe(true);
    for (const code of KycErrorCode.options) {
      if (code !== 'provider_unavailable') expect(KYC_ERROR_RETRIABLE[code]).toBe(false);
    }
  });
});

describe('KycError data shape (AC5)', () => {
  it('is .strict() and parses a valid value', () => {
    expect(() => assertStrict(KycError)).not.toThrow();
    expect(
      KycError.safeParse({ code: 'provider_unavailable', retriable: true, message: 'down' }).success,
    ).toBe(true);
  });

  it('rejects an out-of-enum code', () => {
    expect(KycError.safeParse({ code: 'kaput', retriable: false, message: 'x' }).success).toBe(false);
  });
});

describe('KycProviderError (AC5/AC7 — never silently accept)', () => {
  it('defaults retriable from KYC_ERROR_RETRIABLE', () => {
    expect(new KycProviderError('provider_unavailable', 'timeout').retriable).toBe(true);
    expect(new KycProviderError('signature_invalid', 'bad sig').retriable).toBe(false);
  });

  it('honours an explicit retriable override', () => {
    expect(new KycProviderError('verification_failed', 'x', true).retriable).toBe(true);
  });

  it('projects to the provider-neutral KycError', () => {
    const err = new KycProviderError('user_consent_denied', 'member declined');
    expect(KycError.parse(err.toKycError())).toEqual({
      code: 'user_consent_denied',
      retriable: false,
      message: 'member declined',
    });
  });

  it('projects to the wire error envelope with details.retriable', () => {
    const err = new KycProviderError('signature_invalid', 'sig mismatch');
    const env = err.toErrorResponse('11111111-1111-1111-1111-111111111111');
    expect(env).toEqual({
      error: {
        code: 'signature_invalid',
        message: 'sig mismatch',
        details: { retriable: false },
        request_id: '11111111-1111-1111-1111-111111111111',
      },
    });
  });

  it('is identifiable via the static type guard', () => {
    expect(KycProviderError.is(new KycProviderError('transaction_expired', 'expired'))).toBe(true);
    expect(KycProviderError.is(new Error('plain'))).toBe(false);
  });
});

describe('KycProvider port data shapes (AC1)', () => {
  it('KycInitiation is .strict() and parses a valid initiation', () => {
    expect(() => assertStrict(KycInitiation)).not.toThrow();
    expect(
      KycInitiation.safeParse({
        transactionId: 'txn-1',
        authorizationUrl: 'https://meripehchaan.gov.in/oauth2/1/authorize?x=1',
        expiresAt: '2026-06-25T00:15:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('KycInitiation rejects a non-URL authorizationUrl', () => {
    expect(
      KycInitiation.safeParse({
        transactionId: 'txn-1',
        authorizationUrl: 'not a url',
        expiresAt: '2026-06-25T00:15:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('KycCallbackPayload requires non-empty state + code', () => {
    expect(KycCallbackPayload.safeParse({ state: 's', code: 'c' }).success).toBe(true);
    expect(KycCallbackPayload.safeParse({ state: '', code: 'c' }).success).toBe(false);
  });

  it('KycTransactionStatus parses a known state', () => {
    expect(KycTransactionStatus.safeParse({ transactionId: 't', status: 'verified' }).success).toBe(
      true,
    );
    expect(KycTransactionStatus.safeParse({ transactionId: 't', status: 'bogus' }).success).toBe(
      false,
    );
  });

  it('KycIntent declares signup + relink', () => {
    expect([...KycIntent.options].sort()).toEqual(['relink', 'signup']);
  });
});
