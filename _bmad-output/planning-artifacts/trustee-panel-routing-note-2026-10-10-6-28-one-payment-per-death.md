# Trustee Panel routing note — one death, two claims: which one is paid, what is the other family owed, are they told by text — and does the suspicion rule reach a claim not yet paid?

> **§0 gate — passed (2026-10-10), for each question.** **Q1** decides what the Trust **owes** when two claims for one death both pass
> every check — one payment or two, and which. **Q2** decides what the **other family** is owed once the death has been paid on another
> claim. **Q3** decides whether that family is **sent a message** — a new text to a person, like FQ7 and `-291` Q2. **Q4** decides
> whether your suspicion-appeal ruling reaches a claim that has passed the final vote but is ⛔ not yet paid. ⛔ No engineering choice
> decides any of them.
> ⭐ **Asked from Story 6.28** (`bmad-create-story 6.28`, 2026-10-10), as `2026-10-08-294` §3 required: the question comes **before any
> code**. ⭐ **Nothing live is exposed** — see *"What is at stake"*.
> ⚠ **Deliberately ⛔ not asked**, because they are ours (how the system works, ⛔ not what anyone is owed or told):
> · how the system stops a second approval (where the check sits, which locks it takes, how the cycle commit re-checks it);
> · what *"closed"* is in the system — the same state your FQ5 ruling already uses: ⛔ never a refusal (that it cannot be appealed is put to you in Q1's costs);
> · what the app and the helpline show for a closed claim — the existing *"This claim has been closed. Please call the helpline."* on the
>   app; helpline staff see *"Closed — another claim for this death goes ahead"* (what they may tell the caller is part of Q3);
> · that a new filing for a death now joins the claim already open for it however old that claim is (today only within 30 days — the first
>   way below stops); a filing through another channel waits for staff to merge it or keep it apart, one through the same channel simply joins.
>   ⚠ This includes a filing for a death already paid: it joins the paid claim and is ⛔ never considered on its own (Q2 is that family's route);
> · what staff see: the District Admin sees every other claim for the death, its stage, and whether it records the same date of death
>   (⛔ never a name); every later approver sees the warning, and a "Close this claim" button once the death has been paid.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and**
> into `.decision-log.md` as a new decision id. ⭐ Everything below is then kept **unedited** as the question **as it was put**.

---

# The question

**In one sentence:** When two claims for the same member's death both pass every check, should the Trust pay **once** — and if so,
which claim is paid — or may it pay **both**?

**Why it cannot be decided without you:** the system today has ⛔ no rule at all: both claims are paid. Choosing one means another family's
claim is closed, possibly after it has done everything asked of it; choosing both means the members pay twice for one death. Only you
can say what the Trust owes in that case.

## The one fact that decides it

⭐ **Every approved claim takes its own share of the members' payments, paid straight into the bank accounts on that claim — and the
Trust never holds the money, so a payment once made cannot be taken back.** A second approved claim for one death therefore takes a
second share **out of what the other bereaved families in that cycle receive**, and nothing in the system can undo it afterwards.
⇒ Whatever you decide must be decided **before** the second claim is approved, ⛔ never after.

⚠ **And who each claim pays:** every claim pays *the nominee in place at the death*, worked out from the date of death recorded **on
that claim**. Two claims that record the same date are meant to pay the **same** person (see *Still uncertain*) — the second payment is simply a
duplicate. They are meant to pay two **different** families only if they recorded different dates of death.

---

# Q1 — Which claim is paid?

⭐ **How two claims for one death arise today (all found in the code, ⛔ none needs anyone to break a rule):**
- the family files, the claim stalls (for example waiting on a correction), and **more than 30 days later** someone files again — the
  system only joins a new filing to an open claim filed in the last 30 days (we are removing this one — see the top);
- a staff member, seeing two filings, chooses **"treat as separate"** (an existing option);
- a claim is **refused**, a second claim is filed and approved, and then the first is **appealed and the refusal overturned** — every
  refusal except the suspicion one can be appealed at any time;
- the suspicion case (a nominee changed after the death) — **your earlier ruling on it** (the true nominee's claim waits for the appeal)
  still decides it, and it is ⛔ not re-opened here; this question covers every OTHER way — **and one rare corner where that ruling cannot
  hold:** Claim 1 is refused for an ordinary reason; Claim 2 is **paid**; only THEN is Claim 1's refusal changed to the suspicion reason,
  appealed and **allowed**. The money has already gone, so Claim 1's family, which won its appeal, is paid nothing unless you order
  otherwise (Q2).
- ⭐ If Claim 1 is refused for the suspicion reason, or its refusal is changed to it, **after** Claim 2 has passed the final vote but
  **before** it is paid — that is **Q4** (before Claim 2's final vote, your earlier ruling already applies).

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **One payment per death: the first claim to pass the final vote is paid.** ⛔ No other claim for that death can then pass it, and when that claim's payment begins every other open claim for the death is **closed** (⛔ not refused). How A works is listed under the table. | A death is paid once. A family whose other claim is closed sees *"This claim has been closed. Please call the helpline."* | (1) Where two **different** families filed with different dates of death and ⛔ neither is the suspicion case, the claim approved first is paid — the approver chooses, with a reason and a note, but it is still the *"race between staff"* you turned down before. (2) A second claim that appears after the District Admin approved — one staff kept apart, or a refused claim whose family appeals (a plain new filing now joins the first claim) — holds the first claim's final approval until the District Admin gives a reason and a note, or the second claim is refused or closed; there is ⛔ no time limit, and if neither happens the first claim is ⛔ never paid, and the death is paid only if the second claim passes the final vote instead. (3) The family whose claim is closed cannot appeal the closure; its only route is the helpline (Q2). (4) In the rare corner above (the refusal changed only after the other claim was **paid**), a family that **wins** its suspicion appeal is paid nothing unless you order otherwise (Q2) — the cost you turned down before when you refused to let an approval end the appeal. (5) An ordinary refusal (⛔ not the suspicion one, which is Q4) overturned on appeal **after** another claim has passed the final vote pays ⛔ nothing, unless the special panel then refuses that claim (Q2). |
| **B** | **One payment per death, and staff choose first.** While two claims for one death are both open, ⛔ neither can pass the final vote until the District Admin closes one of them, with a reason and a note. After that, as A. | A death is paid once, and ⛔ never by whichever claim moved faster. | Every duplicate — usually the **same** family filing twice — needs an extra staff step before anyone is paid, and if the District Admin never takes it, ⛔ neither claim is ever paid. A new staff action to build. The District Admin's choice closes the other family's claim, and that cannot be appealed. The suspicion corner and Q4 are the same as in A. So is an appeal won after the other claim passed the final vote (Q2). |
| **C** | **Leave it as it is: both claims may be paid.** | ⛔ No change (Q4 is asked on its own). | The members pay twice for one death, out of what other families receive, with ⛔ no way back. |

**How A works:**
- **The final vote** is the approval that makes a claim ready to be paid — usually a Pariwar Admin's vote at the month's freeze (until the
  payment begins, a Pariwar Admin can still send the claim to the special panel, which can refuse it); for a few claims, the special
  panel's approval (a further vote of the Pariwar Admins) or the Pariwar Admin's or Super Admin's decision on a correction case.
- Until one claim passes the final vote, everyone approving either claim is **warned** that another claim for the same death is open, and
  approving over it needs **a reason and a note** — your one rule for every warning. The District Admin sees the other claim — its stage,
  and whether it records the same date of death (⛔ never a name).
- If a second claim appears **after** the District Admin approved the first, the first claim's final approval **waits** until the District
  Admin gives that reason and note, or the second claim is refused or closed (see the cost).
- Once one claim has passed the final vote, ⛔ no other claim can pass it — the approver is stopped with its own message (the claim is ⛔ not
  refused).
- When that claim's payment begins (when it is put into the month's collection and members are asked to pay), every other open claim for the
  death is closed — automatically, or in a few rare cases when the next approver who opens it presses "Close this claim".
- A claim already refused keeps its appeal, and is closed only if that appeal succeeds.
- If the first claim is refused after its final vote (the special panel can still refuse it), the others carry on as normal.
- The suspicion case keeps your rule, except the rare corner above (and Q4).

**Our reading:** **A** — **because** it guarantees one payment per death without making every duplicate wait for a staff step (B's
risk — the same trap the suspicion case had before your 90-day ruling); A adds that wait only when a second claim appears after the
District Admin's approval, and even then the death can still be paid on the other claim; and the warning puts the choice in front of
the person approving, with a reason and a note on the record. Closing the other claims only when the payment begins — ⛔ not at the vote —
means a claim refused after its vote never leaves a death unpaid. In the common case — the same family filing twice — A simply closes
the duplicate.

⚠ The Panel can reject this reading and still use the table — each option is built differently but ⛔ none needs another question.

---

# Q2 — What is the other family owed, once the death has been paid on another claim?

*This applies only if you choose A or B in Q1.*

**In one sentence:** If the death has already been paid on one claim, and another family then shows — by an allowed appeal, or by a
different date of death — that it should have been paid instead, may the Trust ask the members to pay again?

**The one fact that decides it:** ⭐ the money went straight from the members to the first claim's bank accounts; the Trust has ⛔ nothing
it can pay from except a **second collection from the members**.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Nothing more from the members.** The other claim is closed and the family is pointed to the helpline. If they say the wrong family was paid, the Trust takes it up outside the system; the members are ⛔ never asked to pay twice for one death. | The members pay once per death, always. | A family that was truly owed (for example, the first claim used a false date) gets ⛔ nothing from the members. The right to appeal a refusal at any time — which you confirmed when you set the 90-day limit for the suspicion refusal only — still runs, but an ordinary appeal **won** after another claim for the death has passed the final vote pays ⛔ nothing (unless the special panel then refuses that other claim), and so does a suspicion appeal won after the other claim was **paid** (Q1's corner). Its only remedy is whatever the Trust can recover from the person paid. |
| **B** | **The Panel may order a second payment, case by case.** A claim closed this way can be reopened only by a recorded Panel decision, and then goes ahead as a normal claim. | A family wrongly passed over can still be paid — by your decision only. | The members pay twice for that death, out of what other families receive. A new power, and a new screen to build. The Panel must judge a dispute between two families. A later filing that joined the paid claim has ⛔ no claim of its own to reopen: one through another channel must first be kept apart by staff; one through the same channel leaves ⛔ no record, so that family can be found only through the helpline. |

**Our reading:** **A** — **because** preventing a second collection for one death is the reason this question exists, and a payment
made to the wrong family through a false date is a fraud for the Trust to pursue against the person paid, ⛔ not a debt for the
members. ⭐ A does ⛔ not shut B out: if a real case arises, B can be added as its own piece of work with ⛔ nothing in A undone.

⚠ The Panel can reject this reading and still use the table.

---

# Q3 — Is the family whose claim is closed this way sent a text?

*This applies only if you choose A or B in Q1.*

**In one sentence:** When a claim is closed because the death was paid on another claim, should the Trust **text** that family, or is it
enough that the app and the helpline say *"This claim has been closed. Please call the helpline."*?

**The one fact that decides it:** ⭐ we expect — without data — that most claims closed this way come from the family **being paid**
(for example, one that re-filed after a refusal and also appealed); a text saying *"your claim has been closed"* would then reach the very
family being paid, at the moment it is being paid. A claim staff chose to keep apart may be another family's.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | ⛔ No text. The app and the helpline show *"This claim has been closed. Please call the helpline."* (A claim closed by your suspicion-appeal rule still gets your earlier text.) | A family finds out when it looks or calls; the helpline may tell it only that another claim for this death goes ahead — ⛔ never who filed it or who was paid. | A **different** family that filed only through the helpline learns its claim was closed only when it calls. |
| **B** | A text, once, in the words you already chose for a closed claim: *"Your claim for [member] has been closed. Please call the helpline."* | The nominee in place at the death, on the member's declaration (as your earlier text), is told promptly — where both claims record the same date, that is meant to be the very nominee being paid. | It alarms a family that is being paid on the other claim; it needs the same counsel check as the earlier texts to people who never agreed to be contacted. |

**Our reading:** **A** — **because** we expect the usual closed claim to be the paid family's own, and the helpline sees against any such
claim *"Closed — another claim for this death goes ahead"*. ⭐ Until you answer, the system builds A — nothing is sent that you have not
ruled.

⚠ The Panel can reject this reading and still use the table.

---

# Q4 — Does your suspicion-appeal rule reach a claim that has passed the final vote but is ⛔ not yet paid?

**In one sentence:** Claim 1 is refused for the suspicion reason (or its refusal is changed to it) only after Claim 2 has passed the final
vote, and before Claim 2 is paid. If Claim 1's appeal is then allowed, which family is paid?

**The one fact that decides it:** ⭐ Claim 2's payment is already held from Claim 1's refusal until the appeal is decided (or the 90 days to appeal pass), so its money has ⛔ not moved. Your earlier
ruling closed the other claim only before its final approval.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Apply your earlier ruling here too: Claim 2 is closed and Claim 1 goes ahead. | Claim 1's family, which won its appeal, is paid. Claim 2's family receives your closed-claim text. | It reaches a claim later than the point you ruled on. If Claim 1 then fails a later check, the death is paid by ⛔ no claim. |
| **B** | Claim 2 goes ahead and is paid; under Q1 A or B, Claim 1 is then closed (under Q1 C it goes on and may be paid too). | Claim 2's family is paid as it expected. | A family that **wins** its suspicion appeal is paid ⛔ nothing unless you order otherwise (Q2) — the cost you turned down when you refused to let an approval end the appeal. |

**Our reading:** **A** — **because** the money has ⛔ not moved, so your rule can still hold as you made it. A applies whatever you
choose in Q1.

⚠ The Panel can reject this reading and still use the table.

---

# What is at stake right now

- **Live today:** ⛔ nothing. The system is ⛔ not in production; ⛔ no claim has been paid.
- **Blocked:** Story 6.28's own build only — an earlier engineering record puts this question before its code. ⛔ Nothing else waits on it.
- **If nothing is decided:** the system goes live on **C** — a death can be paid twice, and the second payment comes out of what other
  families receive.

---

# How much to trust this note

- **Earlier versions of this question:** FQ5 (`2026-09-28-262`) asked *"two claims for one death — which one gets paid?"* but **only for
  the suspicion case**; you chose A (the new claim waits for the appeal) over C (*"whichever claim is approved first is paid"* — *"a race
  between staff"*). ⚠ Q1 A here **resembles that C**, for the cases FQ5 does ⛔ not cover; the difference is the warning, the reason and the
  note — and that FQ5's own rule still governs the suspicion case except in one rare corner (`-294` §2 (a), and only once the other
  claim has been PAID), where an allowed suspicion appeal pays nothing — the cost of FQ5 **B** (*"Takes away the appeal the Panel granted (`-239` c)"*), which you also turned down.
  ⭐ Weigh both resemblances yourselves.
- **Corrected in this note (before it was put):** the gap was first recorded (`2026-10-08-294` §2) as three narrow paths around the
  suspicion case plus one older root; `-294` §3 asked for those paths as the deciding facts — they are Q1's bullets (a refusal overturned
  after another claim was approved — the older root; the suspicion corner — (a); a re-filing more than 30 days later — (b), which we are
  removing; and (c), reachable only through the corner). Tracing the code for this note found the **simplest** path needs ⛔ no refusal
  at all — two filings more than 30 days apart, or a staff *"treat as separate"*. ⇒ the question is put for **every** second claim, ⛔ not
  only the suspicion corners.
- **Corrected in this note (before it was put):** a first draft closed the other claims at the final vote. The final vote can still be
  overturned (the special panel can refuse a claim after it), which would have left a death paid by ⛔ no claim ⇒ A closes them only when
  the payment begins.
- **Still uncertain:** (1) that two claims recording the same date always pay the same person — the nominee marking is validated
  against the date, but each claim's bank accounts are typed separately and the account-name check is a person's judgement (and one
  ratified path, `-251`, approves despite a name problem); (2) the *"members pay the nominee directly"* fact rests on an author's record
  (`-192`) and the code, ⛔ not a ruling of yours — the draft rulebook (never ratified) says the Trust holds the money; (3) how often
  duplicates will arise — there is ⛔ no production data.

---

# In plain English

**Q1.** Today, if two claims are filed for the same death — the family filing twice, a staff member keeping two filings apart, or a
refused claim later won on appeal while another claim was paid — the system can pay both. Each payment comes from the members and goes
straight to that claim's bank account, so a second payment for one death takes money from what other families receive, and cannot be
taken back. We suggest: one payment per death. Once one claim passes the final vote, no other claim for that death can; when its payment
begins, any other open claim for that death is closed (a refused one keeps its appeal, but an ordinary appeal won after the other claim's
final vote pays nothing); and until one claim passes the final vote, anyone approving while another claim for
the same death is open is warned and must give a reason and a note — and if a second claim appears after the District Admin's approval,
the first claim waits for that reason (with ⛔ no time limit), unless the other claim is refused or closed.
The suspicion case keeps the rule you already made, except one rare corner: a family whose refusal is changed to the suspicion reason
only after the other claim was already paid, and who then wins its appeal, is paid nothing unless you order a second payment (Q2).

**Q2.** If the death has already been paid and another family later shows it should have been paid instead, we suggest the members are
⛔ not asked to pay again — the Trust takes the matter up outside the system. If you later want the power to order a second payment in a
rare case, it can be added on its own.

**Q3.** We suggest ⛔ no text when a claim is closed this way, because we expect it usually to be the paid family's own second filing; the app and the
helpline tell anyone who looks or calls.

**Q4.** If a claim is refused for the suspicion reason — or its refusal is changed to it — after the other claim passed the final vote but
**before** it is paid, we suggest your suspicion rule still holds: the other claim is closed even though it passed the final vote, its
family gets your closed-claim text, and the family that won its appeal is paid. The cost: if that family's claim then fails a later check,
the death is paid by ⛔ no claim.

⭐ If this summary and the evidence below ever disagree, the **evidence** is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-09-28-262` FQ5 — A** (Trustee-ratified). *"THE TRUE NOMINEE'S NEW CLAIM GOES THROUGH EVERY CHECK BUT WAITS AT FINAL APPROVAL
> UNTIL THE APPEAL IS DECIDED. Appeal refused → the new claim may be approved; appeal allowed → the new claim is **closed**."* — options
> as put (routing note `2026-09-28-6-20-follow-ups`, FQ5): **B** *"The new claim may be approved, and approving it ends the appeal"*;
> **C** *"Whichever claim is approved first is paid, and the other is closed"* — cost *"A race between staff"* (⛔ not taken). That note
> told the Panel: *"Each approved claim starts **its own collection from members**, and we found no check that stops both being
> approved."*

> **`2026-09-28-261` D4 B** (Trustee-ratified). *"WHEN THE OPEN CLAIM WAS REFUSED ON SUSPICION, A NEW CLAIM FOR THAT DEATH IS ALWAYS KEPT
> SEPARATE — ⛔ never merged into the refused claim (how the two are resolved: `-262` FQ5)."*

> **`2026-09-28-264` FQ12** (Trustee-ratified). *"A claim may be approved while **any** warning shows … only if the District Admin
> chooses a reason and writes a note."*

> **`2026-10-07-291` Q1 A** (Trustee-ratified). *"A TIME LIMIT TO APPEAL THIS KIND OF REFUSAL ONLY — 90 DAYS FROM THE REFUSAL. … ⭐ Every
> other refusal keeps ⛔ no time limit."* **Q2 B:** *"A TEXT, ONCE, when an allowed appeal closes the true nominee's claim: "Your claim for
> [member] has been closed. Please call the helpline.""*

> **`2026-10-07-293` item 2 A** (Trustee-ratified). *"While ANY other claim for the same death is anything but closed — the true
> nominee's, or anyone's, open, refused or paid — a refusal's reason can ⛔ not be changed away from "nominee changed after the death"."*
> ⚠ It locks changes AWAY from that reason only; a change ONTO it after another claim was PAID is the Q1 corner (a change ONTO it before payment holds that claim's payment, and, under Q4 A, an allowed appeal closes it).

> **`2026-10-04-279` A6** (author-commit). *"a new warning kind enters the wait only by a decision"* — the Panel was told a late warning
> *"should be rare"*; both earlier kinds were put to you (`-281` Q1 B, `-303` Q2 A). ⇒ Q1 A states the wait in its own text.

> **`2026-09-28-262` FQ5 — the options as put.** B *"The new claim may be approved, and approving it ends the appeal"* — cost *"Takes away
> the appeal the Panel granted (`-239` c)"*; C *"Whichever claim is approved first is paid, and the other is closed"* — cost *"A race
> between staff"*. ⛔ Neither taken. (Q1 A's table names them only as *"turned down before"*.)

> **`2026-09-21-239` (c)** (Trustee-ratified). *"Yes refusal appealable once."*

## E2 — What is NOT ratified

- ⛔ No ruling says a death is paid **once**. FQ5 decides only the suspicion case; `-261` D4 B only that such a claim is kept apart.
- ⛔ No ruling covers two claims for one death **outside** the suspicion case — a refile more than 30 days later, a staff override apart, or
  an ordinary refusal overturned after another claim was approved.
- *"Members pay the nominee directly; the Trust never disburses"* is `2026-09-04-192` — an **author's** record, ⛔ not a Panel ruling.
- The appeal right with ⛔ no time limit (every refusal but `-239`) ORIGINATED in the PRD and Story 6.16 (D-E) — and is RESTATED in your
  ratified `-291` Q1 A (*"Every other refusal keeps ⛔ no time limit"*). Q2 A keeps that right but narrows its effect (an appeal won after
  the payment pays nothing) — which is why Q2 is yours.
- `-292` RF4 (author-commit) says a claim past the final vote is ⛔ never closed; Q4 A would supersede it in part — ⛔ not ratified.
- `2026-10-08-294` (author-commit) recorded the gap and opened this row; it decided ⛔ nothing a person is owed.

## E3 — What the code actually does (as of `main` at `34b9bab6`, 2026-10-10)

- **⛔ No per-death rule in the approval gate.** `assertClaimApprovable` (`packages/domain/src/claim/nominee-name-check.ts:403-435`):
  certificate accepted → bank accounts + nominee determination + name check → ground inspection → (final step only) the suspicion wait
  (`suspicion-refusal.ts:372`) → late warnings. The cross-claim reads are the suspicion wait and the inspection's inherited source
  (`ground-inspection-approval.ts:99`) — ⛔ neither asks whether the death is already approved.
- **The final vote is ⛔ not final.** `state_trustee_approved` is *"approved-in-principle, reversible"* (`claim/state.ts:266`): the Pariwar
  Admin may route it to R9 (`state-trustee-decision-persist.ts:102-109`), and an R9 `denied` outcome moves it to `denied`
  (`state.ts:283-290`). Only the cycle commit (`approved`, `state-trustee-decision-persist.ts:1347`) leads to a pool ⇒ A closes the other
  claims at the commit.
- **⛔ No per-death rule in the database.** `claims` has a non-unique `claims_deceased_member_id_idx` and the unique
  `(pariwar_id, claim_case_id)` only (`schema/claims.ts:166-172`; migration `0051`).
- **⛔ No per-death rule at the cycle commit or the pool spawn.** `commitCycleFreeze` (`state-trustee-decision-persist.ts:1244`) approves
  every `state_trustee_approved` claim that passes its re-checks (routing, return, suspicion wait, inspection); `planCycleSpawn`
  (`pool/spawn.ts:285-290`) refuses only a repeated `claimCaseId` — ONE pool per committed claim; `pools` is unique per
  `(pariwar_id, cycle_id, pool_index)` only (`schema/pools.ts:247`).
- **The payment.** Each member is assigned to exactly one of the cycle's N pools (`pool/assign.ts:137-187`) and pays the nominee's
  account on that pool's claim directly (`claim_nominee_bank_accounts`, keyed `(claim_case_id, account_rank)` — claim-scoped, typed by
  the filer). ⇒ a second approved claim for one death = N+1 pools for N deaths.
- **Second live claim — REACHABLE, four ways** (inference from the code, each traced): (i) `getConvergenceCandidate`
  (`claim/icp.ts:109-139`) only looks back `CONVERGENCE_WINDOW_DAYS = 30` (`:66`) ⇒ a filing 31+ days after a still-open claim mints a
  new one; ⛔ no handler checks first. (ii) `overrideIntakeAttempt` (`icp.ts:569`) — "treat as separate", any admin with `claim.file` +
  a step-up. (iii) A filing after a `denied` / `closed` claim: terminal claims are never candidates; the refile guard keys only on a 6.19c
  closures row (`refile-guard.ts:13-15`). (iv) An ordinary refusal appealed with ⛔ no time limit (`appeal-eligibility.ts:219-223`)
  and reversed → `reversed` is votable (`state-trustee-decision-persist.ts:97`) → approved beside the other claim; RF6's closure acts
  only on a `-239` reversal (`suspicion-refusal-persist.ts:154-156`) and ⛔ never moves an approved claim (`claim/state.ts:359`).
- **Who each claim pays.** The District Admin marks which declaration versions stand; the writer refuses a mark that disagrees with the
  claim's certificate date (`claim/nominee-effective.ts:116` `versionStandsAt`). ⇒ same date ⇒ same standing versions.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-262\|^### Decision .*-261\|^### Decision .*-264\|^### Decision .*-291\|^### Decision .*-293\|^### Decision .*-294\|^### Decision .*-192' .decision-log.md
sed -n '/^\*\*FQ5 — D4/,/^---/p' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md
sed -n 403,435p packages/domain/src/claim/nominee-name-check.ts
grep -n "index(\|uniqueIndex(\|unique(" packages/domain/src/schema/claims.ts packages/domain/src/schema/pools.ts
sed -n 280,292p packages/domain/src/pool/spawn.ts
sed -n 60,66p packages/domain/src/claim/icp.ts; sed -n 109,139p packages/domain/src/claim/icp.ts
sed -n 150,160p packages/domain/src/claim/suspicion-refusal-persist.ts
grep -n "CLAIM_NOT_CLOSABLE_STATES =" packages/domain/src/claim/state.ts
git grep -n "deceased_member_id\|deceasedMemberId" -- packages/domain/src/pool/spawn.ts packages/domain/src/pool/assign.ts   # EMPTY = ⛔ no per-death check
sed -n 599,627p packages/domain/src/claim/suspicion-notice.ts   # Q3 B's recipient
grep -n "CYCLE_FREEZE,\|CLAIM_R9_VOTE," packages/domain/src/rbac/roles.ts   # the Pariwar Admins hold both votes
```

---

<!-- AFTER THE PANEL RULES: follow the template's closing steps (transcribe; keep the body unedited; record what the ruling does NOT
cover; discharge in the story, `sprint-status.yaml` row `6-28-…` and `deferred-work.md`; then Story 6.28's author-commit). -->
