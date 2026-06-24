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
export * from './rbac/index.js';

export const CONTRACTS_API_VERSION = 'v1';

/**
 * Marker symbol used by the contract-↔-domain type-assignability test
 * (tests/type-assignability.test.ts) to assert this package is the
 * canonical contract source-of-truth (defense against Top-10 anti-pattern #2
 * — type-shadowing via hand-written dto.ts / *.types.ts).
 */
export const __substrateOnly = Symbol.for('@twt/contracts:substrate-only');
