# Trustee Panel routing note — before a claim is closed for silence, what must we be able to show?

> **§0 gate — passed (2026-09-20).** This is the Panel's: it is about **what the Trust owes a family before it ends their claim.**
> Stripped of citations: *"before we close a family's claim because they never answered, must we be able to show they actually got
> our messages?"* — a question we would not want to settle alone. ⚠ It was **mixed**, so it is split: the Panel is asked **only** the
> "what must be shown" question. Whether the software *can* show delivery, and what it costs to build, is ours and is stated as a fact.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** Before a claim can be closed because the family never answered, must we be able to show that **they actually
received** our messages — or is it enough that **we sent** them?

**Why it cannot be decided without you:** You ruled that reminders must be *"sent and delivered"* before closure. That is the right
instinct — a family should not lose a claim over messages they never saw. But for text messages **the system cannot tell delivered
from sent**, so the ruling cannot be applied literally. Choosing what counts as enough is choosing how sure we must be before ending a
claim.

## The one fact that decides it

**For text messages, the system can only tell that the network *accepted* our message — never that it reached the phone.** The text
message gateway gives no delivery report at all today. WhatsApp does report delivery, but that report is not connected to our
reminders. So *"delivered"* cannot be proven for SMS without building something new — and for some phones it may never be provable.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **"Reached" = the network accepted it, or a letter was delivered.** Closure may be requested only if, for each person we must reach, at least one reminder was **accepted** (or shown delivered, where a report exists) — **or** a posted letter has a recorded delivery date. | A family with a working-looking number who never answered can be closed after 90 days once messages were accepted. A family with an **invalid** number can only be closed after a **letter** is delivered. | **Accepted is not received.** A message can be accepted and never reach the phone, so a family could be closed without ever having seen a reminder. |
| **B** | **"Reached" = proven delivered.** Build delivery reporting first; closure only where delivery is recorded (or a letter delivered). | The strongest protection for the family. | New work and delay, and **SMS may never give a reliable report** — a family reachable only by SMS could become impossible to close, and the claim waits forever again. |
| **C** | **Any recorded outcome is enough.** Closure may be requested after 90 days once every scheduled reminder has *some* recorded result — accepted, failed or no route at all. | Claims close on time; the least work. | A claim can be closed although **no channel ever reached the family** — for example every reminder failed for want of a route. That contradicts the promise that nobody is refused for silence without having been reached. |

**Our reading: A** — **because** it is the strictest test the system can honestly meet today, and the letter route covers the invalid
numbers. **Cost, honestly:** it accepts that "accepted" is not the same as "seen". ⚠ **Separable:** if you want B, tell us and the
delivery reporting becomes the first piece of work; we would then also tell you how long it is likely to take.

### One point that rides on the same fact

**A family that no channel can reach at all** (no working route — not the same as a phone the network calls *invalid*) — **we would
offer the District Admin the letter route for them**, as for an invalid number. *Is that right?*

---

# What is at stake right now

- **Live today:** **Nothing** — this is precautionary.
- **Blocked:** the rule for **when a closure may be requested**, and how a reminder is recorded. Neither can be finished until this is
  decided; the other parts of the story can proceed.
- **If nothing is decided:** the story ships with **A** as its default, and says so.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. ⚠ **Our own first default was the weakest option (C), and we called it
  "conservative".** A reviewer caught that it lets a claim close although nobody was ever reached; we changed the default to A.
- **Corrected in this note:** we first wrote that the reminder system records *"delivered"*. It cannot for SMS — the note now says so.
- **Still uncertain:**
  - Whether the SMS provider offers a delivery report we could connect. We found none in the code; we have **not** asked the provider.
  - WhatsApp's delivery report exists but is **not linked** to reminders; how reliable it is for a family that has not opted in is
    unknown.
  - The list of failure codes that mean "invalid number" is marked **indicative** and has never been checked against the real gateway.

---

# In plain English

You ruled that a family's claim may only be closed for silence once our reminders were *sent and delivered*. For text messages we can
only ever know that the network **accepted** a message — not that it arrived. So we have to decide how sure we must be.

We see three ways. **Insist on proof of delivery** (the safest for the family, but SMS may never provide it, so some claims could
never be closed). **Accept that the network took the message, and require a delivered letter where the number is invalid** (workable
today, but a message can be accepted and never seen). Or **accept any recorded result** (closes claims on time, but could close a
claim although nobody was ever reached).

We suggest the middle way, because it is the strictest test we can honestly meet today. If this paragraph and the evidence below ever
disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-20-230` clause 3, Trustee-ratified:**
> *"All reminders sent and delivered. If number is dead a letter will be sent by District Admin on physical address, tracking number needs to be entered by District admin and Delivery date should be updated in system with screenshot within 14 days of sending letter. After this reminder sending to dead number, should be stopped. If no action taken within 30 days one more letter to be sent by District admin and recorded as above. Thereafter if 90 days have been passed, auto closure."*
— ⚠ the last sentence is **superseded by `-231`** (the closure is not automatic).

**`2026-09-20-231` C and D, Trustee-ratified:**
> *"Channel reports invalid. Address is mandatory in claim filing form. …"* · *"30 days since delivery, 90 days enough. If 90 days gone before second delivery no further action required."*

**`2026-09-20-229`, Trustee-ratified:**
> *"… with system sending and recording that enough reminder has been sent."*

## E2 — What is NOT ratified

- **What "delivered" means when the channel gives no delivery report.** Not ruled.
- **Whether "enough reminders" means every reminder delivered, or a lesser test.** `-231` D says *"90 days enough"* — about the second letter — and does not say whether that also covers the reminders.
- **What happens to a family no channel can reach** — `-231` C defines a dead number as *"channel reports invalid"*, which is not the same as no route.

## E3 — What the code actually does

- **SMS has no delivery receipt.** `packages/channels/src/providers/sms-dlt.ts`: *"The gateway gives NO synchronous delivery receipt at accept time (no DLR seam in v1)."* (E4.2)
- **WhatsApp reports delivery, but nothing links it to a reminder.** The webhook writes a status table keyed by the provider's message id; nothing seeds a row at send time and the reminder path drops the message id after sending. (E4.3)
- **"Invalid number" is a send-time signal only,** and its code list is marked indicative and unverified against the real gateway. (E4.4)
- **No reminder record exists** — the story builds one; today there is no expiry, reminder or age logic for a sent-back claim. (E4.5)
- ⚠ **Inference:** "sent and delivered" for SMS is unattainable today; the best signals are *accepted* and a *send-time invalid-number rejection*.

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 decision ids — bare number, date verified
grep -n '^### Decision .*-2\(29\|3[012]\)' .decision-log.md               # -> 232, 231, 230, 229, all 2026-09-20

# E4.2 SMS: no delivery receipt (verbatim)
grep -n -i "NO synchronous delivery receipt" packages/channels/src/providers/sms-dlt.ts     # -> line 82

# E4.3 the provider message id is never captured by the reminder path
grep -n "providerMessageId" apps/jobs/src/scheduler/contribution-notify.ts
#   -> EMPTY. A FINDING: the send result's message id is dropped, so no status callback can be joined to a reminder.

# E4.4 the invalid-number codes are marked indicative
grep -n -i "INDICATIVE" packages/channels/src/providers/sms-errors.ts        # -> found

# E4.5 nothing expires or reminds a sent-back claim
grep -rniE "correction_return|returned_for_correction" packages/domain/src apps/jobs/src apps/api/src | grep -iE "expir|overdue|reminder|deadline"
#   -> EMPTY (as at the earlier note's E4.7): no such logic exists yet
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (a ruling on "reached" does not fix how long a letter may take).
4. Discharge the item wherever it is carried — Story 6.19's open questions O and R — and mark it DISCHARGED, never delete it.
5. If implementation follows (option B), it needs a ROW: delivery reporting for SMS/WhatsApp, linked to the reminder record. -->
