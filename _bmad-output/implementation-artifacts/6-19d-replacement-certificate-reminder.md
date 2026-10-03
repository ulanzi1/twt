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

Status: in-progress

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
- [ ] **Task 9 — `deferred-work.md` (AC10; a new "Recorded during Story 6.19d" section):** the OCR-stall case (Trap 3 — ⭐ cross-reference the existing OCR-parity retry/decrypt items, ⛔ no duplicate); the zero-candidate peer-mesh stall (Trap 6); the T12 legacy `missing` and the tolerance path (Trap 6); ⛔ no staff push, and so the day-13 escalation reaches ⛔ no Pariwar Admin (CR10; trigger: an admin client that registers a device token, or a Pariwar-Admin view); the at-least-once double SMS (inherited; trigger: a gateway idempotency key / DLR seam); ⛔ no virus scan on the letter screenshot (D6); ⛔ no RTBF path on the new tables (T8's class); ⛔ no staff prompt to call a dead-phone family after a second rejection (CR10; `-275` "does NOT cover"; trigger: a staff call-task seam);
⛔ not Q1–Q4 (✅ ruled by `-275` — discharged, ⛔ nothing to defer).
- [ ] **Task 10 — Tests (AC6, AC9, AC10)** — see *Testing*. Then `pnpm -w typecheck`, lint, the domain / jobs / api / admin / contracts / i18n suites and `ci:local` (⚠ [[project_ci_local_double_run_pollution]], [[project_known_livedb_test_failures]] — a known flake is named, ⛔ never silently re-run).
- [ ] **Task 11 — Close-out (AC0's records).** `epics.md` §6.21a: an appended annotation *"coupling (2) DISCHARGED BY THE BUILD — Story 6.19d"*, and §6.19d: *"ACs derived 2026-10-03; built …"* (annotations only; ⚠ §6.19d's header and ledger row 19 say *"`-260` G4–G6"* — recorded, ⛔ not rewritten: G4 is the correction twin); the shared spec's header line on 6.19d left as written. Status → `review`.

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
  `deferred-work.md`, `epics.md`, `sprint-status.yaml`). **Preserve:** every 6.19b/6.19c/6.21a behaviour (CR14).
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

### Debug Log References

### Completion Notes List

### File List

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
