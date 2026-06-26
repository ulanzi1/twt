// Barrel for the nominee-declaration accessors — Story 3.4 (Task 2).
// Re-exported from @twt/domain as the `nominee` namespace (see ../index.ts) so consumers
// call `nominee.replaceMemberNominees(...)` / `nominee.getMemberNominees(...)`. Mirrors the
// `kyc/` profile-read/profile-write split behind a barrel. No `errors.ts` — these accessors
// return rows, never throw typed domain errors (the route maps validation/lifecycle errors).

export * from './declaration-write.js';
export * from './declaration-read.js';
export * from './split.js';
