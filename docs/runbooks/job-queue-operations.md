# Runbook: Job Queue Operations (pg-boss)

> **Status:** draft (author-committed; awaiting ≥2-trustee sign-off per ledger)
> **Owner role:** Infrastructure on-call
> **Last material edit:** 2026-06-15 by Solo Builder (initial — Story 1.12)
> **Architectural authority:** architecture.md §1.4 (Postgres-only queue / idempotency / cache; advisory-lock + idempotency-key table + TTL vacuum; job classes; dead-letter) · §5.9 (worker process lifecycle — health, SIGTERM drain, crash discipline) · §5.11 (queue schema isolation; per-class worker pools) · §context-propagation (ALS does not cross pg-boss; metadata-envelope rehydration) · AR-5 (pg-boss, no Redis) · AR-58 (idempotency keyed store)

This runbook documents how to operate the canonical background-work substrate every downstream consumer reuses: pg-boss (the job queue) + the idempotency keyed store. It is the copy-me reference — a new queue consumer follows the patterns here rather than improvising. The substrate landed in Story 1.12; the first cron consumer is the idempotency-TTL vacuum.

## 1. Prerequisites

- **Single Postgres, no Redis (AR-5 / §1.4):** pg-boss is the only job-queue dependency. It runs co-located with the API DB and stores its queue objects in a **dedicated `pgboss` schema** (§5.11) separate from operational data. Do not add Redis / BullMQ / Inngest.
- **Node ≥ 22.12.0:** pg-boss 12.x requires it (the monorepo baseline was bumped to 22.12.0 in Story 1.12 — `.nvmrc`, `engines.node`, CI `setup-node`, all Dockerfiles).
- **Connection role with CREATE on first start:** `boss.start()` creates/migrates the `pgboss` schema on first run, which requires `CREATE` on the database. In dev/CI the superuser `twt_dev_app` has it. **In prod**, the pg-boss connection role (the `SERVICE_DATABASE_URL` login) needs `CREATE` on the DB for the first start only; after the schema exists, normal DML privileges suffice. Provision this before first deploy.
- **Connection string:** the worker resolves `SERVICE_DATABASE_URL ?? resolveConnectionString()` (the BYPASSRLS service login in prod; the app connection locally) — identical to the audit-integrity / mirror CLIs.
- **Migrations applied:** the `idempotency_keys` table (migrations 0012/0013) must be applied before the TTL-vacuum worker runs. `pnpm db:migrate`.

## 2. Step-by-step procedure

### 2.1 Construct the queue client (do this ONCE per process)

Always construct pg-boss via `@twt/queue`'s `createQueueClient` — never `new PgBoss(...)` directly. The wrapper bakes in the `pgboss` schema isolation, the Cloud-SQL SSL posture, and the mandatory `error`-event handler (an unhandled EventEmitter `error` crashes the process).

```ts
import { createQueueClient, stopQueueClient, QUEUE_NAMES } from '@twt/queue';

const boss = createQueueClient(connectionString, { applicationName: 'twt-jobs' });
await boss.start(); // creates the pgboss schema on first run
```

pg-boss manages its OWN connection pool from the connection string. **Do not** hand it a `createDb` pool. Domain-table work (e.g. the vacuum DELETE) uses a separate small `createDb` pool.

### 2.2 Register a queue + worker

`createQueue()` is required in pg-boss v12 before `work()` / `send()`. Queue names come from the `QUEUE_NAMES` registry in `@twt/queue` — never inline a string literal at a call site.

```ts
await boss.createQueue(QUEUE_NAMES.IDEMPOTENCY_VACUUM);
await boss.work(QUEUE_NAMES.IDEMPOTENCY_VACUUM, async (jobs) => {
  // ⚠ v12: the handler receives an ARRAY of jobs (even at batchSize 1). Iterate.
  // Returning a value stores it in the job `output`; an unhandled throw
  // auto-fail()s the job and retries (retryLimit default 2).
  for (const job of jobs) {
    // rehydrate ALS from the envelope (see 2.4), then do the work
  }
});
```

### 2.3 Schedule a cron

Use IST explicitly — do **not** repeat the UTC-cron foot-gun the nightly-integrity workflow documents.

```ts
await boss.schedule(QUEUE_NAMES.IDEMPOTENCY_VACUUM, '0 * * * *', {}, { tz: 'Asia/Kolkata' });
```

Cadence (the specific cron) is **operations policy** — the default (hourly) is overridable via `IDEMPOTENCY_VACUUM_CRON`. The vacuum body is `DELETE FROM idempotency_keys WHERE expires_at < now()` (uses the DB clock — maintenance, not business logic).

### 2.4 Propagate request context across the queue boundary (JobEnvelope + ALS rehydration)

ALS (the request-scoped `{ requestId, pariwarId, actorId, traceId }`) does **not** cross the pg-boss boundary (architecture §context-propagation). Every enqueue wraps its payload in the `JobEnvelope` type; the worker rehydrates ALS from the envelope **at job entry** so logging/auditing/tenant-scoping behave exactly as in the request path:

```ts
// enqueue side (apps/api, when its first real consumer lands)
await boss.send(QUEUE_NAMES.SOME_QUEUE, {
  requestId, pariwarId, actorId, traceId, payload,
} satisfies JobEnvelope<MyPayload>);

// worker side: read envelope.* and re-establish ALS before doing work
```

For GLOBAL/system jobs (e.g. the TTL vacuum) `pariwarId` is `null`.

### 2.5 Idempotency keyed store vs pg-boss `singletonKey` (DD-5 — do not conflate)

- **`singletonKey`** dedupes **enqueues** within a throttle window — `send()` returns `null` when a `singletonKey` collides within `singletonSeconds`. It does NOT store or return a result.
- **The keyed store** (`@twt/domain` `idempotency.createKeyedStore`: `claim` → run → `recordResult` → `getResult`) makes the **handler** replay-safe and lets both callers observe the SAME result.

They compose: use `singletonKey` to avoid duplicate enqueues AND the keyed store to make the handler run-once. **Do not delete the keyed store thinking `singletonKey` covers it.**

Caller contract: `ttlSeconds` MUST exceed the maximum handler runtime, or a key can expire mid-execution and be reclaimed by a concurrent caller. Callers **namespace keys** (embed the tenant id where needed: `upi:${pariwarId}:${memberId}:${alertId}`).

### 2.6 Job classes (§1.4) + dead-letter

Three job classes (do not hard-code per-class worker counts — that is operations policy, §5.11):

- **Class A** — member-facing real-time (e.g. channel dispatch on a member action).
- **Class B** — operational-SLA (e.g. reconciliation matcher).
- **Class C** — background (e.g. the idempotency-TTL vacuum, the audit mirror/integrity crons when they graduate).

Jobs that exhaust retries (`retryLimit`, default 2) route to a **dead-letter** queue (pg-boss `deadLetter` option names the DLQ). Per-class escalation and DLQ drain procedure are operations policy; document the specific DLQ per consumer when it lands.

### 2.7 Graceful shutdown

The worker traps `SIGTERM`/`SIGINT` and drains via `stopQueueClient(boss, { timeoutMs })` → `boss.stop({ graceful: true, timeout })`, which waits for in-flight jobs up to the timeout, then forces shutdown. The health endpoint flips to 503 during drain. A non-zero exit (crash discipline, §5.9) triggers a container restart.

## 3. Rollback procedure

- **The `pgboss` schema is forward-managed by pg-boss** (it runs its own migrations on `start()`). There is no app-level down-migration. To roll back a queue-consumer change, deploy the prior image (forward operation) — pg-boss is backward-compatible across patch/minor within 12.x.
- **`idempotency_keys` migrations (0012/0013) are FORWARD-ONLY** (architecture §1.8). The manual inverse for a dev-DB reset only is recorded in each migration header; never run it against prod.
- **A stuck/poisoned queue:** pause by stopping the worker (the container), inspect via `boss.getQueues()` / `boss.findJobs(name, …)`, and `boss.deleteQueuedJobs(name)` only after confirming the jobs are safe to drop. Re-deploy to resume.
- **A runaway cron:** `boss.unschedule(name)` removes the schedule without touching in-flight jobs.

## 4. Verification checks

- [ ] **Schema isolation:** `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgboss';` returns one row, and queue tables are NOT in `public`.
- [ ] **Worker healthy:** `curl -fsS http://<host>:<HEALTH_PORT>/health` returns HTTP 200 `{"status":"ok"}` when started and not draining; 503 during drain.
- [ ] **Vacuum scheduled:** `boss.getSchedules()` includes `idempotency.vacuum` with `cron` and `timezone = 'Asia/Kolkata'`.
- [ ] **Vacuum runs:** after a scheduled run, the job `output` records `{ deleted: <n> }`; `SELECT count(*) FROM idempotency_keys WHERE expires_at < now();` trends toward 0.
- [ ] **Idempotency holds (AC-4):** enqueuing/running the same logical job twice with the same key results in ONE execution and both callers observe the same result.
- [ ] **Graceful drain:** on `SIGTERM`, in-flight jobs complete (or the timeout elapses) before the process exits; the health endpoint returns 503 during drain.

If any check fails, do not declare success; escalate per §5.

## 5. Contact escalation list

- **Primary:** Infrastructure on-call.
- **Secondary (if primary unreachable within SLA):** Backup engineer (per `docs/backup-engineer/`).
- **Trustee escalation (when a queue failure affects audit-mirror or integrity-check crons once they graduate — D2-1.10 / D3-1.11a):** Trustee Panel chair on rota.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-06-15 | `<pending>` | Solo Builder | yes (initial) | yes (≥2 trustees) | `<pending sign-off>` |
