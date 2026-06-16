# Story 1.17: Design System Foundation — Tokens / Typography / Vocabulary / Numeral Hardening

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder and every consumer-epic engineer,
I want `@twt/tokens` to ship a hand-rolled TS token registry (color, spacing, typography scales, semantic CSS layer) **plus** a CI-runnable forensic-microcopy / vocabulary / numeral-discipline lint set, before any member-visible surface is built,
so that the UX-DR7–UX-DR12 (design-system foundation), UX-DR71 (vocabulary discipline) and UX-DR73 (numeral discipline) commitments are **land-once / consume-everywhere** rather than re-litigated per surface.

## Acceptance Criteria

> Lettered ACs (a)–(e) below are the epic's literal deliverables, restated as **independently testable** criteria. Each has been reconciled against the architecture's package boundaries and the UX spec's §6/§8 token decisions (see Dev Notes → **Scope Decisions & Boundary Reconciliations**). Two epic phrasings are deliberately corrected here: the deliverable home is **`packages/tokens` not `packages/ui`** (architecture §4.1), and **"FM-1..FM-14"** is reconciled to a concrete automatable lint set (the UX spec's `FM-N` are *Failure-Mode hardening commitments*, not 14 microcopy rules — see Dev Notes).

**AC1 — Token registry (epic deliverable (a)).**
**Given** UX-DR7–UX-DR12 + the UX-spec §6/§8 single-token-source decision
**When** `@twt/tokens` is authored
**Then** the package exports, as a hand-rolled TS module (constants), (i) a **color** palette using semantic role aliases per UX §8 (`ink-primary`, `surface-base`, `surface-accent`, `rule-hairline`, `rule-heavy`, `stamp-mudra`, `status-pending`, `status-confirmed`, `status-mismatch`, `status-grey-takeover`, plus general aliases `bg`/`surface`/`text`/`accent`/`danger`/`success`/`warning`), (ii) a **spacing** scale using the four UX-DR9 named tokens (`space-hairline`, `space-row`, `space-block`, `space-page-gutter`) — discrete named set, not a free numeric scale; pixel values are placeholder until P0-2 prototype commits them, (iii) a **typography** scale using the five UX-DR9 type-role token names (`display-name`, `display-parichay`, `body-ledger`, `numeric-tabular`, `caption-stamp`) each mapped to its canonical face — use exactly these names, no invented alternatives (FM-14 #1), (iv) a **border** token set (`border-hairline`, `border-rule`, `border-double-rule`, `border-funeral-frame`) — shadows intentionally absent (no token, no Tailwind utility)
**And** every token name expresses a **semantic role, not an arbitrary index** — no `color-1`/`color-2` slugs (FM-14 rule 1)
**And** each token (or token group) carries a brief comment naming its purpose / consumer (FM-14 rule 3)
**And** the existing `apps/admin/src/styles.css` `@theme` status palette (the DD-1 inline source) is **subsumed** by the new registry — admin's status banners keep their current AA-contrast values, now sourced from `@twt/tokens`, with no visual regression to the §4.10 integrity banners.

**AC2 — Semantic CSS generator + token-sync discipline (epic deliverable (e); UX §6 FM-4).**
**Given** the TS token source is canonical
**When** the generator runs
**Then** it emits a **Tailwind v4 `@theme` CSS-variable** artifact at **`packages/tokens/src/theme.css`** (web consumers configure Tailwind v4 CSS-first; there is no `tailwind.config.*` — admin already imports `@theme` in `styles.css`) deterministically from the TS source
**And** the committed file `packages/tokens/src/theme.css` is tracked alongside the source (FM-4: source canonical, compiled output tracked)
**And** a check fails the build when the committed artifact is **out of sync** with what the generator would produce from source.

**AC3 — Forensic-microcopy / vocabulary / numeral lint set as a CI gate (epic deliverables (b)+(c)+(d)).**
**Given** UX-DR71 (vocabulary discipline) + UX-DR73 (numeral discipline) + the §8 amendment-A2 numeral split + the vocabulary-register canon
**When** the lint set runs in CI
**Then** a repo-global gate (following the established `scripts/<gate>/` pattern: `check.ts` impure entrypoint + pure `lib.ts` + fixture `lib.test.ts` + `README.md` + a root config YAML + a `ci.yml` job + `<gate>:check`/`<gate>:test` root scripts) enforces:
  - **(c) vocabulary register** — flags prohibited member-visible terms mapped to canonical terminology: `passbook`→**Yogdaan Bahi**, `receipt`/`invoice`→**Contribution Note**, `report`→**Sahyog Vivran** (extend per the register), plus tone prohibitions (scarcity e.g. "only 2 days left!", panic e.g. "URGENT", and Pool-Reality comparison-to-target framing e.g. "we fell short of…", "X% achieved", "target missed")
  - **(d) numeral discipline** — flags Hindi/Devanagari numerals on **operational** surfaces and inline locale/numeral formatting outside the (future) i18n utility, per amendment A2 (operational = Gregorian + Latin; Hindi numerals permitted **only** in memorial Devanagari prose on the Shradhanjali surface)
  - **(b) token-governance subset (FM-14 rule 2)** — flags magic-number color/spacing/border/font literals in token-consuming component files (allow-listed scope; see Dev Notes)
**And** each finding **names the offending file + line + the canonical replacement**, mirroring the `benefit-mechanism` gate's "name the offender" contract
**And** the config YAML is versioned at repo root and unit-tested via fixtures (mirror `friction-budget` / `schema-diff` / `benefit-mechanism`)
**And** at v1 the gate scans a **bounded, allow-listed `apps/admin` copy footprint** (a declared slice of admin strings + token-consuming component files) so it has **real teeth on day one** — chiefly the FM-14 magic-number check (admin has live React components) and any vocabulary/tone hits in admin copy — **rather than being entirely no-op** [Decision 2, locked]; the broad member-surface vocabulary/numeral checks stay forward-compat until member surfaces land (Epic 2+). The v1 admin scope globs + their allow-list are declared in the config YAML. **Calibrate to green-on-introduction:** if real admin findings surface, fix them in this story; only genuinely-not-applicable cases go on the allow-list (with a comment) — the gate must pass on the introducing PR while still being non-vacuous (the green-with-teeth bar set by `benefit-mechanism`).

**AC4 — Documentation + placeholder consumer (epic AC tail).**
**Given** the package + lint set exist
**When** `@twt/tokens/README.md` is authored
**Then** it documents tokens, the typography role-faces + face-substitution policy (FM-2), the numeral-discipline rules (A2 operational-vs-ceremonial split), the vocabulary register, the FM-14 governance rules, and the **staged-tokens decision** (hand-rolled TS for v1; Style-Dictionary migration trigger = second-Pariwar provisioning OR first non-TS consumer — **do not introduce Style Dictionary now**), all with usage examples
**And** a consumer builds successfully importing from `@twt/tokens` — the placeholder consumer is **`apps/admin`** (already the live web consumer); `turbo build`/`typecheck`/`lint`/`test` stay green repo-wide.

**AC5 — Land-once / consume-everywhere inheritance (epic's second Given/When/Then).**
**Given** a future story authors a new surface
**When** it imports tokens / types from `@twt/tokens` and its copy is added
**Then** it inherits the design system without re-defining any primitive
**And** the lint set runs on the new surface's copy at PR time (the CI job is wired so it triggers repo-wide, like the existing gates).

## Tasks / Subtasks

- [x] **Task 1 — Author `@twt/tokens` registry** (AC: 1)
  - [x] Replace the `packages/tokens/src/index.ts` PR-1 placeholder with the semantic token module (color/spacing/typography) — keep `@twt/tokens` package name, `type: module`, existing tsconfig/eslint/vitest scaffold
  - [x] Encode the §8 semantic color aliases + general aliases; semantic names only (FM-14 #1); per-group purpose comments (FM-14 #3)
  - [x] Encode the spacing scale and the typography scale with the three role-faces + Latin pairings + face-substitution note (FM-2)
  - [x] Add unit tests asserting token shape, presence of required semantic aliases, and "no `color-N` slug" invariant
- [x] **Task 2 — Subsume admin's inline `@theme` status palette** (AC: 1)
  - [x] Move the `apps/admin/src/styles.css` `@theme` status pairs into `@twt/tokens` as the canonical source; admin consumes the generated artifact (Task 3)
  - [x] Preserve exact AA-contrast values; re-run `apps/admin` integrity-banner tests (`tests/integrity-page.test.tsx`) — no visual/contrast regression (§4.10)
  - [x] Close/annotate deferred item **D4-1.11b** accordingly (extraction now triggered by *this* story, not a 2nd admin surface)
- [x] **Task 3 — Semantic CSS generator + sync check** (AC: 2)
  - [x] Generator script emits a deterministic Tailwind v4 `@theme` CSS-variable block from the TS source to **`packages/tokens/src/theme.css`**; commit the file (FM-4)
  - [x] Wire `apps/admin/src/styles.css` to `@import` the generated `packages/tokens/src/theme.css` (replacing the inline `@theme` block subsumed in Task 2)
  - [x] Add a sync check (re-run generator → byte-compare to committed `packages/tokens/src/theme.css`) exposed as a script + CI step (mirror the OpenAPI-determinism gate's "regenerate and assert identical" shape)
- [x] **Task 4 — Forensic-microcopy / vocabulary / numeral lint set** (AC: 3, 5)
  - [x] Scaffold `scripts/microcopy/` with `check.ts` (impure: glob + fs read + `process.exit`), pure `lib.ts`, fixture `lib.test.ts`, `README.md` — clone the `scripts/benefit-mechanism/` shape
  - [x] Author a root config YAML (e.g. `microcopy.yaml`) holding the vocabulary register (prohibited→canonical), tone prohibitions, numeral-discipline rules, surface-scope globs, and an allow-list (internal/code-identifier exemptions — e.g. the "passbook row" CSS pattern name)
  - [x] Implement vocabulary + tone checks (c), numeral-discipline checks (d), magic-number token check (b / FM-14 #2); every finding names file+line+canonical replacement
  - [x] Declare the **bounded v1 admin-copy scope** in the config YAML (allow-listed `apps/admin` source/copy globs) so the gate has teeth now (FM-14 magic-number + admin vocabulary/tone), keeping member-surface checks forward-compat [Decision 2]; fix any real admin findings in-story, allow-list only genuine non-applicables, land green-with-teeth
  - [x] Add `microcopy:check` + `microcopy:test` to root `package.json`; add the `microcopy` job to `.github/workflows/ci.yml` mirroring `friction-budget`/`schema-diff`/`benefit-mechanism`
- [x] **Task 5 — Documentation + placeholder consumer proof** (AC: 4)
  - [x] Author `packages/tokens/README.md` (tokens, typography + FM-2 face substitution, numeral A2 split, vocabulary register, FM-14 governance, staged-tokens decision + Style-Dictionary trigger) with usage examples
  - [x] Prove `apps/admin` builds importing from `@twt/tokens`; run full `turbo build/typecheck/lint/test`
- [x] **Task 6 — Repo-wide green + ADR** (AC: all)
  - [x] `pnpm turbo run lint typecheck test build` green; `pnpm microcopy:test && pnpm microcopy:check` green
  - [x] Author an ADR for the design-system-foundation gate + the FM-1..FM-14 reconciliation (mirror `docs/adr/ADR-00xx-*` convention used by the sibling CI gates)
  - [x] Update `sprint-status.yaml` ledger comment per the project convention at completion

### Review Findings

- [x] [Review][Patch] Allow-list suppresses entire line — co-located violations on allow-listed lines are silently dropped [scripts/microcopy/lib.ts:308]
- [x] [Review][Patch] HEX_COLOR regex false-positives on 6-char hex anchor IDs (e.g. `href="#abcdef"`) [scripts/microcopy/lib.ts:410]
- [x] [Review][Patch] FUNCTIONAL_COLOR regex matches function names ending in `rgb`/`hsl` (e.g. `parseRgba(`) [scripts/microcopy/lib.ts:411]
- [x] [Review][Patch] Empty scope config produces silent false-green — no diagnostic when zero files are scanned [scripts/microcopy/lib.ts scope parsing]
- [x] [Review][Patch] `invoice` prohibited term absent from lib.test.ts SAMPLE_YAML fixture — AC3 "each prohibited-term hit" bar not met [scripts/microcopy/lib.test.ts]
- [x] [Review][Patch] `customer` and `donor` prohibited terms absent from lib.test.ts SAMPLE_YAML fixture [scripts/microcopy/lib.test.ts]
- [x] [Review][Patch] `accent_color` allow-list branch not covered by fixture tests [scripts/microcopy/lib.test.ts]
- [x] [Review][Defer] `resolveGlobs` walks entire repo on globs without a path prefix — latent CI-timeout risk [scripts/microcopy/check.ts:46-82] — deferred, latent until a short glob is added to config
- [x] [Review][Defer] `isCeremonial` rebuilds ceremonial-file set on every call — O(n) fs reads per file scanned [scripts/microcopy/check.ts:85-89] — deferred, latent until ceremonial globs are non-empty (Shradhanjali surface)
- [x] [Review][Defer] Pool-Reality regex `\d+\s*%\s+achieved` narrower than spec exemplar — digit-prefixed regex adequately meets spec intent; non-digit framing unrealistic in production copy [microcopy.yaml:819] — deferred, spec intent met

## Dev Notes

### ⚠️ Scope Decisions & Boundary Reconciliations (READ FIRST — these prevent the most likely failures)

1. **Tokens live in `packages/tokens` (`@twt/tokens`), NOT `packages/ui`.** The epic's prose says "`packages/ui` ships a token registry," but the architecture commits the package boundary explicitly: `packages/tokens/` is part of the **shared layer** [Source: architecture.md#4.1 (line 2478)], and `packages/ui/` is reserved for **composed components that know TWT-specific data shape** (Sahyog List, Yogdaan Bahi), *built on* platform-adapters + tokens + i18n, governed by the **second-consumer promotion rule** [Source: architecture.md#Component-layer boundary (lines 4459–4463)]. The UX spec names the token package `@twt/tokens` directly [Source: ux-design-specification.md#Design System Choice (lines 651, 750)]. **`packages/ui` stays a stub in this story** (no composed component meets the second-consumer rule yet). When the epic says "import from `packages/ui`," read **`@twt/tokens`**.

2. **"FM-1..FM-14 forensic-microcopy rules" is a label collision — reconcile, don't invent 14 rules.** In the **UX spec**, `FM-N` are **Failure-Mode hardening commitments** for the token/component system, and only **seven** exist: FM-1 (Tamagui escape valve), FM-2 (Devanagari validation gate), FM-3 (visual-discipline enforcement), FM-4 (token-sync CI gate), FM-5 (Devanagari-aware contrast), FM-6 (component governance), FM-14 (token-governance discipline) [Source: ux-design-specification.md#Design System Foundation (lines 631–632, 760–793)]. There is **no enumerated list of 14 "forensic-microcopy" rules** anywhere in the planning artifacts (verified by full-text search for "forensic"). The epic *re-purposes* the `FM-1..FM-14` label to mean "the microcopy/vocabulary/tone lint set" and illustrates it by example across the epic (prohibited terms `receipt`/`invoice`, scarcity/panic language, Pool-Reality comparison framing) [Source: epics.md lines 1374, 2782, 2883, 2984]. **Resolution baked into AC3:** build the lint set as a concrete CI gate enforcing (c) vocabulary, (d) numerals, and the *automatable* token-governance subset (FM-14 #2). The **non-automatable** UX-spec FMs are documented, **not faked**: FM-2/FM-5 (Devanagari rendering + contrast) are **empirical P0-2 device-validation outputs**, FM-6 is a **PR-review** process, FM-1 (Tamagui adapter) is native-stack and out of this story's scope. See the open question at the end — confirm the gate's name/identity.

3. **i18n numeral *utilities* are NOT in this story.** The UX spec lists `toHindiNumeral`/`toGregorianNumeral`/`formatCurrency` as `packages/i18n` utilities [Source: ux-design-specification.md lines 691–698], but the epic is explicit: **"i18n utility ships here in Story 2.1, not Epic 1"** [Source: epics.md line 1401]; `packages/i18n` is presently a stub. Story 1.17 ships the **numeral discipline (the rules + the lint that enforces them)**, not the runtime conversion functions. The lint's "inline numeral formatting outside the utility" rule can flag-by-policy now and tighten once Story 2.1 lands the utility.

4. **Do NOT introduce Style Dictionary.** v1 is a hand-rolled TS module by decision; Style-Dictionary migration triggers only at (a) second-Pariwar provisioning or (b) first non-TS consumer [Source: ux-design-specification.md lines 651, 665, 750]. Adding it now is the classic "scaffolding with no consumer" trap the UX spec explicitly warns against (OQ-UX-14).

5. **Tailwind is v4 CSS-first — there is no `tailwind.config.*`.** Admin configures Tailwind in CSS via `@theme` in `apps/admin/src/styles.css` [Source: apps/admin/src/styles.css header; verified no `tailwind.config.*` in repo]. The semantic CSS generator (AC2) therefore emits an `@theme` CSS-variable block, not a JS config object.

### Current state of files this story touches (read before editing)

- **`packages/tokens/`** — scaffolded stub (`src/index.ts` = `export {}` PR-1 placeholder; `tests/smoke.test.ts`; standard `package.json`/`tsconfig.json`/`eslint.config.js`/`vitest.config.ts`). Package name `@twt/tokens`, `type: module`, `main: ./src/index.ts`. **This is the home for AC1/AC2.** Preserve scaffold; replace the placeholder.
- **`packages/ui/`** — identical stub. **Leave as a stub** (see Scope Decision #1).
- **`packages/i18n/`** — identical stub. **Leave as a stub** (Scope Decision #3; Story 2.1 owns it).
- **`apps/admin/src/styles.css`** — Tailwind v4 CSS-first entry with an `@theme` block holding the **status palette** (`--color-status-ok-*`, `--color-status-fail-*`, `--color-status-muted-*`) chosen for AA contrast on the §4.10 integrity banners, plus a `prefers-reduced-motion` block. The header comment explicitly notes extraction into `packages/tokens` is deferred under **DD-1** "until a 2nd admin surface needs the same atoms." **This story is that extraction trigger.** Subsume these values into `@twt/tokens` and have admin consume the generated `@theme`. Do **not** change the contrast values; do **not** drop the reduced-motion block.
- **`apps/admin`** is React 19 + Vite 7 + Tailwind v4 + Radix + TanStack Router/Query; it is the only live web surface, so it is the natural placeholder consumer (AC4).

### Architecture compliance

- **Package layering** [Source: architecture.md#Component-layer boundary (4456–4463)]: `platform-adapters` (stateless, no data-shape) → `tokens`/`i18n` (shared) → `ui` (TWT data-shape). Tokens must not import upward.
- **`infra/` vs `packages/<config>/` rule** [Source: architecture.md (4479–4484)]: tokens are **consumed-by-build**, so they belong in `packages/`, not `infra/`. ✓
- **Frontend stack** [Source: architecture.md#4.1 (2466–2479)]: web consumers = admin (Vite+React+Tailwind+Radix) and future Astro `apps/public`; native = `apps/mobile` (Expo+RN+Tamagui). The token source must stay framework-neutral TS so both Tailwind `@theme` (web) and a future Tamagui theme (native) can consume it — keep the TS module free of web-only or RN-only imports.

### Token & typography specifics (from UX §6 / §8 / UX-DR9)

**Color tokens** [Source: ux-design-specification.md#Color System (line 1092); UX-DR9 (epics.md L382)]: `ink-primary`, `surface-base`, `surface-accent`, `rule-hairline`, `rule-heavy`, `stamp-mudra` (warm red), `status-pending` (yellow), `status-confirmed` (green), `status-mismatch` (warm umber), `status-grey-takeover`. Semantic names only (FM-14 #1). Specific palette values are **validation targets, not v1 commitments** — commit the semantic structure + AA-contrast discipline now; per-member-surface values firm up at P0-2 prototype (FM-5). Admin's already-committed status pairs are firm and carry over.

**Type-role tokens** [Source: UX-DR9 (epics.md L382); ux-design-specification.md Implementation Approach]: The five canonical type-role token names are **`display-name`**, **`display-parichay`**, **`body-ledger`**, **`numeric-tabular`**, **`caption-stamp`** — use exactly these names, no invented alternatives (FM-14 #1). Face mapping: `display-name` + `display-parichay` → Tiro Devanagari Hindi (serif display); `body-ledger` + `caption-stamp` → Noto Sans Devanagari (sans body); `numeric-tabular` → IBM Plex Mono Devanagari (monospace). Each token carries its Latin pairing. The **per-role per-device fallback ladder is a P0-2 output** (FM-2) — encode the faces + a documented substitution policy, not a frozen fallback chain. Exact type scale sizes are also placeholder until P0-2.

**Spacing tokens** [Source: UX-DR9 (epics.md L382)]: The four named tokens are **`space-hairline`**, **`space-row`**, **`space-block`**, **`space-page-gutter`** — discrete named set, not a free numeric scale. Pixel values are placeholder until P0-2 prototype commits them; the semantic names are the committed contract.

**Border tokens** [Source: UX-DR9 (epics.md L382)]: **`border-hairline`**, **`border-rule`**, **`border-double-rule`**, **`border-funeral-frame`**. Shadows do **not** exist as tokens — separation is hairline-based (FM-3); do not emit shadow utilities from the generator. Border thickness pixel values are also placeholder until P0-2.

**FM-14 token-governance (four rules)** [Source: lines 788–793]: (1) semantic role naming; (2) no magic numbers in component code (CI-lintable — AC3 (b)); (3) additions require a justifying comment; (4) deprecate before removal (compiled outputs retain deprecated tokens with warnings during the migration window).

### Numeral discipline — amendment A2 (this is subtle; get it exactly right)

[Source: ux-design-specification.md#Numeral handling (1119–1127) + #Operational vs Ceremonial (1303); epics references at 2883]

- **Operational register = Gregorian dates + Latin numerals.** Applies to: Sahyog List, **Yogdaan Bahi date + amount columns**, search/filter inputs, UTR/reference codes, all data tables, member directory, **and Panchayat Noticeboard including its FR-19 celebration framing** (₹ 45,88,000 / 14,800 / dates all Latin).
- **Ceremonial = Hindi numerals (०१२३४५६७८९) permitted, narrowly.** A2 + the v4 tightening **reserve Hindi numerals exclusively for memorial Devanagari prose on the Shradhanjali surface** (e.g. "३४ वर्षों की सेवा" inside narrative copy). **Standalone counts/amounts/dates render Latin even on memorial pages** ("14,800 सहयोगियों", "₹ 45,88,000", "Born: 1962 · Passed: 2026").
- **Never mixed at the same hierarchy level** within one row/label/stat-value.
- The earlier carve-outs (Hindi numerals on Yogdaan Bahi date columns; FR-19 pinned-notice framing) are **closed** — the lint must treat those as operational/Latin. Encode A2 as the authority; do not resurrect superseded drafts.

### Vocabulary register (canonical terminology — UX-DR71)

Canonical → prohibited mappings to seed the register [Source: epics.md lines 1374 (register examples), 80/620 (FR-33 "never receipt/invoice"), 2782 (Pool-Reality prohibited phrasings), 2883 (15-day tone-gradient scarcity/panic prohibition), 2984 ("Yogdaan Pratigya"/Contribution Note never "Receipt"/"Invoice"); UX-DR71 (epics.md L471 — member address + deceased member terminology)]:

- `passbook` → **Yogdaan Bahi** · `receipt`/`invoice` → **Contribution Note** (a.k.a. Yogdaan Pratigya) · `report` → **Sahyog Vivran**
- **Member address:** `user`/`customer`/`donor` → **colleague** / **सम्मानित साथी** (never "user", "customer", or "donor" in member-visible copy)
- **Deceased member:** `Late Teacher` → **Deceased Member** (canonical form; "Late Teacher" is explicitly forbidden in component spec — UX-DR71)
- **Tone prohibitions:** scarcity ("only N days left!"), panic ("URGENT"), and **Pool-Reality comparison-to-target** framing ("we fell short of…", "X% achieved", "target missed", "needed more contributions", "anonymous member" PII-leak phrasings handled elsewhere)
- **Allow-list / scope caution:** the lint scans **member-visible copy** (locale strings / templates / JSX text), **not** code internals. Note "passbook row" is an *internal CSS pattern name* in the UX spec (line 1156) and the word "passbook" appears as a gloss in the epics (`Yogdaan Bahi (passbook)`) — both must be allow-listed so the gate doesn't flag documentation/identifier usage. Define surface-scope globs + an explicit allow-list in the config YAML (mirror how `pii-scrape`/`benefit-mechanism` scope their inputs). This is the #1 false-positive risk — handle it deliberately.

### CI-gate pattern to clone (do not improvise a new shape)

The repo has four established repo-global gates: `friction-budget` (1.16a), `pii-scrape` (1.16b), `schema-diff` (1.16c), `benefit-mechanism` (1.16d). **Match their anatomy exactly** for the new `microcopy` gate:

- `scripts/<gate>/check.ts` — impure entrypoint (glob + fs read + `process.exit(1)` on findings) [Source: scripts/benefit-mechanism/check.ts, README.md]
- `scripts/<gate>/lib.ts` — **pure, importable** core (config parse + checks + extractors), unit-tested
- `scripts/<gate>/lib.test.ts` — fixture-driven tests via `vitest run`
- `scripts/<gate>/README.md` — authority citations + per-check teeth table (which checks bite now vs no-op until a future epic — here, numeral/inline-format checks largely no-op until member surfaces + i18n exist, like benefit-mechanism's "no-op until Epic 2")
- a **root config YAML** (e.g. `microcopy.yaml`) — versioned register/rules
- root `package.json` scripts `<gate>:check` + `<gate>:test` (see existing `friction:*`/`schema:*`/`benefit:*`)
- a `.github/workflows/ci.yml` job named `microcopy`, structured like the `friction-budget`/`schema-diff`/`benefit-mechanism` jobs (lines 201–269): `pnpm install --frozen-lockfile` → `pnpm microcopy:test` → `pnpm microcopy:check`
- if you add a `turbo` task, follow the `contracts:check-pii-scrape` inputs-pinning convention in `turbo.json`
- `yaml` (the YAML parser) is already a root `devDependency` (`"yaml": "^2.6.1"` in root `package.json`) — do NOT add it again; import as `import { parse as parseYaml } from 'yaml'` exactly like the sibling gates

**Finding contract:** every finding names the offending file + line + the canonical replacement — mirror benefit-mechanism's "name the offending rule (clause id / source file + line)".

### Previous-story intelligence

- **Story 1.16a–d (the four sibling CI gates)** established the exact gate anatomy above. 1.16d most recently hardened a parser to be **strict on unknown YAML keys** and to handle multi-row/schema-qualified inputs — adopt the same "strict parse, fixture every edge" rigor for `microcopy.yaml` [Source: sprint-status.yaml `last_updated` ledger top entry].
- **Story 1.11b (DD-1)** is the direct upstream: it put admin tokens inline in `styles.css @theme` and **deferred** `packages/ui`+`packages/tokens` extraction to "a 2nd admin surface" [Source: deferred-work.md line 227, D4-1.11b]. This story supersedes that deferral's trigger.
- **Story 1.9 (DD)** shipped admin **API-first** and explicitly slated the admin login UI + admin chrome to land **with the design-system foundation, post-1.17** [Source: deferred-work.md lines 293, 297]. So 1.17 is the gating dependency for the first real admin UI — keep the token API clean and documented for that immediate next consumer.
- **Stories 0.10 / 0.11** flagged 1.17 as a **secondary consumer** of their accessibility-grammar + register-grammar findings (Hindi-Devanagari AT grammar, ≥56pt critical touch targets, operator-register discipline) — these *inform* token + lint authoring but do **not** gate this story [Source: deferred-work.md lines 615, 647].

### Project structure / conventions

- Shared `@twt/eslint-config-twt` runs **per-package** (`eslint .` per workspace); any rule carve-outs use **cwd-relative role globs** (`**/db.ts`), not package-path globs — verify lint per package with `pnpm --filter @twt/tokens lint` [per project memory: eslint-config-per-package-cwd].
- Sprint-status ledger: flip `development_status[1-17-…]`; `last_updated` is a top-of-file reverse-chron **COMMENT** ledger — add one combined entry at completion [per project memory: sprint-status-ledger-convention].
- Commit manually (branch + selective stage); do not use the `commit-story` helper [per project memory: story-automator-ops].
- TS strict mode is on at root; Node ≥22.12; pnpm 10.30.x; vitest is the test runner; tsx runs the gate scripts.

### Latest-tech notes

- **Tailwind v4** is configured **CSS-first** (`@import 'tailwindcss'` + `@theme {}`); there is no JS config. The generator emits CSS custom properties inside `@theme`. (Verified: no `tailwind.config.*` exists.)
- **Faces** (Tiro Devanagari Hindi, Noto Sans Devanagari, IBM Plex Mono Devanagari) are Google-Fonts-available; this story registers the **role→face mapping**, not font loading/bundling (that lands with the consuming surface). Keep face references as named tokens.

### Testing standards

- Unit-test the token module (shape, required semantic aliases present, no `color-N` slug invariant) under `packages/tokens/tests/` via `vitest run`.
- Fixture-test the lint `lib.ts` under `scripts/microcopy/lib.test.ts` — cover: each prohibited-term hit, each tone prohibition, numeral operational-vs-ceremonial cases, the magic-number check, **and the allow-list false-positive cases** (`passbook row`, the `(passbook)` gloss).
- Regression-test admin: re-run `apps/admin/tests/integrity-page.test.tsx` after the `@theme` subsumption to prove no banner contrast/visual regression.
- Determinism-test the generator: regenerate `@theme` and assert byte-identical to the committed artifact (the FM-4 sync check is itself the test).
- Repo gate: `pnpm turbo run lint typecheck test build` green; `pnpm microcopy:test && pnpm microcopy:check` green.

### Project context reference

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.17 (lines 1364–1382); Epic 1 header (968–984)]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.1 Frontend stack (2466–2479); #Component-layer boundary (4454–4467)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation (615–793: FM-1..FM-14, staged tokens); #Color System (1076–1100); #Typography System (1102–1160); #Numeral handling + A2 (1119–1127, 1303)]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md D4-1.11b (227), D4-1.9 (293), 0.10/0.11 consumers (615, 647)]
- [Source: scripts/benefit-mechanism/ (README.md, check.ts, lib.ts, lib.test.ts); .github/workflows/ci.yml (201–269); turbo.json; root package.json scripts]

### References

- epics.md L1364–1382 (Story 1.17 statement + ACs), L1401 (i18n ships in 2.1 not Epic 1), L1374/2782/2883/2984 (vocabulary + tone prohibitions)
- architecture.md L2478 (tokens in shared layer), L4459–4463 (`packages/ui` = composed components, second-consumer rule), L4479–4484 (consumed-by-build → `packages/`)
- ux-design-specification.md L651/665/750 (staged tokens, `@twt/tokens`, Style-Dictionary trigger), L760–793 (FM-1..FM-6 + FM-14), L1092 (semantic color map), L1129 (typography faces + FM-2), L1119–1127/1303 (numeral A2)
- deferred-work.md L227 (D4-1.11b extraction trigger), L293/297 (admin UI post-1.17)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8), via the bmad-dev-story workflow.

### Debug Log References

- `pnpm --filter @twt/tokens test` → 20/20 (token shape + semantic-name invariant + renderThemeCss).
- `pnpm microcopy:test` → 34/34 (parser + 4 checks + allow-list + formatFinding).
- Teeth probe (temp `apps/admin/src/__microcopy_teeth_probe.tsx` with `#abc123` + `receipt` + Devanagari `४५`): `pnpm microcopy:check` → exit 1 naming all three findings (file:line + canonical fix); probe removed → exit 0; tree clean.
- `pnpm exec tsx packages/tokens/scripts/check-theme-determinism.ts` → in sync (FM-4); `pnpm tokens:check-theme` (turbo) → 1/1.
- `pnpm --filter @twt/admin build` → `vite build` resolves `@import '@twt/tokens/theme.css'` (370 modules); compiled CSS bundle carries the subsumed status palette (`#e7f6ec`/`#842029`/`#198754`/`#374151`).
- `pnpm turbo run lint typecheck test build` → 65/65 green. `pnpm install --frozen-lockfile` → clean. `contracts:check-openapi-determinism` → byte-identical. `benefit:check` / `schema:check` → green (unaffected).

### Completion Notes List

- **AC1 — token registry.** `@twt/tokens` now ships `src/tokens.ts` (color §8 semantic aliases + general aliases + the FIRM subsumed admin status palette; the five UX-DR9 type-role faces + Latin pairings; four named spacing tokens; four border tokens, no shadow per FM-3). Semantic-name-only invariant (FM-14 #1) + per-group purpose comments (FM-14 #3) unit-tested. Per-surface px values are P0-2 targets (placeholder); the admin status pairs + 1px hairlines are firm. The admin `@theme` status palette is subsumed with no §4.10 contrast regression (integrity-page tests green; values present in the compiled bundle).
- **AC2 — generator + sync.** Pure `renderThemeCss()` (`src/theme.ts`) → committed `src/theme.css` (Tailwind v4 `@theme`; colors `--color-*`, faces `--font-*`, named spacing/border verbatim `--space-*`/`--border-*`; no shadow var). `scripts/generate-theme.ts` writes it; `scripts/check-theme-determinism.ts` byte-compares (read-only). Wired as the `tokens:check-theme-determinism` turbo task + the `tokens-theme-check` ci.yml job. Admin `@import`s `@twt/tokens/theme.css` via a package `exports` subpath.
- **AC3 — microcopy gate.** `scripts/microcopy/` (pure `lib.ts` + impure `check.ts` + 34 fixtures + README) + root `microcopy.yaml` + root `microcopy:check`/`microcopy:test` + the `microcopy` ci.yml job. Enforces (b) FM-14 #2 magic-number colors + (c) vocabulary register + tone prohibitions + (d) amendment-A2 numeral discipline; every finding names file+line+canonical replacement. Green-with-teeth over the bounded `apps/admin` slice (18 files); member-address terms + numerals forward-compat via empty `copy_globs`; allow-list scopes out the brand-color form DATA + the `passbook row` pattern name + the `(passbook)` gloss (each with a reason). Strict loud-throw parser.
- **AC4 — docs + consumer.** `packages/tokens/README.md` documents tokens, the FM-2 face-substitution policy, the A2 numeral split, the vocabulary register, the FM-14 rules, and the staged-tokens (→ Style Dictionary) trigger with usage examples. `apps/admin` is the proven placeholder consumer (`vite build` green); full `turbo build/typecheck/lint/test` green.
- **AC5 — land-once / consume-everywhere.** Future surfaces inherit by importing `@twt/tokens` (no re-defined primitives); the `microcopy` gate triggers repo-wide at PR time (a `microcopy` ci.yml job).
- **Reconciliations honored:** tokens home = `packages/tokens` (not `packages/ui`, which stays a stub under the second-consumer rule); "FM-1..FM-14 forensic-microcopy rules" = the seven UX-spec Failure-Mode commitments (ADR-0016 records the mapping; the gate realizes the automatable subset); i18n numeral utilities = Story 2.1 (this story ships the discipline, not the runtime fns); Style Dictionary NOT introduced; Tailwind v4 CSS-first (generator emits `@theme`, no `tailwind.config.*`).
- **Governance:** ADR-0016 authored (drafted); adr-index updated (drafted 12→13 / total 133→134 / Section A 34→35 + provenance note + row). deferred-work.md "Story 1.17 — resolutions + new deferrals" section added; D4-1.11b `packages/tokens` leg Closed (annotated inline), `packages/ui` leg deferred. No new DB migration. New runtime dependency: admin gains `@twt/tokens` (workspace); `tsx` added to `@twt/tokens` devDeps (lockfile updated).
- **Decisions honored:** Decision 1 (gate name `scripts/microcopy/`) + Decision 2 (forward-compat + bounded admin scan = green-with-teeth) — both LOCKED, implemented as specified.

### File List

**Added**
- `packages/tokens/src/tokens.ts`
- `packages/tokens/src/theme.ts`
- `packages/tokens/src/theme.css` (generated, committed)
- `packages/tokens/scripts/generate-theme.ts`
- `packages/tokens/scripts/check-theme-determinism.ts`
- `packages/tokens/tests/tokens.test.ts`
- `packages/tokens/README.md`
- `scripts/microcopy/lib.ts`
- `scripts/microcopy/check.ts`
- `scripts/microcopy/lib.test.ts`
- `scripts/microcopy/README.md`
- `microcopy.yaml`
- `docs/adr/ADR-0016-design-system-foundation-microcopy-gate.md`

**Modified**
- `packages/tokens/src/index.ts` (PR-1 placeholder → barrel export of tokens + renderThemeCss)
- `packages/tokens/package.json` (`exports` map for `./theme.css`; `tokens:generate-theme` + `tokens:check-theme-determinism` scripts; `tsx` devDep)
- `apps/admin/src/styles.css` (inline `@theme` subsumed → `@import '@twt/tokens/theme.css'`; reduced-motion block kept)
- `apps/admin/package.json` (`@twt/tokens` workspace dependency)
- `package.json` (root `tokens:check-theme`, `tokens:generate-theme`, `microcopy:check`, `microcopy:test` scripts)
- `turbo.json` (`tokens:check-theme-determinism` task with pinned inputs)
- `.github/workflows/ci.yml` (`tokens-theme-check` + `microcopy` jobs)
- `docs/knowledge-transfer/adr-index.md` (ADR-0016 row + counts + provenance note)
- `_bmad-output/implementation-artifacts/deferred-work.md` ("Story 1.17 — resolutions" section + D4-1.11b inline annotation)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (1-17 → review + ledger comment)
- `pnpm-lock.yaml` (admin → `@twt/tokens` link; `@twt/tokens` → `tsx`)

## Change Log

| Date | Change |
|---|---|
| 2026-06-16 | Story 1.17 implemented (Tasks 1–6 / AC1–AC5): `@twt/tokens` registry + Tailwind v4 `@theme` generator (FM-4 sync gate) + admin `@theme` subsumption (DD-1/D4-1.11b trigger, no §4.10 regression) + the `scripts/microcopy/` vocabulary/numeral/FM-14 CI gate (green-with-teeth). ADR-0016 authored; adr-index + deferred-work updated. Repo-wide `turbo lint/typecheck/test/build` 65/65 + all gates green. Status → review. |

## Decisions (locked by BigDev at create-story — no open forks remain)

1. **Gate identity/name → `scripts/microcopy/` [LOCKED].** Deliverable (b) ships as a `scripts/microcopy/` CI gate (vocabulary + numeral + FM-14 token-governance subset), reconciling the epic's "FM-1..FM-14 forensic-microcopy rules" against the UX spec's seven Failure-Mode commitments (token/component hardening, not microcopy). The name `microcopy` stands; the ADR (Task 6) records the FM-1..FM-14 reconciliation so the epic's cross-references in Stories 2.2 / 8.x resolve to this gate.
2. **v1 enforcement footprint → forward-compat guard + bounded admin scan [LOCKED].** Forward-compat is the primary goal, **but the gate is not entirely no-op at v1**: it scans a small **allow-listed `apps/admin` copy footprint** now (see AC3 final clause + Task 4) so the FM-14 magic-number check and admin vocabulary/tone checks have real teeth on day one. Broad member-surface vocabulary/numeral checks remain forward-compat until member surfaces land (Epic 2+). Land green-with-teeth: fix real admin findings in-story; allow-list only genuine non-applicables.
