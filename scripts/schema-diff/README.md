# `scripts/schema-diff/` — the schema-diff PR CI gate (FR-100 non-add guard)

The CI gate for **FR-100** (Story 1.16c). It enforces the **forward-compat
non-add discipline** for the Durghatana Sahayata (Accident Assistance) payout
slot: **v1 ships ZERO payout-destination surface**, so the v2/v3 activation must
be a **greenfield addition** (a new table + new endpoints + a new module), never
a column/index add to a v1 table.

Authority: architecture §1.13 Hook 2 (L1149-1163) · PRD §4.15 FR-100 (L1253) ·
epics Story 1.16c (L1328-1344). ADR: `docs/adr/ADR-0014-schema-diff-ci-gate.md`.

## Files

- `check.ts` — entrypoint (impure: glob + fs read + `process.exit`). Run via `pnpm schema:check`.
- `lib.ts` — pure, importable core (registry parse + the four scanners). Unit-tested.
- `lib.test.ts` — fixture-driven unit tests. Run via `pnpm schema:test`.
- `../../fr-100-non-add.yaml` — the versioned pattern registry (repo root).

## What it scans — the four precision-scoped scanners

| #   | Scanner         | Forbidden pattern                          | Artifact root(s)                                                                                  |
| --- | --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| a   | **Tables**      | exact `payout_destinations`                | latest `packages/domain/migrations/meta/*_snapshot.json` + all `packages/domain/migrations/*.sql` |
| b   | **Columns**     | prefix `payout_destination*` (any table)   | same as (a)                                                                                       |
| c   | **Endpoints**   | route-path literal `/payout-destinations*` | `apps/api/src/**/*.ts` string literals                                                            |
| d   | **Zod schemas** | exported identifier `*PayoutDestination*`  | `packages/contracts/src/**/*.ts` exports                                                          |

Each scanner is **pure + importable** (takes already-read file contents / parsed
JSON, returns `Finding[]`); the impure `check.ts` resolves the roots, reads the
files, runs the scanners, prints each finding (kind + artifact + file `:line` +
the violated pattern), and `exit(1)` on any finding. Each is fixture-tested with
a **positive** (forbidden artifact → finding) and a **negative** (compliant
`member_addresses` / `mailing_address_id` / `/api/v1/members` / `MemberAddressSchema`
→ no finding) case, plus the allow-list path and malformed-config → throw.

## Mechanism — invariant scan, NOT a git-diff

Despite the name "schema-diff," this gate is an **invariant scan of the current
repo state**, not a git-diff against a PR base ref. The v1 baseline permits
**zero** payout-destination artifacts _ever_, so the correct, robust realization
is: scan the current state and assert zero FR-100 artifacts exist. A base-ref
git-diff would be strictly worse — it could miss an artifact introduced earlier
on the same branch, or wrongly pass one already merged to `main`. A whole-state
invariant scan has neither failure mode.

⇒ **NO `fetch-depth: 0`**, no `GITHUB_BASE_REF`, no merge-base — the
`schema-diff` CI job mirrors the sibling **`pii-scrape`** gate (which also scans
current state), **NOT** the sibling **`friction-budget`** gate (whose
`fetch-depth: 0` exists only for its declaration facet's genuine base-ref diff).

## Mechanism — repo-root script, NOT a turbo task, NOT a `db:check` fold-in

The gate is **repo-global**: its four assertions span `packages/domain`
(tables/columns), `apps/api` (endpoints), **and** `packages/contracts` (Zod). No
single workspace owns all four, so it cannot be a per-package turbo task — it
lives at the repo root in `scripts/schema-diff/` (alongside the sibling
`scripts/friction-budget/`), wired as a dedicated `schema-diff` job in
`.github/workflows/ci.yml` plus the root `schema:check` / `schema:test` scripts.

It is **not** folded into `db:check`: `db:check` is `drizzle-kit check`, a canned
migration-consistency command that **cannot** host custom forbidden-pattern
asserts. The disjoint ownership (deferred-work D9-1.2) is honored — `db:check`
keeps the lightweight drift primitive; `schema-diff` owns the substantive FR-100
asserts.

`scripts/schema-diff/` is **not** a pnpm workspace (`pnpm-workspace.yaml` covers
only `apps/*` and `packages/*`), so its tests are NOT discovered by `pnpm turbo
run test`; the CI job runs `pnpm schema:test` explicitly before `pnpm
schema:check` (the `friction-budget` precedent). There is **no `turbo.json`
entry** — a repo-root tsx script is not a turbo task.

## Precision-scoping IS the self-green invariant

The four FR-100 keywords (`payout_destinations`, `payout_destination`,
`/payout-destinations`, `PayoutDestination`) appear **dozens of times** in
**non-artifact** files: the epics, the architecture, the PRD, `deferred-work.md`,
the `sprint-status.yaml` ledger comments, package READMEs, the 1.16a/b/c story
files — and this gate's own test fixtures + the `fr-100-non-add.yaml` config
(which _lists_ the forbidden patterns). **None of those are artifacts.**

So the gate scans **only** the four real artifact roots above and explicitly
**excludes**: `_bmad-output/**`, `docs/**`, every `**/*.md`, `sprint-status.yaml`,
the gate's own `scripts/schema-diff/**`, and `fr-100-non-add.yaml`. Self-green is
**designed in via scope**, not luck — the gate is green by construction on the PR
that introduces it. (Verified at authoring time: all four real scan roots are
clean.)

## How a v2 greenfield payout surface is admitted

When v2 introduces the Durghatana Sahayata payout-destination surface, it is
admitted by adding an explicit **`allow` entry** to `fr-100-non-add.yaml` — a
`{ kind, artifact, rationale, adr }` record, each with a rationale + a
**trustee-attested ADR ref** per Story 14.7 (capability-bar update). It is **not**
admitted by changing the scan roots. The allowlist is empty at v1.

## Relationship to Story 14.4

**1.16c installs the gate; it runs continuously on every PR across Epics 1-13.**
**Story 14.4** (FR-100 Schema-Diff Verification — Continuous CI Gate Final
Closure) records the final verification in
`_bmad-output/research/fr-100-schema-diff-verification.md` (CI-run history +
final-state proof) and confirms the gate persists post-v1 launch as a permanent
governance gate. 1.16c installs; 14.4 closes.

## Running locally

```sh
pnpm schema:test   # unit tests (pure scanners)
pnpm schema:check  # the gate (green by construction over the four real scan roots)
```
