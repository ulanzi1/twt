// packages/contracts/src/terms-and-conditions/index.ts
//
// Barrel for the T&C version-registry transport contracts (Story 2.6). Re-exported
// from the package root (packages/contracts/src/index.ts) so consumers import the
// `TcVersionResponse` / `CreateTcVersionRequest` / `ApproveTcVersionRequest` DTOs +
// the `TcLegalReviewStatusSchema` enum from `@twt/contracts`. These are the FIRST
// T&C endpoints, so the DTOs register via `.openapi()` in emit-openapi.ts and
// `openapi/v1.yaml` changes (expected). The lockstep test lives in
// tests/terms-and-conditions.test.ts.

export * from './tc-version.js';
