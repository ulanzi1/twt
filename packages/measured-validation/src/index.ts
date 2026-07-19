// @twt/measured-validation — the shared measured-validation CORE (AI-6-2), extracted to its own
// package at Story-7.9 time (RATIFIED Path A, BigDev 2026-07-19).
//
// This is the ONE percentile / evidence / replay / provenance core that BOTH the validity surfaces
// (FR-12A cached-path + 4.7 admin-search-with-KMS, in packages/validity-service/tests/) AND the pool
// engine's pre-launch capacity gate (Story 7.9, in apps/jobs/tests/) import — no NEW duplicated
// measurement code was introduced by this extraction (grep-verifiable: every importer of this core
// pulls from here, not a local copy). One pre-existing, deliberately-NOT-migrated exception predates
// this package: packages/domain/tests/integration/member/search-projection-bench.spec.ts carries its
// own `percentile()` because @twt/domain cannot depend on a package that (transitively) depends on it
// — see that file's own header comment for the architecture-driven rationale.
//
// ── Why a package now (it was `tests/` tooling before) ────────────────────────
// AI-6-2 delivered this core as shared `tests/framework/` tooling INSIDE the validity-service package
// (D3, BigDev 2026-07-17) because Epic 7 was all-backlog — no SECOND consumer package existed yet, so
// a `packages/measured-validation` extraction would have been premature ([[feedback_no_premature_package]]).
// Story 7.9 IS that second consumer package (the pool saga lives in @twt/domain + apps/jobs, and one
// package's `tests/` dir is not importable from another package), so the extraction is now justified —
// exactly the "7.9-time move" the AI-6-2 index header + README pre-planned. The core moved UNCHANGED;
// the `EVIDENCE_SCHEMA_VERSION` + `metric` guards prove the recorded-evidence continuity across the move.
//
// ── What stayed behind ─────────────────────────────────────────────────────────
// The DOMAIN-SPECIFIC seeders (`seedValidityMembers` / `seedSearchMembers` / `resolveAdminSearchEncryption`
// / `seedR12Clause`) remain in `packages/validity-service/tests/framework/seed.ts` — they are
// validity/search-specific (they seed the R12 clause + Tier-1 identity ciphertext the admin-search path
// decrypts), not package-agnostic, so they do NOT belong in this shared core. The pool engine adds its
// OWN cohort seeder (apps/jobs/tests/pool-cohort-seed.ts) rather than reusing those.

export { measureP95, percentile, type Percentiles, type MeasureOptions } from './percentiles.js';
export {
  EVIDENCE_SCHEMA_VERSION,
  buildRecord,
  renderRecord,
  recordEvidence,
  readRecords,
  compareRecords,
  type BenchmarkConfig,
  type BenchmarkRecord,
  type CompareResult,
} from './evidence.js';
export { assertReplayStable, type ReplaySample, type AssertReplayStableInput } from './replay.js';
export { gitCommit, pgServerVersion } from './provenance.js';
export { envInt } from './env.js';
