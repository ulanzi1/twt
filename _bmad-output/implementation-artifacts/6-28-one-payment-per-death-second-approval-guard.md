---
baseline_commit: 34b9bab6
---

<!--
⭐⭐ MERGED 2026-10-12 as PR #272 (REBASE-merge, branch `story/6-28-one-payment-per-death-second-approval-guard` → `main` at `a6b03d78`) —
THE SHA MAP for every commit of Story 6.28. The 33 branch commits (from `34b9bab6`) were rewritten TWICE: first by the rebase onto `main`
`a494e311` (after 6.30), force-pushed as PR #272's head `3cf1cb05`; then by GitHub's rebase-merge. The citations are in THIS file only —
`b724aa12`, `31895b10`, `a429e122`, `ebe52190` (grepped 2026-10-12: `.decision-log.md`, `sprint-status.yaml`, `deferred-work.md`,
`friction-budget.md` and the 2026-10-10 routing note cite ⛔ none of the 33) — each cites the ORIGINAL branch SHA and is kept AS WRITTEN (the
record); this maps every commit to its `main` twin, PROVED ⛔ never assumed:
  · every pair has an identical subject;
  · 27 of 33 have an IDENTICAL `git patch-id --stable` (original ↔ main), and all 33 have an identical patch-id PR head ↔ main;
  · ² the 6 the rebase stopped on (ledger conflicts in `sprint-status.yaml`, `.decision-log.md`, `friction-budget.md`,
    `deferred-work.md` — pure insertions, both sides kept) have a DIFFERENT whole-commit patch-id ⇒ proved instead by: an identical
    patch-id with the four ledgers EXCLUDED, AND an identical sorted set of added/removed ledger lines (only the diff CONTEXT moved);
  · the merged tree is byte-identical to PR #272's head (`3cf1cb05`) — tree `3d68a92b` both — which passed `ci:local` 35/35 and CI 35/35.
Negative controls: a WRONG pair (the 1st original commit vs the 2nd main commit) DIFFERS on the whole-commit patch-id AND on the
ledger-line set.
  · `176be89b` → `986f33e0` ²  (PR head `ff5d1e5c`)  story(6.28): created for dev — one payment per death; the Pane
  · `82b943b7` → `6aa0de21` ²  (PR head `69493579`)  story(6.28 v1.3): validate — three fresh-context rounds, 0 BLO
  · `38875315` → `04b44db2`  (PR head `6454f483`)  story(6.28 v1.7): OP13 closes the suspicion corner before paym
  · `9c51de0b` → `198861f1`  (PR head `d8fe2f8d`)  story(6.28 v1.9): the Panel note's pre-send checks — OP13 beco
  · `8437af20` → `d8787c7a`  (PR head `a0abfd62`)  story(6.28 v1.10): the note's third pre-send check — Q1 A's ap
  · `fd39ef6a` → `e5bb1145`  (PR head `c10ae46f`)  story(6.28 v1.11): the note's fourth pre-send check — every Q1
  · `3fb84213` → `0ada33f8`  (PR head `f253693c`)  story(6.28 v1.12): the note's fifth pre-send check — all 24 ru
  · `bf179e11` → `300da474`  (PR head `5abc7b62`)  story(6.28 v1.13): the note's sixth pre-send check — Q2 and Q3
  · `3fc054be` → `50c837d4`  (PR head `e918b9b5`)  story(6.28 v1.14): the note's seventh pre-send check — every c
  · `861d1ba2` → `2ea4a834`  (PR head `2deecdb7`)  story(6.28 v1.15): the note's eighth pre-send check — a Distri
  · `149971ac` → `ba674a1a`  (PR head `5a1f85df`)  story(6.28 v1.16): the note's ninth pre-send check — v1.15's o
  · `96f5bbdc` → `087ea08f` ²  (PR head `c7b80eeb`)  governance(6.28): 2026-10-11-318 — Trustee-ratified — Q1 A, Q2
  · `be5ea1bf` → `ac6b5717`  (PR head `7bd689ca`)  governance(6.28): 2026-10-11-319 — author-commit — OP1-OP14 as
  · `509926b8` → `9699f505`  (PR head `b76d86cf`)  story(6.28): Task 0.6 — second governance commit — rulings tab
  · `1e8db74b` → `01bc04c2`  (PR head `32fabf93`)  story(6.28): Task 1 — OP1 the one-definition leaf (state lists
  · `148ed18c` → `d3c32eda`  (PR head `cee9799c`)  story(6.28): Task 2 — OP2 the guard: one final-only conjunct a
  · `18e9f811` → `304cc908`  (PR head `5d79a340`)  story(6.28): Task 3 — OP3 the cycle commit skips-and-keeps a c
  · `037ddabf` → `cab16c2e`  (PR head `3e22d980`)  story(6.28): Task 4 — OP13 (state_trustee_approved closable; t
  · `e53134bd` → `7c6986e5`  (PR head `8572f2f9`)  story(6.28): Task 5 — OP5 the other_claim_for_death warning: e
  · `e5593fc3` → `9d70d04f`  (PR head `b2dc1528`)  story(6.28): Task 5b — OP11 the 30-day convergence window remo
  · `e2d701b0` → `105ccd2d`  (PR head `bdc022ed`)  story(6.28): Task 5c (a) — OP14 the verifier console's other-c
  · `691eb8bf` → `30f87eac`  (PR head `4ae1075b`)  story(6.28): Task 5c (b) — OP14 finally_approved_elsewhere on 
  · `06bb4a45` → `f38d9ae2`  (PR head `77cf5086`)  story(6.28): Task 5c (d) — OP14 the ground inspector sees the 
  · `7a03f8ee` → `008eaa30`  (PR head `17a2c939`)  story(6.28): Task 6 (part) — OP10 staff surfaces (neutral clos
  · `b724aa12` → `f7e82500` ²  (PR head `41a03374`)  story(6.28): Task 6 — friction-budget declaration (the 6.24a c
  · `31895b10` → `69335a19` ²  (PR head `b1f802a0`)  story(6.28): → review — all tasks done; ci:local PASSED (34 jo
  · `a429e122` → `5e8276a1` ²  (PR head `5e622abd`)  story(6.28): bmad-code-review chunks 1-4/4 — all patches appli
  · `ebe52190` → `f3c53363`  (PR head `ae9778ca`)  story(6.28): round 2 — adversarial review of the code-review's
  · `2214dafe` → `1c06eb92`  (PR head `1be1eb92`)  governance(6.28): 2026-10-12-320 — author-commit — OP10's "may
  · `00d38f8c` → `b5285004`  (PR head `7cf356ed`)  story(6.28): code review round 3 — whole-story pass; D1/D2 per
  · `72a62efd` → `7286cb82`  (PR head `98170195`)  story(6.28): the Panel note for -320's open follow-up — when s
  · `be58ce0a` → `19f5d8fd`  (PR head `9edd909d`)  governance(6.28): 2026-10-12-321 — Trustee-ratified (DR + KB) 
  · `00214c1c` → `a6b03d78`  (PR head `3cf1cb05`)  story(6.28): -321 recorded — the may-file-again note RULED (op
Re-verify (bash): `diff <(git show <orig> | git patch-id --stable | cut -d' ' -f1) <(git show <main> | git patch-id --stable | cut -d' ' -f1)`;
for a ² pair, compare `git show <sha> -- . ':(exclude).decision-log.md' ':(exclude)friction-budget.md'
':(exclude)_bmad-output/implementation-artifacts/sprint-status.yaml' ':(exclude)_bmad-output/implementation-artifacts/deferred-work.md' | git patch-id --stable`
on both, and the sorted `^[+-]` lines of `git show --format= <sha> -- <the four ledgers>` on both.
⚠ The ORIGINAL SHAs survive only while `origin/backup/6-28-pre-rebase` does (pushed 2026-10-12, head `00214c1c`); the PR-head SHAs only
while `origin/story/6-28-one-payment-per-death-second-approval-guard` does.
-->

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

Status: done

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
  refused, not appealable; the family sees 'This claim has been closed. Please call the helpline.'"* ⚠ Code review round 3 (family 11
  precision): *"— except a claim that was refused (it keeps its appeal, P3) or one held while a suspicion refusal of the death is decided;
  those stay open until that is settled."*
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
    the note's Q3 A promises it). ⚠ NARROWED by code review round 3 (`2026-10-12-320` D1 A): the variant shows only while ⛔ no OTHER claim
    of the death is live (every other claim `denied` / `closed`) — a holder closed because the death is PAID, or because a third claim went
    ahead, leaves a claim that goes ahead, and "may file again" would be false. Console: OP2's 409 copy *"Another claim for this death has already passed the final vote. This claim cannot be
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
    appeal or refusal."* (copy WITHOUT the glyph) ⚠ AMENDED by code review round 3 (`2026-10-12-320` D2 A — see AC11); a `lock_timeout` answers a retryable 503 with its own line (*"Busy — try again in a
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
nothing (⛔ no other claim's id in any body) ⚠ AMENDED by code review round 3 (`2026-10-12-320` D2 A): a HELD claim's press still closes the
death's OTHER closable claims, counted in `closed_count`, and the result line says how many (*"N other claim(s) for this death were closed."*);
the not-closed line reads *"Not closed — it waits on an appeal or a refusal."*; a lock timeout answers 503; an unknown claim 404; a caller without `cycle.freeze` gets 403; the
adjudication gate scans the route with `expectedMethods` updated; the action shows on `voted_pending_commit` cards and ⛔ not on P1's console.
The console's read count is 22 (the ledger line present). The ground-inspection page shows the other claims (count, references, stages), the
visited-elsewhere line, and the already-visited line on a same-date FULL visit (⛔ not a `certificate_check`; ⛔ not with this claim's
certificate unaccepted) — ⛔ no name, ⛔ no date on the wire; a caller with ⛔ no in-scope assignment of the claim gets `otherClaimsForDeath:
null`; the admin client's schema carries the fields (a test against the REAL client parse, ⛔ never a mock alone).

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0).** ⛔ No code until 0.5 is committed.
  - [x] 0.1 `git fetch origin`; confirm `main` = `34b9bab6` (or re-pin and re-read every cited file that moved); grep `.decision-log.md`
        on `main` AND on every open story branch (`for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do git show
        $b:.decision-log.md | grep -oE '^### Decision [0-9-]+'; done | sort -u`) — ⚠ at 2026-10-10, `-313` / `-314` (`story/6-34-…`) and
        `-315` / `-316` (`story/6-30-…`) are TAKEN ⇒ this story's ids start at `-318` or later (`-317` is now also taken on `story/6-30-…`); when the branches merge, the log top conflicts —
        keep every entry, newest-first by id. Read any entry touching `-294`, RF5, RF6 or `-262` FQ5.
  - [x] 0.2 BigDev reviews the routing note `trustee-panel-routing-note-2026-10-10-6-28-one-payment-per-death.md` (one fresh-context
        check of it until ⛔ no BLOCKER / HIGH, the 6.24 / 6.27 precedent), then SENDS it. ⛔ Never record it as shown or sent before it went out
        ([[feedback_shown_to_panel_means_sent]]).
  - [x] 0.3 When the Panel rules: transcribe verbatim into the note's ⏳ block (body ⛔ not edited) and a new Trustee-ratified decision
        (what it does ⛔ not cover listed); commit ALONE: `governance(6.28): <date>-NNN — Trustee-ratified …`.
  - [x] 0.4 Re-write OP1–OP14 for the ruling (Q1 B ⇒ size the District Admin close action; Q1 A without the wait ⇒ OP5 (c) warning-only;
        Q4 B ⇒ OP13 ⛔ not built, Invariant 3's residual widens to path (a) before payment; Q2 B ⇒ a new row for the Panel's reopen
        (it must exempt a Panel-reopened claim from OP2, H(iv) and "Close this claim", or they block / re-close it) power; Q3 B ⇒ OP10's text + the counsel row; OP9 backstop yes / no); put them to BigDev as
        short option summaries with recommendations; quote each answer AS GIVEN in the Debug Log.
  - [x] 0.5 Draft the author-commit (header shape of `-302` / `-312`: type, status, §0 gate, Occasion, FOUND, DECIDED, Cost,
        Consequences, References — naming `-279` A6 discharged, the §3 widening, `-292` RF4 SUPERSEDED in part (OP13), R1–R2 as residuals) in the scratchpad; one fresh-context
        check; insert above the newest `### Decision` (if refused, ask once — [[project_decision_log_writes_user_inserted]]); commit ALONE.
  - [x] 0.6 Second governance commit: this file (rulings table, Policy meaning re-checked, OPs `✅ committed by -NNN`); `epics.md`'s
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
- [x] **Task 1 — OP1 (AC1).** The leaf module, the three by-value lists + their pin, the fragments, the thin reads, NW1's entry list; unit +
      live-DB legs.
- [x] **Task 2 — OP2 (AC2, AC7 race).** The conjunct after RF5's, the typed error, the four translators (incl. the defensive verifier-decision
      one), the console copy; the gate-order spec gains the new position; the R9-deny leg; the OP8 two-connection race, red-checked.
- [x] **Task 3 — OP3 (AC3).** The commit re-check after `:1339`; legs incl. the legacy two-`state_trustee_approved` seed and an earlier
      cycle's `approved` claim.
- [x] **Task 4 — OP4 + OP13 (AC4, AC9).** OP13 FIRST: `CLAIM_NOT_CLOSABLE_STATES` + its comments, the two flipped 6.24a legs (with the
      author-commit cited), the closable-count pin, AC9's legs incl. the two-connection leg. Then extract RF6's core (three keys → row; RF6's
      specs green except OP13's flips); the payload enum;
      `closeClaimsOfPaidDeath`; H(i) in `postCommit` (fresh + replay); H(ii) inside `tryConverge` / `overrideIntakeAttempt` (self-mode) +
      the `closed` return; H(iii)'s `closed` return; the core's `<> 'closed'` prefilter + cap log; H(iii) inside the three reversal arms (self-mode); H(iv) — ONE shared helper in the four final-writer handlers
      (Trap 14); the two-connection mint leg; the no-hang legs.
- [x] **Task 5 — OP5 (AC5).** The kind (+ contracts mirror — run its vitest, [[project_contracts_tests_outside_tsc]]), the embedded fragment in
      both readers + the single = bulk test, the `lateArm` fourth disjunct (+ the fault-path leg), the label, the pinned test bumped with a
      reason, the late-wait leg, the vanish / reappear legs.
- [x] **Task 5b — OP11 (AC10).** Drop the window at the three mirrored sites + delete the constant; re-word the comments and the strip note;
      rewrite `icp.spec.ts:185` and the strip test; the AC10 legs (live DB, separate COMMITTED transactions for the aged claim).
- [x] **Task 5c — OP14 (AC11).** The console section (contract + handler + `SignalsPanel`), the `finally_approved_elsewhere` field on the
      freeze / R9 / closure reads + banners + disabled final approve, the 409 arms; staff copy in `apps/admin` i18n; the no-ciphertext and
      one-statement legs; the read-ceiling bump (21 → 22, the ledger line, four pins). ⭐ The close action — contract (request / response),
      handler (its own `openScopeTx`, `SET LOCAL lock_timeout`, ⛔ no read of the claim in `request.scopeTx`), the route in
      `claims.cycle-freeze.routes.ts` + its params schema + `requirePermissionHook(cycle.freeze)`, the gate's `expectedMethods`
      (`check.ts:88`), audit `admin_cycle_freeze.closed_for_paid_death` in `AuthAuditEventType`, the 404 / 503 arms, the button + its result
      lines on the banner and the `voted_pending_commit` card. Rename the stale ceiling test titles (`verifier-console.spec.ts:1122`,
      `verifier-console-ground-inspection.spec.ts:348`). (d) the ground-inspection read's `otherClaimsForDeath` / `alreadyVisited` /
      `visitedElsewhere` (in-scope only) + the admin client schema + the page lines.
- [x] **Task 6 — OP10 + paths + proof (AC6–AC8).** The `state === 'closed'` routing (`relationship.tsx` + the filed-claim pointer;
      `HelplineConsoleShell.tsx` + the convergence strip — ⛔ no contract change); the staff label + `helpline.result.closed`;
      `$comment.closed` (en) + every comment the grep finds; OP7's two-layer specs; the FQ5 regression
      legs; the 0151 negative leg; red-checks logged; `pnpm ci:local` green; story records; `sprint-status.yaml` row → `review` with ONE
      ledger entry.

### Review Findings

> Scope: `bmad-code-review` chunk 1/4 (domain core — `packages/domain/src/claim/*` + its tests; branch vs `main` @ `34b9bab6`).
> Three layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor) ran in parallel; findings below are deduplicated and
> verified against the live code. Remaining chunks (API layer, Admin UI, Mobile+contracts+i18n) are queued for follow-up runs
> — this story's status is left at `review`, not advanced, until those run.

- [x] [Review][Patch] Stale `eventVersion` returned alongside a changed `claimState` when `closedByPaidDeath` is true — `appeal-panel-persist.ts:692`, `appeal-persist.ts:459,578`. **Fixed:** `closeClaimIfDeathPaid` now returns `{closed: true, eventVersion}` carrying the `claim.closed` event's OWN version (via `closeLockedClaim` returning `ProjectClaimStateResult`); all 5 call sites (3 appeal functions + 2 `icp.ts` mint sites) updated.
- [x] [Review][Patch] Candidate-cap check in the per-death closure walk is off-by-one and silently truncates — `suspicion-refusal-persist.ts:227-231`. **Fixed:** fetches `CAP+1` and slices to `CAP`; the overflow log now fires only on a true overflow.
- [x] [Review][Patch] `otherClaimStageOf` has no branch for the `reversed` state and the untested path behind it. **Fixed:** added an explicit `reversed → under_appeal` branch with rationale comment; `KEEPS_ITS_APPEAL_STATES` gained a comment explaining the deliberate omission; `_one-payment-fixtures.ts` gained a `'reversed'` fixture state (mirroring `emitReversedHook`'s own event shape); one new test added (`one-payment-per-death-closure.spec.ts`'s closure behavior) + one EXISTING parametrized stage-table test extended with a new row (`one-payment-per-death.spec.ts`, `['reversed', 'under_appeal']`, `out.total` 6 → 7) — corrected from an earlier "two new tests" overclaim (round 2, Acceptance Auditor). ⚠ SUPERSEDED below — round 2 gave `reversed` its OWN stage value instead of `under_appeal`.
- [x] [Review][Patch] Undocumented third reader built on a hardcoded nil-UUID sentinel — `readPaymentCommittedClaimOfDeath`. **Fixed:** doc comment added at the `NO_SELF` definition explaining the exclusion mechanism, the v4-UUID safety assumption, and that it's a third reader beyond OP1's two named ones.
- [x] [Review][Patch] Unbounded `json_agg` in `otherOpenClaimsForDeathSql`. **Fixed:** added an inner `LIMIT` (new `OTHER_OPEN_CLAIMS_FOR_DEATH_JSON_CAP = 50`, matching the file's other ceilings) via a capped derived table.
- [x] [Review][Patch] (minor) `mayCloseForPaidDeath`'s redundant per-row `isSuspicionRefusalStanding` query. **Fixed:** now derives RF1-standing from the already-fetched `standing` list (a `Set` lookup — also sidesteps the NW1 no-comparison fence's `toLowerCase() ===` pattern, since the fence's regex is syntactic and fenced this exact file); the function is now synchronous and its two call sites updated; the now-unused import removed.
- [x] [Review][Patch] (minor, style only) `otherOpenClaimPredicateSql`'s unvalidated `oc` splice. **Fixed:** now routes through `aliasOf` like its sibling fragments.
- [x] [Review][Patch] (minor) Duplicated "live accepted death-certificate review" SQL in `readOtherClaimsForDeath` and `readOtherClaimVisits`. **Fixed:** factored into one shared `liveAcceptedDeathCertificateReviewLateralSql(outerAlias)` fragment, used by both (the scalar-subquery call site rewritten as the same LATERAL-join idiom).
- [x] [Review][Patch] (minor) `closeClaimsOfPaidDeath` takes the lock before checking whether anything is paid. **No change** — confirmed deliberate: checking before the lock would be a TOCTOU gap (a concurrent mint/commit could land between an unlocked check and the lock), and the only realistically-speculative caller is the low-volume manual "Close this claim" admin action.
- [x] [Review][Patch] (minor, low confidence) `clampLimit` wrapping a hardcoded constant looked ceremonial. **No change** — verified against `scripts/domain-accessor-invariants/lib.ts`: the gate's AST scan only exempts a bare integer-literal argument (`ts.isNumericLiteral`), not an identifier referencing a `const`; `.limit(HELD_CLAIMS_CAP)` alone would fail the gate, so the `clampLimit(...)` wrapping is load-bearing, not ceremonial. `ELSEWHERE_SLICE`/`HOLDER_REFUSED_SLICE` feed JS-side `.slice()` chunking, not SQL `.limit()`, so they're a different mechanism, not an inconsistency.
- [x] [Review][Patch] (minor) `readOtherClaimsForDeath`'s per-row-recomputed `total` scalar subquery. **Fixed:** moved into its own `op_total` CTE, computed once, `CROSS JOIN`ed onto the capped result set.
- [x] [Review][Patch] (minor) Array/JSON handling "inconsistency" between `json_agg` and `intake_channels`. **No change** — verified as a non-issue: `CLAIM_INTAKE_CHANNELS` (`schema/claims.ts:107`) is a closed 3-value enum (`member_app`/`helpline`/`trustee_initiated`), none containing a comma or backslash, so `channelsOf`'s parser's stated limitation is unreachable; the json-vs-text[] handling difference reflects a real `pg` driver distinction (native `json` auto-parses; `text[]` casts don't reliably), not an inconsistency.
- [x] [Review][Patch] (minor, test-only) Duplicated `afterAll` cleanup + per-file actor UUID constants across the new spec files. **No change** — verified both are pre-existing, repo-wide conventions, not something 6.28 introduced: the identical dynamic-cleanup `afterAll` shape already exists in 4 OTHER pre-6.28 spec files (`correction-queue-late-inspection`, `suspicion-refusal-concurrency`, `suspicion-notice-concurrency`, `suspicion-staff-email-concurrency`); a proper fix is a separate, repo-wide test-infra refactor, not a 2-file patch. The per-file UUID constants are DELIBERATE namespacing (each spec file's actors use a distinct hex prefix, e.g. `a6a6a6a6` vs `a9a9a9a9`) so concurrently-run spec files sharing the live :5433 DB can never collide — centralizing them would remove that isolation, not improve it.
- [x] [Review][Patch] (minor) NW1's leaf-fence scanner stripped comments repo-wide to work around one false positive. **Fixed at the root instead of narrowing the workaround:** the one offending comment (`rbac/index.ts`'s header, quoting `export * as rbac from './rbac/index.js'`) reworded so it no longer textually matches an import statement; the scanner's comment-stripping removed entirely, restoring its original full precision. Verified: `approval-warnings.test.ts`'s NW1 suite (37 tests) passes clean. Story's Completion Notes deviation #3 updated to record the supersession.
- [x] [Review][Defer] Commit-run skip-and-keep never re-triggers closure for a death paid in an EARLIER run [`state-trustee-decision-persist.ts:1341-1349`] — deferred, pre-existing. This is the story's own recorded residual R1 ("a candidate of a death paid in an EARLIER run stays `state_trustee_approved`, re-selected each run — is recorded, ⛔ not addressed"); Edge Case Hunter independently rediscovered it blind, confirming the layer works, but it is not a new gap — the author already scoped it out explicitly rather than silently.

**Dismissed as noise/false positive (4):** a claimed "per-candidate query contradicts the bulk-read rule" in `commitCycleFreeze` (the bulk-read rule is scoped to OP5's warning-reader column embeddings, not this pre-existing per-candidate batch loop); a claimed race on the standing-refusal snapshot (not exploitable — the walk's caller holds the death's exclusive intake lock for the whole walk); a claimed leak path for `DeathAlreadyFinallyApprovedError.approvedClaimCaseId` (verified against the actual Fastify error-mapping handler end-to-end — no generic error-dumping path exists; all four throw-sites already map to a safe `details: {}` 409); and a claimed not-found/no-claims ambiguity in `readOtherClaimsForDeath` (both call sites already operate on a claim id resolved earlier in the same request, verified via `claims.verifier-console.handlers.ts:901` and `claims.ground-inspection.handlers.ts:933`).

> Scope: `bmad-code-review` chunk 2/4 (API layer — `apps/api/src/modules/claims/*` handlers/routes, `audit-sink.ts`, and
> `apps/api/tests/integration/claims/*`; branch vs `main` @ `34b9bab6`, re-fetched clean). Three layers ran in parallel again.

- [x] [Review][Patch] `postCloseForPaidDeath`'s `'failed'` outcome threw a bare `Error`, breaking the `{code,message,details}` contract its sibling branches (`not_found`→`NotFoundError`, `lock_timeout`→`ServiceUnavailableError`) use — `claims.cycle-freeze.handlers.ts:617` (pre-fix). **Fixed:** now `throw new ApiError(500, 'cycle_freeze.close_for_paid_death_failed', ...)`. Also realigned the `lock_timeout` 503's message with the codebase's established formal tone (verified against `reconciliation.append_contention` / `member_data_rights.enqueue_failed` precedent — the original "Busy — try again in a moment." was an outlier); the test asserting the old string updated.
- [x] [Review][Patch] `let result!: T` (definite-assignment assertion) in `claims.cycle-freeze.handlers.ts:448` and `claims.r9-voting.handlers.ts:518` removed a real compiler guarantee on the ₹50L-stakes R9/cycle-freeze final-decision path — a future reordering could use `result` before assignment with no compile-time warning. **Fixed:** both changed to `T | undefined` with an explicit `if (result === undefined) throw ...` guard placed right after the `refused !== null` early return — mirroring the SAME file's own already-established philosophy two lines below (`r9-voting.handlers.ts`'s own comment: *"Guarded explicitly rather than `!`-asserted so a future regression surfaces as a controlled 500, not an unhandled TypeError"*) — this patch just applies the author's own stated rule to the one spot it missed.
- [x] [Review][Patch] Misplaced JSDoc: inserting `postCloseForPaidDeath` between an existing comment and the method it actually describes left `postCommit`'s pool-spawn-trigger doc comment sitting above the WRONG method, and `postCommit` undocumented — `claims.cycle-freeze.handlers.ts`. **Fixed:** the pool-spawn-trigger comment moved back to sit directly above `postCommit`.
- [x] [Review][Patch] Dead code: `claims.correction-escalation.handlers.ts`'s `getEscalation` initialized `finally_approved_elsewhere: null` in the response literal, then unconditionally overwrote it a few lines later — the `null` never survived to any caller. **Fixed:** the read moved before the response-object construction and assigned directly; no two-step dance.
- [x] [Review][Patch] Three new reads lack the fail-soft wrapper their own story's sibling read (`readFinallyApprovedElsewhereDtos`, OP14 (b)) explicitly uses ("Decision SUPPORT only... ⛔ never 500s the surface") — an inconsistency within the same commit: `readClosedHolderRefusedBulk` in `claims.appeal.handlers.ts:328` (would 500 the whole helpline appeal list, discarding the already-fetched `rows`) and in `claims.death-certificate.handlers.ts:380` (would 500 the whole member claims list); `readOtherClaimsForDeath`/`readOtherClaimVisits` in `claims.ground-inspection.handlers.ts:933-934` (would discard an already-decrypted detail view — location, contact, notes, death date/time, photos). **Fixed:** all three wrapped in `.catch()` degrading to an empty `Set`/`null` with a `log.warn`, matching the established pattern. The ground-inspection pair was also switched from two sequential `await`s to `Promise.all` (they're independent reads — a free latency win bundled with the same edit).
- [x] [Review][Patch] (test-only) `one-payment-per-death-routes.spec.ts`'s `withinMs` test helper raced a promise against an unawaited `setTimeout`-backed rejection with no `clearTimeout` and no catch on the loser — on EVERY call, ~15s after the race settles, the still-pending side's eventual settlement is an unhandled rejection (not just the rare "timeout won, `p` rejects later" edge case Edge Case Hunter flagged — the common case fires too, since the timer is never cleared). **Fixed:** the timer is cleared via `.finally()` once the race settles, and both sides get a no-op `.catch()` so a late settlement on either side is swallowed rather than unhandled.
- [x] [Review][Patch] (low confidence — not independently re-verified beyond the auditor's own citation) Acceptance Auditor flagged `scripts/claim-adjudication-human-actor-invariant/check.ts` as missing the new route's `expectedMethods` entry. **Verified false** — the update exists in the branch (`git diff main...HEAD` shows `expectedMethods: ['get','post','post','post']` with an explicit `// Story 6.28 (OP14 (b))` comment at `check.ts:88-89`); the auditor's diff slice for this chunk was scoped to `apps/api/src/modules/claims`+`audit`+`tests/integration/claims` and simply didn't include `scripts/`, so the file never reached it. No code change — a scoping gap in how the chunk was sliced, not a story defect.

**Dismissed as noise/false positive after verification (8):** a SAVEPOINT-handle mismatch claim (`scope.tx = bindScopedDb(scope.client)` in `scope-tx.ts` — same connection, guaranteed, just outside the Blind-Hunter's diff-only view); the blanket-catch-too-lenient claim on `readFinallyApprovedElsewhereDtos` (matches the function's own explicit, documented "decision support only, never 500s" philosophy, and the `.warn` level matches the codebase's established convention for this exact class of degraded read); the "per 500 ids" comment "overstating" batching (the batching is real, just one layer down in `readFinallyApprovedElsewhereBulk`, already verified in chunk 1); `closeClaimsAfterFinalStop`'s `actor: 'system'` + real `actorId` (exactly matches the domain layer's own documented contract for H(iv), verified in chunk 1: *"`actor`: 'system' at... a stopped final writer (H(iv))"* / *"`actorId`:... the stopped actor (H(iv))"*); the step-up/MFA exemption on "Close this claim" (verified consistent with this codebase's actual policy — step-up protects the money-triggering commit/finalize, not every adjudication action; confirmed `claims.r9-voting.routes.ts`'s `finalize` DOES require step-up while its own `vote`/`act` route, like this one, does not); the string-interpolated `SET LOCAL lock_timeout` (an established repo-wide pattern across 4+ pre-existing files — `certificate-letter.ts`, `suspicion-staff-email.ts`, `suspicion-notice.ts` — never a 6.28-specific issue, and always a hardcoded literal, never user input); the ground-inspection vs. verifier-console "incompatible shapes" claim (deliberately different by design — ground-inspection's is explicitly narrower, "⛔ no date", per its own comment, plus separate visit-status facts the verifier-console surface doesn't carry); and the unknown-intake-channel-silently-dropped claim (unreachable — `CLAIM_INTAKE_CHANNELS` is a closed 3-value DB enum, same reasoning as chunk 1's array-parsing dismissal).

**Folds into an already-recorded residual, not a new finding:** the sequential per-death closure loop in `postCommit` (up to 500 deaths, each its own `lock_timeout`-bounded transaction) was flagged by both Blind Hunter and Edge Case Hunter as a latency/accountability risk. Verified: the story's OWN H(i) table already documents this exact shape ("once per distinct `deceasedMemberId`... up to 500, sequential") and R2 is already the recorded residual for "a missed closure" at this site. The worst-case response-latency angle (up to ~25 minutes if hundreds of distinct deaths hit lock contention in one commit) is real but not actioned here: the API server's pool is `max: 10` connections shared across the whole process (`packages/domain/src/db.ts:65`), so naive `Promise.all` parallelization would risk starving every OTHER concurrent request, and a safe bounded-concurrency or background-queue redesign is a bigger architectural call than an unambiguous patch. Flagged for BigDev/a future story, not fixed here.

**Noted, not actioned:** the Acceptance Auditor observed that `finally_approved_elsewhere`'s wiring into `claims.correction-closure.handlers.ts` and `claims.correction-escalation.handlers.ts` has no dedicated HTTP-level test in this diff (`one-payment-per-death-routes.spec.ts` only exercises it on the cycle-freeze pending list and the R9 panel, matching AC11's literal wording). Low severity — the underlying `readFinallyApprovedElsewhereBulk`/`readFinallyApprovedElsewhereDtos` are already thoroughly tested, and the wiring at both sites is a one-line field assignment using that same tested helper. Left as a minor coverage gap rather than added to keep this pass proportionate; worth a quick test if this area is touched again.

> Scope: `bmad-code-review` chunks 3+4/4 (Admin UI + Mobile/contracts/i18n, run together — `apps/admin/src/modules/*` +
> `apps/admin/tests/*`, `apps/mobile/app` + `apps/mobile/lib` + `apps/mobile/tests/*`, `packages/contracts/src/claims/*` +
> `packages/contracts/tests/*`, `packages/i18n/locales/en/claim.json`; branch vs `main` @ `34b9bab6`). Three layers again;
> Edge Case Hunter stalled once (a stream-watchdog timeout) and was retried clean.

- [x] [Review][Patch] **OP10 build gap — the Acceptance Auditor's one, deeply-verified finding:** `NomineeRefusalsRoute.tsx` (`:76`) is one of OP10's five named render sites but was never wired — its contract (`NomineeRefusalItem`) carried no `closed_holder_refused` field, and its backing read (`listNomineeRefusals`) is UNFILTERED by claim state (`current_state` read live), so a `-239`-refused claim later reversed, blocked by OP2 at its next vote, and closed by H(iv) — whose HOLDING claim is itself later refused/closed — would show the plain "closed" label forever, never the "may file again" variant the other 3 helpline surfaces carry. Confirmed reachable by reading the actual query. **Fixed end to end:** `closed_holder_refused: z.boolean()` added to `NomineeRefusalItem`; `listRefusals` wired to the existing `readClosedHolderRefusedBulk` (fail-soft, matching OP14 (b)'s pattern); the route renders the variant.
- [x] [Review][Patch] **The verifier console's finally-approved banner was derived from a CAPPED list, unlike every other approval surface** — `SignalsPanel`'s `OtherClaimsForDeathNotice` scanned `otherClaimsForDeath.claims` (capped at `OTHER_CLAIMS_FOR_DEATH_CAP`=20) for a `paid`/`passed_final_vote` row, so a death with more than 20 other claims could hide the one that matters most — the one no other surface would miss, since they all read the AUTHORITATIVE, uncapped `finally_approved_elsewhere` field. This also explains two related findings: the shared `<FinallyApprovedElsewhereBanner>`'s own header comment claims "ONE banner for every approval surface" while a second, hand-rolled banner existed here; and its `canClose={false}` branch (documented as "the District Admin's console") had no actual call site — the verifier console (held by the District Admin, `claim.verify`, which does ⛔ not hold `cycle.freeze`) was the missing 5th site. **Fixed:** `finallyApprovedElsewhere: FinallyApprovedElsewhere.nullable()` added to `VerifierConsolePacket` (camelCase, matching this contract's own convention); a new `assembleFinallyApprovedElsewhere` reuses `readFinallyApprovedElsewhereBulk` (fail-soft); `SignalsPanel` now mounts the SHARED `<FinallyApprovedElsewhereBanner elsewhere={...} canClose={false} />` and the capped-list derivation is removed from `OtherClaimsForDeathNotice`. Test fixtures across 5 files updated (`VerifierConsolePacket` literals now need the field — corrected from an earlier "4 files" undercount, round 2, Acceptance Auditor: the 5th is `packages/contracts/tests/claims-verifier-console.test.ts`); `verifier-console.test.tsx` needed a `QueryClientProvider` wrapper since the banner unconditionally calls `useMutation`/`useQueryClient`. ⚠ SUPERSEDED below — round 2 found and fixed a real read-count-ceiling regression this fix caused.
- [x] [Review][Patch] `GroundInspectionOtherClaims`'s `stage` was a bare `z.string()` (an unrecognized value would render the literal word "undefined" against the `gi.otherClaims.stage.*` i18n table) and `count` had no `int()`/`nonnegative()` guard. **Fixed:** `stage` now validates against the inline `GROUND_INSPECTION_OTHER_CLAIM_STAGES` tuple (this file deliberately carries no `@twt/contracts` mirror for this shape — kept inline rather than importing the sibling verifier-console contract's enum); `count` is `.int().nonnegative()`. Left `.strict()` off the inner claims objects — this file's OWN header comment documents non-strict/key-stripping as its deliberate, file-wide convention.
- [x] [Review][Patch] `GroundInspectionPage.tsx` showed the TOTAL count ("Other claims for this death: 25") above a list capped at 20 with no "and N more" notice — unlike the verifier console's equivalent, which already has one. **Fixed:** added the same notice (`gi.otherClaims.more`), shown when `count > claims.length`.
- [x] [Review][Patch] Mobile `relationship.tsx`: the local "filed-claim pointer" bookkeeping (`boundClaimEntryRead`/`fetchClaimEntryReadOutcome`) sat inside the SAME try/catch as the server call — a bookkeeping failure would surface the generic error screen for what is, to the member, a successful outcome (their claim was already closed server-side). **Fixed:** isolated in its own try/catch; a failure there is swallowed (best-effort) and the member still reaches the closed-helpline screen.
- [x] [Review][Patch] `R9CasePanel`'s Approve radio correctly goes `disabled`+unchecked once `finally_approved_elsewhere` arrives via a background refetch (window refocus, or another trustee's action) while `voteChoice` state still internally holds `'approve'` from before — but the Submit button's `disabled` condition didn't account for this, so it stayed clickable (though `submitVote`'s own re-check already silently no-ops it — no wrong vote was ever at risk). Also resolves a related finding: the validation-message ordering ("elsewhere" checked before "warnings unavailable") is now moot, since the button disables before either check can run. **Fixed:** `voteChoice === 'approve' && elsewhere !== null` added to the Submit button's `disabled` condition, alongside the existing `approveVoteUnavailable` check (kept separate, not merged, so `aria-describedby` still points at the right explanatory text for each distinct reason).
- [x] [Review][Patch] (minor) `FinallyApprovedElsewhereBanner`'s `close.error !== null && close.error !== undefined` — redundant; TanStack Query v5 types `mutation.error` as `T | null`, never `undefined`. **Fixed:** simplified to `close.error !== null`.
- [x] [Review][Patch] (minor) The identical `closed_holder_refused ? ... : (claimStateLabels[...] ?? '—')` ternary was copy-pasted across `HelplineAppeal.tsx`, `HelplineCertificateReplacement.tsx`, `HelplineClaimContact.tsx` — and now a 4th site, `NomineeRefusalsRoute.tsx` (this review's own OP10 fix above), would have made it a 4th copy. **Fixed:** factored into one exported `closedClaimStateLabel(closedHolderRefused, claimState)` helper in `claim-verification/i18n-en.ts`, used at all four sites; the now-redundant per-file `claimStateLabels` consts removed.
- [x] [Review][Patch] (minor) `apps/admin/src/api/client.ts`'s `verifierConsoleEn` import claim — **verified false**: `verifierConsoleEn` (and the import at the top of `HelplineCertificateReplacement.tsx`/`HelplineClaimContact.tsx`) was already present for an unrelated, pre-existing `claimStateLabels` usage; the Blind Hunter's diff-only view simply didn't show it. No code change needed for this one (superseded by the `closedClaimStateLabel` factor-out above, which removes the need for the import in two of the three files anyway).
- [x] [Review][Patch] (minor, low confidence) `CloseForPaidDeathParams` flagged as a dead export. **Verified false** — it's the route's own `params` schema (`claims.cycle-freeze.routes.ts:113`); the Blind Hunter's diff-only view checked only the handler file.
- [x] [Review][Defer — folds into R2, see above] The sequential per-death closure loop's latency risk.

**Dismissed as noise/false positive after verification (11):** the inner `GroundInspectionOtherClaims.claims` objects lacking `.strict()` (matches this file's own documented non-strict convention — tightening just one new schema against it would be the inconsistency, not the fix); the `'closed'` literal "needing" a schema update on the admin/mobile intake responses (verified false — `'closed'` has been a valid `ClaimLifecycleState` value since Story 6.24a, well before 6.28); `CloseForPaidDeathResponse` missing a `this_claim_closed`/`closed_count` cross-field constraint (unreachable given the server's own computation — `this_claim_closed: true` can only arise when this claim's id is already IN the `closed` array, which makes `closed_count ≥ 1` necessarily); the chained `.replace('{ref}',...).replace('{stage}',...)` "order-dependency" risk in `GroundInspectionPage.tsx` (unreachable — `claimShortReference` only ever emits 8 uppercase hex characters, which can never contain the literal substring `{stage}`); the joined `finalizeBlocked` message "risking a run-on" with no punctuation (verified false — every one of the three joinable fragments already ends with its own sentence-terminating period); the SAME finally-approved message appearing in up to 3 places in `R9CasePanel` (the banner at the top and the repeated text beside the far-away, disabled Finalize button is a defensible, common pattern — local context for a disabled control — not a verified defect); the 30-day convergence-window removal "applied as copy/test only" (a cross-chunk scoping artifact — the actual gating logic was removed from `packages/domain/src/claim/icp.ts` in chunk 1, already reviewed); `overrideClosed`'s lack of a per-row identifier (`ConvergenceDecisionStripContainer` is instantiated ONCE per claim-detail route, never as a list of rows — there is no second row to confuse it with); and the `GroundInspectionPage.tsx` render guard checking only `count > 0` (unreachable to lose `visitedElsewhere`/`alreadyVisited` at `count === 0` — both facts derive from the SAME "other claims of the death" relation, so zero other claims necessarily means neither can be true).

**Noted, not actioned (2):** `FinallyApprovedElsewhereBanner`'s unscoped `void qc.invalidateQueries()` (no query key) is a real deviation from every OTHER mutation in this codebase, which all scope their invalidation — but the blast radius of "closing one claim of a death" genuinely spans up to 5 different approval surfaces whose exact query keys aren't all enumerable from this one component with full confidence; a wrong, narrower re-scoping risks UNDER-invalidating (silent stale data) which is worse than the current over-invalidating (wasted requests). Left as-is pending a deliberate product/engineering call on the right key set, rather than guessed. Mobile `relationship.tsx`'s `if (memberId)` guard silently skipping the local filed-claim pointer when `session?.memberId` is falsy — low severity: the pointer is a UX optimization, not the actual duplicate-claim control (OP2's gate + OP11's exact-member convergence key are), and this state (an authenticated intake succeeding with no session member id) is already an anomaly before this code runs.

### Round 2 — adversarial review of the patches applied above (user-requested, after the first commit)

> Scope: the same 3-layer review, re-run against the DIFF OF FIXES this story's own code review produced (not the original
> story diff) — `git diff <pre-review-commit>..<post-chunk-1-4-commit>`. The Acceptance Auditor's brief changed accordingly:
> cross-check every "Fixed:"/"No change"/"Dismissed" claim above against what the diff actually contains, and check for a
> regression the chunk 1–4 fixes introduced into an AC already satisfied elsewhere.

- [x] [Review][Patch] **A real regression: the OP14 (b) authoritative-banner fix (chunk 3/4) silently broke the verifier console's hard-pinned read-count ceiling** — `VERIFIER_CONSOLE_MAX_READS` was pinned at 22 (`expect(VERIFIER_CONSOLE_MAX_READS).toBe(22)`, 4 sites across 3 test files), and the new `assembleFinallyApprovedElsewhere` calls `reads.bump()` unconditionally — the TRUE achievable ceiling is now 23, but nothing in the chunk-3/4 fix updated the constant, its ledger comment, or any of the 4 pinned assertions. The reason this didn't surface as a test FAILURE: the constant-pin tests only check the literal's OWN value (never regress by construction), and the `readCount <= MAX`-style tests don't happen to hit the TRUE maximum in their specific fixtures. **Fixed:** `VERIFIER_CONSOLE_MAX_READS` → 23; a new "STORY 6.28's SECOND READ (OP14 (b))" ledger-comment block added, matching the file's own established per-story accounting convention; all 4 pinned assertions + their titles updated across `verifier-console.spec.ts`, `verifier-console-ground-inspection.spec.ts` (×2), `suspicion-refusal-routes.spec.ts`; a NEW dedicated exact-read test added for the new section (`assembleFinallyApprovedElsewhere` books exactly 1 read, exactly 1 non-SAVEPOINT statement + its own named SAVEPOINT), matching the established "its own exact test" pattern the OP14 (a) ceiling bump used. This is the single most consequential finding across both review rounds — a real, verified gap the first round's own "Fixed" record did not disclose.
- [x] [Review][Patch] `otherClaimStageOf` labelled a `reversed` claim as `under_appeal` — a staff member reading that label would reasonably conclude "an appeal is pending, this is protected," while `KEEPS_ITS_APPEAL_STATES` deliberately excludes `reversed` so it is closable the INSTANT another claim of the death is paid. The label actively misleads about an irreversible, imminent action. **Fixed:** `reversed` promoted to its OWN `OtherClaimStage` value (`OTHER_CLAIM_STAGES` grew a 7th entry in BOTH `packages/domain` and its `packages/contracts` lockstep twin — the existing lockstep test caught nothing wrong, confirming both were updated together) with its own copy ("reversed — awaiting a new vote") in both `claim-verification/i18n-en.ts` and `ground-inspection/i18n-en.ts` + the admin client's inline tuple; the ONE existing test asserting `reversed → under_appeal` updated to `reversed → reversed`.
- [x] [Review][Patch] The ground-inspection client's `stage` enum tightening (chunk 3/4's own fix for the "literal 'undefined'" finding) traded one problem for a worse one: `apiFetch` calls a bare `schema.parse(...)`, so ANY nested field's validation failure — including one claim's unrecognized `stage` in an OPTIONAL, INFORMATIONAL section — throws and fails the ENTIRE response parse, taking the page's PRIMARY content (`assignments`) down with it. (Also corrected a factual error in my own chunk-3/4 reasoning: the render-side `t(...)` in this file resolves to the LOCAL, non-throwing `resolveEn` — not the global, throwing `@twt/i18n` `t()` — so the ORIGINAL pre-fix failure mode was an ugly fallback string, never literally "undefined" or a crash; still worth the schema-level defense, just not for the reason first stated.) **Fixed:** `z.enum(GROUND_INSPECTION_OTHER_CLAIM_STAGES).catch('open')` — zod's own per-field fallback (no prior precedent in this codebase for `.catch()`; justified inline) degrades ONE bad row to `'open'` without touching the rest of the parse. A new test proves an unrecognized stage no longer takes down `assignments`.
- [x] [Review][Patch] (minor) `R9CasePanel`'s Submit-button fix (chunk 3/4) added a new disable condition but left `aria-describedby` pointing only at the warnings-unavailable explanation — a screen-reader user disabled by the NEW elsewhere-conflict reason got no explanation at all. **Fixed:** `FinallyApprovedElsewhereBanner` gained a real `id` (matching its existing `data-testid`); the Submit button's `aria-describedby` now points at it when that's the active disable reason, kept as a separate branch (not merged into `approveVoteUnavailable`) so each reason still points at its own correct text.
- [x] [Review][Patch] (minor) `otherOpenClaimPredicateSql`'s `sql.raw(oc)` → `aliasOf(oc)` swap (chunk 1) was the only changed line in an otherwise over-documented diff with no comment of its own. **Fixed:** one-line comment added.
- [x] [Review][Patch] (minor) The mobile `relationship.tsx` try/catch isolation fix (chunk 3/4) swallowed a failure with NO logging at all, unlike every server-side "decision support, best-effort" catch elsewhere in this same diff, which always logs. **Fixed:** `console.error('[relationship] filed-claim pointer recording failed', e)`, matching this app's own established non-fatal-failure logging convention (`pay.tsx`'s `[pay] ... failed` precedent).
- [x] [Review][Patch] (minor) `OTHER_OPEN_CLAIMS_FOR_DEATH_JSON_CAP = 50` (chunk 1) duplicated `suspicion-refusal-persist.ts`'s `HELD_CLAIMS_CAP` value with no explanation of why a NEW constant rather than the existing one. **Verified and documented, not restructured**: `suspicion-refusal-persist.ts` already imports FROM `one-payment-per-death.ts` — importing `HELD_CLAIMS_CAP` back would be circular. Comment added explaining this explicitly rather than moving the constant.
- [x] [Review][Patch] (minor) `GROUND_INSPECTION_OTHER_CLAIM_STAGES` (the admin client's inline copy of the staff-facing stage vocabulary) had no compiler- or test-enforced link to the domain's `OTHER_CLAIM_STAGES`, unlike the verifier-console contract's OWN copy, which has a lockstep test. **Fixed:** the constant exported (test-only) and a new lockstep test added against `@twt/contracts`' `OTHER_CLAIM_STAGES` (a safe, already-established import direction for this app — admin already depends on `@twt/contracts` elsewhere; the "no mirror" design note was about not coupling this schema to the verifier-console-SPECIFIC export, not a packaging boundary).
- [x] [Review][Patch] (documentation only) Two wording inaccuracies in THIS story file's own chunk-3/4 record, caught by the Acceptance Auditor cross-checking claims against the diff: "two new tests added" for the `reversed`-stage fix overclaimed (only one `it(...)` block is genuinely new; the other is an EXISTING parametrized test extended with one more row) — corrected above. "Test fixtures across 4 files updated" undercounted by one (`packages/contracts/tests/claims-verifier-console.test.ts` also needed the field) — corrected above.

**Dismissed as noise/false positive after verification (6):** `close.error !== null && close.error !== undefined` → `close.error !== null` being "not equivalent if `close.error` can be `undefined`" (verified false — TanStack Query v5 types `mutation.error` as `T | null`, NEVER `undefined`, confirmed against the installed `^5.101.0`; an idle mutation's `error` is `null`, not `undefined`, so the simplified condition is correct for every state); `<SignalsPanel>`'s `QueryClientProvider` requirement being "demonstrated only in tests, not in the app tree" (verified false — `apps/admin/src/main.tsx`, the real app root, already wraps everything in one); `closed_holder_refused` degrading to `false` (not a tri-state) on a read failure (a real, pre-existing design choice for this exact OP10 field across all 4 call sites — not something chunk 1–4 introduced or made worse — restructuring it into a tri-state is a bigger change than this round's scope for a staff-LABEL-only, never-a-gate field); the 4 new fail-soft catch blocks logging only `err.name` (matches the file's OWN pre-existing `readFinallyApprovedElsewhereDtos` pattern being explicitly mirrored, consistent with this story's "ids only, no PII, no stack" discipline throughout); the NW1 comment-stripping fix "not fixing the root cause" of the scanner's structural exposure to a future similarly-shaped comment (already an explicitly documented, deliberate tradeoff from chunk 1 — rewriting the scanner to be comment-aware is a bigger, riskier change not undertaken then or now); and the "must be defined" `result === undefined` guards throwing AFTER the writer transaction already committed, "offering no path back to a consistent client state" (this is explicitly the SAME "should-never-happen, surface a controlled 500 not an unhandled TypeError" pattern this exact file already used elsewhere, and is the STATED GOAL of the original chunk-2 fix, not a new problem it introduced).

**Noted, not actioned (1):** the per-death `json_agg` cap (`OTHER_OPEN_CLAIMS_FOR_DEATH_JSON_CAP = 50`) has no truncation-detection/logging, unlike `closeOtherClaimsOfDeath`'s cap (chunk 1), which does. Considered and declined: that cap guards a WRITE path (closure) where a silent truncation has real consequences; this one guards a READ-ONLY, informational warning-key fragment embedded directly in column lists with no natural place to thread a "was this truncated" signal out without restructuring multiple call sites, for an already-extreme edge case (>50 simultaneously open claims for one death).

Verified after round 2: full `packages/domain` (4945), `packages/contracts` (1281), `apps/admin` (1011), `apps/mobile` (680) suites, the FULL `apps/api/tests/integration/claims/` directory (30 files, 445 tests), lint and typecheck across all five touched packages — all green.

### Round 3 — whole-story review, one pass (2026-10-12)

> Scope: `bmad-code-review 6.28` — the WHOLE story code diff (`git diff 34b9bab6..ebe52190 -- packages apps scripts`, 113 files,
> ~8 000 diff lines) in ONE pass, so the chunk boundaries of rounds 1–2 (domain ↔ API ↔ UI) are seen together. Three layers in
> parallel (Blind Hunter diff-only; Edge Case Hunter with repo read + the checklist lens; Acceptance Auditor with spec + rulings +
> checklist). Every finding below re-verified against HEAD by the orchestrator. 0 BLOCKER / 0 HIGH. ⚠ One prior dismissal is
> REVERSED (the strip's `overrideClosed` line — the strip renders a LIST of pending attempts; chunk 3/4's "never a list of rows"
> reasoning was wrong).
> ⭐ D1 / D2 are committed as `2026-10-12-320` (author-commit, ahead of the code). ⚠ That entry discloses that D1's narrowing — hiding
> "the family may file again" while a refused holder sits beside a still-LIVE claim of the death — departs from `-318` Q3 A's literal
> sentence; a one-line Panel confirm is its open follow-up (non-blocking — nothing is live).
> ⭐ 2026-10-12: that confirm is WRITTEN, ⛔ NOT SENT — `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-12-6-28-may-file-again-label.md`
> (A as built / B the literal sentence / C say both). B or C is follow-up work with its own row (`deferred-work.md`, round-3 section).
> ✅ **RULED 2026-10-12 — `2026-10-12-321` (Trustee-ratified, DR + KB): option A, as built.** `-320`'s follow-up DISCHARGED; ⛔ no code,
> ⛔ no row owed. ⛔ Not ratified (⛔ not asked): the "holding claim CLOSED, nothing in progress" case — stays the author's reading.

- [x] [Review][Patch] (from Decision — BigDev 2026-10-12: **A**, committed as `2026-10-12-320`) **The "later refused; the family may file again" staff label fires when the holding claim was CLOSED because the death is already paid** — `readClosedHolderRefusedBulk` flags a closed claim whose holder is `IN ('denied','closed')` (`one-payment-per-death.ts:483`), exactly as OP10's text says. Reachable: C paid; S a `-239` refusal reversed on appeal; B closable ⇒ `reviewAppealStage1` runs RF6 (B closed, `held_by` = S) THEN H(iii) (S closed, `held_by` = C) in one tx (`appeal-persist.ts:430-448`; same order in `appeal-panel-persist.ts`) ⇒ B reads "the other claim … was later refused; the family may file again" on all four helpline surfaces + Nominee Refusals, while the death is PAID and any new filing is closed at mint (H(ii)). Also when S was closed by a third claim's RF6. Options: **(A, recommended)** the variant iff ⛔ no OTHER claim of the death is live — every other claim `denied` or `closed` (so nothing "goes ahead", nothing paid); **(B)** holder `denied` only (literal "later refused"; misses a chain ending in a refusal); **(C)** keep as built. Panel gate §0: ⛔ not the Panel's — Q3 A ratified the label's MEANING; when the code shows it is "the code should show it when it is true". Sources: blind+edge. **Fixed:** `readClosedHolderRefusedBulk` gains `AND NOT EXISTS` another claim of the death outside `denied`/`closed`; the OP10 spec split into one death per case + two new legs (the paid chain ⇒ ⛔ listed; a refused holder beside an open third claim ⇒ ⛔ listed; a chain ENDING in a refusal ⇒ listed). Red-checked.
- [x] [Review][Patch] (from Decision — BigDev 2026-10-12: **A**, committed as `2026-10-12-320`) **"Close this claim" on a HELD claim still closes the death's OTHER closable claims, and its result line misstates why** — AC11: *"the claim held by OP4 (b)–(d) … answers 200 `{ this_claim_closed: false, closed_count: 0 }` and changes nothing"*; but `closeClaimsOfPaidDeathForClaim` (`close-claims-of-paid-death.ts:90-110`) walks the whole death regardless of THIS claim's state ⇒ `{false, N>0}` with N claims closed under the trustee's id, and the banner ignores `closed_count`. `notClosed` copy *"it waits on another claim's appeal or refusal"* is wrong for OP4 (b) (the claim's OWN appeal) and for a second press / another tab after it was already closed (`FinallyApprovedElsewhereBanner.tsx:44-46`). Options: **(A, recommended)** keep the walk (the closures are the ruled outcome and heal R2 strandings), amend AC11's "changes nothing", render `closed_count` ("N other claims of this death were closed"), and neutral not-closed copy ("Not closed — it waits on an appeal or a refusal."); **(B)** gate the walk on THIS claim being closable (AC11 literal; a held claim's press closes nothing). Sources: auditor+edge+blind. **Fixed:** server unchanged (the walk is the ruled outcome); `notClosed` copy neutral (*"Not closed — it waits on an appeal or a refusal."*); new `othersClosed(n)` line rendered from `closed_count` minus this claim; AC11 + OP14 (b) annotated as AMENDED; handler doc updated; new API leg (held claim + a closable third ⇒ `{false, 1}`, third closed) + admin leg (count beside both lines). Red-checked (admin).
- [x] [Review][Patch] **Fail-soft reads swallow a SQL error WITHOUT a SAVEPOINT — the request tx is left aborted** — `readClosedHolderRefusedBulk(...).catch` on `request.scopeTx`: the member claims list then runs `readDeathCertificateFamilyStatus` in the aborted tx (25P02 ⇒ 500 — the opposite of the comment) [`apps/api/src/modules/claims/claims.death-certificate.handlers.ts:383`]; same un-savepointed catch at `claims.appeal.handlers.ts:331` (commits an aborted tx with `ok=true`), `claims.nominee-declaration.handlers.ts:727`, `claims.ground-inspection.handlers.ts:934` (`Promise.all` pair). Fix: wrap each in `underSavepoint` as `readFinallyApprovedElsewhereDtos` does. Sources: blind+edge. **Fixed:** all four wrapped in `underSavepoint` (named savepoints). ⚠ Covered by construction (the shared helper and its own failed-read legs), ⛔ no new failure-injection leg per route.
- [x] [Review][Patch] **The escalated bucket's "Resolve → Approve" is ⛔ not disabled under the finally-approved banner** — only `cycle-freeze-approve` gets `|| elsewhere !== null`; `cycle-freeze-resolve-approve` (a FINAL approval) stays enabled and meets the 409 (AC11: "every listed surface … disables final approve") [`apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx:368`]. Source: blind. **Fixed:** `|| elsewhere !== null` added; new admin leg (escalated bucket). Red-checked.
- [x] [Review][Patch] **Checklist 13(d) REAL GAP — final approves disabled by the banner tell a screen reader nothing** — `aria-describedby` omits `finally-approved-elsewhere-<id>` at `PendingCaseCard.tsx:339` (and `:369` once disabled), `apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx:302-307`, `apps/admin/src/modules/correction-closure/EscalationPanel.tsx:340`, and the R9 Approve radio (`apps/admin/src/modules/r9-voting/R9CasePanel.tsx:433`); round 2 wired it only on R9's Submit. Sources: auditor+edge. **Fixed:** the banner's id joined into `aria-describedby` on Approve + Resolve → Approve (`approveDescribedBy`), the closure strip, the escalation decision (approve only), and the R9 Approve radio; assertions added to four existing legs. Red-checked.
- [x] [Review][Patch] **AC8 — the only recorded `pnpm ci:local` pass predates both review rounds** (`31895b10`; `a429e122` + `ebe52190` changed production code in domain/api/admin/mobile/contracts; round 2 ran per-package suites + lint + typecheck only — friction-budget and the invariant gates not re-run). Re-run `ci:local` after this round's patches and record it [Debug Log]. Source: auditor. **Fixed:** full `pnpm ci:local` re-run on the round-3 tree — **34 job(s) green** (Debug Log).
- [x] [Review][Patch] **H(i) / H(iv) drop the closure's `notClosed` — a second PAID claim of one death leaves no trace at the site that detects it** — `closeClaimsOfPaidDeath`'s doc: *"the caller logs (error, ids only) and audits each"*; `closeClaimsOfPaidDeathInOwnTx` / `closeClaimsOfPaidDeathForClaim` return the result and both H(i) (`claims.cycle-freeze.handlers.ts:747`) and H(iv) (`closeClaimsAfterFinalStop`) ignore it [`apps/api/src/modules/claims/close-claims-of-paid-death.ts:64`]. Fix: error-log ids when `notClosed.length > 0` (RF6's `heldClaimsAuditContext` precedent). Source: edge. **Fixed:** `logPaymentCommittedNotClosed` (error, ids only) runs after every `done` closure in `closeClaimsOfPaidDeathInOwnTx` and `closeClaimsOfPaidDeathForClaim` (H(i), H(iv), the staff action). ⚠ ⛔ No dedicated leg — reaching it needs a second paid claim (a legacy pair) through HTTP; recorded, ⛔ not faked.
- [x] [Review][Patch] **`finally_approved_elsewhere` picks the LOWEST-id finally-approved claim, ⛔ not the paid one** — `otherClaimInStatesSql` orders by `claim_case_id`; with a legacy pair (lower id voted, higher id `approved`) every surface shows "passed the final vote" and hides "Close this claim" [`packages/domain/src/claim/one-payment-per-death.ts:73`]. Fix: prefer a payment-committed state in `readFinallyApprovedElsewhereBulk`'s pick. Source: blind. **Fixed:** `COALESCE(<payment-committed pick>, <finally-approved pick>)`; new domain leg (voted LOW + paid HIGH ⇒ HIGH, `paid`). Red-checked.
- [x] [Review][Patch] **H(ii)'s `claim.closed` is attributed to the FILER (`actor: 'member'`/`'operator'`), unlike H(i)/H(iii)/H(iv) (`'system'` + the causing actor's id)** — the closure is the system's consequence (the family-9 DELIBERATE block says so) [`packages/domain/src/claim/icp.ts:365`, `:670`]. Source: blind. **Fixed:** both mint arms pass `actor: 'system'` (filer / deciding operator kept as `actorId`); domain assertions on the override + later-filing closures, and the new member-app HTTP leg asserts `actor: 'system'`. Red-checked.
- [x] [Review][Patch] **The strip's "Closed — another claim for this death goes ahead" line outlives its attempt** — `overrideClosed={override.data?.state === 'closed'}` persists across later merges/rows; the strip renders a LIST of pending attempts with no row identity on the line [`apps/admin/src/modules/helpline-claims/ConvergenceDecisionStrip.tsx:304`]. Fix: `override.reset()` when a merge starts (a new override already resets). ⚠ Reverses chunk 3/4's dismissal. Source: blind. **Fixed:** the container calls `override.reset()` before `merge.mutate`; new container test `ConvergenceDecisionStripContainer.test.tsx`. Red-checked.
- [x] [Review][Patch] **Checklist 3 REAL GAP — the new mutation route has ⛔ no cross-Pariwar leg** — the 404 uses `randomUUID()`; add a leg posting another Pariwar's REAL claim id (⇒ 404, ⛔ nothing closed) [`apps/api/tests/integration/claims/one-payment-per-death-routes.spec.ts`]. Sources: auditor+edge. **Fixed:** new leg — another Pariwar's REAL claim id ⇒ 404, that claim untouched, ⛔ `claim.closed` written.
- [x] [Review][Patch] **AC4 H(ii) — the MEMBER-app intake answering `state: 'closed'` has ⛔ no HTTP leg** (helpline + override do; member only at domain level) [`apps/api/tests/integration/claims/one-payment-per-death-routes.spec.ts`]. Source: auditor. **Fixed:** new leg in `claims-intake.spec.ts` (the member harness) — a paid claim kept apart ⇒ the member's intake answers `state: 'closed'`, trigger + holder + `actor: 'system'` asserted, the paid id ⛔ in the body.
- [x] [Review][Patch] **AC10's "suspicion-standing at ANY age" case seeds the `-239` claim `denied`, which the terminal filter already excludes — RF2's conjunct is never isolated**; seed it `appeal_stage_1` and aged [`packages/domain/tests/integration/claim/icp.spec.ts:211`]. Source: auditor. **Fixed:** case (3) seeded `appeal_stage_1` (⛔ not terminal) — only RF2 can exclude it now.
- [x] [Review][Patch] **Stale comment contradicts round 2: `otherClaimStageOf` shows `reversed`, ⛔ not `under_appeal`** [`packages/domain/src/claim/suspicion-refusal-persist.ts:302`]. Sources: blind+auditor. **Fixed.**
- [x] [Review][Patch] **Family 11 precision — P2 says "every other claim … still open is closed"; a refused / under-appeal claim and an RF1/RF5-held one stay open by OP4 (b)–(d)** — add the qualifier to P2's sentence (this story, `## 📜 Policy meaning`). Source: auditor. **Fixed:** P2 carries the qualifier (refused ⇒ keeps its appeal; suspicion-held ⇒ waits).
- [x] [Review][Defer] OP3's skip-and-keep re-check takes ⛔ no lock shared across two CONCURRENT commits with different candidate sets [`packages/domain/src/claim/state-trustee-decision-persist.ts:1341`] — deferred: needs two `state_trustee_approved` claims of one death, which OP2 prevents; no legacy pair exists (not in production). Defence-in-depth only.
- [x] [Review][Defer] Each later intake for a paid death whose paid claim was overridden apart mints a fresh, immediately `closed` claim (no idempotent return) [`packages/domain/src/claim/icp.ts:361`] — deferred: as designed (spec H(ii) / line "H(ii) fires only when every non-terminal claim … is excluded"); low volume, terminal rows.
- [x] [Review][Defer] The closure walk's cap (50) counts never-closable rows (`denied`, `approved`, appeal-held) before an open closable one [`packages/domain/src/claim/suspicion-refusal-persist.ts:215-233`] — deferred: >50 non-closed claims for one death is unrealistic; truncation is already logged.

**Dismissed after verification (6):** the death-certificate lateral "ignoring the current upload" (false — it joins `claim_documents` → the upload with the SAME `storage_object_key`, the identical chain `currentDeathCertificateUploadIdSql` uses); new strict response fields "with unpatched producers" (each schema has exactly one producer, all typed — tsc would fail); `claim.reversed` still emitted before H(iii) closes the claim (its only consumer, the Sahyog Vivran lineage, renders a DRIVE — a closed claim has none; the appeal response's `reversed: true` + `claim_state: 'closed'` is truthful); commit-latency and H(iv) lock-wait latency (already recorded with R2's sequential-loop note); RF7's inspection arm losing its driving leg (disclosed in the story by the author).

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

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 6.28`, 2026-10-11.

### Debug Log References

Every load-bearing leg was red-checked (plant → red → revert → green), all on the live DB (:5433):
- `pnpm ci:local` — FIRST run: 32 of 34 jobs green (incl. `integration-tests`), `lint` (an import the OP13 rewrite left unused) and
  `friction-budget` (AC-4: the mobile files were committed without a declaration) RED; both fixed (b724aa12); the SECOND full run:
  **`ci:local PASSED — 34 job(s) green`**.
- Task 1 red-checks: (a) planted `WHERE TRUE` for the Pariwar filter in `otherClaimInStatesSql` ⇒ "⛔ never a claim … in ANOTHER Pariwar" RED (1 failed); reverted ⇒ green. (b) planted `AND TRUE` for the self-exclusion in the open predicate ⇒ every open-fragment leg RED; reverted ⇒ 21/21 green.
- Task 2 red-checks: (a) OP8 — moved `assertNoOtherFinalApprovalForDeath` BEFORE RF5's call (before RF15's key) ⇒ the race leg RED ("the second final approval must be STOPPED: expected true to be false" — both writers committed `state_trustee_approved`); reverted ⇒ green. (b) removed the conjunct from the gate ⇒ the guard spec RED (9 failed | 4 passed); reverted ⇒ 13/13 green.
- Task 2 admin red-check: CycleFreezePage's `.death_already_finally_approved` arm planted off ⇒ cycle-freeze-page RED (1 failed); reverted ⇒ green.
- Task 3 red-check: OP3's re-check planted off (`false &&`) ⇒ 3 AC3 legs RED (the approved / settled earlier-cycle legs and the legacy pair); reverted ⇒ 26/26 green; state-trustee-cycle-freeze + suspicion-refusal specs green beside it (79).
- Task 4 red-checks (closure spec, 16 legs): (a) the core's `current_state <> 'closed'` prefilter removed ⇒ the 50+-closed-claims leg RED (1 failed); (b) OP4 (b)–(d)'s `mayClose` removed ⇒ 2 RED (the refusal / under-appeal leg and the RF1 / RF5 leg); (c) H(ii)'s `closed` return planted off ⇒ 2 RED; (d) H(iii) disabled at all three reversal arms ⇒ RED (see next line); (e) OP13 reverted (`state_trustee_approved` back in `CLAIM_NOT_CLOSABLE_STATES`) ⇒ 2 RED (the AC4 legacy-voted leg and AC9 (a)). Each reverted ⇒ 16/16 green.
  (d) result: H(iii) disabled ⇒ 4 RED (stage 1, stage 3 + panel, AC6, AC9 (b)); reverted ⇒ 16/16.
- Task 4 race red-checks: H(ii) disabled ⇒ the CLOSURE-first race leg RED (1 failed; the mint-first order is healed by the closure itself, by design); OP13 reverted ⇒ both AC9 race orders RED (X left `state_trustee_approved`). Restored ⇒ 6/6.
- Task 4 API red-checks (route spec, 15 legs): H(iv) helper planted off ⇒ 5 RED (the four X-`approved` route legs + the lock-timeout log leg); H(i) loop planted off ⇒ RED (both commit legs). Restored ⇒ 15/15.
- ⚠ OBSERVED, ⛔ NOT REPRODUCED: the FIRST full run of the route spec hung ~594 s in "3/5 R9 finalize, X approved" (vitest's 30 s timeout fired; ⛔ no `lock_timeout` log, so the wait was ⛔ not inside H(iv)'s own transaction). In isolation it passed in 441 ms; the next four full runs passed 15/15 in ~14 s. Recorded honestly as an unexplained one-off — a candidate is a stray session from an earlier killed run holding a lock the finalize writer (⛔ no `lock_timeout`) waited on. Watch for it in ci:local.
- Task 5 red-checks (warning spec, 4 legs): the queue's fourth `lateArm` disjunct off (`OR FALSE`) ⇒ 2 RED (the filed-after leg, normal + fault path, and the reappear leg); the key derivation off ⇒ 3 RED. Restored ⇒ 4/4.
- OP8 re-red-checked after its fixture gained warning reasons (Task 5 made X/Y each carry `other_claim_for_death`): conjunct moved before RF15's key ⇒ RED; restored ⇒ green.
- Task 5b red-check: a 30-day `created_at` term re-planted in `getConvergenceCandidate` ⇒ icp.spec's rewritten ⛔-NO-WINDOW leg RED and the API AC10 merge leg RED (domain 1 of 7, API 1); restored ⇒ green.
- Task 5c admin red-checks: PendingCaseCard's `elsewhere !== null` Approve gate planted off ⇒ RED; R9CasePanel's banner words removed from `finalizeBlocked` ⇒ RED. Restored ⇒ green.
- Task 5c (d) red-check: the admin client's `otherClaimsForDeath` schema line removed ⇒ the REAL-parse client test RED (the key is stripped); restored ⇒ green.
- Task 5c (d) red-check: the in-scope gate (`inScope.length > 0`) planted to `true` ⇒ the out-of-district caller saw the section ⇒ RED; restored ⇒ green.
- Task 6 red-check (AC6 Q3 A): the 0151 closure selector's trigger term widened to `TRUE` ⇒ the negative leg RED (OP4's closures selected); restored ⇒ green.
- Task 6 OP7 red-check: OP2's conjunct removed ⇒ the path spec RED (5 of 7 — F5, F6, F7 and both F8 legs; the §2 (b) join leg is OP11's and §2 (c) asserts the conjunct directly); restored ⇒ 7/7.
- Code review round 3 (2026-10-12) red-checks: domain — D1's `NOT EXISTS` live-claim term planted `AND false`, the payment-committed
  COALESCE arm planted `NULL`, and H(ii)'s `actor: 'system'` reverted to the filer ⇒ 3 RED (the paid-chain OP10 leg, the legacy-pair
  elsewhere leg, the override closure's actor leg); restored ⇒ 61/61 across the three specs. Admin — Resolve → Approve's `elsewhere` gate,
  `override.reset()`, the `othersClosed` count, and the banner id in four `aria-describedby`s planted off ⇒ 6 RED; restored ⇒ 54/54.
  API claims directory: 30 files, 448 tests green (445 + 3 new legs). Then the full **`pnpm ci:local` — `ci:local PASSED — 34 job(s)
  green`** on the round-3 tree (discharges round 3's AC8 finding: the earlier pass predated rounds 1–2's patches).

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

- 2026-10-11 — **`bmad-dev-story 6.28` — IMPLEMENTED (Tasks 1–6), status → `review`.** Built AS WRITTEN for `-318` Q1 A / Q2 A /
  Q3 A / Q4 A and `-319` (OP9's DB backstop ⛔ not built). One commit per task on `story/6-28-…`.
  · **OP1** — `claim/one-payment-per-death.ts`, a READ-ONLY leaf (in NW1's entry list): the three state lists BY VALUE (pinned
    for every state against `CLAIM_TERMINAL_STATES` and, after OP13, `CLAIM_NOT_CLOSABLE_STATES`), the fragments
    (`otherClaimInStatesSql`, `otherOpenClaimsForDeathSql` + its boolean sibling) and the thin reads; later the OP14 reads
    (`readOtherClaimsForDeath`, `readFinallyApprovedElsewhereBulk`, `readOtherClaimVisits`) and OP10's
    `readClosedHolderRefusedBulk`.
  · **OP2** — `assertNoOtherFinalApprovalForDeath` right after RF5's call (on RF15's key; ⛔ no lock of its own), EA2 still LAST;
    `DeathAlreadyFinallyApprovedError` → 409 `<prefix>.death_already_finally_approved` `{}` at the four translators (one shared
    message); the admin words at the freeze page, the R9 panel and the verifier strip (the closure surfaces show the server's
    words already). OP8's two-connection race red-checked.
  · **OP3** — the commit's skip-and-keep re-check after RF7's two; ⛔ no new lock.
  · **OP13** — `CLAIM_NOT_CLOSABLE_STATES` = `settled`, `approved`, `closed`; the two 6.24a legs REWRITTEN (`:386` → closed + a new
    `approved` notClosed leg; `:772-812`'s commit / own-visit tail deleted), the unit pins, the API route leg (both states,
    keeping `held_claims_not_closed` coverage) — each citing `-319`.
  · **OP4** — RF6's per-claim core extracted (`closeOtherClaimsOfDeath` + `closeLockedClaim`; the `<> 'closed'` prefilter
    before the cap + an error log at the cap); `closeClaimsOfPaidDeath` (own tx, intake key first; OP4 (b)–(d) via
    `mayClose`) and the SELF-MODE `closeClaimIfDeathPaid`; the payload's `trigger` enum (`CLAIM_CLOSED_TRIGGERS`; ⛔ not a
    new event — still 36); H(i) in `postCommit` after the trigger block on every response; H(ii) inside both mints (the writers return
    `closed`); H(iii) after RF6 in the three reversal arms (they return `closed`); H(iv) through ONE API helper
    (`close-claims-of-paid-death.ts`, `lock_timeout` 3 s, ⛔ never failing the request) in the four final-writer handlers.
  · **OP5** — `other_claim_for_death` (domain + contracts mirror + console label + the pinned list), embedded in BOTH warning
    readers (⛔ never a per-claim query), the correction queue's fourth `lateArm` disjunct; it enters 6.23b's wait as ruled (every
    current key counts — ⛔ no per-kind filter exists).
  · **OP11** — the window removed at the candidate, the strip and `confirmMerge`; the constant deleted (`git grep
    CONVERGENCE_WINDOW_DAYS` is empty over code — the historical records keep the name, ⛔ not rewritten); `icp.spec.ts`'s window
    leg REWRITTEN to the new rule; the strip note + its test.
  · **OP14** — (a) the console's `otherClaimsForDeath` section (one booked read under a SAVEPOINT; ceiling 21 → 22, ledger
    line + four pins + the two stale titles); (b) `finally_approved_elsewhere` on the freeze / R9 / closure-queue /
    escalation reads, ONE shared banner (`FinallyApprovedElsewhereBanner`) that disables only the FINAL approve, and "Close
    this claim" (`POST …/cycle-freeze/claims/:claimCaseId/close-for-paid-death`, `cycle.freeze`, ⛔ no step-up, own tx, 503 on a
    lock timeout, 404 unknown, audited; the adjudication gate's `expectedMethods` → 4); P1's console shows the banner only;
    (d) the ground-inspection read's `otherClaimsForDeath` (+ `visitedElsewhere` / `alreadyVisited`), ONLY with an in-scope
    assignment; the admin client schema lists it (a REAL-parse test).
  · **OP10** — the staff `closed` label neutral for both closures + the "later refused; may file again" variant
    (`closed_holder_refused` on the two helpline lists that show closed claims); `helpline.result.closed` in place of the
    created / route / bank lines; the strip's closed override line; the member app routes a `closed` intake to the closed
    screen and records the filed-claim pointer only when ⛔ none is on record or the recorded claim reads terminal; the
    `$comment.closed` (en) and every grep-found comment re-worded.
  · **OP7** — `one-payment-per-death-paths.spec.ts` (F5, F6, F7, F8 ×2, `-294` §2 (b), (c)); `-294` §2 (a) is AC9's pair
    of legs; the API closure per site is the route spec.
  · ⚠ **Deviations / limits, recorded (⛔ not papered over):**
    1. OP14 (b)'s field is computed by ONE sibling bulk statement per surface (per ≤ 500 ids), ⛔ not a column inside the
       existing read's SQL — the bulk-read rule (⛔ never a per-claim query) holds; the reads stay unchanged.
    2. The freeze card disables its **Approve** vote only; **Resolve → Approve** on an escalated card is a District-Admin-level
       step (⛔ not a final writer) and stays enabled.
    3. ~~NW1's scanner (`approval-warnings.test.ts`) now strips comments~~ — **superseded by the code review (chunk 1/4):**
       the comment-stripping loosened the fence's precision repo-wide ([[feedback_gate_scope_semantic_coverage]]) for a
       problem that was really just ONE pre-existing comment in `src/rbac/index.ts` quoting
       `export … from './rbac/index.js'` (newly reachable because H(ii) put `suspicion-refusal-persist.ts` under `icp.ts`).
       Fixed at the source instead: that comment reworded so it no longer textually matches an import statement; the
       scanner's `code` is read raw again, with ⛔ no stripping, so its precision is unchanged everywhere else.
    4. Fixtures that approved several claims of ONE death without a reason now answer OP5's key (the OP8 race, the 6.26a R9
       refile leg's source — driven to `denied` as every real refusal is, the verifier-console precedents leg — separate
       deaths, the shape spec's decoy — reason + note only when a warning shows). Each change is commented with its reason.
    5. The member app has ⛔ no screen-render harness (node unit tests only): the closed routing in `relationship.tsx` is
       covered by the pure `mayRecordClosedClaimPointer` test + `tsc`; re-entry routing is 6.24a's existing entry-gate test.
       ⛔ Not demonstrated on a device.
    6. F8's 6.19c D17 variant ("refusal for another reason" through a correction closure) is ⛔ not driven separately — its
       claim is `denied` like the two F8 legs, whose mechanism (reversal ⇒ final vote stopped / H(iii)) it shares.
    7. ⚠ ONE unexplained ~594 s hang in the FIRST full run of the route spec (see the Debug Log) — ⛔ not reproduced in four
       later full runs.

### File List

- `apps/admin/src/api/client.ts`
- `apps/admin/src/modules/claim-verification/SignalsPanel.tsx`
- `apps/admin/src/modules/claim-verification/i18n-en.ts`
- `apps/admin/src/modules/claim-verification/nominee-errors.ts`
- `apps/admin/src/modules/correction-closure/EscalationPanel.tsx`
- `apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx`
- `apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx`
- (new) `apps/admin/src/modules/cycle-freeze/FinallyApprovedElsewhereBanner.tsx`
- `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx`
- `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`
- `apps/admin/src/modules/ground-inspection/i18n-en.ts`
- `apps/admin/src/modules/helpline-claims/ConvergenceDecisionStrip.tsx`
- `apps/admin/src/modules/helpline-claims/HelplineAppeal.tsx`
- `apps/admin/src/modules/helpline-claims/HelplineCertificateReplacement.tsx`
- `apps/admin/src/modules/helpline-claims/HelplineClaimContact.tsx`
- `apps/admin/src/modules/helpline-claims/HelplineConsoleShell.tsx`
- `apps/admin/src/modules/helpline-claims/i18n-en.ts`
- `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`
- `apps/admin/src/routes/NomineeRefusalsRoute.tsx` (pre-existing, Story 6.20 — first touched by 6.28 in code review chunk 3/4, OP10's missing 5th site)
- `apps/admin/src/routes/VerifierConsoleRoute.tsx`
- `apps/admin/tests/ConvergenceDecisionStrip.test.tsx`
- (new) `apps/admin/tests/ConvergenceDecisionStripContainer.test.tsx` (code review round 3)
- `apps/admin/tests/correction-closure.test.tsx`
- `apps/admin/tests/cycle-freeze-page.test.tsx`
- `apps/admin/tests/death-certificate-review.test.tsx`
- `apps/admin/tests/escalation-detail-claim-switch.test.tsx`
- (new) `apps/admin/tests/finally-approved-elsewhere.test.tsx`
- (new) `apps/admin/tests/ground-inspection-other-claims-client.test.ts`
- `apps/admin/tests/ground-inspection-page.test.tsx`
- `apps/admin/tests/helpline-certificate-replacement.test.tsx`
- `apps/admin/tests/helpline-claim-contact.test.tsx`
- `apps/admin/tests/helpline-claim-page.test.tsx`
- `apps/admin/tests/later-approval-warnings.test.tsx`
- `apps/admin/tests/nominee-declaration-route.test.tsx`
- `apps/admin/tests/pending-case-card-return.test.tsx`
- `apps/admin/tests/r9-case-panel.test.tsx`
- `apps/admin/tests/suspicion-refusal-helpline-appeal.test.tsx`
- `apps/admin/tests/verifier-console-route-name-check.test.tsx`
- `apps/admin/tests/verifier-console.test.tsx`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/modules/claims/claims.appeal.handlers.ts`
- `apps/api/src/modules/claims/claims.convergence.handlers.ts`
- `apps/api/src/modules/claims/claims.correction-closure.handlers.ts`
- `apps/api/src/modules/claims/claims.correction-escalation.handlers.ts`
- `apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts`
- `apps/api/src/modules/claims/claims.cycle-freeze.routes.ts`
- `apps/api/src/modules/claims/claims.death-certificate-member.handlers.ts`
- `apps/api/src/modules/claims/claims.death-certificate.handlers.ts`
- `apps/api/src/modules/claims/claims.ground-inspection.handlers.ts`
- `apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts` (first touched by 6.28 in code review chunk 3/4, OP10's missing 5th site)
- `apps/api/src/modules/claims/claims.r9-voting.handlers.ts`
- `apps/api/src/modules/claims/claims.verification-decision.handlers.ts`
- `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`
- (new) `apps/api/src/modules/claims/close-claims-of-paid-death.ts`
- (new) `apps/api/src/modules/claims/death-already-finally-approved-message.ts`
- `apps/api/tests/integration/claims/claims-intake.spec.ts` (code review round 3 — the member-app H(ii) leg)
- (new) `apps/api/tests/integration/claims/one-payment-per-death-routes.spec.ts`
- `apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts`
- `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`
- `apps/api/tests/integration/claims/verifier-console-shape.spec.ts`
- `apps/api/tests/integration/claims/verifier-console.spec.ts`
- `apps/mobile/app/(claim)/closed-helpline.tsx`
- `apps/mobile/app/(claim)/relationship.tsx`
- `apps/mobile/lib/claim-entry-gate.ts`
- `apps/mobile/lib/closed-helpline-copy.ts`
- `apps/mobile/lib/death-certificate-view.ts`
- `apps/mobile/tests/unit/claim-entry-gate.test.ts`
- `packages/contracts/src/claims/appeal.ts`
- `packages/contracts/src/claims/correction-closure.ts`
- `packages/contracts/src/claims/cycle-freeze.ts`
- `packages/contracts/src/claims/death-certificate.ts`
- `packages/contracts/src/claims/index.ts`
- `packages/contracts/src/claims/nominee-declaration.ts` (first touched by 6.28 in code review chunk 3/4, OP10's missing 5th site)
- (new) `packages/contracts/src/claims/one-payment-per-death.ts`
- `packages/contracts/src/claims/r9-voting.ts`
- `packages/contracts/src/claims/verification-decision.ts`
- `packages/contracts/src/claims/verifier-console.ts`
- `packages/contracts/tests/approval-warnings-later-approvers.test.ts`
- `packages/contracts/tests/claims-suspicion-refusal.test.ts`
- `packages/contracts/tests/claims-verifier-console.test.ts`
- `packages/contracts/tests/nominee-name-check-vocabulary-lockstep.test.ts`
- `packages/domain/src/claim/appeal-panel-persist.ts`
- `packages/domain/src/claim/appeal-persist.ts`
- `packages/domain/src/claim/approval-warnings.ts`
- `packages/domain/src/claim/correction-queue-read.ts`
- `packages/domain/src/claim/death-certificate-approval.ts`
- `packages/domain/src/claim/errors.ts`
- `packages/domain/src/claim/events.ts`
- `packages/domain/src/claim/icp.ts`
- `packages/domain/src/claim/index.ts`
- `packages/domain/src/claim/nominee-name-check.ts`
- (new) `packages/domain/src/claim/one-payment-per-death.ts`
- `packages/domain/src/claim/read.ts`
- `packages/domain/src/claim/state-trustee-decision-persist.ts`
- `packages/domain/src/claim/state.ts`
- `packages/domain/src/claim/suspicion-refusal-persist.ts`
- `packages/domain/src/rbac/index.ts` (code review chunk 1/4 — one comment reworded, see Review Findings)
- `packages/domain/tests/claim/approval-warnings.test.ts`
- (new) `packages/domain/tests/claim/one-payment-per-death.test.ts`
- `packages/domain/tests/claim/suspicion-refusal.test.ts`
- (new) `packages/domain/tests/integration/claim/_one-payment-fixtures.ts`
- `packages/domain/tests/integration/claim/ground-inspection-approval.spec.ts`
- `packages/domain/tests/integration/claim/icp.spec.ts`
- `packages/domain/tests/integration/claim/nominee-refusal-inheritance.spec.ts`
- (new) `packages/domain/tests/integration/claim/one-payment-per-death-closure.spec.ts`
- (new) `packages/domain/tests/integration/claim/one-payment-per-death-concurrency.spec.ts`
- (new) `packages/domain/tests/integration/claim/one-payment-per-death-guard.spec.ts`
- (new) `packages/domain/tests/integration/claim/one-payment-per-death-paths.spec.ts`
- (new) `packages/domain/tests/integration/claim/one-payment-per-death-warning.spec.ts`
- (new) `packages/domain/tests/integration/claim/one-payment-per-death.spec.ts`
- `packages/domain/tests/integration/claim/suspicion-refusal-concurrency.spec.ts`
- `packages/domain/tests/integration/claim/suspicion-refusal.spec.ts`
- `packages/events/src/registry.ts`
- `packages/i18n/locales/en/claim.json`
- `scripts/claim-adjudication-human-actor-invariant/check.ts`
- `_bmad-output/implementation-artifacts/6-28-one-payment-per-death-second-approval-guard.md`
- `_bmad-output/implementation-artifacts/deferred-work.md` (code review round 3 — three deferrals)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `friction-budget.md`

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
| 1.18 | 2026-10-11 | `bmad-dev-story 6.28` — Tasks 1–6 built as ruled (`-318` A/A/A/A, `-319`): OP1 the leaf + reads; OP2 the guard (409 ×4, admin words; OP8 race); OP3 the commit re-check; OP13 + the rewritten 6.24a legs; OP4's core + H(i)–H(iv); OP5 the warning + the queue arm; OP11 the window removed; OP14 (a) console section (ceiling 22), (b) banners / disabled final approves / "Close this claim", (d) the inspector's lines; OP10 the staff / helpline / strip / member-app surfaces + the comment sweep; OP7's path specs. Every load-bearing leg red-checked (Debug Log); deviations recorded in the Completion Notes. ready-for-dev → in-progress → review. |
| 1.19 | 2026-10-11 | `bmad-code-review` chunk 1/4 (domain core) — 3 parallel layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor), 0 BLOCKER/HIGH confirmed by the auditor; 14 patch findings, all applied: `closeClaimIfDeathPaid` now returns the `claim.closed` event's own `eventVersion` (5 call sites); the closure-walk cap fetch fixed to CAP+1 (no more false "cap reached" on an exact count); `reversed` given its own stage label + fixture + 2 new tests (was untestable by construction); the `NO_SELF` sentinel documented; `otherOpenClaimsForDeathSql`'s `json_agg` capped; `mayCloseForPaidDeath`'s redundant per-row query removed (now a `Set` lookup, sidestepping the NW1 no-comparison fence); `otherOpenClaimPredicateSql`'s alias validation hardened; the duplicated "live accepted review" SQL factored into one shared fragment; `readOtherClaimsForDeath`'s `total` moved into its own CTE; NW1's repo-wide comment-stripping workaround replaced by fixing the one offending comment in `rbac/index.ts` at its source (Completion Notes deviation #3 superseded). 4 findings confirmed as no-change-needed after verification (lock-before-check is a deliberate TOCTOU avoidance; `clampLimit` on named constants is required by the `domain-accessor-invariants` AST gate, not ceremonial; the array/JSON parsing difference reflects a real `pg` driver distinction against a closed 3-value channel enum; the per-spec-file UUID constants are deliberate test-isolation, not drift). 4 findings dismissed as false positives after verification (the bulk-read-rule claim misapplied OP5's rule to an unrelated pre-existing loop; the standing-refusal race isn't exploitable under the walk's own lock discipline; the error-leak claim is unreachable given the actual Fastify error handler; the not-found-ambiguity claim is unreachable at both real call sites). 1 finding deferred — R1, the story's own already-recorded residual, independently rediscovered blind by the Edge Case Hunter. Full `packages/domain` unit suite (4945 tests) + every touched integration spec + the `domain-accessor-invariants` gate + lint + typecheck all green after the fixes. Status stays `review` — 3 more chunks (API, Admin UI, Mobile+contracts+i18n) queued. |
| 1.20 | 2026-10-11 | `bmad-code-review` chunk 2/4 (API layer) — 3 parallel layers again. 7 patch findings, applied: `postCloseForPaidDeath`'s bare-`Error` `'failed'` outcome now a typed `ApiError(500, 'cycle_freeze.close_for_paid_death_failed', ...)`, matching its sibling branches' contract (plus the 503's message tone realigned with established precedent); two `let result!: T` definite-assignment assertions (on the ₹50L-stakes R9/cycle-freeze paths) replaced with `T | undefined` + an explicit guard, applying the SAME file's own already-stated "guard explicitly, don't `!`-assert" rule to the one spot it missed; a misplaced JSDoc (the pool-spawn-trigger comment, displaced by `postCloseForPaidDeath`'s insertion) moved back above `postCommit`; a dead `finally_approved_elsewhere: null` initializer in `claims.correction-escalation.handlers.ts` removed; three new reads (`readClosedHolderRefusedBulk` ×2, `readOtherClaimsForDeath`+`readOtherClaimVisits`) given the same fail-soft `.catch()` wrapper OP14 (b)'s own sibling read already uses, with the ground-inspection pair also parallelized via `Promise.all`; a test helper's timer/unhandled-rejection leak fixed. 1 claim (the adjudication-gate `expectedMethods`) verified FALSE — the update exists in the branch, just outside this chunk's file-glob. 1 concern (sequential per-death closures, up to 500, in `postCommit`) folds into the story's own already-recorded R2 residual and a `max:10` connection-pool constraint that makes "just parallelize it" unsafe — flagged for a future story, not patched. 8 other findings dismissed as false positives after checking the actual code/precedent (SAVEPOINT handle identity, the catch-all's deliberate philosophy, the "per 500 ids" comment, `actor:'system'` matching the domain's own documented H(iv) contract, the step-up exemption matching the codebase's real policy, the string-interpolated `lock_timeout` as an established 4-file pattern, the ground-inspection/verifier-console shape "inconsistency" as deliberate-by-design, and the unknown-intake-channel filter as unreachable against a closed enum). 1 minor test-coverage gap noted, not actioned. Every touched handler's existing integration suite (9 spec files, 150+ tests) + typecheck + lint all green after the fixes. Status stays `review` — 2 more chunks (Admin UI, Mobile+contracts+i18n) queued. |
| 1.21 | 2026-10-11 | `bmad-code-review` chunks 3+4/4 (Admin UI + Mobile/contracts/i18n, run together) — 3 parallel layers (Edge Case Hunter stalled once on a stream-watchdog timeout, retried clean). The Acceptance Auditor's one finding was OP10's real build gap: `NomineeRefusalsRoute.tsx` — a named 5th render site — was never wired, and its backing read is unfiltered by claim state, so a specific (rare but real) refusal/reversal/re-close sequence would show the wrong closed-claim label forever; fixed end to end (new `closed_holder_refused` contract field, domain-helper reuse, API wiring, UI render). The bigger fix: the verifier console's finally-approved banner was derived from a CAPPED list (`OTHER_CLAIMS_FOR_DEATH_CAP`=20) instead of the AUTHORITATIVE, uncapped signal every other approval surface uses — a death with more than 20 other claims could hide the one that matters most on the one surface meant to catch it first; fixed by adding `finallyApprovedElsewhere` to `VerifierConsolePacket` and switching `SignalsPanel` onto the SAME shared `<FinallyApprovedElsewhereBanner>` component every other surface uses (`canClose={false}` — the verifier console's own missing 5th call site for that prop, confirmed by the test's own title literally calling it "the District Admin's console"). 6 more patches: a ground-inspection schema loosened to an open `z.string()` stage + no count bound, tightened; a missing "and N more" notice on the ground-inspection page (the verifier console already has one); a mobile bookkeeping failure that could mask a successful server-side claim closure behind a generic error, isolated into its own try/catch; an R9 vote Submit button that stayed clickable after its own radio correctly went disabled (a background refetch landing `finally_approved_elsewhere` while `voteChoice` state still said 'approve'); a redundant double-null-check; and a 3×(4× after this fix) copy-pasted ternary factored into one `closedClaimStateLabel` helper. 11 findings dismissed as false positives after checking the actual code (a non-strict-schema "inconsistency" that matches the file's own documented convention; a `'closed'`-literal "schema gap" that's been valid since Story 6.24a; a "dead export" that's the route's own params schema; an unreachable cross-field response contradiction; an unreachable string-templating injection risk; punctuation-run-on risk on messages that already all end in periods; message "redundancy" that's actually a defensible near-the-control repeat; a 30-day-window copy change that's a cross-chunk scoping artifact (chunk 1 already removed the real logic); and a row-identifier "gap" on a component that's never rendered as a list). 2 noted-not-actioned (an unscoped cache invalidation whose narrower alternative risks under-invalidating across 5 surfaces; a low-severity mobile edge case where the server-side control, not the local pointer, is the actual gate). Full admin suite (1009 tests) + mobile suite (680 tests) + contracts suite (1281 tests) + the touched API integration specs + typecheck + lint across all four packages — all green after the fixes. Status stays `review` pending the user's requested overall adversarial pass across all four chunks' applied patches. |
| 1.22 | 2026-10-12 | **Round 2 — user-requested adversarial review of the patches above themselves** (not the original story): 3 parallel layers against the diff of fixes. Found a REAL, previously-undisclosed regression: the chunk-3/4 authoritative-banner fix added an unconditional read to the verifier console's compound assembler, silently breaking its hard-pinned `VERIFIER_CONSOLE_MAX_READS = 22` ceiling (true achievable count now 23) — none of the 4 existing pinned assertions caught it because the constant-pin tests only self-check their own literal and the live-measurement tests don't happen to hit the true maximum in their fixtures. Fixed properly: the constant bumped to 23 with a new per-story ledger-comment block (matching the file's own convention), all 4 pinned assertions + titles updated across 3 test files, and a NEW dedicated exact-read test added for the new section (matching the established "its own exact test" pattern). Also fixed: `otherClaimStageOf`'s `reversed` state, previously grouped under the misleading `under_appeal` label (a staff member would read "protected, pending" for a claim one step from being closed) — promoted to its own `OtherClaimStage` value across domain + contracts (lockstep-tested) + both admin i18n tables; the ground-inspection client's `stage` enum tightening (chunk 3/4) traded one bug for a worse one (a single claim's bad `stage` could crash the WHOLE page's parse, including the primary assignments list) — switched to zod's `.catch('open')` for a per-field fallback instead of a whole-schema throw, with a new test proving the primary content survives; an aria-describedby gap for the new R9 Submit-button disable reason; a missing comment, a missing log line, a duplicate-cap-constant explanation, a new cross-package lockstep test for the ground-inspection client's OWN stage-vocabulary copy, and two wording corrections to this story's own chunk-3/4 record (an overclaimed "two new tests," an undercounted "4 files"). 6 more findings verified as false positives or pre-existing, deliberate patterns after checking the actual code (the `close.error` simplification, `<SignalsPanel>`'s QueryClientProvider already present at the real app root, `closed_holder_refused`'s false-on-failure matching its own pre-existing design, the fail-soft catches' `err.name`-only logging matching an explicitly-mirrored precedent, the NW1 scanner's structural exposure being an already-documented chunk-1 tradeoff, and the post-commit "must be defined" guards doing exactly what they were built to do). 1 noted-not-actioned (a read-only warning-key cap's truncation has no logging, unlike the write-path cap that does — the asymmetry is deliberate given the restructuring cost for an already-extreme edge case). Verified: full domain (4945) + contracts (1281) + admin (1011) + mobile (680) suites, the FULL `apps/api/tests/integration/claims/` directory (30 files, 445 tests), lint and typecheck across all five packages — all green. |
| 1.23 | 2026-10-12 | **Round 3 — whole-story review in ONE pass** (`bmad-code-review 6.28`, 113 files, 3 parallel layers + orchestrator re-verification): 0 BLOCKER / 0 HIGH; 2 decisions, committed as `2026-10-12-320` BEFORE this round's code (BigDev: D1 A — the "may file again" label only while ⛔ no other claim of the death is live; D2 A — "Close this claim" keeps closing the death's other closable claims, counts them, neutral not-closed copy; AC11 / OP10 / OP14 (b) annotated AMENDED) + 13 patches, all applied: fail-soft reads under SAVEPOINTs (4 handlers), Resolve → Approve disabled under the banner, checklist 13(d) describedby on 4 surfaces + the R9 radio, `notClosed` logged at H(i)/H(iv)/the staff action, the paid claim preferred in `finally_approved_elsewhere`, H(ii) closures `actor: 'system'`, the strip's closed line reset on merge, a cross-Pariwar leg, a member-app H(ii) HTTP leg, AC10's RF2 leg isolated, a stale comment, P2's qualifier; 3 deferred (`deferred-work.md`), 6 dismissed; one chunk-3/4 dismissal reversed. Red-checked; `ci:local` 34/34 green. Status → `done`. |
| 1.24 | 2026-10-12 | The Panel confirm owed by `-320` (D1's narrowing of `-318` Q3 A's staff line) written, sent, and RULED: `2026-10-12-321` (Trustee-ratified, DR + KB) — **option A, as built**. ⛔ No code; `-320`'s open follow-up and the `deferred-work.md` item DISCHARGED. |
