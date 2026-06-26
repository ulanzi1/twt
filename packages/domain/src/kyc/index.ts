// Barrel for the KYC substrate accessors — Story 3.3a (Task 3).
// Re-exported from @twt/domain as the `kyc` namespace (see ../index.ts) so consumers
// call `kyc.getActiveCertByKeyId(...)` / `kyc.insertKycTransaction(...)`. Mirrors the
// `consent/` module shape (read / write split behind a barrel). No `errors.ts` — the
// thrown `KycProviderError` lives in `@twt/contracts/kyc` (the provider catches DB
// nulls and normalizes to it); this substrate returns nullable rows, never throws typed
// domain errors.

export * from './read.js';
export * from './write.js';
