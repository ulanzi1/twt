# Story 1.11a: Audit-Log Integrity Verification Primitive

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

`[PRIMITIVE]` — this is a substrate story. It ships the **integrity-check job that walks the global audit hash chain** (the chain Story 1.10 built), the `audit_integrity_checks` results table, the three invocation paths (daily cron / on-demand endpoint / post-mirror hook), and the observability + alerting seams. Story 1.10 produced a *verifiable* chain + a *pure* `verifyChainSegment`; **1.11a builds the job that walks it and records the verdict.** The **trustee-facing verification UI is Story 1.11b** (do NOT build UI here — only the on-demand endpoint it will call).

## Story

As Solo Builder,
I want a background job that walks the audit log hash chain and verifies integrity end-to-end on a daily schedule and on-demand,
so that any tampering attempt is caught by automated detection, not by manual discovery during incident.

## Acceptance Criteria

**Given** the audit log + hash chain shipped in Story 1.10
**When** the integrity-verification primitive is authored

1. **AC-1** — The job loads audit rows in **chunks** (e.g., 1000 at a time), verifies each `audit_hash` against `hash(prev_audit_hash + row_content)`, and continues until end-of-chain. [Uses the existing pure `verifyChainSegment` per chunk — see DD-2 for the mandatory cross-chunk stitching.]
2. **AC-2** — The job is invoked from **three paths**: (a) on **cron at 02:00 daily**, (b) **on-demand** via a server endpoint, (c) **automatically after every 6h Cloud Storage mirror push**. (Per DD-4 the three triggers reduce to one function; pg-boss is Story 1.12, so the scheduled cadence rides the mechanisms available now.)
3. **AC-3** — The result is persisted to a separate **`audit_integrity_checks`** table with `verified_at`, `start_audit_id`, `end_audit_id`, `chain_valid` (bool), `first_broken_row_id` (nullable), `verifier_actor`.

**Given** the chain is intact
**When** the job completes

4. **AC-4** — `chain_valid = true` and `first_broken_row_id = null`; the result is **published to the observability sink** (DD-5 provider-fluid seam).

**Given** the chain is broken (synthetic tamper test in CI)
**When** the job runs

5. **AC-5** — `chain_valid = false`, `first_broken_row_id` points to the **offending row**, and an **alert fires** (alerting hook — vendor-fluid per freeze table).

**Given** the repo's quality gates
**When** the story is complete

6. **AC-6 (gate)** — `pnpm turbo run lint typecheck test build` is green; `pnpm db:migrate` + `pnpm db:check` succeed and are **idempotent on re-run**; `contracts:check-openapi-determinism` is byte-stable; the live-DB integration suite passes **including a synthetic tamper test** that breaks the chain (at a mid-chunk row, at a chunk boundary, and via head-truncation) and confirms each break is **localized to the correct row**.

## CRITICAL DESIGN DECISIONS — resolve these FIRST (they shape every task)

These are genuine forks Story 1.10 deliberately handed forward (see the five `CR-D*-1.10` items in `deferred-work.md`). Each has a **recommended** path; deviate only with a recorded rationale in the author-commit + a Decision-log entry.

### DD-1 — Verification SOURCE: hot Postgres chain vs cold GCS mirror. **RECOMMENDED: walk the HOT Postgres chain via the service pool now; defer "verify-from-mirror in a separate GCP project" as a recorded graduation.**

The architecture's *ideal* is the integrity job reads the **cold mirror** from a **separate GCP project with separate read credentials** (§1.5 L850-853 "runs against the canonical copy, not operational Postgres"; §2.10 L1662-1664 "separate service account / separate project / dedicated execution environment"). But at Epic-1 dev-scale the mirror is a **fake** in CI and the live GCS apply is **deferred** (D1-1.10 / D1-1.5 precedent) — so the hot Postgres chain is the only verifiable source that exists today, and it is exactly what the chunked-DB read + `verifyChainSegment` already fit.

- **v1:** the walk reads `audit_log_entries` in ascending `seq` via the **service pool** (BYPASSRLS → the true GLOBAL chain across tenants), identical read posture to `pushNewAuditLinesToMirror` (`apps/jobs/src/audit/mirror.ts:114-133`).
- **Write the walk function SOURCE-AGNOSTIC:** it consumes seq-ordered `AuditLogEntryRow[]` from *either* the DB *or* the mirror JSONL, so the cold-mirror graduation is a new reader, not a rewrite. ⚠ If a future reader feeds mirror JSONL, **`recordedAt` arrives as a string** and must be reconstituted with `new Date(...)` before `verifyChainSegment` (CR-D10-1.10) — the hot DB path returns a `Date` already, so v1 needs no reconstitution.
- **Record (deferred graduation):** "integrity job verifies the cold mirror from a separate-project read SA in its own execution environment" — trigger: live GCS mirror apply (D1-1.10) + the §5.6 Grafana/Loki audit-read stack land.

### DD-2 — Chunked walk + cross-chunk STITCHING + genesis anchor. **RECOMMENDED: stitch chunk boundaries at the JOB level; do not change the pure `verifyChainSegment` signature.**

⚠ **This is the central correctness decision.** `verifyChainSegment` (`packages/domain/src/audit/hash-chain.ts:136-155`) by design **does NOT check `row[0]`'s linkage to its predecessor** (lines 148-152: "Skipped for the segment's first row — its predecessor may live outside the segment"). So **naive per-1000-chunk verification silently MISSES a break that lands exactly at a chunk boundary** (and on a single-row tail). This is CR-D2-1.10 verbatim.

- **Stitch (required):** walk ascending `seq` in chunks of N (default 1000). Carry the previous chunk's **last `auditHash`** forward; for every non-first chunk assert `chunk[0].prevAuditHash === carriedPrevHash` **before** calling `verifyChainSegment(chunk)`. A mismatch → `chain_valid=false`, `first_broken_seq = chunk[0].seq`. (Equivalent: overlap one row — pass the prior chunk's last row as `chunk[0]` of the next `verifyChainSegment` call. Either closes CR-D2-1.10 without touching the pure function.)
- **Genesis anchor (required):** the lowest-`seq` row of the whole chain MUST be genesis (`prevAuditHash === null`, and its recomputed hash uses `GENESIS_PREV_HASH`). If the chain head's first row has a **non-null** `prevAuditHash`, the head was truncated (wholesale prefix-deletion leaving a fake genesis) → `chain_valid=false`. Without this anchor, deleting rows `1..k` and treating `k+1` as the new head would pass.
- **Optional:** add a `predecessorLinkageVerified` field to `ChainVerificationResult` (CR-D2-1.10's suggested signature). Lower-blast-radius to keep the stitch in the job and leave the pure function unchanged — recommend the job-level stitch; the signature change is optional and only if it simplifies the caller.

### DD-3 — `audit_integrity_checks` table: shape + RLS + append-only. **RECOMMENDED: GLOBAL table, ENABLE+FORCE RLS + `USING(true)` SELECT carve-out, append-only triggers, 0008(table+triggers)/0009(RLS) split.**

The chain is GLOBAL (one monotonic `seq`, not per-tenant — `audit_log_entries.ts:18-20`), so the results table has **no `pariwar_id` dimension** → it is a **global** table (same class as the identity/auth family).

- **Columns** (map the AC's `*_audit_id` names — which name UUIDs — onto the chain-native `seq` the verifier returns):
  - `check_id` uuid PK `defaultRandom()`
  - `verified_at` timestamptz `defaultNow() notNull` (AC-3)
  - `start_seq` + `end_seq` bigint `notNull` (the chain range walked — what the verifier actually returns) **and** `start_audit_id` + `end_audit_id` uuid (the addressable AC-named columns, resolved from the boundary rows' `audit_id`)
  - `chain_valid` boolean `notNull` (AC-3/AC-4/AC-5)
  - `first_broken_seq` bigint **nullable** + `first_broken_audit_id` uuid **nullable** (`first_broken_row_id` — `verifyChainSegment` returns `firstBrokenSeq`; resolve to the row's `audit_id`) (AC-3/AC-5)
  - `verifier_actor` text `notNull` (AC-3) — who/what triggered: `cron` | `on-demand:<userId>` | `post-mirror`
  - `rows_verified` integer `notNull` + `trigger_source` text (`cron`|`on_demand`|`post_mirror`) for observability
- **RLS:** ENABLE + FORCE + a **`USING(true)`** SELECT policy `TO twt_app` (regime-consistency per the R2 decision / `identity-auth-rls.ts` — keeps the Story-1.6 "every twt_app table is FORCE-RLS" invariant whole; the table has no tenant dimension so there is nothing to scope, but the carve-out is the *visible, auditable* line that says so). `GRANT SELECT` → twt_app (the 1.11b UI reader); `GRANT INSERT, SELECT` → twt_service (the writer/service pool).
- **Append-only:** reject `UPDATE/DELETE/TRUNCATE` via triggers, exactly like `audit_log_entries_reject_mutation` (migration 0006:57-76). A verification verdict is itself tamper-evident — you cannot un-record a failed check.
- **Migrations:** 0008 = table + append-only triggers; 0009 = RLS + grants — mirroring the 0006/0007 split. `db:generate` emits the table-shape; **hand-supplement** triggers (0008) + GRANT/FORCE/self-test (0009); add the `⚠ DO NOT REGENERATE` header to both.

### DD-4 — Scheduling the three triggers (pg-boss is Story 1.12, NOT installed). **RECOMMENDED: GH-Actions cron for daily + global on-demand endpoint + direct post-mirror call now; pg-boss cron is the 1.12 graduation.**

`pg-boss` (architecture §1.7 job queue) is **not installed** — it is Story 1.12 (D2-1.10). The same DD-5 discipline Story 1.10 used for the mirror applies: ship the **function + entrypoints** now, defer the canonical cron wiring to 1.12.

- **(a) Daily 02:00 →** `.github/workflows/nightly-integrity.yml` — a GitHub Actions `schedule: cron: '0 2 * * *'` (⚠ **cron is UTC**; 02:00 IST = `30 20 * * *` UTC — pick and document one). This file is **architecture-committed** (directory tree L4164). In v1 CI it runs the **synthetic-tamper gate + a walk against a seeded DB** (mechanism proof). The **prod-pointed daily run** against the live chain from a separate execution environment is the deferred graduation (needs prod `SERVICE_DATABASE_URL` + separate-project creds per §2.10).
- **(b) On-demand →** an apps/api **GLOBAL** endpoint (NOT tenant-scoped — the chain is global; do not put it under `/p/:pariwarId/`), gated on **`audit.verify`** (Story 1.8). The existing `audit/verify-probe` route (`apps/api/src/modules/multi-tenant/index.ts:58-63`) is the **RBAC-guard template only** — the real endpoint supersedes that placeholder probe.
- **(c) After every 6h mirror push →** a **direct function call** at the end of the mirror flow (the mirror CLI / caller invokes the integrity check on the just-pushed range). Because the 6h cadence itself is deferred to pg-boss (D2-1.10), this hook rides whatever invokes the mirror today.
- **Record:** the canonical pg-boss-cron wiring of all three is the Story 1.12 graduation; the function + CLI + endpoint + GH-Actions cron are the v1 deliverable.

### DD-5 — Observability sink + alerting hook (vendor-fluid per freeze table). **RECOMMENDED: provider-fluid interfaces + console/in-memory fakes now; live wiring deferred to Category 5.**

AC-4 ("published to observability sink") and AC-5 ("alert fires — vendor-fluid per freeze table") must not hard-wire a vendor. The architecture defers the observability stack to **Category 5** (§5.6 Cloud Monitoring / Grafana+Loki; L1113 + L3125 "observability stack details committed in Category 5"; §1.5 the chain-break alert threshold "named in Category 5").

- Define `IntegrityObservabilitySink` (`publish(result)`) + `IntegrityAlerter` (`alertChainBroken(result)`), each with a **console/structured-log fake** (default) + an **env-resolved live adapter**, mirroring the `MIRROR_MODE` fake|live + `MirrorTarget` pattern (`mirror.ts:38-52,200-212`). v1 = the seam + fake; live Cloud Monitoring / alert-policy wiring is deferred to Category 5. The empty `packages/contracts/src/alerts/` dir is the alerts-contract landing (Stories 8.x own the substantive alert contracts — keep the integrity alerter's payload local unless a shared shape already fits).

## Tasks / Subtasks

- [x] **Task 1 — Resolve DD-1…DD-5** (record each verdict + rationale in the author-commit and the decision log). (AC: all)
- [x] **Task 2 — `audit_integrity_checks` schema** `packages/domain/src/schema/audit_integrity_checks.ts` (DD-3 columns + inferred row types; register in `schema/index.ts`). Mirror the header/naming discipline of `audit_log_entries.ts`. (AC-3)
- [x] **Task 3 — Migrations 0008 + 0009** (AC-2-table, AC-3)
  - [x] 3.1 `db:generate` the table shape → **0008**; hand-supplement the append-only `*_reject_mutation` function + 3 triggers (copy migration 0006:50-76). Add the `⚠ DO NOT REGENERATE` header.
  - [x] 3.2 **0009** = RLS: hand-supplement `GRANT SELECT TO twt_app`, `GRANT INSERT, SELECT TO twt_service`, `ENABLE` + `FORCE ROW LEVEL SECURITY`, the drizzle-emitted `CREATE POLICY` (USING(true)), and the twt_app-BYPASSRLS self-test (copy migration 0007). `DO NOT REGENERATE` header.
  - [x] 3.3 `pnpm db:migrate` + `pnpm db:check` green and **idempotent on re-run** (do not regenerate an applied migration — drizzle skips by journal `when`, not SQL hash → 42P07; live-DB gotcha from 1.10).
- [x] **Task 4 — RLS policy module** `packages/domain/src/policies/audit-integrity-checks-rls.ts` (USING(true) SELECT policy `TO appRole`, linked to the table). Register in `policies/index.ts`; confirm the `drizzle.config.ts` `*-rls.ts` glob picks it up. (AC-3)
- [x] **Task 5 — Core walk function** `apps/jobs/src/audit/integrity-check.ts` (AC-1, AC-2c, AC-3, AC-4, AC-5)
  - [x] 5.1 `verifyAuditChain({ servicePool, chunkSize?, sink, alerter, verifierActor, triggerSource })`: read ascending `seq` in chunks via the service pool (`gt(seq, cursor)` + `orderBy(asc(seq))` + `limit(chunkSize)`, copying `mirror.ts:128-133`).
  - [x] 5.2 **Genesis anchor** (DD-2): assert the lowest-seq row has `prevAuditHash === null`.
  - [x] 5.3 **Cross-chunk stitch** (DD-2 / CR-D2-1.10): carry the prior chunk's last `auditHash`; assert linkage at each boundary before `verifyChainSegment`.
  - [x] 5.4 **Gap-tolerant** (CR-D11-1.10): never infer "missing rows" from `seq` gaps — burned seqs (rolled-back txns) are expected; linkage is by `auditHash`, not `seq` contiguity.
  - [x] 5.5 Resolve `first_broken_seq` → `first_broken_audit_id` + the start/end `seq`→`audit_id` mapping from the boundary rows; **persist** one `audit_integrity_checks` row.
  - [x] 5.6 On success → `sink.publish(result)` (AC-4). On break → `sink.publish(result)` **and** `alerter.alertChainBroken(result)` (AC-5).
- [x] **Task 6 — Observability sink + alerter seams** (DD-5): interfaces + console/in-memory fakes + `resolve*FromEnv()` (mirror `resolveMirrorTargetFromEnv`). (AC-4, AC-5)
- [x] **Task 7 — On-demand endpoint** (AC-2b)
  - [x] 7.1 Contract `packages/contracts/src/audit/integrity-check.ts` (`.strict()` request + result response); register as an OpenAPI component in `scripts/emit-openapi.ts`; keep `contracts:check-openapi-determinism` byte-stable; extend the contract↔domain type-assignability test.
  - [x] 7.2 `apps/api/src/modules/audit-log/` route module: a **global** `POST /api/v1/audit/verify-integrity` (not tenant-scoped), `preHandler: [requireAdminSession(deps)]` (**NOT** `requirePermissionHook` — see Global RBAC note below), handler calls `verifyAuditChain({ servicePool: deps.servicePool, … })` with `verifierActor = 'on-demand:<session userId>'`. **Do NOT remove the `verify-probe` from `multi-tenant/index.ts`** — it exercises the RBAC second-guard independently; leave it in place.
- [x] **Task 8 — Post-mirror hook** (AC-2c): invoke `verifyAuditChain` at the end of the mirror flow (the mirror CLI / `pushNewAuditLinesToMirror` caller), `triggerSource='post_mirror'`. Do NOT couple the pure `pushNewAuditLinesToMirror` to the checker — wire it in the entrypoint.
- [x] **Task 9 — Daily cron** `.github/workflows/nightly-integrity.yml` (AC-2a): `schedule: cron` (document UTC vs IST), Postgres service container + `pnpm db:migrate` (copy the `integration-tests` job in `ci.yml:167-211`), run the synthetic-tamper gate + a walk. Note the prod-pointed run as deferred.
- [x] **Task 10 — CLI entrypoint** `apps/jobs/src/audit/integrity-cli.ts` + `audit:verify-integrity` script in `apps/jobs/package.json` (copy `cli.ts`: `SERVICE_DATABASE_URL ?? resolveConnectionString()`, `createDb`, structured log, `pool.end()` in finally). (AC-2)
- [x] **Task 11 — Tests** (AC-1, AC-4, AC-5, AC-6)
  - [x] 11.1 `apps/jobs/tests/audit/integrity-check.test.ts` (live-DB, copy `apps/jobs/tests/audit/mirror.test.ts` setup): intact chain → `chain_valid=true`, result persisted, `sink.publish` called; **synthetic tamper mid-chunk** → `chain_valid=false` + correct `first_broken_*` + `alerter` fired; **break at chunk boundary** (small `chunkSize`) → caught (proves the stitch); **head-truncation** → caught (proves genesis anchor); **seq-gap** chain → still valid (proves gap-tolerance). Reuse 1.10's synthetic-tamper technique (trigger disabled inside a ROLLBACK'd tx — see `packages/domain/tests/integration/audit-log/integrity-check.spec.ts`).
  - [x] 11.2 Extend the CI `integration-tests` job filter to include `@twt/jobs` (`ci.yml:211`) so the live-DB integrity tests run in CI.
  - [x] 11.3 ⚠ `writeAuditEntry` and the checker **commit their own transactions** — assert membership / `>=`, never `=== N` against shared-DB state (live-DB gotcha).
- [x] **Task 12 — Gate + closure** (AC-6)
  - [x] 12.1 `pnpm turbo run lint typecheck test build` green; `db:migrate`+`db:check` idempotent; `contracts:check-openapi-determinism` byte-stable.
  - [x] 12.2 `deferred-work.md`: mark **CR-D2-1.10 / CR-D10-1.10 / CR-D11-1.10** handled-in-1.11a; add deferrals (verify-from-mirror DD-1, live observability/alerting DD-5, prod nightly run DD-4, optional `predecessorLinkageVerified` DD-2, **RBAC gate upgrade** — "upgrade `POST /api/v1/audit/verify-integrity` from `requireAdminSession`-only to full `audit.verify` RBAC gate when a global-scope preHandler exists"). Per `[[feedback_closure_language_precision]]`: "Closed by [edit]" only where an artifact exists; else "Resolved via explicit deferral" with a trigger.
  - [x] 12.3 READMEs (`apps/jobs` integrity job; `packages/domain` audit_integrity_checks) + decision-log entries.

### Review Findings

> Code review of Group 1 (apps/jobs/src/audit/ + tests) — 2026-06-14. 2 decision-needed, 1 patch, 3 deferred, 12 dismissed.

- [x] [Review][Patch] **Post-mirror CLI exit code on chain break** — set `process.exitCode=1` in `cli.ts` after the post-mirror hook when `chainValid=false`, consistent with `integrity-cli.ts`. Decision: A (mirror job should fail loudly on detected chain break). [`apps/jobs/src/audit/cli.ts:82`]
- [x] [Review][Patch] **AC-6 live-DB tests: add chunk-boundary deletion and head-truncation** — add two live-DB tests to `verifyAuditChain` suite: (1) DISABLE TRIGGER + DELETE boundary row + small chunkSize → detects stitch failure, verdict persisted + alert fired; (2) DISABLE TRIGGER + DELETE genesis row → detects head-truncation, verdict persisted + alert fired. Decision: A (satisfies AC-6 literally). [`apps/jobs/tests/audit/integrity-check.test.ts`]
- [x] [Review][Patch] **`sink.publish` throw before `alertChainBroken` suppresses the alert on a broken chain** — reordered: `alertChainBroken` now runs before `sink.publish` so a live-adapter publish failure cannot silence the break alert. [`apps/jobs/src/audit/integrity-check.ts:291-296`]
- [x] [Review][Patch] **Missing CHECK constraints on `audit_integrity_checks` — structural invariants not enforced at the DB layer** — added migration 0010 with: (1) `CHECK (NOT chain_valid OR (first_broken_seq IS NULL AND first_broken_audit_id IS NULL))` — valid chain implies no broken row; (2) `CHECK ((start_seq IS NULL) = (end_seq IS NULL) AND (start_seq IS NULL) = (start_audit_id IS NULL) AND (end_seq IS NULL) = (end_audit_id IS NULL))` — boundary seq+id pairs are co-present; (3) `CHECK (rows_verified >= 0)` — never negative (0 is valid for empty chain). [`packages/domain/migrations/0010_audit-integrity-checks-invariants.sql`]
- [x] [Review][Defer] **No transactional atomicity between verdict INSERT and sink.publish on `servicePool` path** [`apps/jobs/src/audit/integrity-check.ts:285-296`] — deferred, pre-existing; only matters with a live adapter (Category 5); D2-1.11a already recorded
- [x] [Review][Defer] **New rows may be appended between the last chunk read and the verdict INSERT on `servicePool` path** [`apps/jobs/src/audit/integrity-check.ts:269`] — deferred, pre-existing; inherent to point-in-time verification design; `endSeq` correctly captures what was verified
- [x] [Review][Defer] **`createInMemoryChunkReader` silently drops second occurrence if two rows share the same seq** [`apps/jobs/src/audit/integrity-check.ts:227-232`] — deferred, test-only helper; IDENTITY seq makes duplicates impossible in production

> Code review of Group 3 (contracts, API route, OpenAPI) — 2026-06-14. 2 patches, 1 dismiss-revised, 9 dismissed/deferred.

- [x] [Review][Patch] **Broken-chain test fixture `endSeq: null` with `rowsVerified: 6` is semantically inconsistent** — when 6 rows verify before the break at seq=7, `endSeq` must be seq 6 (the last good row), not null. Fixed: `endSeq: 6, endAuditId: '...'` in the broken-chain fixture. The Zod schema has no cross-field constraint preventing the inconsistent shape, so the test still passed — but the fixture would mislead future readers. [`packages/contracts/tests/type-assignability.test.ts:146-147`]
- [x] [Review][Patch] **OpenAPI path `/api/v1/audit/verify-integrity` missing `400` response** — all other POST paths in `v1.yaml` declare `400` for Zod body validation failure; `AuditIntegrityCheckRequest.strict()` rejects unknown keys with a 400 that was undocumented. Added `400: Request validation failed`. [`openapi/v1.yaml:975-980`]
- [x] [Review][Dismiss] **CSRF double-submit omitted on write route** — `originCheckHook` runs globally on all POST requests as the baseline CSRF layer; `app.csrfProtection` (double-submit token) is NOT applied to all admin write routes, only `logout`; `password-reset/consume` (also a state-changing admin POST) does not use it. `verify-integrity` is consistent with the project's existing pattern.
- [x] [Review][Defer] **`triggerSource` contract uses `z.string()` not a Zod enum** — intentional: Drizzle `text` column is `string`; using `z.union(['cron','on_demand','post_mirror'])` would break the `$inferSelect` type-assignability the test verifies; upgrade to an enum when the contracts layer adds a dedicated `TriggerSource` type. [`packages/contracts/src/audit/integrity-check.ts`]
- [x] [Review][Defer] **Sink and alerter resolved separately from env at registration; `live` mode throws at startup** — two-call pattern is correct for v1; combining into `resolveIntegrityObservabilityFromEnv() → { sink, alerter }` is a tidy refactor for a post-v1 story; startup fail-fast on `live` mode is intentional. [`apps/api/src/modules/audit-log/index.ts:52-53`]

## Dev Notes

### Source-of-truth references (cite these in code headers)

- **AC source:** `_bmad-output/planning-artifacts/epics.md` L1173-1193 (Story 1.11a block). Cross-story: L1154-1171 (Story 1.10 produces the chain `verifyChainSegment` verifies); L1195-1212 (Story 1.11b consumes this story's on-demand endpoint + result table).
- **Architecture §1.5** L839-902 — two-tier audit store; the **integrity-check job** (L850-853: runs against the canonical copy, separable from prod-DB access); **two failure modes** (L865-874: replication-lag detector *vs* chain-integrity check — **1.11a is the chain-integrity check only**; the lag detector needs the durable watermark deferred to 1.12, so it is out of scope here); SHA-256 (L888); single canonicalizer for all producers+verifiers (L898-902).
- **Architecture §2.10 / §2.10a** L1655-1698 — integrity-check **read** credentials in a separate GCP project / dedicated execution environment; sole-engineer creds cannot reach it; quarterly attestation. (The DD-1 graduation target.)
- **Architecture §5.6** L3122-3173 — observability stack (Cloud Monitoring + Grafana/Loki), **committed in Category 5**; audit-mirror read constrained to named execution environments (the integrity-check job's compute environment). (The DD-5 graduation target.)
- **Architecture directory tree** L4164 (`.github/workflows/nightly-integrity.yml`), L4317 (`apps/jobs/src/audit/`), L4537 (`apps/jobs/src/audit/` = integrity check), L4425 (`tests/integration/audit-log/integrity-check.spec.ts`).
- **deferred-work.md** — the five Story-1.10 → 1.11a handoffs: **CR-D2-1.10** (stitch landmine), **CR-D3-1.10** (ms-precision ISO contract), **CR-D6-1.10** (hash-format pin for cross-language verifiers), **CR-D10-1.10** (mirror JSONL `recordedAt` is a string), **CR-D11-1.10** (seq gaps are benign); plus **D2-1.10** (6h cron + durable watermark → pg-boss 1.12), **D13-1.4** (1.11b consumes the audit contract), **D13-1.2** (the integrity-check integration slot).

### Patterns to COPY (do not reinvent — checklist anti-pattern #1)

- **The pure verifier — REUSE, do not rebuild:** `verifyChainSegment`, `computeAuditHash`, `auditRowDigestInput`, `GENESIS_PREV_HASH`, `AuditChainContent`, `ChainVerificationResult` are all exported from `@twt/domain/audit` (`packages/domain/src/audit/index.ts:14-21`). 1.11a's job is the **orchestration around** these, not a second hash implementation. Re-deriving the hash anywhere violates the single-canonicalizer invariant (§1.5 L898-902, AC-6 of 1.10).
- **Service-pool chunked read:** `apps/jobs/src/audit/mirror.ts:114-158` (`pushNewAuditLinesToMirror`) — the exact `servicePool` + `drizzle(pool)` + `gt(seq, cursor)`/`asc(seq)`/`limit(batch)` chunking the walk needs. The service pool reads the GLOBAL chain (BYPASSRLS).
- **Interface + fake + env-resolver:** `mirror.ts:38-52` (interfaces), `:160-193` (in-memory fakes), `:200-212` (`resolveMirrorTargetFromEnv` / `MIRROR_MODE` fake|live) — the template for the DD-5 sink + alerter.
- **CLI entrypoint:** `apps/jobs/src/audit/cli.ts` — `SERVICE_DATABASE_URL ?? resolveConnectionString()`, `createDb(conn, {max:2})`, structured `console.info`, `pool.end()` in `finally`, `process.exit(1)` on failure.
- **Append-only migration:** `packages/domain/migrations/0006_audit-log-entries.sql:50-76` (function + 3 triggers); **RLS migration:** `0007_audit-log-entries-rls.sql` (GRANT/ENABLE/FORCE/policy/self-test). Both carry the `⚠ DO NOT REGENERATE` discipline.
- **Schema header + naming:** `packages/domain/src/schema/audit_log_entries.ts` (snake_case columns / camelCase TS fields; `$inferSelect`/`$inferInsert` row types).
- **Session-only gate for global routes:** `apps/api/src/modules/auth/shared/session-guard.ts` (`requireAdminSession`) + `admin-auth.routes.ts:97` (`[requireAdminSession(deps), app.csrfProtection]`) — this is the correct template for non-tenant-scoped routes. `requirePermissionHook` (`rbac/index.ts:67`) **cannot** be used on a global route: it requires `request.scopeTx` which `scopeResolutionHook` sets from `/:pariwarId/` — a global route has no such param, so the hook hard-throws 500. **For v1 gate with `requireAdminSession` only.** Record deferred work: "upgrade `POST /api/v1/audit/verify-integrity` to full RBAC `audit.verify` gate when a global-scope preHandler exists." `deps.servicePool` is already constructed (`apps/api/src/deps.ts:81-84,106`) — the handler reuses it.
- **Synthetic tamper in a live test:** `packages/domain/tests/integration/audit-log/integrity-check.spec.ts` (1.10's 8-test suite) — disables the append-only trigger inside a ROLLBACK'd tx to forge an out-of-band mutation, then asserts `verifyChainSegment` localizes it. Reuse the technique for the 1.11a job tests.

### ⚠ The five inherited landmines (CR-D*-1.10) — handle every one

1. **CR-D2-1.10 (stitch):** `verifyChainSegment` cannot verify `row[0]`'s predecessor linkage. Per-chunk verification MUST stitch boundaries + anchor genesis (DD-2). **The most likely silent bug in this story.**
2. **CR-D10-1.10 (Date reconstitution):** only if reading mirror JSONL — `JSON.parse` makes `recordedAt` a string; `verifyChainSegment` calls `.toISOString()` → `TypeError`. The v1 hot-DB path returns a `Date`, so this only bites the DD-1 cold-mirror graduation; write the function source-agnostic and reconstitute at the JSONL reader boundary.
3. **CR-D11-1.10 (seq gaps):** IDENTITY sequences burn values on rollback. Never assert seq contiguity; never infer "missing rows" from a gap. Linkage is by `auditHash`.
4. **CR-D3-1.10 / CR-D6-1.10 (cross-language):** the ms-precision ISO contract and the 64-char-lowercase-hex format are only load-bearing for a non-JS verifier or an SDK client. v1 is JS-only — note them, defer to ADR-0004 / 1.11b SDK gen; do not gold-plate.

### Regression guardrails (what must NOT break)

- **Never write to `audit_log_entries` from this story.** 1.11a is read-only against the chain. The only writes are to the **new** `audit_integrity_checks` table.
- **Do not modify `verifyChainSegment` / `computeAuditHash` / `auditRowDigestInput`** beyond the *optional* additive `predecessorLinkageVerified` field — changing the hash projection would invalidate every existing `audit_hash` and break 1.10's chain.
- **Do not couple `pushNewAuditLinesToMirror` to the checker** — the post-mirror hook wires in the entrypoint, keeping the pure mirror fn (and its 5 tests) untouched.
- **The on-demand endpoint is GLOBAL, not tenant-scoped** — placing it under `/p/:pariwarId/` would wrongly imply a per-tenant chain. Gate on `audit.verify` (national scope).
- **Keep the unit `test` job DB-free** — live-DB integrity tests run in the `integration-tests` job (extend its filter, Task 11.2), behind the `describe.skipIf(!hasDatabase)` guard pattern.
- **2 pre-existing `apps/api/admin-auth.spec.ts` failures (lockout/logout) + 2 `contracts/auth.test.ts` `.min(12)` failures exist on `main`** (documented in 1.10) — they are NOT 1.11a regressions; do not "fix" them in scope.

### Previous-story intelligence (Story 1.10 — the direct dependency)

- 1.10 shipped: `audit_log_entries` (schema + migration 0006 table/triggers + 0007 RLS), `writeAuditEntry` (advisory-lock global-chain writer on the service pool), the pure hash-chain module, the off-site mirror job (`apps/jobs/src/audit/mirror.ts` + GCS adapter + CLI + Terraform), and the `apps/api` real sinks. **Last migration = 0007 → 1.11a's are 0008/0009.**
- 1.10's DD-5 set the precedent 1.11a follows exactly: pg-boss is 1.12, so ship the function + CLI + committed schedule mechanism; defer the live cron + durable watermark to 1.12.
- 1.10 verified W16: `pg_partman` absent on the local `postgres:16-alpine` image, present on Cloud SQL → `audit_log_entries` ships **non-partitioned**; the chain is over `seq` (partition-agnostic). `audit_integrity_checks` is tiny → also non-partitioned, no question.
- **Live-DB gotchas (from `[[project_live_db_test_gotchas]]`):** never regenerate an applied migration (42P07); never reset via `DROP SCHEMA` (strips twt_app USAGE → 42P01); own-committing writers accumulate rows → assert membership, not counts.

### Git intelligence

Recent commits: `9298147` Story 1.10 (audit log + hash chain + mirror) → the substrate this story consumes; `156a5b1` Story 1.9 (apps/api Fastify framework + admin auth + the audit sinks); `e36bd31` Story 1.8 (RBAC `audit.verify` permission key). The framework, the chain, and the permission key 1.11a needs all already landed.

### Latest-tech notes

- No new runtime dependency is required: SHA-256 is `node:crypto` (already used), the canonicalizer is `@twt/domain`, DB access is `drizzle-orm` + `pg` (already in `apps/jobs`). **Do NOT add pg-boss** (Story 1.12).
- GitHub Actions `schedule:` cron is **UTC**; 02:00 IST ⇒ `30 20 * * *` UTC. Document the chosen interpretation in the workflow file. Scheduled workflows only run from the default branch and can be delayed under load — acceptable for the v1 mechanism-proof; the prod-grade daily run graduates to pg-boss/Cloud Scheduler (DD-4).

### Project Structure Notes

- New files land in architecture-committed homes: `packages/domain/src/schema/audit_integrity_checks.ts`, `packages/domain/src/policies/audit-integrity-checks-rls.ts`, `packages/domain/migrations/0008_*.sql` + `0009_*.sql`, `apps/jobs/src/audit/integrity-check.ts` + `integrity-cli.ts`, `apps/jobs/tests/audit/integrity-check.test.ts`, `apps/api/src/modules/audit-log/*`, `packages/contracts/src/audit/integrity-check.ts`, `.github/workflows/nightly-integrity.yml`.
- **Variance to record (not an oversight):** §1.5 L850-853 + §2.10 place the integrity check against the **cold mirror** from a **separate-project read SA**; v1 walks the **hot Postgres chain** via the service pool (DD-1) because the mirror is a CI fake and live GCS apply is deferred — recorded as an explicit graduation, mirroring 1.10's mirror live-apply deferral.
- **Variance:** the architecture sketch names `apps/jobs/audit/`; the codebase uses `apps/jobs/src/audit/` (where the 1.10 mirror lives) — keep the integrity check beside it. The `apps/worker-audit/` credential-separability graduation (§Split Triggers) is NOT triggered yet.
- **Two `audit` directories in `apps/api/src/` — do not conflate:** `apps/api/src/audit/` already exists (1.10's writer utility — `audit-log-sink.ts`, `audit-sink.ts`; non-route code). The new `apps/api/src/modules/audit-log/` is the **route module** for the endpoint. Route code goes in `modules/audit-log/`; do not put it in `src/audit/`.
- **URL path convention:** architecture §3.1 states `/api/v1/global/<resource>` for cross-Pariwar endpoints, but in practice the `auth` module uses `/api/v1/auth/...`. The on-demand endpoint uses `/api/v1/audit/verify-integrity` (domain-prefix pattern matching auth). This is an intentional deviation from the `/global/` prefix — document it in the route file header if questioned.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.11a] L1173-1193 (ACs); L1154-1171 (1.10); L1195-1212 (1.11b).
- [Source: _bmad-output/planning-artifacts/architecture.md#1.5] L839-902; [#2.10/2.10a] L1655-1698; [#5.6] L3122-3173; [directory tree] L4164/L4317/L4425/L4537.
- [Source: packages/domain/src/audit/hash-chain.ts] verifyChainSegment:136-155 (the no-predecessor-linkage gap), computeAuditHash:102-110, GENESIS_PREV_HASH:56.
- [Source: packages/domain/src/audit/write.ts] writeAuditEntry / service-pool + advisory-lock pattern; AUDIT_CHAIN_LOCK_KEY:62 (own-commit caveat:19-21).
- [Source: packages/domain/src/schema/audit_log_entries.ts] columns + global-chain topology (seq) :18-20,60-153.
- [Source: apps/jobs/src/audit/mirror.ts] chunked service-pool read + interface/fake/env-resolver patterns :38-52,114-212.
- [Source: apps/jobs/src/audit/cli.ts] CLI entrypoint pattern.
- [Source: apps/api/src/deps.ts] servicePool construction :81-84,106; [apps/api/src/modules/multi-tenant/index.ts:58-63] audit.verify probe; [apps/api/src/modules/rbac/index.ts:67] requirePermissionHook.
- [Source: packages/domain/migrations/0006_audit-log-entries.sql:50-76] append-only triggers; [0007_audit-log-entries-rls.sql] RLS/grants/self-test.
- [Source: packages/contracts/src/audit/audit-log-entry.ts] the 1.10 contract pattern (component-only, OpenAPI-registered).
- [Source: .github/workflows/ci.yml:167-211] the integration-tests live-DB job (copy for nightly-integrity.yml + extend the filter).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] CR-D2/D3/D6/D10/D11-1.10; D2-1.10; D13-1.4; D13-1.2.
- [Source: packages/domain/src/rbac/permissions.ts:90 + roles.ts:62-63] the `audit.verify` permission key.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8) — bmad-dev-story workflow, 2026-06-14.

### Debug Log References

- Migrations 0008/0009 applied to live Postgres 16 (local :5433); `db:migrate` re-run = no-op (idempotent), `db:check` "Everything's fine". Catalog-verified: RLS enabled+forced, `audit_integrity_checks_global_select` USING(true), 3 append-only triggers, grants (twt_app SELECT; twt_service INSERT,SELECT); INSERT ok, UPDATE/DELETE raise the append-only error.
- `pnpm turbo run lint typecheck build db:check contracts:check-openapi-determinism` → 44/44 green. `pnpm turbo run test` (DB-free) → 17/17 green (live suites skip via `describe.skipIf`).
- Live-DB suite (`DATABASE_URL` set, `--filter @twt/{domain,events,jobs}`): domain 196 (+1 skip), events 31, jobs 15 (incl. 9 integrity-check), contracts 68 — all green.
- CLI mechanism proofs against the live 187-row chain: `audit:verify-integrity` → `chainValid:true, startSeq:1, endSeq:187`, exit 0; `audit:mirror` → mirror push + post-mirror integrity verdict (`triggerSource:post_mirror`).
- OpenAPI re-emitted 22844 → 25285 bytes, determinism byte-stable.

### Completion Notes List

DD verdicts (Task 1) recorded in `.decision-log.md` Decision 2026-06-14-047; all five followed the story's recommended paths.
- **DD-1** — walk the HOT Postgres chain via the service pool; the walk is SOURCE-AGNOSTIC (`ChunkReader`) so verify-from-cold-mirror is a new reader (deferred, D1-1.11a).
- **DD-2 (central correctness)** — chunked walk + **genesis anchor** + **cross-chunk stitch** at the JOB level; `verifyChainSegment` signature untouched. Closes CR-D2-1.10. Gap-tolerant (CR-D11-1.10): linkage by `auditHash`, never seq contiguity.
- **DD-3** — `audit_integrity_checks` GLOBAL, append-only triggers, ENABLE+FORCE+`USING(true)` SELECT carve-out, migrations 0008(table+triggers)/0009(RLS) mirroring 0006/0007. **Refinement (recorded):** boundary `*_seq`/`*_audit_id` columns are NULLABLE so an empty-chain run records `chain_valid=true, rows_verified=0`; every non-empty run populates them.
- **DD-4** — three triggers → one `verifyAuditChain`: GH-Actions daily cron (`30 20 * * *` UTC = 02:00 IST), GLOBAL on-demand endpoint, post-mirror direct call. pg-boss cron + prod run deferred (D3-1.11a → Story 1.12).
- **DD-5** — provider-fluid `IntegrityObservabilitySink`/`IntegrityAlerter` + structured-log fakes + `INTEGRITY_OBSERVABILITY_MODE` resolver (`live` fails closed). Live wiring → Category 5 (D2-1.11a).

Inherited landmines: **CR-D2 / CR-D10 / CR-D11-1.10 Closed by [edit]**; CR-D3 / CR-D6-1.10 (cross-language ms-precision + hex format) remain deferred (v1 is JS-only — no gold-plating). Per [[feedback_closure_language_precision]], new deferrals (D1–D5-1.11a) are Resolved via explicit deferral with recorded triggers.

Notable: the on-demand endpoint reuses the SAME `verifyAuditChain` @twt/jobs ships → **apps/api now depends on @twt/jobs** (workspace dep added; the jobs barrel exports only the integrity surface, so no GCS SDK is pulled into apps/api). Gate is `requireAdminSession` only (NOT `requirePermissionHook` — a GLOBAL route has no `scopeTx`); RBAC `audit.verify` upgrade deferred (D4-1.11a). The `/p/:pariwarId/audit/verify-probe` placeholder was left in place. No writes to `audit_log_entries` (read-only against the chain); `verifyChainSegment`/`computeAuditHash` unchanged.

### File List

**Added**
- `packages/domain/src/schema/audit_integrity_checks.ts`
- `packages/domain/src/policies/audit-integrity-checks-rls.ts`
- `packages/domain/migrations/0008_audit-integrity-checks.sql` (+ `meta/0008_snapshot.json`, `meta/_journal.json` entry)
- `packages/domain/migrations/0009_audit-integrity-checks-rls.sql` (+ `meta/0009_snapshot.json`, `meta/_journal.json` entry)
- `apps/jobs/src/audit/integrity-check.ts`
- `apps/jobs/src/audit/integrity-observability.ts`
- `apps/jobs/src/audit/integrity-cli.ts`
- `apps/jobs/tests/audit/integrity-check.test.ts`
- `apps/api/src/modules/audit-log/index.ts`
- `packages/contracts/src/audit/integrity-check.ts`
- `.github/workflows/nightly-integrity.yml`

**Modified**
- `packages/domain/src/schema/index.ts` (register `audit_integrity_checks`)
- `packages/domain/src/policies/index.ts` (register the RLS policy module)
- `apps/jobs/src/index.ts` (export the integrity surface for apps/api)
- `apps/jobs/src/audit/cli.ts` (post-mirror integrity hook)
- `apps/jobs/package.json` (`audit:verify-integrity` script)
- `apps/api/package.json` (add `@twt/jobs` workspace dep)
- `apps/api/src/server.ts` (register the audit-log module)
- `packages/contracts/src/audit/index.ts` (export the integrity-check contract)
- `packages/contracts/scripts/emit-openapi.ts` (register components + the served path)
- `packages/contracts/tests/type-assignability.test.ts` (audit-integrity assignability + parse tests)
- `openapi/v1.yaml` (re-emitted)
- `.github/workflows/ci.yml` (integration-tests filter += `@twt/jobs`)
- `_bmad-output/implementation-artifacts/deferred-work.md` (Story 1.11a section)
- `.decision-log.md` (Decision 2026-06-14-047)
- `apps/jobs/README.md` + `packages/domain/README.md` (new sections)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status → review)

## Change Log

| Date       | Version | Description                                                                                                  | Author |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 2026-06-14 | 0.1     | Story 1.11a author-commit — audit-log integrity-verification primitive (Tasks 1–12; AC-1…AC-6). DD-1…DD-5 resolved per recommendations (Decision 2026-06-14-047). | BigDev (Opus 4.8) |
