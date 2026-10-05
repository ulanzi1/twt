---
baseline_commit: b41ea25f
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
BASELINE — RE-PINNED 2026-10-05 to `b41ea25f` on `main` (`bmad-create-story 6.23b`, after Story 6.23a went `done` and merged as PR #255).
The v1.x pin `2059482b` is an ancestor of `b41ea25f`; `git diff --name-only 2059482b..b41ea25f -- packages apps scripts` = 6.23a's build
ONLY (81 files) + `scripts/claim-adjudication-human-actor-invariant/check.ts`. Two facts kept apart, as always:
  · DURABLE — the pin `b41ea25f` is an ancestor of HEAD (`git merge-base --is-ancestor b41ea25f HEAD`).
  · PERISHABLE — every code claim below was RE-DERIVED against `b41ea25f` on 2026-10-05 (each function opened, each `file:NNN` read with
    `sed -n`). ⚠ Before Task 1, run `git diff --name-only b41ea25f..HEAD -- packages apps scripts`; any cited file in that list is re-read.

STATUS: `ready-for-dev` (6.23a is `done` — the 6.21b precedent: the row flips when its sibling is `done`).

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / don't / nowhere); `⭐` =
key fact or action; `⚠` = hazard. Doubling is volume only. ⭐ Sweep: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
⭐ The ONE glyph exception: a `⛔` inside a verbatim quotation of code (a doc-block quoted in a Trap) belongs to the quote.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — every
prepend rots them). Cite decisions by id + item, `deferred-work.md` by its section heading, `sprint-status.yaml` by row key. `file:NNN` is
used ONLY for code, as of `b41ea25f`; function names are the stable handle.
LETTERS: `EA1`…`EA10` are THIS story's author decisions (`-278` EA1–EA9; `-279` amends EA1, EA2, EA5 and adds EA10; `-280` adds
`state_trustee_approved` to 6.23a NW14's states). `NW*` = Story 6.23a's. `RD1`…`RD16` (v2.0) are FOUND facts from re-deriving against
6.23a's shipped build — ⛔ none is a decision; each says what it changes in the build. Rulings are cited by id + item (`-277` Q2, Q3).
-->

# Story 6.23b: Every Approver Picks a Reason and Writes a Note While a Warning Shows — and a Late Warning Waits for the District Admin `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Trustee Panel ruled that **every approver** — not only the District Admin — gives a
> reason and a note while a nominee-change warning shows, *"also after an appeal and in the R9 vote … even where written reasons already
> exist"* (`2026-10-04-277` Q2 C; our reading B ⛔ not taken). And a warning that **appears after** the District Admin approved makes the
> **final approval wait** until the District Admin records a reason and a note for it (`-277` Q3 B) — ⛔ never a refusal. Story 6.23a
> (**`done`**, PR #255) built the warnings, the Pariwar's **reason list** (one built-in generic + the Super Admin's replace-only entries,
> each showing who added it and when to use it), the District Admin's rule, the **record** of every approval over a warning, and the District
> Admin's late reason. **This story makes every LATER approver pick from the SAME list, write a note, and leave a record — and makes the
> final approval wait.**
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

> ✅ **6.23a is `done`** (row `6-23-post-death-nominee-change-warnings`; merged as PR #255). This story CALLS its module —
> `readClaimApprovalWarnings`, `assertApprovalReasonCoversWarnings`, `uncoveredKeys`, `lockActiveApprovalWarningReason`,
> `insertClaimWarningApprovalRecord`, `listApprovalWarningReasons` — writes rows into its record table (`claim_warning_approvals`) and mounts
> its shared picker (`ApprovalWarningReasonPicker`). Re-implement ⛔ none of it. ⭐ It ADDS `readClaimApprovalWarningsBulk`,
> `assertLateWarningsCovered` and `readR9VoteWarningCoverage` to `claim/approval-warnings.ts`, and WIDENS three things 6.23a left for it:
> the record's `step` CHECK (EA1), `insertClaimWarningApprovalRecord`'s input (RD2) and `uncoveredKeys`' actor exclusion (RD3).
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
   row into 6.23a's record — ⛔ never a second copy of the rule, ⛔ never a vocabulary of its own, ⛔ never a second derivation of the warnings
   (the bulk reader reuses 6.23a's pure `deriveClaimApprovalWarnings` — RD9).
3. **ONE gate for the wait.** The wait is a conjunct of `assertClaimApprovable`, so it reaches every final approval BY CONSTRUCTION — the
   gate's own doc-block: *"every OTHER conjunct here … and whatever conjunct is added later — still refuses it"* (the `-251` waiver covers the
   name check only — Trap 17).
4. **A refusal is ⛔ never gated** — nor an escalation, a route to R9, a return for correction, a Super Admin refusal or closure, or a deny vote.
   ⭐ That includes a warnings read that FAILS: it disables Approve only (Trap 15).
5. **Every approver SEES the warnings and the reasons (with who added each) before the approve control** — BigDev's (b): approvers learn from
   the list; and a reason demanded about something the screen does ⛔ not show is a 409 training staff to read governance as a glitch. ⭐ That
   includes an R9 vote that has fallen out of date (RD11).
6. **⛔ No name of a member is compared; ⛔ no new decrypt; a note is ⛔ never replaced** (6.23a invariants 6, 7, 9).
7. **An unknown is ⛔ never shown as "no warnings"** (6.23a's console precedent, `assembleApprovalWarnings`): a read that could ⛔ not be made
   says so, with Approve disabled in its own words.

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS conjuncts to every later approval of a death claim** — a listed reason and a note while a warning shows — **and a WAIT at
the final approval** while a warning that appeared after the District Admin's approval is unanswered.

**The sentence, in the member's terms (ours, for the Panel to correct):** *"If your nominee is changed on or after the day you die, or named
or changed in the 90 days before your family's claim is filed, every person who approves your family's claim must write down why. If such a
change only comes to light after the District Admin has approved, the claim waits until the District Admin has written down why too. Your
family's claim is never refused because of it."*

**Checked against the Niyamavali? ⭐ Yes — silent** (§6.2 *"the Trust verifies … the claimant's entitlement"*; nothing on approval notes;
the agent-drafted reference binds nothing — [[feedback_niyamavali_rulebook_not_spec]]). ⭐ **Checked against `-277` Q2 / Q3 and `-264` FQ12:
matches as ruled**; the scope of "every approver" is `-277`'s reading, confirmed by BigDev. ⭐ v2.0 re-checked: ⛔ no predicate is added or
changed beyond `-278` / `-279` / `-280` — RD1–RD16 change the build's mechanics, ⛔ never who may approve or when.

## ⭐ v2.0 — WHAT RE-DERIVING AGAINST 6.23a's SHIPPED BUILD CHANGED (RD1–RD16; FOUND, ⛔ not decided)

v1.4 was traced at `2059482b`, before 6.23a existed; 6.23a then went through four review rounds. Each item below is a fact in the code at
`b41ea25f` and what it changes here. ⛔ None moves a decision; each is threaded into the Traps, EAs, ACs and Tasks below.

- **RD1 — 0143's FKs are COMPOSITE `(pariwar_id, …)`** (6.23a code review round 1: a single-column FK bypasses RLS, so a row could point at
  another Pariwar's claim). 0143 added `claims_pariwar_claim_case_uq` and `claim_verifier_decisions_pariwar_decision_uq` as FK targets. ⇒
  EA1's three new FKs are composite too, and 0144 adds three UNIQUE targets: `(pariwar_id, decision_id)` on `claim_state_trustee_decisions`,
  `(pariwar_id, vote_id)` on `claim_r9_votes`, `(pariwar_id, closure_id)` on `claim_correction_closures` — each mirrored by a Drizzle
  `unique()` in its schema file (`schema/claim_state_trustee_decisions.ts`, `schema/claim_r9_votes.ts`, `schema/claim_correction_closure.ts`
  — ⚠ singular file name), as 0143 did in `schema/claims.ts` / `schema/claim_verifier_decisions.ts` (Trap 10).
- **RD2 — `insertClaimWarningApprovalRecord` REQUIRES `verifierDecisionId`** (`approval-warnings.ts`). ⇒ its input becomes a union
  discriminated by `step`: the `district_admin_*` arm keeps `verifierDecisionId` (both 6.23a callers compile unchanged); `escalation_resolution`
  / `final_vote` / `no_correction_approval` carry `trusteeDecisionId`; `r9_vote` carries `r9VoteId`; `super_admin_approval` carries
  `closureId` AND `trusteeDecisionId`. `noteCiphertext` stays `null` on every later step (0143's step ⇔ note CHECK).
- **RD3 — `uncoveredKeys`' exclusion is ONE actor** (`opts.excludeLateReasonsRecordedBy?: string` — built for this story). P4 excludes the
  finalizer AND every live approve voter ⇒ widen it to `string | readonly string[]` (the shipped tests pass a string —
  `tests/claim/approval-warnings.test.ts`, `tests/integration/claim/approval-warnings.spec.ts` — keep them green unmodified).
- **RD4 — the wire is snake_case; 6.23a's option DTO is camelCase.** `CycleFreezePendingItem`, `R9PanelResponse` / `R9PanelVote`,
  `PariwarClosureQueueItemDto`, `EscalatedClosureDetailResponse` and `ClaimUnderCorrectionItem` are all snake_case ⇒ the new fields are
  `approval_warnings` (with snake fields — EA7), `reason_options`, `covers_current_warnings`, `late_warning_awaiting_reason`,
  `late_warning_uncovered_count`. `ApprovalWarningReasonOption` (`contracts/src/claims/verification-decision.ts`) is camelCase
  (`reasonId`, `addedByDisplay`, `addedAt` — an ISO string) — reuse it UNCHANGED, ⛔ never a snake twin. The domain rows stay camelCase
  ([[feedback_story_validate_footguns]] #1).
- **RD5 — every R9 route code is `r9_voting.*`** (25 codes in `claims.r9-voting.handlers.ts`; ⛔ none is `r9.*`). `-279` A2 wrote the refusal
  as `r9.approve_votes_need_warning_reason` — a string slip against the live prefix ⇒ the code is **`r9_voting.approve_votes_need_warning_reason`**.
  ⛔ No design change (A2's substance stands). An erratum line in the log is BigDev's option, ⛔ not owed.
- **RD6 — `cycle-freeze/` and `r9-voting/` have ⛔ no `i18n-en.ts`.** Both import shared words from `claim-verification/` (`verifierConsoleEn`,
  and the suffix matchers in `claim-verification/nominee-errors.ts` — `error.code.endsWith('.death_certificate_acceptance_required')` …). ⇒
  the shared warning words go into `verifierConsoleEn.approvalWarnings` (`claim-verification/i18n-en.ts` — 6.23a's block: `kindLine`,
  `pickerLabel`, `errors.*` …) and one message helper per new suffix into `nominee-errors.ts`; `correction-closure/` has its own `i18n-en.ts`
  for D27's note label, and its `closureErrorText` (`correction-closure/errors.ts`) already shows the server's words for any `closure.*` code.
- **RD7 — `correction-closure-shape.spec.ts` pins the EXACT keys** of `listPariwarClosureQueue` items, `listEscalatedClosures` items and
  `readEscalatedClosureDetail` (`Object.keys(...).sort()`); `getCycleFreezePending` is also read by the Trustee-Lite dashboard
  (`apps/api/src/modules/trustee-lite/handlers.ts` — a read-only summary; `TrusteeLitePage.tsx` has ⛔ no approve control). ⇒ the warnings
  attach at the API HANDLER, after the domain
  read, in the same request transaction — the domain readers, their shape pins and Trustee-Lite stay UNCHANGED (Trap 14).
- **RD8 — the R9 panel and the Super Admin's detail are ONE claim each** (`getR9Panel(db, pariwarId, claimCaseId)`,
  `readEscalatedClosureDetail(…, claimCaseId)`) ⇒ they use the per-claim `readClaimApprovalWarnings`; the BULK reader serves the three LISTS
  only — the cycle-freeze pending buckets, the "no correction needed" queue and the District Admin's correction queue (Trap 8).
- **RD9 — 6.23a left the bulk reader's half ready:** `deriveClaimApprovalWarnings` (module-private, *"The pure half of the read (6.23b's bulk
  form reuses it)"*). ⇒ `readClaimApprovalWarningsBulk` runs ONE statement returning one `RawWarningsRow` per claim (per-claim `LATERAL`
  subqueries over `claim_case_id = ANY($ids)`; raw SQL with explicit aliases — ⛔ never a Drizzle correlated subquery,
  [[project_epic6_drizzle_correlated_subquery_bug]]) and maps each through the SAME `deriveClaimApprovalWarnings`; the reasons are read ONCE
  for the response (the active list does ⛔ not vary by claim).
- **RD10 — the R9 per-vote coverage needs rows 6.23a's reader never selects.** `readClaimApprovalWarnings` aggregates
  `DISTRICT_ADMIN_WARNING_STEPS` rows only (correctly — Trap 13 of 6.23a). ⇒ NEW leaf read `readR9VoteWarningCoverage(db, pariwarId,
  voteIds)` → `Map<voteId, coveredKeys[]>` over `step = 'r9_vote'` rows, used by `finalizeR9Outcome` AND by the panel (RD11).
- **RD11 — the R9 panel must show an out-of-date approve vote BEFORE finalize** (invariant 5; `-279` A2's 409 otherwise lands on a
  step-up-attested finalize with ⛔ nothing on screen to explain it). ⇒ `R9PanelVote` gains `covers_current_warnings: boolean | null`
  (`null` on a deny vote, or while ⛔ no warning shows), and the panel says which approve votes must be revised.
- **RD12 — 6.23a's fail-closed shape** (`assembleApprovalWarnings` in `claims.verifier-console.handlers.ts`): a throw ⇒ `available: false`,
  Approve disabled with its own words, ⛔ never "no warnings"; it runs LAST so a SQL throw cannot abort the scope transaction under a later read
  (or under a raw SAVEPOINT — the 6.23a timeline-anchor precedent in `claims.nominee-declaration.handlers.ts`). ⇒ every 6.23b surface carries
  `available` and fails the same way (Trap 15); the correction queue's late-warning arm runs under a raw SAVEPOINT (EA10).
- **RD13 — a `deferred-work.md` item names THIS story as its trigger** (section *"Recorded during Story 6.23a"*): *"The Pariwar Admin sees the
  raw `verifier_reason_code` on `PendingCaseCard.tsx:216` … Trigger: Story 6.23b, which mounts the warning-reason picker on that card and
  reads the reason next to it."* The words exist: `verifierConsoleEn.reasonCodes` (`claim-verification/i18n-en.ts`, used by
  `ReasonCodeDropdown.tsx`). ⇒ NEW AC11 / Task 8: render the label (falling back to the code for an unknown one) and close the item in place.
- **RD14 — another `deferred-work.md` trigger 0144 must ⛔ not fire:** *"`closeScopeTx` swallows every COMMIT error"* (section *"Deferred from:
  code review of 6-23-…, round 3 chunk 1"*) triggers on *"the next migration that adds a deferred constraint"*. ⇒ 0144 adds ⛔ no `DEFERRABLE`
  constraint or constraint trigger (Trap 10).
- **RD15 — 6.23a's audit convention** (code review round 3): `approval_warning_kinds` is OMITTED when the kinds are ⛔ not known at a refusal —
  ⛔ never `[]`, which reads as "no warning showed"; `warning_reason_code` is carried on the approve, on `…warning_reason_required`, and on
  `…warning_reason_unavailable` (the code the actor submitted). ⇒ EA9's audit lines follow it exactly.
- **RD16 — the `-251` waived approve is a seventh path through the wait**, ⛔ not an exception to it: `decideEscalatedClosure` calls
  `assertClaimApprovable(…, { nameCheck: 'waived_251' })`, which waives the name check ONLY ⇒ it waits too (Trap 17), and the rewritten T10
  seam test proves it.

## ⚠ THE TRAPS

**Trap 1 — `resolveEscalation` runs ⛔ no approval gate,** so at an escalation's approval the `post_death_version` derivation is ⛔ not
guaranteed exact (6.23a Trap 2: it needs a current determination). ⇒ the rule there uses `readClaimApprovalWarnings` as it stands
(`post_death_version` only from a live, CURRENT determination — else `postDeath: 'awaiting_determination'` and only the 90-day keys) — safe,
because the claim **still goes to the final vote**, where the gate runs and EA4 asks again with exact warnings (Q2 C: *"even where written
reasons already exist"*). Do ⛔ not add the full gate to `resolveEscalation` — it would refuse an escalation for a claim whose accounts are not
yet collected, which `-226` cl.7 forbids (the gate's own doc-block, `nominee-name-check.ts:356`: *"⛔ `resolveEscalation` is NOT gated
separately"*). ⭐ `resolveEscalation` SUPERSEDES the live `escalated` verifier decision (`state-trustee-decision-persist.ts`, the
`liveEscalated` supersession) ⇒ after it there is ⛔ no live District Admin approval and EA2 is vacuous for that claim (AC2's never-waits arm).

**Trap 2 — the cycle-freeze card sends ⛔ no reason on Approve, by design — and the trustee presence rule must stay.** `PendingCaseCard.tsx`
builds the approve body *"WITHOUT"* a reason code or rationale (`:110-114`), and an ordinary trustee approve takes ⛔ no code
(`trusteeReasonCodeRequiredForOutcome('approved')` is false — `claim/state-trustee-decision.ts`). ⇒ the warning reason rides a SEPARATE
optional field, `warning_reason_code` — ⛔ never the trustee `reason_code` — and the rationale becomes required only when that field is sent;
⛔ never flip the presence rule, or every un-warned approve would 400. ⭐ The card's warned approve body is `{ claim_case_id, action,
[escalation_outcome], warning_reason_code, rationale }` — still ⛔ no `reason_code`; an un-warned approve body is byte-identical to today's.

**Trap 3 — the concealment override is ⛔ no longer in the way.** A concealment-flagged claim that also shows a warning can carry BOTH: the
trustee `reason_code` stays free for `concealment_override` (and its R14 snapshot, `resolveConcealmentSnapshot`), while the warning reason is
its own field and its own record row. ⭐ ONE rationale serves both (the contract already requires it for `concealment_override`). Do ⛔ not
merge the two fields. ⚠ The card never sends `concealment_override` on Approve (Trap 2) — this arm is API/domain-tested (AC4).

**Trap 4 — the "no correction needed" approve has ⛔ no note today.** `NoCorrectionNeededApproveRequest` is `z.object({}).strict()`
(`packages/contracts/src/claims/correction-closure.ts:178`) and the handler encrypts a FIXED constant (`NO_CORRECTION_NEEDED_DECISION_RATIONALE`,
`claims.correction-closure.handlers.ts:90`) BEFORE the transaction (`:528-532`) as the decision's rationale. ⇒ while a warning shows the
request must carry the Pariwar Admin's own `note` and `warning_reason_code`, and THAT note is encrypted instead (the same
`encryptTrusteeRationale`, the same field class); with ⛔ no warning the constant stays (⛔ never make the note required for every approve —
the Panel ruled only the warned case). ⚠ `NoCorrectionStrip` (`PariwarClosureStrip.tsx:152`) already has a note `<textarea>` — it belongs to
**Keep** (`no-correction-keep-note`); the approve's note is its OWN field, ⛔ never the keep note reused.

**Trap 5 — the Super Admin's closure reason is a 0131 CHECK; do ⛔ not widen it.** `CLOSURE_SUPER_ADMIN_REASONS.approved` is pinned by
`claim_correction_closures_super_admin_decision_check` (migration 0131), a state-coherence CHECK. ⇒ the warning reason rides the separate
`warning_reason_code` field and the record row — ⛔ never a new closure reason.

**Trap 6 — an R9 approve vote can be cast BEFORE a warning exists, and votes are revisable until finalize (6.14).** ⇒ the vote-time check is
best-effort (the reader's warnings, inexact like Trap 1; and `castR9Vote` takes ⛔ no claim-row lock, so a certificate re-review can commit
between the read and the vote) and the binding check is at `finalizeR9Outcome` (after its gate — exact): **each** LIVE approve vote's own
`r9_vote` record row must cover EVERY current key (RD10's `readR9VoteWarningCoverage`, then `uncoveredKeys`-style set difference against
that row's `covered_keys`) — ⛔ never merely "a row exists" — else a typed 409 naming the vote ids, and the voters revise (`-279` A2). ⚠ Why
per key: R9 can run from `verification_in_progress` / `verifier_review` (`R9_OUTCOME_FROM_STATES`, `state.ts:78-85`), where ⛔ no District
Admin approval exists and EA2 is vacuous — votes cast before the determination cover only the 90-day keys, and the post-death keys would
otherwise pass unanswered. ⚠ A panel member who cannot be reached holds the approval until the session is cancelled and reopened — stated,
⛔ not solved. ⚠ A revised vote is a NEW vote row with its OWN record row; the earlier vote, its note and its record row stay (history —
BigDev accepted R9's revisability, 2026-10-04). A deny vote ⛔ never needs a reason; a reason on a vote with ⛔ no warning is refused
(ungrounded — the 6.23a precedent).

**Trap 7 — the wait reaches SEVEN gate calls through ONE conjunct, and each caller maps its own errors.** `assertClaimApprovable`'s callers at
`b41ea25f`: `adjudicateClaim` (`verifier-decision-persist.ts:407`, P1 — vacuous: ⛔ no live approved decision exists while approving),
`voteOnFrozenClaim` (`state-trustee-decision-persist.ts:572`, P3), `finalizeR9Outcome` (`r9-voting-persist.ts:623`, P4) and 6.19c's three in
`correction-closure.ts` — `decideEscalatedClosure` `:1347` (the `-251` waived call — Trap 17) and `:1357`, `approveNoCorrectionNeeded` `:1507`.
⇒ map `LateWarningReasonRequiredError` in EVERY translator on a route that reaches them — FOUR translators across five handler files:
`translateDecisionError` (`claims.verification-decision.handlers.ts` — defensive, P1 is vacuous), `translateCycleFreezeError`
(`claims.cycle-freeze.handlers.ts:58`), the R9 translator (`claims.r9-voting.handlers.ts`), and `translateClosureError`
(`claims.correction-closure.handlers.ts:183`), which `claims.correction-escalation.handlers.ts` imports (`:43`) and calls — map it ONCE there.
Every translator ends `throw err`, so an unmapped typed error is a 500. Codes follow each route's prefix: `verifier_decision.`, `cycle_freeze.`,
`r9_voting.` (RD5), `closure.`. ⭐ Each caller passes its **approving actors** on the gate's options (EA2, `-279` A1). ⚠
`isReturnedClaimResubmitted` and `readNomineeNameCheckApprovalState` call the INNER helper — ⛔ never route them through the outer one (6.21a
T4). ⚠⚠ **The import direction:** EA2 makes `nominee-name-check.ts` import `approval-warnings.ts`; 6.23a NW1 forbids the reverse (and anything
that reaches `nominee-name-check.ts`, `events.ts` or `nominee-lock.ts`) — a cycle is a runtime TDZ that typecheck cannot see
([[project_type_only_import_cycle_trap]]). 6.23a's TRANSITIVE source-scan test must stay green: RD10's new read imports only `../schema/*`
and `../db.js`. ⚠ **Two error names one word apart:** 6.23a's `LateWarningReasonRefusedError` (NW14 — why a late reason cannot be RECORDED)
and this story's `LateWarningReasonRequiredError` (the WAIT — an approval held for one). ⛔ Never map one for the other.

**Trap 8 — the list surfaces are BULK; the single-claim surfaces are ⛔ not.** `getCycleFreezePending` (`claim/cycle-freeze-read.ts`) already
batches concealment and name-check flags (*"NO per-claim call in a loop"*); `listPariwarClosureQueue` (`claim/correction-closure-read.ts`) and
`listClaimsUnderCorrection` list many claims too. ⇒ `readClaimApprovalWarningsBulk` in ONE statement for those three, and the reason options
read ONCE per response — ⛔ never the per-claim reader in a loop. The R9 panel and the Super Admin's detail are one claim each (RD8) — the
per-claim reader, ⛔ not the bulk one.

**Trap 9 — sequencing.** Rows **6-24** (`-262` FQ5: the true nominee's claim waits at final approval for the appeal) and **6-26** (`-263`
FQ9: no approval before a completed inspection — a conjunct INSIDE `assertClaimApprovable`) touch the same gate and the same writers
(`-277` Consequence 2) — both `backlog` at `b41ea25f`. ⇒ whichever lands second rebases onto the other; ⛔ none drops another's check. Rows
`6-26` / `6-27` owe `-279` A6's decision before extending `APPROVAL_WARNING_KINDS` (6.23a's pin test says so).

**Trap 10 — widening the record is a migration with THREE lockstep copies and composite FKs.** At `b41ea25f`: 0143's `step` CHECK lists two
values; `claim_warning_approvals_step_decision_check` is `(left(step, 15) = 'district_admin_') = (verifier_decision_id IS NOT NULL)` — it
ALREADY holds for every later step (⛔ not prefixed ⇒ `verifier_decision_id` NULL) and stays UNCHANGED; `…_step_note_check` likewise holds
(later steps carry ⛔ no note). ⇒ **0144** (next free; journal `idx` 144 after 0143's `when` `1793072400000`): (a) drop and re-add ONLY the
`step` CHECK with seven values; (b) three nullable columns `trustee_decision_id`, `r9_vote_id`, `closure_id`; (c) three UNIQUE targets (RD1)
and three COMPOSITE FKs `(pariwar_id, x)` → each parent, `ON DELETE CASCADE` (the 0143 reasoning: ⛔ `set null` is an UPDATE the trigger
refuses; ⛔ `restrict` breaks the `claims` cascade); (d) a NEW `claim_warning_approvals_later_step_fk_check` — exactly the step's own FK set
(`escalation_resolution` / `final_vote` / `no_correction_approval`: `trustee_decision_id` only; `r9_vote`: `r9_vote_id` only;
`super_admin_approval`: `closure_id` AND `trustee_decision_id`; the two `district_admin_*` steps: ⛔ none of the three); (e) an index per new
FK column. The THREE copies of the step list move in ONE commit: the migration CHECK, `CLAIM_WARNING_APPROVAL_STEPS` (+ the Drizzle `check()`)
in `schema/claim_warning_approvals.ts`, and the contracts mirror (`contracts/src/claims/verification-decision.ts`) — pinned by the DB ↔ TS
test (`tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts`, *"DB ↔ TS lockstep: the `step` values"*) and the contracts ↔
domain test (`contracts/tests/claims-verifier-decision.test.ts`, `CLAIM_WARNING_APPROVAL_STEPS`). `DISTRICT_ADMIN_WARNING_STEPS` is ⛔ never
widened (it is what keeps later rows out of the District Admin's coverage). ⚠ 6.23a's UPDATE guard compares `to_jsonb(NEW) - 'note_ciphertext'`,
so the new columns are append-only with ⛔ no trigger edit — prove it (AC1); the cascade exception (`pg_trigger_depth() > 1`) covers the new
parents too. ⚠ ⛔ No `DEFERRABLE` constraint (RD14). Hand-authored, statement order as 0143 (CREATE/ALTER → FKs → CHECKs → indexes); ⛔ never
regenerate an applied migration; apply it to BOTH :5432 and :5433 ([[project_live_db_test_gotchas]]).

**Trap 11 — a reason can be replaced between the page load and the submit** (6.23a Trap 16). Every later writer re-validates the chosen code
against the ACTIVE list in its own transaction through `lockActiveApprovalWarningReason` (`FOR SHARE`) ⇒ 409 `<prefix>.warning_reason_unavailable`,
⛔ never silently mapped to its replacement.

**Trap 12 — `PariwarClosureStrip.tsx` has TWO "approve"s, and only ONE is an approval of the claim.** `NoCorrectionStrip` (`:152`;
`useApproveNoCorrectionNeeded` `:153`, `data-testid="no-correction-approve"` `:204`) approves the claim — it gets the picker and the note.
`ClosureRequestStrip` (`:38`, `data-testid="closure-approve"` `:127`) decides a CLOSURE REQUEST — the 6.19c D1 closure, which ends the claim
in `denied_no_appeal` ⇒ a refusal path, and putting the picker on it would gate a refusal (invariant 4). ⛔ Never mount the picker there. ⚠
`ClosureColumn.tsx` makes ⛔ no decision at all (its header: *"⛔ No decision is made here"*) — ⛔ not an EA7 surface.

**Trap 13 — the bulk reader inherits 6.23a's out-of-date rule.** A re-reviewed certificate leaves the determination live but stale; 6.23a's
reader reports `awaiting_determination` then (6.23a NW2, `-279` A3) ⇒ the bulk form does the SAME comparison in its one statement (it reuses
`deriveClaimApprovalWarnings` — RD9), so the *"waits for the District Admin"* line and the vote-time R9 check ⛔ never use the old date. ⭐ A
parity test runs BOTH readers over DIRTY input (a stale determination, ⛔ no certificate, a released earlier claim, a vacated version) and
asserts equal results ([[feedback_story_validate_footguns]] #26).

**Trap 14 — shape pins and strict fixtures.** (a) `packages/domain/tests/integration/claim/correction-closure-shape.spec.ts` pins exact keys
⇒ attach at the handler (RD7) and leave it green UNMODIFIED. (b) The admin client PARSES every response (`apiFetch` → `schema.parse`,
`apps/admin/src/api/client.ts`) against `.strict()` DTOs ⇒ every hand-built fixture of a widened DTO must carry the new required fields:
`apps/admin/tests/cycle-freeze-page.test.tsx`, `pending-case-card-return.test.tsx`, `r9-case-panel.test.tsx`, `correction-closure.test.tsx`,
`correction-queue.test.tsx`, `correction-chase-forms.test.tsx` (the last two build `ClaimUnderCorrectionItem`s) — and the API specs that
`.parse` them (`apps/api/tests/integration/claims/cycle-freeze.spec.ts`, `correction-closure.spec.ts`). `git grep` the field names again
before Task 8 ([[feedback_story_validate_footguns]] #31). ⛔ Never make a new field optional to dodge a fixture.

**Trap 15 — a failed warnings read disables APPROVE only, and says so.** RD12's shape on every surface: `approval_warnings.available: false`
⇒ the Approve / Resolve → Approve / approve-vote / approve-decision control is disabled with *"The nominee-change warnings could not be read,
so approval is unavailable until they load. Reload to try again."* (6.23a's `approvalWarnings.unavailable` words — reuse them); Deny, Route
to R9, Return, Refuse, Close, Keep and a deny vote stay EXACTLY as today (invariant 4). The read runs LAST in the handler (or under a raw
SAVEPOINT) so its SQL error cannot abort the transaction under another read (a 25P02 would 500 the whole list).

**Trap 16 — the expected red set is EMPTY, so a red approve-path spec is a FINDING.** Re-verified at `b41ea25f`: the default seeded nominee
declaration is `SEEDED_NOMINEES_DECLARED_AT = 2026-01-05` (`packages/domain/tests/integration/_helpers.ts:761`; the API twin
`apps/api/tests/integration/_nominee-name-check-fixture.ts:407`), already > 90 days before any run ⇒ ⛔ no default final-vote / R9 / closure
fixture is warned, and ⛔ no shipped later-approver spec seeds a `discarded` version and approves. ⇒ if one turns red, read why (6.23a Trap 6):
send a listed reason and a rationale if it genuinely approves over a warning — ⛔ never an opt-out flag, ⛔ never a fixture date moved into the
window. New specs date a recent change RELATIVE to now (`Date.now() - 30 * DAY`) and an old one ≥ 200 days back (6.23a Trap 5).

**Trap 17 — the `-251` waived approve waits too.** `ClaimApprovalGateOptions.nameCheck: 'waived_251'` returns from the INNER helper before the
name check (`nominee-name-check.ts`, *"the ONE waiver"*) — the wait is a conjunct of the OUTER gate, after the inner helper ⇒ the waived path
reaches it BY CONSTRUCTION (the seam's own words: *"whatever conjunct is added later — still refuses it"*). ⇒ the rewritten T10 test adds a
`waived_251` arm that STILL refuses with `LateWarningReasonRequiredError`.

## ⚖️ Decisions — the AUTHOR's (✅ COMMITTED by `-278` — `a125a59d` → `main` `a785eb0a`, 2026-10-04 — with 6.23a's NW1–NW18; EA1 / EA2 / EA5 amended and EA10 added by `-279`)

⭐ The decision CONTENT below is the committed record. Lines marked **(v2.0 build)** restate HOW, after RD1–RD16 — ⛔ never what.

- **EA1 — the record's LATER steps.** Migration **0144** (Trap 10): `claim_warning_approvals.step` gains `escalation_resolution`,
  `final_vote`, `r9_vote`, `super_admin_approval`, `no_correction_approval`; three nullable FKs — `trustee_decision_id`
  (→ `claim_state_trustee_decisions`; for `escalation_resolution`, `final_vote`, `no_correction_approval`), `r9_vote_id` (→ `claim_r9_votes`),
  `closure_id` (→ `claim_correction_closures`) — `super_admin_approval` carries BOTH `closure_id` AND `trustee_decision_id`
  (`writeApprovalChain` writes a trustee decision row for that approve too, and the handler audits its `decision_id` — `-279` A10) — and a
  step ⇔ FK coherence CHECK (exactly the step's own FK set). Each new FK is `ON DELETE CASCADE`. Every later approval over a warning writes ONE
  row in its own transaction: the chosen reason (code + id, or the generic), ALL current keys, ⛔ no note (each step's note lives on its own
  decision row). These rows ⛔ never count toward the District Admin's coverage (6.23a NW13). ⛔ No trustee or R9 reason column, ⛔ no new enum
  value anywhere. **(v2.0 build)** the FKs are COMPOSITE `(pariwar_id, x)` with three new UNIQUE targets (RD1); `insertClaimWarningApprovalRecord`
  takes a step-discriminated input (RD2).
- **EA2 — the WAIT (`-277` Q3 B).** NEW `assertLateWarningsCovered(db, pariwarId, claimCaseId, approvingActorIds)` in 6.23a's module: where
  the claim's live verifier decision is `approved`, `uncoveredKeys(readClaimApprovalWarnings(…), { excludeLateReasonsRecordedBy:
  approvingActorIds })` must be empty, else `LateWarningReasonRequiredError` (in `claim/errors.ts`; → 409 `<prefix>.late_warning_reason_required`,
  `details: { kinds, uncovered_count, own_reason_excluded }`; words: *"This claim is waiting for the District Admin to record a reason for a
  warning that appeared after their approval. It is not refused."*). The **LAST** conjunct of `assertClaimApprovable` (after the name check —
  every existing refusal keeps its code and order) ⇒ P3, P4 and 6.19c's approvals by construction (Trap 7), the `-251` waived one included
  (Trap 17). ⛔ Never a refusal. ⭐ It holds in `reversed` too: a District Admin approval survives a denied final vote and an appeal reversal
  (appeals ⛔ never write `claim_verifier_decisions` — 6.23a fact 3), and the District Admin answers there through 6.23a NW14.
  ⭐⭐ **The approving actors (`-279` A1).** Coverage, as judged for an approval, does ⛔ not count any `district_admin_late_reason` row whose
  `recorded_by_actor` is one of that approval's approving actors: the final voter (P3); the finalizer AND every live approve voter (P4); the
  Super Admin (`decideEscalatedClosure`, both calls); the Pariwar Admin (`approveNoCorrectionNeeded`); the District Admin at P1 (vacuous).
  They ride the gate's existing seam: `ClaimApprovalGateOptions` gains `approvingActorIds: readonly string[]` (actor ids are plain strings in
  these writers) — **required**, so typecheck finds all seven calls; `opts` loses its `= {}` default; amend the seam's doc-block (*"OMITTED by
  every existing caller"* is no longer true) and keep `nameCheck` optional; the INNER helper `assertNomineeNameCheckForApproval(…, opts:
  ClaimApprovalGateOptions = {})` (`nominee-name-check.ts:469`) takes `Pick<ClaimApprovalGateOptions, 'nameCheck'>` so it still typechecks;
  the shipped 6.19c T10 seam test (`packages/domain/tests/integration/claim/nominee-name-check.spec.ts:715-753` — it loops `[undefined, {},
  {nameCheck:'required'}]` and calls the gate with ⛔ no options at `:753`) is rewritten to pass `approvingActorIds` (domain tests ARE
  typechecked) — and gains Trap 17's arm. When a key is uncovered ONLY because an approver's own late reason was excluded, the 409 carries
  `details.own_reason_excluded: true` and says so — *"a late reason you recorded cannot clear your own approval — someone else who can approve
  claims here (the District Admin, another Pariwar Admin or the Super Admin) and who is ⛔ not approving it themselves must record theirs"*
  (at R9: ⛔ not a live approve voter or the finalizer) — and 6.23a's NW14 lets that other person record it (its `nothing_uncovered` is judged
  for the recorder). ⚠ `district_admin_approval` rows are ⛔ not excluded (one person at P1 and P3 is today's breadth, ⛔ not this story's).
  **(v2.0 build)** `own_reason_excluded` = `uncoveredKeys(w, { exclude… }).length > uncoveredKeys(w).length`; `kinds` = the kinds of the
  uncovered keys (the key's `kind:` prefix); RD3 widens the exclusion option.
- **EA3 — the escalation resolution.** `CycleFreezeDecisionRequest` gains optional `warning_reason_code` (its `superRefine`: only when
  `effectiveOutcome(action, escalation_outcome) === 'approved'` — `approve`, or `resolve_escalation` with `escalation_outcome: 'approved'`;
  requires a non-blank rationale). In `resolveEscalation`, outcome `approved`: kinds non-empty (Trap 1) ⇒ an active reason + a rationale,
  else `ApprovalWarningReasonRequiredError` (route code `cycle_freeze.warning_reason_required`); a reason with ⛔ no warning ⇒ ungrounded;
  then the `escalation_resolution` record row (its `trustee_decision_id` = the `escalation_resolution` decision row just inserted). A denying
  resolution is ⛔ never gated. **(v2.0 build)** the read and the rule run after `resolveConcealmentSnapshot` and BEFORE the supersession of
  the `escalated` verifier decision (⛔ nothing written before a refusal); the record row after `insertTrusteeDecisionRow`.
- **EA4 — the Pariwar Admin's final vote.** In `voteOnFrozenClaim`, outcome `approved`, **after** `assertClaimApprovable` (incl. EA2) and
  `assertClaimContactRecorded`: the same rule, then the `final_vote` record row. ⭐ EVERY final approval over a warning — after a District
  Admin approval (who already wrote one), after a reversal, after an escalation — *"even where written reasons already exist"* (`-277` Q2 C).
  The trustee `reason_code` is untouched (Trap 3). **(v2.0 build)** the rule (and its `FOR SHARE` reason lock) runs right after
  `assertClaimContactRecorded`, before the freeze-open event (the first write); the record row after `insertTrusteeDecisionRow` (its FK).
- **EA5 — the R9 vote.** `R9VoteRequest` gains optional `warning_reason_code`; `castR9Vote`: an approve vote while the reader shows warnings
  needs an active reason (the note — `rationale` — is already required), and writes the `r9_vote` record row in the vote's transaction; a
  reason with ⛔ no warning ⇒ ungrounded; `R9VoteRequest` (today `.strict()` with ⛔ no `superRefine`) gains one: `warning_reason_code` is
  refused on a `deny` vote. `finalizeR9Outcome` (approved outcome, after its gate): **each** LIVE approve vote's `r9_vote` row covers EVERY
  current key, else `R9ApproveVotesNeedWarningReasonError` → 409 **`r9_voting.approve_votes_need_warning_reason`** (RD5; `details: { vote_ids,
  uncovered_count }`) (Trap 6; `-279` A2). A deny vote and a denied outcome are ⛔ never gated. **(v2.0 build)** finalize's live-vote select
  (`r9-voting-persist.ts:599-604`, today `{ voteId, vote }`) gains `voterActorId` (A1's exclusion — the approving actors are known BEFORE the
  gate runs); the per-vote check uses RD10's `readR9VoteWarningCoverage` and runs after `assertClaimContactRecorded`, before the session
  UPDATE; the panel shows the same answer per vote (RD11).
- **EA6 — 6.19c's two approvals.** (a) **Super Admin** (`decideEscalatedClosure`, approve): `EscalatedClosureDecisionRequest` gains optional
  `warning_reason_code`, required on an approve while warnings show (the note is already `RequiredNote`); then the `super_admin_approval`
  record row (`closure_id` = the held row's `closureId`, `trustee_decision_id` = `chain.decisionId`). The closure reason and the 0131 CHECK
  are untouched (Trap 5). (b) **"No correction needed"** (`approveNoCorrectionNeeded`): `NoCorrectionNeededApproveRequest` gains optional
  `warning_reason_code` and `note` — both required while warnings show, and PAIRED by a `superRefine` (`note` ⇔ `warning_reason_code`): the
  handler encrypts the rationale BEFORE the transaction (`claims.correction-closure.handlers.ts:528-532`), so the domain cannot tell the
  Pariwar Admin's note from the constant — the code's presence is the signal, and a bare `note` on an unwarned claim must ⛔ never silently
  replace the constant. The handler encrypts THAT note as `decisionRationaleCiphertext` instead of the fixed constant (Trap 4); then the
  `no_correction_approval` record row (its `trustee_decision_id` is the chain's own row — `writeApprovalChain` ALREADY returns `{ claimState,
  decisionId }`, `correction-closure.ts:667-678`; thread it, ⛔ no signature change). Refusals, closures and keeps are ⛔ never gated. **(v2.0
  build)** the domain inputs gain `warningReasonCode: string | null`; the rule's `note` argument is the rationale ciphertext WHEN a code was
  sent, else `null` (so a missing code is `missing: 'reason'` first). `refuse` / `close` with a `warning_reason_code` ⇒ 400 (the request
  `superRefine` — only `decision: 'approve'` carries it).
- **EA7 — every later surface SHOWS the warnings and the reasons.** NEW `readClaimApprovalWarningsBulk(db, pariwarId, claimCaseIds)` in
  6.23a's module (ONE statement — Trap 8; the out-of-date rule — Trap 13). Per claim, `waitingForDistrictAdmin` is judged for the VIEWER as a
  prospective approver (their own late-reason rows excluded — EA2's A1 rule, so the screen ⛔ never offers an approve that would 409; ON THE R9
  PANEL also every live approve voter's rows, matching what finalize excludes). Carried on: the cycle-freeze pending case (every bucket), the
  R9 panel, the Super Admin's detail and the "no correction needed" queue; each response carries the Pariwar's active `reason_options` ONCE
  (label, when to use, added by / on). UIs mount 6.23a's `ApprovalWarningReasonPicker`: `PendingCaseCard.tsx` (Approve `:263` and Resolve →
  Approve `:291`), `R9CasePanel.tsx` (an approve vote), `EscalationPanel.tsx` (approve), `PariwarClosureStrip.tsx` (`NoCorrectionStrip`'s
  approve ONLY, + its own note field — ⛔ never `ClosureRequestStrip`'s `closure-approve`, Trap 12). With warnings: the line, the picker (⛔
  nothing pre-selected), the note required; *"waits for the District Admin"* disables Approve with those words. ⛔ No member name, ⛔ no date.
  **(v2.0 build)** — the wire block, snake_case (RD4), `.strict()`, NEW `ApprovalWarningsSummary` in `contracts/src/claims/verification-decision.ts`
  beside 6.23a's DTOs:
  `{ available: boolean, kinds: ApprovalWarningKind[], post_death: 'evaluated' | 'awaiting_determination', waiting_for_district_admin: boolean,
  own_reason_excluded: boolean }` — on `CycleFreezePendingItem.approval_warnings`, `R9PanelResponse.approval_warnings`,
  `PariwarClosureQueueItemDto.approval_warnings` (the "no correction needed" items) and `EscalatedClosureDetailResponse.approval_warnings`;
  `reason_options: ApprovalWarningReasonOption[]` at each RESPONSE's top level (`CycleFreezePendingResponse`, `R9PanelResponse`,
  `PariwarClosureQueueResponse`, `EscalatedClosureDetailResponse`); `R9PanelVote.covers_current_warnings` (RD11). Attached in the HANDLER
  after the domain read (RD7) — the per-claim reader for the R9 panel and the Super Admin's detail, the bulk reader for the two lists (RD8) —
  fail-closed (Trap 15). The shared words live in `verifierConsoleEn.approvalWarnings` (RD6).
- **EA8 — notes are ⛔ never replaced here either (6.23a NW18).** Traced at `2059482b` and re-traced at `b41ea25f`: ⛔ no revise path exists for
  a trustee decision or a 6.19c approval (only `superseded_at` writes for returns, escalations and routing rows); every new record row is
  append-only. ⚠ R9 votes stay revisable before finalize (Trap 6) — history kept.
- **EA9 — audit, and nothing else moves.** Each approve audit context gains `approval_warning_kinds` and `warning_reason_code` (RD15's
  convention: kinds OMITTED when unknown, ⛔ never `[]`); a `late_warning_reason_required` refusal's line carries `uncovered_count` and
  `own_reason_excluded`; ⛔ no new route (requests are widened only — the human-actor gate entries are unchanged, but RE-RUN it
  `scripts/claim-adjudication-human-actor-invariant/`); ⛔ no new claim event (35); ⛔ no new permission key (6.23a's 51 / 65 stands); ⛔ no
  member-app change (⇒ ⛔ no `friction-budget.md` block is owed; if any member-facing file is touched after all, one IS — AC-4 diffs committed
  history, [[project_friction_budget_baseline_ratchet]]).
- **EA10 — the District Admin is TOLD (`-279` A4; BigDev: *"Correction queue, in 6.23b"*).** Without it the wait is the 6.18 failure again
  (`correction-queue-read.ts`'s header: *"the District Admin could act on a return ONLY if somebody told them the claim id out of band"*).
  `listClaimsUnderCorrection` (`claim/correction-queue-read.ts`) also lists a claim whose live District Admin approval leaves a current
  warning key uncovered by any District Admin row. ⭐ A late key can arise ONLY through a determination recorded after the approval (6.23a
  fact 3) ⇒ the SQL superset (`candidateBatch`'s `OR EXISTS …` block) gains the TIGHT arm *"a live `approved` verifier decision AND a live
  `nominee_determinations` row whose `decided_at` > that decision's `decided_at`"* (both `timestamptz`, compared in SQL) — ⛔ never "every
  approved claim" (that re-creates the crowding the 2026-09-23b review removed); ⚠ the post-filter in `qualifyingRows` (`if
  (!hasLiveUnresubmittedReturn && !sentBackByCheck) continue;`, `:285`) gains a THIRD arm (`lateWarningAwaitingReason`), or it drops every new
  row; the module header (*"'Under correction' is `resolveClaimCorrectionState`'s answer"*) is amended to name the third arm; a
  late-warning-only row has ⛔ no live return, so its chase summary is `empty` and closure readiness `no_live_return` — the UI hides those
  actions for it. The arm is evaluated inside the existing `CORRECTABLE_SCAN_STATES` (`:47` — it covers `verifier_approved`, `reversed`,
  `state_trustee_freeze`, every state a late key can arise in, 6.23a fact 3), through `readClaimApprovalWarningsBulk` (⛔ no per-claim loop).
  Coverage here is the District Admin's own (⛔ no actor exclusion — the queue asks whether ANY District Admin answer exists). ⚠ Accepted gap,
  recorded (Task 9's deferred item): a key covered ONLY by a late reason whose recorder later approves is ⛔ not queued — the approver's 409
  (`own_reason_excluded`) tells them to ask, and NW14 lets the other person answer. **(v2.0 build)** the domain row gains
  `lateWarningAwaitingReason: boolean` and `lateWarningUncoveredCount: number`; the wire item (`ClaimUnderCorrectionItem`,
  `packages/contracts/src/claims/nominee-name-check.ts:380`) gains `late_warning_awaiting_reason` and `late_warning_uncovered_count` (RD4); the
  third arm's bulk read runs under a raw SAVEPOINT — on a throw the two existing arms still list, the late arm adds nothing, and the
  RESPONSE carries `late_warnings_unavailable: true` so the queue says *"Late warnings could not be checked just now — reload to try again"*
  (invariant 7; RD12). `CorrectionQueueRoute.tsx` shows *"a late warning awaits your reason"* and links to the console. ⛔ No new route — the
  queue's existing one (`claims.nominee-name-check.handlers.ts`, the `listClaimsUnderCorrection` call).

## Acceptance Criteria

### AC0 — Governance and re-pin (Task 0)
**Given** this story is about to start **Then** 6.23a is `done` (✅ row `6-23-post-death-nominee-change-warnings`, PR #255); `-278` carries
EA1–EA9, `-279` carries A1, A2, A3, A4, A5, A10 as written here (EA1 / EA2 / EA5 amended, EA10 added), and `-280` adds `state_trustee_approved`
to NW14 (✅ verified 2026-10-05: `-280` is the newest entry; ⛔ no later entry names `6-23`, `warning`, `reason` or `coverage`) — if a newer
entry exists at build time, read it first and STOP on any that moves an EA; the baseline `b41ea25f` is an ancestor of HEAD, and
`git diff --name-only b41ea25f..HEAD -- packages apps scripts` is re-read against every `file:NNN` below.

### AC1 — The record's later steps (EA1; Trap 10; RD1, RD2)
**Then** 0144 widens `step` (seven values), adds the three nullable columns, the three UNIQUE targets and the three COMPOSITE FKs with the
coherence CHECK, and an index per new column; the policy-regression spec proves each new step accepts exactly its own FK set
(`super_admin_approval`: `closure_id` AND `trustee_decision_id`) and refuses every other combination, that a row pointing at ANOTHER Pariwar's
trustee decision / vote / closure is refused by the composite FK (the 6.23a round-1 regression shape), and that the rows stay append-only (an
UPDATE of a new column refused; the cascade from `claims` still deletes); both lockstep tests pass (DB ↔ TS, contracts ↔ domain) **and** a
later step's row ⛔ never counts toward the District Admin's coverage (`readClaimApprovalWarnings` unchanged for a claim with only later rows)
**and** `insertClaimWarningApprovalRecord`'s two 6.23a callers compile unchanged **and** 0144 has ⛔ no `DEFERRABLE` constraint.

### AC2 — The wait (EA2; `-277` Q3 B; Traps 7, 17)
**Given** a claim the District Admin approved over a warning, whose certificate is then re-reviewed to an earlier date and redetermined, so a
NEW warning key is uncovered **Then** the final vote, an R9 approve outcome and 6.19c's approvals answer **409 `…late_warning_reason_required`**
(`cycle_freeze.` / `r9_voting.` / `closure.`; ⛔ nothing written; the claim is ⛔ not refused) **and** after the District Admin records a late
reason (6.23a NW14) the same approval proceeds **and** the same holds on 6.23a fact 3's path — District Admin approved → final vote denied →
appeal reversed → re-reviewed in `reversed` → the next final vote waits until NW14 **and** a claim with ⛔ no District Admin approval
(escalated-and-resolved; refused by the District Admin and then reversed on appeal) never waits on this conjunct **and** a claim with ⛔ no
warnings never waits **and** P1 is unaffected **and** (`-279` A1) a Pariwar Admin who records the late reason THEMSELVES and then votes
approve still gets the 409 — while the same late reason recorded by ANOTHER `claim.approve` holder lets that vote proceed; likewise an R9
finalize where the recorder is the finalizer or a live approve voter **and** that 409 carries `details.own_reason_excluded: true` with its
words, and a District Admin's or the Super Admin's NW14 then succeeds (⛔ not `nothing_uncovered`) and the vote proceeds **and** every one of
the seven gate calls passes `approvingActorIds` (typecheck: the field is required) and the rewritten T10 seam test passes — incl. a
`waived_251` arm that STILL waits (Trap 17) **and** (`-280`) a claim in `state_trustee_approved` routed to R9, whose only late-key cover is a
late reason recorded by an approve voter, 409s at finalize with `own_reason_excluded` — and after the District Admin (or the Super Admin)
records a late reason THERE (NW14 records in `state_trustee_approved`), finalize proceeds.

### AC3 — The escalation resolution (EA3)
**Given** an escalated claim showing a warning **Then** resolving it to approved without an active `warning_reason_code` + a rationale ⇒ 400
(the contract — code without rationale) / 409 `cycle_freeze.warning_reason_required` (⛔ no code); a replaced reason ⇒ 409
`cycle_freeze.warning_reason_unavailable`; with an active one ⇒ resolved and ONE `escalation_resolution` record row (its
`trustee_decision_id` the new decision row); a reason with ⛔ no warning ⇒ 409 `cycle_freeze.warning_reason_ungrounded`; a refusal leaves the
`escalated` verifier decision LIVE (⛔ nothing written); a denying resolution is unchanged; `warning_reason_code` with `action: 'deny'`,
`route_to_r9` or `return_to_district_admin` ⇒ 400.

### AC4 — The final vote (EA4)
**Given** a claim at the final vote showing a warning — after a District Admin approval over it, after a reversal, and after an escalation
**Then** approving without an active reason + a rationale ⇒ 409 (each origin tested); with them ⇒ approved and ONE `final_vote` record row; a
deny, a route to R9 and a return are unchanged; a concealment-flagged + warned claim approves with `concealment_override` AND a warning reason
— both recorded, the R14 snapshot kept (Trap 3); an un-warned approve with the card's existing body (⛔ no reason, ⛔ no rationale) still
succeeds.

### AC5 — The R9 vote (EA5; RD5, RD10, RD11)
**Then** an approve vote while warnings show without an active reason ⇒ 409 `r9_voting.warning_reason_required`; with one ⇒ the vote and its
`r9_vote` record row in one transaction; a deny vote is never gated; a reason with ⛔ no warning ⇒ 409 `r9_voting.warning_reason_ungrounded`;
a revised vote leaves the earlier vote, its note and its record row in place; finalize (approved) with any live approve vote whose record
row does ⛔ not cover every current key (or that has none) while warnings show ⇒ 409 `r9_voting.approve_votes_need_warning_reason` with
`vote_ids`, and after the voters revise ⇒ finalized **and** (`-279` A2) a session routed from `verification_in_progress` whose votes each
covered only the 90-day key, then a determination adds a post-death key ⇒ finalize 409s with those vote ids, and after each voter revises
with a reason covering every current key ⇒ finalized **and** a `warning_reason_code` on a deny vote ⇒ 400; a denied outcome is never gated
**and** the panel's `covers_current_warnings` is `false` for exactly the vote ids that finalize would name, `true` for the others, `null` for
deny votes and when ⛔ no warning shows.

### AC6 — 6.19c's approvals (EA6; Trap 17)
**Then** a Super Admin approve of a warned held claim without an active `warning_reason_code` ⇒ 409 `closure.warning_reason_required` (the
note already required); with it ⇒ approved and ONE `super_admin_approval` row (`closure_id` + `trustee_decision_id`), the closure reason and
0131 CHECK unchanged; the `-251` waived approve obeys the SAME rule **and** a "no correction needed" approve of a warned claim without
`warning_reason_code` + `note` ⇒ 409 `closure.warning_reason_required`; with them ⇒ approved, the Pariwar Admin's note encrypted as the
decision rationale (⛔ not the constant — decrypt the row and compare), ONE `no_correction_approval` row; an un-warned approve still sends `{}`
and stores the constant; a `note` without `warning_reason_code` (or the reverse) ⇒ 400; `warning_reason_code` on a `close` / `refuse` ⇒ 400
**and** closures, refusals and keeps are unchanged.

### AC7 — Every surface shows the warnings and the reasons (EA7; Traps 8, 14, 15; RD4, RD6–RD9, RD11)
**Then** `readClaimApprovalWarningsBulk` serves the two lists in ONE statement — a live statement-count test (the real-statement counter of
`apps/api/tests/integration/claims/verifier-console.spec.ts`, *"rows grew the REAL statement count"*): ⛔ no growth from 1 to 10 warned claims
— and returns, for every claim, exactly what `readClaimApprovalWarnings` returns (the dirty-input parity test, Trap 13); the reason options
are read once per response; each of the four surfaces shows the warning line (`kindLine` per kind) and 6.23a's picker — every reason with its
label, "when to use" and *"added by {name} on {date}"* / *"built in"*, ⛔ nothing pre-selected — requires the note, and shows *"waits for the
District Admin"* (Approve disabled, with those words; with `own_reason_excluded`, the own-reason words) when a late warning is uncovered for
THIS viewer; `available: false` disables ONLY the approve control, with the unavailable words (Trap 15); every new 409 code maps to its own
words — ⛔ never *"try again"* or a raw code **and** on `PariwarClosureStrip.tsx` ONLY `NoCorrectionStrip`'s approve carries the picker — the
closure-request `closure-approve` has ⛔ none (Trap 12) **and** every fixture of a widened DTO carries the new fields and
`correction-closure-shape.spec.ts` passes unmodified (Trap 14).

### AC8 — Nothing else moves (EA8, EA9)
**Then** ⛔ no new route, claim event, permission key, enum value or member-app change; every refusal / closure / keep / route / return / deny
vote is unchanged; ⛔ no route edits or replaces a note; the human-actor, access-wrapper and microcopy gates pass; 6.23a's transitive
import-scan test passes; `contracts:check-openapi-determinism` is green; the audit lines follow RD15.

### AC9 — The proof
**Then** the suites in *Testing* exist and each new test was shown to fail before its code; live-DB specs `{ timeout: 20000 }`, own-commit,
membership-not-counts; `pnpm -w typecheck`, lint, the domain / contracts / api / admin suites and `ci:local` (with `DATABASE_URL` → :5433) are
run (flakes named, ⛔ never silently re-run); 0144 applied to BOTH :5432 and :5433.

### AC10 — The District Admin is told (EA10; `-279` A4)
**Given** a claim the District Admin approved, with a current key now uncovered by any District Admin row **Then** it appears in the District
Admin's correction queue with `late_warning_awaiting_reason: true` (+ `late_warning_uncovered_count`) and *"a late warning awaits your
reason"*, linking to the console, with the chase-summary and closure actions HIDDEN on a late-warning-only row **and** after NW14 covers it,
it leaves the queue (unless under correction for another reason) **and** a claim that is BOTH returned and late-warned shows both **and** the
queue's read stays ONE bulk evaluation per batch (⛔ no per-claim loop) **and** a forced failure of the late arm still lists the returned
claims with `late_warnings_unavailable: true` **and** ⛔ no new route.

### AC11 — The deferred item routed here (RD13)
**Then** `PendingCaseCard.tsx` shows the verifier's reason as its words from `verifierConsoleEn.reasonCodes` (an unknown code falls back to
the code itself, ⛔ never blank) **and** `deferred-work.md`'s item (section *"Recorded during Story 6.23a"*, *"The Pariwar Admin sees the raw
`verifier_reason_code`…"*) carries an appended *"✅ Closed by Story 6.23b (AC11)"* line — the item text is ⛔ not deleted.

## Tasks / Subtasks

- [ ] **Task 0 — Re-pin and governance check (AC0).** `git merge-base --is-ancestor b41ea25f HEAD`; `git diff --name-only b41ea25f..HEAD --
  packages apps scripts` — re-read any cited file in it; `grep -n "^### Decision" .decision-log.md | head -3` — `-280` must still be the newest,
  else read the newer ones for `6-23`, `warning`, `reason`, `coverage` (STOP on any that moves an EA).
- [ ] **Task 1 — Migration 0144 + schema (AC1).** EA1 / Trap 10 / RD1: the step CHECK, three columns, three UNIQUE targets, three composite
  FKs, the later-step FK CHECK, three indexes; journal entry (`idx` 144); Drizzle: `schema/claim_warning_approvals.ts` (the columns, the
  `foreignKey()`s, the `check()`s, `CLAIM_WARNING_APPROVAL_STEPS`) and a `unique()` in each parent's schema file; the contracts step mirror;
  extend the policy-regression spec; `db:check` / `schema:check` green.
- [ ] **Task 2 — Domain: the wait, the readers, the record insert (AC1, AC2, AC5, AC7).** In `claim/approval-warnings.ts`:
  `readClaimApprovalWarningsBulk` (RD9 — ONE statement, reusing `deriveClaimApprovalWarnings`), `readR9VoteWarningCoverage` (RD10),
  `assertLateWarningsCovered` (EA2), RD3's exclusion widening, RD2's step-discriminated `insertClaimWarningApprovalRecord`. In
  `claim/errors.ts`: `LateWarningReasonRequiredError` (`kinds`, `uncoveredCount`, `ownReasonExcluded`) and
  `R9ApproveVotesNeedWarningReasonError` (`voteIds`, `uncoveredCount`). In `nominee-name-check.ts`: the LAST conjunct of `assertClaimApprovable`
  (and its doc-block's conjunct list + the seam doc-block), `ClaimApprovalGateOptions.approvingActorIds` (required; `opts` loses its default),
  the inner helper's `Pick<…,'nameCheck'>`; thread the actors at all seven gate calls; rewrite the T10 seam test
  (`nominee-name-check.spec.ts:715-753`) incl. Trap 17's arm. ⚠ Keep the import scan green (Trap 7).
- [ ] **Task 3 — Domain: the final vote and the escalation (AC3, AC4).** `voteOnFrozenClaim` and `resolveEscalation` per EA3 / EA4 — input
  `warningReasonCode: string | null`; `readClaimApprovalWarnings` → `lockActiveApprovalWarningReason` (only when kinds non-empty and a code
  was sent — the `adjudicateClaim` shape) → `assertApprovalReasonCoversWarnings` (note = the rationale ciphertext) → the record row after the
  decision row; `approvalWarningKinds` on `TrusteeDecisionResult`.
- [ ] **Task 4 — Domain: R9 (AC5).** `castR9Vote` (best-effort rule + the `r9_vote` row, its `r9_vote_id` the new vote) and
  `finalizeR9Outcome` (binding, PER VOTE, PER KEY — `-279` A2) per EA5; `voterActorId` on the live-vote select; the approving actors =
  finalizer + live approve voters; the per-vote check after `assertClaimContactRecorded`, before the session UPDATE; the typed error with
  `voteIds`.
- [ ] **Task 5 — Domain: 6.19c (AC6).** `EscalatedClosureDecisionInput` (the `approve` arm) and `approveNoCorrectionNeeded`'s input gain
  `warningReasonCode`; the rule after the gate + contact check; the record row after `writeApprovalChain` (its `decisionId`; the closure's
  `closureId` for the Super Admin) — both the `-251` and the full-gate approve.
- [ ] **Task 6 — Contracts (AC3–AC7, AC10).** `warning_reason_code` on `CycleFreezeDecisionRequest` (its `superRefine` via `effectiveOutcome`
  — ONE flat `.strict()` object, ⛔ not a discriminated union), `R9VoteRequest` (its FIRST `superRefine` — ⛔ no code on a deny),
  `EscalatedClosureDecisionRequest` (approve only); `{ warning_reason_code, note }` on `NoCorrectionNeededApproveRequest` (paired); NEW
  `ApprovalWarningsSummary`; `approval_warnings` + `reason_options` on the four read DTOs; `R9PanelVote.covers_current_warnings`;
  `ClaimUnderCorrectionItem.late_warning_awaiting_reason` / `late_warning_uncovered_count` and the queue response's
  `late_warnings_unavailable`; the step mirror (Task 1). ⚠ ⛔ No contracts test pins these request shapes today (`claims-cycle-freeze.test.ts`,
  `r9-voting.test.ts`, `correction-closure-lockstep.test.ts` test `safeParse` behaviour and `.strict()` smuggling only;
  `NoCorrectionNeededApproveRequest` has ⛔ no test at all) — WRITE the new rules' tests; contracts tests sit outside `tsc` — run vitest
  ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 7 — API (AC2–AC7, AC10).** Map `LateWarningReasonRequiredError`, `ApprovalWarningReasonRequiredError`,
  `WarningReasonUnavailableError`, `WarningReasonUngroundedError` and `R9ApproveVotesNeedWarningReasonError` in the FOUR translators of Trap 7
  (each in words that say the claim is ⛔ not refused; `details` codes and counts only); pass `body.warning_reason_code` to each writer;
  D27's note encryption (Trap 4); the read DTOs attached in the handlers, fail-closed (Trap 15 — `getCycleFreezePending` handler `:288`,
  `getR9Panel` handler `:276`, `listPariwarClosureQueue` handler `:449`, both `readEscalatedClosureDetail` calls in
  `claims.correction-escalation.handlers.ts` — the GET's); the correction queue's new fields; the audit contexts (RD15).
- [ ] **Task 8 — Admin (AC7, AC10, AC11).** Mount 6.23a's picker on `PendingCaseCard.tsx` (Approve + Resolve → Approve; the warned body per
  Trap 2), `R9CasePanel.tsx` (an approve vote; the per-vote *"must be revised"* line from `covers_current_warnings`), `EscalationPanel.tsx`
  (approve), `PariwarClosureStrip.tsx` (`NoCorrectionStrip`'s approve ONLY + its OWN note field — Trap 4, Trap 12); `apps/admin/src/api/client.ts`
  — `approveNoCorrectionNeeded(pariwarId, claimCaseId)` posts `{}` today (`:1539-1541`) — and its hook (`hooks.ts:932`, `mutationFn` takes only
  `claimCaseId`) take the optional body; the R9-vote, cycle-freeze and escalated-closure payload types gain `warning_reason_code`; the shared
  words in `verifierConsoleEn.approvalWarnings` (a `later` block: the waits line, the own-reason line, the R9 *"vote must be revised"* line,
  the D27 note label/error) and one message helper per new code suffix in `claim-verification/nominee-errors.ts`, wired into
  `CycleFreezePage.tsx`'s and `R9CasePanel.tsx`'s `errorMessage` (RD6); `CorrectionQueueRoute.tsx` (EA10); AC11's label. English-only staff
  copy (⛔ `report` / `receipt` / `invoice` / `passbook` — the active microcopy terms). Family-13 accessibility as 6.23a: the selection
  announced, a missing reason or note SAID (`role="alert"`), ⛔ never a silently disabled button; a 409 refetches the list (6.23a round 4).
- [ ] **Task 9 — Tests and records (AC8, AC9, AC11).** See *Testing*. `deferred-work.md` — a NEW section *"Recorded during Story 6.23b"*:
  R9 votes revisable before finalize — notes kept as history (BigDev accepted; trigger: a Panel instruction to lock them); a late key covered
  ONLY by a late reason whose recorder then approves is ⛔ not queued by EA10 (the 409's `own_reason_excluded` words carry it; trigger: a held
  claim reported); ⚠ the R9 residual — a live approve voter may still record a late reason (6.23a's NW14 knows ⛔ nothing of R9) that ⛔ never
  counts at finalize, and in a Pariwar where EVERY `claim.approve` holder at the district is a live approve voter or the finalizer, ⛔ nobody
  can answer (exit: a vote change, or the session re-run; trigger: a held R9 claim reported); ⚠ the later approvers' notes on
  `claim_state_trustee_decisions.rationale_ciphertext` / `claim_r9_votes.rationale_ciphertext` are ⛔ not in the anonymizer — the same class as
  6.23a's verifier-rationale item (cross-reference it, ⛔ not a duplicate; trigger: the next RTBF pass over the claim-adjudication tables). AC11's
  closure line on the RD13 item.
- [ ] **Task 10 — The District Admin's queue (AC10).** EA10: the SQL superset arm + `readClaimApprovalWarningsBulk` under a raw SAVEPOINT;
  `ClaimUnderCorrectionRow` / `ClaimUnderCorrectionItem` gain the two fields; the queue response gains `late_warnings_unavailable`;
  `claims.nominee-name-check.handlers.ts` maps them; the module header amended to name the third arm; `CorrectionQueueRoute.tsx` shows the
  line and the console link and HIDES the chase-summary and closure actions on a late-warning-only row (⛔ no live return); its tests.

## Dev Notes

### What already EXISTS — traced at `b41ea25f` (rebuild ⛔ none of it)

| Thing | Where | Use |
|---|---|---|
| 6.23a's module | `claim/approval-warnings.ts` — `APPROVAL_WARNING_KINDS`, `approvalWarningKey`, `readClaimApprovalWarnings` (ONE statement; `ClaimApprovalWarnings` with `kinds`, `keys`, `postDeath`, `liveDecision`, `coverage.{districtAdminApproved, coveredKeys, approvalKeys, records}`, `reasonOptions`), the private `deriveClaimApprovalWarnings`, `uncoveredKeys(w, { excludeLateReasonsRecordedBy? })`, `lateWarningKeys`, `lateKeysUncoveredFor`, `lateWarningNothingUncoveredFor`, `assertApprovalReasonCoversWarnings` (NW6's order), `insertClaimWarningApprovalRecord` | every EA — CALLED, ⛔ never copied; RD2, RD3, RD9 widen |
| The reason list | `claim/approval-warning-reasons.ts` — `APPROVAL_WARNING_GENERIC_REASON` (`warnings_reviewed`), `listApprovalWarningReasons`, `activeReasonOptions`, `lockActiveApprovalWarningReason` (`FOR SHARE`; the generic resolves with ⛔ no read) | Trap 11, EA7 |
| NW14 | `claim/approval-warnings-persist.ts` — `recordLateWarningReason`, `LATE_WARNING_REASON_RECORDABLE_STATES` (four, incl. `state_trustee_approved`) | AC2's unblock path |
| The errors | `claim/errors.ts` — `ApprovalWarningReasonRequiredError(claimCaseId, kinds, missing)`, `WarningReasonUngroundedError`, `WarningReasonUnavailableError`, `LateWarningReasonRefusedError` (NW14 — ⛔ not the wait's) | Trap 7 |
| The record | `claim_warning_approvals` (0143; `schema/claim_warning_approvals.ts`) — composite FKs, `DISTRICT_ADMIN_WARNING_STEPS`, the jsonb UPDATE guard + cascade exception | EA1, Trap 10 |
| The DA reference implementation | `adjudicateClaim` (`verifier-decision-persist.ts`) — step (a3): read → lock reason (kinds non-empty AND a code) → rule → record row after the decision | Tasks 3–5 copy its SHAPE |
| The ONE gate | `assertClaimApprovable` (`nominee-name-check.ts:383`); `ClaimApprovalGateOptions` (`:410`); the inner helper (`:463`, `opts` `:469`); `readNomineeNameCheckApprovalState` | EA2 |
| The final vote / escalation | `voteOnFrozenClaim` (`state-trustee-decision-persist.ts:504`), `resolveEscalation` (`:1036`), `insertTrusteeDecisionRow` (`:420`, returns the row), `resolveConcealmentSnapshot`, `assertReasonCode` | EA3, EA4, Traps 1–3 |
| R9 | `castR9Vote` (`r9-voting-persist.ts:494`), `finalizeR9Outcome` (`:569`; live votes `:599-604`, gate `:623`); `claim_r9_votes`; `R9VoteRequest` (`contracts/src/claims/r9-voting.ts:223`); `getR9Panel` (`claim/r9-voting-read.ts:131`); `R9_OUTCOME_FROM_STATES` (`state.ts:78-85`) | EA5 |
| 6.19c | `decideEscalatedClosure` (`correction-closure.ts:1261`), `approveNoCorrectionNeeded` (`:1488`), `writeApprovalChain` (`:667-678`); `CLOSURE_SUPER_ADMIN_REASONS` + 0131's CHECK; `EscalatedClosureDecisionRequest` (`contracts/…/correction-closure.ts:142`), `NoCorrectionNeededApproveRequest` (`:178`); `NO_CORRECTION_NEEDED_DECISION_RATIONALE` (`claims.correction-closure.handlers.ts:90`) | EA6, Traps 4–5 |
| The lists | `getCycleFreezePending` (`claim/cycle-freeze-read.ts`; handler `claims.cycle-freeze.handlers.ts:288`); `listPariwarClosureQueue` (handler `claims.correction-closure.handlers.ts:449`); `readEscalatedClosureDetail` (handler `claims.correction-escalation.handlers.ts:127`, `:239`) | EA7, RD7 |
| The fail-closed precedent | `assembleApprovalWarnings` (`claims.verifier-console.handlers.ts`); the raw SAVEPOINT in `claims.nominee-declaration.handlers.ts` (`timeline_warning_anchor`) | Trap 15, EA10 |
| The admin surfaces | `cycle-freeze/{PendingCaseCard,CycleFreezePage}.tsx`; `r9-voting/{R9CasePanel,R9VotingPage}.tsx`; `correction-closure/{EscalationPanel,PariwarClosureStrip}.tsx` (⛔ not `ClosureColumn.tsx`); the picker `claim-verification/ApprovalWarningReasonPicker.tsx` (props: `options`, `value`, `onChange`, `disabled`, `error`, `idPrefix`); words `claim-verification/i18n-en.ts` (`approvalWarnings`, `reasonCodes`); `claim-verification/nominee-errors.ts` | EA7, RD6, AC11 |
| The District Admin's queue | `listClaimsUnderCorrection` + `candidateBatch` + `qualifyingRows` + `CORRECTABLE_SCAN_STATES` (`claim/correction-queue-read.ts`); `ClaimUnderCorrectionItem` (`contracts/…/nominee-name-check.ts:380`); handler `claims.nominee-name-check.handlers.ts:462`; `apps/admin/src/routes/CorrectionQueueRoute.tsx` | EA10 |

### What moves, and what must be preserved
- **Moves:** the files named in Tasks 1–10. **Preserved, byte-for-byte in behaviour:** every un-warned approval on every path; every deny /
  route / return / refuse / close / keep; the trustee presence rule (Trap 2); the closure reasons + 0131 CHECK (Trap 5); the domain list
  readers' shapes (RD7); 6.23a's console section and its 19-read ceiling (this story adds ⛔ no console read); the RTBF pin (18 tables / 21
  statements — later rows carry ⛔ no note); the fence (36) unless a NEW module file is added (none is planned).

### Testing
- **Live-DB (domain):** `packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts` — AC2–AC6 on real rows: a District
  Admin approval over a warning, then the final vote (needs its own reason and row); a re-reviewed certificate making a key uncovered ⇒ the
  final vote, R9 finalize and the Super Admin approve (both the full and the `-251` waived) all 409; NW14 then unblocks them; 6.23a fact 3's
  path (approved → final vote denied → appeal reversed → re-reviewed in `reversed` → the next final vote waits); a reversed `-239` refusal
  reaching the final vote (never waits); an escalation resolved then voted (two rows); R9 votes cast before / after a warning appears, revised
  (history kept), finalized; D27 with and without warnings; a reason replaced between read and write (Trap 11 — the two-connection `FOR SHARE`
  race shape 6.23a round 3 added); concealment + warning at the final vote (Trap 3); ⭐ (`-279`) the Pariwar Admin's own late reason ⛔ not
  clearing their own vote, another holder's clearing it (A1); R9 from `verification_in_progress` — votes over the 90-day key only, then a
  post-death key ⇒ finalize 409 per vote, revise ⇒ finalized (A2); `state_trustee_approved` → R9 (`-280`); a stale determination ⇒ the bulk
  reader says awaiting (Trap 13) + the bulk ↔ per-claim parity over dirty input; the correction queue's late arm on / off / forced failure
  (EA10). Seed dates per Trap 16. ⚠ ⛔ No TRUNCATE of a parent reaching `claim_warning_approvals` (6.23a's Testing note); ⚠ ⛔ no `DROP SCHEMA`.
- **Policy:** the widened record table (AC1) — in `packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts`.
- **Unit (domain):** `uncoveredKeys` with a list exclusion; `own_reason_excluded`'s arithmetic; the step-discriminated insert types.
- **API:** the 409 codes and `details` through each route that reaches a later writer (the cycle-freeze decision, the R9 vote, R9
  finalize, the escalation decision, the D27 approve); the D27 note encrypted (⛔ not the constant) when warned; the read
  DTOs incl. `available: false` (a fault seam on the reader, as 6.23a's console fail-closed test); the audit lines.
- **Bulk:** the statement-count test (AC7) on the cycle-freeze pending handler with 1 vs 10 warned claims.
- **Contracts:** the new optional fields' `superRefine` rules and the shape tests; the step lockstep.
- **Admin (RTL):** each surface — the line, the picker (label, when to use, added by / on), the note required, *"waits for the District
  Admin"* disabling Approve with words, the own-reason words, the unavailable words (Deny still enabled), the R9 per-vote line, the error words;
  `NoCorrectionStrip` vs `ClosureRequestStrip` (Trap 12); the queue's late row; AC11's label. A 409 test with a REAL `useQuery` where a reset
  is keyed on server state ([[project_tanstack_onsettled_before_success]]).
- **Unchanged (run unmodified):** every deny / route / return / closure / keep spec; `correction-closure-shape.spec.ts`; `permissions.test.ts`
  (51 / 65); `dpdpa-consent-events.test.ts` (35); `rtbf-anonymize.test.ts` (18 / 21); 6.23a's import-scan and kinds-pin tests.

### Previous-story intelligence
- **6.23a** (`done`) — the module, the keys, the record, the list, the picker, NW14, NW18; its Traps 2 (gate order), 5 (date-bomb fixtures),
  13 (coverage is the District Admin's rows only), 16 (a replaced reason). ⭐ Its FOUR review rounds' lessons, each relevant here: composite
  tenant FKs (RD1); fail closed on a warnings read, ⛔ never "no warnings" (RD12); a raw SAVEPOINT where a soft read cannot run last; kinds
  OMITTED when unknown in audit (RD15); code-point limits, ⛔ `.length`, on any new text bound; a step-up retry must ⛔ never resubmit a
  cancelled or edited reason (R9 finalize is step-up gated); `confirm()` re-checks the pick; a 409 refetches; focus moves to the result;
  every new string a family-13 announcement; mount conditions must survive their own success (round 2's `status !== 'idle'`).
- **6.18** — P3 is *"THE MOST LOAD-BEARING OF THE THREE GATES"* (its own comment): every reversal and post-approval correction passes it.
- **6.19c** — the T10 seam (`ClaimApprovalGateOptions`) waives the name check ONLY; the `-273` §10 closure reasons are a CHECK.
- **6.13 / 6.14** — the D-F presence rule; R9 votes are revisable until finalize; finalize locks live votes `FOR UPDATE` in `vote_id` order.

### Git intelligence (`2059482b..b41ea25f`)
17 commits: 6.23's governance (`-277`…`-280`, rebase-merged as PR #253), 6.23a's governance (`epics.md`), its build (`38a00962`), its
review rounds 1–4 (`1d11973f`, `b25b9f8e`) and its SHA map (`b41ea25f`, PR #255). ⛔ Nothing else touched `packages` / `apps`. House
patterns confirmed: hand-authored migrations with a journal entry; `story(…)` / `governance(…)` commit prefixes; governance commits FIRST;
REBASE-merge with a SHA map afterwards.

### Latest technical notes
⛔ No new dependency and ⛔ no version change: Zod v3 (`.strict()`, `superRefine`, `z.ZodIssueCode.custom` — as the touched contracts already
use), Drizzle (`foreignKey()`, `unique()`, `check()`, `.for('share')` — as 0143 / 6.23a use), TanStack Query (as the admin hooks). ⇒ ⛔ no
external research was needed; follow the patterns in the files named above.

### Project context
⛔ No `project-context.md` exists in the repo; the house rules are the story files, `.decision-log.md` and the memory index.

### References
- `.decision-log.md` — ⭐ `-280` · ⭐ `-279` A1–A5, A10 (A2's code: RD5) · ⭐ `-278` EA1–EA9 · ⭐ `-277` Q2, Q3 (readings — one Q3 clause superseded
  by `-279` A5; BigDev's confirmation; Consequences 1–2) · `-264` FQ12 (heading), not-cover · `-262` FQ5 (row 6-24's wait) · `-263` FQ9 (row
  6-26's gate) · `-226` cl.7 · `-251` · `-273` §10.
- `6-23-post-death-nominee-change-warnings.md` (Story 6.23a — NW1, NW5, NW13–NW18, Traps 2, 5, 13, 16; its Review Findings rounds 1–4).
- `deferred-work.md` — sections *"Recorded during Story 6.23a"* (RD13's item; the verifier-rationale RTBF item) and *"Deferred from: code
  review of 6-23-…, round 3 chunk 1"* (RD14).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-04-6-23-warnings-confirms.md` (✅ ruled).
- `epics.md` `### Story 6.23b` (Minted-by header; ACs in brief — consistent with this file).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- (create-story, 2026-10-04) Written at the split of row `6-23` (BigDev: *"ok, split it"*), after `-277`. ⛔ No code; status `backlog` until 6.23a is `done` (the 6.21b precedent).
- (create-story, 2026-10-05) ⭐ Re-derived against 6.23a's shipped build at `b41ea25f` (v2.0): RD1–RD16 threaded; ⛔ no decision moved. Status `backlog` → `ready-for-dev`. Ultimate context engine analysis completed — comprehensive developer guide created.

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
| **v2.0** | **2026-10-05** | ⭐ **RE-DERIVED against 6.23a's SHIPPED build (`bmad-create-story 6.23b`) — re-pinned `2059482b` → `b41ea25f`; `backlog` → `ready-for-dev`.** 6.23a went `done` (PR #255) after four review rounds; every code claim here was re-opened at `b41ea25f`. ⛔ No decision moved — sixteen FOUND facts (RD1–RD16) change the build: the record's FKs are COMPOSITE with three new UNIQUE targets (RD1); the record insert takes a step-discriminated input (RD2); `uncoveredKeys`' exclusion widens to a list for P4 (RD3); the wire is snake_case while 6.23a's option DTO stays camelCase (RD4); every R9 code is `r9_voting.*`, so `-279` A2's `r9.` string is a slip (RD5); `cycle-freeze/` and `r9-voting/` have ⛔ no `i18n-en.ts` — shared words go to `claim-verification/` (RD6); `correction-closure-shape.spec.ts` pins exact keys ⇒ the warnings attach at the handler (RD7); the R9 panel and the Super Admin's detail are single-claim (RD8); the bulk reader reuses 6.23a's `deriveClaimApprovalWarnings` (RD9); per-vote coverage needs a new `r9_vote` read (RD10) and the panel shows out-of-date votes before finalize (RD11); 6.23a's fail-closed shape on every surface, a SAVEPOINT on the queue's arm (RD12); a `deferred-work.md` item routed here by name — the raw verifier reason code on the card (RD13, NEW AC11); 0144 adds ⛔ no deferred constraint (RD14); 6.23a's audit convention (RD15); the `-251` waived approve waits too — seven gate calls, ⛔ not six (RD16, NEW Trap 17). NEW Traps 14 (shape pins + strict fixtures), 15 (fail closed, Approve only), 16 (the red set is EMPTY — fixtures re-verified at 2026-01-05), 17; invariant 7; every `file:NNN` re-read (`client.ts` `:1534` → `:1539`; the rest held). |
