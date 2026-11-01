# Trustee Panel routing note — a living member reported dead: what the investigation's finding does, and what comes after it

> **Status: WRITTEN 2026-11-01, ⛔ NOT SENT — BigDev sends.** Written from Story 6.22 (the first half of the fraud register), Task 0.3.
> ⛔ No member uses the system yet. Nothing here blocks building or merging; four answers (Q1, Q7, Q8, Q9) must be in before the parts
> they name go live, and four (Q3–Q6) before the ban itself is built.

## §0 — the gate

**It is the Panel's:** every question below decides what the Trust **owes** a person or **tells** them — whether a member found to have
faked their own death may erase their data and leave (Q1); who is barred for life (Q2, Q3, Q6); what a barred person is told (Q4); who
imposes a ban (Q5 — you ruled that the State Trustee imposes, and the system cannot tell who that is); whether a family's claim can be paid
while staff suspect the member is alive (Q7); whether a family whose claim is closed is told, may appeal, or may file again (Q8); and what
proof that a person is alive is enough to close a family's claim for good (Q9). Q1 also narrows two of your rulings (30 and 31 October), and
you ask for a narrowing to come back to you.

**Split out and ⛔ asked:** where the investigation is recorded, which staff screens show it, the order in which the system locks records,
and the wording of buttons — ours. **Stripped of every reference, the questions read:** *"when someone reports a living member dead, and
staff find out, what happens to the member, to the family that filed, and to the person who lied?"* — questions about people, ⛔ about code.

**Already ruled, and kept as ruled:** an investigation has two outcomes only, innocent or guilty (21 September); an innocent member is
released at once (21 September); the helpline operator flags and the District Admin verifies (21 September); a living member is unlocked
only by the investigation's finding, ⛔ by a bare staff note that they are alive (28 September). We build all four as you ruled them.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. ⭐ Everything below is then kept **unedited** as the questions **as they were put**.

---

# The question

**In one sentence:** we are building the investigation you ruled on in September — the helpline flags a death claim, and the District
Admin, having confirmed the member is alive, finds them innocent or guilty — and nine things around it are yours to decide: four about
what the finding does now, and five about the ban that follows it.

**Why it cannot be decided without you:** each answer changes who is locked, who is paid, who is told, or who is barred for life. Building
any of them our own way would decide it for you.

## The one fact that decides most of it

**The finding is the first time the Trust will say, on the record, that a member reported dead is alive.** Today nothing does. A living
member wrongly reported dead stays frozen out of their own record for ever: they cannot change their nominees, leave the Trust, or have
their data erased. Once the finding exists, a family's claim can be **closed because the person is alive** — and closing it stops the
family's claim for good. So the questions are mostly about the two sides of that moment: how sure staff must be (Q9), what happens to the
claim before staff are sure (Q7), what the family is told after (Q8), and what happens to a member who took part in the lie (Q1).

---

# Q1 — A member found ALIVE but GUILTY: do the death locks lift?

On 30 and 31 October you ruled that a member reported dead may erase their data, and may leave the Trust, once *"the report [is] closed
because the member is alive"*. A member found **guilty** — who took part in a false report of their own death — is alive, and we close
their false claim so it can never be paid. So your words, read literally, lift their locks too.

**The one fact:** lifting means a member just found to have faked their own death could have their data **erased** and **leave** the Trust
before any ban exists — and erased data cannot be banned later.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Lift on either finding** — your words as written. | A member found guilty is treated like an innocent one: they may leave, erase their data, and they appear on the public Member Directory as an ordinary member again. | They may erase and leave before the ban (Q3–Q6) is built. The Trust's own record of what they did could be erased with them. |
| **B** | **Lift on innocence only** (as built — our suggestion). A guilty member's claim is closed so nothing is paid, but their record stays as it was while the report stood: they cannot leave or erase, and they stay off the public Member Directory. | Nothing changes for an innocent member. A guilty member stays locked until the ban is decided. | It narrows your 30 and 31 October words, which is why it comes back to you. A member **wrongly** found guilty stays locked for ever: as built there is no appeal against a finding, and a claim can have only one finding. |
| **C** | **Lift on guilt only once the ban is imposed or declined.** | As B until the ban is decided; then the member is either banned or released. | The ban is not built yet, so until it is, C behaves exactly as B. |

**Our reading:** **B** — **because** your September ruling keeps the records of the guilty (*"only the guilty are kept"*), and lifting the
locks would let the guilty erase exactly those records. If you choose B, please also say whether a member found guilty may appeal the
finding (today, as built, they may not).

---

# Q2 — The NOMINEE of a member found guilty: barred automatically, or only on a finding of their own?

You ruled that a member found guilty is barred *"along with nominee and claimant"*. You did not say whether the nominee is barred simply
for being named, or only if an investigation finds they took part.

**The one fact:** a nominee may never have known they were named.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Automatically.** | Anyone named as nominee by a guilty member is barred for life. | A nominee who knew nothing is barred for life; the only remedy is the Super Admin lifting it. |
| **B** | **Only on a finding naming them** (our suggestion). | A nominee is barred only if an investigation finds they took part. | Each nominee needs their own investigation, and a nominee who took part but is never investigated is never barred. |

**Our reading:** **B** — **because** a lifetime bar on someone who may not have known they were named is the harsher mistake. Nothing is
built for either option; the ban on nominees and claimants waits for legal advice (see "Told" below).

---

# Q3 — Until the Trust holds PAN or Aadhaar, may a MOBILE NUMBER bar a member found guilty from rejoining?

You ruled that only an **exact** identifier — PAN or an Aadhaar token — may bar someone automatically; a match on a name or date of birth
goes to a person to confirm. The Trust does not collect PAN or Aadhaar yet (that waits for legal advice). The only thing the system knows a
member by is their mobile number.

**The one fact:** a mobile number is not on your list, and in India numbers are **recycled** to strangers. It also cannot catch the person
on a new number — and catching them *"even on a new phone number is the whole point"* (the note you ruled on in September).

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Widen your rule to include a mobile number.** | Anyone using that number is refused when they try to join. | A stranger who is later given the recycled number is refused, and the only remedy — the Super Admin lifting the ban — also frees the guilty person. |
| **B** | **A mobile match is held for a person to confirm.** | Anyone using that number waits while staff check who they are. | A new "held" step in joining and a staff queue to build; it still misses the guilty person on a new number. |
| **C** | **No bar until PAN or Aadhaar is collected** (our suggestion). | Nothing changes at joining for now. | A member found guilty can rejoin, on any number, until legal advice clears the identifiers. |

**Our reading:** **C** — **because** A would refuse innocent strangers to catch the one person it can most easily miss.

---

# Q4 — What is a barred person told when they try to join?

No ruling covers it.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Plainly, that they are barred by a Trust decision.** | The person knows why. | Whoever holds the number — perhaps a stranger with a recycled number — learns that someone was barred. |
| **B** | ***"We cannot register this mobile number. If you think this is a mistake, please call the helpline."*** (our suggestion) | The person is sent to the helpline, which can explain. | A barred person is not told the real reason and must call to learn it. |
| **C** | **The words already used for the 12-month rejoin lock.** | — | They would be false: those words give a date when the person may rejoin. |

**Our reading:** **B** — **because** it tells no stranger anything and still gives the real person a way to ask.

---

# Q5 — Who is "the State Trustee" who imposes the ban?

You ruled that the Pariwar Admin **refers** a guilty member and the **State Trustee imposes** the ban. The system has no State Trustee role;
the only time you have said who acts for the State Trustee, you said a Pariwar Admin does (30 October). Here that would let the person who
refers also impose.

**The one fact:** the only staff role different from both the referrer and the Super Admin is the Trustee Panel itself — and the rulebook
says a termination appeal is heard by *"a member of the Panel who did not take part in the act"*. With two trustees, if one imposes, only
one is left to hear any appeal.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **A Trustee Panel member imposes** (our suggestion). | The ban is imposed by a trustee, never by the person who referred it. | It departs from your 30 October mapping (a Pariwar Admin acts for the State Trustee), and leaves one trustee to hear the appeal. |
| **B** | **Another role you name.** | — | A new role or grant to design before the ban can be built. |

**Our reading:** **A**, with both costs named — **because** a person who refers and also imposes is the one arrangement your chain was
written to prevent.

---

# Q6 — "The ban is Trust-wide": does it end the person's memberships in OTHER Pariwars?

You ruled that the ban is Trust-wide and stands above termination.

**The one fact:** stopping only **new** joins leaves the person's existing memberships in other Pariwars standing — they keep contributing
and claiming there.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **End every membership** (our suggestion). | The person is out of every Pariwar. | It ends memberships in Pariwars where they did nothing, without the warning and suspension the rulebook sets before a termination. |
| **B** | **Stop new joins only.** | The person keeps memberships they already hold. | It is narrower than "Trust-wide"; the person keeps contributing and claiming elsewhere. |

**Our reading:** **A** — **because** "Trust-wide" and "above termination" read as reaching every membership. If you choose A, please say
whether the other Pariwars' members are told.

---

# Q7 — Before the finding: can a FLAGGED claim be approved and paid?

When the helpline flags a claim as possibly about a living member, the District Admin still has to confirm the member is alive and record
the finding. Meanwhile the claim moves on through approval.

**The one fact:** as built, a flagged claim can be **approved and paid** before the finding — and once it is approved, a finding can no
longer close it. Your own rule for the nearest signal, a neighbour saying *"they have not died"*, is a **warning** the approver must see,
not a stop.

| | Option | What changes for a family | Cost |
|---|---|---|---|
| **A** | **Wait at both approvals until a finding.** | A flagged claim cannot be approved until the District Admin records a finding. | A flag on a death that **did** happen never gets a finding (there is no "innocent" or "guilty" for a real death), so the claim waits for ever — unless you add a "flag closed: the death is real" step, which you would need to confirm is not a third outcome. |
| **B** | **A warning, like the neighbour's** (our suggestion). The approver sees the flag and must write a reason to go on. | A flagged claim can still be approved, but only by someone who has seen the flag and said why. | A determined approver can still approve with a reason. |
| **C** | **Nothing** (as built). | The flag changes nothing about approval. | A living member's false claim can be paid during the investigation. The ground inspection every approval needs is the only safeguard. |

**Our reading:** **B** — **because** it is your own rule for "someone says the member is alive", and it never makes a real family wait for
ever. ⚠ The flag must not go live while C stands.

---

# Q8 — After the finding: is the family told, may they appeal, may they file again?

When the investigation confirms the member is alive, the claim is closed. No ruling covers what follows. You have ruled both ways on
telling a family their claim was closed: when an appeal closes a nominee's claim, she is texted once (*"Your claim for [member] has been
closed. Please call the helpline."*); when a claim is closed because another claim for the same death goes ahead, no text is sent and the
app shows the claim as closed.

**The one fact:** here, the person a text would reach is the **filer** — who may be the person who lied. And as built, the same filer can
file again at once and lock the member again.

| | Part | Option | Cost |
|---|---|---|---|
| (a) | **Told?** | **A** — the same one text, *"Your claim for [member] has been closed. Please call the helpline."* | It warns a filer who may be the fraudster, before any ban. |
| | | **B** — no text; the app shows the claim as closed with "please call the helpline" (as built — our suggestion). | An honest filer who does not open the app learns only by calling. |
| (b) | **Appeal?** | **A** — appealable within 90 days, like a refusal for suspicion. | A staff appeal path for a claim whose subject has been **seen** alive. |
| | | **B** — not appealable (as built — our suggestion). | A family whose claim was closed on a wrong proof of life (Q9) can only file again. |
| (c) | **File again?** | **A** — allowed; each new claim needs its own investigation (as built). | The same filer can lock the member again at once. |
| | | **B** — a new claim for a member found innocent is held at filing until a District Admin lets it through (our suggestion). | When that member later really dies, the family's claim waits at filing until a District Admin acts. |

**And what staff say.** Helpline staff will see such a claim as *"Closed — the member was found alive"*. What staff tell a caller is a
disclosure, and you chose the staff wording for the other kind of closure in October; please confirm this one.

**Our reading:** (a) **B**, (b) **B**, (c) **B**, and the staff wording as written — **because** the filer may be the person who lied, and
an honest family still has the helpline and a District Admin. ⚠ The close must not go live until (a)–(c) are ruled and built.

---

# Q9 — What proof that the member is ALIVE lets staff close a family's claim?

In September you rejected letting staff simply record "this member is alive". The finding now requires the District Admin to record **how**
the member was confirmed alive. No ruling says what proof is enough.

**The one fact:** the proof decides when a family's death claim is closed for good. A wrong "alive" closes a real family's claim — and as
built (Q8 (b)) they cannot appeal.

| | Option | What changes for a family | Cost |
|---|---|---|---|
| **A** | **Seen in person only.** | Only a member seen face to face by staff can be found alive. | Slow, or impossible, for a member far from any staff. |
| **B** | **In person, or by video call** (our suggestion). | Staff may also confirm by video. | A video can be staged, or answered by someone else for the member. |
| **C** | **B, or a ground inspection that found the member alive** (as built). | The inspector's visit can also count. | The inspection was designed to confirm a death, not a life, and the inspector is not the person who records the finding. |

A phone call alone is excluded in every option: anyone can answer for the member.

**Our reading:** **B** — **because** a ground inspection that "finds the member alive" is a role the inspection was never given. ⚠ The
finding must not go live until this is ruled and the built list matches it.

---

# Told — not asked

1. **A member found innocent can again be one of the five people asked to confirm a colleague's death.** Being reported dead took them off
   that list; the finding puts them back. Two other places — "People who know me" and nominee links — still treat them as reported dead.
   We record that as a known gap.
2. **Bans on nominees, claimants and non-members wait for legal advice, and the lawyer has not been asked yet.** Writing that question is
   the first task of the later part that collects PAN and Aadhaar.
3. **The release is built before legal advice.** You were told twice that the fraud register *"waits on legal advice"*. What waits is only
   the PAN / Aadhaar collection you ruled in September; this part collects none of it.
4. **Staff notes from an investigation are kept with the claim** until the part that applies your September rule (*"only the guilty are
   kept"*) is built. A note may describe a filer who is not a member.
5. **How a finding is made.** The helpline operator flags; a **different person**, the District Admin, records the finding, with a note,
   the proof of life (Q9), and a one-time code. The system refuses a finding by the person who flagged — including the Super Admin, who
   holds both powers. This is your September chain, kept.

---

# What is at stake right now

- **Live today:** nothing. No member uses the system. Today a living member wrongly reported dead is frozen for ever; this work gives them
  the way out you ruled.
- **Blocked:** nothing in building or merging. Before go-live: Q1 for a guilty finding; Q7 for the flag; Q8 for closing a claim; Q9 for the
  finding. Before the ban is built: Q3, Q4, Q5, Q6. Q2 waits with the PAN / Aadhaar part.
- **If nothing is decided:** the release can be built and tested, but the flag, the finding and the close cannot go live, and the ban is not
  built.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. The story behind it was drafted and then checked three times on 1 November. The checks
  changed the questions: Q7, Q8 and Q9 were first written as things we would **tell** you (that a flag changes nothing, that a closed
  family is not told, that staff decide what proof is enough). Each decides who is paid or told, so each is now a question.
- **Corrected in this note:** an earlier draft promised that *"no claim on a living member is ever paid"*. That was false — a flagged claim
  can be paid before the finding (Q7), and a claim already approved when the member is found alive is not stopped. Both are now stated.
  An earlier draft also let the District Admin both flag and find; that would have narrowed your two-person chain, so the flag is now the
  helpline's alone (Told, 5).
- **Still uncertain:** whether your 30 October words *"closed because the member is alive"* were meant to reach a guilty member at all — Q1
  assumes they were, because they say so literally. Q5's "acting for the State Trustee" reading may not have been meant for bans.

---

# In plain English

Someone can report a member dead while the member is alive — by mistake, or to collect money. Today that member is frozen out of their own
record for ever. We are building the investigation you ruled on: the helpline flags the claim; a District Admin, a different person,
confirms the member is alive and finds them innocent or guilty. An innocent member is released at once and the false claim is closed. A
guilty member's claim is also closed, so nothing is ever paid on it.

We suggest: a guilty member stays locked until the ban is decided, so they cannot erase their record and leave (Q1 B); a nominee is barred
only if found to have taken part (Q2 B); no ban by mobile number, which strangers inherit (Q3 C); a barred person is told only to call the
helpline (Q4 B); a trustee, not the person who referred, imposes the ban (Q5 A); the ban ends every membership (Q6 A); a flag shows the
approver a warning they must answer, as a neighbour's "they have not died" does (Q7 B); a closed family is not texted, cannot appeal, and
cannot file again for that member without a District Admin (Q8 B, B, B); and "alive" means seen in person or by video (Q9 B).

If this section and the evidence below ever disagree, **the evidence is the record**.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

- **`2026-09-21-238` cl. 1** — *"A claim filed against a member who is **alive** does ⛔ not lock that member's declaration for life. On
  investigation finding the member **innocent**, the declaration **unlocks immediately**."*
- **`-238` cl. 3** (partly superseded the same day) — *"operator flags → District Admin verifies and confirms → escalate to Pariwar Admin →
  **Pariwar Admin imposes**"*; **`-240` cl. 5** replaces the last step: the Pariwar Admin refers, the State Trustee imposes, the Super Admin
  may lift.
- **`-238` cl. 4** — *"TWO OUTCOMES ONLY. An investigation finds the member **innocent** or **guilty**. ⛔ No third outcome."*
- **`-238` cl. 5** — guilty ⇒ *"terminated and blacklisted … along with nominee and claimant (if nominee and claimant are different
  person)"*.
- **`-238` cl. 6 + counsel gate** — PAN and Aadhaar of nominee and claimant collected as the unique identifier; *"⛔ MUST NOT BE BUILT
  BEFORE IT CLEARS"*.
- **`2026-09-21-240` cl. 1** — *"RETENTION — only the guilty are kept."*; **cl. 3** — *"Only an **exact** identifier (PAN, Aadhaar token)
  may bar automatically. A match on **name / date of birth / father's name** raises a **review a human must confirm**"*.
- **`2026-09-28-261` D3 A** — *"WAIT FOR THE FRAUD REGISTER. A living member locked by a wrong claim is unlocked only by the
  investigation's finding … Our reading (B — let staff record 'this member is alive' now) was ⛔ NOT taken"*.
- **`2026-09-28-262` FQ4 B** — *"GO-LIVE MAY GO AHEAD BEFORE A WRONGLY LOCKED LIVING MEMBER CAN BE UNLOCKED."*
- **`2026-09-28-263` FQ9 A / FQ10 A** — no claim is approved before its ground inspection is complete; the check with neighbours is a
  signal, ⛔ a gate (a neighbour's *"they have not died"* is a warning).
- **`2026-10-07-291` Q2 B** — when an allowed appeal closes the true nominee's claim, she is texted once: *"Your claim for [member] has been
  closed. Please call the helpline."*
- **`2026-10-11-318` Q3 A** — *"⛔ No text when a claim is closed this way."* (as narrowed by `-321`).
- **`2026-10-30-422` Q1 A** — *"A Pariwar Admin approves a new version, acting for the State Trustee"*.
- **`2026-10-30-423` Q1 (b) A** — *"**A false report.** Once the report is closed because the member is alive, erasure is possible
  again."*; **`2026-10-31-424` Q2 (a) A** — withdrawal *"lifted on the same terms as erasure"*.
- **`2026-08-21-147` cl. 3** — *"Any future change that introduces a new **source/reason** for account-frozen must re-examine the directory
  exclusion predicate and the ratified member-facing sentence, and route the resulting policy question if necessary."*
- **Niyamavali §8.8** (ratified by `-121`) — a termination appeal is heard by *"a member of the Panel who did not take part in the act
  appealed against"*.

## E2 — What is NOT ratified

- Whether `-423` Q1 (b) / `-424` Q2 (a)'s *"closed because the member is alive"* reaches a member found **guilty** (Q1). Story 6.38's
  decision `-425` (DL4) said the release on innocence only *"narrows"* it and that *"6-22 must put that to the Panel or justify it"*.
- Whether the nominee is barred automatically (Q2 — `-238`'s own "not covered (i)").
- Whether a mobile number may bar (Q3), what a barred person is told (Q4), who acts as State Trustee for a ban (Q5), and whether
  "Trust-wide" ends other memberships (Q6).
- What an open **staff** flag does to approval (Q7). `-304`'s line that *"making any other answer gate, delay or flag a claim changes who is
  paid"* is an author **reading**, ⛔ ratified, and is about a neighbour's answer, not a staff flag.
- Notice, appeal and re-filing after a claim is closed because the member is alive (Q8), and the staff label for it.
- Any proof-of-life standard (Q9).

## E3 — What the code actually does (at `91ea2c81`)

- `claim_nominee_findings` exists (`member_found_innocent`, `nominee_disqualified`) and has ⛔ production writer; `isDeathReportStanding`
  releases a claim's lock only on `member_found_innocent`, and six locks (nominee declaration, erasure, withdrawal, Life Events, medical,
  and the intake door) all read it.
- `claim.closed` is emitted only by the closure core and unfreezes the account overlay by type; today it always carries the id of the claim
  that "holds" the closed one, which the helpline's "the family may file again" label reads.
- `assertClaimApprovable` has no fraud-flag check (Q7 as built: C).
- A closed claim can be re-filed at once (`assertRefileAllowed` keys on a closures row only) (Q8 (c) as built: A).
- Nothing sends a text on any close this work adds (Q8 (a) as built: B).
- Story 6.22 adds: the investigation steps table; the guilty finding kind; a finding writer that requires a flag by a different person and a
  recorded proof of life (`in_person | video_call | ground_inspection` — Q9 as built: C); the close through the closure core; an account
  freeze that stays on after a guilty finding (Q1 as built: B). ⚠ Inference, labelled: the built Q1 B is also what keeps a guilty member
  off the public Member Directory.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision 2026-09-21-238\|^### Decision 2026-09-21-240\|^### Decision 2026-09-28-261\|^### Decision 2026-09-28-262' .decision-log.md
grep -n -F 'TWO OUTCOMES ONLY' .decision-log.md
grep -n -F 'unlocks immediately' .decision-log.md
grep -n -F 'may bar automatically' .decision-log.md
grep -n -F 'WAIT FOR THE FRAUD REGISTER' .decision-log.md
grep -n -F 'GO-LIVE MAY GO AHEAD BEFORE' .decision-log.md
grep -n -F 'only the guilty are kept' .decision-log.md
grep -n -F 'acting for the State Trustee' .decision-log.md
grep -n -F 'No text when a claim is closed this way' .decision-log.md
grep -n -F 'introduces a new **source/reason**' .decision-log.md
grep -n -F 'did not take part in the act' .decision-log.md
grep -n -F 'the whole point' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-21-fraud-register-what-we-keep.md
grep -rn "member_found_innocent" packages/domain/src/claim/death-report.ts
grep -n 'FraudFlag\|fraud' packages/domain/src/claim/nominee-name-check.ts   # EMPTY at 91ea2c81 = no flag check at approval (Q7 C)
grep -n 'async function readRefileGuard' -A 30 packages/domain/src/claim/refile-guard.ts | grep 'closedClosureIdOf'   # the guard keys on a closures row only (Q8 (c) A)
```

All of the above were run on 2026-11-01 at `91ea2c81` and returned the cited text. The `nominee-name-check.ts` grep returning **empty** is
the finding (no fraud check at approval), ⛔ a failed command.
