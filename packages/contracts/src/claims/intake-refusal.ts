// packages/contracts/src/claims/intake-refusal.ts
//
// Story 6.38 (DL6, DL8; `2026-10-30-423` Q3 B, `2026-10-31-424` Q1 (b) B, Q3 B) — the claim DOOR's wire vocabulary.
//
// A claim for someone who was ⛔ a member when their death was first reported is refused at the door with 409
// `claim.intake_refused`. ⭐ ONLY the HELPLINE route's 409 carries `details.reason` (the operator is shown WHY, so a
// mistyped search can be re-checked with the caller — `-423` reading 3); the MEMBER route's 409 carries ⛔ `details` at
// all — the app shows one general reason, and a reason the screen hides but the wire carries is a disclosure (N7).
//
// ⚠ MIRRORED, ⛔ imported: the domain owns the tuple (`@twt/domain` `claim/intake-door.ts` `CLAIM_INTAKE_REFUSAL_REASONS`
// — domain ⛔ imports contracts, a turbo cycle). `packages/contracts/tests/claims-intake-refusal.test.ts` pins the two equal.

/** The 409 code both intake routes answer when the claim door refuses. */
export const CLAIM_INTAKE_REFUSED_CODE = 'claim.intake_refused';

/** The five reasons (helpline wire only) — `erased` · `removed` · `left` · `not_joined` · `not_paid`. */
export const CLAIM_INTAKE_REFUSAL_REASONS = ['erased', 'removed', 'left', 'not_joined', 'not_paid'] as const;
export type ClaimIntakeRefusalReason = (typeof CLAIM_INTAKE_REFUSAL_REASONS)[number];

/** Is `value` one of the five reasons? (The admin console's guard before it picks a reason's line.) */
export function isClaimIntakeRefusalReason(value: unknown): value is ClaimIntakeRefusalReason {
  return typeof value === 'string' && (CLAIM_INTAKE_REFUSAL_REASONS as readonly string[]).includes(value);
}
