// Ravi-mode claim-flow step order (Story 6.2, Task 5; AC6).
//
// The single source of truth for the ordered claim-intake flow the (claim) group renders.
// The layout derives the "Step N of M" progress indicator from it; each step screen advances
// to the next via an inline typed-route literal (expo-router typedRoutes rejects computed Href
// strings, so the literals live in the screens — this list keeps the ORDER + the progress math
// in one place). Lives in lib/ (NOT under app/) so expo-router does not treat it as a route.
// Mirrors lib/wizard-steps.ts.
//
// Order rationale (the epic AC, NOT the UX Journey-2 diagram — see the story Dev Notes "AC / UX
// ordering variance"): the (claim)/index entry gate → handover-trust OTP → relationship-confirm
// (this is where claim.intake_initiated is emitted + the account freezes) → death-cert upload →
// nominee review → acknowledgement. Handover-trust MUST be established BEFORE the freeze.
//
// ── Claim-time DPDPA consent step (Story 6.9) ─────────────────────────────────────────────────
// Story 6.9 adds a 3-checkbox DPDPA consent step. It slots AFTER `relationship` (post-intake) and
// BEFORE `document` — activating the slot the Story 6.2 author pre-reserved. Because each screen
// hardcodes its OWN next-route literal and the progress math derives M from this list's length,
// uncommenting `'consent'` here reshuffled NO existing typed-route literals (relationship.tsx now
// pushes /(claim)/consent and consent.tsx pushes /(claim)/document — the two adjacent screens).

export const CLAIM_STEPS = [
  'handover-otp',
  'relationship',
  'consent', // Story 6.9 — claim-time DPDPA consent (three granular opt-ins).
  'document',
  'nominee-review',
  'acknowledgement',
] as const

export type ClaimStep = (typeof CLAIM_STEPS)[number]

/** The 1-based position + total for a step's "Step N of M" progress label. Returns
 * `{ current: 1, total }` for a segment not in the list (e.g. the entry gate). */
export function claimStepProgress(step: string): { current: number; total: number } {
  const idx = (CLAIM_STEPS as readonly string[]).indexOf(step)
  return { current: idx >= 0 ? idx + 1 : 1, total: CLAIM_STEPS.length }
}

/** The step immediately after `step`, or `undefined` if `step` is the last one. Used by the
 * entry gate to resume just past the last COMPLETED step recorded in the draft (`lastStep`). */
export function nextClaimStep(step: ClaimStep): ClaimStep | undefined {
  const idx = CLAIM_STEPS.indexOf(step)
  return idx >= 0 ? CLAIM_STEPS[idx + 1] : undefined
}
