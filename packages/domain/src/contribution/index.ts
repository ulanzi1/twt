// Contribution read primitive barrel — Story 8.3 (Task 1).
//
// Re-exported from @twt/domain as the `contribution` namespace (see ../index.ts). The FIRST contribution
// read accessor: the confirmed-contributor list read (confirmed-only, [[feedback_record_unattested_no_backfill]])
// + the pure pending-aggregate. It reads `contribution.confirmed` event-derived state — it NEVER produces,
// confirms, or promotes contribution state (Epic 9 owns the producer; Story 8.4 owns yellow attestation).

export * from './read.js';
