# @twt/jobs

Batch / scheduled jobs workspace. Per architecture §1.7 (job queue) + §Project
Structure, this is the home for background work that runs outside the request
path. Substantive jobs land per their owning Story.

## Story 1.10 — off-site audit-log mirror (`src/audit/`)

The 6-hourly replication of new `audit_log_entries` rows to the
Object-Retention-Locked GCS bucket in the **separate** `twt-audit-mirror` GCP
project (AR-9/10, §2.10a, AC-3/AC-4).

| File                    | Purpose                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `src/audit/mirror.ts`   | `pushNewAuditLinesToMirror` + `MirrorTarget`/`WatermarkStore` ports + in-memory fakes + `MIRROR_MODE` resolver |
| `src/audit/gcs-mirror-target.ts` | Live GCS adapter (dynamically imported in `MIRROR_MODE=live`; no-overwrite via `ifGenerationMatch:0`) |
| `src/audit/cli.ts`      | CLI entrypoint (`pnpm --filter @twt/jobs audit:mirror`)                        |

Behaviour:

- Reads audit rows after the watermark via the **service pool** (BYPASSRLS → the
  true global chain across all tenants) and writes ONE append-only segment object
  per run, named by the seq range it carries (`audit/segment-<minSeq>-<maxSeq>.jsonl`,
  one canonical-JSON line per row). No overwrites (Object Retention Lock + the
  in-memory fake both reject re-writes).
- **`MIRROR_MODE`** (mirrors `KMS_TEST_MODE`): `fake` (default; in-memory, used by
  local/CI tests) | `live` (GCS, requires `AUDIT_MIRROR_BUCKET`). The fake target
  + `WatermarkStore` make the push fn fully unit-testable without GCS.
- **6-hourly cadence** is wired with **pg-boss cron at Story 1.12** (pg-boss is not
  installed yet); this CLI is the invocable unit. The live Terraform apply
  (`infra/gcp/audit-mirror.tf`) + the durable watermark store are deferred (Story
  1.5 D1-1.5 precedent). v1 seeds the watermark from `AUDIT_MIRROR_SINCE_SEQ`.

The mirror IaC + the §2.10a quarterly attestation live at
[`infra/gcp/audit-mirror.tf`](../../infra/gcp/audit-mirror.tf) +
[`docs/runbooks/audit-mirror-attestation.md`](../../docs/runbooks/audit-mirror-attestation.md).

## Story 1.11a — audit-log integrity verification (`src/audit/`)

The job that **walks** the global hash chain Story 1.10 built and records a verdict
to `audit_integrity_checks` (`packages/domain`). Story 1.10 shipped the *verifiable*
chain + the *pure* `verifyChainSegment`; 1.11a is the orchestration around it.

| File                              | Purpose                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/audit/integrity-check.ts`    | `verifyAuditChain` (the one fn for all three triggers) + the pure `verifyChainWalk` + `ChunkReader`s |
| `src/audit/integrity-observability.ts` | `IntegrityObservabilitySink` / `IntegrityAlerter` ports + structured-log fakes + capturing fakes + `INTEGRITY_OBSERVABILITY_MODE` resolver |
| `src/audit/integrity-cli.ts`      | CLI / cron entrypoint (`pnpm --filter @twt/jobs audit:verify-integrity`)                  |

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
