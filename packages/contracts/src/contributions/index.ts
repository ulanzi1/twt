// packages/contracts/src/contributions/index.ts — the contributions contract barrel.
//
// Story 8.2 lands the FIRST contribution contract: a READ-MODEL response shape for the My Pool
// home-screen card (presentation only). Substantive write/intent contracts (contribution intent,
// UPI Intent surface, bank-statement intake, UTR matching) land 9.x — see the directory README.

export * from './active-contribution-card.js';
// Story 8.3 — the Live Contributor List read model (confirmed rows + aggregate pending). Confirmed-only,
// PII-shielded, NO yellow/attested/pending-identity field (the load-bearing invariant as a `.strict()` shape).
export * from './pool-contributor-list.js';
