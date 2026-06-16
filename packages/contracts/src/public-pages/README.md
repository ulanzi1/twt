# `public-pages/` — the FR-74 Public-vs-Private matrix + PII scrape gate

The consumed contract + verification engine for the **FR-74 PII scrape CI gate**
(Story 1.16b). The matrix declares, per public-page surface and per renderable
field, exactly one of four visibility tiers; the gate asserts no field renders
above its tier on a surface a given viewer may see, and that no naked PII leaks
into a public HTML render.

Authority: PRD FR-74 (L1030-1040) · Architecture Principle #7 (L292-293) · §2.7
(L1522-1524, the matrix is the canonical tier-classification authority) · Story
11a.1 AC (epics L3586-3620, the 4-tier model + the leak rules). ADR:
`docs/adr/ADR-0013-pii-scrape-ci-gate.md`.

## What ships now vs grows later

This story ships the **consuming gate + engine + a structurally-valid scaffold**.
It is **NOT** Epic 11a (which _populates_ the matrix with real surfaces under a
trustee-attested PR), and **NOT** the live-render integration spec (which lands
with the real public surfaces and _imports_ this engine). Green by construction:
the scaffold matrix is empty and no public surface renders in CI yet.

## Files

| File                                               | Role                                                                                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matrix.ts`                                        | Zod schema (`VisibilityTier`, `SearchIndexingPolicy`, surfaces/fields) + `parsePublicVsPrivateMatrix` (loud throw on malformed; `null` on empty).                                                   |
| `scrape.ts`                                        | **Pure, importable** engine: the 4 tier-leak rules (`evaluateSurfaceRender`), the naked-PII detector (`detectNakedPii`), the `RenderSnapshot` abstraction, and the `evaluateSnapshot` orchestrator. |
| `../../scripts/check-pii-scrape.ts`                | The impure gate entrypoint (loads + parses the matrix, enumerates snapshots, runs the engine, accumulates `failures[]`, exits). Run via `pnpm pii:check`.                                           |
| `../../public-pages/public-vs-private-matrix.yaml` | The consumed contract — an empty scaffold at v1 (`version: 1`, `surfaces: []`). Epic 11a (Story 11a.1) populates it.                                                                                |
| `../../tests/public-pages.test.ts`                 | Fixture unit tests (ride `pnpm turbo run test` — contracts is a workspace).                                                                                                                         |

The pure-core (`scrape.ts`) / impure-entry (`check-pii-scrape.ts`) split mirrors
`scripts/friction-budget/{lib.ts,check.ts}` (Story 1.16a). The engine is exported
from `@twt/contracts` so the deferred live-render integration spec
(`tests/integration/public-pages/scrape-test.spec.ts`, D13-1.2) imports it.

## The 4 tiers + the leak rules (Story 11a.1 AC, epics L3596-3620)

| Tier                   | Meaning                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `public`               | Internet-visible without auth — renderable everywhere.                               |
| `authenticated_member` | Logged-in members only — **not** on public renders.                                  |
| `operator_restricted`  | Staff/trustees/admins with RBAC scope — **not** on member or public renders.         |
| `never_exposed`        | Never rendered on **any** surface (Aadhaar, bank details; Tier-1 PII per Story 1.5). |

A field whose tier exceeds the viewer context's ceiling is a leak, reported
naming the offending **surface + field**. A rendered field the matrix does not
declare is **fail-closed** (`unclassified` leak). On a `public` HTML render, a
naked phone / email / Aadhaar pattern is also a leak (FR-74 testable consequence;
Story 11a.4 obfuscation is the defense-in-depth layer — the gate detects leaks).

Each surface also declares a `search_indexing_policy ∈ {index | noindex |
conditional}` (epics L3614).

## Mechanism — why a `packages/contracts/` turbo task (not a repo-root script)

The gate is a **`packages/contracts/` turbo task**
(`contracts:check-pii-scrape`, mirroring `check-openapi-determinism`) + a
dedicated `pii-scrape` CI job, with a root `pii:check` script. Unlike sibling
1.16a's `scripts/friction-budget/` (repo-global: root config + cross-app build
scan + PR git-diff → `fetch-depth: 0`), **1.16b's config is a contracts
artifact with no git-diff** — so the matching precedent is the contracts turbo
task, and the job uses the **default shallow checkout (no `fetch-depth: 0`)**.
The engine lives in `src/` so the future integration spec can import it, and its
unit tests ride `pnpm turbo run test` automatically (no separate `pii:test`
step). See ADR-0013 for the full repo-scope rationale.

## No-op / self-green semantics (AC-3, AC-6)

The `pii-scrape` job MUST pass on the PR that introduces it. The no-op is
**data-driven**, not a feature flag:

- **Absent matrix file** → no-op pass.
- **Empty / scaffold matrix** (`surfaces: []`) → no-op pass (the engine evaluates
  nothing).
- **A surface with no available render snapshot** → that surface's scrape is a
  no-op (no public render exists in CI: `apps/public` is a `tsc` stub until the
  Story 2.5 Astro shell; `apps/api/src/modules/public-pages/` is empty until Epic
  11b).
- **A malformed matrix** → the gate **fails loudly** (`parsePublicVsPrivateMatrix`
  throws; never silently skipped).

As Epic 11a fills the matrix and Story 2.5/11a.2 render public surfaces, the
snapshots feed the engine and the leak rules acquire teeth — **without a code
change to the gate**.

## Running locally

```sh
pnpm pii:check                     # the gate (no-op-green today)
pnpm --filter @twt/contracts test  # the engine's fixture unit tests
```
