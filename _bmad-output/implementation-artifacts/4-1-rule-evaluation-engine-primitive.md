---
baseline_commit: 39438d831cb386ff1ae3f209f51ad83d03dd526e
---

# Story 4.1: Rule Evaluation Engine Primitive (Niyamavali Clause Interpreter + Provenance)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder authoring the rule-evaluation engine that downstream rules (R7, R8, R5/R9, R12) all consume,
I want a rule-evaluation engine that interprets Niyamavali clauses (resolved by `clause_id` + effective-date OR exact `clause_version_id` per Story 2.3) and returns evaluation results with full per-clause provenance,
so that downstream rule evaluations are deterministic, replay-reproducible, and auditable to the exact rule version used.

**Story label:** `[PRIMITIVE]` — substrate building block. This story ships the ENGINE (the interpreter + result shape + provenance + snapshot-resolution + idempotency + audit wiring). It ships **no production rule logic** — the R7/R8/R5/R9/R12 clause payloads are authored by Stories 4.2–4.5 as registry data the engine interprets. Prove the engine here against a **representative fixture clause**, not the full rulebook.

## Acceptance Criteria

**AC1 — Engine API + `EvaluationResult` shape + NO hardcoded rule logic**
1.1 The engine is authored in a NEW package `packages/niyamavali-engine` (`@twt/niyamavali-engine`) that depends on `@twt/domain`.
1.2 The engine exposes `evaluate(clauseId, context)` and `evaluateAt(clauseId, context, evaluationTimestamp)` — the latter uses `getMemberStateAt(memberId, timestamp)` (Story 3.1) plus the Niyamavali version **effective at that timestamp** (`resolveByClauseId(db, pariwarId, clauseId, timestamp)`), for replay-correct historical evaluation.
1.3 The engine returns an `EvaluationResult`: `{ result, provenance: { clause_id, clause_version_id, payload_hash, evaluated_at, inputs_summary }, sub_clause_results[], reason_code }`.
1.4 The engine has **NO hardcoded rule logic** — every rule branch is interpreted from the clause `payload` JSONB. Adding a new **rule** means adding a new clause to the registry, never changing engine code. (Adding a new interpreter **primitive/operator** to the rule vocabulary is an additive, registered engine extension that must not alter the evaluation of any existing rule — see Dev Notes "Interpretation model & the NO-hardcoded-logic contract".)

**AC2 — Snapshot resolution (FR-8 folded here)**
2.1 When evaluating a rule for an existing member whose `lock_in_days_at_join` was snapshotted at signup (Story 3.6b), the engine resolves the lock-in policy from the member's **snapshot** (the `lock_in_policy_version` `clause_version_id` on the `member.lock_in_entered` event → `resolveByClauseVersionId`), NOT from the current `niy.lock-in.policy` version.
2.2 New graduations to a different lock-in policy do NOT retroactively re-lock existing members.
2.3 The same snapshot-resolution seam applies to any future versioned-policy rule — the engine reads `lock_in_days_at_join` (or an analogous snapshot field) and resolves accordingly.

**AC3 — Idempotency caching + audit logging**
3.1 The result is cached (Story 1.12 idempotency keyed store + AR-58) by an idempotency key composed of `(member_id, rule_clause_id, evaluation_timestamp)` PLUS the member's state-at-timestamp hash AND the Niyamavali version hash; identical re-evaluations return the cached result.
3.2 Every evaluation (compute) is audit-logged via Story 1.10 (`writeAuditEntry`) with the full provenance.

## Tasks / Subtasks

- [x] **Task 1 — Scaffold `packages/niyamavali-engine` (`@twt/niyamavali-engine`)** (AC: 1.1)
  - [x] Mirror `packages/events/` scaffold: `package.json` (`"name": "@twt/niyamavali-engine"`, `"type": "module"`, `"main": "./src/index.ts"`, scripts `build`/`lint`/`typecheck`/`test`/`dev` identical to events), `tsconfig.json` (extends `../../tsconfig.base.json`, `outDir: dist`, `include: [src/**, tests/**]`).
  - [x] Dependencies: `"@twt/domain": "workspace:*"`, `"drizzle-orm": "^0.45.0"`, `"zod": "^3.23.0"`. Dev deps: `@twt/eslint-config-twt`, `@types/node`, `@types/pg`, `pg`, `typescript`, `vitest` (copy versions from `packages/events/package.json` verbatim).
  - [x] `src/index.ts` barrel exporting the public API (`evaluate`, `evaluateAt`, the pure `interpretClause`, and all result/context types).
  - [x] Run `pnpm install` at the repo root so the workspace link resolves; confirm `pnpm --filter @twt/niyamavali-engine typecheck` and `... lint` are green on the empty scaffold.
- [x] **Task 2 — `EvaluationResult` / `EvaluationContext` type contracts** (AC: 1.3)
  - [x] Define `EvaluationContext` (`pariwarId`, `memberId`, and an extensible `facts` bag for rule inputs like `death_classification` that 4.2–4.5 populate — keep it `CanonicalJsonValue`-typed so it hashes deterministically).
  - [x] Define `EvaluationResult`, `RuleOutcome` (the `result` discriminant — carry an optional `special_flags[]` seam so 4.4's `concealment_review_required` slots in WITHOUT an engine change), `SubClauseResult`, and the `Provenance` shape exactly per AC1.3. TS field names camelCase; if any of these become JSONB or transport, keep JSONB keys snake_case (naming discipline, `clause_versions.ts:17-22`).
  - [x] `provenance` carries `benefitMechanism` (read from the resolved clause row) — §1.13 Hook 1 requires every eligibility-check audit line to record which mechanism it served.
- [x] **Task 3 — Pure interpreter core `interpretClause(payload, resolvedContext) → EvaluationResult`** (AC: 1.3, 1.4)
  - [x] PURE + DETERMINISTIC + IDEMPOTENT — no `Date.now()`, no `new Date()`, no `Math.random()`, no mutable module state, no I/O (mirror `member/state.ts:reduce` + `deriveLockInClock`). Time is passed IN (DB-authoritative), never read.
  - [x] Validate the payload with a Zod schema that reads ONLY the interpreter-vocabulary fields it consumes; use `.passthrough()` for the structural display keys the seed carries (`rule_code`, `title_en`, `provisional`, `benefit_mechanism`) — mirror `ima-list.ts` / `lock-in.ts` `.safeParse` + passthrough discipline. A malformed/unknown payload yields a typed `reason_code` (e.g. `rule.payload_unrecognized`), never a throw.
  - [x] `sub_clause_results[]` and any provenance collections are emitted in a **stable, explicitly-sorted order** — never hash-map iteration order (determinism epic; see Dev Notes).
  - [x] Compute `payload_hash` = SHA-256 hex over `canonicalJsonStringify(payload)` (`@twt/domain` `canonicalJsonStringify` — the single system canonicalizer; NEVER a bespoke `JSON.stringify`).
- [x] **Task 4 — DB shell `evaluateAt` + `evaluate`** (AC: 1.2, 2.x, 3.x)
  - [x] `evaluateAt(deps, clauseId, context, evaluationTimestamp)`: resolve the clause version effective at `evaluationTimestamp` (`resolveByClauseId(db, pariwarId, clauseId, evaluationTimestamp)`); resolve member state (`getMemberStateAt(db, memberId, evaluationTimestamp)`); apply snapshot resolution (Task 5) where the payload declares it; call `interpretClause`; then cache (Task 6) + audit (Task 7).
  - [x] `evaluate(deps, clauseId, context)` = resolve DB-authoritative `now()` ONCE (a `SELECT now()` — §1.11; NEVER an app-server `new Date()`), then delegate to `evaluateAt(..., dbNow)`. Document that live-`evaluate` cache hits are rare by design (the timestamp advances) — the real per-cohort live cache is Story 4.8; 4.1's memo is for replay/idempotent re-evaluation of a FIXED timestamp.
  - [x] The engine takes its collaborators via a `deps` object (DI): the scoped `Db` (RLS set via `withPariwarScope`), the idempotency `KeyedStore`, and the audit `servicePool`. Construct NOTHING (`new pg.Pool()` is a lint error outside `db.ts`; see `eslint-config-twt/index.js:67-121`). Clause-not-resolvable → typed result/error, not a throw into the caller (mirror `resolveImaList` returning `null` → caller maps).
- [x] **Task 5 — Snapshot-resolution seam (FR-8; lock-in exemplar)** (AC: 2.1, 2.2, 2.3)
  - [x] Read the member's lock-in snapshot via `getLockInClock(db, memberId, atTimestamp)` (returns `{ lockInDaysAtJoin, lockInPolicyVersion }`) — the `lockInPolicyVersion` is a `clause_version_id`.
  - [x] Resolve the EXACT snapshotted clause version with `resolveByClauseVersionId(db, pariwarId, lockInPolicyVersion)` — NOT `resolveByClauseId` (which returns the current version and would re-lock).
  - [x] Encode the seam generically: a payload that declares itself snapshot-resolved routes through this path; assert (test) that amending `niy.lock-in.policy` to a new version does NOT change an existing member's resolved policy.
- [x] **Task 6 — Idempotency memo (Story 1.12 keyed store)** (AC: 3.1)
  - [x] Compose the key: `rule-eval:v1:{pariwarId}:{memberId}:{clauseId}:{evaluationTimestampIso}:{memberStateHash}:{niyamavaliVersionHash}` where `memberStateHash` = SHA-256 over `canonicalJsonStringify` of the member state-at-timestamp (+ the `facts` used), and `niyamavaliVersionHash` = the resolved `clause_version_id` (or a hash over ALL resolved clause versions when >1 is resolved).
  - [x] Read-through: `getResult(key)` → if present, return the memoized `EvaluationResult` (a cache-hit is a REPLAY of an already-audited compute — do NOT re-audit). Else `claim(key, ttl)` → `interpretClause` → `recordResult(key, result)`. Size `ttl` per the keyed-store caller contract (`keyed-store.ts:37-42`).
  - [x] The keyed store COMMITS ITS OWN TX — integration tests assert idempotent behavior / membership, never global row counts ([[project_live_db_test_gotchas]]).
- [x] **Task 7 — Audit every compute (Story 1.10 `writeAuditEntry`)** (AC: 3.2)
  - [x] On each COMPUTE (cache-miss), call `writeAuditEntry(servicePool, { pariwarId, actorId, actorRole, action: 'rule.evaluate', resourceLocator, requestPayloadHash, responseStatus, traceId })`. `action` MUST be dotted lowercase (`rule.evaluate`); `requestPayloadHash` MUST be a SHA-256 hex DIGEST of the canonical inputs summary — **never** the payload itself (audit-poisoning guard, `write.ts:23-27, 104-106`).
  - [x] `resourceLocator` = the member (`member/{memberId}` or the clause locator) — an addressable target string.
  - [x] Design decision (confirm with BigDev if unclear): audit-on-compute, NOT audit-every-call. Recommended: audit-on-compute — the global hash-chain writer is serialized by an advisory lock, so auditing every read (including cache-hits) would serialize all reads; a cache-hit replays an already-audited evaluation, no new audit line needed.
- [x] **Task 8 — Determinism + tests** (AC: all)
  - [x] Pure unit tests (DB-free) for `interpretClause`: same `(payload, context)` → byte-identical `EvaluationResult` across repeated runs; `sub_clause_results` ordering stable; `payload_hash` reproducible; malformed payload → typed `reason_code`.
  - [x] Live-DB integration tests (`describe.skipIf(!hasDatabase)`, `setupLiveDb()`; harness per Dev Notes) for: clause resolution by effective-date vs exact version; snapshot resolution (amend-does-not-re-lock); idempotency memo (2nd identical `evaluateAt` returns cached); audit line written on compute.
  - [x] Register a representative FIXTURE clause in the test (a small structured payload demonstrating the interpreter) — do NOT add a production seed row (R7/R8/R9 payload logic is 4.2–4.5).
  - [x] All date math is calendar-correct (`setDate`/SQL `interval`) — NO fixed-ms day/year spans (`* 24*60*60*1000`, `86400000`). This is AI-3-1's target family; Epic 4's determinism gate turns a leap-year off-by-one into a P0.
- [x] **Task 9 — Wire the workspace + gates** (AC: 1.1)
  - [x] No `turbo.json` edit required — `pnpm-workspace.yaml` uses a `packages/*` glob so the new package is auto-discovered by both pnpm and Turbo.
  - [x] Confirm `pnpm --filter @twt/niyamavali-engine {lint,typecheck,test,build}` all pass; then run `pnpm ci:local` (the merge gate — mirrors all ci.yml jobs; integration needs `DATABASE_URL` on `:5433`) and reconcile green ([[project_ci_actions_suspension_local_mirror]]).
  - [x] The engine defines NO new rule table/seed → the Story 1.16d benefit-mechanism gate is unaffected. It READS `clause_versions.benefit_mechanism` and carries it in provenance/audit; do not add rule seed rows here.

## Dev Notes

### The one-sentence architecture

`clause_versions.payload` JSONB is stored **opaque** by the Story 2.3 registry (freeze row 14 — "the registry stores + structurally diffs + resolves it, but NEVER interprets it"). **This story is the FIRST and ONLY interpreter of that payload.** Everything else already exists: the registry resolvers, the member-state replay spine, the idempotency store, the audit writer, and the canonical-JSON hasher. Your job is the interpreter + the deterministic result/provenance shape + the wiring — not new infrastructure.

### Package placement (concrete) + the scaffold to copy

Create `packages/niyamavali-engine`. **`@twt/events` is your exact scaffold template** — it is the precedent for a package that layers on `@twt/domain`:

- `packages/events/package.json` → copy structure; rename to `@twt/niyamavali-engine`; deps `{ @twt/domain: workspace:*, drizzle-orm, zod }`; devDeps identical.
- `packages/events/tsconfig.json` → copy verbatim (extends `../../tsconfig.base.json`, `outDir: dist`, `include: [src/**, tests/**]`).
- Import from `@twt/domain` **by package name** (source-level resolution via `main: ./src/index.ts`; there are NO tsconfig path aliases). Confirmed import pattern: `import type { Db } from '@twt/domain'; import { schema } from '@twt/domain'; import { member } from '@twt/domain';` (`packages/events/src/*`).

Dependency direction is clean: `niyamavali-engine → domain` (and `events → domain`). Domain must NEVER import the engine (would recreate the turbo cycle domain already dodges with events). No cycle exists as long as the engine only reads FROM domain.

### The substrate you consume (exact signatures, all in `@twt/domain`)

| Need | Symbol | File | Notes |
|---|---|---|---|
| Current effective clause | `resolveByClauseId(db, pariwarId, clauseId, asOf?)` | `niyamavali/read.ts:26` | `asOf` defaults to DB `now()`; filters `deprecatedAt IS NULL` + `effective_date <= asOf`, max version. Returns `ClauseVersionRow \| null`. |
| Exact historical clause | `resolveByClauseVersionId(db, pariwarId, clauseVersionId)` | `niyamavali/read.ts:61` | The snapshot-resolution + replay path. |
| Member state at instant | `getMemberStateAt(db, memberId, atTimestamp)` | `member/read.ts:61` | Replays `events_log` ordered by `event_version` (NOT `occurred_at`) up to `atTimestamp`. Pure reducer underneath (`replayMemberState`). |
| Lock-in snapshot | `getLockInClock(db, memberId, atTimestamp)` → `{ enteredAt, lockInDaysAtJoin, lockInPolicyVersion }` | `member/read.ts:116` | `lockInPolicyVersion` is the snapshotted `clause_version_id`. |
| Idempotency memo | `createKeyedStore(pool, {clock?})` → `{ claim, recordResult, getResult }` | `idempotency/keyed-store.ts:104` | Claim/record/getResult; commits its own tx; TTL-based. Accessed via `@twt/domain` `idempotency` namespace. |
| Audit line | `writeAuditEntry(servicePool, input)` | `audit/write.ts:118` | Global hash chain, serialized by advisory lock, own tx, BYPASSRLS service pool. `action` dotted; `requestPayloadHash` = SHA-256 hex digest ONLY. |
| Canonical hash input | `canonicalJsonStringify(value)` + `CanonicalJsonValue` | `canonical-json.ts` (exported at `@twt/domain` top level) | RFC 8785 JCS subset; the SINGLE canonicalizer for every hash producer. Throws on `Date`/`bigint`/`undefined`/non-finite — convert `Date`→ISO string first. |
| Branded IDs | `clauseId()`, `memberId()`, `pariwarId()`, types `ClauseId`/`ClauseVersionId`/`MemberId`/`PariwarId` | `ids/index.ts` (`@twt/domain` `ids` namespace) | `ClauseId` is a slug (`niy.<section>.<clause>`), not a UUID. |
| Clause row shape | `ClauseVersionRow` (`payload: ClausePayload`, `benefitMechanism`, `clauseVersionId`, `effectiveDate`, `version`, `deprecatedAt`) | `schema/clause_versions.ts:174` | `payload` is `{ [k: string]: unknown }` — opaque; YOU give it meaning. |

**Precedent to mirror — the mini-interpreters that already read a clause payload:** `medical/ima-list.ts` (`resolveImaList`) and `member/lock-in.ts` (`resolveLockInPolicy`). Both: `resolveByClauseId` → `.safeParse` a narrow Zod schema (`.passthrough()`) → return `{ version: clauseVersionId, …consumed fields }`, `null` on unresolvable/malformed. Your engine **generalizes this** from "one field of one known clause" to "a declarative rule spec interpreted from any clause."

### Pure-core / DB-shell split (load-bearing)

Follow the domain's own pattern (`getMemberStateAt` → pure `replayMemberState`; `getLockInClock` → pure `deriveLockInClock`; audit writer → pure `computeAuditHash`):

- **Pure core** `interpretClause(payload, resolvedContext) → EvaluationResult` — deterministic, no I/O, no time reads. This is the determinism spine and the bulk of the unit tests.
- **DB shell** `evaluate` / `evaluateAt` — resolve clause + member state + snapshot + DB-`now()`, call the pure core, then memo + audit.

This keeps determinism unit-testable WITHOUT a DB and isolates the (own-committing) side effects.

### `EvaluationResult` / `EvaluationContext` (target shape)

```ts
interface EvaluationContext {
  pariwarId: PariwarId;
  memberId: MemberId;
  // Extensible, deterministically-hashable rule inputs (death_classification, etc.).
  // 4.2–4.5 populate the keys their rules need; keep values CanonicalJsonValue-typed.
  facts?: Record<string, CanonicalJsonValue>;
}

interface EvaluationResult {
  result: RuleOutcome;                 // engine-produced decision (see below)
  provenance: {
    clauseId: ClauseId;
    clauseVersionId: ClauseVersionId;
    payloadHash: string;               // sha256hex(canonicalJsonStringify(payload))
    evaluatedAt: Date;                 // DB-authoritative
    inputsSummary: CanonicalJsonValue; // PII-free, canonical, hashable summary of inputs
    benefitMechanism: 'pool' | 'reserve';  // §1.13 — from the resolved clause row
  };
  subClauseResults: SubClauseResult[]; // ordered, deterministic
  reasonCode: string;                  // machine-readable outcome (e.g. rule.eligible, rule.payload_unrecognized)
}
```

`RuleOutcome` must carry an optional `specialFlags: string[]` seam so Story 4.4's `concealment_review_required` flag is DATA, not an engine branch — the service produces a **flag**, never an auto-deny (SM-1 beat C7). Keep `result` a small structured discriminant now; 4.2–4.5 extend the vocabulary additively.

### Interpretation model & the NO-hardcoded-logic contract (AC1.4 — read carefully)

AC1.4's north star: **adding a new RULE = adding a new clause (data); it must never require an engine code change.** The honest engineering reading:

- **A rule instance** (R7(A), R8, the lock-in policy) is entirely DATA in `payload`. The engine interprets it. Zero engine change to add one.
- **An interpreter primitive/operator** (a comparison, a threshold check, a date-window computation) is a small, registered vocabulary the engine understands. Adding a NEW operator is an ADDITIVE engine extension that must not change how any existing clause evaluates. 4.2–4.5 each add exactly the operators their rules need.

**What IS allowed to be hardcoded (draw this line precisely):** the engine MAY hardcode interpreter SEMANTICS — the operator implementations, evaluation order, canonical result construction, and provenance generation. It must NEVER hardcode a business rule identified by clause id, rule code, or registry content. The operator registry itself is CODE, not data — do not misread AC1.4 as requiring the vocabulary to be data-driven too; the rule *instances* are data, the *interpreter* is code.

Design an extensible, registry-driven interpreter (e.g. a small operator registry keyed by a `payload.rule_kind`/op discriminator), NOT a `switch (clauseId)`. A `switch` on clause id or rule code IS the hardcoded-logic anti-pattern the freeze forbids. **Scope for 4.1:** ship the interpreter framework + a MINIMAL proven operator set, validated against a representative fixture clause. Do NOT try to pre-build the full R7–R12 vocabulary — those stories drive it. See the Questions section: confirm this framework-now / vocabulary-later scoping with BigDev.

The seeded clauses today (`packages/domain/seed/niyamavali-v1-clauses.sql`) are **provisional display-only stubs** (`rule_code`, `title_en`, one or two scalar hints, `provisional: true`) — they carry NO decision logic yet. So there is no complete real rule payload to interpret in 4.1; prove the engine against a fixture and let 4.2–4.5 amend the seeds with real interpreter payloads.

### Determinism requirements (Epic 4 IS the determinism epic)

Story 4.6 will run the same evaluation 100× across threads and fail CI as a **P0** on any byte-variance. Everything you build here must survive that. Mandatory:

- No `Date.now()` / `new Date()` / `Math.random()` in the pure core. Time is DB-authoritative (`SELECT now()` once in the shell) and passed in.
- Emit every collection (`subClauseResults`, provenance entries, `applicable_niyamavali_clauses` in 4.6) in an **explicitly sorted, stable order** — never `Object.keys()`/`Map` iteration order as the observable order. (`canonicalJsonStringify` already sorts object keys for HASHING; the observable array ordering is your responsibility.)
- Calendar-correct date math ONLY — `setDate` / SQL `interval`, never fixed-ms spans. Retro AI-3-1 targets exactly this family (bit 3.6b/3.7/3.8/3.10 in review); it becomes a P0 at Epic 4's gate. (The AI-3-1 CI gate is a BigDev pre-4.1 item and may not have landed yet — comply in code regardless.)
- Hash via `canonicalJsonStringify` + SHA-256 (`node:crypto`); convert `Date`→ISO string before canonicalizing (the canonicalizer throws on `Date`).

### TOCTOU / clause-resolution snapshot consistency (AI-3-2 + deferred-work W6)

For 4.1's single-clause `evaluate`, one resolution is fine. But shape the API so a future multi-rule evaluation (Story 4.6) can pin ONE `rule_registry_version` / resolution instant across all clause resolutions — under READ COMMITTED, two separate `resolveByClauseId` calls straddling a concurrent amendment publish (Story 2.4) produce a **mixed-provenance** result (this is deferred-work **W6**, whose named re-trigger is "if Epic 4 auditability requires row-level snapshot consistency"). `evaluateAt(ts)` already pins the instant; ensure `evaluate` snapshots `now()` ONCE and threads that single instant through every resolution. Walk the AI-3-2 pre-review checklist (`docs/domain-accessor-invariants.md`) for any new read path.

### Files: NEW vs UPDATE

- **NEW** `packages/niyamavali-engine/` (package.json, tsconfig.json, `src/index.ts`, `src/interpret.ts` [pure], `src/evaluate.ts` [shell], `src/types.ts`, `src/cache-key.ts`, `src/audit.ts`, plus `tests/`). All new; nothing existing is modified structurally.
- **UPDATE (minimal, additive)** none required in `@twt/domain` — every collaborator is already exported (`niyamavali`, `member`, `idempotency`, `audit`, `ids`, `canonicalJsonStringify`). If you find a needed accessor un-exported, ADD the export (don't inline-duplicate). Verify before assuming: the barrel is `packages/domain/src/index.ts`.
- **UPDATE** `pnpm-lock.yaml` regenerates on install (expected). Do NOT hand-edit.

### Testing requirements

- **Harness** (live-DB integration): `describe.skipIf(!hasDatabase)('… (:5433)', () => { setupLiveDb(); … })`. The domain test-utils live at `packages/domain/src/test-utils/integration-setup.ts` (`getTx`, `hasDatabase`, `setupLiveDb`) — NOT currently exported from the `@twt/domain` barrel. Simplest path: give the engine package its own thin `tests/` harness that connects to the same `:5433` DB via `createDb` from `@twt/domain` and seeds a fixture clause + member events; OR export the needed test-utils from domain if you prefer reuse (decide + note it). Seed FK targets (members row) as superuser BEFORE entering app scope; then `enterAppScope` to shed the Docker superuser's RLS bypass (pattern: `packages/domain/tests/integration/nominee/member-nominees.spec.ts`).
- **Own-committing writers** (idempotency store + audit writer both COMMIT their own tx) survive the per-test ROLLBACK envelope → assert membership / idempotent outcome / `>= baseline`, NEVER `=== count` ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]).
- **Assert at the enforcing layer** — test the engine functions directly, not only through an HTTP wrapper (retro AI-3-3).
- **Pure determinism** is the majority of coverage and needs no DB: repeated `interpretClause` → identical bytes; stable ordering; reproducible `payload_hash`; malformed payload → typed reason code.
- Merge gate: `pnpm ci:local` reconciled green ([[project_ci_actions_suspension_local_mirror]]); integration needs `DATABASE_URL` on `:5433` (`twt-test-pg` Docker).

### Project Structure Notes

**Variance (documented, intentional):** the architecture directory tree (`architecture.md:4273-4312`) lists `apps/api/src/modules/rules/` (registry admin surface, Story 2.4) and `apps/api/src/modules/validity/` (FR-12A Member Validity Service SURFACE, Story 4.6) but does NOT list a `packages/niyamavali-engine`. The epic's Story 4.1 AC explicitly mandates `packages/niyamavali-engine`. Rationale for following the epic: the engine is a pure substrate PRIMITIVE consumed by multiple surfaces (the 4.6 validity service AND Epic 6 claim filing), so it belongs in `packages/` not inside one app; a distinct package also cleanly enforces the freeze-row-14 seam (registry SHAPE in `@twt/domain`, INTERPRETATION in `@twt/niyamavali-engine`). The `apps/api/modules/validity` + `apps/api/modules/rules` entries remain correct for their SURFACES; this engine is the primitive beneath them. No architecture-doc edit required (architecture commits properties, not exhaustive package lists — [[feedback_architecture_vs_prd_boundary]]); note the variance in the Dev Agent Record.

Naming discipline (`clause_versions.ts:17-22`): DB columns snake_case, TS fields camelCase, JSONB keys snake_case. Branded IDs mandatory for new `*Id` types.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1] — AC verbatim (L1883-1906); Epic 4 framing + freeze rows 11/14 + AR-7/57/58 (L1865-1881).
- [Source: _bmad-output/planning-artifacts/architecture.md#1.11 Database-authoritative time] (L1083-1101) — evaluation timestamps from DB, not app clock.
- [Source: _bmad-output/planning-artifacts/architecture.md#1.13 Hook 1] (L1135-1149) — `benefit_mechanism` on every eligibility-check audit line; replay deterministic across mechanism additions.
- [Source: _bmad-output/planning-artifacts/architecture.md#Directory structure] (L4273-4312) — validity/rules surfaces; engine-package variance.
- [Source: packages/domain/src/niyamavali/read.ts] — `resolveByClauseId` (L26), `resolveByClauseVersionId` (L61).
- [Source: packages/domain/src/schema/clause_versions.ts] — opaque `payload` + freeze row 14 (L59-99); `benefitMechanismEnum` (L57).
- [Source: packages/domain/src/member/read.ts] — `getMemberStateAt` (L61), `getLockInClock`/`deriveLockInClock` (L93-134).
- [Source: packages/domain/src/member/lock-in.ts] — snapshot-resolution precedent (`resolveLockInPolicy` L58; "new graduations do NOT re-lock" L12-15).
- [Source: packages/domain/src/medical/ima-list.ts] — clause-payload resolver precedent (`.safeParse` + `.passthrough`).
- [Source: packages/domain/src/idempotency/keyed-store.ts] — `createKeyedStore` / `claim` / `recordResult` / `getResult` (L104); TTL contract (L37-42).
- [Source: packages/domain/src/audit/write.ts] — `writeAuditEntry` (L118); dotted `action` + digest-only `requestPayloadHash` (L90-110).
- [Source: packages/domain/src/canonical-json.ts] — `canonicalJsonStringify` (single system canonicalizer).
- [Source: packages/events/package.json + tsconfig.json] — the leaf-package-on-domain scaffold to copy.
- [Source: packages/domain/seed/niyamavali-v1-clauses.sql] — provisional display-only R7(A)/R8/R9/lock-in/ima/concealment stubs.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#W6] — TOCTOU between clause resolutions; Epic-4 auditability re-trigger.

## Previous Story Intelligence (Epic 3 retro — 2026-07-03)

Story 4.1 is the FIRST story of Epic 4 (no in-epic predecessor). The Epic 3 retro (`epic-3-retro-2026-07-03.md`) was authored to hand off directly into 4.1:

- **Seams shaped deliberately for Epic 4** (retro §5/§6): `3.1 getMemberStateAt` = the replay spine for `evaluate`/`getValidityAt`; `3.6b lock_in_days_at_join` snapshot = the snapshot-resolution pattern (AC2); `3.8 vyawastha_shulk_status` payload = what FR-12A consumes (4.6); `3.9 is_retirement/retired_at` = read by 4.5 with no migration. `epics.md` Epic 4 stands as written — no epic-update needed.
- **AI-3-1 (hard pre-4.1 item): ban fixed-ms calendar date math.** The exact family (`* 24*60*60*1000`) bit 3.6b/3.7/3.8/3.10 and was caught only in review each time. Epic 4's 100×-thread determinism gate turns it into a P0. Use `setDate`/SQL `interval`. The gate itself is BigDev-owned and may not have landed — comply in code regardless.
- **AI-3-2: walk the TOCTOU/concurrency checklist** (`docs/domain-accessor-invariants.md`) for every new read path (read-then-write / `23505`→typed-409 / 0-row-UPDATE / SAVEPOINT). Ties to deferred-work W6 for clause-resolution snapshot consistency.
- **AI-3-3: test-runbook failure shapes** — assert at the enforcing layer (direct accessor, not only HTTP), seed real rows, cross-tenant isolation for RLS write paths.
- **Integrity discipline** ([[feedback_record_unattested_no_backfill]]): if the p95/perf or determinism claims can't be measured in 4.1, record them as aspirational/deferred with a named re-trigger (p95<200ms is Story 4.6's measured commitment, NOT 4.1's) — do not overclaim.
- **Epic 4 does NOT exercise live signup** (retro §8.3) — AI-3-4 launch-Pariwar provisioning checklist is launch-time, not 4.1-blocking.

## Git Intelligence

Recent commits (3.10→3.12) are Epic-3 DPDPA/lifecycle work merged via per-story branches (`story/3-XX-*` → PR → merge to `main`). Pattern to follow ([[project_story_automator_ops]]): commit manually on a `story/4-1-*` branch with selective staging (not the `commit-story` helper); the working tree currently carries the modified `sprint-status.yaml` (this story flip) + the new epic-3 retro. No prior 4.x code exists — this is greenfield for the epic. Domain accessors added across Epic 3 (`getMemberStateAt`, `getLockInClock`, `resolveLockInPolicy`, `resolveImaList`) are the exact seams this engine composes.

## Project Context Reference

- Substrate: `@twt/domain` (Drizzle schema + RLS + accessors + branded IDs + `canonicalJsonStringify`). Engine depends on it; domain must never depend back.
- Live-DB testing: `twt-test-pg` Docker on `:5433`; `pnpm ci:local` is the merge gate (GitHub Actions suspended — local mirror) ([[project_ci_actions_suspension_local_mirror]], [[project_live_db_test_gotchas]]).
- Determinism/replay is the Epic 4 through-line; §1.11 DB-authoritative time governs every timestamp.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- `evaluate()` live path: drizzle `db.execute(sql\`SELECT now()\`)` result-shape ambiguity (rows-vs-array, Date-vs-string) surfaced only under the live-DB spec. Hardened `selectDbNow` to tolerate both shapes; the value is DB-authoritative regardless (it originates from the DB clock). All 21 engine tests green on `:5433`.
- `pnpm ci:local` reconciliation (merge gate, [[project_ci_actions_suspension_local_mirror]]): all 16 static jobs ✓ + `integration-tests` ✓ (filtered subset incl. `@twt/niyamavali-engine`, ran green). The `test (unit)` step flaked ONCE — an artifact of `DATABASE_URL` being exported for the whole ci:local invocation, which makes EVERY package's own-committing live-DB spec run concurrently under load ([[project_known_livedb_test_failures]] concurrent-load family). Confirmed innocent: `pnpm turbo run test` is green WITHOUT `DATABASE_URL` (26/26 — matches the real CI `test` job env) AND green on re-run WITH `DATABASE_URL`; the engine's own spec is stable at 21/21 across 3 isolated runs (not the flaker).

### Completion Notes List

Implemented the rule-evaluation engine primitive as a NEW leaf package `@twt/niyamavali-engine` (depends on `@twt/domain`; domain never depends back — no turbo cycle). All 9 tasks + 3 ACs satisfied.

**Interpretation model (AC1.4).** The pure `interpretClause` is a registry-driven interpreter, NOT a `switch (clauseId)`. A rule INSTANCE is entirely DATA in the opaque `clause_versions.payload`; the operator REGISTRY is CODE (the interpreter vocabulary). Even `decision` + the `reasonCode` suffix are payload-derived (`on_pass`/`on_fail`), so adding a rule = adding a clause with zero engine change. Shipped the FRAMEWORK + a MINIMAL proven operator set (`member_state_in`, `fact_equals`, `fact_in`, `fact_gte`), validated against a representative fixture clause — 4.2–4.5 ADD the R7/R8/R5/R9/R12 operators their rules need.

**Two story-flagged decisions — proceeded on the recommended defaults (both come with clear rationale in the story; not ambiguous):**
- *Framework-now / vocabulary-later scoping* (Task 3): shipped the interpreter framework + minimal operators only, not the full R7–R12 vocabulary. Matches the story's explicit "Do NOT pre-build the full vocabulary."
- *Audit-on-compute, NOT audit-every-call* (Task 7): a cache-HIT replays an already-audited compute → not re-audited (the global hash-chain writer is advisory-lock-serialized; auditing every read would serialize all reads). The idempotency-memo integration test asserts exactly one `rule.evaluate` audit line across two identical evaluations.

**Snapshot resolution (AC2).** A payload declaring `snapshot_resolution: 'lock_in'` routes through `getLockInClock` → `resolveByClauseVersionId` (the EXACT snapshotted `lock_in_policy_version`), NOT `resolveByClauseId` (current). Resolved snapshot values enter `facts` under reserved `snapshot.*` keys (rule-agnostic operators read them). Integration test proves amending `niy.lock-in.policy` V1→V2 does NOT change an existing member's resolved policy, and provenance records the snapshotted version, not the current one.

**Determinism (Epic 4 through-line).** Pure core has no clock/random/mutable-state; time is passed IN. Every collection emitted in explicit stable (payload array) order. All hashes via `canonicalJsonStringify` + SHA-256. No fixed-ms calendar math (AI-3-1) — the engine does no date arithmetic; the DB owns the instant.

**Deviation from the Dev Notes target shape (documented):** `provenance.evaluatedAt` is an ISO-8601 **string**, not a `Date`. The canonicalizer rejects `Date`, and the memoized result round-trips through JSON (idempotency store) — an ISO string is the only byte-stable, replay-reproducible representation. This is the determinism-correct choice, consistent with the canonicalizer's own Date→ISO rule.

**Package-placement variance (per Dev Notes, no architecture-doc edit):** the architecture directory tree lists `apps/api/modules/{rules,validity}` surfaces but not `packages/niyamavali-engine`; the epic AC mandates the package. Followed the epic — the engine is a pure substrate PRIMITIVE consumed by multiple surfaces (4.6 validity, Epic 6 claim filing), so it belongs in `packages/` and cleanly enforces the freeze-row-14 seam (registry SHAPE in `@twt/domain`, INTERPRETATION here). Architecture commits properties, not exhaustive package lists.

**Integrity note:** No perf/p95 claim made — p95<200ms is Story 4.6's measured commitment, not 4.1's. The idempotency memo here is for replay/idempotent re-evaluation of a FIXED timestamp; the per-cohort live cache is Story 4.8 (live-`evaluate` cache hits are rare by design — the timestamp advances).

**CI wiring:** added `--filter=@twt/niyamavali-engine` to the integration-tests job in both `.github/workflows/ci.yml` and `scripts/ci-local.sh` — without it the engine's live-DB specs would skip in the unit job (no DATABASE_URL) and be excluded from the integration job.

Tests: 16 pure DB-free unit tests (interpret determinism/flags/malformed/vocabulary + cache-key) + 5 live-DB integration specs (effective-date resolution, clause-unresolvable→null, snapshot amend-does-not-re-lock, idempotency-memo + no-re-audit, live `evaluate()` DB-now). 21/21 green on `:5433`.

### File List

**NEW — `packages/niyamavali-engine/`:**
- `package.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`
- `src/index.ts` (public barrel)
- `src/types.ts` (result / context / provenance contracts)
- `src/interpret.ts` (PURE interpreter core + operator registry)
- `src/evaluate.ts` (DB shell `evaluate`/`evaluateAt` + snapshot seam)
- `src/cache-key.ts` (idempotency memo key composition)
- `src/audit.ts` (audit-on-compute wrapper)
- `src/hash.ts` (SHA-256 hex helper)
- `tests/interpret.test.ts` (pure determinism)
- `tests/cache-key.test.ts` (pure key composition)
- `tests/integration/evaluate.spec.ts` (live-DB `:5433`)

**MODIFIED:**
- `.github/workflows/ci.yml` (integration-tests filter += `@twt/niyamavali-engine`)
- `scripts/ci-local.sh` (integration-tests filter += `@twt/niyamavali-engine`)
- `pnpm-lock.yaml` (regenerated by `pnpm install` — new package link)

## Review Findings

> **Note: Edge Case Hunter layer timed out — review ran on Blind Hunter + Acceptance Auditor only.**

- [x] [Review][Decision] **AC3.2 — Lost-claim-race fallback calls `interpretClause` without `auditCompute` or `recordResult`** — RESOLVED: accepted. Claim owner is the sole authoritative auditor; lost-claim-race fallback is conceptually a cache-miss wait, not an independent auditable compute. No change. [evaluate.ts:190-192]
- [x] [Review][Decision] **AC2.3 — Snapshot-resolution seam hardcoded to `'lock_in'`; a second snapshot type requires an engine code change** — RESOLVED: accepted. The lock-in exemplar is the correct 4.1 scope; extensibility via a `snapshotResolvers` registry is deferred to the story that introduces a second snapshot type. No change. [evaluate.ts:136]
- [x] [Review][Decision] **§1.13 Hook 1 — `benefitMechanism` not present in the `audit_log_entries` row** — RESOLVED: patch. Add `benefit_mechanism` to `buildInputsSummary` so it is captured in `requestPayloadHash` and the audit row is self-contained for §1.13 without a DB schema change. → converted to patch below. [audit.ts:46-55, interpret.ts:142-153]
- [x] [Review][Patch] **`recordResult` called before `auditCompute` — if `auditCompute` throws, result is permanently cached without an audit line for the full TTL** — FIXED: swapped order to `auditCompute` first, then `recordResult`. Audit failure now prevents caching; next caller re-computes and re-audits. [evaluate.ts:176-183]
- [x] [Review][Patch] **§1.13 Hook 1 — `benefit_mechanism` added to `buildInputsSummary`** — FIXED: `benefit_mechanism: clause.benefitMechanism` added to the canonical inputs summary, captured in `requestPayloadHash` and therefore in the `audit_log_entries` row. [interpret.ts:149]
- [x] [Review][Defer] **Malformed per-operator arguments (e.g. `{ op: 'fact_equals' }` missing `fact`/`value`) silently evaluate to `false` instead of `rule.payload_unrecognized`** [interpret.ts:92-95] — deferred, pre-existing design: the "malformed payload" contract in the spec covers the outer envelope (rule_kind, all_of, on_pass, on_fail); per-operator argument validation is not required. A misconfigured `fact_equals` silently denies, which is the safer failure mode in a financial context. Re-trigger: if a misconfigured rule produces unexplained denials and the author cannot diagnose from `subClauseResults`.

## Change Log

| Date | Change |
|---|---|
| 2026-07-03 | Story 4.1 implemented: `@twt/niyamavali-engine` rule-evaluation engine primitive (pure interpreter + operator registry, DB shell `evaluate`/`evaluateAt`, snapshot resolution, idempotency memo, audit-on-compute). 21/21 tests green on `:5433`. Status → review. |
| 2026-07-03 | Code review: 3 decision-needed, 1 patch, 1 defer, 6 dismissed. Edge Case Hunter timed out. |
