# Trustee Panel routing note — your three answers on the nominee: did we record and build what you meant?

> **§0 gate — passed (2026-09-27).** This is the Panel's: every item is about **what a family, a nominee or a living member is owed** —
> who may correct a nominee, what happens to a claim when the nominee was changed after a death, and whether a living person can get
> their right back. ⭐ It is a **check of rulings you have already given**, ⛔ not a fresh question: you answered on 2026-09-21, and we
> built from those answers. We ask you to read what we recorded, and **confirm it — or tell us where we got it wrong.** Two items at the
> end (N1, N2) were ⛔ never put to you and are new.

> ## ✅ N1 RULED — 2026-09-27 — recorded as `2026-09-27-257` · ⏳ C1–C3, D1–D4, N2 STILL AWAITING
>
> **N1 — ruled by Dhiraj Rahul + Kalpana Bharti, relayed by BigDev — verbatim:** *"add these to N1 brother-in-law, son-in-law,
> mother-in-law, father-in-law or grandparent"* — our suggestion taken: the nominee list becomes **twenty** values, **superseding `-237`
> cl.1** (⛔ `-237` unedited; cl.2, `other` forecloses correction, stands). ⭐ It now matches the claimant-to-nominee list (`-255` F8) plus
> `other`.
>
> ⏳ **Everything else below is still awaiting the Panel** — the block that follows is the original, and applies to C1–C3, D1–D4 and N2.
>
> ### ⏳ AWAITING PANEL RULING (C1–C3, D1–D4, N2)
>
> ⛔ **Nothing is recorded here yet.** When the Panel answers, transcribe it into this block **and** into `.decision-log.md` — as
> **"confirmed as recorded"** where you confirm, and as a **new decision that supersedes** `-237` / `-238` / `-239` wherever you change
> anything (⛔ never an edit of them). Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** On 2026-09-21 you answered three questions about the nominee; we have built the software from your answers, and we
ask you to **check that what we recorded and built is what you meant.**

**Why we ask again:** we found that the three questions we sent you were never marked as answered, so we went back over the answers
themselves. Most match exactly. In **four** places the software does something you may not have intended (D1–D4 below), and **two**
questions were never asked at all (N1–N2). Everything is still easy to change: **nothing is in use by any member yet.**

## The one fact that decides it

**Where you said the *system* should do something, we sometimes built it so a *person* does it instead.** You said a nominee changed
after the death *"should raise the suspicion"* and that the Pariwar Admin should be *"notified."* We built the software to **show** the
dates and let the District Admin judge, with ⛔ no automatic warning, and to give the Pariwar Admin a **list to look at**, ⛔ not a message.
And the way you gave a living member their right back **waits** on a part (the fraud register) that is not built yet.

---

# Part 1 — Please confirm (we believe these match what you said)

| # | What you said (in short) | What we built | Please |
|---|---|---|---|
| **C1** | The relationship is one of **15**: spouse, mother, father, son, daughter, brother, sister, uncle, aunt, cousin, niece/nephew, grandchild, sister-in-law, daughter-in-law, other. **If "other" is chosen, no correction is allowed.** | Exactly that list. A nominee recorded as "other" **cannot** be corrected. ⭐ **We went one step further:** a correction also ⛔ cannot *change* a nominee's relationship **to** "other". | Confirm, or tell us the extra step is wrong. |
| **C2** | A correction is started by the **helpline operator** for the family, or by the **family in the app** — **never the District Admin alone.** A **written note** at **each** approval. | Both ways exist. The person who starts a correction ⛔ can never approve it. The District Admin and the Pariwar Admin must be **two different people**, and each **must** write a note. | Confirm. |
| **C3** | A nominee change dated **on or after** the death is enough for suspicion; the **District Admin** (⛔ not the system) refuses the claim; the refusal can be **appealed once**; the member's true nominee **starts again** with a **fresh original death certificate**, and the **ground inspection carries over**. | Exactly that. ⭐ **Our reading of what you did not mention:** ⛔ **nothing else** carries over to the new claim — the consents, the checks with neighbouring members, the uploaded documents and the bank details must all be given again. | Confirm, or tell us what else should carry over. |

---

# Part 2 — Where the software may differ from what you meant

| # | What you said | What we built | The choice |
|---|---|---|---|
| **D1** | *"'dated on or after the day of death' by itself enough to treat it as deliberate. **That should raise the suspicion.**"* | The District Admin sees **every** version of the nominee with **its dates**, beside the date on the death certificate. The system ⛔ does **not** mark any version as suspicious and ⛔ does not sort or highlight it. The District Admin must notice it. | **A — keep it:** the District Admin judges from the dates. *Cost:* a busy District Admin could miss it. **B — show a warning** on any version dated on or after the death; the system still refuses nothing. *Cost:* a warning can be over-trusted, and a wrong certificate date would warn on the wrong version. |
| **D2** | *"… also **notify Pariwar Admin** that claim has been refused, presenting District admin note and reason."* | The Pariwar Admin has a **list**, *"Claims refused on suspicion of a nominee change"*, showing the note and the reason. ⛔ **No message is sent**: they see it only when they open the list. | **A — the list is enough.** *Cost:* a Pariwar Admin who never opens it never learns of it. **B — send them a message.** *Cost:* the software has ⛔ no way to message staff today; it has to be built first (a separate piece of work). |
| **D3** | *"Option B is acceptable"* — a living member wrongly locked gets their right back; *"if member is innocent then member's declaration unlock immediately."* | The unlocking is built, but ⛔ **nothing can switch it on yet**: the finding "the member is innocent" is the result of the **fraud investigation**, and that part is ⛔ not built — it is waiting on legal advice about the data it would hold. **Until then, a living member locked by a wrong claim stays locked.** | **A — wait** for the fraud register. *Cost:* the lock can last months, against your ruling that a member may change their nominee *"as long as member is alive."* **B — let staff record "this member is alive" now**, separately from the fraud investigation (for example: the District Admin records it, the Pariwar Admin approves). *Cost:* a new staff step, and it must be impossible to use it to unlock a nominee after a **real** death. |
| **D4** | *"Member's true nominee has to start over."* | If the person who made the change **appeals**, the refused claim is still open. A new claim by the true nominee is then **merged into the refused one** unless a staff member deliberately keeps them apart (a step that exists today). | **A — keep it:** staff keep them apart when needed. *Cost:* the true nominee's claim waits behind an appeal unless someone acts. **B — always keep a new claim separate** when the open claim was refused on suspicion. *Cost:* two live claims for one death, which staff must watch. |

---

# Part 3 — Two questions we never asked you

| # | The question | Our suggestion |
|---|---|---|
| **N1** | **In-laws and grandparents.** Your list has **sister-in-law** and **daughter-in-law**, but ⛔ no **brother-in-law, son-in-law, mother-in-law or father-in-law**, and it has **grandchild** but ⛔ no **grandparent**. A member who names one of these must choose **"other"** — and then **no correction is ever possible** for that nominee. ⚠ This also matters for your new answer on Story 6.19 (the claimant's relationship to the nominee, from *family relations only*): it would use the same list. | **Add the five missing relations** (brother-in-law, son-in-law, mother-in-law, father-in-law, grandparent). *Cost:* none now — ⛔ no member has declared a nominee yet, so nothing needs converting. **Later it costs more:** once real data exists, a stored "other" can never be turned into the right relation. |
| **N2** | **Does "other" block anything besides a correction?** You said "other" means *no correction*. Does it also block **the living member's unlocking** (D3), or **an appeal**? | **No — only the correction.** "Other" says we cannot check a relationship; the unlocking and the appeal do not depend on the relationship at all. |

**Our reading:** confirm **C1–C3**; **D1 A**, **D2 A**, **D3 B**, **D4 A**; **N1 add the five**; **N2 only the correction.** **Because** D3 is
the only one where what is built today does not give a person what you ruled they are owed — a living member locked for months. D1, D2
and D4 each rely on a person acting, which is how the rest of the system works. ⚠ **Each item stands alone:** you may reject any of our
readings and keep the rest.

---

# What is at stake right now

- **Live today:** **Nothing.** The software is not in use by any member.
- **Blocked:** **Nothing** — everything above is built as recorded. A change you make becomes a follow-up piece of work; **N1 is cheapest
  now.**
- **If nothing is decided:** your 2026-09-21 answers stand **as recorded and as built**, including the four behaviours in Part 2, and the
  new questions stay open: a member naming an in-law must choose "other".

---

# How much to trust this note

- **Earlier versions of this question:** three notes, sent on 2026-09-20 (*confirm-our-defaults*, *living-member-locked*,
  *what-denied-means*). You answered on 2026-09-21; we recorded the answers as `-237`, `-238` and `-239` and built Story 6.20 from them.
  ⚠ **We did ⛔ not write your answers back into those three notes** — each still reads *"awaiting ruling"*. We found this on 2026-09-27.
  They will be completed from this note's answer.
- **Corrected in this note:** none yet.
- **Still uncertain:**
  - Whether you meant *"raise the suspicion"* (D1) as something **the system** does or something **the District Admin** does — the
    wording allows both, and we chose the second.
  - How long the fraud register (D3) will take; it waits on legal advice we do not control.
  - Whether a claim can reach the appeal stage in D4 before the true nominee files; we have not seen it happen, because nothing is live.

---

# In plain English

On 21 September you answered three questions about nominees, and we built the software from your answers. We now ask you to check it.

Three things match what you said: the list of 15 relationships and "other" meaning no correction; a correction started by the helpline or
the family, approved by two different people with a note each; and a claim refused when the nominee was changed after the death, with the
true nominee starting again with a fresh certificate.

Four things may not be what you meant. The system does **not** warn the District Admin about a change after the death; they must spot it
from the dates. The Pariwar Admin gets a **list**, not a message. A living member wrongly locked **cannot yet be unlocked**, because the
fraud investigation it depends on is not built. And if the wrongdoer appeals, the true nominee's new claim is **merged** into the refused
one unless staff separate them. We suggest changing only the third, so a living person is not left locked for months.

Two things were never asked: your relationship list has no brother-in-law, son-in-law, mother-in-law, father-in-law or grandparent, and
those people fall under "other" and can never be corrected. We suggest adding them now, while it costs nothing. And we suggest "other"
blocks only corrections, nothing else. If this paragraph and the evidence below ever disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-21-237`, Trustee-ratified (verbatim, as relayed — in two parts):**
> *"1. The relationship is spouse,mother,father,son,daughter,brother,uncle,cousin,other. Other can be family relation or anyone like friend. The only thing is if "other" is selected, we cannot really establish relationship and therefore no correction will be allowed."*
> *"2. Your default is accepted. The **helpline operator** on the family's behalf, or the **family through the app.** **Never the District Admin alone.**"*
> *"3. Your default is accepted. **Yes** — a written note at **each** of the two approvals."*
> *"Include - sister, aunt, sister-in-law, daughter-in-law, grandchild, niece/nephew"*

**`2026-09-21-238`, Trustee-ratified (verbatim, as relayed), in part:**
> *"Option B is acceptable. However there could be cases of fraud by producing fake certificate and all. Therefore, if proven guilty membership will be terminated and the person will be blacklisted/banned."*
> *"… Investigation can result in 2 things, member is inncoent or guilty. If member is innocent then member's declaration unlock immediately. …"*

**`2026-09-21-239`, Trustee-ratified (verbatim, as relayed):**
> *"(a) Yes 'dated on or after the day of death' by itself enough to treat it as deliberate. That should raise the suspicion. System shouldn't refuse the claim, district admin will act upon suspicion and refuse, also notify Pariwar admin that claim has been refused, presenting District admin note and reason"*
> *"(b) Member's true nominee has to start over and produce original death certificate. However ground inspection can be inherited. Innocent nominee pays nothing."*
> *"(c) Yes refusal appealable once."*

**`2026-09-20-234` X, Trustee-ratified:**
> *"Yes all of them can be changed as long as member is alive."*

## E2 — What is NOT ratified

- **C1's extra step** — that a correction may ⛔ not *propose* `other`: an engineering reading of `-237` cl.2's rationale (BigDev,
  2026-09-24), recorded in 6.20's review, ⛔ never put to the Panel.
- **C3's "nothing else carries over"** — `-239`'s own *"does NOT cover"* list: the Panel named only the certificate and the ground
  inspection; consents, peer-mesh pings, documents and bank details are 6.20 D14's reading.
- **D1** — whether *"raise the suspicion"* is a system act. 6.20 read it as the District Admin's (invariant 1: the console decides and
  compares nothing).
- **D2** — the form of the notification. 6.20 read it as a read surface (`-239` consequence 3: *"a notification, ⛔ not an approval step"*).
- **D3** — who may record the innocence finding outside the fraud register. `-238` places it in the investigation; `-241` §6 ties the
  release's only caller to row `6-22`.
- **D4** — the refile-during-appeal convergence (6.20 T17): recorded as today's behaviour, ⛔ never ruled.
- **N1** — the in-law/grandparent asymmetry, `-237`'s own *"does NOT cover"* list; ⛔ never routed.
- **N2** — whether `other` forecloses any remedy but the correction, `-237`'s own *"does NOT cover"* list; ⛔ never routed.

## E3 — What the code actually does

- **C1.** `NomineeRelationship` is the 15-value enum (`packages/contracts/src/nominee/declaration.ts`, `NOMINEE_RELATIONSHIP_CODES`); the
  file's own note marks the in-law/grandparent gap *"Still OPEN, recorded in `-237`"*. `nominee-correction-persist.ts` refuses a
  correction whose target is `other`, and one whose **proposed** relationship is `other` (its header: *"an ENGINEERING READING of cl.2"*).
- **C2.** Two raise routes: `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-corrections` (the helpline) and
  `POST /api/v1/member/claims/:claimCaseId/nominee-corrections` (the app). `NomineeCorrectionDecisionRequest.note` is
  `z.string().trim().min(1).max(2000)` — required at both steps. The raiser cannot approve their own raise; the two approvers must differ
  (also a DB CHECK) — `nominee-correction-persist.ts` header.
- **C3.** The refusal is the shipped verifier denial with reason code `post_death_nominee_change`
  (`packages/contracts/src/claims/verification-decision.ts`), appealable once through 6.16. `getInheritedGroundInspectionSource`
  (`packages/domain/src/claim/nominee-refusal-read.ts`) carries over ⛔ only the ground inspection.
- **D1.** `apps/admin/src/modules/claim-verification/NomineeDeclarationPanel.tsx` header: *"⛔ No version is highlighted, labelled 'after
  death', sorted by suspicion or pre-marked from the date"*; `i18n-en.ts`: *"No string here says a version 'changed after the death',
  'is suspicious' …"*.
- **D2.** `nominee-refusal-read.ts` header: `listNomineeRefusals` is *"the Pariwar Admin's READ SURFACE. A NOTIFICATION, ⛔ not an approval
  step … ⛔ No staff-notification primitive exists and ⛔ none is invented here."* Staff copy: *"Claims refused on suspicion of a nominee
  change"*.
- **D3.** `packages/domain/src/claim/nominee-lock.ts`: `recordMemberInnocenceFinding` writes the `member_found_innocent` finding and the
  `claim.nominee_lock_released` event — header: *"⛔ NO PRODUCTION CALLER UNTIL ROW `6-22` LANDS (`2026-09-21-241` §6) … a living member
  locked by a stray claim STAYS locked — a named go-live residual"*. ⚠ Verified by grep: ⛔ no caller in `apps/api/src`. Row
  `6-22-fraud-register-blacklist-instrument-and-identifier-set` is `backlog`, COUNSEL-GATED.
- **D4.** `nominee-refusal-read.ts` header, T17: *"a refile during the refuser's APPEAL converges onto the refused claim
  (`getConvergenceCandidate` excludes only `settled` / `denied`) … the remedy is the shipped authorized convergence OVERRIDE"*.
- **N1.** ⛔ No member declaration exists (not in production), and `member_nominees.relationship` is plain `text` (the value set lives in
  the contracts enum, ⛔ not the DB) — `-237`'s own verification. ⇒ adding values needs ⛔ no migration and ⛔ no backfill.

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, ⛔ not a pass. Results as run 2026-09-27 on `main` at `0db23804`:

```
# E4.1 the rulings, verbatim
grep -c "if \"other\" is selected, we cannot really establish relationship" .decision-log.md                       # -> 1
grep -c "Include - sister, aunt, sister-in-law, daughter-in-law, grandchild, niece/nephew" .decision-log.md          # -> 1
grep -c "If member is innocent then member's declaration unlock immediately" .decision-log.md                       # -> 1
grep -c "That should raise the suspicion" .decision-log.md                                                          # -> 1
grep -c "also notify Pariwar admin that claim has been refused" .decision-log.md                                    # -> 1

# E4.2 C1 — the 15 values, and the in-law/grandparent gap marked open
sed -n '/NOMINEE_RELATIONSHIP_CODES = \[/,/\]/p' packages/contracts/src/nominee/declaration.ts | grep -c "^  '"      # -> 15
grep -n "Still OPEN, recorded in \`-237\`" packages/contracts/src/nominee/declaration.ts                             # -> line 44

# E4.3 C2 — two raise routes; a required note at each approval
grep -n "nominee-corrections'" apps/api/src/modules/claims/claims.routes.ts apps/api/src/modules/claims/claims.nominee-declaration.routes.ts
#   -> claims.routes.ts:182 (the app's POST); nominee-declaration.routes.ts:164 (the helpline's POST; :139 is the GET list)
grep -n "note: z.string().trim().min(1).max(2000)" packages/contracts/src/claims/nominee-declaration.ts             # -> line 237 (the decision; 185 is the determination)

# E4.4 C3 — the refusal reason code
grep -n "post_death_nominee_change" packages/contracts/src/claims/verification-decision.ts                          # -> lines 42, 63

# E4.5 D1 — the console marks nothing
grep -n "No version is highlighted" apps/admin/src/modules/claim-verification/NomineeDeclarationPanel.tsx         # -> line 13

# E4.6 D2 — a read surface, no staff message
grep -n "No staff-notification primitive exists" packages/domain/src/claim/nominee-refusal-read.ts                 # -> line 13

# E4.7 D3 — the release has no production caller
grep -n "NO PRODUCTION CALLER UNTIL ROW" packages/domain/src/claim/nominee-lock.ts                                 # -> line 18
git grep -n "recordMemberInnocenceFinding" -- apps/api/src                                                          # -> EMPTY (the finding)
grep -n "6-22-fraud-register" _bmad-output/implementation-artifacts/sprint-status.yaml | grep -v "#"                # -> backlog

# E4.8 D4 — refile during appeal converges
grep -n "a refile during the refuser's APPEAL converges" packages/domain/src/claim/nominee-refusal-read.ts        # -> line 20
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md`: "confirmed as recorded" for each confirmed item; a NEW decision that
   SUPERSEDES `-237` / `-238` / `-239` for each change — ⛔ never an edit of them.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the answer does NOT cover.
4. ⭐ THEN complete the three 2026-09-20 notes (`6-20-confirm-our-defaults`, `6-20-living-member-locked`, `6-20-what-denied-means`): fill
   each ⏳ block with `-237` / `-238` / `-239` (and this note's answer), and leave the rest of each note unedited.
5. Discharge wherever carried — the 6.20 story's open items and `-237`'s "does NOT cover" list — mark DISCHARGED, never delete.
6. Any change (D1 B, D2 B, D3 B, D4 B, N1) needs a ROW — a discharge with no row is a decision nobody schedules. -->
