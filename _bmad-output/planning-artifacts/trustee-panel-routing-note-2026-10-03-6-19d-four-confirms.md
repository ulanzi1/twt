# Trustee Panel routing note — reminding a family about their death certificate: four cases your answer did not reach

> **§0 gate — passed (2026-10-03).** Every item here is the Panel's. Each decides **whether the Trust writes to a family by post** (Q1) or
> **for how long a family is reminded** (Q2–Q4) — the ground on which you took the certificate reminder itself (`2026-09-27-259`). Each is
> a reading in our own story (6.19d, its Q1–Q4) and we are building it now, choosing the reading that **sends nothing more** (our house
> rule while a confirm is open, `2026-10-01-273`), so ⛔ nothing waits on this note. ⚠ **Deliberately ⛔ not asked**, because these are ours
> (staff work or system design, ⛔ not what a family is owed): how the District Admin is chased for the letter; how the system stores the
> reminders; that the reminders go to the people the family agreed at filing may be contacted (your own words, `-259` detail 2).
> ⚠ **And ⛔ not yours:** whether the person filing may agree for others, and the privacy policy's wording — both with counsel.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new decision
> id. ⭐ Everything below is then kept **unedited** as the question **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The question

**In one sentence:** When a family's death certificate cannot be accepted, you ruled that we remind them for 180 days, write **one** letter
if their phone is dead, and start a **new** 180 days if a second certificate is also rejected. Four cases fall between those words: does a
second rejected certificate also bring a second **letter** (Q1)? If the claim was refused and comes back on appeal after the 180 days have
run out, do the reminders start again (Q2)? If a family was being reminded because they **never sent** a certificate, and then the one they
send is rejected, does a fresh 180 days start (Q3)? And if the **same** certificate is rejected, then accepted, then rejected again on a
second look, does a fresh 180 days start (Q4)?

**Why they cannot be decided without you:** each one decides how many letters the Trust posts to a family, or how long a family is
reminded. Your answer of 2026-09-27 fixed the plan for the ordinary case; it did not say what happens in these four.

## The one fact that decides them

⭐ **Every case is about when the 180 days begin, and whether a letter comes with them.** You tied the 180 days to **a certificate we could
not accept** — and a second rejected certificate restarts them. So each question really asks: *is this a new certificate we could not
accept?*
- In **Q1** it is (a second certificate was sent and rejected) — the question is only whether the letter restarts with the days.
- In **Q3** it is the first certificate the family ever sent — but they had already been reminded for not sending one.
- In **Q2** and **Q4** it is ⛔ not: nothing new was sent. In Q2 the claim was away being decided on appeal; in Q4 the District Admin
  changed their mind about the same certificate.

---

# What you are choosing between

## Q1 — A second rejected certificate: a second letter?

| | Option | What changes for a family | Cost |
|---|---|---|---|
| **A** | **One letter per claim, ever** *(what we build meanwhile)* | A family whose phone is dead gets one letter, the first time. If their next certificate is also rejected, they get new reminders by text — which cannot reach a dead phone — and ⛔ no second letter. | ⚠ A family with a dead phone may ⛔ never learn in writing that their **second** certificate was also rejected. They learn it only from the app, or if the District Admin or helpline calls. |
| **B** | **One letter for each certificate we could not accept** | The letter comes with each new 180 days: a second rejected certificate brings a second letter. | ⚠ More post for the District Admin, and a second letter to an address that may already have failed once. |

**Our reading: B** — **because** a dead phone means the letter is the family's **only** written notice, and a second rejection is new
news they cannot learn any other way without opening the app. **We build A meanwhile**, because it sends nothing more until you say so.

## Q2 — A refused claim that comes back on appeal after its 180 days have run out

| | Option | What changes for a family | Cost |
|---|---|---|---|
| **A** | **⛔ No more reminders** *(what we build meanwhile)* | The 180 days kept counting while the claim was refused; if they have run out, the family is ⛔ not reminded again. The claim still waits — ⛔ never refused for the certificate. | ⚠ A family whose claim is revived on appeal, and who still has no accepted certificate, hears nothing from the system about it. |
| **B** | **A fresh 180 days when the claim comes back** | Reminders start again on the day the claim returns to checking. | ⚠ A family could be reminded for much longer than 180 days in all, for the same certificate. |

**Our reading: A** — **because** the family sent nothing new, and an appeal is itself a contact with the family (it is decided with them, and
the app shows the claim open again). ⚠ We are ⛔ not certain an appeal always reaches the family in practice — weigh that.

## Q3 — A family reminded for never sending a certificate, whose first certificate is then rejected

| | Option | What changes for a family | Cost |
|---|---|---|---|
| **A** | **A fresh 180 days from the rejection** *(what we build meanwhile)* | The reminders about the missing certificate stop when it arrives; if it is then rejected, a new 180 days of reminders begins. | ⚠ A family could be reminded for up to about a year in all (180 days for "please send it", then 180 days for "please send a clearer one"). |
| **B** | **One 180 days from the day checking began** | The reminders keep counting from the first day; the rejection does ⛔ not restart them. | ⚠ A family who sends a certificate late — say on day 170 — and has it rejected gets only a few days of reminders about the rejection. |

**Our reading: A** — **because** this is the first certificate the family ever sent, so its rejection is exactly the case your ruling was
written for — and the start day we read into it says so (*"Day 0 = the day the District Admin rejected the certificate"* — our reading in
`-259`, ⛔ not your words).

## Q4 — The same certificate rejected, then accepted, then rejected again on a second look

| | Option | What changes for a family | Cost |
|---|---|---|---|
| **A** | **Pick up the first 180 days where they were** *(what we build meanwhile)* | Reminders stop while the certificate stands accepted; if it is rejected again, they resume, still counting from the first rejection. | ⚠ If the change of mind came late, few reminders remain. |
| **B** | **A fresh 180 days from the latest rejection** | Reminders start again in full. | ⚠ More texts, for a certificate the family sent only once. |
| **C** | **⛔ No more reminders** | Once accepted, never reminded again about that certificate. | ⚠ A family told twice that their certificate cannot be used hears nothing the second time. |

**Our reading: A** — **because** nothing new was sent (so ⛔ not B), but the family is again owed a certificate (so ⛔ not C).

---

# What is at stake right now

- **Live today:** **Nothing** — none of this is built, and nothing is in production.
- **Blocked:** **nothing.** We build the reading marked *"what we build meanwhile"* in each table; each answer changes one rule.
- **If nothing is decided:** the family gets the lesser of each pair: one letter only (Q1), no restart after an appeal (Q2), and the paused
  count resuming (Q4) — and, for Q3, the fresh 180 days your ruling's wording already implies.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. The four cases were found while turning your answer (`2026-09-27-259`, `-260` G5–G6)
  into a design, on 2026-10-03, by us and by independent checks of that design.
- **Corrected in this note:** our first design gave a family **a letter for every reminder period** (Q1's B) without asking you. A check
  showed that sends more than your *"ONE posted letter"* and is your question, ⛔ not ours — so it is asked here, and A is built meanwhile.
- **Still uncertain:**
  - How often any of these cases will happen — nothing is live. Q2 and Q4 need two unusual events in a row; Q1 and Q3 are ordinary.
  - Whether an appeal always reaches the family in practice (Q2's reasoning leans on it).

---

# In plain English

When a family's death certificate does not show a clear date of death, you decided we remind them for 180 days, write one letter if their
phone does not work, and start again if their next certificate is also rejected. Four cases fall between those words.

**First:** if the second certificate is also rejected, should the family with a dead phone get a second letter? We think yes — for them
the letter is the only way the news reaches them in writing. Until you say so we post only one.

**Second:** if the claim was refused for some other reason and comes back on appeal after the 180 days have passed, we suggest no new
reminders — the family sent nothing new, and the appeal itself involves them.

**Third:** if a family was reminded because they had not sent a certificate at all, and the one they then send is rejected, we suggest a
fresh 180 days — it is the first certificate they ever sent.

**Fourth:** if the District Admin rejects a certificate, then accepts it, then rejects the same certificate again, we suggest the reminders
carry on from where they stopped, rather than starting over or stopping for good.

In every case the claim is still ⛔ never refused or closed because the certificate is late. If this paragraph and the evidence below ever
disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-09-27-259` cl.1:** *"The correction schedule for the first 90 days … then once a month — ⭐ and the reminders stop after 180
> days."*
>
> **`2026-09-27-259` detail 1:** *"ONE POSTED LETTER to the person whose phone is dead, at their own address, recorded like the correction
> letters (tracking number, delivery date). ⛔ Not the two-letter track."*
>
> **`2026-09-27-259` detail 3:** *"A NEVER-SENT CERTIFICATE IS CHASED THE SAME WAY, but only once the claim is with the District Admin for
> checking"*.
>
> **`2026-09-27-259` "Our reading — ⛔ NOT RATIFIED":** *"Day 0 = the day the District Admin rejected the certificate (for a never-sent
> one: the day the claim entered the District Admin's checking)."* · *"The reminders stop earlier the moment a new certificate is
> received."*
>
> **`2026-09-27-260` cl.5 (G5 — A):** *"A second rejected certificate starts a new 180 days from the new rejection."*
>
> **`2026-09-20-236` BB:** *"family will be asked to produce certificate with clear date without the claim being denied."*

## E2 — What is NOT ratified

- **Q1:** `-259` detail 1 says ONE letter; G5 restarts *"the 180 days"*. ⛔ Neither says whether the letter restarts with them. Our own
  precedents point both ways: `2026-10-01-272` §0 (author-commit) held that a restarted **clock** is ⛔ not a restarted **letter track**
  for a correction return; `2026-09-20-230` cl.2 (ratified) — *"second return restart the clock"* — is the analogy G5 was argued from.
- **Q2:** ⛔ no ruling says whether the 180 days pause or run on while a claim is away (refused, on appeal). We built: they run on.
- **Q3:** `-259`'s day-0 reading names both causes but ⛔ never says whether the missing-certificate count carries into a later rejection.
- **Q4:** ⛔ no ruling contemplates a certificate re-reviewed twice.
- ⛔ Nothing here moves BB, CC1's *"no time limit"*, the day-90 closure's exclusion of a certificate wait, or `-259`'s days.

## E3 — What the code actually does

- **Nothing is built.** Story `6-19d-replacement-certificate-reminder` (v2.3, `ready-for-dev`) designs it; its decisions CR2, CR5 and CR9
  carry the four readings as Q1–Q4, built as the *"meanwhile"* option above.
- **A certificate can be re-reviewed both ways (Q4 is reachable).** The District Admin's review writer lets any verdict supersede any verdict
  on the **current** certificate (`recordDeathCertificateReview`, `packages/domain/src/claim/death-certificate-review-persist.ts`, its
  supersession step) — accepted → rejected and rejected → accepted are both allowed. *Read in code, 2026-10-03.*
- **A refused claim can come back into checking (Q2 is reachable).** `reversed` (after an appeal) is one of the review-window states
  (`CLAIM_REVIEW_WINDOW_STATES`, `packages/domain/src/claim/review-window.ts`), so a rejected certificate becomes live again.
- **A claim can reach checking with ⛔ no certificate (Q3 is reachable).** Another document can move the claim forward (the upload
  handler's header says so: *"or when there is NO certificate at all"*).
- **Today ⛔ no message about a claim reaches a family by text except the correction reminders and the closure notice** (Stories 6.19b and
  6.19c). The certificate reminder is new.

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, ⛔ not a pass. Results as run 2026-10-03:

```
# E4.1 the rulings (grep the BARE number)
grep -n "^### Decision .*-259\|^### Decision .*-260\|^### Decision .*-236\|^### Decision .*-272\|^### Decision .*-273" .decision-log.md   # -> all five ids found (-236, -259, -260, -272, -273); headings that MENTION them match too (8 lines)
grep -c "ONE POSTED LETTER" .decision-log.md                                         # -> ≥ 1
grep -c "second return restart the clock" .decision-log.md                            # -> ≥ 1
grep -c "the build takes the reading that closes or sends nothing more" .decision-log.md   # -> 1

# E4.2 the reachability of Q2–Q4
grep -n "'reversed'" packages/domain/src/claim/review-window.ts                      # -> found
grep -n "re_reviewed" packages/domain/src/claim/death-certificate-review-persist.ts  # -> found
grep -n "NO certificate at all" apps/api/src/modules/claims/claims.documents.handlers.ts   # -> found

# E4.3 the story carries the four readings
grep -n "Q1\|Q2\|Q3\|Q4" _bmad-output/implementation-artifacts/6-19d-replacement-certificate-reminder.md | head   # -> found
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block here AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED.
3. Record what the ruling does NOT cover.
4. Discharge wherever carried — Story 6.19d's Q1–Q4 (its Panel-questions table, CR2, CR5, CR9, Task 9's entry) and `deferred-work.md`'s
   6.19d section — mark DISCHARGED, never delete.
5. If an answer differs from the "meanwhile" build, it is one rule in 6.19d (a UNIQUE or a planner arm) — give it a row (6.19d if unbuilt,
   else a follow-up). -->
