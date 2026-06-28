// Signup-wizard step order (Story 3.6a, Task 6; AC4 / R6).
//
// The single source of truth for the ordered signup flow the (signup) group renders. The layout
// derives the progress indicator from it; each step screen advances to the next via an inline typed
// route literal (expo-router typedRoutes rejects computed Href strings, so the literals live in the
// screens — this list keeps the ORDER + the progress math in one place). Lives in lib/ (NOT under
// app/) so expo-router does not treat it as a route.
//
// Order rationale (R6): accept terms first; KYC is the only state-advancing step before payment;
// nominees/medical/T&C are non-transition markers/consents recorded in pending-kyc / pending-fee.
// The HARD constraint is only that the tc_acceptance consent + nominee + medical events exist BEFORE
// the Story 3.6b lock-in gate — `tc` first is the clean signup convention. `payment` is the 3.6a
// hand-off PLACEHOLDER; Story 3.6b replaces it with the real UPI + lock-in flow.

export const WIZARD_STEPS = ['tc', 'kyc', 'nominees', 'medical', 'payment'] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]
