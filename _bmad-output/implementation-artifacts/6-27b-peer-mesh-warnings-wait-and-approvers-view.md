---
baseline_commit: fa2687ce
---

<!--
⭐ CUT 2026-10-10 from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1; BigDev: *"Four parts (Recommended)"*). Pinned `fa2687ce` (code identical
to `main` `5946e411`). ⚠ Before Task 1: `git diff --name-only fa2687ce..HEAD -- packages apps scripts infra`.

STATUS: `backlog` — the row flips to `ready-for-dev` when 6.27a (row `6-27-peer-mesh-sending-replies-and-date-of-death`) is `done` (the
6.21b / 6.23b / 6.24b / 6.26b precedent). Runs in PARALLEL with 6.27d; 6.27c (sending) waits for BOTH.
⭐ THE RECORD is 6.27a's file: its rulings table, invariants, FOUND facts F1–F41 and the ONE decision block PM1–PM25 (Task 0 there is
shared — ⛔ no code here before its author-commit). This file BUILDS the PMs tagged **[b]**: **PM9**, **PM10**, **PM24**, PM25 (c)'s
kinds half, and PM13's per-answer warning FLAGS (the console's and PM24's panel's — from the warnings read). Where a summary below and 6.27a's text disagree, 6.27a's text is the record.
GLYPH REGISTER, ADDRESSING RULE: as 6.27a.
-->

# Story 6.27b: A Neighbour's "Has Not Died" or Differing Date Is a Warning — Every Approver Gives a Reason, a Late One Waits for the District Admin, and Every Approver Sees the Answers `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS STORY IS.** 6.27a lets the five neighbours answer and lets the District Admin see the answers. This story makes two of
> those answers **ask something of an approver**, under the ONE rule 6.23a built (`-264` FQ12): a neighbour saying the member **has not
> died**, and a neighbour's date **two or more calendar days** from the accepted certificate's (`-263` FQ10 A, `-262` FQ8 E). Approving
> while one shows needs a chosen reason and a written note — from the District Admin and from every later approver (`-277` Q2 C); one that
> appears after the District Admin approved makes the final approval **wait** for the District Admin (`-303` Q2 A) and lists the claim in
> their correction queue. And — because a later approver must write a reason about answers they can SEE — every approver at the claim's
> current step reads the neighbours' answers for that claim (PM24). ⭐ **A neighbour's answer never refuses a claim.**

## Story

As **the District Admin, and every approver after me** (in v1 a Pariwar Admin acting as Trustee-Lite at the final vote, an R9 vote, the
escalation or the no-correction approval, and the Super Admin) —
I want **to be warned when a neighbour says the member has not died or gives a date more than a day from the certificate's, and to see the
neighbours' answers for the claim I am approving**,
so that **⛔ no claim a neighbour disputes is approved without a named person's chosen reason and written note — while ⛔ no family is ever
refused because of a neighbour's answer.**

## The rulings this part builds (from 6.27a's table)
`-263` FQ10 A · `-262` FQ8 E · `-264` FQ12 · `-277` Q2 C / Q3 B · **`-303` Q2 A** (the late wait — discharges `-279` A6 for row 6-27, its
Consequence 1) · `-261` C3 (⛔ never inherited) · `-282` GI7 / `-281` Q1 B (precedents) · `-305` §1 (c) (the real later approvers).
**Policy meaning:** this part ADDS the two conjuncts P1 / P2 stated in 6.27a's Policy-meaning section — ⭐ build them exactly as worded there.

## The decisions this part builds (6.27a is the record)
- **PM9** — the kinds `peer_says_not_died:<answer_id>` and `peer_death_date_differs:<answer_id>` (keyed by the LIVE answer row — a
  changed answer is a NEW key); derived outside the `postDeath` block; ONE SQL fragment `peerReplyColumnsSql()` in BOTH readers selecting
  codes and `text` indexes ONLY; ONE exported pure helper; they enter the wait; the pin test's generic message gains the discharge.
- **PM10** — the correction queue's fourth source (`pariwar_id`-joined, live warning-key rows, `saved_at > v.decided_at`).
- **PM24** — `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers` through 6.27a's `assemblePeerAnswers`; first hook
  `cycle.freeze` (pariwar), then the in-handler step disjunction (F33) — an open CORRECTION escalation means the Super Admin's G1 case
  (`claim.decide_escalated_closure`); the cycle-freeze escalation resolution is `cycle.freeze`'s; 404 outside a pending later step; audited
  through `emitAuthAudit` (a new `AuthAuditEventType` member — F40); the panel on the four hosts. ⚠ RECORDED (6.27a PM24): in v1 the
  disjunction reduces to STATE gating.
- **PM13's per-answer warning flags** — on the District Admin's console (`assemblePeerAnswers` / `PeerMeshView`) and on PM24's panel, each
  live answer carries *"says the member has ⛔ not died"* / *"more than a day from the certificate"* from the WARNINGS read (the same keys
  the rule uses — ⛔ never a second computation); a failed warnings read ⇒ each flag `null` and *"could not be checked just now"*, ⛔ never
  `false` (Invariant 8).
- **PM25 (c), the kinds half** — for an actor holding an UN-completed assignment on the claim (and ⛔ no completed FULL visit — a
  `certificate_check` alone does ⛔ not count), the two peer kinds
  are FILTERED out of that actor's warnings summary (the console's decision strip) and correction-queue row — so the blind-first rule
  (6.27d) is ⛔ never undone by a warning line. Approval is impossible before completion anyway (GI1).

## Acceptance Criteria

1. **AC1 — ⛔ no code before 6.27a's shared Task 0.4 author-commit** and 6.27a `done`.
2. **AC2 — the two kinds** (PM9): `peer_says_not_died:<answer_id>` for every live `has_died = not_died` answer (submitted or not);
   `peer_death_date_differs:<answer_id>` exactly when the accepted certificate's index is none of the live date answer's three window
   indexes (a ±1-day difference across a month / year / leap-day boundary is ⛔ not a warning; ±2 is); ⛔ no key without an accepted
   certificate or for a pre-6.26b review; ⛔ no inherited key on a refile; an edited answer yields a NEW key; the single and bulk readers
   agree (parity test); the fragment selects ⛔ no `value_ciphertext` (fence assertion).
3. **AC3 — the one rule reaches every approver** — with a neighbour key showing, an un-reasoned approval is refused at the District Admin,
   the final vote, the escalation resolution, R9 vote / finalize (approve votes short at finalize), the Super Admin's G1 decision and the
   Pariwar Admin's no-correction approval — exactly as for 6.26b's kinds; a refusal or escalation is ⛔ never gated; fixtures raise ⛔ no
   neighbour key by default.
4. **AC4 — a late neighbour answer waits for the District Admin** (`-303` Q2 A): an answer saved after the District Admin's approval makes
   the final vote and the other gated approvals refuse with `LateWarningReasonRequiredError` until the District Admin records a late
   reason; ANY current neighbour key makes the District Admin's approval unrevisable (F20 — recorded).
5. **AC5 — the queue lists it** (PM10): own-committing ordering legs in SEPARATE committed transactions (an answer saved before vs after
   the approval's `decided_at`; an edit after approval); a certificate re-review that moves the date from equal to differing is listed via
   arm (1); the fault path asserts "⛔ not a candidate", ⛔ never a count.
6. **AC6 — every approver sees the answers** (PM24): a role × step matrix — the Pariwar Admin at `verifier_approved` / `reversed` /
   `state_trustee_freeze` (`cycle.freeze`), an R9 voter on a live routing (`claim.r9_vote`), the Super Admin on an open escalation
   (`claim.decide_escalated_closure`) get the answers; every other actor and every other state ⇒ 404; the read is audited (⛔ no content);
   the panel renders on the four hosts.
7. **AC7 — the blind-first rule holds in the warnings** (PM25 (c)): an actor with an un-completed assignment and ⛔ no completed FULL visit
   sees ⛔ neither peer kind in the decision strip nor the queue row (nor the per-answer flags); once they complete a full visit, all appear.
8. **AC8 — the per-answer flags** (PM13's flags): each live answer on the console and on PM24's panel shows the flag of its key from the
   warnings read; a failed warnings read shows *"could not be checked just now"* (`null`), ⛔ never *"no warning"* (`false`) — a test that
   forces the read to fail.
9. **AC9 — gates and records:** the new route file classified `COVERAGE_SET` in the human-actor invariant; the import-discipline entries;
   `kindLine` words (⛔ no date — `verifier-console.test.tsx:396`); contracts mirror + lockstep; `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 1 — the kinds (AC2, AC3).** `APPROVAL_WARNING_KINDS` + contracts mirror (`verification-decision.ts:128-137`) + `kindLine`
      (`i18n-en.ts:138-150`); `peerReplyColumnsSql()` in `readClaimApprovalWarnings` (`:427`) and `readClaimApprovalWarningsSlice` (`:579`);
      `RawWarningsRow`; the pure helper (the `deriveDeathFactWarningKeys` pattern, `:248`); the pin test (`approval-warnings.test.ts:56-68`)
      with the discharge; unit table + live tests per approver (6.26b's spec shapes).
- [ ] **Task 2 — the queue (AC5).** PM10's hoisted disjunct in `correction-queue-read.ts:155-187` (the answer window read through
      6.27a's `answerWindowSql`, ⛔ never a hand-composed copy); the comment amended; a NEW own-committing
      spec `correction-queue-late-peer-reply.spec.ts`.
- [ ] **Task 3 — the approvers' read (AC6).** `claims.peer-answers.routes.ts` + handler (the step disjunction); the panel component used by
      `PendingCaseCard`, `EscalationPanel`, `PariwarClosureStrip`, `R9CasePanel`; api-client; tests.
- [ ] **Task 3b — the per-answer flags (AC8).** Join the warnings read's keys onto `assemblePeerAnswers`' answers (by `answer_id`); the
      `null` path when the read fails; `PeerMeshView` and PM24's panel render the flag line; tests incl. the forced read failure.
- [ ] **Task 4 — the blind-first filter (AC7).** The actor-aware filter on the warnings summary returned by the console handler and on the
      queue row; tests with an un-completed / completed assignee.
- [ ] **Task 5 — gates and close (AC9).** Classification, fences, `pnpm ci:local`; Change Log + File List.

## Dev Notes
- **Traps** (6.27a's list applies): 3 (⛔ no conjunct), 4 (⛔ never edit the assertion — re-judge every reader), 5 (rebase incl. row 6-28), 6 (both
  readers), 7 (⛔ never inherited), 12 (`clock_timestamp()`), 13 (the lock order is what makes PM10's `saved_at` ordering hold), 18.
- ⚠ **The bulk reader runs in the cycle-freeze path** (up to 1,500 ids per call) — the answers index `(pariwar_id, reply_id) WHERE
  superseded_at IS NULL` is 6.27a's; check the plan.
- ⚠ **`text`, ⛔ not `bytea`** — `death_date_window_indexes` and `accepted_date_index` are both `text`.
- **Previous story:** 6.26b (`bdb01014`, 63 files) — the exact threading pattern for a kind; 6.23b — the wait and the queue.
- **References:** 6.27a's file (PM9, PM10, PM24, PM25, F13–F22, F33); `-303`, `-304`, `-305`.

## Dev Agent Record
### Agent Model Used
### Completion Notes List
- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 2.4 | Round 5: Task 2's queue disjunct reads the answer window through 6.27a's `answerWindowSql` (PM8's reader list includes it). |
| 2026-10-10 | 2.3 | Round 4: change-log row only (6.27a's set-based `answerWindowSql` is what 6.27b's queue reads for the window). |
| 2026-10-10 | 2.2 | Round-3 validate: no change to this part's scope; the shared record (6.27a v2.2) scopes the seven-key rule to `peer_mesh` from v2, extracts the answer window, and records `has_died` as neighbour-only in `COMPARABLE_QUESTION_KEYS`. |
| 2026-10-10 | 2.1 | Round-2 validate: PM13's per-answer warning flags (and their `null` failure leg) are OWNED here — AC8 + Task 3b (they were handed to b by 6.27a but had ⛔ no AC / Task); *"no FULL visit"* for the blind-first filter; ANY current key makes the District Admin's approval unrevisable (F20); PM24's audit via `emitAuthAudit`, the escalation named, the state-gating coarseness recorded; ACs renumbered (AC9 = gates). |
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1): PM9, PM10, PM24, PM25 (c)'s kinds half. |
