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

STATUS: `ready-for-dev` — with TWO Panel questions open (Q1 the never-filed appeal; Q2 whether the true nominee is told her claim was
closed). ⭐ They block ⛔ nothing: Task 0 records what is built meanwhile (RF5's `appeal_not_filed` ⇒ WAIT — FQ5 read as written, the safe
side; RF12 ⇒ ⛔ no message) and RF14 lists exactly what changes per answer.

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / nowhere); `⭐` = key fact or
action; `⚠` = hazard. Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every prepend
rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code, as of `6bb79afd`.
LETTERS: `RF1`…`RF16` are THIS story's author decisions (⏳ PROPOSED — committed by ONE author-commit at Task 0.4, the next free id,
expected `2026-10-07-291` or later; ⛔ no code before it). `F1`…`F15` are FOUND facts (⛔ not decided). `Q1`, `Q2` are the Panel questions.
-->

# Story 6.24: The True Nominee's Refile After a Suspicion Refusal — Kept Apart, Waiting at Final Approval for the Appeal, Closed if the Appeal Is Allowed; the Filing Code and a Text to the Nominee in Place at the Death `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** When a District Admin refuses a claim because the nominee was changed on or after the
> death (`-239`, reason `post_death_nominee_change`), the member's true nominee may file again. This story builds the four Panel rulings
> about that refile: her new claim is **always kept apart** from the refused one — ⛔ never merged into it (`-261` D4 B); it goes through
> every check but **waits at final approval** until the refused claim's appeal is decided, may then be approved if the appeal is refused,
> and is **closed** — ⛔ not refused — if the appeal is allowed (`-262` FQ5 A); while the refusal stands, the app's **filing code goes to
> the nominee the District Admin found in place at the death**, ⛔ never to the discarded one (FQ6 B); and the system **texts that
> nominee** *"A claim for [member] could not go ahead. Please call the helpline."* (FQ7 B — ⚠ go-live gated on counsel).
> ⭐ **The system still refuses nothing.**

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
>    gate"*). ⇒ FQ5's *"until the appeal is decided"* has ⛔ no end when nobody appeals ⇒ **Q1, routed to the Panel** (routing note
>    `2026-10-07-6-24-appeal-never-filed`). Meanwhile *"not filed"* = WAIT (RF5).
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
I want **my own claim kept apart from the refused one, checked in full, and approved once the refused person's appeal is decided; the
app's filing code sent to me rather than to the person who changed the nominee; and a text telling me to call the helpline**,
so that **the Trust never pays the wrong person or pays twice for one death, while ⛔ nobody is refused, accused or kept from filing by
another person's act.**

## The rulings this story builds

| Ruling | Key | Status |
|---|---|---|
| `-239` (b), (c) | the true nominee *"has to start over and produce original death certificate. However ground inspection can be inherited"*; *"refusal appealable once"* | ⭐ Trustee-ratified |
| `-261` C3 | *"nothing else carries over"* (consents, neighbour checks, documents, bank details are given again) | ⭐ Trustee-ratified |
| `-261` D4 B | *"when the open claim was refused on suspicion, a new claim for that death is ALWAYS kept separate — ⛔ never merged into the refused claim"*; ⚠ **supersedes 6.20 T17** | ⭐ Trustee-ratified |
| `-261` D4 reading | scope = a claim whose LIVE verifier decision is `denied` with `post_death_nominee_change` — ⛔ any other refusal converges as today | ⚠ OUR reading |
| `-262` FQ5 A | *"the true nominee's new claim goes through every check but WAITS AT FINAL APPROVAL until the appeal is decided. Appeal refused → the new claim may be approved; appeal allowed → the new claim is closed"* | ⭐ Trustee-ratified |
| `-262` FQ5 reading | *"FQ5's 'closed' is ⛔ not a refusal of the true nominee"* (an allowed appeal still pays the nominee in place at the death — the marking is mechanical) | ⚠ OUR reading |
| `-262` FQ6 B | *"after a refusal on suspicion, the app sends the filing code to the nominee the District Admin found in place at the death — ⛔ never to a discarded one"* | ⭐ Trustee-ratified |
| `-262` FQ6 reading | *"FQ6 applies only while a `-239` refusal stands for that death"*; before any claim the first filing code still goes to the latest nominee (`-234` V) | ⚠ OUR reading |
| `-262` FQ7 B | *"the system texts the nominee on record at the death, at the mobile from that declaration: 'A claim for [member] could not go ahead. Please call the helpline.' ⛔ It accuses no one."* | ⭐ Trustee-ratified — ⚠ go-live gated on counsel |
| `-264` FQ13 | the refile's fresh original is seen by an inspector; *"row 6-24 depends on it for approval"* | ⭐ Trustee-ratified — ✅ BUILT by 6.26a (GI2) |
| `-285` A | FQ9 holds every approval incl. the final one | ⭐ Trustee-ratified — ⛔ no new mechanism here |
| **Q1** (routing note `2026-10-07-6-24-appeal-never-filed`) | how long the refile waits when the refused claim is ⛔ never appealed — A (a time limit for this refusal only) · B (wait only while an appeal is open) · C (wait for ever) | ⏳ **AWAITING PANEL** — built meanwhile as C (RF5) |
| **Q2** (same note) | whether the true nominee is TOLD her claim was closed — A (⛔ no message; her claim's status says it) · B (a text: her claim was closed, call the helpline) | ⏳ **AWAITING PANEL** — built meanwhile as A (RF12) |

**⛔ Not covered by any ruling (stays open):** the exact wording of FQ7's text in Hindi and its DLT templates (`-262` *"does NOT cover"*);
FQ7's legal basis (counsel); who is paid when an allowed appeal moves the certificate date (6.20 / 6.21a's existing rules, untouched).

## ⭐ THE INVARIANTS
1. **The system refuses nothing.** The wait is a 409 *"waits"* (⛔ never a denial); *"closed"* is its own state — ⛔ never `denied`, ⛔ never
   appealable, ⛔ never a 6.19c closures row, ⛔ never `denied_no_appeal`.
2. **ONE definition of "a suspicion refusal stands"** (RF1) — convergence, the wait, the closure, the commit re-check, the inheritance, the
   filing code and the text all read it; ⛔ none re-derives it.
3. **Derived, ⛔ never stored** — the refile is ⛔ not linked by a column; every predicate re-reads the refused claim's live decision and
   appeal anchor at the moment it acts (F3: decisions are revisable).
4. **The District Admin's approval is ⛔ never held by FQ5** — only the five final writers (RF5).
5. **⛔ No latest-nominee fallback** after a standing refusal: a non-effective determination or an unusable mobile ⇒ the existence-defended
   no-op (the code) / a recorded skip (the text) — ⛔ never the projection's rank-1.
6. **⛔ No plaintext mobile or name** in a log, an audit, an event, a job payload or a table — a keyed hash and a masked last-4 only.

## 📜 Policy meaning (AI-10-1)
⭐ This story ADDS a conjunct to a benefit-gating predicate (the approval gate) and a new terminal outcome. In the member's terms:
- **P1 (RF5 — the wait):** *"If an earlier claim for the same death was refused because the nominee was changed after the death, a new
  claim for that death can be checked and approved by the District Admin, but it cannot be finally approved while that refusal can still be
  appealed or its appeal is still being decided."* — `-262` FQ5 A: consistent. ⚠ *"can still be appealed"* is the meanwhile reading of Q1
  (C); Q1's answer may bound it (A) or drop it (B) — this sentence is re-checked at Task 0.5.
- **P2 (RF6 — closed):** *"If that appeal succeeds, the new claim is closed — ⛔ not refused, ⛔ not appealable — and the earlier claim goes
  ahead; the family sees only that the claim was closed and to call the helpline."* — FQ5 A + its reading: consistent. ⚠ Q2 may add a
  text; re-checked at Task 0.5.
- **P3 (RF2 — kept apart):** *"While a refusal on suspicion stands, a new claim for that death is ⛔ never merged into the refused claim;
  once that refusal is overturned on appeal, a new filing joins the overturned claim as before."* — `-261` D4 B + its reading: consistent.
- **P4 (RF9 — the filing code):** *"While a refusal on suspicion stands, the app's filing code goes only to the nominee the District Admin
  found in place at the death; if that nominee cannot be reached by text, the family is sent to the helpline — the code ⛔ never goes to
  the discarded nominee."* — FQ6 B: consistent.
- **P5 (RF7 — the commit):** *"A claim whose final approval would no longer be allowed is ⛔ not paid out by the cycle commit; it waits for
  the next commit."* — `-285` + FQ5: consistent (adds ⛔ no new condition, it re-applies two existing ones at the payout milestone).
- **Niyamavali** (`docs/legal/niyamavali.md`, ⛔ not ratified — [[feedback_niyamavali_rulebook_not_spec]]): Part 9 (claim appeal: three
  stages, *"different individual"* at Stage 1) states ⛔ no time limit and ⛔ nothing on a second claim for one death — **checked
  2026-10-07, consistent, ⛔ no clause engaged**. §8.8's *"No deadline"* is the MODERATION appeal and says it does ⛔ not incorporate Part 9.
  §2.4 (one or two nominees, 75/25) is ⛔ not touched.

## ⚖️ Decisions — the AUTHOR's (⏳ PROPOSED; ✅ committed by ONE author-commit at Task 0.4 — ⛔ no code before)
⭐ §0: each RF is *"the code should do X"* in service of a ruling already made; the person-facing halves are cited, decided ⛔ nowhere here.

- **RF1 — "A SUSPICION REFUSAL STANDS", ONCE.** New module `packages/domain/src/claim/suspicion-refusal.ts`:
  · `standingSuspicionRefusalSql(claimAliasSql)` — raw SQL, for a claim `s`: EXISTS a live `claim_verifier_decisions` row
    (`superseded_at IS NULL AND outcome = 'denied' AND reason_code = <POST_DEATH_NOMINEE_CHANGE_REASON_CODE>`) AND NOT EXISTS a
    `claim_appeals` row of `s` with `status = 'reversed'` AND `s.current_state <> 'closed'` (v1.1 — a claim RF6 closed ⛔ never stands,
    else a closed claim's open anchor or un-appealed `-239` would hold the reversed claim for ever). ⛔ Never a Drizzle correlated subquery
    ([[project_epic6_drizzle_correlated_subquery_bug]]) — explicit aliases. Import the constant from `nominee-refusal-read.ts:32`.
  · `readStandingSuspicionRefusals(db, pariwarId, deceasedMemberId)` → `{ claimCaseId, createdAt, appeal: 'not_filed' | 'open' |
    'upheld_final' }[]` ordered `created_at DESC, claim_case_id DESC` (the inheritance rule's order), bounded by `clampLimit`.
  · ⚠ It must pass 6.23a's NW1 transitive-import scan (`packages/domain/tests/claim/approval-warnings.test.ts` ~:337-370 — ⛔ no path to
    `claim/events.ts`, `nominee-name-check.ts`, `nominee-lock.ts`) and, if the no-comparison fence requires approval-path modules, join
    `FENCED_FILES` (`nominee-name-no-comparison-fence.test.ts:38`, pinned at 36 — bump the pin with a reason).
  · ⚠ RF1 must be added to NW1's fixed entry list (`approval-warnings.test.ts:357-361`) — the scan reaches ⛔ nothing it is not given.
  · *"Stands"* = the refusal is live AND ⛔ not overturned AND its claim ⛔ not closed. A stage-3 uphold (`upheld_final`) STANDS. A revision off `-239` ends it; a
    revision onto `-239` starts it (F3 — accepted, derived).
- **RF2 — D4 B AT THE CANDIDATE.** `getConvergenceCandidate` gains `AND NOT (<RF1 on the candidate>)`; `getPendingIntakeAttempts`' LEFT
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
- **RF3 — "THE DEATH'S OTHER CLAIMS".** The wait (RF5) and the closure (RF6) concern every OTHER claim of the same `(pariwar_id,
  deceased_member_id)` — ⛔ no ordering by `created_at` and ⛔ no "filed by the true nominee" test (the system cannot know who files;
  `claimant_actor_id` is null in v1). A later filing by the refuser is kept apart and waits the same way. ⛔ No link column.
- **RF4 — THE NEW STATE: `closed`.** `claim_lifecycle_state` gains `closed` (migration 0150 — `ALTER TYPE … ADD VALUE` ALONE in its file;
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
- **RF5 — THE WAIT (FQ5), ONE CONJUNCT, FINAL ONLY.** `ClaimApprovalGateOptions` gains REQUIRED `step: 'district_admin' | 'final'`
  (typecheck finds all six sites): P1 passes `'district_admin'`; `voteOnFrozenClaim`, `finalizeR9Outcome`, both `decideEscalatedClosure`
  arms and `approveNoCorrectionNeeded` pass `'final'`. New `assertSuspicionAppealDecidedForFinalApproval(db, pariwarId, claimCaseId,
  deceasedMemberId)` in `suspicion-refusal.ts`, called by the OUTER `assertClaimApprovable` only when `step === 'final'`, AFTER
  `assertGroundInspectionCompleteForApproval` and BEFORE `assertLateWarningsCovered` (6.23b EA2 stays LAST). ⛔ Never inside
  `assertNomineeNameCheckForApproval` (its `-251` early return and `isReturnedClaimResubmitted`'s error-swallowing — 6.26a GI1's reasoning).
  It holds iff ANY other claim of the death (RF3) has a standing refusal (RF1) whose appeal is `open` (reason `appeal_open`) or `not_filed`
  (reason `appeal_not_filed` — ⏳ Q1; meanwhile WAIT). `upheld_final` ⇒ decided ⇒ ⛔ no wait. A reversed refusal ⇒ ⛔ not standing ⇒ ⛔ no
  wait — and the claim is already `closed` (RF6), so its approvers' own state checks refuse first. New typed error
  `SuspicionAppealPendingError(claimCaseId, reason)` in `claim/errors.ts` ⇒ every approval translator maps it to 409
  `<prefix>.suspicion_appeal_pending` with `details.reason` — ⛔ never a 500 (F9). One pure helper `suspicionAppealWaitState(rows,
  selfClaimId)` → `{ waits: false } | { waits: true, reason }` — the console (RF10) and the gate both call it.
- **RF6 — CLOSED, IN THE REVERSAL'S OWN TRANSACTION.** ONE helper `closeClaimsHeldBySuspicionAppeal(client, { pariwarId, deceasedMemberId,
  reversedClaimCaseId, actor, actorId, auditId? })`, called by all THREE reversal writers — `reviewAppealStage1` (`appeal-persist.ts:349`),
  `finalizeAppealOutcome` (`appeal-panel-persist.ts:498`, the `reverses` arm) and `decideAppealStage3` (`appeal-persist.ts:423`) — AFTER their
  own `reversed` writes, and ONLY when the reversed claim's live decision is `-239` (read in the same transaction). It locks each other claim
  of the death in `claim_case_id` order and emits `claim.closed` for each in a CLOSABLE state; one in `state_trustee_approved` /
  `approved` / `settled` is ⛔ not closed — it is recorded (an error-level log with ids only + an audit line), ⛔ never silently (unreachable
  under RF5 + RF7 unless Q1 B is taken — Trap 9). ⚠ **Lock order (Trap 8):** reversal = refused claim → each held claim; ⛔ no writer may
  take a held claim's lock and THEN wait on the refused claim's — the gate (RF5) and the commit re-check (RF7) READ the refused claim's
  decision and anchor with ⛔ no lock. ⚠ **v1.1 — two `-239` claims of one death reversed at once** would lock S1→S2 and S2→S1 (40P01,
  validator M10) ⇒ all three reversal writers take a per-death transaction advisory key `suspicion-reversal:<pariwar>:<deceased>` FIRST —
  before their own `appeal:` lock and claim-row lock (read the claim's immutable `deceased_member_id` unlocked to build it) — ⛔ never the
  intake lock, ⛔ never RF15's key.
  ⚠ **v1.1 — a closed claim's LIVE PROCESSES (validator H2).** Closing R must ⛔ not leave anything running on it: the 6.19b correction sweep
  ends a run only on supersession / day 90 / resubmission (`claim-correction-reminders.ts:1095-1116`) and never reads the state ⇒ a closed R
  with a live return would keep getting *"Your claim is still open."* texts, and on day 90 6.19c would ask the District Admin to close a
  claim that is already closed. ⇒ RF6 ends R's live correction return (and so its run) through the SAME supersession the 6.19 writers use on a
  terminal decision, and cancels any live R9 session and appeal-panel session on R through their existing cancel writers (`cancelAppealPanel`,
  `appeal-panel-persist.ts:668`; the R9 twin). Task 3.0 enumerates EVERY table with a live row keyed on a claim (returns, correction /
  certificate reminder runs, R9 and appeal-panel sessions, inspection and shepherd assignments, pending intake attempts, the RF11 notice) and
  records each: *"ended by RF6 via <writer>"*, *"inert — its reader checks the state (<cite>)"*, or *"accepted residual, because …"*. A test
  pins the reminder case (⛔ no text after `closed`).
- **RF7 — THE COMMIT RE-CHECK (discharges `deferred-work.md` *"An inherited visit that vanishes after the final vote is ⛔ not re-checked at
  the cycle commit"*).** `commitCycleFreeze`, per candidate, under its lock, after the two existing skip-and-keep re-checks
  (`hasLiveRoutedRow`, `hasLiveReturnRow`): `continue` (skip-and-keep — the claim stays `state_trustee_approved` for the next commit) when
  `suspicionAppealWaitState(...).waits` OR `groundInspectionApprovalState(...)` is ⛔ not complete (it is PURE —
  `ground-inspection-approval.ts:64`; feed it `readGroundInspectionApprovalFacts`, the gate's own read). ⛔ Never the full gate (its name check,
  accounts and late-warning legs were the vote's; the commit re-applies only the two conditions that can move through ANOTHER claim). The
  commit's result gains ⛔ no new field unless the existing `skipped`/`committedClaimIds` shape requires it — the dev reports what it does.
- **RF8 — THE INHERITANCE READS RF1 (discharges `deferred-work.md` *"`-239` inheritance source: an appeal-overturned refusal is never
  superseded…"* for the APPROVAL input).** `inheritedGroundInspectionSourceSql` (`nominee-refusal-read.ts:99-126`) replaces its inline live-decision
  predicate with RF1's fragment ⇒ a reversed refusal is ⛔ no longer a source. ⚠ This AMENDS the input of 6.26a GI2's VISITED (*"6.20 AC13, ⛔
  not changed"*) and the premise of `-290` M1 (*"a source reversed on appeal stays the source"*) — both recorded in the author-commit as
  amendments, ⛔ never readings. The Pariwar Admin's refusal LIST (`listNomineeRefusals`)
  is ⛔ not changed (a display; the item's list half stays open — say so when marking it).
- **RF9 — THE FILING CODE (FQ6).** `sendHandoverOtp` first calls a new domain read `readSuspicionRefusalRecipient(db, pariwarId,
  deceasedMemberId)` → `null` (⛔ no standing refusal ⇒ today's path, unchanged) | `{ kind: 'at_death', versionId }` | `{ kind: 'none' }`.
  It takes the MOST RECENT standing refusal (RF1's order), reads `getEffectiveNomineeDeclaration` on THAT claim, and returns the
  `versionId` of the entry with `rank === 1` (after 6.20's re-rank) when `status === 'effective'`; else `none`. The API reads the version's
  `mobile_ciphertext` (`getNomineeVersionsByIds`, `nominee/declaration-history.ts:149`) and resolves it with the domain's
  `resolveCorrectionMobile(serialized, 'member_nominee', pariwarId, enc)` (`claim/correction-crypto.ts:~50` — it already handles null, the
  erasure sentinel and normalisation; or `decryptNomineeField` + `normalizeMobile`, the same field class) — `none`, a null/sentinel ciphertext or an unsendable number ⇒ the SAME existence-defended no-op (`sent: true`, empty
  hint, `timingEqualizeDelay`) as today's ⛔-nominee branch. ⛔ Never `getMemberNominees` once a refusal stands. The send audit
  (`member_claim.handover_otp_send`) gains a non-PII `recipient: 'latest' | 'at_death'`. A determination with a NULL
  `death_certificate_review_id` (0119-era) is trusted as `effective` (⛔ not in production — ⛔ never backfilled).
- **RF10 — WHAT STAFF SEE.** The verifier console (the District Admin's) shows, on a claim whose death has another claim with a standing
  refusal: *"Kept apart from an earlier claim for this death that was refused on suspicion"* and *"Final approval will wait for that
  claim's appeal — not yet filed / being decided"* (from `suspicionAppealWaitState`; ⛔ no names, ⛔ no note, the other claim by its
  claim reference only); a read failure ⇒ *"could not be checked just now"*, ⛔ never silence (6.18's fail-closed rule; the console's
  `underSavepoint` section pattern). The read counts against `VERIFIER_CONSOLE_MAX_READS` (`claims.verifier-console.handlers.ts:177`,
  20 — bump with a ledger line + exact `toBe`). Every later surface gets the 409's words through the existing translator paths
  (⛔ no per-surface panel). The convergence strip's T17 note (`ConvergenceDecisionStrip.tsx:222-231`) is reworded to D4 B.
- **RF11 — THE TEXT (FQ7).** A jobs sweep beside 6.19b's (`apps/jobs/src/scheduler/`), ⛔ never `dispatch()`: select claims with a
  standing refusal (RF1) and ⛔ no notice row; per claim, lock it, RE-CHECK RF1 under the lock, resolve the recipient exactly as RF9 does
  (the refused claim's rank-1 effective version — ⛔ never `readCorrectionRecipients`, which keys on the filer's agreement), insert a
  notice row in its claiming status, commit; then decrypt (the domain's `resolveCorrectionMobile`, `claim/correction-crypto.ts:~50`), send
  through `sendClaimCorrectionSms`'s path (`claim-correction-reminders.ts:247-320` — its fail-closed and error classification), and
  compare-and-set the outcome. New table `claim_suspicion_refusal_notices` (migration 0151): `notice_id`, `pariwar_id`, `claim_case_id`
  (composite FK to `claims`), `recipient_version_id`, `recipient_number_hash` (keyed), `status`, `claimed_at`, `created_at`,
  `updated_at`; UNIQUE `(pariwar_id, claim_case_id)` — ⭐ ONCE per refused claim, EVER (a revision away and back ⛔ never re-texts; a second
  refused claim of the death is its own notice). ⚠ **v1.1 (validator M9) — invent ⛔ no vocabulary:** the status set, `claimed_at`, the
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
  hard-code the variables `{reference, helpline}` (`claim-correction-sms-templates.ts:123-130`, `claim-correction-reminders.ts:287-290`) and
  the lockstep test pins every entry name-free with the reference first (`apps/jobs/tests/claim-correction-sms-templates.test.ts:62-87`;
  the registry header D33: *"⛔ No name"*). ⇒ a SIBLING registry `suspicion-refusal-sms-templates.ts` with its own variables type
  `{ member, helpline }`, its own render function and lockstep test, and a send variant that reuses `sendClaimCorrectionSms`'s provider /
  classification / fail-closed core by extraction (⛔ never a copy). D33's *"⛔ No name"* is ⛔ not weakened — this message names the member
  because FQ7's ratified text does; the carve-out is recorded in the author-commit and in the sibling's header. The DLT request sheet
  gains the two rows (a new section in `docs/launch-gate-inventory/dlt-template-requests-6-19.md`, or a sibling sheet — the dev picks and
  records). Template ids stay UNSET ⇒ the send fails closed
  (`error` + alarm) until go-live.
- **RF12 — WHAT THE FAMILY SEES.** A `closed` claim's member-facing status: *"This claim has been closed. Please call the helpline."*
  (en + hi) — ⛔ no reason, ⛔ no mention of the other claim. ⚠ **v1.1 (validator M7) — the real surfaces:** mobile has ⛔ no claim-state
  map; the family's status is `resolveDeathCertificateFamilyStatus` (`claim/death-certificate-approval.ts`, the read behind the mobile
  status and the entry outcome) ⇒ it gains a `closed` status the mobile renders with these words; the helpline read-back
  (`getClaimsForMember`, `claims.death-certificate.handlers.ts:374`) lists ONLY non-terminal claims ⇒ a `closed` claim would vanish exactly
  when the family is told to call ⇒ it ALSO lists the member's `closed` claims, with these words (other terminal states ⛔ not changed).
  ⏳ **Q2** (whether she is also TEXTED) — meanwhile ⛔ no text on closure (A); if the Panel answers B, the RF11 machinery gains a second
  message (its own copy key, DLT rows, notice row keyed on the closed claim — the same counsel gate). A WAITING refile shows its existing status — ⛔ no new member-facing string for
  the wait (6.23b's precedent: whether the family is told a claim waits was ⛔ never ruled). ⛔ No member-facing string anywhere says
  "suspicion", "fraud", "changed after the death" or names anyone.
- **RF13 — NOTHING ELSE MOVES.** ⛔ No new permission key (catalog version / key count unchanged — the `permissions.test.ts` pins stay
  green); the text and the closure are the system's acts. ⛔ No change to the refusal writer, the reason codes, the one-journey appeal rule,
  6.19c's closures or refile guard, the warning kinds, the bank/name checks, or 6.20's determination. ⛔ No `apps/public` change.
- **RF14 — PER Q1's ANSWER** (the author-commit records which applies once the Panel rules; ⛔ none is built before):
  · **C** — nothing more (RF5's meanwhile IS C).
  · **A (a time limit, N days)** — the limit counts IST calendar days from the refusal's `decided_at`; `assertAppealInitiable` refuses a
    claim whose live decision is `-239` past it (new typed error → 409 `appeal.suspicion_refusal_appeal_time_limit_passed`, admin words);
    RF1's `appeal` gains `'time_limit_passed'` (treated as decided by RF5); the per-death advisory key of RF15 is taken; the member/helpline
    appeal surfaces show the limit.
  · **B** — `appeal_not_filed` ⇒ ⛔ no wait; `assertAppealInitiable` refuses a `-239` refusal once any other claim of the death has reached
    `state_trustee_approved`; RF15's key is taken.
- **RF15 — THE PER-DEATH KEY (only under Q1 A or B).** A dedicated transaction advisory key `suspicion-appeal:<pariwar>:<deceased>`, taken
  by RF5's conjunct (after the caller's own locks) and by `initiateAppeal` AFTER its own `appeal:` lock and claim-row lock, only when the
  refusal is `-239`. The holder of this key ⛔ never then waits on a claim lock. ⛔ Never the intake lock (`acquireIntakeLock` is taken by
  `tryConverge`, which can insert against a held claim — a cycle). Under C there is ⛔ no race (`upheld_final` is terminal) ⇒ ⛔ not built.
- **RF16 — STALE TEXT IS CORRECTED WHERE IT LIVES** (⛔ never a standalone edit of a merged story above its Change Log): the T17 sentence in
  `nominee-refusal-read.ts:19-23`, `icp.ts:116`'s comment, `refile-guard.ts:10-12` and `claims.refile-confirmation.handlers.ts:10` (the
  *"Row 6-24 edits this"* notes — reworded to what 6.24 did), the strip note and its test (`apps/admin/tests/ConvergenceDecisionStrip.test.tsx:66-67`). 6.20's
  story gains a Change Log row only.

## ⭐ FOUND FACTS (F1–F15; ⛔ not decided — each with its build response)
- **F1** — the (3b) swallow (Fact 1) ⇒ RF2 at the candidate.
- **F2** — ⛔ no appeal deadline (Fact 2) ⇒ Q1; RF5 meanwhile.
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
- **F15** — **the refile wizard shows the DISCARDED nominee** (validator M11): its nominee-review and contact steps read `nomineesStatus()`
  — the latest projection (`apps/mobile/app/(claim)/contact.tsx:8,131`) — so the true nominee's refile shows, and its contact record may
  link the claimant to, the version the District Admin discarded. ⚠ ⛔ No ruling covers what the wizard shows ⇒ ⛔ not built here; the
  refile's own determination (6.20 D17, per claim) still decides who is paid. Recorded as a `deferred-work.md` item (Task 8.1) with its
  trigger: any story that touches the wizard's nominee steps, or a ruling on it.
- **F14** — **Ravi-mode reality (recorded, ⛔ not reopened):** the app session that requests the filing code is the DECEASED's account,
  whose login code goes to the deceased's registered mobile — in the Panel's scenario, the phone the person who changed the nominee holds.
  FQ6 therefore stops THAT person from filing again in the app (the code now reaches the true nominee, ⛔ not them); the true nominee files
  in the app only with access to that session, else through the helpline (which has ⛔ no handover code — `claims.helpline.routes.ts:14`).
  The masked last-4 shown to the phone holder becomes the true nominee's — it tells them only that a refusal exists, which they know.

## Acceptance Criteria

### AC0 — Governance (Task 0)
The Panel note `trustee-panel-routing-note-2026-10-07-6-24-appeal-never-filed.md` (Q1, Q2) is put (or answered — then transcribed into its
⏳ block and recorded as its own decision, committed ALONE); the author-commit (RF1–RF16, F1–F15 by reference, Q1's / Q2's state and RF14's
applicable arm)
is in `.decision-log.md`, committed ALONE before any code; `epics.md` carries `### Story 6.24`; work is on
`story/6-24-true-nominee-refile-after-a-suspicion-refusal`. ⛔ No code before.

### AC1 — Kept apart (D4 B; RF1, RF2, F1, F7)
**Given** a claim S for a death, refused by the District Admin with `post_death_nominee_change`, **when** a new filing for that death
arrives through the app or the helpline — on the SAME channel as S or a different one, with S in `denied`, `appeal_stage_1`, `appeal_stage_2`
or `appeal_stage_3` — **then** a NEW claim is minted (`minted: true`), ⛔ never S's id and ⛔ never a pending attempt against S; the pending
strip lists ⛔ no attempt against S; `confirmMerge` onto S is refused. **And** a filing for a death whose only refusal is ANY OTHER reason, or
whose `-239` refusal was REVERSED on appeal, behaves exactly as today. **And** a revision of S's reason off `-239` makes S a candidate again;
onto `-239` makes it ⛔ not one. **And** the T17 spec is amended (F7), the strip note reworded.

### AC2 — The wait at final approval (FQ5; RF3, RF5, F4, F9)
**Given** S's refusal stands and its appeal is `not_filed` or `open`, **then** a final approval of any other claim R of the death — the State
Trustee vote, R9 finalize, the Super Admin's full and `-251` waived approves, the Pariwar Admin's "no correction needed" approve — answers
409 `<prefix>.suspicion_appeal_pending` with `details.reason` (`appeal_not_filed` | `appeal_open`), ⛔ never a 500 and ⛔ never a denial;
**and** the District Admin's approval of R (P1) is ⛔ not held by it. **Given** S's appeal is `upheld_final`, R's final approval proceeds
(its other conjuncts unchanged). **And** the conjunct sits after the ground-inspection conjunct and before the late-warning wait, which stays
LAST (a test: a claim failing both answers the suspicion 409; a claim failing only the late wait still answers the late-warning 409). **And**
`step` is REQUIRED (a compile-time pin: an omitted `step` is a type error). **And** one HTTP test per final-approval route (five).

### AC3 — Closed when the appeal is allowed (FQ5; RF4, RF6, F5, F8, F13)
**Given** S's appeal is allowed at stage 1, stage 2 or stage 3, **then** in the SAME transaction every other claim of the death in a
CLOSABLE state — incl. `denied`, `appeal_stage_1..3` (its anchor → `closed`) and `reversed` — moves to `closed` through `claim.closed`
(`trigger: 'suspicion_appeal_allowed'`, `held_by_claim_case_id = S`); a claim already `settled` / `approved` / `state_trustee_approved` is ⛔
not moved and is recorded (log + audit); a closed claim's live return / run / R9 / appeal-panel sessions are ended (⛔ no reminder text after
`closed` — a test); a closed claim ⛔ never stands (RF1) — so the reversed S's own final approval is ⛔ never held by it (a test with a second
`-239` refusal of the death, closed by S's reversal); two concurrent reversals of one death serialise (⛔ 40P01). **And** a reversal of a refusal
with ANY OTHER reason closes ⛔ nothing. **And** `closed` is terminal, ⛔ not appealable (`initiateAppeal` → the existing not-denied 409),
⛔ never a closures row, ⛔ never `denied_no_appeal`; the closed stream unfreezes (S's freeze stands while S is live). **And** the event-count
pins move 35 → 36 with the reason; the contracts mirror and its lockstep test and the events registry gain `closed`; every state LIST
found by Task 3.0's grep is decided and recorded (⛔ no map is typecheck-forced); the refile guard lets a death with a `closed` claim re-file
(a test). **And** 6.26b's leg (e) is re-derived (F8), ⛔ never weakened.

### AC4 — The commit re-checks (RF7; P5; discharges the deferred item)
**Given** R is `state_trustee_approved` and, before the cycle commit, a `-239` refusal starts to stand on another claim of the death (a
revision ONTO `-239` of a `denied` claim — reachable, F3) **or** R's inherited visit vanishes (the source's refusal revised away), **then**
`commitCycleFreeze` skips R and keeps it `state_trustee_approved` (⛔ no `claim.approved`), and commits it on a later run once the condition
clears. A normal claim commits exactly as today. The deferred item is marked DISCHARGED (appended, ⛔ never deleted).

### AC5 — The inheritance (RF8)
A reversed `-239` refusal is ⛔ no longer an inheritance source (the refile, if any, is `closed` — AC3); a standing or `upheld_final` one still
is. 6.26a's and 6.26b's inheritance specs stay green except those re-derived under F8.

### AC6 — The filing code (FQ6; RF9, F6, F10, F14)
**Given** the deceased's declaration had version 1 (nominee A, mobile …1111) and a post-death version 2 (nominee B, mobile …2222), and the
District Admin's determination on claim S marks v1 `stands` / v2 `discarded`, and S is refused `-239`, **when** the Ravi-mode session
requests the handover code, **then** it goes to …1111 (the masked hint ends 1111), the audit carries `recipient: 'at_death'` and ⛔ no
number. **Before** any refusal, and **after** S's refusal is reversed, the code goes to the latest nominee as today (`recipient: 'latest'`).
**Given** a standing refusal whose determination is ⛔ not `effective`, or whose rank-1 mobile is null / erased / unsendable, **then** the
response is the existence-defended no-op (identical shape and timing pad) — ⛔ never …2222. A two-nominee effective set sends to rank 1.

### AC7 — The text (FQ7; RF11)
**Given** a standing `-239` refusal, **when** the sweep runs, **then** ONE notice row is written and one text is sent to the refused claim's
rank-1 effective nominee, in Hindi (RF11), naming the member in the Pariwar's mode-resolved form (`-181`), carrying the helpline number; ⛔ no
plaintext number or name is stored, logged or audited. A second run sends ⛔ nothing; a refusal revised away before the sweep's locked
re-check sends ⛔ nothing; a revision away and back ⛔ never re-texts; a non-effective determination or unusable mobile records
`no_target`; a crash after the claiming commit is reclaimed by the next run. **With the DLT template ids unset** (as shipped), the send fails closed (`error` + alarm) — ⛔ never a send on a
wrong template. The SIBLING registry's lockstep test (6.19's stays unchanged), `i18n-parity`, `microcopy`, `pii-scrape` and the Hindi marker pass; the DLT request
sheet and the go-live roster gain their rows (counsel basis for FQ7 — a NEW row, ⛔ not Row 18, which is the filer's agreement; and the
Hindi review row).

### AC8 — What people see (RF10, RF12)
The District Admin's console shows the kept-apart line and the wait line (or *"could not be checked just now"* on a failed read) with ⛔ no
name and ⛔ no note; the read is counted (ceiling bumped, exact `toBe`). The 409's words render on every later surface through the existing
translators. A `closed` claim shows *"This claim has been closed. Please call the helpline."* (en + hi) through the family status read (mobile) and in
the helpline read-back, which now lists the member's `closed` claims; ⛔ no member-facing string mentions suspicion, fraud, a changed nominee or a name (a test greps the new strings).

### AC9 — Nothing else moves (RF13)
Permission catalog version and key count unchanged; ⛔ no new reason code; 6.19c's closure / refile-guard / appeal-closed paths unchanged
(their specs green); ⛔ no `apps/public` file changes (`git diff --name-only 6bb79afd..HEAD -- apps/public` empty).

### AC10 — The proof
Every test below passes; each load-bearing test is red-checked (revert the line, watch it fail, restore — listed in the Debug Log);
`pnpm ci:local` green with `DATABASE_URL` at :5433 (domain, API, jobs, admin, mobile, contracts, i18n, microcopy); migrations 0150 and 0151
applied to BOTH :5432 and :5433, the enum value and the CHECKs verified by name on each.

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0)** ⛔ no code before 0.4 is committed
  - [ ] 0.1 `git fetch origin`; `git merge-base --is-ancestor 6bb79afd HEAD`; `git diff --name-only 6bb79afd..HEAD -- packages apps scripts`
    — re-read every cited file it lists ([[feedback_git_fetch_before_remote_reasoning]]). Confirm ⛔ no decision after `-290` touches the
    gate, convergence, the appeal, the handover OTP or rows 6-25 / 6-27; if row 6-25 or 6-27 landed first, rebase onto its conjuncts —
    ⛔ none drops another's check (`-277` Consequence 2, `-282` Consequence 4).
  - [ ] 0.2 Q1 / Q2: if the Panel has answered, transcribe the answer into the note's ⏳ block and into `.decision-log.md` as its own
    decision (verbatim, *"does NOT cover"*), committed ALONE. If not, the note stays put and the meanwhile is built (Q1 → C, RF5; Q2 → A, RF12).
  - [ ] 0.3 Re-validate every RF against the code at HEAD (a fresh-context validate is offered to BigDev — rounds until one finds ⛔ no
    BLOCKER / HIGH; a pass that writes a decision re-validates THAT decision — [[feedback_story_validate_footguns]]).
  - [ ] 0.4 The author-commit — RF1–RF16 verbatim from this file, Q1's / Q2's state and RF14's applicable arm, F1–F15 by reference — committed
    ALONE (`governance(6.24): …`) ([[feedback_governance_commits_precede_implementation]]). If 0.2 recorded an answer, RF14's arm is IN it.
  - [ ] 0.5 Re-check the Policy-meaning sentences (P1–P5) against the commit and Q1's answer; edit P1 if Q1 ≠ C.
  - [ ] 0.6 `epics.md` — `### Story 6.24` after `### Story 6.26b` (the Minted-by header, the 6.23b / 6.26b shape: `-261` D4 B, `-262` FQ5–FQ7,
    the author-commit, the go-live coupling line for FQ7), its own `governance(6.24)` commit.

- [ ] **Task 1 — Migrations (AC3, AC7, AC10; RF4, RF11)**
  - [ ] 1.1 `0150_claim-closed-enum-values.sql`: `ALTER TYPE "claim_lifecycle_state" ADD VALUE IF NOT EXISTS 'closed';` and
    `ALTER TYPE "appeal_journey_status" ADD VALUE IF NOT EXISTS 'closed';` (the 0146 `IF NOT EXISTS` form; confirm the enum's DB name in
    its creating migration) — ⛔ nothing else in the file (Trap 6). Journal idx 150, `when` > 0149's `1793590800000`.
  - [ ] 1.2 `0151_claim-suspicion-refusal-notices.sql`: the RF11 table, composite FK `(pariwar_id, claim_case_id)` → `claims` (the 0143
    UNIQUE target), the status CHECK, the UNIQUE, RLS policy + `twt_app` grants exactly as 6.19b's `claim_correction_reminders` (read its
    migration — `SELECT, INSERT` + `UPDATE` on the outcome columns only). ⛔ Nothing references `'closed'`. Journal idx 151.
  - [ ] 1.3 Drizzle schema: `CLAIM_LIFECYCLE_STATES` (`schema/claims.ts:73`) + `closed`; `APPEAL_JOURNEY_STATUSES` (`appeal.ts:71`) and its
    contracts mirror + `closed`; new `schema/claim_suspicion_refusal_notices.ts` (`as const` status tuple +
    LOCKSTEP comment); export from the schema index. Apply both to :5432 AND :5433 ([[project_live_db_test_gotchas]] — ⛔ never regenerate,
    ⛔ never DROP SCHEMA); verify `enum_range(NULL::claim_lifecycle_state)` and the CHECK names on each. ⚠ An FK to `claims` can trip the
    TRUNCATE-lock spec — that is the story's, ⛔ not a flake ([[project_fk_truncate_cascade_deadlock]]).

- [ ] **Task 2 — Domain: the standing refusal and convergence (AC1, AC5; RF1, RF2, RF8, RF16)**
  - [ ] 2.1 `claim/suspicion-refusal.ts` — RF1's fragment, `readStandingSuspicionRefusals`, `suspicionAppealWaitState` (pure), exported via
    `claim/index.ts`. Unit table for the pure helper (not_filed / open / upheld_final / reversed-absent / several refusals / self excluded).
  - [ ] 2.2 `icp.ts` — RF2 in `getConvergenceCandidate` AND `getPendingIntakeAttempts`' JOIN (raw SQL, explicit aliases).
  - [ ] 2.3 `getClaimByDeceasedMember` (`read.ts:119-123`): list every caller (`grep -rn "getClaimByDeceasedMember" packages apps`), decide each
    per RF2, record the list in the Debug Log.
  - [ ] 2.4 `nominee-refusal-read.ts` — `inheritedGroundInspectionSourceSql` reads RF1's fragment (RF8); the T17 header sentence reworded (RF16).
  - [ ] 2.5 Live-DB specs (`packages/domain/tests/integration/claim/`): AC1's matrix (same channel / other channel × `denied` /
    `appeal_stage_1..3`; other-reason refusal converges; reversed converges; revision off / onto `-239`); the AMENDED T17 spec (F7); AC5.
    ⚠ Drive states through the REAL writers (`initiateAppeal`, `reviewAppealStage1`, …) — a forced `current_state` does ⛔ not survive
    `projectClaimState`'s replay; where a spec forces a state today (`forceState`), keep it only where the writer path is ⛔ not the subject.

- [ ] **Task 3 — Domain: `closed` (AC3; RF4, RF6, F13)**
  - [ ] 3.0 FIRST, the two enumerations RF4 / RF6 require, recorded in the Debug Log: every literal state LIST (and its decision) and every
    table with a live row keyed on a claim (and how RF6 ends it, or why it is inert / a residual).
  - [ ] 3.1 `claim/state.ts`: the `claim.closed` transition from each CLOSABLE state (the transition table ~:360-395); `CLAIM_TERMINAL_STATES`
    + `closed`; `claim/events.ts` `CLAIM_EVENT_TYPES` + payload type; `packages/events` registry; `member/overlay.ts`
    `ACCOUNT_UNFREEZE_EVENT_TYPES` + `claim.closed`. Pins 35 → 36 (every `toHaveLength(35)` twin, with the reason appended).
  - [ ] 3.2 `closeClaimsHeldBySuspicionAppeal` (in `suspicion-refusal.ts`, or a sibling `-persist` module if NW1's import scan forbids
    `events.ts` in the read module — it will: keep the READ module free of `claim/events.ts`), called from the three reversal sites.
  - [ ] 3.3 Specs: stage 1 / stage 2 / stage 3 reversal each close R in the same transaction (R in `verification_in_progress`, `denied`,
    `appeal_stage_1` — its anchor → `closed` —, `reversed`) (assert R's state AND that a rolled-back
    reversal leaves R untouched); other-reason reversal closes ⛔ nothing; R in `state_trustee_approved` is ⛔ not moved and is logged;
    `initiateAppeal` on a closed R → not-denied 409; overlay: R's stream resolved, the member stays frozen while S lives; `closed` ⛔ never a
    candidate (`CLAIM_TERMINAL_STATES`). F8's re-derived leg (e) + the new *"reversal ⇒ closed"* leg.

- [ ] **Task 4 — Domain: the gate and the commit (AC2, AC4; RF5, RF7)**
  - [ ] 4.1 `ClaimApprovalGateOptions.step` (REQUIRED) + the six call sites; `assertSuspicionAppealDecidedForFinalApproval` in the OUTER gate
    at RF5's position; `SuspicionAppealPendingError` in `claim/errors.ts` (exported).
  - [ ] 4.2 `commitCycleFreeze` — RF7's two skip-and-keep re-checks after `hasLiveReturnRow`.
  - [ ] 4.3 Fixtures: the shared approve-path seed (`seedNomineeNameCheck`, both copies — [[feedback_story_validate_footguns]] "grep TESTS for
    twins") needs ⛔ nothing new by default (⛔ no other claim of the death ⇒ ⛔ no wait); grep every spec that files TWO claims for one death
    and reaches a final approval — each now waits or is re-derived.
  - [ ] 4.4 Specs: each final writer waits (`appeal_not_filed`, `appeal_open`) and proceeds on `upheld_final`; P1 ⛔ never waits; the order
    test (AC2); AC4's two legs (the revision onto `-239` is REAL — `reviseDecision` on a `denied` claim; the vanishing inheritance by
    revising the source off `-239`) — the commit leg runs in its own committed transactions where an ORDER matters
    ([[project_db_clock_ordering_tests_tie]]).

- [ ] **Task 5 — API (AC2, AC6, AC8; RF5, RF9, RF10)**
  - [ ] 5.1 One shared message helper for `SuspicionAppealPendingError` (the `ground-inspection-required-message.ts` pattern, an exhaustive
    `Record<reason, string>`); mapped in all four translators (F9) → 409 `<prefix>.suspicion_appeal_pending`.
  - [ ] 5.2 `sendHandoverOtp` — RF9 (domain `readSuspicionRefusalRecipient` in `suspicion-refusal.ts`; the API reads + decrypts the version
    mobile); the audit's `recipient` field.
  - [ ] 5.3 The verifier console section (RF10) under `underSavepoint`; `VERIFIER_CONSOLE_MAX_READS` bump + ledger line + exact `toBe`.
  - [ ] 5.4 Specs (`apps/api/tests/integration/claims/`): five final-route 409s (beside `ground-inspection-required-routes.spec.ts`); AC6's
    four legs incl. the no-op shape + timing (assert the response is byte-identical in shape to the ⛔-nominee branch); the console lines and
    the failed-read line.

- [ ] **Task 6 — Jobs: the text (AC7; RF11)**
  - [ ] 6.1 The sweep module + its registration in the scheduler (beside 6.19b's — read `apps/jobs/src/boot.ts:591-612`); the domain reads
    it needs (the standing refusals without a notice row; the recipient — RF9's read; the member's name decrypt through the 8.8 jobs path).
  - [ ] 6.2 The SIBLING registry (RF11) + config keys; its own lockstep test (6.19's untouched); the shared send core extracted; the DLT request sheet rows; the go-live roster rows
    (`docs/launch-gate-inventory/inventory-roster.md` — counsel basis for FQ7, the Hindi review).
  - [ ] 6.3 Specs: AC7's legs incl. the locked re-check (revise away between selection and lock), once-ever, fail-closed on unset template
    ids, the error classification (invalid number / carrier reject / transient), ⛔ no plaintext anywhere (assert the row's columns and the
    captured logs).

- [ ] **Task 7 — Contracts, i18n, admin, mobile (AC3, AC7, AC8; RF4, RF10, RF11, RF12)**
  - [ ] 7.1 Contracts: `ClaimLifecycleState` + `closed` (`filing.ts:47-62`) and its lockstep test; any 409-code union the admin client keys on;
    run the contracts vitest — its tests are outside tsc ([[project_contracts_tests_outside_tsc]]).
  - [ ] 7.2 i18n: the SMS copy key (en + hi, Hindi marker); the closed-claim status words (en + hi) through the real `t()`
    ([[feedback_stub_must_call_not_transcribe]]); `classification.json`.
  - [ ] 7.3 Admin: the console section words; the 409 words; the strip note (RF16) and its test.
  - [ ] 7.4 Mobile: the family status's `closed` rendering (RF12); `lib/appeal-status.ts` checked; the entry routing (RF2 v1.1) through the
    server's outcome — verify `fetch-claim-entry-outcome.ts` and `app/(claim)/index.tsx`; the helpline read-back lists `closed` (RF12).

- [ ] **Task 8 — Records and proof (AC9, AC10)**
  - [ ] 8.1 `deferred-work.md`: F15 as a new item; the two items DISCHARGED / partly discharged (RF7, RF8 — appended lines, ⛔ never deleted
    [[feedback_closure_language_precision]]); a 6.24 section for anything deferred.
  - [ ] 8.2 6.20's story: one Change Log row (T17 superseded as built by 6.24). The stale code comments (RF16).
  - [ ] 8.3 `pnpm ci:local` with `DATABASE_URL` at :5433; the red-checks in the Debug Log; `sprint-status.yaml` via the safe prepend
    ([[project_sprint_status_safe_prepend]]); commit on the story branch ([[feedback_commit_on_story_branch]]).

## Dev Notes

### Traps
1. **Building D4 B in `tryConverge`'s branches instead of the candidate** — (3b) would still swallow. Fix the candidate; both mirrors.
2. **Reading the refusal without the appeal anchor** — a reversed claim still has its live `-239` row (F3). Always RF1.
3. **A `created_at` ordering for "the refile"** — the inheritance orders by claim creation, ⛔ not refusal time; RF3 deliberately has ⛔ no
   ordering for the wait / closure. Don't add one.
4. **Holding the District Admin** — `step` exists so P1 is ⛔ never held. A test pins it.
5. **Placing the conjunct LAST** — the late-warning wait stays last (6.23b EA2); the existing late-wait specs pin its 409.
6. **Using `'closed'` in the migration that adds it** — Drizzle applies all pending files in ONE transaction; `ADD VALUE` can't be used in the
   same transaction (55P04). 0150 is the `ALTER TYPE` alone; ⛔ no CHECK, index or default anywhere in 0150/0151 names `'closed'`.
7. **Writing a 6.19c closures row, `state_trustee_denied` or `denied_no_appeal` for "closed"** — forbidden (Fact 5); it would make the refile
   a refusal and arm the refile guard.
8. **A lock cycle.** Reversal: refused S → held R. ⛔ Nothing may lock R then S: the gate and the commit only READ S's decision and anchor
   (plain `SELECT`, ⛔ `FOR SHARE`). Under Q1 A/B, RF15's per-death key is taken AFTER the caller's own locks and its holder never waits on a
   claim lock; ⛔ never reuse `acquireIntakeLock` (`tryConverge` holds it and can insert against R — an FK `KEY SHARE`).
9. **A held claim already past `state_trustee_approved` when S is reversed** — unreachable under C (it could ⛔ not pass the vote while S's
   refusal stood); reachable under B. RF6 records it, ⛔ never moves an approved/settled claim.
10. **The latest-nominee fallback** — after a standing refusal ⛔ never `getMemberNominees`; `none` ⇒ the no-op (invariant 5).
11. **Reusing `readCorrectionRecipients` for FQ7** — it keys on the filer's agreement/contact record, which on S may be the person who made the
    change (F10 / RF11).
12. **Decrypting in the wrong layer / leaking the number** — the API decrypts with `decryptNomineeField`; jobs with the domain helper; the
    domain read modules never decrypt or import `claim/events.ts`. ⛔ No number, name or code in a log, audit, payload or job data.
13. **Texting on the decision event** — a revised decision would text wrongly or twice. The sweep re-checks RF1 under the claim lock; the
    UNIQUE makes it once ever.
14. **The `[member]` placeholder** — the Pariwar's MODE-RESOLVED form (`-181`, `resolveMemberFacingDeceasedName`), ⛔ never a hard-coded
    form; ⛔ never stretch the 6.19 registry (its D33 *"⛔ No name"* pin stays) — a sibling registry.
18. **Closing R but leaving its processes running** — the 6.19b sweep never reads the state; Task 3.0's enumeration is the guard.
19. **A closed claim that still "stands"** — RF1's `current_state <> 'closed'` leg; without it a closed second refusal holds S for ever.
15. **A pin weakened instead of re-derived** — F7 / F8 specs are AMENDED to the new rule with their purpose intact; record each.
16. **A forced state in a live spec** — `projectClaimState` replays events; drive appeal stages through the real writers.
17. **JSDoc closed by Markdown** — `**cl.3**/**…` contains `**/`; grep `\*\*/` after any doc-block edit ([[project_markdown_emphasis_closes_jsdoc]]).

### Testing
- **Domain unit:** `suspicionAppealWaitState` table; the state-transition table for `claim.closed` (every CLOSABLE from-state; the five
  non-closable refused); NW1 import scan green; event-count pins 36.
- **Domain live-DB (RLS, `setupLiveDb`):** AC1 matrix, AC3 per stage, AC4, AC5; ordering-sensitive legs in their own committed transactions.
- **API live-DB:** five final-route 409s; AC6; console section; the convergence handlers' D4 behaviour over HTTP (one member-app same-channel
  refile spec — the F1 swallow).
- **Jobs:** AC7 incl. the locked re-check and fail-closed.
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
  Consequence 3 · `-277` Consequence 2 · `-282` GI1, GI2, Consequence 4 · `-285` · `-253` M · `-229` / `-230` / `-231` (Q1's 90 days).
- Routing notes: `trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ5 rider scenario, round 2; FQ6/FQ7 gaps) ·
  `trustee-panel-routing-note-2026-10-07-6-24-appeal-never-filed.md` (Q1).
- Story files: `6-20-…` (D14, D16, D17, T8/P2, T17, AC13) · `6-26-…` (GI1–GI3, Fact 3, Task 0.1) · `6-26b-…` (AC8, `-290`) · `6-23b-…` (EA2,
  Trap 9) · `6-19c-…` (the refile guard, its *"6-24"* notes) · `6-19b-…` (the SMS path) · `6-16-…` (D-E, D-F, the appeal writers).
- `deferred-work.md`: *"An inherited visit that vanishes after the final vote is ⛔ not re-checked at the cycle commit"* · *"`-239` inheritance
  source: an appeal-overturned refusal is never superseded…"* · the two-live-claims residual (6.20's correction-visibility item).
- `docs/legal/niyamavali.md` Part 9, §8.8 · `docs/launch-gate-inventory/inventory-roster.md` (Rows 18–21) · `dlt-template-requests-6-19.md`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-07 | Created (`bmad-create-story 6.24`), pinned `6bb79afd`. Four read-only research passes; load-bearing cites re-read. RF1–RF16 PROPOSED (author-commit owed at Task 0.4). Q1 (the never-filed appeal) routed to the Panel — `trustee-panel-routing-note-2026-10-07-6-24-appeal-never-filed.md`; built meanwhile as C. Split offered (FQ6/FQ7 do ⛔ not depend on Q1). backlog → ready-for-dev. |
| 1.1 | 2026-10-07 | Checklist validate (one fresh-context read-only validator, ~35 cites spot-checked; 0 BLOCKER, 5 HIGH, 6 MEDIUM, 4 LOW — all applied). HIGH: a closed claim ⛔ never stands and `denied` / appeal-stage / `reversed` held claims are CLOSABLE (an appeal anchor → `closed`) — else a double payment or an endless wait (RF1, RF4); closing ends the claim's live processes (RF6); the member app's entry routing would hide the wizard during the appeal (RF2); the member is named MODE-RESOLVED (`-181`), ⛔ not first name + initial (RF11, the Panel note corrected before it is put); a SIBLING SMS registry — 6.19's D33 *"⛔ No name"* pin stays (RF11). MEDIUM: ⛔ no typecheck-forced state map — an enumerated grep (Task 3.0); the real family / helpline surfaces (RF12); Q2 ROUTED to the Panel (the closure notice — v1.0 called it both "open" and "ours"); the notice table mirrors 6.19b's 0128 (⛔ no stranded row); a per-death reversal key (⛔ 40P01); F15 (the wizard shows the discarded nominee). LOW: NW1's fixed list, citation slips, `readGroundInspectionApprovalFacts`, `-290` M1's premise, `ADD VALUE IF NOT EXISTS`, the parked attempt. |
