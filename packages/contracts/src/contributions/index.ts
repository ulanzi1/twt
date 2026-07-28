// packages/contracts/src/contributions/index.ts — the contributions contract barrel.
//
// Story 8.2 lands the FIRST contribution contract: a READ-MODEL response shape for the My Pool
// home-screen card (presentation only). Substantive write/intent contracts (contribution intent,
// UPI Intent surface, bank-statement intake, UTR matching) land 9.x — see the directory README.

export * from './active-contribution-card.js';
// Story 8.3 — the Live Contributor List read model (confirmed rows + aggregate pending). Confirmed-only,
// PII-shielded, NO yellow/attested/pending-identity field (the load-bearing invariant as a `.strict()` shape).
export * from './pool-contributor-list.js';
// Story 8.4 — the FIRST contribution WRITE surface: UPI Intent + UTR self-attestation request/response
// shapes + the member-scoped `myContribution` (yellow) status. Yellow is a per-member self-state, NEVER an
// aggregate/confirmed count (the load-bearing invariant as a `.strict()` shape).
export * from './upi-intent.js';
// Story 9.9 — the donor-facing nominee-payment-destinations READ model: up to two EQUAL accounts (bank-name
// label + nominee name + full account#/IFSC + `vpaPresent`), stable order by `rank` (identity, NOT a
// priority). NO primary/secondary/default field (the equal-choice invariant as a `.strict()` shape).
export * from './nominee-accounts.js';
// Story 8.5 — the UPI Failure Coach anonymous failure-report request (mode enum ONLY, NO free-text field —
// the AC3 PII guard as a `.strict()` shape). Best-effort telemetry for the diagnostic failure coach.
export * from './upi-failure.js';
// Story 8.6 — the Yogdaan Bahi contribution-history READ model (a member's OWN self-view): rows with the
// five-state `status` + PII-shielded deceased-family identity + the Contribution-Note seam. NO other-member
// field, NO UTR/tr, NO nominee/bank data (the PII discipline as a `.strict()` shape + a no-extra-PII test).
export * from './contribution-history.js';
// Story 8.7 — the Yogdaan Pratigya (Contribution Note) PDF: the render-ready `ContributionNoteFacts`
// (`.strict()`, `utr` structurally impossible on a non-green Note — the AC3 over-claim guard) + the
// `ContributionNotePdfRenderer` port (the 6.5 `ClaimDocumentStorage` precedent). NEVER a "receipt".
export * from './contribution-note.js';
// Story 9.7 — the member self-verify RECOVERY contracts: the mismatch reason-code vocabulary (lockstep
// with @twt/domain), the `<SelfVerifySurface>` read DTO (default/uploaded/resolved), and the
// screenshot-upload request/response shapes. Evidence-intake only — no reconciliation-outcome field (AC4).
export * from './self-verify.js';
