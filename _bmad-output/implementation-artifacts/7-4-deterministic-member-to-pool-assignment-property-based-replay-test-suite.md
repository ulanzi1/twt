---
baseline_commit: d9a73879f1f0abc2ca8cd1349e020f84cb83f4e3
---

# Story 7.4: Deterministic Member-to-Pool Assignment + Property-Based + Replay Test Suite

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder authoring the assignment algorithm,
I want a deterministic balanced member-to-pool assignment using `pool_index = hash(member_id + cycle_id) % N` with a property-based + replay test suite,
so that the math heart of PRD §9.1 is correct by construction and audit-replayable.

**This is the load-bearing correctness story of Epic 7.** It fills the `PoolAssignmentSeam`
that Story 7.3 deliberately left injected (`emptyAssignmentSeam → []`). Story 7.6 (pool-bound
payment) resolves a member's VPA *from this assignment*; Epic 9 reconciliation matches deposits
against it. A wrong or non-reproducible assignment is a P0 — it silently misroutes real money.

## Acceptance Criteria

Sourced verbatim-in-intent from `epics.md#Story 7.4` (lines 2689–2711). Refined with the
resolved design decisions below.

1. **The assignment algorithm** (`FR-14` + `AR-57` + architectural-freeze row 1). The algorithm is
   `pool_index = hash(member_id + cycle_id) % N`, where `hash` is a **documented, version-pinned
   stable function** (SHA-256 over a delimited preimage, truncated to a uint) reproducible across
   releases. The version constant (`POOL_ASSIGNMENT_HASH_VERSION`) is the **whole-algorithm replay
   identity**, not just the hash — a change to ANY of {hash function, truncation width, preimage
   delimiter/encoding, **balancing rule**} is a replay-identity break and MUST bump the constant.
   The balancing rule is part of the pinned contract exactly as much as SHA-256 is (see D1).

2. **Assignable set at freeze.** Assignment is computed only for members whose Validity Service
   (Story 4.6) verdict is *valid/assignable* at the cycle-freeze timestamp — excludes `lock-in`,
   `lapsed-unpaid`, `withdrawn`, `anonymized`, and the `pending-*` states. Evaluated against the
   immutable members-at-freeze snapshot (never "now").

3. **Balanced (≤1).** Pool sizes differ by ≤ 1. `hash % N` alone does NOT guarantee this, so a
   **deterministic balancing pass** redistributes overflow. The balancing rule is pure (no clock,
   no randomness) and fully documented; it is a total function of `(assignable_member_set,
   cycle_id, N)`.

4. **Property test suite (load-bearing AC).** CI property tests assert: (a) **Determinism** — for
   any `(member_id, cycle_id)`, the *base* hash bucket is identical across runs; (b) **Balanced** —
   for any `(assignable_members_set, N)`, final pool sizes differ by ≤ 1; (c) **Reproducibility
   across releases** — hash output is byte-identical at the version pin (frozen reference vectors);
   (d) **Replay correctness** — the same `(cycle_id, member-state-at-freeze, N)` produces identical
   assignments. Runs against synthetic populations of **10, 100, 1000, 10000, 50000** members.

5. **Audit reproducibility.** An individual assignment is reproducible from `(member_id, cycle_id)`
   **plus the frozen roster** (see Decision D1). The `pool.spawned` audit trail records the
   `member_state_hash` (a fingerprint of the frozen assignable roster) at freeze + the hash-function
   version, so any auditor/regulator can re-derive the exact assignment.

6. **Seam wired into production.** The real algorithm replaces `emptyAssignmentSeam` as the injected
   seam in the `apps/jobs` boot composition, and `spawnChildPool` feeds it a **real freeze-time
   roster** instead of the current hardcoded `memberSet: []`. After this story, spawned pools carry
   real member assignments in their snapshots — UNLESS the freeze-roster substrate proves
   intractable, in which case the D2 fallback ships the algorithm behind a stable seam and defers
   live-roster wiring to a scoped follow-up.

7. **No death-specific branches / gate-clean.** The new module lives under
   `packages/domain/src/pool/` so the `pool-support-category-invariant` gate scans it recursively;
   it must contain no `'death'` / `'death_support'` string branches, and `pnpm ci:local` stays green.

## Tasks / Subtasks

- [x] **Task 1 — The stable, version-pinned hash** (AC: #1)
  - [x] Add `packages/domain/src/pool/assign.ts`. Export `POOL_ASSIGNMENT_HASH_VERSION = 'v1'`.
        Header comment states it is a WHOLE-ALGORITHM version (read as `POOL_ASSIGNMENT_ALGORITHM_VERSION`)
        gating {hash fn, truncation width, delimiter, balancing rule}; any balancing-pass change bumps it.
  - [x] `hashMemberToBucket(memberId, cycleId, n): number` = `SHA-256(preimage)` truncated, `% n`.
        Preimage uses the pinned `:` delimiter (`` `${memberId}:${cycleId}` ``).
  - [x] Reuse `node:crypto` `createHash('sha256')`. Truncate first 8 bytes → `readBigUInt64BE` uint64 →
        `% BigInt(n)` → `Number`. Truncation width documented as part of the version pin.
  - [x] Guard: `n` a positive integer in `[1, MAX_CYCLE_SPAWN_POOLS]` (imported from `spawn.ts`); throws.

- [x] **Task 2 — Deterministic balancing pass** (AC: #3)
  - [x] `assignMembersToPools(memberSet, cycleId, n): ReadonlyMap<memberId, poolIndex>`. Canonical
        (de-duped, sorted) order → per-bucket capacities summing to M (first r=M%n buckets get +1) →
        greedy base-bucket placement with ascending-wrapping overflow probe.
  - [x] Balancing rule pure + documented + replay-stable — a total function of `(sorted set, cycleId, n)`;
        the fixed-capacity scheme makes ≤1 TOTAL (the naive `cap at ⌈M/n⌉` does not — documented why).
  - [x] Post-condition dev-time invariant assert: `max(sizes) - min(sizes) <= 1` (throws on violation).
  - [x] The balancing rule is pinned replay identity — enforced by the frozen full-population vector (Task 4).

- [x] **Task 3 — Per-pool seam adapter + roster fingerprint** (AC: #5, #6)
  - [x] `createPoolAssignmentSeam()` factory → a `PoolAssignmentSeam`: computes the global assignment ONCE,
        returns the `input.poolIndex` subset sorted by `member_id` (deterministic snapshot array order).
  - [x] `computeAssignableRosterHash(memberSet)`: SHA-256 over `canonicalJsonStringify` of the sorted,
        de-duped assignable member-id list — the `member_state_hash` the audit records (distinct from the
        per-member `validity-cache/store.ts computeMemberStateHash`, named distinctly per the NB).
  - [x] Threaded `member_state_hash` + `assignment_hash_version` into the `pool.spawned` payload; added both
        to `PoolSpawnedPayloadSchema` as `z.string().optional()` under `.strict()` (pre-7.4 events still validate).

- [x] **Task 4 — Property-based + replay + frozen-vector test suite** (AC: #4)
  - [x] Added `fast-check@^4.9.0` as a `@twt/domain` devDep (D3). Property tests: #4a determinism,
        #4b balanced-for-any-set, #4c reproducibility, #4d replay-correctness.
  - [x] Scale tests over 10 / 100 / 1000 / 10000 / 50000 (seeded deterministic member-id UUIDs) —
        `≤1` balance + determinism at each scale.
  - [x] Frozen reference vectors: pinned `(member_id, cycle_id, n) → pool_index` tuples AND the full
        10-member / n=3 post-balancing map (pins the BALANCING RULE) + the roster fingerprint.
  - [x] Cross-version test: raw `hashMemberToBucket` AND the balanced `assignMembersToPools` map byte-identical
        to the frozen vectors at `POOL_ASSIGNMENT_HASH_VERSION === 'v1'`; the version string is itself pinned.

- [x] **Task 5 — Wire the freeze-time roster into `spawnChildPool`** (AC: #2, #6) — *D2 RESOLVED → (B): algorithm-first, live-roster deferred*
  - [~] **DEFERRED (D2→B, explicit deferral — see Dev Agent Record + deferred-work.md).** The live
        freeze-time assignable-roster query is NOT wired: `spawnChildPool` still passes `memberSet: []`.
        Full-wire (A) is architecturally intractable within this story — `@twt/domain` CANNOT import
        `@twt/validity-service` (layering is validity-service→domain), there is no bulk member-enumeration
        query, and the validity-payload→"assignable" mapping is an unresolved policy. This is the fallback
        AC #6 explicitly pre-authorizes.
  - [x] Injected the real seam at the `apps/jobs` boot site (`boot.ts` → `registerCycleSpawnWorkers` now
        passes `assignmentSeam: poolDomain.createPoolAssignmentSeam()`) — the real algorithm is in production
        behind the stable seam type. On the empty roster it returns `[]` (identical to the old default).
  - [~] **DEFERRED (D2→B).** The set-level assignable-roster query (enumerate members + Validity verdicts
        at `committed_at`) is the scoped follow-up; it must live in a package that may import
        `@twt/validity-service` (apps/jobs), not domain.

- [x] **Task 6 — Gates + regression** (AC: #7)
  - [x] `pnpm --filter @twt/domain lint` clean; `pnpm --filter @twt/domain test` green (incl. the new suite).
  - [x] `pnpm ci:local` green — 26 jobs. `pool-support-category-invariant` passes (new `pool/assign.ts`
        auto-scanned, death-token-free) and `pool-state-invariant` untouched.
  - [x] Ran the DB-gated `pool-spawn-saga.spec.ts` on `twt-test-pg` (:5433) — 5/5 green (confirms the
        projector validates the enriched `pool.spawned` payload end-to-end).

### Review Findings

- [x] [Review][Patch] **(resolved from Decision 1 — RESOLVED: add an explicit marker now.)** Add `assignment_roster_wired: z.boolean().optional()` to `PoolSpawnedPayloadSchema` (additive, backward-compatible under `.strict()`) and thread `assignment_roster_wired: false` into the `pool.spawned` payload in `spawnChildPool` alongside `member_state_hash`/`assignment_hash_version`, with a comment that the Story 7.4 roster-wiring follow-up must flip it to `true` once it threads a live roster. This eliminates the audit ambiguity between "roster query not yet wired" (`assignment_roster_wired: false`) and a future, genuinely-empty-but-live-queried roster (`assignment_roster_wired: true`, `member_state_hash === sha256("[]")`). [packages/domain/src/pool/events.ts, packages/domain/src/pool/spawn.ts]
- [x] [Review][Decision] **(resolved: Decision 2 — RESOLVED, no code change.)** Balancing rule's "first r buckets get the +1" systematically favors low `pool_index` (tied to claim/enumeration order) every cycle where `M mod N != 0`. Accepted as-is as the v1 algorithm's deterministic tradeoff — not a bug. Revisit only if a future product requirement justifies a versioned (`POOL_ASSIGNMENT_HASH_VERSION` bump) algorithm change.
- [x] [Review][Patch] `HASH_TRUNCATION_BYTES` is a decorative constant that controls nothing — `hashMemberToBucket` hardcodes `digest.readBigUInt64BE(0)` (always reads exactly 8 bytes); the comment claims changing the constant "changes every bucket," which is false. Fix: wire the constant into the digest slicing, or remove the misleading claim. [packages/domain/src/pool/assign.ts]
- [x] [Review][Patch] AC5 payload-threading is untested — no test in `spawn.test.ts` or the integration spec asserts the emitted `pool.spawned` payload actually contains `member_state_hash`/`assignment_hash_version`; the integration spec calls `spawnChildPool` with no seam argument (default `emptyAssignmentSeam`), so `createPoolAssignmentSeam` is never exercised end-to-end via that path either. Fix: add an assertion pinning `member_state_hash === sha256("[]")`, `assignment_hash_version === 'v1'`, and (once added) `assignment_roster_wired === false` for the current empty-roster path. [packages/domain/tests/pool/spawn.test.ts] (flagged independently by all three review layers)
- [x] [Review][Patch] Balancing pass is never property/scale-tested at the actual production ceiling `n = MAX_CYCLE_SPAWN_POOLS` (500) — only `n = 501` (rejection) is tested at the boundary; the balanced-set property caps at `n=50`, scale tests at `N=23`. Fix: extend one property or scale test to `n=500`. [packages/domain/tests/pool/assign.test.ts]
- [x] [Review][Patch] `createPoolAssignmentSeam` never validates `input.poolIndex` is within `[0, input.poolCount)` — an out-of-range/stale `poolIndex` silently yields an empty subset, indistinguishable from a legitimate "no members landed here" result. Fix: add a guard that throws on out-of-range `poolIndex`. [packages/domain/src/pool/assign.ts]
- [x] [Review][Patch] `boot.ts` comment run-on misattributes Story 7.5's fixed-amount item to "the deferred 7.4 follow-up" clause, reading as if they're the same follow-up. Fix: reword to separate the two independent items. [apps/jobs/src/boot.ts]
- [x] [Review][Patch] Canonicalization logic (`[...new Set(memberSet)].sort()`) is duplicated verbatim in `assignMembersToPools` and `computeAssignableRosterHash`. Fix: extract one shared helper. [packages/domain/src/pool/assign.ts]
- [x] [Review][Patch] `seededUuid`'s comment claims the generated ids "pass the snapshot serializer's UUID check," but no test in the suite exercises that claim against the real serializer/`assertUuid` — true today but unguarded against a future regex tightening. Fix: either add one assertion using the real validator, or soften the comment. [packages/domain/tests/pool/assign.test.ts]
- [x] [Review][Patch] Test titled "the base bucket is reproducible from (member_id, cycle_id) ALONE (the D1 property)" only checks repeat-call determinism (redundant with the adjacent fast-check property) — it doesn't actually demonstrate roster-independence, which the frozen-vector test substantiates instead. Fix: rename/adjust the test to match what it proves. [packages/domain/tests/pool/assign.test.ts]
- [x] [Review][Defer] `assignMembersToPools` can throw on a post-balancing invariant violation and is wired directly into a live job worker (`createPoolAssignmentSeam` via `boot.ts`) with no visible catch/retry handling in this diff — deferred, pre-existing risk pattern, currently unreachable in production (roster is always empty, `m=0` never reaches the throw path) but becomes a live concern once the Story 7.4 roster-wiring follow-up (the 7.6 forcing function) ships real rosters.

## Dev Notes

### The version pin is the most important API in this story (D0 — decided)

`POOL_ASSIGNMENT_HASH_VERSION` is a **schema-grade version for the entire assignment algorithm**, not
a hash tag. It gates all of: {hash function, truncation width, preimage delimiter/encoding, **the
balancing rule**}. The balancing algorithm is part of replay identity exactly as much as SHA-256 is —
a "better" redistribution rule silently shipped would re-route real members' contributions for an
already-frozen roster. So: the exported symbol keeps its `_HASH_` name (the seam author's convention),
but read it as `POOL_ASSIGNMENT_ALGORITHM_VERSION` and pin it accordingly — the frozen full-population
vector (Task 4) is the enforcement, and any of the four changes above bumps `'v1' → 'v2'` deliberately.

### The one design decision that dominates this story (D1 — resolved)

**Balancing breaks single-member roster-independence, and that is expected + correct.**

- Pure `hash(member_id + cycle_id) % N` makes a member's pool reproducible from
  `(member_id, cycle_id)` *alone* — but only balances *in expectation*. For small `N` or unlucky
  hash distributions, sizes can differ by > 1, violating AC #3.
- A **balancing pass** guarantees ≤ 1 — but a redistributed member's *final* pool now depends on the
  *whole frozen roster* (overflow depends on every other member's bucket). So the final assignment is
  **NOT** reproducible from `(member_id, cycle_id)` in isolation once balancing fires.
- **Reconciliation (this is the resolved contract):** the AC bundle already encodes the answer.
  AC #4(a) determinism is "identical *across runs*" (reproducibility, not roster-independence);
  AC #4(d) replay is "same `(cycle_id, member-state-at-freeze, N)`"; AC #5 audit records
  `member_state_hash` *at freeze*. Therefore:
  - The **persisted snapshot** (`pool_snapshots.member_assignments`, Story 7.1) is the **source of
    truth** for "which pool is this member in" — Story 7.6 resolves a member's VPA by *reading the
    persisted assignment*, never by naive recompute-from-`(member_id, cycle_id)`.
  - Recompute/audit reproducibility requires the **same frozen roster** (fingerprinted by
    `member_state_hash`) + the hash version. Given those, the assignment re-derives byte-identically.
  - The base `hash % N` bucket IS reproducible from `(member_id, cycle_id)` alone — property #4(a)
    tests exactly that on the *pre-balancing* bucket.
- **Do not** attempt a "reproducible-without-roster" balanced scheme (e.g. consistent hashing rings)
  unless you first confirm it still satisfies the frozen reference vectors + ≤1; the simple
  sort-and-redistribute rule is sufficient and auditable. Keep it simple and PINNED.

### Scoping fork (D2 — DECIDED: attempt full-wire, fall back cleanly)

The `PoolAssignmentSeam` author (Story 7.3) wrote that 7.4 both *fills the algorithm* **and** *wires
the real query supplying `memberSet`* (`spawn.ts:141-166` seam comment). But `spawnChildPool` today
hardcodes `memberSet: []` (`spawn.ts:357-364`), and **there is no bulk "assignable members for a
pariwar at timestamp T" query in the codebase** — only per-member `getMemberStateAt`
(`member/read.ts:61`) and the per-member validity cache (`validity-cache/`). Architecture §5.11
commits that each child "reads the members-at-freeze snapshot (immutable snapshot evaluation)".

Two viable scopes — **pick one at implementation kickoff:**

- **(A) Full (recommended if the freeze-roster substrate is tractable):** Build the assignable-roster
  query (enumerate the pariwar's members, evaluate each against Validity Service / member state at
  `committed_at`, keep the assignable set), wire it into `spawnChildPool`, and ship real assignments.
  This is the seam author's stated intent and unblocks 7.6 end-to-end. **Risk:** the "immutable
  members-at-freeze snapshot" + exact assignable-state set (D4) may pull in more Validity-Service
  surface than a single story wants; confirm 4.6 exposes (or cheaply supports) a set-level read.
- **(B) Algorithm-first (safe fallback):** Ship the load-bearing core — the pure algorithm +
  balancing + version pin + frozen vectors + property/replay suite (Tasks 1–4, 6) wired *behind* the
  seam type — but leave the production `memberSet` supply as a thin follow-up if the freeze-roster
  substrate isn't ready. The seam interface stays stable; the suite proves correctness on synthetic
  rosters regardless. Tasks 1–4 + 6 are fully shippable and satisfy AC #1/#3/#4/#5/#7 today.

**DECISION (BigDev):** Attempt (A) full roster wiring. If it expands beyond the existing substrate
(the immutable-members-at-freeze snapshot / a set-level Validity read isn't tractable within this
story), fall back cleanly to (B) and carve the live-roster wiring into a tightly-scoped follow-up —
the algorithm + test suite is the story's *named* deliverable and must land either way. Record which
path was taken (and, if B, why the substrate wasn't ready) in the Dev Agent Record.

### Assignable-state set (D4 — DECIDED: consume Validity verdicts, no engine-side policy)

**DECISION (BigDev): `assign.ts` encodes NO member-state policy.** The assignable set is sourced
purely from Story 4.6 Validity Service verdicts at freeze — the engine consumes verdicts, never
derives them ([[project_engine_never_infers_contribution_facts]]). Do **not** hardcode a member-state
allow/deny list in the assignment module. Whether `active-in-grace` is assignable (a grace member is
still inside their paid window, FR-1A — plausibly yes) is answered by the Validity verdict, not by the
engine. Epic AC's excluded set (`lock-in`, `lapsed-unpaid`, `withdrawn`, `anonymized`, and implicitly
the `pending-*` states — the 9-value tuple in `schema/members.ts:60-70`) is a *description* of what
the Validity verdict will exclude, not a list to embed. The roster query (Task 5) filters by verdict;
the assignment algorithm is verdict-blind and just hashes whatever set it is handed.

### Property-based library (D3 — DECIDED: add fast-check for universals, seeded/frozen for the rest)

**DECISION (BigDev):** add `fast-check` as a `@twt/domain` devDependency and use it for the *universal*
properties (#4a determinism, #4b balanced-for-any-set, #4c reproducibility) — the "for any
`(member_id, cycle_id)`" claims the story names. Keep the scale, replay, and frozen-vector tests (#4d)
as **conventional deterministic tests** driven by fixed *seeded* synthetic populations so they stay
replay-stable and pinnable (a property generator must never be the source of a frozen vector). It was
verified `fast-check` is not yet a repo dependency; test runner is **vitest**
(`packages/domain/package.json:11`) — fast-check integrates cleanly.

### Source tree — what to touch

- **NEW** `packages/domain/src/pool/assign.ts` — the algorithm, balancing, roster fingerprint, seam
  factory. Auto-covered by `pool-support-category-invariant` recursive `SCAN_DIRS` walk of `pool/`
  (README: `scripts/pool-support-category-invariant/`), so **no manual gate-list edit** — but keep it
  death-token-free.
- **NEW** `packages/domain/tests/pool/assign.test.ts` — property + replay + frozen-vector suite
  (sibling of `tests/pool/spawn.test.ts`).
- **UPDATE** `packages/domain/src/pool/spawn.ts` — replace `emptyAssignmentSeam` default at the
  `spawnChildPool` call and the hardcoded `memberSet: []` (lines 357–364) with the real roster +
  seam (Task 5 / scope D2). Preserve: the fast-path idempotency check, the `derivePoolId` identity
  guard, the payload shape, and child purity (no clock/randomness — the seam MUST stay pure).
- **UPDATE** `packages/domain/src/pool/index.ts` — export the new public surface.
- **UPDATE** `packages/domain/src/pool/events.ts` (`pool.spawned` payload) — additively carry
  `member_state_hash` + `assignment_hash_version` if audit fields go on the event (AC #5). Verify the
  Zod schema; keep additive/optional so 7.1-era replays still validate.
- **UPDATE** `apps/jobs/src/boot.ts` + `apps/jobs/src/cycle-spawn.ts` — inject the real seam for
  production (replace the `?? emptyAssignmentSeam` default path). `apps/jobs/src/cycle-spawn.ts` is
  already in the `pool-support-category-invariant` `SCAN_FILES` list — stays death-token-free.

### Read-before-you-touch (mandatory — the seam is already engineered)

- `packages/domain/src/pool/spawn.ts:141-166` — the `PoolAssignmentSeam` type + `PoolAssignmentSeamInput`
  (`{cycleId, poolIndex, poolCount, memberSet}`) + `emptyAssignmentSeam`. **Do not change the seam
  *type signature*** — fill it. It is deliberately pure (no clock/randomness) so children stay
  re-runnable to an identical snapshot.
- `packages/domain/src/pool/spawn.ts:332-364` — `spawnChildPool`; this is where the seam is called
  and where `memberSet: []` is hardcoded. The full global assignment is computed here per child then
  filtered — accept the O(N·M) per-cycle recompute (child independence is architecture-blessed;
  the 7.9 gate validates the <60s p95 envelope).
- `packages/domain/src/pool/snapshot.ts:62-146` — `PoolSnapshotMemberAssignment { member_id }` and
  the note that **the caller owns deterministic array order** (canonicalization sorts object keys,
  not array elements). Sort by `member_id`.
- `packages/domain/src/pool/snapshot.ts:113-119` — `computePoolSnapshotHash` / `canonicalJsonStringify`
  + SHA-256; reuse this exact canonicalizer for the roster fingerprint.
- `packages/domain/tests/pool/spawn.test.ts:1-45` — the DB-free unit-test style + the "PINNED
  regression vectors" pattern to mirror for frozen hash vectors.

### Testing standards

- DB-free unit + property tests in `packages/domain/tests/pool/assign.test.ts` (vitest, `vitest run`).
- Frozen reference vectors are a **contract**, not a snapshot-to-regenerate — treat a diff as a
  version bump. Mirror `spawn.test.ts`'s "a change here would break every cycle replay" framing.
- If Task 5 touches a live query, add/extend a DB-gated spec under
  `packages/domain/tests/integration/pool/` and run against `twt-test-pg` on :5433. Heed project
  memory: never regenerate an applied migration; assert membership not counts on own-committing
  writers.

### Project Structure Notes

- Pool primitive is homed at `packages/domain/src/pool/` (a ratified variance from the epic's
  `packages/pool-lifecycle` — the events↔domain no-cycle forces an event-derived reducer at/below
  `@twt/domain`; see [[project_pool_primitive_substrate]]). `assign.ts` belongs here alongside its
  siblings.
- No new migration expected for the algorithm+tests core. If audit fields land on `pool.spawned`,
  that's an event-payload change (no schema migration — events_log is JSONB). Next migration number
  on main is **0075** (0074 was 7.3's `pools_pariwar_cycle_pool_index_uq`) *if* Task 5 needs one —
  most likely it does not.
- `cycle_id` is `CycleFreezeCommitId` (unFK'd; no `cycles` table). Use the `committed_at` from
  `cycle_freeze_commits` for freeze-time evaluation — never the clock (`deriveFreezeMonth` precedent).

### References

- [Source: epics.md#Story 7.4 (lines 2689–2711)] — ACs, `hash(member_id + cycle_id) % N`, property
  suite, synthetic populations, audit reproducibility.
- [Source: epics.md#Epic 7 (lines 2597–2616)] — "property-based tests; replay verification per
  cycle; cross-version snapshot replay"; balanced ≤1; `support_category` no-death-branch invariant.
- [Source: architecture.md §5.11 (lines ~3440–3468)] — per-child saga shape: "reads the
  members-at-freeze snapshot", "computes the deterministic assignment (FR-14 hash + member set)",
  child independence, immutable snapshot evaluation.
- [Source: packages/domain/src/pool/spawn.ts:141-166, 332-364] — the seam contract + call site.
- [Source: packages/domain/src/pool/snapshot.ts:62-159] — assignment shape + canonical hash.
- [Source: packages/domain/src/schema/members.ts:60-72] — the 9 member lifecycle states.
- [Source: packages/domain/src/member/read.ts:61] — `getMemberStateAt` (per-member freeze-time state).
- [Source: scripts/pool-support-category-invariant/{README.md,check.ts}] — the death-branch gate
  scope (recursive `pool/` walk covers `assign.ts` automatically).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8), via the `bmad-dev-story` workflow.

### Debug Log References

- `pnpm --filter @twt/domain typecheck` — clean (confirms the assign.ts ↔ spawn.ts circular value
  import is safe: both sides reference the other only inside function bodies, never at module-eval top level).
- `vitest run tests/pool/assign.test.ts` — 27/27 green (368ms incl. the 50 000-member scale case).
- `vitest run tests/pool/spawn.test.ts tests/pool/assign.test.ts` — 43/43 green.
- `vitest run tests/integration/pool/pool-spawn-saga.spec.ts` (DATABASE_URL on :5433) — 5/5 green
  (the projector validates the enriched `pool.spawned` payload with the two new optional fields).
- `pnpm pool-support-category:check` + `pnpm pool-state:check` — both green.
- `pnpm ci:local` (DATABASE_URL on :5433) — **26 jobs green**, zero regressions.

### Completion Notes List

- **The version pin is the whole-algorithm contract (D0).** `POOL_ASSIGNMENT_HASH_VERSION = 'v1'` gates
  {SHA-256 hash fn, 8-byte truncation width, `:` preimage delimiter, the balancing rule}. The frozen
  full-population post-balancing vector in `assign.test.ts` is the enforcement, and the version string
  itself is pinned in a test so a bump can never be silent.
- **Balancing chose fixed-capacities-summing-to-M, not "cap at ⌈M/n⌉".** The naive ceiling-cap does NOT
  guarantee ≤1 (it can strand a bucket two below another — e.g. all-collide-then-overflow leaves `[4,4,2]`
  for M=10,n=3). The pinned rule sets per-bucket capacities `floor + (i < M%n ? 1 : 0)` (first `r` buckets
  carry the +1) so greedy placement fills each bucket to EXACTLY its capacity → sizes ∈ {floor, floor+1} →
  ≤1 is TOTAL for any set. Verified balanced at every scale 10→50 000 (diff = 1).
- **D1 (roster-dependence) honored by design.** The base `hash % N` bucket is reproducible from
  `(member_id, cycle_id)` alone (property #4a), but the FINAL pool after balancing depends on the whole
  frozen roster — expected + correct. `computeAssignableRosterHash` (a roster-SET fingerprint, distinct from
  the validity-cache's per-member watermark) records the roster so an auditor can re-derive the assignment.
- **D3 (fast-check).** Added `fast-check@^4.9.0` as a `@twt/domain` devDep and used it for the universal
  properties (#4a/#4b/#4c); scale/replay/frozen-vector tests (#4d) are conventional seeded-deterministic
  tests (a property generator never sources a frozen vector). Suite = 27 tests.
- **D4 (no engine-side member-state policy).** `assign.ts` is verdict-blind — it hashes whatever member-id
  set it is handed. No allow/deny state list is embedded.
- **D2 RESOLVED → (B): algorithm-first, live-roster deferred (the fallback AC #6 pre-authorizes).** The
  named deliverable (algorithm + balancing + roster fingerprint + property/replay/frozen-vector suite)
  shipped in full, and the REAL seam (`createPoolAssignmentSeam`) is wired into `apps/jobs/src/boot.ts`
  behind the stable `PoolAssignmentSeam` type. Full-wire (A) was NOT attempted-to-completion because it is
  architecturally intractable within one story (three hard blockers, all verified):
  1. `@twt/domain` **cannot** import `@twt/validity-service` — the dependency direction is
     validity-service → domain (validity-service/package.json depends on `@twt/domain`), so the
     verdict-filtered roster query cannot live in the domain `spawnChildPool`.
  2. There is **no bulk member-enumeration query** in the codebase (only per-member `getMemberStateAt` +
     the per-member validity cache) — a set-level assignable-roster read must be built from scratch.
  3. D4 forbids embedding member-state policy, so the assignable set must come from Validity verdicts —
     but the **validity-payload → "assignable" mapping is itself an unresolved policy** (e.g. is
     `active-in-grace` assignable?) that the follow-up must settle.
  Consequence: `spawnChildPool` still passes `memberSet: []`, so spawned pools carry no member assignments
  yet and `member_state_hash` is the empty-roster fingerprint (`sha256("[]")`). The follow-up (a natural
  forcing function for Story 7.6, or a dedicated `AI-7-x`) only needs to supply the roster — the seam type,
  algorithm, and `member_state_hash` code path are already in place. Recorded in `deferred-work.md`.
- **No migration.** The two audit fields ride the JSONB `pool.spawned` event payload (additive/optional);
  no schema change, no `format_version` bump (they are audit metadata, not snapshot shape).

### File List

**New**
- `packages/domain/src/pool/assign.ts` — the assignment algorithm: version-pinned `hashMemberToBucket`,
  balanced `assignMembersToPools`, `computeAssignableRosterHash`, `createPoolAssignmentSeam`.
- `packages/domain/tests/pool/assign.test.ts` — property (fast-check) + replay + scale + frozen-vector suite (27 tests).

**Modified**
- `packages/domain/src/pool/index.ts` — export the new `assign.js` surface.
- `packages/domain/src/pool/spawn.ts` — compute + thread `member_state_hash` + `assignment_hash_version` into
  the `pool.spawned` payload; refreshed the now-current seam docs (7.4 no longer "BACKLOG"); the `memberSet: []`
  carries the D2→B deferral note.
- `packages/domain/src/pool/events.ts` — `PoolSpawnedPayloadSchema` gains the two optional audit fields.
- `packages/domain/package.json` — `fast-check@^4.9.0` devDependency (D3).
- `apps/jobs/src/boot.ts` — inject the real `poolDomain.createPoolAssignmentSeam()` into `registerCycleSpawnWorkers`.
- `apps/jobs/src/cycle-spawn.ts` — refreshed the `assignmentSeam` doc comment.
- `_bmad-output/implementation-artifacts/deferred-work.md` — recorded the D2→B live-roster follow-up.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 7.4 `ready-for-dev`→`in-progress`→`review` + ledger.
- `pnpm-lock.yaml` — fast-check resolution.

### Change Log

- 2026-07-18 — Implemented Story 7.4 (all tasks; Task 5 D2 resolved to (B) — algorithm-first, live roster
  deferred to a scoped follow-up). Added the version-pinned deterministic assignment algorithm + balanced
  redistribution + roster fingerprint + real seam (wired into apps/jobs boot behind the stable type) +
  fast-check property/replay/frozen-vector suite (27 tests). `pnpm ci:local` green (26 jobs).
