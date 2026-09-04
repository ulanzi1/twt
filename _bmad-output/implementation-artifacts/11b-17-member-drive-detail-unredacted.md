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

### ✅ D1 — **RULED (a) by BigDev, 2026-09-04** (`#decision-2026-09-04-199`). WHICH member sees WHICH drive's banking coordinates?

> ⭐⭐ **THE RULING, VERBATIM:** *"Any authenticated member may access the member-facing Sahyog Vivran
> detail for any Trust Pariwar drive, including its full nominee banking coordinates, subject to the
> drive's lifecycle and member-surface access controls."*
>
> ⇒ **option (a).** ⛔ BigDev's recommendation **(b)** is ⛔ **NOT taken** — recorded plainly rather
> than quietly narrowed.
>
> ⭐ **Two qualifiers, ⛔ both binding:** *"lifecycle"* ⇒ `live` · `closed` · `settled` only (⛔ never
> `spawned`, `-196`). *"member-surface access controls"* ⇒ ⭐ **the session scope IS the control** —
> member routes carry ⛔ **no `:pariwarId` parameter**; it comes from
> `request.requestContext.pariwarId`, and every read runs under RLS **FORCED**.
>
> ⚠⛔ **ONE PHRASE IS ⛔ NOT YET CONFIRMED AND IT BLOCKS THE READ — *"any Trust Pariwar drive"*:**
> **(i)** any drive of the member's **OWN** Pariwar ⭐ (BigDev's reading; ⭐ qualifier 2 resolves it there
> by itself), or **(ii)** ⛔⛔ any drive of **ANY** Pariwar — **CROSS-TENANT**, which ⛔ a story cannot
> implement: it inverts the tenant boundary the substrate rests on. ⛔ **If (ii) is meant, STOP** — it
> is a substrate change and a Panel matter.
>
> ⚠⛔ **AND WHAT (a) DISCLOSES, STATED ONCE — ⛔ not re-litigated:** every authenticated member of a
> Pariwar can read the **full account number, IFSC, UPI ID and holder name of every family that
> Pariwar has ever supported** — on their phone, screenshottable, forwardable, persisting on ~43,000
> devices. ⭐ **BigDev's call, and it is made.** ⚠ `-199` records that the **Panel has ⛔ never been
> shown this quantification** (`-190` was ratified on an argument about the *inversion*), and
> recommends — ⛔ not blocking — a one-page disclosure note stating the number their clause produces.

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

⇒ **AC1-AC4 are UNBLOCKED** once the *"any Trust Pariwar drive"* phrase is confirmed as **(i)**.
⚠ **AC5's audit changes character:** under (b) a coordinate read would have been rare; under (a) it is
**routine browsing**, so the §1.5 chain — ⭐ **globally advisory-lock serialized** — takes a write on
every detail open. ⛔ Not a blocker; ⚠ a **volume and contention** question the story must **size**,
⛔ not discover.
⚠⛔ **AND TRAP 3 IS NOW DEFINITELY A REVERSAL:** `contribution-history.ts:24` states *"DELIBERATELY …
NO nominee/bank data"*, and (a) grants exactly that to the same member for the same drives. ⇒ it must
be **NAMED and ARGUED**, ⛔ never absorbed.

---

## ⚠ What this story does ⛔ NOT do

⛔ No public surface · ⛔ no masking change (⭐ dormant, `-190` cl.4) · ⛔ no change to the 9.9 donor
path's own live-pool gate · ⛔ no widening of `contribution-history` without naming Trap 3's reversal ·
⛔ no contributor names · ⛔ no target · ⛔ no `spawned` · ⛔ no masked display of a coordinate (Trap 4).

---

## Tasks / Subtasks

- [x] **Task 0 — RULE D1** — ✅ **RULED (a)** 2026-09-04 (`-199`).
- [ ] **Task 0b — ⛔ BLOCKING: confirm *"any Trust Pariwar drive"* = the member's OWN Pariwar (i).**
      ⛔ If cross-tenant (ii) is meant, ⛔ **STOP** — substrate change, Panel matter, ⛔ not this story.
- [ ] **Task 0c — ⭐ Recommended, ⛔ not blocking:** a one-page **disclosure note to the Panel** stating
      the quantification their clause produces (`-199`). ⛔ Not asking them to re-decide.
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
  - [ ] ⛔⛔ A member of **ANOTHER Pariwar** gets the coordinate keys **ABSENT**, ⛔ not `null` (AC3) —
        ⭐ under (a)/(i) this is the ONLY remaining boundary, so it is the load-bearing guard.
  - [ ] ⭐ Size the **audit write volume** under routine browsing before shipping (AC5).
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
| 2026-09-04 | 0.2 | ✅ **D1 RULED (a)** (`-199`) — ⛔ recommendation (b) NOT taken. ⚠ **Task 0b BLOCKING:** confirm *"any Trust Pariwar drive"* = the member's OWN Pariwar; ⛔ cross-tenant is a substrate change, ⛔ not this story. ⚠ AC5's audit is now routine-volume; Trap 3 is now definitely a REVERSAL. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `-195` cl.3 (story **F**, the last). ⛔ **D1 is OPEN and IS the story.** ⭐⭐ Findings: `-189` cl.3 ⛔ does **not** force the scope (story A removes the public's banking entirely ⇒ cl.3 is satisfied by construction); the **literal** cl.3 reading would put every family's account number in **43,000 pockets** — ⭐ a LARGER exposure than the one just removed; and `contribution-history` excludes bank data **deliberately**. | BigDev + Claude |
