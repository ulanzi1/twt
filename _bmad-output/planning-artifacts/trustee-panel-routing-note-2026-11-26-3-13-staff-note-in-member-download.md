# Trustee Panel routing note — may a member download the private note staff wrote about their identity check?

> **Status: WRITTEN 2026-11-26; ⛔ NOT YET SENT** (BigDev sends). Prepared for the Panel sitting of late November 2026 as part of
> the agenda `trustee-panel-sitting-2026-11-26-agenda.md`. Written by the session from `deferred-work.md` item `3.13-R1-W6`.
> **Prepared by:** BigDev (Solo Builder).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. Everything below is then kept **unedited** as the question **as it was put**.

---

# The question

**In one sentence:** When a member downloads a copy of the data the Trust holds about them, should it include the short private note a
staff member wrote while checking their identity?

**Why it cannot be decided without you:** it is about what the Trust discloses to a person about themselves. On 25 November we told you
this note "stays with staff". The download is the one place where that could stop being true. There is also a legal half (what the
data-protection law requires us to give), which is a question for counsel, not for you. We ask counsel that half separately (see "What we
are NOT asking you").

## The one fact that decides it

**The note is written only for staff, and the staff who write it are not told the member may read it.** The member is already told the
outcome and the reason from the fixed list (your 25 November ruling, Q2 C). The note is the staff member's own words about the call or
the meeting, for example *"Phone switched off twice; will try again Friday."* Once a note has been downloaded it cannot be taken back.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Keep the note out of the download** (what is built today). The download lists each check: date, outcome, how the ID was shown, which ID, and the reason. | The member sees that a check happened, how it went and why, but not the staff member's own words. | If counsel says the law requires the note, we must add it later (a one-line change, so this is easy to reverse). A member who wants the note has no way to get it. |
| **B** | **Put the note in the download.** | The member can read what staff wrote about them. | It goes back on what you were told on 25 November. Staff are not told the member may read it, so notes written so far were written as private. A careless or unkind line, or a document number typed in against instructions, would reach the member and could not be recalled. If we choose B, staff must be told from now on, and notes will become shorter and more guarded. |
| **C** | **Keep it out, but say that a note exists, and give it on request.** The download says "staff also wrote a private note about this check; you may ask for it". A request goes to a trustee or the grievance officer, who decides and replies. | The member knows the note exists and can ask for it. Someone reads it before it is given. | We need a request path and new words (Hindi and English, for your approval). Someone must handle each request. It is slower for the member. |

**Our reading:** **A**, provided counsel confirms that a summary without the note satisfies the access right. **Because** the member
already gets everything the note would tell them that matters to them (the outcome and the reason). The note was written as a staff
working note. And A is the only option that can be undone later without harm: B cannot be undone. If counsel says the note must be
given, we suggest **C** over B, so that a person reads a note before it goes out.

**What we are NOT asking you:** whether the data-protection law requires the note to be given. That is counsel's. We will put this
sentence to counsel: *"Does a member's right to a summary of their personal data (DPDP Act s.11(1)(a)) require the Trust to give the
member the free-text note staff wrote about their identity check, or is a summary of the check (date, outcome, ID kind, reason) enough?"*
If counsel's answer is "it must be given", that overrides A and we come back to you to choose between B and C.

---

# What is at stake right now

- **Live today:** nothing. No member uses the system, and the data download is not live.
- **Blocked:** nothing is blocked today. This must be settled before the data download goes live, or at the sitting that approves the
  member's "we could not confirm your identity" message (row `3-13a`), whichever is first.
- **If nothing is decided:** the note stays out of the download (option A), as built.

---

# How much to trust this note

- **Earlier versions of this question:** none. Until 26 November the build PUT the note in the download, under our own earlier build
  decision. Our code review caught that this contradicted what you were told on 25 November ("stays with staff"), and we held the note
  back (BigDev's choice, recorded as an author decision, `2026-11-26-504` item 5). That is why this is a question now.
- **Corrected in this note:** we first framed this as one question. It is two: what the Trust chooses to give (yours) and what the law
  requires (counsel's). We split them.
- **Still uncertain:** what counsel will say. The law's text gives a right to *"a summary of personal data"*, and the Trust's privacy
  policy promises the same (*"Access a summary of your personal data and processing"*). Neither says "a full copy", but we are not
  lawyers and we do not read that as settled.

---

# In plain English

When staff check a member's identity and cannot confirm it, they pick a reason from a short list and may also write a short note, for
example "phone switched off twice". The member will be told the outcome and the reason in their own language. That is your 25 November
ruling, and the message will come to you for approval. The question here is only about the note itself, in the copy of their data a
member can download.

We suggest keeping the note out. It was written as a working note between staff, the member already learns what matters from the reason,
and keeping it out can be reversed later if we are told it must be given. Giving it cannot be reversed. We will ask counsel whether the law
requires the note. If counsel says yes, we will come back to you with a choice between giving every note and giving notes on request
after someone has read them.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-11-25-502` (Trustee-ratified, DR + KB), as relayed: *"by DR and KB / follow up - Q1 E, Q4 B / identity - Q1 A, Q2 C, Q3 Staff will
> see the number for this purpose in addition to option B."* Q2 C: *"As B, and the member is also told the reason staff recorded"*.

The told note of 2026-11-25 (`trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md`, §3, TOLD 2026-11-25): *"Under Q2 C the member
will be told the reason from that list. We read your words as not including the private note, which stays with staff."* (A told note,
⛔ a ruling: the Panel was informed, not asked.)

## E2 — What is NOT ratified

- No ruling covers what the member's data download contains for an identity check. The current contents (no note, no staff identity) are
  author decisions: `2026-11-26-504` item 5 (the note held out) and `2026-11-26-505` item 1 (the staff user id blanked on the two events a
  check writes).
- No ruling covers whether staff are told their note may be read by the member.

## E3 — What the code actually does

- The export section `profile.identityChecks` carries, per check, `decidedAt`, `outcome`, `evidenceKind`, `documentKind`,
  `notConfirmedReason` (`packages/domain/src/data-export/assemble.ts`, the identity-check select). The note's ciphertext is ⛔ selected;
  the contract section is strict, so an extra key fails the export (`packages/contracts/src/data-export/data-export.ts`).
- Staff see the field labelled only *"Note"* / *"Note (optional)"* (`apps/admin/src/modules/identity-checks/i18n-en.ts`); ⛔ any line
  tells them the member may read it.
- The note is Tier-1 encrypted, read back only on the staff detail (the live act's note), and scrubbed to a sentinel on erasure.
- Residual: nothing structurally stops staff typing a document number into the note (`deferred-work.md` `3.13-R1-N5`).
- Data download is ⛔ live (`project_not_in_production_merge_is_not_golive`).
- DPDP Act 2023 s.11(1)(a), from the Act's text: *"a summary of personal data which is being processed by such Data Fiduciary and the
  processing activities undertaken by that Data Fiduciary with respect to such personal data"*. Privacy policy (`docs/legal/privacy-policy.md`,
  the rights list): *"**Access** a summary of your personal data and processing"*.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision 2026-11-25-502' .decision-log.md            # the ruling exists
grep -n 'stays with' _bmad-output/planning-artifacts/trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md
grep -n '^### Decision 2026-11-26-504\|^### Decision 2026-11-26-505' .decision-log.md
grep -n 'notConfirmedReason\|noteCiphertext' packages/domain/src/data-export/assemble.ts   # no noteCiphertext in the select
grep -n "note: 'Note'\|noteOptional" apps/admin/src/modules/identity-checks/i18n-en.ts
grep -n '3.13-R1-W6\|3.13-R1-N5' _bmad-output/implementation-artifacts/deferred-work.md
```
