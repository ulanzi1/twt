# Trustee Panel routing note — 2026-10-12 — Story 6.28: when helpline staff say "the family may file again"

> **Status: WRITTEN, ⛔ NOT SENT.** Owed by `2026-10-12-320` (open follow-up 1). A confirm of one sentence in your
> `2026-10-11-318` ruling (Q3 A), ⛔ not a new policy question. ⛔ Nothing is blocked while it is open.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into
> `.decision-log.md` as a new decision id. ⭐ Everything below is then kept **unedited** as the question
> **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The question

**In one sentence:** When a family's claim was closed because another claim for the same death went ahead, and that other
claim is later refused, should helpline staff tell the family they may file again **even while a third claim for the same
death is still being processed** — or only once no claim for that death is still in progress?

**Why it cannot be decided without you:** on 2026-10-11 you ruled the exact words staff see, including *"once the holding claim
is itself later refused, that the family may file again"*. What we built says it in fewer cases than that sentence does. That
changes what the Trust tells a family, so it is yours to confirm or correct, ⛔ not ours.

## The one fact that decides it

**While any other claim for that death is still being processed, a new filing does ⛔ not start a new claim.** It joins the claim
already in progress (if made the same way — app or helpline — as that claim), or it waits for staff to decide whether it is the
same claim or a separate one (if made the other way). So in that case, "the family may file again" promises something that does
not happen by itself.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** *(built today)* | Staff say *"Closed — another claim for this death goes ahead"* while any other claim for the death is still in progress. Only once every other claim for the death is refused or closed do they say *"the other claim for this death was later refused; the family may file again"*. | A family in this situation is ⛔ not told it may file again until filing again would actually start a claim. | It says less than your ruled sentence: in this one situation the family is ⛔ not told "you may file again" even though the claim it was closed for was refused. If the family calls and asks, staff have only "another claim goes ahead" to go on. ⛔ No extra work. |
| **B** | Your sentence exactly: once the claim it was closed for is refused, staff say *"the family may file again"* — even while a third claim is in progress. | The family is told it may file again; if it does, its filing joins the claim in progress or waits for staff. | The family may believe it has started a fresh claim when it has ⛔ not. Staff must then explain. **Extra work:** a small change to when the line shows, and its tests (about half a day), plus a recorded decision. |
| **C** | Say both: *"The other claim for this death was later refused. Another claim for this death is still in progress — a new filing would join it unless staff decide it is separate."* | The family hears the full picture: it may file, and what will happen if it does. | A new staff line (English; Hindi when staff screens are translated), the condition to show it, tests, and a line in the helpline guidance. **Extra work: about one day.** |

**Our reading:** **A** — **because** the line's purpose is to tell staff the family can start again, and in this situation it
cannot by itself; A never tells a family something untrue, and it changes nothing once the other claims finish. If you want the
family told more, **C** is better than **B**, because B says "you may file again" without saying what will happen.

---

# What is at stake right now

- **Live today:** ⛔ nothing — the system is ⛔ not yet in use by members or staff. A is what is built.
- **Blocked:** ⛔ nothing. Story 6.28 is finished and can be merged either way; B or C would be a small follow-up.
- **If nothing is decided:** A stays. It is the cautious reading, and nobody is told anything untrue.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. In our code review on 2026-10-12 we first treated this as our own engineering
  call and built A. While writing the record of that decision (`2026-10-12-320`) we re-read your exact words and saw that A says
  less than your sentence in this one case. That is why this note exists.
- **Corrected in this note (before sending, by running E4):** (1) one evidence command returned EMPTY — it searched a test comment
  with the wrong capital letter; the command and the citation are fixed. (2) The evidence said the yes/no field sits on "four
  responses"; it sits on three (they feed five screens). Neither changes the question or the recommendation.
- **Still uncertain:** how often this happens. It needs **three** claims for one death: one that went ahead and was later refused,
  one closed for it, and a third still in progress. We expect it to be rare. We have ⛔ no real cases yet (⛔ not in use).

---

# In plain English

Sometimes two or more families claim for the same death. When one claim goes ahead, the others are closed, and helpline staff
see a line explaining why. You ruled that if the claim that went ahead is later refused, staff should tell the closed family it
may file again.

We found one situation where that would mislead: if yet another claim for the same death is still being processed. Then a new
filing from the closed family does not start its own claim — it joins the one in progress, or waits for staff to sort out. So we
built the line to say "another claim for this death goes ahead" until nothing else is in progress, and only then "you may file
again".

We think that is right, because it never tells a family something that is not true. But it means the family hears "you may file
again" later than your ruling's words say. We ask you to confirm (A), or to tell us to follow your words exactly (B), or to have
staff say both things (C). B and C are small pieces of follow-up work; nothing is held up meanwhile.

If anything in this summary disagrees with the evidence below, the evidence is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-10-11-318` (Trustee-ratified), Q3 — A:** *"⛔ No text when a claim is closed this way. The app already shows "This claim
> has been closed. Please call the helpline."; helpline staff see "Closed — another claim for this death goes ahead" (or, once the
> holding claim is itself later refused, that the family may file again)."*

> **`2026-10-11-319` (author-commit), OP10:** *"what people see (OP10) — ⛔ no new member string, the neutral staff label keyed on
> the holding claim's state"* — built as "holding claim refused **or closed**" (story OP10).

> **`2026-10-12-320` (author-commit), D1 A:** *"The "later refused; the family may file again" variant shows only when the holding
> claim is refused or closed AND ⛔ no other claim of the death is still live (every other claim of the death is refused or
> closed)."* — with *"How much to trust this entry"* disclosing (b), the narrowing this note asks about, and open follow-up 1.

## E2 — What is NOT ratified

- What staff say when the holding claim is refused **and** another claim for the death is still in progress. Q3 A's parenthetical
  does not consider a third claim.
- The case where the holding claim was itself **closed** (not refused) and nothing for the death remains in progress: `-319` built
  "may file again" there too (a widening of Q3 A's wording, kept by `-320`). This note does ⛔ not ask about it; if the Panel wants
  it asked, it is a separate one-line question.
- Whether a closed family's new filing should start its own claim rather than join the one in progress — that is the existing
  convergence rule (Story 6.4, OP11), ⛔ not asked here.

## E3 — What the code actually does

- **The label condition** — `readClosedHolderRefusedBulk` (`packages/domain/src/claim/one-payment-per-death.ts`): a `closed` claim is
  flagged when its `claim.closed` event's `held_by_claim_case_id` claim is `denied` or `closed` **AND** ⛔ no other claim of the same
  death has a state outside `denied` / `closed`. Flagged ⇒ the staff label reads the "may file again" variant
  (`closedClaimStateLabel`, `apps/admin/src/modules/claim-verification/i18n-en.ts`), on four helpline surfaces and the Pariwar
  Admin's nominee-refusals list.
- **What a new filing does while another claim is live** — `getConvergenceCandidate` (`packages/domain/src/claim/icp.ts`) returns
  the newest claim of the death that is ⛔ not terminal (`settled` / `denied` / `closed`), ⛔ not kept apart by an override, and
  ⛔ not under a standing suspicion refusal. `tryConverge` then: the SAME channel ⇒ returns that claim (⛔ no new claim); a
  DIFFERENT channel ⇒ records a `pending` attempt for staff to merge or override (`convergencePending: true`). Only staff's
  override starts a separate claim. ⇒ the deciding fact (verified by reading the code; pinned by `icp.spec.ts`'s AC10 legs).
- **Tests pinning A** — `packages/domain/tests/integration/claim/one-payment-per-death.spec.ts`, describe *"OP10 — a closed claim whose
  HOLDING claim was later refused / closed"*, leg *"the holder CLOSED while another claim of the death goes ahead (paid, or a third
  claim) ⇒ ⛔ listed"* — its second half (commented *"A refused holder beside a still-OPEN third claim ⇒ that claim goes ahead ⇒ ⛔
  listed."*) is exactly this note's case.
- **Cost of B / C (estimate, inference):** B = remove the live-claim term (and decide the "holder closed" half) + rewrite two legs;
  C = a third label state through the contract field (`closed_holder_refused` is a boolean today on THREE response contracts —
  death-certificate, appeal, nominee-declaration — feeding the four helpline surfaces + the nominee-refusals list), a new staff
  string, tests.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-318\|^### Decision .*-319\|^### Decision .*-320' .decision-log.md
grep -n "once the holding claim is itself later refused" .decision-log.md
grep -n "op_l.current_state NOT IN ('denied', 'closed')" packages/domain/src/claim/one-payment-per-death.ts
grep -n "same-channel one returns the claim" packages/domain/src/claim/icp.ts
grep -n "notInArray(claims.currentState, \[...CLAIM_TERMINAL_STATES\])" packages/domain/src/claim/icp.ts
grep -n "A refused holder beside a still-OPEN third claim" packages/domain/tests/integration/claim/one-payment-per-death.spec.ts
grep -n "closed_holder_refused: z.boolean()" packages/contracts/src/claims/*.ts
```
