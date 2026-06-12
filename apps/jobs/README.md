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
