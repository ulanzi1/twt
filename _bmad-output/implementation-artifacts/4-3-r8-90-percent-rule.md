---
baseline_commit: 5ad5e6a1e8318faa130130bd8beed657ec1330ee
---

# Story 4.3: R8 90% Rule (with R8(A) Skip-Allowance, R8(B) Mid-Contribution Death)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the rule evaluation engine processing a 90% rule evaluation,
I want R8 (the illness-death eligibility gate) plus R8(A) (1-skip-per-year allowance if prior compliance was 100%) and R8(B) (mid-contribution death) implemented as registry-driven clauses consumed by the engine primitive (Story 4.1),
so that the 90% rule and its sub-clauses evaluate deterministically, are registry-driven, and survive Niyamavali amendments — with zero hardcoded rule logic in the engine.

## Acceptance Criteria

Verbatim from `epics.md#Story 4.3` (L1925–1941), decomposed into testable ACs.

**AC1 — R8, R8(A), R8(B) clauses authored in the registry (data), each interpretable by the 4.1 primitive**
1. Three clauses are allocated with stable IDs `niy.ninety-percent-rule.r8`, `niy.ninety-percent-rule.r8-a`, `niy.ninety-percent-rule.r8-b`, each in `packages/domain/seed/niyamavali-v1-clauses.sql`, each tagged `benefit_mechanism = 'pool'`, `provisional: true`, `policy_review_required: true` (FR-10 threshold-review caveat). The existing provisional `r8` stub (`0e1c0002…`) is **upgraded in place** from display-only to a real rule spec; `r8-a` / `r8-b` are **added**.
2. Each clause's `payload` carries its decision logic as a **real interpretable `rule_kind: 'conditional'` spec** (`all_of[]` preconditions over facts + `on_pass` / `on_fail` outcome slugs), plus structured parameters (`threshold_percent: 90`, `min_contributions: 10`, skip-allowance / mid-contribution flags) as passthrough JSONB data.
3. The engine evaluates each clause via the Story 4.1 primitive (`evaluate` / `evaluateAt` → `interpretClause`) against the member's contribution + claim **facts**; the result **identifies**, each with its own per-sub-clause provenance (`clause_id` + `clause_version_id` + PII-free inputs summary): (a) whether **R8 applies** (illness ∧ `total_count >= 10` gate), (b) the **90% computation** (the `compliance_percent >= 90` sub-condition outcome), (c) whether **R8(A)** skip-allowance applies, (d) whether **R8(B)** mid-contribution death applies.

**AC2 — R8 illness-only gate + NO hardcoded rule logic (AC1.4 carried from 4.1)**
4. **R8 applies only to illness deaths, not accidents** — enforced **as data** via a `claim.death_classification == 'illness'` precondition in each R8 clause payload (read from `context.facts`), **not** a hardcoded engine branch. An accident-classified death fails the R8 preconditions and yields `r8_not_applicable`.
5. **NO hardcoded rule logic:** every R8 branch is interpreted from the clause `payload`. The **default is ZERO engine-code change** — R8's vocabulary is already covered by the existing `OPERATORS` registry (`[fact_equals, fact_gte, fact_lt, fact_in, member_state_in]`). If (and only if) a genuine gap is found, the sole permitted engine change is **additively** registering a new operator (with the `OPERATOR_NAMES` vocabulary-assertion test updated). There is **no** `switch (clauseId)` / `switch (ruleCode)`; the `decision` + `reasonCode` come from the payload (`on_pass` / `on_fail`).

**AC3 — determinism (AR-57) + R8-family ladder resolution ("which R8 sub-clause applied")**
6. Given the same `(member_id, facts, niyamavali_versions)`, evaluating twice yields byte-identical output — same `reason_code`, same `provenance` (incl. `payload_hash`), same `sub_clause_results` **ordering** (explicit/stable, per the Story 4.6 order invariant — never hash-map iteration order). A representative scenario matrix (each sub-clause applicable + boundary values + "no R8 applies" + malformed) each evaluates deterministically; malformed / unrecognised payload returns a typed `reason_code`, never a throw (carried from 4.1).
7. Given facts that satisfy more than one R8 sub-clause precondition (e.g. a mid-contribution death that also has a single skip, or a base-90%-met member who is also a mid-contribution death), the applicable sub-clause is resolved by a **payload-encoded `precedence` field** (data, not a hardcoded order) — deterministically and reproducibly. This is **R8-family-scoped**; the general cross-**family** ordered `provenance_trace[]` (R8 vs R7 vs R5/R9, per epics AC "all applicable rules evaluated in deterministic order") is **Story 4.6** (FR-12A Validity Service), not this story — comply with stable ordering, do not build the cross-family orchestrator here.

## Tasks / Subtasks

- [x] **Task 1 — Confirm the interpreter vocabulary covers R8 (NO new operator expected)** (AC: 5, 4)
  - [x] Verify every R8 / R8(A) / R8(B) precondition maps to an existing operator: illness gate → `fact_equals` (`claim.death_classification == 'illness'`); ≥10 gate → `fact_gte` (`contribution.total_count >= 10`); 90% gate → `fact_gte` (`contribution.compliance_percent >= 90`); single-skip → `fact_equals` (`contribution.skips_current_year == 1`); prior-100% → `fact_equals` (`contribution.prior_period_full_compliance == true`); mid-contribution → `fact_equals` (`claim.mid_contribution_death == true`). **All covered — the expected outcome is that `interpret.ts` is UNCHANGED and the `OPERATOR_NAMES` vocabulary test is UNCHANGED** (contrast Story 4.2, which added `fact_lt`).
  - [x] **Only if** a genuine gap surfaces (e.g. an "at most N skips" bound preferred over exact-equals — note `fact_lt max:2` already expresses "≤ 1"), add the operator **additively** (mirror `fact_gte` / `fact_lt` shape + PII-free `detail` = fact KEY only) and extend the `OPERATOR_NAMES` assertion. Record the addition + why in the Dev Agent Record. **Do not add speculative operators.**
- [x] **Task 2 — Author the R8 / R8(A) / R8(B) clause payloads (data)** (AC: 1, 2, 3, 4)
  - [x] In `packages/domain/seed/niyamavali-v1-clauses.sql`: **upgrade** `niy.ninety-percent-rule.r8`'s payload (the `0e1c0002…` INSERT, currently `{"rule_code":"R8","threshold_percent":90,"provisional":true}`) from the display stub to a real `rule_kind: 'conditional'` spec — **keep its `clause_version_id` (`0e1c0002-0000-4000-8000-000000000002`) and its `effective_date`** (it's version-1 fixture content, not applied-migration SQL — edit in place; no new version row). **ADD** `r8-a` and `r8-b` as two new `clause_versions` INSERTs (`version = 1`, `pariwar_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'`, `ON CONFLICT DO NOTHING`). Pre-allocated `clause_version_id`s (continuing the `0e1c00xx` block after `0e1c000c` = r7-g):
    - `r8-a`: `0e1c000d-0000-4000-8000-00000000000d`
    - `r8-b`: `0e1c000e-0000-4000-8000-00000000000e`
    - **`effective_date`:** use `'2025-01-01T00:00:00+00:00'::timestamptz` for both — the same date as the r8 base (family-consistent; choose a different date only if there is an intentional versioning reason).
    - **INSERT block position:** add a new `-- Story 4.3` INSERT block directly after the existing block that ends with `ON CONFLICT (clause_version_id) DO NOTHING;` on ~line 120 (the block containing r8/r9 + Story 3.5 clauses), and before the `-- Story 4.2` R7 block at line ~122. Mirror the R7 block structure exactly: comment header (provisional-policy note + illness-only gate + benefit_mechanism note + idempotent note) followed by the INSERT with `r8-a` and `r8-b` as the two VALUE rows.
  - [x] Every new/updated INSERT carries `benefit_mechanism = 'pool'` (the `benefit-mechanism` CI gate's `seed_globs = niyamavali-*.sql` has **teeth** — a missing/invalid tag fails the gate).
  - [x] Each payload: `all_of[]` preconditions over `contribution.*` / `claim.*` facts, `on_pass` = eligibility-path slug, `on_fail` = `r8_not_applicable`, structured params, `precedence` (int), `family: 'r8-ninety-percent'`, `policy_review_required: true`, `provisional: true`. Use the concrete design in Dev Notes §"R8 clause payload design". Add a seed comment block (mirror the Story 4.2 R7 block at `niyamavali-v1-clauses.sql:122-144`) noting the provisional precedence/threshold + the illness-only gate.
- [x] **Task 3 — R8-family ladder evaluator** (AC: 3, 7)
  - [x] **NEW** `packages/niyamavali-engine/src/r8-ladder.ts` — mirror `src/r7-ladder.ts` (read it in full first). Pure core `evaluateR8Ladder(resolvedClauses[], ctx): R8LadderResult` interprets the three clauses via `interpretClause`, sorts by `clause_id`, marks each `applied` (decision === payload `on_pass`), and picks the applicable one by the **payload `precedence`** (DATA — a pure reduce; ties → lowest `clause_id`). DB shell `evaluateR8LadderAt(deps, ctx, at)` + `evaluateR8LadderLive(deps, ctx)`.
  - [x] **W6 / AI-3-2 — single DB instant across all three resolutions (CRITICAL):** the shell MUST pin ONE instant — call `selectDbNow(db)` **once** (it is **already exported** from `evaluate.ts` by Story 4.2 — `import { evaluateAt, selectDbNow, type EvaluateDeps } from './evaluate.js'`, no re-export needed), then call `evaluateAt(deps, clauseId, ctx, at)` for each R8 clause with that same `at`. Do **not** call `evaluate()` per clause (each does its own `SELECT now()` → multiple instants). Resolve `precedence` from the payload via `niyamavali.resolveByClauseId(db, pariwarId, clauseId, at)` at the SAME `at` (the documented read-amplification, [[CR-4.2-D1]] — inherited, not a new concern).
  - [x] Reuse the exact ladder result shape from R7: `R8LadderResult` = `{ perClauseResults, applicableClauseId, applicableResult, missingClauseIds }`, `R8ClauseEvaluation` = `{ clauseId, applied, result }`. **Carry the 4.2 review hardening forward** (do not regress): `missingClauseIds` populated when `evaluateAt` returns null; the meta schema uses `precedence: z.number()` (NOT `.int()` — trustee amendments may be non-integer); `on_pass` refined `!== 'r8_not_applicable'` (swap-guard). Export all of it from `src/index.ts`.
  - [x] Keep this **R8-family-scoped**. The cross-family ordered trace (R8 vs R7 vs R5/R9) is Story 4.6 — do not import/build it. See Dev Notes §"Ladder resolution & the 4.6 boundary".
- [x] **Task 4 — Contribution + claim fact contract (the Epic 8/9 seam)** (AC: 1, 3, 4)
  - [x] Define + export the R8 fact keys as **two named `as const` objects** in `src/r8-ladder.ts` (single source of truth for the future producer + the tests), per Dev Notes §"R8 fact contract":
    - `R8_CONTRIBUTION_FACT_KEYS` — 2 net-new contribution keys: `{ COMPLIANCE_PERCENT: 'contribution.compliance_percent', PRIOR_PERIOD_FULL_COMPLIANCE: 'contribution.prior_period_full_compliance' } as const`
    - `R8_CLAIM_FACT_KEYS` — 2 claim keys: `{ DEATH_CLASSIFICATION: 'claim.death_classification', MID_CONTRIBUTION_DEATH: 'claim.mid_contribution_death' } as const`
    - **REUSE** `R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT` and `.SKIPS_CURRENT_YEAR` (import from `r7-ladder.ts` — do not redefine the string literals). The fixture file imports all three: `R7_CONTRIBUTION_FACT_KEYS` (for the two shared keys) + `R8_CONTRIBUTION_FACT_KEYS` + `R8_CLAIM_FACT_KEYS` (for the four new keys). Export both R8 constants from `src/index.ts` alongside the R7 block.
  - [x] Do **NOT** build a contribution/claim fact reader or SQL derivation — **no source system exists** (contributions are Story 9.x; `data-export/assemble.ts:20` confirms "no source system at Epic 3"). Facts are **caller-supplied** via `EvaluationContext.facts`; the producer is Epic 8/9, assembled by the 4.6 Validity Service. The engine **never infers these facts** ([[project_engine_never_infers_contribution_facts]]) — in particular it does **NO** percentage/date arithmetic (`compliance_percent` arrives pre-derived; calendar-correct derivation, AI-3-1, is the producer's job).
- [x] **Task 5 — Determinism + scenario tests (AR-57)** (AC: 6, 7)
  - [x] **NEW** `packages/niyamavali-engine/tests/fixtures/r8-clauses.ts` (mirror `fixtures/r7-clauses.ts`): the three R8 payloads keyed by `clause_id`, the keyed `R8_VERSION_IDS` record (`Readonly<Record<string, string>>`), a `NO_R8_FACTS` base set under which no clause applies — all keyed off the exported fact-key constants. Import line: `import { R8_CONTRIBUTION_FACT_KEYS, R8_CLAIM_FACT_KEYS, R8_CLAUSE_IDS } from '../../src/index.js'` and `import { R7_CONTRIBUTION_FACT_KEYS } from '../../src/index.js'` for the two reused keys (`TOTAL_COUNT`, `SKIPS_CURRENT_YEAR`).
  - [x] **NEW** `packages/niyamavali-engine/tests/r8-ladder.test.ts` — pure DB-free scenario matrix (mirror `r7-ladder.test.ts`): one applicable fixture per sub-clause (R8 base 90%-met; R8(A) skip-allowance; R8(B) mid-contribution); **overlap-by-precedence** (base-met + mid-death → R8(B) wins; single-skip + prior-100% + <90% → R8(A) rescues); **the illness-only gate** (accident classification → `applicableClauseId` null even at 100% compliance); **boundary values** (`compliance_percent` 89 vs 90; `total_count` 9 vs 10; `skips_current_year` 1 vs 0/2); "no R8 applies"; malformed payload (typed reason, not applied) + malformed facts (no throw); byte-identical repeated eval; clause/fact insertion-order invariance; reproducible per-clause `payload_hash`.
  - [x] **NEW** `packages/niyamavali-engine/tests/integration/r8-ladder.spec.ts` — one live-DB spec (`:5433`, `describe.skipIf(!hasDatabase)`), mirror `integration/r7-ladder.spec.ts` exactly: `createDb` + own-committing `deps` (NO `enterAppScope`), `seedClause` the three R8 clauses + `seedActiveMember`, evaluate with injected facts, assert applicable sub-clause + provenance (**incl. `provenance.clauseVersionId`** — AC1.3, the 4.2 review patch) + audit-on-compute membership (`afterFirst - before >= 1`) then **zero re-audit** on identical re-eval (`afterSecond - afterFirst === 0`). Own-committing writer → assert membership, never `=== count` ([[project_live_db_test_gotchas]]).
- [x] **Task 6 — Gate + merge reconciliation**
  - [x] **UPDATE** `scripts/benefit-mechanism/seed-records.test.ts`: bump `expect(records).toHaveLength(12)` → **`14`**, add `'niy.ninety-percent-rule.r8-a'` and `'niy.ninety-percent-rule.r8-b'` to the sorted `ids` array assertion, and update the descriptive comment (`+ 2 Story-4.3 R8(A)/R8(B) clauses`). `r8` base is already counted (upgraded in place, id unchanged). Run `pnpm benefit:check` (gate green with teeth) + `pnpm benefit:test`.
  - [x] `pnpm --filter @twt/niyamavali-engine lint | typecheck | test` (with `DATABASE_URL` on `:5433`); then `pnpm ci:local` reconciled green (merge gate — GitHub Actions suspended; [[project_ci_actions_suspension_local_mirror]]). The engine integration filter is already wired (`ci.yml:556` includes `@twt/niyamavali-engine`) — **no CI change expected**. Do **not** hand-edit `pnpm-lock.yaml`.

### Review Findings

Multi-layer review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) run against the uncommitted diff (baseline `5ad5e6a1`). Acceptance Auditor: zero AC violations found (clean pass against AC1–AC3 and Dev Notes). 18 unique findings surfaced across the other two layers; 7 patch, 5 defer, 6 dismissed as noise (0 decision-needed).

- [x] [Review][Patch] Add an integration test exercising `missingClauseIds` (a sub-clause absent or not-yet-effective at `at`) — currently only exercised as always-`[]` by construction (all 3 clauses seeded in every test) [packages/niyamavali-engine/tests/integration/r8-ladder.spec.ts]
- [x] [Review][Patch] Add an overlap test: base R8 (90%-met) + R8(A) applicable together, R8(B) absent (precedence 40 > 30) — only the all-three-overlap and pairwise-with-R8(B) scenarios are covered [packages/niyamavali-engine/tests/r8-ladder.test.ts]
- [x] [Review][Patch] Add an isolated boundary test for R8(A)'s `prior_period_full_compliance` (true vs. false with `skips_current_year === 1` and the other preconditions satisfied) — only `skips_current_year` (0/1/2) is boundary-tested [packages/niyamavali-engine/tests/r8-ladder.test.ts]
- [x] [Review][Patch] Add direct test coverage for `evaluateR8LadderLive` — it's exported from the public barrel but only its sibling `evaluateR8LadderAt` is exercised by any test [packages/niyamavali-engine/src/r8-ladder.ts]
- [x] [Review][Patch] Add a precedence tie-break test for the R8 family (two clauses with equal `precedence` via payload override → lowest `clause_id` wins) — all three shipped precedences (30/40/50) are distinct, so `selectApplicable`'s tie-break branch is unexercised [packages/niyamavali-engine/tests/r8-ladder.test.ts]
- [x] [Review][Patch] Tighten the "audits each clause compute" integration assertion from `afterFirst - before >= 1` to `=== 3` (one audit per sub-clause, per the loop in `evaluateR8LadderAt`) — as written the test would pass even if only 1 of 3 clause computes were actually audited [packages/niyamavali-engine/tests/integration/r8-ladder.spec.ts:734-744]
- [x] [Review][Patch] Remove the unused `R8_FIXTURE_CLAUSE_IDS` export, or wire it into the "fixtures cover exactly the three family clause ids" sanity check its own comment describes — currently referenced by no test [packages/niyamavali-engine/tests/fixtures/r8-clauses.ts]
- [x] [Review][Defer] R8-base "upgrade in place" silently no-ops on any DB where `clause_version_id 0e1c0002` was already seeded, since it sits inside the same `INSERT ... ON CONFLICT (clause_version_id) DO NOTHING` block — only a pristine/never-seeded DB actually receives the new conditional payload [packages/domain/seed/niyamavali-v1-clauses.sql:25-41] — deferred, pre-existing (identical pattern already used for R7-A's stub-upgrade in Story 4.2, CR-4.3-D1)
- [x] [Review][Defer] `evaluateR8LadderAt` makes 6 sequential DB round trips per ladder evaluation (`evaluateAt` + `resolveByClauseId` per clause) instead of batching/parallelizing [packages/niyamavali-engine/src/r8-ladder.ts] — deferred, pre-existing (documented inherited read-amplification, [[CR-4.2-D1]]; CR-4.3-D2)
- [x] [Review][Defer] Each R8 payload duplicates its operative `all_of` threshold as a separate descriptive field (`threshold_percent`, `min_contributions`, `skips_allowed`, `requires_prior_full_compliance`) with no mechanism keeping them in sync [packages/domain/seed/niyamavali-v1-clauses.sql] — deferred, pre-existing (same pattern established by R7's payloads in 4.1/4.2; CR-4.3-D3)
- [x] [Review][Defer] Integration test `afterAll` cleanup omits `events_log`, the projected `members` row, and `audit_log_entries` rows (only `clause_versions` and `idempotency_keys` are deleted) [packages/niyamavali-engine/tests/integration/r8-ladder.spec.ts] — deferred, pre-existing (established own-committing test convention, [[project_live_db_test_gotchas]]; CR-4.3-D4)
- [x] [Review][Defer] `seed-records.test.ts`'s benefit-mechanism gate validates record count + id membership only, not shape (`rule_kind`, `precedence`, `on_pass`/`on_fail`, `benefit_mechanism`) — a malformed new record with the right `id` would pass undetected [scripts/benefit-mechanism/seed-records.test.ts] — deferred, pre-existing (same convention used by every prior story's version of this gate; CR-4.3-D5)

Dismissed as noise (6): `on_fail` "dead data" claim (false positive — consumed by `interpretClause` in the unchanged Story 4.1 primitive, outside this diff's scope); `r7-ladder.ts`/`r8-ladder.ts` duplication with no shared abstraction (explicit pre-confirmed Decision §3 — mirror, don't extract until the 3rd consumer); no precedence-uniqueness guard (tie-break is already deterministic by design); TS/SQL string-literal coupling on `r8_not_applicable` (structural to the registry-as-data design, not a defect); `as Facts` casts in test fixtures (low practical risk — wrong values would fail the decision assertions anyway); sprint-status ledger narrating multiple phase transitions under one `development_status` flip (matches documented project convention, [[project_sprint_status_ledger]]).

## Dev Notes

### The one-sentence architecture

Story 4.3 is a **`[CONSUMER]`** — the direct sibling of Story 4.2 (R7): it delivers R8 / R8(A) / R8(B) as **DATA** (three registry clauses) + a thin **R8-family ladder resolver**, all interpreted by the Story 4.1 engine primitive with **zero `switch`-on-rule logic**. Unlike 4.2 it adds **no new interpreter operator** (the vocabulary already covers R8). It does **not** build contribution/claim data plumbing — only registry-driven *evaluation* of caller-injected facts. **The load-bearing seam: the engine *evaluates* facts; it never *derives* them — a different compliance calculation is a producer change, never an engine change.**

### The substrate you consume (Stories 4.1 + 4.2 — already shipped)

`@twt/niyamavali-engine` (`packages/niyamavali-engine/`). **Read `src/interpret.ts`, `src/evaluate.ts`, and `src/r7-ladder.ts` in full before starting** — `r7-ladder.ts` is the exact template you mirror.

- **Pure core** `interpretClause(clause, ctx)` (`src/interpret.ts`): interprets a `rule_kind: 'conditional'` payload — iterates `all_of[]`, runs each condition's `op` against the `OPERATORS` registry, ANDs the results, maps `allPassed ? on_pass : on_fail` → `result.decision` + `reasonCode: 'rule.<decision>'`. Emits `subClauseResults[]` in **payload-array order** (each carries the op + `passed` + a PII-free `detail` = fact KEY / observed state, never a fact VALUE). Unknown op / malformed payload → `reason_code: 'rule.payload_unrecognized'`, **never a throw**. `OPERATORS` today: `member_state_in`, `fact_equals`, `fact_in`, `fact_gte`, `fact_lt` (`src/interpret.ts:82-125`); `OPERATOR_NAMES` (sorted, exported) at `:128`.
- **DB shell** `evaluate` / `evaluateAt` (`src/evaluate.ts`): resolves the clause version effective at the single DB-authoritative instant via `niyamavali.resolveByClauseId`, resolves member state via `member.getMemberStateAt`, merges `context.facts`, injects reserved `snapshot.*` facts where the payload declares `snapshot_resolution`, then interprets + memoizes + **audits-on-compute** (a cache-HIT replays, does NOT re-audit — `evaluate.ts:169-195`). DI `deps` object (`db`, `keyedStore`, `servicePool`); the engine **constructs nothing** (`new pg.Pool()` outside `db.ts` is a lint error). `selectDbNow(db)` is **exported** (`evaluate.ts:92`) — reuse it in your shell.
- **R7 ladder** `src/r7-ladder.ts` (Story 4.2): the exact shape you replicate for R8 — pure `evaluateR7Ladder` + shell `evaluateR7LadderAt` / `evaluateR7LadderLive`, `R7LadderResult` / `R7ClauseEvaluation` types, `R7_CLAUSE_IDS`, `R7_CONTRIBUTION_FACT_KEYS`, `R7_NOT_APPLICABLE`, and the private ladder primitives (`parseR7Meta`, `isApplied`, `selectApplicable`, `toLadderResult`, `byClauseId`). See §"Ladder implementation approach" for how to reuse this. **R8 counterpart:** `R8_CLAUSE_IDS = ['niy.ninety-percent-rule.r8', 'niy.ninety-percent-rule.r8-a', 'niy.ninety-percent-rule.r8-b'] as const` (three entries, stable sort order).
- **Facts** (`src/types.ts:24`): `Facts = Record<string, CanonicalJsonValue>` — caller-supplied rule inputs (the doc-comment names `death_classification` as an exemplar). **This is your R8 seam.** Values may be PII-bearing but only DIGESTS/KEYS leave the engine.
- Public barrel `src/index.ts` — add your ladder evaluator + fact-contract exports here (alongside the R7 exports at `:15-25`).

### The NO-hardcoded-logic contract (AC1.4 — carried from 4.1/4.2)

- A rule INSTANCE (R8, R8(A), R8(B)) is entirely **DATA** in `payload`. Adding/re-tuning one = a clause change, zero engine change.
- The illness-only gate is **data** (`claim.death_classification == 'illness'` in the payload), not a hardcoded `if (accident)` branch.
- **Forbidden:** `switch (clauseId)` / `switch (ruleCode)`, or any branch keyed by registry identity/content. The `decision` + `reasonCode` come from the payload; ladder precedence is **payload data** (`precedence`).
- **R8 adds no operator by default** — 4.2 added `fact_lt`; 4.3's vocabulary is already complete. This is a signal the operator set is stabilising; do not pre-build speculative operators (that IS the 4.1 discipline: "not the place to pre-build vocabulary").

### R8 fact contract (the Epic 8/9 seam — READ THIS)

**The architectural seam future contributors are most likely to blur — state it plainly: the engine *evaluates* facts; it never *derives* them. If a future policy requires a different compliance calculation, the producer changes, not the engine.**

**Invariant — the engine never infers contribution/claim facts** ([[project_engine_never_infers_contribution_facts]]). It only *reads* pre-derived facts handed in via `EvaluationContext.facts`; it never counts contributions, computes the compliance percentage, or classifies the death. Deriving those is exclusively the fact PRODUCER's job (Epic 8/9 + claim intake, assembled by the 4.6 Validity Service). **Contribution/claim events do not exist yet** (Story 9.x; Epic 6 claim intake) — 4.3 defines the **contract** and tests against **injected synthetic facts** (exactly as 4.2 did for R7). Do **NOT** build a reader.

Define as two exported `as const` objects (`R8_CONTRIBUTION_FACT_KEYS` + `R8_CLAIM_FACT_KEYS`); **reuse** the two shared R7 keys (import from `r7-ladder.ts`), define the four net-new keys:

| fact key | type | meaning | used by | source |
|---|---|---|---|---|
| `contribution.total_count` | int | lifetime confirmed contributions | R8 / R8(A) `>= 10` gate | **REUSE** `R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT` |
| `contribution.skips_current_year` | int | missed cycles in the current year | R8(A) `== 1` | **REUSE** `R7_CONTRIBUTION_FACT_KEYS.SKIPS_CURRENT_YEAR` |
| `contribution.compliance_percent` | number (0–100) | pre-derived % of expected contributions made | R8 base `>= 90` (the "90% computation") | **NEW** |
| `contribution.prior_period_full_compliance` | bool | prior year was 100% compliant | R8(A) `== true` | **NEW** |
| `claim.death_classification` | string enum (`'illness'` \| `'accident'` \| …) | classification of the death (Epic 6 claim intake) | R8 / R8(A) / R8(B) illness gate `== 'illness'` | **NEW** |
| `claim.mid_contribution_death` | bool | died after a contribution alert was published, before its deadline | R8(B) `== true` | **NEW** |

- **The "90% computation" is a pre-derived fact, not an engine calculation.** `contribution.compliance_percent` arrives already computed; R8 base only checks `fact_gte >= 90`. The AC's "identifies … the 90% computation" is satisfied by the base-R8 clause's `subClauseResults` entry for that condition (pass/fail with the fact KEY in `detail`) — the engine surfaces the *outcome* of the threshold check, never the arithmetic.
- **Namespaces:** contribution-history facts under `contribution.*`; death-circumstance facts (classification, mid-contribution timing) under `claim.*`. (The `interpret.test.ts` fixture uses a bare `death_classification` illustratively — that is NOT the contract; use the namespaced `claim.death_classification`.)
- The synthetic fixtures are contractual **examples** pinning fact-key names/types/semantics — not a mock of the future producer. Don't let a fixture calcify into an implied producer contract beyond the keys themselves.

### R8 clause payload design (concrete — prevents wheel-reinvention)

Model each of R8 / R8(A) / R8(B) as its **own** self-contained `conditional` clause (mirror R7). `all_of` passes ⇒ that clause *applies* (its `on_pass` slug is the decision); fails ⇒ `r8_not_applicable`. Each sub-clause carries the **full** precondition (illness + ≥10 gate repeated) so it is independently interpretable. FR-10 (`prd.md:352-359`) + epics AC (`epics.md:1931-1941`):

| clause_id | precondition (`all_of`, over facts) | `on_pass` slug | precedence | params |
|---|---|---|---|---|
| `…r8`   | `claim.death_classification == 'illness'` ∧ `contribution.total_count >= 10` ∧ `contribution.compliance_percent >= 90` | `ninety_percent_met` | 30 | `{threshold_percent:90, min_contributions:10}` |
| `…r8-a` | `claim.death_classification == 'illness'` ∧ `contribution.total_count >= 10` ∧ `contribution.skips_current_year == 1` ∧ `contribution.prior_period_full_compliance == true` | `skip_allowance_granted` | 40 | `{skips_allowed:1, requires_prior_full_compliance:true}` |
| `…r8-b` | `claim.death_classification == 'illness'` ∧ `claim.mid_contribution_death == true` | `mid_contribution_eligible` | 50 | `{presumed_would_have_paid:true}` |

- **Operators used:** `fact_equals` + `fact_gte` (both existing). **No `fact_lt` / no new operator** unless you deliberately model R8(A) as "≤ 1 skip" (`fact_lt max:2`) instead of "== 1 skip" — the default is `fact_equals … 1` (mirrors R7(D)).
- **All three sub-clauses gate on `illness`** (AC2.4). This means an accident-classified death fails every R8 clause → `applicableClauseId` null → R8 does not apply (correct: accidents are out of R8's scope; accident eligibility is a separate path, not this story).
- **`on_fail = 'r8_not_applicable'` (shared slug, mirrors R7's `r7_not_applicable`).** The "R8 applies vs 90% failed" distinction is **not** lost: it is read from the **base-R8 clause's `subClauseResults`** — `illness` pass + `>= 10` pass + `>= 90` **fail** means "member IS subject to R8 but failed the 90% threshold (and no exception rescued them)", whereas `illness` fail or `>= 10` fail means "R8 does not apply at all". Story 4.6 reads `perClauseResults` for this; document it in `r8-ladder.ts`. (Alternative considered — a distinct `ninety_percent_not_met` on_fail for the base clause — is richer but breaks the uniform shared-slug pattern; see Decisions §5.)
- **`precedence` (data, provisional — flag for trustee tuning):** exceptions-win — R8(B) mid-contribution death (50, always eligible, "presumed would have paid") > R8(A) skip-allowance (40) > R8 base 90% gate (30). Rationale: when a member qualifies via multiple paths (both grant eligibility), report the more specific/exceptional reason. These ints are **provisional policy** — encode as data; note in the seed comment that the Trustee Panel tunes both the 90% threshold (FR-10 "reviewed at the 10/20/50 milestones") and precedence (`policy_review_required`).
  - **Precedence determines the surfaced *explanation*, NOT eligibility.** Every applied sub-clause already means "eligible"; the precedence pick only chooses which reason (provenance) is reported when several apply. R8(B) beating R8(A) is a provenance choice, not an eligibility change — do not treat `precedence` as eligibility policy (see Decisions §5). Put this in the `r8-ladder.ts` header comment so it survives future edits.
- **R8(A) semantics nuance to record:** FR-10 says "1 skip/year permitted **if prior compliance was 100%**"; the PRD glossary (`prd.md:167`) phrases it "1 missed contribution if prior compliance ≥ 90%". These differ (100% vs ≥90%). Encode the FR-10 canonical (`prior_period_full_compliance == true` ⇒ prior year 100%); note the glossary variance in the Dev Agent Record as an inherited-copy ambiguity for trustee clarification (`policy_review_required`), NOT an engine defect.
- **Out of scope (record, don't build):** R8 restoration/catch-up *satisfaction*, the actual contribution-cycle alert/deadline mechanics behind `mid_contribution_death`, and the producer that derives `compliance_percent` — all downstream (Epic 6 claim intake / Epic 8/9). 4.3 evaluates preconditions from facts only.
- Keep provisional display keys (`rule_code`, `title_en`, `provisional`) — `.passthrough()` tolerates them. snake_case JSONB keys.

### R8 ladder result type (export this — 4.6 will consume it)

Mirror `R7LadderResult` **exactly** (including the `missingClauseIds` field the 4.2 review added):

```typescript
export interface R8ClauseEvaluation {
  clauseId: string;          // e.g. 'niy.ninety-percent-rule.r8-a'
  applied: boolean;          // true iff this sub-clause's on_pass was chosen
  result: EvaluationResult;  // the full per-clause result from interpretClause
}

export interface R8LadderResult {
  perClauseResults: R8ClauseEvaluation[];   // sorted by clause_id (stable)
  applicableClauseId: string | null;        // highest-precedence applied clause, or null
  applicableResult: EvaluationResult | null;
  missingClauseIds: string[];               // R8 ids with no version effective at `at` (shell path)
}
```

Keep the pure `evaluateR8Ladder(resolvedClauses: ResolvedClause[], ctx: ResolvedEvaluationContext): R8LadderResult` signature compatible. Story 4.6 assembles the cross-family provenance trace from `applicableResult.provenance` — do not collapse it.

### Ladder implementation approach (mirror R7 — do NOT extract a generic ladder yet)

Copy the `r7-ladder.ts` pattern into a fresh `r8-ladder.ts` (R8-specific clause ids, fact keys, `R8_NOT_APPLICABLE = 'r8_not_applicable'`, and the ladder result types). The private ladder primitives (`parseMeta` via a `z.number()` precedence + `on_pass !== not_applicable` refine, `isApplied`, `selectApplicable` via strictly-greater precedence, `toLadderResult`, `byClauseId`) are small — **duplicate them into `r8-ladder.ts`**.

**Decision §3 (default taken): do NOT extract a shared generic `ladder.ts` in this story.** R8 is the *second* ladder consumer; extracting on the *third* (Story 4.4 R5/R9) follows the rule-of-three and keeps the freshly-merged, reviewed R7 code untouched (lower regression risk, tighter diff). The duplication is ~40 lines of pure, well-tested selection logic. Flag "extract generic ladder at 4.4" as a forward note. (If BigDev prefers extracting now — the R7 tests would catch a refactor regression — that's a valid override; see Decisions §3.)

### Ladder resolution & the 4.6 boundary

AC3 ("which R8 sub-clause applied" + "cross-rule interaction … deterministic order") requires an R8-**family** evaluation. Build it **thin and data-driven**, R8-family only:

- Pure `evaluateR8Ladder(resolvedClauses[], ctx)` interprets the three clauses (reusing `interpretClause`), collects `{clauseId, applied, result}` in stable `clause_id` order, and selects the applicable one by payload `precedence`. Shell `evaluateR8LadderAt` resolves the three clause versions at **one pinned instant** (`selectDbNow` once → `evaluateAt` per clause — W6 / AI-3-2) and memoizes/audits per clause via the reviewed 4.1 primitive.
- **Boundary:** the epics AC "all applicable rules are evaluated in deterministic order … provenance trace shows which rules fired in which order" spanning R8 **vs R7 vs R5/R9 vs accident-vs-illness classification** is **Story 4.6** (FR-12A Validity Service, `epics.md:1982-2003` — the order invariant it owns + the 100×-thread P0 gate). Do NOT build the cross-family orchestrator here. Comply with stable ordering; don't import 4.6.

### Determinism requirements (Epic 4 IS the determinism epic — carried from 4.1/4.2)

- Pure core: no `Date.now()` / `new Date()` / `Math.random()` / mutable module state. Time passed IN. 4.3 adds **no** date/percentage math (facts pre-derived).
- Every collection (`subClauseResults`, the ladder's per-clause list, the applicable selection) emitted in **explicit stable order** (sort by `clause_id`; `precedence` selection is a pure reduce, ties → lowest `clause_id`) — never `Object.keys()` / `Map` iteration order.
- Hash via `canonicalJsonStringify` + SHA-256; the per-clause memo key composition is the 4.1 `buildCacheKey` (unchanged — the shell drives `evaluateAt` per clause). Story 4.6 runs this family 100× across threads and fails CI as a **P0** on any byte-variance.

### "Property-based" test note (AR-57)

No `fast-check` in the repo. Match 4.1/4.2: determinism proven by **repeated evaluation → byte-identical bytes** across an explicit scenario matrix (representative + boundary), not a property-testing library. No new dependency (Decisions §6).

### Files: NEW vs UPDATE

- **NEW** `packages/niyamavali-engine/src/r8-ladder.ts` — pure `evaluateR8Ladder` + shell `evaluateR8LadderAt` / `evaluateR8LadderLive` + `R8_CLAUSE_IDS` (`['niy.ninety-percent-rule.r8', 'niy.ninety-percent-rule.r8-a', 'niy.ninety-percent-rule.r8-b'] as const`) + `R8_CONTRIBUTION_FACT_KEYS` + `R8_CLAIM_FACT_KEYS` + `R8LadderResult` / `R8ClauseEvaluation` + `R8_NOT_APPLICABLE`.
- **UPDATE** `packages/niyamavali-engine/src/index.ts` — export the R8 ladder API + fact-contract constants/types (mirror the R7 block): `evaluateR8Ladder`, `evaluateR8LadderAt`, `evaluateR8LadderLive`, `R8_CLAUSE_IDS`, `R8_CONTRIBUTION_FACT_KEYS`, `R8_CLAIM_FACT_KEYS`, `R8_NOT_APPLICABLE`, `type R8ClauseEvaluation`, `type R8LadderResult`.
- **UPDATE** `packages/domain/seed/niyamavali-v1-clauses.sql` — upgrade `r8` in place; add `r8-a`, `r8-b` (all `pool`); add the R8 seed comment block.
- **NEW** `packages/niyamavali-engine/tests/fixtures/r8-clauses.ts` — shared R8 payload fixtures (one source of truth for both specs).
- **NEW** `packages/niyamavali-engine/tests/r8-ladder.test.ts` — pure scenario-matrix determinism spec.
- **NEW** `packages/niyamavali-engine/tests/integration/r8-ladder.spec.ts` — live-DB integration spec (`:5433`).
- **UPDATE** `scripts/benefit-mechanism/seed-records.test.ts` — expect **14** seed records incl. `r8-a` / `r8-b` (gate seam).
- **NOT expected:** `interpret.ts` change (no new operator); `tests/interpret.test.ts` change (vocabulary unchanged); any `@twt/domain` source change (resolvers already exported); CI-config change (engine filter wired at 4.1); `pnpm-lock.yaml` edit. If any turns out necessary, record why in the Dev Agent Record.

### Project Structure Notes

- **Variance (carried from 4.1/4.2, intentional):** the engine lives in `packages/niyamavali-engine` (a substrate PRIMITIVE beneath the 4.6 validity surface + Epic 6 claim filing), not under `apps/api/modules/*`. No architecture-doc edit — architecture commits properties, not exhaustive package lists ([[feedback_architecture_vs_prd_boundary]], [[project_member_lifecycle_domain_substrate]]).
- The seed (`niyamavali-v1-clauses.sql`) is a **dev/staging fixture + the `benefit-mechanism` gate's teeth source** — NOT a migration (`ON CONFLICT DO NOTHING`, idempotent). Editing the provisional `r8` payload in place is correct (version-1 fixture content, not applied-migration SQL — no 42P07 risk [[project_live_db_test_gotchas]]). Integration tests seed their own clauses via `seedClause`, not by loading this file.
- Naming discipline (`clause_versions.ts:17-22`): DB columns snake_case, TS fields camelCase, JSONB payload keys snake_case. Branded IDs for any `*Id`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3] (L1925–1941) — AC verbatim; Epic 4 framing (L1865–1881); FR-10 anchor (L47); `clause_id` format `niy.ninety-percent-rule.r8` (L1453); Story 4.6 order invariant + 100×-thread P0 gate (L1982–2003).
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-10] (L352–359) — R8 "≥10 contributions; illness deaths only, not accidents"; R8(A) "1 skip/year if prior compliance 100%"; R8(B) "mid-contribution death → eligible"; glossary R8 (L167, note the 100% vs ≥90% phrasing variance).
- [Source: _bmad-output/implementation-artifacts/4-2-r7-contribution-discipline-rules.md] — the sibling-consumer pattern this story mirrors (Dev Notes, ladder design, Decisions, Dev Agent Record, review-hardening); `seed-records.test.ts` update precedent (12 records).
- [Source: packages/niyamavali-engine/src/r7-ladder.ts] — the ladder template: pure `evaluateR7Ladder` (L205–222), shell `evaluateR7LadderAt` (L238–271) + single-instant discipline, `missingClauseIds` (L108–115), meta schema `z.number()` + `on_pass` refine (L120–128), `isApplied`/`selectApplicable` (L146–174), fact-contract constant (L53–72).
- [Source: packages/niyamavali-engine/src/interpret.ts] — `OPERATORS` registry (L82–125), `OPERATOR_NAMES` (L128), `ConditionalRuleSchema` + `.passthrough()` (L139–148), stable-order loop + PII-free detail (L205–216).
- [Source: packages/niyamavali-engine/src/evaluate.ts] — `evaluate`/`evaluateAt` + `selectDbNow` **exported** (L92–104), single `SELECT now()` discipline, audit-on-compute-not-on-hit (L169–195), DI `deps` (L37–50).
- [Source: packages/niyamavali-engine/src/types.ts] — `Facts` seam (L24, `death_classification` exemplar), `EvaluationContext.facts` (L27–32), `RuleOutcome`/`SubClauseResult`/`Provenance`/`ResolvedClause` (L41–95).
- [Source: packages/domain/seed/niyamavali-v1-clauses.sql] — the provisional `r8` stub to upgrade (L42–49, `0e1c0002`); the R7 block to mirror (L122–202); `0e1c00xx` id block (last = `0e1c000c`); INSERT shape + `benefit_mechanism` column.
- [Source: packages/niyamavali-engine/tests/r7-ladder.test.ts + tests/fixtures/r7-clauses.ts + tests/integration/r7-ladder.spec.ts] — the exact test templates (pure matrix, keyed `VERSION_IDS` record, `NO_*_FACTS` base, live-DB `seedClause`/`seedActiveMember`, own-committing setup, no `enterAppScope`).
- [Source: benefit-mechanism.yaml + scripts/benefit-mechanism/seed-records.test.ts] — `seed_globs: niyamavali-*.sql` (teeth); `v1_permitted: [pool]`; the `toHaveLength(12)` + sorted-id assertion to bump to 14.
- [Source: packages/events/src/registry.ts (L10) + packages/domain/src/data-export/assemble.ts (L20)] — contribution events are Story 9.x; **no source system exists yet** (the fact seam).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — W6 (one-instant clause resolution, AI-3-2); CR-4.2-D1/D2 (ladder shell read-amplification / dual-resolve — inherited by R8's ladder, documented "NOT a TOCTOU"; do not re-litigate).

## Previous Story Intelligence (Story 4.2 — merged 2026-07-03, PR #61, baseline `5ad5e6a`)

4.2 shipped the R7 ladder — **the exact template for 4.3**:

- **`r7-ladder.ts` is your blueprint.** Mirror its pure-core / DB-shell split, its stable ordering, and its result shape. `selectDbNow` is **already exported** from `evaluate.ts` (4.2 exported it) — import and reuse; no need to re-export.
- **Carry the 4.2 review hardening forward (do not regress):** `R7LadderResult` gained `missingClauseIds` (populate when `evaluateAt` returns null) — mirror in `R8LadderResult`. The meta schema uses `precedence: z.number()` **not `.int()`** (a review fix — non-integer trustee amendments must not be silently dropped). `on_pass` is refined `!== not_applicable` (swap-guard). `R7_VERSION_IDS` is a **keyed `Record`**, not parallel arrays (review fix — compile-time coupling); make `R8_VERSION_IDS` a keyed record too.
- **Audit-on-compute, not audit-every-call:** a cache-HIT replays an already-audited compute → not re-audited. The integration test asserts membership after first eval, then **zero re-audit** across an identical second eval (all clause results cache hits).
- **`provenance.evaluatedAt` is an ISO-8601 string, not a Date** (the canonicalizer rejects `Date`; the memo round-trips through JSON). Keep this rep.
- **Engine does no date/percentage arithmetic** (facts pre-derived) — the pure core stays math-free and survives the 4.6 100×-thread gate. `compliance_percent` arrives computed.
- **Test gotchas** ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]): own-committing writers (idempotency store + audit) survive the ROLLBACK envelope → assert membership / `>= baseline`, never `=== count`. The `@twt/jobs` `member-renewal-lifecycle.test.ts` live-DB timeout under concurrent load is a **known-innocent** flake (passes in isolation ~655ms) — confirm engine-spec innocence by running it in isolation; the real CI `test (unit)` env (`DATABASE_URL` unset → live specs skip) is the source of truth.
- **Read-amplification is inherited, not new:** the R8 shell's dual-resolve (`evaluateAt` + a second `resolveByClauseId` for `precedence`) is the same design as R7 ([[CR-4.2-D1]]/[[CR-4.2-D2]]), documented "NOT a TOCTOU window" (same pinned `at`, immutable rows). Document it identically; do not re-litigate.

## Git Intelligence

- 4.2 landed via `story/4-2-r7-contribution-discipline-rules` → PR #61 → `main` (`5ad5e6a`). Follow the same pattern ([[project_story_automator_ops]]): branch `story/4-3-r8-90-percent-rule` off `main`, selective manual staging, no `commit-story` helper. `git fetch origin` before reasoning about `main` ([[feedback_git_fetch_before_remote_reasoning]]).
- The only 4.x code in the tree is `packages/niyamavali-engine/` (4.1 + 4.2). This story extends it additively (a new `r8-ladder.ts` sibling to `r7-ladder.ts`) — no other package needs structural change.

## Project Context Reference

- Substrate: `@twt/domain` (Drizzle schema + RLS + accessors + branded IDs + `canonicalJsonStringify`); engine depends on it, domain never depends back (no turbo cycle).
- Live-DB testing: `twt-test-pg` Docker on `:5433`; `pnpm ci:local` is the merge gate (GitHub Actions suspended — local mirror; [[project_ci_actions_suspension_local_mirror]]). Integration needs `DATABASE_URL` on `:5433`.
- Determinism/replay is the Epic 4 through-line; §1.11 DB-authoritative time governs every timestamp; the per-cohort live cache / freshness invariant is Story 4.8 (not here); the cross-family order invariant + `<MemberStatusPanel>` are Stories 4.6/4.7 (not here).

### Decisions (all six CONFIRMED by BigDev, 2026-07-03 — settled, listed for dev context)

1. **R8-family ladder evaluator lives in 4.3.** Build a thin, data-driven `evaluateR8Ladder` (satisfies AC3's "which R8 sub-clause applied"), bounded to the R8 family; the cross-family ordered trace stays 4.6. (Same call as R7 §1.)
2. **R8 adds ZERO new interpreter operators.** The existing vocabulary (`fact_equals`, `fact_gte`, `fact_lt`, `fact_in`, `member_state_in`) covers R8/R8(A)/R8(B); the default is **no `interpret.ts` change**. Add an operator only on a proven gap (additive + `OPERATOR_NAMES` test).
3. **Mirror the R7 ladder pattern into `r8-ladder.ts`; do NOT extract a shared generic `ladder.ts` yet.** R8 is the 2nd ladder consumer; extract on the 3rd (Story 4.4 R5/R9 — rule of three), keeping reviewed R7 code untouched. (Override option: extract now — R7 tests guard the refactor.)
4. **Contribution + claim facts are caller-injected; no producer built in 4.3.** Define the fact contract, reuse the two shared R7 keys, add the four net-new keys; the producer is Epic 8/9 + Epic 6 claim intake via the 4.6 Validity Service. Namespaces: `contribution.*` (history) + `claim.*` (death circumstance). The engine never infers these facts.
5. **Payload semantics (provisional policy, `policy_review_required`, Trustee-tunable):** all three sub-clauses gate on `claim.death_classification == 'illness'`; `on_fail = 'r8_not_applicable'` (shared slug; the applies-vs-90%-failed distinction is read from base-R8 `subClauseResults`); precedence exceptions-win (R8(B) 50 > R8(A) 40 > R8 30); R8(A) encodes the FR-10 canonical "prior 100%" (glossary's "≥90%" variance flagged, not resolved).
   - **Precedence selects the surfaced *explanation* (provenance), not *who is eligible* (BigDev, confirmed).** Every sub-clause whose `on_pass` fires already means "eligible"; when a member qualifies via more than one path, the ladder pick only decides which reason is reported. R8(B) winning over R8(A) is a **provenance choice, not an eligibility change** — a future maintainer must **not** treat `precedence` as eligibility policy. (If precedence were ever mis-read as eligibility, the fix is to re-tune the DATA, never to add engine logic.)
6. **Property tests via scenario matrix (no `fast-check`)** — matches 4.1/4.2; no new dependency.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow, 2026-07-03.

### Debug Log References

- `pnpm benefit:check` → gate green with teeth (14 rule records; every record `pool`).
- `pnpm --filter @twt/niyamavali-engine lint | typecheck` → clean.
- `DATABASE_URL=…:5433 pnpm --filter @twt/niyamavali-engine test` → **71 passed** (7 files): `r8-ladder.test.ts` 21 pure + `integration/r8-ladder.spec.ts` 2 live-DB; `interpret.test.ts` 15 **UNCHANGED** (no operator change).
- `pnpm benefit:test` → 48 passed (`seed-records.test.ts` 4 + `lib.test.ts` 44).
- `DATABASE_URL=…:5433 pnpm ci:local` → **17/17 gates green EXCEPT `test (unit)`**. The `test (unit)` failure is the DOCUMENTED-INNOCENT `@twt/jobs member-renewal-lifecycle.test.ts` live-DB timeout under 26-package concurrent load when `DATABASE_URL` leaks into the unit job ([[project_known_livedb_test_failures]]).
  - **Innocence proof:** `env -u DATABASE_URL pnpm turbo run test --force` (the REAL CI `test (unit)` env — `DATABASE_URL` unset → live specs skip) = **26/26 tasks green, 0 failures** (engine `62 passed | 9 skipped`, the 9 = live-DB specs incl. the 2 new R8 ones). And `member-renewal-lifecycle.test.ts` in isolation WITH DB = **2/2 passed ~3.9s**. `integration-tests` job (engine live specs WITH DB) also passed. Untouched by this story.

### Completion Notes List

- **Task 1 (no new operator — CONFIRMED):** every R8/R8(A)/R8(B) precondition maps to an EXISTING operator (`fact_equals` for the illness gate + skip/prior/mid-death flags; `fact_gte` for the ≥10 and ≥90 thresholds). `interpret.ts` and the `OPERATOR_NAMES` vocabulary test are **UNCHANGED** (contrast 4.2 which added `fact_lt`). This confirms the operator set is stabilising — no speculative operators added.
- **Task 2 (clauses as DATA):** `niy.ninety-percent-rule.r8` **upgraded in place** from the display stub to a real `rule_kind:'conditional'` spec (kept `clause_version_id 0e1c0002…` + `effective_date 2025-01-01`); `r8-a` (`0e1c000d`) + `r8-b` (`0e1c000e`) **added** in a new Story-4.3 INSERT block (positioned after Story 3.6b, before Story 4.2), all `benefit_mechanism='pool'`, `provisional`, `policy_review_required`, `ON CONFLICT DO NOTHING`. Payloads per Dev Notes: base `[illness, total_count>=10, compliance_percent>=90] → ninety_percent_met` (prec 30); r8-a `[illness, >=10, skips==1, prior_period_full_compliance==true] → skip_allowance_granted` (prec 40); r8-b `[illness, mid_contribution_death==true] → mid_contribution_eligible` (prec 50); shared `on_fail='r8_not_applicable'`.
- **Task 3 (R8-family ladder):** NEW `src/r8-ladder.ts` **mirrors `r7-ladder.ts` exactly** — pure `evaluateR8Ladder` + shell `evaluateR8LadderAt`/`evaluateR8LadderLive` pinning ONE DB instant (`selectDbNow` once → `evaluateAt` per clause; the second `resolveByClauseId` for `precedence` runs at the SAME `at` → read-amplification, NOT a TOCTOU [[CR-4.2-D1]]). **Carried the 4.2 review hardening forward (no regression):** `R8LadderResult.missingClauseIds`, meta `precedence: z.number()` (NOT `.int()`), `on_pass !== 'r8_not_applicable'` swap-guard refine, `R8_VERSION_IDS` a keyed `Record`. Did NOT extract a shared generic `ladder.ts` (Decision §3 — R8 is the 2nd consumer; extract at 4.4 R5/R9 per rule-of-three). The `precedence-selects-explanation-not-eligibility` note (Decision §5) is written into the module header.
- **Task 4 (fact contract):** `R8_CONTRIBUTION_FACT_KEYS` (`compliance_percent`, `prior_period_full_compliance`) + `R8_CLAIM_FACT_KEYS` (`death_classification`, `mid_contribution_death`) defined as `as const` objects in `r8-ladder.ts`; **reused** `R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT`/`.SKIPS_CURRENT_YEAR` (imported in the fixtures, not redefined). All exported from `src/index.js`. **No reader/derivation built** — facts are caller-injected (Epic 8/9 + Epic 6 claim intake, via the 4.6 Validity Service); the engine does NO percentage/date arithmetic (`compliance_percent` arrives pre-derived) ([[project_engine_never_infers_contribution_facts]]).
- **Task 5 (tests):** NEW `fixtures/r8-clauses.ts` (three payloads keyed by clause_id + keyed `R8_VERSION_IDS` + `NO_R8_FACTS`), `r8-ladder.test.ts` (21 pure: one-applicable-per-sub-clause, overlap-by-precedence incl. all-three-overlap → R8(B) wins + R8(A) rescue-below-90%, illness-only gate accident→null even at 100%, base `subClauseResults` legibility of the failed 90% condition, boundaries 89/90 & 9/10 & skips 0/1/2, byte-identical/insertion-order/payload_hash determinism, malformed payload+facts never throw), `integration/r8-ladder.spec.ts` (2 live-DB: precedence ladder R8(B)>base with provenance incl. `clauseVersionId`; audit-on-compute then zero re-audit on identical re-eval).
- **Task 6 (gate + reconciliation):** `seed-records.test.ts` bumped `12→14` + added `r8-a`/`r8-b` to the sorted-id assertion. All gates reconciled green (see Debug Log).
- **AC coverage:** AC1 (clauses as interpretable data + per-sub-clause provenance + the "90% computation" surfaced via base `subClauseResults`) ✓; AC2 (illness-only gate AS DATA + zero hardcoded rule logic — no `interpret.ts` change, no `switch`) ✓; AC3 (byte-identical determinism + stable ordering + R8-family precedence resolution, cross-family trace left to 4.6) ✓.
- **Recorded, not resolved (per Dev Notes / Decision §5):** R8(A)'s FR-10 "prior compliance 100%" canonical is encoded (`prior_period_full_compliance == true`); the PRD glossary's "prior ≥90%" phrasing (`prd.md:167`) is an **inherited-copy ambiguity flagged for trustee clarification** (`policy_review_required`), NOT an engine defect. `precedence` selects the surfaced **explanation/provenance**, never eligibility.
- **No unexpected changes:** `interpret.ts` unchanged, `tests/interpret.test.ts` unchanged, no `@twt/domain` source change, no CI-config change (engine integration filter already wired at 4.1: `ci.yml:556`), `pnpm-lock.yaml` untouched.

### File List

- **NEW** `packages/niyamavali-engine/src/r8-ladder.ts`
- **UPDATE** `packages/niyamavali-engine/src/index.ts`
- **UPDATE** `packages/domain/seed/niyamavali-v1-clauses.sql`
- **NEW** `packages/niyamavali-engine/tests/fixtures/r8-clauses.ts`
- **NEW** `packages/niyamavali-engine/tests/r8-ladder.test.ts`
- **NEW** `packages/niyamavali-engine/tests/integration/r8-ladder.spec.ts`
- **UPDATE** `scripts/benefit-mechanism/seed-records.test.ts`
- **UPDATE** `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip + ledger)

## Change Log

| Date | Change |
|---|---|
| 2026-07-03 | Story 4.3 created (ready-for-dev) — R8 90% Rule + R8(A) skip-allowance + R8(B) mid-contribution death, as the R7-sibling `[CONSUMER]`: three registry clauses (`r8` upgraded in place, `r8-a`/`r8-b` added, all `pool`) + a thin `evaluateR8Ladder` family resolver interpreted by the 4.1 primitive, resolving overlap by payload `precedence`. No new interpreter operator (vocabulary already covers R8); illness-only gate + all decision logic as DATA; contribution/claim fact contract defined (caller-injected, no producer built); benefit-mechanism gate seam bumps 12→14. Zero `switch`-on-rule logic; no architecture/CI change expected. |
| 2026-07-03 | BigDev confirmed all 6 Decisions (settled, no longer "proposed"). Two clarifications folded in: (1) **precedence selects the surfaced explanation/provenance, NOT eligibility** — R8(B) beating R8(A) is a provenance choice, not an eligibility change; maintainers must not treat `precedence` as policy (recorded in Decisions §5, the precedence bullet, and directed into the `r8-ladder.ts` header). (2) The **rule-evaluation-vs-fact-production seam** stated plainly in the one-sentence architecture + the fact contract: "the engine evaluates facts; it never derives them — a different compliance calculation is a producer change, never an engine change." |
| 2026-07-03 | Story 4.3 implemented (ready-for-dev → review via bmad-dev-story). NEW `src/r8-ladder.ts` (pure `evaluateR8Ladder` + shell `evaluateR8LadderAt`/`Live` mirroring `r7-ladder.ts`; single pinned DB instant; `missingClauseIds` + `z.number()` precedence + swap-guard refine carried forward) + `R8_CONTRIBUTION_FACT_KEYS`/`R8_CLAIM_FACT_KEYS` (reusing the two shared R7 keys); barrel exports added. Seed: `r8` upgraded in place to a `conditional` spec (id `0e1c0002` + effective_date kept), `r8-a` (`0e1c000d`) + `r8-b` (`0e1c000e`) added (all `pool`, illness-only gate as DATA, precedence B50>A40>base30). NO `interpret.ts`/operator change (vocabulary already covers R8 — `fact_equals`+`fact_gte`). Tests: `fixtures/r8-clauses.ts` + `r8-ladder.test.ts` (21 pure) + `integration/r8-ladder.spec.ts` (2 live-DB). Gate `seed-records.test.ts` bumped 12→14. Validation: engine 71/71 + benefit 48/48 green (DB :5433); `pnpm ci:local` 17/17 gates green except the DOCUMENTED-INNOCENT `@twt/jobs` unit-job concurrent-load flake (real CI unit env `env -u DATABASE_URL turbo run test` = 26/26 green; suspect spec passes 2/2 in isolation). No architecture/PRD/ADR/CI/`pnpm-lock` change. |
| 2026-07-03 | Validation pass (bmad-create-story validate): applied E1–E3 + N1–N2. **E1** — named the two fact-key constants explicitly (`R8_CONTRIBUTION_FACT_KEYS` / `R8_CLAIM_FACT_KEYS`) in Task 4, the fixture import note, the Dev Notes fact-contract, and the Files/index.ts export list. **E2** — listed `R8_CLAUSE_IDS` values explicitly in the substrate bullet and the Files section. **E3** — specified `effective_date = '2025-01-01T00:00:00+00:00'` for r8-a/r8-b (family-consistent; deviate only with intent). **N1** — expanded `aaaaaaaa-…` to the full UUID `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` in Task 2. **N2** — added SQL insertion-point guidance (new Story 4.3 INSERT block after line ~120, before the Story 4.2 R7 block). |
