// Contribution read primitive barrel — Story 8.3 (Task 1).
//
// Re-exported from @twt/domain as the `contribution` namespace (see ../index.ts). The FIRST contribution
// read accessor: the confirmed-contributor list read (confirmed-only, [[feedback_record_unattested_no_backfill]])
// + the pure pending-aggregate. It reads `contribution.confirmed` event-derived state — it NEVER produces,
// confirms, or promotes contribution state (Epic 9 owns the producer; Story 8.4 owns yellow attestation).

export * from './read.js';
// Story 8.4 — the FIRST contribution WRITE surface: the `contribution.utr-attested` event vocabulary
// (yellow pill; attestation_only:true) + the idempotent `attestContributionUtr` write primitive. Green
// (`contribution.confirmed`) stays Epic 9's exclusive producer — NOT authored here.
export * from './events.js';
export * from './write.js';
// Story 8.4 — the pure UPI Intent builder + the nominee-VPA resolver seam (returns absent today, D1).
export * from './intent.js';
// Story 8.6 — the member's OWN contribution-history read (Yogdaan Bahi self-view) + the pure five-state
// status derivation (green≻red≻yellow-open≻grey-closed). Member-scoped (D1); green/red are Epic 9's
// forward contract (empty today). Reads `contribution.utr-attested` (D2) + the 8.1 alert projection.
export * from './history.js';
// Story 9.7 — the member self-verify recovery READ (does this member have an unresolved mismatch on a
// pool; what reason; has a screenshot been uploaded; the default/uploaded/resolved lifecycle). Member-
// scoped (D1); pure observation over events_log — it adjudicates nothing (AC4).
export * from './self-verify.js';
