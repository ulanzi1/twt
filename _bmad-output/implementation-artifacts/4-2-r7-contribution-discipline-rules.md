---
baseline_commit: a60edd4af5c2a04eadc6bcdc4a339149937962d7
---

# Story 4.2: R7 Contribution Discipline Rules (R7(A–G) Restoration Ladder)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the rule evaluation engine processing a member's contribution-discipline evaluation,
I want R7(A) through R7(G) restoration rules implemented as Niyamavali clause payloads consumed by the engine primitive (Story 4.1),
so that contribution-discipline evaluation is registry-driven, deterministic, and survives Niyamavali amendments — with zero hardcoded rule logic in the engine.

## Acceptance Criteria

Verbatim from `epics.md#Story 4.2` (L1908–1923), decomposed into testable ACs.

**AC1 — R7(A–G) clauses authored in the registry (data), each interpretable by the 4.1 primitive**
1. Seven clauses are allocated with stable IDs `niy.contribution-discipline.r7-a` … `niy.contribution-discipline.r7-g` (one per R7 letter), each in `packages/domain/seed/niyamavali-v1-clauses.sql`, each tagged `benefit_mechanism = 'pool'`, `provisional: true`, and `policy_review_required: true` (FR-9 re-tuning caveat).
2. Each clause's `payload` carries its restoration logic as a **real interpretable `rule_kind: 'conditional'` spec** (`all_of[]` preconditions over contribution facts + `on_pass`/`on_fail` outcome slugs), plus structured restoration parameters (skip threshold, restoration count / consecutive-required, time window, lock-in months, catch-up, one-time / lifetime cap) as passthrough JSONB data. The existing provisional `r7-a` stub is **upgraded** from display-only to a real rule spec; `r7-b`…`r7-g` are **added**.
3. The engine evaluates each R7 sub-clause via the Story 4.1 primitive (`evaluate`/`evaluateAt` → `interpretClause`) against the member's contribution-discipline **facts**; the result carries per-sub-clause provenance — which R7(x) applied, the `clause_version_id` used, and a PII-free summary of the contribution history considered.
4. **NO hardcoded rule logic** (AC1.4 carried from 4.1): every R7 branch is interpreted from the clause `payload`; the only engine change permitted is **additively** registering new interpreter operator(s) in the `OPERATORS` registry. There is **no** `switch (clauseId)` / `switch (ruleCode)`, and adding/re-tuning an R7 rule remains a data (clause) change, not a code change.

**AC2 — property-based determinism (AR-57)**
5. Given the same `(member_id, contribution facts, niyamavali_versions)`, evaluating twice yields byte-identical output — same `reason_code`, same `provenance` (incl. `payload_hash`), same `sub_clause_results` **ordering** (stable/explicit, per the Story 4.6 order invariant — never hash-map iteration order).
6. A representative matrix of R7 scenarios (one per sub-clause + boundary values + a "no R7 applies" case + malformed-facts case) each evaluates deterministically across repeated runs; malformed / unrecognised payload still returns a typed `reason_code`, never a throw (carried from 4.1).

**AC3 — R7-family ladder resolution ("which R7(x) applied")**
7. Given a member whose facts satisfy the precondition of exactly one R7 sub-clause, the R7-family evaluation identifies that sub-clause as the applicable restoration path with its provenance.
8. Given facts that satisfy more than one sub-clause precondition (e.g. a long gap that also implies missed skips), the applicable sub-clause is resolved by a **payload-encoded** `precedence` field (data, not a hardcoded order) — deterministically and reproducibly.

## Tasks / Subtasks

- [x] **Task 1 — Add the minimal R7 interpreter operator(s)** (AC: 1, 4)
  - [x] Add `fact_lt` to the `OPERATORS` registry in `packages/niyamavali-engine/src/interpret.ts` (numeric `facts[fact] < max`; mirror `fact_gte`'s shape and its PII-free `detail` — echo the fact KEY, never the value). Payload shape: `{ op: 'fact_lt', fact: '...', max: N }` (mirrors `{ op: 'fact_gte', fact: '...', min: N }`; `detail: { op: 'fact_lt', fact }` — key only, never the value). This is the only new vocabulary R7 strictly needs; everything else reuses `fact_gte` / `fact_equals` / `member_state_in`.
  - [x] Confirm `OPERATOR_NAMES` (sorted, exported) now includes `fact_lt`; update the vocabulary assertion test.
  - [x] **Additive-only proof:** every existing 4.1 interpret test still passes unchanged (adding an operator must not alter how any existing clause evaluates — AC1.4).
- [x] **Task 2 — Author the R7(A–G) clause payloads (data)** (AC: 1, 2)
  - [x] In `packages/domain/seed/niyamavali-v1-clauses.sql`: upgrade `niy.contribution-discipline.r7-a`'s payload from the provisional display stub to a real `rule_kind: conditional` spec; ADD `r7-b` … `r7-g` as six new `clause_versions` INSERTs (`version = 1`, effective `2025-03-01`, `pariwar_id` = the synthetic seed tenant, `ON CONFLICT DO NOTHING`). Pre-allocated `clause_version_id`s (continuing the `0e1c00xx` block after `0e1c0006` — lock-in-policy):
    - `r7-b`: `0e1c0007-0000-4000-8000-000000000007`
    - `r7-c`: `0e1c0008-0000-4000-8000-000000000008`
    - `r7-d`: `0e1c0009-0000-4000-8000-000000000009`
    - `r7-e`: `0e1c000a-0000-4000-8000-00000000000a`
    - `r7-f`: `0e1c000b-0000-4000-8000-00000000000b`
    - `r7-g`: `0e1c000c-0000-4000-8000-00000000000c`
  - [x] Every new/updated INSERT carries `benefit_mechanism = 'pool'` (the `benefit-mechanism` CI gate `seed_globs` = `niyamavali-*.sql` has **teeth** — a missing/invalid tag fails the gate).
  - [x] Each payload: `all_of[]` preconditions over `contribution.*` facts, `on_pass` = restoration-path slug, `on_fail` = `r7_not_applicable`, a `restoration` object (structured params), `precedence` (int), `family: 'r7-contribution-discipline'`, `policy_review_required: true`, `provisional: true`. Use the concrete design in Dev Notes §"R7 clause payload design".
- [x] **Task 3 — R7-family ladder evaluator** (AC: 3, 7, 8)
  - [x] Add a thin evaluator that runs the seven R7 clauses via the 4.1 primitive and returns the applicable sub-clause + per-clause provenance, resolving overlap by the payload `precedence` field. Prefer a PURE core helper `evaluateR7Ladder(resolvedClauses[], ctx)` (deterministic, DB-free) + a shell wrapper that resolves the 7 clauses — mirroring the pure-core / DB-shell split from 4.1.
  - [x] **W6/AI-3-2 — single DB instant across all 7 resolutions (CRITICAL):** The shell wrapper MUST NOT call `evaluate()` 7 times (each call does its own `SELECT now()` → 7 independent DB instants, violating AI-3-2). Instead: call `selectDbNow(db)` (replicate the pattern from `evaluate.ts:92-104` — `db.execute(sql\`SELECT now() AS now\`)`) **once** to get a pinned `at: Date`, then call `evaluateAt(deps, clauseId, ctx, at)` for each of the 7 R7 clauses with that same `at`. `selectDbNow` is not exported from `src/index.ts` — re-implement the same one-liner in the shell wrapper or extract it to a shared internal helper.
  - [x] Emit the family result with **explicitly stable ordering** (sort sub-clause evaluations by `clause_id`; pick the applicable one by `precedence`, ties broken deterministically by `clause_id`). Export it from `src/index.ts`.
  - [x] See Dev Notes §"Ladder resolution & the 4.6 boundary" — keep this R7-FAMILY-scoped; the general cross-family ordered provenance trace (R7 vs R8 vs R5…) is **Story 4.6**, not here.
- [x] **Task 4 — Contribution-history fact contract (the Epic 8/9 seam)** (AC: 1, 3)
  - [x] Document + type the `contribution.*` fact keys R7 reads (Dev Notes §"Contribution-history fact contract"). Do **not** build a contribution-events reader — no source system exists yet (contributions are Story 9.x; `data-export/assemble.ts:20` confirms "no source system"). Facts are **caller-supplied** via `EvaluationContext.facts` at 4.2; the producer is Epic 8/9, assembled by the 4.6 Validity Service.
  - [x] Add the fact-key contract as a small exported constant / type in the engine so the future producer and the tests share one source of truth.
- [x] **Task 5 — Determinism + scenario tests (AR-57)** (AC: 5, 6, 7, 8)
  - [x] Pure DB-free tests (the majority): a scenario matrix (one member-facts fixture per R7 sub-clause + boundary values + "no R7 applies" + overlapping-precedence + malformed-facts), each asserting byte-identical repeated evaluation, stable `sub_clause_results` ordering, reproducible `payload_hash`, correct applicable sub-clause, and typed reason on malformed payload.
  - [x] One live-DB integration spec (`:5433`, `describe.skipIf(!hasDatabase)`): seed the R7 clauses via the existing `seedClause` helper pattern, seed a member row as superuser (plain `db` handle — no `enterAppScope`; the engine integration test NEVER calls `enterAppScope`, which is a domain-package RLS-test helper not present in this package — mirror `evaluate.spec.ts:107-113` exactly for `beforeAll` setup), evaluate with injected `contribution.*` facts, assert the applicable sub-clause + provenance + audit-on-compute. **Audit assertion for a multi-clause ladder:** after the first eval `afterFirst - before >= 1` (membership — some number of clause audits, each clause audited independently); after the second identical eval `afterSecond - afterFirst === 0` (all 7 clause results are cache hits → zero re-audits). Own-committing writer → assert membership, never `=== count`.
- [x] **Task 6 — Gate + merge reconciliation**
  - [x] Run the `benefit-mechanism` gate over the amended seed: `pnpm tsx scripts/benefit-mechanism/check.ts` (or the package's test) + `scripts/benefit-mechanism/seed-records.test.ts` — every R7 record must scan as `pool`.
  - [x] `pnpm --filter @twt/niyamavali-engine lint | typecheck | test`; then `pnpm ci:local` reconciled green (merge gate — GitHub Actions suspended; integration needs `DATABASE_URL` on `:5433`). The engine's integration-tests filter is already wired in `ci.yml` + `ci-local.sh` (4.1) — no CI change expected.

### Review Findings

- [x] [Review][Patch] Add `missingClauseIds?: string[]` to `R7LadderResult` — `evaluateR7LadderAt` silently omits clauses whose `evaluateAt` returns null; `perClauseResults` can have < 7 entries with no signal to Story 4.6. Add the field and populate it in `evaluateR7LadderAt`; pure `evaluateR7Ladder` also updated to populate it for omitted null entries (none possible in pure path — will always be empty, but keeps the type consistent). [`src/r7-ladder.ts`]

- [x] [Review][Patch] Missing test: R7(A)+R7(B) simultaneous applicability — when `ever_contributed=false, in_lapse=true, total_count=0, r7a_restorations_used=0`, both R7(A) and R7(B) preconditions pass; R7(B) should win (precedence 60 > 50). This is the FR-9 "after R7(A) exhausted, R7(B) applies" ambiguity the story documents — the most policy-sensitive ladder transition — yet it has no test in the overlap block. [`tests/r7-ladder.test.ts`]
- [x] [Review][Patch] `R7LadderMetaSchema` uses `z.number().int()` — a non-integer `precedence` value (e.g. `45.5` after a trustee amendment) causes `safeParse` to fail, `parseR7Meta` to return `null`, and the clause to be silently marked `applied: false` even if `interpretClause` correctly evaluated it as applicable. Fix: drop `.int()` from the schema. [`src/r7-ladder.ts:114`]
- [x] [Review][Patch] R7(C) absent from per-letter isolated test matrix without explanation — the `cases` array covers A, B, D, E, F, G (6 of 7 letters); C is omitted because its precondition (`months_since_last >= 12`) always co-fires with R7(F) (`>= 6`), making "exactly one applies" structurally impossible. Add a comment in the array explaining this and pointing to the overlap block where C is proven. [`tests/r7-ladder.test.ts:1179`]
- [x] [Review][Patch] Integration test omits `clauseVersionId` assertion in provenance (violates AC1.3) — the test asserts `provenance.clauseId` and `provenance.inputsSummary.fact_keys` for the winning clause but never asserts `provenance.clauseVersionId`, leaving the AC1.3 "clause_version_id used" requirement unvalidated at integration level. [`tests/integration/r7-ladder.spec.ts:1021`]
- [x] [Review][Patch] `R7_VERSION_IDS` and `R7_CLAUSE_IDS` are parallel arrays coupled only by positional index — inserting, removing, or reordering one without updating the other silently pairs the wrong version ID with a clause with no compile-time guard. Fix: convert to a `Record<typeof R7_CLAUSE_IDS[number], string>` keyed map. [`tests/fixtures/r7-clauses.ts:849`]
- [x] [Review][Patch] `R7LadderMetaSchema` does not disallow `on_pass === 'r7_not_applicable'` — a payload with `on_pass` and `on_fail` accidentally swapped would cause `isApplied` to return `true` for a clause whose `all_of` conditions actually FAILED (the decision would be `r7_not_applicable`, matching `meta.onPass`). Fix: add `.refine(s => s !== R7_NOT_APPLICABLE)` to the `on_pass` schema. [`src/r7-ladder.ts:114`]

- [x] [Review][Defer] 7 uncached `resolveByClauseId` calls per re-eval (shell read amplification) [`src/r7-ladder.ts:706`] — deferred, pre-existing; the dual-resolve design is explicitly documented in the Dev Agent Record and r7-ladder.ts; 100×-thread concern noted for Story 4.6 optimisation
- [x] [Review][Defer] Shell `isApplied` uses a second independent `resolveByClauseId` rather than the payload used by `evaluateAt` [`src/r7-ladder.ts:706`] — deferred, pre-existing; the design is documented as "NOT a TOCTOU window" and immutable clause rows make inconsistency near-impossible in practice; could be revisited if 4.1 API surfaces the resolved payload
- [x] [Review][Defer] R7(C) encodes lighter lock-in (3 months) than R7(F) (5 months + complete_all), inverting the apparent severity/gap relationship [`packages/domain/seed/niyamavali-v1-clauses.sql`] — deferred, provisional policy; `policy_review_required: true` already set; flag for trustee panel with note that R7(C) is "treat-as-new" (different path, not necessarily softer)
- [x] [Review][Defer] `selectDbNow` exported from `evaluate.ts` but not the barrel — weak internal API encapsulation [`src/evaluate.ts:413`] — deferred, intentional per Dev Agent Record; internal import within the package only
- [x] [Review][Defer] `fact_lt` admits `max: Infinity` / `max: NaN` (same as `fact_gte`) [`src/interpret.ts`] — deferred, consistent with 4.1's accepted approach for all operators; the entire operator-arg-validation family was an explicit 4.1 defer

## Dev Notes

### The one-sentence architecture

Story 4.2 is a **`[CONSUMER]`**: it delivers R7 as **DATA** (seven registry clauses) + the **minimal additive operator** the R7 payloads reference + a thin **R7-family ladder resolver**, all interpreted by the Story 4.1 engine primitive with **zero `switch`-on-rule logic**. It does **not** build contribution data plumbing or a restoration state machine — only registry-driven *evaluation*.

### The substrate you consume (Story 4.1 — already shipped)

`@twt/niyamavali-engine` (`packages/niyamavali-engine/`). Read `src/interpret.ts` and `src/evaluate.ts` in full before starting — they are the exact seams you extend.

- **Pure core** `interpretClause(clause, ctx)` (`src/interpret.ts`): interprets a `rule_kind: 'conditional'` payload — iterates `all_of[]`, runs each condition's `op` against the `OPERATORS` registry, ANDs the results, and maps `allPassed ? on_pass : on_fail` to `result.decision` + `reasonCode: 'rule.<decision>'`. Emits `subClauseResults[]` in **payload-array order** (the stable observable order). Unknown op / malformed payload → `reason_code: 'rule.payload_unrecognized'`, **never a throw**. Flags via `flag_if_true` / `flag_if_false` (data). `OPERATORS` today: `member_state_in`, `fact_equals`, `fact_in`, `fact_gte` (`src/interpret.ts:82-113`).
- **DB shell** `evaluate(deps, clauseId, ctx)` / `evaluateAt(deps, clauseId, ctx, ts)` (`src/evaluate.ts`): resolves the clause version effective at the (single, DB-authoritative) instant via `niyamavali.resolveByClauseId`, resolves member state via `member.getMemberStateAt`, merges `context.facts`, injects reserved `snapshot.*` facts where the payload declares `snapshot_resolution`, then interprets + memoizes + audits-on-compute. Clause-unresolvable → `null` (caller maps). DI `deps` object (`db`, `keyedStore`, `servicePool`); the engine **constructs nothing** (`new pg.Pool()` outside `db.ts` is a lint error).
- **Facts** (`src/types.ts:24`): `Facts = Record<string, CanonicalJsonValue>` — caller-supplied rule inputs. **This is your R7 seam.** Values may be PII-bearing but only DIGESTS/KEYS leave the engine (`buildInputsSummary` emits fact KEYS only, sorted).
- Public barrel `src/index.ts` — add your ladder evaluator + fact-contract export here.

### The NO-hardcoded-logic contract (AC1.4 — carried from 4.1, read `4-1-*.md` Dev Notes L147-158)

- A rule INSTANCE (R7(A)…R7(G)) is entirely **DATA** in `payload`. Adding/re-tuning one = a clause change, zero engine change.
- An interpreter **operator** is CODE — a small registered vocabulary. Adding `fact_lt` is an **additive** engine extension that must not change how any existing clause evaluates. 4.2 adds **exactly** the operators R7 needs (just `fact_lt`).
- **Forbidden:** `switch (clauseId)` / `switch (ruleCode)`, or any branch keyed by registry identity/content. The `decision` and `reasonCode` come from the payload (`on_pass`/`on_fail`), never a hardcoded engine branch. Ladder precedence is **payload data** (`precedence`), not a hardcoded ordering.

### Contribution-history fact contract (the Epic 8/9 seam — READ THIS)

**Invariant — the engine never infers contribution facts.** It only *reads* pre-derived `contribution.*` facts handed in via `EvaluationContext.facts`; it never counts contributions, computes skips/gaps, or reaches for any source to synthesize them. Deriving those facts is exclusively the fact PRODUCER's job (Epic 8/9, assembled by the 4.6 Validity Service). This binds forward to every contribution-dependent rule (R8's 90% rule in 4.3 reads the same facts) — the engine stays a pure interpreter of facts, never a producer of them.

**Contribution events do not exist yet.** They are Story 9.x (`packages/events/src/registry.ts:10` — `contribution.* (matched, confirmed)`), and `data-export/assemble.ts:20` states plainly: *"contribution_history (Epic 8 source) … have NO source system at Epic 3."* Therefore:

- R7 operators read **pre-derived, caller-supplied numeric/boolean facts** from `EvaluationContext.facts` under a `contribution.*` namespace. **Do NOT build a contribution-events reader / SQL derivation in 4.2 — there is nothing to read.** The fact PRODUCER is Epic 8/9 (contribution event stream), assembled and injected by the Story 4.6 Validity Service. 4.2 defines the **contract** and tests against **injected synthetic facts** (exactly as 4.1 proved the engine against a fixture clause).
- Proposed fact keys (define as an exported constant/type so producer + tests share one source of truth):
  | fact key | type | meaning | used by |
  |---|---|---|---|
  | `contribution.total_count` | int | lifetime confirmed contributions | R7(A) `< 10`, R7(D/E) `>= 10` gate |
  | `contribution.ever_contributed` | bool | `total_count > 0` (explicit for clarity) | R7(B) `== false` |
  | `contribution.skips_current_year` | int | missed cycles in the rolling/calendar year | R7(D) `== 1`, R7(E) `>= 2` |
  | `contribution.months_since_last` | int | **calendar** months since last contribution | R7(C) long-gap, R7(F) `>= 6` |
  | `contribution.r7a_restorations_used` | int | lifetime R7(A) one-time restorations consumed | R7(A) `< 2` (lifetime cap) |
  | `contribution.in_lapse` | bool | currently in a discipline lapse | R7(A) precondition gate |
  | `contribution.personal_event_excuse_claimed` | bool | a personal-event excuse was asserted | R7(G) declarative |
- **Calendar-correct derivation is the producer's job (AI-3-1).** `months_since_last` etc. must be computed with calendar math (`date_trunc`/`interval` / `setDate`), never fixed-ms spans (`* 24*60*60*1000`) — the recurring family AI-3-1 targets. But note: **4.2's engine does NO date arithmetic** — it compares already-derived numeric facts, so the pure core stays date-math-free and trivially survives the 4.6 100×-thread determinism gate. Record this explicitly (integrity: don't imply you built derivation you didn't).
- **The synthetic fact fixtures used by 4.2 are contractual examples, not mock implementations of the future contribution subsystem.** They pin the fact-key names/types/semantics R7 depends on; they neither stand in for nor constrain how Epic 8/9 will actually derive contributions. Do not let a fixture calcify into an implied producer contract beyond the fact keys themselves.

### R7 clause payload design (concrete — prevents wheel-reinvention)

Model each R7(x) as its **own** `conditional` clause. `all_of` passes ⇒ that R7 letter *applies* (its `on_pass` restoration slug is the decision); fails ⇒ `r7_not_applicable`. FR-9 consequences (`prd.md:343-349`):

| clause_id | precondition (`all_of`, over `contribution.*` facts) | `on_pass` slug | restoration params |
|---|---|---|---|
| `…r7-a` | `in_lapse == true` ∧ `total_count < 10` ∧ `r7a_restorations_used < 2` | `restore_3_consecutive_one_time` | `{consecutive_required:3, lock_in_months:0, one_time_only:true, lifetime_max:2}` |
| `…r7-b` | `ever_contributed == false` | `restore_5_consecutive_plus_lockin` | `{consecutive_required:5, lock_in_months:3, core_team_recommendation:true}` |
| `…r7-c` | `months_since_last >= <long_gap_months>` (provisional 12) | `treat_as_new_registration` | `{consecutive_required:5, lock_in_months:<lockin>}` |
| `…r7-d` | `total_count >= 10` ∧ `skips_current_year == 1` | `lockin_3mo_plus_catchup` | `{lock_in_months:3, catch_up_required:true}` |
| `…r7-e` | `total_count >= 10` ∧ `skips_current_year >= 2` | `lockin_5mo_complete_all` | `{lock_in_months:5, complete_all:true}` |
| `…r7-f` | `months_since_last >= 6` | `lockin_5mo_complete_all` | `{lock_in_months:5, complete_all:true}` |
| `…r7-g` | declarative — see below | `no_exemption` | `{never_excuses:true}` |

- **Operators used:** `fact_lt` (NEW — `< max`), `fact_gte` (existing), `fact_equals` (existing). That's the whole vocabulary. `all_of` already ANDs.
- **`precedence` (data, provisional — flag for trustee tuning):** overlaps are real (a 12-month gap satisfies R7(C) *and* R7(F); 2+ skips satisfy R7(E) and possibly R7(F)). Assign a `precedence` int per clause so the ladder deterministically picks the governing rule — suggest most-structural-wins: C(70) > B(60) > A(50) > F(45) > E(40) > D(30) > G(10). **These numbers are provisional policy** — encode as data, note in the seed comment that the Trustee Panel tunes both thresholds and precedence (FR-9 `policy_review_required`).
- **R7(G) is essentially declarative** ("personal events do not excuse skips"). Encode minimally: a clause whose payload records `never_excuses: true`; evaluate it so that a claimed personal-event excuse (`contribution.personal_event_excuse_claimed == true`) yields `no_exemption` (an explicit non-exemption record), otherwise `r7_not_applicable`. Its role is to *exist as an auditable clause* and never produce an exemption — not to drive a restoration path.
- **PRD ambiguity to record (do not silently resolve):** FR-9 says R7(A) is "max 2 lifetime → **after that R7(B) applies**," but R7(B)'s stated precondition is "registered but **never contributed**" — which doesn't match a member who has contributed <10 times and exhausted R7(A). Encode R7(A)'s `< 2` cap faithfully; note in the Dev Agent Record that the "falls through to R7(B)" wording is an inherited-TSCT ambiguity flagged for trustee clarification (`policy_review_required`), not an engine bug. Also: R7(A) restoration *satisfaction* (counting 3 consecutive contributions, incrementing `r7a_restorations_used`) is a **downstream workflow** (Epic 8/9 + a restoration flow), **out of 4.2 scope** — 4.2 evaluates preconditions from facts only.
- Keep the provisional display keys (`rule_code`, `title_en`, `provisional`) — `.passthrough()` tolerates them (`interpret.ts:118-136`). snake_case JSONB keys.

### R7 ladder result type (export this — 4.6 will consume it)

Define and export a `R7LadderResult` interface from `src/index.ts` so Story 4.6 has a stable typed seam without re-inventing the shape:

```typescript
export interface R7ClauseEvaluation {
  clauseId: string;          // e.g. 'niy.contribution-discipline.r7-a'
  applied: boolean;          // true iff this sub-clause's on_pass was chosen
  result: EvaluationResult;  // the full per-clause result from interpretClause
}

export interface R7LadderResult {
  /** All 7 sub-clause evaluations, sorted by clause_id (stable). */
  perClauseResults: R7ClauseEvaluation[];
  /** The single applicable sub-clause (highest precedence whose on_pass fired), or null if none applied. */
  applicableClauseId: string | null;
  /** Full result for the applicable clause, or null if none applied. */
  applicableResult: EvaluationResult | null;
}
```

Keep the pure `evaluateR7Ladder(resolvedClauses: ResolvedClause[], ctx: ResolvedEvaluationContext): R7LadderResult` signature compatible with this shape. Story 4.6 assembles the cross-family provenance trace from `applicableResult.provenance` — do not collapse it.

### Ladder resolution & the 4.6 boundary

AC1 ("evaluation result includes … which R7(x) applied") requires an R7-**family** evaluation, not just seven independent single-clause calls. Build it **thin and data-driven**:

- **Recommended (default taken in this story):** a pure `evaluateR7Ladder(resolvedClauses[], ctx)` that interprets each of the 7 clauses (reusing `interpretClause`), collects `{clause_id, applied, decision, provenance}` in stable `clause_id` order, and selects the applicable one by payload `precedence`. A shell wrapper resolves the 7 clause versions at one pinned instant (reuse `evaluate`/`evaluateAt`'s resolution + the single `SELECT now()` discipline — deferred-work **W6** / AI-3-2: one instant across all resolutions) and memoizes/audits the family result.
- **Boundary:** this is **R7-family only**. The general "evaluate ALL applicable rules (R7 vs R8 vs R5/R9 vs R12) in deterministic order + assemble the ordered `provenance_trace[]`" is **Story 4.6** (FR-12A Validity Service, `epics.md:1982-1994`; the order invariant it owns). Do not build the cross-family orchestrator here. AC2's "same `sub_clause_results` ordering (per Story 4.6 order invariant)" is a forward reference — comply with stable ordering; don't import 4.6.
- **Alternative (if BigDev prefers):** 4.2 ships only the 7 individually-`evaluate()`-able clauses + operators + fact contract, and the ladder-pick moves entirely to 4.6. This is lighter but leaves AC1's "which R7(x) applied" unproven at 4.2 — **not chosen** (see Decisions §1).

### Determinism requirements (Epic 4 IS the determinism epic — carried from 4.1)

- Pure core: no `Date.now()` / `new Date()` / `Math.random()` / mutable module state. Time passed IN. 4.2 adds **no** date math (facts are pre-derived).
- Every collection (`subClauseResults`, the ladder's per-clause list, the applicable-selection) emitted in **explicit stable order** (sort by `clause_id`; `precedence` selection is a pure reduce) — never `Object.keys()`/`Map` iteration order.
- Hash via `canonicalJsonStringify` + SHA-256; the family cache key (if you memoize the ladder) extends the 4.1 `buildCacheKey` composition (`src/cache-key.ts`) — include every resolved R7 `clause_version_id` in `niyamavaliVersionHash` and the fact digest in `memberStateHash`.
- Story 4.6 runs this 100× across threads and fails CI as a **P0** on any byte-variance.

### "Property-based" test note (AR-57)

The repo has **no `fast-check`** dependency. Match the 4.1 style: determinism proven by **repeated evaluation → byte-identical bytes** across an explicit **scenario matrix** (representative + boundary inputs), not a property-testing library. If BigDev wants true generative property tests, adding `fast-check` (dev-dep, engine package) is acceptable but is a scope addition — the matrix approach is the chosen path (consistent with 4.1 + the 4.6 100×-thread gate; Decisions §4 — no new dependency).

### Files: NEW vs UPDATE

- **UPDATE** `packages/niyamavali-engine/src/interpret.ts` — add `fact_lt` to `OPERATORS` (additive). 
- **UPDATE** `packages/niyamavali-engine/src/index.ts` — export the ladder evaluator + fact-contract constant/type.
- **NEW** `packages/niyamavali-engine/src/r7-ladder.ts` (or similar) — the pure family evaluator + shell wrapper + fact-contract constant. (Keep pure core / DB shell split as in 4.1.)
- **UPDATE** `packages/domain/seed/niyamavali-v1-clauses.sql` — upgrade `r7-a`, add `r7-b`…`r7-g` (all `benefit_mechanism = 'pool'`).
- **NEW** engine tests: pure scenario-matrix determinism spec + one live-DB integration spec (mirror `tests/integration/evaluate.spec.ts`'s `seedClause` + `seedActiveMember` + `createDb` setup — no `enterAppScope` in the engine package).
- **UPDATE** `packages/niyamavali-engine/tests/interpret.test.ts` — extend the `OPERATOR_NAMES` vocabulary assertion to include `fact_lt`.
- **No** `@twt/domain` source change expected (resolvers already exported). If a needed accessor is un-exported, ADD the export to `packages/domain/src/index.ts` — don't inline-duplicate.
- **No** CI-config change expected (engine integration filter wired in 4.1). Do **not** hand-edit `pnpm-lock.yaml`.

### Project Structure Notes

- **Variance (carried from 4.1, intentional):** the engine lives in `packages/niyamavali-engine` (a substrate PRIMITIVE beneath the 4.6 validity surface + Epic 6 claim filing), not under `apps/api/modules/{rules,validity}`. No architecture-doc edit — architecture commits properties, not exhaustive package lists ([[feedback_architecture_vs_prd_boundary]], [[project_member_lifecycle_domain_substrate]]).
- The seed (`niyamavali-v1-clauses.sql`) is a **dev/staging fixture + the `benefit-mechanism` gate's teeth source** — NOT a migration (`ON CONFLICT DO NOTHING`, idempotent). Editing the provisional `r7-a` payload in place is correct (it's version 1 fixture content, not applied-migration SQL — no 42P07 risk [[project_live_db_test_gotchas]]). Integration tests seed their own clauses via `seedClause`, not by loading this file.
- Naming discipline (`clause_versions.ts:17-22`): DB columns snake_case, TS fields camelCase, JSONB payload keys snake_case. Branded IDs for any new `*Id`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2] (L1908-1923) — AC verbatim; Epic 4 framing (L1865-1881); `clause_id` format `niy.contribution-discipline.r7-a` (L1453).
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-9] (L338-350) — R7(A)–R7(G) consequences + `policy_review_required` caveat; Active/Lapsed member defs (L130-132, L169).
- [Source: _bmad-output/implementation-artifacts/4-1-rule-evaluation-engine-primitive.md#Dev Notes] (L147-209) — interpretation model, AC1.4 line, determinism, "4.2–4.5 amend the seeds with real interpreter payloads" (L158), snapshot seam, TOCTOU/W6 (L169-171).
- [Source: packages/niyamavali-engine/src/interpret.ts] — `OPERATORS` registry (L82-113), `OPERATOR_NAMES` (L116), `ConditionalRuleSchema` + `.passthrough()` (L118-136), stable-order loop (L193-204).
- [Source: packages/niyamavali-engine/src/evaluate.ts] — `evaluate`/`evaluateAt` resolution + single `SELECT now()` (L86-104, L112-209); DI `deps` (L37-50); snapshot facts (L133-143).
- [Source: packages/niyamavali-engine/src/types.ts] — `Facts` seam (L24), `EvaluationContext.facts` (L27-32), `RuleOutcome`/`SubClauseResult`/`Provenance` (L41-73).
- [Source: packages/domain/seed/niyamavali-v1-clauses.sql] — provisional `r7-a` stub to upgrade (L29-37); INSERT shape + `benefit_mechanism` column; `0e1c00xx` version-id block.
- [Source: benefit-mechanism.yaml] — `rule_sources.seed_globs: [packages/domain/seed/niyamavali-*.sql]` (teeth); `v1_permitted: [pool]`. Gate: `scripts/benefit-mechanism/check.ts` + `seed-records.test.ts` (`SEED_PATH` L26).
- [Source: packages/events/src/registry.ts] (L10) + [packages/domain/src/data-export/assemble.ts] (L20) — contribution events are Story 9.x; **no source system exists yet** (the fact seam).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#W6] — one-instant clause resolution (AI-3-2 / TOCTOU); named Epic-4 re-trigger.

## Previous Story Intelligence (Story 4.1 — merged 2026-07-03, PR #60)

4.1 shipped the engine primitive and explicitly scoped 4.2's job:

- **"4.2–4.5 each ADD the operators their rules need"** and **"let 4.2–4.5 amend the seeds with real interpreter payloads"** (4.1 Dev Notes L152, L156, L158). The seeded R7(A)/R8/R9 clauses are *provisional display-only stubs* with NO decision logic — 4.2 makes `r7-*` real.
- **Framework-now / vocabulary-later** was 4.1's deliberate scoping (Completion Notes L247, L250): the operator set is intentionally minimal (`member_state_in`, `fact_equals`, `fact_in`, `fact_gte`) so R7 drives its own additions.
- **Audit-on-compute, not audit-every-call** (L251): a cache-HIT replays an already-audited compute → not re-audited (advisory-lock-serialized global hash-chain writer). Your family evaluator must preserve this — audit the compute once; the integration test asserts exactly one `rule.evaluate` line across two identical evals.
- **`provenance.evaluatedAt` is an ISO-8601 string, not a Date** (documented deviation, L257) — the canonicalizer rejects `Date` and the memo round-trips through JSON. Keep this rep in any new result shape.
- **Determinism / AI-3-1:** no fixed-ms calendar math anywhere in the engine; the engine does no date arithmetic (facts are pre-derived). The AI-3-1 CI gate was BigDev-owned and had not landed at 4.1 — comply in code regardless ([[feedback_record_unattested_no_backfill]]).
- **Test gotchas** ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]): own-committing writers (idempotency store + audit) survive the ROLLBACK envelope → assert membership / `>= baseline`, never `=== count`. The `test (unit)` step can flake once under `DATABASE_URL`-concurrent-load — confirm innocence by running the engine spec in isolation (stable 21/21 at 4.1).

## Git Intelligence

- 4.1 landed via `story/4-1-rule-evaluation-engine-primitive` → PR #60 → `main` (a60edd4). Follow the same pattern ([[project_story_automator_ops]]): branch `story/4-2-r7-contribution-discipline-rules` off `main`, selective manual staging, no `commit-story` helper. `git fetch origin` before reasoning about `main` ([[feedback_git_fetch_before_remote_reasoning]]).
- The only 4.x code in the tree is `packages/niyamavali-engine/` (4.1). This story extends it additively — no other package should need structural change.

## Project Context Reference

- Substrate: `@twt/domain` (Drizzle schema + RLS + accessors + branded IDs + `canonicalJsonStringify`); engine depends on it, domain never depends back (no turbo cycle).
- Live-DB testing: `twt-test-pg` Docker on `:5433`; `pnpm ci:local` is the merge gate (GitHub Actions suspended — local mirror; [[project_ci_actions_suspension_local_mirror]]).
- Determinism/replay is the Epic 4 through-line; §1.11 DB-authoritative time governs every timestamp; per-cohort live cache/freshness invariant is Story 4.8 (not here).

### Decisions (all four CONFIRMED by BigDev, 2026-07-03 — settled, listed for dev context)

1. **R7-family ladder evaluator lives in 4.2.** Build a thin, data-driven `evaluateR7Ladder` in 4.2 (satisfies AC1's "which R7(x) applied"), bounded to the R7 family; the cross-family ordered trace stays 4.6. (Rejected alternative: moving all ladder logic to 4.6.)
2. **Contribution facts are caller-injected; no source built in 4.2.** 4.2 defines the `contribution.*` fact contract and tests with synthetic facts; the producer is Epic 8/9 via the 4.6 Validity Service. Do **not** stub a contribution-events table. Per the fact-contract invariant above, the engine never infers contribution facts.
3. **`precedence` values + R7(C) long-gap threshold + R7(A)→R7(B) fall-through** ship as provisional policy encoded as data (`policy_review_required`), Trustee-Panel-tunable — not blocked on final Niyamavali copy (Story 0.13, external).
4. **Property tests via scenario matrix (no `fast-check`)** — matches 4.1; no new dependency.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- `pnpm --filter @twt/niyamavali-engine test` (with `DATABASE_URL` on :5433) → **47/47 green** (5 files: cache-key 5, interpret 15, r7-ladder pure 20, evaluate integration 5, r7-ladder integration 2).
- `pnpm benefit:check` → gate GREEN with teeth (12 rule records scanned, every one `pool`). `pnpm benefit:test` → 48/48.
- `pnpm ci:local` (DATABASE_URL set): 17/17 static gates green (incl. **benefit-mechanism**, domain-invariants, member-state-invariant); the only failure was the **pre-existing `@twt/jobs` `member-renewal-lifecycle.test.ts` live-DB timeout under 6-package concurrent load** (5000ms) — INNOCENT: passes in isolation in ~655ms–1.2s; untouched by this story. Confirmed the real CI `test (unit)` env (`unset DATABASE_URL` → live specs skip): **`pnpm turbo run test` = 26/26 tasks green, 0 failures** ([[project_known_livedb_test_failures]] / [[project_ci_actions_suspension_local_mirror]]; mirrors the 4.1 reconciliation exactly).

### Completion Notes List

**What shipped (a `[CONSUMER]`: R7 as DATA + one additive operator + a thin family resolver — zero `switch`-on-rule logic).**

- **Task 1 — `fact_lt` operator (the ONLY new vocabulary).** Added `fact_lt` (`facts[fact] < max`) to `OPERATORS` in `interpret.ts`, mirroring `fact_gte` (numeric guard, PII-free `detail` echoes the fact KEY only). Vocabulary now `[fact_equals, fact_gte, fact_in, fact_lt, member_state_in]`. **Additive-only proven:** all 15 existing/new interpret tests green; adding the operator changes no existing clause's evaluation (AC1.4).
- **Task 2 — R7(A–G) as registry DATA.** Upgraded `r7-a` in place from the display stub to a real `rule_kind:'conditional'` spec; added `r7-b`…`r7-g` (six new `clause_versions`, the pre-allocated `0e1c0007`…`0e1c000c` ids, `pool`, `ON CONFLICT DO NOTHING`). Each payload: `all_of[]` over `contribution.*` facts, `on_pass` restoration slug, `on_fail: r7_not_applicable`, a `restoration` param object, `precedence` int, `family`, `policy_review_required`, `provisional`.
- **Task 3 — R7-family ladder (`src/r7-ladder.ts`).** Pure `evaluateR7Ladder(resolvedClauses[], ctx)` interprets all 7 via `interpretClause`, sorts by `clause_id`, and picks the applicable one by the **payload `precedence`** (DATA, a pure reduce; ties → lowest `clause_id`). Shell `evaluateR7LadderAt`/`evaluateR7LadderLive` pins ONE DB instant (`selectDbNow`, now exported from `evaluate.ts` — internal, not on the barrel) and drives the reviewed 4.1 `evaluateAt` per clause (resolve→interpret→memo→audit-on-compute) at that instant (W6/AI-3-2). Exported `R7LadderResult`/`R7ClauseEvaluation` for Story 4.6 to consume un-collapsed.
- **Task 4 — `contribution.*` fact contract.** Exported `R7_CONTRIBUTION_FACT_KEYS` (+ `R7ContributionFactKey` type) as the single source of truth the future Epic 8/9 producer and the tests share. **The engine NEVER infers contribution facts** ([[project_engine_never_infers_contribution_facts]]) — no contribution-events reader built (none exists; Story 9.x). The engine does **NO date arithmetic**; `months_since_last` etc. arrive pre-derived (calendar-correct derivation, AI-3-1, is the producer's job) — so the pure core stays date-math-free and survives the 4.6 100×-thread gate.
- **Task 5 — determinism + scenario matrix.** Pure spec (20 tests): one applicable fixture per R7 letter, C-vs-F and E-vs-F overlap-by-precedence, boundary values (`<10`/`<2`/`>=6`/`>=12`, skips `==1` vs `>=2`), "no R7 applies", malformed payload (typed reason, not applied) + malformed facts (no throw), byte-identical repeated eval, clause/fact insertion-order invariance, reproducible per-clause `payload_hash`. Live-DB spec (2 tests, mirrors `evaluate.spec.ts`, no `enterAppScope`): precedence ladder over real seeded clauses + PII-free provenance; audit-on-compute membership then **zero re-audit on identical re-eval** (all 7 cache hits) + byte-identical replay.
- **Task 6 — reconciliation.** See Debug Log.

**Decisions / caveats recorded (no silent resolution):**
- All four story Decisions (§Decisions) were pre-confirmed by BigDev and taken as written: ladder lives in 4.2 (R7-family-scoped; cross-family trace stays 4.6); contribution facts caller-injected (no source built); `precedence`/thresholds/`R7(A)→R7(B)` fall-through ship as provisional `policy_review_required` DATA; scenario-matrix determinism (no `fast-check`).
- **`precedence` policy (provisional, Trustee-tunable):** C(70) > B(60) > A(50) > F(45) > E(40) > D(30) > G(10) — "most-structural-wins", encoded as DATA with a seed comment flagging FR-9 re-tuning.
- **FR-9 ambiguity recorded, not resolved:** FR-9 says R7(A) "max 2 lifetime → then R7(B) applies", but R7(B)'s precondition is "registered but NEVER contributed" — which doesn't match a member who contributed <10× and exhausted R7(A). R7(A)'s `< 2` cap is encoded faithfully; the "falls through to R7(B)" wording is flagged as an inherited-TSCT ambiguity for trustee clarification (`policy_review_required`), NOT an engine bug. R7(A) restoration *satisfaction* (counting 3 consecutive contributions, incrementing `r7a_restorations_used`) is an out-of-scope downstream Epic 8/9 workflow — 4.2 evaluates preconditions from facts only.
- **R7(G) is declarative:** exists as an auditable clause that records an explicit `no_exemption` when a personal-event excuse is claimed; it never drives a restoration path (precedence 10, lowest).
- **Design note (shell read amplification):** `evaluateAt` returns an `EvaluationResult` without `precedence`, so the shell resolves each payload once more (`resolveByClauseId`) at the SAME pinned `at` to read `precedence`/`on_pass` as DATA. This is read amplification at ONE pinned instant — AI-3-2 (single instant) is preserved; it is NOT a TOCTOU window. Documented in `r7-ladder.ts`.
- **No architecture/PRD/ADR edit** (property-driven boundary; the engine is a substrate primitive) and **no CI-config change** (integration filter already includes `@twt/niyamavali-engine` from 4.1). `pnpm-lock.yaml` untouched.

### File List

- **UPDATE** `packages/niyamavali-engine/src/interpret.ts` — add `fact_lt` operator (additive).
- **UPDATE** `packages/niyamavali-engine/src/evaluate.ts` — export `selectDbNow` (internal; not on the barrel) for the ladder shell's single-instant discipline.
- **NEW** `packages/niyamavali-engine/src/r7-ladder.ts` — fact contract + pure `evaluateR7Ladder` + shell `evaluateR7LadderAt`/`evaluateR7LadderLive` + result types.
- **UPDATE** `packages/niyamavali-engine/src/index.ts` — export the ladder API, fact-contract constant/type, `R7_CLAUSE_IDS`, `R7_NOT_APPLICABLE`, `R7LadderResult`, `R7ClauseEvaluation`.
- **UPDATE** `packages/domain/seed/niyamavali-v1-clauses.sql` — upgrade `r7-a`; add `r7-b`…`r7-g` (all `pool`).
- **NEW** `packages/niyamavali-engine/tests/fixtures/r7-clauses.ts` — shared R7 payload fixtures (one source of truth for both specs).
- **NEW** `packages/niyamavali-engine/tests/r7-ladder.test.ts` — pure scenario-matrix determinism spec (20 tests).
- **NEW** `packages/niyamavali-engine/tests/integration/r7-ladder.spec.ts` — live-DB integration spec (2 tests, :5433).
- **UPDATE** `packages/niyamavali-engine/tests/interpret.test.ts` — `fact_lt` behavioural tests + extended `OPERATOR_NAMES` vocabulary assertion.
- **UPDATE** `scripts/benefit-mechanism/seed-records.test.ts` — expect 12 seed records incl. `r7-b`…`r7-g` (gate seam).

## Change Log

| Date | Change |
|---|---|
| 2026-07-03 | Implemented Story 4.2 — R7(A–G) contribution-discipline restoration ladder. Added the `fact_lt` interpreter operator (additive); authored R7(A–G) as `rule_kind:'conditional'` registry DATA (`r7-a` upgraded, `r7-b`…`r7-g` added, all `pool`); added the pure `evaluateR7Ladder` + single-DB-instant shell (`evaluateR7LadderAt`/`Live`) resolving overlap by payload `precedence`; exported the `contribution.*` fact contract. 22 new engine tests (20 pure + 2 live-DB), gate seam updated to 12 records. Zero `switch`-on-rule logic; no architecture/CI change. |
