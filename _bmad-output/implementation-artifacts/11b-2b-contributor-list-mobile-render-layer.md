---
baseline_commit: 80e0d12f4cd0fb071d1faedfd7bb151ddd3635d6
---

# Story 11b.2b: Contributor List — Mobile Render Layer + Family-13 Accessibility `[SURFACE]`

Status: ready-for-dev

> ✅ **D5 IS RULED (BigDev, 2026-08-29): (a) — ⛔ do NOT promote the memorial prototype.**
> ⛔⛔ **BUT THIS STORY IS STILL NOT STARTABLE, AND THE REASON IS A DEPENDENCY, ⛔ NOT A DECISION.**
> It needs **11b.2** and **11b.2a** merged. `ready-for-dev` here means only what the enum means —
> *"story file created"* (`sprint-status.yaml` STATUS DEFINITIONS). ⚠ A `blocked-awaiting-decisions`
> value was considered and ⛔ deliberately NOT minted: per the `deferred-to-v2` precedent (Decision
> `2026-08-17-126` cl.6) a `development_status` addition is a **ratified governance act**.

> ⭐⛔ **SPLIT OUT OF STORY 11b.2 ON 2026-08-29.** It owns the **render layer**: rewiring the shipped
> `<PoolContributorList>` onto 11b.2's presenter, removing the inline label, and holding family-13
> accessibility. ⛔ It ships no presenter and no API change.
>
> ⛔⛔ **HARD DEPENDENCY — THIS STORY RUNS LAST.** It needs **11b.2** (the presenter exists) **and**
> **11b.2a** (the anonymized variant has a producer, and the stable row key exists). ⛔ Starting
> before both are merged means rewiring onto a module that does not exist and testing a variant
> nothing emits.

## ⛔ PREFLIGHT — the dev agent's first action

✅ **D5 is RULED (BigDev, 2026-08-29): (a) — ⛔ do not promote the prototype.** ⛔ No decision gates
this story any longer.

⛔⛔ **THE HARD DEPENDENCY REMAINS AND IT IS THE REAL GATE: `11b-2` AND `11b-2a` MUST BOTH BE `done`
AND MERGED.** `git fetch origin` first ([[feedback_git_fetch_before_remote_reasoning]]). ⛔ If either is
unmerged, the dev agent's ONLY legal action is to **report blocked** — starting early means rewiring
onto a presenter that does not exist and testing a variant nothing emits.

⚠ ⭐ **TWO RULINGS MADE ELSEWHERE BIND THIS STORY — ⛔ read them before Task 1:**
· **11b.2's D2(a)** rejected option (c) — *"a constant confirmed-chrome element in the render layer"* —
  **by name**. ⇒ ⛔ do **not** re-introduce the status pill here as chrome.
· **11b.2a's D3-shape(i)(a)** made the wire row a **two-variant discriminated union**
  (`kind: 'name' | 'anonymized'`, both carrying `rowKey`). ⇒ ⛔ branch on `kind`; ⛔ never read
  `firstName` unguarded.

> ✅ **BASELINE VERIFIED LIVE.** `HEAD == origin/main == 80e0d12`, clean, branch `main`. ⭐
> `apps/mobile/components/contributor-list/` has been **untouched since Story 8.3 (`afce9e0`)** — every
> line number below is stable at this tree. ⚠ Re-verify after 11b.2a lands; it may edit `:40-43`.

---

## Story

As a member scrolling the list of who has already given to my pool,
I want every row to read the same way the rest of the app reads, and to be announced correctly if I
use a screen reader,
so that the list is one thing with one voice, however long it gets and however I read it.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ⛔ NO predicate that gates a member's access to a benefit.** It is a render
layer: it draws rows whose content was decided upstream. ⛔ Nothing in it may be read by, joined into,
or referenced from an eligibility, validity, assignability, pool-assignment or claim path.

⚠ **It introduces ⛔ no NEW identity predicate either** — it *renders* the two decided in 11b.2a
(RTBF removes the name; death changes nothing). Both are restated in one line each so a reader of
this file alone is not blind to them:
· **RTBF:** *"if you exercised your right to erasure, your contribution stays counted but your name
  does not appear next to it — in either language."*
· **Death:** *"a contribution you made while you were alive stays in the record with your name on it."*

⛔⛔ **AND THE C-5 SHARP EDGE INVERTS HERE TOO.** ⛔ No death-derived term may filter, mask, anonymize
or reorder a contributor row (`2026-08-24-159` cl.11). ⛔ A diff that adds an `account-frozen` or
`deceased` conjunct to any contributor render path must be **rejected in review** — *"the right
conjunct in the wrong read"*. ⚠ ⭐ **This bites twice here**, because this story touches **two**
render sites and one of them is a death-context surface (see AC2).

---

## 🎯 What already exists — verified at `80e0d12`

| Claim | Verified state |
|---|---|
| The **member-facing list** | ✅ `apps/mobile/components/contributor-list/PoolContributorList.tsx` (8.3): FlashList-virtualized (`:132-141`), `contributorLabel()` composing `firstName + lastInitial` **inline at `:46-48`**, per-row a11y label, aggregate pending strip (`:149-164`), four distinct states (loading `:57` · absence `:68` · empty `:121` · list `:128`). ⛔ **Do NOT write a second list.** ⭐ The inline label at `:46-48` is exactly what the presenter replaces. |
| ⭐⛔ How many places render it | ⛔⛔ **TWO, AND THE AUTHORING PASS NAMED NEITHER ROUTE.** **(1)** `apps/mobile/app/(contribution)/contributors.tsx:13` — the 8.3 route. **(2)** ⭐ **`apps/mobile/components/nominee-console/NomineeConsole.tsx:213`** — Story 9.1's **Nominee Console** composes it directly (import `:31`), deliberately outside the parent `ScrollView` (`:208-211`). ⇒ **this story changes a staff-takeover-session-as-deceased surface.** → **AC2**. |
| A **third file** in the directory | ⚠ `ViewContributorsEntry.tsx` — the CTA into route (1). 8.3's own review re-pointed it at `usePoolContributorsQuery` *"so the CTA and the list agree exactly"*, so it shares the wire shape 11b.2a widens. ⛔ Do not leave it out of the grep. |
| The **local tuple copy** | ⛔ `PoolContributorList.tsx:40-43` declares `interface ConfirmedRow { firstName; lastInitial }` — ⛔ **NOT imported from `@twt/contracts`.** ⚠ 11b.2a's AC4 makes this derive from the contract; if it already did, ⛔ do not undo it. ⭐ **After 11b.2a the wire row is a two-variant discriminated union (`kind: 'name' \| 'anonymized'`, both carrying `rowKey`)** — ⛔ this component must branch on `kind`, ⛔ never read `firstName` unguarded. |
| The **keyExtractor** | ⛔ `:138` — `` `${item.firstName}-${item.lastInitial}-${index}` ``. `deferred-work.md:2163` defers the `index` churn; its re-trigger *"reused for the Epic 11b public render"* **has fired**, and **11b.2a supplies the stable key** its deferral named as the blocker. → **AC3**. |
| Latin numerals | ✅ `:81-82` uses `String(...)`. ⭐ Operational figures stay Latin even in Hindi (UX-DR73 / amendment-A2). ⛔ Never `toHindiNumeral` here. |
| ⛔ Does the mobile layer read `@twt/tokens` role names? | ⛔⛔ **NO — AND BigDev RULED THIS ON 2026-07-27.** 9.6's review found `StatusPill.tsx` *"never reads `vm.colorTokenRole`"*; ruled: *"accept `$purple` as a documented approximation — **mobile bridges tone→Tamagui-scale independently of the PDF's `@twt/tokens` hex** — do not add an exact-match mobile token. **Correct the overclaiming wording instead.**"* 9.12 then *added a `METER_FILL_TOKENS` mobile-palette bridge (**the `StatusPill` `TONE_TOKENS` precedent**)*. ⇒ **the render layer maps the presenter's role NAME through a local bridge, ⛔ it does not import `@twt/tokens`.** → **AC4**. |
| ⛔ Is there an RN mount harness? | ⛔⛔ **NO.** `grep -n "testing-library\|react-test-renderer" apps/mobile/package.json` → **no matches**. All 27 files in `apps/mobile/tests/unit/` are **source scans**. `status-pill-render.test.ts:1-18` says so: *"pure-Vitest (no @testing-library/react-native — RN component MOUNT tests aren't set up here) … **A source scan (comments stripped) rather than a mount**."* 9.6 Dev Notes: *"**Don't stand up a new RN component renderer just for this.**"* → **AC5**. |
| The **a11y family** | ⭐ Family 13 of `_bmad/custom/load-bearing-invariant-checklist.md`, live on merge via `bmad-code-review.toml:9`, applies *"for every **component or surface** story"* — **this is one** (11b.2 was not). Worked example: `apps/mobile/components/panchayat/PinnedItem.tsx`. ⚠ Mechanization is re-examined at **11b.8**, ⛔ not here. |
| i18n | ⭐ The `contribution` namespace is already registered at all three `catalog.ts` sites (imports `:29-56`, map `:63-66`, `KNOWN_NAMESPACES:69`) and already globbed (`microcopy.yaml:317-318`); `common` likewise. ⛔ **Mint no namespace.** ⚠ `t()` defaults to `common` and **THROWS**. |
| The **memorial prototype** | ⚠ `apps/mobile/components/shradhanjali/ContributorRow.tsx` + `sample-data.ts` — the P0-5 memorial scroll. `display-name.ts:11-12` names it (by **component identifier**, ⛔ not by path) as **SAMPLE-DATA only**. ⚠ ⭐ **Correction to the authoring pass: `district` DOES have a read model** (`packages/domain/src/schema/member_postings.ts:51`, plaintext non-PII, already public on the directory wire at `public-pages/directory.ts:82`). ⇒ **two** producer-less fields (`memoryLine`, `monthYear`), ⛔ not three. → **D5**. |

---

## ⛔ THE THREE TRAPS

### Trap 1 — ⭐⛔ THE PRESENTER THROWS, AND THIS STORY OWNS THE try/catch.

9.12's code review found — independently, in **all three** review layers — *"unguarded
`derivePoolProgressCardViewModel(...)` throw wired into a fail-soft-designed render path"*, resolved
by wrapping the **consumer** call in try/catch and rendering `null` on throw.

⚠ ⭐ **The blast radius is strictly worse here.** 9.12's consumer is **one card**; this consumer is a
FlashList **`renderItem`, called once per visible row on every scroll frame**. A throw there red-boxes
the whole list.

⇒ ⛔ **`deriveContributionRowViewModel` is called inside a try/catch in `renderItem`**, and a throwing
row degrades to a skipped/placeholder row — ⛔ never a crashed list. ⛔ Do not assume the presenter is
total; 11b.2's AC3 requires its doc-block to say in terms that it throws.

### Trap 2 — ⚠ FABRIC RED-BOXES ON empty→populated IN PLACE.

New-Arch FlashList red-boxes when a list crosses empty→populated **in place**
([[project_fabric_flatlist_empty_populated_crash]]). ⭐ **8.3 already renders the empty / loading /
absence branches OUTSIDE the list** (`:57` · `:68` · `:121` are siblings of `:128`, not list states).
⛔ **Do not "simplify" this into an `ListEmptyComponent`.** ⚠ The 60s poll makes the transition a
routine occurrence, ⛔ not an edge case.

### Trap 3 — ⭐⛔ THE ANONYMIZED ROW NEEDS A **NESTED** i18n RESOLUTION, AND THE NAIVE CALL THROWS.

`contributor_list.row_a11y` = `"{name}, confirmed contributor"` (`contribution.json:36`) — it takes a
**`{name}` param**. The anonymized name is `member.anonymousMember`, which resolves in **`common`**
(`common.json:215`), while `row_a11y` resolves in **`contribution`**.

⇒ the render layer must:
1. resolve `member.anonymousMember` with namespace **`common`** → *"an anonymous member"* / *"एक गुमनाम सदस्य"*;
2. pass **that string** as the `{name}` param into `contributor_list.row_a11y` with namespace **`contribution`**.

⛔⛔ **A single call with one namespace throws** — `t()` defaults to `common` and **throws on a miss**.
⭐ 11b.2's view-model hands you `{key, namespace}` pairs precisely so this cannot be guessed. ⚠ And
assert copy **through** `t()`, ⛔ not around it — that is exactly how the 11a.2 `{{max}}` vs `{max}`
defect reached production green (the test fed a hand-built fixture and bypassed `t()` entirely).

---

## Acceptance Criteria

### AC1 — `<PoolContributorList>` consumes the presenter, and the inline label is DELETED

`PoolContributorList.tsx` derives its row content from `@twt/ui`'s `deriveContributionRowViewModel`;
`contributorLabel()` at `:46-48` is **deleted**, ⛔ not left beside it.

**And** the call is inside a **try/catch** in `renderItem`; a throwing row degrades, ⛔ never crashes
the list (Trap 1).
**And** ⛔ **no death-derived term** (`account-frozen`, `deceased`, `members.state`) appears anywhere
in the contributor render path — a test asserts it over **both** render sites.

### AC2 — ⭐ BOTH render sites are covered, and the Nominee Console is named

⛔ The rewire changes **two** surfaces, ⛔ not one:
 **(1)** `apps/mobile/app/(contribution)/contributors.tsx:13` — the 8.3 route;
 **(2)** ⭐ `apps/mobile/components/nominee-console/NomineeConsole.tsx:213` — Story 9.1's Nominee
     Console, a **staff-takeover-session-as-deceased** surface.

Each is smoke-asserted after the rewire. ⚠ ⭐ **Site (2) is where the D9 constraint is easiest to get
wrong**: the session context *is* the deceased member, so a dev "fixing" the list for that surface is
one conjunct away from deleting dead contributors from it. ⛔ The no-death-term assertion (AC1) must
run against site (2) explicitly.
**And** `ViewContributorsEntry.tsx` is checked for the same wire shape and left consistent.

### AC3 — The `keyExtractor` stops churning row identity `[depends on 11b.2a]`

`:138`'s `` `${firstName}-${lastInitial}-${index}` `` is replaced by **11b.2a's ruled `rowKey`**
(D3-shape(i)(a), BigDev 2026-08-29 — present on **both** union variants, so an anonymized row recycles
correctly too). `deferred-work.md:2163` is confirmed **discharged** (11b.2a marks it; this story is the named
consumer).

⚠ ⭐ **This is an explicit EXEMPTION from AC5's behaviour-preservation list — say so in the diff.** The
first pass's *"preserved byte-for-byte in behaviour"* would have **pinned this known defect**, whose
own deferral names Epic 11b's reuse as its re-trigger and whose stated ground (*"dozens, not the ~16k
scale"*) is falsified by the epic's performance contract.

### AC4 — Token roles resolve through the MOBILE BRIDGE, ⛔ not `@twt/tokens`

The presenter's token **role names** are mapped through a **local mobile palette bridge**, on the
`StatusPill` `TONE_TOKENS` / `PoolProgressCard` `METER_FILL_TOKENS` precedent.

⛔ `apps/mobile` does **not** import `@twt/tokens` for this. ⭐ **Ground: BigDev ruled it on
2026-07-27** — *"mobile bridges tone→Tamagui-scale independently of the PDF's `@twt/tokens` hex … do
not add an exact-match mobile token. Correct the overclaiming wording instead."* ⛔ A diff that
imports `@twt/tokens` here re-commits the exact overclaim 9.6's review made the dev retract.

### AC5 — Behaviour preservation, stated as FIVE named assertions

⛔ *"Preserved byte-for-byte"* is not an acceptance criterion — the diff necessarily changes bytes.
The following five are asserted individually:
 **(1)** `FlashList` remains the list renderer;
 **(2)** the four states each still render their own distinct branch (loading · absence · empty · list);
 **(3)** `String(...)` is still used for the pending strip's count and percentage — **Latin numerals
     in both locales**, ⛔ never `toHindiNumeral`;
 **(4)** the pending strip keeps `accessibilityLiveRegion="polite"`, ⛔ never `assertive`;
 **(5)** the empty / loading / absence branches still render **OUTSIDE** the list (Trap 2).

⛔ **The `keyExtractor` is EXEMPT** (AC3).

### AC6 — Tests are written in the harness that actually exists

⛔ There is **no RN mount harness** in `apps/mobile` — no `@testing-library/react-native`, no
`react-test-renderer`; all 27 `tests/unit/` files are **source scans**. ⛔ Do **not** stand one up
(9.6 Dev Notes, in terms).

`apps/mobile/tests/unit/contributor-list-render.test.ts` is a **comment-stripped source scan +
presenter-driven** test asserting: every variant the presenter can emit is mapped by the adapter (the
`status-pill-render.test.ts:7-12` exhaustiveness precedent); AC5's five properties; AC1's
no-death-term scan over both render sites.

**And** ⭐ **what this harness CANNOT prove is recorded as un-attested, ⛔ not asserted as passing**
([[feedback_record_unattested_no_backfill]]): a real screen-reader announcement, and a real `t()`
resolution at the mobile call site. ⚠ ⭐ **The `t()` nesting in Trap 3 is instead proven where it CAN
be — a `packages/i18n` test that resolves `member.anonymousMember` (`common`) and feeds it as the
`{name}` param into `contributor_list.row_a11y` (`contribution`), through `t()`, in both locales.**
⛔ Asserting around `t()` is what shipped the 11a.2 defect.

### AC7 — Semantic accessibility (family 13), with the vacuous checks recorded as such

For each element this story touches — the row container (`:84`), the four state branches, the pending
strip, the header — the family-13 checks are evaluated and **recorded**:
 **(a)** a container carrying `accessibilityLabel` is explicitly `accessible={true}` — **asserted**;
 **(d)** every state the ACs ratify as reachable is **ANNOUNCED**, ⛔ not merely reflected in a prop —
     **asserted**, and the **anonymized** row is one of those reachable states.
 **(b)** `accessibilityValue` for a measurable-value role and **(c)** a real handler for an
     interactive role are ⛔ **VACUOUSLY SATISFIED on this surface** — it has no
     `progressbar`/`slider` and no `button`/`link`. ⛔ **Record them as NOT-APPLICABLE, ⛔ never as
     passing** — a check that cannot fail is a green scan proving nothing
     ([[feedback_gate_scope_semantic_coverage]]).

**And** ⛔ **no accessibility CI gate is minted here** — that is 11b.8's call, by ruling. ⭐ Start from
`apps/mobile/components/panchayat/PinnedItem.tsx`.

### AC8 — The friction-budget ledger is updated, UNCONDITIONALLY

⛔⛔ **This is not an "if".** AC-4 is a pure path trigger: `MEMBER_FACING_PREFIXES = ['apps/mobile/', 'apps/public/']`
(`scripts/friction-budget/lib.ts:453`); `evaluateDeclaration` fails when any changed file matches and
`friction-budget.md` is unchanged. This story touches `apps/mobile/` in **at least three** files
(the component, both render sites) plus a test — **there is no test exclusion**.

⇒ `friction-budget.md` **MUST change in the same PR** or `pnpm ci:local` fails.
**And** ⭐ **the correct shape is an affirmation/disposition note, ⛔ not a new row and ⛔ not an edit
to an existing row** — this story *removes* an inline label and adds no member-payable friction. ⭐
The precedent is HEAD itself: `80e0d12 feat(11b.9): declare the retired fourth consent checkbox in
friction-budget.md`, whose body opens *"AC-4 (attribution-on-change) requires every member-facing
diff to touch friction-budget.md … a retirement note, not a new row."* ⛔ Leave existing rows
byte-unchanged ([[feedback_supersede_never_reinterpret]]).
⚠ The leg diffs **committed** history, so it passes vacuously until you commit — the failure surfaces
at `git push` (pre-push hook), ⛔ not during local iteration
([[project_friction_budget_baseline_ratchet]]).

---

## Tasks / Subtasks

- [ ] **Task 0 — Preflight** ✅ *D5 RULED* · ⛔ `[GATED ON both dependencies merged]`
  - [ ] ⛔ Confirm `11b-2-…` and `11b-2a-…` are both `done` in `sprint-status.yaml` and merged into
        `main`. `git fetch origin` first ([[feedback_git_fetch_before_remote_reasoning]]). ⛔ If either
        is not, **STOP and report blocked**.
  - [ ] ⛔ **TRANSCRIBE** D5's ruling **(a) — do not promote the prototype** from this file into
        `.decision-log.md` (read the head **live**). ⛔ The dev agent does not decide, does not
        paraphrase, and does not supply a ground. ⛔ `governance:` prefix, own commit, before any code.
  - [ ] Re-verify `PoolContributorList.tsx`'s line numbers — ⚠ 11b.2a may have edited `:40-43`.
- [ ] **Task 1 — Rewire the list (AC1, AC3, AC4, AC5)**
  - [ ] Consume `deriveContributionRowViewModel` **inside a try/catch** in `renderItem` (Trap 1);
        **delete** `contributorLabel()` at `:46-48`.
  - [ ] Replace `:138`'s `keyExtractor` with 11b.2a's stable key (AC3).
  - [ ] Map token role names through the **local mobile bridge** (AC4). ⛔ No `@twt/tokens` import.
  - [ ] ⛔ Keep the four states OUTSIDE the list (Trap 2). ⛔ Keep `String(...)` numerals.
- [ ] **Task 2 — The anonymized row's copy (Trap 3)**
  - [ ] Resolve `member.anonymousMember` with namespace **`common`**, then pass it as `{name}` into
        `contributor_list.row_a11y` with namespace **`contribution`**. ⛔ Never one call, one namespace.
  - [ ] Announce it (AC7(d)). ⛔ Mint no key and ⛔ no namespace — reuse `contributor_list.*`.
- [ ] **Task 3 — Both render sites (AC2)**
  - [ ] Smoke-assert `contributors.tsx:13` **and** `NomineeConsole.tsx:213`. ⭐ Run the no-death-term
        assertion against the Nominee Console explicitly.
  - [ ] Check `ViewContributorsEntry.tsx` for wire-shape consistency.
- [ ] **Task 4 — Tests in the harness that exists (AC6)**
  - [ ] `apps/mobile/tests/unit/contributor-list-render.test.ts` — comment-stripped source scan;
        variant exhaustiveness; AC5's five properties; the two-site death-term scan.
  - [ ] A `packages/i18n` test proving the **nested** `t()` resolution in both locales (Trap 3).
  - [ ] ⛔ Record the screen-reader announcement and the live mobile `t()` call as **un-attested**.
- [ ] **Task 5 — Accessibility (AC7)**
  - [ ] Run family 13's four checks over every element touched; start from `PinnedItem.tsx`.
  - [ ] ⛔ Record (b) and (c) as **NOT-APPLICABLE**, ⛔ never as passing.
- [ ] **Task 6 — Close out**
  - [ ] ⛔⛔ **`friction-budget.md` — write the affirmation/disposition note (AC8). This is mandatory,
        ⛔ not conditional.** ⛔ Leave existing rows byte-unchanged.
  - [ ] `pnpm --filter @twt/mobile test` · `pnpm --filter @twt/i18n test` · `pnpm turbo run typecheck`
        · then `pnpm ci:local` green. ⚠ `git push` runs the full `ci:local` via a pre-push hook —
        that is the "hang", ⛔ not a failure.
  - [ ] Flip `development_status[11b-2b-contributor-list-mobile-render-layer]` and add ONE combined
        top-of-file `last_updated` entry ([[project_sprint_status_ledger]]).

---

## ⚖️ Decisions — ✅ **RULED (BigDev, 2026-08-29).** ⛔ Do not re-litigate.

### ✅ D5 — Promote the memorial `<ContributorRow>` prototype? → **(a) ⛔ NO.** RULED 2026-08-29.

`shradhanjali/ContributorRow.tsx` is the UX spec's mobile row, but on **sample data**.

⚠ ⭐ **Corrected arithmetic (the authoring pass said three; it is two).** `district` **has a shipped
read model** — `member_postings.district` (`packages/domain/src/schema/member_postings.ts:51`,
plaintext, explicitly non-PII), already published on a public wire (`public-pages/directory.ts:82`) and
a ruled `member-directory` matrix field. ⇒ the producer-less fields are **`memoryLine` and
`monthYear`**. ⭐ **The ruling holds on the corrected arithmetic, ⛔ not on the inflated one.**

**Ground:** rewire only `<PoolContributorList>` (8.3), which has a **real producer**. Promoting the
prototype still means **inventing two producers** — SD-1 — and the 11a.5 lesson (*"a silent section is
the CORRECT state"*) says render the real, currently-empty source. ⛔ (b) was rejected because it
**ships fabricated rows on a memorial surface**. ⛔ (c) was rejected because it puts un-producible
fields into a shared contract — **and it is out of this story's reach anyway**, since 11b.2 ships first
and would own that change.

⇒ ⛔ **`apps/mobile/components/shradhanjali/*` is NOT TOUCHED by this story.** ⚠ ⭐ And the prototype's
**divergence is now a recorded fact, ⛔ not a silent one**: the UX spec's mobile row and the shipped
mobile row are two different things, and `deferred-work.md` already carries the column-inventory
amendment (11b.2's AC8) that says why. ⛔ Do not "reconcile" them here.

## Dev Notes

- **⚠ Fabric FlatList/FlashList red-boxes crossing empty→populated in place.** 8.3 already renders the
  empty/loading/absence branches **outside** the list — ⛔ do not "simplify" it (Trap 2).
- **⚠ Latin numerals for operational figures, even in Hindi** (UX-DR73 / amendment-A2). `:81-82`'s
  `String(...)` is the pattern; ⛔ never `toHindiNumeral` here.
- **⚠ `t()` defaults to `common` and THROWS.** Every call site passes an explicit namespace, and the
  anonymized row needs **two** namespaces in one label (Trap 3). Assert **through** `t()`.
- **⚠ Type-only → value import cycles** break consuming packages at runtime while typecheck, lint and
  local tests stay green ([[project_type_only_import_cycle_trap]]). `apps/mobile` imports `@twt/ui` —
  be deliberate.
- **⭐ MMKV is this app's AsyncStorage** ([[project_mmkv_asyncstorage_equivalent]]) — and the
  contributor response is **auto-persisted** to it (`usePoolContributorsQuery.ts:33`). ⚠ If 11b.2a's
  widening landed, a stale cached row shape can reach this component on first launch after update;
  confirm 11b.2a's rollout posture before assuming the new shape is always present.
- **⚠ `integration-tests` concurrency is `1` and is LOAD-BEARING** — ⛔ never raise it.
- **⭐ CI Actions availability flips both ways without warning — re-verify live**
  ([[project_ci_actions_suspension_local_mirror]]).

### Testing

```
pnpm --filter @twt/mobile test    # apps/mobile/tests/** — pure Vitest, SOURCE SCANS, no RN mount
pnpm --filter @twt/i18n test      # where Trap 3's nested t() resolution is actually provable
pnpm turbo run typecheck
pnpm ci:local                     # before push — and AC8's ledger note must be committed first
```

### Project Structure Notes

| Path | New/Update | Note |
|---|---|---|
| `apps/mobile/components/contributor-list/PoolContributorList.tsx` | UPDATE | Consume the presenter in a **try/catch**; **delete** `contributorLabel()` `:46-48`; replace `:138`'s `keyExtractor`. ⛔ FlashList + the four states + the pending strip otherwise unchanged. |
| `apps/mobile/app/(contribution)/contributors.tsx` | ⚠ **VERIFY** | Render site 1 — smoke-assert after the rewire. |
| `apps/mobile/components/nominee-console/NomineeConsole.tsx` | ⚠ **VERIFY** | ⭐ Render site 2 (`:213`) — a death-context surface. ⛔ Run the no-death-term assertion here explicitly. |
| `apps/mobile/components/contributor-list/ViewContributorsEntry.tsx` | ⚠ **VERIFY** | Shares the wire shape; check consistency. |
| `apps/mobile/tests/unit/contributor-list-render.test.ts` | **NEW** | ⛔ Source scan + presenter-driven. ⛔ No mount harness — do not stand one up. |
| `packages/ui/**` | ⛔ **READ-ONLY** | The presenter is 11b.2's. ⛔ Do not edit it to make this story easier. |
| `packages/contracts/**` · `apps/api/**` | ⛔ **NOT TOUCHED** | 11b.2a's. |
| `packages/tokens/**` | ⛔ **NOT IMPORTED** | AC4 — mobile bridges tone→Tamagui locally, by ruling. |
| `apps/mobile/components/shradhanjali/ContributorRow.tsx` | ⚠ **LEAVE ALONE** `[D5]` | Sample-data prototype; **two** producer-less fields. |
| `friction-budget.md` | ⛔ **MUST UPDATE** | AC8 — unconditional. An affirmation/disposition note; ⛔ existing rows byte-unchanged. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | ⚠ **VERIFY** | `:2163` should already be discharged by 11b.2a with this story named as consumer. |
| `.decision-log.md` | UPDATE | Task 0 — D5 only. Read the head **live**. |

### References

- [Source: `apps/mobile/components/contributor-list/PoolContributorList.tsx:15-19,40-43,46-48,57,68,81-82,121,128,132-141,149-164`] — the virtualization rationale (⚠ `:15-19`, not `:15-24`), the local tuple copy, the inline label, the four states, the Latin numerals, the keyExtractor, the pending strip
- [Source: `apps/mobile/app/(contribution)/contributors.tsx:13`] — render site 1
- [Source: `apps/mobile/components/nominee-console/NomineeConsole.tsx:31,208-213`] — ⭐ render site 2, and why it sits outside the ScrollView
- [Source: `apps/mobile/tests/unit/status-pill-render.test.ts:1-18,7-12,16`] — ⛔ no mount harness; the exhaustiveness precedent; comment-stripping
- [Source: `9-6-…md` Review Findings 1] — ⭐ BigDev's 2026-07-27 ruling: mobile bridges tone→Tamagui, ⛔ do not import `@twt/tokens`
- [Source: `9-12-…md` Review Findings 1] — ⭐ the unguarded-presenter-throw finding and its try/catch resolution (Trap 1); `METER_FILL_TOKENS`
- [Source: `packages/i18n/locales/{en,hi}/common.json:215` · `locales/en/contribution.json:30-39`] — ⭐ the TWO namespaces one a11y label needs (Trap 3)
- [Source: `packages/i18n/src/resolver.ts:33`] — the single-brace `TOKEN` regex behind the 11a.2 defect
- [Source: `deferred-work.md:2163`] — the keyExtractor deferral, its fired re-trigger, and its falsified ground
- [Source: `_bmad/custom/load-bearing-invariant-checklist.md`] — family 13 and its four checks; `bmad-code-review.toml:9` makes it live on merge
- [Source: `apps/mobile/components/panchayat/PinnedItem.tsx`] — the family-13 worked example
- [Source: `scripts/friction-budget/lib.ts:453-501` · `scripts/friction-budget/check.ts:73-79`] — ⭐ why AC8 is unconditional
- [Source: commit `80e0d12`] — the affirmation-note precedent for a friction-reducing member-facing diff
- [Source: `packages/domain/src/schema/member_postings.ts:51` · `packages/contracts/src/public-pages/directory.ts:82`] — ⭐ `district` HAS a read model (D5's corrected arithmetic)
- [Source: `.decision-log.md#decision-2026-08-24-159` cl.11] — D9(a); *"the right conjunct in the wrong read"*

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-29 | 0.1 | **Split out of Story 11b.2 by the validation pass at `80e0d12`.** Carries the mobile render layer and family-13 accessibility; runs **after** 11b.2 and 11b.2a. ⭐ Findings applied at authoring: **(1)** ⛔⛔ `<PoolContributorList>` has **TWO** live render sites — the 8.3 route **and** `NomineeConsole.tsx:213`, a staff-takeover-session-as-deceased surface the authoring pass never named ⇒ **AC2**, with the no-death-term assertion aimed at it explicitly. **(2)** *"Preserved byte-for-byte"* would have **pinned a known defect** — `deferred-work.md:2163`'s keyExtractor re-trigger has fired by name and its ground is falsified ⇒ **AC3** makes it an explicit exemption, consuming 11b.2a's stable key. **(3)** ⛔ AC "resolve token roles through `@twt/tokens`" **contradicted BigDev's 2026-07-27 ruling** that mobile bridges tone→Tamagui independently ⇒ **AC4** inverted. **(4)** ⛔ There is **no RN mount harness** — *"byte-for-byte behaviour"* and *"a screen-reader user hears"* were unwriteable ⇒ **AC5** restated as five named source-scan assertions and **AC6** records what the harness cannot prove as **un-attested**, moving the `t()` proof to `packages/i18n`. **(5)** Trap 3 added — the anonymized a11y label needs a **nested, two-namespace** `t()` resolution; the naive single call **throws**. **(6)** Trap 1 added — 9.12's unguarded-presenter-throw finding, with a worse blast radius on a `renderItem` hot path ⇒ the try/catch is this story's half. **(7)** **AC7** records family-13 (b) and (c) as **NOT-APPLICABLE** rather than passing — they cannot fail on this surface. **(8)** ⛔⛔ **AC8**: friction-budget AC-4 is a **path trigger** and fires unconditionally once `apps/mobile/` is touched — the authoring pass's *"if any declaration moved"* would have produced a red gate at `git push`. **(9)** D5's arithmetic corrected — `district` **has** a read model, so two producer-less fields, not three. | BigDev + Claude |
