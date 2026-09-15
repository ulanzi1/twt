---
baseline_commit: 7d12a4ce
---

<!--
⭐ BASELINE — `story(11b.19): B's unshipped half — the ratified message block gets a copy source`.
⚠ RE-PINNED 2026-09-15 (v0.3, first validate): v0.1/v0.2 pinned `738bb3ea`, which is ⛔ NOT an
ancestor of HEAD — it survives only on `governance/11b-17-validate-and-panel-routing`. ⭐ The twin
`7d12a4ce` carries a BYTE-IDENTICAL tree (`e0ddf957…`) ⇒ the content baseline was sound and only the
SHA was orphaned. ⚠ This is the reactive re-pin `deferred-work.md`'s *"baseline pins going stale"*
item predicted for this story BY NAME.
⚠⛔ **AND THE PIN BEING AN ANCESTOR IS A **DIFFERENT** QUESTION FROM THE CODE CLAIMS BEING CURRENT.**
⭐ 42 files under `packages`/`apps` moved between this baseline and HEAD. Every code claim below was
RE-DERIVED at HEAD on 2026-09-15; ⚠ that half is perishable and expires the next time a sibling ships.
⚠⛔ **KEY `11b-18` IS SKIPPED** for the reason recorded in `11b-19` — the ledger names it; it is
⛔ absent from `development_status`, and its file lives on the unmerged local branch `story/11b-18-…`.
-->

# Story 11b.20: The Ratified Message Block on the PUBLIC Sahyog Vivran Page `[SURFACE]`

Status: ready-for-dev

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ MARKS A NEGATION AND MUST BE FOLLOWED BY AN EXPLICIT NEGATOR** — `not` / `no` / `never` /
`nothing` / `neither`, or a prohibition verb. ⇒ ⛔ before a POSITIVE clause is an **inversion**, ⛔ not
emphasis.
⚠ Doubling (`⭐⭐`, `⛔⛔`) is **volume only**, ⛔ never a second negation.
⚠⛔ **DECLARED because v0.2 used `⛔` as emphasis on positive clauses and inverted its own Preflight
headline and its own commit-ordering rule.** ⇒ ⛔ do ⛔ not write `⛔` before a clause you mean to assert.

## ⚠ PREFLIGHT — ⚠⚠ **BLOCKED. THIS STORY IS ⛔ NOT STARTABLE.**

⭐⭐ **THE AUTHORITY IS SETTLED AND ⛔ NOTHING IS OPEN AT THE PANEL** — `#decision-2026-09-11-214`
**Consequence 3** (*"THE PUBLIC RENDER NEEDS A NAMED HOME — same instrument, same commit, ⛔ not F's"*)
commissions this story. ⇒ the block is **ORDERING**, ⛔ not a question.

| Blocked on | For | Status (re-verified 2026-09-15) |
|---|---|---|
| ~~`11b-19`~~ | the ratified copy, in `sahyog-shared` | ✅ **`done`** — ⭐ **DISCHARGED**, see below |
| **`11b-3b`** | ⭐⭐ **TWO things, ON DIFFERENT TERMS** — the **AMOUNT** (`deliveredTotal`) and the deceased member's **NAME** | `ready-for-dev` — ⛔ **not built** |
| **the pinned clause** | `niy.public-disclosure.member-information` in `clause_versions` | ⛔ **NOT PINNED** — ⭐ re-verified, see below |

### ✅ `11b-19` IS `done` — ⭐ HALF THIS STORY'S STOP IS ALREADY DISCHARGED

⚠ **v0.2 SAID `11b-19` WAS *"`ready-for-dev` — ⛔ not built"* AT FOUR SITES. ⭐ THAT IS NOW FALSE**
(sprint row + the story's own `Status:` both read `done`). ⭐ All **eight** `message_block.*` keys ship
in **both** locales — headline `.full` / `.no_family`, solidarity, gratitude, tagline, join, and the
table's `.nominee_name` / `.district`. ⇒ **AC2's copy source EXISTS**; a missing key is ⛔ no longer
the expected state, and finding one now is a **genuine STOP**.

### ⛔⛔ THE `11b-3b` DEPENDENCY IS ⛔ NOT ONE THING — ⭐ AND THE TWO HALVES ⛔ DO NOT SEPARATE

⭐ **The AMOUNT:** `11b-3b` **AC3b** hoists **`deliveredTotal`** onto the public DTO —
`confirmedContributionCount * row.fixedAmount`, already computed inside
`packages/domain/src/pool/sahyog-vivran-read.ts` (⭐ navigate by the `deliveredTotal:` key in the
`classifyCycleOutcome({…})` argument, ⛔ not by a line number).
⚠⛔ **⛔ NOT `rosterSize` / `fixedAmount`** — the wording v0.1 carried. ⭐ Their product **IS लक्ष्य**,
which `-204` **cl.3** reserves to a `super_admin` reveal and **cl.8** closed *"BY CONSTRUCTION"*
(*"the wire carries the PERCENTAGE only, ⛔ never `rosterSize`"*). ⇒ ⛔ do ⛔ not expect those two keys.

⭐ **The NAME:** `11b-3b` supplies the **DECLARATION**; the **RENDER** waits on counsel's
`clause_versions` row for `niy.public-disclosure.member-information`.
⚠⛔ **RE-VERIFIED 2026-09-15 — the clause is still INERT: ONE repo site in the entire tree, its own
definition** (`packages/domain/src/pool/public-read.ts`) — ⛔ no migration, ⛔ no seed, ⛔ no writer,
and **OVERDUE since 2026-09-07**. ⇒ on the public wire `deceasedMemberName` is `null` for **every**
drive, ⛔ not for the drives whose families declined.

⛔⛔ **⇒ AND THAT IS WHY v0.2's SPLIT — *"the amount half is unblocked by the merge alone"* — IS
**FALSE, AND IT IS STRUCK.** ⭐ `{amount}` appears in **exactly two** strings in the whole family:
`message_block.headline.full` and `message_block.headline.no_family`. ⛔ There is ⛔ no third carrier,
and the other four paragraphs are token-free by ratified design. ⇒ rendering the amount **requires
choosing a headline variant** — and `.full` needs the name the clause gates, while `.no_family` is
forbidden by **Trap 1**. ⇒ ⭐ **the two halves arrive TOGETHER or ⛔ not at all**, and Task 0 now says so.

---

## Story

As a member of the public reading about a drive that has closed,
I want the page to say what the trust actually wants said about it — in the Panel's own words —
so that the family's drive ends on the sentence the trustees chose, instead of a bare row of figures.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed by this story.

⚠ **AND ⛔ NO NEW PUBLIC EXPOSURE EITHER — ⭐ stated because it looks like one.** Every value this
story renders is **already on the public wire or already ruled onto it**: the account-holder name is
`tier: public` under `-190` **cl.2**; `district` is already on the contract *and already rendered on
this very page*; the **deceased name** is **`11b-3b`'s** ruled exposure (`-173`/`-174`), ⛔ not this
story's. ⇒ ⭐ **this story RE-ARRANGES what is already published and adds ⛔ nothing to it.**

⭐ **One sentence, in the member's terms:** *"the page now ends with the trustees' own words about the
drive, and says nothing at all until real money has actually been contributed."* ⭐ Checked against the
Niyamavali: ⛔ no clause governs the wording of a gratitude message; the ₹0 silence half is governed by
`#decision-2026-09-13-216` **cl.1** and is implemented as an AC below.

---

## ⚠ THE SIX TRAPS

### Trap 1 — ⛔⛔ THE NO-NAME VARIANT IS ⛔ NOT A WORKAROUND FOR AN UNBUILT DEPENDENCY

⚠ `11b-19` ships a `no_family` variant for the case where a family **withheld consent** to name their
relative. ⭐ `-214` **Consequence 5** makes it **mandatory** where the name is null — ⭐ it is ⛔ not
optional, because `t()` **THROWS** on an unsupplied token and this block is **PAGE-shaped**, so
resolving `.full` without a name is a **500 on the whole page**.

⛔⛔ **⇒ AND YET: ⛔ DO ⛔ NOT REACH FOR IT BECAUSE THE CLAUSE IS UNPINNED.** ⚠ Because the clause is
inert, `deceasedMemberName` is null for **every** public drive — so a null-driven selector renders
**every** drive as though its family had **declined to be named**. ⭐ A silent falsehood, at scale,
about a bereaved family's own choice. ⚠ It would also **look correct in every test**.

⚠⛔⛔ **AND THE SHIPPED MEMBER PRECEDENT DOES EXACTLY THE FORBIDDEN THING — ⭐ THIS IS THE TRAP'S REAL
TEETH.** `apps/mobile/components/drive-detail/format.ts`'s `selectMessageBlockHeadline` maps
`deceasedMemberName === null` → `no_family`, and the fence **asserts** that mapping. ⭐ That is
**correct on the MEMBER axis**, where null genuinely means *"no publishable name"*. ⚠ It is **WRONG
on the PUBLIC axis**, where null means *"counsel has not pinned the clause yet."*
⇒ ⚠⛔ **⛔ do ⛔ not copy that selector.** ⭐ Mirror its **SHAPE** (a pure selector returning `null`),
⛔ never its null-mapping ([[project_rbac_geo_scope_containment]] — same axis-confusion class).

⇒ ⭐ **the honest posture: ship ⛔ nothing until the CLAUSE IS PINNED** — ⛔ not merely until
`11b-3b` lands. ⚠⛔ Those are ⛔ not the same date ([[feedback_mechanization_split_commitment]]).

### Trap 2 — ⛔ DO ⛔ NOT RE-DERIVE THE AMOUNT — ⭐ AND ⛔ DO ⛔ NOT CALL THE PRESENTER EITHER

⭐ `amountRaisedInr = confirmedCount × fixedAmount` is the **SHIPPED canonical definition**
(`packages/ui/src/pool-progress/presenter.ts`, Story 9.12 **Decision 3**). The contracts file states
the rule in terms: ***"Re-deriving the multiplication anywhere is D1(c), REFUSED, and a second
multiplication is the defect"*** (⭐ navigate by the `NO RUPEE FIGURE` banner comment).

⚠⛔⛔ **BUT v0.2's REMEDY WAS UNSHIPPABLE AND IS STRUCK.** `derivePoolProgressCardViewModel` — the
presenter module's **only** export — takes `{ pool, confirmedCount, rosterSize, fixedAmount,
daysRemaining }`. ⇒ **consuming it REQUIRES `rosterSize` and `fixedAmount`**, the two keys `-204` cl.8
forbids on this wire and **Trap 3** forbids adding. ⚠⛔ **AC5 ordered the ONE thing its own Preflight
banned.**
⇒ ⭐ **THE CORRECT INSTRUMENT: render `deliveredTotal` as `11b-3b` delivers it.** The multiplication
already happened **server-side, once, inside the domain read**. ⭐ This story performs ⛔ no
multiplication and ⛔ calls ⛔ no presenter ([[project_amount_raised_canonical_producer]] — the
canonical-producer rule is **satisfied**, ⛔ not bypassed).

### Trap 3 — ⚠⛔ DO ⛔ NOT PRE-ADD THE WIRE FIELDS "TO BE READY"

⭐ The contract says it in terms: *"⛔ **Do not pre-add them**: a field with ⛔ no render is the
**vacuous-leg defect wearing a forward-compatibility costume**"* (⭐ navigate by that phrase).
⇒ ⭐ **neither `fixedAmount` nor `rosterSize` EVER arrives** — `11b-3b` v2.0 hoists `deliveredTotal`
precisely so they do ⛔ not (`-204` cl.8). ⛔ Do ⛔ not add them here either.

### Trap 4 — ⚠⚠ THE PAGE **ALREADY RENDERS** BOTH OF THE TABLE'S VALUES, UNDER TWO CONTRADICTORY RULES

⚠⛔ **v0.2 SAID *"the page MAY already render"* AND DEFERRED IT. ⭐ RESOLVED 2026-09-15 — IT DOES, AND
THE COLLISION IS ⛔ NOT MERE DUPLICATION.** `apps/public/src/pages/sahyog-vivran/[driveToken].astro`
today renders **both** values, and **each one contradicts a clause of this story**:

| Value | What the page ships today | What the ratified table orders | ⚠ The collision |
|---|---|---|---|
| **District** | `model.district ?? labels.districtUnknown` ⇒ renders **"Not recorded"** when absent | **AC4** — an absent district **DROPS ITS COLUMN**, ⛔ never *"Not recorded"* | ⛔ **two opposite absent-value rules for one value on one page** |
| **Holder name** | label **"Nominee Name"** — ⭐ Trustee-ratified, `-190` **cl.2**, which **forbids** *"Account holder"* | label **"Nominee full name"** — ⭐ Trustee-ratified, §8.1, shipped by `11b-19` | ⛔ **two ratified labels for one value on one page** |

⇒ ⚠⛔ **Task 2 is therefore a GOVERNANCE question, ⛔ not a layout choice**, and ⛔ neither ratified
label may be overwritten by the other ([[feedback_supersede_never_reinterpret]]). ⭐ If the two cannot
be reconciled without editing ratified text, **STOP and route it** — ⛔ do ⛔ not pick one at a render
site.

### Trap 5 — ⚠ THE COLUMN SAYS *"Nominee"*, THE SCHEMA DENIES IT, AND HERE IT IS **BULK-HARVESTABLE**

⭐ The value is `account_holder_name_ciphertext` — the **disbursement account holder**.
`deferred-work.md` item **(b) `D5-subject` (i)** states ***"the SCHEMA is the authority"*** and calls
that **this item's ruling**; ⚠ the **item itself is OPEN** (*"NON-BLOCKING after `D5(a)`, ⛔ NOT
resolved by it"*) — ⭐ cite it as the item's ruling, ⛔ never as a decision entry
([[feedback_closure_language_precision]]).
⚠⛔ **AND THIS SURFACE IS PUBLIC AND UNAUTHENTICATED.** §9.4 raised exactly that (*"the index is
bulk-harvestable"*) and the Panel was **shown it and accepted it** (§10.2 ruling 2) ⇒ the exposure is
**ruled**, ⛔ not open.
⇒ ⭐ render a **LABEL**. ⛔ Do ⛔ **not** render the sentence *"is the nominee of"* — ⭐ that claim is
§9.3's finding and `D5-subject` **(ii)**'s commissioned work, ⛔ not an assumption to encode here.

### Trap 6 — ⭐⭐ THE BLOCK IS SILENT ON A ₹0 DRIVE, AND THE CHECK ORDER IS LOAD-BEARING

⚠⛔ **RULED AFTER v0.2 WAS WRITTEN, AND IT NAMES THIS STORY.** `#decision-2026-09-13-216` **cl.1**
(Trustee-ratified, Dhiraj Rahul + Kalpana Bharti) extends `-207` cl.2's ₹0-silence **to the message
block, on EVERY stage** — `live` zero-day included. Its **Consequence 2** says this story *"inherits
this ruling **by name** rather than by re-deriving the same argument."*
⭐ **GROUND:** the ratified copy is written in the **completed past tense**. On a zero-contribution
drive it reads as a family having *"received contributions of ₹0"* and thanks colleagues who have ⛔ not
yet given — ⭐ a **false statement on a disclosure-purposed page**, ⛔ not merely an early one.
⇒ ⭐ **the ENTIRE block stays absent** — headline, solidarity, gratitude, tagline, join **and the
nominee/district table** — until the first confirmed contribution lands.

⚠⛔⛔ **AND THE ORDER OF THE TWO CHECKS IS ITSELF THE RULE.** The ₹0 test must run **BEFORE** the
name-variant test. ⭐ If they are swapped, a ₹0 drive with no publishable name resolves the `no_family`
**headline** instead of returning `null` ⇒ the block renders where `-216` cl.1 says it must render
**NOTHING** — and ⚠ a presence-only assertion still passes. ⭐ The shipped member fence already pins
this ordering with an index comparison; ⛔ do ⛔ not ship a presence-only check.

⚠ ⛔ There is ⛔ **NO** `no_amount` variant and there must ⛔ not be one (`-216` rejected option B).

---

## Acceptance Criteria

### AC0 — Governance first
⭐ The `epics.md` entry and the sprint row land in **one `governance:` commit**, **before** any render
([[feedback_governance_commits_precede_implementation]]). ⭐ Authority is `-214` **Consequence 3**.
⚠ **VERIFIED 2026-09-15: `epics.md` has ⛔ NO `Story 11b.20` section** — the obligation is genuine, and
the `11b-19` / `11b-17` `SECTIONED` annotations are the precedent to follow.
**And** ⭐ it does ⛔ not proceed while **`11b-3b`** is unbuilt **or** the clause is unpinned.
(⛔ `11b-19` is ⛔ no longer a condition — it is `done`.)

### AC1 — The block renders on the PUBLIC per-drive page
⭐ `apps/public/src/pages/sahyog-vivran/[driveToken].astro` — the surface §8.3(2) names (*"It is
written for a **PAGE**, and the page exists"*). ⛔ Not the index; ⛔ not a table cell — ⚠ the index
keeps its own **one-line** wording (`index_line.*`, ✅ already shipped and already rendered by
`sahyog.astro`).

### AC2 — Every string comes from `sahyog-shared` BY NAME
⛔ ⛔ No copy is authored, derived or translated here (`-193` cl.3, `-206` cl.1). ⭐ All eight
`message_block.*` keys exist in both locales today ⇒ ⚠ a missing key is now a **genuine STOP**, ⛔ never
a licence ([[feedback_story_validate_footguns]] #8).
**And** ⚠⛔ **every key is a BARE LITERAL or a simple `` `message_block.headline.${variant}` ``
template** — ⛔ **never** built by string concatenation. ⭐ This discharges the `deferred-work.md` item
whose **Trigger** is *"the first `11b-17`/`11b-20` render site landing"*: the fence's `RESOLVER` regex
⛔ cannot see a concatenated key, so a concatenated key would ship **invisibly past AC7**.

### AC3 — The `Nominee full name` | `District` table
⭐ Per §8.1: two columns, **above** the message. ⚠ Per **Trap 4**, its relationship to what the page
**already renders** is **ruled in Task 2 and written down**, ⛔ not improvised — ⭐ including which of
the **two Trustee-ratified labels** survives, and by whose authority.
⚠ Per **Trap 5** it is a **label**, ⛔ not a claim.

### AC4 — Absent tokens DROP their clause
⭐ §10.2 ruling 3 and `-214` **Consequence 6**. ⚠ `district` is `.nullable()` ⇒ its column is
**DROPPED**, ⛔ never *"Not recorded"*. ⚠⛔ **This CONTRADICTS the page's shipped
`?? districtUnknown` behaviour — ⭐ that is Task 2's subject, ⛔ not a defect to patch silently.**
**And** ⚠ the district clause follows the **DECEASED**, ⛔ not the nominee — ⭐ `11b-19`'s own
`no_family` variant already encodes that coupling, and the fence asserts it.
**And** ⭐ this AC carries the **drop-when-absent assertion** that `deferred-work.md`'s *"AC4's
district-drop behavior is asserted only vacuously"* item routes to the **first real render site**.

### AC5 — The amount is RENDERED, ⛔ never re-derived
⭐ Per **Trap 2**: render **`deliveredTotal`** exactly as `11b-3b` AC3b delivers it on the DTO.
⛔ ⛔ No multiplication at a render site, in a route handler, or *"just for this block"*.
⚠⛔ **And ⛔ do ⛔ NOT call `derivePoolProgressCardViewModel`** — it requires `rosterSize` +
`fixedAmount`, which `-204` cl.8 forbids on this wire.
**And** a test asserts that **⛔ no second multiplication** is introduced anywhere in `apps/public`.

### AC6 — The no-name variant is used for CONSENT, and ⛔ nothing else
⭐ Per **Trap 1**. **And** a test proves a drive **with** a name renders the **full** headline — ⭐ the
assertion that would have caught the workaround.
**And** ⚠ a test proves the selector's null-mapping is ⛔ **NOT** the member selector's: on this
surface a null name **returns `null`** (render nothing) while the clause is unpinned; it does ⛔ not
fall through to `no_family`.

### AC7 — The block is SILENT on a zero-amount drive, and the ₹0 check runs FIRST
⭐ Per **Trap 6** — `#decision-2026-09-13-216` **cl.1**, inherited **by name** via its Consequence 2.
⭐ The whole block — headline, solidarity, gratitude, tagline, join **and the table** — renders
**nothing** while the amount is ≤ 0, on **every** stage.
**And** ⚠ a test pins the **ORDER**: the ₹0 decision precedes the name-variant decision. ⚠ A
presence-only assertion on each branch does ⛔ not discharge this — ⭐ assert the order itself.

### AC8 — ⛔ Nothing else moves, and the FENCE is NARROWED, ⛔ never appended to
⛔ No member surface · ⛔ no new wire field · ⛔ no contract widening · ⛔ no index change · ⛔ no
masking behaviour · ⛔ no new exposure (see **Policy meaning**).
**And** ⭐ this AC is discharged by **narrowing `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`**
— ⛔ not by prose assertion. ⚠⛔ **That fence WILL turn red the moment this story renders**: its
`AUTHORISED` list names the member render site only, and its assertion message says in terms that
*"the PUBLIC half is 11b-20 … its site is ⛔ not pre-authorised here."*
⇒ ⭐ **The remedy is written INSIDE the fence and is ⛔ not negotiable:** *"⛔ Do ⛔ NOT delete it then —
**NARROW it**"*, and ⛔ **do ⛔ not append to `AUTHORISED` to make a build green.** ⭐ Add this story's
render site **with its authority named** and **with a guard assertion** proving the selector returns
early — exactly the shape `11b-17` used ([[feedback_gate_scope_semantic_coverage]]).

---

## Tasks / Subtasks

- [ ] ⛔⛔ **Task 0 — THE PREFLIGHT GATE** (AC0). ⛔ Do ⛔ not start until **`11b-3b`** is `done` **and merged**
      **AND** counsel's `clause_versions` row for `niy.public-disclosure.member-information` is
      **PINNED**. ⚠⛔ **⛔ NOT two separate gates — ⭐ the amount ⛔ cannot ship without the name**, because
      `{amount}` lives **only** in the two headline variants (see Preflight). ⚠ Re-read the Traps at that
      point — ⭐ `11b-3b` will have changed this page. ⛔ `11b-19` is ⛔ no longer a condition (`done`).
- [ ] **Task 1 — GOVERNANCE** (AC0) — ⭐ add an `epics.md` section under Epic 11b naming `-214`
      Consequence 3 (⭐ follow the `11b-19` `SECTIONED` precedent); add the sprint row.
      ⭐ **ONE `governance:` commit**, and it lands **BEFORE any code**.
- [ ] **Task 2 — ⭐ RULE THE TABLE'S RELATIONSHIP TO THE PAGE** (AC3, AC4, Trap 4) — ⛔ **before**
      rendering: open the page as `11b-3b` leaves it and rule **in writing** (a) whether the ratified
      table **replaces** or **sits above** the shipped District/Nominee-Name presentation, and (b)
      which of the **two Trustee-ratified labels** survives. ⚠⛔ ⛔ Neither may be overwritten by the
      other; if they ⛔ cannot be reconciled, **STOP and route it to the Panel**.
- [ ] **Task 3 — The selector** (AC6, AC7) — ⭐ a **pure, testable** selector in a plain `.ts` module
      (the shipped idiom — the `.tsx`/`.astro` ⛔ cannot be imported by a test).
      ⭐ Order, and it is load-bearing: **(1)** amount ≤ 0 ⇒ `return null`; **(2)** name absent ⇒
      `return null` **while the clause is unpinned** (⛔ **NOT** `no_family` — Trap 1); **(3)** otherwise
      the `.full` headline.
- [ ] **Task 4 — The render** (AC1, AC2, AC3, AC4, AC5) — consume `sahyog-shared` **by bare-literal
      key**; render `deliveredTotal`; omit-the-clause per ruling 3; ⛔ **⛔ NO multiplication and ⛔ NO
      presenter call.**
- [ ] **Task 5 — Tests** (AC4, AC5, AC6, AC7, AC8)
  - [ ] ⭐ **The named-drive headline test** (AC6) — ⚠ the one that catches Trap 1.
  - [ ] ⭐ **The null-name test** (AC6) — proves this surface returns `null`, ⛔ not `no_family`.
  - [ ] ⭐ **The ₹0 silence test AND the ORDER test** (AC7) — ⛔ presence alone is ⛔ not enough.
  - [ ] ⭐ **Omit-the-clause**: a null `district` **drops the column** (AC4).
  - [ ] ⭐ **No-second-multiplication** scan over `apps/public` (AC5).
  - [ ] ⭐ **NARROW the dark-copy fence** (AC8) — ⛔ never append blindly.
- [ ] **Task 6 — Route what this story does ⛔ not close** (AC8) — ⭐ record that
      `deferred-work.md`'s **Q1** (*"does a SUSPENDED member see unmasked coordinates"*) names `11b-20`
      as a trigger but ⛔ **does ⛔ not bite here**: ⭐ this is an **unauthenticated** page inheriting
      ⛔ no session guard, and `-190` cl.1 / `-191` cl.1 withdrew every nominee-bank coordinate from
      public — ⭐ only the NAME survives (`-205` cl.9). ⛔ Record it; ⛔ do ⛔ not re-raise it.

## Dev Notes

### ⭐ Why this story is blocked rather than small

⚠ On paper this is *"render five paragraphs and a two-column table."* ⛔ It is not, because **both of
the headline's tokens are missing from this wire by design** — the deceased name (`-173`/`-174`,
`11b-3b`) and the amount (`11b-3b` AC3b). ⭐ Neither absence is an oversight; both are **ruled**, and
both lift in the **same** story — ⚠ but the NAME needs a **second** event (the pinned clause) that
`11b-3b` merging ⛔ does ⛔ not supply.

⭐⭐ **THE INTERIM ASYMMETRY IS EXPECTED AND IS ⛔ NOT A DEFECT TO FILE** — the contracts file says so
in terms: until `11b-3b` merges, this page shows a **COUNT** while the member app shows an **AMOUNT**
for the same pool. ⚠ That is **ORDERING**, ⛔ not a ruling, and ⛔ not a second instance of the D7
inversion. ⛔ Do ⛔ not "fix" it here.
⚠⛔ **And ⛔ do ⛔ not write any present-tense form of *"the member app shows less than the public
page"*** — `-209` **cl.3** ruled that class **false for every drive** and forbade paraphrase. ⭐ A
**conditional** statement is permitted (`-209` cl.4); a present-tense one is ⛔ not.

### ⚠ What `-214` still leaves open after this story

⭐ **Nothing of `-214`.** ⇒ `11b-19` (Consequence 2, `done`) + `11b-17` AC10 (cl.4(b), `done`) + this
story (Consequence 3) close the 2026-09-05 ratification **end to end**.
⚠⛔ **But `-214` is ⛔ no longer the only instrument on this block** — `#decision-2026-09-13-216`
**cl.1** was ratified afterwards and routes to this story **by name** (AC7).
⚠ `11b-15`'s omission stays **recorded against `11b-15`** and is ⛔ never back-filled
([[feedback_record_unattested_no_backfill]]).

### References

⭐ **Addressed by clause / item / declaration — ⛔ NOT by line number.** `.decision-log.md`,
`deferred-work.md` and `sprint-status.yaml` are **newest-first**: one prepended entry rots every
numeric pointer at once, silently. ⛔ Do ⛔ not reintroduce `file:NNN` cites into those three files.

- ⭐ `.decision-log.md#decision-2026-09-11-214` — **Consequence 3** (the commissioning authority),
  **Consequence 5** (the no-name variant is mandatory), **Consequence 6** (district drops its column)
- ⭐⭐ `.decision-log.md#decision-2026-09-13-216` **cl.1** — ⚠ **POST-DATES v0.2 AND NAMES THIS STORY**
  (Consequence 2): the ₹0 silence, every stage. ⭐ Its routing note is
  `trustee-panel-routing-note-2026-09-13-11b17-message-block-zero-day-scope.md` (§5 option A, §6)
- ⭐ `…/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` **§8.1**,
  **§8.3(2)**, **§9.1 row 4**, **§9.3**, **§9.4**, **§10.2 ruling 2 + ruling 3**
- ⭐ `packages/contracts/src/public-pages/sahyog-vivran.ts` — navigate by banner comment: *"WHAT THIS
  SHAPE DELIBERATELY DOES NOT CARRY"* (⛔ no deceased name) · *"NO RUPEE FIGURE"* (⭐ incl. the D1(c)
  refusal and the *"11b.3b will need `rosterSize` and `fixedAmount`"* line `11b-3b` v2.0 **AMENDS**) ·
  *"AND NO TARGET, EXPECTED TOTAL…"* (⭐ the fence that **STANDS**) · the `district:` field declaration
- ⭐ `packages/domain/src/pool/sahyog-vivran-read.ts` — the `deliveredTotal:` key inside the
  `classifyCycleOutcome({…})` argument (the amount `11b-3b` delivers) · the
  `accountHolderNameCiphertext` and `confirmedContributionCount` / `district` field declarations
- ⚠⛔ `packages/ui/src/pool-progress/presenter.ts` — ⭐ the ONE multiplication (9.12 D3). ⛔ **Read for
  the RULE, ⛔ never CALLED here** — `derivePoolProgressCardViewModel` requires `rosterSize` +
  `fixedAmount` (Trap 2)
- ⭐⭐ `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` — ⚠⛔ **THE FENCE THIS STORY TURNS RED**
  (AC8), ⭐ and the **MODEL** for its own narrowing
- ⭐ `apps/mobile/components/drive-detail/format.ts` (`selectMessageBlockHeadline`) +
  `MemberDriveDetail.tsx` — ⚠ the member half: ⭐ mirror the **SHAPE**, ⛔ **never the null-mapping**
- ⭐ `apps/public/src/pages/sahyog-vivran/[driveToken].astro` — ⚠⛔ **already renders BOTH table values**
  (Trap 4): `district ?? districtUnknown`, and the `-190` cl.2 label *"Nominee Name"*
- ⚠ `_bmad-output/implementation-artifacts/11b-3b-…md` — ⛔ **the blocking dependency, for BOTH tokens**
  (AC3b = `deliveredTotal`)
- ✅ `_bmad-output/implementation-artifacts/11b-19-…md` — **`done`**; the copy source
- ⚠ `deferred-work.md` item **(b) `D5-subject` (i)** / **(ii)** — Trap 5 (⚠ the item is **OPEN**);
  and the three items whose **Trigger** names `11b-20`: the concatenated-key gap (AC2), the
  vacuous district-drop assertion (AC4), and **Q1**'s session guard (Task 6 — ⛔ does ⛔ not bite)
- `.decision-log.md#decision-2026-09-04-190` cl.1/cl.2 · `#decision-2026-09-02-173` / `-174` ·
  `#decision-2026-09-04-193` cl.3 · `#decision-2026-09-07-206` cl.1 · `#decision-2026-09-07-205` cl.9 ·
  `#decision-2026-09-07-204` cl.3/cl.8 · `#decision-2026-09-08-207` cl.2 · `#decision-2026-09-09-209` cl.3/cl.4

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-15 | 0.3 | ⭐⭐ **FIRST `validate` PASS — REWRITTEN AGAINST HEAD. ⛔ NO CODE.** ⭐ Baseline **RE-PINNED** `738bb3ea` → `7d12a4ce` (⛔ not an ancestor of HEAD; twin tree **byte-identical** ⇒ content baseline sound, SHA orphaned — ⚠ exactly the failure `deferred-work.md` predicted for this story **by name**). ⚠⛔ **42 files moved under `packages`/`apps` since the pin; ⛔ no claim had ever been re-derived.** ⛔⛔ **BLOCKING, in the order they would have bitten:** **(1)** ⭐⭐ **`#decision-2026-09-13-216` cl.1 is Trustee-ratified, post-dates v0.2, and names this story in its Consequence 2** — the block renders **NOTHING** on a ₹0 drive on **every** stage, and the ₹0 check must run **BEFORE** the name check or a ₹0 unconsented drive renders the block `-216` silences ⇒ **new Trap 6 + new AC7**; v0.2 mentioned it **nowhere**. **(2)** ⛔ **AC5/Task 4 were UNSHIPPABLE UNDER THIS STORY'S OWN PREFLIGHT** — `derivePoolProgressCardViewModel` is the presenter's only export and requires `rosterSize` + `fixedAmount`, the two keys `-204` cl.8 forbids and Trap 3 bans ⇒ the amount is **`deliveredTotal`, RENDERED**, ⛔ never re-derived, ⛔ never via the presenter. **(3)** ⛔ **`11b-19` IS `done`** — v0.2 called it *"`ready-for-dev` — ⛔ not built"* at **four** sites (table, AC0, AC2, Task 0); all eight `message_block.*` keys ship in **both** locales ⇒ a missing key is now a **genuine STOP**. **(4)** ⛔ **THE *"amount half is unblocked by the merge alone"* SPLIT IS FALSE** — `{amount}` lives in **exactly two** strings, both headline variants; `.full` needs the clause-gated name and `.no_family` is Trap 1 ⇒ **the halves ⛔ do ⛔ not separate**. **(5)** ⭐⭐ **THE SHIPPED MEMBER SELECTOR DOES THE FORBIDDEN THING** — `selectMessageBlockHeadline` maps `deceasedMemberName === null` → `no_family`, correct on the MEMBER axis and ⛔ **wrong on the PUBLIC axis** where null means *"clause unpinned"* ⇒ Trap 1 now names it; mirror the SHAPE, ⛔ never the mapping. **(6)** ⚠⛔ **THE FENCE `sahyog-shared-dark-copy.test.ts` WAS NAMED ⛔ NOWHERE** — its `AUTHORISED` list excludes `11b-20` in terms, its `RESOLVER` regex is hardened against dynamic keys, and its remedy is written inside (***NARROW it***, ⛔ never append) ⇒ **AC8**. **(7)** ⛔ **TRAP 4 RESOLVED, ⛔ not deferred** — the page **already** renders District as *"Not recorded"* (⚠ which **AC4 forbids**) and **already** carries the ratified label *"Nominee Name"* (`-190` cl.2) against the table's *"Nominee full name"* ⇒ ⛔ **two ratified labels and two opposite absent-value rules on one page**; Task 2 is a **governance** question. **(8)** ⭐ **THREE `deferred-work.md` ITEMS TRIGGER ON THIS STORY BY NAME** and were carried ⛔ nowhere — the concatenated-key gap the fence ⛔ cannot see (**AC2**), the vacuous district-drop assertion (**AC4**), and **Q1**'s session guard (**Task 6** — ⭐ traced: it ⛔ does ⛔ not bite on an unauthenticated page). ⚠ Also: **four stale cites struck** (domain `:344`/`:383`, contract `:344`, Trap 2's `:50-51`) and **every numeric pointer into a newest-first file REMOVED** rather than re-derived; **glyph register DECLARED** after v0.2 inverted its own Preflight headline (*"⛔ THE AUTHORITY IS SETTLED"*) and its own commit rule (*"⛔ one `governance:` commit"*); `D5-subject` re-stated as an **OPEN item's ruling**, ⛔ not a decision entry; `-209` cl.3's retired sentence fenced. ⭐ **RE-VERIFIED AND SOUND:** the clause is still **INERT** (⭐ ONE repo site, its own definition) · `-214` Consequence 3 · ⛔ **no `epics.md` section** (AC0 genuine) · ⛔ **no duplicate rival story**. ⛔ **Rows unchanged — still `ready-for-dev`, still BLOCKED.** | BigDev + Claude |
| 2026-09-11 | 0.2 | ⚠⛔ **THE `11b-3b` DEPENDENCY WAS MIS-STATED IN 0.1 AND IS CORRECTED — ⛔ the obligation is UNCHANGED.** ⭐ Found by `11b-3b`'s own v2.0 `validate` pass. **(1)** 0.1 said `11b-3b` supplies *"`fixedAmount` / `rosterSize`"*. ⛔ It does ⛔ **not**, and must ⛔ not: their product **IS लक्ष्य**, which `-204` **cl.3** reserves to a `super_admin` reveal and **cl.8** closed *"BY CONSTRUCTION"*. ⭐ `11b-3b` v2.0 hoists **`deliveredTotal`** instead. **(2)** ⛔⛔ **0.1 treated *"`11b-3b` merges"* as the condition supplying the NAME. It is not.** ⭐ `11b-3b` supplies the **DECLARATION**; the **RENDER** waits on counsel's `clause_versions` row — ⛔ ONE repo site, **OVERDUE since 2026-09-07**. ⇒ ⚠ clearing this Preflight on the merge alone walks straight into **Trap 1**. ⛔ **NO CODE.** ⚠ *(v0.3 note: this row's conclusions all STAND; ⛔ what it got wrong was treating the two halves as separable.)* | BigDev + Claude |
| 2026-09-11 | 0.1 | ⭐ Created from `#decision-2026-09-11-214` **Consequence 3** — the last unhomed half of the 2026-09-05 ratification. ⛔ **ZERO OPEN DECISIONS**; ⛔ **BLOCKED**, ⛔ not open. ⭐⭐ **THE FINDING THAT SHAPED IT: the `11b-3b` dependency is ⛔ NOT just the deceased NAME — it is ALSO the AMOUNT.** ⭐⭐ **FIVE TRAPS:** (1) the `no_family` variant is ⛔ NOT a workaround for the unbuilt dependency; (2) ⛔ no second multiplication; (3) ⛔ do ⛔ not pre-add `fixedAmount`/`rosterSize`; (4) the page may ALREADY render the table's two values; (5) the *"Nominee"* column over `account_holder_name_ciphertext` on a **public, bulk-harvestable** surface. ⛔ **NO CODE.** ⚠ *(v0.3 note: Trap 4's "may" is ⛔ now RESOLVED — it does; and a SIXTH trap was ratified two days later.)* | BigDev + Claude |
