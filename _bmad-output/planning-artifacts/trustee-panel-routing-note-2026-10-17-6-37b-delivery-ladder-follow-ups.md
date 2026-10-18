# Trustee Panel routing note — follow-up questions on the delivery ladder you ruled for a reminder that is not delivered

> **§0 gate — passed (2026-10-17).** You ruled (Decision `2026-10-17-350`) that a reminder the system concludes was never delivered no
> longer counts as reaching the person, who is then offered the letter route — but only after a delivery ladder: WhatsApp after 4 hours,
> a second SMS after 48 hours, a third SMS 48 hours later and a 96-hour wait, then a call or letter. You asked us to bring any follow-up
> questions back to you. Each question below changes who is texted, when, or what counts as reaching a family, so each is yours.
> **What is ours, and not asked:** how the ladder is timed and stored in the system, the WhatsApp template's approval by Meta, and the
> exact wording of the WhatsApp version of the reminder (it carries the same words as the SMS you approved).
> Routed by BigDev from Story 6.37b (2026-10-17), at the Panel's invitation.

---

> ## PANEL RULING — 2026-10-17 (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev) — Decision `2026-10-17-351`
>
> *"1. A*
> *2. We think this is already answered. Let us reiterate that when a claimant files a claim, he/she will be asked to agree to T&C,
> where it's mentioned that we will contact claimant over SMS/WhatsApp/Call or any other means of communication that may appear in
> future.*
> *3. option B*
> *4. option A*
> *5. option A - we discussed with BigDev Call Tracking/Recording/Auto Transcription will be build later in phase 2.*
> *6. A"*
>
> **Not covered, and put back to the Panel with counsel** (`-351`): the filing agreement as built says *"by text message and by post"*
> only (English and Hindi); whether one agreement can be explicit WhatsApp consent under the ratified opt-in rule; and whether the
> claimant's agreement can be the nominees' consent. Until then no WhatsApp message is sent (our reading). Everything below is kept
> **unedited**, as the questions were put.

> ⚠ **CORRECTION, 2026-10-18 ([Decision 2026-10-18-354](../../.decision-log.md#decision-2026-10-18-354) decision 4 — recorded
> here, ⛔ an edit of anything above or below):** option 1 A's cost below says *"An alarm tells staff when texts go unreported for
> 2 days"*. As built, every alarm reaches the LOGS only until roster Row 32 (h) wires it to a named person — so today no staff member
> is told. ⇒ Row 32 (h) closed is a go-live condition of row 6-37c's ladder (the cost becomes true before the Trust relies on it), and
> the Panel is to be told at its next sitting. ⛔ Told yet (2026-10-18).

---

# The questions, in short

1. **A text with no report at all** — does it start the ladder, or only a text the network reports as failed?
2. **WhatsApp for someone who has not agreed to WhatsApp** — skip that step, or send an SMS in its place?
3. **Which texts** — the correction reminders only, or other claim texts too?
4. **One ladder per person, or one per reminder** — and does any delivered message end it?
5. **The call** — who calls, how it is recorded, and does a call that reaches the family count?
6. **Near the end of the 90 days** — may a claim be closed while a ladder is still running?

Our reading for each is given with its cost. You may answer some and not others; each is independent.

---

# 1. A text with no report at all

**The question:** the ladder starts when an SMS *"has not been delivered for 4 hours"*. Does that mean a text the network has REPORTED as
failed, or any text for which no "delivered" report has arrived — including one for which no report ever comes?

**The one fact that decides it:** reports can stop coming for reasons that have nothing to do with the family — the SMS company pauses
our reports if our server has trouble receiving them, or an account problem stops texts without any report. In those cases every
family's texts look "not delivered" at once.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Only a text reported as failed starts the ladder.** A text with no report keeps counting as reaching the person, as B1 was put to you. | Families whose texts fail are followed up; families whose texts simply go unreported are not. | A text that is lost without any report (reports paused, an account fault) still counts as reaching the family. An alarm tells staff when texts go unreported for 2 days, but nothing is sent to the family. |
| **B** | **Any text without a "delivered" report within 4 hours starts the ladder.** | Every family whose text is not confirmed delivered is followed up, whatever the cause. | If reports stop for everyone, every family on the chase gets a WhatsApp message and two more texts, and after 8 days is treated as not reached and offered a letter — the letter route for every family at once, because of a fault on our side. |

**Our reading:** **A** — **because** under B a fault in our own reporting turns into extra texts and a letter for every family, while
under A the same fault is caught by the alarm and fixed. A's cost is a lost text that nobody reports — which is today's position, now
alarmed.

---

# 2. WhatsApp for someone who has not agreed to WhatsApp

**The question:** step 1 sends the message over WhatsApp. The Trust may message someone on WhatsApp only after that person has
themselves agreed to it. What should happen at the 4-hour step for a person who has not?

**The one fact that decides it:** the people a correction reminder goes to — the claimant or the nominee who filed — are often not
members who have agreed to WhatsApp, so for many families the WhatsApp step cannot be taken at all. (How long a WhatsApp "yes" lasts is
itself a separate open question for you, from Story 6.31.)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Skip the WhatsApp step for them;** the ladder goes on to the second SMS at 48 hours. | A person without WhatsApp consent gets the second and third SMS on the schedule you set. | Nothing is sent between hour 4 and hour 48 for them, so a phone that comes back on early waits until hour 48 for another text. |
| **B** | **Send a second SMS at 4 hours instead of the WhatsApp message,** then continue the ladder. | They get one more SMS earlier. | One more SMS per undelivered reminder (more cost); if the phone is still off at 4 hours, that SMS also fails. |

**Our reading:** **A** — **because** it keeps the ladder you set and only leaves out the step that cannot legally be taken; B adds a
text you did not ask for.

---

# 3. Which texts

**The question:** your question to rule on was about the correction reminders, which decide whether a family has been reached before
their claim is closed for silence. Does the ladder apply only to them?

**The one fact that decides it:** only the correction reminders count toward "reached"; the certificate reminders have their own letter
route; the closure notice, the suspicion notices and the neighbours' request are sent once and decide nothing about reaching the family.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The correction reminders only.** | Only correction reminders get the WhatsApp and SMS follow-ups. | A certificate reminder that is not delivered gets no follow-up. |
| **B** | **The correction reminders and the certificate reminders** (the two chases with a letter route). | Both chases follow up an undelivered reminder. | More texts and a second WhatsApp template; the certificate chase's own letter rule would need the same B1 change. |
| **C** | **Every claim text.** | Every text that is not delivered is followed up. | The most texts; it would also resend the suspicion texts and the neighbours' request, which you ruled are sent ONCE. |

**Our reading:** **A** — **because** it is what you were asked and what the ladder protects: a family closed for silence. B is a
reasonable extension if you want the certificate chase to work the same way; C would conflict with texts you ruled are sent once.

---

# 4. One ladder per person, or one per reminder

**The question:** correction reminders go every day in the first week and then every few days. If several reminders are not delivered,
does each start its own ladder? And does a later reminder that IS delivered end the ladder?

**The one fact that decides it:** in the first week a phone that is switched off for three days would otherwise start three ladders at
once, sending up to six extra SMS and three WhatsApp messages on top of the daily reminders.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **One ladder per person at a time,** started by the first reminder that is not delivered; any message to that person that IS delivered (a later reminder, or a ladder step, on either channel) ends it and the person counts as reached. | A family with a switched-off phone gets one set of follow-ups, and as soon as one message gets through they are reached. | The ladder follows the person, not each reminder: a single reminder that failed is not separately chased once a later one arrives. |
| **B** | **One ladder per reminder.** | Every undelivered reminder is chased separately. | Many overlapping messages in the first week; the family can receive several texts a day. |

**Our reading:** **A** — **because** the aim is to reach the family, and one delivered message does that; B floods a family whose phone
is off for a few days.

---

# 5. The call

**The question:** when the ladder fails, the reminder is *"escalated for call/letter"*. Who makes the call, how is it recorded, and does
a call that reaches the family count as reaching them?

**The one fact that decides it:** today only two things count as reaching a family — a reminder the network accepted, or a posted
letter with a recorded delivery date. There is no record of a phone call anywhere in the system.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The District Admin is asked to call or post the letter; a call that reaches the family is recorded (date, who answered) and counts as reaching them.** | A family can be reached by a phone call, faster than a letter. | A new task and record for the District Admin; a call is harder to check later than a letter's tracking number. |
| **B** | **The District Admin is asked to call or post the letter, but only the letter's recorded delivery counts.** | A call can still help the family, but the claim cannot be closed on it. | The District Admin may call and still have to post a letter for the claim to count; the call is not recorded. |

**Our reading:** **A** — **because** a call that reaches the family is real contact and is faster than post; recording who answered and
when keeps it checkable.

---

# 6. Near the end of the 90 days

**The question:** the ladder can take 8 days. A ladder started by one of the last reminders (the last is on day 84) ends after day 90,
when the claim may otherwise be closed for silence. May a claim be closed while a ladder for one of its people is still running?

**The one fact that decides it:** today the closure for silence can be requested from day 90, and a reminder still in its ladder has not
yet been concluded either way.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Closure waits:** a claim cannot be closed for silence while a ladder for any of its people is running (at most about a week past day 90). | No family is closed on a reminder that might still be concluded "not delivered". | Some closures are a few days later than day 90. |
| **B** | **Closure does not wait:** a reminder still in its ladder counts as reaching the person until it is concluded. | Closures happen on time. | A family can be closed for silence on a reminder that is concluded "not delivered" a few days later — the gap this ruling closes. |

**Our reading:** **A** — **because** B reopens, at the very end of the chase, the gap your ruling was meant to close.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production, and no claim-related text can be switched on until this work is finished.
- **Blocked:** only the follow-up part of the work (the ladder). Receiving and recording delivery reports is being built meanwhile.
- **If nothing is decided:** the ladder cannot be built, and — because the go-live list requires this work to be finished first — no
  claim-related text can be switched on.

---

# How much to trust this note

- **Earlier versions of these questions:** none. They follow from your ruling of 2026-10-17 on reminders reported as not delivered.
- **Corrected in this note:** none yet.
- **Still uncertain:** how often reports go missing or arrive late in practice (nothing is in production to measure); whether the
  WhatsApp version of the reminder will be approved by Meta, and how quickly; how many families on the chase have agreed to WhatsApp.

---

# In plain English

You told us how to follow up a reminder that does not get through: WhatsApp after four hours, two more texts, a wait, and then a call
or a letter. Six things were left open, and we suggest:

1. Follow up only texts the network reports as failed — not texts that simply go unreported — so a fault on our side does not send every
   family extra messages and a letter at once; an alarm already catches that fault.
2. For someone who has not agreed to WhatsApp, skip that step and keep the rest of the ladder.
3. Apply the ladder to the correction reminders only — the texts that decide whether a family has been reached.
4. Run one ladder per person, ended as soon as any message to them is delivered.
5. Let the District Admin call or post the letter, and count a call that reaches the family, recorded with the date and who answered.
6. Do not close a claim for silence while a ladder for one of its people is still running.

If this section and the evidence below ever disagree, the EVIDENCE is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-10-17-350` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti) — the Panel's words:** *"Option B1, but before system conclude
> message as never delivered, take the following steps 1. After SMS has been sent and not been delivered for 4 hours, send message over
> WhatsApp. 2. If still not deliverd after 48 hours by either channel, try again with SMS one more time. 3. If still not delivered after
> second attempt over SMS, send 1 more SMS over after 48 hours and wait for 96 hours. If still failed then escalate reminder for
> call/letter. Any followup question, let the panel know."*

> **`2026-09-27-252` cl.1 (Trustee-ratified):** *"A closure may be requested only when, for each person who must be reached, ≥ 1 reminder
> was accepted by the network (or shown delivered, where a report exists) — or a posted letter has a recorded delivery date."*
> **cl.2:** *"A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE — as for an invalid number."*

> **`2026-09-20-230` cl.1 (Trustee-ratified) — who receives the reminders:** *"both. Use anything for reference if name cannot be used.
> Use standard channel"*.

> **The suspicion notices and the neighbours' request are sent once:** `2026-10-07-293` item 1 B (*"ONE TEXT TO THE REFUSED PERSON"*),
> `2026-10-07-291` Q2 B (*"A TEXT, ONCE"*), and the neighbours' request (`2026-10-10-303` Q1 A).

## E2 — What is NOT ratified

`-350` records our reading of the ladder's timing (hours 0, 4, 48, 96, the wait to hour 192, then the escalation) as NOT ratified, and
lists questions (a)–(f) — the six questions above — as not covered. No ruling covers a recorded phone call as reaching a family.

## E3 — What the system does today

- **WhatsApp consent.** The Trust may message a person on WhatsApp only after they themselves opted in — user-initiated only, with no
  default or inferred consent (architecture §3.4; ADR-0029, Trustee-ratified 2026-07-08). How long an opt-in lasts is open (Story 6.31's
  routing note *"how long a WhatsApp yes lasts"*).
- **No WhatsApp correction reminder exists.** Correction reminders are SMS only today; a WhatsApp version needs a new template approved
  by Meta, in English and Hindi.
- **Reports can stop.** MSG91 pauses our delivery-report webhook when more than 2 % of at least 10 requests fail; an account fault
  (such as a zero balance) may produce no report (Story 6.37b F6, F8). A daily alarm counts accepted texts with no report for 48 hours
  to 7 days (Decision `2026-10-17-347`, decision 13).
- **The reminder schedule.** Correction reminders go on days 1–7, 10, 14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77 and 84
  (`packages/domain/src/claim/correction-schedule.ts`, `CORRECTION_REMINDER_DAYS`); closure for silence can be requested from day 90
  (`packages/domain/src/claim/correction-closure-jobs.ts`, `CLOSURE_DUE_LAST_DAY` / `CLOSURE_ESCALATION_DAY`).
- **What counts as reached.** An accepted reminder on the current number, or a posted letter with a recorded delivery date
  (`packages/domain/src/claim/correction-closure.ts`, `reachedBySms` and the closure ground). No phone-call record exists.
- **Only the correction reminders feed "reached";** the certificate chase has its own letter rule (`certificate-reminder.ts`).

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-350:' .decision-log.md
grep -n 'Any followup question, let the panel know' .decision-log.md
grep -n 'A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE' .decision-log.md
grep -n 'Use standard channel' .decision-log.md
grep -n 'ONE TEXT TO THE REFUSED PERSON' .decision-log.md
grep -n 'A TEXT, ONCE' .decision-log.md
grep -n 'user-initiated ONLY' docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md
grep -n '77, 84' packages/domain/src/claim/correction-schedule.ts
grep -n 'CLOSURE_DUE_LAST_DAY\|CLOSURE_ESCALATION_DAY' packages/domain/src/claim/correction-closure-jobs.ts
grep -n 'reachedBySms' packages/domain/src/claim/correction-closure.ts
grep -rn 'correction.*whatsapp\|whatsapp.*correction' apps/jobs/src/scheduler packages/domain/src/claim
```

The last command is expected to return NOTHING (no WhatsApp correction reminder exists) — that empty result is the finding it checks.

Run 2026-10-17 before handing the note to BigDev: commands 1–10 each returned at least one line; command 11 returned nothing, as
expected.
