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

---

## Story 10.24 — contribution-fact producer + R7(C)–(F) activation (2026-08-05)

Re-measured through the EXISTING harness (AI-6-2's one shared tooling — no new benchmarking code was
built; [[project_measured_validation_framework]], [[feedback_no_premature_package]]).

**Why an A/B and not just an "after":** the story's AC7 predicted ~8 additional queries per validity
evaluation (four extra `evaluateAt` calls, each with its own `getMemberStateAt` replay and keyed-store
round-trip, plus the ladder shell's `resolveByClauseId`). That is a claim about a DELTA, so a delta is
what was measured. Both arms were run **in isolation on the same machine, back-to-back**; the "before"
arm was produced by temporarily stubbing the two `service.ts` call sites (`produceContributionFacts` →
`null`, `evaluateAppliedR7ClauseSlots` → `[]`) and nothing else, then restoring.

| metric | before | after (run 1) | after (run 2) |
|---|---|---|---|
| uncached `getValidityAt` p50 | 5.50 ms | 6.05 ms | 6.31 ms |
| uncached `getValidityAt` **p95** | **15.55 ms** | **18.73 ms** | **15.98 ms** |
| uncached `getValidityAt` p99 | 38.81 ms | 24.90 ms | 24.66 ms |
| cached-path (AI-4-1) p50 | 3.55 ms | 2.66 ms | 2.44 ms |
| cached-path (AI-4-1) **p95** | **115.03 ms** | **34.85 ms** | **38.96 ms** |

**Reading, honestly.** The p95 columns straddle each other across runs and are NOT a clean signal at
this sample size — the cached-path p95 in particular is dominated by cold-miss/warmup placement, which
is why the "before" number there is the *largest* in the table despite being the *smaller* workload. The
one figure that moves consistently and in the expected direction is the uncached **p50: +0.6–0.8 ms**,
which is the cost of the producer's two aggregate queries. Nothing here approaches the FR-12A budget
(p95 < 200 ms @ 4L, delivered by the Story 4.8 cache).

**⚠ UN-ATTESTED, and it matters ([[feedback_record_unattested_no_backfill]]):** the bench Pariwar seeds
**R12 only**. With no R7 clause version effective at the pinned instant, `evaluateLadderAt` takes its
`missingClauseIds` path per sub-clause — so these numbers include the four extra `evaluateAt` calls but
**NOT** the four extra `resolveByClauseId` payload resolutions, nor the memo/audit writes, that a
FULLY-PROVISIONED Pariwar incurs. The fully-provisioned delta is therefore **larger than measured here
and has not been measured**. It is bounded and predictable rather than open-ended (a FIXED four extra
clause resolutions per evaluation, member-count-independent), and the binding AC7 gate is the
structural one — no new N+1 query path — which is asserted directly by the counted-query test
(`tests/integration/contribution-facts.spec.ts`: 1 vs. 25 contributions → **identical** query count,
exactly 2). Measuring the fully-provisioned p95 needs a seeded-R7 bench fixture and is recorded in
`deferred-work.md` rather than backfilled with a number nobody ran.

The 100×-thread determinism gate (`test:determinism`) stays at **exactly one hash** — re-run green.

---

## Round-2 code review (2026-08-05) — a SECOND un-attested cost, and what changed underneath

**⚠ UN-ATTESTED: the Trustee-Lite Pariwar-wide scan (`scanR7ViolatorCandidates`) has never been
measured.** ⚖ BigDev, 2026-08-05: *"AC7 currently bounds query count, not computational cost. The
implementation satisfies the accepted story scope. Scaling strategy should be selected from production
evidence rather than predicted in advance."* Recorded here rather than mitigated speculatively.

What is and is not known:

- **Bounded, and that part IS asserted.** The scan issues a FIXED number of queries regardless of
  member count — `listMemberStatesForPariwar` + the two bulk fact aggregates + one coverage read + four
  member-independent `resolveByClauseId` calls. AC7's binding structural criterion (no query inside a
  loop over members, pools or clauses) genuinely holds.
- **Unbounded in WORK, and that part is not measured.** "Fixed query count" says nothing about
  result-set size or CPU. The scan materialises one row per member from the membership read, one
  aggregate row per member, then runs four pure clause interpretations and allocates one candidate
  payload per member in a single un-yielded tick, after which `summarizeViolatorFlags` re-iterates the
  same collection. There is no cap, page, budget or cache, and it recomputes per request.
- **The shape of the risk at 4L**, stated so a future measurement has something to falsify: ~400k rows
  across three collections plus ~1.6M pure clause evaluations on one event-loop tick, on an admin GET.
  The response body is sized by the number of FLAGGED members, not the membership.
- **Explicitly NOT done, and why:** capping or paginating the violator section would pick a
  governance-visible cutoff (which candidates get dropped from a suspension list?) with no data behind
  it; a second cache would need its own invalidation story; pre-emptive read chunking would add
  complexity for an unmeasured problem.

**Counter-pressure worth noting when this IS measured:** two round-2 rulings shrink the FLAGGED
population substantially — `months_since_last` now counts opportunities rather than elapsed time, and
the activated R7 clauses carry a `member_state_in` lifecycle gate. Neither reduces the O(M) scan work,
which is the thing at issue here; both reduce the response size. Do not read a smaller flag list as
evidence that the scan cost improved.

**Also changed underneath these numbers, so the table above is no longer comparable like-for-like:**
`months_since_last` is derived from the missed-cycle aggregate instead of in-JS calendar arithmetic
(the aggregate now carries a `last_conf` CTE and two `FILTER` clauses over one scan — still ONE query),
and a coverage-watermark read was added (folded into the existing ledger query as a scalar subquery on
the single-member path, so it remains exactly TWO queries there; a third Pariwar-scoped read on the
bulk path, which cannot fold it). The p95/p50 figures above were taken BEFORE those changes and have
**not** been re-run. Re-measuring is the same seeded-R7 bench fixture already owed above.

---

## Story 10.25 (2026-08-06) — R7(A) restoration accounting, measured after the scan relaxation

**Run on the local live DB (`twt-test-pg`, :5433), same harness, same fixtures** — the AI-4-1
measured-validation framework and the two existing integration specs, never a second benchmarking tool
([[project_measured_validation_framework]]).

| Measurement | Spec | Result |
|---|---|---|
| Uncached `getValidityAt` p95 | `tests/integration/p95-bench.spec.ts` | `p50 6.69 ms · p95 11.31 ms · p99 23.29 ms` (120 iterations) |
| Cached-path FR-12A p95 under concurrency | `tests/integration/measured-validation-fr12a.spec.ts` | `p50 2.61 ms · p95 34.49 ms · p99 37.03 ms` (120 samples, scale 60) |
| 100×-thread determinism gate | `tests/determinism.test.ts` | **exactly ONE** distinct `validity_payload_hash` |

**What changed underneath, and why the numbers are still in the same shape.** Story 10.25 relaxed
`missedCycleAggregateSql`'s `WHERE` to admit TAKEN opportunities and added a gap-and-islands run
computation (two window functions + two grouping CTEs) over that same scan, plus R7(A)'s
`restoration.consecutive_required` as a scalar subquery on the ledger statement. The scan therefore
reads MORE rows than before (every assigned-and-closed opportunity, not only the missed ones) while
issuing the SAME number of queries.

- **The two-query budget held.** The counted-query assertion in
  `tests/integration/contribution-facts.spec.ts` was extended to fixtures with **0, 1 and several**
  completed restoration episodes and still reports exactly `2`, alongside the pre-existing 1-vs-25
  contribution comparison.
- **No N+1 was introduced on the bulk path.** `scanR7ViolatorCandidates` pays nothing for the new
  fields: the clause payloads it needs for `restoration.consecutive_required` are the ones it already
  hoists out of its per-member loop.
- **One extra BOUNDED read on the individual-member path**, recorded rather than hidden: `rules.ts`
  resolves the ladder PICK's clause payload once, and only when a clause actually applied. It is
  outside every loop, so AC8's structural criterion holds, but it is one more round-trip for a flagged
  member than before. See the variance note at `resolveAppliedRestoration`.

**⚠ Comparability, stated rather than implied.** The figures above were taken on the 10.25 tree and are
directly comparable to *each other*, not to the pre-10.24 rows earlier in this file — those predate the
opportunity-aware `months_since_last`, the coverage watermark AND this story's scan relaxation. The
older table is kept as history, not as a baseline.

**⚠ STILL UN-ATTESTED, carried forward unchanged:** the Trustee-Lite Pariwar-wide scan
(`scanR7ViolatorCandidates`) has still never been measured, and 10.25 did not measure it. Its cost
profile is described in the round-2 section above and is unaffected in SHAPE by this story (fixed query
count, O(M) work). Recorded, not mitigated speculatively
([[feedback_record_unattested_no_backfill]]).

---

## Story 10.26 — the SEVENTH fact + R7(G) activation (2026-08-06)

**Run:** `pnpm --filter @twt/validity-service exec vitest run tests/integration/p95-bench.spec.ts`
against `twt-test-pg` (:5433), on the 10.26 tree. The SAME AI-4-1 harness as every row above — reused,
never re-built ([[project_measured_validation_framework]]).

| Metric | 10.26 | 10.25 (previous row) |
|---|---|---|
| iterations | 120 | 120 |
| p50 | **7.80 ms** | see the 10.25 section |
| p95 | **10.92 ms** | " |
| p99 | **13.91 ms** | " |

Uncached single-member `getValidityAt`. FR-12A's **p95 < 200 ms at 4L** is delivered by the Story 4.8
cache (D3-A); this measures the recompute the cache falls back to, which is the path the new query
actually spends against. **10.92 ms against a 200 ms budget** — the added read is not the constraint.

**What changed underneath.** Story 10.26 adds ONE bounded query to the single-member fact read (an
`EXISTS` over the member's own `member.personal_event_asserted` events, 2 → 3) and activates a FIFTH
R7 clause, so the ladder resolves one more payload. Both are fixed costs, independent of member
history size and outside every loop over members, pools or clauses.

- **The counted-query assertions moved DELIBERATELY, and are pinned.**
  `tests/integration/contribution-facts.spec.ts` now asserts exactly **3** for the single-member read
  (across fixtures with 0, 1 and several contributions; 0, 1 and several restoration episodes; and 0,
  1 and several **assertions** — an `EXISTS` cannot start costing per-row) and exactly **10** for the
  Pariwar scan (1 vs 12 members, 0 vs 5 asserting).
- **⚠ The Pariwar-scan budget was RE-COUNTED, not incremented.** `r7-candidate-scan.ts`'s header
  claimed **7** while the code had issued **8** since Story 10.25 added
  `readContributionProjectionContext` as a third statement inside the bulk fact read and updated only
  `facts.ts`'s own comment. Story 10.26's AC9 predicted 7 → 8 on that stale premise; the true move is
  **8 → 10** (+1 assertion existential, +1 hoisted clause resolution for R7(G)). The number is now
  carried by a **counted assertion**, not a comment — which is the whole lesson.
- **The determinism gate reports exactly ONE hash** across 100 real OS threads, unchanged.

**⚠ STILL UN-ATTESTED, carried forward unchanged:** the Trustee-Lite Pariwar-wide scan
(`scanR7ViolatorCandidates`) has still never been measured at production scale, and 10.26 did not
measure it either. Its query count is now pinned and member-independent, but that is a SHAPE
guarantee, not a latency measurement — the per-member pure ladder work is still O(M) and one clause
wider than before. The 4L figure remains un-attested; recorded, not mitigated speculatively
([[feedback_record_unattested_no_backfill]]).

## Story 10.23 — the restoration-discipline overlay (2026-08-07)

Measured on the same harness (`tests/integration/p95-bench.spec.ts`), 120 iterations after 10 warmup,
local `twt-test-pg` on :5433:

| Percentile | Recorded (ms) | vs Story 10.26 |
|---|---|---|
| p50 | **6.88 ms** | 6.62 → 6.88 |
| p95 | **9.91 ms** | 10.92 → 9.91 |
| p99 | **10.36 ms** | 13.91 → 10.36 |

Uncached single-member `getValidityAt`. FR-12A's **p95 < 200 ms at 4L** is delivered by the Story 4.8
cache (D3-A); this measures the recompute the cache falls back to. **9.91 ms against a 200 ms budget.**
The run-to-run delta is within this harness's noise band and is **not** read as an improvement — the
honest statement is that one more bounded read did not move the figure.

**What changed underneath — three deltas, and only one of them is a query.**

- **Single-member read: +1 bounded query (`getMemberRestorationDiscipline`).** Joined to `service.ts`'s
  existing `Promise.all`, so it costs a concurrent round-trip rather than a sequential one. It is an
  indexed scan of the member's OWN `events_log` stream filtered to one event type — the same shape as
  the moderation overlay read beside it, and independent of member history size.
- **`member.joining_discipline_state` costs ZERO queries.** It is a PROJECTION of `lockInStatus.state`,
  which the payload already reads (AC8; `epics.md:3888`). No new read, no engine change.
- **The Pariwar-wide scan costs ZERO new queries, and this is PINNED, not asserted in prose.**
  Story 10.23's `impositionInputs` (the episode anchor + the applied-and-imposing clauses with their
  payloads) are built entirely from data `scanR7ViolatorCandidates` already holds ABOVE its own loop —
  `inputsByMember` from the bulk fact read and `payloadsByClauseId` from the hoisted clause
  resolutions. `tests/integration/contribution-facts.spec.ts`'s counted-query assertions are
  **unchanged at 3 (single-member) and 10 (Pariwar scan)** and still pass, which is the proof.
  Counting from the code beats trusting the comment — the lesson Story 10.26 recorded here.

**The WRITE path is new, and it is NOT in this budget.** The `apps/jobs` imposition writer performs,
per member who actually draws a lock-in: one unbounded overlay read, one `SELECT now()`, one
`getMemberStateAt`, the projector's stream read, and two inserts. It is a background job, not a
request path, and it is **gated behind the default-OFF `restoration_discipline_imposition` flag**
(AC14) whose enablement is Trustee-Panel-exclusive. It has **never been measured at any scale**, and
no attempt is made to speculate about it here.

**⚠ STILL UN-ATTESTED AT PRODUCTION SCALE (4L), carried forward and now widened:**

1. The Trustee-Lite Pariwar-wide scan (`scanR7ViolatorCandidates`) has still never been measured at
   production scale. Its query count remains pinned and member-independent, but that is a SHAPE
   guarantee, not a latency measurement, and the per-member pure ladder work is still O(M).
2. **NEW — the imposition writer at 4L is un-attested and additionally un-BOUNDED in write volume.**
   On a first enablement over a large Pariwar it could impose on many members in one run; nothing in
   this story rate-limits or batches that, because the flag being default-OFF means the first flip is
   a deliberate, supervised governance act rather than a deploy.

Both are recorded as un-attested and carried as risk, not mitigated speculatively
([[feedback_record_unattested_no_backfill]]).
