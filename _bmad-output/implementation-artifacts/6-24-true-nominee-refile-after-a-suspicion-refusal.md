---
baseline_commit: 6bb79afd
---

<!--
BASELINE — PINNED 2026-10-07 to `6bb79afd` on `main` (`bmad-create-story 6.24`; `6bb79afd` = 6.26b's SHA-map commit after PR #261).
Two facts kept apart, as always:
  · DURABLE — the pin `6bb79afd` is an ancestor of HEAD (`git merge-base --is-ancestor 6bb79afd HEAD`).
  · PERISHABLE — every code claim below was derived against `6bb79afd` on 2026-10-07 (four read-only research passes; the load-bearing
    ones — `icp.ts:102-130` and its (3b) branch, `assertClaimApprovable` at `nominee-name-check.ts:396-423`, `commitCycleFreeze`'s loop,
    `sendHandoverOtp` at `claims.service.ts:97-135`, the T17 test, the event-count pin — re-read by the author). ⚠ Before Task 1, run
    `git diff --name-only 6bb79afd..HEAD -- packages apps scripts`; any cited file in that list is re-read.

⭐⭐ SPLIT 2026-10-07 (BigDev: *"ok, split it"*) — THIS FILE IS NOW STORY 6.24a and keeps the row key
`6-24-true-nominee-refile-after-a-suspicion-refusal` (the rulings and `-292` cite it). It builds the RFs tagged **[a]** below; Story
**6.24b** (`6-24b-filing-code-and-texts-to-the-nominee-in-place-at-the-death.md`, row `6-24b-…`, `backlog` until 6.24a is `done` — the
6.21b / 6.23b / 6.26b precedent) builds **[b]**: RF9 (the filing code), RF11 (the texts' machinery and FQ7's text) and RF12's `-291` Q2
closure text. ⭐ ⛔ No RF moves and ⛔ no RF is re-worded: every RF stays defined HERE, verbatim as `-292` committed it; the split only
allocates them. Moved out with them: P4, invariants 5–6, F6 / F10 / F14 (copied), AC6, AC7, Task 1.2, Task 5.2, Task 6, Task 7.2's SMS
key, Traps 10–14, and Q3 item 1.

STATUS: `ready-for-dev` (6.24a). ✅ Both Panel questions are RULED — `2026-10-07-291` (DR + KB, committed alone `2f674a57`): **Q1 A** — a `-239`
refusal can be appealed within **90 days**; after that with ⛔ no appeal, the true nominee's claim may be approved; **Q2 B** — she is texted
once when an allowed appeal closes her claim. v1.2 builds both (RF14, RF15, RF12) — ⛔ nothing is conditional any more.

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / nowhere); `⭐` = key fact or
action; `⚠` = hazard. Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every prepend
rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code, as of `6bb79afd`.
LETTERS: `RF1`…`RF16` are THIS story's author decisions (✅ COMMITTED by ONE author-commit, `2026-10-07-292` (`f0801f1e`); `-291` is the
Panel's ruling). Each is tagged **[a]** (built here) or **[b]** (built by 6.24b). `F1`…`F15` are FOUND facts (⛔ not decided). `Q1`, `Q2` are ruled (`-291`); `Q3` items 1–2 are ruled (`2026-10-07-293`).
-->

# Story 6.24a: The True Nominee's Refile After a Suspicion Refusal — Kept Apart, Waiting at Final Approval for the Appeal, Closed if the Appeal Is Allowed, and the 90-Day Appeal Limit `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** When a District Admin refuses a claim because the nominee was changed on or after the
> death (`-239`, reason `post_death_nominee_change`), the member's true nominee may file again. This story builds the four Panel rulings
> about that refile: her new claim is **always kept apart** from the refused one — ⛔ never merged into it (`-261` D4 B); it goes through
> every check but **waits at final approval** until the refused claim's appeal is decided, may then be approved if the appeal is refused,
> and is **closed** — ⛔ not refused — if the appeal is allowed (`-262` FQ5 A); while the refusal stands, the app's **filing code goes to
> the nominee the District Admin found in place at the death**, ⛔ never to the discarded one (FQ6 B); and the system **texts that
> nominee** *"A claim for [member] could not go ahead. Please call the helpline."* (FQ7 B — ⚠ go-live gated on counsel).
> ⭐ **The system still refuses nothing.**
> ⚠ **SPLIT (2026-10-07):** this file is **6.24a** — kept apart, the wait, `closed`, the commit re-check, the inheritance, the 90-day limit,
> the helpline appeal screen and the reason lock. The filing code (FQ6) and the two texts (FQ7; `-291` Q2) are **Story 6.24b**.

> ⭐ **What already exists — rebuild ⛔ none of it:** the refusal (`adjudicateClaim` + reason `post_death_nominee_change`, 6.20 D14); the
> refile's inherited ground inspection (`inheritedGroundInspectionSourceSql`, `claim/nominee-refusal-read.ts:99-126`) and FQ13's
> certificate check on it (6.26a GI2 — `certificate_check_required`); the as-at-death nominee (`getEffectiveNomineeDeclaration`,
> `claim/nominee-effective.ts:328`); the one approval gate (`assertClaimApprovable`) and its six call sites; the late-warning wait
> (6.23b, LAST); the DLT text path to a raw number (6.19b `sendClaimCorrectionSms`); the Ravi-mode handover OTP (`sendHandoverOtp`).
> ⭐ `epics.md` gains `### Story 6.24` at Task 0.6. Row `6-24-true-nominee-refile-after-a-suspicion-refusal`.
> ⚠ **Go-live coupling:** FQ7's text must ⛔ not go live before counsel confirms its basis (`-262` *"does NOT cover"*: the nominee never
> agreed to be contacted — the same question as `-253` M) ⇒ a roster row, and the DLT template ids stay unset so the send fails closed.

> ⚠⚠ **SIX FACTS — read before anything else** (derived at `6bb79afd`).
> 1. ⚠⚠ **Today a same-channel refile is SWALLOWED, ⛔ not merely converged.** `getConvergenceCandidate` (`claim/icp.ts:102-130`) skips only
>    `CLAIM_TERMINAL_STATES = ['settled','denied']` (`claim/read.ts:33`); a refused claim under appeal (`appeal_stage_1..3`, `reversed`) is a
>    candidate. If the refile arrives on the SAME channel as the refused claim (FQ6 makes `member_app` → `member_app` likely), branch (3b)
>    (`icp.ts:364-372`) returns the REFUSED claim's id with ⛔ no attempt row — so ⛔ no override is even possible. D4 B is built at the
>    CANDIDATE, so (3b), (3c), `getPendingIntakeAttempts` (`icp.ts:158-208`, *"must mirror `getConvergenceCandidate` EXACTLY"*) and
>    `confirmMerge` (`claims.convergence.handlers.ts:117-133`) all inherit it.
> 2. ⚠⚠ **An appeal has ⛔ no deadline, by design** (`claim/appeal-eligibility.ts:143-146`, 6.16 D-E — *"do NOT reintroduce an elapsed-time
>    gate"*). ⇒ FQ5's *"until the appeal is decided"* had ⛔ no end when nobody appeals ⇒ **Q1** (routing note
>    `2026-10-07-6-24-appeal-never-filed`) — ✅ **RULED `-291` Q1 A: 90 days** for a `-239` refusal only (RF14). That comment is AMENDED
>    for this one reason, deleted ⛔ nowhere.
> 3. ⚠⚠ **An allowed appeal does ⛔ not supersede the refusal row.** It moves the claim to `reversed` and sets `claim_appeals.status =
>    'reversed'` (`appeal-persist.ts`, `appeal-panel-persist.ts:558-628`) — the live `claim_verifier_decisions` row stays `denied` +
>    `post_death_nominee_change`. ⇒ *"a refusal STANDS"* must read the appeal anchor too (RF1). ⚠ And a `-239` can be revised to another
>    reason, or another reason to `-239`, while the claim is `denied` (`reviseDecision`, `VERIFIER_DECISION_REVISABLE_STATES =
>    ['verifier_approved','denied']`, `verifier-decision-persist.ts:59`) — before an appeal and again after a stage-3 uphold ⇒ every
>    predicate here is DERIVED at read time, ⛔ never stored.
> 4. ⚠⚠ **The gate has ⛔ no stage flag, and FQ5 holds only the FINAL approval.** `assertClaimApprovable` (`nominee-name-check.ts:396-423`) is
>    called by P1 (`adjudicateClaim`, the District Admin — FIRST) and five FINAL writers (`voteOnFrozenClaim`, `finalizeR9Outcome`,
>    `decideEscalatedClosure` ×2, `approveNoCorrectionNeeded`). FQ5 says the refile *"goes through every check"* ⇒ P1 is ⛔ never held ⇒ the
>    gate gains a REQUIRED `step` option (RF5). ⚠ And `commitCycleFreeze` (`state-trustee-decision-persist.ts:1241-1330`) emits
>    `claim.approved` with ⛔ no gate at all — `deferred-work.md` *"An inherited visit that vanishes after the final vote is ⛔ not re-checked at
>    the cycle commit"* names THIS story as its trigger (RF8).
> 5. ⚠⚠ **There is ⛔ no "closed" claim, and 6.19c's closure is ⛔ not one.** `claim_lifecycle_state` is a pgEnum
>    (`schema/claims.ts:73-92`, 15 values); 6.19c's *"closure"* (`writeClosureChain`, `correction-closure.ts:597-618`) is a DENIAL
>    (`state_trustee_denied` + `denied_no_appeal`) keyed on a `claim_correction_closures` row — and `refile-guard.ts:10-12` says FQ5's closed
>    *"must ⛔ NEVER write a closures row (this guard keys on it)"* ⇒ a new state + event (RF6).
> 6. ⚠⚠ **The filing code goes to the LATEST nominee.** `sendHandoverOtp` (`apps/api/src/modules/claims/claims.service.ts:97-103`) reads
>    `getMemberNominees(...)[0]` — the `member_nominees` projection, which is ALWAYS the latest version (6.20 D16) and survives a denial
>    (`claim/nominee-lock.ts:8-11`). In the Panel's own scenario that is the discarded nominee's phone (FQ6's Gap 1). The nominee in place at
>    the death is PERSISTED per claim: `getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId)` → its rank-1 `versionId` →
>    `member_nominee_versions.mobile_ciphertext` (Tier-1, ⛔ no blind index).

## Story

As the **true nominee** of a member whose claim was refused because the nominee was changed after the death —
I want **my own claim kept apart from the refused one, checked in full, and approved once the refused person's appeal is decided or its
90 days have passed** *(the filing code and the texts: Story 6.24b)*,
so that **the Trust never pays the wrong person or pays twice for one death, while ⛔ nobody is refused, accused or kept from filing by
another person's act.**

## The rulings this story builds

| Ruling | Key | Status |
|---|---|---|
| `-239` (b), (c) | the true nominee *"has to start over and produce original death certificate. However ground inspection can be inherited"*; *"refusal appealable once"* | ⭐ Trustee-ratified |
| `-261` C3 | *"nothing else carries over"* (consents, neighbour checks, documents, bank details are given again) | ⭐ Trustee-ratified |
| `-261` D4 B | *"when the open claim was refused on suspicion, a new claim for that death is ALWAYS kept separate — ⛔ never merged into the refused claim"*; ⚠ **supersedes 6.20 T17** | ⭐ Trustee-ratified |
| `-261` D4 reading | scope = a claim whose LIVE verifier decision is `denied` with `post_death_nominee_change`; any other refusal converges as today | ⚠ OUR reading |
| `-262` FQ5 A | *"the true nominee's new claim goes through every check but WAITS AT FINAL APPROVAL until the appeal is decided. Appeal refused → the new claim may be approved; appeal allowed → the new claim is closed"* | ⭐ Trustee-ratified |
| `-262` FQ5 reading | *"FQ5's 'closed' is ⛔ not a refusal of the true nominee"* (an allowed appeal still pays the nominee in place at the death — the marking is mechanical) | ⚠ OUR reading |
| `-262` FQ6 B | *"after a refusal on suspicion, the app sends the filing code to the nominee the District Admin found in place at the death — ⛔ never to a discarded one"* | ⭐ Trustee-ratified |
| `-262` FQ6 reading | *"FQ6 applies only while a `-239` refusal stands for that death"*; before any claim the first filing code still goes to the latest nominee (`-234` V) | ⚠ OUR reading |
| `-262` FQ7 B | *"the system texts the nominee on record at the death, at the mobile from that declaration: 'A claim for [member] could not go ahead. Please call the helpline.' ⛔ It accuses no one."* | ⭐ Trustee-ratified — ⚠ go-live gated on counsel |
| `-264` FQ13 | the refile's fresh original is seen by an inspector; *"row 6-24 depends on it for approval"* | ⭐ Trustee-ratified — ✅ BUILT by 6.26a (GI2) |
| `-285` A | FQ9 holds every approval incl. the final one | ⭐ Trustee-ratified — ⛔ no new mechanism here |
| `2026-10-07-291` Q1 A | *"a time limit to appeal THIS kind of refusal only — 90 days from the refusal. After it, the refusal can ⛔ no longer be appealed, and the true nominee's claim may be approved … the refused person … is told the refusal can be appealed"* | ⭐ Trustee-ratified (the number confirmed by BigDev: *"90 days"*) — ⚠ narrows 6.16 D-E and the PRD line for `-239` only |
| `2026-10-07-291` Q2 B | *"a text, once: 'Your claim for [member] has been closed. Please call the helpline.'"* | ⭐ Trustee-ratified — ⚠ go-live with FQ7's counsel check |
| `-291` readings | Q2's "her" = the nominee in place at the death, resolved as FQ7's | ⚠ OUR reading |
| `-291` readings AMENDED by `2026-10-07-292` | ⚠ three `-291` readings move — two rested on false premises: *"the only path to a `-239` refusal is `adjudicateClaim`"* (false — `reviseDecision` can move a `denied` claim's reason ONTO `-239`) and *"is told = the existing appeal surfaces"* (⛔ none is reachable); a third is changed by choice: *"a later revision … does ⛔ not restart it"* ⇒ a revision away and back starts a NEW 90 days. ⇒ the clock starts at the first row of the claim's CURRENT unbroken `-239` chain (RF14); *"is told"* = a helpline appeal screen the operator uses with the family (RF14 (b)) — and WHETHER the refused person is also TEXTED is routed to the Panel as Q3 | ⚠ Author-commit (BigDev) — amends `-291`'s READINGS only, ⛔ never its ruling |
| **Q3** (routing note `2026-10-07-6-24-telling-the-refused-person`) | how the refused person is TOLD they can appeal — A (staff tell them when they call or are called; the helpline screen shows the date — ⛔ no text) · B (a text to the refused filer — at their claimant contact mobile, or, when they filed as a nominee, the mobile on that nominee version) · plus a CONFIRM of RF13's residual | ⏳ **AWAITING PANEL** — non-blocking; built meanwhile as A |
| `2026-10-07-293` | ✅ **Q3 RULED** (DR + KB): item 1 **B** — the refused person is texted once with the last date to appeal (built by 6.24b); item 2 **A** — RF13's reason lock is accepted as built (this story, ⛔ no change) | ⭐ Trustee-ratified |
| ⭐ split | Q3 **item 1** (a text to the refused person) belongs to Story 6.24b; **item 2** (the reason lock) to this story | — |

**⛔ Not covered by any ruling (stays open):** the exact wording of FQ7's and Q2's texts in Hindi and their DLT templates (`-262`, `-291`
*"does NOT cover"*); any extension of the 90 days for good cause; a timely appeal that stays undecided for long (6.16 D-H's SLA stays a signal);
FQ7's legal basis (counsel); who is paid when an allowed appeal moves the certificate date (6.20 / 6.21a's existing rules, untouched).

## ⭐ THE INVARIANTS
1. **The system refuses nothing.** The wait is a 409 *"waits"* (⛔ never a denial); *"closed"* is its own state — ⛔ never `denied`, ⛔ never
   appealable, ⛔ never a 6.19c closures row, ⛔ never `denied_no_appeal`.
2. **ONE definition of "a suspicion refusal stands"** (RF1) — convergence, the wait, the closure, the commit re-check, the inheritance, the
   filing code and the text all read it; ⛔ none re-derives it.
3. **Derived, ⛔ never stored** — the refile is ⛔ not linked by a column; every predicate re-reads the refused claim's live decision and
   appeal anchor at the moment it acts (F3: decisions are revisable).
4. **The District Admin's approval is ⛔ never held by FQ5** — only the five final writers (RF5).
5. → Story 6.24b (⛔ no latest-nominee fallback).
6. → Story 6.24b (⛔ no plaintext mobile or name).

## 📜 Policy meaning (AI-10-1)
⭐ This story ADDS a conjunct to a benefit-gating predicate (the approval gate) and a new terminal outcome. In the member's terms:
- **P1 (RF5 — the wait):** *"If an earlier claim for the same death was refused because the nominee was changed after the death, a new
  claim for that death can be checked and approved by the District Admin, but it cannot be finally approved while that refusal can still be
  appealed — for up to 90 days after the refusal — or while an appeal filed in that time is still being decided."* — `-262` FQ5 A +
  `-291` Q1 A: consistent.
- **P2 (RF6 — closed):** *"If that appeal succeeds, the new claim is closed — ⛔ not refused, ⛔ not appealable — and the earlier claim goes
  ahead; the nominee is texted once that her claim was closed and asked to call the helpline."* — FQ5 A + its reading + `-291` Q2 B:
  consistent.
- **P3 (RF2 — kept apart):** *"While a refusal on suspicion stands, a new claim for that death is ⛔ never merged into the refused claim;
  once that refusal is overturned on appeal, a new filing joins the overturned claim as before."* — `-261` D4 B + its reading: consistent.
- **P4 (RF9 — the filing code)** → Story 6.24b.
- **P7 (RF13 — the reason lock):** *"While any other claim for the same death is not closed, a refusal recorded as 'the nominee was changed
  after the death' cannot be re-recorded under another reason — so its 90-day appeal limit stands even if the reason was chosen by
  mistake."* — ✅ `2026-10-07-293` item 2 A: consistent (the Panel accepted it — Trustee-ratified). Niyamavali: ⛔ no
  clause (Part 9 is silent on reasons and time).
- **P6 (RF14 — the appeal time limit):** *"A claim refused because the nominee was changed after the death can be appealed for 90 days
  from the refusal, and the refusal's appeal screen says until when; after that it can ⛔ no longer be appealed. Every other refused claim
  can still be appealed at any time."* — `-291` Q1 A: consistent. ⚠ This NARROWS an appeal right (6.16 D-E, the PRD's *"no formal time
  limit"*) — by the Panel's own ruling, ⛔ never by this story.
- **P5 (RF7 — the commit):** *"A claim whose final approval would no longer be allowed is ⛔ not paid out by the cycle commit; it waits for
  the next commit."* — `-285` + FQ5: consistent (adds ⛔ no new condition, it re-applies two existing ones at the payout milestone).
- **Niyamavali** (`docs/legal/niyamavali.md`, ⛔ not ratified — [[feedback_niyamavali_rulebook_not_spec]]): Part 9 (claim appeal: three
  stages, *"different individual"* at Stage 1) states ⛔ no time limit and ⛔ nothing on a second claim for one death — **checked
  2026-10-07, consistent, ⛔ no clause engaged** (P6's limit included — Part 9 is silent on time). §8.8's *"No deadline"* is the MODERATION appeal and says it does ⛔ not incorporate Part 9.
  §2.4 (one or two nominees, 75/25) is ⛔ not touched.

- ⚠ **2026-10-08 (code review round 2, family 11):** four further sentences — **P1′** (RF3 + RF5's true scope), **P2′** (RF3 + RF6), **P8** (RF8) and **P9** (RF4's refile effect) — are recorded, checked against the Niyamavali, in `### Review Findings` → ROUND 2 (the *"Family 11"* line). The P1–P7 text above is ⛔ not edited.

## ⚖️ Decisions — the AUTHOR's (✅ COMMITTED by `2026-10-07-292`, `f0801f1e` — verbatim from v1.9; a later change is a NEW entry, ⛔ never an edit)
⭐ The **[a] / [b]** tags are the 2026-10-07 split's ONLY addition to this section. **[a+b]** RF12: its closed-claim words and entry
routing are 6.24a's; its `-291` Q2 closure TEXT (the paragraph *"`-291` Q2 B — the closure text"*) is 6.24b's.
⭐ §0: each RF is *"the code should do X"* in service of a ruling already made; the person-facing halves are cited, decided ⛔ nowhere here.

- **[a] RF1 — "A SUSPICION REFUSAL STANDS", ONCE.** New module `packages/domain/src/claim/suspicion-refusal.ts`:
  · `standingSuspicionRefusalSql(claimAliasSql)` — raw SQL, for a claim `s`: EXISTS a live `claim_verifier_decisions` row
    (`superseded_at IS NULL AND outcome = 'denied' AND reason_code = <POST_DEATH_NOMINEE_CHANGE_REASON_CODE>`) AND NOT EXISTS a
    `claim_appeals` row of `s` with `status = 'reversed'` AND `s.current_state <> 'closed'` (v1.1 — a claim RF6 closed ⛔ never stands,
    else a closed claim's open anchor or un-appealed `-239` would hold the reversed claim for ever). ⛔ Never a Drizzle correlated subquery
    ([[project_epic6_drizzle_correlated_subquery_bug]]) — explicit aliases. Import the constant from `nominee-refusal-read.ts:32`.
  · `readStandingSuspicionRefusals(db, pariwarId, deceasedMemberId)` → `{ claimCaseId, createdAt, refusedOn (IST date), appealUntil (IST
    date — RF14), appeal: 'not_filed' | 'time_limit_passed' | 'open' | 'upheld_final' }[]` ordered `created_at DESC, claim_case_id DESC` (the inheritance rule's order), bounded by `clampLimit`.
  · ⚠ It must pass 6.23a's NW1 transitive-import scan (`packages/domain/tests/claim/approval-warnings.test.ts` ~:337-370 — ⛔ no path to
    `claim/events.ts`, `nominee-name-check.ts`, `nominee-lock.ts`) and, if the no-comparison fence requires approval-path modules, join
    `FENCED_FILES` (`nominee-name-no-comparison-fence.test.ts:38`, pinned at 36 — bump the pin with a reason).
  · ⚠ RF1 must be added to NW1's fixed entry list (`approval-warnings.test.ts:357-361`) — the scan reaches ⛔ nothing it is not given.
  · *"Stands"* = the refusal is live AND ⛔ not overturned AND its claim ⛔ not closed. A stage-3 uphold (`upheld_final`) STANDS. A revision off `-239` ends it; a
    revision onto `-239` starts it (F3 — accepted, derived).
- **[a] RF2 — D4 B AT THE CANDIDATE.** `getConvergenceCandidate` gains `AND NOT (<RF1 on the candidate>)`; `getPendingIntakeAttempts`' LEFT
  JOIN gains the SAME conjunct (the "EXACTLY" mirror); `confirmMerge` inherits through `getConvergenceCandidate`. ⭐ Built at the candidate,
  so (3b) can ⛔ no longer return the refused claim (F1) and (3c) ⛔ no longer parks a pending attempt on it. The window, the override-apart
  guard and 6.19c's refile guard (`assertRefileAllowed`, `icp.ts:293`) are ⛔ not changed — the refile still passes the refile guard (it keys
  on a closures row, ⛔ not a suspicion refusal). ⚠ `getClaimByDeceasedMember` (`read.ts:123`) — the `ClaimStreamConcurrencyError`
  backstop's re-read in `initiateIntake` (`claims.service.ts:310-321`) — must ⛔ not return a claim the candidate rule now skips: give it
  the same conjunct, or have the backstop re-read through `getConvergenceCandidate`; the dev traces every OTHER caller of
  `getClaimByDeceasedMember` and records each as *"same conjunct"* or *"unchanged, because …"* (Task 2.3). ⛔ No new convergence rule for
  any other refusal (the D4 reading).
  ⚠ **v1.1 — the member app's ENTRY routing (validator H3).** `-249` B2 sends a filed-claim pointer whose claim is `claim_live` to the
  shepherd screen (`apps/mobile/app/(claim)/index.tsx:42-53`, `lib/claim-entry-gate.ts:39-41`); `claim_live` is
  `!FAMILY_STATUS_TERMINAL_STATES.includes(state)` (`claim/death-certificate-approval.ts:332,342`) ⇒ S under appeal is "live" and the
  wizard is unreachable on the device that filed S — exactly D4 B's window. ⇒ the server read behind `fetch-claim-entry-outcome.ts` returns
  the existing TERMINAL routing (the wizard) for a pointer claim on which RF1 stands — ONE conjunct in that read, ⛔ `claim_live`'s other
  consumers unchanged (the dev traces them and records each). The refile then needs FQ6's code, which reaches the true nominee only (RF9).
  ⚠ **An intake attempt parked `pending` against S BEFORE the refusal** is left with ⛔ no candidate once RF2 applies — recorded, ⛔ not
  migrated (the strip simply stops listing it; the attempt row stays as history).
- **[a] RF3 — "THE DEATH'S OTHER CLAIMS".** The wait (RF5) and the closure (RF6) concern every OTHER claim of the same `(pariwar_id,
  deceased_member_id)` — ⛔ no ordering by `created_at` and ⛔ no "filed by the true nominee" test (the system cannot know who files;
  `claimant_actor_id` is null in v1). A later filing by the refuser is kept apart and waits the same way. ⛔ No link column.
- **[a] RF4 — THE NEW STATE: `closed`.** `claim_lifecycle_state` gains `closed` (migration 0150 — `ALTER TYPE … ADD VALUE` ALONE in its file;
  ⛔ nothing in the same migration run may USE the value — Trap 6); `CLAIM_LIFECYCLE_STATES` (`schema/claims.ts:76`) and the contracts mirror
  (`packages/contracts/src/claims/filing.ts:47-62`) gain it; `CLAIM_TERMINAL_STATES` (`read.ts:33`) gains it; ONE new event
  `claim.closed` (a TRANSITION, ⛔ not an annotation) from every **CLOSABLE** state = every state except `settled`, `approved`,
  `state_trustee_approved` and `closed` itself (v1.1 — `denied`, `appeal_stage_1..3` and `reversed` ARE closable: FQ5 says *"the new claim
  is closed"* whatever its state short of final approval; a held claim refused for ANOTHER reason that survived S's allowed appeal could
  otherwise be appealed later, reversed, and approved beside S — two payments for one death — and RF5 would ⛔ not hold it, S no longer
  standing — validator H1(a). ⚠ OUR reading of FQ5, recorded in the author-commit); payload `{ from_state, to_state: 'closed', trigger: 'suspicion_appeal_allowed', actor,
  held_by_claim_case_id }` (non-PII). ⚠ A held claim closed mid-appeal: its `claim_appeals` anchor's `status` moves to a NEW
  `appeal_journey_status` value `closed` (also a pgEnum — `schema/claim_appeals.ts:61`; its `ADD VALUE` joins 0150) so ⛔ no open journey
  outlives its claim (validator H1(b)); ⛔ nothing reopens it. `ACCOUNT_UNFREEZE_EVENT_TYPES` (`member/overlay.ts:50`) gains `claim.closed` (the stream resolves; the
  freeze stays while the reversed claim is live — *"any unresolved stream"*). `CLAIM_EVENT_TYPES` 35 → **36** (`dpdpa-consent-events.test.ts:59`
  and every twin pin — grep `toHaveLength(35)`), the `packages/events` registry, the frozen-vocabulary test. Appealable: ⛔ never —
  `assertAppealInitiable` requires `denied` (automatic; a test pins it). Refile guard: ⛔ not touched (a later filing for the death converges
  onto the now-live reversed claim, or mints, as today). ⚠ v1.1 — STATE THE EFFECT, ⛔ "untouched" is inexact: `mostRecentTerminalClaim`
  and `hasLiveClaim` (`refile-guard.ts:67,84`) see `closed` through `CLAIM_TERMINAL_STATES` — a closed claim has ⛔ no closures row ⇒ the
  guard lets the death re-file freely (pinned by a test).
  ⚠ **v1.1 — there is ⛔ no typecheck-forced state map** (validator M6: ⛔ no `Record<ClaimLifecycleState,…>` exists). Every state LIST is
  found by grep and decided by hand: `FAMILY_STATUS_TERMINAL_STATES` (`death-certificate-approval.ts:332` — a by-value duplicate of
  `CLAIM_TERMINAL_STATES`; gains `closed`); the two BLOCKLISTS that would ADMIT `closed` — `SHEPHERD_ASSIGNMENT_BLOCKED_STATES`
  (`shepherd-assign-persist.ts:98`) and `CONCEALMENT_ASSESSMENT_BLOCKED_STATES` (`concealment-assessment-persist.ts:69`) — gain it; the
  admin `claimStateLabels` (`claim-verification/i18n-en.ts:600`, cast `as Record<string,string>`) gains its words. Task 3.0 greps every
  literal list (`grep -rn "'settled'" packages apps --include='*.ts' --include='*.tsx' --include='*.sql'`, excluding dist / tests) and
  records each as *"gains `closed`"* or *"unchanged, because …"*.
- **[a] RF5 — THE WAIT (FQ5), ONE CONJUNCT, FINAL ONLY.** `ClaimApprovalGateOptions` gains REQUIRED `step: 'district_admin' | 'final'`
  (typecheck finds all six sites): P1 passes `'district_admin'`; `voteOnFrozenClaim`, `finalizeR9Outcome`, both `decideEscalatedClosure`
  arms and `approveNoCorrectionNeeded` pass `'final'`. New `assertSuspicionAppealDecidedForFinalApproval(db, pariwarId, claimCaseId,
  deceasedMemberId)` in `suspicion-refusal.ts`, called by the OUTER `assertClaimApprovable` only when `step === 'final'`, AFTER
  `assertGroundInspectionCompleteForApproval` and BEFORE `assertLateWarningsCovered` (6.23b EA2 stays LAST). ⛔ Never inside
  `assertNomineeNameCheckForApproval` (its `-251` early return and `isReturnedClaimResubmitted`'s error-swallowing — 6.26a GI1's reasoning).
  It holds iff ANY other claim of the death (RF3) has a standing refusal (RF1) whose appeal is `open` (reason `appeal_open`) or
  `not_filed` while its 90-day limit is ⛔ not yet passed (reason `appeal_not_filed` — `-291` Q1 A). `upheld_final` or `time_limit_passed`
  ⇒ decided ⇒ ⛔ no wait. ⚠ **v1.3:** at `step === 'final'` the conjunct takes RF15's key UNCONDITIONALLY, FIRST, and only then reads RF1
  and the anchors (a read before the key could miss an anchor an initiation committed while holding it); the limit is judged with
  `clock_timestamp()` read AFTER the key — ⛔ never the transaction's `now()` (Trap 16). Every final writer runs at READ COMMITTED (the
  default — the dev confirms ⛔ none raises it), so each statement after the key sees the initiation's commit. A reversed refusal ⇒ ⛔ not standing ⇒ ⛔ no
  wait — and the claim is already `closed` (RF6), so its approvers' own state checks refuse first. New typed error
  `SuspicionAppealPendingError(claimCaseId, reason)` in `claim/errors.ts` ⇒ every approval translator maps it to 409
  `<prefix>.suspicion_appeal_pending` with `details.reason` — ⛔ never a 500 (F9). One pure helper `suspicionAppealWaitState(rows,
  selfClaimId)` → `{ waits: false } | { waits: true, reason }` — the console (RF10) and the gate both call it.
- **[a] RF6 — CLOSED, IN THE REVERSAL'S OWN TRANSACTION.** ONE helper `closeClaimsHeldBySuspicionAppeal(client, { pariwarId, deceasedMemberId,
  reversedClaimCaseId, actor, actorId, auditId? })`, called by all THREE reversal writers — `reviewAppealStage1` (`appeal-persist.ts:349`),
  `finalizeAppealOutcome` (`appeal-panel-persist.ts:498`, the `reverses` arm) and `decideAppealStage3` (`appeal-persist.ts:423`) — AFTER their
  own `reversed` writes, and ONLY when the reversed claim's live decision is `-239` (read in the same transaction — and RF13's revision
  guard keeps it `-239` while any held claim lives). For each other claim of the death, in `claim_case_id` order, it takes that claim's
  `appeal:` advisory key, then its `r9:` key, THEN its row lock (v1.3 — the order every writer of those keys already uses:
  `initiateAppeal` / `finalizeAppealOutcome` / `finalizeR9Outcome` take the key, then the row — `appeal-persist.ts:287-290`,
  `appeal-panel-persist.ts:502-505`, `r9-voting-persist.ts:603-606`; row-then-key would deadlock, 40P01), and emits `claim.closed` for each
  in a CLOSABLE state; one in `state_trustee_approved` /
  `approved` / `settled` is ⛔ not closed — it is recorded (an error-level log with ids only + an audit line), ⛔ never silently (unreachable
  under RF5 + RF7 — Trap 9). ⚠ **Lock order (Trap 8):** reversal = refused claim → each held claim; ⛔ no writer may
  take a held claim's lock and THEN wait on the refused claim's — the gate (RF5) and the commit re-check (RF7) READ the refused claim's
  decision and anchor with ⛔ no lock. ⚠ **v1.1 — two `-239` claims of one death reversed at once** would lock S1→S2 and S2→S1 (40P01,
  validator M10) ⇒ all three reversal writers take a per-death transaction advisory key `suspicion-reversal:<pariwar>:<deceased>` FIRST —
  before their own `appeal:` lock and claim-row lock (read the claim's immutable `deceased_member_id` unlocked to build it) — ⛔ never the
  intake lock, ⛔ never RF15's key.
  ⚠ **v1.1 — a closed claim's LIVE PROCESSES (validator H2).** Closing R must ⛔ not leave anything running on it: the 6.19b correction sweep
  ends a run only on supersession / day 90 / resubmission (`claim-correction-reminders.ts:1095-1116`) and never reads the state ⇒ a closed R
  with a live return would keep getting *"Your claim is still open."* texts, and on day 90 6.19c would ask the District Admin to close a
  claim that is already closed. ⇒ RF6 ends R's live correction return (and so its run) through the SAME supersession the 6.19 writers use on a
  terminal decision. ⚠ **v1.3 — sessions:** the existing cancel writers can ⛔ not be called (`cancelAppealPanel`,
  `appeal-panel-persist.ts:668-686`, and `cancelR9VotingSession`, `r9-voting-persist.ts:787-808`, throw `*ActorNotOnPanelError` unless the
  actor sits on R's panel, and the appeal one needs `appeal_final` once votes exist — S's reversal would throw and roll back) ⇒ EXTRACT
  each writer's actor-free core (`supersedeAppealPanelSession` / `supersedeR9VotingSession` — the row supersession + its audit; the
  actor checks stay in the public writers) and call the cores with the system actor. R's live `routed_to_r9` row is superseded by RF6
  ITSELF through a helper extracted from `finalizeR9Outcome`'s inline supersession (`r9-voting-persist.ts:714-727`) — ⛔ never inside the
  shared R9 core (`cancelR9VotingSession` deliberately leaves the routing live, `:780-784`). Each public writer keeps its behaviour (its
  specs green). Task 3.0 enumerates EVERY table with a live row keyed on a claim (returns, correction /
  certificate reminder runs, R9 and appeal-panel sessions, inspection and shepherd assignments, pending intake attempts, the RF11 notice) and
  records each: *"ended by RF6 via <writer>"*, *"inert — its reader checks the state (<cite>)"*, or *"accepted residual, because …"*. A test
  pins the reminder case (⛔ no text after `closed`).
- **[a] RF7 — THE COMMIT RE-CHECK (discharges `deferred-work.md` *"An inherited visit that vanishes after the final vote is ⛔ not re-checked at
  the cycle commit"*).** `commitCycleFreeze`, per candidate, under its lock, after the two existing skip-and-keep re-checks
  (`hasLiveRoutedRow`, `hasLiveReturnRow`): `continue` (skip-and-keep — the claim stays `state_trustee_approved` for the next commit) when
  `suspicionAppealWaitState(...).waits` OR `groundInspectionApprovalState(...)` is ⛔ not complete (it is PURE —
  `ground-inspection-approval.ts:64`; feed it `readGroundInspectionApprovalFacts`, the gate's own read). ⛔ Never the full gate (its name check,
  accounts and late-warning legs were the vote's; the commit re-applies only the two conditions that can move through ANOTHER claim). The
  commit's result gains ⛔ no new field unless the existing `skipped`/`committedClaimIds` shape requires it — the dev reports what it does.
- **[a] RF8 — THE INHERITANCE READS RF1 (discharges `deferred-work.md` *"`-239` inheritance source: an appeal-overturned refusal is never
  superseded…"* for the APPROVAL input).** `inheritedGroundInspectionSourceSql` (`nominee-refusal-read.ts:99-126`) replaces its inline live-decision
  predicate with RF1's fragment ⇒ a reversed refusal is ⛔ no longer a source. ⚠ This AMENDS the input of 6.26a GI2's VISITED (*"6.20 AC13, ⛔
  not changed"*) and the premise of `-290` M1 (*"a source reversed on appeal stays the source"*) — both recorded in the author-commit as
  amendments, ⛔ never readings. The Pariwar Admin's refusal LIST (`listNomineeRefusals`)
  is ⛔ not changed (a display; the item's list half stays open — say so when marking it).
- **[b] RF9 — THE FILING CODE (FQ6).** `sendHandoverOtp` first calls a new domain read `readSuspicionRefusalRecipient(db, pariwarId,
  deceasedMemberId)` → `null` (⛔ no standing refusal ⇒ today's path, unchanged) | `{ kind: 'at_death', versionId }` | `{ kind: 'none' }`.
  It takes the MOST RECENT standing refusal (RF1's order), reads `getEffectiveNomineeDeclaration` on THAT claim, and returns the
  `versionId` of the entry with `rank === 1` (after 6.20's re-rank) when `status === 'effective'`; else `none`. The API reads the version's
  `mobile_ciphertext` (`getNomineeVersionsByIds`, `nominee/declaration-history.ts:128`) and resolves it with the domain's
  `resolveCorrectionMobile(serialized, 'member_nominee', pariwarId, enc)` (`claim/correction-crypto.ts:~50` — it already handles null, the
  erasure sentinel and normalisation; or `decryptNomineeField` + `normalizeMobile`, the same field class) — `none`, a null/sentinel ciphertext or an unsendable number ⇒ the SAME existence-defended no-op (`sent: true`, empty
  hint, `timingEqualizeDelay`) as today's ⛔-nominee branch. ⛔ Never `getMemberNominees` once a refusal stands. The send audit
  (`member_claim.handover_otp_send`) gains a non-PII `recipient: 'latest' | 'at_death'`. A determination with a NULL
  `death_certificate_review_id` (0119-era) is trusted as `effective` (⛔ not in production — ⛔ never backfilled).
- **[a] RF10 — WHAT STAFF SEE.** The verifier console (the District Admin's) shows, on a claim whose death has another claim with a standing
  refusal: *"Kept apart from an earlier claim for this death that was refused on suspicion"* and *"Final approval will wait for that
  claim's appeal — not yet filed / being decided"* (from `suspicionAppealWaitState`; ⛔ no names, ⛔ no note, the other claim by its
  claim reference only); a read failure ⇒ *"could not be checked just now"*, ⛔ never silence (6.18's fail-closed rule; the console's
  `underSavepoint` section pattern). The read counts against `VERIFIER_CONSOLE_MAX_READS` (`claims.verifier-console.handlers.ts:177`,
  20 — bump with a ledger line + exact `toBe`). Every later surface gets the 409's words through the existing translator paths
  (⛔ no per-surface panel). The convergence strip's T17 note (`ConvergenceDecisionStrip.tsx:222-231`) is reworded to D4 B.
- **[b] RF11 — THE TEXT (FQ7).** A jobs sweep beside 6.19b's (`apps/jobs/src/scheduler/`), ⛔ never `dispatch()`: select claims with a
  standing refusal (RF1) and ⛔ no notice row; per claim, lock it, RE-CHECK RF1 under the lock, resolve the recipient exactly as RF9 does
  (the refused claim's rank-1 effective version — ⛔ never `readCorrectionRecipients`, which requires a live filing agreement and returns S's effective nominees plus a non-nominee claimant — a different set), insert a
  notice row in its claiming status, commit; then decrypt (the domain's `resolveCorrectionMobile`, `claim/correction-crypto.ts:~50`), send
  through `sendClaimCorrectionSms`'s path (`claim-correction-reminders.ts:247-320` — its fail-closed and error classification), and
  compare-and-set the outcome. New table `claim_suspicion_notices` (migration 0151 — v1.2: it carries both texts, RF12): `notice_id`, `pariwar_id`, `claim_case_id`
  (composite FK to `claims`), `recipient_version_id`, `recipient_number_hash` (keyed), `status`, `claimed_at`, `created_at`,
  `updated_at`, `purpose` (`'suspicion_refusal' | 'closed_after_appeal'` — a CHECK + an `as const` tuple in LOCKSTEP; v1.4); UNIQUE
  `(pariwar_id, claim_case_id, purpose)` — ⭐ ONCE per claim per purpose, EVER (a revision away and back ⛔ never re-texts; a second
  refused claim of the death is its own notice). ⚠ If Q3 is answered B, a third purpose joins (one recipient — the refused claim's
  FILER), a CHECK widening in its own migration. ⚠ **v1.1 (validator M9) — invent ⛔ no vocabulary:** the status set, `claimed_at`, the
  partial index on the claiming status and the exhausted-row finaliser are COPIED from 6.19b's reminder table (migration `0128` — its
  `attempting | accepted | no_target | …` set and its retry / stale-claim handling; read it, mirror it, a CHECK + an `as const` tuple in
  LOCKSTEP) — so a crash after the claiming commit is RECLAIMED by the next run, ⛔ never stranded (the selector is *"⛔ no FINISHED row"*,
  ⛔ never *"⛔ no row"*). **Locale:** `hi` (the system default, `claim_contacts.contact_locale`'s default) — ⛔ never S's `contact_locale`,
  which the person who made the change may have written; ⛔ no member locale is stored (checked). RLS + grants as 6.19b's tables; the anonymizer — ⛔ nothing
  to scrub (⛔ no plaintext; the hash is keyed) — RECORD that in the anonymizer's coverage list if it keeps one. Words: copy key
  `claim.suspicionRefusalNotice.sms` (en + hi, `packages/i18n/locales/{en,hi}/claim.json`) — en verbatim from FQ7: *"A claim for {member}
  could not go ahead. Please call the helpline {helpline}."* ⚠ `{helpline}` is the per-Pariwar number 6.19b's texts carry
  (`sms.claim_correction.helpline_number.<pariwarId>`), an addition to the Panel's words in ⛔ nothing but that it supplies the number the Panel
  told her to call. ⚠ **v1.1 (validator H4) — `{member}` is MODE-RESOLVED** (`-181`: the member-facing name form reads the stored
  per-Pariwar presentation mode, ⛔ never hard-coded): the 8.8 jobs path — decrypt the deceased's KYC name (`decryptKycField`) and pass it
  through `resolveMemberFacingDeceasedName(mode, name)` (`packages/domain/src/notifications/pool-identity.ts:141`; `resolvePoolIdentity`,
  `:201-228`, is the composed precedent; the caller reads the mode ONCE — `contribution-notify-triggers.ts:716`). ⛔ Never
  `splitFirstNameLastInitial` directly, ⛔ never the 1.16b PII-scrape rule (that gate covers `apps/public` pages, ⛔ not texts). An unresolvable
  name (erased, ⛔ none) ⇒ `no_target` — ⛔ never a text with a blank name. Hindi carries the "NOT YET HUMAN-REVIEWED" `$comment` marker.
  ⚠ **v1.1 (validator H5) — the 6.19 registry can ⛔ not take this message as is:** `renderClaimCorrectionSms` / `sendClaimCorrectionSms`
  hard-code the variables `{reference, helpline}` (`claim-correction-sms-templates.ts:93-96`, `claim-correction-reminders.ts:287-290`) and
  the lockstep test pins every entry name-free with the reference first (`apps/jobs/tests/claim-correction-sms-templates.test.ts:62-87`;
  the registry header D33: *"⛔ No name"*). ⇒ a SIBLING registry `suspicion-refusal-sms-templates.ts` with its own variables type
  `{ member, helpline }`, its own render function and lockstep test, and a send variant that reuses `sendClaimCorrectionSms`'s provider /
  classification / fail-closed core by extraction (⛔ never a copy). D33's *"⛔ No name"* is ⛔ not weakened — this message names the member
  because FQ7's ratified text does; the carve-out is recorded in the author-commit and in the sibling's header. The DLT request sheet
  gains the two rows (a new section in `docs/launch-gate-inventory/dlt-template-requests-6-19.md`, or a sibling sheet — the dev picks and
  records). Template ids stay UNSET ⇒ the send fails closed
  (`error` + alarm) until go-live.
- **[a+b] RF12 — WHAT THE FAMILY SEES.** A `closed` claim's member-facing status: *"This claim has been closed. Please call the helpline."*
  (en + hi) — ⛔ no reason, ⛔ no mention of the other claim. ⚠ **v1.1 (validator M7) — the real surfaces:** mobile has ⛔ no claim-state
  map; the family's status is `resolveDeathCertificateFamilyStatus` (`claim/death-certificate-approval.ts`, the read behind the mobile
  status and the entry outcome) ⇒ it gains a `closed` status the mobile renders with these words; the helpline read-back
  (`getClaimsForMember`, `claims.death-certificate.handlers.ts:374`) lists ONLY non-terminal claims ⇒ a `closed` claim would vanish exactly
  when the family is told to call ⇒ it ALSO lists the member's `closed` claims, with these words (other terminal states ⛔ not changed).
  ⭐ **`-291` Q2 B — the closure text:** *"Your claim for {member} has been closed. Please call the helpline {helpline}."* (copy key
  `claim.suspicionClosedNotice.sms`, en + hi, the Hindi marker), once per closed claim, EVER, through RF11's machinery: the notice table
  gains a `purpose` column (`'suspicion_refusal' | 'closed_after_appeal'`, CHECK + `as const` tuple) and its UNIQUE becomes `(pariwar_id,
  claim_case_id, purpose)`; the sweep's second selector is *"a claim in `closed` whose `claim.closed` trigger is
  `suspicion_appeal_allowed`, with ⛔ no finished `closed_after_appeal` row"* (derived — ⛔ nothing written by the reversal for it); the
  recipient is resolved as RF9 / RF11 do, on the CLOSED claim's own live determination when `effective`, else the reversed claim's (`-291`
  reading); the sibling registry gains its entry, the DLT sheet two rows; the same counsel row covers it (`-291` Consequence 3).
  ⚠ **v1.3 — the mobile never reaches the family status for a `closed` claim** (validator round 2, M6): `closed` joins
  `FAMILY_STATUS_TERMINAL_STATES` ⇒ the entry outcome is `terminal` ⇒ `resolveClaimEntryDecision` sends it to the WIZARD
  (`claim-entry-gate.ts:47-48`) and the words would ⛔ never render ⇒ a 6.19c-style narrowing (the `refile_helpline` precedent,
  `claim-entry-gate.ts:46`): FOUR pieces — a contract field beside `claim_live` / `refile_requires_confirmation`
  (`packages/contracts/src/claims/death-certificate.ts:163,175`) and its server producer — ⛔ never merged with 6.19c's sibling
  `closed_no_response` (`:169`, a closure for no response, a different thing); the classifier in
  `apps/mobile/lib/fetch-claim-entry-outcome.ts`; a `closed` kind on the mobile's client union `ClaimEntryReadOutcome`
  (`claim-entry-gate.ts:15`) and a new `ClaimEntryDecision` kind routing to a calm helpline screen with the closed words; the mobile and
  contracts fixtures (vitest — typecheck misses them). ⚠ ⛔ Never the wizard, because of what a filing does: the closed claim is ⛔ never
  a candidate (`closed` is terminal), so a filing converges onto the reversed claim only if that claim is within the 30-day look-back
  (`CONVERGENCE_WINDOW_DAYS`, `icp.ts:65,115`) and otherwise MINTS a third claim for the death — which the helpline should prevent, ⛔
  not the app invite. A WAITING refile shows its existing status — ⛔ no new member-facing string for
  the wait (6.23b's precedent: whether the family is told a claim waits was ⛔ never ruled). ⛔ No member-facing string anywhere says
  "suspicion", "fraud", "changed after the death" or names anyone.
- **[a] RF13 — ONE REVISION GUARD; NOTHING ELSE MOVES.** ⚠ **v1.3 (validator round 2, H2) — a revision OFF `-239` would let one death be paid
  twice:** S refused `-239` → R minted apart (RF2) → the District Admin revises S's reason to another (`reviseDecision`,
  `verifier-decision-persist.ts:577` — only a move ONTO `-239` is checked, `:621`) → S stops standing → R's final approval proceeds → S,
  now an ordinary refusal with ⛔ no time limit, is appealed and reversed → RF6 closes ⛔ nothing (S is ⛔ not `-239`) → S is approved too;
  ⛔ nothing per-death stops a second approval (`assertClaimApprovable` has ⛔ no such check; pools are keyed per cycle). ⇒
  `reviseDecision` refuses to move a live decision's reason OFF `post_death_nominee_change` while ANY other claim of the same death —
  RF5's own scope (v1.6, round 5: a claim that PREDATES the refusal is included too — exempting it let staff move S off `-239` and back,
  reopening an expired window and letting that claim be approved while S was off) — is
  in any state but `closed` — incl. `approved`, `state_trustee_approved` and `settled` (v1.4, round 3 H: a settled R plus a later S
  appeal is still two payments) and `denied` (its own appeal could revive it): new typed error `SuspicionReasonLockedError(claimCaseId,
  heldClaimCaseId)` → 409 `verifier_decision.suspicion_reason_locked` (the verifier-decision translator). ⚠ **The lock (v1.4, round 3
  M):** `reviseDecision` locks only S, and R is minted under the intake lock without reading a `denied` S ⇒ a revision and a mint could
  both commit ⇒ `reviseDecision` reads the claim's immutable `deceased_member_id` UNLOCKED, then takes
  `pg_advisory_xact_lock(intakeAdvisoryLockKey(pariwar, deceased))` (`claim/icp-lock.ts` — `acquireIntakeLock`, `icp.ts:82`, is private;
  `refile-guard.ts:226-235` is the precedent for exactly this read-then-key), THEN its decision lock and row — the intake-then-row order
  `convergeIntakeAttempt` already uses (`icp.ts:456` then `:488-497`); a two-connection test.
  A note-only revision that keeps `-239` is ⛔ not refused. ⚠ **The residual — DISCLOSED to the Panel as a confirm (Q3 note, item 2):**
  while such a claim is in any state but `closed` — a `denied` one included, which can last indefinitely — a MIS-CODED `-239` reason can
  ⛔ not be corrected, so a family whose refusal was ⛔ not truly on suspicion is bound by the 90 days instead of 6.16's no-limit appeal;
  their remedy is to appeal within them (the helpline screen shows the date). The confirm's options as put: A (accept — our reading), B (allow
  the correction only before another claim's final approval, the corrected refusal still holding the others with ⛔ no limit). ⭐ §0: the guard itself is a STAFF-action narrowing (ours);
  its effect on a family is what the Trust owes them ⇒ the Panel's, put as a non-blocking confirm (our reading: accept it — B adds little,
  its correction window being mostly the same 90 days, while bringing back the true nominee's endless wait). Built as written meanwhile.
  Otherwise: ⛔ no new permission key (catalog version / key count unchanged — the `permissions.test.ts` pins stay green); the texts and
  the closure are the system's acts; the helpline appeal screen (RF14) reuses `claim.file`, the key the on-behalf route already requires.
  ⛔ No change to the reason codes, the one-journey appeal rule, 6.19c's closures or refile guard, the warning kinds, the bank/name checks,
  or 6.20's determination. ⛔ No `apps/public` change.
- **[a] RF14 — THE 90-DAY LIMIT (`-291` Q1 A).** ⚠ **v1.3 — the clock (validator round 2, H1):** the refusal ON SUSPICION is the claim's
  earliest row of its CURRENT unbroken `-239` chain (v1.4, round 3 M: walk `supersedes_decision_id` back from the live row while the
  reason stays `post_death_nominee_change`; on the normal path it IS the District Admin's refusal; ⛔ no writer updates a decision row
  but its `superseded_at` — `verifier-decision-persist.ts:648`, `state-trustee-decision-persist.ts:1133` — a convention, grep-pinned in a
  test, ⛔ not a DB rule: 0059 grants UPDATE on every column) — ⛔ never the `claim.verifier_denied` event: `reviseDecision` can move a claim refused for another reason ONTO
  `-239` long after the denial, and a clock from the denial would give that person ⛔ no days to appeal. ⭐ ONE RULE (v1.5): D is the first row of the
  CURRENT chain — a revision that KEEPS `-239` (a note change) does ⛔ not move D; a revision AWAY from `-239` and later BACK starts a
  new chain and so a NEW 90 days (⚠ this amends `-291`'s reading *"a later revision … does ⛔ not restart it"* — the third amended
  reading, recorded in `-292`). ONE pure helper `suspicionRefusalAppealUntil(firstSuspicionDecidedAtUtc)` → D + 90 where D = `istDateOf(...)`; the limit has
  passed when the clock ≥ `istMidnightAt(addCalendarDays(D, 91))` — the codebase's IST helpers (`istDateOf`, `addCalendarDays`,
  `istMidnightAt` — `cycle-calendar/holiday-resolver.ts:178,187,206`, imported from there as `nominee-effective.ts:48` does
  (`correction-schedule.ts:116-117` re-exports only `istDateOf`); ⛔ never a new date
  library or a hand-rolled offset). Readers OUTSIDE RF15's key (the console, RF7, RF9, RF11) use their statement's clock; a stale clock
  can only make RF7 skip-and-keep a claim one extra run (conservative) — stated, ⛔ not a defect. Then:
  · `assertAppealInitiable` (`appeal-eligibility.ts:148`) — AFTER its THREE existing guards (not-denied, 6.19c's closure, D-F) — refuses a
    claim whose LIVE decision is `-239`
    once the limit has passed: new typed error `AppealTimeLimitPassedError(claimCaseId, appealUntil)` → 409
    `appeal.suspicion_refusal_time_limit_passed` (with `details.appeal_until`) in the appeal handlers (`claims.appeal.handlers.ts` — where
    `AppealAlreadyExhaustedError` maps) — ⛔ never a 500; its JSDoc's *"do NOT reintroduce an elapsed-time gate"* gains *"— except for a
    `-239` refusal (`2026-10-07-291` Q1 A)"*. Every other reason: ⛔ not changed (a test per non-`-239` reason family past 90 days).
  · RF1's `appeal = 'time_limit_passed'` ⇔ ⛔ no anchor AND the limit passed (judged with the SAME helper and clock as the initiation guard).
  · ⚠ **v1.3 — "is told" (validator round 2, H3; amends `-291`'s reading):** ⛔ no surface that tells a refused family about an appeal is
    REACHABLE today — `AppealStatusCard` is mounted on ⛔ no screen, the member appeal routes 404 for every production claim (`deferred-work.md`
    *"The member appeal routes 404 for every production claim…"*), and the admin client has ⛔ no call to the on-behalf initiate route
    (`claims.appeal.routes.ts:146`, `claim.file`-gated — `apps/admin/src/api/client.ts` carries ⛔ none) while the admin case read needs an
    appeal key the operator lacks (`:110-125,151-155`). ⛔ Nothing tells a family a claim was refused at all (FQ6's Gap 2). ⇒
    ⚠ **v1.4 (round 3 BLOCKER) — ⛔ no text to the refused person is built.** v1.3's text used `readCorrectionRecipients`, which returns S's
    EFFECTIVE NOMINEES (the true nominee — FQ7's own recipient) and adds the claimant only when the claimant is none of them
    (`correction-chase.ts:601-653`) ⇒ it would have told the true nominee to appeal a refusal whose success closes her own claim, and ⛔
    never the refused filer. Who is texted, on which number, on what basis is a NEW message to a person ⇒ the Panel's ⇒ **Q3**
    (non-blocking). Built now:
    (b) **a helpline appeal screen**: a `claim.file`-gated read of a refused claim's appeal eligibility (eligible / open / ended, and for a
    `-239` refusal *"until <date>"* / *"ended on <date>"*) and a *"File an appeal for the family"* action calling the EXISTING on-behalf
    route — the operator files appeals for the family (AR-61). The admin appeal controls (`AppealStageControls.tsx`) show the date too. ⛔
    The mobile `AppealStatusCard` stays unmounted (its deferred item is ⛔ not this story's). ⚠ This tells the refused person only when
    they call or staff call them (option A of Q3). If Q3 is answered B, a once-ever text to the REFUSED FILER with the date joins RF11 as a
    third purpose, through a NEW resolver covering BOTH claimant sides of 6.19a W6 (`claim_contacts_one_claimant_side_check`): a
    non-nominee claimant's own contact mobile, OR — the likeliest case — a claimant linked to a nominee version
    (`claimantNomineeVersionId`), whose only number is that version's `mobile_ciphertext` (the post-death declaration, entered by whoever
    made the change); ⛔ no contact record ⇒ ⛔ no number (`no_target`). ⛔ Never `readCorrectionRecipients`.
- **[a] RF15 — THE PER-DEATH APPEAL KEY (built — `-291` Q1 A makes the race real).** At the limit's boundary an appeal can be initiated at the
  same moment the held claim's final approval reads *"time limit passed"*. ⇒ A dedicated transaction advisory key
  `suspicion-appeal:<pariwar>:<deceased>`, taken by RF5's conjunct UNCONDITIONALLY at `step: 'final'`, FIRST in the conjunct (after the
  caller's own locks), and by `initiateAppeal` AFTER its own `appeal:` lock and claim-row lock — where the live reason is stable (`reviseDecision`
  takes the same row lock) — when that reason is `-239`, and BEFORE `assertAppealInitiable`'s new guard, which receives the
  `clock_timestamp()` read after the key; BOTH judge the limit with that clock (Trap 16). The holder of this key ⛔ never then waits on a claim lock
  — ⚠ the key is held to COMMIT, so this must hold for ALL post-gate work of the six `assertClaimApprovable` sites
  (`verifier-decision-persist.ts:408`, `state-trustee-decision-persist.ts:582`, `r9-voting-persist.ts:659`, `correction-closure.ts:1347,1358,1556`)
  — Task 4b.2 enumerates each site's post-gate statements and records any lock on another claim (⛔ none expected) (round 3 traced ⛔ no cycle). ⛔ Never the intake lock (`acquireIntakeLock` is taken by
  `tryConverge`, which can insert against a held claim — a cycle) and ⛔ never RF6's reversal key. A two-connection test pins it (an
  initiation racing a final approval at the boundary: exactly one wins — either the appeal opens and the approval waits, or the approval
  proceeds and the initiation answers the time-limit 409).
- **[a] RF16 — STALE TEXT IS CORRECTED WHERE IT LIVES** (⛔ never a standalone edit of a merged story above its Change Log): the T17 sentence in
  `nominee-refusal-read.ts:19-23`, `icp.ts:116`'s comment, `refile-guard.ts:10-12` and `claims.refile-confirmation.handlers.ts:10` (the
  *"Row 6-24 edits this"* notes — reworded to what 6.24 did), the strip note and its test (`apps/admin/tests/ConvergenceDecisionStrip.test.tsx:66-67`). 6.20's
  story gains a Change Log row only.

## ⭐ FOUND FACTS (F1–F15; ⛔ not decided — each with its build response)
- **F1** — the (3b) swallow (Fact 1) ⇒ RF2 at the candidate.
- **F2** — ⛔ no appeal deadline (Fact 2) ⇒ Q1 ⇒ ✅ `-291` Q1 A ⇒ RF14, RF15.
- **F3** — the refusal row survives an allowed appeal and can be revised (Fact 3) ⇒ RF1 reads the anchor; everything derived.
- **F4** — ⛔ no stage flag; `commitCycleFreeze` ungated (Fact 4) ⇒ RF5's `step`, RF7.
- **F5** — ⛔ no closed state; 6.19c's closure is a denial and is forbidden here (Fact 5) ⇒ RF4.
- **F6** — the code goes to the latest nominee (Fact 6) ⇒ RF9.
- **F7** — **the T17 test goes RED by design:** `packages/domain/tests/integration/claim/nominee-refusal-inheritance.spec.ts:152-186`
  (*"during the refuser's APPEAL a refile CONVERGES onto the refused claim (today's behaviour)"*) ⇒ AMENDED to D4 B (the refile mints a
  distinct claim on BOTH channels — the same AND a different one — and still inherits), ⛔ never deleted; its title records the supersession.
- **F8** — **6.26b's leg (e) changes meaning:** `correction-queue-late-inspection.spec.ts` (~:336-394) reverses the source and expects the
  refile to reach the final vote with `LateWarningReasonRequiredError` (*"its `-239` denial stays live ⇒ S stays the source"*, ~:367). Under
  RF6 the reversal CLOSES the refile, and under RF8 a reversed refusal is ⛔ no source. ⇒ the leg is re-derived for its PURPOSE (a source
  gaining a late differing date while the refile relies on it) with a source that is ⛔ not reversed (e.g. the refusal still standing and
  its appeal `upheld_final`) — ⛔ never weakened, and a new leg pins *"reversal ⇒ the refile is `closed`"*. Grep every spec that reverses
  a `-239` claim while another claim of the death exists (`grep -rln "post_death_nominee_change" packages/domain/tests apps/api/tests`).
- **F9** — the four approval translators (an unmapped typed error ⇒ 500): `claims.verification-decision.handlers.ts:76-148`,
  `claims.cycle-freeze.handlers.ts:133-181`, `claims.r9-voting.handlers.ts:87-180`, `claims.correction-closure.handlers.ts:193`
  (`translateClosureError`, also serving `claims.correction-escalation.handlers.ts`). ⚠ P1's translator never sees the new error (P1 is
  `'district_admin'`) — map it anyway (one shared message helper, the `ground-inspection-required-message.ts` pattern) so a future caller
  can ⛔ never 500. `refusedApprovalWarningAudit` (`later-approval-warnings.ts:90`) — check whether its audit-field switch enumerates gate
  errors; extend it if so.
- **F10** — `getEffectiveNomineeDeclaration` is per CLAIM (⛔ not per death) and fails closed (`undetermined | unversioned | empty |
  incoherent`) ⇒ RF9 / RF11 resolve through the refused claim; any non-`effective` ⇒ ⛔ no recipient.
- **F11** — ⛔ no appeal event marks "never appealed"; `claim.denied_no_appeal` only on a stage-3 uphold and 6.19c ⇒ RF1 reads
  `claim_appeals` (one row per claim, `claim_appeals_one_per_claim_uq`; `APPEAL_JOURNEY_STATUSES = ['open','reversed','upheld_final']`).
- **F12** — the reversal writers lock the REFUSED claim (`appeal:` advisory + row, `appeal-persist.ts:133-143`); the final approvers lock
  the HELD claim (trustee / R9 / closure keys + row). They share ⛔ no lock today ⇒ RF6's order + Trap 8.
- **F13** — the account freeze clears only on `claim.settled` / `claim.denied_no_appeal` (`member/overlay.ts:50`, `:86-95`) and holds while
  ANY stream is unresolved ⇒ RF4 adds `claim.closed`.
- **F14** — **Ravi-mode reality (recorded, ⛔ not reopened):** the app session that requests the filing code is the DECEASED's account,
  whose login code goes to the deceased's registered mobile — in the Panel's scenario, the phone the person who changed the nominee holds.
  FQ6 therefore stops THAT person from filing again in the app (the code now reaches the true nominee, ⛔ not them); the true nominee files
  in the app only with access to that session, else through the helpline (which has ⛔ no handover code — `claims.helpline.routes.ts:14`).
  The masked last-4 shown to the phone holder becomes the true nominee's — it tells them only that a refusal exists, which they know.
- **F15** — **the refile wizard shows the DISCARDED nominee** (validator M11): its nominee-review and contact steps read `nomineesStatus()`
  — the latest projection (`apps/mobile/app/(claim)/contact.tsx:8,131`) — so the true nominee's refile shows, and its contact record may
  link the claimant to, the version the District Admin discarded. ⚠ ⛔ No ruling covers what the wizard shows ⇒ ⛔ not built here; the
  refile's own determination (6.20 D17, per claim) still decides who is paid. Recorded as a `deferred-work.md` item (Task 8.1) with its
  trigger: any story that touches the wizard's nominee steps, or a ruling on it.

## Acceptance Criteria

### AC0 — Governance (Task 0)
✅ The Panel note `trustee-panel-routing-note-2026-10-07-6-24-appeal-never-filed.md` is ANSWERED and transcribed into its block; ✅
`2026-10-07-291` (Q1 A, 90 days; Q2 B) is committed ALONE (`2f674a57`); ✅ the author-commit `2026-10-07-292` (RF1–RF16 as of v1.9, F1–F15 by reference) is in
`.decision-log.md`, committed ALONE before any code (`f0801f1e`); ✅ `epics.md` carries `### Story 6.24`, and `-291` Consequence 2's annotations are made
(6.16 D-E, the PRD's *"No formal time limit"* line, `docs/appeal-procedural-fairness/README.md`); work is on
`story/6-24-true-nominee-refile-after-a-suspicion-refusal`. ⛔ No code before.

### AC1 — Kept apart (D4 B; RF1, RF2, F1, F7)
**Given** a claim S for a death, refused by the District Admin with `post_death_nominee_change`, **when** a new filing for that death
arrives through the app or the helpline — on the SAME channel as S or a different one, with S in `denied`, `appeal_stage_1`, `appeal_stage_2`
or `appeal_stage_3` — **then** a NEW claim is minted (`minted: true`), ⛔ never S's id and ⛔ never a pending attempt against S; the pending
strip lists ⛔ no attempt against S; `confirmMerge` onto S is refused. **And** a filing for a death whose only refusal is ANY OTHER reason, or
whose `-239` refusal was REVERSED on appeal, behaves exactly as today. **And** a revision of S's reason off `-239` makes S a candidate again;
onto `-239` makes it ⛔ not one. **And** the T17 spec is amended (F7), the strip note reworded.

### AC2 — The wait at final approval (FQ5; RF3, RF5, F4, F9)
**Given** S's refusal stands and its appeal is `open`, or `not_filed` within its 90 days, **then** a final approval of any other claim R of the death — the State
Trustee vote, R9 finalize, the Super Admin's full and `-251` waived approves, the Pariwar Admin's "no correction needed" approve — answers
409 `<prefix>.suspicion_appeal_pending` with `details.reason` (`appeal_not_filed` | `appeal_open`), ⛔ never a 500 and ⛔ never a denial;
**and** the District Admin's approval of R (P1) is ⛔ not held by it. **Given** S's appeal is `upheld_final`, **or** ⛔ no appeal was filed and S's 90 days have passed (from 00:00 IST of day 91 — a
boundary pair: the last instant of day 90 waits, the first of day 91 proceeds), R's final approval proceeds (its other conjuncts
unchanged). **And** the conjunct sits after the ground-inspection conjunct and before the late-warning wait, which stays
LAST (a test: a claim failing both answers the suspicion 409; a claim failing only the late wait still answers the late-warning 409). **And**
`step` is REQUIRED (a compile-time pin: an omitted `step` is a type error). **And** one HTTP test per final-approval route (five).

### AC2b — The 90-day appeal limit (`-291` Q1 A; RF14, RF15)
**Given** a claim whose CURRENT `-239` chain begins on IST date D (the District Admin's refusal, or a revision ONTO `-239` of an earlier
refusal — a leg each), **then** `initiateAppeal` succeeds through 23:59:59.999 IST on D + 90 and answers 409
`appeal.suspicion_refusal_time_limit_passed` (`details.appeal_until`) from 00:00 IST on D + 91 — ⛔ never a 500; a revision that keeps `-239`
does ⛔ not move D; a refusal for ANY other reason is initiable past 90 days exactly as today (6.16 D-E unchanged for it). **And** an appeal
initiation and a held claim's final approval racing at the boundary resolve one way only (RF15 — a two-connection test). **And** the helpline appeal
screen shows *"Can be appealed until <date>"* / *"The time to appeal ended on <date>"* for a `-239` refusal (en + hi) and files an appeal
for the family through the existing on-behalf route (an operator holding only `claim.file` can reach both — a test). **And** a revision of
S's reason OFF `-239` while ANY other claim of the death is in any state but `closed` — `settled` and `denied` included, and a claim
that predates the refusal too (v1.6) — answers 409 `verifier_decision.suspicion_reason_locked` (RF13); a note-only revision keeping
`-239` succeeds; once every other claim is `closed` the reason may move; a revision racing R's mint serialises (the intake lock — a two-connection test).
**And** a revision away and back starts a NEW 90 days from the new chain's first row (RF14 v1.5). **And** the time-limit helper is ONE pure function with a unit table
(IST midnight edges, a refusal at 23:59 IST, a refusal at 00:01 IST).

### AC3 — Closed when the appeal is allowed (FQ5; RF4, RF6, F5, F8, F13)
**Given** S's appeal is allowed at stage 1, stage 2 or stage 3, **then** in the SAME transaction every other claim of the death in a
CLOSABLE state — incl. `denied`, `appeal_stage_1..3` (its anchor → `closed`) and `reversed` — moves to `closed` through `claim.closed`
(`trigger: 'suspicion_appeal_allowed'`, `held_by_claim_case_id = S`); a claim already `settled` / `approved` / `state_trustee_approved` is ⛔
not moved and is recorded (log + audit); a closed claim's live return / run / R9 / appeal-panel sessions are ended (⛔ no reminder text after
`closed` — a test); a closed claim ⛔ never stands (RF1) — so the reversed S's own final approval is ⛔ never held by it (a test with a second
`-239` refusal of the death, closed by S's reversal); two concurrent reversals of one death serialise (⛔ 40P01). **And** a reversal of a refusal
with ANY OTHER reason closes ⛔ nothing. **And** each claim so closed gets ONE `closed_after_appeal` text (`-291` Q2 B — ⚠ built by 6.24b's AC7b, ⛔ not asserted here; AC7's machinery
and assertions; ⛔ never a second on a re-run). **And** `closed` is terminal, ⛔ not appealable (`initiateAppeal` → the existing not-denied 409),
⛔ never a closures row, ⛔ never `denied_no_appeal`; the closed stream unfreezes (S's freeze stands while S is live). **And** the event-count
pins move 35 → 36 with the reason; the contracts mirror and its lockstep test and the events registry gain `closed`; every state LIST
found by Task 3.0's grep is decided and recorded (⛔ no map is typecheck-forced); the refile guard lets a death with a `closed` claim re-file
(a test). **And** 6.26b's leg (e) is re-derived (F8), ⛔ never weakened.

### AC4 — The commit re-checks (RF7; P5; discharges the deferred item)
**Given** R is `state_trustee_approved` and, before the cycle commit, a `-239` refusal starts to stand on another claim of the death (a
revision ONTO `-239` of a `denied` claim — reachable, F3; the fixture keeps it INSIDE that claim's new 90 days, which start at the
revision — RF14) **or** R's inherited visit vanishes (the source's refusal revised away), **then**
`commitCycleFreeze` skips R and keeps it `state_trustee_approved` (⛔ no `claim.approved`), and commits it on a later run once the condition
clears. A normal claim commits exactly as today. The deferred item is marked DISCHARGED (appended, ⛔ never deleted).

### AC5 — The inheritance (RF8)
A reversed `-239` refusal is ⛔ no longer an inheritance source (the refile, if any, is `closed` — AC3); a standing or `upheld_final` one still
is. 6.26a's and 6.26b's inheritance specs stay green except those re-derived under F8.

### AC6 → Story 6.24b (AC6b — the filing code)

### AC7 → Story 6.24b (AC7b — the texts)

### AC8 — What people see (RF10, RF12)
The District Admin's console shows the kept-apart line and the wait line (or *"could not be checked just now"* on a failed read) with ⛔ no
name and ⛔ no note; the read is counted (ceiling bumped, exact `toBe`). The 409's words render on every later surface through the existing
translators. A `closed` claim shows *"This claim has been closed. Please call the helpline."* (en + hi) on the mobile's calm helpline screen (the entry
routing sends a `closed` pointer claim there, ⛔ never to the wizard — RF12 v1.3) and in the helpline read-back, which now lists the member's `closed` claims; ⛔ no member-facing string mentions suspicion, fraud, a changed nominee or a name (a test greps the new strings).

### AC9 — Nothing else moves (RF13 — its one revision guard aside)
Permission catalog version and key count unchanged; ⛔ no new reason code; 6.19c's closure / refile-guard / appeal-closed paths unchanged
(their specs green); ⛔ no `apps/public` file changes (`git diff --name-only 6bb79afd..HEAD -- apps/public` empty).

### AC10 — The proof
Every test below passes; each load-bearing test is red-checked (revert the line, watch it fail, restore — listed in the Debug Log);
`pnpm ci:local` green with `DATABASE_URL` at :5433 (domain, API, jobs, admin, mobile, contracts, i18n, microcopy); migration 0150
applied to BOTH :5432 and :5433, the enum values verified on each (0151 is 6.24b's).

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0)** ✅ complete 2026-10-07 except 0.1, which runs at the build
  - [x] 0.1 (AT THE BUILD) `git fetch origin`; `git merge-base --is-ancestor 6bb79afd HEAD`; `git diff --name-only 6bb79afd..HEAD -- packages apps scripts`
    — re-read every cited file it lists ([[feedback_git_fetch_before_remote_reasoning]]). Confirm ⛔ no decision after `-290` touches the
    gate, convergence, the appeal, the handover OTP or rows 6-25 / 6-27; if row 6-25 or 6-27 landed first, rebase onto its conjuncts —
    ⛔ none drops another's check (`-277` Consequence 2, `-282` Consequence 4).
  - [x] 0.2 ✅ The Panel answered (DR + KB: *"Q1 - A · Q2 - B"*; BigDev: *"90 days"*) — transcribed into the note's block and recorded as
    `2026-10-07-291`, committed ALONE (`2f674a57`).
  - [x] 0.3 ✅ Eight fresh-context read-only validate rounds (v1.1–v1.9); round 8 found ⛔ no BLOCKER / HIGH ⇒ the rounds stopped. Each
    pass's own edits were re-validated by the next ([[feedback_story_validate_footguns]]).
  - [x] 0.4 ✅ `2026-10-07-292` — RF1–RF16 verbatim from v1.9, the three amended `-291` readings, F1–F15 by reference — committed ALONE
    (`f0801f1e`) ([[feedback_governance_commits_precede_implementation]]).
  - [x] 0.5 ✅ P1–P6 re-checked against `-292`; P7 added for RF13's reason lock.
  - [x] 0.6 ✅ (`5e77ca6e`) `epics.md` — `### Story 6.24` after `### Story 6.26b` (the Minted-by header, the 6.23b / 6.26b shape: `-261` D4 B, `-262` FQ5–FQ7,
    `-291`, the author-commit, the go-live coupling line for FQ7 and Q2's text), its own `governance(6.24)` commit — together with the
    annotations `-291` Consequence 2 owes (⛔ never rewrites): a dated line under 6.16's D-E
    (`6-16-3-stage-claim-denial-appeal-flow-reversed-denial-sahyog-vivran-publish-hook.md`), under the PRD's *"No formal time limit on the
    family's right to appeal"* (`prds/prd-TWT-2026-05-22/prd.md:752`) and in `docs/appeal-procedural-fairness/README.md` where it repeats it.

- [x] **Task 1 — Migration (AC3, AC10; RF4)**
  - [x] 1.1 `0150_claim-closed-enum-values.sql`: `ALTER TYPE "claim_lifecycle_state" ADD VALUE IF NOT EXISTS 'closed';` and
    `ALTER TYPE "appeal_journey_status" ADD VALUE IF NOT EXISTS 'closed';` (the 0146 `IF NOT EXISTS` form; confirm the enum's DB name in
    its creating migration) — ⛔ nothing else in the file (Trap 6). Journal idx 150, `when` > 0149's `1793590800000`.
  - [x] 1.2 → Story 6.24b (the notice table).
  - [x] 1.3 Drizzle schema: `CLAIM_LIFECYCLE_STATES` (`schema/claims.ts:73`) + `closed`; `APPEAL_JOURNEY_STATUSES` (`appeal.ts:71`) and its
    contracts mirror + `closed`; new `schema/claim_suspicion_notices.ts` (`as const` status tuple +
    LOCKSTEP comment); export from the schema index. Apply both to :5432 AND :5433 ([[project_live_db_test_gotchas]] — ⛔ never regenerate,
    ⛔ never DROP SCHEMA); verify `enum_range(NULL::claim_lifecycle_state)` and the CHECK names on each. ⚠ An FK to `claims` can trip the
    TRUNCATE-lock spec — that is the story's, ⛔ not a flake ([[project_fk_truncate_cascade_deadlock]]).

- [x] **Task 2 — Domain: the standing refusal and convergence (AC1, AC5; RF1, RF2, RF8, RF16)**
  - [x] 2.1 `claim/suspicion-refusal.ts` — RF1's fragment, `readStandingSuspicionRefusals`, `suspicionAppealWaitState` (pure), exported via
    `claim/index.ts`. Unit table for the pure helper (not_filed / open / upheld_final / reversed-absent / several refusals / self excluded).
  - [x] 2.2 `icp.ts` — RF2 in `getConvergenceCandidate` AND `getPendingIntakeAttempts`' JOIN (raw SQL, explicit aliases).
  - [x] 2.3 `getClaimByDeceasedMember` (`read.ts:119-123`): list every caller (`grep -rn "getClaimByDeceasedMember" packages apps`), decide each
    per RF2, record the list in the Debug Log.
  - [x] 2.4 `nominee-refusal-read.ts` — `inheritedGroundInspectionSourceSql` reads RF1's fragment (RF8); the T17 header sentence reworded (RF16).
  - [x] 2.5 Live-DB specs (`packages/domain/tests/integration/claim/`): AC1's matrix (same channel / other channel × `denied` /
    `appeal_stage_1..3`; other-reason refusal converges; reversed converges; revision off / onto `-239`); the AMENDED T17 spec (F7); AC5.
    ⚠ Drive states through the REAL writers (`initiateAppeal`, `reviewAppealStage1`, …) — a forced `current_state` does ⛔ not survive
    `projectClaimState`'s replay; where a spec forces a state today (`forceState`), keep it only where the writer path is ⛔ not the subject.

- [x] **Task 3 — Domain: `closed` (AC3; RF4, RF6, F13)**
  - [x] 3.0 FIRST, the two enumerations RF4 / RF6 require, recorded in the Debug Log: every literal state LIST (and its decision) and every
    table with a live row keyed on a claim (and how RF6 ends it, or why it is inert / a residual); and every literal consumer of
    `appeal_journey_status` (`apps/mobile/lib/appeal-status.ts:10`, `packages/contracts/src/claims/appeal.ts:54`,
    `AppealStageControls.tsx:216`, `appeal-read.ts:138` — grep for more).
  - [x] 3.1 `claim/state.ts`: the `claim.closed` transition from each CLOSABLE state (the transition table ~:360-395); `CLAIM_TERMINAL_STATES`
    + `closed`; `claim/events.ts` `CLAIM_EVENT_TYPES` + payload type; `packages/events` registry; `member/overlay.ts`
    `ACCOUNT_UNFREEZE_EVENT_TYPES` + `claim.closed`. Pins 35 → 36 (every `toHaveLength(35)` twin, with the reason appended).
  - [x] 3.1b The two session cores extracted (`supersedeAppealPanelSession`, `supersedeR9VotingSession` — RF6 v1.3), the public writers
    unchanged in behaviour.
  - [x] 3.2 `closeClaimsHeldBySuspicionAppeal` (in `suspicion-refusal.ts`, or a sibling `-persist` module if NW1's import scan forbids
    `events.ts` in the read module — it will: keep the READ module free of `claim/events.ts`), called from the three reversal sites.
  - [x] 3.3 Specs: stage 1 / stage 2 / stage 3 reversal each close R in the same transaction (R in `verification_in_progress`, `denied`,
    `appeal_stage_1` — its anchor → `closed` —, `reversed`) (assert R's state AND that a rolled-back
    reversal leaves R untouched); other-reason reversal closes ⛔ nothing; R in `state_trustee_approved` is ⛔ not moved and is logged;
    `initiateAppeal` on a closed R → not-denied 409; overlay: R's stream resolved, the member stays frozen while S lives; `closed` ⛔ never a
    candidate (`CLAIM_TERMINAL_STATES`). F8's re-derived leg (e) + the new *"reversal ⇒ closed"* leg.

- [x] **Task 4 — Domain: the gate and the commit (AC2, AC4; RF5, RF7)**
  - [x] 4.1 `ClaimApprovalGateOptions.step` (REQUIRED) + the six call sites; `assertSuspicionAppealDecidedForFinalApproval` in the OUTER gate
    at RF5's position; `SuspicionAppealPendingError` in `claim/errors.ts` (exported).
  - [x] 4.2 `commitCycleFreeze` — RF7's two skip-and-keep re-checks after `hasLiveReturnRow`.
  - [x] 4.3 Fixtures: the shared approve-path seed (`seedNomineeNameCheck`, both copies — [[feedback_story_validate_footguns]] "grep TESTS for
    twins") needs ⛔ nothing new by default (⛔ no other claim of the death ⇒ ⛔ no wait); grep every spec that files TWO claims for one death
    and reaches a final approval — each now waits or is re-derived.
  - [x] 4.4 Specs: each final writer waits (`appeal_not_filed`, `appeal_open`) and proceeds on `upheld_final`; P1 ⛔ never waits; the order
    test (AC2); AC4's two legs (the revision onto `-239` is REAL — `reviseDecision` on a `denied` claim; the vanishing inheritance by
    revising the source off `-239`) — the commit leg runs in its own committed transactions where an ORDER matters
    ([[project_db_clock_ordering_tests_tie]]).

- [x] **Task 4b — Domain + API: the 90-day limit (AC2b; RF14, RF15)**
  - [x] 4b.1 `suspicionRefusalAppealUntil` (pure, in `suspicion-refusal.ts`) + its unit table; RF1's `time_limit_passed`.
  - [x] 4b.2 (incl. the six sites' post-gate lock enumeration — RF15; and RF13's guard + `acquireIntakeLock` in `reviseDecision`)
    `assertAppealInitiable`'s fourth guard + `AppealTimeLimitPassedError` (exported) + its JSDoc amendment; RF15's key in
    `initiateAppeal` and in RF5's conjunct, both judging with `clock_timestamp()` after the key.
  - [x] 4b.3 The appeal handlers' 409 mapping; the contracts error-code union if one exists; RF13's revision guard + its 409 in the
    verifier-decision translator; the helpline appeal screen (a `claim.file`-gated eligibility read + the admin client call to the existing
    on-behalf route + the UI, en + hi) and the date on `AppealStageControls.tsx`.
  - [x] 4b.4 Specs: AC2b's legs (a live-DB boundary pair with an injected refusal time; a non-`-239` refusal past 90 days still initiable;
    the two-connection race in its own committed transactions — the `ground-inspection-concurrency.spec.ts` pattern).

- [x] **Task 5 — API (AC2, AC8; RF5, RF10)**
  - [x] 5.1 One shared message helper for `SuspicionAppealPendingError` (the `ground-inspection-required-message.ts` pattern, an exhaustive
    `Record<reason, string>`); mapped in all four translators (F9) → 409 `<prefix>.suspicion_appeal_pending`.
  - [x] 5.2 → Story 6.24b (`sendHandoverOtp`).
  - [x] 5.3 The verifier console section (RF10) under `underSavepoint`; `VERIFIER_CONSOLE_MAX_READS` bump + ledger line + exact `toBe`.
  - [x] 5.4 Specs (`apps/api/tests/integration/claims/`): five final-route 409s (beside `ground-inspection-required-routes.spec.ts`); the
    console lines and the failed-read line (AC6's legs → 6.24b's Task 2.2).

- [x] **Task 6** → Story 6.24b (the jobs sweep and the texts).

- [x] **Task 7 — Contracts, i18n, admin, mobile (AC3, AC8; RF4, RF10, RF12)**
  - [x] 7.1 Contracts: `ClaimLifecycleState` + `closed` (`filing.ts:47-62`) and its lockstep test; any 409-code union the admin client keys on;
    run the contracts vitest — its tests are outside tsc ([[project_contracts_tests_outside_tsc]]).
  - [x] 7.2 i18n: (the SMS copy keys → 6.24b) the closed-claim status words (en + hi) through the real `t()`
    ([[feedback_stub_must_call_not_transcribe]]); `classification.json`.
  - [x] 7.3 Admin: the console section words; the 409 words; the strip note (RF16) and its test.
  - [x] 7.4 Mobile + contracts: RF12's four pieces for the `closed` entry outcome (the contract field + producer, the classifier, the
    `ClaimEntryReadOutcome` / `ClaimEntryDecision` kinds and the helpline screen, the fixtures); `lib/appeal-status.ts` checked; the entry routing (RF2 v1.1) through the
    server's outcome — verify `fetch-claim-entry-outcome.ts` and `app/(claim)/index.tsx`; the helpline read-back lists `closed` (RF12).

- [x] **Task 8 — Records and proof (AC9, AC10)**
  - [x] 8.1 `deferred-work.md`: F15 as a new item; the two items DISCHARGED / partly discharged (RF7, RF8 — appended lines, ⛔ never deleted
    [[feedback_closure_language_precision]]); a 6.24 section for anything deferred.
  - [x] 8.2 6.20's story: one Change Log row (T17 superseded as built by 6.24). The stale code comments (RF16).
  - [x] 8.3 `pnpm ci:local` with `DATABASE_URL` at :5433; the red-checks in the Debug Log; `sprint-status.yaml` via the safe prepend
    ([[project_sprint_status_safe_prepend]]); commit on the story branch ([[feedback_commit_on_story_branch]]).

### Review Findings

⚠ **Scope note:** this pass (`bmad-code-review`, 2026-10-08) reviewed CHUNK 1 of 4 only — the domain-core diff (`packages/domain/src/claim/*`
and its unit/integration tests, migration 0150, `packages/contracts/src/claims/*`, `packages/events/src/registry.ts`, the `claim.json` i18n
keys; 52 files, +2943/-168 against baseline `6bb79afd`). `apps/api`, `apps/admin` and `apps/mobile` are **not yet reviewed** — story status is
⛔ not advanced until those chunks are done. Three parallel layers ran: Blind Hunter (diff-only), Edge Case Hunter (diff + repo read), Acceptance
Auditor (diff + this spec). 29 raw findings → 23 unique after dedup → 0 decision-needed, 4 patch, 10 defer, 9 dismissed (each dismissal verified
against the actual code/spec, not taken on the reviewing agent's word — several raw findings turned out to restate already-ratified policy
(RF13/P7's reason lock) or an already-precedented pattern (migration 0150 vs 0146), or to overread a docstring).

- [x] [Review][Patch] AC2's "late-wait-only" order leg is asserted by a tautological check, not a real 409 — `suspicion-refusal.spec.ts:562` asserted `LateWarningReasonRequiredError.name === 'LateWarningReasonRequiredError'` (always true), never actually driving a claim with no standing refusal but a late-warning failure through `finalGate` and asserting the 409, though AC2 explicitly calls for that test leg. **Fixed** — the leg now drives a real claim (a fresh, unrelated death — the 6.23b Trap 17 construction: a District-Admin approval over a recent nominee change, then a certificate re-review that makes it ALSO post-death, a late key the approval never covered) through `finalGate` and asserts `rejects.toBeInstanceOf(LateWarningReasonRequiredError)`. Verified against the live DB at :5433 — all 39 tests in the file pass.
- [x] [Review][Patch] `initiateAppeal` and `assertAppealInitiable` each call `readSuspicionChainStart` separately in the same transaction — `appeal-persist.ts:303` and `appeal-eligibility.ts:217`; thread the already-fetched chain through `opts` (as `clock` already is) instead of re-querying. **Fixed** — `assertAppealInitiable` now accepts an optional `opts.chain` (reused when the caller already read it, under the claim's row lock — stable for the rest of that transaction); `initiateAppeal` passes its own read through. Only the CLOCK is still re-read after RF15's key (Trap 16 unaffected). Verified: typecheck clean; the two-connection race specs (RF15 a/b) and the full `tests/integration/claim/` + `tests/claim/` suites (1288 tests, 84 files) pass.
- [x] [Review][Patch] `appeal_until` fields use bare `z.string()` instead of this package's own calendar-date regex pattern — `packages/contracts/src/claims/appeal.ts:400,459` — unlike `DateShape` (`death-certificate.ts:17`) / `CalendarDate` (`nominee-declaration.ts:30`) already established in sibling contract files. **Fixed** — added the same local `CalendarDate` regex shape to `appeal.ts` and used it at both sites. Verified the producer (`formatCalendarDate`) always emits a conforming `YYYY-MM-DD` string; full contracts suite (1274 tests, 75 files) passes.
- [x] [Review][Patch] `HelplineAppealEligibility`'s contracts lockstep test hardcodes the expected set literally instead of a true cross-package comparison — `packages/contracts/tests/claims-suspicion-refusal.test.ts:46-47` — because the domain exports `HelplineAppealEligibility` only as a TS type, not an `as const` runtime tuple (unlike its sibling `APPEAL_JOURNEY_STATUSES` check in the same file); export one from the domain and import it here. **Fixed** — added `HELPLINE_APPEAL_ELIGIBILITY_VALUES` (`as const`) to `appeal-eligibility.ts`, deriving the type from it; the contracts test now compares against `claim.HELPLINE_APPEAL_ELIGIBILITY_VALUES` as a dedicated LOCKSTEP test, mirroring the `AppealJourneyStatus` check. Verified: typecheck clean; contracts suite passes (5 tests in file, 1274 overall).
- [x] [Review][Defer] `reviseDecision` takes the per-death INTAKE advisory lock unconditionally on every revision call, not only ones touching `post_death_nominee_change` — `verifier-decision-persist.ts:~596` — deferred, pre-existing trade-off: narrowing it would require reading the live reason code unlocked before deciding whether to lock, reintroducing the TOCTOU race the unconditional lock currently avoids.
- [x] [Review][Defer] `readStandingSuspicionRefusals`'s SQL projects `clock_timestamp()` as a column in a multi-row query — `suspicion-refusal.ts:172` — technically evaluated per-row despite the comment's "ONE statement" framing; deferred, pre-existing: the stated fallback (a stale clock only ever causes one extra conservative commit-skip) already bounds the consequence at IST day-granularity.
- [x] [Review][Defer] `reviseDecision`'s "held" claim lookup for `SuspicionReasonLockedError`'s cited blocker orders by `claimCaseId` (UUID) ascending, not by relevance/recency — `verifier-decision-persist.ts:~639` — deferred, pre-existing: cosmetic only, doesn't affect the lock's correctness.
- [x] [Review][Defer] `closed_no_response` and `claim_closed` (`MemberDeathCertificateStatusResponse`) have no schema-level mutual-exclusivity guard — `packages/contracts/src/claims/death-certificate.ts:171,185` — deferred, pre-existing: verified reachable (a 6.19c-closed `denied` claim can later be RF6-closed by a sibling claim's reversal), but the one real consumer (`fetch-claim-entry-outcome.ts`) already has correct precedence checking `claim_closed` first.
- [x] [Review][Defer] `suspicionChainStartedAtSql`'s recursive CTE has no cycle guard against a corrupted `supersedes_decision_id` chain — `suspicion-refusal.ts:92` — deferred, pre-existing: only reachable under the data-corruption scenario the spec itself already flags as "a convention, not a DB rule."
- [x] [Review][Defer] `endLiveProcesses` supersedes the correction-return row with `now()` while `endCorrectionRun` ends the run with `clock_timestamp()` — `suspicion-refusal-persist.ts:210` vs `correction-chase.ts:372` — deferred, pre-existing: a clock-source mismatch between two causally-ordered writes in one transaction; no identified consumer depends on their relative ordering.
- [x] [Review][Defer] AC4's own wording ("the source's refusal revised away") describes a scenario RF13's guard now makes unreachable — deferred, pre-existing: already disclosed in the Debug Log and `deferred-work.md`'s AC4-leg-2 deviation note; a documentation-reconciliation nit, not a code defect.
- [x] [Review][Defer] F8/leg (e)'s original fact pattern is unreachable through the real writers; its spec drives a raw DB insert instead — `correction-queue-late-inspection.spec.ts` — deferred, pre-existing: already disclosed in the Debug Log's deviations list.
- [x] [Review][Defer] `standingSuspicionRefusalSql(claimAlias)` trusts a caller-supplied alias string (bare-identifier regex only, no tie to the real query alias) — `suspicion-refusal.ts:60` — deferred, pre-existing: inherent to the deliberate raw-SQL-fragment approach chosen to avoid the Epic 6 Drizzle correlated-subquery bug; a mismatch fails loudly in CI, not silently in production.
- [x] [Review][Defer] `listHelplineAppealEligibility` runs an N+1 query pattern (up to ~5-6 queries × 10 claims) and reads `appealUntil` / `eligibility` via two independent `clock_timestamp()` statements per row that could rarely disagree at a midnight-IST boundary — `appeal-eligibility.ts:261-280` — deferred, pre-existing: bounded by `HELPLINE_APPEAL_LIST_CAP=10`, a low-traffic staff-only display screen; self-corrects on next read.

#### Chunk 2 (`apps/api`) — 2026-10-08

⚠ Same three layers. 22 raw findings → 1 patch, 6 defer, 14 dismissed (one dismissed Blind Hunter finding — the `closed_no_response`/`claim_closed` overlap — is the SAME item already tracked as a chunk-1 defer, not double-counted).

- [x] [Review][Patch] The `SuspicionReasonLockedError` 409 message said *"while another claim for the same death is still open"*, contradicting RF13/AC2b's actual rule — the lock holds while the other claim is in **any** state but `closed`, including `approved`/`settled`/`denied` — `claims.verification-decision.handlers.ts:178`. The comment directly above it already states the rule correctly ("is ⛔ not closed"); only the thrown message text was wrong, and no test asserted on its exact wording. **Fixed** — reworded to *"has not been closed"*. Verified: typecheck clean; the three affected API integration spec files (44 tests) pass.
- [x] [Review][Defer] `assembleSuspicionRefusal`'s (and the pre-existing `assembleGroundInspectionGate`'s, Story 6.26a GI9) try/catch wraps the pure post-processing logic (`suspicionAppealWaitState`, the `.map`) together with the SAVEPOINT-protected SQL read, so a logic bug there would be reported identically to a genuine SQL/infra failure ("could not be checked just now") — `claims.verifier-console.handlers.ts:842-868`. Deferred: a file-wide convention predating this diff, not unique to 6.24a; worth a dedicated hardening pass across every `assemble*` section, not a one-off fix here.
- [x] [Review][Defer] `listLiveClaimsForDeceasedMember` is now called with `{ includeClosed: true }`, but its name still says "Live" — `claims.death-certificate.handlers.ts:376`. Cosmetic naming nit on a pre-existing, extended function.
- [x] [Review][Defer] The side effect of auto-closing other claims of the death (RF6, on an allowed appeal) is captured in the audit/error log (`heldClaimsAuditContext`) but not echoed back in the HTTP response body to the deciding staff member — `claims.appeal.handlers.ts:202-218`. A UX-enhancement candidate; no AC requires it in the response.
- [x] [Review][Defer] `suspicion-refusal-routes.spec.ts`'s fault-injection flag (`fault.on`) is shared mutable module state — correctly guarded today (`try`/`finally` + an `afterAll` backstop), but a future test inserted between the fault-toggling tests without the same care could flake.
- [x] [Review][Defer] `expectWaits()`'s leak-detection regex (guarding against "this claim is refused" wording) is narrow enough that a differently-phrased future message could still misleadingly imply the current claim was refused without tripping it.
- [x] [Review][Defer] The `SuspicionAppealPendingError` → 409 mapping block is duplicated (sharing only the message helper) across all four approval translators rather than unified into one shared translator — matches the pre-existing `ground-inspection-required-message.ts` convention each translator already follows for other shared errors; an architectural choice predating this diff, out of scope to refactor here.

#### Chunk 3 (`apps/admin`) — 2026-10-08

⚠ Same three layers. 23 raw findings → 5 patch, 5 defer, 11 dismissed (several dismissals cross-reference chunk 1's domain verification — e.g. the member-facing eligibility/appeal enums are exhaustive `.strict()` zod unions, confirmed in `packages/contracts/src/claims/verifier-console.ts`, so the "unguarded Record lookup" finding doesn't hold).

- [x] [Review][Patch] The admin's OWN hardcoded `reasonLocked` 409 message had the SAME wording bug as the server's (chunk 2) — "is still open" instead of reflecting RF13's actual rule (holds through `approved`/`settled`/`denied`, only released once `closed`) — `claim-verification/i18n-en.ts:701`. It also dropped the server's `details.held_claim_reference` entirely, unlike the sibling RF5 wait message pattern (RF10's "claim reference only" convention). **Fixed** — reworded to "has not been closed", added a `{reference}` placeholder, and a new `reasonLockedMessage(err)` helper (mirroring `suspicionAppealPendingMessage`'s pattern) in `nominee-errors.ts`, wired into `VerifierConsoleRoute.tsx`. The old test was circular (compared the function's output against the same hardcoded constant); rewritten to assert the actual wording and the interpolated reference. Verified: typecheck clean; full admin suite (968 tests, 60 files) passes.
- [x] [Review][Patch] `SignalsPanel.tsx`'s `SuspicionRefusalNotice` gave every kept-apart `<li>` the IDENTICAL `data-testid="suspicion-refusal-claim"` (no per-item suffix) — `SignalsPanel.tsx:54`. With more than one kept-apart claim (which RF3 explicitly allows), `getByTestId` would throw on ambiguity; the only existing test supplied a single-element array. **Fixed** — suffixed with `r.reference` (already a unique key); added a two-claim test to `verifier-console.test.tsx` proving the fix.
- [x] [Review][Patch] `HelplineAppeal.tsx`'s File button used the mutation's bare `file.isPending`, disabling EVERY row's button while filing any ONE claim (one shared mutation object for the whole list), and re-enabled immediately on success — before the list's refetch moved the claim off `can_appeal` — opening a window for a duplicate `initiateAppealOnBehalf` POST on an already-filed claim. **Fixed** — scoped the disable to the claim actually being filed (`filingThis`), and kept it disabled once filed (`filedThis`) until the list catches up. The existing test chained a success and a rejection on the SAME claim/click sequence (relying on the old always-enabled behavior) — split into two independent tests and added explicit assertions for the disabled-after-success and re-enabled-after-error states; `initiateAppealOnBehalf` is now asserted to be called exactly once even when the (now-disabled) button is clicked again.
- [x] [Review][Patch] `HelplineAppeal.tsx`'s "Try again" retry button had no `disabled` guard tied to the list query's fetch state, letting an operator fire overlapping refetches with no "retrying" feedback. **Fixed** — `disabled={listQ.isFetching}`.
- [x] [Review][Patch] `suspicion-refusal-helpline-appeal.test.tsx` had zero coverage of the loading, error+retry, and empty-list states; `later-approval-warnings.test.tsx`'s R9 panel test only covered one of the two `suspicion_appeal_pending` reasons despite `cycle-freeze-page.test.tsx` covering both for the same shared message lookup. **Fixed** — added loading/error-retry/empty-list tests for `HelplineAppeal`; parametrized the R9 panel test over both reasons (now 2 cases, matching the cycle-freeze precedent). Residual: the `under_appeal`/`already_appealed`/`not_appealable` eligibility-copy branches stay untested (see Defer).
- [x] [Review][Defer] `SuspicionRefusalNotice`'s `not_filed`/`time_limit_passed` list items concatenate phrase + raw date with no trailing period, inconsistent with the fully-punctuated sentences elsewhere in the same i18n block — `SignalsPanel.tsx:57`. Cosmetic copy polish.
- [x] [Review][Defer] `AppealStageControls.tsx` does manual `.replace('{date}', …)` templating while `HelplineAppeal.tsx`'s `appealReadBack` uses the shared bilingual `t()` call — these are two DIFFERENT i18n systems serving different purposes (admin-only English chrome vs. member-facing bilingual script), not a true inconsistency, but worth a note if a third such string is ever added.
- [x] [Review][Defer] `AppealStageControls.tsx`'s expired-deadline ("ended on") paragraph has no severity color-coding, unlike `SignalsPanel`'s analogous amber/green wait indicator. Minor visual-polish inconsistency.
- [x] [Review][Defer] `ConvergenceDecisionStrip.tsx`'s rewritten override-refile paragraph (RF16's correct reword) reads as a dense double-em-dash sentence, a readability regression from the two clearer sentences it replaced. Subjective copy-quality nit, not a correctness issue.
- [x] [Review][Defer] `HelplineAppeal`'s eligibility vocabulary (`can_appeal`/`under_appeal`/`time_limit_passed`/`already_appealed`/`not_appealable`) and `SignalsPanel`'s kept-apart appeal vocabulary (`not_filed`/`time_limit_passed`/`open`/`upheld_final`) describe genuinely different things (this claim's own filing eligibility vs. another claim's appeal position) but read as confusingly similar at a glance; a naming/documentation clarity candidate, not a functional defect.

#### Chunk 4 (`apps/mobile`, final chunk) — 2026-10-08

⚠ Same three layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor all independently converged on the same lead finding below — strong corroboration). 19 raw findings → 2 patch, 1 defer, 12 dismissed (several dismissals confirmed the new `closed-helpline.tsx` screen is a deliberate, line-for-line structural mirror of the pre-existing `refile-helpline.tsx` precedent — the "double accessibility announcement", the back button's double `t()` call, the "back" button actually being a hard `router.replace('/(tabs)')`, and the unused `ClosedHelplineCopyKey` export all match that precedent exactly, not defects unique to this diff).

- [x] [Review][Patch] `lib/appeal-status.ts`'s new `appeal_status: 'closed'` union member had NO behavioral guard anywhere in `deriveAppealView` — `showFileAffordance`/`showExhausted` were gated only on `can_initiate`/`appeal_exhausted`/`closed_no_response`, relying entirely on an UNENFORCED cross-field assumption (the server always sets `can_initiate: false` + `appeal_exhausted: false` when `appeal_status` is `'closed'`) instead of an explicit check, unlike the sibling `closed_no_response` field which IS defensively ANDed into both flags. The new test set `can_initiate: false` / `appeal_exhausted: false` in its base fixture, so it never isolated whether the new value did anything — it would have passed identically for any other non-`'open'`/non-`'reversed'` string. **Fixed** — added `&& status.appeal_status !== 'closed'` to both `showFileAffordance` and `showExhausted` (mirroring the `closed_no_response` guard exactly); rewrote the test to set `can_initiate: true, appeal_exhausted: true` (the "wrong" values) alongside `appeal_status: 'closed'`, proving the guard actively overrides them. Red-checked: reverting the guard made the test fail as expected (`showFileAffordance`/`showExhausted`/`showExternalRemedy` all flipped to `true`), restoring made it pass. Verified: typecheck clean; full mobile suite (676 tests, 45 files) passes.
- [x] [Review][Patch] `closed-copy-resolves.test.ts`'s banned-word regex was asymmetric between locales — English blocked 7 concept-families (suspicion/fraud/changed/nominee/appeal/refused/"after the death"), Hindi only 4 (no Hindi check for "changed", "refused", or "after the death") — weakening AC8's "no member-facing string..." guarantee in Hindi specifically. **Fixed** — added the missing three Hindi term-families to the regex (refined to the shared stem `अस्वीक` in the follow-up adversarial pass below — see there), confirmed to still pass against the actual (clean) Hindi copy.
- [x] [Review][Defer] `appeal-status.ts`'s `'closed'` value produces the same observable output as the pre-existing `null` value (now that it's properly guarded) — the diff doesn't document why a distinct enum member earns its own case rather than reusing `null`. A reasonable design choice (letting the two situations — "no journey ever" vs. "a journey existed, then the claim was closed out from under it" — diverge later without a breaking type change), but worth a one-line comment explaining the rationale.

#### Second pass — adversarial review of the 12 applied patches themselves (2026-10-08)

⚠ On request. One Blind-Hunter-style agent, WITH full repo context this time (judging a fix's correctness requires knowing what it fixed) rather than blind, reviewing the diff of the patches only (not the original story diff again). It found 6 issues; after verifying each against the actual code, 4 were real and fixed, 2 were addressed with a lighter touch (a comment, a narrowed test) given low severity.

- [x] [Review][Patch] `HelplineAppeal.tsx`'s own fix (the chunk-3 patch above) only protected the LAST claim filed. `file` is ONE `useMutation()` shared by the whole list, so `file.variables`/`.isSuccess`/`.isError` reflect only the most recent `.mutate()` call — filing claim A then claim B flips `file.variables` to B, silently un-disabling claim A's button and erasing its "filed" confirmation (the exact duplicate-POST window the chunk-3 fix claimed to close, reopened for A). The pre-existing error-display block had the identical flaw, untouched by that fix. **Fixed** — replaced the `file.isSuccess`/`.isError` reads with a local per-claim outcome map (`filingOutcomes`, a `Record<claimCaseId, outcome>`), set from each `.mutate()` call's OWN `onSuccess`/`onError` callbacks (bound to that call's claim id, never read off the shared `file` object). Added two tests filing two different claims in sequence, proving each one's outcome survives the other's. Red-checked: reverted to the old shared-state reads, watched both new tests fail for the right reason, restored.
- [x] [Review][Patch] `nominee-errors.ts`'s `reasonLockedMessage` (the chunk-3 patch above) fell back to an empty string when the server didn't supply `held_claim_reference`, producing a grammatically broken message ("...while claim  for this death...") — unlike every sibling function in the file, which falls back to a complete, valid default. **Fixed** — the i18n template's placeholder is now `{held}` (not a bare `{reference}` spliced after a hardcoded "claim"), and the function supplies the whole phrase: `"claim <reference>"` when present, `"another claim"` otherwise. Added a fallback-case test; red-checked against the old empty-splice behavior.
- [x] [Review][Patch] `closed-copy-resolves.test.ts`'s new Hindi term for "refused" (`अस्वीकृत`, from the chunk-4 patch above) doesn't match this app's OWN production vocabulary for the concept in this exact namespace (`अस्वीकार` — `claim.json`'s `certificate.not_refused` / `nominee.bank.correction_needed_staff`); the two words diverge after a shared prefix, so a real leak of the term this codebase actually uses would NOT have been caught. **Fixed** — narrowed to the shared stem `अस्वीक`, which matches both inflections.
- [x] [Review][Patch] `suspicion-refusal-helpline-appeal.test.tsx`'s new retry-button test (the chunk-3 patch above) never asserted the button's `disabled` state — the specific behavior that patch added. Attempted to test it directly; discovered the retry-while-cached-data-exists state this guard is actually for isn't reachable in this harness's `createQueryClient()` (`gcTime: 0`, and `renderWithClient` doesn't expose the `QueryClient` to force it) — a first-load failure (no cached data) goes straight through the `isLoading` branch on retry, hiding the button entirely before it could render disabled. **Addressed with a comment** on the existing test explaining exactly this, rather than a misleading or flaky assertion.
- [x] [Review][Defer] `suspicion-refusal.spec.ts`'s new AC2-order fixture (the chunk-1 patch above) inlines ~20 lines that already exist as a documented, reusable pattern in `approval-warnings-every-approver.spec.ts` (`determine`/redetermine, tagged RD19) instead of importing or extracting it. Safe here only because this gate path has no contact-check conjunct — incidental to this test, not a property it guards. **Addressed with a comment** flagging the inlining and the precondition that makes it safe, rather than a cross-file extraction out of proportion to the finding.
- Dismissed (correct and complete on inspection, no action): the `chain`-reuse fix in `appeal-eligibility.ts`/`appeal-persist.ts` (safe — `initiateAppeal` already holds the claim's row lock before either read); the contracts regex and lockstep-tuple fixes; the `SignalsPanel` testid fix (no other reference to the old shared testid exists anywhere in the repo); the parametrized `later-approval-warnings.test.tsx` fix; the mobile `appeal-status.ts` guard fix.


#### ROUND 2 — a fresh full re-review of `de2355a6..HEAD` (2026-10-08)

⚠ Scope: the whole 6.24a build plus round 1's fixes (105 files), in TWO chunks — `packages/` (4,325 diff lines) and `apps/` (2,339).
Blind Hunter + Edge Case Hunter + Acceptance Auditor per chunk, PARALLEL by BigDev's explicit instruction, all read-only; every
load-bearing claim re-checked at HEAD `6fc5dce0` before classifying. ~70 raw → 2 decision-needed, 20 patch (+ D1's ⇒ 21 — the count corrected in round 3), 8 defer, 22 dismissed.
⭐ The headline: three independent layers converged on ONE fact `-292` itself FOUND — *"nothing per-death stops a second approval"* —
and on RF6's closure being the only control in its place, with holes (D1, D2). Trap 9's *"unreachable under RF5 + RF7"* does ⛔ not hold.

- [x] [Review][Decision] ✅ **RESOLVED 2026-10-08 (BigDev: *"D1:1"*) by `2026-10-08-294` §1 — the reversal writers take the intake lock FIRST; now the patch below.** **D1 — RF6's closure misses a claim MINTED while the reversal's transaction is open** — `suspicion-refusal-persist.ts:134-145` lists the death's other claims ONCE, unlocked; the three reversal writers take `suspicion-reversal:` → `appeal:` → row, ⛔ never the intake lock (RF6 v1.1, verbatim: *"⛔ never the intake lock"*); `tryConverge` (`icp.ts:287` then `:122`) mints under the intake lock and, while S still stands in its snapshot, excludes S (RF2). ⇒ T1 reversing S reads `others`; T2 mints R′ and commits; T1 commits ⇒ S `reversed`, R′ live, ⛔ never held (S no longer stands) and ⛔ never closed ⇒ both reach payment. RF13 closed exactly this race for the revision path with the intake lock (`verifier-decision-persist.ts:600`); ⛔ no concurrency test covers reversal-vs-mint (`suspicion-refusal-concurrency.spec.ts` has RF15 a/b, RF6 two-reversals, RF13 revision-vs-mint). Fix is engineering (§0: ⛔ not the Panel's) but AMENDS committed RF6 text ⇒ needs an author-commit first. [blind + edge]
- [x] [Review][Decision] ✅ **RESOLVED 2026-10-08 (BigDev: *"D2:1"*) by `2026-10-08-294` §2–§3 — recorded (Trap 9 corrected) + row `6-28-one-payment-per-death-second-approval-guard` (`backlog`); ⛔ nothing built here.** **D2 — ⛔ No per-death second-approval guard; RF6 is the only control and three reachable paths pass it** — (a) a claim H reaches `state_trustee_approved` / `approved` / `settled` BEFORE another claim S of the death becomes a `-239` refusal — a FIRST `-239` denial by `adjudicateClaim` (only `assertPostDeathRefusalGrounded`), or a revision ONTO `-239` (RF13 locks only moves OFF) — then S is appealed and reversed: H is `notClosed` (`CLAIM_NOT_CLOSABLE_STATES`), only logged; the next commit approves H (S ⛔ no longer stands) and S re-enters approval ⇒ two payments. Requires two live claims of one death at once (filings >30 days apart — `CONVERGENCE_WINDOW_DAYS` — or an override-apart); the AC4 leg 2 test shows the shape with T created directly. (b) After RF6 closes H, ANY new filing for the death once S is >30 days old (near-certain after refusal + refile + appeal) MINTS H2 (`getConvergenceCandidate`'s window; `assertRefileAllowed` passes — *"the death re-files freely"*); H2 is ⛔ never held (S does ⛔ not stand) ⇒ H2 and S both payable. The only guard is the mobile routing bit, and an offline/failed read falls through to the wizard (`claim-entry-gate.ts:57-59`). (c) RF7's commit re-check reads WITHOUT RF15's key (`state-trustee-decision-persist.ts:1329`), so at the 90-day boundary an initiation holding the key can commit its anchor after the commit judged `time_limit_passed` ⇒ H `approved`, then S's appeal opens — reachable only through (a). ⚠ The ROOT predates 6.24a (a non-`-239` denial has ⛔ no appeal time limit, 6.16 D-E, and its reversal beside an approved refile is the same two payments); 6.24a's records claim it unreachable. ⚠ MIXED (§0): what the code can refuse is BigDev's; *which family is paid when both claims qualify* is the Panel's. [blind + edge ×2]
- [x] [Review][Patch] **HIGH — (D1 → `-294` §1) the three reversal writers take the death's INTAKE key FIRST, immediately before `suspicion-reversal:`, inside `acquireSuspicionReversalLockForClaim`; a two-connection test: a reversal and a mint for one death in flight together ⇒ the minted claim is CLOSED or joins the reversed claim, ⛔ never live beside it** [`packages/domain/src/claim/suspicion-refusal-persist.ts:81-93`; `packages/domain/tests/integration/claim/suspicion-refusal-concurrency.spec.ts`] — **Fixed** after `-294` was committed ALONE (`2dd7b7b3`): `acquireSuspicionReversalLockForClaim` takes `intakeAdvisoryLockKey` (`icp-lock.ts`, a leaf — ⛔ no import cycle) immediately before `suspicion-reversal:`; two new two-connection legs — (a) the mint holds the key ⇒ the reversal waits, then CLOSES the minted claim; (b) the reversal holds it ⇒ the filing waits, then JOINS the reversed claim (⛔ no second claim). Both red-checked (the key line removed ⇒ both red). The two stale *"unreachable"* comments (the closure's header, `heldClaimsAuditContext`) and the helper's *"⛔ Never the intake lock"* corrected to `-294`.
- [x] [Review][Patch] **AC2's "a claim failing BOTH answers the suspicion 409" leg was never built** — the order *"before the late-warning wait"* is unpinned (moving the conjunct after `assertLateWarningsCovered`, `nominee-name-check.ts:431`, stays green); round 1 fixed only the late-wait-only leg [`packages/domain/tests/integration/claim/suspicion-refusal.spec.ts:554-610`] — **Fixed** — the ORDER test adds a `-239` refusal to the late-warning claim's death and expects `appeal_not_filed`; red-checked (conjunct moved after the late wait ⇒ red).
- [x] [Review][Patch] **Migration 0150 has ⛔ no catalog assertion (family 5 REAL GAP)** — add an `enum_range` / `pg_enum` check that `closed` labels both `claim_lifecycle_state` and `appeal_journey_status` (the 6.18 precedent `nominee-name-check-migration.spec.ts:45-89`) [`packages/domain/migrations/0150_claim-closed-enum-values.sql`] — **Fixed** — `suspicion-refusal.spec.ts` AC3: `closed` on EXACTLY `appeal_journey_status` + `claim_lifecycle_state` (pg_enum ⋈ pg_type).
- [x] [Review][Patch] **RF14's "a test per non-`-239` reason family past 90 days" drives only `other`** — add `concealment_flag_uphold` (`verifier-decision.ts:70`) [`suspicion-refusal.spec.ts:640`] — **Fixed** — `['other', 'concealment_flag_uphold']` (the fixture's `SuspicionReason` widened).
- [x] [Review][Patch] **RF13's "a SETTLED other claim locks it too" leg drives `approved`** — emit `claim.settled` so the leg it names runs [`suspicion-refusal.spec.ts:677-681`] — **Fixed** — `claim.settled` projected (with its required `deceased_member_id`); the state asserted `settled`.
- [x] [Review][Patch] **"⛔ nothing leaves `closed`" checks 5 hand-picked events** — iterate every `CLAIM_EVENT_TYPES` entry through the reducer (family 1) [`packages/domain/tests/claim/suspicion-refusal.test.ts:141`] — **Fixed** — every `CLAIM_EVENT_TYPES` entry × six payload shapes the reducer branches on.
- [x] [Review][Patch] **Contract mirrors loose** — `verifier-console.ts` `appealUntil: z.string()` → the calendar-date shape round 1 used in `appeal.ts`; `appeal` / `finalApprovalWaits` enums hand-copied with ⛔ no lockstep test vs the domain; `HelplineAppealClaimsResponse.claim_state: z.string()` → `ClaimLifecycleState` [`packages/contracts/src/claims/verifier-console.ts:448-455`, `packages/contracts/src/claims/appeal.ts:~71`] — **Fixed** — `SUSPICION_REFUSAL_APPEAL_POSITIONS` / `SUSPICION_APPEAL_WAIT_REASONS` exported (contracts) with a LOCKSTEP test vs the domain (`claim.SUSPICION_REFUSAL_APPEAL_POSITIONS` — a new `as const` tuple the domain type now derives from — and `SUSPICION_APPEAL_PENDING_REASONS`); `appealUntil` a calendar date; the helpline row's `claim_state` a `ClaimLifecycleState` (`appeal.ts` imports `filing.ts` — ⛔ no cycle: `filing.ts` imports only zod).
- [x] [Review][Patch] **Family 9 — the actor-free cores' DELIBERATE blocks carry a rationale but ⛔ no re-examination trigger** [`appeal-panel-session.ts:44-52`, `r9-voting-persist.ts:810-819`, `suspicion-refusal-persist.ts:1-22`] — **Fixed** — a `⚠ DELIBERATE (checklist family 9)` block with its ⭐ re-examination trigger on `supersedeAppealPanelSession`, `supersedeR9VotingSession` and the closure's header.
- [x] [Review][Patch] **Family 11 — policy sentences missing / understated** — P1/P2 say "a new claim" while RF3 holds and closes EVERY other claim of the death (one predating the refusal included); RF8 (a reversed refusal's visit is ⛔ no longer inherited) and RF4's refile effect (a `closed` claim lets the death re-file freely) have ⛔ no member-terms sentence checked against the Niyamavali — record them here (the committed P/RF text is ⛔ not edited) [story `## 📜 Policy meaning`] — **Fixed (recorded here; the committed P/RF text is ⛔ not edited).** Checked 2026-10-08 against the Niyamavali (agent-drafted, ⛔ not ratified): §6.2 (verification) and Part 9 (the three-stage appeal) are silent on a second claim for one death and on the ground inspection ⇒ ⛔ no clause engaged. ⭐ **P1′ (RF3 + RF5, the true scope):** *"While one claim for a member's death stands refused because the nominee was changed on or after the death, and that refusal can still be appealed or is under appeal, ⛔ no other claim for the same death — filed before it or after it — can be finally approved."* ⭐ **P2′ (RF3 + RF6):** *"If that refusal is overturned on appeal, every other claim for the same death that has ⛔ not yet been finally approved is closed."* ⭐ **P8 (RF8):** *"A later claim may rely on the refused claim's ground inspection only while that refusal stands; once it is overturned on appeal, or that claim is closed, the later claim needs an inspection of its own."* ⭐ **P9 (RF4's refile effect):** *"A family whose claim was closed this way may file again — and, as `-294` §2 (b) records, ⛔ nothing yet holds that new filing beside the overturned claim (row `6-28-…`)."*
- [x] [Review][Patch] **Two tests can flake across 00:00 IST** — the expected date is recomputed from a second `new Date()` instead of the fixture's [`suspicion-refusal.spec.ts:626-635`; `apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts:359`] — **Fixed** — one instant per test for the seed and the expectation (the boundary pair, the helpline read, and the console read at `:477` — a third the review missed).
- [x] [Review][Patch] **HIGH — `HelplineAppeal`'s per-claim outcome map (round 1's adversarial-pass fix) relies on per-`mutate` callbacks, which TanStack v5 fires for the LATEST call only** — file A, then B before A settles ⇒ A's `onSuccess` never runs, A's button re-enables while A's POST is in flight, a second click answers "could not be filed just now" for a claim that WAS filed. Use `mutateAsync(id).then/catch` (per-call promises) [`apps/admin/src/modules/helpline-claims/HelplineAppeal.tsx:114-121`] — **Fixed** — per-claim `pending` / `success` / `error` from each call's OWN `mutateAsync` promise; a new test files B before A settles; red-checked against HEAD's file (red).
- [x] [Review][Patch] **The console says "its appeal is decided" for a refusal NEVER appealed whose time ran out** — `noWait` renders under "the time to appeal it ended on …"; give `time_limit_passed` its own line [`apps/admin/src/modules/claim-verification/i18n-en.ts:690`, `SignalsPanel.tsx:66`] [blind + edge + auditor] — **Fixed** — `noWait` = *"…it can no longer be appealed"* (true of BOTH no-wait positions); a `time_limit_passed` test.
- [x] [Review][Patch] **RF16's strip note says a refile "never joins" the refused claim — false once the refusal is reversed (P3)** — scope it "while that refusal stands"; update the test's pin [`apps/admin/src/modules/helpline-claims/ConvergenceDecisionStrip.tsx:228`] [blind + auditor] — **Fixed** — scoped *"While a claim stands refused…"* + *"Once that refusal is overturned on appeal, a new filing joins the overturned claim as before"* (P3's words); the test pins both and ⛔ `always kept`.
- [x] [Review][Patch] **A `closed` claim's certificate notice shows the UPLOAD-themed helpline button** ("If you can't upload it, call the helpline…" — `HELPLINE_LABEL_KEY` via `withLabels`) and its title repeats the body's first sentence; the closed screen announces that sentence twice — label the CTA `closed.call`, drop the duplicate [`apps/mobile/lib/death-certificate-view.ts:169-170,123`; `apps/mobile/app/(claim)/closed-helpline.tsx:27,32`] — **Fixed** — `closed` ⇒ ⛔ no title, CTA `closed.call` (a per-status `helplineLabel` in `withLabels`); the screen announces/labels the BODY once; tests pinned.
- [x] [Review][Patch] **`includeClosed: true` also feeds the helpline CONTACT card** — one live + one closed claim loses the lone auto-pick; a closed-only member auto-picks the closed claim (the write then 409s) — filter `closed` out in the contact card [`apps/admin/src/modules/helpline-claims/HelplineClaimContact.tsx:72`; `apps/api/src/modules/claims/claims.death-certificate.handlers.ts:376`] — **Fixed** — the contact card filters `closed`; a test (one live + one closed ⇒ the live claim auto-picked, ⛔ no presence read for the closed one).
- [x] [Review][Patch] **Filing an appeal invalidates only the appeal list** — the certificate / contact cards keep showing the claim `denied`; also invalidate the member's certificate-claims key [`apps/admin/src/api/hooks.ts:2224-2231`] — **Fixed** — also invalidates `deathCertificateClaimsForMemberKey`.
- [x] [Review][Patch] **RF6's `notClosed` → error log + `held_claims_not_closed` audit field is untested at the API (family 8)** [`apps/api/src/modules/claims/claims.appeal.handlers.ts:202-218`] — **Fixed** — an HTTP leg: H past its vote, S refused, filed and REVERSED at stage 1 ⇒ the `admin_appeal.stage1` line carries `held_claims_not_closed`; red-checked (spread removed ⇒ red). ⚠ The error-level LOG line is ⛔ not asserted (no log capture in this harness).
- [x] [Review][Patch] **AC2 names the Super Admin's `-251` waived approve; no wait test drives it** (it reaches the conjunct by construction — `nominee-name-check.ts:433-435` after the waiver's early return) [`suspicion-refusal-routes.spec.ts`] — **Fixed** — at the domain (`assertClaimApprovable` with `nameCheck: 'waived_251'`, `step: 'final'` ⇒ `appeal_not_filed`); ⛔ not over HTTP (the declined-closure fixture is out of proportion for a conjunct reached by construction).
- [x] [Review][Patch] **The new `GET …/members/{m}/appeals` has ⛔ no cross-Pariwar denial test (family 3)** [`apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts:349-369`] — **Fixed** — an operator of ANOTHER Pariwar: the read and the filing both refused (401/403/404), ⛔ no `claim_appeals` row, S still `denied`.
- [x] [Review][Patch] **Admin copy fallbacks** — `suspicionAppealPendingMessage` falls back to `appeal_open` (asserts an appeal exists) — use neutral words; `'another claim'` is hard-coded outside `verifierConsoleEn`; `as Record<string, string>` casts drop exhaustiveness on `appeal` / `waits` / `approvalGate` [`apps/admin/src/modules/claim-verification/nominee-errors.ts:61,72`; `i18n-en.ts:680-686`] — **Fixed** — an unknown/missing reason ⇒ `approvalGateUnknown` (neutral); `anotherClaim` in the copy table; `satisfies Record<…>` over the contract's own unions (⛔ `as Record<string, string>`).
- [x] [Review][Patch] **"Your approval as District Admin does not wait for it" renders to every console viewer** (a Super Admin included) — third person [`apps/admin/src/modules/claim-verification/i18n-en.ts:691`] — **Fixed** — *"The District Admin's approval does not wait for it."*
- [x] [Review][Defer] Member appeal-status `can_initiate` ignores RF14 (true past 90 days; the POST then 409s) [`apps/api/src/modules/claims/claims.appeal.handlers.ts:371`] — deferred, latent: the member appeal routes 404 for every production claim and `AppealStatusCard` is mounted nowhere (RF14 v1.3's own finding)
- [x] [Review][Defer] The cycle commit's RF7 skip-and-keep shows ⛔ no reason in the UI [`apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx:318`] — deferred: RF7 specifies no surface
- [x] [Review][Defer] "An earlier claim" wording where RF3 sets ⛔ no order [`apps/api/src/modules/claims/suspicion-appeal-pending-message.ts:13,15`; `i18n-en.ts:677,678,696,698`] — deferred: the console line copies RF10/P1's own words; a spec-level wording tension
- [x] [Review][Defer] The appeal date is read to the family as raw `YYYY-MM-DD` in en and hi [`apps/admin/src/modules/helpline-claims/HelplineAppeal.tsx:84-91`] — deferred: rides the pending Hindi human review
- [x] [Review][Defer] The helpline filing refusal reads "could not be filed just now" for PERMANENT refusals (`already_exhausted`, `not_denied`, `closed_no_response`) [`HelplineAppeal.tsx:24-29`] — deferred: the list refetch corrects the row
- [x] [Review][Defer] "An anchor is `closed` only on a `closed` claim" has ⛔ no DB backstop; a violation throws in `appealPositionOf` ⇒ a 500 at every final writer for the death and the whole commit batch [`packages/domain/src/claim/suspicion-refusal.ts:207-213`] — deferred: one writer today, in the same transaction as `claim.closed`
- [x] [Review][Defer] A `-239` refusal whose 90 days pass unappealed emits ⛔ no unfreeze event — its stream stays frozen [`packages/domain/src/member/overlay.ts:52`] — deferred, pre-existing for every denial (6.16 D-E)
- [x] [Review][Defer] The console-section test asserts `bump() === 1`, ⛔ not the statements Postgres receives (the 6.23a / 6.26a siblings count them) [`suspicion-refusal-routes.spec.ts:432-448`] — deferred: test hygiene
- Dismissed (22, each checked at HEAD): `closure.suspicion_appeal_pending` "unmapped" (the `closure.` prefix passes the server's words — `correction-closure/errors.ts:14`); the refused claim's device routed to the wizard (RF2 v1.1 by design); the operator line "Please call the helpline" (AC8 mandates these words in the read-back); a `closed` pointer always routing to the helpline (RF12 v1.3); the appeal page silent on `closed` (Task 3.0(c)); the reversal/commit lock order (no cycle — traced by two layers); the commit's inspection re-check on every candidate (RF7; ⛔ not in production — no pre-6.26a claims); `endLiveProcesses`' residuals and pending nominee corrections (recorded residuals (a)–(d)); the anchor-status coupling (writers checked: stage 1/2 → reversed|next, stage 3 → reversed|denied+`upheld_final`); `actor: 'system'` (a recorded deviation); the 50/10 caps; RF15's unconditional key (RF15 says so); `claim_closed` beside `status` (round 1); `isClaimClosable(string)`; test (f)'s swallowed error (RF8 pinned by AC4); `[s].filter(Boolean)`; the family-status pin (exists, `death-certificate-family-status.test.ts:235`); orphaned pending attempts (recorded at `icp.ts`); the N+1 helpline read (round 1); `initiateAppeal`'s unreachable clock fallback; the audit message's "finally approved"; the `member_id` echo check.

#### ROUND 3 — narrow: round 2's fixes only, `6fc5dce0..HEAD` (2026-10-08)

⚠ Scope: `-294` (`2dd7b7b3`, no code) + the 21 fixes (`42ca4e07`) — 27 files, +395/−64, one chunk; the three layers in PARALLEL per BigDev,
read-only. ⭐ The Auditor VERIFIED all 21 round-2 patches against their *"Fixed"* notes (two PARTIAL — the midnight site at `:685`, one
payload shape) and `-294` §1's lock exactly; the Edge Case Hunter traced every intake-key taker repo-wide — ⛔ no cycle. ~40 raw →
0 decision-needed, 12 patch, 4 defer, 14 dismissed. ⛔ No HIGH ⇒ by the 6.26b precedent, rounds stop here.

- [x] [Review][Patch] **MEDIUM — the new docblock and strip copy say a filing after a reversal JOINS the overturned claim; outside the 30-day convergence window it MINTS beside it** (`-294` §2 (b), row `6-28-…`) — state the window in the helper's docblock, the race test (b)'s comment, and the operator note [`packages/domain/src/claim/suspicion-refusal-persist.ts:96-100`; `apps/admin/src/modules/helpline-claims/ConvergenceDecisionStrip.tsx:102-105`; `suspicion-refusal-concurrency.spec.ts:833`] — **Fixed** — the helper's docblock, race leg (b)'s comment and the spec header state the 30-day window; the operator note adds *"— but only while that claim is less than 30 days old; a later filing becomes a separate claim"* (test pinned).
- [x] [Review][Patch] **The lock-order comment states the wrong property** — the reversal writer itself holds the intake key and then waits on reversal / `appeal:` keys and rows; the property that makes it safe is the REVERSE (⛔ nobody holding a claim row or an `appeal:` / `r9:` / trustee / `suspicion-*` key then asks for the intake key). Also the three call sites still say *"the reversal key FIRST"*, and the new key bypasses the file's own `takeKey` [`suspicion-refusal-persist.ts:96-116`; `appeal-persist.ts:373,465`; `appeal-panel-persist.ts:510-511`] — **Fixed** — the docblock states the REVERSE property (⛔ nobody holding a claim row or a claim / `suspicion-*` key then asks for the intake key) and lists every taker; the three call sites name the intake key; the key goes through `takeKey`; the file header's merged line re-wrapped and names both mint paths.
- [x] [Review][Patch] **The cross-Pariwar test has ⛔ no positive control** — a 401 from a broken session would pass it; assert the same operator reads its OWN Pariwar's route (200) [`apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts:371-383`] — **Fixed** — the same session first reads its OWN Pariwar's route (200).
- [x] [Review][Patch] **`appeal_until` is now expected through the server's own helper** — an off-by-one in `suspicionRefusalAppealUntil` shifts both sides; compute the expectation independently (`addCalendarDays(istDateOf(at), 90)`) from the same fixed instant [`suspicion-refusal-routes.spec.ts:349,422`] — **Fixed** — both expectations are `addCalendarDays(istDateOf(at), 90)` from the fixed instant.
- [x] [Review][Patch] **"A click on a disabled button files nothing" is counted synchronously** — an extra `mutateAsync` would land after the assertion; flush before counting (the new test and round 1's) [`apps/admin/tests/suspicion-refusal-helpline-appeal.test.tsx:110,250`] — **Fixed** — `settleQueuedWork()` (an `act`-wrapped 20 ms) before both counts; red-checked (the `disabled` guard removed ⇒ red).
- [x] [Review][Patch] **Two doc comments orphaned by the new tuples** — `SuspicionRefusalSection`'s JSDoc now attaches to `SUSPICION_REFUSAL_APPEAL_POSITIONS`; `SuspicionRefusalAppealPosition`'s to the domain tuple [`packages/contracts/src/claims/verifier-console.ts:433-442`; `packages/domain/src/claim/suspicion-refusal.ts:136-138`] — **Fixed** — the contracts tuples moved above the section's JSDoc; the domain tuple has its own line and the type keeps its doc.
- [x] [Review][Patch] **Midnight IST — one site missed and one overclaimed** — `refusedOn` vs a later `new Date()` (`:685`); the boundary pair's comment says "fixed" while `openAppeal` judges with the server clock (narrowed, ⛔ not removed) [`packages/domain/tests/integration/claim/suspicion-refusal.spec.ts:652-662,685`] — **Fixed** — `:685` accepts either IST date bracketing the revision; the boundary pair's comment says NARROWED, ⛔ not removed (the server clock).
- [x] [Review][Patch] **`HelplineAppeal` — an `error` outcome stays beside a row the refetch shows `under_appeal`; the map is ⛔ never reset on a member switch** (A → B → A brings A's old alerts back); and the `mutateAsync` chain floats (⛔ `void`) [`apps/admin/src/modules/helpline-claims/HelplineAppeal.tsx:95-99,136-160`] — **Fixed** — a refusal shows only while the row is `can_appeal`; the map clears on a member switch and a call in flight for the previous member ⛔ never writes into the new map (`memberRef`); `void` on the chain; two tests, red-checked against round 2's file (both red).
- [x] [Review][Patch] **The 0150 test says "EXACTLY" but filters to the two types** — it proves presence on both, ⛔ not absence elsewhere (other enums legitimately carry `closed`); reword [`suspicion-refusal.spec.ts:280-290`] — **Fixed** — *"BOTH"*, and the comment says presence, ⛔ not absence.
- [x] [Review][Patch] **"Nothing leaves `closed`" omits `{ decision: 'advance' }`** [`packages/domain/tests/claim/suspicion-refusal.test.ts:143`] — **Fixed**.
- [x] [Review][Patch] **Round 2's header says "20 patch"; it was 21** [this file, ROUND 2 header] — **Fixed** — *"20 patch (+ D1's ⇒ 21 — the count corrected in round 3)"*.
- [x] [Review][Patch] **The family-11 sentences (P1′/P2′/P8/P9) have ⛔ no pointer from `## 📜 Policy meaning`** — add a dated pointer line (the P text itself is ⛔ not edited) [this file, `## 📜 Policy meaning`] — **Fixed** — a dated pointer line closes `## 📜 Policy meaning`.
- [x] [Review][Defer] The two-connection race tests leave their transactions open when an assertion fails before `commit()` (⛔ `try/finally`) [`suspicion-refusal-concurrency.spec.ts`, every leg] — deferred: inherited from the file's earlier legs; a hang instead of a clean failure, ⛔ never a wrong pass
- [x] [Review][Defer] `HelplineClaimContact` silently falls to the lone live claim when the operator's pick is closed by a concurrent reversal [`apps/admin/src/modules/helpline-claims/HelplineClaimContact.tsx:76-81`] — deferred: the reset clears typed data, so ⛔ nothing is written to a claim the operator did not see
- [x] [Review][Defer] The closed SCREEN still shows its title above a body whose first sentence is the title (the notice dropped its title; the screen kept it for the heading) [`apps/mobile/app/(claim)/closed-helpline.tsx`] — deferred: AC8 fixes the body's words; the heading is the screen's own
- [x] [Review][Defer] The appeal filing's extra cache invalidation (round 2) has ⛔ no test [`apps/admin/src/api/hooks.ts:2232`] — deferred: a one-line invalidation; its "Fixed" note claimed none
- Dismissed (14, each checked at HEAD): a contracts import cycle (`filing.ts` imports only zod); `closed.call` unresolved (`closed-copy-resolves` resolves every `CLOSED_HELPLINE_COPY` key in en + hi); the contact card's stale `picked` (`chosen` falls back); every reversal now queuing behind intakes (`-294` §1's stated cost); a no-op finalize taking the intake key (same); `helplineLabel?: string` untyped; the concealment fixture's realism (the guard reads only the decision row); the six-payload list beyond `advance` (⛔ no reducer branch leaves `closed`); the source-text accessibility test (the house pattern — mobile has ⛔ no render harness); a forward pointer inside `-292` RF6 (committed entries are ⛔ never edited — `-294` cites it); the strip's *"as before"* beyond the window (folded into the MEDIUM); the legal-review gate on the cross-Pariwar filing (on-behalf initiation is ⛔ not D-G-gated — the helpline test files 201 without it); `BLOCKED_MS` timing (the house race pattern, red-checked); a stale outcome crossing members (claim ids are per-death UUIDs).

### Traps
1. **Building D4 B in `tryConverge`'s branches instead of the candidate** — (3b) would still swallow. Fix the candidate; both mirrors.
2. **Reading the refusal without the appeal anchor** — a reversed claim still has its live `-239` row (F3). Always RF1.
3. **A `created_at` ordering for "the refile"** — the inheritance orders by claim creation, ⛔ not refusal time; RF3 deliberately has ⛔ no
   ordering for the wait / closure. Don't add one.
4. **Holding the District Admin** — `step` exists so P1 is ⛔ never held. A test pins it.
5. **Placing the conjunct LAST** — the late-warning wait stays last (6.23b EA2); the existing late-wait specs pin its 409.
6. **Using `'closed'` in the migration that adds it** — Drizzle applies all pending files in ONE transaction; `ADD VALUE` can't be used in the
   same transaction (55P04). 0150 is the `ALTER TYPE` alone; ⛔ no CHECK, index or default in 0150 names `'closed'` (nor 6.24b's later migration, unless it runs in a later transaction — it does).
7. **Writing a 6.19c closures row, `state_trustee_denied` or `denied_no_appeal` for "closed"** — forbidden (Fact 5); it would make the refile
   a refusal and arm the refile guard.
8. **A lock cycle.** Reversal: refused S → held R. ⛔ Nothing may lock R then S: the gate and the commit only READ S's decision and anchor
   (plain `SELECT`, ⛔ never `FOR SHARE`). RF15's per-death appeal key (built, `-291` Q1 A) is taken AFTER the caller's own locks and its holder never waits on a
   claim lock; ⛔ never reuse `acquireIntakeLock` (`tryConverge` holds it and can insert against R — an FK `KEY SHARE`).
9. **A held claim already past `state_trustee_approved` when S is reversed** — unreachable on the normal path (it could ⛔ not pass the
   vote while S's refusal stood and its 90 days ran or its appeal was open — `-291` Q1 A); reachable only through a revision ONTO `-239`
   after R's vote (F3), which RF7 holds at the commit. RF6 records it, ⛔ never moves an approved/settled claim.
   ⚠ **CORRECTED by `2026-10-08-294` §2 (code review round 2):** *"unreachable on the normal path"* does ⛔ not hold — H voted BEFORE S
   becomes `-239` (a first `-239` denial or a revision ONTO it), then S reversed ⇒ H `notClosed` and approved at the next commit beside S;
   and a filing after the closure outside the 30-day window mints an unheld claim. Carried by row `6-28-one-payment-per-death-second-approval-guard`.
10.–14. → Story 6.24b (the filing code and the texts).
15. **Closing R but leaving its processes running** — the 6.19b sweep never reads the state; Task 3.0's enumeration is the guard.
16. **Judging the 90 days with the transaction's `now()`** — `now()` is the transaction START; a transaction that waited on RF15's key would
    judge the limit at a stale instant and let an appeal in after the held claim was approved. Read `clock_timestamp()` AFTER the key, on
    both sides.
17. **A closed claim that still "stands"** — RF1's `current_state <> 'closed'` leg; without it a closed second refusal holds S for ever.
18. **A pin weakened instead of re-derived** — F7 / F8 specs are AMENDED to the new rule with their purpose intact; record each.
19. **A forced state in a live spec** — `projectClaimState` replays events; drive appeal stages through the real writers.
20. **JSDoc closed by Markdown** — `**cl.3**/**…` contains `**/`; grep `\*\*/` after any doc-block edit ([[project_markdown_emphasis_closes_jsdoc]]).

### Testing
- **Domain unit:** `suspicionAppealWaitState` table; the state-transition table for `claim.closed` (every CLOSABLE from-state; the five
  non-closable refused); NW1 import scan green; event-count pins 36.
- **Domain live-DB (RLS, `setupLiveDb`):** AC1 matrix, AC3 per stage, AC4, AC5; ordering-sensitive legs in their own committed transactions.
- **API live-DB:** five final-route 409s; console section (AC6 → 6.24b); the convergence handlers' D4 behaviour over HTTP (one member-app same-channel
  refile spec — the F1 swallow).
- **Jobs:** the commit re-check (RF7) only (AC7's texts → 6.24b).
- **Admin / mobile / contracts / i18n / microcopy:** the new words, maps, lockstep tests.
- **Gate:** `pnpm ci:local` with `DATABASE_URL` at :5433; migrations on both DBs.

### Previous-story intelligence (6.26a / 6.26b / 6.23b / 6.20 / 6.19b–c)
- A new gate conjunct breaks approve-path fixtures — here only two-claims-per-death fixtures (4.3). Map every new typed error at every
  translator, or it is a 500. One HTTP test per approval route.
- Ordering assertions (an approval vs a later event) need SEPARATE committed transactions; inside one BEGIN/ROLLBACK every `now()` ties.
- An exclusion rule must be re-judged at EVERY reader (candidate, strip, merge, backstop; gate, commit, console) — the 6.26b footgun.
- Migrations: hand-authored, journal idx + `when`, both DBs, CHECKs verified by name; `ADD VALUE` alone.
- 6.19b's SMS path: commit the pending row under the claim lock, then decrypt + send + compare-and-set; fail closed on a missing template.
- `pnpm ci:local` was 34/34 for 6.26a and 6.26b — a red after an FK is the story's ([[project_fk_truncate_cascade_deadlock]]).

### Libraries
⛔ No new dependency. Drizzle + raw `sql` fragments, pg advisory locks, vitest, the existing DLT SMS provider.

### Project context
[[project_not_in_production_merge_is_not_golive]] (FQ7's counsel gate is a go-live record, ⛔ not a merge fence) ·
[[project_enum_mint_authority_delegated]] (a lifecycle STATE is ⛔ not a tracking enum — `closed` is recorded in the author-commit, ⛔ never minted
under `-210`) · [[project_contracts_domain_bundle_boundary]] · [[project_type_only_import_cycle_trap]] · [[project_prettier_not_enforced]].

### References
- `.decision-log.md`: `-239` (b)(c) · `-261` C3, D4 + reading · `-262` FQ5–FQ7 + readings + *"does NOT cover"* + Consequence 2 · `-264` FQ13,
  Consequence 3 · `-277` Consequence 2 · `-282` GI1, GI2, Consequence 4 · `-285` · `-253` M · `-181` · `2026-10-07-291` Q1 A, Q2 B, its
  readings and Consequences.
- Routing notes: `trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ5 rider scenario, round 2; FQ6/FQ7 gaps) ·
  `trustee-panel-routing-note-2026-10-07-6-24-appeal-never-filed.md` (Q1, Q2 — ✅ ruled `-291`).
- Story files: `6-20-…` (D14, D16, D17, T8/P2, T17, AC13) · `6-26-…` (GI1–GI3, Fact 3, Task 0.1) · `6-26b-…` (AC8, `-290`) · `6-23b-…` (EA2,
  Trap 9) · `6-19c-…` (the refile guard, its *"6-24"* notes) · `6-19b-…` (the SMS path) · `6-16-…` (D-E, D-F, the appeal writers).
- `deferred-work.md`: *"An inherited visit that vanishes after the final vote is ⛔ not re-checked at the cycle commit"* · *"`-239` inheritance
  source: an appeal-overturned refusal is never superseded…"* · the two-live-claims residual (6.20's correction-visibility item).
- `docs/legal/niyamavali.md` Part 9, §8.8 · `docs/launch-gate-inventory/inventory-roster.md` (Rows 18–21) · `dlt-template-requests-6-19.md`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `claude-opus-5-5[1m]`, `bmad-dev-story 6.24a`, 2026-10-08.

### Debug Log References

**Task 0.1 (at the build).** `git fetch origin`; `6bb79afd` IS an ancestor of HEAD; `git diff --name-only 6bb79afd..HEAD -- packages apps scripts` is EMPTY (origin/main = `6bb79afd`; HEAD = 17 governance-only commits) ⇒ every `file:NNN` cite was still exact. ⛔ No decision after `-290` touches the gate, convergence, the appeal, the handover OTP or rows 6-25 / 6-27 other than this story's own `-291` / `-292` / `-293`; rows `6-25` and `6-27` are `backlog` (⛔ not landed) ⇒ ⛔ no rebase owed.

**Task 2.3 — every caller of `getClaimByDeceasedMember`.** `apps/api/src/modules/claims/claims.service.ts:312` (`initiateIntake`'s `ClaimStreamConcurrencyError` backstop) — **same conjunct** (RF2 is now inside `getClaimByDeceasedMember` itself). `packages/domain/tests/integration/claim/claim-lifecycle.spec.ts:266-299` — **unchanged, because** its fixtures carry ⛔ `-239` refusal (the conjunct is vacuous there; the spec stays green). Every other hit is a COMMENT (`contracts/claims/helpline.ts:11`, `claim/errors.ts:459`, `claim/nominee-lock.ts:10`, `claim/icp.ts:6,97`, `nominee.handlers.ts:27`, `claims.service.ts:31`) — ⛔ no code.

**Task 3.0 (a) — every literal claim-state LIST** (`grep -rn "'settled'" …` + `grep -rn "'denied'" …` + `'reversed'` / `'appeal_stage_1'` across `packages/*/src`, `apps/*/src`, `apps/mobile/{lib,app}`, `packages/contracts/src`):
- `claim/read.ts` `CLAIM_TERMINAL_STATES` — **gains `closed`** (RF4).
- `claim/death-certificate-approval.ts` `FAMILY_STATUS_TERMINAL_STATES` (by-value twin) — **gains `closed`**; the family status gains a `closed` row (RF12).
- `claim/shepherd-assign-persist.ts` `SHEPHERD_ASSIGNMENT_BLOCKED_STATES` (blocklist) — **gains `closed`**.
- `claim/concealment-assessment-persist.ts` `CONCEALMENT_ASSESSMENT_BLOCKED_STATES` (blocklist) — **gains `closed`**.
- `claim/certificate-reminder-read.ts` `NEVER_REENTERS` — **gains `closed`** (⛔ nothing leaves it; a paused run of a closed claim drops off the list).
- `claim/state.ts` — the reducer's `claim.closed` case + `CLAIM_NOT_CLOSABLE_STATES` / `isClaimClosable` + the documentation transitions — **new**.
- `apps/admin/.../claim-verification/i18n-en.ts` `claimStateLabels` — **gains `closed`** (staff words).
- `contracts/claims/filing.ts` `ClaimLifecycleState` — **gains `closed`** (the lockstep test `contracts/tests/claims-filing.test.ts` stays green).
- ALLOWLISTS — **unchanged, because** an allowlist cannot admit a value it does not name: `review-window.ts` `CLAIM_REVIEW_WINDOW_STATES`, `approval-warnings-persist.ts:46`, `correction-queue-read.ts:57`, `cycle-freeze-read.ts:127`, `verifier-decision-persist.ts` `VERIFIER_DECISION_REVISABLE_STATES`, `errors.ts` `NOMINEE_BANK_COLLECTABLE_STATES` / `DPDPA_CONSENT_RECORDABLE_STATES`, `state.ts` `R9_OUTCOME_FROM_STATES`, the trustee `TRUSTEE_VOTABLE_STATES`, `claims.appeal.handlers.ts:623` `stageOfState` (stages only).
- `alert/*`, `pool/*`, `contribution/*` `'settled'` / `'closed'` — **unchanged, because** they are the ALERT / POOL lifecycles, ⛔ not the claim's.
- ⚠ FOUND: ⛔ no `Record<ClaimLifecycleState, …>` exists (validator M6 confirmed) — the typecheck forced ⛔ no list; only the mobile `death-certificate-view.ts` switch over the FAMILY status was forced (it gained `closed`).

**Task 3.0 (b) — every table with a live row keyed on a claim, and how RF6 treats it** (an Explore pass + re-reading each cited writer):
- `claim_appeals` (`status='open'`) — **ended by RF6** (anchor → `closed`).
- `claim_appeal_panel_sessions` / `_votes` (un-finalized) — **ended by RF6 via the extracted core `supersedeAppealPanelSession`** (now in the leaf `appeal-panel-session.ts`; `cancelAppealPanel` keeps its actor checks and behaviour).
- `claim_r9_voting_sessions` / `claim_r9_votes` (un-finalized) — **ended by RF6 via `supersedeR9VotingSession`**; the `routed_to_r9` row — **ended by RF6 via `supersedeLiveR9Routing`** (extracted from `finalizeR9Outcome` step (b); ⛔ not inside the R9 core).
- `claim_state_trustee_decisions` live `correction_return` — **ended by RF6** (the 6.19 terminal writers' conditional supersession shape); `claim_correction_runs` open run — **ended by RF6 via `endCorrectionRun(reason 'decided')`**. ⇒ the 6.19b family sweep (pages ONLY open runs) sends ⛔ no text after `closed`; the 6.19c day-90 scan (live returns only) escalates ⛔ nothing; `listEscalatedClosures` / the Pariwar queue (join a LIVE return) drop it. Pinned (the "live processes" leg).
- `claim_correction_closures` escalated / under-review rows — **inert once the return is superseded** (both closure queues join the LIVE return).
- `claim_correction_directions` open — **accepted residual** (listed by `listOpenDirectionsFor`, answerable; `deferred-work.md`).
- `nominee_corrections` pending — **accepted residual** (approve refused out of the window; decline works; `deferred-work.md`).
- `claim_ground_inspections` scheduled — **inert — every writer checks the window** (`isClaimInGroundInspectionWindow`); ⛔ no job (`deferred-work.md` notes the row).
- `claim_certificate_reminder_runs` open — **inert — its planner checks the window** (`planCertificateRun`: `pause` / `outside_window`, ⛔ no text) — left open to day-180 `completed` (`deferred-work.md`).
- `claim_shepherd_assignments` live — **inert** (writers gated by `SHEPHERD_ASSIGNMENT_BLOCKED_STATES`, now incl. `closed`; load count filters terminal).
- `claim_peer_mesh_selections` pending — **inert** (the window job writes only an outcome; ⛔ no dispatch).
- `intake_attempts` pending — **inert** (a closed claim is terminal ⇒ ⛔ no candidate in `getPendingIntakeAttempts`).
- "The RF11 notice" — **6.24b's** (⛔ no table in 6.24a).

**Task 3.0 (c) — every literal consumer of `appeal_journey_status`:** `contracts/claims/appeal.ts:54` — **gains `closed`** (+ a new lockstep test); `apps/mobile/lib/appeal-status.ts:10` — **gains `closed`** (⛔ no affordance / status line — a unit leg); `AppealStageControls.tsx:216` (`upheld_final` on `denied`) — **unchanged, because** a closed claim is ⛔ not `denied`; `appeal-read.ts:138` (`status='open'`) — **unchanged, because** a closed anchor correctly leaves the open list; `claims.appeal.handlers.ts:304` (`upheld_final`) — **unchanged** (same reason).

**Task 4b.2 — RF15's key is held to COMMIT: each FINAL site's post-gate statements, for a lock on ANOTHER claim.** `voteOnFrozenClaim` (`state-trustee-decision-persist.ts`): `assertClaimContactRecorded`, `checkLaterApprovalWarningReason`, `resolveConcealmentSnapshot`, `projectClaimState` ×2, `insertTrusteeDecisionRow`, `insertClaimWarningApprovalRecord` — all on its OWN claim. `finalizeR9Outcome`: contact check, `readClaimApprovalWarnings`, the session UPDATE, `supersedeLiveR9Routing`, `projectClaimState`, the `r9_outcome` row — own claim. `decideEscalatedClosure` (both arms) / `approveNoCorrectionNeeded`: contact check, `checkLaterApprovalWarningReason`, `writeApprovalChain` (`supersedeReturn`, `projectClaimState`, the decision row), `endOpenRunDecided` (`endCorrectionRun` — the trustee key of the SAME claim, already held by `lockForClosure`), `insertClaimWarningApprovalRecord` — own claim. ⇒ ⛔ none takes a lock on another claim (⛔ no cycle — matches round 3). Every final writer runs at the default READ COMMITTED (⛔ never raises it). P1 (`adjudicateClaim`) passes `district_admin` ⇒ ⛔ never takes the key.

**RF13 lock order.** `reviseDecision` now reads `deceased_member_id` unlocked, takes the death's INTAKE lock, then its decision lock and row. ⛔ no Writer holds a claim's decision key / row and then waits on the intake lock (checked: `adjudicateClaim`, `tryConverge`, `convergeIntakeAttempt`, `overrideIntakeAttempt`, `refile-guard` — each takes the intake lock FIRST or never).

**RF6 lock order.** Each reversal writer takes `suspicion-reversal:<pariwar>:<deceased>` FIRST (stage 1 / stage 3: only when reversing; stage 2: on every finalize — the tally is known only under the claim's locks). For each held claim, in `claim_case_id` order: its `appeal:` key, its `r9:` key, ⚠ ALSO its TRUSTEE key (an addition to RF6's text: `endCorrectionRun` takes the trustee key, and `voteOnFrozenClaim` / the 6.19c writers take trustee-key → row, so taking it AFTER the row would deadlock), THEN its row. Every other writer takes ONE of these keys then the row ⇒ ⛔ no cycle.

**AC10 — red-checks** (each load-bearing line reverted, its test watched FAIL, the line restored — a scripted runner, every file restored from a byte copy):
R1 RF2 candidate conjunct → AC1 matrix 7 failed · R2 RF2 strip mirror → ⚠ FIRST run stayed GREEN (the matrix never parks an attempt — a hollow test) ⇒ added the "attempt parked BEFORE the refusal" leg ⇒ 1 failed · R3 RF2 backstop conjunct → 4 failed · R4 RF1 `reversed` leg → 2 failed · R5 RF1 `closed` leg → 1 failed (two `-239` refusals) · R6 RF5 conjunct off → 3 failed · R7 RF15 key in the gate → concurrency (a) failed (the approval read `appeal_not_filed`, ⛔ not blocked) · R8 RF15 key in `initiateAppeal` → concurrency (b) failed · R9 RF14 guard → the boundary pair failed · R10 RF13 lock → 1 failed · R11 RF13 intake lock → the revision-vs-mint race failed · R12 RF6 call at stage 1 → failed · R13 RF6 call at stage 2 → failed · R14 RF6 reversal key → the concurrent-reversals race failed · R15 RF7 suspicion re-check → AC4 leg 1 failed · R16 RF7 inspection re-check → AC4 leg 2 failed · R17 RF8 (the inline predicate restored) → AC5 failed · R18 overlay `claim.closed` → the overlay leg failed · R19 the return supersession → "live processes" failed · R20 the R9 routing supersession → failed · R21 the panel core → failed · R22 the anchor → `closed` → failed.
API (`suspicion-refusal-routes.spec.ts`): A1 `cycle_freeze` wait mapping → 2/5 failed (a 500) · A2 `closure` mapping → 4/5 failed · A3 `r9_voting` mapping → 3/5 failed · A4 the time-limit mapping → the on-behalf leg failed · A5 the reason-lock mapping → the RF13 leg failed · A6 the entry read's `claim_live` conjunct → the member-entry leg failed · A7 the helpline read-back's `includeClosed` → the member-entry leg failed.

**`ci:local`** (`DATABASE_URL` at :5433): run 1 — 33/34, the one red was `domain-invariants` (`suspicion-refusal-persist.ts`'s `.limit(HELD_CLAIMS_CAP)` ⛔ not clamped — the limit-clamp gate, a REAL finding) ⇒ routed through `clampLimit`; files were also edited during run 1 (glyph-register comment fixes) ⇒ ⛔ not counted. Run 2 (clean) — **ci:local PASSED — 34 job(s) green** (integration-tests: domain + API 152 files / 1574 passed).

**Deviations, recorded (⛔ not silent):**
- `POST_DEATH_NOMINEE_CHANGE_REASON_CODE` is now DEFINED in `suspicion-refusal.ts` and re-exported unchanged by `nominee-refusal-read.ts` (RF1 said "import it from `nominee-refusal-read.ts:32`" — that module now reads RF1's fragment, so importing back would close an import cycle).
- RF6's helper lives in `suspicion-refusal-persist.ts` (Task 3.2's sibling option — NW1 forbids `events.ts` in the read module). To call the actor-free panel core and the appeal key without a runtime cycle (the reversal writers call the closure writer), the key moved to the leaf `appeal-lock.ts` and the panel core + its error to the leaf `appeal-panel-session.ts` (the 6.19c `icp-lock.ts` precedent); both re-exported where they were.
- `claim.closed`'s payload ALSO carries `deceased_member_id` (an id, ⛔ no PII): the account-frozen overlay matches events by `payload ->> 'deceased_member_id'` (the `claim.settled` precedent) — without it the closed stream could ⛔ never resolve.
- RF6's `actor` on `claim.closed` is `system` (the closure is the system's consequence — RF13's "the closure is the system's act"); `events_log.actor_id` = the reversing reviewer.
- AC4 leg 2 names "the source's refusal revised away" — RF13 now REFUSES that while the refile lives. The leg drives the reachable path instead: the source CLOSED by a third claim's `-239` reversal (it then ⛔ never stands — RF1), the refile ⛔ not closable (`state_trustee_approved`, Trap 9).
- F8 / leg (e): the re-derivation "with a source that is ⛔ not reversed (`upheld_final`)" cannot be driven through the writers — a standing source is OUTSIDE the inspection window. Leg (e)'s late visit is a committed raw row (assertions unchanged) and the unreachability is a `deferred-work.md` item.
- The F1 swallow over HTTP is driven on the HELPLINE channel (helpline → helpline): the member-app intake needs the Ravi-mode handover OTP; the swallow is channel-agnostic (branch (3b)), and the domain matrix drives `member_app` → `member_app` too.
- The helpline appeal screen's "(en + hi)": the admin console is English-only (6.3 AC6); the two lines the operator READS to the family are bilingual through the shared `@twt/i18n` `claim` namespace (the `readBackScript` precedent) — `appeal_helpline.until` / `.ended`. The appeal controls' date line is staff chrome (English).
- The helpline read is a NEW member-scoped route (`GET …/admin/members/:memberId/appeals`, `claim.file`) because refused claims are `denied` (terminal) and the existing helpline claim lists show only live ones; its eligibility is judged by CALLING `assertAppealInitiable` (⛔ not a second copy). A new audit event type `admin_appeal.helpline_read` (⛔ not a permission key).
- RF10's console section is a new packet field `suspicionRefusal` (other claims by `claimShortReference` only, their appeal position and date, and the wait) — read under a SAVEPOINT; the ceiling 20 → 21 (three exact pins moved, each with the reason).
- RF12 v1.3's contract field is named `claim_closed` (⛔ not merged with `closed_no_response`).
- Task 1.3's "new `schema/claim_suspicion_notices.ts`" is 6.24b's notice table (Task 1.2 → 6.24b) — ⛔ not built here.
- The `refusedApprovalWarningAudit` switch (F9) enumerates the WARNING refusals only (6.26a's `GroundInspectionRequiredError` is ⛔ no there either) ⇒ unchanged.
- "Jobs: the commit re-check" — ⛔ no jobs path calls `commitCycleFreeze` (it is the API route; jobs only fires the post-commit pool trigger) ⇒ RF7 is pinned at the domain writer (AC4).

### Completion Notes List

- ✅ **RF1** — `claim/suspicion-refusal.ts` (READ-only; NW1-clean, fenced): `standingSuspicionRefusalSql` (live `-239` ∧ ⛔ no reversed anchor ∧ ⛔ not `closed`), `suspicionChainStartedAtSql` (the CURRENT unbroken `-239` chain's first row — RF14), `readStandingSuspicionRefusals` (ordered `created_at DESC, claim_case_id DESC`, clamped, judged at its statement's `clock_timestamp()`), `isSuspicionRefusalStanding`, `readSuspicionChainStart`, the pure `suspicionAppealWaitState` / `suspicionRefusalAppealUntil` / `hasSuspicionRefusalAppealLimitPassed`, the two per-death keys, and `assertSuspicionAppealDecidedForFinalApproval` (RF15's key FIRST, then the read).
- ✅ **RF2** — the conjunct in `getConvergenceCandidate`, in `getPendingIntakeAttempts`' LEFT JOIN (the "EXACTLY" mirror) and in `getClaimByDeceasedMember` (the intake backstop); `confirmMerge` inherits. The member entry read reports `claim_live: false` for a pointer claim on which RF1 stands (one conjunct, that read only).
- ✅ **RF4** — migration `0150` (two `ADD VALUE IF NOT EXISTS`, alone; :5432 AND :5433, `enum_range` verified on each); `closed` in `CLAIM_LIFECYCLE_STATES` / `APPEAL_JOURNEY_STATUSES` / both contracts mirrors / `CLAIM_TERMINAL_STATES` / `FAMILY_STATUS_TERMINAL_STATES` / the two blocklists / `NEVER_REENTERS` / the staff labels; the 36th event `claim.closed` (a TRANSITION from every closable state — `isClaimClosable`) in the vocabulary, the payload map, the `packages/events` registry, the reducer and `ACCOUNT_UNFREEZE_EVENT_TYPES`; pins 35 → 36 with the reason; a fourth frozen literal in the vocabulary test.
- ✅ **RF5** — `ClaimApprovalGateOptions.step` REQUIRED (a `@ts-expect-error` pin); P1 passes `district_admin`, the five final writers `final`; the conjunct after the ground inspection, before the late wait; `SuspicionAppealPendingError` → 409 `<prefix>.suspicion_appeal_pending` `{ reason }` in all four translators through one exhaustive message helper.
- ✅ **RF6** — `claim/suspicion-refusal-persist.ts` `closeClaimsHeldBySuspicionAppeal`, called by `reviewAppealStage1`, `finalizeAppealOutcome` (reverse arm) and `decideAppealStage3` after their `reversed` writes; the per-death reversal key FIRST; per held claim (claim-id order) appeal → r9 → trustee keys → row; closes every closable claim (`claim.closed`, actor `system`) and ends its live processes (open anchor → `closed`, un-finalized panel / R9 sessions through the extracted actor-free cores, the `routed_to_r9` row, the live correction return + its run `decided`); a claim ⛔ not closable is REPORTED (`heldClaims.notClosed`) and the API logs it at error level (ids only) and puts it in the reversal's audit line.
- ✅ **RF7** — `commitCycleFreeze` skip-and-keep on the suspicion wait and on the ground inspection (the gate's own read + pure predicate) — discharges the deferred item.
- ✅ **RF8** — `inheritedGroundInspectionSourceSql` reads RF1's fragment (a reversed refusal is ⛔ no longer a source); the refusal LIST unchanged — the deferred item marked PARTLY discharged.
- ✅ **RF10** — the console's `suspicionRefusal` section (one read, SAVEPOINT, fail-closed words), ceiling 20 → 21; admin `SignalsPanel` lines; the 409 words on the cycle-freeze, R9 and District Admin surfaces (the 6.19c closure surfaces show the server words, as for 6.26a).
- ✅ **RF12** (6.24a's half) — the family status `closed` (domain + contract), the mobile view's `closed` copy, the `claim_closed` routing bit → `closed` outcome → `closed_helpline` decision → `app/(claim)/closed-helpline.tsx` (⛔ never the wizard); the helpline read-back lists `closed` claims (`includeClosed`). Words: `closed.*` (en + hi, real-`t()` test, a no-suspicion-words check). The `-291` Q2 TEXT is 6.24b's.
- ✅ **RF13** — `reviseDecision` takes the INTAKE lock first, then refuses a move OFF `-239` while any other claim of the death is ⛔ not closed (`SuspicionReasonLockedError` → 409 `verifier_decision.suspicion_reason_locked`); a note-only revision passes.
- ✅ **RF14** — the fourth initiation guard (`AppealTimeLimitPassedError` → 409 `appeal.suspicion_refusal_time_limit_passed` `{ appeal_until }`), its JSDoc amended; the helpline appeal screen (a `claim.file` route + `<HelplineAppeal>`, the date read to the family in en + hi, filing through the EXISTING on-behalf route); the date on `AppealStageControls` (`suspicion_appeal_limit` on the case read).
- ✅ **RF15** — the per-death appeal key in the gate (FIRST, unconditional at `final`) and in `initiateAppeal` (after its own locks, `-239` only), both judging with `clock_timestamp()` read after it; two-connection races pinned.
- ✅ **RF16** — the T17 sentence (`nominee-refusal-read.ts`), the candidate comment (`icp.ts`), `refile-guard.ts`'s and `claims.refile-confirmation.handlers.ts`'s "Row 6-24" notes, the strip note + its test — reworded to what 6.24a did; 6.20's story gains a Change Log row only.
- ✅ **F7 / F8** — the T17 spec AMENDED (both channels mint, still inherit); 6.26b's leg (e) re-derived for its purpose (assertions unchanged) + a new leg (f) "reversal ⇒ the refile is closed"; one 6.26a two-claims leg re-derived (the source's 90 days passed — it still stands and still sources).
- ⚠ The `[x]` on a "→ Story 6.24b" line (1.2, 5.2, Task 6) means *allocated out by the split — ⛔ nothing to build here*, ⛔ not "built".
- Tests: domain unit 24 (new) + amended pins; domain live-DB `suspicion-refusal.spec.ts` (39) + `suspicion-refusal-concurrency.spec.ts` (4, own-committing); API `suspicion-refusal-routes.spec.ts` (12); contracts (5 new); admin (4 page legs + 9 new); mobile (8 new). Full suites: domain 334 files / 4692 passed; API 152 files / 1574 passed; admin 59 / 951; contracts 75; mobile 45 / 676; jobs 48 / 568; i18n 110; typecheck 20/20. ⭐ `ci:local` — see the Change Log row.

### File List

**New**
- `packages/domain/migrations/0150_claim-closed-enum-values.sql`
- `packages/domain/src/claim/suspicion-refusal.ts`
- `packages/domain/src/claim/suspicion-refusal-persist.ts`
- `packages/domain/src/claim/appeal-lock.ts`
- `packages/domain/src/claim/appeal-panel-session.ts`
- `packages/domain/tests/claim/suspicion-refusal.test.ts`
- `packages/domain/tests/integration/claim/_suspicion-refusal-fixtures.ts`
- `packages/domain/tests/integration/claim/suspicion-refusal.spec.ts`
- `packages/domain/tests/integration/claim/suspicion-refusal-concurrency.spec.ts`
- `packages/contracts/tests/claims-suspicion-refusal.test.ts`
- `apps/api/src/modules/claims/suspicion-appeal-pending-message.ts`
- `apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts`
- `apps/admin/src/modules/helpline-claims/HelplineAppeal.tsx`
- `apps/admin/tests/suspicion-refusal-helpline-appeal.test.tsx`
- `apps/mobile/app/(claim)/closed-helpline.tsx`
- `apps/mobile/lib/closed-helpline-copy.ts`
- `apps/mobile/tests/unit/closed-copy-resolves.test.ts`

**Modified**
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/claims.ts`
- `packages/domain/src/claim/{appeal.ts, appeal-eligibility.ts, appeal-persist.ts, appeal-panel-persist.ts, certificate-reminder-read.ts, concealment-assessment-persist.ts, correction-closure.ts, death-certificate-approval.ts, errors.ts, events.ts, icp.ts, index.ts, nominee-name-check.ts, nominee-refusal-read.ts, r9-voting-persist.ts, read.ts, refile-guard.ts, shepherd-assign-persist.ts, state.ts, state-trustee-decision-persist.ts, verifier-decision-persist.ts}`
- `packages/domain/src/member/overlay.ts`
- `packages/domain/tests/claim/{approval-warnings.test.ts, claim-reversed-event.test.ts, death-certificate-family-status.test.ts, dpdpa-consent-events.test.ts, nominee-name-check-events.test.ts, nominee-name-no-comparison-fence.test.ts}`
- `packages/domain/tests/integration/claim/{correction-queue-late-inspection.spec.ts, ground-inspection-approval.spec.ts, nominee-name-check.spec.ts, nominee-refusal-inheritance.spec.ts}`
- `packages/events/src/registry.ts`
- `packages/contracts/src/claims/{appeal.ts, death-certificate.ts, filing.ts, verifier-console.ts}`
- `packages/contracts/tests/claims-verifier-console.test.ts`
- `packages/i18n/locales/{en,hi}/claim.json`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/modules/claims/{claims.appeal.handlers.ts, claims.appeal.routes.ts, claims.correction-closure.handlers.ts, claims.cycle-freeze.handlers.ts, claims.death-certificate-member.handlers.ts, claims.death-certificate.handlers.ts, claims.r9-voting.handlers.ts, claims.refile-confirmation.handlers.ts, claims.verification-decision.handlers.ts, claims.verifier-console.handlers.ts}`
- `apps/api/tests/integration/claims/{verifier-console-ground-inspection.spec.ts, verifier-console.spec.ts}`
- `apps/admin/src/api/{client.ts, hooks.ts}`
- `apps/admin/src/modules/claim-appeal/{AppealPage.tsx, AppealStageControls.tsx, i18n-en.ts}`
- `apps/admin/src/modules/claim-verification/{SignalsPanel.tsx, i18n-en.ts, nominee-errors.ts}`
- `apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx`
- `apps/admin/src/modules/helpline-claims/{ConvergenceDecisionStrip.tsx, HelplineClaimPage.tsx, i18n-en.ts}`
- `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`
- `apps/admin/src/routes/VerifierConsoleRoute.tsx`
- `apps/admin/tests/{ConvergenceDecisionStrip.test.tsx, cycle-freeze-page.test.tsx, death-certificate-review.test.tsx, later-approval-warnings.test.tsx, nominee-declaration-route.test.tsx, verifier-console-route-name-check.test.tsx, verifier-console.test.tsx}`
- `apps/mobile/app/(claim)/index.tsx`
- `apps/mobile/lib/{appeal-status.ts, claim-entry-gate.ts, death-certificate-view.ts, fetch-claim-entry-outcome.ts}`
- `apps/mobile/tests/unit/{appeal-status.test.ts, claim-entry-gate.test.ts, death-certificate-view.test.ts}`
- `_bmad-output/implementation-artifacts/{6-24-true-nominee-refile-after-a-suspicion-refusal.md, 6-20-nominee-declaration-history-and-as-at-death-rule.md, deferred-work.md, sprint-status.yaml}`

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-07 | Created (`bmad-create-story 6.24`), pinned `6bb79afd`. Four read-only research passes; load-bearing cites re-read. RF1–RF16 PROPOSED (author-commit owed at Task 0.4). Q1 (the never-filed appeal) routed to the Panel — `trustee-panel-routing-note-2026-10-07-6-24-appeal-never-filed.md`; built meanwhile as C. Split offered (FQ6/FQ7 do ⛔ not depend on Q1). backlog → ready-for-dev. |
| 1.1 | 2026-10-07 | Checklist validate (one fresh-context read-only validator, ~35 cites spot-checked; 0 BLOCKER, 5 HIGH, 6 MEDIUM, 4 LOW — all applied). HIGH: a closed claim ⛔ never stands and `denied` / appeal-stage / `reversed` held claims are CLOSABLE (an appeal anchor → `closed`) — else a double payment or an endless wait (RF1, RF4); closing ends the claim's live processes (RF6); the member app's entry routing would hide the wizard during the appeal (RF2); the member is named MODE-RESOLVED (`-181`), ⛔ not first name + initial (RF11, the Panel note corrected before it is put); a SIBLING SMS registry — 6.19's D33 *"⛔ No name"* pin stays (RF11). MEDIUM: ⛔ no typecheck-forced state map — an enumerated grep (Task 3.0); the real family / helpline surfaces (RF12); Q2 ROUTED to the Panel (the closure notice — v1.0 called it both "open" and "ours"); the notice table mirrors 6.19b's 0128 (⛔ no stranded row); a per-death reversal key (⛔ 40P01); F15 (the wizard shows the discarded nominee). LOW: NW1's fixed list, citation slips, `readGroundInspectionApprovalFacts`, `-290` M1's premise, `ADD VALUE IF NOT EXISTS`, the parked attempt. |
| 1.2 | 2026-10-07 | ✅ The Panel ruled (DR + KB): **Q1 A** — 90 days (the number confirmed by BigDev), **Q2 B** — recorded `2026-10-07-291`, committed ALONE (`2f674a57`); the note's block filled. RF14 is BUILT (the 90-day limit: one pure helper, a third initiation guard + 409, the "until <date>" words on the appeal surfaces), RF15 is BUILT (the per-death appeal key, `clock_timestamp()` after it — Trap 20), RF12 gains the closure text (the notice table carries a `purpose`). New AC2b and Task 4b; P1 / P2 rewritten, P6 added; Task 0.6 owes the 6.16 D-E / PRD / appeal-fairness annotations. The author-commit moves to `-292`. ⛔ No status flip. |
| 1.3 | 2026-10-07 | Validate ROUND 2 (fresh context, read-only; ~25 cites; 0 BLOCKER, 4 HIGH, 3 MEDIUM, 6 LOW — all applied). HIGH: the 90 days start at the claim's EARLIEST `-239` decision row, ⛔ not the denial event (a revision ONTO `-239` would otherwise leave ⛔ no days to appeal) — amends a `-291` READING; a revision OFF `-239` while another claim of the death lives is refused (RF13) — else one death is paid twice; *"is told"* had ⛔ no reachable surface ⇒ a once-ever text to the refused claim's own contact record + a `claim.file` helpline appeal screen on the existing on-behalf route (wording confirm owed, non-blocking); RF6's cancel writers could ⛔ not be called and its lock order deadlocked ⇒ key-then-row, actor-free cores. MEDIUM: RF15's key taken FIRST and unconditionally at `final`; a `closed` claim routes to a helpline screen (⛔ never the wizard); the notice table's `purpose` + UNIQUEs made consistent. LOW: the IST helpers named, the guard count (three), the outside-key clock, the appeal-status consumers, two cites, Traps renumbered, F15 after F14. |
| 1.4 | 2026-10-07 | Validate ROUND 3 (narrow, v1.3's edits; 1 BLOCKER, 1 HIGH, 5 MEDIUM, 5 LOW — all applied). BLOCKER: v1.3's "is told" text used `readCorrectionRecipients`, which returns the true nominee and ⛔ never the refused filer — the text is REMOVED; who is texted, on which number and basis is routed to the Panel as **Q3** (non-blocking; built meanwhile as the helpline screen). HIGH: RF13's guard also holds while the other claim is `approved` / `state_trustee_approved` / `settled` (still two payments), scoped to claims created after the refusal chain began. MEDIUM: `reviseDecision` takes the intake lock first (a revision racing a mint); the mis-coded-reason residual recorded; the clock = the earliest row of the CURRENT `-239` chain (away-and-back restarts it, AC4 now true); a NEW roster row for the two texts; the `closed` entry outcome kind and its corrected rationale. LOW: `routed_to_r9` superseded by RF6 itself; the IST helper imports; "never updated" is a convention, test-pinned; stale governance text; the six sites' post-gate lock enumeration. |
| 1.5 | 2026-10-07 | Validate ROUND 4 (narrow, v1.4's edits; 0 BLOCKER, 2 HIGH, 2 MEDIUM, 4 LOW — all applied). HIGH: RF14 and AC2b disagreed on "away and back" ⇒ ONE rule — the current chain's first row; a note-only revision keeps D, away-and-back starts a new 90 days (a third amended `-291` reading); the Q3 note's deciding fact was false in the likeliest case (a refused filer who is a nominee gave ⛔ no claimant number — their only number is the post-death declaration's) ⇒ corrected in the note before it is put, and the B resolver covers both claimant sides. MEDIUM: RF13's residual disclosed to the Panel as a confirm (Q3 note item 2); RF12's "never the wizard" rationale corrected. LOW: RF12's four entry-outcome pieces; `acquireIntakeLock` is private — the `refile-guard.ts` read-then-key precedent; RF13's "i.e." clause; AC7's roster row names Q2's text. |
| 1.6 | 2026-10-07 | Validate ROUND 5 (narrow, v1.5's edits; 0 BLOCKER, 1 HIGH, 2 MEDIUM, 6 LOW — all applied). HIGH: the Q3 note's item 2 option B was ⛔ not a real alternative (it could ⛔ not undo a payment) ⇒ rewritten as A / B / C with honest costs, A's cost conditional on item 1. MEDIUM: RF13's scope = RF5's (a claim predating the refusal included — else a move off and back reopened an expired window); item 2 A's scope stated in full. LOW: the rulings-row wording, AC2b's version label, `icp.ts:115`, RF12 names 6.19c's `closed_no_response` sibling, item 2's §0 line, the LETTERS line and Task 1.2 aligned with RF11. |
| 1.7 | 2026-10-07 | Validate ROUND 6 (narrow; 0 BLOCKER, 1 HIGH, 2 MEDIUM, 2 LOW — all applied, all in the Q3 note's item 2 and RF13's residual line): B / C now state what happens if the corrected refusal's appeal is allowed (the true nominee's claim closed under a refusal no longer on suspicion — FQ5 ⛔ never ruled for that); item 2's deciding fact restated for the options actually put; A's cost (for good once the 90 days pass); item 2's sentence uses RF13's full scope; RF13's residual rationale aligned. |
| 1.8 | 2026-10-07 | Validate ROUND 7 (narrow; 0 BLOCKER, 1 HIGH, 1 MEDIUM, 1 LOW — applied, all the Q3 note's item 2): the any-time correction option still paid a death twice once the other claim was paid ⇒ dropped; item 2 is A vs B (a correction only before another claim's final approval, honest costs); the deciding fact gains *"refused once another claim is finally approved"*; the note's "Corrected in this note" records both rewrites. |
| 1.9 | 2026-10-07 | Validate ROUND 8 (narrow): **0 BLOCKER, 0 HIGH ⇒ the rounds STOP.** Applied its 1 MEDIUM and 3 LOW (the note's item 2: B's small real gain stated and the reading restated with *"because"*; "closing" ⛔ not "holding" in the deciding fact; the quoted earlier option made exact, "B is the earlier C"). Eight rounds in all: 1 BLOCKER and 15 HIGH found and fixed across them. |
| 2.0 | 2026-10-07 | **Task 0 complete** (BigDev: *"complete the remaining steps"*): `2026-10-07-292` committed alone (`f0801f1e`); `epics.md` `### Story 6.24` + `-291` Consequence 2's three annotations (`5e77ca6e`); P7 added; the decisions marked committed. Q3 (items 1–2) stays open, non-blocking. Ready for `bmad-dev-story` (Task 0.1 runs at the build). |
| 2.1 | 2026-10-07 | **SPLIT** (BigDev: *"ok, split it"*). This file becomes **Story 6.24a** (keeps the row key); **Story 6.24b** (new row `6-24b-filing-code-and-texts-to-the-nominee-in-place-at-the-death`, `backlog` until 6.24a is `done`) takes RF9, RF11 and RF12's Q2 text, with P4, invariants 5–6, AC6 / AC7 (as AC6b / AC7b), Tasks 1.2 / 5.2 / 6 / 7.2's SMS key, Traps 10–14 and Q3 item 1. ⛔ No RF moved or re-worded — each RF is tagged [a] / [b]; `-292` is ⛔ not edited. `epics.md` gains `### Story 6.24a` / `### Story 6.24b`. |
| 2.2 | 2026-10-07 | ✅ **Q3 RULED — `2026-10-07-293`** (DR + KB: *"Q3 - B (one text)"*, *"Confirm (item 2) - A"*), committed alone (`2ada8f7b`); the note's block filled. For 6.24a: RF13's reason lock is RATIFIED as built (P7 ✅) — ⛔ no change; item 1 B (the refused person's text) is 6.24b's. The committed RF text is ⛔ not edited (its *"If Q3 is answered B …"* sentences are now the operative branch, per `-293`). |
| 2.3 | 2026-10-08 | **Built (`bmad-dev-story 6.24a`) — in-progress → review.** RF1–RF8, RF10, RF12 (6.24a's half), RF13–RF16 as `-292` committed them: `claim/suspicion-refusal.ts` (+ `-persist`, two cycle-breaking leaves), migration `0150` (:5432 + :5433), the 36th event `claim.closed`, the gate's REQUIRED `step`, the three reversal writers closing the death's other claims and their live processes, the commit re-checks, the 90-day guard + per-death keys, the reason lock, the console section (reads 20 → 21), the helpline appeal screen, the mobile closed screen. F7 / F8 re-derived (⛔ weakened). Red-checks: 22 domain + 7 API (one hollow strip test FOUND and fixed). Deviations recorded in the Debug Log (e.g. RF6 also takes the trustee key; AC4 leg 2 drives the reachable path under RF13; `-290` M2's arm now unreachable through the writers — `deferred-work.md`). `ci:local` 34/34. |
| 2.4 | 2026-10-08 | **Code review (`bmad-code-review`) — review → done.** Four chunked passes (domain-core, `apps/api`, `apps/admin`, `apps/mobile`; the diff exceeded the single-pass line threshold), each with Blind Hunter + Edge Case Hunter + Acceptance Auditor running in parallel. 93 raw findings → 12 patch (all fixed and verified — typecheck + the relevant live-DB/unit suites green after each, one red-checked against a deliberate regression), 22 defer (written to `deferred-work.md`), 46 confirmed non-issues after checking the actual code (several restated already-ratified policy, an already-precedented pattern, or a cross-chunk fact the reviewing agent couldn't see blind). The two most load-bearing fixes: the `SuspicionReasonLockedError` / reason-locked 409 message said "still open" on both the API and the admin console, contradicting RF13's actual rule (holds through `approved`/`settled`/`denied`, only released at `closed`) — fixed in both places; and the mobile `appeal-status.ts`'s new `'closed'` value had no actual guard (relied on an unenforced cross-field assumption), independently caught by all three review layers — fixed to match the `closed_no_response` precedent, with a red-checked test. 0 decision-needed. |
| 2.5 | 2026-10-08 | **Code review ROUND 2 (`bmad-code-review 6.24a`; a fresh full re-review of `de2355a6..HEAD`, two chunks, three layers each in PARALLEL per BigDev, read-only) — stays `done`.** ~70 raw → 2 decision-needed, 21 patch (ALL fixed), 8 defer, 22 dismissed. ⭐ BigDev *"D1:1, D2:1"* → `2026-10-08-294` (committed alone, `2dd7b7b3`): §1 the reversal writers take the death's intake key first (a claim minted during a reversal was ⛔ never closed — fixed + two race legs); §2 Trap 9's *"unreachable"* CORRECTED (two payments for one death stay reachable); §3 row `6-28-one-payment-per-death-second-approval-guard` → `backlog`. HIGH also fixed: the helpline appeal card's per-`mutate` callbacks (TanStack fires them for the latest call only). Verified: typecheck + unit + lint (admin 974 · mobile 677 · contracts 1277 · domain 2496 · api 439); live-DB :5433 domain 6 specs 79/79, api 2 specs 22/22; six red-checks. |
| 2.6 | 2026-10-08 | **Code review ROUND 3 (narrow — round 2's fixes, `6fc5dce0..HEAD`; three layers in PARALLEL per BigDev, read-only) — stays `done`; rounds STOP (⛔ no HIGH, the 6.26b precedent).** All 21 round-2 patches VERIFIED (two partial, fixed here) and `-294` §1's lock exactly; ⛔ no deadlock cycle repo-wide. ~40 raw → 0 decision-needed, 12 patch (ALL fixed), 4 defer, 14 dismissed. MEDIUM fixed: the join after a reversal holds only inside the 30-day convergence window — the docblock, the race test and the operator note said otherwise (`-294` §2 (b), row `6-28-…`). Verified: typecheck + lint + unit 59/59 tasks (admin 976 · mobile 677 · contracts 1277 · domain 2496 · api 439); live-DB :5433 domain 79/79, api 22/22; three red-checks. |
