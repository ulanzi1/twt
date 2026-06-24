// Barrel for the T&C version-registry accessors — Story 2.6 (Task 3).
// Re-exported from @twt/domain as the `termsAndConditions` namespace (see
// ../index.ts) so consumers call `termsAndConditions.getEffectiveTc(...)` /
// `termsAndConditions.createTcVersion(...)`. Mirrors the `niyamavali/` module shape.

export * from './read.js';
export * from './write.js';
export * from './errors.js';
export * from './render-markdown.js';
