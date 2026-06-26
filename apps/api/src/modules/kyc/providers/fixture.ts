// Fixture KYC provider — Story 3.3a (Task 4; the config/secrets seam fallback).
//
// Mirrors the Turnstile `noopTurnstileVerifier` seam: when DigiLocker config is ABSENT,
// `deps.ts` resolves the active provider to THIS fixture so the API boots with ZERO live
// government config and CI NEVER calls the real DigiLocker API (the story's hard rule).
// Deterministic canned responses so registry/seam tests are stable. It implements the
// frozen `KycProvider` port exactly — proving a non-DigiLocker provider drops into the
// registry with no consumer change (AR-43 / AC6).

import type {
  KycInitiation,
  KycProfile,
  KycProvider,
  KycTransactionStatus,
} from '@twt/contracts';

// The port params (memberId/intent/callback) are intentionally OMITTED here — the fixture
// ignores them and a function with fewer params is assignable to the interface (the
// `noopTurnstileVerifier.verify()` convention; avoids the no-unused-vars lint on stub args).
export const fixtureKycProvider: KycProvider = {
  async initiate(): Promise<KycInitiation> {
    return {
      transactionId: 'fixture-txn-00000000-0000-0000-0000-000000000001',
      authorizationUrl: 'http://localhost/mock-digilocker/authorize',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },
  async verifyAndPullProfile(): Promise<KycProfile> {
    return {
      aadhaarMaskedId: 'XXXX',
      name: 'Fixture Member',
      dob: '1990-01-01',
      photoUrl: '',
      verificationStrength: 'aadhaar_kyc',
    };
  },
  async getStatus(transactionId: string): Promise<KycTransactionStatus> {
    return { transactionId, status: 'verified' };
  },
};
