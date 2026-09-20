# Trustee Panel routing note — six small choices we made where your ruling was silent

> **§0 gate — passed (2026-09-20), with a caveat we state openly.** Most of these are **ours to decide** — they are how the software
> counts days. We are asking you to **confirm** them anyway because **each one fixes something a family or the District Admin
> actually receives**, and we would not want to have chosen those quietly. ⚠ **This is a confirmation, not a request for a decision:**
> if you say nothing, our defaults stand, and the story says they were ours. It is deliberately short.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id (or record "confirmed as drafted"). Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** Please **confirm — or change —** the six small choices below, where your rulings on the reminders and the letters
did not say exactly what to do.

**Why we ask:** Each one decides a date, a message or an alert that a real person receives. Your rulings set the *shape* (daily, then
twice a week, then weekly; a letter when the phone is dead; a reminder on day 7). They did not say **what each day is counted from**,
**which weekdays**, or a few edge cases. We chose the most natural reading of each.

## The one fact that decides them

**None of these changes what you ruled; they only fix the details.** If a default is wrong, changing it is **a one-line edit to a
table**, not a redesign — we built the schedule so that it can be changed without rewriting the feature.

---

# What we chose — and what you may change

| # | The choice | **Our default** | If you would rather | What it changes for a person |
|---|---|---|---|---|
| **1** | **When do reminders to a dead phone stop?** *(your ruling: "After this reminder sending to dead number, should be stopped")* | Once the **first letter is recorded as posted**. | On finding the number dead; or when the **letter's delivery** is recorded. | The family stops receiving texts to that number **sooner (finding)** or **later (delivery)**. |
| **2** | **The District Admin's chase for the letter record** — *"reminder after 7 days … daily until 12th day, thereafter escalated to Pariwar admin"* — **7 days from what?** | From the **day the letter is posted**. | From the day the phone was found dead. | Decides **when** the District Admin is first reminded to enter the tracking number and delivery date. |
| **3** | **A day-14 "overdue" flag** on the letter record (from *"within 14 days of sending letter"*). | **Yes** — a flag is shown; **nothing else happens**. | **No** flag. | The Pariwar Admin can **see** a letter record that missed the 14 days. ⚠ **The flag is ours, not yours.** |
| **4** | **Letters after day 90.** | A letter can **still be recorded** after day 90, with **no more reminders**. | Recording stops at day 90. | Whether the District Admin can still complete the record for a letter posted late. |
| **5** | **The reminder days** — *"7 days daily, thereafter twice a week for a month, thereafter once a week"*. | **Daily days 1–7** (day 1 = the day *after* the claim was sent back); then **days 10, 14, 17, 21, 24, 28, 31, 35** (twice a week through day 37); then **weekly on days 42, 49, 56, 63, 70, 77, 84**; **stop at day 90**. One message a day, at **10:00 in the morning**. | Fixed weekdays (say Monday and Thursday); another hour; or a different start day. | **Exactly which days and what hour** a family and the District Admin are messaged. |
| **6** | **Where the day-90 escalation goes** — *"Once daily until for next 7 days then escalate"*. | To the **Pariwar Admin**. | To someone else. | Who is alerted when a District Admin has not acted on the closure reminder. |

**Our reading: confirm all six as drafted** — **because** each is the plainest reading of what you ruled and each costs a single edit
if you disagree. **Cost, honestly:** #3 and #5 add or fix something you did not ask for (a flag; the exact days and the morning hour).

---

# What is at stake right now

- **Live today:** **Nothing** — none of this is built.
- **Blocked:** **Nothing.** The story can be built with these defaults.
- **If nothing is decided:** the defaults stand, and the story records that **they were ours**.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. ⚠ Our first draft of the story stated #1, #2 and #3 **as if you had ruled them**.
  A reviewer caught that; they are now labelled as our readings, and this note exists so you can confirm them.
- **Corrected in this note:** the reminder days (#5) were first written as "twice a week" only; a fixed list of days is now given,
  because "twice a week for a month" can be read several ways.
- **Still uncertain:**
  - **No quiet-hours rule exists** anywhere in the planning documents (we searched), so the **10:00** hour is entirely ours.
  - Whether the **day counts** should skip holidays: we assumed **calendar days** (as you ruled, *"Claendar days"*) and **not** to skip any.
  - Whether a family would rather not be messaged **daily** in the first week of a bereavement — the ruling is clear, but the tone is
    ours to keep gentle.

---

# In plain English

You told us how often to remind the family and the District Admin, and what to do when a phone is dead. A few details were left to us:
exactly which days, what hour, and what each count starts from. We have made the most natural choice each time — for example,
messaging every morning at 10 for the first week, then twice a week, then weekly, and stopping at day 90 — and we are showing you the
list so you can change any of it. If you say nothing, these stand. If this paragraph and the evidence below ever disagree, **the
evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-20-229`, Trustee-ratified:**
> *"… with system sending and recording that enough reminder has been sent. For intial 7 days daily, therafter twice a week for a month, thereafter once a week."*

**`2026-09-20-231` (C, E, F), Trustee-ratified:**
> *"Channel reports invalid. Address is mandatory in claim filing form. We will have reminder after 7 days for district admin for updation daily until 12th day, thereafter escalated to Pariwar admin. Pariwar admin will call district admin and get it done."* · *"Claendar days"* · *"Reaplced by one reminder after 30 days since delivery"*

**`2026-09-20-232` (I, J), Trustee-ratified:**
> *"Once daily until for next 7 days then escalate"* · *"Yes, that's right."*

## E2 — What is NOT ratified

- **What "7 days" is counted from** in `-231` C (the posting or the finding).
- **When reminders to a dead number stop** (`-230` clause 3 says only "After this").
- **The exact days of "twice a week for a month, thereafter once a week", and any hour of day.**
- **The day-14 overdue flag** and **letters after day 90.**
- **Who the day-90 escalation goes to** (`-232` I says *"escalate"* without naming anyone).

## E3 — What the code actually does

- **Nothing here exists yet.** No expiry, reminder, overdue or deadline logic is tied to a sent-back claim (E4.2). The schedule is designed as a pure function of the day the claim was sent back, read from an editable table, using Indian-time calendar days.
- **No send-window or quiet-hours rule exists** in the planning documents (E4.3), so the morning hour is a constant we chose.

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 the quoted rulings are in the log
grep -c "reminder after 7 days for district admin" .decision-log.md              # -> 1
grep -c "twice a week for a month" .decision-log.md                              # -> 1
grep -n "Once daily until for next 7 days" .decision-log.md | head -1            # -> found (-232 I)

# E4.2 no expiry / reminder logic for a sent-back claim
grep -rniE "correction_return|returned_for_correction|under_correction" packages/domain/src apps/jobs/src apps/api/src | grep -iE "expir|overdue|reminder|deadline"
#   -> EMPTY (the evidence for the negative claim; only as wide as the directories searched)

# E4.3 no quiet-hours / send-window rule in the planning documents
grep -rniE "quiet hours|do not disturb|send window|DND" _bmad-output/planning-artifacts/architecture.md _bmad-output/planning-artifacts/ux-design-specification.md _bmad-output/planning-artifacts/epics.md _bmad-output/planning-artifacts/prds
#   -> EMPTY. This is the evidence for the NEGATIVE claim "no quiet-hours rule exists" — and it is only as wide as the
#      files searched (the architecture, the UX specification, the epics list and the PRD folder); it does not cover other documents.
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` (or record "confirmed as drafted").
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover.
4. Discharge the item wherever it is carried — Story 6.19's open question T, the confirm N, and D3 — and mark it DISCHARGED, never delete it.
5. If any default changes, edit the schedule TABLE; ⛔ no code change is owed for a change of days or hour. -->
