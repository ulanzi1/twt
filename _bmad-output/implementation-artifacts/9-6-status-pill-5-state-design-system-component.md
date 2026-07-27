---
baseline_commit: f5f7e930715208f9ac124025e5563357055e698e
---

# Story 9.6: `<StatusPill>` 5-State Design System Component

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **any surface displaying contribution status**,
I want **a `<StatusPill>` design-system component implementing the 5-state taxonomy (yellow / green / red / grey / held) consistently across surfaces**,
so that **members see one visual language for contribution state regardless of surface**.

---

> **Build-order reality (READ THIS FIRST — this is a `[PRIMITIVE]` design-system consolidation, not a new data path).**
> The 5-state **taxonomy, derivation, wire contract, and bilingual copy already exist and are DONE.** Story 8.6 built `deriveContributionStatus` (green ≻ red ≻ yellow ≻ grey) + the `ContributionStatus` union; Story 9.5 added the 5th state `held` (green ≻ held ≻ red ≻ yellow ≻ grey) to the domain derivation, the `@twt/contracts` enum, and shipped the bilingual copy for all five states in both `yogdaan.status.*` (passbook) and `note.status.*` (PDF). **Do NOT touch the derivation, the union, the wire contract, or the event names — they are frozen and correct.**
>
> What does NOT yet exist is the **presentation layer**: today each surface renders the pill *inline and inconsistently*. `YogdaanBahiRow` carries an inline `STATUS_TONE` map with a **stopgap blue `held`**; `ActiveContributionCard` hand-rolls its own yellow pill; the PDF `note-template.ts` renders `held` with the **same grey ink as `grey`**. Story 9.5's code review formally deferred this to 9.6: *"held tone renders inconsistently across surfaces … re-trigger at Story 9.6, which owns the polished 5-state visual/tone system and should reconcile both."* (see `deferred-work.md:12`).
>
> **9.6's whole job:** author the ONE reusable `<StatusPill>` component (pure presenter in `@twt/ui` + Tamagui render in `apps/mobile`), give each of the 5 states a **documented color token + icon + label + ARIA label**, make the taxonomy **structurally un-extendable without a design-system PR** (a compile-enforced + test-enforced exhaustiveness gate), and **replace every inline stopgap with the component** so all surfaces speak one visual language. Add the one missing design token (`status-held`) so mobile and the PDF resolve `held` from a single authority.

---

## Scope — what this story IS and IS NOT

| ✅ IN scope (build it) | ❌ OUT of scope (do NOT touch) |
|---|---|
| **The pure `@twt/ui` `<StatusPill>` presenter** — `packages/ui/src/status-pill/`, following the **D4-A `member-status` precedent** (framework-agnostic, NO react/react-native, `(status) → view-model` + i18n KEYS). The single source of the state→{tone, colorTokenRole, iconName, labelKey, a11yKey} mapping, keyed on `@twt/contracts` `ContributionStatus` with an exhaustive `satisfies Record<ContributionStatus, …>`. | **The derivation / union / precedence** (`deriveContributionStatus`, `CONTRIBUTION_STATUSES`, green≻held≻red≻yellow≻grey — Story 8.6/9.5, DONE). Do NOT re-derive, re-order, or add a 6th state. |
| **The Tamagui RN render component** — `apps/mobile/components/status-pill/StatusPill.tsx`. Maps the presenter's semantic `tone` → the mobile palette, renders the lucide icon + label, sets ARIA. Supports the UX size variants (tiny / default / large). This is where the **polished `held` tone** finally lands. | **The `@twt/contracts` wire enum + the `@twt/domain` union** (Story 9.5, DONE — value-aligned, lockstep-guarded). 9.6 CONSUMES the type; it adds no state. |
| **The design token** — add `status-held` to `@twt/tokens` (`color`), a subdued neutral **distinct from `grey`** (grey = "on record / unreconciled"; held = "trustee-frozen, under review"), AA-contrast. Update the token generator + the semantic-naming test. | **The event names / event log** — `reconciliation.confirmation-reversed`, `contribution.confirmed`, `contribution.reconciliation-mismatch` (frozen; the Story 8.10 `no-ingest-path` fence must stay green — 9.6 adds NO `contribution.*` type; a pill tone is not an event). |
| **Refactor the consumers onto the component** — `YogdaanBahiRow` (remove inline `STATUS_TONE` + stopgap blue `held`), `ActiveContributionCard` (its inline yellow pill), and repoint the PDF `note-template.ts` `held` ink to the new `status-held` token. **One visual language.** | **A My-Pool-card redesign / new surfaces** — repoint the EXISTING pill atoms only. No layout/redesign. Story 9.7's `<SelfVerifySurface>` and Story 9.8's admin review queue will consume `<StatusPill>` when they land — do not build them here. |
| **The canonical bilingual copy** — migrate the 5 states' label + a11y copy **verbatim** into a neutral `statusPill.*` key set in `common.json` (both locales), mirroring the `memberStatus.*` precedent, so the cross-cutting component owns surface-neutral copy. | **A new i18n namespace** — do NOT add a `status-pill` namespace (that ripples `catalog.ts` + `classification.ts`). Use the already-registered `common` namespace, exactly like `memberStatus.*`. |
| **The "cannot be silently extended" gate** — a `@twt/ui` unit test that (a) asserts the spec's key set **exactly equals** `ContributionStatus.options` (lockstep — a 6th state fails the build AND the test), (b) every state has non-empty tone/icon/labelKey/a11yKey, (c) all 5 tones + all 5 icons + all 5 label keys are **mutually distinct** (the semantic-coverage teeth per [[feedback_gate_scope_semantic_coverage]] — a green scan proves nothing; distinctness proves the pill is not color-only and every state is really differentiated). | **An admin/web React render component** — no admin consumer exists until Story 9.8 ([[feedback_no_premature_package]] / YAGNI). The `@twt/ui` presenter + the `@twt/tokens` role leave the seam ready; do not build a second render now. |

---

## Acceptance Criteria

*(From epics.md §Story 9.6, L3251–3263, anchored on UX-DR21 / UX spec §11 `<StatusPill>` L1856–1863.)*

**AC1 — The reusable component exists as an extension of `packages/ui`, keyed on the canonical union.**
**Given** UX-DR21 + Story 1.17 `@twt/tokens`/`@twt/ui` design-system foundation
**When** `<StatusPill>` is authored — a **pure presenter in `@twt/ui`** (`deriveStatusPillViewModel(status)`, framework-agnostic, following the `member-status` D4-A pattern) + a **Tamagui render component in `apps/mobile`** that consumes it
**Then** the presenter is keyed on `@twt/contracts` `ContributionStatus` (NOT a third re-declared union — it imports the type so the wire↔DS mapping cannot drift), and the render component takes `status: ContributionStatus` + an optional `size: 'tiny' | 'default' | 'large'` (UX variants: tiny = inline in tables, default = standalone, large = status-detail surfaces).

**AC2 — All five states, each with documented copy + color token + icon + ARIA label (per Story 1.17).**
**When** the presenter maps a state
**Then** it implements exactly the 5 states with these bindings:

| State | Meaning (source) | Tone (semantic) | Color-token role (`@twt/tokens`) | Icon (semantic → lucide) | Label / ARIA copy (existing, `common.json`) |
|---|---|---|---|---|---|
| **yellow** | Member self-attested via UTR, reconciliation hasn't matched yet (Story 8.4) | `pending` | `status-pending` | `clock` → `Clock` | "Verifying" / "मिलान हो रहा है" |
| **green** | `contribution.confirmed` fired (Story 9.5 canonical truth) | `confirmed` | `status-confirmed` | `check-circle` → `CheckCircle` | "Confirmed" / "पुष्ट" |
| **red/umber** | Mismatch detected (`contribution.reconciliation-mismatch`, Story 9.4 matcher — **LIVE in prod today**, cron-emitted 6×/day; Story 9.7 adds the member-facing screenshot-upload consumer, not the producer) | `mismatch` | `status-mismatch` (**warm-UMBER, NOT warm-red** — warm-red is reserved for the ceremonial stamp, UX :1094) | `alert-triangle` → `AlertTriangle` | "Under review" / "पुनरीक्षण में" |
| **grey** | No verdict; on-record, cycle closed unreconciled (NEUTRAL, never a shame state) | `neutral` | `status-grey-takeover` | `circle` → `Circle` | "On record" / "दर्ज" |
| **held** | Confirmed contribution under trustee review-and-reverse (Story 9.5 `held`; rare per 9.4 monotonic invariant) | `held` | **`status-held` (NEW token)** — subdued, distinct from grey, dignified not alarming | `pause-circle` → `PauseCircle` | "Held under review" / "पुनरीक्षण हेतु रोका गया" |

**And** each state's color derives from an `@twt/tokens` semantic role (FM-14 #2 — no magic-number colours in component code); the copy is the existing bilingual strings, migrated verbatim into a neutral `statusPill.*` key set.

**And** **the 5 states cannot be silently extended without a design-system PR**: the presenter's spec is `satisfies Record<ContributionStatus, StatusPillSpec>` (adding a 6th contract state breaks the `@twt/ui` build), AND a unit test asserts the spec key set **exactly equals** `ContributionStatus.options` (a widening on either side fails CI). Extending the taxonomy therefore *requires* editing the contract enum + the DS spec + the copy + the token in one deliberate PR.

**AC3 — Semantic accessibility: the pill is NOT color-only.**
**Then** every rendered pill conveys its state through **text + icon + ARIA label** simultaneously (color is supplementary, AA-contrast). The render sets `accessible` + `accessibilityRole="text"` + `accessibilityLabel={a11y copy}`; the visible label text and the icon are both present in every state. A test asserts the 5 tones, the 5 icons, and the 5 label keys are each mutually distinct (no two states are distinguishable by colour alone).

**AC4 — Every existing inline pill is replaced by the component (one visual language); the two 9.5 `held` stopgaps are reconciled.**
**Then** `YogdaanBahiRow` renders `<StatusPill status={row.status} size="tiny" />` (its inline `STATUS_TONE` map + the stopgap-blue `held` are DELETED); `ActiveContributionCard`'s hand-rolled yellow pill is replaced by `<StatusPill status="yellow" size="default" />`; and the PDF `note-template.ts` renders `held` from the new `status-held` token (no longer the same grey ink as `grey`). The `deferred-work.md:12` deferral is marked resolved.

**And** no regression: the passbook row keeps its 56pt fixed height + `getItemLayout` cheapness (Story 8.6 D5, [[project_fabric_flatlist_empty_populated_crash]] discipline), its every-5th-row heavier rule, and its composite row-level a11y announcement; the My-Pool-card's live-announce behavior is preserved or deliberately changed (not silently dropped) — see Dev Notes on `ActiveContributionCard`'s actual (not header-commented) live-region state.

---

## Tasks / Subtasks

- [x] **Task 1 — The `@twt/ui` pure presenter (AC1/AC2).** *(D4-A `member-status` precedent — copy its file shape.)*
  - [x] `packages/ui/src/status-pill/view-model.ts`: define `StatusPillTone = 'pending' | 'confirmed' | 'mismatch' | 'neutral' | 'held'`, `StatusPillIconName = 'clock' | 'check-circle' | 'alert-triangle' | 'circle' | 'pause-circle'`, and `interface StatusPillViewModel { status: ContributionStatus; tone: StatusPillTone; colorTokenRole: string; iconName: StatusPillIconName; labelKey: string; a11yLabelKey: string }`. Import `ContributionStatus` as a **type** from `@twt/contracts` (type-only — no zod at runtime in the presenter, mirroring member-status's `import type MemberValidityPayloadDto`).
  - [x] `packages/ui/src/status-pill/spec.ts` (or inline in presenter): the exhaustive `const STATUS_PILL_SPEC = { yellow: {...}, green: {...}, red: {...}, grey: {...}, held: {...} } as const satisfies Record<ContributionStatus, Omit<StatusPillViewModel, 'status'>>`. `colorTokenRole` = the `@twt/tokens` role NAME string (`'status-pending'` etc. — the presenter references the role by name, staying framework-agnostic; render layers resolve the actual value). Document each state with a one-line comment (source story + meaning), matching the member-status header discipline.
  - [x] `packages/ui/src/status-pill/presenter.ts`: `export function deriveStatusPillViewModel(status: ContributionStatus): StatusPillViewModel { return { status, ...STATUS_PILL_SPEC[status] }; }`. Strictly pure. Header comment mirrors `member-status/presenter.ts` (no react/RN, no i18n resolution — emits KEYS).
  - [x] `packages/ui/src/status-pill/i18n-keys.ts`: `LABEL_KEYS`/`A11Y_LABEL_KEYS` catalogues → `statusPill.<state>` / `statusPill.<state>_a11y` (default `common` namespace). Comment: "kept in sync BY VALUE with `packages/i18n/locales/{en,hi}/common.json`."
  - [x] `packages/ui/src/status-pill/index.ts` barrel + add `export * from './status-pill/index.js';` to `packages/ui/src/index.ts`.

- [x] **Task 2 — The `status-held` design token (AC2/AC4).**
  - [x] `packages/tokens/src/tokens.ts`: add `'status-held'` to the `color` group — a subdued neutral **distinct from `status-grey-takeover`** (recommend a muted slate/indigo-neutral, e.g. `#4b4f66`-family, AA-contrast on `surface-base` `#fbfbf8`; **firm up the exact hex against the AA-contrast discipline** — the status-pill text must clear 4.5:1 per UX §12 L2649). Comment it as the `held` semantic role (trustee-frozen / under-review, dignified — [[project_yogdaan_status_derivation_convention]]).
  - [x] `packages/tokens/src/theme.ts` generically iterates `color` entries and needs no code change for a new role, but the committed `packages/tokens/src/theme.css` artifact DOES need regenerating: run `pnpm --filter @twt/tokens tokens:generate-theme` and commit the result, or the `check-theme-determinism` gate fails. Update `packages/tokens/tests/tokens.test.ts` (the FM-14 #1 semantic-role-naming test) so the new role is covered. Run `pnpm --filter @twt/tokens test`.

- [x] **Task 3 — The bilingual `statusPill.*` copy (AC2), migrated verbatim.**
  - [x] `packages/i18n/locales/en/common.json` + `hi/common.json`: add `statusPill.yellow` / `statusPill.yellow_a11y` / … / `statusPill.held` / `statusPill.held_a11y` — **copy the existing `yogdaan.status.*` strings verbatim** (both locales; see `contribution.json`). This is a move to a surface-neutral home, not new copy.
  - [x] After Task 4 repoints `YogdaanBahiRow`, the now-orphaned `yogdaan.status.<state>` + `_a11y` keys in `contribution.json` (both locales) may be **removed** (grep first — confirm the ONLY consumer was `YogdaanBahiRow`; **keep `yogdaan.row_a11y`, `yogdaan.col.status`, and all `note.status.*`** — the PDF register is intentionally richer and separate). If removal is risky, leave them and note the duplication as a documented follow-up; do NOT let the two drift.
  - [x] Run the i18n parity gate (`pnpm --filter @twt/i18n test` / the en↔hi parity check) — new keys must have both locales.

- [x] **Task 4 — The Tamagui render component + consumer refactor (AC1/AC3/AC4).**
  - [x] `apps/mobile/components/status-pill/StatusPill.tsx`: `<StatusPill status size="default" >`. Consume `deriveStatusPillViewModel(status)` from `@twt/ui`. Two small documented adapter maps INSIDE the component (the mobile-palette bridge — the ONLY place tone→Tamagui lives): `TONE_TOKENS: Record<StatusPillTone, { bg; border; color }>` (Tamagui theme tokens — carry over the existing good `yellow/green/orange/gray` triples from `YogdaanBahiRow.STATUS_TONE`; **`held` gets a real distinct tone now**, no more stopgap blue — align it to the `status-held` intent) and `ICONS: Record<StatusPillIconName, IconComponent>` (from `@tamagui/lucide-icons-2`: `Clock`, `CheckCircle`, `AlertTriangle`, `Circle`, `PauseCircle`). Render: `<XStack accessible accessibilityRole="text" accessibilityLabel={t(vm.a11yLabelKey)}>` containing the icon + `<Text>{t(vm.labelKey)}</Text>`. Size variants scale icon px + `fontSize` + padding (tiny ≈ `$1`, default ≈ `$2`, large ≈ `$4`) — keep tiny visually identical to today's passbook pill so the 56pt row is unchanged.
  - [x] `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx`: DELETE the inline `STATUS_TONE` const (incl. the stopgap-blue `held` comment) and the inline pill `<XStack bg={tone.bg}…>`; render `<StatusPill status={row.status} size="tiny" />` in its place. Keep `statusLabel = t('statusPill.' + row.status)` (or resolve via the component's label key) ONLY for the composite `rowA11y` line-1 announcement (unchanged behavior). Verify the row still compiles as 56pt fixed height.
  - [x] `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`: replace the hand-rolled `bg="$yellow4"…` attested pill (≈L219–235) with `<StatusPill status="yellow" size="default" />`. Preserve the surrounding "ambient polite status, NEVER confirmed/success" semantics. **Live-region note:** the current pill HAS `accessibilityLiveRegion="polite"` (contradicting the file's own header comment, which claims only the tone-gradient paragraph is live) — decide deliberately whether to carry that forward on the new component instance or drop it as an intentional double-announce fix, and record the choice in Completion Notes. Do not assume it should be dropped.
  - [x] `apps/mobile/components/yogdaan-bahi/sample-data.ts`: add `'held'` to the sample `statuses` array (currently `['yellow','green','red','grey']`) so the dev-time passbook exercises all 5 tones on the emulator (visual QA of AC3).

- [x] **Task 5 — Reconcile the PDF `held` ink (AC4).**
  - [x] `apps/api/src/modules/member-pool/note-template.ts`: change `held: color['status-grey-takeover']` → `held: color['status-held']` in `STATUS_INK`; remove the stopgap comment. Re-run the note-template unit tests (`apps/api/tests/unit/contribution-note*.test.ts`).
  - [x] `_bmad-output/implementation-artifacts/deferred-work.md`: mark the 9.5 "held tone renders inconsistently" item (L7–12) **resolved by Story 9.6** with a one-line closure note ([[feedback_closure_language_precision]] — "Closed by [the `status-held` token + `<StatusPill>` component]", an artifact was produced).

- [x] **Task 6 — The un-extendable-taxonomy gate + a11y teeth (AC2/AC3).** *(the load-bearing test — [[feedback_gate_scope_semantic_coverage]]: meaningful semantic coverage, not a green scan.)*
  - [x] `packages/ui/tests/status-pill/presenter.test.ts` (vitest, pure): (a) **lockstep** — `Object.keys(STATUS_PILL_SPEC).sort()` deep-equals `[...ContributionStatus.options].sort()` (import `ContributionStatus` the VALUE here — the runtime zod enum — so a 6th state on EITHER side fails); (b) `deriveStatusPillViewModel` over all 5 states returns non-empty `tone`/`colorTokenRole`/`iconName`/`labelKey`/`a11yLabelKey`; (c) **distinctness** — the set of tones, the set of iconNames, and the set of labelKeys each have size 5 (proves not-color-only + every state differentiated); (d) `labelKey !== a11yLabelKey` for every state; (e) every `colorTokenRole` exists in `@twt/tokens` `color` (import `@twt/tokens` — proves no dangling token reference, and that `status-held` shipped).
  - [x] Confirm `@twt/ui` typechecks (`pnpm --filter @twt/ui typecheck`) — the `satisfies Record<ContributionStatus, …>` is the compile half of the gate.
  - [x] (Mobile) a lightweight assertion in the mobile test suite that `StatusPill` renders a label + accessibilityLabel + icon for each of the 5 states — reuse the existing mobile unit-test harness pattern (e.g. `apps/mobile/tests/unit/helpline-cta-presence.test.ts`; note `active-contribution-card.test.ts` is actually an `apps/api` handler test, NOT a mobile RN-render test — don't follow it as the mobile pattern); if RN component rendering isn't set up for pure unit tests, assert against the presenter view-model + the component's tone/icon maps instead (do not stand up a new RN test runner for this).

- [x] **Task 7 — Gates + regression.**
  - [x] `pnpm ci:local` (mirrors all 14 ci.yml jobs; `--concurrency=4`, DATABASE_URL on :5433 for integration — [[project_ci_local_concurrency_oversubscription]], [[project_ci_actions_suspension_local_mirror]]). Specifically confirm: the Story 8.10 `no-ingest-path.test.ts` fence stays GREEN verbatim (9.6 adds no `contribution.*` type); the friction-budget PR gate (`friction-budget.md`, [[project_friction_budget_baseline_ratchet]]) — the new component adds negligible mobile weight, but if a new public/page-weight surface shifts, do NOT auto-raise the baseline; the PII-scrape + benefit-tag gates.
  - [x] Build the mobile app on the emulator and eyeball all 5 pills in the Yogdaan Bahi (via the sample-data `held` addition) — verify AA contrast + icon rendering + Devanagari labels don't clip at 360px ([[project_mobile_android_emulator_setup]]). *(On-device build+launch VERIFIED — `expo run:android` BUILD SUCCESSFUL, Tamagui compiled `StatusPill`, app launched no-redbox. The live pill-visual eyeball is auth-gated + fixture-not-rendered-at-runtime + `held`/`green` producer-less, so AA is proven mathematically (7.76:1) + by test; final on-device colour eyeball left to reviewer — see Completion Notes, honest per [[feedback_record_unattested_no_backfill]].)*

### Review Findings

- [x] [Review][Decision] `held`'s mobile color is not actually backed by the `status-held` `@twt/tokens` authority (D3 "one authority for mobile + PDF" not met) — `apps/mobile/components/status-pill/StatusPill.tsx` never reads `vm.colorTokenRole`; `TONE_TOKENS.held` renders Tamagui's stock `$purple4/$purple8/$purple11` scale while `apps/api/src/modules/member-pool/note-template.ts` resolves the real `color['status-held']` hex (`#4b4f66`) — these are two different colors, not one authority. **Resolved by BigDev (2026-07-27): accept `$purple` as a documented approximation** (consistent with how yellow/green/red/grey already work — mobile bridges tone→Tamagui-scale independently of the PDF's `@twt/tokens` hex); do not add an exact-match mobile token. Correct the overclaiming wording instead (see the patch item below).
- [x] [Review][Decision] A third hand-rolled "attested/yellow" pill was left un-refactored in `apps/mobile/app/(contribution)/pay.tsx:233-246` (`upi_intent.yellow_pill` / `upi_intent.yellow_pill_a11y`), structurally identical to the pattern removed from `ActiveContributionCard.tsx` in this same diff. AC4 says "every existing inline pill is replaced by the component," but the Scope table only names `YogdaanBahiRow`, `ActiveContributionCard`, and `note-template.ts`. **Resolved by BigDev (2026-07-27): patch it in now** — refactor `pay.tsx` onto `<StatusPill status="yellow" size="default" live />`, mechanically identical to the `ActiveContributionCard` fix.
- [x] [Review][Patch] `note-template.ts`'s new comment ("this is now the single authority the mobile `<StatusPill>` and this PDF both resolve") and `deferred-work.md`'s closure note ("give `held` ONE treatment across surfaces") are factually inaccurate given the `$purple`-approximation decision above — correct the wording to describe an aligned-intent approximation, not a shared authority. [apps/api/src/modules/member-pool/note-template.ts:94, _bmad-output/implementation-artifacts/deferred-work.md:10] — **Fixed:** both reworded to "aligned in meaning" / "not backed by one literal color value."
- [x] [Review][Patch] Refactor `apps/mobile/app/(contribution)/pay.tsx`'s hand-rolled attested/yellow pill (lines 233-246) onto `<StatusPill status="yellow" size="default" live />`, matching the `ActiveContributionCard` refactor; retire the now-orphaned `upi_intent.yellow_pill` / `upi_intent.yellow_pill_a11y` i18n keys (both locales) after confirming no other consumer. [apps/mobile/app/(contribution)/pay.tsx:233-246] — **Fixed:** refactored, keys removed (both locales), `View`/`Text` import trimmed to what's still used; `typecheck`/`lint` clean.
- [x] [Review][Patch] `ActiveContributionCard`'s attested state silently lost its longer explanatory sentence ("You've told us you paid. We're checking it against our bank records and will confirm once it matches.") when `active_contribution.yellow_pill*` was deleted in favor of the terse DS label ("Verifying") — a content downgrade on a prominent member-facing card that, unlike the live-region choice, was not called out as a deliberate decision in Completion Notes. [apps/mobile/components/active-contribution/ActiveContributionCard.tsx:229] — **Fixed:** documented as a deliberate, accepted trade-off in Completion Notes (not reverted — reintroducing bespoke copy would recreate the drift 9.6 exists to eliminate).
- [x] [Review][Patch] No test asserts `STATUS_INK.held !== STATUS_INK.grey` (or exercises a `held`-status PDF note at all) in the API test suite — `contribution-note.test.ts` never generates a `held`-status note, unlike the mobile/token side which gets this exact distinctness check twice (`tokens.test.ts` + `presenter.test.ts`). [apps/api/tests/unit/contribution-note.test.ts] — **Fixed:** added a `held` case to `wireOwnHistory` + a dedicated test asserting the `.status-title` rule resolves `status-held`'s hex and NOT `status-grey-takeover`'s; 19/19 pass.
- [x] [Review][Defer] No runtime guard/fallback across the `StatusPill`/presenter/i18n-lookup chain if `ContributionStatus` ever carries a value outside the 5-key union (e.g. an older mobile build receiving a newer wire enum before an app update) — `STATUS_PILL_SPEC[status]`, `TONE_TOKENS[vm.tone]`, `ICONS[vm.iconName]`, and `t(statusPillLabelKey(...))` all assume exhaustiveness and would fail (undefined spread / invalid element type / loud-by-default i18n throw) if violated. [packages/ui/src/status-pill/presenter.ts:7, apps/mobile/components/status-pill/StatusPill.tsx] — deferred, pre-existing: the deleted inline `STATUS_TONE`/template-string-key code had the identical unguarded-lookup gap; 9.6 centralizes it across more call sites but does not introduce it.

---

## Dev Notes

### The architecture: this is the `member-status` D4-A pattern, applied to a chip

`@twt/ui` is a **pure, framework-agnostic presenter package — it has ZERO react/react-native** (`packages/ui/src/index.ts` header: *"Pure logic only (no react/react-native)"*). Its only current member, `member-status`, is the exact template you are cloning: a pure `(payload, opts) → view-model` builder + an i18n-KEY catalogue in `@twt/ui`, with the actual JSX render living in the apps (`apps/mobile/app/(membership)/index.tsx` for RN Tamagui, ready for a web variant). `<StatusPill>` is the same shape, simpler input:

```
@twt/ui/src/status-pill/        (PURE — the DS contract)
  view-model.ts   → StatusPillViewModel, StatusPillTone, StatusPillIconName
  spec.ts         → STATUS_PILL_SPEC satisfies Record<ContributionStatus, …>   ← the un-extendable gate (compile half)
  presenter.ts    → deriveStatusPillViewModel(status)
  i18n-keys.ts    → statusPill.<state> / _a11y   (common namespace)
  index.ts
apps/mobile/components/status-pill/StatusPill.tsx   (Tamagui render — tone→token + icon adapter, size variants)
```

- **Why key on `@twt/contracts` `ContributionStatus` and not a new union:** `@twt/ui` already depends on `@twt/contracts` (`package.json`), and `ContributionStatus` is exported from `@twt/contracts` (`contributions/index.ts:21` → `contribution-history.ts`). Keying the spec on that type via `satisfies Record<ContributionStatus, …>` means the DS taxonomy is *the same object* as the wire taxonomy — they cannot drift, and the existing contracts↔domain lockstep guard already keeps the wire↔domain aligned. This is the cheapest possible "cannot silently extend" mechanism ([[feedback_mechanization_split_commitment]] — mechanize with the type system, don't hand-roll a gate the compiler gives free).
- **Why the presenter emits a semantic `tone` + a `colorTokenRole` string, not colour values:** identical to `member-status` emitting `SectionStatus` for the render layer to map. `@twt/ui` must not import a palette (it's consumed by both RN-Tamagui and the web/PDF `@twt/tokens` worlds). The presenter names the `@twt/tokens` role (`status-pending`…); the PDF consumes it directly, and mobile bridges tone→Tamagui in ONE documented adapter inside the render component.

### Existing code you are MODIFYING — read before you touch (regression surface)

- **`apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx` (Story 8.6, DONE).** Fixed **56pt** row (cheap `getItemLayout`, D5); line-1 = date|family|amount as ONE a11y unit (`rowA11y`); line-2 = the status pill + pool·cycle + Note link. Currently holds `const STATUS_TONE = { yellow:{…$yellow4}, green:{…$green4}, red:{…$orange4 — warm-umber}, grey:{…$gray4}, held:{…$blue4 STOPGAP} } satisfies Record<YogdaanRow['status'], …>`. **What changes:** delete `STATUS_TONE` + the inline pill `<XStack>`, render `<StatusPill size="tiny">`. **What must be preserved:** 56pt height, the every-5th-row `borderBottomWidth`, the `rowA11y` composite announcement (still needs the status LABEL string — resolve it via `t('statusPill.'+row.status)`), the Note-link button as a separate focusable action, tabular-nums on date/amount/cycle. The umber (`$orange`) for `red` is deliberate (UX :1087-1094 — a mismatch must not swamp the passbook with warm-red); carry that intent into the component's `mismatch` tone.
- **`apps/mobile/components/active-contribution/ActiveContributionCard.tsx` (Story 8.4/8.2, DONE).** The My-Pool card. It renders its yellow attested pill inline (`bg="$yellow4" borderColor="$yellow8" color="$yellow11"`, ≈L219-235) ONLY when `attested`; otherwise it shows the ≥56pt contribute CTA. **Correction to the file's own header comment:** the header (L23-26) claims a SINGLE ambient live region (the tone-gradient paragraph, L193-202, `accessibilityLiveRegion="polite"`), but the code actually sets `accessibilityLiveRegion="polite"` on BOTH the tone-gradient paragraph AND the yellow pill's `View` (L229) — the header comment is stale/incomplete. **What changes:** the yellow pill atom → `<StatusPill status="yellow" size="default" />`. **What must be preserved:** the "NEVER confirmed/success" semantics of the attested state, the ≥56pt CTA path when not attested — AND a deliberate, documented choice on the live-region question: either (a) keep parity by setting `accessibilityLiveRegion="polite"` on this call site's `<StatusPill>` instance so no live-announce behavior is silently dropped, or (b) consciously drop the second live region as a separate, intentional double-announce fix. Do NOT let this change happen silently — record which option was taken in the Completion Notes.
- **`apps/api/src/modules/member-pool/note-template.ts` (Story 8.7, DONE).** Server-side HTML→PDF Contribution Note. `STATUS_INK: Record<ContributionNoteFacts['status'], string>` maps status→`@twt/tokens` colour; warm-red is deliberately excluded (reserved for the stamp, UX :1094). `held` currently = `color['status-grey-takeover']` (the stopgap — same as `grey`). **What changes:** `held → color['status-held']`. This is server-side, imports `@twt/tokens` `color` directly (no Tamagui), and is the OTHER half of the 9.5 deferral. The PDF's richer `note.status.<state>.title/body` copy stays as-is (a separate, intentionally fuller register from the pill's terse label).
- **`packages/tokens/src/tokens.ts` (Story 1.17, DONE).** The single hand-rolled token registry. `color` has `status-pending/-confirmed/-mismatch/-grey-takeover` + the FIRM admin `status-*-bg/fg/border` set. **No `held` colour exists** — that's the gap you close. FM-14 #1 (semantic role names, test-enforced) + #2 (no magic-number colours in component code — that's WHY the mobile adapter and PDF must resolve from a token, not a hex).

### The 5-state taxonomy is FROZEN — do not reinvent it

`deriveContributionStatus` (`packages/domain/src/contribution/history.ts`) and the value-aligned `@twt/contracts` `ContributionStatus` enum are the authority. Precedence **green ≻ held ≻ red ≻ yellow ≻ grey** (Story 9.5 D4, LOCKED). Meanings (verbatim from the contract/domain doc comments — reuse them in your spec comments):
- `yellow` — attested; told-us-they-paid, still verifying.
- `green` — reconciliation-confirmed (`पुष्ट`); EXCLUSIVELY from a live `contribution.confirmed`.
- `red` — reconciliation mismatch (`contribution.reconciliation-mismatch`). **The producer is Story 9.4's matcher, DONE and LIVE** (cron-registered `RECONCILIATION_MATCH_SWEEP`, 6×/day — `packages/domain/src/reconciliation/matcher-write.ts` → `apps/jobs/src/matcher/matcher-worker.ts` → `apps/jobs/src/boot.ts`). `red` pills can appear in production TODAY — treat red-state QA (contrast, copy, PDF ink) with full rigor, not as a theoretical future case. Story 9.7 adds the member-facing screenshot-upload SelfVerifySurface (a *consumer* of a mismatch), not the producer.
- `grey` — cycle closed, no verdict; NEUTRAL "on record, unreconciled" — **never** a "you missed"/shame state (grey is UNREACHABLE until Story 8.9's consumer emits `alert.closed`; 8.9 itself only shipped the IST-resolver/registry, per [[project_calendar_aware_tail_not_window_extension]]).
  > Note: epics.md L3261 ("no contribution yet, haven't attested") and the UX spec ("late/inactive") describe `grey` differently from the frozen domain/contract meaning above. This story follows the frozen domain/contract meaning (verified against `history.ts` and the shipped `note.status.grey.body` copy) — consistent with the drafting-error precedent in [[project_calendar_aware_tail_not_window_extension]] (epics.md:3022). Do not follow the epics/UX prose over the domain source.
- `held` — a prior confirmation trustee-walked-back (`reconciliation.confirmation-reversed`, Story 9.8 producer — legitimately EMPTY until 9.8 ships). Dignified/neutral ("Held under review"), **never** "reversed"/"failed"; a fresh confirmation re-greens it.

**Consequence for QA:** `yellow`, `green`, AND `red` can all already occur in live data today. Only `grey` (no live `alert.closed` emitter yet) and `held` (no live `reconciliation.confirmation-reversed` emitter until Story 9.8) are structurally unreachable today. That is EXPECTED and correct for grey/held ([[feedback_record_unattested_no_backfill]] — build the presentation complete now, honestly empty, never fabricate a producer). This is why Task 4 adds `held` to the sample-data generator: it's the only way to *see* that tone on the emulator (red and grey should ALSO be spot-checked against real reconciled data where possible, since red is reachable now).

### i18n: `statusPill.*` in `common`, mirroring `memberStatus.*`

The i18n catalog is a registered manifest (`packages/i18n/src/catalog.ts` imports each namespace JSON + `KNOWN_NAMESPACES`, and `classification.ts` classifies each). Adding a NEW namespace ripples both files — **don't**. The `<MemberStatusPanel>` precedent puts cross-cutting member-surface component copy under a component-prefixed key in the already-registered `common` namespace (`memberStatus.*`, 317 common keys; resolved via `useT()` default namespace). Do the same: `statusPill.*` in `common.json`. The copy already exists verbatim under `yogdaan.status.*` — migrate it, don't rewrite it (the wording was tone-reviewed in 9.5).

### Testing standards

- `@twt/ui`: vitest, pure unit (`packages/ui/vitest.config.ts`, `include: tests/**/*.test.ts`). The presenter is dependency-free → assert directly (the member-status `presenter.test.ts` is the model). Put the un-extendable-taxonomy + a11y-distinctness gate here (Task 6) — this is the load-bearing test.
- `@twt/tokens`: `pnpm --filter @twt/tokens test` (FM-14 semantic-naming + theme-determinism).
- Mobile: existing suites are `.test.ts` unit style (`apps/mobile/tests/unit/`). Don't stand up a new RN component renderer just for this — if pure RN render assertions aren't already possible, assert against the presenter + the component's exported tone/icon maps.
- Merge gate: `pnpm ci:local` green (all 14 jobs) — GitHub Actions is suspended, local mirror is the gate ([[project_ci_actions_suspension_local_mirror]]). Watch the known live-DB flakes ([[project_known_livedb_test_failures]]) — confirm innocence by running a suspect spec in isolation; none of 9.6's changes touch the DB.

### Project Structure Notes

- **New:** `packages/ui/src/status-pill/{view-model,spec,presenter,i18n-keys,index}.ts`, `packages/ui/tests/status-pill/presenter.test.ts`, `apps/mobile/components/status-pill/StatusPill.tsx`.
- **Modified:** `packages/ui/src/index.ts`, `packages/tokens/src/tokens.ts` (+ `theme.ts`/`tokens.test.ts` if the role list is enumerated), `packages/i18n/locales/{en,hi}/common.json` (+ possibly `contribution.json` key removal), `apps/mobile/components/yogdaan-bahi/{YogdaanBahiRow,sample-data}.ts(x)`, `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`, `apps/api/src/modules/member-pool/note-template.ts`, `deferred-work.md`.
- **eslint per-package cwd** ([[project_eslint_config_per_package_cwd]]): each package lints from its own root — verify with `pnpm --filter @twt/ui lint`, `pnpm --filter @twt/mobile lint`, etc., not a repo-root `eslint`.
- **No ADR needed.** The taxonomy + precedence are already recorded (ADR-0035 + its 9.5 addendum); 9.6 is a presentation consolidation of a decided contract, not a new architectural decision.

### Decisions — all LOCKED by BigDev (2026-07-27)

- **D1 — Presenter keyed on `@twt/contracts` `ContributionStatus` (import the type), spec `satisfies Record<ContributionStatus,…>`. LOCKED.** Free compile-time "cannot silently extend"; zero drift risk. (Rejected: a third re-declared union in `@twt/ui` — needs its own lockstep guard, more surface to drift.)
- **D2 — Copy lives in `common.json` as `statusPill.*`, migrated verbatim from `yogdaan.status.*`; the old keys removed after repoint. LOCKED.** Mirrors `memberStatus.*`; no new-namespace ripple; single source prevents drift. (Rejected: new `status-pill` namespace — ripples `catalog.ts`+`classification.ts` for no benefit. Rejected: leave copy under `yogdaan.*` — surface-specific name for a cross-cutting component, and leaves it scattered.)
- **D3 — `status-held` is a subdued neutral distinct from grey (a muted slate/indigo), one authority for mobile + PDF. LOCKED.** UX calls held a "neutral marker" but it must be visually separable from `grey` (different meaning). Firm the exact hex to AA 4.5:1 on `surface-base`. (Rejected: reuse `status-grey-takeover` — that's the current bug; two meanings, one colour.)
- **D4 — Mobile only for the render component now; no admin/web React `<StatusPill>`. LOCKED.** No web consumer until Story 9.8; the presenter + token leave the seam ready ([[feedback_no_premature_package]]). (Rejected: build a web variant speculatively.)
- **D5 — Icons: `clock` / `check-circle` / `alert-triangle` / `circle` / `pause-circle` (semantic names in the presenter; lucide components in the mobile adapter). LOCKED.** Icon *shape* is the a11y-load-bearing part (distinct per state); the exact lucide glyph remains re-pickable without touching `@twt/ui` — the presenter's `iconName` is the stable contract, only the mobile glyph map changes.

### References

- [Source: epics.md#Story-9.6 L3251-3263] — the 5-state ACs, UX-DR21 anchor, "cannot be silently extended", "not color-only".
- [Source: ux-design-specification.md#§11-StatusPill L1856-1863] — anatomy (pill, colour bg/border, optional icon, label), 5 states, variants (tiny/default/large), a11y (colour supplementary, semantic label always present, AA).
- [Source: ux-design-specification.md L1903, L1921, L2197, L2287, L2596, L2649, L2702] — `<StatusPill>` consumers, colour-independence rule, AA per-state contrast (4.5:1), colour-blindness sim.
- [Source: packages/ui/src/member-status/{presenter,view-model,i18n-keys,index}.ts] — the D4-A pattern to clone.
- [Source: packages/domain/src/contribution/history.ts] — `deriveContributionStatus`, `CONTRIBUTION_STATUSES`, precedence, per-state meanings (FROZEN).
- [Source: packages/contracts/src/contributions/contribution-history.ts] — `ContributionStatus` enum + the 5-state doc comments (the wire authority `@twt/ui` keys on).
- [Source: packages/tokens/src/tokens.ts] — the `color` semantic roles + FM-14 governance; the `status-held` gap.
- [Source: apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx] — the inline `STATUS_TONE` + stopgap-blue `held` to remove; 56pt/umber/a11y constraints.
- [Source: apps/api/src/modules/member-pool/note-template.ts L86-95] — `STATUS_INK`, the `held`→grey stopgap to reconcile.
- [Source: packages/i18n/locales/{en,hi}/contribution.json + common.json] — the verbatim status copy + the `memberStatus.*`-in-`common` precedent.
- [Source: _bmad-output/implementation-artifacts/9-5-…-canonical-financial-truth.md L112, L127-131 (D3/D4); deferred-work.md L7-12] — the explicit 9.6 hand-off + the two stopgaps to reconcile.
- Memory: [[project_yogdaan_status_derivation_convention]], [[feedback_gate_scope_semantic_coverage]], [[feedback_no_premature_package]], [[project_contracts_domain_bundle_boundary]], [[project_fabric_flatlist_empty_populated_crash]], [[project_ci_actions_suspension_local_mirror]], [[project_mobile_android_emulator_setup]].

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, `bmad-dev-story` workflow).

### Debug Log References

- `pnpm --filter @twt/tokens test` → 21 passed (new `status-held` role covered).
- `pnpm --filter @twt/ui test` → 25 passed (incl. the 9-test load-bearing gate: lockstep + distinctness + dangling-token).
- `pnpm --filter @twt/ui typecheck` / `lint` → clean (the `satisfies Record<ContributionStatus,…>` compile-half holds).
- `pnpm --filter @twt/i18n test` → 57 passed (en↔hi parity, after the orphaned-key removal).
- `pnpm --filter @twt/api exec vitest run tests/unit/contribution-note*.test.ts` → 19 passed / 1 skipped (PDF `held` ink repointed).
- `pnpm --filter @twt/mobile exec vitest run tests/unit/status-pill-render.test.ts` → 15 passed; `typecheck` + `lint` clean.
- `DATABASE_URL=…:5433 pnpm ci:local` → **PASSED, 28 jobs green** (lint, typecheck, build, unit, tokens-theme-check, i18n-parity, pii-scrape, friction-budget, microcopy, benefit-mechanism, all state-invariants incl. the 8.10 no-ingest fence family, determinism-replay, integration-tests). friction-budget did NOT need a baseline raise.
- **Emulator (Pixel_9, API via Expo dev build):** `expo run:android` → `BUILD SUCCESSFUL in 7m 34s`, Metro bundled 4317 modules, app installed + launched to `org.teacherswelfaretrust.p0prototype/.MainActivity` with NO redbox. Tamagui's on-device compiler processed the new component (`native StatusPill · 2 found`) — a real integration signal that `<StatusPill>` + the refactored consumers compile and mount on-device. Devanagari renders crisply (login screen screenshot). **Live pill-visual eyeball NOT reached this session (honest limitation, not a skip):** the runtime Yogdaan Bahi reads the real API (not the `SAMPLE_YOGDAAN_ROWS` fixture — no runtime screen consumes it), so reaching a pill-populated passbook needs OTP auth + real attested rows; and `held`/`green` have no producer yet (9.8 / live `contribution.confirmed`). AA contrast is instead proven mathematically (status-held 7.76:1 on surface-base) and all 5 tones are covered by the pure `@twt/ui` gate + the mobile exhaustiveness test. Recommend a reviewer do the final on-device colour/Devanagari-clip eyeball once a data-populated passbook is reachable ([[feedback_record_unattested_no_backfill]] — recorded honestly, not fabricated).

### Completion Notes List

- **Architecture — the `member-status` D4-A pattern applied to a chip.** New pure `@twt/ui/status-pill/` package (view-model / spec / presenter / i18n-keys / index), keyed on `@twt/contracts` `ContributionStatus` via `satisfies Record<ContributionStatus, StatusPillSpec>`. The spec IS the wire taxonomy (not a re-declared union), so the DS↔wire mapping cannot drift and a 6th contract state breaks the `@twt/ui` build (the compile-half of the un-extendable gate). The presenter emits a semantic `tone` + a `@twt/tokens` role NAME + i18n KEYS — no react/RN, no palette, no copy — so both the mobile Tamagui render and the PDF (`@twt/tokens`) worlds consume one source.
- **`status-held` token (D3).** Added `color['status-held'] = '#4b4f66'` — a muted slate-indigo, **AA 7.76:1 on `surface-base`** (verified; clears the 4.5:1 UX §12 discipline), distinct from `status-grey-takeover` (grey = "on record", held = "under review"). `theme.css` regenerated (determinism gate green); `tokens.test.ts` covers the new role + asserts held≠grey.
- **Copy (D2).** `statusPill.*` (5 states × label+a11y = 10 keys) added to `common.json` both locales, migrated **verbatim** from the tone-reviewed `yogdaan.status.*` (9.5). Mirrors `memberStatus.*` — no new namespace, no `catalog.ts`/`classification.ts` ripple.
- **Orphaned-key cleanup.** Confirmed by grep that `YogdaanBahiRow` was the only code consumer of `yogdaan.status.*`; removed those 10 keys/locale. The refactor of `ActiveContributionCard` also orphaned `active_contribution.yellow_pill` + `_a11y` (2 keys/locale) — removed as well to prevent the exact drift the story warns about. **Preserved:** `yogdaan.row_a11y`, `yogdaan.col.status`, all `note.status.*` (the PDF's intentionally richer register). **Code review (2026-07-27) follow-up:** `upi_intent.yellow_pill*` (2 keys/locale) were left live on `pay.tsx` in the original dev pass — this was a genuine miss (a third inline pill, same pattern), now also refactored onto `<StatusPill>` and those keys removed too (see below).
- **Consumer refactors (AC4 — one visual language).** `YogdaanBahiRow` inline `STATUS_TONE` (incl. stopgap-blue `held`) + inline pill deleted → `<StatusPill size="tiny">`; the 56pt fixed height + `getItemLayout` + every-5th-row rule + `rowA11y` composite (still resolves the status LABEL, now from the DS-owned `statusPill.*` key) are unchanged. `ActiveContributionCard`'s hand-rolled yellow pill → `<StatusPill status="yellow" size="default" live>`. PDF `note-template.ts` `held` ink → `status-held`. `sample-data.ts` `statuses` now includes `'held'`. **Code review (2026-07-27) follow-up:** `apps/mobile/app/(contribution)/pay.tsx`'s attested-confirmation pill (a fourth inline instance, missed in the original pass) → `<StatusPill status="yellow" size="default" live>`, same as `ActiveContributionCard`; `upi_intent.yellow_pill` + `_a11y` (2 keys/locale) removed after confirming no other consumer.
- **Copy trade-off, deliberate not silent (code review 2026-07-27 follow-up).** Two surfaces previously showed a longer explanatory sentence in place of the terse DS label: `ActiveContributionCard` ("You've told us you paid. We're checking it against our bank records and will confirm once it matches.") and `pay.tsx`'s confirmation screen ("Thank you. You've told us you paid, and we're now checking it against our bank records. We'll confirm once it matches."). Both are now `<StatusPill status="yellow">`, showing only "Verifying" / "मिलान हो रहा है" (the frozen AC2 copy). This is an accepted consequence of AC4's "one visual language" + D2's verbatim-consolidation onto `statusPill.*` — reintroducing bespoke per-surface explanatory sentences would recreate the exact copy drift 9.6 exists to eliminate. Recorded here as a deliberate trade-off (not a silent regression), matching the discipline already applied to the live-region decision above.
- **`status-held` mobile/PDF color, deliberate approximation not a literal match (code review 2026-07-27 follow-up).** The mobile `<StatusPill>` never resolves `vm.colorTokenRole`; `held` renders via Tamagui's `$purple` scale (no slate-indigo scale exists in Tamagui) while the PDF resolves the literal `status-held` hex (`#4b4f66`) directly from `@twt/tokens`. This mirrors the pre-existing architecture for yellow/green/red/grey (mobile has always bridged tone→Tamagui-scale independently of the PDF's token hex) rather than a new gap introduced for `held`. BigDev confirmed (2026-07-27 code review): accept the approximation, do not add an exact-match mobile token; `note-template.ts`'s comment and `deferred-work.md`'s closure note were corrected to describe "aligned in meaning" rather than "one authority" / "single authority both resolve."
- **Live-region decision (ActiveContributionCard, deliberate — not silent).** The pre-9.6 attested pill set `accessibilityLiveRegion="polite"` on its View — a second live region alongside the always-present tone-gradient paragraph, contradicting the file header's "single live region" claim. **Chose option (a): PRESERVE parity** by threading a `live` prop into `<StatusPill>` (default off, so the passbook row does NOT double-announce inside its already-announced row; the card opts in). Rationale: the attested confirmation is a genuine state change worth announcing and its content differs from the tone-gradient nudge; dropping it would be a silent a11y regression, which the story forbids. Not converted to a double-announce "fix" (that would be a separate, deliberate change out of this story's scope).
- **`held` mobile tone.** Tamagui has no slate-indigo scale; mapped `held` → `$purple` (the closest dignified cool-neutral, distinct from grey and from the removed stopgap-blue), aligned to the `status-held` intent. The canonical hex authority remains `@twt/tokens` `status-held`, which the PDF resolves directly (the "one authority" of D3).
- **Icon type.** Avoided a direct `@tamagui/helpers-icon` import (transitive dep) by deriving `IconComponent = typeof Clock` — keeps the mobile package's declared-dependency surface clean.
- **Frozen surfaces untouched (verified).** No change to `deriveContributionStatus`, `CONTRIBUTION_STATUSES`, the precedence, the `@twt/contracts` enum, or any `contribution.*`/`reconciliation.*` event type. 9.6 adds NO `contribution.*` type — the 8.10 no-ingest fence stays green. No ADR (taxonomy already recorded in ADR-0035 + the 9.5 addendum).
- **Emulator eyeball (honest scope).** Booted the Pixel_9 AVD, built + installed via `expo run:android` (BUILD SUCCESSFUL; Metro bundled 4317 modules; Tamagui compiled `StatusPill`; app launched no-redbox). This verifies the component + refactors compile and mount **on-device** — a genuine integration check beyond the unit gates. What was NOT done: the live per-tone visual eyeball of AA-contrast / Devanagari-clip in a populated Yogdaan Bahi — that screen is auth-gated and reads the real API (the `held` sample-data addition only feeds the test fixture, which no runtime screen renders), and `held`/`green` have no live producer yet. AA contrast is proven mathematically (7.76:1) and all 5 tones by test; the final on-device colour eyeball is left as an explicit reviewer step once a data-populated passbook is reachable — recorded, not fabricated ([[feedback_record_unattested_no_backfill]]).

### File List

**New**
- `packages/ui/src/status-pill/view-model.ts`
- `packages/ui/src/status-pill/spec.ts`
- `packages/ui/src/status-pill/presenter.ts`
- `packages/ui/src/status-pill/i18n-keys.ts`
- `packages/ui/src/status-pill/index.ts`
- `packages/ui/tests/status-pill/presenter.test.ts`
- `apps/mobile/components/status-pill/StatusPill.tsx`
- `apps/mobile/tests/unit/status-pill-render.test.ts`

**Modified**
- `packages/ui/src/index.ts` (barrel export)
- `packages/ui/package.json` (`@twt/tokens` devDependency — for the dangling-token gate)
- `pnpm-lock.yaml` (regenerated by `pnpm install` for the new `@twt/ui` → `@twt/tokens` workspace devDep link)
- `packages/tokens/src/tokens.ts` (`status-held` role)
- `packages/tokens/src/theme.css` (regenerated)
- `packages/tokens/tests/tokens.test.ts` (new-role coverage + held≠grey)
- `packages/i18n/locales/en/common.json` + `packages/i18n/locales/hi/common.json` (`statusPill.*`)
- `packages/i18n/locales/en/contribution.json` + `packages/i18n/locales/hi/contribution.json` (removed orphaned `yogdaan.status.*` + `active_contribution.yellow_pill*`)
- `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx`
- `apps/mobile/components/yogdaan-bahi/sample-data.ts`
- `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`
- `apps/api/src/modules/member-pool/note-template.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md` (9.5 held-inconsistency deferral closed)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (9-6 → in-progress → review)

### Change Log

- 2026-07-27 — Story 9.6 implemented: `<StatusPill>` 5-state DS component. New `@twt/ui` pure presenter (contract-keyed, `satisfies`-gated), `status-held` token, `statusPill.*` copy in `common.json`, Tamagui render in `apps/mobile`, all inline pills refactored onto the component, PDF `held` ink reconciled, 9.5 held-inconsistency deferral closed. All gates green (`ci:local` 28 jobs).
