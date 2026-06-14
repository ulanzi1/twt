# Story 1.10: Tamper-Evident Audit Log + Hash Chain + 6h Off-Site Mirror

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Trustee Panel**,
I want **every privileged action to emit a tamper-evident audit log line with hash chaining, hot-persisted to Postgres and 6-hourly mirrored to a Cloud Storage Object-Retention-Locked bucket in a separate IAM tenancy**,
so that **no post-hoc modification of admin actions is possible without detection**.

`[PRIMITIVE]` — this is a substrate story. It ships the `audit_log_entries` table, the hash-chain writer primitive, the append-only + RLS enforcement, the 6h mirror job, and the IaC for the isolated mirror project. The **integrity-check job that walks the chain is Story 1.11a** (do NOT build it here); the **trustee-facing verification UI is Story 1.11b**. Story 1.10's job is to produce a chain that 1.11a can verify and a mirror that 1.11a/quarterly attestation can trust.

## Acceptance Criteria

**From epics.md L1160–1171 (verbatim source):**

**Given** FR-47 + AR-9/10 (audit log + hash chain + off-site mirror) + the architectural-freeze immutability property (table row 5)
**When** the audit log primitive is authored
1. **AC-1** — Every audit line carries `audit_id`, `pariwar_id`, `actor_id`, `actor_role`, `action`, `resource_locator`, `request_payload_hash`, `response_status`, `prev_audit_hash`, `audit_hash` (= hash of `prev_audit_hash` + this row's content), `recorded_at`.
2. **AC-2** — Writes are append-only enforced at the DB layer (no UPDATE / DELETE on the audit table).
3. **AC-3** — A 6-hourly job replicates new audit lines to a Cloud Storage bucket with Object Retention Lock in a **separate GCP project** (per Isolation Commitment §2.10a).
4. **AC-4** — The mirror's destination project has **no inbound IAM grants** from the primary project; the mirror credential is a **one-way push**.

**Given** the audit log accumulates over time
**When** the integrity-check primitive (Story 1.11a) verifies the hash chain
5. **AC-5** — Any broken chain link is detectable and the offending row identifiable. (Story 1.10 produces the verifiable chain + the shared `verifyChainSegment` pure helper; Story 1.11a builds the job that walks it.)

**Derived acceptance criteria (load-bearing for "system still works end-to-end"):**

6. **AC-6** — The hash chain is computed **in TypeScript via the single `canonicalJsonStringify`** (architecture §1.5 L898–902: "one library, one version across all consumers… divergent canonicalization is a build-time error"). **No plpgsql hashing.** Algorithm is **SHA-256** (§1.5 L888).
7. **AC-7** — The existing audit **seams** left explicitly for this story are wired to the real sink: the apps/api `AuthAuditSink` (D2-1.9), the `rbac/check.ts` `onAuthorizationDenied` denial seam (D2-1.8, flows through the same sink), the `KmsProvider.auditHook` (D10-1.5), and `runAsCrossTenant`'s cross-tenant audit emission (D5-1.6 / D2-1.6 — re-keyed off the `events_log` placeholder onto `audit_log_entries`).
8. **AC-8** — Tenant **reads** of `audit_log_entries` are RLS-isolated by `pariwar_id` exactly like `events_log` (Story 1.6 invariant: every table `twt_app` touches is RLS-forced). The hash-chain **writer** runs under the BYPASSRLS service role so it can read the true global tail across tenants (D9-1.6).
9. **AC-9** — `pnpm turbo run lint typecheck test build` is green; `pnpm db:migrate` + `pnpm db:check` succeed and are idempotent on re-run; the live-DB integration suite (`tests/integration/audit-log/integrity-check.spec.ts` slot, D13-1.2) passes including a **synthetic tamper test** that breaks the chain and confirms the break is localizable.

---

## CRITICAL DESIGN DECISIONS — resolve these FIRST (they shape every task)

These are genuine forks the prior stories deliberately deferred to you (see deferred-work.md). Each has a **recommended** path; deviate only with a recorded rationale in the author-commit + a Decision-log entry.

### DD-1 — Canonical-JSON cycle (deferred D13-1.5). **RECOMMENDED: move `canonical-json.ts` into `@twt/domain`, re-export from `@twt/events`.**

The hash chain needs `canonicalJsonStringify`. It currently lives in `@twt/events`. The audit table + writer must live in `@twt/domain` (it owns the schema, and the domain-level producers — `KmsProvider.auditHook` in `packages/domain/src/encryption/`, `runAsCrossTenant` in `packages/domain/src/cross-tenant/` — are *inside* `@twt/domain` and must call the writer). But `@twt/events` already depends on `@twt/domain` (`events-log.ts` imports `Db` + `schema`), so `@twt/domain` importing `@twt/events` is a **layering inversion + turbo task-graph cycle** (the exact trap `runAsCrossTenant` documents at its top, and that D13-1.5 analyzes).

**Resolution (D13-1.5 option a):**
- Move `packages/events/src/canonical-json.ts` → `packages/domain/src/canonical-json.ts` (it has zero `@twt/events`-internal deps — pure function).
- `@twt/events` re-exports it: `export { canonicalJsonStringify } from '@twt/domain'` (or keeps a thin re-export shim) so **no existing `@twt/events` consumer changes**. `@twt/events`→`@twt/domain` edge already exists; no new cycle.
- The audit writer + the KMS hook + the cross-tenant emitter all import `canonicalJsonStringify` from within `@twt/domain` — no cycle.
- Update `packages/events/tests/canonical-json.test.ts` import path (or leave it testing the re-export).
- This also subsumes D13-1.5's other open consumer: `packages/domain/src/encryption/canonical-context.ts` (`encryptionContextAad`) can now delegate to the shared canonicalizer instead of its scoped copy (optional cleanup; not required by AC).

Alternative if you refuse to move files: a new `@twt/canonical-json` leaf workspace consumed by both (D13-1.5 option b) — heavier (new package scaffold) for the same effect. **Do not** put the writer in a new `@twt/audit` package that depends on `@twt/domain`: the domain-level producers (KMS hook, cross-tenant) could then not call it without re-introducing the cycle.

### DD-2 — Chain topology + write serialization. **RECOMMENDED: single GLOBAL chain, serialized by a transaction-level advisory lock, written under the BYPASSRLS service role.**

The architecture (§1.5 "hash chain computed at insert time") and the AC (`prev_audit_hash` → `audit_hash` linked list) describe **one** monotonic chain, not per-tenant chains. A single chain is what makes "no privileged action anywhere is modifiable without detection" true globally and what the 1.11a job + Merkle-root publication assume.

- Add a monotonic `seq` ordering column: `seq bigint GENERATED ALWAYS AS IDENTITY` (DB-authoritative ordering, independent of `recorded_at` clock skew). The chain is ordered by `seq`.
- Serialize the read-tail-then-insert with `pg_advisory_xact_lock(<well-known bigint key>)` held for the writer transaction. This closes the **W8-CR1.6** hot-row contention concern (no shared sentinel row; the lock is the serialization point) and guarantees `prev_audit_hash` always references the true current tail.
- The writer reads the current tail (`SELECT audit_hash, seq FROM audit_log_entries ORDER BY seq DESC LIMIT 1`) **across all tenants** → must run under the **service role with BYPASSRLS** (DD-3). Genesis row: `prev_audit_hash = NULL` (or the well-known all-zero string — pick one, document it, and make `verifyChainSegment` agree).
- **`audit_hash` is computed in TS** (AC-6): `audit_hash = sha256_hex( prev_audit_hash_or_genesis || canonicalJsonStringify(rowContent) )`. Define `rowContent` as the canonical projection of the chained fields **excluding** `audit_hash` itself and excluding non-deterministic/DB-assigned-after-hash fields you don't want in the digest — **write this projection down once** in a single `auditRowDigestInput(entry)` function and use it in BOTH the writer and `verifyChainSegment`. Drift here is the classic chain bug.

Per-tenant chains are a valid alternative but weaken the global tamper-evidence story and complicate Merkle-root publication; only choose them if you record why.

### DD-3 — Production service role with BYPASSRLS (deferred D9-1.6, W2-CR1.6). **RECOMMENDED: wire a real `twt_service` login role + a separate service pool now — Story 1.10 is the first true consumer.**

The audit writer (DD-2) and `runAsCrossTenant` (already, for its `SET LOCAL row_security = off`) both need to escape tenant RLS. Today `twt_service` is a NOLOGIN group with an INSERT grant but **no permissive policy → deny-all in practice** (W2-CR1.6), and in dev/CI everything works only because `twt_dev_app` is a superuser. Against Cloud SQL prod that breaks.

- Migration: keep the existing `twt_service` group; production gets a **distinct login role member of `twt_service` carrying BYPASSRLS** (the migration documents this; the actual prod credential is provisioned via Terraform/Secret Manager — live apply deferrable like Story 1.5 D1-1.5, but the *shape* lands here).
- `createDb`/deps: expose a **service pool** (second `pg.Pool` bound to the service-role connection string) alongside the app pool. The audit writer takes the service pool; `runAsCrossTenant` gains the `servicePool` parameter D9-1.6 predicted. In dev/CI the service connection string falls back to the same superuser URL (documented), so tests stay green.
- Add the migration comment W2-CR1.6 asked for (why `twt_service` has grants but no policy).

### DD-4 — Partitioning / `pg_partman` (deferred W16). **RECOMMENDED: ship non-partitioned now with native-partition-ready DDL; record the W16 verification result; defer partitioning to a scale story.**

W16 requires you to **verify whether `pg_partman` is available on Cloud SQL Postgres 16 in `asia-south1` and record the result in the Story 1.10 author-commit.** Run `SELECT * FROM pg_available_extensions WHERE name = 'pg_partman';` against the live instance (or check the Cloud SQL supported-extensions/flags list) and write the answer into deferred-work.md / the decision log.

- Native declarative partitioning (`PARTITION BY RANGE (recorded_at)`) is **core Postgres** — it does NOT need `pg_partman` (pg_partman only *automates* partition maintenance). `events_log` (Story 1.3) is **not partitioned**, so there is precedent for shipping the substrate unpartitioned.
- **Recommendation:** ship `audit_log_entries` non-partitioned in 1.10 (dev-scale; 170M-row sizing is a Category-5/scale concern per §1.5 P2 deferral), keep the table partition-ready, and add a deferred item for partitioning. **Note the hash chain + advisory-lock writer is partition-agnostic** (the chain is over `seq`, not over partitions), so deferring is safe.
- If you do verify `pg_partman` present and choose to partition now, the global `seq` IDENTITY + the unique index must remain global (include the partition key per PG's partitioned-unique-index rule) — extra complexity for no v1 benefit. Prefer deferral.

### DD-5 — 6h scheduling mechanism (pg-boss is Story 1.12). **RECOMMENDED: ship the mirror as a pure push function + CLI/HTTP entrypoint in `apps/jobs/audit/`; commit Cloud Scheduler→HTTP trigger in IaC; wire pg-boss cron when Story 1.12 lands.**

`pg-boss` (the architecture's job-queue, §1.7) is **not installed yet — it's Story 1.12** (deferred D3-1.5). So you cannot register a pg-boss cron in 1.10.

- Implement the mirror push as a deterministic function `pushNewAuditLinesToMirror(...)` in `apps/jobs/src/audit/` that: reads audit rows since the last-mirrored `seq` watermark, serializes them (canonical, append-only object-name pattern matching the chain sequence per §1.5 L876–878), and pushes to the GCS bucket via a write-only SA. Persist the watermark (a tiny `audit_mirror_state` row or a GCS marker object).
- Expose it via a CLI entrypoint (`apps/jobs/audit/`) + a test-invocable export. The **6-hourly cadence** is wired by Cloud Scheduler → an authenticated HTTP trigger (committed in Terraform), OR deferred to pg-boss cron at Story 1.12 — pick one and record it. Either way the AC-3 "6-hourly job replicates new audit lines" is satisfied by the function + the committed schedule mechanism; live `terraform apply` is deferrable (Story 1.5 D1-1.5 precedent).
- The GCS client SDK (`@google-cloud/storage`) is a new dependency for `apps/jobs` — add it; the local/CI path uses a **fake mirror adapter** (write to a temp dir or an in-memory map) behind a `MirrorTarget` interface, exactly like the `KMS_TEST_MODE` fake/live split in `apps/api/src/deps.ts`. Do not require live GCS for tests.

---

## Tasks / Subtasks

> Branch from local `main` HEAD (currently `156a5b1`, Story 1.9). Commit manually (selective stage), per [[project_story_automator_ops]]. Next migration number is **0006** (0000–0005 exist; journal at `packages/domain/migrations/meta/_journal.json`).

- [x] **Task 1 — Resolve canonical-JSON home (DD-1) (AC: 6)**
  - [x] 1.1 Move `packages/events/src/canonical-json.ts` → `packages/domain/src/canonical-json.ts`; update `packages/domain/src/index.ts` to export `canonicalJsonStringify` + `CanonicalJsonValue`.
  - [x] 1.2 In `@twt/events`, re-export from `@twt/domain` so `packages/events/src/index.ts` public surface is unchanged. Update/relocate `packages/events/tests/canonical-json.test.ts` accordingly (keep the RFC-8785 cases — they are load-bearing). **Done via thin re-export shim at `packages/events/src/canonical-json.ts` (events index + its test unchanged → events stays 10 canonical tests / 31 total green); authoritative RFC-8785 suite co-located at `packages/domain/tests/canonical-json.test.ts` (12 cases, +BigInt/undefined/Date).**
  - [x] 1.3 Verify no new turbo cycle: `pnpm turbo run build` clean; `@twt/events`→`@twt/domain` remains the only edge between them. **Verified: 14/14 build green; domain canonical-json has zero imports; only edge is the shim's events→domain re-export (pre-existing).**
  - [~] 1.4 (Optional) Point `encryption/canonical-context.ts` at the shared canonicalizer (D13-1.5 cleanup). **DEFERRED (explicit): not AC-required and `canonical-context.ts` defines `encryptionContextAad` (a scoped AAD helper), NOT a second `canonicalJsonStringify` — so the "exactly one canonicalizer" guardrail is already satisfied. Re-pointing it would re-derive AES-256-GCM AAD bytes; an unintended byte difference would make stored Tier-1/Tier-2 PII undecryptable. Asymmetric risk for zero AC benefit → left untouched; recorded in deferred-work D13-1.5.**

- [x] **Task 2 — `audit_log_entries` Drizzle schema (DD-2, DD-4) (AC: 1)**
  - [x] 2.1 New `packages/domain/src/schema/audit_log_entries.ts` following the `events_log.ts` discipline (snake_case columns / camelCase TS fields; header comment citing architecture §1.5 + AR-9/10 + freeze-table row 5). All 11 AC-1 columns + `seq` (`.generatedAlwaysAsIdentity()`, mode:number) + `traceId`. `pariwarId` branded `PariwarId`; `actorId` plain uuid (audit actors include non-user system actors).
  - [x] 2.2 Indexes: `uniqueIndex` on `seq`; `uniqueIndex` on `auditHash` (a duplicate hash is a tamper/bug signal); tenant read index on `(pariwarId, recordedAt)` and `(pariwarId, seq)`. A `check` that `seq >= 1`. **All added.**
  - [x] 2.3 Register in `packages/domain/src/schema/index.ts`. **Done.**
  - [x] 2.4 Decide + document the genesis convention (NULL vs all-zero `prevAuditHash`) in the schema header. **Decided: genesis stores `prev_audit_hash = NULL` in-column; the HASH INPUT feeds the `GENESIS_PREV_HASH` sentinel (64 hex zeros) for determinism. Writer + `verifyChainSegment` both resolve `prev_audit_hash ?? GENESIS_PREV_HASH`. Documented in the schema header + `audit/hash-chain.ts` (single home of the constant).**

- [x] **Task 3 — Migration 0006: table + append-only triggers (DD-2) (AC: 1, 2)**
  - [x] 3.1 `pnpm db:generate` to emit the table DDL, then hand-supplement (the established `events_log` migration-0001 pattern — `db:generate` does NOT emit triggers). Add the `⚠ DO NOT REGENERATE` header. **Done; IDENTITY DDL emitted cleanly.**
  - [x] 3.2 Append-only triggers: `BEFORE UPDATE / DELETE / TRUNCATE` → `RAISE EXCEPTION` (mirror `events_log_reject_mutation`; name it `audit_log_entries_reject_mutation`). ERRCODE `integrity_constraint_violation`. This is AC-2. **Done + live-verified: all three triggers RAISE (TRUNCATE on empty table; UPDATE/DELETE after INSERT).**
  - [x] 3.3 Keep table-create + triggers in the **same migration** for per-migration atomicity (§1.8 L1003–1005), idempotent on re-run. **Verified: db:migrate is a clean no-op on re-run; db:check green.**
  - [x] 3.4 Confirm `pg_partman` verification (DD-4 / W16) and record the result; ship non-partitioned unless you have a recorded reason to partition. **W16 verified: `SELECT … FROM pg_available_extensions WHERE name='pg_partman'` returns EMPTY on the local postgres:16-alpine image; pg_partman IS on the Cloud SQL for PostgreSQL supported-extensions list (PG 12-16). Shipping NON-PARTITIONED (DD-4): native declarative partitioning is core PG and needs no pg_partman; the chain is over `seq` not partitions, so the writer is partition-agnostic. Recorded for deferred-work/decision-log in Task 11.**

- [x] **Task 4 — Migration 0007: RLS + service-role wiring (DD-2, DD-3) (AC: 8)**
  - [x] 4.1 New `packages/domain/src/policies/audit-log-entries-rls.ts` (mirror `events-log-rls.ts`): a `pgPolicy` SELECT tenant-isolation policy `TO appRole` using the `nullif(...)::uuid` construct. Link to `auditLogEntries`. Add to `policies/index.ts` and ensure the `drizzle.config.ts` `*-rls.ts` glob picks it up. **Done — SELECT-only (no write policy: tenants never write audit lines). db:generate picked it up via the existing glob.**
  - [x] 4.2 Migration 0007 (hand-supplement around drizzle-emitted ENABLE RLS + CREATE POLICY, mirroring 0002): `GRANT SELECT … TO twt_app`; `GRANT INSERT, SELECT … TO twt_service`; `ENABLE` + `FORCE ROW LEVEL SECURITY`; the BYPASSRLS self-test for `twt_app`. **W2-CR1.6 explanatory comment added.** Catalog-verified: relrowsecurity=t, relforcerowsecurity=t, policy present (cmd=SELECT), twt_app=SELECT / twt_service=INSERT,SELECT.
  - [x] 4.3 Reads under `twt_app` tenant-scoped; writer path is service-role (Task 6). DD-3 production service-login-role documentation added to the migration header; live credential is Terraform/Secret-Manager (Task 8), apply-deferrable. **Correctness note: the 0007 self-test asserts ONLY twt_app NOBYPASSRLS — the prod twt_service-login MEMBER intentionally carries BYPASSRLS (the twt_service GROUP NOBYPASSRLS is already asserted by migration 0002).**

- [x] **Task 5 — `verifyChainSegment` + digest projection (DD-2) (AC: 5, 6)**
  - [x] 5.1 In `@twt/domain` (`packages/domain/src/audit/hash-chain.ts`): `auditRowDigestInput(entry)` — the single canonical projection of chained fields. **Includes auditId, pariwarId, actorId, actorRole, action, resourceLocator, requestPayloadHash, responseStatus, recordedAt (ISO), traceId. EXCLUDES audit_hash (output), prev_audit_hash (folded as the hash PREFIX per DD-2's formula — avoids double-representation drift), and seq (DB-assigned GENERATED ALWAYS; unpredictable pre-INSERT since sequence values are consumed on rollback — DD-2 sanctions excluding DB-assigned-after-hash fields; chain order is enforced by linkage and seq is the walk index).**
  - [x] 5.2 `computeAuditHash(prevHashOrGenesis, entry)` = `sha256_hex(prevHashOrGenesis + canonicalJsonStringify(auditRowDigestInput(entry)))`. **SHA-256 via Node crypto; uses the single @twt/domain canonicalizer. `GENESIS_PREV_HASH` = 64 hex zeros.**
  - [x] 5.3 `verifyChainSegment(rows)` — pure function: recomputes each `audit_hash`, checks linkage to `prevAuditHash`, returns `{ chainValid, firstBrokenSeq | null }`. Handles mid-chain segments (row[0] needn't be genesis). **16 exhaustive unit tests GREEN: genesis-only, N-row, mid-chain segment, mutated field, forged hash, deleted middle row (linkage break → correct firstBrokenSeq), reordered rows, first-break-wins on multi-tamper, empty segment.** Did NOT build the 1.11a job / `audit_integrity_checks` table.

- [x] **Task 6 — `writeAuditEntry` writer primitive (DD-2, DD-3) (AC: 1, 6, 8)**
  - [x] 6.1 `packages/domain/src/audit/write.ts`: `writeAuditEntry(servicePool, input)` — service-pool client, `BEGIN`, `pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_KEY)`, tail read (`ORDER BY seq DESC LIMIT 1`), `recordedAt` from DB `now()` (hashable + DB-authoritative), `computeAuditHash`, `INSERT ... RETURNING`, `COMMIT`. **`.strict()` Zod boundary closes W6-CR1.6: bounded lengths, dotted resource.action, `requestPayloadHash` constrained to SHA-256 hex (rejects raw-payload leak). Live-verified: poisoning inputs rejected; concurrent writers serialize into one valid chain.** Does not log secret material.
  - [x] 6.2 `packages/domain/src/audit/index.ts` barrel exporting `AUDIT_CHAIN_LOCK_KEY`, `writeAuditEntry`, `AuditEntryInput`, `auditRowDigestInput`, `computeAuditHash`, `verifyChainSegment` (+ `GENESIS_PREV_HASH`, types). `export * as audit from './audit/index.js'` added to `packages/domain/src/index.ts`.
  - [x] 6.3 Double-write to `events_log`? **NO — decided + documented in write.ts header.** `audit_log_entries` is the canonical, separately-retained, 6h-mirrored store. D3-1.3's `audit.*` registry leg is resolved by this (no entries; recorded for the decision log in Task 11).

- [x] **Task 7 — Wire the existing producers to the real sink (AC: 7)**
  - [x] 7.1 **Auth sink (D2-1.9):** real `AuthAuditSink` in `apps/api/src/audit/audit-log-sink.ts` (`createAuditLogSink`) maps `AuthAuditEvent` → `AuditEntryInput` (action=type, nil-sentinel pariwar fallback, status-by-outcome, context hashed never stored) and calls `writeAuditEntry(servicePool, …)`. **Never throws into the request path** (mapping try/catch + fire-and-forget `.catch`). Swapped into `createDeps`; tests keep CapturingAuditSink (`_setup.ts` adds `servicePool: pool` only). Auto-covers **D2-1.8** rbac `onAuthorizationDenied` + `scope.change`. 10 mapping unit tests green.
  - [x] 7.2 **KMS auditHook (D10-1.5):** `createKmsAuditHook` populates `KmsProvider.auditHook` (op → `kms.{encrypt_dek,decrypt_dek,compute_hmac}`) → `writeAuditEntry`. Wired in `createDeps` by mutating `encryptionDeps.kms.auditHook` (NOT buildEncryptionDeps → the test path + envelope/blind-index unit tests stay sink-free). Pure `kmsEventToAuditInput` unit-tested.
  - [x] 7.3 **Cross-tenant re-key (D5-1.6, D2-1.6, D9-1.6):** `runAsCrossTenant(pool, servicePool, ctx, fn)` emits into `audit_log_entries` via `writeAuditEntry` (events_log placeholder removed; `CROSS_TENANT_SENTINEL_UUID` retained + still exported). **W1-CR1.6 two-transaction split**: audit committed FIRST (durable + fails-closed) THEN the RLS-bypassed flow. Documented in the source header.
  - [x] 7.4 Updated `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`: `runAsCrossTenant` calls pass `servicePool`; audit assertion now reads `audit_log_entries`. **All 15 domain multi-tenant tests green.**

  > **Pre-existing baseline note (NOT a Story 1.10 regression):** apps/api `admin-auth.spec.ts` has **2** tests (lockout / logout) failing — Story-1.9 admin-auth behaviors (both run on the superuser app pool; nothing I touched). **Verified pre-existing on `main`.** Two RED HERRINGS were diagnosed and cleared: (a) ~12 early failures were STALE shared-DB state → fixed by a schema reset + re-migrate; (b) a 3rd "scoped-route 500" was a USAGE artifact of my manual `DROP SCHEMA public CASCADE` reset (which strips twt_app's default `PUBLIC` USAGE on schema public — the Story-1.6 deferred "USAGE ON SCHEMA" item), NOT present in CI's fresh Postgres container. Restoring `GRANT USAGE ON SCHEMA public TO PUBLIC` (matching initdb/CI) resolved it. Net: 2 genuine pre-existing api failures, out of scope for 1.10.

- [x] **Task 8 — Off-site mirror: job + IaC (DD-5) (AC: 3, 4)**
  - [x] 8.1 `apps/jobs/src/audit/mirror.ts`: `pushNewAuditLinesToMirror({ servicePool, target, watermark, batchLimit })` reads rows after the watermark (service pool → global chain), serializes one canonical-JSON line per FULL row, pushes ONE append-only object named `audit/segment-<minSeq>-<maxSeq>.jsonl` (seq zero-padded, §1.5 L876-878), advances the watermark. Added `@google-cloud/storage`, `@twt/domain`, `pg` (+ `@types/pg`, `tsx`) to `apps/jobs/package.json`; `pnpm install` done.
  - [x] 8.2 `MirrorTarget` interface + in-memory fake (rejects overwrite — models Object Retention Lock) + GCS impl (`gcs-mirror-target.ts`, dynamically imported in live mode only, `ifGenerationMatch:0` no-overwrite, simple upload). `WatermarkStore` interface + in-memory fake. `MIRROR_MODE` fake|live resolver mirroring `KMS_TEST_MODE`.
  - [x] 8.3 CLI entrypoint `apps/jobs/src/audit/cli.ts` (`pnpm --filter @twt/jobs audit:mirror`). **6-hourly mechanism recorded: deferred to pg-boss cron at Story 1.12** (pg-boss not installed yet); the function + CLI are the invocable unit; live apply deferrable. v1 watermark seeded from `AUDIT_MIRROR_SINCE_SEQ` (durable store lands with the cron).
  - [x] 8.4 **Terraform** `infra/gcp/audit-mirror.tf`: aliased provider for the **separate** `twt-audit-mirror` project; GCS bucket with **Bucket Lock** (`retention_policy`, 7-year) **+ Object Retention Lock** (`enable_object_retention`), PAP enforced, `prevent_destroy`; **write-only** SA (`audit-mirror-writer`); **authoritative** `objectCreator` binding = ONLY that SA (the "deny all other writers", §1.5 L885); AC-4 no-inbound-IAM + org-policy notes. `var.enable_retention_lock` defaults **false** (irreversibility guard, §5.2 L2968). Variables added; `infra/gcp/README.md` updated (resource table + landing-map row). Live apply deferred (D1-1.5).
  - [x] 8.5 §2.10a quarterly-attestation obligation documented: `docs/runbooks/audit-mirror-attestation.md` (the four Isolation-Commitment properties as pass/fail checks + chain-continuity + ledger entry).

- [x] **Task 9 — Contracts (D13-1.4) (AC: 1)**
  - [x] 9.1 `packages/contracts/src/audit/audit-log-entry.ts` — `AuditLogEntryContract` (`.strict()`, AC-1 wire shape + seq/traceId). `.gitkeep` removed; `audit/index.ts` barrel; registered in the contracts root index. **Registered as the OpenAPI `AuditLogEntry` component (no paths — reads are 1.11b); `openapi/v1.yaml` re-emitted (21491→22844 bytes) + `contracts:check-openapi-determinism` byte-stable.** `audit/README.md` updated (canonicalJsonStringify home `@twt/events`→`@twt/domain`; 1.10 leg marked landed; no type-shadowing discipline).
  - [x] 9.2 Standalone — NO base-type share with `EventLogContract` (distinct `seq`/`prevAuditHash`/`auditHash` columns); documented in the contract header; no import of `_common/event-log-contract.ts`. **D13-1.4 audit leg closed.** `tests/audit.test.ts` (4 tests: Drizzle-row parse, missing-pariwarId reject, `.strict()` extra-key reject, non-genesis accept) + a type-level assignability assertion (domain row wire-projection ⊑ contract type) — all green.

  > **Pre-existing baseline note (NOT a Story 1.10 regression):** `packages/contracts/tests/auth.test.ts` has 2 tests failing (`LoginRequest`/`PasswordResetConsumeRequest` use a `password:'pw'`/`'short'` that violates the schema's `.min(12)`) — a Story-1.9 test↔schema mismatch. **Verified by stashing all my changes: the same 2 fail on the clean tree (== main).** I touched neither file; my `pnpm install` only ADDED lockfile entries (0 deletions, zod unchanged at 3.25.76).

- [ ] **Task 10 — Tests (AC: 5, 9)**
  - [x] 10.1 Unit: `verifyChainSegment` / `computeAuditHash` exhaustive cases (16, `tests/audit/hash-chain.test.ts`); canonical-JSON re-export passes its moved test (events shim 10 + domain authoritative 12).
  - [x] 10.2 Integration `tests/integration/audit-log/integrity-check.spec.ts` (D13-1.2 slot): 8 live-Postgres tests — chain links valid, append-only triggers fire on UPDATE/DELETE/TRUNCATE, RLS read isolation (`SET LOCAL ROLE twt_app` + scope), **6-way concurrent writers serialize** (advisory lock → one valid chain), audit-poisoning rejected, and the **synthetic tamper** (AC-5/AC-9): out-of-band mutation (trigger disabled inside a ROLLBACK'd tx) → `verifyChainSegment` `chainValid=false` + correct `firstBrokenSeq`.
  - [x] 10.3 Mirror: 5 tests (`apps/jobs/tests/audit/mirror.test.ts`) — fake target overwrite-rejection, watermark store, env resolution, and live-DB push (watermark advance, seq-encoded append-only object naming, idempotent re-push).
  - [x] 10.4 Full gate: `pnpm turbo run lint typecheck build` **42/42 green**; `pnpm db:migrate` idempotent re-run + `pnpm db:check` green; `contracts:check-openapi-determinism` byte-stable. **Test gate — all NEW Story-1.10 tests green** (domain 196/1-skip, events 31, jobs 6, the new contracts audit 4 + apps/api sink 10). Only **4 PRE-EXISTING failures remain, all proven on `main`** (2 `contracts/auth.test.ts` `.min(12)` mismatch + 2 `apps/api/admin-auth.spec.ts` lockout/logout) — zero regressions from this story. Live-DB note: a manual local DB reset stripped twt_app's schema USAGE (Story-1.6 deferred item); restored `GRANT USAGE ON SCHEMA public TO PUBLIC` to match CI's fresh container.

- [x] **Task 11 — Closure bookkeeping (AC: 9)**
  - [x] 11.1 `deferred-work.md` — appended the Story 1.10 section: **Closed by [edit]** for D2-1.9, D2-1.8, D10-1.5, D5-1.6/D2-1.6, D9-1.6, D13-1.4(audit), D13-1.2, D7-1.3, D13-1.5(via move), D3-1.3(`audit.*` no-double-write), W16(verified), W1/W2/W6/W8-CR1.6; **Resolved via explicit deferral** with triggers for D1-1.10 (live terraform apply + lock), D2-1.10 (6h cron + watermark → pg-boss 1.12), D3-1.10 (prod SERVICE_DATABASE_URL), D4-1.10 (partitioning), D5-1.10 (canonical-context cleanup), W-USAGE-1.10. Per [[feedback_closure_language_precision]].
  - [x] 11.2 Decision-log entry **2026-06-12-046** (DD-1…DD-5 + W16). **ADR-0004** amended (canonical-JSON home move → `@twt/domain`, events re-exports). `contracts/audit/README.md` updated (`@twt/events`→`@twt/domain`) in Task 9.
  - [x] 11.3 READMEs: `packages/domain` (audit/ module + canonical-json.ts move + barrel note), `apps/jobs` (NEW — mirror job), `infra/gcp` (audit-mirror section, Task 8).
  - [x] 11.4 Story Status → `review`; `sprint-status.yaml` `1-10-…` → `review` with the dev-completion header.

---

## Dev Notes

### Source-of-truth references (cite these in code headers)

- **AC source:** `_bmad-output/planning-artifacts/epics.md` L1154–1171 (Story 1.10 block); L267–268 (AR-9, AR-10 defs); L522 (freeze-table **row 5** — the immutable/off-site/separate-tenancy/≥6h property: *"GCS Object Retention Lock is the v1 implementation, ADR-backed; the immutability + off-site + separate-tenancy property is architectural and holds across pivots"*); L980 (Epic-1 demoable closure + SM-1 demo beat C11).
- **Architecture §1.5** `architecture.md` L839–902 — two-tier audit store; **SHA-256** (L888); **single canonical-JSON** (L898–902); write-path scoping + restricted-IAM + cross-project isolation (L876–887); bounded undetectable audit-loss window (L891–896).
- **Architecture §2.10 / §2.10a** L1655–1698 — audit-mirror credential separation; the four Isolation-Commitment properties (compromise of prod creds ⇏ mirror modify; compromise of audit-read ⇏ prod access; sole-engineer creds ⇏ audit-write; controls survive routine IAM mistakes + quarterly attestation).
- **Architecture §5.2** L2948 — cold tier = Cloud Storage Bucket Lock + Object Retention Lock (Cohasset WORM-equivalent), 7-year per FR-47.
- **Cross-Cutting #2** L277–279 — every state transition emits a structured event; audit tamper-evident via hash chain + off-site WORM mirror replicated every 6h; mirror creds + check execution separable from sole-engineer access.
- **Naming** L3663–3677 (snake_case tables / camelCase TS); L3664 explicitly names `audit_log_entries` as a table example; L3719–3723 (contracts source transport types; no type-shadowing).

### Patterns to COPY (do not reinvent — checklist anti-pattern #1)

- **Append-only table + triggers:** `packages/domain/migrations/0001_events-log.sql` (the `events_log_reject_mutation()` BEFORE UPDATE/DELETE/TRUNCATE trigger trio + the `⚠ DO NOT REGENERATE` header + same-migration atomicity). Schema discipline: `packages/domain/src/schema/events_log.ts`.
- **RLS policy + role/grant/force/self-test migration:** `packages/domain/migrations/0002_events-log-rls.sql` + `packages/domain/src/policies/events-log-rls.ts` + `packages/domain/src/policies/_roles.ts` (`appRole`/`serviceRole` `pgRole().existing()` constants already exist). The `nullif(current_setting('app.pariwar_id', true), '')::uuid` construct is **load-bearing** — a bare `''::uuid` cast RAISES and aborts; copy the wrapper exactly (it's why Story 1.6 chose it).
- **Scope + transaction helpers:** `packages/domain/src/db.ts` — `setPariwarScope` (SET LOCAL needs an open tx), `withPariwarScope`, `bindScopedDb`, `UUID_REGEX`. The service pool you add (DD-3) parallels these.
- **Cross-tenant escape + audit emission to re-key:** `packages/domain/src/cross-tenant/run-as-cross-tenant.ts` (the `SET LOCAL row_security = off` + own-transaction-commit + the `randomUUID()` per-call stream that fixed the P1 race — preserve that property when re-keying to `audit_log_entries`).
- **Canonical JSON:** `packages/events/src/canonical-json.ts` (RFC-8785 JCS subset, SHA-256-feed-safe; per ADR-0004). You are MOVING this file (DD-1), not rewriting it.
- **KMS fake/live deps split:** `apps/api/src/deps.ts` `buildEncryptionDeps` (`KMS_TEST_MODE`) — model the `MIRROR_MODE` fake/live split (DD-5) and the real-sink swap on it.
- **Terraform substrate (shape now, apply later):** `infra/gcp/cloud-kms-dev.tf` (header citing architecture lines; `prevent_destroy` lifecycle; nullable SA email for deferred IAM; `_iam_member` additive not `_iam_binding`) + `infra/gcp/README.md` resource-table style.
- **Live-DB integration test rig:** `packages/domain/src/test-utils/integration-setup.ts` (`setupLiveDb`, per-test ROLLBACK isolation) + the Story 1.6 suites `tests/integration/rls/policy-regression.spec.ts` + `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (the `SET LOCAL ROLE twt_app` to shed dev-superuser pattern, and the "advisory-lock/own-commit tests can't use per-test ROLLBACK — assert `>= 1`" note).
- **Seam-injection precedent:** the AuthAuditSink itself (`apps/api/src/audit/audit-sink.ts`) tells you exactly what it expects 1.10 to do ("Story 1.10 swaps a real sink in via dependency injection WITHOUT touching auth code"). Honor that — do NOT touch the auth modules' emit call-sites; only add the sink impl + swap it in `deps.ts`.

### The exact seams you are filling (grep-verified)

| Seam | Location | What 1.10 does |
|---|---|---|
| `AuthAuditSink` default = console | `apps/api/src/audit/audit-sink.ts`; injected at `apps/api/src/deps.ts:90` | Add real sink → `writeAuditEntry`; swap in `createDeps` prod path (D2-1.9) |
| `scope.change` emit | `apps/api/src/middleware/scope-resolution/index.ts:57` | flows through the swapped sink — no change here |
| `onAuthorizationDenied` | `packages/domain/src/rbac/check.ts:97`; routed at `apps/api/src/modules/rbac/index.ts:92` | flows through the swapped sink (D2-1.8) |
| `KmsProvider.auditHook?` | iface `packages/domain/src/encryption/kms-provider.ts:38`; calls `envelope.ts:65,93`, `blind-index.ts:33` | populate hook → `writeAuditEntry` (D10-1.5) |
| cross-tenant audit placeholder | `packages/domain/src/cross-tenant/run-as-cross-tenant.ts:93` (direct `events_log` INSERT) | re-key to `audit_log_entries` + `servicePool` param (D5-1.6, D2-1.6, D9-1.6) |
| `event-log-contract.ts` consumer | `packages/contracts/src/_common/event-log-contract.ts` | substantive audit consumption (D13-1.4) |
| `audit/` contracts | `packages/contracts/src/audit/` (.gitkeep only) | author `AuditLogEntryContract` |

### Regression guardrails (what must NOT break)

- **`events_log` is untouched** except the canonical-JSON re-export (DD-1) — its public API, tests, RLS, and triggers stay as-is. Verify the `@twt/events` test suite (31 passing) stays green.
- **Tenant isolation is sacred (Cross-Cutting #1; any leak is P0).** `audit_log_entries` reads MUST be RLS-forced for `twt_app` (Story 1.6 invariant). Only the service-role writer bypasses RLS, and only to read the global chain tail — never to expose cross-tenant rows to a tenant request.
- **No secret material in audit lines** (the audit-sink header + §1.5): hash the request payload (`request_payload_hash`), never store it; reference OTP/session by hash/id, never plaintext.
- **One canonicalizer** (§1.5 build-time invariant): after DD-1 there must be exactly one `canonicalJsonStringify` definition in the repo. Grep to confirm no duplicate survives the move.
- **Idempotent migrations** (§1.8 L1003–1005): 0006 + 0007 must be no-ops on re-run; `pnpm db:migrate` twice in a row is clean. The BYPASSRLS self-test must fire if a role regresses.
- **Tests must not require live GCS or live Cloud SQL beyond the existing integration-tests CI job** (Postgres 16 service container). Mirror = fake target in CI.
- **turbo graph stays acyclic** — the DD-1 move is specifically to avoid the `@twt/domain`↔`@twt/events` cycle that `runAsCrossTenant` documents.

### Latest-tech notes

- `@google-cloud/storage` — current major is **v7** (Node 18+, ESM-friendly) as of Jan 2026; pin to the workspace Node (`.nvmrc` = 20.x; CI jobs hardcode `20.18.0`). Use the **resumable-upload-off / simple upload** path for small append objects; rely on bucket-level Object Retention Lock rather than per-object retention to keep the write SA's permissions minimal (objectCreator only). Object Retention Lock + Bucket Lock are **irreversible once locked** (§5.2 L2968 "Object Retention Lock misconfiguration prevention") — the Terraform must guard against accidentally locking a dev bucket; gate behind a `var.enable_retention_lock` defaulting false for dev.
- SHA-256 via Node `crypto.createHash('sha256')` — no external dep. Hex digest.
- `pg_advisory_xact_lock` — transaction-scoped, auto-released on COMMIT/ROLLBACK; pick a stable 64-bit key constant and document it.
- Drizzle `bigint GENERATED ALWAYS AS IDENTITY` — express via `.generatedAlwaysAsIdentity()` (drizzle-orm ^0.45) or hand-supplement in the migration if the schema API is awkward; `seq` is `mode:'number'` safe to 2^53 (events_log sets this precedent for `event_version`).

### Previous-story intelligence (Story 1.9 + the 1.5/1.6/1.8 chain)

- Story 1.9 landed the **apps/api Fastify framework** + the AuthAuditSink seam + the scope-resolution transaction-per-request middleware + `tests/integration/_setup.ts` capturing-sink rig. The real sink plugs into that machinery without touching it.
- Story 1.6 established the **RLS + service-role posture** and explicitly deferred D9-1.6 (service pool) + W2-CR1.6 (twt_service deny-all) + W8-CR1.6 (sentinel hot-row) + W1/W6-CR1.6 (cross-tenant audit hardening) to **this story**. The `runAsCrossTenant` deviation note (direct INSERT, not `appendEvent`, to avoid the cycle) is the template for how the audit writer relates to the schema it owns.
- Story 1.5 established the **fake/live provider split** convention + left the `KmsProvider.auditHook` seam (D10-1.5) and the **canonical-JSON-cycle analysis** (D13-1.5) for you.
- Story 1.3 left **D7-1.3** ("Story 1.10 commits the `audit_log_entries` table — SEPARATE from `events_log`… different retention + 6h off-site mirror + Object Retention Lock posture") and **D3-1.3** (`audit.*` registry entries only if you double-write to `events_log` — recommendation: don't).

### Project Structure Notes

- New files land in architecture-committed homes: `packages/domain/src/schema/audit_log_entries.ts`, `packages/domain/src/policies/audit-log-entries-rls.ts`, `packages/domain/src/audit/{write,hash-chain}.ts`, `packages/domain/src/canonical-json.ts` (moved), `packages/domain/migrations/0006_*.sql` + `0007_*.sql`, `apps/api/src/audit/audit-log-sink.ts`, `apps/jobs/src/audit/mirror.ts`, `infra/gcp/audit-mirror.tf`, `packages/contracts/src/audit/*.ts`, `tests/integration/audit-log/integrity-check.spec.ts`.
- **Variance from architecture worth noting:** the architecture's directory sketch shows `apps/jobs/audit/` (and §1.5 puts the *integrity-check* there). Story 1.10 ships the **mirror** job there; the integrity-check job is Story 1.11a. Both live under `apps/jobs/src/audit/`. The `apps/worker-audit/` graduation (credential-separability trigger, §Split Triggers) is **not** triggered yet — keep it in `apps/jobs/`.
- **Variance:** `events_log` is unpartitioned and `audit_log_entries` ships unpartitioned too (DD-4) despite §1.5's "daily partition" language — recorded as an explicit scale-deferral, not an oversight. The §1.5 partitioning is a P2-deferred sizing decision (L861–863) and pg_partman availability is the open W16.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.10] (L1154–1171); #AR-9/AR-10 (L267–268); #freeze-table-row-5 (L522); #Epic-1-demoable-closure (L980)
- [Source: _bmad-output/planning-artifacts/architecture.md#1.5-Audit-log-storage] (L839–902); #2.10-audit-credential-separation (L1655–1674); #2.10a-Isolation-Commitment (L1676–1698); #5.2-cold-tier (L2948, L2968); #Cross-Cutting-2 (L277–279); #Naming (L3663–3677, L3719–3723)
- [Source: packages/domain/migrations/0001_events-log.sql] append-only trigger pattern
- [Source: packages/domain/migrations/0002_events-log-rls.sql] RLS + role/grant/force/self-test pattern
- [Source: packages/domain/src/cross-tenant/run-as-cross-tenant.ts] cycle-avoidance + cross-tenant audit emission to re-key
- [Source: packages/events/src/canonical-json.ts] the canonicalizer being moved (DD-1)
- [Source: apps/api/src/audit/audit-sink.ts] the AuthAuditSink seam + its 1.10 contract
- [Source: apps/api/src/deps.ts] the fake/live + sink injection site
- [Source: infra/gcp/cloud-kms-dev.tf + README.md] the IaC-shape-now-apply-later pattern
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] D2-1.9, D2-1.8, D10-1.5, D13-1.5, D7-1.3, D3-1.3, D13-1.4, D13-1.2, D5-1.6, D2-1.6, D9-1.6, W1/W2/W6/W8-CR1.6, W16

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) via bmad-dev-story workflow.

### Debug Log References

- Baseline (pre-implementation): `pnpm turbo run lint typecheck build` 42/42 green; live DB `twt-test-pg` (Docker postgres:16, 127.0.0.1:5433) at migration 0005 (6 applied).

### Completion Notes List

- **Task 1 (DD-1 canonical-JSON move):** Moved the canonicalizer to its single home `packages/domain/src/canonical-json.ts` (pure fn, zero imports); `@twt/domain` index exports `canonicalJsonStringify` + `CanonicalJsonValue`. `packages/events/src/canonical-json.ts` is now a thin re-export shim from `@twt/domain` — the events index + its test are unchanged, so the events surface and its 10 canonical tests (31 total) stay green and now exercise the re-export. Authoritative RFC-8785 suite co-located at `packages/domain/tests/canonical-json.test.ts` (12 cases). No turbo cycle (`@twt/events`→`@twt/domain` was already the only edge). Subtask 1.4 (re-point `encryption/canonical-context.ts`) deferred — optional, not AC-required, and re-deriving AES-GCM AAD risks making stored PII undecryptable; the "one canonicalizer" guardrail is already met.
- **Task 2 (schema):** `audit_log_entries` with all 11 AC-1 columns + `seq` (`.generatedAlwaysAsIdentity()`) + `traceId`; unique indexes on `seq` and `audit_hash`, tenant read indexes `(pariwar_id, recorded_at)` / `(pariwar_id, seq)`, `seq >= 1` check. Genesis convention documented (NULL in-column, `GENESIS_PREV_HASH` sentinel for hash input).
- **Task 3 (migration 0006):** Generated table DDL + hand-supplemented append-only triggers (`audit_log_entries_reject_mutation`, ERRCODE integrity_constraint_violation). Live-verified all three triggers RAISE. Idempotent, db:check green. W16/pg_partman verified (absent on local image; present on Cloud SQL) → shipping non-partitioned. **Migration-runner gotcha learned:** never regenerate an applied migration — drizzle skips by the journal `when` timestamp vs `__drizzle_migrations.created_at`, not the SQL hash; a regenerated newer `when` makes it re-apply (42P07). Restored 0006's `when` to the applied value.
- **Task 4 (migration 0007):** SELECT-only RLS policy (`audit-log-entries-rls.ts`) + hand-supplemented grants (twt_app=SELECT, twt_service=INSERT,SELECT), ENABLE+FORCE RLS, twt_app-only BYPASSRLS self-test, W2-CR1.6 + DD-3 service-login docs. Catalog-verified. Snapshots kept drizzle-native (siblings are); journal kept prettier-clean (committed convention).
- **Task 5 (hash-chain primitives):** Pure `auditRowDigestInput` / `computeAuditHash` / `verifyChainSegment` in `audit/hash-chain.ts`. prev_audit_hash is the hash PREFIX (chain link); seq excluded (DB-assigned, order via linkage). 16 unit tests cover genesis/N-row/mid-segment/mutation/forge/deletion/reorder/multi-tamper-first-wins.
- **Task 6 (writer):** `writeAuditEntry` advisory-lock-serialized global-chain writer (own-committing tx, service pool, Zod boundary). `audit/index.ts` barrel + `audit.*` namespace. No double-write to events_log (Task 6.3 / D3-1.3 resolved). 8 live-DB integration tests GREEN (= Task 10.2 slot): chain validity, poisoning rejection, append-only triggers, RLS isolation, 6-way concurrency serialization, synthetic-tamper localization with correct firstBrokenSeq.

### File List

- `packages/domain/src/canonical-json.ts` — NEW (moved from @twt/events; single canonicalizer home, DD-1).
- `packages/domain/src/index.ts` — MODIFIED (export canonicalJsonStringify + CanonicalJsonValue).
- `packages/domain/tests/canonical-json.test.ts` — NEW (authoritative RFC-8785 suite).
- `packages/events/src/canonical-json.ts` — MODIFIED (now a thin re-export shim from @twt/domain).
- `packages/domain/src/schema/audit_log_entries.ts` — NEW (Task 2 schema).
- `packages/domain/src/schema/index.ts` — MODIFIED (register audit_log_entries).
- `packages/domain/migrations/0006_audit-log-entries.sql` — NEW (table + append-only triggers; hand-supplemented).
- `packages/domain/migrations/meta/0006_snapshot.json` — NEW (drizzle-native).
- `packages/domain/src/policies/audit-log-entries-rls.ts` — NEW (Task 4 SELECT-only RLS policy).
- `packages/domain/src/policies/index.ts` — MODIFIED (register audit policy).
- `packages/domain/migrations/0007_audit-log-entries-rls.sql` — NEW (RLS + grants + force + self-test; hand-supplemented).
- `packages/domain/migrations/meta/0007_snapshot.json` — NEW (drizzle-native).
- `packages/domain/migrations/meta/_journal.json` — MODIFIED (idx 6 + 7; prettier-clean).
- `packages/domain/src/audit/hash-chain.ts` — NEW (Task 5: GENESIS_PREV_HASH, auditRowDigestInput, computeAuditHash, verifyChainSegment).
- `packages/domain/src/audit/write.ts` — NEW (Task 6: writeAuditEntry + AUDIT_CHAIN_LOCK_KEY + Zod boundary).
- `packages/domain/src/audit/index.ts` — NEW (audit barrel).
- `packages/domain/src/index.ts` — MODIFIED (canonical-json exports + `audit` namespace).
- `packages/domain/tests/audit/hash-chain.test.ts` — NEW (16 unit tests).
- `packages/domain/tests/integration/audit-log/integrity-check.spec.ts` — NEW (8 live-DB tests: chain validity, poisoning rejection, append-only triggers, RLS isolation, concurrency serialization, synthetic tamper).
- `packages/domain/src/cross-tenant/run-as-cross-tenant.ts` — MODIFIED (Task 7.3: re-key to audit_log_entries via writeAuditEntry + servicePool param + two-tx split; events_log INSERT removed).
- `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` — MODIFIED (Task 7.4: servicePool arg + audit assertion on audit_log_entries).
- `apps/api/src/audit/audit-log-sink.ts` — NEW (Task 7.1/7.2: createAuditLogSink + createKmsAuditHook + pure mappers authEventToAuditInput/kmsEventToAuditInput).
- `apps/api/src/context.ts` — MODIFIED (AppDeps.servicePool).
- `apps/api/src/deps.ts` — MODIFIED (service pool + real sink swap + KMS auditHook wiring).
- `apps/api/src/index.ts` — MODIFIED (service-pool teardown when distinct).
- `apps/api/tests/integration/_setup.ts` — MODIFIED (servicePool: pool for test deps).
- `apps/api/tests/unit/audit-log-sink.test.ts` — NEW (10 mapping + never-throw unit tests).
- `apps/jobs/package.json` — MODIFIED (deps: @google-cloud/storage, @twt/domain, pg; devDeps: @types/pg, tsx; audit:mirror script).
- `apps/jobs/src/audit/mirror.ts` — NEW (pushNewAuditLinesToMirror + MirrorTarget/WatermarkStore + in-memory fakes + MIRROR_MODE resolver).
- `apps/jobs/src/audit/gcs-mirror-target.ts` — NEW (live GCS adapter, no-overwrite).
- `apps/jobs/src/audit/cli.ts` — NEW (mirror CLI entrypoint).
- `apps/jobs/tests/audit/mirror.test.ts` — NEW (5 tests: fakes, env resolution, live-DB push/watermark/idempotency).
- `infra/gcp/audit-mirror.tf` — NEW (separate-project WORM bucket + write-only SA + authoritative objectCreator binding).
- `infra/gcp/variables.tf` — MODIFIED (audit_mirror_project_id, audit_mirror_bucket_name, audit_retention_seconds, enable_retention_lock).
- `infra/gcp/README.md` — MODIFIED (Story 1.10 mirror section + landing-map row).
- `docs/runbooks/audit-mirror-attestation.md` — NEW (§2.10a quarterly attestation).
- `pnpm-lock.yaml` — MODIFIED (new @twt/jobs deps; +141 lines, 0 deletions).
- `packages/contracts/src/audit/audit-log-entry.ts` — NEW (Task 9: AuditLogEntryContract).
- `packages/contracts/src/audit/index.ts` — NEW (audit contracts barrel).
- `packages/contracts/src/audit/.gitkeep` — DELETED.
- `packages/contracts/src/audit/README.md` — MODIFIED (canonicalizer home + 1.10 leg).
- `packages/contracts/src/index.ts` — MODIFIED (register audit barrel).
- `packages/contracts/scripts/emit-openapi.ts` — MODIFIED (register AuditLogEntry component).
- `openapi/v1.yaml` — MODIFIED (re-emitted with AuditLogEntry component).
- `packages/contracts/tests/audit.test.ts` — NEW (4 tests + type-assignability).

- **Task 9 (contracts):** `AuditLogEntryContract` `.strict()` standalone wire shape (no EventLogContract base — D13-1.4 closed), registered as the OpenAPI `AuditLogEntry` component (no paths; reads are 1.11b), determinism byte-stable. Contract test + type-assignability green. (2 pre-existing `auth.test.ts` failures verified on main — see Task 9 note.)

### Completion Notes (cont.)

- **Task 7 (wire producers):** Real `createAuditLogSink` + `createKmsAuditHook` (apps/api) map auth/KMS events → `writeAuditEntry` on a new `AppDeps.servicePool` (prod: separate BYPASSRLS `twt_service`-login via `SERVICE_DATABASE_URL`; dev/CI: reuses the app pool). Swapped in `createDeps` only — the test path (CapturingAuditSink, no KMS hook) is unchanged, so envelope/blind-index/auth unit tests stay sink-free. `runAsCrossTenant` re-keyed onto `audit_log_entries` with the W1-CR1.6 two-tx split. Verified: workspace typecheck green; domain suite 196/1-skip green (incl. re-keyed cross-tenant); apps/api 10 new mapping unit tests green; **zero new apps/api regressions** (the 3 admin-auth fails are pre-existing on main — see Task 7 note).
- **Task 8 (mirror + IaC):** `apps/jobs/src/audit/{mirror,gcs-mirror-target,cli}.ts` — `pushNewAuditLinesToMirror` + `MirrorTarget`/`WatermarkStore` ports + in-memory fakes + GCS adapter (`MIRROR_MODE` fake|live, dynamic GCS import). Append-only seq-encoded segment objects; no-overwrite enforced. 5 mirror tests green (incl. live-DB push/watermark/idempotency). `infra/gcp/audit-mirror.tf` commits the separate-project WORM bucket + write-only SA + authoritative objectCreator binding (AC-4), `enable_retention_lock` default-false irreversibility guard; README + variables updated; `docs/runbooks/audit-mirror-attestation.md` for §2.10a. Live apply + pg-boss 6h cron deferred. Full `lint typecheck build` 42/42 green.

### Review Findings

> Code review of domain layer chunk (2026-06-14). 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. 9 dismissed as noise/by-design.

- [x] [Review][Patch] `runAsCrossTenant` two-audit split: pre-audit with `responseStatus: 102`, outcome audit with actual status — Decision: option 2. Write `responseStatus: 102` (Processing) in the pre-audit; after `fn()` resolves or throws, write a best-effort outcome audit with `200` (success) or `500` (exception). Outcome audit uses `.catch(() => undefined)` so it never suppresses the original error. [`packages/domain/src/cross-tenant/run-as-cross-tenant.ts`] ✅ Applied

- [x] [Review][Patch] `seq` precision loss above 2^53 — `bigint('seq', { mode: 'number' })` silently loses precision when seq exceeds `Number.MAX_SAFE_INTEGER`. Added runtime assertion in `writeAuditEntry` after the RETURNING clause: throws with migration guidance. [`packages/domain/src/audit/write.ts`] ✅ Applied

- [x] [Review][Patch] `canonicalJsonStringify` throws opaque TypeError on Symbol — Added `typeof value === 'symbol'` guard with clear message, matching the BigInt treatment. [`packages/domain/src/canonical-json.ts`] ✅ Applied

- [x] [Review][Patch] `canonicalize()` throws confusing TypeError on `undefined` inside an array — Added undefined guard in the array-branch map with cast to `unknown[]`. [`packages/domain/src/canonical-json.ts`] ✅ Applied

- [x] [Review][Patch] `resourceLocator` silently truncated mid-UUID when `pariwarIds` list is long — Changed to throw when constructed string exceeds 1024 chars, with byte-count and guidance in the error message. [`packages/domain/src/cross-tenant/run-as-cross-tenant.ts`] ✅ Applied

- [x] [Review][Defer] `canonical-context.ts` is a second hand-rolled RFC 8785 implementation inside `@twt/domain` post-DD-1 — explicitly deferred in Task 1.4 (asymmetric risk: re-deriving AES-GCM AAD bytes risks making stored Tier-1/Tier-2 PII undecryptable). [`packages/domain/src/encryption/canonical-context.ts`] — deferred, pre-existing

- [x] [Review][Defer] `verifyChainSegment` single-row non-genesis segment has no programmatic signal that predecessor linkage is unverified — callers get `chainValid: true` but cannot distinguish "clean segment" from "content-verified, predecessor gap possible". A `predecessorLinkageVerified` field on `ChainVerificationResult` would close this for 1.11a. [`packages/domain/src/audit/hash-chain.ts`] — deferred, pre-existing

- [x] [Review][Defer] `timestamptz` ISO round-trip byte-stable only within JS/node-postgres — pg truncates microseconds to milliseconds; a future cross-language verifier (Go, Python) formatting `2023-11-14T22:13:20.123000Z` would fail every hash check. Millisecond-precision contract should be pinned in ADR-0004. [`packages/domain/src/audit/hash-chain.ts:auditRowDigestInput`] — deferred, pre-existing

- [x] [Review][Defer] Nil UUID (`00000000-...`) not rejected by `auditEntryInputSchema` for non-sentinel callers — a real pariwar provisioned with the nil UUID would see all cross-tenant sentinel audit rows via RLS. Fix belongs at the pariwar provisioning layer, not the audit boundary. [`packages/domain/src/audit/write.ts:auditEntryInputSchema`] — deferred, pre-existing

- [x] [Review][Defer] `Function` values in object properties silently serialize as `'{}'` in `canonicalJsonStringify`, diverging from `JSON.stringify` (which omits them) — no current caller exercises this path. [`packages/domain/src/canonical-json.ts:canonicalize()`] — deferred, pre-existing

> Contracts + OpenAPI chunk (2026-06-14). 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. 4 dismissed as false positives/by-design; 3 patched; 2 deferred.

- [x] [Review][Patch] `responseStatus` missing bounds in `AuditLogEntryContract` — `z.number().int()` accepts any integer; the domain writer enforces `min(100).max(599)`. Contract should reflect the invariant for tamper-detection at parse boundary. Added `.min(100).max(599)`; regenerated `openapi/v1.yaml` (picks up `minimum: 100, maximum: 599` automatically). [`packages/contracts/src/audit/audit-log-entry.ts:49`] ✅ Applied

- [x] [Review][Patch] `seq: 0` not tested — `z.number().int().min(1)` constraint was untested with a below-floor value. Added rejection test. [`packages/contracts/tests/audit.test.ts`] ✅ Applied

- [x] [Review][Patch] Optional fields only tested as null — `actorId`, `actorRole`, `traceId` had no positive test for non-null values. Added parse test asserting all three non-null fields are accepted and round-trip correctly. [`packages/contracts/tests/audit.test.ts`] ✅ Applied

- [x] [Review][False Positive] OAS 3.1 `format: uuid` alongside `type: [string, "null"]` — valid per JSON Schema 2020-12; format applies to string instances, is ignored for null; Blind Hunter flagged incorrectly

- [x] [Review][False Positive] Type-assignability assertion `pariwarId` cast — `as AuditLogEntryRow['pariwarId']` is correct; branded `PariwarId extends string` satisfies the unbranded contract field; direction is architecture-canonical (§1.3 L787-790)

- [x] [Review][False Positive] No chain-linkage test in contract tests — contract is stateless (per-entry parse); chain verification is `verifyChainSegment`'s domain (domain tests cover it)

- [x] [Review][False Positive] `additionalProperties: false` dropped by emitter — not dropped; `@asteasolutions/zod-to-openapi` preserves `.strict()` as `additionalProperties: false`; confirmed in emitted yaml

- [x] [Review][Defer] Hash field format not constrained in contract (`requestPayloadHash`, `auditHash`, `prevAuditHash` accept any `min(1)` string) — writer enforces `/^[0-9a-f]{64}$/i` at the write boundary; read contract intentionally permissive. Cross-language chain verifiers need the format pinned. **Trigger: Story 1.11a cross-language verifier / ADR-0004 amendment.** → CR-D6-1.10

- [x] [Review][Defer] `seq` missing `format: int64` in OpenAPI component — emitter emits `type: integer` with no format; code generators default to `int32` (max ~2.1B vs actual ceiling ~9×10¹⁵). **Trigger: Story 1.11b client SDK generation.** → CR-D7-1.10

> API layer chunk (2026-06-14). 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. All AC-7 / DD-3 / D2-1.9 / D10-1.5 PASS; 4 false-positive dismissals; 5 patches applied; 1 deferred.

- [x] [Review][Patch] Nested `Date` in `canonicalize()` silently produces `'{}'` — `Object.keys(new Date())` returns `[]`; two different Dates in object properties produce identical hashes. Added `instanceof Date` guard before the object branch (consistent with top-level guard wording). [`packages/domain/src/canonical-json.ts:canonicalize()`] ✅ Applied

- [x] [Review][Patch] `hashContext` throws on non-canonicalizable context → entire audit line silently dropped — now catches `TypeError`, logs a structured error, and falls back to `sha256Hex('{}')` so the audit line is still written. [`apps/api/src/audit/audit-log-sink.ts:hashContext`] ✅ Applied

- [x] [Review][Patch] `actorRole: ''` (empty string from context) fails Zod `min(1)` at write boundary → silent audit line drop — added guards: `typeof v !== 'string' || v.length === 0 || v.length > 128 → null`. [`apps/api/src/audit/audit-log-sink.ts:authEventToAuditInput`] ✅ Applied

- [x] [Review][Patch] `kmsEventToAuditInput` silently truncates `resourceLocator` with `.slice(0, 1024)` — domain P5 invariant (`runAsCrossTenant`) established throw-not-truncate; silent truncation corrupts the audit record of which key was used. Changed to throw with byte-count and guidance. [`apps/api/src/audit/audit-log-sink.ts:kmsEventToAuditInput`] ✅ Applied

- [x] [Review][Patch] No test for `rowKey`-absent KMS locator — missing branch confirming no stray `/undefined` or `/null` segment. Added test asserting `resourceLocator = 'kms:fake:admin-kek/admin_email'`. [`apps/api/tests/unit/audit-log-sink.test.ts`] ✅ Applied

- [x] [Review][False Positive] `login.logout` → `statusForAuthEvent` returns 200 — correct; logout is a successful operation, 200 is the HTTP-equivalent
- [x] [Review][False Positive] Fire-and-forget vs two-audit split — auth sink events are retrospective (record what already happened); two-phase split is only needed for `runAsCrossTenant` (pre-authorizes a future RLS-bypassed op). Fire-and-forget appropriate here.
- [x] [Review][False Positive] `servicePool` leak — `endPools()` in index.ts correctly guards all exit paths; test harness sets `servicePool: pool` (same ref)
- [x] [Review][False Positive] `createDb().db` discarded — no consequence; the `pool.on('error')` handler is attached to the pool object before return; `writeAuditEntry` creates its own per-call Drizzle instance

- [x] [Review][Defer] Non-UUID `actorId` string causes silent audit write failure — `AuthAuditEvent.actorId` is `string | null` with no UUID constraint; all current callers pass UUIDs, but a future caller with a non-UUID string would fail Zod at the writer and drop the line. **Trigger: any non-UUID auth actor introduction.** → CR-D8-1.10

> Jobs chunk (2026-06-14). 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. All AC-3/AC-4/DD-1/DD-5 PASS; 4 patches applied; 2 deferred; several false positives confirmed safe.

- [x] [Review][Patch] Permanent 412 wedge — in-memory watermark resets on every process start; second CLI invocation recomputes same `objectName` → 412 → stuck forever. Added `isAlreadyExistsError` helper and idempotent-already-exists handling in `pushNewAuditLinesToMirror`: "already exists" is treated as a deterministic idempotent success (same sinceSeq → same rows → same canonical bytes → same object), watermark still advances. [`apps/jobs/src/audit/mirror.ts`] ✅ Applied

- [x] [Review][Patch] `getBucket` permanently caches a rejected promise — transient GCS init error (bad credentials, import failure) permanently breaks the target. Added `.catch(() => { bucketPromise = null; })` so the next `putObject` call retries the init. [`apps/jobs/src/audit/gcs-mirror-target.ts:getBucket`] ✅ Applied

- [x] [Review][Patch] `AUDIT_MIRROR_SINCE_SEQ` validation too lenient — floats (1.5), scientific notation (1e20), and `''` were accepted silently or incorrectly. Changed to: use `||` to treat `''` same as absent, then validate `Number.isInteger && >= 0 && <= MAX_SAFE_INTEGER`; throw on invalid values. [`apps/jobs/src/audit/cli.ts`] ✅ Applied

- [x] [Review][Patch] `batchLimit: 0` silently produces `LIMIT 0` → zero rows → watermark never advances. Added guard: throw if `batchLimit <= 0`. [`apps/jobs/src/audit/mirror.ts:pushNewAuditLinesToMirror`] ✅ Applied

- [x] [Review][False Positive] GCS lazy init double-init race — not possible; JavaScript single-threaded event loop means the `if (!bucketPromise)` check and assignment are synchronous; no two callers can interleave them
- [x] [Review][False Positive] `PariwarId` brand in `serializeRow` — phantom type only; at runtime it's a plain string; `canonicalJsonStringify` serializes it correctly
- [x] [Review][False Positive] `padSeq(20)` insufficient — `Number.MAX_SAFE_INTEGER` is 16 digits; 20-char padding is correct for all representable values (writeAuditEntry throws before seq exceeds MAX_SAFE_INTEGER)

- [x] [Review][Defer] `recordedAt` → ISO string in JSONL; Story 1.11a verifier must reconstitute a `Date` before calling `verifyChainSegment` — undocumented runtime contract between mirror producer and chain verifier. **Trigger: Story 1.11a integrity-check job implementation.** → CR-D10-1.10

- [x] [Review][Defer] Seq gaps in segment files — PostgreSQL IDENTITY sequences are not gap-free (rolled-back txns burn seqs); segment files may span non-contiguous seqs. Story 1.11a verifier must not infer missing rows from segment-name gaps. **Trigger: Story 1.11a spec / verifier implementation.** → CR-D11-1.10

> IaC + Events chunk (2026-06-14). 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. All 8 AC checks PASS (separate project, write-only credential, overwrite blocked, 7y retention, live apply deferred, events shim correct, §2.10a isolation commitments, prevent_destroy + lock irreversibility documented). 2 patches applied; 6 false positives dismissed; 2 deferred.

- [x] [Review][Patch] `audit_retention_seconds` floor 1–2 days short — `7*365*86400 = 220752000` ignores leap years; a 7-year window spanning 2 leap years lands on the 7-year anniversary minus 2 days. Changed default and validation floor to `220924800` (7×365×86400 + 2 leap days = worst-case 7 calendar years). [`infra/gcp/variables.tf:audit_retention_seconds`] ✅ Applied

- [x] [Review][Patch] Google provider pin `~> 5.0` too broad for `enable_object_retention` — attribute added in hashicorp/google 5.10.0; operators running 5.0–5.9 hit `An argument named "enable_object_retention" is not expected here` at plan time. Tightened to `>= 5.10, < 6.0`. [`infra/gcp/versions.tf`] ✅ Applied

- [x] [Review][False Positive] Events shim backward compat — `@twt/domain` public `index.ts` exports both `canonicalJsonStringify` (value) and `CanonicalJsonValue` (type); shim re-exports are valid; `packages/events/src/index.ts` re-exports from the shim; full two-hop chain intact; 10 canonical-json tests pass through the shim
- [x] [Review][False Positive] Events behavioral parity — old events impl also threw on Symbol (native TypeError via Object.keys), undefined-in-array (native TypeError), and top-level Date; domain impl is strictly more explicit; no caller relied on lenient behavior; no regression
- [x] [Review][False Positive] `coalesce()` with empty bucket name — Terraform coalesce skips empty string same as null; `coalesce("", "twt-audit-mirror-${environment}")` correctly falls through to the default
- [x] [Review][False Positive] IAM binding `provider` attribute — `provider = google.audit_mirror` is required on `google_storage_bucket_iam_binding`; without it Terraform uses the primary project provider, which lacks authorization on the mirror-project bucket
- [x] [Review][False Positive] `enable_object_retention` + `retention_policy` coexistence — two distinct GCS features: `enable_object_retention` enables per-object WORM, `retention_policy` enforces a bucket-wide minimum retention period; both can coexist and the combination gives defense-in-depth per §5.2
- [x] [Review][False Positive] IAM binding authoritative gap window — `_iam_binding` is intentional (AC-4: purges any drifted-in principals on apply); 6h push cadence means a brief re-apply gap is detectable at the next mirror run; accepted per AC-4 posture

- [x] [Review][Defer] `prevent_destroy = true` unconditional on all environments — Terraform `lifecycle` blocks cannot be conditioned on input variables; same pattern as KMS resources in this repo. In dev/staging a `terraform destroy` requires removing the block from source. Operator escape-hatch documented as known obligation (same as KMS). **No code change available in HCL; document in runbook.** → CR-D12-1.10

- [x] [Review][Defer] Same region for mirror and primary (`var.region` defaulting to `asia-south1`) — reduces DR value if a regional GCS outage affects both. No `audit_mirror_region` variable to decouple. Acceptable for v1 (architecture §5.1 freezes asia-south1). **Trigger: Story 1.15 staging/prod expansion.** → CR-D13-1.10

> Docs chunk (2026-06-14). Inline review (108 lines, 2 files). 1 patch; 1 false positive dismissed; ADR-0004 amendment and attestation runbook both accurate.

- [x] [Review][Patch] Runbook referenced stale `220752000` floor in two places (step 4 gcloud comment + §4 verification checks) — P1-E raised the floor to `220924800`; both occurrences updated. [`docs/runbooks/audit-mirror-attestation.md:50,72`] ✅ Applied

- [x] [Review][False Positive] ADR-0004 amendment accuracy — correctly describes the DD-1 move: implementation at `packages/domain/src/canonical-json.ts`, authoritative tests at `packages/domain/tests/canonical-json.test.ts` (confirmed exists), shim at `packages/events/src/canonical-json.ts`, `encryption/canonical-context.ts` correctly distinguished as a scoped AAD helper not a second canonicalizer. No issues found.
