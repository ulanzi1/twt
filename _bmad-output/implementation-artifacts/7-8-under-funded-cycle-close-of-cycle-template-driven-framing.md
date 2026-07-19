---
baseline_commit: 97518bfb2f527904730ebf6245441ff4669dc078
---

# Story 7.8: Under-Funded Cycle Close-of-Cycle Template-Driven Framing (Pool-Reality #1 + #2)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **a Solo Builder authoring the close-of-cycle messaging policy** (the governance layer Epic 8's Panchayat Noticeboard and Epic 11b's Sahyog Vivran render from),
I want **a template-driven close-of-cycle framing set — bilingual (Hindi-primary) outcome templates that celebrate the *actual* delivered outcome and contributor solidarity (Pool-Reality #1), a pure outcome→template selection policy that structurally can never surface a comparison-to-target frame, and the automated `microcopy` tone gate + human tone-review both given teeth over the new copy so any comparison-to-target phrasing (Pool-Reality #2) is blocked at PR time or review time**,
so that **every cycle close — most importantly an under-funded one, which correlates with grief — reads as dignified solidarity ("the family received ₹X, given by N colleagues"), never as a shortfall narrative ("we fell short of the target / X% achieved"), by construction and enforced by CI, not by reviewer memory**.

## Context & Scope (read this first)

This story is `[GOVERNANCE]`. Its deliverable is **not** a rendered screen — it is the **copy policy + the executable framing seam + the enforcement teeth** that downstream consumers (Epic 8 Noticeboard, Epic 11b Sahyog Vivran, Story 8.9 calendar-aware timing) obey. It follows the same **primitive/consumer seam discipline** as 7.6/7.7: it commits the i18n templates + a pure domain policy + governance wiring; it does **not** build the surfaces that render them, nor the reconciliation that computes the numbers they interpolate.

The governance sits on **two already-built layers** — 7.8 extends both to cover the new surface, it does **not** invent a new enforcement mechanism:

1. **Automated floor** — the Story 1.17 `microcopy` CI gate (`scripts/microcopy/` + root `microcopy.yaml`). It already carries a `pool-reality-comparison` tone rule (`microcopy.yaml` L60-61). 7.8 brings the new copy files **into scope** (`scope.copy_globs`) and **proves teeth** (a planted-violation test + revert-sanity), per [[feedback_gate_scope_semantic_coverage]].
2. **Human ceiling** — the Story 2.2 tone-review publish gate (`packages/domain/src/tone-review/` + `docs/tone-guide.md` + `docs/tone-review-checklist.md`). The tone-guide §3 **already** lists the Pool-Reality #2 prohibited frame. 7.8 registers close-of-cycle as a **governed surface** in the checklist's Publish-routing table; the runtime sign-off enforcement lands in the consuming story (Epic 8 / 11b), per the established "its owning story" pattern.

| Belongs to 7.8 (this story) | Deferred — reserved seam |
|---|---|
| The **close-of-cycle template catalog** — a new `close-of-cycle` i18n namespace (`packages/i18n/locales/{en,hi}/close-of-cycle.json`), registered in `catalog.ts`, with the three outcome families (`fully_funded` / `under_funded` / `partial`), Hindi-primary + full parity, Latin numerals, dignified register | The **surfaces that render** the templates — the Panchayat Noticeboard pinned notice (**Epic 8**) and the Sahyog Vivran per-claim memorial page (**Epic 11b / FR-77**) |
| The **pure outcome→template selection policy** — `selectCloseOfCycleFraming(outcome)` in `packages/domain/src/close-of-cycle/` returns the canonical template keys + required interpolation params; exhaustive + replay-safe; the `under_funded` branch **structurally cannot** return a comparison template | The **live cycle-outcome computation** — the reconciled `deliveredTotal` / `contributorCount` a consumer interpolates → **Epic 9 reconciliation**; the calendar-aware close *timing* → **Story 8.9** |
| **Teeth over the new surface** — add the two locale files to `microcopy.yaml` `scope.copy_globs`; strengthen the `pool-reality-comparison` tone pattern for close-of-cycle-specific variants; prove the tone check bites a planted Pool-Reality #2 violation (fixture test + revert-sanity) | A **new/parallel CI gate** — none. 7.8 extends the *existing* `microcopy` gate's scope + semantic coverage; it does not add a scanner (don't over-gate a reliably-caught family — [[feedback_mechanization_split_commitment]]) |
| **Tone-review surface registration** — add close-of-cycle to `docs/tone-review-checklist.md` Publish-routing; reference (don't duplicate) the tone-guide §3 Pool-Reality #2 frame | The **runtime tone-review sign-off endpoint** for this surface (persistence + review permission) → the consuming story (Story 2.2's `evaluateToneReviewGate` mechanism already exists; the consumer wires it, exactly as Story 2.4 did for Niyamavali) |
| **Tests** — parity (auto), microcopy teeth (fixture + revert-sanity), selector exhaustiveness + the load-bearing "under-funded → celebration, never comparison" invariant, and a self-scan proving the *real* authored templates carry no prohibited frame | A **contracts (`@twt/contracts`) Zod DTO** for the template keys — **not built** (no cross-package boundary consumes it yet; enum-width / [[feedback_no_premature_package]]). The domain returns typed key strings; the i18n keys are the contract |

**No migration, no schema, no I/O.** 7.8 is copy + a pure policy + config + docs + tests. The selector is a pure function (no clock, no DB); the "outcome" is an **input** the consumer supplies.

## Acceptance Criteria

**AC1 — Template-driven framing set exists, bilingual + dignified, with Pool-Reality #2 disallowed (Given FR-19 + architectural-freeze row 10)**

1. A new **`close-of-cycle` i18n namespace** exists (`packages/i18n/locales/{en,hi}/close-of-cycle.json`), registered in `packages/i18n/src/catalog.ts` (2 imports + the two registry lines + `KNOWN_NAMESPACES`), with template keys for **each cycle outcome**:
   - **(a) fully-funded** — celebration copy naming the **contributor count** and the **nominee family's amount received** (e.g. reference grammar UX L985: *"Pool {poolLabel} बंद हो गया। {contributorCount} सदस्यों के योगदान से {familyName} के परिवार को {amount} दिए गए।"*).
   - **(b) under-funded — Pool-Reality #1 celebration framing** — copy celebrating the **actual amount delivered** and **contributor solidarity**, **without naming a "target" or "shortfall"** (*"{contributorCount} सहयोगियों ने हाथ बढ़ाया; {familyName} के परिवार को {amount} पहुँचाए गए।"*).
   - **(c) partial** — copy acknowledging the **actual** outcome **without any comparison** framing.
2. **Pool-Reality #2 disallowance holds in the authored copy**: the templates contain **none** of *"we fell short of…"*, *"X% achieved"*, *"target missed"*, *"needed more contributions"*, *"shortfall"*, or any analogous comparison-to-target / progress-meter-against-target framing (the rejected Ketto/GoFundMe pattern, UX L541). These phrasings are **already listed** as prohibited in `docs/tone-guide.md §3` and lint-checked by the Story 1.17 `microcopy` gate's tone-prohibition patterns — 7.8 keeps that true for the new surface (see AC2), it does not restate the table.
3. Templates are **bilingual with full Hindi parity** (Story 2.1 `i18n-parity` gate; member-facing is the default class, so the new namespace is parity-enforced automatically) and use **Latin numerals** for all counts/amounts/dates — the FR-19 celebration framing is an **operational Noticeboard surface** whose earlier Devanagari-numeral carve-out is **closed per §8 v4** (UX L1127/L1308). Numbers are carried by interpolation tokens (`{contributorCount}`, `{amount}`), never literal digits, so the `microcopy` numeral discipline stays green.
4. The copy holds the **dignified register** — quiet-pride / dignity-over-delight (UX L391, L402), no celebratory-animation language, no blame; the **under-funded and partial** templates are additionally **grief-context** copy (tone-guide §4) and follow the **Pattern 4 dignified-validation** grammar spirit (UX-DR55 §2334) — plain, warm, never comparison. Members are addressed as *सम्मानित साथी* / colleague, never user/customer/**donor** (say "contributor" / सहयोगी).

**AC2 — Enforcement: a Pool-Reality #2 violation is blocked at PR time OR tone-review time (Given a published close-of-cycle message that violates Pool-Reality #2)**

5. The new locale files are added to **`microcopy.yaml` `scope.copy_globs`** so the `pool-reality-comparison` tone rule (plus the full member-register vocabulary + numeral discipline) **actually scans** them. A green scan over the new files is **not** the deliverable — **teeth are proven**: a fixture close-of-cycle template carrying a Pool-Reality #2 phrase makes `checkTone` (and end-to-end `microcopy:check`) **fail**, and removing it passes (the revert-sanity / "gate has teeth" discipline, [[feedback_gate_scope_semantic_coverage]]).
6. The `pool-reality-comparison` tone pattern is **strengthened for close-of-cycle-specific variants** the current regex would miss on this surface (e.g. `shortfall`, `short of (the )?(target|goal)`, `% of (the )?(target|goal)`, `goal (not )?met`, `couldn'?t/didn'?t reach`). At least one **high-signal Hindi** variant is added for the `hi/` copy file (see **D3**); the remainder of the paraphrased/spelled-out space is caught by the **human** tone-review (which explicitly owns "the variants a lint cannot pattern-match", tone-guide §5).
7. **Close-of-cycle is registered as a governed surface** for the human tone-review: a row is added to `docs/tone-review-checklist.md` Publish-routing (member-visible copy that must pass tone review before publish), noting the review permission is the consumer surface's own key (added by Epic 8 / 11b — no generic `copy.review` key is manufactured, per the Story 2.2 posture). The tone-guide §3 Pool-Reality #2 entry is **referenced**, not duplicated.
8. The result satisfies the epic's second Given/When/Then: a close-of-cycle message that **violates Pool-Reality #2** is caught **at PR time** (the `microcopy` gate on the copy_globs) **OR at tone-review time** (the human checklist) — **publishing is blocked** until the copy is corrected. Both layers are required; neither waives the other (tone-guide §5).

**AC3 — Consumer contract: Sahyog Vivran / Noticeboard render the framing, celebration-not-shortfall (Given Epic 11b consumer)**

9. A **pure** `selectCloseOfCycleFraming(outcome)` policy (`packages/domain/src/close-of-cycle/`) maps a `CycleFundingOutcome` (`fully_funded | under_funded | partial`) to its canonical **`close-of-cycle` template keys** + the **required interpolation-param** contract (e.g. `poolLabel`, `contributorCount`, `familyName`, `amount`). Exhaustive over the outcome union (a `never` compile-time exhaustiveness check, the assignment/verdict precedent); **deterministic + replay-safe**. This is the single seam Epic 8/11b/8.9 call so the outcome→template decision is **made once, tested once**, never re-implemented per consumer.
10. The **load-bearing governance invariant** is asserted by test: the `under_funded` (and `partial`) branch **never** selects a template that carries comparison-to-target framing — the framing that reaches a nominee family on an under-funded close **reads as celebration** (Pool-Reality #1), the shortfall math stays internal and unsurfaced. The epic's demoable closure — *"under-funded cycle test produces close-of-cycle copy via Pool-Reality #2 framing — no shortfall narrative"* — is realized as a test that drives outcome → selector → resolved copy → asserts the resolved string carries **no** prohibited frame (`checkTone` over the real resolved template returns empty).
11. **`classifyCycleOutcome({ expectedTotal, deliveredTotal })` (ratified — D2)** — a pure classifier that **quarantines** the target: the expected/target total flows *in* and only the `CycleFundingOutcome` enum flows *out*, so the comparison is computed once, internally, and the numbers physically never reach the copy path. The consumer (Epic 9 reconciliation) supplies the totals; 7.8 owns the pure classification + its `selectCloseOfCycleFraming` composition. Guard non-finite/negative inputs (the 7.7 `Number.isInteger` precedent).

**AC4 — Audit / regulator traceability**

12. The framing decision is **reproducible + inspectable**: `selectCloseOfCycleFraming` is pure (same outcome → same template keys), the templates are versioned data in-repo, and the two enforcement layers (the `microcopy` gate result + the tone-review sign-off) are the auditable record that a published close-of-cycle message passed both floors. No cycle's *shortfall figure* is ever persisted into or surfaced by the member-visible copy path (the Pool-Reality #2 property).

## Tasks / Subtasks

- [x] **Task 1 — Author the `close-of-cycle` template catalog (AC1)**
  - [x] Add `packages/i18n/locales/en/close-of-cycle.json` + `packages/i18n/locales/hi/close-of-cycle.json` — flat dot-keyed maps (the 7.6/7.7 `contribution.json` convention: `"fully_funded.title"`, `"fully_funded.body"`, `"under_funded.title"`, `"under_funded.body"`, `"partial.title"`, `"partial.body"`). Hindi-primary authored first; English parity. Interpolation via **single-brace `{token}`** (i18n `t()` syntax) — `{poolLabel}`, `{contributorCount}`, `{familyName}`, `{amount}`. **No literal digits** (Latin-numeral discipline via tokens). Use the reference grammar in Dev Notes; celebrate actual outcome + solidarity; **no target/shortfall on any branch**.
  - [x] Register the namespace in `packages/i18n/src/catalog.ts`: add `enCloseOfCycle` / `hiCloseOfCycle` imports, the two `catalogs.{en,hi}` registry entries, and `'close-of-cycle'` in `KNOWN_NAMESPACES` (the file's own "ADDING A DOMAIN" header names exactly these steps).
- [x] **Task 2 — Give the `microcopy` tone gate teeth over the new surface (AC2)**
  - [x] Add both locale files to `microcopy.yaml` `scope.copy_globs` (below the `terms` entries), with a comment naming Story 7.8 (mirror the existing `niyamavali`/`terms` provenance comments).
  - [x] Strengthen the `pool-reality-comparison` tone `pattern` with the close-of-cycle variants (D3) + add a high-signal Hindi variant. Keep it a single valid case-insensitive regex (the parser `assertValidRegex`-validates it).
  - [x] Update the `scripts/microcopy/README.md` teeth table + the `microcopy.yaml` `copy_globs` comment to record that the register now bites the `close-of-cycle` member surface (surface-by-surface growth, no gate code change).
- [x] **Task 3 — The pure close-of-cycle framing-selection policy (AC3)**
  - [x] Add `packages/domain/src/close-of-cycle/framing.ts`: `CYCLE_FUNDING_OUTCOMES` canonical tuple + `CycleFundingOutcome` type; the `CloseOfCycleFraming` shape (`{ outcome, namespace: 'close-of-cycle', titleKey, bodyKey, requiredParams }`); `selectCloseOfCycleFraming(outcome)` — pure, exhaustive (`never` default), never returns a comparison template. Export the canonical template-key constants so a test can cross-check them against the i18n catalog.
  - [x] (D2, ratified) Add `classifyCycleOutcome({ expectedTotal, deliveredTotal })` — pure; returns only the enum (target quarantined). Guard non-finite/negative inputs (the 7.7 `Number.isInteger` guard precedent). Compose it with the selector in the AC10 load-bearing test (internal under-funded fact → celebration copy).
  - [x] Add `packages/domain/src/close-of-cycle/index.ts` barrel; wire `export * as closeOfCycle from './close-of-cycle/index.js'` into `packages/domain/src/index.ts` (mirror the `toneReview` namespace re-export).
- [x] **Task 4 — Register the governed surface for tone-review + docs (AC2.7)**
  - [x] Add a **close-of-cycle framing** row to `docs/tone-review-checklist.md` Publish-routing (surface = Panchayat Noticeboard + Sahyog Vivran close-of-cycle copy; review permission = the consumer surface's own key, added Epic 8 / 11b; first enforcing story = the consumer). Reference tone-guide §3 Pool-Reality #2 — do not restate it.
  - [x] (D5, ratified) Author a short ADR (`docs/adr/ADR-0031-close-of-cycle-template-driven-framing.md`) recording the LOCKED decision (template-driven framing + Pool-Reality #2 disallowed + the two-layer teeth + the selector/classifier seam + target-quarantine), following the ADR-0016/ADR-0019 governance precedent + `docs/adr/_adr-template.md`. Add it to `docs/adr/README.md`/`docs/knowledge-transfer/adr-index.md` if those index ADRs.
- [x] **Task 5 — Tests + gates (all ACs)**
  - [x] `i18n` parity: `pnpm turbo run i18n:check-parity` green over the new namespace (auto-discovered; member-facing default). Optional smoke test resolving one key per outcome via `t()` for both locales (the `smoke.test.ts` precedent).
  - [x] `microcopy` **teeth** (`scripts/microcopy/lib.test.ts`, which is excluded from the gate's own scan): a close-of-cycle fixture with a planted Pool-Reality #2 phrase (EN and the added Hindi variant) → `checkTone` returns a finding; a clean fixture → none. Assert the strengthened pattern catches each new variant.
  - [x] **Revert-sanity** (documented in Dev Agent Record, not committed): plant a `"shortfall"`/`"we fell short of the target"` line in the real `close-of-cycle.json`, run `pnpm microcopy:check` → **red** naming file:line; remove → **green**. This proves the copy_globs scope extension has teeth on the *real* surface, not just fixtures ([[feedback_gate_scope_semantic_coverage]] revert-sanity).
  - [x] Domain `packages/domain/tests/close-of-cycle/framing.test.ts`: `selectCloseOfCycleFraming` exhaustiveness (every outcome → a defined framing; unknown → throws / `never`); every selector-returned key **exists** in `close-of-cycle.json` (no dangling key — read the JSON from disk, no `checkTone` import needed here). `classifyCycleOutcome` (if built) purity + the equal/greater/less branches + input guards.
  - [x] **Load-bearing invariant, in `scripts/microcopy/lib.test.ts`** (same package as `checkTone` — see Dev Notes cross-package-boundary note): resolve the real `under_funded` + `partial` templates via `getCatalog` from `@twt/i18n` and assert `checkTone` over the resolved strings returns **empty**.
  - [x] `pnpm ci:local` green including `i18n-parity`, `microcopy` (`microcopy:test && microcopy:check`), typecheck + lint across touched packages (`@twt/i18n`, `@twt/domain`) and the root `scripts/microcopy`. Run with `--concurrency=4` ([[project_ci_local_concurrency_oversubscription]]).

### Review Findings

- [x] [Review][Defer] `partial.body` interpolates a known `{amount}` but the `partial` outcome is documented (`framing.ts` doc comment, D2) as "a close acknowledged **before** the final delivered figure is reconciled" — the template presupposes an amount the doc comment says isn't known yet. [packages/domain/src/close-of-cycle/framing.ts, packages/i18n/locales/{en,hi}/close-of-cycle.json] — deferred, awaits Epic 9 reconciliation design (the real answer depends on how the reconciler actually surfaces a `partial` outcome to a consumer — not yet built)

- [x] [Review][Patch] `pool-reality-comparison` regex has real coverage gaps for close-of-cycle-adjacent phrasing: `target (not) met`/`target achieved` (only `goal` is covered, not `target`, for the "met" form), a verb inserted between noun and "met" (`target was not met`), present-tense `doesn't/does not reach` (only past-tense `couldn't/didn't reach` is covered), and `N% short` (distinct from `% achieved`/`% of target`). Extend the pattern to close these. [microcopy.yaml:69] — fixed; `microcopy:check` + `scripts/microcopy` suite (58/58) reverified green.

- [x] [Review][Patch] `pool-reality-comparison` regex alternatives have no word-boundary anchors, risking false positives on substrings (e.g. "targeted", "goalless") now that `copy_globs` scope includes more member-facing files. Add `\b` anchors around `target`/`goal`/`reach` alternatives. [microcopy.yaml:69] — fixed (`\b` added around `target`/`goal` and trailing on the new `N% short` alternative); reverified no new false positives across `code_globs` + `copy_globs`.

- [x] [Review][Patch] ADR-0031's "Security / privacy" consequence states "No PII in the templates (numbers arrive as tokens at render time)" — but `{familyName}` (a deceased member's family name) is also a required interpolation token and is genuine PII once rendered on a public-facing surface. Reword to scope the claim to the template files themselves (token-only, no literal PII) and note the consuming surface (Epic 8/11b) is responsible for `familyName` handling under its own access/consent posture. [docs/adr/ADR-0031-close-of-cycle-template-driven-framing.md:125-127] — fixed.

- [x] [Review][Patch] `classifyCycleOutcome`'s return type is declared as the full `CycleFundingOutcome` union (`fully_funded | under_funded | partial`) but the function can only ever return `fully_funded` or `under_funded` (per its own doc comment, `partial` is never classifier-derived). Narrow the return type (e.g. `Exclude<CycleFundingOutcome, 'partial'>`) so downstream exhaustiveness checks aren't misled into thinking `partial` is reachable from this function. [packages/domain/src/close-of-cycle/framing.ts:139-156] — fixed; `@twt/domain` typecheck + 21/21 close-of-cycle tests reverified green.

- [x] [Review][Patch] The `{amount}` interpolation param's format contract (pre-formatted display string vs. raw number, currency formatting) is undocumented anywhere in `CLOSE_OF_CYCLE_REQUIRED_PARAMS`'s doc comment, the ACs, or the ADR — the only convention (a pre-formatted `'₹4,20,000'` string) is established implicitly by a test fixture. Add a doc-comment line pinning the contract so Epic 8/11b consumers don't each independently guess. [packages/domain/src/close-of-cycle/framing.ts:49-54] — fixed.

- [x] [Review][Patch] `packages/i18n/tests/close-of-cycle.test.ts` imports `from '../src/resolver'` without the `.js` extension, inconsistent with every other import touched in this diff and the existing `resolver.test.ts` (`'../src/resolver.js'`). Add the extension for ESM-import consistency. [packages/i18n/tests/close-of-cycle.test.ts:9] — fixed; `@twt/i18n` typecheck + lint + 6/6 close-of-cycle tests reverified green.

- [x] [Review][Defer] `packages/i18n/locales/{en,hi}/contribution.json` (Story 7.6/7.7's member-facing payment-error copy) is still not in `microcopy.yaml` `scope.copy_globs` (only `niyamavali`/`terms`/now `close-of-cycle` are scanned) — a pre-existing scope gap on a sibling member-facing surface, notable given this story's own "gate scope = semantic coverage" thesis, but out of 7.8's scope to fix. [microcopy.yaml:108-111] — deferred, pre-existing (predates 7.8; introduced by 7.6/7.7)

- [x] [Review][Defer] `classifyCycleOutcome` uses `Number.isInteger` (not `Number.isSafeInteger`) to guard `expectedTotal`/`deliveredTotal` — values above `Number.MAX_SAFE_INTEGER` would pass the guard and could misclassify due to floating-point precision loss. Matches the existing 7.7 `Number.isInteger` precedent elsewhere in the codebase; unrealistic magnitude for INR pool totals in practice. [packages/domain/src/close-of-cycle/framing.ts:144-149] — deferred, pre-existing convention (7.7 precedent, not a 7.8-specific regression)

### Decisions

### D1 — A dedicated `close-of-cycle` namespace, NOT an extension of `contribution` (DECIDED — recommended)

7.6/7.7 put member payment-error copy in the `contribution` namespace. Close-of-cycle framing is a **different surface, actor, and register** — it is cycle-outcome celebration/solidarity copy on the Noticeboard + memorial page, not a contribution-flow validation message. A dedicated `close-of-cycle` namespace (a) keeps the `microcopy.yaml` `copy_globs` scope surgical (you add exactly the two files, the surface-by-surface growth pattern), (b) lets the selector return a single `namespace` constant, and (c) reads cleanly in audit. **Alternative (record, don't silently drop):** fold the keys under `contribution.close_of_cycle.*` — rejected as it muddles two registers and forces the whole `contribution` namespace's future keys into the celebration-copy scope reasoning.

### D2 — Ship BOTH the pure selector and the target-quarantining outcome-classifier (DECIDED — ratified by BigDev 2026-07-19)

The load-bearing governance value of 7.8 is not "some JSON exists" — it is that **"under-funded never surfaces a comparison" is a tested, centralized invariant** rather than a convention each future consumer must remember. `selectCloseOfCycleFraming(outcome)` makes the outcome→template decision **once**, exhaustively, replay-safely, and the test at AC10 proves the `under_funded` branch's resolved copy carries no prohibited frame — this is the epic's demoable closure made executable. This matches the repo's universal idiom (a pure policy primitive + a seam for consumers: tone-review gate, assignment engine, the 7.6/7.7 classifiers).

The **companion** `classifyCycleOutcome({ expectedTotal, deliveredTotal })` ships because it **structurally enforces Pool-Reality #2**: the target/expected total flows *into* a pure function and only the `CycleFundingOutcome` enum flows *out* — the comparison is computed once, internally, and the numbers are physically unable to reach the copy path. Building **both** (selector + classifier) is high governance value for a tiny, pure surface, and lets the AC10 load-bearing test drive the *whole* pipeline (internal under-funded fact → outcome enum → template → assert no shortfall). The consumer (Epic 9 reconciliation) still owns *sourcing* `deliveredTotal` / `expectedTotal`; 7.8 owns the pure classification + selection over them. **Ratified: build both.** (The considered alternative — ship only the selector and let the consumer classify — was declined so the target-quarantine invariant lives in the tested governance layer, not in each consumer.)

### D3 — Strengthen the `pool-reality-comparison` regex for the close-of-cycle surface; rely on the human layer for the paraphrase tail (DECIDED)

Current pattern (`microcopy.yaml` L61): `fell\s+short|target\s+missed|\d+\s*%\s+achieved|needed\s+more\s+contributions`. It covers the four AC-named phrasings. Per [[feedback_gate_scope_semantic_coverage]], a scope extension is complete only when an invariant has **meaningful semantic coverage of the new surface** — so add the close-of-cycle variants a naïve celebration author might reach for: `shortfall`, `short of (the )?(target|goal)`, `\d+\s*%\s+of\s+(the\s+)?(target|goal)`, `goal\s+(not\s+)?met`, `(couldn'?t|could not|didn'?t|did not)\s+reach`. Add **one high-signal Hindi** phrase for the `hi/` file (e.g. `लक्ष्य से कम` / `कमी` — "less than target" / "shortfall"; keep it explicit, Devanagari regex is fragile). The **human tone-review explicitly owns** the spelled-out / template-literal / paraphrased variants a lint cannot pattern-match (tone-guide §5) — do **not** try to make the regex exhaustive over natural language. Keep the pattern a single valid regex (the parser validates it).

### D4 — Extend the EXISTING `microcopy` gate; add NO new/parallel scanner (DECIDED — assess, don't over-gate)

Per [[feedback_mechanization_split_commitment]] / [[feedback_gate_scope_semantic_coverage]]: 7.8 needs the tone floor to bite the new copy surface — that is a **scope + semantic-coverage extension of the gate that already owns this family**, not a new gate. Adding the copy files to `copy_globs`, strengthening the pattern, and proving teeth (fixture + revert-sanity) is the complete mechanization. A parallel "close-of-cycle lint" would be redundant over a reliably-caught family. Record the decision; do not build a second scanner.

### D5 — ADR-0031 for the LOCKED framing policy (DECIDED — author it; ratified by BigDev 2026-07-19)

The governance stories that preceded this each anchored a locked decision in an ADR (ADR-0016 microcopy gate, ADR-0019 tone-review publish gate). Close-of-cycle template-driven framing + Pool-Reality #2 disallowance + the selector/classifier seam + the target-quarantine is a comparable locked policy — **author `ADR-0031`** for provenance + the launch-gate/regulator trail. Follow `docs/adr/_adr-template.md`; capture the two-layer enforcement (automated `microcopy` floor + human tone-review ceiling), the "target quarantined in a pure classifier, never surfaced" property, and the deferred consumer boundary (Epic 8/11b render + Story 2.2 sign-off wiring). Cross-link it from any ADR index the repo maintains.

### D6 — No migration, no schema, no contracts DTO (DECIDED, revisit only if a consumer boundary needs Zod)

7.8 is pure copy + a pure policy + config + docs + tests. There is **no** table, **no** DB enum, **no** `@twt/contracts` artifact — the template keys are strings the domain returns and the i18n catalog defines; there is no cross-package boundary that validates them yet (enum-width / no-dead-surface discipline, [[feedback_no_premature_package]]). If Epic 11b later needs a validated DTO across a package boundary, add it in *that* story. If a reviewer overrides D2/D6 and insists on a persisted outcome record in Epic 7, note the next free migration number on main before hand-authoring (never regenerate an applied migration — [[project_live_db_test_gotchas]]).

### Read-before-you-touch (mandatory)

- `packages/i18n/locales/en/contribution.json` + `hi/contribution.json` — the 7.6/7.7 flat dot-keyed member-copy convention you mirror (`"<group>.<part>": "..."`), and the no-blame dignified tone register.
- `packages/i18n/src/catalog.ts` — the **"ADDING A DOMAIN"** header names the exact three edits (2 imports + 2 registry lines + `KNOWN_NAMESPACES`); static JSON imports (no fs) so it runs in every bundler.
- `packages/i18n/scripts/lib.ts` + `check-parity.ts` + `locales/classification.json` — the parity gate **auto-discovers** every `*.json`; member-facing is the default class, so the new namespace is parity-enforced with **no** classification edit. Confirm you do NOT need to touch `classification.json`.
- `microcopy.yaml` (L52-106) — the `tone` rules (esp. `pool-reality-comparison` L60-61) you strengthen, and `scope.copy_globs` (L101-106, currently `niyamavali` + `terms`) you extend. The header's "green-with-teeth + surface-by-surface, no gate code change" contract.
- `scripts/microcopy/lib.ts` (`checkTone`, `checkVocabulary`, `checkNumerals`) + `check.ts` (the copy_globs loop runs the FULL register incl. `member_only`) + `lib.test.ts` (where your fixture teeth-test goes — this dir is **excluded** from the gate's own scan, so prohibited phrases in fixtures are safe). `README.md` teeth table you update.
- `docs/tone-guide.md §3` (already lists the Pool-Reality #2 frame — reference it) + `docs/tone-review-checklist.md` Publish-routing table (you add the close-of-cycle row) + `packages/domain/src/tone-review/gate.ts` (the `evaluateToneReviewGate` mechanism the consumer will wire — you do NOT wire it here).
- `packages/domain/src/index.ts` (the `export * as toneReview from './tone-review/index.js'` namespace-barrel pattern you mirror for `closeOfCycle`) + `packages/domain/src/tone-review/` (the shape of a pure governance primitive: a barrel + a pure evaluator, no DB/HTTP).
- `packages/domain/src/pool/contribution-binding.ts` (the 7.6/7.7 canonical-tuple + exhaustive-`never` + input-guard style your `CYCLE_FUNDING_OUTCOMES` / `selectCloseOfCycleFraming` mirror).
- `_bmad-output/planning-artifacts/ux-design-specification.md` L985 (the canonical FR-19 close-of-cycle copy example), L391/L402 (quiet-pride / dignity-over-delight register), L1122-1127 + L1308 (§8 v4: Noticeboard celebration framing uses **Latin** numerals — the Devanagari carve-out is closed), L2334-2360 (Pattern 4 Dignified Validation grammar), L541 (the rejected Ketto/GoFundMe progress-meter frame).

## Dev Notes

### The two-layer enforcement model (do not conflate)

Tone enforcement in TWT is **two layers, both required before publish** (tone-guide §5):

| Layer | What 7.8 does to it | Where |
|---|---|---|
| **Automated floor** (Story 1.17 `microcopy`) | Bring the new copy into `scope.copy_globs`; strengthen `pool-reality-comparison`; **prove teeth** (fixture + revert-sanity) | `microcopy.yaml`, `scripts/microcopy/` |
| **Human ceiling** (Story 2.2 tone-review) | Register close-of-cycle as a governed surface in the checklist; the runtime sign-off enforcement is the consumer's | `docs/tone-review-checklist.md`; `packages/domain/src/tone-review/` (mechanism exists) |

A passing lint does **not** waive the human review; the human review does **not** waive the lint. 7.8 does not build a publish endpoint (there is no member surface in Epic 7) — it makes the surface *governable* so the consuming story (Epic 8/11b) enforces the sign-off exactly as Story 2.4 did for the Niyamavali.

### Reference grammar for the templates (author real copy from this)

Anchor on UX L985 (the canonical FR-19 example) and the tone-guide registers. Latin numerals throughout (tokens carry the numbers). Illustrative — the dev authors final Hindi-primary copy, non-author tone-reviewed:

- **fully_funded** — HI: *"पूल {poolLabel} बंद हो गया। {contributorCount} सदस्यों के योगदान से {familyName} के परिवार को {amount} दिए गए।"* · EN: *"Pool {poolLabel} has closed. With the contributions of {contributorCount} colleagues, {familyName}'s family received {amount}."*
- **under_funded (Pool-Reality #1)** — HI: *"पूल {poolLabel} बंद हो गया। {contributorCount} सहयोगियों ने साथ मिलकर हाथ बढ़ाया; {familyName} के परिवार को {amount} पहुँचाए गए।"* · EN: *"Pool {poolLabel} has closed. {contributorCount} colleagues stood together; {amount} reached {familyName}'s family."* — celebrates the **actual** amount + solidarity; **no** "target", "shortfall", "only", "%".
- **partial** — acknowledges the actual outcome + that the family received support, **without** any comparison to what "should" have been collected.

**Prohibited on every branch** (blocked by the strengthened lint + human review): "we fell short of…", "X% achieved", "target missed", "needed more contributions", "shortfall", "short of the goal/target", "% of the target", a progress-meter-against-target — the Ketto/GoFundMe frame (UX L541). The system knows the shortfall internally; the copy **never** surfaces it (Pool-Reality #2).

### Testing standards

- **Pure everywhere.** The selector + classifier are pure (no clock/DB/I/O) — DB-free unit tests, the 7.6/7.7 posture. No integration/live-DB suite is needed (no schema touch) — this story does **not** hit `:5433`.
- **Teeth over green.** Per [[feedback_gate_scope_semantic_coverage]]: a green `microcopy:check` over the new files proves nothing on its own. The deliverable is (1) a fixture test where the tone rule *fails* on a planted Pool-Reality #2 phrase, and (2) a **revert-sanity** on the real `close-of-cycle.json` (plant → red → remove → green), recorded in the Dev Agent Record. Recon which invariant fires: the `pool-reality-comparison` tone rule, now in scope over `copy_globs`.
- **Fixtures are safe.** `scripts/microcopy/lib.test.ts` and this story file live outside the gate's declared scope (the gate never globs `scripts/microcopy/**`, `_bmad-output/**`, or `microcopy.yaml`), so prohibited phrases in fixtures/story do not self-trip the gate (the precision-scoping self-green invariant, README §"Precision-scoping IS the self-green invariant").
- **No dangling keys.** The domain test reads `close-of-cycle.json` from disk and asserts every `selectCloseOfCycleFraming` key exists — the selector and the catalog cannot drift.
- **Where the "no prohibited frame" assertion actually lives (cross-package boundary note).** `scripts/` is **not** a pnpm workspace package (no `package.json`, not listed in `pnpm-workspace.yaml`'s `packages/*`) — no file under `packages/*` imports across that boundary today, and `packages/domain/tsconfig.json` (`rootDir: "."`, `include: ["src/**/*","tests/**/*"]`) will reject a relative import reaching outside the package. So **do not** try to `import { checkTone } from '../../../scripts/microcopy/lib.js'` into `packages/domain/tests/close-of-cycle/framing.test.ts` — put the AC10 "resolve `under_funded`/`partial` via the real i18n catalog → `checkTone` returns empty" assertion in **`scripts/microcopy/lib.test.ts`** instead (or a new file alongside it), where `checkTone` + `microcopy.yaml` parsing already live natively and the import is same-package. That test can `import { getCatalog } from '@twt/i18n'` (a real workspace package) to resolve the real strings. Keep the **domain** test (`packages/domain/tests/close-of-cycle/framing.test.ts`) scoped to what's actually domain-internal: selector exhaustiveness, `classifyCycleOutcome` purity/guards, and the no-dangling-key check (reading the JSON file directly, no `checkTone` import needed). This avoids an "inlined reimplementation" of the tone regex silently drifting from the real `microcopy.yaml` pattern.

### Project Structure Notes

- New: `packages/i18n/locales/{en,hi}/close-of-cycle.json`; `packages/domain/src/close-of-cycle/{framing.ts,index.ts}` (both `selectCloseOfCycleFraming` + `classifyCycleOutcome`); `packages/domain/tests/close-of-cycle/framing.test.ts`; `docs/adr/ADR-0031-close-of-cycle-template-driven-framing.md`.
- Edited: `packages/i18n/src/catalog.ts` (register namespace); `microcopy.yaml` (`tone` pattern + `copy_globs`); `scripts/microcopy/README.md` (teeth table); `scripts/microcopy/lib.test.ts` (fixture teeth test + the AC10 load-bearing invariant over the real resolved templates); `packages/domain/src/index.ts` (`closeOfCycle` namespace re-export); `docs/tone-review-checklist.md` (Publish-routing row); `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger flip at completion).
- **No** edits to `classification.json` (member-facing default), **no** migration, **no** `@twt/contracts` change.
- CI: `microcopy` + `i18n-parity` are existing `ci.yml` jobs / `ci-local.sh` registrations; adding files to existing globs needs **no new job**. Root scripts: `microcopy:check` (`tsx scripts/microcopy/check.ts`), `microcopy:test` (`vitest run scripts/microcopy`), `i18n:check-parity` (turbo).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.8] — the four ACs (templates per outcome; Pool-Reality #2 disallowance lint-checked; bilingual + Pattern 4; publish blocked on violation; Epic 11b consumer framing).
- [Source: _bmad-output/planning-artifacts/epics.md L60 (FR-19)] — "Close-of-cycle copy template-driven; celebrates actual outcome; comparison-to-target framing disallowed."
- [Source: _bmad-output/planning-artifacts/epics.md L146 (FR-77)] — Sahyog Vivran: contributor count + total raised + close-of-cycle celebration framing (FR-19); trust-reviewed before publish (the Epic 11b consumer).
- [Source: _bmad-output/planning-artifacts/epics.md L527] — architectural-freeze row 10 (centralized i18n + tone-guide bilingual surface contract; English never primary on member surfaces).
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md L985] — canonical FR-19 close-of-cycle copy; L391/L402 register; L1122-1127/L1308 §8 v4 Latin-numeral rule; L2334-2360 Pattern 4; L541 rejected progress-meter frame.
- [Source: microcopy.yaml L52-106] — the `pool-reality-comparison` tone rule + `scope.copy_globs` you extend. [Source: scripts/microcopy/lib.ts / check.ts / README.md] — the gate engine + teeth model.
- [Source: docs/tone-guide.md §3, §5] + [docs/tone-review-checklist.md Publish-routing] — the human-layer Pool-Reality #2 frame + the governed-surface table. [Source: packages/domain/src/tone-review/gate.ts] — `evaluateToneReviewGate` (the consumer wires it).
- [Source: packages/i18n/src/catalog.ts / scripts/lib.ts / locales/classification.json] — namespace registration + auto-parity for member-facing default.

### Previous-story intelligence (7.7, done)

- **Flat dot-keyed member copy + parity** is the established shape (`"amount_mismatch.title"` etc. in `contribution.json`, en+hi); the `i18n:check-parity` gate covered it automatically — expect the same for `close-of-cycle`.
- **Version-pin / canonical-tuple / exhaustive-`never` / input-guard** discipline (7.7 `CONTRIBUTION_REF_VERSION`, `Number.isInteger` guards after review) — mirror for `CYCLE_FUNDING_OUTCOMES` + `classifyCycleOutcome` guards.
- **7.7 review lesson [[feedback_gate_scope_semantic_coverage]]**: a Dev-Agent-Record note claimed gate coverage the scanner structurally could not provide ("the AST scanner has nothing to check in a pure file"). For 7.8, **do not claim** the `microcopy` gate "validates" the templates by mere inclusion — claim it **bites** them, and prove it with the fixture test + revert-sanity. State teeth honestly ([[feedback_record_unattested_no_backfill]]).
- **`--concurrency=4`** on `pnpm ci:local` to dodge the oversubscription flake ([[project_ci_local_concurrency_oversubscription]]).

### Git / recent-work intelligence

- Recent 7.x commits (7.4→7.7) each shipped a **pure primitive + a seam for a later consumer, no live call site** (assignment engine, fixed-amount schedule, wrong-pool classifier, `tr=` derivation) — 7.8 is the governance analog (templates + selector + teeth; consumers in Epic 8/9/11b). The branch/commit convention is `story/7-8-…` → selective stage → manual commit ([[project_story_automator_ops]]); merge gate is `pnpm ci:local` (GitHub Actions suspended — [[project_ci_actions_suspension_local_mirror]]).
- Baseline: `97518bf` (main HEAD, merge of 7.7 PR #111).

### Project context reference

Relevant memories: [[feedback_gate_scope_semantic_coverage]] (the teeth/revert-sanity discipline — central to AC2), [[feedback_mechanization_split_commitment]] + [[project_access_wrapper_gate_pending_scope]] (extend the existing gate, don't add a parallel scanner — D4), [[feedback_no_premature_package]] (no contracts DTO — D6), [[feedback_closure_language_precision]] (record explicit deferral for the ADR — D5), [[project_ci_actions_suspension_local_mirror]] + [[project_ci_local_concurrency_oversubscription]] (the `ci:local` merge gate + concurrency flag), [[project_story_automator_ops]] (commit discipline), [[project_sprint_status_ledger]] (the ledger flip at completion).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- **`microcopy` revert-sanity on the REAL surface (AC2.5 / [[feedback_gate_scope_semantic_coverage]]).** Planted `"We fell short of the target; the pool had a shortfall this cycle."` into the real `packages/i18n/locales/en/close-of-cycle.json` (`under_funded.body`) → `pnpm microcopy:check` → **RED**, naming both offenders on the real surface:
  - `✗ [tone] packages/i18n/locales/en/close-of-cycle.json:5 — "fell short" → remove pool-reality-comparison framing`
  - `✗ [tone] packages/i18n/locales/en/close-of-cycle.json:5 — "shortfall" → remove pool-reality-comparison framing`
  - Removed the planted line (restored the authored copy) → `pnpm microcopy:check` → **GREEN** (`✓ microcopy gate passed`). This proves the `copy_globs` scope extension has teeth on the *real* file, not only on fixtures. The planted phrase was NOT committed; `git status` confirms `close-of-cycle.json` restored byte-clean.
- **`pnpm ci:local --concurrency=4`** ([[project_ci_local_concurrency_oversubscription]]) → **26/26 static jobs GREEN** (lint, typecheck, build, unit test, i18n-parity, microcopy, all invariant gates, determinism-replay, channels-determinism). `integration-tests` opt-in leg (DATABASE_URL on `twt-test-pg` :5433) run separately → `@twt/domain` **131 files / 1310 passed / 1 skipped / 0 failures** — confirms the `domain/src/index.ts` `closeOfCycle` barrel re-export introduced no regression (7.8 itself is DB-free per Testing Standards).

### Completion Notes List

- **Task 1 (AC1) — template catalog.** New `close-of-cycle` i18n namespace, Hindi-primary + English parity, three outcome families (`fully_funded`/`under_funded`/`partial`), flat dot-keyed (`"<outcome>.<part>"`, the 7.6/7.7 convention). All numbers carried by `{token}`s (`{poolLabel}`,`{contributorCount}`,`{familyName}`,`{amount}`) — no literal digits (Latin-numeral discipline stays green). Copy celebrates the ACTUAL delivered amount + contributor solidarity (Pool-Reality #1); under-funded + partial are grief-context, dignified, colleague-not-donor; NO target/shortfall/% on any branch (Pool-Reality #2). Registered in `catalog.ts` (2 imports + 2 registry entries + `KNOWN_NAMESPACES`). Parity auto-enforced (member-facing default — NO `classification.json` edit, confirmed). i18n suite 57/57.
- **Task 2 (AC2) — `microcopy` teeth.** Added both locale files to `microcopy.yaml` `scope.copy_globs` (4→6 copy files) + STRENGTHENED the `pool-reality-comparison` pattern (D3) with close-of-cycle variants (`shortfall`, `short of the (target|goal)`, `N% of the (target|goal)`, `goal (not) met`, `couldn't|didn't reach`) + one high-signal Hindi phrase `लक्ष्य से कम`; kept a single valid case-insensitive regex (`assertValidRegex`-validated). Teeth PROVEN, not merely scanned: `scripts/microcopy/close-of-cycle.test.ts` (17 tests) drives each strengthened variant + a planted-vs-clean fixture through the REAL parsed `microcopy.yaml`, plus the revert-sanity above. README teeth table updated (surface-by-surface growth note). D4 held: NO new/parallel scanner — the existing gate's scope + semantic coverage extended.
- **Task 3 (AC3/AC4) — pure framing policy.** `packages/domain/src/close-of-cycle/framing.ts`: `CYCLE_FUNDING_OUTCOMES` canonical tuple + `selectCloseOfCycleFraming(outcome)` (→ canonical template keys + required params; exhaustive `never` default; the `under_funded`/`partial` branch STRUCTURALLY cannot return a comparison template — the shape has only title/body keys into a namespace with no shortfall copy) + `classifyCycleOutcome({expectedTotal,deliveredTotal})` (D2 — target quarantined: `>=`→`fully_funded` else `under_funded`; only the enum flows out; `Number.isInteger`/non-negative guards, the 7.7 precedent). `closeOfCycle` namespace re-export wired into `domain/src/index.ts` (mirrors `toneReview`). Domain suite 21/21 (exhaustiveness, no-dangling-key vs real JSON both locales, classify branches/guards, the AC3.10 load-bearing "internal under-funded fact → celebration keys" composition).
  - **D2 sub-decision recorded:** `partial` is NOT emitted by the two-total `classifyCycleOutcome` (which decides only met-or-not, keeping the target-quarantine property clean) — it is a first-class outcome a consumer supplies directly (a close acknowledged before the delivered figure is reconciled). It remains in the union + selector + templates and is tested via the selector. Documented in `framing.ts` + `classifyCycleOutcome`'s doc-comment so no consumer expects the classifier to derive it.
- **Task 4 (AC2.7) — governed-surface registration + ADR.** `docs/tone-review-checklist.md` Publish-routing gains a **Close-of-cycle framing** row (review permission = the Epic 8/11b consumer surface's own key — no generic `copy.review` manufactured, the Story 2.2 posture) + a grief-context note; tone-guide §3 Pool-Reality #2 is REFERENCED, not restated. Authored `docs/adr/ADR-0031-close-of-cycle-template-driven-framing.md` (D5; ADR-0016/0019 governance precedent, `_adr-template.md` schema) recording the LOCKED policy (template-driven framing + Pool-Reality #2 disallowance + two-layer teeth + selector/classifier seam + target-quarantine + deferred consumer boundary). Added Section A row + narrative announcement + status-count (`drafted` 0→1, Total 147→148) to `docs/knowledge-transfer/adr-index.md`. **Ratification recorded un-attested-pending** — author-committed; a reviewer convenes the Trustee Panel; NO fabricated session ([[feedback_record_unattested_no_backfill]]).
- **Task 5 — tests/gates.** See Debug Log. Optional i18n smoke test added (`packages/i18n/tests/close-of-cycle.test.ts`, 6 tests — resolves one key per outcome via `t()` both locales).
- **Cross-package boundary (honest note).** The story's Dev Notes suggested the AC10 real-surface assertion `import { getCatalog } from '@twt/i18n'` inside `scripts/microcopy/lib.test.ts`. `@twt/i18n` is NOT resolvable from the root `scripts/` vitest context (`require.resolve('@twt/i18n/...')` throws; no root script imports a `@twt/*` package at runtime), and wiring a root devDependency just to satisfy one import is a heavier, install-state-changing change than reading the committed JSON. So the AC10 + teeth assertions live in a NEW same-package file `scripts/microcopy/close-of-cycle.test.ts` that reads the real `close-of-cycle.json` via `fs` (byte-identical to what `getCatalog` returns) and runs the REAL `checkTone` over the REAL parsed `microcopy.yaml` — no tone-regex reimplementation, no drift. `lib.test.ts` stays fs-free (its stated invariant). This claims the gate BITES the templates (proven), never that mere inclusion "validates" them ([[feedback_gate_scope_semantic_coverage]] / 7.7 review lesson).
- **D6 held:** NO migration, NO schema, NO `@twt/contracts` DTO — the template keys are strings the domain returns + the i18n catalog defines; no cross-package boundary validates them yet ([[feedback_no_premature_package]]).

### File List

**New:**
- `packages/i18n/locales/en/close-of-cycle.json`
- `packages/i18n/locales/hi/close-of-cycle.json`
- `packages/i18n/tests/close-of-cycle.test.ts`
- `packages/domain/src/close-of-cycle/framing.ts`
- `packages/domain/src/close-of-cycle/index.ts`
- `packages/domain/tests/close-of-cycle/framing.test.ts`
- `scripts/microcopy/close-of-cycle.test.ts`
- `docs/adr/ADR-0031-close-of-cycle-template-driven-framing.md`

**Edited:**
- `packages/i18n/src/catalog.ts` (register the `close-of-cycle` namespace)
- `packages/domain/src/index.ts` (`closeOfCycle` namespace re-export)
- `microcopy.yaml` (strengthened `pool-reality-comparison` pattern + 2 `copy_globs` entries)
- `scripts/microcopy/README.md` (teeth table + surface-by-surface growth note)
- `docs/tone-review-checklist.md` (Publish-routing row + grief-context note)
- `docs/knowledge-transfer/adr-index.md` (Section A row + narrative + status-count 147→148)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger flip at completion)

### Change Log

| Date | Change |
|---|---|
| 2026-07-19 | Story 7.8 implemented — close-of-cycle template-driven framing: new `close-of-cycle` i18n namespace (bilingual, Pool-Reality #1 celebration copy); pure `selectCloseOfCycleFraming` + target-quarantining `classifyCycleOutcome`; `microcopy` gate teeth extended (copy_globs + strengthened `pool-reality-comparison` pattern, proven via fixture + revert-sanity); tone-review governed-surface registration; ADR-0031 authored (drafted, ratification un-attested-pending). `pnpm ci:local` 26/26 GREEN + domain integration 1310 passed. Status → review. |
