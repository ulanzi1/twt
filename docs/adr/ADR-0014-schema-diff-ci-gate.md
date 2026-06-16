# ADR-0014: Schema-diff CI gate — FR-100 non-add guard, invariant-scan-not-git-diff, four precision-scoped scanners, repo-global repo-root mechanism

> **Status:** drafted
> **Date:** 2026-06-16 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.16c closure
> **Ratifying trustees:** <pending; populated at `ratified` status>
> **Supersedes:** —
> **Superseded by:** —

## Context

FR-100 (PRD §4.15 L1245-1269) / Architecture §1.13 Hook 2 (L1149-1163) commit a
**forward-compat non-add discipline** for the Durghatana Sahayata (Accident
Assistance) payout slot: **v1 ships ZERO payout-destination surface** — no
`payout_destinations` table; no `payout_destination_id` column on `members` /
`claims` / `pools` / `payments` or any v1 entity; no API endpoint, Zod schema,
validator, OpenAPI route, or UI surface — so the v2/v3 activation is a
**greenfield introduction** (a new table + new endpoints + a new module), never a
column/index add to a v1 table. Story 1.16c is the control that establishes the
CI gate enforcing this from day one across every intermediate epic. Per
[[feedback_architecture_vs_adr_boundary]], the architecture commits the *property*
(the v1 schema-diff at launch must be a greenfield introduction); this ADR records
the *controls* chosen.

The forcing conditions / reconciliations:

- **"schema-diff" is an invariant scan, not a git-diff** (the #1 mechanism
  reconciliation). The epics phrase "compares every PR's Drizzle migration set
  against the v1 baseline" (L1338) *sounds* like a base-ref diff. It is not. The
  v1 baseline permits **zero** payout-destination artifacts ever, so the correct,
  robust realization is to **scan the current repo state and assert zero FR-100
  artifacts exist**. A base-ref git-diff is strictly worse: it could miss an
  artifact introduced earlier on the same branch, or wrongly pass one already
  merged to `main`. A whole-state invariant scan has neither failure mode.
- **Precision-scoping IS the self-green invariant** (the #2 reconciliation). The
  four FR-100 keywords appear dozens of times in **non-artifact** files (epics,
  architecture, PRD, `deferred-work.md`, `sprint-status.yaml` ledger comments,
  package READMEs, the 1.16a/b/c story files) and in the gate's own fixtures +
  the `fr-100-non-add.yaml` config (which *lists* the patterns). None are
  artifacts. A sloppy glob would red-fail the gate's own introducing PR on
  documentary mentions; the scanners must be scoped to exactly the four real
  artifact roots.
- **`db:check` cannot host these asserts** (the #3 reconciliation). `db:check` is
  `drizzle-kit check` — a canned migration-consistency command. The substantive
  FR-100 forbidden-pattern asserts are repo-global (migrations **and** `apps/api`
  endpoints **and** `packages/contracts` Zod) and cannot fold into it. The stale
  `db-check` ci.yml comment that aspirationally named 1.16c is reconciled.
- **It is NOT the OpenAPI breaking-change semantic-diff gate** (D1-1.4) — a
  *different* gate loosely co-routed to "1.16c" in deferred-work; it stays
  deferred (route surface still thin).

## Decision

### 1. Enforce FR-100 via a versioned `fr-100-non-add.yaml` registry + a loud-throw parser

A repo-root `fr-100-non-add.yaml` declares the four forbidden patterns
(`forbidden_table: payout_destinations`, `forbidden_column: payout_destination`
[prefix], `forbidden_endpoint: /payout-destinations` [prefix], `forbidden_zod:
PayoutDestination` [substring]) + an `allow: []` list (empty at v1) + a header
comment documenting the FR-100 rationale and the v2-extension governance note.
`parseFr100Config` parses + validates and **throws loudly on a malformed
registry** (mirroring 1.16a's `parseFrictionBudgetYaml` — a broken registry must
fail the gate, never silently disable enforcement). The pattern list is versioned
in-file so v2 can explicitly allow these patterns (epics L1340).

### 2. Four pure, precision-scoped forbidden-pattern scanners

`scripts/schema-diff/lib.ts` exposes four pure scanners (each takes already-read
content / parsed JSON + the parsed config, returns `Finding[]`): **(a) tables**
and **(b) columns** over the latest `packages/domain/migrations/meta/*_snapshot.json`
(the authoritative cumulative drizzle schema) + all `migrations/*.sql` (raw DDL
belt-and-suspenders); **(c) endpoints** over `apps/api/src/**/*.ts` route-path
string literals (a static scan — no Fastify boot); **(d) Zod schemas** over
`packages/contracts/src/**/*.ts` exported identifiers. Each finding names the
kind + matched artifact + file (`:line` / migration) + the violated pattern. The
allowlist short-circuits a matched-but-allowed artifact. Each scanner is
fixture-unit-tested (positive → finding-with-named-pointer; negative
`member_addresses` / `mailing_address_id` / `/api/v1/members` / `MemberAddressSchema`
→ no finding) plus the allow path + malformed-config throw. The pure-core /
impure-shell split mirrors 1.16a's `scripts/friction-budget/{lib.ts,check.ts}`,
NOT the monolithic `check-openapi-determinism.ts`.

### 3. Invariant scan of current state — NO `fetch-depth: 0`

The impure `scripts/schema-diff/check.ts` resolves the four precision-scoped scan
roots, reads them, runs the four scanners, accumulates `findings[]`, prints
structured per-finding output, and `exit(1)` on any finding. It scans the
**current repo state** — no `GITHUB_BASE_REF`, no merge-base, no `fetch-depth: 0`.
The `schema-diff` CI job mirrors the sibling **`pii-scrape`** gate (current-state
scan), **NOT** the sibling **`friction-budget`** gate (whose `fetch-depth: 0`
exists only for its declaration facet's genuine base-ref diff). Cargo-culting
`fetch-depth: 0` here would be the exact anti-pattern in reverse.

### 4. Precision-scoping = self-green by construction

The gate globs **only** the four real artifact roots and explicitly **excludes**
`_bmad-output/**`, `docs/**`, every `**/*.md`, `sprint-status.yaml`, the gate's
own `scripts/schema-diff/**` (its fixtures contain the forbidden strings by
design), and `fr-100-non-add.yaml` (the config lists the patterns). So the gate
is **green by construction on the PR that introduces it** — the four real roots
are clean (verified at authoring) and the dozens of documentary keyword mentions
are scoped out. Self-green is designed in via scope, not luck.

### 5. Repo-global repo-root `scripts/` mechanism, NOT a turbo task, NOT a `db:check` fold-in

The gate is repo-global — its four assertions span `packages/domain` +
`apps/api` + `packages/contracts`, so no per-package turbo task can express it. It
lands at the repo root in `scripts/schema-diff/` (the home 1.16b's Dev Notes
predicted for the repo-global c/d siblings), wired as a dedicated `schema-diff`
job in `.github/workflows/ci.yml` (mirroring the `pii-scrape` / `friction-budget`
shape) + root `schema:check` / `schema:test`. `scripts/` is not a pnpm workspace,
so the job runs `pnpm schema:test` explicitly before `pnpm schema:check` (the
`friction-budget` precedent); there is **no `turbo.json` entry** (a repo-root tsx
script is not a turbo task). The **`db:check` disjoint ownership** is honored:
`db:check` (`drizzle-kit check`) keeps the lightweight drift primitive; the
substantive FR-100 asserts are the new `schema-diff` gate. The stale `db-check`
ci.yml comment naming 1.16c is reconciled to cross-reference the new job
(deferred-work D9-1.2).

### 6. Relationship to Story 14.4 (final closure)

1.16c **installs** the gate; it runs continuously on every PR across Epics 1-13.
**Story 14.4** (FR-100 Schema-Diff Verification — Continuous CI Gate Final
Closure, epics L4294-4312) records the **final verification** in
`_bmad-output/research/fr-100-schema-diff-verification.md` (CI-run history +
final-state proof) and confirms the gate persists post-v1 launch as a permanent
governance gate (v2 allowlist extension = trustee-attested ADR + capability-bar
update per Story 14.7). 1.16c installs; 14.4 closes. 14.4's verification artifact
is NOT built here — cross-referenced only.

## Alternatives considered

- **Base-ref git-diff of the migration set (`fetch-depth: 0`)** — Rejected: the
  invariant the architecture commits is "zero payout-destination artifacts ever,"
  which a whole-state scan asserts strictly more robustly than a diff (a diff can
  miss an earlier-branch artifact and wrongly pass a merged one). Mirroring 1.16a
  here would be cargo-culting its declaration-facet-specific `fetch-depth: 0`.
- **Fold the asserts into `db:check`** — Rejected: `db:check` is `drizzle-kit
  check`, a canned command that cannot host custom asserts, and the asserts are
  repo-global (span apps/api + contracts, not just migrations). Disjoint
  ownership (D9-1.2) is the architecture-committed posture.
- **A per-package turbo task (like `pii-scrape`)** — Rejected: no single
  workspace owns all four artifact domains. The repo-global scope forces a
  repo-root `scripts/` home (the 1.16a precedent), exactly as 1.16b's cluster
  split predicted for 1.16c/d.
- **Scan broadly (all `*.yaml` / repo root / `*.md`)** — Rejected: it would
  red-fail the gate's own introducing PR on the dozens of documentary keyword
  mentions. Precision-scoping to the four real artifact roots is the self-green
  invariant, not an optimization.
- **Co-land the adjacent `@twt/domain` exports-map pair (W10/W12-CR1.6)** —
  Deferred (not rejected): orthogonal to the FR-100 gate and coupled (a partial
  exports map would break W12). Re-deferred to a focused exports-map hardening
  pass (BigDev decision at 1.16c dev). Trigger recorded in deferred-work.

## Consequences

- **Operational** — Every PR runs the `schema-diff` job. Today it is green by
  construction (the four real scan roots are clean). It begins enforcing the
  moment anyone introduces a payout-destination artifact under a scanned root,
  failing with a precise pointer. The PR-template Security-impact prompt now
  references the live gate + the FR-100 non-add invariant (no 7th prompt added —
  the 6-prompt budget holds).
- **Security / governance** — The gate is the FR-100 forward-compat enforcement
  seam: it keeps the v2 payout surface a deliberate, trustee-attested greenfield
  addition rather than an accidental v1 column creep. Read-only (fs read of the
  four roots only); no new secrets/credentials.
- **Performance** — One extra CI job (`needs: install`), running in parallel with
  the other gates; the default shallow checkout (no `fetch-depth: 0`).
- **Cost** — Negligible (one short tsx run + a 22-test vitest run per PR).
- **Failure modes accepted** — The raw-DDL scanners are regex-based
  (belt-and-suspenders behind the authoritative snapshot scan); the endpoint scan
  is a static string-literal scan (no Fastify boot), so a route assembled by
  string concatenation rather than a literal would not be caught — acceptable
  because route paths in this codebase are literals and the snapshot/Zod scans
  cover the schema/contract surface regardless.
- **Migration / pivot path** — v2's greenfield payout surface is admitted via an
  explicit `allow` entry in `fr-100-non-add.yaml` (kind + artifact + rationale +
  trustee-attested ADR per Story 14.7), never a scan-root change. Story 14.4
  records the final continuous-gate verification.

## References

- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-100, L1245-1269] — §4.15 forward-compat hooks; L1253 the testable v1 non-add; L1269 "Column adds, new tables, new entities are acceptable [at v2]"
- [Source: architecture.md §1.13 Hook 2, L1149-1163] — the payout-destination forward-compat slot + the testable v1 non-add (no table/column/endpoint/Zod/validator/OpenAPI/UI); schema-diff at launch = greenfield introduction
- [Source: architecture.md §4.15 L4531] — reserved payout-destination slot, no v1 table/column/endpoint; Durghatana Sahayata greenfield at v2/v3
- [Source: epics.md Story 1.16c (L1328-1344)] — story statement + the two BDD blocks (scan migrations + endpoints + Zod for the four forbidden patterns, fail with a clear pointer, pattern list versioned in `fr-100-non-add.yaml`, precision-scoped so unrelated `member_addresses` passes)
- [Source: epics.md Story 14.4 (L4294-4312)] — FR-100 Schema-Diff Verification continuous-gate final closure (gate ran across Epics 1-13; final-state proof in `_bmad-output/research/fr-100-schema-diff-verification.md`; permanent post-v1 governance gate; v2 allowlist extension = trustee-attested ADR per Story 14.7)
- [Source: scripts/friction-budget/{lib.ts,check.ts,README.md} + ADR-0012] — the sibling repo-global gate: pure-core/impure-shell split, throw-on-malformed parse, `findings[]` accumulation, repo-root-script-vs-turbo-task mechanism mirrored; the `fetch-depth: 0` + base-ref diff are 1.16a-specific (its declaration facet) and deliberately do NOT carry over
- [Source: .github/workflows/ci.yml — `pii-scrape` job + ADR-0013] — the no-`fetch-depth: 0` current-state-scan job shape mirrored; the `db-check` job comment reconciled
- [Source: packages/domain/migrations/meta/*_snapshot.json + migrations/*.sql] — the drizzle table/column scan sources (latest = `0013_snapshot.json`; `tables` keyed `public.<name>`, each with `columns`); `db:check` = `drizzle-kit check` (canned; can't host the asserts)
- [Source: apps/api/src/**/*.ts route literals + packages/contracts/src/**/*.ts exports] — the endpoint + Zod scan sources
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — "Story 1.16c — resolutions + new deferrals" (D9-1.2 Closed; W11 cross-ref; D1-1.4 / W10-CR1.6 / W12-CR1.6 deferred)
- [Source: _bmad-output/implementation-artifacts/1-16c-schema-diff-ci-gate.md] — owning Story
- Memory: [[feedback_architecture_vs_adr_boundary]] — property vs control discipline
- Memory: [[feedback_closure_language_precision]] — Closed-by-edit vs Resolved-via-explicit-deferral

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-16 | (initial draft) | Solo Builder (BigDev) | Authored under Story 1.16c (schema-diff CI gate) closure |
