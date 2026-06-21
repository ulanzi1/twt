// Barrel for the Niyamavali rule-registry accessors — Story 2.3 (Task 6).
// Re-exported from @twt/domain as the `niyamavali` namespace (see ../index.ts) so
// consumers call `niyamavali.createClause(...)` / `niyamavali.resolveByClauseId(...)`.
// Mirrors the `pariwar-passport/` read / write / index module shape.

export * from './read.js';
export * from './write.js';
export * from './diff.js';
export * from './scope.js';
export * from './errors.js';
// Story 2.4 — the server-persisted draft store + content-bound sign-off resolver.
export * from './drafts.js';
