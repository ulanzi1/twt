# Measured-validation framework (AI-6-2)

**One** shared measured-validation core with two capabilities — a **concurrent-load p95 harness** and a
**real-path determinism/replay harness** — that closes the three-retro-carried **AI-4-1** (real 4L
concurrent-load p95, incl. per-row Tier-1 KMS decryption cost) and **AI-4-2** (real-path determinism,
CR-4.6-D9) and is the tooling **Story 7.9** (Pool Engine Pre-Launch Measured-Validation Gate) reuses with
**zero new tooling**.

Delivered per **D3** as shared `tests/` test tooling (not a package): `@twt/validity-service` depends on
`@twt/domain`, so its integration specs drive `projectMemberState` / `searchMembers` / `encryption`
directly with no import cycle. When the pool engine lands as its own package (Story 7.9 time), the core
extracts to `packages/measured-validation` unchanged.

## The core (`tests/framework/`)

| Export | What it does |
|--------|--------------|
| `measureP95(op, { iterations, concurrency, warmup })` | drives `op` under a bounded concurrency pool as TWO sequential phases (warmup runs to full completion, then the measured phase), times each invocation, returns `{ p50, p95, p99, count }`; cancels sibling workers on any `op` rejection |
| `seedValidityMembers(db, { scale, pariwarId })` | seeds N active members through the real event-log path + the shared R12 clause (the `getValidityCached` read path); batched in chunks, not one round trip per member |
| `seedSearchMembers(pool, { scale, pariwarId, encryption })` | seeds N members via the real projector (members.state + `member_search_projection`) + a `member_identities` row (Tier-1 mobile ciphertext) + a `member_kyc_profiles` row (Tier-1 name ciphertext) — BOTH per-row decrypt costs `adminMemberSearch` incurs; chunked, own-committing transactions |
| `resolveAdminSearchEncryption()` | resolves the admin-search Tier-1 encryption bundle per the `KMS_TEST_MODE` convention (mirrors `apps/api/src/deps.ts`'s `buildEncryptionDeps`): `fake` (default, CI-representative `dev-fake-kms`) or `live` (real Cloud KMS via `ADMIN_KEK_RESOURCE_NAME`/`ADMIN_HMAC_RESOURCE_NAME`/`GOOGLE_CLOUD_PROJECT`/`ADMIN_KMS_LOCATION`) |
| `envInt(name, fallback)` | parses an env-var override as a number, throwing on a non-numeric value instead of silently coercing to `NaN` |
| `recordEvidence(doc, record)` / `buildRecord(...)` / `compareRecords(a, b)` | the **versioned-evidence** appender (lock-guarded against concurrent writers) — a `schema_version`-stamped `{ config, gitCommit, env, results, budget, pass }` record; comparison keys on `schema_version` + config and surfaces a **config delta** rather than comparing apples-to-oranges |
| `assertReplayStable({ replays, perturbed })` | the **stronger-than-hash** replay proof: full canonical-payload deep equality **+** single-hash **+** discrimination (a perturbed input must change the hash AND the payload — a hash change on an unperturbed payload fails as a non-determinism bug, not a valid proof) |

## Recorded numbers → committed evidence doc

Every recorded run is a `schema_version`-stamped structured record (never a bare number), appended to a
committed doc. The validity side extends `packages/validity-service/tests/bench/p95-budget.md`; the pool
side lands in `_bmad-output/research/pool-engine-validation-gate.md` (7.9's named evidence file). The
per-PR **smoke** points `recordEvidence` at a scratch temp file so the committed doc is not rewritten on
every CI run; the on-demand **4L pre-launch** run points it at the committed doc.

## Env gating

- Default (`DATABASE_URL` unset): the 4L + real-path suites skip cleanly; the synthetic 100×-thread
  `determinism.test.ts` P0 gate still runs.
- `DATABASE_URL=…:5433` (ci:local): the **small-N (~1k, scaled down) smoke** runs — the harness itself is
  exercised with teeth; **no 4L job is added to the per-PR gate**.
- `MEASURED_VALIDATION=1` + `DATABASE_URL`: the on-demand **4L pre-launch** run — records FR-12A cached
  p95 < 200ms + 4.7 admin-search p95 ≤ ~5s to the committed doc, adapter/scale/date labelled. Add
  `KMS_TEST_MODE=live` + `ADMIN_KEK_RESOURCE_NAME`/`ADMIN_HMAC_RESOURCE_NAME`/`GOOGLE_CLOUD_PROJECT`/
  `ADMIN_KMS_LOCATION` to produce the REAL `cloud-kms`-labelled admin-search number; without it, the
  admin-search run still executes but is honestly labelled `dev-fake-kms` (never silently mislabelled).

## Story 7.9 plug-in seam — the pool engine reuses this with NO new tooling

Once Stories 7.1–7.8 land the pool-spawn saga, Story 7.9 imports this core (extracted to
`packages/measured-validation` at that point) and:

1. **Seed** — seed 4L members + an N=50 pool cohort in a non-production Pariwar (reuse `seedSearchMembers`/
   the event-log seeding pattern; add a pool-cohort seeder).
2. **Measure** — `measureP95(() => runSpawnSaga(cohort), { iterations: ≥10, concurrency, warmup })` around
   the spawn-saga wall-clock (bulk-approval click → `cycle.frozen`); assert **p95 < 60s** (N=50 / M=4L,
   AR-68 / NFR-7 / Sprint Change Proposal Item 15).
3. **Record** — `recordEvidence('_bmad-output/research/pool-engine-validation-gate.md', buildRecord({...}))`
   — the same `schema_version`-stamped record shape (config incl. `n: 50`, `m: 4L`, adapter, git_commit),
   ≥ 10 runs, Trustee signoff (mirrors "≥10 runs, evidence recorded, Trustee signoff").
4. **Replay** — `assertReplayStable({ replays, perturbed })` over `hash(member_id + cycle_id) % N`: the
   **full assignment-map** must be deep-equal across replays (not just its digest), **and** a `cycle_id`
   perturbation must change the assignment hash (discrimination) — the SAME two-part proof, not a bare
   digest match.
5. **Register** — register the FR-20 pool-spawn capacity gate row in the Story 0.15 launch-gate inventory
   with Trustee signoff. *(7.9 owns registration; AI-6-2 only publishes this seam.)*
