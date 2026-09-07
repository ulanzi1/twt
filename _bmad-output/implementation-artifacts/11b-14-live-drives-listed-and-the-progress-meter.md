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
> ⭐⭐ **SCOPE EXTENDED 2026-09-05 — this story now also lands the Panel's ruling that the NOMINEE
> NAME goes ON THE INDEX** (11b.12 D2, ruling 2 — Trustee-ratified DR + KB). ⭐ **AC7**, with its own
> governance-first clause, its own 50× decrypt-volume clause, and the record that the value stays
> **unverified until Story 6.18 ships**. ⛔ It is ⛔ not 11b.12's (that story's AC7 forbids it).
>
> ✅⭐ **UNBLOCKED 2026-09-06.** B (`11b-12`) and C (`11b-13`) are both `done`. ⭐ Recorded as a
> DISCHARGE, ⛔ not overwritten ([[feedback_supersede_never_reinterpret]]) — the clause read
> *"⛔⛔ **BLOCKED ON B AND C.** … ⛔ Do ⛔ not start before both land."* B owns the three stage words
> and the shared copy; C owns the rupee target this story's meter measures against. **Both landed.**
> ⚠ Task 0 must clear the same stale text from the sprint row's own comment block.
>
> ⚠⛔⛔ **VALIDATED 2026-09-06 — THREE MORE OPEN QUESTIONS, AND THE BASELINE HAS MOVED 105 FILES.**
> ⭐ **`D4`** — ⛔ AC2 cites `-190` cl.7(b) and **drops cl.7(c)**; C's `revealToPublic` has **⛔ ZERO**
> production readers, and `-196` cl.8 names **THIS STORY** as the target's *"first consumer"*.
> ⭐ **`D5`** — ⛔ AC3's ruled headline **does ⛔ not exist** in B's shared copy, and ⛔ no ruling
> assigns it a surface. ⭐ **AC7's double-absence gap** — deferred to this story **BY NAME** by
> 11b.12's code review. ⇒ see **⚖️ Decisions** and **AC7's open item**; ⛔ none is pre-ruled here.
>
> ⏳⭐⭐ **`D4` AND `D5` ARE ROUTED TO THE TRUSTEE PANEL — 2026-09-07, BigDev's direction.**
> ⇒ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md`
> ⛔ **BigDev rules neither.** ⚠ **AMENDED 2026-09-07 — ⭐ `D5` NARROWED and ⭐ `D6` ADDED:**
> ✅ **which rows carry which sentence is RESOLVED** (⭐ **Live** → cl.6's headline; ⭐ **Closed ·
> Verified** → `index_line.*`), traced to `-189` **cl.2(e)** — ⛔ withdrawn as a Panel question.
> ⏳ **`D6`** — ⛔ the shipped meter label, rendered **directly above the bar**, is *"{confirmed} of
> **{total}** contributions confirmed"*: ⛔ **it names its denominator**, which `D1(a)` makes the
> target. ⇒ ⛔ **the bar built to hide the target would PRINT it** — ⭐ a different channel from `D3`,
> ⛔ requiring no arithmetic at all.
> ⚠ **Tasks 3 and 5 are BLOCKED until the Panel answers `D4` / `D5` / `D6`.** ⭐ Every other task
> proceeds — ⛔ the escalation blocks the meter's denominator, its label and the copy, ⛔ nothing else.
> ⭐ The note rests **only** on ratified text and verified repository state; ⛔ it cites ⛔ no code
> comment, ⛔ no doc-block and ⛔ no story prose as evidence (its §7 lists every check).
> ⚠ **And every `file:line` in this story drifted** — B and C rewrote all of them. Re-anchored below.
>
> ⚠⛔ **ROUTED IN FROM C, 2026-09-06 (11b.13 validation) — `D3`: THE METER RECOVERS THE HIDDEN TARGET
> BY ARITHMETIC, AND ⛔ EVERY TEST EITHER STORY WRITES PASSES ANYWAY.** ⭐ Recorded from C's side
> because **C mints the reveal control this channel bypasses**; ⭐ **BigDev routed the QUESTION here
> unanswered** — ⛔ C decides nothing, ⛔ C narrows nothing. ⇒ **see AC2.**

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

## 🎯 What already EXISTS — ⭐ **RE-VERIFIED LIVE 2026-09-06**, ⛔ not assumed

> ⚠⛔ **⛔ EVERY LINE NUMBER IN THE 2026-09-04 TABLE HAD DRIFTED.** B and C rewrote all of these
> files between `aafc08c0` and `55e3eee7` (105 non-`_bmad-output` files). ⭐ The **content** of every
> original citation was correct; ⛔ only the anchors moved — ⚠ except `public-read.ts:481`, whose
> quoted wording was ⛔ **never** what that file says (see its row). ⭐ `pool-progress/` is the ⛔ ONLY
> cited path untouched since baseline.

| Fact | Where — ⭐ **re-anchored 2026-09-06** | Verified |
|---|---|---|
| The index lists `closed` + `settled`; `live` **excluded** | `SAHYOG_DRIVE_VISIBLE_POOL_STATES` (`public-read.ts:102`; the *"ABSENT deliberately"* doc-block `:97-100`) ⚠ was `:89` | ⭐ read |
| ⛔⛔ **The public wire enum has ⛔ ONLY TWO MEMBERS** — and its doc-block **names this story** | `sahyog-drive.ts:80` `z.enum(['closed','verified'])`; `:78` — *"⛔ `live` is ⛔ **NOT** a member here … (Story 11b-14)"* | ⭐ read |
| ⛔⛔ **The state→token map is a TOTAL function, so widening ⛔ FAILS TO COMPILE — ⭐ by design** | `public-read.ts:137-140` `PUBLIC_STATUS_BY_POOL_STATE`; its own `:134-135` states the property | ⭐ read |
| ⚠⛔ **A hand-typed literal-set guard the typecheck ⛔ CANNOT see** | `sahyog.server.ts:210` — a two-literal OR over `r['status']`, hand-written beside the Zod enum rather than derived from it | ⭐ read |
| ⛔⛔ **The section partition is TWO-WAY, and its `else` sweeps everything non-`verified` into "Closed"** | `sahyog-render.ts:341-346` — *"⛔⛔ THE PARTITION LITERAL … Get it wrong and EVERY drive lands in one section"*; the label ternary `:299` | ⭐ read |
| ⭐ Empty sections **already** suppressed | `sahyog.astro:499`, `:552` — `.length > 0` ⚠ was `:461`/`:514`. ⛔ The third at `:602` is **pagination**, ⛔ not a section | ⭐ read |
| ⛔⛔ **The meter's REAL code is `presenter.ts` — `view-model.ts` has ⛔ ZERO executable statements** | `presenter.ts:73-74` (percentage) · `:69` (amount) · `:60-65` (the over-count THROW) · `:34-40` + `:53-56` (operand guards) | ⭐ read |
| ⛔ The shipped meter's denominator is `rosterSize`, ⛔ **NOT** a target | `presenter.ts:73-74` — `rosterSize > 0 ? Math.min(100, Math.round((confirmedCount / rosterSize) * 100)) : 0` | ⭐ read |
| `amountRaisedInr = confirmedCount × fixedAmount` (9.12 **Decision 3**) | `presenter.ts:69`; doc mirror `view-model.ts:60` | ⭐ read |
| ⛔⛔ **The anti-widening test rejects ⛔ ANY new input key — ⛔ not only yellow/pending** | `packages/ui/tests/pool-progress/presenter.test.ts:157-163` (`Record<keyof …, true>`) + `:186-188` (exact-set equality vs a five-element literal) | ⭐ read |
| ⛔ `rosterSize` **and** `fixedAmount` are **REQUIRED** operands; ⛔ there is ⛔ no pre-derived-amount input | `view-model.ts:44-50`; guarded `presenter.ts:53-56` | ⭐ read |
| ⭐ **Exactly ONE production consumer** of the presenter | `apps/mobile/components/active-contribution/ActiveContributionCard.tsx:125` | ⭐ read |
| ⛔ The index row carries ⛔ **NO** `fixedAmount` and ⛔ no amount — ⭐ **but the SQL already selects it** | contract `sahyog-drive.ts` (grepped, absent); ⭐ `public-read.ts:695` `fixedAmount: pools.fixedAmount` | ⭐ read |
| ⛔⛔ **BOTH RUPEE TOTALS ARE QUARANTINED BY NAME ON THE READ PATH** | `public-read.ts:739-743` — *"⛔ Do not widen `SahyogDriveEntry` to carry **either of them, under any name**"*; totals at `:760-761`, where `deliveredTotal` **IS** `amountRaisedInr` | ⭐ read |
| ⛔⛔ The index row's own contract says **"⛔ A count, ⛔ never a sum of amounts"** | `sahyog-drive.ts:149-150` ⚠ was `:133`. ⭐ **Third site: `sahyog-vivran.ts:345-347`** — same sentence, the **drive page** | ⭐ read |
| ⚠ The domain echo is **SHORTER — ⛔ the 2026-09-04 quote was never its text** | `public-read.ts:524` ⚠ was `:481` — *"⛔ A count, ⛔ never a sum, ⛔ never a score."* ⛔ No *"of amounts"*, ⛔ no ordering tail | ⭐ read |
| `/sahyog` is edge-cached **`s-maxage=300`** (browser `max-age=60`) | `sahyog.astro:304` ⚠ was `:295`; the header string is byte-identical | ⭐ read |
| `closedAt` is **nullable** and means *"⛔ no close event yet"* | `sahyog-drive.ts:139-144` ⚠ was `:120-128` | ⭐ read |
| ⚠⛔ **A null date/district ALREADY renders *"Not recorded"* — ⛔ the shipped default, ⛔ not a choice** | `sahyog-render.ts:498-505` — *"the fallback lives HERE, ⛔ not in the template"*; `value.date_unknown` = *"Not recorded"* / *"दर्ज नहीं"*, both locales | ⭐ read |
| ⚠⛔ **Test-pinned copy that goes FALSE the moment AC1 lands** | `sahyog-drive.json` `page.intro` — *"Drives that are still **Live are not listed here**."* / *"जो अभियान अभी जारी हैं वे यहाँ **सूचीबद्ध नहीं** हैं।"*; pinned `sahyog-copy.test.ts:34` | ⭐ read |
| ⛔ Adding a rendered field is a **MATRIX ACT** — `deriveFieldIds` **throws in BOTH directions** | `surface-fields.ts:338` `SAHYOG_DRIVE_ROW_FIELD_IDS` · `:369` `SAHYOG_DRIVE_ROW_SHAPE` · `:59-92` | ⭐ read |
| ⛔⛔ **The Tier-1 allowlist pins (surface, field) PAIRS — ⚠ and forbids its own remedy** | `matrix.ts:398-453`; `:396-397` — *"do NOT 'fix' a failing third entry by appending it here … The gate failing is the gate working."* | ⭐ read |
| ⛔⛔ **C's `revealToPublic` has ⛔ ZERO production readers** — admin write + DB + RLS + CHECK, ⛔ no render | grepped `packages`/`apps`: schema, policy, contract, admin form, API handler ⛔ only. ⇒ **`D4`** | ⭐ read |
| ⭐ C's target resolver — ⛔ **the key path this story consumes, ⛔ never named until now** | `resolveEffectiveDriveTargetInr` (`domain/src/pool/drive-target-policy.ts:169`) · `resolveDriveTargetVisibility` (`:233`) · re-exported `pool/index.ts:53` | ⭐ read |
| ⛔ **⛔ NO formatter produces *"₹19.45 lakh"* or *"16,750"*** | `packages/i18n/src/currency.ts` emits `"₹ 19,45,000"` (space, Indian grouping, ⛔ no word form); ⛔ no shared plain-number formatter; `apps/public/src` has **zero** currency formatting | ⭐ read |
| ⭐ AC7's premise **HOLDS** — the nominee name survived 11b.11 at `tier: public` | `sahyog-vivran.ts:287` + `:383` `.max(2)`; matrix row `public-vs-private-matrix.yaml:970`, exception keyed `2026-09-04-190 cl.2` | ⭐ read |
| ⭐ AC7's `t()`-THROWS correction is **TRUE** | `resolver.ts:39` — `[i18n] missing interpolation param`; pinned `packages/i18n/tests/resolver.test.ts:39-40` | ⭐ read |
| ⚠ The index **ALREADY** performs up to **50** Tier-1 KMS decrypts per request | `handlers.ts:399` + `:441` — the deceased member's KYC name, bounded by `mapWithConcurrency` | ⭐ read |

## ⛔ THE EIGHT TRAPS

### Trap 1 — ⛔⛔ THE SHIPPED METER MEASURES THE **WRONG THING** FOR THIS RULING

`pool-progress` — the component `-187` found *"was built to land here"* — fills its bar with
**`confirmedCount / rosterSize`** (`presenter.ts:73-74`): a **participation** ratio. `-191` cl.4
rules the bar fills against a **RUPEE target** (story C's per-Pariwar figure).

⇒ ⛔ **the component does ⛔ NOT have the shape the ruling requires.** ⚠ And its `confirmedCount >
rosterSize` **THROW** (`presenter.ts:60-65`) does ⛔ not translate: `amountRaised > target` is an
**ordinary, happy** state (more members gave than the target assumed), ⛔ not an impossible one.
⇒ **D1**.

⚠⛔ **AND ⛔ THREE MECHANICAL BLOCKS SIT BETWEEN D1(a) AND A GREEN BUILD — ⛔ verified 2026-09-06,
⛔ none of them named at authoring:**

1. ⛔⛔ **THE ANTI-WIDENING TEST REJECTS ⛔ ANY NEW INPUT KEY, ⛔ not only a yellow/pending operand.**
   `packages/ui/tests/pool-progress/presenter.test.ts:157-163` is
   `const INPUT_KEYS: Record<keyof PoolProgressCardInput, true> = { … }` — **five keys** — and
   `:186-188` asserts `Object.keys(INPUT_KEYS).sort()` **equals a hard-coded five-element literal**.
   ⇒ adding `targetInr?: number` — ⭐ **optional or not** — fails the **typecheck** at `:157`
   (missing key), and fixing that fails the **runtime** assertion at `:186`. ⚠ The banned-name loop
   at `:189-191` is only the *secondary* check. ⛔ `view-model.ts:15`'s *"the anti-widening unit test
   rejects it"* is true of **ANY** widening. ⇒ **Task 3 must update BOTH halves and RECORD the
   relaxation as deliberate**, keeping the banned-name loop intact.
2. ⛔ **`rosterSize` IS A REQUIRED OPERAND AND THERE IS ⛔ NO ROSTERLESS INPUT.** `presenter.ts:53-56`
   guards all five unconditionally; a public caller with no roster cannot pass `rosterSize: 0`,
   because any non-zero `confirmedCount` (AC3's 16,750) then **throws** at `:60-65`. ⚠ The
   `rosterSize > 0` branch at `:73-75` guards only divide-by-zero and is ⛔ never reached.
3. ⛔ **`fixedAmount` IS ALSO REQUIRED, AND THERE IS ⛔ NO PRE-DERIVED-AMOUNT INPUT.** `amountRaisedInr`
   is **computed** at `:69` from `confirmedCount × fixedAmount`. ⇒ D1(a) must decide whether the
   public mode takes `fixedAmount` (and derives) or takes an amount (and a new mode).

⭐ **THE ⛔ ONLY PRODUCTION CONSUMER IS `ActiveContributionCard.tsx:125`** — D1's *"member card
UNCHANGED"* is safe, ⚠ but `apps/mobile/tests/unit/self-verify-surface-render.test.ts:129-149` reads
that call site **as a string** and asserts its shape by regex. ⭐ Add it to Task 7's list.

### Trap 2 — ⚠⛔ THE INDEX ROW'S OWN CONTRACT FORBIDS A SUM. ⛔ CHECK WHAT THAT IS BEFORE OVERRIDING IT

`sahyog-drive.ts:149-150` (⚠ **was cited as `:133`; re-anchored 2026-09-06**): *"⛔ A count, ⛔ never a
sum of amounts, and ⛔ never a score: nothing orders by it, and no 'most-supported' view is offered at
any tier **(AC5)**."*

⚠⛔ **READ THE PROVENANCE, ⛔ do not assume either way.** 11b.1's **AC5** — *"remembrance, not
analytics"*, *"this story's load-bearing commitment, per user direction"* — prohibits, in terms:
**leaderboards · rankings · gamification · social-performance metrics · popularity metrics**. ⛔ It
does ⛔ **not** name a sum. ⇒ *"never a sum of amounts"* is the **author's extension** of AC5, adjacent
to the ordering clause that AC5 genuinely supports.

⭐ `-190` cl.6 (**Trustee-ratified**) puts *"₹19.45 lakh"* on the drive headline, and `-189` cl.5
already recorded that this *"puts a RUPEE FIGURE on a public page for the first time … the boundary is
newly crossed and is recorded as such."* ⇒ the Panel has ruled the amount. ⚠ **What is ⛔ NOT ruled is
WHETHER IT GOES ON THE INDEX ROW** — where that sentence lives. ⇒ **D2**.

⚠⛔⛔ **AND THE SENTENCE LIVES AT ⛔ THREE SITES, ⛔ NOT TWO — ⭐ found 2026-09-06:**

| Site | Text | In D2's scope? |
|---|---|---|
| `sahyog-drive.ts:149-150` | the full sentence + the ordering tail | ⭐ **YES** — the index row |
| `public-read.ts:524` | ⚠ **SHORTER** — *"⛔ A count, ⛔ never a sum, ⛔ never a score."* ⛔ no *"of amounts"*, ⛔ no ordering tail | ⭐ **YES** — ⚠ was mis-cited as `:481` **and mis-quoted**; a literal-string edit will ⛔ not find the quoted text |
| ⭐ **`sahyog-vivran.ts:345-347`** | the same sentence, on the **DRIVE PAGE** | ⭐ **YES** — ⛔ D2 rules the amount renders on the drive page **too**, so the amendment reaches here. ⛔ Unnamed at authoring |

⛔⛔ **AND A FOURTH SITE IS ⛔ NOT PROSE — IT IS AN OPERATIVE PROHIBITION ON THE READ PATH.**
`public-read.ts:739-743`:

> *"⭐ THE TARGET IS QUARANTINED HERE AND NOWHERE ELSE. Both totals are whole INR … and BOTH DIE ON
> THIS LINE … ⛔ Do not widen `SahyogDriveEntry` to carry **either of them, under any name**."*

⚠ The two totals are computed at `:760-761`, and **`deliveredTotal = confirmedContributionCount ×
r.fixedAmount` IS `amountRaisedInr`** — ⭐ the identical arithmetic. ⇒ **Task 4's preferred option is
prohibited BY NAME at the exact line it must cross.** ⛔ D2 supersedes it, ⭐ but only if the story
says so: **amend and NAME `:739-743` too**, ⛔ never edit past it silently.
⭐ **Good news for Task 4:** `fixedAmount` is **already selected** at `public-read.ts:695`, so ⛔ no
read-shape change is needed to compute the amount server-side.

⛔ Whatever D2 rules, the surviving half of AC5 is **untouched**: ⛔ nothing orders by the figure, ⛔ no
"most-supported" view, ⛔ no ranking, ⛔ no comparison **between** drives.

### Trap 3 — ⚠⛔ FR-76 SAYS *"NEAR-REAL-TIME"*. THE PAGE IS CACHED FOR **FIVE MINUTES**

`sahyog.astro:304` (⚠ was `:295`) — `public, max-age=60, s-maxage=300`. ⇒ a live drive's meter is up
to **five minutes** stale at every warm PoP, and up to a minute in the browser.

⚠ The house reading of *"near-real-time"* is **polling, ⛔ never a push socket** (8.3 D6; 9.1). ⛔ But
polling ⛔ cannot outrun a shared cache. ⇒ either the figure is accepted as ~5 minutes behind — ⭐ which
*"and counting"* arguably already concedes — or this route's cache policy changes, which is ⛔ **not**
a tuning knob (it is the same class as the rate tier). ⭐ **State the staleness; ⛔ do not silently
shorten the cache.**

### Trap 4 — ⛔ A LIVE DRIVE HAS ⛔ NO CLOSE DATE — ⚠ AND THE FORBIDDEN STRING IS THE SHIPPED DEFAULT

`closedAt` is nullable and means *"⛔ no close event yet"*. ⇒ every `live` row carries `null`, and the
index's **"Closed on"** column has nothing to show for the whole new section.

⛔ Do ⛔ not render *"not recorded"* — that is the **announced-omission** shape AC5 forbids and
`visibleSahyogColumns()` (`sahyog-render.ts:470`) exists to prevent.

⚠⛔⛔ **AND THAT IS ⛔ NOT A HYPOTHETICAL — ⭐ IT IS WHAT SHIPS TODAY, BY DEFAULT.**
`sahyog-render.ts:503-505` already does `valueOf: (row) => row.driveClosedAt ?? labels.dateUnknown`,
and `value.date_unknown` is *"Not recorded"* / *"दर्ज नहीं"* in **both** locales. ⭐ Its own comment:
*"⚠ The 'not recorded' fallback lives **HERE**, ⛔ not in the template."* ⇒ Trap 4 is an **EDIT at a
named site**, ⛔ not merely a decision to record. ⭐ Recommendation unchanged: **the Live section does
⛔ not carry that column at all.**

⚠ **AND ⛔ ONE MORE FIELD HAS ⛔ NO MEANING FOR A LIVE DRIVE.** `SahyogDriveRow.closeOfCycleFraming`
(`surface-fields.ts:~281`) is *"Pool-Reality #2 framing copy. ⛔ Contains NO target, percentage or
shortfall, by construction"* — a **close-of-cycle** sentence on a drive that has ⛔ not closed. ⛔ Its
producer is `fundingOutcome`, which is `null` for a drive with no assigned count and is meaningless
mid-drive. ⇒ **decide it with the date column**, ⛔ do not let it render a closing sentence over a
running drive.

### Trap 5 — ⚠ LISTING A LIVE DRIVE **PUBLISHES ITS ADDRESS**

`-186`: a published link publishes the page's address. `live` drives were the **last** case where the
unguessable address did full work — precisely because ⛔ nothing linked to them.

⭐ **This is ruled and its sting is already drawn:** `-190` cl.1 took the banking coordinates **off**
the public drive page (story **A**), so what a published live address now reaches is the nominee's
name and the drive facts — ⛔ not account numbers. ⚠ ⛔ Do ⛔ not re-open it; ⭐ do **state** it in the
story record, as `-189` cl.1 requires of this whole surface.

⭐⭐ **AND CITE `2026-09-05-200`, ⛔ NOT `-186` ALONE** — a **Trustee ratification landed AFTER this
story's baseline** and answers the reachability question head-on: *"yes, a collecting drive's page
should be reachable by the public"* (**A1**, DR + KB) and *"It doesn't change anything. Phone-app
member should reach the page."* (**A2**). ⭐ Its cl.4 makes the member-app path *"a **RATIFIED
PROPERTY**, ⛔ NOT AN IMPLEMENTATION DETAIL."* ⇒ Trap 5's disposition is **stronger**, ⛔ not weaker.

### Trap 6 — ⛔⛔ WIDENING THE LISTING PREDICATE IS **FIVE** ARTEFACTS — ⛔ TWO OF THEM FAIL **SILENTLY**, AND ONE IS A ROUTING NOTE ADDRESSED TO THIS STORY, **IN CODE**

⚠ The 2026-09-04 AC1 spoke only of `SAHYOG_DRIVE_VISIBLE_POOL_STATES`. ⛔ That is one of five:

1. ⭐ **`SAHYOG_DRIVE_VISIBLE_POOL_STATES`** (`public-read.ts:102`) gains `live`; amend the
   `:97-100` doc-block that calls `live` *"ABSENT deliberately"* — ⭐ **amend and NAME**.
2. ⛔⛔ **`PublicSahyogDriveStatus`** (`sahyog-drive.ts:80`) is `z.enum(['closed','verified'])` and
   must gain `'live'`. ⭐⭐ **ITS DOC-BLOCK AT `:78` IS A ROUTING NOTE TO THIS STORY:** *"⛔ `live` is
   ⛔ **NOT** a member here — the index does ⛔ not list live drives (**Story 11b-14**)."* ⚠ 11b.12's
   own **AC7** left it deliberately (*"⛔ `live` is ⛔ NOT added to the public index enum — ⭐ that is
   **story D**"*), and `epics.md:5136` annotation (vii) says the same.
3. ⭐ **`PUBLIC_STATUS_BY_POOL_STATE`** (`public-read.ts:137-140`) is
   `Record<SahyogDriveVisiblePoolState, SahyogDriveStatus>` — a **TOTAL** function. ⭐ Its own
   `:134-135`: *"widening the visible set without minting a public word **fails to compile**."*
   ⇒ ⭐ **the compile break is the mechanism WORKING** — expect it, ⛔ do not route around it.
4. ⚠⛔ **`sahyog.server.ts:210`** — a **hand-typed literal-set guard** the typecheck ⛔ cannot see:
   `r['status'] === 'closed' || r['status'] === 'verified'`. ⭐ 11b.12's Files table:
   *"miss it and `/sahyog` serves its **OUTAGE** page to everyone."* ⚠ `deferred-work.md` names its
   trigger as *"the next story that touches either public-pages status guard"* — ⭐ **that is D**.
   Pinned end-to-end by `apps/public/tests/sahyog-serves.test.ts:62-75`, derived from `.options`.

⛔⛔ **AND THE RENDER PARTITION IS A FIFTH, AND IT FAILS SILENTLY.** `sahyog-render.ts:341-346`:
`if (item.status === 'verified') archiveRows.push(displayRow); else activeRows.push(displayRow);` —
⭐ its own comment reads *"⛔⛔ **THE PARTITION LITERAL** … Get it wrong and EVERY drive lands in one
section."* ⇒ **with `live` admitted and the partition untouched, every live drive renders inside the
"Closed drives" section** — and `:299`'s ternary
(`row.status === 'verified' ? labels.statusArchive : labels.statusActive`) **labels it "Closed"**.
⚠ ⛔ No test catches this: `sahyog-empty-section.test.ts` asserts the two *existing* sections only.
⇒ Task 5 owns `sections.live`, its label key, its caption and its guard.

### Trap 7 — ⛔⛔ TWO CLASSIFICATION GATES STAND BETWEEN THIS STORY AND ANY NEW RENDERED FIELD — AND ONE FORBIDS ITS OWN REMEDY

⚠ **AC3's `amountRaisedInr` and AC7's nominee name are ⛔ each a MATRIX ACT**, ⛔ not field additions.

- ⭐ **`apps/public/src/lib/surface-fields.ts`** — a new key on `SahyogDriveRow` needs an entry in
  **`SAHYOG_DRIVE_ROW_FIELD_IDS`** (`:338`) **and** in **`SAHYOG_DRIVE_ROW_SHAPE`** (`:369`).
  ⭐ `deriveFieldIds` (`:59-92`) **throws in BOTH directions** — a model key with no mapping, or a
  mapping with no model key, fails the build. Its own doc: *"⭐ That is the mechanism WORKING, ⛔ not
  an obstacle to route around."*
- ⛔⛔ **`packages/contracts/src/public-pages/matrix.ts:398-453` — `RULED_TIER1_PUBLIC_EXCEPTIONS`.**
  ⚠ It pins **(surface, field) PAIRS**. The nominee name is allowlisted **only** as
  `sahyog-vivran.nominee_account_holder_name`; ⛔ `sahyog-drive.nominee_account_holder_name` is
  **NOT** on it, so the refinement fails the matrix parse.
  ⚠⛔⛔ **AND THE FILE PRE-EMPTIVELY FORBIDS THE OBVIOUS FIX**, at `:396-397`:
  > *"⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE. Each entry cites the decision that
  > authorised it … ⚠ And do NOT 'fix' a failing third entry by appending it here — that inverts the
  > control. **The gate failing is the gate working.**"*
  ⇒ ⭐ **this is why AC7(a)'s decision-log entry comes FIRST**: the entry supplies the decision id the
  map row must cite. ⛔ A dev who appends without one has done exactly what the file forbids
  ([[project_helpdesk_default_policy_version_trap]] — a gate whose prescribed remedy is unsafe).

### Trap 8 — ⚠⛔ SHIPPED, TEST-PINNED COPY GOES **FALSE** THE MOMENT AC1 LANDS

`sahyog-drive.json` `page.intro`, **both locales**, ends:
*"Drives that are still **Live are not listed here**."* / *"जो अभियान अभी जारी हैं वे यहाँ
**सूचीबद्ध नहीं** हैं।"* — ⛔ pinned by `apps/public/tests/sahyog-copy.test.ts:34`.

⇒ AC1 makes a **Trustee-visible public sentence** untrue. ⭐ Task 5 owns rewriting it in **both**
locales. ⚠ **And a third section needs `section.*.title` + `table.caption.*`** — ⛔ but
`sahyog-drive.json`'s own `$comment` forbids re-adding a stage **NAME** to that file (*"two sources
is exactly how 'Active' came to mean two different things"*, `-193` cl.3). ⇒ the Live section's
heading must **compose** B's `sahyog-shared:stage.live` with a section noun, ⛔ never restate the word.
---

## Acceptance Criteria

### AC0 — Governance first
Task 0 writes the `epics.md` annotation — ⭐ **including that FR-76 is now RESTORED and that
`epics.md:4872`'s AC parenthetical (*"currently-live pools (closed but not yet settled)"*) is
**SUPERSEDED** by `-189` cl.2** — flips the sprint row, and lands in a `governance:` commit before any
code.

⚠⛔ **RE-ANCHORED 2026-09-06: the parenthetical is at `:4872`, ⛔ not `:4865`.** Three Task-0
annotation blocks (11b.11 · 11b.12 · 11b.13, 52 lines) landed above it after this story's baseline;
`:4865` is now a blank line inside the same AC block. ⚠ **The sprint row's own comment carries the
same stale `:4865`** — ⭐ fix both. ⭐ FR-76 itself is verified unmoved at **`epics.md:160`**, and
⭐ 11b.14 is still **ABSENT** from Epic 11b's story list (it appears only *inside* those three
annotation blocks, at `:5150` / `:5168` / `:5172`).

**And** ⭐ Task 0 clears the **discharged** *"BLOCKED ON B AND C"* text from the sprint row.

### AC1 — `live` drives are LISTED
`SAHYOG_DRIVE_VISIBLE_POOL_STATES` gains `live`; the index renders a **Live** section using story B's
vocabulary (`sahyog-shared:stage.live`, ⭐ shipped in both locales); the three sections keep the
existing `.length > 0` suppression pattern.
**And** ⛔ `spawned` remains excluded, ⛔ unchanged.
**And** ⚠⛔ **ALL FIVE ARTEFACTS OF TRAP 6 MOVE TOGETHER** — the predicate (`public-read.ts:102`), the
**wire enum** (`sahyog-drive.ts:80`), the **total map** (`public-read.ts:137-140`, ⭐ where the
compile break is expected), the **`.server.ts` literal-set guard** (`:210`, ⛔ invisible to the
typecheck), and the **render partition + label ternary** (`sahyog-render.ts:341-346`, `:299`).
⛔ Widening the predicate alone renders every live drive **inside "Closed drives", labelled "Closed"**.

⚠⛔ **CLARIFYING THE 2026-09-04 GUARD CLAUSE, WHICH READ AS ITS OWN OPPOSITE.** It said *"⛔ do ⛔ not
add another guard"*. ⭐ That means **ONE guard per section, ⛔ never two guards on one section** — the
property `sahyog-empty-section.test.ts:135-139` pins (`toHaveLength(2)` on each split = exactly one
occurrence each). ⛔ It does ⛔ **NOT** forbid the Live section's own `sections.live.length > 0`, which
AC1 **requires**. ⚠ And the third `.length > 0` at `sahyog.astro:602` is **pagination links** — ⛔ not
a section guard, ⛔ do not count it.

### AC2 — Each drive carries a PROGRESS METER
Per `-189` cl.2(b) and D1's shape. **And** ⛔ **THE TARGET IS ⛔ NOT DISPLAYED** (`-190` cl.7(b)) —
⛔ no number, ⛔ no "of ₹X", ⛔ no percentage label that lets it be inferred by arithmetic.
**And** where story C's target is **unset** — the default for every Pariwar — the meter renders per
D1's fallback, ⛔ never a guessed denominator
**And** ⭐ where story C's target is **set**, it is consumed **SERVER-SIDE ONLY** — ⛔ the value never
reaches a response body (C's **AC6**)
**And** ⚠⛔ **`D3` IS ANSWERED BEFORE THE METER IS WIRED** (below) — ⛔ not after.
**And** ⚠⛔⛔ **`D6` IS ANSWERED BEFORE THE METER IS WIRED** — ⭐ the shipped meter's own label,
rendered directly above the bar, is *"{confirmed} of **{total}** contributions confirmed"*: ⛔ **it
names its denominator.** ⇒ under `D1(a)` that `{total}` **is the target**, printed, in both locales.
⚠ This AC's ban reads *"no percentage label that lets it be **inferred by arithmetic**"* — ⛔ the
shipped label needs ⛔ no arithmetic. ⇒ **see `D6`.**
**And** ⚠⛔⛔ **`D4` IS ANSWERED BEFORE THE METER IS WIRED** — ⭐ **this AC quotes ⛔ HALF of
`-190` cl.7.** cl.7(b) makes the target invisible **by default**; **cl.7(c)** rules *"⭐ **ONLY A
SUPERADMIN may make it visible**, and **separately for member and for public**"* — and `-196` cl.8
names **this story** as the target's *"first consumer, **server-side**"*. ⇒ **as written, AC2 forbids
the render cl.7(c) exists to authorise.** ⛔ Not decided here. ⇒ **see `D4`.**

#### ⚠⛔ D3 — **OPEN, ROUTED IN FROM STORY C 2026-09-06. ⛔ ANSWER IT AT TASK 3.**

⭐ **The channel.** This AC's ban is on a *"percentage **label** that lets it be inferred by
arithmetic"*. ⛔ **The bar's own GEOMETRY is that percentage** — `pool-progress`'s view model exposes
`confirmedPercentage` as an integer 0–100, and D1 makes its denominator C's target. ⚠ **AC3 publishes
`amountRaisedInr`.** ⇒ any reader computes

> `target ≈ amountRaisedInr ÷ (confirmedPercentage ÷ 100)`

to within the rounding band, **from two figures this story publishes on purpose**.

⛔⛔ **AND THE TESTS ARE BLIND TO IT BY CONSTRUCTION.** This story's Task 7 asserts *"the target is
⛔ NOWHERE in any response"*; C's **AC6** asserts the same. ⭐ Both are **TOKEN** assertions and both
**PASS** — while the hidden figure is publicly derivable. ⚠ ⛔ A green scan proves nothing here
([[feedback_gate_scope_semantic_coverage]]).

⚠ ⭐ **It is a consequence of a RATIFIED COMBINATION, ⛔ not a defect in any one ruling.** `-189`
cl.2(b) ruled the bar, cl.2(c) + `-190` cl.7(b) hid the target, `-190` cl.6 published the amount —
⛔ the Panel ruled them together. ⇒ ⛔ **do ⛔ not re-litigate any of the three.**

**The three options, ⛔ none pre-ruled:**

- **(i) QUANTIZE / BAND the rendered fill** so the divisor is ⛔ not recoverable (coarse buckets, or a
  qualitative band). ⭐ Keeps the ratified bar; ⚠ costs fidelity, and the banding rule becomes copy.
- **(ii) ACCEPT and RECORD** it as a ratified consequence, with a stated re-examination trigger.
  ⭐ Zero build; ⚠ it makes C's reveal switches **decorative on the public axis** — ⛔ say so out loud
  if this is chosen, ⛔ never silently.
- **(iii) ESCALATE** to the Panel as a disclosure the combination produces and that they have ⛔ never
  been shown as a single question.

⚠⛔ **WHATEVER IS CHOSEN, C's AC3 REVEAL SWITCHES ARE ⛔ NOT THE ANSWER** — they gate the **NUMBER**,
and this channel ⛔ never carries the number.

### AC3 — The headline is PARTICIPATION-FIRST, and it is the ruled sentence
`-190` cl.6, option (B): *"16,750 members have stood with this family — ₹19.45 lakh, and counting"*, in
both locales, from story B's shared copy where the stage words appear.

✅⭐⭐ **AND IT IS THE ⛔ LIVE-ROW SENTENCE ⛔ ONLY — RESOLVED 2026-09-07, see `D5`.**
⭐ **Live** rows take this headline (`-190` cl.6, adopting the wording delegated at `-189` **cl.2(e)**,
inside *"A COLLECTING DRIVE IS LISTED"*). ⭐ **Closed** and **Verified** rows take
`sahyog-shared:index_line.*` (Trustee-ratified 2026-09-05, against an index that listed
`closed` + `settled` **only**). ⇒ ⛔ **AC7's `index_line.*` render is ⛔ NOT a Live-row render** —
⚠ and cl.6's sentence has ⛔ **no `{nominee_name}` slot**, so *"does a Live row carry the nominee name,
and where?"* is an **open consequence** recorded at `D5`. ⛔ Do ⛔ not assume either way.

⚠⛔⛔ **AND THE STRING ITSELF STILL DOES ⛔ NOT EXIST — ⭐ VERIFIED 2026-09-06. ⇒ `D5`, OPEN. ⛔ DO ⛔ NOT MINT ONE.**
`sahyog-shared.json` holds **eleven** keys: three stage words, three `.help`, two explainer, and the
four `index_line.*`. ⛔ **No participation headline of any shape**, and `"and counting"` / `"lakh"`
appear **⛔ NOWHERE** in `packages/i18n/locales/`. ⚠ Following this AC literally means **D mints its
own** — ⭐ recreating the exact two-source defect `-193` cl.3 exists to close, on a **Trustee-ratified
line**. ⭐ 11b.12's own AC9 predicted this failure in terms. ⇒ **see `D5`.**

⚠ **AND THE FIGURES ARE ⛔ NOT A CONSTRAINT.** `-190` cl.6 says so itself, immediately under the
sentence: *"⚠ The Panel's earlier illustrative figures are ⛔ **not** a constraint: 'ignore the
arithmetic in example, math was not done properly.'"* (restated by `-199`). ⇒ *"16,750 … ₹19.45 lakh"*
is **the TEMPLATE**, ⛔ never the numbers.

⚠⛔ **AND ⛔ NO FORMATTER PRODUCES EITHER FIGURE.** `packages/i18n/src/currency.ts` `formatCurrency`
emits `"₹ 19,45,000"` — ⭐ Indian grouping, ⛔ a space after `₹`, ⛔ **no word form**; *"lakh"* appears
only in its comments. There is ⛔ no shared plain-number formatter (`number.ts` exports only
`toHindiNumeral` / `toGregorianNumeral`), and `apps/public/src` performs **zero** currency formatting
today. ⭐⭐ **AND THE HINDI ARM IS A TRAP:** `currency.ts:10-15` records the **amendment-A2** contract
— money is **OPERATIONAL** data and renders **LATIN**, so a Hindi surface calls
`formatCurrency(amount, 'en')`; the `'hi'` arm *"exists only for the narrow ceremonial-prose case"*.
⚠ ⛔ A dev will reach for it because this line reads as prose. ⇒ **the Hindi headline takes LATIN
numerals**, and rounding to *"19.45 lakh"* is a **decision nobody has ruled** — ⭐ and it feeds
**`D3` option (i)**, because a coarsened amount changes what the division recovers.
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
⛔ No stage word invented here (**B**) · ⛔ no target authority (**C**) · ⛔ no member surface (**E/F**) ·
⛔ no rate tier · ⛔ no cache policy · ⛔ no `spawned`.

⚠⛔ **AMENDED 2026-09-05 — THE *"⛔ no bank field"* CLAUSE IS NARROWED, ⛔ not deleted.** ⭐ It used to
read *"⛔ No bank field (**A**)"*. **AC7** now orders **exactly one** — the **nominee name**, on the
Panel's ruling of 2026-09-05. ⇒ the clause is restated with the exception **named**:

> ⛔ **NO nominee-bank value crosses EXCEPT the ruled `nominee_account_holder_name` (AC7).**
> ⛔ No account number, ⛔ no last-4, ⛔ no IFSC, ⛔ no VPA, ⛔ no bank, ⛔ no branch — ⭐ keys **ABSENT**,
> ⛔ never `null`.

⭐ Recorded as an amendment with its previous text, ⛔ not silently overwritten
([[feedback_supersede_never_reinterpret]]) — ⚠ and because an AC that **forbids** what another AC
**orders** ships the contradiction ([[feedback_spec_edits_must_propagate_to_tasks]]).

### AC7 — ⭐⭐ THE NOMINEE NAME REACHES THE INDEX — **Trustee-ratified 2026-09-05 (DR + KB)**

> ⭐⛔ **ADDED TO THIS STORY BY BigDev, 2026-09-05**, on the Panel's ruling *"add the nominee name on
> the index"* (Story 11b.12 **D2**, note §10.2 ruling 2). ⛔ It is ⛔ **NOT** 11b.12's — that story's
> **AC7** forbids touching any field tier, listing predicate or wire shape. ⭐ It lands **here**
> because D already extends the index wire, the read and the matrix.

**Given** the Panel was shown the **bulk-harvest** property and **ACCEPTED it** (note §9.4)
**Then** the public index row carries the **nominee name** — the value already at `tier: public` on
the drive page as `nomineeBankAccounts[].accountHolderName` (`-190` cl.2)
**And** it renders under the ruled public label **"Nominee Name"** — ⛔ *"Account holder"* may ⛔ **not**
be used (`-190` cl.2)
**And** ⭐ **FULL name form** — `-190` cl.2 ruled the LABEL and ⛔ not the FORM; the Panel ruled the
**form** on 2026-09-05 ⇒ ⭐ `deferred-work.md` **(h) `D-nominee-name-form`** is **CLOSED BY RULING**
**And** ⛔ the index line's `{nominee_name}` token (11b.12's ratified copy) is **rendered** by this
story — ⭐ 11b.12 **authored** it, ⛔ left it dark, exactly as it did `{amount}`
**And** ⚠ an **absent** nominee name **drops its clause** — the Panel's *"omit the clause"* rule

> ✅⭐⭐ **11b.12 HAS SHIPPED THE COPY. THE KEY PATHS, WRITTEN IN BY NAME (11b.12 Task 2b, 2026-09-06)
> — ⛔ CONSUME THESE, ⛔ DO ⛔ NOT MINT YOUR OWN.**
>
> Namespace **`sahyog-shared`** (`packages/i18n/locales/{en,hi}/sahyog-shared.json`), registered in
> `catalog.ts`. ⭐ All four variants exist in **both** locales, verbatim from routing note **§9.2**:
>
> | Key | Renders when |
> |---|---|
> | `index_line.full` | all of `{amount}` `{nominee_name}` `{family_name}` `{district_name}` present |
> | `index_line.no_nominee` | ⛔ no nominee name |
> | `index_line.no_family` | ⛔ no consented family name |
> | `index_line.no_district` | ⛔ no posting row |
>
> ⭐ **RULING 3 (`§10.2`), IMPLEMENTED AS FOUR STRINGS, ⛔ NOT EIGHT:** an absent token drops its
> clause — ⛔ no combinatorial cross-product. ⇒ pick the ONE variant naming the absent token.
>
> ⛔⛔ **AND `no_family` DROPS THE DISTRICT CLAUSE TOO — ⛔ THIS IS ⛔ NOT A BUG TO "FIX".**
> *"who served in {district_name} district"* / *"जनपद … में कार्यरत"* modifies the **DECEASED
> MEMBER**. Keep it while dropping `{family_name}` and the sentence attributes the posting district
> to the **NOMINEE** — a factual claim about a named private individual that the data does ⛔ not
> support. ⚠ Pinned by `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`.
>
> ⚠⛔ **AND ⛔ ONE CORRECTION TO A PREMISE THIS STORY MAY HAVE INHERITED.** 11b.12's AC9 states that
> *"`t()` interpolates an unsupplied token to nothing"* ⇒ *"an empty rupee figure"*. ⛔ **That is
> FALSE in this codebase** — ⭐ checked at `packages/i18n/src/resolver.ts:36-42`, `t()` **THROWS**
> `[i18n] missing interpolation param`. ⇒ rendering one of these lines before **every** token is
> supplied is a **500 / the outage arm**, ⛔ not a silently-blank figure. ⭐ Louder, ⛔ but this
> story must still supply `{amount}` **and** `{nominee_name}` **together with** the two nullable
> tokens, or pick the right variant.
**And** ⛔ ⛔ **NO** other nominee-bank value crosses: ⛔ no account number, ⛔ no last-4, ⛔ no IFSC,
⛔ no VPA, ⛔ no bank, ⛔ no branch. ⭐ The keys are **ABSENT**, ⛔ never `null` (the 11b.11 shape).

#### ⚠⛔⛔ AC7 OPEN ITEM — **THE FOUR VARIANTS ARE ⛔ NOT TOTAL, AND THIS STORY WAS NAMED AS THEIR OWNER**

⭐ **DEFERRED TO THIS STORY BY NAME**, by 11b.12's code review (`deferred-work.md`, post-baseline):

> *"**AC9's four dark-copy variants have no defined behavior for simultaneous multi-token absence.**
> … it becomes live only when **Story D (`11b-14` AC7/Task 8)** wires up variant selection against
> real data. **Deferred to that story: either confirm the double-absence case is unreachable in
> production data, or extend the ruling/variant set before wiring the render.**"*

⛔⛔ **AC7's *"pick the ONE variant naming the absent token"* assumes AT MOST ONE is absent. ⛔ Two
combinations have ⛔ NO renderable variant at all** — ⭐ verified against the shipped strings:

| Absent together | `no_nominee` needs | `no_family` needs | `no_district` needs | Result |
|---|---|---|---|---|
| **nominee + family** | `{family_name}` ✗ | `{nominee_name}` ✗ | both ✗ | ⛔ **no variant** |
| **nominee + district** | `{district_name}` ✗ | `{nominee_name}` ✗ | `{nominee_name}` ✗ | ⛔ **no variant** |

⚠⛔ **AND THE FAILURE IS A 500 FOR THE WHOLE PAGE, ⛔ NOT A BLANK ROW** — `t()` throws
(`resolver.ts:39`), so one such row takes `/sahyog` down for everyone.

⛔⛔ **AND BOTH ARE DEFAULT-SHAPED, ⛔ not exotic:** `family_name` is `null` whenever name publication
is **not authorised** — ⭐ the fail-closed day-one posture (`handlers.ts:431`); `nominee_name` is
`null` when bank details were never collected (the 6.8 AC3 absence signal) **or** when the decrypt
fails (`handlers.ts:717-720`); `district` is `null` with no posting row. ⇒ a drive with no bank
details, for a family that has not authorised publication, **has ⛔ no renderable line today.**

**Then** ⛔ **⛔ THIS IS ANSWERED BEFORE THE RENDER IS WIRED** (Task 8) — either (i) the double-absence
case is **demonstrated unreachable in production data**, or (ii) the variant set / ruling is
**extended**. ⛔ Neither is pre-ruled here, ⭐ and (ii) is a **copy** act that belongs with `D5`'s
answer, ⛔ not a code fallback invented at the render site.

#### ⚠⛔ AC7 — ⛔ THE GUARD THIS STORY FALSIFIES, AND WHAT ITS AUTHOR SAID TO DO INSTEAD

`packages/i18n/tests/sahyog-shared-dark-copy.test.ts` holds **two** assertions AC7 is guaranteed to
break — ⭐ and the first carries its own successor instruction:

> *"⛔ ⛔ NO source file resolves an `index_line.*` key"* — ⭐ *"**WHEN STORY D LANDS:** D renders these
> keys and this assertion becomes false BY DESIGN. **⛔ Do ⛔ not delete it then — NARROW it** to
> *'⛔ never rendered without both tokens supplied'*."*

and a second that reads `sahyog-drive.ts` **as text** and asserts it does ⛔ not match
`/nomineeName|nominee_name/` — ⭐ precisely what AC7 orders.

**Then** ⛔ **NARROW both, ⛔ never delete either**, and say so in the story record.

#### AC7(a) — ⛔ GOVERNANCE BEFORE CODE, ⛔ and it is ⛔ NOT covered by AC0's annotation

**Then** a **decision-log entry** records the ruling as a **NEW public Tier-1 exposure on a NEW
SURFACE** — ⚠⛔ `-190` cl.2 ruled **ONE DRIVE'S PAGE** and ⛔ **does NOT auto-widen to the index**
([[feedback_supersede_never_reinterpret]])
**And** `public-vs-private-matrix.yaml` gains the row (or the surface scope) — ⛔ a matrix that does
⛔ not name the surface leaves the exposure undeclared
**And** ⛔ ⛔ **no code lands before both.**

⚠⛔⛔ **THE YAML IS ⛔ ONE OF THREE, AND IT IS THE ⛔ ONLY ONE THAT IS ⛔ NOT ENFORCING CODE** —
⭐ verified 2026-09-06 (Trap 7):

1. ⭐ **`packages/contracts/public-pages/public-vs-private-matrix.yaml`** — the `sahyog-drive` surface
   is at `:472`, its nine field ids from `:511`. ⭐ **⛔ No nominee field today — AC7(a)'s "genuinely
   absent" is CONFIRMED.**
2. ⛔⛔ **`packages/contracts/src/public-pages/matrix.ts:398-453` — `RULED_TIER1_PUBLIC_EXCEPTIONS`.**
   ⚠ It pins **(surface, field) PAIRS**, and the nominee name is allowlisted **only** as
   `sahyog-vivran.nominee_account_holder_name`. ⇒ `sahyog-drive.nominee_account_holder_name` fails
   the refinement. ⚠⛔ **AND `:396-397` FORBIDS APPENDING WITHOUT A RULING** — *"ADDING TO THIS LIST
   IS A RULING, NEVER A CODE CHANGE … do NOT 'fix' a failing third entry by appending it here … The
   gate failing is the gate working."* ⇒ ⭐ **the decision-log entry above supplies the id this map
   row cites** — that is exactly why it comes first, and the story must say so.
3. ⛔ **`apps/public/src/lib/surface-fields.ts`** — `SAHYOG_DRIVE_ROW_FIELD_IDS` (`:338`) **and**
   `SAHYOG_DRIVE_ROW_SHAPE` (`:369`); `deriveFieldIds` **throws in both directions**.
   ⚠ **AC3's `amountRaisedInr` owes the same three**, ⛔ not only AC7's name.

**And** ⚠ **`public-vs-private-matrix.yaml:127-136` is AMENDED AND NAMED** — it still reads
*"**THE NAME FORM FOR `nominee_account_holder_name` IS ⛔ NOT RULED** … ⭐ ROUTED to
`deferred-work.md` (`D-nominee-name-form`) … ⛔ The gap is RECORDED, ⛔ not closed by silence."*
⭐ The Panel **ruled the form on 2026-09-05** (full name) and `deferred-work.md:349` already reads
**CLOSED BY RULING**. ⇒ ⛔ leaving that paragraph standing publishes a false open gap
([[feedback_supersede_never_reinterpret]]).

#### AC7(b) — ⚠⛔ THE DECRYPT VOLUME STEPS UP — ⭐ **RE-MEASURED 2026-09-06**, and the remedy CORRECTED

⚠ **Verified, ⛔ not estimated:**

| Surface | Tier-1 decrypts per request |
|---|---|
| Drive page (today) | **1-2** — one drive, `.max(2)` accounts (`sahyog-vivran.ts:383`; the handler's own *"⭐⛔ IT IS NOW AT MOST TWO"*, `handlers.ts:634-636`) |
| ⚠⛔ **Index — TODAY, ⛔ already** | ⭐ **up to 50** — the deceased member's KYC name, one per consented row (`handlers.ts:399`, `:441`) |
| **Index (this AC)** | ⚠ **up to 150** — 50 name decrypts **+** 50 rows × 2 accounts |

⚠⛔⛔ **THE 2026-09-04 FRAMING WAS WRONG IN BOTH DIRECTIONS, AND THE CORRECTION MATTERS.** It read
*"THE DECRYPT VOLUME IS A ⛔ 50× STEP CHANGE (1-2 → up to 100)"*. ⭐ **The baseline is ⛔ not 1-2 —
this index already performs up to 50 Tier-1 KMS decrypts per request.** ⇒ the step is **50 → ~150, a
3×**, ⛔ not a 0→100 novelty. ⭐ Recorded as an amendment, ⛔ not overwritten.

**Then** the decrypt reuses the **BOUNDED-CONCURRENCY** discipline **already installed on this exact
call path** — `mapWithConcurrency(rows, DIRECTORY_DECRYPT_CONCURRENCY, …)`,
`DIRECTORY_DECRYPT_CONCURRENCY = 8` (`apps/api/src/modules/kyc/bounded-decrypt.ts:28`)
**And** ⚠⛔⛔ **⛔ NOT "BATCHED" — ⭐ THE 2026-09-04 CLAUSE ORDERED SOMETHING THAT ⛔ CANNOT BE BUILT.**
It read *"the decrypt is **BATCHED** — ⛔ never an N+1 per row"*. ⭐ **Envelope encryption gives every
stored value its own DEK**, so there is ⛔ no shared secret to decrypt once and reuse — stated at this
very index, `handlers.ts:386-387`: *"⭐ ONE KMS `decryptDek` ROUND-TRIP PER CONSENTED ROW … there is
no shared secret to decrypt once and reuse."* ⇒ ⛔ a batch does not exist; **bounded concurrency is
the house remedy**, and it is already here. ⭐ Amended and NAMED, ⛔ not deleted
([[project_epic6_drizzle_correlated_subquery_bug]]'s sibling lesson still holds for the **join**:
a per-row read looks fine in a DB-free test)
**And** ⚠ `public-read.ts` joins ⛔ **no** nominee table today ⇒ this adds a **join per row**; it is a
**read-shape change**, ⛔ not a field addition
**And** the **decrypt-failure posture is LIST-SHAPED** — ⛔ one bad row must ⛔ **not** 500 the page.
⭐⭐ **AND THIS IS ⛔ NOT AN OPEN ENGINEERING PROBLEM — ⭐ IT IS A SETTLED PRECEDENT ~50 LINES FROM
WHERE THE CODE GOES:** `handlers.ts:449-456` — *"⭐ **OMIT THE NAME, ⛔ KEEP THE ROW** … ⛔ Letting
this throw would 500 the ENTIRE page for the whole Pariwar over one bad row."* ⇒ **copy it**, ⛔ do
⛔ not re-derive a posture
**And** a **measured** p95 check is run and recorded ([[project_measured_validation_framework]])
**And** ⚠ **the two page-size caps are ⛔ NOT the same constant, and nothing pins them equal** — the
request bound is `PUBLIC_SURFACE_PAGE_SIZE_CAP` (`_common/pagination.ts:26`, applied
`sahyog-drive.ts:203`), the domain clamp is `SAHYOG_DRIVE_PAGE_SIZE_CAP` (`public-read.ts:224`,
applied `:715-718`). ⭐ Both are **50** today, so *"150"* holds — ⛔ on an **unpinned coincidence**
**And** ⚠ the surface is `edge_cacheable` at `s-maxage=300` — ⭐ **⛔ NOT a new posture** (the drive
page already serves this decrypted name cached), ⛔ but it means a masking or consent flip is ⛔ **not
immediate** here either, and that must be **stated where the decrypt is**.

#### AC7(c) — ⚠ THE VALUE IS STILL UNVERIFIED UNTIL **6.18** SHIPS

**Then** the story records that the published name is **unverified today** — ⛔ no FK, ⛔ no match rule
(6.8 **D1**), and ⛔ nobody in the approval chain can read it (`D5-subject` (ii))
**And** it names **Story 6.18** — commissioned by the same 2026-09-05 ruling — as what closes that
**And** ⛔ ⛔ **it does ⛔ NOT add a join or a match rule** to "fix" it here (`D5-subject` (i) forbids it)
**And** ⛔ this story is ⛔ **not** blocked on 6.18 — ⭐ the Panel ruled the exposure **knowing** the
value is unverified, and that is recorded, ⛔ not re-litigated.

---

## ⚖️ Decisions

### ✅ D1 — **RULED (a) by BigDev, 2026-09-04: EXTEND THE CANONICAL PRODUCER, and render ⛔ NO BAR without a target.** What does the bar fill against?

> ⭐⭐ **THE RULING.** `packages/ui/src/pool-progress` gains an **OPTIONAL rupee denominator**.
> ⭐ **ONE canonical producer is preserved** — 9.12 Decision 3's whole point — with two modes:
>
> | Consumer | Denominator | Source |
> |---|---|---|
> | Member card (`<ActiveContributionCard>`) | `rosterSize` | ⛔ **UNCHANGED** |
> | Public drive surfaces | the Pariwar's **rupee target** | story **C** |
>
> ⚠⛔ **THE THROW IS RE-SCOPED, ⛔ NOT REMOVED.** `confirmedCount > rosterSize` stays an **impossible
> state** and keeps throwing on the roster path. ⛔ But `amountRaisedInr > target` is an **ORDINARY,
> HAPPY** state — more members gave than the target assumed — and ⛔ must ⛔ NEVER throw. ⭐ It clamps
> the bar at 100% (the existing `min(100, …)`) and the **headline figure stays the real amount**,
> ⛔ never the clamped one.
>
> ⭐⭐ **⛔ NO TARGET ⇒ ⛔ NO BAR.** With story C's target unset — **the default for every Pariwar** —
> the surface renders the **headline figures only**. ⛔ Never a guessed denominator, ⛔ never
> `rosterSize` silently substituted for a target the Trust has ⛔ not set. ⚠ ⇒ on day one, after C
> ships and before any Pariwar Admin acts, **⛔ no bar renders anywhere** — ⭐ that is correct, ⛔ not a
> gap, and the story must ⛔ not "fix" it.

> ⚠⛔⛔ **AMENDED 2026-09-06 — THE RULING STANDS; ⛔ THREE MECHANICAL BLOCKS WERE ⛔ NOT KNOWN WHEN IT
> WAS MADE** (Trap 1, verified): **(1)** the anti-widening test rejects **ANY** new input key, ⛔ not
> only a yellow/pending operand — `presenter.test.ts:157-163` + `:186-188` — so `targetInr?` fails
> typecheck **then** fails the assertion; **(2)** `rosterSize` is a **required** operand and there is
> ⛔ no rosterless input (`rosterSize: 0` + a non-zero `confirmedCount` **throws**); **(3)**
> `fixedAmount` is required and `amountRaisedInr` is **derived**, so there is ⛔ no pre-derived-amount
> input. ⇒ ⭐ **D1(a) is still the ruling**, ⛔ but Task 3 owns all three, and must **RECORD the
> anti-widening relaxation as deliberate** while keeping the banned-name loop (`:189-191`) intact.
>
> ⭐ **AND `-203` cl.6 NARROWS THE "NO TARGET ⇒ NO BAR" FALLBACK, ⛔ post-baseline:** *"D's ruled
> '⛔ no target ⇒ ⛔ no bar' covers **UNSET**, ⛔ not **zero-and-set** … ⇒ **strictly positive**, at the
> contract boundary ⛔ **and** at the DB."* ⇒ ⭐ the ₹0 division-by-zero is unreachable **by C's CHECK
> constraints**, ⛔ not by any guard this story writes — ⛔ do not add a redundant one.

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

⇒ **AC2 is UNBLOCKED.**

### ✅ D2 — **RULED (b) by BigDev, 2026-09-04: BOTH SURFACES, and the *"never a sum"* sentence is AMENDED.** Where does the amount render?

> ⭐⭐ **THE RULING.** The amount renders on **BOTH** the index row and the drive page.
> ⇒ `packages/contracts/src/public-pages/sahyog-drive.ts:149-150` is **AMENDED** (⚠ **re-anchored
> 2026-09-06 — the ruling said `:133`**), and `packages/domain/src/pool/public-read.ts:524` with it
> (⚠ **the ruling said `:481` AND quoted text that file has never carried**). ⭐ **Plus the two sites
> the ruling did not know about:** `sahyog-vivran.ts:345-347` and `public-read.ts:739-743`.
>
> ⚠⛔ **AMENDED AS AN AMENDMENT — ⛔ NAMED, ⛔ NEVER DELETED.** The replacement must state: what the
> sentence said (*"⛔ never a sum of amounts"*); that it was an **AUTHOR'S EXTENSION** of 11b.1 **AC5**,
> which prohibits **leaderboards · rankings · gamification · social-performance · popularity metrics**
> and ⛔ does ⛔ **not** name a sum; and that `-190` cl.6 (Trustee-ratified) put the figure on the
> surface, with `-189` cl.5 recording the rupee boundary as **newly crossed**.
> ⭐ **This epic has logged THREE claims that outlived what they described** (`-187`, `-188`, `-192`).
> ⛔ Silently deleting a fourth is the **same failure wearing the opposite sign.**
>
> ⭐⭐ **THE SURVIVING HALF OF AC5 IS ⛔ NOT TOUCHED, AND MUST STAY ENFORCED:** ⛔ nothing orders by the
> amount or the count · ⛔ no *"most-supported"* view at any tier · ⛔ no ranking · ⛔ no comparison
> **between** drives. ⚠ AC5 pins it; ⛔ the amendment ⛔ narrows the sentence, it does ⛔ not repeal it.

> ⚠⛔⛔ **AMENDED 2026-09-06 — THE RULING STANDS; ⛔ IT NAMED TWO SITES AND THERE ARE FOUR**
> (Trap 2, verified). ⭐ Its anchors are re-pinned: `sahyog-drive.ts:149-150` (⚠ was `:133`) ·
> `public-read.ts:524` (⚠ was `:481`, **and the quoted wording was never that file's text** — it is
> *"⛔ A count, ⛔ never a sum, ⛔ never a score."*, with ⛔ no *"of amounts"* and ⛔ no ordering tail).
> ⭐ **THIRD SITE: `sahyog-vivran.ts:345-347`** — the same sentence on the **drive page**, which this
> very decision rules the amount renders on. ⛔⛔ **FOURTH SITE, AND IT IS ⛔ NOT PROSE:**
> `public-read.ts:739-743` quarantines **both** rupee totals *"under any name"*, and `:760-761`'s
> `deliveredTotal` **IS** `amountRaisedInr` — ⇒ **Task 4's preferred option is prohibited by name at
> the line it must cross.** ⭐ D2 supersedes it, ⛔ but only by **amending and NAMING** it too.

⭐ Trap 2: the index row's contract says *"⛔ never a sum of amounts"*; the Panel ruled the amount.

- **(a) Drive page only.** ⛔ The index keeps counts. ⭐ The `sahyog-drive.ts:149-150` sentence stands
  untouched. ⚠ But a visitor scanning the list sees ⛔ no money — and `-190` cl.8's whole mechanism is
  that **the UI carries the understanding**, which is weakest where people actually land.
- **(b) ⭐ BOTH.** ⚠ Requires amending `sahyog-drive.ts:149-150` — ⭐ **AMEND and NAME it**, ⛔ never delete:
  the sentence was an **author's extension** of AC5 (which prohibits ranking, ⛔ not sums), and
  `-190` cl.6 + `-189` cl.5 ruled the figure. ⛔ The ordering/most-supported half of AC5 stays.
- **(c) Index only.** ⛔ Incoherent — the drive page is where a reader who clicked wants the detail.

⇒ **AC3 is UNBLOCKED** *as to WHERE the amount renders*. ⚠⛔ **THE 2026-09-04 CLAIM THAT FOLLOWED —
*"Story D now has ⛔ ZERO open decisions"* — IS ⛔ SUPERSEDED, ⛔ not deleted.** ⭐ Three questions are
now **OPEN**: **`D3`** (routed in from C, 2026-09-06), **`D4`** and **`D5`** (below, this validation).
⭐ B and C have both landed, so the story is **UNBLOCKED on its siblings** and **BLOCKED on its own
decisions** — ⛔ the opposite posture from 2026-09-04.

---

### ✅⚠ D4 — **ANSWERED by the Trustee Panel (DR + KB), 2026-09-07** — ⭐ the switches ARE meant to show the number. ⏳ **ONE FOLLOW-UP OPEN: *when*, and *where*

> ✅⭐⭐ **THE PANEL'S ANSWER, VERBATIM:** *"of course the switches are meant to show the number one
> day."*
>
> ⇒ ⭐⭐ **§6.1 option (ii) — *"a built-ahead authority owed no surface"* — IS REFUSED.** The reveal is
> ⛔ not decorative and ⛔ not reserved; it is intended to reach a screen. ⭐ The 2026-09-07 note's
> **INFERENCE (A)** (*"it is a gap"*) is the correct reading, and **(B)** is closed.
> ⭐ ⇒ `revealToPublic` / `revealToMembers` are **owed a consumer**, and the shipped test that asserts
> the switch is inert (`public-pages/sahyog-drive.spec.ts`) is ⛔ **not** a permanent property — it is
> **correct-until-that-consumer-ships**, and owes a **narrowing** when it does, ⛔ never a deletion.
>
> ⏳⚠⛔ **WHAT IS ⛔ NOT YET ANSWERED — ⭐ *"one day"* is ⛔ not a story.** ⛔ Does **THIS** story build
> it, or a named later one? ⚠ A deferral naming an epic expires unowned; it must name a **story key
> that exists in `sprint-status.yaml`** ([[project_r7_fact_producer_unbuilt]]).
> ⚠⛔⛔ **AND `D6`'s ANSWER REMOVED THE SLOT THE NUMBER WOULD HAVE APPEARED IN.** The old label named
> `{total}`; ⭐ the Panel's new label names ⛔ **no denominator at all**. ⇒ **when a Superadmin turns
> the public switch ON, ⛔ WHERE does the target render?** ⛔ Not decided; ⛔ do not invent a slot.
> ⇒ **follow-up 4, relayed 2026-09-07.**

> ⏳⭐ **ESCALATED, ⛔ NOT RULED.** ⇒ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md` **§1 Q1, §3, §6.1.**
> ⭐ **Why the Panel and ⛔ not BigDev:** cl.7(c) reserves the reveal to a Superadmin and `-196` cl.8
> calls it *"a **DISCLOSURE ACT**"*. ⇒ deciding, on our own reading, either to **perform** it (put a
> rupee target on a public page) or to **make it permanently unperformable** is exactly the class of
> act the Panel has reserved ([[feedback_supersede_never_reinterpret]]).
> ⚠ **The three options below go to the Panel as they stand** — ⛔ none is pre-ruled, and the note
> states the case in both directions (its §5).

⭐⭐ **THE FINDING.** AC2 states, flatly and unconditionally, *"⛔ **THE TARGET IS ⛔ NOT DISPLAYED**
(`-190` cl.7(b))"*. ⛔ **That is HALF of cl.7.** Verbatim:

> **7. ⭐ THE TARGET — WHO SETS IT AND WHO MAY REVEAL IT ARE SPLIT.**
>   - **(b)** it is ⛔ **NOT visible** to member or public;
>   - **(c)** ⭐ **ONLY A SUPERADMIN may make it visible**, and **separately for member and for public**.

⇒ cl.7(b) is the **DEFAULT STATE**; cl.7(c) is an **AUTHORITY TO CHANGE IT**. ⭐ And `-196` cl.8 names
the consumer: *"⛔ does ⛔ not render the target anywhere (**Story D is its first consumer,
server-side**)"*.

⛔⛔ **WHAT C ACTUALLY SHIPPED, AND WHAT READS IT — ⭐ grepped live 2026-09-06:**

| Artefact | Where | Readers |
|---|---|---|
| `DriveTargetVisibility.revealToPublic` | `domain/src/pool/drive-target.ts:84` | — |
| `resolveDriveTargetVisibility` | `drive-target-policy.ts:233` | ⛔ **tests only** |
| `DEFAULT_DRIVE_TARGET_VISIBILITY` (fail-closed, frozen) | `drive-target.ts:122-124` | — |
| `pariwar_drive_target_visibility` + `…_member_ge_public` CHECK | migration `0115:104,143` | — |
| `pariwar.manage_drive_target_visibility` — ⭐ **`super_admin` ONLY, "a disclosure act"** | `permissions.ts:1056` | — |
| Admin reveal form | `apps/admin/.../RevealSwitchesForm.tsx` | writes ⛔ only |

⇒ ⛔⛔ **`revealToPublic` has ⛔ ZERO production readers.** A governed, disclosure-classed,
`super_admin`-gated control with a DB table, an RLS policy, a two-layer CHECK and an admin form
**renders nothing, anywhere.** ⚠ And story **E** does the same on the member axis — `11b-15:116`
reads *"⛔ no target (story **C** keeps it hidden)"*, with ⛔ no `revealToMembers` branch either.
⇒ **as the split stands, `-190` cl.7(c) has ⛔ no consumer in any of the seven stories.**

⚠⛔ **THIS IS ⛔ NOT A RE-LITIGATION OF cl.7(b).** The default is right and stays. The question is
whether **D is the story that makes cl.7(c) reachable**, given `-196` cl.8 says it is.

**The three options, ⛔ none pre-ruled:**

- **(i) HONOUR cl.7(c) HERE.** AC2 gains a reveal-conditional: `resolveDriveTargetVisibility(...)`
  server-side, and where `revealToPublic` is `true` the figure renders. ⭐ Closes the dead control and
  makes C's `super_admin` key mean something. ⚠ Costs: a second render path, a second copy string, and
  the AC2/AC5 *"⛔ no comparison-to-target framing"* line needs a carve-out for the revealed case.
  ⚠⛔ **And it ⛔ does NOT dissolve `D3`** — it narrows it to Pariwars with `revealToPublic: false`.
- **(ii) DEFER cl.7(c) EXPLICITLY, WITH A NAMED SUCCESSOR.** ⭐ Zero build here; ⛔ but it must be a
  **story key that exists in `sprint-status.yaml`** — ⚠ a deferral naming an *epic* expires unowned
  ([[project_r7_fact_producer_unbuilt]]). ⛔ And it must say **out loud** that C's reveal switches
  stay decorative on **both** axes until it ships, ⛔ never silently.
- **(iii) ESCALATE.** ⭐ The Panel split *setting* from *revealing* deliberately, on the `-136` cl.3
  shape, and made revealing **`super_admin`-only** because it is *"a disclosure act"*. ⚠ That a
  ratified disclosure authority has **no consumer in the programme built to serve it** is arguably
  theirs to hear as one question — ⛔ they have never been shown it.

⚠ ⛔ **WHATEVER IS CHOSEN, SAY IT IN THE STORY RECORD.** ⭐ 11b.13's own review already flagged this
shape once — *"123 tests for a control that renders nothing"* — and ⛔ shipping D without answering
makes it permanent.

---

### ✅ D5 — **ANSWERED 2026-09-07.** ✅ The stage split is **RESOLVED BY PROVENANCE**; ✅ the Panel **GAVE THE LIVE SENTENCE**, in both languages. ⏳ Three follow-ups open

> ✅⭐⭐ **THE SURFACE HALF IS ⛔ NO LONGER OPEN — BigDev supplied the reading, 2026-09-07.**
> ⛔ The two sentences are ⛔ not two surfaces; ⭐ **they are two STAGES of the same list:**
>
> | Row stage | Sentence | Source |
> |---|---|---|
> | **Live** | *"16,750 members have stood with this family — ₹19.45 lakh, and counting"* | `-190` cl.6, completing `-189` **cl.2(e)** |
> | **Closed · Verified** | `sahyog-shared:index_line.*` | Trustee-ratified 2026-09-05 |
>
> ⭐⭐ **THE EVIDENCE IS PROVENANCE, ⛔ NOT TENSE.** `-190` cl.6 does ⛔ not stand alone — it **adopts
> the wording delegated at `-189` cl.2(e)**, and cl.2 is titled *"**(Q2) — YES: A COLLECTING DRIVE IS
> LISTED**"*. cl.2(e): *"the surface shows the amount raised AND the number of contributors — the
> Panel's own example: **'19.45 lakh and counting, by 43k members'**, with the exact wording
> **delegated to BigDev**."* ⇒ ⭐ cl.6 is the **LIVE-row** sentence by construction.
> ⭐ And the index line was ratified against an index listing **`closed` + `settled` ONLY** — ⛔ `live`
> is ⛔ not listed today and **this story is what adds it** ⇒ ⛔ it could ⛔ not have been ruled about a
> live row. ⚠ It also occupies the **close-of-cycle** sentence's slot, which is structurally
> meaningless for a drive that has not closed (⭐ Trap 4's `closeOfCycleFraming` point, arrived at from
> the other direction).
>
> ⚠⛔ **AND ONE 2026-09-06 CLAIM IS WITHDRAWN AS OVER-STATED** — that the index line *"carries no
> member count ⇒ cannot satisfy participation-first"*. ⭐ The 11b.12 routing note **§7.1(7)** records
> the constraint it was written under: *"**The confirmed count is ⛔ ALREADY on the same row.** ⇒ ⛔
> don't restate a number."* ⇒ the omission is **deliberate**; the count is a **column**, and the row
> as a whole is participation-bearing. ⛔ Named, ⛔ not deleted ([[feedback_supersede_never_reinterpret]]).
>
> ⚠⛔ **ONE CONSEQUENCE FOR AC7 — ⭐ recorded, ⛔ not resolved.** `index_line.*` is the sentence that
> carries the **nominee name**, ⭐ and it is now **Closed · Verified only**. ⛔ cl.6's Live sentence has
> ⛔ no `{nominee_name}` slot. ⇒ **does a LIVE row carry the nominee name at all, and if so where?**
> ⚠ `-190` cl.2 and the 2026-09-05 ruling 2 say *"on the index"* ⛔ without qualifying a stage.
> ⛔ Do ⛔ not assume either way at Task 8.
>
> ✅⭐⭐ **THE REMAINDER IS ANSWERED — the Trustee Panel (DR + KB) GAVE THE WORDING, 2026-09-07,
> in BOTH languages.** ⇒ ⭐ §6.2 option **(iii)**; ⛔ the *"delegated to BigDev"* route was ⛔ not taken,
> and ⭐ **the Hindi rider is discharged — a Hindi sentence now exists where cl.6 had English only.**
>
> > **EN:** *19,45,000 and counting, by 43,000 colleagues—and still going strong!*
> > **HI:** *43,000 सहकर्मियों द्वारा 19,45,000 का योगदान अभी तक... योगदान जारी है!*
>
> ⭐ **Both use LATIN numerals in the Hindi** — ⭐ consistent with the **amendment-A2** contract
> (`currency.ts:10-15`: money is OPERATIONAL data and renders Latin). ⛔ No ruling needed; ⭐ the
> Panel's own wording already complies.
> ⭐ **And *"colleagues"* / *"सहकर्मियों"* matches the shipped `index_line.*` exactly** — ⛔ cl.6's
> earlier *"members"* is superseded by this wording, and the two stages now speak in one voice.
>
> ⏳⚠⛔ **THREE FOLLOW-UPS TRAVEL WITH IT** — ⭐ see `D6`: **(1)** ⛔ this sentence is the **same
> sentence** as `D6`'s bar label, differing ⛔ only in number form (`19,45,000` vs `19.45 lakh`;
> `43,000` vs `43 हज़ार`) ⇒ **ONE sentence on a Live row, or two?** **(2)** ⛔ ⛔ no `₹`.
> **(3)** ⭐ the word-forms need a rounding rule and a formatter that ⛔ does not exist.
>
> ⏳ **The 2026-09-07 note's Q2 record.** ⇒ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md` **§0, §1 Q2, §6.2.**
> ⛔ **The Live sentence exists in ⛔ NO file, in either language.** ⚠ ⭐ And the authorship may ⛔ not
> be the Panel's at all: `-189` **cl.2(e)** says *"the exact wording **delegated to BigDev**"*, and
> cl.6 then adopted option (B) as its shape. ⇒ the note asks only **who writes it** — BigDev outright,
> BigDev drafting for confirmation, or the Panel giving the wording. ⭐ **⛔ Three narrow options,
> ⛔ not a ruling on substance.**
> ⚠⛔ **Two riders travel with it either way.** ⛔ **No HINDI was ever ratified** for cl.6 — the adopted
> sentence is English only, on a bilingual public page. ⚠ And the amount: `formatCurrency` **executed**
> gives `"₹ 19,45,000"`; ⛔ *"₹19.45 lakh"* needs a **word-form and a rounding rule**, ⛔ neither of
> which exists — ⭐ and rounding feeds **`D3`**.

⭐⭐ **THE FINDING — TWO HALVES.**

**(a) ⛔ THE STRING DOES ⛔ NOT EXIST.** AC3 orders the headline *"from story B's shared copy where the
stage words appear"*. B is `done`. `sahyog-shared.json` — ⭐ **verified, both locales** — holds
**eleven** keys: `stage.live` · `stage.closed` · `stage.verified` · three `.help` ·
`stage.explainer.summary` · `stage.explainer.a11y` · the four `index_line.*`. ⛔ **No headline.**
And `"and counting"` / `"lakh"` appear **⛔ NOWHERE** under `packages/i18n/locales/`. ⚠ The nearest
strings are `close-of-cycle.json:3,7` — *"… Every hand **stood with this family**."* — ⛔ a different
namespace, and semantically a **CLOSED-cycle outcome**, the opposite of *"and counting"*.
⇒ ⛔ following AC3 literally means **D mints its own** — ⭐ exactly the two-source defect `-193` cl.3
exists to close, on a **Trustee-ratified** line, and ⭐ 11b.12's own AC9 predicted it in terms.

**(b) ⚠⛔ AND ⛔ NO RULING ASSIGNS IT A SURFACE.** `-190` cl.6 rules *"THE DRIVE **HEADLINE**"* —
**singular**. Meanwhile B **did** ship a Trustee-ratified, money-bearing **index** line
(`index_line.full`), and **D2** rules the amount renders on **BOTH** surfaces, and **AC7** makes D
render `index_line.*` on the index. ⇒ **two ratified sentences, and the story says which goes where
⛔ nowhere.** ⚠ They are ⛔ not interchangeable:

| | AC3's headline | B's `index_line.full` |
|---|---|---|
| Leads with | ⭐ **PARTICIPATION** — *"16,750 members have stood with this family"* | ⭐ **THE AMOUNT** — *"{amount} contributed by colleagues …"* |
| Member count | ⭐ present (the **confirmed contributor** count) | ⛔ **absent entirely** |
| Names a person | ⛔ no | ⭐ yes — `{nominee_name}` |
| Exists in the repo | ⛔ **NO** | ⭐ yes, both locales |

**The four options, ⛔ none pre-ruled:**

- **(i) THE INDEX LINE IS THE ONLY SENTENCE.** ⭐ Zero copy minted; the ratified string already exists
  and AC7 already renders it. ⚠ ⛔ But AC3's *"PARTICIPATION-FIRST"* ruling is then ⛔ not satisfied —
  the index line carries ⛔ no member count at all.
- **(ii) TWO SENTENCES, TWO SURFACES** — the index row takes `index_line.*`, the **drive page** takes
  the participation headline. ⭐ Reads coherently and matches cl.6's singular *"drive headline"*.
  ⚠ Costs: the headline must still be **authored and ratified** (it does not exist), and D would be
  minting Trustee-ratified copy — ⛔ which is what (iv) exists for.
- **(iii) BOTH ON THE INDEX ROW.** ⚠ Two money sentences on one row; ⛔ likely rejected on
  `-190` cl.8's *"the UI carries the understanding"* grounds, ⛔ but not ruled out.
- **(iv) ROUTE THE COPY BACK.** ⭐ The string is **Trustee-ratified content**; B owned the shared
  source and did not ship it. ⇒ author it into `sahyog-shared` under a governance commit **with the
  Panel's wording**, ⛔ never invented at the render site.

⚠⛔ **AND WHICHEVER IS CHOSEN, AC3'S FIGURES ARE ⛔ NOT CONSTRAINTS** — `-190` cl.6 says so itself
(*"ignore the arithmetic in example"*), and ⛔ **no formatter produces either form** (AC3, verified):
`formatCurrency` emits `"₹ 19,45,000"`, ⛔ never *"₹19.45 lakh"*; there is ⛔ no shared plain-number
formatter; and the **amendment-A2** contract requires **LATIN** numerals for money in the Hindi
surface (`currency.ts:10-15`). ⇒ **the answer to D5 carries a formatting decision with it.**

---

### ✅⚠ D6 — **RULED by the Trustee Panel (DR + KB), 2026-09-07** — ⛔ the *"412 of 500"* label is **REMOVED**; ⭐ the bar carries a **participation sentence** instead

> ✅⭐⭐ **THE PANEL'S ANSWER, VERBATIM:** *"Around bar above or below do not show '412 of 500
> contributions confirmed.' Instead it would show —"*
>
> > **HI:** *43 हज़ार सहकर्मियों द्वारा 19.45 लाख का योगदान अभी तक... योगदान जारी है!*
> > **EN:** *19.45 lakh and counting, by 43,000 colleagues—and still going strong!*
>
> ⇒ ⭐⭐ **§6.3 option (i) — a label naming ⛔ NO denominator.** ⛔ `active_contribution.progress` and
> `active_contribution.progress_a11y` are ⛔ **NOT** rendered on the public surface. ⭐ The
> target-printing channel `D6` found is **CLOSED** — ⛔ the label no longer names `{total}`.
> ⚠ **The cost the Panel accepted, recorded:** the bar's **width** now means something the words do
> ⛔ not explain (§6.3(i)). ⛔ Not re-opened.
> ⚠ ⭐ **`D3` is MOVED, ⛔ not closed** — a **coarsened** *"19.45 lakh"* weakens recovery by division
> materially, ⛔ but only if the **exact** figure does ⛔ not also render on the same row. ⇒ that
> depends on **follow-up 1**.
>
> ⏳⚠⛔ **THREE FOLLOW-UPS, ⛔ none of them a re-litigation** — ⭐ all relayed 2026-09-07:
> **(1)** this sentence and `D5`'s are the **same sentence in two number forms** ⇒ is there ⛔ ONE
> sentence on a Live row (around the bar), or **two**? **(2)** ⛔ ⛔ **⛔ NO `₹` APPEARS IN ANY OF THE
> FOUR RATIFIED STRINGS.** **(3)** ⭐ *"lakh"* / *"हज़ार"* is a **word-form that exists ⛔ NOWHERE** in
> this product and needs a **rounding rule**.

⭐⭐ **THE FINDING.** BigDev asked what renders above and below the bar to tell a reader what it is.
⚠ We read the shipped render in order at
`apps/mobile/components/active-contribution/ActiveContributionCard.tsx` and resolved every key to its
**actual string in both locales** — ⛔ not to its doc-block:

| Position | Line | Key | The actual string |
|---|---|---|---|
| above the bar | `:234-236` | `active_contribution.days_a11y` | *"{days} days remaining in this cycle"* / *"इस चक्र में {days} दिन शेष"* |
| ⛔⛔ **directly above the bar** | `:256` | `active_contribution.progress` | ⛔ *"**{confirmed} of {total}** contributions confirmed"* / *"**{total} में से {confirmed}** अंशदान पुष्ट"* |
| on the bar (screen reader) | `:263` | `active_contribution.progress_a11y` | *"{confirmed} of {total} contributions confirmed so far"* |
| below the bar | `:272` | `pool_progress.amount_raised` | *"Raised so far"* / *"अब तक जुटाई गई राशि"* |
| below that | `:281` | — | `formatInr(amountRaisedInr)` |

⛔⛔ **THE LABEL STATES BOTH OPERANDS, INCLUDING THE DENOMINATOR.** On the member card `{total}` is
`rosterSize` — *"412 of 500 contributions confirmed"*. ⚠ **`D1(a)` makes the public denominator the
rupee TARGET**, and `progressLabelKey` is emitted by the **same presenter** as the percentage. ⇒ ⛔
rendering the shipped label unchanged **prints the hidden target — as a number, in words, in both
languages, directly above the bar.**

⚠ ⭐ **THIS IS A DIFFERENT CHANNEL FROM `D3`.** `D3` is the target **recovered by division** from the
fill geometry. ⛔ This is ⛔ not a recovery — ⭐ **it is the number itself, printed.** ⚠ AC2's ban is
worded as *"⛔ no percentage **label** that lets it be inferred by arithmetic"* — ⛔ the shipped label
does ⛔ not require arithmetic.

⚠⛔ **AND DELETING THE LABEL IS ⛔ NOT OBVIOUSLY RIGHT EITHER.** `-190` cl.8 rules *"**THE UI CARRIES
THE UNDERSTANDING**"* and *"the arithmetic is SHOWN, ⛔ never ASSERTED."* ⭐ A bar with ⛔ no label is a
coloured rectangle — it shows nothing and asserts nothing. ⇒ the public bar needs **copy that says
what it measures without naming what it measures against**, ⛔ and ⛔ no such string exists in either
locale.

**The four options, ⛔ none pre-ruled** (routing note **§6.3**):

- **(i) A LABEL NAMING ⛔ NO DENOMINATOR** — e.g. the confirmed count and the amount only. ⚠ Cost: the
  bar's **width** then means something the words ⛔ do not explain.
- **(ii) ⛔ NO LABEL — the bar is decorative.** ⭐ Leaks nothing; ⚠ ⛔ carries no understanding.
- **(iii) ⛔ NO BAR on the public surface.** ⚠ This **narrows `-189` cl.2(b)** (*"each carries a
  progress bar"*) ⇒ ⛔ we do ⛔ not propose it; ⭐ it is listed because it retires **D6 and D3 together**.
- **(iv) THE LABEL NAMES THE TARGET WHERE THE TARGET IS REVEALED** — ⭐ available ⛔ only if **`D4`**
  is answered as option (i).

⭐⭐ **`D6` INTERLOCKS WITH `D4`.** ⚠ If the Superadmin's public reveal reaches the screen, then for a
Pariwar with the switch **ON** the shipped label is ⛔ **not** a leak — it names a figure that Pariwar
chose to publish. ⇒ **`D6` then applies only to Pariwars with the reveal OFF.** ⛔ Answer them
together, ⛔ not independently.

---

## ⚠ What this story does ⛔ NOT do

⚠⛔ **AND IT DOES ⛔ NOT RULE `D3`, `D4` OR `D5`** — ⭐ all three are recorded **OPEN** and are
BigDev's (any of them may escalate). ⛔ The dev agent resolves ⛔ none of them.

⛔ It does ⛔ not build the target, its keys or its admin surface (**C**) · ⛔ not invent stage words
(**B**) · ⛔ not touch bank fields (**A**) · ⛔ not build any member surface (**E/F**) · ⛔ not change
the cache policy or the rate tier · ⛔ not list `spawned` · ⛔ not add ordering, ranking or any
cross-drive comparison · ⛔ not publish a written pitch (`-190` cl.8).

---

## Tasks / Subtasks

> ⚠⛔ **THE NUMBERS ARE ⛔ NOT THE ORDER, AND THEY ⛔ CANNOT BE RENUMBERED.** Task **8** is cited by
> name from outside this file — `deferred-work.md` routes the double-absence gap to
> *"Story D (`11b-14` **AC7/Task 8**)"* — and `D3` / `-203` cl.8 cite **Task 7**. ⇒ ⭐ **execution
> order is 0 → 2 → 3 → 4 → 5 → 6 → 8 → 7**, with **Task 7 (Tests) LAST**. ⛔ Do not renumber.

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0) — annotate `epics.md` (⭐ FR-76 **restored**, verified at
      `epics.md:160`; the **`:4872`** AC parenthetical **superseded** — ⚠ ⛔ **not `:4865`**, which is
      now a blank line); flip the sprint row **and clear its discharged *"BLOCKED ON B AND C"* text
      and its stale `:4865`**; ⛔ one `governance:` commit, ⛔ no code.
- [x] **Task 1 — RULE D1 AND D2** — ✅ **BOTH RULED 2026-09-04.** D1: extend the canonical producer
      with an optional rupee denominator; re-scope (⛔ do not remove) the THROW; ⛔ **no target ⇒ no
      bar**. D2: **both surfaces**, and the *"never a sum"* sentence **amended as an amendment**.
      ⚠⛔ **BOTH CARRY 2026-09-06 AMENDMENTS** — D1 gains three mechanical blocks it did not know
      about; D2 gains **two more sites** (four, not two). ⭐ Re-read both before Task 3 / Task 6.
- [x] **Task 1b — ⚠⛔ ROUTE `D4` AND `D5` TO THE PANEL** — ✅ **DONE 2026-09-07.** ⇒ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md`
      ⭐ Built on ratified text and verified repository state **only**; ⛔ ⛔ no code comment, doc-block
      or story prose used as evidence (§7 lists every check, re-runnable).
- [ ] **Task 1c — ⏳ AWAIT THE PANEL** — ⛔ **BLOCKING Task 3 (`D4`, `D6`) and Task 5 (`D5`).**
      ⛔ ⛔ **No code on the meter's denominator or its LABEL before `D4` / `D6`; ⛔ no headline copy
      written, authored or translated before `D5`.** ⭐ Every other task proceeds meanwhile.
      ⭐ ✅ **`D5`'s surface half is already RESOLVED** — Live → cl.6's headline; Closed · Verified →
      `index_line.*`. ⭐ Task 5 may build **against that split** today; ⛔ only the Live **string** waits.
- [ ] **Task 2 — The listing predicate** (AC1, **Trap 6**) — ⚠⛔ **FIVE artefacts, ⛔ not one:**
  - [ ] `SAHYOG_DRIVE_VISIBLE_POOL_STATES` (`public-read.ts:102`) gains `live`; amend the `:97-100`
        doc-block that calls it *"ABSENT deliberately"* — ⭐ **amend and name**, ⛔ never overwrite.
  - [ ] `PublicSahyogDriveStatus` (`sahyog-drive.ts:80`) gains `'live'`; ⭐ **amend `:78`, which is a
        routing note naming this story.** ⛔ `spawned` stays a PURE DENY.
  - [ ] `PUBLIC_STATUS_BY_POOL_STATE` (`public-read.ts:137-140`) gains the mapping — ⭐ **the compile
        break is the gate WORKING** (`:134-135`), ⛔ not an obstacle.
  - [ ] `sahyog.server.ts:210`'s hand-typed literal-set guard — ⚠ ⛔ **the typecheck cannot see it**;
        miss it and `/sahyog` serves its **OUTAGE** page to everyone. Pinned `sahyog-serves.test.ts`.
  - [ ] `sahyog-render.ts:341-346` partition + `:299` label ternary — ⛔ **both are two-way today**;
        leave them and every live drive renders under **"Closed drives", labelled "Closed"**.
- [ ] **Task 3 — The meter** (AC2, per D1) — including the **no-target** path and re-scoping the THROW.
  - [ ] ⚠⛔ **ANSWER `D3` FIRST** (AC2) — (i) quantize/band, (ii) accept-and-record, or (iii) escalate.
        ⛔ Do ⛔ not wire the denominator before it is answered; ⛔ a token-scan test will ⛔ not catch it.
  - [ ] ⏳⚠⛔ **AND `D6` — ⛔ WITH THE PANEL since 2026-09-07.** ⛔ The public bar's LABEL. The shipped
        `active_contribution.progress` names `{total}`; under `D1(a)` that IS the target. ⛔ Do ⛔ not
        render, suppress or reword it on a guess — ⭐ and answer it **together with `D4`**.
  - [ ] ⏳⚠⛔ **AND `D4` — ⛔ WITH THE PANEL since 2026-09-07.** Whether the meter honours
        `-190` cl.7(c)'s public reveal, defers it **by a named successor story key**, or narrows it
        to members. ⛔ Not the dev agent's call, ⛔ and no longer BigDev's.
  - [ ] ⛔ **Update BOTH halves of the anti-widening gate** — `presenter.test.ts:157-163` (the
        `Record<keyof …, true>` literal) **and** `:186-188` (the five-element array) — ⭐ and
        **record the relaxation as deliberate**, keeping the banned-name loop at `:189-191` intact.
  - [ ] ⛔ Resolve `rosterSize` **and** `fixedAmount` being **required** operands (Trap 1 (2)/(3)).
  - [ ] ⭐ Consume C's resolver **BY NAME** — `resolveEffectiveDriveTargetInr` /
        `resolveDriveTargetVisibility` (`domain/src/pool/drive-target-policy.ts:169`, `:233`).
        ⛔ Do ⛔ not re-read `pariwar_drive_target_schedule` directly.
- [ ] **Task 4 — The wire** (AC3, **Trap 2**) — the index row needs what the headline consumes.
      ⚠⛔ **BEFORE ANYTHING: `public-read.ts:739-743` QUARANTINES BOTH RUPEE TOTALS *"under any
      name"*, and `deliveredTotal` (`:761`) IS `amountRaisedInr`.** ⇒ D2 supersedes it — ⭐ **amend
      and NAME that comment**, ⛔ never edit past it. ⭐ `fixedAmount` is **already selected** at
      `:695`, so ⛔ no read-shape change is needed. ⚠ Prefer sending the **derived** amount over
      exposing `fixedAmount`; ⭐ ⛔ do not add both.
  - [ ] ⛔ **The new field is a MATRIX ACT** (Trap 7) — `SAHYOG_DRIVE_ROW_FIELD_IDS`
        (`surface-fields.ts:338`) **and** `SAHYOG_DRIVE_ROW_SHAPE` (`:369`) **and** the YAML row.
        `deriveFieldIds` throws in **both** directions.
- [ ] **Task 5 — Render + copy** (AC1, AC3, AC5, **Traps 4 and 8**) — the Live section; the headline
      in both locales **per `D5`'s answer**; ⛔ no ordering affordance anywhere.
  - [ ] ✅⭐ **BUILD THE STAGE SPLIT — ⛔ this half is RESOLVED, ⛔ not waiting.** **Live** rows take
        cl.6's headline; **Closed · Verified** rows take `sahyog-shared:index_line.*`. ⚠ ⛔ Do ⛔ not
        render `index_line.*` on a Live row.
  - [ ] ⏳⚠⛔ **`D5`'s REMAINDER — ⛔ WITH THE PANEL since 2026-09-07.** ⛔ The Live sentence exists in
        ⛔ no file, in either language, and ⛔ no Hindi was ever ratified for it. ⛔ Do ⛔ not mint,
        author or translate a Trustee-ratified sentence at a render site until the Panel says who writes it.
  - [ ] ⛔ **Rewrite `page.intro` in BOTH locales** — it says *"Drives that are still **Live are not
        listed here**"* / *"जो अभियान अभी जारी हैं वे यहाँ **सूचीबद्ध नहीं** हैं।"*, pinned by
        `sahyog-copy.test.ts:34`. AC1 makes it **false**.
  - [ ] ⛔ Add the Live section's `section.*.title` + `table.caption.*` — ⚠ **without re-adding a
        stage NAME to `sahyog-drive.json`** (its `$comment` forbids it, `-193` cl.3); compose
        `sahyog-shared:stage.live` instead.
  - [ ] ⛔ **Trap 4 — the "Closed on" column.** `sahyog-render.ts:503-505` **already** renders
        *"Not recorded"* for a null date. ⭐ Recommendation: the Live section does ⛔ not carry the
        column. ⚠ **And decide `closeOfCycleFraming`** — a close-of-cycle sentence over a running drive.
  - [ ] ⛔ Number/currency formatting per `D5` — ⭐ **LATIN numerals in Hindi** (amendment-A2,
        `currency.ts:10-15`); ⛔ never the `'hi'` Devanagari arm for a money figure.
- [ ] **Task 6 — The prose that must move** (AC0, AC4, Traps 2, 3, 5) — ⛔ **Amend and NAME; ⛔ never
      delete.** ⚠ **FOUR sites, ⛔ not two:** `sahyog-drive.ts:149-150` · `public-read.ts:524`
      (⚠ **the 2026-09-04 quote was never its text**) · `sahyog-vivran.ts:345-347` (the drive page) ·
      `public-read.ts:739-743` (the quarantine). **And** state the **staleness** (Trap 3,
      `sahyog.astro:304`); state the **address-publication** consequence (Trap 5) **citing
      `2026-09-05-200`**, ⛔ not `-186` alone.
- [ ] **Task 8 — The nominee name on the index** (AC7) — ⚠ **AC7(a) FIRST: the decision-log entry
      and the matrix row, in a `governance:` commit, ⛔ before any code.**
  - [ ] ⛔ **THREE matrix artefacts, ⛔ not one** (Trap 7) — the YAML row; **`matrix.ts:398-453`
        `RULED_TIER1_PUBLIC_EXCEPTIONS`** (⚠ it pins **(surface, field) PAIRS**, and `:396-397`
        forbids appending **without a ruling** — ⭐ the decision entry supplies the id it cites);
        and `surface-fields.ts:338` + `:369`.
  - [ ] ⛔ **Amend and NAME `public-vs-private-matrix.yaml:127-136`** — it still says the name FORM
        is *"⛔ NOT RULED"*; the Panel ruled it 2026-09-05.
  - [ ] ⚠⛔ **ANSWER THE DOUBLE-ABSENCE OPEN ITEM** — ⛔ deferred to this story **by name**. Either
        demonstrate it unreachable in production data, or extend the variant set. ⛔ `t()` throws ⇒
        **one bad row 500s the whole page**.
  - [ ] ⭐ **BOUNDED-CONCURRENCY** decrypt (`mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY`),
        ⛔ **NOT "batched"** — ⚠ per-value DEKs mean ⛔ no batch exists (`handlers.ts:386-387`).
  - [ ] ⭐ **Copy the list-shaped failure posture** from `handlers.ts:449-456` — *"OMIT THE NAME,
        ⛔ KEEP THE ROW"*. ⛔ Do ⛔ not re-derive one.
  - [ ] ⛔ **NARROW, ⛔ never delete**, the two assertions in
        `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` this AC falsifies — ⭐ the test's own
        author left the successor property in writing.
  - [ ] Then: the contract field, the render under **"Nominee Name"**, the omit-the-clause rule, and
        the **measured** p95. ⛔ **NO** other bank value crosses (keys ABSENT, ⛔ never `null`).
        ⛔ **NO** join or match rule to `member_nominees` (AC7(c)).
- [ ] **Task 7 — Tests** — ⭐ **RUNS LAST**, despite the number. A `live` drive appears **in the Live
      section, labelled with B's word**; `spawned` does ⛔ not; the target is ⛔ NOWHERE in any
      response (AC2 — ⚠ ⛔ **and a green token scan proves nothing here; see `D3`**); headline figures
      are internally consistent (AC3); ⛔ no ordering parameter is accepted; the empty-section
      suppression still holds **for three sections**; the scrape-test identity set updated.
  - [ ] ⛔ **Also on the list, ⛔ none named at authoring:** `apps/public/tests/sahyog-copy.test.ts`
        (page.intro + the third section's keys) · `apps/public/tests/sahyog-serves.test.ts` (derives
        from `PublicSahyogDriveStatus.options`) · `apps/public/tests/sahyog-empty-section.test.ts`
        (⚠ its stage loop and its exactly-one-guard-each assertion) ·
        `packages/ui/tests/pool-progress/presenter.test.ts` (the anti-widening gate) ·
        `apps/mobile/tests/unit/self-verify-surface-render.test.ts` (⚠ a **source-scan** gate on the
        member call site) · `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` (narrow, ⛔ not delete).
  - [ ] ⭐ **Execute them** against `twt-test-pg` `:5433` — ⛔ *"written but not run"* is ⛔ not attested.
- [ ] **Task 9 — The friction-budget disposition** — ⚠ 11b.11, 11b.12 and 11b.13 each landed one and
      this story had ⛔ none. ⭐ Written **AFTER** the code commit (the 11b.12 pattern); ⛔ AC-4 diffs
      **COMMITTED** history ([[project_friction_budget_baseline_ratchet]]).

---

## Dev Notes

### This story is where FR-76 finally lands

⭐ It is ⛔ not a feature request. **FR-76 has been a standing, un-superseded requirement since the
PRD** (`epics.md:160`), cited in ⛔ zero implementation records, discovered only because BigDev asked
*"who decided a collecting drive is a solicitation?"*. ⇒ Task 0's annotation is the **repair of a
five-month gap**, and it should read that way.

### ⚠⛔ The decisions are the whole story — and there are now THREE open, ⛔ not zero

⭐ Tasks 2 and 5 look mechanical and ⛔ are not: Task 2 is **five artefacts** across three packages,
two of which fail **silently**. **D3, D4 and D5 are ⛔ none of them the dev agent's** — one decides a
disclosure channel, one decides whether a ratified `super_admin` authority has a consumer at all, and
one decides where Trustee-ratified copy comes from. ⚠ ⛔ **No meter before `D4`. ⛔ No copy before `D5`.**

### ⚠ What the 2026-09-06 validation changed, so it is ⛔ not re-discovered

⭐ Every `file:line` re-anchored (B and C moved 105 files) · `public-read.ts:481` was **mis-quoted**,
⛔ not merely drifted · D2 reaches **four** sites · D1(a) hits a **hard test gate** · AC7(b)'s
*"batched"* remedy **cannot be built** and its baseline was **50, not 1-2** · Traps 6-8 are new ·
`D4` / `D5` are new · AC7 gains the **double-absence** open item routed here by name.

### Testing standards

Live-DB integration under `apps/api/tests/integration/public-pages/`; copy and presenter assertions as
units. ⚠ Assert **membership and explicit values**, ⛔ never counts over the shared fixture
([[project_live_db_test_gotchas]]).

### References

⚠ ⭐ **All code anchors below re-verified live 2026-09-06 against HEAD `55e3eee7`.**

- `.decision-log.md#decision-2026-09-04-189` cl.2, cl.5 · `-190` cl.2, **cl.6, cl.7(b), cl.7(c)**,
  cl.8 · `-191` cl.4 · `-193` cl.2 · **`-196` cl.8** (*"Story D is its first consumer, server-side"*)
  · **`-200`** (Trustee-ratified reachability) · **`-203` cl.6** (⛔ `0` is not a legal target)
- `.decision-log.md#decision-2026-09-04-187` — FR-76's provenance and the un-built requirement
- `packages/ui/src/pool-progress/presenter.ts:34-40,60-65,69,73-75` — ⭐ **the meter's real code**
  (`view-model.ts:36-67` is its **doc mirror**, with ⛔ zero executable statements)
- `packages/ui/tests/pool-progress/presenter.test.ts:157-163,186-188` — the anti-widening gate
- `packages/contracts/src/public-pages/sahyog-drive.ts:80` (the two-member enum), `:78` (⭐ the
  routing note naming this story), `:139-144` (`closedAt`), `:149-150` (*"never a sum of amounts"*)
- `packages/contracts/src/public-pages/sahyog-vivran.ts:345-347` — ⭐ **the third site**
- `packages/contracts/src/public-pages/matrix.ts:396-397,398-453` — `RULED_TIER1_PUBLIC_EXCEPTIONS`
- `packages/domain/src/pool/public-read.ts:97-100,102` (the predicate + its doc-block), `:137-140`
  (the total map), `:524` (the domain echo), `:695` (`fixedAmount` already selected), **`:739-743`**
  (the quarantine), `:760-761` (`deliveredTotal` = `amountRaisedInr`)
- `packages/domain/src/pool/drive-target-policy.ts:169,233` — ⭐ **C's resolvers, the key paths**
- `apps/public/src/lib/surface-fields.ts:59-92,338,369` · `sahyog-render.ts:299,341-346,470,498-505`
  · `sahyog.server.ts:210` · `apps/public/src/pages/sahyog.astro:304,499,552`
- `apps/api/src/modules/public-pages/handlers.ts:386-387,399,431,441,449-456,634-636,717-720`
- `packages/i18n/src/resolver.ts:39` · `src/currency.ts:10-15` · `locales/{en,hi}/sahyog-shared.json`
  · `tests/sahyog-shared-dark-copy.test.ts`
- `_bmad-output/planning-artifacts/epics.md:160` (FR-76), `:4872` (the superseded parenthetical)
- ⏳ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md` — **the `D4` / `D5` escalation**

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-07 | 0.6 | ✅⏳⭐⭐ **`D5` NARROWED — BigDev supplied the reading and the record backs it; and `D6` OPENED and ROUTED.** ⛔ Zero rows move; ⛔ no code. ✅ **THE TWO RATIFIED SENTENCES ARE TWO STAGES, ⛔ NOT TWO SURFACES:** **Live** rows take `-190` cl.6's *"…and counting"* headline; **Closed · Verified** rows take `sahyog-shared:index_line.*`. ⭐ **The evidence is PROVENANCE, ⛔ not tense** — cl.6 adopts the wording **delegated at `-189` cl.2(e)**, and cl.2 is titled *"(Q2) — YES: A COLLECTING DRIVE IS LISTED"*, with the Panel's own example *"19.45 lakh and counting, by 43k members"*; and the 2026-09-05 index line was ratified against an index listing **`closed` + `settled` ONLY** — ⛔ `live` is unlisted and **this story adds it** — while occupying the **close-of-cycle** slot, which is structurally null for an unclosed drive. ⇒ ⛔ **the "which surface" question is WITHDRAWN from the Panel.** ⚠⛔ **AND ONE 2026-09-06 CLAIM IS WITHDRAWN AS OVER-STATED** — that the index line *"carries no member count ⇒ cannot satisfy participation-first"*; the 11b.12 note **§7.1(7)** shows the omission was **deliberate** (*"the confirmed count is ALREADY on the same row ⇒ don't restate a number"*) and the count is a **column**. ⚠ **Open consequence recorded, ⛔ not resolved:** `index_line.*` is what carries the **nominee name**, and it is now Closed · Verified only, while cl.6's Live sentence has ⛔ no `{nominee_name}` slot ⇒ **does a Live row carry it, and where?** ⏳⛔⛔ **`D6` — THE BAR'S OWN LABEL NAMES ITS DENOMINATOR.** Read from the shipped render (`ActiveContributionCard.tsx:234-281`) with every key resolved to its **actual string in both locales**: directly above the bar sits `active_contribution.progress` = *"{confirmed} of **{total}** contributions confirmed"* / *"{total} में से {confirmed} अंशदान पुष्ट"*. ⇒ under `D1(a)` that `{total}` **IS the target** ⇒ ⛔ **the bar built to hide it would PRINT it, in words, in both languages.** ⚠ ⭐ A **different channel from `D3`** — ⛔ no arithmetic required — and AC2's ban (*"no percentage label that lets it be **inferred by arithmetic**"*) ⛔ does not reach it. ⚠ ⛔ Deleting the label is ⛔ not obviously right either: cl.8 rules *"the UI carries the understanding"*, and an unlabelled bar carries none. ⭐ Four options recorded, ⛔ none pre-ruled; ⭐ **`D6` interlocks with `D4`** — a revealed target makes the shipped label lawful for that Pariwar. ⇒ **Tasks 3 and 5 stay blocked; ⭐ Task 5 may build the stage SPLIT today — ⛔ only the Live STRING waits.** | BigDev + Claude |
| 2026-09-07 | 0.5 | ⏳⭐⭐ **`D4` AND `D5` ROUTED TO THE TRUSTEE PANEL — ⛔ BigDev rules neither; ⛔ zero rows move; ⛔ no code.** ⇒ `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-07-11b14-drive-target-reveal-and-the-unwritten-headline.md` ⭐ **Q1 (`D4`):** did `-190` cl.7(c)'s *"ONLY A SUPERADMIN may make it visible, separately for member and for public"* mean the figure would actually appear — and is D, which `-196` cl.8 names *"its first consumer"*, the story that makes it so? ⛔ The switch is built, governed, `super_admin`-gated and DB-constrained, and **every** non-test reference to it is definition, storage, write path or admin API — ⛔ **zero readers in any member- or public-facing render**; `resolveEffectiveDriveTargetInr` and `resolveDriveTargetVisibility` have ⛔ **zero production callers**; `apps/public/src` and `apps/mobile` contain ⛔ **zero** references to the target in any form; and a **shipped test** sets `reveal_to_public = true` and then asserts seven target tokens are absent — ⭐ the programme has already codified that the switch changes nothing. Story **E** repeats the omission on the member axis ⇒ ⛔ cl.7(c) has ⛔ no consumer on either axis it names. ⭐ **Q2 (`D5`):** cl.6 adopted a headline in the Panel's words; both `sahyog-shared.json` files hold **14 keys** and ⛔ none is a headline, and `"and counting"` / `"lakh"` / `"have stood with"` / `"members have stood"` each return ⛔ **0 files** across the entire locale corpus. ⚠ A **second** ratified money sentence (the 2026-09-05 index line) IS shipped, carries ⛔ no member count, and ⛔ nothing says which surface takes which. ⭐ `formatCurrency` **executed**: `"₹ 19,45,000"` (en) / `"₹ १९,४५,०००"` (hi) — ⛔ never `"₹19.45 lakh"`. ⭐⭐ **The note rests on ratified text and verified repository state ONLY** — ⛔ ⛔ no code comment, doc-block or story prose is used as evidence, and §7 lists every check so each claim is re-runnable; ⚠ the two coherent readings are labelled **INFERENCE** and argued in both directions (§5). ⇒ **Task 3 and Task 5 BLOCKED; every other task proceeds.** | BigDev + Claude |
| 2026-09-06 | 0.4 | ⚠⛔⛔ **VALIDATED (`bmad-create-story validate`) — 26 FINDINGS, TWO NEW OPEN DECISIONS, ⛔ ZERO ROWS MOVE.** ⭐ Three adversarial passes over a baseline that had moved **105 non-`_bmad-output` files**. ⛔ **`D4` OPEN** — AC2 quotes `-190` cl.7(b) and **drops cl.7(c)**; C's `revealToPublic` has ⛔ **ZERO** production readers (admin write + DB + RLS + CHECK + `super_admin` key, ⛔ no render anywhere), and `-196` cl.8 names **this story** as the target's *"first consumer"*. Story **E** repeats it on the member axis ⇒ ⛔ cl.7(c) has ⛔ no consumer in the whole split. ⛔ **`D5` OPEN** — AC3's ruled headline **does ⛔ not exist** in B's shared copy (`"and counting"` / `"lakh"` appear ⛔ nowhere under `locales/`), ⛔ no ruling assigns it a surface, and ⛔ no formatter produces either figure. ⭐ **AC7 gains the double-absence open item**, routed here **BY NAME** by 11b.12's code review — two combinations have ⛔ NO variant and `t()` **throws** ⇒ a **500 for the whole page**. ⚠ **Traps 6-8 added:** widening the predicate is **five** artefacts (⛔ two fail silently — every live drive would render under *"Closed drives"*); **two matrix gates**, one of which **forbids its own remedy**; and **test-pinned copy in both locales goes FALSE**. ⚠ **D1 amended** — the anti-widening test rejects ⛔ ANY new input key, and `rosterSize`/`fixedAmount` are required. ⚠ **D2 amended** — **four** sites, ⛔ not two, including `public-read.ts:739-743`, which prohibits Task 4's preferred option **by name**. ⚠ **AC7(b) corrected** — *"batched"* ⛔ cannot be built (per-value DEKs) and the baseline was **50, not 1-2** ⇒ **3×**, ⛔ not 50×. ⭐ **Every `file:line` re-anchored**; `public-read.ts:481` was **mis-quoted**, ⛔ not merely drifted. ⭐ Header blocker **DISCHARGED** (B and C both `done`). ⛔ Zero rows move; ⛔ no code. | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 + D2 RULED.** D1: extend the canonical producer (optional rupee denominator), re-scope the THROW, ⛔ **no target ⇒ no bar**. D2: **both surfaces**, `sahyog-drive.ts:133` **amended and NAMED**, AC5's ordering half untouched. ⇒ ⛔ zero open decisions; ⚠ still blocked on **B** and **C**. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **D**). ⚠ **D1 and D2 are OPEN.** ⭐ Findings at authoring: the shipped meter divides by **`rosterSize`, ⛔ not a target**; the index contract says **"⛔ never a sum of amounts"** and that sentence is an **author's extension** of 11b.1 AC5, ⛔ not AC5 itself; and `/sahyog` is cached **5 minutes** against FR-76's *"near-real-time"*. | BigDev + Claude |
| 2026-09-06 | 0.3 | ⚠⛔ **`D3` ROUTED IN FROM STORY C (11b.13 validation), QUESTION OPEN — ⛔ blocks Task 3's denominator wiring.** The meter recovers C's **hidden** target by division: D1 makes `confirmedPercentage`'s denominator the target, AC3 publishes `amountRaisedInr`, ⇒ `target ≈ amount ÷ pct`. ⛔⛔ **And both stories' *"the target is nowhere in any response"* tests PASS anyway** — they are TOKEN assertions and the channel is DERIVED. ⭐ A consequence of a **ratified combination** (`-189` cl.2(b)+(c) + `-190` cl.6/cl.7(b)), ⛔ not a defect in any one ruling, ⛔ not re-litigated. Three options recorded in **AC2**, ⛔ **none pre-ruled**: quantize/band · accept-and-record · escalate. ⚠ C's reveal switches are ⛔ **not** the answer — they gate the NUMBER, and this channel never carries it. ⛔ Zero rows move; ⛔ no code. | BigDev + Claude |
| 2026-09-05 | 0.2 | ⭐⭐ **SCOPE EXTENDED — AC7 + Task 8: the NOMINEE NAME goes ON THE INDEX**, Trustee-ratified 2026-09-05 (Dhiraj Rahul + Kalpana Bharti) on Story 11b.12's D2 (ruling 2). ⭐ Landed **here** rather than in B because 11b.12's own AC7 forbids touching any field tier, listing predicate or wire shape, and D already extends the index wire, read and matrix. ⭐ It renders 11b.12's dark `{nominee_name}` token — ⛔ the same pattern as `{amount}`. ⚠⛔ **THREE SUB-CLAUSES, all load-bearing:** **(a)** a decision-log entry **AND** a matrix row **BEFORE any code** — `-190` cl.2 ruled **ONE DRIVE'S PAGE** and ⛔ does NOT auto-widen to the index; **(b)** the decrypt volume is a **50× step change** (1-2 → up to 100 per request) ⇒ **batched** decrypt, a **list-shaped** failure posture, and a **measured** p95 — ⚠ edge-caching is ⛔ NOT a new posture, but the flip-latency must be stated at the decrypt; **(c)** the value stays **UNVERIFIED until Story 6.18 ships**, recorded ⛔ not re-litigated — the Panel ruled the exposure knowing it, and ⛔ NO join or match rule may be added here (`D5-subject` (i)). ⭐ `deferred-work.md` **(h) `D-nominee-name-form`** is **CLOSED BY RULING** — the Panel ruled the FORM (full name), which `-190` cl.2 had left open. | BigDev + Claude |
