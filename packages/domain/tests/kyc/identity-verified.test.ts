// Story 3.13 — N1 / N1a / AC7: ONE definition of "verified", in lockstep with 6.39's after-death identity half; and ONE
// total map of which strengths staff may check. ⛔ DB.

import { describe, expect, it } from 'vitest';

import { isIdentityCheckRequired } from '../../src/claim/membership-check-approval.js';
import {
  KYC_STAFF_CHECKABLE_STRENGTHS,
  KYC_STRENGTH_STAFF_CHECKABLE,
  isKycIdentityVerified,
  isKycStrengthStaffCheckable,
  type KycIdentityStanding,
} from '../../src/kyc/identity-verified.js';
import { MEMBER_KYC_VERIFICATION_STRENGTHS } from '../../src/schema/member_kyc_profiles.js';

/** Every input: no row, and every strength READ FROM THE ENUM CONST (⛔ a hand list of three) × both flags. */
const INPUTS: (KycIdentityStanding | null)[] = [
  null,
  ...MEMBER_KYC_VERIFICATION_STRENGTHS.flatMap((verificationStrength) =>
    [true, false].map((trusteeVerified) => ({ verificationStrength, trusteeVerified })),
  ),
];

describe('Story 3.13 — N1: ONE definition of "verified" (AC7)', () => {
  it('the input set covers every strength of the enum × both flags, plus no row', () => {
    expect(INPUTS).toHaveLength(1 + MEMBER_KYC_VERIFICATION_STRENGTHS.length * 2);
  });

  it.each(INPUTS.map((x) => [JSON.stringify(x), x] as const))(
    '⭐ lockstep with 6.39: !isKycIdentityVerified(%s) === isIdentityCheckRequired(…)',
    (_label, x) => {
      expect(!isKycIdentityVerified(x)).toBe(isIdentityCheckRequired(x));
    },
  );

  it('the definition: DigiLocker, or a typed-in identity staff have checked; no row fails closed', () => {
    expect(isKycIdentityVerified(null)).toBe(false);
    expect(isKycIdentityVerified({ verificationStrength: 'aadhaar_kyc', trusteeVerified: false })).toBe(true);
    expect(isKycIdentityVerified({ verificationStrength: 'self_declared', trusteeVerified: false })).toBe(false);
    expect(isKycIdentityVerified({ verificationStrength: 'self_declared', trusteeVerified: true })).toBe(true);
    expect(isKycIdentityVerified({ verificationStrength: 'unverified', trusteeVerified: false })).toBe(false);
  });
});

describe('Story 3.13 — N1a: which strengths staff may check is ONE total map', () => {
  it('the map has exactly one key per enum value (the `satisfies` is the compile-time leg)', () => {
    expect(Object.keys(KYC_STRENGTH_STAFF_CHECKABLE).sort()).toEqual([...MEMBER_KYC_VERIFICATION_STRENGTHS].sort());
  });

  it("⭐ today's classification: `self_declared` only", () => {
    expect(KYC_STAFF_CHECKABLE_STRENGTHS).toEqual(['self_declared']);
    expect(isKycStrengthStaffCheckable('self_declared')).toBe(true);
    expect(isKycStrengthStaffCheckable('aadhaar_kyc')).toBe(false);
    expect(isKycStrengthStaffCheckable('unverified')).toBe(false);
    expect(isKycStrengthStaffCheckable('document_checked')).toBe(false);
  });
});
