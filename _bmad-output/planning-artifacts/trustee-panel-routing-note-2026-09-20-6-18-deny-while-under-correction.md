# Trustee Panel routing note — a claim sent back for a name correction: may it be refused while it waits?

> **§0 gate — passed (2026-09-20).** This is the Panel's, not ours: it is about **what the Trust owes a family whose
> claim has been sent back**. Stripped of every citation, the sentence is *"if the family never fixes the name problem,
> may the claim be refused, or must it wait as long as it takes?"* — a sentence we would not want to answer alone in
> front of a trustee. ⚠ It was **mixed**, so it is split: the Panel is asked **only** the refusal question. The
> engineering half (that a claim cannot be both "sent back" and "sent to the special panel" at the same time, and how a
> sent-back claim is released once corrected) is being decided by BigDev in the story and is **not** asked here.

> ## ✅ PANEL RULED — 2026-09-20 — recorded as `2026-09-20-229`
>
> **Ruled by Dhiraj Rahul + Kalpana Bharti, relayed by BigDev — OPTION C, verbatim (typos as relayed):**
> *"option C, Allow refusal only after a waiting period of 90 days with system sending and recording that enough reminder
> has been sent. For intial 7 days daily, therafter twice a week for a month, thereafter once a week."*
>
> **What this ruling does NOT cover** (put back to the Panel as follow-ups; full list in `2026-09-20-229`): who receives the
> reminders and by which channel; when the 90 days start and whether a second return restarts them; what "enough" means and
> what a failed delivery does; whether reminders continue after day 90; whether a refusal after the period is appealable; which
> reason it carries; calendar vs working days.
>
> ⭐ **Follow-up answers, 2026-09-20, recorded as `2026-09-20-230`** — who receives the reminders (both), when the clock starts (the day the claim was sent back; a second return restarts it), what "enough" means and the dead-number letters, automatic closure at day 90, and appealability — with **two questions still open** (A and B in that entry). ⭐ **Second round, same day, recorded as `2026-09-20-231`:** the closure is **not automatic** — the system reminds the District Admin and the Pariwar Admin approves it (this supersedes `-230`'s "auto closure"); the closure is the "second refusal", **not appealable**; and the Panel's premise that a postal address is mandatory at claim filing does **not** match the system (it is optional at nominee declaration and absent from claim filing) — a new question, **G**.
>
> ⭐ Everything **below this block is kept UNEDITED** — it is the question as it was put.

---

# The question

**In one sentence:** When a claim has been sent back to the District Admin because of a problem with the name on the
bank account, and the family never corrects it, may the Pariwar Admin refuse the claim — or must it wait for as long as it
takes?

**Why it cannot be decided without you:** Your earlier rulings settled two things: a name problem is never a reason to
refuse a claim, and a claim the Pariwar Admin will not approve is sent back to the District Admin, who contacts the family
and asks for a correction. They did not say what happens when the correction never comes, and they did not say whether the
Pariwar Admin may refuse a sent-back claim for a *different* reason — for example, that the documents turn out to be
inadequate. The system has been built to make such a claim wait. That is a choice about what a family is owed, and it was
made by the builders, not by you.

## The one fact that decides it

**Today a sent-back claim can leave that state in exactly one way: the family corrects the details and the District Admin
checks again.** There is no time limit, no reminder and no other exit — and the system cannot tell a refusal made "because
of the name" from a refusal made for another reason, because the Pariwar Admin picks a reason from a list that includes a
catch-all ("other") with a free-text note.

So the choice is stark: **if refusal is allowed, "never refused over a name" rests on the Pariwar Admin's own care, not on
anything the system enforces; if refusal is forbidden, a claim whose family never answers stays open forever.**

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Keep it as built.** A sent-back claim waits until it is corrected; the Pariwar Admin cannot refuse it in the meantime. | A family that never answers keeps an open claim; no refusal can reach them. "Never refused over a name" is enforced by the system, not by anyone's judgement. | A claim can sit open with **no one able to close it** — there is no time limit anywhere. It also means a claim that turns out to have a genuine, unrelated ground for refusal (say, inadequate documents) **cannot be refused** until the name problem is fixed. It stays on the pending lists indefinitely, and nothing today shows how long it has been waiting. |
| **B** | **Allow refusal at any time.** The Pariwar Admin may refuse a sent-back claim, giving one of the usual reasons; a refusal ends the sent-back state. | An unanswered claim can be closed. | "Never refused over a name" becomes a **promise of conduct, not a control**: the system cannot see why a refusal was made, and a "clerical difference" family could be refused under another label. |
| **C** | **Allow refusal only after a waiting period the Panel names** (for example, N days after the claim was sent back). | An unanswered claim is closed eventually; a family has a guaranteed window to correct. | **The Panel must choose the period.** The system does not track how long a claim has been sent back, so it must be built. And after the period, the same enforcement gap as B applies. |

**Our reading: A for now — because** it is the only option where the ruling that a name problem never causes a refusal is
kept by the system itself, and the cost of A (a stuck claim) is visible and recoverable, whereas the cost of B and C (a
family refused over a name that was only clerical) is not undone by a later correction. ⚠ **This is separable:** if the
Panel prefers to close unanswered claims, C answers the real weakness of A — and it needs a period from you, which we did
not want to invent.

---

# What is at stake right now

- **Live today:** **Nothing.** This feature has not been released: the implementation is not yet committed, and the
  supporting decisions sit on a local branch that no shared branch contains. No family has been sent back. This is
  precautionary.
- **Blocked:** **Nothing.** The system is built to option A and will stay that way. No other claim is held up — a sent-back
  claim is left out of the campaign start on its own; every other claim proceeds.
- **If nothing is decided:** option A stays. A claim whose family never answers stays open until someone reopens this
  question.

---

# How much to trust this note

- **Earlier versions of this question:** it first appeared in an internal code review as *"a sent-back claim blocks a
  refusal vote, but the code says a refusal is never blocked — a contradiction."* **That framing was partly wrong.** The
  phrase "a refusal is never blocked" in the code refers only to the *name check*, not to the sent-back state; the block
  is exactly what the story prescribes ("the vote is refused while the claim is sent back and not yet resubmitted"). The
  builders followed their own text. The real tension is between that text and your ruling that a name problem is never a
  reason to refuse — not a coding slip.
- **Corrected in this note:** the review record first called the "special panel" route *"the only other exit"* for a
  sent-back claim. Checking the code showed it is an **accidental, unintended exit** — it can be reached today, and if the
  panel refuses, the refused claim is left open to further edits of its bank accounts. It is being closed as a defect, so it
  is **not** offered here as a real exit.
- **Still uncertain:**
  - We traced the two ways a sent-back claim could be refused today (the Pariwar Admin's vote and the special panel). We
    found no third, but "none exists" is not proven exhaustively.
  - "Nothing is live" rests on the implementation being uncommitted and the branch being on no shared branch. We could not
    compare against the shared main branch (that reference does not resolve in this working copy).
  - We did **not** check whether the Niyamavali or any other document sets a limit on how long a claim may stay open. The
    legal documents are deliberately not in this repository.
  - The waiting-period option (C) is described from the design side only; how long a period is reasonable is your call.

---

# In plain English

Your rulings say that a problem with the name on a bank account must never be the reason a claim is refused. Instead, the
Pariwar Admin sends the claim back to the District Admin, who calls the family, gets the details corrected, and sends it up
again. That is how the system has been built.

What nobody decided is what happens if the family never answers. Right now the claim simply waits, and the Pariwar Admin
cannot refuse it while it waits — not for the name, and not for any other reason. That protects families from being refused
over a clerical difference, but it also means a claim can stay open indefinitely with nobody able to close it.

There are three ways to go. **Keep it as it is** (the claim waits; safest for the family; a claim can hang). **Let the
Pariwar Admin refuse whenever they judge it right** (closes stuck claims; but then "never refused over a name" depends on
the Pariwar Admin's care, because the system cannot see the real reason). Or **let a claim be refused only after a waiting
period you choose** (a middle road, but you'd need to name the period, and it must be built).

We suggest **keeping it as it is for now**, because it is the only choice where your ruling is protected by the system, and
a stuck claim can always be revisited, whereas a claim wrongly refused cannot be un-refused by a later correction. If you'd
rather close unanswered claims, tell us how long a family should have. If this section and the evidence below ever
disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

Located by bare number, dates verified (2026-09-20 — see E4.1):

**`2026-09-19-226`, clause 6 (Trustee-ratified):**
> ⭐ **[Trustee-ratified] A MISMATCH THAT IS ⛔ NOT CLERICAL IS SENT BACK FOR CORRECTION** (follow-up (b)) — the claim is ⛔ not denied for it.

**`2026-09-19-226`, clause 7:**
> ⭐⭐ **[Trustee-ratified] BANK ACCOUNT INFORMATION IS MANDATORY FOR CLAIM FILING — BOTH ACCOUNTS** … Claims already filed without them must have them added before the District Admin can decide; they are ⛔ not denied for it.

**`2026-09-20-227`, clause 2 (the story numbers it cl.10):**
> *"If District Admin approves the verification, it goes to Pariwar Admin. If Pariwar Admin doesn't approve it goes back to District Admin for correction with Note. Thereafter District Admin will contact claimant regarding discrepancy and get it corrected. Then re-submit to Pariwar Admin."* ⇒ a **return is ⛔ NOT a denial**: the claim's state does ⛔ not move, and ⛔ no appeal flow (Story 6.16) starts. The note is **required**.

**`2026-09-20-227`, "What this ruling does ⛔ NOT cover", first bullet:**
> - whether the Pariwar Admin records anything beyond approving or returning (Story 6.18 D3: their vote is the final approval);

## E2 — What is NOT ratified

- **What happens when a returned claim is never corrected.** No clause sets a time limit, a reminder, an escalation or an
  exit. (`-227`'s "NOT cover" list is silent on it; see E4.7.)
- **Whether the Pariwar Admin may refuse a returned claim for a reason unrelated to the name.** `-227` clause 2 says a
  Pariwar Admin who "doesn't approve" sends it back; it does not say a returned claim can never be refused. The first bullet
  of `-227`'s "NOT cover" list is the nearest text, and it leaves the question open.
- **Whether "never denied over a name" (`-226` clause 6) is a rule of conduct or a system-enforced control.** The ruling
  states the outcome, not the mechanism.

## E3 — What the code actually does

⚠ A code comment is a claim, not evidence — each point below was traced. Line numbers are as of the **uncommitted** working
tree on 2026-09-20 and will rot; the function names are the stable handle.

- **The refusal vote is blocked while a return is live and unresubmitted.** `voteOnFrozenClaim`
  (`packages/domain/src/claim/state-trustee-decision-persist.ts`) reads the live return row and throws
  `ClaimAwaitingCorrectionError` **before** it looks at `input.outcome` (≈ lines 485–494). A denial is therefore blocked
  exactly like an approval. The comment at ≈ line 515 (*"A DENY IS NEVER GATED"*) is about the name-check gate only.
  (E4.4)
- **No reason code is about a name.** The trustee deny reasons are `standing_not_met`, `documents_insufficient` and
  `concealment_upheld`, plus the panel's own. But the catch-all **`other` is valid for a denial** as well as for a return
  and a route to the panel (`REASON_CODE_OUTCOME_COMPAT`, `other: ['denied','routed_to_r9','returned_for_correction']`),
  with a free-text rationale — so a refusal motivated by a name can be recorded under `other`. (E4.5, E4.10)
- **A returned claim is left out of the campaign start on its own; the others proceed.** `commitCycleFreeze` excludes a
  candidate that carries a live return row, one claim at a time (≈ lines 985 and 1020). (E4.6)
- **Nothing expires.** No expiry, reminder, overdue or deadline logic is tied to a return in `packages/domain/src`,
  `apps/jobs/src` or `apps/api/src`. (E4.7 — an **empty** result, reported as a finding: it is the evidence for the negative
  claim, and only as wide as the directories searched.)
- **The only two ways a returned claim can be refused today:** the Pariwar Admin's vote (blocked, above) and the R9 panel's
  denial (`finalizeR9Outcome`). The latter is reachable **only by accident** — a return and a route to the panel can
  coexist, because neither action checks for the other — and it leaves the refused claim with a live return row, which
  permits bank-account rewrites on a denied claim. This is recorded as a defect in the story's review findings and is being
  closed. `resolveEscalation` can also deny, but only from `verification_in_progress` / `verifier_review`, which a returned
  claim is not in. (E4.8)
- **Not released.** Story `6-18` is `in-progress`; the implementation is uncommitted; the four governance commits are on a
  local branch and on no remote branch (`git fetch origin` exit 0; `git branch -r --contains HEAD` empty). (E4.9) ⚠ Inference:
  "no family has been sent back" follows from this and was not separately checked in any database.

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1  decision ids — locate by BARE NUMBER, verify the date in the id
grep -n '^### Decision .*-22[678]' .decision-log.md
#   -> 37: 2026-09-20-228 · 81: 2026-09-20-227 · 117: 2026-09-19-226          (all three found; dates as cited)

# E4.2  -227 "NOT cover" list, verbatim
L=$(grep -n '^### Decision .*-227' .decision-log.md | head -1 | cut -d: -f1)
sed -n "$L,$((L+40))p" .decision-log.md | grep -A4 "What this ruling"
#   -> the three bullets, the first quoted in E1                              (found)

# E4.3  -226 clauses 5-7 verbatim
L2=$(grep -n '^### Decision .*-226' .decision-log.md | head -1 | cut -d: -f1)
sed -n "$L2,$((L2+90))p" .decision-log.md | grep -E "^(5|6|7)\. "
#   -> first run (window 40 lines) returned EMPTY: a FINDING — the window was too narrow, clause 6 sits further down.
#      Re-run with a 90-line window: clauses 5, 6, 7 found, quoted in E1.

# E4.4  the vote refuses while a return is live, before outcome is read
grep -n "ClaimAwaitingCorrectionError\|input.outcome === 'approved'" packages/domain/src/claim/state-trustee-decision-persist.ts
#   -> throw at ≈494 and ≈505; the first `input.outcome` test is at ≈516, AFTER them

# E4.5  trustee reason codes
grep -n "STATE_TRUSTEE_REASON_CODES" -A 16 packages/domain/src/claim/state-trustee-decision.ts
#   -> standing_not_met, documents_insufficient, concealment_upheld, r9_special_case, … (none about a name)
#      ⚠ the printed list was cut at 30 lines; the compat map (E4.10) is the authority for `other`

# E4.6  commit excludes a returned claim, per claim
grep -n "correction_return\|hasLiveReturnRow" packages/domain/src/claim/state-trustee-decision-persist.ts
#   -> the subquery filter at ≈985 and the per-candidate `continue` at ≈1020

# E4.7  no expiry / reminder / deadline tied to a return   (EMPTY = the evidence for "none exists")
grep -rniE "correction_return|returned_for_correction|under_correction" packages/domain/src apps/jobs/src apps/api/src \
  | grep -iE "expir|overdue|reminder|deadline|stale_after|max_age|older than"
#   -> EMPTY. (A first, looser grep matched only word fragments and was discarded.)

# E4.8  every path that can write a denial
grep -n "outcome: 'denied'\|'denied'" packages/domain/src/claim/state-trustee-decision-persist.ts packages/domain/src/claim/r9-voting-persist.ts
#   -> voteOnFrozenClaim (≈566), resolveEscalation (≈896), finalizeR9Outcome (r9-voting-persist ≈611, ≈696)

# E4.9  has it shipped?
git fetch origin; echo $?                      # -> 0
git branch -r --contains HEAD                  # -> EMPTY: no remote branch contains the local commits (a finding, disclosed above)
git rev-parse --short origin/main              # -> fatal: origin/main does not resolve in this clone  (⚠ so no comparison was possible)

# E4.10 `other` is valid for a denial
grep -n "other:" -B1 -A2 packages/domain/src/claim/state-trustee-decision.ts
#   -> other: ['denied', 'routed_to_r9', 'returned_for_correction']
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block at the top AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (a ruling on refusal does not move the enforcement-gap question, nor a waiting
   period if none is named).
4. Discharge the item wherever it is carried — the story's `### Review Findings` D2 and `deferred-work.md` if added — and
   mark it DISCHARGED, never delete it.
5. If implementation follows (option B or C), it needs a ROW; option C also needs a period and an age on the returned badge.
-->
