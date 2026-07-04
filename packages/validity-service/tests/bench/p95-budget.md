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
