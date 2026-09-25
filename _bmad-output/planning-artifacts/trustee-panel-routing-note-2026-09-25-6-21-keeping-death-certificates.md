# Trustee Panel routing note — 2026-09-25 — how long the Trust keeps a death certificate

> ## ✅ RULED 2026-09-25 — [`2026-09-25-243`](../../.decision-log.md#decision-2026-09-25-243) (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev)
>
> *"option C, death certificates are not valid identity documents."*
>
> ⇒ A death certificate is ⛔ **not** an identity document under `-240` cl.1. **Every** certificate is kept for as long
> as claim records are kept, and ⛔ nothing is deleted at closure. ⚠ **What this does ⛔ NOT cover:** the retention
> **period**; the **legal basis**, which is counsel's and is owed before go-live (especially against an erasure request);
> and other claim documents. Our reading that erasure follows the same answer is recorded in `-243` as ⛔ unratified.
> ⭐ Everything below is kept **unedited**, as the question **as it was put** ([[feedback_supersede_never_reinterpret]]).

**§0 gate — passed.** This is about **what the Trust keeps about people** and on what **basis** — both on the
template's list of Panel questions. It is ⛔ not an engineering choice: every option below is equally easy to build.

---

# The question

**In one sentence:** When a claim closes with no fraud found, may the Trust keep the death certificates the family
sent — and if so, all of them, or only the one it accepted?

**Why it cannot be decided without you:** You ruled on 21 September that identity documents collected on a claim are
**deleted** when the claim closes without a finding of fraud. You did not say whether a **death certificate** is one
of those documents. BigDev has since decided that, while a claim is open, **every** certificate the family sends is
kept — including ones that were turned back for an unclear date. What happens to them **after** the claim closes
depends on how your earlier ruling reaches them, and only you can say that.

## The one fact that decides it

**Whether a death certificate is an "identity document" under your 21 September ruling.** It names the member and
their date of birth — so it identifies a person — but it is also the **proof of the death the Trust paid out on**.
If it is an identity document, the ruling already answers the question (delete at closure, unless fraud is found).
If it is the claim's own record, it follows the rules for claim records instead.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **It is an identity document.** Every certificate is deleted when the claim closes with no fraud found. | The family's papers are gone after an honest claim. | The Trust keeps **no proof of the death it paid on**. If a fraud comes to light **after** closure, the certificate is gone. And a family whose refusal is later reversed may be asked to send it again. |
| **B** | **Keep only the ACCEPTED certificate** as the claim's record; delete the turned-back ones at closure (unless fraud is found). | The family's unclear copies are deleted; the one the Trust relied on is kept, like the rest of the claim record. | We still hold the deceased's name, date of birth and date of death for as long as claim records are kept. That period is **not yet fixed**, and counsel must confirm the basis. |
| **C** | **Keep every certificate** for as long as claim records are kept. | Nothing is deleted at closure. | This keeps more than the Trust needed to pay, which **is the retention for "just in case" that you declined** for identity documents on 21 September. It needs a legal basis counsel has ⛔ not yet given. |

**Our reading:** **B** — **because** the accepted certificate is the proof behind a payment and belongs with the claim's
record, while a turned-back copy was only ever a step towards it. B keeps what the Trust relied on and nothing more,
which is the spirit of your 21 September ruling. ⚠ B is ⛔ not what BigDev first wanted ("keep them all"), and it is
stated plainly so you can choose C knowingly.

**A second, smaller point, in the same answer.** A member's data can be **erased on request** in two cases today:
after they withdraw, or after they are terminated. The certificates should follow **the same answer** you give
above: under **A** they go; under **B** only the accepted one stays; under **C** they all stay. ⚠ Under **B** and
**C**, keeping anything after an erasure request needs a legal basis from **counsel** — this note does ⛔ not assume
one.

---

# What is at stake right now

- **Live today:** nothing. The system is ⛔ not in production, and the rule for rejecting certificates is not built yet.
- **Blocked:** **nothing is blocked from being built.** Story 6.21a keeps every certificate while the claim is open,
  which every option allows. ⚠ Your answer is needed **before go-live**, because that is when the first claim can close.
- **If nothing is decided:** certificates pile up with no rule for when they go. That is the outcome least
  consistent with your 21 September ruling.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. The question was first written inside the Story 6.21 story
  file (v0.2–v0.4), where it was **wrongly** filed as an engineering choice and **wrongly** placed inside `-238`'s
  counsel item (a). Item (a) concerns keeping PAN/Aadhaar details of **non-members** for the fraud register,
  ⛔ not death certificates. An independent review of the story caught both mistakes.
- **Corrected in this note:** the story's first draft argued "every certificate is evidence, so keep them all".
  That is **close to the argument you declined on 21 September** (option A there: *"keep every filer's identifiers permanently"*; you also declined option C, *"keep all for a fixed period"*). It is not
  repeated here as our recommendation.
- **Still uncertain:** (1) how long claim records are kept at all. The draft privacy policy says *"statutory
  limitation period + audit needs"*. That is ⛔ not a ratified number, and the Trust's retention schedule lives outside this repository
  and has no row for claim records yet. (2) Whether erasure can reach a member with an open claim at all; it can for a
  **terminated** member.

---

# In plain English

When a family sends a death certificate that we cannot use (the date of death is missing, unclear or impossible),
we ask them for another. Both copies sit with the claim while it is open. The question is what happens to them
once the claim is over and no fraud was found. Your earlier ruling says identity papers are deleted then. We think
the **certificate the Trust accepted** is different: it is the proof behind the payment, and it should stay with
the claim's record. The **copies we turned back** have no further use and should be deleted like other identity
papers. We suggest **B**. If you think every copy should be kept, choose **C**, and counsel will need to confirm
the basis.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-09-21-240` cl.1** — *"RETENTION — only the guilty are kept. The claim form collects identity documents as
> it must in order to pay anyone; where a claim closes with ⛔ **no** finding of fraud they are **deleted**. Only
> records against which an investigation **found fraud** are retained."* (As transcribed. The Panel's words were
> *"fraud register — Q1. option B"*, and cl.1 is the note's own option B.)

> **`2026-09-20-235` Y** — *"… if no date is mentioned on death certificate then certificate is rejected, only
> certificate with clear date is acceptable."*

> **`2026-09-20-236` BB** — *"Yes, family will be asked to produce certificate with clear date without the claim
> being denied."*

> **`2026-09-21-238`** — *"there could be cases of fraud by producing fake certificate and all."* (context, ⛔ not a
> retention rule)

## E2 — What is NOT ratified

- Whether a death certificate is an "identity document" under `-240` cl.1.
- **When** `-240`'s deletion fires. `-240`'s own "does ⛔ NOT cover" leaves it open; its unratified reading is
  *"after the appeal path is exhausted or its window lapses"*.
- Any retention period for claim records.
- A legal basis for keeping any claim document against an erasure request.
- BigDev's 2026-09-25 call to keep every certificate **while the claim is open** is an author decision (to be
  recorded as `2026-09-25-244`). It does ⛔ not reach past closure.

## E3 — What the code actually does

- Today a second upload for a claim **overwrites** the first certificate in object storage. The upload handler reuses
  `claimDocumentId` in the storage key (`apps/api/src/modules/claims/claims.documents.handlers.ts`,
  `uploadClaimDocument`). Story 6.21a changes this so every upload is kept.
- ⛔ No code deletes claim documents at closure, and the erasure routine (`packages/domain/src/member/anonymize.ts`)
  does ⛔ not touch `claim_documents` or object storage. ⇒ under **every** option some deletion code is owed; under
  **A/B** it is owed at closure as well.
- Erasure is legal from `withdrawn` or when the moderation overlay reads `terminated` (`resolveRtbfLegality`,
  `apps/api/src/modules/rtbf/handlers.ts`). Claim intake checks only that the member exists. ⇒ a member with
  claim certificates **can** become erasable (inference from the two predicates; ⛔ not exercised by a test).

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-240' .decision-log.md
grep -n '^### Decision .*-235' .decision-log.md
grep -n 'claimDocumentId}' apps/api/src/modules/claims/claims.documents.handlers.ts
grep -n 'claim_documents\|claimDocuments' packages/domain/src/member/anonymize.ts   # ⇒ expect EMPTY
grep -rn 'resolveRtbfLegality' apps/api/src/modules/rtbf/handlers.ts
grep -n 'Claim & appeal records' docs/legal/privacy-policy.md
```
