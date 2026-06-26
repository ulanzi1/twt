// packages/contracts/src/kyc/profile.ts
//
// The provider-NEUTRAL KYC profile shape (Story 3.3a, AC1/AC4). This is the
// frozen abstraction's payload type: whatever KYC provider is active (DigiLocker
// today; an aggregator after a future FR-58C swap), `verifyAndPullProfile` maps the
// raw provider response into THIS shape. Consumers (Story 3.3b signup) depend only
// on `KycProfile` — never on the DigiLocker eAadhaar-XML shape (architectural-freeze
// row 13 / AR-43: a provider swap is a single-module change, not a rewrite).
//
// ⚠ PII: `name`, `dob`, `photoUrl`, and the masked-Aadhaar are Tier-1 PII (§2.7).
// NEVER log a `KycProfile`. `aadhaarMaskedId` is masked at the provider boundary
// (last-4 only) — the full Aadhaar number never enters this shape. There is NO
// `.openapi()` registration here (3.3a ships no HTTP endpoint), so this shape never
// reaches a public-surface schema; keep it that way (the `contracts:check-pii-scrape`
// discipline).
//
// `.strict()` per the contracts directory discipline (see kyc/README.md +
// architecture §Format patterns L3824-3826).

import { z } from 'zod';

/**
 * How strongly the member's identity was verified. A DigiLocker eAadhaar pull yields
 * `aadhaar_kyc`; the Story 3.3b manual fallback yields `self_declared`; `unverified`
 * is the pre-KYC baseline. The literal set is additive-refinement headroom beyond the
 * three AC-named codes (recorded as a deliberate variance in the story).
 */
export const KycVerificationStrength = z.enum(['aadhaar_kyc', 'self_declared', 'unverified']);
export type KycVerificationStrength = z.output<typeof KycVerificationStrength>;

/**
 * The provider-neutral profile produced by `KycProvider.verifyAndPullProfile` (AC4).
 * The EXACT five fields the AC names. Field semantics:
 *   · `aadhaarMaskedId` — last 4 digits only, masked at the provider boundary.
 *   · `name` / `dob`    — from the eAadhaar (DoB is the eAadhaar's string form).
 *   · `photoUrl`        — a reference/handle to the eAadhaar photo; NEVER logged.
 *   · `verificationStrength` — `aadhaar_kyc` for a DigiLocker pull.
 */
export const KycProfile = z
  .object({
    aadhaarMaskedId: z.string(),
    name: z.string(),
    dob: z.string(),
    photoUrl: z.string(),
    verificationStrength: KycVerificationStrength,
  })
  .strict();
export type KycProfile = z.output<typeof KycProfile>;
