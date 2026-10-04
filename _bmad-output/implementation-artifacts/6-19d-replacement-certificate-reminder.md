---
baseline_commit: 06b3ebdf
---

<!--
BASELINE — `06b3ebdf` on `main` (`story(6.19c): second code-review pass … Status review → done`). 6.19a, 6.19b and 6.19c are
`done` and merged; every code claim below was traced on this SHA on 2026-10-03 by three read-only passes (the 6.19b/6.19c
reminder machine; the death-certificate substrate and the closure; the 6.19b/6.19c story files, deferred work and ledger), then
re-verified by two fresh-context adversarial validators (code + design; governance) whose 46 findings v2.1 applies.
⭐ Two facts are kept apart, as they must be: "the pin is an ancestor of HEAD" (durable) and "the code claims were re-derived at
`06b3ebdf`" (perishable). Before Task 1 run `git diff --name-only 06b3ebdf..HEAD -- packages apps scripts docs` and re-read
anything it lists that this file cites.

⭐ v2.x IS A DERIVATION, ⛔ NOT AN APPEND. v1.0–v1.2 (the 82-line fenced stub: AC12 only, "Route and wait") are kept in git at
`06b3ebdf`. The Panel answered protection 3 (`-259`) and its follow-ups (`-260` G5–G6); this pass derives the ACs from them.

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / don't); `⭐` = key
fact or action; `⚠` = hazard. Doubling is volume only.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first —
every prepend rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code,
as of `06b3ebdf` — the function names are the stable handle.
LETTERS: `CR1`…`CR15` are THIS story's author decisions (⏳ PROPOSED — committed by ONE author-commit in Task 0). `D1`…`D34` are
the 6.19 shared spec's. Other stories' letters are qualified (`6.21a D8`, `6.19c AC6`). `CC1` is `-236`'s item. `Q1`…`Q4` are the
four confirms this story put to the Panel — ✅ RULED by `-275` (2026-10-03), all option A.
-->

# Story 6.19d: The Reminder for a Replacement Death Certificate — ⛔ Never a Deadline, ⛔ Never a Closure `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** When the District Admin cannot accept a family's death certificate (the date of death is
> missing, unclear or in the future) — **or** the claim reaches the District Admin's checking with ⛔ no certificate at all — the family is
> reminded by **text message** on the Panel's schedule: the correction days to day 84, then **days 120, 150 and 180**, and ⛔ nothing after
> (`-259`, `-260` G6). A person whose phone does not work gets **one posted letter**, recorded like the correction letters (`-259` detail 1).
> A **second** rejected certificate starts a **new** 180 days (`-260` G5). The claim is ⛔ **never** refused, closed or given a time limit
> for this (`-236` BB, CC1; `-244` 6.21a D16 protection 2).

> ⭐ **It is a go-live coupling of Story 6.21a** (`epics.md` §6.21a, coupling (2)) **and of the 6.19 set** (the shared spec's header,
> repeated in 6.19b's) — it discharges **on this build**, ⛔ not on any record. ⛔ Nothing is in production
> ([[project_not_in_production_merge_is_not_golive]]).
> ⭐ The shared spec `6-19-correction-return-reminders-and-closure.md` is **part of this story** — read its invariants (esp. **1, 3, 4, 10**),
> traps **T1, T5, T6, T7, T13** and decisions **D3, D6, D7, D11, D20, D30–D33** before Task 1. ⚠ Two of them do ⛔ not apply here as
> written: **T12** (the effective declaration — CR6 replaces it) and **D11**'s best-effort admin push (CR10).

> ⚠⚠ **THE THREE FACTS THIS PASS FOUND THAT THE PRIOR TEXT DID ⛔ NOT KNOW — read before anything else.**
> 1. ⚠ **6.19b's runs table cannot hold a certificate wait** — though `-266` §1 and D3 say *"6.19d adds its own kind by its own migration"*
>    and *"its own kind's days … as data"*. The code says otherwise in five places (Trap 1). ⇒ **CR1: certificate reminders get their own
>    tables** — an author-commit that **supersedes** those two sentences of `-266` §1 (itself an author-commit). ⛔ No ratified clause moves.
> 2. ⚠ **6.19b's recipient reader would text NOBODY on a certificate wait.** It sends only to the EFFECTIVE nominees
>    (`readCorrectionRecipients`, `packages/domain/src/claim/correction-chase.ts:601-654`), and an effective declaration needs a
>    determination, which needs a **current, ACCEPTED certificate** (`recordNomineeDetermination`'s 6.21a D8 guard,
>    `nominee-determination-persist.ts` header). A certificate wait is therefore **usually** `undetermined` (⚠ an accepted-then-re-rejected
>    certificate can leave a stale determination in force — the effective read is in any case the bank case's resolver, ⛔ not this one's).
>    ⇒ **CR6: the recipients are the people on the contact record** — `-259` detail 2's words (*"the same people the family agreed at filing
>    may be contacted"*) and `-253` cl.1's (*reminders go to those the agreement covers*).
> 3. ⚠ **`isDeathCertificateReplacementRequested` covers the REJECTED case only** (`death-certificate-approval.ts:223-235` — `missing`
>    returns `false`; it has ⛔ no production caller). The never-sent case (`-259` detail 3) needs its own read (CR2).

## Story

As a **family whose death certificate the District Admin could not accept — or who never sent one** — I want to be reminded by text
message on the Panel's schedule (the correction days to day 84, then days 120, 150 and 180), and by **one** posted letter if my phone does
not work, **while my claim is being checked**, so that our claim does not wait unnoticed — knowing it will ⛔ never be refused or closed
because the certificate is late.

## The rulings this story builds — verbatim keys, and what is still OUR reading

⚠ The verbatim text is in `.decision-log.md`; each row is compact and says what TYPE of record it is. A reading marked **ours** is ⛔ not
ratified.

| Decision | The record says (compact) | Type | What it fixes here |
|---|---|---|---|
| `-236` **BB** | *"family will be asked to produce certificate with clear date without the claim being denied."* | Trustee-ratified | ⛔ Never denied. |
| `-236` **CC1** | *"A time limit for the replacement certificate. Our default: **none** — the claim simply waits, chased by the reminders of Story 6.19 (a claim is never refused for a missing certificate)."* | a default, standing unless objected | ⛔ No time limit. |
| `-244` 6.21a **D16** | Protection 2: *"the `-229`…`-232` day-90 closure does NOT apply to a certificate wait."* Protection 3: the schedule and channels were unruled ⇒ routed. | author-commit | ⛔ Never the closure (AC6). |
| `-250` **#5** | The correction days: *"Daily days 1–7 …; then days 10, 14, 17, 21, 24, 28, 31, 35 …; then weekly on days 42 … 84; stop at day 90. One message a day, at 10:00 in the morning"* — day 1 = the day **after** day 0. | Trustee-ratified | ⭐ The days to 84 and the first slot the next morning (adopted by `-259` cl.1). |
| `-253` **cl.1** | Reminders go to those the filer's agreement covers. | Trustee-ratified | CR6. |
| `-255` **F6** | *"Each declared nominee"* is reminded — for the **correction** reminders (the shared spec's T12 reads it as the effective declaration). | Trustee-ratified | ⚠ ⛔ Not this story's set — CR6 / Trap 2. |
| `-259` **cl.1** | **Option B, amended**: the correction schedule (`-250` #5's days) to day 90, then once a month — ⭐ **the reminders stop after 180 days**. | Trustee-ratified | The schedule (AC2). |
| `-259` **detail 1** | **ONE posted letter** to the person whose phone is dead, at their own address, recorded like the correction letters (tracking number, delivery date). ⛔ Not the two-letter track. | Trustee-ratified | The letter (AC4). |
| `-259` **detail 2** | **Text messages** to *"the same people the family agreed at filing may be contacted"* — `-255` F7's widening **extended**. | Trustee-ratified | The channel and recipients (AC3). |
| `-259` **detail 3** | A **never-sent** certificate is chased the same way, **but only once the claim is with the District Admin for checking** — ⛔ not while the family is still filing. | Trustee-ratified | The `missing` cause (AC1). |
| `-259` *"Our reading — ⛔ NOT RATIFIED"* | Day 0 = the rejection day (a never-sent one: the day the claim entered checking); IST calendar days at 10:00; "monthly" = every 30 days ⇒ 120, 150, 180; stop the moment a new certificate is received; after day 180 the claim still waits. | **ours** (unratified) | ⭐ Days 120/150/180 are **now ratified by `-260` G6**; the rest stays **ours**, adopted as CR3–CR5. |
| `-259` *"does NOT cover"* | **Reminders to the District Admin** — *"staff reach is the author's (Story 6.19d)"*; *"What happens after day 180 beyond silence — ⛔ no prompt to anyone was ruled."* | Trustee-ratified (its limits) | CR10 is **ours**; after day 180 ⛔ nothing — **ours** too. |
| `-260` **G5** | A **second** rejected certificate starts a **new 180 days** from the new rejection. | Trustee-ratified | The restart (CR2). |
| `-260` **G6** | After day 90 the reminder goes on **days 120, 150 and 180** — ⛔ none after day 180. | Trustee-ratified | The days (CR4). |
| `-260` **G4** | The first reminder of a **correction return where the family must act** stays the next morning. | Trustee-ratified | ⚠ ⛔ Not this story's ruling — `-260` does ⛔ not move `-259` *"beyond G5–G6"*. Cited by **analogy** only; the next-morning rule here comes from `-250` #5 through `-259` cl.1. |
| `-259` **consequence 3** | F7's widening grows — PRD §4.10 / architecture §3.4 name both `-255` F7 and `-259` (✅ landed by `-265` §3); a **further DLT template** (hi + en); the family SMS stays **go-live gated on counsel** (M, S). | Trustee-ratified | AC7. |
| `-273` (confirms) | *"the build takes the reading that closes or sends nothing more"* — the house rule while a confirm is open. | author-commit | ⭐ How Q1–Q4 were built while open (all four then ruled A by `-275`). |

## ⭐ THE INVARIANTS — every AC below serves one of them

1. **The system ⛔ NEVER refuses, closes, approves or time-limits a claim for a certificate.** The sweep reminds; ⛔ no job calls any
   decision writer (shared spec invariant 1; AR-63). After day 180 the claim **still waits** — silence, ⛔ never a consequence.
2. **The certificate wait is ⛔ never the closure's ground** (shared spec invariant 10, protection 2) — and a certificate reminder ⛔ **never
   counts** toward the correction closure's "reached" — **ours**, a stricter reading inside `-252` cl.1 (as `-271` §1 is), structural by CR1.
3. **⛔ No name, ⛔ no deadline, and ⛔ never why a certificate was refused** in a family message — the non-name reference, the helpline, and
   the requirement every certificate must meet (a clear date of death, `-236` BB) only (shared spec T6, D33).
4. **⛔ Never write `delivered` for an accepted send** (shared spec invariant 3, T1). `accepted` is what is known.
5. **⛔ Never while the family is still filing** (`-259` detail 3) — only while the claim is in `CLAIM_REVIEW_WINDOW_STATES`.
6. **⛔ Nothing in 6.19b, 6.19c or 6.21a changes behaviour** — the correction chase, the closure, the review writer and the OCR job are
   read, ⛔ never edited (except the narrow, listed additions in CR14).

## 📜 Policy meaning (AI-10-1)

⭐ **This story introduces ⛔ no predicate that gates a member's access to a benefit.** Its predicates decide **who is reminded, when, and by
what** — ⛔ never whether the claim is paid, refused or closed — and its one binding rule is a **negative** that **protects** the benefit (a
certificate wait is ⛔ never refused, closed or time-limited). ⚠ It adds ⛔ no conjunct to any approval, refusal or closure predicate:
`assertDeathCertificateAcceptedForApproval`, `assertClaimApprovable`, `assertClaimContactRecorded` and the 6.19c closure ground are
untouched (AC9).

**The sentence, in the family's terms (ours, for the Panel to correct):** *"If the death certificate you sent cannot be used — or you have
not sent one by the time your claim is being checked — we will remind you by text message, and by one letter if your phone does not work,
for up to 180 days after each certificate we could not accept. Your claim is never refused or closed because the certificate is late; it
stays open for as long as it takes."*

**Checked against the Niyamavali? ⛔ NO — and why.** `docs/legal/` is absent from the public repo by design
([[project_legal_corpus_private_repo_split]]), and the Niyamavali is an agent-drafted design reference, ⛔ not ratified and ⛔ never a
blocker ([[feedback_niyamavali_rulebook_not_spec]]). The sentence was checked instead against `-236` BB and CC1, `-244` 6.21a D16, `-259`
and `-260` G5–G6 — each clause of it traces to one of them; "for up to 180 days after each certificate we could not accept" is `-259` cl.1
as amended by the Panel, with G5's restart.

## ⚖️ The Panel's questions — where each stands

| Question | Answer | Decision | Build |
|---|---|---|---|
| CC1 protection 3 — schedule, channels, letters, `missing` | ✅ RULED — option B amended; one letter; SMS extended; `missing` chased once checking starts | `-259` | ✅ AC1–AC4 |
| A second rejection | ✅ RULED — a new 180 days | `-260` G5 | ✅ CR2 |
| "Monthly" | ✅ RULED — days 120, 150, 180; ⛔ none after | `-260` G6 | ✅ CR4 |
| First reminder | ✅ follows from `-259` cl.1 adopting `-250` #5's days (day 1 = the day after day 0, 10:00); day 0 itself is `-259`'s reading (CR3) | `-259` cl.1 + `-250` #5 | ✅ CR4 |
| District Admin reminders for a certificate wait | **Ours** — `-259` *"staff reach is the author's"* (and `6-19-follow-ups-2`'s §0 lists it as ours) | CR10 | ✅ AC5 |
| ✅ **Q1** — a second **letter** after a second rejected certificate (or after a never-sent wait turns into a rejection) | ✅ **RULED A by `-275`** — ONE letter per person per CLAIM, ever. ⚠ Our reading (B, a letter with each rejected certificate) was ⛔ NOT taken. | `-275` · CR9 | ✅ AC4 |
| ✅ **Q2** — a claim reversed on appeal after its run passed day 180 gets ⛔ no more reminders (the run is ⛔ never re-dated) | ✅ **RULED A by `-275`** — ⛔ no re-dating; ⛔ no restart. | `-275` · CR5 | ✅ AC2 |
| ✅ **Q3** — a never-sent wait that turns into a **first** rejection starts its own 180 days from the rejection | ✅ **RULED A by `-275`** — its own 180 days from the rejection. | `-275` · CR2, CR3 | ✅ AC1 |
| ✅ **Q4** — a certificate accepted and then re-rejected on re-review resumes its OLD run (⛔ not a new 180 days) | ✅ **RULED A by `-275`** — the run pauses while the certificate stands accepted and resumes on the re-rejection, counting from the first rejection. | `-275` · CR5 | ✅ AC2 |

⭐ **§0 run in this pass (the routing template's gate):** CR1–CR15's engineering is *"the code should do X"* ⇒ **the author's**. ⚠ But four
sit on *"what a family receives, how often, for how long, and whether the Trust writes to them by post"* — the ground `-259`'s own gate
gave to the Panel — and are therefore **mixed**: the build half is ours (taken under `-273`'s *"closes or sends nothing more"* rule), the
person half was a confirm: **Q1–Q4** above. ⭐ **Routed 2026-10-03** in
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-03-6-19d-four-confirms.md` and ✅ **RULED the same day —
`2026-10-03-275`, all A** (Q1's A is ⛔ not our reading; Q2–Q4 are) — ⭐ ⛔ no confirm is still owed, and the build is unchanged. **CR6** (the recipients) is ⛔ not a confirm: `-259` detail 2 and `-253`
cl.1 rule it in words; its consequences both ways are stated in Trap 2.

## ⚠ THE TRAPS

**Trap 1 — do ⛔ NOT add a kind to `claim_correction_runs` (the comments invite it; the code forbids it).** Five conflicts, all traced at
`06b3ebdf`:
(a) `return_decision_id` is `uuid NOT NULL` with an FK to `claim_state_trustee_decisions` (`schema/claim_correction_chase.ts:164-167`,
migration 0127) — a certificate wait has ⛔ no return; `openCorrectionRun` (`correction-chase.ts:328`) re-derives the LIVE return and throws
`CorrectionRunReturnNotLiveError`.
(b) **One open run per CLAIM** — `claim_correction_runs_one_open_per_claim_uq ON (claim_case_id) WHERE ended_at IS NULL`
(`schema/claim_correction_chase.ts:178`); `openRunLocked` (`correction-chase.ts:342-343`) and `writeCorrectionMark` (`:514-522`) end ANY
open run of the claim ⇒ a correction return and a certificate wait would end each other. ⭐ **Both can be live at once**: a return is
recordable in `TRUSTEE_RETURNABLE_STATES` (`verifier_approved`, `reversed`, `state_trustee_freeze` — `state-trustee-decision-persist.ts:126`),
all inside the review window where a certificate can be rejected.
(c) The sweep ends any run whose return is ⛔ not the live one, `superseded` (`apps/jobs/src/scheduler/claim-correction-reminders.ts:1095-1097`)
— a certificate run would die on its first tick.
(d) `correctionReminderSchedule` filters `r.day < CORRECTION_RUN_HORIZON_DAYS` (90) for **every** kind (`correction-schedule.ts:99`), and the
sweep ends runs at `day_90` (`:1099-1101`) — days 120/150/180 would be **silently dropped** (the `:61` comment *"6.19d adds its own kind's
days here as data"* is contradicted 38 lines below it).
(e) The SMS child refuses any kind but `family`/`direction` (`beginCorrectionFamilySend`, `correction-reminder-record.ts:431`) and always
sends message `'reminder'` (`claim-correction-reminders.ts:498`) — the bank-details text.
⇒ **CR1.** ⚠ Fixing all five inside 6.19b's machine edits the closure's own substrate (the one-open-run index, the opener, the sweep's
stop predicate) — the exact code 6.19c's two review passes just hardened. ⛔ Don't.

**Trap 2 — the recipients (fact 2 above), and what CR6 means BOTH ways.** ⛔ Never `readCorrectionRecipients`, ⛔ never
`getEffectiveNomineeDeclaration` for this story's sends. The contact record binds to the nominee versions **as they stood at filing** (6.19a
W1 — the projected versions; W2 lets the helpline add rows for effective ones). Two consequences, both stated, ⛔ neither "fixed":
(a) ⚠ a nominee version dated on/after the death (which the District Admin would later discard, `-235`) is still a person the family agreed
may be contacted ⇒ **texted** (name-free, asking only for a certificate — invariant 3);
(b) ⚠ **the converse**: an as-at-death nominee whose version was replaced after the death (the `-262` FQ8 shape) is ⛔ not on the record ⇒
⛔ **not texted**. `-259` detail 2 and `-253` cl.1 rule *the agreed people*, ⛔ not `-255` F6's declared set (which governs the correction
reminders through T12).
(c) ⚠ one human can be TWO person keys (a projected post-death version and a helpline-added effective version have different chain roots)
⇒ one text per number per slot, the lowest person key sending (CR6), and the staff list labels persons
by position (*"nominee A / nominee B / …"*), ⛔ never by an assumed rank.

**Trap 3 — "the current certificate" is ⛔ not the latest upload.** It is the `claim_death_certificate_uploads` row whose
`storage_object_key` equals the `claim_documents` row's key; ⭐ **only the OCR job moves it**, forward only, under the claim-row lock
(`death-certificate-approval.ts:20-24, 83-150`; the uploads table's only writer is `apps/jobs/src/claim-ocr-parity.ts:424-443`). ⇒ a
certificate the family sent is "received" only once that job has run. ⚠ A dead-lettered OCR job (`claim-ocr-parity.ts:59-60`) leaves the
family chased for a certificate they sent — ⭐ already in `deferred-work.md` as the OCR-parity job's retry/decrypt items (Task 9
cross-references them, ⛔ no duplicate). ⛔ Never add an upload-handler side-channel to "see it sooner" (CR14).

**Trap 4 — rejection #2 vs a re-review.** A rejection of the **same** upload again (`superseded_reason = 're_reviewed'`) gets a new
`review_id` but is ⛔ **not** a second certificate ⇒ ⛔ no new 180 days. A rejection of a **different** upload (`'replaced'`) is `-260` G5's
second rejection. ⇒ the run's anchor is the rejected **`upload_id`** (CR2). ⚠ `recordDeathCertificateReview` lets any verdict supersede any
verdict on the same upload (`death-certificate-review-persist.ts:171-188`) ⇒ two sequences to handle on purpose:
(a) **accepted → re-rejected** (⛔ never rejected before): a FIRST rejection of that upload ⇒ a run opens. Correct.
(b) **rejected → accepted → re-rejected**: the run anchored on that upload **pauses** while the certificate stands accepted and **resumes**
on the re-rejection, still counting from its own day 0 (CR5, **Q4**) — ⛔ never a second run on the same upload (the UNIQUE), ⛔ never silence.

**Trap 5 — `reversed` is IN the review window.** `denied → appeal → reversed` makes an old rejection live again (its `decided_at` may be
months back). ⛔ Never treat re-entry as a restart (G5 restarts only on a second rejected **certificate**): the run **pauses** while the claim
is outside the window and **resumes** with ONE `late` catch-up on re-entry, still counting from its own day 0 (CR5, **Q2**).

**Trap 6 — `missing` is ⛔ not strictly "never sent".** It also covers a **T12 legacy row** (a certificate sent before 6.21a, with ⛔ no upload
row — `deathCertificateStatus`, `death-certificate-approval.ts:153-161`), and the OCR job's tolerance path (a payload with ⛔ no `uploadId`
overwrites `claim_documents` with ⛔ no upload row, `claim-ocr-parity.ts:57-59`) can make a claim `missing` **again** — ⛔ not reachable in
production, but it would meet CR1's one-`missing`-run UNIQUE (the planner must treat that as "a `missing` run exists" and ⛔ never crash on
the 23505). ⛔ No production data exists ⇒ ⛔ no legacy row exists in production; ⚠ a dev/staging DB may hold one. Recorded (Task 9).
⚠ And a claim whose peer mesh finds **zero** candidates never leaves `documents_pending` (`apps/jobs/src/claim-peer-mesh.ts:244-262`) ⇒ it
never enters checking ⇒ it is ⛔ never chased. That is **our reading** of `-259` detail 3 (pre-verification ⇒ ⛔ not chased); the stall
itself is a system defect, recorded in Task 9.

**Trap 7 — `replacement_reminder` is ⛔ not YOUR purpose.** It sits in 6.19b's purpose CHECK (0128/0135) and reads like "replacement
certificate". It is D21's reserved *"replacement of the District Admin's regular reminders"* — *"written by nobody in v1"* (0128 header).
⛔ Never write it; this story's rows live in **its own** table with **its own** purposes (CR1).

**Trap 8 — the UX spec still draws a filing-time SMS.** Journey 2 (*"Save intake · upload within 7 days · SMS reminder"*) and
`<ClaimDocumentUpload>`'s *"deferred state has visible reminder schedule"* (`ux-design-specification.md`, the Journey 2 flow and the
component entry). **Do ⛔ not build either** — `-259` detail 3 rules ⛔ no chase while filing, and 6.21b's `missing` copy is already
deadline-free. ⇒ an **annotation** in Task 0 (⛔ not a rewrite).

**Trap 9 — two messages on one morning.** A claim with a live family correction return **and** a certificate wait sends both the
correction reminder and the certificate reminder to the same person on a shared slot day. Both are ruled; ⛔ don't merge, suppress or
re-time either (that would move a ruled schedule). Recorded in Dev Notes.

**Trap 10 — tests and gates that turn red on the wrong edit.** `packages/domain/tests/claim/correction-schedule.test.ts:44-48` builds a
literal three-key `CorrectionScheduleTable` (domain tests are inside `tsc`) and `:29` pins `CORRECTION_REMINDER_DAYS` with `toEqual`;
`packages/domain/tests/integration/rls/claim-correction-closure-policy-regression.spec.ts:516-523` pins the DB purpose CHECK equal to
`CORRECTION_REMINDER_PURPOSES`; `packages/domain/tests/rbac/permissions.test.ts:229-231` pins catalog **50 / 64**. ⭐ Under CR1/CR14 ⛔ none
of these should change — if one goes red, you edited 6.19b's machine; stop. Three that **will** need a deliberate edit:
`apps/jobs/tests/claim-correction-sms-templates.test.ts` (`CASES` hard-codes the two messages at `:55`; the sheet must carry the new text
and key, `:77, :82-83`); `scripts/claim-adjudication-human-actor-invariant/check.ts` (`:190-213` pin each route file's `expectedMethods`;
a NEW route file needs its own entry, and `COVERAGE_FLOOR` (`:311`) rises **15 → 16** with the reason in its comment — the convention every
story has followed); and the en ↔ hi key-parity check (every `en` key, incl. a `$comment.*`, must exist in `hi`).

## ⚖️ Decisions — the AUTHOR's (⏳ PROPOSED; committed by ONE author-commit in Task 0, before any code)

⛔ None is the Panel's alone (§0 above). Each is *"the code should do X"*; Q1–Q4 mark where the person-facing half was a confirm — ✅ all ruled by `-275`.

- **CR1 — Certificate reminders get their OWN tables; ⛔ not a kind on `claim_correction_runs`.** ✅ **Agreed by BigDev 2026-10-03** (*"yes, agreed"* — to CR1 and CR6, put explicitly); still committed by Task 0's author-commit. ⚠ **SUPERSEDES** `-266` §1's
  *"(6.19d adds its own kind by its own migration)"* and its *"6.19d adds its own kind's days (`-259`, `-260` G6) as data"* — an
  author-commit superseding an author-commit; ⛔ no Trustee-ratified clause moves (the days stay the Panel's). ⛔ No later decision (`-267` …
  `-274`) restates or depends on those sentences. Why: Trap 1's five conflicts. Three NEW tables (names are the developer's; these are
  recommended):
  - `claim_certificate_reminder_runs` — `run_id` PK · `claim_case_id` FK → claims · `pariwar_id` · `cause` ∈ {`rejected`, `missing`}
    (text CHECK) · `anchor_upload_id` (FK → `claim_death_certificate_uploads.upload_id`; NOT NULL iff `cause='rejected'`) ·
    `anchor_review_id` (FK → `claim_death_certificate_reviews.review_id`, the rejecting review that opened the run; NOT NULL iff
    `cause='rejected'`) · `day0` (date, IST) · `opened_at` · `ended_at` · `end_reason` ∈ {`certificate_received`, `superseded`,
    `completed`} with the `(ended_at IS NULL) = (end_reason IS NULL)` pair CHECK (0127's precedent) · ⭐ partial UNIQUE **one open run per
    claim** `(claim_case_id) WHERE ended_at IS NULL` · UNIQUE `(claim_case_id, anchor_upload_id) WHERE cause='rejected'` (one run per
    rejected certificate — Trap 4(b)) · UNIQUE `(claim_case_id) WHERE cause='missing'`. `twt_app` may UPDATE only `ended_at`, `end_reason`.
  - `claim_certificate_reminders` — the record, shaped on `claim_correction_reminders` (0128): `reminder_id`, `run_id` FK, `claim_case_id`,
    `pariwar_id`, `slot_day ≥ 0`, `sent_on`, `recipient_key`, `purpose` ∈ {`family_sms`, `letter_chase`, `letter_escalation`},
    `subject_key NOT NULL DEFAULT ''` (⛔ never NULL — a NULL voids the UNIQUE), `outcome` (the same eight values as 0128's CHECK), `late`,
    `recipient_version_id` (FK → `member_nominee_versions`), `recipient_number_hash`, `provider_message_id`, `detail`, `first_detail`,
    `attempt_count ≥ 1`, `claimed_at`, `claimed_by_job`, `delivered_at` (only on `accepted`), timestamps; UNIQUE `(run_id, slot_day,
    recipient_key, purpose, subject_key)`; a staff day-key UNIQUE `(claim_case_id, recipient_key, subject_key, purpose, sent_on) WHERE
    purpose IN ('letter_chase','letter_escalation')` (the 0130 lesson — the key **includes `purpose`**).
  - `claim_certificate_reminder_letters` — shaped on 0134 `claim_closure_letters` **column for column**, with `run_id` (the run it was
    recorded in) in place of `closure_id`; ⭐ UNIQUE `(claim_case_id, person_key)` (CR9 — one letter per person per CLAIM, Q1).
  Own RLS policy file(s) (per-command SELECT/INSERT/UPDATE, ⛔ no DELETE, FORCE), registered in `policies/index.ts` and `schema/index.ts`.
- **CR2 — The two causes, their anchors, and the planner's precedence.** For a claim in `CLAIM_REVIEW_WINDOW_STATES`:
  (a) **`rejected`** — the current certificate's live review is `rejected` (`deathCertificateStatus(snapshot) === 'rejected'`, the read
  `isDeathCertificateReplacementRequested` makes) and ⛔ no run is anchored on the current `upload_id` ⇒ open: anchor = the current `upload_id`
  + the live rejecting `review_id`. ⭐ A rejection of a **different** upload is `-260` G5's new 180 days; a re-rejection of the **same** upload
  never opens a second run (Trap 4).
  (b) **`missing`** — `deathCertificateStatus(snapshot) === 'missing'` and ⛔ no `missing` run exists for the claim (⭐ at most ONE per claim —
  uploads are append-only and the current pointer moves forward only; Trap 6's tolerance path is the one exception, handled as "exists").
  ⭐ **Precedence (one plan per claim per sweep):** when a new run is due, **`open` wins** — the opener ends any open run of the claim
  `superseded` in the same transaction, so a second rejection between two sweeps still gets its day 1 the next morning; `certificate_received`
  applies only when ⛔ no new run is due. A never-sent wait that turns into a first rejection opens its own run (**Q3** — ✅ `-275` Q3 A).
  ⭐ **Discovery is the sweep's** (CR4): ⛔ no edit to the review writer, the upload handler or the OCR job (CR14). The first slot is day 1 at
  10:00, so a run discovered at any sweep on or after day 0 loses nothing (the catch-up covers a missed sweep).
- **CR3 — Day 0** (`-259`'s reading, adopted): `rejected` ⇒ `istDateOf(anchor review.decided_at)`; `missing` ⇒ `istDateOf(occurred_at)` of
  the claim's **EARLIEST** `claim.peer_mesh_pinged` event in `events_log` (`stream_id = claim_case_id`) — the ONLY edge
  `documents_pending → verification_in_progress` (`state.ts:131-133`), emitted once, guarded on `documents_pending`, by
  `apps/jobs/src/claim-peer-mesh.ts:274-299`. `claims` has ⛔ no state-entry column; the read follows `computeStageSlaStatus`'s pattern
  (`appeal-eligibility.ts:244-270`). Every route into the window (incl. `denied → … → reversed`) passes `verification_in_progress` first, so
  "⛔ no such event" is unreachable ⇒ ⛔ no run + an alarm, ⛔ never a guessed day 0. ⭐ A `rejected` run's day 0 applies also to a first
  rejection after a `missing` wait (✅ `-275` Q3 A).
- **CR4 — The schedule, as DATA, and the sweep.** `CERTIFICATE_REMINDER_DAYS` = `CORRECTION_REMINDER_DAYS` (⭐ **imported** from
  `correction-schedule.ts:24-26`, ⛔ never copied — one source of the Panel's `-250` #5 days) followed by `CERTIFICATE_REMINDER_MONTHLY_DAYS =
  [120, 150, 180]` (`-260` G6). ⛔ Nothing on day 0 (`-250` #5: day 1 = the day after); ⛔ nothing after day 180. A pure
  `certificateReminderSchedule(day0)` in a NEW module (⛔ never a fourth key in 6.19b's `SCHEDULE_TABLE`, Trap 10). ⭐
  `isCertificateRunPastHorizon(runDay)` ⇔ **`runDay > 180`** (⚠ ⛔ never 6.19b's `>=` "expired" shape — copied, it would never send day 180).
  The catch-up is 6.19b's pure `correctionCatchUp(dueDays, recordedDays, todayRunDay)` (`correction-schedule.ts:122-137`, generic over day
  numbers), **reused**: the latest missed slot once, flagged `late`; older ones written `skipped_superseded`; ⛔ no burst. Its OWN daily sweep
  at **10:00 IST** (`'0 10 * * *'`, `tz: 'Asia/Kolkata'`) on its OWN queues (e.g. `claim.certificate.reminder.sweep`,
  `claim.certificate.family_sms`, beside 6.19b's in `packages/queue/src/index.ts`), registered in `apps/jobs/src/boot.ts` the way
  `registerClaimCorrectionReminderWorkers` is (`claim-correction-reminders.ts:1424-1477`; `boot.ts:601-606`). ⭐ **The sweep pages the UNION**
  of (a) every OPEN `claim_certificate_reminder_runs` row, in or out of the window — so it can end, complete or pause it — and (b) every claim
  in `CLAIM_REVIEW_WINDOW_STATES` with ⛔ no open run, as candidates; both keyset-paged (6.19b's starvation lesson) on the BYPASSRLS pool,
  every dynamic `.limit()` through `clampLimit` ([[project_domain_limit_clamp_and_savepoint_retry]]). ⭐ The status is computed **per claim**
  with `readDeathCertificateSnapshot` + `deathCertificateStatus` (`death-certificate-approval.ts:83-161` — a per-claim read; it throws on more
  than one row) — ⚠ a bulk SQL classifier would be a SECOND definition of the status: if you write one for speed, add a parity test (for
  every fixture of `death-certificate.spec.ts`, the bulk class equals `deathCertificateStatus(readDeathCertificateSnapshot(…))`, and
  `rejected` in the window equals `isDeathCertificateReplacementRequested`). ⭐ **The horizon check runs BEFORE any slot is
  planned:** `runDay > 180` ⇒ end `completed`, ⛔ no catch-up (a missed day-180 sweep is ⛔ not caught up — stated, accepted). A run whose day 0
  is already more than 180 days back when CR2 would open it is opened and ended `completed` in the same transaction, ⛔ no send (✅ `-275` Q2 A:
  ⛔ never re-dated). Day 180's slot is planned on day 180, while the run is open. ⭐ The sweep, too, hashes every person's current number BEFORE taking a
  claim's row lock — ⛔ no KMS while holding it (CR7's discipline; the jobs pool is `max: 2`).
- **CR5 — Stop, pause, resume.** Evaluated by the sweep, re-checked by the child under the lock:
  - **END `certificate_received`** — the claim's current upload is no longer the run's anchor (`rejected`), or the status is no longer
    `missing` (`missing`), and ⛔ no new run is due (CR2's precedence): a certificate arrived (`-259`'s *"stop the moment a new certificate is
    received"*).
  - **END `superseded`** — a newer run opened (CR2).
  - **END `completed`** — run day past 180 (CR4).
  - **PAUSE** (⛔ no send, ⛔ no record; the calendar runs on) — (i) the claim is outside `CLAIM_REVIEW_WINDOW_STATES` (`denied`, an appeal
    stage, `state_trustee_approved`, `approved`, …); (ii) the anchor upload itself stands **accepted** on a re-review (Trap 4(b)). On
    resumption (`reversed`; a re-rejection) the run sends ONE `late` catch-up, still counting from its own day 0 — ⛔ never re-opened, ⛔ never
    re-dated (**Q2**, **Q4** — ✅ `-275` Q2 A, Q4 A).
  - ⭐ **Precedence:** `open` (CR2) ≻ END `completed` (run day > 180 — checked BEFORE pause, so a run paused past day 180 ends) ≻ END
    `certificate_received` ≻ PAUSE ≻ continue.
  - It is ⛔ **not** paused by a live correction return, the "who must act" mark, or a Super Admin hold — **ours**: `-274` 1b (Trustee-ratified)
    governs the **correction** run's 90 days while held, ⛔ not `-259`'s schedule; pausing would narrow a ruled schedule, so the build keeps
    sending.
- **CR6 — The recipients are the people on the contact record** (✅ **agreed by BigDev 2026-10-03**, with CR1) (`-259` detail 2, verbatim: *"the same people the family agreed at filing
  may be contacted"*; `-253` cl.1). ⚠ **The shared spec's T12 does ⛔ not apply to this story** (it governs 6.19b's correction reminders, where
  `-255` F6's declared set is the effective declaration). Read with 6.19a's helpers (`claim-contact-check.ts`): `readClaimContact`,
  `readVersionChainIndex`, `correctionChainOf`, `readClaimContactAgreementState`; person keys through 6.19b's `nomineePersonKey`
  (`correction-chase.ts:590`) — so a person's key is the same in both machines.
  - **Each nominee person on the record** — one per distinct chain root among the child rows' `nominee_version_id`s and the
    `claimant_nominee_version_id` (when set) — is texted at the mobile of the **head of that person's correction chain**: a pure
    `chainHeadOf(versionId, versions)` = the descendant with ⛔ no child (`readVersionChainIndex` maps child → parent, so invert it); on a fork
    (`corrects_version_id` carries ⛔ no UNIQUE, `member_nominee_versions.ts:116-125`) the highest `version_no` **among that chain's
    descendants** (⚠ ⛔ never "the member's highest `version_no`" — [[feedback_story_validate_footguns]] #31(b)). A vacated head (null mobile)
    or the erasure sentinel ⇒ `no_target`.
  - **The claimant**, when the claimant side is the BLOCK, at the block's mobile.
  - ⭐ **One human, one text per slot — decided by NUMBER, deterministically** (Trap 2(c)):
    - BEFORE the lock, the child hashes the CURRENT number of **EVERY** person on the record (CR7's KMS-outside-the-lock rule; it keeps the
      plaintext of its OWN number only, for the send). Under the claim-row lock it re-verifies each person's version id (the claimant: the
      block's ciphertext) — a change ⇒ ⛔ no write, retry.
    - It writes `skipped_superseded`, detail `same_number_in_slot`, when (i) a person with a **LOWER `personKey`** has the same current hash
      (the lowest key is the sender — stable across slots, ⛔ never whoever runs first), or (ii) a row of the same run and slot already
      carries its hash with any outcome other than `skipped_superseded` (a dead-number row included — ⛔ never a second text to a number
      known dead that morning).
    - Its `attempting` row carries the hash (⚠ 6.19b writes it only at finalise — CR7's one departure).
    - ⭐ **The delivered-letter stop is per NUMBER:** a letter delivered to ANY person whose letter-epoch number is N stops every person's SMS
      to N on the claim — the CR8 adapter passes the letters of every person sharing the hash, ⛔ not only the person's own.
    - ⭐ **One letter per NUMBER as well as per person:** `assertCertificateLetterAllowed` refuses `409 certificate_letter.already_recorded`
      when any person whose current number hash equals this person's already has a letter on the claim (the code check is the backstop the
      per-person UNIQUE cannot be); the list shows that number's letter as owed ONCE, under the lowest key.
    - Tests: (race) two children, same hash, same slot, concurrent ⇒ the LOWER key `accepted`, the other `same_number_in_slot`; (dead) the
      lower key's row is `rejected_invalid_number` ⇒ the higher key is ⛔ not sent; (letter) a second key of the same number ⇒ 409;
      (stop) a letter delivered to A stops B's SMS to the same number.
  - **Cannot remind** (⛔ no family send, ⛔ no record for the slot, a flag on the staff list — D30's shape, its OWN reason type):
    `no_contact_record` · `agreement_not_live` (`readClaimContactAgreementState` ≠ `live`). ⛔ Never `undetermined` — the determination is ⛔
    not consulted (Trap 2). ⭐ The catch-up sends the latest missed slot once the record is fixed.
  - The SMS language = `contact_locale`.
- **CR7 — The send is 6.19b's `sendClaimCorrectionSms`, with a THIRD message.** `apps/jobs/src/scheduler/claim-correction-sms-templates.ts`:
  `ClaimCorrectionSmsMessage` gains `'certificate_reminder'` (the registry is a `Record` over the union, so the compiler forces both entries);
  config keys `sms.dlt.template_id.claim_correction.certificate_reminder.{hi,en}` (the sheet's naming, D7); the same two `{#var#}` slots (the
  short reference, then the per-Pariwar helpline, `claimCorrectionHelplineConfigKey`); copy keys `certificate_sms.reminder` in `claim.json`
  en + hi. ⭐ **One wording for both causes** — it names ⛔ no reason (AC7). The SEND FUNCTION is 6.19b's, **reused unchanged**
  (`sendClaimCorrectionSms`, `claim-correction-reminders.ts:246-313`): fail-closed on a missing template id / helpline / gateway (`error` +
  alarm, T13); the provider classification (`invalid_number` → `rejected_invalid_number`, `carrier_reject` → `rejected_unreachable`,
  `rate_limited` / `api_unavailable` / timeout → transient, a known Secret Manager config fault → `error` + alarm, else `error` + alarm). The
  child's lifecycle mirrors 6.19b's AC2 — ⚠ with ONE deliberate departure: the number hash is written on the `attempting` row, ⛔ not only
  at finalise (CR6's one-text-per-number rule needs it there; ⚠ the finalisers then KEEP the row's hash, so an exhausted `error` row is evidential — its
  hash is the number attempted, it splits ⛔ no epoch — and CR6's same-number skip does ⛔ not treat it as "sent") — (insert `attempting` with `claimed_at`/`claimed_by_job`/`recipient_number_hash` under the lock → commit → send →
  compare-and-set the final outcome, checking `moved` on every CAS (6.19c's lost-CAS finding); a same-job retry re-claims at once, another job
  only after `CORRECTION_SEND_LEASE_MS` (`correction-reminder-record.ts:59`); an exhausted row finalised `error` by the next sweep; a child
  redelivered after IST midnight finalises `error`, `exhausted:crossed_midnight`, ⛔ never sends yesterday's slot today). ⭐ **The lock is the
  claim-row lock** (`SELECT … FOR UPDATE` on `claims`) — it serialises with the 6.21a review writer, the OCR job's pointer move and the
  determination writer (all of which lock the claim row first; the OCR job encrypts BEFORE locking — ⛔ no deadlock cycle), and ⛔ never the
  correction chase's trustee advisory lock. ⚠ **Its cost discipline:** `SET LOCAL lock_timeout` (6.19b's `CORRECTION_PLAN_LOCK_TIMEOUT`,
  `claim-correction-reminders.ts:109`) **before** taking it; ⛔ no KMS call while holding it — compute the number hash BEFORE the lock and
  re-verify only the version id under it; ⛔ never a second pool checkout inside it (the jobs pool is `max: 2`, `boot.ts:273-274`, and 6.19b's
  and 6.19c's sweeps also run at 10:00 IST).
- **CR8 — A person's state, across the claim's runs, per current number.** `recipient_number_hash` is `blindIndex` under the field class
  `claim_contact_mobile` with the real `pariwarId` (⛔ never `mobileBlindIndex`; 6.19b AC3). A person is **letter-eligible** from their first
  `rejected_invalid_number` / `rejected_unreachable` (`-269` §4) / `no_target` row of the current number (their **found-dead day**); a 6.20
  correction that changes the number resets that (`-271` §1 / `-272` §2(b)'s per-number rule, adopted); a **delivered** letter to that person
  stops their SMS to that number in **every** later slot of the claim (`-250` #1's rule, adopted — ours for a certificate; claim-wide, as CR9's
  one letter is). ⭐ Rows of several runs are ordered by TIME (`compareReminderRowsByTime`), ⛔ never by `slot_day`. ⭐ Reuse 6.19b's pure
  `evaluatePersonRunState` / `isEvidentialReminderRow` / `DEAD_OUTCOMES` / `compareReminderRowsByTime` (`correction-chase.ts:690-772`, all
  exported) through a thin adapter from this table's rows (the letter shape needs a placeholder `sequence`) — ⛔ never copy them (two copies of
  "what dead means" is the defect `DEAD_OUTCOMES`'s own comment records). ⭐ The catch-up's recorded-day set = THIS run's rows of the person,
  **any outcome** — ⛔ never `epochRows` (which drops `skipped_superseded` / `attempting` and spans runs, so skipped slots would be planned
  again; 6.19b builds it the same way, `claim-correction-reminders.ts:1240`). ⭐ A KMS failure while hashing fails **closed**: the child retries; on
  its FINAL attempt (the pg-boss retry count at its limit) it takes the lock and writes a final `error` row, `recipient_number_hash` NULL,
  detail `exhausted:hash_failed`, plus an alarm (ids only) — non-evidential under `isEvidentialReminderRow`, and a RECORDED day, so it is ⛔
  never caught up (⚠ with hash-before-lock there is otherwise ⛔ no row at all, and the next sweep would re-send it as `late`). The letter route
  answers 503 `certificate_letter.number_unverified`.
- **CR9 — The ONE letter** (`-259` detail 1). ⭐ **One letter per person per CLAIM** — UNIQUE `(claim_case_id, person_key)`; ✅ **the Panel's
  rule, `-275` Q1 (A)**: a G5 restart, or a never-sent wait turning into a rejection, allows ⛔ no second letter.
  Recorded like a correction/closure letter: posting date, Tier-1 tracking number; within 14 days of posting, the delivery date + a screenshot
  (the `claimDocumentStorage` PORT, its own key prefix `…/certificate-letter/{letterId}`, MIME/size checked before `put`, read only by a
  TTL-signed URL; ⚠ ⛔ no virus scan — recorded, as D6). The **overdue flag** at posting + 14 days, shown, nothing else. ⛔ No second letter,
  ⛔ no `letter_second_due`. Preconditions (refusals **409 `certificate_letter.*`**): the claim has a run (`no_run`); the person is
  letter-eligible across the claim's runs (`not_letter_eligible`) — letters stay recordable after a run ends (`-250` #4's rule); that
  person's address resolves — a nominee through `resolveContactRow` (W4a), the claimant from the block's own column (`-267` §5b)
  (`address_missing`); the agreement is `live` (`agreement_not_live`); a second letter for the person on the claim is refused
  (`already_recorded`, also on a 23505); a second delivery (`already_delivered`). 400: `delivered_before_posted`, `date_in_future`. 404
  `not_found`. 503 `number_unverified`. ⭐ Model the writer on `claim/closure-letter.ts` (`assertClosureLetterAllowed` `:58`,
  `recordClosureLetter` `:116`, `recordClosureLetterDelivery` `:168`) — the closest precedent; ⛔ not the two-letter `correction-letter.ts`.
- **CR10 — Staff reach (`-259`: *"the author's"*).** ⭐ The District Admin is chased for the letter only — from a person's found-dead day,
  **day 7, daily through day 12, then on day 13 an escalation RECORD naming every Pariwar Admin** (`listAdminsByRole(db, pid, 'pariwar_admin')`,
  `admin-directory.ts:43`). ⚠ **In v1 the escalation reaches ⛔ no Pariwar Admin**: there is ⛔ no push (below) and ⛔ no Pariwar-Admin surface
  (key (1) is `district_admin` only — `roles.ts:124, 514`; 6.19b/6.19c's escalations reach a Pariwar Admin only through
  `runCorrectionStaffPush`). The District Admin's list shows *"Escalation recorded on <date> (the Pariwar Admin is not notified in this version)"* — ⛔ never worded as
  sent or notified; recorded in Task 9 (trigger: the
  staff-push seam, or a Pariwar-Admin view) — 6.19b's `LETTER_CHASE_*` offsets (`correction-schedule.ts:35-37`, D20; `-274` 2's
  closure-letter cadence is its **unratified** reading of the same). Records in `claim_certificate_reminders` (`letter_chase` /
  `letter_escalation`, `recipient_key` `staff:<user_id>` or `staff:unassigned` with an alarm, `subject_key` = the chased person's key,
  outcome `recorded`); the District Admin is the live shepherd (`getLiveShepherd`, `shepherd-read.ts:36`). ⭐ The chase dedupes against the person's
  `letter_chase` / `letter_escalation` rows across ALL the claim's runs dated after the current found-dead day; a due date before the current
  run's day 0 is written at TODAY's slot (6.19b's `slotForDate` / K2 clamp) — ⛔ never a negative slot, ⛔ never skipped; on a new run or a
  resumption already past + 13, the late chase and the late escalation are both written that morning — chosen, mirroring 6.19b (both are
  records; ⛔ nothing is pushed). ⭐ The chase runs only while the person has ⛔ no letter on the claim **and** the claim's run is OPEN and ⛔ not
  paused; ⛔ none while paused, ⛔ none after the run ends (the
  list still shows the letter as owed). ⛔ **No** regular District Admin reminders on the family's days (the District Admin's own act —
  reviewing a certificate once it arrives — is already on 6.21a's verifier console). ⛔ **No staff push** in v1 — ⚠ a departure from the
  shared spec's **D11** (*"admin push best-effort"*) for this story only, recorded in Task 0's author-commit: admin push is inert on day one
  (⛔ no admin device token) and 6.19b's `runCorrectionStaffPush` is hard-wired to correction rows and copy
  (`claim-correction-reminders.ts:556-557, 602-693`). ⚠ ⛔ No staff prompt to CALL a dead-phone family whose second certificate is rejected after their one letter (`-275` *"does NOT cover"* —
  the author's): in v1 such a person gets ⛔ no SMS (the delivered-letter stop), ⛔ no letter (`-275` Q1) and ⛔ no chase; the list shows the
  new run with the person as *"letter delivered — ⛔ no SMS"*. Deferred (Task 9; trigger: a staff call-task seam). After day 180, ⛔ nothing
  to anyone — **ours** (`-259` ruled ⛔ no prompt either way).
- **CR11 — The staff surface: a NEW "Certificate reminders" list** for the District Admin, `/p/$pariwarId/certificate-reminders`, modelled on
  6.19c's closure-letters page (`apps/admin/src/routes/CorrectionClosureRoutes.tsx` `ClosureLettersView` `:212`;
  `modules/correction-closure/ClosureLettersOwed.tsx`). Per claim with an open run, or with a letter-eligible person whose letter is unrecorded or
  undelivered (any run, open or ended) — ⛔ not listed while paused in a state that never re-enters the window (`approved`, `settled`) unless
  a person's letter is unrecorded or undelivered: the short reference (`claimShortReference`), the cause (*"certificate not accepted"* / *"no certificate received"*),
  the run day and the next reminder date — or *"paused — the claim is not being checked"* / *"paused — the certificate is accepted"* — each
  person **by position and role** (*"nominee A"*, *"nominee B"*, *"claimant"* — ⛔ no name): reminded / number not working / unreachable / no
  number / letter owed / posted / delivered / overdue; the "cannot remind" flag with its reason; and the letter form (the address under a
  **fresh step-up**, one audit line per reveal). Linked from the admin nav inside a Pariwar context only. English staff copy in a NEW
  per-module `apps/admin/src/modules/certificate-reminders/i18n-en.ts` (the convention — e.g. `modules/correction-closure/i18n-en.ts`;
  staff copy is English-only, D11; ⚠ the microcopy gate scans admin copy too — ⛔ no "action required" / "needs action"). ⭐ **Key: reuse
  (1) `claim.record_correction_letter`** for the list read and every letter route — the act is the same (*"record a posted letter (and read
  that person's address inside the letter form)"*, `-265` §2), the holder the same (`district_admin`, district dimension), and **6.19c
  already reused it for all five closure-letter routes** (precedent). ⭐ **The gating shape is 6.19c's:** the LIST (Pariwar-level, ⛔ no claim
  in the path) = preHandlers `[adminSession, scope, resolveQueueScopeStash(key (1)), requirePermissionHook(key (1), { dimension: 'district',
  resolveDimension: <the queue scope's dimension>, resolveValue: <its value> })]` (⚠ `resolveQueueScopeStash` only STASHES the scope — without the hook the route answers 200 with an
  empty list, ⛔ not a 403) + a per-row `hasPermission(key (1), { dimension: 'district', value: <the deceased's posting district> })` filter in the
  handler, BEFORE the page slice (6.19c: the hook `canReadLetterQueue`, `claims.correction-closure.routes.ts:89-92, 120`; the per-row filter
  `getClosureLettersOwed`, `claims.correction-closure.handlers.ts:607-631`) — a bare Pariwar
  gate would leak other districts' claims, so ⛔ never use one; the per-claim routes = `resolveDistrict` + key (1). Amend key (1)'s doc-block in
  `permissions.ts`; ⛔ **no catalog bump** (stays **50 / 64**).
- **CR12 — The separation from the closure, proved.** Structural by CR1: every 6.19b/6.19c reader (`resolveCorrectionChase`, the "reached"
  readers, the closure sweep that enumerates live trustee returns, `claim-correction-closure.ts:159-160`) reads `claim_correction_*` only.
  Proved by tests (AC6): a claim with only a certificate wait answers **409 `closure.no_live_return`** (`requestCorrectionClosure`,
  `correction-closure.ts:790-807` — *"a certificate wait alone ⛔ never qualifies — invariant 10; 6.19d relies on it"*); a claim with **both**
  waits has the **same** `readClosureReadiness` (`correction-closure.ts:719`) + `resolveCorrectionChase` result with and without certificate
  rows (a cheap fence); ⛔ no 6.19d module calls a decision writer — a **source-scan fence** on the model of
  `apps/jobs/tests/claim-correction-closure-no-decision.test.ts` (comments stripped; its `DECISION_WRITERS` list incl. `adjudicateClaim`,
  `returnToDistrictAdmin`, `routeToR9`, `finalizeR9Outcome`, `projectClaimState`; a positive control) over this story's jobs and domain
  modules — ⚠ an "import" check is meaningless where jobs import `claim as claimDomain` as a namespace. ⚠ A human closure of the claim on the
  **bank** ground (6.19c) moves it to `denied` and so **pauses** the certificate run (CR5) — the certificate ⛔ never caused it. Stated, ⛔ not
  prevented.
- **CR13 — The go-live gates (records, ⛔ not runtime flags — D24).** (a) DLT templates **5–6** of
  `docs/launch-gate-inventory/dlt-template-requests-6-19.md` — this story writes their wording, `{#var#}` slots, config keys, its own cost line
  and a Record row; only BigDev submits. (b) Counsel **M** and **S** — `inventory-roster.md` rows 18 and 19 already name 6.19d's sends ⇒ ⛔ no
  edit. (c) **The Hindi review** — row 20 (`correction-chase-hindi-human-review`, `closed`) covered three keys only ⇒ a NEW launch-gate row
  **21** `certificate-reminder-hindi-human-review` (`open`), the row-20 precedent, citing Task 0's decision id; the hi copy ships with a
  `$comment` *"agent-authored, ⛔ not yet human-reviewed"*. ⛔ None blocks a build.
- **CR14 — Nothing else moves.** ⛔ No new claim event, lifecycle state, `AlertCategory` or `SMS_DLT_TEMPLATE_REGISTRY` entry; ⛔ no edit to
  `packages/channels/src/{dispatch,render,sms-dlt-registry}.ts`; ⛔ no change to `claim_correction_*` schemas or migrations (0126–0136 are
  applied — ⛔ never edited), to 6.19b/6.19c's openers, resolvers, sweeps or children, to `recordDeathCertificateReview`, the upload handlers,
  the OCR job, `isDeathCertificateReplacementRequested`'s behaviour, or any approval / refusal / closure predicate. ⭐ **The permitted edits
  outside this story's new files are exactly the *UPDATE* list in Dev Notes** (the template registry's union + entries; the barrels and
  registrations; the doc-blocks marking the superseded *"6.19d adds its own kind"* comments — ⛔ never 0127's SQL comment; exporting, unchanged,
  a helper CR8 reuses; the tests and gates Trap 10 names; the docs of Tasks 0 and 7–11). AC9 audits the diff against that list.
- **CR15 — The UX spec's filing-time SMS is ⛔ not built** (Trap 8) — an annotation, ⛔ not a rewrite.

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Given** this story is about to be built **Then** ONE author-commit decision recording **CR1–CR15** — stating CR1's supersession of `-266`
§1's two 6.19d sentences, CR10's departure from shared-spec D11, the non-application of shared-spec T12 to CR6, `-275`'s ruling of Q1–Q4 (cited for
the person-facing halves of CR2, CR3, CR5 and CR9 — ⛔ no confirm still owed), launch-gate row 21, and that ⛔ no Trustee-ratified clause moves; and recording, for
the record, that the routing note's E3 described 6.19b's recipients as *"the people the family agreed may be contacted"* while 6.19b texts
the effective declaration (T12) — the reading CR6 follows — is in `.decision-log.md` (⭐ **BigDev inserts it** —
[[project_decision_log_writes_user_inserted]]: draft it, hold every code edit until it is on disk, verify `git diff --numstat` is
additive-only and equals the draft's line count) **before any code** ([[feedback_governance_commits_precede_implementation]]); **and** the
shared spec's D3 and D11 carry a `⚠ see 6.19d CR1 / CR10` marker, its T12 a `⚠ governs 6.19b; 6.19d's recipients are CR6` marker, and its
status table's 6.19d row reads `ready-for-dev` (⛔ no ratified text edited); **and** the UX spec carries CR15's annotation; **and** ⛔ no
6.19b/6.19c Change Log row is rewritten.

### AC1 — The runs: two causes, their anchors, discovery by the sweep (CR1–CR3)
**Given** a claim in `CLAIM_REVIEW_WINDOW_STATES` whose current certificate is rejected, or which has ⛔ no certificate **When** the 10:00 IST
sweep runs **Then** exactly one run opens — `rejected` anchored on the current `upload_id` (+ the rejecting `review_id`), day 0 = the IST date
of that review's `decided_at`; or `missing`, day 0 = the IST date of the claim's earliest `claim.peer_mesh_pinged` — **and** a re-rejection
of the **same** upload opens ⛔ no new run, a rejection of a **different** upload opens a new run that ends the old one `superseded` in the
same transaction (`-260` G5; ⭐ `open` wins over `certificate_received`), a never-sent wait turning into a first rejection opens a `rejected`
run (Q3), a second `missing` run is impossible (UNIQUE; a 23505 is "exists", ⛔ never a crash), at most one run per claim is open (partial
UNIQUE), **and** a claim in `intake_converged` / `documents_pending` (still filing) gets ⛔ no run (`-259` detail 3).

### AC2 — The schedule, the stops and the pauses (CR4, CR5)
**Given** an open run **Then** family SMS slots fall on days 1–7, 10, 14, 17, 21, 24, 28, 31, 35, 42, 49, 56, 63, 70, 77, 84, **120, 150, 180**
— `CORRECTION_REMINDER_DAYS` imported, ⛔ not copied — at 10:00 IST, ⛔ nothing on day 0, ⛔ nothing after day 180; a missed slot is caught up
once (`late`), older ones `skipped_superseded`, ⛔ no burst; **and** the sweep visits every OPEN run (⛔ not only claims whose status is still
`rejected`/`missing`), ending it `certificate_received` the first sweep after a new certificate becomes current (unless a new run is due),
`completed` once its run day is past 180; **and** it **pauses** (⛔ no send, ⛔ no record) while the claim is outside the review window or the
anchor upload stands accepted, and resumes with ONE `late` on re-entry or re-rejection, counting from its own day 0 (Q2, Q4); **and** a
correction return, mark or Super Admin hold ⛔ neither pauses nor ends it; **and** a run past day 180 ends `completed` even while paused, a
missed day-180 sweep is ⛔ not caught up, and a run whose day 0 is more than 180 days back is opened and ended `completed` in one transaction
with ⛔ no send.

### AC3 — The text message (CR6–CR8)
**Given** a due slot **Then** each person on the contact record (each nominee person, at their chain head's mobile; the claimant block when
present) is sent ONE `certificate_reminder` SMS through `sendClaimCorrectionSms`, in `contact_locale`, carrying only the short reference and
the Pariwar's helpline number — ⛔ no name, reason or deadline — recorded `accepted` / `rejected_invalid_number` / `rejected_unreachable` /
`no_target` / `error` with `provider_message_id` and `recipient_number_hash`, ⛔ never `delivered`; **and** one number is texted at most once per slot, by the lowest person key sharing it (`same_number_in_slot`; the race test); **and** ⛔ no contact record or an agreement ⛔ not live ⇒ ⛔ no send, ⛔ no
record, the "cannot remind" flag (⛔ never `undetermined`, ⛔ never the effective declaration); **and** a missing template id / helpline number
/ gateway fails CLOSED (`error` + alarm, ⛔ never a fixture `accepted`); **and** the at-least-once lifecycle (attempting → send → CAS with
`moved` checked, lease, crossed-midnight expiry, exhausted-row finaliser) holds, under the claim-row lock with `lock_timeout` set first and
⛔ no KMS call inside it; **and** once a letter to ANY person at a number is delivered, ⛔ no further SMS goes to that number on the claim, until a
person's number changes.

### AC4 — The one letter (CR9)
**Given** a person letter-eligible on the claim **When** the District Admin records a letter (posting date, tracking number) and later its
delivery date + screenshot **Then** it is recorded under key (1), at that person's own address (shown only behind a fresh step-up, one audit
line per reveal), with the overdue flag shown at posting + 14 days; **and** a second letter for that person on the claim — in the same run or
a later one — is refused `409 certificate_letter.already_recorded` (✅ `-275` Q1 A — one per claim, ever); each other refusal in CR9 answers its own
code; **and** a letter can still be recorded after the run ended.

### AC5 — The District Admin (CR10, CR11)
**Given** a letter-eligible person with ⛔ no letter on the claim, while the run is open and ⛔ not paused **Then** the District Admin's chase
records fall on found-dead + 7 … + 12, and on +13 an escalation RECORD naming every Pariwar Admin (ONE per person per found-dead epoch — the day-key
UNIQUE is its backstop; ⚠ delivered to ⛔ no Pariwar Admin in v1, shown on the list and ⛔ never worded as sent or notified); the chase
dedupes across runs, a due date before the run's day 0 is written at today's slot, and a late chase and a late escalation may fall on one
morning; a chase carried across runs is written at today's slot, ⛔ never
negative;
⛔ none while paused or after the run ends; **and** the "Certificate reminders" list shows each claim with an open run or an owed / undelivered letter (any run) by short reference with its cause,
day, next reminder (or which pause), each person **by position and role** with their state, the "cannot remind" flag and the letter form —
⛔ no name, ⛔ no plaintext outside the step-up form; **and** the list is gated by `resolveQueueScopeStash(key (1))` + `requirePermissionHook(key (1), district)` + a per-row district
filter, every per-claim route by `resolveDistrict` + key (1), the catalog stays **50 / 64**; **and** ⛔ no staff push is sent and ⛔ nothing is
sent to staff after day 180.

### AC6 — ⛔ Never refused, closed or time-limited (invariants 1, 2; CR12)
**Given** a claim whose only open matter is a certificate wait **Then** `requestCorrectionClosure` answers **409 `closure.no_live_return`**;
**and** a claim with BOTH a live family correction return and a certificate run has an identical `readClosureReadiness` +
`resolveCorrectionChase` result with and without the certificate rows; **and** after day 180 the claim is unchanged in state and still
approvable once a certificate is accepted; **and** the source-scan fence (the `claim-correction-closure-no-decision.test.ts` model, with a
positive control) proves ⛔ no module of this story calls a decision writer or emits a claim event.

### AC7 — The words, the DLT sheet and the go-live rows (CR7, CR13)
**Given** the copy **Then** `certificate_sms.reminder` exists in `packages/i18n/locales/{en,hi}/claim.json` with `{reference}` then
`{helpline}`, and a flat `$comment.certificate_reminder` in **both** locales (the `$comment.correction_chase` convention; en ↔ hi parity):
- **en:** *"Claim {reference}: your family's claim still needs a death certificate that clearly shows the date of death. Please send it in
  the app, or call the helpline on {helpline}. Your claim is still open."* (197 characters rendered with an 8-character reference and a
  13-character number ⇒ **2 GSM segments**). ⭐ It states the requirement every certificate must meet (`-236` BB), ⛔ never why one was
  refused; the helpline line serves the people outside the app (`-259` detail 2).
- **hi:** *"दावा {reference}: आपके परिवार के दावे के लिए ऐसा मृत्यु प्रमाणपत्र चाहिए जिसमें मृत्यु की तिथि स्पष्ट हो। कृपया ऐप से भेजें या हेल्पलाइन
  {helpline} पर कॉल करें। आपका दावा अब भी खुला है।"* (185 characters ⇒ **3 Unicode segments**) — ⭐ the house words **`तिथि`** and
  **`प्रमाणपत्र`** (`-244` §3 call 7; the shipped `certificate.replacement_body`); ⚠ agent-authored — its `$comment` says *"⛔ not yet
  human-reviewed — go-live gate row 21"*;

**and** `apps/jobs/tests/claim-correction-sms-templates.test.ts` covers the third message (the real `t()` renders exactly the registered
text, the variables in order, the deny-list in **both** locales, the sheet carries text + key); **and** the microcopy gate passes (⛔ no
deadline, panic or dunning word; ⛔ no Devanagari digits); **and** the DLT sheet's rows 5–6 carry the config keys, the registered texts, the
slots, 6.19d's own cost line (*per contact-record person (CR6), ≤ **25** slots per rejected certificate — 22 + 3 — a G5 restart starts a new
25*) and a Record row (⛔ not "submitted" — still ⛔ not started); **and** `inventory-roster.md` gains row **21** (`open`).

### AC8 — PII, audit, tenancy (shared spec AC9 restated for this slice)
**Given** any of this story's writes or reads **Then** a mobile is decrypted only to send it (the SMS child) or to hash it (the child, the sweep, the
list and the letter routes — CR8) — the plaintext ⛔ never leaves the function, ⛔ never logged, echoed or put in a job payload (ids only); the tracking number is Tier-1 (`piiColumn(1, …)`), encrypted in the handler; every address reveal, **screenshot
read** and letter write is audited with `resourceLocator: 'claim:<lower-case uuid>'`; ids are lower-cased at the boundary
([[project_branded_ids_lowercase]]); every table has RLS + FORCE with a policy-regression spec (cross-Pariwar read/insert/update refused, ⛔ no
DELETE grant, the cause/purpose/outcome/end-reason CHECKs, the UNIQUEs); **and** the erasure sentinel (`[anonymized]`) or a null / invalid
number ⇒ `no_target`, while a decrypt or KMS failure ⇒ a transient retry, then on the final attempt a recorded `error` row (`exhausted:hash_failed`, NULL hash)
+ alarm (CR8) — ⛔ never a crash, ⛔ never `no_target`, ⛔ never an unrecorded slot.

### AC9 — Nothing else moves (CR14)
**Given** the diff **Then** every changed file outside this story's NEW files is on the Dev Notes *UPDATE* list; `packages/channels/src` diff
is empty; the permission catalog is **50 / 64**; `correction-schedule.test.ts`, the purpose-lockstep spec and every 6.19b/6.19c/6.21a/6.21b
suite pass unmodified (except the three Trap 10 names); 6.19b's and 6.19c's two SMS render byte-identically; and
`isDeathCertificateReplacementRequested` is unchanged.

### AC10 — The proof, and the records (Tasks 8–10)
**Then** the suites in *Testing* exist and each new test was shown to fail before its code (the 6.19b/6.19c practice); the live-DB specs
carry `{ timeout: 20000 }`, own-commit, assert **membership**, ⛔ not counts ([[project_live_db_test_gotchas]]); a green turbo run is ⛔ not
claimed as proof where a spec self-skips without `DATABASE_URL`; **and** the fallback ledger, the surface inventory and `deferred-work.md`
carry the Task 8–9 records, and `epics.md` §6.21a / §6.19d carry Task 11's annotations.

## Tasks / Subtasks

- [x] **Task 0 — Governance first (AC0).** ⛔ No code before it lands.
  - [x] 0.1 `git diff --name-only 06b3ebdf..HEAD -- packages apps scripts docs`; re-read anything cited here that moved. `git log 06b3ebdf..HEAD -- .decision-log.md` — read any new entry for `6.19d`, `certificate`, `claim_correction_runs`, `sendClaimCorrectionSms`; grep any routing note dated after 2026-10-03 for `6.19d` / `certificate`.
  - [x] 0.2 Draft the author-commit (next free id; Decision type **author-commit (BigDev)**; §0: the author's, with Q1–Q4's person-facing halves cited to `-275` (Trustee-ratified); everything AC0 lists; Consequences: 6.19d may build; the shared spec and two code comments marked; ⛔ no confirm still owed; ⛔ no status flip) to the scratchpad; BigDev inserts it above the newest `### Decision`; verify additive-only; commit `governance(6.19d): …` **alone**, first.
  - [x] 0.3 Mark the shared spec (`6-19-correction-return-reminders-and-closure.md`): D3's *"6.19d adds its own kind's days"* → `⚠ SUPERSEDED by <id> CR1 — 6.19d has its own tables`; D11 → `⚠ 6.19d sends ⛔ no staff push (<id> CR10)`; T12 → `⚠ governs 6.19b; 6.19d's recipients are CR6`; the status table's 6.19d row → `ready-for-dev` (and its stale 6.19c row → `done`); a Change Log row. ⛔ No ratified text edited.
  - [x] 0.4 Annotate `ux-design-specification.md` Journey 2's deferred-upload SMS and `<ClaimDocumentUpload>`'s deferred state (CR15): *"⛔ Not built — `-259` detail 3 rules no reminder while filing; see Story 6.19d."* Annotation only.
- [x] **Task 1 — Migrations + schema + RLS (AC1, AC4, AC8; CR1).** Next free numbers (**0137** at `06b3ebdf` — read `packages/domain/migrations/` and `meta/_journal.json` live; the journal steps `when` by +86 400 000 per entry). Hand-authored SQL, the 0127/0128/0134 headers as models (what, why, the CHECK/UNIQUE list, the grants). Drizzle schema in a NEW `packages/domain/src/schema/claim_certificate_reminder.ts`, TS mirrors of every CHECK list in LOCKSTEP (with a DB ↔ TS lockstep test, the 0135 precedent); RLS file(s) under `packages/domain/src/policies/`; register in both indexes. ⛔ Never edit 0126–0136.
- [x] **Task 2 — Domain: the schedule and the runs (AC1, AC2; CR2–CR6).**
  - [x] 2.1 NEW `packages/domain/src/claim/certificate-reminder-schedule.ts` — `CERTIFICATE_REMINDER_MONTHLY_DAYS`, `CERTIFICATE_REMINDER_DAYS` (spread of the imported `CORRECTION_REMINDER_DAYS`), `CERTIFICATE_RUN_HORIZON_DAYS = 180`, `certificateReminderSchedule(day0)`, `isCertificateRunPastHorizon` (`runDay > 180`); reuse `istDateOf` (re-exported by `correction-schedule.ts:113`), `addCalendarDays` (from `cycle-calendar/holiday-resolver.ts`), `calendarDaysBetween`, `correctionCatchUp`.
  - [x] 2.2 NEW `packages/domain/src/claim/certificate-reminder.ts` — the sweep's two keyset-paged, `clampLimit`-ed readers (open runs; window claims with ⛔ no open run), the per-claim status via `readDeathCertificateSnapshot` + `deathCertificateStatus` + `isInDeathCertificateReviewWindow` (`death-certificate-approval.ts:164`), the earliest `claim.peer_mesh_pinged` read; a pure `planCertificateRun(facts, openRun, latestRunForUpload)` → `open(cause, anchor, day0, { completeAtOnce: runDayToday > 180 }) | end(reason) | pause(reason) | continue` with CR5's precedence; `openCertificateRun(plan)` / `endCertificateRun` under the claim-row lock: ⭐ the opener re-reads, under the lock, the claim's open run and
    the latest run for the anchor upload — if either differs from what the plan saw it returns `stale` (⛔ no write; the next sweep re-plans);
    it then takes a raw `SAVEPOINT` **BEFORE** ending the old run, ends exactly the planned `run_id` (CAS `WHERE run_id = $1 AND ended_at IS
    NULL`, `moved` checked) and inserts the new run; a 23505 ⇒ `ROLLBACK TO SAVEPOINT` (the end AND the insert) and "exists" — ⛔ never an old
    run ended without its successor ([[project_domain_limit_clamp_and_savepoint_retry]]).
  - [x] 2.3 The recipients (CR6): `readCertificateRecipients(db, pariwarId, claimCaseId)` → `{ cannotRemind: 'no_contact_record' | 'agreement_not_live' | null, people, contactLocale }` and a pure `chainHeadOf` (unit-tested on a linear chain, a fork, a vacated head, two roots for one human).
  - [x] 2.4 Person state (CR8) — an adapter onto `evaluatePersonRunState` / `isEvidentialReminderRow` / `DEAD_OUTCOMES` / `compareReminderRowsByTime` across the claim's runs.
- [x] **Task 3 — Domain: the letter (AC4; CR9).** NEW `packages/domain/src/claim/certificate-letter.ts` on `closure-letter.ts`'s shape: `CertificateLetterRefusal`, `assertCertificateLetterAllowed`, `recordCertificateLetter` (23505 → `already_recorded`), `recordCertificateLetterDelivery`, `listCertificateLetters`, `readCertificateLetter`; export from `packages/domain/src/claim/index.ts`.
- [x] **Task 4 — Jobs: the sweep and the child (AC1–AC3, AC5; CR4, CR7, CR10).**
  - [x] 4.1 `claim-correction-sms-templates.ts`: add `'certificate_reminder'` (both locales, config keys, `certificate_sms.reminder`).
  - [x] 4.2 NEW `apps/jobs/src/scheduler/claim-certificate-reminders.ts`: `runCertificateReminderSweep` (finalise exhausted `attempting` rows; page open runs ∪ candidates; plan/open/end/pause; enqueue one child per (run, slot, person) with ids only; write the staff chase/escalation rows — ⛔ no skip markers for staff slots, the 6.19b collision lesson), `runCertificateFamilySmsChild` (CR7's lifecycle; hash the number BEFORE the lock; under the claim-row lock re-check CR5 + CR6 + the same-number skip + the delivered-letter stop), `registerClaimCertificateReminderWorkers` (cron `'0 10 * * *'`, `tz: 'Asia/Kolkata'`, an explicit retry policy as 6.19b's — child 4 tries / 60 s / backoff; sweep 2 / 60 s / backoff — and a per-tick budget and `expireInSeconds` as 6.19b's).
  - [x] 4.3 Queue names in `packages/queue/src/index.ts`; wire into `apps/jobs/src/boot.ts` beside `registerClaimCorrectionReminderWorkers`.
- [x] **Task 5 — API + contract (AC4, AC5, AC8).** NEW `packages/contracts/src/claims/certificate-reminder.ts` (`.strict()` DTOs; snake_case on the wire, the 6.19b contract's convention; ⛔ never import `@twt/domain` — [[project_contracts_domain_bundle_boundary]]), exported from `packages/contracts/src/claims/index.ts`; NEW `apps/api/src/modules/claims/claims.certificate-reminder.{routes,handlers}.ts`, registered in `apps/api/src/modules/claims/index.ts`: `GET …/admin/certificate-reminders` (the list — `resolveQueueScopeStash(key (1))` + `requirePermissionHook(key (1), district)` + the per-row district filter), `POST …/admin/claims/:claimCaseId/certificate-reminders/letters`, `POST …/letters/:letterId/delivery` (multipart), `GET …/letters/address` (fresh step-up), `GET …/letters/:letterId/screenshot` (⭐ the SAME fresh step-up — 6.19c's 2026-10-02 review patch: a delivery photo plausibly shows the name and address) — per-claim routes `resolveDistrict` + key (1); an exhaustive `never` switch over `CertificateLetterRefusal`; add the route file to `scripts/claim-adjudication-human-actor-invariant/check.ts` (`pathSubstrings: ['certificate-reminders']`, `expectedMethods: ['get','post','post','get','get']`) and raise `COVERAGE_FLOOR` 15 → 16 with the reason in its comment. Response schemas are PARSED (`serializerCompiler`) — ⛔ never reuse an input-tightened field on an output (footgun #29(a)).
- [x] **Task 6 — Admin (AC5).** NEW route `/p/$pariwarId/certificate-reminders` + module `apps/admin/src/modules/certificate-reminders/` (list + letter form, copying `ClosureLettersOwed` and its form; its own `i18n-en.ts`); hooks + client in `apps/admin/src/api/{hooks,client}.ts`; the route in `router.tsx`; nav link in `routes/RootLayout.tsx` (Pariwar context only). ⚠ Test the success banner with a REAL refetching `useQuery` ([[project_tanstack_onsettled_before_success]]); disable the submit while the mutation **or** its refetch is pending (the 6.19b double-submit finding).
- [x] **Task 7 — Copy, the DLT sheet, the go-live row (AC7; CR13).** `claim.json` en + hi (+ `$comment.certificate_reminder` in both); extend the template test's `CASES`; the DLT sheet rows 5–6 (keys, texts, slots, cost, Record); `inventory-roster.md` row 21; run the microcopy gate and the i18n parity check.
- [x] **Task 8 — Records (AC10; CR13).** `docs/fallback-handler-ledger/ledger.md`: row 19's `surface_inventory_xref` via the rows-9–19 note (*"Amended … by Story 6.19d"*) **and** a §7 revision row superseding row 19's trigger (+ `rejected_unreachable`, `-269` §4) and fallback (District Admin; the found-dead + 13 escalation is RECORDED, ⛔ not delivered in v1 — ⛔ no push, ⛔ no Pariwar-Admin surface), citing Task 0's decision id (rows are append-only — supersede, ⛔ never edit); `docs/degradation-policy/surface-inventory.md`: a Tier-2 row **Certificate reminders list** (+ its letter form), `degraded-mode` — the sweep keeps running, ⛔ no claim is refused or closed; `permissions.ts` key (1) doc-block (CR11) — ⛔ no catalog bump.
- [x] **Task 9 — `deferred-work.md` (AC10; a new "Recorded during Story 6.19d" section):** the OCR-stall case (Trap 3 — ⭐ cross-reference the existing OCR-parity retry/decrypt items, ⛔ no duplicate); the zero-candidate peer-mesh stall (Trap 6); the T12 legacy `missing` and the tolerance path (Trap 6); ⛔ no staff push, and so the day-13 escalation reaches ⛔ no Pariwar Admin (CR10; trigger: an admin client that registers a device token, or a Pariwar-Admin view); the at-least-once double SMS (inherited; trigger: a gateway idempotency key / DLR seam); ⛔ no virus scan on the letter screenshot (D6); ⛔ no RTBF path on the new tables (T8's class); ⛔ no staff prompt to call a dead-phone family after a second rejection (CR10; `-275` "does NOT cover"; trigger: a staff call-task seam);
⛔ not Q1–Q4 (✅ ruled by `-275` — discharged, ⛔ nothing to defer).
- [x] **Task 10 — Tests (AC6, AC9, AC10)** — see *Testing*. Then `pnpm -w typecheck`, lint, the domain / jobs / api / admin / contracts / i18n suites and `ci:local` (⚠ [[project_ci_local_double_run_pollution]], [[project_known_livedb_test_failures]] — a known flake is named, ⛔ never silently re-run).
- [x] **Task 11 — Close-out (AC0's records).** `epics.md` §6.21a: an appended annotation *"coupling (2) DISCHARGED BY THE BUILD — Story 6.19d"*, and §6.19d: *"ACs derived 2026-10-03; built …"* (annotations only; ⚠ §6.19d's header and ledger row 19 say *"`-260` G4–G6"* — recorded, ⛔ not rewritten: G4 is the correction twin); the shared spec's header line on 6.19d left as written. Status → `review`.

### Review Findings — chunk 1/5: domain layer (2026-10-03)

> `bmad-code-review` run 2026-10-03, baseline `06b3ebdf`..HEAD, chunk 1 of 5 (`packages/domain` only — 22 files, 4046 insertions; `packages/contracts`+`packages/queue`+`packages/i18n`, `apps/api`, `apps/jobs`, `apps/admin` and `docs` queued as chunks 2–5), 3 layers run SEQUENTIALLY (Blind Hunter → Edge Case Hunter → Acceptance Auditor, all read-only). Every load-bearing claim below was re-traced by hand against the tree before triage (not taken on a subagent's word) — reachability for the escalation-keys and CASCADE-delete findings, the exact enum values for the smsState/"error" claim, the one live caller for the empty-admin-keys claim, and the doc comment for the future-dated-letter claim. 4 decision-needed, 15 patch, 3 defer, 3 dismissed (false positive or working-as-designed, kept here rather than silently dropped). ⚠ **Post-triage, after applying:** all 4 decisions resolved (one — the refusal-code taxonomy — became a 5th patch); 12 of the 15 patches applied as code/test changes, 2 reclassified to defer mid-implementation (the N+1 and the `SET LOCAL` string-interpolation both turned out to have direct precedent as 6.19c `[Defer]` items for the identical pattern elsewhere in this codebase), 1 reclassified to dismissed after the "fix" was itself caught by its own regression test (the CASCADE→restrict change was reverted — see that item for the live-DB trace). Final: 0 open decisions, 13 applied patches, 5 defer, 4 dismissed.

- [x] **[Review][Decision] Conflated/inconsistent refusal codes in `certificate-letter.ts` — FIXED 2026-10-03.** `recordCertificateLetter` threw `'no_run'` (also meaning "no certificate run exists") and `recordCertificateLetterDelivery` threw `'not_found'` (also meaning "letter row doesn't exist") for the SAME underlying cause — the claim-row lock returning null. BigDev chose to fix now rather than defer: nothing is in production, and Task 5's exhaustive `never` switch over `CertificateLetterRefusal` in `claims.certificate-reminder.handlers.ts` forces every consumer to catch up at compile time rather than drift silently. Added a new `'claim_not_found'` member to `CertificateLetterRefusal`; both lock-returns-null branches now throw it, leaving `'no_run'` scoped only to "no certificate run exists" and `'not_found'` scoped only to "letter row doesn't exist." Added the matching `case 'claim_not_found'` to the handler's exhaustive switch (`NotFoundError`). No test asserted on either lock-null branch, so nothing broke; contracts has no mirrored enum to update. Verified: domain + api typecheck clean. [`packages/domain/src/claim/certificate-letter.ts:47,218,282`, `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts:60-61`]
- [x] **[Review][Decision] Fail-open hash lookup in the one-text-per-number dedup check — RESOLVED 2026-10-03: confirmed correct by design, no code change.** `beginCertificateFamilySend`'s `lower` check treats a lower-keyed person with a failed hash lookup as not-matching. Traced the full call chain: both the sender path and the letter-eligibility path call `lockCertificateClaim`'s `SELECT … FOR UPDATE` on the claims row as their FIRST operation, before any hash check — and every recipient of one claim shares that same row. This fully serializes every person's send-attempt for a given claim; there is no window where two people sharing a number can both pass the `lower`/`taken` checks concurrently. The fail-open behavior only changes *which* person gets picked as sender when the usual lowest-key ordering can't be computed (a permanently bad ciphertext falls through to the next-lowest person who CAN be hashed, rather than nobody ever being reminded) — it cannot produce a double-send. No code change; the claim-row lock is the actual backstop, not the hash comparison. [`packages/domain/src/claim/certificate-reminder-record.ts:421-435`]
- [x] **[Review][Decision] Undocumented third pause reason `'certificate_not_rejected'` — RESOLVED 2026-10-03: confirmed unreachable by construction, documented, no behavior change.** Traced `recordDeathCertificateReview` (`death-certificate-review-persist.ts`): it always supersede-and-inserts atomically with a concrete verdict (⛔ never a pending/verdict-less row), and its own token check (step 3) forces every new review to target the claim's CURRENT upload. So while the certificate-reminder run's anchor upload stays current, a live review for it can never go missing or point elsewhere — the only two reachable non-`'rejected'` outcomes for the SAME anchor upload are `'accepted'` (already named, `certificate_accepted`) or nothing (the run already ended via the earlier `received` check). Added a doc comment on `CERTIFICATE_PAUSE_REASONS` recording this trace and why the value is kept anyway (nothing in the type system proves it impossible; a defensive fallback, not dead code to delete). CR5's prose is illustrative, not a closed list — no spec edit needed. [`packages/domain/src/claim/certificate-reminder.ts:173-181`]
- [x] **[Review][Decision] `NEVER_REENTERS` includes `'state_trustee_approved'` — RESOLVED 2026-10-03: confirmed correct, no code change.** Traced `claim/state.ts`'s transition table: the ONLY transitions out of `'state_trustee_approved'` go to `'approved'` (forward), back to itself (R9 identity), or to `'denied'` (forward) — none re-enter `CLAIM_REVIEW_WINDOW_STATES`. The claim can never come back into a certificate-reviewable window from this state, exactly matching `NEVER_REENTERS`' purpose. CR11's `approved`/`settled` were examples, not an exhaustive list — the code's broader inclusion is more precise than the spec's prose, not a deviation from it. No code or spec change. [`packages/domain/src/claim/certificate-reminder-read.ts:41`]

- [x] **[Review][Patch] ✅ APPLIED — `samePlan` omits `completeAtOnce` from its equality check**, so a re-plan under the claim-row lock could report "same plan" while `completeAtOnce` actually differed, inserting using the caller's stale value. Added `&& a.completeAtOnce === b.completeAtOnce` to the comparison. Verified: domain typecheck clean, full suite green. [`packages/domain/src/claim/certificate-reminder.ts:331-340`]
- [x] **[Review][Patch] ✅ APPLIED — zero test coverage for the entire 7-function claim/send/finalize state machine.** Added `tests/integration/claim/certificate-reminder-send.spec.ts` (20 tests, live DB): the golden send path, every `beginCertificateFamilySend` skip/noop branch (`not_due`, `not_a_recipient`, `letter_delivered`, `same_number_in_slot` via both `lower` and `taken`, `no_target`, `noop:paused`, `CertificateRecipientsMovedError`), the lease-based compare-and-set (same-job re-claim, another-job `held_by_other` → re-claim after the 10-minute lease, `already_final`), `finaliseCertificateReminder`/`expireOwnCertificateReminder`'s lost-CAS `false` returns, `skipCertificateReminder`'s three branches (including 6.19b's K4 exhausted-recheck leg), `noteCertificateReminderTransient`, and `recordCertificateHashFailure`'s three cases. ⛔ Not the two concurrent-connection races (child vs review writer, child vs OCR job) — those stay in `deferred-work.md` per the story's own self-disclosed gap. Verified live: 20/20. [`packages/domain/src/claim/certificate-reminder-record.ts`]
- [x] **[Review][Patch] ✅ APPLIED — zero test coverage for `certificate-reminder-read.ts`.** Added `tests/integration/claim/certificate-reminder-list.spec.ts` (11 tests, live DB): the basic shape, every `smsState` bucket (`reminded`/`number_not_working`/`unreachable`/`no_number`/`not_sent`/`letter_delivered_no_sms`), `nextReminderOn`'s "due today" case, the `NEVER_REENTERS` listing gate (both excluded-by-default and kept-listed-via-an-owed-letter), and `listCertificateReminderClaims`'s `truncated` flag. Verified live: 11/11. [`packages/domain/src/claim/certificate-reminder-read.ts`]
- [x] **[Review][Patch] ✅ APPLIED — `nextReminderOn`/`runState` could look stale** when `plan.kind` is `'end'`/`'open'` or exactly on a due slot day. `runDay`/`nextReminderOn` now stay `null` when the plan says `end`/`open` (the run is ending/being superseded next sweep, so no further slot of THIS run will fire); the schedule lookup now uses `>=` instead of `>` so a slot due today still reads as "next" rather than skipping to the day after. Covered by both new test files above. Verified live. [`packages/domain/src/claim/certificate-reminder-read.ts:145-157`]
- [x] **[Review][Defer] Potential N+1 in `listCertificateReminderClaims`** (~5 extra queries × up to `CERTIFICATE_LIST_SCAN_CAP` claims) — **reclassified from patch to defer mid-review**: this has direct precedent in 6.19c's own review for the analogous `getClosureLettersOwed` ("deferred, bounded by `CLOSURE_QUEUE_MAX_LIMIT` today"). A real fix needs bulk-read variants of 5 separate domain readers (plan facts, recipients, family rows, letters, staff rows) — a bigger lift than a review patch, and not demonstrated as a live issue at current Pariwar scale. Carried to `deferred-work.md`. [`packages/domain/src/claim/certificate-reminder-read.ts:95-150`]
- [x] **[Review][Dismiss — investigated and reverted; false positive] `ON DELETE cascade` on `anchor_upload_id`/`anchor_review_id`.** Applied as a `restrict` patch (migration 0140) first, then caught by the regression test I wrote for it: both anchor tables carry a BEFORE DELETE trigger (Story 6.21a, `-243` invariant 3) that refuses ANY direct DELETE/UPDATE for every role, the table owner included, with an explicit `pg_trigger_depth() > 1` carve-out that still lets a legitimate `claims`-row cascade through. The death-certificate policy-regression spec already asserts this directly (`claim-death-certificate-policy-regression.spec.ts:376`, "the append-only TRIGGERS refuse the table OWNER too"), and that file's own header states outright: *"the uploads table is append-only for EVERY role, the table owner included — only an `ON DELETE cascade` passes."* `cascade` was 6.21a's deliberate, ratified design, not a gap — `restrict` would have added no protection (the trigger already blocks every direct path) while breaking the legitimate claims-deletion cascade. **Reverted**: dropped migration 0140, restored `cascade` on both FKs (live DB + `src/schema/claim_certificate_reminder.ts`), with a comment recording why. No residual code change. [`packages/domain/migrations/0137_claim-certificate-reminder-run.sql:32-33`]
- [x] **[Review][Patch] ✅ APPLIED — `outcome`/`purpose` pairing had no CHECK constraint.** Traced every call site in `certificate-reminder-record.ts` and `apps/jobs/src/scheduler/claim-certificate-reminders.ts` for the exhaustive mapping actually produced (`family_sms` ↔ 7 outcomes excluding `recorded`; `letter_chase`/`letter_escalation` ↔ `recorded`/`no_target` only). New migration `0141_claim-certificate-reminder-purpose-outcome-check.sql` (0138 is applied and ⛔ never edited) adds `claim_certificate_reminders_purpose_outcome_check`; mirrored in `schema/claim_certificate_reminder.ts`; added a regression test (`claim-certificate-reminder-policy-regression.spec.ts`) proving both wrong-pairing rejections and both correct pairings. Verified: no existing row violated it before applying; live suite 48/48 (was 47/47). [`packages/domain/migrations/0141_claim-certificate-reminder-purpose-outcome-check.sql`]
- [x] **[Review][Patch] ✅ APPLIED — redundant duplicate `readCertificateRecipients` call.** `evaluateLetterPrecondition` now takes `recipients` as a parameter instead of re-fetching internally. `assertCertificateLetterAllowed` (no lock — the duplicate was genuinely redundant there) passes its one read straight through; `recordCertificateLetter` keeps its intentional TWO reads (before the claim-row lock, for CR7's hash-before-lock rule, and again under the lock for the recipients-moved staleness check) — only the call site changed, not the count. Verified: domain typecheck clean, full suite green. [`packages/domain/src/claim/certificate-letter.ts:106,146,220`]
- [x] **[Review][Patch] ✅ APPLIED — `chainHeadOf`'s cycle fallback checked the unfiltered `children` list instead of the seen-filtered `kids`.** Fixed: `if (kids.length === 0) leaves.push(at);`. Two independent review layers caught this one independently. Verified: full suite green. [`packages/domain/src/claim/certificate-reminder.ts:565-575`]
- [x] **[Review][Patch] ✅ APPLIED — `as never` bypassed Drizzle's insert typing** for the conditional `endedAt`/`endReason` spread. Removed the cast entirely — it typechecks clean without it; it was never needed. [`packages/domain/src/claim/certificate-reminder.ts:400`]
- [x] **[Review][Patch] ✅ APPLIED — duplicate stacked JSDoc comment on `CERTIFICATE_CANNOT_REMIND_REASONS` silently dropped the first block from tooling.** Merged into one `/** … */` block. [`packages/domain/src/claim/certificate-reminder.ts:495-507`]
- [x] **[Review][Defer] String-interpolated `SET LOCAL lock_timeout`** — **reclassified from patch to defer mid-review**: grepping the full codebase found this EXACT pattern used a dozen+ times across `apps/jobs` (`CORRECTION_PLAN_LOCK_TIMEOUT`/`CORRECTION_PLAN_STATEMENT_TIMEOUT`), always with a hardcoded module constant. 6.19c's own review hit the identical finding and deferred it ("deferred, currently safe (fixed constants only)"). A one-off guard here would be inconsistent with the established codebase-wide convention. Carried to `deferred-work.md`. [`packages/domain/src/claim/certificate-letter.ts:215,279`]
- [x] **[Review][Patch] ✅ APPLIED — `skipCertificateReminder`'s second update path didn't check affected-row count**, unlike the project's own established lost-CAS pattern (the doc comment two functions below it cites "6.19c's lost-CAS finding" for `finaliseCertificateReminder`). Added `.returning()`; on a lost CAS (the row's `detail` went non-null concurrently, between the read and the write), it now re-checks once through `expireOwnCertificateReminder` instead of silently leaving the row stuck un-expired. Verified: full suite green. [`packages/domain/src/claim/certificate-reminder-record.ts:198-220`]
- [x] **[Review][Patch] ✅ APPLIED — `CERTIFICATE_LIST_SCAN_CAP` truncation raised no alarm**, unlike the identical `admins.truncated` pattern this same PR adds in `apps/jobs`. `listCertificateReminderClaims` now returns `{items, truncated}` (matching the established `listAdminsByRole`-style domain convention — the caller decides how to surface it, not the reader). The one caller (`getCertificateReminders` handler) logs a warning and records `scan_truncated` on its audit line. Verified: domain + api typecheck clean, `certificate-reminder.spec.ts` (api) 6/6. [`packages/domain/src/claim/certificate-reminder-read.ts:91-121`, `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts:159-179`]
- [x] **[Review][Patch] ✅ APPLIED (documentation only, no behavior change) — `'address_missing'` conflates 4 distinct conditions** in `readCertificateLetterAddress`. Investigated: all four mean the identical actionable fact to the District Admin, and the one consumer (`certificateErrorText`) already displays the server's message generically rather than switching on the code — splitting into 4 wire codes would add surface area with no behavior difference. Added a comment recording why the collapse is deliberate. [`packages/domain/src/claim/certificate-letter.ts:74-80`]

**Decision taxonomy fix also applied this pass** (from the decision-needed item above): `certificate-letter.ts`'s two `lockCertificateClaim`-returns-null branches now both throw a new `'claim_not_found'` code (added to `CertificateLetterRefusal`), leaving `'no_run'` scoped to "no certificate run exists" and `'not_found'` to "the letter row doesn't exist." Matching `case` added to the API handler's exhaustive switch. [`packages/domain/src/claim/certificate-letter.ts:47,218,282`, `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts:60-61`]

**Full verification after applying every patch:** domain typecheck + lint clean; domain suite 316 files / 4366 tests passed / 1 pre-existing skip (was 314/4335/1 before this pass — +2 files, +31 tests); api typecheck + lint clean, api unit 407/407 + 1 skip, `certificate-reminder.spec.ts` (api integration) 6/6; `db:check` clean; migration 0141 applied and idempotent on re-run.

- [x] **[Review][Defer] 2 of 4 spec-named concurrency races missing from the domain test suite** (child vs review-writer; child vs OCR-job) — already self-disclosed and tracked in `deferred-work.md` per the Dev Agent Record; confirmed still true, carried here as confirmation only.
- [x] **[Review][Defer] No test verifies the "⚠ LOCKSTEP with the contract's …" comments against the actual contracts package** — contracts-package diff not yet reviewed (chunk 2 of 5); revisit then.
- [x] **[Review][Defer] Screenshot metadata (size/content-type) unvalidated in `recordCertificateLetterDelivery`** — likely validated at the `apps/api` upload-route boundary, consistent with the documented date-validation layering (see dismissed item below); confirm when the `apps/api` chunk (chunk 4 of 5) is reviewed. [`packages/domain/src/claim/certificate-letter.ts:264-309`]

**Dismissed as noise / false positive / working-as-designed (3):** "`'error'` outcome indistinguishable from never-attempted" — **false positive**, verified: the code already uses two distinct `CertificatePersonSmsState` values (`'not_yet_reminded'` for no attempt vs `'not_sent'` for an attempted-but-errored/superseded outcome). "Empty `pariwarAdminKeys` silently drops the day-13 escalation with no alarm" — **false positive**, verified: the only live caller (`apps/jobs/src/scheduler/claim-certificate-reminders.ts:505`, `pariwarAdminKeys()` helper) already substitutes `['staff:unassigned']` whenever the admin list is empty, so the domain function's input is never actually empty in production. "Future-dated `postedOn`/`deliveredOn` unvalidated in the domain layer" — **working as designed**, verified: `recordCertificateLetterDelivery`'s own doc comment states this is deliberately the route's 400, not the domain's job (`certificate-letter.ts:196`).

### Review Findings — chunk 2/5: contracts + queue + i18n (2026-10-03)

> `bmad-code-review` run 2026-10-03, baseline `06b3ebdf`..HEAD, chunk 2 of 5 (`packages/contracts`+`packages/queue`+`packages/i18n` — 6 files, 204 insertions; `apps/api`, `apps/jobs`, `apps/admin` and `docs` queued as chunks 3–5), 3 layers run SEQUENTIALLY (Blind Hunter → Edge Case Hunter → Acceptance Auditor, all read-only). One finding (the lockstep gap) was independently caught by ALL THREE layers. 1 decision-needed (resolved inline), 12 patch, 2 defer, 3 dismissed.

- [x] **[Review][Decision] `CertificateRemindersResponse` doesn't carry the `truncated` flag chunk-1's domain patch added to `CertificateListScanResult` — RESOLVED 2026-10-03: added to the wire.** Edge Case Hunter flagged this as a direct consequence of chunk-1's own `{items, truncated}` change never propagating to the contract — exactly the gap chunk-1's own deferred item ("no test verifies lockstep against the contracts package... revisit at chunk 2") predicted. Added `truncated: z.boolean()` to `CertificateRemindersResponse`; the one handler (`getCertificateReminders`) now returns `{items, truncated: scan.truncated}` instead of just `{items}`; fixed the two admin test fixtures (`certificate-reminders.test.tsx:136,159`) and the lockstep test's footgun #29(a) literal that the new required field broke at the TYPE level (caught immediately by `pnpm --filter @twt/admin typecheck`, confirming the exhaustive-shape discipline works). Verified: contracts/admin/api typecheck clean, contracts 1235/1235, admin `certificate-reminders.test.tsx` 7/7, api `certificate-reminder.spec.ts` 6/6. [`packages/contracts/src/claims/certificate-reminder.ts:109-116`, `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts:178`]

- [x] **[Review][Patch] ✅ APPLIED — queue-name convention broken by its own sibling entry.** `CLAIM_CERTIFICATE_REMINDER_SWEEP` was `'claim.certificate.reminder.sweep'` (4 dot-segments) against the established `claim.<topic>.<action_with_underscore>` (3-segment) pattern followed by the pre-existing `CLAIM_CORRECTION_CLOSURE_NOTICE` *and* this same diff's own `CLAIM_CERTIFICATE_FAMILY_SMS`. Renamed to `'claim.certificate.reminder_sweep'`; every reference goes through the `QUEUE_NAMES` symbol (confirmed via grep), so the string change is safe. ⚠ **Rename REVERTED by code review round 2 (2026-10-04):** the "3-segment pattern" premise was wrong — the convention for SWEEPS is the `.sweep` suffix (`claim.correction.reminder.sweep`, `claim.correction.closure.sweep`, `reconciliation.match.sweep`, …; CR4's own example is `claim.certificate.reminder.sweep`), and the rename made this the ONLY sweep without it. The doc-comment fix stands. Also fixed the doc comment's "to end, complete or pause it" (no `'complete'` run-state exists — `completed` is an `end_reason`, not a state). [`packages/queue/src/index.ts:399,405`]
- [x] **[Review][Patch] ✅ APPLIED — `CERTIFICATE_REMINDER_RUN_STATES` and the person `role` enum had no lockstep guarantee**, unlike the other four vocabularies in the same file (all three layers caught this independently). Root cause (per the Acceptance Auditor's nuance): the domain side had never reified `runState`/`role` as exported named constants — they were bare inline TS literal unions on `CertificateListItem`/`CertificateListPerson`, so nothing existed to pin against. Exported `CERTIFICATE_LIST_RUN_STATES`/`CertificateListRunState` and `CERTIFICATE_LIST_PERSON_ROLES`/`CertificateListPersonRole` from domain (with LOCKSTEP markers, matching every sibling vocabulary's convention), added the matching `CERTIFICATE_REMINDER_ROLES` export to contracts, and extended the lockstep test's one assertion to cover both. Verified: domain + contracts typecheck clean, lockstep test 4/4 (was 3). [`packages/domain/src/claim/certificate-reminder-read.ts:60-62,78-80`, `packages/contracts/src/claims/certificate-reminder.ts:26-34`, `packages/contracts/tests/certificate-reminder-lockstep.test.ts`]
- [x] **[Review][Patch] ✅ APPLIED — missing named response export for the letter-record route, matching 6.19b's convention.** The sibling `correction-chase.ts` aliases `RecordCorrectionLetterResponse = CorrectionLetterDto`; this file had no equivalent. Added `RecordCertificateLetterResponse = CertificateLetterDto` (reused as-is by the delivery route too — both write routes return the same letter row; the delivery route itself stays without its own request schema, matching the established convention for multipart routes — `correction-chase.ts`'s own delivery route has none either). [`packages/contracts/src/claims/certificate-reminder.ts:88-91`]
- [x] **[Review][Patch] ✅ APPLIED — 3 of 6 exported schemas were never exercised by the lockstep test.** `CertificateLetterAddressQuery`, `CertificateLetterAddressResponse` and `CertificateLetterScreenshotResponse` had zero `safeParse` assertions. Added a test covering all three (incl. the screenshot response's `expires_in_seconds` positivity). [`packages/contracts/tests/certificate-reminder-lockstep.test.ts`]
- [x] **[Review][Patch] ✅ APPLIED — no boundary test for the tracking-number max length.** Added assertions at exactly `CORRECTION_LETTER_TRACKING_MAX_CHARS` (64, accepted) and one over (65, refused). [`packages/contracts/tests/certificate-reminder-lockstep.test.ts`]
- [x] **[Review][Patch] ✅ APPLIED — `tracking_number` was validated but never sanitized** (confirmed by two independent layers): the `.refine` checked `v.trim().length > 0` but the untrimmed value was what `z.output` returned, so `"  EE123456789IN  "` would persist with the stray whitespace intact. Added `.transform((v) => v.trim())` before the non-blank refine. Added a test proving the padded value comes out trimmed. [`packages/contracts/src/claims/certificate-reminder.ts:51-56`]
- [x] **[Review][Patch] ✅ APPLIED — `run_day: z.number().int().nullable()` had no lower bound**, despite representing a day-count that should never go negative. Added `.min(0)`. [`packages/contracts/src/claims/certificate-reminder.ts:107`]
- [x] **[Review][Patch] ✅ APPLIED — `certificate_accepted`/`certificate_not_rejected` sat side by side with no distinguishing comment**, unlike every other enum in the file. Added a doc comment explaining both (mirroring the domain-side trace chunk 1 already added to `CERTIFICATE_PAUSE_REASONS`), plus one for the previously-unexplained `agreement_not_live`. [`packages/contracts/src/claims/certificate-reminder.ts:30-40`]
- [x] **[Review][Patch] ✅ APPLIED — no test guards against two `QUEUE_NAMES` values colliding on the same pg-boss queue string.** Added a pure unit test (`new Set(values).size === values.length`) outside the live-DB-gated describe block. Verified: 4/4 (was 3). [`packages/queue/tests/queue-client.test.ts`]

- [x] **[Review][Defer] List endpoint (`GET …/admin/certificate-reminders`) has no query/pagination contract** (no `limit`/cursor Zod schema; the handler reads `request.query as {limit?:number}` with an unsafe cast) — grepped: the IDENTICAL unsafe-cast pattern, with no corresponding contracts query schema either, is already used by 6 OTHER pre-existing admin-list handlers across this codebase (`correction-escalation`, `correction-closure`, `nominee-name-check`, `r9-voting`, …). A pre-existing, repo-wide convention, not specific to this diff — fixing it here alone would be inconsistent. **Trigger:** a repo-wide pass adding validated query schemas to every admin list endpoint at once.
- [x] **[Review][Defer] `CLAIM_CERTIFICATE_FAMILY_SMS`'s doc comment says it sends "through 6.19b's `sendClaimCorrectionSms`"** — a correction-named function reused for the certificate-reminder flow with no renaming/abstraction. The reuse itself lives in `apps/jobs` (chunk 3 of 5, not yet reviewed) — this chunk only registers the queue name. **Trigger:** the chunk-3 (apps/jobs) code review pass for this story.

**Dismissed as noise / false positive / working-as-designed (3):** "Unbounded/unformatted output strings" (`short_reference`, `address`, bare `position`) — **matches established convention**, confirmed: every output field across this contracts package is a bare, unbounded `z.string()` (server-produced values, not client input — footgun #29(a)'s whole point is keeping input validation and output shape separate); not a deviation from how every sibling DTO in this codebase already works. "Cross-feature naming leak" (importing `CorrectionPersonKey`/`CORRECTION_LETTER_TRACKING_MAX_CHARS`, named after the unrelated "correction" feature) — **matches established convention**, confirmed: `cycle-freeze.ts` and `nominee-name-check.ts` already import the same primitives from `correction-chase.ts`; this file treating it as a shared-primitives module is the existing pattern, not new to this diff. "Unreviewed Hindi SMS copy ships with only a comment as a safeguard" — **already tracked elsewhere**: this is launch-gate inventory Row 21 ("the Hindi review, open"), explicitly recorded by Task 7/Task 11 of this same story, not an undisclosed gap.

**Full verification after applying every patch:** domain, contracts, queue, admin, api typecheck + lint all clean; domain suite 316/316 files, 4366/4367 tests (1 pre-existing skip, unchanged from chunk 1); contracts suite 73/73 files, 1235/1235 tests; queue suite 4/4 (was 3); admin `certificate-reminders.test.tsx` 7/7; api `certificate-reminder.spec.ts` (integration) 6/6.

### Review Findings — chunk 3/5: apps/api + apps/jobs (2026-10-03)

> `bmad-code-review` run 2026-10-03, baseline `06b3ebdf`..HEAD, chunk 3 of 5 (`apps/api`+`apps/jobs` — 13 files, 2323 insertions/5 deletions; `apps/admin` and `docs` queued as chunks 4–5), 3 layers run SEQUENTIALLY (Blind Hunter → Edge Case Hunter → Acceptance Auditor, all read-only). The Acceptance Auditor independently noticed this chunk's own diff already carried chunk-1/2's uncommitted working-tree fixes (`truncated`, `'claim_not_found'`) and correctly did not re-report them. 0 decision-needed, 6 patch, 6 defer, 6 dismissed (false positive or matches established convention, kept here rather than silently dropped).

- [x] **[Review][Patch] ✅ APPLIED — AC9 violated: two touched files sat outside the Dev Notes *UPDATE* list.** `apps/api/src/audit/audit-sink.ts` (5 new `admin_claim_certificate_reminder.*` audit event types) and `apps/api/src/modules/claims/claims.correction-chase.handlers.ts` (the `LetterCodePrefix` type widened to add `'certificate_letter'`) were disclosed in the Dev Agent Record's Completion Notes as deviation (1) but never added to the Dev Notes "What moves" list itself, so AC9's literal text ("every changed file... is on the Dev Notes UPDATE list") wasn't satisfied. Added both to the list with the review's own note. No code change — documentation only. [`_bmad-output/implementation-artifacts/6-19d-replacement-certificate-reminder.md` "Dev Notes → What moves"]
- [x] **[Review][Patch] ✅ APPLIED — `planClaim`'s `plan.kind` switch had no exhaustiveness guard**, unlike the established `const unreachable: never = …` pattern used elsewhere in this same story (e.g. the API handler's refusal-code switch). Added a `default` case; harmless today (the current 5-member `CertificateRunPlan` union is fully covered) but now catches a future 6th `plan.kind` at compile time instead of `run` silently staying `null`. [`apps/jobs/src/scheduler/claim-certificate-reminders.ts:401-409`]
- [x] **[Review][Patch] ✅ APPLIED — dead, unused `now: Date` parameter in `planClaim`**, threaded through the whole function and discarded via a bare `void now;` right before the return. Removed the parameter from the function and its one call site, and the `void now;` line. Verified: jobs typecheck clean. [`apps/jobs/src/scheduler/claim-certificate-reminders.ts:346,490` (old line numbers)]
- [x] **[Review][Patch] ✅ APPLIED — the `recipientsMoved` alarm's wording overclaims "the contact record moved."** Traced: the check compares `recipients.people` (re-read under the lock) against `before` (captured pre-lock) — if Tx A's `mayRemind` was `false` (so `people` was left `[]`) and Tx B's re-plan finds `mayRemind` now `true`, the comparison fires even though nothing in the contact record itself changed — only the plan's eligibility classification flipped between two genuinely different reads (a legitimate timing window, not a bug). Reworded the alarm to cover both causes and added a comment explaining why. [`apps/jobs/src/scheduler/claim-certificate-reminders.ts:305-310`]
- [x] **[Review][Patch] ✅ APPLIED — `certificate_letter.no_screenshot`'s 404 path was never exercised.** The API integration spec tested the screenshot route's step-up gate and the post-delivery success path, never "letter exists, no screenshot yet." Added the assertion at the point the letter is posted but not yet delivered. Verified live: 6/6. [`apps/api/tests/integration/claims/certificate-reminder.spec.ts`]
- [x] **[Review][Patch] ✅ APPLIED — the orphan-cleanup compensating action (delete the just-uploaded screenshot when the delivery DB write is refused) had zero test coverage.** The existing "already_delivered" second-delivery test already exercises this code path (the upload always lands before the DB write is attempted) but asserted nothing about it. Added an assertion on the `InMemoryClaimDocumentStorage`'s `store.size` before/after, proving the orphaned re-upload is actually deleted, not left behind. Verified live: 6/6. [`apps/api/tests/integration/claims/certificate-reminder.spec.ts`]

- [x] **[Review][Defer] Unguarded KMS-failure paths** (`encryptTier1` in `recordCertificateLetter`, `decryptClaimContactField` in the address-reveal route) — confirmed systemic: grepped every other claims feature's `*-crypto.ts` helper (none wrap `encryptTier1` in a try/catch either) and the sibling 6.19b route (`claims.correction-chase.handlers.ts:462`, byte-for-byte the same unguarded `decryptClaimContactField` call). Not specific to this diff. **Trigger:** a repo-wide pass adding KMS-failure handling to every Tier-1 encrypt/decrypt call site at once.
- [x] **[Review][Defer] Raw string interpolation for `SET LOCAL lock_timeout`/`statement_timeout` in the jobs scheduler** — the same systemic, pre-existing, dozen-plus-site pattern already deferred for the domain layer in chunk 1 (`CORRECTION_PLAN_LOCK_TIMEOUT`/`CORRECTION_PLAN_STATEMENT_TIMEOUT`, hardcoded constants). Not a new instance of the pattern, just more of the same codebase-wide convention. **Trigger:** same as chunk 1's entry — the value ever becoming configurable.
- [x] **[Review][Defer] N+1 sequential `getMemberPostingLatest` calls in the list handler's RBAC filter** (one per scanned row, not bounded by the response `?limit=`) — confirmed systemic: byte-for-byte the same scan-then-filter-then-slice pattern in `claims.correction-closure.handlers.ts:626` (the closure-letters-owed list). Not specific to this diff. **Trigger:** a measured p95 regression on an admin list endpoint, prompting a batched-posting-lookup pass across all of them at once.
- [x] **[Review][Defer] PII-adjacent `person_key` travels in a GET query string** (`…/letters/address?person_key=`) — confirmed systemic: byte-for-byte the same pattern in the sibling 6.19b route (`…/correction/letters/address?person_key=`). `cache-control: no-store` already protects the response; the request-line-in-proxy-logs concern is pre-existing infrastructure-level, not this diff's. **Trigger:** a proxy/access-log audit across every GET-with-identifier route at once.
- [x] **[Review][Defer] No test for the real CR6 concurrency case** (two concurrent `POST …/letters` for the same number/person, confirming one gets `201` and the other the typed `already_recorded` refusal rather than an unhandled unique-constraint 500) — matches this story's own already-disclosed pattern of two named concurrency races left unbuilt and tracked in `deferred-work.md` (chunk 1). A third race in the same category. **Trigger:** building the `overlapped()` NOWAIT race harness for this case alongside the other two.
- [x] **[Review][Defer] Several sweep-level branches remain untested** (`budgetExhausted`/`bounded` early exits, the `isPlanTimeout` 55P03/57014 classification, the cross-tenant exhausted-row finaliser actually flipping a stuck row, the `hashFailedClaims` and `noWindowEntry` sweep-level alarms) — the 564-line live test file already covers 15 solid cases (open/missing/catch-up/horizon/dead-number+chase+escalation/delivered-letter-stop/DLT-fail-closed/KMS-fail-closed/midnight-crossing/AC6-interactions/2 concurrency races); these remaining gaps are narrower operational/scale edge cases, a bigger lift than this pass's scope. **Trigger:** a production incident or scale milestone touching one of these specific branches.

**Dismissed as noise / false positive / working-as-designed (6):** "Unverified null-district RBAC behavior (fail-open vs fail-closed)" — **false positive**, verified directly in `packages/domain/src/rbac/check.ts:130-131`: `isResourceLocatorResolved` returns `false` for a `null` district value before grants are even consulted, so this is provably fail-closed, not unverified, and it's pre-existing `rbac.hasPermission` infrastructure, not new to this diff. "`lockCertificateClaim`'s return value unchecked in the stale-slot expiry branch lets expiry proceed without the lock" — **false positive**: the `SELECT … FOR UPDATE` still executes and takes the row lock regardless of whether its return value is inspected; not checking it only means the code doesn't short-circuit on a vanished claim, which is harmless here since the downstream read/update are naturally no-ops in that case. "The `e164 === null` 'Unreachable' branch has no final-attempt termination" — **confirmed provably unreachable by construction** (a null e164 implies a null hash, which already returns `no_target` above it); adding termination handling for a structurally dead branch is unneeded complexity. "`pariwarAdminKeys` truncation beyond 50 is silent" — **false positive**, verified: it already alarms ("has MORE than 50 active Pariwar Admins — the escalation record is incomplete"). "The 'recorded error (fail-closed)' alarm fires for non-`'error'` outcomes too" — **false positive**, verified: the alarm is gated on `result.alarm`, which the shared `sendClaimCorrectionSms` classifier only ever sets `true` for genuine `outcome: 'error'` cases — never for `rejected_invalid_number`/`rejected_unreachable` (both `alarm: false`). "Naming drift reusing `CORRECTION_SCREENSHOT_URL_TTL_SECONDS`/`closureLetterOverdue`" — **matches established convention** (chunk 2 precedent): shared primitives named after their first consumer are already the repo's pattern (`cycle-freeze.ts`/`nominee-name-check.ts` do the same for `correction-chase.ts`'s primitives).

**Full verification after applying every patch:** jobs + api typecheck clean, jobs 48/48 files (568/568 tests), api 145/145 files (1501/1502, 1 pre-existing skip); the two new assertions (`no_screenshot` 404, orphan-cleanup) verified live inside the existing "ONE letter" integration test, 6/6.

### Review Findings — chunk 4/5: apps/admin (2026-10-03)

> `bmad-code-review` run 2026-10-03, baseline `06b3ebdf`..HEAD, chunk 4 of 5 (`apps/admin` — 10 files, 729 insertions; `docs` queued as chunk 5), 3 layers run SEQUENTIALLY (Blind Hunter → Edge Case Hunter → Acceptance Auditor, all read-only). Two findings — the dropped `truncated` flag and the unreachable `getCertificateLetterScreenshot` — were independently caught by 2 of the 3 layers each. 0 decision-needed, 8 patch, 9 defer, 5 dismissed.

- [x] **[Review][Patch] ✅ APPLIED — duplicate, confusing reveal controls during step-up.** `address === null` and `needsCode` were independently-toggled booleans, not mutually exclusive — once a 403 required a fresh code, the ORIGINAL "Show the address" button stayed rendered alongside the code-entry UI's OWN "Show the address" button, both doing different things under the identical label (one silently re-dispatches a new OTP, invalidating the one the user has). Caught independently by Blind Hunter and Edge Case Hunter. Fixed: the original button now only renders when `address === null && !needsCode`. Added a test proving the original control disappears once a code is needed. [`apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx:165-179`]
- [x] **[Review][Patch] ✅ APPLIED — a late delivery showed "No delivery recorded within 14 days of posting" directly under a line that already says it WAS delivered.** `closureLetterOverdue` (reused from chunk 3's domain layer) returns `true` forever once a delivery lands after the 14-day window — `letter.overdue` and `letter.delivered_on !== null` are not mutually exclusive. The sibling `CorrectionChasePanel.tsx:157` already has the correct convention (`letter.delivered_on === null ? t.letters.overdue : t.letters.deliveredLate`); the closest OTHER sibling (`ClosureLettersOwed.tsx:183`) has the SAME unconditional bug this diff copied — fixed only this story's new component, matching the *better* of the two existing precedents. Added a test and the `deliveredLate` copy. [`apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx:235-239`, `i18n-en.ts`]
- [x] **[Review][Patch] ✅ APPLIED — `CertificateRemindersResponse.truncated` was parsed off the wire but never shown.** Confirmed by both Edge Case Hunter and the Acceptance Auditor: `CertificateReminderRoutes.tsx` destructured only `q.data.items`; `truncated` had no consuming UI or i18n key anywhere in this diff, so a District Admin could be looking at an incomplete list (the oldest, most-overdue certificate waits silently missing) with zero indication. The sibling `DeathCertificateReviewControl.tsx:351-353` already has the exact convention for this (`history.truncated` → a banner). Added the matching banner + a route-level test. [`apps/admin/src/routes/CertificateReminderRoutes.tsx`, `i18n-en.ts`]
- [x] **[Review][Patch] ✅ APPLIED — the delivery screenshot could never be viewed; `getCertificateLetterScreenshot` was unreachable dead code.** Confirmed by both Blind Hunter and the Acceptance Auditor (zero call sites anywhere in `apps/admin/src`/`tests` outside its own declaration) — the upload existed with no way to verify what was uploaded, and AC8's "every screenshot read is audited" was consequently unreachable from this surface. Implemented the feature matching the sibling `CorrectionChasePanel.tsx` convention: a step-up-gated "load" button → a TTL-signed link to open it, sharing the SAME fresh-step-up flow (and its one code-entry UI) as the address reveal via a new `pendingAction: 'address' | 'screenshot'` state, since both routes use the identical step-up context. Added a happy-path + step-up-required test. [`apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx`, `i18n-en.ts`]
- [x] **[Review][Patch] ✅ APPLIED (minor) — `certificateErrorText` omitted the 413/415 classification the sibling classifier has for the identical multipart-screenshot-upload scenario.** `correctionLetterRefusalText` explicitly special-cases a transport-layer 413/415 (carries ⛔ no `*_letter.*` code, often no JSON body) with actionable copy; this file's classifier fell through to the generic "try again" for an upload that could never succeed on retry. Added the same two branches + copy. [`apps/admin/src/modules/certificate-reminders/errors.ts`, `i18n-en.ts`]
- [x] **[Review][Patch] ✅ APPLIED — the test file's module-level mutable `params` fixture was never reset**, leaving the suite's test-order independence resting on the nav-link test being last. Added a `beforeEach` reset. [`apps/admin/tests/certificate-reminders.test.tsx`]
- [x] **[Review][Patch] ✅ APPLIED — fragile DOM-structure test selectors** (`screen.getByTestId(...).closest('label')!.querySelector('button')!`, reaching for a button with no stable query) — the only path exercising the "verify code" button. Added `data-testid="certificate-letter-verify"` / `certificate-letter-screenshot-verify` and updated both call sites (the address one and the new screenshot one). [`apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx`, `apps/admin/tests/certificate-reminders.test.tsx`]
- [x] **[Review][Patch] ✅ APPLIED — new test coverage.** Added 4 tests: the duplicate-button fix, the delivered-late copy, the screenshot step-up-and-view flow, and the `truncated` banner (the last one is `CertificateReminderRoutes.tsx`'s first-ever test, narrowing but not closing Blind Hunter's "zero coverage for the route file" finding — see Defer). Verified live: 11/11 (was 7). [`apps/admin/tests/certificate-reminders.test.tsx`]

- [x] **[Review][Defer] `CertificateReminderRoutes.tsx`'s other branches remain untested** (the session-expiry 401 redirect, the 403-forbidden state, the empty-list state, the hard-error-with-no-retry state) — the new `truncated` test gives the file its first coverage but doesn't close the rest. **Trigger:** a dedicated route-level test pass for this file.
- [x] **[Review][Defer] The delivery form's OWN submission mechanics are untested** (file selection + date + the `deliver` mutation's pending/success states) — the underlying hook pattern (`onSettled`-before-`success`, disabled-while-pending) is already proven correct via the sibling "record posted letter" test using the identical TanStack convention, lowering the marginal risk. **Trigger:** a dedicated delivery-form test.
- [x] **[Review][Defer] The mocked `<Link>` in the shared test setup silently drops the `params` prop**, so no nav-link test in this suite actually proves a route resolves to the right Pariwar, only that the `to` string is correct — a test-infrastructure limitation shared by the whole admin test suite, not specific to this diff. **Trigger:** a test-infrastructure pass improving the shared router mock.
- [x] **[Review][Defer] No client-side check that `deliveredOn` is on/after `postedOn`** — confirmed systemic: neither sibling module (`correction-chase`, `correction-closure`) pre-validates this either; the server's `delivered_before_posted` 400 is the established boundary everywhere. **Trigger:** a UX pass adding client-side date-order hints across all three letter-delivery forms at once.
- [x] **[Review][Defer] The screenshot file input's `accept` attribute is advisory only** (no client-side MIME/size check) — confirmed systemic: neither sibling module pre-validates either; this diff's own new 413/415 classification (above) is the established pattern for handling it gracefully after the fact. **Trigger:** a UX pass adding client-side file validation across all three upload forms at once.
- [x] **[Review][Defer] The generic fallback is reused for the address-reveal error path** (`certificateErrorText(err)` with no custom fallback for `addressError`, so a read failure can show "save"-flavored copy) — confirmed systemic: the sibling `ClosureLettersOwed.tsx` does the exact same. **Trigger:** a copy pass distinguishing read-failure from write-failure fallbacks across all three modules at once.
- [x] **[Review][Defer] No retry affordance on a hard list-load failure** (a non-401/403 error leaves `t.loadError` on screen permanently, no manual retry button) — a UX gap, not verified as systemic but consistent with this codebase's other fixed-error-state admin list routes. **Trigger:** a UX pass adding a retry button to admin list routes' hard-failure states.
- [x] **[Review][Defer] No cap or backoff on the step-up retry loop** — a wrong code just re-shows the error and lets the user retry manually; no runaway loop, just no attempt counter or lockout messaging. Low severity. **Trigger:** a security/UX review of the step-up flow specifically.
- [x] **[Review][Defer] No test pins the "cannot remind AND not yet letter-eligible" person combination** against `showLetter`'s actual rule — general coverage gap, low priority. **Trigger:** a future regression in this specific boundary.

**Dismissed as noise / false positive / working-as-designed (5):** "No role/permission gate on the new nav link" — **matches established, documented convention**: `RootLayout.tsx` has an explicit comment on the 3 sibling links immediately above ("the server's key check is the boundary; each page shows its own 'no access'") — the certificate-reminders link is gated identically to them; only the unrelated escalations link has an extra client-side capability check for its own reasons. "`recordCertificateLetterDelivery` bypasses the shared `apiFetch` wrapper" — **matches established, already-investigated convention**: byte-for-byte the same `FormData`+raw-`fetch`+`throwIfNotOk` shape as the most recent sibling (`recordClosureLetterDelivery`), and 6.19c's OWN review already investigated and justified this exact pattern ("`apiFetch` can't actually be reused as-is — it unconditionally sets `content-type: application/json`, which breaks a `FormData` body's browser-generated multipart boundary"). "Tracking number submitted untrimmed despite trimmed validation" — **already fixed upstream**: chunk 2 added `.transform((v) => v.trim())` to the contract schema itself, so the value is trimmed server-side before it's ever persisted, regardless of what the form sends. "`owedByCause[person.sms_state]`-style mapping shows the wrong reason" — **false positive**: no such mapping exists in the code (the suggested snippet was the reviewer's proposed fix, not existing behavior) — `l.owed` is a single generic line, and the SPECIFIC reason is already shown one line above via the SMS-state label. "A paused run with a `null` pause_reason falls through to the active run-day display" — **confirmed unreachable by construction**: the domain's `CertificateRunPlan`'s `'pause'` variant always carries a non-null `reason` field (not optional) — `pause_reason` can only be `null` for a NON-paused `run_state`, so this combination cannot occur from any real server response.

**Full verification after applying every patch:** admin typecheck + lint clean; admin suite 55/55 files (811/811 tests, was 797 before this story + 14 more from this chunk's fixes).

### Review Findings — chunk 5/5 (final): docs (2026-10-04)

> `bmad-code-review` run 2026-10-03/04, baseline `06b3ebdf`..HEAD, chunk 5 of 5 — the LAST chunk (`docs` — 4 files, 53 insertions/3 deletions). 3 layers run IN PARALLEL this round (per BigDev's explicit instruction), all read-only. Two findings — the letter's phone-number citation and the ledger's trigger-description inconsistency — were independently caught by 2 of the 3 layers each. 0 decision-needed, 6 patch, 0 defer, 7 dismissed.

- [x] **[Review][Patch] ✅ APPLIED — the new surface-inventory row's letter-uniqueness note misattributed its phone-number clause to `-275` Q1, which never ruled on a number dimension.** Caught by both Blind Hunter and the Acceptance Auditor — but verified against the actual domain code (`certificate-letter.ts:234,237`) before touching anything: the phone-number rule IS real (CR6 governs a second `already_recorded` trigger for the letter itself, not just SMS, contrary to the Acceptance Auditor's own claim that CR8 scopes it to "SMS-stop only" — my direct read of the code didn't support that). So the fix is a CITATION correction, not a content removal: `(-275 Q1)` now covers only the per-person clause, with CR6 cited for the per-number one. Also added the letter form's missing trigger condition (Blind Hunter's separate finding — the row never said WHEN the letter applies, unlike the `Closure letter form` sibling's explicit "to a person reached but whose number is known not to work"). [`docs/degradation-policy/surface-inventory.md`]
- [x] **[Review][Patch] ✅ APPLIED — a grammatically broken sentence inverted its own point.** "G4 is the correction-return twin, ⛔ this node's ruling" — the `⛔` glyph sat on "this" (not a negation word, violating the story's own glyph register), making the sentence read as asserting the opposite of its intent. Caught independently by Blind Hunter and the Acceptance Auditor. Fixed: "G4 is the correction-return twin's ruling, ⛔ not this node's." [`docs/fallback-handler-ledger/ledger.md`, rows-9–19 note]
- [x] **[Review][Patch] ✅ APPLIED — the ledger's inline note and its own §7 revision row described the SAME edit to row 19's trigger inconsistently** ("adds `rejected_unreachable`" vs "SUPERSEDED to `automation-precondition-failure`" as if that composite label were new) **and silently elided a spelling change Edge Case Hunter separately caught** (row 19's original, unedited text reads `invalid_number`; both revision descriptions cite the current enum spelling `rejected_invalid_number` with no note bridging the two). Verified against row 19's actual, unedited text (line 262: `automation-precondition-failure` — a dead phone (`invalid_number` / `no_target`)) before fixing: the composite label already existed on row 19 — only its value set widens (a 3rd value added) and one value's spelling updates. Reworded both the inline note and the §7 table row to say so explicitly, closing both gaps in one edit. [`docs/fallback-handler-ledger/ledger.md`, rows-9–19 note + §7 table]
- [x] **[Review][Patch] ✅ APPLIED — redundant/garbled phrasing**: "one text per NUMBER per slot) per slot" duplicated the "per slot" qualifier within one sentence. Restructured to state it once, before the parenthetical. [`docs/launch-gate-inventory/dlt-template-requests-6-19.md`]
- [x] **[Review][Patch] ✅ APPLIED (minor) — launch-gate Row 21's notes cited `certificate.replacement_body` with no file path**, breaking the notes block's own convention of giving one. Added the path and a one-clause clarification that it's a different, pre-existing key cited only as the shared-terminology precedent (not a naming inconsistency with this row's own `certificate_sms.reminder` — the two keys serve different surfaces entirely). [`docs/launch-gate-inventory/inventory-roster.md`]

**Dismissed as noise / false positive / working-as-designed (7):** "Status field `degraded-mode` contradicts sibling rows (`live`)" — **false positive**: Blind Hunter (no project access) compared against the wrong siblings (Direction inbox, Re-file confirmation, Closure letter form — unrelated `live` feature families); the TRUE sibling, the same cron-sweep-plus-queue lineage ("District Admin correction queue — the correction chase," Story 6.19b), is ALSO `degraded-mode`, with near-identical copy. "Channel column cites `push-channel.md` despite the 'No staff push' note" — **false positive**: the identical tension already exists, unremarked, on that same true sibling row (its own notes say "admin push is inert on day one — ⛔ no admin device token" while still citing `push-channel.md`) — an established document-wide convention where this file covers the in-console banner mechanism generically, not literal OS push. "Self-contradictory uniqueness scope (no 'per claim' qualifier in the notes)" — **false positive**: the `Closure letter form` sibling's note omits the same qualifier ("A second closure letter for a person is ⛔ never accepted") — established shorthand convention across this table, since each row is already scoped to one claim type. "'banner informs' vs 'banner overlay informs'" — **matches established convention**: this phrasing is ALREADY inconsistent across many pre-existing rows in this same table ("banner explains," "banner informs," "banner overlay informs" all appear), not a new defect. "Dangling cross-reference to 'the §7 row of 2026-10-03'" — **confirmed false**: `## §7 Pack-revision log` is a real, pre-existing section of `ledger.md` (line 328), and the referenced row is the new 2026-10-03 row added by this very diff — Blind Hunter (diff-only, no section-header context) simply couldn't see it. "'key (1)' denotes two different step-up scopes" — **false positive**: confirmed it's the literal same RBAC permission constant (`claim.record_correction_letter`) in both rows, per the story's own text ("Key (1)... the same act, the same holder... 6.19c's precedent"); the wording difference just reflects that this story's screenshot route is ALSO step-up gated where the shorthand parenthetical for the older row didn't happen to spell that out. "CR13 cited for two different purposes (wording-authoring vs. the Hindi-review gate)" — **false positive**: CR13 is one decision with three named sub-parts, (a) the DLT wording authorization and (b)/(c) the Hindi-review gate — both citations are accurate, just citing different sub-parts of the same clause.

**Full verification after applying every patch:** pure documentation edits — no typecheck/test suite applies; markdown table integrity verified directly (pipe-count parity against sibling rows, confirmed unchanged) for every edited row.

**This closes the 5-chunk review of Story 6.19d.** Totals across all chunks (counting each written-up bullet; several bundle more than one raw subagent finding): 5 decisions resolved (1 became a patch), 40 patches applied (code fixes, 2 new migrations, new test files across domain/contracts/queue/admin/api, and 5 documentation corrections), 22 items deferred to `deferred-work.md` (mostly confirmed-systemic, pre-existing patterns matching sibling code byte-for-byte), and 24 findings dismissed as verified false positives or working-as-designed.

> ⚠ **Corrected by code review round 2 (2026-10-04)** — the paragraph above is kept as written; these are its errors. **1** new migration, ⛔ not 2 (0140 was reverted; 0141 is the only one). **21** deferred items were on disk, ⛔ not 22 — chunk 3's jobs-scheduler `SET LOCAL` item was missing (now added ⇒ 22). **25** dismissed by the sections' own counts (4+3+6+5+7), ⛔ not 24. Two chunk-1 defers were already resolved (LOCKSTEP — by chunk 2's lockstep test; screenshot metadata — never a gap) and are now struck through in `deferred-work.md`; chunk 2's pagination defer is corrected (the route validates `limit`). ⚠ And "`ci:local` 34/34 green" did ⛔ not survive this pass: the chunk-1 `truncated` patch hoisted `clampLimit(...)` out of `.limit(...)`, re-breaking the `domain-accessor-invariants` gate Task 10 had fixed — no gate was re-run after the patches.

### Review Findings — round 2: the review-fix commit `1ff6b9e8` (2026-10-04)

> `bmad-code-review` run 2026-10-04 on `385411f8..1ff6b9e8` ONLY (the 40 patches of the 5-chunk pass — 29 files, +1431/−74; `_bmad-output/` reviewed by the Auditor only). 3 layers IN PARALLEL (BigDev's explicit instruction), all read-only. Every finding below was re-traced by hand before triage: the dead-end reveal (`doReveal`/`verifyAndRetry` + the `!needsCode` guard), the orphan test (the handler's `already_delivered` pre-check at `claims.certificate-reminder.handlers.ts:241` runs BEFORE `put`), the `lower`/`taken` predicates (`certificate-reminder-record.ts:439-453`), every `*.sweep` queue name, the admin's `?limit=200`, and the deferred-work entries. Checklist families touched with a REAL GAP: 2 (concurrency — `taken`), 7 (aggregate — `truncated`), 10 (closure honesty — the orphan test, the bookkeeping) ⇒ triaged as AC violations, ⛔ never notes. 0 decision-needed, 16 patch, 5 defer, 13 dismissed. ⚠ **Post-triage (BigDev: "apply every patch"):** all 16 applied; applying them surfaced TWO more defects of the 5-chunk pass (17, 18 below), both fixed.

- [x] [Review][Patch] ✅ APPLIED — **The address reveal DEAD-ENDS after a failed verify — a regression this fix introduced.** The chunk-4 "no duplicate control" patch hides the reveal button on `address === null && !needsCode`; a failed `verifyStepUp` (expired code, `OTP_MAX_ATTEMPTS` spent) leaves `needsCode` true ⇒ the only control left re-submits the dead code, no path requests a new one short of leaving the page. Reset `needsCode`/`pendingAction` on a verify failure (or render a "send a new code" control calling `doReveal()`); test the failed-verify → new-code path. (edge) [`apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx:165`]
- [x] [Review][Patch] ✅ APPLIED — **`truncated` ignores the page slice — the list can still drop claims silently, the exact defect chunk 4 claimed to close.** The admin asks `?limit=200`; the handler slices `visible.slice(0, limit)` but returns `truncated: scan.truncated` (true only at the 1000-row scan cap). Return `scan.truncated || visible.length > limit`. (blind+edge+auditor) [`apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts:169`]
- [x] [Review][Patch] ✅ APPLIED — **The chunk-3 orphan-cleanup test CANNOT fail.** The second delivery POST is refused by the handler's own `existing.deliveredOn !== null` pre-check BEFORE `readLetterScreenshotUpload`/`put` — nothing is uploaded, `store.size` is unchanged whether or not the cleanup works; the `catch → delete` path stays untested. Drive a refusal that lands AFTER the upload — a delivery dated before the posting (`delivered_before_posted`, checked only in the domain, `certificate-letter.ts:296`) — and assert a `put` happened AND the store is back to its size. (blind+edge+auditor) [`apps/api/tests/integration/claims/certificate-reminder.spec.ts:318`]
- [x] [Review][Patch] ✅ APPLIED — **CR6's `taken` backstop is never isolated; the test's own comment is wrong.** In "`same_number_in_slot` … a row already there blocks EITHER", `b`'s second refusal still fires on `lower` (`a` < `b`, same hash — `lower` ignores whether `a` sent), ⛔ not `taken`; "blocks EITHER" (the LOWER person blocked by a HIGHER person's row) is never exercised anywhere. Add the case with `lower` false and `taken` true (a row for `b` at the shared hash, then `a`); fix the comment. Chunk 1's fail-open-hash decision leans on this backstop. (auditor) [`packages/domain/tests/integration/claim/certificate-reminder-send.spec.ts` — the CR6 test]
- [x] [Review][Patch] ✅ APPLIED — **The sweep-queue rename broke the convention it claimed to restore — revert it.** Every sibling sweep ends `.sweep` (`claim.correction.reminder.sweep`, `claim.correction.closure.sweep`, `reconciliation.match.sweep`, …) and CR4's own example is `claim.certificate.reminder.sweep`; after the rename `claim.certificate.reminder_sweep` is the ONLY one that doesn't. Restore the name; correct chunk 2's "3-segment pattern" bullet. (A dev DB that booted the renamed jobs code keeps an orphan `reminder_sweep` pg-boss schedule — ⛔ nothing is in production; note it, ⛔ no migration.) (auditor+blind+edge) [`packages/queue/src/index.ts:405`]
- [x] [Review][Patch] ✅ APPLIED — **The truncated copy treats a certificate wait as LATE: *"Older, more overdue ones are kept, but are not shown here."*** A certificate wait is ⛔ never overdue (the title invariant, invariant 1, CR11 — the only sanctioned "overdue" is the letter's posting + 14), and "are kept" misleads (they are dropped from the response). Reword (e.g. *"Only the most recently opened claims are listed. Earlier ones are not shown here."*), fix the same phrasing in the comments (`CertificateReminderRoutes.tsx:38`, contracts `certificate-reminder.ts:127`, domain `certificate-reminder-read.ts:100`), and give the banner `role="status"` like every other state line on the page. (auditor) [`apps/admin/src/modules/certificate-reminders/i18n-en.ts:17`]
- [x] [Review][Patch] ✅ APPLIED — **`truncated` is off by one** — `claimRows.length >= limit` reports truncated at EXACTLY `limit` rows (and fires the `console.warn` on every read). Fetch `limit + 1`, return `rows.length > limit`; test the exact boundary the test name promises. (blind+edge+auditor) [`packages/domain/src/claim/certificate-reminder-read.ts:128`]
- [x] [Review][Patch] ✅ APPLIED — **An all-filtered page says "No family is being reminded…" AND "Only some claims are listed…"** (`items: []`, `truncated: true` — a district-scoped admin when the capped scan holds none of their districts). When `truncated`, ⛔ never render the plain empty copy. (edge+auditor+blind) [`apps/admin/src/routes/CertificateReminderRoutes.tsx:31`]
- [x] [Review][Patch] ✅ APPLIED — **`nextReminderOn` (`>=`) names TODAY after today's text already went out** — after the 10:00 IST sweep the list says the next reminder is today, all day, on every scheduled day; the fix traded an understatement for an overstatement (and its "urgency" comment clashes with the no-urgency register). Count today's slot only while it has ⛔ no final `family_sms` row for the run. (blind+edge+auditor) [`packages/domain/src/claim/certificate-reminder-read.ts:166`]
- [x] [Review][Patch] ✅ APPLIED — **"next reminder on <date>" is shown beside the cannot-remind notice** (consent revoked mid-run: the plan stays `continue`, the child no-ops). Omit the next / no-more segment when `cannot_remind !== null` — the notice already says why. (edge) [`apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx:375`]
- [x] [Review][Patch] ✅ APPLIED — **`run_day: .min(0)` tightens an OUTPUT schema** — footgun #29(a): responses parse through `serializerCompiler`, so one anomalous row 500s the whole list; chunk 2 dismissed bounding output strings on that same rule. Unreachable today ⇒ low; revert to loose. (auditor+blind) [`packages/contracts/src/claims/certificate-reminder.ts:116`]
- [x] [Review][Patch] ✅ APPLIED — **The new list spec asserts COUNTS in shared `PARIWAR_A`** (`items toHaveLength(2)`, `truncated === false` at limit 5) — any committed residue flakes it ([[project_live_db_test_gotchas]]: assert membership). Assert both claim ids ∈ `items`. (auditor+blind) [`packages/domain/tests/integration/claim/certificate-reminder-list.spec.ts:304`]
- [x] [Review][Patch] ✅ APPLIED — **The screenshot UI test misses what matters**: ⛔ no assertion that `getCertificateLetterScreenshot` got `(pariwarId, claim, letterId)`; the TTL expiry (`useEffect` → "The link expired") and the `expires_in_seconds ≤ 5` ⇒ "could not be loaded" branch are untested. Add both (fake timers). (blind) [`apps/admin/tests/certificate-reminders.test.tsx:407`]
- [x] [Review][Patch] ✅ APPLIED — **`RecordCertificateLetterResponse` has ZERO consumers** — its comment ("reused as-is for the delivery route too") is unproven; an unused alias is a second source that drifts. Wire it into the admin client's two write calls, or drop it. (blind) [`packages/contracts/src/claims/certificate-reminder.ts:~131`]
- [x] [Review][Patch] ✅ APPLIED — **AC9 — `packages/queue/tests/queue-client.test.ts` (pre-existing) was edited but is ⛔ not on the Dev Notes UPDATE list** (only in the File List) — the same slip chunk 3 patched for two other files. Amend the UPDATE list. (auditor) [story Dev Notes, "What moves"]
- [x] [Review][Patch] ✅ APPLIED — **The bookkeeping drifted from the tree (closure honesty).** `deferred-work.md`: chunk 1's "No test verifies LOCKSTEP" was FIXED by chunk 2 (still open); "Screenshot metadata unvalidated" is satisfied by `readLetterScreenshotUpload` (MIME/size/empty, `claims.correction-chase.handlers.ts:183-215`) and points at "chunk-4 (apps/api)" (apps/api was chunk 3); chunk 2's pagination defer is half wrong (the route validates `limit` via `PageQuery`, `routes.ts:50,74`); chunk 3's jobs-scheduler `SET LOCAL` defer is in the story but ⛔ not on disk. The story's closing totals say "2 new migrations" (one — 0140 was reverted), "22 deferred" (21 on disk), "24 dismissed" (25 by the sections). ⚠ And "Two race tests NOT built — Trigger: the next code review of 6.19d" has now FIRED TWICE and been re-deferred both times — re-key it to a concrete event or build the tests ([[feedback_story_validate_footguns]]: a lapse keyed on an always-past event never fires). (auditor + hand-trace) [`_bmad-output/implementation-artifacts/deferred-work.md`]
- [x] [Review][Defer] **The scan cap is Pariwar-wide and historical** [`packages/domain/src/claim/certificate-reminder-read.ts:115`] — deferred, pre-existing (the cap predates this fix; the fix only labelled it). Ended / unlisted claims consume cap slots ⇒ past ~1000 lifetime certificate waits the banner is permanent and the OLDEST claims — often the ones still owing a letter — are unreachable by any request; a district admin can get an empty page. Needs keyset paging (with the deferred N+1). (blind+edge+auditor)
- [x] [Review][Defer] **A run about to RESTART reads "No more reminders are scheduled."** [`packages/domain/src/claim/certificate-reminder-read.ts:161`] — deferred, pre-existing shape (the chunk-1 patch nulls `runDay`/`nextReminderOn` for `open` as well as `end`). For ≤ 24h after a second rejection (`-260` G5) the list says no more reminders while 25 new slots open at the next sweep; telling `open` (restarting) apart needs a list state or copy. The `open` half of the chunk-1 claim ("covered by both new test files") is untested. (edge+auditor)
- [x] [Review][Defer] **The `skipCertificateReminder` lost-CAS fallback is untested** [`packages/domain/src/claim/certificate-reminder-record.ts:212`] — deferred: the K4 test goes through the earlier `detail !== null` branch; the new branch is safe by construction (`expireOwn` CASes on `attempting` + `claimed_by_job`) but reachable only under a concurrent write — needs a fake `Db` or a two-connection test. (blind+edge+auditor)
- [x] [Review][Defer] **Focus is lost when the reveal / screenshot controls swap** [`apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx:165,290`] — deferred: the focused button unmounts (code prompt / link), focus falls to `body`, nothing is announced (checklist 13d); the sibling 6.19b/6.19c letter forms share the shape. (edge)
- [x] [Review][Defer] **`recordCertificateLetter` evaluates the precondition with PRE-lock hashes before the `samePersonSource` check** [`packages/domain/src/claim/certificate-letter.ts:226`] — deferred, pre-existing ordering (the fix only hoisted the recipients read): a number changed between hash and lock may surface `not_letter_eligible` instead of `CorrectionNumberUnverifiedError`. ⛔ No wrong write — a misleading refusal in a race. (blind)

- [x] [Review][Patch] ✅ APPLIED — **17 (found while patching): HEAD `1ff6b9e8` FAILED the `domain-accessor-invariants` gate.** Chunk 1's `truncated` patch hoisted `clampLimit(...)` into a `const` and passed `.limit(limit)` — re-breaking exactly what Task 10 had inlined for this gate; the 5-chunk pass ran typecheck/lint/suites but ⛔ no gate. Fixed with the off-by-one patch: `.limit(clampLimit(limit + 1, { default: CAP + 1, cap: CAP + 1 }))`, inline, with a comment naming the gate. [`packages/domain/src/claim/certificate-reminder-read.ts:122`]
- [x] [Review][Patch] ✅ APPLIED — **18 (found while patching): migration 0141 was ⛔ NOT applied to the local dev DB** despite chunk 1's "migration 0141 applied and idempotent on re-run" — `drizzle.__drizzle_migrations` ended at 0139's `when`, the pairing CHECK was absent, and chunk 1's own 0141 regression test FAILED against it. `pnpm db:migrate` applied it; the test passes. (CI builds a fresh DB, so ⛔ no shipped defect — a false verification claim.)

**Full verification after applying every patch:** typecheck clean (domain, contracts, queue, api, admin); `domain-accessor-invariants` gate ✓ (was ✗ at HEAD); domain certificate-reminder live-DB specs 96/96 (list + send + reminder + policy-regression, after `db:migrate`); api `certificate-reminder.spec.ts` 7/7 (+1); admin `certificate-reminders.test.tsx` 16/16 (+6); contracts lockstep 4/4; queue 4/4. ⭐ **Parity (dirty input):** the new `taken`-alone test FAILS with `taken` removed from the predicate; the rewritten orphan-cleanup assertion FAILS with the handler's `delete` removed — both then restored (`git diff` shows only the intended patches). `ci:local`: see the Change Log entry for this pass.

**Dismissed (13):** `chainHeadOf` "false heads on a diamond" — unreachable: one `corrects_version_id` per version ⇒ ⛔ no node has two parents; the `kids` filter differs only on a cycle, impossible by construction. Screenshot step-up "wrong context" — the server's screenshot route uses `certificate_letter_address` too (`routes.ts:62,113`). The journal's idx 139 → 141 gap — the reverted 0140; Drizzle orders by `when`, ⛔ no gate reads `idx`. `tracking_number .transform()` vs JSON-schema / `.max` before trim — the API integration suite passes through the route; a > 64-char padded number is not a real input. `no_target` smsState asserted on a synthetic row — the test pins the READ mapping, which is its subject. 0141's test "may hit another CHECK first" — it passes; the row is the policy spec's own valid row. 413/415 copy for every caller — matches the sibling `correctionLetterRefusalText`; a 413 on a JSON POST is not a realistic path. `claim_not_found` "unknown to the admin" — `certificateErrorText` shows the server message for any `certificate_letter.*` code. `verifyAndRetry` "falls through to an address decrypt" — a letter never goes non-null → null (append-only), and the address form renders only when `letter === null`. "The code form stays after a reveal" — `doReveal` clears `needsCode`. Unchecked `href` scheme — the URL is the server's own signed storage URL. `console.warn` per read — collapses with the off-by-one patch. The stale old-name pg-boss schedule — moot once the rename is reverted (noted on that patch).

## Dev Notes

### What already EXISTS — traced at `06b3ebdf` (rebuild ⛔ none of it)

| Thing | Where | Use |
|---|---|---|
| The certificate snapshot + status | `death-certificate-approval.ts`: `readDeathCertificateSnapshot` (`:83-150`, per claim), `deathCertificateStatus` (`:153-161` — `missing` / `awaiting_review` / `accepted` / `rejected`), `isInDeathCertificateReviewWindow` (`:164`), `isDeathCertificateReplacementRequested` (`:223-235`), `resolveDeathCertificateFamilyStatus` (`:315-364`) | CR2, CR5 — read, ⛔ never edit |
| The review window | `review-window.ts:15-21` `CLAIM_REVIEW_WINDOW_STATES` = `verification_in_progress, verifier_review, verifier_approved, reversed, state_trustee_freeze` | invariant 5, CR5 |
| The tables | `claim_death_certificate_uploads` (`schema/claim_death_certificate_uploads.ts:64-113`, append-only, the OCR job writes), `claim_death_certificate_reviews` (`schema/claim_death_certificate_reviews.ts:63-116` — `verdict`, `rejection_reason`, `decided_at`, `superseded_at`, `superseded_reason` ∈ `re_reviewed | replaced`; one live per claim, `:112-114`) | CR1's FKs, CR2's anchors |
| The window-entry event | `claim.peer_mesh_pinged` (`state.ts:131-133`; emitted at `apps/jobs/src/claim-peer-mesh.ts:274-299`); `events_log.occurred_at` (`schema/events_log.ts:71-73`) | CR3 |
| What the family already sees | `GET /api/v1/member/claims/:claimCaseId/death-certificate` (`claims.routes.ts:300-311`; contract `MemberDeathCertificateStatusResponse`, `packages/contracts/src/claims/death-certificate.ts:139-162`); `apps/mobile/app/(claim)/certificate-replacement.tsx`; `DeathCertificateNotice.tsx`; `certificate.*` keys (`claim.json` en `:111-120`); the helpline send `POST …/admin/claims/:claimCaseId/documents?documentType=death_certificate` | ⛔ no change — the SMS points the family at these |
| The contact record | `claim-contact-check.ts`: `readClaimContact`, `readVersionChainIndex`, `correctionChainOf`, `resolveContactRow`, `claimantLinkCountsFor`, `readClaimContactAgreementState`; schema `schema/claim_contacts.ts` | CR6, CR9 |
| The send | `sendClaimCorrectionSms` (`apps/jobs/src/scheduler/claim-correction-reminders.ts:246-313`, exported, jobs-only); `CLAIM_CORRECTION_SMS_TEMPLATES`, `renderClaimCorrectionSms`, `claimCorrectionHelplineConfigKey` (`claim-correction-sms-templates.ts`); `claimShortReference` (`correction-chase.ts:869`); `CORRECTION_SEND_TIMEOUT_MS` and `CORRECTION_PLAN_LOCK_TIMEOUT` (`claim-correction-reminders.ts:112`, `:109`); `CORRECTION_SEND_LEASE_MS` (`correction-reminder-record.ts:59`) | CR7 |
| The schedule pieces | `CORRECTION_REMINDER_DAYS` (`correction-schedule.ts:24-26`), `LETTER_CHASE_*` (`:35-37`), `CORRECTION_REMINDER_SWEEP_CRON` (`:44`), `istDateOf` (re-exported `:113`), `correctionCatchUp` (`:122-137`), `calendarDaysBetween`; `addCalendarDays` (`cycle-calendar/holiday-resolver.ts`) | CR4, CR10 |
| Person state | `nomineePersonKey` (`correction-chase.ts:590`), `DEAD_OUTCOMES`, `isEvidentialReminderRow`, `compareReminderRowsByTime`, `evaluatePersonRunState` (`:690-772`) | CR6, CR8 |
| The letter precedent | `claim/closure-letter.ts` (`assertClosureLetterAllowed` `:58`, `recordClosureLetter` `:116`, `recordClosureLetterDelivery` `:168`); migration 0134; routes `claims.correction-closure.routes.ts:89-90, 117-153`; admin `CorrectionClosureRoutes.tsx` `ClosureLettersView` (`:212`), `ClosureLettersOwed.tsx` | CR9, CR11 |
| Staff directory | `getLiveShepherd` (`shepherd-read.ts:36`), `listAdminsByRole` (`admin-directory.ts:43`) | CR10 |
| The negative's anchor | `requestCorrectionClosure` (`correction-closure.ts:790-807`) → `CorrectionClosureRefusedError('no_live_return')` → 409 `closure.no_live_return` (`claims.correction-closure.handlers.ts:100, 218`); `readClosureReadiness` (`correction-closure.ts:719`); the fence model `apps/jobs/tests/claim-correction-closure-no-decision.test.ts` | AC6 |
| The approval wait | `assertDeathCertificateAcceptedForApproval` (`death-certificate-approval.ts:393-407`) → 409 `…death_certificate_acceptance_required` at P1/P3/P4 and 6.19c — ⛔ never a denial (`verifier-decision-persist.ts:365-369`) | AC6 (unchanged) |
| Key (1) | `claim.record_correction_letter` (`permissions.ts:730`, the 48 → 49 block; `roles.ts:124, 514` — `district_admin`) | CR11 |

### What moves (the *UPDATE* list CR14 permits), and what must be preserved
- **UPDATE:** `apps/jobs/src/scheduler/claim-correction-sms-templates.ts` (a union member + its two entries — ⚠ 6.19b's and 6.19c's sends
  must render byte-identically: the existing template test proves it); `apps/jobs/tests/claim-correction-sms-templates.test.ts`;
  `packages/i18n/locales/{en,hi}/claim.json` (one key + one `$comment` in each); `packages/queue/src/index.ts`; `apps/jobs/src/boot.ts`;
  `packages/domain/src/{schema/index.ts,policies/index.ts,claim/index.ts}`; `packages/domain/migrations/meta/_journal.json`;
  `packages/contracts/src/claims/index.ts`; `apps/api/src/modules/claims/index.ts`; `apps/admin/src/{router.tsx,routes/RootLayout.tsx,api/hooks.ts,api/client.ts}`;
  doc-blocks in `packages/domain/src/schema/claim_correction_chase.ts:53`, `packages/domain/src/claim/correction-schedule.ts:61`,
  `packages/domain/src/rbac/permissions.ts` (key (1)); exporting, unchanged, a helper CR8 needs (if any is private);
  `scripts/claim-adjudication-human-actor-invariant/check.ts` (the entry + `COVERAGE_FLOOR`); the docs of Tasks 0, 7, 8, 9, 11
  (`.decision-log.md` via BigDev, the shared spec, the UX spec, the DLT sheet, `inventory-roster.md`, the ledger, the surface inventory,
  `deferred-work.md`, `epics.md`, `sprint-status.yaml`); `apps/api/src/audit/audit-sink.ts` (five new `admin_claim_certificate_reminder.*`
  `AuthAuditEventType` members — additive only); `apps/api/src/modules/claims/claims.correction-chase.handlers.ts` (widens the exported
  `LetterCodePrefix` type with `'certificate_letter'`, type-only, no behaviour change — ⚠ added here by code review 2026-10-03;
  Completion Notes deviation (1) disclosed both edits but this list and AC9 itself were never amended to match);
  `packages/queue/tests/queue-client.test.ts` (one pure `QUEUE_NAMES` uniqueness test, additive — ⚠ added here by code review
  round 2, 2026-10-04: chunk 2 added the test but amended only the File List). **Preserve:** every
  6.19b/6.19c/6.21a behaviour (CR14).
- **NEW:** migrations 0137+ ; `schema/claim_certificate_reminder.ts`; the policy file(s); `claim/certificate-reminder-schedule.ts`,
  `claim/certificate-reminder.ts`, `claim/certificate-letter.ts`; `apps/jobs/src/scheduler/claim-certificate-reminders.ts`;
  `packages/contracts/src/claims/certificate-reminder.ts`; `apps/api/src/modules/claims/claims.certificate-reminder.{routes,handlers}.ts`;
  `apps/admin/src/modules/certificate-reminders/**` and its route.

### Testing
- **Unit (injected clock `now: () => NOW`):** `packages/domain/tests/claim/certificate-reminder-schedule.test.ts` (the 25 days; ⛔ nothing on
  day 0; ⛔ nothing after day 180; day 180 sent (`> 180`, ⛔ never `>=`); catch-up `late`/skip; IST midnight edges); `certificate-reminder-plan.test.ts`
  (every `planCertificateRun` arm — open rejected / missing; a re-rejection of the same upload ⛔ never restarts; a different upload restarts and
  `open` wins over `certificate_received`; missing → first rejection (Q3); received; completed; pause outside the window and resume on
  `reversed` (Q2); pause on an accepted anchor and resume on re-rejection (Q4); `completed` while paused; a missed day-180 sweep ⛔ not caught up; a run
  opened already past 180 ⇒ open + `completed` in one tx, ⛔ no send); `certificate-recipients.test.ts` (`chainHeadOf` linear / fork /
  vacated; claimant block vs version; dedupe by chain root; two roots for one human ⇒ one text per slot); `apps/jobs/tests/claim-certificate-reminders.test.ts`
  (mocked deps by name, the 6.19b `claim-correction-control-paths` shape — ⚠ it mocks readers BY NAME, so keep names stable).
- **Live-DB (`twt-test-pg`, own-committing, `{timeout:20000}`):** `packages/domain/tests/integration/claim/certificate-reminder.spec.ts`;
  `…/rls/claim-certificate-reminder-policy-regression.spec.ts` (+ the DB ↔ TS CHECK lockstep); `apps/jobs/tests/claim-certificate-reminders-live.test.ts`
  (seed on `_claim-correction-seed.ts`'s pattern, `pariwarAllowlist` test-only); `apps/api/tests/integration/claims/certificate-reminder.spec.ts`
  (the letter routes, both step-ups, every refusal, cross-Pariwar 404, the list's per-district filter; the list row set — an owed letter on an ENDED run is listed, a paused run on `approved` with ⛔ no
  owed letter is hidden; the number-level letter refusal and delivered-letter stop of CR6). ⚠ Use REAL envelopes where AC8's
  sentinels are asserted (6.19b slice trap S5).
- **Races (NOWAIT / `lock_timeout`, `{timeout:60000}`):** copy or extract the `overlapped()` helper (a local function in
  `packages/domain/tests/integration/claim/correction-chase-concurrency.spec.ts:266`); the child vs a review writer rejecting/accepting the
  same claim; the child vs the OCR job moving the current pointer; two sweeps opening the same run (the UNIQUE wins, ⛔ never a duplicate); a stale plan (sweep 2 planned before sweep 1 opened) returns
  `stale` and ⛔ never ends sweep 1's new run; two children of one number in one slot (CR6's race and dead cases). ⚠
  Compare µs timestamps in SQL, ⛔ never as JS `Date` (6.19c's ms-truncation finding).
- **AC6 negative:** the closure 409 on a certificate-only claim; the both-waits readiness equality; the source-scan fence with its positive
  control.
- **AC9:** the untouched suites run unmodified; `permissions.test.ts` still `50 / 64`; the two existing SMS byte-identical.
- ⚠ [[project_fk_truncate_cascade_deadlock]] — the new FKs to `member_nominee_versions` and the certificate tables join the TRUNCATE set:
  use `lockTruncateSetNowait` (`tests/integration/_helpers.ts:656`), as 6.19b had to.

### Previous-story intelligence (6.19b → 6.19c → this)
- 6.19b's five review passes found: a NULL `subject_key` voiding a UNIQUE; a day-key index missing `purpose`; catch-up skip markers colliding
  with a real send (`ON CONFLICT DO NOTHING` dropped it) — ⇒ ⛔ no skip markers for staff slots; a child redelivered after midnight sending
  yesterday's slot; hash-less `error` rows splitting a number epoch (⇒ `isEvidentialReminderRow`); a past-dated letter making a negative slot
  that hit `slot_day_check` and rolled back the whole claim's sweep (⇒ first `slot < 1` skipped with an alarm, then 6.19b's K2 clamp to
  today's slot — ⭐ follow K2: a carried due date is written at today's slot, ⛔ never dropped); Secret Manager fault classification
  (only known config codes are final). ⭐ Each is a test here.
- 6.19c found: TanStack `onSettled` before `success`; ms truncation; a lost compare-and-set reported as sent (⇒ check `moved` on every CAS);
  `$1::date - $4::int` at IST midnight (⇒ `cycleCalendar.istMidnightAt`); upper-case UUIDs at the boundary; the screenshot step-up.
- ⚠ Inherited and deferred (⛔ not fixed here): at-least-once SMS; dotted Secret Manager key names unverified; `onAlarm` is `console.warn`; the
  cross-tenant unreachable-burst alarm.

### Interactions to state, ⛔ not prevent
- Two SMS on one morning (Trap 9). A bank-ground human closure pauses the certificate run (CR12). A Super Admin hold does ⛔ not pause it
  (CR5). A post-death nominee version on the contact record is texted, and an as-at-death nominee replaced after the death is ⛔ not (Trap 2).
  A dead-lettered OCR job keeps a family chased (Trap 3).

### Latest technical notes
No new library. TRAI DLT: each content template is registered with its `{#var#}` slots before use and the send must match the registered text
exactly (the lockstep test). Hindi is Unicode — 70 characters single / 67 per concatenated part; GSM 160 / 153. pg-boss's default retry is 2
immediate — set the policy explicitly (6.19b AC2).

### References
- `.decision-log.md` — `-236` BB, CC1 · `-244` 6.21a D16, §3 call 7 · `-247` §2 · `-250` #1, #4, #5 · `-252` cl.1 · `-253` cl.1 · `-255` F6,
  F7 · `-259` · `-260` G5, G6 (G4 by analogy) · `-265` §2 (key (1)), §4 (DLT) · `-266` §1 (superseded in part by CR1), §5 (D32), §6 (D33) ·
  `-267` §5b · `-269` §4, §5 · `-271` §1 · `-272` §0, §2 · `-273` §1 and its confirms rule · `-274` 1b, 2. · ⭐ **`-275` Q1–Q4** (Trustee-ratified, 2026-10-03).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-27-6-19d-replacement-certificate-reminder.md` (the ⏳ block is filled:
  `-259`); `…-2026-09-27-6-19-follow-ups-2.md` (G4–G6; G4 is Part 2, the correction return). `…-2026-10-03-6-19d-four-confirms.md` (Q1–Q4; ruled `-275`).
- The shared spec; Stories 6.19a (W1–W10), 6.19b (AC2–AC5), 6.19c (AC6, the closure letter), 6.21a, 6.21b.
- `docs/launch-gate-inventory/{dlt-template-requests-6-19,inventory-roster}.md`; `docs/fallback-handler-ledger/ledger.md` row 19 and §7;
  `docs/degradation-policy/surface-inventory.md`.
- `epics.md` §6.19d, §6.21a (coupling (2)); `ux-design-specification.md` Journey 2, `<ClaimDocumentUpload>`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `/bmad-dev-story 6.19d`, 2026-10-03.

### Debug Log References

- Task 0.1: `git diff --name-only 06b3ebdf..HEAD -- packages apps scripts docs` was EMPTY; the only decision-log commit since the pin was `-275`. `-276` drafted in the scratchpad, inserted by BigDev (with their two wording edits: CR6's *"T12 continues to govern 6.19b; it does ⛔ not define 6.19d's recipient population"*, CR5's *"For a sweep decision, precedence is: …"*), verified additive-only (50 / 0) and byte-identical to the draft, committed ALONE (`a9e90272`).
- Four 0137–0139 constraint names exceeded Postgres's 63-byte identifier limit (silently truncated) — shortened before any commit (the local test DB was re-migrated; ⛔ nothing applied anywhere else).
- The anchor CHECK first fired before the cause CHECK on an unknown cause — rewritten so it is silent on an unknown cause (the cause CHECK names that one).
- The candidate scan compared the `claim_lifecycle_state` enum with `text[]` — cast to `claim_lifecycle_state[]`.
- A seeded claim with no events falls back to `intake_pending` when the review writer re-projects it — the live specs drive the claim through the projector instead.

### Completion Notes List

- ⭐ **Governance first (AC0):** author-commit **`2026-10-03-276`** (CR1–CR15) committed alone before any code; the shared spec v1.21 carries the D3 / D11 / T12 markers and its status table (6.19c `done`, 6.19d `ready-for-dev`); the UX spec carries CR15's two annotations; the two code comments `-276` supersedes are marked (`CORRECTION_RUN_KINDS`, `SCHEDULE_TABLE`) — ⛔ 0127's SQL comment untouched.
- **Migrations 0137–0139 (CR1):** the runs (`rejected` / `missing`, the anchor pair, ONE open per claim, ONE per rejected upload, ONE `missing` per claim), the reminder record (0128's shape; `subject_key` pinned by a CHECK both ways; the staff day key WITH `purpose`), the letters (0134's shape; ONE per person per CLAIM). RLS + FORCE, per command, ⛔ no DELETE; column-narrowed UPDATE grants. 47-test policy-regression spec incl. the DB ↔ TS lockstep.
- **Domain:** the schedule (`CORRECTION_REMINDER_DAYS` IMPORTED + 120/150/180; `> 180`), the PURE planner (open ≻ completed ≻ received ≻ pause ≻ continue — 30 unit tests incl. Q2/Q3/Q4 and the CR10 chase planner), the opener under the CLAIM-ROW lock (re-plans ⇒ `stale`; SAVEPOINT before ending the old run; 23505 ⇒ `exists`), the recipients from the CONTACT RECORD (`chainHeadOf` — fork-safe; positions A, B, …), the person-state adapter onto 6.19b's evaluator (per-NUMBER delivered-letter stop), the reminder record (hash written on `attempting` — CR7's one departure; finalisers keep it), the letter (one per person per claim AND per number; hashes before the lock), the list read.
- **Jobs:** the sweep (open runs ∪ window candidates, keyset-paged; hashes BEFORE the claim-row lock; `lock_timeout` first; open / end / pause / catch-up; the CR10 chase RECORDS — ⛔ no staff push) and the child (one text per number; the per-number letter stop; a KMS failure recorded `exhausted:hash_failed` on the final attempt; crossed-midnight expiry). The third SMS message `certificate_reminder` (6.19b's send reused unchanged); queues; boot wiring.
- **API + contract:** five key-(1) routes (the list gated by `resolveQueueScopeStash` + `requirePermissionHook` + a per-row district filter; the address AND the screenshot behind the fresh step-up `certificate_letter_address`); an exhaustive `certificate_letter.*` switch; the human-actor gate enrolled, `COVERAGE_FLOOR` 15 → 16. Catalog stays **50 / 64**.
- **Admin:** `/p/$pariwarId/certificate-reminders` — each person by position and role (⛔ no name), the escalation line *"(the Pariwar Admin is not notified in this version)"*, the one-letter form; the "Letter recorded" line sits OUTSIDE the form's branch, so it survives the refetch (a mutation-check showed the test FAILS with it inside); the submit stays disabled through the refetch.
- **Records:** DLT sheet rows 5–6 (keys, texts, slots, cost: ≤ 25 slots per rejected certificate), launch-gate **row 21** (`open`), ledger row 19's xref + a §7 revision row (trigger + `rejected_unreachable`; the + 13 escalation is a RECORD reaching ⛔ no Pariwar Admin in v1), a surface-inventory Tier-2 row, key (1)'s doc-block, `deferred-work.md`'s 6.19d section, `epics.md` §6.21a / §6.19d annotations.
- ⚠ **Deviations, stated:** (1) two edits OUTSIDE the Dev Notes *UPDATE* list — `apps/api/src/audit/audit-sink.ts` (five new `admin_claim_certificate_reminder.*` audit event types; the union is closed) and `claims.correction-chase.handlers.ts` (`LetterCodePrefix` widened by `'certificate_letter'` — a type-only widening, ⛔ no behaviour change, so the shared date / screenshot helpers carry the right code prefix); (2) THREE new domain modules beyond the three the story named — `certificate-reminder-record.ts` (the record writers) and `certificate-reminder-read.ts` (the list read) split out for size; (3) the jobs unit test with mocked deps covers the guard paths only — the sweep / child behaviour is proven by the live suite (15 tests); (4) two of the listed races are ⛔ not built (the child vs the review writer / the OCR pointer move) — recorded in `deferred-work.md`; the concurrent-sweep and concurrent-same-number races ARE built.
- ⭐ **Verification:** `ci:local` with the live DB — first run: every job green but `domain-invariants` (the list read's `.limit(scan)` held the `clampLimit` in a variable; the gate wants it inline) — fixed (behaviour-identical), then the full re-run **PASSED, 34 / 34 jobs green**. The 6.19d suites re-run against the live DB after the fix: domain 117 (incl. the 47-test policy spec and 15 runs/recipients/letter specs), jobs 59 (incl. 15 live), API 6, admin 7, contracts 3. ⛔ No 6.19b / 6.19c / 6.21a / 6.21b suite was modified except the two Trap 10 names (the SMS template test; the human-actor gate); `permissions.test.ts` still 50 / 64; `packages/channels/src` diff empty.
- ⚠ **Red-first, honestly:** the schedule, template, admin-banner and fence tests were shown to fail before their code (or by a mutation check); the planner, recipients, policy-regression and API specs were written in the same step as their code and ran green on first full run after fixes — ⛔ not separately shown red.

### File List

**New**
- `packages/domain/migrations/0137_claim-certificate-reminder-run.sql`
- `packages/domain/migrations/0138_claim-certificate-reminder.sql`
- `packages/domain/migrations/0139_claim-certificate-reminder-letter.sql`
- `packages/domain/src/schema/claim_certificate_reminder.ts`
- `packages/domain/src/policies/claim-certificate-reminder-rls.ts`
- `packages/domain/src/claim/certificate-reminder-schedule.ts`
- `packages/domain/src/claim/certificate-reminder.ts`
- `packages/domain/src/claim/certificate-reminder-record.ts`
- `packages/domain/src/claim/certificate-letter.ts`
- `packages/domain/src/claim/certificate-reminder-read.ts`
- `packages/domain/tests/claim/certificate-reminder-schedule.test.ts`
- `packages/domain/tests/claim/certificate-reminder-plan.test.ts`
- `packages/domain/tests/claim/certificate-recipients.test.ts`
- `packages/domain/tests/integration/claim/certificate-reminder.spec.ts`
- `packages/domain/tests/integration/claim/certificate-reminder-send.spec.ts` (code review, Task 10 follow-up)
- `packages/domain/tests/integration/claim/certificate-reminder-list.spec.ts` (code review, Task 10 follow-up)
- `packages/domain/tests/integration/rls/claim-certificate-reminder-policy-regression.spec.ts`
- `packages/domain/migrations/0141_claim-certificate-reminder-purpose-outcome-check.sql` (code review)
- `packages/contracts/src/claims/certificate-reminder.ts`
- `packages/contracts/tests/certificate-reminder-lockstep.test.ts`
- `apps/jobs/src/scheduler/claim-certificate-reminders.ts`
- `apps/jobs/tests/claim-certificate-reminders-live.test.ts`
- `apps/jobs/tests/claim-certificate-reminders.test.ts`
- `apps/jobs/tests/claim-certificate-reminder-no-decision.test.ts`
- `apps/api/src/modules/claims/claims.certificate-reminder.routes.ts`
- `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts`
- `apps/api/tests/integration/claims/certificate-reminder.spec.ts`
- `apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx`
- `apps/admin/src/modules/certificate-reminders/errors.ts`
- `apps/admin/src/modules/certificate-reminders/i18n-en.ts`
- `apps/admin/src/modules/certificate-reminders/index.ts`
- `apps/admin/src/routes/CertificateReminderRoutes.tsx`
- `apps/admin/tests/certificate-reminders.test.tsx`

**Modified**
- `.decision-log.md` (`-276`, inserted by BigDev)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`, `packages/domain/src/claim/index.ts`
- `packages/domain/src/schema/claim_correction_chase.ts`, `packages/domain/src/claim/correction-schedule.ts` (doc-block markers only)
- `packages/domain/src/rbac/permissions.ts` (key (1) doc-block only)
- Code review (2026-10-03, chunk 1 — domain): `packages/domain/src/claim/certificate-reminder.ts` (`samePlan`, `chainHeadOf`, the `as never` removal, the stacked-JSDoc merge, the `certificate_not_rejected` doc comment, the `CERTIFICATE_LIST_RUN_STATES`/`CERTIFICATE_LIST_PERSON_ROLES` exports), `certificate-reminder-record.ts` (`skipCertificateReminder`'s lost-CAS re-check), `certificate-reminder-read.ts` (`{items, truncated}`, the `nextReminderOn`/`runState` fix, the two new exported role/run-state constants), `certificate-letter.ts` (`evaluateLetterPrecondition`'s signature, `'claim_not_found'`, the `address_missing` doc comment), `packages/domain/src/schema/claim_certificate_reminder.ts` (the new purpose/outcome CHECK), `packages/domain/tests/integration/rls/claim-certificate-reminder-policy-regression.spec.ts` (the new CHECK's test), `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts` (`'claim_not_found'` case, `scan.truncated` handling)
- Code review (2026-10-03, chunk 2 — contracts+queue+i18n): `packages/contracts/src/claims/certificate-reminder.ts` (`CERTIFICATE_REMINDER_ROLES`, the pause-reason/`agreement_not_live` comments, the `tracking_number` trim, `run_day`'s `.min(0)`, `RecordCertificateLetterResponse`, `truncated` on `CertificateRemindersResponse`), `packages/contracts/tests/certificate-reminder-lockstep.test.ts` (role/run-state lockstep, the 3 previously-untested schemas, the tracking-number boundary + trim tests), `packages/queue/src/index.ts` (the sweep queue-name fix + doc wording), `packages/queue/tests/queue-client.test.ts` (the `QUEUE_NAMES` uniqueness test), `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts` (`truncated` on the response), `apps/admin/tests/certificate-reminders.test.tsx` (two fixtures updated for the new required `truncated` field)
- Code review (2026-10-03, chunk 3 — apps/api+apps/jobs): `apps/jobs/src/scheduler/claim-certificate-reminders.ts` (the `plan.kind` exhaustiveness guard, the dead `now` parameter removed, the `recipientsMoved` alarm reworded), `apps/api/tests/integration/claims/certificate-reminder.spec.ts` (the `no_screenshot` 404 test, the orphan-cleanup assertion), the Dev Notes "What moves" list (added `apps/api/src/audit/audit-sink.ts` and `apps/api/src/modules/claims/claims.correction-chase.handlers.ts`, AC9)
- Code review (2026-10-03, chunk 4 — apps/admin): `apps/admin/src/modules/certificate-reminders/CertificateRemindersList.tsx` (the duplicate reveal-control fix, the delivered-late copy branch, the full screenshot-view feature + shared step-up `pendingAction` state, two new `data-testid`s), `apps/admin/src/modules/certificate-reminders/errors.ts` (413/415 classification), `apps/admin/src/modules/certificate-reminders/i18n-en.ts` (`truncated`, `deliveredLate`, the screenshot copy, `tooLarge`/`unsupportedMediaType`), `apps/admin/src/routes/CertificateReminderRoutes.tsx` (the `truncated` banner), `apps/admin/tests/certificate-reminders.test.tsx` (4 new tests, the `params` reset, the 2 fragile-selector fixes)
- `packages/contracts/src/claims/index.ts`
- `packages/queue/src/index.ts`
- `packages/i18n/locales/en/claim.json`, `packages/i18n/locales/hi/claim.json`
- `apps/jobs/src/scheduler/claim-correction-sms-templates.ts`, `apps/jobs/tests/claim-correction-sms-templates.test.ts`, `apps/jobs/src/boot.ts`
- `apps/api/src/modules/claims/index.ts`, `apps/api/src/audit/audit-sink.ts`, `apps/api/src/modules/claims/claims.correction-chase.handlers.ts`
- `apps/admin/src/api/client.ts`, `apps/admin/src/api/hooks.ts`, `apps/admin/src/router.tsx`, `apps/admin/src/routes/RootLayout.tsx`
- `scripts/claim-adjudication-human-actor-invariant/check.ts`
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md`, `docs/launch-gate-inventory/inventory-roster.md`
- `docs/fallback-handler-ledger/ledger.md`, `docs/degradation-policy/surface-inventory.md`
- `_bmad-output/implementation-artifacts/6-19-correction-return-reminders-and-closure.md` (v1.21 markers)
- `_bmad-output/planning-artifacts/ux-design-specification.md` (CR15 annotations)
- `_bmad-output/planning-artifacts/epics.md` (Task 11 annotations)
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-19d-replacement-certificate-reminder.md`
- Code review round 2 (2026-10-04, ⛔ no new file): `apps/admin/src/modules/certificate-reminders/{CertificateRemindersList.tsx,i18n-en.ts}` ("Send a new code"; ⛔ no reminder date beside cannot-remind; the truncated / empty-truncated copy), `apps/admin/src/routes/CertificateReminderRoutes.tsx` (banner `role="status"`, ⛔ empty copy when cut), `apps/admin/tests/certificate-reminders.test.tsx` (+6), `apps/api/src/modules/claims/claims.certificate-reminder.handlers.ts` (`truncated` covers the page slice), `apps/api/tests/integration/claims/certificate-reminder.spec.ts` (the orphan test on `delivered_before_posted`; +1 page-slice test), `packages/contracts/src/claims/certificate-reminder.ts` (`run_day` loose; the alias dropped), `packages/domain/src/claim/certificate-reminder-read.ts` (`limit + 1` inline-clamped; today's slot only while unstarted), `packages/domain/tests/integration/claim/{certificate-reminder-list,certificate-reminder-send}.spec.ts`, `packages/queue/src/index.ts` (the sweep name restored), `_bmad-output/implementation-artifacts/deferred-work.md`

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13). AC12 carried verbatim; `backlog` — fenced on its routing note. |
| v1.1 | 2026-09-27 | `-259` recorded — the fence lifted; ACs owed. |
| v1.2 | 2026-09-27 | `-260` G5–G6 recorded — the restart and the days. |
| **v2.0** | **2026-10-03** | ⭐ **DERIVED (`bmad-create-story`), ⛔ not appended.** Baseline re-pinned `c136b03c` → `06b3ebdf` (6.19a/b/c all `done`). Three read-only passes traced the code. **Found:** 6.19b's runs table cannot hold a certificate wait (five conflicts, Trap 1) ⇒ **CR1, own tables — supersedes `-266` §1's two 6.19d sentences (author-commit, Task 0)**; 6.19b's recipient reader would text nobody (the determination needs an accepted certificate) ⇒ **CR6, the contact record's people (`-259` detail 2's words)**; the trigger covers `rejected` only ⇒ CR2 adds `missing`. ACs AC0–AC10, Tasks 0–11, decisions CR1–CR15 (⏳ PROPOSED). Status `backlog` → **`ready-for-dev`**; code is gated on Task 0's author-commit. v1.x text kept in git at `06b3ebdf`. |
| **v2.1** | **2026-10-03** | ⭐ **Two fresh-context adversarial validators (code + design; governance) — 46 findings, all applied, ⛔ no BLOCKER.** **Design:** the sweep pages OPEN RUNS ∪ candidates (a received certificate dropped the claim from the candidate set, so runs never ended); an accepted anchor **pauses** its run (a rejected → accepted → re-rejected certificate was left unchased — Q4); `open` wins over `certificate_received` (a second rejection between sweeps lost its next-morning slot); **CR9 one letter per person per CLAIM** (the per-run reading sent more than `-259` detail 1's "ONE" and was a Panel question — Q1, built under `-273`'s *"sends nothing more"*); the claim-row lock gains `lock_timeout` and ⛔ no KMS inside it; one text per number per slot; the per-claim status read (⛔ never a second bulk definition) or a parity test; the list's gating is 6.19c's queue-scope + per-row district filter; the screenshot route's step-up; the admin copy's per-module file; the decision-writer fence's real model; `COVERAGE_FLOOR` 15 → 16; AC8's sentinel paths corrected to 6.19b's. **Governance:** `-260` G4 is the correction-return twin, ⛔ not this story's ruling — the next-morning rule now cites `-250` #5 via `-259` cl.1; Q1–Q4 named as confirms owed to the Panel's next note (⛔ not blockers); CR6 cites `-253` cl.1 and states its converse (an as-at-death nominee replaced after the death is ⛔ not texted) and T12's non-application; CR10's departure from D11 recorded; invariant 2 labelled ours; the Hindi takes the house words `तिथि` / `प्रमाणपत्र` (`-244` §3 call 7); `-274` 1b cited for the hold; ledger row 19 gains a §7 revision row. |
| **v2.2** | **2026-10-03** | ⭐ **Round-2 fresh-context validate of v2.1 — ⛔ no BLOCKER; 12 findings, all applied.** One text per NUMBER per slot, decided deterministically (the hash written on the `attempting` row; the lowest person key sends; a delivered letter stops the number; one letter per number) with a race test; the horizon checked BEFORE planning (⛔ never a "day 180" text on day 181; a run already past 180 opens and completes in one tx); the day-13 escalation is a RECORD that reaches ⛔ no Pariwar Admin in v1 (⛔ no push, ⛔ no Pariwar-Admin surface) — stated in CR10, the ledger row and Task 9, ⛔ never claimed as delivered; the staff chase carried across runs at today's slot (6.19b's K2), ⛔ never negative or skipped; the list reaches every owed letter (any run) and hides paused runs on finished claims; the list gate's missing `requirePermissionHook`; AC8's decrypt-to-hash sites; the catch-up's recorded-day set (this run, any outcome — ⛔ never `epochRows`); the opener's SAVEPOINT; the AC ↔ Task map (Task 10 → AC6/AC9; AC10 → Task 11); two cites (`:721`, `:790-807`). |
| v2.3 | 2026-10-03 | BigDev agreed CR1 (own tables, superseding `-266` §1's two 6.19d sentences) and CR6 (the contact record's people) — *"yes, agreed"*. ⚠ Only those two were put; CR2–CR5 and CR7–CR15 stay ⏳ PROPOSED, and Task 0's author-commit must say which CRs BigDev agreed to and when ([[feedback_story_validate_footguns]] #33(c)). |
| v2.4 | 2026-10-03 | Q1–Q4 routed: `trustee-panel-routing-note-2026-10-03-6-19d-four-confirms.md` (⏳ awaiting). Our readings put: Q1 **B** (a letter with each rejected certificate — A built meanwhile), Q2 A, Q3 A, Q4 A. ⛔ Nothing blocked. |
| v2.5 | 2026-10-03 | ✅ **The Panel ruled Q1–Q4 — `2026-10-03-275`, all A** (DR + KB). Q1: ONE letter per claim, ever — ⚠ our reading B ⛔ not taken. Q2–Q4: our readings taken. Each A is what was already built ⇒ ⛔ no design change. Q1–Q4 marked RULED at every site (the Panel table, §0, CR9, AC0, Task 0.2, Task 9); ⛔ no confirm still owed. |
| v2.6 | 2026-10-03 | Two round-2 patch defects fixed (CR6 *"claim row"* → the `attempting` row; CR7 names its one departure). Then **round 3** (fresh-context, scoped to the v2.2+ text) — ⛔ no BLOCKER; 12 findings, all applied: CR6's per-number rule given a mechanism (hash EVERY person before the lock; lowest key sends; a dead-number row also blocks; per-number delivered-letter stop; one letter per NUMBER as a code check) + four tests; the opener re-reads under the lock, returns `stale`, and savepoints BEFORE ending the old run (⛔ never an orphaned end); the KMS-failure path records a final `error` row (⛔ never an unrecorded slot re-sent `late`); CR5's precedence (`completed` before pause) + three planner arms; `-275` cited at CR2/CR3/CR4/CR5/AC4; the staff call after a second rejection recorded as deferred (`-275` does NOT cover); the escalation's list copy ⛔ never says notified; AC5's escalation ONE per epoch; the list row set defined + tested; the sweep's hash-before-lock; cites (`readClosureReadiness` back to `:719` — round 2's `:721` was wrong; the per-row filter is `getClosureLettersOwed`). |
| **v2.7** | **2026-10-03** | ⭐ **BUILT (`/bmad-dev-story`).** Task 0: author-commit **`-276`** (CR1–CR15) inserted by BigDev and committed alone; the shared spec v1.21 markers; the UX spec's CR15 annotations. Tasks 1–11: migrations 0137–0139 + RLS; the domain schedule / planner / opener / recipients / person state / record / letter / list read; the jobs sweep + child + the third SMS message; five key-(1) API routes (gate floor 15 → 16; catalog 50 / 64); the admin list + one-letter form; DLT rows 5–6, launch-gate row 21, ledger row 19 + §7, the surface inventory, key (1)'s doc-block; `deferred-work.md`; `epics.md` §6.21a (coupling (2) DISCHARGED BY THE BUILD) / §6.19d. Deviations stated in Completion Notes (two edits outside the UPDATE list; two extra domain modules; two races recorded ⛔ not built). |
| v2.8 | 2026-10-04 | **Code review round 2** on the review-fix commit `1ff6b9e8` only (3 layers in parallel): 16 patches applied, 5 deferred, 13 dismissed — plus two defects of the 5-chunk pass found while patching (HEAD failed the `domain-accessor-invariants` gate; 0141 was ⛔ not applied locally). Notable: the reveal dead-end the chunk-4 fix introduced; `truncated` now covers the page slice; the orphan-cleanup and CR6 `taken` tests rebuilt to genuinely bite (parity-checked); the sweep-queue rename reverted; the bookkeeping corrected (totals, two resolved defers, a twice-fired trigger re-keyed). `ci:local` 34/34 green. Status stays `done`. |
