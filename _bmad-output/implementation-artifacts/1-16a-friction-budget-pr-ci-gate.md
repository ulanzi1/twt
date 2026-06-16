# Story 1.16a: Friction-Budget PR CI Gate (UX-DR3) `[GOVERNANCE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder,
I want every PR run through a friction-budget CI gate per UX-DR3,
so that no incremental change silently degrades the member-facing loop performance budget **and** no new friction surface lands without a declared named payer.

## Acceptance Criteria

> **Read first — UX-DR3 has TWO facets, both land here.** The epics §1.16a AC text is metric-centric (`friction-budget.yaml` thresholds), but the canonical commitment this story discharges — UX Stance #2 / AR-60 / Architecture Principle #8 — is **declaration-centric** (`friction-budget.md` named-payer ledger). They are the *same* UX-DR3 commitment seen from two angles. Both the metric-threshold gate and the declaration-attribution gate ship in this story. See Dev Notes → *CRITICAL — UX-DR3 is two facets*.

### AC-1 — `friction-budget.yaml` threshold registry at repo root (metric facet config)
**Given** UX-DR3 + the page-weight budget mechanism (architecture §4.11.1)
**When** the gate is installed
**Then** a `friction-budget.yaml` file exists at the repo root declaring, per member-facing surface, the budgeted metrics and ceilings: at minimum **member-app JS bundle byte-size** and **page-weight (total transferred bytes) per route**, plus a place-holder entry for **critical-render-path timing on the canonical device** (see AC-6 deferral).
**And** thresholds are versioned in that file; a threshold *change* (loosening a ceiling) requires a **separate PR with written rationale** — the gate (AC-3) detects a same-PR threshold edit + measurement change and fails with a "split into a rationale PR" message.

### AC-2 — Metric-measurement gate (graceful no-op until member build-output exists)
**Given** the threshold registry (AC-1)
**When** the gate runs in CI on a PR
**Then** for each surface in `friction-budget.yaml` it measures the actual build output (bundle bytes from the produced manifest; page-weight per route) and compares against the ceiling.
**And** because no member-facing build output exists in the `pnpm turbo run build` pipeline yet (`apps/public` is a `tsc` stub until Story 2.5; `apps/mobile` `build` is an intentional EAS no-op), the gate is a **graceful no-op (passes) when a surface's measurable build output is absent** — exactly the Story 1.16b "no-op until the matrix populates" + 1.16c precision-scoping pattern. It becomes meaningful surface-by-surface as member build outputs land (Epic 2 public Astro, later member web/native bundles).

### AC-3 — Threshold enforcement: regress→fail with diff; improve→pass + update baseline-of-record
**Given** a measurable surface present in the build
**When** a PR pushes a metric past its ceiling
**Then** CI **fails** with a clear diff showing the regression (surface, metric, baseline-of-record → new value, ceiling, delta).
**And** a PR that *improves* a metric passes and updates the **baseline-of-record** (the committed current value the gate compares against; see Dev Notes → *baseline-of-record mechanism* — the author commits the improved baseline in-PR; the gate asserts the committed baseline matches the measured value, it does NOT auto-push commits).

### AC-4 — `friction-budget.md` named-payer declaration ledger + declaration gate (UX Stance #2 / AR-60)
**Given** UX Stance #2 ("friction is a budgeted resource paid by a named persona to protect a named subsystem") + AR-60
**When** the declaration gate is installed
**Then** a `friction-budget.md` ledger exists at the repo root, **seeded** with the four friction surfaces already named in the UX spec (Sushil→Reconciliation, relative→facilitator-posture, Anita→Pool-Engine, Sunita→facilitator-not-intermediary — see Dev Notes seed), each row declaring `payer: <persona>, protects: <subsystem>, event_type: <forced|optional>`.
**And** the gate validates the ledger's structural integrity: every row carries all three keys; `event_type ∈ {forced, optional}`.
**And** the gate enforces attribution-on-change: when a PR's diff touches a **member-facing form/interaction path** (see Dev Notes path-set) it must also touch `friction-budget.md` (add/affirm a declaration); a member-facing-surface diff with **no** `friction-budget.md` change **fails** with the "declare payer + protects + event_type" message.

### AC-5 — CI wiring + local runnability + PR-template reconciliation
**Given** the gate logic (AC-2, AC-3, AC-4)
**When** wired into CI
**Then** a dedicated **`friction-budget` job is added to `.github/workflows/ci.yml`** (mirroring the `db-check` / `contracts-check` / `crypto-check` job shape: `needs: install`, pnpm 10.30.3 + node 22.12.0 + `--frozen-lockfile`), and a root `package.json` script (e.g. `"friction:check"`) runs the same entrypoint locally.
**And** the PR-template friction-budget checkbox (`.github/pull_request_template.md`, currently "substantive CI gate lands in Story 1.16a") is reconciled to reference the now-live gate.

### AC-6 — No-op / bootstrapping semantics documented + live-device CRP timing explicitly deferred
**Given** "critical-render-path timing on canonical device" in the epics AC and "canonical device = 3GB Android" (architecture line 34)
**When** this story closes
**Then** the gate's bootstrapping behavior (which facets are live now vs no-op-until-surface-lands) is documented in `friction-budget.md` / a README adjacent to the gate script.
**And** **live critical-render-path timing on a real/emulated canonical device is explicitly deferred** (no device-farm / throttled-Lighthouse harness exists in CI; the static proxies — bundle bytes + page-weight — ship now). The deferral is recorded in `deferred-work.md` as *"Resolved via explicit deferral"* with a trigger ([[feedback_closure_language_precision]]) — NOT silently dropped.

### AC-7 — Adjacent deferred governance lint cluster: assess, co-land the cheap/unblocked, explicitly re-defer the rest
**Given** `deferred-work.md` routes a cluster of CI/ESLint governance rules to "Story 1.16a" (D1-1.6 pg.Pool import-rule — *"Trigger: Story 1.16a dev-story start"*; D5-1.4 type-shadowing; D6-1.4 `.strict()`-default; D7-1.4 validator-presence; D12-1.4 `*Id`-must-be-branded ESLint enforcer (branded ID types closed at Story 1.7; only the lint rule is outstanding); D4-1.4 per-tag bundle-subsetting) + the `eslint-config-twt/index.js` TODO activation roster
**When** this story is implemented
**Then** the dev agent **assesses each** item and **co-lands the ones that are now unblocked and self-contained** (recommended floor: D1-1.6 — its trigger is literally this dev-start; the architecture commits it at §1.2 and the `packages/domain/src/cross-tenant/` module already exists).
**And** every cluster item **not** landed is **explicitly re-deferred with rationale** in `deferred-work.md` (carried forward, never silently dropped — [[feedback_closure_language_precision]]). Documentary-only governance gates loosely tagged "1.16a friction territory" (escrow attestation, cross-reference link-checker, atomic three-way-commit, single-trustee-expiry) are **out of scope** and re-deferred.

### AC-8 — Green gates + ADR + deferred-work reconciliation
**Given** the gate + any co-landed lint rules
**When** the work completes
**Then** `pnpm turbo run lint typecheck test build` is green; the new `friction-budget` CI job passes on this PR (the gate must not red-fail the very PR that introduces it — the seed ledger + no-op semantics make it green by construction); an ADR records the friction-budget gate design (two facets, no-op-until-surface, baseline-of-record model, repo-root-script mechanism); `deferred-work.md` is reconciled (AC-6 deferral + AC-7 disposition of each cluster item).

## Tasks / Subtasks

- [x] **Task 1 — `friction-budget.yaml` threshold registry + `friction-budget.md` named-payer ledger (AC-1, AC-4)**
  - [x] Author `friction-budget.yaml` at repo root: per-surface metric ceilings (member-app JS bundle bytes, page-weight per route) + a placeholder `critical_render_path_ms` entry marked deferred (AC-6). Include a top-of-file comment: changing a ceiling = separate rationale PR.
  - [x] Author `friction-budget.md` at repo root: header explaining UX Stance #2 named-payer model + the four-column table seeded with the UX-spec surfaces (Dev Notes seed). Document the bootstrapping/no-op semantics (AC-6) here.
- [x] **Task 2 — Gate entrypoint script (AC-2, AC-3, AC-4)**
  - [x] Author the gate at `scripts/friction-budget/check.ts` (repo-root, tsx) — repo-global, not a per-package turbo task (see Dev Notes → *mechanism*). Add `tsx` to root `devDependencies` and add root scripts: run **`pnpm add --save-dev -w tsx@^4.19.0`** at repo root (not a manual `package.json` edit — this also updates `pnpm-lock.yaml`, which `--frozen-lockfile` in CI requires). Add `"friction:check": "tsx scripts/friction-budget/check.ts"` and `"friction:test": "vitest run scripts/friction-budget"` to root `package.json` scripts. Commit both `package.json` and `pnpm-lock.yaml`. *(Also added `yaml@^2.6.1` to root devDeps — the mandated "load friction-budget.yaml" needs a parser; version aligned with `packages/contracts`.)*
  - [x] **Metric facet:** load `friction-budget.yaml`; for each surface, locate its build manifest; if absent → no-op-pass for that surface (AC-2); if present → measure + compare to ceiling, emit a structured delta, fail on regression (AC-3).
  - [x] **Baseline-of-record:** read the committed baseline (in `friction-budget.yaml` or a sibling `friction-budget.baseline.json`); fail if measured < committed-baseline but committed-baseline not updated in-PR (drift), and on improvement assert the in-PR-committed baseline equals the measured value. Do NOT auto-commit. *(Baseline lives inline in `friction-budget.yaml` per metric.)*
  - [x] **Same-PR threshold-loosening guard (AC-1):** detect a ceiling edit co-occurring with a measurement change; fail with "split into a rationale PR".
  - [x] **Declaration facet (AC-4):** parse `friction-budget.md` rows (assert payer/protects/event_type present; event_type ∈ {forced, optional}); compute the PR diff: in CI use `git diff --name-only origin/${process.env.GITHUB_BASE_REF}...HEAD`; locally fall back to `git diff --name-only $(git merge-base HEAD origin/main)...HEAD` (the `fetch-depth: 0` checkout in CI makes the merge-base available — `GITHUB_BASE_REF` is set automatically on `pull_request` events). If any changed path is in the member-facing form/interaction set AND `friction-budget.md` is unchanged → fail.
  - [x] Unit-test the script's pure pieces (yaml/md parse + threshold compare + path-classifier + diff→verdict) with fixtures. No network; no live device. *(26 tests in `lib.test.ts`.)*
- [x] **Task 3 — CI wiring + local + PR template (AC-5)**
  - [x] Add a `friction-budget` job to `.github/workflows/ci.yml` (mirror `db-check` job shape). **Use `actions/checkout@v4` with `fetch-depth: 0`** (the declaration facet diffs against the base ref — the default shallow checkout has no merge-base). Run `pnpm friction:check`. *(Job runs `pnpm friction:test` then `pnpm friction:check`.)*
  - [x] Reconcile the PR-template friction-budget checkbox (`.github/pull_request_template.md`) to reference the now-live gate (drop "substantive CI gate lands in Story 1.16a").
- [x] **Task 4 — Adjacent deferred governance lint cluster: assess + co-land + re-defer (AC-7)**
  - [x] **D1-1.6 (recommended floor):** ~~add a `no-restricted-imports` rule (regex: `^pg$`)~~ **Landed as the faithful, lint-green realization** — see Completion Notes → *D1-1.6 deviation*. The literal `^pg$`-ban + `cross-tenant/`-only carve-out is incompatible with the codebase (28 legit `pg` imports / 10 real `new pg.Pool()` sites; `cross-tenant/` constructs no pool — it receives them by param, `db.ts` is the real site). Implemented `@typescript-eslint/no-restricted-imports` on `pg` with `allowTypeImports` + a **role-based, cwd-relative** carve-out (`**/db.ts` + `**/test-utils/**` + tests — a package-path glob can't match per-package `eslint .`). Config README inventory updated; positive/negative coverage in `index.test.js`. **(BigDev decision: land the faithful narrow rule.)**
  - [x] Assess D5-1.4, D6-1.4, D7-1.4, D12-1.4. **Re-deferred** — each needs a bespoke AST rule (no off-the-shelf `no-restricted-*` config), outside the "cheap + self-contained" bar. D4-1.4 re-deferred (no member/admin bundle exists yet, friction-budget-adjacent). See `deferred-work.md` → "Story 1.16a deferred + discharged".
  - [x] For EVERY cluster item not landed: write an explicit *"Resolved via explicit deferral"* row in `deferred-work.md` with trigger ([[feedback_closure_language_precision]]). Re-defer the documentary-only governance gates (out of scope). *(All recorded: D5/D6/D7/D12-1.4 + D4-1.4 deferred; escrow-attestation / link-checker / atomic-commit / single-trustee-expiry / D8-1.6 / D9-1.6 out-of-scope re-deferred; inline annotations added too.)*
- [x] **Task 5 — ADR + deferred-work reconciliation + green gates (AC-6, AC-8)**
  - [x] Author **`docs/adr/ADR-0012-friction-budget-pr-ci-gate.md`** (ADR-0011 is latest from Story 1.15; follow the `ADR-XXXX-kebab-case-title.md` naming convention) recording: two-facet design, no-op-until-surface, baseline-of-record model, repo-root-script-vs-turbo-task mechanism, canonical-device CRP-timing deferral. Update the adr-index. *(adr-index: drafted 8→9, total 129→130, Section A 30→31.)*
  - [x] Reconcile `deferred-work.md`: record the AC-6 live-device-CRP deferral; record the AC-7 disposition of each cluster item; cross-reference D4-1.4 (per-tag bundle-subsetting) and D8-1.6 (CI duration long-pole) as friction-budget-adjacent.
  - [x] Run `pnpm turbo run lint typecheck test build` (green) + confirm the new `friction-budget` job passes on this PR by construction (seed ledger + no-op semantics). NO new DB migration expected (this story touches no schema). *(turbo lint typecheck test build = 65/65 green; friction:test 26/26; friction:check passes; no migration.)*

## Dev Notes

### Ground-truth: the gate is NEW, but its shape, mechanism, and config home all have precedents — extend, do not reinvent

| Need | Already exists / precedent | Action |
|---|---|---|
| CI-gate job shape (install→needs→pnpm/node/frozen-lockfile) | `.github/workflows/ci.yml` `db-check` / `contracts-check` / `crypto-check` jobs | **Mirror** for the new `friction-budget` job. |
| Repo-level (non-package) CI logic invoking a script | `nightly-integrity.yml` (runs `pnpm --filter @twt/jobs audit:verify-integrity`); `deploy-*.yml` | **Follow** — but friction-budget is repo-*global*, so a repo-root `scripts/friction-budget/check.ts` + root `friction:check` script, NOT a per-package turbo task. |
| tsx script-as-CI-check precedent | `packages/contracts/scripts/check-openapi-determinism.ts` (turbo `contracts:check-openapi-determinism`) | **Mirror the style** (tsx, structured fail output); place at repo root, add `tsx` to root devDeps. |
| ESLint rule home + activation roster | `packages/eslint-config-twt/index.js` (flat config; explicit per-Story `TODO` roster incl. type-shadowing) + its `README.md` inventory | **Add cluster rules here**; retire matching TODOs; update README. |
| Cross-tenant service-pool module (for D1-1.6 carve-out) | `packages/domain/src/cross-tenant/run-as-cross-tenant.ts` | **Carve-out path** for the pg.Pool import rule. |
| PR-template friction checkbox | `.github/pull_request_template.md` ("substantive CI gate lands in Story 1.16a") | **Reconcile** to "live gate"; do NOT add a 7th prompt (architecture §PR-template review budget caps it). |
| Named-payer friction surfaces | UX spec lines 81–83, 269, 291 (Sushil/relative/Anita/Sunita) | **Seed** `friction-budget.md` from these — do NOT invent personas. |
| ADR numbering | `docs/adr/` — ADR-0011 is latest (Story 1.15) | **`docs/adr/ADR-0012-friction-budget-pr-ci-gate.md`** next; update adr-index. |

### CRITICAL — UX-DR3 is TWO facets; both land here (this is the #1 reconciliation)
The epics §1.16a AC body talks about **metrics** (`friction-budget.yaml`: page-weight, JS bundle, critical-render-path). The canonical cross-cutting commitment it discharges talks about a **declaration ledger**:
- Architecture Principle #8 (line 294): *"Friction-as-budget — per-PR CI gate validates declared `payer` + `protects` per UX Stance #2."*
- AR-60 (epics line 348) + UX-DR3 (epics line 373): *"Every PR touching member-facing form/interaction adds `friction-budget.md` line declaring `payer: <persona>, protects: <subsystem>, event_type: <forced|optional>`. CI enforces."*
- UX spec Stance #2 (lines 81–83): *"every PR touching a member-facing form or interaction adds a `friction-budget.md` line… Without the gate, the stance becomes philosophy theater and Reena pays the silent tax."*

**Implement both.** `friction-budget.yaml` = the metric ceilings (AC-1/2/3). `friction-budget.md` = the named-payer ledger + attribution-on-change gate (AC-4). One CI job runs both.

### CRITICAL — member surfaces don't substantively exist yet → the metric facet is a graceful NO-OP (the 1.16b/c/d pattern)
- `apps/public` is a `tsc` stub (`src/index.ts`); the **Astro SSR shell lands in Story 2.5** (AR-48). No web build output today.
- `apps/mobile` `build` is an intentional **EAS no-op echo**; `build:web` (`expo export --platform web`) is NOT in the `turbo build` graph and emits no committed manifest.
- ⇒ There is **no member-facing JS bundle in CI today.** The metric gate must **pass (no-op) when a surface's measurable build output is absent**, and switch to enforcing as outputs land — mirroring the *explicit, AC-blessed* "no-op until populated" behavior of sibling stories 1.16b (empty matrix → passes) and 1.16c (precision-scoped). Do NOT block this story on building a member bundle that the epic plan hasn't created yet. The gate's *existence* + *seed ledger* + *declaration enforcement* are the v1 deliverable; metric teeth grow per-surface.

### CRITICAL — "canonical device" = 3GB Android; live critical-render-path timing is NOT CI-measurable now → ship the static proxies, defer the live timing
- Architecture line 34: *"Cold start <3s on 3GB Android [native-stack performance budget]"* — that 3GB Android is the canonical device.
- Live/emulated CRP timing needs a device farm or CPU-throttled Lighthouse harness; none exists in CI. Implementing real device timing now would be inventing infrastructure the epic plan doesn't schedule here.
- **Ship the statically measurable proxies** (bundle byte-size, page-weight per route from the build manifest) against `friction-budget.yaml` ceilings; **explicitly defer** live-device CRP timing (AC-6) with a recorded trigger (e.g., "when a throttled-Lighthouse-CI harness lands alongside the Story 2.5 Astro shell or Story 1.17 design-system surface"). Honest scoping — record it as *Resolved via explicit deferral*, never as silently complete ([[feedback_closure_language_precision]]).

### Mechanism — repo-root script + dedicated `ci.yml` job, NOT a per-package turbo task
The existing gates (`db:check`, `contracts:check-openapi-determinism`, `crypto:check`) are per-package turbo tasks because each governs one package. Friction-budget is **repo-global**: it reads a root-level `friction-budget.yaml`, scans *cross-app* build outputs, and inspects the *PR-level git diff*. None of that maps to a single workspace. So:
- Place the entrypoint at `scripts/friction-budget/check.ts` (new repo-root `scripts/` dir — only `_bmad/scripts/` exists today; this is the first product-level one).
- Run `pnpm add --save-dev -w tsx@^4.19.0` at repo root to update both `package.json` devDependencies and `pnpm-lock.yaml` (manual edits to package.json alone leave the lockfile stale, breaking `--frozen-lockfile` in CI). Add `"friction:check": "tsx scripts/friction-budget/check.ts"` and `"friction:test": "vitest run scripts/friction-budget"` to root `package.json` scripts.
- Add a `friction-budget` job to `ci.yml` running two steps: `pnpm friction:test` (unit tests) then `pnpm friction:check` (gate), with **`fetch-depth: 0`** on checkout (the declaration facet needs the merge-base via `GITHUB_BASE_REF`; every other ci.yml job uses the default shallow clone — this one can't).
- Keep the *pure* logic (parse, compare, classify) in importable functions so it's unit-testable with fixtures (mirror `check-openapi-determinism.ts` testability).

### baseline-of-record mechanism (AC-3) — committed file, not auto-push
Architecture §4.11.1: *"KB-per-screen delta against the previous main branch is reported in the PR; reviewer cannot approve without acknowledging the delta."* The model is **report + threshold-fail**, with a committed baseline the author updates in-PR — NOT a bot that pushes commits (CI can't cleanly push to a PR branch, and auto-push fights the "threshold change = rationale PR" discipline). So: the gate compares measured-vs-committed-baseline; on improvement the author commits the new lower baseline in the same PR and the gate asserts committed==measured; on regression past the ceiling it fails. Threshold (ceiling) edits are the separate-rationale-PR case (AC-1).

### `friction-budget.md` seed — use the UX spec's four named surfaces verbatim (do NOT invent personas)
From UX spec lines 81–83 / 269 / 291 — seed the ledger with these (all `event_type: forced` — they are deliberate non-effortless surfaces):
| payer | protects | event_type |
|---|---|---|
| Sushil (member, UTR-mismatch screenshot upload) | Reconciliation integrity | forced |
| relative (manual-KYC fallback) | "facilitator" posture | forced |
| Anita (verifier, over-payment recovery judgment) | Pool Engine | forced |
| Sunita (nominee bank-statement upload) | facilitator-not-intermediary trust posture | forced |
Default state per Stance #2 is **zero friction**; rows are added only with declared attribution. The seed records the friction the design has already deliberately accepted.

### member-facing form/interaction path-set (AC-4 trigger classifier)
The declaration gate fires when a PR diff touches a **member-facing form/interaction**. At this point in Epic 1 that set is essentially empty (member surfaces land later), so the gate is naturally dormant — but define the classifier now so it activates automatically. Recommended initial set: `apps/mobile/**` (the member app) and `apps/public/**` once it renders member-facing forms (Story 2.5+); explicitly **exclude** admin/api/jobs/infra/docs/`_bmad*`. Keep the set in one named constant in the script so later stories extend it in one place. Be conservative: a false-positive (asking for a declaration on a non-friction change) is cheap to satisfy; a false-negative (silent friction) is the failure mode Stance #2 exists to prevent — but at v1 keep it to clearly member-facing app paths to avoid nagging every Epic-1 substrate PR.

### Adjacent deferred governance lint cluster (AC-7) — scope boundary + disposition
`deferred-work.md` uses "Story 1.16a" as the landing marker for a cluster of architecture-committed lint/CI rules. The **binding AC of THIS story is the friction-budget gate**; the cluster is *adjacent governance* you should rationally drain, not silently inherit whole. Disposition guidance:
- **D1-1.6** — forbid `pg.Pool`/service-role connection construction outside `packages/domain/src/cross-tenant/` (architecture §1.2 lines 739–740, 768–769). Trigger is literally *"Story 1.16a dev-story start."* **Recommended co-land** (rule + carve-out + test; the module exists). Use `no-restricted-imports` with `regex: '^pg$'` (consistent with the existing cross-workspace import rule shape in `eslint-config-twt/index.js`); add a file-scoped override block disabling the rule for `packages/domain/src/cross-tenant/**`.
- **D5-1.4** type-shadowing of `packages/contracts/` exports (architecture §Naming 3722–3723) — has a live `TODO Story 1.4 + downstream` in `eslint-config-twt/index.js`. Co-land if a clean rule expression exists; else re-defer.
- **D6-1.4** `.strict()`-default on Zod objects (architecture §Format line 3826) · **D7-1.4** validator-presence-per-route in `apps/api/modules/` (architecture §1.3 791–793, now unblocked — routes substantive since 1.9) · **D12-1.4** `*Id`-must-be-branded ESLint enforcer (architecture §Naming 3706–3708; branded ID types closed at Story 1.7 — only the lint rule is outstanding) · **D4-1.4** per-tag bundle-subsetting CI test (architecture §4.11.1 2793–2794) — assess each; co-land the cheap/self-contained, re-defer the rest **with rationale**.
- **Out of scope** (documentary-only, not lint, loosely tagged "1.16a friction territory"): escrow-attestation CI, cross-reference link-checker, atomic three-way-commit enforcement, single-trustee-30-day-expiry tracker, D8-1.6 CI-cache long-pole, D9-1.6 service-pool prod credential separation. Re-defer all.
- **Discipline:** every item touched gets a precise closure verb — "Closed by [edit]" (rule landed + tested) vs "Resolved via explicit deferral" (rationale + trigger recorded). Never "Not addressed" by omission ([[feedback_closure_language_precision]]).

### Testing standards
- **Unit (gate script):** fixture-driven tests for the pure functions — `friction-budget.yaml` parse + threshold compare (regress/improve/no-op-absent), `friction-budget.md` parse + structural validation (missing key, bad event_type), the member-facing path classifier, and the diff→verdict (changed member path + unchanged ledger → fail; + changed ledger → pass; non-member path → pass). No network, no live device, no DB. This is a DB-free story. **Turbo graph note:** `scripts/friction-budget/` is NOT a pnpm workspace package (`pnpm-workspace.yaml` covers only `apps/*` and `packages/*`), so its tests are NOT discovered by `pnpm turbo run test`. Instead: add a root script `"friction:test": "vitest run scripts/friction-budget"` to root `package.json` and run it as a dedicated step in the `friction-budget` CI job (before `pnpm friction:check`). `pnpm turbo run lint typecheck test build` remains fully green — no workspace package is changed; the CI job covers the gate's own unit tests.
- **Lint cluster (if co-landed):** each rule gets a positive (fires) + negative (carve-out/compliant code passes) assertion, mirroring the existing `no-restricted-imports` rule's coverage in `eslint-config-twt`.
- **Self-green invariant:** the `friction-budget` job MUST pass on the PR that introduces it — guaranteed by the seed ledger (structurally valid) + no-op-on-absent-build-output + this PR touching no member-facing app path. Verify locally via `pnpm friction:check` before pushing.
- No `onSend` hooks here (not an API story) — the [[project_fastify_onsend_doublesend]] trap does not apply.

### Project Structure Notes
- Gate: `scripts/friction-budget/check.ts` (+ `scripts/friction-budget/*.ts` pure modules + tests) — first product-level repo-root `scripts/` dir (alongside the pre-existing `_bmad/scripts/`).
- Config: `friction-budget.yaml` (ceilings + baseline-of-record) + `friction-budget.md` (named-payer ledger + bootstrapping doc), both at repo root (epics AC pins `friction-budget.yaml` at root; UX-DR3 pins `friction-budget.md` at root).
- CI: new `friction-budget` job in `.github/workflows/ci.yml` (`fetch-depth: 0`); root `package.json` gains `tsx` devDep + `friction:check` script.
- Lint cluster: rules in `packages/eslint-config-twt/index.js` + README inventory update + TODO-roster retirement.
- ADR: `docs/adr/ADR-0012-*.md`; update the adr-index.
- PR template: `.github/pull_request_template.md` (reconcile the existing checkbox; do not add a prompt).

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.16a] (L1291–1307) — story statement + 2 BDD blocks: metric set (page-weight, JS bundle, critical-render-path), `friction-budget.yaml` at root, threshold-change=separate-PR, regress→fail-with-diff, improve→pass+update-baseline.
- [Source: _bmad-output/planning-artifacts/epics.md] L348 (AR-60 friction-as-budget `payer`+`protects`), L373 (UX-DR3 `friction-budget.md` line `payer/protects/event_type`), L562 (installed Epic 0/1, enforced thereafter), L974/L976 (Epic 1 FRs + AR-60 anchor), L1309–1362 (sibling 1.16b/c/d "no-op until populated" / precision-scoped patterns to mirror).
- [Source: _bmad-output/planning-artifacts/architecture.md#Principles] L294–295 — Principle #8 Friction-as-budget (per-PR CI gate validates declared payer+protects per UX Stance #2).
- [Source: _bmad-output/planning-artifacts/architecture.md#4.11.1] L2785–2799 — page-weight budget enforcement (bundle analyzer per route; KB-delta reported; reviewer ack; regress→fail) + per-route OpenAPI subsetting (D4-1.4) + install-footprint budget.
- [Source: _bmad-output/planning-artifacts/architecture.md] L34–35 (3GB Android canonical device + perf budgets), L3089–3096 (CI-gates inventory incl. friction-budget CI gate), L4013–4029 (quarterly friction-budget review + PR-template initial scope incl. friction-budget declaration).
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] L81–83 (Stance #2 named payers + `friction-budget.md` line + "Reena pays the silent tax"), L269 (four deliberate non-effortless surfaces), L291 (zero-friction default + CI-enforced ledger), L212 (friction-budget PR-gate in the cross-cutting inventory).
- [Source: .github/workflows/ci.yml] — `db-check`/`contracts-check`/`crypto-check` job shape to mirror; default shallow checkout (the new job needs `fetch-depth: 0`).
- [Source: .github/workflows/nightly-integrity.yml] — repo-level script-invoking workflow precedent.
- [Source: packages/contracts/scripts/check-openapi-determinism.ts] — tsx CI-gate-script style (structured fail + testable pure core).
- [Source: packages/eslint-config-twt/index.js] — flat-config rule home + the per-Story TODO activation roster (type-shadowing, etc.); `no-restricted-imports` as the rule-with-message + README-inventory precedent.
- [Source: packages/eslint-config-twt/README.md] — the canonical rule inventory to extend.
- [Source: packages/domain/src/cross-tenant/run-as-cross-tenant.ts] — the carve-out path for the D1-1.6 pg.Pool rule.
- [Source: .github/pull_request_template.md] — the friction-budget checkbox to reconcile; the bounded 6-prompt initial scope (do not exceed).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] L264–267 (D4/D5/D6/D7-1.4), L272 tail (D12-1.4 `*Id`-branded enforcer), L909 (D1-1.6 pg.Pool — "Trigger: Story 1.16a dev-story start"), L923 (D8-1.6 CI long-pole), L925 (D9-1.6 service-pool), L183 (D7-1.4 "1.16a + 1.9+"), and the documentary-governance "1.16a friction territory" items (escrow/link-checker/atomic-commit/single-trustee-expiry) — all to be dispositioned per AC-7.
- [Source: apps/public/package.json + apps/mobile/package.json] — proof there is no member JS build output in `turbo build` yet (public = tsc stub; mobile build = EAS no-op) → the AC-2 no-op rationale.
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.5] — Astro SSR shell foundation (when the public member surface — and the first real page-weight target — lands).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) via bmad-dev-story

### Debug Log References

- `pnpm friction:test` → 26/26 (gate pure core); `pnpm --filter @twt/eslint-config-twt test` → 8/8 (pg-rule + cross-workspace regression guard, incl. per-package-cwd cases).
- `pnpm turbo run lint typecheck test build` → 65/65 green (the +1 vs prior 64 is the new `@twt/eslint-config-twt#test` workspace task).
- `pnpm turbo run db:check contracts:check-openapi-determinism crypto:check` → 19/19 (sibling gates unaffected by the lockfile change).
- `pnpm friction:check` → green by construction. Negative-path proven end-to-end: a temp `apps/mobile/dist/bundle-manifest.json` with `js_bundle_bytes: 9999999` produced `✗ REGRESSION … Δ +7378559` + `gate FAILED` (then removed; working tree clean).
- First full-suite run caught a real bug: the carve-out used a package-path glob (`packages/domain/**`) which never matches under per-package `eslint .` (cwd = workspace). Fixed to role-based cwd-relative globs; added a per-package-cwd regression test.

### Completion Notes List

- **Two facets, one job (AC-1…AC-4).** `scripts/friction-budget/check.ts` (tsx, repo-root) runs the metric facet (`friction-budget.yaml` ceilings + baseline-of-record + threshold-loosening guard) and the declaration facet (`friction-budget.md` ledger structural-validate + attribution-on-change). Pure logic in `lib.ts` (unit-tested); impure fs/git/exit in `check.ts` — mirrors `check-openapi-determinism.ts` testability.
- **No-op-until-surface (AC-2) + self-green by construction.** No member build output exists (`apps/public` tsc stub; `apps/mobile` EAS no-op) → every surface no-ops; the declaration facet is path-triggered (dormant — this PR touches no `apps/mobile/**`/`apps/public/**`); seed ledger (4 UX-spec rows, all `forced`) is structurally valid. The introducing PR is green.
- **Baseline-of-record = committed file, not auto-push (AC-3).** regress→fail-with-Δ; improve-below-baseline-without-lowering-it→fail ("baseline not updated"); ceiling-loosening bundled with a measurement change→fail ("split into a rationale PR", AC-1).
- **CRP timing deferred (AC-6).** Canonical device = 3GB Android; no device-farm/throttled-Lighthouse harness in CI → static proxies (bundle bytes + page-weight) ship; live timing recorded as *Resolved via explicit deferral* (trigger: throttled-Lighthouse harness at Story 2.5/1.17) in `deferred-work.md`; placeholder under `deferred_metrics` in the yaml.
- **Mechanism (AC-5).** Repo-global → repo-root `scripts/friction-budget/` + dedicated `friction-budget` ci.yml job with **`fetch-depth: 0`** (declaration facet diffs the base ref). `scripts/` is not a pnpm workspace → not in `turbo test`; the job runs `pnpm friction:test` then `pnpm friction:check`. Root devDeps gained `tsx` + `yaml`; root scripts `friction:check`/`friction:test`. PR-template friction checkbox reconciled to the live gate (no 7th prompt).
- **D1-1.6 deviation (AC-7) — resolved with BigDev (land the faithful narrow rule).** The story's literal prescription (`no-restricted-imports` regex `^pg$`, carve-out = `cross-tenant/` only) is incompatible with ground truth: `pg` is imported in 28 files (10 with `new pg.Pool()`); the real construction site is `packages/domain/src/db.ts` + test-utils + tests, while `cross-tenant/run-as-cross-tenant.ts` only *receives* pools by param (`import type pg`). Implemented instead: `@typescript-eslint/no-restricted-imports` on `pg` with `allowTypeImports: true` (typing an injected pool is fine; constructing one is banned) + a **role-based, cwd-relative** carve-out (`**/db.ts`, `**/test-utils/**`, `**/*.test.ts`, `**/*.spec.ts`, `**/tests/**`) — because the shared flat config runs per-package, a package-path glob (`packages/domain/**`) can't match. Lint-green today; guards future rogue value-imports; apps must receive connections via DI. The narrower service-role-specific rule re-triggers with D9-1.6. Recorded as **Closed by [edit]** (with the deviation) in `deferred-work.md` + ADR-0012.
- **AC-7 cluster disposition.** Only D1-1.6 was cheap + self-contained → co-landed. D5/D6/D7/D12-1.4 each need a bespoke AST rule (no off-the-shelf config) → *Resolved via explicit deferral* (trigger: a custom `eslint-plugin-twt` effort). D4-1.4 → deferred (no bundle exists yet, friction-budget-adjacent). Documentary-only governance gates (escrow attestation, link-checker, atomic three-way-commit, single-trustee-expiry, D8-1.6, D9-1.6) → out of scope, re-deferred.
- **`@twt/eslint-config-twt` is now a tested workspace** (added `vitest` + `test` script) so the new rule rides `pnpm turbo run test`. No new DB migration. No `onSend` hooks (the [[project_fastify_onsend_doublesend]] trap does not apply).

### File List

**New:**
- `friction-budget.yaml` — metric-threshold registry (ceilings + baseline-of-record + deferred CRP placeholder)
- `friction-budget.md` — named-payer declaration ledger (seeded with 4 UX-spec surfaces) + bootstrapping doc
- `scripts/friction-budget/check.ts` — gate entrypoint (impure: fs + git + exit)
- `scripts/friction-budget/lib.ts` — pure core (parse / compare / classify / verdict)
- `scripts/friction-budget/lib.test.ts` — 26 fixture-driven unit tests
- `scripts/friction-budget/README.md` — mechanism + baseline-of-record + bootstrapping (AC-6)
- `packages/eslint-config-twt/index.test.js` — D1-1.6 pg-rule coverage + cross-workspace regression guard
- `docs/adr/ADR-0012-friction-budget-pr-ci-gate.md` — ADR (two-facet design, no-op-until-surface, baseline model, mechanism, CRP deferral, D1-1.6 deviation)

**Modified:**
- `package.json` (root) — `tsx` + `yaml` devDeps; `friction:check` + `friction:test` scripts
- `pnpm-lock.yaml` — `tsx` + `yaml` (root) + `vitest` (eslint-config-twt)
- `packages/eslint-config-twt/index.js` — D1-1.6 `@typescript-eslint/no-restricted-imports` pg rule + role-based carve-out override
- `packages/eslint-config-twt/package.json` — `vitest` devDep + `test` script
- `packages/eslint-config-twt/README.md` — §1 inventory row for the pg rule
- `.github/workflows/ci.yml` — `friction-budget` job (`fetch-depth: 0`, `friction:test` + `friction:check`)
- `.github/pull_request_template.md` — friction-budget checkbox reconciled to the live gate
- `docs/knowledge-transfer/adr-index.md` — ADR-0012 row + counts (drafted 8→9, total 129→130, Section A 30→31)
- `_bmad-output/implementation-artifacts/deferred-work.md` — "Story 1.16a deferred + discharged" section + inline cluster annotations (D1-1.6 Closed-by-edit; D4/D5/D6/D7/D12-1.4 + documentary gates deferred)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `1-16a` flip ready-for-dev→in-progress→review + ledger entry

### Review Findings

- [x] [Review][Defer] AC-1: `page_weight_bytes` declared as aggregate per-surface, not per route — AC-1 says "per route" but the YAML, TypeScript types, manifest format, and gate logic implement aggregate-per-surface. Intentional v1 deferral (gate is no-op until Story 2.5 Astro surface lands); per-route breakdown deferred to that trigger. [friction-budget.yaml, scripts/friction-budget/lib.ts] — deferred, accepted as v1 design
- [x] [Review][Patch] AC-1 threshold-loosening guard uses `apps/` prefix instead of `isMemberFacingPath()` — false-positives on admin/api/jobs PRs [scripts/friction-budget/check.ts:~159]
- [x] [Review][Patch] Creeping baseline inflation: author can raise `baseline` without ceiling change; passes all checks silently [scripts/friction-budget/lib.ts]
- [x] [Review][Patch] `surfaces: []` in `friction-budget.yaml` silently passes metric facet with zero checks and no diagnostic output [scripts/friction-budget/lib.ts]
- [x] [Review][Patch] Ledger with header + separator but zero data rows passes structural validation (`"✓ 0 declaration row(s)"`) [scripts/friction-budget/lib.ts]
- [x] [Review][Patch] `GITHUB_BASE_REF` resolution failure in CI silently skips declaration facet (emits to `notes[]` not `failures[]`) [scripts/friction-budget/check.ts]
- [x] [Review][Patch] Blank line inside ledger Markdown table stops `parseAndValidateLedger`, silently ignoring all remaining rows [scripts/friction-budget/lib.ts]
- [x] [Review][Patch] `parseFrictionBudgetYaml` does not validate `baseline <= ceiling` — contradictory error messages when baseline exceeds ceiling [scripts/friction-budget/lib.ts]
- [x] [Review][Defer] Push events to `main` bypass both AC-1 and AC-4 enforcement (merge-base = HEAD itself on push) [scripts/friction-budget/check.ts] — deferred, expected behavior; branch protection on `main` is the external guard
- [x] [Review][Defer] `**/db.ts` carve-out in ESLint config exempts ANY `db.ts` in the monorepo, not just `packages/domain/src/db.ts` [packages/eslint-config-twt/index.js] — deferred, known per-package cwd limitation; role-based glob is the best achievable with shared flat config
- [x] [Review][Defer] Subpath imports (`pg/lib/client`) and dynamic `import('pg')` bypass `no-restricted-imports` rule [packages/eslint-config-twt/index.js] — deferred, needs custom `eslint-plugin-twt`; punts with D9-1.6
- [x] [Review][Defer] Dot in surface/metric `id` produces wrong surface attribution in `detectLoosenedCeilings` error messages [scripts/friction-budget/lib.ts] — deferred, no current IDs contain dots; add ID validation when surface definitions expand
- [x] [Review][Defer] `parseAndValidateLedger` pushes structurally-invalid rows into `rows[]` alongside `errors[]` [scripts/friction-budget/lib.ts] — deferred, no current consumer uses malformed row fields; safe to fix in a future hardening pass

### Change Log

| Date | Change |
|---|---|
| 2026-06-16 | Story 1.16a implemented — friction-budget PR CI gate (UX-DR3, both facets). Authored `friction-budget.yaml` + `friction-budget.md` + `scripts/friction-budget/` gate (tsx, repo-global) + unit tests; added `friction-budget` CI job (`fetch-depth: 0`) + root `friction:check`/`friction:test` + `tsx`/`yaml` devDeps; reconciled the PR-template checkbox. Co-landed D1-1.6 pg-import lint rule (faithful narrow realization, role-based carve-out — BigDev decision) with tests; re-deferred D4/D5/D6/D7/D12-1.4 + documentary governance gates with rationale. Authored ADR-0012 + adr-index update; reconciled `deferred-work.md` (incl. AC-6 CRP-timing deferral). `pnpm turbo run lint typecheck test build` 65/65 green; gate self-green by construction + regression-proven. Status → review. |
