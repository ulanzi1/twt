---
baseline_commit: 34b9bab6
---

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.28`) to `main` at `34b9bab6` (the 6.27 / 6.30 SHA-map commit after PR #268). Every `file:NNN`
below is AS OF `34b9bab6`, derived by three read-only research passes (the approval writers and their locks; the reachability of two
live claims for one death; the money path from approval to payment) and re-verified by four fresh-context passes (v1.1: every cite, the
design and its locks, the governance, the warning and member surfaces). ⚠ Before Task 1, run
`git diff --name-only 34b9bab6..HEAD -- packages apps scripts`; any cited file in that list is re-read.

STATUS: `ready-for-dev` — ✅ GOVERNANCE DONE, ⛔⛔ CODE NOT YET STARTED. The Panel ruled Q1–Q4 A/A/A/A
(`2026-10-11-318`, Trustee-ratified, routing note
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` — sent and ruled); the author-commit
answering OP1–OP14 for that ruling (`2026-10-11-319`) is committed. `2026-10-08-294` §3 ordered exactly this: *"BEFORE any code: (i) the
Panel question … written from the routing-note template, with this entry's (a)–(c) and the pre-6.24a root as the deciding facts …
(ii) then the engineering guard that ruling permits."* ([[feedback_governance_commits_precede_implementation]]) — both now DISCHARGED.
⭐ The OPs were written for the note's RECOMMENDED answers (Q1 A, Q2 A, Q3 A, Q4 A); the Panel ruled exactly this reading on all four, so
every OP1–OP14 below is built AS WRITTEN — including OP13 (Q4 A ratifies it) and OP5 (c)'s wait (Q1 A, as ruled, carries it; `-279` A6
discharged). OP9's DB backstop is ⛔ NOT built (BigDev, `-319`): OP2 + OP3 are the sole control. Task 1 may now start.

GLYPH REGISTER, ADDRESSING RULE: as 6.24a / 6.24b / 6.29 — `⛔` sits ONLY on a negation word · `⭐` = key fact or action · `⚠` = hazard.
Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — cite the entry id / item / row key). `file:NNN` is used ONLY for code.
LETTERS: `OP1`…`OP14` = this story's build decisions (the author's; PROPOSED until Task 0.5). `F1`…`F15` = FOUND facts (⛔ not decided).
`Q1`…`Q4` = the Panel's questions (⏳ awaiting). `RF` = 6.24a's (`-292`, `-294`). `H(i)`…`H(iv)` = OP4's closure sites. `R1`…`R2` =
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
> the death is open. ⭐ **The system still refuses nothing**: a closed claim is ⛔ never a refusal and ⛔ never appealable. ⭐ The suspicion
> corner (`-294` §2 (a)) is closed while the money has ⛔ not moved: an allowed suspicion appeal now closes another claim that has passed
> the final vote but is ⛔ not yet paid (OP13), so FQ5 holds. What remains — the refusal changed to the suspicion reason only after the
> death was PAID — is Q2's case, put to the Panel by name (Invariant 3).

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
>    second filing 31+ days after a still-open claim mints a second live claim. Both pass every gate conjunct (F9). ⭐ OP11 REMOVES the
>    window (the key is the exact deceased member — a person dies once), so this path closes at intake; the guard still covers F6–F8.
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
| `-262` FQ5 A | the true nominee's claim waits at final approval for the suspicion appeal; allowed ⇒ it is closed | ⭐ Trustee-ratified — OP2 / OP4 / OP6 leave its machinery exact; OP13 (⏳ the note's Q4 — recommended A) lets RF6 close a voted, UNPAID other claim, so path (a) before payment follows FQ5 A; ⚠ after payment, an allowed appeal pays nothing — Q2's case (Q1 / Q2 cost lines) |
| `-292` RF4 | `closed`; a claim already finally approved (`state_trustee_approved`, `approved`), paid or closed is ⛔ never moved | author-commit — ⭐ OP13 SUPERSEDES it in part (6.28's author-commit): `state_trustee_approved` becomes closable; `approved` / `settled` / `closed` stay ⛔ not closable |
| `-262` FQ5 B, C (⛔ not taken) | B: *"approving it ends the appeal"* (cost: *"Takes away the appeal the Panel granted (`-239` c)"*); C: *"Whichever claim is approved first is paid, and the other is closed"* — *"A race between staff"* | ⭐ the Panel's earlier rejections — disclosed in the note (Q1 A resembles C; path (a) carries B's cost) |
| `-264` FQ12 | approving while ANY warning shows needs a reason and a note | ⭐ Trustee-ratified — OP5's new kind falls under it |
| `-277` Q3 B | a warning that appears after the District Admin approved needs their reason and note too (6.23b's wait) | ⭐ Trustee-ratified — OP5's kind enters the wait ONLY if Q1 rules it (`-279` A6) |
| `-279` A4 | the District Admin learns of a waiting claim in their correction queue (6.23b) | author-commit — OP5 (b) adds the queue arm for the new kind |
| `-279` A6 | *"a new warning kind enters the wait only by a decision"* | author-commit — ⭐ put to the Panel inside Q1 A (the precedents: `-281` Q1 B, `-303` Q2 A); the author-commit names A6 as discharged |
| `-291` Q1 A | the 90-day limit for the suspicion refusal only; *"Every other refusal keeps ⛔ no time limit"* | ⭐ Trustee-ratified — Q2 A narrows its EFFECT (an appeal won after payment pays nothing); put to the Panel in Q2 A's cost |
| `-291` Q2 B | the closure text after an allowed suspicion appeal | ⭐ Trustee-ratified — ⛔ not extended to OP4's closure unless Q3 B |
| `-293` item 2 A | while any other claim for the death is not closed, a refusal's reason can ⛔ not be changed AWAY from the suspicion reason | ⭐ Trustee-ratified — ⛔ not changed; changing ONTO it stays open (path (a)) |
| **Q1** (routing note `2026-10-10-6-28-one-payment-per-death`) | which claim is paid — A: the first to pass the final vote; the others closed when its payment is committed; a warning (and the wait) while another is open · B: staff close one first · C: both | ✅ **Trustee-ratified `-318` — A** ✅ committed by `-319` |
| **Q2** | what the other family is owed once the death is paid — A: nothing more from the members · B: a Panel-ordered second payment | ✅ **Trustee-ratified `-318` — A** ✅ committed by `-319` |
| **Q3** | is the family of a claim closed this way texted — A: ⛔ no · B: once, `-291` Q2's words | ✅ **Trustee-ratified `-318` — A** ✅ committed by `-319` |
| **Q4** | does the suspicion-appeal rule reach a claim that passed the final vote but is ⛔ not yet paid — A: yes, close it (OP13) · B: ⛔ no, it is paid and the appellant's claim is closed | ✅ **Trustee-ratified `-318` — A** ✅ committed by `-319` |

**⛔ Not covered by any ruling (stays open):** whether intake should stop minting a second claim at all (OP11 — the author's, TAKEN: the window
removed; override-apart and after-terminal second claims remain); a Panel power to reopen a closed claim (Q2 B — a later row if ruled); the residuals R1–R2; the Hindi review of any
changed copy.

## ⭐ THE INVARIANTS
1. **One final approval per death.** ⛔ Never are two claims of the same `(pariwar_id, deceased_member_id)` in `state_trustee_approved` /
   `approved` / `settled` at once — enforced at the gate (OP2) and re-checked at the payout milestone (OP3). (A deceased member's claims
   all live in ONE Pariwar — the helpline checks `memberExists` in the Pariwar, member intake uses the session's own id.)
2. **The system refuses nothing.** The guard is a 409 at FINAL approval; the other claim is **closed** (`closed`, `claim.closed`) — ⛔ never
   `denied`, ⛔ never appealable, ⛔ never a 6.19c closures row, ⛔ never `denied_no_appeal`.
3. **FQ5 holds while the money has ⛔ not moved — and its one remaining gap is disclosed, ⛔ never papered over.** A claim on which a
   suspicion refusal stands (RF1) and its held refile keep RF5 / RF6 / RF7; OP5's warning does ⛔ not count a claim on which RF1 stands and
   ⛔ none is derived on it; OP4 ⛔ never closes a claim RF6 would have to decide. Path (a) (`-294` §2): X passes the final vote; S (refused
   for another reason) is revised ONTO the suspicion reason. ⭐ **Before X's payment is committed** — RF7 already holds X's commit while S's
   refusal stands (`state-trustee-decision-persist.ts:1322-1336`); if S's appeal is ALLOWED, RF6 now closes X (OP13) and S goes on: FQ5 A as
   ruled. ⚠ **After X's payment is committed** — the money cannot come back; RF6 reports X `notClosed`, OP2 blocks S, and H(iii) closes S:
   the family that WON its suspicion appeal is paid nothing. That residual is Q2's case (A: pursued outside the system; B: a Panel-ordered
   second payment) — the Panel's to accept; ⛔ never call it "FQ5 exact".
4. **ONE definition** of "finally approved", "payment committed" and "another open claim for the death" (OP1) — the gate, the commit, the
   closure, the warning, the queue and the console all read it; ⛔ none re-derives it. The terminal-state list is copied BY VALUE into
   OP1's module (NW1's leaf fence — Trap 12) with a unit test pinning it equal to `CLAIM_TERMINAL_STATES`.
5. **⛔ No new lock order.** The core guard rides RF15's key (Fact 3); every closure takes the intake key FIRST — in the transaction that
   already holds it (H(ii), H(iii)) or in its OWN transaction (H(i), H(iv)) (Fact 5).

## 📜 Policy meaning (AI-10-1)
⭐ OP11 (intake joins every later filing to the open claim) and OP14 (what staff see, and a staff trigger for P2's closure) add ⛔ no
benefit-gating predicate. This story ADDS a conjunct to a benefit-gating predicate (the final approval gate) and a new reason for an existing terminal outcome
(`closed`). In the member's terms — ⚠ WRITTEN FOR Q1 A / Q2 A; re-written at Task 0.4 for whatever the Panel rules:
- **P1 (OP2 — the guard):** *"Once one claim for a member's death has passed the final vote, no other claim for the same death can pass
  it — unless the first claim is then refused."*
- **P2 (OP4 — closed):** *"When the first claim's payment begins, every other claim for that death that is still open is closed — not
  refused, not appealable; the family sees 'This claim has been closed. Please call the helpline.'"*
- **P3 (Q2 A):** *"A claim for a death that has already been paid can still have a refusal appealed, but even an allowed appeal — a
  suspicion appeal included — does not lead to a second payment for the same death."*
- **P4 (OP5 — the warning):** *"Until one claim for a death passes the final vote, anyone approving another claim for the same death is
  warned and must give a reason and a note — and a claim filed after the District Admin approved makes the final approval wait for the
  District Admin's reason. Once one claim has passed the final vote, no other claim can pass it — the approver is stopped with its own message (the
  claim is not refused)."*
- **P5 (OP13 — the suspicion appeal):** *"If a family wins a suspicion appeal while another claim for the same death has passed the final
  vote but has not yet been paid, that other claim is closed and the family's claim goes ahead."* (Niyamavali: ⛔ no clause engaged beyond
  §5.3's discretion — consistent.)
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
  and `approved` are ⛔ not terminal ⇒ a filing WITHIN 30 days of a paid claim CONVERGES into it (benign — ⛔ no second claim). ⭐ The
  window's ORIGIN: Story 6.4's planning AC (AR-62) — *"narrow time window e.g., ±30 days"* — an example, ⛔ never a Panel ruling or a reasoned
  choice; the code calls it *"a policy knob"* (`icp.ts:61-66`). Before 6.4, `initiateIntake` joined a filing to ANY non-terminal claim of the
  death with ⛔ no time limit (6.4's story, Dev Notes item 2). ⇒ OP11.
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

## ⚖️ Build decisions OP1–OP14 — ⚠ the author's; PROPOSED, ⛔ not committed until Task 0.5

⭐ §0 (template `trustee-panel-routing-note-TEMPLATE.md`): every OP strips to *"the code should do X"* in service of Q1–Q4's answers.
Each says what changes under a non-recommended answer.

- **OP1 — ONE DEFINITION, ONE MODULE.** New `packages/domain/src/claim/one-payment-per-death.ts` (a LEAF: ⛔ no import of `read.ts`,
  `state.ts`, `events.ts`, `nominee-name-check.ts`, `nominee-lock.ts` — it joins NW1's entry list, `approval-warnings.test.ts:338-376`):
  · `FINALLY_APPROVED_CLAIM_STATES = ['state_trustee_approved', 'approved', 'settled']` and `PAYMENT_COMMITTED_CLAIM_STATES = ['approved',
    'settled']` and `OPEN_EXCLUDED_TERMINAL_STATES = ['settled', 'denied', 'closed']` — literals BY VALUE (precedent
    `death-certificate-approval.ts:330-335`); a unit test (outside the module) pins, for EVERY state, `FINALLY_APPROVED_CLAIM_STATES` =
    `PAYMENT_COMMITTED_CLAIM_STATES` ∪ {`state_trustee_approved`}, `CLAIM_NOT_CLOSABLE_STATES` = `PAYMENT_COMMITTED_CLAIM_STATES` ∪ {`closed`}
    (after OP13), and the terminal list = `CLAIM_TERMINAL_STATES`.
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
  narrowed by OP13):** a skipped candidate whose death was committed in the SAME run is closed by H(i) (OP13 made `state_trustee_approved`
  closable); one whose death was paid in an EARLIER run stays `state_trustee_approved` (⛔ not returnable) and is re-selected by every run
  inside the 500 cap until an approver closes it from its voted card (OP14 (b)) or an R9 finalize (H(iv)) — ⛔ not addressed; reachable only from a legacy pair or a bypass. Likewise legacy-only: two concurrent commits
  under different `commit_id`s can each commit one claim of a legacy two-voted pair (READ COMMITTED; ⛔ nothing serialises them across
  commits).
- **OP4 — THE OTHER OPEN CLAIMS ARE CLOSED WHEN A PAYMENT IS COMMITTED (Q1 A).** Generalise RF6's helper: extract its per-claim core (the
  `appeal:` → `r9:` → `state_trustee_decision:` key order → row, the closable check, `endLiveProcesses`) into
  `closeOtherClaimsOfDeath(client, { pariwarId, deceasedMemberId, causeClaimCaseId, trigger, actor, actorId, auditId? })` — ⚠ the core
  selects `current_state <> 'closed'` BEFORE its cap (today RF6 selects ALL other claims, `suspicion-refusal-persist.ts:160-171`, `LIMIT 50`,
  so piled-up closed claims could push an open one out) and logs at error level when the cap is reached;
  `closeClaimsHeldBySuspicionAppeal` keeps its signature, its `-239` early return, its `notClosed` report and its behaviour (its specs
  green — EXCEPT the legs OP13 flips by design) and calls the core with `trigger: 'suspicion_appeal_allowed'`. A claim is closed with `trigger: 'death_already_finally_approved'`,
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
  | **H(iv)** | a final writer is refused with `DeathAlreadyFinallyApprovedError` | the four final-writer handlers (F10), through ONE shared helper | OWN — AFTER the refused tx is closed (Trap 14), with `SET LOCAL lock_timeout` as H(i); the helper takes `claimCaseId` and reads `deceased_member_id` UNLOCKED in its own transaction before the intake key (the `acquireSuspicionReversalLockForClaim` shape — the error carries ⛔ no `deceasedMemberId`) | as H(i) — a no-op unless a payment is committed |

  Each site is idempotent; H(i) / H(iv) failures are logged at error level with ids only and ⛔ never fail the request (the guard is the
  control — Invariant 1); H(ii) / H(iii) are part of their writer's transaction (a failure rolls the mint / reversal back — as RF6 does).
  ⭐ The writers RETURN the post-closure state: H(ii) — `tryConverge` / `overrideIntakeAttempt` return `closed` (today `converged.state`,
  `icp.ts:370,660`); H(iii) — the three reversal writers return `claimState: 'closed'` (today `projected.state` = `reversed`,
  `appeal-persist.ts:445,552`, `appeal-panel-persist.ts:678`) so the appeal responses' `claim_state` reads `closed`
  (`claims.appeal.handlers.ts:428,557,629`). ⚠ **R2 (recorded, ⛔ not addressed):** an open claim of a paid death that ⛔ no
  site reaches stays open, blocked by OP2, until its next final-approval attempt (H(iv)) or an approver's "Close this claim" (OP14 (b)) — an UPHOLD that releases a held refile (the
  uphold arm takes ⛔ no intake key), RF5's 90-day lapse (⛔ no event), a crash between commit and H(i) on a commit never replayed, an H(i) lock timeout. Its
  correction / certificate chases keep running until it is closed. Q1 B: H(i)–(iv) unchanged, PLUS a District Admin action *"close this
  claim — another claim for this death goes ahead"* (reason + note; `trigger: 'closed_by_district_admin'`; `claim.verify`-gated) — sized
  at Task 0.4; the note puts this closure under Q2 (Q2 B's reopen covers it) and Q3 (Q3 B texts it); it is ⛔ never applied to a `denied` or under-appeal claim, nor one RF1 / RF5 holds (OP4 (b)–(d)); ⚠ recorded cost —
  if the claim the District Admin kept is later refused (the freeze, R9, an upheld refusal), the death is paid by ⛔ no claim and the closed
  family cannot appeal the closure — the death goes unpaid unless the kept claim's refusal is overturned or the death is filed again (a
  `claim.closed` closure trips ⛔ no refile guard, F7); only Q2 B's reopening can revive the closed claim. Q1 C: ⛔ not built.
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
  `state_trustee_approved` arm (`:245`). ⭐ (c) It enters 6.23b's wait (`-277` Q3 B) because Q1 A, as RATIFIED (`-318`), says so — the wait is ⛔ not struck ⇒ built AS WRITTEN; the
  author-commit (`-319`) names `-279` A6 as discharged by that ruling.
  Recorded effects: any current key blocks a same-outcome revise of the District Admin's approval (F13); R9 votes cast before the other
  claim was filed must be re-cast (`-279` A2). ⚠ Coordinate with 6.27b (Trap 9). Q1 B: the same warning; Q1 C: ⛔ not built.
- **OP6 — FQ5'S MACHINERY STAYS EXACT.** ⛔ No change to RF1–RF16's code paths beyond OP4's extraction, H(iii)'s call after RF6 and
  OP13's closable widening; a test per
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
  operands are mechanised. **BigDev confirmed (`-319`, 2026-10-11): ⛔ NOT built** — OP2 + OP3 stay the sole control.
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
    for both triggers while the holding claim (`held_by_claim_case_id`) is ⛔ not refused / closed; once it is, the label reads *"Closed —
    the other claim for this death was later refused; the family may file again"* (the read joins the holding claim's state — a build item;
    the note's Q3 A promises it). Console: OP2's 409 copy *"Another claim for this death has already passed the final vote. This claim cannot be
    finally approved."*; OP5's label *"Another claim for this death has been filed and is not closed."* The other claim's id, filer, nominee or
    state is ⛔ never shown on any member surface.
  · Comments: `$comment.closed` in `packages/i18n/locales/en/claim.json:157` is re-worded to cover BOTH closures (the `hi` `$comment` carries
    ⛔ no reason — unchanged; the parity gate `packages/i18n/scripts/lib.ts:39-60` checks presence only); every code comment that
    hard-codes the suspicion reason likewise — FIND them by grep (`git grep -n "won its appeal\|suspicion_appeal_allowed\|ONLY by"` over
    comments), ⛔ never from a list; at `34b9bab6` at least: `closed-helpline.tsx:3`, `closed-helpline-copy.ts:5`, `claim-entry-gate.ts:22`,
    `death-certificate-view.ts:172`, `packages/contracts/src/claims/appeal.ts:59`, `packages/contracts/src/claims/death-certificate.ts:178-183`,
    `claims.death-certificate-member.handlers.ts:81`, `claim/events.ts:647-655`, `packages/events/src/registry.ts:393`,
    `suspicion-refusal-persist.ts:60`.
  · Q3 B: the `-291` Q2 B text for the new trigger too (and, under Q1 B, for `closed_by_district_admin`) — the 0151 closure purpose's selector widened, DLT template reused (⚠ rebases on
    6.34 TV2's `suspicion-notice-sms-templates.ts`) — then ⚠ go-live with FQ7's counsel row; Q3 A: ⛔ no text (AC6 pins it).
- **OP11 — THE 30-DAY CONVERGENCE WINDOW IS REMOVED (BigDev, 2026-10-10: *"Remove it in 6.28"*).** A new filing for a death converges onto
  ANY open claim of that death, however old. ⭐ Why: the dedup key is the EXACT `deceased_member_id` — a time window suits a FUZZY key (an old
  match is probably another event), ⛔ never an exact one; every case that MUST stay separate is already excluded WITHOUT the window — a
  terminal claim (`settled` / `denied` / `closed`) is ⛔ never a candidate, an overridden-apart claim (AC4) is ⛔ never one, a claim on which a
  suspicion refusal stands (`-261` D4 B / RF2) is ⛔ never one. ⭐ A later match is ⛔ never auto-merged: a cross-channel filing is a `pending`
  attempt on the convergence strip (`icp.ts:387-430`) for staff to merge or keep apart; a same-channel filing returns the existing claim
  (`:376-384`, idempotent) — exactly what happens within 30 days today. ⇒ F5 and `-294` §2 (b) become unreachable at intake (a filing JOINS
  an older reversed claim); the payout guard still covers F6 (override), F7 (after a terminal claim) and F8 (an appeal reversal).
  **The change (one predicate, mirrored EXACTLY at three sites):** `getConvergenceCandidate` (`icp.ts:109-139`) drops its `windowStartAt`
  parameter and the `gte(claims.createdAt, windowStartAt)` term (`:122`) — still `ORDER BY created_at DESC LIMIT 1`; `tryConverge` drops
  `:290`; `getPendingIntakeAttempts` (`:167-200`) drops the `windowInterval` term (`:171`, `:186`); `confirmMerge`'s candidate cross-check
  (`claims.convergence.handlers.ts:115-132`) drops its anchored window. `CONVERGENCE_WINDOW_DAYS` and its export (`icp.ts:61-66`,
  the comment at `claim/index.ts:12` — the export is `export * from './icp.js'`) are DELETED (`git grep` — ⛔ no other reader). Comments / copy that state the window are re-worded: `icp.ts:98`,
  `suspicion-refusal-persist.ts:99-102` (`-294` §2 (b)'s "an older reversed claim is ⛔ not a candidate"), the strip note
  `ConvergenceDecisionStrip.tsx:226-231` (*"… joins the overturned claim as before — but only while that claim is less than 30 days old; a later
  filing becomes a separate claim"* → *"… joins the overturned claim as before."*). ⚠ **Costs (recorded):** a filing for a PAID death now
  converges into the paid claim (it is ⛔ not terminal) — H(ii) fires only when every non-terminal claim of the death is excluded from convergence (the paid claim overridden apart, AC4) or the
  paid claim is `settled`; a later
  same-channel filing by ANOTHER family member lands in the existing claim (as within 30 days today — the nominee is decided by the certificate
  date, ⛔ never by the filer); a stalled claim now collects every later filing as a `pending` attempt for staff — ⛔ never a silent second claim.
  The override (`overrideIntakeAttempt`) and D4 B are ⛔ not changed. Author's decision (intake mechanics — ⛔ nothing anyone is owed); the
  author-commit records it, and the note lists it among *"deliberately ⛔ not asked"*.
- **OP12 — GO-LIVE.** ⛔ No roster row: ⛔ no external dependency (Q3 A). Under Q3 B — the FQ7 counsel row gains this text.
- **OP13 — AN ALLOWED SUSPICION APPEAL CLOSES A VOTED, UNPAID OTHER CLAIM (supersedes `-292` RF4 in part).** ⭐ **CONFIRMED BY THE PANEL**
  (**Q4 A**, `-318`; built by the author-commit `-319`): it applies FQ5 A to a claim that has ALREADY passed the final vote — later than the point
  FQ5 ruled on — closes it and texts its family; Invariant 3's residual (the corner left after this) stays the refusal-changed-to-suspicion-reason
  case put to the Panel by Q2, resolved A — nothing more from the members. `CLAIM_NOT_CLOSABLE_STATES`
  (`state.ts:359`) becomes `['settled', 'approved', 'closed']` — `state_trustee_approved` (*"approved-in-principle, reversible"*, Fact 4)
  is CLOSABLE; its doc-block and the reducer comment are re-worded (the sites listed below). ⭐ Effect at RF6: when a `-239` appeal
  is allowed, another claim of the death that passed the final vote but is ⛔ not yet committed is closed with `suspicion_appeal_allowed`
  (FQ5 A: *"appeal allowed → the new claim is **closed**"*) — through RF6's existing order (`appeal:` → `r9:` → `state_trustee_decision:` →
  row), the same `state_trustee_decision:` key `commitCycleFreeze` takes per candidate ⇒ the two serialise: a commit that got there first
  leaves X `approved` (⛔ not closable — Invariant 3's after-payment residual); otherwise X is `closed` and drops out of the commit's
  candidates (it selects `state_trustee_approved` only). Its live routing / R9 session ends by `endLiveProcesses`; ⛔ no pool exists to
  undo. ⚠ X's family receives the `-291` Q2 B text (the ruled trigger) — as ruled for every FQ5 closure. Effect at OP4: H(i) / H(iv) can
  now close a legacy voted other claim of a paid death (R1 narrowed). ⚠ Two 6.24a legs FLIP by design — `suspicion-refusal.spec.ts:386`
  (`notClosed: [{ … state: 'state_trustee_approved' }]` → `closed: [r]`) and `:772-812` — REWRITTEN, ⛔ not merely flipped: R joins
  `closed` at `:798` and the commit / own-visit tail (`:800-812`) is deleted; RF7's inspection arm (`state-trustee-decision-persist.ts:1337-1339`)
  is then recorded as defence-in-depth with ⛔ no reachable driver (its source must be a STANDING `-239` refusal — revising it away is RF13-locked,
  reversing or closing it now closes the voted claim too). Also: `suspicion-refusal.test.ts:134-136` (the closable count) and `:140` (the
  identity loop — `state_trustee_approved` leaves it), and `apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts:394-429` (the
  RF6 route leg asserting `held_claims_not_closed: [{ … 'state_trustee_approved' }]` → H closed); each rewrite cites 6.28's author-commit
  (superseded, ⛔ never re-read). Comment sites: `state.ts:338-341,352-358`, `claim/events.ts:649`, `packages/events/src/registry.ts:393`,
  `suspicion-refusal-persist.ts:17,88`, `claims.appeal.handlers.ts:199` and its error-log string `:211` (*"(state_trustee_approved / approved /
  settled) — NOT closed"* → *"(approved / settled)"*). The route leg's rewrite removes the only API coverage of `held_claims_not_closed` — add
  an `approved` variant that keeps it.
  ⚠ **Disclosed:** closing a voted X at the appeal (⛔ not at a commit) can leave the death paid by ⛔ no claim if S then fails a later check — the
  same trade FQ5 A already accepted for an unvoted claim (Trap 7's argument does ⛔ not apply: the closure here is FQ5's ruled outcome). Q1 B / Q1 C:
  unchanged (it serves FQ5, ⛔ not Q1); Q2: ⛔ not affected.
- **OP14 — THE APPROVER SEES THE OTHER CLAIMS (BigDev, 2026-10-10: *"Add OP14 now"*).** Staff-only; the other claim by its REFERENCE only —
  ⛔ no name, ⛔ no note (6.24a RF10's convention, `i18n-en.ts:676-716`); ⛔ never on a member surface; ⛔ never a decrypt.
  · **(a) The verifier console** — a new packet section `otherClaimsForDeath` beside `suspicionRefusal`
    (`packages/contracts/src/claims/verifier-console.ts:487`; filled beside `assembleSuspicionRefusal`,
    `claims.verifier-console.handlers.ts:341,368`; rendered in `SignalsPanel.tsx` beside `SuspicionRefusalNotice`, `:345-348`): every OTHER
    claim of the death (cap 20, then *"and N more"*), each with its reference, its stage in staff words (open / passed the final vote / paid /
    refused / under appeal / closed), when and through which channel it was filed (`claims.created_at`, `intake_channels`), and its date of
    death against THIS claim's — *"same date of death"* / *"a different date of death"* / *"date not yet accepted"* (⛔ no accepted review) /
    *"date not comparable"* (an accepted review with a NULL index — pre-6.26b) — by EQUALITY of the live accepted reviews'
    `claim_death_certificate_reviews.accepted_date_index` (keyed hash, `DEATH_DATE_INDEX_FIELD_CLASS`, `field-classes.ts:84-91`; the live
    review is selected as the `cur` CTE does, `approval-warnings.ts:441-496`; the comparison precedent `:206-222`) — the date itself is ⛔ never
    shown. A computed
    line: same date ⇒ *"Likely the same family filing twice"*; different ⇒ *"Two different dates of death are claimed for this death"* (red).
    Shape as RF10's section: `available: boolean` (`verifier-console.ts:445-447`) + the list — `false` renders "could not be checked just
    now", ⛔ never silence. ⚠ ONE new bounded read under `underSavepoint`, BEFORE the warnings (LAST): `VERIFIER_CONSOLE_MAX_READS`
    (`claims.verifier-console.handlers.ts:187`) gains its ledger line *"+ Story 6.28 (OP14): the other claims of this death +1 → 22"*, and the
    four `toBe(21)` pins are bumped with that reason — `suspicion-refusal-routes.spec.ts:477`,
    `verifier-console-ground-inspection.spec.ts:219,349`, `verifier-console.spec.ts:1129`.
  · **(b) A blocking banner on EVERY approval surface** while another claim of the death is FINALLY APPROVED (OP1): *"Another claim for this
    death (claim <reference>) has passed the final vote. This claim cannot be finally approved, and may be closed when that payment is
    made."*, and the FINAL approve action disabled — ONLY where it is final: the freeze approve vote (`cycle-freeze/PendingCaseCard.tsx`); the
    R9 panel's APPROVE vote choice, and its finalize only when the computed outcome is `approved` (a DENIED finalize is ⛔ never gated — F15)
    (`r9-voting/R9CasePanel.tsx`); the no-correction-needed approve (`useApproveNoCorrectionNeeded`, `PariwarClosureStrip.tsx:179` — ⛔ not its
    closure-request approvals); the escalation `'approve'` decision (`EscalationPanel.tsx:197,213`). The verifier console's decision strip is
    P1 — banner only, ⛔ never disabled; `ClosureColumn.tsx` makes ⛔ no decision — ⛔ not touched. ⭐ **Once the other claim is PAID** the banner
    reads *"Another claim for this death (claim <reference>) has been paid. This claim should be closed."* and carries a staff action
    **"Close this claim"** — one new endpoint `POST /api/v1/p/:pariwarId/admin/cycle-freeze/claims/:claimCaseId/close-for-paid-death` in
    `claims.cycle-freeze.routes.ts` (its path matches the adjudication gate's `cycle-freeze` substring, so the gate scans it —
    `scripts/claim-adjudication-human-actor-invariant/check.ts:86`; ⭐ its `expectedMethods` (`:88`) becomes `['get', 'post', 'post', 'post']`
    in the same commit, with a Story 6.28 comment — the gate compares the scanned methods as an EXACT multiset, `:379-389`); permission `cycle.freeze` at `dimension: 'pariwar'` via
    `requirePermissionHook` (ONE key — every final-approval actor holds it: `pariwar_admin`, `super_admin`, `roles.ts:386`; ⛔ never "the
    surface's own key" — a route's preHandler is static); ⛔ no step-up (the outcome is ⛔ not discretionary; the freeze vote and the 6.19c
    closure decision carry none either). The handler opens its OWN `openScopeTx` with `SET LOCAL lock_timeout` and reads ⛔ nothing of the
    claim in `request.scopeTx` (Fact 5), runs H(iv)'s shared helper with the HUMAN actor (`actor: 'trustee'` — the freeze vote's literal, `claimActorSchema`
    `events.ts:61`; `actorId` = `ctx.actorId`), and audits `admin_cycle_freeze.closed_for_paid_death` (added to `AuthAuditEventType`,
    `apps/api/src/audit/audit-sink.ts:15`, beside its `admin_cycle_freeze.*` siblings) with the closed count. Response
    `{ this_claim_closed: boolean, closed_count: number }` (⛔ never another claim's id — OP2's rule); `this_claim_closed: false`, ⛔ no change,
    when ⛔ no payment is committed or the claim is held by OP4 (b)–(d) — the button then shows *"Not closed — it waits on another claim's
    appeal or refusal."* (copy WITHOUT the glyph); a `lock_timeout` answers a retryable 503 with its own line (*"Busy — try again in a
    moment."*), ⛔ never the not-closed reason; an unknown or other-Pariwar `claimCaseId` answers 404. A new params schema (the file has only
    `PariwarParam`, `:41`).
    The paid banner and its action also show on `voted_pending_commit` freeze cards (R1 — `PendingCaseCard.tsx:7,102` offers Route only
    today). The District Admin's P1 console shows the banner WITHOUT the action. ⇒ R2's stranded claims (an uphold, the 90-day lapse, a missed
    H(i)) are closed by the first final approver who opens them — the approve button is ⛔ no longer the only trigger. Fed by ONE additive field on each
    surface's read row, `finally_approved_elsewhere: { claim_reference, stage } | null`, computed with OP1's `otherClaimInStatesSql` inside
    the existing reads (⛔ never a per-claim query — the bulk-read rule of OP5). ⚠ Disabling is decision support — OP2 is the control (a
    forced request still gets the 409).
  · **(c) The 409's words at every surface** — each surface's error mapper gains a `.death_already_finally_approved` arm beside
    `.suspicion_appeal_pending` (`CycleFreezePage.tsx:69-72`, `R9CasePanel.tsx:46-49`, the verifier strip, the correction-closure surfaces) —
    ⛔ never a raw code.
  · The District Admin (P1) is ⛔ not blocked (FQ5's "goes through every check") but sees (a) and the banner as information.
  · **(d) The ground inspector sees them too** (BigDev, 2026-10-10: *"yes, fold it"*). The inspection checks that a death is real and the
    certificate genuine — a duplicate is a real death with a real certificate, so it PASSES; the inspector's page is keyed by one claim and
    says ⛔ nothing of another. ⇒ the ground-inspection read (`GET …/admin/claims/:claimCaseId/ground-inspection`, `h.read`
    `claims.ground-inspection.handlers.ts:822`) gains `otherClaimsForDeath` (the read's camelCase wire): count + each by reference and stage
    (⛔ no name, ⛔ no note, ⛔ no date) — ⭐ ONLY when `inScope` is non-empty (the caller holds an in-scope assignment of THIS claim,
    `:841-853`); otherwise `null`, ⛔ never derived from the query locator alone (a `block_admin` can name any claim id — the
    "absence widens" shape `:806-815` forbids). `alreadyVisited`: another claim has a FULL visit — `status = 'completed'` ∧
    `inspection_stage <> 'certificate_check'` (6.26a VISITED's own-row arm; ⛔ not inheritance) — whose `death_date_index` equals THIS claim's
    live accepted review's `accepted_date_index` (one field class; NULL on either side ⇒ `false`); `visitedElsewhere: true` the same without
    the date clause (a visit scheduled before this claim's certificate is accepted still shows). The other claims' rows may lie outside the
    caller's scope — booleans and references only, accepted and recorded. `GroundInspectionPage.tsx` shows *"Other claims for this death: N"*,
    *"Another claim for this death has already had a visit."* when `visitedElsewhere`, and, when `alreadyVisited`, *"This family was already visited for
    another claim with the same date of death — check before sending a second visit."* Information only — ⛔ no gate, ⛔ no new inspection
    rule (6.26a's VISITED / ORIGINAL_SEEN stand). ⭐ Routed, ⛔ not built here: the inspector questionnaire (row
    `6-32-inspector-questionnaire-at-the-ground-inspection` — ⛔ no story file yet) asks the family *"Has the family filed any other claim for
    this death?"* — recorded on that row's comment (2026-10-10).
  · ⚠ Fixtures: a new packet / row field breaks `packages/contracts/tests/claims-verifier-console.test.ts` and the admin fixtures
    (`verifier-console*.test.tsx`, `cycle-freeze-page`, `pending-case-card-return`, `r9-case-panel`, `correction-closure`,
    `escalation-detail-claim-switch`, `later-approval-warnings`) — contracts tests are outside tsc ([[project_contracts_tests_outside_tsc]]).
  Q1 B: (a)–(d) unchanged + the close action of OP4 B on the same block; Q1 C: (a) only (⛔ no banner, ⛔ no close action, ⛔ no 409).

## Acceptance Criteria

### AC0 — Governance before code (Task 0) — ✅ DONE
The Panel's ruling on Q1–Q4 (A/A/A/A) was transcribed into the routing note's block and `.decision-log.md` as `2026-10-11-318`
(Trustee-ratified, committed alone); the author-commit answering OP1–OP14 for that ruling — naming `-279` A6 as discharged, recording that
the note widened `-294` §3's framing, and that OP9's DB backstop is ⛔ not built — was committed alone as `2026-10-11-319`; this second
governance commit updates this file's rulings table, Policy meaning and OPs (`✅ committed by -319`), and the `deferred-work.md` items of
Task 0.6 gain their pointers, each with its own status. Ruled **Q1 A** (⛔ not C) and **Q4 A** ⇒ every Task below is built — ⛔ none
left unchecked.

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
- **H(ii):** a plain filing for a paid death CONVERGES into the paid claim (OP11 — it is ⛔ not terminal; a leg pins it). With the paid claim
  overridden apart (the fixture for the rest of this leg), a new filing (member, helpline, override) is `closed` in the mint's transaction — ⛔ not when RF5's wait holds
  it (OP4 (d)) — and the response `state` is `closed`; the member app lands on the closed screen, and RE-ENTERING the claim tab afterwards
  mints ⛔ no claim (the entry gate routes to the closed screen); the helpline console shows `helpline.result.closed` and ⛔ no bank slot; an override that mints a closed claim shows the strip's new
  closed line; a two-connection leg — H(i) and a mint for the same death in flight together ⇒
  the mint ends `closed` (⛔ never left open beside the paid claim); ⛔ no hang on the helpline or override route (a leg with a timeout).
- **H(iii):** a `denied` claim of a paid death can still initiate an appeal; reversed, it ends `closed` in the reversal's transaction and
  the appeal response's `claim_state` is `closed`.
- **H(iv):** a final-writer attempt refused with the 409 on a still-open claim of a paid death closes it; a failure there leaves the 409
  intact and logs at error level.
- RF6's own behaviour and specs are unchanged except OP13's closable widening and its rewritten legs (AC9); R2's cases (an uphold, the 90-day lapse) reach H(iv) on a forced final request, or the approver's "Close this claim" (AC11).

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
F5 (>30 days — after OP11, a DOMAIN leg on a seeded legacy pair only; its API leg shows the later filing CONVERGING), F6 (override), F7 (after `denied` / `closed`), F8 (ordinary refusal reversed; `-239` revised off; 6.19c D17), `-294` §2
(a), (b), (c) — each: a DOMAIN leg blocked at the second final approval, and an API leg showing the closure at its site (⚠ (b) — like F5 — after
OP11 the later filing CONVERGES into the older reversed claim; its API leg shows that); path (a)'s legs
pin BOTH timings — revised before X's commit ⇒ the allowed appeal closes X (OP13) and S goes on; revised after X's commit ⇒ S ends `closed`
by H(iii) (Invariant 3's residual); the two-connection race of OP8.

### AC8 — The proof
Every load-bearing leg red-checked (Debug Log: plant, red, revert); live DB :5433; `pnpm ci:local` green
([[project_ci_local_concurrency_oversubscription]]).

### AC9 — The suspicion appeal closes a voted, unpaid claim (OP13)
X `state_trustee_approved`, S refused for another reason, revised ONTO `-239`, appealed and ALLOWED ⇒ X ends `closed`
(`suspicion_appeal_allowed`, `held_by_claim_case_id` = S), its routing / R9 session ends, the cycle commit ⛔ never commits it, and S can be
finally approved (OP2 passes); the same with X already `approved` ⇒ X reported `notClosed`, S closed by H(iii); a two-connection leg — the
allowed appeal and `commitCycleFreeze` on X in flight together ⇒ exactly one of {X `closed`, X `approved`}, ⛔ never both, ⛔ never neither
(waits on `pg_stat_activity`); the two flipped 6.24a legs pass in their new form.

### AC10 — The window is gone (OP11)
A claim 40 days old and open ⇒ a new same-channel filing returns it (⛔ no mint); a cross-channel filing becomes a `pending` attempt against it
and is listed on the strip; `confirmMerge` accepts it; a terminal / overridden-apart / suspicion-standing claim is still ⛔ never a candidate
at ANY age; `getConvergenceCandidate`, `getPendingIntakeAttempts` and `confirmMerge` agree on a SINGLE-candidate fixture (the "EXACTLY" mirror — ⚠ with
several open candidates the strip lists all while `confirmMerge` accepts only the newest, `LIMIT 1`: a merge into an older one is a 409 —
recorded, as today);
`git grep CONVERGENCE_WINDOW_DAYS` is empty; `icp.spec.ts:185`'s "WINDOW BOUNDARY" leg is rewritten to the new rule (its title says so) and
`ConvergenceDecisionStrip.test.tsx:75-76` pins the new note.

### AC11 — The approver sees the other claims (OP14)
The console section lists every other claim of the death with reference, stage, filed date / channel and the date-of-death comparison (same /
different / not accepted) — computed by index equality, ⛔ no decrypt (a test asserts the read touches ⛔ no ciphertext column); the red
line shows for different dates; `unavailable` renders on a failed read; ⛔ no name, ⛔ no note, ⛔ no date value on the wire. With another claim
finally approved, every listed surface shows the banner and disables final approve, and a forced request still gets the 409 in words; the
bulk reads stay one statement per slice; P1 is ⛔ not blocked. `POST …/cycle-freeze/claims/:claimCaseId/close-for-paid-death` with a death
paid on another claim closes this claim and every other closable open claim of the death (`trigger: 'death_already_finally_approved'`);
with the other claim only voted, or the claim held by OP4 (b)–(d), it answers 200 `{ this_claim_closed: false, closed_count: 0 }` and changes
nothing (⛔ no other claim's id in any body); a lock timeout answers 503; an unknown claim 404; a caller without `cycle.freeze` gets 403; the
adjudication gate scans the route with `expectedMethods` updated; the action shows on `voted_pending_commit` cards and ⛔ not on P1's console.
The console's read count is 22 (the ledger line present). The ground-inspection page shows the other claims (count, references, stages), the
visited-elsewhere line, and the already-visited line on a same-date FULL visit (⛔ not a `certificate_check`; ⛔ not with this claim's
certificate unaccepted) — ⛔ no name, ⛔ no date on the wire; a caller with ⛔ no in-scope assignment of the claim gets `otherClaimsForDeath:
null`; the admin client's schema carries the fields (a test against the REAL client parse, ⛔ never a mock alone).

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
  - [ ] 0.4 Re-write OP1–OP14 for the ruling (Q1 B ⇒ size the District Admin close action; Q1 A without the wait ⇒ OP5 (c) warning-only;
        Q4 B ⇒ OP13 ⛔ not built, Invariant 3's residual widens to path (a) before payment; Q2 B ⇒ a new row for the Panel's reopen
        (it must exempt a Panel-reopened claim from OP2, H(iv) and "Close this claim", or they block / re-close it) power; Q3 B ⇒ OP10's text + the counsel row; OP9 backstop yes / no); put them to BigDev as
        short option summaries with recommendations; quote each answer AS GIVEN in the Debug Log.
  - [ ] 0.5 Draft the author-commit (header shape of `-302` / `-312`: type, status, §0 gate, Occasion, FOUND, DECIDED, Cost,
        Consequences, References — naming `-279` A6 discharged, the §3 widening, `-292` RF4 SUPERSEDED in part (OP13), R1–R2 as residuals) in the scratchpad; one fresh-context
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
- [ ] **Task 4 — OP4 + OP13 (AC4, AC9).** OP13 FIRST: `CLAIM_NOT_CLOSABLE_STATES` + its comments, the two flipped 6.24a legs (with the
      author-commit cited), the closable-count pin, AC9's legs incl. the two-connection leg. Then extract RF6's core (three keys → row; RF6's
      specs green except OP13's flips); the payload enum;
      `closeClaimsOfPaidDeath`; H(i) in `postCommit` (fresh + replay); H(ii) inside `tryConverge` / `overrideIntakeAttempt` (self-mode) +
      the `closed` return; H(iii)'s `closed` return; the core's `<> 'closed'` prefilter + cap log; H(iii) inside the three reversal arms (self-mode); H(iv) — ONE shared helper in the four final-writer handlers
      (Trap 14); the two-connection mint leg; the no-hang legs.
- [ ] **Task 5 — OP5 (AC5).** The kind (+ contracts mirror — run its vitest, [[project_contracts_tests_outside_tsc]]), the embedded fragment in
      both readers + the single = bulk test, the `lateArm` fourth disjunct (+ the fault-path leg), the label, the pinned test bumped with a
      reason, the late-wait leg, the vanish / reappear legs.
- [ ] **Task 5b — OP11 (AC10).** Drop the window at the three mirrored sites + delete the constant; re-word the comments and the strip note;
      rewrite `icp.spec.ts:185` and the strip test; the AC10 legs (live DB, separate COMMITTED transactions for the aged claim).
- [ ] **Task 5c — OP14 (AC11).** The console section (contract + handler + `SignalsPanel`), the `finally_approved_elsewhere` field on the
      freeze / R9 / closure reads + banners + disabled final approve, the 409 arms; staff copy in `apps/admin` i18n; the no-ciphertext and
      one-statement legs; the read-ceiling bump (21 → 22, the ledger line, four pins). ⭐ The close action — contract (request / response),
      handler (its own `openScopeTx`, `SET LOCAL lock_timeout`, ⛔ no read of the claim in `request.scopeTx`), the route in
      `claims.cycle-freeze.routes.ts` + its params schema + `requirePermissionHook(cycle.freeze)`, the gate's `expectedMethods`
      (`check.ts:88`), audit `admin_cycle_freeze.closed_for_paid_death` in `AuthAuditEventType`, the 404 / 503 arms, the button + its result
      lines on the banner and the `voted_pending_commit` card. Rename the stale ceiling test titles (`verifier-console.spec.ts:1122`,
      `verifier-console-ground-inspection.spec.ts:348`). (d) the ground-inspection read's `otherClaimsForDeath` / `alreadyVisited` /
      `visitedElsewhere` (in-scope only) + the admin client schema + the page lines.
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
16. **OP13 widens ONE state, ⛔ never two.** `approved` and `settled` stay ⛔ not closable — closing a committed claim would strand a spawned
    pool. ⛔ Never edit the two 6.24a legs silently: each flip cites 6.28's author-commit ([[feedback_supersede_never_reinterpret]]).
17. **OP11's three sites move TOGETHER.** `getConvergenceCandidate`, `getPendingIntakeAttempts` and `confirmMerge` are an "EXACTLY" mirror
    (6.24a RF2's comment) — dropping the window at one leaves the strip listing what the candidate refuses (or the reverse). ⛔ Never touch
    the override or the RF2 suspicion conjunct.
18. **OP14 never decrypts and never names.** The date comparison is `accepted_date_index` equality under ONE field class (6.26a Trap 2 — a
    second class makes every pair "differs"); the wire carries the comparison word, ⛔ never the date; the other claim by reference only.

### The existing code each change touches (UPDATE files)
- `packages/domain/src/claim/state.ts` (`:338-343` the `claim.closed` reducer comment; `:352-363` `CLAIM_NOT_CLOSABLE_STATES` + doc) — OP13.
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
- OP11: `packages/domain/src/claim/icp.ts` (`:61-66`, `:98`, `:109-139`, `:167-200`, `:290`), `claim/index.ts:12`,
  `apps/api/src/modules/claims/claims.convergence.handlers.ts` (`:115-132`), `suspicion-refusal-persist.ts` (`:99-102`),
  `apps/admin/src/modules/helpline-claims/ConvergenceDecisionStrip.tsx` (`:226-231`); tests `packages/domain/tests/integration/claim/icp.spec.ts`
  (`:28`, `:35`, `:185-200`, `:298`), `apps/admin/tests/ConvergenceDecisionStrip.test.tsx` (`:75-76`); the 4-argument callers
  `nominee-refusal-inheritance.spec.ts:165`, `suspicion-refusal.spec.ts:174,234,240`; comments stating the 30-day look-back — `icp.ts:158`,
  `:163-166`, `:275`, `claims.convergence.handlers.ts:117-120`, `apps/mobile/app/(claim)/closed-helpline.tsx:6`,
  `apps/mobile/lib/claim-entry-gate.ts:35`, `packages/contracts/src/claims/death-certificate.ts:182` (grep `30-day\|30 days\|look-back`).
- OP14: `packages/contracts/src/claims/verifier-console.ts` (`:487`), `claims.verifier-console.handlers.ts` (`:341`, `:368`),
  `apps/admin/src/modules/claim-verification/SignalsPanel.tsx` (`:345-348`) + `i18n-en.ts`; the freeze / R9 / closure reads and
  `PendingCaseCard.tsx`, `CycleFreezePage.tsx` (`:69-72`), `R9CasePanel.tsx` (`:46-49`), `correction-closure/{ClosureColumn,EscalationPanel,
  PariwarClosureStrip}.tsx` + their contracts; the close action — `apps/api/src/modules/claims/claims.cycle-freeze.routes.ts` +
  `claims.cycle-freeze.handlers.ts` + its contract, `PendingCaseCard.tsx` (`:7`, `:102`); (d) `claims.ground-inspection.handlers.ts`
  (`:822`) + the admin client's `GroundInspectionReadResponse` (`apps/admin/src/api/client.ts:1232` — non-strict, it STRIPS an unlisted key; the
  GET route declares ⛔ no response schema, routes `:280`), `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` + `i18n-en.ts`,
  `apps/admin/tests/ground-inspection-page.test.tsx`; the gate `scripts/claim-adjudication-human-actor-invariant/check.ts` (`:88`);
  `apps/api/src/audit/audit-sink.ts` (`:15`).
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
- 2026-10-10 — v1.4: OP13 (BigDev: *"yes, do it"*) — an allowed suspicion appeal closes a voted, unpaid other claim; the corner narrowed to after payment (Q2). OP11 rewritten — the 30-day window REMOVED (BigDev: *"Remove it in 6.28"*); OP14 — the approver sees the other claims (BigDev: *"Add OP14 now"*).
- 2026-10-10 — v1.5: round 4 on v1.4's additions — 1 HIGH (OP14 disabled the only trigger R2 relied on ⇒ a paid-stage "Close this claim" action), 5 MEDIUM, ~10 LOW — all applied.
- 2026-10-10 — v1.6: round 5 — 1 HIGH (the close action reached ⛔ no AC / Task / UPDATE entry) + 4 MEDIUM + 6 LOW applied; OP14 (d) the ground inspector sees the other claims, the questionnaire question routed to 6.32 (BigDev: *"yes, fold it"*).
- 2026-10-11 — v1.7: round 6 — **0 BLOCKER / 0 HIGH**; 4 MEDIUM + 6 LOW applied.
- 2026-10-11 — v1.8: the routing note's pre-send fresh-context check (2 HIGH, 8 MEDIUM, 8 LOW — all applied to the note); OP13 now PUT TO THE PANEL for confirmation.
- 2026-10-11 — v1.9: the note's second check (1 HIGH, 5 MEDIUM, 8 LOW — applied): the confirmation becomes its own **Q4** with options and costs.
- 2026-10-11 — v1.10: the note's third check (1 HIGH, 7 MEDIUM, 6 LOW — applied).
- 2026-10-11 — v1.11: the note's fourth check (2 HIGH, 4 MEDIUM, 3 LOW — applied); under Q1 C, OP11 + OP14 (a) + OP13 (if Q4 A) are built.
- 2026-10-11 — v1.12: the note's fifth check (1 HIGH, 7 MEDIUM, 8 LOW — applied); OP10's staff label also built under Q1 C.
- 2026-10-11 — v1.13: the note's sixth check (1 HIGH, 4 MEDIUM, 6 LOW — applied): Q2 / Q3 cover a District Admin closure under Q1 B.
- 2026-10-11 — v1.14: the note's seventh check (1 HIGH, 2 MEDIUM, 3 LOW — applied): Q1 B's paid-by-no-claim cost disclosed.
- 2026-10-11 — v1.15: the note's eighth check (1 HIGH, 3 MEDIUM, 3 LOW — applied): v1.14's "only a Panel reopening can pay" corrected — the family may file again.
- 2026-10-11 — v1.16: the note's ninth check (1 HIGH — applied): v1.15's own "the family may file again" addition left the very next sentence ("its only remedy is whatever the Trust can recover from the person paid") attached to that case — but nobody is ever paid there, so there is no payment to recover from; the remedy sentence re-anchored to the families it actually describes (the false-date family, the appeal winners), and the District-Admin-closed case closed on its own terms (a fresh filing or Q2 B).
- 2026-10-11 — **GOVERNANCE DONE.** The Panel ruled Q1 A, Q2 A, Q3 A, Q4 A (`2026-10-11-318`, Trustee-ratified, Dhiraj Rahul + Kalpana
  Bharti, relayed by BigDev); the author-commit answering OP1–OP14 for that ruling is `2026-10-11-319` (BigDev's one open item, OP9's DB
  backstop: **not built** — OP2 + OP3 are the sole control). This file's rulings table, Policy meaning, OP5 (c), OP9, OP13 and AC0 updated
  to the ratified reading; `epics.md`'s Story 6.28 brief, 6.24a's Trap 9 note + P9 sentence (dated lines, their text kept), and four
  `deferred-work.md` items (plus R1/R2 added as new items) updated with pointers. ⛔ No code before this entry; Task 1 may now start.

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-10 | Created (`bmad-create-story 6.28`, pinned `34b9bab6`): three read-only research passes; F1–F14; OP1–OP12 PROPOSED for Q1 A / Q2 A / Q3 A with each alternative's delta; the Panel routing note `2026-10-10-6-28-one-payment-per-death` written (⛔ not sent). backlog → ready-for-dev (⛔ no code before Task 0). |
| 1.1 | 2026-10-10 | Validate (four fresh-context verifiers: cites, design + locks, governance + siblings, warning + member surfaces; findings re-checked by hand; BigDev: *"all"*). ⭐ OP4 closes at the CYCLE COMMIT, ⛔ not the final vote (F15 — R9 can still deny a voted claim); its four sites tabled (H(i) post-commit; H(ii) INSIDE the mint — the helpline / override request transaction would have hung a handler-side closure; H(iii) INSIDE the reversal; H(iv) after the refused tx) with self-mode keys and R1 / R2 residuals; F12's three-key order. OP1 a leaf with by-value lists (NW1) and SQL fragments; OP5 embedded in both readers (the one-statement pin), a fourth correction-queue `lateArm` disjunct (`-279` A4), the wait put to the Panel (`-279` A6), finally approved claims ⛔ not "open", ⛔ no key on an RF1 claim itself. Invariant 3: path (a) disclosed (FQ5 B's cost), ⛔ never "exact". OP10: the intake `claim_closed` flag + closed-screen routing, the neutral staff label, the five comments. OP7 two layers (domain 409 / API closure). Cites corrected (F9's `voteOnFrozenClaim` file, `commitCycleFreeze` to `:1430`, OP3 after `:1339`, `pool/` read models, the hook handlers incl. `correction-escalation`). Rulings `-279` A4/A6, `-291` Q1 A, `-293`; Niyamavali §5.3 / §6.4 engaged; OP11 ⛔ not "ratified"; Task 0.1 open-branch id grep (`-313`–`-316` taken); Task 0.6's four deferred-work items with their own statuses; 6.27b coordination. |
| 1.2 | 2026-10-10 | Re-validate of v1.1's own design (one fresh-context verifier): ⭐ the intake signal is `state === 'closed'` — ⛔ no new field on the two `.strict()` responses — and the member app sets the filed-claim pointer so re-entry ⛔ never mints another closed claim; the helpline wiring is `HelplineConsoleShell` + a staff line `helpline.result.closed`; H(iii)'s writers return `closed`; RF6-first in a paid death (a held third claim's `-291` text) recorded + pinned; the closure core skips `closed` before its cap; H(i) runs after the trigger block on every response with a `lock_timeout` and an actor; H(ii) ⛔ not when RF5 holds; OP5 (b)'s boolean sibling fragment; Trap 14 split by handler shape; comments found by grep; R1 gains the concurrent-commit legacy case; Task 0.6's backwards epics clause removed; seven cites corrected. |
| 1.3 | 2026-10-10 | Round 3 (one fresh-context verifier): **0 BLOCKER / 0 HIGH**. Applied 2 MEDIUM — AC2's "Y unchanged" scoped to the domain leg (through the API, H(iv) closes Y when X is paid); P4 and the note's Q1 A say the warning runs only UNTIL one claim passes the final vote (after it, the others are refused at the vote) — and 9 LOW: the filed-claim pointer ⛔ never overwrites a live / paid claim's; Trap 14's R9 cite; seven cites (`icp.ts:370`, `appeal-persist.ts:445,552`, `appeal-panel-persist.ts:678`, `:1266,1414`, F12 `:175-182`, H(i) after `:671`); the UPDATE list's comment grep; two glyphs; ids from `-318`; AC7 path (a)'s timing (closed by H(i) after X's commit); the convergence strip's NEW result line + its AC leg; H(iv)'s helper reads `deceased_member_id` itself; Niyamavali §2.4 engaged; an AC leg for H(i)'s lock timeout. |
| 1.4 | 2026-10-10 | OP13 (BigDev: *"yes, do it"*): `state_trustee_approved` becomes closable (supersedes `-292` RF4 in part) ⇒ an allowed suspicion appeal closes another claim that passed the final vote but is ⛔ not yet paid (RF7 already holds its commit) — FQ5 A as ruled; the corner narrows to a refusal changed to the suspicion reason only AFTER payment (Q2's case). Invariant 3, P5, the rulings table (`-292` RF4 row), OP1's pin, OP3's R1 (narrowed), OP4 / OP6 (two 6.24a legs flip by design), AC9 (incl. an appeal-vs-commit race), AC7 path (a)'s two timings, Task 4, Trap 16, `state.ts` in the UPDATE list. The routing note's corner text re-worded. OP11 REWRITTEN — the 30-day convergence window removed (its origin: an *"e.g., ±30 days"* in Story 6.4's planning AC; the key is exact) at three mirrored sites, F5 / `-294` §2 (b) closed at intake; OP14 NEW — the console's *other claims for this death* section (reference, stage, filed, same / different date of death by keyed-hash equality — ⛔ no decrypt), a blocking banner + disabled final approve on every approval surface, the 409's words at each; AC10, AC11; Tasks 5b, 5c; Traps 17, 18. |
| 1.5 | 2026-10-10 | Round 4 (one fresh-context verifier on OP11 / OP13 / OP14): 1 HIGH — OP14 disabled final approve at the PAID stage, removing H(iv)'s only trigger for R2's stranded claims ⇒ the paid banner carries a staff **"Close this claim"** (one endpoint, the surface's own final-approve key, ⛔ no step-up, H(iv)'s helper). 5 MEDIUM — OP13's test rewrites completed (`:772-812` rewritten, ⛔ not flipped; RF7's inspection arm loses its driver — recorded; `suspicion-refusal.test.ts:140`; the API route leg `suspicion-refusal-routes.spec.ts:394-429`); AC4 H(ii) vs OP11 (a plain filing for a paid death CONVERGES; H(ii) only once the paid claim is overridden apart); OP14's surface list made exact (P1 banner-only; `ClosureColumn` untouched; only the FINAL approve controls); the note's OP13 moved out of *"not asked"* into Q1 with its `-291` text; stale OP1–OP12 / R1–R4 / OP11-not-taken / RF6-unchanged / AC7 (b). ~10 LOW — OP11's missed comment + caller sites, OP13 comment sites, the mirror's multi-candidate difference, RF10's `available` shape, the `cur` CTE cite + *"date not comparable"*, "may be closed", OP13's disclosure, the note's same-channel join, the epics wording, OP14's fixtures. |
| 1.6 | 2026-10-10 | Round 5 (one fresh-context verifier): 1 HIGH — round 4's "Close this claim" lived only in OP14 (b) / R2 ⇒ now in AC11, Task 5c, the UPDATE list and AC4 (route `…/cycle-freeze/claims/:claimCaseId/close-for-paid-death` — the adjudication gate's `cycle-freeze` substring scans it; `cycle.freeze` at pariwar; own `openScopeTx` + `lock_timeout`; human actor; audit; `{ closed: [] }` no-op + its result line). 4 MEDIUM — one permission key (⛔ never "the surface's own"); the console read ceiling 21 → 22 with its four pins; the note's Q1 A and P4 say the approver is STOPPED (⛔ not "refused"); R1's voted card carries the banner + action. 6 LOW — OP13's further comment sites + an `approved` route-leg variant; `icp.ts:186`; H(iv)'s `lock_timeout`; the no-op result line; the Policy-meaning lead; P / OP ordering + epics. ⭐ Folded (BigDev: *"yes, fold it"*): OP14 (d) — the ground inspector sees the other claims of the death and an already-visited line (information only); the questionnaire question routed to row `6-32-…`. |
| 1.7 | 2026-10-11 | Round 6 (one fresh-context verifier): **0 BLOCKER / 0 HIGH**. 4 MEDIUM — the adjudication gate's `expectedMethods` grows with the new route (an EXACT multiset — else `ci:local` is red); OP14 (d)'s other-claims field only for a caller holding an in-scope assignment of THIS claim (a `block_admin` could name any claim id); `alreadyVisited` defined (a FULL visit's `death_date_index` vs this claim's `accepted_date_index`; NULL ⇒ false) + `visitedElsewhere`; the admin client's non-strict schema STRIPS unlisted keys — named, camelCase. 6 LOW — the close response carries ⛔ no other claim's id (`this_claim_closed`, `closed_count`); a lock timeout is a 503 with its own line; params schema / audit type / `'trustee'` actor / 404 named; stale ceiling test titles; Completion Notes order; the sprint row's stale comment; UI copy without the glyph. |
| 1.8 | 2026-10-11 | The routing note's pre-send check (one fresh-context reviewer as the Panel's advocate): 2 HIGH — OP13 extends FQ5 A to a claim that already passed the final vote ⇒ now an explicit proposal the Panel CONFIRMS (and C is ⛔ not "no change"); A's wait for the District Admin's reason has ⛔ no time limit — disclosed in A's cost and the reading. 8 MEDIUM + 8 LOW applied to the note (closure "automatically, or by Close this claim"; Q2 A's appeal stops paying once another claim passed the final vote; closed is ⛔ never appealable — in A's and B's costs; the helpline's words; a filing for a paid death joins it; Q3's fact marked as an unmeasured expectation and B's recipient named; "meant to pay"; jargon defined; Claims 1 / 2 named; `-291` quoted verbatim; separability lines; `assign.ts:137-187`). Story: OP13 and the rulings table say it is ⏳ for the Panel. |
| 1.9 | 2026-10-11 | The note's second fresh-context check: 1 HIGH — a confirm-by-silence bullet could be recorded from a ruling that never answered it ⇒ **Q4** (A: close the voted, unpaid claim — OP13; B: it is paid, the appellant's claim closed), with its own fact, costs, reading; Q1 A's cell cut to its rule + a *How A works* list ("final vote" defined as the LAST approval before payment, incl. the special panel and correction-case decisions); the wait's wording (a second claim that APPEARS — kept apart or reopened — ⛔ no time limit, lifts if it is refused / closed); Q2 A and Q1 A's appeal timing; Q2 B can ⛔ not reopen a joined filing; separability lines; E1/E2/E4 additions. Story: Q1–Q4 throughout, the rulings table's Q4 row, OP13 keyed on Q4. |
| 1.10 | 2026-10-11 | The note's third fresh-context check: 1 HIGH — Q1 A's cost said an appeal won after the other claim's final vote pays nothing, contradicting Q4 A for the suspicion appeal ⇒ "an ORDINARY refusal (⛔ not the suspicion one, which is Q4)". 7 MEDIUM — Q4 B under Q1 C; the Q1 → Q4 pointer narrowed to after the vote / before payment; §0 hands the closure's appeal and the helpline's words back to the Panel's questions; "final vote" no longer "the last approval" (R9 can still refuse it); Q2 B for a same-channel join; the plain-English Q1's ordinary-appeal cost; story header / AC0: under Q1 C, OP13 is still built on Q4 A. 6 LOW — the wait starts when a family APPEALS; Q4's hold covers the 90 days before an appeal; the plain-English Q4 and its cost; E4's `unique(` grep; Q1 A's five costs numbered. |
| 1.11 | 2026-10-11 | The note's fourth check (every Q1–Q4 combination walked): 2 HIGH — under Q1 C the note promised OP11 / OP14 while the story built only OP13 ⇒ the story now builds OP11 (BigDev's unconditional window removal), OP14 (a) and OP13 (if Q4 A) under C, and the note limits the warning / banner / close button to Q1 A or B; three "paid nothing" / "one corner" sentences were false under Q1 C or Q4 B ⇒ each qualified. 4 MEDIUM — the corner / Q4 line is the PAYMENT BEGINNING (⛔ not "paid"); Q2 A, plain English and E2 name Q4 B's case. 3 LOW — a settled paid claim (H(ii)); Q4 A's text goes to Claim 2's nominee; Q3 B's helpline words. Task 0.4 names Q4 B. |
| 1.12 | 2026-10-11 | The note's fifth check (all 24 ruling combinations tabled): 1 HIGH — §0's "a filing for a paid death joins it / is closed at once" was false under Q1 C (OP4 / OP2 unbuilt ⇒ a settled death's new filing, or one kept apart, may be paid) ⇒ qualified for A / B and C stated; "settled" replaced by "payment complete". 7 MEDIUM — the helpline label built under Q1 C too (story); cost (4)'s trigger is the payment BEGINNING; How A works' Q4 exception only under Q4 B; the Q1 reading's "never leaves a death unpaid" scoped (Q4 A's own cost); "paid once" and the plain-English ordinary-appeal line hedged for Q2 B; Q2 B is a later piece of work. 8 LOW — capitalisation; "may be paid twice"; "goes live as it is today (C, and the 30-day limit stays)"; Q1 B's release by refusal; "closed this way"; Q2 / Q3 "payment has begun"; "before its payment began"; the How-much-to-trust sentence split. |
| 1.13 | 2026-10-11 | The note's sixth check: 1 HIGH — under Q1 B the District Admin's closure fell outside Q2 (reopen) and Q3 (text) ⇒ both now cover it (OP4 B, OP10's Q3 B selector). 4 MEDIUM — Q1 B "whichever of two open claims"; Q1 B's re-hold while a refused family appeals; plain-English Q4 "and its appeal is then allowed"; plain-English Q1 names the special panel. 6 LOW — an overridden-apart claim is ⛔ never joined; Q3's helpline wording matches §0; "may be paid too"; How-much-to-trust's Q2 pointer; Q1 C's "beyond the late-filing change"; §0's stop "under A or B in Q1". |
| 1.14 | 2026-10-11 | The note's seventh check (every closure kind traced: RF6, OP13, H(i)–(iv), Close this claim, the District Admin's close): 1 HIGH — under Q1 B a District Admin closure followed by the kept claim's refusal leaves the death paid by ⛔ no claim, unappealable ⇒ disclosed in Q1 B's cost, Q2 A / B worded for it, OP4 B records it. 2 MEDIUM — Q1 B's appeal re-hold only before the other's final vote; OP4 B's close action ⛔ never on a denied / under-appeal / RF1 / RF5 claim. 3 LOW — §0's kept-apart filing closed at once; Q2 A "⛔ never pay twice"; Task 0.4's Q2 B row exempts a reopened claim from OP2 / H(iv) / Close. |
| 1.15 | 2026-10-11 | The note's eighth check (outcomes enumerated per combination): 1 HIGH — v1.14 said under Q1 B only a Panel reopening could pay a District-Admin-closed family once the kept claim is refused; false — both claims are terminal, a `claim.closed` closure trips ⛔ no refile guard (F7) and nothing is paid, so the death may be filed again ⇒ Q1 B / Q2 A / Q2 B corrected, OP4 B too. 3 MEDIUM — the staff label goes stale when the holding claim is later refused ⇒ OP10 label keyed on the holding claim's state (a build item) and Q3 A's helpline words; Q4 A's closure ⛔ not appealable; Q2's question covers a pre-payment District Admin closure. 3 LOW — "unless it is filed again" (Q4 A, plain English); "being, or about to be, paid" (Q3); Q1 B's re-hold ends on a refused appeal or a District Admin close. |
| 1.16 | 2026-10-11 | The note's ninth check: 1 HIGH — v1.15's own fix left Q2 A's cost cell self-contradicting: "...even if the kept claim is then refused (the family may file again). Its only remedy is whatever the Trust can recover from the person paid." — but the District-Admin-closed-then-refused case pays ⛔ no one, so ⛔ nothing exists to recover ⇒ the "recover from the person paid" remedy re-anchored to the cases it actually fits (the false-date family, the appeal winners who lost to another claim that WAS paid), and the District-Admin case given its own distinct close ("a fresh filing or a Panel reopening (Q2 B)"). |
| 1.17 | 2026-10-11 | **Governance done.** The Panel ruled Q1 A, Q2 A, Q3 A, Q4 A (`2026-10-11-318`); the author-commit for OP1–OP14 is `2026-10-11-319` (OP9's DB backstop decided: ⛔ not built). Rulings table, Policy meaning, OP5 (c), OP9, OP13 and AC0 updated from "awaiting"/contingent language to the ratified reading; `epics.md`, 6.24a's Trap 9 + P9, and four `deferred-work.md` items (+ R1/R2 added) cross-referenced. Status stays `ready-for-dev`; Task 1 may now start. |
