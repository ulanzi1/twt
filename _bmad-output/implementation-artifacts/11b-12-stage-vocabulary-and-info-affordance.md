---
baseline_commit: 31153962
---

<!--
⭐ BASELINE RE-POINTED TWICE. `30683cef` (the D1 ruling on story A) → `054ff76a` → `31153962`.

⚠⛔ THE FIRST RE-POINT WAS LOAD-BEARING, ⛔ not housekeeping. **Story A (11b.11) HAS LANDED** in the
five commits `05bb7531 … 054ff76a`, and it rewrote SIX of the files this story edits (see "Story A
has landed", below).

⭐ THE SECOND RE-POINT IS GOVERNANCE-ONLY, AND THAT IS STATED SO IT IS ⛔ NOT RE-VERIFIED. The
thirteen commits `f06bbad6 … 31153962` touched ⛔ **NO code file** — all seven changed paths are under
`_bmad-output/`. ⇒ ⭐ every line number in this file is verified against the tree at `31153962`, and
the `054ff76a` verification carries forward unchanged.

⚠⛔ BUT TWO SIBLING STORY FILES MOVED IN THAT WINDOW, AND ONE NOW DEPENDS ON THIS STORY:
`11b-14` (+86 — a **new AC7 + Task 8** that renders this story's `{nominee_name}` token) and
`11b-15` (+17 — the reciprocal note). ⇒ see **AC9** and **Task 2b**.
-->

# Story 11b.12: The Stage Vocabulary — **Live · Closed · Verified** — and the Info Affordance `[SURFACE]`

Status: review

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

## 🎯 What already EXISTS — ⭐ verified live at `31153962`, ⛔ not assumed

| Fact | Where (verified at `31153962`) | Verified |
|---|---|---|
| Index wire tokens: `active` · `archive` | `PublicSahyogDriveStatus` (`contracts/src/public-pages/sahyog-drive.ts:64`); `SAHYOG_DRIVE_STATUSES` (`domain/src/pool/public-read.ts:110`) | ⭐ read |
| Drive-page wire tokens: `collecting` · `active` · `archive` | `PublicSahyogVivranStatus` (`contracts/src/public-pages/sahyog-vivran.ts:88` — ⚠ **⛔ not `:75`**) | ⭐ read |
| ⚠ `SAHYOG_VIVRAN_STATUSES` is in **domain**, ⛔ not contracts | `domain/src/pool/sahyog-vivran-read.ts:151` | ⭐ read |
| Internal → public maps | `public-read.ts:113-116`; `PUBLIC_STATUS_BY_POOL_STATE` at `sahyog-vivran-read.ts:154-158` | ⭐ read |
| ⭐⭐ **The index ALREADY suppresses an EMPTY section** | `sahyog.astro:461` and `:514` — `{sections.active.length > 0 && (…)}` | ⭐ read |
| ⛔⛔ **NINE places assert the internal words never cross** | Trap 1 — ⚠ the story has undercounted this **twice** (one, then three) | ⭐ read |
| ⛔⛔ **BOTH public pages guard the status against a LITERAL SET at runtime** | ⚠ `sahyog.server.ts:202` (**index**) and `sahyog-vivran.server.ts:191-193` (drive page) — ⛔ the failure arm is the **OUTAGE** state | ⭐ read |
| ⛔⛔ **The index SECTION PARTITION branches on the wire token** | `sahyog-render.ts:338` — `if (item.status === 'archive')`, ⛔ **not** the `:296` label ternary | ⭐ read |
| ⚠ **The funding verdict is gated on the wire token** | `sahyog-vivran-read.ts:478` — `status === 'collecting'` suppresses `classifyCycleOutcome` | ⭐ read |
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

### Trap 1 — ⛔⛔ THE RULED WORDS COLLIDE WITH **NINE** SHIPPED ASSERTIONS, ⛔ NOT THREE

⚠ **Two of the three ruled public words — `Live` and `Closed` — ARE internal lifecycle names.** Nine
separate places in the tree assert that those names never cross the public boundary. **All nine are
this story's to fix.**

⚠⛔ **THIS COUNT HAS BEEN WRONG TWICE — first *"one"*, then *"three"*.** ⇒ ⛔ do ⛔ not trust it either;
the reproducible way to re-derive it is `grep -rn "never cross" --include="*.ts" --include="*.astro"
packages/*/src packages/*/tests apps/*/src apps/*/tests` plus `grep -rn "2026-08-21-144"`. ⭐ Run both
before you start, and ⛔ exclude `dist/` (untracked build output).

#### (i) ⛔ RULE sites — a **doc-block**, ⛔ not a test. ⛔ NOTHING GOES RED WHEN THESE ROT

⚠⛔ **These are the dangerous ones.** ⛔ They are not stale *vocabulary* — they are stale **RULES**,
stated as invariants, that D1(b) **partially reverses**. ⇒ each must be amended in the **same commit**,
and each amendment must **name the previous rule** it replaces ([[feedback_supersede_never_reinterpret]]
— ⛔ amend and name, ⛔ never silently overwrite).

| # | Site | What it says | What D1(b) does to it |
|---|---|---|---|
| **1** | `packages/contracts/src/public-pages/sahyog-drive.ts:57-62` | *"NOTE THE DELIBERATE INVERSION … `spawned`, `live`, `closed` and `settled` must never cross this boundary"* | ⛔ **FALSE as written** |
| **2** | `packages/contracts/src/public-pages/sahyog-vivran.ts:83-86` | *"NOTE THE INHERITED INVERSION … ⛔ **Not a mistake to tidy** — the internal word describes the CONTRIBUTION WINDOW, the public word the DRIVE's standing"* | ⛔ **DIRECTLY REVERSED** — D1(b) rules it *is* to be aligned |
| **3** | `packages/domain/src/pool/public-read.ts:106-108` | *"⛔ THE WIRE TOKEN IS NEVER THE INTERNAL ONE"* | ⛔ **FALSE as written** |
| **4** | `packages/domain/src/pool/sahyog-vivran-read.ts:145-150` | *"⭐ THE WIRE TOKEN IS ⛔ NEVER THE INTERNAL ONE … `spawned` / `live` / `closed` / `settled` must never cross"* | ⛔ **FALSE as written** |

⚠ Site 2's *"⛔ Not a mistake to tidy"* is the sharpest: it is an instruction to a future reader **not
to do the thing D1(b) rules.** ⛔ Leaving it is worse than leaving a stale word.

#### (ii) ⛔ ASSERTION sites — these go **RED**, and ⛔ none may be weakened

| # | Site | Shape | What D1(b) does to it |
|---|---|---|---|
| **5** | `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:595-612` | live-DB; loops `['spawned','live','closed','settled']` over the response VALUES | ⛔ **RED** — `closed` / `verified` are now legitimate index values |
| **6** | `packages/contracts/tests/public-pages-sahyog-vivran.test.ts:155-165` | unit; asserts `PublicSahyogVivranEntry` **REJECTS** each of the same four as `driveStatus` | ⛔ **RED** — two of the four must now PARSE |
| **7** | `packages/domain/tests/pool/sahyog-vivran-read.test.ts:56-64` | ⚠ **the same loop shape as #6**, over `POOL_LIFECYCLE_STATES` against `SAHYOG_VIVRAN_STATUSES`; cites cl.8 in its comment | ⛔ **RED** — `live` and `closed` are in **both** sets |
| **8** | `packages/domain/tests/pool/sahyog-vivran-read.test.ts:52-54` | asserts the **exact tuple** `['collecting','active','archive']` | ⛔ **RED** |
| **9** | `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:580-600` | live-DB; per state, `expect(res.body).not.toContain(`"${state}"`)` | ⛔ **RED for `live` and `closed`** (green for `settled` → `verified`) |

⚠ **#9 is an anti-leak site, ⛔ not a fixture.** ⭐ It is listed in **Trap 8** as well, because it also
carries the `['live','collecting']` pairs — ⛔ but repairing it as a fixture and skipping the cl.8 note
would discharge Trap 8 while leaving AC5 unmet.

⚠⛔ **⛔ Do ⛔ NOT "fix" any of the nine by deleting the loop or excepting two words.** ⇒ **D1** rules
the shape, and it applies to **all nine sites**.

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
| `apps/public/src/lib/sahyog-render.ts` | `tableCaptionActive:102` · `tableCaptionArchive:103` · `sectionActiveTitle:104` · `sectionArchiveTitle:105` · `statusActive:122` · `statusArchive:123` · ⚠ the label ternary at **`:296`** · ⛔⛔ **the SECTION PARTITION at `:338`** |
| `apps/public/src/lib/sahyog-vivran-render.ts` | `statusLabel` switch **`:238-252`** (`case 'collecting'` / `'active'` / `'archive'`) · `isCollecting: drive.driveStatus === 'collecting'` **`:348`** |
| ⛔⛔ `apps/public/src/lib/sahyog.server.ts` | ⛔⛔ **`:202`** — the **INDEX** runtime guard, `(r['status'] === 'active' \|\| r['status'] === 'archive')` |
| `apps/public/src/lib/sahyog-vivran.server.ts` | **`:191-193`** — the drive-page runtime guard, `r['driveStatus'] !== 'collecting' && … !== 'active' && … !== 'archive'` |
| ⚠ `packages/domain/src/pool/sahyog-vivran-read.ts` | ⚠ **`:478`** — `status === 'collecting'` gates whether `classifyCycleOutcome` runs at all |
| `apps/public/src/lib/surface-fields.ts` | **`:458`** — a doc comment stating the old three tokens |

⭐ **The LABEL FIELD NAMES themselves encode the retired words** (`statusActive`, `sectionArchiveTitle`,
`collectingTitle`, …). ⚠ **⛔ Renaming those fields is ⛔ OUT OF SCOPE** — see D3.

#### ⛔⛔ `sahyog.server.ts:202` IS THE ONE THAT TAKES `/sahyog` DOWN — AND ⛔ THE TYPECHECK ⛔ CANNOT SEE IT

⚠⛔ **⛔ THE TYPECHECK IS ⛔ NOT YOUR FRIEND AT EITHER `.server.ts` GUARD.** Both narrow an
`unknown` off a `Record<string, unknown>` parsed from the API response — ⛔ there is **no** enum type
in scope, so a literal that can never match compiles **clean**.

⭐ And the failure arm of `sahyog.server.ts:202` is the page's **OUTAGE** state, ⛔ not a crash and
⛔ not a blank cell. ⇒ if `:202` is missed while the wire renames to `closed`/`verified`, **every row
fails validation and `/sahyog` serves "unavailable" to 100% of visitors** — a green typecheck, a green
unit suite, and a dead public index. ⚠⛔ **⛔ This file is ⛔ NOT named anywhere in the story's title,
its `.astro` files, or its render-layer pair.** ⭐ It is `sahyog-vivran.server.ts:191`'s twin, and the
only reason to look for it is that you were told to.

#### ⛔⛔ `sahyog-render.ts:338` IS THE PARTITION, ⛔ NOT A LABEL

`if (item.status === 'archive') archiveRows.push(displayRow)` — inside `buildSahyogView`, this is what
computes `view.sections.active` / `.archive`, which `sahyog.astro:461`/`:514` then guard on. ⭐ The
typecheck **does** catch this one (`item.status` is typed) — ⚠ **but so does `:296`, and a dev who
fixes only the site the story named will meet `:338` as a bare error and may invert or widen it.**
⇒ ⛔ `'archive'` becomes **`'verified'`**, and the `:296` ternary's `'archive'` likewise.

⚠⛔ **THE CONSEQUENCE OF GETTING `:338` WRONG IS ALREADY DOCUMENTED IN THAT FILE.** `sahyog-render.ts:178-184`
records the shipped defect where the partition was recovered by string-comparing localised labels: every
drive rendered **TWICE, under two headings making contradictory claims about whether the family had been
paid**, and ⛔ no test caught it. ⇒ ⭐ pin the partition with a test that feeds **both** tokens and
asserts the two section lengths, ⛔ not just the label.

### Trap 8 — ⛔ **NINE** SHIPPED TEST FILES PIN THE OLD COPY, ⛔ NOT SIX

⚠ Task 6 lists **new** tests. These **existing** files go red and are ⛔ not optional:

| File | What breaks |
|---|---|
| `apps/public/tests/sahyog-copy.test.ts:30-35,45,46` | ⚠ requires **all eight** keys to exist — ⛔ not the five the story used to name: `section.active.title` `:30` · `section.active.help` `:31` · `section.archive.title` `:32` · `section.archive.help` `:33` · `table.caption.active` `:34` · `table.caption.archive` `:35` · `status.active` `:45` · `status.archive` `:46` |
| `apps/public/tests/sahyog-vivran-copy.test.ts:40-44,127` | requires `status.collecting`, `status.active`, `status.archive`, `collecting.title`, `collecting.body` to **exist** |
| `apps/public/tests/sahyog-render.test.ts:32-35,46,47,76,165,188,356-394` | fixtures assert `'Active'`/`'Archive'`, ⚠ **plus `status: 'active'` row fixtures at `:76`** and ⛔⛔ **the ENTIRE `splitSections` block `:356-394`** — including the **translator-slip regression** at `:371-394`, which is the pinned proof of the Trap 7 `:338` defect. ⛔ Repair it; ⛔ do ⛔ not delete it |
| `apps/public/tests/sahyog-vivran-render.test.ts:39-43,72,88,157,170,196,268` | fixtures assert `'Collecting'`/`'Active'`/`'Archive'`, `driveStatus: 'archive'` `:72`, `driveStatus: 'collecting'` `:157`, `.toBe('Collecting')` `:170`, `driveStatus: 'active'` `:196` |
| ⛔ `apps/public/tests/sahyog-vivran-client.test.ts:27` | ⛔⛔ **`OK_BODY.drive.driveStatus: 'archive'`** — the shared happy-path fixture. ⇒ after the enum change **every `expect(res.ok).toBe(true)` in the file fails.** ⭐ Its `'settled'` REJECTION test at `:150-158` stays **GREEN** — `settled` is still not a public token — ⛔ do ⛔ not "fix" that one |
| ⛔ `packages/domain/tests/pool/sahyog-vivran-read.test.ts:52-64` | ⚠ **also Trap 1 sites #7/#8** — the exact tuple **and** the `POOL_LIFECYCLE_STATES` loop. ⛔ Repair per **D1**, ⛔ not as a fixture |
| ⛔ `packages/domain/tests/integration/pool/sahyog-drive-public-read.spec.ts:156-157` | live-DB: `expect(byId.get(active.poolId)?.status).toBe('active')` / `.toBe('archive')` |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts:802-803,814-815,1092-1093` | ⚠ **rewritten by story A** — re-read before editing |
| `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:580-600` | the `['live','collecting']` state→token pairs — ⚠ **and Trap 1 site #9**, so it owes the cl.8 note too |

⛔⛔ **`scrape-test.spec.ts:106` IS ⛔ NOT ON THIS LIST, AND EDITING IT WOULD BE A DEFECT.** ⚠ That line
is `statusActive: 'Active'` in the **MEMBER-DIRECTORY** label fixture (`columnStatus`, and
`statusLockIn: 'Waiting period'` on the next line) — ⭐ the ratified **member-lifecycle** label that
**AC1 explicitly carves out**. ⇒ ⛔ leave it. ⭐ The sahyog fixtures in that file are at `:802-803`,
`:814-815` and `:1092-1093`.

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

**Given** this story implements `-190` cl.5, `-191` cl.3, `-192` cl.1/3, `-193` cl.1/3 and **D2**'s
**ruling 3** (an absent token drops its clause — **AC9**), and records `-194` cl.1 as already satisfied
**And** ⚠ **D2**'s other two rulings are **routed elsewhere and must be named as such**: ruling 1 ⇒
**Story 6.18**, ruling 2 ⇒ **`11b-14` AC7 / Task 8** — ⛔ neither is this story's
**Then** Task 0 writes the `epics.md` annotation and flips the sprint row in a `governance:` commit
**And** ⛔ no code lands before it ([[feedback_governance_commits_precede_implementation]]).

### AC1 — The three stages are named **Live · Closed · Verified**, everywhere

**Given** `-190` cl.5, `-191` cl.3, `-193` cl.1
**Then** the public index and the public drive page render **Live**, **Closed**, **Verified** in both
locales
**And** ⛔⛔ **BOTH PAGES STILL SERVE A REAL TABLE — ⛔ NEITHER FALLS TO ITS OUTAGE ARM.** ⚠ Each page
validates the status against a **LITERAL SET** at runtime (`sahyog.server.ts:202`,
`sahyog-vivran.server.ts:191-193`) and ⛔ the failure arm is the **"unavailable"** state, ⛔ not a
crash. ⇒ ⭐ an end-to-end assertion that a renamed wire token **still renders rows** is **required** —
⛔ a typecheck, a unit suite and a copy test are **ALL** green through this defect (Trap 7)
**And** ⭐ the index **SECTION PARTITION** still partitions: a `closed` row and a `verified` row land in
**different** sections, asserted with both tokens present (Trap 7, `sahyog-render.ts:338`)
**And** ⛔ *"Active"*, *"Collecting"* and *"Archive"* appear ⛔ **nowhere** in any user-facing **string
value** on either surface — asserted by a test over the copy files, ⛔ not by inspection
**And** ⛔ the assertion is **SCOPED to the `sahyog-drive` and `sahyog-vivran` namespaces**. ⚠⛔ A
repo-wide ban would false-fail on `locales/*/members.json`, where **"Active"** is the ratified
**member-lifecycle** label and ⛔ has nothing to do with drives — ⛔ do ⛔ not widen it, and ⛔ do ⛔ not
"fix" `members.json`
**And** ⚠ the ban is on **rendered values**, ⛔ not on JSON **key names** — see **D3**
**And** ⛔⛔ **THE `hi` HALF NEEDS ITS ⛔ OWN ASSERTION — A WORD BAN IS ⛔ STRUCTURALLY BLIND TO IT.**
⚠ Verified: `hi/sahyog-drive.json` and `hi/sahyog-vivran.json` contain **ZERO** occurrences of
*"Active"* / *"Collecting"* / *"Archive"* **today**, because they are in Devanagari. ⇒ a dev who
rewrites only `en` **passes the English ban** with `hi` still reading सक्रिय / संग्रह / संग्रहण.
⭐ The `hi` side must be pinned **POSITIVELY** — the ruled Hindi words are **present** at
`status.*` in both namespaces — ⛔ or the story must state that review is its only guard. ⚠ `parity.test.ts`
⛔ does ⛔ **not** close this: it compares **key sets**, ⛔ never values
**And** ⚠ the **complete** `en` offender set is **SEVEN** values in `sahyog-drive.json` and **FOUR** in
`sahyog-vivran.json` — ⛔ not the four the Files table used to name; see **Files** row 3
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
**And** ⚠ `outcome.under_funded` is ⛔ **NOT** in scope here — ⭐ **D2 is CLOSED**, and it closed
⛔ **without** moving that key. ⚠ The ratified replacement is authored **dark** at **AC9** and rendered
elsewhere; ⛔ this story does ⛔ not edit `sahyog-drive.json:44`.

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

### AC5 — The wire-token / anti-leak collision is resolved as **D1** rules — at **ALL NINE** sites

**Given** Trap 1
**Then** D1's ruling is implemented at **all nine** sites in Trap 1's two tables, and the guarded
property — *no **un-ruled** internal vocabulary crosses as a value* — is **still enforced by a test**
**And** ⛔ ⛔ no loop is deleted and ⛔ none is weakened to accommodate the collision; where one
changes shape, the replacement asserts **at least as much**
**And** ⭐ **all FOUR rule doc-blocks** (Trap 1 (i) — `sahyog-drive.ts:57-62`, `sahyog-vivran.ts:83-86`,
`public-read.ts:106-108`, `sahyog-vivran-read.ts:145-150`) are **amended and NAME the rule they
replace** — ⛔ they are stale **rules**, ⛔ not stale vocabulary, and ⛔ no gate catches any of them
**And** ⚠ `sahyog-vivran.ts:83-86`'s *"⛔ Not a mistake to tidy"* is **retracted by name** — ⛔ it
instructs a future reader ⛔ not to do the thing D1(b) rules
**And** the overlap is explained **at each of the nine sites**: naming `2026-08-21-144` cl.8, naming
the coincidence, and stating that it is **ruled**
**And** ⚠ `sahyog-vivran.spec.ts:580-600` is repaired as an **anti-leak site** (with the cl.8 note),
⛔ **not** merely as a Trap 8 fixture — ⛔ repairing the pairs and skipping the note leaves AC5 unmet
**And** ⭐ `spawned` remains a **pure deny** at all nine.

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

### AC9 — ⭐⭐ THE TWO **DARK COPY TOKENS** ARE AUTHORED HERE — ⛔ AND STORY D IS ALREADY WAITING ON ONE

⚠⛔ **THIS AC EXISTS BECAUSE THE OBLIGATION LIVED ⛔ ONLY INSIDE D2's PROSE, AND ⛔ NO TASK CARRIED IT.**
⭐ Per [[feedback_spec_edits_must_propagate_to_tasks]] the dev agent works from the **Tasks list** —
a commitment recorded only in a decision blockquote **⛔ does ⛔ not reach the implementation**.

**Given** D2 is **CLOSED** (2026-09-05, Trustee-ratified DR + KB), and its **ruling 3** — *an absent
token **DROPS ITS CLAUSE**, ⛔ no combinatorial variants* — is ⭐ **this story's**
**And** `11b-14` (**story D**) gained **AC7 + Task 8** on 2026-09-05 (`31153962`), whose text reads
*"the index line's `{nominee_name}` token (**11b.12's ratified copy**) is **rendered** by this story —
⭐ 11b.12 **authored** it, ⛔ left it dark, exactly as it did `{amount}`"*
**Then** this story **AUTHORS**, in the shared copy source, the Panel-ratified index line carrying
**both** pending tokens — `{amount}` and `{nominee_name}` — ⭐ **verbatim from the routing note's §8.1
/ §9.1**, ⛔ not paraphrased
**And** it authors the **no-token variants** the omit-the-clause rule requires — ⭐ **one variant per
absent token**, ⛔ **NOT** the combinatorial cross-product (ruling 3)
**And** ⛔ ⛔ **NEITHER token is RENDERED here.** ⚠ `t()` interpolates an unsupplied token to **nothing**
⇒ ⛔ an empty rupee figure or a dangling *"nominee of"* must ⛔ never reach a page. ⭐ The amount-bearing
line lights up at **story D**; the name-bearing line lights up at **story D's AC7**
**And** ⭐ the key path of each variant is recorded in the **Dev Agent Record** and written into
`11b-14`'s **AC7 / Task 8** by name — ⛔ so D consumes them by name and ⛔ does ⛔ not mint its own
**And** ⚠⛔ this is **⛔ NOT** a licence to touch `outcome.under_funded` — ⭐ that key stays untouched
(**D2**'s own instruction, and the Files table's ⛔ NOT-touched list). ⚠ The ratified block replaces it
**later**, on the **drive page**, at a story that is ⛔ not this one
**And** ⛔ ⛔ **no `apps/mobile` render** and ⛔ no wire, tier or predicate change — ⭐ this AC ships
**strings only**, which is exactly why it is compatible with **AC7**.

⚠⛔ **THE FAILURE MODE IF THIS AC IS DROPPED:** B ships nothing, D's **AC7** looks for *"11b.12's dark
`{nominee_name}` token"*, finds ⛔ none, and mints its own — ⭐ **recreating the exact two-source defect
`-193` cl.3 exists to close** (**Trap 9**), on a Trustee-ratified line. ⚠ This is
[[feedback_circular_deferral_between_sibling_stories]] re-forming **after** the split was resolved
once: ⛔ no per-story pass can see it, because each story's own text is internally consistent.

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
> ⇒ name cl.8, name the coincidence, and state that it is ruled — at **all NINE** Trap 1 sites.
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

⇒ **Tasks 2-6 are UNBLOCKED.** ⚠ The change touches two Zod enums, both status maps, **six** render-layer
files (⛔ **two of them invisible to the typecheck**), the copy keys, **nine** anti-leak sites and
**nine** shipped test files — ⛔ land them in **one commit**, since a half-renamed vocabulary is worse
than either end state.

### ✅ D2 — **CLOSED by the Trustee Panel (DR + KB), 2026-09-05. ⛔ NON-BLOCKING.** Does `outcome.under_funded` violate AC2?

> ⚠⛔ **STATUS, STATED ONCE SO IT IS ⛔ NOT READ THREE WAYS.** ⭐ D2 was **opened and routed** on
> 2026-09-05 and **CLOSED the same day** (note §10, three rulings). ⛔ The heading, this note, AC2,
> the *"does NOT do"* list and the Change Log ⛔ all say **closed**.
>
> ⭐ **What CLOSED means for this story, precisely:**
> ⭐ **ruling 3** (an absent token drops its clause) is ⭐ **THIS STORY'S** ⇒ **AC9**;
> ⛔ **ruling 1** (the approver duty) is **Story 6.18**, created 2026-09-05 (`7a362471`);
> ⭐ **ruling 2** (the nominee name on the index) ⭐ **LANDED IN STORY D** on 2026-09-05 (`31153962`)
> as `11b-14`'s **AC7 + Task 8** — ⛔ it is ⛔ no longer *"its own story or a NAMED addition"*, it is
> **routed and written**, and D's AC6 was **amended, ⛔ not overwritten**, to stop forbidding it.
>
> ⛔⛔ **AND `outcome.under_funded` IS ⛔ STILL ⛔ NOT TOUCHED HERE.** ⭐ Closing D2 settled **who
> authors what**, ⛔ not *"the copy story may now rewrite a statement of the trust's obligation"*.
> ⇒ **AC9** authors the ratified line as **dark copy**; the key at `sahyog-drive.json:44` is
> ⛔ **unchanged** by this story.

> ⭐ **ROUTING NOTE WRITTEN:**
> `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md`
> ✅⭐ **(Q1) ANSWERED — Trustee-ratified (DR + KB), 2026-09-05: *"Trust doesn't make any commitment
> to the family."*** ⇒ **the line GOES.**
> ✅⭐ **(Q2) ANSWERED — the Panel supplied its OWN wording (⛔ none of our five), 2026-09-05:** a
> five-paragraph block ending *"Join the Pariwar. Be the Movement."*, plus a **Nominee full name |
> District** table above it, on **both** the member and public views. ⭐ Verbatim at the note's **§8.1**.
>
> ⛔⛔ **AND IT ⛔ CANNOT BE BUILT IN THIS STORY — four blockers, §8.3:**
> **(1)** `₹{amount}` is on ⛔ NEITHER public wire (*"a count, ⛔ never a sum of amounts"*) — it is
> **story D**'s, ⚠ and **D is blocked on B** ⇒ a ⛔ **circular block**.
> **(2)** the text is **five paragraphs**; the string it replaces is a ⛔ one-line **table cell** on a
> paginated index ⇒ it belongs on the **drive page**.
> **(3)** *"both member and public"* — ⛔ the member drive views ⛔ do not exist; they are **E** and
> **F**, ⛔ both blocked on B.
> **(4)** `{familyName}` is consent-**nullable**, and on the drive page the deceased name is ⛔ not on
> the wire at all (**11b.3b**'s, gated on `-173`/`-174`).
>
> ✅⭐ **ALL FOUR BLOCKERS ANSWERED 2026-09-05 (note §9.1):** ⭐ **B owns the COPY SOURCE, D owns the
> AMOUNT FIELD** — the deadlock is dissolved by making the dependency explicit; the **index** gets its
> own ratified one-line wording; **E/F consume B's copy later** (⭐ exactly Trap 5, now ruled); and a
> **no-name variant** is supplied.
>
> ⚠⛔ **IMPLEMENTATION NOTE — ⛔ do ⛔ not render an empty rupee figure.** `t()` interpolates
> `{amount}` to nothing while D is unbuilt. ⇒ ⭐ B ships the **copy and the no-amount variants**; the
> amount-bearing line **renders only when D lands**.
>
> ✅⭐⭐ **D2 IS CLOSED, 2026-09-05 (note §10)** — three rulings:
> **(1)** ⭐ **a story is COMMISSIONED to mechanize the approver duty** ⇒ *"nominee of"* becomes true
> **because it is checked**, ⛔ not because the objection was waived;
> **(2)** ⭐ **the nominee name goes ON THE INDEX** — §9.4's bulk-harvest property was put to the Panel
> and **ACCEPTED**;
> **(3)** ⭐ **an absent token DROPS ITS CLAUSE** — ⛔ no combinatorial variants.
>
> ✅ **Attribution CONFIRMED (§10.1):** relayed as *"DR and KP"*, confirmed a typo — the rulings are
> **Trustee-ratified by Dhiraj Rahul + Kalpana Bharti (DR + KB)**.
>
> ⭐⭐ **ONLY RULING 3 IS THIS STORY'S.** ⛔ Ruling 1 became **Story 6.18**, created 2026-09-05
> (`7a362471`) — 11b.12 touches ⛔ no approval surface. ⛔ Ruling 2 **LANDED IN STORY D** on
> 2026-09-05 (`31153962`) as `11b-14` **AC7 + Task 8** — a contract + domain read + matrix + Tier-1
> decrypt change, ⛔ forbidden here by **AC7**; ⭐ its decision-log entry + matrix row are **AC7(a)**,
> *there*, before any code.
>
> ⇒ ⭐ **B authors the ratified index line and the omit-the-clause rule**, with `{nominee_name}`
> **authored but ⛔ not rendered** — ⭐ exactly as `{amount}` is. **Two pending tokens, one pattern:
> B writes the copy; another story lights it up.**
>
> ⚠⛔ **⛔ THAT SENTENCE IS ⛔ NOT SELF-EXECUTING — IT IS ⭐ AC9 AND ⭐ TASK 2b.** ⛔ An obligation
> stated only in a decision blockquote ⛔ does not reach the dev agent, and **story D's AC7 is
> already written against it** ([[feedback_spec_edits_must_propagate_to_tasks]]).
>
> ⭐⭐ **WHAT THIS STORY STILL DOES, TODAY, UNCHANGED:** **AC2 deletes the falsehood.** ⛔ The false
> sentence goes now; ⭐ the replacement does ⛔ not have to wait for it.
> ⇒ **Tasks 2-7 remain UNBLOCKED.** ⛔ Do ⛔ not build the ratified block or the held clause here.
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
- ⛔ It does ⛔ not touch `outcome.under_funded` — ⭐ **D2 is CLOSED**, and it stayed closed **without**
  moving that key. ⚠ The ratified replacement is authored **dark** (**AC9**) and rendered elsewhere.
- ⛔ It does ⛔ **not** render `{amount}` or `{nominee_name}` — ⭐ **story D** lights both up
  (`11b-14` AC7 / Task 8). ⚠ It does ⛔ **not** follow that B may skip **authoring** them: **AC9**.
- ⛔ It does ⛔ not build the approver-duty mechanism — ⭐ **Story 6.18** (D2 ruling 1).
- ⛔ It does ⛔ not touch `scrape-test.spec.ts:106` or any other **member-directory** label — ⭐ that
  *"Active"* is the ratified member-lifecycle word (**AC1**, **Trap 8**).
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
| 3 | `packages/i18n/locales/{en,hi}/sahyog-drive.json` | ⚠ **SEVEN `en` values, ⛔ not four:** `page.intro` `:3` · `section.active.title` `:4` · `section.active.help` `:5` · `section.archive.title` `:6` · `section.archive.help` `:7` · `table.caption.active` `:8` · `table.caption.archive` `:9` · `status.*` `:41-42`. ⭐ **`hi` at the same keys** | AC1, AC2 |
| 4 | `packages/i18n/locales/{en,hi}/sahyog-vivran.json` | **FOUR:** `status.*` `:13-15`, `collecting.title/body` `:16-17` (⭐ **values only**, D3) | AC1, AC2 |
| 4b | `packages/i18n/locales/{en,hi}/…` | ⭐ **NEW:** the ratified index line + its no-token variants — `{amount}` and `{nominee_name}` **dark** | **AC9** |
| 5 | `packages/i18n/locales/…` + `packages/i18n/src/catalog.ts` | ⚠ **only if** a new namespace — five hand-edits (Trap 6) | AC4 |
| 6 | `packages/contracts/src/public-pages/sahyog-drive.ts:57-62,64` | ⭐ **the stale RULE at `:57-62`** + enum → `['closed','verified']` (**2**) | AC5, AC7 |
| 7 | `packages/contracts/src/public-pages/sahyog-vivran.ts:83-86,88` | ⭐ **the stale RULE at `:83-86`** (incl. *"⛔ Not a mistake to tidy"*) + enum → `['live','closed','verified']` (**3**) | AC5 |
| 8 | `packages/domain/src/pool/public-read.ts:106-108,110,113-116,488` | ⭐ **the stale RULE at `:106-108`** + tokens + map + the `:488` doc-comment | AC5 |
| 9 | `packages/domain/src/pool/sahyog-vivran-read.ts:145-158,478` | ⭐ **the stale RULE at `:145-150`** + tokens + map + ⚠ **the funding-verdict gate at `:478`** | AC5 |
| 10 | `apps/public/src/lib/sahyog-render.ts:102-105,122-123,296,338` | labels + the `:296` ternary + ⛔⛔ **the `:338` SECTION PARTITION** (Trap 7) | AC1 |
| 11 | `apps/public/src/lib/sahyog-vivran-render.ts:238-252,348` | the `statusLabel` switch + `isCollecting` (Trap 7) | AC1 |
| 12 | ⛔⛔ `apps/public/src/lib/sahyog.server.ts:202` | ⛔⛔ **the INDEX literal-set guard** — ⚠ miss it and `/sahyog` serves its **OUTAGE** page to everyone; ⛔ the typecheck ⛔ cannot see it (Trap 7) | AC1 |
| 13 | `apps/public/src/lib/sahyog-vivran.server.ts:191-193` | the drive-page literal-set guard — ⛔ same class, ⛔ same blindness | AC1 |
| 14 | `apps/public/src/lib/surface-fields.ts:458` | the doc comment stating the old tokens | AC5 |
| 15 | `apps/public/src/pages/sahyog.astro` | headings/help + the `<details>` explainer. ⛔ **NOT** `:461`/`:514` | AC1, AC2, AC3 |
| 16 | `apps/public/src/pages/sahyog-vivran/[driveToken].astro:127-131,373-375` | ⚠ the **full** label block `:127-131` (⛔ not `:127,130-131` — `statusActive` `:128` and `statusArchive` `:129` are in it) + the explainer | AC1, AC3 |
| 17 | `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:595-612` | ⭐ allow-list re-shape **+ the cl.8 note** (Trap 1 #5) | AC5 |
| 18 | `packages/contracts/tests/public-pages-sahyog-vivran.test.ts:155-165` | ⭐ allow-list re-shape **+ the cl.8 note** (Trap 1 #6) | AC5 |
| 19 | `packages/domain/tests/pool/sahyog-vivran-read.test.ts:52-64` | ⭐ allow-list re-shape **+ the cl.8 note** (Trap 1 #7/#8) | AC5 |
| 20 | `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:580-600` | ⭐ allow-list re-shape **+ the cl.8 note** (Trap 1 #9) — ⛔ **not** a fixture repair | AC5 |
| 21 | the **nine** files in **Trap 8** | fixtures/assertions that pin the old copy | AC1, AC2 |
| 22 | `_bmad-output/implementation-artifacts/11b-15-…md` · `11b-14-…md` | the shipped key paths, written in by name | AC4, **AC9** |
| 23 | `friction-budget.md` | the disposition, ⚠ **after** the code commits | AC8 |

⛔ **⛔ NOT touched:** ⛔ any `apps/mobile` file (Trap 5) · ⛔ `sahyog.astro:461`/`:514` (Trap 3) ·
⛔ `outcome.under_funded` `sahyog-drive.json:44` (**D2** — closed, and it stays closed without moving
the key) · ⛔ any key or field NAME (D3) · ⛔ `locales/*/members.json` (AC1) ·
⛔ `scrape-test.spec.ts:106` — ⚠ the **member-directory** fixture (Trap 8) ·
⛔ `sahyog-vivran-client.test.ts:150-158` — ⚠ the `'settled'` rejection **stays green** (Trap 8) ·
⛔ `scripts/sahyog-vivran-financial-truth/` (Dev Notes).

---

## Tasks / Subtasks

- [x] **Task 0 — GOVERNANCE FIRST** (AC0)
  - [x] Annotate `epics.md`: story B of the `-195` cl.3 split; implements `-190` cl.5, `-191` cl.3,
        `-192` cl.1/3, `-193` cl.1/3; records `-194` cl.1 satisfied by construction; ⭐ records **D2
        CLOSED** with its three rulings **routed** (3 ⇒ **AC9** here; 1 ⇒ **6.18**; 2 ⇒ **11b-14 AC7**);
        and ⭐ records that the **member-app render is story E's**, ⛔ not deferred work.
  - [x] Flip `sprint-status.yaml` `11b-12-…`: `ready-for-dev` → `in-progress`, with a ledger entry.
  - [x] Commit with a `governance:` prefix. ⛔ No code.
- [x] **Task 1 — RULE D1** — ✅ **RULED (b) by BigDev, 2026-09-04: align the wire
      (`live` · `closed` · `verified`), and re-shape the anti-leak assertions into ALLOW-lists.**
      ⭐ Extended 2026-09-05 with the **mapping table** (⛔ the index enum stays **TWO** members), and
      2026-09-06 to **all NINE** Trap 1 sites — ⚠ four un-gated **RULE** doc-blocks and five
      **ASSERTIONS** that go red. ⇒ Tasks 2-6 unblocked; ⛔ `spawned` stays a pure deny.
- [x] **Task 2 — The shared copy source** (AC4, AC1, AC2, AC3)
  - [x] ⚠ **DECIDE FIRST, and record the reason in the Dev Agent Record**: does the shared stage set go
        in a **new** namespace, or into one of the two existing registered ones? ⭐ Trap 6 prices both.
  - [x] Create ONE keyed stage set — three names + one explanation each + the affordance's label,
        `en` + `hi`. ⛔ No new package (Trap 9).
  - [x] ⭐ **If a new namespace**: all five `catalog.ts` edits (`:42`, `:57`, `:66`, `:67`, `:71`) in
        **this same commit**, then **run** `packages/i18n/tests/catalog-registration.test.ts`.
        ⛔ A green parity gate proves ⛔ nothing here (Trap 6).
  - [x] ⚠ Rewrite **ALL SEVEN** offending `sahyog-drive.json` values, ⛔ **not four**: `:3` `page.intro`
        · `:4` `section.active.title` · `:5` `section.active.help` · `:6` `section.archive.title` ·
        `:7` `section.archive.help` · `:8` `table.caption.active` · `:9` `table.caption.archive`;
        delete `status.active` / `status.archive` `:41-42`. ⭐ **Both locales.**
  - [x] Rewrite `sahyog-vivran.json` `:13-15` `status.*`; ⭐ **rewrite the VALUES of** `:16-17`
        `collecting.title` / `collecting.body` — ⛔ **keep the key names** (**D3**), and leave the
        one-line note D3 requires.
  - [x] ⭐ **Re-derive the offender list rather than trusting this one** —
        `python3 -c "import json;d=json.load(open(P));print([k for k,v in d.items() if any(w in v.lower() for w in ('active','collect','archiv'))])"`
        over **all four** files. ⚠ The list above has been wrong once already.
  - [x] ⛔⛔ **The `hi` side needs its OWN check** (AC1) — ⚠ the English word ban finds **ZERO** hits in
        `hi/*.json` **by construction**, so it ⛔ cannot tell a translated file from an untouched one.
        ⇒ pin the ruled **Hindi** words positively at `status.*`, or state that review is the only guard.
  - [x] ⛔ Do ⛔ **NOT** touch `outcome.under_funded` `:44` (**D2** — closed, and it stays closed
        without moving the key).
  - [x] ⚠ `t()` **THROWS** on a missing key — every locale changes in the **same commit**;
        `packages/i18n/tests/parity.test.ts` backs this, ⛔ do not hand-verify. ⚠⛔ And ⛔ it compares
        **KEY SETS, ⛔ never VALUES** — ⛔ it cannot see an untranslated Hindi string.
- [x] **Task 2b — ⭐⭐ THE TWO DARK COPY TOKENS** (**AC9**) — ⚠ **story D is already written against this**
  - [x] Author, in the shared copy source, the **Panel-ratified index line** carrying `{amount}` **and**
        `{nominee_name}` — ⭐ **verbatim** from the routing note §8.1 / §9.1, ⛔ not paraphrased.
  - [x] Author the **no-token variants** the omit-the-clause rule (D2 ruling 3) requires — ⭐ **one per
        absent token**, ⛔ **NOT** the combinatorial cross-product.
  - [x] ⛔ ⛔ **Render NEITHER token.** ⚠ `t()` interpolates an unsupplied token to **nothing** ⇒ ⛔ no
        empty `₹` and ⛔ no dangling *"nominee of"* may reach a page.
  - [x] ⭐ Record each variant's **key path** in the Dev Agent Record **and** write it into
        `11b-14`'s **AC7 / Task 8** by name — ⛔ so story D consumes it, ⛔ never mints its own
        (**Trap 9**; the failure mode is spelled out at AC9).
  - [x] ⛔ Still ⛔ **no** `outcome.under_funded` edit, ⛔ no wire change, ⛔ no tier change,
        ⛔ no `apps/mobile` change. ⭐ **Strings only** — which is why this is compatible with **AC7**.
- [x] **Task 3 — The wire + the maps** (AC1, AC5, AC7; shape per **D1's mapping table**)
  - [x] `PublicSahyogDriveStatus` (`sahyog-drive.ts:64`) → **`['closed','verified']`** — ⛔ **TWO**
        members. ⛔ Do ⛔ NOT add `live` (AC7 — story D).
  - [x] `PublicSahyogVivranStatus` (`sahyog-vivran.ts:88` — ⚠ ⛔ **not `:75`**) →
        **`['live','closed','verified']`**.
  - [x] `SAHYOG_DRIVE_STATUSES` + map (`public-read.ts:110,113-116`);
        `SAHYOG_VIVRAN_STATUSES` + map (`sahyog-vivran-read.ts:151,154-158`).
  - [x] ⚠ **`sahyog-vivran-read.ts:478`** — `status === 'collecting'` gates whether
        `classifyCycleOutcome` runs. ⇒ it becomes **`'live'`**. ⛔⛔ Get this wrong and a **still-collecting
        drive publishes a funding verdict mid-window** — ⭐ the exact thing `classifyCycleOutcome` exists
        to quarantine.
  - [x] ⭐ **Pin the part-identity** at both maps — ⛔ the map is ⛔ not a no-op; `spawned` proves it
        (D1's mapping table).
  - [x] ⭐ **Amend ALL FOUR stale RULE doc-blocks** (Trap 1 (i), AC5): `sahyog-drive.ts:57-62`,
        `sahyog-vivran.ts:83-86`, `public-read.ts:106-108`, `sahyog-vivran-read.ts:145-150`.
        ⚠ **Retract `sahyog-vivran.ts:83-86`'s *"⛔ Not a mistake to tidy"* BY NAME** — ⛔ it instructs
        the next reader ⛔ not to do what D1(b) rules.
  - [x] Amend the doc-comments that state the old vocabulary: `public-read.ts:488`,
        `surface-fields.ts:458`. ⛔ Amend and NAME the previous value, ⛔ do not silently overwrite.
- [x] **Task 4 — The public render + info affordance** (AC1, AC2, AC3, AC6)
  - [x] ⛔⛔ **FIRST, THE TWO RUNTIME GUARDS THE TYPECHECK ⛔ CANNOT SEE** (Trap 7):
        ⛔⛔ **`sahyog.server.ts:202`** — `(r['status'] === 'active' || r['status'] === 'archive')` —
        and `sahyog-vivran.server.ts:191-193`. ⚠ Miss `:202` and **`/sahyog` serves its OUTAGE page to
        every visitor** with a green typecheck and a green unit suite.
  - [x] ⭐ **The render layer, ⛔ not just the `.astro` files** (Trap 7): `sahyog-render.ts`
        `:102-105,:122-123`, ⚠ **the `:296` ternary** and ⛔⛔ **the `:338` SECTION PARTITION**;
        `sahyog-vivran-render.ts` the `statusLabel` switch `:238-252` and `isCollecting` `:348`.
        ⛔ Do ⛔ NOT rename the fields (**D3**).
  - [x] `sahyog.astro` section headings/help; ⚠ `[driveToken].astro` the **full** label block
        `:127-131` (⛔ not `:127,130-131` — `statusActive` `:128` / `statusArchive` `:129` are in it)
        and `:373-375`.
  - [x] Add the `<details>`/`<summary>` stage explainer to both pages. ⛔ No client script (Trap 4).
  - [x] ⭐ **First `<details>` in `apps/public`** — ship the marker reset **and** a visible focus ring
        (Trap 4). ⛔ There is ⛔ no house pattern to inherit; establish one and say so.
  - [x] ⛔ Do ⛔ NOT touch the `.length > 0` guards at `sahyog.astro:461` / `:514` (Trap 3).
- [x] **Task 5 — ⛔ NO MOBILE RENDER. Hand off to story E instead.** (AC4, AC3)
  - [x] ⭐ **Verify** the shared set **resolves** from `apps/mobile` — ⛔ a resolution test, ⛔ **not** a
        rendered component. `packages/i18n` is already a mobile dep (`apps/mobile/package.json:34`).
  - [x] ⛔ ⛔ Change ⛔ **NO** `apps/mobile` component. ⛔ Do ⛔ not add a stage to
        `SahyogVivranEntry.tsx` — ⚠ it is a link-out card and the app has ⛔ no stage surface (Trap 5).
  - [x] ⭐ **FILL IN** the exact key path this story shipped at `11b-15`'s **AC4 / Task 4**. ⚠ The
        **reciprocal note is already there** (landed `f06bbad6`) and says *"if B's key path is not
        recorded above by the time this story starts, ⛔ stop and read B's Dev Agent Record"* — ⇒ the
        note is ⛔ not the work; ⭐ **the path is**, and it is unknowable until Task 2 picks the namespace.
- [x] **Task 6 — The tests** (AC1, AC2, AC5, AC6)
  - [x] Copy test: *"Active"* / *"Collecting"* / *"Archive"* absent from both locales of the **two
        sahyog namespaces**. ⛔ Do ⛔ NOT widen it repo-wide — `members.json` would false-fail (AC1).
  - [x] Copy test: `/not yet been paid/i`, `/paid out/i`, `/to be paid/i` absent — ⭐ **case-insensitive
        and concept-shaped** (AC2, Trap 2). ⛔ Not the two literal sentences.
  - [x] Copy test: exactly ONE definition of the stage set (AC4).
  - [x] ⭐ **Re-shape ALL NINE Trap 1 sites** per D1 — the **four RULE doc-blocks** (Trap 1 (i), done in
        Task 3) and the **five ASSERTION sites**: `sahyog-drive.spec.ts:595-612`,
        `public-pages-sahyog-vivran.test.ts:155-165`, `sahyog-vivran-read.test.ts:52-64` (**two tests**),
        and `sahyog-vivran.spec.ts:580-600`. ⚠ Each preserving at least as much, each carrying the cl.8
        note (AC5). ⛔ `sahyog-vivran.spec.ts` is an **anti-leak site**, ⛔ not a fixture repair.
  - [x] ⭐ **Repair the NINE shipped files in Trap 8** — ⚠ ⛔ not six. ⛔ Repair the fixtures; ⛔ do ⛔ not
        weaken the assertions. ⛔ Do ⛔ **NOT** touch `scrape-test.spec.ts:106` (member directory) or
        `sahyog-vivran-client.test.ts:150-158` (the `'settled'` rejection **stays green**).
  - [x] ⛔⛔ **New, and ⛔ NOT optional: an END-TO-END assertion that each page still SERVES.** ⚠ A
        renamed wire token must still render **rows**, ⛔ not the *"unavailable"* arm — ⭐ the only
        thing that catches `sahyog.server.ts:202` (Trap 7, AC1).
  - [x] ⛔⛔ **New: the SECTION PARTITION, with BOTH tokens present** — a `closed` row and a `verified`
        row land in **different** sections and the two lengths sum to the row count. ⭐ This is what
        pins `sahyog-render.ts:338`; ⚠ the shipped `:371-394` regression is the precedent, ⛔ repair it,
        ⛔ do ⛔ not delete it.
  - [x] New: an empty stage section renders ⛔ no heading, ⛔ no caption, ⛔ no table (AC6).
  - [x] ⭐ **Execute them** against `twt-test-pg` on `:5433` — ⛔ *"written but not run"* is ⛔ not
        attested; that exact gap shipped a red spec at 11b.10. ⭐ Run `catalog-registration.test.ts`
        and `parity.test.ts` explicitly (Trap 6).
- [x] **Task 7 — The friction-budget disposition** (AC8)
  - [x] ⚠ **AFTER** Tasks 2-6 are committed (⭐ **2b included**) — ⛔ a declaration written against an empty diff passes
        **vacuously** ([[project_friction_budget_baseline_ratchet]]; demonstrated at `57778f72`,
        fixed at `7fe540f9`).
  - [x] Record the disposition in `friction-budget.md`, as 11b.1 / 11b.10 / 11b.11 each did.

---

## Dev Notes

### Why this story is small in code and large in consequence

⭐ Almost every line here is a **string**. ⚠ But **three** of the strings it deletes are **currently
telling the public something false about where their money goes** (Trap 2), and the vocabulary it
fixes is the one that let *"Active"* mean *finished* on a live site for months.

⇒ ⛔ Do ⛔ not treat it as a copy pass. **AC2 is the reason it is not last in the split.**

### The two genuinely hard parts

1. **D1's blast radius.** The ruling itself is settled; what is easy to get wrong is that it lands in
   **nine** anti-leak sites, **six** render-layer files and **nine** shipped test files — ⛔ none of
   which are the `.astro` files the story's title suggests. ⭐ Work the **Files this story touches**
   table, ⛔ not the file names in your head.

   ⚠⛔ **AND ⛔ TWO OF THE SIX RENDER-LAYER FILES ARE INVISIBLE TO THE TYPECHECK.**
   `sahyog.server.ts:202` and `sahyog-vivran.server.ts:191-193` compare an `unknown` off a
   `Record<string, unknown>` — ⛔ no enum type is in scope, so an impossible literal compiles clean.
   ⭐ `:202`'s failure arm is the index page's **outage** state ⇒ the whole rename can ship
   **green** and serve *"unavailable"* to every visitor. ⚠ That is why **AC1** now demands an
   end-to-end *"the page still serves rows"* assertion, and why the **first** subtask of Task 4 is
   the two guards, ⛔ not the labels.
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
- `packages/contracts/src/public-pages/sahyog-drive.ts:57-62` — anti-leak **RULE** site **1**
- `packages/contracts/src/public-pages/sahyog-vivran.ts:83-86` — **RULE** site **2** (*"⛔ Not a mistake to tidy"*)
- `packages/domain/src/pool/public-read.ts:106-108` — **RULE** site **3**
- `packages/domain/src/pool/sahyog-vivran-read.ts:145-150` — **RULE** site **4**
- `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:595-612` — **ASSERTION** site **5**
- `packages/contracts/tests/public-pages-sahyog-vivran.test.ts:155-165` — **ASSERTION** site **6**
- `packages/domain/tests/pool/sahyog-vivran-read.test.ts:52-64` — **ASSERTION** sites **7** and **8**
- `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:580-600` — **ASSERTION** site **9**
- `apps/public/src/lib/sahyog.server.ts:202` — ⛔⛔ the index guard the typecheck ⛔ cannot see
- `apps/public/src/lib/sahyog-render.ts:338` — the section partition; `:178-184` records what breaking it did
- `_bmad-output/implementation-artifacts/11b-14-…md` **AC7 / Task 8** — where `{nominee_name}` is **rendered**
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md`
  §8.1 / §9.1 / §10 — the ratified wording **AC9** authors verbatim
- `packages/i18n/tests/catalog-registration.test.ts` — the `/members` 500 that Trap 6 prevents
- `apps/public/src/pages/sahyog.astro:461,514` — the existing `.length > 0` guards
- `packages/i18n/locales/en/sahyog-drive.json:3,5,7,41-42` · `sahyog-vivran.json:13-17` — the copy
- `_bmad-output/implementation-artifacts/11b-15-…md` AC4 / Task 4 — where the **mobile** render lives

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, bmad-dev-story).

### Debug Log References

⭐ **Every coordinate in this story was re-derived before editing, ⛔ never trusted** (the file said so
twice, and it was right twice — see the two corrections below).

- Trap 1 re-derivation, exactly as the story prescribes:
  `grep -rn "never cross" --include="*.ts" --include="*.astro" packages/*/src packages/*/tests apps/*/src apps/*/tests`
  plus `grep -rn "2026-08-21-144"`. ⇒ the **nine** sahyog sites confirmed; the `directory.ts` /
  `public-pages-directory-vocabulary.test.ts` hits are the **member-lifecycle** family and are ⛔ out
  of scope (AC1's carve-out).
- Trap 6 discharged and **executed**, ⛔ not assumed: `packages/i18n/tests/catalog-registration.test.ts`
  and `parity.test.ts` (14 passed) plus the `i18n:check-parity` script (green, and it now lists
  `sahyog-shared`).
- Mutation check on the `sahyog.server.ts` guard (below) — ⛔ the one claim in this story that could
  ⛔ not be taken on trust.
- Live-DB specs run against `twt-test-pg` on `:5433` with `--fileParallelism=false`
  ([[project_ci_local_concurrency_oversubscription]] — `integration-tests` concurrency is
  load-bearing).

### Completion Notes List

#### ⭐ Task 2 — the namespace decision, and WHY (Task 2 leaves this open deliberately)

⭐ **A NEW namespace, `sahyog-shared`** — ⛔ not keys bolted onto one of the two existing ones.
Trap 6 prices the new-namespace option at five `catalog.ts` hand-edits; that cost was paid and the
mechanized guard was run. ⭐ The reason it is worth paying:

1. **AC4 becomes CHECKABLE rather than conventional.** *"⛔ There is ⛔ no second definition"* is
   asserted by scanning **every** locale file on disk for a `stage.*` key outside `sahyog-shared` —
   a shape that is only expressible when the shared set has a home of its own.
2. ⛔ **The cross-namespace read runs the wrong way.** Putting the stage words in `sahyog-vivran`
   would make the **index** read a *drive page's* namespace, and would have **story E** import a
   public **web page's** namespace to render a phone screen. ⚠ That is precisely the invitation to
   re-mint that Trap 9 describes.
3. ⭐ **AC9's ratified index line has no honest home in either existing namespace** — it is index
   copy that story **D** renders, authored by **B**. It belongs with the other shared, ratified copy.

⚠ **The `hi` positive pin (AC1) is a real test, ⛔ not a review promise.** The ruled Hindi words —
**जारी · बंद · सत्यापित** — are asserted PRESENT at `stage.*`, and the four retired Devanagari labels
(सक्रिय / अभिलेख / संग्रहण) are asserted ABSENT. ⭐ The story is right that the English ban is
structurally blind here and that `parity.test.ts` compares key sets, ⛔ never values.

#### ⚠⛔ THREE CORRECTIONS TO THE STORY, all checked ⛔ not inferred

**(1) ⛔⛔ `t()` does ⛔ NOT "interpolate an unsupplied token to nothing" — it THROWS.**
AC9, Task 2b and D2's note all state that an unrendered `{amount}` would put *"an empty rupee
figure"* on a page. ⭐ Verified at `packages/i18n/src/resolver.ts:36-42`: an unsupplied `{token}`
raises `[i18n] missing interpolation param`. ⇒ the real failure mode of a premature render is a
**500 / the outage arm**, ⛔ not a silently-wrong page. ⭐ **The conclusion is unchanged and the
guarantee is STRONGER**, but the premise is recorded correctly — in the test header, in both locale
`$comment` notes, and in the note written into `11b-14` — so the next reader does ⛔ not hunt for a
blank ₹ this resolver cannot produce.

**(2) ⚠ The `en` offender re-derivation disagrees with the story's list, in BOTH directions.**
Running Task 2's own script over the four files returns **nine** `sahyog-drive` hits, ⛔ not seven:
it **adds** `empty.body` (*"collection window"*) and **omits** `section.archive.help` (*"Paid out to
the family"* contains no banned substring — it is an **AC2** offender, ⛔ not an AC1 one).
⇒ ⭐ **the AC1 test is WORD-BOUNDARY, ⛔ not substring**, and that is load-bearing in both
directions: a substring `collect` would **false-fail on D3's own ratified AFTER copy**, which retains
*"the … window closes"* prose. ⛔ `empty.body` is left untouched — *"collection window"* is ⛔ not a
stage name, and D3's ruling keeps that phrase.

**(3) ⛔ Trap 8 is TEN files, ⛔ not nine — and Trap 1's site list missed one line.**
`apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:379` asserts
`expect(body.items[0]?.['status']).toBe('active')` inside the *publication-basis* test — ⛔ named
nowhere in Trap 1 or Trap 8, ⛔ invisible to the typecheck (it is a string against `unknown`), and it
went **RED only on the live-DB run**. ⭐ Found by sweeping the integration tree rather than working
the list. ⚠ Two further stale prose lines were also un-named and carried the **payout falsehood**:
`contracts/src/public-pages/sahyog-vivran.ts:75-76` and `domain/src/pool/public-read.ts:488`.

#### ⛔⛔ The `sahyog.server.ts` guard — the claim was MUTATION-TESTED, ⛔ not asserted

⚠ The story's sharpest warning is that `:202` can ship green and serve the **outage** page to 100% of
visitors. ⭐ That is now checked rather than believed. With the old literals restored:

| Suite | Through the defect |
|---|---|
| `tsc --noEmit` (all four packages) | ⭐ **GREEN** |
| `sahyog-copy` + `sahyog-render` | ⭐ **GREEN** — 113 passed |
| ⛔ `sahyog-serves.test.ts` (new) | ⛔ **RED** — 3 failures |

⇒ the story's claim is **confirmed exactly**, and the new file is the only thing in the tree that
catches it. ⭐ Its enum is **derived from the contract** (`PublicSahyogDriveStatus.options`), ⛔ never
hand-listed — a hand-listed tuple would drift the same way the guard did and pass through the very
defect it exists for. ⭐ It also asserts a **retired** token is still REJECTED, so the guard cannot
pass by being merely permissive.

#### ⭐ AC9 — the two dark tokens, and the coupling the ruling did ⛔ not anticipate

⭐ **Key paths shipped** (namespace **`sahyog-shared`**, both locales, verbatim from routing note
**§9.2**), and written into `11b-14`'s **AC7** and `11b-15`'s **AC4** by name:

| Key | Renders when |
|---|---|
| `index_line.full` | `{amount}` `{nominee_name}` `{family_name}` `{district_name}` all present |
| `index_line.no_nominee` | ⛔ no nominee name |
| `index_line.no_family` | ⛔ no consented family name |
| `index_line.no_district` | ⛔ no posting row |

⭐ **Ruling 3 as FOUR strings, ⛔ not eight** — one variant per absent token, ⛔ no cross-product.

⛔⛔ **AND A COUPLING RULING 3's WORDING DOES ⛔ NOT COVER, resolved and pinned.** Applied naively,
*"an absent token drops its clause"* leaves the district clause standing when `{family_name}` is
absent — but *"who served in {district_name} district"* / *"जनपद … में कार्यरत"* modifies the
**DECEASED MEMBER**. ⇒ the sentence would attribute the posting district to the **NOMINEE**: a
sentence-level factual claim about a named private individual that the data ⛔ cannot support — the
same class of defect §9.3 raised about *"nominee of"* itself. ⭐ `no_family` therefore drops the
dependent clause **with** its antecedent, and that is asserted, ⛔ not commented.
⛔ **Neither token is rendered anywhere** — proved by a repo-wide scan for any source file resolving
an `index_line.*` key (⭐ with the narrowing instruction for when story D lands, so the assertion is
tightened rather than deleted).

#### ⭐ Dispositions recorded, ⛔ not skipped

- ⭐ **`-194` cl.1 — SATISFIED BY CONSTRUCTION, ⛔ not built.** ⛔ No second guard added; asserted
  (`sahyog-empty-section.test.ts` pins that each guard appears **exactly once** and that the heading
  **and** the caption sit *inside* it — a guard wrapping only the `<tbody>` would still emit a
  heading over an empty table).
- ⭐ **The financial-truth `SCAN_FILES` tax — ⛔ NOTHING OWED, and the gate was RUN (green).** This
  story adds ⛔ no `.ts`/`.tsx`/`.astro` file to the Sahyog Vivran read path; its only new artifacts
  are `.json` locale files, which `isCandidateExt` (`check.ts:121`) ⛔ does not scan.
  ⇒ ⛔ `SCAN_FILES` **not extended** ([[project_access_wrapper_gate_pending_scope]] — *know when ⛔ NOT
  to extend*).
- ⚠ **D3's *"leave a one-line note in both locale files"* is discharged with a DEVIATION, stated
  openly.** JSON admits ⛔ no comments, and a note key in a **member-facing** namespace is a string
  the parity gate demands be translated. ⇒ the note rides a **`$comment`** key — ⭐ the convention
  this repo already uses at `locales/classification.json` — worded to contain ⛔ none of the banned
  words, and `$comment*` keys are excluded from the AC1 value scan **as developer notes that ⛔ never
  reach `t()`**. The same note is also at `sahyog-vivran-render.ts:348` and both `.astro` label
  blocks, as D3 requires.
- ⛔ **`outcome.under_funded` untouched**, and *pinned* as untouched by an equality assertion, so its
  survival is a recorded disposition rather than something a later pass "tidies".
- ⛔ **`apps/mobile` renders nothing** — the only mobile file added is a **resolution** test. ⛔ No
  component changed.
- ⛔ **`scrape-test.spec.ts:106`** (`statusActive: 'Active'`, beside `columnStatus` / `statusLockIn`)
  **left untouched** — verified in situ as the **member-directory** fixture AC1 carves out.
- ⛔ **`sahyog-vivran-client.test.ts`'s `'settled'` rejection stays GREEN**, and now carries a note
  saying why it must ⛔ not be "fixed": `settled` maps to `verified` and `spawned` to nothing, so the
  un-ruled internal words are still refused — which is the whole property.

#### ⭐ Verification actually run

| Gate | Result |
|---|---|
| `tsc --noEmit` — contracts · domain · apps/public · apps/api | ⭐ clean |
| `astro check` (52 files) | ⭐ 0 errors, 0 warnings, 0 hints |
| `eslint` — i18n · contracts · domain · public · api · mobile | ⭐ clean |
| unit — contracts 1100 · domain 1973 · public 481 · mobile 440 · i18n 80 | ⭐ all pass |
| live-DB `:5433` — `sahyog-drive.spec` + `sahyog-vivran.spec` (47) | ⭐ pass |
| live-DB `:5433` — `sahyog-drive-public-read.spec` (35) · `scrape-test.spec` (58) | ⭐ pass |
| `i18n:check-parity` · `catalog-registration` · `parity` | ⭐ pass |
| `microcopy` (308) · `sahyog-vivran-financial-truth` | ⭐ pass |

### File List

**Governance (Task 0, committed first and alone)**
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

**The shared copy source (new)**
- `packages/i18n/locales/en/sahyog-shared.json`
- `packages/i18n/locales/hi/sahyog-shared.json`
- `packages/i18n/src/catalog.ts`

**Copy**
- `packages/i18n/locales/en/sahyog-drive.json`
- `packages/i18n/locales/hi/sahyog-drive.json`
- `packages/i18n/locales/en/sahyog-vivran.json`
- `packages/i18n/locales/hi/sahyog-vivran.json`

**The wire, the maps, the four RULE doc-blocks**
- `packages/contracts/src/public-pages/sahyog-drive.ts`
- `packages/contracts/src/public-pages/sahyog-vivran.ts`
- `packages/domain/src/pool/public-read.ts`
- `packages/domain/src/pool/sahyog-vivran-read.ts`

**Render layer + the two runtime guards + the pages**
- `apps/public/src/lib/sahyog.server.ts`
- `apps/public/src/lib/sahyog-vivran.server.ts`
- `apps/public/src/lib/sahyog-render.ts`
- `apps/public/src/lib/sahyog-vivran-render.ts`
- `apps/public/src/lib/surface-fields.ts`
- `apps/public/src/pages/sahyog.astro`
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro`

**Tests — new**
- `apps/public/tests/sahyog-serves.test.ts`
- `apps/public/tests/sahyog-stage-vocabulary.test.ts`
- `apps/public/tests/sahyog-empty-section.test.ts`
- `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`
- `apps/mobile/tests/unit/sahyog-stage-copy-resolves.test.ts`

**Tests — re-shaped or repaired**
- `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts`
- `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`
- `packages/contracts/tests/public-pages-sahyog-vivran.test.ts`
- `packages/domain/tests/pool/sahyog-vivran-read.test.ts`
- `packages/domain/tests/integration/pool/sahyog-drive-public-read.spec.ts`
- `apps/public/tests/sahyog-copy.test.ts`
- `apps/public/tests/sahyog-vivran-copy.test.ts`
- `apps/public/tests/sahyog-render.test.ts`
- `apps/public/tests/sahyog-vivran-render.test.ts`
- `apps/public/tests/sahyog-vivran-client.test.ts`
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts`

**Sibling-story handoffs (key paths written in BY NAME)**
- `_bmad-output/implementation-artifacts/11b-14-live-drives-listed-and-the-progress-meter.md`
- `_bmad-output/implementation-artifacts/11b-15-member-drive-list-fourth-tab.md`

**Friction budget (Task 7, after the code commits)**
- `_bmad-output/implementation-artifacts/friction-budget.md`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `2026-09-04-195` cl.3 (story **B**). ⚠ **D1 is OPEN and blocks Tasks 2-5.** ⭐ Two findings at authoring: `-194` cl.1 is **already satisfied** by the existing `.length > 0` guards, and the ruled words **collide with a shipped anti-leak test**. | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (b) — align the wire, allow-list the test.** Task 1 closed, Tasks 2-5 unblocked. ⚠ The overlap with internal names must be EXPLAINED where the assertion lives, or it reads as the `-144` cl.8 defect. | BigDev + Claude |
| 2026-09-05 | 0.3 | ⭐ **Validation pass — six critical corrections.** Baseline re-pointed `30683cef` → `054ff76a`: **story A has landed** and rewrote six of this story's files (`PublicSahyogVivranStatus` moved `:75` → `:88`). The anti-leak collision is **THREE** sites, ⛔ not one — including a **doc-block stating a stale RULE** that ⛔ no gate catches. **D1 gains a mapping table**: the index enum stays **TWO** members, resolving its contradiction with AC7. **Trap 2 gains a third false string** — `page.intro` — which AC2's literal, case-sensitive assertion would have **missed**. **Task 5 inverted**: `apps/mobile` has ⛔ no stage surface and **story E owns building one** — B ships the source, ⛔ renders nothing. New: Trap 6 (`catalog.ts`'s five hand-edits), Trap 7 (the render layer the `.astro` files delegate to), Trap 8 (six shipped test files that go red), AC8 + Task 7 (the friction-budget disposition), and a **Files this story touches** table. | BigDev + Claude |
| 2026-09-06 | 1.0 | ⭐⭐ **IMPLEMENTED — Tasks 0-6.** The three stages are **Live · Closed · Verified**, from **ONE** new registered namespace `sahyog-shared`, on both locales and both public surfaces; the **three false payout sentences are GONE** from a live page; the wire is aligned (index **TWO** members, drive page **THREE**); all **nine** Trap 1 sites re-shaped DENY→ALLOW with the cl.8 note; the `<details>` affordance establishes `apps/public`'s first disclosure pattern (marker reset + focus ring); AC9's four dark index-line variants authored and rendered **nowhere**. ⚠⛔ **THREE CORRECTIONS TO THIS FILE, all checked ⛔ not inferred: (1) `t()` ⛔ does NOT interpolate an unsupplied token to nothing — `resolver.ts:36-42` THROWS**, so a premature dark-token render is a **500**, ⛔ not a blank ₹ (AC9/Task 2b/D2 all state otherwise; corrected in the test header, both locale notes and the note written into 11b-14). **(2) The `en` offender list is wrong in BOTH directions** — Task 2's own script returns **nine** hits, adding `empty.body` and omitting `section.archive.help` ⇒ the AC1 test is **word-boundary**, ⛔ not substring, because a substring `collect` **false-fails on D3's own ratified AFTER copy**. **(3) Trap 8 is TEN files** — `sahyog-drive.spec.ts:379` was named nowhere, is invisible to the typecheck, and went red only on the live-DB run; plus two un-named prose lines still carrying the payout falsehood (`sahyog-vivran.ts:75-76`, `public-read.ts:488`). ⭐⭐ **AND THE `sahyog.server.ts:202` CLAIM WAS MUTATION-TESTED, ⛔ not believed:** with the old literals restored the typecheck and 113 copy/render tests stay **GREEN** while the new `sahyog-serves.test.ts` goes **RED** — the story's warning confirmed exactly. ⭐ AC9's ruling 3 also exposed a **coupling the ruling does not cover**: dropping `{family_name}` must drop the district clause **with** it, or the sentence attributes the deceased's posting district to the **NOMINEE**. | BigDev + Claude |
| 2026-09-06 | 0.5 | ⭐⭐ **Second validation pass — six critical corrections, and the blast radius grew again.** ⛔⛔ **`sahyog.server.ts:202`** — the **index** literal-set runtime guard — was **missing entirely**; ⚠ its failure arm is the page's **OUTAGE** state and ⛔ the typecheck ⛔ cannot see it, so the whole rename could ship green and serve *"unavailable"* to every visitor (**AC1** now demands an end-to-end serve assertion; it is Task 4's **first** subtask). ⛔⛔ **`sahyog-render.ts:338`** — the **section partition**, ⛔ not the `:296` label ternary — was missing; the file's own `:178-184` records that breaking it rendered every drive **twice under contradictory headings**. ⭐⭐ **AC9 + Task 2b ADDED:** the `{amount}` / `{nominee_name}` **dark copy tokens** existed ⛔ only inside D2's prose, in ⛔ no AC and ⛔ no task — while **`11b-14` AC7 (added `31153962`) is already written against them**; per [[feedback_spec_edits_must_propagate_to_tasks]] B would have shipped nothing and D would have minted its own, ⭐ recreating the two-source defect `-193` cl.3 closes. ⚠ **Trap 1 is NINE sites, ⛔ not three** — split into **four un-gated RULE doc-blocks** (incl. `sahyog-vivran.ts:83-86`'s *"⛔ Not a mistake to tidy"*, which ⛔ instructs the next reader not to do what D1(b) rules) and **five assertions that go RED** (two of them in `sahyog-vivran-read.test.ts`, listed nowhere before). ⚠ **Trap 8 is NINE files, ⛔ not six**, and `scrape-test.spec.ts:106` was a **mis-citation** — it is the **member-directory** fixture AC1 carves out, and editing it was an instruction to introduce a defect. ⚠ **Seven `en` locale values carry the retired words, ⛔ not four**; and **AC1's word ban is structurally blind to `hi`** (zero English hits by construction). ⭐ Also: `sahyog-vivran-read.ts:478` gates the funding verdict on the token; `[driveToken].astro` is `:127-131`; **D2 restated as CLOSED once** (it had read *open* in three places and *closed* in a fourth), with its three rulings routed; baseline re-pointed `054ff76a` → `31153962`, ⭐ **governance-only, ⛔ no code moved.** | BigDev + Claude |
| 2026-09-05 | 0.4 | ✅ **D3 RULED — the ban is on rendered VALUES, ⛔ not key names.** `collecting.title`/`.body` keep their keys, their copy is rewritten. ⚠ The resulting code/word divergence is a **knowing, ruled trade** and is noted at the call sites so it is ⛔ not "fixed" or re-filed. 🟡 **D2 OPENED and ROUTED, ⛔ non-blocking** — `outcome.under_funded`'s *"the trust met its commitment"* may imply a disbursement `-192` says never happens; ⛔ a copy story has ⛔ no authority to decide what the trust promises. | BigDev + Claude |
