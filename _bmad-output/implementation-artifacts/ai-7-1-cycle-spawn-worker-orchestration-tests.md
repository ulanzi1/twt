---
title: 'AI-7-1 — Orchestration-level unit tests for the cycle-spawn worker (apps/jobs/src/cycle-spawn.ts)'
type: 'chore'
created: '2026-07-17'
baseline_commit: d8dcfd71f48b9605e9c25bcecf1e2cc6d154b7f6
status: 'done'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/7-3-pool-spawn-saga-parent-n-child-jobs-atomic-cycle-freeze-invariant.md'
  - '{project-root}/apps/jobs/src/cycle-spawn.ts'
  - '{project-root}/packages/domain/src/idempotency/keyed-store.ts'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `apps/jobs/src/cycle-spawn.ts` (`runCycleSpawnParent`, `runCycleSpawnChild`, `registerCycleSpawnWorkers`) has **zero direct test coverage**. Story 7.3's code review (Blind Hunter) flagged this as "the riskiest new logic in the story … entirely unverified by any automated test," and the same review's fixes — release-the-claim-on-planning-failure, a breadcrumb on finalize failure, the new `cycle.spawn.started` event, and worker-concurrency wiring (`POOL_SPAWN_CHILD_CONCURRENCY` / `localConcurrency`) — added meaningfully more branching to this exact file with the gap still open. Existing coverage is domain-level only (`packages/domain/tests/pool/spawn.test.ts` + `tests/integration/pool/pool-spawn-saga.spec.ts`), which drives the pure/DB-backed domain functions directly and never exercises the pg-boss worker orchestration wrapper (retry/claim-release logic, breadcrumb-recording glue, `boss.work()` options).

**Approach:** Add a fakes/mocks-driven **orchestration** test suite for `cycle-spawn.ts`, isolating the worker layer from Postgres and pg-boss entirely — fake `CycleSpawnDeps`, a fake/capturing `KeyedStore`, a fake/capturing pg-boss client, and mocked `@twt/domain` pool functions + `withPariwarScope` — so each scenario asserts **control flow** (what gets called, in what order, with what side effects) rather than DB behavior. This complements, not duplicates, the domain-level live-DB tests.

## Boundaries & Constraints

**Always:**
- Zero production source changes required to make `cycle-spawn.ts` testable UNLESS a seam is genuinely needed (Ask First on that) — `runCycleSpawnParent`/`runCycleSpawnChild`/`registerCycleSpawnWorkers` are already exported for direct invocation, per the module's own doc comments ("Drive it in isolation with a fake pool").
- Fake the injected `CycleSpawnDeps` fields (`pool`, `fixedAmount`, `assignmentSeam`, `onAlarm`, `childConcurrency`) directly — no real `pg.Pool`, no DB connection.
- Fake the pg-boss client: a capturing object recording every `send()` call (queue name, payload, `singletonKey`) for the parent-dispatch assertions, and a capturing object recording every `work()` call's queue name + options for the `registerCycleSpawnWorkers` concurrency assertion.
- Mock the `@twt/domain` functions this file calls directly — `poolDomain.planCycleSpawn`, `poolDomain.spawnChildPool`, `poolDomain.finalizeCycleIfComplete`, `poolDomain.appendCycleAborted`, `poolDomain.appendCycleSpawnStarted` — plus `withPariwarScope` and `idempotency.createKeyedStore` — so no real transaction/connection is ever opened.
- Each scenario asserts orchestration behavior only: which domain function was called, with what args, in what order; the keyed-store `claim`/`release`/`recordResult`/`getResult` sequence; what alarm messages fired; what child jobs were enqueued; what `work()` options were passed for the child queue.
- Live at `apps/jobs/tests/cycle-spawn.test.ts` (matching this package's `*.test.ts` naming). `claim-shepherd-assign.test.ts` is an existing **live-DB** `*.test.ts` precedent for an apps/jobs worker — state explicitly in this suite's WHY header that it is the deliberate fakes/mocks alternative, not a competing live-DB style, so a future reader isn't confused by the naming overlap.
- Do not duplicate `packages/domain/tests/pool/spawn.test.ts` (pure functions: `derivePoolId`, `isPoolSpawnIndexConflict`, `deriveFreezeMonth`, the seam contract, cycle-event schemas) or `packages/domain/tests/integration/pool/pool-spawn-saga.spec.ts` (the real live-DB atomicity/idempotency/concurrency proof).

**Ask First:**
- Whether `@twt/domain`'s `pool.*` exports need a lightweight seam (e.g. accepting the domain calls as injected functions on `CycleSpawnDeps`) if `vi.mock` proves awkward for this module's namespace-import shape (`import { pool as poolDomain } from '@twt/domain'`).
- Whether `withPariwarScope` needs similar treatment, since it isn't part of `CycleSpawnDeps` and is imported directly from `@twt/domain`.

**Never:**
- No real Postgres connection, no `DATABASE_URL` dependency, no `describe.skipIf(!hasDatabase)` — this suite must run unconditionally in every environment.
- No changes to `packages/domain/src/pool/spawn.ts` or `apps/jobs/src/cycle-spawn.ts`'s actual behavior — test-only, like AI-5-2/AI-6-3.
- No new shared test-utils/mocking framework — plain vitest `vi.fn()`/`vi.mock`, matching the codebase's existing style.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Successful parent planning | `store.claim` → `'acquired'`; `planCycleSpawn` resolves with N children | `appendCycleSpawnStarted` called once inside the same `withPariwarScope` tx as `planCycleSpawn`; `recordResult` called with the planned children; N child jobs sent via `boss.send` with the correct `singletonKey`; result has `planned: true` | N/A |
| Planning failure releases the claim | `store.claim` → `'acquired'`; `planCycleSpawn` (or its wrapping tx) rejects | `store.release(key)` called; `alarm` fires describing the failure; the original error rethrows; NO `recordResult`, NO child jobs sent | Release failure itself is also alarmed (double-catch), never swallowed silently |
| `recordResult` failure path | `store.claim` → `'acquired'`; `planCycleSpawn` resolves; `store.recordResult` rejects | Same as planning failure: `release` called, `alarm` fires, error rethrows, no children sent | N/A |
| Duplicate child retry (idempotent re-enqueue) | `store.claim` → `'already_claimed'`; `store.getResult` returns a stored plan | Children re-derived from the stored plan (NOT re-planned) — `planCycleSpawn` never called; `boss.send` called again for each child; result has `planned: false` | N/A |
| Finalize success | `spawnChildPool` resolves; `finalizeCycleIfComplete` resolves `{frozen: true}` | No `appendCycleAborted` call; result reflects `spawned`/`frozen` from the fakes | N/A |
| Finalize failure records breadcrumb | `spawnChildPool` resolves; `finalizeCycleIfComplete` rejects | `appendCycleAborted` called with a reason derived from the finalize error; the original error rethrows (not swallowed) | N/A |
| Child worker concurrency honored | `registerCycleSpawnWorkers` called with an explicit `childConcurrency: N`, and separately with it omitted | `boss.work` for `CYCLE_SPAWN_CHILD` is called with `{ localConcurrency: N }` (or `DEFAULT_CHILD_LOCAL_CONCURRENCY` when omitted); the `CYCLE_SPAWN_PARENT` registration is unaffected | N/A |

</frozen-after-approval>

## Code Map

- `apps/jobs/src/cycle-spawn.ts:93-184` (`runCycleSpawnParent`), `:192-269` (`runCycleSpawnChild`), `:276-301` (`registerCycleSpawnWorkers`) — the file under test.
- `packages/domain/src/idempotency/keyed-store.ts` — the `KeyedStore` interface (`claim`/`recordResult`/`getResult`/`release`) — the shape to fake.
- `packages/domain/src/pool/spawn.ts` — the `pool.*` domain functions this file calls; mock these.
- `packages/domain/src/db.ts:161` — `withPariwarScope(pool, pariwarId, fn)` signature — the shape to fake/stub.
- `packages/queue/src/index.ts` — `QUEUE_NAMES.CYCLE_SPAWN_PARENT`/`CYCLE_SPAWN_CHILD`, `JobEnvelope`, `QueueClient` types.
- `apps/jobs/tests/claim-shepherd-assign.test.ts` — the existing live-DB apps/jobs worker-test precedent; the new suite's header should name this file and say why it takes the opposite (fakes/mocks) approach.
- `_bmad-output/implementation-artifacts/7-3-pool-spawn-saga-parent-n-child-jobs-atomic-cycle-freeze-invariant.md` (Review Findings section) — source of the coverage gap + the D1/D2/D3 decisions this suite verifies.

## Tasks & Acceptance

**Execution:**
- [x] `git` -- branch `story/ai-7-1-cycle-spawn-worker-orchestration-tests` off up-to-date `main` (after Story 7.3 merges) -- repo convention
- [x] `apps/jobs/tests/cycle-spawn.test.ts` -- new orchestration suite: fakes for `CycleSpawnDeps`, a capturing pg-boss client, mocked `@twt/domain` pool functions + `withPariwarScope` + `idempotency.createKeyedStore` -- the 7 scenarios in the I/O matrix
- [x] `_bmad-output/implementation-artifacts/ai-7-1-cycle-spawn-worker-orchestration-tests.md` -- append a Dev Agent Record (test-run results, any Ask-First resolution) -- continuity

**Acceptance Criteria:**
- Given a fresh claim, when the parent plans successfully, then `appendCycleSpawnStarted` + `recordResult` + N child `boss.send` calls happen in that order, with no `release` call.
- Given `planCycleSpawn` (or `recordResult`) rejects, when the parent handles the error, then `store.release` is called with the claim key, `alarm` fires, and the original error propagates — no children are enqueued.
- Given `store.claim` returns `'already_claimed'` with a stored plan, when the parent runs, then `planCycleSpawn` is never called and the stored children are re-enqueued.
- Given `finalizeCycleIfComplete` rejects, when the child handles the error, then `appendCycleAborted` is called and the original error rethrows.
- Given `registerCycleSpawnWorkers` is called with an explicit `childConcurrency`, when the `CYCLE_SPAWN_CHILD` queue is registered, then `boss.work` is called with `{ localConcurrency: <that value> }`; given it is omitted, then `DEFAULT_CHILD_LOCAL_CONCURRENCY` is used.
- Given the full local gate, when `pnpm ci:local` runs, then all jobs pass including the new suite (no `DATABASE_URL` dependency).

## Design Notes

This suite is the **control-flow twin** of the domain-level DB tests — it never seeds real rows, never opens `:5433`, and runs unconditionally in every environment (no `describe.skipIf`).

The natural mocking seam is `vi.mock('@twt/domain', ...)` intercepting the individual `pool` namespace functions plus `withPariwarScope` and `idempotency.createKeyedStore` — a vitest partial-mock (`importOriginal` + overrides) keeps id/branding helpers real so branded-id equality checks still work.

A fake pg-boss client only needs to satisfy `Pick<QueueClient, 'send'>` for the parent-only tests, plus a capturing `work()` for the `registerCycleSpawnWorkers` concurrency test — no real `QueueClient`/pg-boss server needed.

The finalize-failure breadcrumb path shares one `recordAborted` helper with the spawn-failure path (`apps/jobs/src/cycle-spawn.ts:211-226`) — covering finalize failure exercises the shared helper; a spawn-failure variant is optional parity coverage, not required by this story's scope.

## Verification

**Commands:**
- `pnpm --filter @twt/jobs test -- cycle-spawn` -- expected: new suite green, no `DATABASE_URL` required
- `pnpm --filter @twt/jobs typecheck && pnpm --filter @twt/jobs lint` -- expected: clean
- `pnpm ci:local` -- expected: all jobs green (the merge gate while Actions is suspended)

## Dev Agent Record

### Files created / changed

- [apps/jobs/tests/cycle-spawn.test.ts](../../apps/jobs/tests/cycle-spawn.test.ts) — NEW: the orchestration suite, 10 tests across the 7 scenarios in the I/O matrix (a couple of scenarios split into two `it`s for clarity — e.g. the planning-failure path also gets a dedicated "release itself fails" sub-case).
- **Zero production source changes** (verified: `git status` shows only the new test file).

### Ask-First items — both resolved without a seam change

Both flagged questions resolved in favor of the plain approach, no production code touched:

1. **`@twt/domain`'s `pool.*` exports** — `vi.mock('@twt/domain', async (importOriginal) => {...})` with a partial override (`{ ...actual.pool, planCycleSpawn: vi.fn(), ... }`) worked cleanly on the first run. `@twt/domain` re-exports `pool`/`idempotency` via `export * as X from './...'`, and `cycle-spawn.ts` already imports them as `pool as poolDomain` / `idempotency` namespace bindings, so overriding individual properties while spreading the rest of `actual.pool`/`actual.idempotency` through (keeping `V1_SPAWN_SUPPORT_CATEGORY`, `V1_SPAWN_BENEFIT_MECHANISM`, and the branded-id types real) required no seam in the production module.
2. **`withPariwarScope`** — same technique: it's a plain named export, replaced wholesale by the mock factory with a fake that just invokes the callback against placeholder `db`/`client` objects. No seam needed.

### Test-design notes

- **Ordering proof** (scenario 1): `planCycleSpawn` and `appendCycleSpawnStarted` are asserted to run inside exactly ONE `withPariwarScope` call (`toHaveBeenCalledTimes(1)`), and `mock.invocationCallOrder` proves `planCycleSpawn` fires before `appendCycleSpawnStarted` — the "same tx, in order" claim in the matrix, not just "both got called eventually."
- **The `recordResult`-failure scenario is distinguishable from the planning-failure scenario** by which mocks got called before the throw: in the planning-failure case, `appendCycleSpawnStarted` is asserted NOT called (the tx failed before reaching it); in the `recordResult`-failure case, both `planCycleSpawn` AND `appendCycleSpawnStarted` succeeded (the tx committed) and the failure is asserted to happen strictly after, on the separate `store.recordResult` call outside the tx. Both funnel through the same `catch` block in `runCycleSpawnParent`, so both assert the same `release`+`alarm`+rethrow shape — the matrix's "same as planning failure" note, verified rather than assumed.
- **Release-failure double-catch**: a dedicated test sets `store.release` to itself reject, and asserts the ORIGINAL planning error (not the release error) is what the caller sees, while a second alarm call reports the release failure — proving the double-catch in `runCycleSpawnParent` never swallows or replaces the real error.
- The concurrency scenario is split into 3 `it`s (explicit value, default value, parent-queue unaffected) rather than one — each pins a single, independently-readable claim from the matrix's "Child worker concurrency honored" row.

### Test-run results (2026-07-17)

| Command | Result |
|---|---|
| `pnpm exec vitest run tests/cycle-spawn.test.ts` (no `DATABASE_URL`) | 10 passed |
| `DATABASE_URL=…:5433… pnpm exec vitest run tests/cycle-spawn.test.ts` | 10 passed (identical — the suite is DB-independent, confirming the "runs unconditionally" constraint) |
| `DATABASE_URL=…:5433… pnpm exec vitest run --testTimeout=20000` (full `@twt/jobs` suite) | 13 files / 80 tests passed, no regressions |
| `pnpm --filter @twt/jobs typecheck` | clean |
| `pnpm --filter @twt/jobs lint` | clean (one `no-unused-vars` on an initial unused `ids` import, fixed) |

### Story status

Frontmatter `status` → `review`. Not a `development_status` key in `sprint-status.yaml` (tracked via the top-of-file ledger comment + this standalone file, per the AI-x convention).

## Review Findings

_Code review 2026-07-18 (3-layer adversarial: Blind Hunter / Edge Case Hunter / Acceptance Auditor). Acceptance Auditor: all 7 matrix rows + 6 ACs covered, every Never/Always constraint honored, invariant families #2 & #4 covered-by-test, zero REAL GAPs. The findings below are test-quality hardening (production code unchanged; behavior already proven by the domain-level live-DB suites). None are shipping bugs._

_Resolution (2026-07-18): scope-decision → option 1 (cover the chief candidate, defer 5 secondaries). All 10 patches APPLIED to `apps/jobs/tests/cycle-spawn.test.ts` — suite grew 10 → 13 tests. Re-verified: `vitest run tests/cycle-spawn.test.ts` (no DATABASE_URL) 13 passed; `@twt/jobs typecheck` clean; `@twt/jobs lint` clean. Test-only; zero production source changes preserved. Status → `done`._

### Decision-needed (resolved 2026-07-18 → option 1: cover chief candidate, defer secondaries)

- [x] [Review][Decision] Extend the frozen 7-scenario matrix to cover uncovered production branches? — RESOLVED: cover the chief candidate as a patch (below); the five secondary candidates are deferred (see Deferred section). Rationale: the retry-throw guards against a silently-stuck cycle (highest failure-severity); the secondaries are lower-severity and kept out to hold the frozen test story's scope tight.

### Patch (weak assertion inside an already-covered scenario)

- [x] [Review][Patch] Cover the parent `getResult === null` retry-throw branch [apps/jobs/src/cycle-spawn.ts:154-160] — add a test where `store.claim` → `'already_claimed'` but `store.getResult` resolves `null` (concurrent claimant in-flight / vacuumed result), asserting `runCycleSpawnParent` rejects with the "plan not yet recorded — retry" error, `planCycleSpawn` is never called, and `boss.send` never fires. Guards against a regression turning the throw into a silent empty-children success (a permanently stuck cycle). **(MED — resolved from the scope decision.)**

- [x] [Review][Patch] Registered worker handlers are asserted but never invoked [apps/jobs/tests/cycle-spawn.test.ts:369-391] — the 3 `registerCycleSpawnWorkers` tests only assert `boss.work` was called with `expect.any(Function)`; the handler closures (`job.data` unwrap → dispatch to `runCycleSpawnChild`/`runCycleSpawnParent` → `{processed,results}` aggregation, cycle-spawn.ts:284-300) are never executed. A child queue wired to the parent runner (copy-paste swap) or a bad `job.data` cast ships green. Capture the handler and invoke it with a fake job. **(HIGH — highest-value gap; this glue is the riskiest untested part.)**
- [x] [Review][Patch] Idempotent-retry re-enqueue asserts only call count, not queue/payload/singletonKey [apps/jobs/tests/cycle-spawn.test.ts:317] — the duplicate-run test checks `boss.send` was called `children.length` times but not `toHaveBeenNthCalledWith(queue, payload, {singletonKey})`. The stored-plan re-enqueue is the more bug-prone route (wrong queue / dropped `${cycleId}:${poolIndex}` dedup key) and it slips through. Mirror the success-path Nth-called-with assertions. **(MED)**
- [x] [Review][Patch] Domain-fn arguments never asserted (forwarding unverified) [apps/jobs/tests/cycle-spawn.test.ts:187,271,327] — `planCycleSpawnMock`/`spawnChildPoolMock`/`finalizeCycleIfCompleteMock` are asserted `toHaveBeenCalledTimes(1)` but never `toHaveBeenCalledWith(...)`; the mocks return canned values regardless of input, so passing the wrong/empty `frozenClaims` or a mangled `spec` yields a matching result and stays green. Add `toHaveBeenCalledWith` forwarding checks. **(MED)**
- [x] [Review][Patch] "records the result once" never asserts a count [apps/jobs/tests/cycle-spawn.test.ts:198] — title claims "once" but body is `toHaveBeenCalledWith` (passes on ≥1 matching call). A double-record regression passes. Add `toHaveBeenCalledTimes(1)`. **(LOW)**
- [x] [Review][Patch] `rejects.toThrow(err)` matches message, not identity [apps/jobs/tests/cycle-spawn.test.ts:243,257] — the "still rethrows the *original* planning error" test would pass even if production caught and threw a new `Error` with the same message (losing stack/`cause`/identity). Use `.rejects.toBe(planError)` on the double-catch test. **(LOW)**
- [x] [Review][Patch] finalize-success asserts nothing about spawn/finalize being invoked [apps/jobs/tests/cycle-spawn.test.ts:334-337] — every returned field is derivable from the canned mock returns; a path that skipped `spawnChildPool`/`finalizeCycleIfComplete` and returned a matching object passes. Assert both were called (with `spec`/args). **(LOW)**
- [x] [Review][Patch] Release-failure test doesn't assert the planning alarm also fired [apps/jobs/tests/cycle-spawn.test.ts:257-259] — only the `'failed to release claim'` alarm is checked; a regression dropping the planning alarm is uncaught here. Assert both alarm messages. **(LOW)**
- [x] [Review][Patch] "same tx" proven only by call-order, not shared handle [apps/jobs/tests/cycle-spawn.test.ts:190] — the db handle to `appendCycleSpawnStarted` is matched with `expect.anything()` and the mock hands a fresh `{}` per call; capture the db arg and assert `planCycleSpawn` and `appendCycleSpawnStarted` received the SAME handle to actually pin single-tx. **(LOW)**
- [x] [Review][Patch] `vi.clearAllMocks()` leaks mock implementations across tests [apps/jobs/tests/cycle-spawn.test.ts:154] — `clearAllMocks` resets call history but NOT implementations; only `withPariwarScopeMock` is re-primed in `beforeEach`. No manifest bug today (each parent test re-sets `createKeyedStoreMock`; `runCycleSpawnChild` never touches the store — the Blind Hunter's specific "child borrows a leaked store" scenario does not occur), but switching to `vi.resetAllMocks()` (re-priming the `withPariwarScope` default after) removes a latent order-dependence footgun. **(LOW — defensive.)**

### Deferred (spec explicitly scoped these out)

- [x] [Review][Defer] Missing-`pariwarId` guard uncovered in both parent (:102-105) and child (:200-203) [apps/jobs/src/cycle-spawn.ts] — deferred, outside the frozen 7-scenario matrix (Acceptance Auditor: "correctly absent").
- [x] [Review][Defer] Child spawn-FAILURE `recordAborted` path uncovered (:235-238) [apps/jobs/src/cycle-spawn.ts] — deferred, Design Notes call the spawn-failure variant "optional parity coverage, not required by this story's scope" (the shared `recordAborted` helper is already exercised via the finalize-failure test).
- [x] [Review][Defer] Zero-children plan (empty `frozenClaims`, `poolCount:0`, `boss.send` never called) uncovered [apps/jobs/src/cycle-spawn.ts:167-181] — deferred, degenerate case not in the matrix.
- [x] [Review][Defer] `childConcurrency = 0` `??`-vs-`||` boundary uncovered [apps/jobs/src/cycle-spawn.ts:283] — deferred (scope decision, option 1), lower failure-severity than the retry-throw.
- [x] [Review][Defer] `parentIdempotencyTtlSeconds` wiring never asserted on `store.claim` [apps/jobs/src/cycle-spawn.ts:108,116] — deferred (scope decision, option 1); the mid-run claim-expiry hazard the doc comment warns about.
- [x] [Review][Defer] non-`Error` thrown value → `String(err)` reason branch uncovered [apps/jobs/src/cycle-spawn.ts:212] — deferred (scope decision, option 1).
- [x] [Review][Defer] `recordAborted` never-masks-original-error invariant uncovered [apps/jobs/src/cycle-spawn.ts:221-225] — deferred (scope decision, option 1).
- [x] [Review][Defer] actorId/traceId propagation onto fanned-out child envelopes unasserted [apps/jobs/src/cycle-spawn.ts:171-176] — deferred (scope decision, option 1).
