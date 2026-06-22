# ADR-0015: benefit-mechanism CI gate — FR-100 / FR-7 Hook 1 enum-tag guard, three pure checks, forward-compat `BenefitMechanism` enum, repo-global repo-root mechanism

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.16d closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (continuation of the ADR-0010 session); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

FR-7 + FR-100 (PRD §4.15) / Architecture §1.13 **Hook 1** (L1133-1147) commit a
**forward-compat ENUM-TAG discipline** for the Niyamavali rule registry: every rule
record carries a `benefit_mechanism` discriminator —

- **`pool`** — crowdfunded *daan* / Pool-Engine benefits (death-support today;
  Jivandan / Kanyadan / Retirementdaan later). **v1 ships only `pool`-tagged rules**
  (R5, R7, R8, R9, R10, …).
- **`reserve`** — trust-paid assistance (Durghatana Sahayata + future reserve-funded
  benefits). **`reserve` exists in the enum from day one** so v2/v3 rules add
  **without re-tagging** existing v1 rules.

Story 1.16d is the control that establishes the CI gate enforcing this from day one
across every intermediate epic — the **closing fourth gate of the Epic 1 governance
CI-gate cluster** (1.16a friction-budget · 1.16b pii-scrape · 1.16c schema-diff ·
**1.16d benefit-mechanism**). It is the **sibling of 1.16c's schema-diff**: epics L566
names the FR-100 forward-compat-hooks CI as a *pair* — schema-diff (**Hook 2**,
non-add) + `benefit_mechanism` tag (**Hook 1**, enum-tag). Hook 2 asserts ZERO
forbidden payout-destination artifacts exist; Hook 1 (this ADR) asserts EVERY rule
record carries a valid tag. Per [[feedback_architecture_vs_adr_boundary]], the
architecture commits the *property* (every v1 rule carries `benefit_mechanism`, enum
enables Durghatana Sahayata v2 without a v1 schema change); this ADR records the
*controls* chosen.

The forcing conditions / reconciliations:

- **"No-op until Epic 2," NOT a vacuous gate** (the #1 design reconciliation). The
  epics AC reads scan-centric ("inspects rule fixtures, migrations, and seed data …
  every rule record carries `benefit_mechanism`", L1356). But **no rule exists in
  v1** — the Niyamavali rule registry (the `clause_versions` table + the rule seed +
  `apps/api/src/modules/rules/`) is **Epic 2 / Story 2.3** (verified: a grep of
  `benefit_mechanism|clause_version` across all code returns nothing but an unrelated
  `niyamavali.*` RBAC key). So the binding v1 deliverable is the **engine + gate +
  enum + config + no-op semantics**, the analogue of 1.16b (matrix-consumer + engine,
  no rules/renders yet). Crucially, this is **not** a *pure* no-op: the
  enum-definition cross-check (check b) + the `v1_only` flag give the gate a real,
  non-vacuous v1 assertion — green-by-construction-**with-teeth**.
- **Precision-scoping IS the self-green invariant** (the #2 reconciliation). The four
  keywords (`benefit_mechanism`, `pool`, `reserve`, `BENEFIT_MECHANISM_V1_ONLY`)
  appear across the epics, architecture, PRD, `deferred-work.md`, the
  `sprint-status.yaml` ledger comments, package READMEs, the 1.16a/b/c/d story files,
  and the gate's own fixtures + `benefit-mechanism.yaml`. **None are rule records.**
  The gate reads only the declared `rule_sources` + the snapshot + the enum file.
- **No inherited deferred-work item routes to "1.16d"** — unlike 1.16c (which Closed
  D9-1.2), this story inherits no binding deferred-work entry and no adjacent cluster
  (verified by grep). It only adds new deferrals (the Epic-2 extraction trigger + the
  Story 14.5 hand-off).

## Decision

### 1. Enforce FR-100 / FR-7 Hook 1 via a versioned `benefit-mechanism.yaml` config + a loud-throw parser

A repo-root `benefit-mechanism.yaml` declares `version`, `mechanisms: [pool, reserve]`
(the full enum width — `reserve` ships so v2 adds without re-tagging), **`v1_only:
true`** (the `BENEFIT_MECHANISM_V1_ONLY` build flag, as a versioned/reviewable field),
`v1_permitted: [pool]`, and a `rule_sources` block (`tables: [clause_versions]` set
from day one; `seed_globs: []` / `fixture_globs: []` empty at v1) + a header comment
documenting the FR-100/FR-7 rationale and the v2-flip governance note.
`parseBenefitMechanismConfig` parses + validates and **throws loudly on a malformed
config** (missing/mistyped `mechanisms`/`v1_only`/`v1_permitted`, or a `v1_permitted`
value not in `mechanisms`) — a broken config must fail the gate, never silently
disable enforcement (mirroring `parseFr100Config` / `parseFrictionBudgetYaml`). The
`v1_only` flag is versioned in-file so the v2 flip is an auditable config change
(mirroring how `fr-100-non-add.yaml`'s `allow: []` is the v2 escape hatch).

### 2. Ship the forward-compat `BenefitMechanism` z.enum in `packages/contracts/` NOW

`packages/contracts/src/rules/benefit-mechanism.ts` ships `export const
BenefitMechanism = z.enum(['pool', 'reserve'])` (+ a `BenefitMechanismValue` type),
barrel-exported via `src/rules/index.ts` → `src/index.ts`. It (a) delivers the
forward-compat "the `reserve` value exists in the type definition" guarantee that
Story 14.5 (L4324) verifies; (b) gives Epic 2's Story 2.3 a type to **import** for the
`clause_versions.benefit_mechanism` column rather than re-define (single source of
truth); (c) makes the gate's enum-definition cross-check non-vacuous. A **plain
`z.enum`** — not registered via `.openapi()` — so `openapi/v1.yaml` stays
**byte-identical** (verified via `contracts:check-openapi-determinism`, the 1.16b
precedent for adding a Zod schema + barrel export). This mirrors 1.16b shipping the
matrix schema before Epic 11a populates it.

### 3. Three pure, fixture-tested checks; pure-core / impure-shell split

`scripts/benefit-mechanism/lib.ts` exposes the pure core (each takes already-read
content / parsed JSON + the parsed config, returns `Finding[]`):

- **(a) Rule-record tag scan** — `validateRuleRecord` / `validateRuleRecords` over the
  exported `RuleRecord` seam: assert each record (i) carries `benefit_mechanism`, (ii)
  the value is one of `mechanisms`, (iii) if `v1_only`, one of `v1_permitted`. A
  missing tag / out-of-enum value / `reserve`-while-`v1_only` is a finding **naming
  the offending rule**. Fed by the structured extractors `extractFromSqlInserts`
  (parses `INSERT INTO <ruletable> (cols) VALUES (vals)`, locates the
  `benefit_mechanism` column index, reads the value) and `extractFromJsonSeed`. No-op
  at v1 (no rule records). The validators are **importable** so Epic 2's seed-loader
  reuses them.
- **(b) Enum-definition cross-check** — `checkEnumDefinition` **dynamic-imports** the
  shipped `BenefitMechanism` enum and reads `.options` off the `ZodEnum` instance
  (format-insensitive — cannot drift from the runtime type, unlike source-text regex),
  comparing **sorted** arrays to `config.mechanisms` (via the extracted pure helper
  `enumMatchesMechanisms`). **Teeth now** — the gate's non-vacuous v1 assertion.
- **(c) Rule-table schema-column check** — `scanRuleTableColumns`: when a
  `rule_sources.tables` table appears in the latest drizzle
  `migrations/meta/*_snapshot.json`, assert it carries a `benefit_mechanism` column.
  Absent table → no-op (until Story 2.3 lands `clause_versions`).

The impure `scripts/benefit-mechanism/check.ts` resolves the scan sources, runs the
three checks, accumulates `findings[]`, prints structured per-finding output
(`formatFinding`), and `exit(1)` on any finding. The pure-core / impure-shell split
mirrors 1.16c's `scripts/schema-diff/{lib.ts,check.ts}`. Fixture-unit-tested (33
tests): each check positive (finding-with-named-pointer) + negative (clean), the v2
flag-flipped path, both extractors, and `parseBenefitMechanismConfig` valid → typed /
malformed → throw.

### 4. Graceful no-op until Epic 2 — data-driven, self-green-with-teeth

At v1: check (a) finds no rule records (seed/fixture globs empty, no INSERT into the
rule table), check (c) no-ops (no `clause_versions` table), and check (b) has teeth
(the shipped enum matches the config). So the `benefit-mechanism` job is **green by
construction WITH teeth** on the introducing PR. The gate becomes meaningful
surface-by-surface with **no code change** as Epic 2 lands the table (check c) + seeds
rules and populates `rule_sources` (check a). The gate reads **only** the declared
rule-artifact sources + the snapshot + the enum file, and explicitly **excludes** the
repo root / `_bmad-output/**` / `docs/**` / every `**/*.md` / `sprint-status.yaml` /
its own `scripts/benefit-mechanism/**` fixtures / `benefit-mechanism.yaml`.

### 5. Repo-global repo-root `scripts/` mechanism — invariant scan, NO `fetch-depth: 0`

The gate is repo-global — the rule artifacts span `packages/domain` (the
`clause_versions` migration + seed) and `apps/api/src/modules/rules/` (the registry
payload), so no per-package turbo task can express it. It lands at the repo root in
`scripts/benefit-mechanism/` (the home 1.16b's Dev Notes predicted for the repo-global
fixtures/migrations/seed gate), wired as a dedicated `benefit-mechanism` job in
`.github/workflows/ci.yml` (mirroring the `schema-diff` shape) + root `benefit:check`
/ `benefit:test`. The forward-compat **enum** stays in `packages/contracts/`
(importable by Epic 2); only the gate is repo-root. It is an **invariant scan of
current state**, NOT a git-diff → **NO `fetch-depth: 0`**, mirroring `schema-diff` /
`pii-scrape` and **NOT** `friction-budget`. `scripts/` is not a pnpm workspace, so the
job runs `pnpm benefit:test` explicitly before `pnpm benefit:check`; there is **no
`turbo.json` entry** (a repo-root tsx script is not a turbo task).

### 6. Relationship to Story 14.5 (final closure)

1.16d **installs** the gate; it runs continuously on every PR across Epic 2 +
downstream consumers. **Story 14.5** (FR-100 `benefit_mechanism` Tag Verification —
Continuous CI Gate Final Closure, epics L4314-4329) records the **final verification**
(gate ran across Epic 2+, every v1 rule `pool`, `reserve` tags zero v1 rules,
`BENEFIT_MECHANISM_V1_ONLY` set) and confirms the gate persists post-v1 as a permanent
governance gate — then **flips `v1_only: false`** at v2 / Durghatana Sahayata
activation (new `reserve` rules are greenfield Niyamavali additions per Story 2.3; v1
`pool` rules stay replay-identical; the flip = a trustee-attested ADR per Story 14.7).
1.16d installs; 14.5 closes. The 14.5↔1.16d pairing mirrors 14.4↔1.16c. 14.5's
verification artifact is NOT built here — cross-referenced only.

## Alternatives considered

- **Defer the `BenefitMechanism` enum to Story 2.3** — Rejected: it would drop the
  forward-compat "the `reserve` value exists in the type" guarantee (Story 14.5
  verifies it) and make the v1 gate a *pure* no-op. Shipping the enum now gives check
  (b) teeth and gives Epic 2 a type to import rather than re-define.
- **Source-text regex parse of the enum (like `schema-diff`'s `scanZodSchemas`)** —
  Rejected for check (b): fragile to formatting. A dynamic import reading `.options`
  off the `ZodEnum` instance is format-insensitive and cannot drift from the runtime
  type.
- **A `packages/contracts/` turbo task (mirror 1.16b)** — Rejected: no single
  workspace owns the rule artifacts (they span `packages/domain` + `apps/api`). The
  repo-global scope forces a repo-root `scripts/` home (the 1.16a/1.16c precedent),
  exactly as 1.16b's Dev Notes predicted for 1.16d.
- **Base-ref git-diff of the rule set (`fetch-depth: 0`)** — Rejected: the invariant
  is "every rule record carries a valid tag," which a whole-state scan asserts more
  robustly than a diff (a diff can miss an earlier-branch rule and wrongly pass a
  merged one). Mirroring `friction-budget`'s `fetch-depth: 0` here would be
  cargo-culting its declaration-facet-specific posture.
- **Scan broadly (all `*.md` / repo root / `_bmad-output`)** — Rejected: the four
  keywords appear dozens of times in non-rule-record files; a broad glob would
  red-fail the gate's own introducing PR. Precision-scoping to the declared
  `rule_sources` + snapshot + enum file is the self-green invariant.

## Consequences

- **Operational** — Every PR runs the `benefit-mechanism` job. Today it is green by
  construction with teeth (the enum matches the config; zero rule records / no rule
  table → checks a/c no-op). It begins enforcing the moment Epic 2 lands the
  `clause_versions` table (check c) and seeds rules + populates `rule_sources` (check
  a), failing with a precise rule-naming pointer. The PR-template Security-impact
  prompt now references the live gate + the FR-7/FR-100 enum-tag invariant (no 7th
  prompt added — the 6-prompt budget holds).
- **Security / governance** — The gate is the FR-100 Hook 1 forward-compat enforcement
  seam: it keeps Durghatana Sahayata's v2 `reserve` activation a deliberate,
  trustee-attested config flip rather than an accidental untagged-rule landing.
  Read-only (fs read of the declared sources + a dynamic import of the enum); no new
  secrets/credentials.
- **Performance** — One extra CI job (`needs: install`), running in parallel with the
  other gates; the default shallow checkout (no `fetch-depth: 0`).
- **Cost** — Negligible (one short tsx run + a 33-test vitest run per PR).
- **Failure modes accepted** — The v1 extractors are the **structured** ones (SQL
  `INSERT` rows + JSON seed records + the snapshot column check); a **TS-object-literal
  seed extractor** is deferred until Epic 2's concrete seed shape exists (deferred-work
  trigger: Story 2.3). The SQL `INSERT` regex assumes single-line column/value lists
  without nested commas (acceptable: drizzle-generated DML is single-line; rule seeds
  land at Epic 2 against the importable validators).
- **Migration / pivot path** — The v2 `reserve` activation is admitted via `v1_only:
  false` in `benefit-mechanism.yaml` (trustee-attested ADR per Story 14.7), never a
  gate code change. Story 14.5 records the final continuous-gate verification.

## References

- [Source: architecture.md §1.13 Hook 1, L1133-1147] — the authoritative enum spec: `pool` / `reserve` semantics, v1 ships only `pool` (R5/R7/R8/R9/R10), `reserve` exists so v2 adds without re-tagging, discriminator in every audit line, deterministic replay across additions
- [Source: architecture.md §4.15 L4531] — the rule-registry payload home `apps/api/src/modules/rules/`; Durghatana Sahayata module greenfield at v2/v3
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md §4.15 FR-100] — `benefit_mechanism` discriminator shipped; no v1 rules tag `reserve`
- [Source: epics.md Story 1.16d (L1346-1362)] — story statement + the two BDD blocks (inspect rule fixtures/migrations/seed; every record carries `benefit_mechanism ∈ {pool, reserve}`; v1 only `pool` via build flag `BENEFIT_MECHANISM_V1_ONLY`; untagged fixture → CI fails naming the rule); L44 (FR-7); L181/L529/L566/L976 (FR-100 forward-compat-hooks CI = schema-diff + `benefit_mechanism` tag, installed Epic 1)
- [Source: epics.md Story 2.3 (L1450-1452)] — the `clause_versions` registry shape: `benefit_mechanism` enum `pool|reserve` NOT NULL, "enforced by Story 1.16d CI gate" — the consumer that populates `rule_sources` + imports the enum
- [Source: epics.md L2622] — the pool schema also carries `benefit_mechanism` "per Story 1.16d CI" (Epic 8; the deferred denormalized-tag cross-check)
- [Source: epics.md Story 14.5 (L4314-4329)] — FR-100 `benefit_mechanism` Tag Verification continuous-gate final closure (gate ran across Epic 2+; every v1 rule `pool`; `reserve` tags zero v1 rules; flips `v1_only` at v2; new `reserve` rules greenfield per Story 2.3)
- [Source: scripts/schema-diff/{lib.ts,check.ts,lib.test.ts,README.md} + ADR-0014] — the direct sibling (Hook 2) mirrored: repo-global repo-root gate, pure-core/impure-shell split, throw-on-malformed parse, `Finding`/`formatFinding`, `snapshotTables` traversal, no `fetch-depth: 0`, README + self-green discipline
- [Source: packages/contracts/src/public-pages/{matrix.ts,scrape.ts,index.ts} + ADR-0013] — the ship-the-forward-compat-type + importable-engine + no-op-until-populated precedent (1.16b); `contracts:check-openapi-determinism` byte-identical discipline when adding a Zod schema + barrel export
- [Source: packages/contracts/src/rules/benefit-mechanism.ts] — the shipped forward-compat `BenefitMechanism` z.enum
- [Source: benefit-mechanism.yaml + scripts/benefit-mechanism/{lib.ts,check.ts,lib.test.ts,README.md}] — the config + gate authored by this story
- [Source: .github/workflows/ci.yml — `benefit-mechanism` job] — the no-`fetch-depth: 0` current-state-scan + `benefit:test`-then-`benefit:check` job shape (mirror `schema-diff`)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — "Story 1.16d — resolutions + new deferrals" (gate+engine+enum Closed; TS-literal seed extraction + `pools.benefit_mechanism` cross-check deferred; Story 14.5 hand-off; Epic-1 cluster-complete note); no inherited item routes to 1.16d
- [Source: _bmad-output/implementation-artifacts/1-16d-benefit-mechanism-tag-ci-gate.md] — owning Story
- Memory: [[feedback_architecture_vs_adr_boundary]] — property vs control discipline
- Memory: [[feedback_closure_language_precision]] — Closed-by-edit vs Resolved-via-explicit-deferral

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-21 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-06-21 Trustee Panel session (engineering substrate — light-touch; continuation of the ADR-0010 session); `.decision-log.md` Decision 2026-06-21-059; consent sheet `adr-ratification-consent-sheet-2026-06-21.md`. Cascade applied 2026-06-22. |
| 2026-06-16 | (initial draft) | Solo Builder (BigDev) | Authored under Story 1.16d (benefit-mechanism CI gate) closure |
