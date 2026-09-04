---
baseline_commit: 0b4d368b
---

<!--
⭐ BASELINE — `story(11b.16): create story G`. Carries decisions `2026-09-04-186` … `-198`,
Story 11b.10 closed, and stories A–E + G `ready-for-dev`.
-->

# Story 11b.17: The Member's View of ONE Drive — Carrying What the Public Page No Longer Does `[SURFACE]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story F** of the split (`2026-09-04-195` cl.3) — the
> **last** of the seven. ⇒ owes an `epics.md` **ANNOTATION** (Task 0).
>
> ⛔⛔ **BLOCKED ON A** (`11b-11` — the public withdrawal must land first, or this story hands the
> member something the public still has) **AND ON E** (`11b-15` — the list this detail opens from).
> ⚠ E is itself blocked on **B** and **G**.
>
> ⭐⭐ **THIS IS THE STORY THAT MAKES `-190` cl.3 TRUE.** *"A logged-in member sees the complete banking
> information."* ⚠ ⛔ **BUT ITS SCOPE IS ⛔ NOT RULED** — see **D1**, which is the whole story.

## Story

As a member looking at a drive in my Pariwar,
I want to open it and see what the trust actually holds about it — including, for the drives that
concern me, the account the money went to —
so that the people funding this can verify it, rather than only strangers on a website being able to.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed — ⛔ no
eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed.

⚠⛔ **IT IS, HOWEVER, THE LARGEST DISCLOSURE DECISION IN THE SPLIT**, and its member-facing sentence
depends entirely on **D1**. ⇒ ⛔ **the sentence is ⛔ NOT written here** — it is written when D1 is
ruled, and **AC6** requires it before any code. ⛔ An unruled scope with a confident sentence attached
would be worse than none.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| The member's bank access today: **own pool, `live` only** | `contracts/contributions/nominee-accounts.ts` (9.9); `payment/handlers.ts` → `{available:false}` with no live pool | ⭐ read |
| ⛔⛔ The member's **history** carries **⛔ NO nominee/bank data — DELIBERATELY** | `contribution-history.ts:24` — *"DELIBERATELY NO other-member field, NO UTR, NO `tr`, **NO nominee/bank data**, NO full names, NO Tier-1"* | ⭐ read |
| The values are returned **UNMASKED** on purpose | `nominee-accounts.ts` — *"a masked account# cannot be transferred to"* | ⭐ read |
| ⭐ After **story A**, the public page carries **⛔ NO banking coordinates** — only the nominee's name | `-190` cl.1; story `11b-11` | ⭐ ruled |
| Two accounts exist per claim, **EQUAL**, ⛔ no primary/secondary | 6.8 / 9.9 ([[project_nominee_bank_disbursement_channel]]) | ⭐ known |

## ⛔ THE FOUR TRAPS

### Trap 1 — ⭐⭐ **`-189` cl.3 DOES ⛔ NOT FORCE THIS STORY'S SCOPE.** ⛔ READ THIS BEFORE D1

*"A member must see MORE than the public, ⛔ never less"* was the argument that produced `-190` cl.3.
⚠⛔ **But story A removes the banking coordinates from the public surface entirely.**

⇒ after A, the public has **⛔ NOTHING** in that field. ⭐ **A member ⛔ cannot see "less than nothing."**
⇒ **cl.3 is satisfied on banking by construction**, whatever this story does. ⛔ It is satisfied on the
**name** and the **drive facts** by stories **G** and **E**.

⇒ ⛔⛔ **THE SCOPE OF MEMBER BANKING ACCESS IS A FREE, SEPARATE DECISION** — ⛔ not something cl.3
compels. ⚠ Anyone arguing *"cl.3 requires it"* is arguing from an inversion that ⛔ no longer exists.

### Trap 2 — ⛔⛔ THE LITERAL READING PUTS **EVERY FAMILY'S ACCOUNT NUMBER IN 43,000 POCKETS**

`-190` cl.3 reads, unqualified: *"a logged-in member sees the complete banking information."*

⚠⛔ **Read literally — any member, any drive, any state — that is: 43,000 members × every drive ever
run × the full account number, IFSC and UPI ID of every bereaved family.** ⛔ On phones. ⛔ Screenshottable.
⛔ Forwardable.

⭐⭐ **THAT WOULD BE A LARGER EXPOSURE THAN THE ONE THIS PROGRAMME JUST REMOVED.** The public page was
reachable by anyone with a link; ⛔ this would be reachable by anyone with a member account, **and it
persists on 43,000 devices**. ⇒ removing it from the public while granting it to everyone internally
could leave the trust **net worse off**.

⛔ Do ⛔ **not** implement the literal reading by default. ⇒ **D1**.

### Trap 3 — ⚠ THE MEMBER'S HISTORY EXCLUDES BANK DATA **DELIBERATELY**, AND THAT IS A SHIPPED RULING

`contribution-history.ts:24` names it: *"DELIBERATELY … **NO nominee/bank data** … NO Tier-1"*.

⇒ ⛔ this story ⛔ cannot simply widen the history read. ⚠ It either builds a **separate** detail with
its own justification, or it **reverses a stated design choice** — ⭐ and if it reverses one, that must
be **named and argued**, ⛔ not absorbed.

### Trap 4 — ⛔ UNMASKED IS THE POINT, ⛔ NOT AN OVERSIGHT

Wherever the coordinates DO appear they are **unmasked** — *"a masked account# cannot be transferred
to."* ⛔ Do ⛔ not "improve" this with a masked display for safety; ⭐ that would break the one thing the
field exists for. ⚠ The safety question is **WHO SEES IT** (D1), ⛔ never **how much of it**.

---

## Acceptance Criteria

### AC0 — Governance first
Task 0 annotates `epics.md`; flips the sprint row; lands in a `governance:` commit before any code.
**And** ⛔ it does ⛔ not proceed while **D1** is open.

### AC1 — A member can open ONE drive from the list
A detail view, reached from story **E**'s fourth tab, for any drive **E** lists (`live` · `closed` ·
`settled`; ⛔ never `spawned`).

### AC2 — It shows at least everything the public drive page shows
For the same drive: the nominee's name (⭐ story **G**'s configured form), the drive facts, the stage
(⭐ story **B**'s vocabulary), the contributor count and the appeal outcome.
**And** a **comparison test** proves the superset — ⛔ the same relational assertion story **E** owes,
⭐ because a per-surface test ⛔ cannot see a `-189` cl.3 violation.

### AC3 — The banking coordinates appear per **D1**'s ruled scope, and ⛔ nowhere else
⛔ Whatever D1 rules, the boundary is **enforced server-side** — ⛔ never by hiding a field the response
already carried.
**And** a test asserts a member **outside** the ruled scope receives a response with the coordinate
keys **ABSENT** (⛔ not `null`) — ⭐ the `.strict()` discipline `-165` established and story **A**
follows.

### AC4 — Where they appear, they are UNMASKED and COMPLETE
Per Trap 4 — full account number, IFSC, UPI ID, holder name, bank and branch, for **both** equal
accounts, ⛔ with no primary/secondary ordering implied.

### AC5 — Every read of a coordinate is ATTRIBUTABLE
⚠ This surface hands Tier-1 payment coordinates to a human. ⇒ the read carries an **audit line**
naming the member, the drive and the instant — ⭐ the same posture the public page's appeal-reversal
disclosure already takes.
**And** ⛔ the audit line names the **canonical identifier**, ⛔ never a token or an account number.

### AC6 — The member-facing sentence is WRITTEN, once D1 is ruled
Per the policy-meaning note: one sentence, in the member's terms, stating who can see a family's
account details and when — ⛔ written **after** D1, ⛔ never before, and checked against the Niyamavali.

### AC7 — ⛔ Nothing else moves
⛔ No public surface · ⛔ no masking behaviour (⭐ dormant per `-190` cl.4) · ⛔ no change to the 9.9
donor path's own gate · ⛔ no contributor names · ⛔ no target · ⛔ no `spawned`.

---

## ⚖️ Decisions

### ⛔⛔ D1 — **OPEN, AND IT IS THE STORY.** WHICH member sees WHICH drive's banking coordinates?

⭐ Trap 1: cl.3 ⛔ does not decide this. ⭐ Trap 2: the literal reading is a **larger** exposure than the
one just removed.

- **(a) ANY member · ANY drive in their Pariwar · any state.** ⭐ The literal `-190` cl.3.
  ⛔⛔ 43,000 members × every family's account number, persisting on 43,000 devices.
- **(b) ⭐ The member's OWN ASSIGNED drives · any state.** They were asked to pay into it; they may
  need the coordinates again to check a transfer, or to pay late. ⭐ Satisfies *"a member sees the
  complete banking information"* **for the drives that concern them**, and keeps every other family's
  coordinates out of their reach. ⚠ Widens today's rule on the **time** axis (`live` → any state),
  ⛔ not the **population** axis.
- **(c) The member's own assigned drives, while payment is still possible.** ⭐ Today's behaviour,
  unchanged — ⛔ but then this story adds ⛔ nothing to `-190` cl.3 and the clause is satisfied only by
  what already shipped.

⭐ **BigDev's recommendation: (b).** ⚠ It is the only reading that gives cl.3 real content ⛔ without
handing every family's payment coordinates to the whole membership. ⛔ (a) should ⛔ not be chosen by
default merely because the clause is phrased unqualifiedly — ⚠ **the Panel ruled cl.3 to CLOSE an
inversion, ⛔ not to open a directory of bank accounts**, and Trap 1 shows the inversion is already
closed without it.

⚠⛔ **IF (a) IS GENUINELY WANTED, IT NEEDS THE PANEL**, ⛔ not this story — it is a disclosure of Tier-1
data to 43,000 people, and `-190` was ratified on a note that ⛔ never quantified it.

⛔ **Do ⛔ not implement until ruled.** ⇒ it decides the read, the route, the audit volume, AC3's test
and AC6's sentence.

---

## ⚠ What this story does ⛔ NOT do

⛔ No public surface · ⛔ no masking change (⭐ dormant, `-190` cl.4) · ⛔ no change to the 9.9 donor
path's own live-pool gate · ⛔ no widening of `contribution-history` without naming Trap 3's reversal ·
⛔ no contributor names · ⛔ no target · ⛔ no `spawned` · ⛔ no masked display of a coordinate (Trap 4).

---

## Tasks / Subtasks

- [ ] **Task 0 — ⛔ RULE D1 FIRST** — ⛔ it is the story; ⛔ nothing else may start. ⚠ If **(a)**, ⛔ stop
      and route to the Panel.
- [ ] **Task 1 — GOVERNANCE** (AC0) — annotate `epics.md`; flip the sprint row; ⭐ record D1's ruling
      and **AC6's sentence**; ⛔ one `governance:` commit, ⛔ no code.
- [ ] **Task 2 — The read** (AC1, AC2, AC3) — a member-scoped per-drive read. ⚠ Per Trap 3, ⛔ do ⛔ not
      widen `contribution-history`; ⭐ build the detail with its own justification, or **name the
      reversal**.
- [ ] **Task 3 — The scope boundary** (AC3) — enforced **server-side**; out-of-scope responses omit the
      keys **entirely**.
- [ ] **Task 4 — The audit** (AC5) — one line per coordinate read, keyed on the **canonical
      identifier**.
- [ ] **Task 5 — The screen** (AC1, AC4) — family 13 in full; both equal accounts, ⛔ no ordering
      implied; ⭐ `accessible={true}` on every labelled container.
- [ ] **Task 6 — Tests** (AC2-AC5)
  - [ ] The `member ≥ public` **comparison** (AC2).
  - [ ] ⛔⛔ An out-of-scope member gets the coordinate keys **ABSENT**, ⛔ not `null` (AC3) — ⭐ the
        load-bearing guard.
  - [ ] Another Pariwar's drive is unreachable (family 12).
  - [ ] Every coordinate read writes exactly one audit line (AC5).
  - [ ] ⭐ **Execute them** against `twt-test-pg` `:5433`.

---

## Dev Notes

### Read Trap 1 before anything else

⭐ The instinct will be *"cl.3 says member > public, so the member must get the bank details."*
⛔ **That instinct is now wrong.** Story A removes those fields from the public entirely ⇒ cl.3 is
satisfied on banking **whatever this story does**. ⚠ The scope is a **free decision**, and it should be
made on its own merits, ⛔ not inherited from an argument that no longer applies.

### The asymmetry worth noticing

⭐ This programme spent seven stories **narrowing** what a stranger can see. ⚠ D1(a) would **widen**, in
one step, what 43,000 people can see — ⛔ and it would do so under a clause that was written to
**close** an inversion. ⇒ ⛔ that is the shape to be suspicious of.

### Testing standards

Live-DB for the read, the boundary and the audit; RN unit for the screen. ⚠ Assert **membership and
explicit values**, ⛔ never counts over the shared fixture.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.1, cl.3, cl.4 · `-189` cl.3 · `-195` cl.1, cl.3
- `packages/contracts/src/contributions/nominee-accounts.ts` — the 9.9 donor path and its gate
- `packages/contracts/src/contributions/contribution-history.ts:24` — the deliberate exclusion
- `apps/api/src/modules/payment/handlers.ts` — the live-pool gate
- `apps/api/src/modules/public-pages/handlers.ts:804-830` — the audit-line posture to follow

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **F**, the last). ⛔ **D1 is OPEN and IS the story.** ⭐⭐ Findings: `-189` cl.3 ⛔ does **not** force the scope (story A removes the public's banking entirely ⇒ cl.3 is satisfied by construction); the **literal** cl.3 reading would put every family's account number in **43,000 pockets** — ⭐ a LARGER exposure than the one just removed; and `contribution-history` excludes bank data **deliberately**. | BigDev + Claude |
