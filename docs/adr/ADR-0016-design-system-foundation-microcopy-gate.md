# ADR-0016: Design-system foundation — hand-rolled `@twt/tokens` registry + Tailwind v4 `@theme` generator (FM-4 sync gate) + the `microcopy` vocabulary/numeral/FM-14 CI gate, with the FM-1..FM-14 reconciliation

> **Status:** drafted
> **Date:** 2026-06-16 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.17 closure
> **Ratifying trustees:** <pending; populated at `ratified` status>
> **Supersedes:** —
> **Superseded by:** —

## Context

UX-DR7–UX-DR12 (design-system foundation: tokens + typography) + UX-DR71 (vocabulary
discipline) + UX-DR73 (numeral discipline) commit a **land-once / consume-everywhere**
design system that must exist **before** any member-visible surface is built (Epic 2+),
so it is not re-litigated per surface. Story 1.17 is the control that lands it. It is the
**first non-governance Epic-1 story** after the 1.16a–d CI-gate cluster, and it reuses
that cluster's gate anatomy for its lint deliverable.

Per [[feedback_architecture_vs_adr_boundary]], the architecture commits the *properties*
(tokens are a shared-layer package; the token source is framework-neutral; separation is
hairline-based; the numeral register is operational-vs-ceremonial); this ADR records the
*controls* chosen to realize them. The forcing conditions / reconciliations:

- **Tokens live in `packages/tokens` (`@twt/tokens`), NOT `packages/ui`** (the #1 epic
  phrasing correction). The epic prose says "`packages/ui` ships a token registry," but
  architecture §4.1 (L2478) puts `tokens` in the **shared layer** and
  §Component-layer-boundary (L4459-4463) reserves `packages/ui` for **TWT-data-shape
  composed components** (Sahyog List, Yogdaan Bahi) under the **second-consumer promotion
  rule** — unmet today. UX spec L651/750 names the package `@twt/tokens`. So `packages/ui`
  **stays a stub** this story.
- **"FM-1..FM-14 forensic-microcopy rules" is a label collision** (the #2 correction).
  In the **UX spec**, `FM-N` are **seven Failure-Mode HARDENING commitments** for the
  token/component system, NOT 14 microcopy rules: FM-1 (Tamagui escape valve), FM-2
  (Devanagari validation gate), FM-3 (visual-discipline / hairline separation), FM-4
  (token-sync CI gate), FM-5 (Devanagari-aware contrast), FM-6 (component governance),
  FM-14 (token-governance discipline) [UX spec L760-793]. A full-text search for
  "forensic" matches **only** the Story 1.17 epic lines — there is no enumerated list of
  14 rules anywhere. The epic *re-purposes* the `FM-1..FM-14` label to mean "the
  microcopy/vocabulary/tone lint set." **Resolution** (Decision 5 below): build the
  **automatable** subset as a concrete CI gate; document the **non-automatable** FMs
  rather than fake them.
- **i18n numeral *utilities* are NOT in this story.** `toHindiNumeral` /
  `toGregorianNumeral` / `formatCurrency` are `packages/i18n` utilities that ship at
  **Story 2.1** (epics L1401: "i18n utility ships here in Story 2.1, not Epic 1");
  `packages/i18n` is a stub. 1.17 ships the numeral **discipline** (rules + lint), not the
  runtime conversion functions.
- **Do NOT introduce Style Dictionary.** v1 is a hand-rolled TS module by decision;
  migration triggers only at second-Pariwar provisioning OR the first non-TS consumer
  (UX spec L651/665/750). Adding it now is the "scaffolding with no consumer" trap
  (OQ-UX-14).
- **Tailwind is v4 CSS-first — there is no `tailwind.config.*`.** Admin configures Tailwind
  in CSS via `@theme`. The generator therefore emits an `@theme` CSS-variable block, not a
  JS config object.

Two decisions were **locked** by BigDev at create-story (no open forks): (1) the gate name
is `scripts/microcopy/` and the ADR records the FM reconciliation so the epic's
cross-references in Stories 2.2 / 8.x resolve to this gate; (2) the v1 enforcement
footprint is forward-compat **plus** a bounded allow-listed `apps/admin` scan (green-with-teeth,
not entirely no-op).

## Decision

### 1. Ship a hand-rolled TS token registry `@twt/tokens` (color / spacing / typography / border)

`packages/tokens/src/tokens.ts` exports four token groups as `as const … satisfies
Record<string,string>`: **color** (the §8 semantic role aliases `ink-primary` /
`surface-base` / `surface-accent` / `rule-hairline` / `rule-heavy` / `stamp-mudra` /
`status-pending` / `status-confirmed` / `status-mismatch` / `status-grey-takeover` +
general aliases `bg`/`surface`/`text`/`accent`/`danger`/`success`/`warning` + the FIRM
admin status palette), **font** (the five UX-DR9 type-role tokens `display-name` /
`display-parichay` / `body-ledger` / `numeric-tabular` / `caption-stamp`, each mapped to
its canonical Devanagari face + a Latin pairing), **space** (the four UX-DR9 named tokens
`space-hairline` / `space-row` / `space-block` / `space-page-gutter` — a discrete named
set, not a numeric scale), and **border** (`border-hairline` / `border-rule` /
`border-double-rule` / `border-funeral-frame` — **no shadow token**, FM-3). The module is
framework-neutral (no web-only/RN-only imports) so both the Tailwind `@theme` artifact and
a future Tamagui theme consume it (FM-1). FM-14 #1 (semantic names — enforced by a
`/^[a-z]+(-[a-z]+)*$/` unit-test invariant; no `color-1`) + #3 (per-group purpose
comments). **Values policy:** per-member-surface color/spacing/border pixel values are
**P0-2 validation targets, not v1 commitments** (FM-5); the **firm** exceptions are the
subsumed admin status palette + the 1px hairline primitives. The package README documents
the typography role-faces + the **FM-2 substitution policy** (face + policy committed; the
per-device fallback ladder is a P0-2 output), the numeral A2 split, the vocabulary
register, the FM-14 rules, and the staged-tokens (→ Style Dictionary) trigger.

### 2. Semantic CSS generator → committed `theme.css`, with an FM-4 determinism gate

`src/theme.ts` exposes a **pure** `renderThemeCss()` that deterministically renders the TS
source into a Tailwind v4 `@theme` block (colors under `--color-*` so `bg-*`/`text-*`/`border-*`
utilities generate; faces under `--font-*`; the UX-DR9 named spacing/border tokens emitted
**verbatim** as `--space-*` / `--border-*` since they are consumed via `var(--space-row)`,
not Tailwind's numeric scale; **no shadow variable**, FM-3). `scripts/generate-theme.ts`
writes the committed `src/theme.css`; `scripts/check-theme-determinism.ts` re-renders and
**byte-compares** (read-only; never mutates the tree) — the "regenerate and assert
identical" shape of the OpenAPI-determinism gate. Wired as the `tokens:check-theme-determinism`
turbo task (inputs pinned) + a dedicated `tokens-theme-check` CI job (mirrors
`contracts-check`). FM-4: the TS source is canonical, the compiled output is tracked.

### 3. Subsume admin's DD-1 inline `@theme` (the D4-1.11b extraction trigger)

The previously-inline `apps/admin/src/styles.css` `@theme` status palette
(`--color-status-ok-*` / `-fail-*` / `-muted-*`, the §4.10 AA-contrast integrity-banner
pairs) moves **into** `@twt/tokens` unchanged (same names, same values), and admin now
`@import 's the generated `@twt/tokens/theme.css` (a `package.json` `exports` subpath;
admin gains a `@twt/tokens` workspace dependency). **No visual/contrast regression** — the
compiled admin CSS bundle still carries the exact pairs (verified via `vite build` +
grep), and the integrity-page banner tests (`tests/integrity-page.test.tsx`) stay green.
This is the design-system-foundation extraction the DD-1 deferral predicted — Story 1.17
**is** the trigger, NOT a second admin surface — so D4-1.11b's `packages/tokens` leg is
**Closed**; its `packages/ui` leg stays deferred (Decision 6).

### 4. The `microcopy` CI gate — deliverables (b) + (c) + (d)

`scripts/microcopy/` clones the 1.16a-d anatomy (impure `check.ts` + pure importable
`lib.ts` + fixture `lib.test.ts` + README + a root `microcopy.yaml` config + root
`microcopy:check`/`microcopy:test` + a `microcopy` ci.yml job). The pure core runs four
fixture-tested checks, each naming **file + line + the canonical replacement**:
**(c) vocabulary** (prohibited member-visible term → canonical: `passbook`→Yogdaan Bahi,
`receipt`/`invoice`→Contribution Note, `report`→Sahyog Vivran, + member-address
`user`/`customer`/`donor`→colleague/सम्मानित साथी + `Late Teacher`→Deceased Member);
**tone** (scarcity / panic / Pool-Reality comparison-to-target); **(d) numerals**
(Devanagari digits on operational surfaces + inline Hindi/Devanagari locale formatting that
must route through the future `packages/i18n` utility — amendment A2); **(b) FM-14 #2**
(hardcoded color literals in component code). A strict `parseMicrocopyConfig` throws on any
malformed entry (the 1.16d rigor). An **allow-list** (regex + optional file scope, each with
a reason) suppresses genuine non-applicables.

**v1 footprint [Decision 2, LOCKED] — green-with-teeth, not vacuous.** `scope.code_globs`
is a bounded `apps/admin/src/**` slice (18 live files), so the **FM-14 magic-number color
check** + the **active vocabulary nouns** + **tone** have real teeth on day one over live
React components; teeth are proven end-to-end (a probe with a `#abc123` literal + `receipt`
+ a Devanagari numeral → exit 1 naming each; removed → exit 0). The **broad member-surface**
register (the member-address terms, scoped to `copy_globs`) + the **numeral checks** stay
forward-compat until member surfaces land (Epic 2+; `copy_globs` empty at v1) — teeth grow
surface-by-surface, data-driven, with no gate code change (the `benefit-mechanism` /
`pii-scrape` precedent). **Why color-only for FM-14 at v1:** color is the token facet with
committed values; the spacing/border/font px-literal facet is forward-compat because those
token values are placeholder until P0-2 — it would be incoherent to demand replacing px
literals with tokens that have no px yet. **Why member-address terms are copy-scope-only:**
`user` is a ubiquitous code identifier; scanning admin `.ts/.tsx` for it would be a
false-positive storm. **Mechanism:** repo-global → repo-root `scripts/` (NOT a turbo
task; `scripts/` is not a workspace so CI runs `microcopy:test` then `microcopy:check`);
**INVARIANT SCAN of the declared scope, NOT a git-diff → NO `fetch-depth: 0`** (mirror
`schema-diff`/`benefit-mechanism`). Precision-scoping is the self-green invariant: the gate
reads ONLY the declared globs, never docs/`_bmad-output`/`*.md`/`sprint-status.yaml`/its own
dir/the config — so the prohibited terms in this gate's own fixtures/README/config are not
findings.

**Calibrated to green-on-introduction.** Real admin findings were fixed; only genuine
non-applicables are allow-listed (each with a reason): the Pariwar **brand-color form
defaults** (`brandingBundle.*_color` — tenant DATA, not styling), the internal `passbook
row` CSS pattern name, and the `Yogdaan Bahi (passbook)` documentation gloss (the #1
false-positive risk, fixture-tested).

### 5. The FM-1..FM-14 reconciliation (recorded so cross-refs resolve)

The seven UX-spec Failure-Mode commitments map as follows, so the epic's `FM-1..FM-14`
cross-references in Stories 2.2 / 8.x resolve to the right artifact:

| FM   | Commitment                          | Where it lands                                                            |
| ---- | ----------------------------------- | ------------------------------------------------------------------------ |
| FM-1 | Tamagui escape valve                | native stack (`apps/mobile`); out of this story's scope                   |
| FM-2 | Devanagari validation / faces       | `@twt/tokens` face mapping + documented substitution policy; ladder = P0-2 |
| FM-3 | Visual discipline (hairline, no shadow) | `@twt/tokens` (no shadow token) + generator (no shadow var)          |
| FM-4 | Token-sync CI gate                  | `tokens:check-theme-determinism` (Decision 2)                            |
| FM-5 | Devanagari-aware contrast           | empirical P0-2 device validation; v1 commits AA-contrast discipline + firm admin pairs |
| FM-6 | Component governance                | a PR-review process (not a lint)                                          |
| FM-14 | Token governance                   | #1/#3 in `@twt/tokens` (semantic names + comments, unit-tested); #2 magic-number check in the `microcopy` gate; #4 deprecate-before-remove policy (README) |

### 6. `packages/ui` stays a stub

No composed component meets the second-consumer promotion rule (architecture L4459-4463),
so `packages/ui` is not populated. The `packages/ui` leg of D4-1.11b stays deferred
(re-trigger: a second consumer needs the same composed component).

## Alternatives considered

- **Put tokens in `packages/ui` (literal epic reading)** — Rejected: violates the
  architecture's shared-layer/composed-component boundary + the second-consumer rule.
- **Invent 14 "forensic-microcopy" rules** — Rejected: no such list exists; it would
  fabricate authority. The reconciliation maps the label to the seven real UX-spec FMs and
  builds the automatable subset (Decision 5).
- **Introduce Style Dictionary now** — Rejected: no non-TS consumer + single Pariwar →
  the "scaffolding with no consumer" trap (OQ-UX-14). Hand-rolled TS until a trigger fires.
- **Make the gate a pure forward-compat no-op (member surfaces only)** — Rejected: misses
  the green-with-teeth bar. Scanning the live admin slice gives the FM-14 + vocabulary/tone
  checks real teeth on day one (Decision 4 / Decision 2-LOCKED).
- **Include `user`/spacing-px in the v1 checks** — Rejected: `user` storms on code
  identifiers (scoped to member copy instead); spacing-px replacement is incoherent while
  the spacing tokens are placeholder (forward-compat to P0-2).
- **A `packages/tokens` turbo task for the microcopy gate** — Rejected: the gate is
  repo-global (a root config + a cross-app copy/component scan), so it lands at the repo
  root in `scripts/` (the 1.16a/c/d precedent). The **theme-sync** gate, by contrast, IS a
  single-workspace artifact → a `packages/tokens` turbo task (the OpenAPI-determinism
  precedent).
- **Base-ref git-diff (`fetch-depth: 0`) for the microcopy gate** — Rejected: the invariant
  is "the current copy/component scope is clean," which a whole-state scan asserts more
  robustly than a diff. Mirroring `friction-budget`'s `fetch-depth: 0` would be
  cargo-culting.

## Consequences

- **Operational** — Two new CI jobs (`tokens-theme-check`, `microcopy`) run on every PR,
  parallel with the other gates, on the default shallow checkout. Admin gains a
  `@twt/tokens` dependency (the lockfile updates). The `microcopy` gate is green-with-teeth
  today and begins enforcing the full register the moment Epic 2+ populates `copy_globs`
  (no gate code change).
- **Design system** — Every future surface inherits the design system by importing
  `@twt/tokens` (AC5); the `microcopy` gate runs on its copy at PR time (CI triggers
  repo-wide). The token API is clean + documented for the immediate next consumer (the
  admin login UI + admin chrome, D4-1.9, lands post-1.17).
- **Security / governance** — Both gates are read-only (fs reads + a pure render); no new
  secrets. The vocabulary/numeral gate is a member-trust-language enforcement seam.
- **Performance / cost** — Negligible (a short tsx run + a 34-test vitest run + a pure
  re-render per PR).
- **Failure modes accepted** — The FM-14 magic-number check is **color-only** at v1
  (spacing/border/font px-literals deferred to P0-2); the member-address vocabulary + the
  numeral checks are **forward-compat** (no member surface yet). The `microcopy` engine is
  a line-based regex scanner (not a JSX/AST parser) — adequate for the declared scope +
  allow-list; an AST-based copy extractor is a future tightening if false-positives emerge.
- **Migration / pivot path** — Style Dictionary is admitted only at second-Pariwar
  provisioning OR the first non-TS consumer (never now). `packages/ui` populates at the
  second-consumer promotion rule.

## References

- [Source: ux-design-specification.md §Design System Foundation L615-793 (FM-1..FM-14, staged tokens, `@twt/tokens` name); §Color System L1076-1100; §Typography System L1102-1160 (faces + FM-2); §Numeral handling + A2 L1119-1127/L1303]
- [Source: architecture.md §4.1 Frontend stack L2466-2479 (tokens in shared layer, framework-neutral); §Component-layer-boundary L4456-4467 (packages/ui = composed components, second-consumer rule); L4479-4484 (consumed-by-build → packages/)]
- [Source: epics.md Story 1.17 L1364-1382; L1401 (i18n ships Story 2.1, not Epic 1); L1374/2782/2883/2984 (vocabulary register + tone prohibitions)]
- [Source: packages/tokens/{src/tokens.ts,src/theme.ts,src/index.ts,src/theme.css,scripts/*,tests/tokens.test.ts,README.md}] — the token registry + generator + FM-4 gate authored by this story
- [Source: microcopy.yaml + scripts/microcopy/{lib.ts,check.ts,lib.test.ts,README.md}] — the vocabulary/numeral/FM-14 gate authored by this story
- [Source: .github/workflows/ci.yml — `tokens-theme-check` + `microcopy` jobs; turbo.json — `tokens:check-theme-determinism`; package.json — root scripts]
- [Source: apps/admin/src/styles.css + apps/admin/package.json] — the DD-1 `@theme` subsumption + the `@twt/tokens` consumer wiring (AC4 placeholder consumer)
- [Source: scripts/benefit-mechanism/ + ADR-0015; packages/contracts/scripts/check-openapi-determinism.ts + ADR-0005] — the cloned gate anatomy + the determinism-gate precedent
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — D4-1.11b (`packages/tokens` leg Closed, `packages/ui` leg deferred) + "Story 1.17 — resolutions + new deferrals"; D4-1.9 (admin UI post-1.17, cross-ref)
- [Source: _bmad-output/implementation-artifacts/1-17-design-system-foundation-tokens-typography-vocabulary-numeral-hardening.md] — owning Story
- Memory: [[feedback_architecture_vs_adr_boundary]] — property vs control discipline
- Memory: [[feedback_closure_language_precision]] — Closed-by-edit vs Resolved-via-explicit-deferral

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-16 | (initial draft) | Solo Builder (BigDev) | Authored under Story 1.17 (design-system foundation — tokens + theme generator + microcopy gate) closure |
