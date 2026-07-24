// Barrel for the KYC substrate accessors — Story 3.3a (Task 3).
// Re-exported from @twt/domain as the `kyc` namespace (see ../index.ts) so consumers
// call `kyc.getActiveCertByKeyId(...)` / `kyc.insertKycTransaction(...)`. Mirrors the
// `consent/` module shape (read / write split behind a barrel). No `errors.ts` — the
// thrown `KycProviderError` lives in `@twt/contracts/kyc` (the provider catches DB
// nulls and normalizes to it); this substrate returns nullable rows, never throws typed
// domain errors.

export * from './read.js';
export * from './write.js';
// Story 3.3b — member_kyc_profiles accessors (the confirm/manual write + the status read).
export * from './profile-read.js';
export * from './profile-write.js';
// Story 3.3a cert-refresh primitive, RELOCATED here in 3.3b (R6) so apps/jobs (the daily
// cron) reuses it without a package cycle. Gate-safe — node:crypto X.509 only, never the
// DigiLocker transport. `kyc.refreshDigiLockerCerts(db, fetcher, { now })`.
export * from './cert-refresh.js';
// Story 8.2's PII-shielding name split, RELOCATED here in 8.8 (Task 1) so the apps/jobs cycle-open
// notification payload can shield the deceased family's name exactly as the apps/api surfaces do
// (apps cannot import apps). apps/api's member-pool/name.ts re-exports it. Pure string work.
export * from './name.js';
