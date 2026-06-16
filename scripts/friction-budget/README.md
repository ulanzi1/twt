# `scripts/friction-budget/` — the friction-budget PR CI gate

The CI gate for **UX-DR3** (Story 1.16a). One entrypoint enforces **both facets**
of the friction-as-budget commitment:

| Facet           | Config (repo root)     | What it enforces                                                                                              |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Metric**      | `friction-budget.yaml` | Per-surface byte ceilings (JS bundle, page-weight) + the committed baseline-of-record (AC-1/2/3)              |
| **Declaration** | `friction-budget.md`   | Named-payer ledger structural validity + attribution-on-change when a member-facing surface is touched (AC-4) |

Authority: Architecture Principle #8 (line 294) · §4.11.1 page-weight budget
(lines 2785-2799) · AR-60 / UX-DR3 · UX Stance #2. ADR: `docs/adr/ADR-0012-friction-budget-pr-ci-gate.md`.

## Files

- `check.ts` — entrypoint (impure: fs + git + `process.exit`). Run via `pnpm friction:check`.
- `lib.ts` — pure, importable core (parse / compare / classify / verdict). Unit-tested.
- `lib.test.ts` — fixture-driven unit tests. Run via `pnpm friction:test`.

## Mechanism — why a repo-root script, not a turbo task

The existing gates (`db:check`, `contracts:check-openapi-determinism`,
`crypto:check`) are per-package turbo tasks because each governs one workspace.
Friction-budget is **repo-global**: it reads root-level config, scans
_cross-app_ build outputs, and inspects the _PR-level git diff_. None of that
maps to a single workspace — so the entrypoint lives at the repo root in
`scripts/friction-budget/` (the first product-level `scripts/` dir, alongside
the pre-existing `_bmad/scripts/`), wired as a dedicated `friction-budget` job in
`.github/workflows/ci.yml` (with `fetch-depth: 0` — the declaration facet diffs
against the PR base ref) plus the root `friction:check` / `friction:test` scripts.

`scripts/friction-budget/` is **not** a pnpm workspace (`pnpm-workspace.yaml`
covers only `apps/*` and `packages/*`), so its tests are NOT discovered by
`pnpm turbo run test`; the CI job runs `pnpm friction:test` explicitly before
`pnpm friction:check`.

## baseline-of-record model (AC-3) — committed file, not auto-push

Per architecture §4.11.1, the model is **report + threshold-fail** with a
committed baseline the author updates in-PR — _not_ a bot that pushes commits
(CI cannot cleanly push to a PR branch, and auto-push would fight the
"threshold change = rationale PR" discipline). Concretely:

- **Regression past the ceiling** → the gate **fails** with a structured diff.
- **Improvement** (measured below the committed baseline) → the author commits
  the lowered `baseline` in `friction-budget.yaml` in the same PR; the gate
  asserts `committed === measured`. A forgotten baseline update is caught as
  "improved but baseline-of-record not updated".
- **Ceiling (budget) change** is the separate-rationale-PR case (AC-1): the gate
  fails a same-PR ceiling loosening bundled with a measurement change.

## Bootstrapping / no-op (AC-2, AC-6)

The gate is green by construction on the PR that introduces it:

- **No member build output exists yet** → every surface is a graceful no-op
  until its `manifest` path lands (`apps/public` is a `tsc` stub until the Story
  2.5 Astro shell; `apps/mobile` `build` is an EAS no-op).
- **The declaration facet is path-triggered** → dormant until a member-facing
  app path (`apps/mobile/**`, `apps/public/**`) changes; the seed ledger keeps it
  structurally valid.
- **Live critical-render-path timing (canonical device = 3GB Android) is
  explicitly deferred** — no device-farm / throttled-Lighthouse harness exists in
  CI; the static proxies (bundle bytes + page-weight) ship now. Recorded as
  _"Resolved via explicit deferral"_ in `deferred-work.md`.

## Running locally

```sh
pnpm friction:test   # unit tests (pure core)
pnpm friction:check  # the gate (no-op-green today; diffs against origin/main)
```

The declaration facet needs a PR base ref. In CI (`pull_request`) it uses
`origin/$GITHUB_BASE_REF` with `fetch-depth: 0`; locally it falls back to
`git merge-base HEAD origin/main`. On `push` events or without `origin/main`
the declaration facet is skipped with a notice (it is a PR-scoped check).
