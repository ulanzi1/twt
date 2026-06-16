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
export * from './rbac/index.js';

export const CONTRACTS_API_VERSION = 'v1';

/**
 * Marker symbol used by the contract-↔-domain type-assignability test
 * (tests/type-assignability.test.ts) to assert this package is the
 * canonical contract source-of-truth (defense against Top-10 anti-pattern #2
 * — type-shadowing via hand-written dto.ts / *.types.ts).
 */
export const __substrateOnly = Symbol.for('@twt/contracts:substrate-only');
