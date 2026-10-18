# Trustee Panel routing note — when the member's name is too long for the text to the five neighbours

> **§0 gate — passed (BigDev, 2026-10-18).** You ratified the text the five neighbours receive when a death is reported, naming the member
> (Decision `2026-10-10-303` Q1 A). When the member's name is too long for the text, the system today sends it to **none** of the five.
> On 2026-10-18 you chose, for the three suspicion texts, to send the shorter form of the name instead (`2026-10-18-359`, option B) — and
> we told you we would put the same question for the neighbours' text separately. Whether a promised text is skipped, or sent with a
> shorter name, is what the Trust discloses about a member and to whom — so it is yours.
> **What is ours, and not asked:** how the length is counted (the SMS operators' rule — on the go-live list, roster Row 30 (d)) and how a
> fallback is built (one function, shared with the suspicion texts).
> Routed by BigDev (2026-10-18), owed by `2026-10-18-359`. **Sent 2026-10-18** — the Panel asked a question back (below).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, the answer is transcribed into this block **and** into `.decision-log.md` as a
> new Trustee-ratified decision. Everything below is then kept **unedited** as the question **as it was put**.

> ### The Panel's question (2026-10-18), and our answer
>
> *"for long name, what's the present text length for name ?"*
>
> **40 characters**, counting every letter, space and mark. In Hindi each vowel sign (ा ि ी ु ू े ै ो ौ) and the joining mark (्) counts
> as its own character, so a Hindi name counts longer than it looks. Examples, in the Pariwar's chosen form (usually the full name):
> *"Ramesh Kumar Sharma"* = 19 (fits); *"रमेश कुमार शर्मा"* = 16 (fits); *"श्री राजेन्द्र प्रसाद श्रीवास्तव"* = 32 (fits);
> *"सत्यनारायण मूर्ति सुब्रह्मण्यम चतुर्वेदी"* = 40 (just fits); *"Venkata Satya Narayana Murthy Subrahmanyam"* = 42 (does ⛔ fit — today
> no neighbour is texted). The same 40 applies to the three suspicion texts. 40 is the limit our system applies for a name-type value in
> a registered SMS template; whether the SMS operators count Hindi marks the same strict way is still to be confirmed in writing (roster
> Row 30 (d)) — if they count more loosely, fewer names are affected.
> (`apps/jobs/src/scheduler/peer-mesh-sms-templates.ts` `fitsDltAlphanumeric` — code points ≤ `DLT_TYPE_MAX_LENGTH.alphanumeric` = 40.)

---

# The question

**In one sentence:** when the dead member's name is too long to fit in the text to the five neighbours, should the Trust text none of
them (as today), text them with the shorter form of the name, or ask staff to reach them instead?

**Why it cannot be decided without you:** you chose that five neighbours are told, by name, that a member has died, and asked a few
questions. Skipping that text, or naming the member more briefly, changes what the Trust says about the member and to whom.

## The one fact that decides it

**Unlike the suspicion texts, the neighbours must RECOGNISE the member to answer.** The shorter form (*"Ramesh S."*) still says less,
never more — but a neighbour who does not recognise *"Ramesh S."* may not answer, or may answer about someone else. And when the name is
too long today, all five neighbours miss the text — the claim goes on without their answers (the neighbours can never block a claim on
their own, `-263` FQ10 A).

---

# What you are choosing between

| | Option | What changes for a neighbour | Cost |
|---|---|---|---|
| **A** | **No text when the name does not fit** (what is built today). | None of the five neighbours is texted about that member. | The claim is decided without any neighbour's answer; the fault is recorded and goes to the system's logs, which nobody is yet assigned to watch. |
| **B** | **Send it with the shorter form of the name, only when the full name does not fit** — first name and the initial of the surname (*"Ramesh S."*), the same rule you chose for the suspicion texts. | The neighbours get the text with *"Ramesh S."* instead of the full name. | A neighbour may not recognise the member from the shorter name and may skip the questions — or answer about a different Ramesh. A one-word name that is itself too long still could not be sent (rare). |
| **C** | **No text; staff are told to phone the neighbours.** | A staff member calls the five instead of a text. | Nothing like it exists today: a new staff task and someone to do it; slower, and it gives staff five more phone calls per such claim. |

**Our reading:** **B** — **because** it keeps the neighbours' check for these claims and matches what you chose for the suspicion texts;
the neighbours are chosen from the member's own school or office, so first name and surname initial is likely enough for them to know who
is meant. ⚠ If you think recognition matters more here than for the suspicion texts, A is the safe choice: the claim still goes on.

---

# What is at stake right now

- **Live today:** nothing. The neighbours' text is not live (its template is not provisioned).
- **Blocked:** nothing. A goes live as built unless you choose otherwise; B would be built with the suspicion-text fallback (row
  `6-37e-suspicion-text-short-name-fallback`).
- **If nothing is decided:** A — a member with a long name has no neighbour asked.

---

# How much to trust this note

- **Earlier versions of this question:** none put to you. Today's "no text" rule was recorded as our own reading when the neighbours' text
  was built (`2026-10-10-311` PM3); the suspicion-text note told you this question would follow.
- **Corrected in this note:** none.
- **Still uncertain:** how many names are too long (the operators' counting rule is unanswered — Row 30 (d)); whether neighbours recognise
  *"Ramesh S."* — not tested with anyone.

---

# In plain English

When a death is reported, the system texts five people who may have known the member, naming them, and asks a few questions. A text has
room for a name of about 40 letters. When a name is longer, today nobody is texted, and the claim goes on without the neighbours' help.
For the suspicion texts you chose to use the shorter name instead, such as "Ramesh S.". We suggest the same here — the neighbours are from
the member's own school or office and should know who is meant — but if you feel the neighbours must see the full name to answer
honestly, keeping today's rule is safe. If this summary and the evidence below ever disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-10-10-303` Q1 A** (Trustee-ratified): *"Q1. A - Send Text in Hindi to those whose preferred langauge is Hindi and in English to
> those whose preferred language in English."* — the text (`packages/i18n/locales/en/claim.json`, `peer_mesh_sms.request`): *"We have been
> told that {member} has died. If you knew them, please answer a few short questions: {link} — or call the helpline {helpline}."*
>
> **`2026-10-18-359`** (Trustee-ratified): option B for the three suspicion texts — *"Send it with the shorter form of the name, only when
> the full name does not fit — first name and the initial of the surname (e.g. "Ramesh S."), the form a Pariwar can already choose."*

## E2 — What is NOT ratified

- Today's rule for the neighbours' text — a name that cannot fit ⇒ `no_target:name_too_long`, no text — is our reading (`2026-10-10-311`
  PM3, author-commit), never put to you.

## E3 — What the system does today

- The name check is claim-wide: a name that does not fit ends every one of that claim's neighbour texts `no_target:name_too_long`
  (`apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` — the module header and `if (!fitsDltAlphanumeric(name)) return { fault:
  'name_too_long' }`).
- The neighbours are chosen school-wise (Story 6.36) — our reason for expecting "Ramesh S." to be recognised; an inference, untested.

## E4 — Commands to re-verify every claim

```
grep -n "name_too_long" apps/jobs/src/scheduler/claim-peer-mesh-requests.ts
grep -n "peer_mesh_sms.request" packages/i18n/locales/en/claim.json
grep -n "^### Decision 2026-10-10-303\|^### Decision 2026-10-10-311\|^### Decision 2026-10-18-359" .decision-log.md
grep -c "neighbours can ⛔ never block a claim on their own" .decision-log.md
```
