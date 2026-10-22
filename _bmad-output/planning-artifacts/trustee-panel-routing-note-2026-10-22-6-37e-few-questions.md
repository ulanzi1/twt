# Trustee Panel routing note — "a few questions" in the text to the five neighbours

> **§0 gate — passed (2026-10-22).** You ratified the words of the text to the five neighbours twice: *"a few short questions"* on
> 2026-10-10 (`2026-10-10-304` Q6 A) and again today, as put, with the new ending *"…[link], or call us."* (`2026-10-22-379` Q2 A).
> BigDev has since dropped one word, **"short"**, from that text. Changing words you ratified is yours, so we ask. From
> `2026-10-22-380` decision 10 (BigDev: *"you know what route to panel, prepare routing note"*).
> ⭐ **Nothing waits for your answer except registering this one text** with the SMS operators (go-live record Row 27). The build and
> the other seven texts go ahead.
> ⚠ **WRITTEN 2026-10-22 — ⛔ sent.** ⛔ Shown to the Panel until BigDev sends it.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. ⭐ Everything below is then kept **unedited** as the question **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The question

**In one sentence:** may the text to the neighbours say *"please answer a few questions"* instead of the ratified *"please answer a few
short questions"*?

**Why it cannot be decided without you:** the words of this text are yours; you chose *"a few short questions"* yourselves.

## The one fact that decides it

⭐ Only the one word changes. The text, with BigDev's change:

> *"We have been told that [member] has died. If you knew them, please answer a few questions: [link], or call us."*

The Hindi text drops the same word (*"छोटे"*): *"…तो कृपया कुछ प्रश्नों के उत्तर दें: [link], या हमें कॉल करें।"* (the Hindi is still
to be checked by the Hindi reviewers, as before).

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **"a few questions"** — BigDev's words. | The neighbour is told there are a few questions, without a promise that they are short. | The WhatsApp reminder two days later, and the screen in the app, still say *"a few short questions"* — the same neighbour may see both wordings. |
| **B** | **"a few short questions"** — keep what you ratified. | ⛔ change from your ruling. | BigDev's change is undone — one word in the English and the Hindi text. |

**Our reading:** A — **because** it is BigDev's choice for the Trust's own text, and the text still says plainly what is asked and how
to answer. ⚠ We have no evidence either way on whether the word "short" makes a neighbour more likely to answer.

---

# What is at stake right now

- **Live today:** nothing — no text has been registered with the SMS operators, and the app is not in use yet.
- **Blocked:** only registering the neighbours' text (go-live record Row 27). Everything else goes ahead.
- **If nothing is decided:** the neighbours' text cannot be registered, so it cannot go live.

---

# How much to trust this note

- **Earlier versions of this question:** none. Your answer today (`-379`) ruled the text with *"a few short questions"*. BigDev dropped
  the word afterwards, while the work was being planned.
- **Corrected in this note:** we first planned to only TELL you the new words before registering them. BigDev asked us to put the
  question to you instead.
- **Still uncertain:** BigDev said *"Panel has already authorized me to make small changes"*. We found no such permission in the
  decision record, so we do not rely on it.

### For your information (⛔ a question) — how long the texts are

Each SMS part holds 153 letters in English, and 67 in Hindi (or any text with a special character). With the new name boxes, a usual
name and today's link, the neighbours' text is **about 170 letters, 2 parts, in English** and **about 194, 3 parts, in Hindi**. With a
60-letter name it is about 211 (2 parts) in English and about 235 (4 parts) in Hindi; at the longest link we allow, the Hindi reaches 5
parts. The other texts are 1 part in English and 2–3 in Hindi. When you first ruled the neighbours' text we told you only that the
Hindi was *"likely three"* parts; the English was then 3–5 parts because of its dash, and the comma you chose today brings it down to 2.

---

# In plain English

The neighbours' text used to ask them to answer "a few short questions". BigDev has taken out the word "short", so it asks them to
answer "a few questions". Because you chose the old words, we are asking whether this is all right. We suggest yes. If you prefer
"short", we put the word back before the text is registered.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-10-304` Q6 A: *"The text says "a few short questions" (amends `-303` Q1 A's "two")"*.
>
> `2026-10-22-379` Q2 A: the neighbours' text (templates 13–14): *"We have been told that [member] has died. If you knew them, please
> answer a few short questions: [link], or call us."* — *"the dash a comma"*.
>
> `2026-10-17-349` decision 2 (author-commit): *"the English of templates 7–14 (the Panel's words): the change goes back to the Trustee
> Panel, through a routing note, BEFORE that template's id is set; nothing is sent with words the Panel has not seen"*.

## E2 — What is NOT ratified

- A delegation to BigDev or staff to change the words of templates 7–14. `2026-09-08-210` cl.2 delegates only enum additions *"that
  change ⛔ no member-facing behaviour"*; `2026-10-17-349` decision 4 names the possible delegation (*"whether staff may register the
  nearest wording DLT accepts for templates 7–14, with the same meaning"*) and leaves it un-routed.
- The Hindi of template 13 — the author's; the Rows 23 / 28 reviewers.
- The WhatsApp reminder's words (`2026-10-19-365`) and the app screen's words (`peer_request.title` / `peer_request.card_body`) — ⛔
  changed; both keep *"a few short questions"* (`2026-10-22-380` decision 8).

## E3 — What the code actually does

- Story 6.37e (row `6-37e-suspicion-text-short-name-fallback`) builds template 14 (en) as *"…please answer a few questions: {#var#},
  or call us."* and 13 (hi) as *"…तो कृपया कुछ प्रश्नों के उत्तर दें: {#var#}, या हमें कॉल करें।"* (`packages/i18n/locales/{en,hi}/claim.json`
  `peer_mesh_sms.request`; `docs/launch-gate-inventory/dlt-template-requests-6-19.md` rows 13 / 14).
- No template id is provisioned (roster Row 32 (i)); ⛔ text can be sent until Row 27 closes.
- The lengths above were computed with the sheet's own method (a 19-letter name, a 55-character link; GSM-7 153 per part, Unicode 67).
  Story 6.37e records the dev's re-computation.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-304:\|^### Decision .*-379:\|^### Decision .*-349:\|^### Decision .*-210:\|^### Decision .*-380:' .decision-log.md
grep -n '"peer_mesh_sms.request"\|"peer_mesh_wa.reminder"' packages/i18n/locales/en/claim.json packages/i18n/locales/hi/claim.json
grep -n '^| 1[34] |' docs/launch-gate-inventory/dlt-template-requests-6-19.md
```
