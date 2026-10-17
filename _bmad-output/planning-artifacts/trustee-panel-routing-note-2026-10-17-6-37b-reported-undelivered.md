# Trustee Panel routing note — when the phone network reports that a reminder never arrived, does it still count as having reached the family?

> **§0 gate — passed (2026-10-17).** You ratified that a claim may be closed for the family's silence only when each person who must
> be reached was reached — a reminder *"accepted by the network (or shown delivered, where a report exists)"*, or a posted letter with
> a recorded delivery date — and that a family no channel can reach is offered the letter route. Until now no delivery report ever
> existed. From this work, one will. Whether a reminder the network later REPORTS as undelivered still counts as reaching the family,
> and whether that person is then offered a posted letter, changes when a family's claim can be closed and who is offered a letter.
> That is what the Trust **owes a family**, and each answer matches, narrows or widens a clause you ratified, depending on how that
> clause is read (E2) — so it is yours.
> **A mixed question, split.** Which of MSG91's status codes count as "not delivered", and the rule that a "not delivered" report is
> not undone by a later "delivered" one, are engineering choices we have made (Decision `2026-10-17-347`, decisions 4 and 7). Under
> our suggested answer they decide who is offered a letter, so they are set out in full in the evidence (E3) — but they are not what
> we are asking you.
> Routed by BigDev from Story 6.37b, Task 0.3 (2026-10-17).

---

> ## PANEL RULING — 2026-10-17 (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev) — Decision `2026-10-17-350`
>
> *"Option B1, but before system conclude message as never delivered, take the following steps*
> *1. After SMS has been sent and not been delivered for 4 hours, send message over WhatsApp.*
> *2. If still not deliverd after 48 hours by either channel, try again with SMS one more time.*
> *3. If still not delivered after second attempt over SMS, send 1 more SMS over after 48 hours and wait for 96 hours. If still failed
> then escalate reminder for call/letter.*
> *Any followup question, let the panel know."*
>
> **Recorded as:** B1, applied only after the delivery ladder above. **Not covered, and put back to the Panel as follow-up questions**
> (`-350`, "What this ruling does NOT cover"): (a) whether a text with no report at all counts as "not delivered"; (b) WhatsApp for a
> person who has not opted in; (c) which texts the ladder applies to; (d) one ladder per person or per reminder; (e) the call — who,
> how recorded, whether it counts as reached; (f) a ladder still running at day 90. Everything below is kept **unedited**, as the
> question was put.

---

# The question

**In one sentence:** when the phone network tells us, after a reminder was sent, that the reminder never reached the person's phone,
should that reminder stop counting as having reached them — and should the District Admin then be offered the posted letter for that
person, as already happens when the network refuses a number outright?

**Why it cannot be decided without you:** you decided what "reached" means before a family's claim can be closed for their silence,
and you chose "the network accepted it" knowing that accepted is not the same as received. A delivery report now tells us, for some
texts, that a reminder was NOT received. Whether that changes what counts as reached, and whether the family is then offered a letter,
changes when a claim can be closed and who is offered a letter. Neither is ours to choose.

## The one fact that decides it

**When a reminder is sent, the SMS company only says "received the request". Hours later — and sometimes never — it tells us whether
the phone network actually delivered it.** Today the Trust never hears that second answer, so a reminder that never reached the phone
still counts as reaching the family. From this work, the Trust will hear it for many texts — we expect most, though nothing is yet in production to measure it — but not
for all of them, and not always in time.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Record the reports; change nothing.** | Nothing. A reminder the network accepted still counts as reaching the person, even when the network later reports it never arrived. | A family's claim can be closed for their silence on the strength of reminders the network told us never reached them. That is the gap accepted in 2026-09 — but kept now even when we know. |
| **B1** | **A reminder reported as never delivered counts as not reaching the person, AND the person is offered a posted letter** — exactly as when the network refuses a number when the reminder is sent. | That reminder no longer lets the claim be closed. The District Admin is offered the posted letter for that person, and reminded to post it. If it was the last reminder before closure, the closure notice goes to them by letter instead of by text. | Closing a claim takes longer. One failed report — a phone switched off for a day — starts the letter process for that number, and it stays started even if a later reminder is delivered. A reminder that first failed and was then delivered still counts as failed. A failure reported on the last reminder (day 84), or any report that arrives after day 89, makes the person eligible for a letter, but nobody is reminded to post it — as already happens today when the network refuses a number on day 84. A failure the SMS company never reports (its delivery reports paused, or an account problem) still counts as reached. |
| **B2** | **A reminder reported as never delivered counts as not reaching the person — but no letter is offered.** | That reminder no longer lets the claim be closed. Nothing else changes. | A person whose every reminder is reported as never delivered is never reached and never offered a letter, so the claim can never be closed for silence. That is the same kind of cost you were warned of in 2026-09 for "proven delivery only". |
| **C** | **Only a reminder the network reports as DELIVERED counts** (the "proven delivery" you kept as a future intent in 2026-09, now). | A reminder counts only when a report says it was delivered. | When the SMS company sends no report — reports paused, an account problem, a report that never comes — the family can never be reached by text, and with no letter offer they are never offered a letter either: the claim waits indefinitely, for every family the reports miss. And it is the only option in which a report ADDS reach: a forged or mistaken "delivered" report (anyone holding the webhook's secret could send one) could let a claim be closed for silence. |

**Our reading:** **B1** — **because** a reminder the network tells us never arrived should not be what allows a family's claim to be
closed for their silence, and a person we cannot reach should be offered the posted letter, which is what you already decided for a
number the network refuses outright. B2 un-counts the reminder but leaves the person stranded with no route at all; C makes closure
depend on reports the SMS company does not always send; A keeps a gap we will now be able to see.
You may reject our reading and still use this note: every option's cost is stated, including B1's.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production, and no claim-related text can be switched on until this delivery-report work
  is finished and its webhook is live.
- **Blocked:** only the small change that applies your answer. The rest of the delivery-report work is being
  built and changes nothing a person receives until you rule.
- **If nothing is decided:** the delivery-report work stays unfinished, and the go-live list requires it to be finished before any
  claim-related text is switched on — so those texts cannot go live. If the work were finished without a ruling, option A would apply
  by default.

---

# How much to trust this note

- **Earlier versions of this question:** in 2026-09 we asked you what "reached" means when no delivery reports existed (our note of
  2026-09-20 on what "reached" means before closure). You chose "accepted by the network" for now, and kept proven delivery as an intent for a future
  version. This note is that future version arriving — for reported failures only, not for proven delivery.
- **Corrected in this note:** while preparing it we first wrote that you had REJECTED proven delivery in 2026-09; you deferred it, and
  the note now says so. Our first draft had only one "B" (un-count the reminder); a review found that this leaves a person never reached
  and never offered a letter, so it is split into B1 and B2. We first described the letter offer as depending on the LAST reminder; in
  fact it depends on the FIRST reminder the network refused, which is why one failed report starts the letter process for good.
- **Still uncertain:**
  - **What MSG91's status codes mean in practice.** Its documents list *Delivered*, *Failed*, *Rejected*, *Blocked number*,
    *Country code blocked* and *NDNC (promotional SMS only)*. They do not say which code a DLT template failure carries, or whether a
    code can change after a final one. We treat every one of those failure codes as "never delivered" (E3).
  - **Whether reports always arrive, and how late.** MSG91 retries a report it could not deliver to us, and pauses our webhook if too
    many fail. How long a report can be delayed is not documented.
  - **That the tag linking a report to its reminder comes back.** The documents show it; it is proven only by a real report on the
    go-live list.
  - **How many families this affects.** Nothing is in production to measure.

---

# In plain English

When the Trust sends a family a reminder, the SMS company answers straight away that it has received the request. You decided in
2026-09 that this counts as the family having been reached, knowing that a text can be accepted and still never arrive.

From now on, the SMS company will also tell us, usually within hours, whether the phone network actually delivered each text. Some
reminders will come back as "never delivered" — a switched-off phone, a blocked number, a number the network could not reach.

We suggest that a reminder reported as never delivered should not count as reaching the family, and that the District Admin should be
offered the posted letter for that person — exactly what already happens when the network refuses a number at the moment of sending.
The cost is that some claims take longer to close, and that one failed report starts the letter process for that number even if a
later text gets through. A text whose failure the SMS company never reports would still count as reached, as it does today.

If you prefer, we can record the reports and change nothing, un-count the failed reminders without offering a letter, or count only
reminders the network confirms as delivered. Each has the cost set out above.

If this section and the evidence below ever disagree, the EVIDENCE is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-09-27-252` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti) — the Panel's words:** *"Option A, in future version we may
> want to build option B, but for now option A is fine."* · *"Yes for no working route, offer District Admin the letter route"*

> **`2026-09-27-252` cl.1:** *"[Trustee-ratified] "REACHED" (option A). A closure may be requested only when, for each person who must
> be reached, ≥ 1 reminder was accepted by the network (or shown delivered, where a report exists) — or a posted letter has a recorded
> delivery date."*

> **`2026-09-27-252` cl.2:** *"[Trustee-ratified] A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE — as for an invalid
> number."*

> **`2026-09-27-252` cl.3:** *"[Trustee-ratified, as intent only] PROVEN DELIVERY (option B) MAY BE BUILT IN A FUTURE VERSION."* (The
> entry adds *"Not now."*) Consequence 3: *"a delivery-report integration (SMS DLR; …) would need its own row."*

> **`2026-09-27-252`, the entry's own reading, NOT ratified:** the Panel chose cl.1 *"knowing "accepted is not received" (the note's
> stated cost)"*.

> **The 2026-09 note's option costs** (`trustee-panel-routing-note-2026-09-20-6-19-reached-before-closure.md`): option A — *"Accepted
> is not received. A message can be accepted and never reach the phone, so a family could be closed without ever having seen a
> reminder."*; option B (proven delivery) — *"… SMS may never give a reliable report — a family reachable only by SMS could become
> impossible to close, and the claim waits forever again."*

> **`2026-10-12-323` R2 (author-commit — the accepted gap):** *"if it arrives only in an asynchronous delivery report (this repo
> consumes ⛔ delivery report), the send is recorded `accepted` and 6.19c's D22 `reachedBySms` counts the family REACHED — the input the
> Trustee-ratified `-252` closure-for-silence reads"* ("⛔" in that quotation means "no").

> **`2026-10-17-345` §0 (author-commit):** of the places its work would become the Panel's, *"(1) a delivery report that changes what
> counts as "reached" (`-252` cl.1) ⇒ row 6-37b"*.

## E2 — What is NOT ratified

No ruling says what a delivery report that says "not delivered" does. Cl.1's words bear two readings, and which one is right is
itself part of what we are asking:

- **Reading (i): cl.1 is silent about a reminder that was accepted and then reported undelivered.** It asks for ≥ 1 reminder
  "accepted by the network". Under this reading **A matches** cl.1, and **B1, B2 and C each narrow** it (they stop counting a reminder
  cl.1 would count).
- **Reading (ii): "or shown delivered, where a report exists" sets the bar wherever a report exists** — where a report exists, the
  reminder counts only if the report shows it delivered. Under this reading **B1 and B2 match** cl.1 for a reminder reported as never
  delivered, and **A does not match**: it keeps counting a reminder cl.1 would not count (it widens "reached"). ⚠ Strictly, reading (ii) would also stop counting a
  reminder whose report is neither "delivered" nor "not delivered" (an unknown code); B1 and B2 keep counting it, because a doubtful
  report never un-counts a send. Conversely, a reminder reported failed and then delivered would count under reading (ii) (a
  report shows it delivered), but B1 and B2 keep the failure (decision 7) — there they NARROW cl.1. **C** matches reading (ii) where a report exists and goes further where none does.
- **Cl.2's letter route** (*"as for an invalid number"*) — B1's letter offer matches it under either reading; B2 and C, by offering no
  letter, leave a person no channel can reach without the letter route.
- **Cl.3** keeps proven delivery as an intent only; option C would build it now.

## E3 — What the code actually does

Built today (`dae96d9b`) — none of the delivery-report work exists yet; it is planned in Story 6.37b and changes nothing until Task 7:
- **What counts as reached.** `reachedBySms` is true when any `family_sms` reminder on the person's CURRENT number has outcome
  `accepted` (`packages/domain/src/claim/correction-closure.ts:373-375`). A closure ground is met only when every person is reached —
  by SMS or by a letter with a recorded delivery date (`assertClosureGround`, `:478-479`); a dead number never counts toward it.
- **Who is offered a letter.** A person is letter-eligible when the current-number epoch has a dead outcome (`foundDeadOn !== null`,
  `packages/domain/src/claim/correction-letter.ts:185`, enforced server-side by `assertCorrectionLetterRecordable`, `:237`).
  `foundDeadOn` is the FIRST dead outcome (`rejected_invalid_number`, `rejected_unreachable` or `no_target`) in that epoch
  (`packages/domain/src/claim/correction-chase.ts:698-702`, `:758`, `:765`). The staff queue shows a dead fact as `unreachable`,
  winning over "reached" (`packages/domain/src/claim/correction-chase-read.ts:120-128`).
- **Closure by letter instead of text.** `numberKnownDead` — the LAST evidential reminder was a dead outcome — sends the closure notice
  by letter instead of SMS (`correction-closure.ts:377-382`, `:434-435`).
- **The letter chase.** The jobs sweep reminds the District Admin to post the letter from found-dead +7 to +12 days and escalates to
  the Pariwar Admin at +13 (`apps/jobs/src/scheduler/claim-correction-reminders.ts:1253-1290`). The sweep runs only for OPEN chases
  (`:818`, `r.ended_at IS NULL`): after day 90 no reminder, letter chase or escalation fires; letters can still be recorded
  (`correction-letter.ts:10-11`); the closure-due (days 90–96) and escalation (day 97) jobs run whether or not anyone was reached
  (`packages/domain/src/claim/correction-closure-jobs.ts:259-288`; the days are the constants at `:74-75`). A never-reached person keeps closure refused until a letter's
  delivery is recorded.
- **Only the correction reminder feeds "reached".** Closure notices, certificate reminders, suspicion notices and peer-mesh texts do
  not. The certificate chase decides its own letter eligibility from its own table (`packages/domain/src/claim/certificate-reminder.ts:809`,
  `:818`) and is unchanged by every option here.
- **The burst alarm.** A raw-SQL alarm counts yesterday's `rejected_unreachable` reminders (`claim-correction-reminders.ts:751-756`);
  under B1 it would not see reported failures unless it is extended (the story's AC11 decides that).

Planned (Story 6.37b; Decision `2026-10-17-347`), the author's — disclosed here because under B1 they decide who is offered a letter:
- **Which codes are "not delivered" (decision 4):** `2` Failed, `9` NDNC, `16` and `25` Rejected, `17` Blocked number, `20` Country
  code blocked. `1` is "delivered". `0` (sent, not final) changes nothing. Any other code changes nothing and raises an alarm.
- **"Not delivered" is not undone (decision 7):** once a reminder is reported "not delivered", a later "delivered" report for the same
  request does not change it.
- **Silence:** a reminder with no report at all keeps counting as accepted; a daily alarm counts accepted texts 48 hours to 7 days old
  with no report (decision 13).
- **Under B1, as planned (story AC11):** one mapping inside `readReturnFamilyRows` reads a `family_sms` reminder whose delivery state is
  "not delivered" as `rejected_unreachable` — no stored outcome is changed — so every reader above inherits it, including the jobs
  sweep. Under B2 only the "reached" half applies; under A nothing changes; under C the AC is rewritten.
- ⚠ INFERENCE (not measured): how often reports arrive, how late, and how many families would be affected — nothing is in production.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-252:' .decision-log.md
grep -n 'Option A, in future version we may want to build option B' .decision-log.md
grep -n 'Yes for no working route, offer District Admin the letter route' .decision-log.md
grep -n '"REACHED" (option A).\*\* A closure may be' .decision-log.md
grep -n 'A FAMILY NO CHANNEL CAN REACH IS OFFERED THE LETTER ROUTE' .decision-log.md
grep -n 'as intent only\] PROVEN DELIVERY (option B)' .decision-log.md
grep -n 'would need its own row' .decision-log.md
grep -n 'Accepted is not received' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-20-6-19-reached-before-closure.md
grep -n 'the claim waits forever again' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-20-6-19-reached-before-closure.md
grep -n 'if it arrives only in an asynchronous delivery report' .decision-log.md
grep -n 'a delivery report that changes what counts as "reached"' .decision-log.md
grep -n '^### Decision .*-347:' .decision-log.md
sed -n '373,375p;477,479p' packages/domain/src/claim/correction-closure.ts
sed -n '185p' packages/domain/src/claim/correction-letter.ts
sed -n '698,702p;758p;765p' packages/domain/src/claim/correction-chase.ts
grep -n 'WINS over' packages/domain/src/claim/correction-chase-read.ts
grep -n 'ended_at IS NULL' apps/jobs/src/scheduler/claim-correction-reminders.ts
sed -n '74,75p' packages/domain/src/claim/correction-closure-jobs.ts
grep -n '77, 84' packages/domain/src/claim/correction-schedule.ts
grep -n "rejected_unreachable" apps/jobs/src/scheduler/claim-correction-reminders.ts
grep -rn 'delivery_report\|deliveryReport\|sms_send_deliveries' packages/domain/src apps/jobs/src apps/api/src
```

The last command is expected to return NOTHING today (no delivery-report code exists yet) — that empty result is the finding it
checks, not a pass of anything else.

Run 2026-10-17 before handing the note to BigDev: commands 1–18 each returned at least one line; command 19 returned nothing, as
expected. After a review, two commands were added (the closure-job days and the reminder schedule) and re-run: each returned a line. A first run returned nothing for command 4 because the decision log bolds part of that sentence; the command was corrected.
