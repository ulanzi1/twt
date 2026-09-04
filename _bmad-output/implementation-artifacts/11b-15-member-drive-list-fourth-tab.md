---
baseline_commit: e578eb16
---

<!--
⭐ BASELINE — `governance(11b.14): D1 + D2 RULED`. Carries decisions `2026-09-04-186` … `-196`,
Story 11b.10 closed, the six-story split, and stories A–D `ready-for-dev` with zero open decisions.
-->

# Story 11b.15: The Member's Drive List — a **FOURTH TAB** Over Every Drive in Their Pariwar `[SURFACE]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story E** of the six-story split (`2026-09-04-195`
> cl.3), following **Trustee-ratified** `-193` cl.2 and BigDev's `-194` cl.2 / `-196`. ⇒ owes an
> `epics.md` **ANNOTATION** (Task 0).
>
> ⛔ **BLOCKED ON B** (`11b-12`) — the stage words and the shared copy source. ⭐ **Story F depends on
> this one.**
>
> ⭐⭐ **THIS IS A NEW SURFACE, ⛔ NOT A FILTER CHANGE.** `apps/mobile/app/(tabs)/` holds **three**
> tabs; ⛔ **no member-facing drive list exists** — `SahyogVivranEntry` is a single link on the My Pool
> card. ⇒ new tab, new route, new read, its own family-13 pass.

## Story

As a member of a Pariwar,
I want to see every drive my Pariwar has run — the one collecting now, the ones finished, and the ones
fully checked —
so that I can see what my contributions have added up to, without having to go to the public website
to find out.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed. Stated
explicitly, ⛔ not omitted.

⭐ It **adds a read**. ⛔ No eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed is touched
— a member's own pool and what they owe come from the **existing** `active-contribution` path, which
this story ⛔ does ⛔ not modify.

⚠⛔ **BUT `-189` cl.3 (*member > public*) BINDS HERE HARDER THAN ANYWHERE**, and **D1** exists because
this story ⛔ cannot satisfy it without a ruling. ⭐ The member's list must show **at least** what a
stranger sees of the same drive.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| **THREE** tabs; ⛔ no drive list | `apps/mobile/app/(tabs)/` — `index` · `shradhanjali` · `panchayat` | ⭐ read |
| ⚠ Tab titles are **hardcoded English** in a bilingual app | `_layout.tsx:42,49,56` — `'My Pool'` · `'Shradhanjali'` · `'Panchayat'` | ⭐ read |
| ⛔ **No member drive-list route** | `member-pool/routes.ts` — only `active-contribution`, `pool-contributors`, `contribution-history`, `contribution-note` | ⭐ read |
| ⛔⛔ The **public** index renders the deceased's name in the Pariwar's **configured form — `full_name` is the DEFAULT** | `sahyog-drive.ts:94` (`2026-08-19-136` cl.1) | ⭐ read |
| ⛔⛔ The **member** path **hard-codes the SHIELDED form** | `sahyog-drive.ts:96` — *"⛔ NEVER through `resolvePoolIdentity()`, which hard-codes the shielded form"*; My Pool sends `deceasedFirstName` + `deceasedLastInitial` | ⭐ read |
| Long lists need virtualization on native | **UX-DR80** — *"Sahyog Drive archive … Native: FlatList tuning"* | ⭐ read |
| ⚠ New-Arch `FlatList` red-boxes crossing **empty → populated in place** | [[project_fabric_flatlist_empty_populated_crash]] | ⭐ known |
| ⚠ A tamagui `<Button>` is `styled(View)`; `@tamagui/web` sets `accessible` **nowhere** | the 11b.10 review finding, same epic | ⭐ known |

## ⛔ THE FIVE TRAPS

### Trap 1 — ⛔⛔ THE MEMBER CURRENTLY SEES **LESS NAME** THAN THE PUBLIC. ⛔ THIS STORY WOULD SHIP THAT

The public index renders the deceased's name in the Pariwar's **configured form**, and **`full_name`
is the DEFAULT** (`2026-08-19-136` cl.1). The member app renders **first name + last initial** — the
**shielded** form, hard-coded.

⇒ ⛔ **for a drive whose family consented to publication, a stranger sees the FULL name and a member
sees an initial.** ⛔ That is a `-189` cl.3 inversion — **the same shape as `-188`'s banking
inversion, in a different field, and ⛔ nobody has recorded it.**

⚠ It bites ⛔ only where the publication basis IS satisfied; where it is not, the public sees ⛔ nothing
and the member's shielded form is correctly *more*. ⭐ But the consented case is the **normal** one this
programme is building toward. ⇒ **D1**.

⛔ Do ⛔ **not** resolve it by copying My Pool's shape and moving on. ⭐ That is exactly how `-188`
happened.

### Trap 2 — ⛔ *"ALL PARIWAR DRIVES"* EXCLUDES `spawned`, AND THE GROUND IS ⛔ NOT TIDINESS

`-196`: the list reads **`live` · `closed` · `settled`** only.

⛔ A `spawned` pool follows an **APPROVED CLAIM**, before contributions open. ⇒ listing it would
disclose **a death and its claim approval to the whole Pariwar, earlier than any surface does today**.
⛔ A **disclosure change**, ⛔ not a filter widening.

⚠ And the predicate is **⛔ NOT the public one.** `SAHYOG_DRIVE_VISIBLE_POOL_STATES` is
`closed`+`settled` (⭐ story **D** adds `live` to it); this list is `live`+`closed`+`settled` **as its
own fragment**. ⛔ Do ⛔ not share the tuple — `public-read.ts`'s own rule: *"a consumer needing
different semantics needs its OWN fragment with its own name, ⛔ never a parameter bolted onto one of
these."*

### Trap 3 — ⚠ THE LIST STARTS EMPTY AND FILLS. THAT IS THE CRASH

New-Arch `FlatList` **red-boxes crossing empty → populated in place**
([[project_fabric_flatlist_empty_populated_crash]]) — ⭐ and *"loading, then rows"* is this surface's
**normal** path.

⇒ the **empty / loading / error** states render **OUTSIDE** the list component. ⛔ Never as a
`ListEmptyComponent` swapped in place.

### Trap 4 — ⚠⛔ THE TAB BAR IS HARDCODED ENGLISH, AND THE FOURTH TAB MUST CHOOSE

`_layout.tsx:42,49,56` carry `'My Pool'`, `'Shradhanjali'`, `'Panchayat'` as **literals**, ⛔ not
`t()`-resolved, in a bilingual app. ⛔ **PRE-EXISTING** and ⛔ **not this story's to fix unasked.**

⚠ But the fourth tab must either add a **fourth untranslated title** or be **the one translated title
among four**. ⭐ Choose deliberately and record it; ⛔ do ⛔ not inherit the pattern silently.

### Trap 5 — ⛔ *"MORE THAN THE PUBLIC"* IS A **FLOOR**, ⛔ NOT A LICENCE

`-189` cl.3 sets a minimum. ⛔ It does ⛔ **not** authorise showing a member anything the Panel has
⛔ not ruled public **or** member-visible.

⛔ In particular: ⛔ **no banking coordinates on this LIST** — `-190` cl.3's *"complete banking
information"* is a **per-drive** view and is **story F**. ⛔ And ⛔ no contributor names, ⛔ no per-member
amounts, ⛔ no `spawned` rows, ⛔ no target (story **C** keeps it hidden).

---

## Acceptance Criteria

### AC0 — Governance first
Task 0 annotates `epics.md` (⭐ a **new member surface**, ⛔ not in any epic's story list), flips the
sprint row, and lands in a `governance:` commit before any code.

### AC1 — A FOURTH TAB exists
Joins `index` · `shradhanjali` · `panchayat` — ⭐ a **peer of My Pool**, ⛔ not a route buried inside it
(`-194` cl.2). **And** Trap 4's title decision is made and recorded.

### AC2 — It lists EVERY drive in the member's Pariwar, in the three visible states
`live` · `closed` · `settled` (`-196`). **And** ⛔ `spawned` is **excluded**, with Trap 2's ground in
the code. **And** the predicate is this surface's **OWN fragment** — ⛔ never the public tuple.
**And** it is scoped to the member's **own Pariwar** by the session scope, ⛔ never by a client-supplied
id (family 12).

### AC3 — `member ≥ public`, field by field — per **D1**
For every drive the public index shows, this list shows **at least as much**, ⛔ never less.
**And** the story record states, field by field, how that is satisfied — ⛔ asserted by a **test that
compares the two reads**, ⛔ not by inspection.

### AC4 — The three stages use story B's vocabulary, from story B's shared source
**Live** · **Closed** · **Verified**, ⛔ no second definition (B's AC4). **And** the info affordance is
present, as a **real focusable control** with a **tap** handler and an accessible name — ⛔ never
hover-only.

### AC5 — Family 13, in full
It is a new `[SURFACE]`. ⭐ Every row affordance is announced: a container carrying
`accessibilityLabel` is explicitly `accessible={true}` (⚠ tamagui `<Button>` is `styled(View)` and
supplies it **nowhere**); a role implying interaction has a **real handler**; and every state the ACs
ratify as reachable is **ANNOUNCED**, ⛔ not merely reflected in a prop.

### AC6 — Empty, loading and error render OUTSIDE the list
Per Trap 3. **And** a test drives **empty → populated** and asserts ⛔ no crash — ⭐ the regression this
AC exists to prevent has a name in this repo.

### AC7 — It is virtualized
UX-DR80. **And** the read is **paginated** — ⛔ a Pariwar's whole history is ⛔ not one response.

### AC8 — ⛔ Nothing else moves
⛔ No banking coordinates (**F**) · ⛔ no contributor names · ⛔ no per-member amounts · ⛔ no target
(**C**) · ⛔ no `spawned` · ⛔ no change to `active-contribution` or anything a member owes · ⛔ no
public surface touched.

---

## ⚖️ Decisions

### ✅ D1 — **RULED by BigDev, 2026-09-04 — (c), AND WIDER: the list mirrors the public form, AND My Pool adopts it too.** What NAME FORM does the member's list show?

> ⭐⭐ **THE RULING** (`#decision-2026-09-04-197`): this list shows the Pariwar's **configured** name
> form — whatever a stranger would see for that drive. ⇒ the `-189` cl.3 inversion is **closed**.
> ⭐ **And BigDev went further than (c):** *"My Pool also adopt the same configured presentation mode
> so the member experience is consistent across member surfaces."* ⇒ the divergence is **resolved**,
> ⛔ not merely routed.
>
> ⚠⛔ **BUT THAT HALF IS ⛔ NOT THIS STORY'S WORK — see `-197` follow-up (ii).** `resolvePoolIdentity`
> serves **THREE shipped member surfaces** (`handlers.ts:630`, `:835`,
> `contribution-note.ts:144`). ⇒ ⭐ **story G** carries it, sequenced **before or with** this one so
> the two surfaces ⛔ never disagree. ⛔ Do ⛔ not fold a primary-screen change into a story about a new
> tab.
>
> ⚠⛔ **AND ONE SUB-QUESTION IS ⛔ BLOCKING BOTH** (`-197` follow-up (i)): does the member-facing name
> carry the publication **BASIS** gate, or only the **FORM**? ⛔ Form-plus-basis is a **REGRESSION** —
> a member would see ⛔ nothing on an unconsented drive, where today they always see first-name +
> initial, and the contribution card could ⛔ not say who died. ⭐ **Form-only is recommended**, and it
> must be recorded that on an unconsented drive a member then goes from *"Rajesh K."* to the **full
> legal name** — ⭐ a real widening, ⛔ a decision and ⛔ not a side effect.

⭐ Trap 1: public default = **full name**; the member path hard-codes **first + initial**. ⇒ as things
stand, building this list the obvious way **ships a `-189` cl.3 inversion**.

- **(a) ⭐ MIRROR THE PUBLIC FORM** — the member sees whatever a stranger would for that drive
  (full name where the publication basis is satisfied; shielded where it is not). ⭐ Satisfies cl.3
  exactly. ⚠ But the same member then sees a **fuller name in the LIST than on their own My Pool
  card**, which is internally inconsistent — ⛔ and My Pool is ⛔ not this story's to change.
- **(b) SHIELDED EVERYWHERE** — first + initial, matching My Pool. ⭐ Internally consistent.
  ⛔ **Violates cl.3** on every consented drive. ⚠ Would need the Panel to scope cl.3 away from the
  name field — ⛔ which `-195` cl.1 did ⛔ not do (it scoped cl.3 to the **drive data class**, and a
  deceased member's name on a drive record is squarely inside it).
- **(c) MIRROR THE PUBLIC FORM HERE, AND ROUTE THE MY POOL INCONSISTENCY** — take (a), and record the
  card/list divergence as a **separate** question rather than fixing a shipped surface inside this
  story.

⇒ **AC3 is UNBLOCKED for this story's own read** — ⚠ but the **basis-gate sub-question** must be ruled
before either surface is built, and **story G** must be sequenced first or alongside.

---

## ⚠ What this story does ⛔ NOT do

⛔ ⛔ No banking coordinates on the list — `-190` cl.3 is a **per-drive** view, ⭐ **story F**.
⛔ No change to **My Pool**, `active-contribution`, or anything a member owes (⚠ D1(c) **routes** the
name-form divergence; ⛔ it does ⛔ not fix it here).
⛔ No public surface, ⛔ no target, ⛔ no `spawned`, ⛔ no contributor names, ⛔ no stage word invented
here (**B** owns them), ⛔ no tab-title i18n sweep (Trap 4).

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0) — annotate `epics.md`; flip the sprint row; ⛔ one
      `governance:` commit, ⛔ no code.
- [x] **Task 1 — RULE D1** — ✅ **RULED 2026-09-04** (`-197`): mirror the public **configured** form;
      ⭐ My Pool adopts it too, ⚠ **via story G**, ⛔ not here.
- [x] **Task 1b — RULE THE BASIS-GATE SUB-QUESTION** — ✅ **RULED `-198` cl.1: FORM ONLY.** The member
      name takes the configured **FORM** and ⛔ NOT the publication **BASIS** gate ⇒ a member sees a name
      **always**. ⛔ Unblocked.
- [ ] **Task 2 — The read** (AC2, AC3, AC7) — a member-scoped, **paginated** list over
      `live`+`closed`+`settled`, as this surface's **own** fragment. ⛔ Scope from the session, ⛔ never
      a client-supplied Pariwar id.
- [ ] **Task 3 — The route + contract** (AC2, AC3) — a new `/api/v1/member/…` route beside the four
      existing member-pool routes. ⚠ Its field set is decided by **D1** and by AC3's floor.
- [ ] **Task 4 — The tab** (AC1, AC4, AC5) — the fourth `Tabs.Screen`; Trap 4's title decision;
      B's shared stage copy; the info affordance; ⭐ `accessible={true}` on every labelled container.
- [ ] **Task 5 — The list** (AC6, AC7) — virtualized; ⭐ empty / loading / error render **OUTSIDE** it.
- [ ] **Task 6 — Tests** (AC2, AC3, AC5, AC6) — ⭐ **the `member ≥ public` comparison test is the
      load-bearing one**: seed a drive, read it as the public and as a member, assert the member's
      fields are a **superset**. Plus: `spawned` absent; another Pariwar's drives absent; empty →
      populated does ⛔ not crash; the a11y props are present **and** the containers are accessibility
      elements. ⭐ **Execute them** against `twt-test-pg` `:5433`.
- [ ] **Task 7 — ⛔ Confirm story G has landed or is landing alongside** — ⛔ this list must ⛔ never
      ship a name form the My Pool card contradicts. ⛔ Do ⛔ not fix My Pool here.

---

## Dev Notes

### The load-bearing test is a COMPARISON, not an assertion

⭐ `-189` cl.3 is a **relational** invariant: it is ⛔ not about what this list shows, but about what it
shows **relative to another surface**. ⇒ a test that checks this list's fields in isolation ⛔ cannot
see a violation. **AC3's test must read both surfaces and compare them.**

⚠ That test is also the thing that would have caught `-188` in August.

### Why the name form is the whole difficulty

⭐ Every other field on this list is either already public or already member-visible. **The deceased's
name is the one field where the public path and the member path resolve DIFFERENTLY by construction**
— one through the Pariwar's configured form, one through a hard-coded shielded helper. ⇒ ⛔ they were
⛔ never compared, because ⛔ no surface showed both.

### Testing standards

Live-DB integration for the read and the comparison; RN unit tests for the list states and the a11y
props. ⚠ Assert **membership and explicit values**, ⛔ never counts over the shared fixture.

### References

- `.decision-log.md#decision-2026-09-04-193` cl.2 · `-194` cl.2 · `-196` · `-189` cl.3 · `-195` cl.1
- `packages/contracts/src/public-pages/sahyog-drive.ts:94-96` — the two name forms, side by side
- `apps/mobile/app/(tabs)/_layout.tsx:42,49,56` — the three tabs and their hardcoded titles
- `apps/api/src/modules/member-pool/routes.ts` — the four existing member routes
- **UX-DR80** (`epics.md:504`) — virtualization

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.3 | ✅ **Task 1b CLOSED by `-198` cl.1 (FORM ONLY).** ⛔ Zero open decisions; ⚠ still blocked on **B** and **G** (⭐ G runs first, `-198` cl.2). | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (`-197`)** — mirror the configured form; ⭐ My Pool adopts it too, ⚠ **via a new story G** (it reaches THREE shipped surfaces). ⛔ **Task 1b BLOCKING:** does the member name carry the publication BASIS gate, or only the FORM? ⭐ Form-only recommended — form-plus-basis is a REGRESSION. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **E**). ⚠ **D1 is OPEN.** ⭐⭐ Finding at authoring: **the member currently sees LESS NAME than the public** — public default is `full_name`, the member path hard-codes the shielded form. ⛔ A `-189` cl.3 inversion of the same shape as `-188`, in a different field, ⛔ recorded nowhere until now. | BigDev + Claude |
