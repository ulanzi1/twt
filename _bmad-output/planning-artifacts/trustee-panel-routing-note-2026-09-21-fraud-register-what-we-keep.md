# Trustee Panel routing note — the fraud register: what we keep, and about whom

> **§0 gate — passed (2026-09-21).** All three questions are the Panel's: what the Trust **keeps** about
> people and for how long, what it **asks of every member** to make a ban reachable, and what it **owes**
> someone it shuts out by mistake. Stripped of every citation: *"after a family has claimed and been paid,
> do we keep their identity papers forever; do we ask every member for their nominee's PAN just in case;
> and if we bar the wrong person, do they get anything?"*
>
> ⚠ The question was **mixed** and has been split. Three things that came up with it are ⛔ **not** here:
> whether the law permits the retention (counsel's); which identifiers can technically be captured (ours —
> one proposed cannot be captured at all); and how matching is implemented (ours). They are in EVIDENCE so
> the Panel can see they were handled, ⛔ not so the Panel has to handle them.

> ## ✅ PANEL RULED — 2026-09-21
>
> **Ratifying trustees:** Dhiraj Rahul + Kalpana Bharti. ✅ **DISCHARGED — recorded as `2026-09-21-240`** in `.decision-log.md` (2026-09-21). ⭐ Kept, ⛔ not deleted: this
> line previously read *"owed an entry"* ([[feedback_governance_commits_precede_implementation]]).
>
> | | Ruled | Meaning |
> |---|---|---|
> | **Q1** | **option B** | The claim form collects identity documents as it must; where the claim closes with ⛔ no finding of fraud they are **deleted**. Only records against which an investigation **found fraud** are kept. ⇒ the register holds the guilty, ⛔ never everyone who claimed |
> | **Q2** | **option A** | The ban reaches **filers only**. Members are asked ⛔ **nothing** new — ⛔ no nominee PAN at declaration. A banned person named as someone's nominee is caught **at the moment they claim**, ⛔ not before |
> | **Q3** | **option A** | Only **exact** identifiers bar (PAN, Aadhaar token). A name / date-of-birth / father's-name match raises a **review a human must confirm** — it ⛔ never bars on its own |
>
> ⭐ All three match the note's recommendation.
>
> **⚠ What this ruling does ⛔ NOT cover:**
> - **When deletion happens.** *"The claim closes"* is ⛔ not a single moment: `denied → appeal_stage_1 →
>   _2 → _3 → reversed` are all live claim states, so a denial is ⛔ not final. ⇒ pin deletion to **after the
>   appeal path is exhausted or its window lapses**, so a **reversed** denial does ⛔ not force a bereaved
>   family to produce the same documents a second time.
>   ⚠⛔ **A CORRECTION TO AN EARLIER DRAFT OF THIS BLOCK, recorded rather than silently fixed:** it claimed
>   deletion would *"delete evidence an appeal still needs."* **That was wrong and BigDev caught it.** The
>   6.16 appeal is a **procedural-fairness review of the DECISION** (Stage 1 a District Admin who was ⛔ not
>   the original decider; Stage 2 a State Trustee vote) — it ⛔ never re-examines who the claimant is. And a
>   refusal on fraud suspicion is by definition ⛔ **not** a clean outcome, so Q1(B) would ⛔ not delete it.
>   ⇒ the surviving concern is **re-collection**, ⛔ not evidence loss.
> - **Q3 option A depends on an exact identifier EXISTING — ⭐ and BigDev has closed this.** The note flagged
>   that a claimant giving a **false PAN** would be matchable by ⛔ nothing. ⇒ **a PAN verification service
>   will check PAN against name at collection and tell the person whether it matched** (BigDev author-commit,
>   2026-09-21). That turns PAN from a *claimed* identifier into a *verified* one, which is what Q3(A)
>   assumes. ⚠ Four consequences owed before build: the **fail mode** when the service is down (fail-closed
>   stops a grieving family; fail-open admits an unverified PAN and breaks Q3(A)'s premise); **fuzzy name
>   matching** (`RAJESH KUMAR SHARMA` vs `Rajesh Sharma`) which makes a false *"did not match"* into
>   **member-facing copy at the worst moment** — owing the dignified-validation three-part grammar and
>   falling inside the microcopy gate; a **third-party processor** relationship under the same DPDPA
>   analysis; and **whose PAN** — scoped to **the person who files and the person who is paid**, since Q2(A)
>   declined to demand a third party's document from a member.
> - ⛔ It does **not** move `-226`, `-227` or `-233`–`-236`.
>
> ⭐ **Implementation needs a ROW** — the fraud register is ⛔ not part of Story 6.20 and has ⛔ no sprint row.

---

# The fact that governs all three questions

⭐⭐ **The Trust learns who a person IS only when a claim is filed — ⛔ never before.**

When a member names a nominee, we ask for four things: a **name, a relationship, a mobile number and
(optionally) an address**. ⛔ No PAN. ⛔ No date of birth. ⛔ No father's name. ⛔ Nothing that identifies one
human being rather than another.

Identity documents appear **only on the claim form**, from whoever comes forward to claim. ⇒ **a fraud
register can only ever hold the person who FILED.** It ⛔ cannot hold the nominee a member named, because
the Trust holds ⛔ nothing about that person capable of recognising them again.

⚠ That single fact reshapes what is worth asking, and it is why an earlier draft of this note asked the
wrong question — see *How much to trust this note*.

---

# Question 1 — what does the Trust keep once a claim is closed?

**In one sentence:** The claim form has to collect identity documents in order to pay the money at all, so
the choice is ⛔ not whether to collect — it is **what survives** after the claim is settled.

**Why it cannot be decided without you:** It decides whether the Trust becomes a permanent archive of the
identity papers of bereaved families, most of whom have done nothing wrong.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Keep every filer's identifiers **permanently** | Everyone who ever claims is on a Trust register for life | Catches a repeat offender even if the first fraud was ⛔ never investigated. The Trust holds permanent identity files on thousands of honest, bereaved families — the largest store of personal data it will ever hold |
| **B** | Keep **only** where an investigation found fraud; delete the rest when the claim closes | A family that claims honestly has its papers erased when the case ends | Register stays small and holds only the guilty. A fraudster who targeted a Pariwar that ⛔ never investigated is ⛔ not registered, so some slip through |
| **C** | Keep **all** for a fixed period, then keep only the guilty | Papers are held for a while, then erased unless there was a finding | Catches frauds discovered late. Needs a period nobody can presently justify — ⚠ and *"a few years"* chosen arbitrarily is the kind of number that ⛔ never gets revisited |

**Our reading: B** — **because** a register exists to hold people a finding has been made against, and A
turns it into something else: a record of everyone who has ever buried a family member. ⚠ The honest cost
of B is real — it only ever contains people somebody bothered to investigate.

---

# Question 2 — should a ban be able to reach someone who never files?

**In one sentence:** A banned person ⛔ cannot be recognised as a **nominee**, because the Trust holds ⛔ no
identifier for a nominee — only a name and a mobile the member typed in.

**Why it cannot be decided without you:** Closing that gap means **asking every member, at sign-up, for
their nominee's PAN** — a new demand on every single member, for a fraud that will ⛔ never involve the vast
majority of them.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The ban reaches **filers only** | Members are asked ⛔ nothing new. A banned person can still be *named* as someone's nominee, and is caught only if they come forward to claim | A banned person named as a nominee is caught at the moment they claim — ⚠ which is the moment the family is grieving and expecting money |
| **B** | Ask members for their **nominee's PAN** at declaration, so a ban can reach them | Every member must obtain and enter a document number belonging to **another person** | The ban becomes checkable before a death. ⚠ Many members will ⛔ not know their nominee's PAN; some nominees will refuse to give it; and the Trust would hold identity documents for people who ⛔ never joined and ⛔ never claimed — a larger store than Question 1 contemplates |

**Our reading: A** — **because** option B taxes every member for a rare event, and collects documents about
people who may ⛔ never have any dealing with the Trust at all. ⚠ But A has a real cost the Panel should
weigh: the catch happens **at claim time**, in front of a bereaved family.

---

# Question 3 — if we bar the wrong person, what are they owed?

**In one sentence:** The ban is indefinite, ⛔ cannot be appealed, and only a Super Admin can lift it — so a
wrong match shuts an innocent teacher out of the Trust for life with ⛔ no route back.

## The one fact that decides it

⭐ **A match on name, date of birth and father's name is a GUESS, ⛔ not proof.** Two people genuinely share
all three. Only a PAN or an Aadhaar token identifies exactly one human being.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Only **exact** identifiers bar (PAN, Aadhaar token). A name-and-birthday match raises a **review** a human must confirm | An innocent person with a common name is ⛔ never barred by the system alone | A fraudster who gave false documents at filing may ⛔ not be matched at all |
| **B** | **Any** match bars; Super Admin discretion is the only remedy | Maximum catch | An innocent person's only hope is that somebody notices. ⚠ They will ⛔ not be told why they were refused |
| **C** | Any match bars, but **one appeal** is allowed | A wrongly-barred person has a route back | Contradicts your *"⛔ not appealable"* ruling, so it would supersede it |

**Our reading: A** — **because** it keeps the ban decisive exactly where the evidence is decisive, and stops
the system acting on its own where it is ⛔ not. That is the posture the Panel has already taken on the
nominee rule: the system shows, a human decides.

---

# What is at stake right now

- **Live today:** ⛔ Nothing. ⛔ No fraud register, ⛔ no PAN stored anywhere, ⛔ no father's name collected
  anywhere, and the Trust has ⛔ never held a full Aadhaar number. Entirely precautionary.
- **Blocked:** ⛔ **Nothing in the nominee work.** The declaration history, the lock at the first claim, the
  release route for a living member and the refusal path all proceed regardless. These questions gate the
  fraud register, which is a separate build and is ⛔ not yet scheduled.
- **If nothing is decided:** the register is ⛔ not built, and the ban you ruled on stays unenforceable —
  there is ⛔ no identifier on file to recognise a returning person by.

---

# How much to trust this note

- **Earlier versions of this question — TWO were wrong, and both were caught by BigDev, ⛔ not by us.**
  ⭐ **(i)** The first draft argued the retention basis was the money-laundering law. **Withdrawn** — the
  basis is the data-protection Act's own exemption for preventing and investigating offences. That draft
  also asked the Panel to bless a legal reading, a **§0 gate failure**; it is counsel's question and has
  been removed.
  ⭐⭐ **(ii)** The second draft asked *"do we collect identity documents from every grieving family?"* and
  offered an option to *"collect nothing new."* **Both were wrong.** The claim form **must** collect
  identity documents in order to pay anyone, and fraud is only ever detectable **after** a claim is filed.
  ⇒ collection was ⛔ never the choice; **retention** is. That draft also proposed banning *"the nominee"*,
  which the Trust ⛔ cannot do — it holds ⛔ no identifier for a declared nominee. Question 2 exists because
  of that correction, and it is the question the note should have asked from the start.
- **Corrected in this note:** the proposed identifier set included a phone's **IMEI**. That **cannot be
  captured at all** on any current phone, so it was dropped rather than offered as a choice. A *"bank
  account used for premium payments"* was also proposed; the Trust holds ⛔ no such account — members pay by
  UPI — so the nominee's payout account replaced it.
- **Still uncertain:** whether our identity provider can issue an Aadhaar token at all. It is ⛔ not
  derivable from the masked last-4 we hold. ⚠ **If it cannot, the strongest exact identifier is PAN alone**,
  which weakens Question 3's option A — the Panel should know that before choosing it. Being checked with
  the provider; ⛔ not a question for the Panel.

---

# In plain English

If somebody cheats the Trust over a death claim, you have said they should never be allowed back, and that
catching them even on a new phone number is the whole point. Three things follow that the ruling did not
reach, and one of them we got wrong twice before understanding it.

The Trust only ever finds out who a person really is **when they file a claim**. When a member names a
nominee, we ask for a name, a relationship and a phone number — nothing that could tell one person from
another years later. So a register of fraudsters can only ever contain **people who came forward and
claimed**. It cannot contain a nominee sitting quietly in somebody's file.

That means the first question is not whether to collect documents — the claim form has to, or we could not
pay anyone. It is what we **keep afterwards**. Every honest family that buries someone and files a claim
hands us their papers. Do those papers stay with us forever, or only for the families where something was
actually found? We suggest only where something was found.

The second question is whether we want the ban to reach someone before they ever claim. To do that we would
have to ask every member for their nominee's PAN number when they sign up — a document belonging to
somebody else, which many members simply will not have. We suggest not, and accepting that a banned person
is caught at the moment they come forward.

The third is what happens when we point at the wrong person. Matching people by name and birthday is
guesswork; plenty of people share both. Because the ban lasts forever and cannot be appealed, a mistake
would quietly shut an innocent teacher out for life, and they would ⛔ never be told why. We suggest only a
document number — something belonging to exactly one person — should bar anyone automatically, and a mere
name match should put the case in front of a human first.

⚠ If this section and the technical evidence below ever disagree, **the EVIDENCE is the record**.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-08-12-099`** (Story 10.20): *"Termination is an exceptional governance act, ⛔ not a stronger
> suspension. It carries its own threshold, its own reasoning and its own record."*

> **`2026-08-15-121`**: Niyamavali **§8.8 — Appeal against a moderation act — is AUTHORED AND RATIFIED**
> (Story 10.22). ⚠ Its Status line records the ruling as *"Ruled (BigDev, Solo Builder, 2026-08-15)"*.

⚠ **Consequence:** termination **is appealable today** — the appeal table's design note states *"Each is
separately appealable."* The ban ruling terminates **and** bans from one finding but makes only the ban
un-appealable ⇒ a member could appeal the termination and ⛔ not the exclusion flowing from the same
finding. Coherent, but a **narrowing of §8.8**, and it must be recorded as one.

## E2 — What is NOT ratified

- ⭐⭐ **The ban ruling is ⛔ NOT in `.decision-log.md`.** Given in session on 2026-09-20/21 (operator flags →
  District Admin verifies → Pariwar Admin imposes; indefinite; Super Admin lifts; ⛔ not appealable). Until
  transcribed it exists **only** in a conversation — the failure `-204` was written about. **An entry is
  owed before any build** ([[feedback_governance_commits_precede_implementation]]).
- The **legal basis** (the data-protection Act's exemption for prevention, detection, investigation or
  prosecution of an offence) is **BigDev's author-commit**, pending counsel. ⛔ Not a Panel ruling.
- ⛔ No ruling covers what the Trust keeps after a claim closes, what it may ask of a member about a third
  party, or what is owed to a person barred in error.

## E3 — What the code actually does

- **What a member is asked about a nominee — the complete list:** `name` (Tier-1, English script),
  `relationship` (Tier-3 plaintext), `mobile` (Tier-1), `address` (Tier-1, **optional**). 1–2 nominees. The
  split is **server-derived** (R4) and rank is server-stamped. The contract says so in terms: *"⛔ NO
  bank/IFSC and ⛔ NO Aadhaar/KYC fields here — claim-time only."* ⇒ **⛔ nothing identifying.**
- **The claims table holds `claimant_actor_id`** — a **session** identity, ⛔ not an identified person.
  Claimant name / mobile / address is Story 6.19's D5 and is **`backlog`** — ⛔ not built.
- **⛔ No PAN, ⛔ no father's name, ⛔ no nominee Aadhaar exists anywhere** in the schema. All are NEW fields.
  ⚠ BigDev's description of the claim form (*"PAN, DOB, Father's Name, Address, Mobile, Bank a/c, Aadhaar
  last-4"*) is the **intended** form; today it collects the **nominee's bank details** (holder name, account
  number, IFSC, optional VPA) and the deceased's documents.
- **The Trust has ⛔ never held a full Aadhaar number, by design** — `aadhaar_masked_id` is **Tier-3, last-4
  only**, *"masked at the provider boundary"*, and **NULL on the manual KYC path**. Last-4 ⛔ cannot
  uniquely identify anyone.
- **⛔ No fraud register, ⛔ no blacklist, ⛔ no signup check exists.** The only permanent-exclusion mechanism
  is the **12-month re-join lock** (Story 3.10 AC3) on `member_identities.mobile_blind_index`, *"a one-way
  deterministic HMAC"*, which erasure **deliberately preserves**: *"Clearing it would silently break the
  rejoin lock."* ⇒ an indefinite ban is that mechanism without the clock — already reasoned, already
  survives erasure, but keyed to a **phone number**, which a returning fraudster changes.
- **INFERENCE (labelled):** that a fraudster changes SIM is inferred from ordinary fraud behaviour, ⛔ not
  observed — there is ⛔ no production data of any kind (`-232`).

## E4 — Commands to re-verify every claim

```
sed -n '38,55p' packages/contracts/src/nominee/declaration.ts
grep -nE "claimantActorId|claimant" packages/domain/src/schema/claims.ts
grep -rniE "aadhaar|pan_number|panCiphertext" packages/domain/src/schema/
grep -rniE "father|guardian|parent_name" packages/domain/src/schema/ packages/contracts/src
grep -rniE "imei|device_fingerprint" packages/domain/src apps/api/src apps/mobile
sed -n '14,20p' packages/domain/src/member/anonymize.ts
grep -n "separately appealable" packages/domain/src/schema/member_moderation_appeals.ts
grep -niE "blacklist|black-list|permanently barred|never re-join" .decision-log.md
```

⚠ **An empty result is a finding, ⛔ not a pass.** The **last** command is expected to return **empty**, and
that emptiness IS the evidence for E2's first bullet. All commands were **run on 2026-09-21** and every
claim above held.

⚠⚠ **One E4 command was WRONG in an earlier draft and is recorded rather than quietly removed.** It read
`grep -n "6-20\|6.20" .decision-log.md`, annotated *"expected to return empty"*. It returns **33** matches,
every one a **date false-positive** (`2026-06-20-05…`), because an unescaped `.` matches any character. ⇒ it
could ⛔ never have caught the thing it claimed to test.
