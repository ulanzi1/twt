---
title: 'AI-7-1 — Orchestration-level unit tests for the cycle-spawn worker (apps/jobs/src/cycle-spawn.ts)'
type: 'chore'
created: '2026-07-17'
baseline_commit: d8dcfd71f48b9605e9c25bcecf1e2cc6d154b7f6
status: 'ready-for-dev'
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
- [ ] `git` -- branch `story/ai-7-1-cycle-spawn-worker-orchestration-tests` off up-to-date `main` (after Story 7.3 merges) -- repo convention
- [ ] `apps/jobs/tests/cycle-spawn.test.ts` -- new orchestration suite: fakes for `CycleSpawnDeps`, a capturing pg-boss client, mocked `@twt/domain` pool functions + `withPariwarScope` + `idempotency.createKeyedStore` -- the 7 scenarios in the I/O matrix
- [ ] `_bmad-output/implementation-artifacts/ai-7-1-cycle-spawn-worker-orchestration-tests.md` -- append a Dev Agent Record (test-run results, any Ask-First resolution) -- continuity

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
