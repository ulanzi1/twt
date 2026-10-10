# Trustee Panel routing note — the questions the five neighbours are asked: the full list, how the member died, which illness, alcohol, who approves changes, and the inspector's questionnaire for the family

> **§0 gate — passed (2026-10-10), for each question.** You asked to see *"which all questions will be asked from member"* (`2026-10-10-303`).
> The list below is the answer — and it now asks for more than whether the member died. **Q3–Q5** ask neighbours about **how a member
> died, their illnesses and their habits**: what the Trust **collects about a person from others**, and — because the cause of death
> decides who is paid (Niyamavali §5.1, §5.5, §5.6) — what such an answer may **do to a family's claim**. **Q6** changes words you
> ratified in `-303` (*"two short questions"*). **Q7** decides who may change the questions later. **Q8** asks whether staff may write
> the much longer questionnaire the INSPECTOR uses with the family, and with what limits. ⛔ No engineering choice decides any.
> ⭐ **Asked from Story 6.27** (2026-10-10), after BigDev proposed the fuller questionnaire. ⭐ **Nothing is blocked meanwhile**: the
> screens, saving and the first two questions are built now; a question is shown to members only once you approve it.
> ⚠ **Deliberately ⛔ not asked**, because they are ours:
> · the screen: two or three questions per page, every question optional except the first, each answer **saved as soon as it is
>   chosen**, a short note before **Submit**, and Submit simply showing *"Thank you"* (the answers are already saved);
> · that an answer counts as soon as it is saved, can be changed until Submit, and is locked after it — every change is kept;
> · who among the Trust's staff sees the answers, and when — set out in full under *"Who sees the answers"* below (the answers about
>   the cause of death and illness are also stored encrypted); ⛔ never the family, ⛔ never published;
> · the Hindi words (agent-written, reviewed by a person before go-live).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. ⭐ Everything below is then kept **unedited** as the question **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The questions, as they would appear (your question in `-303`)

The text: *"We have been told that [member] has died. If you knew them, please answer **a few** short questions: [link] — or call the
helpline [number]."* (Q6). The screen shows ⛔ nothing about a claim, the family or money. Every question after the first is optional.

| Page | Question | Answers | Status |
|---|---|---|---|
| 1 | **Has [member] died?** | Yes, they have died · No, they have not died · I am not sure · I did not know them | ⭐ Decided (FQ10 — *"they have not died"* is a warning) |
| 1 | *(only after "Yes")* **If you know, on what date did they die?** | a date · I don't know the date | ⭐ Decided (FQ8 E — more than a day from the certificate is a warning) |
| 2 | **How do you know they died?** | I attended the last rites or visited the family · The family told me · I heard it from others · Other | Q6 — new |
| 2 | **How do you know [member]?** | A relative · A neighbour · A colleague at the same school · Other | Q6 — new |
| 3 | *(only after "Yes")* **How did they die?** | Illness over a long time · Sudden illness (heart attack, stroke) · Old age · Accident (road, drowning, electric shock, snake bite, fire, other) · Suicide · Killed by someone · Other · I don't know | **Q3** |
| 3 | *(only after "Illness")* **Do you know which illness?** (more than one allowed) | Cancer · Heart disease · Diabetes · Kidney disease · Liver disease · TB · Stroke or paralysis · Lung disease (asthma, COPD) · Other · I don't know | **Q4** |
| 3 | **Did [member] drink alcohol regularly?** | Yes · No · I don't know | **Q5** — we suggest ⛔ not asking |
| 4 | **May the District Admin phone you about this?** | Yes · No | Q6 — new |
| end | *"Your answers are saved as you go. Only the Trust's staff who check this claim will see them — never the family. Please answer only what you know. Press Submit when you are done."* → **Submit** → *"Thank you. Your answers have been sent to the Trust."* | | Q6 |

## Who sees the answers

| Who | What they see |
|---|---|
| **The District Admin** (and the district's verifiers) | Every answer, who gave it, when — for claims in their district. |
| **Every later approver** — the State Trustees at the final vote, the R9 panel, the Super Admin, the Pariwar Admin | Every answer for the claim **they are approving, at that step only** — so a reason and a note are never written about answers they cannot see. |
| **The inspector who visits the family** | ⛔ **Nothing before they complete their own record** — ⛔ not even that answers exist (a hint invites guessing). On completing, **only where the family's answers and the neighbours' DIFFER** — e.g. *"The family said: heart attack. One neighbour said: accident."* — ⛔ never who said it, ⛔ never an exact count, with a box to note the family's response to each, and *"Please ask without saying who said this."* If nothing differs: *"Thank you, your response has been recorded. No further action needed."* Their own record is never changed. Answers that arrive after the visit go to the District Admin, ⛔ not the inspector. |
| **The helpline operator** | Only the answers of the neighbour on the phone, while recording them — ⛔ never anyone else's: they speak with the family, and questioning the family is not their role. |
| **The neighbour** | Their own answers, until they press Submit. |
| ⛔ **Never** | The family, the claimant, the nominee, the other four neighbours, any other member, the public. |

⭐ The inspector and the helpline rule are BigDev's (2026-10-10): the people who meet the family should form their own view first, and
the inspector is shown only a difference worth asking about.

⭐ Only the first two questions can raise a **warning** (your FQ10 / FQ8 E rulings). Everything else is shown to staff as **context**,
unless you rule otherwise in Q3–Q5.

---

# Q3 — may neighbours be asked how the member died, and what may that answer do?

**In one sentence:** may the five be asked how the member died — including *"suicide"* and *"killed by someone"* — and if one answers
that way, what happens to the family's claim?

**Why it cannot be decided without you:** the cause of death decides who is paid — suicide, and a murder where a nominee is accused, are
excluded (§5.5); the actual cause governs (§5.1). A neighbour's answer is **hearsay** about exactly that fact, about a grieving family.

## The one fact that decides it

⭐ **The ground inspection is where the facts are checked on the spot** — the inspector visits the family, sees the original
certificate and records the family's account (today: the date and time of death). A neighbour's answer can only **point staff at a
question to ask** — it cannot establish anything on its own.

⭐ **If you approve asking the neighbours, we also suggest the inspector asks the FAMILY the same question** (*"How did they die?"*, from
the same list) and records their answer — so that the inspector is shown only where the family and the neighbours DIFFER (see *"Who sees
the answers"*). That is the Trust asking the family about the cause of death at the visit — it is part of this question.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Ask; show it to staff as context only.** ⛔ Never a warning, ⛔ never a flag on its own. | The District Admin sees *"a neighbour said: suicide"* beside the inspection, and can ask the inspector or phone the neighbour. | A rumour about a family is written down and shown to staff. A staff member could be swayed by it without any rule saying how much it weighs. |
| **B** | **Ask; *"suicide"* or *"killed by someone"* is a warning** — approving needs a reason and a note (your one rule). | Staff must answer it in writing before approving. | One neighbour's guess makes every approver write a note — and, if it comes after approval, makes the payment wait. A family is held up by a rumour. |
| **C** | **Ask; such an answer sends the claim to State-Trustee special-death review** (§5.5). | The claim waits for the State Trustees. | A neighbour's word alone starts the exclusion process — against FQ10 A (*"the neighbours can ⛔ never block a claim on their own"*). |
| **D** | **Do ⛔ not ask.** | The inspection alone covers the cause. | Staff lose an early pointer to a hidden suicide or a violent death. |

**Our reading: A** — **because** the inspection is where the cause is established, and FQ10 made the neighbours a signal; A gives staff
the pointer without letting hearsay decide or delay a payment.

---

# Q4 — may neighbours be asked which illness the member had?

**In one sentence:** after *"illness"*, may the five be asked which illness — and may the system compare that with the member's own
medical declaration?

**Why it cannot be decided without you:** this is **health information about a person, collected from other people**; and an illness on
the IMA list that the member did ⛔ not declare leads to State-Trustee review (§5.6) — a neighbour's guess could start that.

## The one fact that decides it

⭐ **The member's own medical declaration is already on file**, and §5.6's check is meant to compare the **actual cause of death** (from
the certificate and the inspection) with it — ⛔ not a neighbour's opinion.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Ask; show it to staff as context only; ⛔ never compared automatically** with the member's declaration. | Staff may notice *"a neighbour said: cancer"* and look at the declaration themselves. | Health information about a member is collected from others — **counsel must confirm the legal basis** before go-live. |
| **B** | **Ask, and compare automatically:** an illness the member did ⛔ not declare raises a flag. | A possible concealment is caught early. | A neighbour's guess raises a concealment flag against a dead member's family — §5.6 was written for the actual cause, ⛔ not hearsay. Same counsel check. |
| **C** | **Do ⛔ not ask.** | Nothing about illness is collected from neighbours. | Staff lose a pointer to an undeclared illness. |

**Our reading: A**, with the counsel check before go-live — **because** the comparison belongs to the actual cause, and the pointer is
still useful. ⭐ As in Q3, the inspector would also ask the family *"Which illness?"* from the same list, so only a difference is shown
to the inspector.

---

# Q5 — may neighbours be asked whether the member drank alcohol?

**In one sentence:** may the five be asked whether the member drank alcohol regularly?

**The one fact that decides it:** ⭐ **⛔ No rule of the Trust makes alcohol matter** — the Niyamavali has ⛔ no clause on it, so an
answer would be collected for ⛔ no purpose the Trust can name.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Do ⛔ not ask.** | Nothing changes. | If you later want a rule about alcohol, the question is added then. |
| **B** | **Ask; show it to staff as context only.** | Staff see a neighbour's view of the member's drinking. | A dead member is labelled by a neighbour's opinion, with ⛔ no rule it serves; the data protection law expects a purpose for what is collected. |

**Our reading: A** — unless you are making a rule about alcohol; then the rule comes first and the question follows it.

---

# Q6 — the wording and the new questions

**In one sentence:** may the text say *"a few short questions"* instead of *"two"* (words you ratified in `-303`), and do you approve
the three new questions on pages 2 and 4 (how they know of the death, how they know the member, and permission to phone)?

| | Option | Cost |
|---|---|---|
| **A** | **Yes to both** (our reading) — *"a few"*, and the three questions. | A few more taps; slightly fewer finished answers. The phone permission is a new consent from the neighbour. |
| **B** | Keep *"two"* and only the first two questions. | Staff cannot tell an eye-witness from a rumour, or follow up on *"they have not died"*. |

---

# Q7 — who approves a change to the questions later?

**In one sentence:** BigDev expects the questions to evolve; who may approve a change?

| | Option | Cost |
|---|---|---|
| **A** | **Every change comes to you.** | Slow for small fixes (a clearer word, one more option). |
| **B** | **BigDev may change the wording and add answer options within a question you approved; a NEW question, or any question about health, cause of death or habits, comes to you** (our reading). | You see only the changes that matter; small fixes go faster. Every version is kept, with the date and who approved it. |
| **C** | **BigDev decides every change.** | What the Trust asks about a member could change without you. |

---

# Q8 — may staff write the inspector's questionnaire for the family, and with what limits?

**In one sentence:** BigDev plans a questionnaire the ground inspector goes through with the family at the visit — longer than the
neighbours', and changing over time — and proposes that a **Pariwar Admin, a State Trustee or the Super Admin** may write and change it;
may they, and with what limits?

**Why it cannot be decided without you:** it decides **what the Trust asks a grieving family and records about them and the member** —
today that is yours (you ruled the date and time of death, FQ8 C, and the original certificate, FQ11). Handing the pen to staff is a
**delegation** of that.

## The one fact that decides it

⭐ **Every version is kept and every answer stays tied to the version it was given under** — so a delegation can be bounded and checked
after the fact; what it cannot do by itself is stop a sensitive question being asked before anyone outside the author has seen it.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Those roles may write and change it; a DIFFERENT person must approve each version before it is used; any question about health, the cause of death, habits, or other people still comes to you; counsel confirms the basis for anything sensitive before go-live** (our reading). | Inspectors get questions that fit what the Pariwar sees on the ground, without waiting for a meeting for every wording change. | Two people (⛔ never one) decide routine questions about a family; you see only the sensitive ones. |
| **B** | **Every version comes to you.** | Nothing is asked of a family that you have ⛔ not approved. | Slow; small fixes wait for a meeting. |
| **C** | **Those roles decide alone, ⛔ no second approver, ⛔ no limits.** | The fastest. | What the Trust asks a family could change on one person's word — including about illness or a death's cause. |

**Our reading: A** — **because** it keeps the people who know the ground in charge of routine questions, needs two people for any change,
and leaves every sensitive question with you — the same line as Q7.
⭐ The fixed checks you ruled (the original certificate seen and photographed; the date and time of death) stay **fixed** — ⛔ never
editable by staff.

---

# What is at stake right now

- **Live today:** ⛔ nothing — ⛔ no neighbour has been asked anything yet.
- **Blocked:** only the questions you have ⛔ not yet approved; the screens and the first two questions are built meanwhile.
- **If nothing is decided:** members are asked the first two questions only (FQ8 E and FQ10 already cover them).

# How much to trust this note

- **Earlier versions:** `-303`'s note asked only how the five are reached and what a late answer does; your question there (*"which
  questions"*) was answered first with two questions — BigDev then asked for more, so this note replaces that answer before it was sent.
- **Corrected in this note:** before sending — (i) Q3's deciding fact first said the inspection *"already establishes the cause of
  death"*; it records the date and time and checks the certificate, ⛔ not the cause — now worded as it is, with the family's question
  added; (ii) the inspector's view narrowed to differences only (BigDev); (iii) *"who sees the answers"* was made exact — our first wording (*"the District Admin and
  later approvers"*) was wider than the system as designed (later approvers could see only the warning line) and silent on the inspector
  and the helpline. The first draft of the cause question asked *"Was the death natural? — if No: prolonged illness, heart
  attack …"*, which put natural causes under *"not natural"*; it is now one list.
- **Still uncertain:** counsel has ⛔ not yet seen any of this; whether the SMS operator accepts *"a few"* without re-registering is checked at
  registration (the text is ⛔ not registered yet, so ⛔ no cost).

# In plain English

You asked to see the questions. BigDev wants to ask the neighbours more than *"has the member died?"* — and some of what BigDev would like to
ask, how the member died and what illness they had, is exactly what decides whether a family is paid. A neighbour's answer to that is
hearsay. We suggest: ask how they know and how well they knew the member (that tells staff how much an answer is worth); ask how the
member died and which illness, but only as something staff see — never as a warning, a flag or a delay; do ⛔ not ask about alcohol,
because no rule of the Trust uses it; let the text say *"a few short questions"*; and let BigDev make small changes to the questions while
anything new or sensitive still comes to you. For the inspector's longer questionnaire with the family, we suggest the same line: the
Pariwar Admin, a State Trustee or the Super Admin may write it, a second person approves each version, and anything sensitive still comes
to you. ⇒ ⭐ **We suggest Q3 A, Q4 A, Q5 A, Q6 A, Q7 B, Q8 A.** If this section and the evidence below
ever disagree, the **evidence** is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim
> **Niyamavali §5.1 (R5(C.2)):** *"Eligibility is governed by the actual cause of death, not by a pre-existing illness that was honestly declared."*
> **§5.5:** *"Death by suicide, and murder where a nominee is an accused, are excluded from eligibility … subject to State-Trustee review."*
> **§5.6 (R14-adapted):** *"If a member dies of an illness they failed to declare in their medical disclosure and that illness is on the IMA reference list, the engine flags the claim for State-Trustee review — it is never auto-denied."*
> ⚠ The Niyamavali is an agent-drafted reference, ⛔ not ratified as a whole ([[feedback_niyamavali_rulebook_not_spec]]); the rules it records are the Trust's.
> **`2026-09-28-263` FQ10 A:** *"THE CHECK WITH NEIGHBOURS IS A SIGNAL, ⛔ NOT A GATE … The neighbours can ⛔ never block a claim on their own."*
> **`2026-10-10-303` Q1 A:** the text *"… please answer two short questions …"*; the Panel asked *"which all questions will be asked from member"*.

## E2 — What is NOT ratified
- ⛔ No ruling on asking neighbours anything beyond whether the member died and the date (FQ8 E, FQ10).
- ⛔ No ruling on what a neighbour's statement about the cause of death or an illness may do.
- ⛔ No rule of the Trust concerns alcohol (`grep -i alcohol docs/legal/niyamavali.md` — empty).
- ⛔ No counsel view on collecting health information about a member from third parties.

## E3 — What the code does today
- ⛔ Nothing asks the neighbours anything yet (Story 6.6 records the five; Story 6.27 builds the asking).
- The ground inspection records the facts of the death at a visit, incl. the original certificate and the date and time of death (6.26a).
- The member's own medical declaration is held encrypted (Story 3.5, `member_medical_disclosures`); §5.6's flag reads it at a claim.

## E4 — Commands to re-verify
```
grep -n -i "alcohol\|intoxic" docs/legal/niyamavali.md                  # expect EMPTY
grep -n "5.1 Actual-cause\|5.5 Suicide\|5.6 Concealment" docs/legal/niyamavali.md
grep -n "^### Decision 2026-10-10-303" .decision-log.md
```
