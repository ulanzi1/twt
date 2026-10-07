# Trustee Panel routing note — you ruled the refused person "is told the refusal can be appealed": how?

> **§0 gate — passed (2026-10-07).** This is the Panel's: it decides whether the Trust sends a **new message** to a person — the one whose
> claim was refused on suspicion — and on what basis. Your ruling `2026-10-07-291` (Q1 A) said that person *"is told the refusal can be
> appealed"*; it did ⛔ not say how, and we found that ⛔ nothing in the system tells anyone a claim was refused at all.
> ⭐ **A confirm-shaped question, ⛔ not a blocker:** Story 6.24 builds option A meanwhile, so ⛔ nothing waits on this note.
> ⚠ **Deliberately ⛔ not asked**, because it is ours: building a helpline screen that shows the operator the last date to appeal and lets
> the operator file the appeal for the family (the operator already files appeals on a family's behalf; the screen was missing).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into
> `.decision-log.md` as a new decision id. ⭐ Everything below is then kept **unedited** as the question
> **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The question

**In one sentence:** When a claim is refused because the nominee was changed after the death, the refused person now has 90 days to
appeal and, by your ruling, *"is told the refusal can be appealed"* — should the Trust **text** them that, or is it enough that staff tell
them (when they call the helpline, or the helpline calls them)?

**Why it cannot be decided without you:** a text is a new message to a person, and here the person is the one suspected of changing the
nominee. Whether and how the Trust writes to them is a decision about what it tells people, ⛔ not about how the system works.

## The one fact that decides it

⭐ **Today the system tells ⛔ nobody that a claim was refused.** So unless they are texted, the refused person learns of the refusal — and
of the 90 days — only by calling the helpline or being called. A person who never calls can lose the appeal without knowing the clock ran.

⚠ And the number we would text is one **they gave themselves** when they filed the claim, for being contacted about it — ⛔ not a number
someone else gave (FQ7's case).

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | ⛔ No text. The helpline screen shows the last date to appeal; staff tell the person when they call or are called. | The refused person learns of the time limit only through the helpline. | Someone who never calls may let the 90 days pass without knowing. |
| **B** | **One text** to the number the person gave when they filed the refused claim: *"The claim for [member] could not go ahead. It can be appealed until [date]. Please call the helpline."* — accusing no one. | The refused person is told the date directly, once. | A third new text (registered first — DLT), and the person told is the one suspected; the number may be out of date. Counsel confirms the basis, as for FQ7's text. |

**Our reading:** **B** — **because** your ruling made the 90 days fair on the condition that the person *"is told"*, and only a message
reaches someone who does not call. The number is the one they gave for exactly this claim, and the words accuse no one.

---

# What is at stake right now

- **Live today:** ⛔ nothing (⛔ not in production).
- **Blocked:** ⛔ nothing — Story 6.24 builds A meanwhile (the helpline screen), and B adds one more text to machinery the story already builds.
- **If nothing is decided:** the system goes live on A.

---

# How much to trust this note

- **Earlier versions of this question:** `-291`'s note offered *"is told the refusal can be appealed"* as part of option A's description,
  without saying how. ⚠ Our first reading of it assumed the existing appeal screens would tell them — a fresh-context check found ⛔ none of
  those screens is reachable today. Our second attempt, a text to everyone on the refused claim's contact list, was caught before it was
  built: that list would have reached the **true nominee** and ⛔ not the refused person.
- **Corrected in this note:** ⛔ nothing yet.
- **Still uncertain:** whether every refused filer gave a usable number (the helpline path asks for one; an old number may be dead).

---

# In plain English

You said the person refused on suspicion gets 90 days to appeal and must be told they can. Right now the system tells nobody about a
refusal. We suggest one short text to the number that person gave when they filed — saying the claim could not go ahead, that it can be
appealed until a date, and to call the helpline. Without it, only people who call the helpline find out.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim
> **`2026-10-07-291` Q1 — A.** *"… The refused person has a fixed time to appeal, **and is told the refusal can be appealed**."*
> **`2026-09-28-262` FQ7 — B.** the text to the nominee on record at the death (⛔ not the refused person).

## E2 — What is NOT ratified
- How the refused person is told — `-291`'s reading (*"the existing appeal surfaces show the last date"*) rested on a false premise and is
  amended by Story 6.24's author-commit.
- Any message to the refused person (⛔ none was put).

## E3 — What the code actually does (at `6bb79afd`)
- ⛔ No message on a refusal: ⛔ no `dispatch()` / SMS call in the claims, nominee or life-events modules (FQ6's Gap 2).
- The member appeal routes answer 404 for every production claim, and the member appeal card is mounted on ⛔ no screen
  (`deferred-work.md`, *"The member appeal routes 404 for every production claim…"*).
- The on-behalf appeal route exists (`apps/api/src/modules/claims/claims.appeal.routes.ts:144-148`, gated by `claim.file`, which the
  helpline operator holds — `packages/domain/src/rbac/roles.ts:709-711`), but ⛔ no admin screen calls it.
- `readCorrectionRecipients` (`packages/domain/src/claim/correction-chase.ts:601-653`) returns the claim's effective nominees and adds the
  claimant only when the claimant is none of them — so it is ⛔ not a way to reach the refused filer.

## E4 — Commands to re-verify every claim
```
grep -n '^### Decision .*-291' .decision-log.md
sed -n 144,148p apps/api/src/modules/claims/claims.appeal.routes.ts
sed -n 705,712p packages/domain/src/rbac/roles.ts
sed -n 601,653p packages/domain/src/claim/correction-chase.ts
grep -n "member appeal routes 404" _bmad-output/implementation-artifacts/deferred-work.md
```
