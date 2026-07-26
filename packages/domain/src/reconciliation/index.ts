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
