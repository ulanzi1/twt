// Barrel for the nominee-declaration accessors — Story 3.4 (Task 2).
// Re-exported from @twt/domain as the `nominee` namespace (see ../index.ts) so consumers
// call `nominee.replaceMemberNominees(...)` / `nominee.getMemberNominees(...)`. Mirrors the
// `kyc/` profile-read/profile-write split behind a barrel. No `errors.ts` — these accessors
// return rows, never throw typed domain errors (the route maps validation/lifecycle errors).

export * from './declaration-write.js';
export * from './declaration-read.js';
// Story 6.18 — the (rank, created_at) DECLARATION-REF projection the name-check staleness token is
// derived from. A misuse-resistance accessor: it carries no name field, so the check write path
// structurally cannot reach a nominee's name (Trap 1 / Trap 4).
export * from './declaration-ref.js';
export * from './split.js';
