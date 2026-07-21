// The NPCI UPI VPA (`handle@psp`) format, client-side copy — Story 8.13.
//
// Pulled into a pure module (mirrors `nominee-bank-ifsc.ts` `IFSC_RE`) so it's testable without a
// React Native render harness and so a test can pin its `.source` against the contract's
// `NOMINEE_BANK_VPA_REGEX` (`@twt/contracts`) to catch drift. This is the PAYEE (nominee) VPA — the
// `pa=` money-in destination — NOT the Story 9.4 sender (member) VPA.

export const VPA_RE = /^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9.\-_]{1,63}$/
