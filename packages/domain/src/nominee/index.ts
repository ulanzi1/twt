// Barrel for the nominee-declaration accessors — Story 3.4 (Task 2).
// Re-exported from @twt/domain as the `nominee` namespace (see ../index.ts) so consumers
// call `nominee.replaceMemberNominees(...)` / `nominee.getMemberNominees(...)`. Mirrors the
// `kyc/` profile-read/profile-write split behind a barrel. No `errors.ts` — these accessors
// return rows, never throw typed domain errors (the route maps validation/lifecycle errors).

export * from './declaration-write.js';
export * from './declaration-read.js';
// ⚠ Story 6.18's `declaration-ref.ts` (the `(rank, created_at)` refs of the CURRENT rows) is GONE —
// Story 6.20 (AC5) moved the name-check token to the EFFECTIVE as-at-death declaration
// (`claim/nominee-effective.ts`), which is equally ref-only (ranks, version ids, a determination id) and
// ⛔ never reaches a name. Its misuse-resistance property survives there, ⛔ not here.
export * from './split.js';
// Story 6.20 — the append-only version HISTORY (D1, D2, T9): head-of-chain, plan + append, the
// timeline listing and the database clock. ⛔ This module never imports from `claim/` (T5).
export * from './declaration-history.js';
// Story 6.20 (AC12) — the fifteen-value relationship vocabulary + the `other`-forecloses predicate.
export * from './relationship.js';
