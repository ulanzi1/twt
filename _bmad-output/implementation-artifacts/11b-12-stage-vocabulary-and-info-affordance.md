---
baseline_commit: 054ff76a
---

<!--
⭐ BASELINE RE-POINTED 2026-09-05, from `30683cef` (the D1 ruling on story A) to `054ff76a`.
⚠⛔ THE RE-POINT IS LOAD-BEARING, ⛔ not housekeeping. **Story A (11b.11) HAS LANDED** in the five
commits between the two SHAs, and it rewrote SIX of the files this story edits (see "Story A has
landed", below). Every line number in this file is verified against `054ff76a`.
-->

# Story 11b.12: The Stage Vocabulary — **Live · Closed · Verified** — and the Info Affordance `[SURFACE]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story B** of the six-story split (`2026-09-04-195`
> cl.3), following **Trustee-ratified** `-190` / `-191` / `-193` (Dhiraj Rahul + Kalpana Bharti).
> ⇒ it owes an `epics.md` **ANNOTATION** (Task 0).
>
> ⚠ **DECISION-INDEPENDENT OF STORY A, ⛔ NOT FILE-INDEPENDENT.** ⭐ Neither story's *rulings* bind the
> other — they touch different **fields**. ⛔ But they touch the **same files**, and **A has already
> landed**. ⇒ read the next section before opening anything.
>
> ⭐ **Stories D and E depend on THIS one** (`-195` cl.3).

## ⛔⛔ STORY A HAS LANDED — read this before the coordinate table

The five commits `05bb7531 … 054ff76a` shipped 11b.11. They rewrote **six files this story edits**:

| File this story edits | Story A's churn | Consequence here |
|---|---|---|
| `packages/contracts/src/public-pages/sahyog-vivran.ts` | +188 | ⚠ `PublicSahyogVivranStatus` **moved `:75` → `:88`** |
| `packages/domain/src/pool/sahyog-vivran-read.ts` | +240 | the map and its doc-block moved |
| `apps/public/src/pages/sahyog-vivran/[driveToken].astro` | +193 | Task 4's file |
| `apps/public/src/lib/sahyog-vivran-render.ts` | +135 | ⭐ Task 4's **render layer** (Trap 7) |
| `packages/i18n/locales/{en,hi}/sahyog-vivran.json` | +17 each | Task 2's copy |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | +239 | Task 6 must re-run it |

⇒ ⛔ **Do ⛔ not trust a remembered line number.** ⚠ This is the [[feedback_story_validate_footguns]]
sibling-story class: a split sibling rules on your files **by line number**, and a `--name-only`
baseline check is blind to it. ⭐ Re-`grep` each symbol before editing.

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

⚠ **The wire-token rename (D1) is ⛔ NOT a predicate change either.** `PUBLIC_STATUS_BY_POOL_STATE` is
a **total** map on an unchanged domain: the same pool states in, the same rows out, different labels.
⛔ No row's visibility moves. ⭐ Stated because a diff touching two Zod enums and two status maps
**looks** like an eligibility change and is not.

## 🎯 What already EXISTS — ⭐ verified live at `054ff76a`, ⛔ not assumed

| Fact | Where (verified at `054ff76a`) | Verified |
|---|---|---|
| Index wire tokens: `active` · `archive` | `PublicSahyogDriveStatus` (`contracts/src/public-pages/sahyog-drive.ts:64`); `SAHYOG_DRIVE_STATUSES` (`domain/src/pool/public-read.ts:110`) | ⭐ read |
| Drive-page wire tokens: `collecting` · `active` · `archive` | `PublicSahyogVivranStatus` (`contracts/src/public-pages/sahyog-vivran.ts:88` — ⚠ **⛔ not `:75`**) | ⭐ read |
| ⚠ `SAHYOG_VIVRAN_STATUSES` is in **domain**, ⛔ not contracts | `domain/src/pool/sahyog-vivran-read.ts:151` | ⭐ read |
| Internal → public maps | `public-read.ts:113-116`; `PUBLIC_STATUS_BY_POOL_STATE` at `sahyog-vivran-read.ts:154-158` | ⭐ read |
| ⭐⭐ **The index ALREADY suppresses an EMPTY section** | `sahyog.astro:461` and `:514` — `{sections.active.length > 0 && (…)}` | ⭐ read |
| ⛔⛔ **THREE places assert the internal words never cross** | Trap 1 — ⛔ the story used to name only one | ⭐ read |
| Copy lives in `packages/i18n`, split per surface | `locales/{en,hi}/sahyog-drive.json` · `sahyog-vivran.json` | ⭐ read |
| ⚠ A **new** locale file needs FIVE hand-edits in `catalog.ts` | Trap 6 | ⭐ read |
| ⚠ `t()` defaults to `common` and **THROWS** on a missing key | [[project_missed_cycle_visibility_substrate]] | ⭐ known |
| The drive page **already renders `live` drives** | `SAHYOG_VIVRAN_VISIBLE_POOL_STATES = ['live','closed','settled']` (`sahyog-vivran-read.ts:141`) | ⭐ read |
| ⛔ **The member app renders ⛔ NO stage at all** | Trap 5 — `driveStatus` appears ⛔ nowhere in `apps/mobile` | ⭐ read |
| ⛔ Neither public page has ⛔ any `<script>` | `grep '<script'` over both `.astro` files ⇒ ⛔ zero hits | ⭐ read |
| ⛔ `apps/public` has ⛔ NO existing `<details>` | Trap 4 — this story is the first adopter | ⭐ read |
| `packages/i18n` is already a dep of **both** apps | `apps/mobile/package.json:34` — `"@twt/i18n": "workspace:*"` | ⭐ read |

---

## ⛔ THE NINE TRAPS

### Trap 1 — ⛔⛔ THE RULED WORDS COLLIDE WITH **THREE** SHIPPED ASSERTIONS, ⛔ NOT ONE

⚠ **Two of the three ruled public words — `Live` and `Closed` — ARE internal lifecycle names.** Three
separate places in the tree assert that those names never cross the public boundary. **All three break
under D1(b), and all three are this story's to fix.**

| # | Site | Shape | What D1(b) does to it |
|---|---|---|---|
| **1** | `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:595-612` | live-DB test; loops `['spawned','live','closed','settled']` over the response VALUES | ⛔ **RED** — `closed` / `verified` are now legitimate index values |
| **2** | `packages/contracts/tests/public-pages-sahyog-vivran.test.ts:155-165` | unit test; asserts `PublicSahyogVivranEntry` **REJECTS** each of the same four as `driveStatus` | ⛔ **RED** — two of the four must now PARSE |
| **3** | `packages/domain/src/pool/sahyog-vivran-read.ts:144-150` | ⚠ a **doc-block**, ⛔ not a test: *"⭐ THE WIRE TOKEN IS ⛔ NEVER THE INTERNAL ONE … `spawned` / `live` / `closed` / `settled` must never cross this boundary."* | ⛔ **FALSE as written** — ⛔ no gate catches it |

⚠⛔ **Site 3 is the dangerous one.** ⛔ It is not a stale *vocabulary* — it is a stale **RULE**, stated
as an invariant, that D1(b) **partially reverses**. Nothing goes red when it rots. ⇒ it must be
amended in the **same commit**, and the amendment must **name the previous rule** it replaces
([[feedback_supersede_never_reinterpret]] — ⛔ amend and name, ⛔ never silently overwrite).

⚠⛔ **⛔ Do ⛔ NOT "fix" any of the three by deleting the loop or excepting two words.** ⇒ **D1** rules
the shape, and it applies to **all three sites**.

### Trap 2 — ⚠⛔ THE LIVE SITE'S COPY IS FACTUALLY **WRONG**, ⛔ NOT MERELY OLD — AND THERE ARE **THREE** STRINGS, ⛔ NOT TWO

Currently rendered to the public, verbatim, `locales/en/sahyog-drive.json`:

- `:5` `section.active.help` — *"The collection window has closed. **The family has not yet been paid.**"*
- `:7` `section.archive.help` — *"**Paid out to the family.** Kept here as a permanent record."*
- ⭐⭐ `:3` `page.intro` — *"… Drives that are **still to be paid out** appear under Active; those
  **already paid out** appear under Archive. Drives still collecting are not listed."*

⛔ **All three are false.** `2026-09-04-192` established that the trust **⛔ NEVER disburses** — members
pay the nominee's VPA **directly** (`upi-intent.ts` builds the payment server-side with the nominee as
payee), so the family is paid **THROUGHOUT** a drive. ⇒ these sentences describe a payout step that
⛔ does not exist. ⭐ **This story is the one that removes them from a live public page.**

⚠⛔ **AND `page.intro` IS THE ONE A NAIVE TEST MISSES.** It says *"still to be **paid out**"* and
*"already **paid out**"* — ⛔ **neither** matches the literal `"not yet been paid"` nor a
**case-sensitive** `"Paid out"`. ⇒ AC2's assertion must be **case-insensitive** and match the
**payout concept**, ⛔ not two remembered sentences. ⭐ `page.intro` also carries **all three retired
words** (*Active*, *Archive*, *collecting*) in one sentence — it is AC1's largest single edit as well.

⚠ Both locales. `locales/hi/sahyog-drive.json:3` carries the identical falsehood
(*"जिन अभियानों का भुगतान अभी होना है …"*).

### Trap 3 — ⛔ `-194` cl.1 IS **ALREADY SATISFIED**. ⛔ DO NOT BUILD IT

*"The Verified section renders ⛔ only when it has rows"* — `sahyog.astro:461` / `:514` **already**
guard both sections with `.length > 0`. ⇒ the rename inherits the behaviour.
⛔ Do ⛔ **not** add a second guard, and ⛔ do not report this clause as newly implemented. ⭐ Record it
as **satisfied by construction**, ⛔ and pin it with a test so a future refactor cannot quietly drop it.

### Trap 4 — ⚠⛔ HOVER IS ⛔ NOT AN AFFORDANCE, AND THE PUBLIC PAGE HAS ⛔ NO CLIENT SCRIPT

`-192` follow-ups, both binding:

- The public page's own standing rule is that it is **server-rendered and must work with ⛔ no client
  script**. ⭐ **Verified**: `grep '<script'` over `sahyog.astro` and `[driveToken].astro` returns
  ⛔ **zero** hits. ⚠ (`apps/public/tests/sahyog-vivran-client.test.ts` is about the **SSR-side fetch
  client**, ⛔ not browser JS — ⛔ do not read it as precedent for shipping script.) ⇒ a JS tooltip is
  ⛔ **not acceptable** there. ⭐ A native `<details>`/`<summary>` disclosure is.
- ⚠⭐ **⛔ THERE IS ⛔ NO `<details>` ANYWHERE IN `apps/public` TODAY** — this story is the first
  adopter. ⇒ it owes the **marker reset** (`summary::-webkit-details-marker`/`list-style: none`) and
  an explicit focus-visible ring, or it ships a browser-default triangle and an invisible focus state
  onto a designed page. ⛔ Do not assume a house pattern exists; **establish** one and say so.
- **Family 13 check (c)** — *a role implying interaction has a real handler*. ⇒ an *"i"* must be a
  **real focusable control** with an accessible name and a **click/tap** handler. ⛔ Hover-only is
  unreachable by keyboard **and by touch**, and most members are on phones.
- ⚠ On mobile, a tamagui `<Button>` is `styled(View)` and `@tamagui/web` sets `accessible` **nowhere**
  ⇒ it needs an explicit `accessible={true}` (the 11b.10 review finding, same epic).

### Trap 5 — ⛔⛔ THE MEMBER APP HAS ⛔ NO STAGE SURFACE — AND **STORY E ALREADY OWNS BUILDING ONE**

⭐ **Verified**: `driveStatus` appears **⛔ nowhere** in `apps/mobile`.
`components/sahyog-vivran/SahyogVivranEntry.tsx` is a **link-out card** (11b.10) — it renders a route
to the public page and ⛔ **no stage**. ⇒ **there is nowhere in the app for a stage word to go.**

⛔⛔ **AND STORY E CLAIMS THE SAME WORK.** `11b-15` **AC4**: *"The three stages use story B's
vocabulary, from story B's shared source … **And the info affordance is present**, as a real focusable
control with a tap handler and an accessible name"* — ordered by its **Task 4**. ⚠ And `11b-15`'s
banner reads **"⛔ BLOCKED ON B"**.

⇒ ⭐ **THE SPLIT IS SCOPED AS FOLLOWS, AND THIS IS THE RULING THAT RESOLVES THE LOOP:**

- ⭐ **B (this story) ships the SOURCE.** The shared keyed stage set, in `packages/i18n`, importable by
  both apps, plus a test that it is the **only** definition. ⛔ **B renders ⛔ NOTHING in `apps/mobile`.**
- ⭐ **E consumes it**, on the fourth-tab drive list **E itself creates** — the first place in the app
  where a stage exists at all.

⚠⛔ ⇒ ⛔ **Do ⛔ NOT invent a mobile stage surface here.** ⛔ Do ⛔ not add a stage to
`SahyogVivranEntry.tsx`. That is **story E's scope**, and building it here would deliver an unratified
surface under a copy story. ⭐ This is [[feedback_circular_deferral_between_sibling_stories]]: B and E
each read as though the other does it, and ⛔ no per-story pass can see the loop.

### Trap 6 — ⚠⛔ A **NEW** LOCALE NAMESPACE COSTS FIVE HAND-EDITS, AND THE FAILURE MODE IS A PRODUCTION 500

Task 2 must decide **where** the shared set lives. ⚠ If the answer is a **new file**
(`locales/{en,hi}/<name>.json`), `packages/i18n/src/catalog.ts` needs **five** hand-edits:
`:42`-style `en` import · `:57`-style `hi` import · the `en` map entry `:66` · the `hi` map entry `:67`
· the `KNOWN_NAMESPACES` array `:71`.

⛔⛔ **THE PARITY GATE ⛔ DOES ⛔ NOT CATCH THE OMISSION.** `packages/i18n/tests/catalog-registration.test.ts`
records the defect verbatim: Story 11a.2 shipped `locales/{en,hi}/members.json` and `members.astro`
calling `t(…, { namespace: 'members' })` **without registering it** ⇒ `/members` **threw on EVERY
REQUEST on `main`**, with `i18n:check-parity` **green**, and ⛔ no test caught it. ⭐ That invariant is
now mechanized in `catalog-registration.test.ts` — ⛔ **run it.**

⭐ **The cheaper answer, if it fits:** add the keys to one of the **two existing** registered
namespaces and have the other surface read from it cross-namespace. ⚠ Whichever is chosen, **record
the reason in the Dev Agent Record** — Task 2 leaves this open deliberately.

⭐ `packages/i18n/tests/parity.test.ts` backs Task 2's *"every locale in the same commit"*. ⇒ ⛔ do not
hand-verify it.

### Trap 7 — ⛔ THE `.astro` FILES ARE ⛔ NOT THE RENDER LAYER

⚠ Both pages **delegate label construction to a presenter**, per the house pattern
([[project_contribution_row_render_layer_substrate]]). ⇒ editing only the `.astro` files leaves the
vocabulary half-renamed:

| File | The retired vocabulary in it |
|---|---|
| `apps/public/src/lib/sahyog-render.ts` | `tableCaptionActive:102` · `sectionActiveTitle:104` · `sectionArchiveTitle:105` · `statusActive:122` · `statusArchive:123` · ⚠ the ternary at **`:296`** — `row.status === 'archive' ? statusArchive : statusActive` |
| `apps/public/src/lib/sahyog-vivran-render.ts` | `statusLabel` switch **`:238-252`** (`case 'collecting'` / `'active'` / `'archive'`) · `isCollecting: drive.driveStatus === 'collecting'` **`:348`** |
| `apps/public/src/lib/sahyog-vivran.server.ts` | **`:191`** — a runtime guard, `r['driveStatus'] !== 'collecting'` |
| `apps/public/src/lib/surface-fields.ts` | **`:458`** — a doc comment stating the old three tokens |

⭐ **The LABEL FIELD NAMES themselves encode the retired words** (`statusActive`, `sectionArchiveTitle`,
`collectingTitle`, …). ⚠ **⛔ Renaming those fields is ⛔ OUT OF SCOPE** — see D3. ⭐ The **typecheck is
your friend** here: `sahyog-render.ts:296` compares `row.status` to `'archive'`, so once the enum
narrows to `['closed','verified']` TypeScript errors on the non-overlapping literal. ⇒ ⛔ do not silence
it; fix the comparison.

### Trap 8 — ⛔ SIX SHIPPED TEST FILES PIN THE OLD COPY

⚠ Task 6 lists **new** tests. These **existing** files go red and are ⛔ not optional:

| File | What breaks |
|---|---|
| `apps/public/tests/sahyog-copy.test.ts:29,31,33,45,46` | requires `page.intro`, both `section.*.help`, both `status.*` to **exist** |
| `apps/public/tests/sahyog-vivran-copy.test.ts:40,43,44,127` | requires `status.collecting`, `collecting.title`, `collecting.body` to **exist** |
| `apps/public/tests/sahyog-render.test.ts:32,34,35,46,47,165,188` | fixtures assert `'Active'` / `'Archive'` / `driveStatus: 'Active'` |
| `apps/public/tests/sahyog-vivran-render.test.ts:40,41,88,157` | fixtures assert `'Active'` / `'Archive'` / `driveStatus: 'collecting'` |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts:106,802-803,814-815,1092-1093` | ⚠ **rewritten by story A** — re-read before editing |
| `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:582` | the `['live','collecting']` state→token pairs |

### Trap 9 — ⛔ ⛔ ONE SOURCE, ⛔ NOT TWO — AND THIS TRAP IS WHY

`-193` cl.3 rules **ONE shared copy source** for the stage vocabulary, web and app. ⭐ BigDev's ground,
adopted into the ruling: **two sources is exactly how *"Active"* came to mean two different things.**
⛔ Do ⛔ not add a parallel key set in `apps/mobile`. ⚠ And ⛔ do ⛔ **not** create a new package for it
([[feedback_no_premature_package]]) — `packages/i18n` is already consumed by both
(`apps/mobile/package.json:34`), so a second consumer does ⛔ not justify an extraction that already
has its home.

⚠⛔ **AND THE SPLIT MAKES THIS TRAP LIVE, ⛔ NOT THEORETICAL.** Story **E** must render these words in
the app (Trap 5). ⇒ the cheapest thing E can do, if this story leaves the key path unrecorded, is mint
its own — **recreating the exact two-source defect** `-193` cl.3 exists to close, one epic later.
⭐ That is why Task 5's last subtask writes the key path **into `11b-15` by name**.

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
**And** ⛔ *"Active"*, *"Collecting"* and *"Archive"* appear ⛔ **nowhere** in any user-facing **string
value** on either surface — asserted by a test over the copy files, ⛔ not by inspection
**And** ⛔ the assertion is **SCOPED to the `sahyog-drive` and `sahyog-vivran` namespaces**. ⚠⛔ A
repo-wide ban would false-fail on `locales/*/members.json`, where **"Active"** is the ratified
**member-lifecycle** label and ⛔ has nothing to do with drives — ⛔ do ⛔ not widen it, and ⛔ do ⛔ not
"fix" `members.json`
**And** ⚠ the ban is on **rendered values**, ⛔ not on JSON **key names** — see **D3**
**And** the shared source is importable by the member app (AC4), ⚠ which renders ⛔ nothing here (Trap 5)
**And** ⚠ *"Collecting"* is retired on the **register** ground recorded verbatim at `-190` cl.5(b) —
*"like Trust is collector"* — ⛔ not as a synonym swap. ⛔ Do not reintroduce any word that casts the
trust as the party collecting.

### AC2 — The false payout copy is GONE — ⭐ all **THREE** strings

**Given** Trap 2 and `-192`
**Then** ⛔ no user-facing string on either surface states or implies that the trust pays the family, or
that a family *"has not yet been paid"* at any stage
**And** the three named strings are corrected: `sahyog-drive.json` `:3` `page.intro`, `:5`
`section.active.help`, `:7` `section.archive.help` — ⭐ **both locales**
**And** the replacement copy says what the stages actually mean — contributions **open** / contributions
**finished, being checked** / **every contribution checked against bank records**
**And** ⭐ the test matches the **payout CONCEPT, ⛔ case-insensitively** — at minimum
`/not yet been paid/i`, `/paid out/i`, `/to be paid/i` — ⛔ **NOT** the two literal sentences.
⚠⛔ A case-sensitive `"Paid out"` check passes while `page.intro`'s *"already paid out"* stays live;
that ⛔ exact miss is why this clause is written this way
**And** ⚠ `outcome.under_funded` is ⛔ **NOT** in scope here — it is **D2**, open and non-blocking.

### AC3 — The info affordance exists, and it is REACHABLE

**Given** `-192` cl.3 and Trap 4
**Then** the **public** surface carries an *"i"* control that reveals the meaning of all three stages
**And** it works with ⛔ **no client script** — a native `<details>`/`<summary>` disclosure or
equivalent in-DOM text
**And** it is a **real focusable control** with an accessible name and a **click/tap** handler — ⛔ never
hover-only
**And** ⭐ it carries the **marker reset and a visible focus ring** — ⛔ there is ⛔ no `<details>`
precedent in `apps/public` to inherit (Trap 4)
**And** it explains **Verified** even though ⛔ no drive can currently be in that stage (AC6)
**And** ⚠ the **member-app** affordance is **⛔ NOT built here** — the app has ⛔ no stage surface;
it is `11b-15` **AC4 / Task 4** (Trap 5). ⭐ This story supplies the **copy it will consume**, and the
`accessible={true}` requirement is recorded there, ⛔ not discharged here.

### AC4 — ONE shared copy source

**Given** `-193` cl.3
**Then** the three stage names and their explanations live in **exactly one** keyed set in
`packages/i18n`, **resolvable by `apps/public` and `apps/mobile` alike**
**And** ⛔ there is ⛔ no second definition anywhere — asserted by a test, ⛔ not by convention
**And** ⭐ if it is a **new namespace**, `catalog.ts` is updated in the **same commit** and
`catalog-registration.test.ts` is **executed** (Trap 6)
**And** ⛔ ⛔ no new package is created (Trap 9)
**And** ⚠ *"consumed by both"* is satisfied by **resolvability**, ⛔ not by a mobile render — ⛔ ⛔ no
`apps/mobile` component changes in this story (Trap 5).

### AC5 — The wire-token / anti-leak collision is resolved as **D1** rules — at **ALL THREE** sites

**Given** Trap 1
**Then** D1's ruling is implemented at **all three** sites in Trap 1's table, and the guarded property
— *no **un-ruled** internal vocabulary crosses as a value* — is **still enforced by a test**
**And** ⛔ neither loop is ⛔ deleted and ⛔ neither is weakened to accommodate the collision; where one
changes shape, the replacement asserts **at least as much**
**And** the doc-block at `sahyog-vivran-read.ts:144-150` is **amended and NAMES the rule it replaces**
— ⛔ it is a stale **rule**, ⛔ not a stale vocabulary, and ⛔ no gate catches it
**And** the overlap is explained **at each of the three sites**: naming `2026-08-21-144` cl.8, naming
the coincidence, and stating that it is **ruled**
**And** ⭐ `spawned` remains a **pure deny** at all three.

### AC6 — `-194` cl.1 is recorded SATISFIED, and PINNED

**Given** Trap 3 — `sahyog.astro:461` / `:514` already guard on `.length > 0`
**Then** the story records it as **satisfied by construction**, ⛔ not as newly built
**And** a test asserts an empty stage section renders ⛔ **no heading, no caption and no table** — so a
future refactor cannot drop the guard silently
**And** ⛔ ⛔ no second guard is added.

### AC7 — ⛔ Nothing else moves

**Then** ⛔ no field tier, ⛔ no listing predicate, ⛔ no state machine, ⛔ no rate limit, ⛔ no masking
behaviour and ⛔ no bank field changes
**And** ⛔ `live` is ⛔ **NOT** added to the **public index** enum — ⭐ that is **story D**. ⚠ The index
enum stays **TWO members** (`['closed','verified']`); see **D1's mapping table**
**And** ⛔ the meter, the target and any member list are untouched — ⭐ stories **C/D/E**
**And** ⛔ ⛔ no label FIELD is renamed (**D3**), and ⛔ ⛔ no `apps/mobile` component changes (Trap 5).

### AC8 — The friction budget is DISPOSED, ⛔ not skipped

**Given** [[project_friction_budget_baseline_ratchet]] — AC-4 diffs **COMMITTED** history, and
`git push` runs full `ci:local` via the pre-push hook
**Then** this story records its friction-budget disposition **explicitly**, as 11b.1 / 11b.10 / 11b.11
each did
**And** ⚠ the disposition is written **after** the implementation commits exist — ⛔ a declaration
written against an empty diff passes **vacuously**, which is the defect `57778f72` demonstrated live
and `7fe540f9` fixed.

---

## ⚖️ Decisions

### ✅ D1 — **RULED (b) by BigDev, 2026-09-04: ALIGN THE WIRE, ALLOW-LIST THE TEST.** Do the WIRE TOKENS adopt the ruled words, or only the DISPLAY copy?

> ⭐⭐ **THE RULING.** The wire tokens become **`live` · `closed` · `verified`**, and every anti-leak
> assertion is **re-shaped from a DENY-list to an ALLOW-list**: it asserts the status value is
> **exactly one of the ruled public set for that surface**, and that ⛔ no **other** internal token
> appears anywhere in the body. ⭐ Strictly stronger than the current assertion — it pins what IS
> allowed instead of enumerating four things that are not.
>
> ⚠⛔ **AND THE OVERLAP MUST BE EXPLAINED WHERE EACH ASSERTION LIVES.** `live` and `closed` now appear
> on the wire as **deliberate, RULED public vocabulary** that happens to coincide with internal state
> names. ⛔ Without that note a future reader reads the overlap as **exactly the defect
> `2026-08-21-144` cl.8 recorded** (`/members` leaking internal `lock-in`) and "fixes" it by reverting.
> ⇒ name cl.8, name the coincidence, and state that it is ruled — at **all three** Trap 1 sites.
>
> ⚠ `spawned` remains a **pure deny** — it is ⛔ not in the public set and must ⛔ never cross.

#### ⭐⭐ D1's MAPPING TABLE — ⛔ THE ENUMS ARE ⛔ NOT THE SAME SIZE

⚠⛔ **"Both surfaces" means both surfaces adopt the ruled VOCABULARY — ⛔ NOT that both get three
members.** The index does ⛔ not list `live` (AC7; that is **story D**), so its enum stays **TWO**.
⛔ Adding a third would mint a public token with ⛔ no producer.

| Surface | Pool state | Wire token BEFORE | Wire token AFTER | Rendered word |
|---|---|---|---|---|
| **Index** (`sahyog-drive`) | `closed` | `active` | **`closed`** | **Closed** |
| **Index** | `settled` | `archive` | **`verified`** | **Verified** |
| **Index** | `live` | ⛔ *not listed* | ⛔ **still not listed — story D** | — |
| **Drive page** (`sahyog-vivran`) | `live` | `collecting` | **`live`** | **Live** |
| **Drive page** | `closed` | `active` | **`closed`** | **Closed** |
| **Drive page** | `settled` | `archive` | **`verified`** | **Verified** |

⇒ `PublicSahyogDriveStatus` / `SAHYOG_DRIVE_STATUSES` = `['closed','verified']` (**2**).
⇒ `PublicSahyogVivranStatus` / `SAHYOG_VIVRAN_STATUSES` = `['live','closed','verified']` (**3**).

⚠⛔ **AND BOTH MAPS BECOME PART-IDENTITY.** After the rename, `live→'live'` and `closed→'closed'` map a
state to itself; only `settled→'verified'` does not. ⇒ a future reader will read
`PUBLIC_STATUS_BY_POOL_STATE` as a **no-op and delete it**, silently re-fusing the internal state to
the wire token and losing the boundary the map exists to hold. ⭐ **Pin that at the map**: the
coincidence is ruled, ⛔ the map is ⛔ not redundant, and `spawned` proves it — an internal state with
⛔ no public token at all.

⭐ **The collision (Trap 1):** `Live` and `Closed` are simultaneously the **ruled public words** and
**internal lifecycle state names**, and three shipped assertions say the internal names never cross.

- **(a) DISPLAY ONLY.** Wire keeps `active` / `archive` / `collecting`; only the rendered copy changes.
  ⭐ The leak tests pass untouched. ⛔ **But the wire then says `active` for a drive labelled
  "Closed"** — re-creating, one layer down, the exact word-means-its-opposite trap this story exists to
  remove. ⚠ A developer reading `status: 'active'` would be misled precisely as this project's own
  documents were.
- **(b) ⭐ ALIGN THE WIRE** and re-shape the leak assertions from *"these four words are absent"* to
  *"the status value is exactly one of the ruled public set, and no **other** internal token appears
  anywhere"*. ⭐ **Strictly stronger** — an allow-list rather than a deny-list — and it keeps
  `2026-08-21-144` cl.8's real property: ⛔ no **un-ruled** internal vocabulary leaks.

⭐ **BigDev's recommendation: (b).** The property worth protecting is *"the public vocabulary is
deliberate and ruled"*, ⛔ not *"these particular four strings never appear"*.

⇒ **Tasks 2-6 are UNBLOCKED.** ⚠ The change touches two Zod enums, both status maps, four render-layer
files, the copy keys, three anti-leak sites and six shipped test files — ⛔ land them in **one commit**,
since a half-renamed vocabulary is worse than either end state.

### 🟡 D2 — **OPEN. ⛔ NON-BLOCKING — ROUTED TO THE PANEL 2026-09-05.** Does `outcome.under_funded` violate AC2?

> ⭐ **ROUTING NOTE WRITTEN:**
> `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md`
> ✅⭐ **(Q1) ANSWERED — Trustee-ratified (DR + KB), 2026-09-05: *"Trust doesn't make any commitment
> to the family."*** ⇒ **the line GOES.**
> ⏳ **(Q2) OPEN — five wordings proposed at the note's §7, awaiting the Panel's pick.**
> ⛔ Do ⛔ not touch the string until a wording is ratified. ⚠ Still **NON-BLOCKING** for Tasks 2-7.
>
> ⚠⛔ **AND WHEN IT LANDS IT MAY REACH `outcome.fully_funded` TOO** — §7's option 5 puts the SAME line
> on the met-in-full and fell-short branches, because three different sentences ARE the funding verdict
> `classifyCycleOutcome` exists to quarantine. ⛔ Not this story's to assume; ⭐ recorded so it is not
> re-derived.

`locales/en/sahyog-drive.json:44` — **`outcome.under_funded`**:
> *"The cycle closed. **The trust met its commitment to the family.**"*

⚠⛔ **AND THE ROUTING RESEARCH MADE IT SHARPER THAN "AMBIGUOUS COPY".** ⭐ Verified at the producer,
⛔ not read off the words: `close-of-cycle/framing.ts:159` emits `under_funded` ⟺
**`deliveredTotal < expectedTotal`**. ⇒ the page asserts *"the trust met its commitment"* **precisely
on the branch that means LESS than expected was delivered**, and `2026-09-04-192` establishes the trust
**⛔ never disburses** at all.

⭐ **Three further facts, all checked:**
- ⛔ The sentence is **author-written copy from Story 11b.1** (`4598ad70`) — ⛔ **never ratified**,
  ⛔ never routed. The phrase appears in ⛔ **no** decision, ⛔ no PRD line and ⛔ no epic
  ([[feedback_negative_claims_checkable_in_repo]] — a checked negative, ⛔ not an assumption).
- ⚠ **The same enum's MEMBER-facing copy tells the opposite story** —
  `close-of-cycle.json:5`: *"{N} colleagues stood together; {amount} reached {family}'s family."*
  ⇒ **members** deliver, and the trust is ⛔ not the actor. Two copy families, one enum.
- ⚠ `2026-09-04-189` **consequence 6** already names this class: *"an outcome of members paying,
  ⛔ never a guarantee the trust can make"* — insurance-shaped language, routed to counsel.
  ⛔ This string predates that analysis and was ⛔ never checked against it.

- **(a)** It means the trust **made up the shortfall** ⇒ ⛔ **FALSE** per `-192`; it must be rewritten,
  and AC2's scope widens to a fourth string.
- **(b)** It means the **coverage guarantee** was honoured ⇒ true, but reads as (a) to a lay visitor
  ⇒ reword for clarity **without** deciding what the trust promises.
- **(c)** Out of scope for this story — record the disposition so it is ⛔ not re-filed later.

⛔⛔ **WHY THIS IS ROUTED AND ⛔ NOT DECIDED HERE.** Which reading is correct is a fact about **what the
trust actually commits to** — ⛔ a policy question, ⛔ not a copy call. ⭐ A copy story silently
rewriting a statement of the trust's obligation would be exactly the reinterpretation
[[feedback_supersede_never_reinterpret]] forbids. ⚠ And the string is on **one of this story's two
surfaces**, so it cannot simply be ignored — it is **recorded open**, ⛔ not dropped.

⇒ ⭐ **D2 does ⛔ NOT block Tasks 2-6.** AC2 explicitly excludes it. ⛔ Do ⛔ not touch
`outcome.under_funded` in this story.

### ✅ D3 — **RULED by BigDev, 2026-09-05: THE BAN IS ON RENDERED VALUES, ⛔ NOT ON KEY NAMES.**

> ⭐ **THE RULING.** AC1 governs **user-facing string values**. ⛔ JSON **key names** and TypeScript
> **label field names** are ⛔ **NOT** user-facing and are ⛔ **NOT** renamed by this story.
>
> ⇒ `collecting.title` and `collecting.body` **keep their key names**; ⭐ their **copy is rewritten**
> so the word *"Collecting"* ⛔ no longer renders:
>
> | Key (unchanged) | Rendered value BEFORE | Rendered value AFTER |
> |---|---|---|
> | `sahyog-vivran.json:16` `collecting.title` | *"This drive is still collecting"* | *"This drive is **Live**"* |
> | `sahyog-vivran.json:17` `collecting.body` | *"The final outcome will appear here once the collection window closes and reconciliation settles. …"* | *"**Contributions are open.** The final outcome will appear here once the collection window closes and reconciliation settles. …"* |
>
> ⚠ Both locales — `locales/hi/sahyog-vivran.json:16-17` carries the same two strings.
>
> ⛔ Likewise `statusActive` / `statusArchive` / `sectionArchiveTitle` / `collectingTitle` / `isCollecting`
> **keep their names** (Trap 7). ⛔ Renaming them is ⛔ **out of scope** — it is pure churn across four
> render-layer files and six test files, in a commit that is already the largest in the split.

⚠⛔ **THE COST, STATED HONESTLY SO IT IS ⛔ NOT REDISCOVERED AS A DEFECT.** After this story the code
says `collecting` where the wire says `live` and the page says **Live** — ⛔ the same code/word
divergence D1(b) rejected one layer up. ⭐ **That is a knowing, ruled trade**, ⛔ not an oversight.
⇒ leave a one-line note at `collecting.title` in **both** locale files and at
`sahyog-vivran-render.ts:348` saying so, ⛔ so the next reader does ⛔ not "fix" it and ⛔ does not
re-file it. ⭐ A follow-up rename is a **tidy-up story**, ⛔ never a silent edit here.

⭐ **Why (b) and not a full rename:** AC1's stated ground is the **register** — `-190` cl.5(b),
*"like Trust is collector"*. ⚠ A key name is read by developers, ⛔ never by a member, so it ⛔ cannot
cast the trust as anything to anyone. ⇒ the ruling tracks the ground the Trustees actually gave.

---

## ⚠ What this story does ⛔ NOT do

- ⛔ It does ⛔ **NOT** add `live` drives to the public index, ⛔ nor a third member to the index enum —
  ⭐ **story D**. ⚠ The drive **page** already renders `live` drives, so this story's
  `collecting` → **Live** rename **is** live-affecting there today; the **index** is untouched.
- ⛔ It does ⛔ **NOT** render anything in `apps/mobile` — ⭐ the app has ⛔ no stage surface, and
  **story E** builds the one that will consume this story's copy (**Trap 5**).
- ⛔ It does ⛔ not build the meter, the target, or any member list (**C / D / E**).
- ⛔ It does ⛔ not touch the bank fields (**story A**), any tier, or any listing predicate.
- ⛔ It does ⛔ not rename any JSON key or label field (**D3**).
- ⛔ It does ⛔ not touch `outcome.under_funded` (**D2**, open).
- ⛔ It does ⛔ not widen the AC1 copy assertion beyond the two sahyog namespaces — ⭐ `members.json`'s
  *"Active"* is the ratified **member-lifecycle** label and is ⛔ **correct** (AC1).
- ⛔ It does ⛔ not change the state machine, and ⛔ does ⛔ not make `settled` reachable — ⚠ `pool.settled`
  still has ⛔ **no production producer**, which is why AC3 requires the affordance to explain a stage
  ⛔ nothing can currently be in.
- ⛔ It does ⛔ not extend `scripts/sahyog-vivran-financial-truth/check.ts`'s `SCAN_FILES` — ⭐ see the
  disposition in Dev Notes. ⚠ Recorded because that gate levies a documented **per-story scope tax**;
  ⛔ an unrecorded non-payment is indistinguishable from a forgotten one.

---

## 🗺️ Files this story touches

⭐ **The complete blast radius.** ⛔ Nothing outside this table changes.

| # | File | Change | AC |
|---|---|---|---|
| 1 | `_bmad-output/planning-artifacts/epics.md` | the story-B annotation | AC0 |
| 2 | `_bmad-output/implementation-artifacts/sprint-status.yaml` | `ready-for-dev` → `in-progress` + ledger | AC0 |
| 3 | `packages/i18n/locales/{en,hi}/sahyog-drive.json` | `page.intro` `:3`, `section.*.help` `:5,:7`, `status.*` `:41-42` | AC1, AC2 |
| 4 | `packages/i18n/locales/{en,hi}/sahyog-vivran.json` | `status.*` `:13-15`, `collecting.title/body` `:16-17` (⭐ **values only**, D3) | AC1, AC2 |
| 5 | `packages/i18n/locales/…` + `packages/i18n/src/catalog.ts` | ⚠ **only if** a new namespace — five hand-edits (Trap 6) | AC4 |
| 6 | `packages/contracts/src/public-pages/sahyog-drive.ts:64` | enum → `['closed','verified']` (**2**) | AC5, AC7 |
| 7 | `packages/contracts/src/public-pages/sahyog-vivran.ts:88` | enum → `['live','closed','verified']` (**3**) | AC5 |
| 8 | `packages/domain/src/pool/public-read.ts:110,113-116,488` | tokens + map + the `:488` doc-comment | AC5 |
| 9 | `packages/domain/src/pool/sahyog-vivran-read.ts:144-158` | tokens + map + ⭐ **the stale RULE at `:144-150`** | AC5 |
| 10 | `apps/public/src/lib/sahyog-render.ts:102,104-105,122-123,296` | labels + the `:296` ternary (Trap 7) | AC1 |
| 11 | `apps/public/src/lib/sahyog-vivran-render.ts:238-252,348` | the `statusLabel` switch + `isCollecting` (Trap 7) | AC1 |
| 12 | `apps/public/src/lib/sahyog-vivran.server.ts:191` | the `!== 'collecting'` runtime guard | AC1 |
| 13 | `apps/public/src/lib/surface-fields.ts:458` | the doc comment stating the old tokens | AC5 |
| 14 | `apps/public/src/pages/sahyog.astro` | headings/help + the `<details>` explainer. ⛔ **NOT** `:461`/`:514` | AC1, AC2, AC3 |
| 15 | `apps/public/src/pages/sahyog-vivran/[driveToken].astro:127,130-131,374-375` | status label + the explainer | AC1, AC3 |
| 16 | `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:595-612` | ⭐ allow-list re-shape **+ the cl.8 note** | AC5 |
| 17 | `packages/contracts/tests/public-pages-sahyog-vivran.test.ts:155-165` | ⭐ allow-list re-shape **+ the cl.8 note** | AC5 |
| 18 | the six files in **Trap 8** | fixtures/assertions that pin the old copy | AC1, AC2 |
| 19 | `friction-budget.md` | the disposition, ⚠ **after** the code commits | AC8 |

⛔ **⛔ NOT touched:** ⛔ any `apps/mobile` file (Trap 5) · ⛔ `sahyog.astro:461`/`:514` (Trap 3) ·
⛔ `outcome.under_funded` (D2) · ⛔ any key or field NAME (D3) · ⛔ `locales/*/members.json` (AC1) ·
⛔ `scripts/sahyog-vivran-financial-truth/` (Dev Notes).

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0)
  - [ ] Annotate `epics.md`: story B of the `-195` cl.3 split; implements `-190` cl.5, `-191` cl.3,
        `-192` cl.1/3, `-193` cl.1/3; records `-194` cl.1 satisfied by construction; ⭐ records **D2
        OPEN** and ⭐ records that the **member-app render is story E's**, ⛔ not deferred work.
  - [ ] Flip `sprint-status.yaml` `11b-12-…`: `ready-for-dev` → `in-progress`, with a ledger entry.
  - [ ] Commit with a `governance:` prefix. ⛔ No code.
- [x] **Task 1 — RULE D1** — ✅ **RULED (b) by BigDev, 2026-09-04: align the wire
      (`live` · `closed` · `verified`), and re-shape the anti-leak assertions into ALLOW-lists.**
      ⭐ Extended 2026-09-05 with the **mapping table** (⛔ the index enum stays **TWO** members) and
      with **all three** Trap 1 sites. ⇒ Tasks 2-6 unblocked; ⛔ `spawned` stays a pure deny.
- [ ] **Task 2 — The shared copy source** (AC4, AC1, AC2, AC3)
  - [ ] ⚠ **DECIDE FIRST, and record the reason in the Dev Agent Record**: does the shared stage set go
        in a **new** namespace, or into one of the two existing registered ones? ⭐ Trap 6 prices both.
  - [ ] Create ONE keyed stage set — three names + one explanation each + the affordance's label,
        `en` + `hi`. ⛔ No new package (Trap 9).
  - [ ] ⭐ **If a new namespace**: all five `catalog.ts` edits (`:42`, `:57`, `:66`, `:67`, `:71`) in
        **this same commit**, then **run** `packages/i18n/tests/catalog-registration.test.ts`.
        ⛔ A green parity gate proves ⛔ nothing here (Trap 6).
  - [ ] Rewrite `sahyog-drive.json` `:3` `page.intro`, `:5` / `:7` `section.*.help`; delete
        `status.active` / `status.archive` `:41-42`. ⭐ **Both locales.**
  - [ ] Rewrite `sahyog-vivran.json` `:13-15` `status.*`; ⭐ **rewrite the VALUES of** `:16-17`
        `collecting.title` / `collecting.body` — ⛔ **keep the key names** (**D3**), and leave the
        one-line note D3 requires.
  - [ ] ⛔ Do ⛔ **NOT** touch `outcome.under_funded` `:44` (**D2**).
  - [ ] ⚠ `t()` **THROWS** on a missing key — every locale changes in the **same commit**;
        `packages/i18n/tests/parity.test.ts` backs this, ⛔ do not hand-verify.
- [ ] **Task 3 — The wire + the maps** (AC1, AC5, AC7; shape per **D1's mapping table**)
  - [ ] `PublicSahyogDriveStatus` (`sahyog-drive.ts:64`) → **`['closed','verified']`** — ⛔ **TWO**
        members. ⛔ Do ⛔ NOT add `live` (AC7 — story D).
  - [ ] `PublicSahyogVivranStatus` (`sahyog-vivran.ts:88` — ⚠ ⛔ **not `:75`**) →
        **`['live','closed','verified']`**.
  - [ ] `SAHYOG_DRIVE_STATUSES` + map (`public-read.ts:110,113-116`);
        `SAHYOG_VIVRAN_STATUSES` + map (`sahyog-vivran-read.ts:151,154-158`).
  - [ ] ⭐ **Pin the part-identity** at both maps — ⛔ the map is ⛔ not a no-op; `spawned` proves it
        (D1's mapping table).
  - [ ] Amend the doc-blocks that state the old vocabulary: `public-read.ts:488`,
        `surface-fields.ts:458`. ⛔ Amend and NAME the previous value, ⛔ do not silently overwrite.
- [ ] **Task 4 — The public render + info affordance** (AC1, AC2, AC3, AC6)
  - [ ] ⭐ **The render layer, ⛔ not just the `.astro` files** (Trap 7): `sahyog-render.ts`
        `:102,:104-105,:122-123` and ⚠ **the `:296` ternary**; `sahyog-vivran-render.ts` the
        `statusLabel` switch `:238-252` and `isCollecting` `:348`; `sahyog-vivran.server.ts:191`.
        ⛔ Do ⛔ NOT rename the fields (**D3**).
  - [ ] `sahyog.astro` section headings/help; `[driveToken].astro:127,130-131,374-375` status label.
  - [ ] Add the `<details>`/`<summary>` stage explainer to both pages. ⛔ No client script (Trap 4).
  - [ ] ⭐ **First `<details>` in `apps/public`** — ship the marker reset **and** a visible focus ring
        (Trap 4). ⛔ There is ⛔ no house pattern to inherit; establish one and say so.
  - [ ] ⛔ Do ⛔ NOT touch the `.length > 0` guards at `sahyog.astro:461` / `:514` (Trap 3).
- [ ] **Task 5 — ⛔ NO MOBILE RENDER. Hand off to story E instead.** (AC4, AC3)
  - [ ] ⭐ **Verify** the shared set **resolves** from `apps/mobile` — ⛔ a resolution test, ⛔ **not** a
        rendered component. `packages/i18n` is already a mobile dep (`apps/mobile/package.json:34`).
  - [ ] ⛔ ⛔ Change ⛔ **NO** `apps/mobile` component. ⛔ Do ⛔ not add a stage to
        `SahyogVivranEntry.tsx` — ⚠ it is a link-out card and the app has ⛔ no stage surface (Trap 5).
  - [ ] ⭐ Record in `11b-15`'s story file, at **AC4/Task 4**, the exact key path this story shipped —
        ⛔ so story E consumes it by name and ⛔ does ⛔ not mint a second definition.
- [ ] **Task 6 — The tests** (AC1, AC2, AC5, AC6)
  - [ ] Copy test: *"Active"* / *"Collecting"* / *"Archive"* absent from both locales of the **two
        sahyog namespaces**. ⛔ Do ⛔ NOT widen it repo-wide — `members.json` would false-fail (AC1).
  - [ ] Copy test: `/not yet been paid/i`, `/paid out/i`, `/to be paid/i` absent — ⭐ **case-insensitive
        and concept-shaped** (AC2, Trap 2). ⛔ Not the two literal sentences.
  - [ ] Copy test: exactly ONE definition of the stage set (AC4).
  - [ ] ⭐ **Re-shape ALL THREE Trap 1 sites** per D1 — `sahyog-drive.spec.ts:595-612`,
        `public-pages-sahyog-vivran.test.ts:155-165`, and the **doc-block** at
        `sahyog-vivran-read.ts:144-150` — each preserving at least as much, each carrying the cl.8
        note (AC5).
  - [ ] ⭐ **Repair the six shipped files in Trap 8** — they pin the old copy and go red. ⛔ Repair the
        fixtures; ⛔ do ⛔ not weaken the assertions.
  - [ ] New: an empty stage section renders ⛔ no heading, ⛔ no caption, ⛔ no table (AC6).
  - [ ] ⭐ **Execute them** against `twt-test-pg` on `:5433` — ⛔ *"written but not run"* is ⛔ not
        attested; that exact gap shipped a red spec at 11b.10. ⭐ Run `catalog-registration.test.ts`
        and `parity.test.ts` explicitly (Trap 6).
- [ ] **Task 7 — The friction-budget disposition** (AC8)
  - [ ] ⚠ **AFTER** Tasks 2-6 are committed — ⛔ a declaration written against an empty diff passes
        **vacuously** ([[project_friction_budget_baseline_ratchet]]; demonstrated at `57778f72`,
        fixed at `7fe540f9`).
  - [ ] Record the disposition in `friction-budget.md`, as 11b.1 / 11b.10 / 11b.11 each did.

---

## Dev Notes

### Why this story is small in code and large in consequence

⭐ Almost every line here is a **string**. ⚠ But **three** of the strings it deletes are **currently
telling the public something false about where their money goes** (Trap 2), and the vocabulary it
fixes is the one that let *"Active"* mean *finished* on a live site for months.

⇒ ⛔ Do ⛔ not treat it as a copy pass. **AC2 is the reason it is not last in the split.**

### The two genuinely hard parts

1. **D1's blast radius.** The ruling itself is settled; what is easy to get wrong is that it lands in
   **three** anti-leak sites, **four** render-layer files and **six** shipped test files — ⛔ none of
   which are the `.astro` files the story's title suggests. ⭐ Work the **Files this story touches**
   table, ⛔ not the file names in your head.
2. **The index enum stays TWO members.** ⭐ Read D1's mapping table before touching
   `PublicSahyogDriveStatus`. ⚠ *"Both surfaces adopt the vocabulary"* ⛔ does ⛔ not mean *"both enums
   get three members"* — adding `live` to the index mints a public token with ⛔ no producer and
   breaches AC7.

### The financial-truth gate — ⭐ scope tax DISPOSED, ⛔ not skipped

`scripts/sahyog-vivran-financial-truth/check.ts` levies a documented **per-story `SCAN_FILES` tax**
(*"⛔ a gate that does not cover the new surface silently under-protects"*).

⭐ **This story owes ⛔ NOTHING.** It adds ⛔ **no** new `.ts`/`.tsx`/`.astro` file to the Sahyog Vivran
read path — it edits files **already** in `SCAN_FILES` (`[driveToken].astro` is at `check.ts:68`), and
its only new artifact is a `.json` locale file, which the gate's `isCandidateExt` (`check.ts:121`)
⛔ does not scan. ⇒ ⛔ **do ⛔ not extend `SCAN_FILES`** — [[project_access_wrapper_gate_pending_scope]],
*know when ⛔ NOT to extend*. ⚠ Recorded explicitly because an unpaid tax and an **inapplicable** one
look identical in a diff.

### Testing standards

Copy assertions are **unit** tests over the locale JSON (the `sahyog-drive-link-a11y.test.ts` pattern:
read the file, assert on its keys). ⚠ Wire-token assertions are **live-DB**
(`apps/api/tests/integration/public-pages/`) — ⛔ except `public-pages-sahyog-vivran.test.ts`, which is
a **contracts unit** test asserting the Zod shape directly. Astro templates are ⛔ not unit-testable —
use the house **source-scan** pattern, and state its limitation rather than glossing it.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.5 — Closed, and why *"Collecting"* is retired
- `.decision-log.md#decision-2026-09-04-191` cl.3 — the three words
- `.decision-log.md#decision-2026-09-04-192` cl.1, cl.3 — *Verified* = reconciled; the affordance
- `.decision-log.md#decision-2026-09-04-193` cl.1, cl.3 — confirmed; ONE shared source
- `.decision-log.md#decision-2026-09-04-194` cl.1 — the empty section (⭐ already satisfied)
- `.decision-log.md#decision-2026-08-21-144` cl.8 — the `/members` `lock-in` leak D1 preserves
- `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:595-612` — anti-leak site **1**
- `packages/contracts/tests/public-pages-sahyog-vivran.test.ts:155-165` — anti-leak site **2**
- `packages/domain/src/pool/sahyog-vivran-read.ts:144-150` — anti-leak site **3** (⚠ a doc-block)
- `packages/i18n/tests/catalog-registration.test.ts` — the `/members` 500 that Trap 6 prevents
- `apps/public/src/pages/sahyog.astro:461,514` — the existing `.length > 0` guards
- `packages/i18n/locales/en/sahyog-drive.json:3,5,7,41-42` · `sahyog-vivran.json:13-17` — the copy
- `_bmad-output/implementation-artifacts/11b-15-…md` AC4 / Task 4 — where the **mobile** render lives

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
| 2026-09-05 | 0.3 | ⭐ **Validation pass — six critical corrections.** Baseline re-pointed `30683cef` → `054ff76a`: **story A has landed** and rewrote six of this story's files (`PublicSahyogVivranStatus` moved `:75` → `:88`). The anti-leak collision is **THREE** sites, ⛔ not one — including a **doc-block stating a stale RULE** that ⛔ no gate catches. **D1 gains a mapping table**: the index enum stays **TWO** members, resolving its contradiction with AC7. **Trap 2 gains a third false string** — `page.intro` — which AC2's literal, case-sensitive assertion would have **missed**. **Task 5 inverted**: `apps/mobile` has ⛔ no stage surface and **story E owns building one** — B ships the source, ⛔ renders nothing. New: Trap 6 (`catalog.ts`'s five hand-edits), Trap 7 (the render layer the `.astro` files delegate to), Trap 8 (six shipped test files that go red), AC8 + Task 7 (the friction-budget disposition), and a **Files this story touches** table. | BigDev + Claude |
| 2026-09-05 | 0.4 | ✅ **D3 RULED — the ban is on rendered VALUES, ⛔ not key names.** `collecting.title`/`.body` keep their keys, their copy is rewritten. ⚠ The resulting code/word divergence is a **knowing, ruled trade** and is noted at the call sites so it is ⛔ not "fixed" or re-filed. 🟡 **D2 OPENED and ROUTED, ⛔ non-blocking** — `outcome.under_funded`'s *"the trust met its commitment"* may imply a disbursement `-192` says never happens; ⛔ a copy story has ⛔ no authority to decide what the trust promises. | BigDev + Claude |
