# Pool Engine Pre-Launch Measured-Validation Gate — evidence (Story 7.9)

**Gate:** the Pool-Spawn saga (Stories 7.1–7.8) must spawn **N = 50 pools** for a cycle whose Pariwar holds
**M = 4L (400,000)** synthetic active-and-valid members with a **p95 wall-clock < 60 s** across **≥ 10 runs**
(FR-20 / NFR-7 / AR-68 / Sprint Change Proposal Item 15). This is the measurement the whole Pool Engine was
built against — it turns "we believe < 60 s" into a git-diffable, `schema_version`-stamped record.

This doc is 7.9's **named committed evidence file** (the `@twt/measured-validation` README names it verbatim).
It is a companion to the `_bmad-output/research/` P0 evidence docs and the
`packages/validity-service/tests/bench/p95-budget.md` precedent: a human write-up header + appended
`schema_version`-stamped ```json``` records (**never a bare number** — a bare p95 is un-attestable the moment
anyone asks "at what scale, concurrency, commit, db-version?"). Screenshots / terminal recordings live
alongside this file; link them under **Trustee-Panel evidence** below.

## The harness (zero new measurement tooling)

- **Spec:** `apps/jobs/tests/measured-validation-pool-spawn.test.ts` (co-located with the saga runtime half,
  `apps/jobs/src/cycle-spawn.ts`).
- **Seeder:** `apps/jobs/tests/pool-cohort-seed.ts` — seeds M active-and-valid members through the **real
  event-log path** (the `signup → kyc → fee → lock_in_expired` active chain that replays to `is_valid = true`
  at the freeze `committed_at`) + the `members` projection row the AI-7-2 roster resolver enumerates, a
  backdated `pool_fixed_amount_schedule` head, and `cycleCount` distinct `cycle_freeze_commits` rows (each
  with N approved-claim ids). Chunked + own-committing; cleaned by `pariwar_id` in `afterAll`.
- **Core (reused, NOT reinvented):** `measureP95` / `buildRecord` / `recordEvidence` / `assertReplayStable` /
  `gitCommit` / `pgServerVersion` / `envInt` are imported from **`@twt/measured-validation`** — the AI-6-2
  shared framework core, extracted to its own package at 7.9 time (RATIFIED Path A; the "7.9-time move" the
  framework pre-planned). No duplicated percentile/evidence/replay code lands anywhere (grep-verifiable
  single source).

## What is measured (the unit under measurement)

**t0 → t1 wall-clock of one full cycle spawn:**

- **t0** = the post-bulk-approval `CYCLE_SPAWN_PARENT` trigger. The harness drives `planCycleSpawn` **directly**
  (reserve names → allocate canonical identifiers → derive N deterministic `pool_id`s → N child specs).
- **fan-out** = the N child specs run **concurrently** through the **real** `runCycleSpawnChild` at the worker's
  `DEFAULT_CHILD_LOCAL_CONCURRENCY = 8` — **full-wire** through the AI-7-2 assignable-roster resolver
  (`is_valid` at `committed_at`, per-child O(M) validity resolution) + the Story 7.4 assignment seam
  (`hash(member_id + cycle_id) % N` + the balancing pass). Not the empty seam.
- **t1** = the `cycle.frozen` event the **last child to commit** appends (`finalizeCycleIfComplete`,
  advisory-lock + events-log-version serialized → emitted exactly once).

**Fidelity — the decomposition, not pg-boss poll latency:** the harness drives the **domain** saga functions
directly rather than the real pg-boss workers, because pg-boss's ~2 s poll interval would dominate and
*misrepresent* the compute cost of the decomposition (parent → N concurrent children, no inter-pool
serialization) — which is exactly the property AR-68's envelope is about. The frozen engine
(`packages/domain/src/pool/*`, `apps/jobs/src/cycle-spawn.ts`) is **driven**, never modified.

## Scope-honesty note (the "trustee click" at Epic 7)

The epic AC names a "trustee-bulk-approval click". There is **no live bulk-approval UI at Epic 7** (that is an
Epic 8 / trustee-panel surface). The harness therefore triggers the freeze **programmatically** — the
server-side equivalent of the click: it creates the `cycle_freeze_commits` row (the seeder) and enqueues the
`CYCLE_SPAWN_PARENT` trigger (drives `planCycleSpawn`) — and measures **server-side wall-clock**. This is a
faithful measurement of the saga decomposition the button will drive; it does not include client/network time.

## Env gating (three tiers; NO 4L job in the per-PR gate)

| Tier | Trigger | N / M | Budget | Evidence sink |
|------|---------|-------|--------|---------------|
| **unit** | `DATABASE_URL` unset | n/a | pinned 60 s (record teeth) | none — DB-free assertions only |
| **smoke** | `DATABASE_URL=…:5433` (ci:local) | 3 / 200 (env-tunable) | pinned 60 s (loose at this scale) | scratch temp file (committed doc untouched) |
| **pre-launch 4L** | `MEASURED_VALIDATION=1` + `DATABASE_URL` | 50 / 400,000 | **pinned 60 s (real teeth)** | **this committed doc** |

The budget `budgetMs` is **pinned at 60_000 on every tier** — a green run over a doctored ceiling is not the
deliverable. `pass = results.p95 < budgetMs`, and the harness **asserts `pass === true`**, so a breach fails
the run loudly. Overrides: `MEASURED_VALIDATION_POOL_{N,M,ITERS,WARMUP}` + `POOL_SPAWN_CHILD_CONCURRENCY`
(all `envInt`-guarded).

## Gate semantics — fail-on-breach, remediation precedes launch (AC2)

- **Envelope holds (measured p95 < 60 s):** Launch-gate **Row 13**
  (`fr-20-pool-spawn-capacity-envelope-conditional`, `docs/launch-gate-inventory/inventory-roster.md`) is
  superseded with a `closed`-ready entry whose `closure_evidence_link` → **this doc**; the actual `closed`
  flip is gated on **≥ 2-trustee ratification** at the next monthly review (external action — 7.9 delivers the
  evidence + the ready entry, not the ratification).
- **Envelope fails (measured p95 ≥ 60 s):** Row 13 flips to `open` (predicate materialized) + a revision-ADR
  stub (spawn-saga decomposition or bulk-write mechanism revision, per the architecture lines 4832–4837);
  closure then depends on the revision landing + re-measurement. **NOT** a silent in-place engine tweak here.

## Replay co-attestation (AC9) — correct AND fast

Capacity and determinism are the two halves of "correct and fast". Alongside the p95, the harness co-records a
`assertReplayStable`-backed attestation over the **pure** Story 7.4 assignment engine
(`assignMembersToPools` / `hashMemberToBucket`): the **full assignment map** is deep-equal across ≥ 2 replays
of the seeded roster **AND** a `cycle_id`-perturbed sample changes the assignment hash (discrimination) — the
AI-6-2 stronger-than-hash proof. This **reuses** Story 7.4's assignment functions; it does **not** re-implement
7.4's property-based determinism suite (which remains the primary determinism proof).

---

## Measured results (`schema_version`-stamped records — appended by the pre-launch run only)

> The `MEASURED_VALIDATION=1` pre-launch run appends one ```json``` `BenchmarkRecord` block per run below.
> The per-PR smoke points `recordEvidence` at a scratch file, so this section is **not** rewritten on every
> ci:local run — it accrues only the real, on-demand pre-launch measurements.

### Status: the 4L / N=50 number is **carried UN-ATTESTED** (pending an operator-run pre-launch execution)

Per [[feedback_record_unattested_no_backfill]], a promised-but-never-captured measurement is recorded openly
as un-attested and carried as **open risk** — it is **never reconstructed or faked** to fabricate a pass.

- **What is proven at Story-7.9 dev time:** the harness runs end-to-end against a **real Postgres** (`twt-test-pg`
  on :5433) at the **smoke** scale — it drives the real parent planner → N concurrent full-wire children →
  the exactly-once `cycle.frozen`, records a `schema_version`-stamped evidence record (to a scratch file), and
  the replay co-attestation passes. The harness **has teeth** (the `buildRecord` `pass` field flips to `false`
  on a budget breach — asserted in the DB-free unit tier; the DB tier asserts `pass === true`).
- **What is NOT yet captured:** the **4L (400,000-member) / N=50 / ≥ 10-run** p95 against a representative-scale
  environment. Full 4L seeding is impractical in this dev environment (the same posture as AI-4-1's 4L
  FR-12A number, `p95-budget.md`). The 4L run is **operator-executed** (`MEASURED_VALIDATION=1` +
  `DATABASE_URL` on a representative-scale Postgres) and appends its `pre-launch-4L`-labelled record here.
- **Disposition:** Launch-gate **Row 13** is therefore superseded to a **`closed`-ready-PENDING-4L** posture:
  the closure entry + `closure_evidence_link` are authored and point here, but the `closed` flip remains
  blocked on (a) the operator-run 4L measurement landing a `pre-launch-4L` record below with `pass === true`,
  **and** (b) the ≥ 2-trustee ratification. If the 4L run reveals `pass === false`, Row 13 flips to `open` +
  the revision ADR — the evidence, not appearance, decides. See `docs/launch-gate-inventory/inventory-roster.md`
  Row 13 + the `.decision-log.md` Decision.

### Smoke-scale reference (harness liveness, NOT the envelope assertion)

A representative smoke run (`DATABASE_URL` on :5433, defaults `N=3 / M=200 / iterations=3 / warmup=1 /
childConcurrency=8`, first executed 2026-07-19) drove the real saga to completion — 3 cycles × 3 pools, each
cycle emitting exactly one `cycle.frozen` — and the replay co-attestation passed. Recorded p95 ≈ 0.93 s at
this scale (`env: ci-local-smoke`; written to a scratch file, not committed). This asserts the harness is
**live and wired**, NOT the 4L envelope — do not read the smoke number as the gate result.

## Trustee-Panel evidence (screenshots / terminal recordings)

- _(pending the operator-run 4L pre-launch execution)_ — attach the terminal recording of the
  `MEASURED_VALIDATION=1` run + a screenshot of the appended `pre-launch-4L` record here, for the monthly-review
  ratification packet.
