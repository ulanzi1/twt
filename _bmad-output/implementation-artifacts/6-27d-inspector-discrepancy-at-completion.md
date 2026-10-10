---
baseline_commit: fa2687ce
---

<!--
⭐ CUT 2026-10-10 from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1). Pinned `fa2687ce` (code identical to `main` `5946e411`).
⚠ Before Task 1: `git diff --name-only fa2687ce..HEAD -- packages apps scripts infra`.

STATUS: `backlog` — flips to `ready-for-dev` when 6.27a is `done`. Runs in PARALLEL with 6.27b; 6.27c (sending) waits for BOTH.
⭐ THE RECORD is 6.27a's file (rulings, invariants, F1–F38, PM1–PM25; Task 0 shared). This file BUILDS **PM25 (a)** and its erasure arm
(PM17's d half). Where a summary below and 6.27a's text disagree, 6.27a's text is the record.
GLYPH REGISTER, ADDRESSING RULE: as 6.27a.
-->

# Story 6.27d: The Inspector Forms Their Own View First — Shown Only Where the Family and a Neighbour Differ, After Completing Their Record, and Asked to Re-Ask the Family in Their Own Words `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS STORY IS.** The ground inspector sits with the family. BigDev (2026-10-10): *"only discrepancy should be shared with
> field inspectore if there were any, to cross examine the family. Otherwise, It should say Thank you, your response has been recorded. No
> further action needed."* So the inspector is shown ⛔ nothing about the neighbours before completing their own record; at completion the
> server compares the family's answers with the neighbours' and shows the inspector ONLY where they differ — and asks them to re-ask the
> family **open-ended, ⛔ never stating what any neighbour said** (`-305` §2 item 3) — with a note box per difference. ⭐ It gates ⛔ nothing:
> approval already needs a completed inspection (FQ9).

## Story

As **the ground inspector** —
I want **to record the family's account without knowing what the neighbours said, and then be told only where the two differ**,
so that **my record is my own, and a difference is re-asked of the family on the spot — ⛔ never passing a neighbour's word to them.**

## The rulings this part builds (from 6.27a's table)
`-304` Q3 A / Q4 A as put (*"the inspector asks the family the same question, so the inspector is shown only where the two differ"*) ·
`-262` FQ8 C (the family's date and time of death — 6.26a) · `-305` §2 item 3 (open-ended; ⛔ never the neighbour's content) · `-304` Q6 A's
closing note (*"never the family"*). **Policy meaning:** ⛔ no predicate (6.27a's section).

## The decisions this part builds (6.27a is the record)
- **PM25 (a)** — before completion ⛔ nothing (6.27a builds the absent console field; 6.27b filters the kinds); at completion
  (`completeGroundInspection`, `packages/domain/src/claim/ground-inspection-persist.ts:919-1044`) the comparison ① (any live `has_died =
  not_died`) and ② (a live neighbour date two or more days from the FAMILY's date — ONLY on a `family_statement` completion — by index
  membership, ⛔ no decrypt); ③ (cause) / ④ (illness) ⛔ NOT built — row 6-32 records the family's answers and owes a comparable (keyed
  blind-index) form for encrypted codes; the two completion screens; the notes table; the showing record; the own-assignment read for a lost
  response; late answers to the District Admin only; ⛔ never `member_medical_disclosures`.
- **PM17 (d's half)** — the notes table's erasure arm (Tier-1 note → sentinel), the rtbf pin raised again.

## Acceptance Criteria

1. **AC1 — ⛔ no code before 6.27a's shared Task 0.4 author-commit** and 6.27a `done`.
2. **AC2 — nothing before completing:** an inspector holding an un-completed assignment sees ⛔ no answers, ⛔ no counts and ⛔ no "hidden"
   line on the inspection screen (6.27a's console rule and 6.27b's kinds filter cover the console).
3. **AC3 — the comparison at completion** (① and ② only): `completeGroundInspection`'s result carries the differing question KEYS (⛔ no
   values) computed against the answers saved by then; ② runs ONLY on a `family_statement` completion; ±1 day is ⛔ not a difference, ±2 is
   (month / year / leap boundaries); ⛔ no decrypt in the comparison (fence); the comparison ⛔ never reads `member_medical_disclosures`
   (fence test).
4. **AC4 — the two screens:** ⛔ no difference (or ⛔ no answer yet) ⇒ *"Thank you, your response has been recorded. No further action
   needed."*; a difference ⇒ *"Thank you, your response has been recorded. We found the family's answers don't match the neighbours'
   observations. Please ask the family again, in your own words, without mentioning anyone else's answer, and record their response in the
   note next to each question."* with each differing question shown as *"The family said: [X]. A neighbour's answer differs."* — ⛔ no name,
   ⛔ no count, ⛔ no neighbour's value in the response (a test), and one note box per question.
5. **AC5 — the notes and the showing:** a note is written once per question while the claim is in the answer window; staff see it marked
   *"after the discrepancy was shown"*; the showing record holds keys and `shown_at` only and `completed_at` < `shown_at` (an ordering test
   in separate committed transactions); the completed inspection record is ⛔ never changed; the inspector can re-read their OWN completed
   assignment's recorded showing (a lost completion response).
6. **AC6 — late answers:** an answer saved after completion ⛔ never reaches the inspector's screen; it reaches the District Admin's console.
7. **AC7 — erasure and gates:** the notes table's erasure arm and the rtbf pin; RLS + policy spec; the handler contract's new field
   (`claims.ground-inspection.handlers.ts:640-681` returns `{groundInspectionId, status, photoCount}` today — it gains the result); `pnpm
   ci:local` green.

## Tasks / Subtasks

- [ ] **Task 1 — the migration (AC5, AC7).** Next free number at build: `claim_ground_inspection_discrepancy_notes` + the showing record (a
      table or columns on the assignment — name it at build); RLS, grants, the erasure arm (GI13's shape, `member/anonymize.ts:255-292`); a
      policy spec; applied to :5432 AND :5433.
- [ ] **Task 2 — the comparison (AC3).** A pure comparator over 6.27a's `COMPARABLE_QUESTION_KEYS` (⛔ never a second list) invoked inside
      `completeGroundInspection` under its existing lock order (assignment → claim → …; the answers are read, ⛔ never locked); ① and ② only;
      a unit test proving ③ / ④ are skipped (⛔ never a difference) while the family has ⛔ no comparable answer.
- [ ] **Task 3 — the screens (AC4, AC5).** `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`: the two completion screens,
      the note boxes, the re-read of the own assignment's showing; English (the admin console); copy in the module's `i18n-en.ts`.
- [ ] **Task 4 — the routes and contract (AC5, AC7).** The completion handler's result; the notes write route (on the inspection module's
      existing chain); the human-actor classification; tests.
- [ ] **Task 5 — close.** Fences, rtbf, `pnpm ci:local`; Change Log + File List; a deferred-work item for ③ / ④'s comparable-code design
      pointed at row 6-32.

## Dev Notes
- **Traps** (6.27a's list applies): 1 (⛔ never the neighbour's content to the family — the screen words are the control), 9 (⛔ no KMS under
  a lock), 12 (`clock_timestamp()`), 13 (⛔ never lock answers from the inspection path — read them).
- ⚠ **A District Admin who inspects** sees this screen at completion and, as an approver, the full answers in the console afterwards — by
  design (6.27a Invariant 7).
- ⚠ **`completeGroundInspection` takes `lockActiveAssignment` (requires `scheduled`)** — a retried completion throws; hence the own-assignment
  re-read.
- **Previous story:** 6.26a (the completion flow, GI1–GI13), 6.26b (index comparisons, ⛔ no decrypt).
- **References:** 6.27a's file (PM25, PM17, F1–F38, Invariant 7); `-304` Q3 / Q4; `-305` §2 item 3.

## Dev Agent Record
### Agent Model Used
### Completion Notes List
- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 items 1 and 3): PM25 (a) — ① / ② only, open-ended re-asking, the notes and showing record. |
