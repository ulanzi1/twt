# Trustee Panel routing note — when the Pariwar Admin declines to close a claim, what happens next?

> **§0 gate — passed (2026-09-20).** This is the Panel's: it is about **what happens to a family's claim, and who decides,** when the
> person who would close it declines. Stripped of citations: *"if the Pariwar Admin says 'do not close this claim', what does the
> Super Admin then decide — and what happens to the claim in the meantime?"* — a question we should not answer alone. ⚠ Not mixed:
> the screens and code are ours; **only the decision and the waiting** are asked.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** When the Pariwar Admin **declines** to approve closing a claim and passes it to the Super Admin, **what does the
Super Admin decide — and what happens to the claim, and to the reminders, while it waits?**

**Why it cannot be decided without you:** You ruled that the Pariwar Admin may decline, with a note, and that the decline goes to the
Super Admin. You gave the Super Admin a **role** in the sentence but not a **decision** to make. Whatever we build here decides how a
family's claim can end, so it has to be yours.

## The one fact that decides it

**A claim that has been sent back cannot be approved, refused or included in the campaign until it is corrected — and a decline
changes none of that.** The claim stays stuck exactly as before. So unless the Super Admin can **do something**, a declined closure
simply returns the claim to waiting, with nobody chasing it and no further exit.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The Super Admin decides: close it, or keep it open.** If kept open, a **fresh 90-day period** starts and the reminders begin again. | A stuck claim always has an exit, and a family who might still answer gets another full chance. | It can **loop**: each decline restarts 90 days, so a claim nobody wants to close could wait years. |
| **B** | **The Super Admin decides: close it, or keep it open with no further reminders** until the family corrects it. | The Super Admin can end a claim; otherwise it waits quietly. | A kept-open claim is **chased by no one** — back to waiting forever, only now with a Super Admin's signature on it. |
| **C** | **The Super Admin can decide the whole claim** — close it, or refuse it for another reason, or **approve it despite the name problem.** | Maximum flexibility. | **It can bypass the name check** you ruled on: a claim with a name mismatch could be approved without the District Admin's fresh check. A large new power, well beyond what the ruling says. |

**Our reading: A** — **because** it gives the Super Admin a real decision without letting anyone skip the name check, and the loop is
visible: every decline is recorded, so a claim that keeps being kept open is easy to see. **Cost, honestly:** it can repeat. ⚠
**Separable:** if you prefer B, the only change is that no new period and no new reminders start after "keep open".

---

# What is at stake right now

- **Live today:** **Nothing** — the closure has not been built.
- **Blocked:** the **decline branch** and the **Super Admin's screen**. The request, the Pariwar Admin's approval and the reminders can
  proceed without it.
- **If nothing is decided:** the story ships the decline **as far as** "the claim stays sent-back, the Super Admin sees it in a list,
  and there is no decision available" — and says so. A declined claim would then just wait.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. It was first listed as an open point (K) when your ruling was recorded.
- **Corrected in this note:** none. ⚠ We did not, at first, notice that a decline leaves the claim under the same block; checking the
  code showed it does.
- **Still uncertain:** whether you expect the Super Admin to see **the family's** correspondence (the reminders and letters) when
  deciding — we assume yes, from the record; you did not say. And we have not asked the Super Admin what they would want to see.

---

# In plain English

If the Pariwar Admin declines to close a claim, the claim goes to the Super Admin. But a claim that has been sent back is stuck — it
cannot be approved, refused or started until the family corrects it. So a decline, by itself, changes nothing: the claim goes on
waiting.

There are three ways to give the Super Admin something to decide. **Close it, or keep it open for another 90 days with new reminders**
(a real exit, though it can repeat). **Close it, or keep it open without chasing anyone** (simple, but back to waiting forever). Or
**let the Super Admin decide the whole claim** (the most flexible, but it could let a name problem be skipped).

We suggest the first, because it gives a real decision without letting anyone bypass the name check, and every repeat is recorded. If
this paragraph and the evidence below ever disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-20-232` (H), Trustee-ratified:**
> *"Yes pariwar Admin can decline to approve a closure with note, escalate it to Superadmin."*

**`2026-09-20-231` (B), Trustee-ratified:**
> *"yes, you are right, system should not auto close instead it remind the District Admin for closure, following with Pariwar admin approves the closure."*

**`2026-09-20-227` clause 2, Trustee-ratified:** a return is **not a denial**, and the claim then goes back to the District Admin for correction.

## E2 — What is NOT ratified

- **What the Super Admin decides.** Not ruled — `-232` names the Super Admin only as the place the decline goes.
- **What happens to the claim and its reminders after a decline.** Not ruled.
- **Whether a declined closure starts a new 90-day period.** Not ruled.

## E3 — What the code actually does

- **A live return blocks both approving and refusing the claim.** `voteOnFrozenClaim` throws `ClaimAwaitingCorrectionError` until the claim is corrected, before it looks at whether the vote is an approval or a refusal (E4.2). The closure is a **new** action; it does not change this.
- **The campaign start skips a returned claim, one claim at a time** — the others proceed (E4.3).
- **The Super Admin role exists** and receives the whole permission catalogue automatically; a Super-Admin-only permission has a precedent (`pariwar.manage_drive_target_visibility`). (E4.4)

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 the ruling, verbatim
grep -n "Yes pariwar Admin can decline" .decision-log.md                       # -> found, in -232's H clause

# E4.2 the vote is blocked while a return is live
grep -n "ClaimAwaitingCorrectionError" packages/domain/src/claim/state-trustee-decision-persist.ts
#   -> the class (line 241) and the throw (line 494), which comes BEFORE the outcome is read

# E4.3 the campaign start skips a returned claim per claim
grep -n "hasLiveReturnRow(db, input.pariwarId, candidate" packages/domain/src/claim/state-trustee-decision-persist.ts   # -> line 1020, a `continue`

# E4.4 the Super Admin role
grep -n "'super_admin'" packages/domain/src/rbac/roles.ts                       # -> found
grep -n "manage_drive_target_visibility" packages/domain/src/rbac/permissions.ts # -> found ("super_admin ONLY")
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (a ruling on the Super Admin's decision does not settle re-filing — see the sibling note).
4. Discharge the item wherever it is carried — Story 6.19's open question K — and mark it DISCHARGED, never delete it.
5. If implementation follows, it needs a ROW (the Super Admin surface and the decline branch of Story 6.19). -->
