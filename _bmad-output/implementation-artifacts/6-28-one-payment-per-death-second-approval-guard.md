---
baseline_commit: 34b9bab6
---

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.28`) to `main` at `34b9bab6` (the 6.27 / 6.30 SHA-map commit after PR #268). Every `file:NNN`
below is AS OF `34b9bab6`, derived by three read-only research passes (the approval writers and their locks; the reachability of two
live claims for one death; the money path from approval to payment) and re-verified by four fresh-context passes (v1.1: every cite, the
design and its locks, the governance, the warning and member surfaces). ⚠ Before Task 1, run
`git diff --name-only 34b9bab6..HEAD -- packages apps scripts`; any cited file in that list is re-read.

STATUS: `ready-for-dev` — ⛔⛔ NO CODE until (1) the Panel has ruled Q1–Q3 (routing note
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` — ⚠ written, ⛔ NOT YET SENT) and
(2) the author-commit answering OP1–OP12 below is committed ALONE. `2026-10-08-294` §3 orders exactly this: *"BEFORE any code: (i) the
Panel question … written from the routing-note template, with this entry's (a)–(c) and the pre-6.24a root as the deciding facts …
(ii) then the engineering guard that ruling permits."* ([[feedback_governance_commits_precede_implementation]]).
⭐ The OPs are written for the note's RECOMMENDED answers (Q1 A, Q2 A, Q3 A); `## ⚖️ Build decisions` states, per OP, what changes under
each other answer. If the Panel rules Q1 C, this story builds ⛔ nothing and ends as a zero-code story (Task 0 only).

GLYPH REGISTER, ADDRESSING RULE: as 6.24a / 6.24b / 6.29 — `⛔` sits ONLY on a negation word · `⭐` = key fact or action · `⚠` = hazard.
Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — cite the entry id / item / row key). `file:NNN` is used ONLY for code.
LETTERS: `OP1`…`OP12` = this story's build decisions (the author's; PROPOSED until Task 0.5). `F1`…`F15` = FOUND facts (⛔ not decided).
`Q1`…`Q3` = the Panel's questions (⏳ awaiting). `RF` = 6.24a's (`-292`, `-294`). `H(i)`…`H(iv)` = OP4's closure sites. `R1`…`R4` =
recorded residuals (⛔ not addressed).
-->

# Story 6.28: One Payment per Death — Once a Claim for a Death Is Finally Approved, ⛔ No Other Claim for That Death Can Be, and Every Other Is Closed `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Nothing today stops two claims for the same member's death from both being finally
> approved — and each approved claim takes its own pool, so the members pay twice for one death, out of what the other bereaved
> families in that cycle receive, straight into a second set of bank accounts, with ⛔ no way back (F1–F4). `2026-10-08-294` found this
> around the suspicion-refusal path (6.24a's RF6 is the only control, and three paths pass it); this story's research found the
> SIMPLEST path needs ⛔ no refusal at all: a second filing more than 30 days after a still-open claim, or a staff *"treat as separate"*
> (F5–F8). The story first puts the Panel question `-294` §3 requires — **which claim is paid, what the other family is owed, and is it
> told** — and then builds the guard the ruling permits. Under the recommended answers: a claim can ⛔ never pass the final vote while
> another claim for the same death has passed it (one conjunct in the one approval gate, serialised by the per-death key the gate
> already takes); the cycle commit re-checks it; when one claim's payment is COMMITTED (the cycle commit — ⛔ not the final vote, which
> R9 can still overturn, F15), every other open claim for that death is closed; and every approver is warned while another claim for
> the death is open. ⭐ **The system still refuses nothing**: a closed claim is ⛔ never a refusal and ⛔ never appealable. ⚠ One
> suspicion corner (`-294` §2 (a)) is ⛔ not left as FQ5 rules it — a suspicion appeal won after the other claim's final vote pays
> nothing; the note puts that to the Panel by name (Invariant 3).

> ⭐ **What already exists — rebuild ⛔ none of it:** the one approval gate `assertClaimApprovable` and its five `final` call sites
> (6.20 / 6.23a / 6.26a / 6.24a); RF15's per-death advisory key, taken UNCONDITIONALLY at `step === 'final'`
> (`suspicion-refusal.ts:338,355,372-381`); `closed` + `claim.closed` and RF6's closure helper with its live-process teardown
> (`suspicion-refusal-persist.ts`); the 6.23a / 6.23b warning machinery (kinds, keys, the reason-and-note coverage, the late-warning
> wait, the correction queue's late arm); the closed-claim screen and copy (`closed.*`, `apps/mobile/app/(claim)/closed-helpline.tsx`);
> `commitCycleFreeze`'s skip-and-keep re-check loop (RF7) and its handler's post-commit pool-spawn trigger.
> ⭐ `epics.md` has `### Story 6.28` (`-294` Consequence 3). Row `6-28-one-payment-per-death-second-approval-guard`.

> ⚠⚠ **SIX FACTS — read before anything else** (derived at `34b9bab6`).
> 1. ⚠⚠ **The money ⛔ cannot come back.** `planCycleSpawn` (`packages/domain/src/pool/spawn.ts:285-290`) makes ONE pool per committed
>    claim and refuses only a repeated `claimCaseId`; ⛔ neither `spawn.ts` nor `assign.ts` reads `deceased_member_id` (`FrozenClaimEntry`
>    is `{ claimCaseId }` only — the `pool/` READ MODELS do read it, e.g. `member-drive-detail.ts:334`, irrelevant here). Members pay the
>    claim's nominee accounts directly (`-192`; `claim_nominee_bank_accounts`, claim-scoped). ⇒ the guard must act BEFORE the second
>    claim reaches `state_trustee_approved` — ⛔ never a clean-up after.
> 2. ⚠⚠ **The simplest path has ⛔ no refusal.** `getConvergenceCandidate` (`claim/icp.ts:109-139`) looks back only
>    `CONVERGENCE_WINDOW_DAYS = 30` (`:66`) from the OLD claim's `created_at`; ⛔ no intake handler checks for a live claim first ⇒ a
>    second filing 31+ days after a still-open claim mints a second live claim. Both pass every gate conjunct (F9).
> 3. ⚠⚠ **RF15's per-death key is ALREADY taken by every final approval** — `assertSuspicionAppealDecidedForFinalApproval` takes it
>    (`pg_advisory_xact_lock`, hashed from `suspicion-appeal:${pariwarId}:${deceasedMemberId}`) unconditionally, FIRST, before reading
>    anything (`suspicion-refusal.ts:350-352,372-381`); every final writer runs at READ COMMITTED (`openScopeTx` is a plain `BEGIN`,
>    `scope-tx.ts:37`); `claims.current_state` is projected IN the writer's transaction (`project.ts:141-162`). ⇒ two final approvals of
>    one death ALREADY serialise; a new conjunct placed AFTER the key, reading with a fresh statement, sees the other's commit. ⛔ No new
>    lock is needed for the core guard (OP2).
> 4. ⚠⚠ **The final vote is ⛔ not the payment point.** `state_trustee_approved` is *"approved-in-principle, reversible"* (`state.ts:266`):
>    it is in `TRUSTEE_ROUTABLE_STATES` (`state-trustee-decision-persist.ts:102-109`), and an R9 `denied` outcome moves it to `denied`
>    (`state.ts:283-290`; `r9-voting-persist.ts:662`). Only `approved` (the cycle commit) leads to a pool. ⇒ OP2 BLOCKS at the vote;
>    OP4 CLOSES only at the commit — closing at the vote could leave a death paid by ⛔ no claim (F15).
> 5. ⚠⚠ **Who already holds the death's INTAKE key, inside its own transaction:** the mint (`tryConverge` `icp.ts:287`,
>    `overrideIntakeAttempt`) and every appeal REVERSAL (`acquireSuspicionReversalLockForClaim`, `suspicion-refusal-persist.ts:113-127`;
>    `appeal-persist.ts:375,468` on `reversed`; `appeal-panel-persist.ts:514` on every finalize). ⚠ The helpline intake and the
>    override write in the REQUEST transaction, committed only in `onSend` (`apps/api/src/modules/multi-tenant/index.ts:21-27`) ⇒ a
>    handler that opens a SECOND transaction and asks for the intake key waits on its own request for ever (Postgres cannot see it —
>    two connections). ⇒ closures at those sites run IN the holding transaction (OP4 H(ii), H(iii)); the repo-wide rule
>    (`suspicion-refusal-persist.ts:99-108`, `-294` §1) still forbids anyone holding a claim row or an `appeal:` / `r9:` / trustee /
>    `suspicion-*` key to then ask for the intake key.
> 6. ⚠⚠ **The closure text selects on the TRIGGER, ⛔ never the state alone** — `closedByAppealSql` (`claim/suspicion-notice.ts:237-245`)
>    and `readClosingEvent` (`:561-571`) match `claim.closed` with `trigger = 'suspicion_appeal_allowed'`. ⇒ a new trigger value (OP4)
>    sends ⛔ no `-291` Q2 B text unless this story adds it — which is exactly Q3. A test pins it (AC6).

## Story

As the **Trust and its members**,
I want **a member's death to be paid once — a second claim for the same death never finally approved once one is, and closed once
the first one's payment is committed**,
so that **the members never pay twice for one death out of what other bereaved families receive, while ⛔ no family is refused or
accused by the system, and every place the suspicion rule cannot hold is put to the Panel by name.**

## The rulings this story builds

| Ruling | Key | Status |
|---|---|---|
| `2026-10-08-294` §2 | Trap 9's *"unreachable"* CORRECTED — paths (a)–(c) + the pre-6.24a root reach two payments for one death | author-commit (FOUND) |
| `2026-10-08-294` §3 | row `6-28-…`; *"BEFORE any code: (i) the Panel question — when two claims for one death both qualify for payment, which is paid, and what is the other family owed? — written from the routing-note template, with this entry's (a)–(c) and the pre-6.24a root as the deciding facts … (ii) then the engineering guard that ruling permits"* | author-commit — ⭐ this story's mandate; ⭐ the note puts (a)–(c) by name (Q1's paths; Q1 A / Q2 A costs) and WIDENS the framing to every second claim (F5–F7) — recorded in the author-commit as a widening, ⛔ not a re-reading |
| `-262` FQ5 A | the true nominee's claim waits at final approval for the suspicion appeal; allowed ⇒ it is closed | ⭐ Trustee-ratified — OP2 / OP4 / OP6 leave its machinery exact; ⚠ path (a) is the one corner where an allowed appeal pays nothing — put to the Panel (Q1 A / Q2 A cost lines) |
| `-262` FQ5 B, C (⛔ not taken) | B: *"approving it ends the appeal"* (cost: *"Takes away the appeal the Panel granted (`-239` c)"*); C: *"Whichever claim is approved first is paid, and the other is closed"* — *"A race between staff"* | ⭐ the Panel's earlier rejections — disclosed in the note (Q1 A resembles C; path (a) carries B's cost) |
| `-264` FQ12 | approving while ANY warning shows needs a reason and a note | ⭐ Trustee-ratified — OP5's new kind falls under it |
| `-277` Q3 B | a warning that appears after the District Admin approved needs their reason and note too (6.23b's wait) | ⭐ Trustee-ratified — OP5's kind enters the wait ONLY if Q1 rules it (`-279` A6) |
| `-279` A4 | the District Admin learns of a waiting claim in their correction queue (6.23b) | author-commit — OP5 (b) adds the queue arm for the new kind |
| `-279` A6 | *"a new warning kind enters the wait only by a decision"* | author-commit — ⭐ put to the Panel inside Q1 A (the precedents: `-281` Q1 B, `-303` Q2 A); the author-commit names A6 as discharged |
| `-291` Q1 A | the 90-day limit for the suspicion refusal only; *"Every other refusal keeps ⛔ no time limit"* | ⭐ Trustee-ratified — Q2 A narrows its EFFECT (an appeal won after payment pays nothing); put to the Panel in Q2 A's cost |
| `-291` Q2 B | the closure text after an allowed suspicion appeal | ⭐ Trustee-ratified — ⛔ not extended to OP4's closure unless Q3 B |
| `-293` item 2 A | while any other claim for the death is not closed, a refusal's reason can ⛔ not be changed AWAY from the suspicion reason | ⭐ Trustee-ratified — ⛔ not changed; changing ONTO it stays open (path (a)) |
| **Q1** (routing note `2026-10-10-6-28-one-payment-per-death`) | which claim is paid — A: the first to pass the final vote; the others closed when its payment is committed; a warning (and the wait) while another is open · B: staff close one first · C: both | ⏳ **AWAITING PANEL** — the note is ⛔ not yet sent |
| **Q2** | what the other family is owed once the death is paid — A: nothing more from the members · B: a Panel-ordered second payment | ⏳ **AWAITING PANEL** |
| **Q3** | is the family of a claim closed this way texted — A: ⛔ no · B: once, `-291` Q2's words | ⏳ **AWAITING PANEL** |

**⛔ Not covered by any ruling (stays open):** whether intake should stop minting a second claim at all (OP11 — the author's, recorded as
⛔ not taken); a Panel power to reopen a closed claim (Q2 B — a later row if ruled); the residuals R1–R4; the Hindi review of any
changed copy.

## ⭐ THE INVARIANTS
1. **One final approval per death.** ⛔ Never are two claims of the same `(pariwar_id, deceased_member_id)` in `state_trustee_approved` /
   `approved` / `settled` at once — enforced at the gate (OP2) and re-checked at the payout milestone (OP3). (A deceased member's claims
   all live in ONE Pariwar — the helpline checks `memberExists` in the Pariwar, member intake uses the session's own id.)
2. **The system refuses nothing.** The guard is a 409 at FINAL approval; the other claim is **closed** (`closed`, `claim.closed`) — ⛔ never
   `denied`, ⛔ never appealable, ⛔ never a 6.19c closures row, ⛔ never `denied_no_appeal`.
3. **FQ5's machinery is untouched — and its one gap is disclosed, ⛔ never papered over.** A claim on which a suspicion refusal stands (RF1)
   and its held refile keep RF5 / RF6 / RF7 exactly; OP5's warning does ⛔ not count a claim on which RF1 stands and ⛔ none is derived on
   it; OP4 ⛔ never closes a claim RF6 would have to decide. ⚠ Path (a) (`-294` §2): X passes the final vote; S (refused for another
   reason) is revised ONTO the suspicion reason, appealed and ALLOWED; RF6 cannot move X (⛔ not closable) ⇒ S is blocked by OP2 and
   closed once X's payment commits — the family that WON its suspicion appeal is paid nothing (FQ5 B's rejected cost). That outcome is
   the Panel's to accept (Q1 A / Q2 A cost lines); ⛔ never call FQ5 "exact".
4. **ONE definition** of "finally approved", "payment committed" and "another open claim for the death" (OP1) — the gate, the commit, the
   closure, the warning, the queue and the console all read it; ⛔ none re-derives it. The terminal-state list is copied BY VALUE into
   OP1's module (NW1's leaf fence — Trap 12) with a unit test pinning it equal to `CLAIM_TERMINAL_STATES`.
5. **⛔ No new lock order.** The core guard rides RF15's key (Fact 3); every closure takes the intake key FIRST — in the transaction that
   already holds it (H(ii), H(iii)) or in its OWN transaction (H(i), H(iv)) (Fact 5).

## 📜 Policy meaning (AI-10-1)
⭐ This story ADDS a conjunct to a benefit-gating predicate (the final approval gate) and a new reason for an existing terminal outcome
(`closed`). In the member's terms — ⚠ WRITTEN FOR Q1 A / Q2 A; re-written at Task 0.4 for whatever the Panel rules:
- **P1 (OP2 — the guard):** *"Once one claim for a member's death has passed the final vote, no other claim for the same death can pass
  it — unless the first claim is then refused."*
- **P2 (OP4 — closed):** *"When the first claim's payment begins, every other claim for that death that is still open is closed — not
  refused, not appealable; the family sees 'This claim has been closed. Please call the helpline.'"*
- **P3 (Q2 A):** *"A claim for a death that has already been paid can still have a refusal appealed, but even an allowed appeal — a
  suspicion appeal included — does not lead to a second payment for the same death."*
- **P4 (OP5 — the warning):** *"Until one claim for a death passes the final vote, anyone approving another claim for the same death is
  warned and must give a reason and a note — and a claim filed after the District Admin approved makes the final approval wait for the
  District Admin's reason. Once one claim has passed the final vote, the others cannot pass it, and are refused at the final vote with their
  own message."*
- **Niyamavali** (the local checkout of the private corpus, `docs/legal/niyamavali.md` — gitignored, `docs/legal-corpus-location.md`;
  ⛔ not ratified — [[feedback_niyamavali_rulebook_not_spec]]): checked 2026-10-10 — ⛔ no clause on a second claim for one death or on
  paying a death once; R9(A) (*"multiple deaths fall on the same date"*, §5.4) concerns DIFFERENT deaths ⇒ ⛔ not engaged; Part 9 (the
  appeal) is silent on a death already paid ⇒ P3 narrows ⛔ nothing written there. **Engaged, consistent:** §5.3 R5(D) — *"full
  discretion over eligibility and disbursement. No member has a legal claim to any sum"* — supports Q2 A (the Panel decides what is owed;
  ⛔ no claim to a second sum); §6.4 — *"Disbursement is made to the nominee(s)"* — says ⛔ nothing on two claims; §2.4 — *"Multi-nominee disputes are resolved at
  **State Trustee** discretion (R5(E))"* — reads on two families for one death; ⛔ not binding, consistent with Q1 (an approver's judgement on
  the record) and with Q2 B (a Panel judgement). ⚠ §4.3's *"collected and held
  by the Trust … as custodian"* contradicts `-192`'s *"members pay the nominee directly"* — recorded, ⛔ not relied on (the code agrees with
  `-192`). Result: **consistent; three clauses engaged, ⛔ none contradicted.**
- ⚠ P3 means an appeal can be WON and pay nothing. That is Q2's cost, put to the Panel in plain words — ⛔ not decided here.

## ⭐ FOUND FACTS (F1–F15; ⛔ not decided — each with the OP it feeds)

**The money**
- **F1** — ONE pool per committed claim; ⛔ no per-death check in the spawn (`spawn.ts:285-290`; `pools` unique only on
  `(pariwar_id, cycle_id, pool_index)`, `schema/pools.ts:247`; `pools_claim_case_id_idx` non-unique `:249`) ⇒ OP2, OP3.
- **F2** — each member is assigned to exactly ONE of the cycle's N pools (`pool/assign.ts:137-187`) ⇒ a duplicate approval makes N+1
  pools for N deaths: it takes a share of every member's payment that cycle from the OTHER families (in a later cycle: a second round).
- **F3** — the payment goes to `claim_nominee_bank_accounts` (PK `(claim_case_id, account_rank)`; typed by the filer; ⛔ no FK to
  `member_nominees`) — two claims = two independent account pairs. `nominee-console/read.ts:50,62` assumes *"one death → one claim →
  one pool"*; `deferred-work.md` records the same (Task 0.6's item 1).
- **F4** — `settled` has ⛔ no production emitter (`state.ts:297` reducer edge only) ⇒ in practice "finally approved" =
  `state_trustee_approved` (the final vote) / `approved` (the commit). `approved` is emitted ONLY by `commitCycleFreeze`
  (`state-trustee-decision-persist.ts:1347`), which runs ⛔ no gate; its only caller is `claims.cycle-freeze.handlers.ts:580` (⛔ no job).

**How two live claims for one death arise (each REACHABLE — traced)**
- **F5** — **>30 days:** `getConvergenceCandidate` window (`icp.ts:122`); `tryConverge` mints when there is ⛔ no candidate (`:300-374`); the member
  and helpline handlers call `initiateIntake` directly (`claims.handlers.ts:127-146`, `claims.helpline.handlers.ts:70-100`);
  `getClaimByDeceasedMember` runs only in the `ClaimStreamConcurrencyError` backstop (`claims.service.ts:356-367`). ⚠ `state_trustee_approved`
  and `approved` are ⛔ not terminal ⇒ a filing WITHIN 30 days of a paid claim CONVERGES into it (benign — ⛔ no second claim).
- **F6** — **override apart:** `overrideIntakeAttempt` (`icp.ts:569-661`) — any admin with `claim.file` + a fresh `claim_file` step-up
  (`claims.convergence.routes.ts:35-39,80-91`); ⛔ no check of the against-claim's state; the against-claim is excluded from convergence
  for ever (`icp.ts:125-131`).
- **F7** — **after a terminal claim:** `denied` / `closed` are never candidates; the refile guard keys only on a 6.19c closures row
  (`refile-guard.ts:13-15,139-151`) ⇒ *"the death re-files freely"*.
- **F8** — **the pre-6.24a root:** an ordinary refusal has ⛔ no appeal time limit (`appeal-eligibility.ts:219-223` applies the limit only
  to `-239`; `-291` Q1 A ratifies *"Every other refusal keeps ⛔ no time limit"*); a reversal makes the claim `reversed`, which is votable
  (`TRUSTEE_VOTABLE_STATES`, `state-trustee-decision-persist.ts:97`; `R9_OUTCOME_FROM_STATES`, `state.ts:78`); RF6 returns
  `applied: false` unless the reversed claim's reason is `-239` (`suspicion-refusal-persist.ts:154-156`) and ⛔ never moves an approved
  claim (`CLAIM_NOT_CLOSABLE_STATES`, `state.ts:359`) — the API only logs + audits `notClosed` (`claims.appeal.handlers.ts:202-218`).
  Variants: a `-239` revised OFF before any other claim exists (RF13 locks only while another non-`closed` claim lives); a reason revised
  ONTO `-239` after another claim's final vote (path (a) — Invariant 3); 6.19c D17's "refusal for another reason"
  (`correction-closure.ts:625-652`).

**The gate, the commit, the locks**
- **F9** — `assertClaimApprovable` (`nominee-name-check.ts:403-435`): certificate → bank + determination + name check → inspection →
  (final only) RF5's suspicion wait — takes RF15's key FIRST → late warnings (6.23b EA2, LAST). Cross-claim reads today: RF5, and the
  inspection conjunct's inherited source (`inheritedGroundInspectionSourceSql`, `ground-inspection-approval.ts:99`) — ⛔ neither asks
  "is the death already approved". Six call sites: P1 `adjudicateClaim` (`district_admin`, `verifier-decision-persist.ts:410`); FIVE
  `final`: `voteOnFrozenClaim` (`state-trustee-decision-persist.ts:584`), `finalizeR9Outcome` (`r9-voting-persist.ts:668`),
  `decideEscalatedClosure` ×2 (`correction-closure.ts:1350,1361` — two arms of ONE writer), `approveNoCorrectionNeeded` (`:1558`) — four
  writers. ⛔ No writer into `state_trustee_approved` bypasses the gate (emitters `state-trustee-decision-persist.ts:643`,
  `r9-voting-persist.ts:735`, `correction-closure.ts:660` via `writeApprovalChain` — called only at `:1375` / `:1586`, after the gate).
- **F10** — RF5's error is mapped by three FINAL translators — `cycle_freeze.*` (`claims.cycle-freeze.handlers.ts:168`), `r9_voting.*`
  (`claims.r9-voting.handlers.ts:122`), `closure.*` (`translateClosureError`, `claims.correction-closure.handlers.ts:219`, shared by
  `claims.correction-escalation.handlers.ts:43`) — plus one DEFENSIVE (`claims.verification-decision.handlers.ts:111`; P1, never final).
  ⭐ The handlers that RUN a final writer: `claims.cycle-freeze.handlers.ts:442` (vote), `claims.r9-voting.handlers.ts:510` (finalize),
  `claims.correction-closure.handlers.ts:593` (no-correction approve), `claims.correction-escalation.handlers.ts:290`
  (`decideEscalatedClosure`, Super Admin). Unknown errors re-throw ⇒ OP2's error maps at all four translators.
- **F11** — `commitCycleFreeze` (`state-trustee-decision-persist.ts:1244-1430`): candidates = the Pariwar's `state_trustee_approved` minus
  live routing / return rows (⛔ not cycle-scoped — `:1290-1302`), ordered by `claim_case_id`, capped 500; per candidate:
  `state_trustee_decision:` key → row `FOR UPDATE` → the skip-and-keep re-checks (RF7 `:1328-1336`, the inspection `:1337-1339`) →
  `claim.approved` (`:1347`). Returns `{ commit, committedClaimIds, idempotentReplay }` — ⛔ no `skipped`. RF7's re-check reads WITHOUT
  RF15's key (`:1329-1333`) — `-294` §2 (c). The handler (`postCommit`, `claims.cycle-freeze.handlers.ts:570-600`) captures
  `frozenRefs` (`{ claimCaseId, deceasedMemberId }`, `getFrozenClaimRefs` `:1462-1473`) INSIDE the committed tx, closes it, then fires the
  pool-spawn trigger on a fresh commit OR a replay.
- **F12** — the closure: `closeClaimsHeldBySuspicionAppeal` (`suspicion-refusal-persist.ts:149-212`) — ONE early return (a live reason
  other than `-239`, `:154-156`); walks ALL other claims of the death in `claim_case_id` order (cap 50), skips `closed`, reports
  non-closable as `notClosed`; per claim: `appeal:` key → `r9:` key → `state_trustee_decision:` key → row (`:175-182`); emits `claim.closed`
  for a CLOSABLE claim; `endLiveProcesses` (`:215-243`) ends live returns / correction runs / sessions / routing and sets `open`
  `claim_appeals` rows to `closed`, through the extracted actor-free cores (6.24a RF6 v1.1 / v1.3). It runs INSIDE the reversal writer's
  transaction (`appeal-persist.ts:427,514`; `appeal-panel-persist.ts:645`). `ClaimClosedPayloadSchema` (`claim/events.ts:657-665`) pins
  `trigger: z.literal('suspicion_appeal_allowed')`; `claim.closed` is in `ACCOUNT_UNFREEZE_EVENT_TYPES` (`overlay.ts:52`) — the freeze is
  judged per claim (`overlay.ts:102-121`) ⇒ closing Y ⛔ never unfreezes while X is live. Certificate reminders stop by a state check
  (`certificate-reminder-read.ts:42`), ⛔ not by the teardown.
- **F13** — the warnings: `APPROVAL_WARNING_KINDS` (`approval-warnings.ts:107-112`, pinned by `approval-warnings.test.ts:57`); a key is
  `${kind}:${subjectId}` (`:119`); the per-claim derivation is `deriveClaimApprovalWarnings` (`:737`) fed by SQL columns
  (`deathFactColumnsSql()` `:372`, embedded at `:497` / `:604`, is the embed precedent); `readClaimApprovalWarnings` (`:427`) is pinned to EXACTLY one statement
  (`verifier-console.spec.ts:1122`); `…Bulk` (`:567`) runs one statement per 500-id slice (`:551-568`) and is fed up to 1,500 ids
  (`claims.cycle-freeze.handlers.ts:328`), plus the no-correction queue (`claims.correction-closure.handlers.ts:485`) and the correction
  queue (`correction-queue-read.ts:417`). The contracts mirror (`packages/contracts/src/claims/verification-decision.ts:134-136`, a parsed
  `z.enum`; lockstep test `packages/contracts/tests/claims-verifier-decision.test.ts:225`); the console label map
  (`apps/admin/src/modules/claim-verification/i18n-en.ts:149`, `satisfies Record<ApprovalWarningKind,string>`). Keys ⛔ never reach the
  wire (kinds + counts only; keys live in `claim_warning_approvals.covered_keys`, staff-only). Coverage filters the CURRENT keys against
  `covered_keys` (`uncoveredKeys` `:816`, `lateWarningKeys` `:930`) ⇒ a key no longer derived is ⛔ never required. Any current key
  blocks a same-outcome revise of the District Admin's approval (`verifier-decision-persist.ts:668-673`, console
  `reviseBlocked: 'warning_approval_final'`); R9 votes cast before a new key appeared stop covering (`r9ApproveVotesMissingKeys`
  `:847`). The correction queue's `lateArm` (`correction-queue-read.ts:150-185`) has three sources, ALL keyed on the claim's OWN rows
  or its inherited inspection.
- **F14** — ⛔ no DB backstop exists: `claims` has only non-unique `claims_deceased_member_id_idx` (`schema/claims.ts:168`). A partial unique
  index over the three states IS expressible (`state_trustee_approved` leaves only via R9 `denied`, which releases it); its cost is a 23505
  raised inside the projector, i.e. inside every final writer — a 500 unless mapped at four translators — and it fails on any legacy pair ⇒ OP9.
- **F15** — **the final vote's only non-payment exit is R9:** `routeToR9` accepts `state_trustee_approved` (`state-trustee-decision-persist.ts:102-109,710`;
  the Pariwar Admin may route after the vote, `claims.cycle-freeze.handlers.ts:452`); `claim.r9_outcome` `denied` → `denied` (`state.ts:283-290`);
  *"A DENIED outcome is NEVER gated"* (`r9-voting-persist.ts:662`). ⛔ Neither a return (`TRUSTEE_RETURNABLE_STATES` `:111-135` leaves it out) nor a
  6.19c closure (`assertDecidable` `correction-closure.ts:484-487` requires `TRUSTEE_VOTABLE_STATES`) acts on it. ⇒ closing the other claims at the
  vote, then R9-denying X, leaves the death paid by ⛔ no claim — OP4 closes at the commit.

## ⚖️ Build decisions OP1–OP12 — ⚠ the author's; PROPOSED, ⛔ not committed until Task 0.5

⭐ §0 (template `trustee-panel-routing-note-TEMPLATE.md`): every OP strips to *"the code should do X"* in service of Q1–Q3's answers.
Each says what changes under a non-recommended answer.

- **OP1 — ONE DEFINITION, ONE MODULE.** New `packages/domain/src/claim/one-payment-per-death.ts` (a LEAF: ⛔ no import of `read.ts`,
  `state.ts`, `events.ts`, `nominee-name-check.ts`, `nominee-lock.ts` — it joins NW1's entry list, `approval-warnings.test.ts:338-376`):
  · `FINALLY_APPROVED_CLAIM_STATES = ['state_trustee_approved', 'approved', 'settled']` and `PAYMENT_COMMITTED_CLAIM_STATES = ['approved',
    'settled']` and `OPEN_EXCLUDED_TERMINAL_STATES = ['settled', 'denied', 'closed']` — literals BY VALUE (precedent
    `death-certificate-approval.ts:330-335`); a unit test (outside the module) pins them against `CLAIM_NOT_CLOSABLE_STATES` minus
    `closed` and `CLAIM_TERMINAL_STATES` for EVERY state.
  · SQL fragments (raw SQL, explicit aliases — ⛔ never a Drizzle correlated subquery, [[project_epic6_drizzle_correlated_subquery_bug]]):
    `otherClaimInStatesSql(alias, states)` → the lowest `claim_case_id` of ANOTHER claim of the same `(pariwar_id, deceased_member_id)` in
    those states, or NULL; `otherOpenClaimsForDeathSql(alias)` → `json_agg` of the ids of the other claims that are ⛔ not terminal, ⛔ not
    finally approved, and on which RF1 does ⛔ not stand (`standingSuspicionRefusalSql('oc')`) — and an EMPTY array whenever RF1 stands on
    the claim ITSELF (Invariant 3); `otherOpenClaimForDeathExistsSql(alias)` — the same predicate as a boolean, for OP5 (b).
  · Thin reads over the fragments for the writers: `readOtherFinallyApprovedClaim(db, pariwarId, deceasedMemberId, selfClaimCaseId)`,
    `readPaymentCommittedClaim(db, pariwarId, deceasedMemberId, selfClaimCaseId)`; bounded by `clampLimit` (`../pagination.js`,
    [[project_domain_limit_clamp_and_savepoint_retry]]). Q1 B / Q1 C: unchanged / ⛔ not built.
- **OP2 — THE GUARD: ONE CONJUNCT AT `step === 'final'`.** `assertNoOtherFinalApprovalForDeath(db, pariwarId, claimCaseId,
  deceasedMemberId)` — called by the OUTER `assertClaimApprovable` only when `step === 'final'`, IMMEDIATELY AFTER
  `assertSuspicionAppealDecidedForFinalApproval` (which has taken RF15's key — Fact 3) and BEFORE `assertLateWarningsCovered` (EA2 stays
  LAST). New typed error `DeathAlreadyFinallyApprovedError(claimCaseId, approvedClaimCaseId)` in `claim/errors.ts` (beside
  `SuspicionAppealPendingError`, `:818`) ⇒ the four translators (F10) map it to 409 `<prefix>.death_already_finally_approved` with
  `details: {}` (⛔ never does the other claim's id leave the server — the console shows its own copy). P1 is ⛔ not held (FQ5's "goes
  through every check"). ⚠ The conjunct takes ⛔ no lock. Q1 B: the conjunct ALSO refuses while any other OPEN claim exists — the District
  Admin must close one first (a new close action — OP4 B). Q1 C: ⛔ not built.
- **OP3 — THE COMMIT RE-CHECK (defence in depth; ⛔ no new lock).** In `commitCycleFreeze`, per candidate, after BOTH RF7 re-checks (after
  `:1339`): `continue` (skip-and-keep) when `readPaymentCommittedClaim` finds another claim of the death in `approved` / `settled`. ⭐ ⛔ No
  in-run set: `current_state` is projected in the same transaction, so a claim committed earlier in THIS run is already `approved` to the
  next read. Two `state_trustee_approved` claims of one death can ⛔ not arise once OP2 ships — this catches legacy dev rows and any future
  writer that bypasses the gate. The result shape is ⛔ not changed (F11). ⚠ It does ⛔ not take RF15's key (Trap 3). ⚠ **R1 (recorded,
  ⛔ not addressed):** a skipped candidate stays `state_trustee_approved` for good — ⛔ not closable (`state.ts:359`), ⛔ not returnable — and is
  re-selected by every run inside the 500 cap; reachable only from a legacy pair or a bypass. Likewise legacy-only: two concurrent commits
  under different `commit_id`s can each commit one claim of a legacy two-voted pair (READ COMMITTED; ⛔ nothing serialises them across
  commits).
- **OP4 — THE OTHER OPEN CLAIMS ARE CLOSED WHEN A PAYMENT IS COMMITTED (Q1 A).** Generalise RF6's helper: extract its per-claim core (the
  `appeal:` → `r9:` → `state_trustee_decision:` key order → row, the closable check, `endLiveProcesses`) into
  `closeOtherClaimsOfDeath(client, { pariwarId, deceasedMemberId, causeClaimCaseId, trigger, actor, actorId, auditId? })` — ⚠ the core
  selects `current_state <> 'closed'` BEFORE its cap (today RF6 selects ALL other claims, `suspicion-refusal-persist.ts:160-171`, `LIMIT 50`,
  so piled-up closed claims could push an open one out) and logs at error level when the cap is reached;
  `closeClaimsHeldBySuspicionAppeal` keeps its signature, its `-239` early return, its `notClosed` report and its behaviour (its specs
  green) and calls the core with `trigger: 'suspicion_appeal_allowed'`. A claim is closed with `trigger: 'death_already_finally_approved'`,
  `held_by_claim_case_id` = the payment-committed claim, ONLY when another claim of the death is in `PAYMENT_COMMITTED_CLAIM_STATES` and the
  claim is (a) CLOSABLE (`isClaimClosable`), (b) ⛔ neither `denied` nor in `appeal_stage_1..3` — a refusal KEEPS its appeal (P3; Q2 A) and is
  closed only once an appeal reverses it, (c) ⛔ not one on which RF1 stands, (d) ⛔ not held by RF5's wait (`suspicionAppealWaitState(rows,
  selfId).waits`) — FQ5 decides it (Invariant 3). Between X's final vote and its commit, Y stays OPEN and BLOCKED (OP2); if X is R9-denied,
  Y goes on (F15). `ClaimClosedPayloadSchema`'s `trigger` becomes `z.enum(['suspicion_appeal_allowed', 'death_already_finally_approved'])`
  (⛔ not a new event — `CLAIM_EVENT_TYPES` stays 36). ⭐ **The four sites:**

  | Site | When | Where | Transaction | Keys |
  |---|---|---|---|---|
  | **H(i)** | a payment is committed | `claims.cycle-freeze.handlers.ts` `postCommit`, AFTER the pool-spawn trigger block (outside it and its session lock — that block runs only `if (!triggerDelivered)`), on EVERY response, fresh or replay (`committedClaimIds` is populated on a replay, `state-trustee-decision-persist.ts:1266,1414`); once per distinct `deceasedMemberId` in `frozenRefs` (up to 500, sequential) | OWN (`openScopeTx`) per death, with `SET LOCAL lock_timeout`; a timeout is logged and falls to R2 — entry `closeClaimsOfPaidDeath(client, { pariwarId, deceasedMemberId, actor: 'system', actorId })` (`actorId` = the committing trustee; H(iv): the refused actor) | intake key FIRST, then per other claim in `claim_case_id` order: `appeal:` → `r9:` → `state_trustee_decision:` → row |
  | **H(ii)** | a new claim is minted for a paid death (⛔ not when RF5's wait holds it — OP4 (d)) | INSIDE `tryConverge`'s mint arm (`icp.ts:300-374`) and `overrideIntakeAttempt` (`:569-661`), after the mint | the MINT's (intake key already held — `icp.ts:287`); ⚠ helpline + override = the REQUEST tx (Fact 5) — ⛔ never a second tx | SELF-MODE (Trap 13) |
  | **H(iii)** | a refusal of a paid death is REVERSED on appeal | INSIDE `reviewAppealStage1` / `decideAppealStage3` (`reversed` arm) and `finalizeAppealOutcome` (a reversing tally), after the RF6 call | the WRITER's (intake key already held — `appeal-persist.ts:375,468`, `appeal-panel-persist.ts:514`) | SELF-MODE for the reversed claim |
  | **H(iv)** | a final writer is refused with `DeathAlreadyFinallyApprovedError` | the four final-writer handlers (F10), through ONE shared helper | OWN — AFTER the refused tx is closed (Trap 14); the helper takes `claimCaseId` and reads `deceased_member_id` UNLOCKED in its own transaction before the intake key (the `acquireSuspicionReversalLockForClaim` shape — the error carries ⛔ no `deceasedMemberId`) | as H(i) — a no-op unless a payment is committed |

  Each site is idempotent; H(i) / H(iv) failures are logged at error level with ids only and ⛔ never fail the request (the guard is the
  control — Invariant 1); H(ii) / H(iii) are part of their writer's transaction (a failure rolls the mint / reversal back — as RF6 does).
  ⭐ The writers RETURN the post-closure state: H(ii) — `tryConverge` / `overrideIntakeAttempt` return `closed` (today `converged.state`,
  `icp.ts:370,660`); H(iii) — the three reversal writers return `claimState: 'closed'` (today `projected.state` = `reversed`,
  `appeal-persist.ts:445,552`, `appeal-panel-persist.ts:678`) so the appeal responses' `claim_state` reads `closed`
  (`claims.appeal.handlers.ts:428,557,629`). ⚠ **R2 (recorded, ⛔ not addressed):** an open claim of a paid death that ⛔ no
  site reaches stays open, blocked by OP2, until its next final-approval attempt (H(iv)) — an UPHOLD that releases a held refile (the
  uphold arm takes ⛔ no intake key), RF5's 90-day lapse (⛔ no event), a crash between commit and H(i) on a commit never replayed, an H(i) lock timeout. Its
  correction / certificate chases keep running until it is closed. Q1 B: H(i)–(iv) unchanged, PLUS a District Admin action *"close this
  claim — another claim for this death goes ahead"* (reason + note; `trigger: 'closed_by_district_admin'`; `claim.verify`-gated) — sized
  at Task 0.4. Q1 C: ⛔ not built.
- **OP5 — THE WARNING (Q1 A as put — the wait included, `-279` A6).** New kind `other_claim_for_death` appended to `APPROVAL_WARNING_KINDS`
  (+ the contracts mirror + the console label + the pinned test, with a reason); one key per other OPEN claim (OP1's open fragment — ⛔ not
  a finally approved one: OP2's 409 copy covers that), `other_claim_for_death:<otherClaimCaseId>`. ⭐ (a) Produced by EMBEDDING
  `otherOpenClaimsForDeathSql` in the column lists of BOTH `readClaimApprovalWarnings` and `…Bulk` and deriving the keys in
  `deriveClaimApprovalWarnings` (`:737`) — ⛔ never a per-claim query (the single read stays ONE statement, `verifier-console.spec.ts:1122`;
  the bulk stays one per slice); a test pins single = bulk. ⭐ (b) The correction queue's `lateArm` (`correction-queue-read.ts:150-185`)
  gains a FOURTH disjunct built on a boolean SIBLING of the fragment, `otherOpenClaimForDeathExistsSql(alias)` (OP1 — the SAME predicate;
  the queue's alias is the quoted `"claims"`) — another open claim of the death exists — with ⛔ no time term (`qualifyingRows`'
  exact `uncoveredKeys` check drops covered rows) ⇒ `-279` A4 holds for the new kind (a key can appear by a new filing, or REAPPEAR when a
  `denied` other claim is appealed or `reversed` — ⛔ no own row of the claim moves). Through `lateArm` it also reaches the R9
  `state_trustee_approved` arm (`:245`). ⭐ (c) It enters 6.23b's wait (`-277` Q3 B) ONLY because Q1 A, as put, says so — the author-commit
  names `-279` A6 as discharged by that ruling; if the Panel strikes the wait, the kind is warning-only (excluded from EA2's key set).
  Recorded effects: any current key blocks a same-outcome revise of the District Admin's approval (F13); R9 votes cast before the other
  claim was filed must be re-cast (`-279` A2). ⚠ Coordinate with 6.27b (Trap 9). Q1 B: the same warning; Q1 C: ⛔ not built.
- **OP6 — FQ5'S MACHINERY STAYS EXACT.** ⛔ No change to RF1–RF16's code paths beyond OP4's extraction and H(iii)'s call after RF6; a test per
  FQ5 leg (held refile waits; appeal allowed ⇒ refile closed by RF6 with `suspicion_appeal_allowed`; appeal refused ⇒ refile approved) still
  passes, and ⛔ no OP5 key appears on EITHER claim of a standing-refusal pair. Path (a)'s outcome is pinned by its own leg (AC7) — the
  Panel's to accept (Invariant 3). ⚠ In a paid death RF6 still runs FIRST at an allowed suspicion appeal: it closes any held THIRD claim
  with `suspicion_appeal_allowed` — and that trigger sends the `-291` Q2 B text although the death is paid (as ruled; a leg pins it, AC6).
- **OP7 — THE PATHS, PINNED.** One spec per F5–F8 path and per `-294` §2 (a)–(c), in TWO layers: ⭐ DOMAIN legs drive the second claim to
  a final writer BEFORE any closure site runs and get `DeathAlreadyFinallyApprovedError`; ⭐ API legs then show the closure — after the
  commit (H(i)), at the mint (H(ii)), at the reversal (H(iii)). ⚠ Through the API, a claim already closed fails its writer's own state
  check (`ClaimNotFreezeVotableError` `state-trustee-decision-persist.ts:525`, `R9ClaimNoLongerRoutableError` `r9-voting-persist.ts:637`)
  BEFORE the gate — ⛔ never assert the 409 there.
- **OP8 — TWO-CONNECTION RACE.** Two final approvals (e.g. `voteOnFrozenClaim` on X, `finalizeR9Outcome` on Y — two writers with
  DIFFERENT outer keys) of one death in flight together ⇒ exactly one commits `state_trustee_approved`; the other gets the error. Waits on
  `pg_stat_activity` lock waits (⛔ never sleeps); red-checked by moving the conjunct BEFORE RF15's key (⇒ both commit).
- **OP9 — ⛔ NO DB CONSTRAINT (recorded, ⛔ not built).** A partial unique index on `claims (pariwar_id, deceased_member_id) WHERE current_state
  IN ('state_trustee_approved','approved','settled')` is expressible (F14); ⛔ not built because `claims.current_state` is written only by the
  projector (`claims_state_write_guard`) ⇒ a 23505 would surface inside every final writer (a 500 unless mapped four times) and the
  migration fails on any legacy pair ⇒ the gate (OP2) + the commit (OP3) are the control; [[feedback_mechanization_split_commitment]] — both
  operands are mechanised. BigDev may instead choose it as a backstop (Task 0.4).
- **OP10 — WHAT PEOPLE SEE.**
  · Member app: the existing `closed.*` copy and screen — ⛔ no new member string. ⭐ ⛔ No new response field: both intake responses are
    `.strict()` (`ClaimIntakeInitiateResponse` `packages/contracts/src/claims/filing.ts:137-143`, `HelplineClaimIntakeResponse`
    `helpline.ts:84-94`) — an installed app would reject an unknown key — and their `state` enum already carries `closed`
    (`filing.ts:47-64`). On `res.state === 'closed'`, `relationship.tsx:44-48` calls `setFiledClaimCaseId(memberId, res.claimCaseId)`
    (`apps/mobile/lib/filed-claim.ts:35`) ONLY when ⛔ no pointer is on record or the recorded claim reads terminal (⛔ never overwriting
    the pointer to a live or paid claim — the gate falls through to the wizard on offline / error / its 5 s timeout,
    `claim-entry-gate.ts:56`), saves ⛔ no draft `lastStep`, and routes to `/(claim)/closed-helpline` (⛔ never the wizard on a
    closed claim: uploads are refused, `CLAIM_DOCUMENT_UPLOADABLE_STATES` `death-certificate-approval.ts:209,361`). Re-entry then goes
    through the entry gate (`apps/mobile/app/(claim)/index.tsx:43`, `getFiledClaimCaseId`) and the existing `claim_closed` bit
    (`claims.death-certificate-member.handlers.ts:82`) — ⛔ never a fresh wizard minting another closed claim.
  · Helpline console: `HelplineConsoleShell.tsx:238-268` (⛔ not `HelplineClaimPage.tsx`) renders, for `state === 'closed'`, a NEW staff line
    `helpline.result.closed` (*"Closed — another claim for this death goes ahead"*) IN PLACE OF created / exists, route-for-verification,
    `bank.required` and the bank-details slot; the override response (`claims.convergence.handlers.ts:232`) carries `state` too, but `ConvergenceDecisionStrip.tsx:283-294` renders
    ⛔ no result today (it only invalidates the pending list) ⇒ a NEW result line on the strip for `state === 'closed'`.
    Staff-only copy — AC6's "⛔ no new member-facing string" holds.
  · Staff: the label `closed: 'Closed — another claim for this death won its appeal'` (`apps/admin/src/modules/claim-verification/i18n-en.ts:620`;
    shown by `HelplineAppeal.tsx:110`, `HelplineCertificateReplacement.tsx:174`, `HelplineClaimContact.tsx:250`,
    `HelplineNomineeCorrection.tsx:116`, `NomineeRefusalsRoute.tsx:76`) becomes `'Closed — another claim for this death goes ahead'` — TRUE
    for both triggers. Console: OP2's 409 copy *"Another claim for this death has already passed the final vote. This claim cannot be
    finally approved."*; OP5's label *"Another claim for this death has been filed and is not closed."* The other claim's id, filer, nominee or
    state is ⛔ never shown on any member surface.
  · Comments: `$comment.closed` in `packages/i18n/locales/en/claim.json:157` is re-worded to cover BOTH closures (the `hi` `$comment` carries
    ⛔ no reason — unchanged; the parity gate `packages/i18n/scripts/lib.ts:39-60` checks presence only); every code comment that
    hard-codes the suspicion reason likewise — FIND them by grep (`git grep -n "won its appeal\|suspicion_appeal_allowed\|ONLY by"` over
    comments), ⛔ never from a list; at `34b9bab6` at least: `closed-helpline.tsx:3`, `closed-helpline-copy.ts:5`, `claim-entry-gate.ts:22`,
    `death-certificate-view.ts:172`, `packages/contracts/src/claims/appeal.ts:59`, `packages/contracts/src/claims/death-certificate.ts:178-183`,
    `claims.death-certificate-member.handlers.ts:81`, `claim/events.ts:647-655`, `packages/events/src/registry.ts:393`,
    `suspicion-refusal-persist.ts:60`.
  · Q3 B: the `-291` Q2 B text for the new trigger too — the 0151 closure purpose's selector widened, DLT template reused (⚠ rebases on
    6.34 TV2's `suspicion-notice-sms-templates.ts`) — then ⚠ go-live with FQ7's counsel row; Q3 A: ⛔ no text (AC6 pins it).
- **OP11 — ⛔ NO INTAKE REFUSAL (recorded, ⛔ not taken).** Removing the 30-day window or the override was considered and ⛔ not taken: the
  override is an intake capability built to Story 6.4's AC (AR-62 — planning, ⛔ not a Panel ruling; its window reads *"e.g., ±30 days"*), D4 B
  REQUIRES a separate claim for the suspicion case, and the guard at the payout point covers every creation path including future ones.
  H(ii) closes a new claim for a paid death at its mint.
- **OP12 — GO-LIVE.** ⛔ No roster row: ⛔ no external dependency (Q3 A). Under Q3 B — the FQ7 counsel row gains this text.

## Acceptance Criteria

### AC0 — Governance before code (Task 0)
The Panel's ruling on Q1–Q3 is transcribed into the routing note's ⏳ block and `.decision-log.md` (a new Trustee-ratified id, committed
ALONE); then the author-commit answering OP1–OP12 for that ruling — naming `-279` A6 as discharged and recording that the note widened
`-294` §3's framing — is committed ALONE; then a second governance commit updates this file's rulings table, Policy meaning and OPs
(`✅ committed by -NNN`), and the `deferred-work.md` items of Task 0.6 gain their pointers, each with its own status. ⛔ No code before
both commits. If Q1 C: the story ends here (zero-code; Tasks 1–6 left unchecked with a banner — [[project_story_automator_ops]]).

### AC1 — One definition (OP1)
The three state lists are pinned by value against `state.ts` / `read.ts` for EVERY state; `readOtherFinallyApprovedClaim` /
`readPaymentCommittedClaim` return ⛔ never the claim itself, ⛔ never a claim of another death or Pariwar, and the LOWEST `claim_case_id`
when (legacy) two qualify; the open fragment excludes terminal claims, finally approved claims and every claim on which RF1 stands, and
yields an empty set on a claim on which RF1 stands itself; NW1's scan covers the module and stays green.

### AC2 — The guard (OP2)
Given claim X of a death in `state_trustee_approved`, `approved` or `settled` ⇒ each of the five `final` call sites on claim Y of the same
death throws `DeathAlreadyFinallyApprovedError` ⇒ 409 `<prefix>.death_already_finally_approved` at all four translators (⛔ never a 500;
⛔ never the other claim's id in the body); the refused writer leaves Y unchanged (its transaction rolled back — the DOMAIN leg; through
the API with X `approved` / `settled`, H(iv) then closes Y — AC4); P1 on Y still succeeds; a claim of ANOTHER
death is unaffected; X routed to R9 and DENIED ⇒ the still-open Y can be finally approved.

### AC3 — The commit (OP3)
A `state_trustee_approved` candidate whose death already has an `approved` claim (this run or an earlier cycle) is skipped and kept; two
`state_trustee_approved` candidates of one death (seeded directly — the legacy shape) ⇒ the lower `claim_case_id` is committed IF it passes
RF7's re-checks, and the other is then skipped and stays `state_trustee_approved`; ⛔ no change for candidates of distinct deaths; the
result shape is unchanged.

### AC4 — Closed (OP4)
- **Core:** the closure walk skips `closed` claims before its cap (a death with 50+ closed claims still closes its open one).
- **H(i):** after a commit, every other CLOSABLE claim of each committed death — ⛔ never a `denied` or under-appeal claim, ⛔ never one on which
  RF1 stands, ⛔ never a refile RF5's wait still holds — is `closed` with `trigger: 'death_already_finally_approved'`, `held_by_claim_case_id`
  = the committed claim; its live returns, correction runs, R9 / appeal-panel sessions, routing and open appeal rows end (RF6's teardown —
  a test pins ⛔ no correction-chase text after `closed`); a replayed commit re-runs it idempotently; a claim that only passed the VOTE closes
  ⛔ nothing; an H(i) lock timeout is logged and leaves the claim to H(iv) (R2).
- **H(ii):** a new filing for a paid death (member, helpline, override) is `closed` in the mint's transaction — ⛔ not when RF5's wait holds
  it (OP4 (d)) — and the response `state` is `closed`; the member app lands on the closed screen, and RE-ENTERING the claim tab afterwards
  mints ⛔ no claim (the entry gate routes to the closed screen); the helpline console shows `helpline.result.closed` and ⛔ no bank slot; an override that mints a closed claim shows the strip's new
  closed line; a two-connection leg — H(i) and a mint for the same death in flight together ⇒
  the mint ends `closed` (⛔ never left open beside the paid claim); ⛔ no hang on the helpline or override route (a leg with a timeout).
- **H(iii):** a `denied` claim of a paid death can still initiate an appeal; reversed, it ends `closed` in the reversal's transaction and
  the appeal response's `claim_state` is `closed`.
- **H(iv):** a final-writer attempt refused with the 409 on a still-open claim of a paid death closes it; a failure there leaves the 409
  intact and logs at error level.
- RF6's own behaviour and specs are unchanged; R2's cases (an uphold, the 90-day lapse) are pinned as reaching H(iv) only.

### AC5 — The warning (OP5)
With two open claims of one death (⛔ not a suspicion pair), BOTH show `other_claim_for_death:<other id>`; approving needs FQ12's reason and
note; a claim filed after the District Admin approved X makes X's final approval wait for the District Admin's reason (6.23b) AND X is
LISTED in the District Admin's correction queue (including the fault path — the `lateWarningCandidate` column); a `denied` other claim's
key vanishes and REAPPEARS when it is appealed, and X is listed again; the key vanishes when the other claim becomes terminal or passes
the final vote and ⛔ no coverage then requires it; single read = bulk read; the single read still sends exactly one statement. Ordering
legs use separate COMMITTED transactions.

### AC6 — Nothing else moves (OP6, OP10; Invariant 3)
Every FQ5 leg still passes; ⛔ no OP5 key on either claim of a standing-refusal pair; the 0151 closure purpose selects ⛔ no claim closed with
`death_already_finally_approved` (Q3 A — a live leg proves ⛔ no row is written); ⛔ no new member-facing string; `CLAIM_EVENT_TYPES` still 36;
the staff label reads the neutral copy for both triggers; in a paid death an allowed suspicion appeal still closes a held third claim
through RF6 with `suspicion_appeal_allowed` (and its `-291` text) BEFORE H(iii) runs.

### AC7 — The paths (OP7, OP8)
F5 (>30 days), F6 (override), F7 (after `denied` / `closed`), F8 (ordinary refusal reversed; `-239` revised off; 6.19c D17), `-294` §2
(a), (b), (c) — each: a DOMAIN leg blocked at the second final approval, and an API leg showing the closure at its site; path (a)'s leg
pins that the allowed suspicion appeal ends `closed` — AFTER X's commit, by H(i) (X's commit itself waits on RF7 until the appeal is decided,
`state-trustee-decision-persist.ts:1329-1336`; at the reversal X is usually ⛔ not yet paid, so H(iii) does ⛔ not fire) (Invariant 3); the two-connection race of OP8.

### AC8 — The proof
Every load-bearing leg red-checked (Debug Log: plant, red, revert); live DB :5433; `pnpm ci:local` green
([[project_ci_local_concurrency_oversubscription]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0).** ⛔ No code until 0.5 is committed.
  - [ ] 0.1 `git fetch origin`; confirm `main` = `34b9bab6` (or re-pin and re-read every cited file that moved); grep `.decision-log.md`
        on `main` AND on every open story branch (`for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do git show
        $b:.decision-log.md | grep -oE '^### Decision [0-9-]+'; done | sort -u`) — ⚠ at 2026-10-10, `-313` / `-314` (`story/6-34-…`) and
        `-315` / `-316` (`story/6-30-…`) are TAKEN ⇒ this story's ids start at `-318` or later (`-317` is now also taken on `story/6-30-…`); when the branches merge, the log top conflicts —
        keep every entry, newest-first by id. Read any entry touching `-294`, RF5, RF6 or `-262` FQ5.
  - [ ] 0.2 BigDev reviews the routing note `trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` (one fresh-context
        check of it until ⛔ no BLOCKER / HIGH, the 6.24 / 6.27 precedent), then SENDS it. ⛔ Never record it as shown or sent before it went out
        ([[feedback_shown_to_panel_means_sent]]).
  - [ ] 0.3 When the Panel rules: transcribe verbatim into the note's ⏳ block (body ⛔ not edited) and a new Trustee-ratified decision
        (what it does ⛔ not cover listed); commit ALONE: `governance(6.28): <date>-NNN — Trustee-ratified …`.
  - [ ] 0.4 Re-write OP1–OP12 for the ruling (Q1 B ⇒ size the District Admin close action; Q1 A without the wait ⇒ OP5 (c) warning-only;
        Q2 B ⇒ a new row for the Panel's reopen power; Q3 B ⇒ OP10's text + the counsel row; OP9 backstop yes / no); put them to BigDev as
        short option summaries with recommendations; quote each answer AS GIVEN in the Debug Log.
  - [ ] 0.5 Draft the author-commit (header shape of `-302` / `-312`: type, status, §0 gate, Occasion, FOUND, DECIDED, Cost,
        Consequences, References — naming `-279` A6 discharged, the §3 widening, R1–R2 as residuals) in the scratchpad; one fresh-context
        check; insert above the newest `### Decision` (if refused, ask once — [[project_decision_log_writes_user_inserted]]); commit ALONE.
  - [ ] 0.6 Second governance commit: this file (rulings table, Policy meaning re-checked, OPs `✅ committed by -NNN`); `epics.md`'s
        `### Story 6.28` brief ACs updated to the ruling; a dated
        `⚠ ADDRESSED by 6.28 / -NNN` line under 6.24a's Trap 9 note and its P9 sentence (their text kept); `deferred-work.md`, each with
        its OWN status ([[feedback_closure_language_precision]]):
        1. `## Deferred from: code review of 9-1-nominee-console-sunitas-surface-…` → *"AC1(b) 'reconciliation status across pools' is
           structurally single-pool-only"* (`resolveActiveNomineePool`) — *"one claim → one pool PER DEATH made true by 6.28 / -NNN; a
           nominee for SEVERAL deaths ⛔ not addressed"*.
        2. `## Deferred from: code review of 6-20-… CHUNK 1 of 4` → *"A correction applied under one claim is invisible to another
           concurrently-live claim for the same deceased…"* — *"⛔ not addressed — two live claims stay possible (OP11); only their payment
           is bounded"*.
        3. `## Deferred from: code review of 6-20-… CHUNK 2 of 4` → *"DSAR `nomineeHistory.determinationMarks` … with two claims for one
           death (D17)…"* — *"⛔ not addressed"*.
        4. `## Deferred from: code review of story-6.24a, ROUND 2 …` → its preamble's *"D2 — ⛔ no per-death second-approval guard"* —
           *"addressed by 6.28 / -NNN"*. Add R1 and R2 as new items.
- [ ] **Task 1 — OP1 (AC1).** The leaf module, the three by-value lists + their pin, the fragments, the thin reads, NW1's entry list; unit +
      live-DB legs.
- [ ] **Task 2 — OP2 (AC2, AC7 race).** The conjunct after RF5's, the typed error, the four translators (incl. the defensive verifier-decision
      one), the console copy; the gate-order spec gains the new position; the R9-deny leg; the OP8 two-connection race, red-checked.
- [ ] **Task 3 — OP3 (AC3).** The commit re-check after `:1339`; legs incl. the legacy two-`state_trustee_approved` seed and an earlier
      cycle's `approved` claim.
- [ ] **Task 4 — OP4 (AC4).** Extract RF6's core (three keys → row; RF6's specs green, unchanged); the payload enum;
      `closeClaimsOfPaidDeath`; H(i) in `postCommit` (fresh + replay); H(ii) inside `tryConverge` / `overrideIntakeAttempt` (self-mode) +
      the `closed` return; H(iii)'s `closed` return; the core's `<> 'closed'` prefilter + cap log; H(iii) inside the three reversal arms (self-mode); H(iv) — ONE shared helper in the four final-writer handlers
      (Trap 14); the two-connection mint leg; the no-hang legs.
- [ ] **Task 5 — OP5 (AC5).** The kind (+ contracts mirror — run its vitest, [[project_contracts_tests_outside_tsc]]), the embedded fragment in
      both readers + the single = bulk test, the `lateArm` fourth disjunct (+ the fault-path leg), the label, the pinned test bumped with a
      reason, the late-wait leg, the vanish / reappear legs.
- [ ] **Task 6 — OP10 + paths + proof (AC6–AC8).** The `state === 'closed'` routing (`relationship.tsx` + the filed-claim pointer;
      `HelplineConsoleShell.tsx` + the convergence strip — ⛔ no contract change); the staff label + `helpline.result.closed`;
      `$comment.closed` (en) + every comment the grep finds; OP7's two-layer specs; the FQ5 regression
      legs; the 0151 negative leg; red-checks logged; `pnpm ci:local` green; story records; `sprint-status.yaml` row → `review` with ONE
      ledger entry.

### Review Findings

## Dev Notes

### Traps
1. **The conjunct BEFORE RF15's key = two payments.** Placed before `assertSuspicionAppealDecidedForFinalApproval`, two final writers of
   one death read concurrently and both pass (OP8's red-check proves it). ⛔ Never move RF5's conjunct; ⛔ never make the key conditional.
2. **⛔ Never a second transaction asking for the intake key from a request that holds it.** The helpline intake and the override write in
   the REQUEST transaction (committed in `onSend`); a handler-side closure in its own transaction would wait on its own request for ever,
   invisible to Postgres. H(ii) runs INSIDE the mint; ⛔ never "after the mint" in the handler. ⛔ Never call `closeClaimsOfPaidDeath` from
   inside a domain final writer either (it would take the intake key after the claim row).
3. **⛔ No RF15 key in `commitCycleFreeze`.** It holds candidate rows in claim order across deaths; taking a per-death key after a row
   while a final writer of ANOTHER claim of that death holds its row and waits for the same key is a cycle. OP3 reads committed state
   with ⛔ no key — it does ⛔ not need one (OP2 serialises the writers).
4. **⛔ Never closing what FQ5 decides.** A claim on which RF1 stands, or the refile it holds, is ⛔ never closed by OP4 while RF5's wait holds — RF6 owns that pair
   (Invariant 3). The open fragment and the closure exclude them; a test per case.
5. **The trigger widening must ⛔ never fire `-291`'s text** (Fact 6). `closedByAppealSql` / `readClosingEvent` stay keyed on
   `suspicion_appeal_allowed`; a negative live leg.
6. **`settled` is unreachable today** (F4) — include it in both lists anyway (when settlement ships, a settled claim must still block).
7. **Close at the COMMIT, ⛔ never at the vote** (F15). A closure keyed on `state_trustee_approved` closes Y for good while R9 can still deny
   X — the death then paid by ⛔ no claim.
8. **Branded ids are lower-case** ([[project_branded_ids_lowercase]]) — compare claim ids as branded, ⛔ never raw strings.
9. **Every `toHaveLength` / kind-list pin** — grep `APPROVAL_WARNING_KINDS`, the pin at `approval-warnings.test.ts:56-68` (5 kinds today),
   the contracts mirror + its lockstep test, the console label map; NW1's entry list; `FENCED_FILES` (pinned 41,
   `nominee-name-no-comparison-fence.test.ts:174`) if a fenced file gains an import. ⚠ **6.27b** (backlog) appends `peer_says_not_died` /
   `peer_death_date_differs` to the same five places, adds its own `lateArm` source (PM10) and filters kinds per actor (PM25 (c)) —
   whichever story lands SECOND rebases: ⛔ neither drops the other's kind or arm; the pin may read 7 → 8.
10. **⛔ Never close a `denied` or under-appeal claim of a paid death** (OP4 (b)). Its appeal right — from the PRD and 6.16 D-E, restated in
    `-291` Q1 A's ratified *"Every other refusal keeps ⛔ no time limit"* — stays; Q2 A only makes it pay nothing. A test: a `denied` claim of a
    paid death can still initiate an appeal; reversed, it is closed by H(iii).
11. **Live-DB discipline** — ⛔ never regenerate an applied migration; ⛔ never `DROP SCHEMA`; separate COMMITTED transactions for ordering legs
    ([[project_live_db_test_gotchas]], [[project_db_clock_ordering_tests_tie]]). OP2–OP5 need ⛔ no migration.
12. **NW1's leaf fence.** `read.ts:26` imports `state.ts`, and `state.ts:38` imports `events.ts` — the import `approval-warnings.test.ts:351-353`
    forbids, type-only included. OP1's module copies the lists BY VALUE; `state.ts` constants appear ONLY in the pin test.
13. **SELF-MODE (H(ii), H(iii)).** The claim being minted or reversed is already locked by its writer, and its pre-closure state is ⛔ never
    visible outside that transaction ⇒ the core takes ⛔ no `appeal:` / `r9:` / trustee key for it (taking them AFTER its row would invert
    the order); the teardown still runs. OTHER claims of the death are ⛔ never touched in self-mode.
14. **H(iv)'s order.** In the cycle-freeze vote and R9-finalize handlers the translator throws INSIDE `catch`, before `finally` closes the
    transaction (`claims.cycle-freeze.handlers.ts:524-541` vote; `claims.r9-voting.handlers.ts:517-527` finalize) ⇒ capture the error, let `finally` roll back, THEN run the
    shared helper in its own transaction, THEN translate. In the two `inWriteTx` sites (`claims.correction-closure.handlers.ts:592`,
    `claims.correction-escalation.handlers.ts:290`) the transaction is already closed when the handler's `catch` runs ⇒ the helper runs in
    `catch`. ⛔ No house precedent for a write on a refused request — the helper is ONE place, logged, ⛔ never failing the
    request.
15. **The single-read statement pin** (`verifier-console.spec.ts:1122`) and the bulk slices — OP5 embeds a fragment; ⛔ never a per-claim
    query in either reader.

### The existing code each change touches (UPDATE files)
- `packages/domain/src/claim/nominee-name-check.ts` (`:403-435` the gate; `:443-458` the options) — ONE new call after RF5's. Preserve
  the order and EA2 LAST; `-251`'s early return stays inside `assertNomineeNameCheckForApproval` (⛔ never OP2 there).
- `packages/domain/src/claim/suspicion-refusal-persist.ts` (`:61` the trigger constant; `:99-127` the lock rule + helper; `:149-212` the
  closure; `:215-243` `endLiveProcesses`) — extract the per-claim core; preserve the `-239` early return, the `notClosed` report,
  `heldClaimsAuditContext`'s consumer.
- `packages/domain/src/claim/appeal-persist.ts` (`:368` `reviewAppealStage1`, `:461` `decideAppealStage3`; RF6 calls `:427`, `:514`) and
  `appeal-panel-persist.ts` (`:507` `finalizeAppealOutcome`; RF6 `:645`) — H(iii) after RF6, reversal arms only.
- `packages/domain/src/claim/icp.ts` (`:287` intake key; `:300-374` the mint arm, return `:370`; `:569-661` the override, return `:660`) — H(ii)
  + the `closed` return.
- `apps/mobile/lib/filed-claim.ts` (`:35` `setFiledClaimCaseId`).
- `packages/domain/src/claim/events.ts` (`:657-665`) — the `trigger` enum. Preserve `held_by_claim_case_id`, `deceased_member_id`.
- `packages/domain/src/claim/state-trustee-decision-persist.ts` (`:1244-1430`) — OP3 after `:1339`. Preserve the idempotent replay, the
  23505 swallow, `getFrozenClaimRefs` (`:1462-1473`).
- `packages/domain/src/claim/approval-warnings.ts` (`:107-112`, `:372`, `:427`, `:551-568`, `:737`) — the kind, the embedded fragment, the
  derivation; `packages/domain/src/claim/correction-queue-read.ts` (`:150-185`) — the fourth `lateArm` disjunct.
- `packages/domain/src/claim/errors.ts` — the new error beside `SuspicionAppealPendingError` (`:818`).
- `apps/api/src/modules/claims/` — translators: `claims.cycle-freeze.handlers.ts` (`:168`), `claims.r9-voting.handlers.ts` (`:122`),
  `claims.correction-closure.handlers.ts` (`:219`, shared by `claims.correction-escalation.handlers.ts`), `claims.verification-decision.handlers.ts`
  (`:111`, defensive); H(iv) in `claims.cycle-freeze.handlers.ts:442`, `claims.r9-voting.handlers.ts:510`,
  `claims.correction-closure.handlers.ts:593`, `claims.correction-escalation.handlers.ts:290`; H(i) in `claims.cycle-freeze.handlers.ts`
  `postCommit` (`:570-672` — H(i) goes after the trigger block, which ends `:671`); the appeal responses' `claim_state` (`claims.appeal.handlers.ts:428,557,629`); ⛔ no intake handler change.
- `packages/contracts/src/claims/verification-decision.ts` (`:134-136`) — ⛔ no intake-response change (`filing.ts:137-143`, `helpline.ts:84-94`
  are `.strict()`);
  `apps/admin/src/modules/claim-verification/i18n-en.ts` (`:149` kinds, `:620` the closed label); `apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx` (`:238-268`) + the `helpline.*` copy;
  `apps/mobile/app/(claim)/relationship.tsx` (`:44-48`); `packages/i18n/locales/en/claim.json` (`$comment.closed`, `:157`); every comment OP10's grep
  finds.
- Tests that pin what moves: `packages/domain/tests/claim/approval-warnings.test.ts` (`:56-68`, `:338-376`),
  `tests/claim/suspicion-refusal.test.ts` (`:164-170`), `tests/integration/claim/{suspicion-refusal,nominee-name-check,
  ground-inspection-approval}.spec.ts` (gate order), `tests/integration/claim/suspicion-refusal-concurrency.spec.ts` (RF6 legs),
  `verifier-console.spec.ts` (`:1122`), `packages/contracts/tests/claims-verifier-decision.test.ts` (`:225`).

### Testing standards
Live DB on :5433 (`DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable`); own-committing two-connection
races wait on `pg_stat_activity` lock waits (⛔ never sleeps — the 6.24a `BLOCKED_MS` house pattern); per-test ROLLBACK elsewhere; every
instant compared set EXPLICITLY; every AC leg present before its Task is ticked; each load-bearing leg red-checked and logged.
[[project_redetermination_test_fixture_traps]] for seeding two claims of one death. ⚠ A "not a candidate" / "not listed" assertion is
visible only where the prefilter's verdict is — use the queue's fault path (`lateWarningCandidate`) for OP5 (b).

### Previous-story intelligence (6.24a / 6.24b / 6.29 / 6.27b)
- 6.24a built RF5 / RF6 / RF7 / RF15 — this story's substrate; its review rounds 2–3 found the gap (`-294`) and the 30-day-window MEDIUM
  (the strip copy said a later filing joins — it mints). Its Trap 9 already carries the `-294` §2 note; its P9 sentence names this row.
- 6.24a extracted actor-free cores (`supersedeAppealPanelSession` `appeal-panel-session.ts:56`, `supersedeR9VotingSession`
  `r9-voting-persist.ts:823`, the routing supersession) — REUSE them.
- 6.29: the jobs DB role is systemic (Row 26) — OP4 deliberately adds ⛔ no jobs sweep (hence R2).
- 6.27b (backlog) edits the same warning list, the same `lateArm` and the actor filtering — Trap 9. 6.27a's peer requests go inert on a
  closed claim (`isClaimInAnswerWindow`) — ⛔ no teardown needed.
- Review rounds repeatedly found lock-order cycles, "a comment claims unreachable", and a hook placed where a request transaction still
  held the lock — state reachability by test, ⛔ never by comment ([[feedback_trace_reachability_before_escalating]]).

### Project Structure Notes
Domain in `packages/domain/src/claim/` (⛔ no new package — [[feedback_no_premature_package]]); API handlers in
`apps/api/src/modules/claims/`; ⛔ no migration expected (OP9 ⛔ not built). ⚠ ⛔ Never import a pg-touching domain namespace into contracts
([[project_contracts_domain_bundle_boundary]]).

### References
- `.decision-log.md`: `2026-10-08-294` (§1, §2, §3), `2026-10-07-292` (RF1, RF4–RF7, RF13, RF15), `2026-09-28-262` FQ5, `2026-09-28-261` D4 B,
  `2026-09-28-264` FQ12, `2026-10-04-279` (A2, A4, A6), `2026-10-07-291`, `2026-10-07-293`, `2026-09-04-192`; precedents `-281` Q1 B, `-303` Q2 A.
- Routing notes: `trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` (this story's); `…-2026-09-28-6-20-follow-ups.md`
  (FQ5 as put); template `trustee-panel-routing-note-TEMPLATE.md`.
- Stories: `6-24-true-nominee-refile-after-a-suspicion-refusal.md` (Trap 9 + its `-294` note; Review Findings ROUND 2 D2; P9);
  `6-26b-death-facts-warnings-and-register-check.md` (adding a warning kind); `6-23b-every-approver-gives-a-warning-reason.md` (the wait, the
  queue); `6-27b-peer-mesh-warnings-wait-and-approvers-view.md` (PM9 / PM10 / PM25).
- `epics.md` — Story 6.4 (ICP: the window and the override, AR-62), `### Story 6.28`.
- Niyamavali: local private-corpus checkout `docs/legal/niyamavali.md` (§5.3, §5.4, §6.4, §4.3, Part 9).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-10-10 — `bmad-create-story 6.28`: ultimate context engine analysis completed — comprehensive developer guide created. The Panel
  routing note is written and ⛔ NOT sent; ⛔ no code until Task 0 completes.
- 2026-10-10 — `bmad-create-story validate 6.28` (v1.1): four fresh-context verifiers; all findings applied (BigDev: *"all"*); the closure
  moved from the final vote to the cycle commit (the recommended option). The routing note re-worded to match (still ⛔ NOT sent).
- 2026-10-10 — v1.2: a fresh-context re-validate of v1.1's own design (2 HIGH, 4 MEDIUM, 8 LOW — all applied).
- 2026-10-10 — v1.3: round 3 (one fresh-context verifier): **0 BLOCKER / 0 HIGH**; 2 MEDIUM + 9 LOW applied.

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-10 | Created (`bmad-create-story 6.28`, pinned `34b9bab6`): three read-only research passes; F1–F14; OP1–OP12 PROPOSED for Q1 A / Q2 A / Q3 A with each alternative's delta; the Panel routing note `2026-10-10-6-28-one-payment-per-death` written (⛔ not sent). backlog → ready-for-dev (⛔ no code before Task 0). |
| 1.1 | 2026-10-10 | Validate (four fresh-context verifiers: cites, design + locks, governance + siblings, warning + member surfaces; findings re-checked by hand; BigDev: *"all"*). ⭐ OP4 closes at the CYCLE COMMIT, ⛔ not the final vote (F15 — R9 can still deny a voted claim); its four sites tabled (H(i) post-commit; H(ii) INSIDE the mint — the helpline / override request transaction would have hung a handler-side closure; H(iii) INSIDE the reversal; H(iv) after the refused tx) with self-mode keys and R1 / R2 residuals; F12's three-key order. OP1 a leaf with by-value lists (NW1) and SQL fragments; OP5 embedded in both readers (the one-statement pin), a fourth correction-queue `lateArm` disjunct (`-279` A4), the wait put to the Panel (`-279` A6), finally approved claims ⛔ not "open", ⛔ no key on an RF1 claim itself. Invariant 3: path (a) disclosed (FQ5 B's cost), ⛔ never "exact". OP10: the intake `claim_closed` flag + closed-screen routing, the neutral staff label, the five comments. OP7 two layers (domain 409 / API closure). Cites corrected (F9's `voteOnFrozenClaim` file, `commitCycleFreeze` to `:1430`, OP3 after `:1339`, `pool/` read models, the hook handlers incl. `correction-escalation`). Rulings `-279` A4/A6, `-291` Q1 A, `-293`; Niyamavali §5.3 / §6.4 engaged; OP11 ⛔ not "ratified"; Task 0.1 open-branch id grep (`-313`–`-316` taken); Task 0.6's four deferred-work items with their own statuses; 6.27b coordination. |
| 1.2 | 2026-10-10 | Re-validate of v1.1's own design (one fresh-context verifier): ⭐ the intake signal is `state === 'closed'` — ⛔ no new field on the two `.strict()` responses — and the member app sets the filed-claim pointer so re-entry ⛔ never mints another closed claim; the helpline wiring is `HelplineConsoleShell` + a staff line `helpline.result.closed`; H(iii)'s writers return `closed`; RF6-first in a paid death (a held third claim's `-291` text) recorded + pinned; the closure core skips `closed` before its cap; H(i) runs after the trigger block on every response with a `lock_timeout` and an actor; H(ii) ⛔ not when RF5 holds; OP5 (b)'s boolean sibling fragment; Trap 14 split by handler shape; comments found by grep; R1 gains the concurrent-commit legacy case; Task 0.6's backwards epics clause removed; seven cites corrected. |
| 1.3 | 2026-10-10 | Round 3 (one fresh-context verifier): **0 BLOCKER / 0 HIGH**. Applied 2 MEDIUM — AC2's "Y unchanged" scoped to the domain leg (through the API, H(iv) closes Y when X is paid); P4 and the note's Q1 A say the warning runs only UNTIL one claim passes the final vote (after it, the others are refused at the vote) — and 9 LOW: the filed-claim pointer ⛔ never overwrites a live / paid claim's; Trap 14's R9 cite; seven cites (`icp.ts:370`, `appeal-persist.ts:445,552`, `appeal-panel-persist.ts:678`, `:1266,1414`, F12 `:175-182`, H(i) after `:671`); the UPDATE list's comment grep; two glyphs; ids from `-318`; AC7 path (a)'s timing (closed by H(i) after X's commit); the convergence strip's NEW result line + its AC leg; H(iv)'s helper reads `deceased_member_id` itself; Niyamavali §2.4 engaged; an AC leg for H(i)'s lock timeout. |
