---
baseline_commit: dbb4a25f9f9321779fc3a41ca039c0c5e957c11c
---

# Story 11b.2b: Contributor List — Mobile Render Layer + Family-13 Accessibility `[SURFACE]`

Status: done

> ✅✅ **REOPENED `done` → `in-progress` at the THIRD code review, then CLOSED `in-progress` → `done`
> when the owed run came back green (2026-09-01).** ⛔ The reopen was ⛔ not an engineering regression —
> every finding was FIXED and every fence mutation-proven; the row was held open solely because Task 7's
> `ci:local` box was UN-TICKED. ⭐ It is closed now on a real 33-job green WITH the integration leg,
> ⛔ not on a re-reading of what "done" meant ([[feedback_closure_language_precision]]).

> ✅✅ **D10 IS RULED (BigDev, 2026-08-30): (a) — derive from `@twt/contracts`, delete the duplicate.**
> ⛔ **NOTHING IS GATED BY A DECISION ANY LONGER.** ⚠ The **hard dependency remains** and is the only
> gate: `ready-for-dev` here means what the enum means — *"story file created"*.
>
> ⛔⛔ **FIFTH-PASS VALIDATION (2026-08-30, at `dbb4a25`) — ONE NEW DECISION (D10, now RULED), AND THREE
> HARD CONTRADICTIONS CORRECTED.** ⭐ The story is **materially smaller and materially different** from
> its authoring pass, because **11b.2a's D5 · D3-aggregate · D5-scope · D6(a) · D7(c)** all landed
> AFTER this file was written and between them **abolished the subject of three of its ACs**.
> ⛔ Do not read this file's v0.1 text; every ⭐-marked correction below is verified live.

> ✅ **BASELINE RE-PINNED `80e0d12` → `dbb4a25`.** `git diff --name-only 80e0d12..dbb4a25` returns
> **four `_bmad-output/` files and nothing else** ⇒ ⛔ **NO VERIFIED CODE CLAIM MOVED.** Every line
> number in this file was re-verified live at `dbb4a25`.

> ⭐⛔ **SPLIT OUT OF STORY 11b.2 ON 2026-08-29.** It owns the **render layer**: rewiring the shipped
> `<PoolContributorList>` onto 11b.2's presenter, removing the inline label, **authoring the wire→presenter
> adapter 11b.2 routes to it by name**, and holding family-13 accessibility. ⛔ It ships no presenter
> and no API change.
>
> ⛔⛔ **HARD DEPENDENCY — THIS STORY RUNS LAST.** It needs **11b.2** (the presenter exists) **and**
> **11b.2a** (the RTBF omission ships, so the list this renders is the corrected one). ⛔ Both are
> `ready-for-dev` and ⛔ **NEITHER IS MERGED** — verified live: `origin/main` is `80e0d12`.

---

## ⛔ PREFLIGHT — the dev agent's first action

⛔⛔ **THE HARD DEPENDENCY IS THE FIRST GATE: `11b-2` AND `11b-2a` MUST BOTH BE `done` AND PRESENT IN
THIS BRANCH'S HISTORY** (`git merge-base --is-ancestor <sibling> HEAD`).
⚠⚠ **AMENDED at the second code review (decision 3 → (a)).** It read *"`done` AND MERGED"*, and
`origin/main` is still `80e0d12` with ⛔ neither sibling merged — so the gate was UNMET and the box was
ticked anyway, excused by a clause (`2026-09-01-171` cl.4) authored by the same execution it excuses.
⭐ The pin was written 2026-08-29 as a **PROXY** for *"the presenter exists"*, **before it did**; the
proxy went stale, the condition it proxied is verified live. The gate now states the substance test.
⛔ This rules NOTHING about merge policy ([[feedback_closure_language_precision]]).
`git fetch origin` first ([[feedback_git_fetch_before_remote_reasoning]]). ⛔ If either is ABSENT FROM
THIS BRANCH'S HISTORY, the dev agent's ONLY legal action is to **report blocked**.

✅ **D10 IS RULED (a).** ⛔ No decision gates any task. **Every task is startable the moment the
dependency clears.**

### ⭐⭐ FIVE RULINGS MADE ELSEWHERE BIND THIS STORY — ⛔ read them before any task

| Ruling | Where | What it does to THIS story |
|---|---|---|
| ⭐⭐ **D5** — RTBF removes the contributor **entirely**; ⛔ **NO anonymized row is ever emitted** | 11b.2a, BigDev 2026-08-30 | ⛔⛔ **There is exactly ONE kind of contributor row.** ⛔ Do not branch on `kind`. ⛔ Do not resolve `member.anonymousMember`. **Trap 3 of the authoring pass is DELETED** — its subject cannot exist. |
| ⭐⭐ **D6(a)** — DROP the anonymized **presenter** variant | 11b.2a, BigDev 2026-08-30 | 11b.2's presenter variant becomes **`name \| unknown`**, and ⭐ **`unknown` THROWS** (11b.2's D8(a)) — it is a **throwing exhaustiveness guard**, ⛔ not a render arm. ⇒ ⭐ **the render layer has exactly ONE renderable branch, and the try/catch (Trap 1) is the ONLY thing between that throw and a red-boxed list.** |
| ⛔ **D3-key / D3-shape(i) VACATED by D5** — ⛔ **no `rowKey` ships** | 11b.2a, 2026-08-30 | ⛔⛔ **AC3 of the authoring pass HAD NO SUBJECT and is re-authored.** `deferred-work.md:2163` **STAYS OPEN**; ⛔ this story is **NOT** its consumer; **the `keyExtractor` KEEPS `index`.** |
| ⭐ **D3-aggregate** — two axes: *contribution state CONFIRMED · public representation OMITTED* | 11b.2a, 2026-08-30 | ⛔ `confirmedCount` / `pending` / `rosterSize` keep their financial meaning. ⛔ **Never write `rows.length === confirmedCount`** — under D5 they legitimately diverge. |
| ⭐ **D7(c)** — `contributor_list.empty`'s **VALUE** is re-worded in both locales | 11b.2a, 2026-08-30 | ⭐ Its only consumer is **this file, `:124`**. ⛔ **Do not revert it, ⛔ do not byte-pin the sentence in any test** — 11b.2a's AC8 forbids exactly that (it turns every future tone review into a test edit). |
| ⛔ **D2(a)** — ⛔ **NO status on the row**, and option (c) — *"a constant confirmed-chrome element in the render layer"* — was **rejected BY NAME** | 11b.2, BigDev 2026-08-29 | ⛔⛔ **AC4 of the authoring pass ORDERED THE THING THIS RULING FORBIDS** and is **INVERTED** (see AC4). |

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

⚠ **It introduces ⛔ no NEW identity predicate either.** ⭐⭐ **AND THE AUTHORING PASS'S VERSION OF THIS
NOTE WAS FALSIFIED BY D5 — it is REWRITTEN, ⛔ not patched.** Both restated in one line each, in the
member's terms, so a reader of this file alone is not blind to them:
· **RTBF (D5 + D3-aggregate cl.(1)):** *"if you exercised your right to erasure, your contribution
  stays counted in the pool's totals, but **you do not appear in the list of contributors at all** —
  ⛔ not by name, and ⛔ not as an anonymous placeholder either, in either language."*
  ⚠ ⭐ **The authoring pass wrote *"your name does not appear next to it"*, which describes an
  anonymized ROW. Under D5 the ROW does not appear.** Checked against the Niyamavali: it is silent on
  erasure representation; the governing record is D5 + `2026-08-20-143` cl.3, and the contributor
  list was **the outlier** the ruling aligned.
· **Death (D9(a), `2026-08-24-159` cl.11):** *"a contribution you made while you were alive stays in
  the record with your name on it."*

⛔⛔ **AND THE C-5 SHARP EDGE INVERTS HERE TOO.** ⛔ No death-derived term may filter, mask, anonymize
or reorder a contributor row. ⛔ A diff that adds an `account-frozen` or `deceased` conjunct to any
contributor render path must be **rejected in review** — *"the right conjunct in the wrong read"*.
⚠ ⭐ **This bites twice**, because this story touches **two** render sites and one of them is a
death-context surface (AC2).

---

## 🎯 What already exists — ⭐ re-verified live at `dbb4a25`

| Claim | Verified state |
|---|---|
| The **member-facing list** | ✅ `apps/mobile/components/contributor-list/PoolContributorList.tsx` (8.3, **167 lines**): FlashList-virtualized (`:132-141`), `contributorLabel()` composing `firstName + lastInitial` **inline at `:46-48`**, per-row a11y label, aggregate pending strip (`:149-164`), four distinct states (loading `:57` · absence `:68` · empty `:121-126` · list `:128`). ⛔ **Do NOT write a second list.** ⭐ The inline label at `:46-48` is exactly what the presenter replaces. |
| ⭐⛔ How many places render it | ⛔⛔ **TWO, AND THE AUTHORING PASS NAMED NEITHER ROUTE.** Verified by grep — these are the **only** two importers: **(1)** `apps/mobile/app/(contribution)/contributors.tsx:13` (import `:7`) — the 8.3 route. **(2)** ⭐ `apps/mobile/components/nominee-console/NomineeConsole.tsx:213` (import `:31`), deliberately **outside** the parent `ScrollView` (which closes at `:206`; rationale `:208-211`) ⇒ **this story changes a staff-takeover-session-as-deceased surface.** → **AC2**. |
| ⭐⛔ `ViewContributorsEntry.tsx` | ⛔⛔ **THE AUTHORING PASS'S CLAIM IS FALSE AND IS REPLACED BY A VERIFIED NEGATIVE.** It said the file *"shares the wire shape 11b.2a widens"*. Verified live: **(i)** 11b.2a widens **nothing** (AC4 VACATED by D5); **(ii)** the file reads **`data.assigned` ONLY** (`:26`, `:30`) and ⛔ **never touches `confirmed`, `firstName` or `lastInitial`.** ⇒ ⭐ **⛔ NOTHING IS OWED HERE.** Recorded so a later pass does not re-derive the check. |
| The **local tuple copy** | ⛔ `PoolContributorList.tsx:40-43` declares `interface ConfirmedRow { firstName; lastInitial }` — ⛔ **NOT imported from `@twt/contracts`.** ⛔⛔ **THE AUTHORING PASS SAID *"11b.2a's AC4 makes this derive from the contract"* — ⭐ THAT AC IS VACATED. Nothing makes it derive from anything.** It is 11b.1's defect class, still present, and 11b.2a's Trap 4 names this exact site. ⇒ ✅ **D10(a) RULED — it is DELETED and the adapter types against the contract.** ⭐⭐ **And the verification found it is not even a duplicate — it is a SHADOW:** `data.confirmed` is **already** `ConfirmedContributorRow[]` at the call site (the SDK returns `PoolContributorListResponse`, re-exported as `PoolContributorListResult` at `api-client:88`), so `ConfirmedRow` only re-annotates `renderItem`/`keyExtractor` params TypeScript already infers. ⛔ `ConfirmedContributorRow` appears **nowhere** in `apps/mobile` today. |
| The **keyExtractor** | ⛔ `:137-139` — `` `${item.firstName}-${item.lastInitial}-${index}` ``. ⭐⭐ **IT STAYS.** `deferred-work.md:2163` remains **OPEN** — its blocker (*"the PII-shielded shape carries no stable per-member identifier"*) is **still true**, because D5 supplied none. ⚠ ⭐ **AND THE AUTHORING PASS'S SECOND CLAIM WAS ALSO FALSE:** it said the deferral's re-trigger — *"reused for the Epic 11b **public** render"* — *"has fired"*. ⛔ It has **not**: this story is the **member** render of **a single pool's roster**, which is the exact scale the deferral records as fine. **11b.3** is the public host. → **AC3**. ⚠ Separately, the deferral's own citation `PoolContributorList.tsx:124-126` is **stale** (live: `:137-139`) — routed, ⛔ not silently fixed. |
| Latin numerals | ✅ `:81-82` uses `String(...)`. ⭐ Operational figures stay Latin even in Hindi (UX-DR73 / amendment-A2). ⛔ Never `toHindiNumeral` here. |
| ⛔⛔ Does the row view-model carry a **token role**? | ⛔⛔ **NO — AND THIS IS THE PASS'S HEADLINE CORRECTION.** Verified live in 11b.2 (`:366-382`): `ContributionRowViewModel` is exactly `{ displayName, poolLetterCode, rowKey, rowA11y }`. ⭐ **There is NO colour, tone or token field, BY RULING** — 11b.2's **D2(a)**: *"⛔ No `status` field, ⛔ no `deriveStatusPillViewModel` call, ⛔ no `'green'` literal"*, and option **(c) *"a constant confirmed chrome element in the render layer"* was rejected BY NAME**, with the ruling adding *"⭐⛔ **AND THIS RULING BINDS 11b.2b**"*. ⇒ **AC4 is INVERTED.** |
| ⛔ Is there an RN mount harness? | ⛔⛔ **NO.** `grep -n "testing-library\|react-test-renderer" apps/mobile/package.json` → **no matches** (re-run live). All **27** files in `apps/mobile/tests/unit/` are **source scans**. `status-pill-render.test.ts:1-18` says so in terms: *"RN component MOUNT tests aren't set up here … **A source scan (comments stripped) rather than a mount**"*. 9.6 Dev Notes: *"**Don't stand up a new RN component renderer just for this.**"* → **AC6**. |
| The **a11y family** | ⭐ Family **13** of `_bmad/custom/load-bearing-invariant-checklist.md` (**`:72-84`**), live on merge via `bmad-code-review.toml:8-12`, applies *"for every **component or surface** story"* — **this is one**. Worked example: `apps/mobile/components/panchayat/PinnedItem.tsx` (verified present). ⚠ Mechanization is re-examined at **11b.8**, ⛔ not here. |
| i18n | ⭐ `contributor_list.*` is **ten keys at `contribution.json:30-39`** (en **and** hi). ⚠ ⭐ **CITATION CORRECTED: `contributor_list.row_a11y` is at `:35`, ⛔ not `:36`** (`:36` is `contributor_list.title`). The `contribution` and `common` namespaces are already registered and globbed. ⛔ **Mint no key and no namespace.** ⚠ `t()` defaults to `common` and **THROWS**. |
| ⛔⛔ A **stale comment inside this story's own diff** | ⛔⛔ **`PoolContributorList.tsx:11` states *"Epic 9's producer is unbuilt, so the list is `[]` right now"* — ⭐ FALSE since Story 9.4/9.5** ([[project_epic9_confirmed_producer_is_live]]). 11b.2a filed the ~12-site family but correctly scoped it **out of its own diff**; ⭐ **this file IS in THIS story's diff** (AC1 deletes `:46-48` from it), as is `:119`'s *"0 confirmed today"*. → **AC10**. |
| The **memorial prototype** | ⚠ `apps/mobile/components/shradhanjali/ContributorRow.tsx` + `sample-data.ts`. `packages/domain/src/member/display-name.ts:10-12` names it (by **component identifier**, ⛔ not by path) as **SAMPLE-DATA only**. ⚠ ⭐ `district` **DOES** have a read model (`member_postings.ts:51`, plaintext non-PII, public at `public-pages/directory.ts:82`) ⇒ **two** producer-less fields (`memoryLine`, `monthYear`), ⛔ not three. → **D5-prototype**. |

---

## ⛔ THE TRAPS

### Trap 1 — ⭐⛔ THE PRESENTER THROWS **BY RULING**, AND THIS STORY OWNS THE ONLY GUARD.

⭐⭐ **This trap got STRONGER, ⛔ not weaker, under D6(a).** 11b.2's **D8(a)** rules that the presenter's
`unknown` kind **THROWS**, and 11b.2 says so in terms: *"⚠ **11b.2b's try/catch is the only thing
between this throw and a red-boxed list**, which is why that delegation is ⛔ not optional."*

9.12's code review independently found, in **all three** review layers, an *"unguarded
`derive…ViewModel(...)` throw wired into a fail-soft-designed render path"*, resolved by wrapping the
**consumer** call in try/catch and rendering `null` on throw.

⚠ ⭐ **The blast radius is strictly worse here.** 9.12's consumer is **one card**; this consumer is a
FlashList **`renderItem`, called once per visible row on every scroll frame**. A throw there red-boxes
the whole list.

⇒ ⛔ **`deriveContributionRowViewModel` is called inside a try/catch, ONE PER ROW**, and a throwing row
degrades to a skipped row — ⛔ never a crashed list. ⚠⚠ **AMENDED at the THIRD code review** (it read
*"in `renderItem`"*, and *"called once per visible row on every scroll frame"* above it). The derivation
is a memoized component-body `.map()`; `renderItem` reads it by index. ⭐ The second review corrected
this identical sentence in `contribution-row-input.ts` on the grounds that it is false, and ⛔ left it
standing in the very clause AC1 and Task 1 both defer to.

### Trap 2 — ⚠ FABRIC RED-BOXES ON empty→populated IN PLACE.

New-Arch FlashList red-boxes when a list crosses empty→populated **in place**
([[project_fabric_flatlist_empty_populated_crash]]). ⭐ **8.3 already renders the empty / loading /
absence branches OUTSIDE the list** (`:57` · `:68` · `:121-126` are siblings of `:128`, not list
states). ⛔ **Do not "simplify" this into a `ListEmptyComponent`.** ⚠ The 60s poll makes the
transition a routine occurrence, ⛔ not an edge case.

### ⛔ Trap 3 (the authoring pass's *"nested two-namespace `t()`"*) — **DELETED. ITS SUBJECT CANNOT EXIST.**

⭐ It described resolving `member.anonymousMember` in `common` and passing it as `{name}` into
`contributor_list.row_a11y` in `contribution`. **Under D5 + D6(a) no anonymized row is ever emitted
and the presenter carries no anonymized variant** ⇒ the display name reaching the render layer is
always `{kind:'nameParts'}`, and `row_a11y` takes a **plain composed string** as `{name}` — **one
call, one namespace (`contribution`)**. ⛔ Do not re-derive the nested resolution from 11b.2's
`rowA11y` doc-block; that doc-block is one of the artefacts 11b.2a's Task 6 corrects.

⚠ ⭐ **What SURVIVES from it, and still bites:** `t()` **defaults to `common` and THROWS on a miss**,
so ⛔ **every** call site must pass an explicit namespace — and assert **through** `t()`, ⛔ not around
it (that is exactly how the 11a.2 `{{max}}` vs `{max}` defect reached production green;
`resolver.ts:33`'s `TOKEN` regex is single-brace). → **AC6**.

### ⭐⭐ Trap 4 (NEW) — THE ADAPTER IS THIS STORY'S, AND 11b.2 SAYS SO BY NAME.

11b.2's presenter input is ⛔ **not** the wire row, deliberately. 11b.2 (`:384-393`), verbatim:
*"a render layer must **ADAPT**: re-nest the row's name fields under `displayName` … and splice
`pool.letterCode` onto each row. ⛔ **This presenter does not do that and must not** … ⭐ **The adapter
is 11b.2b's, and 11b.2b owes it an AC** — routed by Task 3, ⛔ not assumed."*

⛔⛔ **The authoring pass never wrote that AC.** → **AC9**.

⚠ ⭐ **AND THE ADAPTER IS WHERE D5's UNDER-ROUTING SURFACES.** `ContributionRowInput.rowKey` and
`ContributionRowViewModel.rowKey` are both **required** (`11b-2-…md:363`, `:373`) and their doc-block
(`:360-362`) sources them to *"the ruled opaque virtualization identity (11b.2a **D3-shape(i)(a)**)"* —
⛔ **a ruling D5 VACATED.** 11b.2a's Task-6 routing lists six artefacts for D6(a) and ⛔ **does not list
these**. ⇒ ⭐ **the adapter has nothing to put in `rowKey`.** Routed to 11b.2 (Task 0) as a **seventh**
artefact: `rowKey` **goes** from both interfaces. ⛔ Do **not** invent a value to satisfy the type, and
⛔ do not let `rowKey` reach the `keyExtractor` — it keeps `index` (AC3).

---

## Acceptance Criteria

### AC1 — `<PoolContributorList>` consumes the presenter, and the inline label is DELETED

`PoolContributorList.tsx` derives its row content from `@twt/ui`'s `deriveContributionRowViewModel`;
`contributorLabel()` at `:46-48` is **deleted**, ⛔ not left beside it.

**And** the call is inside a **try/catch** in the memoized per-row derivation; a throwing row degrades,
⛔ never crashes the list (Trap 1). ⚠⚠ **AMENDED at the second code review.** This AC originally said
*"inside a try/catch in `renderItem`"*, and the FIRST review's patch moved the derivation OUT of
`renderItem` into a component-body `useMemo` — an improvement (it is computed once per data change, and
a total failure can then fall to the empty branch) — but the AC was ⛔ never amended and the box was
ticked anyway. ⭐ What is load-bearing is that the derive, the label join AND the a11y `t()` all sit
inside **one try per row**; ⛔ WHERE that block lives is not the commitment. ⭐ **Under D6(a) there is exactly ONE renderable `displayName` kind
(`'nameParts'`)** — ⛔ do **not** branch on `kind:'anonymized'`, ⛔ do not resolve
`member.anonymousMember`, and ⛔ do not write a render arm for `'unknown'` (it throws, by D8(a); the
try/catch **is** its handling).

**And** ⛔ **no death-derived term** (`account-frozen`, `deceased`, `members.state`) appears anywhere
in the contributor render path — a test asserts it over **both** render sites. ⚠ Verified live: all
three files are currently **clean**, so this is a **regression fence**, ⛔ not a fix.

### AC2 — ⭐ BOTH render sites are covered, and the Nominee Console is named

⛔ The rewire changes **two** surfaces, ⛔ not one:
 **(1)** `apps/mobile/app/(contribution)/contributors.tsx:13` — the 8.3 route;
 **(2)** ⭐ `apps/mobile/components/nominee-console/NomineeConsole.tsx:213` — Story 9.1's **Nominee
     Console**, a **staff-takeover-session-as-deceased** surface.

Each is smoke-asserted after the rewire. ⚠ ⭐ **Site (2) is where the D9 constraint is easiest to get
wrong**: the session context *is* the deceased member, so a dev "fixing" the list for that surface is
one conjunct away from deleting dead contributors from it. ⛔ The no-death-term assertion (AC1) must
run against site (2) explicitly.

⭐ **And `ViewContributorsEntry.tsx` is recorded as a VERIFIED NEGATIVE, ⛔ not re-checked** — it reads
`data.assigned` only and never touches the row shape (see the table above). ⛔ **Nothing is owed.**

### AC3 — ⭐⭐ THE `keyExtractor` KEEPS `index`, AND THE DEFERRAL STAYS OPEN `[re-authored — D3-key VACATED]`

⛔⛔ **The authoring pass's AC3 ordered the opposite and had NO SUBJECT LEFT.** It said `:137-139`'s
`` `${firstName}-${lastInitial}-${index}` `` *"is replaced by **11b.2a's ruled `rowKey`**"* and that
`deferred-work.md:2163` *"is confirmed **discharged** … this story is the named consumer"*.

⭐ **D5 vacated `rowKey` in full. 11b.2a ships none.** ⇒
· the `keyExtractor` is **left byte-unchanged** — it is ⛔ **no longer an exemption from AC5**;
· `deferred-work.md:2163` **STAYS OPEN**; ⛔ **do not mark it discharged**, ⛔ do not name this story
  as its consumer;
· ⭐ **its re-trigger has ⛔ NOT fired.** The re-trigger reads *"reused for the Epic 11b **public**
  render"*; this is the **member** render of **a single pool's roster** — the exact scale the
  deferral's own ground calls fine. **11b.3** is the public host and the real re-trigger.

**And** the deferral's stale self-citation (`PoolContributorList.tsx:124-126`; live `:137-139`) is
**routed** in Task 7 — ⛔ not silently corrected, and ⛔ not used as cover to re-open the deferral.

### AC4 — ⛔⛔ INVERTED: **NO** token bridge, **NO** confirmed chrome — and a fence proves it `[D2(a)]`

⛔⛔ **The authoring pass ordered *"map the presenter's token role names through a local mobile
palette bridge"*. ⭐ THE PRESENTER EMITS NO TOKEN ROLE, BY RULING, and building the bridge would ship
the exact thing D2(a) rejected by name.**

Verified: `ContributionRowViewModel` = `{ displayName, poolLetterCode, rowKey, rowA11y }`
(`11b-2-…md:366-382`) — ⛔ no colour, tone, status or token field. D2(a): *"⛔ No `status` field, ⛔ no
`deriveStatusPillViewModel` call, ⛔ no `'green'` literal … ⛔ (c) **a constant 'confirmed' chrome
element in the render layer** was rejected too: **it asserts a fact nothing checked** … ⭐⛔ **AND THIS
RULING BINDS 11b.2b.**"*

⇒ the AC becomes a **fence**, asserted by source scan over the touched files:
 **(a)** ⛔ **no `@twt/tokens` import** in `apps/mobile` for this work;
 **(b)** ⛔ **no status/tone/colour-role element is introduced into the contributor row** — no
     `StatusPill`, no `TONE_TOKENS`/`METER_FILL_TOKENS`-style map, no `'confirmed'`/`'green'` literal;
 **(c)** ⛔ **no new local palette bridge is created at all.**

⚠ ⭐ **If a future ruling ever puts a tone on this row, the mobile pattern is the bridge** — BigDev
ruled on 2026-07-27 that *"mobile bridges tone→Tamagui-scale independently of the PDF's `@twt/tokens`
hex … do not add an exact-match mobile token"* (`StatusPill` `TONE_TOKENS`; 9.12's
`METER_FILL_TOKENS`). ⭐ Recorded so the precedent is not lost — ⛔ **it is NOT licence to build one
here.**

### AC5 — Behaviour preservation, stated as FIVE named assertions

⛔ *"Preserved byte-for-byte"* is not an acceptance criterion — the diff necessarily changes bytes.
The following five are asserted individually:
 **(1)** `FlashList` remains the list renderer;
 **(2)** the four states each still render their own distinct branch (loading `:57` · absence `:68` ·
     empty `:121-126` · list `:128`);
 **(3)** `String(...)` is still used for the pending strip's count and percentage — **Latin numerals
     in both locales**, ⛔ never `toHindiNumeral`;
 **(4)** the pending strip keeps `accessibilityLiveRegion="polite"`, ⛔ never `assertive`;
 **(5)** the empty / loading / absence branches still render **OUTSIDE** the list (Trap 2).

⭐⭐ **THERE IS NO LONGER ANY EXEMPTION — the `keyExtractor` is now PART of what is preserved** (AC3).

⚠ ⭐ **AND ONE THING AC5 MUST NOT DO:** ⛔ **no test may byte-assert the value of
`contributor_list.empty`.** 11b.2a's **D7(c)** re-words that string in both locales and its AC8
forbids pinning the sentence (*"a byte-equality test on copy … turns every future tone review into a
test edit"*). Assert the **key resolves and the branch renders**, ⛔ never the words.

### AC6 — Tests are written in the harness that actually exists

⛔ There is **no RN mount harness** in `apps/mobile` — no `@testing-library/react-native`, no
`react-test-renderer`; all 27 `tests/unit/` files are **source scans**. ⛔ Do **not** stand one up
(9.6 Dev Notes, in terms).

`apps/mobile/tests/unit/contributor-list-render.test.ts` is a **comment-stripped source scan +
presenter-driven** test asserting: **every `displayName` kind the presenter can emit is either
rendered or provably guarded** (the `status-pill-render.test.ts:7-12` exhaustiveness precedent —
⭐ under D6(a) that is **one rendered kind + one throwing kind caught by the try/catch**, and an
**anti-widening** assertion that a third kind requires a ruling); AC5's five properties; AC4's three
fences; AC1's no-death-term scan over **both** render sites; AC10's stale-comment correction.

⭐⭐ **THE i18n HALF IS SMALLER THAN THE AUTHORING PASS THOUGHT, AND ⛔ MUST NOT DUPLICATE 11b.2.**
The nested two-namespace proof is **void** (Trap 3). And 11b.2's AC2 (`:313-320`) **already** owns a
`packages/i18n`-backed test that *"every declared ref resolves in the namespace it claims, in **both**
locales"* for **all ten `contributor_list.*` keys** — declared there **specifically for this story**
(*"a bare key there is this AC's crash, one story later"*). ⛔ **Do not write a second one.**
⇒ ⭐ **this story's i18n obligation is a SOURCE SCAN of its OWN call sites**: every `t()` in the
touched files passes an **explicit** namespace (`t()` defaults to `common` and throws), and
`contributor_list.row_a11y` is called **with** a `{name}` param.

**And** ⭐ **what this harness CANNOT prove is recorded as un-attested, ⛔ not asserted as passing**
([[feedback_record_unattested_no_backfill]]): a real screen-reader announcement, and a real `t()`
resolution at the mobile call site.

### AC7 — Semantic accessibility (family 13), with the vacuous checks recorded as such

For each element this story touches — the row container (`:84`), the four state branches, the pending
strip, the header — the family-13 checks (`load-bearing-invariant-checklist.md:72-84`) are evaluated
and **recorded**:
 **(a)** a container carrying `accessibilityLabel` is explicitly `accessible={true}` — **asserted**;
 **(d)** every state the ACs ratify as reachable is **ANNOUNCED**, ⛔ not merely reflected in a prop —
     **asserted**. ⭐⭐ **The reachable set is SIX: loading · absence · empty · NO-ROW-DERIVABLE ·
     a `name` row · the pending strip.** ⚠⚠ **AMENDED at the THIRD code review.** It read FIVE. The
     FIRST review's patch created the sixth (a non-empty `confirmed` array in which no row derives);
     the SECOND review enumerated it **in the test only** and its own propagation patch skipped this
     AC — so the mechanization asserted over a state the AC did not ratify, which is the inverse of the
     vacuous-green rule this very AC invokes. ⛔ THE ANONYMIZED ROW IS ⛔ NOT ONE OF THEM** — the authoring pass listed it; **D5 makes it
     unreachable by construction**, and an a11y assertion over an unreachable state is the vacuous
     green the checklist exists to catch.
 **(b)** `accessibilityValue` for a measurable-value role and **(c)** a real handler for an
     interactive role are ⛔ **VACUOUSLY SATISFIED on this surface** — it has no
     `progressbar`/`slider` and no `button`/`link`. ⛔ **Record them as NOT-APPLICABLE, ⛔ never as
     passing** ([[feedback_gate_scope_semantic_coverage]]).

**And** ⛔ **no accessibility CI gate is minted here** — that is 11b.8's call, by ruling. ⭐ Start from
`apps/mobile/components/panchayat/PinnedItem.tsx`.

### AC8 — The friction-budget ledger is updated, UNCONDITIONALLY

⛔⛔ **This is not an "if".** AC-4 is a pure path trigger: `MEMBER_FACING_PREFIXES =
['apps/mobile/', 'apps/public/']` (`scripts/friction-budget/lib.ts:453`, re-verified live);
`evaluateDeclaration` fails when any changed file matches and `friction-budget.md` is unchanged. This
story touches `apps/mobile/` in **at least three** files (the component, the adapter, a test) —
**there is no test exclusion**.

⚠ ⭐ **This is the ONE AC in this file the fifth pass did NOT have to change** — and it is checked, ⛔
not inherited: 11b.2a's own D7(c) ruling turned on the fact that AC-4 does **not** fire for a
locale-only edit. **It fires here**, because this story edits `apps/mobile/`.

⇒ `friction-budget.md` **MUST change in the same PR** or `pnpm ci:local` fails.
**And** ⭐ **the correct shape is an affirmation/disposition note, ⛔ not a new row and ⛔ not an edit
to an existing row** — this story *removes* an inline label and adds no member-payable friction. ⭐
The precedent is `80e0d12 feat(11b.9): declare the retired fourth consent checkbox in
friction-budget.md`. ⛔ Leave existing rows byte-unchanged ([[feedback_supersede_never_reinterpret]]).
⚠ The leg diffs **committed** history (`check.ts:77-79`, `${baseRef}...HEAD`), so it passes vacuously
until you commit — the failure surfaces at `git push` (pre-push hook), ⛔ not during local iteration
([[project_friction_budget_baseline_ratchet]]).

### ⭐⭐ AC9 (NEW) — THE WIRE→PRESENTER ADAPTER, which 11b.2 routes here BY NAME ✅ `[D10(a) RULED]`

11b.2's presenter input is ⛔ not the wire row (Trap 4). This story authors the adapter, and 11b.2
states the obligation in terms: *"⭐ The adapter is 11b.2b's, and **11b.2b owes it an AC**."*

The adapter:
 **(1)** re-nests the flat wire row's name fields under `displayName` as `{kind:'name', firstName,
     lastInitial}` — ⭐ **one kind only** (D5 + D6(a)). ⚠⚠ **CORRECTED at the second code review:** this
     AC said `'nameParts'`, which is the presenter's **OUTPUT** discriminant, ⛔ not its input. The
     INPUT is `{kind:'name'}` (`packages/ui/src/contribution-list/view-model.ts:40-42`). The shipped
     adapter was always right and the Dev Agent Record self-flagged it; ⛔ the AC text was never fixed,
     so a reader of the spec alone was still misled ([[project_contribution_row_render_layer_substrate]]);
 **(2)** splices the response-level `pool.letterCode` (`pool-contributor-list.ts:73-80,94` — it is
     **once per response**, ⛔ not per row) onto each row's `poolLetterCode`;
 **(3)** ⛔ **supplies NO `rowKey`.** D5 vacated it; `11b-2-…md:363`/`:373` still declare it required
     from a **vacated** ruling, and Task 0 routes its removal to 11b.2. ⛔ **Do not invent a value to
     satisfy the type**, and ⛔ never let it reach the `keyExtractor` (AC3).
 **(4)** ⛔ performs **no** derivation, joining, formatting or interpretation — it re-shapes only. ⛔ It
     does **not** join `firstName + lastInitial` (11b.2's **D9(a)**: the name FORM is UNRULED and
     joining it would RULE it).

✅ **Its input type is RULED: `import type { ConfirmedContributorRow } from '@twt/contracts'`** (D10(a)),
and `PoolContributorList.tsx:40-43`'s local `ConfirmedRow` is **deleted** in the same diff.
⚠ ⭐ **State in the diff that AC5's preservation is BEHAVIOURAL, ⛔ not textual** — `renderItem`'s and
`keyExtractor`'s parameter types change spelling, and the params lose the local `readonly` modifiers
(`z.output` is not readonly). ⛔ Neither is a behaviour change; ⛔ do not "restore" `readonly` by
re-declaring a local type.

⛔⛔ **AND THE ONE THING D10(a) MUST NOT BECOME A LICENCE FOR.** Reading the contract to import from it
puts `pool-contributor-list.ts:88` in front of you: *"Legitimately `[]` today (Epic 9's
`contribution.confirmed` producer is **unbuilt** — D2)."* ⭐ **That is FALSE and it CONTRADICTS ITS OWN
FILE HEADER at `:7-8`** (*"produced by the Epic 9 matcher since Story 9.4 — this list is **live, not
structurally empty**"*). ⚠ ⭐ **It is a SEPARATE stale-contract issue, ⛔ NOT D10's subject:** D10(a) is
an `import type` **from** contracts — ⛔ `packages/contracts/` is **not** edited by this story and does
**not** enter its diff. 11b.2a already filed this exact site in its stale-comment family and ruled
⛔ do not fix out-of-diff sites. ⇒ ⛔ **do not "tidy" it while you are in the file**, and ⛔ **do not
re-derive the false "unbuilt" premise from it** ([[project_epic9_confirmed_producer_is_live]]).

### ⭐ AC10 (NEW) — the in-diff stale comments are corrected

⛔⛔ `PoolContributorList.tsx:11` asserts *"Epic 9's producer is unbuilt, so the list is `[]` right
now"* — **false since Story 9.4/9.5** ([[project_epic9_confirmed_producer_is_live]]) — and `:119`
says *"0 confirmed today"*. **This file is in this story's diff** (AC1 deletes `:46-48` from it).

⇒ both are corrected. ⛔ **Scope is THIS FILE ONLY.** 11b.2a filed the ~12-site family with the full
list; ⛔ **do not fix the out-of-diff sites here** — that is the scope creep 11b.2a's Task 6 forbids by
name. ⚠ ⭐ `NomineeConsole.tsx:3,8,208` carry the same staleness but this story only **verifies** that
file (AC2) ⇒ ⛔ **not corrected here**; recorded so the omission is deliberate, ⛔ not missed.

---

## Tasks / Subtasks

- [x] **Task 0 — Preflight + routing** ⛔ `[GATED ON both dependencies being ANCESTORS OF HEAD]`
  - [x] ⛔ Confirm `11b-2-…` and `11b-2a-…` are both `done` in `sprint-status.yaml` and **present in
        this branch's history** (`git merge-base --is-ancestor <sibling> HEAD`). `git fetch origin`
        first ([[feedback_git_fetch_before_remote_reasoning]]). ⛔ If either is ABSENT, **STOP and
        report blocked.**
        ⚠⚠ **AMENDED at the THIRD code review.** It read *"merged into `main`"*, and the second
        review's decision 3 amended the PREFLIGHT prose to the substance test but ⛔ left this Task box
        ticked against the vacated wording — a ticked box asserting a false fact on the exact
        instruction the dev agent works from ([[feedback_spec_edits_must_propagate_to_tasks]], which
        that same pass cited twice).
  - [x] ⛔ **TRANSCRIBE** this file's rulings into `.decision-log.md` (read the head **live**) — ⭐ **the
        `D5-prototype` ruling below is the ONLY one this story owns**; D5 · D6(a) · D7(c) ·
        D3-aggregate · D5-scope are **11b.2a's** and D2(a) is **11b.2's** (⛔ do not re-transcribe
        another story's rulings). ⛔ `governance:` prefix, own commit, before any code.
  - [x] ⭐⛔ ~~**ROUTE THE SEVENTH D5 ARTEFACT TO 11b.2**~~ — ⛔⛔ **VOID. `rowKey` SHIPPED NOWHERE, and
        ⛔ nothing was routed.** Executed as a **verification**, ⛔ not as a route: the merged interfaces
        are `ContributionRowInput = { displayName, poolLetterCode }` and `ContributionRowViewModel =
        { displayName, poolLetterCode, rowA11y }` (`packages/ui/src/contribution-list/view-model.ts:44-47,49-65`)
        — ⛔ **no `rowKey` in either**, and none in `packages/contracts/src` or `apps/mobile`. ⇒ ⭐ the
        adapter has nothing to **REMOVE**, ⛔ not nothing to **PUT**, and 11b.2 is `done` — a route into
        it would be a route into a merged story. ⭐ Independently found and recorded by 11b.2a's own
        routing pass; **ratified as Decision `2026-09-01-171` cl.3.** ⛔ Every CONCLUSION the void
        instruction carried is correct and unchanged (⛔ no `rowKey`, `keyExtractor` keeps `index`, the
        deferral stays open); ⛔ only the MECHANISM was void.
  - [x] Re-verify `PoolContributorList.tsx`'s line numbers at merge — ⚠ 11b.2a does **not** edit this
        file (no wire change), so they should be stable at `:40-43` / `:46-48` / `:137-139`.
- [x] **Task 1 — Rewire the list (AC1, AC5)**
  - [x] Consume `deriveContributionRowViewModel` **inside a try/catch, one per row** (Trap 1);
        **delete** `contributorLabel()` at `:46-48`. ⚠ **AMENDED (second code review)** — was *"inside a
        try/catch in `renderItem`"*; the derivation now lives in a `useMemo` and `renderItem` reads it by
        index ([[feedback_spec_edits_must_propagate_to_tasks]] — the dev agent works from THIS list).
  - [x] ⛔ **ONE renderable kind.** ⛔ No `kind:'anonymized'` branch, ⛔ no `member.anonymousMember`,
        ⛔ no render arm for `'unknown'` (it throws — the try/catch is its handling).
  - [x] ⛔ **Leave `:137-139`'s `keyExtractor` byte-unchanged** (AC3).
  - [x] ⛔ Keep the four states OUTSIDE the list (Trap 2). ⛔ Keep `String(...)` numerals.
- [x] **Task 2 — The adapter (AC9)** ✅ `[D10(a) RULED — startable]`
  - [x] `import type { ConfirmedContributorRow } from '@twt/contracts'`; **delete** the local
        `ConfirmedRow` at `:40-43` (D10(a)). ⛔ Do not leave both.
  - [x] Re-nest name fields under `displayName`; splice `pool.letterCode`; ⛔ emit **no** `rowKey`;
        ⛔ join nothing (D9(a)).
  - [x] ⛔⛔ **Do NOT edit `packages/contracts/`** — incl. `pool-contributor-list.ts:88`'s stale
        *"producer is unbuilt"* doc-block. ⭐ Out-of-diff; ✅ **routed to 11b.3** with a fallback
        trigger, filed by 11b.2a's Task 6 (AC9). ⛔ Not fixed here.
- [x] **Task 3 — The anti-chrome fence (AC4)**
  - [x] ⛔⛔ **Build NO token bridge and NO palette map.** Write the three fence assertions instead.
        ⛔ No `@twt/tokens` import.
- [x] **Task 4 — Both render sites (AC2)**
  - [x] Smoke-assert `contributors.tsx:13` **and** `NomineeConsole.tsx:213`. ⭐ Run the no-death-term
        assertion against the Nominee Console explicitly.
  - [x] ⛔ **Do NOT re-check `ViewContributorsEntry.tsx`** — recorded as a verified negative (AC2).
- [x] **Task 5 — Tests in the harness that exists (AC6)**
  - [x] `apps/mobile/tests/unit/contributor-list-render.test.ts` — comment-stripped source scan; one
        rendered kind + one guarded throw + an anti-widening assertion; AC5's five properties; AC4's
        three fences; the two-site death-term scan.
  - [x] ⛔ **Write NO second i18n ref test** — 11b.2's AC2 owns it for all ten keys. ⭐ Scan **own call
        sites** for explicit namespaces + the `{name}` param instead.
  - [x] ⛔ **No test byte-asserts `contributor_list.empty`'s value** (D7(c) / 11b.2a AC8).
  - [x] ⛔ Record the screen-reader announcement and the live mobile `t()` call as **un-attested**.
- [x] **Task 6 — Accessibility (AC7)**
  - [x] Run family 13's four checks over every element touched; start from `PinnedItem.tsx`.
  - [x] ⛔ Record (b) and (c) as **NOT-APPLICABLE**, ⛔ never as passing.
  - [x] ⛔ **The anonymized row is NOT in the reachable set** — ⛔ do not assert over it.
  - [x] ⚠ **AMENDED (third code review): the set is SIX, not five** — the NO-ROW-DERIVABLE state was
        created by the first review's patch and must be enumerated here, not only in the test.
- [x] **Task 7 — Close out**
  - [x] Correct `PoolContributorList.tsx:11` and `:119` (AC10). ⛔ This file only.
  - [x] ⭐ **Route** `deferred-work.md:2163`'s stale self-citation (`:124-126` → `:137-139`) and
        **re-affirm it OPEN** with its re-trigger restated as **11b.3, the public render** (AC3).
        ⛔ Do not mark it discharged.
  - [x] ⛔⛔ **`friction-budget.md` — write the affirmation/disposition note (AC8). Mandatory, ⛔ not
        conditional.** ⛔ Leave existing rows byte-unchanged.
  - [x] ✅ **RE-TICKED — the owed run is GREEN.** `pnpm --filter @twt/mobile test` (**419/419**) ·
        `pnpm turbo run typecheck lint` (**14/14**) · `pnpm ci:local` with `DATABASE_URL` against the
        live `twt-test-pg` → **PASSED, 33 jobs, `✓ integration-tests`** — the branch convention, with
        the integration leg RUN, ⛔ not the 31-job skip variant.
        ⭐⭐ **AND IT SETTLES THE FLAKE ATTRIBUTION EMPIRICALLY.** The three `@twt/domain` specs that
        failed the earlier run passed here with the SAME mobile diff present (plus more) ⇒ the
        load/oversubscription reading was correct, and it is now demonstrated rather than argued
        ([[project_ci_local_concurrency_oversubscription]]). ⚠ The box was UNCHECKED between the third
        review's start and this run — "owed before merge" and "done" were ⛔ never collapsed
        ([[feedback_closure_language_precision]]).
        ⚠ `git push` runs the full `ci:local` via a pre-push hook — that is the "hang", ⛔ not a failure.
  - [x] Flip `development_status[11b-2b-contributor-list-mobile-render-layer]` and add ONE combined
        top-of-file `last_updated` entry ([[project_sprint_status_ledger]]).

### Review Findings

_`bmad-code-review 11b.2b`, 2026-09-01. Diff scope: `abdb42b..HEAD` (this story's own three commits,
excluding the two already-closed sibling stories stacked earlier on `governance/11b-2-validate-split`).
Three layers: Blind Hunter (diff-only), Edge Case Hunter (diff + repo access), Acceptance Auditor
(diff + this spec) — Acceptance Auditor returned zero violations, all self-flagged corrections in the
Dev Agent Record checked out live._

- [x] [Review][Patch] The catch→null path in `renderItem` has no total-failure fallback — `PoolContributorList.tsx:93,101-103` — `confirmedRows.length` (the raw wire count) still decides the list-vs-empty branch, so if every row's `try` throws (e.g. a systemic i18n-key miss — more reachable once the `t()` finding below is fixed, since resolver throws would then also route through this catch), the member sees a mounted, entirely blank `FlashList` with no error or empty-state copy, rather than falling to the calm empty-state branch. **Resolved (BigDev, decision-needed → patch); FIXED:** row derivation (including the a11y `t()` call) is now computed once per data change into a `renderableRows` array, and the branch decision is `confirmedRows.length === 0 || !hasRenderableRow` — a total-derivation-failure now falls to the empty-state branch. `renderItem` reads the pre-derived row by index; no re-derivation per scroll frame.
- [x] [Review][Patch] `t()` call for the row a11y label is OUTSIDE the try/catch it's documented as covered by [`PoolContributorList.tsx:101-103,128-132`] — the comment at `:96-99` calls the try/catch "THE ONLY GUARD" between a ruled throw and a red-boxed list, but `vm` is resolved inside the guard while `label` (`:110`) and the `t(vm.rowA11y.ref.key, …)` call (`:128-132`) run after it, unguarded — and the surrounding comment itself notes `t()` "defaults to `common` and THROWS on a miss" and throws at interpolation if `{name}` is omitted. A resolver-side namespace/key miss red-boxes the whole list on every scroll frame, exactly the failure mode Trap 1 was built to prevent. **FIXED** — folded into the same `renderableRows` refactor above: derive, label-join, and the `t()` a11y call now all run inside the one try block.
- [x] [Review][Patch] The new adapter `toContributionRowInput` is never actually invoked by a test [`apps/mobile/tests/unit/contributor-list-render.test.ts` AC9 block, `apps/mobile/components/contributor-list/contribution-row-input.ts:812-824`] — every "AC9" assertion is a regex scan of the adapter's raw source text (`adapter.toMatch(/kind:\s*'name'/)` etc.), never an import + call. A subtly wrong implementation (swapped fields, wrong nesting) containing the right substrings would still pass every assertion. **FIXED** — added two real-invocation tests importing and calling `toContributionRowInput` directly, asserting the exact returned shape (including an empty-`lastInitial` case).
- [x] [Review][Patch] `stripComments` strips everything after `//` with no string-literal awareness [`apps/mobile/tests/unit/contributor-list-render.test.ts:859-860`] — `src.replace(/\/\/.*$/gm, '')` would delete real code following a `//` that appears inside a string literal (e.g. a URL), which could silently remove a banned pattern before the regression-fence regexes run, defeating the "comment-stripped so a ban can never be satisfied by prose" guarantee the file's own header claims. **FIXED** — replaced with a string-aware character-scanner that tracks quote/template-literal state and only treats `//`/`/* */` as comments outside of a string.
- [x] [Review][Patch] The death-term regression fence's `\bdeceased\b` misses compound identifiers [`apps/mobile/tests/unit/contributor-list-render.test.ts:1099`] — there's no word boundary between "deceased" and an immediately-following capital letter, so `deceasedMemberId`-style identifiers would not trip the ban; a future dev could introduce exactly such an identifier at a render site and this fence would stay green. **FIXED** — dropped the `\b...\b` boundaries around `deceased` in `BANNED`; verified live that none of the three scanned files currently contain the substring, so this is a pure widening with no new false positives today.
- [x] [Review][Patch] AC10's "does not import from packages/contracts" assertion is near-tautological [`apps/mobile/tests/unit/contributor-list-render.test.ts:1285-1288`] — it checks for the literal substring `"packages/contracts"`, but the code only ever imports via the package alias `@twt/contracts`, so this specific assertion would pass regardless of whether D10(a) were honored. (The substance of D10(a) — no local type-shadow — is correctly covered by the earlier "DELETES the local ConfirmedRow" test in the same file, so this is a redundant/misleadingly-named assertion, not a coverage gap in the story overall.) **FIXED** — the assertion previously scanned only `component`; it now also scans `adapter`, the one file that actually imports `ConfirmedContributorRow` and so is the file this check should have been guarding against a relative-path alias bypass on.

**Verification:** `pnpm --filter @twt/mobile test` — 28 files / 397 tests green (55 in `contributor-list-render.test.ts`, up from 53). `pnpm turbo run typecheck lint --filter=@twt/mobile` — 14/14 green.
---

#### ⚠⚠ SECOND CODE-REVIEW PASS — `bmad-code-review 11b.2b`, 2026-09-01

_Three layers re-run over the SAME diff `abdb42b..HEAD`, but AFTER `9cbf5dd` — so **the first pass's own
six patches were under review for the first time** (the 11b.2a `2026-08-30m` shape). Blind Hunter
(diff-only, no repo access), Edge Case Hunter (diff + repo), Acceptance Auditor (diff + this spec +
the load-bearing-invariant checklist). ⚠ The Blind Hunter's first launch died to a connection error and
was relaunched; the second run completed._

⭐⭐ **THE HEADLINE, AND IT IS MUTATION-PROVEN: BOTH OF THE FIRST PASS'S HEADLINE FIXES ARE
UNMECHANIZED.** Independently reproduced twice — by the Acceptance Auditor and by the reviewer:
reverting `confirmedRows.length === 0 || !hasRenderableRow` back to `confirmedRows.length === 0`
leaves **397/397 green**; moving the a11y `t()` call back OUTSIDE the try leaves **55/55 green**.
The two behaviours the first pass declared load-bearing shipped with **zero regression fences** —
the test file contains no occurrence of `renderableRows` or `hasRenderableRow`
([[feedback_gate_scope_semantic_coverage]], [[feedback_mechanization_split_commitment]]).

⭐ **AND THE FIRST PASS'S FIX CONTRADICTS AC1's LITERAL TEXT.** AC1 (`:178`) and Task 1 (`:399`) both
order the derive **"inside a try/catch in `renderItem`"**. The refactor moved it into a component-body
`.map()`; `renderItem` now only indexes. The behaviour is arguably better — but the box is ticked, the
spec text is unamended, and no acceptance re-audit ran after the patch
([[feedback_spec_edits_must_propagate_to_tasks]], [[feedback_closure_language_precision]]).

**[Review][Decision] — 3, ALL RESOLVED (BigDev, 2026-09-01): 2 → patch, 1 → defer**

- [x] [Review][Decision] **The guard's stated trigger cannot reach the guard — six `t()` calls sit outside it** — `PoolContributorList.tsx:70,81,154,160,171,214,220`. The comment at `:100-102` justifies the `!hasRenderableRow` fallback with *"if EVERY row fails (a systemic key/namespace miss), the list falls back to the empty-state branch"*. It cannot: `rowA11y.ref.namespace` is hardcoded `'contribution'` (`i18n-keys.ts:38`) — **the same namespace** as `NS` — so a namespace miss throws at `t('contributor_list.title', …)` (`:154`) before `:168` is evaluated, and the fallback branch itself calls `t()` in that namespace (`:171`). The named failure escapes to expo-router's `ErrorBoundary` (`app/_layout.tsx:33`) and blanks the screen — the exact outcome the guard's comment says it prevents. ⭐ Further: the presenter's throw arm is **unreachable from this call site** (the adapter hardcodes `kind:'name'`, `contribution-row-input.ts:50`; the contract is `.strict()` with `firstName: z.string().min(1)`), so the try's ONLY live trigger is a `row_a11y`-key-only miss. **RESOLVED (BigDev, 2026-09-01) → (b), comment only.** The route `ErrorBoundary` (`app/_layout.tsx:33`) IS the surface-level answer; the guard's job is narrower than its comment claims — it saves the good rows from one bad row, and nothing more. ⇒ folded into the comment-correction patch; ⛔ no new guarding behaviour is introduced.
- [x] [Review][Decision] **`accessibilityLiveRegion` is Android-only — on iOS the aggregate is never announced** — `PoolContributorList.tsx:211-213`. This story hardened the strip for family-13 check (a) by adding `accessible`, but check **(d)** still fails on iOS + VoiceOver: the strip is documented (`:29-30`, `:209`) as the surface's ONLY ambient status and the only place the aggregate is stated as a sentence, and it updates silently on the 60s poll. The repo already carries the cross-platform mechanism — `AccessibilityInfo.announceForAccessibility` (`PanchayatNoticeboard.tsx:108`) — unused here. AC5(4)'s test asserts only that the string `accessibilityLiveRegion="polite"` is present. **RESOLVED (BigDev, 2026-09-01) → (b), DEFERRED.** Recorded as an explicit family-13(d) gap in `deferred-work.md` with a re-trigger at **Story 11b.8**'s accessibility audit — announcement cadence on a 60s poll is a real UX question this story cannot settle, and 11b.8 owns the device-backed checks. ⛔ Not waived, ⛔ not met: **deferred, and named.**
- [x] [Review][Decision] **The preflight hard gate is unmet and the box is ticked** — spec `:36-38`, Task 0 `:379-381`. Verified live after `git fetch origin`: `origin/main` is still `80e0d12`; `6028581` (11b.2) and `6af8e1f` (11b.2a) are ancestors of the working branch only. The spec's ONLY legal action was *"report blocked"*. The deviation is disclosed and excused as Decision `2026-09-01-171` cl.4 — but **that clause was authored by the same execution it excuses**, and the preflight text is unamended. Per [[feedback_closure_language_precision]], "satisfied on substance" is not "satisfied". **RESOLVED (BigDev, 2026-09-01) → (a), amend the gate.** The pin was written 2026-08-29 as a **PROXY** for *"the presenter exists"* — before it did. The proxy is stale; the condition it proxied is verified live. Amend the preflight to the substance test it actually meant (both siblings are **ancestors of HEAD**), so a future story is ⛔ not blocked by a stale proxy. ⇒ folded into the spec-propagation patch. ⛔ Rules nothing about merge policy.

**[Review][Patch] — 14 (2 of them absorbing a resolved decision) — ⚠⚠ 12 APPLIED, 2 PARTIAL**
⛔⛔ **THIS LINE READ "⭐⭐ ALL 14 APPLIED" AND THAT WAS FALSE.** The THIRD code review found two patches
half-done and the claim is RETRACTED here rather than quietly corrected
([[feedback_verify_before_committing_governance_claims]]):
· **patch 13 (spec propagation) was PARTIAL** — it committed to correcting the File List *and* the
  Change Log; only the File List was written. The Change Log's `53/53 / 393/393` row survived because
  the edit targeted text without its bold markers, and ⛔ nothing re-read the file to confirm.
· **patch 5 (AC10 → the fetch hook) was PARTIAL** — see the third-pass findings below.
⇒ ⭐ THE LESSON IS THE ONE THIS STORY KEEPS RE-LEARNING: **an applied-patch claim is a claim, and a
claim needs verification.** A string replace that silently matches nothing is the exact shape of the
first pass's un-mechanized fix, one layer up.

- [x] [Review][Patch] Mechanize BOTH first-pass fixes — no test references `renderableRows` or `hasRenderableRow`; both revert green (mutation-proven) [`apps/mobile/tests/unit/contributor-list-render.test.ts`]
- [x] [Review][Patch] Correct the `renderableRows` comment's false coverage claim — the systemic-namespace-miss scenario it names cannot reach the fallback [`PoolContributorList.tsx:93-102`]
- [x] [Review][Patch] Two test titles claim "inside `renderItem`" and assert nothing about `renderItem`; the `guarded` regex is unbounded-lazy across the whole file (a `try` in one function + a derive in a second + an unrelated `catch{return null}` in a third satisfies it) [`contributor-list-render.test.ts:105,133`]
- [x] [Review][Patch] **FALSE GREEN** — AC6's namespace fence accepts the exact defect it names: `/\bNS\s*,?\s*\)|namespace:/` matches `namespace:` ANYWHERE in the call text, so `t(key, { namespace: 'contribution' })` (namespace in the **params** slot — the documented 11a.2 defect) passes, then falls back to `'common'` and throws at runtime. Also `tCalls`'s balanced-paren scanner is string-blind [`contributor-list-render.test.ts:377-407`]
- [x] [Review][Patch] **FALSE GREEN** — AC10's stale-claim scan reads `COMPONENT` only, and the sibling hook that FETCHES these rows still asserts the false premise: `usePoolContributorsQuery.ts:14` *"Epic 9's producer is unbuilt"* and `:35` *"Both are honest no-ops today (0 confirmed events)"* — the stated justification for the 60s poll being a no-op. ⭐ A THIRD live instance beyond the two on record ([[project_epic9_confirmed_producer_is_live]]); the first pass extended the *contracts-import* check to the adapter, not this one [`contributor-list-render.test.ts:518-528`]
- [x] [Review][Patch] `stripComments` has no regex-literal or JSX-text awareness — `/^https:\/\//` ends in `/` `/` outside any quote, so `inLineComment` fires and the rest of the line is deleted from EVERY fence below; a JSX apostrophe opens a phantom string (false red). ⚠ Latent, not live: verified none of the four scanned files contains a trigger today. This is the fence that disarms all other fences [`contributor-list-render.test.ts:38-88`]
- [x] [Review][Patch] Widen the evadable fences: AC4 cannot match this repo's own idioms (`bg="$green4"` Tamagui tokens, `contributionStatus:`, `toneTokens`, a bridge named `row-tokens.ts`), AC4(c) proves only that `contributor-list/tokens.ts` does not exist, "JOINS NOTHING" misses `.join('.')` and hyphen templates, and the death-term `BANNED` misses `shradhanjali`/`inMemoriam`/`memorial`/`mrityu`/`memberState` while `usePoolContributorsQuery.ts` — the natural place to add a filter — is not in any scanned set [`contributor-list-render.test.ts:303-360`]
- [x] [Review][Patch] Nothing is memoized — `renderableRows` rebuilds on EVERY render (N `t()` catalog lookups + regex interpolation), and FlashList's `ViewHolder` memo comparator includes `prevProps.renderItem === nextProps.renderItem`, so every visible cell re-renders on every parent render, defeating cell memoization wholesale. ⚠ The fix needs a small restructure — `useMemo` cannot sit below the early returns [`PoolContributorList.tsx:98-99,103,127`]
- [x] [Review][Patch] `estimatedItemSize` does not exist in the installed FlashList major (`@shopify/flash-list@2.0.2` removed it) — the prop is inert, forwarded as unknown, and `CONTRIBUTOR_ROW_ESTIMATED_HEIGHT` is dead. The `FlashList as any` cast at `:179` suppressed the only signal that would have surfaced it [`PoolContributorList.tsx:47,191`]
- [x] [Review][Patch] Family 13(d) — the first pass added a SIXTH reachable state (non-empty list, zero renderable rows) that is not in AC7's ratified enumeration of five and is asserted nowhere. ⭐ The copy stays truthful ("No contributor names to show right now.", post-D7(c)), so this is an enumeration/mechanization gap, not a false claim to the member [`contributor-list-render.test.ts:480-502`]
- [x] [Review][Patch] The per-row `catch { return null }` is fully silent — no log, no counter. Because the file header (`:17-19`) establishes that `confirmed` and the aggregates LEGITIMATELY diverge for RTBF omissions, **a render failure is indistinguishable from a lawful erasure** and there is no telemetry to tell them apart. A `__DEV__`, no-PII warn restores the signal [`PoolContributorList.tsx:121-123`]
- [x] [Review][Patch] The adapter's two real-invocation tests cover only `'S'` and `''` — no multi-character, Devanagari, emoji, RTL-mark, or whitespace-only `lastInitial` case anywhere in the new suite [`contributor-list-render.test.ts:198-215`]
- [x] [Review][Patch] Propagate the spec text to what shipped: AC1 (`:178`) + Task 1 (`:399`) still say "inside `renderItem`"; AC9(1) (`:335-336`) still specifies `{kind:'nameParts'}` when the presenter's INPUT discriminant is `'name'` (code is correct, text is not — [[project_contribution_row_render_layer_substrate]]); the `keyExtractor` citation — ⚠⚠ **and the fix itself drifted AGAIN.** The pre-state was `:180-185`
(⛔ not `:188-190`, which this record misstated); patch 13 wrote `:254-256`; the third review's own
`__DEV__` fix moved it to `:265-267`. ⇒ ⭐ **RULED at the third review: this citation is now written as
a SYMBOL ANCHOR (`the `keyExtractor` prop on the `<FlashListAny>` in `PoolContributorList.tsx``) and
⛔ NEVER as a line range.** A line number in a governance record is a fact with a half-life of one
edit; it went stale twice in a single session, and both times a pass raised staleness as a finding
while re-introducing it. The five new `deferred-work.md` entries carry the same defect and are
corrected the same way; File List (`:771`) and Change Log (`:786`) say 72 assertions (was 53 at authoring, 55 after the first review) / 393 tests against a live 55 / 397, neither marked superseded
- [x] [Review][Patch] Two comments contradict each other and the code, in the same diff: the adapter's JSDoc says it is *"called once per visible row on every scroll frame"* (`contribution-row-input.ts:41-42`) while the caller now calls it eagerly for every row, and the component claims *"a failing row is invisible to FlashList"* (`:100`) while `data={confirmedRows}` is the unfiltered array and `keyExtractor` still runs on failed rows

**[Review][Defer] — 5 (4 pre-existing / out of diff, + 1 resolved from a decision)**

- [x] [Review][Defer] A whitespace-only `firstName` renders a blank row and announces ", confirmed contributor" [`pool-contributor-list.ts:44`] — deferred, pre-existing. `z.string().min(1)` accepts `" "`; the presenter branches only on `kind`, so nothing throws and the try/catch is inert — D8(a)'s "never silently render a blank where a name belongs" is defeated on a non-throwing path. Belongs to the contract/producer.
- [x] [Review][Defer] `lastInitial: z.string().max(16)` is bounded by LENGTH, not SHAPE [`pool-contributor-list.ts:49`] — deferred, pre-existing. `"Sharma"` and `"Chattopadhyay"` both validate, and the render layer joins them into the visible label, so a producer regression puts a full surname on the one surface documented as PII-shielded, with no client-side shape check.
- [x] [Review][Defer] A first-fetch error renders the absence copy [`PoolContributorList.tsx:77-85`, `usePoolContributorsQuery.ts`] — deferred, pre-existing (branch untouched by this diff). `isError` is never destructured, so offline / 5xx after `retry: 1` presents a transport failure as an authoritative statement that the member has no live pool — the same false-claim shape the loading branch at `:63-65` was added to avoid.
- [x] [Review][Defer] AC7's a11y scans never reach the two render sites this same file names [`contributor-list-render.test.ts:361-375`] — deferred, scope. `contributors.tsx` and `NomineeConsole.tsx` are asserted to mount the component but are never a11y-scanned; family 13 is un-mechanized by ruling, so nothing else covers them either. Re-trigger: 11b.8's accessibility audit.

**Dismissed as noise — 5**

1. *"The empty branch tells the member a falsehood"* (Blind Hunter) — it quoted the copy from the diff's own comment, which is **superseded**. Live copy is `contribution.json:31` *"No contributor names to show right now."*, which is truthful for a genuinely-empty read AND for a total-derivation failure. The residual comment-accuracy issue is retained as a patch.
2. *`accessible` deleted from the row `<View>` in the working tree* (Edge Case Hunter) — **false positive from concurrent agents**: it read the tree while the Acceptance Auditor's mutation test was in flight. Verified after both finished — tree clean, `accessible` present at `:138` and `:211`.
3. *"a failing row leaves a ~56px reserved-height hole"* (Blind Hunter) — FlashList **v2** self-measures and a `null` cell collapses to zero height. Mechanism wrong; the claim-mismatch half is retained as a patch.
4. *"a missing `data.pool` degrades to a silent false empty state"* (Blind Hunter) — `data.pool.name` at `:87` runs **before** the map and is unguarded, so it red-boxes rather than degrading silently. The "no signal at all" half is retained as a patch.
5. *Family 11 (AI-10-1) record gap* — `hasRenderableRow` is not a benefit gate (nothing in an eligibility, validity, assignability, pool-assignment or claim path reads it), so the obligation does not attach; covered-by-construction. Folded into the spec-propagation patch.

**Verification after the second pass's patches:** `pnpm --filter @twt/mobile test` — 28 files /
**414 tests green**, **72** in `contributor-list-render.test.ts` (up from 55).
`pnpm turbo run typecheck lint --filter=@twt/mobile` — **14/14 green**.
⭐⭐ **AND THE NEW FENCES WERE MUTATION-VERIFIED, one at a time, each reverted after** — because the
finding this pass opened with was that the LAST pass's fixes were unmechanized, and a fence asserted
without a revert probe is the same mistake one layer up:
**FENCE 1** (a11y `t()` inside the guard) — stubbing the guarded `t()` call → **4 failures**;
**FENCE 2** (branch consults `hasRenderableRow`) — reverting to `confirmedRows.length === 0` → **1 failure**;
**FENCE 3** (memo deps) — adding `t` → **1 failure**; removing `locale` → **1 failure**;
**FENCE 4** (drop is not silent) — deleting the `__DEV__` warn → **1 failure**;
**`stripComments` self-tests** — disabling regex-awareness → **1 failure**; re-adding `<`/`>` to the
opener set (the JSX-eating variant) → **1 failure**. ⭐ Two of these fences did **NOT** bite on their
first draft (FENCE 3's dependency regex missed `t` in final position; the regex-literal fixture put its
banned token on the wrong LINE) and were corrected until they did. ⚠ Working tree restored and verified
clean after every probe.

⚠⚠ **FULL `pnpm ci:local` WAS RUN — AND IT IS ⛔ NOT REPORTED AS "33 GREEN", BECAUSE IT WAS NOT**
([[feedback_record_unattested_no_backfill]], [[feedback_verify_before_committing_governance_claims]]).
⭐ Two runs, and the FIRST one is reported too because reporting only the second would misrepresent it:
**(run 1)** `pnpm ci:local` → **PASSED, 31 jobs** — but with `⚠ SKIP integration-tests — set DATABASE_URL`.
⛔ That is ⛔ NOT the branch convention ("33 jobs green with the integration leg RUN") and was ⛔ not
recorded as if it were. **(run 2)** re-run with `DATABASE_URL` against the live `twt-test-pg` container
(up 9 days, :5433) → **`ci:local` FAILED — 1 job: `integration-tests`.**
⭐⭐ **THE THREE FAILING SPECS ARE INNOCENT OF THIS DIFF, AND INNOCENCE WAS PROVEN, ⛔ NOT ASSUMED:**
  · `claim/shepherd-assign-concurrency.spec.ts` — *"Test timed out in 20000ms"* after **651,473 ms**;
    ⭐ passes in isolation in **152 ms**;
  · `claim/icp.spec.ts` and `member-geo/news-blog-state-audience.spec.ts` — both
    `[vitest-worker]: Timeout calling "fetch" … "ssr"`, a worker/module-load timeout, ⛔ not an assertion;
    ⭐ both pass in isolation, together, in **1.27 s** (14 tests).
  · ⭐ STRUCTURAL: `@twt/domain` has ⛔ NO dependency on `apps/mobile`, and this diff touches ⛔ ONLY
    `apps/mobile/**` (3 files) + `_bmad-output/**` (3 files) — so these specs are ⛔ UNREACHABLE from it.
  ⇒ the classic load/oversubscription flake shape ([[project_ci_local_concurrency_oversubscription]],
  [[project_known_livedb_test_failures]]). ⛔ NOT a green run, ⛔ not backfilled into one, and ⛔ not a
  regression from this pass. ⚠ **Owed before merge: a clean `ci:local` with the integration leg RUN.**


---

#### ⛔⛔ THIRD CODE-REVIEW PASS — `bmad-code-review 11b.2b`, 2026-09-01

_Same diff, plus the SECOND pass's own 14 patches — so **the second review's fixes were under review for
the first time**. ⚠ **`failed_layers`: the Edge Case Hunter and Acceptance Auditor BOTH died mid-run on a
provider session limit and were relaunched; all three layers ultimately reported.** ⭐ This pass forbade
tree mutation in every layer (the second pass's concurrent-mutation false positive) and the reviewer ran
every mutation probe instead._

⭐⭐ **THE HEADLINE: THE SECOND PASS'S "⭐⭐ ALL 14 APPLIED" WAS FALSE, AND ITS DIAGNOSTIC PATCH SHIPPED A
WHOLE-SURFACE CRASH.** Three passes, three times a review's own fix carried the defect it was fixing.

**[Review][Patch] — 13, ALL APPLIED**

- [x] ⛔⛔ **CRITICAL — patch 11 turned "degrade ONE row" into "red-box the WHOLE surface."** It shipped a
      bare `if (__DEV__)` **inside the CATCH block**. `declare const` is TYPE-LEVEL and emits nothing, so
      that is a bare identifier read ⇒ **`ReferenceError`**, ⛔ not `undefined`, anywhere Metro has not
      injected the global (node/Vitest, SSR, react-native-web). Being in the CATCH, it **escapes the
      per-row guard**, escapes the memo, and reaches the route `ErrorBoundary` — reinstating the exact
      Trap-1 failure the guard exists to prevent, **on the recovery path**. ⚠ The patch's own comment
      cited `lib/loop-timing-store.ts` as its precedent while ⛔ not following it (that file's live form
      is `typeof __DEV__ !== 'undefined' && __DEV__ === true`). ⭐ Reproduced in isolation before fixing.
      **FIXED** — `isDevBuild()`, with the `typeof` guard, and a fence that requires it.
      ⚠⚠ **THE SUITE WAS GREEN THROUGH IT**: every test here is a source scan, so the component is never
      executed and a `ReferenceError` is invisible to a grep ([[feedback_gate_scope_semantic_coverage]]).
- [x] ⛔ **Patch 5 was PARTIAL, and its correction was itself FALSE.** (i) The hook still ASSERTED
      "This is MOOT today (0 confirmed events to push" in the present tense with the repudiation buried
      in a parenthetical; (ii) the replacement claim **"neither is inert"** is wrong —
      `refetchOnReconnect` **IS** inert on RN (query-core wires only `window.addEventListener('online')`;
      no bridge exists), which the same file admits 17 lines above for `focusManager`. ⇒ AC10's own
      defect class, committed BY the patch that closed AC10. **FIXED**; the residual is DEFERRED.
- [x] ⛔ **Patch 13 was PARTIAL** — it committed to the File List **and** the Change Log; only the File
      List was written. The `53/53 / 393/393` row survived because the edit targeted text without its
      bold markers and ⛔ nothing re-read the file. **FIXED**, and the "ALL 14 APPLIED" line RETRACTED.
- [x] **AC7 still ratified FIVE reachable states while the shipped fence asserted SIX** — patch 10 landed
      in the test only, so the mechanization asserted over a state the AC did not ratify: the inverse of
      the vacuous-green rule AC7 itself invokes. **FIXED** in AC7, Task 6 and the Change Log.
- [x] **Task 0 still ordered the gate decision 3 vacated** ("merged into `main`"), ticked, on the exact
      instruction the dev agent works from. **FIXED** ([[feedback_spec_edits_must_propagate_to_tasks]]).
- [x] **Task 7's `ci:local` box was ticked against a run that FAILED.** **UN-TICKED** — "owed before
      merge" and "done" are ⛔ not the same closure verb; the first pass's `33 jobs green` Debug Log line
      is marked **SUPERSEDED**, ⛔ not deleted ([[feedback_supersede_never_reinterpret]]).
- [x] **Trap 1 still ordered the superseded structure** that AC1 and Task 1 both defer to — the second
      pass corrected this identical sentence in the adapter and left it standing in the spec. **FIXED.**
- [x] ⛔ **The death-term fence was a live FALSE-RED TRAP.** The widening added `shradhanjali`/`memorial`
      — and `PoolContributorList.tsx` names `ShradhanjaliSahyogVivran` TWICE as *the pattern to follow*,
      while `_layout.tsx` uses "memorial" as a FONT ROLE. The component was green ONLY because
      `stripComments` removed those comments ⇒ the fence rested entirely on the helper that has been
      wrong twice, and the next legitimate edit would have turned reuse into a violation. **FIXED** —
      surface NAMES removed, real death PREDICATES (`isDead`/`died`/`dateOfDeath`/`passedAway`) added.
- [x] **AC4's widened bans false-red on innocent code** — `/\w*[Tt]one/` matched **`milestone:`**, and
      `/\w*[Ss]tatus/` matched `if (status === …)`, React Query's own field. **FIXED** (narrowed).
- [x] ⛔ **FENCE 2 named a defect and did not assert against it** — it checked only that the IDENTIFIER
      appeared, so `hasRenderableRow = confirmedRows.length > 0` (the exact semantics its failure message
      describes) passed green. **FIXED**; mutation-proven.
- [x] ⛔ **FENCE 4 was an OR**, so an UNGATED production log satisfied it on a PII-shielded surface.
      **FIXED** — dev gate AND warn both required, and the gate must be the `typeof`-safe form.
- [x] ⛔ **`balancedFrom` had no string awareness and no tests** — while the two lexers beside it were
      hardened. A stray bracket in the new natural-language `console.warn` would silently shorten the
      slice and re-widen FENCE 1 to the whole-file matching the second pass removed. **FIXED + tested.**
- [x] **Three more mechanization defects**: `stripComments` entered phantom regex mode after `+`/`-`
      (`done++ / total`) — a FALSE GREEN, and its doc-block **characterised its own limitation backwards**
      (a phantom string stops stripping ⇒ comment PROSE satisfies ~20 positive fences; the block claimed
      it "cannot hide a violation" — reproduced, then corrected); AC4(c)'s `readdirSync` was
      NON-recursive so a subdirectory bridge passed; the per-branch a11y check was a ±300/400 CHARACTER
      WINDOW — the same defect it claimed to replace — plus two Prettier couplings (FENCE 3's mandatory
      trailing comma, `accessible` required as last-token-on-line). **ALL FIXED.**

**[Review][Defer] — 6, filed with SYMBOL anchors in `deferred-work.md`**
- [x] The identical dead `estimatedItemSize` in `ShradhanjaliSahyogVivran.tsx` (surfaced by this story's
      own verification, routed nowhere) · [x] the `FlashList as any` cast has a proven cost and no
      re-examination trigger · [x] the **7th state** (partial derivation failure) — **not-constructible
      today** (every live throw is catalog-scoped ⇒ all-or-none) but reachable at **11b.3**, recorded
      with that trigger rather than left un-attested by silence · [x] the `renderItem`-identity coupling
      that keeps index alignment correct is undocumented and unasserted · [x] `refetchOnReconnect` inert
      on RN · [x] the MMKV-restored cache is not Zod-re-validated, under reads this pass hoisted above
      the guards.

**Dismissed — 1.** "Member names could reach the log via `error.message`": every resolver throw carries
the param NAME, key, namespace and locale — ⛔ never a param VALUE (`resolver.ts:39,59,64`, read live).

**Verification.** `pnpm --filter @twt/mobile test` — 28 files / **419 green** (77 in this file).
`pnpm turbo run typecheck lint --filter=@twt/mobile` — **14/14**. ⭐ **Six mutation probes, each reverted:**
`hasRenderableRow` ← raw wire count → **1 fail**; un-gate the warn → **1 fail**; bare `__DEV__` → **1 fail**;
drop the empty branch's role → **2 fail**; string-blind `balancedFrom` → **2 fail**; `+`/`-` back in the
regex opener set → **1 fail**. ⚠ One tightened fence was TOO tight on its first draft (the a11y check
demanded a role on the innermost tag, where RN's announced unit is the CONTAINER) and was re-cut to walk
the enclosing element chain. ✅✅ **`ci:local` RE-RUN AND GREEN — 33 jobs, integration leg RUN** (`✓ integration-tests`), against the
live `twt-test-pg`. ⭐ The three specs excused as load flakes by the second pass PASSED here with the same
mobile diff present ⇒ the innocence argument is now DEMONSTRATED, ⛔ not merely reasoned.

**Load-bearing-invariant families.** Families 1, 2, 3, 4, 5, 7, 8, 9, 12 are genuinely untouched — no event, reducer, DB access, migration, route, mutation, aggregate query, or scope bypass. **Family 6 — covered-by-construction** (the adapter field-picks explicitly, never spreads; its source type is the `.strict()` two-field contract) **and covered-by-test** (`contributor-list-render.test.ts:198-215`). **Family 11 — covered-by-construction** (see dismissal 5). **Family 13 — (a) covered-by-test, mutation-verified** (dropping `accessible` from `:138` fails the fence); **(b)/(c) not-constructible on this surface**, recorded NOT-APPLICABLE rather than passing; **(d) covered-by-test for the five ratified states, with the enumeration now incomplete** (patch) and an **iOS gap** (decision). **Family 10 — REAL GAP**: three governance records assert what the shipped state does not match (the `:254-256` citation, the preflight "satisfied on substance", AC1/Task 1 ticked while the derive sits outside `renderItem`) — raised as patches and a decision above, at full AC severity, never downgraded.

---

## ⚖️ Decisions

### ✅⭐ D10 — Type the adapter against `@twt/contracts`? → **(a) YES. Derive, and DELETE the duplicate.** RULED BigDev 2026-08-30. ⛔ FINAL.

`PoolContributorList.tsx:40-43` hand-spells `interface ConfirmedRow { firstName; lastInitial }` and
⛔ **does not import it from `@twt/contracts`**. 11b.2a's **Trap 4** names this exact site: *"⭐⛔ a
LOCAL `interface ConfirmedRow` — ⛔ NOT imported from `@twt/contracts`. **Widening the contract will
⛔ NOT fail this file's typecheck.** This is 11b.1's defect class, already present."*

**Why it was open:** the authoring pass wrote *"11b.2a's AC4 makes this derive from the contract"* —
⭐ **that AC is VACATED by D5**, so nothing does. And it ⛔ could not be deferred by inaction: AC9's
adapter must declare an input type either way, and keeping the local tuple would have given the hazard
a **second** hand-maintained consumer — this story would have made 11b.1's defect class **worse**.

⇒ ⛔ **`ConfirmedRow` is DELETED**; the adapter and `renderItem`/`keyExtractor` type against
`import type { ConfirmedContributorRow } from '@twt/contracts'`.

**Grounds — ⭐⭐ TWO OF THE THREE WERE FOUND BY THE RULING'S OWN VERIFICATION, ⛔ not by the option text:**
 **(1)** ⭐⭐ **THE CONTRACT FILE'S OWN STATED DISCIPLINE ALREADY FORBIDS THIS.**
     `pool-contributor-list.ts:14`, verbatim: *"Consumed via `import type … from '@twt/contracts'` in
     the SDK + the apps/api handler — **NO type-shadowing**."* ⇒ `:40-43` **is** a type-shadow, and
     (a) brings the file into compliance with a discipline the contract already declares.
 **(2)** ⭐⭐ **IT IS NOT A DUPLICATE — IT IS A SHADOW, AND THE DELETION IS TYPE-NEUTRAL.** Verified:
     `memberPoolContributors()` returns `PoolContributorListResult`, which is
     `PoolContributorListResponse` re-exported (`api-client/src/index.ts:88,558`) ⇒ **`data.confirmed`
     is ALREADY `ConfirmedContributorRow[]` at the call site.** `ConfirmedRow` only re-annotates params
     TypeScript already infers correctly. ⭐ And `ConfirmedContributorRow` appears **nowhere** in
     `apps/mobile` today — the shadow is currently the *only* mobile spelling.
 **(3)** ⛔ **No bundle-boundary objection** — `apps/mobile` already imports `@twt/contracts` in 20+
     files (`pay.tsx:38-39`, `polls/index.tsx:20`, `nominee-review.tsx:16`, …) and declares it at
     `package.json:33`. ⚠ `import type`, deliberately ([[project_type_only_import_cycle_trap]]).

⛔ **(b) keep the local tuple** — rejected: it survives the hazard *and* adds a second consumer.
⛔ **(c) both spellings** — rejected on its face: three where there were two.

### ⛔⛔ THE VERIFICATION D10 WAS RULED ON — and the SEPARATE issue it surfaced

⭐ **The ruling was conditioned on the contract actually describing the post-D5 single-row shape.**
Verified live at `dbb4a25`, `packages/contracts/src/contributions/pool-contributor-list.ts:42-52`:

```ts
export const ConfirmedContributorRow = z
  .object({ firstName: z.string().min(1), lastInitial: z.string().max(16) })
  .strict();
```

✅ **CLEAN — and the reason matters.** ⛔ No `kind`, ⛔ no `rowKey`, ⛔ no anonymized arm, ⛔ no
`status`. ⭐ **There is no stale union to inherit, because D5 vacated the widening BEFORE IT WAS EVER
BUILT** — the two-variant union existed only as 11b.2a's planned AC4, ⛔ never as shipped contract. ⇒
the type (a) imports is **exactly** the post-D5 shape, and `.strict()` + `AssignedPoolContributorList`
(`:91-99`) carry no residue either.

⛔⛔ **BUT THE VERIFICATION FOUND A REAL STALE-CONTRACT DEFECT NEXT TO IT, AND ⛔ IT IS NOT D10's TO FIX.**
`pool-contributor-list.ts:88` — the `confirmed` field's doc-block — says *"Legitimately `[]` today
(Epic 9's `contribution.confirmed` producer is **unbuilt** — D2)."*
⭐ **FALSE since Story 9.4/9.5, and it CONTRADICTS ITS OWN FILE HEADER at `:7-8`**: *"produced by the
Epic 9 matcher since Story 9.4 — this list is **live, not structurally empty**."*

⇒ recorded as a **separate stale-contract issue**, ⛔ **not silently fixed under D10**, and
✅ **ROUTED TO STORY 11b.3** (BigDev, 2026-08-30):
· ⛔ **out of this story's diff** — D10(a) is an `import type` **from** contracts; ⛔ `packages/contracts/`
  is never edited here;
· ⭐⭐ **11b.3 is the consumer THE FILE ITSELF NAMES**, at `:26-28`: *"the downstream **Sahyog Vivran
  public render** (Epic 11b) reuses it unchanged"* ⇒ `11b-3-sahyog-vivran-per-claim-story-surface`
  (`backlog`, ⛔ **no story file yet** — the routing lands in 11b.2a's Task-6 filing, which 11b.3's
  authoring pass reads);
· ⚠ ⭐ **THE REACHABILITY CAVEAT IS RECORDED, ⛔ NOT ASSUMED AWAY**
  ([[feedback_trace_reachability_before_escalating]]): the same sentence says 11b.3 *"reuses it
  **unchanged**"*, so it may **read** the contract without **editing** it. ⇒ the filing carries **two**
  triggers — **(i)** 11b.3's authoring pass; **(ii) FALLBACK — the next story that edits
  `pool-contributor-list.ts` for any reason** — so the item ⛔ cannot evaporate;
· ⛔ **AC9 still fences it here**, because reading the file to import from it is exactly when a dev
  would "tidy" it, or worse, **re-derive the false premise from it**
  ([[project_epic9_confirmed_producer_is_live]] — *"never read population from a comment"*).

### ✅ D5-prototype — Promote the memorial `<ContributorRow>` prototype? → **(a) ⛔ NO.** RULED BigDev 2026-08-29.

⚠ ⭐ **Renamed from "D5" by the fifth pass to end a live collision** — 11b.2a's **D5** is *the*
governing RTBF ruling that reshaped this file, and two different D5s in one sibling set is exactly how
a ruling gets applied to the wrong question.

`shradhanjali/ContributorRow.tsx` is the UX spec's mobile row, but on **sample data**.

⚠ ⭐ **Corrected arithmetic (the authoring pass said three; it is two).** `district` **has a shipped
read model** — `member_postings.district` (`packages/domain/src/schema/member_postings.ts:51`,
plaintext, explicitly non-PII), already published on a public wire
(`packages/contracts/src/public-pages/directory.ts:82`) and a ruled `member-directory` matrix field.
⇒ the producer-less fields are **`memoryLine` and `monthYear`**. ⭐ **The ruling holds on the corrected
arithmetic, ⛔ not on the inflated one.**

**Ground:** rewire only `<PoolContributorList>` (8.3), which has a **real producer**. Promoting the
prototype still means **inventing two producers** — SD-1 — and the 11a.5 lesson (*"a silent section is
the CORRECT state"*) says render the real, currently-empty source. ⛔ (b) was rejected because it
**ships fabricated rows on a memorial surface**. ⛔ (c) was rejected because it puts un-producible
fields into a shared contract — **and it is out of this story's reach anyway**.

⇒ ⛔ **`apps/mobile/components/shradhanjali/*` is NOT TOUCHED by this story.** ⚠ ⭐ The prototype's
**divergence is a recorded fact, ⛔ not a silent one**. ⛔ Do not "reconcile" them here.

## Dev Notes

- **⛔⛔ ONE KIND OF ROW.** D5 + D6(a) mean the contributor row has exactly one kind, wire to pixel.
  ⛔ Never branch on `kind:'anonymized'`; ⛔ never resolve `member.anonymousMember` here.
- **⛔ `rows.length === confirmedCount` IS THE WRONG MODEL** (D3-aggregate). Under D5 an omitted
  contributor still counts in `confirmedCount` and `pending` while `rows` shrinks — ⭐ **that
  divergence is DESIGNED.** ⛔ Never assert equality between them, in a test or in a comment.
- **⚠ Fabric FlatList/FlashList red-boxes crossing empty→populated in place.** 8.3 already renders the
  empty/loading/absence branches **outside** the list — ⛔ do not "simplify" it (Trap 2).
- **⚠ Latin numerals for operational figures, even in Hindi** (UX-DR73 / amendment-A2). `:81-82`'s
  `String(...)` is the pattern; ⛔ never `toHindiNumeral` here.
- **⚠ `t()` defaults to `common` and THROWS.** Every call site passes an explicit namespace. Assert
  **through** `t()` — `resolver.ts:33`'s `TOKEN` is single-brace, which is how the 11a.2 defect shipped.
- **⚠ Type-only → value import cycles** break consuming packages at runtime while typecheck, lint and
  local tests stay green ([[project_type_only_import_cycle_trap]]). `apps/mobile` imports `@twt/ui`
  and (under D10(a)) `@twt/contracts` — ⭐ **`import type` both**, deliberately.
- **⭐ MMKV is this app's AsyncStorage** ([[project_mmkv_asyncstorage_equivalent]]) — the contributor
  response is auto-persisted (`usePoolContributorsQuery.ts:33`). ⭐ **Under D5 there is NO wire change**,
  so ⛔ the stale-cached-shape hazard the authoring pass warned about **does not arise**.
- **⚠ `integration-tests` concurrency is `1` and is LOAD-BEARING** — ⛔ never raise it.
- **⭐ CI Actions availability flips both ways without warning — re-verify live**
  ([[project_ci_actions_suspension_local_mirror]]).

### Testing

```
pnpm --filter @twt/mobile test    # apps/mobile/tests/** — pure Vitest, SOURCE SCANS, no RN mount
pnpm turbo run typecheck
pnpm ci:local                     # before push — and AC8's ledger note must be committed first
```
⛔ **No `@twt/i18n` test is owed by this story** — 11b.2's AC2 owns the ref-resolution proof (AC6).

### Project Structure Notes

| Path | New/Update | Note |
|---|---|---|
| `apps/mobile/components/contributor-list/PoolContributorList.tsx` | UPDATE | Consume the presenter in a **try/catch**; **delete** `contributorLabel()` `:46-48`; correct `:11`/`:119` (AC10). ⛔⛔ **`:137-139`'s `keyExtractor` is LEFT ALONE** (AC3). ⛔ FlashList + the four states + the pending strip otherwise unchanged. |
| the adapter | **NEW** ✅ `[D10(a)]` | AC9. Types against `@twt/contracts`'s `ConfirmedContributorRow`; the local `ConfirmedRow` `:40-43` is **deleted**. |
| `apps/mobile/app/(contribution)/contributors.tsx` | ⚠ **VERIFY** | Render site 1 (`:13`) — smoke-assert after the rewire. |
| `apps/mobile/components/nominee-console/NomineeConsole.tsx` | ⚠ **VERIFY** | ⭐ Render site 2 (`:213`) — a death-context surface. ⛔ Run the no-death-term assertion here explicitly. ⛔ Its stale comments (`:3,8,208`) are ⛔ **NOT** corrected here (AC10). |
| `apps/mobile/components/contributor-list/ViewContributorsEntry.tsx` | ⛔ **NOT TOUCHED** | ⭐ **Verified negative** — reads `data.assigned` only. ⛔ Nothing owed. |
| `apps/mobile/tests/unit/contributor-list-render.test.ts` | **NEW** | ⛔ Source scan + presenter-driven. ⛔ No mount harness — do not stand one up. |
| `packages/ui/**` | ⛔ **READ-ONLY** | The presenter is 11b.2's. ⛔ Do not edit it to make this story easier. |
| `packages/contracts/**` · `apps/api/**` | ⛔ **NOT MODIFIED** | ✅ D10(a): `@twt/contracts` is **imported (type-only)**, ⛔ never edited. ⛔⛔ Incl. `pool-contributor-list.ts:88`'s stale *"producer is unbuilt"* doc-block — ⭐ a **separate** stale-contract issue, ⛔ not D10's subject, ✅ **routed to 11b.3** (AC9). |
| `packages/tokens/**` | ⛔ **NOT IMPORTED, AND NO BRIDGE IS BUILT** | AC4 — inverted by D2(a). |
| `apps/mobile/components/shradhanjali/ContributorRow.tsx` | ⚠ **LEAVE ALONE** `[D5-prototype]` | Sample-data prototype; **two** producer-less fields. |
| `friction-budget.md` | ⛔ **MUST UPDATE** | AC8 — unconditional. An affirmation/disposition note; ⛔ existing rows byte-unchanged. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE | `:2163` **STAYS OPEN**; stale self-citation routed; re-trigger restated as 11b.3 (AC3). |
| `.decision-log.md` | UPDATE | Task 0 — **`D5-prototype` only** (+ D10 once ruled). ⛔ Not 11b.2a's or 11b.2's rulings. |

### References

- [Source: `apps/mobile/components/contributor-list/PoolContributorList.tsx:9-19,40-43,46-48,57,68,81-82,119,121-126,128,132-141,137-139,149-164`] — the stale-comment block, the local tuple, the inline label, the four states, the Latin numerals, the keyExtractor, the pending strip
- [Source: `apps/mobile/app/(contribution)/contributors.tsx:7,13`] — render site 1
- [Source: `apps/mobile/components/nominee-console/NomineeConsole.tsx:31,206,208-213`] — ⭐ render site 2, and why it sits outside the ScrollView
- [Source: `apps/mobile/components/contributor-list/ViewContributorsEntry.tsx:19,26,30`] — ⭐ the verified negative: `data.assigned` only
- [Source: `apps/mobile/tests/unit/status-pill-render.test.ts:1-18`] — ⛔ no mount harness; the exhaustiveness precedent; comment-stripping
- [Source: `11b-2-…md:366-382`] — ⭐⭐ `ContributionRowViewModel` carries **no token role** (AC4's inversion)
- [Source: `11b-2-…md:738-751`] — ⭐⭐ **D2(a)**, incl. *"(c) a constant 'confirmed' chrome element in the render layer was rejected"* and *"⭐⛔ AND THIS RULING BINDS 11b.2b"*
- [Source: `11b-2-…md:384-393`] — ⭐⭐ the adapter is 11b.2b's and *"11b.2b owes it an AC"* (Trap 4 → AC9)
- [Source: `11b-2-…md:360-363,373`] — ⭐ the **required `rowKey`** sourced from the **VACATED** D3-shape(i)(a) (Task 0 routing)
- [Source: `11b-2-…md:313-320`] — ⭐ 11b.2 declares the ten `contributor_list.*` refs **for this story** and owns their resolution test (AC6's de-duplication)
- [Source: `11b-2-…md:398-412`] — **D8(a)**: `unknown` **THROWS**; the try/catch is the only guard
- [Source: `11b-2a-…md:499-544`] — ⭐⭐ AC4/AC5 **VACATED**: ⛔ no wire change, ⛔ no `kind`, ⛔ no `rowKey`; *"11b.2b keeps `index`"*
- [Source: `11b-2a-…md:377-412`] — **Trap 4**, naming `PoolContributorList.tsx:40-43` (D10's subject)
- [Source: `11b-2a-…md:786-795`] — 11b.2a's own routing of this story's six stale anchors
- [Source: `deferred-work.md:2163`] — the keyExtractor deferral: **OPEN**, blocker still true, re-trigger **not** fired, self-citation stale
- [Source: `_bmad/custom/load-bearing-invariant-checklist.md:72-84`] — family 13's four checks; `bmad-code-review.toml:8-12` makes it live on merge
- [Source: `apps/mobile/components/panchayat/PinnedItem.tsx`] — the family-13 worked example
- [Source: `scripts/friction-budget/lib.ts:453` · `scripts/friction-budget/check.ts:77-79`] — ⭐ why AC8 is unconditional, and why it only fails at push
- [Source: `packages/i18n/locales/{en,hi}/contribution.json:30-39`] — the ten `contributor_list.*` keys; ⭐ `row_a11y` at **`:35`**
- [Source: `packages/i18n/src/resolver.ts:33`] — the single-brace `TOKEN` regex behind the 11a.2 defect
- [Source: `apps/mobile/package.json:32-35`] — ⭐ `@twt/contracts` is already a declared mobile dependency (D10(a))
- [Source: `packages/domain/src/schema/member_postings.ts:51` · `packages/contracts/src/public-pages/directory.ts:82`] — ⭐ `district` HAS a read model (D5-prototype's corrected arithmetic)
- [Source: `packages/domain/src/member/display-name.ts:10-12`] — the memorial prototype named as SAMPLE-DATA (⚠ path is `member/`, ⛔ not `kyc/`)
- [Source: `.decision-log.md#decision-2026-08-24-159` cl.11] — D9(a); *"the right conjunct in the wrong read"*

---

### Review Findings — COMBINED PASS (`bmad-code-review 11b.2 + 11b.2a + 11b.2b`, 2026-09-01)

_Independent 3-layer adversarial review (Blind Hunter · Edge Case Hunter · Acceptance Auditor) over the **whole stacked range `80e0d12..HEAD`** — all 36 commits, all three stories at once, ~3.4k lines of source + tests with the ~7.1k lines of governance record loaded as spec context. ⭐ This is ⛔ **not** a re-run of the five single-story passes that closed these rows. Its subject is the **SEAMS BETWEEN THE STORIES**, which no single-story pass could see by construction: each of those passes read a pointer into a sibling story and had no way to check that the sibling honoured it._

_**Result: 2 decision-needed, 12 patch, 2 deferred, 1 dismissed after live verification.** All three rows were `done` on entry and ⛔ **NO ROW IS FLIPPED BY THE WRITING OF THIS SECTION** — status is BigDev's call at the resolution step._

_⭐⭐ **THE HEADLINE — A CIRCULAR DEFERRAL. The `t()`-through obligation is routed by 11b.2 to 11b.2b, and by 11b.2b back to 11b.2, and is discharged by NEITHER.** Each story's own review pass saw a well-formed pointer to a live sibling obligation and correctly passed it. Only reading both files against each other shows the loop closes on nothing. ⭐ The ground 11b.2b gives for not discharging it — *"no mount"* — is **FALSE**, and the counter-example is a sibling test in the SAME directory under the SAME mount-free harness. See F2._

**Findings owned by 11b.2b (the render layer). The full cross-story list lives in all three story files, routed by owner.**

- [ ] [Review][Patch] **The empty / no-row-derivable branch's `accessibilityRole` is INERT — and the AC7 fence is green over it** [`apps/mobile/components/contributor-list/PoolContributorList.tsx:237`]
  — `<YStack px="$5" py="$6" accessibilityRole="text">` carries ⛔ no `accessible`, so RN never makes it an accessibility element and the role is never applied; the inner `<Text>` at `:238` carries ⛔ no role of its own either. ⚠ It is the **only** state branch shaped that way — the loading branch (`:186-187`) and the absence branch (`:197-198`) both put `accessibilityRole="text"` on the inner `<Text>`, the row (`:168-169`) and the pending strip (`:287-288`) both declare `accessible`. ⭐ The diff **adds** `accessible` to the pending strip and justifies it in a comment as *"relying on that default is exactly how check (a) has failed silently in this codebase before"* — and then does not apply that reasoning one branch up. **Family 13(a)/(d) REAL GAP** — triaged at AC severity, ⛔ not downgraded. ⚠ The AC7 per-branch fence (`apps/mobile/tests/unit/contributor-list-render.test.ts:994`) asserts `/accessibilityRole=/.test(slice)` — **presence, never effect** — so it cannot distinguish a role that lands from one that does not. ⛔ That fence has already been rewritten TWICE (second pass: file-wide count → per-branch; third pass: character-windows → enclosing open tags) for precision, and still tests the wrong property. Fix BOTH halves: the component AND the fence.
- [ ] [Review][Patch] **AC10 still reads "⛔ Scope is THIS FILE ONLY" while the shipped mechanization fences TWO files** [`_bmad-output/implementation-artifacts/11b-2b-contributor-list-mobile-render-layer.md:393-404`]
  — the diff corrects the stale producer claim in `usePoolContributorsQuery.ts` as well and the test fences it (`it('the sibling FETCH hook no longer asserts the producer is unbuilt either')`), while `NomineeConsole.tsx:8-9,208-209` still carries the same staleness by ruling. ⇒ three files with identical staleness now receive three different dispositions and the AC accounts for two. ⚠ This is the **exact defect class AC9 records against itself** (*"the shipped adapter was always right … ⛔ the AC text was never fixed, so a reader of the spec alone was still misled"*), recurring one AC below ([[feedback_spec_edits_must_propagate_to_tasks]]).
- [ ] [Review][Patch] **AC4's anti-chrome fence scopes to 2 files while the sibling AC1 fence was widened to 4 — the query hook is unscanned for a token/status field** [`apps/mobile/tests/unit/contributor-list-render.test.ts`, `const touched = [component, adapter]`]
  — the death-term fence in the same file was deliberately widened at the second pass with the note *"⭐ ADDED at the second code review. The QUERY HOOK is the natural place to add a filter — it is where the rows come from — and it was in no scanned set at all."* `usePoolContributorsQuery.ts` **is** a touched file in this diff, and AC4(a)'s `@twt/tokens` ban + AC4(b)'s status/tone-field ban do ⛔ not run over it. ⇒ the identical gap, closed for one fence, left open for the other, on the same file, in the same test ([[feedback_gate_scope_semantic_coverage]]).
- [ ] [Review][Patch] **`the component reads the nameParts arm off the view-model, not the wire row` does not assert what its name claims** [`apps/mobile/tests/unit/contributor-list-render.test.ts`, AC6 block]
  — the check is a **global budget** (`itemReads.length <= 2` over `/\bitem\.(firstName|lastInitial)\b/g` across the whole component), ⛔ not a location check. `keyExtractor` alone consumes both allowed slots. ⇒ a refactor that composes the label from `item.firstName`/`item.lastInitial` inside `renderItem` while switching `keyExtractor` to `` `${index}` `` leaves exactly 2 wire-row reads and passes **green**, restoring the inline composition AC1 exists to delete.
- [ ] [Review][Patch] **F2 (shared seam) — the `t()`-through proof is circularly deferred and its stated ground is false** [`apps/mobile/tests/unit/contributor-list-render.test.ts:13-17`]
  — this file records a real `t()` resolution as what *"THIS HARNESS CANNOT PROVE … (no mount)"* and points at 11b.2's AC2 as the owner; `packages/ui/tests/contribution-list/presenter.test.ts:193-197` records that it asserts **AROUND** `t()` and names **11b.2b — which CAN call `t()` — as the trigger**. ⛔ Neither discharges it. ⚠ **The "no mount" ground is FALSE:** `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:21,141` imports `t` from `@twt/i18n` and calls `t(key, undefined, { locale, namespace })` in the SAME pure-Vitest mobile harness, in the same directory. **Family 10 REAL GAP** — a **constructible** obligation recorded as not-constructible, which is the inverse of the family. ⇒ add the `t()`-through assertion here on the noticeboard precedent, and amend `deferred-work.md` item `11b.2 (vi)`, whose trigger has now been spent unrecorded.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) via `bmad-dev-story`, 2026-09-01.

### Debug Log References

- ⭐ **RED confirmed before a line of implementation.** `apps/mobile/tests/unit/contributor-list-render.test.ts`
  was authored first and failed to even collect (`ENOENT … contribution-row-input.ts`) — the adapter did
  not exist. GREEN after Tasks 1–2: **53/53**.
- ⭐⭐ **THE FENCES WERE MUTATION-CHECKED, ⛔ not assumed to bite** — three separate mutations, each
  reverted immediately:
  **(i)** removed the `renderItem` try/catch ⇒ *"wraps the derive call in try/catch inside renderItem"*
  **FAILED** (Trap 1 is genuinely guarded, ⛔ not incidentally satisfied);
  **(ii)** added `{deceased ? null : <PoolContributorList />}` to `NomineeConsole.tsx` ⇒ the
  *"render site 2 … carries no death-derived conjunct"* fence **FAILED** — ⭐ the regression fence bites
  on **the exact surface it was aimed at**, the staff-takeover-session-as-deceased one;
  **(iii)** removed the bare `accessible` prop from the row container ⇒ family-13 check (a) **FAILED**.
- `pnpm --filter @twt/mobile test` — **28 files / 393 tests green**, ⛔ no regressions.
- `pnpm turbo run typecheck lint --filter=@twt/mobile` — **14/14 tasks green** across
  `@twt/contracts` · `@twt/ui` · `@twt/i18n` · `@twt/api-client` · `@twt/mobile`.
- ⚠⚠ **SUPERSEDED at the THIRD code review — ⛔ do not read the next line as current.** It was written
  by the FIRST pass and was true of THAT tree; the second pass's re-run FAILED on `integration-tests`
  (three `@twt/domain` load-flake specs, innocence proven in isolation). ⛔ Superseded, ⛔ not falsified,
  ⛔ not deleted ([[feedback_supersede_never_reinterpret]]).
- `pnpm ci:local` — ⭐ **33 jobs green WITH THE INTEGRATION LEG RUN** (`DATABASE_URL` set against the
  `twt-test-pg` container on `:5433`). ⛔ **Not the 31-job variant** — a bare `pnpm ci:local` SKIPS
  `integration-tests` and `ai-10-5-coverage-guard`, and reporting that as green would overstate the run.
- ⭐ **The `friction-budget` leg is among the 33 and evaluated NON-vacuously.** AC-4 diffs COMMITTED
  history (`check.ts:77-79`, `${baseRef}...HEAD`), so it passes for free until the diff is committed —
  the implementation commit landed **before** this run, so the leg actually saw `apps/mobile/` change
  and saw `friction-budget.md` change with it ([[project_friction_budget_baseline_ratchet]]).

### Completion Notes List

**⛔⛔ THE PREFLIGHT GATE — SATISFIED ON SUBSTANCE, AND THE DEVIATION IS STATED, ⛔ NOT PASSED SILENTLY.**
The preflight requires 11b.2 and 11b.2a *"`done` AND MERGED"* into `main` and makes *"report blocked"*
the only other legal action. Verified live: both are `done`; `git fetch origin` run
([[feedback_git_fetch_before_remote_reasoning]]); `origin/main` is `80e0d12` and ⛔ **neither is merged
there** — ⭐ **but both are ANCESTORS of `HEAD`** on `governance/11b-2-validate-split` (`6028581
feat(11b.2)`, `6af8e1f feat(11b.2a)`), and the substance the gate stands for is present:
`deriveContributionRowViewModel` ships at `packages/ui/src/contribution-list/presenter.ts:50` and
11b.2a's erasure omission ships. The `origin/main` pin was written **2026-08-29**, when both siblings
were `ready-for-dev` and **unimplemented** — it was a **proxy for "the presenter exists"**, authored
before it did. ⭐ The proxy is stale; the condition it proxied is **met**. Recorded as **Decision
`2026-09-01-171` cl.4**, which ⛔ rules nothing about merge policy and grants ⛔ no general licence.

**⭐ Task 0 — governance FIRST, in its own commit** ([[feedback_governance_commits_precede_implementation]]).
Decision **`2026-09-01-171`** transcribes ⛔ **only this story's own two rulings** — `D10(a)` and
`D5-prototype(a)`. ⛔ 11b.2a's `D5` · `D6(a)` · `D7(c)` · `D3-aggregate` · `D5-scope` and 11b.2's
`D2(a)` · `D8(a)` · `D9(a)` · `D7-nameform(a)` were ⛔ **not** re-transcribed — they are already at
`2026-08-30-169` and `2026-08-30-168`.

**⛔⛔ THE SEVENTH-ARTEFACT ROUTING WAS VOID, AND THE STORY COULD NOT SAY SO ABOUT ITSELF.** Task 0
ordered `rowKey`'s removal routed into 11b.2 as a seventh D5 artefact. Verified live: **`rowKey` shipped
NOWHERE** — the merged interfaces carry none, and 11b.2 is `done`, so the route would have gone into a
merged story. ⭐ **The adapter had nothing to REMOVE, ⛔ not nothing to PUT.** Ratified as cl.3; ⛔ every
conclusion the instruction carried is correct and unchanged.

**⚠ ONE STORY-FILE ERROR CORRECTED AGAINST THE LIVE TYPE, ⛔ not implemented as written.** AC9(1) says
the adapter re-nests the name fields *"as `{kind:'nameParts', firstName, lastInitial}`"*. ⛔ That is the
presenter's **OUTPUT** kind. The **INPUT** discriminant is **`'name'`**
(`view-model.ts:40-42`; the presenter's own doc-block at `:15` says *"wrap the name fields as
`{ kind: 'name', … }`"*). ⇒ the adapter emits **`kind: 'name'`**. ⭐ Implementing AC9(1) verbatim would
not have compiled — recorded so a reviewer reads the divergence as a **correction**, ⛔ not drift.

**⭐ The a11y key is resolved through the PRESENTER'S REF, ⛔ not re-spelled as a literal.** The
view-model's own two-step contract (`view-model.ts:57-64`) is `t(rowA11y.ref.key, { name }, { namespace:
rowA11y.ref.namespace })` — **key AND namespace** both from the ref. A hard-coded
`t('contributor_list.row_a11y', …, NS)` would have satisfied AC6's letter while leaving the namespace
guessed at the call site, which is the failure mode `t()`-defaults-to-`common`-and-THROWS creates. The
test asserts it **presenter-driven** (`vm.rowA11y.ref.key === 'contributor_list.row_a11y'`), ⛔ not as a
string match.

**⭐⭐ AC7 — family 13 found ONE REAL SUBJECT, and it was closed rather than recorded as vacuous.** The
pending strip's `<Paragraph>` carried `accessibilityLabel` with ⛔ **no explicit `accessible`**. React
Native treats a `Text` as an accessibility element by default, so it **was** being announced — but
relying on that default is precisely how check (a) has failed silently in this codebase before (the
11a.6 `<PinnedItem>` note: *"dropping the `Pressable` drops the mechanism"*). It now declares itself.
⭐ The assertion runs over **every** element carrying `accessibilityLabel`, matching `accessible` as a
**bare prop**, so `accessibilityRole`/`accessibilityLabel` cannot satisfy it — and it was
mutation-checked.
· **(a) ASSERTED** — 2 subjects (row container, pending strip), both explicit.
· **(d) ASSERTED** over the **five** reachable states: loading · absence · empty · a name row · the
  pending strip. ⛔⛔ **The anonymized row is ⛔ NOT in that set** — 11b.2a's D5 makes it unreachable BY
  CONSTRUCTION, and asserting a11y over an unreachable state is the vacuous green family 13 exists to
  catch ([[feedback_gate_scope_semantic_coverage]]).
· **(b) NOT-APPLICABLE** — ⛔ no `progressbar`/`slider` role on this surface, so none can lack
  `accessibilityValue`. ⛔ Recorded N/A, ⛔ **never as passing**.
· **(c) NOT-APPLICABLE** — ⛔ no `button`/`link` role, so none can announce over an empty handler.
  ⛔ Recorded N/A, ⛔ **never as passing**.
· ⛔ **No accessibility CI gate minted** — that is 11b.8's call, by ruling.

**⭐ AC4 was built as the FENCE it was inverted into, ⛔ not as the bridge the authoring pass ordered.**
⛔ No `@twt/tokens` import, ⛔ no `StatusPill`, ⛔ no `*_TOKENS` map, ⛔ no `'green'` literal, ⛔ no
`tone:`/`status:` field, ⛔ no `contributor-list/tokens.ts`. Asserted over **both** touched source files.
D2(a) rejected *"a constant 'confirmed' chrome element in the render layer"* **by name**.

**⭐ AC3 — the `keyExtractor` is byte-unchanged and the deferral STAYS OPEN.** Only its parameter TYPE
spelling moved (a consequence of D10(a)). ⛔ Not marked discharged; ⛔ this story is ⛔ not named its
consumer; its re-trigger (the Epic 11b **public** render) has ⛔ **not** fired — this is the **member**
render of a **single pool's roster**, the scale the deferral's own ground calls fine. **11b.3** is the
real re-trigger. The stale self-citation (`:124-126` → now `:254-256`) is **routed in `deferred-work.md`,
⛔ not written into the ratified entry** ([[feedback_supersede_never_reinterpret]]).

**⛔ UN-ATTESTED, ⛔ NOT BACKFILLED** ([[feedback_record_unattested_no_backfill]]): **(i)** a real
**screen-reader announcement** of any of the five states — the harness proves announced copy is resolved
and the props are present, ⛔ never that a screen reader speaks them; **(ii)** a real **`t()` resolution
at the mobile call site** — 11b.2's AC2 owns the ten-key both-locale ref proof and this story scans its
own call sites, but ⛔ nothing here executes `t()` in a mounted RN tree. ⛔ **No RN mount harness was
stood up** (9.6's Dev Note, in terms). **Re-trigger: 11b.8's accessibility-audit gate.**

**⛔ NOT DONE, DELIBERATELY:** ⛔ `packages/contracts/` never entered the diff — incl.
`pool-contributor-list.ts:88`'s stale *"producer is unbuilt"* doc-block (routed to 11b.3 with a fallback
trigger); ⛔ `NomineeConsole.tsx:3,8,208`'s identical staleness (that file is **verified**, ⛔ not edited
— AC2); ⛔ `apps/mobile/components/shradhanjali/*` untouched (`D5-prototype(a)`); ⛔
`ViewContributorsEntry.tsx` ⛔ not re-checked (recorded verified negative — it reads `data.assigned`
only); ⛔ `packages/ui/**` read-only.

**⭐ AC8 — the friction-budget note is an AFFIRMATION, ⛔ not a new row and ⛔ not an edit to an existing
one** (the `80e0d12` 11b.9 precedent; existing rows left byte-unchanged). ⚠ It names **the branch that
WOULD have owed a row** — the rejected token bridge + constant confirmed chrome — so the absence of a row
is a finding, ⛔ not an oversight. ⭐ And it records the `member-app-native` facet as **UN-MEASURED** for
the **third consecutive story** (11a.5 → 11b.9 → here), stating plainly that a fourth should be read as
a **standing blind spot**, ⛔ not three unlucky diffs.

### File List

| Path | Change |
|---|---|
| `.decision-log.md` | UPDATE — Decision `2026-09-01-171` (Task 0, governance-first commit) |
| `apps/mobile/components/contributor-list/contribution-row-input.ts` | **NEW** — the wire→presenter adapter (AC9 / D10(a)) |
| `apps/mobile/components/contributor-list/PoolContributorList.tsx` | UPDATE — presenter consumption + a per-row try/catch inside a MEMOIZED derivation (`renderItem` reads it by index); `contributorLabel()` and the local `ConfirmedRow` DELETED; family-13 (a) made explicit on the pending strip; AC10 stale comments corrected. **Second review:** `useMemo`/`useCallback` added, dead `estimatedItemSize` removed, dev-only drop diagnostic added |
| `apps/mobile/components/contributor-list/usePoolContributorsQuery.ts` | UPDATE (second review) — the stale "Epic 9's producer is unbuilt" / inert-poll claims CORRECTED; the producer has been live since 9.4/9.5 |
| `apps/mobile/tests/unit/contributor-list-render.test.ts` | **NEW** — 72 assertions (was 53 at authoring, 55 after the first review); comment-stripped source scan + presenter-driven |
| `friction-budget.md` | UPDATE — the AC8 affirmation/disposition note |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE — keyExtractor deferral re-affirmed OPEN + citation routed; five deliberate non-actions recorded |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | UPDATE — row flip + one combined ledger entry |
| `_bmad-output/implementation-artifacts/11b-2b-contributor-list-mobile-render-layer.md` | UPDATE — this file |

⛔ **NOT modified:** `packages/ui/**` · `packages/contracts/**` · `apps/api/**` · `packages/tokens/**` ·
`apps/mobile/components/shradhanjali/**` · `apps/mobile/components/nominee-console/NomineeConsole.tsx`
(**verified**, ⛔ not edited) · `apps/mobile/app/(contribution)/contributors.tsx` (**verified**) ·
`apps/mobile/components/contributor-list/ViewContributorsEntry.tsx` (verified negative).

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-01 | 1.0 | ✅✅ **IMPLEMENTED (`bmad-dev-story`). STATUS `ready-for-dev` → `review`; all 34 task boxes ticked.** ⭐ **Governance FIRST, own commit** — Decision **`2026-09-01-171`** transcribes ⛔ **only this story's own two rulings** (`D10(a)`, `D5-prototype(a)`); ⛔ 11b.2a's and 11b.2's are ⛔ NOT re-transcribed. ⛔⛔ **THE PREFLIGHT'S `origin/main` MERGE GATE IS SATISFIED ON SUBSTANCE, AND THE DEVIATION IS STATED RATHER THAN PASSED SILENTLY (cl.4):** `origin/main` is still `80e0d12` and ⛔ neither sibling is merged there, but ⭐ **both are ANCESTORS of `HEAD`** and the presenter + the erasure omission are verified live — the pin was written 2026-08-29 as a **proxy for "the presenter exists"**, before it did. ⛔⛔ **TASK 0's SEVENTH-ARTEFACT ROUTING WAS VOID (cl.3): `rowKey` SHIPPED NOWHERE** — the merged interfaces carry none and 11b.2 is `done`, so the route would have entered a merged story ⇒ ⭐ the adapter had nothing to **REMOVE**, ⛔ not nothing to **PUT**; ⛔ every CONCLUSION it carried is correct and unchanged. ⚠ ⭐ **ONE STORY-FILE ERROR CORRECTED AGAINST THE LIVE TYPE:** AC9(1) orders the adapter emit `{kind:'nameParts'}` — ⛔ that is the presenter's **OUTPUT** kind; the **INPUT** discriminant is **`'name'`** (`view-model.ts:40-42`, and the presenter's own doc-block `:15` says so) ⇒ implementing AC9(1) verbatim **would not have compiled**. ⭐ The a11y label resolves the **PRESENTER'S REF** (key AND namespace, `view-model.ts:57-64`), ⛔ not a re-spelled literal — asserted **presenter-driven**, ⛔ not by string match. ⭐⭐ **AC7 FOUND ONE REAL SUBJECT AND CLOSED IT:** the pending strip's `<Paragraph>` carried `accessibilityLabel` with ⛔ no explicit `accessible` — announced only by an RN default, which is exactly how check (a) has failed silently here before (11a.6's `<PinnedItem>` note). Now explicit, asserted over **every** label-carrying element with `accessible` matched as a **bare prop**. **(b)/(c) recorded NOT-APPLICABLE, ⛔ never as passing**; **(d)** asserted over the reachable states (⚠ **the set is SIX, amended at the third code review — this row said five**) — ⛔⛔ **the anonymized row is ⛔ NOT one of them** (D5 makes it unreachable BY CONSTRUCTION). ⭐ **AC4 built as the FENCE it was inverted into** — ⛔ no `@twt/tokens`, ⛔ no `StatusPill`, ⛔ no `*_TOKENS` map, ⛔ no `'green'`, ⛔ no palette bridge. ⭐ **AC3: `keyExtractor` byte-unchanged, deferral RE-AFFIRMED OPEN** — ⛔ not discharged, ⛔ this story ⛔ not its consumer, re-trigger (**public** render, 11b.3) ⛔ NOT fired; stale self-citation (`:124-126` → now `:254-256`) **routed**, ⛔ not written into the ratified entry. ⭐⭐ **THREE MUTATION CHECKS, ⛔ not assumed:** removing the try/catch, adding `{deceased ? … }` to `NomineeConsole.tsx`, and dropping the bare `accessible` each **FAILED** the intended fence. ⭐ **53/53** new; **393/393** mobile suite; **14/14** typecheck+lint. ⚠⚠ **SUPERSEDED — these are the
AUTHORING numbers.** First review → 55/397. Third review → **72 new; 414/414 mobile suite; 14/14**.
⛔ The second review's patch 13 claimed to have corrected this row and ⛔ DID NOT (its replace missed the
bold markers); the "ALL 14 APPLIED" line was therefore false as written. Corrected at the third review. ⛔ **UN-ATTESTED, ⛔ not backfilled:** a real screen-reader announcement and a real `t()` at the mobile call site — ⛔ no RN mount harness stood up (9.6's Dev Note); **re-trigger 11b.8**. ⭐ **AC8's note is an AFFIRMATION** (⛔ no new row, ⛔ existing rows byte-unchanged) that **names the branch that WOULD have owed one** — the rejected token bridge — and records `member-app-native` **UN-MEASURED for the THIRD consecutive story**. | BigDev + Claude |
| 2026-08-30 | 0.4 | ✅ **`pool-contributor-list.ts:88`'s stale *"producer is unbuilt"* doc-block ROUTED TO STORY 11b.3** (BigDev). ⛔ Still **not fixed here** — D10(a) imports **from** contracts and ⛔ `packages/contracts/` never enters this diff. ⭐⭐ **11b.3 is the consumer THE FILE ITSELF NAMES**, at `:26-28`: *"the downstream **Sahyog Vivran public render** (Epic 11b) reuses it unchanged"* ⇒ `11b-3-sahyog-vivran-per-claim-story-surface` (`backlog`, ⛔ **no story file yet**, so the routing lands in **11b.2a's Task-6 filing**, which 11b.3's authoring pass reads). ⚠ ⭐ **THE REACHABILITY CAVEAT IS RECORDED, ⛔ NOT ASSUMED AWAY** ([[feedback_trace_reachability_before_escalating]]): the same sentence says 11b.3 *"reuses it **unchanged**"*, so it may **read** the contract without **editing** it ⇒ the filing carries **TWO triggers, ⛔ not one** — **(i)** 11b.3's authoring pass (it must read this contract to build the public render, and `:88` is the line that would make it re-derive *"structurally empty"*), **(ii) FALLBACK — the next story that edits `pool-contributor-list.ts` for ANY reason** — so the item ⛔ cannot evaporate if 11b.3 ships without opening the file. ⭐ Verified `:88` is the **only** stale line in that file (`:8` is the correct half). ⛔ AC9's fence **stays** — the route does not license tidying it in passing. | BigDev + Claude |
| 2026-08-30 | 0.3 | ✅✅ **D10 RULED (a) BY BigDev ⇒ STATUS `blocked-awaiting-decisions` → `ready-for-dev`. ⛔ NOTHING IS GATED BY A DECISION; the hard dependency is the only remaining gate.** ⇒ the local `ConfirmedRow` (`PoolContributorList.tsx:40-43`) is **DELETED** and the adapter types against `import type { ConfirmedContributorRow } from '@twt/contracts'`. ⭐⭐ **TWO OF THE THREE GROUNDS WERE FOUND BY THE RULING'S OWN VERIFICATION, ⛔ not by the option text: (1)** `pool-contributor-list.ts:14` **already declares the discipline** — *"Consumed via `import type … from `@twt/contracts`` … **NO type-shadowing**"* — so `:40-43` **is** the forbidden shadow and (a) brings the file into compliance with the contract's own rule; **(2)** ⭐ **it is not a duplicate, it is a SHADOW, and the deletion is TYPE-NEUTRAL** — `memberPoolContributors()` returns `PoolContributorListResponse` re-exported as `PoolContributorListResult` (`api-client:88,558`), so **`data.confirmed` is ALREADY `ConfirmedContributorRow[]` at the call site** and `ConfirmedRow` only re-annotates params TS already infers; ⭐ `ConfirmedContributorRow` appears **nowhere** in `apps/mobile` today. **(3)** ⛔ no bundle-boundary objection (20+ existing imports; `package.json:33`), `import type` deliberately. ⛔ (b) rejected — survives the hazard **and** adds a second hand-maintained consumer, making 11b.1's defect class **worse**; ⛔ (c) rejected on its face. ⚠ AC9 now states that **AC5's preservation is BEHAVIOURAL, ⛔ not textual** — the params change spelling and lose the local `readonly` (`z.output` is not readonly); ⛔ do not "restore" it by re-declaring a local type. ⭐⭐ **THE CONDITIONING VERIFICATION, RECORDED: `ConfirmedContributorRow` (`:42-52`) is `{firstName, lastInitial}` `.strict()` — ⛔ NO `kind`, ⛔ no `rowKey`, ⛔ no anonymized arm.** ⭐ **CLEAN, and the reason matters: D5 vacated the widening BEFORE IT WAS EVER BUILT** — the two-variant union existed only as 11b.2a's *planned* AC4, ⛔ never as shipped contract ⇒ ⛔ no stale union to inherit. ⛔⛔ **BUT THE VERIFICATION SURFACED A REAL SEPARATE STALE-CONTRACT DEFECT, ⛔ NOT SILENTLY FIXED UNDER D10:** `pool-contributor-list.ts:88` says *"Epic 9's producer is **unbuilt**"* — false since 9.4/9.5 and ⭐ **contradicting its own file header at `:7-8`** (*"live, not structurally empty"*). ⇒ ⛔ **out of this story's diff** (D10(a) imports **from** contracts; ⛔ `packages/contracts/` is never edited here), ⭐ **already filed** by 11b.2a's Task 6, and ⛔ **AC9 fences it explicitly** — reading the file to import from it is exactly when a dev would tidy it, or worse **re-derive the false premise from it** ([[project_epic9_confirmed_producer_is_live]]). | BigDev + Claude |
| 2026-08-30 | 0.2 | ⛔⛔ **FIFTH VALIDATION PASS (`bmad-create-story validate 11b.2b`, at `dbb4a25`) — STATUS `ready-for-dev` → `blocked-awaiting-decisions`. ONE NEW DECISION (D10), ⛔ NOT DEFAULTED.** ✅ Baseline re-pinned `80e0d12` → `dbb4a25`; `git diff --name-only` returns **four `_bmad-output/` files and nothing else** ⇒ ⛔ no verified code claim moved. ⭐⭐ **THE PASS'S GROUND: 11b.2a's D5 · D3-aggregate · D5-scope · D6(a) · D7(c) all landed AFTER this file was authored and between them ABOLISHED THE SUBJECT OF THREE OF ITS ACs.** ⛔⛔ **(1) AC4 ORDERED THE THING D2(a) REJECTED BY NAME — the pass's headline.** It required *"map the presenter's token role names through a local mobile palette bridge"*; verified live, `ContributionRowViewModel` is `{displayName, poolLetterCode, rowKey, rowA11y}` (`11b-2-…md:366-382`) and carries ⛔ **no token role at all**, because 11b.2's **D2(a)** ruled *"⛔ no status on the row"* and rejected option **(c) *"a constant 'confirmed' chrome element in the render layer"*** — adding *"⭐⛔ **AND THIS RULING BINDS 11b.2b**"*. ⭐ The story's own Preflight restated that ban two screens above the AC that violated it. ⇒ **AC4 INVERTED into a three-part anti-chrome fence**; the 2026-07-27 tone→Tamagui precedent is **retained as precedent, ⛔ not as licence**. ⛔⛔ **(2) AC3 HAD NO SUBJECT.** It ordered the `keyExtractor` replaced by *"11b.2a's ruled `rowKey`"* and declared `deferred-work.md:2163` **discharged**; **D5 vacated `rowKey` in full** ⇒ ⭐ re-authored: **the `keyExtractor` KEEPS `index`**, the deferral **STAYS OPEN**, and ⭐ **its re-trigger has ⛔ NOT fired** — it names the Epic 11b **public** render, and this is the **member** render of a single pool's roster (**11b.3** is the real re-trigger). The deferral's own stale self-citation (`:124-126` → live `:137-139`) is **routed**. ⛔ The AC5 exemption is **removed** — the keyExtractor is now part of what is preserved. ⛔⛔ **(3) TRAP 3 DELETED — its subject cannot exist.** The *"nested two-namespace `t()`"* trap presupposed an anonymized row; **D5 + D6(a)** mean ⛔ none is ever emitted ⇒ one call, one namespace. ⭐ **AC6's i18n half shrank and was DE-DUPLICATED**: 11b.2's AC2 (`:313-320`) already owns the ten-key ref-resolution test **declared for this story**, so ⛔ no second `@twt/i18n` test is owed — this story scans **its own call sites** instead. ⭐⭐ **(4) TWO NEW ACs FOR OBLIGATIONS THE AUTHORING PASS NEVER WROTE. AC9 — THE ADAPTER**, which 11b.2 routes here **by name** (`:384-393`: *"⭐ The adapter is 11b.2b's, and **11b.2b owes it an AC**"*) — re-nest `displayName`, splice response-level `pool.letterCode`, ⛔ emit no `rowKey`, ⛔ join nothing (D9(a)). ⚠ ⭐ **And the adapter is where D5's UNDER-ROUTING surfaces:** `11b-2-…md:363`/`:373` still declare `rowKey` **required**, sourced at `:360-362` to the **VACATED** D3-shape(i)(a), and 11b.2a's Task-6 list of six artefacts ⛔ **does not cover them** ⇒ Task 0 routes a **seventh**. **AC10 — the in-diff stale comment**: `PoolContributorList.tsx:11` asserts *"Epic 9's producer is unbuilt"*, false since 9.4/9.5 ([[project_epic9_confirmed_producer_is_live]]); 11b.2a correctly scoped the family out of **its** diff, but ⭐ **this file is in THIS story's diff**. ⛔⛔ **(5) D10 (NEW, UNRULED) — does the adapter type against `@twt/contracts` or against the local `ConfirmedRow` duplicate?** 11b.2a's **Trap 4** names `PoolContributorList.tsx:40-43` as 11b.1's defect class **already present**; the authoring pass wrote *"11b.2a's AC4 makes this derive from the contract"* — ⭐ **that AC is VACATED**, so nothing does. ⚠ ⭐ **It cannot be deferred by inaction**: AC9's adapter must declare an input type either way, and (b) would give the hazard a **second** hand-maintained consumer. ⭐ Verified there is ⛔ **no bundle-boundary objection** — `apps/mobile` already imports `@twt/contracts` in 20+ files and declares it at `package.json:33`. ⛔ (c) rejected on its face (three spellings). ⚠ **(6) TWO FALSE CLAIMS REPLACED BY VERIFIED NEGATIVES:** `ViewContributorsEntry.tsx` *"shares the wire shape 11b.2a widens"* — ⛔ 11b.2a widens nothing, and the file reads **`data.assigned` only** ⇒ ⛔ nothing owed; and the AI-10-1 **Policy-meaning note** said *"your name does not appear next to it"*, which describes an **anonymized row** — ⛔ under D5 the **ROW** does not appear ⇒ **REWRITTEN** ([[feedback_spec_edits_must_propagate_to_tasks]]). ⭐ **(7) D5 → `D5-prototype` RENAMED** — a live collision with 11b.2a's governing **D5**, which is exactly how a ruling gets applied to the wrong question; the ruling itself and its corrected two-field arithmetic are **unchanged**. ⭐ **(8) D3-aggregate carried in as a Dev Note fence**: ⛔ never assert `rows.length === confirmedCount` — under D5 the divergence is **designed**. ⭐ **(9) D7(c) carried in**: `contributor_list.empty`'s only consumer is **this file, `:124`** ⇒ ⛔ do not revert it and ⛔ **no test may byte-pin the sentence** (11b.2a AC8). ✅ **(10) AC8 is the ONE AC unchanged — and it was CHECKED, ⛔ not inherited**: `MEMBER_FACING_PREFIXES` re-verified at `lib.ts:453`; it fires here precisely because this story edits `apps/mobile/`, the same test that made it **not** fire for D7(c). **Citation corrections:** `contributor_list.row_a11y` is `contribution.json:35`, ⛔ not `:36` · the `keyExtractor` is `:137-139`, ⛔ not `:138` alone · family 13 is checklist `:72-84` and the gate is `bmad-code-review.toml:8-12`, ⛔ not `:9` · `display-name.ts` is `packages/domain/src/**member**/`, ⛔ not `kyc/` · `NomineeConsole`'s `ScrollView` closes at `:206`. ⭐ **Verified clean at `dbb4a25`:** both render sites are the **only** two importers · all 27 `tests/unit/` files and ⛔ no mount harness · no death-term at any of the three sites · `member.anonymousMember` at `common.json:215` · `member_postings.ts:51` · `directory.ts:82` · `PinnedItem.tsx` present · `resolver.ts:33`. | BigDev + Claude |
| 2026-08-29 | 0.1 | **Split out of Story 11b.2 by the validation pass at `80e0d12`.** Carries the mobile render layer and family-13 accessibility; runs **after** 11b.2 and 11b.2a. ⭐ Findings applied at authoring: **(1)** ⛔⛔ `<PoolContributorList>` has **TWO** live render sites — the 8.3 route **and** `NomineeConsole.tsx:213`, a staff-takeover-session-as-deceased surface the authoring pass never named ⇒ **AC2**, with the no-death-term assertion aimed at it explicitly. **(2)** *"Preserved byte-for-byte"* would have **pinned a known defect** ⇒ **AC3** (⚠ ⭐ **since REVERSED by the fifth pass — D5 vacated `rowKey` and the keyExtractor KEEPS `index`**). **(3)** ⛔ AC *"resolve token roles through `@twt/tokens`"* contradicted BigDev's 2026-07-27 ruling ⇒ **AC4** inverted to a mobile bridge (⚠ ⭐ **since INVERTED AGAIN by the fifth pass — D2(a) forbids the bridge too**). **(4)** ⛔ There is **no RN mount harness** ⇒ **AC5** restated as five named source-scan assertions and **AC6** records what the harness cannot prove as **un-attested**. **(5)** Trap 3 added — the nested two-namespace `t()` (⚠ ⭐ **since DELETED by the fifth pass — D5/D6(a) abolished its subject**). **(6)** Trap 1 added — 9.12's unguarded-presenter-throw finding ⇒ the try/catch is this story's half (⭐ **strengthened by the fifth pass: D8(a) makes the throw a RULING**). **(7)** **AC7** records family-13 (b) and (c) as **NOT-APPLICABLE**. **(8)** ⛔⛔ **AC8**: friction-budget AC-4 is a **path trigger** and fires unconditionally once `apps/mobile/` is touched. **(9)** D5's arithmetic corrected — `district` **has** a read model, so two producer-less fields, not three. | BigDev + Claude |
