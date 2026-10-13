---
baseline_commit: 560369a7
---

<!--
⭐⭐ RE-DERIVED 2026-10-13 (v3.0 — `bmad-create-story 6.27b`, on branch `story/6-27b` from `main` `560369a7`, the tip after 6.27a's
five review passes landed). v1.0–v2.5 were the BACKLOG cut of 2026-10-10 (pinned `fa2687ce`, before ANY 6.27a code existed); every
`file:NNN` in the v3.0 text was AS OF `560369a7` and re-read by two read-only checkers (the approver hosts + routes; the gates + pins) and
the author. ⛔ No PM, ruling or AC intent of the cut moved. What re-deriving against 6.27a's SHIPPED build found is section "FOUND
against 6.27a's build" (BF1–BF16; they decide ⛔ nothing); the three calls it raises for BigDev are BD1–BD3 (Task 0).
⚠ Before Task 1: `git diff --name-only 560369a7..HEAD -- packages apps scripts infra` — re-read any cited file in that list.

⭐⭐ VALIDATED 2026-10-13 (v3.1 — `bmad-create-story validate 6.27b`, four read-only fresh-context verifiers against v3.0 `3f22193a`;
code baseline still `560369a7`, ⛔ no code moved). Found BF17–BF22 and two calls BigDev answered in session, committed ALONE as
`2026-10-13-327` (`f65fe069`): BD2 (B) is SUPERSEDED (`-326` in part) — the call-back number is WITHHELD from PM24's panel and the question is ROUTED to the Panel
(note written, ⛔ not yet sent); and NEW **BD4** — an actor the neighbours' section is hidden from cannot APPROVE the claim at any step
(unconditional). ⚠ v3.0's BD2 (B) text is KEPT below, marked superseded — ⛔ never deleted.

⭐⭐ v3.2 (2026-10-13) — THE PANEL RULED: `2026-10-13-328` (`c1900b89`, Trustee-ratified, DR + KB) supersedes `-327` decision 1 (the
withhold). The call-back question becomes *"May the Admin phone you about this?"* (the District Admin and the Pariwar Admin); the number is
SHOWN on a *"Yes"* to the District Admin, the district's verifiers and the Pariwar Admin, and to the Super Admin on ANY answer; every
showing audited. 6.27b builds it (BigDev: *"Fold into 6.27b"*) — AC6 / AC11, Tasks 3.1 (a), 3.3, 3.4, 3.7 and NEW Task 3c. BD4 is
untouched. ⚠ The v3.1 withhold text is KEPT where it records history, marked superseded.

STATUS: `ready-for-dev` — 6.27a (row `6-27-peer-mesh-sending-replies-and-date-of-death`) is `done` and MERGED (the 6.21b / 6.23b / 6.24b /
6.26b precedent); 6.27a's shared Task 0.4 author-commit is `2026-10-10-311`. ✅ Task 0 is DONE: BD1–BD3 answered by BigDev and committed
ALONE as `2026-10-13-326` (`7867314b`); v3.1's BD2 supersession + BD4 committed ALONE as `2026-10-13-327` (`f65fe069`) — 6.27b may be built from the
next commit after it ([[feedback_governance_commits_precede_implementation]]).
⚠ The FOUR appended record lines (Task 0.2's three from `-326` — row 6-36's sprint comment, two deferred-work items — and BF22's one) land WITH the code (Task 5). Runs in PARALLEL with 6.27d;
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

`-263` FQ10 A · `-262` FQ8 E · `-264` FQ12 · `-277` Q2 C / Q3 B · **`-303` Q2 A** (the late wait — its Consequence 1: *"`-279` A6 /
Consequence 2 is DISCHARGED for row `6-27`"*; the queue listing itself is `-279` A4, which `-303` cites) · **`-310` CF2** (Trustee-ratified —
who sees the answers: *"whoever approves the claim at a later step — in practice the Pariwar Admin at the final vote or an R9 vote, or the
Super Admin — for that claim at that step only; the inspector ⛔ nothing before completing their own record …"*; PM24's and PM25 (c)'s
ratified basis) · **`-324` A** (for a claim the special panel has after the month's vote, *"the final approval"* is the special panel's — R9
finalize waits) · `-261` C3 (⛔ never inherited) · `-282` GI7 / `-281` Q1 B (precedents) · `-305` §1 (c) (the real later approvers) ·
`-308` (each answer's source — see BD1) · `-325` S1 A (`-308`'s 6.27a half handed to row 6-36; *"6.27b PM24's share of `-308` is
unchanged"*) · `-326` (BD1–BD3, author-commit) · **`-327`** (author-commit — BD2 (B) superseded, `-326` in part: number WITHHELD + routed, incl. the console's existing showing; BD4) ·
**`-328`** (Trustee-ratified — the question's new words; who sees the number; the Super Admin on any answer; supersedes `-327` decision 1).

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS two conjuncts to an existing benefit-gating predicate (P1, P2) and one on the APPROVER (P3, BD4)** (the approval-warning rule) — conjuncts on the FORM an approval
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
  console strip, warnings summary and queue row SHOW; the gate, the wait and the ONE rule still read every key (Task 4.4 proves it). PM24
  is a read.
- **P3 (BD4, `-327` decision 2) — ⭐ this one IS a new conjunct on WHO may approve** (an actor precondition, ⛔ never a claim precondition,
  and it reads ⛔ no neighbour answer — so ⛔ not a breach of 6.27a Invariant 1): *"Someone who has been given a ground visit on a family's
  claim cannot approve that claim until they have done their own full visit or the visit has been given to someone else; anyone else
  entitled to approve still can, and a neighbour's answer still never refuses the family."* — implements `-310` CF2's *"the inspector
  ⛔ nothing before completing their own record"* on the approval path; Niyamavali §6.2 consistent, ⛔ no clause on an inspector's
  independence. ⚠ Cost: a claim whose only eligible approver at a step is that inspector waits until the visit is done or reassigned.
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
  disjunction, audited, the panel on the four hosts (Task 3). Ratified basis `-310` CF2 (*"for that claim at that step only"*); ⭐ the
  call-back number SHOWN per `-328` (on a *"Yes"* to the Pariwar Admin; on any answer to the Super Admin) — `-327` decision 1's withhold
  is superseded.
- **PM13's per-answer warning flags** — on the console and on PM24's panel, from the WARNINGS read (the same keys the rule uses — ⛔ never a
  second computation); a failed read ⇒ `null` (*"could not be checked just now"*), ⛔ never `false` (6.27a Invariant 8).
- **PM25 (c), the kinds half** — for an actor the section is hidden from (an UN-completed assignment and ⛔ no completed FULL visit). 6.27a's
  words, verbatim: *"**[b]** and 6.27b filters the two peer kinds out of that actor's **warnings summary** and correction-queue row
  (approval is impossible before completion anyway — GI1)"* ⇒ the console decision strip, the four later-approver hosts' summary (and the
  R9 panel's per-vote cover flag — Task 4.3; BF21 — a later approver CAN be a hidden inspector), and the queue row. ⚠ FOUND: the quote's
  premise is FALSE — another inspector's completed visit satisfies the inspection gate (BF19) — and BD4 is what makes it true.
- **BD4** (`-327` decision 2) — that same hidden actor cannot APPROVE the claim at any step (BF19; Task 4b).

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
  validator; `keys.js` is the leaf). The NW1 transitive scan (`approval-warnings.test.ts:340-384`; entries `:360-372`, SIX since 6.27a added
  `questionnaires/index.ts`; forbidden `:357` = `claim/events.ts`, `claim/nominee-name-check.ts`, `claim/nominee-lock.ts`) stays green;
  the header's safe-leaves list (`approval-warnings.ts:46-50`) gains `questionnaires/keys.ts` ⇒ Task 1.2.
- **BF3 — ⛔ no fence today says a fragment selects no `value_ciphertext`.** The decrypt fence's 6.23a test
  (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts:358-368`) forbids substrings in `approval-warnings.ts` /
  `approval-warnings-persist.ts` (`decrypt`, `nameCiphertext`, `mobileCiphertext`, `getMemberNominees`, `certificate_date_ciphertext`,
  `accepted_date_ciphertext`); `FENCED_FILES` is pinned `toBe(50)` (`:187`). ⇒ AC2's "fence assertion" = `'value_ciphertext'` (and `'valueCiphertext'`) added to
  that deny-list (`:364`) (⛔ no new file in `FENCED_FILES` — `approval-warnings.ts` is already fenced) ⇒ Task 1.6.
- **BF4 — the answers table, as built.** Live = `superseded_at IS NULL`; `value_codes text[]` (has_died: ONE plaintext code; death_date:
  `['unknown']` for *"I don't know the date"*, else NULL); `death_date_window_indexes text[]` (exactly 3 or NULL); indexes
  `claim_peer_mesh_reply_answers_claim_idx (pariwar_id, claim_case_id)` and `…_live_reply_idx (pariwar_id, reply_id) WHERE superseded_at IS
  NULL` (0156 `:187-188`). ⭐ The fragment filters by `(pariwar_id, claim_case_id)` ⇒ the CLAIM index should serve both readers and the
  queue's disjunct. ⚠ FOUND, ⛔ not a supersession: 0156 `:186` and 6.27a review S6 name `…_live_reply_idx` as *"load-bearing for 6.27b's
  bulk warning readers"* (S6 asserted that BOTH indexes exist). Task 1.7's `EXPLAIN` decides; if the claim index serves, record in the
  Debug Log that the live-reply index's stated 6.27b purpose is unserved (⛔ never drop it). An edit stamps the old row superseded and inserts a NEW `answer_id` (PM7 (b)) ⇒ PM9's "a changed answer is a NEW key".
  A dependant answer whose condition stops holding (`has_died` → `not_sure`) is SUPERSEDED with ⛔ no live successor ⇒ its key vanishes.
- **BF5 — erasure NULLs the indexes.** 6.27a PM17 scrubs `death_date_window_indexes = NULL` on the DECEASED's erasure ⇒ a date key
  VANISHES on erasure; `value_codes` survive ⇒ a `peer_says_not_died` key SURVIVES. RECORDED, ⛔ not changed (an erased member's claim is
  closed or held elsewhere; the queue's exact check simply sees fewer keys).

**The console (PM13 flags, PM25 (c)):**
- **BF6 — the answer view carries ⛔ no `answer_id` and ⛔ no flag.** `PeerMeshAnswerView` (`packages/contracts/src/claims/verifier-console.ts:195-211`,
  `.strict()`): `questionKey`, `question`, `value`, `savedVia`, `savedAt`, `changeCount`. The assembler HAS the id (`PeerConsoleAnswerRow.answerId`,
  `peer-mesh-reply.ts:516`) and drops it (`peer-answers-assembler.ts:159-166`). Response schemas are PARSED by the serializer
  ([[feedback_story_validate_footguns]] #29) ⇒ a new REQUIRED field must be filled on EVERY path ⇒ Task 3b.
- **BF7 — the four hosts and their feeds** (all render `LaterApprovalWarnings` + `FinallyApprovedElsewhereBanner`):

  | Host | `LaterApprovalWarnings` | ids in scope | Feed (admin client → handler) |
  |---|---|---|---|
  | `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx` | `:321` (prefix `cf-${id}` `:111`) | `pariwarId` `:44`, `case_.claim_case_id` | `getCycleFreezePending` (`apps/admin/src/api/client.ts:2017`) → `getPending` (`claims.cycle-freeze.handlers.ts:324`, bulk `:343`) |
  | `apps/admin/src/modules/correction-closure/EscalationPanel.tsx` | `:321` in `DecisionForm` (only on *approve*) | `pariwarId`, `detail.closure.claim_case_id` | `getEscalatedClosure` (`client.ts:1740`) → `getEscalation` (`claims.correction-escalation.handlers.ts:132`, read `:180`) |
  | `apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx` | `:263` in `NoCorrectionStrip` | `pariwarId`, `item.claim_case_id` | `getClosureQueue` (`client.ts:1619`) → `getClosureQueue` (`claims.correction-closure.handlers.ts:477`, bulk `:492`) |
  | `apps/admin/src/modules/r9-voting/R9CasePanel.tsx` | `:463` (`surface="r9"`, guard `:461`, itself inside `{!finalized && (` `:415` and the `onPanel` branch `:419`) | props `pariwarId`, `claimCaseId` (`:85-88`) | `getR9Panel` (`client.ts:2068`) → `getPanel` (`claims.r9-voting.handlers.ts:303`, read `:329`) |

  ⭐ `PendingCaseCard` is one card of a list of up to 1,500 claims (3 buckets × `PENDING_SCAN_CAP = 500`, defined
  `packages/domain/src/claim/cycle-freeze-read.ts:47`; the 3-bucket note `approval-warnings.ts:551-557`) ⇒ PM24's panel must ⛔ not fetch per
  card on render (1,500 GETs, 1,500 audit lines, up to 1,500 × 5 KYC decrypts) ⇒ the panel is a collapsed disclosure that fetches only
  when opened (Task 3.5). ⭐ The SHIPPED precedent for exactly this is `NomineeNameCheckDisclosure.tsx`, already mounted on
  `PendingCaseCard` and on `R9CasePanel` (`:186`), over `useNomineeNameCheck(pariwarId, claimCaseId, enabled = true)`
  (`apps/admin/src/api/hooks.ts:727` — `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, because a focus re-fetch writes audit
  lines for *"reads nobody performed"*) and `useForgetNomineeNameCheck` (`:745`, `removeQueries` on close, so 1,500 cards ⛔ never keep
  decrypted PII in the QueryClient).
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
  `w.keys` / `w.kinds` ⇒ PM25 (c)'s filter must run on `w` BEFORE the other four, ⛔ not only on `kinds` (a count of 1 with ⛔ no kind line
  would itself say "a neighbour said something"); ⭐ `reviseBlocked` stays on the UNFILTERED `w` (BF19 (b)) and the hidden actor's strip
  shows BD4's neutral block instead ⇒ Task 4.1.

**The queue (PM10, PM25 (c)):**
- **BF11 — the queue's consumer and its contract.** `listClaimsUnderCorrection` (`correction-queue-read.ts:288`) is called ONCE, by
  `getClaimsUnderCorrection` (`apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts:439`, call `:465`) for `GET
  /api/v1/p/:pariwarId/admin/claims/under-correction` (`claims.nominee-name-check.routes.ts:184`), gated by `claim.view_nominee_name_check`
  at district scope + per-row `isVisible` (handlers `:451-457`); wire fields `late_warning_awaiting_reason` / `late_warning_uncovered_count`
  (handlers `:587-588`); the contract's refinement (`packages/contracts/src/claims/nominee-name-check.ts:430`) requires awaiting ⇔ (count
  `null` or `> 0`) ⇒ the filtered count must keep that equivalence. UI: `apps/admin/src/routes/CorrectionQueueRoute.tsx:205-248` (⛔ no
  change — the row's meaning is the same).
- **BF12 — the stale comments PM10 amends.** The `lateArm` comment (`correction-queue-read.ts:142-160`) lists FOUR sources but its lead line (`:144`) still says *"THREE sources now"*; the
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
  `pariwar_admin` and `super_admin` — every v1 later approver (a `global` super_admin grant passes a pariwar check, `rbac/check.ts:172`).
  The real APIs: the hook is `requirePermissionHook(deps, 'cycle.freeze', { dimension: 'pariwar' })`; an in-handler check is
  `rbac.hasPermission(request.scopeGrants, key, { dimension: 'pariwar', value, pariwarId })` (`rbac/check.ts:150`; the console's `:326` is the
  model).
- **BF15 — "an open CORRECTION escalation" has ONE definition.** `readEscalatedClosureDetail` (`packages/domain/src/claim/correction-closure-read.ts:242`)
  returns non-null only for a closure in `CLOSURE_HELD_STATES = ['escalated', 'under_review']`
  (`packages/domain/src/schema/claim_correction_closure.ts:39`) joined to a live return decision — a CLOSURE state, ⛔ not
  `claims.current_state`. "A live R9 routing" = `hasLiveRoutedRow` (`packages/domain/src/claim/r9-routing.ts:48`). ⇒ PM24's arms reuse both
  (⛔ never a copied state list). ⭐ The CHEAP form of the closure predicate is `claim.isCorrectionClaimHeld(db, pariwarId, claimCaseId)`
  (`correction-closure.ts:239` — one statement, same definition, already used at `claims.correction-closure.handlers.ts:588`);
  `readEscalatedClosureDetail` runs ~7 statements and can rethrow ⇒ ⛔ never use it as a predicate. The three votable states already
  exist: `TRUSTEE_VOTABLE_STATES = ['verifier_approved', 'reversed', 'state_trustee_freeze']`
  (`state-trustee-decision-persist.ts:98`, via `claim/index.ts`) — the no-correction approval's own predicate (`correction-closure.ts:485`).
- **BF16 — the call-back number is consented to ONE named person.** The ruled question reads *"May the District Admin phone you about
  this?"* (`packages/i18n/locales/en/claim.json:209`; `-304` Q6 A's list). `assemblePeerSection` DECRYPTS and SHOWS the number on a "yes"
  (`peer-answers-assembler.ts:171-194`) and calls `onCallbackMobileShown` ⇒ reusing it UNCHANGED for PM24 would show a neighbour's mobile to
  a Pariwar Admin or the Super Admin — wider than the words the neighbour agreed to ⇒ **BD2** (v3.0: answered (B) — shown; ⭐ v3.1:
  SUPERSEDED by `-327` decision 1 — WITHHELD, and the question routed to the Panel; ⭐ v3.2: RULED by `-328` — SHOWN; see BD2).

**Found at the v3.1 validate (BF17–BF22; verified at `560369a7`):**
- **BF17 — PM24's first arm misses the Pariwar Admin's cycle-freeze ESCALATION RESOLUTION.** 6.27a PM24 says *"the cycle-freeze escalation
  RESOLUTION is `cycle.freeze`'s — the first arm"*, but that step runs in `TRUSTEE_ESCALATION_RESOLVABLE_STATES = ['verification_in_progress',
  'verifier_review']` (`state-trustee-decision-persist.ts:139`) on a claim whose live verifier decision is `escalated`
  (`cycle-freeze-read.ts:150-161`; `PendingCaseCard.tsx:6`, the `escalated` bucket) — neither is one of the three votable states ⇒ a GET
  404s exactly where the Pariwar Admin must give a warning reason. ⇒ a FOURTH disjunct (Task 3.2): state ∈
  `TRUSTEE_ESCALATION_RESOLVABLE_STATES` AND `getLiveDecision(…)` (`verifier-decision-persist.ts:292`) has `outcome === 'escalated'` AND
  `cycle.freeze`. FOUND from PM24's own text, ⛔ not a re-reading.
- **BF18 — a live R9 routing survives a verifier DENIAL.** `adjudicateClaim` (`verifier-decision-persist.ts:344`) has ⛔ no routing guard;
  only finalize (`r9-voting-persist.ts:726`) and the closure core (`suspicion-refusal-persist.ts:425`) supersede a routing ⇒ a
  `verifier_review` claim routed to R9 and then denied keeps a live routing through every appeal stage. v3.0's *"in ANY state"* would
  serve the answers on a refused claim ⇒ the R9 arm is: a live routing AND state ∈ `R9_OUTCOME_FROM_STATES` (`claim/state.ts:78-85`, the
  routable states incl. `state_trustee_approved`).
- **BF19 — the display filter conflicts with the approval writers ⇒ BD4.** The writers snapshot EVERY current key
  (`verifier-decision-persist.ts:433-435`, `:483-490` → `insertClaimWarningApprovalRecord({ keys: warningKeys })`; late reason
  `approval-warnings-persist.ts:134`, `keys: warnings.keys`). A District Admin can hold a `scheduled` inspection on a claim while another
  inspector's completed full visit satisfies the approval gate (`ground-inspection-approval.ts:62-75`) ⇒ a HIDDEN District Admin could
  approve: (a) with only a peer key, the strip shows ⛔ no picker (`VerificationDecisionStrip.tsx:198-199`) and the 409's `details.kinds`
  (`later-approval-warnings.ts:41-60`) NAMES the hidden kind; (b) a filtered `reviseBlocked` of `null` offers a Revise the server refuses
  (`warning_approval_final`, `verifier-decision-persist.ts:668-674`) — the console code itself forbids that (`claims.verifier-console.handlers.ts:604-607`);
  (c) with any other kind showing, their reason covers the hidden peer key FOR GOOD. ⇒ `-327` decision 2 (BD4).
- **BF20 — `assemblePeerSection` returns the INTERNAL `PeerSection`, ⛔ not the wire section.** Its result is `{kind:'hidden'} |
  {kind:'no_selection'} | {kind:'present', …}`, and it catches ONLY the hide check (selection / pings / answers reads throw). The wire
  mapping (`distinctResponderCount`, `pingedMemberIds`, `responses`, `verifierAnnotations`, `outcome`, `windowExpiresAt`) and the `catch →
  { status: 'unavailable' }` live ONLY in the console's `assemblePeerMesh` (`claims.verifier-console.handlers.ts:816-858`, mapping
  `:832-857`), whose context is `VerifierConsoleContext` ⇒ Task 3.1 extracts them into ONE shared exported function (⛔ never a second copy).
- **BF21 — any actor can be a scheduled inspector.** `inspectorActorId: z.string().min(1)` (`claims.ground-inspection.routes.ts:70`), stored
  as supplied ⇒ a Pariwar Admin or the Super Admin CAN be hidden. v3.0's Task 4.3 premise (*"their actors are … ⛔ never inspectors in
  v1"*) is unproven ⇒ the four hosts' summary IS filtered for a hidden actor (PM25 (c) verbatim) and BD4 applies at every approving step.
- **BF22 — a deferred item's trigger fires here.** `deferred-work.md`, item *"An ERASED (sentinel) neighbour answer reads 'could not be
  shown just now' on the console"* — *"⭐ Trigger: that reachability proven, or 6.27b PM24 reusing the section."* PM24 reuses it ⇒ the
  panel inherits the same `unavailable` reading for an erased answer. ⇒ Task 5 appends to that item: *"6.27b PM24 now reuses the section;
  the erased-answer reading is inherited unchanged on the later-approver panel — reachability still unproven; ⭐ Trigger: that
  reachability proven"* (re-deferred, ⛔ never closed).

## ⚖️ Build decisions BD1–BD4 (BD1–BD3 ✅ ANSWERED by BigDev 2026-10-13 at `bmad-create-story 6.27b`, COMMITTED ALONE as `2026-10-13-326` (`7867314b`); BD2 (B) superseded and BD4 ✅ ANSWERED at the validate, COMMITTED ALONE as `2026-10-13-327` (`f65fe069`) — Task 0)

§0 gate (template `trustee-panel-routing-note-TEMPLATE.md`), AS RECORDED AT v3.0 — ⚠ its BD2 half was WRONG and is corrected by `-327` (BD2's
Panel half is routed; see BD2); kept as written: all three are the AUTHOR's — BD1 is *which story builds* a line already
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
- **BD2 — the call-back number on PM24's panel (BF16).** ⭐⭐ **v3.2: RULED by the Panel — `2026-10-13-328` (Trustee-ratified, DR + KB):**
  *"Q1 - C , May the Admin phone you about this? This will include District Admin and Pariwar Admin. Superadmin has all the rights, no
  explicit permission is required. Q2 - the District Admin, the district's verifiers, the Pariwar Admin and the Super Admin"* ⇒ PM24's
  panel SHOWS the number to the Pariwar Admin on a *"Yes"* and to the Super Admin on ANY answer (BigDev's confirmed reading), each showing
  audited; the console shows it to the Super Admin on any answer too; the question's words change (Task 3c). The v3.1 and v3.0 text
  below is KEPT as the record. ⭐⭐ **v3.1: SUPERSEDED by `2026-10-13-327` decision 1 (`-326` superseded in part) — the number is
  WITHHELD on PM24's panel (option (A)'s mechanism below), and the question is ROUTED to the Panel**
  (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-13-6-27b-callback-number-for-later-approvers.md` — written,
  ⛔ not yet sent). The note also asks (its Q2) whether the console's EXISTING showing — to the District Admin, the district's verifiers and
  the Super Admin (6.27a PM13, an author call) — is right; ⚠ 6.27b does ⛔ not change the console (`'show'`), and `-327` records that
  showing as ⛔ not addressed here. BigDev, at the validate: *"Withhold + route (Recommended)"*. Why: the §0 classification below was wrong — BD2 is *"what
  the Trust DISCLOSES about a person, or to whom"* and *"a LEGAL or consent BASIS"*; it WIDENS `-304` Q6 A (*"May the District Admin phone
  you about this?"*, put with the cost *"The phone permission is a new consent from the neighbour"*); `-310` CF2 gives later approvers the
  ANSWERS, ⛔ not the number; and option (B)'s own cost line said it *"would then have to route"*. The gap is WIDENED in `-327` by the
  draft policy's *"necessary … only for the purpose stated at collection"* and the draft terms' *"in-app surface — that is the channel of
  record"* (R10(B)). ⚠ The v3.0 text is KEPT below as the record of what was answered then, ⛔ never deleted:
  - (v3.0) ✅ **ANSWERED (B), on BigDev's basis** — BigDev, in session: *"When member
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
  - (A) WITHHELD (⛔ not taken at v3.0; ⭐ TAKEN at v3.1 by `-327` decision 1). PM24's read passes `callbackMobile: 'withhold'` to the assembler (a new REQUIRED option): ⛔ no
    mobile ciphertext is decrypted, ⛔ no `onCallbackMobileShown` fires, and `callbackMobile` is `{ status: 'none' }`. The later approver
    still SEES the neighbour's *"Yes"* answer to *"May the District Admin phone you about this?"* — the console (District Admin) is
    unchanged. Cost: a Pariwar Admin who wants to phone a neighbour asks the District Admin.
  - **(B) — TAKEN at v3.0, ⭐ SUPERSEDED by `-327` decision 1:** shown, audited as on the console. Cost (as put): discloses a neighbour's number to people the neighbour did ⛔ not agree to be phoned by —
    arguably a counsel / Panel question (a disclosure beyond the ruled words), which this story would then have to route.
- **BD3 — "changed N times" (6.27a review S10, deferred to 6.27b PM24).** `changeCount = versions − 1` counts EVERY earlier row of the
  question — including one SUPERSEDED as a dependant (a date removed when `has_died` became *"not sure"*) and a re-entry of the same value
  (`peer-mesh-reply.ts:548-562`).
  - ✅ **ANSWERED (A)** — BigDev: *"Keep and record"*. **(A) — recommended:** KEEP the count and the words as built; RECORD the meaning — *"every earlier saved version of this answer,
    including one removed when an earlier answer changed"* — in the assembler's doc-block and the deferred-work item S10 (closed as
    "decided, ⛔ not changed"). Cost: a removal-and-re-entry reads as a change.
  - (B) count only edits of the SAME question by the neighbour. Cost: ⛔ no column today tells a dependant supersede from an edit ⇒ a
    migration on a table whose trigger 6.27a hardened over five review passes, for a staff hint.
- **BD4 — an actor the neighbours' section is hidden from, at an approving step (BF19, BF21).** ✅ **ANSWERED — UNCONDITIONAL**, committed
  as `2026-10-13-327` decision 2. BigDev, at the validate: first *"Refuse until visit (Recommended)"*; then, shown that a refusal raised
  only while a peer key is current itself tells the hidden actor a neighbour's answer warns: *"Unconditional (Recommended)"*. §0: the
  author's (which actor's approval the code accepts while `-310` CF2's blind-first rule applies to that actor; ⛔ nothing a member,
  family or nominee is owed changes; a recorded DELAY).
  - **Hidden** = 6.27a's ONE predicate `isPeerSectionHiddenFromActor` (a `scheduled` assignment AND ⛔ no completed FULL visit). It ends when
    the actor completes a full visit, or when ⛔ none of their assignments is `scheduled` any more (completed — by them or by a supervisor's
    D6 override —, `superseded`, `photo_refused`, `evidence_unavailable`); a `certificate_check` completion does ⛔ not end it while another
    of their assignments is still `scheduled`. ⚠ Only a District Admin, a Block Admin or the Super Admin can complete or reschedule a visit
    (`claim.conduct_ground_inspection`, `roles.ts:492`, `:577`; every inspection route requires it) ⇒ a Pariwar Admin assigned as inspector
    depends on one of them.
  - **Refused while hidden — every APPROVING act, whatever the neighbours said:** the District Admin's approval (`adjudicateClaim`,
    outcome `approved`) and its revise (`reviseDecision`); a District Admin late reason (`recordLateWarningReason`); the final-vote approve
    (`voteOnFrozenClaim`); the cycle-freeze escalation resolution's approve (`resolveEscalation`); an R9 approve vote (`castR9Vote`) and an
    R9 finalize whose computed outcome is approve (`finalizeR9Outcome`); the Super Admin's G1 approve (`decideEscalatedClosure`); the
    no-correction approval (`approveNoCorrectionNeeded`). ⛔ **Never refused:** a denial or its revise, a refusal, a return, an escalation, an
    R9 deny vote, an R9 finalize that computes "denied", an appeal reversal (`appeal-persist.ts`, `appeal-panel-persist.ts` — pro-claim,
    ⛔ not gated by the ONE rule; the final vote after `reversed` is), any non-approving act.
  - Approvals made BEFORE the actor became hidden STAND (a District Admin approval, an R9 approve vote cast before they were scheduled) —
    recorded, ⛔ not changed: they saw everything when they acted, and any later key forces a revise or a late reason, which BD4 blocks.
  - **ONE neutral refusal**, checked BEFORE `assertClaimApprovable` and before any warnings read ⇒ ⛔ no refusal a hidden actor receives
    ever carries `details.kinds`. Words:
    *"A ground visit on this claim is assigned to you and is not finished. It must be completed, or given to someone else, before you
    can approve."* — ⛔ no kind, ⛔ no key.
  - (not taken) refuse ONLY while a peer key is current. Cost: the refusal itself discloses that a neighbour's answer warns.
  - (not taken) a kind-free hint on the strip. Cost: the reason still covers a key its author never saw, and the hint partly leaks.
  - (not taken) accept and record (a)–(c). Cost: a blind reason permanently covers a neighbour's warning.

## Acceptance Criteria

1. **AC1 — governance first.** ⛔ No 6.27b code before Task 0's author-commits are COMMITTED ALONE — ✅ `2026-10-13-326` (`7867314b`,
   BD1–BD3) and ✅ `2026-10-13-327` (`f65fe069`; BD2 (B) superseded, BD4; with the BD2 routing note) and ✅ `2026-10-13-328` (`c1900b89`,
   Trustee-ratified — the Panel's ruling on that note); 6.27a `done` ✅.
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
   approval makes the final vote, the no-correction approval, the Super Admin's G1 approval AND R9 finalize on an R9-routed
   `state_trustee_approved` claim refuse with `LateWarningReasonRequiredError` until the District Admin records a late reason (for R9
   finalize: then each approve-voter whose own vote row misses the late key revises with a reason — else 409
   `approve_votes_need_warning_reason`, `r9-voting-persist.ts:687-700`); ANY current neighbour key makes the District Admin's approval
   unrevisable (F20 — recorded and tested, ⛔ not changed). ⚠ The cycle-freeze escalation resolution has ⛔ no late leg: it runs on an
   `escalated` decision with ⛔ no District Admin approval, so `uncoveredKeys`' first line (`approval-warnings.ts:835`, `if
   (!warnings.coverage.districtAdminApproved) return [];`) makes the wait vacuous there — it stays in AC3's ONE-rule list only.
5. **AC5 — the queue lists it** (PM10), in SEPARATE COMMITTED transactions ([[project_db_clock_ordering_tests_tie]]): (a) an answer saved
   BEFORE the approval ⇒ ⛔ not a candidate (asserted on the FAULT path, with a control candidate proving the fault fired — never a count);
   (b) an answer saved AFTER the approval ⇒ listed, `lateWarningAwaitingReason: true`; (c) an EDIT after the approval of an answer covered
   at approval ⇒ listed; (c′) a `not_died` answer saved AFTER the approval, then edited to `died` ⇒ ⛔ NOT listed on the normal path; (d) a
   certificate re-review that moves the accepted date from equal to differing, then a re-determination ⇒ listed via arm (1) (BF13), on a
   claim built WITHOUT the default inspection (`claim({ inspection: 'skip' })` + an inspection whose family date equals the NEW accepted
   date — the 6.26b K4 shape; else the default visit raises its own late `inspection_death_date_differs` key and (d) passes with the peer
   kind deleted), asserting the exact uncovered count AND that `w.keys` holds `peer_death_date_differs:<id>`; (e) leg (b) on an R9-routed
   `state_trustee_approved` claim ⇒ listed, and (e′) the same with the routing row superseded ⇒ ⛔ not listed. Red-checks per Task 2.4.
6. **AC6 — every approver sees the answers** (PM24; `-310` CF2): the role × step matrix — a Pariwar Admin at `verifier_approved` /
   `reversed` / `state_trustee_freeze` (`cycle.freeze`); a Pariwar Admin at the cycle-freeze escalation resolution — `verification_in_progress`
   / `verifier_review` with a live `escalated` verifier decision (`cycle.freeze`, BF17); an R9 voter on a claim with a live R9 routing in an
   `R9_OUTCOME_FROM_STATES` state, incl. `state_trustee_approved` (`claim.r9_vote`, BF18); the Super Admin on a claim held for an escalated
   correction closure (`isCorrectionClaimHeld`; `claim.review_escalated_closure`, the key the escalation DETAIL read uses) — get the
   answers; a District Admin / verifier (⛔ no `cycle.freeze`) ⇒ 403 at the hook; every other state ⇒ 404 (incl. `verification_in_progress` /
   `verifier_review` with ⛔ no routing and ⛔ no live `escalated` decision, `state_trustee_approved` with ⛔ no live routing, a DENIED claim
   that still carries a live routing (BF18), every closed / refused / appeal state, an unknown claim, another Pariwar's claim); the read is
   audited once (⛔ no answer, ⛔ no name, ⛔ no number in the line); ⭐ the call-back number per `-328`: shown to a Pariwar Admin ONLY on a *"Yes"*
   (`callbackMobile: { status: 'shown' }`; *"No"* / unanswered ⇒ `{ status: 'none' }`, ⛔ no decrypt), and to the Super Admin on ANY answer
   or none; each number shown emits ONE `admin_claim.peer_callback_mobile_shown` line (⛔ never the number in it), and ⛔ no such line when
   the section fails; the panel renders on the four hosts as a disclosure that fetches only when opened, and a 404 renders *"Nothing to show at this
   step"* — ⛔ never the transient-fault words.
7. **AC7 — the blind-first rule holds in the warnings** (PM25 (c)): an actor holding an un-completed assignment with ⛔ no completed FULL
   visit sees ⛔ neither peer kind on the console's decision strip — ⛔ nor in its counts, `viewerCanRecordLateReason` or
   `lateKeysUncoveredForViewer` (BF10) — ⛔ nor in the `toApprovalWarningsSummary` of any of the four later-approver hosts, ⛔ nor in the R9
   panel's per-vote `covers_current_warnings` (BF21) — ⛔ nor in their correction-queue row (a row late ONLY by a peer key is ⛔ not listed
   for them); EVERY control that offers a BD4-refused act shows the neutral block instead — the console's Approve, its Revise of an
   APPROVAL and its late-reason panel (`viewerCanRecordLateReason` forced `false`), and each host's approve control (a per-claim
   `ownVisitPending` on the host DTOs) — so ⛔ no control is offered that the server then refuses (`reviseBlocked` is ⛔ never computed from
   the filtered keys — BF19 (b)); a `certificate_check` completion does ⛔ not lift it while another of their assignments is `scheduled`; once they complete a FULL visit, all appear; a DIFFERENT District Admin sees
   them throughout; the GATE still sees every key.
8. **AC8 — the per-answer flags** (PM13's flags): on the console AND on PM24's panel, every live `has_died` / `death_date` answer carries
   `warningFlag` — `true` ⇔ its key is current, `false` ⇔ the warnings read saw it and it carries ⛔ no key; `null` (*"could not be checked
   just now"*) when the warnings read FAILED or did ⛔ not see that answer (it was saved between the two reads); every other question's
   answer is `false` (it can ⛔ never warn — CF3 (b)); ⛔ never `false` for an unknown — a test FORCES the read to fail.
9. **AC9 — gates and records:** the new route file classified in `COVERAGE_SET` with `expectedMethods: ['get']` and registered in
   `apps/api/src/modules/claims/index.ts`; the TWO new `AuthAuditEventType` members (`admin_claim.peer_answers_read`,
   `admin_claim.peer_callback_mobile_shown`); the import-discipline scan green with `questionnaires/keys.ts` as a safe leaf; `kindLine` words with ⛔ no
   date (`apps/admin/tests/verifier-console.test.tsx:422-436`); contracts mirror + lockstep + contracts vitest; microcopy scan;
   `pnpm ci:local` green (with `:5433`).
10. **AC10 — a hidden actor cannot approve** (BD4, `-327` decision 2): for each approving act listed in BD4, an actor the section is hidden
    from is refused with the ONE neutral 409 — WITH and WITHOUT a peer key current (the unconditional leg proves ⛔ no disclosure), and ⛔ no
    `details.kinds` on the response; ⛔ no approval record, late-reason row, vote row or event is written; the same actor's denial (and its
    revise) / refusal / return / escalation / R9 deny vote / an R9 finalize that computes "denied" succeeds; the refusal lifts on a completed
    FULL visit and on the assignment leaving `scheduled` (`superseded`); a `certificate_check` completion does ⛔ not lift it while another of
    the actor's assignments stays `scheduled` (seed both — 6.27a's `peer-mesh-reply.spec.ts:464` shape).

11. **AC11 — the question's new words and the Super Admin** (`-328`): the neighbours' questionnaire asks *"May the Admin phone you about
    this?"* (en) / *"क्या एडमिन इस बारे में आपको फ़ोन कर सकते हैं?"* (hi — our translation, `-328` R2) on the member app and on the console's
    question words; the question's `approvedBy` cites `2026-10-13-328` and the questionnaire validator accepts it; ⛔ no copy of the old words
    remains outside the records; on the console, the District Admin and a verifier see the number on a *"Yes"* only (unchanged) and the Super
    Admin on any answer or none, each showing audited with `basis`.

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
    code. Then, in the SAME later code commit's records, THREE appended lines, each verbatim from `-326`'s Consequences and ⛔ never a
    rewrite: (1) row 6-36's sprint comment and (2) the deferred-work item *"`-308`'s 6.27a share … HANDED OFF to row 6-36"* each gain
    *"6-36 also renders the source on 6.27b's later-approver panel (the shared `PeerMeshView`); a test on both surfaces."* (`-326`
    Consequence 1); (3) the deferred-work item *"'Changed N times' counts dependant removals and same-value re-entries"* (6.27a review S10)
    gains *"decided — kept as built (`-326` BD3 A)"* (`-326` Consequence 2).
  - [x] 0.3 ✅ `2026-10-13-327`, committed ALONE with its routing note (`f65fe069`, 2026-10-13)
    (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-13-6-27b-callback-number-for-later-approvers.md`): BD2 superseded
    in part (WITHHELD + routed), BD4 (unconditional). ⚠ The note is WRITTEN, ⛔ not SENT ([[feedback_shown_to_panel_means_sent]]) — sending it
    is BigDev's; 6.27b is ⛔ not blocked by it (it builds the withhold either way). ⭐ v3.2: SENT and RULED.
  - [x] 0.4 ✅ `2026-10-13-328` (Trustee-ratified), committed ALONE with the note's ruling block (`c1900b89`, 2026-10-13).
- [ ] **Task 1 — the kinds (AC2, AC3, AC4; PM9).** `packages/domain/src/claim/approval-warnings.ts`
  - [ ] 1.1 Append `'peer_says_not_died'`, `'peer_death_date_differs'` to `APPROVAL_WARNING_KINDS` (`:111-117`, at the END); export
    `PEER_WARNING_KINDS = ['peer_says_not_died', 'peer_death_date_differs'] as const`; the doc-block above the list gains the 6.27b line
    (`-303` Q2 A, its Consequence 1 discharging `-279` A6; `-324` A for the special panel). The pin (`approval-warnings.test.ts:63-70`) gets the
    eight kinds; its GENERIC message (`:60-62`) KEEPS 6.28's sentence and ADDS *"Story 6.27b — `2026-10-10-303` Q2 A (its Consequence 1) for
    `peer_says_not_died` / `peer_death_date_differs`"*. Contracts mirror (`verification-decision.ts:130-136`) + its lockstep; then
    `pnpm --filter @twt/contracts test` ([[project_contracts_tests_outside_tsc]]).
  - [ ] 1.2 Import `PEER_MESH_WARNING_QUESTION_KEYS` and the `HasDiedCode` type from `../questionnaires/keys.js` (BF2 — ⛔ never the barrel);
    add `questionnaires/keys.ts` to the safe-leaves comment (`:46-50` — ⚠ already stale: it omits `one-payment-per-death.ts`, imported
    at `:93`; add both).
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
    wait or any writer. Source-scan leg, an ALLOWLIST (⛔ never "no file but its definition" — Task 4.2's `qualifyingRows` must call it):
    `withoutPeerWarnings` appears under `packages/domain/src/claim/` ONLY in `approval-warnings.ts` (its definition) and
    `correction-queue-read.ts` (the display read), and inside `approval-warnings.ts` ⛔ never within the bodies of
    `assertLateWarningsCovered`, `checkLaterApprovalWarningReason` or `insertClaimWarningApprovalRecord`; and in ⛔ no `*-persist.ts`.
    (`claim/index.ts` re-exports by `export *`, so it does ⛔ not trip the scan.)
  - [ ] 1.6 Fence (BF3): `'value_ciphertext'` AND `'valueCiphertext'` (a Drizzle-built fragment evades the snake_case string) join the
    deny-list array at `nominee-name-no-comparison-fence.test.ts:364`; `FENCED_FILES` stays `toBe(50)`. Add a teeth line: the same scan of
    `peer-mesh-reply.ts` DOES find `value_ciphertext` (it has 3). ⚠ `stripComments` (`:173-175`) strips only `/* */` blocks and full-line
    `//` ⇒ write the *"⛔ never `value_ciphertext`"* warning as a JSDoc above `peerReplyColumnsSql()` ONLY — ⛔ never as an SQL `--` comment
    inside the `sql` template or a trailing `//`, which turn the fence red. ⚠ Both `approval-warnings.ts` and `correction-queue-read.ts` are
    in `FENCED_FILES` (`:42`, `:108`), whose `FORBIDDEN_PATTERNS` include `toLowerCase\(\)\s*===` (`:164`) ⇒ the helper, the flags map and
    the queue filter use `Map`/`Set` `.get` / `.has(id.toLowerCase())`, ⛔ never `x.toLowerCase() === y`.
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
    SAME function, over the SHIPPED window helper — `deathDateWindow(D).map(fixtureDeathDateIndex)`
    (`packages/domain/src/questionnaires/answers.ts:38-40`, the helper production maps through `deathDateBlindIndex` at
    `apps/api/src/modules/claims/peer-request-core.ts:258-261`) — ⛔ never a re-derived `[−1, 0, +1]` offset list ([[feedback_stub_must_call_not_transcribe]]); 6.27a's `prep` helper uses `idx:${d}`
    (`peer-mesh-reply.spec.ts:110-121`), which compares `differs` against EVERY certificate.
- [ ] **Task 1b — the rule at every approver (AC3, AC4).** ⛔ No writer changes (F16 — the wait has ⛔ no per-kind filter). Live API legs in
  `apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts` (the 6.26b block `:915-1010` is the model: a per-kind loop at
  the District Admin, then the late legs), one `peer_says_not_died` and one `peer_death_date_differs` world each: the District Admin refused
  without a reason, accepted with one; the cycle-freeze vote (`:363`, `:407`), escalation resolution (`:479` — ONE-rule leg only, ⛔ no late
  leg: AC4), R9 vote / finalize (`:613`, `:663` — a vote whose own row misses a late peer key is SHORT), D27 no-correction approval
  (`:748`), Super Admin G1 (`:806`); the LATE leg for each of the final vote, no-correction approval, G1 and R9 finalize
  (`LateWarningReasonRequiredError`, then a District Admin late reason, then the approval passes — for R9 finalize, ⭐ then each
  approve-voter revises with a reason, else `….approve_votes_need_warning_reason`); R9 finalize on an R9-routed
  `state_trustee_approved` claim (`-324` A); F20 (a revise refused while a peer key is current — `warning_approval_final`); a refusal and an
  escalation with a peer key showing ⇒ ⛔ not gated. Seed answers through the REAL member PUT route (the `put` helper,
  `peer-answers-console.spec.ts:92-101`, and its `seedClaimWithPings` `:50-90` with the `seedNeighbour` helper `:33-48` — LIFT them into
  a shared `apps/api/tests/integration/_peer-reply-fixture.ts`, ⛔ never copy them). ⚠ `seedClaimWithPings` MINTS its own claim (events
  from `null` to `verification_in_progress`); the every-approver worlds are that spec's own claims, already at later states ⇒ SPLIT it so
  an `attachPings(claimCaseId, …)` half adds the selection and texted pings to an EXISTING claim, and the console spec keeps calling the
  composed form so the real index helper (`deathDateBlindIndex`,
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
    term beyond it — `qualifyingRows`' exact check drops a covered or non-warning answer (*'died'*, *'unknown'*, an equal date). The
    listing is `-279` A4's."*; the
    `lateWarningAwaitingReason` doc-block's *"THREE sources"* → FIVE (listing them); the header's third reason → *"a CURRENT warning key"*.
  - [ ] 2.3 NEW own-committing spec `packages/domain/tests/integration/claim/correction-queue-late-peer-reply.spec.ts` — the
    `correction-queue-late-inspection.spec.ts` construction (`onOwnTx(pid, fn, asSuperuser)` `:125-142` — the superuser path is its third
    argument, used at `:259`, `:287`; `freshPariwar()` `:118`; the `afterAll` replica-mode cleanup `:90-116` by PARIWAR; `finalVoteWaits`
    `:197`): AC5's legs (a)–(e′), each step its OWN committed transaction. The save goes through `savePeerAnswer` (domain,
    `peer-mesh-reply.ts:359`), which takes raw `prepared.dateWindowIndexes` (`:289`, `:451`) — so the Task 1.8 index fixture works — but
    ALSO needs: a selection and a TEXTED ping (`visible()` `:177-179` requires `sendOutcome === 'accepted'` and a matching `memberId`; insert
    them as superuser), `decryptedLive` holding every live ciphertext row of the reply (else `PeerRequestStaleError`, `:368-370` — leg (c)'s
    edit needs it) and `todayIst`. ⭐ The own-committing precedent that already does all of it is
    `packages/domain/tests/integration/claim/peer-mesh-reply-concurrency.spec.ts` (`seedRequest` `:126`, `asSuperuser` `:74`) — LIFT it
    into a shared domain fixture (`peer-mesh-reply.spec.ts`'s `requestAt` / `prep` / `decryptedLiveOf` `:64-133` are module-local, and
    `prep` builds `idx:${date}` — the index trap). `rereviewAndRedetermine` (`approval-warnings-death-facts.spec.ts:123`) is module-local and
    ⛔ not exported — lift it beside them, or compose its three exported `_helpers` calls. ⛔ Never inside one `setupLiveDb`
    BEGIN/ROLLBACK envelope (there every `now()` ties — [[project_db_clock_ordering_tests_tie]]).
  - [ ] 2.4 Red-checks (revert the line, watch it fail, restore — record each in the Debug Log): (b) red when the disjunct is deleted; (a)
    red when the comparator is reversed (`<`); (e) red when the WHOLE R9 OR-arm (`correction-queue-read.ts:252`) is deleted, and (e′) red
    when `liveRoutedToR9Exists()` is dropped from it (deleting that conjunct only WIDENS the arm, so a positive leg cannot see it — the 6.26b
    RD26 lesson, `correction-queue-late-inspection.spec.ts:250,280-286`); (c′) red when the FRAGMENT's `superseded_at IS NULL` is dropped
    (the old uncovered `not_died` key returns); (d) red when the date arm of `derivePeerReplyWarningKeys` is deleted. ⚠ The queue
    disjunct's own `superseded_at IS NULL` is ⛔ not observable (any warning row superseded after approval implies a live successor saved
    after it) — RECORDED as an unobservable narrowing term, ⛔ no red-check. ⚠ A leg that survives its red-check is hollow.
- [ ] **Task 3 — the approvers' read (AC6, AC11; PM24, BD1, the call-back number per `-328`).**
  - [ ] 3.1 Assembler (`peer-answers-assembler.ts`) — two changes, ⛔ no other behaviour change:
    (a) ⭐ `-328` (supersedes v3.1's `'show' | 'withhold'`): a NEW REQUIRED context option `callbackMobile: 'on_yes' | 'always'`.
    `'on_yes'` is today's branch exactly (`:171-191` — decrypt and show only when `consented`). `'always'` decrypts and shows the
    pinged member's mobile whatever the `callback_consent` answer, and for a ping with ⛔ no reply at all; the erased-sentinel →
    `{ status: 'none' }` and normalise-fail → `'unavailable'` arms are unchanged. Each caller passes `'always'` ONLY when the actor's
    matching role for the route's OWN key is `super_admin` (`rbac.matchingGrantRole(grants, key, ctx) === 'super_admin'` — the
    `claims.cycle-freeze.handlers.ts:494` pattern; the console: its `claim.verify` district key; PM24: the admitting arm's key), else
    `'on_yes'`. ⭐ This CHANGES the console for the Super Admin only (`-328` decision 4) — every other console actor is unchanged. Each
    `onCallbackMobileShown` call carries the basis (`'consented' | 'super_admin'`) for the audit context. Required, ⛔ never defaulted.
    (b) BF20: the wire mapping and the `catch → { status: 'unavailable' }` of the console's `assemblePeerMesh`
    (`claims.verifier-console.handlers.ts:832-857`) move into ONE exported function beside the assembler that TAKES THE ASSEMBLER CALL (a
    thunk — the throw happens inside `assemblePeerSection`'s selection / pings / answers reads, before any section exists), e.g.
    `assemblePeerMeshSection(() => assemblePeerSection(…), { claimCaseId, log })`; the mapping needs only the section,
    `claim.distinctPeerMeshResponderCount`, a log and the claim id — ⛔ never `VerifierConsoleContext`. `assemblePeerMesh` calls it, with
    ⛔ no console behaviour change, and so does PM24's handler. ⛔ Never a second copy of the transcript mapping.
    Doc-block: the header's *"the console route emits the audit lines"* gains *"and 6.27b's approvers' read (PM24) — each with its OWN event;
    the call-back number per `-328` (a *"Yes"*, or any answer for the Super Admin)"*; BD3's recorded meaning of "changed N times" beside `changeCount` (`:165`).
  - [ ] 3.2 Domain predicate for the step disjunction — ⛔ no new state list. The handler reads the claim's `current_state` and
    `deceasedMemberId` (`claim.getClaimCase`, `packages/domain/src/claim/read.ts:73`), then admits on ANY of FOUR arms (each with
    `rbac.hasPermission(request.scopeGrants, key, { dimension: 'pariwar', value: pariwarId, pariwarId })` — BF14):
    1. state ∈ `claim.TRUSTEE_VOTABLE_STATES` AND `cycle.freeze` — the final vote and the no-correction approval;
    2. state ∈ `claim.TRUSTEE_ESCALATION_RESOLVABLE_STATES` AND `claim.getLiveDecision(…)?.outcome === 'escalated'` AND `cycle.freeze` — the
       cycle-freeze escalation resolution (BF17);
    3. `hasLiveRoutedRow(…)` AND state ∈ `claim.R9_OUTCOME_FROM_STATES` AND `claim.r9_vote` — an R9 vote / finalize (BF18);
    4. `claim.isCorrectionClaimHeld(…)` AND `claim.review_escalated_closure` (the escalation DETAIL read's key — BF14; both escalation keys
       are `super_admin`-only, so v1 is unaffected) — the Super Admin's G1 step.
    Evaluate them in that order and stop at the first that admits (arms 3–4 cost one statement each); a THROW in any arm is a 500, ⛔ never a
    404. Else **404** (one answer for "⛔ not at a later step", "unknown", "another Pariwar"). The admitting arm is the audit context's
    `step` (`final_vote` | `escalation_resolution` | `r9_vote` | `super_admin_approval`). ⚠ RECORDED (PM24, `-310` CF2 *"for that claim at
    that step only"* — read per STATE, a match for every v1 actor since each holds all keys past the first hook ⇒ the disjunction reduces
    to STATE gating): a Pariwar Admin may read in `state_trustee_freeze` while the Super Admin's G1 step is open — accepted.
  - [ ] 3.3 Route file `apps/api/src/modules/claims/claims.peer-answers.routes.ts` + `claims.peer-answers.handlers.ts`: `GET
    /api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers`, chain `[requireAdminSession, scopeResolutionHook,
    requirePermissionHook(deps, 'cycle.freeze', { dimension: 'pariwar' })]` (the cycle-freeze route's hook shape,
    `claims.cycle-freeze.routes.ts:44,63`); register it in `apps/api/src/modules/claims/index.ts` beside `registerVerifierConsoleRoutes` (`:47`).
    The handler reads in `request.scopeTx` (the console's shape; its client is `request.scopeTx.client` for `underSavepoint`) — ⛔ never
    its own `openScopeTx` (`getPending` / `getPanel` do open one; PM24 follows the console, the surface it shares a section with). It calls `assemblePeerSection(enc, { db, pariwarId, claimCaseId, actorId, callbackMobile: <'always' for a super_admin match, else
    'on_yes'>, onCallbackMobileShown: (pingId, basis) => shown.push({ pingId, basis }), run: (label, read) => underSavepoint(client, `peer_answers_${label}`, read) }, () => {}, memberName)`
    (signature `peer-answers-assembler.ts:70-75`: `(enc, ctx, bump, memberName)`; `run` REQUIRED — 6.27a U11: a bare read leaves an aborted
    tx), then Task 3.1 (b)'s mapping. `memberName`: `kyc.getMemberKycProfile(tx, pariwarId, deceasedMemberId)`
    (`packages/domain/src/kyc/profile-read.ts:24`) → `decryptKycField(nameCiphertext, pariwarId, deps.encryption)` (`../kyc/kyc-crypto.js`)
    under a local try/catch → `null` (the shape of the console's `safeDecrypt`, `claims.verifier-console.handlers.ts:255` — module-private
    and typed on `VerifierConsoleContext`, so ⛔ not reusable as is), falling back to the literal `'the member'` — the console's own path
    (`claims.verifier-console.handlers.ts:294-297`, `:347`) minus its document read; ONE KMS decrypt, ⛔ not audited (as on the console). ⚠ ⛔
    Never `resolvePeerRequestMemberName` (`peer-request-core.ts:78`) — a different, mode-resolved name. Then the warnings read under its
    OWN `underSavepoint` (failure ⇒ every flag `null`) and the Task 3b stitch. Response (contract
    `packages/contracts/src/claims/peer-answers.ts`, NEW, re-exported from `claims/index.ts`): `ClaimPeerAnswersResponse = z.object({
    peerMesh: PeerMeshSection.optional() }).strict()` — ABSENT when the assembler says `hidden` (PM25 (c) — ⛔ never a variant; the 6.27a
    contract precedent), `{ status: 'empty' }` for ⛔ no selection, `present` otherwise, `{ status: 'unavailable' }` when the section throws.
    OpenAPI: the route's `schema.response` IS the registration (swagger reads it at runtime; the console and cycle-freeze routes are ⛔ not
    in `openapi/v1.yaml`); a single-object GET — `apps/api/tests/integration/forced-pagination.spec.ts` exempts it by shape (`isCollectionResponse`, `:56-62`).
  - [ ] 3.4 Audit: ONE new `AuthAuditEventType` member `'admin_claim.peer_answers_read'` (`apps/api/src/audit/audit-sink.ts:15-643`, with
    a doc comment) AND a second, `'admin_claim.peer_callback_mobile_shown'` (`-328`), emitted through `emitAuthAudit(deps, request, type, fields)` (`apps/api/src/modules/auth/shared/audit.ts:14`) once per successful read (incl.
    `hidden` / `empty`); resource locator `claim:<id>`, LOWER-CASED (an upper-case locator is discarded); context = the admitting `step`
    (Task 3.2), the section status and counts (pings, answers) — ⛔ never a name, an answer, a code, a date or a number. ⚠ `context` is only
    SHA-256 HASHED (`apps/api/src/modules/auth/shared/audit.ts:25-31` — `audit_log_entries` has ⛔ no context column) ⇒ assert context keys on the in-memory sink
    only, and the persisted row's locator through the production sink. ⛔ Never a direct `writeAuditEntry` (access-wrapper invariant (3),
    F40). A 404 is ⛔ not audited as a read. ⭐ The showing event: ONCE PER number shown, emitted only AFTER the response is built (6.27a
    review S17 — ⛔ never a line for a number the response then failed to deliver; the console's
    `admin_verifier_console.peer_callback_mobile_shown` precedent, `claims.verifier-console.handlers.ts:1212-1218`), locator
    `claim:<id>:ping:<id>` LOWER-CASED (6.27a review R11 — the ping is durable only in the locator), context `{ basis: 'consented' |
    'super_admin', step }` — ⛔ never the number. The console's existing event gains the same `basis` in its context.
  - [ ] 3.5 Admin: extract `PeerMeshView` (`SignalsPanel.tsx:208`) AND the private `NonPresent` (defined `:126-133`, used `:382`; the console's `empty` /
    `unavailable` words, `i18n-en.ts:39-40`) to `apps/admin/src/modules/claim-verification/PeerMeshView.tsx`, exported from
    `claim-verification/index.ts`; `SignalsPanel` imports them (⛔ no behaviour change — its tests stay green unchanged). NEW
    `NeighboursAnswersPanel.tsx` (same module), on the `NomineeNameCheckDisclosure.tsx` model (BF7): a collapsed disclosure *"Neighbours'
    answers"* (button with `aria-expanded`) over a `useClaimPeerAnswers(pariwarId, claimCaseId, enabled = true)` hook in `hooks.ts` (the
    `useNomineeNameCheck` positional shape, `:727`) with `refetchOnWindowFocus: false` and `refetchOnReconnect: false` (⛔ never an audited
    read nobody performed), and a `useForgetClaimPeerAnswers` (`:745`'s shape) that removes the query on CLOSE (⛔ no decrypted names kept in
    the QueryClient across 1,500 cards). ⇒ ⛔ no request before the first open; each open is ONE fresh, audited read (the precedent's
    reading — ⛔ never a cached second look). Renders `PeerMeshView` for `present`, `NonPresent` for `empty` / `unavailable` and a failed
    request, *"Nothing to show at this step"* for a 404 (AC6 — ⛔ never the transient-fault words), and ⛔ NOTHING — the disclosure itself
    removed — when `peerMesh` is absent (hidden). Mounted on the four hosts (BF7) OUTSIDE every approve-only or warnings-only branch,
    keyed by claim id (the 6.23b `EscalationDetail` keying lesson): `PendingCaseCard` beside `NomineeNameCheckDisclosure`, but ⛔ not on the
    `voted_pending_commit` bucket (its un-routed claims always 404; its R9-routed ones — `cycle-freeze-read.ts:190` filters on state only —
    are read on `R9CasePanel` instead); `R9CasePanel` beside its
    `NomineeNameCheckDisclosure` (`:186`), ⛔ never inside `:415` / `:419` / `:461`; `EscalationPanel` and `PariwarClosureStrip` outside
    their approve-only branches (the approver reads before choosing). English only (F22). ⛔ No fetch on render; ⛔ no fetch per card.
  - [ ] 3.6 Human-actor invariant: `COVERAGE_SET` entry (`scripts/claim-adjudication-human-actor-invariant/check.ts:46-246`, shape `:31-44`)
    `{ file: 'apps/api/src/modules/claims/claims.peer-answers.routes.ts', pathSubstrings: ['peer-answers'], owner: 'Story 6.27b',
    expectedMethods: ['get'] }` (an unclassified route file fails the gate — enrolment satisfies it).
  - [ ] 3.7 Tests — API (`apps/api/tests/integration/claims/peer-answers-approvers.spec.ts`, NEW): AC6's matrix — each of the FOUR arms
    allowed (incl. the escalated `verifier_review` claim through arm 2, and a live-routed `verifier_review` claim through arm 3); the 403;
    every 404 state incl. a DENIED claim with a live routing (BF18) and `state_trustee_approved` with ⛔ no live routing; the audit line's
    context keys (in-memory sink) and the persisted locator (production sink), ⛔ no content (`JSON.stringify` of the line contains ⛔
    neither the neighbour's name, the date, nor the mobile); ⭐ `-328` — a neighbour who answered *"yes"* ⇒ `callbackMobile: { status: 'shown' }` for a
    Pariwar Admin AND ONE `admin_claim.peer_callback_mobile_shown` line (persisted locator `claim:<id>:ping:<id>`, basis `consented`, ⛔ never
    the number); *"no"* / unanswered / ⛔ no reply ⇒ `{ status: 'none' }`, ⛔ no decrypt (an encryption spy) and ⛔ no line for a Pariwar
    Admin — but `{ status: 'shown' }` and a `super_admin`-basis line for the Super Admin; a failed section ⇒ ⛔ no line; the CONSOLE: the
    District Admin and a verifier unchanged (*"Yes"* only), the Super Admin shown on *"No"* (basis `super_admin`); the hidden actor ⇒ `peerMesh` ABSENT and audited;
    a broken answer ciphertext ⇒ that answer `unavailable`, the rest shown; the warnings read forced to fail ⇒ flags `null`. Admin
    (`apps/admin/tests/neighbours-answers-panel.test.tsx`, NEW): ⛔ no request before open; ONE request per open; ⛔ no request on window
    focus; the query removed on close; the four hosts mount it (one leg each) and `PendingCaseCard`'s voted bucket does ⛔ not; the hidden
    case renders nothing; the 404 line; the `NonPresent` lines. Contracts: the response schema (strict; absent `peerMesh` valid).
- [ ] **Task 3c — the question's new words (AC11; `-328` decisions 2 and 4).**
  - [ ] 3c.1 Copy: `packages/i18n/locales/en/claim.json` `peer_request_questions.callback_consent.question` → *"May the Admin phone you about
    this?"*; `hi/claim.json` → *"क्या एडमिन इस बारे में आपको फ़ोन कर सकते हैं?"* (the existing line with *"ज़िला"* removed — `-328` R2, our
    translation; flag it in Completion Notes for BigDev). The words come from the question's `copyKey` (`peer-mesh.ts:161`), so ⛔ no new
    questionnaire version: the app is ⛔ not live and ⛔ no answer exists under the old words (`-328` R1) — ⚠ RECORDED: any test-database
    answer given earlier now renders with the new words on the console.
  - [ ] 3c.2 Provenance: add `'2026-10-13-328'` to `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS` (`packages/domain/src/questionnaires/keys.ts:60` —
    *"adding one here is a reviewed code edit that cites it"*; else the validator refuses it, `validator.ts:55-56`), a `R328` const beside
    `R304` (`peer-mesh.ts:30`), the `callback_consent` question's `approvedBy: [R304, R328]` (`:167`), and one line in the file header's v2
    note (`:8`) naming the word change. `questionnaires.test.ts` (`:67`, `:152-154`) stays green — re-run it.
  - [ ] 3c.3 Sweep: `git grep -n "District Admin phone you\|ज़िला एडमिन इस बारे में आपको"` — today it hits only the two locale files and
    RECORDS (`.decision-log.md`, story files, routing notes), which are ⛔ never edited. A hit in code, tests or UX docs is updated.
  - [ ] 3c.4 Tests: the member questionnaire GET returns the new words (en + hi — `peer-request-member.spec.ts`'s shape); the console's
    question words (`enWords(q.copyKey, …)`, `peer-answers-assembler.ts:161`) read the new English; the Super Admin console leg (AC11);
    microcopy scan clean.
- [ ] **Task 3b — the per-answer flags (AC8; PM13's flags).**
  - [ ] 3b.1 Contract: `PeerMeshAnswerView` (`verifier-console.ts:195-211`) gains REQUIRED `warningFlag: z.boolean().nullable()` with a
    doc-comment (*"`true` — this answer carries a current warning; `false` — checked, ⛔ none (and always for a question that can ⛔ never
    warn); `null` — could ⛔ not be checked just now (the warnings read failed, or the answer is newer than it)"*). Every contracts / admin /
    API fixture that builds the view gains the field (BF6 — parsed responses): `packages/contracts/tests/claims-verifier-console.test.ts:109`
    (a strict parse — RED without it), `apps/admin/tests/verifier-console.test.tsx:110-111` (two answers);
    `apps/api/tests/integration/claims/peer-answers-console.spec.ts:173-174` uses `toMatchObject` (safe), but `:119` calls
    `assemblePeerMesh` directly — where the stitch runs decides whether that leg sees the field (state it in the leg).
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
    `apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts:54-55` ALREADY wraps both the single and the bulk reader
    — a file-local `vi.mock`, so the console leg lives in that spec) ⇒ `null`; admin render legs.
- [ ] **Task 4 — the blind-first filter (AC7; PM25 (c)).**
  - [ ] 4.1 Console: thread `{ peerHidden }` through the exported `assembleApprovalWarnings(ctx, claimCaseId, claimState, reads, opts)`
    (`claims.verifier-console.handlers.ts:527-534` — tests call it directly, `verifier-console.spec.ts:1188`, `:1268`; default `{ peerHidden:
    false }`) into `readApprovalWarningsSection` — `peerHidden = peerMesh === undefined` (BF9: `assemblePeerMesh` returns `undefined` ONLY for
    `hidden`, built at `:347` before the warnings read at `:386`; ⛔ no new read). When true: `kinds`, `uncoveredSinceApproval`,
    `viewerCanRecordLateReason` and `lateKeysUncoveredForViewer` are computed from `claim.withoutPeerWarnings(w)` (BF10); ⭐ `reviseBlocked`
    is ⛔ NEVER computed from the filtered `w` (BF19 (b); the code's own rule, `:604-607`). ⭐ BD4: the section gains a REQUIRED
    `ownVisitPending: boolean` (= `peerHidden`; contract `verifier-console.ts` + `verifier-console-shape.spec.ts:544-546`'s exact key-set
    pin AMENDED by naming the key — ⛔ never loosened), on BOTH the available and the failed-read (`:594-612`) paths. When `true`: `viewerCanRecordLateReason` is forced `false` (the
    `LateWarningReasonPanel` mounts on it, `VerifierConsoleRoute.tsx:673`, and BD4 refuses the late reason); `VerificationDecisionStrip`
    disables Approve, and Revise of an APPROVAL only (`revisionOutcome === 'approved'`, the `:120` rule — a denial's revise is ⛔ never
    refused), with BD4's neutral words (⛔ no kind, ⛔ no count), and keeps Deny / Escalate enabled (the strip's outcomes are `approved |
    denied | escalated`). `peerAnswerFlags` stays OFF the section (that pin). ⚠ RECORDED (the V11 trade-off it follows): `assemblePeerMesh`
    also returns `undefined` when the HIDE CHECK FAILED ⇒ on that transient fault a non-hidden District Admin's strip shows the neutral
    block and omits a peer kind; the server (Task 4b's guard and the ONE rule) is the authority and the next read is right — ⛔ never an
    un-reasoned approval. The same trade-off on PM24's panel: a failed hide check makes `peerMesh` absent, so the disclosure vanishes for a
    non-hidden approver with ⛔ no "could not be shown" words — RECORDED, ⛔ not changed (the fail-closed rule wins).
  - [ ] 4.2 Queue: `ListClaimsUnderCorrectionOptions` gains `hidePeerKindsForActor?: string`, threaded from `listClaimsUnderCorrection`
    (`:314`) into `qualifyingRows(db, pariwarId, candidates, onLateWarningsUnavailable)` (`:332-337`) and `readLateWarningArm(db, pariwarId,
    claimCaseIds)` (`:421`), which take ⛔ no options today. Inside `readLateWarningArm`'s SAVEPOINT (a failure takes the existing fault path:
    ⛔ no kind revealed, ⛔ nothing dropped), ONE statement returns the claim ids whose peer section is hidden from that actor, returned
    BESIDE the warnings map — built from the SAME predicate as `isPeerSectionHiddenFromActor`: refactor its raw-SQL `EXISTS … AND NOT
    EXISTS` body (`peer-mesh-reply.ts:622-634`) into an exported fragment `peerSectionHiddenFromActorSql(pariwarRef: SQL, claimRef: SQL,
    actorId: string)` used by BOTH (⛔ never a copy; ⛔ no import cycle — `peer-mesh-reply.ts` does ⛔ not reach `correction-queue-read.ts`).
    `qualifyingRows` applies `withoutPeerWarnings` to those claims' `w` before `uncoveredKeys` — so a row late ONLY by a peer key yields
    count 0 / awaiting `false` and is DROPPED for that actor (BF11's refinement holds; ⛔ never emitted with count 0). ⚠ RECORDED: on the
    FAULT path a candidate raised only by the peer arm is still kept as *"may wait"* (`null` count) — ⛔ no kind is named. The handler
    (`claims.nominee-name-check.handlers.ts:465`) passes `hidePeerKindsForActor: <session actor id>`.
  - [ ] 4.3 The four later-approver surfaces ARE filtered (PM25 (c) verbatim: *"that actor's warnings summary"*; BF21 — a Pariwar Admin or
    the Super Admin can be a scheduled inspector): each host handler (`getPending` / `getEscalation` / `getClosureQueue` / `getPanel`, BF7)
    resolves the actor's hidden claim ids with the Task 4.2 fragment — ONE set-based statement per page, ⛔ never per card, INSIDE the
    host's existing warnings SAVEPOINT (a failure falls back to `UNAVAILABLE_APPROVAL_WARNINGS`: ⛔ no kind revealed) — and for those claims
    only: applies `withoutPeerWarnings` before `toApprovalWarningsSummary` (`later-approval-warnings.ts:121`); in `getPanel`
    (`claims.r9-voting.handlers.ts:329-341`, `:378`) computes `short` and `coversCurrentWarnings` from the FILTERED keys (display only —
    finalize's binding check `r9-voting-persist.ts:692-704` is unchanged); and sets a per-claim `ownVisitPending: true` on the host DTO, so
    the host's approve control shows BD4's neutral block (AC7). The other three hosts derive nothing else from `w` (cycle-freeze `:353-356`,
    closure `:502-505`, escalation `:188-190`). PM24's panel is hidden by the assembler itself.
  - [ ] 4.4 Tests: domain unit — Task 1.5's allowlist scan; live — an inspector with a `scheduled` assignment: console strip `kinds` /
    counts / `viewerCanRecordLateReason` / `lateKeysUncoveredForViewer` carry ⛔ no peer trace and `ownVisitPending: true`, while another
    District Admin's read of the SAME claim shows them and `ownVisitPending: false`; `reviseBlocked` UNCHANGED by the filter (an approved
    claim with only a peer key ⇒ still `warning_approval_final`); a `certificate_check`-only completion ⇒ still hidden; a completed FULL
    visit ⇒ shown; the queue row (late only by a peer key) absent for the inspector, present for another DA; EACH of the four hosts' summary
    for a Pariwar Admin (or the Super Admin, for the escalation) who is the scheduled inspector — filtered, `ownVisitPending: true` —
    another's not; the R9 panel's per-vote `covers_current_warnings` unfiltered-vs-filtered; admin legs (`apps/admin/tests/verifier-console.test.tsx`
    and one per host): Approve and Revise-of-approval disabled with the neutral words (⛔ no kind, ⛔ no count), Deny / Escalate enabled, the
    late-reason panel absent; the GATE still reads every key (another DA's approval over
    the key is refused without a reason).
- [ ] **Task 4b — a hidden actor cannot approve (AC10; BD4, `-327` decision 2).**
  - [ ] 4b.1 Domain: ONE guard `assertActorMayApprove(db, pariwarId, claimCaseId, actorId)` (e.g. in `peer-mesh-reply.ts` beside the
    predicate, or a new leaf `claim/approver-own-visit.ts`) that throws a typed `OwnGroundVisitPendingError` when
    `isPeerSectionHiddenFromActor(…)` is true. ⛔ Never a conjunct of `assertClaimApprovable`'s warning rule, the wait or the coverage; it
    reads ⛔ no neighbour answer.
  - [ ] 4b.2 Call it FIRST — before `assertClaimApprovable` and before any warnings read (several writers run the gate first:
    `voteOnFrozenClaim` `:585`→`:606`, `decideEscalatedClosure` `:1347`/`:1359`→`:1368`, `approveNoCorrectionNeeded` `:1558`→`:1566`, and its
    wait's `LateWarningReasonRequiredError` carries `details.kinds`, `later-approval-warnings.ts:36-41`), on the APPROVE outcome only — in
    `finalizeR9Outcome` right after `computeR9Outcome` (`r9-voting-persist.ts:654`), inside `if (outcome === 'approved')`, before the gate
    (`:668`) — in each approving writer: `adjudicateClaim` and
    `reviseDecision` (`verifier-decision-persist.ts:344`, `:580`), `recordLateWarningReason` (`approval-warnings-persist.ts:76`),
    `voteOnFrozenClaim` and `resolveEscalation` (`state-trustee-decision-persist.ts:513`, `:1076`), `castR9Vote` (approve votes) and
    `finalizeR9Outcome` (`r9-voting-persist.ts:504`, `:611`), `decideEscalatedClosure` (`correction-closure.ts:1259`, approve) and
    `approveNoCorrectionNeeded` (`:1525`). ⛔ Never on a denial / refusal / return / escalation / R9 deny vote / a finalize that computes "denied" / an appeal reversal. This supersedes v3.0
    Trap 1's *"⛔ never edit … a writer"* IN PART, for this guard only (`-327`).
  - [ ] 4b.3 API: map `OwnGroundVisitPendingError` to ONE 409 code `<prefix>.own_ground_visit_pending` with BD4's neutral words and ⛔ no
    `details` — in `translateLaterApprovalWarningError` (`later-approval-warnings.ts:41-60`, so every later-approver route shares it) AND in
    every route that maps `ApprovalWarningReasonRequiredError` itself (`git grep -n ApprovalWarningReasonRequiredError apps/api/src` — the
    verifier decision route, `claims.verification-decision.handlers.ts:341`, is the only other). The admin client words for the code in each host's error map (English, F22).
  - [ ] 4b.4 Red-by-design sweep BEFORE the change: `git grep -n "inspectorActorId\|inspector_actor_id" -- '*tests*'` and list every spec
    whose APPROVING actor also holds a `scheduled` inspection on that claim; each goes red by design and is amended by NAMING the new
    refusal (6.26b RD19's shape) — ⛔ never by weakening the guard.
  - [ ] 4b.5 Tests (AC10): for EACH approving act — the hidden actor refused with the neutral code, WITH and WITHOUT a peer key current,
    ⛔ no `details`, ⛔ no row or event written; their denial (and its revise) / return / escalation / R9 deny vote / a "denied"
    finalize succeeds; the refusal lifts on a completed FULL visit and on `superseded`; a `certificate_check` completion does ⛔ not lift it
    while another of their assignments stays `scheduled`; one admin leg per host renders the error code's neutral words. Red-check: remove the guard from ONE
    writer ⇒ that writer's leg goes red.
- [ ] **Task 5 — gates and close (AC9).** `pnpm --filter @twt/contracts test`; the human-actor invariant; `access-wrapper-invariants`;
  forced pagination; microcopy; friction budget (admin-only ⇒ ⛔ not member-facing — confirm `MEMBER_FACING_PREFIXES` excludes `apps/admin/`);
  `grep -rn '\*\*/' ` over every edited doc-block ([[project_markdown_emphasis_closes_jsdoc]]); `pnpm ci:local` with `DATABASE_URL` on
  `:5433` ([[project_ci_local_double_run_pollution]]); a red that is a known flake per [[project_known_livedb_test_failures]] is re-run and
  RECORDED, ⛔ never hidden. Records: this file's Dev Agent Record, File List, Change Log; `sprint-status.yaml` row flip + ONE ledger
  entry ([[project_sprint_status_safe_prepend]]); the THREE Task 0.2 appended lines (`-326` Consequences 1–2, verbatim); the BF22 appended
  line on the erased-sentinel item (re-deferred, ⛔ never closed). ⛔ No `file:NNN` into `.decision-log.md` / `deferred-work.md` /
  `sprint-status.yaml` in any record you write (cite id + clause, item heading, row key).

## Dev Notes

### ⚠ Traps (6.27a's list applies — Traps 3, 4, 5, 6, 7, 12, 13, 14, 15, 16, 18; these are 6.27b's own)

1. **⛔ No conjunct in the gate; ⛔ never edit the assertion or a writer** (6.27a Traps 3 / 4) — EXCEPT the ONE BD4 guard call (Task 4b,
   `-327`), which reads ⛔ no neighbour answer. The two kinds reach every approver BY CONSTRUCTION — the ONE rule and the wait iterate
   `w.keys` (F16). If a test seems to need any OTHER writer change, the fixture is wrong.
2. **Both readers or neither** (6.27a Trap 6) — `peerReplyColumnsSql()` in BOTH statements; the parity test (Task 1.8) is the guard.
3. **The index fixture trap** (Task 1.8) — a neighbour window built with a different index function than the certificate's compares
   `differs` against everything and every leg passes for the wrong reason. Assert one EQUAL-date leg yields ⛔ no key FIRST.
4. **⛔ Never inherit a neighbour key** (`-261` C3) — the fragment's `claim_case_id` filter is the whole rule; ⛔ never join through the
   deceased or the selection.
5. **`withoutPeerWarnings` is a DISPLAY filter** — ⛔ never on the assertion, the wait, `checkLaterApprovalWarningReason`,
   `insertClaimWarningApprovalRecord` or R9's coverage — and ⛔ never on `reviseBlocked`. A filtered key still has to be covered by
   SOMEONE's reason, and BD4 guarantees that someone is ⛔ never the actor it was hidden from.
6. **The panel must ⛔ not fetch per card** (BF7) — 1,500 cards ⇒ 1,500 decrypting, audited reads.
7. **The call-back number follows `-328` EXACTLY** — on a *"Yes"* for the District Admin, the district's verifiers and the Pariwar Admin;
   on ANY answer only for a `super_admin` MATCH (⛔ never "holds every key" by guessing; `matchingGrantRole`). `callbackMobile` is
   REQUIRED, ⛔ never defaulted. ⛔ Never widen `'always'` to another role; every showing audited with ITS OWN event. ⚠ v3.1's withhold
   (`-327` decision 1) is superseded — ⛔ never build it.
8. **Ordering tests in SEPARATE COMMITTED transactions** ([[project_db_clock_ordering_tests_tie]]); `saved_at` is `clock_timestamp()`.
9. **Contracts tests are outside tsc** — a new REQUIRED field (`warningFlag`) breaks fixtures silently; run vitest
   ([[project_contracts_tests_outside_tsc]]).
10. **Prettier is ⛔ not enforced** — hand-format ([[project_prettier_not_enforced]]); **Markdown emphasis closes a JSDoc** — grep `\*\*/`.
11. **`useT()` / memo** — the admin console is plain English constants (`i18n-en.ts`), ⛔ not `useT` — but the new hook's `enabled` flag must be
    state, ⛔ never a fresh closure, so the query does ⛔ not refire.
12. **TanStack**: the disclosure's query is read-only; ⛔ no `reset()` in `onSettled` ([[project_tanstack_onsettled_before_success]]);
    `refetchOnWindowFocus` / `refetchOnReconnect` are `false` and the query is removed on close (BF7 — each open is ONE audited read).
13. **The fence reads code, ⛔ not comments-in-SQL** (Task 1.6) — a `value_ciphertext` warning inside the `sql` template or after code on
    the same line turns the fence red; JSDoc only. And ⛔ never `x.toLowerCase() === y` in a fenced file — `Map`/`Set` on a lower-cased id.
14. **BD4's refusal is checked BEFORE `assertClaimApprovable` and any warnings read** — otherwise a hidden actor's 409 carries `details.kinds` and names the hidden kind
    (BF19 (a)). It is unconditional: ⛔ never `if (peerKeyCurrent)` — that branch IS the leak.
15. **PM24's arms are FOUR** (Task 3.2) — the escalation resolution runs in `verification_in_progress` / `verifier_review` (BF17), and a
    live routing outlives a denial (BF18). A matrix that only tests the three votable states is green while the Pariwar Admin 404s.

### Reuse map (⛔ never reinvent)

| Need | Reuse |
|---|---|
| a kind's threading | 6.28's commit `7c6986e5` (11 files: domain list + readers + queue disjunct + contracts + `i18n-en.ts` + console specs) and 6.26b's `bdb01014` |
| the pure derivation | `deriveDeathFactWarningKeys` (`approval-warnings.ts:253`) |
| the stitch | `stitchDeathFactFlags` (console handler) |
| the own-committing queue spec | `correction-queue-late-inspection.spec.ts` |
| the per-approver live legs | `approval-warnings-every-approver.spec.ts:915-1010` |
| answers in API tests | `peer-answers-console.spec.ts:33-101` (lift into a shared fixture, split — Task 1b) |
| the step's R9 / escalation reads | `hasLiveRoutedRow`, `isCorrectionClaimHeld` (⛔ never `readEscalatedClosureDetail` as a predicate) |
| the SAVEPOINT wrapper | `underSavepoint` (`apps/api/src/modules/claims/later-approval-warnings.ts:161`) |
| the section | `assemblePeerSection` + the extracted wire mapping (Task 3.1 (b)) + `PeerMeshView` / `NonPresent` |
| the on-demand audited disclosure | `NomineeNameCheckDisclosure.tsx` + `useNomineeNameCheck` / `useForgetNomineeNameCheck` (`hooks.ts:727`, `:745`) |
| PM24's step predicates | `TRUSTEE_VOTABLE_STATES`, `TRUSTEE_ESCALATION_RESOLVABLE_STATES` + `getLiveDecision`, `R9_OUTCOME_FROM_STATES` + `hasLiveRoutedRow`, `isCorrectionClaimHeld` |
| the neighbour's date window | `deathDateWindow` (`questionnaires/answers.ts:38`) `.map(fixtureDeathDateIndex)` |
| own-committing answer saves | `peer-mesh-reply-concurrency.spec.ts` (`seedRequest` `:126`, `asSuperuser` `:74`) — lift into a shared domain fixture |
| the hide predicate | `isPeerSectionHiddenFromActor` → the shared `peerSectionHiddenFromActorSql` fragment (Task 4.2) — used by the queue, the four hosts and BD4's guard |

### Testing standards

Vitest everywhere; live DB specs on `:5432` AND `:5433` ([[project_live_db_test_gotchas]] — never regen an applied migration; this story
has ⛔ no migration). Each load-bearing test red-checked (revert → red → restore), recorded in the Debug Log. ⛔ Never loosen a pinned list
to `toContain` without its count. Domain specs that move a fixture's keys are RED BY DESIGN and amended by NAMING the new key — none is
expected (⛔ no default fixture writes a WARNING answer — grep `savePeerAnswer` / `/peer-requests/` / `INSERT INTO claim_peer_mesh_reply_answers`
in `packages/domain/tests` and `apps/*/tests` before and after; today only the 6.27a peer specs do, plus a raw `callback_consent` insert at
`verifier-console.spec.ts:302` (⛔ no key) and the RLS policy spec); BD4's guard has its OWN red-by-design sweep (Task 4b.4); but exact `toEqual` assertions on `PeerMeshAnswerView` objects
(`peer-answers-console.spec.ts:174` uses `toMatchObject` — fine) and on `approvalWarnings.kinds` in `verifier-console.spec.ts` /
`verifier-console-shape.spec.ts` (6.28 touched both) must be re-read.

### Project structure notes

- UPDATE (`-328`): `packages/i18n/locales/{en,hi}/claim.json` (one key each), `packages/domain/src/questionnaires/keys.ts`
  (the ratified-decision list), `peer-mesh.ts` (`approvedBy`).
- NEW: `apps/api/src/modules/claims/claims.peer-answers.routes.ts`, `claims.peer-answers.handlers.ts`;
  `packages/contracts/src/claims/peer-answers.ts`; `apps/admin/src/modules/claim-verification/PeerMeshView.tsx`,
  `NeighboursAnswersPanel.tsx`; specs named in the Tasks; `apps/api/tests/integration/_peer-reply-fixture.ts`.
- UPDATE: `approval-warnings.ts`, `correction-queue-read.ts`, `peer-mesh-reply.ts` (the hide fragment + BD4's guard), `peer-answers-assembler.ts`
  (the `callbackMobile: 'on_yes' | 'always'` option + the extracted mapping), `claims.verifier-console.handlers.ts`, `claims.nominee-name-check.handlers.ts`, the
  four host handlers (`claims.cycle-freeze` / `claims.correction-escalation` / `claims.correction-closure` / `claims.r9-voting`),
  `later-approval-warnings.ts` (the BD4 409), `apps/api/src/modules/claims/index.ts` (route registration), `audit-sink.ts`,
  `verification-decision.ts`, `verifier-console.ts`, the contracts index, the nine approving writers (BD4's guard call only — Task 4b.2),
  `SignalsPanel.tsx`, `VerificationDecisionStrip.tsx`, `i18n-en.ts`, `client.ts`, `hooks.ts`, the four hosts, the human-actor invariant,
  the fence test, the kinds pin test (its `it` title `:57` and generic message), the contracts kinds doc line (`verification-decision.ts:128`),
  `verifier-console-shape.spec.ts` (the key-set pin, naming `ownVisitPending`).
- ⛔ No migration. ⛔ No new permission key. ⛔ No mobile change. ⛔ No change to `recordPeerMeshResponse`, `savePeerAnswer` or the
  assertion; the ONLY writer change is BD4's guard call.

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
`2026-10-10-303` (Q2 A), `-304` (Q6 A), `-305` (§1 (c)), `-308`, `-310` (CF2), `-311`, `-324`, `-325`, **`-326`** (BD1–BD3), **`-327`** (BD2
superseded in part, BD4), **`-328`** (Trustee-ratified — the number and the question's words); the routing note `trustee-panel-routing-note-2026-10-13-6-27b-callback-number-for-later-approvers.md`;
`deferred-work.md` items *"`-308`'s 6.27a share … HANDED OFF to row 6-36"*, *"'Changed N times' counts dependant removals and same-value
re-entries"* and *"An ERASED (sentinel) neighbour answer reads 'could not be shown just now' on the console"*; `sprint-status.yaml` row
`6-36-peer-mesh-school-wise-selection` comment.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
- 2026-10-13 — v3.0: re-derived against 6.27a's shipped build (`560369a7`) by `bmad-create-story 6.27b` — BF1–BF16 found; BD1–BD3 put to BigDev and ANSWERED in session (BD1 A, BD2 B on his signup-consent reading — recorded with its gap, BD3 A);
  status `backlog` → `ready-for-dev`. Task 0.2 done: `2026-10-13-326` committed alone (`7867314b`). Ultimate context engine analysis completed — comprehensive developer
  guide created.
- 2026-10-13 — v3.1: `bmad-create-story validate 6.27b` — four read-only fresh-context verifiers (domain cites, API/admin cites,
  governance, adversarial design), then two fresh-context re-validators against the pass's OWN output (4 HIGH, all in this pass's text —
  the note silent on the console's existing showing, refused acts still offered on the late-reason panel / hosts / R9 vote flags, and
  `-327` claimed committed before it was — fixed before the governance commit). BF17–BF22 found; BigDev answered BD2 (withhold + route) and BD4 (unconditional) in session, committed
  ALONE as `2026-10-13-327` (`f65fe069`) with the BD2 routing note (written, ⛔ not sent). ⛔ No code.

- 2026-10-13 — v3.2: the Panel RULED the routed question — `2026-10-13-328` (`c1900b89`, Trustee-ratified, DR + KB); BigDev confirmed the
  Super Admin reading (*"Shown on any answer"*) and the home (*"Fold into 6.27b"*). AC11 + Task 3c added; the withhold reversed to `-328`'s
  showing. ⚠ The Hindi words are our translation (`-328` R2). ⛔ No code.

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-13 | 3.2 | ⭐ The Panel RULED (`2026-10-13-328`, `c1900b89`, Trustee-ratified): the question becomes *"May the Admin phone you about this?"*; the number is shown on a *"Yes"* to the District Admin, the district's verifiers and the Pariwar Admin, and to the Super Admin on any answer (BigDev's reading confirmed); built here (BigDev: fold into 6.27b). `-327` decision 1's withhold superseded: `callbackMobile: 'on_yes' \| 'always'` (`'always'` only on a `super_admin` match — the console changes for the Super Admin only); `admin_claim.peer_callback_mobile_shown` reinstated (locator `claim:<id>:ping:<id>`, context `basis`); NEW AC11 + Task 3c (the en / hi words, `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS` + `approvedBy`, the sweep). BD4 untouched. |
| 2026-10-13 | 3.1 | ⭐ VALIDATED (four fresh-context verifiers, ⛔ no code moved since `560369a7`). Governance: BD2 (B) SUPERSEDED by `-327` (`f65fe069`; `-326` in part) — the call-back number WITHHELD on PM24's panel (a required `callbackMobile: 'withhold'` assembler option; ⛔ no showing event) and the consent question ROUTED to the Panel (note written, ⛔ not sent) — v3.0's §0 line for BD2 marked wrong, ⛔ not deleted; NEW BD4 (unconditional: a hidden actor cannot approve at any of nine approving writers; ONE neutral 409 checked before the warnings read) + AC10 + Task 4b + Policy meaning P3. Found: BF17 (PM24's fourth arm — the cycle-freeze escalation resolution), BF18 (a routing outlives a denial ⇒ the R9 arm needs `R9_OUTCOME_FROM_STATES`), BF19 (display filter vs the writers' all-keys snapshot), BF20 (the assembler returns the internal section ⇒ extract the console's wire mapping), BF21 (any actor can be an inspector ⇒ PM25 (c) quoted verbatim; the four hosts' summary filtered), BF22 (the erased-sentinel deferred item's trigger fires — re-deferred). Fixed: Task 1.5's source scan was red on Task 4.2's own call ⇒ an allowlist; AC4 drops the unreachable escalation-resolution late leg and adds the R9 voters' revise; AC5 (d) rebuilt without the default inspection, (c′)/(e′) added, red-checks (c)/(e) that could never go red replaced and one term recorded unobservable; `reviseBlocked` ⛔ never from filtered keys; `ownVisitPending` on the console section; the disclosure on the `NomineeNameCheckDisclosure` model (no focus refetch, forget on close, `NonPresent` words, a 404 line, R9 mount outside its three gates, ⛔ not on the voted bucket); the shipped constants / `isCorrectionClaimHeld` / real `hasPermission` + `requirePermissionHook(deps, …)` signatures; `memberName`'s read named; `request.scopeTx`; route registration; the audit locator lower-cased and context hashed; Task 0.2's THREE appended lines verbatim from `-326`; `-310` CF2 and `-279` A4 cited; the fence (JSDoc only, `valueCiphertext`, a teeth line, the `toLowerCase() ===` pattern); `deathDateWindow` for the index fixture; `savePeerAnswer`'s prerequisites and the concurrency-spec precedent; the fixture split; the `warningFlag` fixtures named; cite drift (`:364`, `:340-384`, `:142-160`, `:165`, `:85-88`, `PENDING_SCAN_CAP`'s home, forced-pagination's path, the console's `:326`). |
| 2026-10-13 | 3.0 | ⭐ RE-DERIVED for dev against `main` `560369a7` (6.27a `done`, merged): every code cite re-read; FOUND BF1–BF16 (the vocabulary leaf, ⛔ no ciphertext fence yet, the claim index, erasure's effect on a date key, the view carries ⛔ no `answer_id`, the four hosts and the 1,500-card page, `PeerMeshView` private, the strip's five leaking fields, the queue's consumer and refinement, the stale comments, a re-review keeps a key's subject, the keys re-verified, ONE escalation definition, the call-back consent names the District Admin); BD1–BD3 ANSWERED by BigDev in session — BD1 A (`-308`'s source line handed off to row 6-36 through the shared view), BD2 B (the call-back number SHOWN on PM24's panel on a *"Yes"*, audited — on BigDev's signup-consent reading, recorded with its gap), BD3 A ("changed N times" kept and recorded) — committed as `2026-10-13-326` (`7867314b`); Task 0 (governance first); ACs sharpened (AC4 names `-324` A; AC5 legs (a)–(e); AC6's 403 vs 404; AC7's five fields; AC8's `null` for an answer newer than the read); Tasks 1–5 expanded with file:line, red-checks and the index-fixture trap; Policy meaning; Dev Notes. ⛔ No PM, ruling or AC intent moved. Status `backlog` → `ready-for-dev`. |
| 2026-10-10 | 2.5 | Round 6: Task 2's queue disjunct needs ⛔ no window term (its scan states + R9 arm already equal the window) — the v2.4 wording withdrawn. |
| 2026-10-10 | 2.4 | Round 5: Task 2's queue disjunct reads the answer window through 6.27a's `answerWindowSql` (PM8's reader list includes it). |
| 2026-10-10 | 2.3 | Round 4: change-log row only (6.27a's set-based `answerWindowSql` is what 6.27b's queue reads for the window). |
| 2026-10-10 | 2.2 | Round-3 validate: no change to this part's scope; the shared record (6.27a v2.2) scopes the seven-key rule to `peer_mesh` from v2, extracts the answer window, and records `has_died` as neighbour-only in `COMPARABLE_QUESTION_KEYS`. |
| 2026-10-10 | 2.1 | Round-2 validate: PM13's per-answer warning flags (and their `null` failure leg) are OWNED here — AC8 + Task 3b (they were handed to b by 6.27a but had ⛔ no AC / Task); *"no FULL visit"* for the blind-first filter; ANY current key makes the District Admin's approval unrevisable (F20); PM24's audit via `emitAuthAudit`, the escalation named, the state-gating coarseness recorded; ACs renumbered (AC9 = gates). |
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1): PM9, PM10, PM24, PM25 (c)'s kinds half. |
