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

#### AC7(a) — ⛔ GOVERNANCE BEFORE CODE, ⛔ and it is ⛔ NOT covered by AC0's annotation

**Then** a **decision-log entry** records the ruling as a **NEW public Tier-1 exposure on a NEW
SURFACE** — ⚠⛔ `-190` cl.2 ruled **ONE DRIVE'S PAGE** and ⛔ **does NOT auto-widen to the index**
([[feedback_supersede_never_reinterpret]])
**And** `public-vs-private-matrix.yaml` gains the row (or the surface scope) — ⛔ a matrix that does
⛔ not name the surface leaves the exposure undeclared
**And** ⛔ ⛔ **no code lands before both.**

#### AC7(b) — ⚠⛔ THE DECRYPT VOLUME IS A ⛔ 50× STEP CHANGE — ⭐ engineer for it

⚠ **Verified, ⛔ not estimated:**

| Surface | Tier-1 decrypts per request |
|---|---|
| Drive page (today) | **1-2** — one drive, `.max(2)` accounts |
| **Index (this AC)** | ⚠ **up to 100** — `PUBLIC_SURFACE_PAGE_SIZE_CAP` **50** rows × 2 accounts |

**Then** the decrypt is **BATCHED** — ⛔ **never** an N+1 per row
([[project_epic6_drizzle_correlated_subquery_bug]]'s sibling lesson: a per-row read looks fine in a
DB-free test)
**And** ⚠ `public-read.ts` joins ⛔ **no** nominee table today ⇒ this adds a **join per row**; it is a
**read-shape change**, ⛔ not a field addition
**And** the **decrypt-failure posture is LIST-SHAPED** — ⚠ the drive page's per-field sentinel does
⛔ **not** obviously scale to 50 rows; ⛔ one bad row must ⛔ **not** 500 the page
**And** a **measured** p95 check is run and recorded ([[project_measured_validation_framework]])
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
> ⇒ `packages/contracts/src/public-pages/sahyog-drive.ts:133` is **AMENDED**, and
> `packages/domain/src/pool/public-read.ts:481` with it.
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

⭐ Trap 2: the index row's contract says *"⛔ never a sum of amounts"*; the Panel ruled the amount.

- **(a) Drive page only.** ⛔ The index keeps counts. ⭐ The `sahyog-drive.ts:133` sentence stands
  untouched. ⚠ But a visitor scanning the list sees ⛔ no money — and `-190` cl.8's whole mechanism is
  that **the UI carries the understanding**, which is weakest where people actually land.
- **(b) ⭐ BOTH.** ⚠ Requires amending `sahyog-drive.ts:133` — ⭐ **AMEND and NAME it**, ⛔ never delete:
  the sentence was an **author's extension** of AC5 (which prohibits ranking, ⛔ not sums), and
  `-190` cl.6 + `-189` cl.5 ruled the figure. ⛔ The ordering/most-supported half of AC5 stays.
- **(c) Index only.** ⛔ Incoherent — the drive page is where a reader who clicked wants the detail.

⇒ **AC3 is UNBLOCKED.** ⚠ Story D now has **⛔ ZERO open decisions** — ⭐ but it remains **BLOCKED on
B and C**.

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
- [x] **Task 1 — RULE D1 AND D2** — ✅ **BOTH RULED 2026-09-04.** D1: extend the canonical producer
      with an optional rupee denominator; re-scope (⛔ do not remove) the THROW; ⛔ **no target ⇒ no
      bar**. D2: **both surfaces**, and `sahyog-drive.ts:133` **amended as an amendment**. ⇒ Tasks 3-5
      unblocked; ⛔ the story stays **blocked on B and C**.
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
- [ ] **Task 8 — The nominee name on the index** (AC7) — ⚠ **AC7(a) FIRST: the decision-log entry and
      the matrix row, in a `governance:` commit, ⛔ before any code.** Then: the contract field, the
      **batched** decrypt, the **list-shaped** failure posture, the render under **"Nominee Name"**,
      the omit-the-clause rule, and the measured p95. ⛔ **NO** other bank value crosses (keys ABSENT,
      ⛔ never `null`). ⛔ **NO** join or match rule to `member_nominees` (AC7(c)).
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
| 2026-09-04 | 0.2 | ✅ **D1 + D2 RULED.** D1: extend the canonical producer (optional rupee denominator), re-scope the THROW, ⛔ **no target ⇒ no bar**. D2: **both surfaces**, `sahyog-drive.ts:133` **amended and NAMED**, AC5's ordering half untouched. ⇒ ⛔ zero open decisions; ⚠ still blocked on **B** and **C**. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **D**). ⚠ **D1 and D2 are OPEN.** ⭐ Findings at authoring: the shipped meter divides by **`rosterSize`, ⛔ not a target**; the index contract says **"⛔ never a sum of amounts"** and that sentence is an **author's extension** of 11b.1 AC5, ⛔ not AC5 itself; and `/sahyog` is cached **5 minutes** against FR-76's *"near-real-time"*. | BigDev + Claude |
| 2026-09-05 | 0.2 | ⭐⭐ **SCOPE EXTENDED — AC7 + Task 8: the NOMINEE NAME goes ON THE INDEX**, Trustee-ratified 2026-09-05 (Dhiraj Rahul + Kalpana Bharti) on Story 11b.12's D2 (ruling 2). ⭐ Landed **here** rather than in B because 11b.12's own AC7 forbids touching any field tier, listing predicate or wire shape, and D already extends the index wire, read and matrix. ⭐ It renders 11b.12's dark `{nominee_name}` token — ⛔ the same pattern as `{amount}`. ⚠⛔ **THREE SUB-CLAUSES, all load-bearing:** **(a)** a decision-log entry **AND** a matrix row **BEFORE any code** — `-190` cl.2 ruled **ONE DRIVE'S PAGE** and ⛔ does NOT auto-widen to the index; **(b)** the decrypt volume is a **50× step change** (1-2 → up to 100 per request) ⇒ **batched** decrypt, a **list-shaped** failure posture, and a **measured** p95 — ⚠ edge-caching is ⛔ NOT a new posture, but the flip-latency must be stated at the decrypt; **(c)** the value stays **UNVERIFIED until Story 6.18 ships**, recorded ⛔ not re-litigated — the Panel ruled the exposure knowing it, and ⛔ NO join or match rule may be added here (`D5-subject` (i)). ⭐ `deferred-work.md` **(h) `D-nominee-name-form`** is **CLOSED BY RULING** — the Panel ruled the FORM (full name), which `-190` cl.2 had left open. | BigDev + Claude |
