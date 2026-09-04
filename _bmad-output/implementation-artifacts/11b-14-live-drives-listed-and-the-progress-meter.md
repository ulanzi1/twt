---
baseline_commit: aafc08c0
---

<!--
⭐ BASELINE — `governance(11b.13): D1 RULED`. Carries decisions `2026-09-04-186` … `-196`,
Story 11b.10 closed, the six-story split, and stories A/B/C `ready-for-dev` with zero open decisions.
-->

# Story 11b.14: **Live Drives Are Listed**, With a Progress Meter and a Participation Headline `[SURFACE]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story D** of the six-story split (`2026-09-04-195`
> cl.3), following **Trustee-ratified** `-189` cl.2, `-190` cl.6 and `-193` cl.2. ⇒ owes an
> `epics.md` **ANNOTATION** (Task 0).
>
> ⭐⭐ **THIS IS THE STORY THAT RESTORES FR-76.** *"Sahyog Drive — Active + Archive. **Active page
> near-real-time during live alert.**"* — a standing requirement, ⛔ never superseded, ⛔ never built,
> and cited in **⛔ ZERO** implementation records until `-187` found it.
>
> ⛔⛔ **BLOCKED ON B AND C.** B owns the three stage words and the shared copy; C owns the rupee
> target this story's meter measures against. ⛔ Do ⛔ not start before both land.

## Story

As a visitor who has never heard of this trust,
I want to see a drive that is happening **right now** — how many members have already stepped in, and
how much has reached the family so far —
so that I understand what membership actually does, from the evidence rather than from a claim.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed. Stated
explicitly, ⛔ not omitted.

⚠ It **widens a LISTING predicate** — `SAHYOG_DRIVE_VISIBLE_POOL_STATES` gains `live`. ⭐ That governs
what a **stranger can see**, ⛔ not what a member may do: ⛔ no eligibility, ⛔ no assignment, ⛔ no
obligation, ⛔ no amount owed changes. ⭐ `-189` cl.3 (*member > public*) is ⛔ not disturbed — story E
gives the member the same three states **without** the public's redactions.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| The index lists `closed` + `settled`; `live` **excluded** | `SAHYOG_DRIVE_VISIBLE_POOL_STATES` (`public-read.ts:89`) | ⭐ read |
| ⭐ Empty sections **already** suppressed | `sahyog.astro:461`, `:514` — `.length > 0` | ⭐ read |
| ⛔⛔ **The shipped meter's denominator is `rosterSize`, ⛔ NOT a target** | `pool-progress/view-model.ts:47,64` — `confirmedPercentage = min(100, round(confirmedCount / rosterSize × 100))` | ⭐ read |
| The meter **THROWS** when `confirmedCount > rosterSize` | same, `:36-37` — *"an impossible state"* | ⭐ read |
| `amountRaisedInr = confirmedCount × fixedAmount` (9.12 **Decision 3**) | `view-model.ts:60` | ⭐ read |
| ⛔ The index row carries ⛔ **NO** `fixedAmount` | `sahyog-drive.ts` — grepped, absent | ⭐ read |
| ⛔⛔ The index row's own contract says **"⛔ A count, ⛔ never a sum of amounts"** | `sahyog-drive.ts:133`; echoed `public-read.ts:481` | ⭐ read |
| `/sahyog` is edge-cached **`s-maxage=300`** (browser `max-age=60`) | `sahyog.astro:295` | ⭐ read |
| `closedAt` is **nullable** and means *"⛔ no close event yet"* | `sahyog-drive.ts:120-128` | ⭐ read |

## ⛔ THE FIVE TRAPS

### Trap 1 — ⛔⛔ THE SHIPPED METER MEASURES THE **WRONG THING** FOR THIS RULING

`pool-progress` — the component `-187` found *"was built to land here"* — fills its bar with
**`confirmedCount / rosterSize`**: a **participation** ratio. `-191` cl.4 rules the bar fills against a
**RUPEE target** (story C's per-Pariwar figure).

⇒ ⛔ **the component does ⛔ NOT have the shape the ruling requires.** ⚠ And its `confirmedCount >
rosterSize` **THROW** does ⛔ not translate: `amountRaised > target` is an **ordinary, happy** state
(more members gave than the target assumed), ⛔ not an impossible one. ⇒ **D1**.

### Trap 2 — ⚠⛔ THE INDEX ROW'S OWN CONTRACT FORBIDS A SUM. ⛔ CHECK WHAT THAT IS BEFORE OVERRIDING IT

`sahyog-drive.ts:133`: *"⛔ A count, ⛔ never a sum of amounts, and ⛔ never a score: nothing orders by
it, and no 'most-supported' view is offered at any tier **(AC5)**."*

⚠⛔ **READ THE PROVENANCE, ⛔ do not assume either way.** 11b.1's **AC5** — *"remembrance, not
analytics"*, *"this story's load-bearing commitment, per user direction"* — prohibits, in terms:
**leaderboards · rankings · gamification · social-performance metrics · popularity metrics**. ⛔ It
does ⛔ **not** name a sum. ⇒ *"never a sum of amounts"* is the **author's extension** of AC5, adjacent
to the ordering clause that AC5 genuinely supports.

⭐ `-190` cl.6 (**Trustee-ratified**) puts *"₹19.45 lakh"* on the drive headline, and `-189` cl.5
already recorded that this *"puts a RUPEE FIGURE on a public page for the first time … the boundary is
newly crossed and is recorded as such."* ⇒ the Panel has ruled the amount. ⚠ **What is ⛔ NOT ruled is
WHETHER IT GOES ON THE INDEX ROW** — where that sentence lives. ⇒ **D2**.

⛔ Whatever D2 rules, the surviving half of AC5 is **untouched**: ⛔ nothing orders by the figure, ⛔ no
"most-supported" view, ⛔ no ranking, ⛔ no comparison **between** drives.

### Trap 3 — ⚠⛔ FR-76 SAYS *"NEAR-REAL-TIME"*. THE PAGE IS CACHED FOR **FIVE MINUTES**

`sahyog.astro:295` — `public, max-age=60, s-maxage=300`. ⇒ a live drive's meter is up to **five
minutes stale** at every warm PoP, and up to a minute in the browser.

⚠ The house reading of *"near-real-time"* is **polling, ⛔ never a push socket** (8.3 D6; 9.1). ⛔ But
polling ⛔ cannot outrun a shared cache. ⇒ either the figure is accepted as ~5 minutes behind — ⭐ which
*"and counting"* arguably already concedes — or this route's cache policy changes, which is ⛔ **not**
a tuning knob (it is the same class as the rate tier). ⭐ **State the staleness; ⛔ do not silently
shorten the cache.**

### Trap 4 — ⛔ A LIVE DRIVE HAS ⛔ NO CLOSE DATE

`closedAt` is nullable and means *"⛔ no close event yet"*. ⇒ every `live` row carries `null`, and the
index's **"Date the drive closed"** column has nothing to show for the whole new section.

⛔ Do ⛔ not render *"not recorded"* — that is the **announced-omission** shape AC5 forbids and
`visibleSahyogColumns()` exists to prevent. ⭐ Decide the column's behaviour for the Live section
deliberately (⭐ recommendation: the Live section does ⛔ not carry that column at all).

### Trap 5 — ⚠ LISTING A LIVE DRIVE **PUBLISHES ITS ADDRESS**

`-186`: a published link publishes the page's address. `live` drives were the **last** case where the
unguessable address did full work — precisely because ⛔ nothing linked to them.

⭐ **This is ruled and its sting is already drawn:** `-190` cl.1 took the banking coordinates **off**
the public drive page (story **A**), so what a published live address now reaches is the nominee's
name and the drive facts — ⛔ not account numbers. ⚠ ⛔ Do ⛔ not re-open it; ⭐ do **state** it in the
story record, as `-189` cl.1 requires of this whole surface.

---

## Acceptance Criteria

### AC0 — Governance first
Task 0 writes the `epics.md` annotation — ⭐ **including that FR-76 is now RESTORED and that
`epics.md:4865`'s AC parenthetical (*"currently-live pools (closed but not yet settled)"*) is
**SUPERSEDED** by `-189` cl.2** — flips the sprint row, and lands in a `governance:` commit before any
code.

### AC1 — `live` drives are LISTED
`SAHYOG_DRIVE_VISIBLE_POOL_STATES` gains `live`; the index renders a **Live** section using story B's
vocabulary; the three sections keep the existing `.length > 0` suppression (⛔ story B pinned it — ⛔ do
⛔ not add another guard).
**And** ⛔ `spawned` remains excluded, ⛔ unchanged.

### AC2 — Each drive carries a PROGRESS METER
Per `-189` cl.2(b) and D1's shape. **And** ⛔ **THE TARGET IS ⛔ NOT DISPLAYED** (`-190` cl.7(b)) —
⛔ no number, ⛔ no "of ₹X", ⛔ no percentage label that lets it be inferred by arithmetic.
**And** where story C's target is **unset** — the default for every Pariwar — the meter renders per
D1's fallback, ⛔ never a guessed denominator.

### AC3 — The headline is PARTICIPATION-FIRST, and it is the ruled sentence
`-190` cl.6, option (B): *"16,750 members have stood with this family — ₹19.45 lakh, and counting"*, in
both locales, from story B's shared copy where the stage words appear.
**And** the two figures are **internally consistent** — `amountRaisedInr = confirmedCount ×
fixedAmount` by ruled identity (9.12 D3) ⇒ ⛔ the member count beside the amount is the **confirmed
contributor count**, ⛔ never the roster.
**And** ⛔ ⛔ **NO written pitch** (`-190` cl.8): ⛔ no sentence about what a member pays or what a family
receives, ⛔ no projection, ⛔ no "coverage". ⭐ **The arithmetic is SHOWN, ⛔ never ASSERTED.**

### AC4 — The staleness is STATED
Per Trap 3, the story record states how far behind the figure can be, and ⛔ the cache policy is
**unchanged** by this story.

### AC5 — 11b.1's AC5 survives
⛔ Nothing orders by the amount or the count · ⛔ no "most-supported" view · ⛔ no ranking · ⛔ no
comparison **between** drives · ⛔ no badge, streak or achievement.
**And** ⭐ **⛔ no comparison-to-target framing** (7.8 Pool-Reality #2) — ⭐ which is exactly what
`-189` cl.2(c)'s hidden target delivers, and AC2 pins.

### AC6 — ⛔ Nothing else moves
⛔ No bank field (**A**) · ⛔ no stage word invented here (**B**) · ⛔ no target authority (**C**) ·
⛔ no member surface (**E/F**) · ⛔ no rate tier · ⛔ no cache policy · ⛔ no `spawned`.

---

## ⚖️ Decisions

### ⚠ D1 — **OPEN, BLOCKS AC2.** What does the bar fill against, and what happens when there is no target?

⭐ Trap 1: the shipped component divides by **`rosterSize`**; `-191` cl.4 rules a **rupee target**.

- **(a) Extend `pool-progress`** with an optional rupee denominator, keeping `rosterSize` for its
  existing member-app consumer. ⭐ One component, two modes. ⚠ Its `> rosterSize` THROW must ⛔ not
  fire on `amountRaised > target`, which is an **ordinary** state here.
- **(b) A separate public presenter**, leaving `pool-progress` untouched. ⭐ ⛔ No risk to the shipped
  member card. ⚠ Two meters to keep honest — and the 9.12 ruling named **one canonical producer**.
- **(c) Fill against `rosterSize`** on the public surface too, and let story C's target govern ⛔ only
  the (hidden) reveal. ⭐ Zero component change; ⚠ ⛔ but it contradicts `-191` cl.4 as written.

⚠ **And the sub-question either way: with ⛔ NO target set — the default for every Pariwar — what
renders?** ⭐ Recommendation: **the headline figures only, ⛔ no bar**. ⛔ Never a guessed denominator,
⛔ never `rosterSize` silently substituted for a target the Trust has not set.

⭐ **BigDev's recommendation: (a) + no-bar-without-a-target.** It honours the 9.12 "single canonical
producer" ruling, and the THROW is re-scoped rather than removed.

### ⚠ D2 — **OPEN, BLOCKS AC3.** Does the amount render on the INDEX ROW, the DRIVE PAGE, or BOTH?

⭐ Trap 2: the index row's contract says *"⛔ never a sum of amounts"*; the Panel ruled the amount.

- **(a) Drive page only.** ⛔ The index keeps counts. ⭐ The `sahyog-drive.ts:133` sentence stands
  untouched. ⚠ But a visitor scanning the list sees ⛔ no money — and `-190` cl.8's whole mechanism is
  that **the UI carries the understanding**, which is weakest where people actually land.
- **(b) ⭐ BOTH.** ⚠ Requires amending `sahyog-drive.ts:133` — ⭐ **AMEND and NAME it**, ⛔ never delete:
  the sentence was an **author's extension** of AC5 (which prohibits ranking, ⛔ not sums), and
  `-190` cl.6 + `-189` cl.5 ruled the figure. ⛔ The ordering/most-supported half of AC5 stays.
- **(c) Index only.** ⛔ Incoherent — the drive page is where a reader who clicked wants the detail.

⭐ **BigDev's recommendation: (b), with the amendment written as an amendment.** ⚠ ⛔ Do ⛔ not
quietly delete the *"never a sum"* sentence; this epic has logged **three** claims that outlived what
they described, and silently removing a fourth is the same failure wearing the opposite sign.

---

## ⚠ What this story does ⛔ NOT do

⛔ It does ⛔ not build the target, its keys or its admin surface (**C**) · ⛔ not invent stage words
(**B**) · ⛔ not touch bank fields (**A**) · ⛔ not build any member surface (**E/F**) · ⛔ not change
the cache policy or the rate tier · ⛔ not list `spawned` · ⛔ not add ordering, ranking or any
cross-drive comparison · ⛔ not publish a written pitch (`-190` cl.8).

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0) — annotate `epics.md` (⭐ FR-76 **restored**; the `:4865` AC
      parenthetical **superseded**); flip the sprint row; ⛔ one `governance:` commit, ⛔ no code.
- [ ] **Task 1 — RULE D1 AND D2** (blocks Tasks 3-5). ⛔ Do ⛔ not choose unilaterally.
- [ ] **Task 2 — The listing predicate** (AC1) — `SAHYOG_DRIVE_VISIBLE_POOL_STATES` gains `live`;
      amend its doc-block, which currently says `live` is *"ABSENT deliberately"* — ⭐ **amend and name
      the previous claim**, ⛔ never overwrite; ⛔ `spawned` untouched.
- [ ] **Task 3 — The meter** (AC2, per D1) — including the **no-target** path and re-scoping the THROW.
- [ ] **Task 4 — The wire** (AC3) — the index row needs what the headline consumes. ⚠ Prefer sending
      the **derived** `amountRaisedInr` over exposing `fixedAmount` as a new public field; ⭐ ⛔ do not
      add both.
- [ ] **Task 5 — Render + copy** (AC1, AC3, AC5) — the Live section; the headline in both locales from
      B's shared source; Trap 4's column decision; ⛔ no ordering affordance anywhere.
- [ ] **Task 6 — The prose that must move** (AC0, AC4, Trap 2, Trap 5) — amend `sahyog-drive.ts:133`
      per D2; state the **staleness** (Trap 3); state the **address-publication** consequence
      (Trap 5). ⛔ Amend and NAME; ⛔ never delete.
- [ ] **Task 7 — Tests** — a `live` drive appears; `spawned` does ⛔ not; the target is ⛔ NOWHERE in any
      response (AC2); headline figures are internally consistent (AC3); ⛔ no ordering parameter is
      accepted; the empty-section suppression still holds; the scrape-test identity set updated.
      ⭐ **Execute them** against `twt-test-pg` `:5433` — ⛔ *"written but not run"* is ⛔ not attested.

---

## Dev Notes

### This story is where FR-76 finally lands

⭐ It is ⛔ not a feature request. **FR-76 has been a standing, un-superseded requirement since the
PRD**, cited in ⛔ zero implementation records, discovered only because BigDev asked *"who decided a
collecting drive is a solicitation?"*. ⇒ Task 0's annotation is the **repair of a five-month gap**, and
it should read that way.

### The two decisions are the whole story

⭐ Tasks 2 and 5 are mechanical. **D1 and D2 are not** — one reconciles a ruling with a component that
does ⛔ not fit it, the other decides whether to amend a sentence a previous story wrote into a
contract. ⚠ ⛔ Neither should be resolved by the dev agent.

### Testing standards

Live-DB integration under `apps/api/tests/integration/public-pages/`; copy and presenter assertions as
units. ⚠ Assert **membership and explicit values**, ⛔ never counts over the shared fixture
([[project_live_db_test_gotchas]]).

### References

- `.decision-log.md#decision-2026-09-04-189` cl.2, cl.5 · `-190` cl.6, cl.7(b), cl.8 · `-193` cl.2
- `.decision-log.md#decision-2026-09-04-187` — FR-76's provenance and the un-built requirement
- `packages/ui/src/pool-progress/view-model.ts:36-67` — the meter's real shape
- `packages/contracts/src/public-pages/sahyog-drive.ts:133` — *"never a sum of amounts"*
- `packages/domain/src/pool/public-read.ts:89` — the listing predicate
- `apps/public/src/pages/sahyog.astro:295,461,514` — cache policy; the empty-section guards

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **D**). ⚠ **D1 and D2 are OPEN.** ⭐ Findings at authoring: the shipped meter divides by **`rosterSize`, ⛔ not a target**; the index contract says **"⛔ never a sum of amounts"** and that sentence is an **author's extension** of 11b.1 AC5, ⛔ not AC5 itself; and `/sahyog` is cached **5 minutes** against FR-76's *"near-real-time"*. | BigDev + Claude |
