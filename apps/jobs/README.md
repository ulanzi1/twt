# @twt/jobs

Batch / scheduled jobs workspace. Per architecture §1.7 (job queue) + §Project
Structure, this is the home for background work that runs outside the request
path. Substantive jobs land per their owning Story.

## Story 1.10 — off-site audit-log mirror (`src/audit/`)

The 6-hourly replication of new `audit_log_entries` rows to the
Object-Retention-Locked GCS bucket in the **separate** `twt-audit-mirror` GCP
project (AR-9/10, §2.10a, AC-3/AC-4).

| File                             | Purpose                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/audit/mirror.ts`            | `pushNewAuditLinesToMirror` + `MirrorTarget`/`WatermarkStore` ports + in-memory fakes + `MIRROR_MODE` resolver |
| `src/audit/gcs-mirror-target.ts` | Live GCS adapter (dynamically imported in `MIRROR_MODE=live`; no-overwrite via `ifGenerationMatch:0`)          |
| `src/audit/cli.ts`               | CLI entrypoint (`pnpm --filter @twt/jobs audit:mirror`)                                                        |

Behaviour:

- Reads audit rows after the watermark via the **service pool** (BYPASSRLS → the
  true global chain across all tenants) and writes ONE append-only segment object
  per run, named by the seq range it carries (`audit/segment-<minSeq>-<maxSeq>.jsonl`,
  one canonical-JSON line per row). No overwrites (Object Retention Lock + the
  in-memory fake both reject re-writes).
- **`MIRROR_MODE`** (mirrors `KMS_TEST_MODE`): `fake` (default; in-memory, used by
  local/CI tests) | `live` (GCS, requires `AUDIT_MIRROR_BUCKET`). The fake target
  - `WatermarkStore` make the push fn fully unit-testable without GCS.
- **6-hourly cadence** is wired with **pg-boss cron at Story 1.12** (pg-boss is not
  installed yet); this CLI is the invocable unit. The live Terraform apply
  (`infra/gcp/audit-mirror.tf`) + the durable watermark store are deferred (Story
  1.5 D1-1.5 precedent). v1 seeds the watermark from `AUDIT_MIRROR_SINCE_SEQ`.

The mirror IaC + the §2.10a quarterly attestation live at
[`infra/gcp/audit-mirror.tf`](../../infra/gcp/audit-mirror.tf) +
[`docs/runbooks/audit-mirror-attestation.md`](../../docs/runbooks/audit-mirror-attestation.md).

## Story 1.11a — audit-log integrity verification (`src/audit/`)

The job that **walks** the global hash chain Story 1.10 built and records a verdict
to `audit_integrity_checks` (`packages/domain`). Story 1.10 shipped the _verifiable_
chain + the _pure_ `verifyChainSegment`; 1.11a is the orchestration around it.

| File                                   | Purpose                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/audit/integrity-check.ts`         | `verifyAuditChain` (the one fn for all three triggers) + the pure `verifyChainWalk` + `ChunkReader`s                                       |
| `src/audit/integrity-observability.ts` | `IntegrityObservabilitySink` / `IntegrityAlerter` ports + structured-log fakes + capturing fakes + `INTEGRITY_OBSERVABILITY_MODE` resolver |
| `src/audit/integrity-cli.ts`           | CLI / cron entrypoint (`pnpm --filter @twt/jobs audit:verify-integrity`)                                                                   |

Behaviour:

- Walks `audit_log_entries` in ascending `seq` **in chunks** (default 1000) via the
  **service pool** (BYPASSRLS → the true global chain). Each chunk is verified by the
  reused `verifyChainSegment`; the walk adds the two checks that pure function can't
  do alone (DD-2 / CR-D2-1.10): a **genesis anchor** (the chain head must have
  `prevAuditHash === null`) and a **cross-chunk stitch** (each non-first chunk's first
  row must link to the prior chunk's last `auditHash`). It is **gap-tolerant** — burned
  IDENTITY `seq` values are expected; linkage is by hash, never by seq contiguity.
- **Three triggers, one function** (DD-4): the **daily cron**
  ([`.github/workflows/nightly-integrity.yml`](../../.github/workflows/nightly-integrity.yml),
  `30 20 * * *` UTC = 02:00 IST), the **on-demand** `POST /api/v1/audit/verify-integrity`
  (apps/api — GLOBAL, `requireAdminSession`-gated), and the **post-mirror** hook (a direct
  call at the end of `audit:mirror`, wired in the entrypoint so the pure mirror fn stays
  uncoupled) all call `verifyAuditChain`.
- **`INTEGRITY_OBSERVABILITY_MODE`** (mirrors `MIRROR_MODE`): `fake` (default;
  structured-log sink + alerter) | `live` (fails closed — the Cloud Monitoring adapter
  is the Category-5 graduation, §5.6). Every completion is published (AC-4); a broken
  chain additionally fires the alerter (AC-5). The CLI exits non-zero on a broken chain.
- **Deferred** (recorded in `deferred-work.md`): verify-from-cold-mirror (a new
  `ChunkReader`, DD-1), live observability/alerting (DD-5 → Category 5), the prod-pointed
  nightly run + canonical pg-boss cron (DD-4 → Story 1.12), the full RBAC `audit.verify`
  gate (a global-scope preHandler). The trustee verification UI is **Story 1.11b**.

## Story 1.12 — pg-boss worker runtime (`src/boot.ts`)

The long-lived worker process for this workspace — the canonical job-queue + idempotency
substrate every downstream consumer reuses (AR-5 / AR-58). Unlike the one-shot CLIs above,
`boot.ts` stays up: it constructs the boss, registers workers, schedules crons, serves a
health endpoint, and drains on SIGTERM. The Dockerfile `CMD` runs `dist/src/boot.js`.

| File          | Purpose                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/boot.ts` | pg-boss boot + `pgboss`-schema start + health endpoint + SIGTERM graceful drain + worker registration + cron scheduling |

Behaviour:

- Constructs the boss via `@twt/queue`'s `createQueueClient` from `SERVICE_DATABASE_URL ??
resolveConnectionString()` (the BYPASSRLS service login in prod; the app connection
  locally — the integrity-cli pattern). pg-boss stores its queue objects in a dedicated
  **`pgboss` schema** (§5.11), created on first `start()` (the connection role needs CREATE
  then; CI's superuser has it — see the runbook for prod).
- **First and only consumer this story:** the **idempotency-TTL vacuum** (AC-5) — a real
  pg-boss cron (`QUEUE_NAMES.IDEMPOTENCY_VACUUM`, default hourly IST, `tz: 'Asia/Kolkata'`)
  whose handler runs `idempotency.purgeExpiredKeys(pool)` (`DELETE FROM idempotency_keys
WHERE expires_at < now()`). Proves the cron + worker-registration substrate end-to-end.
- v12 `work()` handlers receive an **ARRAY** of jobs; returning a value stores it in the job
  `output`; an unhandled throw auto-fail()s + retries. Health endpoint at `/health`
  (200/503); SIGTERM/SIGINT → graceful drain via `stopQueueClient`.
- The idempotency **keyed store** (`@twt/domain` `idempotency.createKeyedStore`:
  `claim`/`recordResult`/`getResult`) is the replay-safe primitive (AC-2/AC-4) — distinct
  from pg-boss `singletonKey` (enqueue-dedupe only, DD-5). Both compose.
- **Deferred (DD-4, `deferred-work.md`):** the 6-hourly audit-mirror cron (D2-1.10) and the
  nightly integrity cron (D3-1.11a) do NOT graduate here — they need a durable watermark
  table + prod creds. 1.12 only proves the substrate with the TTL vacuum. **Enqueue-from-
  apps/api is out of scope** (no real consumer until Epic 7); `@twt/queue` is importable by
  apps/api but no live send path is wired.

Full operational detail: [`docs/runbooks/job-queue-operations.md`](../../docs/runbooks/job-queue-operations.md).
