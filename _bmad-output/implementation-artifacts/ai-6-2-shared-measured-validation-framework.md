---
title: 'AI-6-2 — Single shared measured-validation framework (concurrent-load p95 + real-path determinism/replay), pulling AI-4-1 + AI-4-2 forward into Epic 7'
type: 'chore'
created: '2026-07-17'
baseline_commit: e982f8e1a7cc58c15cc8f345778b2d67d3f6375d
status: 'done'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-retro-2026-07-16.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-retro-2026-07-05.md'
  - '{project-root}/packages/validity-service/tests/integration/p95-bench.spec.ts'
  - '{project-root}/packages/validity-service/tests/bench/p95-budget.md'
  - '{project-root}/packages/validity-service/tests/determinism.test.ts'
  - '{project-root}/packages/validity-service/tests/determinism-runner.ts'
  - '{project-root}/apps/api/src/modules/member-validity/handlers.ts'
  - '{project-root}/_bmad-output/implementation-artifacts/ai-6-3-compound-read-model-shape-tests.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem.** Two Epic-4 action items have been *carried unchanged* for three retrospectives as "pre-Epic-8" gates, both un-validated:
- **AI-4-1** — the FR-12A p95 < 200ms @ 4L (400,000-member) performance claim is measured only by a **single-member uncached placeholder** (`p95-bench.spec.ts`, >200× margin, Epic-4 retro H-4). There is *no* real concurrent-load measurement, and *no* measurement of the **Story 4.7 admin member-search ~5s @ 4L budget** whose cost is dominated by **per-row Tier-1 KMS decryption** (`decryptMobile` / `decryptKycField` in `member-validity/handlers.ts` — the validity *service* itself deliberately never decrypts Tier-1, so this cost lives on the 4.7 search surface, not FR-12A).
- **AI-4-2** — the determinism-replay gate (`determinism.test.ts`) runs the composition 100× across real OS threads but over **synthetic in-memory fixtures** (`determinism-runner.ts`), never the real DB-backed producer/engine (CR-4.6-D9). The real-path determinism decision was never made.

Epic 7 now forces the issue: **Story 7.9** ("Pool Engine Pre-Launch Measured-Validation Gate", N=50 / M=4L < 60s p95, Sprint Change Proposal Item 15 + AR-68 + NFR-7) is a **P0 launch-blocker** in the *same class* — a concurrent-load-at-4L-with-recorded-evidence gate plus deterministic-replay verification of `hash(member_id + cycle_id) % N`. Building 7.9's tooling separately from AI-4-1/AI-4-2 would be **duplicate tooling** (Epic-6 retro AI-6-2, confirmed BigDev 2026-07-16, BigDev's explicit refinement).

**Approach.** Stand up **ONE reusable measured-validation framework** with two capabilities — (1) a **concurrent-load p95 harness** (seed a synthetic dataset at parameterized scale in a non-production Pariwar → drive a target op under configurable concurrency → p50/p95/p99 → assert a named budget → record evidence to a doc), and (2) a **real-path determinism/replay harness** (run the *real* DB-backed producer K times and assert byte-identical output-hash). Prove the framework **now** on the two surfaces that already exist — closing **AI-4-1** (validity FR-12A cached-path p95 + 4.7 admin-search p95-with-KMS) and **AI-4-2** (real-path determinism backstop) — and publish a **documented plug-in seam** so **Story 7.9 consumes the same framework** for the pool engine with zero new tooling. The pool engine (Stories 7.1–7.8) does not exist yet (all backlog), so AI-6-2 delivers the framework + the validity-side application + the 7.9 contract; **7.9 remains its own story** that wires the pool-spawn saga into the harness once 7.1–7.8 land.

## Boundaries & Constraints

**Always:**
- Deliver the framework as **shared tooling both packages import** — one percentile/budget/evidence/concurrency core + one real-path replay driver — so validity-service (now) and the future pool-engine (7.9) call it, not two copies. Keep it **minimal** (measurement + assertion + evidence, no heavyweight abstraction).
- **Env-gate the 4L runs.** Full 400,000-member seeding is impractical/expensive for a per-PR gate (`p95-budget.md` says so verbatim). The true 4L concurrent-load run is **on-demand / pre-launch** (env-flagged, e.g. `MEASURED_VALIDATION=1` + `DATABASE_URL`), producing **recorded evidence in a committed markdown doc** — mirroring 7.9's "≥ 10 runs, evidence recorded, Trustee signoff" pattern, NOT a `ci:local` per-PR job. A **scaled-down smoke** (small N, e.g. N≈1k) MAY run in `ci:local` to keep the harness itself exercised with teeth.
- Record **which crypto adapter produced each number** in the evidence doc (real Cloud KMS is operator-gated per Epic 1; CI/local uses the dev crypto path). The 4.7 measurement's headline number is only "real" when produced against the KMS-backed adapter in the pre-launch env; a CI-representative number is labelled as such.
- The concurrent-load p95 harness measures the **real delivery path**: FR-12A 200ms@4L is delivered by **Story 4.8's per-cohort cache** (`getValidityCached`), so the validity budget is measured through the cache (warm + cold-miss mix), not the uncached `getValidityAt` placeholder path.
- The real-path determinism harness asserts on the **real** `validity_payload_hash` produced by the DB-backed producer over seeded state — byte-identical across replays keyed by `(member_id, rule_registry_version, member_state_hash)` (the replay key already documented in `payload.ts`), the existing hit≡recompute contract.
- Every evidence run records into a committed doc under `packages/validity-service/tests/bench/` (extend the existing `p95-budget.md`) and, for the pool side later, `_bmad-output/research/pool-engine-validation-gate.md` (7.9's named evidence file).
- **Benchmark configuration IS versioned evidence** (BigDev 2026-07-17). Every recorded run is a **structured, versioned record — never a bare number**: `{ schema_version, config: { scale (N/M), concurrency, iterations, warmup, crypto_adapter, env, db_version, git_commit }, results: { p50, p95, p99 }, budget, pass, recorded_at }`. The config travels **with** the numbers, committed, so a p95 is reproducible from its exact config and diffable in git. Two runs are comparable **only** at the same `schema_version` + matching config; a config change bumps `schema_version` (or is recorded as an explicit config delta) so runs are never silently compared apples-to-oranges.
- **The replay harness proves more than "same hash"** (BigDev 2026-07-17). A single distinct `validity_payload_hash` is necessary but **not sufficient** — a stable hash can still hide a diverging *non-hashed* field, and a degenerate/constant hash passes vacuously. The harness ALSO asserts: **(a) full canonical-payload DEEP EQUALITY** across replays (the whole payload object, not just its digest — validates the hash's field coverage), and **(b) hash DISCRIMINATION** — a deliberately perturbed input (different member_state / instant / clause) MUST produce a *different* hash (proves the digest actually covers the varying fields and isn't vacuously constant). Contract: *same input → identical payload AND identical hash; different input → different hash.*

**Ratified Decisions (BigDev 2026-07-17):**
- **D1 — CI posture (APPROVED).** The 4L harness is an **on-demand / pre-launch** evidence run (env-flagged, recorded to a committed doc, like 7.9); a **small-N (~1k) smoke** runs in `ci:local` for teeth. **No full 4L job in the per-PR gate.**
- **D2 — AI-4-2 disposition (APPROVED).** **Extend** the determinism harness to the DB-backed **real producer** (7.9 needs real-path replay anyway → no duplicate tooling). The synthetic 100×-thread gate stays intact and additive.
- **D3 — Framework home (CONDITIONALLY APPROVED).** **IF** Epic 7 introduces a standalone Pool Engine **package**, create a small `packages/measured-validation` lib. **OTHERWISE keep the framework as shared test tooling** (a `tests/` util under a stable path re-exported to both surfaces). **Do NOT introduce a package before there is genuine multi-package reuse.** Since Epic 7 is all-backlog today, **AI-6-2's own delivery is shared test tooling**; the `packages/measured-validation` extraction happens only when/if the pool engine lands as its own package (a Story 7.9-time move, not now).
- **D4 — Scope boundary (APPROVED).** Build the framework + validity application now; leave the pool-engine wiring to Story 7.9.

**Never:**
- Do **not** build the pool engine or implement Story 7.9's pool-spawn gate here — 7.1–7.8 don't exist yet. AI-6-2 stops at the reusable framework + validity-side application + the documented 7.9 seam.
- Do **not** weaken or delete the existing `determinism.test.ts` P0 gate (100×-thread synthetic) — the real-path harness is **additive** (the synthetic gate stays as the fast composition-layer invariant; the real-path harness is the DB-backed backstop).
- Do **not** assert the 200ms@4L target against the **uncached** `getValidityAt` path — that path is not the delivery path (Story 4.8 cache is). Keep the existing uncached placeholder spec's loose sanity ceiling as-is or supersede it explicitly.
- Do **not** regenerate any applied migration or reset the test DB via `DROP SCHEMA` ([[project_live_db_test_gotchas]]); 4L seeding must be additive/own-committing with membership-not-count assertions in any shared-DB path.
- Do **not** invent member columns to make seeding easier (no geo/district/`member_number` — [[project_membership_number_deferred_feature]]); synthetic members are seeded through the real event-log → projector path or the documented search-projection seeding used by 4.7.
- Do **not** commit any temporary teeth/revert edits (framework must prove its own teeth via revert-sanity, recorded in the Dev Agent Record only — the AI-6-3 discipline).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Framework smoke (CI) | small N (≈1k) synthetic members, `ci:local` | harness runs, records p50/p95/p99, asserts the small-N budget, exits 0 | budget breach → red |
| Validity 4L pre-launch (AI-4-1) | `MEASURED_VALIDATION=1` + real KMS adapter, M=4L via 4.8 cache path under concurrency | recorded p95 < 200ms for FR-12A cached delivery; evidence appended to `p95-budget.md` (adapter + scale + concurrency named) | p95 ≥ 200ms → fail + remediation note |
| Admin-search 4L (AI-4-1, KMS) | M=4L, `adminMemberSearch` under concurrency, real KMS decrypt of identity for display | recorded p95 ≤ ~5s for the 4.7 search budget; per-row Tier-1 KMS decryption cost included in the measured path | p95 > 5s → fail + remediation note |
| Real-path determinism (AI-4-2) | real DB-backed producer, K replays over identical seeded state | ONE distinct hash **and** deep-equal payloads; matches 4.8 hit≡recompute | any variance → P0 fail |
| Replay discrimination | a perturbed input (different member_state / instant / clause) | a **different** hash — proves the digest covers the varying fields | same hash on a real change → P0 fail (vacuous hash) |
| Evidence record | any completed benchmark run | `schema_version`-stamped `{config, git_commit, env, results, budget, pass}` appended to the doc | config mismatch vs a prior run → surface delta, don't compare |
| No DATABASE_URL / flag unset | env unset | 4L + real-path suites skip cleanly; synthetic 100×-thread gate still runs | N/A |
| Pool-engine plug-in (7.9, future) | 7.1–7.8 landed | 7.9 imports the framework, seeds 4L + N=50, measures spawn-saga p95 < 60s across ≥10 runs → `pool-engine-validation-gate.md` | 7.9 owns; AI-6-2 only publishes the seam |

</frozen-after-approval>

## Code Map

- `packages/validity-service/tests/integration/p95-bench.spec.ts` -- the current **single-member uncached placeholder** (AI-4-1's H-4 target). Read-only reference for the measurement shape (`percentile`, warmup, per-iteration instant variation); the new harness supersedes its scope (real 4L cached-path + concurrency), not its file.
- `packages/validity-service/tests/bench/p95-budget.md` -- the **committed evidence doc** to extend with the real 4L concurrent-load numbers (validity cached-path + 4.7 admin-search-with-KMS), each labelled by adapter/scale/concurrency/env/date.
- `packages/validity-service/src/cache.ts` -- `getValidityCached` = the **real FR-12A delivery path** (Story 4.8 per-cohort cache) the 200ms@4L budget must be measured through.
- `packages/validity-service/tests/integration/validity-cache.spec.ts` -- the existing **hit≡recompute** DB-backed spec = the AI-4-2 "formally accept + document" backstop candidate (D2 alt arm).
- `packages/validity-service/tests/determinism.test.ts` + `determinism-runner.ts` + `determinism.worker.mjs` -- the existing **synthetic** 100×-thread P0 gate. Keep intact; the real-path harness is additive.
- `apps/api/src/modules/member-validity/handlers.ts` -- `adminMemberSearch` (Story 4.7): the **per-row Tier-1 KMS decryption** surface (`decryptMobile`, `decryptKycField`) whose ~5s@4L budget AI-4-1 must measure. `memberHomeValidityRead` / `adminValidityRead` = the FR-12A read paths.
- `packages/domain/src/member/search-projection.ts` + `search-read.ts` + `project.ts` -- the AR-65 `member_search_projection` accessor + projector: the seam for **seeding synthetic members at scale** through the real projection path (no invented columns).
- `packages/validity-service/tests/integration/` + `packages/domain/src/test-utils/integration-setup.ts` -- live-DB conventions (`setupLiveDb`, `hasDatabase`, `describe.skipIf`) the harness reuses ([[project_live_db_test_gotchas]]).
- `epics.md` Story 7.9 (lines ~2798-2820) + AR-68 + NFR-7 -- the **consumer contract**: N=50 / M=4L < 60s p95, ≥10 runs, evidence in `_bmad-output/research/pool-engine-validation-gate.md`, registers in the Story 0.15 launch-gate inventory (FR-20 capacity gate row).
- `_bmad-output/implementation-artifacts/0-15-architectural-launch-gate-inventory-scheduled-with-owners.md` -- where the **FR-20 pool-spawn capacity gate** row lives (7.9 closes it; AI-6-2 does not register it — noted for continuity).

## Tasks & Acceptance

**Execution:**
- [x] `git` -- branch `story/ai-6-2-shared-measured-validation-framework` off up-to-date `main` (`git fetch origin` first — [[feedback_git_fetch_before_remote_reasoning]]). *(repo convention)*
- [x] **D1–D4 ratified (BigDev 2026-07-17)** — build to the ratified dispositions (Boundaries → Ratified Decisions). D3 is conditional: **deliver as shared `tests/` test tooling now** (no `packages/measured-validation` until the pool engine lands as its own package). Record the as-built disposition in the Dev Agent Record. *(the crux decisions — settled)*
- [x] **Framework core** (per D3 → shared test tooling now) -- a minimal shared module exposing: `measureP95(op, { iterations, concurrency, warmup })` → `{p50,p95,p99}`; a `seedSyntheticMembers(scale, pariwarId)` driver through the real projection/event path; a `recordEvidence(doc, run)` appender that writes the **structured, `schema_version`-stamped record** (config + provenance incl. `git_commit` + results + budget + pass); and a replay assertion `assertReplayStable(replays)` that proves **more than same-hash** — full canonical-payload deep equality + hash discrimination (not merely `assertSingleHash`). *(the single shared tooling — AI-6-2's spine)*
- [x] **AI-4-1 — validity FR-12A concurrent-load harness** -- measure `getValidityCached` (the 4.8 delivery path) under concurrency at scale; env-gated 4L pre-launch run + small-N `ci:local` smoke; assert p95 < 200ms at the pre-launch scale; append evidence to `p95-budget.md`. *(closes AI-4-1's FR-12A arm)*
- [x] **AI-4-1 — 4.7 admin-search + KMS harness** -- measure `adminMemberSearch` under concurrency at scale **with per-row Tier-1 KMS decryption in the measured path**; assert p95 ≤ ~5s at the pre-launch scale; record adapter (dev-crypto vs real-KMS) with each number. *(closes AI-4-1's 4.7 + KMS-cost gap — CR-4.6-D2/D3)*
- [x] **AI-4-2 — real-path determinism harness** (D2 ratified: extend) -- run the **real DB-backed producer** K times over identical seeded state and apply `assertReplayStable` (deep-equal + discrimination, per below); leave the synthetic 100×-thread gate intact and additive. *(closes AI-4-2 / CR-4.6-D9)*
- [x] **Versioned-evidence record** -- `recordEvidence` emits the structured, `schema_version`-stamped record (config + `git_commit` + env + results + budget + pass); comparison logic keys on `schema_version` + config and **surfaces a config delta** rather than comparing across mismatched configs. Extend `p95-budget.md` to the versioned-record shape. *(benchmark config = versioned evidence — BigDev)*
- [x] **Stronger replay proof** -- `assertReplayStable` asserts (a) full canonical-payload deep equality across replays and (b) a discrimination check (a perturbed input → a *different* hash). Document that Story 7.9's `hash(member_id+cycle_id)%N` replay applies the **same two-part proof** (full assignment-map equality + discrimination on `cycle_id`), not a bare digest match. *(replay proves more than same-hash — BigDev)*
- [x] **Teeth (revert-sanity, dev-only, never committed)** -- (a) inject a non-deterministic sink into the producer → real-path harness goes RED; (b) inject an artificial per-call delay past budget → p95 harness goes RED; restore byte-identical; record both in the Dev Agent Record. *(proves the framework has teeth, not green-but-inert — [[feedback_gate_scope_semantic_coverage]])*
- [x] **7.9 seam doc** -- a short "How Story 7.9 plugs the pool engine into this framework" section (in the framework module's README/header + cross-linked from `p95-budget.md`): import the core, seed 4L + N=50, `measureP95` the spawn saga, `recordEvidence` to `pool-engine-validation-gate.md`, `assertSingleHash` for `hash(member_id+cycle_id)%N` replay. *(the "no duplicate tooling" contract 7.9 consumes)*
- [x] `_bmad-output/implementation-artifacts/ai-6-2-shared-measured-validation-framework.md` -- append the Dev Agent Record (decisions D1–D4, teeth evidence, recorded numbers, the 7.9 join instruction). *(continuity — mirrors AI-6-1/6-3)*

**Acceptance Criteria:**
- Given the shared framework, when both validity-service and (per the seam doc) the future pool-engine measure performance/determinism, then they call **one** tooling core — no duplicated percentile/seeding/evidence/replay code (grep-verifiable single source).
- Given the pre-launch env (`MEASURED_VALIDATION=1`, real-KMS adapter, 4L scale), when the AI-4-1 harness runs, then FR-12A cached-path p95 < 200ms **and** the 4.7 admin-search p95 ≤ ~5s (with per-row KMS decryption in the measured path) are recorded in `p95-budget.md` with adapter/scale/concurrency/date; a breach fails with a remediation note.
- Given the AI-4-2 real-path harness (D2), when it runs against the DB-backed producer, then across replays it asserts **full canonical-payload deep equality** (not just the digest) AND **hash discrimination** (a perturbed input yields a *different* hash), the stable value matches the 4.8 hit≡recompute value, and the synthetic 100×-thread P0 gate remains green and unchanged — so a stable-but-incomplete hash or a degenerate constant hash both fail.
- Given any recorded benchmark run, when it lands in the evidence doc, then it is a `schema_version`-stamped structured record pairing the full config + `git_commit` + environment with p50/p95/p99 — reproducible and git-diffable; two runs are compared only at matching `schema_version` + config, else the config delta is surfaced (never a silent apples-to-oranges comparison).
- Given a temporarily injected non-determinism / over-budget delay, when the harnesses run, then each goes RED on exactly the injected defect; restoring returns to green with zero residual diff (revert-sanity, recorded, never committed).
- Given `ci:local`, when it runs, then the small-N smoke passes and no 4L job is added to the per-PR gate; the 14/24-job local gate stays green ([[project_ci_actions_suspension_local_mirror]]).
- Given the seam doc, when a Story 7.9 implementer reads it, then the pool-engine plug-in path (seed → measure → record → replay) is unambiguous and requires no new tooling.

### Review Findings

**Patch:**
- [x] [Review][Patch] Route the admin-search-KMS harness through the REAL `adminMemberSearch` handler (`apps/api/src/modules/member-validity/handlers.ts`) instead of calling domain-level `searchMembers` + its own `enc.decrypt()` directly — resolved decision (2026-07-17): import/invoke the real handler (check the `apps/api` ↔ `validity-service` dependency direction first so this doesn't invert the package graph). The measured path must then include: the `audit.writeAuditEntry` call, the `decryptKycField`/name-ciphertext decrypt cost (seed a `memberKycProfiles` row per member in `seed.ts`), and the anonymized-member suppression branch [packages/validity-service/tests/integration/measured-validation-search-kms.spec.ts]
- [x] [Review][Patch] Wire real Cloud KMS adapter selection (env-driven, e.g. `KMS_TEST_MODE=live`) so the pre-launch `MEASURED_VALIDATION=1` run can actually construct a real `KmsProvider` instead of always calling `makeFakeEncryption()` — resolved decision (2026-07-17): build this now rather than deferring. Also correct the two already-committed `p95-budget.md` records' `gitCommit`/`env` fields so they honestly reflect a hand-recorded smoke baseline rather than implying automated tool provenance they don't have [packages/validity-service/tests/framework/seed.ts, packages/validity-service/tests/bench/p95-budget.md]
- [x] [Review][Patch] `assertReplayStable`'s discrimination check is one-directional — only checks `perturbed.hash !== stableHash`, never verifies the perturbed *payload* actually differs, so an accidental non-deterministic-hash bug on an unperturbed/identical payload would be misreported as valid discrimination [packages/validity-service/tests/framework/replay.ts:86]
- [x] [Review][Patch] `measureP95` has no cancellation on worker failure — if one worker's `op` rejects, `Promise.all` rejects immediately but sibling workers keep looping in the background, a source of post-test "connection already closed" flakiness [packages/validity-service/tests/framework/percentiles.ts:63]
- [x] [Review][Patch] `measureP95`'s warmup/measurement split is not actually ordered under `concurrency > 1` — workers pull from a shared index counter, so "measured" invocations can start before all "warmup" invocations finish; add a phase barrier (run warmup pool to completion, then start the measured pool) [packages/validity-service/tests/framework/percentiles.ts:63]
- [x] [Review][Patch] `percentile()` has no bounds check for `p < 0` or `p > 100` — an out-of-range percentile silently indexes via a non-null assertion [packages/validity-service/tests/framework/percentiles.ts:11]
- [x] [Review][Patch] `readRecords()` treats any fs error (not just missing file) as "no records", and accepts a parsed record missing `config` with no warning — a later `compareRecords` call throws an opaque `TypeError` on `Object.keys(undefined)` against a corrupt/hand-edited doc entry [packages/validity-service/tests/framework/evidence.ts:94-114]
- [x] [Review][Patch] FR-12A p95 harness measures 100% warm-cache hits, not the "warm + cold-miss mix" the frozen Boundary requires — it pre-warms every seeded member before the timed run, so no timed sample is a cold miss; don't pre-warm the full pool before timing so first-touch cold misses land inside the measured set [packages/validity-service/tests/integration/measured-validation-fr12a.spec.ts]
- [x] [Review][Patch] `BenchmarkConfig` under-captures op shape — `PAGE = 200` in the search-KMS spec isn't recorded in `config`, and `n` is hardcoded `null` in both specs despite a natural per-op cardinality (page size) existing, undermining the "identical config ⇒ comparable" claim [packages/validity-service/tests/integration/measured-validation-search-kms.spec.ts, packages/validity-service/tests/framework/evidence.ts]
- [x] [Review][Patch] `percentile()`'s convention (floor-indexed nearest-rank) is undocumented, despite the framework's stated purpose being reproducible numbers — add a doc comment naming the convention explicitly [packages/validity-service/tests/framework/percentiles.ts:11]
- [x] [Review][Patch] Env-tunable `MEASURED_VALIDATION_SCALE`/`_ITERS`/`_CONCURRENCY` are parsed with bare `Number(...)` and no validation — a typo'd non-numeric value silently becomes `NaN`, zeroing the seeded scale/iteration count instead of failing clearly [packages/validity-service/tests/integration/measured-validation-fr12a.spec.ts:40, packages/validity-service/tests/integration/measured-validation-search-kms.spec.ts:37]
- [x] [Review][Patch] `seedSearchMembers` seeds up to 400k rows sequentially inside one open transaction (timeout/lock-bloat risk at 4L scale, unvalidated); `seedValidityMembers`'s loop isn't wrapped in a transaction at all (a mid-loop failure leaves a partial, non-atomic seed) — batch/chunk the former, wrap the latter in `BEGIN`/`COMMIT` [packages/validity-service/tests/framework/seed.ts]
- [x] [Review][Patch] Concurrent `MEASURED_VALIDATION=1` runs of the two integration spec files (vitest's default parallel file execution) can interleave `appendFileSync` writes to the same committed doc, corrupting the fenced-json block — serialize pre-launch runs (e.g. `--no-file-parallelism`) or add a lock around `recordEvidence` [packages/validity-service/tests/framework/evidence.ts]
- [x] [Review][Patch] Admin-search-KMS harness discards the decrypted plaintext — it measures decrypt *cost* but never asserts decrypt *correctness*, so a broken decrypt that returns garbage without throwing would still pass the p95 budget check [packages/validity-service/tests/integration/measured-validation-search-kms.spec.ts]
- [x] [Review][Patch] Duplicated `percentile` logic remains in two pre-existing placeholder specs after this diff (`p95-bench.spec.ts`, `search-projection-bench.spec.ts`), and the sprint-status ledger's "grep-verifiable single source" claim overstates this as settled repo-wide rather than scoped to the new framework's own callers — correct the ledger/AC wording per [[feedback_closure_language_precision]] [packages/validity-service/tests/integration/p95-bench.spec.ts:34, packages/domain/tests/integration/member/search-projection-bench.spec.ts:28, _bmad-output/implementation-artifacts/sprint-status.yaml]
- [x] [Review][Patch] `provenance.ts` (`gitCommit`, `pgServerVersion`) has zero unit-test coverage despite being the attestability-critical component of the versioned-evidence discipline — both fallback paths (`'unknown'` on git failure, `null` on query failure) are unverified [packages/validity-service/tests/framework/provenance.ts]
- [x] [Review][Patch] `canonicalJsonStringify` may throw on a non-canonicalizable payload (e.g. a circular ref) inside `assertReplayStable`'s `canonical()` helper — wrap it so a descriptive replay-failure message surfaces instead of a raw internal exception [packages/validity-service/tests/framework/replay.ts:60]

## Design Notes

**Why now, on validity, and not the pool engine (D4).** Epic 7 is entirely backlog (7.1–7.10) — the pool engine does not exist, so a framework "validated" against it would be vacuous today. But AI-4-1/AI-4-2 target the **validity + admin-search surfaces that already shipped** (Epic 4). Standing the framework up **now** (a) discharges two three-retro-old carried items with *real* measurement instead of a fourth carry, and (b) hands Story 7.9 battle-tested tooling. This is the literal reading of the retro: "stand up the single shared framework early in Epic 7 … satisfying AI-4-1/AI-4-2 **and** Story 7.9's launch gate." Recommendation: **build now (D4-recommended)**.

**The KMS cost lives on 4.7, not FR-12A (the subtlety AI-4-1 folds).** The validity *service* is framework-agnostic and **never decrypts Tier-1** (`producer.ts:112-114` — the concealment comparison is explicitly a decryption-capable *seam* it does not call). So FR-12A's 200ms@4L is a pure compute+cache budget with **no** per-row KMS cost. The per-row Tier-1 KMS decryption AI-4-1 names is the **Story 4.7 admin member-search** display path (`decryptMobile`/`decryptKycField` in `member-validity/handlers.ts`), whose budget is ~5s@4L. The harness therefore measures **two distinct budgets on two paths** — conflating them would mis-attribute the KMS cost to FR-12A.

**Measure the delivery path, not the placeholder (AI-4-1).** The existing `p95-bench.spec.ts` deliberately measures the *uncached* single-member path with a loose 2000ms sanity ceiling, because 4.6's D3-A gate was "harness runs + budget recorded", and the 200ms@4L target is **delivered by Story 4.8's per-cohort cache**. AI-4-1's "real 4L" measurement must therefore run through `getValidityCached` at scale under concurrency (warm + cold-miss mix) — that is the path that actually has to meet 200ms.

**AI-4-2 ratified: extend to the real path (D2, CR-4.6-D9).** BigDev approved the **extend** arm: the replay harness runs the **real DB-backed producer** — what Story 7.9 needs anyway for `hash(member_id+cycle_id)%N` replay across 50k synthetic members, so building it here is the "no duplicate tooling" win. The zero-code alt (formally accept synthetic scope + cite `validity-cache.spec.ts` hit≡recompute) is *not* taken. The synthetic 100×-thread gate stays as the fast composition-layer invariant; the real-path harness is the additive DB-backed backstop, and it carries the stronger-than-hash proof above.

**Minimal framework, and no premature package (D3, conditionally approved).** AI-6-3 deliberately chose a *convention* over a framework for shape-tests. AI-6-2 is different — BigDev's refinement explicitly says "single shared **framework** … avoiding duplicate tooling" — but the same restraint applies, sharpened by BigDev's D3 condition: **deliver it as shared `tests/` test tooling now; do NOT stand up a `packages/measured-validation` package before there is genuine multi-package reuse.** Epic 7 is all-backlog, so that reuse does not exist yet — the package extraction is a Story 7.9-time move, made only if the pool engine lands as its own package. The core stays: percentile math + a concurrency driver + a synthetic-seeding driver + a **versioned-evidence** appender + a **stronger-than-hash** replay assertion. Nothing more. Shared *callable tooling*, not a DSL, and not a package until reuse is real.

**Benchmark config is versioned evidence (BigDev enhancement).** A bare "p95 = 9.6ms" is not evidence — it is un-attestable the moment anyone asks "at what scale, concurrency, adapter, and commit?" (the exact decay the retros keep punishing — un-gated/un-attested claims rot). So every run is a structured record that pins its own provenance (`schema_version` + config + `git_commit` + env), committed and git-diffable. The `schema_version` is the guard against the subtlest failure: silently comparing a new p95 against an old one measured under a *different* config (e.g. 4L-cached vs 1k-uncached) and drawing a false regression/no-regression conclusion. A config change bumps the version; comparison across versions surfaces the delta instead of pretending the numbers are commensurable.

**Replay proves more than same-hash (BigDev enhancement).** The pure-hash gate (`determinism.test.ts`) answers "is the digest stable?" — but two real failure modes slip past it: (1) a **non-hashed field diverges** while the hashed subset stays constant (the hash's coverage is assumed, never proven), and (2) a **degenerate/constant hash** (e.g. a bug that returns a fixed string) passes the single-distinct-value assertion vacuously. `assertReplayStable` closes both: **deep-equal the full canonical payloads** (proves coverage — if any field diverges, the payload compare fails even when the hash doesn't), and a **discrimination probe** (a perturbed input MUST change the hash — proves the digest is a real function of the varying state, not a constant). This is the semantic-coverage discipline applied to determinism, exactly as [[feedback_gate_scope_semantic_coverage]] applies it to gate scope: a green that proves nothing is not a green. Story 7.9 inherits the same two-part proof for pool assignment — full assignment-map equality + `cycle_id` discrimination, not a bare digest match.

**7.9 stays its own story.** AI-6-2 publishes the seam; 7.9 (a) seeds 4L + N=50 in a non-production Pariwar, (b) `measureP95` the spawn-saga wall-clock (bulk-approval click → `cycle.frozen`), (c) asserts < 60s p95 across ≥10 runs, (d) records to `_bmad-output/research/pool-engine-validation-gate.md`, (e) registers the FR-20 capacity gate in the Story 0.15 launch-gate inventory with Trustee signoff. None of (a)–(e) is AI-6-2's to deliver; the framework's job is that (b)/(d)/replay are **imports, not re-implementations**.

## Verification

**Commands:**
- `pnpm --filter @twt/validity-service test` (no DATABASE_URL) -- expected: 4L + real-path suites skip cleanly; synthetic determinism gate green; exit 0.
- `DATABASE_URL=postgres://…:5433/… pnpm --filter @twt/validity-service test` -- expected: small-N smoke + real-path determinism green (deep-equal + discrimination, not bare hash); a versioned evidence record is appended.
- `MEASURED_VALIDATION=1 DATABASE_URL=… [KMS adapter env] <run the 4L harness>` -- expected: records FR-12A cached p95 < 200ms + 4.7 admin-search p95 ≤ ~5s into `p95-budget.md`, adapter/scale/date labelled. *(pre-launch, on-demand)*
- Revert-sanity (dev-only, never committed) -- inject non-determinism into the producer → real-path harness RED; inject an over-budget delay → p95 harness RED; `git checkout --` → byte-identical, re-run green.
- `pnpm ci:local` -- expected: small-N smoke passes, no 4L job added; all jobs green (the merge gate while Actions is suspended — [[project_ci_actions_suspension_local_mirror]]).

## Suggested Review Order

**The shared framework core (the spine)**
- Entry point — the single tooling core (`measureP95` / `seedSyntheticMembers` / `recordEvidence` / `assertSingleHash`) both surfaces import.
- The 7.9 seam doc: how the pool engine plugs in with zero new tooling.

**AI-4-1 (concurrent-load p95)**
- Validity FR-12A cached-path harness (measures `getValidityCached`, not the uncached placeholder).
- 4.7 admin-search harness with per-row Tier-1 KMS decryption in the measured path; adapter-labelled evidence.
- `p95-budget.md` — the extended committed evidence doc.

**AI-4-2 (real-path determinism)**
- The DB-backed real-producer replay harness (or the documented hit≡recompute backstop, per D2); the synthetic 100×-thread gate left intact.

**Teeth + decisions**
- Dev Agent Record: D1–D4 dispositions, both revert-sanity teeth evidences, recorded numbers, the 7.9 join instruction.

## Dev Agent Record

**As-built disposition (D1–D4, ratified BigDev 2026-07-17):**
- **D1 (CI posture)** — built as approved: a small-N (M=60, env-scalable) smoke in the DB-gated suite with a
  LOOSE ceiling (FR-12A 2000ms, admin-search 5000ms — cached/decrypt reads spike under full-parallel
  contention, same discipline as the uncached placeholder's 2000ms). **No 4L job added to the per-PR gate.**
  The true 4L run is env-flagged (`MEASURED_VALIDATION=1`), asserts the real budgets (200ms / ~5s), and
  appends a versioned record to the committed `p95-budget.md`.
- **D2 (AI-4-2)** — built as approved (**extend**): `measured-validation-determinism.spec.ts` runs the REAL
  DB-backed producer (`getValidityAt` at a pinned instant) K=12× and applies `assertReplayStable`
  (deep-equal + single-hash + discrimination). The synthetic 100×-thread P0 gate (`determinism.test.ts`) is
  **untouched and still green** (verified in every run) — the real-path harness is purely additive.
- **D3 (framework home)** — built as the conditional path: **shared `tests/` test tooling** at
  `packages/validity-service/tests/framework/`, NOT a `packages/measured-validation` package. `@twt/validity-
  service` depends on `@twt/domain`, so its specs drive `projectMemberState` / `searchMembers` / `encryption`
  with no import cycle — one source within validity-service's own callers (`p95-bench.spec.ts` migrated to
  import it; `packages/domain`'s `search-projection-bench.spec.ts` deliberately keeps its own copy, since
  domain does not depend on validity-service and importing across that boundary would invert the package
  graph — documented in-file, review fix 2026-07-17). The package extraction is a Story-7.9-time move IF the
  pool engine lands as its own package ([[feedback_no_premature_package]]); the README documents that seam.
- **D4 (scope)** — built as approved: framework + validity-side application only. The pool engine (7.1–7.8)
  is untouched (all-backlog); the 7.9 wiring is published as a seam doc, not implemented.

**What was built (the ONE shared core, `tests/framework/`):**
- `percentiles.ts` — `measureP95(op, { iterations, concurrency, warmup })` via a bounded concurrency pool,
  timing each invocation individually (per-request p95 UNDER contention).
- `evidence.ts` — the **versioned-evidence** record: `EVIDENCE_SCHEMA_VERSION`, `buildRecord`/`recordEvidence`
  (schema-stamped `{config, gitCommit, env, results, budget, pass}`), `readRecords`, and `compareRecords`
  (comparable ONLY at matching `schema_version` + `metric` + identical config; else surfaces the delta).
- `replay.ts` — `assertReplayStable`: (a) full canonical-payload deep equality, (b) single hash, (c)
  discrimination (a perturbed input MUST change the hash). A stable-but-incomplete hash OR a degenerate
  constant hash both FAIL.
- `seed.ts` — `seedValidityMembers` (real event-log path) + `seedSearchMembers` (real projector → members +
  `member_search_projection`, plus a `member_identities` Tier-1 mobile ciphertext) + `makeFakeEncryption`
  (the `dev-fake-kms` envelope crypto). No invented columns; own-committing; scoped cleanup.
- `provenance.ts` — `gitCommit()` + `pgServerVersion()`. `index.ts` re-exports the whole core; `README.md`
  carries the Story 7.9 plug-in seam.

**The precise AI-4-1 gap closed:** the pre-existing `search-projection-bench.spec.ts` seeds **no identity
rows**, so it never exercises per-row Tier-1 KMS decryption — it measured only the AR-65 page query.
`measured-validation-search-kms.spec.ts` seeds a Tier-1 mobile ciphertext per member and measures
`searchMembers` **+ per-row `decryptTier1`** — the real admin-search display cost. FR-12A stays a pure
compute+cache budget (`cryptoAdapter: n/a`) because the validity service never decrypts Tier-1 (`producer.ts`).

**Recorded CI-representative smoke numbers** (M=60, concurrency 8, PG 16.14 :5433, isolation; committed to
`tests/bench/p95-budget.md` as `schema_version:1` records):
- `fr12a-cached-p95` (adapter `n/a`): p50 2.2 / p95 3.64 / p99 4.09 ms — budget 2000ms — pass. (Under full
  `ci:local` contention p95 rises to ~120ms, still ~16× under the loose ceiling.)
- `admin-search-kms-p95` (adapter `dev-fake-kms`): p50 8.3 / p95 16.33 / p99 18.56 ms — budget 5000ms — pass.
- Real-path determinism: ONE distinct hash across 12 real-producer replays, full payload deep-equal, a
  different-member perturbation yields a different hash, and the stable hash == `getValidity` == the 4.8
  hit≡recompute value. The synthetic 100×-thread P0 gate remained green.

**Pre-launch 4L is UN-ATTESTED (carried, not back-filled — [[feedback_record_unattested_no_backfill]]):** the
200ms@4L / ~5s@4L headline requires ~4L seeding + the operator-gated real Cloud KMS adapter (Epic 1), neither
available in CI. The harness + env-gating + evidence appender are built and exercised; the actual 4L numbers
are an open pre-launch item to be run with `MEASURED_VALIDATION=1` + the cloud adapter, recorded to
`p95-budget.md`, never reconstructed from a CI-representative number.

**Teeth (revert-sanity, dev-only, reverted byte-identical — NOT committed):**
- (a) Injected `Math.random()` into `producer.ts` `deriveMedicalDisclosureFlags` (a random hashed field) →
  `measured-validation-determinism.spec.ts` went RED: `[assertReplayStable] non-deterministic hash: 12
  distinct values across 12 replays`. `git checkout -- producer.ts` → byte-identical, re-ran green.
- (b) Injected `await setTimeout(2200)` into `cache.ts` `getValidityCached` (per-call delay past the 2000ms
  smoke ceiling) → `measured-validation-fr12a.spec.ts` went RED: `expected 2215.33 to be less than 2000`.
  `git checkout -- cache.ts` → byte-identical, re-ran green.

**Full suite (DATABASE_URL set, :5433): 93/93 green** — the three new harnesses, the untouched synthetic P0
determinism gate, the existing cache + service specs, and the (initially self-broken, then fixed) uncached
`p95-bench.spec.ts`. Root cause of the transient break + fix recorded in the Change Log below.

**Story 7.9 join instruction (the "no duplicate tooling" contract):** once 7.1–7.8 land the pool-spawn saga,
7.9 imports this core (extracted to `packages/measured-validation` at that point per D3), then: (1) seed 4L +
an N=50 cohort in a non-production Pariwar; (2) `measureP95` the spawn-saga wall-clock (bulk-approval →
`cycle.frozen`), assert p95 < 60s across ≥10 runs; (3) `recordEvidence` a `schema_version`-stamped record
(config incl. `n:50, m:4L`, adapter, git_commit) to `_bmad-output/research/pool-engine-validation-gate.md`
with Trustee signoff; (4) `assertReplayStable` over `hash(member_id+cycle_id)%N` — full assignment-map
deep-equality + `cycle_id` discrimination, NOT a bare digest; (5) register the FR-20 pool-spawn capacity gate
in the Story 0.15 launch-gate inventory. AI-6-2 publishes this seam (README); 7.9 owns (1)–(5).

## File List

**New — the shared framework core (`packages/validity-service/tests/framework/`):**
- `packages/validity-service/tests/framework/index.ts`
- `packages/validity-service/tests/framework/percentiles.ts`
- `packages/validity-service/tests/framework/evidence.ts`
- `packages/validity-service/tests/framework/replay.ts`
- `packages/validity-service/tests/framework/seed.ts`
- `packages/validity-service/tests/framework/provenance.ts`
- `packages/validity-service/tests/framework/README.md`

**New — tests / harnesses:**
- `packages/validity-service/tests/framework.test.ts` (DB-free core unit tests — percentiles, evidence, replay teeth)
- `packages/validity-service/tests/integration/measured-validation-fr12a.spec.ts`
- `packages/validity-service/tests/integration/measured-validation-search-kms.spec.ts`
- `packages/validity-service/tests/integration/measured-validation-determinism.spec.ts`

**Modified:**
- `packages/validity-service/tests/bench/p95-budget.md` (extended with the versioned-evidence section + smoke records)
- `_bmad-output/implementation-artifacts/ai-6-2-shared-measured-validation-framework.md` (status, tasks, this record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger comment)

## Change Log

- **AI-6-2** — Stood up the single shared measured-validation framework (`tests/framework/`): `measureP95`
  concurrency harness, versioned-evidence record (`schema_version` + config-delta comparison), stronger-than-
  hash `assertReplayStable` (deep-equal + discrimination), and the real event-log / projector seeding drivers.
- **AI-4-1 closed** — FR-12A cached-path concurrent-load p95 harness (measures the Story 4.8 delivery path,
  not the uncached placeholder) + the 4.7 admin-search harness with per-row Tier-1 KMS decryption in the
  measured path (the gap the identity-less search bench never exercised). Smoke records committed to
  `p95-budget.md`; the 4L/real-KMS headline carried as an un-attested pre-launch item.
- **AI-4-2 closed** — real-path determinism harness over the DB-backed producer (deep-equal + single-hash +
  discrimination), matching the 4.8 hit≡recompute value; the synthetic 100×-thread P0 gate left intact.
- **Transient self-inflicted regression, fixed** — the harness `afterAll` initially swept `idempotency_keys`
  with a GLOBAL `LIKE 'rule-eval:v1:%'` delete, which raced the concurrently-running `p95-bench.spec.ts`'s
  in-flight keys (`IdempotencyKeyNotClaimedError`). Removed the global sweep (memo keys TTL-expire; every run
  uses fresh member ids) — the live-DB "don't touch other suites' rows" discipline
  ([[project_live_db_test_gotchas]]). Full suite green afterward.
- **`pnpm ci:local` merge gate: all 22 structural gates GREEN** (lint, typecheck, build, db-check,
  contracts-determinism, crypto-check, tokens-theme, i18n-parity, pii-scrape, friction-budget, schema-diff,
  benefit-mechanism, microcopy, domain-invariants, member/claim/canonical-id/human-actor state invariants,
  kyc-provider-boundary, access-wrapper-invariants, determinism-replay, channels-determinism). **`@twt/validity-
  service` 93/93 green** (all three new harnesses + framework unit tests + the untouched synthetic P0 gate).
  The ONLY monorepo failure is `@twt/domain` `device-token.spec.ts` (`purgeExpiredDeviceTokens deletes
  stale>7d/invalid>30d` — `expected 8 to be 2`) — the **pre-existing shared-DB count-contamination flake**
  ([[project_known_livedb_test_failures]]): that test asserts a GLOBAL un-scoped purge count of 2, but the
  :5433 dev DB holds 723 accumulated device-token rows (348 prunable) from months of prior runs. **AI-6-2
  touches NO device-token surface** (grep-verified) and writes zero device_token rows, so it cannot affect
  this count; the test fails against this DB state for anyone, independent of this change. Not addressed here
  (pre-existing, out of scope; the fix is to scope that test's purge assertion to its own member).
