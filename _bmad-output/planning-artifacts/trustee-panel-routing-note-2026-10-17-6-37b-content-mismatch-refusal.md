# Trustee Panel routing note — when the SMS company's stored copy of a text provably has different words, should the Trust still send it?

> **§0 gate — passed (2026-10-17).** Every text the Trust sends is held twice: our own copy, with the words you approved, and a copy
> registered with the SMS company (MSG91) that is what the phone actually receives. The system already checks the two against each
> other. On the paths that remind a family about a claim correction, tell them the claim was closed, or remind them about a
> certificate, a mismatch today is recorded, an alarm is raised, and the text is still sent. Refusing to send it instead would change
> WHO is texted — which an earlier decision (`2026-10-12-322` §0) already reserved for you — so it is yours.
> **A mixed question, split.** How a mismatch is detected, and what counts as PROOF of one, are engineering: they are ours, and
> proof is not yet settled (E2). We ask only whether a proven mismatch should stop the text.
> **One question, asked once.** It is recorded in two places — the go-live list (roster Row 32, note (6.4)) and the deferred-work list
> (the item on MG5's checks) — and is asked here once. It is separate from the "reached" question routed the same day (the note
> *"6-37b reported undelivered"*): a mixed question is two questions.
> Routed by BigDev from Story 6.37b, Task 0.3 (2026-10-17).

---

> ## AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, the ruling is written into this block **and** into `.decision-log.md` as a
> new decision id. Everything below is then kept **unedited**, as the question was put.

---

# The question

**In one sentence:** if we can prove that the SMS company's copy of a correction reminder, closure notice or certificate reminder has
different words from the ones you approved, should the Trust refuse to send that text — or send it and raise an alarm, as it does
today?

**Why it cannot be decided without you:** refusing a text means a family is not texted that day — and for the closure notice, not at
all. Who is texted on these paths is yours: an earlier decision recorded that a refusal of this kind would *"have changed WHO is
texted"* and so would have been the Panel's. Sending a text whose words differ from what you approved is also a matter of what the
Trust says to a family.

## The one fact that decides it

**The delivery reports now being built catch only one of the two kinds of mismatch.** When the SMS company's copy differs from the words
registered with the telecom regulator's DLT system, the operator usually blocks the text, and from this work that comes back to us as
a failed delivery. But when the SMS company's copy matches the DLT registration and differs only from OUR copy, the text is delivered
— with other words — and the report says "delivered". No report will ever catch that second case.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Never refuse; send and raise an alarm** (what is built today). | The family receives the text. If the words are wrong, staff are alerted (once alerts reach a named person). | In the second case the family receives words other than the ones you approved, and it counts as having reached them. In the first case the operator blocks the text; whether that block un-counts it depends on how you answer the "reached" question — if a reported failure still counts (that note's option A), or when no report arrives, nothing un-counts it. |
| **B** | **Refuse the text when the mismatch is PROVEN.** | The family is not texted that day — the day's reminder is used up, and a closure notice is lost for good. | Fewer texts, and a family may miss a reminder or a closure notice because of a fault on the SMS company's side that the family cannot see. And B has no effect until we can PROVE a mismatch, which we cannot yet do reliably (E2) — until then the system would still send and alarm, as A. |

**Our reading:** **A**, if you choose B1, B2 or C in the "reached" question — **because** then a text the operator blocks is already
un-counted by its failed report, and refusing would add a lost reminder or a lost closure notice to protect only against the second
case, where the family at least receives a text. **If you choose that note's option A** (reported failures still count), our reading
is **B**, because nothing else would ever stop a blocked text from counting as reaching the family.
You may reject our reading and still use this note: both options' costs are stated.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production; none of these texts can be sent until their templates are provisioned, which
  waits for the delivery-report work and its go-live checks.
- **Blocked:** no code. The go-live list asks that this question be put to you before the claim texts' go-live leg closes, so the
  delivery-report story cannot be marked done until this note has been sent.
- **If nothing is decided:** option A stays as built.

---

# How much to trust this note

- **Earlier versions of this question:** none was put to you. It was first recorded on 2026-10-17 in the decision that built the SMS
  company's checks, as a question for you, not routed then.
- **Corrected in this note:** our first draft said a mismatched text always fails at the operator and comes back as a failed delivery.
  That is only one of the two cases; the other — the SMS company's copy matches the DLT registration but not ours — is delivered, and
  the note now says so. Our first draft also offered no reading for the case where you keep reported failures counting; it now does.
- **Still uncertain:**
  - **That a DLT mismatch is blocked and reported as a failure.** MSG91's documents list DLT failure reasons such as *"Template not
    matched on DLT"*; they do not promise every mismatch is caught. This is an inference.
  - **What counts as proof of a mismatch.** The comparison reads MSG91's stored templates; which stored version is the one MSG91 sends,
    and how its status fields are to be read, are not yet settled with MSG91 in writing (E2).
  - **How often either case happens.** Nothing is in production to measure.

---

# In plain English

Each text the Trust sends exists twice: our copy, with the words you approved, and a copy kept by the SMS company, which is what
actually reaches the phone. The system compares the two. On the correction, closure and certificate texts, a difference today means:
an alarm, and the text is sent anyway.

There are two kinds of difference. If the SMS company's copy differs from the words registered with the telecom regulator, the
operator will usually block the text, and we will now hear that it failed. If the SMS company's copy matches the regulator's but not
ours, the text goes through, with other words, and we will hear that it was delivered.

We suggest that, if you decide in the other note that a failed text no longer counts as reaching the family, the Trust keeps sending
these texts and raising an alarm: the blocked ones are already handled, and refusing would cost families a reminder or a closure
notice. If you decide instead that failed texts still count, we suggest refusing a text once a mismatch is proven, because nothing
else would stop a blocked text from counting.

If this section and the evidence below ever disagree, the EVIDENCE is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified or decided, verbatim

> **`2026-10-12-322` §0 (author-commit — the reservation this question rests on):** the rejected options *"would have changed WHO is
> texted or WHEN on the correction, closure and certificate paths … and so would have been the Panel's"*.

> **`2026-10-17-345` §0 (author-commit):** *"ONE question is recorded as the Panel's and ⛔ routed: whether a PROVEN content mismatch
> (MSG91 would deliver OTHER words) should refuse on the correction / closure / certificate paths."* ("⛔" there means "not".)

> **`2026-10-17-345` X1 (accepted by BigDev):** *"on the correction / closure / certificate paths a PROVEN template fault ends the row
> exactly as a missing template id does today — it spends that day's reminder slot and LOSES that closure notice for good."*

> **`2026-10-17-345` Consequence 3:** *"The open Panel question (a PROVEN content mismatch on the correction / closure / certificate
> paths) is recorded here and in the story's MG5 / MG15 — ⛔ routed. A deferred-work item carries it with the later change that makes the
> api content check blocking (trigger: Row 32 (e) records a real response AND S1 is settled)."*

> **Roster Row 32 note (6.4):** *"A question for the Panel rides on leg (i): whether a PROVEN content mismatch should REFUSE a
> correction / closure / certificate text … ask it with row 6-37b's create-story, before leg (i) closes."*

The Trustee-ratified texts themselves (the correction reminder, closure notice and certificate reminder wordings) are what the
comparison protects; this question does not change any of their words.

## E2 — What is NOT ratified

- No ruling says whether a text may be refused because the SMS company's copy differs from ours. `-345` built the check as an alarm on
  these paths and recorded the question as yours; `-322` §0 reserved refusals on these paths for you.
- **What counts as proof is not settled.** `-345` S1 left open which stored version MSG91 sends, what its status fields mean and how
  its stored text is encoded (*"⛔ settled by the docs"*); Row 32 (e) — a real response from MSG91 — is the trigger. Until both are
  settled, option B cannot refuse anything; that later change is carried in `deferred-work.md` (the item on MG5's checks).
- **The X1 cost already accepted** is for a PROVEN template FAULT (for example a missing or malformed template id); this question
  extends it to a proven CONTENT mismatch.

## E3 — What the code actually does

Built today (`dae96d9b`):
- The template pre-flight compares MSG91's ACTIVE stored version with our registered text (after normalising line endings, trailing
  spaces and Unicode form), checks Unicode-ness and a DLT id (`-345` MG5). On the correction, closure and certificate paths only a
  PROVEN fault (a malformed template id, or the send key's own refusal) ends a row; a content mismatch is alarmed and the text is SENT
  (`-345` MG5, *"every other reason and every transient is alarmed and the text is SENT"*).
- The alarm reaches the logs only; no alert is wired to a named person yet (roster Row 32 (h)).
- Delivery reports are not yet consumed. Story 6.37b plans them (Decision `2026-10-17-347`); until the "reached" question is ruled, a report is read
  only by the correlator (to record it), by alarms and by a daily login-code count — never as an input to reach, to a closure or to a
  send.
- ⚠ INFERENCE (not documented as a guarantee): a text whose words differ from the DLT registration is blocked by the operator and
  reported as failed — MSG91 lists DLT failure reasons such as *"Template not matched on DLT"* and *"DLT Scrubbing Failed"*.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-322:' .decision-log.md
grep -n 'would have changed WHO is texted or WHEN on the correction, closure and certificate paths' .decision-log.md
grep -n 'ONE question is recorded as the Panel' .decision-log.md
grep -n 'LOSES that closure notice for good' .decision-log.md
grep -n 'The open Panel question (a PROVEN content mismatch' .decision-log.md
grep -n 'A question for the Panel rides on leg (i)' docs/launch-gate-inventory/inventory-roster.md
grep -n "MG5's content / DLT-id" _bmad-output/implementation-artifacts/deferred-work.md
grep -n 'every other reason and every transient is alarmed and the text is' .decision-log.md
grep -n 'settled by the docs' .decision-log.md
grep -n '^### Decision .*-347:' .decision-log.md
grep -rn 'sms_send_deliveries' packages/domain/src apps/jobs/src apps/api/src
```

The last command is expected to return NOTHING today (delivery reports are not yet built) — that empty result is the finding it
checks.

Run 2026-10-17 before handing the note to BigDev: commands 1–10 each returned at least one line; command 11 returned nothing, as
expected.
