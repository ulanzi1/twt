# FR-12A Member Validity Service — p95 budget (Story 4.6, confirmed D3-A)

The uncached compute-path latency budget established by `tests/integration/p95-bench.spec.ts`. Per D3-A,
Story 4.6's gate is that the harness **runs** and the budget is **recorded** — the 200ms@4L (400,000-member)
target is delivered by **Story 4.8**'s Postgres materialized-view + per-cohort cache (architecture §1.10),
not the uncached 4.6 path.

## Recorded budget (uncached single-member path)

Methodology: 120 measured `getValidityAt` calls (after 10 warmup), the instant varied per call so the engine
idempotency memo MISSES every call (true uncached compute path: resolve → produce facts → evaluate R12 →
assemble → hash). Single-member, single-clause (R12) — R7/R8 are gated off (no contribution producer, D2-A).

| Percentile | Recorded (ms) |
|------------|---------------|
| p50        | ~5.6          |
| p95        | ~9.6          |
| p99        | ~15.6         |

Environment: local `twt-test-pg` Docker Postgres on :5433, warm connection pool. First recorded 2026-07-04.

## What this budget does and does NOT assert

- **Does:** establish that the uncached compute path is measured + tracked, and guard against a pathological
  regression via a loose sanity ceiling (2000ms) in the spec.
- **Does NOT:** assert 200ms **at 4L scale**. Full 400,000-member seeding is impractical in CI; the per-cohort
  4L scale-out + the materialized-view cache that greens the 200ms@4L target is Story 4.8's harness.

## Read-amplification ([[CR-4.2-D1]] / [[CR-4.3-D2]])

Nothing to measure at Story 4.6: R7/R8 are gated OFF (no `contribution.*` producer — Epic 8/9, D2-A), so those
ladders never evaluate. The read-amplification measurement re-triggers when the Epic 8/9 contribution producer
wires R7/R8 into the service (recorded as a deferred CR in the story's Task 7).

---

# Measured-validation framework — versioned evidence (AI-6-2)

The AI-6-2 shared measured-validation framework (`tests/framework/`) SUPERSEDES the *scope* of the uncached
placeholder above (it measures the REAL Story 4.8 cached delivery path under concurrency, not the uncached
single-member path) and closes the three-retro-carried **AI-4-1** (real concurrent-load p95, incl. the 4.7
admin-search per-row Tier-1 KMS decryption cost) and **AI-4-2** (real-path determinism). See
`tests/framework/README.md` for the core + the Story 7.9 plug-in seam.

**Benchmark config IS versioned evidence** (BigDev 2026-07-17). Every recorded run is a `schema_version`-stamped
structured record — never a bare number — pinning its own provenance so a p95 is reproducible from its exact
config and diffable in git. Two runs are comparable ONLY at the same `schema_version` + identical `config`; a
config change surfaces a **delta** (`compareRecords`) rather than a silent apples-to-oranges comparison.

Record shape (schema_version 1):

```
{ schemaVersion, metric, config: { n, m, concurrency, iterations, warmup, cryptoAdapter, env, dbVersion },
  gitCommit, results: { p50, p95, p99, count }, budgetMs, pass, recordedAt }
```

- **CI posture (D1):** a small-N (~60, env-scalable) smoke runs in `ci:local` with a LOOSE ceiling (cached
  reads spike under full-parallel suite contention — the same reason the uncached placeholder uses 2000ms).
  **No 4L job is added to the per-PR gate.** The smoke's `recordEvidence` writes to a scratch temp file so this
  committed doc is not rewritten on every CI run; the on-demand 4L run appends here.
- **Pre-launch 4L (on-demand):** `MEASURED_VALIDATION=1 DATABASE_URL=… [KMS adapter env]` seeds ~4L, asserts
  the REAL budgets (FR-12A cached p95 < **200ms**; 4.7 admin-search p95 ≤ **~5s**), and appends its
  `schema_version`-stamped record here, labelled by adapter/scale/date. **UN-ATTESTED until run** — the 4L
  headline requires the operator-gated real Cloud KMS adapter (Epic 1) for the admin-search number; it is
  carried as an open pre-launch item, never back-filled from a CI-representative number
  ([[feedback_record_unattested_no_backfill]]).

## Recorded CI-representative smoke records (dev crypto path)

**Provenance note (review fix, 2026-07-17):** by the harness's own routing logic, a smoke run's
`recordEvidence` targets a SCRATCH temp file, never this committed doc directly (see "CI posture" above)
— so the two records below are NOT auto-appended tool output. They are MANUALLY TRANSCRIBED, verbatim,
from the `console.log` line each spec emits on a real local run (`DATABASE_URL=… pnpm --filter
@twt/validity-service test`, `twt-test-pg` Postgres 16.14 on :5433, isolation run, scale M=60,
concurrency 8), captured for documentation value only. `gitCommit` is honestly recorded as `uncommitted`
(the AI-6-2 story branch, pre-merge) rather than a specific merged commit — the prior revision of this
section stamped these numbers with `e982f8e`, a commit that PREDATES the framework code that produced
them; that was a genuine provenance error, not a deliberate convention, and is corrected here. The
`cryptoAdapter` is recorded per number: FR-12A is `n/a` (the validity service NEVER decrypts Tier-1 —
`producer.ts`; a pure compute+cache budget), admin-search is `dev-fake-kms` (CI path; the real-KMS
headline is a pre-launch operator run with `KMS_TEST_MODE=live`).

```json
{
  "schemaVersion": 1,
  "metric": "fr12a-cached-p95",
  "config": { "n": null, "m": 60, "concurrency": 8, "iterations": 120, "warmup": 20, "cryptoAdapter": "n/a", "env": "ci-local-smoke", "dbVersion": "16.14" },
  "gitCommit": "uncommitted (story/ai-6-2-shared-measured-validation-framework, pre-merge)",
  "results": { "p50": 8.08, "p95": 129.73, "p99": 316.32, "count": 120 },
  "budgetMs": 2000,
  "pass": true,
  "recordedAt": "2026-07-17"
}
```

```json
{
  "schemaVersion": 1,
  "metric": "admin-search-kms-p95",
  "config": { "n": 200, "m": 60, "concurrency": 8, "iterations": 60, "warmup": 10, "cryptoAdapter": "dev-fake-kms", "env": "ci-local-smoke", "dbVersion": "16.14" },
  "gitCommit": "uncommitted (story/ai-6-2-shared-measured-validation-framework, pre-merge)",
  "results": { "p50": 140.83, "p95": 244.25, "p99": 261.5, "count": 60 },
  "budgetMs": 5000,
  "pass": true,
  "recordedAt": "2026-07-17"
}
```

> These are the **smoke** budget records (harness-with-teeth, loose ceilings). They do NOT assert the 200ms@4L
> or ~5s@4L targets — those are the **pre-launch 4L** records, appended here when the operator runs
> `MEASURED_VALIDATION=1` against ~4L with the real Cloud KMS adapter. The `schema_version` + `config` on each
> record guard against silently comparing a smoke number against a 4L number. The FR-12A p95 (129.73ms) and
> admin-search p95 (244.25ms) are noticeably higher than an earlier draft of this doc recorded (3.64ms /
> 16.33ms) — that draft's FR-12A run pre-warmed the FULL cohort before timing (zero cold-miss component,
> against the frozen "warm + cold-miss mix" requirement) and its admin-search run neither decrypted the
> KYC-name field nor wrote the per-search audit entry (both real per-request costs); both gaps are fixed
> in this revision, and these numbers reflect the corrected, more faithful measured path.
