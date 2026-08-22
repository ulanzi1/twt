---
baseline_commit: d902b04590497d109ad725d07ae6f319f0788394
---

# Story 11a.6: `<PinnedNotice>` Component `[PRIMITIVE]`

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ✅ **BASELINE VERIFIED LIVE.** `git fetch origin` was run at authoring time
> ([[feedback_git_fetch_before_remote_reasoning]]): `HEAD == origin/main == d902b04`, zero ahead /
> zero behind, working tree clean. **Every claim in this file was checked by reading the named file
> at that tree** — ⛔ none is inherited from a story record, an epic line, or a prior draft. Branch
> off `main`; re-`fetch` before you branch.

> ⭐⛔ **READ THIS FIRST — THE COMPONENT THIS STORY NAMES ALREADY EXISTS, AND SO DOES THE THING THE
> EPIC AC DESCRIBES. THEY ARE NOT THE SAME COMPONENT.**
> `apps/mobile/components/panchayat/PinnedItem.tsx` is the `<PinnedNotice>` prototype — Story 11a.5
> touched exactly two things in it and **explicitly reserved the rest for this story**. Separately,
> `apps/mobile/components/banners/BannerHost.tsx` (Story 10.9) is *already* a **persistent
> above-the-fold dismissible banner**, mounted above every authenticated tab, with a working
> dismiss-with-acknowledgement path. ⛔ **The epic's 11a.6 AC prose describes the second one.
> Building it would produce a THIRD banner surface** — and Story 11a.5 just spent a ruling (D7(a))
> suppressing a *duplicate render* of the first two. Read **§What already exists** and **Trap 1**
> before writing a line.

> ✅ **ALL NINE DECISIONS RULED BY BIGDEV (2026-08-22), each AS RECOMMENDED: D1(a) · D2(a) · D3(a) ·
> D4(a) · D5(a) · D6(a) · D7(a) · D8(a) · D9(a).** ⇒ ⛔ **nothing in this file is conditional any
> more** — every `IFF`, every `[GATED ON …]` and every *"if ruled (b)"* branch has been resolved in
> place, so a later reader ⛔ cannot take pre-ruling text as still governing.
> ⚠ ⛔ **DURABILITY IS TASK 0's `governance:` COMMIT, ⛔ NOT THIS FILE** and ⛔ not the sprint-status
> ledger ([[feedback_governance_commits_precede_implementation]]) — history must read
> governance → implementation, and Task 0 reads the `.decision-log.md` head **LIVE**.
> ⚠ ⭐ **RULED ≠ OPTIONAL.** D8(a) and D9(a) ungate a UX-spec edit and a microcopy scope entry that
> were written as conditional; ⛔ they are now **required work**, ⛔ not recommendations.
>
> ⭐ **D9 was found by this authoring pass and is named by NO epic AC:** the `noticeboard` i18n
> namespace Story 11a.5 minted is **absent from the microcopy gate's `copy_globs`** — so the member
> vocabulary register, the tone rules and the numeral discipline are **blind to a live member tab's
> copy**, and this story adds more of it. ⚠ `microcopy.yaml:348-355` (Story **11a.2**, ⭐ the same
> epic, three stories earlier) states the rule in terms: *"the register grows surface-by-surface **BY
> BEING ADDED TO** — a new namespace that is not globbed is **UNSCANNED COPY wearing a green
> check**"*.

> **Depends on (all `done` + merged):** **11a.5** (the `@twt/ui` `noticeboard` presenter, the
> `NoticeboardRowDescriptor` contract, the `noticeboard` i18n namespace, the D6(a) RN colour map, the
> `BannerHost` route suppression) · **10.9** (the banner substrate: the member read, the **idempotent
> revision-aware dismiss endpoint**, `useDismissBannerMutation`, `bannerDismissalKey`) · **1.17**
> (the design system — touch targets, a11y) · **0.14** (the P0-5 prototype `PinnedItem.tsx`) ·
> **11a.1** (the visibility matrix — ⚠ already satisfied for this surface by 11a.5's presenter-level
> tier filter; see **AC5**).

---

## Story

As a member reading the Panchayat Noticeboard,
I want each pinned notice rendered as a **real design-system row** — one colour-stubbed, screen-reader-
coherent line whose category I can hear, and which I can **acknowledge and clear for good** with one
explicit action,
so that a notice that matters stays in front of me until I have actually seen it, and one I have dealt
with stops taking up space on the quietest surface in the app.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ONE predicate that gates what a member SEES, and ⛔ none that gates what a
member GETS.** The predicate is **member-initiated self-suppression**: once a member acknowledges a
notice, Story 10.9's server-side dismissal join hides it from them **permanently, until an operator
edits the copy** (`packages/domain/src/banners/read.ts:134-137` — a banner survives iff no dismissal
row exists **or** `dismissed_revision < banners.revision`).

**In the member's terms:** *"once you tap Dismiss on a notice, that notice is gone from your
noticeboard for good — unless the Pariwar rewrites it. Dismissing it changes nothing else: not your
membership, not your coverage, not your pool, not any claim."*

**Checked against the Niyamavali: no clause governs it, and that is the correct result — ⛔ not a
gap.** The Niyamavali governs **eligibility, coverage, contribution and restoration**. A notice is
**announcement copy**; dismissing one changes ⛔ no member's validity, ⛔ no assignability, ⛔ no
coverage and ⛔ no claim outcome. ⛔ No `is_valid`, `is_assignable`, roster, eligibility or coverage
predicate is read or written by this story.

⚠ ⭐ **This predicate is SHARPER than 11a.5's tier filter, and the difference is worth stating
plainly.** 11a.5's filter decided what the *system* shows a member. This one lets **a member hide
something from themselves**, and the hiding is **durable and server-side**. If a notice ever became
the only channel carrying a **deadline a member's coverage turns on**, dismiss-with-ack would let a
member permanently hide their own deadline — and 10.9 would faithfully honour it.

⛔ **That is not true today, and Decision `2026-08-22-152` D4(a) is a STANDING CONSTRAINT that keeps
it untrue:** no coverage-bearing deadline ever rides the noticeboard; those ride the Story 8.8
notification family. ⚠ **The first story that puts one here invalidates the answer above and owes a
Niyamavali check before it ships.** ⛔ This story does not relax D4(a) and must not be read as doing so.

---

## 🎯 What already exists — verified at `d902b04`, not inherited

Every row checked by reading the named file.

| Claim | Verified state |
|---|---|
| A `<PinnedNotice>` row renders **today** | ⭐ ✅ **YES.** `apps/mobile/components/panchayat/PinnedItem.tsx` (68 lines) — `Pressable` → `XStack` with a 4pt stub, a 2-line title and an optional meta line. Wired at `PanchayatNoticeboard.tsx:141`, one render site, fed by the presenter's `rows` arm. ⛔ **This story does NOT author a row from nothing.** |
| 11a.5 reserved this file for this story, in writing | ✅ `PinnedItem.tsx:11-26` — *"⛔ **THIS COMPONENT IS STORY 11a.6's** … Everything else is 11a.6's and untouched: stub width, layout, press behaviour, `numberOfLines`, the meta line's typography, and **dismiss-with-ack**"*. |
| The row's data contract already exists | ✅ `NoticeboardRowDescriptor` — `packages/ui/src/noticeboard/view-model.ts:164-175`: `{ id, category, title, meta, dismissible }`. ⭐ **Its doc comment is 11a.6's brief**: it names, field by field, what was carried and what was left out and why. ⛔ Do not re-derive that reconciliation — read it. |
| A **persistent above-the-fold dismissible banner** already exists | ⭐ ✅ **YES — and this is the trap.** `apps/mobile/components/banners/BannerHost.tsx` (Story 10.9): full-width strip at the top of **every** authenticated surface (`app/(tabs)/_layout.tsx:21`), severity-coloured, ≥44pt dismiss button, optimistic removal + rollback, `display_once_per_member` `shown` reporting. ⛔ **The epic's 11a.6 AC prose describes THIS.** Read **Trap 1**. |
| A **dismiss-with-acknowledgement backend** already exists | ⭐ ✅ **YES, complete.** `POST /api/v1/p/:pariwarId/member/banners/:bannerId/dismiss` (`member-routes.ts:60-73`), body `{ kind: 'dismissed' \| 'shown' }`, **idempotent**, FR-88 per-member write rate-limit. The acted-on `revision` is resolved **server-side** and is deliberately **not** a client field (`dto.ts` — *"a client must not be able to suppress a revision it has never seen"*). ⛔ **Do not build a second one.** |
| A client hook for it exists | ✅ `useDismissBannerMutation(pariwarId)` — `apps/mobile/components/banners/useMemberBannersQuery.ts:37-48`. Invalidates `MEMBER_BANNERS_QUERY_KEY` `onSettled` (**both** success and failure, deliberately). ⛔ Do not write another mutation. |
| Dismissal is revision-aware **server-side** | ✅ `packages/domain/src/banners/read.ts:134-137,164-165` — an explicit LEFT JOIN; a banner survives iff no dismissal row exists **OR** `dismissed_revision < banners.revision`. ⇒ ⭐ **a copy edit (Decision 5's `revision + 1`) re-surfaces the banner for everyone who dismissed the old wording.** The server is the authority; the client key is only for the optimistic window. |
| The client dismissal KEY helper exists | ✅ `bannerDismissalKey(bannerId, revision)` → `` `${bannerId}:${revision}` `` — `apps/mobile/components/banners/copy.ts:48`. ⛔ **Reuse it. Do not re-implement the format**, and do not edit that file. |
| The row descriptor carries `revision` | ⛔ **NO — and that is the routed review finding this story triggers** (`deferred-work.md`, *"Deferred from: code review of story-11a.5"*, item 2: *"Trigger: **Story 11a.6 wiring dismiss-with-ack** against `NoticeboardRowDescriptor.id`"*). **D5** rules how it is closed. ⚠ ⛔ The obvious fix — widening the descriptor — is the one 11a.5's own tests forbid. Read **Trap 3**. |
| The tier rule is this story's to build | ⛔ **NO — it SHIPPED at 11a.5** (AC5 / D5(a)). `presenter.ts:63-100` — `AUDIENCE_VISIBILITY`, exhaustive by `satisfies Record<BannerAudienceScope,…>`, **fail-closed** on `role`/`cohort` and on any drifted wire value. ⇒ ⭐ **a row that reaches `<PinnedNotice>` has ALREADY passed the tier filter.** The epic's *"respects Story 11a.1 matrix tier"* AC is satisfied **by construction** — read **AC5**, and ⛔ do not re-filter. |
| `packages/ui` is a React component library | ⛔ **NO — it is HEADLESS.** Zero `.tsx`. Its only dependency is `@twt/contracts`. ⇒ *"authored as an extension of `packages/ui`"* means a **PRESENTER** (11a.5 Trap 1, unchanged). **D2** rules where this story's presenter goes. |
| The `noticeboard` i18n namespace exists | ✅ `packages/i18n/locales/{hi,en}/noticeboard.json` — 12 keys, registered in **both** literals of `packages/i18n/src/catalog.ts`. ⚠ `t()` **THROWS** on an unregistered namespace at runtime ([[project_missed_cycle_visibility_substrate]]). |
| The row conveys its category to a screen reader | ⚠ **YES, but through `accessibilityHint`, not the label** — `PinnedItem.tsx:45`, keyed by `CATEGORY_HINT_KEYS` (`tokens.ts:67-72`) whose four values are `open_detail_*` (*"Tap to open … detail"*). ⛔ UX `:1820` asks for the label: *"category conveyed in **screen-reader label** too"*. ✅ **D6(a): the category MOVES INTO THE LABEL** and the `open_detail_*` hint keys retire. |
| ⭐⛔ "title and meta read as a unit" has a MECHANISM today, and it is the `Pressable` | ⭐ ✅ **YES — and this is the trap in D6.** RN sets `accessible={true}` on `Pressable` by default, so `PinnedItem.tsx:38-46` merges its children into **one** announcement carrying `a11yLabel` (`:36`). A bare `XStack`/`YStack` does ⛔ **NOT** group. ⇒ ⚠ **removing the `Pressable` removes the mechanism**, and UX `:1820`'s *"title and meta read as a unit"* silently breaks. ⛔ There is **no in-repo pattern to copy**: `grep -rn 'accessible={true}' apps/mobile/components/` → **zero hits** (the only hit anywhere is an `accessible={false}` at `BankStatementUpload.tsx:139`). See **AC6** and **Trap 5**. |
| A notice DETAIL destination exists | ⛔ **NO.** `PinnedItem.tsx:38-42` — the `onPress` handler is **empty**, with a comment saying production wires it and that it is 11a.6's. ⇒ ⭐ the row currently announces `accessibilityRole="button"` + *"Tap to open … detail"* and **does nothing**. ✅ **D6(a): the row becomes NON-INTERACTIVE CONTENT** — ⛔ the lie is removed, ⛔ no destination is invented. |
| The descriptor carries a link CTA | ⛔ **NO — deliberately LEFT OUT and ROUTED** (`deferred-work.md` item **(g)**: *"Trigger: **Story 11a.6, which owns the ROW's press behaviour**"*). ⚠ The trigger fires here. **D6** answers it. |
| UX ratifies a `dismissed` visual state for this component | ✅ `ux-design-specification.md:1818` — *"**States:** Default · pinned (left-stub colored) · **dismissed (faded if member-dismissable)**"*. ⚠ `BannerHost` does the opposite for the same underlying banner: it **removes** the row optimistically. ✅ **D4(a): render the ratified FADED state** and let the refetch remove the row. |
| UX gives the row anatomy a dismiss slot | ⛔ **NO.** `:1817` is *"4pt colored left-stub · title (Devanagari sans, 14pt) · meta line (12pt secondary, monospace where numeric)"*. ⚠ ⭐ **A ratified `dismissed` STATE with no ratified AFFORDANCE is an INCOMPLETENESS, ⛔ not a contradiction** — ⛔ do not treat it as a second `:491`-style supersession. Routed at **Task 6**. |
| A non-dismissible banner is legal | ✅ **YES, for `display_mode='banner'`** — `packages/domain/src/banners/errors.ts:84-86` states it in terms (*"the UX spec's Pattern 9 allows one for a blocking system state"*). Only a **popup** must be dismissible (domain 422 + DB CHECK, migration 0090). ⇒ ⭐ `dismissible: false` is a **real, reachable case** the row must render — ⛔ not a theoretical branch. |
| The popup lane can reach the noticeboard | ⛔ **NO.** `banner-notice.ts:11-14` — only the `banner` lane feeds the noticeboard; *"the `popup` lane is a MODAL OVERLAY, not a strip row"*. ⛔ Do not fold it in. |
| More than one pinned row can render today | ⛔ **NO — AT MOST ONE.** The banner lane is the noticeboard's **only** producer, and it yields at most one (`presenter.ts:153`). ⇒ ⛔ do not build list reordering, grouping, "N more" collapse, or multi-select dismiss. |
| ⭐⛔ 11a.5's tests FENCE this story's obvious implementation | ⭐ ✅ **YES — FOUR assertions, and they will fail on the naive approach.** Read **Trap 3**. `packages/ui/tests/noticeboard/presenter.test.ts:256` (banner input has exactly 7 keys) · `:294` (row descriptor has **exactly** five) · `:327` (⛔ **no key matching `/dismiss/i` other than `dismissible`**) · `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:334-340` (⛔ **`useDismissBannerMutation` must not appear** in `PanchayatNoticeboard.tsx` **or** `PinnedItem.tsx`). |
| The `:491` → `:1819` UX-spec amendment has been applied to the file | ⛔ **NO.** Decision `2026-08-22-152` D2(a) **ruled** the supersession and `deferred-work.md` item **(e)** routed the file edit, naming *"or **Story 11a.6's authoring pass** — whichever comes first"* as its trigger. ⚠ **The trigger has now fired.** **D8** rules what this story does about it. |
| ⭐⛔ The `noticeboard` member copy is inside the microcopy gate | ⛔ **NO — IT IS UNSCANNED.** `microcopy.yaml` `scope.copy_globs` (`:296-356`) lists `niyamavali` · `terms` · `close-of-cycle` · `contribution` · `pool-onboarding` · `common` · `nominee-console` · `members` — ⛔ **`noticeboard` is not there.** ⇒ the member vocabulary register, the blame/scarcity/`fursat` tone rules and the UX-DR73 numeral discipline **do not bite a live member tab's copy**, and this story adds more of it. ⚠ ⭐ **The 11a.2 entry, in the same epic, states the rule against exactly this** (`:350-352`). ✅ **D9(a): this story CLOSES it**, with proven teeth (AC7 / Task 5). |
| An accessibility CI gate exists | ⛔ **NO.** `scripts/` holds 19 invariant gates; ⛔ none is an a11y gate, and `packages/ui` has ⛔ no react-ban gate either. ⇒ ⭐ **AC2 and AC6 are enforced by READING and by the story's own tests, ⛔ not by CI.** ⛔ This story mints no new gate for them ([[feedback_no_premature_package]]). |
| `.decision-log.md` head | `2026-08-22-152` (Story 11a.5). ⛔ Do not hardcode the next number — read the head **live** at implementation time. |
| Row 17 / directory launch gate | `open`. ⛔ **Untouched by this story** — the noticeboard is a **member-app** surface. ⛔ Do not write that this advances the directory kill-switch gate ([[project_directory_launch_gated_on_killswitch_ui]]). |

---

## ⛔ THE SIX TRAPS — read these before anything else

### Trap 1 — ⭐⛔ THE EPIC AC DESCRIBES A COMPONENT THAT ALREADY SHIPPED. Building it makes a THIRD banner.

The epic's 11a.6 AC says the component *"renders a **persistent pinned banner above the fold** with:
title, body, severity, dismiss-with-ack pattern"*. ⚠ **Every one of those words already describes
`<BannerHost>`** (Story 10.9), verified:

| Epic phrase | `<BannerHost>`, shipped |
|---|---|
| persistent | `valid_from`…`valid_until` window, server-resolved; survives navigation |
| pinned banner **above the fold** | mounted at `app/(tabs)/_layout.tsx:21`, **above every authenticated tab** |
| title · body | `BannerContent` renders both, Hindi-first (`selectBannerCopy`) |
| severity | `SEVERITY_TOKENS` — `info`/`warning`/`critical` → Tamagui theme tokens |
| dismiss-with-ack | ≥44pt `X` → `POST …/dismiss` `{kind:'dismissed'}`, optimistic + rollback |

⛔ **UX `:1814-1821` says something completely different, and it is the component-level contract:**
*"**Purpose:** A single notice **row** with colored left-stub indicator + title + meta … **Surfaces:**
**Inside `<NoticeboardStrip>`**."*

⭐⭐ **AND THE EPIC CONTRADICTS ITSELF, WHICH MAKES THIS EASIER THAN A SPEC-BEATS-EPIC ARGUMENT.** The
11a.6 AC's own `Given` anchors on **UX-DR16** (`epics.md:4690`), the epic header lists it (`:4493`), and
`epics.md:406` defines it in four words: *"**UX-DR16: `<PinnedNotice>`.** Noticeboard **ROW** primitive
with left colored stub."* ⇒ ⭐ **the epic's own anchor says ROW; only its `Then` prose says banner.** Two
further in-spec confirmations, both independent of `:1814-1821`: `:680` (*"PinnedNotice (the noticeboard
**row** with left colored stub)"*) and `:1222` (the Tier-2 molecule inventory, same phrase). ⇒ ⛔ **four
ratified sources say ROW and one line of epic prose says banner** — that is a **defective AC sentence**,
⛔ not a competing contract.

⭐ **This is the SAME SHAPE OF COLLISION D2(a) already ruled on**, and it deserves the same answer:
the **component-level spec section wins over screen-grammar / epic prose**. ⚠ And here the cost of
getting it wrong is concrete, not stylistic: Story 11a.5 spent an entire ruling (**D7(a)**, plus a new
`route-suppression.ts` module) making sure **one banner does not render twice on one screen**.
⛔ **Building a second above-the-fold banner would recreate exactly that bug, deliberately.**

⇒ ✅ **D1(a): it is the ROW** — the promotion of `PinnedItem.tsx`. ⛔ No new surface, ⛔ no sticky behaviour, ⛔ no second mount point. ⛔ The dev agent does not re-open it.

### Trap 2 — ⛔ "SEVERITY" IS ALREADY RULED. Re-adding it as a second axis undoes D2(a).

The epic AC names `severity` among the fields to render. ⛔ **The row descriptor deliberately has no
`severity` field**, and `presenter.test.ts:297-299` asserts it. Decision `2026-08-22-152` **D2(a)**
ruled that 10.9's severity **MAPS INTO** the `NoticeCategory` vocabulary (`presenter.ts:87-91`,
all three → `ink`) rather than being emitted beside it — *"conflating operator urgency with notice
kind is precisely what D2(c) refused"*, on a row anatomy with **exactly one colour slot**.

⛔ Do not add a severity prop, a severity tint, a severity icon or a severity badge to the row.
⛔ Do not re-open the mapping. ⚠ If it looks wrong with the code in front of you, **stop and raise
it** — ⛔ never silently deviate ([[feedback_supersede_never_reinterpret]]).

⭐ The same applies to `body` (⇒ `meta`, ONE field) and `link CTA` (⇒ absent, routed). All three
reconciliations are already written out in `view-model.ts:133-163`. **Read that comment; do not
re-derive it.**

### Trap 3 — ⭐⛔ 11a.5's TESTS FENCE THIS STORY'S WORK. Four assertions fail on the obvious approach — and ONE of them is right to.

⚠ **They are not stale. They were written to hold a line until this story arrived.** ⛔ Amending a
fence is a deliberate act with a stated reason, ⛔ never a "test fixup" commit.

| Fence | What it forbids | Disposition |
|---|---|---|
| `packages/ui/tests/noticeboard/presenter.test.ts:327` | ⛔ **any row-descriptor key matching `/dismiss/i` except `dismissible`** — *"The descriptor exposes no way to ACT on it — that is Story 11a.6's"* | ⭐ **D5(a) keeps it INTACT** — the recommended design adds no descriptor field |
| `presenter.test.ts:294` | the row descriptor emits **exactly** five fields | ⭐ **D5(a) keeps it INTACT** |
| `presenter.test.ts:256` | `NoticeboardBannerNoticeInput` has **exactly 7 keys** | ⭐ **D5(a) keeps it INTACT** — ⛔ `revision` is NOT added to the presenter input |
| `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:334-340` | ⛔ `useDismissBannerMutation` / `DismissBannerResponse` / `dismiss.mutate` **anywhere in `PanchayatNoticeboard.tsx` or `PinnedItem.tsx`** | ✅ **MUST BE AMENDED by this story** — it is the fence that was holding the interaction for 11a.6, and this is 11a.6. ⚠ Amend it into its **inverse** (assert the dismiss path IS wired, through the EXISTING mutation and ⛔ not a new one), ⛔ do not delete it |
| `panchayat-noticeboard-render.test.ts:191-198` | `CATEGORY_HINT_KEYS` has four `open_detail_*` values; `black` reads *meeting*, ⛔ never *memorial* | ✅ **AMENDED (D6(a))** — the `black ≠ memorial` assertion **survives verbatim** in the successor keys; ⛔ that half is not negotiable |

⭐ **The distinction that matters:** three fences protect a **contract** (the row descriptor's shape)
and stay. Two fences protect a **boundary in time** (11a.5 stops here) and this is the story they
were waiting for. ⛔ Never amend the first kind to make the second kind's work easier.

### Trap 4 — ⚠ `display_once_per_member` IS ALREADY REPORTED, BY `<BannerHost>`, ON THIS TAB. Do not report it again.

`BannerHost.tsx:176-199` posts `{kind:'shown'}` on first render for a `display_once_per_member`
banner, guarded by a `useRef` set. ⭐ **The route suppression is placed AFTER that effect,
deliberately** (`BannerHost.tsx:206-210`: *"the member DOES see the banner here, just in the
noticeboard rather than the strip, so reporting it as `shown` stays truthful"*).

⇒ ⛔ **the noticeboard must NOT post `shown`.** The `useRef` guard lives inside `BannerHost` and is
**not shared**, so a second reporter is a genuine double-post — and because `shown` **suppresses
identically to `dismissed`** (`enums.ts:91`), the two writers would race on the same suppression.

⚠ Consequence to know, ⛔ not to fix: a `display_once_per_member` banner appears as a noticeboard row
**once** and is gone on the next read. ⭐ That is already 11a.5's shipped behaviour and it is correct.

### Trap 5 — ⚠ THE ROW CURRENTLY TELLS A SCREEN-READER USER SOMETHING UNTRUE.

`PinnedItem.tsx:38-45`: `accessibilityRole="button"` + `accessibilityHint` = *"Tap to open … notice
detail"* → `onPress` is an **empty function body**. ⛔ There is **no detail screen**, and the row
descriptor carries **no link CTA** (routed, item (g)).

⇒ a screen-reader user is told there is a destination, activates the control, and **nothing happens**.
⚠ ⛔ That is a live accessibility defect on a shipped tab, ⛔ not a cosmetic one — and the epic's own
third AC for this story is *"semantic accessibility per Story 1.17 design system"*, with UX `:1820`
asking specifically for the category to reach the **label**.

✅ **D6(a) rules it: the row becomes NON-INTERACTIVE CONTENT.** ⭐ Note the shape: the fix is **to remove a lie, not to add a feature** — ⛔ inventing
a destination is out of scope and would pre-empt routed item (g).

⚠ ⭐ **BUT THE LIE AND THE GROUPING RIDE THE SAME COMPONENT, so removing one removes the other unless
you replace it deliberately.** The `Pressable` is what makes UX `:1820`'s *"title and meta read as a
unit"* true **today** (RN defaults it to `accessible={true}`, merging children into one announcement).
Drop it and the row fragments into two stops with no composed label — ⛔ **a NEW a11y defect introduced
while fixing an old one**, and the same defect class CR-5 already recorded on the seal element beside it
(**Task 6e**). ⇒ the replacement is an explicit `accessible={true}` **grouping wrapper around title+meta
ONLY**, carrying the presenter's composed label. ⚠ ⛔ **The dismiss control must be a SIBLING of that
wrapper, ⛔ never a child** — a nested control inside an `accessible` container is not individually
focusable to a screen reader, which would make the row's only remaining action unreachable. See **AC6**.

### Trap 6 — ⚠ TWO POST-DISMISS BEHAVIOURS EXIST IN THIS APP FOR THE SAME UNDERLYING BANNER.

| | `<BannerHost>` (10.9, shipped) | UX `:1818` for `<PinnedNotice>` |
|---|---|---|
| after dismiss | ⛔ **removed** from the tree, optimistically | ⭐ **faded in place** — *"dismissed (faded if member-dismissable)"* |
| rollback on write failure | ✅ `onError` restores it (`BannerHost.tsx:165-169`) | not specified |

⛔ **Neither is wrong; they are different components.** ⚠ But they now act on the **same banner row**,
so picking silently would leave two ratified behaviours contradicting each other with no record.
✅ **D4(a) rules it: the ratified FADED state is rendered, and the refetch removes the row.**

⭐ **One mechanical fact that makes the answer cheap, ⛔ so do not design around a problem that is not
there:** `useDismissBannerMutation` invalidates `onSettled` → the member read refetches → the strip
presenter maps `isFetching` to **`refreshing`**, which by construction **keeps content on screen**
(`view-model.ts:59`, and the code-review patch at `presenter.ts:155-161` that made `refreshing`
require `rows.length > 0`). ⇒ there is ⛔ **no flash-to-empty** to defend against.

---

## Acceptance Criteria

> ⚠ **AC5 is satisfied BY CONSTRUCTION and its AC exists to keep it that way** — it is the one AC a
> dev agent is most likely to "implement" and thereby break. Read it before AC1.

### AC1 — `<PinnedNotice>` is the noticeboard ROW, and the epic's field list is reconciled against `:1817` in writing

**Given** the epic's 11a.6 AC (*"persistent pinned banner above the fold with: title, body, severity,
dismiss-with-ack"*) and `ux-design-specification.md:1814-1821` (*"a single notice **row** … **Surfaces:**
Inside `<NoticeboardStrip>`"*) and Story 11a.5's Trap-5 split (11a.5 owns the STRIP, 11a.6 owns the ROW)
**When** the component is authored
**Then** it is the **promotion of `apps/mobile/components/panchayat/PinnedItem.tsx`** — ⛔ **no new
above-the-fold surface, ⛔ no sticky header, ⛔ no second `<BannerHost>`, ⛔ no new mount point**
**And** the four epic field names are reconciled **explicitly, naming both sources** (the
`view-model.ts:133-163` precedent): `title` → `title` · `body` → `meta` (ONE field) · `severity` →
**mapped into `category`** (D2(a); ⛔ never a second axis — Trap 2) · `dismiss-with-ack` → AC3
**And** ⚠ *"above the fold"* is recorded as **already true and requiring no work**: `pinned` is the
third section of the presenter's ordered list, but `stats` before it renders `silent`, so the **only**
thing above it on the tab is the masthead. ⛔ Do not add a sticky/pinned scroll behaviour — `:1807`
ratifies a *"full-width **vertical** stack"*
**And** ⛔ **at most ONE row can exist today** (the banner lane is the only producer): ⛔ no list
reordering, ⛔ no grouping, ⛔ no "N more" collapse, ⛔ no multi-select dismiss

### AC2 — the row's shareable logic is a HEADLESS presenter, in the module that already owns the row contract

**Given** Trap 1 of Story 11a.5 (`packages/ui` has zero `.tsx` and depends only on `@twt/contracts`)
and the existing `NoticeboardRowDescriptor`
**When** the presenter is authored
**Then** it lives **inside `packages/ui/src/noticeboard/`** (⛔ not a new top-level module — **D2**),
takes a `NoticeboardRowDescriptor` as input, and emits a row view-model
**And** it contains ⛔ no `react`/`react-native`/`tamagui` import, ⛔ no JSX, ⛔ no colour hex, ⛔ no
resolved copy, ⛔ no numeral formatting — only structured values and i18n **keys**
**And** it is **pure**: same input → same output, ⛔ no clock, ⛔ no I/O
**And** ⚠ **it is verified by READING, ⛔ not by trusting CI** — there is ⛔ no gate banning `react` in
`packages/ui`, and this story mints none ([[feedback_no_premature_package]])
**And** the new exports are added to `packages/ui/src/noticeboard/index.ts` (⚠ `.js` ESM specifiers on
every relative import/export — the package is `"type": "module"` on NodeNext) and the module's entry in
`packages/ui/src/index.ts` gains a Story-11a.6 line in the house register

### AC3 — dismiss-with-ack is ONE explicit action, wired to Story 10.9's EXISTING endpoint

**Given** the epic's *"dismiss-with-ack pattern (only acknowledged after explicit user action)"*,
`ux-design-specification.md:2318` (Pattern 2 — *"**When NOT to use** [a confirmation modal]"*) and
the friction budget's default of **zero friction with named attribution**
**When** a member acknowledges a notice
**Then** it takes **ONE explicit activation of an explicit affordance** — ⛔ **no confirmation modal,
⛔ no bottom-sheet, ⛔ no two-step confirm, ⛔ no swipe gesture as the only path, ⛔ no auto-dismiss on
scroll or timer**
**And** the acknowledgement is written through the **EXISTING** `useDismissBannerMutation` with
`kind: 'dismissed'` — ⛔ **no new endpoint, ⛔ no new mutation hook, ⛔ no new table, ⛔ no new MMKV
persistence, ⛔ no change to `packages/contracts/src/banners/*` or `apps/api/src/modules/banners/*`**
**And** the optimistic write **rolls back on failure** (the `BannerHost.tsx:162-170` posture) — a
failed write must ⛔ never permanently hide a notice the server did not suppress
**And** ⛔ **`{kind:'shown'}` is NOT posted from this surface** — `<BannerHost>` already reports it on
this tab and its once-guard is not shared (**Trap 4**)
**And** the affordance meets the **≥44pt** touch-target floor (`ux-design-specification.md:2310`; the
`BannerHost.tsx:57` `MIN_TOUCH_TARGET` precedent) and carries an `accessibilityLabel`
**And** ⛔ a row with `dismissible: false` renders **no affordance at all** — ⚠ a legal, reachable case
(`packages/domain/src/banners/errors.ts:84-86`), ⛔ not a theoretical branch

### AC4 — the ratified `dismissed` state is reachable and is a property of the presenter

**Given** `ux-design-specification.md:1818` — *"States: Default · pinned (left-stub colored) ·
**dismissed (faded if member-dismissable)**"* — and `<BannerHost>`'s opposite optimistic-removal
posture on the same banner (**Trap 6**)
**When** a member acknowledges a notice
**Then** the row enters a **`dismissed`** state that the **presenter** names — ⛔ never an ad-hoc
`opacity` literal decided in JSX
**And** in that state the dismiss affordance is **gone** (⛔ it cannot be double-fired) and the state
is **announced**, ⛔ not conveyed by opacity alone (colour/emphasis is never the sole channel — the
`BannerHost.tsx:62-64` and `tokens.ts:35-36` rule)
**And** ⚠ the state's **lifetime is the server's business, ⛔ not a local persistence decision**: the
mutation's `onSettled` invalidation refetches, 10.9's dismissal join suppresses the banner, and the
row is gone. ⛔ Do not persist a dismissed set to MMKV and ⛔ do not build a client-side expiry
**And** ⭐ there is **no flash-to-empty to defend against**: the in-flight refetch maps to
`refreshing`, which keeps content on screen by construction (**Trap 6**)

### AC5 — ⛔ the tier rule is NOT re-implemented in the row, and the presenter's SHAPE proves it

**Given** the epic's *"the component respects Story 11a.1 matrix tier — public-tier pinned notices
visible to all; authenticated-tier visible only to logged-in members"* **and** Story 11a.5 AC5 /
D5(a), which **already shipped exactly that rule** in `presenter.ts:63-100`
**When** this story is implemented
**Then** the row presenter takes ⛔ **no viewer, no audience, no authentication and no tier input** —
⭐ **asserted by shape**, the `presenter.test.ts:245-250` anti-widening precedent
**And** the AC is recorded as **satisfied by construction**: a descriptor only reaches the row after
`isVisibleToViewer` has passed it, so a row-level filter could only ever **disagree** with the
presenter — a second visibility taxonomy is the failure this clause exists to prevent
**And** ⛔ **no new `public-vs-private-matrix.yaml` surface entry** is added and ⛔ no `apps/public`
route ships — this story adds **no route**, and the matrix's bidirectional route-coverage leg is
satisfied by the **absence** of one (`deferred-work.md` item (c))
**And** ⛔ `AUDIENCE_VISIBILITY`, `SEVERITY_CATEGORY`, `isVisibleToViewer` and `bannerRow` are **not
edited** — the strip presenter's derivation is untouched by this story

### AC6 — semantic accessibility: the category reaches the LABEL, and the row stops claiming to be something it is not

**Given** `ux-design-specification.md:1820` (*"Stub color is **decorative**; category conveyed in
**screen-reader label** too; **title and meta read as a unit**"*), Story 1.17, and the Story 0.10
P0-2c accessibility gate
**When** the row renders
**Then** the **category** is conveyed through the accessibility **label** (⛔ not only a hint), and the
label's composition is a **pure, tested property of the presenter** — ⛔ not string concatenation in JSX
**And** ⭐ the routed empty-title defect is **closed here, in the pure layer**: an empty title must not
produce a label beginning `". "` (`deferred-work.md`, code-review-of-11a.5 item 4, which names
`PinnedItem.tsx:36`). ⚠ Close it by **composing from non-empty parts**, ⛔ not by tightening
`toNoticeboardBannerNotice`'s guard — that adapter belongs to the banner lane, and the label defect
belongs to the row
**And** title and meta are announced **as one unit** (⛔ not two stops)
**And** ⭐⛔ **that unit has an EXPLICIT mechanism, because D6(a) removes the one it has today**: the
`Pressable` is RN-default `accessible={true}` and is what merges the row's children into one
announcement. ⇒ title+meta are wrapped in an explicit `accessible={true}` container carrying the
presenter's composed label, and ⛔ **the dismiss control sits OUTSIDE that container** — a control nested
inside an `accessible` wrapper is not individually focusable, which would make the row's only action
unreachable. ⚠ ⛔ There is **no in-repo precedent to imitate** (`grep -rn 'accessible={true}'
apps/mobile/components/` → zero hits), so this will not happen by pattern-matching (**Trap 5**)
**And** the row's interactive semantics tell the truth (**Trap 5** / **D6**): ⛔ nothing announces
`accessibilityRole="button"` unless activating it does something
**And** every new string is a **bilingual `noticeboard`-namespace key** with hi + en parity; ⚠ the
9.12 Task-2 discipline applies — **check `packages/i18n/locales/en/banners.json` for reusable copy
first** and record the result, ⛔ then mint only what is genuinely new
**And** ⭐ **that check is already answered, so record the ANSWER rather than re-running the question:**
`banners.json` holds `dismiss` / `dismiss_a11y` (*"Dismiss this message"*) / `close` / `close_a11y`, which
are reusable **in WORDING but ⛔ NOT as keys** — the row resolves through the namespace-bound
`useNoticeboardT()`, and `panchayat-noticeboard-render.test.ts:271-274` **bans a second resolver in the
row**. ⇒ ⭐ **mint in `noticeboard`, matching `banners.json`'s wording so the two surfaces say the same
thing**; ⛔ do not reach across namespaces from the row, and ⛔ do not "reuse" by re-introducing a bare
`useT()`
**And** ⚠ the i18n namespace is **already registered**; ⛔ do not re-register, but ⛔ do not add a key
to only one locale — the parity gate walks the `locales/` directory

### AC7 — ✅ the member copy this surface ships is inside the microcopy register, with PROVEN teeth

> ✅ **D9(a) RULED — this AC is UNCONDITIONAL.** ⚠ ⭐ **Ungated means REQUIRED, ⛔ not optional**: the
> alternative (route the gap) was considered and **rejected**, so ⛔ there is no longer a path where
> this surface's copy ships unscanned.

**Given** `microcopy.yaml:350-352` (Story 11a.2, same epic) — *"the register grows surface-by-surface
**BY BEING ADDED TO** — a new namespace that is not globbed is **UNSCANNED COPY wearing a green
check**, which is the same defect class as a vacuous gate leg"* — and [[feedback_gate_scope_semantic_coverage]]
**When** this story ships member-visible copy into the `noticeboard` namespace
**Then** `packages/i18n/locales/{hi,en}/noticeboard.json` are added to `scope.copy_globs`, with an
inline comment naming the story and **why this surface is member-facing**, in the register of the
existing entries
**And** ⚠ the shipped 11a.5 copy is **already clean under the added scope** (measured at `d902b04`: both
globs added → `pnpm microcopy:check` passes over 18 copy files, zero findings), so ⛔ **a finding in it
would be a NEW one and must be read as a real defect** — ⛔ not as expected churn
**And** ⭐ **the teeth are PROVEN, ⛔ not assumed** — a `scripts/microcopy/noticeboard.test.ts` that
loads the **real** `microcopy.yaml` + the **real** locale files (the `close-of-cycle.test.ts` /
`common.test.ts` / `fursat.test.ts` shape) and asserts: (i) the shipped copy is **clean**, and
(ii) a **planted violation in BOTH locales FIRES** — ⛔ a green scan over newly-scanned files proves
nothing
**And** ⚠ the **numeral discipline** is the semantically load-bearing rule here: UX `:1161` (v4) rules
this surface's standalone counts and dates **Latin**, so a Devanagari operational digit in noticeboard
copy must fail at PR time
**And** ⛔ **no gate CODE changes** — this is a data-driven scope entry plus its proof test; ⛔ do not
edit `scripts/microcopy/{check,lib}.ts`
**And** ⛔ **no allow-list entry is added** to make the scan pass — a real finding is **fixed in the
copy** (the 8.10 `out-of-band` precedent), and only a genuine non-applicable earns an `allow:` row
**with a stated reason**

### AC8 — what this story does NOT build is ROUTED, with a re-trigger

**Given** [[feedback_gap_analysis_observational]]
**When** the story closes
**Then** each absence below is recorded in `deferred-work.md` with an explicit re-trigger — ⛔ observed,
⛔ not scheduled and ⛔ not built (see **Task 6** for the list)
**And** ⚠ **the routed items this story CLOSES are closed in precise language**
([[feedback_closure_language_precision]]): *"Closed by [edit]"* vs *"Resolved via explicit deferral"*
vs *"Not addressed"* — ⛔ never collapsed, and ⛔ never marked closed merely because a trigger fired

---

## Tasks / Subtasks

> ⛔ **Task 0 is a hard precondition** — the `governance:` commit lands **before** any implementation
> commit ([[feedback_governance_commits_precede_implementation]]).

- [x] **Task 0 — governance commit FIRST** (precondition)
  - [x] Read the `.decision-log.md` head **live** (⛔ do not hardcode; it was `2026-08-22-152` at authoring)
  - [x] Add the entry recording BigDev's ruling of **2026-08-22**: ✅ **D1(a) · D2(a) · D3(a) · D4(a) · D5(a) · D6(a) · D7(a) · D8(a) · D9(a)** — ⚠ **ALL NINE, ⛔ not eight** — each with the reasoning stated in §Decisions, ⛔ transcribed rather than re-derived
  - [x] ⭐ **D1 is an epic-AC reconciliation and D8 is a UX-spec AMENDMENT** — the entry must say so, naming the superseded line explicitly ([[feedback_supersede_never_reinterpret]], [[feedback_closure_language_precision]])
  - [x] ⭐ **D9 is named by ⛔ NO epic AC and is the one most likely to be dropped in transcription** — the entry must record it either way: ruled (a) it is a **gate-scope closure**, ruled (b) it is a **routed gap with a re-trigger**. ⛔ An unrecorded D9 is indistinguishable from an unasked question
  - [x] Commit **alone**, `governance:` prefix, **before** any implementation commit

- [x] **Task 1 — author the row presenter** (AC: 2, 4, 5, 6)
  - [x] Read `packages/ui/src/noticeboard/{view-model,presenter,i18n-keys,index}.ts` end-to-end first — ⛔ the row descriptor's doc comment is the brief; do not re-derive it
  - [x] Add the row view-model types + `derivePinnedNoticeViewModel` per **D2(a)**; ⛔ **`NoticeboardRowDescriptor` itself is NOT modified** (D5(a); Trap 3)
  - [x] ⭐ The a11y label is composed from **non-empty parts** — the empty-title `". "` defect closes here (AC6)
  - [x] The `dismissed` state and the affordance predicate are presenter properties (AC4); ⛔ no `opacity` decision in `@twt/ui`
  - [x] ⛔ **No viewer / audience / tier parameter** (AC5)
  - [x] `i18n-keys.ts` — the category **label** keys (✅ D6(a): they **replace** the `open_detail_*` hint keys) + the dismiss/dismissed a11y keys; ⚠ the `banners.json` check is already answered (AC6): **mint in `noticeboard` matching `dismiss_a11y`'s wording**, ⛔ never resolve across namespaces from the row
  - [x] `index.ts` barrel + the Story-11a.6 line in `packages/ui/src/index.ts`; ⚠ `.js` ESM specifiers throughout
  - [x] ⛔ Verify zero react/react-native/tamagui imports and zero colour hex **by reading** — there is ⛔ no gate (AC2)

- [x] **Task 2 — tests for the row presenter** (AC: 2, 4, 5, 6)
  - [x] `packages/ui/tests/noticeboard/pinned-notice.test.ts` — mirror the `presenter.test.ts` register
  - [x] ⭐ **The AC5 shape proof**: the row presenter's input surface admits ⛔ no viewer/audience/tier key (the `presenter.test.ts:245-250` anti-widening precedent)
  - [x] Both states reachable and **distinct**; the affordance is absent when `dismissible: false` **and** when already `dismissed`
  - [x] ⭐ The empty-title label case: ⛔ no leading `". "`, ⛔ no empty part, and title+meta announced as ONE unit
  - [x] ⛔ **`presenter.test.ts` is NOT amended** (D5(a)) — ⚠ if a change to it seems necessary, **stop and raise it**: it means the descriptor is being widened (Trap 3)

- [x] **Task 3 — promote `PinnedItem.tsx` into the real row** (AC: 1, 3, 4, 6)
  - [x] Render from the row view-model; ⛔ no composition decision left in JSX
  - [x] ✅ **D6** — the row's interactive semantics; ⚠ the `black ≠ memorial` guarantee **survives** into the successor keys (Trap 3)
  - [x] ⭐⛔ **Replace the a11y grouping the `Pressable` was providing** (AC6 / Trap 5): an explicit `accessible={true}` wrapper around **title+meta only**, carrying the presenter's composed label — and ⛔ **the dismiss control OUTSIDE it**, or it stops being focusable. ⚠ ⛔ Zero in-repo precedent; ⛔ this will not happen by imitation
  - [x] ✅ **D3/D4** — the dismiss affordance (≥44pt, labelled) and the `dismissed` render; ⛔ `dismissible: false` ⇒ no affordance
  - [x] ⛔ `CATEGORY_TOKENS` and `RULE_HAIRLINE_TOKEN` stay in `apps/mobile/components/panchayat/tokens.ts` — ⚠ **colour stays in the render layer** (D6(a) of `2026-08-22-152`); ⛔ do not add `@twt/tokens` to `apps/mobile` and ⛔ do not touch `tamagui.config.ts`
  - [x] Update `packages/i18n/locales/{hi,en}/noticeboard.json` — **both** locales, ⛔ never one

- [x] **Task 4 — wire the acknowledgement** (AC: 3, 4)
  - [x] ✅ **D5(a)** — the SCREEN owns the dismissal identity: `bannerDismissalKey(banner_id, revision)` from the banner it already holds; ⛔ do not re-implement the key format and ⛔ do not edit `copy.ts`
  - [x] ✅ **D3(a)** — `useDismissBannerMutation` with `kind:'dismissed'`, optimistic + **rollback on error**
  - [x] ⛔ **Do NOT post `{kind:'shown'}`** (Trap 4)
  - [x] ✅ **D7(a)** — ⛔ `BannerHost.tsx`, `route-suppression.ts`, `useMemberBannersQuery.ts` and `copy.ts` are **NOT edited**
  - [x] ⚠ **Amend `panchayat-noticeboard-render.test.ts:334-340` into its inverse** — assert the dismiss path IS wired **through the existing mutation**, and that ⛔ no second mutation/endpoint/`'shown'` post was introduced. ⛔ Do not delete the test (Trap 3)
  - [x] Extend `panchayat-noticeboard-render.test.ts` — ⚠ ⛔ **and note WHAT that file can actually assert**: the mobile harness is **pure Vitest with ⛔ NO component renderer** (⛔ no `@testing-library/react-native` anywhere in `apps/mobile/package.json`; the file states it at `:3-4`). ⇒ three reachable mechanisms, ⛔ and no fourth:
    - [x] **SOURCE-SCAN** for the affordance, the ≥44pt floor and the `dismissible: false` guard — ⭐ which is exactly why AC4 makes the affordance predicate a **presenter property** and the touch target a **named constant**: an anonymous `44` or an inline JSX condition is **unassertable here**
    - [x] **REAL `t()`** resolution of every new key in **both** locales (the namespace-throw gate)
    - [x] **PURE UNIT TESTS** in `packages/ui` for anything about composition or state (Task 2) — ⛔ not here
  - [x] ⛔ **Do NOT add a renderer to make an assertion reachable.** `@testing-library/react-native` is a **new workspace dependency**, which this story forbids — if a guarantee seems to need one, **stop and raise it**; it means the logic belongs in the presenter

- [x] **Task 5 — ✅ bring the `noticeboard` copy into the microcopy register** (AC: 7) — ⚠ **D9(a) RULED: REQUIRED**
  - [x] Add `packages/i18n/locales/{hi,en}/noticeboard.json` to `microcopy.yaml` `scope.copy_globs`, with an inline rationale comment in the register of the existing entries
  - [x] ⭐ `scripts/microcopy/noticeboard.test.ts` — **real** `microcopy.yaml` + **real** locale files; shipped copy CLEAN **and** a planted violation in **BOTH** locales that **FIRES**, plus revert-sanity ([[feedback_gate_scope_semantic_coverage]])
  - [x] ⚠ Fix any real finding **in the copy** (the 8.10 `out-of-band` precedent); ⛔ no `allow:` entry to make a scan pass, ⛔ no edit to `scripts/microcopy/{check,lib}.ts`
  - [x] ⚠ ⭐ **The shipped 11a.5 copy is already CLEAN under the added scope** (measured: both globs added → `pnpm microcopy:check` passes, 18 copy files, zero findings) ⇒ ⛔ a finding here is a **NEW** defect, ⛔ not expected churn

- [x] **Task 6 — route what this story does not build** (AC: 8) ([[feedback_gap_analysis_observational]])
  - [x] (a) ⭐ **`ux-design-specification.md:1817`'s row anatomy has NO dismiss slot while `:1818` ratifies a `dismissed` state.** ⚠ An **incompleteness**, ⛔ not a `:491`-style contradiction — ⛔ do not record it as a supersession. Route the anatomy addition (the affordance this story ships is the de-facto answer, and the spec should say so). **Trigger:** the next edit to §11
  - [x] (b) **The notice DETAIL destination** — ⛔ still absent. ⚠ Item **(g)**'s trigger fired here and is answered *"there is no destination"*; ⛔ **re-route it with a SHARPER trigger** (the story that builds a notice-detail surface, at which point the descriptor gains a CTA field **with a real consumer**). ⛔ Do not close it
  - [x] (c) **The duplicated optimistic-dismissal shape** — `BannerHost` and the noticeboard now hold the same optimistic-key + rollback logic over the same data (D7(a) declined the extraction on blast radius, ⛔ not on merit). **Trigger:** a **third** consumer of the banner dismissal path, or the first non-banner notice producer
  - [x] (d) ⚠ **Restate, ⛔ do not close, the still-open 11a.5 routings this story touched the edges of:** the close-of-cycle read model (item a) · the aggregate stat read model (item b) · the public-embed variant (item c) · the admin-home variant (item d) · the `@twt/tokens`→`tamagui.config.ts` bridge (item f) · the `PollsEntry` hairline · the `panchayat` bare-segment match. ⛔ **"Not addressed"**, ⛔ never "closed"
  - [x] (e) ⭐⛔ **CR item 5 of the 11a.5 code review — the ONE routed item whose trigger arguably fires here, and it must NOT be passed over in silence.** The `PanchayatNoticeboard.tsx` seal `<View accessibilityLabel={t('seal_a11y')}>` has ⛔ no `accessible={true}` (`:167-176`) and `PinnedSkeleton` announces `accessibilityRole="progressbar"` with ⛔ no `accessibilityValue` (`:201-203`). ⚠ Its trigger is *"an accessibility audit pass over the mobile app's newer screens"*, and ⭐ **this is the story whose own AC6 is semantic accessibility, editing that exact file** — so *"the trigger did not fire"* is ⛔ **not** an available answer. ⚠ ⭐ **The seal defect is the SAME defect class as the one AC6 closes in the row**: an `accessibilityLabel` on a container that was never made `accessible`. Record the disposition **explicitly** — *"Not addressed"* if the masthead and skeleton stay 11a.5's (⛔ the default, since ⛔ this story moves neither), ⛔ **never silence** ([[feedback_closure_language_precision]])
  - [x] Add each with its re-trigger; ⛔ observe and route — do not schedule, and do not build

- [ ] **Task 7 — story close-out**
  - [ ] ⚠ **friction-budget disposition** — a **one-tap** dismiss on an already-rendered row introduces **no** gratuitous friction (and removes some: a member can clear their own board), ⇒ ⛔ **no new ledger row**. ⚠ Record the metric facet honestly: `apps/mobile` is an EAS-build no-op ⇒ `member-app-native` is **UN-MEASURED**, ⛔ not "passing" ([[feedback_record_unattested_no_backfill]]). ⭐ **D3(a) RULED (one tap, ⛔ no confirm step) ⇒ the disposition above STANDS as written** — ⛔ the confirm-step branch that would have owed a named-payer row is ⛔ not the ruling and ⛔ is not built
  - [ ] `pnpm ci:local` green (⚠ `--concurrency=4`; ⚠ `git push` runs the full leg via the pre-push hook — the "hang" is expected, [[project_friction_budget_baseline_ratchet]])
  - [ ] ⚠ Run the live-DB leg and **record its result openly**, attributing any failure rather than assuming it ([[project_known_livedb_test_failures]], [[project_ci_local_double_run_pollution]]) — ⭐ this story touches ⛔ zero files in `apps/api`, `apps/jobs`, `packages/domain`, `packages/events`, `packages/contracts`, `packages/queue`
  - [ ] Sprint-status ledger entry per [[project_sprint_status_ledger]] — one combined top-of-file entry; flip **only** `11a-6-pinned-notice-component`. ⚠ ⭐ **`epic-11a` becomes eligible for `done` — 11a.6 is the LAST story in the epic** (`epic-11a-retrospective` is `optional`). ⛔ Row 17 untouched
  - [ ] ⛔ **REBASE-merge**, never squash ([[project_story_automator_ops]])

---

## ⚖️ Decisions — ✅ **ALL NINE RULED (BigDev, 2026-08-22), each AS RECOMMENDED.**

> ⚠ Durability is **Task 0's `governance:` commit**, ⛔ not this file — ⛔ do not treat this section as
> the record of the ruling ([[feedback_governance_commits_precede_implementation]]).
>
> ⚠ ⭐ **The rejected options below are KEPT DELIBERATELY, ⛔ not left behind as clutter.** Each says why
> it lost; a later story that wants to re-open one must argue against the stated reason, ⛔ never
> rediscover the question as if it were fresh ([[feedback_supersede_never_reinterpret]]).

### ✅ D1 — RULED (a) — Is `<PinnedNotice>` the noticeboard ROW, or the epic's "persistent banner above the fold"? (Trap 1)

The epic AC and `ux-design-specification.md:1814-1821` describe **different components**, and the
epic's description is **already shipped** as `<BannerHost>`.

- **(a) ⭐ RECOMMENDED — the ROW.** `:1814-1821` is the **component-level contract** and wins over epic
  prose, exactly as D2(a) of `2026-08-22-152` ruled for `:1819` over `:491`. ⭐ **And the epic itself
  already agrees:** its own anchor **UX-DR16** (`epics.md:406`, cited by this very AC's `Given` at
  `:4690`) reads *"Noticeboard **ROW** primitive with left colored stub"*, as do UX `:680` and `:1222`.
  ⇒ ⛔ this is not the spec overriding the epic — it is **the epic's `Then` prose contradicting the
  epic's own `Given`**, with four ratified sources on the ROW side. `<PinnedNotice>` is the
  promotion of `PinnedItem.tsx`; *"above the fold"* is recorded as **already true** (only the masthead
  renders above it) and needs no work. ⛔ No new surface, no sticky behaviour, no second mount point.
- (b) Build the epic's above-the-fold persistent banner as a new component. ⛔ **Refused on the merits** —
  it duplicates `<BannerHost>` and deliberately recreates the one-banner-twice bug D7(a) just fixed.
- (c) Make the pinned section sticky within the noticeboard's `ScrollView`. ⛔ Contradicts `:1807`
  (*"full-width vertical stack"*) and no spec section asks for it.

### ✅ D2 — RULED (a) — Where does the row's shareable logic live? (AC2)

`packages/ui` is headless, and `NoticeboardRowDescriptor` already lives in `src/noticeboard/`.

- **(a) ⭐ RECOMMENDED — EXTEND `packages/ui/src/noticeboard/`** with a row presenter
  (`derivePinnedNoticeViewModel`) + its view-model types + its i18n keys, taking the existing
  descriptor as input. One component family, one module, one contract.
- (b) A new top-level `packages/ui/src/pinned-notice/` module. ⛔ Fragments `<NoticeboardStrip>` and
  `<PinnedNotice>` across two modules and forces the descriptor to be imported across them — the exact
  drift the package exists to close.
- (c) No presenter — RN-only. ⛔ Contradicts the epic's *"extension of `packages/ui`"*, and it strands
  the a11y-label rule and the `dismissed` state in one render stack, where the routed **admin-home**
  variant (`deferred-work.md` item (d)) would have to re-derive them.

### ✅ D3 — RULED (a) — What does "dismiss-with-ack (only acknowledged after explicit user action)" mean mechanically? (AC3)

- **(a) ⭐ RECOMMENDED — ONE explicit activation of an explicit affordance, POSTed to 10.9's existing
  idempotent endpoint.** *"Explicit user action"* rules out auto-dismiss on scroll/timer/navigation —
  it does ⛔ **not** mean a second confirmation step. `ux-design-specification.md:2318` reserves
  confirmation modals for **irreversible** actions and names the anti-pattern in terms; dismissal is
  reversible by a copy revision. And the friction budget's default is **zero friction with named
  attribution** — a second step would owe a ledger row with a named payer, for **clearing an
  announcement**.
- (b) Two-step confirm (Tamagui `Sheet` per Pattern 2's mobile note). ⛔ Refused above; ⚠ if ruled,
  Task 7 **must** add a friction-budget row.
- (c) Local-only dismissal (MMKV), no server write. ⛔ Reinvents 10.9's server-authoritative,
  revision-aware suppression and would make the noticeboard and `<BannerHost>` disagree about the
  same banner on the same device.

### ✅ D4 — RULED (a) — What does the row look like AFTER acknowledgement? (Trap 6, AC4)

`:1818` ratifies **faded**; `<BannerHost>` **removes**.

- **(a) ⭐ RECOMMENDED — render the ratified `dismissed` (faded) state, and let the refetch remove the
  row.** `:1818` is this component's own contract; removing immediately makes a ratified state
  **unreachable**. The fade is the acknowledgement feedback, the server suppression is the authority,
  and `refreshing` keeps content on screen so there is no flash. On write failure the optimistic state
  rolls back and the row returns to `default`.
- (b) Remove immediately, matching `<BannerHost>`. ⛔ Consistent with the sibling but leaves `:1818`'s
  `dismissed` state dead — ⚠ and an unreachable ratified state is a spec amendment, not a shortcut.
- (c) Faded and **persisted** until app restart. ⛔ Contradicts the server read and needs local
  persistence D3(c) already refuses.

### ✅ D5 — RULED (a) — Where does the dismissal IDENTITY (`revision`) live? ⭐ This closes the routed 11a.5 review finding.

`NoticeboardRowDescriptor.id` is the bare `banner_id`; the client dismissal key is
`bannerDismissalKey(banner_id, revision)`.

- **(a) ⭐ RECOMMENDED — NOWHERE NEW. It stays on the banner lane, at the render boundary.** The screen
  already holds `data.banner` (it must, to build the presenter input), so it composes the key itself
  and hands `<PinnedNotice>` a `dismissed` flag + an `onDismiss` callback. ⇒ ⛔ the **source-agnostic**
  row descriptor is not widened with a **source-specific** identity, all three `presenter.test.ts`
  fences stay intact, and there remains exactly **one** implementation of the key format.
  ⭐ The routed finding is then **closed by design**, ⛔ not by adding the field: the gap was an
  artifact of assuming the descriptor must carry everything the row needs.
- (b) Add `dismissalKey`/`revision` to the descriptor and amend `presenter.test.ts:256,294,327`.
  ⛔ Widens a shared contract for one source's bookkeeping and weakens a fence one story after it was
  built — the widening Trap 2 of 11a.5 forbids, in a third place.
- (c) Key the optimistic set on the bare `banner_id`. ⛔ Exactly the defect the code review raised: a
  copy revision that is meant to **re-surface** the notice would be swallowed by a stale in-session
  dismissal.

### ✅ D6 — RULED (a) — Does the row keep `accessibilityRole="button"` and its "tap to open detail" hints? (Trap 5, AC6)

There is no detail destination, and the descriptor carries no link CTA.

- **(a) ⭐ RECOMMENDED — NO.** The row becomes **non-interactive content**; the **category moves into the
  accessibility LABEL** per `:1820`; the four `open_detail_*` keys are **replaced** by category-label
  keys (⚠ the `black ≠ memorial` assertion survives verbatim); the **dismiss affordance becomes the
  row's only control**. ⛔ This removes a lie rather than adding a feature, and it leaves routed item
  (g) **open** for the story that builds a destination.
- (b) Keep the button role and the hints, wire nothing. ⛔ Ships a live a11y defect on a shipped tab,
  against this story's own *"semantic accessibility"* AC.
- (c) Wire the press to a destination. ⛔ None exists; inventing one is scope invention and pre-empts
  item (g)'s trigger.

### ✅ D7 — RULED (a) — Does `<BannerHost>` get touched again?

11a.5 edited it once, for one condition (D7(a)). The two components now duplicate an optimistic-set +
rollback shape over the same data.

- **(a) ⭐ RECOMMENDED — NO. ⛔ Zero edits.** The noticeboard uses the **existing** mutation and holds its
  own optimistic key. ⚠ They can never disagree **on screen**, because `<BannerHost>` already
  self-suppresses on the panchayat route. The duplication is **routed** with a re-trigger (Task 6c).
- (b) Extract a shared `useBannerDismissal` hook consumed by both. ⚠ The architecturally tidier answer;
  ⛔ declined on **blast radius**, ⛔ not on merit — it re-opens a 10.9 component for a refactor from
  inside a story scoped to one row, the same call D6(c) of `2026-08-22-152` made.
- (c) Route the noticeboard's dismiss through `<BannerHost>`. ⛔ Inverts the mount hierarchy — the host
  is above the tab, the row is inside it.

### ✅ D8 — RULED (a) — ⭐ The `:491` → `:1819` UX-spec amendment: its named trigger is THIS authoring pass. ⇒ **APPLY IT.**

`deferred-work.md` item **(e)**: *"**Trigger:** the next edit to `ux-design-specification.md`
§5/§8/§11, or **Story 11a.6's authoring pass** — whichever comes first."*

- **(a) ⭐ RECOMMENDED — APPLY IT**, as a standalone `docs:` commit, and close the item as
  **"Closed by edit"**. The ruling is already durable (Decision `2026-08-22-152` D2(a)); the file edit
  is bookkeeping that 11a.5 deferred only so it would be made *"by whoever owns the artifact, with the
  whole §5/§8/§11 grammar in front of them"* — ⭐ which is precisely this story's position, since
  `<PinnedNotice>` is built **against `:1819`**. ⛔ **Scope: the already-ruled supersession ONLY** —
  ⛔ retire `saffron`, ⛔ correct every `black`-as-bereavement reading, ⛔ and **nothing else**. The
  §1817/§1818 affordance gap (Task 6a) is a **new** question and stays routed.
- (b) Re-route with a fresh trigger. ⛔ The trigger already fired; re-routing a fired trigger is how a
  routed item becomes permanent ([[feedback_mechanization_split_commitment]] — decay concentrates in
  the un-mechanized half).
- (c) Treat it as satisfied because this story reads `:1819`. ⛔ **Reading the right line is not the
  same act as amending the wrong one** ([[feedback_closure_language_precision]]) — the spec would stay
  self-contradicting with the item marked done.

### ✅ D9 — RULED (a) — ⭐ Does this story bring the `noticeboard` copy into the microcopy register? ⇒ **YES.** (AC7 — ⛔ named by NO epic AC)

Story 11a.5 minted the `noticeboard` namespace and rendered it on a **live member tab**; ⛔ it is
**absent from `microcopy.yaml` `scope.copy_globs`**. ⚠ The member vocabulary register, the
blame/scarcity/`fursat` tone rules and the UX-DR73 numeral discipline therefore do not bite it — while
`pnpm microcopy:check` reports green. ⭐ **Story 11a.2, three stories earlier in this same epic, wrote
the rule against exactly this** (`microcopy.yaml:350-352`).

- **(a) ⭐ RECOMMENDED — YES, close it here, with proven teeth.** This story **adds member copy to that
  namespace**, so it is the story that makes the gap bigger and the cheapest one to close it in.
  ⭐ **AND THE COST IS MEASURED, ⛔ NOT ASSUMED** ([[feedback_record_unattested_no_backfill]]): the two
  globs were added at `d902b04` and `pnpm microcopy:check` was **RUN** — it **PASSES**, scanning **18**
  copy files instead of 16, with **zero findings**; `hi/noticeboard.json` carries ⛔ no Devanagari
  operational digit and ⛔ no scarcity/blame/`fursat` frame. ⇒ ⭐ **closing the gap does NOT drag
  11a.5's shipped copy into a re-authoring**, which is the cost that would have made (b) defensible.
  ⚠ ⛔ The probe was reverted; the scope entry is still **unmade** and is this story's to make. Add
  the two globs + `scripts/microcopy/noticeboard.test.ts` (real config, real locale files, planted
  violation in BOTH locales + revert-sanity) — the `close-of-cycle` / `contribution` / `out-of-band` /
  `common` / `fursat` precedent. ⛔ **Scope: the scope entry and its proof test ONLY** — ⛔ no gate-code
  change, ⛔ no allow-list entry, ⛔ no widening to other namespaces.
- (b) Route it; ⛔ do not build it here. ⚠ Defensible on scope purity — it is named by no epic AC — but
  ⭐ **it is the shape [[feedback_mechanization_split_commitment]] warns about**: the copy ships in the
  un-mechanized half and the register keeps growing around it. ⛔ If ruled, **AC7 is struck and the gap
  is ROUTED at Task 6 with a re-trigger** — ⛔ never silently dropped.
- (c) Add the globs **without** a teeth test. ⛔ Refused on the merits — [[feedback_gate_scope_semantic_coverage]]:
  a green scan over newly-scanned files proves nothing, and every prior entry in this file paid for its
  teeth.

---

## Dev Notes

**Read before writing:** `packages/ui/src/noticeboard/view-model.ts:133-175` (⭐ **the row
descriptor's doc comment is this story's brief**) · `packages/ui/src/noticeboard/presenter.ts`
(⛔ read-only for this story) · `apps/mobile/components/panchayat/PinnedItem.tsx` (what you are
promoting) · `apps/mobile/components/banners/BannerHost.tsx:107-127,142-199` (the dismiss precedent —
affordance, optimistic set, rollback, `shown` guard) · `apps/mobile/components/banners/copy.ts:41-49`
(`bannerDismissalKey`) · `packages/domain/src/banners/read.ts:134-165` (⭐ **why revision matters**) ·
`packages/ui/tests/noticeboard/presenter.test.ts:238-333` (⚠ **the fences** — Trap 3).

**Reuse before you build.** Every mechanism this story needs already exists: the endpoint, the
mutation hook, the key helper, the touch-target constant, the token map, the i18n namespace, the row
descriptor. ⭐ **The only genuinely new artifacts are the row presenter, its tests, and a handful of
i18n keys.** ⚠ If you find yourself writing a route, a table, a mutation, a query or a persistence
layer, **stop and raise it**.

**Bundle boundary.** `@twt/ui` depends only on `@twt/contracts`. ⛔ Never import `@twt/domain` — it
pulls `pg`/`drizzle`/`@google-cloud/kms` into the RN Metro bundle
([[project_contracts_domain_bundle_boundary]]).

**Import-cycle trap.** Prefer `import type` for cross-module types, and ⛔ never convert a type-only
import to a value import casually — it materializes a module-init cycle that breaks **consuming**
packages at runtime while typecheck/lint pass ([[project_type_only_import_cycle_trap]]).

**i18n.** `t()` defaults to `common` and **throws** on a missing key. The `noticeboard` namespace is
already registered in both `catalog.ts` literals — ⛔ do not re-register it, ⛔ but do keep `hi` and
`en` in parity, and ⛔ do not call bare `useT()` in the row (`useNoticeboardT` exists;
`panchayat-noticeboard-render.test.ts:274` asserts it).

**⛔ The mobile harness cannot render.** `apps/mobile` is **pure Vitest** — ⛔ no
`@testing-library/react-native`, ⛔ no component mount, anywhere (`panchayat-noticeboard-render.test.ts:3-4`
says so; the `banner-host-render.test.ts` / `status-pill-render.test.ts` files are the same shape). ⇒ a
"render" test here is a **source-scan + a real-`t()` resolution**, ⛔ nothing more. ⭐ **Design for it:**
anything that must be *asserted* belongs in the presenter (Task 2) or in a **named constant** a scan can
see. ⛔ Adding a renderer is a new workspace dependency and is out of scope — **stop and raise it** instead.

**⭐ RN a11y grouping is EXPLICIT, and this story removes the implicit one.** `Pressable` is
`accessible={true}` by default, which is the only reason UX `:1820`'s *"title and meta read as a unit"*
holds today. D6(a) removes it. ⇒ wrap **title+meta only** in an explicit `accessible={true}` container
carrying the composed label, and keep the dismiss control **outside** it — a control nested inside an
accessible container is not individually focusable. ⛔ Zero in-repo precedent to copy (AC6 / Trap 5).

**Notice content is DATA, not catalog copy.** An operator's title and body are rendered as-is. ⛔ No
key is minted for notice text — only for chrome and a11y strings.

**Fail-soft is the house rule for ambient chrome.** A failed read renders an empty noticeboard, ⛔
never an error surface. ⚠ The silent-on-persistent-failure question is a recorded, deliberate
deferral (`deferred-work.md`, the item beginning *"`PollsEntry` ignores `usePollsQuery`'s
`isError`/`isLoading`"*) — ⛔ do not re-open it here.

**Fabric/FlatList.** If the pinned rows ever become a `FlatList`, ⛔ do not let it cross
empty→populated in place — render empty/loading/error **outside** the list
([[project_fabric_flatlist_empty_populated_crash]]). ⚠ Today the section is a `YStack` with at most
one row; ⛔ this story has no reason to change that.

### Project Structure Notes

```
packages/ui/src/noticeboard/
  view-model.ts                     UPDATE — ADD the row view-model types.
                                       ⛔ `NoticeboardRowDescriptor` ITSELF IS NOT MODIFIED (D5(a))
  pinned-notice.ts                  NEW — `derivePinnedNoticeViewModel`, pure, ⛔ no viewer/tier param
  i18n-keys.ts                      UPDATE — category LABEL keys + dismiss/dismissed a11y keys;
                                       ✅ the `open_detail_*` hint keys RETIRE (D6(a))
  index.ts                          UPDATE — barrel exports (⚠ `.js` ESM specifiers)
  presenter.ts                      ⛔ NOT TOUCHED — the strip's derivation is 11a.5's
packages/ui/src/index.ts            UPDATE — a Story-11a.6 line in the house register
packages/ui/tests/noticeboard/
  pinned-notice.test.ts             NEW — states · affordance predicate · label composition ·
                                       ⭐ the AC5 no-viewer-input shape proof
  presenter.test.ts                 ⛔ NOT AMENDED (D5(a)) — ⚠ if it needs to be, the descriptor is
                                       being widened. STOP AND RAISE IT (Trap 3)
packages/i18n/locales/hi/noticeboard.json   UPDATE — ⚠ catalogs live in `locales/`, ⛔ NOT in `src/`
packages/i18n/locales/en/noticeboard.json   UPDATE — ⛔ never one locale without the other
packages/i18n/src/catalog.ts        ⛔ NOT TOUCHED — the namespace is already registered
apps/mobile/components/panchayat/
  PinnedItem.tsx                    UPDATE — ⭐ THE STORY'S SUBJECT. Render from the row view-model;
                                       the dismiss affordance; the `dismissed` render; D6's semantics
  PanchayatNoticeboard.tsx          UPDATE — ⚠ ONLY the dismissal wiring (the key, the mutation call,
                                       the optimistic set, the rollback) and passing it to the row.
                                       ⛔ Section order, states, skeleton, masthead, hairlines and the
                                       `<PollsEntry>` position are 11a.5's and do not move
  tokens.ts                         UPDATE — ✅ `CATEGORY_HINT_KEYS` RETIRES (D6(a)). ⭐ `CATEGORY_TOKENS`
                                       and `RULE_HAIRLINE_TOKEN` STAY — colour is render-layer
  banner-notice.ts                  ⛔ NOT TOUCHED — ⚠ the empty-title label defect is closed in the
                                       PRESENTER (AC6), ⛔ not by tightening this adapter's guard
apps/mobile/tests/unit/
  panchayat-noticeboard-render.test.ts  UPDATE — ⚠ :334-340 amended into its INVERSE (Trap 3);
                                       :191-198 amended (D6(a)), ⛔ `black ≠ memorial` survives.
                                       ⛔ SOURCE-SCAN + real-`t()` ONLY — ⛔ this harness has NO renderer
microcopy.yaml                      ✅ UPDATE (D9(a), REQUIRED) — TWO globs in `scope.copy_globs` + a
                                       rationale comment. ⛔ NOTHING ELSE in the file moves —
                                       ⛔ no vocabulary term, ⛔ no tone rule, ⛔ no `allow:` entry
scripts/microcopy/noticeboard.test.ts  NEW (D9(a), REQUIRED) — the TEETH proof (real config + real locale
                                       files + planted violation in BOTH locales + revert-sanity)
scripts/microcopy/{check,lib}.ts    ⛔ NOT TOUCHED — the scope entry is DATA, not gate code
_bmad-output/planning-artifacts/
  ux-design-specification.md        ✅ UPDATE (D8(a), REQUIRED) — ⛔ the ALREADY-RULED `:491`→`:1819`
                                       supersession ONLY, as a standalone `docs:` commit
```

⛔ **Untouched:** `packages/contracts/src/banners/*` · `apps/api/src/modules/banners/*` ·
`apps/admin/*` · `apps/public/*` · `apps/mobile/components/banners/*` (⭐ **all four files** —
`BannerHost.tsx`, `copy.ts`, `route-suppression.ts`, `useMemberBannersQuery.ts`; D7(a)) ·
`apps/mobile/components/polls/PollsEntry.tsx` · `apps/mobile/tamagui.config.ts` ·
`apps/mobile/lib/format-count.ts` (⚠ **no call site by design** — `deferred-work.md` item (b) says
⛔ do not delete it as dead code) · `packages/contracts/public-pages/public-vs-private-matrix.yaml`
(⚠ **that is the real path** — ⛔ it is NOT under `planning-artifacts/`) · every migration.

⚠ ⛔ **No migration, ⛔ no schema change, ⛔ no API route, ⛔ no new package, ⛔ no new workspace
dependency.** If the design seems to need one, **stop and raise it**.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 11a.6`] — the three ACs this story expands
- [Source: `epics.md:406`, `:4493`, `:4690`] — ⭐ **UX-DR16, this AC's own `Given` anchor:** *"`<PinnedNotice>`. Noticeboard **ROW** primitive with left colored stub"* — the epic contradicting its own prose (**Trap 1** / **D1**)
- [Source: `ux-design-specification.md:1807`] — `<NoticeboardStrip>` *"Full-width **vertical** stack"* (⛔ no sticky variant)
- [Source: `ux-design-specification.md:1814-1821`] — ⭐ `<PinnedNotice>` purpose / anatomy / **states** / variants / **accessibility** / surfaces — the governing contract
- [Source: `ux-design-specification.md:1805-1813`] — `<NoticeboardStrip>` (⛔ Story 11a.5's)
- [Source: `ux-design-specification.md:2310-2321`] — ≥44pt touch target; ⭐ Pattern 2's *"When NOT to use"* a confirmation modal
- [Source: `ux-design-specification.md:2416-2420, 2601`] — Pattern 9: banners are persistent-until-dismissed; dismiss within thumb reach
- [Source: `ux-design-specification.md:680, 1222`] — `PinnedNotice` as a ratified **molecule**; ⚠ `ConsentMoment` is the *dual-acknowledgment* pattern and is ⛔ **NOT** what "dismiss-with-ack" means here
- [Source: `packages/ui/src/noticeboard/view-model.ts:133-175`] — ⭐ the row descriptor + its field-by-field reconciliation
- [Source: `packages/ui/tests/noticeboard/presenter.test.ts:238-333`] — ⚠ the three contract fences (Trap 3)
- [Source: `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:191-198, 334-340`] — ⚠ the two time-boundary fences this story amends
- [Source: `apps/mobile/components/banners/BannerHost.tsx:107-127, 142-199, 206-211`] — the dismiss affordance, optimistic set + rollback, the `shown` guard, the fifth suppression
- [Source: `apps/mobile/components/banners/copy.ts:41-49`] — `bannerDismissalKey`, and ⛔ why a bare id is wrong
- [Source: `apps/mobile/components/banners/useMemberBannersQuery.ts:32-48`] — the existing mutation + its `onSettled` invalidation
- [Source: `packages/domain/src/banners/read.ts:134-165`] — ⭐ the dismissal-suppression join; revision re-surfaces a dismissed banner
- [Source: `packages/contracts/src/banners/dto.ts`] — `DismissBannerRequest`/`Response`; ⛔ `revision` is server-resolved, never client-supplied
- [Source: `packages/domain/src/banners/errors.ts:79-95`] — ⚠ a NON-dismissible `banner` is legal; only a popup must be dismissible
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`] — §Story 11a.5 items (e), (g); §code review of story-11a.5 items 2, 4 and **5** (⚠ cited by TEXT, ⛔ never by line — the file moves). ⚠ ⛔ **THE TWO SECTIONS ARE AT OPPOSITE ENDS OF THE FILE:** *"Deferred / recorded from: Story 11a.5"* (items a–h) is at the **TOP** (~L7); *"Deferred from: code review of story-11a.5"* (the five CR items) is at the **BOTTOM** (~L6194 of ~6200). ⛔ Searching one end finds only half of what this story owes
- [Source: `.decision-log.md#2026-08-22-152`] — D1–D7 of Story 11a.5; head at authoring, ⛔ read live
- [Source: `friction-budget.md`] — ⭐ the default is zero friction; a row is added only with declared attribution
- [Source: `microcopy.yaml:296-356`] — ⭐ `scope.copy_globs` (⛔ `noticeboard` absent) and the 11a.2 entry's *"UNSCANNED COPY wearing a green check"* rule — **D9**
- [Source: `scripts/microcopy/{close-of-cycle,common,fursat,out-of-band}.test.ts`] — the teeth-proof shape a new scope entry owes

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
