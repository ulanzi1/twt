---
baseline_commit: 34b9bab6
---

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.28`) to `main` at `34b9bab6` (the 6.27 / 6.30 SHA-map commit after PR #268). Every `file:NNN`
below is AS OF `34b9bab6`, derived by three read-only research passes (the approval writers and their locks; the reachability of two
live claims for one death; the money path from approval to payment) and spot-checked by hand (the gate, `icp.ts`'s window, the spawn's
dedup, the claim indexes, RF6's `-239`-only early return, the closure-text selector). ⚠ Before Task 1, run
`git diff --name-only 34b9bab6..HEAD -- packages apps scripts`; any cited file in that list is re-read.

STATUS: `ready-for-dev` — ⛔⛔ NO CODE until (1) the Panel has ruled Q1–Q3 (routing note
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` — ⚠ written, ⛔ NOT YET SENT) and
(2) the author-commit answering OP1–OP12 below is committed ALONE. `2026-10-08-294` §3 orders exactly this: *"BEFORE any code: (i) the
Panel question … (ii) then the engineering guard that ruling permits."* ([[feedback_governance_commits_precede_implementation]]).
⭐ The OPs are written for the note's RECOMMENDED answers (Q1 A, Q2 A, Q3 A); `## ⚖️ Build decisions` states, per OP, what changes under
each other answer. If the Panel rules Q1 C, this story builds ⛔ nothing and ends as a zero-code story (Task 0 only).

GLYPH REGISTER, ADDRESSING RULE: as 6.24a / 6.24b / 6.29 — `⛔` sits ONLY on a negation word · `⭐` = key fact or action · `⚠` = hazard.
Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — cite the entry id / item / row key). `file:NNN` is used ONLY for code.
LETTERS: `OP1`…`OP12` = this story's build decisions (the author's; PROPOSED until Task 0.5). `F1`…`F14` = FOUND facts (⛔ not decided).
`Q1`…`Q3` = the Panel's questions (⏳ awaiting). `RF` = 6.24a's (`-292`, `-294`).
-->

# Story 6.28: One Payment per Death — Once a Claim for a Death Is Finally Approved, ⛔ No Other Claim for That Death Can Be, and Every Other Is Closed `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Nothing today stops two claims for the same member's death from both being finally
> approved — and each approved claim takes its own pool, so the members pay twice for one death, out of what the other bereaved
> families in that cycle receive, straight into a second set of bank accounts, with ⛔ no way back (F1–F4). `2026-10-08-294` found this
> around the suspicion-refusal path (6.24a's RF6 is the only control, and three paths pass it); this story's research found the
> SIMPLEST path needs ⛔ no refusal at all: a second filing more than 30 days after a still-open claim, or a staff *"treat as separate"*
> (F5–F8). The story first puts the Panel question `-294` §3 requires — **which claim is paid, what the other family is owed, and is it
> told** — and then builds the ONE guard the ruling permits: under the recommended answers, a claim can ⛔ never be finally approved
> while another claim for the same death is finally approved (one conjunct in the one approval gate, serialised by the per-death key the
> gate already takes), the cycle commit re-checks it, every other open claim for that death is closed, and every approver is warned
> while another claim for the death is open. ⭐ **The system still refuses nothing a family is owed**: a closed claim is ⛔ never a
> refusal and ⛔ never appealable; the suspicion case keeps `-262` FQ5 exactly.

> ⭐ **What already exists — rebuild ⛔ none of it:** the one approval gate `assertClaimApprovable` and its six call sites (6.20 / 6.23a /
> 6.26a / 6.24a); RF15's per-death advisory key, taken UNCONDITIONALLY at `step === 'final'` (`suspicion-refusal.ts:338,355,372-381`);
> `closed` + `claim.closed` and RF6's closure helper with its live-process teardown (`suspicion-refusal-persist.ts`); the 6.23a / 6.23b
> warning machinery (kinds, keys, the reason-and-note coverage, the late-warning wait); the closed-claim screen and copy (`closed.*`,
> `apps/mobile/app/(claim)/closed-helpline.tsx`); `commitCycleFreeze`'s skip-and-keep re-check loop (RF7).
> ⭐ `epics.md` gains `### Story 6.28` NOW (`-294` Consequence 3: *"when `bmad-create-story` runs"*). Row
> `6-28-one-payment-per-death-second-approval-guard`.

> ⚠⚠ **FIVE FACTS — read before anything else** (derived at `34b9bab6`).
> 1. ⚠⚠ **The money ⛔ cannot come back.** `planCycleSpawn` (`packages/domain/src/pool/spawn.ts:285-290`) makes ONE pool per committed
>    claim and refuses only a repeated `claimCaseId`; ⛔ nothing in `pool/` reads `deceased_member_id` (`git grep` — EMPTY). Members pay
>    the claim's nominee accounts directly (`-192`; `claim_nominee_bank_accounts`, claim-scoped). ⇒ the guard must act BEFORE the
>    second claim reaches `state_trustee_approved` — ⛔ never a clean-up after.
> 2. ⚠⚠ **The simplest path has ⛔ no refusal.** `getConvergenceCandidate` (`claim/icp.ts:109-139`) looks back only
>    `CONVERGENCE_WINDOW_DAYS = 30` (`:66`) from the OLD claim's `created_at`; ⛔ no intake handler checks for a live claim first ⇒ a
>    second filing 31+ days after a still-open claim mints a second live claim. Both pass every gate conjunct (F9).
> 3. ⚠⚠ **RF15's per-death key is ALREADY taken by every final approval** — `assertSuspicionAppealDecidedForFinalApproval` takes it
>    unconditionally, FIRST, before reading anything (`suspicion-refusal.ts:372-381`), and every final writer runs at READ COMMITTED
>    (6.24a RF5 v1.3, confirmed by its dev). ⇒ two final approvals of one death ALREADY serialise; a new conjunct placed AFTER it, reading
>    with a fresh statement, sees the other's commit. ⛔ No new lock is needed for the core guard (OP2).
> 4. ⚠⚠ **⛔ No approval writer may take the INTAKE key** — the gate runs after the caller's claim-row lock, and the repo-wide rule
>    (`suspicion-refusal-persist.ts:99-108`, `-294` §1) is: ⛔ nobody holding a claim row, an `appeal:` / `r9:` / trustee key or a
>    `suspicion-*` key may then ask for the intake key. ⇒ closing the OTHER claims (OP4) can ⛔ never happen inside an approval
>    transaction — it runs in its OWN transaction, intake key FIRST (RF6's order).
> 5. ⚠⚠ **The closure text selects on the TRIGGER, ⛔ never the state alone** — `closedByAppealSql` (`claim/suspicion-notice.ts:237-245`) matches
>    `claim.closed` with `trigger = 'suspicion_appeal_allowed'`. ⇒ a new trigger value (OP4) sends ⛔ no `-291` Q2 B text unless this story
>    adds it — which is exactly Q3. A test pins it (AC6).

## Story

As the **Trust and its members**,
I want **a member's death to be paid once — a second claim for the same death never finally approved once one is, and closed rather
than left open**,
so that **the members never pay twice for one death out of what other bereaved families receive, while ⛔ no family is refused or
accused by the system, and the suspicion case keeps the rule the Panel already made.**

## The rulings this story builds

| Ruling | Key | Status |
|---|---|---|
| `2026-10-08-294` §2 | Trap 9's *"unreachable"* CORRECTED — paths (a)–(c) + the pre-6.24a root reach two payments for one death | author-commit (FOUND) |
| `2026-10-08-294` §3 | row `6-28-…`; *"BEFORE any code: (i) the Panel question — when two claims for one death both qualify for payment, which is paid, and what is the other family owed? … (ii) then the engineering guard that ruling permits"* | author-commit — ⭐ this story's mandate |
| `-262` FQ5 A | the true nominee's claim waits at final approval for the suspicion appeal; allowed ⇒ it is closed | ⭐ Trustee-ratified — ⛔ not re-opened; OP2 / OP5 / OP6 leave it exact |
| `-262` FQ5 C (⛔ not taken) | *"Whichever claim is approved first is paid, and the other is closed"* — *"A race between staff"* | ⭐ the Panel's earlier rejection — disclosed in the note (Q1 A resembles it) |
| `-264` FQ12 | approving while ANY warning shows needs a reason and a note | ⭐ Trustee-ratified — OP5's new kind falls under it |
| `-277` Q3 B | a warning that appears after the District Admin approved needs their reason and note too (6.23b's wait) | ⭐ Trustee-ratified — OP5's kind enters the wait |
| `-291` Q2 B | the closure text after an allowed suspicion appeal | ⭐ Trustee-ratified — ⛔ not extended to OP4's closure unless Q3 B |
| **Q1** (routing note `2026-10-10-6-28-one-payment-per-death`) | which claim is paid — A: the first finally approved; others closed; a warning while another is open · B: staff close one first · C: both | ⏳ **AWAITING PANEL** — the note is ⛔ not yet sent |
| **Q2** | what the other family is owed once the death is paid — A: nothing more from the members · B: a Panel-ordered second payment | ⏳ **AWAITING PANEL** |
| **Q3** | is the family of a claim closed this way texted — A: ⛔ no · B: once, `-291` Q2's words | ⏳ **AWAITING PANEL** |

**⛔ Not covered by any ruling (stays open):** whether intake should stop minting a second claim at all (OP11 — the author's, recorded as
⛔ not taken); a Panel power to reopen a closed claim (Q2 B — a later row if ruled); the Hindi review of any changed copy.

## ⭐ THE INVARIANTS
1. **One final approval per death.** ⛔ Never are two claims of the same `(pariwar_id, deceased_member_id)` in `state_trustee_approved` /
   `approved` / `settled` at once — enforced at the gate (OP2) and re-checked at the payout milestone (OP3).
2. **The system refuses nothing a family is owed.** The guard is a 409 at FINAL approval; the other claim is **closed** (`closed`,
   `claim.closed`) — ⛔ never `denied`, ⛔ never appealable, ⛔ never a 6.19c closures row, ⛔ never `denied_no_appeal`.
3. **FQ5 is untouched.** A claim on which a suspicion refusal stands (RF1) and its held refile keep RF5 / RF6 / RF7 exactly; OP5's warning
   does ⛔ not count a claim on which RF1 stands; OP4 ⛔ never closes a claim RF6 would have to decide.
4. **ONE definition** of "finally approved" and of "another open claim for the death" (OP1) — the gate, the commit, the closure, the
   warning and the console all read it; ⛔ none re-derives it.
5. **⛔ No new lock order.** The core guard rides RF15's key (F3); the closure takes the intake key FIRST in its OWN transaction (F4).

## 📜 Policy meaning (AI-10-1)
⭐ This story ADDS a conjunct to a benefit-gating predicate (the final approval gate) and a new reason for an existing terminal outcome
(`closed`). In the member's terms — ⚠ WRITTEN FOR Q1 A / Q2 A; re-written at Task 0.4 for whatever the Panel rules:
- **P1 (OP2 — the guard):** *"Once one claim for a member's death has been finally approved, no other claim for the same death can be
  finally approved — the death is paid once."*
- **P2 (OP4 — closed):** *"Every other claim for that death that is still open is closed — not refused, not appealable; the family
  sees 'This claim has been closed. Please call the helpline.'"*
- **P3 (Q2 A):** *"A claim for a death that has already been paid can still have a refusal appealed, but even an allowed appeal does not
  lead to a second payment for the same death."*
- **P4 (OP5 — the warning):** *"While another claim for the same death is still open, anyone approving a claim is warned and must give a
  reason and a note."*
- **Niyamavali** (`docs/legal/niyamavali.md`, ⛔ not ratified — [[feedback_niyamavali_rulebook_not_spec]]): checked 2026-10-10 —
  ⛔ no clause on a second claim for one death or on paying a death once; R9(A) (*"multiple deaths fall on the same date"*) concerns
  DIFFERENT deaths ⇒ ⛔ not engaged; Part 9 (the appeal) is silent on a death already paid ⇒ P3 narrows ⛔ nothing written there.
  ⚠ Its *"collected and held by the Trust … as custodian"* contradicts `-192`'s *"members pay the nominee directly"* — recorded, ⛔ not
  relied on (the code agrees with `-192`). Result: **consistent; ⛔ no clause engaged.**
- ⚠ P3 means an appeal can be WON and pay nothing. That is Q2's cost, put to the Panel in plain words — ⛔ not decided here.

## ⭐ FOUND FACTS (F1–F14; ⛔ not decided — each with the OP it feeds)

**The money**
- **F1** — ONE pool per committed claim; ⛔ no per-death check in `pool/` (`spawn.ts:285-290`; `pools` unique only on
  `(pariwar_id, cycle_id, pool_index)`, `schema/pools.ts:247`; `pools_claim_case_id_idx` non-unique `:249`) ⇒ OP2, OP3.
- **F2** — each member is assigned to exactly ONE of the cycle's N pools (`pool/assign.ts:137-183`) ⇒ a duplicate approval makes N+1
  pools for N deaths: it takes a share of every member's payment that cycle from the OTHER families (in a later cycle: a second round).
- **F3** — the payment goes to `claim_nominee_bank_accounts` (PK `(claim_case_id, account_rank)`; typed by the filer; ⛔ no FK to
  `member_nominees`) — two claims = two independent account pairs. `nominee-console/read.ts:50,62` assumes *"one death → one claim →
  one pool"*; `deferred-work.md` (`resolveActiveNomineePool` item) records the same assumption.
- **F4** — `settled` has ⛔ no production emitter (`state.ts:297` reducer edge only) ⇒ in practice "finally approved" =
  `state_trustee_approved` (the final vote) / `approved` (the commit). `approved` is emitted ONLY by `commitCycleFreeze`
  (`state-trustee-decision-persist.ts:1347`), which runs ⛔ no gate.

**How two live claims for one death arise (each REACHABLE — traced)**
- **F5** — **>30 days:** `getConvergenceCandidate` window (`icp.ts:122`); `tryConverge` mints when there is ⛔ no candidate (`:300-374`); the member
  and helpline handlers call `initiateIntake` directly (`claims.handlers.ts:127-146`, `claims.helpline.handlers.ts:70-100`);
  `getClaimByDeceasedMember` runs only in the `ClaimStreamConcurrencyError` backstop (`claims.service.ts:356-367`).
- **F6** — **override apart:** `overrideIntakeAttempt` (`icp.ts:569-661`) — any admin with `claim.file` + a fresh `claim_file` step-up
  (`claims.convergence.routes.ts:35-38,80-91`); ⛔ no check of the against-claim's state; the against-claim is excluded from convergence
  for ever (`icp.ts:125-131`).
- **F7** — **after a terminal claim:** `denied` / `closed` are never candidates; the refile guard keys only on a 6.19c closures row
  (`refile-guard.ts:13-15,139-151`) ⇒ *"the death re-files freely"*.
- **F8** — **the pre-6.24a root:** an ordinary refusal has ⛔ no appeal time limit (`appeal-eligibility.ts:219-223` applies the limit only
  to `-239`); a reversal makes the claim `reversed`, which is votable (`TRUSTEE_VOTABLE_STATES`, `state-trustee-decision-persist.ts:97`;
  `R9_OUTCOME_FROM_STATES`, `state.ts:78`); RF6 returns `applied: false` unless the reversed claim's reason is `-239`
  (`suspicion-refusal-persist.ts:154-156`) and ⛔ never moves an approved claim (`CLAIM_NOT_CLOSABLE_STATES`, `state.ts:359`) — the
  API only logs + audits `notClosed` (`claims.appeal.handlers.ts:202-218`). Variants: a `-239` revised OFF before any other claim exists
  (RF13 locks only while another non-`closed` claim lives); 6.19c D17's "refusal for another reason" (`correction-closure.ts:625-652`).

**The gate, the commit, the locks**
- **F9** — `assertClaimApprovable` (`nominee-name-check.ts:403-435`): certificate → bank + determination + name check → inspection →
  (final only) RF5's suspicion wait — takes RF15's key FIRST → late warnings (6.23b EA2, LAST). The ONLY cross-claim conjunct is RF5.
  Six callers: P1 `adjudicateClaim` (`district_admin`, `verifier-decision-persist.ts:410`); `voteOnFrozenClaim` (`:584`),
  `finalizeR9Outcome` (`r9-voting-persist.ts:668`), `decideEscalatedClosure` ×2 (`correction-closure.ts:1350,1361`),
  `approveNoCorrectionNeeded` (`:1558`) — all `final`. ⛔ No writer into `state_trustee_approved` bypasses the gate.
- **F10** — the four final translators already map RF5's error: `cycle_freeze.*` (`claims.cycle-freeze.handlers.ts:168`), `r9_voting.*`
  (`claims.r9-voting.handlers.ts:122`), `closure.*` (`claims.correction-closure.handlers.ts:219`); the verifier-decision translator maps
  it defensively (`claims.verification-decision.handlers.ts:111`) ⇒ OP2's error maps at the same four sites.
- **F11** — `commitCycleFreeze` (`state-trustee-decision-persist.ts:1244-1388`): candidates = `state_trustee_approved` minus live
  routing / return rows, ordered by `claim_case_id`, capped 500; per candidate: `state_trustee_decision:` key → row `FOR UPDATE` → the
  skip-and-keep re-checks (`:1309-1377`) → `claim.approved`. Returns `{ commit, committedClaimIds, idempotentReplay }` — ⛔ `skipped`.
  RF7's re-check reads WITHOUT RF15's key (`:1329-1333`) — `-294` §2 (c).
- **F12** — the closure: `closeClaimsHeldBySuspicionAppeal` (`suspicion-refusal-persist.ts:149-212`) — per other claim in
  `claim_case_id` order: `appeal:` key → `r9:` key → row; emits `claim.closed` for a CLOSABLE claim; ends live returns / correction runs
  / sessions / routing through the extracted actor-free cores (6.24a RF6 v1.1 / v1.3). `ClaimClosedPayloadSchema`
  (`claim/events.ts:657-665`) pins `trigger: z.literal('suspicion_appeal_allowed')`; `claim.closed` is in `ACCOUNT_UNFREEZE_EVENT_TYPES`.
- **F13** — the warnings: `APPROVAL_WARNING_KINDS` (`approval-warnings.ts:107-112`, pinned by `approval-warnings.test.ts:57`); a key is
  `${kind}:${subjectId}` (`:119`); producers in `readClaimApprovalWarnings` / `…Bulk` (`:427`, `:567`); the contracts mirror
  (`packages/contracts/src/claims/verification-decision.ts:134`); the console label map (`apps/admin/src/modules/claim-verification/
  i18n-en.ts:149`); 6.26b is the precedent for ADDING a kind (`deriveDeathFactWarningKeys`, `:248`). Header: *"A new kind enters
  6.23b's WAIT (`-277` Q3 B) — its producer row decides that first."*
- **F14** — ⛔ no DB backstop exists, and ⛔ none is cheap: `claims` has only non-unique `claims_deceased_member_id_idx` (`schema/claims.ts:168`); a
  partial unique index over "finally approved" states is ⛔ not expressible as one row (states move through the projector; a claim moving
  `state_trustee_approved` → `denied` via a return must release it) ⇒ OP9.

## ⚖️ Build decisions OP1–OP12 — ⚠ the author's; PROPOSED, ⛔ not committed until Task 0.5

⭐ §0 (template `trustee-panel-routing-note-TEMPLATE.md`): every OP strips to *"the code should do X"* in service of Q1–Q3's answers.
Each says what changes under a non-recommended answer.

- **OP1 — ONE DEFINITION, ONE MODULE.** New `packages/domain/src/claim/one-payment-per-death.ts`:
  · `FINALLY_APPROVED_CLAIM_STATES = ['state_trustee_approved', 'approved', 'settled']` (`satisfies readonly ClaimLifecycleState[]`; a
    test pins it equal to `CLAIM_NOT_CLOSABLE_STATES` minus `closed`).
  · `otherFinallyApprovedClaimSql(alias)` / `readOtherFinallyApprovedClaim(db, pariwarId, deceasedMemberId, selfClaimCaseId)` → the
    lowest `claim_case_id` of ANOTHER claim of the same `(pariwar_id, deceased_member_id)` in those states, or `null`.
  · `readOtherOpenClaimsForDeath(db, pariwarId, deceasedMemberId, selfClaimCaseId)` → other claims ⛔ not in `CLAIM_TERMINAL_STATES`
    (`read.ts:35`) on which RF1 does ⛔ not stand (`standingSuspicionRefusalSql`) — for OP5.
  · Raw SQL with explicit aliases — ⛔ never a Drizzle correlated subquery ([[project_epic6_drizzle_correlated_subquery_bug]]); bounded by
    `clampLimit` ([[project_domain_limit_clamp_and_savepoint_retry]]).
  · ⚠ It joins NW1's transitive-import entry list (`approval-warnings.test.ts:338-376`) — ⛔ no path to `claim/events.ts`,
    `nominee-name-check.ts`, `nominee-lock.ts`. Q1 B / Q1 C: unchanged / ⛔ not built.
- **OP2 — THE GUARD: ONE CONJUNCT AT `step === 'final'`.** `assertNoOtherFinalApprovalForDeath(db, pariwarId, claimCaseId,
  deceasedMemberId)` — called by the OUTER `assertClaimApprovable` only when `step === 'final'`, IMMEDIATELY AFTER
  `assertSuspicionAppealDecidedForFinalApproval` (which has taken RF15's key — F3) and BEFORE `assertLateWarningsCovered` (EA2 stays
  LAST). New typed error `DeathAlreadyFinallyApprovedError(claimCaseId, approvedClaimCaseId)` in `claim/errors.ts` ⇒ the four
  translators (F10) map it to 409 `<prefix>.death_already_finally_approved` with ⛔ no `details` beyond `{}` (⛔ never does the other claim's id
  leave the server — the console shows its own copy). P1 is ⛔ not held (FQ5's "goes through every check"; OP4 closes the claim anyway).
  ⚠ The gate's own doc says it runs after the caller's row lock; the conjunct takes ⛔ no lock. Q1 B: the conjunct ALSO refuses while
  any other OPEN claim exists (OP1's open read) — the District Admin must close one first (a new close action — OP4 B). Q1 C: ⛔ not built.
- **OP3 — THE COMMIT RE-CHECK (defence in depth; ⛔ no new lock).** In `commitCycleFreeze`, per candidate, after RF7's re-checks:
  `continue` (skip-and-keep) when `readOtherFinallyApprovedClaim` finds a claim in `approved` / `settled` OR a claim of the same death
  already committed EARLIER IN THIS RUN (an in-run `Set` of `deceasedMemberId`s). Two `state_trustee_approved` claims of one death can
  ⛔ not arise once OP2 ships — this catches pre-existing dev rows and any future writer that bypasses the gate. The result shape is
  ⛔ not changed (F11) — the dev reports what it does. ⚠ It does ⛔ not take RF15's key: OP2 makes `-294` §2 (c) harmless (the race can no
  longer reach a second payment — only an appeal heard after the payment, Q2), and taking the key while holding several candidate rows
  risks a cycle with a final writer of another claim of the same death (Trap 3).
- **OP4 — THE OTHER OPEN CLAIMS ARE CLOSED (Q1 A).** Generalise RF6's helper: extract its per-claim core (the key → key → row order,
  the closable check, the live-process teardown) into `closeOtherClaimsOfDeath(client, { pariwarId, deceasedMemberId, causeClaimCaseId,
  trigger, actor, actorId, auditId? })`; `closeClaimsHeldBySuspicionAppeal` keeps its signature, its `-239` early return and its
  behaviour (its specs green) and calls the core with `trigger: 'suspicion_appeal_allowed'`. New entry point
  `closeClaimsOfFinallyApprovedDeath(client, { pariwarId, deceasedMemberId })` — takes the INTAKE key FIRST (F4), reads
  `readOtherFinallyApprovedClaim`; if a claim is finally approved, closes every OTHER claim of the death that is (a) CLOSABLE
  (`isClaimClosable`), (b) ⛔ neither `denied` nor in `appeal_stage_1..3` — a refusal KEEPS its appeal (P3; Q2 A) and is closed only once
  an appeal reverses it, (c) ⛔ not one on which RF1 stands, and (d) ⛔ not held by RF5's wait (`suspicionAppealWaitState(...).waits`) —
  FQ5 decides it until the appeal is decided (Invariant 3) — with
  `trigger: 'death_already_finally_approved'`, `held_by_claim_case_id` = the approved claim. ⭐ Runs in its OWN transaction, called by:
  (i) each of the four final translators' handlers AFTER their transaction commits a final approval (one shared helper, ⛔ never five copies);
  (ii) the intake handlers AFTER a mint (`initiateIntake` member + helpline, `overrideConvergence`) — a new claim for a paid death is
  closed at once; (iii) the three appeal writers' handlers (`reviewAppealStage1`, `finalizeAppealOutcome`, `decideAppealStage3`) AFTER they commit a
  decision of EITHER arm — a reversal makes the claim closable, an uphold ends RF5's wait on a held refile; (iv) the four translators' handlers AFTER a
  `DeathAlreadyFinallyApprovedError` rollback — so a missed closure heals on the next attempt. Each call is idempotent; a failure is
  logged at error level with ids only and ⛔ never fails the request (the guard is the control — Invariant 1). `ClaimClosedPayloadSchema`'s
  `trigger` becomes `z.enum(['suspicion_appeal_allowed', 'death_already_finally_approved'])` (⛔ not a new event — `CLAIM_EVENT_TYPES` stays
  36). Q1 B: (i)–(iv) unchanged, PLUS a District Admin action *"close this claim — another claim for this death goes ahead"* (reason +
  note; `trigger: 'closed_by_district_admin'`; `claim.verify`-gated) — sized at Task 0.4. Q1 C: ⛔ not built.
- **OP5 — THE WARNING (Q1 A as put).** New kind `other_claim_for_death` appended to `APPROVAL_WARNING_KINDS` (+ the contracts mirror +
  the console label + the pinned test, with a reason); one key per other open claim, `other_claim_for_death:<otherClaimCaseId>`, produced
  in `readClaimApprovalWarnings` and `…Bulk` from OP1's open read. ⭐ It enters 6.23b's wait (`-277` Q3 B — the Panel's general rule,
  ⛔ not a new one): a second claim filed AFTER the District Admin approved needs their reason and note. ⚠ A key DISAPPEARS when the other
  claim becomes terminal — the coverage logic must treat a vanished key as ⛔ not required (the dev confirms 6.23b already does; a test).
  Q1 B: the same warning; Q1 C: ⛔ not built.
- **OP6 — FQ5 STAYS EXACT.** ⛔ No change to RF1–RF16's code paths beyond OP4's extraction; a test per FQ5 leg (held refile waits; appeal
  allowed ⇒ refile closed by RF6 with `suspicion_appeal_allowed`; appeal refused ⇒ refile approved) still passes, and ⛔ no OP5 warning
  appears on either claim of a standing-refusal pair.
- **OP7 — THE PATHS, PINNED.** One live-DB spec per F5–F8 path and per `-294` §2 (a)–(c): each reaches the SECOND final approval and
  gets 409 `…death_already_finally_approved`, and the second claim ends `closed` (`death_already_finally_approved`) after the hook.
- **OP8 — TWO-CONNECTION RACE.** Two final approvals (e.g. `voteOnFrozenClaim` on X, `finalizeR9Outcome` on Y — two writers with
  DIFFERENT outer keys) of one death in flight together ⇒ exactly one commits `state_trustee_approved`; the other gets the 409. Waits on
  `pg_stat_activity` lock waits (⛔ never sleeps); red-checked by moving the conjunct BEFORE RF15's key (⇒ both commit).
- **OP9 — ⛔ NO DB CONSTRAINT (recorded, ⛔ not built).** A partial unique index on `claims (pariwar_id, deceased_member_id) WHERE current_state
  IN (…)` was considered: `claims.current_state` is written only by the projector (`claims_state_write_guard`), a claim can LEAVE
  `state_trustee_approved` (a return, R9, 6.19c), and a 23505 inside the projector would surface as a 500 inside every final writer.
  ⇒ the gate (OP2) + the commit (OP3) are the control; [[feedback_mechanization_split_commitment]] — both operands are mechanised.
  BigDev may instead choose it as a backstop (Task 0.2).
- **OP10 — WHAT PEOPLE SEE.** Member app + helpline: the existing `closed.*` copy and screen — ⛔ no new string; the `$comment.closed`
  (`packages/i18n/locales/en/claim.json:157`, and `hi`) is re-worded to cover BOTH closures (it says *"because another claim for the same
  death won its appeal"*). Console: OP2's 409 copy *"Another claim for this death has already been finally approved. This claim will be
  closed."* (admin `i18n-en.ts`); OP5's label *"Another claim for this death is still open."* The other claim's id, filer, nominee or
  state is ⛔ never shown on the member surfaces. Q3 B: the `-291` Q2 B text for the new trigger too — the 0151 closure purpose's selector
  widened, DLT template reused — then ⚠ go-live with FQ7's counsel row; Q3 A: ⛔ no text (AC6 pins it).
- **OP11 — ⛔ NO INTAKE CHANGE (recorded, ⛔ not taken).** Removing the 30-day window or the override was considered and ⛔ not taken: the
  override is a ratified intake capability (Story 6.4 AC), D4 B REQUIRES a separate claim for the suspicion case, and the guard at the
  payout point covers every creation path including future ones. OP4 (ii) closes a new claim for a paid death at once.
- **OP12 — GO-LIVE.** ⛔ No roster row: ⛔ no external dependency (Q3 A). Under Q3 B — the FQ7 counsel row gains this text.

## Acceptance Criteria

### AC0 — Governance before code (Task 0)
The Panel's ruling on Q1–Q3 is transcribed into the routing note's ⏳ block and `.decision-log.md` (a new Trustee-ratified id, committed
ALONE); then the author-commit answering OP1–OP12 for that ruling is committed ALONE; then a second governance commit updates this
file's rulings table, Policy meaning and OPs (`✅ committed by -NNN`), and `deferred-work.md` items F3 cites gain *"addressed by 6.28"*
pointers. ⛔ No code before both commits. If Q1 C: the story ends here (zero-code; Tasks 1–6 left unchecked with a banner —
[[project_story_automator_ops]]).

### AC1 — One definition (OP1)
`FINALLY_APPROVED_CLAIM_STATES` pinned; `readOtherFinallyApprovedClaim` returns ⛔ never the claim itself, ⛔ never a claim of another death or
Pariwar, and the LOWEST `claim_case_id` when (legacy) two qualify; `readOtherOpenClaimsForDeath` excludes terminal claims and every claim
on which RF1 stands; NW1's scan covers the module.

### AC2 — The guard (OP2)
Given claim X of a death in `state_trustee_approved`, `approved` or `settled` ⇒ every one of the five final writers on claim Y of the
same death throws `DeathAlreadyFinallyApprovedError` ⇒ 409 `<prefix>.death_already_finally_approved` at all four translators (⛔ never a 500;
⛔ never the other claim's id in the body); Y's state is unchanged (the transaction rolled back); P1 on Y still succeeds; a claim of ANOTHER
death is unaffected; when X leaves those states (e.g. a 6.19c closure of X), Y can be finally approved.

### AC3 — The commit (OP3)
A `state_trustee_approved` candidate whose death already has an `approved` claim is skipped and kept; two `state_trustee_approved`
candidates of one death (seeded directly — the legacy shape) ⇒ only the lower `claim_case_id` is committed, the other stays
`state_trustee_approved`; ⛔ no change for candidates of distinct deaths; the commit's result shape is as reported.

### AC4 — Closed (OP4)
After a final approval commits, every other CLOSABLE claim of the death — ⛔ never a `denied` or under-appeal claim, ⛔ never one on which
RF1 stands, ⛔ never a refile RF5's wait still holds — is
`closed` with `trigger: 'death_already_finally_approved'`, `held_by_claim_case_id` = the approved claim; its live returns, correction /
certificate reminder runs, R9 / appeal-panel sessions and routing end (RF6's teardown — a test pins ⛔ no reminder text after `closed`);
a new filing for a paid death is closed right after its mint; a `denied` claim of a paid death can still be appealed, and a reversal is
followed by its closure; an uphold that ends RF5's wait is followed by the held refile's closure; a hook that
throws leaves the request successful and logs at error level, and the next final-writer attempt on that claim (409) closes it. RF6's own
behaviour and specs are unchanged.

### AC5 — The warning (OP5)
With two open claims of one death (⛔ not a suspicion pair), BOTH show `other_claim_for_death:<other id>`; approving needs FQ12's reason and
note; a claim filed after the District Admin approved X makes X's final approval wait for the District Admin's reason (6.23b); the key
vanishes when the other claim becomes terminal and ⛔ no coverage then requires it.

### AC6 — Nothing else moves (OP6, OP10; Invariant 3)
Every FQ5 leg still passes; ⛔ no OP5 key on a standing-refusal pair; the 0151 closure purpose selects ⛔ no claim closed with
`death_already_finally_approved` (Q3 A — a live leg proves ⛔ no row is written); ⛔ no new member-facing string; `CLAIM_EVENT_TYPES` still 36.

### AC7 — The paths (OP7, OP8)
F5 (>30 days), F6 (override), F7 (after `denied` / `closed`), F8 (ordinary refusal reversed; `-239` revised off; 6.19c D17), `-294` §2
(a), (b), (c) — each blocked at the second final approval and closed; the two-connection race of OP8.

### AC8 — The proof
Every load-bearing leg red-checked (Debug Log: plant, red, revert); live DB :5433; `pnpm ci:local` green
([[project_ci_local_concurrency_oversubscription]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0).** ⛔ No code until 0.5 is committed.
  - [ ] 0.1 `git fetch origin`; confirm `main` = `34b9bab6` (or re-pin and re-read every cited file that moved); grep `.decision-log.md`
        for entries after `-312` touching `-294`, RF5, RF6 or `-262` FQ5.
  - [ ] 0.2 BigDev reviews the routing note `trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` (one fresh-context
        check of it until ⛔ no BLOCKER / HIGH, the 6.24 / 6.27 precedent), then SENDS it. ⛔ Never record it as shown or sent before it went out
        ([[feedback_shown_to_panel_means_sent]]).
  - [ ] 0.3 When the Panel rules: transcribe verbatim into the note's ⏳ block (body ⛔ not edited) and a new Trustee-ratified decision
        (what it does ⛔ not cover listed); commit ALONE: `governance(6.28): <date>-NNN — Trustee-ratified …`.
  - [ ] 0.4 Re-write OP1–OP12 for the ruling (Q1 B ⇒ size the District Admin close action; Q2 B ⇒ a new row for the Panel's reopen
        power; Q3 B ⇒ OP10's text + the counsel row); put them to BigDev as short option summaries with recommendations; quote each
        answer AS GIVEN in the Debug Log.
  - [ ] 0.5 Draft the author-commit (header shape of `-302` / `-312`: type, status, §0 gate, Occasion, FOUND, DECIDED, Cost,
        Consequences, References) in the scratchpad; one fresh-context check; insert above the newest `### Decision` (if refused, ask
        once — [[project_decision_log_writes_user_inserted]]); commit ALONE.
  - [ ] 0.6 Second governance commit: this file (rulings table, Policy meaning re-checked, OPs `✅ committed by -NNN`); `epics.md`'s
        `### Story 6.28` brief ACs updated to the ruling; a dated `⚠ ADDRESSED by 6.28 / -NNN` line under 6.24a's Trap 9 note and its
        P9 sentence (their text kept); `deferred-work.md` — the F3 items pointed at this story.
- [ ] **Task 1 — OP1 (AC1).** The module, the constant + its pin, the two reads, NW1's entry list; unit + live-DB legs.
- [ ] **Task 2 — OP2 (AC2, AC7 race).** The conjunct after RF5's, the typed error, the four translators (+ the defensive verifier-decision
      one), the console copy; the gate-order spec gains the new position; the OP8 two-connection race, red-checked.
- [ ] **Task 3 — OP3 (AC3).** The commit re-check + the in-run set; legs incl. the legacy two-`state_trustee_approved` seed.
- [ ] **Task 4 — OP4 (AC4).** Extract RF6's core (RF6's specs green, unchanged); the payload enum; `closeClaimsOfFinallyApprovedDeath`;
      the four hook sites (ONE shared API helper); the `$comment.closed` re-word (en + hi). ⚠ Trap 2 lock order — a two-connection leg:
      the hook and a new mint for the same death in flight together ⇒ the mint is closed (⛔ never left open beside the paid claim).
- [ ] **Task 5 — OP5 (AC5).** The kind (+ contracts mirror — run its vitest, [[project_contracts_tests_outside_tsc]]), the producer in both
      reads, the label, the pinned test bumped with a reason, the late-wait leg, the vanished-key leg.
- [ ] **Task 6 — Paths + proof (AC6–AC8).** OP7's specs; the FQ5 regression legs; the 0151 negative leg; red-checks logged;
      `pnpm ci:local` green; story records; `sprint-status.yaml` row → `review` with ONE ledger entry.

### Review Findings

## Dev Notes

### Traps
1. **The conjunct BEFORE RF15's key = two payments.** Placed before `assertSuspicionAppealDecidedForFinalApproval`, two final writers of
   one death read concurrently and both pass (OP8's red-check proves it). ⛔ Never move RF5's conjunct; ⛔ never make the key conditional.
2. **⛔ Never the intake key inside an approval transaction.** The closure (OP4) runs in its OWN transaction, intake key FIRST (F4); ⛔ never call it from
   inside a domain final writer. The hooks live in the API handlers, after the commit.
3. **⛔ No RF15 key in `commitCycleFreeze`.** It holds candidate rows in claim order across deaths; taking a per-death key after a row
   while a final writer of ANOTHER claim of that death holds its row and waits for the same key is a cycle. OP3 reads committed state
   with ⛔ no key — it does ⛔ not need one (OP2 serialises the writers).
4. **⛔ Never closing what FQ5 decides.** A claim on which RF1 stands, or the refile it holds, is ⛔ never closed by OP4 while RF5's wait holds — RF6 owns that pair
   (Invariant 3). The open read and the closure exclude them; a test per case.
5. **The trigger widening must ⛔ never fire `-291`'s text** (F5 of the five facts). `closedByAppealSql` stays keyed on
   `suspicion_appeal_allowed`; a negative live leg.
6. **`settled` is unreachable today** (F4) — include it in the constant anyway (when settlement ships, a settled claim must still block).
7. **A vanished warning key** (OP5) — confirm 6.23b's coverage does ⛔ not demand a key that is ⛔ no longer derived; ⛔ never invent a new coverage rule.
8. **Branded ids are lower-case** ([[project_branded_ids_lowercase]]) — compare claim ids as branded, ⛔ never raw strings.
9. **Every `toHaveLength` / kind-list pin** — grep `APPROVAL_WARNING_KINDS`, `toHaveLength(5)` near warning kinds, the contracts mirror,
   the console label map; NW1's entry list; `FENCED_FILES` (pinned 41, `nominee-name-no-comparison-fence.test.ts:174`) if a fenced file
   gains an import.
10. **⛔ Never close a `denied` or under-appeal claim of a paid death** (OP4 (b)). Closing it ends an appeal right the PRD and 6.16 D-E
    give with ⛔ no time limit — P3 and Q2 A keep the appeal and only make it pay nothing. A test: a `denied` claim of a paid death can
    still initiate an appeal; reversed, it is closed by hook (iii).
11. **Live-DB discipline** — ⛔ never regenerate an applied migration; ⛔ never `DROP SCHEMA`; separate COMMITTED transactions for ordering legs
    ([[project_live_db_test_gotchas]], [[project_db_clock_ordering_tests_tie]]). OP2–OP5 need ⛔ no migration.

### The existing code each change touches (UPDATE files)
- `packages/domain/src/claim/nominee-name-check.ts` (`:403-435` the gate; `:443-458` the options) — ONE new call after RF5's. Preserve
  the order and EA2 LAST; `-251`'s early return stays inside `assertNomineeNameCheckForApproval` (⛔ never OP2 there).
- `packages/domain/src/claim/suspicion-refusal-persist.ts` (`:61` the trigger constant; `:99-124` the lock helper; `:149-212` the closure)
  — extract the per-claim core; preserve the `-239` early return, the `notClosed` report, `heldClaimsAuditContext`'s consumer.
- `packages/domain/src/claim/events.ts` (`:657-665`) — the `trigger` enum. Preserve `held_by_claim_case_id`, `deceased_member_id`.
- `packages/domain/src/claim/state-trustee-decision-persist.ts` (`:1244-1388`) — OP3 after RF7 (`:1328-1336`). Preserve the idempotent
  replay, the 23505 swallow, `getFrozenClaimRefs` (`:1462-1473`).
- `packages/domain/src/claim/approval-warnings.ts` (`:107-112`, `:427`, `:567`) — the kind + producers.
- `packages/domain/src/claim/errors.ts` — the new error beside `SuspicionAppealPendingError` (`:818`).
- `apps/api/src/modules/claims/` — `claims.cycle-freeze.handlers.ts` (`:168`), `claims.r9-voting.handlers.ts` (`:122`),
  `claims.correction-closure.handlers.ts` (`:219`), `claims.verification-decision.handlers.ts` (`:111`), `claims.appeal.handlers.ts`
  (`:202-218`), `claims.handlers.ts` (`:127-146`), `claims.helpline.handlers.ts` (`:70-100`), `claims.convergence.handlers.ts`
  (`:171-243`) — the 409 mapping and the four hook sites (one shared helper).
- `packages/contracts/src/claims/verification-decision.ts` (`:134`); `apps/admin/src/modules/claim-verification/i18n-en.ts` (`:149`);
  `packages/i18n/locales/{en,hi}/claim.json` (`$comment.closed`).
- Tests that pin what moves: `packages/domain/tests/claim/approval-warnings.test.ts` (`:57`, `:338-376`),
  `tests/claim/suspicion-refusal.test.ts` (`:164-170`), `tests/integration/claim/{suspicion-refusal,nominee-name-check,
  ground-inspection-approval}.spec.ts` (gate order), `tests/integration/claim/suspicion-refusal-concurrency.spec.ts` (RF6 legs).

### Testing standards
Live DB on :5433 (`DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable`); own-committing two-connection
races wait on `pg_stat_activity` lock waits (⛔ never sleeps — the 6.24a `BLOCKED_MS` house pattern); per-test ROLLBACK elsewhere; every
instant compared set EXPLICITLY; every AC leg present before its Task is ticked; each load-bearing leg red-checked and logged.
[[project_redetermination_test_fixture_traps]] for seeding two claims of one death.

### Previous-story intelligence (6.24a / 6.24b / 6.29)
- 6.24a built RF5 / RF6 / RF7 / RF15 — this story's substrate; its review rounds 2–3 found the gap (`-294`) and the 30-day-window MEDIUM
  (the strip copy said a later filing joins — it mints). Its P9 sentence names this row.
- 6.24a extracted actor-free cores (`supersedeAppealPanelSession`, `supersedeR9VotingSession`, the routing supersession) — REUSE them.
- 6.29: the jobs DB role is systemic (Row 26) — OP4 deliberately adds ⛔ no jobs sweep.
- Review rounds repeatedly found lock-order cycles and "a comment claims unreachable" — state reachability by test, ⛔ never by comment
  ([[feedback_trace_reachability_before_escalating]]).

### Project Structure Notes
Domain in `packages/domain/src/claim/` (⛔ no new package — [[feedback_no_premature_package]]); API handlers in
`apps/api/src/modules/claims/`; ⛔ no migration expected (OP9 ⛔ not built). ⚠ ⛔ Never import a pg-touching domain namespace into contracts
([[project_contracts_domain_bundle_boundary]]).

### References
- `.decision-log.md`: `2026-10-08-294` (§2, §3), `2026-10-07-292` (RF1, RF4–RF7, RF13, RF15), `2026-09-28-262` FQ5, `2026-09-28-261` D4 B,
  `2026-09-28-264` FQ12, `2026-10-07-291`, `2026-10-07-293`, `2026-09-04-192`.
- Routing notes: `trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` (this story's); `…-2026-09-28-6-20-follow-ups.md`
  (FQ5 as put); template `trustee-panel-routing-note-TEMPLATE.md`.
- Stories: `6-24-true-nominee-refile-after-a-suspicion-refusal.md` (Trap 9 + its `-294` note; Review Findings ROUND 2 D2; P9);
  `6-26b-death-facts-warnings-and-register-check.md` (adding a warning kind); `6-23b-every-approver-gives-a-warning-reason.md` (the wait).
- `epics.md` — Story 6.4 (ICP: the window and the override), `### Story 6.28`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-10-10 — `bmad-create-story 6.28`: ultimate context engine analysis completed — comprehensive developer guide created. The Panel
  routing note is written and ⛔ NOT sent; ⛔ no code until Task 0 completes.

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-10 | Created (`bmad-create-story 6.28`, pinned `34b9bab6`): three read-only research passes; F1–F14; OP1–OP12 PROPOSED for Q1 A / Q2 A / Q3 A with each alternative's delta; the Panel routing note `2026-10-10-6-28-one-payment-per-death` written (⛔ not sent). backlog → ready-for-dev (⛔ no code before Task 0). |
