// The single shared measured-validation framework core (AI-6-2) — the ONE tooling core BOTH surfaces
// import (validity FR-12A cached-path + 4.7 admin-search-with-KMS) and Story 7.9's pool engine reuses.
// No duplicated percentile / seeding / evidence / replay code lives anywhere else (grep-verifiable single
// source). See README.md for the Story 7.9 plug-in seam.
//
// D3 (BigDev 2026-07-17, CONDITIONALLY APPROVED): delivered as shared `tests/` test tooling NOW — NOT a
// `packages/measured-validation` package. Epic 7 is all-backlog, so genuine multi-package reuse does not
// exist yet; the package extraction is a Story-7.9-time move IF the pool engine lands as its own package
// ([[feedback_no_premature_package]]).

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
export {
  resolveAdminSearchEncryption,
  seedR12Clause,
  seedValidityMembers,
  seedSearchMembers,
  type AdminSearchEncryption,
  type SeedValidityInput,
  type SeedSearchInput,
} from './seed.js';
