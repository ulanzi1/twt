# AR-65 member-search p95 budget (Story 4.7, Task 7)

The recorded p95 of the compound-read-model search (`searchMembers` — ONE join-free query per page over
`member_search_projection` LEFT-JOINed to `member_identities` + `member_kyc_profiles`). Established by
`tests/integration/member/search-projection-bench.spec.ts` (mirrors the Story 4.6 D3-A measure-and-record
harness).

## Recorded run (dev DB `twt-test-pg` :5433, 2026-07-04)

Seeded 60 members into a fresh Pariwar via the projector, 100 iterations (10 warmup), browse page
`{ by: 'pariwar', limit: 200 }`:

| metric | ms |
|---|---|
| p50 | 0.76 |
| p95 | 1.44 |
| p99 | 1.96 |

## Interpretation

- **This is the query-SHAPE latency**, not the ~5s@4L scale figure. The AR-65 ~5s budget is for the whole
  admin-search compound read at 400,000-member (4L) scale, validated under a synthetic ~4L dataset in
  pre-launch — seeding a full 4L set is impractical in CI, so this harness records the per-page query cost
  and guards against a gross query-shape regression (a `SANITY_CEILING_MS = 5000` ceiling — the AR-65
  budget itself — fails the run if an accidental N+1 is reintroduced into the accessor).
- **Distinct from the 200ms@4L validity-payload cache** (Story 4.8's materialized view). This budget is
  the admin member-SEARCH read; that one is the FR-12A validity cache.
- The single join-free page read (no per-result fan-out — the no-N+1 property is separately asserted in
  `search-projection.spec.ts`) is ~1.5ms at 60 members, so the query shape has ample headroom under the
  ~5s budget. The scale-out measurement under a synthetic 4L set re-triggers with the pre-launch
  validation harness.
