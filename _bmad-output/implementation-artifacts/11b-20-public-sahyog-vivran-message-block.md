---
baseline_commit: 738bb3ea
---

<!--
⭐ BASELINE — `story(11b.19): B's unshipped half — the ratified message block gets a copy source`.
⭐ Minted 2026-09-11 from `#decision-2026-09-11-214` **Consequence 3**, the last unhomed half of the
2026-09-05 ratification.
⚠⛔ **KEY `11b-18` IS SKIPPED** for the reason recorded in `11b-19` — the ledger names it, ⛔ but it is
⛔ absent from `development_status` and has ⛔ no file.
-->

# Story 11b.20: The Ratified Message Block on the PUBLIC Sahyog Vivran Page `[SURFACE]`

Status: ready-for-dev

## ⛔ PREFLIGHT — ⛔⛔ **BLOCKED. ⛔ THIS STORY IS ⛔ NOT STARTABLE.**

⭐⭐ **⛔ NOTHING IS OPEN AT THE PANEL. ⛔ THE AUTHORITY IS SETTLED** — `#decision-2026-09-11-214`
(Trustee-ratified DR + KB, 2026-09-05) rules this copy onto ***"both the member and the public
view."*** ⇒ ⛔ **the block is ORDERING, ⛔ not a question.**

| ⛔ Blocked on | For | Status |
|---|---|---|
| **`11b-19`** | the ratified copy, in `sahyog-shared` | `ready-for-dev` — ⛔ not built |
| **`11b-3b`** | ⭐⭐ **TWO things, ⛔ ON DIFFERENT TERMS** — the **AMOUNT** (unconditional) and the **deceased member's NAME** (⛔ conditional, see below) | `ready-for-dev` — ⛔ not built |

⚠⛔ **⛔ THE `11b-3b` DEPENDENCY IS ⛔ NOT ONE THING, AND THAT IS THE POINT.** ⭐ Most readers will
assume it is only the name. Both of the headline's two tokens are `11b-3b`'s.

⛔⛔ **AND THEY DO ⛔ NOT ARRIVE ON THE SAME TERMS — ⚠ CORRECTED 2026-09-11 by `11b-3b`'s v2.0 pass.**
⭐ **The AMOUNT is UNCONDITIONAL:** `11b-3b` AC3b hoists **`deliveredTotal`**
(`sahyog-vivran-read.ts:509`, already computed server-side) onto the DTO. ⚠⛔ **⛔ NOT `rosterSize` /
`fixedAmount`** — the wording this Preflight carried until 2026-09-11. ⭐ Their product **IS लक्ष्य**,
which `-204` **cl.3** reserves to a `super_admin` reveal and **cl.8** closed *"BY CONSTRUCTION"*
(*"the wire carries the PERCENTAGE only, ⛔ never `rosterSize`"*). ⇒ ⛔ **do ⛔ not expect those two
keys, and ⛔ do ⛔ not ask for them.**
⛔⛔ **The NAME is CONDITIONAL, and `11b-3b` MERGING IS ⛔ NOT THE GATE.** ⭐ `11b-3b` supplies the
**DECLARATION**; the **RENDER** waits on counsel's `clause_versions` row for
`niy.public-disclosure.member-information` — ⭐ re-verified 2026-09-11: **ONE repo site, its own
definition**, ⛔ no migration, ⛔ no seed, ⛔ no writer, and **OVERDUE since 2026-09-07**.
⇒ ⚠⛔ **THE REAL GATE FOR THIS STORY'S HEADLINE IS THE PINNED CLAUSE**, ⛔ not a merge
([[feedback_mechanization_split_commitment]]). ⛔ Clearing the Preflight on `11b-3b`'s merge alone
walks straight into **Trap 1** below.

## Story

As a member of the public reading about a drive that has closed,
I want the page to say what the trust actually wants said about it — in the Panel's own words —
so that the family's drive ends on the sentence the trustees chose, instead of a bare row of figures.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed.

⚠ **AND ⛔ NO NEW PUBLIC EXPOSURE EITHER — ⭐ stated because it looks like one.** Every value this
story renders is **already on the public wire or already ruled onto it**: `accountHolderName` is
`tier: public` under `-190` cl.2; `district` is on the wire (`sahyog-vivran.ts:344`); the **deceased
name** is **`11b-3b`'s** ruled exposure (`-173`/`-174`), ⛔ not this story's. ⇒ ⭐ **this story
RE-ARRANGES what is already published and adds ⛔ nothing to it.**

## ⛔ THE FIVE TRAPS

### Trap 1 — ⛔⛔ THE NO-NAME VARIANT IS ⛔ NOT A WORKAROUND FOR AN UNBUILT DEPENDENCY

⚠ `11b-19` ships a `no_family` variant for the case where a family **withheld consent** to name their
relative. ⭐ It exists for **that** reason and ⛔ no other.

⛔⛔ **⇒ ⛔ DO ⛔ NOT REACH FOR IT BECAUSE `11b-3b` HAS ⛔ NOT SHIPPED THE NAME YET.** ⚠ Doing so renders
**every public drive** as though its family had **declined to be named** — ⭐ a silent falsehood, at
scale, about a bereaved family's own choice. ⚠⛔ It would also **look correct in every test** and
⛔ nothing would flag it.

⇒ ⭐ **the honest posture is to ⛔ not ship the NAME until the CLAUSE IS PINNED** — ⛔ not merely until
`11b-3b` lands. ⚠⛔ **Those are ⛔ not the same date**, and the Preflight says so.

### Trap 2 — ⛔ DO ⛔ NOT RE-DERIVE THE AMOUNT. ⭐ IT IS **ONE** MULTIPLICATION, AND ⛔ NOT YOURS

⭐ `amountRaisedInr = confirmedCount × fixedAmount` is the **SHIPPED canonical definition**
(`packages/ui/src/pool-progress/presenter.ts`, Story 9.12 **Decision 3**).
⚠⛔ `sahyog-vivran.ts:50-51`: ***"Re-deriving the multiplication anywhere is D1(c), REFUSED, and a
second multiplication is the defect."***
⇒ ⭐ **consume the presenter**; ⛔ never multiply at a render site, ⛔ never in a route handler, ⛔ never
"just for this block" ([[project_amount_raised_canonical_producer]]).

### Trap 3 — ⚠⛔ ⛔ DO ⛔ NOT PRE-ADD THE WIRE FIELDS "TO BE READY"

⭐ `sahyog-vivran.ts:56-58`, in terms: *"⛔ **Do not pre-add them**: a field with ⛔ no render is the
**vacuous-leg defect wearing a forward-compatibility costume**."*
⇒ ⭐ ⛔ **neither `fixedAmount` nor `rosterSize` EVER arrives** — `11b-3b` v2.0 hoists `deliveredTotal`
instead, precisely so they do not (`-204` cl.8). ⛔ Do ⛔ not add them here either.

### Trap 4 — ⚠ THE PAGE MAY ⛔ ALREADY RENDER THE TABLE'S TWO VALUES

⭐ §8.3(2) notes the drive page *"is **also where the nominee name and district already are**."*
⇒ ⚠⛔ **the ratified table is a PRESENTATION, ⛔ not new data** — and adding it blindly can produce the
**same two values twice on one page**.
⇒ ⭐ **Task 2 opens the page first** and rules, in writing, whether the table **replaces** the existing
presentation or **sits above** it. ⛔ Do ⛔ not decide that at a render site by eye.

### Trap 5 — ⚠⛔ THE COLUMN SAYS *"Nominee"*, THE SCHEMA DENIES IT, AND HERE IT IS **BULK-HARVESTABLE**

⭐ The value is `account_holder_name_ciphertext` — the **disbursement account holder**. `deferred-work.md`
**`D5-subject (i)`**: ***"the SCHEMA is the authority."***
⚠⛔ **AND THIS SURFACE IS PUBLIC AND UNAUTHENTICATED.** §9.4 raised exactly that (*"the index is
bulk-harvestable"*) and the Panel was **shown it and accepted it** (§10.2 ruling 2) ⇒ ⛔ the exposure is
**ruled**, ⛔ not open.
⇒ ⭐ render a **LABEL**. ⛔ Do ⛔ **not** render the sentence *"is the nominee of"* — ⭐ that claim is
§9.3's finding and `D5-subject (ii)`'s **commissioned** work, ⛔ not an assumption to encode here.

---

## Acceptance Criteria

### AC0 — Governance first
⭐ The `epics.md` entry and the sprint row land in a **`governance:` commit** before any render
([[feedback_governance_commits_precede_implementation]]). ⭐ Authority is `-214` Consequence 3.
**And** ⛔ it does ⛔ not proceed while **`11b-19`** or **`11b-3b`** is unbuilt.

### AC1 — The block renders on the PUBLIC per-drive page
⭐ `/sahyog-vivran/{token}` — the surface §8.3(2) names (*"It is written for a **PAGE**, and the page
exists"*). ⛔ Not the index; ⛔ not a table cell — ⚠ the index keeps its own **one-line** wording
(`index_line.*`, ✅ already shipped by B).

### AC2 — Every string comes from `sahyog-shared` BY NAME
⛔ ⛔ No copy is authored, derived or translated here (`-193` cl.3, `-206` cl.1). ⚠ If a key is missing
that is a **STOP**, ⛔ never a licence ([[feedback_story_validate_footguns]] #8).

### AC3 — The `Nominee full name` | `District` table
⭐ Per §8.1: two columns, **above** the message. ⚠ Per **Trap 4**, its relationship to what the page
already renders is **ruled in Task 2 and written down**, ⛔ not improvised.
⚠ Per **Trap 5** it is a **label**, ⛔ not a claim.

### AC4 — Absent tokens DROP their clause
⭐ §10.2 ruling 3. ⚠ `district` is `.nullable()` ⇒ ⛔ its column is **dropped**, ⛔ never *"Not
recorded"*. ⚠ And the district clause follows the **DECEASED**, ⛔ not the nominee — ⭐ B's own
`no_family` variant already encodes that reasoning.

### AC5 — The amount comes from the canonical presenter
⭐ Per **Trap 2** — ⛔ one multiplication, ⛔ not ours. **And** a test asserts ⛔ **no second
multiplication** is introduced anywhere in `apps/public`.

### AC6 — ⛔ The no-name variant is used for CONSENT, and ⛔ nothing else
⭐ Per **Trap 1**. **And** a test proves a drive **with** a name renders the **full** headline — ⭐ the
assertion that would have caught the workaround.

### AC7 — ⛔ Nothing else moves
⛔ No member surface · ⛔ no new wire field · ⛔ no contract widening · ⛔ no index change · ⛔ no
masking behaviour · ⛔ no new exposure (see **Policy meaning**).
**And** ⭐ AC7 is discharged by a **fence test**, ⛔ not by assertion.

---

## Tasks / Subtasks

- [ ] ⛔⛔ **Task 0 — THE PREFLIGHT GATE.** ⛔ Do ⛔ not start until **`11b-19`** AND **`11b-3b`** are
      `done` **and merged** — ⚠⛔ **AND, for the NAME half only, until counsel's `clause_versions` row
      is PINNED.** ⭐ The amount half is unblocked by the merge alone. ⚠ Re-read this story's Traps at
      that point — ⭐ `11b-3b` will have changed this page.
- [ ] **Task 1 — GOVERNANCE** (AC0) — ⭐ an `epics.md` entry under Epic 11b naming `-214` Consequence 3;
      add the sprint row; ⛔ one `governance:` commit, ⛔ no code.
- [ ] **Task 2 — ⭐ RULE THE TABLE'S RELATIONSHIP TO THE PAGE** (AC3, Trap 4) — ⛔ **before** rendering:
      open `/sahyog-vivran/{token}` as `11b-3b` leaves it, record what it **already** shows of the
      nominee name and district, and rule in writing whether the ratified table **replaces** or **sits
      above** it. ⚠ ⛔ A duplicated pair of values on one page is the failure this task exists to stop.
- [ ] **Task 3 — The render** (AC1, AC2, AC3, AC4) — consume `sahyog-shared` by name; omit-the-clause
      per ruling 3.
- [ ] **Task 4 — The amount** (AC5) — ⭐ consume `packages/ui/src/pool-progress/presenter.ts`;
      ⛔ **⛔ NO second multiplication.**
- [ ] **Task 5 — Tests** (AC5, AC6, AC7)
  - [ ] ⭐ **The named-drive headline test** (AC6) — ⚠ the one that catches Trap 1.
  - [ ] ⭐ **No-second-multiplication** scan over `apps/public` (AC5).
  - [ ] ⭐ Omit-the-clause: a null `district` **drops the column** (AC4).
  - [ ] ⭐ A **fence test** for AC7.

## Dev Notes

### ⭐ Why this story is blocked rather than small

⚠ On paper this is *"render five paragraphs and a two-column table."* ⛔ It is not, because **both of
the headline's tokens are missing from this wire by design** — the deceased name (`-173`/`-174`,
`11b-3b`) and the amount (`sahyog-vivran.ts:48-56`, **also** `11b-3b`). ⭐ Neither absence is an
oversight; both are **ruled**, and both lift in the **same** story.

⭐⭐ **THE INTERIM ASYMMETRY IS EXPECTED AND IS ⛔ NOT A DEFECT TO FILE** — `sahyog-vivran.ts:53-55`
says so in terms: until `11b-3b` merges, this page shows a **COUNT** while the member app shows an
**AMOUNT** for the same pool. ⚠ ⛔ That is **ORDERING**, ⛔ not a ruling, and ⛔ not a second instance
of the D7 inversion. ⛔ Do ⛔ not "fix" it here.

### ⚠ What `-214` still leaves open after this story

⭐ **Nothing.** ⇒ `11b-19` (Consequence 2) + `11b-17` AC10 (cl.4(b)) + this story (Consequence 3)
close the 2026-09-05 ratification **end to end**. ⚠ ⛔ `11b-15`'s omission stays **recorded against
`11b-15`** and is ⛔ never back-filled ([[feedback_record_unattested_no_backfill]]).

### References

- ⭐ `.decision-log.md#decision-2026-09-11-214` — **Consequence 3**, the commissioning authority; cl.4(c)
- ⭐ `…/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` **§8.1**, **§8.3(2)**, **§9.1 row 4**, **§9.3**, **§9.4**, **§10.2 ruling 2 + ruling 3**
- ⭐ `packages/contracts/src/public-pages/sahyog-vivran.ts:25-31` (⛔ no deceased name), `:44-58` (⛔ no rupee figure), ⚠ `:56` — ⛔ the *"11b.3b will need `rosterSize` and `fixedAmount`"* comment that `11b-3b` v2.0 **AMENDS**; `:60-61` — the target fence that **STANDS**
- ⭐ `packages/domain/src/pool/sahyog-vivran-read.ts:509` — **`deliveredTotal`**, the amount `11b-3b` actually delivers, `:287` (`accountHolderName`), `:344` (`district`, nullable), `:383` (`confirmedContributionCount`)
- ⭐ `packages/ui/src/pool-progress/presenter.ts` — ⭐ the ONE multiplication (9.12 D3)
- ⚠ `_bmad-output/implementation-artifacts/11b-3b-sahyog-vivran-named-identity-render-layer.md` — ⛔ **the blocking dependency, for BOTH tokens**
- ⚠ `_bmad-output/implementation-artifacts/11b-19-ratified-message-block-copy-source.md` — ⛔ the copy
- ⚠ `deferred-work.md` **`D5-subject (i)`** / **(ii)** — Trap 5
- `.decision-log.md#decision-2026-09-04-190` cl.2 · `#decision-2026-09-02-173` / `-174` · `#decision-2026-09-04-193` cl.3 · `#decision-2026-09-07-206` cl.1

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-11 | 0.2 | ⚠⛔ **THE `11b-3b` DEPENDENCY WAS MIS-STATED IN 0.1 AND IS CORRECTED — ⛔ the obligation is UNCHANGED.** ⭐ Found by `11b-3b`'s own v2.0 `validate` pass. **(1)** 0.1 said `11b-3b` supplies *"`fixedAmount` / `rosterSize`"*. ⛔ It does ⛔ **not**, and must ⛔ not: their product **IS लक्ष्य**, which `-204` **cl.3** reserves to a `super_admin` reveal and **cl.8** closed *"BY CONSTRUCTION"*. ⭐ `11b-3b` v2.0 hoists **`deliveredTotal`** instead. **(2)** ⛔⛔ **0.1 treated *"`11b-3b` merges"* as the condition supplying the NAME. It is not.** ⭐ `11b-3b` supplies the **DECLARATION**; the **RENDER** waits on counsel's `clause_versions` row — ⛔ ONE repo site, **OVERDUE since 2026-09-07**. ⇒ ⚠ clearing this Preflight on the merge alone walks straight into **Trap 1** — the `no_family` variant that would render **every** public drive as though its family had **declined to be named**. ⭐ The two halves now arrive on **different terms** and Task 0 says so. ⛔ **NO CODE.** | BigDev + Claude |
| 2026-09-11 | 0.1 | ⭐ Created from `#decision-2026-09-11-214` **Consequence 3** — the last unhomed half of the 2026-09-05 ratification. ⛔ **ZERO OPEN DECISIONS**; ⛔ **BLOCKED**, ⛔ not open: it needs `11b-19` (the copy) and `11b-3b`. ⭐⭐ **THE FINDING THAT SHAPED IT: the `11b-3b` dependency is ⛔ NOT just the deceased NAME — it is ALSO the AMOUNT.** `sahyog-vivran.ts:48-56` rules ⛔ no rupee figure on this wire and says the amount *"MOVES to **11b.3b**, which adds that dependency"* ⇒ ⛔ **both of the headline's two tokens are 11b-3b's.** ⭐⭐ **FIVE TRAPS:** (1) ⛔⛔ **the `no_family` variant is ⛔ NOT a workaround for the unbuilt dependency** — reaching for it would render EVERY public drive as though the family had **declined to be named**, ⭐ a silent falsehood at scale that would ⛔ pass every test; (2) ⛔ **⛔ no second multiplication** — `confirmedCount × fixedAmount` is 9.12 D3's ONE canonical definition and re-deriving it is **D1(c), REFUSED**; (3) ⛔ **do ⛔ not pre-add `fixedAmount`/`rosterSize`** — *"a field with no render is the vacuous-leg defect wearing a forward-compatibility costume"*; (4) ⚠ **the page may ALREADY render the table's two values** (§8.3(2)) ⇒ Task 2 rules replace-or-above **in writing**, ⛔ not by eye; (5) ⚠ the *"Nominee"* column sits over `account_holder_name_ciphertext` on a **public, bulk-harvestable** surface — ⭐ the exposure is **ruled** (§10.2 ruling 2), ⛔ but the CLAIM *"is the nominee of"* is ⛔ still forbidden. ⭐ Records that the count-vs-amount asymmetry until `11b-3b` merges is **ORDERING, ⛔ not a defect to file**. ⛔ **NO CODE.** | BigDev + Claude |
