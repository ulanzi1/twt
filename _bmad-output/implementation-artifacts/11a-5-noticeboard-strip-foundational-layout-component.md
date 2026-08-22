---
baseline_commit: 54492eb9d8a83c8107acaf21c673c96de96ec7ec
---

# Story 11a.5: `<NoticeboardStrip>` Foundational Layout Component `[PRIMITIVE]`

Status: review

> ✅ **BASELINE VERIFIED LIVE.** `git fetch origin` was run at authoring time
> ([[feedback_git_fetch_before_remote_reasoning]]): `HEAD == origin/main == 54492eb`, zero ahead /
> zero behind, working tree clean. **Every claim in this file was checked by reading the named file
> at that tree** — ⛔ none is inherited from a story record, an epic line, or a prior draft. Branch
> off `main`; re-`fetch` before you branch.

> ⭐⛔ **READ THIS FIRST — THE COMPONENT THIS STORY NAMES ALREADY EXISTS AND ALREADY RENDERS.**
> `apps/mobile/components/panchayat/` is a **working, tab-wired Panchayat Noticeboard** shipped by
> **Story 0.14** (P0-5 native-stack validation prototype, `done`) — five components, a live tab at
> `app/(tabs)/panchayat.tsx`, and **hardcoded fixtures** in `sample-data.ts`. Story 10.15 has
> already added one real-data section into it. ⛔ **This story does NOT author a noticeboard from
> nothing.** Anything that builds a second one is the "reinvent the wheel" disaster this workflow
> exists to prevent. Read **§What already exists** before writing a line.

> ✅ **ALL SEVEN DECISIONS RULED BY BIGDEV, 2026-08-22 — each AS RECOMMENDED.** ⛔ **Nothing in
> §Decisions is open.** ✅ **D1(a) · D2(a) · D3(a) · D4(a) · D5(a) · D6(a) · D7(a).** ⛔ The dev agent
> must **not** re-open or re-interpret a ruling ([[feedback_supersede_never_reinterpret]]). If one
> looks wrong once the code is in front of you, **stop and raise it** — ⛔ never silently deviate.
> ⚠ Durability is **Task 0's `governance:` commit**, ⛔ not this file.
>
> ⭐ **THREE RULINGS CHANGE THE FILE AROUND THEM — ⛔ do not read the pre-ruling text as still true:**
> **D7(a)** takes `BannerHost.tsx` **OFF** the untouched list (⚠ Trap 3 amended in place; it is now
> the one 10.9 file this story edits) · **D2(a)** supersedes `ux-design-specification.md:491`, so
> ⛔ `saffron` is **dead** and the vocabulary is `terracotta|green|black|ink` · **D3(a) + D5(a)**
> make **AC4/Task 4** and **AC5/Task 5** ⭐ **UNCONDITIONAL** — ⛔ the `[GATED ON …]` markers are gone
> because the gates are open, ⛔ not because the work is optional.

> **Depends on (all `done` + merged):** **0.14** (the prototype noticeboard + its five components +
> `sample-data.ts` + the live `panchayat` tab) · **1.17** (`@twt/tokens` — the colour/type/space role
> authority ⚠ **for non-RN surfaces**; ⛔ `apps/mobile` does not depend on it — **D6**) · **10.9** (the banner substrate: `@twt/contracts/banners`, `resolveVisibleBanners`,
> `deriveBannerDisplayState`, `BannerHost.tsx`, the member read route) · **10.15** (`PollsEntry` —
> the precedent for adding a real-data section to the prototype **without restructuring it**) ·
> **11a.1** (the populated `public-vs-private-matrix.yaml` + its bidirectional route-coverage gate
> leg) · **9.6 / 9.12 / 4.7 / 10.16** (the four `@twt/ui` headless-presenter precedents).

---

## Story

As any public or authenticated surface needing to display a strip of important notices,
I want `<NoticeboardStrip>` promoted from a **fixture-backed P0-5 prototype** into a **real design-system
primitive** — a headless `@twt/ui` presenter that owns the noticeboard's composition, ordering and
tier rules, with the mobile render wired to it,
so that the one noticeboard this project already ships stops being a validation artifact rendering
invented Hindi, and every future surface that needs a notice strip reads its rules from one place
instead of copying a screen.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ONE predicate that gates what a member SEES, and ⛔ none that gates what a
member GETS.** The predicate is the notice **tier filter** — the epic's *"respects tier visibility
(some notices public, others authenticated only)"*.

**In the member's terms:** *"a signed-out visitor sees only the notices the Pariwar has marked public;
signing in does not unlock any benefit, only the rest of the noticeboard."*

**Checked against the Niyamavali: no clause governs it, and that is the correct result — ⛔ not a
gap.** The Niyamavali governs **eligibility, coverage, contribution and restoration**. A notice is
**announcement copy**; not seeing one changes ⛔ no member's validity, ⛔ no assignability, ⛔ no
coverage, and ⛔ no claim outcome. ⛔ No `is_valid`, `is_assignable`, roster, eligibility or coverage
predicate is read or written by this story.

⚠ **The one thing that would change this answer, and the reason D4 exists:** if a notice ever becomes
the *only* channel carrying a **deadline a member's coverage turns on** (a contribution window, a
restoration expiry), then a tier filter hiding it would acquire real member consequence. ⛔ That is
**not** true today — those deadlines ride the Story 8.8 notification family, ⛔ not the noticeboard.
**D4 keeps it that way by construction.**

---

## 🎯 What already exists — verified at `54492eb`, not inherited

Every row checked by reading the named file.

| Claim | Verified state |
|---|---|
| A Panchayat Noticeboard renders **today** | ⭐ ✅ **YES.** `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx` (161 lines) — top strip w/ seal + `परिवार की नब्ज़`, `<StatLine>`, hairline, `सूचना पट्ट` pinned section, `<PollsEntry>`, `हाल की आहुति` recent-closings, footer next-meeting, `<P3DiagnosticPanel>`. Wired live at `app/(tabs)/panchayat.tsx` — **tab 3 of 3**. |
| Its data is real | ⛔ **NO — every row is a hardcoded fixture.** `sample-data.ts` exports `SAMPLE_STATS` (51,204 members / 38 districts / 7 closings), `SAMPLE_PINNED` (3 invented Hindi notices), `SAMPLE_RECENT_CLOSINGS` (5 **invented deceased-member names**), `SAMPLE_NEXT_MEETING`. ⚠ **The invented memorial names are the sharpest edge here** — read **Trap 4**. |
| Its origin | **Story 0.14** (P0-5 native-stack validation prototype, `done`). `git log` → `eac9913 feat: Story 0.14 Task 9 Day 5 — Panchayat Noticeboard pattern (third + final UX-spec §6 pattern complete)`. Built to **measure Devanagari rendering on real devices**, ⛔ not to ship data. |
| The prototype declares its own retirement | ✅ **In writing, twice.** `PanchayatNoticeboard.tsx:120-121` — *"P3 diagnostic panel … **Prototype-only; production removes this**"*; `:45` — *"Pariwar seal stub — **production uses Stamp atom** per UX spec line 679"*. ⇒ promotion is the prototype's own stated plan. |
| A real-data section was already added to it | ⭐ ✅ **YES — `<PollsEntry>` (Story 10.15).** Its header is the governing precedent: *"the entry is an **ADDITION** to that noticeboard, **never a restructuring** of it"* and *"⚠ RENDERS NOTHING when there is nothing to answer"*. ⛔ Follow this shape. |
| `packages/ui` is a React component library | ⛔ **NO — it is HEADLESS.** Zero `.tsx` files. Four modules, each exactly `presenter.ts` + `view-model.ts` + `i18n-keys.ts` + `index.ts` (+ optional `spec.ts` / `constants.ts`). Every barrel says *"Pure logic only (**no react/react-native**)"*. Its only dependency is `@twt/contracts`. ⇒ **"authored as an extension of `packages/ui`" means a PRESENTER, ⛔ not a component.** Read **Trap 1**. |
| The four presenter precedents | `member-status` (4.7) · `status-pill` (9.6, + `spec.ts`) · `pool-progress` (9.12, + `constants.ts`) · `contribution-disclosure` (10.16). ⭐ **Mirror `pool-progress` — it is the newest and the closest in shape.** |
| `@twt/ui` already has **two** consumers, in **two** frameworks | ✅ **YES — `apps/admin` (React) and `apps/mobile` (RN).** `apps/admin/package.json:24` + `MemberStatusPanel.tsx:11` (`buildMemberStatusViewModel`); `apps/mobile/package.json:35` + `pay.tsx:40`, `(membership)/index.tsx:13`, `ActiveContributionCard.tsx:30`, `StatusPill.tsx:6`. ⭐ **This is the real proof the headless shape earns its keep** — two render stacks, one rule set. |
| ⚠ Astro (`apps/public`) can consume a `@twt/ui` presenter **today** | ⛔ **NO — AND THIS IS A DOCUMENTED VARIANCE, NOT AN OVERSIGHT.** `apps/public/package.json` depends on `@twt/contracts`, `@twt/domain`, `@twt/i18n`, `@twt/tokens` — ⛔ **not `@twt/ui`**. The only mention on the surface is a CSS comment, `members.astro:315`: *"@twt/ui is still a stub and there is NO Tailwind pipeline on this surface — ⛔ do not introduce one"*, and `apps/public/COMPOSITION-CONTRACT.md:156-158` records it under **§Documented variances** (*"the epic AC names `@twt/ui`, which is still an empty stub"*). ⇒ ⛔ **Do not write that Astro already consumes a presenter.** Adding the dependency is a **Story-2.5-variance decision**, ⛔ not a side effect of this story — see **D5**. |
| Story 10.9 banner data exists and is rich | ✅ `packages/contracts/src/banners/` — `enums.ts`, `dto.ts`, `display-state.ts` (`deriveBannerDisplayState`, `isBannerInWindow`), `precedence.ts` (`compareBannerPrecedence`, `resolveVisibleBanners`, `BANNER_SEVERITY_ORDER`). Pure, DB-free, `now` **injected**. |
| 10.9 returns a **list** of banners | ⛔ **NO — AT MOST ONE PER LANE.** `MemberBannerListResponse = { banner: MemberBannerResponse \| null, popup: … \| null }`. FR-58B *"one at a time per surface"*, Decision 3, defended in **three** file headers and pinned by a **shuffled-input determinism test**. ⭐ **This is the story's central collision.** Read **Trap 2**. |
| A banner "strip" already renders | ⚠ ✅ **YES, and it is a DIFFERENT strip.** `apps/mobile/components/banners/BannerHost.tsx` renders `testID="banner-strip"` — full-width, top of surface, at the **authenticated layout level** (`app/(tabs)/_layout.tsx`), ambient chrome, self-suppressing. ⛔ **Not** the Panchayat noticeboard. Two things named "strip". Read **Trap 3**. |
| `<PinnedNotice>` is this story's to build | ⛔ **NO — it is Story 11a.6's**, and its prototype (`PinnedItem.tsx`) already exists. ⛔ Do not absorb, rewrite or re-home it here. Read **Trap 5**. |
| The pinned-category vocabulary is settled | ⛔ **NO — and ⭐ THE UX SPEC CONTRADICTS ITSELF.** `saffron\|green\|black` is ⛔ **not** merely the prototype's invention: it is **ratified spec text** at `ux-design-specification.md:491` (*"each row has a small left-stub colored by type (saffron/green/black per category)"*) — the §5/§8 Panchayat grammar the prototype was built from. `ux-design-specification.md:1819` (§11 `<PinnedNotice>` Variants) says `terracotta\|green\|black\|ink` **with different meanings**. 10.9 adds a third axis, `info\|warning\|critical`. ⇒ ⛔ this is an **internal contradiction inside one ratified artifact**, ⛔ not a prototype-vs-spec drift. **D2** rules it — read D2's own note on what ruling it *costs*. |
| The prototype uses design tokens | ⛔ **NO — raw hex literals.** `PinnedItem.tsx:16-20` `STUB_COLOR = {saffron:'#FF7F1F', green:'#1F7F4F', black:'#1A1A1A'}`; `PanchayatNoticeboard.tsx:148` `Hairline` uses `bg="#000000"`. ⚠ Both violate **FM-14 #2** (*"colours come from a token authority, never a magic literal"*) — the rule `BannerHost.tsx:53` cites by name. |
| ⭐⛔ `apps/mobile` can resolve a `@twt/tokens` role | ⛔ **NO. THE MOBILE APP DOES NOT DEPEND ON `@twt/tokens` AT ALL.** `apps/mobile/package.json:32-35` = `@twt/api-client`, `@twt/contracts`, `@twt/i18n`, `@twt/ui` — ⛔ **no `@twt/tokens`**. `apps/mobile/tamagui.config.ts` spreads `@tamagui/config/v5` and overrides **fonts ONLY** — ⛔ the colour palette is **stock Tamagui**, with ⛔ **no bridge from `@twt/tokens`**. ⇒ ⛔ `stamp-mudra` / `rule-hairline` **do not exist in the mobile theme**. **D6** rules it. |
| Who *does* resolve `@twt/tokens` colour roles | `apps/public` (CSS vars — `--color-rule-hairline` in `PublicShell.astro:109`, `niyamavali/terms/members.astro`) and `apps/api` (the **PDF note-template** — `note-template.ts:218,241` `color['rule-hairline']`, `color['stamp-mudra']`; `contribution-note.ts:78`). ⭐ **Both are non-RN surfaces.** `StatusPill.tsx:43-44` says so in terms: `@twt/tokens` is *"the canonical hex authority **the PDF note-template** resolves directly"*. |
| ⭐ The **actual** RN token precedent | **A local semantic→Tamagui-scale map.** `StatusPill.tsx:46-52` `TONE_TOKENS = {pending:{bg:'$yellow4',…}, …} as const satisfies Record<StatusPillTone,…>`; `BannerHost.tsx:57-61` `SEVERITY_TOKENS = {info:{bg:'$blue3',…}, …}`, whose header calls itself *"the mobile-palette bridge … the ONLY place severity → Tamagui theme token lives (the `StatusPill` `TONE_TOKENS` precedent; **FM-14 #2**)"*. ⇒ ⭐ **on RN, "a token authority" means the Tamagui theme, reached through ONE named map** — ⛔ not a `@twt/tokens` import and ⛔ not a hex. |
| The prototype uses i18n | ⛔ **NO — hardcoded Hindi string literals** throughout (`परिवार की नब्ज़`, `सूचना पट्ट`, `हाल की आहुति`, `अगली मासिक बैठक`, every fixture title). ⚠ `KNOWN_NAMESPACES` (`packages/i18n/src/catalog.ts:65`) has **no `noticeboard` entry**, and `t()` **THROWS** on an unregistered namespace ([[project_missed_cycle_visibility_substrate]]). |
| A public website home exists to host the "public embed" variant | ⛔ **NO.** `apps/public/src/pages/index.astro` is a **302 redirect** to `/niyamavali` with no body. The UX spec's `<NoticeboardStrip>` *"public website embed"* variant has **no host surface**. **D5** rules it. |
| A noticeboard surface is in the visibility matrix | ⛔ **NO.** `public-vs-private-matrix.yaml` declares **eight** surfaces (`root-redirect`, `niyamavali`, `terms`, `blog`, `blog-post`, `not-found`, `server-error`, `member-directory`). ⚠ The gate's **bidirectional route-coverage leg** fails CI when a route ships undeclared — so **D5(a) keeps this story out of that leg entirely**. |
| A real producer exists for stats / recent-closings | ⛔ **NO read model for either.** ⚠ Recent-closings would need close-of-cycle (FR-19) pool data; the stat line needs member+district counts. ⛔ Neither is built, and ⛔ **no story in Epic 11a owns them**. **D3** scopes around this. |
| `.decision-log.md` head | `2026-08-22-151` (Story 11a.4 code review). ⛔ Do not hardcode the next number — read the head at implementation time. |
| Row 17 / launch gate | `open`. ⛔ Untouched by this story — the noticeboard is a **member-app** surface; ⛔ do not write that this advances the directory gate. |

---

## ⛔ THE SEVEN TRAPS — read these before anything else

> ⚠ Numbering note: they run **1 · 2 · 3 · 3b · 4 · 5 · 6**. ⭐ **Trap 3b is not a footnote to Trap 3 — it is the one Trap 3 does not answer.**

### Trap 1 — ⛔ `packages/ui` HAS NO REACT IN IT. A `.tsx` file here breaks the package's whole reason to exist.

Every instinct says *"author `<NoticeboardStrip>` in the design-system package"* → create
`packages/ui/src/noticeboard/NoticeboardStrip.tsx`. ⛔ **That is wrong and it will not even build
correctly as a shared artifact.** `@twt/ui`'s `package.json` dependency list is exactly
`{"@twt/contracts": "workspace:*"}` — ⛔ **no `react`, no `react-native`, no `tamagui`.**

The package's contract, stated in all four barrels: **pure `(input) → view-model` functions + types +
i18n KEY constants + `@twt/tokens` role NAMES.** ⛔ No copy, ⛔ no palette hex, ⛔ no numeral
formatting, ⛔ no JSX. The render layer resolves keys and roles at the display boundary.

⭐ **The reason it is headless is already proven in-repo, and it is this story's own reason:**
`@twt/ui` presenters are consumed **today** by **two different render stacks** — `apps/admin`
(**React DOM**, `MemberStatusPanel.tsx:11`) and `apps/mobile` (**React Native / Tamagui**,
`StatusPill.tsx:6`, `ActiveContributionCard.tsx:30`, `pay.tsx:40`). A `.tsx` in `@twt/ui` would serve
exactly one of them and re-open the drift this package exists to close.

⚠ ⛔ **Do NOT justify this with Astro.** `apps/public` does **not** depend on `@twt/ui` and its
`COMPOSITION-CONTRACT.md:156-158` deliberately says so. The headless case stands on
admin-React + mobile-RN — it ⛔ does not need, and must not claim, a third consumer that does not
exist. A **future** Astro consumer is D5's business, ⛔ not a fact.

⚠ **What actually enforces this** (⛔ know it, so you do not assume a gate that is not there): there
is ⛔ **no CI gate** banning `react` / `.tsx` inside `packages/ui`. `packages/ui/eslint.config.js` is
the bare shared config. The rule holds **only** because `react` is absent from the package's
dependencies, so a bare `import ... from 'react'` fails `typecheck` on missing types. ⭐ That is thin
but sufficient, and ⛔ this story does **not** add a gate for it ([[feedback_no_premature_package]] —
one story's need is not a gate's trigger). ⇒ ⛔ **the discipline is on you, not on CI.**

### Trap 2 — ⭐⛔ "CONSUMES STORY 10.9 BANNER DATA" CANNOT MEAN "MAKE THE BANNER READ RETURN A LIST."

The epic's AC2 says the component *"consumes Story 10.9 banner/popup data"*. ⚠ **A strip renders a
LIST; 10.9 returns AT MOST ONE.** The obvious way to reconcile them — widen the member read to
return an array — is ⛔ **the single most damaging thing this story could do**, and it would look
reasonable while doing it.

**What it would break, all verified:**

| Guard | Where |
|---|---|
| FR-58B *"one at a time per surface"* | the PRD commitment the whole model implements |
| Load-Bearing **Decision 3** — two INDEPENDENT LANES, each yielding at most one | `precedence.ts:27-30` |
| The **total** comparator (severity → `valid_from` DESC → `banner_id` ASC) | `precedence.ts:32-37` |
| *"Leaving the choice to `ORDER BY` … non-replayable"* | `precedence.ts:39-42` |
| The **shuffled-input determinism CI test** | `precedence.ts:42` — *"the shuffled-input CI test is the teeth"* |
| **AC5's single-implementation rule** — one resolver, two consumers (`apps/api` + `apps/admin`) | `precedence.ts:17-24`, `display-state.ts:4-9` |
| `MemberBannerListResponse`'s own doc: *"at most one banner AND at most one popup, ALREADY RESOLVED server-side"* | `dto.ts` |

⭐ **The correct reading, and D1 rules it:** the banner lane contributes **at most one row** to the
noticeboard — one notice among several **sources**, ⛔ not the notice list itself. The presenter
merges **sources**; ⛔ it never re-resolves within a source, and ⛔ never asks a source to widen.

⛔ **Do not touch** `precedence.ts`, `display-state.ts`, `dto.ts`, `member-handlers.ts`, or
`member-routes.ts`. If the design seems to require it, **stop and raise it**.

### Trap 3 — ⚠ TWO DIFFERENT THINGS ARE CALLED A "STRIP". Merging them silently breaks ambient chrome.

| | `BannerHost` strip (10.9) | `<NoticeboardStrip>` (this story) |
|---|---|---|
| Is | **ambient chrome** — one time-bounded banner | a **home-screen layout** — stats + notices + closings + footer |
| Mounts | `app/(tabs)/_layout.tsx` — above **every** authenticated screen | inside **one** screen, the `panchayat` tab |
| Holds | exactly one banner (+ an independent popup overlay) | many rows, several sections, several sources |
| Fails by | rendering `null` (self-suppression: no session / loading / **error** / nothing visible — ⭐ **D7(a) adds a FIFTH: the panchayat route**) | ⭐ **D3(a) ruled it**: no producer ⇒ render nothing |
| testID | `banner-strip` | ⛔ must **not** reuse that id |

⚠ **AMENDED BY D7(a) — ⛔ read this version, ⛔ not the pre-ruling one.** `BannerHost` is ⛔ **not
refactored, not moved, not absorbed, and not deleted** — ⭐ but it **is** edited, in exactly one way:
**a fifth self-suppression condition** (the panchayat route). ⇒ ⛔ it is **no longer on the untouched
list**. Everything else about it is frozen: ⛔ not `SEVERITY_TOKENS`, ⛔ not the dismiss path, ⛔ not
the query, ⛔ not the `banner-strip` testID, ⛔ not its mount point.

⭐ **What stays true:** the two components remain **different things** and are ⛔ never merged. On
every tab **except** panchayat a member sees the `BannerHost` strip **and** whatever that screen
holds — ⛔ that is not a bug. ⚠ What D7(a) fixes is narrower and real: the **same banner** appearing
**twice on one screen** (Trap 3b).

### Trap 3b — ⭐⛔ THE SAME BANNER WILL RENDER **TWICE** ON THE PANCHAYAT TAB. This is a different question, and it IS a bug.

⚠ **The paragraph above answers "two components visible at once" — ⛔ it does NOT answer "one row
duplicated".** Verified:

- `BannerHost` mounts at **`app/(tabs)/_layout.tsx:21`** — above **every** authenticated tab, ⭐ the
  panchayat tab included.
- It renders the **single winning `banner`** from `useMemberBannersQuery`
  (`MEMBER_BANNERS_QUERY_KEY = ['member','banners']`), server-resolved.
- ⛔ **Under D1(a) the noticeboard presenter consumes that SAME lane winner.**

⇒ on the panchayat tab a member sees **one banner, twice, on one screen** — once as ambient chrome at
the top, once as a noticeboard row. ⛔ Neither instance is wrong on its own; the pair is.

✅⭐ **RULED — D7(a).** **ONE query (`useMemberBannersQuery`, `MEMBER_BANNERS_QUERY_KEY`), and
`BannerHost` self-suppresses on the panchayat route.** ⇒ one fetch, one cache, one MMKV entry, one
server-resolved winner, ⛔ no second request and ⛔ no divergence — and the suppression lives in the
component that **already owns suppression**, ⛔ not scattered into the presenter (which by Trap 1
cannot know what another component renders).

⚠ **The cost, stated so it is not rediscovered as a surprise:** `BannerHost` gains **route
awareness**, and it leaves the untouched list (Trap 3, amended). ⭐ **That is the whole edit** — one
condition. ⛔ If satisfying it seems to require anything more, **stop and raise it**.

### Trap 4 — ⭐⛔ THE PROTOTYPE PUBLISHES FIVE INVENTED DECEASED-MEMBER NAMES. Do not carry them forward, and do not "make them real" either.

`sample-data.ts:76-81` — `SAMPLE_RECENT_CLOSINGS` names *दीनानाथ झा · शिवकुमारी देवी · विद्यानंद यादव ·
सुषमा कुमारी · महेश्वर पासवान*, each with a district and a contributor count, rendered under the
heading `हाल की आहुति` on a **live tab**.

⚠ **Two distinct hazards, and they pull in opposite directions:**

1. ⛔ **Leaving them** ships fabricated bereavement records on a real member surface — the exact
   *"never reconstruct to fake validation"* failure ([[feedback_record_unattested_no_backfill]]),
   on the most sensitive content type this product has.
2. ⛔ **Wiring them to real data** is ⛔ **not this story's scope and not currently possible** — there
   is **no close-of-cycle read model** and **no story owns one** (see the table). Building one here
   would be scope invention on memorial data, gated by Epic 11b's consent model
   ([[project_consent_subject_key_convention]]).

⭐ **D3 exists precisely to rule between them.** ⛔ The dev agent must not choose. The recommendation
is the third path: the section renders from a **real, empty source** and **renders nothing when
empty** — the `PollsEntry` posture — so the surface is honest without inventing a producer.

### Trap 5 — ⛔ `<PinnedNotice>` IS STORY 11a.6. This story stops at the row boundary.

`PinnedItem.tsx` is the prototype of **11a.6's** component (epic §Story 11a.6, UX-DR16, UX spec
§1814). ⛔ Do not promote it, re-home it into `@twt/ui`, rename it, or change its stub-colour
mapping — **even though D2 rules the vocabulary those stubs will use.**

⭐ **The split, stated once:** **11a.5 owns the STRIP** — which sections exist, their order, which
sources feed them, the tier filter, empty/loading behaviour. **11a.6 owns the ROW** — the stub, the
title, the meta line, dismiss-with-ack. ⇒ this story's presenter emits a **list of row descriptors**;
⛔ it does not render a row and does not decide how a row looks.

⚠ **CORRECTED BY THE RULINGS — ⛔ the pre-ruling wording here said "11a.5 changes no stub colour",
and that is ⛔ NO LONGER TRUE.** D2(a) and D6(a) together **do** reach `PinnedItem.tsx`, in a
deliberately bounded way:

| `PinnedItem.tsx` | Verdict |
|---|---|
| the `STUB_COLOR` **key set** (`saffron` → `terracotta`/`ink`) | ✅ **CHANGES** — D2(a); ⛔ `saffron` deleted |
| the `STUB_COLOR` **mechanism** (raw hex → one named `satisfies` map) | ✅ **CHANGES** — D6(a); FM-14 #2 |
| the `:36` `accessibilityHint` (`black`→*"memorial"*) | ✅ **CHANGES** — ⛔ it is now **wrong**: `black` = scheduled meeting |
| stub **width**, layout, press behaviour, `numberOfLines`, the meta line, dismiss-with-ack | ⛔ **11a.6's — untouched** |

⭐ **The split still holds, and this is why it is not a scope leak:** 11a.5 owns *which categories
exist and what they mean* (it is the presenter that emits them); **11a.6 owns how a row LOOKS and
BEHAVES**. ⇒ this story changes the stub's **vocabulary and colour mechanism** because those are
downstream of the category contract — ⛔ and nothing else in the row.

### Trap 6 — ⚠ `sample-data.ts` IS A MIXED MODULE. Deleting the file breaks the build in four places.

⛔ It is **not** just fixtures. Verified importers:

| What it exports | Who imports it |
|---|---|
| **Types** `StatLine`, `PinnedItem`, `PinnedItemCategory`, `RecentClosing`, `NextMeeting` | `StatLine.tsx:3` · `PinnedItem.tsx:3` · `RecentClosingRow.tsx:3` · `PanchayatNoticeboard.tsx:13` |
| ⭐ **`formatCount()`** (`:92`) — `toLocaleString('en-IN')`, the **Latin-numeral + Indian-grouping** helper | `StatLine.tsx:4,37,56` · `RecentClosingRow.tsx:4,27,43` |
| The `SAMPLE_*` fixtures | `PanchayatNoticeboard.tsx:13` only |

**The disposition, per part:**

- **Types** → their successors belong in the presenter's `view-model.ts`. Components import the
  **view-model** types; ⛔ the local duplicates go.
- ⭐ **`formatCount` STAYS IN THE RENDER LAYER** — ⛔ it must **not** move into `@twt/ui`. The presenter
  emits **raw numbers**; formatting happens at the display boundary (AC1; the `pool-progress`
  *"NO numeral formatting … the render layer applies `formatInr`"* rule). Relocate it to a mobile
  render util if the file goes; ⛔ do not delete the behaviour — it **is** the Latin-numeral
  discipline (UX spec §1161).
- **Fixtures** → deleted per D3.

⚠ ⛔ **`apps/mobile/components/{yogdaan-bahi,shradhanjali}/sample-data.ts` are DIFFERENT files** for the
other two P0-5 patterns, with their own importers and their own `formatInr`. ⛔ **Out of scope — do
not touch them.** ✅ `P3DiagnosticPanel` is imported **only** by `PanchayatNoticeboard.tsx:6,122`, so
it and its file are safe to delete together.

---

## Acceptance Criteria

> ✅ Numbering note: **ALL SIX ACs ARE UNCONDITIONAL.** D3(a) and D5(a) opened the gates that used to
> hold AC4 and AC5 — ⚠ ⛔ **"no longer gated" means REQUIRED, ⛔ not optional.** ⚠ **AC6 carries the
> epic's own field list** — ⛔ it is the one AC whose absence would let this story pass while leaving
> 11a.6 nothing to build against.

### AC1 — the headless presenter exists in `@twt/ui` and is the only place the noticeboard's composition rules live

**Given** the four `@twt/ui` presenter precedents and UX-DR15 + UX spec §1805
**When** `packages/ui/src/noticeboard/` is authored
**Then** it follows the `pool-progress` shape **exactly**: `presenter.ts` + `view-model.ts` +
`i18n-keys.ts` + `index.ts`, exported from `packages/ui/src/index.ts` with a Story-11a.5 header
comment in the house register
**And** it contains ⛔ **no** `react` / `react-native` / `tamagui` import, ⛔ no JSX, ⛔ no colour
hex, ⛔ no resolved copy, ⛔ no numeral formatting — only structured values, `@twt/tokens` role
**names**, and i18n **keys**
**And** `deriveNoticeboardViewModel(input, now)` is **pure** with `now` **INJECTED** — ⛔ never
`new Date()` inside the module (the `display-state.ts:38` + `precedence.ts:44` convention, so every
boundary is unit-testable and replay-deterministic)
**And** the view-model declares the strip's sections **in render order** with an explicit
per-section empty state, so section order is a property of the presenter and ⛔ never of a screen's
JSX ordering
**And** ⭐ the view-model carries **all four states the UX spec ratifies at `ux-design-specification.md:1808`** —
`default` · `loading` · `empty` · `refreshing` — ⛔ not the one this story would otherwise notice.
⚠ **`loading` is a REAL state with ratified anatomy**: *"top + first 2 notices skeleton"* — ⛔ not a
blank screen and ⛔ not a spinner. `refreshing` is distinct from `loading` (content is on screen and
stays there). ⛔ Collapsing the four into `hasContent: boolean` is the failure this clause exists to
prevent
**And** ⚠ **the `empty` state is DELIBERATELY split, and the split is stated in the view-model:**
⭐ the spec's *"empty (rare; **"No pinned notices"**)"* is the **pinned** section's contract — an
explicit i18n **key**, ⛔ not silence — whereas a section with ⛔ **no producer at all** renders
nothing (AC4). ⛔ **These are different cases and must not be merged**: *"the Pariwar has pinned
nothing this month"* is information; *"this project has not built the read model"* is not something
to tell a member. ⚠ If D3 rules a section into the second case, ⛔ it does not inherit the first
case's copy.

### AC2 — the banner lane contributes AT MOST ONE notice, and the 10.9 contract is untouched

**Given** Trap 2 and the 10.9 single-winner invariant
**When** the presenter accepts banner input
**Then** its input type accepts **at most one** banner-sourced notice — ⛔ structurally, exactly the
`pool-progress` "confirmed-only **by SHAPE**" discipline: there is **DELIBERATELY no array-of-banners
field**, so a list cannot enter even by mistake
**And** the presenter **re-derives no precedence**: it consumes the server's already-resolved winner
and ⛔ never calls, re-implements or re-orders `compareBannerPrecedence` / `resolveVisibleBanners`
**And** ⛔ **zero lines change** in `precedence.ts`, `display-state.ts`, `dto.ts`, `enums.ts`,
`apps/api/src/modules/banners/member-handlers.ts`, `member-routes.ts`, or `BannerHost.tsx`
**And** an **anti-widening unit test** (the `pool-progress` Task-3b precedent) asserts the input type
admits no banner list — the regression net that makes Trap 2 mechanically hard to walk into.

### AC3 — the mobile noticeboard renders from the presenter, on the D6 token authority, through i18n

**Given** the prototype at `apps/mobile/components/panchayat/`
**When** the render is rewired
**Then** `PanchayatNoticeboard.tsx` derives its structure from `deriveNoticeboardViewModel` and ⛔ no
longer imports `SAMPLE_*` fixtures for any section this story wires
**And** ✅ **per D6(a)** the raw hexes at `PinnedItem.tsx:16-20` and `PanchayatNoticeboard.tsx:148`
are replaced by **ONE named semantic→Tamagui-scale map** — the `StatusPill.tsx:46-52` `TONE_TOKENS` /
`BannerHost.tsx:57-61` `SEVERITY_TOKENS` shape, `as const satisfies Record<NoticeCategory, …>` so the
mapping is **exhaustive by type** and a new category **cannot** compile without a colour. ⛔ **NOT**
by adding `@twt/tokens` to `apps/mobile` (⛔ D6(b), refused) and ⛔ **NOT** by touching
`tamagui.config.ts` (⛔ D6(c) — ⚠ routed to Task 6, blast radius is every mobile surface). ⛔ **NOT**
by pasting a token hex — ⛔ that is the same FM-14 #2 violation with a comment on it
**And** ✅ **per D2(a)** the `PinnedItem` stub map consumes `terracotta` / `green` / `black` / `ink` —
⛔ **`saffron` is GONE**, ⛔ not aliased and ⛔ not kept for the old fixtures (which D3(a) deletes
anyway). ⚠ ⛔ **`black` now means SCHEDULED MEETING, not bereavement** — so `PinnedItem.tsx:36`'s
`accessibilityHint` (which maps `black`→*"memorial"*, `saffron`→*"governance"*) is **wrong** and must
be corrected, ⛔ not merely re-keyed. ⚠ That single a11y line is the **only** other `PinnedItem`
change permitted — ⛔ no further 11a.6 surface area is touched (Trap 5)
**And** ✅ **per D7(a)** the noticeboard takes its banner input from the **existing**
`useMemberBannersQuery` (`MEMBER_BANNERS_QUERY_KEY`) — ⛔ no second query and ⛔ no second fetch — and
`BannerHost` gains **exactly one** new self-suppression condition (the panchayat route) so the same
banner ⛔ never renders twice on one screen (Trap 3b)
**And** all chrome copy (section headers, labels, **the pinned section's ratified `"No pinned
notices"` empty copy**) resolves through `@twt/i18n` with **hi-primary + en parity**, in a namespace
**registered in `KNOWN_NAMESPACES`** — ⛔ an unregistered namespace makes `t()` **throw** at runtime,
on a live tab. ⭐ **The gate that catches this already exists**:
`packages/i18n/tests/catalog-registration.test.ts`, written *because* `/members` threw on **every
request** on `main` while the `locales/`-walking parity gate stayed **green**. ⚠ Registration and
parity are **two different gates** — ⛔ passing `i18n:check-parity` proves nothing about `t()`
**And** ⛔ **notice CONTENT is not catalog copy.** Operator-authored titles/bodies arrive as **data**
and are rendered as-is; ⛔ only chrome is translated. ⛔ Do not mint keys for notice text
**And** all numerals render **Latin** — operational **and** celebration framing (UX spec §1161 v4
amendment; ⛔ Hindi numerals are reserved exclusively for memorial Devanagari prose on Shradhanjali)
**And** the existing a11y posture is preserved or improved: `accessibilityRole="header"` on section
headers, reading order matching visual order, pinned notices announceable as a list (UX spec §1809)
**And** `<PollsEntry>`'s position and its render-nothing-when-empty behaviour are **unchanged**
(Story 10.15), and `<P3DiagnosticPanel>` is removed per its own *"production removes this"*.

### AC4 — ✅ `[D3(a) RULED]` sections with no producer are honest, not fabricated

**Given** Trap 4 and the absence of any close-of-cycle or aggregate-stat read model
**When** a section has no real producer
**Then** ⛔ **no invented deceased-member name, count or district survives on the live tab** — the
`SAMPLE_RECENT_CLOSINGS` fixtures are **deleted**, ⛔ not relocated and ⛔ not commented out
**And** the section takes its **real (currently empty) source** and **renders nothing when empty** —
the `PollsEntry` posture (*"a quiet noticeboard stays quiet"*), ⛔ never a fabricated row and ⛔
never a "coming soon" placeholder
**And** ⛔ **no close-of-cycle or aggregate-stat read model is built by this story** — the absent
producers are **routed** (Task 6), ⛔ not invented.

### AC5 — ✅ `[D5(a) RULED]` the tier filter is a presenter rule, and no public route ships

**Given** the epic's *"some notices public, others authenticated only"* + the §Policy-meaning note
**When** the presenter applies the tier filter
**Then** the filter is a **pure predicate in the presenter** over each notice's declared audience —
reusing 10.9's **existing** `audience_scope` vocabulary (`public` / `members-all` / `state`, with
`role` / `cohort` the documented un-targetable seam) — ⛔ **never a new parallel visibility taxonomy**
**And** the predicate **fails CLOSED**: an unknown or unresolvable audience renders **nothing**,
⛔ never "visible to all" (the `enums.ts` *"a member with no posting row is in NO state audience —
fail-closed, never 'in all'"* rule)
**And** ⛔ **no new route ships in `apps/public`**, so ⛔ **no `public-vs-private-matrix.yaml` entry
is added or needed** — the matrix's bidirectional route-coverage leg is satisfied by the absence of a
route, ⛔ not by a declaration
**And** the story file records in one line that a **future** public noticeboard render **will** owe a
matrix surface entry — so the next reader is not left to rediscover the gate.

### AC6 — the ROW DESCRIPTOR is a declared contract, because 11a.6 is built against it

⭐ **This AC exists because the epic names fields no other AC mentions, and because 11a.6 has nothing
to render without them.** Trap 5 gives the ROW to 11a.6 — ⛔ but "11a.6 owns the row" is only safe if
11a.5 says **what it hands over**.

**Given** the epic's 11a.5 AC (*"notice items with: **title, body, severity (info / warning /
critical), dismissible state, link CTA**"*) and UX `<PinnedNotice>` anatomy at
`ux-design-specification.md:1817` (*"4pt colored left-stub · **title** · **meta line**"*)
**When** the view-model declares its per-notice row descriptor
**Then** ⚠ **the two sources are reconciled EXPLICITLY, in the type's doc comment, naming both** —
⛔ the epic lists `body` and `link CTA`, and ⛔ **UX §1817 has NEITHER** (it has a *meta line*).
⛔ Do not silently pick one; ⛔ do not silently emit both
**And** every field the descriptor carries is **structured**, per Trap 1: ⛔ an i18n **key** or a raw
value, ⛔ never resolved copy; the category as the **D2-ruled** name; ⛔ **no** hex, ⛔ **no**
formatted numeral, ⛔ **no** href-with-copy-baked-in
**And** ⚠ **`dismissible` is a FLAG here and ⛔ NOTHING ELSE.** The descriptor may declare *that* a
notice can be dismissed; ⛔ **dismiss-with-ack — the interaction, the mutation, the persistence — is
11a.6's** (its epic AC names it explicitly). ⛔ This story wires ⛔ no dismiss call and reuses ⛔ none
of 10.9's `DismissBannerResponse` path
**And** ⛔ **no field is added "because 11a.6 might want it"** — an unused field in a shared presenter
is the widening Trap 2 exists to forbid, in a second place. ⚠ If a field's consumer is unclear,
**leave it out and say so in Task 6**, ⛔ do not speculatively emit it.

---

## Tasks / Subtasks

> ⛔ **Task 0 is a hard precondition** — ⛔ the `governance:` commit lands **before** any implementation
> commit ([[feedback_governance_commits_precede_implementation]]).
> ✅ **Tasks 4 and 5 are UNGATED** (D3(a), D5(a) ruled) — ⚠ ⛔ ungated means **required**.

- [x] **Task 0 — governance commit FIRST** (precondition; [[feedback_governance_commits_precede_implementation]])
  - [x] Read the `.decision-log.md` head **live** (⛔ do not hardcode; it was `2026-08-22-151` at authoring)
  - [x] Add the entry recording BigDev's **D1–D7** rulings with their reasoning
  - [x] ⭐ **D2's ruling is a UX-spec AMENDMENT, and the entry must say so** — name the losing line (`ux-design-specification.md:491` or `:1819`) as **superseded**, ⛔ never "reinterpreted" ([[feedback_supersede_never_reinterpret]], [[feedback_closure_language_precision]])
  - [x] Commit **alone**, `governance:` prefix, **before** any implementation commit — history must read governance → implementation

- [x] **Task 1 — author the headless presenter** (AC: 1, 2, 6)
  - [x] Read `packages/ui/src/pool-progress/{view-model,presenter,i18n-keys,index}.ts` end-to-end and mirror its shape and comment register
  - [x] `view-model.ts` — input + output types; ⭐ the banner slot is **singular by SHAPE** (AC2); document *why* in the type's doc comment, naming Trap 2
  - [x] ⭐ `view-model.ts` — the **row descriptor** (AC6), with the epic-vs-UX-§1817 reconciliation stated in its doc comment; ⛔ `dismissible` is a flag only
  - [x] `view-model.ts` — all **four** ratified states (`default`/`loading`/`empty`/`refreshing`, UX `:1808`); ⛔ the pinned `empty` copy-key case is distinct from the no-producer silent case (AC1)
  - [x] `presenter.ts` — pure `deriveNoticeboardViewModel(input, now)`; sections in render order with explicit empty states
  - [x] `i18n-keys.ts` — KEY constants only; **reuse** existing keys where copy is identical, mint new only for genuinely new strings (the 9.12 Task-2 discipline)
  - [x] `index.ts` barrel + register the module in `packages/ui/src/index.ts` with a Story-11a.5 header
  - [x] ⚠ **Use `.js` ESM extensions on every relative import/export** — `export * from './noticeboard/index.js'`, `import … from './view-model.js'`. ⛔ The package is `"type": "module"` on NodeNext; the four existing barrels all do this and an extensionless specifier will not resolve the same way everywhere
  - [x] ⛔ Verify zero react/react-native/tamagui imports and zero colour hex — ⚠ **by reading, not by trusting CI**: there is ⛔ no gate for this (Trap 1)

- [x] **Task 2 — tests for the presenter** (AC: 1, 2, 6)
  - [x] `packages/ui/tests/noticeboard/presenter.test.ts` — section order, per-section empty states, injected-`now` boundaries
  - [x] ⭐ The **anti-widening** test: the input type admits **no banner list** (the 9.12 Task-3b precedent — `packages/ui/tests/pool-progress/presenter.test.ts:151`)
  - [x] ⭐ **All four states** are reachable and distinct (`default`/`loading`/`empty`/`refreshing`), and ⛔ the pinned-empty case yields a **copy key** while a no-producer section yields **silence** — the two must not be assert-equal
  - [x] Row-descriptor shape test (AC6): exactly the reconciled field set, ⛔ no speculative field
  - [x] Tier-filter tests incl. the **fail-closed** unknown-audience case (✅ D5(a) ruled — ⛔ required, not conditional)

- [x] **Task 3 — rewire the mobile render** (AC: 3)
  - [x] `PanchayatNoticeboard.tsx` consumes the presenter; ⛔ `SAMPLE_*` imports removed for every wired section
  - [x] ✅ **D7(a)** — wire the banner input to the **existing** `useMemberBannersQuery`; ⛔ no second query
  - [x] ✅ **D7(a)** — add the **fifth** self-suppression condition to `BannerHost.tsx` (the panchayat route). ⚠ **This is the ONE 10.9-owned file this story edits**, and ⛔ it is the ONLY change permitted in it — ⛔ not `SEVERITY_TOKENS`, ⛔ not the dismiss path, ⛔ not the `banner-strip` testID, ⛔ not the mount point
  - [x] ✅ **D7(a)** — a render test asserting the banner appears **exactly once** on the panchayat tab, and ⛔ **still appears** on a non-panchayat tab (⚠ the second half is what stops the suppression over-firing)
  - [x] ✅ **D6(a)** — replace the raw hexes with ONE named map, `as const satisfies Record<NoticeCategory,…>`; ⛔ do not add `@twt/tokens` to `apps/mobile` and ⛔ do not touch `tamagui.config.ts`
  - [x] ✅ **D2(a)** — `PinnedItem` consumes `terracotta|green|black|ink`; ⛔ delete `saffron`; ⚠ **correct the `:36` `accessibilityHint`** — ⛔ `black` is now *scheduled meeting*, ⛔ NOT *memorial*
  - [x] Render the `loading` state as the ratified **skeleton** (*"top + first 2 notices"*, UX `:1808`) — ⛔ not a spinner, ⛔ not a blank screen; `refreshing` keeps content on screen
  - [x] Register the i18n namespace in `packages/i18n/src/catalog.ts` — ⚠ **BOTH the `catalogs` map AND the `KNOWN_NAMESPACES` literal** (`:65`); ⛔ they are two separate literals that drift, and `catalog-registration.test.ts:70` asserts they agree
  - [x] ⚠ Add the catalog **files** — ⛔ they are NOT in `src/`: `packages/i18n/locales/hi/<ns>.json` **and** `packages/i18n/locales/en/<ns>.json` (the parity gate walks the `locales/` **directory**)
  - [x] Add the mobile namespace-bound hook wrapper following `apps/mobile/lib/{poll,helpdesk,claim}-i18n.ts` — ⛔ do not call bare `useT()` (it defaults to `common` and **throws**)
  - [x] Move hardcoded Hindi chrome literals to catalog keys; ⛔ keep all numerals Latin
  - [x] ⚠ **Trap 6 first** — `sample-data.ts` also holds the TYPES four components import **and** `formatCount`. Move types to the view-model; ⭐ keep `formatCount` in the RENDER layer; ⛔ do not touch the `yogdaan-bahi` / `shradhanjali` sample-data files
  - [x] Remove `<P3DiagnosticPanel>` + its file (✅ verified: imported only by `PanchayatNoticeboard.tsx:6,122`); ⛔ leave `<PollsEntry>` exactly where it is
  - [x] Update/extend the mobile render test alongside `banner-host-render.test.ts` / `status-pill-render.test.ts`

- [x] **Task 4 — ✅ `[D3(a) RULED]` honest empty sections** (AC: 4)
  - [x] ⛔ **Delete** `SAMPLE_RECENT_CLOSINGS` and every other fixture for an unwired section — ⛔ not relocated, ⛔ not commented out
  - [x] Wire the section to its real (empty) source; render nothing when empty
  - [x] ⛔ Build no close-of-cycle and no aggregate-stat read model

- [x] **Task 5 — ✅ `[D5(a) RULED]` tier filter** (AC: 5)
  - [x] Pure predicate over 10.9's `audience_scope`; ⛔ no new taxonomy
  - [x] **Fail-closed** on unknown/unresolvable audience
  - [x] ⛔ Ship no `apps/public` route; record the future matrix obligation in one line

- [x] **Task 6 — route what this story does not build** ([[feedback_gap_analysis_observational]])
  - [x] A trustee-panel routing note recording: (a) ⛔ **no close-of-cycle (FR-19) read model exists and no story owns one**; (b) ⛔ **no aggregate member/district stat read model exists**; (c) the UX spec's *"public website embed"* variant has ⛔ **no host surface** (`index.astro` is a bare 302) **and `apps/public` does not depend on `@twt/ui`** (a documented Story-2.5 variance, `COMPOSITION-CONTRACT.md:156-158`) — ⛔ two separate absences, not one
  - [x] ⭐ (d) **The UX spec's `<NoticeboardStrip>` "admin home (with admin-only sections)" variant** (`ux-design-specification.md:1809`; Surfaces `:1810` names *"admin dashboard"*; the §14 inventory `:2228` repeats *"member home + admin home variants"*) is ⛔ **OUT OF SCOPE here and owned by NO story.** ⚠ Note the asymmetry for whoever picks it up: `apps/admin` **already depends on `@twt/ui`** (`package.json:24`), so the admin variant is the **cheapest** second consumer of this presenter — ⛔ which is exactly why leaving it unrouted would let it be built twice
  - [x] ⭐ (e) **The UX-spec amendment D2(a) forces** — `ux-design-specification.md:491` is **SUPERSEDED** by `:1819`. ⛔ Route the spec edit; ⛔ do not edit the spec inside this story. ⚠ Record it as **superseded**, ⛔ never "reinterpreted"
  - [x] ⭐ (f) **D6(c) — bridging `@twt/tokens` INTO `tamagui.config.ts`.** ⚠ The architecturally right answer and ⛔ the one this story deliberately did NOT take: it is the only path that makes `stamp-mudra` a real mobile token, but it re-themes **every** mobile surface from inside a one-tab story. ⭐ **Re-trigger:** the next story that needs a `@twt/tokens` colour role on RN — ⛔ at which point the local maps (`TONE_TOKENS`, `SEVERITY_TOKENS`, and this story's) become the migration list, ⛔ not obstacles
  - [x] Add each to `deferred-work.md` with its **re-trigger**; ⛔ observe and route — do not schedule, and do not build

- [x] **Task 7 — story close-out**
  - [x] `pnpm ci:local` green (⚠ `--concurrency=4`; ⚠ `git push` runs the full leg via the pre-push hook — the "hang" is expected, [[project_friction_budget_baseline_ratchet]])
  - [x] Sprint-status ledger entry per [[project_sprint_status_ledger]] — one combined top-of-file entry; flip **only** `11a-5-…`; ⛔ `epic-11a` stays `in-progress` (11a.6 remains)
  - [x] ⛔ **REBASE-merge**, never squash ([[project_story_automator_ops]])

---

## ⚖️ Decisions — ✅ **ALL SEVEN RULED BY BIGDEV, 2026-08-22. ⛔ Nothing here is open.**

> ✅ **D1(a) · D2(a) · D3(a) · D4(a) · D5(a) · D6(a) · D7(a)** — each **as recommended**. ⛔ The dev
> agent must not rule, re-open, or re-interpret these ([[feedback_supersede_never_reinterpret]]).
> ⚠ Durability is **Task 0's `governance:` commit**, ⛔ not this file — ⛔ do not treat this section
> as the record of the ruling ([[feedback_governance_commits_precede_implementation]]).

### D1 — What does "consumes Story 10.9 banner/popup data" mean for a strip? — ✅ **RULED (a) (BigDev, 2026-08-22)**

10.9 yields **at most one** banner; a strip renders a **list** (Trap 2).

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — the banner lane is ONE SOURCE among several.** The presenter merges *sources*
  (banner → at most one row; polls; future closings), each contributing independently. ⛔ 10.9 is
  untouched; the singular slot is enforced **by shape** + an anti-widening test.
- (b) Widen the member read to return a list. ⛔ **Refused on the merits** — breaks FR-58B, Decision 3,
  the total comparator, the shuffled-input determinism test, and AC5's single-implementation rule.
- (c) The noticeboard consumes **no** banner data at all. ⛔ Contradicts the epic AC and leaves the one
  real producer unused.

### D2 — Which pinned-category vocabulary is canonical? — ✅ **RULED (a) (BigDev, 2026-08-22)**

> ✅⭐ **§1819 (`terracotta` / `green` / `black` / `ink`) IS CANONICAL. `ux-design-specification.md:491`
> IS SUPERSEDED.** ⛔ **`saffron` is dead** — ⛔ not deprecated, ⛔ not "legacy", ⛔ not kept as an alias.
> ⚠ **This is a UX-spec AMENDMENT, and it must be recorded as one** ([[feedback_supersede_never_reinterpret]],
> [[feedback_closure_language_precision]]): Task 0's entry names `:491` as **superseded by** this
> ruling; Task 6 routes the spec edit. ⛔ The spec file itself is **NOT** edited by this story.
> ⚠ ⛔ **`black` CHANGES MEANING** — §491 bereavement → §1819 **scheduled meeting**. ⛔ Do not carry the
> prototype's `black`-means-bereavement `accessibilityHint` across (`PinnedItem.tsx:36`); it is now
> **wrong**, ⛔ not merely differently-named.

⛔ **Read the evidence before the options — the obvious framing of this question is wrong.**

| Vocabulary | Where it is ratified | Meanings |
|---|---|---|
| `saffron` / `green` / `black` | ⭐ **`ux-design-specification.md:491`** — the §5/§8 Panchayat grammar. ⛔ **RATIFIED SPEC TEXT**, not the prototype's invention. (`sample-data.ts:46-49` merely implements it.) | governance / cycle / bereavement |
| `terracotta` / `green` / `black` / `ink` | **`ux-design-specification.md:1819`** — §11 `<PinnedNotice>` Variants | close-of-cycle celebration / milestone / scheduled meeting / generic |
| `info` / `warning` / `critical` | `packages/contracts/src/banners/enums.ts` (10.9) **and ⭐ the epic's own 11a.5 AC** (*"severity (info / warning / critical)"*) | operator urgency |

⚠ **Note what the table shows.** ⛔ This is **not** "prototype vs ratified spec" — it is **one ratified
artifact disagreeing with itself** (§491 vs §1819), with a **third** axis named by the epic AC this
story implements. ⛔ `green` and `black` survive all the way across but ⛔ **`black` does not mean the
same thing in §491 (bereavement) as in §1819 (scheduled meeting)** — so even the words that look
shared are not.

⇒ ⭐ **Every option below is a spec amendment.** Per [[feedback_niyamavali_rulebook_not_spec]] applied
to the design artifact: a clause conflicting with ratified behaviour is a **required amendment** —
⛔ never a silent supersession and ⛔ never a blocker. Whichever way BigDev rules, **Task 0 records it
and Task 6 routes the UX-spec amendment.**

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — §1819 (`terracotta`/`green`/`black`/`ink`) is canonical; §491 is AMENDED to
  match.** §1819 is the **component-level** contract and the `<PinnedNotice>` anchor 11a.6 builds to;
  §491 is **screen-grammar prose** written before the component section existed. The presenter emits
  the four §1819 categories; 10.9 severity **maps into** them; ⛔ the epic AC's `info/warning/critical`
  is recorded as **the banner lane's own axis**, ⛔ not the noticeboard's category vocabulary.
  ⚠ Ruled here, **implemented in the render by 11a.6** (Trap 5). ⚠ ⛔ `terracotta` has **no mobile
  token** — see **D6**, ⛔ do not assume `stamp-mudra` is reachable from RN.
- (b) **§491 (`saffron`/`green`/`black`) is canonical; §1819 is AMENDED to match.** ⭐ Has the better
  claim to *"what the noticeboard actually means"* (bereavement is a real category the noticeboard
  carries and §1819 drops it) and ⛔ costs the least churn in `PinnedItem.tsx`. ⚠ But it strands
  §1819's `ink` generic case and ⛔ leaves 11a.6 building to an amended spec.
- (c) Collapse onto 10.9 / the epic AC's `info|warning|critical`. ⛔ **Refused on the merits** — loses
  the bereavement / governance / celebration distinction the noticeboard exists to carry, and
  ⛔ conflates *operator urgency* with *notice kind*.
- (d) Defer the whole vocabulary to 11a.6 and have this presenter emit an **opaque category token**
  it does not interpret. ⚠ Honest about the split (11a.6 owns the row) but ⛔ pushes an unresolved
  spec contradiction into the next story rather than closing it.

### D3 — What happens to the invented deceased-member names? (Trap 4) — ✅ **RULED (a) (BigDev, 2026-08-22)**

> ✅⭐ **AC4 + Task 4 ARE NOW UNCONDITIONAL.** ⛔ The five invented names are **deleted**, ⛔ not relocated and ⛔ not commented out.

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — delete the fixtures; wire the real, empty source; render nothing when empty**
  (the `PollsEntry` posture). ⛔ No producer built; the absences are **routed** (Task 6). Activates
  **AC4 + Task 4**.
- (b) Leave them until a producer exists. ⛔ Ships fabricated bereavement records on a live tab.
- (c) Build the close-of-cycle read model here. ⛔ Scope invention on memorial data, gated by Epic 11b
  consent; ⛔ no story owns it.

### D4 — Does a coverage-bearing deadline ever ride the noticeboard? — ✅ **RULED (a) (BigDev, 2026-08-22)**

> ✅⭐ **NO, BY CONSTRUCTION — and this is what keeps the §Policy-meaning answer TRUE.** ⚠ It is a **standing constraint on every future notice source**, ⛔ not a one-time scoping note: the moment a coverage-bearing deadline rides the noticeboard, the tier filter becomes eligibility-adjacent and owes a Niyamavali check.

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — NO, by construction.** The noticeboard carries **announcements only**;
  deadlines a member's coverage turns on stay in the Story 8.8 notification family. ⇒ the tier filter
  can never hide something a member's benefit depends on, and the §Policy-meaning answer stays true.
  Recorded as a standing constraint for future notice sources.
- (b) Allow it, and treat the tier filter as coverage-bearing. ⚠ Would make this a genuine
  eligibility-adjacent predicate and demand a Niyamavali check — ⛔ a much larger story.

### D5 — Does a public (unauthenticated) noticeboard render ship in this story? — ✅ **RULED (a) (BigDev, 2026-08-22)**

> ✅⭐ **NO. AC5 + Task 5 ARE NOW UNCONDITIONAL** — the tier filter ships **in the presenter**, so the rule exists before the surface does. ⛔ No `apps/public` route, ⛔ no matrix surface entry, ⛔ no `@twt/ui` dependency added to `apps/public`.

⚠ **Corrected premise — read before ruling:** this decision is ⛔ **not** merely "is there a host
page?". `apps/public` **does not depend on `@twt/ui` at all**, and that is a **documented Story-2.5
variance** (`COMPOSITION-CONTRACT.md:156-158`: *"the epic AC names `@twt/ui`, which is still an empty
stub"*). ⇒ a public render would need **both** a host page **and** a new workspace dependency that a
prior story deliberately declined. ⛔ Two absences, ⛔ not one.

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — NO.** Presenter + **mobile** render only. ⛔ No `apps/public` route ⇒ ⛔ no
  matrix surface entry needed; the tier filter still ships in the presenter (AC5) so the rule exists
  before the surface does. ⚠ Both absences are **routed** (Task 6).
- (b) Ship a public noticeboard route too. ⛔ Requires a `public-vs-private-matrix.yaml` surface entry
  (route-coverage leg), a cache policy, an indexing policy, a public home page that does not exist,
  **and** reversing the Story-2.5 `@twt/ui` variance — ⛔ a second story's worth of work.

### D6 — ⭐ On React Native, what IS the "token authority" the noticeboard resolves colour through? — ✅ **RULED (a) (BigDev, 2026-08-22)**

> ✅⭐ **ONE NAMED semantic→Tamagui-scale MAP, in the render layer** — the `TONE_TOKENS` / `SEVERITY_TOKENS` shape. ⛔ **`@twt/tokens` is NOT added to `apps/mobile`** (that was (b)) and ⛔ **`tamagui.config.ts` is NOT touched** (that was (c) — ⚠ routed to Task 6 instead, because its blast radius is every mobile surface). ⛔ No hex literal survives in the panchayat components.

⚠ **This decision exists because the obvious instruction is unbuildable.** FM-14 #2 says *"colours
come from a token authority, never a magic literal"* — but ⛔ **`apps/mobile` does not depend on
`@twt/tokens`** (`package.json:32-35`), and `tamagui.config.ts` overrides **fonts only**, so ⛔
`stamp-mudra` and `rule-hairline` **do not exist in the mobile theme**. `@twt/tokens` colour roles are
resolved today only by `apps/public` (CSS vars) and `apps/api` (the PDF note-template).

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — follow the existing RN precedent: ONE named semantic→Tamagui-scale map.**
  Exactly the `StatusPill.tsx:46-52` `TONE_TOKENS` / `BannerHost.tsx:57-61` `SEVERITY_TOKENS` shape —
  `as const satisfies Record<Category, {…}>` so the mapping is **exhaustive by type**, living in the
  render layer beside the component, with a header naming FM-14 #2 and the `@twt/tokens` role it
  *aligns to*. ⭐ Zero new dependencies, ⭐ consistent with every RN colour decision already shipped,
  ⭐ and the `satisfies` check is the gate. ⚠ Cost: the mobile palette remains **aligned to** rather
  than **derived from** `@twt/tokens` — ⛔ an honest, already-accepted variance (`StatusPill.tsx:43-44`
  states it in terms), ⛔ not a new one.
- (b) Add `@twt/tokens` to `apps/mobile` and resolve `color['stamp-mudra']` directly in styles.
  ⚠ Genuinely closes the drift and the package is **bundle-safe** (zero runtime deps, pure TS — ⛔ the
  `theme.css` export is a separate subpath and would not be imported). ⛔ But it bypasses the Tamagui
  theme entirely, so those colours stop responding to theme switching while every neighbouring colour
  still does, and it is a **first** with no precedent — ⛔ a cross-cutting design-system decision that
  a noticeboard story should not make alone.
- (c) Bridge `@twt/tokens` **into** `tamagui.config.ts` as custom theme tokens. ⭐ The architecturally
  *right* answer and the only one that makes `stamp-mudra` a real mobile token. ⛔ But it re-themes
  **every** mobile surface at once from inside a story scoped to one tab — ⛔ a change whose blast
  radius is the whole app. ⚠ **Route it (Task 6) rather than take it here.**
- (d) Leave the hexes. ⛔ Refused — FM-14 #2, and the prototype's own *"production uses Stamp atom"*.

### D7 — ⭐ Where does the noticeboard's banner input come from, and what stops the SAME banner rendering twice? — ✅ **RULED (a) (BigDev, 2026-08-22)**

> ✅⭐ **ONE query — `useMemberBannersQuery` — and `BannerHost` SELF-SUPPRESSES on the panchayat route.**
> ⚠⛔ **THIS TAKES `BannerHost.tsx` OFF THE UNTOUCHED LIST.** It is now the **one** 10.9-owned file this
> story edits, and the edit is **exactly one thing**: a fifth self-suppression condition, in the
> component that already owns the other four. ⛔ Nothing else in it moves — ⛔ not `SEVERITY_TOKENS`,
> ⛔ not the dismiss path, ⛔ not the query, ⛔ not the `banner-strip` testID. ⚠ Trap 3's untouched
> claim is **amended in place**; ⛔ do not read the pre-ruling wording as still governing.

⚠ **Trap 3b.** `BannerHost` mounts at `app/(tabs)/_layout.tsx:21` — above **every** authenticated tab
including panchayat — and renders the single winning `banner` from `useMemberBannersQuery`. Under
D1(a) the noticeboard consumes that **same** winner ⇒ ⛔ **one banner, twice, on one screen.** ⛔ The
story otherwise never says where the noticeboard's input comes from at all.

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — the noticeboard reads the SAME query, and `BannerHost` SELF-SUPPRESSES on the
  panchayat route.** One fetch, one cache, one MMKV entry, one server-resolved winner — ⛔ no second
  request and ⛔ no divergence. `BannerHost` already self-suppresses on four conditions (no session /
  loading / error / nothing visible); ⭐ this is a fifth, and it is **one route check** in the
  component that already owns suppression. ⚠ Cost: `BannerHost` gains route awareness — ⛔ a real
  (small) coupling, and ⛔ it is an edit to a file Trap 3 otherwise marks untouched, so **Trap 3's
  untouched-list must be amended if this is ruled**.
- (b) The noticeboard reads the same query; **`BannerHost` is unchanged** and the noticeboard
  **omits** the banner row when it is already ambient. ⭐ Keeps `BannerHost` frozen (Trap 3 intact) and
  puts the rule in the NEW code. ⚠ But the suppression logic then lives in the presenter, which
  ⛔ cannot know what another component is rendering — so it would have to be a **render-layer** flag,
  ⛔ not a presenter rule. Weaker: the strip's own composition rule becomes screen-dependent.
- (c) The noticeboard consumes a **different source** — e.g. the `popup` lane, or a board-flagged
  subset. ⛔ Refused as unbuildable today: 10.9 has ⛔ no "show on noticeboard" flag, and ⛔ the popup
  lane is a modal overlay, not a strip row. ⚠ Would need a 10.9 schema change — Trap 2 territory.
- (d) Accept the duplication. ⛔ Refused — the noticeboard's whole design premise is a **quiet**
  surface; ⛔ a banner shown twice on one screen is the loudest thing on it.

---

## Dev Notes

**Read before writing:** `packages/ui/src/pool-progress/*` (the shape to mirror) ·
`apps/mobile/components/panchayat/*` (what you are promoting) ·
`packages/contracts/src/banners/{precedence,display-state,enums}.ts` (⛔ read-only) ·
`apps/mobile/components/polls/PollsEntry.tsx` (the addition-not-restructuring precedent) ·
⭐ `apps/mobile/components/status-pill/StatusPill.tsx:43-52` **and**
`apps/mobile/components/banners/BannerHost.tsx:53-61` (the **RN colour precedent** — D6) ·
`apps/mobile/app/(tabs)/_layout.tsx` (⚠ where `BannerHost` mounts — Trap 3b / D7) ·
`apps/mobile/lib/poll-i18n.ts` (the namespace-hook wrapper shape).

**Injected `now`.** Both 10.9 pure modules take `now` as a parameter and say why. ⛔ Never
`new Date()` inside the presenter — it breaks boundary tests and replay determinism.

**Fail-soft is the house rule for ambient chrome.** `BannerHost` renders `null` on no-session /
loading / **error** / nothing-visible; `PollsEntry` renders `null` on empty **and on error** (a
recorded, deliberate deferral at `deferred-work.md:5993`). ⚠ Know that the same silent-on-persistent-
failure question applies to any new noticeboard section — ⛔ do not re-open it here; match the posture
and note it.

**Bundle boundary.** `@twt/ui` depends only on `@twt/contracts`. ⛔ Never import `@twt/domain` — it
pulls `pg`/`drizzle`/`@google-cloud/kms` into the RN Metro bundle
([[project_contracts_domain_bundle_boundary]]).

**Import-cycle trap.** Prefer `import type` for cross-module types, and ⛔ never convert a type-only
import to a value import casually — it materializes a module-init cycle that breaks **consuming**
packages at runtime while typecheck/lint pass ([[project_type_only_import_cycle_trap]]).

**Fabric/FlatList.** If any section becomes a `FlatList`, ⛔ do not let it cross empty→populated in
place — render empty/loading/error **outside** the list ([[project_fabric_flatlist_empty_populated_crash]]).

**i18n.** `t()` defaults to `common` and **throws** on an unregistered namespace. Register in
`KNOWN_NAMESPACES` **and** add both `hi` and `en` catalogs, or the live tab crashes.

### Project Structure Notes

```
packages/ui/src/noticeboard/        NEW — presenter.ts · view-model.ts · i18n-keys.ts · index.ts
                                       ⚠ `.js` ESM extensions on every relative specifier
packages/ui/src/index.ts            UPDATE — register the barrel (house header comment)
packages/ui/tests/noticeboard/      NEW — presenter.test.ts (anti-widening · 4 states · row shape)
packages/i18n/src/catalog.ts        UPDATE — ⚠ TWO literals: the `catalogs` map AND `KNOWN_NAMESPACES`
                                       (`:65`) — they drift, and catalog-registration.test.ts:70 checks
packages/i18n/locales/hi/<ns>.json  NEW — ⚠ catalogs live in `locales/`, ⛔ NOT in `src/`
packages/i18n/locales/en/<ns>.json  NEW — the parity gate walks this DIRECTORY
apps/mobile/lib/<ns>-i18n.ts        NEW — namespace-bound hook, per lib/{poll,helpdesk,claim}-i18n.ts
apps/mobile/tamagui.config.ts       ⛔ NOT TOUCHED — D6 ruled (a), ⛔ not (c). Routed (Task 6f)
apps/mobile/components/panchayat/   UPDATE — consume the presenter; colour per D6; i18n
  PanchayatNoticeboard.tsx          UPDATE   · StatLine.tsx / RecentClosingRow.tsx  UPDATE
  sample-data.ts                    ⚠ MIXED MODULE — see Trap 6 (fixtures out; types → view-model;
                                       `formatCount` stays in the render layer)
  P3DiagnosticPanel.tsx             DELETE (✅ no other importer)
  PinnedItem.tsx                    ⚠ TWO CHANGES ONLY — the D2(a) vocabulary (⛔ `saffron` deleted) and
                                       the `:36` accessibilityHint (⛔ `black` = scheduled meeting now).
                                       ⛔ 11a.6 owns everything else in it
apps/mobile/components/banners/
  BannerHost.tsx                    ✅ UPDATE — D7(a). ⭐ ONE change: a 5th self-suppression condition
                                       (the panchayat route). ⛔ Nothing else in the file moves
```

⛔ **Untouched:** `packages/contracts/src/banners/*` · `apps/api/src/modules/banners/*` ·
`apps/admin/src/modules/banners/*` · `PollsEntry.tsx` ·
`packages/contracts/public-pages/public-vs-private-matrix.yaml` (⚠ **that is the real path** — ⛔ it is
NOT under `planning-artifacts/`) · `apps/mobile/components/{yogdaan-bahi,shradhanjali}/*` ·
`apps/mobile/tamagui.config.ts` (⛔ D6(a), ⛔ not (c)) · `ux-design-specification.md` (⛔ D2(a)'s
amendment is **routed**, ⛔ not applied here).

⚠ ⛔ **`BannerHost.tsx` IS NO LONGER ON THIS LIST** — D7(a) put it in scope for **one** condition.
⭐ It is the single exception, and ⛔ the exception is one `if`.

**Orientation is settled — ⛔ do not re-derive it.** The epic says *"horizontal or vertical strip"*;
the UX spec is narrower and wins: *"Noticeboard strip — full-width with hairline section separators;
**vertical stack only (no grid columns)**"* (`ux-design-specification.md:1161` region) and
*"Full-width **vertical** stack"* (`:1806`). ⇒ ⛔ **no orientation prop, no horizontal variant.**

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 11a.5`] — the three ACs this story expands
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md:1805-1813`] — `<NoticeboardStrip>` purpose/anatomy/states/variants/a11y/surfaces
- [Source: `ux-design-specification.md:1814-1821`] — `<PinnedNotice>` (⛔ Story 11a.6)
- [Source: `ux-design-specification.md:483-498, 1161, 1169`] — Panchayat grammar; **Latin numerals throughout** (v4)
- [Source: `packages/contracts/src/banners/precedence.ts`] — Decision 3, the total comparator, ⛔ read-only
- [Source: `packages/contracts/src/banners/display-state.ts`] — injected-`now`, derivation-never-a-column
- [Source: `apps/mobile/components/polls/PollsEntry.tsx`] — addition-not-restructuring; quiet-when-empty
- [Source: `packages/ui/src/pool-progress/*`] — the presenter shape to mirror
- [Source: `ux-design-specification.md:491`] — ⚠ `saffron/green/black` as **ratified** screen grammar (D2's other half)
- [Source: `ux-design-specification.md:1808-1810`] — the four States, the three Variants, the three Surfaces
- [Source: `apps/mobile/components/status-pill/StatusPill.tsx:43-52`] — the RN token precedent (`TONE_TOKENS`) + the explicit note that `@twt/tokens` is the **PDF**'s authority
- [Source: `apps/mobile/components/banners/BannerHost.tsx:53-61`] — `SEVERITY_TOKENS`, the "mobile-palette bridge" naming FM-14 #2
- [Source: `apps/public/COMPOSITION-CONTRACT.md:156-158`] — ⛔ the documented `@twt/ui` variance (D5's corrected premise)
- [Source: `packages/i18n/tests/catalog-registration.test.ts`] — the gate that catches an unregistered namespace; ⚠ parity ≠ registration
- [Source: `apps/mobile/app/(tabs)/_layout.tsx:21`] — where `BannerHost` mounts (Trap 3b / D7)
- [Source: `.decision-log.md#2026-08-22-151`] — head at authoring; ⛔ read live

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`), 2026-08-22.

### Debug Log References

**Baseline verified live before branching** ([[feedback_git_fetch_before_remote_reasoning]]):
`git fetch origin` → `HEAD == origin/main == 54492eb`, zero ahead / zero behind. Branch
`story/11a.5-noticeboard-strip` cut from `main` at that commit. The `baseline_commit` frontmatter
was already present and was **preserved**, ⛔ not overwritten.

**`.decision-log.md` head read LIVE at implementation time** — it was `2026-08-22-151`, exactly as
the authoring pass predicted, but it was ⛔ **not** hardcoded from that prediction. The new entry is
**`2026-08-22-152`**, committed **alone** and **first** (`bda5f9b`), before any implementation
commit.

**⭐ Revert-sanity — the presenter gate was proved NON-VACUOUS, ⛔ not assumed.** Four mutations were
applied to `packages/ui/src/noticeboard/presenter.ts` and the suite re-run each time (the Story
11a.4 `bcc97f0` precedent, which found a real vacuous assertion):

| Mutation | Result |
|---|---|
| fail-**OPEN** on an unknown audience (`return false` → `return true`) | **1 failure** |
| merge `empty-with-copy` into `silent` (the AC1 split) | **4 failures** |
| make `validUntil` **INCLUSIVE** (`>=` → `>`) | **5 failures** |
| move the polls section out of the ratified anatomy order | **7 failures** |

**⭐ Revert-sanity — the D7(a) suppression, BOTH halves.** Three mutations to
`route-suppression.ts`:

| Mutation | Result |
|---|---|
| suppression **over-fires** (`return true`) | **2 failures** |
| suppression **under-fires** (`return false`) | **1 failure** |
| loose `segments.includes(…)` match (nested route over-fires) | **1 failure** |

⭐ The over-fire case failing is the half the ruling explicitly asked for: a suppression that fired
everywhere would silently delete ambient chrome from the whole app and still pass the first half.

**⚠ ONE RECORDED DEVIATION from the story's §Project Structure Notes — ⛔ not silent, and ⛔ not a
re-opened ruling.** The Notes marked `StatLine.tsx` and `RecentClosingRow.tsx` as **UPDATE**. They
were **DELETED** instead. Reasoning: those Notes predate D3(a)'s *consequence*. Under D3(a) the two
sections they render have **no producer**, so the presenter emits `silent` for both and neither
component has a call site — keeping them would be **unreachable code whose only possible input was
fabricated data**, which is keeping the prototype. ⛔ The behaviour the story explicitly protects did
**not** go with them: `formatCount` was relocated to `apps/mobile/lib/format-count.ts` — the
**render layer**, ⛔ never `@twt/ui` (Trap 6) — carrying its UX `:1161` Latin-numeral rationale, a
test pinning Indian grouping (`100000` → `1,00,000`), and an explicit "⛔ do not delete this as dead
code" note. Their Devanagari layout work is recoverable from git at `54492eb` and is routed as a
**starting point** for the producer story. ⚠ This is a file-disposition consequence of a ruling, ⛔
not a deviation from any of D1–D7.

**⚠ A drifting line citation was found and fixed.** The story file and `PanchayatNoticeboard.tsx`'s
draft header both cited the `PollsEntry` error-deferral as `deferred-work.md:5993`. That file grows
at the **top**, and by this commit the item had drifted to **`:6160`**. Both citations now name the
item by its **TEXT**, ⛔ not by a line number.

**`pnpm ci:local` — 31 jobs GREEN** (`--concurrency=4` per
[[project_ci_local_concurrency_oversubscription]]).

⚠ **The live-DB leg was ALSO run, and its failures are recorded openly rather than skipped past**
([[feedback_record_unattested_no_backfill]]). With `DATABASE_URL` set globally, six specs failed —
five `apps/api` E2E specs at ~20 000 ms timeouts plus one `packages/domain` reconciliation spec.
**Neither is attributable to this story, and both were checked rather than assumed:**

1. `apps/api/tests/integration/helpdesk/member-helpdesk.spec.ts` **PASSES in isolation** (9/9) — the
   documented double-run pollution ([[project_ci_local_double_run_pollution]]): a global
   `DATABASE_URL` makes the *unit* leg run the integration specs too, so they execute twice
   concurrently and time out.
2. `packages/domain/tests/integration/reconciliation/review-queue-read.spec.ts` fails **identically
   on `main` at the baseline commit** — checked out and re-run there: `1 failed | 9 passed` on both.
   ⇒ **pre-existing**, ⛔ not a regression ([[project_known_livedb_test_failures]]).

⭐ **This story touches ⛔ ZERO files in `apps/api`, `apps/jobs`, `packages/domain`,
`packages/events`, `packages/contracts`, `packages/queue`, `packages/niyamavali-engine`,
`packages/validity-service` or `packages/channels`** — there is no code path from this diff to any
failing spec. ⛔ No migration, ⛔ no schema change, ⛔ no API route.

### Completion Notes List

**⭐ AC5's one-line record, as the AC requires:** a **future** public (unauthenticated) noticeboard
render **will owe a `public-vs-private-matrix.yaml` surface entry**, because the matrix's
**bidirectional route-coverage leg fails CI when a route ships undeclared**. ⛔ Story 11a.5 needed no
entry because it shipped **no route** — the leg is satisfied by the **absence of a route**, ⛔ not by
a declaration. Routed in full as `deferred-work.md` item (c).

**What shipped, against the six ACs:**

- **AC1** — `packages/ui/src/noticeboard/` follows the `pool-progress` shape exactly (four modules,
  `.js` ESM specifiers, registered in the house barrel with a Story-11a.5 header). ⛔ Zero
  react/react-native/tamagui imports, ⛔ zero JSX, ⛔ zero colour hex, ⛔ zero resolved copy, ⛔ zero
  numeral formatting — **verified by reading**, because ⛔ no CI gate enforces it (Trap 1) and this
  story mints none ([[feedback_no_premature_package]]). `deriveNoticeboardViewModel(input, now)` is
  pure with `now` **injected**. Section **order** is the presenter's output array. **All four**
  ratified states ship (`default`/`loading`/`empty`/`refreshing`), `loading` carrying the ratified
  skeleton anatomy. ⭐ The empty-state split is **structural**: `empty-with-copy` (a real, empty
  source — information) and `silent` (no producer — nothing to say) are separate arms of a
  discriminated union and can never be assert-equal.
- **AC2** — the banner slot is `bannerNotice: … | null`; ⛔ there is **no** array field, so the 10.9
  at-most-one-per-lane invariant cannot be widened from this side. ⛔ **Zero lines changed** in
  `precedence.ts`, `display-state.ts`, `dto.ts`, `enums.ts`, `member-handlers.ts` or
  `member-routes.ts`. The anti-widening test is the 9.12 Task-3b compile-time exhaustive key map.
  ⚠ `now` **is** read, for the **exclusive `valid_until` boundary only** — the member DTO carries
  neither `status` nor `valid_from`, so this cannot be and is not a second
  `deriveBannerDisplayState`; it stops an MMKV-persisted banner outliving its window on the device.
- **AC3** — the mobile render derives composition from the presenter, resolves all chrome through
  the namespace-bound `useNoticeboardT` (namespace registered in **both** catalog literals), keeps
  every numeral Latin, renders the ratified skeleton on `loading`, preserves and improves the a11y
  posture (header roles, an announced pinned **list**, a labelled seal), keeps `<PollsEntry>`
  exactly where it was, and removes `<P3DiagnosticPanel>` per its own *"production removes this"*.
- **AC4** — ⛔ the five invented deceased-member names are **deleted**, ⛔ not relocated and ⛔ not
  commented out, along with the invented stat line and meeting footer. A test scans the **whole
  surface** for all five names, so a copy-paste rescue into another component is caught too. ⛔ No
  close-of-cycle and no aggregate-stat read model was built.
- **AC5** — the tier filter is a pure predicate over 10.9's **existing** `audience_scope`
  vocabulary, exhaustive by `satisfies Record<BannerAudienceScope, …>`. ⛔ Fail-closed twice over:
  `role`/`cohort` (the un-targetable seam) are hidden from **everyone**, and an audience outside the
  vocabulary is hidden rather than shown to all. ⛔ No `apps/public` route shipped.
- **AC6** — the row descriptor reconciles the epic's field list against UX `:1817` **explicitly, in
  the type's doc comment, naming both**: `body` ≡ `meta line` collapse to **one** field; `severity`
  **maps into** `category` per D2(a) and is ⛔ not emitted as a second axis; `link CTA` has no §1817
  slot and no consumer, so it is ⛔ left out and **routed**; `dismissible` is a **flag only** and ⛔
  no dismiss path is wired.

**⚠ Two things a reviewer should look at first, because they are the judgement calls:**

1. **The severity → category map sends all three severities to `ink`.** That is a decision, ⛔ not a
   stub: §1819's vocabulary names three *specific* notice kinds (close-of-cycle celebration,
   milestone, scheduled meeting) and a banner is none of them — it is an operator announcement,
   which is what `ink = generic` denotes. Mapping `critical` onto `terracotta` would tell a member
   "close-of-cycle celebration" about an outage notice, conflating operator **urgency** with notice
   **kind** — exactly what D2(c) refused. The urgency still reaches the member through the banner's
   own copy and through the ambient `<BannerHost>` strip on every other tab.
2. **The banner notice's declared audience is `members-all`, supplied by the render layer.**
   `MemberBannerResponse` deliberately carries no `audience_scope` and the server has already
   applied the predicate, so the tier filter needs an audience the DTO does not provide. The
   **more restrictive** of the possibilities is declared: it can only ever **hide** a notice from a
   signed-out viewer, never reveal one. ⛔ Widening the 10.9 DTO to carry the scope was refused as
   Trap 2 territory.

**⛔ Untouched, as required:** `packages/contracts/src/banners/*` · `apps/api/src/modules/banners/*`
· `apps/admin/src/modules/banners/*` · `PollsEntry.tsx` ·
`packages/contracts/public-pages/public-vs-private-matrix.yaml` · `apps/mobile/tamagui.config.ts` ·
`ux-design-specification.md` (D2(a)'s amendment is **routed**, ⛔ not applied) ·
`apps/mobile/components/{yogdaan-bahi,shradhanjali}/*` · Epic 11a's Row 17 launch gate, still `open`
— the noticeboard is a **member-app** surface and ⛔ nothing here bears on the directory kill switch.

**⚠ `BannerHost.tsx` is the ONE 10.9-owned file edited**, for **one condition** — **16 lines added,
⛔ zero removed**. A test asserts that `SEVERITY_TOKENS`, the dismiss path, the query and the
`banner-strip` testID are all still there.

### File List

**New — `packages/ui`**
- `packages/ui/src/noticeboard/view-model.ts`
- `packages/ui/src/noticeboard/presenter.ts`
- `packages/ui/src/noticeboard/i18n-keys.ts`
- `packages/ui/src/noticeboard/index.ts`
- `packages/ui/tests/noticeboard/presenter.test.ts`

**New — `packages/i18n`**
- `packages/i18n/locales/hi/noticeboard.json`
- `packages/i18n/locales/en/noticeboard.json`

**New — `apps/mobile`**
- `apps/mobile/lib/noticeboard-i18n.ts`
- `apps/mobile/lib/format-count.ts`
- `apps/mobile/components/panchayat/tokens.ts`
- `apps/mobile/components/panchayat/banner-notice.ts`
- `apps/mobile/components/banners/route-suppression.ts`
- `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts`

**Modified**
- `packages/ui/src/index.ts` — register the `noticeboard` barrel
- `packages/i18n/src/catalog.ts` — ⚠ BOTH literals: the `catalogs` map AND `KNOWN_NAMESPACES`
- `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx` — presenter-driven rewrite
- `apps/mobile/components/panchayat/PinnedItem.tsx` — D2(a) vocabulary + the corrected a11y hint
- `apps/mobile/components/banners/BannerHost.tsx` — ⭐ the FIFTH self-suppression condition, only
- `apps/mobile/tests/unit/banner-host-render.test.ts` — the fifth-condition fence, both halves
- `.decision-log.md` — Decision `2026-08-22-152`
- `_bmad-output/implementation-artifacts/deferred-work.md` — the eight routed absences
- `friction-budget.md` — the Story 11a.5 disposition (⛔ no new row)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — ledger + the one row flip
- `_bmad-output/implementation-artifacts/11a-5-noticeboard-strip-foundational-layout-component.md`

**Deleted**
- `apps/mobile/components/panchayat/sample-data.ts` — ⛔ the five invented deceased-member names
- `apps/mobile/components/panchayat/P3DiagnosticPanel.tsx` — its own *"production removes this"*
- `apps/mobile/components/panchayat/StatLine.tsx` — ⚠ see the recorded deviation above
- `apps/mobile/components/panchayat/RecentClosingRow.tsx` — ⚠ see the recorded deviation above

### Change Log

| Date | Change |
|---|---|
| 2026-08-22 | **Task 0** — Decision `2026-08-22-152` recording D1–D7, committed **alone and first** (`bda5f9b`). D2(a) recorded as a **UX-spec supersession** (`:491` **SUPERSEDED BY** `:1819`), ⛔ never a reinterpretation. |
| 2026-08-22 | **Story record** — the story file lands; sprint-status `ready-for-dev` → `in-progress`. |
| 2026-08-22 | **Tasks 1 + 5** — the headless `<NoticeboardStrip>` presenter lands in `@twt/ui` (AC1, AC2, AC5, AC6): four ratified states, structural empty/silent split, singular banner slot, fail-closed tier filter, the reconciled row descriptor. |
| 2026-08-22 | **Task 2** — 38 presenter assertions, proved non-vacuous by a four-mutation revert-sanity pass. |
| 2026-08-22 | **Task 3** — the `noticeboard` i18n namespace, registered in **both** catalog literals with hi/en parity. |
| 2026-08-22 | **Tasks 3 + 4** — the mobile render is presenter-driven; ⛔ every fabricated fixture deleted; D6(a) token map replaces four raw hexes; D2(a) vocabulary + the corrected a11y hint; D7(a)'s fifth `BannerHost` suppression condition (16 lines added, ⛔ 0 removed) with **both halves** tested. |
| 2026-08-22 | **Task 6** — eight absences **routed** to `deferred-work.md`, each with a re-trigger; two of them owned by **no story at all**. |
| 2026-08-22 | **Task 7** — `pnpm ci:local` **31 jobs green**; the live-DB leg's six failures attributed (one **pre-existing on `main`**, five the documented **double-run pollution**, both checked rather than assumed). friction-budget disposition: declaration affirmed, ⛔ no new row, metric facet recorded **un-measured** for `member-app-native`. Status → `review`. |
