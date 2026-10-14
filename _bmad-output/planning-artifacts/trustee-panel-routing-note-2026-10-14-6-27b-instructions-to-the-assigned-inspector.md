# Trustee Panel routing note — 2026-10-14 — Story 6.27b: may the person sent on a ground visit read the instructions written for them?

> **Status: WRITTEN, ⛔ not sent.** Raised by the code review of Story 6.27b (round 2, item Y2). BigDev chose to put option B to the
> Panel and to keep option A in the code until the Panel rules. ⛔ No engineering choice is bundled into this note.

---

## §0 — the gate

⭐ **The Panel's.** Stripped of citations, the question is: *"A staff member is sent on a ground visit, or given an instruction, on a
claim whose neighbours' answers they are not yet allowed to see. May they read the instruction written for them, knowing the person who
wrote it could see those answers?"* That is what the Trust discloses to a staff member about the neighbours, and you ratified who sees
the neighbours' answers yourselves (`-310` CF2). Saying *yes* would widen that ratified rule; only you can do that.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. ⭐ Everything below is then kept **unedited** as the question **as it was put**.

---

# The question

**In one sentence:** When a staff member has been sent on a ground visit to a claim — and so must not yet see what the neighbours said —
may they still read the instructions written for them: the visit briefing from the person who scheduled the visit, and a Super Admin's
direction addressed to them about that claim?

**Why it cannot be decided without you:** you ruled that the person sent on the visit sees *nothing* of the neighbours' answers before
completing their own record. The briefing and the direction are written by people who CAN see those answers. Letting the visitor read
them means anything those people chose to write — including what a neighbour said — reaches the visitor early.

## The one fact that decides it

⭐ **The instruction's author can see the neighbours' answers, and the system cannot tell what they wrote.** A District Admin who
schedules a visit *because* a neighbour said the member is alive would naturally write why in the briefing. The system cannot read the
note to check; it can only show it or not.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** (in the code today) | The visitor sees ⛔ instruction text until their own visit is completed or given to someone else; they see where to go and whom to contact. | The visitor goes in blind, as the rule intends. | The visitor loses the briefing for their own visit; a Super Admin who sends a direction to that person gets no useful answer (they must send it to someone else). |
| **B** | The visitor reads the briefing and any direction addressed to them. | The visitor can do what they are asked. | Whatever the author wrote reaches the visitor early — possibly a neighbour's answer. This widens your ruling. |
| **C** | As B, but the writing box carries a warning: *"The person you are sending has not seen the neighbours' answers. Do not repeat them here."* | The visitor can do what they are asked; staff are reminded of the rule each time. | Relies on staff following the warning; the system still cannot check. Still a widening, though a narrower one. |

**Our reading:** **C** — **because** the visitor needs instructions to do the visit well, and the risk in B comes from a natural habit
(explaining *why*) that a plain warning at the point of writing addresses. A remains the safe choice if you prefer the ruling unchanged.

---

# What is at stake right now

- **Live today:** nothing. The system is not in production; the code withholds both instructions (option A).
- **Blocked:** nothing. Story 6.27b ships with option A; a later change would build B or C if you choose it.
- **If nothing is decided:** option A stays — the visitor works without the briefing, and directions to that person cannot be read by them.

---

# How much to trust this note

- **Earlier versions of this question:** none. During the review the code briefly showed directions to the person they were addressed
  to (an implementer's choice, recorded as "the mechanism needs it"); the next pass withheld them under BigDev's "every staff note"
  ruling (X1 A). This note exists because that reversal had a real cost.
- **Corrected in this note:** none.
- **Still uncertain:** how often a District Admin would in practice write a neighbour's answer into a briefing. Option C's warning is our
  suggestion, not something you have seen.

---

# In plain English

When someone is sent to visit a family to check a death claim, you decided they should go in without knowing what the neighbours said,
so their own findings are honest. But the person who sends them, and a senior admin who gives them instructions, can see what the
neighbours said — and might mention it in the instructions. Today the system hides those instructions from the visitor to be safe, which
means the visitor goes without a briefing. We suggest letting the visitor read their instructions, with a reminder to the writer not to
repeat what the neighbours said. If you would rather keep the visitor fully blind, nothing needs to change.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-10-310` CF2: *"Who sees the neighbours' answers: the District Admin (and the district's verifiers); whoever approves the claim
> at a later step — in practice the Pariwar Admin at the final vote or an R9 vote, or the Super Admin — for that claim at that step only;
> the inspector ⛔ nothing before completing their own record, then only where the family and the neighbours differ, ⛔ never who said
> it, asking the family again open-ended; the helpline operator only the caller's own answers; ⛔ never the family, the claimant, the
> nominee, the other neighbours, any other member, the public."*

## E2 — What is NOT ratified

No ruling covers staff-written free text about the claim (instructions, notes) reaching the inspector. CF2 governs the neighbours'
ANSWERS. Withholding instructions (A) MATCHES CF2's "nothing"; showing them (B, C) WIDENS it wherever an author repeats an answer.
BigDev's author-commits in Story 6.27b's review (D1 B, V1 A, X1 A) withhold staff notes from a reader whose own visit is pending; they
narrow, ⛔ widen, and are recorded in the story file.

## E3 — What the code actually does (as of this note)

- The visit briefing is the free-text `notes` on the visit record, written at scheduling; for a reader whose own visit on the claim is
  pending it is withheld (`apps/api/src/modules/claims/claims.ground-inspection.handlers.ts`, `notesWithheld`; the console's inspection
  section in `claims.verifier-console.handlers.ts`). Location and family contact stay visible.
- A Super Admin's direction (`kind` `restart_family_reminders` | `other`, with free text) in the directee's own inbox: its text is
  withheld from a directee whose own visit on that claim is pending unless they wrote it (`claims.correction-escalation.handlers.ts`,
  `directionWithheld`). The directee can still record a response (review item Y2 records this cost).
- ⭐ Inference, labelled: an author writing a neighbour's answer into an instruction is plausible, not observed — the system is not live.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-310' .decision-log.md
grep -n "CF2 — yes" .decision-log.md
grep -n "notesWithheld" apps/api/src/modules/claims/claims.ground-inspection.handlers.ts
grep -n "directionWithheld" apps/api/src/modules/claims/claims.correction-escalation.handlers.ts
grep -n "Y2 — LOW" _bmad-output/implementation-artifacts/6-27b-peer-mesh-warnings-wait-and-approvers-view.md
```
