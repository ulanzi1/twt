# ADR-0013: PII scrape CI gate — FR-74 matrix-consumer, 4-tier leak engine + naked-PII detection, no-op-until-populated, contracts-turbo-task repo-scope

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.16b closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (continuation of the ADR-0010 session); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

FR-74 / Architecture Principle #7 (PII shielding) / §2.7 lines 1522-1524 commit
a **Public-vs-Private visibility matrix as the canonical tier-classification
authority**, enforced by an **automated CI scrape-test** asserting no "Never
public" field leaks to a public surface (PRD L1030-1040; the planned `ci.yml`
"scrape-test" step, architecture L4159; the uncompromisable
`tests/integration/public-pages/scrape-test.spec.ts` slot, L4427). Story 1.16b
is the control that establishes this gate. Per
[[feedback_architecture_vs_adr_boundary]], the architecture commits the
*property* (the matrix is canonical; no Tier-1 field renders to a public
surface); this ADR records the *controls* chosen.

The forcing conditions / reconciliations:

- **The matrix the gate consumes is not yet populated.** Epic 11a (Story 11a.1)
  populates `public-vs-private-matrix.yaml` with real per-surface/per-field tiers
  under a trustee-attested PR (epics L3602). Story 1.16b ships the **gate that
  consumes it** + a structurally-valid **scaffold** (schema + empty surfaces)
  that fixes the format so Epic 11a populates content rather than inventing one.
- **No public surface renders in CI today.** `apps/public` is a `tsc` stub until
  the Story 2.5 Astro shell; `apps/api/src/modules/public-pages/` is empty until
  Epic 11b. So a *live* scrape of pages-that-do-not-exist is not the v1
  deliverable — the **consuming gate + verification engine + scaffold + no-op
  semantics** are. This is the same no-op-until-populated bootstrapping as the
  sibling Story 1.16a (whose metric facet no-ops until member build output lands).
- **The architecture also commits a live-render integration spec**
  (`tests/integration/public-pages/scrape-test.spec.ts`, D13-1.2). That spec is
  the *live-render realization* — it lands with the actual public surfaces (Story
  2.5/11a.2) and **imports this story's engine** to run against real renders. So
  the engine must be **pure + importable**, not buried in an impure script.
- **Repo-scope question (the #1 mechanism call).** The adjacent gate cluster
  (1.16a/b/c/d) does not share one home. 1.16a is repo-root `scripts/` *for
  cause* (root config + cross-app build scan + PR git-diff → `fetch-depth: 0`).
  1.16b's config is a `packages/contracts/` artifact with **no git-diff** — so
  its matching precedent is the contracts turbo task
  (`check-openapi-determinism`), not friction-budget.

## Decision

### 1. Consume the FR-74 matrix via a Zod schema + a loud-throw parser

`packages/contracts/src/public-pages/matrix.ts` declares the matrix schema: a
`VisibilityTier` enum (`public | authenticated_member | operator_restricted |
never_exposed`, the 4 tiers per Story 11a.1 AC, epics L3596-3600), a
`SearchIndexingPolicy` enum (`index | noindex | conditional`, epics L3614), and
the per-surface / per-field structure (`.strict()`, on-pattern with the rest of
`packages/contracts/`). `parsePublicVsPrivateMatrix` parses + validates and
**throws loudly on a malformed matrix** (mirroring 1.16a's
`parseFrictionBudgetYaml` posture — a malformed registry must fail the gate, never
be silently skipped); a blank/comments-only document returns `null` (the
empty-matrix no-op sentinel). The committed scaffold
(`packages/contracts/public-pages/public-vs-private-matrix.yaml`) is `version: 1`
+ `surfaces: []` with a header comment block documenting the 4 tiers, the
`search_indexing_policy`, and the trustee-attested-escalation governance note —
so Epic 11a populates content into a fixed format.

### 2. A pure, importable 4-tier leak engine + naked-PII detector

`packages/contracts/src/public-pages/scrape.ts` is **side-effect-free and
importable** (the deferred live-render integration spec, D13-1.2, consumes it).
It enforces the four tier-leak rules (Story 11a.1 AC, epics L3618-3620) via a tier
rank vs viewer-context ceiling: `never_exposed` appears on no surface;
`operator_restricted` not on member/public renders; `authenticated_member` not on
public renders; `public` renderable everywhere. A rendered field the matrix does
not declare is **fail-closed** (`unclassified` leak). It additionally runs a
**conservative naked-PII detector** (phone / email / Aadhaar regexes) over public
HTML renders (FR-74 testable consequence PRD L1039; Story 11a.4 / FR-93 —
obfuscation is the defense-in-depth layer, the gate detects leaks). Every leak is
reported **naming the offending surface + field** (epics L1321). The pure-core /
impure-entry split mirrors 1.16a's `scripts/friction-budget/{lib.ts,check.ts}`.

### 3. No-op-until-populated bootstrapping (data-driven, not a feature flag)

The impure gate (`packages/contracts/scripts/check-pii-scrape.ts`) loads +
Zod-parses the matrix, enumerates available render snapshots, runs the engine,
accumulates `failures[]`, prints structured per-finding output, and exits non-zero
on any leak. At v1: an absent matrix → no-op pass; an empty/scaffold matrix →
no-op pass; a surface with no available render snapshot → that surface is a no-op
(AC-3). The no-op is **data-driven** (empty matrix + no snapshots), not a feature
flag — as Epic 11a fills the matrix and Story 2.5/11a.2 render public surfaces, the
snapshots feed the engine and the leak rules acquire teeth **without a code change
to the gate**. The gate is therefore **green by construction on the PR that
introduces it**.

### 4. Repo-scope: a `packages/contracts/` turbo task, NOT a repo-root script, NO `fetch-depth: 0`

The gate is homed as a `packages/contracts/` turbo task
(`contracts:check-pii-scrape`, mirroring `check-openapi-determinism`) + a root
`pii:check` script + a dedicated `pii-scrape` job in `.github/workflows/ci.yml`
(mirroring the `contracts-check` job shape: `needs: install`, pnpm 10.30.3 + node
22.12.0 + `--frozen-lockfile`). **Unlike `friction-budget`, this job does NOT use
`fetch-depth: 0`** — the PII gate validates the *current* matrix + *current*
renders; it does not diff against a PR base ref. The decision against 1.16a's
repo-root `scripts/` home is deliberate: 1.16a is repo-global *for cause*
(git-diff + cross-app scan); 1.16b's config is a contracts artifact with no
git-diff, so honoring the gate's actual scope beats mechanical cluster
uniformity. The engine lives in `src/public-pages/` (a repo-root `scripts/`
module would be awkward to import from `tests/`), and its unit tests ride
`pnpm turbo run test` automatically (contracts **is** a pnpm workspace — no
separate `pii:test` step is needed, unlike `scripts/friction-budget/` which
needed `friction:test`). The cluster is an honest split, not an inconsistency:
1.16c (schema-diff across packages + apps/api) and 1.16d (`benefit_mechanism`
fixtures/migrations/seed) **are** repo-global → those belong at repo-root
`scripts/`.

### 5. D8-1.5 column-metadata cross-check leg — explicitly deferred

deferred-work D8-1.5 gives the FR-74 gate two jobs: (1) scrape public surfaces
for tier leakage (this story's engine), and (2) read `piiColumn` tier metadata to
assert matrix compliance ("no Tier-1/Tier-2 column is matrix-classified
`public`"). Leg (2) cross-checks against the matrix — which is **empty until
Story 11a.1** — so it has nothing to assert at v1, and the rendered-field→DB-column
mapping is Epic 11a/11b territory. **Leg (2) is Resolved via explicit deferral**
with trigger (matrix populates at Story 11a.1), per
[[feedback_closure_language_precision]] — never silently dropped. The
`piiColumn(tier, fieldClass)` metadata primitive (Story 1.5;
`packages/domain/src/encryption/{column.ts,tiers.ts}` name this story as the
consumer) stands; only the cross-check leg defers. (When it lands: an AST /
value-import enumeration of `piiColumn(1|2, …)` call-sites cross-checked against
matrix `public` entries.)

### 6. Relationship to the deferred live-render integration spec

The architecture-committed `tests/integration/public-pages/scrape-test.spec.ts`
(D13-1.2) is the **live-render realization** of this gate. It lands at Story
2.5/11a.2 with the actual public surfaces and **imports this story's
`evaluateSnapshot` / `evaluateSurfaceRender` / `detectNakedPii`** engine,
feeding it real render snapshots. Story 1.16b ships the engine + the governance
gate with fixture coverage + a graceful no-op; the live integration spec is
Resolved via explicit deferral to its landing Story.

## Alternatives considered

- **Live-scrape real pages now** — Rejected: no public surface renders in CI
  (`apps/public` is a `tsc` stub until Story 2.5; `apps/api/.../public-pages/` is
  empty until Epic 11b). Building those surfaces to satisfy 1.16b would invert the
  epic dependency order. The no-op-until-populated pattern is the AC-blessed
  alternative (mirrors 1.16a).
- **Pre-populate the matrix with real surfaces** — Rejected: matrix population is
  Epic 11a's trustee-attested job (epics L3602). 1.16b fixes the *format* (empty
  scaffold); Epic 11a fills the *content*.
- **Repo-root `scripts/pii-scrape/` for cluster symmetry with 1.16a** — Rejected:
  mechanical uniformity would be cargo-culting. 1.16a is repo-root for cause
  (git-diff + cross-app scan + `fetch-depth: 0`); 1.16b is matrix-scoped with no
  git-diff, and a `scripts/` home would force an explicit `pii:test` step
  (`scripts/` is not a workspace) + an awkward cross-`tests/` import for the future
  integration spec. The contracts turbo task is the faithful realization.
- **Co-land the `piiColumn` ↔ matrix column-metadata cross-check now** —
  Deferred (not rejected): it has nothing to assert against an empty matrix, and
  extracting tier metadata from Drizzle column internals for an empty matrix is
  premature plumbing. Trigger recorded (matrix populates at Story 11a.1).
- **Aggressive PII regexes (catch everything)** — Rejected in favour of
  conservative patterns: Story 11a.4 obfuscation is the defense-in-depth layer;
  the gate's job is to detect *leaks*, and an over-eager detector would produce
  false positives on legitimate non-PII content.

## Consequences

- **Operational** — Every PR runs the `pii-scrape` job. Today it is green by
  construction (empty scaffold matrix + no render snapshots → no-op); as Epic 11a
  populates the matrix and public surfaces render (Story 2.5/11a.2), the gate
  begins enforcing the four tier-leak rules + naked-PII detection — data-driven,
  with no code change. The PR-template Security-impact prompt now references the
  live gate + FR-74 matrix (no 7th prompt added — the 6-prompt budget holds).
- **Security** — No new secrets/credentials; the gate is read-only (fs read of
  the matrix only). It is the FR-74 enforcement seam (SM-C5 public-PII-exposure is
  a hard-zero counter-metric, PRD L1346); v1 establishes the seam, teeth grow with
  data.
- **Performance** — One extra CI job (`needs: install`), running in parallel with
  the other gates; the default shallow checkout (no `fetch-depth: 0`).
- **Cost** — Negligible (one short Node/tsx run per PR).
- **Failure modes accepted** — The gate cannot catch a leak on a surface that does
  not render in CI yet (no-op); the matrix is empty until Epic 11a (the gate is a
  format-fixing scaffold meanwhile); the `piiColumn` ↔ matrix cross-check is not
  enforced until Story 11a.1; the naked-PII detector is conservative (it targets
  phone/email/Aadhaar shapes, not every conceivable PII pattern).
- **Migration / pivot path** — When public surfaces render, the deferred live
  integration spec (D13-1.2) imports this engine and runs it against real
  renders. If the contracts turbo task outgrows its home, it can move (the engine
  is already an importable `@twt/contracts` export). If the conservative PII
  patterns prove too lax once renders land, tighten them in `scrape.ts` (the
  detector is a single pure function).

## References

- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-74, L1030-1040] — Public-vs-Private matrix (Public / Members-only / Never) + the testable consequence (automated scrape asserts no "Never" PII exposed); SM-C5 hard-zero counter-metric (L1346)
- [Source: architecture.md §Principles L292-293] — Principle #7 PII shielding (single enforcement layer + automated CI scrape-test)
- [Source: architecture.md §2.7 L1522-1524] — the Public-vs-Private matrix (FR-74) is the canonical tier-classification authority; CI guards no Tier-1 field renders to a public surface
- [Source: architecture.md L4159 (planned ci.yml "scrape-test" step) + L4427 (`tests/integration/public-pages/scrape-test.spec.ts` slot)] — the live-render realization this engine feeds
- [Source: epics.md Story 1.16b (L1309-1326)] — story statement + the no-op-until-populated AC; Story 11a.1 (L3586-3620) the 4-tier model + the 4 leak-rule verification (L3618-3620); Story 11a.3 (L3649-3664) the per-field tier table; Story 11a.4 (L3698-3701) naked phone/email detection
- [Source: packages/contracts/scripts/check-openapi-determinism.ts + package.json] — the tsx contracts-turbo-task home + namespace mirrored
- [Source: scripts/friction-budget/{lib.ts,check.ts,README.md} + ADR-0012] — the sibling governance gate: pure-core/impure-entry split, throw-on-malformed parse, `failures[]` accumulation, no-op semantics mirrored; the `fetch-depth: 0` + repo-root `scripts/` decisions are 1.16a-specific (git-diff + repo-global) and deliberately do NOT carry over
- [Source: packages/domain/src/encryption/column.ts:16 + tiers.ts:5] — `piiColumn(tier, fieldClass)` tier metadata; both name Story 1.16b / D8-1.5 as the consumer (the column-cross-check leg deferred)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — "Story 1.16b — resolutions + new deferrals" (D8-1.5 split, D13-1.2 update, D7-1.5 cross-ref)
- [Source: _bmad-output/implementation-artifacts/1-16b-pii-scrape-ci-gate.md] — owning Story
- Memory: [[feedback_architecture_vs_adr_boundary]] — property vs control discipline
- Memory: [[feedback_closure_language_precision]] — Closed-by-edit vs Resolved-via-explicit-deferral

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-21 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-06-21 Trustee Panel session (engineering substrate — light-touch; continuation of the ADR-0010 session); `.decision-log.md` Decision 2026-06-21-059; consent sheet `adr-ratification-consent-sheet-2026-06-21.md`. Cascade applied 2026-06-22. |
| 2026-06-16 | (initial draft) | Solo Builder (BigDev) | Authored under Story 1.16b (PII scrape CI gate) closure |
