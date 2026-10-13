---
baseline_commit: 560369a7
---

<!--
⭐⭐ RE-DERIVED 2026-10-13 (v3.0 — `bmad-create-story 6.27b`, on branch `story/6-27b` from `main` `560369a7`, the tip after 6.27a's
five review passes landed). v1.0–v2.5 were the BACKLOG cut of 2026-10-10 (pinned `fa2687ce`, before ANY 6.27a code existed); every
`file:NNN` below is now AS OF `560369a7` and was re-read by two read-only checkers (the approver hosts + routes; the gates + pins) and
the author. ⛔ No PM, ruling or AC intent of the cut moved. What re-deriving against 6.27a's SHIPPED build found is section "FOUND
against 6.27a's build" (BF1–BF16; they decide ⛔ nothing); the three calls it raises for BigDev are BD1–BD3 (Task 0).
⚠ Before Task 1: `git diff --name-only 560369a7..HEAD -- packages apps scripts infra` — re-read any cited file in that list.

STATUS: `ready-for-dev` — 6.27a (row `6-27-peer-mesh-sending-replies-and-date-of-death`) is `done` and MERGED (the 6.21b / 6.23b / 6.24b /
6.26b precedent); 6.27a's shared Task 0.4 author-commit is `2026-10-10-311`. ✅ Task 0 is DONE: BD1–BD3 answered by BigDev and committed
ALONE as `2026-10-13-326` (`7867314b`) — 6.27b may be built from the next commit ([[feedback_governance_commits_precede_implementation]]).
⚠ The two appended record lines Task 0.2 names (row 6-36's sprint comment, the deferred-work items) land WITH the code (Task 5). Runs in PARALLEL with 6.27d;
6.27c (sending) waits for BOTH.

⭐ THE RECORD is 6.27a's file: its rulings table, invariants, FOUND facts F1–F41 and the ONE decision block PM1–PM25. This file BUILDS the
PMs tagged **[b]**: **PM9**, **PM10**, **PM24**, PM25 (c)'s kinds half, and PM13's per-answer warning FLAGS. Where a summary below and
6.27a's text disagree, 6.27a's text is the record — EXCEPT where a BF below shows that the shipped 6.27a code moved a premise (each BF says
which PM sentence it qualifies; ⛔ none is re-read silently — [[feedback_supersede_never_reinterpret]]).

GLYPH REGISTER, ADDRESSING RULE: as 6.27a — `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` = hazard. ⛔ No `file:NNN`
into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite entry id + clause, item heading, row key).
LETTERS: `PM` / `F` = 6.27a's; **`BF`** = FOUND against 6.27a's build (this file); **`BD`** = this story's build decisions for BigDev (Task
0); `S` / `U` / `V` = 6.27a's review findings. `BF` / `BD` are used by ⛔ no earlier story (grepped `_bmad-output/` and `.decision-log.md`
2026-10-13).
-->

# Story 6.27b: A Neighbour's "Has Not Died" or Differing Date Is a Warning — Every Approver Gives a Reason, a Late One Waits for the District Admin, and Every Approver Sees the Answers `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS.** 6.27a lets the five neighbours answer and lets the District Admin see the answers. This story makes two of
> those answers **ask something of an approver**, under the ONE rule 6.23a built (`-264` FQ12): a neighbour saying the member **has not
> died**, and a neighbour's date **two or more calendar days** from the accepted certificate's (`-263` FQ10 A, `-262` FQ8 E). Approving
> while one shows needs a chosen reason and a written note — from the District Admin and from every later approver (`-277` Q2 C); one that
> appears after the District Admin approved makes the final approval **wait** for the District Admin (`-303` Q2 A; for a claim the special
> panel has after the month's vote, the special panel's approval — `-324` A) and lists the claim in their correction queue. And — because
> a later approver must write a reason about answers they can SEE — every approver at the claim's current step reads the neighbours'
> answers for that claim (PM24). ⭐ **A neighbour's answer never refuses a claim.**

> ⭐ **What already ships and 6.27b READS or EXTENDS — rebuild ⛔ none of it:**
> · **The warnings machinery** — `packages/domain/src/claim/approval-warnings.ts`: `APPROVAL_WARNING_KINDS` (`:111-117`, six kinds), the
>   ONE rule, the WAIT (`assertLateWarningsCovered`, `:907-917`, the LAST conjunct of `assertClaimApprovable`), the two readers
>   (`readClaimApprovalWarnings` `:434`, `readClaimApprovalWarningsBulk` `:575` → `readClaimApprovalWarningsSlice` `:587`), ONE pure
>   derivation (`deriveClaimApprovalWarnings` `:746-820`), the 6.26b pattern to copy (`deathFactColumnsSql()` `:379-425`,
>   `deriveDeathFactWarningKeys` `:253-283`). ⭐ Two KINDS are added — ⛔ never a rule, ⛔ never an edit to the assertion (NW1).
> · **The correction queue** — `packages/domain/src/claim/correction-queue-read.ts`: the hoisted `lateArm` (`:161-194`, FOUR sources),
>   `qualifyingRows` (`:332-419`), `readLateWarningArm` under a SAVEPOINT (`:421-441`).
> · **6.27a's substrate** — tables `claim_peer_mesh_replies` / `claim_peer_mesh_reply_answers` (migrations 0156–0158); the actor-aware
>   assembler `assemblePeerSection` (`apps/api/src/modules/claims/peer-answers-assembler.ts:70-207`); the hide predicate
>   `isPeerSectionHiddenFromActor` (`packages/domain/src/claim/peer-mesh-reply.ts:622-634`); the console's answers read
>   `readPeerAnswersForClaim` (`peer-mesh-reply.ts:539-596`); the questionnaire vocabulary `PEER_MESH_WARNING_QUESTION_KEYS` /
>   `HAS_DIED_CODES` (`packages/domain/src/questionnaires/keys.ts:23`, `:47`); the answer window (`claim/answer-window.ts`).
> · **The console's stitch precedent** — 6.26b's `stitchDeathFactFlags` (`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:637`,
>   after `readApprovalWarningsSection` `:546-610`): flags computed from the warnings read AFTER both sections exist, `null` on a failed
>   read — ⛔ never a new read.
> · **The four later-approver hosts** of `LaterApprovalWarnings` (BF7) and the shared summary `toApprovalWarningsSummary`
>   (`apps/api/src/modules/claims/later-approval-warnings.ts:121`).

## Story

As **the District Admin, and every approver after me** (in v1 a Pariwar Admin acting as Trustee-Lite at the final vote, an R9 vote, the
escalation or the no-correction approval, and the Super Admin) —
I want **to be warned when a neighbour says the member has not died or gives a date more than a day from the certificate's, and to see the
neighbours' answers for the claim I am approving**,
so that **⛔ no claim a neighbour disputes is approved without a named person's chosen reason and written note — while ⛔ no family is ever
refused because of a neighbour's answer.**

## The rulings this part builds (from 6.27a's table)

`-263` FQ10 A · `-262` FQ8 E · `-264` FQ12 · `-277` Q2 C / Q3 B · **`-303` Q2 A** (the late wait — discharges `-279` A6 for row 6-27, its
Consequence 1) · **`-324` A** (for a claim the special panel has after the month's vote, *"the final approval"* is the special panel's — R9
finalize waits) · `-261` C3 (⛔ never inherited) · `-282` GI7 / `-281` Q1 B (precedents) · `-305` §1 (c) (the real later approvers) ·
`-308` (each answer's source — see BD1) · `-325` S1 A (`-308`'s 6.27a half handed to row 6-36; *"6.27b PM24's share of `-308` is
unchanged"*).

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS two conjuncts to an existing benefit-gating predicate** (the approval-warning rule) — conjuncts on the FORM an approval
must take (a reason + a note) or a WAIT, ⛔ never a conjunct of the approval GATE (6.27a Invariant 1, Trap 3). Build them EXACTLY as 6.27a
words them:
- **P1 (`peer_says_not_died`):** *"If one of the members the Trust asked about a death answers that the member has not died, anyone
  approving the family's claim must choose a reason and write a note; and if that answer arrives after the District Admin approved, the
  claim waits until the District Admin has done so — a neighbour's answer never refuses the claim."* — `-263` FQ10 A + `-264` FQ12 + `-303`
  Q2 A (+ `-324` A for the special panel): ✅ consistent.
- **P2 (`peer_death_date_differs`):** *"If one of the members the Trust asked gives a date of death two or more days away from the date on
  the certificate the Trust accepted, anyone approving the family's claim must choose a reason and write a note, with the same wait —
  never a refusal."* — `-262` FQ8 E + FQ12: consistent; ⚠ *"two or more days"* is OUR reading of *"more than a day"* (disclosed to the
  Panel in the first routing note's "ours" list).
- ⭐ **The blind-first filter (PM25 (c)) and the approvers' view (PM24) add ⛔ no predicate:** the filter changes only what ONE actor's
  console strip and queue row SHOW; the gate, the wait and the ONE rule still read every key (Task 4.4 proves it). PM24 is a read.
- **Niyamavali check:** §6.2 (*"The Trust verifies the qualifying event …"*) — consistent; ⛔ no clause mentions neighbours or the peer
  mesh (6.27a, grepped 2026-10-10); the Niyamavali is ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## The decisions this part builds (6.27a is the record; `2026-10-10-311` committed them)

- **PM9** — the kinds `peer_says_not_died:<answer_id>` and `peer_death_date_differs:<answer_id>` (keyed by the LIVE answer row — a
  changed answer is a NEW key), APPENDED at the END of `APPROVAL_WARNING_KINDS` (after 6.28's `other_claim_for_death` — six → eight; ⛔ not
  in `NOMINEE_VERSION_WARNING_KINDS`); derived OUTSIDE the `postDeath` block; ONE SQL fragment `peerReplyColumnsSql()` in BOTH readers
  selecting codes and `text` indexes ONLY; ONE exported pure helper; they ENTER the wait; the pin test's generic message gains the
  discharge. ⚠ RECORDED: ANY current neighbour key makes the District Admin's approval unrevisable (F20).
- **PM10** — the correction queue's FIFTH source (6.28 OP5 took the fourth): ONE hoisted disjunct in `lateArm`, `pariwar_id`-joined, live
  warning-question rows, `saved_at > v.decided_at` — ⛔ no window term, ⛔ no change to the scan states.
- **PM24** — `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers` through 6.27a's `assemblePeerSection`, the step
  disjunction, audited, the panel on the four hosts (Task 3).
- **PM13's per-answer warning flags** — on the console and on PM24's panel, from the WARNINGS read (the same keys the rule uses — ⛔ never a
  second computation); a failed read ⇒ `null` (*"could not be checked just now"*), ⛔ never `false` (6.27a Invariant 8).
- **PM25 (c), the kinds half** — for an actor the section is hidden from (an UN-completed assignment and ⛔ no completed FULL visit), the
  two peer kinds are FILTERED out of that actor's console decision strip and correction-queue row.

## ⭐ FOUND against 6.27a's build (BF1–BF16; verified at `560369a7`; they decide ⛔ nothing — each says what it feeds)

**The kinds (PM9):**
- **BF1 — the kinds pin and its message.** `approval-warnings.test.ts:56-71` (`toEqual` at `:63-70`, six kinds); the GENERIC message
  `:60-62` already carries 6.28's discharge (*"Story 6.28 OP5 — `2026-10-11-318` Q1 A … and `-319` (`-279` A6 discharged) — for
  `other_claim_for_death`"*); `NOMINEE_VERSION_WARNING_KINDS` head pin `:73-76`. Contracts mirror
  `packages/contracts/src/claims/verification-decision.ts:121-138` (`APPROVAL_WARNING_KINDS` `:130-136`, the enum `:137`); lockstep
  `packages/contracts/tests/claims-verifier-decision.test.ts:225-227` ⇒ Task 1.1.
- **BF2 — the vocabulary already exists in a TRUE leaf.** `questionnaires/keys.ts` has ⛔ no imports; `PEER_MESH_WARNING_QUESTION_KEYS =
  ['has_died', 'death_date']` (`:23` — *"Read by 6.27b's SQL"*), `HAS_DIED_CODES` (`:47`, incl. `'not_died'`), `DATE_UNKNOWN_CODE` (`:51`).
  `approval-warnings.ts` may import `../questionnaires/keys.js` (⛔ never `questionnaires/index.js` — the barrel evaluates the registry and
  validator; `keys.js` is the leaf). The NW1 transitive scan (`approval-warnings.test.ts:340-388`; entries `:360-372`, SIX since 6.27a added
  `questionnaires/index.ts`; forbidden `:357` = `claim/events.ts`, `claim/nominee-name-check.ts`, `claim/nominee-lock.ts`) stays green;
  the header's safe-leaves list (`approval-warnings.ts:46-50`) gains `questionnaires/keys.ts` ⇒ Task 1.2.
- **BF3 — ⛔ no fence today says a fragment selects no `value_ciphertext`.** The decrypt fence's 6.23a test
  (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts:358-368`) forbids substrings in `approval-warnings.ts` /
  `approval-warnings-persist.ts` (`decrypt`, `nameCiphertext`, `mobileCiphertext`, `getMemberNominees`, `certificate_date_ciphertext`,
  `accepted_date_ciphertext`); `FENCED_FILES` is pinned `toBe(50)` (`:187`). ⇒ AC2's "fence assertion" = `'value_ciphertext'` added to
  that deny-list (⛔ no new file in `FENCED_FILES` — `approval-warnings.ts` is already fenced) ⇒ Task 1.6.
- **BF4 — the answers table, as built.** Live = `superseded_at IS NULL`; `value_codes text[]` (has_died: ONE plaintext code; death_date:
  `['unknown']` for *"I don't know the date"*, else NULL); `death_date_window_indexes text[]` (exactly 3 or NULL); indexes
  `claim_peer_mesh_reply_answers_claim_idx (pariwar_id, claim_case_id)` and `…_live_reply_idx (pariwar_id, reply_id) WHERE superseded_at IS
  NULL` (0156 `:187-188`). ⭐ The fragment filters by `(pariwar_id, claim_case_id)` ⇒ the CLAIM index serves both readers and the queue's
  disjunct (the record's *"`(pariwar_id, reply_id)` index"* note is superseded in effect by the claim index S6 asserted — ⚠ re-check the
  plan, Task 1.7). An edit stamps the old row superseded and inserts a NEW `answer_id` (PM7 (b)) ⇒ PM9's "a changed answer is a NEW key".
  A dependant answer whose condition stops holding (`has_died` → `not_sure`) is SUPERSEDED with ⛔ no live successor ⇒ its key vanishes.
- **BF5 — erasure NULLs the indexes.** 6.27a PM17 scrubs `death_date_window_indexes = NULL` on the DECEASED's erasure ⇒ a date key
  VANISHES on erasure; `value_codes` survive ⇒ a `peer_says_not_died` key SURVIVES. RECORDED, ⛔ not changed (an erased member's claim is
  closed or held elsewhere; the queue's exact check simply sees fewer keys).

**The console (PM13 flags, PM25 (c)):**
- **BF6 — the answer view carries ⛔ no `answer_id` and ⛔ no flag.** `PeerMeshAnswerView` (`packages/contracts/src/claims/verifier-console.ts:195-211`,
  `.strict()`): `questionKey`, `question`, `value`, `savedVia`, `savedAt`, `changeCount`. The assembler HAS the id (`PeerConsoleAnswerRow.answerId`,
  `peer-mesh-reply.ts:516`) and drops it (`peer-answers-assembler.ts:158-165`). Response schemas are PARSED by the serializer
  ([[feedback_story_validate_footguns]] #29) ⇒ a new REQUIRED field must be filled on EVERY path ⇒ Task 3b.
- **BF7 — the four hosts and their feeds** (all render `LaterApprovalWarnings` + `FinallyApprovedElsewhereBanner`):

  | Host | `LaterApprovalWarnings` | ids in scope | Feed (admin client → handler) |
  |---|---|---|---|
  | `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx` | `:321` (prefix `cf-${id}` `:111`) | `pariwarId` `:44`, `case_.claim_case_id` | `getCycleFreezePending` (`apps/admin/src/api/client.ts:2017`) → `getPending` (`claims.cycle-freeze.handlers.ts:324`, bulk `:343`) |
  | `apps/admin/src/modules/correction-closure/EscalationPanel.tsx` | `:321` in `DecisionForm` (only on *approve*) | `pariwarId`, `detail.closure.claim_case_id` | `getEscalatedClosure` (`client.ts:1740`) → `getEscalation` (`claims.correction-escalation.handlers.ts:132`, read `:180`) |
  | `apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx` | `:263` in `NoCorrectionStrip` | `pariwarId`, `item.claim_case_id` | `getClosureQueue` (`client.ts:1619`) → `getClosureQueue` (`claims.correction-closure.handlers.ts:477`, bulk `:492`) |
  | `apps/admin/src/modules/r9-voting/R9CasePanel.tsx` | `:463` (`surface="r9"`, guard `:461`) | props `pariwarId`, `claimCaseId` (`:86-90`) | `getR9Panel` (`client.ts:2068`) → `getPanel` (`claims.r9-voting.handlers.ts:303`, read `:329`) |

  ⭐ `PendingCaseCard` is one card of a list of up to 1,500 claims (3 buckets × `PENDING_SCAN_CAP = 500`, `approval-warnings.ts:551-557`) ⇒
  PM24's panel must ⛔ not fetch per card on render (1,500 GETs, 1,500 audit lines, up to 1,500 × 5 KYC decrypts) ⇒ the panel is a
  collapsed disclosure that fetches ONCE, on open (Task 3.5).
- **BF8 — `PeerMeshView` is private.** `function PeerMeshView` at `apps/admin/src/modules/claim-verification/SignalsPanel.tsx:208` is ⛔ not
  exported. PM24's panel must render the SAME view (so the console and the four hosts can ⛔ never drift, and so row 6-36's source line —
  BD1 — lands on both) ⇒ extract it to `PeerMeshView.tsx`, exported from `claim-verification/index.ts` (Task 3.5).
- **BF9 — the console's warnings section and the hide.** `readApprovalWarningsSection` (`claims.verifier-console.handlers.ts:546`) is run
  LAST (`:386`, ⛔ no SAVEPOINT); the peer section runs earlier through `assemblePeerMesh` (`:816-858`), which returns `undefined` when
  `assemblePeerSection` says `hidden` — INCLUDING when the hide check itself FAILED (fail CLOSED; review V11's accepted trade-off). ⭐ So
  the warnings section already KNOWS the actor's hide state with ⛔ no new read (`peerMesh === undefined`). `VERIFIER_CONSOLE_MAX_READS = 26`
  (`:218`) is ⛔ not moved by this story (⛔ no new console read — the flags are stitched).
- **BF10 — the strip's fields that could leak a hidden kind.** The section (`:575-592`) carries `kinds`, `uncoveredSinceApproval`,
  `reviseBlocked` (from `w.kinds.length > 0`), `viewerCanRecordLateReason` and `lateKeysUncoveredForViewer` — EVERY one is computed from
  `w.keys` / `w.kinds` ⇒ PM25 (c)'s filter must run on `w` BEFORE all five, ⛔ not only on `kinds` (a count of 1 with ⛔ no kind line would
  itself say "a neighbour said something") ⇒ Task 4.1.

**The queue (PM10, PM25 (c)):**
- **BF11 — the queue's consumer and its contract.** `listClaimsUnderCorrection` (`correction-queue-read.ts:288`) is called ONCE, by
  `getClaimsUnderCorrection` (`apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts:439`, call `:465`) for `GET
  /api/v1/p/:pariwarId/admin/claims/under-correction` (`claims.nominee-name-check.routes.ts:184`), gated by `claim.view_nominee_name_check`
  at district scope + per-row `isVisible` (handlers `:451-457`); wire fields `late_warning_awaiting_reason` / `late_warning_uncovered_count`
  (handlers `:587-588`); the contract's refinement (`packages/contracts/src/claims/nominee-name-check.ts:430`) requires awaiting ⇔ (count
  `null` or `> 0`) ⇒ the filtered count must keep that equivalence. UI: `apps/admin/src/routes/CorrectionQueueRoute.tsx:205-248` (⛔ no
  change — the row's meaning is the same).
- **BF12 — the stale comments PM10 amends.** The `lateArm` comment (`correction-queue-read.ts:141-160`) lists FOUR sources but its lead line (`:144`) still says *"THREE sources now"*; the
  `lateWarningAwaitingReason` doc-block (`:84-93`, *"THREE sources"* at `:90`) too; the module header (`:13-17`) still says the third reason is a
  *"nominee-change warning key"*. All three are AMENDED (⛔ never deleted) to FIVE sources / *"a current warning key"*.
- **BF13 — a certificate re-review keeps a date key's SUBJECT.** PM9 keys by `answer_id`, ⛔ not by review ⇒ a key covered at approval
  stays covered when a re-review moves the accepted date to ANOTHER differing date (the 6.26b GI6 / `-288` K4 precedent); a re-review that
  moves it from EQUAL to differing RAISES a new (late) key — the queue lists it through arm (1) only once a NEW determination is decided
  (`nd.decided_at > v.decided_at`); until then `assertClaimApprovable` refuses the final approval on the out-of-date determination anyway
  (`-279` A3; `approval-warnings.ts:25-32`). ⇒ AC5's leg (d) re-reviews AND re-determines (the 6.26b `rereviewAndRedetermine` helper,
  `packages/domain/tests/integration/claim/approval-warnings-death-facts.spec.ts:123`).

**PM24 (the approvers' read):**
- **BF14 — the keys, re-verified.** `cycle.freeze` and `claim.r9_vote` are `pariwar_admin`'s (`packages/domain/src/rbac/roles.ts:386,395`);
  `claim.decide_escalated_closure` and `claim.review_escalated_closure` are `super_admin` ONLY (`packages/domain/src/rbac/permissions.ts:739-741`);
  `super_admin` holds every key. The escalation DETAIL route is gated by `claim.review_escalated_closure`, the DECISION by
  `claim.decide_escalated_closure` (`claims.correction-escalation.routes.ts:60-61,86-89,113-116`); the no-correction approval by
  `cycle.freeze` (`claims.correction-closure.routes.ts:86,185-188`). ⇒ PM24's first hook `cycle.freeze` (pariwar) admits exactly
  `pariwar_admin` and `super_admin` — every v1 later approver.
- **BF15 — "an open CORRECTION escalation" has ONE definition.** `readEscalatedClosureDetail` (`packages/domain/src/claim/correction-closure-read.ts:242`)
  returns non-null only for a closure in `CLOSURE_HELD_STATES = ['escalated', 'under_review']`
  (`packages/domain/src/schema/claim_correction_closure.ts:39`) joined to a live return decision — a CLOSURE state, ⛔ not
  `claims.current_state`. "A live R9 routing" = `hasLiveRoutedRow` (`packages/domain/src/claim/r9-routing.ts:48`). ⇒ PM24's arms reuse both
  (⛔ never a copied state list).
- **BF16 — the call-back number is consented to ONE named person.** The ruled question reads *"May the District Admin phone you about
  this?"* (`packages/i18n/locales/en/claim.json:209`; `-304` Q6 A's list). `assemblePeerSection` DECRYPTS and SHOWS the number on a "yes"
  (`peer-answers-assembler.ts:171-194`) and calls `onCallbackMobileShown` ⇒ reusing it UNCHANGED for PM24 would show a neighbour's mobile to
  a Pariwar Admin or the Super Admin — wider than the words the neighbour agreed to ⇒ **BD2** (✅ answered (B) — shown; see BD2).

## ⚖️ Build decisions BD1–BD3 (✅ ANSWERED by BigDev 2026-10-13 at `bmad-create-story 6.27b` — Task 0.1; ✅ COMMITTED ALONE as `2026-10-13-326` (`7867314b`) — Task 0.2)

§0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): all three are the AUTHOR's — BD1 is *which story builds* a line already
decided (`-308`); BD2 is which STAFF see a number staff already see (the District Admin, the district's verifiers and the Super Admin
see it on the console today — BF16); BD3 is what a staff count means. ⛔ None changes what a member, a family or a nominee sees or is owed.
⚠ BD2 as answered rests on BigDev's reading of the member's SIGNUP consent (below) — recorded as an author reading, ⛔ never as counsel's
basis ([[feedback_record_unattested_no_backfill]]).

- **BD1 — `-308`'s 6.27b share: each answer's SOURCE ("chosen from the workplace" / "named by the member") on PM24's panel.** The source
  cannot exist until row `6-36-peer-mesh-school-wise-selection` stores it (`-325` S1 A — *"⛔ No nullable column now"*); 6.27b lands BEFORE
  6-36 (only 6.27c waits for 6-36). ⚠ Left as written, 6.27b owes a line it cannot build and 6-36's sprint comment says *"6.27b PM24 shows
  it too"* — a circular deferral ([[feedback_circular_deferral_between_sibling_stories]]).
  - ✅ **ANSWERED (A)** — BigDev: *"Hand off to 6-36"*. **(A) — recommended:** HAND OFF structurally — 6.27b renders PM24's panel through the SAME extracted `PeerMeshView` (BF8) and the SAME
    `PeerMeshPingView` wire type, so the source line row 6-36 adds to them appears on the console AND on all four hosts by construction;
    row 6-36 owns the line, its wire field and a test on BOTH surfaces; 6.27b builds ⛔ no source line. Cost: 6-36's row gains one more
    surface to test; until 6-36, ⛔ no surface shows a source (as today).
  - (B) 6.27b waits for row 6-36. Cost: the warnings, the wait and the approvers' view — the safety pieces 6.27c is ordered after — wait
    for a school-selection story that has ⛔ no story file yet.
  - (C) a nullable source column now. Cost: refused by `-325` S1 A in so many words.
- **BD2 — the call-back number on PM24's panel (BF16).** ✅ **ANSWERED (B), on BigDev's basis** — BigDev, in session: *"When member
  signup to TWT, he cosented TWT to make a call, send SMS, WhatsApp, etc,. And Pariwar Admin, super admin, district admin being part of TWT
  are eligible to make a call without requiring further permission."* (asked after being shown who sees the number today: the District
  Admin and the district's verifiers through `claim.verify`, the Super Admin through every key; ⛔ not the Pariwar Admin). ⇒ PM24's panel
  SHOWS the number on the SAME condition as the console — ONLY when the neighbour answered *"Yes"* to `callback_consent` (⛔ never widened
  to a *"No"* or an unanswered question — that would be a further call) — and audits each showing. ⚠ RECORDED, ⛔ not resolved: the only
  signup-consent text found is the DRAFT privacy policy's *"Contact — Phone, email — Official communications, alerts, support — Consent;
  contract performance"* row (legal corpus, outside this repo — [[project_legal_corpus_private_repo_split]]; the draft still carries
  `[[…]]` placeholders); whether *"official communications"* covers a staff call to a NEIGHBOUR about ANOTHER member's death claim is ⛔ not
  confirmed by counsel ([[project_dpdpa_counsel_engaged_but_unrecorded]]). ⛔ No go-live row is added by this story; Row 27 (a)'s counsel
  question (telling five members of a death) is the nearest open item and is ⛔ not widened here.
  - (A) WITHHELD (⛔ not taken). PM24's read passes `callbackMobile: 'withhold'` to the assembler (a new REQUIRED option): ⛔ no
    mobile ciphertext is decrypted, ⛔ no `onCallbackMobileShown` fires, and `callbackMobile` is `{ status: 'none' }`. The later approver
    still SEES the neighbour's *"Yes"* answer to *"May the District Admin phone you about this?"* — the console (District Admin) is
    unchanged. Cost: a Pariwar Admin who wants to phone a neighbour asks the District Admin.
  - **(B) — TAKEN:** shown, audited as on the console. Cost (as put): discloses a neighbour's number to people the neighbour did ⛔ not agree to be phoned by —
    arguably a counsel / Panel question (a disclosure beyond the ruled words), which this story would then have to route.
- **BD3 — "changed N times" (6.27a review S10, deferred to 6.27b PM24).** `changeCount = versions − 1` counts EVERY earlier row of the
  question — including one SUPERSEDED as a dependant (a date removed when `has_died` became *"not sure"*) and a re-entry of the same value
  (`peer-mesh-reply.ts:548-562`).
  - ✅ **ANSWERED (A)** — BigDev: *"Keep and record"*. **(A) — recommended:** KEEP the count and the words as built; RECORD the meaning — *"every earlier saved version of this answer,
    including one removed when an earlier answer changed"* — in the assembler's doc-block and the deferred-work item S10 (closed as
    "decided, ⛔ not changed"). Cost: a removal-and-re-entry reads as a change.
  - (B) count only edits of the SAME question by the neighbour. Cost: ⛔ no column today tells a dependant supersede from an edit ⇒ a
    migration on a table whose trigger 6.27a hardened over five review passes, for a staff hint.

## Acceptance Criteria

1. **AC1 — governance first.** ⛔ No 6.27b code before Task 0.2's author-commit (BD1–BD3 as answered) is COMMITTED ALONE — ✅ `2026-10-13-326` (`7867314b`); 6.27a `done` ✅.
2. **AC2 — the two kinds** (PM9): `peer_says_not_died:<answer_id>` for every LIVE `has_died` answer whose code is `not_died` (submitted or
   not; ⛔ no certificate needed); `peer_death_date_differs:<answer_id>` exactly when the live `death_date` answer has its three window
   indexes AND the claim has a current accepted review WITH an `accepted_date_index` AND that index is ⛔ none of the three — a ±1-day
   difference across a month / year / leap-day boundary is ⛔ not a warning, ±2 is; *"I don't know the date"* (`['unknown']`, ⛔ no indexes)
   ⇒ ⛔ no key; ⛔ no accepted certificate, or a pre-6.26b review (⛔ no index) ⇒ ⛔ no key; ⛔ never a key from another claim's answers (a
   refile — `-261` C3); an edited answer yields a NEW key; a superseded answer yields ⛔ none; the single and bulk readers agree (parity, incl.
   past one 500-id slice); the fragment selects ⛔ no `value_ciphertext` (BF3 fence). Both kinds are in the domain list, the contracts
   mirror (lockstep) and `kindLine` (⛔ no date in the words).
3. **AC3 — the one rule reaches every approver** — with a neighbour key showing, an un-reasoned approval is refused
   (`ApprovalWarningReasonRequiredError`) at the District Admin, the final vote, the escalation resolution, R9 vote and finalize (approve
   votes whose own rows miss the key are SHORT at finalize), the Super Admin's G1 decision and the no-correction approval — exactly as for
   6.26b's kinds; a REFUSAL, a return or an escalation is ⛔ never gated by a peer key; fixtures raise ⛔ no neighbour key by default.
4. **AC4 — a late neighbour answer waits for the District Admin** (`-303` Q2 A; `-324` A): an answer saved after the District Admin's
   approval makes the final vote, the escalation resolution, the no-correction approval, the Super Admin's G1 approval AND R9 finalize on an
   R9-routed `state_trustee_approved` claim refuse with `LateWarningReasonRequiredError` until the District Admin records a late reason;
   ANY current neighbour key makes the District Admin's approval unrevisable (F20 — recorded and tested, ⛔ not changed).
5. **AC5 — the queue lists it** (PM10), in SEPARATE COMMITTED transactions ([[project_db_clock_ordering_tests_tie]]): (a) an answer saved
   BEFORE the approval ⇒ ⛔ not a candidate (asserted on the FAULT path, with a control candidate proving the fault fired — never a count);
   (b) an answer saved AFTER the approval ⇒ listed, `lateWarningAwaitingReason: true`; (c) an EDIT after the approval of an answer covered
   at approval ⇒ listed; (d) a certificate re-review that moves the accepted date from equal to differing, then a re-determination ⇒ listed
   via arm (1) (BF13); (e) leg (b) on an R9-routed `state_trustee_approved` claim ⇒ listed. Red-checks per Task 2.4.
6. **AC6 — every approver sees the answers** (PM24): the role × step matrix — a Pariwar Admin at `verifier_approved` / `reversed` /
   `state_trustee_freeze` (`cycle.freeze`); an R9 voter on a claim with a live R9 routing (`claim.r9_vote`), in ANY state incl.
   `state_trustee_approved`; the Super Admin on a claim with an open correction escalation (`claim.decide_escalated_closure`) — get the
   answers; a District Admin / verifier (⛔ no `cycle.freeze`) ⇒ 403 at the hook; every other state ⇒ 404 (incl. `verification_in_progress` /
   `verifier_review` with ⛔ no routing, `state_trustee_approved` with ⛔ no live routing, every closed / refused / appeal state, an unknown
   claim, another Pariwar's claim); the read is audited once (⛔ no answer, ⛔ no name, ⛔ no number in the line); the call-back number per
   BD2 (B) — shown on a *"Yes"* only, each showing audited; the panel renders on the four hosts as a disclosure that fetches only when opened.
7. **AC7 — the blind-first rule holds in the warnings** (PM25 (c)): an actor holding an un-completed assignment with ⛔ no completed FULL
   visit sees ⛔ neither peer kind on the console's decision strip — ⛔ nor in its counts, `reviseBlocked`, `viewerCanRecordLateReason` or
   `lateKeysUncoveredForViewer` (BF10) — ⛔ nor in their correction-queue row (a row late ONLY by a peer key is ⛔ not listed for them); a
   `certificate_check` completion alone does ⛔ not lift it; once they complete a FULL visit, all appear; a DIFFERENT District Admin sees them
   throughout; the GATE still sees every key (an approval over a hidden peer key is still refused without a reason).
8. **AC8 — the per-answer flags** (PM13's flags): on the console AND on PM24's panel, every live `has_died` / `death_date` answer carries
   `warningFlag` — `true` ⇔ its key is current, `false` ⇔ the warnings read saw it and it carries ⛔ no key; `null` (*"could not be checked
   just now"*) when the warnings read FAILED or did ⛔ not see that answer (it was saved between the two reads); every other question's
   answer is `false` (it can ⛔ never warn — CF3 (b)); ⛔ never `false` for an unknown — a test FORCES the read to fail.
9. **AC9 — gates and records:** the new route file classified in `COVERAGE_SET` with `expectedMethods: ['get']`; the new
   `AuthAuditEventType` member; the import-discipline scan green with `questionnaires/keys.ts` as a safe leaf; `kindLine` words with ⛔ no
   date (`apps/admin/tests/verifier-console.test.tsx:422-436`); contracts mirror + lockstep + contracts vitest; microcopy scan;
   `pnpm ci:local` green (with `:5433`).

## Tasks / Subtasks

- [ ] **Task 0 — governance and re-pin (AC1).**
  - [ ] 0.0 `git fetch origin` ([[feedback_git_fetch_before_remote_reasoning]]); `git diff --name-only 560369a7..HEAD -- packages apps
    scripts infra` — re-read every cited file in that list; if 6.27d merged first, rebase and re-read `correction-queue-read.ts`,
    `approval-warnings.ts`, `peer-answers-assembler.ts` and the console handler (6.27d touches the inspection's completion, ⛔ not the warnings —
    but confirm). Work on `story/6-27b` ONLY ([[feedback_commit_on_story_branch]]); check the branch before every commit
    ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [x] 0.1 BigDev answers BD1–BD3 (in session) — ✅ 2026-10-13: BD1 A, BD2 B (on the signup-consent reading, recorded above), BD3 A.
  - [x] 0.2 ✅ `2026-10-13-326`, committed ALONE (`7867314b`, 2026-10-13). ONE author-commit to `.decision-log.md` (next free id; stage in the scratchpad, then insert — [[project_decision_log_writes_user_inserted]]):
    BD1–BD3 as answered (BD2 with BigDev's words and the RECORDED gap verbatim); for BD1 (A) it AMENDS `-308`'s Consequences / `-325` S1 A's *"6.27b PM24's share … unchanged"* IN PART by
    supersession (⛔ never edited — [[feedback_supersede_never_reinterpret]]); for BD3 it closes 6.27a review S10. Commit ALONE, before any
    code. Then, in the SAME later code commit's records: row 6-36's sprint comment and the deferred-work item *"`-308`'s 6.27a share …
    HANDED OFF to row 6-36"* gain an appended line naming the new entry (BD1 (A): *"6-36 also renders it on PM24's panel — the shared
    `PeerMeshView`; a test on both surfaces"*) — ⛔ never rewritten.
- [ ] **Task 1 — the kinds (AC2, AC3, AC4; PM9).** `packages/domain/src/claim/approval-warnings.ts`
  - [ ] 1.1 Append `'peer_says_not_died'`, `'peer_death_date_differs'` to `APPROVAL_WARNING_KINDS` (`:111-117`, at the END); export
    `PEER_WARNING_KINDS = ['peer_says_not_died', 'peer_death_date_differs'] as const`; the doc-block above the list gains the 6.27b line
    (`-303` Q2 A, its Consequence 1 discharging `-279` A6; `-324` A for the special panel). The pin (`approval-warnings.test.ts:63-70`) gets the
    eight kinds; its GENERIC message (`:60-62`) KEEPS 6.28's sentence and ADDS *"Story 6.27b — `2026-10-10-303` Q2 A (its Consequence 1) for
    `peer_says_not_died` / `peer_death_date_differs`"*. Contracts mirror (`verification-decision.ts:130-136`) + its lockstep; then
    `pnpm --filter @twt/contracts test` ([[project_contracts_tests_outside_tsc]]).
  - [ ] 1.2 Import `PEER_MESH_WARNING_QUESTION_KEYS` and the `HasDiedCode` type from `../questionnaires/keys.js` (BF2 — ⛔ never the barrel);
    add `questionnaires/keys.ts` to the safe-leaves comment (`:46-50`).
  - [ ] 1.3 `peerReplyColumnsSql()` — ONE fragment, beside `deathFactColumnsSql()`, aliasing the outer claim `c` (both readers already do):
    ```sql
    (SELECT json_agg(json_build_object('id', pa.answer_id, 'key', pa.question_key,
                                       'codes', pa.value_codes, 'window', pa.death_date_window_indexes)
                     ORDER BY pa.answer_id)
       FROM claim_peer_mesh_reply_answers pa
      WHERE pa.pariwar_id = c.pariwar_id
        AND pa.claim_case_id = c.claim_case_id
        AND pa.superseded_at IS NULL
        AND pa.question_key IN (<PEER_MESH_WARNING_QUESTION_KEYS, as bound params>)) AS peer_answers
    ```
    ⛔ never `value_ciphertext`, ⛔ nor any other column; raw SQL with explicit aliases ([[project_epic6_drizzle_correlated_subquery_bug]]); the
    own-claim filter IS the `-261` C3 rule (a refile's answers live on the refile's claim id). Selected by `readClaimApprovalWarnings`
    (after `deathFactColumnsSql()`, `:504`) AND `readClaimApprovalWarningsSlice` (`:612`). `RawWarningsRow` (`:334-367`) gains
    `peer_answers: { id: string; key: string; codes: string[] | null; window: string[] | null }[] | null`.
  - [ ] 1.4 The pure helper — exported, the `deriveDeathFactWarningKeys` pattern:
    `derivePeerReplyWarningKeys({ answers, currentAcceptedDateIndex })` → `{ keys, kinds, flags: ReadonlyMap<answerId (lower-case), boolean> }`.
    `has_died`: key ⇔ `codes` equals `['not_died']` (typed `'not_died' satisfies HasDiedCode`). `death_date`: key ⇔ `window` is 3 indexes
    AND `currentAcceptedDateIndex !== null` AND `!window.includes(currentAcceptedDateIndex)`. `flags` has ONE entry per selected answer
    (`true` ⇔ it produced a key). Keys via `approvalWarningKey` (it lower-cases the subject). Called by `deriveClaimApprovalWarnings` OUTSIDE
    the `postDeath` block, after the death facts (`:771-785`), with `currentAcceptedDateIndex = currentReview !== null ?
    row.current_accepted_date_index : null` (the SAME `cur` the death facts use — ⛔ never a second certificate read). `ClaimApprovalWarnings`
    gains `peerAnswerFlags: ReadonlyMap<string, boolean>` (doc: ⛔ never a key, ⛔ never a date; the console's stitch reads it — the
    `inspectionComparisons` precedent, `:318-323`).
  - [ ] 1.5 `withoutPeerWarnings(w)` — exported, pure: `{ ...w, keys: w.keys minus the two peer prefixes, kinds: w.kinds minus
    PEER_WARNING_KINDS }` (coverage ⛔ not touched — `uncoveredKeys` / `lateWarningKeys` / `lateKeysUncoveredFor` /
    `lateWarningNothingUncoveredFor` all iterate `w.keys`, `:830-972`). For DISPLAY only (Task 4) — ⛔ never called by the assertion, the
    wait or any writer (a source-scan leg: `withoutPeerWarnings` appears in ⛔ no file under `packages/domain/src/claim/` except its
    definition).
  - [ ] 1.6 Fence (BF3): `'value_ciphertext'` joins the deny-list at `nominee-name-no-comparison-fence.test.ts:363`; `FENCED_FILES` stays
    `toBe(50)`.
  - [ ] 1.7 ⚠ The bulk reader runs in the cycle-freeze page path (≤ 1,500 ids in 500-id slices): `EXPLAIN` one slice on `:5432` with seeded
    answers — the fragment must use `claim_peer_mesh_reply_answers_claim_idx` (BF4); record the plan's node in the Debug Log.
  - [ ] 1.8 Tests — unit (`approval-warnings.test.ts`): a table over `derivePeerReplyWarningKeys` — `not_died` / `died` / `not_sure` /
    `did_not_know`; a date equal, −1, +1, −2, +2 (window indexes built by a TEST index fn — ⛔ never real dates compared); `['unknown']`; ⛔ no
    current review; a pre-6.26b review (`null` index); two answers ⇒ two keys; flags. `withoutPeerWarnings` (keys, kinds, every other kind
    kept). Live (`packages/domain/tests/integration/claim/approval-warnings-peer-reply.spec.ts`, NEW): the parity of the two readers over
    every leg (the `expectParity` shape, `approval-warnings-death-facts.spec.ts:184-191`, incl. `peerAnswerFlags`) and once past 500 ids;
    a ±1 across `2024-02-29`/`2024-03-01`, `2025-12-31`/`2026-01-01`, a month end; an edit ⇒ the old key gone, a NEW key; a dependant
    supersede (`has_died` → `not_sure`) ⇒ the date key gone; a refile's claim carries ⛔ no key from its source claim's answers (two claims,
    same deceased, answers on the first only); the BF13 re-review leg. ⚠ **Index trap:** the domain fixture's certificate index is
    `fixtureDeathDateIndex(date)` (`packages/domain/tests/integration/_helpers.ts:1042`) — the neighbour's window MUST be built with the
    SAME function (`[−1, 0, +1].map(d ⇒ fixtureDeathDateIndex(addCalendarDays(D, d)))`); 6.27a's `prep` helper uses `idx:${d}`
    (`peer-mesh-reply.spec.ts:110-121`), which compares `differs` against EVERY certificate.
- [ ] **Task 1b — the rule at every approver (AC3, AC4).** ⛔ No writer changes (F16 — the wait has ⛔ no per-kind filter). Live API legs in
  `apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts` (the 6.26b block `:915-1010` is the model: a per-kind loop at
  the District Admin, then the late legs), one `peer_says_not_died` and one `peer_death_date_differs` world each: the District Admin refused
  without a reason, accepted with one; the cycle-freeze vote (`:363`, `:407`), escalation resolution (`:479`), R9 vote / finalize (`:613`,
  `:663` — a vote whose own row misses a late peer key is SHORT), D27 no-correction approval (`:748`), Super Admin G1 (`:806`); the LATE
  leg for each (`LateWarningReasonRequiredError`, then a District Admin late reason, then the approval passes); R9 finalize on an R9-routed
  `state_trustee_approved` claim (`-324` A); F20 (a revise refused while a peer key is current — `warning_approval_final`); a refusal and an
  escalation with a peer key showing ⇒ ⛔ not gated. Seed answers through the REAL member PUT route (the `put` helper,
  `peer-answers-console.spec.ts:89-98`, and its `seedClaimWithPings` `:50-87` — LIFT both into a shared
  `apps/api/tests/integration/_peer-reply-fixture.ts`, ⛔ never copy them) so the real index helper (`deathDateBlindIndex`,
  `ground-inspection-crypto.ts:63`) builds BOTH sides. ⚠ The certificate's accepted date and the neighbour's date must be built by the SAME
  index helper with the SAME Pariwar key.
- [ ] **Task 2 — the queue (AC5; PM10).** `packages/domain/src/claim/correction-queue-read.ts`
  - [ ] 2.1 ONE hoisted disjunct inside `lateArm`'s `OR` list (`:161-194`), after `otherOpenClaimForDeathExistsSql`:
    `OR EXISTS (SELECT 1 FROM claim_peer_mesh_reply_answers pa WHERE pa.pariwar_id = v.pariwar_id AND pa.claim_case_id = v.claim_case_id
    AND pa.question_key IN (<the domain list>) AND pa.superseded_at IS NULL AND pa.saved_at > v.decided_at)` — used by the column AND the
    WHERE through `lateArm` (⛔ never two copies); ⛔ no window term (6.27a PM8 / PM10 — the scan states + the R9 arm already equal the
    window, and answers exist only in-window); ⛔ no change to the scan states. ⚠ `saved_at` is `clock_timestamp()` (PM7 (a)) and the save
    takes the CLAIM lock first (6.27a Invariant 9) ⇒ a save racing an approval commits AFTER it with `saved_at > v.decided_at` (Trap 13).
  - [ ] 2.2 Comments amended, ⛔ never deleted (BF12): the `lateArm` list gains *"(5) ⭐ Story 6.27b PM10 (`-303` Q2 A) — a LIVE answer to
    a warning question saved after the approval: a `peer_*` key can APPEAR (a new or edited answer) with ⛔ no other row moving; ⛔ no time
    term beyond it — `qualifyingRows`' exact check drops a covered or non-warning answer (*'died'*, *'unknown'*, an equal date)."*; the
    `lateWarningAwaitingReason` doc-block's *"THREE sources"* → FIVE (listing them); the header's third reason → *"a CURRENT warning key"*.
  - [ ] 2.3 NEW own-committing spec `packages/domain/tests/integration/claim/correction-queue-late-peer-reply.spec.ts` — the
    `correction-queue-late-inspection.spec.ts` construction (`onOwnTx` `:125-140`, `freshPariwar()` `:118`, superuser seed `:93-107`,
    `finalVoteWaits` `:197`): AC5's legs (a)–(e), each step its OWN committed transaction; the save through `savePeerAnswer` (domain,
    `peer-mesh-reply.ts:359`) with the Task 1.8 index fixture; cleanup by this suite's claim ids. ⛔ Never inside one `setupLiveDb`
    BEGIN/ROLLBACK envelope (there every `now()` ties — [[project_db_clock_ordering_tests_tie]]).
  - [ ] 2.4 Red-checks (revert the line, watch it fail, restore — record each in the Debug Log): (b) red when the disjunct is deleted; (a)
    red when the comparator is reversed (`<`); (e) red when the R9 admission's `liveRoutedToR9Exists()` is deleted; (c) red when
    `superseded_at IS NULL` is dropped AND the edit's old row is the one tested. ⚠ A leg that survives its red-check is hollow.
- [ ] **Task 3 — the approvers' read (AC6; PM24, BD1, BD2).**
  - [ ] 3.1 Assembler (`peer-answers-assembler.ts`): ⛔ no behaviour change (BD2 (B) — PM24 shows the number on the SAME *"Yes"*
    condition, through the SAME branch `:171-194`). Doc-block only: the header's *"the console route emits the audit lines"* gains *"and
    6.27b's approvers' read (PM24) — each with its OWN event"*; BD3's recorded meaning of "changed N times" beside `changeCount` (`:164`).
  - [ ] 3.2 Domain predicate for the step disjunction — ⛔ no new state list: the handler reads the claim's `current_state`
    (`claim.getClaimCase`, `packages/domain/src/claim/read.ts:73`), `hasLiveRoutedRow` (BF15) and `readEscalatedClosureDetail(…) !== null`
    (BF15), then: state ∈ `['verifier_approved', 'reversed', 'state_trustee_freeze']` AND `rbac.hasPermission('cycle.freeze', pariwar)`; OR a
    live routing AND `hasPermission('claim.r9_vote', pariwar)`; OR an open escalation AND `hasPermission('claim.decide_escalated_closure',
    pariwar)` ⇒ allowed; else **404** (one answer for "⛔ not at a later step", "unknown", "another Pariwar"). Export the three-state list as a
    named constant beside `CORRECTABLE_SCAN_STATES`' neighbourhood ONLY if a second reader needs it (⛔ never prematurely —
    [[feedback_no_premature_package]]); otherwise a local `const` with a comment citing PM24. ⚠ RECORDED (PM24): in v1 every actor past the
    first hook holds all three keys ⇒ the disjunction reduces to STATE gating; and a Pariwar Admin may read in `state_trustee_freeze` while
    the Super Admin's G1 step is open — accepted (Invariant 7's "at that step" is per state).
  - [ ] 3.3 Route file `apps/api/src/modules/claims/claims.peer-answers.routes.ts` + `claims.peer-answers.handlers.ts`: `GET
    /api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers`, chain `[requireAdminSession, scopeResolutionHook,
    requirePermissionHook('cycle.freeze', { dimension: 'pariwar' })]` (the cycle-freeze route's hook shape, `claims.cycle-freeze.routes.ts:44,63`);
    the handler opens the request's scope tx like its siblings; `assemblePeerSection(enc, { …, actorId, onCallbackMobileShown: (pingId) =>
    shownPingIds.push(pingId), run: (label, read) => underSavepoint(client, `peer_answers_${label}`, read) }, () => {}, memberName)` — `run` REQUIRED (6.27a U11: a bare read leaves an aborted tx); `memberName` = the deceased's resolved
    name, exactly as the console resolves it for the question words; then the warnings read under its OWN `underSavepoint` (failure ⇒ every
    flag `null`) and the Task 3b stitch. Response (contract `packages/contracts/src/claims/peer-answers.ts`, NEW, re-exported):
    `ClaimPeerAnswersResponse = z.object({ peerMesh: PeerMeshSection.optional() }).strict()` — ABSENT when the assembler says `hidden`
    (PM25 (c) — ⛔ never a variant; the 6.27a contract precedent), `{ status: 'empty' }` for ⛔ no selection, `present` otherwise, and
    `{ status: 'unavailable' }` when the section throws. Register in OpenAPI (a single-object GET — `forced-pagination.spec.ts` exempts it by
    shape, `:58-63`).
  - [ ] 3.4 Audit: a new `AuthAuditEventType` member `'admin_claim.peer_answers_read'` (`apps/api/src/audit/audit-sink.ts:15-643`, with a
    doc comment), emitted through `emitAuthAudit(deps, request, …)` once per successful read (incl. `hidden` / `empty`); AND (BD2 (B)) a
    second new member `'admin_claim.peer_callback_mobile_shown'` emitted ONCE PER number shown (actor, `claim:<id>`, ping id — ⛔ never the
    number), only AFTER the response is built (6.27a review S17 — ⛔ never an audit line for a number the response then failed to deliver;
    the console's `admin_verifier_console.peer_callback_mobile_shown` precedent, `claims.verifier-console.handlers.ts:1212`); resource
    `claim:<id>`, context = the step arm that admitted (`final_vote` | `r9_vote` | `super_admin_approval`), the section status, and counts
    (pings, answers) — ⛔ never a name, an answer, a code, a date or a number; ⛔ never a direct `writeAuditEntry` (access-wrapper invariant
    (3), F40). A 404 is ⛔ not audited as a read.
  - [ ] 3.5 Admin: extract `PeerMeshView` (`SignalsPanel.tsx:208`) to `apps/admin/src/modules/claim-verification/PeerMeshView.tsx`,
    exported from `claim-verification/index.ts`; `SignalsPanel` imports it (⛔ no behaviour change — its tests stay green unchanged). NEW
    `NeighboursAnswersPanel.tsx` (same module): a collapsed disclosure *"Neighbours' answers"* (a `<details>`/button with `aria-expanded`)
    that calls the new client fn ONCE on first open (`apps/admin/src/api/client.ts` + a `useClaimPeerAnswers(pariwarId, claimCaseId,
    { enabled })` hook in `hooks.ts`), then renders `PeerMeshView` for `present`, *"No neighbour could be chosen"* for `empty` (6.27a's
    words), *"The neighbours' answers could not be shown just now"* for `unavailable` / a failed request, and ⛔ NOTHING — the disclosure
    itself removed — when `peerMesh` is absent (hidden). Mounted beside `LaterApprovalWarnings` on the four hosts (BF7) — in
    `EscalationPanel` and `PariwarClosureStrip` OUTSIDE the approve-only branches (the approver reads before choosing), keyed by claim id (the
    6.23b `EscalationDetail` keying lesson). English only (F22). ⛔ No fetch on render; ⛔ no fetch per card.
  - [ ] 3.6 Human-actor invariant: `COVERAGE_SET` entry (`scripts/claim-adjudication-human-actor-invariant/check.ts:46-246`, shape `:31-44`)
    `{ file: 'apps/api/src/modules/claims/claims.peer-answers.routes.ts', pathSubstrings: ['peer-answers'], owner: 'Story 6.27b',
    expectedMethods: ['get'] }`.
  - [ ] 3.7 Tests — API (`apps/api/tests/integration/claims/peer-answers-approvers.spec.ts`, NEW): AC6's matrix (each allowed arm; the 403;
    every 404 state incl. a live-routed `verifier_review` claim READABLE through the R9 arm); the audit line's exact context keys and ⛔ no
    content (`JSON.stringify` of the line contains ⛔ neither the neighbour's name, the date, nor the mobile); BD2 (B) — a neighbour who
    answered *"yes"* ⇒ `callbackMobile: { status: 'shown' }` for a Pariwar Admin AND ONE `admin_claim.peer_callback_mobile_shown` line
    (⛔ never the number in it); *"no"* / unanswered ⇒ `{ status: 'none' }` and ⛔ no such line; a failed section ⇒ ⛔ no such line; the hidden actor ⇒ `peerMesh`
    ABSENT and audited; a broken answer ciphertext ⇒ that answer `unavailable`, the rest shown; the warnings read forced to fail ⇒ flags
    `null`. Admin (`apps/admin/tests/neighbours-answers-panel.test.tsx`, NEW): ⛔ no request before open; ONE request on open; the four hosts
    mount it (one leg each); the hidden case renders nothing; the three status lines. Contracts: the response schema (strict; absent
    `peerMesh` valid).
- [ ] **Task 3b — the per-answer flags (AC8; PM13's flags).**
  - [ ] 3b.1 Contract: `PeerMeshAnswerView` (`verifier-console.ts:195-211`) gains REQUIRED `warningFlag: z.boolean().nullable()` with a
    doc-comment (*"`true` — this answer carries a current warning; `false` — checked, ⛔ none (and always for a question that can ⛔ never
    warn); `null` — could ⛔ not be checked just now (the warnings read failed, or the answer is newer than it)"*). Every contracts / admin /
    API fixture that builds the view gains the field (BF6 — parsed responses).
  - [ ] 3b.2 Assembler: the internal answer view keeps `answerId` (an UNSTITCHED type — the 6.26b `UnstitchedGroundInspectionItem` pattern,
    `claims.verifier-console.handlers.ts:617-626`); `answerId` is ⛔ never on the wire.
  - [ ] 3b.3 `stitchPeerAnswerFlags(section, read: { peerAnswerFlags: ReadonlyMap<string, boolean> | null })` — exported, pure, beside
    `stitchDeathFactFlags`: for each answer — question key ∉ `PEER_MESH_WARNING_QUESTION_KEYS` ⇒ `false`; `read.peerAnswerFlags === null`
    (failed read) ⇒ `null`; the id in the map ⇒ its value; ⛔ not in the map ⇒ `null` (BF9's two READ COMMITTED statements). Called by the
    console after the warnings read (`:386-392` neighbourhood — ⛔ no new read; `readApprovalWarningsSection` returns `peerAnswerFlags` like
    it returns `inspectionComparisons`) and by PM24's handler (Task 3.3).
  - [ ] 3b.4 Admin: `PeerMeshView` renders, per answer, *"⚠ Says the member has not died"* (`has_died`, `true`), *"⚠ More than a day from
    the date on the accepted certificate"* (`death_date`, `true`), *"Warning could not be checked just now"* (`null`), nothing for `false`;
    words in `i18n-en.ts`'s `peerMesh` block (`:93-130`) — ⛔ no date in any (extend the `verifier-console.test.tsx:422-436` no-date leg to
    them); microcopy scan clean.
  - [ ] 3b.5 Tests: the stitch as a pure table (all four branches × both questions × a non-warning question); console API leg — a
    `not_died` answer ⇒ `true`, `died` ⇒ `false`, the warnings read forced to fail (the 6.26b fault seam,
    `apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts:55` wraps the bulk reader — add the single reader the
    same way) ⇒ `null`; admin render legs.
- [ ] **Task 4 — the blind-first filter (AC7; PM25 (c)).**
  - [ ] 4.1 Console: `readApprovalWarningsSection(ctx, claimCaseId, claimState, reads, { peerHidden })` — `peerHidden = peerMesh ===
    undefined` (BF9; ⛔ no new read); when true, `w = claim.withoutPeerWarnings(w)` BEFORE every field (BF10). ⚠ RECORDED (BD-less, the V11
    trade-off it follows): `assemblePeerMesh` also returns `undefined` when the HIDE CHECK FAILED ⇒ on that transient fault a District
    Admin's strip omits a peer kind too; their approval is still refused by the ONE rule (the gate reads every key) and the next read
    shows it — ⛔ never an un-reasoned approval.
  - [ ] 4.2 Queue: `ListClaimsUnderCorrectionOptions` gains `hidePeerKindsForActor?: string`. In `readLateWarningArm` (inside its SAVEPOINT
    — a failure takes the existing fault path: ⛔ no kind revealed, ⛔ nothing dropped), ONE statement returns the claim ids whose peer
    section is hidden from that actor — built from the SAME predicate as `isPeerSectionHiddenFromActor`: refactor its body into an exported
    fragment `peerSectionHiddenFromActorSql(pariwarRef, claimRef, actorId)` used by BOTH (⛔ never a copy); `qualifyingRows` applies
    `withoutPeerWarnings` to those claims' `w` before `uncoveredKeys` — so a row late ONLY by a peer key is ⛔ not listed for that actor and
    the count excludes peer keys (BF11's refinement holds). ⚠ RECORDED: on the FAULT path a candidate raised only by the peer arm is still
    kept as *"may wait"* (`null` count) — ⛔ no kind is named. The handler (`claims.nominee-name-check.handlers.ts:465`) passes
    `hidePeerKindsForActor: <session actor id>`.
  - [ ] 4.3 The four later-approver surfaces are ⛔ not filtered (PM25 (c) names only the console strip and the queue row; their actors are
    Pariwar Admins / the Super Admin, ⛔ never inspectors in v1 — an inspector is a District or Block Admin). PM24's panel is hidden by the
    assembler itself.
  - [ ] 4.4 Tests: domain unit — `withoutPeerWarnings` never reaches a writer (Task 1.5's scan); live — an inspector with a `scheduled`
    assignment: console strip `kinds` / counts / `reviseBlocked` / `viewerCanRecordLateReason` / `lateKeysUncoveredForViewer` carry ⛔ no peer
    trace while another District Admin's read of the SAME claim does; a `certificate_check`-only completion ⇒ still hidden; a completed FULL
    visit ⇒ shown; the queue row (late only by a peer key) absent for the inspector, present for another DA; and the GATE leg — the
    inspector-DA's approval attempt over the hidden key is refused without a reason (the filter ⛔ never weakens the rule).
- [ ] **Task 5 — gates and close (AC9).** `pnpm --filter @twt/contracts test`; the human-actor invariant; `access-wrapper-invariants`;
  forced pagination; microcopy; friction budget (admin-only ⇒ ⛔ not member-facing — confirm `MEMBER_FACING_PREFIXES` excludes `apps/admin/`);
  `grep -rn '\*\*/' ` over every edited doc-block ([[project_markdown_emphasis_closes_jsdoc]]); `pnpm ci:local` with `DATABASE_URL` on
  `:5433` ([[project_ci_local_double_run_pollution]]); a red that is a known flake per [[project_known_livedb_test_failures]] is re-run and
  RECORDED, ⛔ never hidden. Records: this file's Dev Agent Record, File List, Change Log; `sprint-status.yaml` row flip + ONE ledger
  entry ([[project_sprint_status_safe_prepend]]); deferred-work S10 per BD3; the Task 0.2 appended lines.

## Dev Notes

### ⚠ Traps (6.27a's list applies — Traps 3, 4, 5, 6, 7, 12, 13, 14, 15, 16, 18; these are 6.27b's own)

1. **⛔ No conjunct in the gate; ⛔ never edit the assertion or a writer** (6.27a Traps 3 / 4). The two kinds reach every approver BY
   CONSTRUCTION — the ONE rule and the wait iterate `w.keys` (F16). If a test seems to need a writer change, the fixture is wrong.
2. **Both readers or neither** (6.27a Trap 6) — `peerReplyColumnsSql()` in BOTH statements; the parity test (Task 1.8) is the guard.
3. **The index fixture trap** (Task 1.8) — a neighbour window built with a different index function than the certificate's compares
   `differs` against everything and every leg passes for the wrong reason. Assert one EQUAL-date leg yields ⛔ no key FIRST.
4. **⛔ Never inherit a neighbour key** (`-261` C3) — the fragment's `claim_case_id` filter is the whole rule; ⛔ never join through the
   deceased or the selection.
5. **`withoutPeerWarnings` is a DISPLAY filter** — ⛔ never on the assertion, the wait, `checkLaterApprovalWarningReason`,
   `insertClaimWarningApprovalRecord` or R9's coverage. A filtered key still has to be covered by SOMEONE's reason.
6. **The panel must ⛔ not fetch per card** (BF7) — 1,500 cards ⇒ 1,500 decrypting, audited reads.
7. **The call-back number** (BD2 (B)) — shown ONLY on a *"Yes"*, exactly as the console; ⛔ never widen it to a *"No"* on the strength of
   the signup-consent reading (that reading is BigDev's, recorded, ⛔ not counsel's); each showing audited with ITS OWN event.
8. **Ordering tests in SEPARATE COMMITTED transactions** ([[project_db_clock_ordering_tests_tie]]); `saved_at` is `clock_timestamp()`.
9. **Contracts tests are outside tsc** — a new REQUIRED field (`warningFlag`) breaks fixtures silently; run vitest
   ([[project_contracts_tests_outside_tsc]]).
10. **Prettier is ⛔ not enforced** — hand-format ([[project_prettier_not_enforced]]); **Markdown emphasis closes a JSDoc** — grep `\*\*/`.
11. **`useT()` / memo** — the admin console is plain English constants (`i18n-en.ts`), ⛔ not `useT` — but the new hook's `enabled` flag must be
    state, ⛔ never a fresh closure, so the query does ⛔ not refire.
12. **TanStack**: the disclosure's query is read-only; ⛔ no `reset()` in `onSettled` ([[project_tanstack_onsettled_before_success]]).

### Reuse map (⛔ never reinvent)

| Need | Reuse |
|---|---|
| a kind's threading | 6.28's commit `7c6986e5` (11 files: domain list + readers + queue disjunct + contracts + `i18n-en.ts` + console specs) and 6.26b's `bdb01014` |
| the pure derivation | `deriveDeathFactWarningKeys` (`approval-warnings.ts:253`) |
| the stitch | `stitchDeathFactFlags` (console handler) |
| the own-committing queue spec | `correction-queue-late-inspection.spec.ts` |
| the per-approver live legs | `approval-warnings-every-approver.spec.ts:915-1010` |
| answers in API tests | `peer-answers-console.spec.ts:50-98` (lift into a shared fixture) |
| the step's R9 / escalation reads | `hasLiveRoutedRow`, `readEscalatedClosureDetail` |
| the SAVEPOINT wrapper | `underSavepoint` (`apps/api/src/modules/claims/later-approval-warnings.ts:161`) |
| the section | `assemblePeerSection` + `PeerMeshView` |

### Testing standards

Vitest everywhere; live DB specs on `:5432` AND `:5433` ([[project_live_db_test_gotchas]] — never regen an applied migration; this story
has ⛔ no migration). Each load-bearing test red-checked (revert → red → restore), recorded in the Debug Log. ⛔ Never loosen a pinned list
to `toContain` without its count. Domain specs that move a fixture's keys are RED BY DESIGN and amended by NAMING the new key — none is
expected (⛔ no default fixture writes an answer — grep `savePeerAnswer` / `/peer-requests/` in `packages/domain/tests` and `apps/*/tests`
before and after; today only the 6.27a peer specs do), but exact `toEqual` assertions on `PeerMeshAnswerView` objects
(`peer-answers-console.spec.ts:174` uses `toMatchObject` — fine) and on `approvalWarnings.kinds` in `verifier-console.spec.ts` /
`verifier-console-shape.spec.ts` (6.28 touched both) must be re-read.

### Project structure notes

- NEW: `apps/api/src/modules/claims/claims.peer-answers.routes.ts`, `claims.peer-answers.handlers.ts`;
  `packages/contracts/src/claims/peer-answers.ts`; `apps/admin/src/modules/claim-verification/PeerMeshView.tsx`,
  `NeighboursAnswersPanel.tsx`; specs named in the Tasks; `apps/api/tests/integration/_peer-reply-fixture.ts`.
- UPDATE: `approval-warnings.ts`, `correction-queue-read.ts`, `peer-mesh-reply.ts` (the hide fragment), `peer-answers-assembler.ts`,
  `claims.verifier-console.handlers.ts`, `claims.nominee-name-check.handlers.ts`, `audit-sink.ts`, `verification-decision.ts`,
  `verifier-console.ts`, the contracts index, `SignalsPanel.tsx`, `i18n-en.ts`, `client.ts`, `hooks.ts`, the four hosts, the
  human-actor invariant, the fence test, the kinds pin test.
- ⛔ No migration. ⛔ No new permission key. ⛔ No mobile change. ⛔ No change to `recordPeerMeshResponse`, `savePeerAnswer`, any approval
  writer or the assertion.

### Previous story intelligence

- **6.27a** (`done`, five review passes): the assembler was made actor-aware and its `run` + disclosure callback REQUIRED precisely for
  this reuse (S13, U11); the hide fails CLOSED (S14) and that trade-off is accepted (V11); "changed N times" was deferred here (S10 ⇒ BD3);
  `-308`'s source line handed to row 6-36 (S1 ⇒ BD1). Its review cycle found most defects in UI state and in the review's own fixes —
  run [[feedback_review_the_fix_diff_before_commit]] after any "apply all".
- **6.28** (`done`): the most recent kind threading (OP5, `7c6986e5`) — its fixtures that seeded several claims of one death had to answer
  the new key; check whether any fixture seeds answers before blaming the derivation.
- **6.26b** (`done`): the exact pattern for a kind, the stitch, the own-committing queue legs and their red-checks; its RD19 "red by
  design" list is the shape for any spec this story turns red.
- **6.23b** (`done`): the wait, the queue's fault path (`null` count, ⛔ never `0`) and the bulk reader's slicing.

### Git intelligence

`560369a7` (6.27a third–fifth review fixes), `7eaf50c4` (second pass), `7e2ce0d8` (`-325`), `618566d3` (first pass), `3f9e7c42` (6.27a dev
complete). Conventions: `story(6.27b …)` / `governance(6.27b): <id> — …` subjects; governance commits ALONE; land by fast-forward
([[feedback_land_prs_by_fast_forward]]).

### Latest tech information

⛔ No new library. Fastify + zod-openapi (response schemas PARSED — a required field must be on every path), Drizzle raw `sql` for the
fragments, TanStack Query in the admin (an `enabled` query for the disclosure), Vitest. ⛔ No version change.

### References

6.27a's file (PM9, PM10, PM13, PM24, PM25; F13–F22, F33, F40; Invariants 1, 2, 3, 7, 8, 9; Traps); `.decision-log.md` entries
`2026-10-10-303` (Q2 A), `-304`, `-305` (§1 (c)), `-308`, `-311`, `-324`, `-325`, **`-326`** (BD1–BD3); `deferred-work.md` items *"`-308`'s 6.27a share … HANDED
OFF to row 6-36"* and 6.27a review S10; `sprint-status.yaml` row `6-36-peer-mesh-school-wise-selection` comment.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
- 2026-10-13 — v3.0: re-derived against 6.27a's shipped build (`560369a7`) by `bmad-create-story 6.27b` — BF1–BF16 found; BD1–BD3 put to BigDev and ANSWERED in session (BD1 A, BD2 B on his signup-consent reading — recorded with its gap, BD3 A);
  status `backlog` → `ready-for-dev`. Task 0.2 done: `2026-10-13-326` committed alone (`7867314b`). Ultimate context engine analysis completed — comprehensive developer
  guide created.

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-13 | 3.0 | ⭐ RE-DERIVED for dev against `main` `560369a7` (6.27a `done`, merged): every code cite re-read; FOUND BF1–BF16 (the vocabulary leaf, ⛔ no ciphertext fence yet, the claim index, erasure's effect on a date key, the view carries ⛔ no `answer_id`, the four hosts and the 1,500-card page, `PeerMeshView` private, the strip's five leaking fields, the queue's consumer and refinement, the stale comments, a re-review keeps a key's subject, the keys re-verified, ONE escalation definition, the call-back consent names the District Admin); BD1–BD3 ANSWERED by BigDev in session — BD1 A (`-308`'s source line handed off to row 6-36 through the shared view), BD2 B (the call-back number SHOWN on PM24's panel on a *"Yes"*, audited — on BigDev's signup-consent reading, recorded with its gap), BD3 A ("changed N times" kept and recorded) — committed as `2026-10-13-326` (`7867314b`); Task 0 (governance first); ACs sharpened (AC4 names `-324` A; AC5 legs (a)–(e); AC6's 403 vs 404; AC7's five fields; AC8's `null` for an answer newer than the read); Tasks 1–5 expanded with file:line, red-checks and the index-fixture trap; Policy meaning; Dev Notes. ⛔ No PM, ruling or AC intent moved. Status `backlog` → `ready-for-dev`. |
| 2026-10-10 | 2.5 | Round 6: Task 2's queue disjunct needs ⛔ no window term (its scan states + R9 arm already equal the window) — the v2.4 wording withdrawn. |
| 2026-10-10 | 2.4 | Round 5: Task 2's queue disjunct reads the answer window through 6.27a's `answerWindowSql` (PM8's reader list includes it). |
| 2026-10-10 | 2.3 | Round 4: change-log row only (6.27a's set-based `answerWindowSql` is what 6.27b's queue reads for the window). |
| 2026-10-10 | 2.2 | Round-3 validate: no change to this part's scope; the shared record (6.27a v2.2) scopes the seven-key rule to `peer_mesh` from v2, extracts the answer window, and records `has_died` as neighbour-only in `COMPARABLE_QUESTION_KEYS`. |
| 2026-10-10 | 2.1 | Round-2 validate: PM13's per-answer warning flags (and their `null` failure leg) are OWNED here — AC8 + Task 3b (they were handed to b by 6.27a but had ⛔ no AC / Task); *"no FULL visit"* for the blind-first filter; ANY current key makes the District Admin's approval unrevisable (F20); PM24's audit via `emitAuthAudit`, the escalation named, the state-gating coarseness recorded; ACs renumbered (AC9 = gates). |
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1): PM9, PM10, PM24, PM25 (c)'s kinds half. |
