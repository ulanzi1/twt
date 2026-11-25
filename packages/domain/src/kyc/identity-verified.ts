// "Is this member's identity VERIFIED?" — ONE definition (Story 3.13, N1 / N1a). Pure; transport-free; ⛔ DB.
//
// A member's identity is verified when it came through DigiLocker (`verification_strength = 'aadhaar_kyc'`) OR when
// staff have checked a typed-in identity (`trustee_verified = true`, written ONLY by `markKycTrusteeVerified`, DL2).
// Three readers must never disagree:
//   · 6.39's after-death identity half (`claim/membership-check-approval.ts` `isIdentityCheckRequired`) — a LEAF that
//     may import nothing new (its own header), so it keeps its own copy and a LOCKSTEP test pins
//     `!isKycIdentityVerified(x) === isIdentityCheckRequired(x)` over every input (AC7);
//   · this story's eligibility (DL4) — a member whose identity is verified is ⛔ checked again;
//   · row `3-14`'s `member.lock_in_expired` producer (`kyc_verified`) — ⛔ built; it will read THIS.

import type { MemberKycVerificationStrength } from '../schema/member_kyc_profiles.js';

/** The two plaintext KYC columns that decide it — or `null` when the member has no KYC row (fails CLOSED). */
export interface KycIdentityStanding {
  readonly verificationStrength: string;
  readonly trusteeVerified: boolean;
}

/** ⭐ N1 — THE definition of "verified": DigiLocker, or a typed-in identity staff have checked. `null` ⇒ ⛔ verified. */
export function isKycIdentityVerified(standing: KycIdentityStanding | null): boolean {
  if (standing === null) return false;
  return standing.verificationStrength === 'aadhaar_kyc' || standing.trusteeVerified;
}

/**
 * ⭐ N1a — WHICH identities staff may check in life: ONE total map over the strength enum, ⛔ a literal at each site.
 * `self_declared` (typed in at joining) only, today. `aadhaar_kyc` is DigiLocker's (already verified); `unverified` is
 * the enum's headroom value, never written in production (fail closed).
 * ⚠ The `satisfies` is the point: row `3-16` mints a new strength for a document-checked identity (`-482`), and that
 * value FAILS TO COMPILE here until its reshape classifies it — it cannot silently fall out of the queue (or into it).
 */
export const KYC_STRENGTH_STAFF_CHECKABLE = {
  aadhaar_kyc: false,
  self_declared: true,
  unverified: false,
} as const satisfies Record<MemberKycVerificationStrength, boolean>;

/** The staff-checkable strengths, DERIVED from the map — what an SQL site binds (`= ANY($n)`), ⛔ a string literal. */
export const KYC_STAFF_CHECKABLE_STRENGTHS: readonly MemberKycVerificationStrength[] = (
  Object.keys(KYC_STRENGTH_STAFF_CHECKABLE) as MemberKycVerificationStrength[]
).filter((s) => KYC_STRENGTH_STAFF_CHECKABLE[s]);

/** Is this strength one staff may check (N1a)? An unknown string ⇒ ⛔. */
export function isKycStrengthStaffCheckable(strength: string): boolean {
  return (KYC_STAFF_CHECKABLE_STRENGTHS as readonly string[]).includes(strength);
}
