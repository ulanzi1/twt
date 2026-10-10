# Trustee Panel routing note — one death, two claims: which one is paid, what is the other family owed, and are they told by text?

> **§0 gate — passed (2026-10-10), for each question.** **Q1** decides what the Trust **owes** when two claims for one death both pass
> every check — one payment or two, and which. **Q2** decides what the **other family** is owed once the death has been paid on another
> claim. **Q3** decides whether that family is **sent a message** — a new text to a person, like FQ7 and `-291` Q2. ⛔ No engineering
> choice decides any of them.
> ⭐ **Asked from Story 6.28** (`bmad-create-story 6.28`, 2026-10-10), as `2026-10-08-294` §3 required: the question comes **before any
> code**. ⭐ **Nothing live is exposed** — see *"What is at stake"*.
> ⚠ **Deliberately ⛔ not asked**, because they are ours (how the system works, ⛔ not what anyone is owed or told):
> · how the system stops a second approval (where the check sits, which locks it takes, how the cycle commit re-checks it);
> · what *"closed"* is in the system — the same state your FQ5 ruling already uses: ⛔ never a refusal, ⛔ never appealable;
> · what the app and the helpline show for a closed claim — the existing *"This claim has been closed. Please call the helpline."*,
>   which names ⛔ no one and says ⛔ nothing about the other claim.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet, and this note has ⛔ not been sent.** When the Panel rules, transcribe it into this block **and**
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
that claim**. Two claims that record the same date pay the **same** person — the second payment is simply a duplicate. They pay two
**different** families only if they recorded different dates of death.

---

# Q1 — Which claim is paid?

⭐ **How two claims for one death arise today (all found in the code, ⛔ none needs anyone to break a rule):**
- the family files, the claim stalls (for example waiting on a correction), and **more than 30 days later** someone files again — the
  system only joins a new filing to an open claim filed in the last 30 days;
- a staff member, seeing two filings, chooses **"treat as separate"** (an existing option);
- a claim is **refused**, a second claim is filed and approved, and then the first is **appealed and the refusal overturned** — every
  refusal except the suspicion one can be appealed at any time;
- the suspicion case (a nominee changed after the death) — **your FQ5 ruling already decides it**, and it is ⛔ not re-opened here; this
  question covers every OTHER way, and the corners FQ5's machinery does ⛔ not reach.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **One payment per death: the first claim finally approved is paid.** Once one claim for a death is finally approved, ⛔ no other claim for that death can be, and every other claim for it is **closed** (⛔ not refused) — a claim already refused keeps its appeal, and is closed only if that appeal succeeds. Until then, everyone approving either claim is **warned** that another claim for the same death is open, and approving over it needs **a reason and a note** — your one rule for every warning (FQ12). The suspicion case stays exactly as FQ5 rules it. | A death is paid once. A family whose other claim is closed sees *"This claim has been closed. Please call the helpline."* | Where two **different** families filed with different dates of death and ⛔ neither is the suspicion case, the claim approved first is paid — the approver chooses, with a reason and a note, but it is still the *"race between staff"* you turned down in FQ5 C. And a refusal overturned on appeal **after** the death was paid on another claim pays nothing (Q2). |
| **B** | **One payment per death, and staff choose first.** While two claims for one death are both open, ⛔ neither can be finally approved until the District Admin closes one of them, with a reason and a note. After that, as A. | A death is paid once, and ⛔ never by whichever claim moved faster. | Every duplicate — usually the **same** family filing twice — needs an extra staff step before anyone is paid, and if the District Admin never takes it, ⛔ neither claim is ever paid. A new staff action to build. |
| **C** | **Leave it as it is: both claims may be paid.** | ⛔ No change. | The members pay twice for one death, out of what other families receive, with ⛔ no way back. |

**Our reading:** **A** — **because** it guarantees one payment per death without adding a step that could leave a genuine family
waiting for ever (B's risk — the same trap FQ5 had before your 90-day ruling), and the warning puts the choice in front of the person
approving, with a reason and a note on the record. In the common case — the same family filing twice — A simply closes the duplicate.

⚠ The Panel can reject this reading and still use the table — each option is built differently but ⛔ none needs another question.

---

# Q2 — What is the other family owed, once the death has been paid on another claim?

**In one sentence:** If the death has already been paid on one claim, and another family then shows — by an allowed appeal, or by a
different date of death — that it should have been paid instead, may the Trust ask the members to pay again?

**The one fact that decides it:** ⭐ the money went straight from the members to the first claim's bank accounts; the Trust has ⛔ nothing
it can pay from except a **second collection from the members**.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Nothing more from the members.** The other claim is closed and the family is pointed to the helpline. If they say the wrong family was paid, the Trust takes it up outside the system; the members are ⛔ never asked to pay twice for one death. | The members pay once per death, always. | A family that was truly owed (for example, the first claim used a false date) gets ⛔ nothing from the members, and an appeal it **wins** after the payment pays ⛔ nothing. Its only remedy is whatever the Trust can recover from the person paid. |
| **B** | **The Panel may order a second payment, case by case.** A claim closed this way can be reopened only by a recorded Panel decision, and then goes ahead as a normal claim. | A family wrongly passed over can still be paid — by your decision only. | The members pay twice for that death, out of what other families receive. A new power, and a new screen to build. The Panel must judge a dispute between two families. |

**Our reading:** **A** — **because** preventing a second collection for one death is the reason this question exists, and a payment
made to the wrong family through a false date is a fraud for the Trust to pursue against the person paid, ⛔ not a debt for the
members. ⭐ A does ⛔ not shut B out: if a real case arises, B can be added as its own piece of work with ⛔ nothing in A undone.

---

# Q3 — Is the family whose claim is closed this way sent a text?

**In one sentence:** When a claim is closed because the death was paid on another claim, should the Trust **text** that family, or is it
enough that the app and the helpline say *"This claim has been closed. Please call the helpline."*?

**The one fact that decides it:** ⭐ in the usual case the closed claim is a duplicate **from the same family that is being paid** on the
other claim — a text saying *"your claim has been closed"* would reach the very family being paid, at the moment it is being paid.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | ⛔ No text. The app and the helpline show *"This claim has been closed. Please call the helpline."* | A family finds out when it looks or calls. | A **different** family that filed only through the helpline learns its claim was closed only when it calls. |
| **B** | A text, once, in the words you already chose for a closed claim (`-291` Q2): *"Your claim for [member] has been closed. Please call the helpline."* | Every family is told promptly. | It alarms a family that is being paid on the other claim; it needs the same counsel check as FQ7 (a person who never agreed to be contacted). |

**Our reading:** **A** — **because** the usual closed claim is the paid family's own duplicate, and the helpline knows why any claim was
closed. ⭐ Until you answer, the system builds A — nothing is sent that you have not ruled.

---

# What is at stake right now

- **Live today:** ⛔ nothing. The system is ⛔ not in production; ⛔ no claim has been paid.
- **Blocked:** Story 6.28's own build only — `2026-10-08-294` §3 puts this question before its code. ⛔ Nothing else waits on it.
- **If nothing is decided:** the system goes live on **C** — a death can be paid twice, and the second payment comes out of what other
  families receive.

---

# How much to trust this note

- **Earlier versions of this question:** FQ5 (`2026-09-28-262`) asked *"two claims for one death — which one gets paid?"* but **only for
  the suspicion case**; you chose A (the new claim waits for the appeal) over C (*"whichever claim is approved first is paid"* — *"a race
  between staff"*). ⚠ Q1 A here **resembles that C**, for the cases FQ5 does ⛔ not cover; the difference is the warning, the reason and the
  note — and that FQ5's own rule still governs the suspicion case. ⭐ Weigh that resemblance yourselves.
- **Corrected in this note (before it was put):** the gap was first recorded (`2026-10-08-294` §2) as three narrow paths around the
  suspicion case plus one older root. Tracing the code for this note found the **simplest** path needs ⛔ no refusal at all — two filings
  more than 30 days apart, or a staff *"treat as separate"*. ⇒ the question is put for **every** second claim, ⛔ not only the suspicion
  corners.
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
taken back. We suggest: one payment per death. The first claim to be finally approved is paid; any other claim for that death is closed;
and anyone approving while another claim for the same death is open is warned and must give a reason and a note. The suspicion case
keeps the rule you already made.

**Q2.** If the death has already been paid and another family later shows it should have been paid instead, we suggest the members are
⛔ not asked to pay again — the Trust takes the matter up outside the system. If you later want the power to order a second payment in a
rare case, it can be added on its own.

**Q3.** We suggest ⛔ no text when a claim is closed this way, because it is usually the paid family's own second filing; the app and the
helpline tell anyone who looks or calls.

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

> **`2026-10-07-291` Q1 A** (Trustee-ratified). *"a time limit to appeal THIS kind of refusal only — 90 days from the refusal … Every
> other refusal keeps ⛔ no time limit."* **Q2 B:** *"a text, once: 'Your claim for [member] has been closed. Please call the helpline.'"*

> **`2026-10-07-293` item 2 A** (Trustee-ratified). While any other claim for the same death is not closed, a refusal's reason can ⛔ not
> be changed away from *"nominee changed after the death"*.

> **`2026-09-21-239` (c)** (Trustee-ratified). *"Yes refusal appealable once."*

## E2 — What is NOT ratified

- ⛔ No ruling says a death is paid **once**. FQ5 decides only the suspicion case; `-261` D4 B only that such a claim is kept apart.
- ⛔ No ruling covers two claims for one death **outside** the suspicion case — a refile more than 30 days later, a staff override apart, or
  an ordinary refusal overturned after another claim was approved.
- *"Members pay the nominee directly; the Trust never disburses"* is `2026-09-04-192` — an **author's** record, ⛔ not a Panel ruling.
- The appeal right with ⛔ no time limit (every refusal but `-239`) is the PRD's and Story 6.16's (D-E), ⛔ not a Panel ruling.
- `2026-10-08-294` (author-commit) recorded the gap and opened this row; it decided ⛔ nothing a person is owed.

## E3 — What the code actually does (as of `main` at `34b9bab6`, 2026-10-10)

- **⛔ No per-death rule in the approval gate.** `assertClaimApprovable` (`packages/domain/src/claim/nominee-name-check.ts:403-435`):
  certificate accepted → bank accounts + nominee determination + name check → ground inspection → (final step only) the suspicion wait
  (`suspicion-refusal.ts:372`) → late warnings. The ONLY cross-claim conjunct is the suspicion wait.
- **⛔ No per-death rule in the database.** `claims` has a non-unique `claims_deceased_member_id_idx` and the unique
  `(pariwar_id, claim_case_id)` only (`schema/claims.ts:166-172`; migration `0051`).
- **⛔ No per-death rule at the cycle commit or the pool spawn.** `commitCycleFreeze` (`state-trustee-decision-persist.ts:1244`) approves
  every `state_trustee_approved` claim that passes its re-checks (routing, return, suspicion wait, inspection); `planCycleSpawn`
  (`pool/spawn.ts:285-290`) refuses only a repeated `claimCaseId` — ONE pool per committed claim; `pools` is unique per
  `(pariwar_id, cycle_id, pool_index)` only (`schema/pools.ts:247`).
- **The payment.** Each member is assigned to exactly one of the cycle's N pools (`pool/assign.ts:137-183`) and pays the nominee's
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
grep -n "index(\|uniqueIndex(" packages/domain/src/schema/claims.ts packages/domain/src/schema/pools.ts
sed -n 280,292p packages/domain/src/pool/spawn.ts
sed -n 60,66p packages/domain/src/claim/icp.ts; sed -n 109,139p packages/domain/src/claim/icp.ts
sed -n 150,160p packages/domain/src/claim/suspicion-refusal-persist.ts
grep -n "CLAIM_NOT_CLOSABLE_STATES =" packages/domain/src/claim/state.ts
git grep -n "deceased_member_id\|deceasedMemberId" -- packages/domain/src/pool/spawn.ts packages/domain/src/pool/assign.ts   # EMPTY = ⛔ no per-death check
```

---

<!-- AFTER THE PANEL RULES: follow the template's closing steps (transcribe; keep the body unedited; record what the ruling does NOT
cover; discharge in the story, `sprint-status.yaml` row `6-28-…` and `deferred-work.md`; then Story 6.28's author-commit). -->
