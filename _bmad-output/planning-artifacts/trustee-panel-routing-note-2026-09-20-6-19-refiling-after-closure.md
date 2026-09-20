# Trustee Panel routing note — may a family whose claim was closed for silence file a new one?

> **§0 gate — passed (2026-09-20).** This is the Panel's: it is about **what a family is owed after their claim has been closed.**
> Stripped of citations: *"if we close a family's claim because they never answered, can they simply start again?"* — a question we
> would not settle alone in front of a trustee. Not mixed.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** If a claim is closed because the family never answered, **may the family start a new claim for the same
death?**

**Why it cannot be decided without you:** You ruled that a claim closed for no response **cannot be appealed**. That closes one door.
The system, however, has a **separate** door that nobody has looked at in this light: it deliberately lets a family file a fresh
claim after a refusal. Whether that second door stays open for a closed claim is a question about what the family is owed.

## The one fact that decides it

**Today the system lets a family file a new claim for the same death after any refusal — on purpose.** The intake rule says a death
whose earlier claim reached a final outcome *"must be able to re-file (e.g. a fresh claim after `denied`)"*. So unless we decide
otherwise, **"cannot be appealed" does not mean "cannot be tried again"** — re-filing would be the family's way back, and nothing in
your ruling says whether that is intended.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Leave it as it is:** a family may file a new claim; it is decided on its own merits and does not undo the closure. | A family we failed to reach still has a route back. | It **weakens "cannot be appealed"**: a family gets a second look simply by filing again — and they start from the beginning (new documents, new details), which is a burden at a time of grief. |
| **B** | **Block it:** a claim closed for silence prevents a new claim for that death. | The closure is genuinely final, as *"not appealable"* suggests. | It can be **harsh**: a bereaved family who missed our messages — on an old phone, a moved address — would have **no remedy at all.** |
| **C** | **Allow it only through a person:** a new claim may be filed only with the District Admin's or the helpline's confirmation, with a note. | A route back exists, but not by accident; someone looks at why. | More work for staff, and a **judgement call** each time about when a second attempt is fair. |

**Our reading: A** — **because** removing the last route from a family we could not reach is the harsher error, and the ruling was
about the *appeal process*, not about the right to try again. **Cost, honestly:** it does soften the finality of the closure. ⚠
**Separable:** if you choose B or C, the claim-intake rule needs one added condition; nothing else changes.

---

# What is at stake right now

- **Live today:** **Nothing** — the closure has not been built and no claim has been closed this way.
- **Blocked:** the **scope** of the rule that a closed claim cannot be appealed. It does not block building the closure itself.
- **If nothing is decided:** the story ships with **A** (the existing rule is untouched) and says so.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. It was first raised by our own research as an unaddressed hazard (Q).
- **Corrected in this note:** none.
- **Still uncertain:**
  - We know the *intake* rule allows re-filing; we did **not** trace whether some other check (for example on the nominee, or on the
    payout) would in practice stop a second claim for the same death.
  - We do not know how often a family would do this. It is a design question, not something we have seen happen.
  - Whether the Niyamavali says anything about a second claim is **not known** — the legal documents are not in the repository.

---

# In plain English

You ruled that a claim closed because the family never answered cannot be appealed. But the system has another rule, made on purpose,
that lets a family file a **new** claim after any refusal. So a family we closed could simply start again — and nothing in your ruling
says whether that is meant to be possible.

We see three ways. **Leave it** (a family we could not reach still has a way back, but the closure is not really final). **Block it**
(the closure is final, but a family who missed our messages has no remedy). Or **allow it only with a person's confirmation** (a way
back that someone looks at, at the cost of staff time and a judgement each time).

We suggest **leaving it**, because it is worse to remove the last route from a family we could not reach than to let them try again.
If this paragraph and the evidence below ever disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-20-231` (A), Trustee-ratified:**
> *"Yes it's the second refusal"* — the closure for no response is the second refusal and, per `-230` clause 5, *"appealable after first refusal, not after second"*.

**`2026-09-20-230` clause 5, Trustee-ratified:**
> *"Yes appealable after first refusal, not after second - after second no response to a correction request."*

**Story 6.16 (the appeal flow), decision D-F:**
> *"A claim has at most ONE appeal journey, ever — enforced by an unconditional unique constraint on `claim_appeals.claim_case_id`."*

## E2 — What is NOT ratified

- **Whether a family whose claim was closed for silence may file a new claim.** Not ruled.
- **Whether "not appealable" was meant to mean "not re-fileable".** Not ruled.

## E3 — What the code actually does

- **The intake rule deliberately allows re-filing after a refusal.** `getClaimByDeceasedMember` (`packages/domain/src/claim/read.ts`) filters out the final states, with the comment: *"a death whose earlier claim already reached a terminal outcome must be able to re-file (e.g. a fresh claim after `denied`)"*. (E4.2)
- **The closure, as designed, ends in the refused state** — the same final state an ordinary refusal reaches — plus a marker that stops an appeal. So the re-file rule would treat it exactly like any other refusal. ⚠ *This is the design in the story, not yet built.*

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 the ruling, verbatim
grep -n "Yes it's the second refusal" .decision-log.md                          # -> -231's A clause (found)
grep -n "appealable after first refusal" .decision-log.md                       # -> -230's clause 5 (found)

# E4.2 the re-file rule, verbatim
sed -n 118,121p packages/domain/src/claim/read.ts
#   -> "…must be able to re-file (e.g. a fresh claim after `denied`), so a terminal row must not be handed back as 'the existing intake.'"

# E4.3 one appeal journey per claim
grep -n "D-F — EXACTLY ONE appeal journey" _bmad-output/implementation-artifacts/6-16-3-stage-claim-denial-appeal-flow-reversed-denial-sahyog-vivran-publish-hook.md   # -> line 36 (found)
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (a ruling on re-filing does not settle what happens to the first claim's documents).
4. Discharge the item wherever it is carried — Story 6.19's open question Q — and mark it DISCHARGED, never delete it.
5. If implementation follows (option B or C), it needs a ROW: one added condition in the claim-intake rule and its tests. -->
