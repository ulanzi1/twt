---
baseline_commit: 2b2beb5e
---

<!--
⭐ BASELINE — `governance(11b.15): D1 RULED`. Carries decisions `2026-09-04-186` … `-198`,
Story 11b.10 closed, and stories A–E `ready-for-dev`.
-->

# Story 11b.16: The Member Sees the Pariwar's **CONFIGURED NAME FORM** — Consistently, Across the App `[CONSUMER]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story G** — the **seventh**, added at
> `2026-09-04-197`/`-198` after story E's authoring found a **fourth `-189` cl.3 inversion**. ⇒ owes
> an `epics.md` **ANNOTATION** (Task 0).
>
> ⛔⛔ **IT RUNS BEFORE STORY E** (`-198` cl.2). ⭐ The name form changes **first**, so E's new list is
> built into a codebase that is ⛔ already consistent. ⛔ E must ⛔ never ship a name form the My Pool
> card contradicts, ⛔ not even briefly.
>
> ⚠ **⛔ NOT BLOCKED by A/B/C/D.** ⭐ It can start immediately.

## Story

As a member,
I want the person a drive is for to be named the same way everywhere I look in the app,
so that I am not shown an initial on one screen, a fuller name on another, and something different
again from what a stranger can read on the public website.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed. ⛔ No
eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed.

⚠⛔ **BUT IT IS A DISCLOSURE CHANGE AND ⛔ MUST NOT READ AS COSMETIC.** In the member's own terms:
⭐ **"On a drive whose family did not consent to public publication, a member will now see the full
legal name where they previously saw a first name and an initial."** ⭐ The ground (`-198` cl.1): the
publication basis governs **publication to the WORLD**, ⛔ not what a mutual-aid group is told about
the family it is being asked to help. ⛔ Anyone reversing this reverses **that sentence**.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| The member path **hard-codes the shielded form** | `sahyog-drive.ts:96`; `deceasedFirstName` + `deceasedLastInitial` | ⭐ read |
| The public renders the Pariwar's **configured form**, `full_name` **default** | `sahyog-drive.ts:94`; `2026-08-19-136` cl.1 | ⭐ read |
| The public name is **also** gated by the publication **BASIS** | `public-read.ts:512` — *"renders … WITHOUT a name"* | ⭐ read |
| ⛔⛔ `member-pool/pool-identity.ts` **DELEGATES to `notifications.resolvePoolIdentity`** | `pool-identity.ts:60-72` | ⭐ read |
| ⛔⛔ **FOUR consumers, THREE risk classes** | screens `handlers.ts:630` + `:835` · artifact `contribution-note.ts:144` · ⛔ **push** `contribution-notify-triggers.ts:683` | ⭐ read |
| The three in-API consumers differ on `null` | *"the card and the passbook treat `null` as omit; the Note treats it as a **404**"* (`pool-identity.ts`) | ⭐ read |
| A push with no name is **skipped LOUDLY** | `contribution-notify-triggers.ts:679-681` — *"a push naming no family is a DEFECTIVE artifact"* | ⭐ read |

## ⛔ THE FOUR TRAPS

### Trap 1 — ⛔⛔ THE RESOLVER FEEDS **OUTBOUND PUSH**. ⛔ DO ⛔ NOT FLIP IT GLOBALLY

`resolvePoolIdentity` is ⛔ **not** a member-app helper — the member-pool one **delegates to the
notifications resolver**, which `apps/jobs` calls **directly** for the push path.

⇒ ⛔⛔ **a one-line change to the shared resolver would put a FULL LEGAL NAME into an SMS/WhatsApp
push** — onto a lock screen, into a telecom log, forwardable. ⭐ *"Member surfaces"* (`-197` cl.2) is
about **screens a member opens**; ⛔ **a push is ⛔ NOT a surface.**

⭐ `-198` follow-up (i): **the push keeps the shielded form.** ⇒ this story changes the **callers**, or
threads a form through — ⛔ it does ⛔ **not** change the resolver's default.

### Trap 2 — ⚠ THE CONTRIBUTION NOTE IS A **DURABLE ARTIFACT**

The Yogdaan Pratigya is *"render-ready"* — a document a member holds — and it **404s** on a null name
because *"a Note with a blank family name is a DEFECTIVE ARTIFACT"*.

⇒ changing its name form changes **the document**. ⚠ Notes rendered **before** and **after** this
story will differ, and ⛔ **nothing re-renders old ones**. ⭐ Recommended: the Note follows the
**in-app** form (a member-held document, ⛔ not an outbound message) — ⚠ **state the discontinuity**,
⛔ do not paper over it.

### Trap 3 — ⛔ THE CONTRACT SHAPE ⛔ CANNOT CARRY A CONFIGURED NAME

`ActiveContributionCard` declares `deceasedFirstName: z.string().min(1)` and
`deceasedLastInitial: z.string().max(16)` — **two fields encoding the shielded form in the CONTRACT**.
⇒ a configured `full_name` does ⛔ not fit; ⛔ the contract moves, and every consumer with it.

⚠⛔ ⛔ Do ⛔ **not** "solve" it by stuffing a full name into `deceasedFirstName` and blanking the
initial. ⭐ That leaves a **lying field name** — precisely the class of defect this epic has logged
four times.

### Trap 4 — ⛔ FORM ONLY. ⛔ THE BASIS GATE IS ⛔ NOT ADOPTED

`-198` cl.1: the member path takes the **configured FORM** and ⛔ **not** the publication **BASIS**.

⛔ Adopting the basis would mean a member sees **⛔ NOTHING** on an unconsented drive — ⛔⛔ a
**REGRESSION** from today's always-present first-name + initial, and it would leave the contribution
card unable to say who died **on the screen that asks the member to pay**.

---

## Acceptance Criteria

### AC0 — Governance first
Task 0 annotates `epics.md` (⭐ story **G**, added after E's authoring found the inversion); flips the
sprint row; lands in a `governance:` commit before any code.

### AC1 — In-app member screens show the CONFIGURED form
The **My Pool card** and the **passbook/history** read resolve the deceased's name through the
Pariwar's configured presentation mode (`full_name` by default).
**And** the resulting name is **identical** to what the public index would render for the same drive
**where the publication basis is satisfied**.

### AC2 — ⛔ The BASIS gate is ⛔ NOT adopted
A member sees a name **always**, including where the publication basis is **absent** (Trap 4).
**And** a test asserts a member sees the configured name on a drive whose family has ⛔ **no**
publication basis, while the **public** sees ⛔ none — ⭐ the `-189` cl.3 direction, proven.

### AC3 — ⛔⛔ THE OUTBOUND PUSH IS ⛔ UNCHANGED
`contribution-notify-triggers.ts` keeps the **shielded** form (`-198` follow-up (i)).
**And** a test asserts a push payload carries ⛔ **no** full legal name — ⭐ the regression this AC
exists to prevent is a one-line resolver change leaking a name into SMS.
**And** the resulting asymmetry — a member may see a fuller name **in the app** than in the
**notification that sent them there** — is **STATED** in the story record (⭐ pull vs push), ⛔ not left
to be discovered.

### AC4 — The Contribution Note is decided DELIBERATELY
Per Trap 2 and `-198` follow-up (ii). **And** the **discontinuity** — Notes before vs after this story
— is recorded, with ⛔ no back-fill and ⛔ no re-render implied
([[feedback_record_unattested_no_backfill]]).

### AC5 — The contract carries the name HONESTLY
`ActiveContributionCard`'s two shielded fields are replaced by a shape that can hold a configured name
(Trap 3). **And** ⛔ ⛔ no field keeps a name it no longer holds. **And** every mobile consumer moves
with it.

### AC6 — The member's meaning is STATED
The story record carries the one-sentence policy meaning verbatim (⭐ the AI-10-1 note above), ⛔ so a
reviewer meets it in prose rather than inferring it from a diff.

### AC7 — ⛔ Nothing else moves
⛔ No public surface · ⛔ no publication basis · ⛔ no drive list (**E**) · ⛔ no banking field (**A/F**)
· ⛔ no stage vocabulary (**B**) · ⛔ no target (**C**) · ⛔ nothing a member owes.

---

## ⚖️ Decisions

⭐ **⛔ NONE OPEN.** `-198` ruled **form-only** (cl.1) and the **sequencing** (cl.2); its two
follow-ups are carried as **AC3** (push unchanged — ⭐ recommended and adopted) and **AC4** (the Note —
⭐ recommended, ⚠ **confirm at Task 1** before implementing).

---

## ⚠ What this story does ⛔ NOT do

⛔ It does ⛔ **not** change the outbound push (AC3) · ⛔ not adopt the publication basis (AC2) · ⛔ not
touch any public surface · ⛔ not re-render past Contribution Notes · ⛔ not build the drive list
(**E**) · ⛔ not change the shared resolver's **default** (Trap 1).

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0) — annotate `epics.md`; flip the sprint row; ⛔ one
      `governance:` commit, ⛔ no code.
- [ ] **Task 1 — Confirm AC4's Note disposition** with BigDev. ⛔ Do ⛔ not assume.
- [ ] **Task 2 — Thread the form, ⛔ do ⛔ NOT flip the default** (AC1, AC3, Trap 1) — the in-app
      callers request the **configured** form; `contribution-notify-triggers.ts` keeps the **shielded**
      one. ⭐ Prefer an **explicit parameter at the call site** over a new default — ⛔ a default is how
      the push path gets changed by accident.
- [ ] **Task 3 — The contract** (AC5, Trap 3) — replace the two shielded fields with an honest shape;
      move every mobile consumer. ⛔ No field keeps a name it no longer holds.
- [ ] **Task 4 — The screens** (AC1) — My Pool card + passbook/history.
- [ ] **Task 5 — The Note** (AC4) — per Task 1; record the discontinuity.
- [ ] **Task 6 — Tests** (AC1-AC5)
  - [ ] Member name **equals** the public name where the basis holds (AC1).
  - [ ] Member sees a name where the public sees ⛔ **none** (AC2) — ⭐ `-189` cl.3, proven.
  - [ ] ⛔⛔ **The push payload carries ⛔ no full legal name** (AC3) — ⭐ the load-bearing guard.
  - [ ] The card contract rejects the old shielded shape (AC5).
  - [ ] ⭐ **Execute them** against `twt-test-pg` `:5433` — ⛔ *"written but not run"* is ⛔ not attested.

---

## Dev Notes

### The whole risk is in ONE line you must ⛔ not write

⭐ A single change to `notifications.resolvePoolIdentity`'s default would satisfy AC1 in one edit —
⛔ and simultaneously put a **full legal name into an outbound SMS**. ⚠ **That edit is the story's
one REAL hazard**, and Trap 1 exists to stop it.

⇒ **thread the form from the CALL SITE.** ⭐ Four callers, three of which change and one of which
⛔ must not.

### Why G runs before E

⭐ E builds a list that must show *"at least what the public shows"*. ⚠ If E lands first, that list
would be **correct** while the My Pool card beside it is **inconsistent** — a member seeing two name
forms in one app, ⛔ which is the very finding G exists to close.

### Testing standards

Live-DB for the resolver and the comparisons; unit for the contract and the mobile consumers. ⚠ The
push assertion is ⛔ **not** optional — it is the one test that guards the trap.

### References

- `.decision-log.md#decision-2026-09-04-197` · `-198` cl.1, cl.2 and its two follow-ups
- `.decision-log.md#decision-2026-09-04-189` cl.3 · `-195` cl.1 · `#decision-2026-08-19-136` cl.1
- `apps/api/src/modules/member-pool/pool-identity.ts:60-72` — the delegation
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts:679-692` — ⛔ the push path
- `apps/api/src/modules/member-pool/contribution-note.ts:144` — the durable artifact
- `packages/contracts/src/contributions/active-contribution-card.ts` — the two shielded fields

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `-197` / `-198` (story **G**, the seventh). ⛔ **Zero open decisions.** ⭐⭐ Finding at authoring: the shared resolver also feeds **OUTBOUND PUSH** — a global flip would put a full legal name into an SMS. ⇒ AC3 keeps the push shielded and tests it. | BigDev + Claude |
