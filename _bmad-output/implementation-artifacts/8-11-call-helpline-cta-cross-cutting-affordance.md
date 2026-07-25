---
baseline_commit: 554fcdf9e8f3b7468ef17278019f709e52c79592
---
<!-- Powered by BMAD-CORE™ -->

Status: done

# Story 8.11: `<CallHelplineCTA>` Cross-Cutting Affordance (UX-DR49) `[SURFACE]`

## ⚠️ Read this first — the component ALREADY EXISTS. Do not build a second one.

`<CallHelplineCTA>` was shipped in **Story 6.2** and lives at
`apps/mobile/components/claim/CallHelplineCTA.tsx`. It is already the one-tap-to-`tel:` affordance,
already used on **8 call sites** (6 claim screens + the two contribution surfaces `pay.tsx` and
`UpiFailureCoach`). Two prior reviews already hardened it — the `chromeless`/`theme`/`height` props
exist *precisely so you never re-implement the `tel:` `Linking` call just to get a different button
style*, and the "avoid two 'Call us' buttons on one screen" rule is already documented at both
existing contribution call sites.

**This story is therefore NOT "create a helpline CTA."** It is four narrow things:

1. **Relocate** the shipped component out of `components/claim/` (its accidental Epic-6 home) into a
   shared home that matches its genuinely cross-cutting role — with a re-export shim so **every
   existing claim call site stays byte-identical**.
2. **Fill the two contribution surfaces that still lack it** — the My Pool card
   (`ActiveContributionCard`, Story 8.2) and the Yogdaan Bahi (Story 8.6) — plus the **Contribution
   Note screen** (`note/[id].tsx`, Story 8.7).
3. **Fill the PDF footer slot Story 8.7 explicitly reserved for this story**
   (`note-template.ts:316`) with a printed, bilingual helpline line — because a PDF *escapes the
   self-view boundary* and a bereaved member forwarding it needs the number on the artifact itself.
4. **Mechanize the invariant** — a source-scan test (the 8.10 no-ingest-path fence pattern) that
   **fails if any named contribution surface drops the affordance**, so "cross-cutting" is executable
   rather than aspirational.

**The single biggest failure mode for this story is re-inventing the wheel** — grep first, reuse
always. The second is breaking a shipped claim screen during the relocation.

---

## Story

As **any member at any point in the contribution loop who needs human help**,
I want **the "Call helpline" affordance to be always one tap away — never more than 2 taps from any
contribution-related surface**,
So that **human help is structurally accessible and the AR-61 staff-fallback commitment is honoured
at every node of Sushil's contribution loop, not just the claim loop where it first shipped.**

## Context & Scope (read before Task 0)

This is a `[SURFACE]` story whose deliverable is **presence + a home + teeth**, not a new feature.
The component's behaviour is already correct; the gap is *coverage* (two surfaces + a PDF footer
missing it) and *placement* (it lives under `claim/` but UX-DR49 makes it cross-cutting).

| Belongs to 8.11 (this story) | Deferred / owned elsewhere |
| --- | --- |
| **Relocate** `CallHelplineCTA.tsx` → a shared home (`apps/mobile/components/common/`) + a re-export at the old `components/claim/` path so all 6 claim call sites + the 2 shipped contribution call sites are **untouched** | **Rewriting the component's internals.** The `tel:` `Linking` logic, the `label`/`chromeless`/`theme`/`height` prop contract, and the two hardening review findings are correct — carry them verbatim |
| **Add the CTA to the 3 surfaces that lack it** — `ActiveContributionCard` (8.2), `YogdaanBahi` (8.6), the Contribution Note screen `note/[id].tsx` (8.7) — each ≥56pt, third-tier / low-emphasis (UX-DR62) | **The amount-/reconciliation-mismatch RED surface.** That surface is **Epic 9** (the red pill is `contribution.reconciliation-mismatch`, unbuilt). The `amount_mismatch.*` copy keys exist but have no render site yet; 8.11 does **not** manufacture that screen. When Epic 9 builds it, the same shipped CTA goes on it |
| **Fill the PDF footer slot** at `apps/api/.../note-template.ts:316` (the slot 8.7 reserved *by name*) with a **printed, static, bilingual** helpline line (a PDF is not tappable — it carries the *number*, not a `tel:` button) | **A tappable CTA "inside" the PDF.** A PDF cannot host a React `<Button>`; the artifact carries printed text. The tappable CTA for the note *flow* goes on the note **screen** (mobile), which this story adds |
| **Decouple the default label from the `claim` namespace** — the shipped default reads `t('shell.call_help', …, {namespace:'claim'})`; move the default copy to the `common` namespace so a contribution surface that renders it with no `label` gets contribution-appropriate (namespace-neutral) copy | **Per-surface label overrides.** The existing pattern — each surface passes its own contextual `label` (`upi_intent.get_help`, `upi_failure.guidance.helpline_label`) — is correct and stays. Only the *default* moves |
| **The mechanized cross-surface presence fence** — a source-scan test that reads the named surface files and fails if one stops referencing `<CallHelplineCTA>` (the 8.10 `no-ingest-path.test.ts` source-scan pattern; the mobile harness is pure-Vitest, **no RTL render**) | **A render/RTL snapshot harness.** `apps/mobile` has no `@testing-library/react-native`; its 9 test files are pure-function unit tests. Do **not** introduce a render harness for one story — scan the source, the 8.10 way |
| **Governance registration** — `friction-budget.md` disposition (declaration affirmed, no new row) | **The out-of-hours callback bottom-sheet** (UX-DR49's second half) + **Story 10.x helpdesk routing-policy registry** wiring. Both need the Epic-10 helpdesk backend, unbuilt. Declared as forward seams, not wired (the 8.9/8.10 declared-seam convention) |

**Two things this story must not do.** It must not put **two** helpline CTAs on one screen (the
shipped review rule — honour the recovery ladder, one fallback per surface). And it must not let the
helpline CTA **outrank the surface's primary action** — on the My Pool card the Contribute CTA
(warm-red, 56pt) is the primary; helpline is the **third tier** of the recovery ladder (UX-DR62:
self-recovery → in-flow help → helpline) and must render **≥56pt for touch but visually subordinate**
(chromeless, no accent).

## Acceptance Criteria

Each AC cites the authority it honours.

**AC1 — Presence on every contribution surface (the `epics.md:3051` deliverable).**
**Given** UX-DR49 (`epics.md:440`, the cross-cutting fallback reachable from *every* user-facing
component) + AR-61 (`epics.md:349`, staff-fallback at every node) + the shipped `<CallHelplineCTA>`
**When** the affordance is wired across the contribution loop
**Then** `<CallHelplineCTA>` is rendered on **all** of: the **My Pool card** (`ActiveContributionCard`,
Story 8.2), the **UPI Intent flow** (`pay.tsx`, Story 8.4 — already present, keep), the **UPI failure
coach** (`UpiFailureCoach`, Story 8.5 — already present, keep), the **Yogdaan Bahi** (`YogdaanBahi`,
Story 8.6), and the **Contribution Note screen** (`note/[id].tsx`, Story 8.7)
**And** every **error / load-failed / not-found branch** on those surfaces (the note screen's `error`
+ `not_found` phases; the Yogdaan Bahi's `isError` branch; the pay screen's `loadFailed` branch —
already present) carries the affordance, so a member is never stranded on a dead end
**And** it is **never more than one tap** to reach the affordance from any of those surfaces (it is
rendered *on* the surface), satisfying the "≤ 2 taps" commitment (`epics.md:3044`)
**And** **no surface renders two** helpline CTAs simultaneously (the shipped `UpiFailureCoach`/`pay.tsx`
`!coachGuidanceShowing` discipline — replicate it wherever a coach/guidance sub-view already offers one).

**AC2 — The dial-out behaviour + the Pariwar-number / routing-registry forward seam (`epics.md:3052`).**
**Given** the shipped `tel:`-`Linking` behaviour (`CallHelplineCTA.tsx:48-50`) + `epics.md:3052`
("tapping initiates a call to the Pariwar's helpline number; routed to Story 10.x helpdesk
routing-policy registry")
**When** the CTA is tapped
**Then** it opens the native dialer via `Linking.openURL('tel:' + <number>)` against the resolved
helpline number — **carry the shipped `EXPO_PUBLIC_HELPLINE_TEL` env-var seam verbatim** (per the
multi-Pariwar per-build provisioning model of Story 1.15, the per-build env value *is* "the Pariwar's
helpline number" for v1)
**And** the **Story 10.x helpdesk routing-policy registry** call and any **server-side per-Pariwar
number resolution** are recorded as a **declared forward seam** (the 8.9/8.10 convention) — **not**
wired, **not** faked; a code comment + a `deferred-work.md` entry name Epic 10 as the re-trigger. Do
**not** invent a routing-registry client or a `helpline_number` passport column in this story.

**AC3 — Touch target ≥56pt + third-tier recovery-ladder subordination + P0-2c accessibility (`epics.md:3053`).**
**Given** `epics.md:3053` (visually distinct + touch-target ≥56pt + accessible per Story 0.10 P0-2c)
+ UX-DR62 (three-tier recovery ladder: self-recovery → in-flow help → **helpline last**) + UX-DR52
(≥56pt is the *critical* category; the helpline CTA is a *fallback*, not the primary)
**When** the CTA renders on a contribution surface
**Then** its touch target is **≥56pt on the 3 newly-wired surfaces** (My Pool card, Yogdaan Bahi,
Contribution Note screen) — pass an explicit `height={56}` at each, matching the shipped `pay.tsx`
no-VPA usage (`chromeless={false} theme="red" height={56}`) — do **not** rely on the chromeless
`size="$4"` default, which is < 56pt
**And** the **2 already-shipped contribution call sites keep their existing, previously-reviewed
heights unchanged** — `pay.tsx`'s `loadFailed`-branch CTA (plain, no explicit height) and
`UpiFailureCoach.tsx` (`height={48}`) are **not** retroactively bumped to 56pt as a side effect of this
story; AC1's "already present, keep" governs them, not this AC's ≥56pt floor
**And** it is **visually subordinate** to that surface's primary action — chromeless / low-emphasis,
**no warm-red accent** (the accent is spent on the surface's primary, e.g. the Contribute CTA); the
member reads it as the *third* option, not the first (UX-DR62 ordering preserved)
**And** it carries `accessibilityRole="button"` + a screen-reader `accessibilityLabel` equal to its
visible text (the shipped component already does this), inheriting the Story 0.10 P0-2c gate
(`epics.md:855`; VI/low-vision validation) and the WCAG-AA colour-independence floor (UX-DR67 — the
affordance never signals by colour alone).

**AC4 — The PDF footer helpline line (the slot Story 8.7 reserved by name).**
**Given** `note-template.ts:316-320` ("Footer slot RESERVED for Story 8.11's `<CallHelplineCTA>`,
which explicitly lists this artifact among its surfaces (epics.md:3049). 8.7 leaves the slot and does
NOT build the CTA.")
**When** the footer is authored
**Then** the `<footer>` in `apps/api/src/modules/member-pool/note-template.ts` carries a **printed,
static, bilingual** helpline line (Devanagari + English gloss, the artifact's established `hi · en`
pattern) — a member forwarding the PDF sees the number **on the paper**
**And** the number reaches the composition through a **server-side source** decided in Task 0 (env var
mirroring the mobile seam, or the existing `facts.branding` object if a helpline field is added there)
— resolved server-side, never hard-coded into the template literal; if no clean source exists, the
line is authored with a **`[PENDING — Epic 10 per-Pariwar helpline resolution]`** placeholder token
and a deferred-work entry, **never** a fabricated number
**And** the printed copy is **not** a `tel:` link (a PDF is static text) and is **dignified** — "Need
help? Call …", never "Error", "Failed", "Problem" (UX-DR55 Pattern 4; the artifact's honesty rules
from Story 8.7 hold).

**AC5 — Relocation to a shared home + i18n default decoupling, with zero claim-surface regression.**
**Given** the component's genuinely cross-cutting role (UX-DR49) vs its accidental `components/claim/`
home + the "don't reinvent / wrong file location" mandate
**When** the component is relocated
**Then** the canonical file moves to **`apps/mobile/components/common/CallHelplineCTA.tsx`** (a shared,
role-appropriate home), and **`apps/mobile/components/claim/CallHelplineCTA.tsx` becomes a thin
re-export** (`export { CallHelplineCTA, type CallHelplineCTAProps } from '../common/CallHelplineCTA'`)
so **all 5 existing claim call sites import unchanged and render byte-identically** (the 8.8
relocation-with-re-export precedent, [[project_channels_no_live_dispatch_yet]])
**And** the **default label** is decoupled from the `claim` namespace: the component no longer defaults
to `useClaimT()`/`shell.call_help`; instead the default reads a **namespace-neutral `common`** key
(e.g. `common.json` `call_helpline.label`, "Call us — we'll help" / hi parity) so a contribution
surface rendering it with **no** `label` gets appropriate copy — while every existing call site that
passes an explicit `label` is **unaffected**
**And** the two contribution surfaces already using it (`pay.tsx`, `UpiFailureCoach`) and the three
new ones import from the **`common/`** path; claim surfaces may keep the `claim/` re-export or move to
`common/` (state which, and keep the re-export regardless so nothing breaks)
**And** the claim screens are **visually unchanged** — the relocated default copy must equal what
`claim shell.call_help` rendered (verify the string; if it differs, the claim call sites pass an
explicit `label` to preserve their exact text — no silent copy drift on a shipped grief-paced screen).

**AC6 — i18n copy: bilingual parity, grade-6, dignified, gate-clean.**
**Given** the bilingual-surface contract (Story 2.1) + the microcopy tone gate (`contribution.json` is
already in `copy_globs`; `common.json` is **not** — this story is the first to land real member copy
there) + UX-DR55 Pattern 4 (dignified, no "Error/Invalid/Failed" framing)
**When** any new or moved copy key lands
**Then** the new `common` default-label key (+ any new per-surface label for the My Pool card / Yogdaan
Bahi / note screen, if the existing `*.get_help` keys don't fit) exists in **both** `en` and `hi` with
key-for-key parity, grade-6 reading level, Hindi as **first-class Devanagari register** (not
transliteration), and passes `pnpm --filter @twt/i18n i18n:check-parity`
**And** the PDF footer's helpline copy is added to the `note.*` `contribution` keys (bilingual) the
server template reads via `hi()` / `en()`
**And** `common.json` is added to `microcopy.yaml`'s `copy_globs` **with teeth** — a dedicated
`scripts/microcopy/common.test.ts` on the existing per-namespace pattern (`contribution.test.ts` /
`out-of-band.test.ts`: real-fixture pass + a planted tone-rule violation that fails + revert-sanity) —
mirroring the convention every prior namespace addition followed; a green `microcopy:check` over a file
the gate never reads proves nothing ([[feedback_gate_scope_semantic_coverage]])
**And** `pnpm microcopy:check` is **green** across all `copy_globs` (now including `common.json`) — the
helpline copy trips **no** tone rule (no blame/scarcity/alarm framing); the affordance's register is
warm-neighbour, not transactional.

**AC7 — The mechanized cross-surface presence fence (the teeth) + friction-budget disposition.**
**Given** [[feedback_gate_scope_semantic_coverage]] (a "cross-cutting" claim is complete only when an
invariant *meaningfully* covers the surface) + the 8.10 `no-ingest-path.test.ts` **source-scan** fence
pattern (the mobile harness is pure-Vitest — **no** RTL render available)
**When** the fence is authored (e.g. `apps/mobile/tests/unit/helpline-cta-presence.test.ts`)
**Then** it reads the **real source** of each named contribution surface — `ActiveContributionCard.tsx`,
`YogdaanBahi.tsx`, `note/[id].tsx`, `pay.tsx`, `UpiFailureCoach.tsx` — and asserts each **references
`<CallHelplineCTA>`**, so a future edit that drops the affordance from any of them **fails the test**
**And** the fence is **revert-sanity proven**: remove the CTA from one surface → the test **fails** →
restore → **green**; paste the evidence into the Dev Agent Record (a green presence-assertion that
cannot fail is worthless — the 8.10 revert-sanity rule)
**And** `friction-budget.md` gains a **Story 8.11 disposition (declaration affirmed, no new row)** after
the 8.10 entry: adding an *escape-hatch* CTA to existing mobile surfaces + a printed PDF footer line
introduces **zero** new member step/form/gate/upload and **zero** `apps/public` page-weight → baseline
untouched ([[project_friction_budget_baseline_ratchet]]).

## Tasks / Subtasks

### Task 0 — Recon (do this first; do NOT skip)
- [x] Read the shipped component end-to-end: `apps/mobile/components/claim/CallHelplineCTA.tsx` — note the `label`/`chromeless`/`theme`/`height` contract and the two prior review findings baked into the header comment. **You are moving this file, not rewriting it.**
- [x] Enumerate **all 8 current call sites** (`grep -rn "CallHelplineCTA" apps/mobile`): the 6 claim files (`nominee-review.tsx` ×3, `consent.tsx`, `ClaimProxyFlowShell.tsx`, `ClaimProxyFlowEntry.tsx`, `AppealStatusCard.tsx`, `ShepherdContactCard.tsx` ×2) and the 2 contribution ones (`pay.tsx` ×3, `UpiFailureCoach.tsx`). Write the list into the Dev Agent Record — these are your regression surface for AC5.
- [x] Confirm the **relocated default copy** question: what does `claim` `shell.call_help` render today (both locales)? Read `packages/i18n/locales/{en,hi}/claim.json`. Decide whether the `common` default equals it (no visual drift) or whether claim call sites must pass an explicit `label` to preserve exact text. Record the decision.
- [x] Read the three surfaces that **lack** the CTA to find the correct insertion point + primary action to stay subordinate to: `ActiveContributionCard.tsx` (below the Contribute-CTA / yellow-pill block, inside the card's `YStack`), `YogdaanBahi.tsx` (**must not** go inside the `FlatList` — home it in a stable footer region **outside** the list, respecting [[project_fabric_flatlist_empty_populated_crash]]; the sticky footer or a region below it), `note/[id].tsx` (below the download CTA).
- [x] Read `apps/api/src/modules/member-pool/note-template.ts:311-321` (the reserved footer slot) + `note-assets.ts` + how `facts.branding.*` and `hi()`/`en()` reach the template. Decide the **server-side helpline-number source** for AC4 (env var mirroring `EXPO_PUBLIC_HELPLINE_TEL`, or a `facts.branding` field) — or the `[PENDING — Epic 10]` placeholder if none is clean.
- [x] Read `friction-budget.md:668` (the 8.10 disposition) for the exact disposition wording to mirror, and `apps/mobile/tests/unit/appeal-status.test.ts` + `packages/domain/tests/contribution/no-ingest-path.test.ts` for the source-scan test structure (read real files, assert, revert-sanity).

### Task 1 — Relocate the component + re-export shim (AC5)
- [x] Move `apps/mobile/components/claim/CallHelplineCTA.tsx` → `apps/mobile/components/common/CallHelplineCTA.tsx`. Update its header comment: it is now the **cross-cutting** helpline affordance (UX-DR49 + AR-61), homed in `common/` because it serves both the claim loop **and** the contribution loop. Keep the prop contract + both review findings verbatim.
- [x] Replace the default-label wiring: the component no longer imports `useClaimT`. Default `label` now resolves from the **`common`** namespace (`t('call_helpline.label')` via `useT()`, which defaults to `common`), so it is namespace-neutral. Callers passing an explicit `label` are unchanged.
- [x] Create `apps/mobile/components/claim/CallHelplineCTA.tsx` as a **thin re-export**: `export { CallHelplineCTA, type CallHelplineCTAProps } from '../common/CallHelplineCTA'`. All 6 claim call sites compile + render unchanged (byte-identical import paths). Task-0 recon confirmed **no copy drift**: the `common` default is byte-identical to `claim shell.call_help` in both locales, so the 7 bare claim usages render unchanged with no explicit `label` added.
- [x] Point the two shipped contribution call sites (`pay.tsx`, `UpiFailureCoach.tsx`) at the new `../common/CallHelplineCTA` path (the contribution loop should not import from `claim/`).

### Task 2 — Add the CTA to the My Pool card (AC1, AC3)
- [x] In `ActiveContributionCard.tsx`, render `<CallHelplineCTA>` **below** the Contribute-CTA / yellow-pill block, inside the card `YStack`. **Third-tier, subordinate**: `chromeless` (default), no `theme="red"` accent, `height={56}` (≥56pt touch floor per AC3). It renders in **both** the `attested` (yellow-pill) and `none` (contribute) branches (placed after the ternary) — help is available whether or not the member has contributed.
- [x] Label: the neutral `common` default reads correctly here ("Call us — we'll help"), so no per-surface key was introduced. A single low-emphasis line — it does not compete with the warm-red Contribute CTA (UX-DR62 ordering).
- [x] Confirm the card's single-live-region a11y posture (the tone-gradient Paragraph is the one polite live region) is **unbroken** — the helpline CTA is a `button`, not a live region.

### Task 3 — Add the CTA to the Yogdaan Bahi (AC1, AC3) — mind the Fabric FlatList
- [x] In `YogdaanBahi.tsx`, render `<CallHelplineCTA>` in a **stable region OUTSIDE the `FlatList`** — not a list item/header/footer *component*. Added below `<StickyFooter>` in **both** top-level `return` blocks (the `rows.length === 0` empty/loading/`isError` branch and the populated-list branch), each inside its own outer `YStack`, so it is present in all three states. The exact `rows.length === 0` gating (the Fabric-crash fix) is preserved unchanged — the two returns were NOT merged ([[project_fabric_flatlist_empty_populated_crash]]).
- [x] `chromeless`, `height={56}`, subordinate. On the `isError` branch it sits below the existing Retry button (self-recovery first per UX-DR62; helpline is the chromeless fallback below it) — Retry stays the primary, no two competing primaries.

### Task 4 — Add the CTA to the Contribution Note screen + fill the PDF footer (AC1, AC4)
- [x] In `apps/mobile/app/(contribution)/note/[id].tsx`, render `<CallHelplineCTA height={56} />` below the download/retry `Button`, inside the screen `YStack` — present in **all** phases (`idle`, `preparing`, `error`, `not_found`, `saved_no_share`); the `error`/`not_found` branches are not dead ends.
- [x] Fill the reserved PDF footer at `note-template.ts`: added a **printed bilingual** helpline line to the `<footer>` (Devanagari + `<span class="gloss">` English gloss + the Latin number in a `<span class="tel">`, mirroring the tagline pattern). The number is resolved server-side (see Q2) and threaded in as the `helpline` arg — **never** hard-coded, never fabricated.
- [x] Add the footer's `note.helpline` copy key (bilingual) to `packages/i18n/locales/{en,hi}/contribution.json` so the template's `hi()`/`en()` resolve it. Honesty rules from 8.7 held (help-access, not status/acknowledgement; the microcopy vocabulary gate caught + I removed a "receipt" token in my own comment).

### Task 5 — i18n copy (AC6)
- [x] Added `call_helpline.label` to `packages/i18n/locales/{en,hi}/common.json` (byte-identical to the shipped `claim shell.call_help`, grade-6, first-class Devanagari, dignified). Added the PDF footer `note.helpline` key to `{en,hi}/contribution.json`.
- [x] Added both `packages/i18n/locales/{en,hi}/common.json` entries to `microcopy.yaml`'s `copy_globs`, and authored `scripts/microcopy/common.test.ts` on the per-namespace pattern: real-fixture clean-scan + a scope-presence assertion + planted tone-rule violations (scarcity/panic/blame, both locales) that fire + a no-over-reach guard on the real label. Evidence in the Completion Notes.
- [x] `pnpm --filter @twt/i18n i18n:check-parity` ✓ (7 namespaces incl. `common`).
- [x] `pnpm microcopy:check` ✓ (12 copy files now incl. `common.json`; no tone/vocab violation).

### Task 6 — The mechanized presence fence (AC7)
- [x] Authored `apps/mobile/tests/unit/helpline-cta-presence.test.ts` on the 8.10 source-scan pattern: reads the real source of `ActiveContributionCard.tsx`, `YogdaanBahi.tsx`, `note/[id].tsx`, `pay.tsx`, `UpiFailureCoach.tsx`; asserts each **imports AND renders** `<CallHelplineCTA` (not merely a comment mention); names the offending surface on failure. 7 tests pass.
- [x] **Revert-sanity, recorded:** removed the CTA render from `ActiveContributionCard` → fence went **red** naming that surface ("imports but never RENDERS <CallHelplineCTA>") → restored → **green** (7/7). Evidence in the Completion Notes.
- [x] Also asserts the PDF template footer references the `note.helpline` copy key (both `hi('note.helpline')` and `en('note.helpline')`), so the artifact line can't silently regress either.

### Task 7 — Governance + verification
- [x] `friction-budget.md` — appended the **Story 8.11 disposition (declaration affirmed, no new row)** after the 8.10 entry: an escape-hatch CTA added to existing mobile surfaces + a printed PDF footer line; zero new member step/form/gate/upload; `apps/public` untouched; baseline untouched ([[project_friction_budget_baseline_ratchet]]).
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` — recorded the two forward seams with [[feedback_closure_language_precision]] wording (deferred **with a gate**): (i) the **Story 10.x helpdesk routing-policy registry** + **per-Pariwar server-side number resolution**; (ii) the **out-of-hours callback bottom-sheet** (UX-DR49 second half). Both re-trigger: Epic 10.
- [x] `pnpm ci:local` **28/28 green** with `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable'`. (A first run with a malformed URL cascade-failed `test`/`crypto-check`/`integration-tests`; both non-DB jobs confirmed green in isolation, then the whole gate green with the correct URL — [[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]].)
- [x] Confirmed `openapi/v1.yaml` **byte-identical** (untouched) and `git diff --stat` shows **no** migration/schema/route change. `apps/api` edits: `note-template.ts` (the reserved footer + CSS + optional `helpline` param) and `handlers.ts` (2-line server-side number resolution feeding the template — required by AC4's "resolved server-side" while keeping the template pure and the contract untouched). `packages/contracts`, `packages/domain/migrations` untouched.
- [ ] **UN-ATTESTED (BigDev decision 2026-07-25): the live Android-emulator eyeball was NOT performed this session** ([[feedback_record_unattested_no_backfill]] — recorded openly, not faked). No emulator was booted; the 3 surfaces are server-data-gated (assigned pool / contribution history) so reliably reaching them in-session was uncertain, and the prebuilt APK is stale. **Substituting static coverage:** mobile `tsc` + `eslint` clean; the presence fence (revert-sanity proven) guarantees each surface renders `<CallHelplineCTA`; the `common` default is byte-identical to the shipped claim string so there is **no visual copy drift** by construction; the Fabric-FlatList crash risk is handled structurally (CTA outside the list, in both returns, `rows.length===0` gate preserved). **Owed:** a device eyeball of the 3 surfaces (present, ≥56pt, subordinate to the primary, one tap dials out) — especially the Yogdaan Bahi, per the 8.6 habit that surfaced [[project_fabric_flatlist_empty_populated_crash]].

### Review Findings

- [x] [Review][Patch] The server-side helpline number is fabricated/unprovisioned, not resolved — AC4 requires a `[PENDING — Epic 10]` placeholder when no clean source exists — `apps/api/src/modules/member-pool/handlers.ts:248`, `apps/mobile/components/common/CallHelplineCTA.tsx:27`. `HELPLINE_TEL` (the API-side var) appears nowhere except this diff's own two source files and story-doc prose — not in `apps/api/.env.example` (which documents every other required/optional var), not in any deploy manifest, no config.ts validation. The code's justification ("mirrors the Story 1.15 per-build `EXPO_PUBLIC_HELPLINE_TEL` seam") doesn't hold up: Story 1.15's own docs establish `apps/api` as a single shared multi-tenant deployment, not per-Pariwar builds, so there is no real per-build server value to mirror. In practice every Pariwar's Contribution Note PDF would print the identical hardcoded placeholder `+911800000000` in production — functionally a fabricated number, which is exactly the case AC4 says must use the `[PENDING — Epic 10 per-Pariwar helpline resolution]` token instead. **Fixed (BigDev decision, 2026-07-25): switched to the `[PENDING — Epic 10]` placeholder path** — `note-template.ts` gained `HELPLINE_PENDING_TOKEN`, `renderContributionNoteHtml`'s `helpline` param is now optional (`helpline?: string`) and the footer prints the pending token when it's absent; `handlers.ts` no longer resolves the fabricated `HELPLINE_TEL ?? '+911800000000'` default and calls `renderContributionNoteHtml(facts)` with no helpline arg; the `deferred-work.md` Story-10.x routing-registry entry updated to describe the pending-token state and name Epic 10 as the re-trigger. (The mobile `EXPO_PUBLIC_HELPLINE_TEL` `tel:` seam is unaffected — AC2 ratifies the per-build env value as the number for the tappable app CTA; only the PDF footer's fabricated-number path changed.) Verified: `pnpm --filter @twt/api typecheck` + `lint` green, `contribution-note-render.test.ts` green.
- [x] [Review][Patch] The AC7 presence fence's "teeth" are weaker than the test's own comments claim [apps/mobile/tests/unit/helpline-cta-presence.test.ts:49-57,75-81]. Two independent gaps: (a) both checks are raw `src.includes(...)` substring scans over unstripped file text, so a comment literally containing `<CallHelplineCTA height={56} />` or `hi('note.helpline')`/`en('note.helpline')` (the exact JSX-in-comment style already used elsewhere in this diff) would pass the fence with no real render/copy present — directly contradicting the test's own claim that "a surface that kept only a stale comment mentioning it would be caught by the render-tag assertion below"; (b) the check is file-level, not per-branch — on a file with multiple conditional return paths (e.g. `YogdaanBahi.tsx`'s two top-level returns), removing the CTA from just one branch while it survives in another would still pass, since the fence only asks "does this file contain the substring anywhere." **Fixed:** added a `stripComments()` helper (strips `//` and `/* */`) and applied it before every `includes` check in both `describe` blocks, closing gap (a). Gap (b) — per-branch coverage — is left as a documented limitation of the source-scan (no-AST) approach per D6, not fixed; see the deferred item below. Verified: `pnpm --filter @twt/mobile test` 48/48 green (incl. this file's 7 tests).
- [x] [Review][Patch] Dead/orphaned i18n key `shell.call_help` left behind in `claim.json` after the default-label relocation to `common.call_helpline.label` [packages/i18n/locales/en/claim.json:9, packages/i18n/locales/hi/claim.json:9]. Grep across `*.ts`/`*.tsx` confirms zero live readers — only a code comment in the relocated component references the old key name. **Fixed:** deleted the two now-dead entries. Verified: `pnpm --filter @twt/i18n i18n:check-parity` + `pnpm microcopy:check` green.
- [x] [Review][Defer] `ActiveContributionCard`'s pre-existing `if (!data || !data.assigned) return null` early return (Story 8.2, unchanged by this diff) means the newly-added helpline CTA never renders in the loading/unassigned/error state [apps/mobile/components/active-contribution/ActiveContributionCard.tsx:68-70,242] — deferred, pre-existing. AC1 explicitly enumerates which branches on which surfaces need the fallback (note screen's error/not_found, Yogdaan Bahi's isError, pay's loadFailed) and does not list this self-suppression case, so it reads as out of this story's stated scope rather than a regression — flagged for a possible follow-up if BigDev wants that state covered too.

### Post-ship tone revision (2026-07-25)

- [x] **Closed by edit.** A `bmad-editorial-review-prose` pass against `docs/tone-guide.md` (post-merge, story already `done`) flagged that AC5/D2's "byte-identical to claim `shell.call_help`" rationale meant the **same Hindi default** ("हमें कॉल करें — हम मदद करेंगे") rendered on both nominee/grief-respectful claim surfaces and member/calm-precise contribution surfaces — a §2 cross-class register question this human-check layer exists to catch. **BigDev decision: apply a unified, register-neutral Hindi revision everywhere the default fires** (claim + contribution), superseding the earlier "byte-identical to old claim copy" framing for the **Hindi string only** — English (`"Call us — we'll help"` / `"Need help? Call us"`) is unchanged. Hindi copy changed to **"सहायता के लिए कॉल करें"** ("Call for help") in all three places: `packages/i18n/locales/hi/common.json` (`call_helpline.label`), `packages/i18n/locales/hi/contribution.json` (`upi_failure.guidance.helpline_label`, `note.helpline`). This is an intentional visible-copy change on the 7 bare claim call sites (previously protected from drift) — accepted as a tone improvement, not a regression. Updated the stale real-fixture assertion in `scripts/microcopy/common.test.ts:100` to match. Verified: `pnpm --filter @twt/i18n i18n:check-parity`, `pnpm microcopy:check`, `scripts/microcopy/common.test.ts` (9/9), `apps/mobile/tests/unit/helpline-cta-presence.test.ts` (7/7), `apps/api/tests/unit/contribution-note-render.test.ts` — all green.

## Dev Notes

### Substrate map — what already exists (reuse it; do NOT reinvent)

| Need | Shipped at | Location |
| --- | --- | --- |
| The `<CallHelplineCTA>` component (the whole affordance) | 6.2 | `apps/mobile/components/claim/CallHelplineCTA.tsx` — `tel:` `Linking`, `label`/`chromeless`/`theme`/`height` props, 2 review findings baked in |
| The env-var helpline-number seam | 6.2 | `EXPO_PUBLIC_HELPLINE_TEL` (default placeholder `+911800000000`) |
| Two working contribution call sites (copy the pattern) | 8.4 / 8.5 | `pay.tsx` (`chromeless={false} theme="red" height={56}` no-VPA; plain in error branch) · `UpiFailureCoach.tsx` (`height={48}`; `!coachGuidanceShowing` no-double-CTA rule) |
| The My Pool card (needs it) | 8.2 | `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` |
| The Yogdaan Bahi (needs it; Fabric-FlatList sensitive) | 8.6 | `apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx` |
| The Contribution Note screen (needs it) | 8.7 | `apps/mobile/app/(contribution)/note/[id].tsx` |
| The reserved PDF footer slot (fill it) | 8.7 | `apps/api/src/modules/member-pool/note-template.ts:316-320` |
| The `common` i18n namespace (default-label home) | 2.1 | `packages/i18n/locales/{en,hi}/common.json` |
| Source-scan fence + revert-sanity pattern | 8.10 | `packages/domain/tests/contribution/no-ingest-path.test.ts` |
| Pure-Vitest mobile unit-test structure (no RTL) | many | `apps/mobile/tests/unit/*.test.ts` |
| Friction-budget disposition convention | 8.10 | `friction-budget.md:668` |
| Relocation-with-re-export precedent (no call-site churn) | 8.8 | [[project_channels_no_live_dispatch_yet]] |

### Load-bearing invariants this story must NOT break
- **Don't reinvent the component.** One `<CallHelplineCTA>`, relocated — never a second implementation of the `tel:` call (the exact anti-pattern the shipped `chromeless`/`height` props were added to prevent).
- **Zero claim-surface regression.** The re-export shim means the 6 claim call sites stay byte-identical; the relocated default copy must equal `claim shell.call_help` or the claim sites pass an explicit `label`. No silent copy drift on grief-paced claim screens.
- **Recovery-ladder ordering (UX-DR62).** Helpline is the **third** tier: self-recovery → in-flow help → helpline. It is ≥56pt for touch but **visually subordinate** (chromeless, no accent) and never outranks the surface's primary action. One fallback per surface — never two "Call us" buttons.
- **Fabric FlatList (8.6).** The Yogdaan Bahi CTA lives **outside** the `FlatList`, in a stably-mounted region — never as a list item/header/footer component that could reintroduce the empty→populated remount crash ([[project_fabric_flatlist_empty_populated_crash]]).
- **PDF honesty (8.7).** The footer line is help-access, not status; the artifact is never a "receipt"; dignified copy only (UX-DR55).
- **No fabricated helpline number.** The env-var seam or a real branding field, or a `[PENDING — Epic 10]` token. Never a hard-coded made-up number ([[feedback_record_unattested_no_backfill]]).
- **No contract / schema / migration change.** The only `apps/api` edit is the reserved footer + its copy keys. `openapi/v1.yaml` byte-identical.

### Decisions — ratified defaults, build to these
1. **D1 — Relocate to `components/common/` with a re-export shim.** UX-DR49 makes this cross-cutting; `components/claim/` was its accidental first home. A `common/` home + a `claim/` re-export honours the role **and** keeps all 6 claim call sites byte-identical (the 8.8 precedent). The contribution loop should not `import from '../claim/'`.
2. **D2 — Default label moves to the `common` namespace; per-surface `label` overrides stay.** The shipped `useClaimT()`/`shell.call_help` default is claim-coupled; a contribution surface rendering the bare component would get claim copy. Move the *default* to `common`; leave the existing explicit-`label` pattern (which most call sites already use) untouched.
3. **D3 — ≥56pt for touch, but chromeless/subordinate for the ladder.** The AC mandates ≥56pt (`epics.md:3053`); UX-DR62 mandates third-tier subordination. Both hold: explicit `height={56}` (touch floor) + `chromeless` default + no accent (visual subordination). ≥56pt touch ≠ primary visual weight.
4. **D4 — The PDF footer is a printed line, not a button; the note *screen* gets the tappable CTA.** A PDF can't host a React `<Button>`. 8.7 reserved the footer slot *by name* for this story — fill it with printed bilingual text carrying the number; put the tappable CTA on the note screen.
5. **D5 — Keep the env-var number seam; declare the Story-10.x routing registry + per-Pariwar resolution as forward seams.** Story 10.x helpdesk is unbuilt; the per-build env value *is* the Pariwar number under the current provisioning model. Record the registry wiring as deferred-with-a-gate, don't fake it. Same for the out-of-hours callback bottom-sheet (UX-DR49 second half).
6. **D6 — The teeth are a source-scan presence test, not an RTL render.** `apps/mobile` has no render harness and this story is not the place to add one. Scan the real surface source (the 8.10 way); prove it with revert-sanity.

### Anti-patterns — do NOT do these
- ❌ Writing a new "call helpline" button/component instead of reusing the shipped one.
- ❌ Re-implementing the `tel:` `Linking.openURL` call just to restyle the button (that's what `chromeless`/`theme`/`height` are for).
- ❌ Rendering two helpline CTAs on one screen (honour the `!coachGuidanceShowing` discipline).
- ❌ Making the helpline CTA the visual primary / warm-red accent on any surface — it is the third recovery tier.
- ❌ Adding the CTA as a `FlatList` item/header/footer on the Yogdaan Bahi (Fabric remount crash).
- ❌ Hard-coding a made-up helpline number into `note-template.ts`.
- ❌ Changing shipped claim-screen copy as a side effect of the relocation.
- ❌ Manufacturing the amount-/reconciliation-mismatch RED surface (that's Epic 9) to "have a mismatch surface to put the CTA on."
- ❌ Wiring a Story-10.x routing-registry client or adding a `helpline_number` passport/branding column (Epic 10 owns both).
- ❌ Adding a contract/migration/schema change or touching `openapi/v1.yaml`.

### Testing standards
- The **teeth** are the deliverable: `helpline-cta-presence.test.ts` must **fail** when a surface drops the CTA (revert-sanity proven, evidence in the Dev Agent Record) — a green presence-assertion that can't fail is worthless ([[feedback_gate_scope_semantic_coverage]]).
- `pnpm --filter @twt/i18n i18n:check-parity` + `pnpm microcopy:check` green (the copy floor).
- No live-DB work expected. If a spec you touch turns out DB-gated, follow [[project_live_db_test_gotchas]] (test DB `twt-test-pg` on `:5433`; never regenerate an applied migration; never `DROP SCHEMA`; assert membership, not counts).
- Merge gate = `pnpm ci:local` green ([[project_ci_actions_suspension_local_mirror]]); confirm a suspected failure in isolation before attributing it here ([[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]]).
- Emulator eyeball each newly-wired surface ([[project_mobile_android_emulator_setup]]) — the 8.6 habit that caught the Fabric crash.

### Project Structure Notes
- **Moved:** `apps/mobile/components/claim/CallHelplineCTA.tsx` → `apps/mobile/components/common/CallHelplineCTA.tsx` (+ a thin re-export left at the old path).
- **New:** `apps/mobile/tests/unit/helpline-cta-presence.test.ts`; `scripts/microcopy/common.test.ts` (teeth for the new `common.json` `copy_globs` entry).
- **Modified (mobile surfaces):** `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`; `apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx`; `apps/mobile/app/(contribution)/note/[id].tsx`; `pay.tsx` + `UpiFailureCoach.tsx` (import-path repoint only).
- **Modified (server, the reserved slot):** `apps/api/src/modules/member-pool/note-template.ts` (footer only).
- **Modified (copy):** `packages/i18n/locales/{en,hi}/common.json` (+ `call_helpline.*`); `packages/i18n/locales/{en,hi}/contribution.json` (+ PDF footer `note.*` keys, + any per-surface label); `microcopy.yaml` (`common.json` added to `copy_globs`).
- **Modified (governance):** `friction-budget.md`; `_bmad-output/implementation-artifacts/deferred-work.md`; `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **Expected untouched:** every `packages/domain/migrations/*`, every `apps/api` route/handler, `openapi/v1.yaml`, `packages/contracts/**`, `docs/legal/**`, `apps/public/**`.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.11 (L3041-3053) — the AC of record: surfaces, `tel:` + routing, ≥56pt + P0-2c]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR49 (L440) — cross-cutting fallback reachable from every user-facing component; recovery-ladder ordering; out-of-hours callback bottom-sheet]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR62 (L456) — Pattern 11, three-tier recovery ladder: self-recovery → in-flow help → helpline last]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR52/UX-DR65 (L446,462) — button hierarchy; ≥56pt critical touch category; ≥8pt spacing]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR55/UX-DR67 (L449,464) — Pattern 4 dignified validation; WCAG-AA colour-independence]
- [Source: _bmad-output/planning-artifacts/epics.md#AR-61 (L349) — staff-fallback at every node]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 0.10 (L855) — P0-2c VI/low-vision accessibility validation gate]
- [Source: apps/mobile/components/claim/CallHelplineCTA.tsx — the shipped component being relocated (do not rewrite)]
- [Source: apps/mobile/app/(contribution)/pay.tsx:235,253,374 · components/active-contribution/UpiFailureCoach.tsx:170 — the two working contribution call-site patterns to copy]
- [Source: apps/mobile/components/active-contribution/ActiveContributionCard.tsx · components/yogdaan-bahi/YogdaanBahi.tsx · app/(contribution)/note/[id].tsx — the three surfaces missing the CTA]
- [Source: apps/api/src/modules/member-pool/note-template.ts:311-320 — the footer slot 8.7 reserved by name for this story]
- [Source: packages/contracts/src/contributions/upi-intent.ts:77 — the shipped "tap Get help" seam note pointing at Story 8.11]
- [Source: packages/domain/tests/contribution/no-ingest-path.test.ts — the source-scan fence + revert-sanity pattern to mirror]
- [Source: friction-budget.md:668 — the Story 8.10 disposition wording to follow]
- [Source: _bmad-output/implementation-artifacts/8-10-out-of-band-contribution-policy.md — the [GOVERNANCE]/[SURFACE] house style: scope table, decisions, anti-patterns, teeth]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

### Completion Notes List

**Task 0 — Recon (complete).**

*Shipped component contract (do NOT rewrite).* `CallHelplineCTA.tsx` is 55 lines: props `label?`, `chromeless=true`, `theme?`, `height?`; `size={height ? undefined : '$4'}`; `HELPLINE_TEL = process.env.EXPO_PUBLIC_HELPLINE_TEL ?? '+911800000000'`; `onPress` → `Linking.openURL('tel:'+HELPLINE_TEL)`; `accessibilityRole="button"` + `accessibilityLabel={text}`. Default label = `useClaimT()('shell.call_help')` (the claim-coupling this story decouples). Two review findings baked into the header comment (don't re-implement the `tel:` call for styling; tenant-agnostic internal name) — carried verbatim.

*Regression surface — all 8 current call sites (AC5).* **6 claim** (rely on default copy via bare `<CallHelplineCTA />` unless noted): `app/(claim)/nominee-review.tsx` ×3 (263 bare, 268 bare, 306 `label={t('nominee.wrong')}`); `app/(claim)/consent.tsx` ×1 bare (181); `components/claim/ClaimProxyFlowShell.tsx` ×1 bare (52); `components/claim/ClaimProxyFlowEntry.tsx` ×1 bare (34); `components/claim/ShepherdContactCard.tsx` ×2 bare (101, 161); `components/claim/AppealStatusCard.tsx` ×1 bare (69). **2 contribution**: `app/(contribution)/pay.tsx` ×3 (235 & 374 `label={t('upi_intent.get_help', NS)}`; 253 `chromeless={false} theme="red" height={56}` no-VPA); `components/active-contribution/UpiFailureCoach.tsx` ×1 (170 `label=upi_failure.guidance.helpline_label chromeless={false} theme="red" height={48}`). ⇒ **7 bare claim usages depend on the default label** — the copy-drift risk for AC5.

*Q1 RESOLVED (default copy — no drift).* `claim shell.call_help` = **"Call us — we'll help"** (en) / **"हमें कॉल करें — हम मदद करेंगे"** (hi). Decision: the new `common` default key `call_helpline.label` is authored **byte-identical** to these two strings, so all 7 bare claim call sites render **unchanged**. No explicit `label` needs to be added to any claim site. `useT()` already defaults to the `common` namespace (`resolver.ts:55`; `catalog.ts` registers `common`), so `t('call_helpline.label')` resolves cleanly.

*Q2 RESOLVED (PDF number source).* No server-side helpline env exists; `facts.branding` comes from the Pariwar Passport and adding a field there = a forbidden contract change (`ContributionNoteFacts` lives in `packages/contracts`, expected-untouched). `renderContributionNoteHtml(facts)` is called at `handlers.ts:243`. Decision: thread the number as an **optional 2nd param** `renderContributionNoteHtml(facts, helpline?)` (contract untouched; template stays a pure function of its inputs), resolved **server-side in `handlers.ts`** by mirroring the shipped mobile seam — `process.env.HELPLINE_TEL ?? '+911800000000'` (the same documented v1 default the mobile CTA already dials; AC2 ratifies "the per-build env value *is* the Pariwar number for v1" — **not** a fabricated number). The Story-10.x per-Pariwar routing-registry + server resolution is the declared forward seam (AC4 first/preferred option, chosen over the `[PENDING]` token for member dignity on a forwarded PDF).

*Q3 RESOLVED (scope boundary).* Confirmed: the amount-/reconciliation-mismatch RED surface is **Epic 9** (`contribution.reconciliation-mismatch` unbuilt; the `no-ingest-path.test.ts` fence pins green+red as Epic-9-exclusive). 8.11 covers only the error/load-failed/not-found branches of the **existing** surfaces, not a new mismatch screen.

*Insertion points.* `ActiveContributionCard.tsx` — below the `hasAttested ? yellow-pill : Contribute-CTA` ternary, inside the card `YStack` (renders in both branches). `YogdaanBahi.tsx` — **two separate top-level returns** gated on `rows.length === 0` (the Fabric-crash fix); add the CTA below `<StickyFooter>` inside each return's outer `YStack`, **outside** the `FlatList` (present in populated / empty-loading / isError). `note/[id].tsx` — below the download/retry `<Button>`, inside the screen `YStack` (present in all phases). PDF footer at `note-template.ts:318-320`.

**Implementation (Tasks 1–7).**

- **Relocation (AC5).** `CallHelplineCTA` now lives at `apps/mobile/components/common/CallHelplineCTA.tsx` with a byte-identical prop contract; `components/claim/CallHelplineCTA.tsx` is a one-line re-export shim. The default label was decoupled from `useClaimT()`/`claim.shell.call_help` to `useT()`/`common.call_helpline.label` — authored byte-identical, so all 7 bare claim call sites render unchanged (no explicit `label` added anywhere; zero copy drift). The two contribution call sites were repointed to `../common/`.
- **Presence (AC1/AC3).** `<CallHelplineCTA height={56} />` (chromeless default, no accent — third-tier subordinate per UX-DR62, ≥56pt touch per AC3) added to the My Pool card, the Yogdaan Bahi (both return blocks, outside the FlatList), and the Contribution Note screen (all phases). The 2 shipped contribution CTAs kept their reviewed heights (pay.tsx plain / 56; UpiFailureCoach 48) — not retroactively bumped (AC3 clause 2).
- **PDF footer (AC4).** `renderContributionNoteHtml(facts, helpline='+911800000000')` gained an optional 2nd param; the footer prints a bilingual `note.helpline` line + the Latin number. `handlers.ts` resolves `process.env.HELPLINE_TEL ?? '+911800000000'` (the mobile-seam mirror) server-side and threads it in — no `ContributionNoteFacts`/contract change, template stays pure.
- **Copy + teeth (AC6/AC7).** `call_helpline.label` in `common.json` (en+hi), `note.helpline` in `contribution.json` (en+hi); `common.json` added to `microcopy.yaml` `copy_globs` with a dedicated `scripts/microcopy/common.test.ts` (9 tests). The presence fence `helpline-cta-presence.test.ts` (7 tests) is the deliverable's teeth.

**Revert-sanity evidence (AC7 — the teeth actually bite).**
```
# removed `<CallHelplineCTA height={56} />` render from ActiveContributionCard.tsx (import left in place):
× AC7 … ActiveContributionCard.tsx references <CallHelplineCTA>
  → ActiveContributionCard.tsx imports but never RENDERS <CallHelplineCTA> — the affordance must be on the surface.: expected false to be true
  Tests  1 failed | 6 passed (7)
# restored the render line:
✓ tests/unit/helpline-cta-presence.test.ts (7 tests)
  Tests  7 passed (7)
```

**Verification.** `pnpm --filter @twt/mobile typecheck` ✓; `pnpm --filter @twt/api typecheck` ✓; mobile `eslint .` ✓; api `eslint .` ✓; mobile unit suite 48/48 (incl. the 7-test fence); api note-template render test ✓; `i18n:check-parity` ✓ (7 namespaces); `microcopy:check` ✓ (12 copy files); **`pnpm ci:local` 28/28 green**. No `openapi/v1.yaml` / `packages/contracts` / migration change.

**Un-attested (integrity note).** The live Android-emulator eyeball of the 3 newly-wired surfaces was **not** performed this session (BigDev decision 2026-07-25) — recorded openly per [[feedback_record_unattested_no_backfill]], not faked. See the Task-7 checklist for the substituting static coverage and the owed device check.

### File List

**New**
- `apps/mobile/components/common/CallHelplineCTA.tsx` — the relocated cross-cutting component (canonical home).
- `apps/mobile/tests/unit/helpline-cta-presence.test.ts` — the cross-surface presence fence (AC7).
- `scripts/microcopy/common.test.ts` — teeth for the new `common.json` `copy_globs` entry (AC6).

**Modified — mobile**
- `apps/mobile/components/claim/CallHelplineCTA.tsx` — now a thin re-export shim.
- `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` — CTA added; import.
- `apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx` — CTA added in both returns (outside FlatList); import.
- `apps/mobile/app/(contribution)/note/[id].tsx` — CTA added (all phases); import.
- `apps/mobile/app/(contribution)/pay.tsx` — import repointed to `../common/`.
- `apps/mobile/components/active-contribution/UpiFailureCoach.tsx` — import repointed to `../common/`.

**Modified — server (the reserved slot only)**
- `apps/api/src/modules/member-pool/note-template.ts` — footer helpline line + CSS + optional `helpline` param; *code review (2026-07-25): `helpline` now truly optional, prints `HELPLINE_PENDING_TOKEN` when absent instead of a fabricated default.*
- `apps/api/src/modules/member-pool/handlers.ts` — *code review (2026-07-25): the fabricated `HELPLINE_TEL ?? '+911800000000'` resolution was removed; `renderContributionNoteHtml` is now called with no helpline arg.*

**Modified — copy / gate**
- `packages/i18n/locales/{en,hi}/common.json` — `call_helpline.label`.
- `packages/i18n/locales/{en,hi}/contribution.json` — `note.helpline`.
- `packages/i18n/locales/{en,hi}/claim.json` — *code review (2026-07-25): removed the now-dead `shell.call_help` key (superseded by `common.call_helpline.label`).*
- `microcopy.yaml` — `common.json` added to `copy_globs`.

**Modified — governance**
- `friction-budget.md` — Story 8.11 disposition.
- `_bmad-output/implementation-artifacts/deferred-work.md` — two Epic-10 forward seams.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status ledger.

## Change Log
| Date | Change |
| --- | --- |
| 2026-07-25 | Story 8.11 implemented: relocated `<CallHelplineCTA>` to `components/common/` (re-export shim; default label decoupled to the `common` namespace, byte-identical → zero claim-surface drift); wired it onto the My Pool card, Yogdaan Bahi (outside the Fabric FlatList, both returns) and Contribution Note screen; filled the reserved PDF footer with a printed bilingual helpline line (server-resolved number, contract untouched); added `common.json` to the microcopy gate with dedicated teeth; authored the cross-surface presence fence (revert-sanity proven). `ci:local` 28/28 green. Emulator eyeball recorded un-attested per BigDev. Status → review. |

## Open Questions (for BigDev — resolve during dev; ratified defaults recorded above)
- **Q1 (D2/AC5 copy):** does `claim shell.call_help` render exactly "Call us — we'll help" (both locales)? If the `common` default must differ, the claim call sites pass an explicit `label` to avoid drift — confirmed at Task 0. Default: match the string, no drift.
- **Q2 (D4/AC4 number source):** is there a clean server-side per-Pariwar helpline number today (env var vs `facts.branding`)? Default: mirror `EXPO_PUBLIC_HELPLINE_TEL` server-side; else `[PENDING — Epic 10]` token + deferred-work entry. **Do not** add a branding column in this story.
- **Q3 (scope check):** the amount-/reconciliation-mismatch RED surface is treated as **Epic 9** (unbuilt) — 8.11 covers the error/load-failed branches of the *existing* surfaces, not a new mismatch screen. Confirm this reading holds (it matches the `contribution.reconciliation-mismatch` = Epic-9 boundary).
