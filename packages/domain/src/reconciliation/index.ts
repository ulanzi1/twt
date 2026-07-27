// Barrel for the reconciliation domain module — Story 9.3.
// Re-exported from @twt/domain as the `reconciliation` namespace (see ../index.ts) so consumers call
// `reconciliation.RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE` /
// `reconciliation.ReconciliationStatementUploadedPayloadSchema`, etc.
//
// Story 9.3 homes the FIRST `reconciliation.*` event vocabulary here (events.ts) — the statement-upload
// heartbeat/provenance event + the "padh lenge" manual-transcription-request fallback event (Decision D6:
// a NEW namespace, deliberately NOT `contribution.*`, to stay clear of Story 8.10's fence). The Story 9.4
// UTR matcher + triage-queue reads land in this module later.

export * from './events.js';
// Story 9.3 (Task 2) — the DB-scoped read the upload transport needs: the STAFF-path pool resolver
// (resolveLivePoolByClaim).
export * from './read.js';
// Story 9.4 (Task 1) — the PURE UTR matching engine (`matchPool`): primary UTR match + destination-first
// secondary + amount (paise units) + the D3 sender-VPA {available:false} seam. Deterministic + order-invariant.
export * from './matcher.js';
// Story 9.4 (Task 2; D4) — the persisted normalized bank-statement rows the matcher reads: the idempotent
// entry-upsert + the per-cycle read + the pure parsed-entry → row map.
export * from './entries.js';
// Story 9.4 (Task 3) — the matcher's input reads (the live cycle alert, the cycle pools, the pool statement
// uploads, the alert attestations) + the monotonic-confirmation pre-read (AC5a).
export * from './matcher-reads.js';
// Story 9.4 (Task 4) — the verdict WRITE primitives: appendConfirmedContribution (green) +
// appendReconciliationMismatch (red), on the alert stream (D2). NO reversal emitter exists (AC5b — the
// monotonic invariant is structural; the only un-confirm path is the Story 9.8 trustee compensating event).
export * from './matcher-write.js';
// Story 9.7 (Task 3) — the self-verify screenshot-upload evidence WRITE primitive
// (appendSelfVerifyScreenshotUploaded), on the alert stream (D2). PURE EVIDENCE INTAKE (AC4): it emits
// no verdict, remaps nothing, and triggers no matcher run. Kept out of matcher-write.ts so the 9.4
// monotonic-invariant fence (matcher-write exports exactly the two verdict emitters) stays green.
export * from './self-verify-write.js';
