// packages/contracts/src/errors/index.ts
//
// Per-domain error-code enumeration marker barrel. Downstream Stories add
// per-domain files (errors/claim.ts, errors/pool.ts, errors/member.ts, ...)
// each exporting a const-asserted map of namespaced error codes per
// architecture §3.2 line 1830 "Enumerated in packages/contracts/errors/".
//
// The error-code envelope + the `defineErrorCode` factory live in
// `packages/contracts/src/_common/errors.ts` (Story 1.4 substrate).
export {};
