# Trustee Panel routing note — a claim on a living member must not lock their nominee for life

> **§0 gate — passed (2026-09-20).** This is the Panel's: it is about **whether a living person can change their own nominee.** Stripped of
> every citation the sentence is *"if a claim is wrongly started for someone who is still alive, and it is refused — should their nominee stay
> locked for the rest of their life?"* — not a question we would answer alone in front of a trustee. Not mixed.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new decision
> id. Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** If a claim is started for a member who is **still alive**, and that claim is then refused, **should that member's
nominee stay locked** for the rest of their life?

**Why it cannot be decided without you:** You ruled that the nominee is locked from the moment a claim is filed, because the Trust cannot
know of a death before that. You also ruled that the nominee may be changed *"as long as member is alive."* Those two rulings meet in one
case nobody put to you: a claim that turns out to be **about a living person.**

## The one fact that decides it

**A claim can be started for any member — the system checks only that the member exists.** The helpline does not ask for proof of a death
before it opens a claim. So a **mistaken or mischievous** claim on a living person is possible; and because the lock begins **at the first
claim, whatever happens to it afterwards**, that person's nominee stays locked **even after the claim is refused.** They could still fix a
genuine typing mistake through the two-step correction — but they could **never** name a different person.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Accept it.** The lock stays; the living member keeps only the two-step correction for honest mistakes. | Nothing changes in the software. | A living person **loses the right to change their nominee permanently**, because of someone else's error — a divorce, a death in the family or a change of heart could never be recorded. |
| **B** | **A release route.** When a claim is found to be **about a living member**, the lock is lifted and the nominee can be changed again. | The living member's right comes back. | It needs a **new kind of claim outcome** ("member found alive") that does not exist today, and a **staff judgement** to record it; and any record of a release must itself be checked so it cannot be used to unlock a nominee after a real death. |
| **C** | **Start the lock only when the death is confirmed** — when the death certificate is accepted, not when the claim is filed. | A wrongly started claim never locks anyone. | It **contradicts your ruling** that the lock begins at the first claim, and it leaves a **window** between the filing and the confirmation in which the nominee can still be changed — the very window you closed. |

**Our reading: B** — **because** a living person should not lose a right through someone else's mistake, and B is the only option that
keeps both your rulings. **Cost, honestly:** it needs a new outcome and a careful record of it. ⚠ **This is separable:** until B is built, **A**
applies — so it is safe to defer, provided the limit is known.

---

# What is at stake right now

- **Live today:** **Nothing** — the lock is not built and the code is not in production. This is precautionary.
- **Blocked:** **Nothing.** The lock can be built as ruled.
- **If nothing is decided:** **A** stands, and the story records it as an **accepted limitation.**

---

# How much to trust this note

- **Earlier versions of this question:** none sent. It was found by a review of the story, **not by a real case.**
- **Corrected in this note:** none.
- **Still uncertain:**
  - We have **not** traced every path that opens a claim — only the helpline route's check (existence only) and the member-app route's
    one-time code. Another check may already prevent a claim on a living member.
  - We do **not** know how likely a claim on a living member is in practice.
  - Whether the **claim-refused** outcome is the right place to record "found alive" is a design question we have not answered.

---

# In plain English

Once any claim is filed for a member, that member's nominee is locked, because the Trust cannot otherwise know of a death. But a claim can
be opened for anyone — even a person who is still alive. If it is refused, the lock **stays**, and that person can never name a different
nominee.

We see three ways. **Accept it** (nothing to build, but a living person permanently loses a right). **Add a release** for the case where a
claim turns out to be about a living member (fair, but it needs a new outcome and a careful record). Or **start the lock only when the death
certificate is accepted** (fixes the problem, but reopens the window you closed).

We suggest the **release**, because a living person should not lose a right through someone else's error. Until it is built, the lock stays,
and we record that. If this paragraph and the evidence below ever disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-20-234` (V), Trustee-ratified:**
> *"We cannot know for sure that person has died unless claim was filed. … Until claim has not been filed, system should keep the timeline of nominee change, allowing nominee change until claim has been filed."*

**`2026-09-20-234` (X), Trustee-ratified:**
> *"Yes nominee should cover names, relationship, mobile, address, split. Yes all of them can be changed as long as member is alive."*

**`2026-09-20-233`, Trustee-ratified:**
> *"After member has died nominee they declared cannot be changed."*

## E2 — What is NOT ratified

- **What happens to the lock when the claim turns out to be about a living member.** Not ruled.
- **Whether a claim may be opened without any proof of a death.** Not ruled — it is how the system works today.

## E3 — What the code actually does

- **The helpline checks only that the member exists.** `claims.helpline.handlers.ts`: `if (!(await memberDomain.memberExists(...))) throw new NotFoundError('Member not found', …)` — then it opens the intake. (E4.2)
- **A new claim after a refusal is allowed on purpose** (`getClaimByDeceasedMember`'s comment, *"a fresh claim after `denied`"*). (E4.3)
- **The lock does not exist yet.** Its design (Story 6.20, D3) keys to *"any claim was ever filed for this member as the deceased"*, with no state filter — chosen on purpose, because the alternatives (the frozen-account marker, or the "existing claim" read) both forget a settled or refused claim.
- ⚠ **Inference:** the member-app route needs a one-time code sent to the nominee's mobile; whether a living member's account can be used that way was **not traced.**

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 the rulings, verbatim
grep -c "Yes all of them can be changed as long as member is alive" .decision-log.md            # -> 1
grep -c "allowing nominee change until claim has been filed" .decision-log.md                    # -> 1

# E4.2 the helpline checks only existence
grep -n "memberExists" apps/api/src/modules/claims/claims.helpline.handlers.ts                    # -> line 86: the only guard before intake (then a 404 if absent); no proof-of-death check

# E4.3 a fresh claim after a refusal is allowed
grep -n "fresh claim after" packages/domain/src/claim/read.ts                                    # -> line 120
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (a release route does not decide how a "found alive" finding is evidenced).
4. Discharge the item wherever it is carried — Story 6.20's open question P5 — and mark it DISCHARGED, never delete it.
5. If implementation follows (option B), it needs a ROW: a "found alive" claim outcome and the release of the lock. -->
