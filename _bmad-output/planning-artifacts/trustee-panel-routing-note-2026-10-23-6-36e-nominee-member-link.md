# Trustee Panel routing note — marking a nominee who is also a member, so they are never among the five asked about the death

> **§0 gate — passed (2026-10-23), for two questions only.** Leaving a marked nominee out of the five neighbours asked about a death is
> BigDev's to decide, as leaving out nominees matched by phone number was (row `6-36d-exclude-nominees-from-the-five`, built and on
> `main`). Two parts of this follow-up are yours, and only those are asked here: **(1)** recording which member's ACCOUNT a nominee is, and
> whether that waits for the nominee's yes — a legal or consent basis for handling someone's data; **(2)** what each person is told — the
> member learns which of their contacts are members for a new purpose (extending your "people who know me" ruling), and the nominee learns
> they were named — what the Trust discloses, and to whom.
> ⚠ **This note DOES hold up the build** (unlike the last one): if you choose Question 1 C, nothing is built. BigDev may decide otherwise.
> Whatever you answer, go-live also waits on our lawyer's written confirmation and a line in the privacy policy (a new go-live leg, Row 31 (j)).
> ⚠ **WRITTEN 2026-10-23 — ⛔ sent.** ⛔ Shown to the Panel until BigDev sends it.
> ⚠ **Written ahead of BigDev's build answers** (Story 6.36e, Task 0.2). It assumes four of them: the nominee is found from the member's own
> phone contacts (NE3); only when changing nominees in Life Events, ⛔ at sign-up (NE4); the nominee is told in the app only (NE6); and the
> mark keeps them out whatever they answer under Question 1 A (NE7). If BigDev answers otherwise, this note is revised before it is sent.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new decision
> id. ⭐ Everything below is then kept **unedited** as the questions **as they were put** ([[feedback_supersede_never_reinterpret]]).

---

# Question 1 — may the Trust record which member a nominee is, and must it wait for the nominee's yes?

**In one sentence:** when a member names a nominee who is also a TWT member, and marks them by finding them in the member's own phone
contacts, may the Trust record which member that is — used ONLY to make sure that person is never one of the five asked about the
member's death — and does the mark count at once, or only once the nominee says it is them?

**Why it cannot be decided without you:** it handles a second person's data — the nominee-member's account — for a purpose you have not
ruled on, and the nominee has not agreed to it when the member saves the mark. The basis for handling someone's data is yours.

## The one fact that decides it

⭐ Today the Trust can only recognise a nominee by the phone number the member typed for them. If that nominee signs in to TWT on a
DIFFERENT number — a second SIM, a family phone, a typo — the check you allowed on 23 October misses them, and they can be one of the
five asked whether the member has died, though they would receive the money. You recorded exactly this gap when you ruled. A mark that
names the member account closes it, whatever number they sign in with — but only if the mark counts before the nominee answers. A
nominee who is waiting for the money is also the person with a reason never to answer, or to say "that's not me".

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Yes — the mark counts from the moment the member saves it.** The nominee is told in the app and answers "Yes, that's me" or "No, that's not me"; the member sees the answer. | A marked nominee is never asked about the death, whatever they answered and whatever number they sign in with. If the answer is "not me", the member can remove the mark or pick again. | A member's account is marked before they have said yes. A wrong pick keeps an uninvolved colleague out of the five until the member fixes it (today a mistyped number does the same). |
| **B** | **Yes — but the mark counts only once the nominee says "Yes, that's me".** | A nominee who confirms is never asked. Until they confirm — or if they say "not me" — they can still be asked if they sign in on a different number. | The gap stays open for exactly the people with a reason to keep it open: a nominee who never answers, or who says "not me" when it is them. |
| **C** | **No — do not record member accounts for nominees.** | Nothing changes; nominees are recognised by phone number only. | The gap you recorded on 23 October stays; this follow-up is closed unbuilt. |

**Our reading:** A — **because** the mark is the member's own statement about their own nominee, of the same strength as the number they
type today (which you already let the Trust use without the nominee's yes), the nominee is still told and can say it is not them, and only
A cannot be undone by the person it protects against. ⚠ When this follow-up was opened, our own note on it said it *"needs the nominee's
agreement"*. Option A reads that as "the nominee is told and answers", not "the mark waits for a yes" — we flag the difference so that you
decide it rather than we assume it. Under every option, nothing goes live until our lawyer confirms the ground in writing.

---

# Question 2 — what may each person be told?

**In one sentence:** to let a member mark a nominee, may the app show the member which of their phone contacts are TWT members (as you
already allow for "people who know me"), and may the Trust tell the marked member, in the app, that they were named as a nominee, with
the member then seeing their answer?

**Why it cannot be decided without you:** both are disclosures — which numbers belong to members, to the member asking; and a member's
choice of nominee, to the person chosen. What the Trust discloses about a person, and to whom, is yours.

## The one fact that decides it

⭐ You allowed the contacts check for ONE purpose — finding "people who know me" — and its matches are shown under the names the member
saved, never the registered name. This would be a second purpose for the same check, with the same limits. And a nominee is usually a
close relative who knows they were chosen; but the Trust telling them is still the Trust disclosing the member's choice.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Both.** The member sees which contacts are members (under their own saved names, the same limits as "people who know me"); the marked member is told in the app — never by text, WhatsApp or notification — and the member sees their answer. | The member can mark a nominee in a few taps. The nominee learns they were named and can say it is not them. | One more purpose for the contacts check. A nominee learns they were named; a member learns the nominee's answer. |
| **B** | **The member sees the matches; the nominee is NOT told** (a silent mark). | The member can mark a nominee; the nominee never knows. | A member's account is marked without their knowledge, and a wrong pick is never reported back. ⚠ Not possible with Question 1 B — a nominee cannot say yes to something they are not told. |
| **C** | **No contacts check for nominees.** The member types the number their nominee signs in with; the app says only "marked" or "not found". | No list of matches is shown; the member must know the other number. | The member must know a number they may not have. Each typed number is a guess at whether someone is a member — one at a time, but with no "saved name" in between. |

**Our reading:** A — **because** it reuses a check you have already allowed, with the same limits and the same rule that a match is shown
only under the member's own saved name, and it lets the person who is marked know it and say if it is wrong.

---

# What is at stake right now

- **Live today:** nothing — the app is not in production, and this is not built.
- **Blocked:** the build of this follow-up (row `6-36e-nominee-member-link-at-declaration`) waits for your answer, unless BigDev decides
  otherwise. Nothing else is blocked; the phone-number check you allowed is built and unaffected.
- **If nothing is decided:** nominees are recognised by phone number only, as today, with the gap you recorded.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. The gap was first recorded in your 23 October ruling's "not covered" list and in
  BigDev's acceptance of it the same day.
- **Corrected in this note:** the follow-up was first written down as *"pick the nominee from the members list"*. There is no members
  list a member can browse or search — members find each other only by the contacts check, and that was deliberate (showing which number
  belongs to which member would let anyone map numbers to members). The note asks about the contacts check instead.
- **Still uncertain:**
  - Our lawyer has not confirmed a legal ground for this; a question will be added to the counsel note already written on nominee contact
    (not yet sent). The privacy policy lists only a nominee's name and relationship today; it would need a line.
  - The mark helps only when the nominee signs in with a different number from the one the member gives for them — or later, if members
    can change their sign-in number (not built). If the member gives the same number, the existing check already catches them.
  - A nominee who is not in the member's phone contacts cannot be marked this way.
  - The mark is offered only when nominees are changed in Life Events, not at sign-up (a member is not yet active then).
  - The build answers this note assumes are BigDev's, still to be given.

---

# In plain English

When a member dies, the Trust asks up to five colleagues what they know. Since 23 October, the Trust leaves out a colleague who is one of
the member's nominees — but it can only spot them by the phone number the member typed. If the nominee signs in to TWT on another
number, they are missed. We propose letting the member, when changing their nominees, find a nominee who is a TWT member in their own
phone contacts and mark them; that member is then never asked about the death. Question 1 asks whether the Trust may record that mark,
and whether it should count straight away or only once the nominee says it is them — we suggest straight away, because a nominee waiting
for money is the one person with a reason never to answer. Question 2 asks what each person may be told — we suggest the member sees
which contacts are members (as you already allow for "people who know me"), and the nominee is told in the app and can say if it is
wrong. Nothing goes live until our lawyer confirms the ground.

⇒ If this section and the evidence below ever disagree, the **evidence** is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-23-384` Q1 A (Trustee-ratified): *"Yes — use the nominee's number for this check."* The question as put: *"may the Trust compare
> a dead member's nominees' phone numbers with members' phone numbers, only to make sure a nominee who is also a member is never one of the
> five asked about the death?"* Its cost, as put and accepted: *"One more use of the nominee's number. Our lawyer has not yet confirmed the
> legal ground you quoted; nothing goes live until that is done."* Its Not covered: *"a nominee who signs in with a DIFFERENT number from
> the one the member gave — ⛔ matched, can still be asked"*; *"any other use of a nominee's number"*.
>
> `2026-10-10-310` CF5 A (Trustee-ratified): *"With the member's permission, the app checks their phone contacts against the member list,
> shows the matches under the names the member saved, and keeps ⛔ no non-member's number; counsel confirms the basis."*
>
> `2026-08-28-160` cl.3 (Counsel + Panel), the basis table: *"Nominee information + bank details | the nominee's own Claim Terms
> acceptance"*; and: *"Anyone citing this clause as authority that a member's T&C reaches another person's data is citing it wrongly"*.
> Roster Row 17's 2026-08-28 amendment: *"⛔ Nobody may cite this amendment as authority that a member's T&C reaches another person's data."*
>
> `2026-08-24-156` (Trustee Panel), the fence adopted: *"If a surface ships differing materially from that description — a new data class,
> a new subject population, a new recipient — the clearance does ⛔ NOT extend to it and the review re-opens."*
>
> `2026-10-18-356` (Trustee-ratified): *"drop WhatsApp only notification for nominee."*
>
> `2026-09-20-234` V (Trustee-ratified): *"allowing nominee change until claim has been filed. However if nominee has been changed after
> death that nominee claim will be denied"*.

## E2 — What is NOT ratified

- Leaving a MARKED nominee out of the five — BigDev's (the class of `2026-10-16-340` call 2, `2026-10-16-341` and `2026-10-23-386`); its
  build decisions are Story 6.36e's NE1–NE14, to be recorded in an author-commit (not yet taken).
- The follow-up itself and its wording *"needs the nominee's agreement"* — `2026-10-23-386` Not covered (an AUTHOR-COMMIT): *"a nominee's
  member link captured at declaration — the only fix for the ND8 gap; a follow-up backlog row (Story 6.36d Task 0.4) that needs the
  nominee's agreement and its OWN Panel question"*. ⛔ The Panel's words — Question 1's option A reads it, B takes it literally.
- How the match is shown — `2026-10-10-309` item 3 (AUTHOR-COMMIT): matches under the member's saved names, *"⛔ never the member's
  registered name (members' mobile numbers are private: showing "this number is member X" would let anyone map numbers to members)"*; the
  named person answers in the app, told first *"[Name] will see your answer."* (`2026-10-14-330` SW10–SW14, AUTHOR-COMMIT).
- No sign-up step — `-330` SW16 (AUTHOR-COMMIT): *"a member is ⛔ not yet `active` while signing up"*.
- The nominee's own Claim Terms — `2026-09-02-177` D5(a): *"The Claim Terms acceptance substrate does ⛔ NOT exist"* (UN-ATTESTED). ⇒ ⛔
  existing acceptance of the nominee-member reaches this mark; whether their own member terms could is counsel's.
- Any other use of the mark (payout, nominee determination, claim filing, contact, staff screens) — ⛔ proposed; each would be a new use.

## E3 — What the code actually does

⚠ **Proposed — ⛔ built** (Story 6.36e, `_bmad-output/implementation-artifacts/6-36e-nominee-member-link-at-declaration.md`):

- a new table `member_nominee_links` holding member ids only (⛔ number, ⛔ name), one row per mark, attached to the nominee version the
  member saved; set only by a Life Events nominee save (step-up OTP, the existing lock after the first claim);
- the member's matched contacts come from the existing contacts check (`POST /api/v1/member/known-people/contact-matches`, which returns
  only the POSITIONS of matching numbers, ⛔ an id or a name), with its existing daily and monthly limits;
- the server resolves the picked number to a member account itself; every reason a mark cannot be made returns the SAME refusal;
- the nominee sees a card in the app (⛔ text, WhatsApp or push) and answers once; the member sees *Asked* / *Confirmed — [name]* / *Said it
  is not them* (the registered name only after "Yes, that's me");
- the one shared eligibility check (`peerMeshEligibleMemberSql`) leaves out a member marked on the nominee version in force before the
  filing day (Question 1 A: whatever they answered; B: only if confirmed before then), at selection, before every text, and before the
  WhatsApp reminder; staff see the existing label `no_target:peer_is_nominee`.

Today (at `1268d47e`): ⛔ nominee→member link exists anywhere — `peer-mesh-nominees.ts`'s header: *"the system records ⛔ member link for a
nominee"*; a nominee declaration holds name, relationship, mobile, address and split (`NomineeDeclareEntry`). The privacy policy's nominee
row reads *"Nominee details | Name, relationship; bank/IFSC at claim time only | Disbursement to the bereaved | Consent"*
(`docs/legal/privacy-policy.md` §3, gitignored local copy).

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-\(384\|386\|310\|309\|330\|160\|156\|177\|356\|234\):' .decision-log.md
grep -n 'a nominee who signs in with a DIFFERENT number' .decision-log.md
grep -n "With the member's permission, the app checks their phone contacts" .decision-log.md
grep -n "a nominee's member link captured at declaration" .decision-log.md
grep -n 'citing it \*\*wrongly\*\*\|citing it wrongly' .decision-log.md
grep -n 'Nobody may cite this amendment' docs/launch-gate-inventory/inventory-roster.md
grep -n 'Claim Terms acceptance substrate does' .decision-log.md
git grep -n 'nominee_member_id\|member_nominee_links' -- apps packages        # expect (2026-10-23): EMPTY — nothing built
git grep -n 'records ⛔ member link for a nominee' -- packages/domain/src/claim/peer-mesh-nominees.ts
grep -n 'Nominee details' /Users/dev/Developer/projects/TWT/docs/legal/privacy-policy.md
grep -n '^### Row 31' docs/launch-gate-inventory/inventory-roster.md
```
