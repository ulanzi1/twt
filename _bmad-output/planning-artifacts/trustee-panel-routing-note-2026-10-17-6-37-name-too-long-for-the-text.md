# Trustee Panel routing note — when the member's name is too long for the text, does the family still get the text?

> **§0 gate — passed (2026-10-17).** You ratified three texts about a claim refused on suspicion, each with the member's name in it:
> the text to the nominee on record (FQ7 B), the ONE text telling the refused person they can appeal until a date (Q3 item 1 B), and
> the text when such a claim is closed (Q2 B). You also ratified which form of the name they carry (the Pariwar's chosen form). A name
> that does not fit the space the text allows now means the text is **not sent**. Whether the Trust may skip a text you promised — or
> must send it with a shorter form of the name, which changes what is said about the person — is what the Trust **owes** a family and
> what it **discloses**, so it is yours.
> ⚠ **A mixed question, split:** *how* the length is counted (by the SMS operators' rule — a question on the go-live list to put to
> them in writing, still unanswered), and how a fallback would be built, are engineering — decided by us, ⛔ asked here.
> ⭐ Routed by BigDev from Story 6.37's code review (2026-10-17): *"b"* (write the routing note).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. ⭐ Everything below is then kept **unedited** as the question **as it was put**.

---

# The question

**In one sentence:** when the dead member's name is too long to fit in one of the three suspicion texts, should the Trust send no
text, send it with a shorter form of the name, or ask helpline staff to reach the person instead?

**Why it cannot be decided without you:** you promised these texts — one of them, the appeal text, is the person's only message that
they can appeal and by when. You also chose the form of the name they carry. Skipping a promised text, or changing the name form for
one person, changes what the Trust owes and what it says. ⛔ Neither is ours to choose.

## The one fact that decides it

**The appeal text carries the last date to appeal.** If it is not sent, the refused person may never learn they had 90 days — and today
nobody else would know either: the system records an error and writes a warning to a log file that no person is yet assigned to watch.
So "no text" is not a neutral outcome for that text; it is a missed appeal deadline nobody notices.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **No text when the name does not fit** (what is built today). | When the dead member's name is long, the person you chose to tell is ⛔ texted. The error is recorded. | The appeal text's date never reaches them; nobody is alerted in practice (the warning reaches a log file only, until an alert is wired to a named person). It quietly breaks your "ONE TEXT TO THE REFUSED PERSON" for some families — we cannot yet say how many. |
| **B** | **Send it with the shorter form of the name, only when the full name does not fit** — first name and the initial of the surname (e.g. *"Ramesh S."*), the form a Pariwar can already choose. | The family gets the promised text; for that one text the name is shorter than the Pariwar's usual form. | The shorter form says *less* about the person, ⛔ more — but it overrides, for that one text, the form you ratified (the Pariwar's chosen form). A family might find *"Ramesh S."* less clear. A one-word name that is itself too long still could not be sent (rare). A small piece of work (one function and its tests). |
| **C** | **Cut the name at the limit.** | The family gets the text with the name cut short. | A cut name can look like a mistake, and in Hindi it can cut through a letter and print garbage. It changes the name in a way no Pariwar ever chose. |
| **D** | **No text; helpline staff are told to phone the person.** | A person calls the family instead of a text. | Nothing like it exists today: it needs a new staff task and someone to do it, and it is slower than a text — the appeal clock runs meanwhile. |

**Our reading:** **B** — **because** it keeps the text you promised, including the appeal date, and the only thing it changes is that
it says *less* about the dead member, never more. It reuses a name form you already allow Pariwars to choose. A cuts the one message
that tells a person they can appeal, with nobody watching; C prints a broken name; D needs a staff process that does not exist.
⚠ You may reject our reading and still use this note: every option's cost is stated, including B's.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production; none of these texts can be sent yet (their templates are not provisioned, and
  will not be until the delivery-report work, row 6-37b, is done). Every Pariwar uses the full-name form today.
- **Blocked:** nothing. Story 6.37 closes with option A as built, recorded and tested; B, C or D would be a small later change.
- **If nothing is decided:** A goes live with the texts: a refused person whose deceased member's name is long gets ⛔ appeal text, and
  no one is told.

---

# How much to trust this note

- **Earlier versions of this question:** ⛔ none was put to you. The same rule ("a name that cannot fit ⇒ no text") already exists for
  the neighbours' text (6.27); it was recorded there as our own reading and ⛔ asked. If you choose B here, we will propose the same
  fallback for the neighbours' text, as a separate question.
- **Corrected in this note:** before handing it over we corrected three sentences — one said we had already asked the SMS operators
  (we have ⛔ yet), one said two of the texts were affected (all three are), one named the wrong person in option A's row.
- **Corrected before this note:** our own first record of this (in the story, during the review) called it our call, using the wrong test
  — that the suspicion texts are not among the paths an earlier note reserved for you. Our review caught it: the test is whether the
  ratified words still hold, and they do not for a long name. That record has been corrected.
- **Still uncertain:**
  - **How many names are too long.** The limit is 40 for one name in a text. We count it strictly (each letter and each vowel sign
    separately). The SMS operators may count it more loosely — the question is on the go-live list to put to them in writing (gate
    Row 30 (d)); ⛔ answer is recorded yet. A long Hindi name can be over 40 by our count and under 40 by theirs. If their count is the loose one, fewer names are
    affected — but we cannot yet say how many either way; nothing is in production to measure.
  - **What the operators would do with an over-long name** if we sent it anyway: reject the text later, or cut it themselves. Their
    documents do not say. That is why A refuses it rather than sending it and hoping.
  - **B's clarity to a family.** We believe first name and surname initial is recognisable to a family about their own member; we have
    not tested it with anyone.

---

# In plain English

Three of the texts you approved — the "claim could not go ahead" text, the "you can appeal until this date" text, and the "claim has
been closed" text — name the member who died. A text has room for a name of about 40 letters. Some full names are longer.

Today, when a name is too long, the system does not send the text at all. For each of the three that means someone is not told
something you decided they should be told. For the appeal text it also means a person is not told they can appeal, or by when — and no one
at the Trust would notice, because the warning goes into a log nobody watches yet.

We suggest: when the full name does not fit, send the same text with the shorter name — first name and surname initial, such as
"Ramesh S." Pariwars can already choose that shorter form. It says less about the person, never more, and the family still gets the
message and the date. If you prefer, we can instead send nothing, cut the name, or have staff phone the family — each has the cost
set out above.

⭐ If this section and the evidence below ever disagree, the EVIDENCE is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-09-28-262` FQ7 (Trustee-ratified):** *"⭐⭐ **[Trustee-ratified] FQ7 — B. THE SYSTEM TEXTS THE NOMINEE ON RECORD AT THE DEATH**,
> at the mobile from that declaration: "A claim for [member] could not go ahead. Please call the helpline." ⛔ **It accuses no one.**"*

> **`2026-10-07-293` item 1 (Trustee-ratified):** *"⭐⭐ **[Trustee-ratified] Q3 item 1 — B. ONE TEXT TO THE REFUSED PERSON** — at the
> mobile they gave on the claim, or, if they filed as a nominee, the mobile on that nominee entry: "The claim for [member] could not go
> ahead. It can be appealed until [date]. Please call the helpline." — accusing no one."* — and, in the same entry: *"**`[member]`** = the
> Pariwar's mode-resolved name form (`-181`), as the other two texts."*

> **`2026-10-07-291` Q2 (Trustee-ratified):** *"⭐⭐ **[Trustee-ratified] Q2 — B. A TEXT, ONCE**, when an allowed appeal closes the true
> nominee's claim: "Your claim for [member] has been closed. Please call the helpline." — accusing no one, naming ⛔ no other person."*

> **`2026-10-12-322` C7 (author-commit — the Panel's promise carried):** *"The 6.27 confirms note behind `-310` told the Panel "if it
> refuses Hindi names, we will come back to you": a provider refusal of Devanagari or spaces in `#alphanumeric#` goes back to the Panel,
> and Row 30 (d) ⛔ closes on a refusal. … (d) also asks: … the unit the 40-character limit counts (UTF-16 / code points vs graphemes)."*

> **`2026-10-17-345` MG3 (author-commit — the rule that refuses):** *"Before the network the core checks the names, each value's length,
> and that the values substituted into the registered text equal the render — a failure is a final
> `dlt_template_not_approved:values_mismatch` / `:value_too_long` + alarm."* (Narrowed for the helpline slot only by `2026-10-17-346`
> decision 1.)

> **`2026-09-02-181` cl.1 (author-commit):** *"MODE-RESOLVED. The member-facing name form is resolved from the …"* stored per-Pariwar
> presentation mode — the form `-293` ratifies as `[member]`.

## E2 — What is NOT ratified

No ruling covers a name that does not fit the text's variable. The three texts promise a text with `[member]` in the Pariwar's
mode-resolved form; none says what happens when that form is longer than the variable allows. MG3 (`-345`, an author-commit) made such
a value a refusal for every slot; applied to these three texts it NARROWS FQ7 B, Q3 item 1 B and Q2 B at the edge — recorded by Story
6.37 code review round 2 (P2, Debug Log (o)) and routed here. The same edge for the neighbours' text (`-303` Q1 A) is an author reading
(`-311` PM3, `no_target:name_too_long`) recorded in roster Row 27 — ⛔ routed; it is ⛔ part of this question.

## E3 — What the code actually does

- The member slot of all three suspicion texts is `{ name: 'member', type: 'alphanumeric', maxLength: 40 }`
  (`apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts`, `MEMBER`; slots of `refusal_notice`, `closed_notice`, `appeal_notice`).
- `resolveMemberFacingDeceasedName` (`packages/domain/src/notifications/pool-identity.ts`, called from
  `apps/jobs/src/scheduler/claim-suspicion-notices.ts`) returns the whole stored name in `full_name` mode with ⛔ length guard; in
  `shielded_name` mode it returns the first name and the surname's initial with a period (*"Ramesh S."* — a one-word name is shown whole); the send core's MG3 check refuses a value over the slot's `maxLength`
  (counted in code points) AFTER the notice row is claimed — a final `error` `dlt_template_not_approved:value_too_long` + an alarm, ⛔
  sent (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts`, `checkedValues`). Pinned by
  `apps/jobs/tests/claim-suspicion-notices-live.test.ts` "round 2 P2".
- The alarm reaches the logs only: ⛔ `onAlarm` is wired to a person for these sweeps (roster Row 32 (h); deferred-work's 8.14 item
  *"No real alerting/paging channel is wired for `onAlarm`"*).
- Every Pariwar is `full_name` in production — `pariwar_public_name_presentation.mode` has ⛔ production writer (recorded at the
  shielded-name extension of `-181` in `.decision-log.md`). The shielded form (`shielded_name`) exists and is tested.
- The peer-mesh child checks the same 40 BEFORE claiming (`fitsDltAlphanumeric` ⇒ `no_target:name_too_long`,
  `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`).
- ⚠ INFERENCE (⛔ measured): how many real names exceed 40 code points — ⛔ production data exists.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-262:' .decision-log.md
grep -n 'FQ7 — B. THE SYSTEM TEXTS THE NOMINEE ON RECORD AT THE DEATH' .decision-log.md
grep -n 'Q3 item 1 — B. ONE TEXT TO THE REFUSED PERSON' .decision-log.md
grep -n "the Pariwar's mode-resolved name form" .decision-log.md
grep -n 'Q2 — B. A TEXT, ONCE' .decision-log.md
grep -n 'the unit the 40-character limit counts' .decision-log.md
grep -n ':value_too_long` + alarm' .decision-log.md
grep -n "name: 'member', type: 'alphanumeric', maxLength: 40" apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts
grep -n 'round 2 P2' apps/jobs/tests/claim-suspicion-notices-live.test.ts
grep -n 'name_too_long' apps/jobs/src/scheduler/claim-peer-mesh-requests.ts
grep -n 'has ⛔ no production writer' .decision-log.md
grep -n 'function resolveMemberFacingDeceasedName' packages/domain/src/notifications/pool-identity.ts
grep -n "Before the network the core checks the names, each value's length" .decision-log.md
```

⭐ Run 2026-10-17 before handing the note to BigDev: all thirteen commands returned a line (⛔ empty).
