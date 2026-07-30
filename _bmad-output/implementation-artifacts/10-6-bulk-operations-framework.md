---
baseline_commit: f364a280a7e7befb5f3968774fe417f0b4d4c39c
---

# Story 10.6: Bulk Operations Framework — Dry-Run + Scope-Respecting + Audit Per-Item + 5k Cap + Dry-Run Parity Invariant `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder authoring the bulk operations primitive that admin surfaces consume,
I want a bulk operations framework with dry-run preview + scope-respecting + audit-per-item + 5k-item-per-batch cap + dry-run parity invariant,
so that every bulk admin action is previewable + auditable + scope-safe + capacity-bounded — and no consuming surface can bypass any of those guarantees.

## Scope Boundary (read first — prevents over-build)

**This is a `[PRIMITIVE]`, not a `[SURFACE]`.** Like Story 10.1 (helpdesk data-model + routing-policy registry), 10.6 authors a **domain framework + registry + contracts** that later `[SURFACE]` stories consume. Note: 10.1 itself *did* ship a thin `apps/api` route (the create-ticket primitive route) — only its admin console UI was deferred to 10.4. 10.6 goes further and ships **NO** `apps/api` route at all; that is *this story's own* scope choice (see the table below), not an inherited 10.1 pattern — it does **NOT** ship an admin UI, an `apps/api` route, or a single real production operation. You are building the harness that 10.10 (member moderation), 10.12 (custom fields), and the notification family will register operations into; you are **not** building those operations. If you find yourself writing a moderation mutator or a custom-field writer, STOP — that is the consuming surface's story.

**The single load-bearing commitment is the dry-run parity invariant** (Acceptance Criteria block 2, AC7). Everything else in FR-49 is real and testable, but the parity invariant is the reason this is a framework and not six copy-pasted bulk loops: **dry-run preview and execute share ONE evaluator code path**, so "looked fine in preview, silently failed in execute" is *structurally impossible*, not merely tested-against.

**You are wiring three already-shipped substrates + one new pure harness. Read these before starting:**
- **RBAC scope check** — `packages/domain/src/rbac/check.ts` (`checkPermission` — the non-throwing variant, `hasPermission`, `scopeContains`). PURE, fail-closed, deny-deeper geo resolver until Epic 3 ([[project_rbac_geo_scope_containment]]). This IS the per-item scope-respecting gate; do not re-implement scope logic.
- **Audit writer** — `packages/domain/src/audit/write.ts` (`writeAuditEntry`, `AuditEntryInput`). Single GLOBAL hash chain, self-committing, takes the SERVICE pool. Its `traceId` field is the batch-correlation slot ([[project_admin_display_name_attribution]] for actor attribution).
- **Idempotency keyed store** — `packages/domain/src/idempotency/keyed-store.ts`. AR-58 explicitly names "bulk admin operations" as a keyed-store consumer; execute is once-only per `batch_id`.
- Memory: [[project_helpdesk_primitive_substrate]] (the 10.1 primitive-story shape), [[project_contracts_domain_bundle_boundary]] (contracts must not import pg-touching domain), [[project_live_db_test_gotchas]], [[project_ci_local_concurrency_oversubscription]], [[project_domain_limit_clamp_and_savepoint_retry]].

| In scope (10.6) | Out of scope → owning story / seam |
|---|---|
| **NEW domain module `packages/domain/src/bulk-operations/`** — the pure harness: a single `bulkExecute(...)` entry point (dry-run flag), the `BulkOperation` contract, the operation **registry**, the shared per-item evaluator, 5k-cap enforcement, per-item scope check, per-item audit via an injected seam, aggregate counts, per-item outcomes, and CSV serialization (preview + error). | The **real operations** (`bulk_moderate` → likely 10.10; `bulk_update_custom_field` → likely 10.12; `bulk_send_notification` → the news/notification family) — *this operation→story mapping is inferred from naming, not epics.md-stated: neither 10.10's nor 10.12's AC text names these operations or references 10.6*. This story ships the harness + registry **seeded empty**; operations self-register in their own stories. A **test-only fixture operation** exercises the harness + the parity CI test. |
| **The dry-run parity invariant** (Load-Bearing Decision 1) — `bulkExecute` runs the SAME scope-check + evaluator code path in both modes; `dryRun` gates ONLY (a) whether `apply` runs and (b) whether audit is written. A CI test asserts **byte-identical per-item evaluation** for the same frozen inputs across the two modes. | — |
| **Concurrent-state divergence surfacing** — execute optionally accepts the preview's predicted per-item outcomes; where the execute-time evaluation diverges from the prediction, the item is flagged in `divergences[]` with the reason (concurrent state change). This is the ONLY sanctioned preview↔execute difference. | Snapshot/optimistic-locking of the whole target set → not required (the divergence surface is sufficient; over-build). |
| **5k-item-per-batch cap** enforced **in the harness** (fail-closed, structural — no consumer can bypass), configurable via a constant + injectable override. Over-cap → typed error carrying the counts, no partial execution. | — |
| **Per-item audit** on **execute only** (dry-run has NO side effects). One `writeAuditEntry` per executed item, carrying a shared `batch_id` in the `traceId` correlation slot (Load-Bearing Decision 3). The writer is an **injected seam** (`auditItem`) — domain stays service-pool-agnostic. | Wiring the seam to the real BYPASSRLS service pool → the consuming surface / `apps/api` composition root (this story ships the seam + a fixture sink for tests). |
| **CSV serialization** — pure `Record<string,string>[] → CSV string` helper + per-operation `csvRow` projection; the harness returns preview-CSV content (dry-run) and error-CSV content (execute) **synchronously in the result object**. | **Async generation + object-store persistence + one-time time-limited download URLs** → Story 10.7 (Reports & Exports Library, pg-boss + storage). 10.6 produces the CSV *bytes*; 10.7 owns durable download. |
| **Contracts DTOs** `packages/contracts/src/bulk-operations/` — `BulkExecuteRequest` (operation_type, target_set, dry_run), `BulkPreviewResponse` / `BulkResultResponse` (aggregate counts + per-item outcomes + csv), `BulkItemOutcome`. Pure-Zod, `.strict()`, snake_case wire, NO `@twt/domain` import. Register in `emit-openapi.ts` + regen `openapi/v1.yaml`. | — |
| **NO new RBAC key** (Load-Bearing Decision 2) — the framework is scope-*respecting*, not scope-*owning*: each registered operation declares its OWN `permissionKey` + `scopeDimension`, and the harness calls `checkPermission` per item against those. `bulk_claim_approval` being State-Trustee-gated (FR-49) is the *operation's* declaration, not the framework's. | Minting a `bulk.execute` umbrella key → rejected (Decision 2); authorization is per-operation, per-item. |
| **NO events_log vocabulary, NO projector, NO state-writer trigger, NO CI state-invariant gate** — the framework produces audit lines (Story 1.10 taxonomy), not domain events. It has no persistent state of its own (Load-Bearing Decision 4). | A `bulk_batches` table / batch-history read model → deferred; if a surface needs durable batch history, that is its call (10.7 territory). |
| Domain barrel export `export * as bulkOperations from './bulk-operations/index.js'` (the established `packages/domain/src/index.ts` namespace convention). Unit + live-DB tests + `pnpm ci:local` green. | — |

## Acceptance Criteria

**AC1 — The framework, the operation contract, and the registry.**
Given FR-49 + Story 1.8 RBAC + Story 1.10 audit,
When the bulk operations framework is authored in `packages/domain/src/bulk-operations/`,
Then a single entry point `bulkExecute(registry, operationType, targetSet, actorContext, ctx, options)` exists where `options` carries `{ dryRun: boolean, batchId, auditItem, expectedOutcomes?, cap? }` — **corrected post-review**: the shipped signature has 6 parameters, not 5; the `ctx: TContext` parameter (threading the operation's execution context into `evaluate`/`apply`) is functionally required and was omitted from this AC's original text, not from the implementation;
And a `BulkOperation<TItem, TContext>` contract defines what an operation contributes: `operationType` (string id), `permissionKey` (RBAC key), `scopeDimension` (`ScopeDimension`), `targetLocatorOf(item) → TargetLocator`, a PURE `evaluate(item, ctx) → ItemEvaluation` (the shared evaluator), an `apply(item, ctx) → Promise<void>` (the mutation, execute-only), and a `csvRow(item, outcome) → Record<string,string>` projection;
And a **registry** (`createBulkOperationRegistry()` → keyed by `operationType`) is seeded **empty** in v1 — an unknown `operationType` fails closed with a typed `UnknownBulkOperationError`; real operations register in their own stories (a **test-only fixture operation** proves the harness).

**AC2 — Dry-run preview: per-item outcome, aggregate counts, downloadable preview CSV, zero side effects.**
Given a caller invokes `bulkExecute(..., { dryRun: true })`,
When the framework runs,
Then it returns per-item evaluation results (`would_succeed | would_fail(reason) | skipped(reason)`), aggregate counts (`{ total, wouldSucceed, wouldFail, skipped }`), and a **preview CSV** string (one row per item via the operation's `csvRow`);
And **no `apply` runs and no audit line is written** — a dry-run is cancellable with zero side effects (FR-49 "cancel without side effects"); a test asserts the operation's `apply` mock is never called and the injected `auditItem` seam is never invoked in dry-run mode.

**AC3 — Scope-respecting: per-item RBAC validation, out-of-scope silently skipped with a returned count.**
Given each item in `targetSet` and the actor's effective grants in `actorContext`,
When the framework evaluates the batch (in EITHER mode),
Then each item is scope-validated via `checkPermission({ actorId, grants, key: op.permissionKey, resource: { dimension: op.scopeDimension, value: op.targetLocatorOf(item), pariwarId } })` (`packages/domain/src/rbac/check.ts`) BEFORE its `evaluate`/`apply`;
And an item outside the actor's scope is recorded as `skipped(reason: 'out_of_scope')` — excluded from the acted-on set and surfaced in the `skipped` count (FR-45 / FR-49 "items outside the actor's RBAC scope are silently excluded … with a count returned");
And the geo-tree containment resolver defaults to **deny-deeper until Epic 3** ([[project_rbac_geo_scope_containment]]) — a `state`-scoped actor's `district`-level items skip until a real resolver is injected; this is the same asymmetry 10.3/10.4/10.5 encoded, documented, not a bug.

**AC4 — Audit per item, shared batch_id, execute-only.**
Given `bulkExecute(..., { dryRun: false })`,
When each item is executed (or fails, or is skipped),
Then exactly one audit line is written per **processed** item via the injected `auditItem` seam, and every line in the batch carries the **same `batch_id`** in the `traceId` correlation slot of `AuditEntryInput` (Load-Bearing Decision 3 — there is no `batch_id` column; `traceId` IS the batch correlator), with `action = op.auditAction`, `resourceLocator` = the item locator, `requestPayloadHash` = a sha256 digest (never the raw payload — the `writeAuditEntry` `.strict()` boundary rejects a raw payload), and `responseStatus` reflecting the item outcome;
And the seam is **injected** (default: a no-op fixture sink for tests) — the domain harness never imports `pg` or the service pool; the consuming surface wires `auditItem` to `writeAuditEntry(servicePool, …)` at its composition root ([[project_helpdesk_responder_surface_104]] crypto/pool-boundary discipline).

**AC5 — 5k-item-per-batch cap, harness-enforced, fail-closed, configurable.**
Given the 5,000-item cap (FR-49, configurable),
When `targetSet.length` exceeds the cap,
Then `bulkExecute` throws a typed `BulkBatchCapExceededError` carrying `{ cap, actual }` **before any item is processed** (no partial execution, no audit, no apply — fail-closed) in BOTH modes; larger sets must be split by the caller;
And the cap is a named constant (`BULK_BATCH_CAP = 5000`) with an injectable override in `options` (so a Pariwar/config can lower it — never silently raise above the constant without an explicit override); the cap lives in the **harness** so no consuming surface can bypass it (structural, not an API-layer-only guard — **Load-Bearing Decision 6**, a deviation from epics.md's literal "enforced at the API layer" text, confirm before dev).

**AC6 — Error CSV downloadable on completion.**
Given an executed batch where some items failed or were skipped,
When execute completes,
Then the result carries an **error CSV** string listing every item that did NOT succeed (failed + skipped) with its reason (FR-49 "downloadable error CSV"); per-item failure does **not** roll back the batch — each `apply` runs independently and a thrown `apply` is caught, recorded as `failed(reason)`, and the batch continues (FR-49 "per-item failure does not roll back the batch");
And the CSV content is returned in-memory in the result object — durable/async/time-limited download is Story 10.7's concern (Scope Boundary), not this story's.

**AC7 — The dry-run parity invariant (this story's load-bearing commitment).**
Given dry-run preview and execute run against the same target set,
When both modes evaluate an item,
Then they share **identical evaluation semantics** — the SAME scope check and the SAME `op.evaluate` call, reached through ONE code path in `bulkExecute`; `dryRun` branches ONLY on (a) running `apply` and (b) writing audit, never on how an item is *evaluated*;
And the only acceptable preview↔execute divergence is an **explicitly surfaced concurrent-state change** between preview-time and execute-time (a member's state changed, a permission was revoked, an item was deleted): execute accepts the preview's `expectedOutcomes`, and any item whose execute-time evaluation differs from its predicted outcome is added to `divergences[]` with the reason;
And a CI test asserts **byte-identical evaluator output** for the same inputs at a fixed point in time — `bulkExecute(fixtureOp, items, ctx, { dryRun:true })` and the pre-apply evaluation inside `bulkExecute(fixtureOp, items, ctx, { dryRun:false })` produce the same per-item `ItemEvaluation` array (deep-equal / stable-JSON-equal);
And **silent divergence is structurally impossible**: a mutation-style test where the fixture operation's `evaluate` returns `would_succeed` but its `apply` throws proves the item surfaces as `failed(reason)` in the error CSV — never a silent "succeeded" — and a revert-sanity check confirms collapsing the two modes' evaluation into separate code paths would fail the parity test.

**AC7b — The Open/Closed invariant: the harness never branches on operation identity (Load-Bearing Decision 5).**
Given the framework must stay a fixed shape as consumers grow richer,
When `bulkExecute` processes any operation,
Then it depends ONLY on the `BulkOperation` contract methods + the registry lookup — it contains **no** comparison against a specific `operationType` value and **no** operation-specific `if` branch;
And an **Open/Closed proof** test registers **two** fixture operations with deliberately divergent `evaluate`/`apply`/`csvRow` behavior and asserts BOTH flow correctly through the **unchanged** harness (the harness treats them identically — all difference comes from the contract, none from a per-type branch);
And a code-review invariant holds: a future operation needing unusual behavior **extends the contract** (a new optional method with a harness-side safe default), never adds a branch to `bulkExecute` — a harness `operationType` string-literal comparison is a review-blocking regression.

**AC8 — Tests + gates green.**
Given `pnpm ci:local` (`--concurrency=4`, DB on :5433) is the primary sanctioned merge gate ([[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]),
Then domain unit tests cover (via the fixture operation): the parity invariant (AC7 byte-identical + the mutation/silent-divergence proof); dry-run zero-side-effects (apply + auditItem never called); scope-respecting skip (in-scope acted, out-of-scope skipped-with-count, deny-deeper geo pin); the 5k cap fail-closed (5001 items → throw before any processing, both modes); per-item-failure-does-not-roll-back (one apply throws, others still execute); the shared `batch_id`→`traceId` on every execute audit line; unknown `operationType` fail-closed; CSV serialization (preview + error rows, quoting/escaping);
And a live-DB integration test wires the `auditItem` seam to the REAL `writeAuditEntry` and asserts one row per executed item sharing a `traceId`, under a real scope tx (**assert membership / `traceId` grouping, not absolute counts** — the audit chain self-commits and accumulates across tests, [[project_live_db_test_gotchas]]);
And contracts tests cover the DTO round-trip + a domain↔contracts enum/shape sync-guard (test-only cross-import, [[project_contracts_domain_bundle_boundary]]); `emit-openapi.ts` + `openapi/v1.yaml` regenerated; `pnpm ci:local` green (the new module trips no determinism/schema-diff/pii-scrape gate — there is no migration in this story).

## Load-Bearing Decisions

Each is surfaced with a firm recommendation + the rejected alternative (the 10.4/10.5 house style). Decisions 1–4 and 6 are architecturally significant and should be **confirmed by the product owner before dev starts**; the recommendation is implementable as-is if confirmed.

1. **Parity mechanism — RECOMMEND ONE `bulkExecute` function with a `dryRun` flag, NOT two functions (`previewBulk`/`executeBulk`).** The epics names the entry point `bulkExecute(operation_type, target_set, dry_run: boolean)` — a single function with a mode flag. This is also the *strongest* possible parity guarantee: if scope-check and `evaluate` live in ONE code path and `dryRun` gates only `apply`+audit, then "preview said succeed, execute silently failed" cannot be expressed — there is no second evaluator to drift from the first. The CI parity test then asserts the two modes' pre-apply evaluation is byte-identical for frozen inputs, and a "collapse into two paths" revert-sanity check gives the test teeth ([[project_gate_scope_semantic_coverage]]). *Rejected alternative:* separate `preview()` / `execute()` functions that "call a shared evaluator" — weaker, because the shared-ness is a convention two functions must uphold, not a structural fact; the epics' single-entry-point signature already points at the stronger design.

2. **Authorization — RECOMMEND per-operation permission keys, NO framework-owned RBAC key.** FR-49 gates *specific* operations on specific roles ("bulk claim approval-at-freeze is gated on State Trustee"). That is the *operation's* authorization, not the *framework's*. So each `BulkOperation` declares `permissionKey` + `scopeDimension`, and the harness calls the existing `checkPermission` per item. The framework mints nothing — it is scope-*respecting*, not scope-*owning*. This mirrors 10.5 minting `news.manage` *for the news surface*, not for a generic "content" capability, and avoids an umbrella `bulk.execute` key that would over-grant. *Rejected alternative:* a single `bulk.execute` key gating the framework — rejected; it collapses distinct authorizations (moderate vs. notify vs. approve) into one grant and breaks FR-49's "State-Trustee-only for approval-at-freeze."

3. **`batch_id` transport — RECOMMEND `traceId` as the batch correlator; do NOT add a `batch_id` column to `audit_log_entries`.** `AuditEntryInput` (`audit/write.ts:71`) has no `batch_id` field, but it has `traceId` — literally "Correlation/trace id." A batch's per-item audit lines ARE correlated by a shared id; `traceId = batch_id` is the exact fit and needs **no migration** (the audit table's hash chain is frozen substrate; adding a column would touch the tamper-evident chain content — avoid). Query "all audit lines for batch X" = `WHERE trace_id = <batch_id>`. *Rejected alternative:* a new `batch_id` column on `audit_log_entries` — rejected; it perturbs the Story 1.10 hash-chain content schema for zero gain over `traceId`, and the audit primitive is deliberately closed ("the ONLY sanctioned path that appends," `write.ts:5`).

4. **Statelessness + no migration — RECOMMEND the framework holds NO persistent state (no `bulk_batches` table).** The harness is a pure evaluator + audit-emitter; the batch's durable trace already lives in the audit log (Decision 3). CSV content is returned in-memory; durable/async download is 10.7. A batch-history table would duplicate what the audit log already records and pull an async-job + storage concern into a primitive that has neither. *Rejected alternative:* persist each batch + its per-item outcomes to a new table — rejected as over-build for a primitive; if a surface needs queryable batch history, it composes the audit-log `traceId` grouping or defers to 10.7. **Consequence:** this story adds **no migration** — do not create one (keeps the determinism/journal gates untouched).

5. **The Open/Closed invariant — the harness NEVER branches on operation identity; richness lives in the contract (CONFIRMED, PO-ratified).** `bulkExecute` must be **closed to modification, open to extension**: it depends ONLY on the `BulkOperation` contract methods (`targetLocatorOf` / `evaluate` / `apply` / `csvRow` / `permissionKey` / `scopeDimension` / `auditAction`) and the registry lookup — it must contain **zero** comparisons against a specific `operationType` value and **zero** `if (operation is moderation …)` special cases, now or ever. When a future operation needs something unusual, the operation **extends the contract** (a new optional contract method with a safe default in the harness), never a new branch inside `bulkExecute`. This is what keeps the primitive stable while consumers grow richer: the registry stays intentionally tiny and the harness stays a fixed shape across every future surface. *Rejected alternative:* let `bulkExecute` grow per-operation branches "just for the tricky ones" — rejected; that is exactly how a primitive rots into a god-function coupled to every consumer. **Enforcement:** AC7's Open/Closed proof (two divergent fixture operations flowing through the unchanged harness) + a code-review invariant that the harness references no `operationType` string literal. Any future story that would add a harness branch must instead propose a contract extension in *this* module's PR discipline.

6. **Cap enforcement layer — RECOMMEND enforcing the 5k cap inside the domain harness (structural), not only at the API layer, diverging from epics.md's literal text.** epics.md states the cap is "enforced at the API layer." An API-layer-only guard is bypassable by any future direct-domain caller (a job, a script, a future surface that skips the API) — which defeats this story's own stated guarantee that "no consuming surface can bypass" the cap (Scope Boundary, opening paragraph). Enforcing the cap inside `bulkExecute` itself makes it structurally impossible to exceed regardless of caller; the contracts-layer `.max(5000)` mirror (Task 5) still gives a fast 4xx at the API boundary, but the harness is the real backstop. **This is a deviation from the epics.md-stated enforcement layer and needs explicit product owner confirmation before dev starts**, alongside Decisions 1–4. *Rejected alternative:* cap enforced ONLY at the API layer per epics.md's literal text — rejected; not defense-in-depth, and a bug or a new direct caller could silently exceed the cap with no harness-level backstop.

## Tasks / Subtasks

- [x] **Task 1 — Domain: the operation contract + registry + shared types** (`packages/domain/src/bulk-operations/{types,registry}.ts`) (AC1)
  - [x] `types.ts`: `ItemEvaluation` (`{ outcome: 'would_succeed' } | { outcome: 'would_fail'; reason: string } | { outcome: 'skipped'; reason: string }`); `BulkOperation<TItem, TContext>` (`operationType`, `permissionKey`, `scopeDimension: ScopeDimension` from `../rbac/scope.js`, `auditAction` (dotted lowercase, validated to match the `writeAuditEntry` regex), `targetLocatorOf`, pure `evaluate`, `apply`, `csvRow`); `BulkItemResult` (`{ itemRef, status: 'succeeded'|'failed'|'skipped'|'would_succeed'|'would_fail', reason?, evaluation }`); `BulkResult` (`{ batchId, mode, counts, items, previewCsv?, errorCsv?, divergences }`).
  - [x] `registry.ts`: `createBulkOperationRegistry()` → `{ register(op), get(operationType) }`, seeded **empty**; `get` on an unknown type returns `undefined` and `bulkExecute` throws `UnknownBulkOperationError`. (The 10.1 routing-policy registry is the "registry with a code-DATA default" precedent — here the default set is empty because operations are surface-owned.)
  - [x] `errors.ts`: `UnknownBulkOperationError`, `BulkBatchCapExceededError` (`{ cap, actual }`) — typed, mapping-ready (the domain `errors.ts` convention).
- [x] **Task 2 — Domain: the `bulkExecute` harness (the parity spine)** (`packages/domain/src/bulk-operations/execute.ts`) (AC2–AC7)
  - [x] `BULK_BATCH_CAP = 5000`; cap check FIRST (`options.cap ?? BULK_BATCH_CAP`) → throw `BulkBatchCapExceededError` before any item work, both modes (AC5).
  - [x] The single per-item loop: (1) scope check via `checkPermission` (non-throwing) → out-of-scope ⇒ `skipped('out_of_scope')`; (2) `op.evaluate(item, ctx)` — the SHARED evaluator; (3) `if (!dryRun && evaluation.outcome === 'would_succeed')` → `try await op.apply` (catch ⇒ `failed(reason)`, continue — no batch rollback, AC6); (4) `if (!dryRun)` → `await options.auditItem(auditLineFor(item, status, batchId))` with `traceId = batchId` (AC4). **Steps 1–2 never branch on `dryRun`** (AC7 parity).
  - [x] Divergence surfacing (AC7): when `options.expectedOutcomes` is supplied (execute only), compare each item's execute-time `evaluation` to its predicted outcome; push mismatches to `divergences[]` with reason.
  - [x] Aggregate counts + build `previewCsv` (dry-run) or `errorCsv` (execute, non-succeeded rows) via `csvRow` + the Task 3 serializer.
  - [x] `auditLineFor`: builds `AuditEntryInput` — `action = op.auditAction`, `resourceLocator = op.targetLocatorOf(item).value ?? '<global>'`, `requestPayloadHash = createHash('sha256').update(canonicalJsonStringify(itemPayload), 'utf8').digest('hex')` (never the raw payload — the exact `news-blog/write.ts:68` precedent; `canonicalJsonStringify` from `packages/domain/src/canonical-json.ts`), `responseStatus` from status, `traceId = batchId`, `actorId`/`actorRole`/`pariwarId` from `actorContext`. (Inlined at the call site rather than a separately-named helper function — same shape/behavior, no named `auditLineFor` export.)
- [x] **Task 3 — Domain: pure CSV serializer** (`packages/domain/src/bulk-operations/csv.ts`) (AC2, AC6)
  - [x] `toCsv(rows: Record<string,string>[]): string` — stable column order (union of keys, first-seen), RFC-4180 quoting (wrap fields containing `,` `"` `\n`; double interior `"`), `\r\n` line endings, header row. DB-free, unit-tested against quoting/escaping edge cases (embedded quotes, newlines, commas, empty set → header-only or empty string — decide + test). Decision: empty input → `''` (no header-only ambiguity), tested.
- [x] **Task 4 — Domain: barrel + the test-only fixture operation** (`packages/domain/src/bulk-operations/index.ts`) (AC1, AC7)
  - [x] Barrel-export the public surface (`bulkExecute`, `createBulkOperationRegistry`, the contract/result types, `BULK_BATCH_CAP`, the errors). Add `export * as bulkOperations from './bulk-operations/index.js'` to `packages/domain/src/index.ts`.
  - [x] The **fixture operation** lives in the TEST tree (not shipped) — a deterministic `evaluate` (e.g. even ids `would_succeed`, an id-band `would_fail`), a controllable `apply` (throw-on-demand for the silent-divergence proof), a `csvRow`, a real `permissionKey`/`scopeDimension` so the scope-skip path is exercised. Build a **second, deliberately divergent** fixture op (different evaluate/apply/csvRow) for the AC7b Open/Closed proof — both must flow through the harness unchanged.
- [x] **Task 5 — Contracts: bulk-operations DTOs** (`packages/contracts/src/bulk-operations/`) (AC1, AC2, AC6)
  - [x] `BulkExecuteRequest` (`operation_type`, `target_set` (array, `.max(5000)` mirror of the cap), `dry_run`); `BulkItemOutcome` (`item_ref`, `status`, `reason?`); `BulkPreviewResponse` / `BulkResultResponse` (`batch_id`, `counts`, `items[]`, `preview_csv?` / `error_csv?`, `divergences[]`). Pure-Zod, `.strict()`, snake_case wire (watch camelCase↔snake_case drift, [[project_story_validate_footguns]]), NO `@twt/domain` import ([[project_contracts_domain_bundle_boundary]]).
  - [x] Register the DTOs in `scripts/emit-openapi.ts`; regenerate `openapi/v1.yaml`. Extend `packages/contracts/tests/` — round-trip + a domain↔contracts status/enum sync-guard (test-only cross-import, the helpdesk-severity sync-guard precedent).
- [x] **Task 6 — Tests + gates** (AC8)
  - [x] Domain unit (fixture op): parity byte-identical + silent-divergence mutation proof + revert-sanity; **AC7b Open/Closed proof (two divergent fixture ops, one unchanged harness, no `operationType` branch)**; dry-run zero-side-effects; scope-respecting (in/out/deny-deeper geo pin); 5k cap fail-closed both modes; no-rollback-on-item-failure; shared `traceId`; unknown-op fail-closed; CSV quoting.
  - [x] Live-DB integration: `auditItem` → real `writeAuditEntry` under a scope tx; one row per executed item sharing a `traceId`; **assert `traceId` grouping / membership, not absolute counts** ([[project_live_db_test_gotchas]] — the audit chain self-commits and accumulates).
  - [x] Contracts DTO + sync-guard. `emit-openapi.ts` + `openapi/v1.yaml` regen. Run full `pnpm ci:local` (`--concurrency=4`, `DATABASE_URL` on :5433); confirm no migration was added and the determinism/schema-diff/pii-scrape gates stay green.

### Review Findings

- [x] [Review][Patch] Add `itemId(item)` to the `BulkOperation` contract; use it (not the scope locator) for audit `resourceLocator`/`requestPayloadHash`/`expectedOutcomes` keys — resolves the itemRef collision proven against the shipped fixtures (items sharing a district produce byte-identical audit lines and colliding divergence lookups) [packages/domain/src/bulk-operations/types.ts, execute.ts]
- [x] [Review][Patch] Require `auditItem` in execute mode — throw a typed error if `dryRun: false` and `options.auditItem` is unset, instead of silently defaulting to a no-op [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Use `responseStatus: 403` for out-of-scope skips instead of `200` (keep `422` for would_fail/failed, `200` for true successes) [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Correct AC1's literal 5-param signature text and the Dev Agent Record's "keeps the harness signature exactly what AC1 specifies" claim to reflect the actual 6-param signature (`registry, operationType, targetSet, actorContext, ctx, options`) — the extra `ctx` is a necessary, accepted deviation [this story file: AC1, Dev Agent Record]
- [x] [Review][Patch] Wrap `targetLocatorOf()`/`evaluate()`/`csvRow()` per-item calls in try/catch mirroring `apply()`'s isolation — currently only `apply()` failures are caught, so a throw from any of the other three aborts the entire batch; worst case is `csvRow()` (called after the full loop, after all `apply`+audit side effects already committed) losing the `BulkResult` entirely [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Use `locator.dimension` (per-item, from `targetLocatorOf`) instead of `op.scopeDimension` (static) in the `checkPermission` call — the per-item dimension signal the type models is currently discarded [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Check `registry.get(operationType)` before the cap check so an unknown-operation error isn't masked by a cap-exceeded error when both conditions hold [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Guard against an empty-string `locator.value` falling through as `itemRef = ''` — confirmed this fails `writeAuditEntry`'s `resourceLocator: z.string().min(1).max(1024)` validation (audit/write.ts:103) and would throw mid-batch, after earlier items' `apply()` + audit already committed [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Hash `canonicalJsonStringify(item)` for `requestPayloadHash`, not `{itemRef, status, reason}` — AC4 specifies a digest of the request/item payload, not the processing outcome [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Make `BulkItemEvaluation`/`BulkItemOutcome.reason` conditionally required via `z.discriminatedUnion` on `outcome`/`status`, matching both the domain `ItemEvaluation` shape and the DTO's own doc comment ("present for every outcome except would_succeed") which the current unconditionally-optional schema doesn't enforce [packages/contracts/src/bulk-operations/dto.ts]
- [x] [Review][Patch] Add a duplicate-registration guard to `registry.register()` — two operations registering under the same `operationType` currently silently overwrite, with 10.10/10.12/notifications all expected to call `register()` [packages/domain/src/bulk-operations/registry.ts]
- [x] [Review][Patch] Neutralize spreadsheet-formula-injection payloads (leading `=`, `+`, `-`, `@`) in `toCsv` — the first CSV writer in the repo, designed for analyst/admin consumption in Excel/Sheets, fed by loosely-typed `target_set` data [packages/domain/src/bulk-operations/csv.ts]
- [x] [Review][Patch] Sanitize/truncate raw `Error.message` before writing into `reason` and thus into the exported CSV — avoid leaking internal error detail into an operational artifact [packages/domain/src/bulk-operations/execute.ts]
- [x] [Review][Patch] Add a domain unit test constructing 5001 real items and asserting the actual default `BULK_BATCH_CAP` (5000) throws in both modes — AC8 explicitly enumerates this; only an artificial `cap: 3` override and a contracts-layer `.max()` test currently exist, neither proves the real default boundary [packages/domain/tests/bulk-operations/execute.test.ts]
- [x] [Review][Defer] No domain→contract adapter/round-trip test yet connecting camelCase `BulkResult` to snake_case DTOs — deferred, pre-existing (no `apps/api` route ships this story, so there's nothing to adapt yet; flag for whichever surface builds the first route)
- [x] [Review][Defer] `BulkCounts.succeeded`/`failed` "always 0 in a preview response" is comment-only, unenforced by the schema and untested [packages/contracts/src/bulk-operations/dto.ts] — deferred, pre-existing
- [x] [Review][Defer] `previewCsv`/`errorCsv` are plain optional strings rather than a discriminated union keyed on `mode` [packages/domain/src/bulk-operations/types.ts] — deferred, pre-existing
- [x] [Review][Defer] Registry `get`/`register` type-erasure via `as unknown as` casts, no runtime tag [packages/domain/src/bulk-operations/registry.ts] — deferred, pre-existing (consistent with other registries in the codebase, e.g. Story 10.1's)
- [x] [Review][Defer] Divergence detection never checks for items present in `expectedOutcomes` but absent from `targetSet` [packages/domain/src/bulk-operations/execute.ts] — deferred, pre-existing (not explicitly required by AC7's text)
- [x] [Review][Defer] Divergence `reason` is a single hardcoded string regardless of what actually changed [packages/domain/src/bulk-operations/execute.ts] — deferred, pre-existing (debuggability polish, non-blocking)
- [x] [Review][Defer] Dev Agent Record's `pnpm ci:local` (28/28 green) and live-DB isolation-run (2/2) claims are developer-reported and unverified by this review — deferred, pre-existing (re-run independently before merge, per this project's verify-before-committing-governance-claims convention)

## Dev Notes

### This is a primitive — the single most important fact

You are building the **harness**, not the operations. RBAC scope-check (`checkPermission`), the audit writer (`writeAuditEntry`), and the idempotency keyed-store all **already exist and already work**. 10.6 adds a pure evaluator that loops a target set through them with a dry-run flag and a 5k cap. If you find yourself writing a member-moderation mutator, a custom-field validator, or a notification dispatcher, STOP — those are the consuming surfaces' stories (10.10 / 10.12 / notifications). The registry ships **empty**; a **test-only fixture operation** is the only operation this story instantiates, and it exists to prove the parity invariant.

### The parity invariant is the whole point — design it structurally, not by convention

Follow Load-Bearing Decision 1: ONE `bulkExecute` function, `dryRun` gating ONLY `apply`+audit. The per-item scope-check and `op.evaluate` calls are reached identically in both modes. Do **not** write a `previewBulk` and an `executeBulk` that "both call the evaluator" — that makes parity a convention two functions must not break, instead of a structural fact one function cannot break. The CI test (AC7) asserts the two modes' pre-apply `ItemEvaluation[]` are byte-identical for frozen inputs; add a revert-sanity assertion so that splitting the evaluation into two paths would fail the test ([[project_gate_scope_semantic_coverage]] — a green scan proves nothing without teeth).

The ONLY sanctioned preview↔execute divergence is **concurrent state change**: pass the preview's `expectedOutcomes` into execute and diff each item's execute-time evaluation against its prediction; surface mismatches in `divergences[]`. Everything else being identical is what makes "looked fine, silently failed" impossible.

### Keep the harness closed to modification — richness lives in the contract, not in `bulkExecute` (Decision 5)

The registry stays intentionally tiny and `bulkExecute` stays a **fixed shape** across every future surface. The harness may reference ONLY the `BulkOperation` contract methods and the registry lookup — **never** a comparison against a specific `operationType` value, and **never** an operation-specific branch. The moment you're tempted to write `if (op.operationType === 'moderation') …` inside the harness, the design is telling you the *contract* is missing a method — add an optional contract method with a safe harness-side default (Open/Closed) and let the operation implement it. This is the difference between a primitive that stays stable for a decade and a god-function that grows a coupling to every consumer it ever serves. The AC7b proof (two divergent fixture ops, one unchanged harness) is the structural teeth; a harness `operationType` string-literal is a review-blocking regression. This applies to **future stories too**: a later operation with unusual needs extends the contract in this module's PR, it does not special-case the harness.

### Scope-respecting = reuse `checkPermission`, do NOT re-implement scope logic

`packages/domain/src/rbac/check.ts` exports `checkPermission` (the **non-throwing** variant — returns `{ ok } | { ok:false, denial, error }`, exactly what a per-item loop wants; the throwing `requirePermission` would abort the batch). Per item: `checkPermission({ actorId, grants: actorContext.grants, key: op.permissionKey, resource: { dimension: op.scopeDimension, value: op.targetLocatorOf(item), pariwarId } })`. `ok:false` ⇒ `skipped('out_of_scope')`, counted, excluded. The geo-tree resolver is **deny-deeper by default until Epic 3** ([[project_rbac_geo_scope_containment]]) — a `state`-scoped actor's `district`-level items skip until a resolver is injected; document this as the same asymmetry 10.3/10.4/10.5 shipped, not a defect. The RBAC audit-denied seam (`onAuthorizationDenied`) already fires inside `checkPermission` — you do not double-audit the scope denial.

### Audit: the writer is an injected SEAM — domain never touches the service pool

`writeAuditEntry` takes the SERVICE (BYPASSRLS) pool and **self-commits** its own transaction (`audit/write.ts:19` — it "CANNOT be rolled back by setupLiveDb's per-test ROLLBACK"). The domain harness must NOT import `pg` or hold a pool — it takes an injected `auditItem: (input: AuditEntryInput) => Promise<void>` seam (the rbac `onAuthorizationDenied` / keyed-store `clock` / tone-review sign-off injection discipline). The consuming surface wires `auditItem = (input) => writeAuditEntry(servicePool, input)` at its composition root; tests inject a capturing fixture sink. Because the writer self-commits, live-DB tests **assert `traceId` grouping / membership, not `=== N`** ([[project_live_db_test_gotchas]]). `batch_id → traceId` (Decision 3); `requestPayloadHash` is a **sha256 digest, never the raw payload** — the `.strict()` schema at `write.ts:90` structurally rejects a raw payload (the PII-poisoning defense), and the regex requires a 64-char hex digest.

### Audit-write volume at 5k is a real cost — acknowledge it, keep the seam

`writeAuditEntry` serializes every append on a single GLOBAL advisory-locked hash chain (`AUDIT_CHAIN_LOCK_KEY`) with its own BEGIN/lock/read-tail/insert/COMMIT per row. A 5k-item execute = up to 5,000 serialized global audit transactions, which also block every other audit writer for the batch's duration. At **Phase-1 scale (1k–5k members in one district)** this is acceptable but not free; the **injected seam is the mitigation** — a future story can swap in a batched/chunked audit writer without touching the harness. Do NOT try to batch audit writes yourself in this story (it would fork the frozen Story 1.10 writer); just keep the seam and note the cost in the Dev Agent Record.

### No migration, no events, no state (Decision 4)

The framework is stateless. There is **no `bulk_batches` table, no migration, no `events_log` stream, no projector/trigger/CI-state-gate**. Durable batch trace = the audit log grouped by `traceId`. CSV content is returned in-memory. Do not add a migration — it would needlessly engage the determinism/journal/schema-diff gates ([[project_live_db_test_gotchas]] — never regenerate an applied migration; here, add none).

### CSV: pure serializer, content-only (10.7 owns durable download)

There is **no existing CSV *writer/serializer*** in the repo (`data-export` emits JSON/ZIP, not CSV; `packages/bank-parsers` uses `csv-parse` but only to *read* inbound bank-statement CSVs — a parsing precedent, not a writing one — and no `csv-stringify` dependency exists anywhere). Write a small pure `toCsv` (RFC-4180 quoting). The harness returns CSV *strings* synchronously. **Async generation + object-store persistence + one-time time-limited authenticated download URLs are Story 10.7** (Reports & Exports Library, pg-boss + storage) — do not build a job or a signed-URL path here. If a consuming surface wants a downloadable file today, it streams the returned string; the durable path lands with 10.7.

### Contracts hygiene

Pure-Zod `.strict()`, snake_case wire, no `@twt/domain` import ([[project_contracts_domain_bundle_boundary]] — a source-level import leaks `pg` into bundles; the domain↔contracts sync-guard is a TEST-only cross-import). Mirror the 5k cap on `target_set` (`.max(5000)`) so an over-cap request is rejected at the contract boundary too (defense in depth; the harness cap is the structural guarantee). Watch camelCase↔snake_case drift ([[project_story_validate_footguns]]). Regenerate `openapi/v1.yaml` via `scripts/emit-openapi.ts` (the synchronization invariant).

### Testing standards summary

- Live-DB: `twt-test-pg` :5433; audit writer self-commits + accumulates → **assert membership / `traceId` grouping, not counts** ([[project_live_db_test_gotchas]]). No migration in this story.
- The parity CI test is the load-bearing gate — byte-identical two-mode evaluation + the silent-divergence mutation proof + a revert-sanity assertion with teeth ([[project_gate_scope_semantic_coverage]]).
- Merge gate = `pnpm ci:local` (`--concurrency=4`, integration needs `DATABASE_URL` on :5433) — ADR-0017 ratified; a cloud CI run is NOT a substitute ([[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]).
- Domain dynamic `.limit()` → `clampLimit` if any list read is added ([[project_domain_limit_clamp_and_savepoint_retry]]) — the harness itself iterates a caller-supplied set, so likely N/A, but any read you add follows it.
- ESLint per-package (`pnpm --filter @twt/domain lint`, `pnpm --filter @twt/contracts lint`); carve-outs use cwd-relative role globs ([[project_eslint_config_per_package_cwd]]).

### Project Structure Notes

- **NEW paths:** `packages/domain/src/bulk-operations/{types,registry,errors,execute,csv,index}.ts`, `packages/domain/tests/bulk-operations/*` (incl. the fixture op), `packages/contracts/src/bulk-operations/`, `packages/contracts/tests/bulk-operations/*`.
- **EXTEND (not new):** `packages/domain/src/index.ts` (barrel: `export * as bulkOperations`), `scripts/emit-openapi.ts` + `openapi/v1.yaml`.
- **NOT touched:** no migration, no `packages/events` registration, no new RBAC key (`rbac/permissions.ts` unchanged — catalog stays at v25), no `apps/*` (no route, no UI — surfaces own those). If you touch any of these, re-read the Scope Boundary — you are probably building a consuming surface's work.
- **Epics-prose note:** the epics lists example operations (`bulk_send_notification`, `bulk_moderate`, `bulk_update_custom_field`) — these are illustrative of what surfaces will register, NOT operations to implement here (Scope Boundary; the registry ships empty + a test fixture).

### References

- [Source: epics.md#Story 10.6] — `bulkExecute(operation_type, target_set, dry_run)`; dry-run preview (per-item + counts + preview CSV); scope-respecting per-item RBAC skip; audit per item w/ shared batch_id; 5k cap at the API layer; error CSV; the **dry-run parity invariant** (shared evaluator, CI byte-identical test, concurrent-state the only allowed divergence, silent divergence structurally impossible).
- [Source: prd.md#FR-49] — Bulk operations everywhere: dry-run preview (cancel without side effects), one audit line per item w/ shared `batch_id` + actor identity, scope-respecting (out-of-scope silently excluded + count), 5,000-item cap (configurable), per-item failure does not roll back the batch, downloadable error CSV, bulk-claim-approval gated on State Trustee.
- [Source: packages/domain/src/rbac/check.ts] — `checkPermission` (non-throwing), `hasPermission`, `EffectiveGrant`, `ResourceLocator`; fail-closed, per-item scope validation the harness reuses.
- [Source: packages/domain/src/rbac/scope.ts] — `ScopeDimension`, `TargetLocator`, `scopeContains`, `denyDeeperGeoResolver` (deny-deeper geo until Epic 3, [[project_rbac_geo_scope_containment]]).
- [Source: packages/domain/src/audit/write.ts] — `writeAuditEntry`, `AuditEntryInput` (the `traceId` = batch_id slot, Decision 3); single global hash chain, self-commits, SERVICE pool, `.strict()` payload-hash boundary; the injected-seam target.
- [Source: packages/domain/src/idempotency/keyed-store.ts] — AR-58 keyed store ("bulk admin operations" named consumer); once-only execute per batch_id if a surface needs replay-safety.
- [Source: packages/domain/src/helpdesk/registry.ts] — Story 10.1 versioned registry with a code-DATA default (the registry-shape precedent; here the default set is empty because operations are surface-owned).
- [Source: packages/domain/src/data-export/assemble.ts] — the closest existing "assemble structured output" precedent (JSON/ZIP, not CSV) — confirms there is NO CSV util to reuse; write the pure `toCsv`.
- [Source: implementation-artifacts/10-5-news-blog-dual-surface-author-reviewer-scheduled-publish-channel-per-post.md] — the seam-injection + audit-attribution + contracts-hygiene + RBAC-per-surface conventions; the crypto/pool-boundary lesson (composition root wires the service-pool writer, not the domain).
- [Source: implementation-artifacts/10-1 helpdesk primitive] — the `[PRIMITIVE]` story shape: domain substrate + registry + contracts. Note: 10.1 itself shipped a thin `apps/api` create-ticket route (only its admin console UI deferred, to 10.4) — 10.6's zero-`apps/api`-surface choice is *this story's own* scope call, not an inherited 10.1 pattern.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via bmad-dev-story.

### Debug Log References

- `pnpm --filter @twt/domain build` — clean.
- `pnpm --filter @twt/contracts build` — clean.
- `pnpm --filter @twt/domain lint` / `pnpm --filter @twt/contracts lint` — clean.
- `pnpm --filter @twt/contracts test` — 43 files, 703 tests passed (incl. the new 16-test `bulk-operations.test.ts` sync-guard + DTO suite).
- `pnpm --filter @twt/contracts contracts:emit-openapi` + `contracts:check-openapi-determinism` — `openapi/v1.yaml` regenerated (255772 bytes) and confirmed byte-identical on re-run.
- `pnpm --filter @twt/domain test` (no `DATABASE_URL`) — 95 files, 1227 passed / 719 skipped (live-DB specs skip without a DB); the new `tests/bulk-operations/{csv,registry,execute,open-closed}.test.ts` all green (32 tests).
- `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable npx vitest run tests/integration/bulk-operations` (run in isolation against `twt-test-pg` per [[project_known_livedb_test_failures]] — confirm innocence in isolation rather than trusting a noisy full-suite run) — 2/2 passed: the shared-`traceId` membership assertion and the dry-run zero-audit-rows assertion.
- `pnpm lint` (root, all 20 packages via turbo) — all green.
- `pnpm ci:local` (no `DATABASE_URL`) — 28/28 static jobs green (`integration-tests` skipped by the script itself, no `DATABASE_URL` passed to the aggregate run — see Completion Notes for why the isolated spec run above is the sanctioned substitute here).

**Post-review re-verification (2026-07-30, after the 14 patches below):**
- `pnpm --filter @twt/domain build` / `pnpm --filter @twt/contracts build` — clean.
- `pnpm --filter @twt/domain lint` / `pnpm --filter @twt/contracts lint` — clean.
- `pnpm --filter @twt/contracts test` — 43 files, 707 tests passed (bulk-operations suite grew 16→20 tests: discriminated-union reason-required/forbidden coverage).
- `pnpm --filter @twt/domain test` (no `DATABASE_URL`) — 95 files, 1243 passed / 721 skipped (bulk-operations unit suite grew 32→57 tests: auditItem-required, itemId collision regression, dimension-mismatch, per-item fault isolation, csvRow-throw, 5001-real-item cap, duplicate-registration, CSV formula-injection).
- `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable npx vitest run tests/integration/bulk-operations` (isolation run) — 2/2 passed against the patched hashing/itemId/403-status logic.
- `pnpm --filter @twt/contracts contracts:emit-openapi` + `contracts:check-openapi-determinism` — `openapi/v1.yaml` regenerated (263299 bytes, discriminated-union `oneOf` shapes for `BulkItemEvaluation`/`BulkItemOutcome`) and confirmed byte-identical on re-run.
- `pnpm ci:local` (no `DATABASE_URL`) — 28/28 static jobs green, independently re-run (not taken on the prior claim's word, per [[feedback_verify_before_committing_governance_claims]]).

### Completion Notes List

- Implemented the `[PRIMITIVE]` exactly as scoped: `packages/domain/src/bulk-operations/{types,registry,errors,execute,csv,index}.ts`. No `apps/api` route, no admin UI, no real operation — the registry ships seeded empty; only test-only fixture operations exist (`packages/domain/tests/bulk-operations/fixtures.ts`).
- `bulkExecute` is the single parity-spine function (Load-Bearing Decision 1): the per-item scope check (`checkPermission`) and `op.evaluate` run through one code path regardless of `dryRun`; `dryRun` gates only `apply` + the audit write. Verified with a byte-identical (stable-JSON) comparison of the full per-item `ItemEvaluation[]` across a dry-run and an execute call against the same frozen inputs, plus a silent-divergence mutation proof (evaluate says `would_succeed`, `apply` throws → the item surfaces as `failed` in the error CSV, never a silent `succeeded`).
- AC7b Open/Closed invariant (Decision 5): `execute.ts` contains zero comparisons against a literal `operationType` value and never references `op.operationType` — enforced by both behavioral tests (two divergent fixture operations, `test.fixture_a` / `test.fixture_b`, flow through one unchanged registry+harness) and a structural regex assertion over the harness source text (`open-closed.test.ts`) so a future PR that adds an `operationType ===` branch fails immediately.
- Per-item status model: dry-run status mirrors `evaluation.outcome` 1:1 (`would_succeed`/`would_fail`/`skipped`); execute resolves `would_succeed` → `succeeded`/`failed` (apply outcome), `would_fail` → `failed` directly (apply is never attempted for a predicted failure — only `would_succeed` items reach `apply`), `skipped` stays `skipped`. This is a design decision not spelled out verbatim in the AC text but required to make AC6's "error CSV lists failed + skipped" coherent with AC7's "apply is only attempted for would_succeed".
- Audit line written for EVERY processed item in execute mode, including scope-skipped items (not just successes/failures) — read this as the pseudocode's step 4 running unconditionally when `!dryRun`; gives the State Trustee a full per-batch audit trail, not just a survivors' log. Confirmed live against the real `writeAuditEntry` writer (own-committing; asserted by `traceId` membership per [[project_live_db_test_gotchas]], never an absolute count).
- Fixture operations reuse the REAL `claim.approve` catalog key (district_admin @ district ceiling, state_trustee @ state ceiling) rather than inventing a test-only key — `checkPermission` fails closed on any key outside `PERMISSION_CATALOG`, and `bulkExecute` always checks against the seeded default role bundles (no ctx-override parameter was added — not in scope). This also gave a real deny-deeper geo-pin fixture for free (`state_trustee`'s state-ceiling grant vs. a district-level item denies under the default resolver, the 10.3/10.4/10.5 documented asymmetry). **Correction (post-review):** the claim that this "keeps the harness signature exactly what AC1 specifies" was imprecise — the shipped signature is 6 parameters (`registry, operationType, targetSet, actorContext, ctx, options`), not the 5 AC1's original text listed; the "no ctx-override" statement was about a *different*, narrower thing (not adding an authz-context override), not about the parameter count. AC1's text has been corrected above to match the shipped signature.
- ~~`itemRef = targetLocatorOf(item).value ?? '<global>'`... NOT necessarily unique per item~~ — **superseded (post-review):** this was a real gap, not just a caveat — proven against the shipped fixtures (items sharing a district produced byte-identical audit `resourceLocator`/`requestPayloadHash` lines). Fixed via an optional `op.itemId(item)` contract method (falls back to the scope locator + an index-qualified marker when absent); see Post-Review Patch Notes below.
- `BulkExecuteOptions.cap` is an explicit override in either direction (raise or lower) — AC5's "never silently raise above the constant without an explicit override" is read as "no implicit raise", not "override can only lower".
- CSV empty-input decision (Task 3): `toCsv([])` returns `''` (not a header-only string) — a `previewCsv` for a zero-item batch, or an `errorCsv` for an all-succeeded execute, is unambiguously "nothing to show" rather than a bare header implying an empty-but-real table.
- Contracts `target_set` items are typed as a loose `z.record(z.string(), z.unknown())` (not a fixed shape) — deliberate: `bulkExecute` is operation-agnostic, so the wire contract can only bound "a JSON object", not any one operation's fields; the `.max(BULK_BATCH_CAP)` mirror is defense-in-depth only, the harness cap is the structural guarantee (Decision 6).
- `emit-openapi.ts`: registered `BulkExecuteRequest`/`BulkPreviewResponse`/`BulkResultResponse` as components only (no `path`) — this story ships zero `apps/api` routes, mirroring the Story 1.7/1.8 "components ahead of routes" precedent (a bigger gap than 10.1's, which at least shipped its own create-ticket route).
- No migration, no new RBAC key, no events_log vocabulary added — confirmed via `pnpm ci:local`'s schema-diff/domain-invariants/pii-scrape/access-wrapper-invariants gates all staying green with zero changes needed to their scope declarations.
- Known pre-existing flake (unrelated to this story): a full unfiltered `pnpm turbo run test --force` across `@twt/domain` + siblings with `DATABASE_URL` set reproduces the documented [[project_ci_local_double_run_pollution]] / [[project_known_livedb_test_failures]] cross-test pollution (observed on `alert`/`policy-regression` specs during an exploratory full run, not touched by this story). The bulk-operations live-DB spec was confirmed green in ISOLATION (`vitest run tests/integration/bulk-operations`, 2/2 passed) per that memory's "confirm innocence by running the suspect spec in isolation" convention — this story introduces no new pollution source (it is a pure-consumer of the existing `writeAuditEntry` writer, already exercised by the pre-existing audit-log integration suite).

### Post-Review Patch Notes (2026-07-30)

Applied all 14 `[Review][Patch]` findings from the `/code-review` pass (Blind Hunter + Edge Case Hunter + Acceptance Auditor, cross-verified against the real `checkPermission`/`writeAuditEntry` implementations); 4 originally `decision-needed` findings were resolved by the product owner and folded into this same patch batch. See the Review Findings checklist above for the full list; highlights:

- **itemId contract extension** (the single most significant finding, confirmed independently by all three review layers): `BulkOperation` gained an optional `itemId(item)` method; `resolveItemRef` in `execute.ts` prefers it over the RBAC scope locator's value, with an index-qualified (never a bare constant) fallback when absent. `fixtureOperationA` now implements it; `fixtureOperationB` deliberately does not, exercising both paths. A new regression test proves two items sharing a district no longer collide on `itemRef`/audit lines/divergence keys.
- **`auditItem` is now required in execute mode** (`BulkAuditItemRequiredError`, thrown before any item is touched) — closes the silent-zero-audit-trail gap.
- **Per-item fault isolation extended to `targetLocatorOf`/`evaluate`** (previously only `apply` was isolated) — a throw from either now surfaces as a `would_fail` item (reason: `evaluation_error: ...`) instead of aborting the whole batch. `csvRow` (called after the loop, after `apply`+audit already committed) is now caught too, with a fallback CSV row, so a throw there can never discard an already-computed `BulkResult`.
- **`checkPermission` now uses the per-item `locator.dimension`**, not the operation's static `scopeDimension` field (which is now documented as declarative/introspection-only metadata, AC1-required but not what the harness's authorization check consults).
- **Registry lookup now runs before the cap check** (previously reversed, which could mask an unknown-operation error behind a cap-exceeded one).
- **`requestPayloadHash` now hashes the actual item** (`canonicalJsonStringify(item)`, matching AC4's "digest of the request" text) instead of the outcome tuple, with a fallback to the outcome-tuple hash if the item itself isn't canonical-JSON-safe (avoids a hashing technicality aborting an otherwise-successful batch).
- **Audit `responseStatus` for an out-of-scope skip is now `403`** (was `200`, indistinguishable from success).
- **Contracts `BulkItemEvaluation`/`BulkItemOutcome` switched from `.optional()` `reason` to `z.discriminatedUnion`**, making `reason` structurally required for `would_fail`/`skipped`/`failed` and structurally forbidden for `would_succeed`/`succeeded` — matches the domain `ItemEvaluation` shape exactly; `openapi/v1.yaml` regenerated (now emits `oneOf` for these nested shapes).
- **`registry.register()` now throws `DuplicateBulkOperationError`** on a second registration of the same `operationType`.
- **`toCsv` now neutralizes spreadsheet-formula-injection** (OWASP CSV Injection: a leading `=`/`+`/`-`/`@`/tab/CR gets a `'` prefix) — the first CSV writer in the repo, feeding operator-facing preview/error CSVs.
- **Error messages captured into `reason`/CSV are now truncated to 512 chars** via a shared `messageOf`/`truncate` helper (`MAX_REASON_LENGTH`).
- **AC8's literal "5001 items → throw" test now exists** against the real (non-overridden) `BULK_BATCH_CAP` default, in both modes — previously only an artificial `cap: 3` override was tested at the domain layer.
- **AC1's text and a Dev Agent Record claim were corrected** to reflect the actual 6-parameter `bulkExecute` signature (`ctx: TContext` was always present in the shipped code; the original AC1 text and one Completion Note undercounted it).

7 additional findings were triaged as `defer` (not patched — logged in `deferred-work.md` under "code review of 10-6-bulk-operations-framework"): the missing domain→contract adapter (no route ships this story, so nothing to adapt yet), the unenforced `BulkCounts` preview-zero invariant, the non-discriminated `previewCsv`/`errorCsv` typing, the registry's generic type-erasure (consistent with other registries in the codebase), divergence detection not flagging vanished items, the hardcoded divergence reason string, and the unverified `ci:local`/live-DB completion claims (now independently re-verified above, superseding that specific deferred item).

### File List

**New:**
- `packages/domain/src/bulk-operations/types.ts`
- `packages/domain/src/bulk-operations/registry.ts`
- `packages/domain/src/bulk-operations/errors.ts`
- `packages/domain/src/bulk-operations/execute.ts`
- `packages/domain/src/bulk-operations/csv.ts`
- `packages/domain/src/bulk-operations/index.ts`
- `packages/domain/tests/bulk-operations/fixtures.ts`
- `packages/domain/tests/bulk-operations/csv.test.ts`
- `packages/domain/tests/bulk-operations/registry.test.ts`
- `packages/domain/tests/bulk-operations/execute.test.ts`
- `packages/domain/tests/bulk-operations/open-closed.test.ts`
- `packages/domain/tests/integration/bulk-operations/audit-seam.spec.ts`
- `packages/contracts/src/bulk-operations/enums.ts`
- `packages/contracts/src/bulk-operations/dto.ts`
- `packages/contracts/src/bulk-operations/index.ts`
- `packages/contracts/tests/bulk-operations/bulk-operations.test.ts`

**Modified:**
- `packages/domain/src/index.ts` (+ `export * as bulkOperations from './bulk-operations/index.js'`)
- `packages/contracts/src/index.ts` (+ `export * from './bulk-operations/index.js'`)
- `packages/contracts/scripts/emit-openapi.ts` (+ component-only registration for the 3 bulk-operations DTOs, no paths)
- `openapi/v1.yaml` (regenerated; deterministic re-run confirmed)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status: ready-for-dev → review)

## Change Log

| Date | Change |
|---|---|
| 2026-07-30 | Story 10.6 implemented (bmad-dev-story). `packages/domain/src/bulk-operations/` `[PRIMITIVE]`: single `bulkExecute(registry, operationType, targetSet, actorContext, ctx, options)` harness with the dry-run parity invariant (one evaluator code path, `dryRun` gates only apply+audit), per-item RBAC scope-check reuse (`checkPermission`, deny-deeper geo pin honoured), the 5k-item harness-enforced cap (`BulkBatchCapExceededError`, both modes, before any item work), per-item-failure-does-not-roll-back, injected `auditItem` seam (shared `batch_id` → `traceId`), pure RFC-4180 `toCsv` serializer, and the AC7b Open/Closed invariant (zero `operationType` branching, proven behaviorally + structurally). Registry ships seeded empty; two divergent test-only fixture operations exercise the harness — no real operation, no `apps/api` route, no migration, no new RBAC key. `packages/contracts/src/bulk-operations/` DTOs (pure Zod, `.strict()`, snake_case) + `emit-openapi.ts` component registration + `openapi/v1.yaml` regen (components only, no paths — mirrors the Story 1.7/1.8 precedent). Domain unit tests (32), contracts tests (16), and a live-DB integration test (`traceId` membership + dry-run zero-audit-rows) all green; `pnpm ci:local`'s 28 static jobs green. |
| 2026-07-30 | `/code-review` pass (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Found and patched the itemRef/scope-locator collision (undermining AC4 audit-line distinctness + AC7 divergence keying — proven against the shipped fixtures) via a new optional `BulkOperation.itemId` contract method; made `auditItem` required in execute mode (`BulkAuditItemRequiredError`); extended per-item fault isolation to `targetLocatorOf`/`evaluate`/`csvRow` (previously only `apply` was isolated); fixed `checkPermission` to use the per-item `locator.dimension` instead of the static `op.scopeDimension`; reordered the registry-lookup/cap checks; fixed `requestPayloadHash` to hash the item (not the outcome); changed the out-of-scope audit `responseStatus` to 403; tightened the contracts `reason` field to a `z.discriminatedUnion` (structurally required/forbidden per outcome, matching the domain shape — `openapi/v1.yaml` regenerated); added a registry duplicate-registration guard; neutralized CSV formula-injection (OWASP); truncated error messages flowing into `reason`/CSV; added the AC8-mandated real-5001-item cap test; corrected AC1's signature text + a misleading Dev Agent Record claim. 14 patches applied, all independently re-verified (`pnpm ci:local` 28/28, domain 1243 tests, contracts 707 tests, live-DB isolation 2/2, openapi determinism confirmed). 7 lower-priority findings deferred to `deferred-work.md`. |
