---
baseline_commit: 2059482b
---

<!--
⭐⭐ MERGED 2026-10-04 as PR #253 (REBASE-merge) — THE SHA MAP. Every SHA this file (and `sprint-status.yaml`) cites for
Story 6.23's own commits is a BRANCH SHA (`story/6-23-post-death-nominee-change-warnings`), ⛔ NOT reachable from `main`
after the rebase-merge. The baseline pin `2059482b` IS on `main` and is unaffected. The citations are kept AS WRITTEN (the
record); this is the map to their `main` twins, PROVED ⛔ not assumed: each pair has an IDENTICAL `git patch-id --stable`,
and the merged tree (`c8632117`) is byte-identical to the branch head (`629aab2e`) — `main` had not moved (the merge-base
was `2059482b`), so the rebase rewrote SHAs only.
  · `6ab1d8d9` → `a21d69e7`  story: created (v1.0)                                        (⛔ not cited)
  · `55f5be9a` → `15efa63d`  governance: the Q1–Q3 routing note                           (⛔ not cited)
  · `1b38be9e` → `1ed071dd`  governance: `-277` (the Panel's Q1 A · Q2 C · Q3 B)
  · `a55480a8` → `fb1f6a49`  story: the split into 6.23a / 6.23b (v2.1 / v1.1)
  · `07dd88b0` → `e8930a40`  story: the first validate's fixes (v2.2 / v1.2)               (⛔ not cited)
  · `a125a59d` → `a785eb0a`  governance: `-278` (NW1–NW18, EA1–EA9)
  · `29d35996` → `6a54a174`  story: `-278` recorded (v2.3 / v1.3)
  · `e2bcd2c3` → `73cf1358`  governance: `-279` (A1–A12)
  · `66ad3f75` → `efb21a3f`  governance: `-280` (NW14's fourth state)
  · `f17f4fab` → `52584c55`  story: the second validate (v2.4 / v1.4)                     (⛔ not cited)
  · `629aab2e` → `c8632117`  story: the round-4 fixes (the merge head)                    (⛔ not cited)
Re-verify (bash — zsh does not word-split `$p`): `for p in "a125a59d a785eb0a" …; do set -- $p; diff <(git show $1 | git patch-id --stable | cut -d' ' -f1) <(git show $2 | git patch-id --stable | cut -d' ' -f1); done`
— ⚠ needs the branch SHAs, which survive only while the branch (local or `origin/story/6-23-post-death-nominee-change-warnings`) does.
-->

<!--
BASELINE — `2059482b` on `main`, traced 2026-10-04 alongside Story 6.23a (the split of row `6-23`, BigDev: *"ok, split it"*). ⚠ This story
starts only when 6.23a is `done` — at that point RE-PIN: `git diff --name-only 2059482b..HEAD -- packages apps scripts docs` will list 6.23a's
whole build plus whatever else landed; re-derive every code claim below before Task 1 (two facts kept apart, as always: "the pin is an
ancestor of HEAD" — durable; "the code claims were re-derived at SHA X" — perishable).

STATUS IS `backlog`, ⛔ NOT `ready-for-dev` — the 6.21b precedent: the file is written, the row flips when its sibling (6.23a) is `done`.

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / don't / nowhere); `⭐` =
key fact or action; `⚠` = hazard. Doubling is volume only. ⭐ Sweep: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
⭐ The ONE glyph exception: a `⛔` inside a verbatim quotation of code (the gate's doc-block, quoted in Trap 1) belongs to the quote.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. `file:NNN` is used ONLY for
code, as of `2059482b` — function names are the stable handle (6.23a will move several of these files).
LETTERS: `EA1`…`EA9` are THIS story's author decisions, committed with 6.23a's `NW1`…`NW18` by ONE author-commit, `-278`, in 6.23a's Task 0;
`-279` (`A1`…`A12`, 6.23a's Task 0.5) amends EA1, EA2, EA5 and adds `EA10`; `-280` adds `state_trustee_approved` to 6.23a NW14's states. `NW*` = Story 6.23a's. Rulings are cited by id + item (`-277` Q2, Q3).
-->

# Story 6.23b: Every Approver Picks a Reason and Writes a Note While a Warning Shows — and a Late Warning Waits for the District Admin `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Trustee Panel ruled that **every approver** — not only the District Admin — gives a
> reason and a note while a nominee-change warning shows, *"also after an appeal and in the R9 vote … even where written reasons already
> exist"* (`2026-10-04-277` Q2 C; our reading B ⛔ not taken). And a warning that **appears after** the District Admin approved makes the
> **final approval wait** until the District Admin records a reason and a note for it (`-277` Q3 B) — ⛔ never a refusal. Story 6.23a built
> the warnings, the Pariwar's **reason list** (one built-in generic + the Super Admin's replace-only entries, each showing who added it and
> when to use it), the District Admin's rule, the **record** of every approval over a warning, and the District Admin's late reason. **This
> story makes every LATER approver pick from the SAME list, write a note, and leave a record — and makes the final approval wait.**
> ⭐ **The approvers** (`-277`'s reading, confirmed by BigDev in session): the State Trustee resolving an escalation (`resolveEscalation`;
> today the Pariwar Admin as Trustee-Lite), the **Pariwar Admin's final vote** — every one (`voteOnFrozenClaim`), **each R9 panel member's
> approving vote** (`castR9Vote`, re-checked at `finalizeR9Outcome`), the **Super Admin** approving a claim they hold
> (`decideEscalatedClosure`), and the **Pariwar Admin** approving a "no correction needed" claim (`approveNoCorrectionNeeded`). ⭐ An appeal
> **reversal** is ⛔ not an approval — it returns the claim to the final vote, which this story covers.
> ⭐ **The system still refuses nothing, marks nothing and pays no one differently.** A refusal, an escalation, a route to R9, a return for
> correction and every deny vote are ⛔ never gated. ⭐ **A written note is ⛔ never replaced** (6.23a NW18).
> ⭐ **The person the wait holds can ⛔ not clear it** (`-279` A1, BigDev: *"Not the final approver"*): a late reason recorded by the person
> now approving does ⛔ not count for that approval. ⭐ **The District Admin is told** — a waiting claim appears in their correction queue
> (EA10, `-279` A4).

> ⚠ **6.23a must be `done` first.** This story CALLS 6.23a's module — `readClaimApprovalWarnings`, `assertApprovalReasonCoversWarnings`,
> `uncoveredKeys`, `listApprovalWarningReasons` — writes rows into 6.23a's record table (`claim_warning_approvals`) and mounts 6.23a's shared
> picker (`ApprovalWarningReasonPicker`). Re-implement ⛔ none of it. ⭐ It ADDS `readClaimApprovalWarningsBulk` to that module and WIDENS the
> record's `step` CHECK (EA1).
> ⚠ **Go-live coupling (6.23a's):** `-277` Q2 C and Q3 B are in force only once THIS story ships.

## Story

As **any approver of a death claim after the District Admin** — the trustee resolving an escalation, the Pariwar Admin at the final vote,
an R9 panel member, the Super Admin —
I want **to see the nominee-change warnings on my own screen, to pick my reason from the Pariwar's list — seeing who added each reason and
when to use it — and to write my own note before I can approve; and to be told plainly when the claim is waiting for the District Admin to
answer a warning that appeared after their approval**,
so that **every approval of a claim over a warning carries a named person's chosen reason and unalterable note** — the Panel's rule for a
case that is most likely fraud.

## The rulings this story builds — verbatim keys, and what is still OUR reading

| Decision | The Panel said (verbatim, as relayed) | Our reading |
|---|---|---|
| `-277` Q2 | *"Q2 - C"* — *"Yes, every approver — also after an appeal and in the R9 vote … Every approval made while a warning shows records a reason and a note, even where written reasons already exist."* | Every writer that approves a claim, whenever any warning shows (the five above). ONE reason (from the list) + ONE note per approval (`-264`'s reading); where a note is already required (R9 votes, the Super Admin) only the reason is new. ⚠ The "no correction needed" approve has ⛔ no note today — it gains one (Trap 4); `-277`'s reading said *"6.19c's approvals"* already require one, and `-278` corrects that. ✅ BigDev confirmed the broad reading in session (`-277`). |
| `-277` Q3 | *"Q3 - B"* — *"The final approval waits until the District Admin … records a reason and a note for the new warning. The claim is ⛔ never refused for it."* | The wait = a conjunct of the ONE approval gate: where a District Admin approval exists, every current warning key must be covered by the District Admin's record rows (6.23a NW13–NW15) — else a typed 409 *"waits for the District Admin"*. Per warning, ⛔ not per kind. ⭐ A late reason recorded by the approving actor does ⛔ not count for that approval (`-279` A1). ⚠ `-277`'s clause *"a claim approved through an escalation, R9 or an appeal reversal has none"* is SUPERSEDED (`-279` A5): R9 run after the District Admin's approval, and a reversed final-vote denial, KEEP the District Admin's live approval — the wait applies there. |
| `-264` FQ12 | *"APPROVING WHILE ANY WARNING SHOWS NEEDS A REASON AND A NOTE"* (its heading) | `-277` Q2 extends it to every approver; `-264` is ⛔ not edited. |
| `-264` not-cover | *"The wording of the reasons … an author-commit at the row's Task 0."* | The reasons are 6.23a's list (NW16–NW17, BigDev's design) — this story ⛔ never mints its own. |

## ⭐ THE INVARIANTS

1. **The system refuses nothing.** The reason rule changes the FORM of an approval; the wait holds a final approval until the District
   Admin answers — ⛔ never a denial, ⛔ never a state change, ⛔ never a change to who is paid.
2. **ONE rule, ONE list, ONE record.** Every approver calls 6.23a's `assertApprovalReasonCoversWarnings`, picks from 6.23a's list and writes a
   row into 6.23a's record — ⛔ never a second copy of the rule, ⛔ never a vocabulary of its own, ⛔ never a second derivation of the warnings.
3. **ONE gate for the wait.** The wait is a conjunct of `assertClaimApprovable`, so it reaches every final approval BY CONSTRUCTION — the
   gate's own doc-block: *"every OTHER conjunct here … and whatever conjunct is added later — still refuses it"* (the `-251` waiver covers the
   name check only).
4. **A refusal is ⛔ never gated** — nor an escalation, a route to R9, a return for correction, a Super Admin refusal or closure, or a deny vote.
5. **Every approver SEES the warnings and the reasons (with who added each) before the approve control** — BigDev's (b): approvers learn from
   the list; and a reason demanded about something the screen does ⛔ not show is a 409 training staff to read governance as a glitch.
6. **⛔ No name of a member is compared; ⛔ no new decrypt; a note is ⛔ never replaced** (6.23a invariants 6, 7, 9).

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS conjuncts to every later approval of a death claim** — a listed reason and a note while a warning shows — **and a WAIT at
the final approval** while a warning that appeared after the District Admin's approval is unanswered.

**The sentence, in the member's terms (ours, for the Panel to correct):** *"If your nominee is changed on or after the day you die, or named
or changed in the 90 days before your family's claim is filed, every person who approves your family's claim must write down why. If such a
change only comes to light after the District Admin has approved, the claim waits until the District Admin has written down why too. Your
family's claim is never refused because of it."*

**Checked against the Niyamavali? ⭐ Yes — silent** (§6.2 *"the Trust verifies … the claimant's entitlement"*; nothing on approval notes;
the agent-drafted reference binds nothing — [[feedback_niyamavali_rulebook_not_spec]]). ⭐ **Checked against `-277` Q2 / Q3 and `-264` FQ12:
matches as ruled**; the scope of "every approver" is `-277`'s reading, confirmed by BigDev.

## ⚠ THE TRAPS

**Trap 1 — `resolveEscalation` runs ⛔ no approval gate,** so at an escalation's approval the `post_death_version` derivation is ⛔ not
guaranteed exact (6.23a Trap 2: it needs a current determination). ⇒ the rule there uses `readClaimApprovalWarnings` as it stands
(`post_death_version` only from a live determination) — safe, because the claim **still goes to the final vote**, where the gate runs and EA4
asks again with exact warnings (Q2 C: *"even where written reasons already exist"*). Do ⛔ not add the full gate to `resolveEscalation` — it
would refuse an escalation for a claim whose accounts are not yet collected, which `-226` cl.7 forbids (the gate's own doc-block,
`nominee-name-check.ts`: *"⛔ `resolveEscalation` is NOT gated separately"*).

**Trap 2 — the cycle-freeze card sends ⛔ no reason on Approve, by design — and the trustee presence rule must stay.** `PendingCaseCard.tsx`
builds the approve body *"WITHOUT"* a reason code or rationale, and an ordinary trustee approve takes ⛔ no code
(`trusteeReasonCodeRequiredForOutcome('approved')` is false — `claim/state-trustee-decision.ts`). ⇒ the warning reason rides a SEPARATE
optional field, `warning_reason_code` — ⛔ never the trustee `reason_code` — and the rationale becomes required only when that field is sent;
⛔ never flip the presence rule, or every un-warned approve would 400.

**Trap 3 — the concealment override is ⛔ no longer in the way.** A concealment-flagged claim that also shows a warning can carry BOTH: the
trustee `reason_code` stays free for `concealment_override` (and its R14 snapshot, `resolveConcealmentSnapshot`), while the warning reason is
its own field and its own record row. ⭐ This is one dividend of 6.23a's list design — do ⛔ not merge the two fields.

**Trap 4 — the "no correction needed" approve has ⛔ no note today.** `NoCorrectionNeededApproveRequest` is `z.object({}).strict()`
(`packages/contracts/src/claims/correction-closure.ts`) and the handler encrypts a FIXED constant (`NO_CORRECTION_NEEDED_DECISION_RATIONALE`,
`claims.correction-closure.handlers.ts:90`, used by `approveNoCorrectionNeeded`) as the decision's rationale. ⇒ while a warning shows the
request must carry the Pariwar Admin's own `note` and `warning_reason_code`, and THAT note is encrypted instead; with ⛔ no warning the
constant stays (⛔ never make the note required for every approve — the Panel ruled only the warned case).

**Trap 5 — the Super Admin's closure reason is a 0131 CHECK; do ⛔ not widen it.** `CLOSURE_SUPER_ADMIN_REASONS.approved` is pinned by
`claim_correction_closures_super_admin_decision_check` (migration 0131), a state-coherence CHECK. ⇒ the warning reason rides the separate
`warning_reason_code` field and the record row — ⛔ never a new closure reason.

**Trap 6 — an R9 approve vote can be cast BEFORE a warning exists, and votes are revisable until finalize (6.14).** ⇒ the vote-time check is
best-effort (the reader's warnings, inexact like Trap 1; and `castR9Vote` takes ⛔ no claim-row lock, so a certificate re-review can commit
between the read and the vote) and the binding check is at `finalizeR9Outcome` (after its gate — exact): **each** LIVE approve vote's own
`r9_vote` record row must cover EVERY current key (`uncoveredKeys` against that row's `covered_keys`) — ⛔ never merely "a row exists" —
else a typed 409 naming the vote ids, and the voters revise (`-279` A2). ⚠ Why per key: R9 can run from `verification_in_progress` /
`verifier_review` (`R9_OUTCOME_FROM_STATES`, `state.ts:78-85`), where ⛔ no District Admin approval exists and EA2 is vacuous — votes cast before
the determination cover only the 90-day keys, and the post-death keys would otherwise pass unanswered. ⚠ A panel member who cannot be
reached holds the approval until the session is cancelled and reopened — stated, ⛔ not solved. ⚠ A revised vote is a NEW vote
row with its OWN record row; the earlier vote, its note and its record row stay (history — BigDev accepted R9's revisability, 2026-10-04).
A deny vote ⛔ never needs a reason; a reason on a vote with ⛔ no warning is refused (ungrounded — the 6.23a precedent).

**Trap 7 — the wait reaches SIX call sites through ONE conjunct, and each caller maps its own errors.** `assertClaimApprovable`'s callers are
`adjudicateClaim` (P1 — vacuous: no live approved decision exists while approving), `voteOnFrozenClaim` (P3), `finalizeR9Outcome` (P4) and
6.19c's three approve calls in `correction-closure.ts` (`decideEscalatedClosure` ×2, `approveNoCorrectionNeeded`). ⇒ map
`LateWarningReasonRequiredError` in EVERY translator on a route that reaches them — FOUR translators across five handler files:
`claims.verification-decision.handlers.ts`, `claims.cycle-freeze.handlers.ts`, `claims.r9-voting.handlers.ts`, and `translateClosureError`
in `claims.correction-closure.handlers.ts`, which `claims.correction-escalation.handlers.ts` imports (`:43`) and calls — map it ONCE there.
Every translator ends `throw err`, so an unmapped typed error is a 500. ⭐ Each caller passes its **approving actors** on the gate's options
(EA2, `-279` A1). ⚠ `isReturnedClaimResubmitted` and `readNomineeNameCheckApprovalState` call the INNER helper — ⛔ never route them through the outer
one (6.21a T4). ⚠⚠ **The import direction:** EA2 makes `nominee-name-check.ts` import `approval-warnings.ts`; 6.23a NW1 forbids the reverse
(and anything that imports `nominee-name-check.ts`) — a cycle is a runtime TDZ that typecheck cannot see
([[project_type_only_import_cycle_trap]]). Keep 6.23a's source-scan test green.

**Trap 8 — the list surfaces are BULK.** `getCycleFreezePending` (`claim/cycle-freeze-read.ts`) already batches concealment and name-check
flags (*"NO per-claim call in a loop"*); `listPariwarClosureQueue` / `listEscalatedClosures` (`claim/correction-closure-read.ts`) list many
claims too. ⇒ `readClaimApprovalWarningsBulk` in ONE statement (the `getEffectiveNomineeDeclarationBulk` shape) and the reason options read
ONCE per response — ⛔ never the per-claim reader in a loop.

**Trap 9 — sequencing.** Rows **6-24** (`-262` FQ5: the true nominee's claim waits at final approval for the appeal) and **6-26** (`-263`
FQ9: no approval before a completed inspection — a conjunct INSIDE `assertClaimApprovable`) touch the same gate and the same writers
(`-277` Consequence 2). ⇒ whichever lands second rebases onto the other; ⛔ none drops another's check.

**Trap 10 — widening the record's `step` CHECK is a migration with a lockstep.** 6.23a's `claim_warning_approvals` allows only its two
`district_admin_*` steps, and its `verifier_decision_id` is already NULLABLE with a step-coherence CHECK (6.23a NW13 — ⛔ no `DROP NOT NULL`
here). ⇒ EA1's migration drops and re-adds the `step` CHECK and the step ⇔ FK coherence CHECK, adds the three nullable FK columns, and the DB ↔
TS lockstep test (6.23a's) is extended in the SAME commit; the policy-regression spec gains a case per new step. ⚠ 6.23a's UPDATE guard
compares `to_jsonb(NEW) - 'note_ciphertext'` (6.23a Trap 17), so the new columns are append-only with ⛔ no trigger edit — prove it.

**Trap 11 — a reason can be replaced between the page load and the submit** (6.23a Trap 16). Every later writer re-validates the chosen code
against the ACTIVE list in its own transaction ⇒ 409 `<route>.warning_reason_unavailable`, ⛔ never silently mapped to its replacement.

**Trap 12 — `PariwarClosureStrip.tsx` has TWO "approve"s, and only ONE is an approval of the claim.** The D27 "no correction needed" approve
(`useApproveNoCorrectionNeeded`, `:153`) approves the claim — it gets the picker and the note. The other (`:49-129`,
`data-testid="closure-approve"`) decides a CLOSURE REQUEST — the 6.19c D1 closure, which ends the claim in `denied_no_appeal` ⇒ it is a
refusal path, and putting the picker on it would gate a refusal (invariant 4). ⛔ Never mount the picker there. ⚠ `ClosureColumn.tsx` makes ⛔
no decision at all (its header: *"⛔ No decision is made here"*) — ⛔ not an EA7 surface.

**Trap 13 — the bulk reader inherits 6.23a's out-of-date rule.** A re-reviewed certificate leaves the determination live but stale; 6.23a's
reader reports `awaiting_determination` then (6.23a NW2, `-279` A3) ⇒ the bulk form does the SAME comparison in its one statement, so the
*"waits for the District Admin"* line and the vote-time R9 check ⛔ never use the old date.

## ⚖️ Decisions — the AUTHOR's (✅ COMMITTED by `-278` — `a125a59d`, 2026-10-04 — with 6.23a's NW1–NW18; EA1 / EA2 / EA5 amended and EA10 added by `-279`)

- **EA1 — the record's LATER steps.** Migration (next free — **0144** if 6.23a took 0142–0143; read live): `claim_warning_approvals.step` gains
  `escalation_resolution`, `final_vote`, `r9_vote`, `super_admin_approval`, `no_correction_approval`; three nullable FKs —
  `trustee_decision_id` (→ `claim_state_trustee_decisions`; for `escalation_resolution`, `final_vote`, `no_correction_approval`), `r9_vote_id`
  (→ `claim_r9_votes`), `closure_id` (→ `claim_correction_closures`) — `super_admin_approval` carries BOTH `closure_id` AND
  `trustee_decision_id` (`writeApprovalChain` writes a trustee decision row for that approve too, and the handler audits its `decision_id` —
  `-279` A10) — and a step ⇔ FK coherence CHECK (exactly the step's own FK set). Each new FK is `ON DELETE CASCADE` (6.23a Trap 17). Every later approval over a warning writes ONE row in its own transaction: the chosen reason (code + id, or the generic),
  ALL current keys, ⛔ no note column (each step's note lives on its own decision row). These rows ⛔ never count toward the District Admin's
  coverage (6.23a NW13). ⛔ No trustee or R9 reason column, ⛔ no new enum value anywhere.
- **EA2 — the WAIT (`-277` Q3 B).** NEW `assertLateWarningsCovered(db, pariwarId, claimCaseId)` in 6.23a's module: where the claim's live
  verifier decision is `approved`, `uncoveredKeys(readClaimApprovalWarnings(…))` must be empty, else `LateWarningReasonRequiredError` (→ 409
  `<route>.late_warning_reason_required`, `details: { kinds, uncovered_count }`; words: *"This claim is waiting for the District Admin to
  record a reason for a warning that appeared after their approval"*). The **LAST** conjunct of `assertClaimApprovable` (after the name check —
  every existing refusal keeps its code) ⇒ P3, P4 and 6.19c's approvals by construction (Trap 7). ⛔ Never a refusal. ⭐ It holds in
  `reversed` too: a District Admin approval survives a denied final vote and an appeal reversal (appeals ⛔ never write
  `claim_verifier_decisions` — 6.23a fact 3), and the District Admin answers there through 6.23a NW14.
  ⭐⭐ **The approving actors (`-279` A1).** Coverage, as judged for an approval, does ⛔ not count any `district_admin_late_reason` row whose
  `recorded_by_actor` is one of that approval's approving actors: the final voter (P3); the finalizer AND every live approve voter (P4); the
  Super Admin (`decideEscalatedClosure`); the Pariwar Admin (`approveNoCorrectionNeeded`); the District Admin at P1 (vacuous). They ride the
  gate's existing seam: `ClaimApprovalGateOptions` gains `approvingActorIds: readonly string[]` (actor ids are plain strings in these writers — `actorId: string`) — **required**, so typecheck finds all six
  callers; `opts` loses its `= {}` default; amend the seam's doc-block (*"OMITTED by every existing caller"* is no longer true) and keep
  `nameCheck` optional; the INNER helper `assertNomineeNameCheckForApproval(…, opts: ClaimApprovalGateOptions = {})` (`nominee-name-check.ts:469`)
  takes `Pick<ClaimApprovalGateOptions, 'nameCheck'>` so it still typechecks; the shipped 6.19c T10 seam test
  (`packages/domain/tests/integration/claim/nominee-name-check.spec.ts:715-753` — it loops `[undefined, {}, {nameCheck:'required'}]` and calls
  the gate with ⛔ no options at `:753`) is rewritten to pass `approvingActorIds` (domain tests ARE typechecked). When a key is uncovered
  ONLY because the approver's own late reason was excluded, the 409 carries `details.own_reason_excluded: true` and says so — *"a late
  reason you recorded cannot clear your own approval — someone else who can approve claims here (the District Admin, another Pariwar
  Admin or the Super Admin) and who is ⛔ not approving it themselves must record theirs"* (at R9: ⛔ not a live approve voter or the
  finalizer) — and 6.23a's NW14 lets that other person record it (its `nothing_uncovered` is judged for the recorder). ⚠
  `district_admin_approval` rows are ⛔ not excluded (one person at P1 and P3 is today's breadth, ⛔ not this story's).
  ⚠ `isReturnedClaimResubmitted` / `readNomineeNameCheckApprovalState` call the INNER helper and are untouched (Trap 7).
- **EA3 — the escalation resolution.** `CycleFreezeDecisionRequest` gains optional `warning_reason_code` (its `superRefine`: only with
  `resolve_escalation` approved or `approve`; requires a rationale). In `resolveEscalation`, outcome `approved`: kinds non-empty (Trap 1) ⇒ an
  active reason + a rationale, else `ApprovalWarningReasonRequiredError` (route code `cycle_freeze.warning_reason_required`); a reason with ⛔
  no warning ⇒ ungrounded; then the `escalation_resolution` record row. A denying resolution is ⛔ never gated.
- **EA4 — the Pariwar Admin's final vote.** In `voteOnFrozenClaim`, outcome `approved`, **after** `assertClaimApprovable` (incl. EA2) and
  `assertClaimContactRecorded`: the same rule, then the `final_vote` record row. ⭐ EVERY final approval over a warning — after a District
  Admin approval (who already wrote one), after a reversal, after an escalation — *"even where written reasons already exist"* (`-277` Q2 C).
  The trustee `reason_code` is untouched (Trap 3).
- **EA5 — the R9 vote.** `R9VoteRequest` gains optional `warning_reason_code`; `castR9Vote`: an approve vote while the reader shows warnings
  needs an active reason (the note — `rationale` — is already required), and writes the `r9_vote` record row in the vote's transaction; a
  reason with ⛔ no warning ⇒ ungrounded; `R9VoteRequest` (today `.strict()` with ⛔ no `superRefine`) gains one: `warning_reason_code` is
  refused on a `deny` vote. `finalizeR9Outcome` (approved outcome, after its gate): **each** LIVE approve vote's `r9_vote` row covers EVERY
  current key, else `R9ApproveVotesNeedWarningReasonError` → 409 `r9.approve_votes_need_warning_reason` (`details: { vote_ids,
  uncovered_count }`) (Trap 6; `-279` A2). A deny vote and a denied outcome are ⛔ never gated.
- **EA6 — 6.19c's two approvals.** (a) **Super Admin** (`decideEscalatedClosure`, approve): `EscalatedClosureDecisionRequest` gains optional
  `warning_reason_code`, required on an approve while warnings show (the note is already `RequiredNote`); then the `super_admin_approval`
  record row. The closure reason and the 0131 CHECK are untouched (Trap 5). (b) **"No correction needed"** (`approveNoCorrectionNeeded`):
  `NoCorrectionNeededApproveRequest` gains optional `warning_reason_code` and `note` — both required while warnings show, and PAIRED by a
  `superRefine` (`note` ⇔ `warning_reason_code`): the handler encrypts the rationale BEFORE the transaction
  (`claims.correction-closure.handlers.ts:528-532`), so the domain cannot tell the Pariwar Admin's note from the constant — the code's
  presence is the signal, and a bare `note` on an unwarned claim must ⛔ never silently replace the constant. The handler encrypts
  THAT note as `decisionRationaleCiphertext` instead of the fixed constant (Trap 4); then the `no_correction_approval` record row (its
  `trustee_decision_id` is the chain's own row — `writeApprovalChain` ALREADY returns `{ claimState, decisionId }`, `correction-closure.ts:667-678`;
  thread it, ⛔ no signature change). Refusals, closures and keeps are ⛔ never gated.
- **EA7 — every later surface SHOWS the warnings and the reasons.** NEW `readClaimApprovalWarningsBulk(db, pariwarId, claimCaseIds)` in 6.23a's
  module (ONE statement — Trap 8; the out-of-date rule — Trap 13) → `{ kinds, waitingForDistrictAdmin }` per claim, with
  `waitingForDistrictAdmin` judged for the VIEWER as a prospective approver (their own late-reason rows excluded — EA2's A1 rule, so the
  screen ⛔ never offers an approve that would 409; ON THE R9 PANEL (`getR9Panel`) also every live approve voter's rows, matching what
  finalize excludes), carried on: the cycle-freeze pending case
  (`getCycleFreezePending` → `approval_warnings` on each case of every bucket), the R9 panel (`getR9Panel`), the Super Admin's detail
  (`readEscalatedClosureDetail`) and the "no correction needed" queue (`listPariwarClosureQueue`); each response carries the Pariwar's active
  `reason_options` ONCE (6.23a's `listApprovalWarningReasons` — label, when to use, added by / on). UIs mount 6.23a's
  `ApprovalWarningReasonPicker`: `PendingCaseCard.tsx` (Approve and Resolve → Approve), `R9CasePanel.tsx` (an approve vote), `EscalationPanel.tsx`
  (approve), `PariwarClosureStrip.tsx` (the D27 approve ONLY, `:153`, + a note field — ⛔ never the closure-request `closure-approve`, Trap
  12). With warnings: the line, the picker (⛔ nothing pre-selected), the note required; *"waits for the District Admin"* disables Approve
  with those words. ⛔ No member name, ⛔ no date.
- **EA8 — notes are ⛔ never replaced here either (6.23a NW18).** Traced at `2059482b`: ⛔ no revise path exists for a trustee decision or a
  6.19c approval (`git grep revise` over `state-trustee-decision-persist.ts` and `correction-closure.ts` — only `superseded_at` writes for
  returns and escalations); every new record row is append-only. ⚠ R9 votes stay revisable before finalize (Trap 6) — history kept.
- **EA9 — audit, and nothing else moves.** Each approve audit context gains `approval_warning_kinds` and `warning_reason_code`; ⛔ no new route
  (requests are widened only — the human-actor gate entries are unchanged, but RE-RUN it); ⛔ no new claim event (35); ⛔ no new permission
  key (6.23a's 51 / 65 stands); ⛔ no member-app change.
- **EA10 — the District Admin is TOLD (`-279` A4; BigDev: *"Correction queue, in 6.23b"*).** Without it the wait is the 6.18 failure again
  (`correction-queue-read.ts`'s header: *"the District Admin could act on a return ONLY if somebody told them the claim id out of band"*).
  `listClaimsUnderCorrection` (`claim/correction-queue-read.ts`) also lists a claim whose live District Admin approval leaves a current
  warning key uncovered by any District Admin row. ⭐ A late key can arise ONLY through a determination recorded after the approval (6.23a
  fact 3) ⇒ the SQL superset gains the TIGHT arm *"a live `approved` verifier decision AND a live `nominee_determinations` row whose
  `decided_at` > that decision's `decided_at`"* — ⛔ never "every approved claim" (that re-creates the crowding the 2026-09-23b review
  removed); ⚠ the post-filter in `qualifyingRows` (`if (!hasLiveUnresubmittedReturn && !sentBackByCheck) continue;`, `:285`) gains a THIRD
  arm (`lateWarningAwaitingReason`), or it drops every new row; the module header (*"'Under correction' is `resolveClaimCorrectionState`'s
  answer"*) is amended to name the third arm; a late-warning-only row has ⛔ no live return, so its chase summary is `empty` and closure
  readiness `no_live_return` — the UI hides those actions for it. The arm is evaluated inside the existing `CORRECTABLE_SCAN_STATES` (it already covers
  `verifier_approved`, `reversed`, `state_trustee_freeze` — every state a late key can arise in, 6.23a fact 3), through `readClaimApprovalWarningsBulk` (⛔ no per-claim loop); `ClaimUnderCorrectionRow` and the wire
  `ClaimUnderCorrectionItem` (`packages/contracts/src/claims/nominee-name-check.ts`) gain `lateWarningAwaitingReason: boolean` (+ the
  `uncovered_count`); `CorrectionQueueRoute.tsx` shows *"a late warning awaits your reason"* and links to the console. ⛔ No new route — the
  queue's existing one (`claims.nominee-name-check.handlers.ts`). Coverage here is the District Admin's own (⛔ no actor exclusion — the
  queue asks whether ANY District Admin answer exists). ⚠ Accepted gap, recorded (Task 9's deferred item): a key covered ONLY by a late
  reason whose recorder later approves is ⛔ not queued — the approver's 409 (`own_reason_excluded`) tells them to ask, and NW14 lets the
  other person answer.

## Acceptance Criteria

### AC0 — Governance and re-pin (Task 0)
**Given** this story is about to start **Then** 6.23a is `done`; `-278` (6.23a's Task 0) carries EA1–EA9 and `-279` (6.23a's Task 0.5) carries
A1, A2, A3, A4, A5, A10 as written here (EA1 / EA2 / EA5 amended, EA10 added), and `-280` (NW14 in `state_trustee_approved`) — if they do ⛔ not, STOP and amend through a new author-commit;
read any entry after `-279` for `6-23`, `warning`, `reason`, `coverage` (rows `6-26` / `6-27` owe `-279` A6's decision before adding a kind);
the baseline is re-pinned and every function name below re-verified against 6.23a's build.

### AC1 — The record's later steps (EA1)
**Then** the migration widens `step` and adds the three FKs with the coherence CHECK; the policy-regression spec proves each new step accepts
exactly its own FK set (`super_admin_approval`: `closure_id` AND `trustee_decision_id`) and refuses the others, and that the rows stay append-only; the DB ↔ TS lockstep passes **and** a later step's row ⛔ never
counts toward the District Admin's coverage.

### AC2 — The wait (EA2; `-277` Q3 B)
**Given** a claim the District Admin approved over a warning, whose certificate is then re-reviewed to an earlier date and redetermined, so a
NEW warning key is uncovered **Then** the final vote, an R9 approve outcome and 6.19c's approvals answer **409 `…late_warning_reason_required`**
(⛔ nothing written; the claim is ⛔ not refused) **and** after the District Admin records a late reason (6.23a NW14) the same approval proceeds
**and** the same holds on 6.23a fact 3's path — District Admin approved → final vote denied → appeal reversed → re-reviewed in `reversed` →
the next final vote waits until NW14 **and** a claim with ⛔ no District Admin approval (escalated-and-resolved; refused by the District Admin
and then reversed on appeal) never waits on this conjunct **and** a claim with ⛔ no warnings never waits **and** P1 is unaffected **and**
(`-279` A1) a Pariwar Admin who records the late reason THEMSELVES and then votes approve still gets the 409 — while the same late reason
recorded by ANOTHER `claim.approve` holder lets that vote proceed; likewise an R9 finalize where the recorder is the finalizer or a live
approve voter **and** that 409 carries `details.own_reason_excluded: true` with its words, and a District Admin's or the Super Admin's
NW14 then succeeds (⛔ not `nothing_uncovered`) and the vote proceeds **and** every one of the six callers passes `approvingActorIds`
(typecheck: the field is required) and the rewritten T10 seam test passes **and** (`-280`) a claim in `state_trustee_approved` routed to
R9, whose only late-key cover is a late reason recorded by an approve voter, 409s at finalize with `own_reason_excluded` — and after the
District Admin (or the Super Admin) records a late reason THERE (NW14 now records in `state_trustee_approved`), finalize proceeds.

### AC3 — The escalation resolution (EA3)
**Given** an escalated claim showing a warning **Then** resolving it to approved without an active `warning_reason_code` + a rationale ⇒ 409
`cycle_freeze.warning_reason_required`; a replaced reason ⇒ 409 `…warning_reason_unavailable`; with an active one ⇒ resolved and ONE
`escalation_resolution` record row; a reason with ⛔ no warning ⇒ 409 ungrounded; a denying resolution is unchanged.

### AC4 — The final vote (EA4)
**Given** a claim at the final vote showing a warning — after a District Admin approval over it, after a reversal, and after an escalation
**Then** approving without an active reason + a rationale ⇒ 409 (each origin tested); with them ⇒ approved and ONE `final_vote` record row; a
deny, a route to R9 and a return are unchanged; a concealment-flagged + warned claim approves with `concealment_override` AND a warning reason
— both recorded, the R14 snapshot kept (Trap 3).

### AC5 — The R9 vote (EA5)
**Then** an approve vote while warnings show without an active reason ⇒ 409; with one ⇒ the vote and its `r9_vote` record row in one
transaction; a deny vote is never gated; a reason with ⛔ no warning ⇒ 409; a revised vote leaves the earlier vote, its note and its record
row in place; finalize (approved) with any live approve vote whose record row does ⛔ not cover every current key (or that has none) while
warnings show ⇒ 409
`r9.approve_votes_need_warning_reason`, and after the voters revise ⇒ finalized **and** (`-279` A2) a session routed from
`verification_in_progress` whose votes each covered only the 90-day key, then a determination adds a post-death key ⇒ finalize 409s with
those vote ids, and after each voter revises with a reason covering every current key ⇒ finalized **and** a `warning_reason_code` on a deny
vote ⇒ 400; a denied outcome is never gated.

### AC6 — 6.19c's approvals (EA6)
**Then** a Super Admin approve of a warned held claim without an active `warning_reason_code` ⇒ 409 (the note already required); with it ⇒
approved and ONE `super_admin_approval` row, the closure reason and 0131 CHECK unchanged **and** a "no correction needed" approve of a warned
claim without `warning_reason_code` + `note` ⇒ 409 / 400; with them ⇒ approved, the Pariwar Admin's note encrypted as the decision rationale
(⛔ not the constant), ONE `no_correction_approval` row; an un-warned approve still sends `{}` and stores the constant; a `note` without
`warning_reason_code` (or the reverse) ⇒ 400 **and** closures, refusals and keeps are unchanged.

### AC7 — Every surface shows the warnings and the reasons (EA7)
**Then** `readClaimApprovalWarningsBulk` serves each list in ONE statement (a live-DB statement-count test: ⛔ no growth with rows) and the
reason options are read once per response; each of the four surfaces shows the warning line and 6.23a's picker — every reason with its label,
"when to use" and *"added by {name} on {date}"* / *"built in"*, ⛔ nothing pre-selected — requires the note, and shows *"waits for the District
Admin"* (Approve disabled, with those words) when a late warning is uncovered for THIS viewer; every new 409 code maps to its own words — ⛔ never *"try
again"* **and** on `PariwarClosureStrip.tsx` ONLY the D27 approve carries the picker — the closure-request `closure-approve` has ⛔ none (Trap 12).

### AC8 — Nothing else moves (EA8, EA9)
**Then** ⛔ no new route, claim event, permission key, enum value or member-app change; every refusal / closure / keep / route / return / deny
vote is unchanged; ⛔ no route edits or replaces a note; the human-actor, access-wrapper and microcopy gates pass;
`contracts:check-openapi-determinism` is green.

### AC9 — The proof
**Then** the suites in *Testing* exist and each new test was shown to fail before its code; live-DB specs `{ timeout: 20000 }`, own-commit,
membership-not-counts; `pnpm -w typecheck`, lint, the domain / contracts / api / admin suites and `ci:local` are run (flakes named, ⛔ never
silently re-run).

### AC10 — The District Admin is told (EA10; `-279` A4)
**Given** a claim the District Admin approved, with a current key now uncovered by any District Admin row **Then** it appears in the District
Admin's correction queue with `lateWarningAwaitingReason: true` and *"a late warning awaits your reason"*, linking to the console **and**
after NW14 covers it, it leaves the queue (unless under correction for another reason) **and** the queue's read stays ONE bulk evaluation (⛔ no
per-claim loop) **and** ⛔ no new route.

## Tasks / Subtasks

- [ ] **Task 0 — Re-pin and governance check (AC0).** 6.23a `done`; re-pin; confirm `-278` carries EA1–EA9 and `-279` its A-items; re-verify every function name in this file.
- [ ] **Task 1 — Migration (AC1).** Widen `claim_warning_approvals` (EA1; Trap 10); journal entry; the Drizzle schema + the DB ↔ TS lockstep; extend the policy-regression spec.
- [ ] **Task 2 — Domain: the wait and the bulk reader (AC2, AC7).** `assertLateWarningsCovered` + `LateWarningReasonRequiredError` and `readClaimApprovalWarningsBulk` in 6.23a's module (the out-of-date rule; per-viewer `waitingForDistrictAdmin`); the LAST conjunct of `assertClaimApprovable` (and its doc-block's conjunct list); `ClaimApprovalGateOptions.approvingActorIds` (required; `opts` loses its default; the seam's doc-block amended) and the A1 exclusion with `details.own_reason_excluded`; the inner helper's `Pick<…,'nameCheck'>`; thread the actors at all six callers; rewrite the T10 seam test (`nominee-name-check.spec.ts:715-753`).
- [ ] **Task 3 — Domain: the final vote and the escalation (AC3, AC4).** `voteOnFrozenClaim` and `resolveEscalation` per EA3 / EA4 — validate against the active list, call `assertApprovalReasonCoversWarnings`, insert the record row; `approvalWarningKinds` on the results.
- [ ] **Task 4 — Domain: R9 (AC5).** `castR9Vote` (best-effort + the record row) and `finalizeR9Outcome` (binding, after its gate — PER VOTE, PER KEY, `-279` A2) per EA5 — the live-vote select (`r9-voting-persist.ts:600`, today `{ voteId, vote }`) gains `voterActorId` (A1's exclusion) and the check runs after `assertClaimContactRecorded`, before any write; the new typed error with `vote_ids`.
- [ ] **Task 5 — Domain: 6.19c (AC6).** Thread `writeApprovalChain`'s existing `decisionId` to the record row; `decideEscalatedClosure` / `approveNoCorrectionNeeded` take the warning reason (and D27's note), call the rule after the gate + contact check, insert the record row.
- [ ] **Task 6 — Contracts (AC3–AC7).** `warning_reason_code` on `CycleFreezeDecisionRequest`, `R9VoteRequest`, `EscalatedClosureDecisionRequest`; `{warning_reason_code, note}` on `NoCorrectionNeededApproveRequest`; `approval_warnings` + `reason_options` on the four read DTOs (6.23a's `ApprovalWarningReasonOption`); the `superRefine` rules (EA3's is `effectiveOutcome(action, escalation_outcome) === 'approved'` — `CycleFreezeDecisionRequest` is ONE flat `.strict()` object, ⛔ not a discriminated union; `R9VoteRequest` gains its FIRST `superRefine` — no code on a deny; D27's `note` ⇔ `warning_reason_code` pairing). ⚠ ⛔ No contracts test pins these request shapes today (`claims-cycle-freeze.test.ts`, `r9-voting.test.ts`, `correction-closure-lockstep.test.ts` test `safeParse` behaviour and `.strict()` smuggling only; `NoCorrectionNeededApproveRequest` has ⛔ no test at all) — WRITE the new rules' tests, incl. one for the D27 request; contracts tests sit outside `tsc` — run vitest.
- [ ] **Task 7 — API (AC2–AC7).** Map `LateWarningReasonRequiredError`, `ApprovalWarningReasonRequiredError`, `WarningReasonUnavailableError`, `WarningReasonUngroundedError` and the R9 error in the FOUR translators of Trap 7 (`translateClosureError` once, for both closure handler files); D27's note encryption (Trap 4); the read DTOs; the audit contexts.
- [ ] **Task 8 — Admin (AC7).** Mount 6.23a's picker on `PendingCaseCard.tsx` / `CycleFreezePage.tsx`, `R9CasePanel.tsx`, `EscalationPanel.tsx`, `PariwarClosureStrip.tsx` (the D27 approve ONLY — Trap 12) per EA7; `apps/admin/src/api/{client,hooks}.ts` — `approveNoCorrectionNeeded(pariwarId, claimCaseId)` posts `{}` today (`client.ts:1534-1535`) and its hook's `mutationFn` takes only `claimCaseId` (`hooks.ts:932`) ⇒ both take the optional body; the R9-vote and cycle-freeze payload types gain `warning_reason_code`; each surface's error-message table; English-only staff copy in each module's `i18n-en.ts` (⛔ no `report` / `receipt` / `invoice` / `passbook`).
- [ ] **Task 9 — Tests and records (AC8, AC9).** See *Testing*. `deferred-work.md` ("Recorded during Story 6.23b"): R9 votes revisable before finalize — notes kept as history (BigDev accepted; trigger: a Panel instruction to lock them); a late key covered ONLY by a late reason whose recorder then approves is ⛔ not queued by EA10 (the 409's `own_reason_excluded` words carry it; trigger: a held claim reported); ⚠ the R9 residual — a live approve voter may still
record a late reason (6.23a's NW14 knows ⛔ nothing of R9) that ⛔ never counts at finalize, and in a Pariwar where EVERY `claim.approve`
holder at the district is a live approve voter or the finalizer, ⛔ nobody can answer (exit: a vote change, or the session re-run;
trigger: a held R9 claim reported).
- [ ] **Task 10 — The District Admin's queue (AC10).** EA10: `listClaimsUnderCorrection`'s SQL superset + `readClaimApprovalWarningsBulk`; `ClaimUnderCorrectionRow` / `ClaimUnderCorrectionItem` gain `lateWarningAwaitingReason` (+ `uncovered_count`); `claims.nominee-name-check.handlers.ts` maps it; the module header amended to name the third arm; `CorrectionQueueRoute.tsx` shows the line and the console link and HIDES the chase-summary and closure actions on a late-warning-only row (⛔ no live return); its tests.

## Dev Notes

### What already EXISTS — traced at `2059482b` (⚠ re-verify after 6.23a lands)

| Thing | Where | Use |
|---|---|---|
| The ONE gate | `assertClaimApprovable` (`claim/nominee-name-check.ts`) — its doc-block names P1 / P3 / P4 and 6.19c's seam; *"whatever conjunct is added later — still refuses it"* | EA2's home |
| The final vote | `voteOnFrozenClaim` (`claim/state-trustee-decision-persist.ts`) — gate + contact for `approved`; `resolveConcealmentSnapshot`; `assertReasonCode` (D-F) | EA4, Trap 3 |
| The escalation resolution | `resolveEscalation` (same file) → `claim.verifier_approved`; ⛔ no gate | EA3, Trap 1 |
| The trustee presence rule | `trusteeReasonCodeRequiredForOutcome` (`claim/state-trustee-decision.ts`); `CycleFreezeDecisionRequest` (`packages/contracts/src/claims/cycle-freeze.ts`) | Trap 2 — untouched |
| R9 | `castR9Vote`, `finalizeR9Outcome` (`claim/r9-voting-persist.ts` — finalize runs the gate for `approved`); `claim_r9_votes` (0063; `rationale_ciphertext` NOT NULL); `R9VoteRequest` (`packages/contracts/src/claims/r9-voting.ts`); `getR9Panel` (`claim/r9-voting-read.ts`) | EA5 |
| 6.19c | `decideEscalatedClosure`, `approveNoCorrectionNeeded`, `writeApprovalChain` → `insertDecisionRow(…, 'approved', null)` (`claim/correction-closure.ts`); `CLOSURE_SUPER_ADMIN_REASONS` + 0131's `…_super_admin_decision_check`; `EscalatedClosureDecisionRequest`, `NoCorrectionNeededApproveRequest` (`z.object({}).strict()`) (`packages/contracts/src/claims/correction-closure.ts`); `NO_CORRECTION_NEEDED_DECISION_RATIONALE` (`claims.correction-closure.handlers.ts:90`) | EA6, Traps 4–5 |
| The lists | `getCycleFreezePending` (`claim/cycle-freeze-read.ts` — bulk concealment + `readNomineeNameCheckFlagsBulk`); `listPariwarClosureQueue`, `listEscalatedClosures`, `readEscalatedClosureDetail` (`claim/correction-closure-read.ts`) | EA7, Trap 8 |
| The admin surfaces | `apps/admin/src/modules/cycle-freeze/{PendingCaseCard,CycleFreezePage}.tsx` (Approve sends ⛔ no reason — Trap 2; the card shows the verifier's rationale), `apps/admin/src/modules/r9-voting/{R9CasePanel,R9VotingPage}.tsx`, `apps/admin/src/modules/correction-closure/{EscalationPanel,PariwarClosureStrip}.tsx` (⛔ not `ClosureColumn.tsx` — it decides nothing; Trap 12) | EA7 |
| The District Admin's queue | `listClaimsUnderCorrection` + `CORRECTABLE_SCAN_STATES` (`claim/correction-queue-read.ts` — the 6.18 "out of band" header); `ClaimUnderCorrectionItem` (`packages/contracts/src/claims/nominee-name-check.ts`); the route in `claims.nominee-name-check.handlers.ts`; `apps/admin/src/routes/CorrectionQueueRoute.tsx` | EA10 |
| The gate's options seam | `ClaimApprovalGateOptions` (`nominee-name-check.ts`, 6.19c T10 — today `{ nameCheck? }`, `opts = {}`) | EA2's `approvingActorIds` |
| 6.23a's build (after it lands) | `claim/approval-warnings.ts` (`readClaimApprovalWarnings`, `assertApprovalReasonCoversWarnings`, `uncoveredKeys`), `claim/approval-warning-reasons.ts` (`listApprovalWarningReasons`, `lockActiveApprovalWarningReason` — `FOR SHARE`), `claim_warning_approvals`, the typed errors, `ApprovalWarningReasonPicker.tsx` | every EA — CALLED, ⛔ never copied |

### Testing
- **Live-DB (domain):** `packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts` — AC2–AC6 on real rows: a District
  Admin approval over a warning, then the final vote (needs its own reason and row); a re-reviewed certificate making a key uncovered ⇒ the
  final vote, R9 finalize and the Super Admin approve all 409; NW14 then unblocks them; 6.23a fact 3's path (approved → final vote denied →
  appeal reversed → re-reviewed in `reversed` → the next final vote waits); a reversed `-239` refusal reaching the final vote (never waits); an
  escalation resolved then voted (two rows); R9 votes cast before / after a warning appears, revised (history kept), finalized; D27 with and
  without warnings; a reason replaced between read and write (Trap 11); concealment + warning at the final vote (Trap 3); ⭐ (`-279`) the
  Pariwar Admin's own late reason ⛔ not clearing their own vote, another holder's clearing it (A1); R9 from `verification_in_progress` —
  votes over the 90-day key only, then a post-death key ⇒ finalize 409 per vote, revise ⇒ finalized (A2); a stale determination ⇒ the bulk
  reader says awaiting (Trap 13); the correction queue's `lateWarningAwaitingReason` on and off (EA10). Seed dates per 6.23a Trap 5. ⚠ ⛔ No
  TRUNCATE of a parent reaching `claim_warning_approvals` (6.23a's Testing note).
- **Policy:** the widened record table (AC1).
- **API:** the 409 codes and `details` through each of the five routes; the D27 note encrypted (⛔ not the constant) when warned; the read DTOs.
- **Bulk:** a statement-count test on `getCycleFreezePending` with 1 vs 10 warned claims — ⛔ no growth (6.20's real-statement pattern).
- **Contracts:** the new optional fields' `superRefine` rules and the shape tests.
- **Admin (RTL):** each surface — the line, the picker (label, when to use, added by / on), the note required, *"waits for the District
  Admin"* disabling Approve with words, the error words.
- **Unchanged (run unmodified):** every deny / route / return / closure / keep spec; `permissions.test.ts` (6.23a's 51 / 65);
  `dpdpa-consent-events.test.ts` (35).

### Previous-story intelligence
- **6.23a** — the module, the keys, the record, the list, the picker, NW14, NW18; its Traps 2 (gate order), 5 (date-bomb fixtures), 13
  (coverage is the District Admin's rows only), 16 (a replaced reason).
- **6.18** — P3 is *"THE MOST LOAD-BEARING OF THE THREE GATES"* (its own comment): every reversal and post-approval correction passes it.
- **6.19c** — the T10 seam (`ClaimApprovalGateOptions`) waives the name check ONLY; the `-273` §10 closure reasons are a CHECK.
- **6.13 / 6.14** — the D-F presence rule; R9 votes are revisable until finalize; finalize locks live votes `FOR UPDATE` in `vote_id` order.

### References
- `.decision-log.md` — ⭐ `-280` · ⭐ `-279` A1–A5, A10 · ⭐ `-278` EA1–EA9 · ⭐ `-277` Q2, Q3 (readings — one Q3 clause superseded by `-279` A5; BigDev's confirmation; Consequences 1–2) · `-264` FQ12 (heading), not-cover · `-262` FQ5
  (row 6-24's wait) · `-263` FQ9 (row 6-26's gate) · `-226` cl.7 · `-251` · `-273` §10.
- `6-23-post-death-nominee-change-warnings.md` (Story 6.23a — NW1, NW5, NW13–NW18, Traps 2, 5, 13, 16).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-04-6-23-warnings-confirms.md` (✅ ruled).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- (create-story, 2026-10-04) Written at the split of row `6-23` (BigDev: *"ok, split it"*), after `-277`. ⛔ No code; status `backlog` until 6.23a is `done` (the 6.21b precedent).

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-04 | **Created at the split** of row `6-23` from `-277` Q2 C and Q3 B (DR + KB; our reading B for Q2 ⛔ not taken; BigDev confirmed the broad "every approver" reading). Traced at `2059482b`: the five approver writers, the trustee presence rule (Trap 2), the D27 approve's empty request + fixed rationale (Trap 4), 0131's closure-reason CHECK (Trap 5), the bulk lists (Trap 8). EA1–EA9 ⏳ PROPOSED (committed by `-278` in 6.23a's Task 0). Status **`backlog`** until 6.23a is `done`. *(Kept in git.)* |
| v1.1 | 2026-10-04 | ⭐ **Follows 6.23a v2.1's REASON LIST** (BigDev, 2026-10-04): every later approver picks from the SAME Pariwar list (generic + the Super Admin's replace-only entries, each showing who added it and when to use it) and leaves a row in 6.23a's `claim_warning_approvals`. ⇒ EA1 is now the record's LATER steps (⛔ no trustee enum value, ⛔ no R9 reason column — v1.0's EA1 / EA5 migrations dropped); Trap 3's concealment clash dissolves (the trustee `reason_code` stays free); NEW EA8 (notes ⛔ never replaced — ⛔ no revise path exists for later approvers; R9's pre-finalize revisability kept, history intact, BigDev accepted); Traps 10 (the CHECK widening) and 11 (a replaced reason) new. Status stays **`backlog`**. |
| **v1.2** | **2026-10-04** | ⭐ **Follows 6.23a v2.2's validate** (fresh context, at `a55480a8`). The wait holds in `reversed` (6.23a fact 3 — a District Admin approval survives a denied final vote and an appeal reversal) — EA2 and an AC2 arm; *"reversed"* in AC2's never-waits list now reads *"refused by the District Admin and then reversed"*; the "no correction needed" note is new (the Q2 row — `-278` corrects `-277`'s reading); `castR9Vote` takes ⛔ no claim-row lock (Trap 6); the import direction (Trap 7); 6.23a's nullable `verifier_decision_id` and jsonb UPDATE guard (Trap 10); `writeApprovalChain` already returns its `decisionId` (EA6, Task 5); `r9-voting.test.ts` (Task 6); EA1's migration is **0144**; error / helper names follow 6.23a (`WarningReasonUngroundedError`, `lockActiveApprovalWarningReason`). Status stays **`backlog`**. |
| **v1.3** | **2026-10-04** | ⭐ **`-278` COMMITTED** (`a125a59d`) — EA1–EA9 as written in v1.2. ⛔ No design change. Status stays **`backlog`**. |
| **v1.4** | **2026-10-04** | ⭐ **Follows the second fresh-context validate of the set** (6.23a v2.4; three read-only verifiers; BigDev: *"All"*, *"Not the final approver"*, *"Correction queue, in 6.23b"*) — decision changes by author-commit **`-279`**. HIGH: R9 finalize checks each live approve vote's row covers EVERY current key, ⛔ not that a row exists (EA5, Trap 6, AC5 — `-279` A2; found by two verifiers independently). MEDIUM: the wait does ⛔ not count a late reason recorded by the approving actor — `approvingActorIds` on the gate's options seam (EA2, AC2 — A1); the District Admin's correction queue lists a waiting claim (NEW EA10, AC10, Task 10 — A4); `-277`'s *"R9 or an appeal reversal has none"* clause superseded (Q3 row — A5); `ClosureColumn.tsx` dropped and the closure-request `closure-approve` named as a refusal path that ⛔ never carries the picker (Trap 12, EA7, AC7); the bulk reader's out-of-date rule (Trap 13 — A3). LOW: `super_admin_approval` carries `trustee_decision_id` too (EA1 — A10); four translators, ⛔ not five (Trap 7, Task 7); ⛔ no contracts test pins the request shapes (Task 6); D27's `note` ⇔ code pairing and R9's first `superRefine` (EA5, EA6, AC5, AC6); the admin client + hooks (Task 8); the TRUNCATE note. ⭐ **Then the fresh-context RE-VALIDATE of `-279`** (before insertion): the 409 carries `own_reason_excluded` and names who can answer (6.23a's NW14 now judges `nothing_uncovered` for the recorder); the R9 panel's flag also excludes every live approve voter; EA10's TIGHT superset arm (a determination decided after the approval), the post-filter's THIRD arm and the module header; the inner helper's `Pick` and the T10 seam test; `voterActorId` on finalize's vote select; A7 withdrawn; AC5's first arm reworded. ⭐ **A third round** found an R9 approval from `state_trustee_approved` could stall under A1 (its voters are the late-reason recorders, and NW14 refused there) ⇒ `-280` adds that state to NW14 (AC2 arm); Task 10 names the header amendment and the hidden actions. ⭐ **Round 4: ⛔ no BLOCKER or HIGH** — the 409's words now exclude live R9 approve voters, and the all-voters R9 residual is recorded (Task 9); AC0's parenthetical placed after `-279`. Status stays **`backlog`**. |
| **v1.5** | **2026-10-04** | **Merged as PR #253 (rebase), docs only.** Every branch SHA this file cites is mapped to its `main` twin in the header note (all 11 commits, proved by identical `patch-id`); ⛔ no citation rewritten. Status stays **`backlog`**. |
