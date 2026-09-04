---
baseline_commit: 222fb4d8
---

<!--
⭐ BASELINE — `story(11b.12): create story B`. Carries decisions `2026-09-04-186` … `-196`,
Story 11b.10 closed, the six-story split, and stories A/B `ready-for-dev`.
-->

# Story 11b.13: The Per-Pariwar Drive TARGET — Set by a Pariwar Admin, Revealed Only by a Super Admin `[SUBSTRATE]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story C** of the six-story split (`2026-09-04-195`
> cl.3), following **Trustee-ratified** `2026-09-04-190` cl.7 and `-191` cl.4 (Dhiraj Rahul + Kalpana
> Bharti). ⇒ it owes an `epics.md` **ANNOTATION** (Task 0).
>
> ⛔⛔ **IT OPENS WITH A GOVERNANCE DECISION AND ⛔ DOES NOT PROCEED WITHOUT ONE.** `-195` cl.2:
> minting a permission key moves `PERMISSION_CATALOG_VERSION`, which is a **governance act** in this
> repo. ⛔ The key is ⛔ **NOT** minted inside a build task.
>
> ⚠ **STORY D DEPENDS ON THIS ONE.** ⛔ Nothing depends on A or B; ⭐ this story may run in parallel
> with both.

## Story

As a Pariwar Admin who knows what a drive in my Pariwar needs to raise,
I want to record that figure once, and have it stay invisible to members and the public unless the
Trust centrally decides otherwise,
so that a progress bar can be measured against something real without anyone being shown a target to
fall short of.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **THIS STORY INTRODUCES ⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT.** Stated
explicitly, ⛔ not omitted.

⭐ The target is a **presentation denominator**. ⛔ It does ⛔ not affect who may contribute, how much
they owe, whether they are assigned, or whether a family is paid. ⚠ **A member's obligation is
`pools.fixed_amount`, ⛔ never this figure**, and ⛔ nothing in this story may make the two interact —
⇒ **AC7** pins that, because a target that silently became an obligation would be the AI-10-1 shape
exactly.

⭐ `-189` cl.3 (*member > public*) is satisfied **symmetrically**: the target is hidden from
**both**, and cl.7(c)'s two switches are **independent**, so a Pariwar can reveal it to members
without revealing it publicly — ⛔ never the reverse. **AC4** pins that ordering.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| `PERMISSION_CATALOG_VERSION = 39` | `packages/domain/src/rbac/permissions.ts:598` | ⭐ read |
| The closest per-Pariwar setting: a **schedule table + one write key + an admin UI** | `pariwar_nominee_bank_masking_schedule`; `pariwar.manage_nominee_bank_masking` (v38→39); UI at `/p/$pariwarId/nominee-bank-masking` | ⭐ read |
| ⛔⛔ That key **FORECLOSES `pariwar_admin`** in terms | `permissions.ts:573-576` — *"granting it 'for symmetry' … is precisely the 'reverse a ratified ruling by way of a catalog edit' move"*; **acceptance condition: a Panel ruling** | ⭐ read |
| Per-Pariwar disclosure controls are **central in AUTHORITY** | `2026-09-02-178`; `2026-08-19-136` cl.3's two-axis rule | ⭐ read |
| One key meaning two acts is **the drift a catalog exists to prevent** | `permissions.ts` — *"forbids widening it 'for symmetry'"*; `2026-09-02-183` cl.1 | ⭐ read |
| `pariwar_admin` DOES hold other `pariwar.*` keys | `permissions.ts:90,94,108,184,207,213` | ⭐ read |
| The masking control is **NOT step-up-gated**; accountability = required rationale + actor + audit line | `permissions.ts` | ⭐ read |

## ⛔ THE FOUR TRAPS

### Trap 1 — ⛔⛔ THE NEIGHBOURING KEY **FORECLOSES `pariwar_admin` IN WRITING**. ⛔ READ IT BEFORE MINTING

`pariwar.manage_nominee_bank_masking`'s own doc-block:

> *"⛔⛔ `pariwar_admin` is **FORECLOSED**. Granting it 'for symmetry' with the neighbouring
> pariwar-dimension content keys is precisely the 'reverse a ratified ruling by way of a catalog edit'
> move … **ACCEPTANCE CONDITION for pariwar_admin: a Panel ruling** superseding `2026-09-02-178`.
> ⛔ Never a consistency argument from the neighbouring keys."*

⭐ **This story grants `pariwar_admin` on a NEW key, and that is ⛔ NOT a violation** — `-190` cl.7(a)
is a **Panel ruling** (DR + KB). ⚠⛔ **BUT the governance decision MUST say why the analogy does ⛔ not
apply, or the next reader will read it as the forbidden symmetry move:**

⭐ **The two precedents govern DISCLOSURE.** The public-name mode decides *what a public page shows*;
the masking window decides *how long it keeps showing it*. ⇒ both are **presentation policy**, and
`-178` correctly put that authority centrally.
⭐⭐ **SETTING the target discloses ⛔ NOTHING** — cl.7(b) makes it invisible to everyone. **REVEALING
it IS a disclosure act, and cl.7(c) keeps that Super-Admin-only.** ⇒ the two-axis rule of
`2026-08-19-136` cl.3 is **FOLLOWED, ⛔ not departed from**: this control is per-Pariwar in **scope**,
Pariwar-Admin in **operational authority**, and **central in DISCLOSURE authority**.

⛔ It supersedes **nothing**. `-178` and the masking key's foreclosure ⛔ stand untouched.

### Trap 2 — ⛔ ONE KEY MEANING TWO ACTS IS THE DRIFT THE CATALOG EXISTS TO PREVENT

**Setting** a figure and **revealing** it are different governed acts under **different authorities**.
⛔ Do ⛔ not express cl.7(c) as *"the same key, but the route checks the role"* — that hides an
authority split inside a handler. ⇒ **D1** rules the shape.

### Trap 3 — ⚠⛔ THIS STORY BUILDS A CONTROL WITH ⛔ NO VISIBLE OUTPUT

The target is ⛔ **not displayed** (cl.7(b)), and the meter that will consume it is **story D**. ⇒ at
the end of this story a Pariwar Admin can set a number that **⛔ nothing renders**.

⭐ That is **correct and intended** — ⛔ do ⛔ not "finish the job" by rendering it, and ⛔ do not add a
preview. ⚠ But it means the story's own tests are the **only** proof it works: ⛔ there is nothing to
look at.

### Trap 4 — ⚠ IT IS MONEY. VALIDATE IT LIKE MONEY

`-191` cl.4 makes the target a **rupee** figure ⇒ its validation is ⛔ not a free choice. ⭐ Mirror
`pools.fixed_amount`: **whole INR**, non-negative integer, with an upper sanity bound, rejected at the
contract boundary ⛔ and at the DB. ⛔ No floats, ⛔ no paise, ⛔ no coercion — *"on this control the two
outcomes are 'a wrong number is shown to 43,000 members' and 'it is not'."*

---

## Acceptance Criteria

### AC0 — ⛔ THE GOVERNANCE DECISION LANDS FIRST, AND THE KEY IS MINTED IN IT

**Given** `-195` cl.2 — the key gets its **own** governance decision, ⛔ not a build task
**Then** a decision entry is written that: mints the key(s) per **D1**; moves
`PERMISSION_CATALOG_VERSION` from **39**; states the grant (`pariwar_admin` for the write half);
and **states why the `2026-09-02-178` / `2026-08-19-136` cl.3 analogy does ⛔ NOT apply** (Trap 1)
**And** it records that it supersedes **nothing** — `-178` and the masking key's `pariwar_admin`
foreclosure ⛔ stand
**And** the `epics.md` annotation and the sprint flip ride the same `governance:` commit
**And** ⛔ **no code lands before it** ([[feedback_governance_commits_precede_implementation]]).

### AC1 — The target is STORED, per Pariwar, once

**Given** `-190` cl.7(a) and `-191` cl.4
**Then** a per-Pariwar record holds **one** whole-INR target
**And** it is the **SAME target for every drive** in that Pariwar (`-189` cl.2(d), carried forward)
**And** ⛔ there is ⛔ no per-drive override — ⛔ not a column, ⛔ not a nullable field, ⛔ not a seam
**And** the shape follows `pariwar_nominee_bank_masking_schedule` (the nearest precedent), ⛔ not a new
pattern.

### AC2 — A **Pariwar Admin** sets it, and every change is attributable

**Given** cl.7(a)
**Then** the write is gated by the key minted at AC0, checked at `dimension: 'pariwar'`
**And** every change carries a **required rationale**, the **actor**, and an **admin display-name
snapshot**, plus a §1.5 hash-chain **audit line** — the masking-policy precedent, which *"refuses to
skip"* them
**And** ⛔ `district_admin` / `state_trustee` are ⛔ NOT granted — inert in both directions
([[project_rbac_geo_scope_containment]]).

### AC3 — Only a **Super Admin** may reveal it — and the two switches are INDEPENDENT

**Given** cl.7(c)
**Then** two **separate** visibility flags exist — *reveal to members* and *reveal to the public*
**And** ⛔ **only `super_admin`** may change either
**And** they are **independent**: any of the four combinations is expressible
**And** a test asserts a `pariwar_admin` **cannot** flip either — ⛔ the regression this AC exists to
prevent is the write key quietly carrying the reveal.

### AC4 — Hidden is the DEFAULT, and `member ≥ public` holds in the reveal

**Given** cl.7(b) and `-189` cl.3
**Then** a Pariwar with no configuration reveals the target to **nobody**
**And** a newly set target is **hidden** — ⛔ setting is ⛔ never revealing
**And** ⭐ **public-revealed-while-member-hidden is REFUSED** — it would show the public more than a
member, which `-189` cl.3 forbids for this data class (`-195` cl.1). ⚠ Enforced, ⛔ not documented.

### AC5 — The admin surface exists, and it says what it does

**Given** cl.7(a)'s *"from day 1"* — a target nobody can set is not set
**Then** a Pariwar Admin can set the figure from an admin surface, following the
`/p/$pariwarId/nominee-bank-masking` precedent
**And** the surface states that the figure is **⛔ not shown to anyone** unless the Trust reveals it
**And** the reveal switches are visible ⛔ only to a `super_admin`.

### AC6 — ⛔ NOTHING RENDERS IT

**Given** Trap 3
**Then** ⛔ no public surface, ⛔ no member surface and ⛔ no wire contract carries the target or either
flag
**And** a test asserts the target does ⛔ **not** appear in the public drive or drive-page responses
**And** ⭐ story **D** is the first consumer.

### AC7 — The target and a member's OBLIGATION never touch

**Given** the policy-meaning note
**Then** ⛔ nothing reads the target when computing what a member owes, is assigned, or has paid
**And** `pools.fixed_amount` is **untouched**
**And** a test asserts the contribution path produces identical results with the target set, unset and
changed.

### AC8 — ⛔ Nothing else moves

**Then** ⛔ no stage vocabulary (story **B**), ⛔ no bank field (story **A**), ⛔ no listing predicate,
⛔ no meter, ⛔ no rate limit, ⛔ no masking behaviour
**And** ⛔ ⛔ the masking key and `-178` are **untouched** (Trap 1).

---

## ⚖️ Decisions

### ⚠ D1 — **OPEN, and it BLOCKS AC0.** ONE key or TWO?

⭐ **The problem (Trap 2):** cl.7 splits **setting** (Pariwar Admin) from **revealing** (Super Admin
only). ⛔ The catalog must express that split, ⛔ not a handler.

- **(a) ONE key**, granted to `pariwar_admin` + `super_admin`, with the reveal route additionally
  checking the role. ⭐ v39 → **40**. ⛔ But it puts an **authority boundary inside a handler**, where
  ⛔ no catalog reader can see it — and the neighbouring key's doc-block names exactly this
  (*"one key meaning two unrelated things is the drift a catalog exists to prevent"*).
- **(b) ⭐ TWO keys** — a write key (`pariwar_admin` + `super_admin`) and a reveal key
  (`super_admin` **only**). ⭐ v39 → **41**. ⛔ Two catalog entries instead of one; ⭐ the authority
  split is **structural and readable**, and the reveal key's grant matches the masking/presentation
  precedent exactly, which is what makes Trap 1's argument hold.

⭐ **BigDev's recommendation: (b).** Trap 1's whole defence is *"the DISCLOSURE half stays central"*.
⚠ Under (a) that claim rests on a role check in a route; under (b) it is **visible in the catalog**,
which is where a Panel or an auditor would look for it.

⛔ **Do ⛔ not mint until this is ruled** — it decides the catalog version, the grants, and the
governance decision's own text.

---

## ⚠ What this story does ⛔ NOT do

- ⛔ It does ⛔ **not render the target anywhere** (Trap 3, AC6). ⭐ Story **D** is the first consumer.
- ⛔ It does ⛔ not build the progress bar or the headline copy (**D**).
- ⛔ It does ⛔ not supersede `2026-09-02-178`, and ⛔ does ⛔ not lift the masking key's `pariwar_admin`
  foreclosure (Trap 1). ⚠ A future story wanting that still needs its own Panel ruling.
- ⛔ It does ⛔ not add a per-drive target (AC1).
- ⛔ It does ⛔ not touch `pools.fixed_amount`, the assignment engine, or anything a member owes (AC7).

---

## Tasks / Subtasks

- [ ] **Task 0 — RULE D1, THEN THE GOVERNANCE DECISION** (AC0) — ⛔ **BLOCKS EVERYTHING**
  - [ ] Put **D1** to BigDev. ⛔ Do ⛔ not choose unilaterally.
  - [ ] Read `.decision-log.md` **live** for the head number — ⛔ do ⛔ not hardcode it.
  - [ ] Write the decision: mint the key(s); bump `PERMISSION_CATALOG_VERSION` from 39; state the
        grants; **state why the `-178` / `-136` cl.3 analogy does ⛔ not apply** (Trap 1); record that
        it supersedes ⛔ nothing.
  - [ ] Annotate `epics.md`; flip `sprint-status.yaml` `11b-13-…` to `in-progress`.
  - [ ] ⛔ One `governance:` commit. ⛔ No code.
- [ ] **Task 1 — The catalog** (AC0, AC2, AC3)
  - [ ] Declare the key(s) in `packages/domain/src/rbac/permissions.ts` with a doc-block carrying
        Trap 1's argument **in full** — ⛔ a bare grant here is how the foreclosure gets read as broken.
  - [ ] Grant in `roles.ts`. ⛔ Not `district_admin`, ⛔ not `state_trustee`.
  - [ ] Bump `PERMISSION_CATALOG_VERSION` per D1.
- [ ] **Task 2 — The substrate** (AC1, AC4)
  - [ ] Migration: the per-Pariwar target + the two reveal flags. ⭐ Model on
        `pariwar_nominee_bank_masking_schedule`. ⚠ Hand-authored, ⛔ never `db:generate`
        ([[project_live_db_test_gotchas]]).
  - [ ] Whole-INR CHECK + non-negative + an upper sanity bound (Trap 4).
  - [ ] ⭐ A DB-level guard that ⛔ refuses public-revealed-while-member-hidden (AC4) — ⛔ do ⛔ not leave
        it to the handler alone; family 5 wants the app rule mirrored by a constraint.
  - [ ] RLS + grants per the existing per-Pariwar-settings posture.
- [ ] **Task 3 — The domain write** (AC2)
  - [ ] The setter, with required rationale + actor + display-name snapshot + audit line, following
        `nominee-bank-masking-policy.ts`, which *"refuses to skip"* them.
- [ ] **Task 4 — The admin surface** (AC5)
  - [ ] Route + UI on the `/p/$pariwarId/nominee-bank-masking` precedent.
  - [ ] The reveal switches render ⛔ only for `super_admin`.
  - [ ] Copy states plainly that the figure is shown to **nobody** unless the Trust reveals it.
- [ ] **Task 5 — The tests** (AC1-AC7)
  - [ ] `pariwar_admin` CAN set; ⛔ CANNOT reveal (AC3's regression guard).
  - [ ] `super_admin` can do both; `district_admin` / `state_trustee` can do neither.
  - [ ] Defaults hidden; setting ⛔ never reveals (AC4).
  - [ ] Public-revealed-while-member-hidden is **refused** — at the handler **and** at the DB (AC4).
  - [ ] The target appears in ⛔ no public response (AC6).
  - [ ] The contribution path is **identical** with the target set / unset / changed (AC7).
  - [ ] Non-integer, negative and absurd values rejected (Trap 4).
  - [ ] ⭐ **Execute them** against `twt-test-pg` on `:5433` — ⛔ *"written but not run"* is ⛔ not
        attested; that gap shipped a red spec at 11b.10.

---

## Dev Notes

### The whole story is an authority argument

⭐ The code is small: one table, one or two keys, a setter, a form. ⚠ **The load-bearing part is
Trap 1's paragraph**, and it has to survive in the catalog doc-block — because the neighbouring key
says in writing that granting `pariwar_admin` "for symmetry" is a **ruling reversal by catalog edit**.

⇒ ⛔ A reader who finds `pariwar_admin` on a new pariwar-dimension key, ⛔ with no argument beside it,
is correct to treat it as a defect. ⭐ **Give them the argument.**

### Why the reveal switches exist before anything reads them

cl.7(c) is the **Panel's** control over a disclosure that does not exist yet. ⛔ Building it later,
after story D renders the bar, would mean shipping a display first and its governance second — the
ordering this project inverts on purpose.

### Testing standards

Live-DB integration under `packages/domain/tests/integration/` and `apps/api/tests/integration/`;
RLS/constraint assertions in a **migration-level policy-regression spec**, ⛔ never only inferred
through higher-level tests (family 5). ⚠ Assert **membership and explicit values**, ⛔ never counts over
the shared fixture.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.7 — set / reveal, and the authority split
- `.decision-log.md#decision-2026-09-04-191` cl.4 — the target is a RUPEE figure
- `.decision-log.md#decision-2026-09-04-195` cl.2 — the key gets its own governance decision
- `.decision-log.md#decision-2026-09-02-178` — the authority ruling this story does ⛔ NOT supersede
- `.decision-log.md#decision-2026-08-19-136` cl.3 — the two-axis SCOPE/AUTHORITY rule
- `packages/domain/src/rbac/permissions.ts:562-598` — the precedent key, its foreclosure, and v39
- `packages/domain/src/claim/nominee-bank-masking-policy.ts` — the audit discipline to follow

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `2026-09-04-195` cl.3 (story **C**). ⚠ **D1 is OPEN and blocks Task 0**, which itself blocks all code. ⭐ Finding at authoring: the neighbouring key **FORECLOSES `pariwar_admin` in writing**, with *"a Panel ruling"* as its acceptance condition — `-190` cl.7(a) IS one, but the decision must say why the disclosure analogy does ⛔ not apply. | BigDev + Claude |
