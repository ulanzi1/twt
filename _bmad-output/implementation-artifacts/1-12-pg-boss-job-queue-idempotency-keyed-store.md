# Story 1.12: pg-boss Job Queue + Idempotency Keyed Store `[PRIMITIVE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder,
I want pg-boss installed as the canonical job queue + an idempotency keyed-store primitive,
so that every queue consumer in downstream epics (cycle spawn, reconciliation matcher, channel dispatcher, integrity-check job, mirror push) reuses **one queue** and **one idempotency contract** instead of re-inventing background-work plumbing per surface.

## Acceptance Criteria

**AC-1 — pg-boss co-located, single Postgres (AR-5 / arch §1.4):**
pg-boss runs co-located with the API DB (single Postgres instance, no Redis) and stores its queue objects in a **dedicated `pgboss` schema** separate from operational data (arch §5.11). It is constructed from the same resolved connection string the rest of the app uses (`resolveConnectionString()` / `SERVICE_DATABASE_URL`).

**AC-2 — Idempotency keyed store API (AR-58 / arch §1.4):**
A keyed store exposes exactly these replay-safe operations:
- `claim(key, ttlSeconds)` → `'acquired' | 'already_claimed'`
- `recordResult(key, result)` → persists the result for a previously-claimed key
- `getResult(key)` → returns the stored result (or null if none/expired)

Backed by **Postgres advisory locks + an `idempotency_keys` table with explicit TTL**, per arch §1.4 ("Postgres advisory locks + an idempotency-key table with TTL cleanup via pg-boss-scheduled vacuum job").

**AC-3 — Worker lifecycle documented + implemented (arch §5.9 Worker process lifecycle):**
Queue worker registration and graceful-shutdown patterns are implemented in `apps/jobs/src/boot.ts` (health check endpoint + SIGTERM drain with a named timeout) **and** documented in the runbook so future consumers copy the pattern rather than improvise.

**AC-4 — Idempotent execution end-to-end:**
When the same logical job is enqueued/run twice with the same idempotency key, **only one execution runs and both callers observe the same result** (the keyed store's `claim` → run → `recordResult` → `getResult` replay path). Proven by a live-DB test exercising real concurrent transactions.

**AC-5 — TTL cleanup as the first pg-boss cron consumer:**
The `idempotency_keys` TTL cleanup is wired as a **scheduled pg-boss job** (`boss.schedule(...)`), demonstrating the cron + worker-registration substrate end-to-end and satisfying arch §1.4's named "TTL cleanup via pg-boss-scheduled vacuum job".

---

## 🔴 Critical Design Decisions (resolve in order; recommendations given)

> These are the calls that determine whether this story ships clean. DD-1 is a **fork in the road** — resolve it before writing any code. Each carries a recommended path; proceed on the recommendation unless BigDev directs otherwise (the open questions are restated at the end for sign-off).

### DD-1 — pg-boss version vs. the monorepo Node baseline `[DECIDED ✅ Option A — confirmed by BigDev]`

> **Settled:** bump the monorepo Node baseline to **22.12.0+** and install **pg-boss 12.x** (Option A below). Proceed on this path. Context retained for the dev record.

**The conflict.** Architecture commits **pg-boss 12.x** (§1.4 L798). But the entire pg-boss **≥11 line requires Node `>=22`** and **all of 12.x requires Node `>=22.12.0`** (verified against the npm registry, June 2026 — see Latest Tech Information). The repo's committed Node baseline is **Node 20**:
- `.nvmrc` = `20.18.0`, root `engines.node` = `>=20.18.0`
- CI `setup-node` pins `node-version: 20.18.0` in `ci.yml` **and** `nightly-integrity.yml`
- all four Dockerfiles (`apps/{api,admin,public,jobs}/Dockerfile`) use `node:20-alpine`

`.npmrc` does **not** set `engine-strict`, so `pnpm install` will not hard-fail on the mismatch — but **running pg-boss 12.x under Node 20 in CI is unsupported and risks runtime breakage** (pg-boss 12 targets Node 22 APIs). The local dev machine is **already on Node v22.22.2**, so dev and CI have silently drifted.

**The last Node-20-compatible pg-boss is `10.4.x`** (`engines.node: >=20`). `11.0.0` is where the engine jumped to `>=22`.

**RECOMMENDED — Option A: bump the monorepo Node baseline to 22.12.0+ and install pg-boss 12.x (latest 12.19.x).**
Rationale: (1) it is the architecture-committed version; (2) it realigns CI with the local machine, which is already on 22.22.2; (3) Node 20 enters maintenance/EOL around April 2026 — staying on it is borrowing trouble; (4) one Node major across the whole monorepo is cleaner than a per-package exception.
Touch (cross-cutting — this is the part that makes DD-1 bigger than "the jobs workspace"):
- `.nvmrc` → `22.12.0` (or current 22 LTS), root `package.json` `engines.node` → `>=22.12.0`
- `.github/workflows/ci.yml`, `nightly-integrity.yml` — every `setup-node` `node-version` → `22.x` (`code-escrow-mirror.yml` has no `node-version` pin — skip it)
- all four Dockerfiles → `node:22-alpine`
- re-run the **full** `pnpm turbo run lint typecheck build test` on Node 22 and confirm green (local is already 22, so this is mostly a CI/Docker change).

**Fallback — Option B: pin pg-boss to `10.4.x` (last `engines.node: >=20`), keep Node 20.**
Lower blast radius (no Node bump), but diverges from the architecture's "12.x" commitment and accrues upgrade debt. The API surface this story uses (`createQueue` / `work` / `send` / `schedule` / `stop`) exists in 10.x, so the rest of the story is unaffected by the choice. If chosen, record the divergence from §1.4 in the decision log + `deferred-work.md` with re-trigger = "Node baseline bumped to ≥22".

> **Do not** install pg-boss 12.x while leaving Node pinned at 20 — that is the one combination that is both unsupported and silently installable.

### DD-2 — Idempotency keyed store: placement, scope, mechanism

- **Table.** New `idempotency_keys` table in `packages/domain/src/schema/idempotency_keys.ts` (all Drizzle schema + the single migration journal live in `@twt/domain`). **NOT append-only** — `recordResult` UPDATEs and TTL cleanup DELETEs, so **do NOT add the reject-mutation triggers** that audit/events tables carry. It is a mutable table (follow the **migration 0004 `role_grants`** grant pattern: `SELECT, INSERT, UPDATE, DELETE`), not the read-only `0009` pattern.
- **Scope — GLOBAL table + FORCE RLS + `USING(true)` carve-out (RECOMMENDED).** Mirror `audit_integrity_checks` (DD-3 of Story 1.11a): no `pariwar_id` column; `ENABLE` + `FORCE ROW LEVEL SECURITY` for Story-1.6 regime-consistency; a **permissive `ALL` policy `USING(true) WITH CHECK(true)` TO twt_app** (this table is *written* by `twt_app` in the apps/api request path, unlike the read-only audit ledger). Rationale: the keyed store is a cross-cutting infra primitive consumed by **both** background workers (service pool / BYPASSRLS — no `app.pariwar_id` set) **and** apps/api request handlers; keys are domain-natural globally-unique strings. **Callers namespace keys** — embed the tenant id for tenant operations (e.g. `upi:${pariwarId}:${memberId}:${alertId}`, `pool-spawn:${cycleId}:${poolIndex}`).
  - *Alternative considered & rejected for v1:* a `pariwar_id` column + scoped RLS. Rejected because worker execution context does not `SET LOCAL app.pariwar_id`, and the store is infra, not tenant domain data. (If a future consumer needs strict per-tenant key isolation, add `pariwar_id` + composite PK — record as a follow-up.)
- **Mechanism.** `claim(key, ttlSeconds)`: open a tx, acquire `pg_advisory_xact_lock(hashtext(key))` to serialize concurrent claimants of the *same* key, then attempt `INSERT … ON CONFLICT (key) DO NOTHING`. Three paths (full algorithm in Task 3): (a) new row inserted → `'acquired'`; (b) conflict but existing row is expired → UPDATE to reclaim, return `'acquired'`; (c) conflict and row is live → `'already_claimed'`. `recordResult(key, result)`: `UPDATE … SET status='completed', result=<jsonb>, completed_at=clock()`. `getResult(key)`: `SELECT result WHERE key=$1 AND status='completed'` (null otherwise).
- **Logic home.** Put the keyed store in `@twt/domain` as an `idempotency` namespace (export `* as idempotency` from the barrel, alongside the existing `audit` namespace) so both `apps/api` and `apps/jobs` import it without an app→app dependency. Inject a `clock: () => Date` for `expires_at`/`completed_at` (arch §clock-injection forbids bare `new Date()` in domain logic).

### DD-3 — pg-boss runtime location + the reusable queue contract

- **Worker runtime:** `apps/jobs/src/boot.ts` (committed in the arch tree, L4315: "pg-boss boot + health endpoint + SIGTERM drain"). It constructs the boss, `createQueue()`s the queues it serves, registers handlers with `boss.work()`, schedules crons with `boss.schedule()`, exposes a health endpoint, and wires `SIGTERM → boss.stop({ graceful: true, timeout })`.
- **The reusable contract — RECOMMENDED: a thin `packages/queue`.** AR-5 wants *one* queue reused by *every* consumer, and the ALS metadata envelope (`{ requestId, pariwarId, actorId, traceId }`, arch §context-propagation-across-job-queue-boundaries) is a cross-cutting contract that must be defined **once**. Create `packages/queue` exporting: `createQueueClient(connectionString, opts)` (wraps `new PgBoss({ connectionString, schema: 'pgboss', max, ssl })` + the `pool.on('error')` discipline + a graceful `stop` helper), the `JobEnvelope` type, and a queue-name registry (constants). `apps/jobs/boot.ts` uses it to `work()`/`schedule()`; `apps/api` will use it to `send()` when its first real consumer lands.
  - *Lower-scope alternative:* put only the `JobEnvelope` type + queue-name constants in `@twt/domain` and let each app construct its own `PgBoss`. Acceptable, but you then duplicate the construction discipline; the package is the cleaner land-once shape. Pick one and be consistent.
- **Enqueue-from-apps/api is OUT of scope here** (no real api consumer exists until Epic 7 UPI / pool-spawn). Ensure the queue client is *importable* by apps/api; do not wire a live send path. Note this boundary so the dev neither over-builds nor blocks.

### DD-4 — Mirror (D2-1.10) + integrity (D3-1.11a) cron graduations: keep DEFERRED `[CONFIRMED ✅ by BigDev]`

> **Settled:** keep both cron graduations **deferred**; prove the cron substrate with the idempotency-TTL-vacuum job (AC-5) only. Re-affirm D2-1.10 / D3-1.11a in `deferred-work.md`. Do **not** build the watermark store or wire the mirror/integrity crons in this story.

Story 1.12 is the **named graduation point** for two deferred crons, but their actual wiring depends on substrate this story does **not** build:
- **D2-1.10** (6-hourly mirror cron) needs a **durable `audit_mirror_state` watermark table** + prod creds; v1 still seeds from `AUDIT_MIRROR_SINCE_SEQ`.
- **D3-1.11a** (nightly integrity cron) needs a **prod-pointed run from a separate execution environment** (`SERVICE_DATABASE_URL` + separate-project read SA, §2.10).

**RECOMMENDED:** prove the cron + worker substrate with the **idempotency-TTL-vacuum job (AC-5)** — a real, self-contained pg-boss cron with no external dependencies — and **re-affirm D2-1.10 / D3-1.11a as deferred** in `deferred-work.md` with re-trigger updated to "pg-boss substrate now exists (1.12); still needs durable watermark table + prod creds". The GitHub Actions `nightly-integrity.yml` stays as the interim trigger. **Do not** attempt the mirror/integrity graduation in this story — it would smuggle the watermark store + prod-creds scope in through the back door. (If BigDev explicitly wants the durable watermark + 6h mirror cron now, that is a scoped extension — restate at the end.)

### DD-5 — pg-boss `singletonKey` is NOT the idempotency keyed store

pg-boss `singletonKey` dedupes **enqueues within a throttle window** — it does NOT store or return a result to both callers. The keyed store (`claim`/`recordResult`/`getResult`) is the separate advisory-lock + table primitive that satisfies AC-2/AC-4. They compose: use `singletonKey` to avoid duplicate enqueues AND the keyed store to make the handler replay-safe. Document this distinction so no one deletes the keyed store thinking pg-boss covers it.

---

## Tasks / Subtasks

- [x] **Task 1 — Bump Node to 22.12.0+ and install pg-boss 12.x (AC-1)** [DD-1 ✅ Option A confirmed]
  - [x] Update `.nvmrc` → `22.12.0` (or current 22 LTS) and root `package.json` `engines.node` → `>=22.12.0`.
  - [x] Update every `setup-node node-version` in `.github/workflows/{ci,nightly-integrity}.yml` (`code-escrow-mirror.yml` has no `node-version` pin — skip it); update all four `node:20-alpine` → `node:22-alpine` Dockerfiles.
  - [x] In `apps/jobs/Dockerfile`: (a) update the CMD from the PR-1 placeholder `["node", "apps/jobs/dist/index.js"]` → `["node", "apps/jobs/dist/src/boot.js"]`; (b) add `COPY packages/queue/package.json ./packages/queue/` to the deps stage's explicit per-package COPY list (before the `pnpm install` line) — omitting this causes `pnpm install --frozen-lockfile` to fail once the lockfile references `@twt/queue`.
  - [x] Add `pg-boss` to the owning workspace(s) (`packages/queue` and/or `apps/jobs`); `pnpm install`; confirm `pnpm-lock.yaml` updates and no engine warning under the chosen Node. → pg-boss `12.19.1` added to both `packages/queue` and `apps/jobs`; cron-parser `5.5.0` + serialize-error pulled transitively; lockfile updated; no engine warning under Node 22.22.2.
- [x] **Task 2 — `idempotency_keys` table + migrations (AC-2)** [DD-2]
  - [x] `packages/domain/src/schema/idempotency_keys.ts` — columns: `key text PRIMARY KEY`, `status text NOT NULL` (`'pending' | 'completed'`), `result jsonb`, `created_at timestamptz NOT NULL default now()`, `completed_at timestamptz`, `expires_at timestamptz NOT NULL`; index on `expires_at` (for the vacuum). **No reject-mutation triggers** (mutable table).
  - [x] `packages/domain/src/policies/idempotency-keys-rls.ts` — permissive `ALL` policy `USING(true) WITH CHECK(true)` TO `appRole`. Register the schema + policy in the barrels and `drizzle.config.ts` already globs them.
  - [x] `pnpm db:generate` → migration **0012** (table) + **0013** (RLS) via the two-step generate (schema first, then policy). The `drizzle.config.ts` glob already covers both — no edit needed. Hand-supplement GRANT (`SELECT,INSERT,UPDATE,DELETE`) + `ENABLE`+`FORCE` RLS following the **0004** pattern. **Refinement (recorded):** GRANTed to `twt_service` too, not just `twt_app` — BYPASSRLS waives RLS-policy evaluation but NOT table-privilege checks, so the worker-path vacuum DELETE needs the explicit GRANT (0009 precedent). Added the `twt_app` NOBYPASSRLS self-test. Both files marked `DO NOT REGENERATE`; renamed to descriptive tags + journal updated.
  - [x] `pnpm db:migrate` (verified idempotent on re-run) + `pnpm db:check` green. Verified live: FORCE RLS on, policy present, no triggers, grants correct.
- [x] **Task 3 — Idempotency keyed store logic in `@twt/domain` (AC-2, AC-4)** [DD-2]
  - [x] `packages/domain/src/idempotency/keyed-store.ts` — `createKeyedStore(pool, {clock})` factory exposing `claim`, `recordResult`, `getResult`. Injected `clock: () => Date` (default = real wall clock, the DI seam). Three-path `claim()` inside one advisory-locked transaction that COMMITS independently of the caller's tx. `getResult` honours AC-2's "null if expired". `recordResult` throws `IdempotencyKeyNotClaimedError` on a missing key. **Explicit `claim()` algorithm — three paths, all inside one transaction:**
    ```
    BEGIN
    pg_advisory_xact_lock(hashtext(key))              -- serializes same-key concurrency
    INSERT INTO idempotency_keys (key, status, expires_at, created_at)
      VALUES ($key, 'pending', clock()+ttl, clock())
      ON CONFLICT (key) DO NOTHING
    IF affected_rows = 1:
      RETURN 'acquired'                               -- path (a): new row inserted
    existing = SELECT status, expires_at FROM idempotency_keys WHERE key = $key
    IF existing.expires_at < clock():
      UPDATE idempotency_keys
        SET status='pending', result=NULL, created_at=clock(), expires_at=clock()+ttl
        WHERE key = $key
      RETURN 'acquired'                               -- path (b): expired row reclaimed
    RETURN 'already_claimed'                          -- path (c): live row exists
    COMMIT
    ```
    The advisory lock ensures only one caller executes this sequence per key at a time — no TOCTOU gap between the INSERT conflict and the SELECT/UPDATE.
  - [x] Export `* as idempotency` from `packages/domain/src/index.ts` (+ `idempotency/index.ts` namespace barrel). Typecheck + lint green.
- [x] **Task 4 — Reusable queue contract (`packages/queue`) (AC-1)** [DD-3]
  - [x] Bootstrapped `packages/queue` as a new Turborepo workspace (package.json + tsconfig + eslint.config.js + vitest.config.ts). Typecheck + lint + build green. Note: pg-boss v12 is ESM with a NAMED `PgBoss` export → `import { PgBoss } from 'pg-boss'`. Bootstrap `packages/queue` as a new Turborepo workspace — follow the existing package pattern exactly:
    ```json
    {
      "name": "@twt/queue",
      "version": "0.0.0",
      "private": true,
      "type": "module",
      "main": "./src/index.ts",
      "scripts": {
        "build": "tsc -p tsconfig.json",
        "lint": "eslint .",
        "typecheck": "tsc --noEmit",
        "test": "vitest run --passWithNoTests"
      },
      "dependencies": { "pg-boss": "^12.19.1" },
      "devDependencies": {
        "@twt/eslint-config-twt": "workspace:*",
        "@types/node": "^22.15.3",
        "tsx": "^4.19.0",
        "typescript": "~5.9.2",
        "vitest": "^2.1.8"
      }
    }
    ```
    Also create `tsconfig.json` extending `../../tsconfig.base.json` with `"outDir": "dist"` (same pattern as `apps/jobs/tsconfig.json`). No explicit `pg` dep needed — pg-boss `^12.19.1` pulls in `pg ^8.21` transitively; pnpm resolves against the existing `^8.13` in the monorepo.
  - [x] `createQueueClient(connectionString, opts)` wrapping `new PgBoss({ connectionString, schema: 'pgboss', max: opts.max ?? 10, ssl: { rejectUnauthorized: false } })` + the `boss.on('error')` discipline (the pg-boss analog of `pool.on('error')`) + a `stopQueueClient` graceful-stop helper (`boss.stop({ graceful: true, timeout })`). pg-boss manages its own pool from the connection string.
  - [x] `JobEnvelope` type (`{ requestId, pariwarId, actorId, traceId }` + payload) and a queue-name registry (`QUEUE_NAMES.IDEMPOTENCY_VACUUM`). **`packages/queue` has no dependency on `@twt/domain`** — pure pg-boss wrapper + shared types. Curated pg-boss types (`Job`/`WorkHandler`/`SendOptions`/…) re-exported so consumers import the job contract from one place.
- [x] **Task 5 — `apps/jobs/src/boot.ts` worker runtime (AC-1, AC-3, AC-5)** [DD-3, DD-4]
  - [x] Construct the boss from `SERVICE_DATABASE_URL ?? resolveConnectionString()` via `createQueueClient`; `boss.start()` (creates the `pgboss` schema on first run); `createQueue()` the served queue. Separate `createDb` pool (max 2) for the vacuum DELETE (integrity-cli precedent).
  - [x] Register a worker with `boss.work(name, handler)` — handler typed to receive an **ARRAY of jobs** (`Job[]`, v12); returns `{ deleted }` (stored in `output`); throwing auto-`fail()`s with retry.
  - [x] `boss.schedule(QUEUE_NAMES.IDEMPOTENCY_VACUUM, cron, {}, { tz: 'Asia/Kolkata' })` for the TTL cleanup (AC-5). Vacuum = `idempotency.purgeExpiredKeys(pool)` → `DELETE FROM idempotency_keys WHERE expires_at < now()` (helper kept in `@twt/domain` to avoid raw table SQL in the entrypoint). Default cron hourly IST, env-overridable.
  - [x] Health-check endpoint (`/health` via `node:http`, 200/503) + `SIGTERM`/`SIGINT` → `stopQueueClient(boss, { timeoutMs })` graceful drain; `uncaughtException`/`unhandledRejection` flow through the single `logError` helper; non-zero exit on fatal. Build emits `dist/src/boot.js` (Dockerfile CMD target).
- [x] **Task 6 — Runbook documentation (AC-3)**
  - [x] Authored `docs/runbooks/job-queue-operations.md` (five-section house template): worker registration, `JobEnvelope`/ALS-rehydration, cron scheduling (IST), graceful-shutdown/drain, job classes A/B/C (§1.4), dead-letter, the `singletonKey`-vs-keyed-store distinction (DD-5), and the first-start CREATE prerequisite. Added it to the runbooks README File index + an `apps/jobs/README.md` Story 1.12 section.
- [x] **Task 7 — Live-DB tests (AC-4, AC-5)** [see Testing]
  - [x] Keyed-store concurrency (`packages/domain/tests/integration/idempotency/keyed-store.spec.ts`, own-committing pool, NOT setupLiveDb): N concurrent `claim(key)` → exactly one `'acquired'`, rest `'already_claimed'`; `recordResult`→`getResult`; expired-key reclaim (path b); `getResult` null-when-expired (AC-2); `recordResult` throws on absent key; the AC-4 sequential AND concurrent "run twice, one execution, both see same result" paths; `purgeExpiredKeys` vacuum (AC-5). Plus RLS regression (`tests/integration/rls/idempotency-keys-policy-regression.spec.ts`): USING(true) read, WITH CHECK(true) write, ENABLE+FORCE. **8 + 3 specs green; no regressions (207 passed/1 pre-existing skip).**
  - [x] pg-boss smoke (`packages/queue/tests/queue-client.test.ts`): `start` → `createQueue` → `work` (array handler) → `send` runs the handler; `send` twice with `singletonKey` → second returns `null` (DD-5); `schedule` registers the cron (verified name+cron+tz); `stop({graceful})` drains. **3 specs green.**
  - [x] Extend CI `integration-tests` filter to include `@twt/queue`; `@twt/jobs` already present.
- [x] **Task 8 — Defer-work + decision log (DD-4)**
  - [x] Re-affirmed **D2-1.10** / **D3-1.11a** deferred with updated re-triggers (pg-boss substrate now exists; crons not graduated); added a Story 1.12 `deferred-work.md` section (D1-1.12 per-tenant isolation, D2-1.12 enqueue-from-api, D3-1.12 prod CREATE grant, D4-1.12 per-class pools/DLQ) + decision-log entry **2026-06-15-049** (DD-1 Node bump, DD-2 global-table scope + twt_service-grant refinement, DD-3 packages/queue, DD-4 deferrals).
- [x] **Task 9 — Full verification**
  - [x] `pnpm turbo run lint typecheck build db:check` green (46/46 tasks, Node 22.22.2); unit `test` green (19/19 tasks); live-DB integration suite green (domain 207+1 pre-existing skip, events 31, jobs 17, api 62, queue 3 — `--filter` set incl. `@twt/queue`). Prettier-clean on all new files.

---

## Dev Notes

### Architecture compliance (the guardrails you MUST follow)

- **AR-5 / §1.4 — Postgres-only, no Redis.** pg-boss is the *only* job-queue dependency; do not add Redis/BullMQ/Inngest. Single backing Postgres. [Source: architecture.md#1.4, epics.md L260 AR-5]
- **§5.11 — queue schema isolation.** pg-boss tables live in a **separate Postgres schema** (`pgboss`, the pg-boss default) from operational data. This is satisfied by the constructor `schema` option — do not put queue tables in `public`. [Source: architecture.md#5.11 L3424]
- **§1.4 — job classes & dead-letter.** Three classes (A member-facing real-time / B operational-SLA / C background); jobs that exhaust retries → dead-letter; per-class escalation. The vacuum job is Class C. Document the taxonomy; do not hard-code per-class worker counts (that is operations policy, §5.11). [Source: architecture.md#1.4 L823-837]
- **§context propagation across job-queue boundaries.** ALS does **not** cross pg-boss boundaries. Job payloads carry the `{requestId, pariwarId, actorId, traceId}` envelope; worker handlers **rehydrate ALS from the envelope at job entry**. Bake this into the `JobEnvelope` contract and the worker wrapper. [Source: architecture.md#3.x L3895-3898]
- **§worker process lifecycle.** Health-check endpoint per worker workspace; graceful SIGTERM drain with a named timeout then force-shutdown; crash discipline via the single error helper; exit code ≠ 0 triggers container restart. [Source: architecture.md#5.9 L3938-3943]
- **§clock injection.** No bare `new Date()` / `Date.now()` in `packages/domain` / `apps/jobs` business logic — inject `clock`. (Also enforced by the workflow runtime: scripts here cannot call `Date.now()`.) [Source: architecture.md L3911-3915]
- **Story 1.6 RLS invariant.** Every table `twt_app` touches is `ENABLE`+`FORCE` RLS. `idempotency_keys` follows this with a `USING(true)` global carve-out (DD-2). **pgboss-schema tables are NOT twt_app tables** — they are owned/accessed by the pg-boss connection role, so they are correctly outside the twt_app RLS regime. **RLS suite check:** read `packages/domain/tests/integration/rls/` and look for any assertion that enumerates tables (e.g., `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`). The `pgboss` schema is a separate schema, so any `schemaname = 'public'` filter already excludes it — no change needed. Confirm by reading the suite before concluding. [Source: 1-6 story; migrations 0007/0009]
- **§1.8 migrations — forward-only, atomic, idempotent, hand-edit norm.** New migrations are append-only (0012, 0013); table+constraints in one migration for atomicity; GRANT/FORCE/trigger DDL is hand-supplemented (drizzle-kit does not emit it); re-running is a no-op via `__drizzle_migrations`. [Source: architecture.md#1.8; migrations 0004/0008/0009 headers]

### Library / framework requirements

- **pg-boss** — version per DD-1 (Option A: latest `12.19.x`, needs Node ≥22.12.0; Option B: `10.4.x`, Node ≥20). Depends on `pg ^8.21` (12.x) — repo already uses `pg ^8.13`; pnpm will resolve. Construct via `connectionString` (parsed) + `schema: 'pgboss'` + `max` + `ssl: { rejectUnauthorized: false }` (same Cloud SQL Auth Proxy reasoning as `createDb` in `packages/domain/src/db.ts` — loopback socket, no server-cert validation). Default `application_name` is `pgboss`.
- **pg-boss v12 API tripwires** (verified June 2026 — see Latest Tech Information):
  - `boss.work(name, options, handler)` — **handler receives `jobs: Job[]` (an ARRAY)**, even at `batchSize: 1`. Iterate. Returning a value stores it in `output`; an unhandled throw auto-`fail()`s and retries (`retryLimit` default **2**).
  - `boss.send(name, data, options)` — returns the job id, or **`null` when a `singletonKey` collides within `singletonSeconds`** (DD-5). Options include `singletonKey`, `singletonSeconds`, `retryLimit/Delay/Backoff`, `expireInSeconds` (default 15 min), `deadLetter`, `priority`, `startAfter`.
  - `boss.createQueue(name, { policy })` before `work`/`send`; policies: `standard` (default) / `short` / `singleton` / `stately` / `exclusive` / `key_strict_fifo`. Create queues explicitly at boot.
  - `boss.schedule(name, cron, data, { tz })` — cron via `cron-parser`; pass `tz: 'Asia/Kolkata'` for IST cadences (don't repeat the UTC-cron foot-gun the nightly-integrity workflow documents).
  - `boss.stop({ graceful: true, timeout, wait })` — graceful is the default; waits for in-flight jobs.
- **drizzle-orm** `^0.45` / **drizzle-kit** for the migration (already in `@twt/domain`). `jsonb` for `result`.
- Do **not** introduce a second hashing util for advisory locks — use Postgres `hashtext()` in SQL.

### File structure requirements

```
packages/domain/src/schema/idempotency_keys.ts        # NEW — table (no reject-mutation triggers)
packages/domain/src/policies/idempotency-keys-rls.ts  # NEW — permissive ALL USING(true) WITH CHECK(true)
packages/domain/src/idempotency/keyed-store.ts        # NEW — claim/recordResult/getResult
packages/domain/src/idempotency/index.ts              # NEW — namespace barrel
packages/domain/src/index.ts                          # EDIT — export * as idempotency
packages/domain/src/schema/index.ts                   # EDIT — register idempotency_keys
packages/domain/src/policies/index.ts                 # EDIT — register policy
packages/domain/migrations/0012_idempotency-keys.sql  # NEW (DO NOT REGENERATE)
packages/domain/migrations/0013_idempotency-keys-rls.sql  # NEW (DO NOT REGENERATE)
packages/domain/migrations/meta/*                     # generated snapshots + _journal.json
packages/queue/package.json                           # NEW — see Task 4 for exact template
packages/queue/tsconfig.json                          # NEW — extends ../../tsconfig.base.json, outDir: "dist"
packages/queue/src/index.ts                           # NEW — barrel (createQueueClient + JobEnvelope + queue-name registry)
apps/jobs/src/boot.ts                                 # NEW — pg-boss boot + health + SIGTERM drain + worker reg + schedule
apps/jobs/package.json                                # EDIT — add pg-boss + @twt/queue dep
apps/jobs/Dockerfile                                  # EDIT — (a) node:20→22 (Option A); (b) CMD dist/index.js → dist/src/boot.js; (c) add COPY packages/queue/package.json to deps stage
docs/runbooks/<job-queue-runbook>.md                  # NEW — worker reg / shutdown / classes / dead-letter
apps/jobs/README.md                                   # EDIT — Story 1.12 section
.github/workflows/ci.yml                              # EDIT — filter += @twt/queue; node-version → 22.x (Option A)
.github/workflows/nightly-integrity.yml               # EDIT — node-version → 22.x (Option A)
                                                      # NOTE: code-escrow-mirror.yml has no node-version pin — skip it
.nvmrc                                                # EDIT if Option A → 22.12.0
package.json (root)                                   # EDIT if Option A — engines.node → >=22.12.0
apps/api/Dockerfile, apps/admin/Dockerfile, apps/public/Dockerfile  # EDIT if Option A — node:20→22
```

- **Naming discipline (arch L3663-3677):** DB columns `snake_case` (`expires_at`, `completed_at`), TS fields `camelCase` (`expiresAt`, `completedAt`).

### Testing requirements

- **Harness:** live-DB integration via `packages/domain/src/test-utils/integration-setup.ts` (`setupLiveDb`, `describe.skipIf(!hasDatabase)`, `SET LOCAL ROLE twt_app` to shed superuser before asserting RLS). Pattern precedent: `apps/jobs/tests/audit/integrity-check.test.ts`, `packages/domain/tests/integration/rls/*`.
- **Concurrency caveat (critical for AC-4):** the advisory-lock + `ON CONFLICT` claim race needs **real concurrent transactions on separate pool clients** — it cannot be exercised inside `setupLiveDb`'s single per-test rollback tx. Use multiple `pool.connect()` clients (own-committing), and **assert membership, not absolute row counts** (own-committing writers accumulate rows across the shared live DB — see the Live-DB test gotchas memory). Clean up keys created by the test by their known keys.
- **Migration hygiene (memory — Live-DB test gotchas):** never regenerate an already-applied migration (drizzle skips by journal `when`, not SQL hash → `42P07`); never reset the test DB via `DROP SCHEMA` (strips `twt_app` USAGE → `42P01`).
- **pg-boss smoke test** creates the `pgboss` schema on `start()` — fine on CI's superuser `twt_dev_app`; in prod the pg-boss connection role needs CREATE on the DB for first start (note in runbook). Always `await boss.stop()` in test teardown so the suite doesn't hang on open workers.
- **CI:** extend the `integration-tests` filter in `ci.yml` L215 to add `--filter=@twt/queue`. If Option A, bump every `setup-node node-version` to 22.x in `ci.yml` + `nightly-integrity.yml` (`code-escrow-mirror.yml` has no `node-version` pin — skip it).

### Previous story intelligence (1.10 / 1.11a / 1.11b — directly load-bearing here)

- **Story 1.10** shipped the off-site mirror CLI (`apps/jobs/src/audit/mirror.ts` + `cli.ts`) whose 6-hourly cadence is **explicitly waiting on this story's pg-boss** (D2-1.10). It seeds its watermark from `AUDIT_MIRROR_SINCE_SEQ` until a durable `audit_mirror_state` store exists. **Per DD-4, leave it deferred** — but read its README note so you understand the graduation you are *enabling* (not *doing*).
- **Story 1.11a** built `verifyAuditChain` (`apps/jobs/src/audit/integrity-check.ts`) + its CLI (`integrity-cli.ts`). Its canonical cron is deferred to 1.12 (D3-1.11a); the interim trigger is `.github/workflows/nightly-integrity.yml` (`30 20 * * *` UTC = 02:00 IST — note the UTC foot-gun; use pg-boss `tz` to avoid repeating it). Reuses the **service pool / `SERVICE_DATABASE_URL` ?? `resolveConnectionString()`** connection pattern your `boot.ts` should copy verbatim (`integrity-cli.ts:28-30`).
- **Connection + pool discipline** is already solved in `packages/domain/src/db.ts` (`createDb`, `resolveConnectionString`, `pool.on('error')` logging only `code`+`message`). pg-boss manages its **own** pool from the connection string — do not hand it a `createDb` pool; pass the connection string (or the `db.executeSql` adapter only if you have a strong reason).
- **Global-table + RLS precedent** is `audit_integrity_checks` (schema + `audit-integrity-checks-rls.ts` + migrations 0008/0009). Your `idempotency_keys` differs in two ways: it is **mutable** (write policy + `UPDATE/DELETE` grants, like `role_grants` 0004) and **not append-only** (no reject-mutation triggers).

### Git intelligence summary

Recent epic-1 commits (`0433600`…`9298147`) establish the repeatable pattern this story follows: each primitive lands as schema + RLS policy + paired migrations (table → RLS) + logic in `@twt/domain` + tests, with `DO NOT REGENERATE` headers and a `deferred-work.md` section. 1.11a/1.11b added `@twt/jobs` and then `@twt/api` to the CI `integration-tests` filter — extend that same filter for `@twt/queue`. The branch convention is `story/1.12-...` off `main`; commit manually (branch + selective stage), do not use the `commit-story` helper [project memory: Story-automator ops].

### Latest tech information (web-verified, June 2026)

- **pg-boss latest = `12.19.1`**; **entire 12.x line `engines.node: >=22.12.0`**; **11.0.0+ `>=22`**; **last Node-20-compatible = `10.4.x` (`>=20`)**. This is the hard fact behind DD-1. [npm registry / `npm view pg-boss`]
- pg-boss depends on `pg ^8.21` (12.x), `cron-parser ^5`, `serialize-error ^13`.
- v12 API confirmed from the official docs (`docs/api/{workers,jobs,queues,constructor,scheduling}.md`): array-handler `work()`, `null`-on-collision `send()` with `singletonKey`, required `createQueue()` with queue policies, `schedule()` with `tz`, graceful `stop()`. Repo local Node is already **v22.22.2** (CI is the only place still on 20).

Sources:
- [pg-boss — npm](https://www.npmjs.com/package/pg-boss)
- [pg-boss 12.7.2 — npmx](https://npmx.dev/package/pg-boss/v/12.7.2)
- [pg-boss Postgres job-queue tutorial (Node 24, 2026)](https://nerdleveltech.com/pg-boss-postgres-job-queue-node-typescript-production-tutorial)
- [pg-boss registry metadata (12.0.0)](https://registry.npmjs.org/pg-boss/12.0.0)
- [pg-boss docs — workers/jobs/queues/constructor (GitHub `timgit/pg-boss`)](https://github.com/timgit/pg-boss/tree/master/docs/api)

### Project structure notes

- Aligns with the committed tree: `apps/jobs/src/boot.ts` is named in architecture L4315. `packages/queue` is a **new** package not in the committed tree — justified by AR-5's "one queue reused by every consumer" + the cross-cutting `JobEnvelope` contract that both `apps/api` and `apps/jobs` need (apps cannot depend on apps). If you prefer the lower-scope alternative (DD-3), fold the envelope + queue-names into `@twt/domain` instead and note the variance.
- **`apps/jobs/src/index.ts` is the existing public barrel** exporting `verifyAuditChain` and observability types for the apps/api on-demand endpoint. `boot.ts` is a **new runtime entrypoint alongside it** — do NOT merge pg-boss boot logic into `index.ts` (that would pull pg-boss + GCS deps into apps/api when it imports the barrel). The Dockerfile's `CMD` currently points to the PR-1 placeholder `dist/index.js`; Task 1 updates it to `dist/src/boot.js`.
- The idempotency keyed-store *logic* lives in `@twt/domain` (alongside `audit`), not in `packages/queue` — it is DB/table logic, independent of pg-boss, and consumed by request handlers that never touch the queue.

### References

- [Source: epics.md#Story-1.12 L1214-1230] — story statement + ACs (AR-5, AR-58; `claim/recordResult/getResult`; worker-reg + graceful-shutdown runbook; enqueue-twice → one execution).
- [Source: epics.md L260 (AR-5), L346 (AR-58)] — anchoring ARs.
- [Source: architecture.md#1.4 L794-837] — Postgres-only queue/idempotency/cache; advisory-lock + idempotency-key table + TTL vacuum; saga pattern; job classes; dead-letter.
- [Source: architecture.md#5.11 L3415-3438] — queue schema isolation + per-class worker pools + pool-spawn capacity envelope.
- [Source: architecture.md L3895-3898] — ALS does not cross pg-boss; metadata envelope rehydration.
- [Source: architecture.md#5.9 L3938-3943] — worker lifecycle (health, SIGTERM drain, crash discipline).
- [Source: architecture.md L3911-3915, L3663-3677] — clock injection; naming discipline.
- [Source: deferred-work.md D2-1.10, D3-1.11a, D8-1.2, D3-1.5] — what 1.12 enables; what stays deferred.
- [Source: packages/domain/migrations/0004_role-grants.sql, 0008/0009_audit-integrity-checks*.sql] — mutable-table grant pattern vs read-only ledger pattern; ENABLE+FORCE+self-test.
- [Source: apps/jobs/src/audit/integrity-cli.ts, packages/domain/src/db.ts] — service-pool connection pattern to copy in `boot.ts`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- `pnpm turbo run lint typecheck build db:check` → 46/46 tasks green (Node 22.22.2).
- `pnpm turbo run test` (DB-free) → 19/19 tasks green.
- Live-DB (`DATABASE_URL` → local `twt-test-pg` on :5433) `pnpm turbo run test --filter=@twt/domain --filter=@twt/events --filter=@twt/jobs --filter=@twt/api --filter=@twt/queue` → 9/9 tasks green; domain 207 passed / 1 pre-existing skip, events 31, jobs 17, api 62, queue 3.
- `pnpm db:migrate` applied 0012/0013 cleanly + verified idempotent on re-run; live catalog checks confirmed FORCE RLS, the `USING(true) WITH CHECK(true)` policy, mutable grants to twt_app + twt_service, and NO triggers.

### Completion Notes List

Implemented all 9 tasks; all 5 ACs satisfied.

- **AC-1** — pg-boss 12.19.1 co-located on the single Postgres, queue objects isolated in the dedicated `pgboss` schema, constructed via `@twt/queue`'s `createQueueClient` from `SERVICE_DATABASE_URL ?? resolveConnectionString()`. Proven by the queue-client smoke suite.
- **AC-2** — `idempotency.createKeyedStore` exposes exactly `claim` / `recordResult` / `getResult`, backed by Postgres advisory locks (`pg_advisory_xact_lock(hashtext(key))`) + the `idempotency_keys` table with explicit TTL.
- **AC-3** — `apps/jobs/src/boot.ts` implements the worker lifecycle (health endpoint + SIGTERM/SIGINT graceful drain with a named timeout + crash discipline) and the pattern is documented in `docs/runbooks/job-queue-operations.md`.
- **AC-4** — idempotent execution proven end-to-end by live-DB tests: N concurrent claims → exactly one `acquired`; sequential AND concurrent "run twice → one execution, both observe the same result".
- **AC-5** — the idempotency-TTL vacuum is wired as the first `boss.schedule(...)` cron consumer (IST), handler runs `idempotency.purgeExpiredKeys` (`DELETE … WHERE expires_at < now()`).

Decisions resolved as confirmed: **DD-1 Option A** (Node 22.12.0+ baseline; pg-boss 12.x), **DD-4** (mirror/integrity crons stay deferred). Recorded refinements over the story text: (1) `getResult` honours AC-2's "null if expired" (the Task-3 pseudocode omitted it); (2) GRANTed `idempotency_keys` to **twt_service** as well as twt_app — BYPASSRLS waives RLS-policy evaluation, NOT table-privilege checks, so the worker-path vacuum DELETE needs the explicit GRANT (0009 precedent); (3) the vacuum DELETE lives in a `@twt/domain` `purgeExpiredKeys` helper rather than raw SQL in the entrypoint. Decision-log entry **2026-06-15-049**; deferred-work items **D1-1.12 … D4-1.12** + re-affirmed D2-1.10 / D3-1.11a.

Note for review: pg-boss v12 is ESM with a NAMED `PgBoss` export (`import { PgBoss }`). The keyed store's `recordResult` throws `IdempotencyKeyNotClaimedError` when its key is absent (TTL-too-short signal). `apps/jobs` carries a direct `pg-boss` dep (for the `Job` handler type) alongside `@twt/queue`.

### File List

**New:**
- `packages/queue/package.json`
- `packages/queue/tsconfig.json`
- `packages/queue/eslint.config.js`
- `packages/queue/vitest.config.ts`
- `packages/queue/src/index.ts`
- `packages/queue/tests/queue-client.test.ts`
- `packages/domain/src/schema/idempotency_keys.ts`
- `packages/domain/src/policies/idempotency-keys-rls.ts`
- `packages/domain/src/idempotency/index.ts`
- `packages/domain/src/idempotency/keyed-store.ts`
- `packages/domain/migrations/0012_idempotency-keys.sql` (DO NOT REGENERATE)
- `packages/domain/migrations/0013_idempotency-keys-rls.sql` (DO NOT REGENERATE)
- `packages/domain/migrations/meta/0012_snapshot.json` (generated)
- `packages/domain/migrations/meta/0013_snapshot.json` (generated)
- `packages/domain/tests/integration/idempotency/keyed-store.spec.ts`
- `packages/domain/tests/integration/rls/idempotency-keys-policy-regression.spec.ts`
- `apps/jobs/src/boot.ts`
- `docs/runbooks/job-queue-operations.md`

**Modified:**
- `.nvmrc` (→ 22.12.0)
- `package.json` (root `engines.node` → >=22.12.0)
- `.github/workflows/ci.yml` (node-version → 22.12.0 ×9; integration-tests filter += @twt/queue)
- `.github/workflows/nightly-integrity.yml` (node-version → 22.12.0)
- `apps/api/Dockerfile`, `apps/admin/Dockerfile`, `apps/public/Dockerfile` (node:20→22-alpine)
- `apps/jobs/Dockerfile` (node:20→22-alpine; CMD → dist/src/boot.js; COPY packages/queue/package.json; header)
- `apps/jobs/package.json` (+ `@twt/queue` workspace dep, + `pg-boss`)
- `apps/jobs/README.md` (Story 1.12 section)
- `packages/domain/src/index.ts` (export `* as idempotency`)
- `packages/domain/src/schema/index.ts` (register `idempotency_keys`)
- `packages/domain/src/policies/index.ts` (register the policy)
- `packages/domain/migrations/meta/_journal.json` (0012/0013 tags)
- `docs/runbooks/README.md` (File index entry)
- `_bmad-output/implementation-artifacts/deferred-work.md` (Story 1.12 section + D2-1.10/D3-1.11a re-affirmation)
- `.decision-log.md` (Decision 2026-06-15-049)
- `pnpm-lock.yaml` (pg-boss + transitive deps)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (1-12 → in-progress → review)

### Change Log

| Date | Change |
|---|---|
| 2026-06-15 | Story 1.12 implemented — pg-boss 12.x job queue (Node 22 baseline bump) + `idempotency_keys` mutable global table (migrations 0012/0013) + advisory-lock keyed store + `packages/queue` reusable contract + `apps/jobs/src/boot.ts` worker runtime + idempotency-TTL vacuum cron + runbook. All 5 ACs satisfied; full verification green; status → review. |
