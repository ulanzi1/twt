# Trustee Panel routing note — who reads what the FAMILY tells the inspector about how the member died (a confirm, non-blocking)

> **Status: DRAFT for BigDev to send.** ⛔ Sent by the session. Written 2026-10-28 by Story 6.32 (Task 0.4) under
> [`-413`](../../.decision-log.md#decision-2026-10-28-413) IQ7 (A). Non-blocking: the story is built either way, and the answers are ⛔ collected in
> production until counsel's basis is recorded (roster Row 42 (a)).

## §0 — the gate

**It is the Panel's:** it decides *to whom the Trust discloses* information about a person (a deceased member's cause of death and illness, as
told by the family). The Panel has ruled who sees the NEIGHBOURS' answers to the same questions; it has ⛔ said who sees the FAMILY's. We
are giving the family's answers EXACTLY the same readers — no new reader — so we are building it and asking you to confirm, ⛔ waiting.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into
> `.decision-log.md` as a new decision id. ⭐ Everything below is then kept **unedited** as the question
> **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The question

**In one sentence:** when the inspector visits the family and asks them how the member died and which illness they had, may the family's answers be
seen by the same staff who already see the neighbours' answers to those questions — and by no one else?

**Why it cannot be decided without you:** you ruled who sees the neighbours' answers; nobody has ruled who sees the family's.

## The one fact that decides it

**The readers do not change.** Every person who would see the family's answers already sees the neighbours' answers to the same two questions, on the
same claim, at the same step, under the same rule that hides them from someone who has their own visit pending. The family's answers are hidden from
the family, the person who filed the claim, the nominee, every other member and the public, exactly as the neighbours' are.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Same readers as the neighbours' answers** (the District Admin and the district's verifiers; whoever approves the claim at a later step, for that claim at that step only). The inspector who typed an answer can read it back. | Staff deciding a claim see the family's own account of how the member died beside the neighbours' — as background only. | The family's health information about the deceased reaches the approvers. It is never a reason to hold, flag or refuse a claim, but they do see it. |
| **B** | **Stored and compared only — no one reads it** except the inspector who typed it. The inspector is still told when the family and a neighbour differ. | Approvers never see the family's account. | The family's answer becomes write-only: the staff you meant it for (*"context"*) never see it. The neighbours' account is then the only one in front of them. |
| **C** | **Fewer readers than the neighbours'** (e.g. only the District Admin). | One person sees it. | Two different reader lists for one section of the screen; the later approvers decide without the family's account. |

**Our reading:** **A** — **because** your ruling on the neighbours' answers said they are shown *"to staff as context only"*, and the inspector asks
the family *"the same question"* precisely so the two accounts can be set side by side. Option A adds no reader. If you prefer B or C we will change it
before anything goes live.

---

# What is at stake right now

- **Live today:** nothing. The family's cause and illness questions are not even asked until counsel's legal basis is recorded.
- **Blocked:** nothing. The story is built as Option A; a different answer changes one place in the code before go-live.
- **If nothing is decided:** the go-live record (Row 42 (d)) stays open until you answer or BigDev records that it went live without your answer.

---

# How much to trust this note

- **Earlier versions of this question:** none — this is the first time it is put.
- **Corrected in this note:** none.
- **Still uncertain:** whether counsel's basis (still to come) will itself limit who may read health information given by a family; if it does, counsel's
  answer narrows Option A, and we will come back to you.

---

# In plain English

When a member dies and the neighbours are asked how they died, you decided which staff may read those answers. The inspector now asks the family the
same questions, so the two accounts can be compared. We suggest that the family's answers go to exactly the same staff — no one new — and that they
remain background only: they never delay, flag or refuse a claim. We are building it that way; please tell us if you want fewer people to see them.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-10-310` **CF2:** *"Who sees the neighbours' answers: the District Admin (and the district's verifiers); whoever approves the claim at a later
> step — in practice the Pariwar Admin at the final vote or an R9 vote, or the Super Admin — for that claim at that step only; the inspector ⛔ nothing
> before completing their own record, then only where the family and the neighbours differ, ⛔ never who said it, asking the family again open-ended; the
> helpline operator only the caller's own answers; ⛔ never the family, the claimant, the nominee, the other neighbours, any other member, the public."*

> `2026-10-10-304` **Q3 A:** *"⭐ As put in Q3, the **inspector asks the family the same question**, so the inspector is shown only where the two
> differ."* **Q4 A:** *"**context only, ⛔ never compared automatically with the member's medical declaration; counsel confirms the legal basis before
> go-live**. ⭐ As put, the inspector asks the family the same."*

## E2 — What is NOT ratified

Who reads the FAMILY's answers to the cause and illness questions. CF2 lists readers of the neighbours' answers only. `-304` says the family is asked;
it is silent on who reads what they said.

## E3 — What the code actually does

Story 6.32 (`6-32-inspector-questionnaire-at-the-ground-inspection.md`, IQ7 / AC8): the family's answers ride the ONE assembler that builds the
neighbours' section (`assemblePeerSection`, `apps/api/src/modules/claims/peer-answers-assembler.ts`) AFTER its own-visit hide, so a hidden reader sees
the whole section absent; ⛔ on the claim-wide inspection list; a route-matrix test proves the readers. Each read is audited as the section's read already
is. NOT YET BUILT at the time of writing — the story is `ready-for-dev`.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision 2026-10-10-310' .decision-log.md          # CF2 — the neighbours' readers
grep -n '^### Decision 2026-10-10-304' .decision-log.md          # Q3 A / Q4 A
grep -n '^### Decision 2026-10-28-413' .decision-log.md          # IQ7 (A)
grep -n 'isPeerSectionHiddenFromActor' apps/api/src/modules/claims/peer-answers-assembler.ts
```
