---
title: 'AI-7-2 — Live freeze-time assignable-roster query wired into cycle-spawn (fills pool member_assignments)'
type: 'feature'
created: '2026-07-19'
baseline_commit: 0b7f8199dcac3696192b3fd522be1027555e9a4e
status: 'done'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/7-4-deterministic-member-to-pool-assignment-property-based-replay-test-suite.md'
  - '{project-root}/_bmad-output/implementation-artifacts/7-6-pool-bound-payment-enforcement.md'
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
  - '{project-root}/packages/domain/src/pool/spawn.ts'
  - '{project-root}/packages/domain/src/pool/assign.ts'
  - '{project-root}/apps/jobs/src/cycle-spawn.ts'
  - '{project-root}/packages/validity-service/src/service.ts'
---

> **RATIFIED 2026-07-19.** D1 confirmed by BigDev — assignable = `getValidityAt(m, committed_at).is_valid`,
> **including** active-in-grace. D2 (per-child, cache-warmed) + D3 (local `apps/jobs` helper) accepted as
> proposed. The `<frozen-after-approval>` block is now the committed intent.

## Why this exists (the gap Story 7.4/7.6 left open)

Story 7.4 shipped the deterministic assignment **algorithm** and wired the **real** seam
(`createPoolAssignmentSeam`) into `apps/jobs/src/boot.ts`, but deferred the production **roster supply**
(the D2 (A)→(B) fallback, BigDev-preauthorized). Story 7.6 shipped the **consumer** — the resolver that
reads `pool_snapshots.member_assignments` for a member's VPA/collection binding — but proved it only
against integration fixtures that **seed snapshots directly** with `assignMembersToPools` output, because
the live spawn saga still produces **empty** rosters.

The result today: `spawnChildPool` (`packages/domain/src/pool/spawn.ts:377`) hardcodes
`const memberSet: readonly string[] = []`, so the real seam returns `[]` and every spawned pool carries
**zero member assignments**. Against production data, `resolveAssignedPoolForMember` (7.6) returns
`{ assigned: false }` for **every** member — the assignment path is not connected end-to-end.

This story closes that gap: build the freeze-time assignable-roster read and thread it through the spawn
saga so pools carry real assignments. It also folds in the linked deferred item (`deferred-work.md:2099`):
once `m > 0`, `assignMembersToPools`'s balancing-invariant throw becomes reachable in the live worker and
needs explicit error handling.

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates. D1/D2/D3 ratified 2026-07-19.">

## Architectural invariant (FROZEN — do not "optimize")

**`is_valid` is the canonical assignability predicate.** The spawn pipeline MUST NOT inspect `is_active`,
lock-in state, grace status, suspension state, renewal state, or any other subfield when determining pool
membership. Those concepts are encapsulated by the historical Validity Service verdict at `committed_at`.

_Rationale for the reader tempted to "tighten" this later: every one of those subfields is already folded
into `is_valid` by the Story 4.6 Validity Service. Re-inspecting one here would (a) duplicate — and
inevitably drift from — the verdict's own logic, (b) re-derive member-state policy in the spawn layer,
violating [[project_engine_never_infers_contribution_facts]], and (c) break re-derivability: the assignment
must be a pure function of the frozen `is_valid` verdict at `committed_at`, nothing else._

## Intent

**Problem:** The production cycle-spawn path writes empty `pool_snapshots.member_assignments`, so no
member is ever assigned to a pool and the entire Story 7.6 resolver surface (VPA/collection-binding
resolution) is inert against real data. The three blockers Story 7.4 documented for the full-wire are all
addressable now that 7.6 is landed: (1) `@twt/domain` cannot import `@twt/validity-service` (layering is
validity-service → domain), (2) there is no bulk member-enumeration query, (3) the validity-payload →
"assignable" mapping is an unresolved policy.

**Approach:** Build a **set-level assignable-roster read** in a package that MAY import
`@twt/validity-service` (i.e. `apps/jobs`, NOT `@twt/domain`) that: enumerates the Pariwar's members
(new bulk read — blocker 2), evaluates each against the Story 4.6 Validity Service **at the cycle-freeze
`committed_at`** via `getValidityAt(memberId, committedAt)`, and keeps the members whose payload satisfies
the ratified assignable predicate (blocker 3 → D1). Inject it as a new dependency on `CycleSpawnDeps`,
resolve the roster inside `runCycleSpawnChild`, and thread the resulting `memberSet` into `spawnChildPool`
via a new spec/param — the seam type, the algorithm, and the `member_state_hash`/`assignment_roster_wired`
audit code path are already in place, so this is purely the roster **supply** plus the roster **query**.
Add explicit error handling around the (now-reachable) `assignMembersToPools` throw.

## Boundaries & Constraints

**Always:**
- The assignable set is sourced PURELY from the Story 4.6 Validity Service verdict at `committed_at` — the
  spawn/assignment layer READS the verdict, it NEVER derives member-state policy
  ([[project_engine_never_infers_contribution_facts]] / [[project_niyamavali_precedence_is_provenance]]).
  The predicate is a thin read of a payload field (D1), not a reimplementation of eligibility.
- The roster query lives in `apps/jobs` (which may depend on `@twt/validity-service`), injected into the
  spawn saga behind a typed dependency — `@twt/domain`'s `spawnChildPool` stays validity-service-free
  (it receives an already-resolved `memberSet`, never computes it).
- Evaluate validity at the cycle-freeze `committed_at` (`cycle_freeze_commits.committed_at`), NEVER `now()`
  — assignment must be a deterministic function of the frozen roster (Story 7.4 D1; §1.11 DB-authoritative
  time discipline). Re-running spawn for the same frozen cycle must produce the identical roster.
- Set `assignment_roster_wired: true` in the `pool.spawned` payload once a real roster flows (Story 7.4
  pre-reserved this marker as `false`; flipping it is how audit distinguishes "roster not yet wired" from
  a genuinely-empty roster — see `spawn.ts:399`).
- Reuse the validity **cache** (`getValidityCached`, [[project_validity_cache_failopen_pattern]]) for the
  per-member evaluations so the O(N·M) per-child recompute is cache-warmed, not N×M cold KMS/recomputes.
- The new bulk member-enumeration read is tenant-scoped (explicit `pariwar_id` predicate + RLS), returns
  member ids only (+ whatever the predicate needs), and is `count(DISTINCT)`-safe if any join fans out.

**Ratified (2026-07-19) — no longer open:**
- **D1:** assignable ≙ `getValidityAt(memberId, committed_at).is_valid`, **INCLUDING** active-in-grace
  members (`vyawasthaShulkStatus.isInGrace` does not exclude). Read the payload field directly — do not
  reimplement the eligibility logic behind it.
- **D2:** resolve the roster **per-child** in `runCycleSpawnChild` via the validity cache
  (`getValidityCached`) — keeps pg-boss child payloads bounded; the cache warms the O(N·M) recompute.
  Story 7.9 owns the <60s p95 validation.
- **D3:** the assignable predicate starts as a small named helper in `apps/jobs` (not a
  `@twt/validity-service` export) — promote only if a second consumer appears ([[feedback_no_premature_package]]).

**Never:**
- No `assignMembersToPools` call at resolution/spawn time that recomputes from anything other than the
  supplied `memberSet` — the algorithm is unchanged; only its input roster becomes real (no version bump).
- No `@twt/domain` → `@twt/validity-service` import (the layering blocker — would create a turbo cycle).
- No `now()`-based validity evaluation anywhere on the spawn path.
- No change to the Story 7.4 algorithm (hash / truncation / delimiter / balancing) or
  `POOL_ASSIGNMENT_HASH_VERSION` — a real roster is an INPUT change, not an algorithm change.
- No embedding of the epic's excluded-state list as a hardcoded set in the spawn/assignment layer — that
  list is a *description* of the Validity verdict, not a spec to reimplement (Story 7.4 D4).
- No inspection of `is_active`, lock-in, grace, suspension, renewal, or any `MemberValidityPayload`
  subfield other than `is_valid` when deciding pool membership (the frozen architectural invariant above).
  A reviewer seeing any such subfield read on the spawn path treats it as a finding.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path — real roster flows | Pariwar has M members, K assignable at `committed_at`; cycle spawns N pools | Each child resolves the K-member roster; `assignMembersToPools` places each member deterministically; snapshots carry non-empty `member_assignments`; `pool.spawned` payload has `assignment_roster_wired: true` + the real `member_state_hash` | N/A |
| Determinism / re-derivability | Same frozen cycle re-spawned (retry) | Identical roster (evaluated at the same `committed_at`) → identical assignments → idempotent no-op snapshot | N/A |
| Empty assignable set | M members, 0 assignable at `committed_at` | `memberSet = []`; snapshots empty (as today) but `assignment_roster_wired: true` (distinguishes "queried, none assignable" from "not wired") | N/A |
| Balancing-invariant throw now reachable | `m > 0` and `assignMembersToPools` throws its post-balancing invariant error | Explicit catch around the seam in `runCycleSpawnChild`/`spawnChildPool`: alarm + rethrow (no silent empty-roster success, no swallowed corruption) — the `deferred-work.md:2099` companion | Retry/alarm, never swallow |
| Validity Service read failure for one member | `getValidityAt`/cache errors for a single member mid-enumeration | Fail loud for the whole cycle (do NOT silently drop the member → a silently-omitted member is misrouted money); alarm + rethrow | Fail closed, alarmed |
| Cross-tenant isolation | Members exist under Pariwar B; spawn runs for Pariwar A | Enumeration + validity reads are scoped to A only (explicit `pariwar_id` + RLS); B's members never enter A's roster | N/A |
| active-in-grace boundary (per D1) | A member is `active-in-grace` at `committed_at` | Included/excluded exactly per the ratified D1 predicate — pinned by a test so the policy is executable, not implicit | N/A |

</frozen-after-approval>

## Code Map

- `packages/domain/src/pool/spawn.ts:347-399` — `spawnChildPool` + the hardcoded `memberSet: []` at :377 and
  the `assignment_roster_wired: false` marker at :399. The roster becomes a real input here (new spec field
  or param); the marker flips to `true`.
- `packages/domain/src/pool/spawn.ts:145-171` — `ChildSpawnSpec` / `PoolAssignmentSeamInput` / the
  `PoolAssignmentSeam` type + `emptyAssignmentSeam`. The seam already accepts `memberSet`; only the supply
  is missing.
- `packages/domain/src/pool/assign.ts` — `assignMembersToPools` (the post-balancing throw the D4 error
  handling must wrap) + `computeAssignableRosterHash` (the `member_state_hash` producer, already wired).
- `apps/jobs/src/cycle-spawn.ts:42-47` (`CycleSpawnDeps`), `:93` (`runCycleSpawnParent`), `:203-244`
  (`runCycleSpawnChild` → `spawnChildPool`), `:287` (`registerCycleSpawnWorkers`) — the injection + wiring
  site. Add the roster-supplier dep here; resolve + thread `memberSet`.
- `apps/jobs/package.json` — `@twt/validity-service` is **NOT** currently a dependency of `apps/jobs`
  (checked: dependencies today are `@twt/channels`/`@twt/contracts`/`@twt/domain`/`@twt/platform-adapters`/
  `@twt/queue`/`pg`/`pg-boss`). This story is the FIRST `apps/jobs` import of it — add
  `"@twt/validity-service": "workspace:*"`. No turbo-cycle risk: `apps/jobs` is a leaf app, nothing depends
  on it.
- `apps/jobs/src/boot.ts:231` (`const { db, pool } = createDb(connectionString, { max: 2, logger: false })`)
  + `:468-475` (where `createPoolAssignmentSeam()` is injected today) — `pool` here IS the BYPASSRLS
  service pool already threaded into `CycleSpawnDeps.pool`, so it doubles as `ValidityServiceDeps.servicePool`.
  Construct the roster-supplier dep alongside the assignment seam injection.
- `packages/validity-service/src/service.ts:63` (`getValidityAt`) + `packages/validity-service/src/cache.ts`
  `getValidityCached` (the cache-warmed path, prefer this per D2) — both take
  `deps: ValidityServiceDeps` = niyamavali-engine's `EvaluateDeps` (`evaluate.ts:38-50`): `{ db: Db
  (RLS-scoped), keyedStore: idempotency.KeyedStore, servicePool: pg.Pool (BYPASSRLS), actor?, traceId? }`.
  Inside `runCycleSpawnChild`, assemble it from pieces already in scope: `db` from the existing
  `withPariwarScope(deps.pool, pariwarId, (db, client) => …)` call, `keyedStore` from
  `idempotency.createKeyedStore(deps.pool)` (the exact call `runCycleSpawnParent` already makes),
  `servicePool: deps.pool`. **Both functions throw immediately unless `opts.caller` or `opts.internal` is
  supplied** (service.ts:72-76, cache.ts:64-68) — the spawn saga is a system actor with no caller/RBAC
  context, so call with `{ internal: true }` (the option's own docstring names exactly this case — "e.g.
  the Story 4.8 cache warmer"). Passing `opts.caller` instead would route the payload through
  `redactForCaller`, risking a stripped `is_valid` field depending on scope — `internal: true` returns the
  full unredacted payload, which the D1 predicate needs.
- `packages/validity-service/src/types.ts:156-172` — `MemberValidityPayload` (`is_valid` / `is_active` /
  `vyawasthaShulkStatus.isInGrace`) — the fields D1 chooses among.
- `packages/domain/src/claim/peer-mesh-read.ts:75-105` (`getPeerMeshCandidateSnapshot`) — the precedent for
  the new **bulk** member-enumeration read: a multi-row `members` query with an EXPLICIT
  `eq(members.pariwarId, …)` predicate (+ RLS), filtered by `members.state`, ordered by `members.memberId`
  (satisfies "stable ordering for determinism"). Mirror this shape, NOT `data-export/assemble.ts`'s
  single-row `eq(members.memberId, …)` lookup — that one has no explicit `pariwar_id` predicate (RLS-only)
  and doesn't match this story's own "explicit predicate + RLS" requirement above. There is no existing
  list-all-members-in-Pariwar query — this story adds one.
- `packages/domain/src/schema/cycle_freeze_commits.ts` — `committed_at`, the freeze instant validity is
  evaluated at.
- `deferred-work.md:2091-2100` — the two source deferrals this story discharges.

## Tasks & Acceptance

**Execution (proposal — finalize after D1/D2):**
- [x] `git` — branch `story/ai-7-2-freeze-time-assignable-roster-wiring` off up-to-date `main` — repo convention.
- [x] `apps/jobs/package.json` — add `"@twt/validity-service": "workspace:*"` (not a dependency today; this
  story is the first `apps/jobs` import of it).
- [x] Bulk member-enumeration read — `listMemberIdsForPariwar(db, pariwarId)` in
  `@twt/domain` member reads (`member/read.ts`): tenant-scoped, member ids only, RLS + explicit predicate —
  mirrors `claim/peer-mesh-read.ts`'s multi-row shape (explicit `pariwarId` predicate + `orderBy(members.memberId)`).
  DELIBERATELY unfiltered by `members.state` — the validity verdict is the sole filter (no member-state policy here).
- [x] Assignable-roster resolver in `apps/jobs` (`assignable-roster.ts`) — enumerate → `getValidityAt` at
  `committed_at`, called with `{ internal: true }` (system actor, no caller/RBAC context; assembles
  `ValidityServiceDeps` from `deps.pool` as both `servicePool` and the `withPariwarScope`-derived `db`,
  plus `idempotency.createKeyedStore(deps.pool)`) → filter by the ratified D1 predicate (`isMemberAssignable`
  = `payload.isValid`) → ordered `memberSet`. Fail loud on any per-member validity error.
  **D2 deviation (documented):** used `getValidityAt` NOT `getValidityCached` — the cache is live-`now()`-only
  and never caches historical reads, so it would violate the frozen "NEVER now()" invariant; the O(N·M) warming
  comes from the niyamavali-engine per-clause keyed-store memo, which `getValidityAt` uses natively.
- [x] Wire it: new `CycleSpawnDeps.resolveAssignableRoster` dep, resolved per-child in `runCycleSpawnChild`,
  threaded into `spawnChildPool`; flipped `assignment_roster_wired` → `true`; constructed + injected in `boot.ts`.
- [x] Error handling (deferred-work.md:2099) — the balancing throw is now the typed `PoolAssignmentBalancingError`;
  `runCycleSpawnChild` catches it → P0 alarm (distinct) + breadcrumb + rethrow (no silent empty-roster success).
- [x] Tests — orchestration fakes (`assignable-roster.test.ts` D1 predicate incl. active-in-grace + resolver
  filter/fail-loud/empty/missing-commit; `cycle-spawn.test.ts` roster-threading + roster-fail-loud + balancing-P0-alarm)
  + live-DB end-to-end proof (`assignable-roster-live.test.ts`: real members + validity + spawn →
  `resolveAssignedPoolForMember` returns the engine-placed pool, pending member excluded, determinism pinned).
- [x] `deferred-work.md` — both discharged entries (2093 + 2099) annotated `✅ DISCHARGED by AI-7-2`.
- [x] Dev Agent Record — decisions taken, test results (below).

**Acceptance Criteria:**
- Given a Pariwar with members assignable at the cycle-freeze `committed_at`, when a cycle spawns, then each
  pool's snapshot carries the real `member_assignments` (the deterministic `assignMembersToPools` placement)
  and `pool.spawned.assignment_roster_wired` is `true`.
- Given the same frozen cycle is re-spawned, when the roster is re-evaluated at the same `committed_at`, then
  the assignments are byte-identical (re-derivability preserved; §1.11).
- Given the Story 7.6 resolver runs against a spawned cycle, when a real assignable member is resolved, then
  `resolveAssignedPoolForMember` returns `{ assigned: true, … }` for the exact pool the engine placed them
  in (the end-to-end loop 7.4 → 7.6 is closed — proven live on :5433).
- Given `assignMembersToPools` throws its post-balancing invariant with a non-empty roster, when the child
  worker handles it, then an alarm fires and the error rethrows — no pool is spawned with a silently-empty roster.
- Given a member's validity read fails mid-enumeration, when the roster is resolved, then the whole cycle
  fails loud (no silently-dropped member).
- Given members under another Pariwar, when the roster resolves for this Pariwar, then they never appear.
- Given the ratified D1 predicate, when an `active-in-grace` member is evaluated, then they are
  included/excluded exactly per D1 (pinned by a test).
- Given the full local gate, when `pnpm ci:local` runs (with `DATABASE_URL` on :5433), then all jobs pass
  including the new suites.

### Review Findings

- [x] [Review][Decision] **(RESOLVED — Option 2, restructure.)** Connection-pool deadlock risk
  (BLOCKING). The per-clause validity keyed-store memo (`getValidityAt` → niyamavali-engine
  `evaluate.ts`) issues its own `pool.connect()` calls on `deps.pool` for `claim`/`getResult`/
  `recordResult` while the roster resolver's own `withPariwarScope` call previously held ONE connection
  checked out from that SAME pool for the ENTIRE per-member loop duration — against a `{ max: 2 }` pool
  (`apps/jobs/src/boot.ts:232`) and `childConcurrency` defaulting to 8 (`apps/jobs/src/cycle-spawn.ts:36`),
  a full deadlock the moment ≥2 children resolved concurrently. Fixed by splitting the resolver
  (`apps/jobs/src/assignable-roster.ts`) into two phases: (1) one short scoped connection reads
  `committed_at` + enumerates `memberIds`, released immediately; (2) each member's `getValidityAt`
  evaluation now opens its OWN short-lived scoped connection (never held across the loop). **Residual
  note:** this shrinks the exposure window from "whole roster" to "one member's evaluation," matching the
  same connection shape every other `getValidityAt` caller in this codebase already uses (e.g. apps/api's
  member-validity handler) — but under sustained ≥2-concurrent-children overlap the theoretical
  contention isn't fully eliminated, only reduced to ordinary connection-pool sizing pressure (same class
  of risk as any other concurrent `getValidityAt` caller against a small pool). If Story 7.9's p95
  validation surfaces contention under load, revisit `apps/jobs`'s pool `max` sizing then.
  [apps/jobs/src/assignable-roster.ts, apps/jobs/src/boot.ts:232, apps/jobs/src/cycle-spawn.ts:36,
  packages/domain/src/db.ts:161-180, packages/domain/src/idempotency/keyed-store.ts:113-171,
  packages/niyamavali-engine/src/evaluate.ts:170-193]
- [x] [Review][Decision] **(RESOLVED — thread real resolver-presence through.)**
  `assignment_roster_wired` was an unconditional `true` literal in `spawnChildPool`, regardless of
  whether a real `resolveAssignableRoster` was actually supplied — masking a future silent wiring
  regression as "genuinely queried, none assignable." Fixed: `spawnChildPool` gained a new `rosterWired:
  boolean = false` parameter and now emits `assignment_roster_wired: rosterWired` instead of a hardcoded
  literal; `runCycleSpawnChild` threads `rosterWired = deps.resolveAssignableRoster !== undefined` (never
  inferred from `memberSet`'s emptiness). The domain integration spec's call site
  (`spawnChildPool(client, spec)`, no resolver in play) now correctly asserts `assignment_roster_wired:
  false`; the live-DB end-to-end suite passes `rosterWired: true` since it exercises the real resolver.
  [packages/domain/src/pool/spawn.ts:369-437, apps/jobs/src/cycle-spawn.ts:250-265,
  packages/domain/tests/integration/pool/pool-spawn-saga.spec.ts:253-263,
  apps/jobs/tests/assignable-roster-live.test.ts:150-154]
- [x] [Review][Patch] **(FIXED.)** Roster resolution (step 0 in `runCycleSpawnChild`) ran unconditionally
  BEFORE `spawnChildPool`'s own fast-path idempotency check. Fixed via a new exported
  `poolDomain.isPoolAlreadySpawned(db, cycleId, poolIndex)` helper (extracted from `spawnChildPool`'s own
  fast-path check, so there's one implementation) — `runCycleSpawnChild` now runs this cheap advisory
  check FIRST and skips roster resolution entirely when the pool is already spawned. Covered by a new
  test ("SKIPS roster resolution on a retry of an already-spawned pool"). [apps/jobs/src/cycle-spawn.ts:245-266,
  packages/domain/src/pool/spawn.ts:125-138,397-399, apps/jobs/tests/cycle-spawn.test.ts]
- [x] [Review][Patch] **(FIXED.)** The spec's own cross-tenant-isolation acceptance row had no dedicated
  test. Added a new live-DB test seeding two Pariwars and asserting Pariwar B's member never appears in
  Pariwar A's roster — exercises `listMemberIdsForPariwar` and `createAssignableRosterResolver` together
  end-to-end (RLS + explicit predicate + resolver). [apps/jobs/tests/assignable-roster-live.test.ts]
- [x] [Review][Patch] **(FIXED.)** Added `Object.setPrototypeOf(this, new.target.prototype)` to
  `PoolAssignmentBalancingError`, matching the sibling `PoolContributionBindingError` precedent in the
  same file. [packages/domain/src/pool/errors.ts:146-165]
- [x] [Review][Patch] **(FIXED.)** The branded `MemberId` was silently widened to a bare `string`.
  `AssignableRosterResolver` now returns `Promise<readonly MemberId[]>` and the resolver's internal
  accumulator is typed `MemberId[]`. [apps/jobs/src/assignable-roster.ts]
- [x] [Review][Patch] **(FIXED.)** The P0 alarm message duplicated the `m=`/`n=` values (once
  manually-formatted, once via the error's own `${String(err)}` message). Removed the redundant
  manual formatting — the alarm now only adds the cycle/pool identifiers the error doesn't carry.
  [apps/jobs/src/cycle-spawn.ts:288-295]
- [x] [Review][Patch] **(FIXED.)** The balancing-alarm test only asserted a generic substring. Hardened to
  pin the exact alarm string (cycle id, pool index, and the error's own m/n/max/min values).
  [apps/jobs/tests/cycle-spawn.test.ts]
- [x] [Review][Patch] **(FIXED.)** The live-DB test's `afterAll` swallowed delete errors silently. Added a
  `cleanupStep` helper that logs (via `console.warn`) any teardown failure instead of discarding it,
  applied consistently across all cleanup statements including the events_log rollback path.
  [apps/jobs/tests/assignable-roster-live.test.ts]
- [x] [Review][Defer] Unbounded `listMemberIdsForPariwar` bulk read + serial per-member `getValidityAt`
  loop, no pagination/batching/cap — explicitly deferred to Story 7.9's <60s p95 validation per this
  story's own Design Notes. [packages/domain/src/member/read.ts:68, apps/jobs/src/assignable-roster.ts:105-116] — deferred, pre-existing scope boundary (Story 7.9)
- [x] [Review][Defer] The determinism claim that "a member who signs up after the freeze still enumerates
  but replays to a non-valid state" (the one edge case the `listMemberIdsForPariwar` doc comment
  specifically calls out) is asserted in prose but never exercised by either test suite.
  [packages/domain/src/member/read.ts:47-58] — deferred, minor test-hardening
- [x] [Review][Defer] Inconsistent rigor between the two new negative-path tests in `cycle-spawn.test.ts` —
  the roster-resolution-failure test pins the exact breadcrumb `reason` string, the structurally-parallel
  balancing-error test only asserts `objectContaining({ cycleId, pariwarId })`, leaving that breadcrumb's
  `reason` unverified. [apps/jobs/tests/cycle-spawn.test.ts:205-227] — deferred, minor test-hardening
- [x] [Review][Defer] No cleanup of the `idempotency_keys` rows the resolver's keyed-store creates during
  the live-DB test — a pre-existing "own-committing writer accumulates rows" pattern already present
  elsewhere in this codebase's live-DB suites, not introduced by this story.
  [apps/jobs/tests/assignable-roster-live.test.ts] — deferred, pre-existing pattern

## Design Notes

- **Determinism is the whole point.** The roster MUST be a pure function of `(pariwar, cycle-freeze
  committed_at, validity-rule-registry-version)`. Evaluating at `committed_at` (not `now()`) + a stable
  member ordering before `assignMembersToPools` is what makes a re-spawn idempotent and lets a regulator
  re-derive the assignment (Story 7.6 AC4). Consider recording the validity `rule_registry_version` used,
  alongside `member_state_hash`, if it isn't already implied by the freeze.
- **O(N·M) vs O(M) (D2).** Per-child resolution re-evaluates M members for each of N pools; the validity
  cache makes all but the first child mostly cache hits. Resolving once in the parent is O(M) but bloats
  child payloads with the full roster and adds a plan-storage concern. Story 7.9 owns the <60s p95
  validation either way; pick the wiring that keeps child payloads bounded unless 7.9 evidence forces the
  parent-resolve.
- **Fail-loud on partial reads.** Unlike a UI read, a silently-dropped member here misroutes real money (the
  member would resolve to `{ assigned: false }` and be told they have no pool). Every per-member validity
  error fails the cycle, consistent with the 7.6 resolver's fail-loud integrity posture.
- This is the natural forcing function Story 7.4 named; landing it makes 7.6's resolver live and unblocks
  Epic 8's `<UPIIntentButton>` pre-fill from a real assigned pool.

## Verification

**Commands:**
- `pnpm --filter @twt/jobs test` — orchestration suite green (fakes; no `DATABASE_URL` needed for those).
- `DATABASE_URL='…:5433…' pnpm --filter @twt/domain test` — the end-to-end 7.4→7.6 integration proof green.
- `pnpm --filter @twt/jobs typecheck && pnpm --filter @twt/jobs lint` — clean; same for `@twt/domain`.
- `pnpm pool-bound-payment:check` + `pool-support-category:check` — the pool gates stay green.
- `DATABASE_URL='…:5433…' pnpm ci:local` — all jobs green (the merge gate while Actions is suspended).

## Decisions (all ratified 2026-07-19)

- **D1 — assignable predicate (policy, BigDev-confirmed):** `getValidityAt(memberId, committed_at).is_valid`,
  **INCLUDING** active-in-grace (grace members are still covered/contributing per PRD). Sourced from the
  Story 4.6 verdict, never reinvented ([[project_engine_never_infers_contribution_facts]]). The
  active-in-grace inclusion is pinned by a matrix test so the policy is executable, not implicit.
- **D2 — roster resolution site:** per-child in `runCycleSpawnChild`, validity-cache-warmed. Bounded child
  payloads; Story 7.9 validates the <60s p95 envelope.
- **D3 — predicate home:** local `apps/jobs` helper for now; promote to `@twt/validity-service` only on a
  second consumer ([[feedback_no_premature_package]]).

## Dev Agent Record

### Implementation summary

Closed the 7.4→7.6 gap end-to-end. `spawnChildPool` no longer hardcodes `memberSet: []`; it takes the
real freeze-time roster as a param and emits `assignment_roster_wired: true`. The roster is supplied by a
new `apps/jobs` resolver (the FIRST `apps/jobs` import of `@twt/validity-service`), resolved per-child in
`runCycleSpawnChild` and threaded in. The balancing-invariant throw — now reachable with `m>0` — is a
typed error caught with a distinct P0 alarm.

### Key decisions taken during implementation

- **D2 wiring deviation — `getValidityAt`, NOT `getValidityCached` (the story's stated preference).** On
  reading the cache, `getValidityCached` is a live-`now()`-only path: it takes no `at`, internally resolves
  DB `now()`, and explicitly NEVER caches historical reads (`cache.ts` header + line 55). Using it would
  evaluate validity at `now()`, directly violating the FROZEN "NEVER now()" / determinism invariant — the
  higher authority. So I evaluate at the durable `committed_at` via `getValidityAt(..., { internal: true })`.
  The D2-intended cache warming for the O(N·M) per-child recompute is still delivered — by the
  niyamavali-engine per-clause keyed-store memo (Story 4.1) that `getValidityAt` uses natively (identical
  `(member_id, rule_registry_version, member_state_hash, at)` → a memo hit after the first child). Recorded
  in `deferred-work.md` too. [[project_validity_cache_failopen_pattern]]
- **`{ internal: true }`, not `caller`.** The spawn saga is a system actor with no RBAC/caller context;
  `getValidityAt`/`getValidityCached` both throw unless one is supplied. `internal: true` returns the FULL
  unredacted payload the D1 predicate reads (`is_valid`), skips the access audit, and is the option's own
  documented case (the Story 4.8 cache-warmer). `caller` would risk `redactForCaller` stripping `is_valid`.
- **Enumeration is verdict-filtered, NOT state-filtered.** `listMemberIdsForPariwar` returns the WHOLE
  membership (no `members.state` predicate); the Validity verdict at `committed_at` is the SOLE assignability
  filter (the frozen invariant — no member-state policy in the spawn/enumeration layer). A member who signed
  up after the freeze still enumerates but replays to a non-valid state at `committed_at`, so the verdict
  excludes them — determinism is preserved by evaluating at the frozen instant, not by narrowing enumeration.
- **`assignment_roster_wired` flipped to an unconditional `true`** (per the story's "flip → true"). Its
  forensic job — distinguishing the pre-wiring era — is fulfilled by the historical events that carry
  `false`; from AI-7-2 on, every `pool.spawned` reflects a genuine (possibly-empty) roster evaluation.
- **Typed `PoolAssignmentBalancingError`** (pool/errors.ts) replaces the plain `Error` throw so the worker
  recognises the corruption signal robustly (predicate `isPoolAssignmentBalancingError`) and alarms P0. This
  does NOT touch the Story 7.4 algorithm or `POOL_ASSIGNMENT_HASH_VERSION` (error type ≠ replay identity).
- **End-to-end proof lives in `apps/jobs`, not `@twt/domain`** (the story's `--filter @twt/domain` verify
  line): the true end-to-end needs real validity, and `@twt/domain` cannot import `@twt/validity-service`.
  `apps/jobs` can import both, so `assignable-roster-live.test.ts` drives real members + real validity +
  spawn + `resolveAssignedPoolForMember`. The `@twt/domain` side is covered by the existing
  `pool-spawn-saga.spec.ts` (assignment-audit fields, `wired:true` now) + `contribution-binding.spec.ts`.
- **Gate scope reviewed:** the new `assignable-roster.ts` introduces NO pool-support-category literal and NO
  cross-pool remap surface, so neither pool gate needed a scan-scope extension ([[project_access_wrapper_gate_pending_scope]]).
  Both gates stay green.

### Test results

- `pnpm --filter @twt/jobs test` — 93 tests green (incl. new `assignable-roster.test.ts` ×6, extended
  `cycle-spawn.test.ts` ×16). With `DATABASE_URL` on :5433 the live proof (`assignable-roster-live.test.ts`)
  passes: roster = active members only, pending excluded, deterministic on re-run, and every assignable
  member resolves to the exact engine-placed pool while the pending member → `{ assigned: false }`.
- `pnpm --filter @twt/domain test` — 1271 tests green (the flipped `assignment_roster_wired: true` saga assertion).
- `DATABASE_URL='…:5433…' pnpm ci:local` — **27 jobs green** (the full merge gate), incl. lint/typecheck/build,
  integration-tests, and all invariant gates (pool-state, pool-support-category, pool-bound-payment, domain-invariants,
  member-state-invariant, determinism-replay, …).

### File List

**Added**
- `apps/jobs/src/assignable-roster.ts` — the freeze-time assignable-roster resolver + D1 predicate `isMemberAssignable`.
- `apps/jobs/tests/assignable-roster.test.ts` — resolver + predicate orchestration unit tests (fakes).
- `apps/jobs/tests/assignable-roster-live.test.ts` — the live-DB end-to-end 7.4→7.6 proof (:5433).

**Modified**
- `apps/jobs/package.json` — added `@twt/validity-service` (first apps/jobs import of it).
- `apps/jobs/src/cycle-spawn.ts` — `CycleSpawnDeps.resolveAssignableRoster`; per-child roster resolution + threading; P0 balancing-error alarm.
- `apps/jobs/src/boot.ts` — construct + inject `createAssignableRosterResolver({ pool })`.
- `apps/jobs/tests/cycle-spawn.test.ts` — roster-threading + roster-fail-loud + balancing-P0-alarm tests; finalize-success 4th-arg assertion.
- `packages/domain/src/member/read.ts` — new `listMemberIdsForPariwar` bulk enumeration read.
- `packages/domain/src/pool/spawn.ts` — new `getCycleFreezeCommittedAt`; `spawnChildPool` takes `memberSet`; `assignment_roster_wired: true`.
- `packages/domain/src/pool/assign.ts` — balancing throw is now the typed `PoolAssignmentBalancingError`.
- `packages/domain/src/pool/errors.ts` — new `PoolAssignmentBalancingError` + `isPoolAssignmentBalancingError`.
- `packages/domain/tests/integration/pool/pool-spawn-saga.spec.ts` — flipped the `assignment_roster_wired` assertion to `true`.
- `_bmad-output/implementation-artifacts/deferred-work.md` — annotated both discharged entries (2093 + 2099).

## Change Log

- **2026-07-19** — AI-7-2 implemented: wired the live freeze-time assignable-roster query into the cycle-spawn
  saga. Members enumerated + validity-verdict-filtered at the cycle-freeze `committed_at`, threaded through
  `spawnChildPool` so pools carry real `member_assignments`; `assignment_roster_wired → true`; typed
  balancing-error handling with a P0 alarm. Closes the two 7.4/7.6 deferrals (D2→B live roster + balancing
  throw). Full `ci:local` green (27 jobs); end-to-end 7.4→7.6 loop proven live on :5433. Status → review.
