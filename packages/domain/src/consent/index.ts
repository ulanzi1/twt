// Barrel for the consent-registry accessors — Story 2.7 (Task 2).
// Re-exported from @twt/domain as the `consent` namespace (see ../index.ts) so
// consumers call `consent.recordConsent(...)` / `consent.consentExists(...)`.
// Mirrors the `terms-and-conditions/` module shape.

export * from './read.js';
export * from './write.js';
export * from './errors.js';
