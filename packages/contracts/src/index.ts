// packages/contracts/src/index.ts
//
// Transport-contract source-of-truth per architecture §1.3 + §3.1 + AR-4 + AR-38.
// Per-domain endpoint contracts live in per-domain sub-directories
// (members/, claims/, pools/, alerts/, ...); each is owned by its per-Epic
// landing Story.

export * from './_common/index.js';
export * from './audit/index.js';
export * from './auth/index.js';
export * from './pariwar-passport/index.js';
export * from './pariwar-provisioning/index.js';
// Story 1.16b — FR-74 Public-vs-Private matrix schema + the PII scrape
// verification engine (consumed by the future tests/integration/public-pages/
// scrape-test.spec.ts, D13-1.2). Components/schemas only; no OpenAPI path.
export * from './public-pages/index.js';
// Story 1.16d — FR-7 / FR-100 Hook 1 forward-compat `BenefitMechanism` z.enum
// (the discriminator Epic 2's Story 2.3 clause_versions column imports; the
// enum the repo-global benefit-mechanism CI gate cross-checks). Plain z.enum;
// no OpenAPI path (openapi/v1.yaml stays byte-identical).
export * from './rules/index.js';
// Story 2.6 — T&C version-registry transport contracts (TcVersionResponse,
// CreateTcVersionRequest, ApproveTcVersionRequest, TcLegalReviewStatusSchema). The
// FIRST T&C endpoints — the DTOs register via `.openapi()` so openapi/v1.yaml changes.
export * from './terms-and-conditions/index.js';
// Story 2.7 — consent-registry transport DTOs (ConsentRecordResponse,
// RecordConsentRequest, RevokeConsentRequest, ConsentTypeSchema,
// ConsentGrantedViaSchema) for Epic 3/6 to import + the dual lockstep guard. NO
// endpoint in this story → NO `.openapi()` registration, openapi/v1.yaml unchanged.
export * from './consent/index.js';
// Story 3.2 — member mobile+OTP auth transport contracts (the first members/ DTOs).
// apps/api serves these member routes now → they register real `paths` in emit-openapi.ts.
export * from './members/index.js';
// Story 3.3a — DigiLocker KYC provider-abstraction contracts (the FROZEN seam:
// `KycProvider` port + `KycProfile` + `KycError` + `KycProviderError`). AR-43 /
// architectural-freeze row 13 — a future KYC-provider swap is a single-module change.
// NO `.openapi()` registration in 3.3a (no HTTP endpoint yet → openapi/v1.yaml
// byte-identical); the signup KYC surface DTOs land in Story 3.3b.
export * from './kyc/index.js';
// Story 3.4 — signup nominee-declaration transport DTOs (declare + status). The third
// signup-wizard SURFACE; registers real OpenAPI components + paths (see emit-openapi.ts).
export * from './nominee/index.js';
// Story 3.5 — signup medical-disclosure transport DTOs (submit + status + ima-list). The fourth
// signup-wizard SURFACE; registers real OpenAPI components + paths (see emit-openapi.ts).
export * from './medical/index.js';
// Story 3.6a — member-facing T&C read/accept transport DTOs (the signup wizard's `tc` step). The
// MEMBER surface (distinct from the trustee terms-and-conditions/ authoring DTOs); registers real
// OpenAPI components + paths (see emit-openapi.ts).
export * from './terms/index.js';
// Story 3.6b — signup ₹110 Vyawastha Shulk transport DTOs (intent + confirm + status). The FINAL
// signup-wizard SURFACE (closes the loop); registers real OpenAPI components + paths (see emit-openapi.ts).
export * from './payments/index.js';
// Story 3.8 — the renewal-reminder nudge SEAM (FR-23). The producing half (Epic 3 schedules); Epic 5's
// dispatcher subscribes later. Internal queue seam — NO `.openapi()` path, openapi/v1.yaml unchanged.
export * from './notifications/index.js';
// Story 3.9 — Life Events panel transport DTOs (address + posting update requests + the shared
// summary response). Nominee + medical Life Events routes REUSE the existing declare/submit
// contracts. Match the nominee/medical openapi posture — NO `.openapi()`, openapi/v1.yaml unchanged.
export * from './life-events/index.js';
// Story 3.10 — voluntary-withdrawal confirm request + status response + the bounded reason enum.
// Match the nominee/medical/life-events openapi posture — NO `.openapi()`, openapi/v1.yaml unchanged.
export * from './withdrawal/index.js';
// Story 3.11 — DPDPA data-export request/status DTOs + the ZIP section-shape schemas (validated in the
// job before zipping). Same openapi posture — NO `.openapi()`, openapi/v1.yaml unchanged.
export * from './data-export/index.js';
export * from './rbac/index.js';

export const CONTRACTS_API_VERSION = 'v1';

/**
 * Marker symbol used by the contract-↔-domain type-assignability test
 * (tests/type-assignability.test.ts) to assert this package is the
 * canonical contract source-of-truth (defense against Top-10 anti-pattern #2
 * — type-shadowing via hand-written dto.ts / *.types.ts).
 */
export const __substrateOnly = Symbol.for('@twt/contracts:substrate-only');
