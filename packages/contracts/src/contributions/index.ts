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
// Story 10.26 — the personal-event ASSERTION: a bounded-vocabulary RECORD with no counterparty. NO
// free-text field (D3), and no `status`/`approved`/`decision` anywhere in the shapes — the ratified
// Niyamavali §3.1 says the assertion "grants no restoration relief and carries no consequence of its
// own", so an approval-shaped API would make a false promise STRUCTURAL (AC1).
export * from './personal-event.js';
// Story 11b.15 — the MEMBER'S DRIVE LIST read model: every drive in the member's OWN Pariwar at
// `live` · `closed` · `settled`, paginated. ⭐ Its field set is a FLOOR set by the PUBLIC Sahyog
// Drive index (`2026-09-04-189` cl.3 — *member ≥ public*, scoped by `-195` cl.1 to the drive data
// class). ⛔ NO banking coordinates (story F's), ⛔ no contributor names, ⛔ no per-member amounts,
// ⛔ no `spawned` rows, and ⛔ no `pariwarId` query parameter — the scope comes from the SESSION.
export * from './member-drive-list.js';
// ⭐⭐ Story 11b.17 — the MEMBER'S VIEW OF **ONE** DRIVE: everything the PUBLIC Sahyog Vivran page
// carries for that drive, ⭐ PLUS the nominee's complete, UNMASKED banking coordinates — which the
// public page, since story A (`11b-11`), carries ⛔ NONE of (`2026-09-04-190` cl.3 as scoped by
// `-199`: **any authenticated member, any drive in their OWN Pariwar**).
// ⚠⛔ A **NEW CONTRACT** and ⛔ NOT a field added to `MemberDriveListEntry` — that entry is `.strict()`
// and `api-client`'s `call` throws, so one additive field BLANKS THE WHOLE TAB for every member on an
// installed build older than the API release (`deferred-work.md`, the 11b-15 THIRD-pass `.strict()`
// item, which names this story twice and whose own remediation is *"prefer a NEW contract"*).
// ⛔ NO `vpa` on this wire, on ⛔ any drive, in ⛔ any stage — `2026-09-10-212` cl.2 ruled the UPI ID
// onto the PAYMENT screen, and `8-17` (`done`) shipped that half.
export * from './member-drive-detail.js';
