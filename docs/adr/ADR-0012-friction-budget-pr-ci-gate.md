# ADR-0012: Friction-budget PR CI gate — two-facet design, no-op-until-surface, committed baseline-of-record, repo-root-script mechanism, deferred live-device CRP timing

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.16a closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (continuation of the ADR-0010 session); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

UX-DR3 / Architecture Principle #8 (line 294) / AR-60 commit a **per-PR CI gate
that enforces the friction-as-budget discipline**: friction in the member-facing
loop is a budgeted resource, and no incremental change may silently degrade the
loop's performance budget *or* land new friction without a declared named payer.
Story 1.16a is the control that discharges this property. Per
[[feedback_architecture_vs_adr_boundary]], the architecture commits the
*property* (friction-as-budget; page-weight budget §4.11.1; cross-tenant
connection containment §1.2); this ADR records the *controls* chosen.

The forcing conditions / reconciliations:

- **UX-DR3 has TWO faces of one commitment.** The epics §1.16a AC body is
  metric-centric (`friction-budget.yaml` thresholds: bundle bytes, page-weight,
  critical-render-path). The canonical cross-cutting commitment is
  declaration-centric (`friction-budget.md` named-payer ledger: `payer` +
  `protects` + `event_type`, per UX Stance #2 / AR-60 / Principle #8). They are
  the same commitment seen from two angles — both must land.
- **The surfaces the gate ultimately governs do not substantively exist yet.**
  No member-facing JS build output exists in `pnpm turbo run build`: `apps/public`
  is a `tsc` stub (the Astro SSR shell is Story 2.5, AR-48) and `apps/mobile`'s
  `build` is an intentional EAS no-op. The gate must ship now (so the discipline
  is enforced from here on) but grow teeth surface-by-surface.
- **The canonical device for critical-render-path timing is a 3GB Android**
  (architecture line 34). Live/emulated CRP timing needs a device farm or a
  CPU-throttled-Lighthouse harness; none exists in CI.
- **Friction-budget is repo-global**, not a per-package concern: it reads
  root-level config, scans cross-app build outputs, and inspects the PR-level git
  diff. None of that maps to a single workspace turbo task.
- **An adjacent governance-lint cluster** (`deferred-work.md`: D1-1.6, D5/D6/D7/
  D12-1.4, D4-1.4) is loosely tagged "Story 1.16a." It is *adjacent* governance
  to drain rationally, not the binding AC.

## Decision

### 1. Two facets, one CI job

A single gate (`scripts/friction-budget/check.ts`, run by the `friction-budget`
job in `.github/workflows/ci.yml` and the `pnpm friction:check` root script)
enforces both faces of UX-DR3:

- **Metric facet** — `friction-budget.yaml` at the repo root declares, per
  member-facing surface, byte ceilings (JS bundle bytes + page-weight per route)
  plus a committed baseline-of-record. A placeholder `critical_render_path_ms`
  entry sits under `deferred_metrics` (see §5).
- **Declaration facet** — `friction-budget.md` at the repo root is the
  named-payer ledger, seeded with the four friction surfaces already named in the
  UX spec (Sushil→Reconciliation, relative→facilitator-posture, Anita→Pool-Engine,
  Sunita→facilitator-not-intermediary; all `event_type: forced`). The gate
  validates structural integrity (every row carries `payer` + `protects` +
  `event_type ∈ {forced, optional}`) and enforces attribution-on-change.

The pure logic (parse / compare / classify / verdict) lives in importable,
unit-tested functions (`scripts/friction-budget/lib.ts`,
`lib.test.ts`), mirroring the testable-pure-core style of
`packages/contracts/scripts/check-openapi-determinism.ts`.

### 2. No-op-until-surface bootstrapping (the 1.16b/c/d pattern)

The metric facet is a **graceful no-op (passes) when a surface's measurable build
output is absent**, and switches to enforcing as outputs land — the same
explicit, AC-blessed "no-op until populated" behavior as sibling Stories 1.16b/c.
The declaration facet is **path-triggered** (member-facing form/interaction set:
`apps/mobile/**`, `apps/public/**`; admin/api/jobs/infra/docs excluded) and is
therefore naturally dormant until a member-facing app path changes. The
classifier is a single named constant (`MEMBER_FACING_PREFIXES`) so later stories
extend it in one place. The gate is **green by construction** on the PR that
introduces it: the seed ledger is structurally valid, no manifest exists, and the
PR touches no member-facing app path.

### 3. Baseline-of-record = committed file, not auto-push

Per architecture §4.11.1, the model is **report + threshold-fail** with a
committed baseline the author updates in-PR — *not* a bot that pushes commits (CI
cannot cleanly push to a PR branch, and auto-push would fight the
"threshold change = rationale PR" discipline). The gate compares
measured-vs-committed-baseline; a regression past the ceiling fails; on an
improvement the author commits the lowered baseline in the same PR and the gate
asserts `committed === measured`. Ceiling (budget) changes are the
**separate-rationale-PR** case: the gate fails a same-PR ceiling loosening bundled
with a measurement change ("split into a rationale PR").

### 4. Repo-root tsx script + dedicated CI job, NOT a per-package turbo task

The existing gates (`db:check`, `contracts:check-openapi-determinism`,
`crypto:check`) are per-package turbo tasks because each governs one package.
Friction-budget is repo-global, so the entrypoint lives at
`scripts/friction-budget/check.ts` (the first product-level `scripts/` dir,
alongside the pre-existing `_bmad/scripts/`), with `tsx` + `yaml` added to root
`devDependencies` and `friction:check` / `friction:test` root scripts. The
`friction-budget` CI job mirrors the `db-check` job shape (`needs: install`, pnpm
10.30.3 + node 22.12.0 + `--frozen-lockfile`) but uses **`actions/checkout@v4`
with `fetch-depth: 0`** — the declaration facet diffs against the PR base ref
(`GITHUB_BASE_REF` in CI; `git merge-base HEAD origin/main` locally), which the
default shallow clone lacks. Because `scripts/friction-budget/` is not a pnpm
workspace, its tests are not discovered by `pnpm turbo run test`; the CI job runs
`pnpm friction:test` explicitly before `pnpm friction:check`.

### 5. Live critical-render-path timing on the canonical device — explicitly deferred

The statically measurable proxies (bundle byte-size + page-weight per route) ship
now against `friction-budget.yaml` ceilings. **Live/emulated critical-render-path
timing on the canonical 3GB-Android device is explicitly deferred** (no
device-farm / throttled-Lighthouse harness exists in CI; building one now would
invent infrastructure the epic plan does not schedule here). Recorded in
`deferred-work.md` as *"Resolved via explicit deferral"* with a trigger (a
throttled-Lighthouse-CI harness landing alongside the Story 2.5 Astro shell or
the Story 1.17 design-system surface), per [[feedback_closure_language_precision]]
— never silently dropped.

### 6. Adjacent governance-lint cluster — assessed, drained, re-deferred

The binding AC is the friction-budget gate; the cluster was assessed item-by-item:

- **D1-1.6 (pg.Pool / service-role connection import rule) — co-landed (Closed by
  [edit]), with a recorded scope deviation.** Landed
  `@typescript-eslint/no-restricted-imports` on the `pg` module
  (`allowTypeImports: true`) in `packages/eslint-config-twt/index.js` + a
  carve-out override + positive/negative tests. The architectural property (§1.2)
  names `cross-tenant/` as the sole carve-out, but
  `cross-tenant/run-as-cross-tenant.ts` only **receives** pools by parameter
  (`import type pg`) — it constructs none; the real `new pg.Pool()` sites are
  `packages/domain/src/db.ts` (THE app pool) + test-utils + tests. A blanket
  `pg`-ban with a `cross-tenant/`-only carve-out would red-fail `lint` across 28
  legitimate `pg` imports (10 real Pool sites). So the carve-out is **role-based**
  (`**/db.ts` modules + `**/test-utils/**` + test files) — cwd-relative, because
  the shared flat config is run per-package (`eslint .` from each workspace dir),
  which makes a package-path glob like `packages/domain/**` unable to match. The
  rule bans **value** imports of `pg` outside those roles (apps + other packages
  receive connections via DI), allowing `import type`. Green today; guards future
  rogue value-imports. The narrower service-role-specific rule re-triggers with
  **D9-1.6**.
- **D5/D6/D7/D12-1.4 — Resolved via explicit deferral.** Each needs a bespoke
  cross-file/route-shape AST rule (type-shadowing, `.strict()`-default,
  validator-presence-per-route, `*Id`-must-be-branded), not an off-the-shelf
  `no-restricted-*` config — outside the "cheap + self-contained" bar AC-7 sets.
  Re-trigger: a custom `eslint-plugin-twt` AST-rule effort.
- **D4-1.4 (per-tag bundle-subsetting) — Resolved via explicit deferral,
  friction-budget-adjacent.** No member/admin JS bundle exists yet (same no-op
  rationale as the metric facet); re-trigger when bundles land.
- **Documentary-only governance gates** (escrow attestation, cross-reference
  link-checker, atomic three-way-commit, single-trustee-30-day-expiry, D8-1.6 CI
  cache, D9-1.6 service-pool credential separation) — **out of scope, re-deferred**.

## Alternatives considered

- **Implement D1-1.6 literally (blanket `^pg$` ban, `cross-tenant/`-only
  carve-out)** — Rejected: incompatible with the codebase (would red-fail `lint`
  across 28 legitimate `pg` imports; the carve-out target constructs no pool). The
  data-layer carve-out + value-import ban is the faithful, lint-green realization.
- **Bundle the metric gate behind a member build now** — Rejected: the epic plan
  doesn't create a member bundle until Epic 2/Story 2.5. Blocking 1.16a on
  inventing that build would invert the dependency order. The no-op-until-surface
  pattern is the AC-blessed alternative.
- **Auto-push baseline updates from CI** — Rejected: CI cannot cleanly push to a
  PR branch, and auto-push fights the "threshold change = rationale PR"
  discipline. Committed-file baseline (author updates in-PR) is the §4.11.1 model.
- **Per-package turbo task** — Rejected: friction-budget is repo-global (root
  config + cross-app scan + PR diff); it does not map to one workspace.
- **A real device-farm / throttled-Lighthouse CRP-timing harness now** — Deferred
  (not rejected): it is genuine infrastructure scheduled later; the static proxies
  cover the budget meanwhile. Trigger recorded in `deferred-work.md`.

## Consequences

- **Operational** — Every PR runs the `friction-budget` job. Today it is green by
  construction (no-op); as member surfaces land, authors add `manifest` outputs +
  commit baselines, and the gate begins enforcing. A member-facing app-path change
  now requires a `friction-budget.md` declaration. Ceiling loosenings must be
  their own rationale PR. Quarterly friction-budget review (architecture
  L4013-4029) walks the registry.
- **Security** — No new secrets/credentials; the gate is read-only (fs + git
  read-only). The co-landed D1-1.6 rule tightens DB-driver containment (apps must
  receive pools via DI).
- **Performance** — One extra CI job (`needs: install`), running in parallel with
  the other gates; `fetch-depth: 0` on this job's checkout only.
- **Cost** — Negligible (one short Node/tsx run per PR).
- **Failure modes accepted** — The metric facet cannot catch a regression on a
  surface whose build output does not exist yet (no-op); live-device CRP timing is
  not measured until the deferred harness lands; the declaration classifier is
  conservatively scoped to clearly member-facing app paths (a false-negative on an
  unlisted path is possible, but the set is extended in one named constant as
  surfaces grow). The D1-1.6 rule is broader than the architectural property's
  literal `cross-tenant/`-only framing (it carves out `db.ts` modules + test code
  by role, cwd-relative).
- **Migration / pivot path** — If the no-op metric facet proves too lax once
  bundles land, tighten ceilings (rationale PR) or add the CRP-timing harness
  (the deferred trigger). If the D1-1.6 carve-out proves too broad, narrow it to
  the service-role pool construction site when D9-1.6 lands. If the repo-root
  script outgrows `tsx`, promote it to a `@twt/*` workspace package.

## References

- [Source: architecture.md §Principles, lines 294-295] — Principle #8 friction-as-budget (per-PR CI gate validates declared payer + protects per UX Stance #2)
- [Source: architecture.md §4.11.1, lines 2785-2799] — page-weight budget enforcement (bundle analyzer per route; KB-delta reported; reviewer ack; regress→fail) + per-route subsetting (D4-1.4) + install-footprint budget
- [Source: architecture.md §1.2, lines 736-740 + 764-770] — cross-tenant connection containment (D1-1.6 authority)
- [Source: architecture.md, line 34] — 3GB Android canonical device + perf budgets (CRP-timing deferral, AC-6)
- [Source: epics.md, Story 1.16a (L1291-1307)] — story statement + the two BDD blocks; sibling 1.16b/c/d no-op-until-populated pattern (L1309-1362)
- [Source: epics.md, L348 (AR-60) + L373 (UX-DR3)] — `friction-budget.md` line declaration + CI enforcement
- [Source: ux-design-specification.md, L81-83 / 269 / 291] — UX Stance #2 named payers + the four deliberate non-effortless surfaces + zero-friction default
- [Source: .github/workflows/ci.yml] — `db-check` job shape mirrored; this job adds `fetch-depth: 0`
- [Source: packages/contracts/scripts/check-openapi-determinism.ts] — tsx CI-gate-script style (testable pure core)
- [Source: packages/eslint-config-twt/index.js + index.test.js] — the D1-1.6 rule home + coverage
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — "Story 1.16a deferred + discharged" (AC-6 + AC-7 dispositions)
- [Source: _bmad-output/implementation-artifacts/1-16a-friction-budget-pr-ci-gate.md] — owning Story
- Memory: [[feedback_architecture_vs_adr_boundary]] — property vs control discipline
- Memory: [[feedback_closure_language_precision]] — Closed-by-edit vs Resolved-via-explicit-deferral

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-21 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-06-21 Trustee Panel session (engineering substrate — light-touch; continuation of the ADR-0010 session); `.decision-log.md` Decision 2026-06-21-059; consent sheet `adr-ratification-consent-sheet-2026-06-21.md`. Cascade applied 2026-06-22. |
| 2026-06-16 | (initial draft) | Solo Builder (BigDev) | Authored under Story 1.16a (friction-budget PR CI gate) closure |
