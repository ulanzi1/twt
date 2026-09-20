# Trustee Panel routing note — a nominee changed after the death: what happens to the family's claim?

> **§0 gate — passed (2026-09-20).** This is the Panel's: it is about **what a family is owed** when the nominee has been changed after a
> death. Stripped of every citation the sentence is *"if the nominee was changed after the member died, is the family's claim turned down —
> or sent back until the right person's bank account is given?"* — not a question we would settle alone in front of a trustee. ⚠ It was
> **mixed**, so it is split: the Panel is asked **only** what happens to the claim. *How* the software records which version stands is
> ours and is not asked.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new decision
> id. Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** When the nominee was **changed after the member died** and the District Admin discards that change, is the family's
**claim turned down** — or is it **sent back** until the bank account of the nominee the member originally chose is given?

**Why it cannot be decided without you:** You ruled that in that case *"that nominee claim will be denied and only nominee that was chosen
by member will receive the claim."* We have built the rule for **which nominee counts**. But the system has **no such thing as "that
nominee's claim"** — there is one claim for a death, and the bank accounts on it are **not tied to any named nominee**. So we have to choose
what "denied" becomes, and that decides what the family is told and what they must do next.

## The one fact that decides it

**The system cannot turn down one nominee's claim, because the claim is not divided by nominee.** The bank accounts on a claim are entered
by whoever files it; the software **deliberately** holds no link between them and the declared nominees. The **only** place the two meet is
the District Admin's **name check** — *does the bank account holder match the nominee?* — and your earlier ruling is that a name that does
not match is **sent back for correction, never denied.** So a *denial* for a post-death change would be a **second, different outcome**,
alongside the one you already ruled.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Discard the change and send the claim back.** The change is discarded; the claim continues; the name check then finds the bank account is **not** the member's chosen nominee, so it is **sent back** for the right person's details. If the family never gives them, the claim is closed after 90 days by the closure process you ruled — **not appealable**. | The family is **asked** for the correct nominee's account; nobody is told "denied". | A person who changed the nominee **on purpose** is treated the same as someone who made a mistake — asked again, not refused — and a deliberate attempt **waits at least 90 days**. The member's chosen nominee learns of it only if the family or a staff member reaches them. |
| **B** | **Turn down the whole claim** when a post-death change is found — a **first refusal**, appealable **once**. The member's chosen nominee starts a **new** claim. | A firm answer at once; the change has a consequence. | A relative who made an **honest error** after the death is **refused** and must file again. The refusal can be **appealed once**, so someone who acted wrongly gets an appeal. The chosen nominee must **start from the beginning**. |
| **C** | **Turn it down only if the District Admin records that it was deliberate;** otherwise send it back. | Honest mistakes are sent back; deliberate ones are refused. | It rests on **judging intent** — something the District Admin cannot see — so outcomes will differ from case to case. |

**Our reading: A** — **because** it keeps your ruling that a name problem is never a reason to refuse a claim, it needs no new kind of
outcome, and a family that never answers still reaches the 90-day closure. **Cost, honestly:** a deliberate attempt is not refused, only
delayed. ⚠ **This is separable:** if you prefer B or C, the discarding of the change is built the same way; only what happens to the claim
afterwards differs.

### One limit this ruling cannot remove

The **one-time code** that lets a family start a claim is sent to the **nominee's current mobile number — before the system knows the date of
death.** Someone who changed that number after the death would receive the code and could start the claim. Your rule undoes the **effect**
when the District Admin checks the certificate; it **cannot stop this step**, because at that moment there is no date to compare with. We
are recording it so it is a known limit, **not a surprise.**

---

# What is at stake right now

- **Live today:** **Nothing.** The code is not in production.
- **Blocked:** the **wording the family sees** and what the District Admin's decision does to the claim. The history of changes, the lock
  at the first claim and the timeline can be built without it.
- **If nothing is decided:** **A** stands, and the story says so.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. It was found while writing the story, when we noticed the bank accounts are not tied to
  nominees.
- **Corrected in this note:** we first assumed a *per-nominee* denial could simply be built. The software was designed the other way, on
  purpose — a claim's bank accounts carry no link to the declared nominees.
- **Still uncertain:**
  - We do not know **how often** the person filing is the genuine nominee, or how often it is not.
  - A death can, in rare cases, have **more than one claim** (a new one may be filed after a refusal); we have not traced every way that can
    happen.
  - Whether **B** would in practice let a wrongdoer appeal, and to what effect, depends on the appeal rules, which we have not re-read here.

---

# In plain English

You ruled that if the nominee is changed after the member's death, that change does not count and only the nominee the member chose
receives. We can build the part that says **which nominee counts.** But the software has no "that nominee's claim" to turn down: there is
one claim for a death, and its bank accounts are not tied to a nominee.

There are three ways to handle the family's claim. **Send it back** until the right nominee's bank details are given (gentle, keeps your
earlier ruling, but a deliberate change is only delayed). **Turn the whole claim down** and let the chosen nominee start again (firm, but an
honest mistake is punished, and the refusal can be appealed once). Or **turn it down only when the District Admin records it was deliberate**
(fair in theory, but it asks them to judge intent).

We suggest **sending it back**, because it keeps your earlier ruling and needs nothing new. If this paragraph and the evidence below ever
disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-20-234` (V), Trustee-ratified:**
> *"… However if nominee has been changed after death that nominee claim will be denied and only nominee that was chosen by member will receive the claim."*

**`2026-09-19-226` clause 6, Trustee-ratified:**
> ⭐ **A MISMATCH THAT IS ⛔ NOT CLERICAL IS SENT BACK FOR CORRECTION** (follow-up (b)) — the claim is ⛔ not denied for it.

**`2026-09-20-230` clause 5, Trustee-ratified:**
> *"Yes appealable after first refusal, not after second - after second no response to a correction request."*

**Story 6.16, D-F:** *"A claim has at most ONE appeal journey, ever."*

## E2 — What is NOT ratified

- **What "denied" means when there is no claim per nominee.** Not ruled.
- **Whether a post-death change is refused outright, or the claim is sent back.** Not ruled.
- **Whether the outcome depends on intent.** Not ruled.

## E3 — What the code actually does

- **A claim's bank accounts carry no nominee link — deliberately.** The schema comment for `claim_nominee_bank_accounts`: *"NOT one row per declared nominee and NOT the 75/25 nominee split … So there is deliberately NO `nominee_rank` column, NO FK to `member_nominees`, and NO holder-name-must-match-nominee linkage of any kind."* (E4.2)
- **On a name mismatch the claim is sent back, not denied.** `packages/domain/src/claim/nominee-name-check.ts`: *"`-226` cl.6 — the claim is SENT BACK for correction. ⛔ It is not denied …"* (E4.3) ⚠ *This file is Story 6.18's, not yet committed.*
- **The handover code goes to the current rank-1 mobile.** `sendHandoverOtp` reads `nominees[0]` (rank-ordered) and sends to that nominee's decrypted mobile. (E4.4)
- **A new claim after a refusal is allowed on purpose.** `getClaimByDeceasedMember`: *"a death whose earlier claim already reached a terminal outcome must be able to re-file (e.g. a fresh claim after `denied`)."* (E4.5)

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 the rulings, verbatim
grep -c "that nominee claim will be denied and only nominee that was chosen by member will receive the claim" .decision-log.md   # -> 1
grep -n "A MISMATCH THAT IS ⛔ NOT CLERICAL IS SENT BACK FOR CORRECTION" .decision-log.md                                       # -> found (-226 cl.6)
grep -c "Yes appealable after first refusal, not after second" .decision-log.md                                                 # -> 1

# E4.2 the bank accounts carry no nominee link
grep -n -i "nominee\|rank" packages/domain/src/schema/claim_nominee_bank_accounts.ts                                            # -> the header comment quoted in E3

# E4.3 a mismatch is sent back, not denied
grep -n -i "sent back\|not denied" packages/domain/src/claim/nominee-name-check.ts                                              # -> line 318

# E4.4 the handover code goes to the current rank-1 mobile
grep -n "nominees\[0\]" apps/api/src/modules/claims/claims.service.ts                                                           # -> line 101: `const primary = nominees[0]; // rank-ordered (primary first)`

# E4.5 re-filing after a refusal is allowed
grep -n "fresh claim after" packages/domain/src/claim/read.ts                                                                    # -> line 120, the comment quoted in E3
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (a ruling on the claim's outcome does not settle the handover-code limit, which is recorded, not fixed).
4. Discharge the item wherever it is carried — Story 6.20's open question P1 and the provisional D14 — and mark it DISCHARGED, never delete it.
5. If implementation follows (option B or C), it needs a ROW: a reason code for the refusal and its appeal wiring. -->
