// packages/contracts/src/consent/index.ts
//
// Barrel for the consent-registry transport contracts (Story 2.7). Re-exported from
// the package root (packages/contracts/src/index.ts) so consumers import the
// `ConsentRecordResponse` / `RecordConsentRequest` / `RevokeConsentRequest` DTOs +
// the `ConsentTypeSchema` / `ConsentGrantedViaSchema` enums from `@twt/contracts`.
// Story 2.7 ships NO endpoint, so these DTOs register NO `.openapi()` path and
// `openapi/v1.yaml` is unchanged — Epic 3/6 own that wiring. The dual lockstep test
// lives in tests/consent.test.ts.

export * from './consent-record.js';
