---
baseline_commit: 30683cef
---

<!--
⭐ BASELINE — the D1 ruling on story A (`governance(11b.11): D1 RULED`). It carries decisions
`2026-09-04-186` … `-196`, Story 11b.10 closed, the six-story split, and Story 11b.11 `ready-for-dev`.
-->

# Story 11b.12: The Stage Vocabulary — **Live · Closed · Verified** — and the Info Affordance `[SURFACE]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story B** of the six-story split (`2026-09-04-195`
> cl.3), following **Trustee-ratified** `-190` / `-191` / `-193` (Dhiraj Rahul + Kalpana Bharti).
> ⇒ it owes an `epics.md` **ANNOTATION** (Task 0).
>
> ⚠ **INDEPENDENT OF STORY A.** ⛔ Neither blocks the other; they touch different fields. ⭐ Both may
> proceed in parallel. **Stories D and E depend on THIS one** (`-195` cl.3).

## Story

As a visitor or member reading a drive's stage,
I want the three stages named for what they actually are, explained in one place, and worded the same
way on the website and in the app,
so that nobody is told a drive is "Active" when it has finished, or that a family has "not yet been
paid" when they were paid throughout.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **THIS STORY INTRODUCES AND CHANGES ⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT.**
Stated explicitly, ⛔ not omitted.

⭐ It changes **words and one disclosure control**. ⛔ It changes ⛔ no visibility predicate, ⛔ no
eligibility rule, ⛔ no state machine, ⛔ no field tier and ⛔ no listing scope. `-189` cl.3
(*member > public*) is ⛔ **not moved in either direction**: the same three words, from **one source**,
render on both surfaces.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| Index wire tokens: `active` · `archive` | `PublicSahyogDriveStatus` (`sahyog-drive.ts:64`); `SAHYOG_DRIVE_STATUSES` (`public-read.ts:110`) | ⭐ read |
| Drive-page wire tokens: `collecting` · `active` · `archive` | `PublicSahyogVivranStatus` (`sahyog-vivran.ts:75`); `SAHYOG_VIVRAN_STATUSES` | ⭐ read |
| Internal → public maps | `public-read.ts:114-115`; `PUBLIC_STATUS_BY_POOL_STATE` in `sahyog-vivran-read.ts` | ⭐ read |
| ⭐⭐ **The index ALREADY suppresses an EMPTY section** | `sahyog.astro:461` and `:514` — `{sections.active.length > 0 && (…)}` | ⭐ read |
| ⛔⛔ **A shipped test forbids the internal words on the wire** | `sahyog-drive.spec.ts:595-612` — *"the internal word never crosses"*, looping `['spawned','live','closed','settled']` | ⭐ read |
| Copy lives in `packages/i18n`, split per surface | `locales/{en,hi}/sahyog-drive.json` · `sahyog-vivran.json` | ⭐ read |
| ⚠ `t()` defaults to `common` and **THROWS** on a missing key | [[project_missed_cycle_visibility_substrate]] | ⭐ known |
| The drive page **already renders `live` drives** | `SAHYOG_VIVRAN_VISIBLE_POOL_STATES = ['live','closed','settled']` | ⭐ read |

## ⛔ THE FIVE TRAPS

### Trap 1 — ⛔⛔ THE RULED WORDS **COLLIDE WITH A SHIPPED ANTI-LEAK TEST**

`sahyog-drive.spec.ts:595-612` asserts *"the internal lifecycle VOCABULARY must not appear as a VALUE
anywhere on the wire"*, looping **`['spawned', 'live', 'closed', 'settled']`**.

⛔ **Two of the three ruled public words — `Live` and `Closed` — ARE internal lifecycle names.** ⇒ if
the wire tokens adopt them, **that test fails by construction**, and the property it guards
(`2026-08-21-144` cl.8 — `/members` once leaked the internal `lock-in` onto a public route) has ⛔ no
guard left.

⚠⛔ **⛔ Do ⛔ NOT "fix" it by deleting the loop or excepting two words.** ⇒ **D1** rules the shape.

### Trap 2 — ⚠⛔ THE LIVE SITE'S COPY IS FACTUALLY **WRONG**, ⛔ NOT MERELY OLD

Currently rendered to the public, verbatim:

- `section.active.help` — *"The collection window has closed. **The family has not yet been paid.**"*
- `section.archive.help` — *"**Paid out to the family.** Kept here as a permanent record."*

⛔ **Both are false.** `2026-09-04-192` established that the trust **⛔ NEVER disburses** — members pay
the nominee's VPA **directly** (`upi-intent.ts` builds the payment server-side with the nominee as
payee), so the family is paid **THROUGHOUT** a drive. ⇒ these sentences describe a payout step that
⛔ does not exist. ⭐ **This story is the one that removes them from a live public page.**

### Trap 3 — ⛔ `-194` cl.1 IS **ALREADY SATISFIED**. ⛔ DO NOT BUILD IT

*"The Verified section renders ⛔ only when it has rows"* — `sahyog.astro:461` / `:514` **already**
guard both sections with `.length > 0`. ⇒ the rename inherits the behaviour.
⛔ Do ⛔ **not** add a second guard, and ⛔ do not report this clause as newly implemented. ⭐ Record it
as **satisfied by construction**, ⛔ and pin it with a test so a future refactor cannot quietly drop it.

### Trap 4 — ⚠⛔ HOVER IS ⛔ NOT AN AFFORDANCE, AND THE PUBLIC PAGE HAS ⛔ NO CLIENT SCRIPT

`-192` follow-ups, both binding:

- The public page's own standing rule is that it is **server-rendered and must work with ⛔ no client
  script**. ⇒ a JS tooltip is ⛔ **not acceptable** there. ⭐ A native `<details>`/`<summary>`
  disclosure is.
- **Family 13 check (c)** — *a role implying interaction has a real handler*. ⇒ an *"i"* must be a
  **real focusable control** with an accessible name and a **click/tap** handler. ⛔ Hover-only is
  unreachable by keyboard **and by touch**, and most members are on phones.
- ⚠ On mobile, a tamagui `<Button>` is `styled(View)` and `@tamagui/web` sets `accessible` **nowhere**
  ⇒ it needs an explicit `accessible={true}` (the 11b.10 review finding, same epic).

### Trap 5 — ⛔ ⛔ ONE SOURCE, ⛔ NOT TWO — AND THIS TRAP IS WHY

`-193` cl.3 rules **ONE shared copy source** for the stage vocabulary, web and app. ⭐ BigDev's ground,
adopted into the ruling: **two sources is exactly how *"Active"* came to mean two different things.**
⛔ Do ⛔ not add a parallel key set in `apps/mobile`. ⚠ And ⛔ do ⛔ **not** create a new package for it
([[feedback_no_premature_package]]) — `packages/i18n` is already consumed by both.

---

## Acceptance Criteria

### AC0 — The governance is transcribed BEFORE any code

**Given** this story implements `-190` cl.5, `-191` cl.3, `-192` cl.1/3, `-193` cl.1/3 and records
`-194` cl.1 as already satisfied
**Then** Task 0 writes the `epics.md` annotation and flips the sprint row in a `governance:` commit
**And** ⛔ no code lands before it ([[feedback_governance_commits_precede_implementation]]).

### AC1 — The three stages are named **Live · Closed · Verified**, everywhere

**Given** `-190` cl.5, `-191` cl.3, `-193` cl.1
**Then** the public index and the public drive page render **Live**, **Closed**, **Verified** in both
locales
**And** ⛔ *"Active"*, *"Collecting"* and *"Archive"* appear ⛔ **nowhere** in any user-facing string on
either surface — asserted by a test over the copy files, ⛔ not by inspection
**And** the member app renders the **same three words from the same source** (AC4)
**And** ⚠ *"Collecting"* is retired on the **register** ground recorded verbatim at `-190` cl.5(b) —
*"like Trust is collector"* — ⛔ not as a synonym swap. ⛔ Do not reintroduce any word that casts the
trust as the party collecting.

### AC2 — The false payout copy is GONE

**Given** Trap 2 and `-192`
**Then** ⛔ no user-facing string on either surface states or implies that the trust pays the family, or
that a family *"has not yet been paid"* at any stage
**And** the replacement copy says what the stages actually mean — contributions **open** / contributions
**finished, being checked** / **every contribution checked against bank records**
**And** a test asserts the strings *"not yet been paid"* and *"Paid out"* are absent from both locales
of both surfaces.

### AC3 — The info affordance exists, and it is REACHABLE

**Given** `-192` cl.3 and Trap 4
**Then** each surface carries an *"i"* control that reveals the meaning of all three stages
**And** on the **public** page it works with ⛔ **no client script** — a native `<details>`/`<summary>`
disclosure or equivalent in-DOM text
**And** on **both** surfaces it is a **real focusable control** with an accessible name and a
**click/tap** handler — ⛔ never hover-only
**And** the mobile control carries an explicit `accessible={true}`
**And** it explains **Verified** even though ⛔ no drive can currently be in that stage (AC6).

### AC4 — ONE shared copy source

**Given** `-193` cl.3
**Then** the three stage names and their explanations live in **exactly one** keyed set, consumed by
`apps/public` **and** `apps/mobile`
**And** ⛔ there is ⛔ no second definition anywhere — asserted by a test, ⛔ not by convention
**And** ⛔ ⛔ no new package is created (Trap 5).

### AC5 — The wire-token / anti-leak collision is resolved as **D1** rules

**Given** Trap 1
**Then** D1's ruling is implemented, and `sahyog-drive.spec.ts:595-612`'s guarded property — *no
un-ruled internal vocabulary crosses as a value* — is **still enforced by a test**
**And** ⛔ the loop is ⛔ not deleted and ⛔ not weakened to accommodate the collision; if it changes
shape, the replacement asserts **at least as much**
**And** the change is stated where the old assertion was, naming what it used to check.

### AC6 — `-194` cl.1 is recorded SATISFIED, and PINNED

**Given** Trap 3 — `sahyog.astro:461` / `:514` already guard on `.length > 0`
**Then** the story records it as **satisfied by construction**, ⛔ not as newly built
**And** a test asserts an empty stage section renders ⛔ **no heading, no caption and no table** — so a
future refactor cannot drop the guard silently
**And** ⛔ ⛔ no second guard is added.

### AC7 — ⛔ Nothing else moves

**Then** ⛔ no field tier, ⛔ no listing predicate, ⛔ no state machine, ⛔ no rate limit, ⛔ no masking
behaviour and ⛔ no bank field changes
**And** ⛔ `live` is ⛔ **NOT** added to the public index — ⭐ that is **story D**
**And** ⛔ the meter, the target and any member list are untouched — ⭐ stories **C/D/E**.

---

## ⚖️ Decisions

### ✅ D1 — **RULED (b) by BigDev, 2026-09-04: ALIGN THE WIRE, ALLOW-LIST THE TEST.** Do the WIRE TOKENS adopt the ruled words, or only the DISPLAY copy?

> ⭐⭐ **THE RULING.** The wire tokens become **`live` · `closed` · `verified`** on both surfaces, and
> `sahyog-drive.spec.ts:595-612` is **re-shaped from a DENY-list to an ALLOW-list**: it asserts the
> status value is **exactly one of the ruled public set**, and that ⛔ no **other** internal token
> appears anywhere in the body. ⭐ Strictly stronger than the current assertion — it pins what IS
> allowed instead of enumerating four things that are not.
>
> ⚠⛔ **AND THE OVERLAP MUST BE EXPLAINED WHERE THE ASSERTION LIVES.** `live` and `closed` now appear
> on the wire as **deliberate, RULED public vocabulary** that happens to coincide with internal state
> names. ⛔ Without that note a future reader reads the overlap as **exactly the defect
> `2026-08-21-144` cl.8 recorded** (`/members` leaking internal `lock-in`) and "fixes" it by reverting.
> ⇒ name cl.8, name the coincidence, and state that it is ruled.
>
> ⚠ `spawned` remains a **pure deny** — it is ⛔ not in the public set and must ⛔ never cross.

⭐ **The collision (Trap 1):** `Live` and `Closed` are simultaneously the **ruled public words** and
**internal lifecycle state names**, and a shipped test asserts the internal names never cross as wire
values.

- **(a) DISPLAY ONLY.** Wire keeps `active` / `archive` / `collecting`; only the rendered copy changes.
  ⭐ The leak test passes untouched. ⛔ **But the wire then says `active` for a drive labelled
  "Closed"** — re-creating, one layer down, the exact word-means-its-opposite trap this story exists to
  remove. ⚠ A developer reading `status: 'active'` would be misled precisely as this project's own
  documents were.
- **(b) ⭐ ALIGN THE WIRE**, tokens → `live` / `closed` / `verified`, **and re-shape the leak test** from
  *"these four words are absent"* to *"the status value is exactly one of the ruled public set, and no
  **other** internal token appears anywhere"*. ⭐ That is **strictly stronger** than the current
  assertion — it pins an allow-list rather than a deny-list — and it keeps `2026-08-21-144` cl.8's real
  property: ⛔ no **un-ruled** internal vocabulary leaks.

⭐ **BigDev's recommendation: (b).** The property worth protecting is *"the public vocabulary is
deliberate and ruled"*, ⛔ not *"these particular four strings never appear"*. ⚠ Under (b) the
coincidence is **deliberate and ruled**, ⛔ not a leak — and the story must say so where the assertion
lives, or a future reader will read the overlap as the defect `-144` cl.8 recorded.

⇒ **Tasks 2-5 are UNBLOCKED.** ⚠ The change still touches two Zod enums, both status maps, the render
layers, the copy keys and a live-DB test — ⛔ land them in one commit, since a half-renamed vocabulary
is worse than either end state.

---

## ⚠ What this story does ⛔ NOT do

- ⛔ It does ⛔ **NOT** add `live` drives to the public index — ⭐ **story D**. ⚠ The drive **page**
  already renders `live` drives, so this story's `collecting` → **Live** rename **is** live-affecting
  there today; the **index** is untouched.
- ⛔ It does ⛔ not build the meter, the target, or any member list (**C / D / E**).
- ⛔ It does ⛔ not touch the bank fields (**story A**), any tier, or any listing predicate.
- ⛔ It does ⛔ not change the state machine, and ⛔ does ⛔ not make `settled` reachable — ⚠ `pool.settled`
  still has ⛔ **no production producer**, which is why AC3 requires the affordance to explain a stage
  ⛔ nothing can currently be in.

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0)
  - [ ] Annotate `epics.md`: story B of the `-195` cl.3 split; implements `-190` cl.5, `-191` cl.3,
        `-192` cl.1/3, `-193` cl.1/3; records `-194` cl.1 satisfied by construction.
  - [ ] Flip `sprint-status.yaml` `11b-12-…`: `ready-for-dev` → `in-progress`, with a ledger entry.
  - [ ] Commit with a `governance:` prefix. ⛔ No code.
- [x] **Task 1 — RULE D1** (blocked Tasks 2-5) — ✅ **RULED (b) by BigDev, 2026-09-04: align the wire
      (`live` · `closed` · `verified`), and re-shape the anti-leak test into an ALLOW-list.** ⇒ Tasks
      2-5 unblocked; ⛔ `spawned` stays a pure deny.
- [ ] **Task 2 — The shared copy source** (AC4, AC1, AC2)
  - [ ] Create ONE keyed stage set in `packages/i18n` — the three names plus one explanation each,
        `en` + `hi`. ⛔ No new package (Trap 5).
  - [ ] ⚠ Decide and record where it sits relative to the existing per-surface files. ⭐ It is consumed
        by three surfaces, so it belongs in neither `sahyog-drive.json` nor `sahyog-vivran.json` alone.
  - [ ] Delete `status.collecting` / `status.active` / `status.archive` and the two false
        `section.*.help` strings from **both** surfaces, **both** locales.
  - [ ] ⚠ `t()` **THROWS** on a missing key — every locale changes in the **same commit**.
- [ ] **Task 3 — The wire + the maps** (AC1, AC5; shape per D1)
  - [ ] `PublicSahyogDriveStatus` / `PublicSahyogVivranStatus`; `SAHYOG_DRIVE_STATUSES` /
        `SAHYOG_VIVRAN_STATUSES`; `public-read.ts:114-115` and `PUBLIC_STATUS_BY_POOL_STATE`.
  - [ ] Amend the doc-blocks that state the old vocabulary. ⛔ Amend and NAME the previous value,
        ⛔ do not silently overwrite.
- [ ] **Task 4 — The public render + info affordance** (AC1, AC2, AC3, AC6)
  - [ ] `sahyog.astro` section headings/help; `[driveToken].astro` status label.
  - [ ] Add the `<details>`/`<summary>` stage explainer. ⛔ No client script (Trap 4).
  - [ ] ⛔ Do ⛔ NOT touch the `.length > 0` guards at `:461` / `:514` (Trap 3).
- [ ] **Task 5 — The member app** (AC1, AC3, AC4)
  - [ ] Render the same three words from the shared source wherever a stage appears.
  - [ ] Add the tappable *"i"* — a real control, accessible name, `accessible={true}` (Trap 4).
- [ ] **Task 6 — The tests** (AC1, AC2, AC5, AC6)
  - [ ] Copy test: *"Active"* / *"Collecting"* / *"Archive"* absent from both locales of both surfaces.
  - [ ] Copy test: *"not yet been paid"* / *"Paid out"* absent (AC2).
  - [ ] Copy test: exactly ONE definition of the stage set (AC4).
  - [ ] Amend `sahyog-drive.spec.ts:595-612` per D1, preserving at least as much (AC5).
  - [ ] New: an empty stage section renders ⛔ no heading, ⛔ no caption, ⛔ no table (AC6).
  - [ ] ⭐ **Execute them** against `twt-test-pg` on `:5433` — ⛔ *"written but not run"* is ⛔ not
        attested; that exact gap shipped a red spec at 11b.10.

---

## Dev Notes

### Why this story is small in code and large in consequence

⭐ Almost every line here is a **string**. ⚠ But two of the strings it deletes are **currently telling
the public something false about where their money goes** (Trap 2), and the vocabulary it fixes is the
one that let *"Active"* mean *finished* on a live site for months.

⇒ ⛔ Do ⛔ not treat it as a copy pass. **AC2 is the reason it is not last in the split.**

### The one genuinely hard part

**D1.** Everything else is mechanical. D1 decides whether the wire agrees with the words a human reads
— and getting it wrong reproduces the original defect one layer down, where ⛔ no Trustee will ever see
it. ⭐ Read Trap 1 before starting.

### Testing standards

Copy assertions are **unit** tests over the locale JSON (the `sahyog-drive-link-a11y.test.ts` pattern:
read the file, assert on its keys). ⚠ Wire-token assertions are **live-DB**
(`apps/api/tests/integration/public-pages/`). Astro templates are ⛔ not unit-testable — use the house
**source-scan** pattern, and state its limitation rather than glossing it.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.5 — Closed, and why *"Collecting"* is retired
- `.decision-log.md#decision-2026-09-04-191` cl.3 — the three words
- `.decision-log.md#decision-2026-09-04-192` cl.1, cl.3 — *Verified* = reconciled; the affordance
- `.decision-log.md#decision-2026-09-04-193` cl.1, cl.3 — confirmed; ONE shared source
- `.decision-log.md#decision-2026-09-04-194` cl.1 — the empty section (⭐ already satisfied)
- `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:595-612` — the anti-leak loop
- `apps/public/src/pages/sahyog.astro:461,514` — the existing `.length > 0` guards
- `packages/i18n/locales/en/sahyog-drive.json:4-7,41-42` · `sahyog-vivran.json:13-15` — the copy

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `2026-09-04-195` cl.3 (story **B**). ⚠ **D1 is OPEN and blocks Tasks 2-5.** ⭐ Two findings at authoring: `-194` cl.1 is **already satisfied** by the existing `.length > 0` guards, and the ruled words **collide with a shipped anti-leak test**. | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (b) — align the wire, allow-list the test.** Task 1 closed, Tasks 2-5 unblocked. ⚠ The overlap with internal names must be EXPLAINED where the assertion lives, or it reads as the `-144` cl.8 defect. | BigDev + Claude |
