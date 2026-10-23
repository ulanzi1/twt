// Step-up contexts the GENERIC member route may ⛔ never mint (Story 11b.4, MA19 / Trap 13 — `#decision-2026-10-24-398`).
//
// The generic `POST /api/v1/member/auth/step-up/request` texts the code to the SESSION member's own mobile. Under Ravi-mode
// the session member is the DECEASED, so a context listed here — one whose code goes to someone OTHER than the session
// member — could otherwise be elevated by whoever holds the deceased's phone, with ⛔ no nominee (`-391` Q1 A unenforced).
// Each listed context is minted ONLY by its own sender: `claim_handover` by `sendHandoverOtp` / `verifyHandoverOtp`
// (`/api/v1/member/claims/handover-otp{,/verify}`), which texts the NOMINEE.
//
// ⚠ A by-value literal (the auth module does ⛔ not import the claims service); `dedicated-step-up-contexts.test.ts` pins
// the set EQUAL to `[CLAIM_HANDOVER_ACTION_CONTEXT]`. ⛔ Never add a context here without its own sender.

/** Contexts whose code goes to someone other than the session member — minted ONLY by their own sender. */
export const DEDICATED_STEP_UP_CONTEXTS: readonly string[] = ['claim_handover'];

export function isDedicatedStepUpContext(actionContext: string): boolean {
  return DEDICATED_STEP_UP_CONTEXTS.includes(actionContext);
}
