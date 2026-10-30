# Hindi review — Story 6.33: the word used when a member's name cannot be read

> **For BigDev to review.** Written 2026-10-30 for Story 6.33 QE4 (decision [`-421`](../../.decision-log.md#decision-2026-10-30-421)), which
> fixes 6.32 deferred item **D11**. Needed before Task 4.3. ⛔ In the code yet — your answer is written into the story, then the copy key is
> added with its test.

## When this word appears

Almost never. The questions put to the neighbours and to the family use the dead member's name (*"Has Ramesh Kumar died?"*). In three rare
cases the name cannot be read — the member has ⛔ recorded name, the encrypted name fails to open, or the member's data has been erased on
request. Today the sentence then reads with a hole: *"Did you collect a letter from the head of the school or office where  worked?"*
(seen on the 2026-10-29 test run). This word fills the hole.

## The words proposed

| | English | Hindi (proposed) |
|---|---|---|
| The fallback word | **the member** | **सदस्य** |

**Why सदस्य, and ⛔ "इस सदस्य" / "यह सदस्य":** the word drops into four different Hindi sentences, in different grammatical positions. सदस्य
keeps the same form in all of them; "this member" would need "इस" in some sentences and "यह" in others, and one word cannot be both.

## How each sentence would read

| Sentence (key) | With a name | With the fallback (en) | With the fallback (hi) — ⭐ please check |
|---|---|---|---|
| `peer_request_questions.has_died.question` | Has Ramesh Kumar died? | Has the member died? | क्या सदस्य का निधन हो गया है? |
| `peer_request_questions.relationship.question` | How do you know Ramesh Kumar? | How do you know the member? | आप सदस्य को कैसे जानते हैं? |
| `inspector_questions.head_letter.question` | …the school or office where Ramesh Kumar worked? | …the school or office where the member worked? | क्या आपने उस स्कूल या कार्यालय के प्रमुख से पत्र लिया जहाँ सदस्य काम करते थे? |
| `inspector_questions.death_cause.question` | How did Ramesh Kumar die? | How did the member die? | सदस्य का निधन कैसे हुआ? |
| `peer_request.list_item` | About Ramesh Kumar | About the member | सदस्य के बारे में |
| `peer_mesh_wa.reminder` | We have been told that Ramesh Kumar has died… | We have been told that the member has died… | हमें बताया गया है कि सदस्य का निधन हो गया है… |

⚠ The last two rows use the same name slot today. The WhatsApp reminder job stops before sending when the name cannot be read (a name
fault means the reminder is ⛔ begun — `claim-peer-mesh-wa-reminders.ts`), so the fallback should ⛔ reach it in practice; it is listed so
you see every place the word could land. A question staff add later through the
editor that uses the name gets the same word.

## Your answer

- [ ] **सदस्य** as proposed
- [ ] A different word: ……………… (it must read correctly in every row above)

**BigDev's answer (verbatim):** ……………………

**Once answered:** the word is recorded in the story (Task 0.2 / QE4), then added as one copy key in `packages/i18n/locales/{en,hi}/claim.json`
(Task 4.3) with a test that runs the real translation function. Its Hindi is then marked human-reviewed — ⛔ "agent-authored", like the
surrounding claim words still awaiting review.
