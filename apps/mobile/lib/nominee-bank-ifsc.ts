// The RBI IFSC format, client-side copy — Story 6.8 (review fix, 2026-07-11).
//
// Pulled out of the nominee-review.tsx route component into a pure module so it's testable without
// a React Native render harness (mirrors the claim-steps.ts / claim-draft.ts pure-logic split) and
// so a test can pin its `.source` against the other two hand-copies (`@twt/contracts`'s
// `NOMINEE_BANK_IFSC_REGEX`, `@twt/platform-adapters`'s `IFSC_REGEX`) to catch drift.

export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
