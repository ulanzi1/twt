# `scripts/benefit-mechanism/` — the benefit-mechanism PR CI gate (FR-100 / FR-7 Hook 1 enum-tag guard)

The CI gate for **FR-100 Hook 1** (Story 1.16d). It enforces the **forward-compat
enum-tag discipline** for the Niyamavali rule registry: **every rule record carries
a `benefit_mechanism: 'pool' | 'reserve'` discriminator**, and **v1 rules only ever
use `pool`** — so Durghatana Sahayata's v2/v3 `reserve` activation is
forward-compatible from day one (new `reserve` rules ADD without re-tagging existing
v1 rules).

This is the **sibling of 1.16c's `schema-diff`** (Hook 2, non-add): epics L566 pairs
them as the FR-100 forward-compat-hooks CI. Hook 2 asserts **ZERO** forbidden
payout-destination artifacts exist; Hook 1 (here) asserts **EVERY** rule record is
tagged.

Authority: architecture §1.13 Hook 1 (L1133-1147, the authoritative enum spec) ·
PRD §4.15 FR-100 · FR-7 · epics Story 1.16d (L1346-1362). ADR:
`docs/adr/ADR-0015-benefit-mechanism-tag-ci-gate.md`.

## Files

- `check.ts` — entrypoint (impure: glob + fs read + dynamic enum import + `process.exit`). Run via `pnpm benefit:check`.
- `lib.ts` — pure, importable core (config parse + the three checks + the structured extractors). Unit-tested.
- `lib.test.ts` — fixture-driven unit tests. Run via `pnpm benefit:test`.
- `../../benefit-mechanism.yaml` — the versioned config (repo root).
- `../../packages/contracts/src/rules/benefit-mechanism.ts` — the forward-compat `BenefitMechanism` z.enum (Epic 2 imports it).

## The three checks — which have teeth NOW, which no-op until Epic 2

| #   | Check                           | Has teeth at v1?                 | Source(s)                                                                     |
| --- | ------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| a   | **Rule-record tag scan**        | No-op (no rule records exist)    | `rule_sources` seed/fixture globs (empty at v1) + migration `*.sql` INSERTs   |
| b   | **Enum-definition cross-check** | **TEETH NOW**                    | the shipped `BenefitMechanism` z.enum (dynamic import) vs config `mechanisms` |
| c   | **Rule-table schema-column**    | No-op (no `clause_versions` yet) | latest `packages/domain/migrations/meta/*_snapshot.json`                      |

**Check (a)** — for every rule record extracted from a declared `rule_source`,
assert it (i) carries `benefit_mechanism`, (ii) the value is one of `mechanisms`,
(iii) if `v1_only`, the value is one of `v1_permitted` (`pool`). A missing tag, an
out-of-enum value, or a `reserve` tag while `v1_only` is a finding that **names the
offending rule** (clause id / source file + line). At v1 there are **no** rule
records → no-op. The validators (`validateRuleRecord` / `validateRuleRecords`, typed
over the exported `RuleRecord`) are **importable** so Epic 2's seed-loader / registry
tests reuse them (the seam — exactly as 1.16b's engine is imported by the future
live-render integration spec).

**Check (b)** — assert the shipped `BenefitMechanism` z.enum declares **exactly** the
config's `mechanisms` (no drift, no missing `reserve`, no extra value). It
**dynamic-imports** the real enum and reads `.options` off the `ZodEnum` instance
(format-insensitive — cannot drift from the runtime type), comparing sorted arrays so
ordering differences are not false positives. This is the gate's **non-vacuous v1
assertion** — green-by-construction **with teeth**, not a pure no-op.

**Check (c)** — when a `rule_sources.tables` table (`clause_versions`) appears in the
latest drizzle snapshot, assert it carries a `benefit_mechanism` column (the Story
2.3 NOT-NULL enum). Absent table → no-op.

Each check is fixture-tested with a **positive** (violation → finding naming the
pointer) and a **negative** (compliant → no finding). Any finding fails CI with a
clear pointer (kind + offending rule/artifact + file/line + which invariant) —
`process.exit(1)`.

## No-op until Epic 2 — data-driven, not a feature flag

The Niyamavali rule registry (the `clause_versions` table + the rule seed +
`apps/api/src/modules/rules/`) does **not** exist in v1 — it is **Epic 2 / Story
2.3**. So checks (a) and (c) are **graceful no-ops** today (no rule records, no rule
table). The gate grows teeth **surface-by-surface with NO code change**: as Epic 2
lands the `clause_versions` table (check (c) acquires teeth) and seeds rules + fills
`rule_sources.seed_globs`/`fixture_globs` (check (a) acquires teeth), the gate
enforces the tag on every rule. The no-op is **data-driven** (mirroring 1.16b's
empty-matrix no-op + 1.16c's clean-tree pass), not a feature flag.

## The `v1_only` flag model + how the v2 flip is admitted

`v1_only: true` in `benefit-mechanism.yaml` realizes the `BENEFIT_MECHANISM_V1_ONLY`
build flag (epics L1356) as a **versioned, reviewable** field — so the v2 flip is an
auditable config change (mirroring how `fr-100-non-add.yaml`'s `allow: []` is the v2
escape hatch). While `v1_only`, an insert may only carry a `v1_permitted` value
(`pool`); a `reserve` tag is a finding.

The v2 flip — `v1_only: false`, admitting `reserve`-tagged rules — requires a
**trustee-attested ADR per Story 14.7** (capability-bar update) + the continuous-gate
**final closure recorded at Story 14.5**. It is **not** a code change to this gate.

## Precision-scoping IS the self-green invariant

The four keywords (`benefit_mechanism`, `pool`, `reserve`,
`BENEFIT_MECHANISM_V1_ONLY`) appear across the epics, architecture, PRD,
`deferred-work.md`, the `sprint-status.yaml` ledger comments, package READMEs, the
1.16a/b/c/d story files — and this gate's own test fixtures + `benefit-mechanism.yaml`
(which _lists_ the mechanisms). **None of those are rule records.**

So the gate reads **only**: the declared `rule_sources` (seed/fixture globs — empty at
v1) + migration `*.sql` for the configured tables + the drizzle snapshot + the enum
file. It **never** globs the repo root / `_bmad-output/**` / `docs/**` / every
`**/*.md` / `sprint-status.yaml` / its own `scripts/benefit-mechanism/**` fixtures /
`benefit-mechanism.yaml`. Self-green is **designed in via scope**, not luck — the gate
is green by construction on the PR that introduces it.

## Mechanism — repo-root script, NOT a turbo task

The gate is **repo-global**: the rule artifacts span `packages/domain` (the
`clause_versions` migration + seed) and `apps/api/src/modules/rules/` (the registry
payload). No single workspace owns them, so it cannot be a per-package turbo task — it
lives at the repo root in `scripts/benefit-mechanism/` (alongside the sibling
`scripts/schema-diff/`), wired as a dedicated `benefit-mechanism` job in
`.github/workflows/ci.yml` plus the root `benefit:check` / `benefit:test` scripts. The
forward-compat **enum type** still lives in `packages/contracts/` (importable by Epic
2); only the **gate** is repo-root.

`scripts/benefit-mechanism/` is **not** a pnpm workspace, so its tests are NOT
discovered by `pnpm turbo run test`; the CI job runs `pnpm benefit:test` explicitly
before `pnpm benefit:check` (the `schema-diff` / `friction-budget` precedent). There
is **no `turbo.json` entry** — a repo-root tsx script is not a turbo task.

## Mechanism — invariant scan, NOT a git-diff

This gate is an **invariant scan of the current repo state**, not a git-diff against a
PR base ref. ⇒ **NO `fetch-depth: 0`**, no `GITHUB_BASE_REF`, no merge-base — the
`benefit-mechanism` CI job mirrors the sibling **`schema-diff`** / **`pii-scrape`**
gates, **NOT** the **`friction-budget`** gate (whose `fetch-depth: 0` exists only for
its declaration facet's genuine base-ref diff).

## Relationship to Story 14.5

**1.16d installs the gate; it runs continuously on every PR across Epic 2 + downstream
consumers.** **Story 14.5** (FR-100 `benefit_mechanism` Tag Verification — Continuous
CI Gate Final Closure, epics L4314-4329) records the final verification (gate ran
across Epic 2+, every v1 rule `pool`, `reserve` tags zero v1 rules) and confirms the
gate persists post-v1 as a permanent governance gate — then **flips `v1_only: false`**
at v2 (trustee-attested ADR per Story 14.7). 1.16d installs; 14.5 closes. The
14.5↔1.16d pairing mirrors 14.4↔1.16c.

## Running locally

```sh
pnpm benefit:test   # unit tests (pure engine: 3 checks + extractors + config parse)
pnpm benefit:check  # the gate (green-with-teeth: enum matches; 0 rule records / no rule table → no-op)
```
