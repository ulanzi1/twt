# Story 1.16b: PII Scrape CI Gate (FR-74 Foundational) `[GOVERNANCE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder,
I want a PII scrape-test CI gate that consumes the FR-74 Public-vs-Private (4-tier) visibility matrix,
so that no public-surface PII leak can land in any intermediate epic before Epic 11a ships its full transparency surfaces — the gate exists and is wired now, then grows teeth surface-by-surface as the matrix populates and member-facing renders land.

## Acceptance Criteria

> **Read first — three things this story is NOT.** (1) It is **NOT** Epic 11a. Epic 11a (Story 11a.1) *populates* `public-vs-private-matrix.yaml` with real per-surface/per-field tiers; Story 1.16b ships the **gate that consumes it** + a structurally-valid **scaffold** (schema + empty surfaces) that fixes the format. (2) It is **NOT** the live-render scrape integration test. The architecture-committed `tests/integration/public-pages/scrape-test.spec.ts` (D13-1.2) is the *live-render* realization that lands with the actual public surfaces (Story 2.5 / 11a.2) and **imports this story's verification engine**; here the engine + governance gate land with fixture coverage and a graceful no-op. (3) It is **NOT** a member build/render dependency — like its sibling 1.16a (friction-budget), this gate is **green by construction on the PR that introduces it** because the matrix is empty/scaffold and no public render exists yet.

### AC-1 — Matrix schema + scaffold file at `packages/contracts/public-pages/` (the consumed contract)
**Given** FR-74 (Public-vs-Private matrix is canonical; architecture §2.7 lines 1522-1524) + the 4-tier model defined by Story 11a.1
**When** the gate's consumed contract is established
**Then** a `public-vs-private-matrix.yaml` file exists at **`packages/contracts/public-pages/`** (the exact path the epics AC + Story 11a.1 AC pin) as a **structurally-valid scaffold**: a `version`, an (empty or clearly-marked-placeholder) `surfaces` list, and header comments documenting the schema so Epic 11a *populates content into a fixed format* rather than inventing one.
**And** the schema declares, per surface and per renderable field, exactly one of the **4 tiers** — `public | authenticated_member | operator_restricted | never_exposed` (semantics per Story 11a.1 AC, epics L3596-3600) — plus a per-surface `search_indexing_policy ∈ {index | noindex | conditional}` (epics L3614).
**And** a Zod schema in `packages/contracts/src/public-pages/` parses + validates the YAML (on-pattern with the rest of `packages/contracts/`); a malformed matrix **fails the gate loudly** (never silently skipped — mirror `friction-budget`'s `parseFrictionBudgetYaml` throw-on-malformed posture).

### AC-2 — Tier-leak + naked-PII verification engine (pure, fixture-tested)
**Given** a parsed matrix + a rendered-surface snapshot (HTML for a rendered page, or the JSON field-set for an API response shape)
**When** the verification engine evaluates a surface render against the matrix at a viewer context (`public | authenticated_member | operator_restricted`)
**Then** it asserts the **four tier-leak rules** (Story 11a.1 AC, epics L3618-3620): (a) `never_exposed` fields appear on **NO** surface; (b) `operator_restricted` fields do not appear on member-authenticated or public renders; (c) `authenticated_member` fields do not appear on public renders; (d) `public` fields are renderable everywhere. **Mixing tiers above the viewer's context within a single surface render fails.**
**And** it additionally runs **naked-PII pattern detection** on public HTML renders (FR-74 testable consequence "scrapes the public site and asserts that no PII from the Never list is exposed", PRD L1039; + Story 11a.4 / FR-93): naked phone / email / Aadhaar patterns in a `public`-tier render **fail**.
**And** any leak **fails CI** with the **offending surface and field named** in the output (epics L1321) — structured failure, mirroring `friction-budget`'s `failures[]` accumulation + per-finding print.
**And** all engine logic is **pure and importable** (so the future `tests/integration/public-pages/scrape-test.spec.ts` consumes it) and **fixture-unit-tested**: each of the 4 rules (positive=leak→fail + negative=compliant→pass), the PII-pattern detector (present→fail / absent→pass), and malformed-matrix → throw.

### AC-3 — Graceful no-op until the matrix populates AND a rendered surface exists (the 1.16b bootstrapping pattern)
**Given** Epic 11a has not yet codified the matrix and no member-facing public render exists in CI (`apps/public` is a `tsc` stub until the Story 2.5 Astro shell; `apps/api/src/modules/public-pages/` is empty until Epic 11b)
**When** the gate runs against the empty/scaffold matrix (or an absent matrix file) and/or with no rendered-surface snapshots available
**Then** the gate is a **graceful no-op (passes)** — empty/absent matrix → pass; a surface with no available render snapshot → that surface's scrape is a no-op (exactly the AC-blessed "no-op until populated" behavior the epics AC mandates, L1324-1326, and the same shape as 1.16a's no-op-on-absent-build-output + 1.16c precision-scoping).
**And** the gate becomes **meaningful surface-by-surface**: as Epic 11a fills the matrix and Story 2.5/11a.2 render public surfaces, the render snapshots feed the engine and the leak rules acquire teeth — **without a code change to the gate** (the no-op is data-driven, not a feature flag).

### AC-4 — CI wiring + local runnability + mechanism (repo-scope decision)
**Given** the gate logic (AC-2/AC-3)
**When** wired into CI
**Then** a dedicated **`pii-scrape` job is added to `.github/workflows/ci.yml`** mirroring the `db-check` / `contracts-check` / `crypto-check` / `friction-budget` job shape (`needs: install`, pnpm 10.30.3 + node 22.12.0 + `--frozen-lockfile`). **Unlike `friction-budget`, this job does NOT need `fetch-depth: 0`** — the PII gate validates the current matrix + current renders; it does **not** diff against a PR base ref. Do not cargo-cult `fetch-depth: 0`.
**And** the gate is invokable locally (`pnpm pii:check`) and its unit tests ride `pnpm turbo run test` (contracts is a workspace); the gate is homed as a **`packages/contracts/` turbo task** (`contracts:check-pii-scrape`, mirroring `check-openapi-determinism` — the config is a contracts artifact and there is no git-diff), **not** a repo-root `scripts/` gate. See Dev Notes → *Mechanism*.
**And** the architecture's planned `ci.yml` already names a "scrape-test" step (architecture L4159) — this job realizes it.

### AC-5 — D8-1.5 column-metadata cross-check disposition + deferred-work reconciliation
**Given** `deferred-work.md` routes the FR-74 gate trigger to this story: **D8-1.5** ("FR-74 PII shielding matrix CI gate … Trigger: Story 1.16b … reads column metadata to assert FR-74 matrix compliance + scrape-tests public surfaces", L275) + the `tests/integration/public-pages/scrape-test.spec.ts` slot of **D13-1.2** (L821) + the column primitive `piiColumn(tier, fieldClass)` whose own comment names this story (D8-1.5) as its consumer (`packages/domain/src/encryption/column.ts:16`, `tiers.ts:5`)
**When** this story is implemented
**Then** the `piiColumn` tier-metadata ↔ matrix cross-check leg ("no Tier-1/Tier-2 field is matrix-classified `public`") is **explicitly deferred with rationale + trigger** — it has nothing to check against until the matrix populates at Story 11a.1, and the rendered-field→DB-column mapping is Epic 11a/11b territory; the matrix-consumer + scrape engine are this story's v1 deliverable. **Trigger:** matrix population at Story 11a.1.
**And** `deferred-work.md` is reconciled with **precise closure verbs** ([[feedback_closure_language_precision]]): **D8-1.5** → *Closed by [edit]* for the matrix-consumer + verification-engine + no-op gate; its live-render-scrape + column-metadata-cross-check legs → *Resolved via explicit deferral* (trigger: matrix populates at Story 11a.1 + public surfaces render at Story 2.5/11a.2). **D13-1.2** `public-pages/scrape-test` slot → the engine + gate land now; the live-render integration spec → *Resolved via explicit deferral* to Story 2.5/11a (it imports this engine). **D7-1.5** (PII-bearing column landings at Stories 3.x/6.x/9.x) → no change; cross-reference that 1.16b ships the gate those columns will be checked against.

### AC-6 — Green gates + ADR + self-green by construction
**Given** the gate + the scaffold matrix
**When** the work completes
**Then** `pnpm turbo run lint typecheck test build` is green; the new `pii-scrape` CI job **passes on this PR by construction** (empty/scaffold matrix + no public render → no-op — the gate must not red-fail the very PR that introduces it); an **ADR-0013** records the gate design (matrix-consumer + 4-tier leak engine + naked-PII detection + no-op-until-populated + repo-scope decision + relationship to the deferred live-render integration spec); the adr-index is updated.
**And** **no new DB migration** is expected (this story touches no schema); **no new dependency** is expected (`tsx`, `yaml`, `vitest`, `zod` are all already present in `packages/contracts` — and at root from 1.16a).

### AC-7 — PR-template reconciliation (respect the 6-prompt budget)
**Given** the PR template's bounded **6-prompt initial scope** (architecture §PR-template review budget, L4021-4024 — adding past six requires retiring one or merging categories) and its existing **Security-impact note** prompt (currently: "no DPDPA / FR-43A / RLS / audit-log regressions; no new secrets-handling paths …")
**When** the gate goes live
**Then** the **Security-impact note** prompt is reconciled to reference the now-live `pii-scrape` gate + FR-74 matrix (no PII at a tier above its matrix declaration) — **do NOT add a 7th prompt** (exactly how 1.16a reconciled the friction checkbox without adding a prompt).

## Tasks / Subtasks

- [x] **Task 1 — Matrix schema + scaffold (AC-1)**
  - [x] Author the Zod matrix schema in `packages/contracts/src/public-pages/matrix.ts`: a `VisibilityTier` enum (`public | authenticated_member | operator_restricted | never_exposed`), a `SearchIndexingPolicy` enum (`index | noindex | conditional`), and the per-surface / per-field structure (surface `id`, optional `description`, `search_indexing_policy`, and `fields: { id, tier }[]`). Export it from `packages/contracts/src/index.ts` (or a `public-pages` barrel) so the future integration spec + Epic 11a consume the same type.
  - [x] Author the scaffold `packages/contracts/public-pages/public-vs-private-matrix.yaml`: `version: 1`, `surfaces: []` (or 1-2 clearly-commented `# placeholder — Epic 11a (Story 11a.1) populates` entries), and a header comment block documenting the 4 tiers + `search_indexing_policy` + the "Epic 11a populates; visibility escalation requires trustee-attested PR" governance note (epics L3602).
  - [x] Parse the YAML through the Zod schema (loud throw on malformed — mirror `parseFrictionBudgetYaml`).
- [x] **Task 2 — Verification engine + gate entrypoint (AC-2, AC-3)**
  - [x] **Pure engine** in `packages/contracts/src/public-pages/` (e.g. `scrape.ts`): the 4 tier-leak rules (`evaluateSurfaceRender(matrix, surfaceId, viewerContext, renderedFieldIds) → verdict`), the naked-PII pattern detector (phone / email / Aadhaar regexes over public HTML), and a `RenderSnapshot` abstraction (`{ surfaceId, viewerContext, html?, fields? }`). Keep it side-effect-free + importable (so `tests/integration/public-pages/scrape-test.spec.ts` reuses it later). Mirror the testable-pure-core / impure-orchestration split of `check-openapi-determinism.ts`.
  - [x] **Impure gate** entrypoint (e.g. `packages/contracts/scripts/check-pii-scrape.ts`): load + Zod-parse the matrix; enumerate available render snapshots (at v1 there are **none** → no-op); run the engine; accumulate `failures[]`; print structured per-finding output naming surface + field; `process.exit(1)` on any leak. Empty/absent matrix → pass with a no-op notice; per-surface no-render → no-op notice.
  - [x] **Unit tests** (fixture-driven, no network/DB/render): each of the 4 leak rules (leak→fail + compliant→pass), PII-pattern detector (present→fail / absent→pass), malformed-matrix→throw, empty-matrix→no-op. Place adjacent to the engine so `pnpm turbo run test` discovers them (contracts is a workspace — see Dev Notes *Mechanism*).
- [x] **Task 3 — CI wiring + local + turbo task (AC-4)**
  - [x] Add a `contracts:check-pii-scrape` turbo task to `packages/contracts/package.json` (`tsx scripts/check-pii-scrape.ts`) — mirror `contracts:check-openapi-determinism`. Add a root `pii:check` script (`turbo run contracts:check-pii-scrape`) to root `package.json`. No `pii:test` is needed — the engine's unit tests ride `pnpm turbo run test` (contracts is a workspace).
  - [x] Add a `contracts:check-pii-scrape` pipeline entry to `turbo.json` — mirror the `contracts:check-openapi-determinism` entry shape (`dependsOn: []`, `inputs: ["src/**/*.ts", "scripts/**/*.ts", "package.json", "../../pnpm-lock.yaml", "public-pages/public-vs-private-matrix.yaml"]`, `outputs: []`). Without this entry `pnpm turbo run contracts:check-pii-scrape` will fail.
  - [x] Add a dedicated **`pii-scrape` job** to `.github/workflows/ci.yml` (mirror the `contracts-check` / `friction-budget` job shape; `needs: install`; **NO `fetch-depth: 0`**) running `pnpm turbo run contracts:check-pii-scrape`. (Alternative: fold a second step into the existing `contracts-check` job — see Dev Notes; recommended is a dedicated job for clear CI signal.)
- [x] **Task 4 — D8-1.5 disposition + PR template + deferred-work reconciliation (AC-5, AC-7)**
  - [x] **Defer** the `piiColumn` column-metadata ↔ matrix cross-check (D8-1.5 second leg) — record it as *Resolved via explicit deferral* with trigger (matrix populates at Story 11a.1). Decided; nothing to check against until the matrix populates.
  - [x] Reconcile `.github/pull_request_template.md`: extend the **Security-impact note** prompt to reference the live `pii-scrape` gate + FR-74 matrix. **Do NOT add a 7th prompt.**
  - [x] Reconcile `deferred-work.md`: **D8-1.5** (Closed by [edit] for the gate; defer the live-render-scrape + column-metadata legs with trigger), **D13-1.2** `public-pages/scrape-test` slot (engine+gate land; integration spec deferred to 2.5/11a), **D7-1.5** cross-reference. Add a "## Story 1.16b — resolutions + new deferrals" section (mirror the 1.16a section style at L1100).
- [x] **Task 5 — ADR + green gates (AC-6)**
  - [x] Author `docs/adr/ADR-0013-pii-scrape-ci-gate.md` (ADR-0012 is latest, Story 1.16a; follow the `ADR-XXXX-kebab-case-title.md` convention): matrix-consumer design, 4-tier leak engine + naked-PII detection, no-op-until-populated bootstrapping, the repo-scope decision (contracts turbo task vs repo-root script) + rationale, the D8-1.5 disposition, and the relationship to the deferred live-render integration spec. Update `docs/knowledge-transfer/adr-index.md` (follow 1.16a's reconciliation: `drafted` 9→10 + total/Section counts).
  - [x] Author a short `packages/contracts/src/public-pages/README.md` (or `public-pages/README.md`) documenting the matrix schema + the gate mechanism + the no-op semantics (mirror `scripts/friction-budget/README.md`).
  - [x] Run `pnpm turbo run lint typecheck test build` (green) + confirm the `pii-scrape` job passes by construction (scaffold matrix + no render → no-op). No new DB migration.

## Dev Notes

### Ground-truth: the gate is NEW, but its shape, config home, and mechanism all have precedents — extend, do not reinvent

| Need | Already exists / precedent | Action |
|---|---|---|
| `tsx` script-as-CI-check homed in `packages/contracts/`, invoked as a turbo task | `packages/contracts/scripts/check-openapi-determinism.ts` (turbo task `contracts:check-openapi-determinism`) | **Mirror the package home and turbo-task pattern** — same package, same `scripts/` placement, same `contracts:` namespace. **Do NOT mirror its internal shape** — `check-openapi-determinism.ts` is a 52-line monolithic impure script with no pure/importable core whatsoever (it calls `execSync` and diffs strings). |
| Pure/importable engine + impure gate entrypoint split | `scripts/friction-budget/lib.ts` (pure core) + `scripts/friction-budget/check.ts` (impure: fs + git + exit) — Story 1.16a | **Mirror this split exactly** for 1.16b: pure logic in `src/public-pages/scrape.ts` (the verification engine, importable by the future integration spec), impure orchestration in `scripts/check-pii-scrape.ts` (loads matrix, enumerates snapshots, accumulates `failures[]`, exits). |
| Two-facet governance gate (parse-config-loud + structured-fail + no-op-until-populated) | `scripts/friction-budget/` (Story 1.16a, just landed) | **Mirror the posture** (throw-on-malformed, `failures[]` accumulation, no-op semantics, README), but home it in `packages/contracts/` (no git-diff → not repo-global). |
| CI-gate job shape (install→needs→pnpm/node/frozen-lockfile) | `.github/workflows/ci.yml` `db-check` / `contracts-check` / `crypto-check` / `friction-budget` | **Mirror** for the new `pii-scrape` job. **Omit `fetch-depth: 0`** (no base-ref diff). |
| PII tier annotation primitive (D8-1.5 consumer target) | `packages/domain/src/encryption/{column.ts,tiers.ts}` — `piiColumn(tier, fieldClass)`, `PiiTier = 1|2|3`; `column.ts:16` literally names "Story 1.16b PII-shielding CI gate consumes (D8-1.5)" | **Consume the tier metadata** *if* co-landing the column cross-check; otherwise defer (recommended). |
| Matrix tier model + the 4 leak rules + `search_indexing_policy` | Story 11a.1 AC (epics L3586-3620) + Story 11a.3 field table (L3649-3664) | **Encode the schema + rules from here** — do NOT invent tiers; Epic 11a owns the *content*. |
| Zod schema home + barrel export | `packages/contracts/src/*` (zod modules) + `src/index.ts` | **Add `src/public-pages/matrix.ts`** as a zod schema; export from the barrel. |
| ADR numbering | `docs/adr/` — ADR-0012 is latest (Story 1.16a) | **`docs/adr/ADR-0013-pii-scrape-ci-gate.md`** next; update adr-index. |
| Naked-PII patterns (phone/email/Aadhaar) for the scrape detector | FR-93 / Story 11a.4 (L3700) + FR-74 testable consequence (PRD L1039) | Encode conservative regexes; Story 11a.4 obfuscation is the *defense-in-depth* layer — the gate detects *leaks*. |

### CRITICAL — what "ships now" vs "grows later", precisely (the #1 scope reconciliation)
The epics AC for 1.16b is scrape-centric ("scrapes the rendered public output … asserts no matching PII field"). But **no public render exists in CI today**, and the **matrix is unpopulated** (Epic 11a's job). So the *binding v1 deliverable* is the **consuming gate + verification engine + scaffold + no-op semantics**, not a live scrape of pages that do not exist yet. This is the exact analogue of 1.16a's metric facet (no-op until member build output lands). What ships now:
- **Matrix schema (Zod) + scaffold YAML** at `packages/contracts/public-pages/` — fixes the format Epic 11a fills.
- **Pure verification engine** (4 tier-leak rules + naked-PII detector) — fully fixture-tested, importable.
- **The `pii-scrape` CI job** — green by construction (empty matrix + no render → no-op).
What grows later (do NOT build here):
- **Live rendered-surface snapshots** (Story 2.5 Astro build HTML; Story 11a.2 renderers; `apps/api/src/modules/public-pages/` response shapes at Epic 11b). The architecture commits the live realization to `tests/integration/public-pages/scrape-test.spec.ts` (D13-1.2) — that spec **imports this story's engine** and runs it against real renders.
- **Matrix population** (Story 11a.1 fills surfaces/fields; this story only scaffolds).

### Mechanism — DECIDED: a `packages/contracts/` turbo task, NOT a repo-root `scripts/` gate
**Decision (BigDev-accepted):** home the gate in `packages/contracts/`, mirroring `check-openapi-determinism.ts` — **not** a repo-root `scripts/` gate. 1.16a chose **repo-root `scripts/friction-budget/`** *because it is genuinely repo-global*: it reads root config, scans **cross-app build outputs**, and inspects the **PR-level git diff** (needing `fetch-depth: 0`). **1.16b's v1 scope is different**: its config is a **`packages/contracts/` artifact** with **no git-diff dependency** — so the matching precedent is the contracts turbo task, not friction-budget. Home:
- Engine + schema: `packages/contracts/src/public-pages/` (importable by the future integration spec — a repo-root `scripts/` module is awkward to import from `tests/`).
- Entry: `packages/contracts/scripts/check-pii-scrape.ts`; turbo task `contracts:check-pii-scrape`; root `pii:check`.
- Tests ride `pnpm turbo run test` automatically (contracts **is** a pnpm workspace — no separate `pii:test` step is needed, unlike `scripts/friction-budget/` which needed `friction:test`).
- CI: a dedicated `pii-scrape` job running `pnpm turbo run contracts:check-pii-scrape` (clear signal), **no `fetch-depth: 0`**.

**Why not 1.16a's `scripts/` home (decided against):** mechanical cluster-consistency would be cargo-culting — 1.16a is repo-root *for cause* (git-diff + cross-app scan); 1.16b is matrix-scoped, so honoring the gate's actual scope beats uniformity. The rejected repo-root alternative would have forced (a) engine/entry/tests under `scripts/pii-scrape/`, (b) an explicit `pii:test` step (`scripts/` is not a workspace — `pnpm-workspace.yaml` = `apps/*` + `packages/*` only), (c) an awkward cross-`tests/` import for the future integration spec. Note the cluster is NOT all one home: 1.16c (schema-diff: migrations across packages + apps/api endpoints) and 1.16d (`benefit_mechanism`: fixtures/migrations/seed) **are** repo-global → those belong at repo-root `scripts/`. 1.16b being contracts-homed while c/d are repo-root is an *honest* split, not an inconsistency.

### Matrix schema (AC-1) — encode from Story 11a.1, scaffold empty
The 4 tiers + their semantics (epics L3596-3600):
- `public` — Internet-visible without auth.
- `authenticated_member` — logged-in members only (Story 1.9 admin / Story 3.2 member auth).
- `operator_restricted` — staff/trustees/admins with RBAC scope (Story 1.8).
- `never_exposed` — never rendered on any surface (Aadhaar, bank details — covered by Story 1.5 PII tier encryption).

Per-surface `search_indexing_policy ∈ {index | noindex | conditional}` (epics L3614). The **leak rules** the engine enforces (epics L3618-3620): never_exposed→no surface; operator_restricted→not member/public; authenticated_member→not public; public→anywhere. Scaffold the YAML with `version: 1` + `surfaces: []` (or commented placeholders) — Epic 11a populates Niyamavali (2.5), T&C (2.6), Member Directory (11a.3), Sahyog Drive/Vivran/In Memoriam (11b). Do NOT pre-populate real surfaces here (that's Epic 11a's trustee-attested job, L3602).

### D8-1.5 — what the gate consumes from `piiColumn`, and why the cross-check leg defers
`packages/domain/src/encryption/column.ts` attaches `{ tier, fieldClass }` as Drizzle column-config metadata (Story 1.5 substrate). D8-1.5 (deferred-work L275) gives the gate two jobs: (1) **scrape public surfaces** for Tier-1/Tier-2 leakage (this story's engine); (2) **read column metadata to assert FR-74 matrix compliance** (no Tier-1 field matrix-classified `public`). Leg (2) cross-checks against the matrix — which is **empty until Story 11a.1** — so it has nothing to assert at v1, and the rendered-field→DB-column mapping is Epic 11a/11b territory. **Decided (BigDev-accepted): defer leg (2)** with rationale + trigger (matrix populates at 11a.1); land leg (1)'s engine + the matrix consumer now. Extracting tier metadata from Drizzle column internals is finicky; do not invent that plumbing for an empty matrix. (When leg (2) lands later: an AST/value-import enumeration of `piiColumn(1|2, …)` call-sites cross-checked against matrix `public` entries.)

### No-op / self-green invariant (AC-3, AC-6)
The `pii-scrape` job MUST pass on the PR that introduces it. Guaranteed by: scaffold matrix is structurally valid (or empty → no-op) + no render snapshots exist → the engine evaluates nothing → pass. Verify locally via `pnpm pii:check` before pushing. This is the same "green by construction" discipline as 1.16a — the gate's *existence + wiring + engine + scaffold* are the deliverable; teeth grow with data.

### Testing standards
- **Unit (engine):** fixture-driven, pure — the 4 tier-leak rules (each: a leak fixture → fail naming surface+field; a compliant fixture → pass), the naked-PII detector (HTML with a phone/email/Aadhaar → fail; clean HTML → pass), matrix parse (valid → typed object; malformed → throw), empty/absent matrix → no-op. No network, no DB, no live render. This is a **DB-free story**.
- **Discovery:** because the engine + tests live in `packages/contracts` (a workspace), `pnpm turbo run test` discovers them automatically — no separate test step needed in the `pii-scrape` job (the job runs the *gate*; `turbo run test` covers the unit tests). *(If BigDev picks the repo-root `scripts/` alternative, add an explicit `pii:test` step — `scripts/` is not a workspace.)*
- **Self-green:** confirm `pnpm pii:check` passes locally before pushing; confirm `pnpm turbo run lint typecheck test build` stays green.
- No `onSend` hooks here (not an API story) — the [[project_fastify_onsend_doublesend]] trap does not apply. No new migration — the [[project_live_db_test_gotchas]] migration traps do not apply.

### Project Structure Notes
- **`packages/contracts/src/public-pages/` does not exist yet** — create the directory. The existing `src/` subdirectories are `_common`, `alerts`, `audit`, `auth`, `claims`, `contributions`, `deep-links`, `errors`, `feature-flags`, `helpdesk`, `kyc`, `members`, `modules`, `pariwar-passport`, `pariwar-provisioning`, `partners`, `pools`, `rbac`, `reconciliation`. Add `public-pages/` alongside these.
- Similarly, `packages/contracts/public-pages/` (the YAML data directory, not `src/`) does not exist — create it alongside the existing `packages/contracts/scripts/` directory.
- Matrix data: `packages/contracts/public-pages/public-vs-private-matrix.yaml` (epics-pinned path).
- Schema + engine: `packages/contracts/src/public-pages/{matrix.ts, scrape.ts, *.test.ts, README.md}`; export the schema from the contracts barrel.
- Gate entry: `packages/contracts/scripts/check-pii-scrape.ts` (mirror `check-openapi-determinism.ts`); turbo task `contracts:check-pii-scrape`; root `pii:check`.
- CI: new `pii-scrape` job in `.github/workflows/ci.yml` (no `fetch-depth: 0`).
- ADR: `docs/adr/ADR-0013-pii-scrape-ci-gate.md`; update the adr-index.
- PR template: reconcile the Security-impact note (do not add a prompt).
- deferred-work: reconcile D8-1.5 / D13-1.2 (public-pages/scrape-test slot) / D7-1.5.
- **No new dependency** (`tsx`/`yaml`/`vitest`/`zod` already in `packages/contracts`).

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.16b] (L1309-1326) — story statement + 2 BDD blocks: consume `public-vs-private-matrix.yaml` (at `packages/contracts/public-pages/`), Never-Public surfaces scraped (rendered output or API response shape), leak→fail naming surface+field, runs against rendered surfaces in CI test-env public render, empty/minimal matrix → no-op.
- [Source: _bmad-output/planning-artifacts/epics.md#Story-11a.1] (L3586-3620) — the 4-tier model (`public | authenticated_member | operator_restricted | never_exposed`), `search_indexing_policy` field, matrix path `packages/contracts/public-pages/`, trustee-attested escalation governance, and the **4 leak-rule verification** (L3618-3620) the engine encodes.
- [Source: _bmad-output/planning-artifacts/epics.md#Story-11a.3] (L3649-3664) — the per-field tier table (first-name/full-name/district/block/mobile/email/Aadhaar/bank/nominee) the matrix will encode; useful as fixture inspiration (do not pre-populate the scaffold with it).
- [Source: _bmad-output/planning-artifacts/epics.md#Story-11a.4] (L3698-3701) — naked phone/email detection in public HTML render (the scrape detector); obfuscation = defense-in-depth, matrix = primary.
- [Source: _bmad-output/planning-artifacts/epics.md] L1513, L1852, L2900, L2910, L3580-3582, L4251, L4286, L4297 — downstream consumers that depend on the 1.16b gate (Member Directory PII shielding, anonymous-member rendering, live contributor list, breach-detection observability) — context for why the gate must exist now.
- [Source: _bmad-output/planning-artifacts/architecture.md#Principles] L292-293 — Principle #7 PII shielding (Public-vs-Private matrix in a single enforcement layer; automated CI scrape-test asserts no "Never public" field leaks).
- [Source: _bmad-output/planning-artifacts/architecture.md#2.7] L1522-1524 — Tier classification authority: the Public-vs-Private matrix (FR-74) is canonical; new PII fields declare their tier at schema definition; CI guards no Tier-1 field renders to a public surface.
- [Source: _bmad-output/planning-artifacts/architecture.md] L500 (SSR shell renders only public content per FR-74), L1307 (external-scraper threat → scrape-test mitigation), L4159 (planned ci.yml "scrape-test" step), L4304 (`apps/api/src/modules/public-pages/` FR-74..80 — empty at v1), L4427 (`tests/integration/public-pages/scrape-test.spec.ts` uncompromisable slot), L4527 (§4.11 Public Pages + PII mapping).
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-74] L1030-1040 — Public-vs-Private matrix: Public / Members-only / Never lists + the testable consequence (automated scrape asserts no "Never" PII exposed) + FR-75 (directory PII shielding, noindex) + SM-C5 (public PII exposure = hard-zero counter-metric, L1346).
- [Source: packages/contracts/scripts/check-openapi-determinism.ts] — the tsx CI-gate-script shape to mirror (turbo task; pure core + structured fail).
- [Source: packages/contracts/package.json] — `contracts:check-openapi-determinism` task to mirror; `tsx`/`yaml`/`vitest`/`zod` already present (no new deps).
- [Source: scripts/friction-budget/{check.ts,lib.ts,README.md}] (Story 1.16a) — the sibling governance-gate posture (throw-on-malformed parse, `failures[]` accumulation, no-op semantics, README) to mirror; **the `fetch-depth: 0` + repo-root `scripts/` decisions are 1.16a-specific (git-diff + repo-global) and do NOT carry over** — see Mechanism.
- [Source: .github/workflows/ci.yml] — `contracts-check` / `friction-budget` job shapes to mirror for the new `pii-scrape` job (default shallow checkout — no `fetch-depth: 0`).
- [Source: packages/domain/src/encryption/column.ts L16 + tiers.ts L5] — `piiColumn(tier, fieldClass)` tier metadata; both name Story 1.16b / D8-1.5 as the consumer (the column cross-check leg — recommended defer).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] L275 (D8-1.5 FR-74 PII matrix CI gate, Trigger: Story 1.16b), L821 (D13-1.2 `public-pages/scrape-test` slot → Story 1.16b), L274 (D7-1.5 PII-bearing column landings, cross-reference), L1100 (the 1.16a "Deferred from code review" section style to mirror).
- [Source: docs/adr/ADR-0012-friction-budget-pr-ci-gate.md + docs/knowledge-transfer/adr-index.md] — ADR numbering (next = 0013) + the adr-index reconciliation pattern (1.16a flipped `drafted` 8→9).
- [Source: .github/pull_request_template.md] — the Security-impact note to reconcile; the bounded 6-prompt scope (do not exceed).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- `pnpm --filter @twt/contracts test` — 31 new tests in `tests/public-pages.test.ts` (115 total) green.
- `pnpm pii:check` (turbo `contracts:check-pii-scrape`) — no-op green (empty scaffold matrix + 0 snapshots).
- Regression-proof end-to-end: a temporary malformed matrix (`rogue_key`) made the gate **fail loudly** with exit 1 ("Unrecognized key(s) in object: 'rogue_key'"); restoring the scaffold returned it to exit 0. File restored clean (no working-tree change).
- `pnpm turbo run lint typecheck test build` — 65/65 green.
- `pnpm contracts:check-openapi-determinism` — green; `openapi/v1.yaml` byte-identical (the barrel export of `public-pages` does not touch the OpenAPI surface — the emitter registers schemas via explicit `.openapi()` calls, not barrel discovery, and the matrix schema is plain `z.object`).
- `pnpm exec prettier --check` on all touched files — clean (2 files auto-formatted: README + test).

### Completion Notes List

**Binding v1 deliverable — the consuming gate + engine + scaffold + no-op (NOT Epic 11a, NOT the live-render spec):**

- **AC-1 — Matrix schema + scaffold.** `packages/contracts/src/public-pages/matrix.ts`: `VisibilityTier` (4 tiers) + `SearchIndexingPolicy` (3 policies) enums + per-surface/per-field `.strict()` Zod schema + `parsePublicVsPrivateMatrix` (throws loudly on malformed, mirroring `parseFrictionBudgetYaml`; returns `null` on a blank/comments-only doc — the empty-matrix sentinel). Scaffold `packages/contracts/public-pages/public-vs-private-matrix.yaml` = `version: 1`, `surfaces: []` + a header comment block documenting the 4 tiers / `search_indexing_policy` / the trustee-attested-escalation governance note. Exported from the contracts barrel.
- **AC-2 — Verification engine (pure, importable, fixture-tested).** `src/public-pages/scrape.ts`: the 4 tier-leak rules via a tier-rank-vs-viewer-ceiling model (`evaluateSurfaceRender`), the conservative naked phone/email/Aadhaar detector (`detectNakedPii`, fresh RegExp per scan, lookaround boundaries so phone≠Aadhaar-slice), the `RenderSnapshot` abstraction, and the `evaluateSnapshot` orchestrator. Leaks name the offending **surface + field**; an undeclared rendered field is **fail-closed** (`unclassified`). 31 fixture unit tests cover each rule (leak→fail + compliant→pass), the detector (present→fail / absent→pass), malformed→throw, empty→null, and the committed scaffold→zero surfaces.
- **AC-3 — Graceful no-op (data-driven, not a flag).** The gate `scripts/check-pii-scrape.ts` no-ops on absent matrix / empty matrix / no render snapshots (at v1 `loadSnapshots()` returns `[]` — `apps/public` is a `tsc` stub until Story 2.5; `apps/api/src/modules/public-pages/` is empty until Epic 11b). Teeth grow surface-by-surface with no code change as the matrix + renders land.
- **AC-4 — CI wiring + local + turbo task.** `contracts:check-pii-scrape` task in `packages/contracts/package.json` + a `turbo.json` pipeline entry (inputs include the matrix YAML) + root `pii:check` + a dedicated `pii-scrape` ci.yml job mirroring `contracts-check` — **no `fetch-depth: 0`** (no base-ref diff). Engine unit tests ride `pnpm turbo run test` (contracts is a workspace — no separate `pii:test`).
- **AC-5 — D8-1.5 disposition + deferred-work reconciliation.** D8-1.5 **split**: Closed by [edit] for the matrix-consumer + engine + no-op gate; the live-render-scrape leg + the `piiColumn`↔matrix column-cross-check leg → Resolved via explicit deferral (triggers: public surfaces render at 2.5/11a.2; matrix populates at 11a.1). D13-1.2 `public-pages/scrape-test` slot: engine+gate land now, the live integration spec deferred to 2.5/11a.2 (it imports this engine). D7-1.5: cross-referenced (no change). New "## Story 1.16b — resolutions + new deferrals" section added (reverse-chron, above the 1.16a section).
- **AC-6 — Green gates + ADR + self-green.** `pnpm turbo run lint typecheck test build` 65/65 green; the `pii-scrape` job passes by construction; ADR-0013 authored (matrix-consumer + 4-tier leak engine + naked-PII + no-op-until-populated + repo-scope decision + D8-1.5 disposition + relationship to the deferred live-render spec); adr-index reconciled (`drafted` 9→10, total 130→131, Section A 31→32, new row + note). No new DB migration; no new dependency (`tsx`/`yaml`/`vitest`/`zod` already present). README at `src/public-pages/README.md`.
- **AC-7 — PR-template reconciliation.** The Security-impact note now references the live `pii-scrape` gate + FR-74 matrix — **no 7th prompt** (6-prompt budget held).

**Decisions honored (BigDev-accepted, per story Dev Notes):** (a) gate home = `packages/contracts/` turbo task (NO `fetch-depth: 0`; engine in `src/` importable by the future integration spec); (b) D8-1.5 column-metadata cross-check = deferred to Story 11a.1.

**Deviation note (recorded):** the Dev Notes loosely suggested `src/public-pages/*.test.ts`, but the contracts vitest `include` is `tests/**/*.test.ts` (all 8 existing contracts suites live in `tests/`). To guarantee `pnpm turbo run test` discovery without a shared-config change, the engine test is homed at `tests/public-pages.test.ts` (the existing convention) and imports the engine from `../src/public-pages/index.js`. Same outcome the AC required (tests ride `turbo run test`, engine importable), on the established pattern.

### File List

**New:**
- `packages/contracts/src/public-pages/matrix.ts` — FR-74 matrix Zod schema + loud-throw parser
- `packages/contracts/src/public-pages/scrape.ts` — pure 4-tier-leak + naked-PII verification engine
- `packages/contracts/src/public-pages/index.ts` — public-pages barrel
- `packages/contracts/src/public-pages/README.md` — schema + gate mechanism + no-op docs
- `packages/contracts/public-pages/public-vs-private-matrix.yaml` — the consumed-contract scaffold (empty)
- `packages/contracts/scripts/check-pii-scrape.ts` — the impure gate entrypoint
- `packages/contracts/tests/public-pages.test.ts` — 31 fixture unit tests
- `docs/adr/ADR-0013-pii-scrape-ci-gate.md` — the gate-design ADR

**Modified:**
- `packages/contracts/src/index.ts` — export the public-pages barrel
- `packages/contracts/package.json` — `contracts:check-pii-scrape` script
- `package.json` — root `pii:check` script
- `turbo.json` — `contracts:check-pii-scrape` pipeline entry
- `.github/workflows/ci.yml` — the `pii-scrape` CI job (no `fetch-depth: 0`)
- `.github/pull_request_template.md` — Security-impact note reconciled (no 7th prompt)
- `docs/knowledge-transfer/adr-index.md` — ADR-0013 row + status reconciliation (drafted 9→10, total 130→131, Section A 31→32)
- `_bmad-output/implementation-artifacts/deferred-work.md` — Story 1.16b section + D8-1.5/D13-1.2/D7-1.5 inline annotations
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `1-16b` ready-for-dev → in-progress → review + ledger comment

### Review Findings

#### Decision-Needed

_(all resolved)_

- [x] [Review][Decision] ~~Email regex scans raw HTML — resolved: attribute-level detection is intentional~~ — BigDev confirmed option 2: any email anywhere in the DOM (including attributes) is a leak. Current behavior is correct. Dismissed. [`packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **`MatrixSurface.fields` permits empty array — add no-op warning, not a schema error** — BigDev confirmed option 2: allow `fields: []` structurally but emit a warning log in `evaluateSurfaceRender` (or `evaluateSnapshot`) when a matched surface has an empty fields list so scaffold surfaces are visible in gate output rather than silently skipped. [`packages/contracts/src/public-pages/scrape.ts`, `packages/contracts/src/public-pages/matrix.ts`]

#### Patch

- [x] [Review][Patch] **Rule (a) `never_exposed` test coverage incomplete** — missing `authenticated_member` viewer test, missing explicit pass-case test, and existing `operator_restricted` test asserts only `toHaveLength(1)` (not the offending tier/field); the most critical rule has the weakest fixture suite. [`packages/contracts/tests/public-pages.test.ts`]
- [x] [Review][Patch] **`pii-scrape` CI job missing `needs: install`** — AC-4 requires mirroring the `contracts-check` / `friction-budget` job shape with `needs: install`; the job currently performs an inline install instead, diverging from the spec and the sibling job pattern. [`.github/workflows/ci.yml`]
- [x] [Review][Patch] **Duplicate `surfaceId` values in matrix silently shadow the second entry** — `findSurface` uses `Array.find` (first-wins); the Zod schema has no uniqueness constraint on surface `id` values; a misconfigured matrix with duplicate surface IDs will silently discard the second declaration. [`packages/contracts/src/public-pages/matrix.ts`, `packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **Duplicate field `id` within a surface silently shadows the second tier** — `surface.fields.find(f => f.id === fieldId)` returns the first match; no intra-surface uniqueness constraint in the Zod schema; a field declared twice with different tiers (e.g. `public` then `never_exposed`) evaluates only the first. [`packages/contracts/src/public-pages/matrix.ts`, `packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **Duplicate entries in `renderedFieldIds` inflate the leak count** — `evaluateSurfaceRender` iterates without deduplication; the same `(surfaceId, fieldId)` pair produces duplicate `Leak` objects and inflates `failures[]`. [`packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **`html: ''` (empty string) silently passes as a clean render** — `'' !== undefined` → `hasHtml = true` → `detectNakedPii('')` returns `[]` → verdict `pass`; a scraper that returns an HTTP 200 with empty body is indistinguishable from a genuinely clean render. [`packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **`fields: null` at runtime bypasses the no-op guard** — TypeScript types prevent `null` statically, but JSON deserialization can produce it; `null !== undefined` → `hasFields = true` → `fields ?? []` → engine evaluates zero fields and passes. Guard should use `!= null`. [`packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **Phone regex double-fires on email addresses with 10-digit local parts** — `user9876543210@example.com` is correctly matched by the email pattern AND incorrectly matched by the phone pattern (lookbehind sees `r`, lookahead sees `@`); failure count is inflated with a spurious `phone` finding for the same value. [`packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **Aadhaar/phone regex overlap — Aadhaar numbers starting with 6-9 are double-counted** — the phone regex matches the first 10 of 12 Aadhaar digits when the leading digit is `[6-9]`; the same value is reported as both `aadhaar` and `phone`, inflating the count and misidentifying the type. [`packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **`ceilingTierName` falls back to `'public'` on unrecognised ceiling rank** — if the `VIEWER_CEILING → TIER_RANK` reverse lookup fails, the diagnostic message says "may only see tier ≤ public" regardless of the actual viewer context; should throw on an unrecognised rank rather than silently mislead. [`packages/contracts/src/public-pages/scrape.ts`]
- [x] [Review][Patch] **`evaluateSurfaceRender` passes `snapshot.fields ?? []` when `hasFields` is already true — dead code indicating type-safety gap** — `hasFields = snapshot.fields !== undefined`; within the `hasFields` branch `?? []` is unreachable; if `fields` type is ever widened to include `null`, the guard silently breaks while the coalescion masks it. [`packages/contracts/src/public-pages/scrape.ts`]

#### Deferred

- [x] [Review][Defer] `evaluateSnapshot` silently passes non-public HTML renders with no `fields` — spec-consistent (AC-2: PII detection is explicitly public-only; tier-leak requires `fields`); risk materialises at Story 2.5/11a.2 when the live-render integration spec constructs `RenderSnapshot` objects [`packages/contracts/src/public-pages/scrape.ts`] — deferred, pre-existing
- [x] [Review][Defer] Phone regex false positives on non-phone 10-digit strings (URL paths, order IDs, `0`-prefix landlines) — v1 limitation; spec documents "conservative patterns"; Story 11a.4 obfuscation is defence-in-depth; refine when real HTML snapshots are wired [`packages/contracts/src/public-pages/scrape.ts`] — deferred, pre-existing
- [x] [Review][Defer] `loadSnapshots()` hardcoded stub with no discovery mechanism — by design v1 (no public renders exist); the live-render path is `scrape-test.spec.ts` (D13-1.2); gate grows teeth with data, not code changes [`packages/contracts/scripts/check-pii-scrape.ts`] — deferred, pre-existing
- [x] [Review][Defer] `pii-scrape` CI job has no `needs: [test]` dependency — a failing engine test does not block the gate-specific CI check; acceptable if branch protection requires all status checks to pass [`.github/workflows/ci.yml`] — deferred, pre-existing

### Change Log

| Date | Change |
|---|---|
| 2026-06-16 | Story 1.16b created (ready-for-dev) — PII Scrape CI Gate (FR-74). Comprehensive context engineered: matrix schema + scaffold at `packages/contracts/public-pages/`, pure 4-tier leak + naked-PII verification engine, `pii-scrape` CI job (no `fetch-depth: 0`), no-op-until-populated bootstrapping, D8-1.5 / D13-1.2 / D7-1.5 deferred-work disposition, ADR-0013. Two decisions flagged for BigDev: gate home + D8-1.5 column-cross-check. |
| 2026-06-16 | BigDev accepted both create-story recommendations — locked: (a) gate home = `packages/contracts/` turbo task (`contracts:check-pii-scrape`, no `fetch-depth: 0`); (b) D8-1.5 column-metadata cross-check = deferred to Story 11a.1. Dev Notes + AC-4/AC-5 + Tasks updated to reflect the decisions; no open forks remain. |
| 2026-06-16 | Validation (bmad-create-story validate) — 3 fixes applied: (C1) Dev Notes ground-truth table corrected: `check-openapi-determinism.ts` is a monolithic impure script (no pure/impure split); role models now distinguished — turbo-task home from that file, pure/impure split design from `scripts/friction-budget/{lib.ts,check.ts}`; (C2) Task 3 gains explicit `turbo.json` pipeline entry sub-bullet (required for `pnpm turbo run contracts:check-pii-scrape` to resolve); (E1) Project Structure Notes documents that both `src/public-pages/` and `public-pages/` data directories do not yet exist and must be created. |
| 2026-06-16 | Story 1.16b implemented (ready-for-dev → in-progress → review) via bmad-dev-story (BigDev). Tasks 1-5 / AC-1…AC-7 complete. Landed: FR-74 matrix Zod schema + loud-throw parser + empty scaffold (`packages/contracts/{src/public-pages/matrix.ts, public-pages/public-vs-private-matrix.yaml}`); pure importable verification engine (`src/public-pages/scrape.ts` — 4 tier-leak rules + naked phone/email/Aadhaar detector + `RenderSnapshot`/`evaluateSnapshot`; fail-closed on undeclared field); impure gate (`scripts/check-pii-scrape.ts`) with data-driven no-op; `contracts:check-pii-scrape` turbo task + `turbo.json` entry + root `pii:check` + `pii-scrape` ci.yml job (NO `fetch-depth: 0`); 31 fixture unit tests (ride `turbo run test`). D8-1.5 split (Closed by [edit] for the matrix-consumer+engine+gate; live-render + column-cross-check legs Resolved via explicit deferral to 2.5/11a.2 + 11a.1); D13-1.2 `public-pages/scrape-test` engine-lands/spec-defers; D7-1.5 cross-ref; new deferred-work section. ADR-0013 authored + adr-index reconciled (drafted 9→10, total 130→131, Section A 31→32). PR-template Security-impact note reconciled (no 7th prompt). README authored. VERIFICATION: lint+typecheck+test+build 65/65 green; contracts 115 tests (31 new); openapi-determinism byte-identical (`openapi/v1.yaml` unchanged); pii:check no-op green + malformed→fail-loud regression-proven end-to-end; prettier-clean. No new DB migration; no new dependency. Status: review. |
