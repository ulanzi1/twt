---
baseline_commit: 8fcf7826
---

<!--
⭐ CUT 2026-10-10 from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1).
⭐ RE-PINNED 2026-10-14 (v3.0 — `bmad-create-story 6.27d` run on this EXISTING file) from `fa2687ce` to `8fcf7826` (`main` after 6.27a AND
6.27b shipped). ⚠ `fa2687ce` is ⛔ NOT an ancestor of `main` (its twin is `0281d449` — 6.27a's SHA map); every `file:NNN` below is AS OF
`8fcf7826`, re-read by four read-only checkers (governance; ground-inspection code; peer-mesh code; prior stories + diff) and the author.
⚠ Before Task 1: `git diff --name-only 8fcf7826..HEAD -- packages apps scripts infra` — re-read any cited file that moved.
⭐ v3.1 (2026-10-14, `bmad-create-story validate 6.27d`): four read-only verifiers re-derived every claim at `8fcf7826` (= `main`; ⛔ no
code moved; ⛔ no decision above `-329` on any branch). BigDev's answers that pass: R1 recorded as his author NARROWING; the notes keep
R4's writer and are shown WITH their author; the dual-role case recorded, ⛔ not routed.

STATUS: `ready-for-dev` — its one condition (6.27a `done`) is met; 6.27b is `done` too. 6.27c (sending) waits for THIS story.
⭐ THE RECORD is 6.27a's file (`6-27-peer-mesh-sending-replies-and-date-of-death.md` — rulings, Invariants, F1–F41, PM1–PM25). This file
BUILDS **PM25 (a)** and its erasure arm (PM17's d half). Where a summary below and 6.27a's text disagree, 6.27a's text is the record —
EXCEPT the six author readings R1–R6 below, which this file records because 6.27a's text was written before the code it now runs on existed.
GLYPH REGISTER, ADDRESSING RULE: as 6.27a.
-->

# Story 6.27d: The Inspector Forms Their Own View First — Shown Only Where the Family and a Neighbour Differ, After Completing Their Record, and Asked to Re-Ask the Family in Their Own Words `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS.** The ground inspector sits with the family. BigDev (2026-10-10): *"only discrepancy should be shared with
> field inspectore if there were any, to cross examine the family. Otherwise, It should say Thank you, your response has been recorded. No
> further action needed."* So the inspector is shown ⛔ nothing about the neighbours before completing their own record (✅ already true —
> 6.27a / 6.27b built it; this story keeps it true); at completion the server compares the family's account with the neighbours' answers
> and shows the inspector ONLY where they differ — and asks them to re-ask the family **open-ended, ⛔ never stating what any neighbour
> said, ⛔ never who** (`-305` §2 item 3) — with one note box per difference. ⭐ It gates ⛔ nothing: no approval, refusal or state waits on it.

## Story

As **the ground inspector** —
I want **to record the family's account without knowing what the neighbours said, and then be told only where the two differ**,
so that **my record is my own, and a difference is re-asked of the family on the spot — ⛔ never passing a neighbour's word to them.**

## Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate that gates a member's access to a benefit** (6.27a's Policy-meaning section: *"6.27d adds ⛔ no
predicate (the inspector's discrepancy screen asks a question; it gates ⛔ nothing)"*). The comparison's result is shown to staff and
recorded; ⛔ no approval, refusal, warning, payment or claim state reads it. The note writer's refusal outside the answer window refuses a
STAFF act, ⛔ never a member's benefit. Checked against the Niyamavali: ⛔ no clause governs it (it is not a benefit predicate).

## The rulings this part builds (from 6.27a's table — quoted, never paraphrased)

- `-304` Q3 A (`.decision-log.md`, the `-304` entry): *"…shown to staff **as context only — ⛔ never a warning, ⛔ never a flag on its own**.
  ⭐ As put in Q3, the **inspector asks the family the same question**, so the inspector is shown only where the two differ."*
- `-304` Q4 A: *"**context only, ⛔ never compared automatically with the member's medical declaration; counsel confirms the legal basis
  before go-live**. ⭐ As put, the inspector asks the family the same."*
- `-305` §2 item 3 (author-commit, ⛔ not Trustee-ratified; its §0 line: item 3 REMOVES a disclosure): *"**THE INSPECTOR ASKS THE FAMILY OPEN-ENDED.** When a difference is shown, the inspector asks the family again in
  open terms (*'please tell me again how they died'*) and records the answer — ⛔ never stating what any neighbour said, ⛔ never who. ⇒ ⛔ no
  neighbour's answer reaches the family, directly or by paraphrase (the closing note's *'never the family'*, ratified as put under `-304`
  Q6, holds as worded). The inspector still SEES the difference (`-304` Q3 / Q4 as put)."* (⚠ v3.0 cite fix: the words *"never the
  family"* live in routing note `…2026-10-10-6-27-the-neighbours-questions.md:61`, quoted by `-305` — ⛔ not in `-304` itself.)
- `-310` CF2 (Trustee-ratified; the table as put, `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` §CF2): **The inspector** —
  *"⛔ Nothing before completing their own record; then only THAT the family and a neighbour differ, question by question — ⛔ never the
  neighbour's answer itself, ⛔ never who; they ask the family again, open-ended."*
  The District Admin row, as put: *"Every answer, for claims in their district."*
- `-310` CF4: *"the ground inspection carries the claim"* (a claim with ⛔ no neighbour selection still completes — AC4).
- `-262` FQ8 C (the family's date and time of death — recorded by 6.26a's completion).
- `-311` (author-commit): PM25's inspector rules *"accepted as recommended"*, incl. the open-ended wording and *"no FULL visit"*.
- `-327` decision 2 (author-commit, BD4 — 6.27b): a hidden actor cannot approve; ⛔ not touched here.

## The decisions this part builds (6.27a PM25 (a) is the record — summarised)

- **Before completion:** ⛔ nothing (no answers, no counts, no "hidden" line). ✅ Built by 6.27a (the console's `peerMesh` ABSENT —
  `peer-answers-assembler.ts:129-138`) and 6.27b (the kinds filter, the notes withholding, BD4) through the ONE predicate
  `peerSectionHiddenFromActorSql` (`packages/domain/src/claim/approver-own-visit.ts:54-64`). The inspection page shows ⛔ no neighbour
  content today (⛔ no peer / neighbour / warning hit in `apps/admin/src/modules/ground-inspection/`). 6.27d adds ⛔ nothing a hidden reader can see (AC2).
- **At completion:** ① any live neighbour `has_died` = `not_died`; ② a live neighbour date two or more calendar days from the FAMILY's date —
  by index membership, ⛔ no decrypt. ③ cause / ④ illness ⛔ NOT built (row 6-32 owes the family side AND a comparable form). ⛔ Never
  compared: `how_known`, `relationship`, `callback_consent`; ⛔ never `member_medical_disclosures`.
- **The two screens** (copy verbatim — AC4), **the notes table**, **the SEPARATE showings table** (keys + `shown_at`, written in its OWN
  transaction AFTER the completion commits, ONLY when delivered (`state: 'shown'`) or, when absent, by the first un-hidden re-read or
  note write (AC5, AC6 step 4) — a withheld result writes ⛔ nothing; idempotent; recomputed as of `completed_at` if absent), **answers after completion reach the District Admin, ⛔ never the
  inspector**.
- **`-304` Q4 A's counsel clause:** the notes will hold the family's re-told account in free text (`-305`'s own example: *"please tell me
  again how they died"*) — cause-of-death health data. ⇒ the notes table joins counsel's scope before go-live (Task 7) — a go-live fence,
  ⛔ not a merge blocker ([[project_not_in_production_merge_is_not_golive]]).
- **PM17 (d's half):** the notes table's erasure arm in 0143's form; the rtbf pin raised again.

### Author readings R1–R6 + R4a (v3.0, re-judged v3.1 — each is the AUTHOR's under the routing template's §0: an implementation of ratified text; the ratified sentence each implements is quoted and each says MATCHES / NARROWS / WIDENS against it. R1 narrows an author-commit (BigDev confirmed); R4 widens an author-commit's wording with ⛔ no new viewer; ⛔ none widens a Trustee-ratified row)

- **R1 — the comparison runs ONLY on a FULL visit, keyed on `death_date_source = 'family_statement'`** — in the domain, in every SQL
  guard (AC5's INSERT, the Task 1.3 (a) trigger, the re-read's 404), ⛔ never on `inspection_stage`. ⚠ The two are ⛔ not equivalent on
  every row: 0147's stage CHECK admits `death_date_source IS NULL` (`0147:44-47`) and its completed-row CHECK is `NOT VALID`
  (`0147:56-64`) ⇒ a pre-0147 completed `initial` row can carry a NULL source and ⛔ no family account; `family_statement` implies a
  full stage, ⛔ not the reverse. **NARROWS `-311` PM25 (a) ①** (which applies ① with ⛔ no source condition — 6.27a `6-27-…md:757-759`);
  **MATCHES CF2 / `-304` Q3** (*"only THAT the family and a neighbour differ"*; *"the inspector asks the family the same question"*):
  a `certificate_check` records ⛔ no family account, so there is ⛔ no difference to show, and ①'s ruled words begin *"The family
  reported…"*. ⭐ **BigDev confirmed this narrowing as the author of `-311` (2026-10-14, this validate pass)** — an author confirmation,
  ⛔ no `.decision-log.md` entry. ⇒ a `certificate_check` (or NULL-source) completion: ⛔ no comparison, ⛔ no showing row,
  `discrepancy: null`, ⛔ no new screen. (PM25 (c)'s *"a `certificate_check` alone does ⛔ not count"* governs the HIDE, ⛔ not the comparison.)
- **R2 — the comparison runs INSIDE the completion transaction, under its existing locks; only the SHOWING write is post-commit.**
  Implements PM25 (a): *"compares against the neighbours' answers **SAVED by then**"*. Every answer writer takes the CLAIM row lock first
  (`peer-mesh-reply.ts:340-341`); completion holds that same lock (`lockClaimInWindow`), so "saved by then" is exact only inside the
  transaction — computed after commit, an answer saved in between would land in the result. **MATCHES**.
  ⭐ **The clock basis that makes AC5's as-of recompute EQUAL the in-tx result** (record it in the module's doc-block): `completed_at`
  is `clock_timestamp()` read AT the completion UPDATE, after both locks (`ground-inspection-persist.ts:1011-1017`, 6.26b RD1);
  `saved_at` is `DEFAULT clock_timestamp()` (`0156:164`), stamped at the answer INSERT after the claim lock (`peer-mesh-reply.ts:341`,
  `:445`); `superseded_at` is set to `clock_timestamp()` under the same lock (`:417`). ⇒ the claim row lock orders every answer write
  against the completion, and as-of(`completed_at`) = "saved by then". ⛔ Never change any of the three to `now()` (the transaction
  START) — a writer that began before the completion but took the lock after it would then fall on the wrong side. The only answer writer
  without the claim lock is the anonymizer (`anonymize.ts:308` — it NULLs the window indexes), which can only DROP a ② on a later
  recompute (accepted — Dev Notes).
- **R3 — the ② display date is the plaintext the completion handler ALREADY holds** (it encrypts `body.deathDate` itself —
  `claims.ground-inspection.handlers.ts:620-630`; a `YYYY-MM-DD` string, `isRealCalendarDate`), echoed back, ⛔ no decrypt; the RE-READ
  decrypts in its handler after its domain read AND after its own transaction commits (Task 4.2). Implements PM25 (a): *"decrypted in the
  HANDLER after the completion commit, for display only"* — the intent (⛔ no KMS under a lock, display only) holds; a decrypt of the value
  in hand would add KMS for nothing. On the re-read the date can be ERASED (GI13 writes the house sentinel — `anonymize.ts:285-299`) or
  undecryptable ⇒ `familyDeathDate: { status: 'unavailable' }`, ⛔ never the sentinel text, ⛔ never a 500 (the assembler's mapping is the
  precedent: the assembler maps `ANONYMIZED_SENTINEL` to `{ status: 'none' }`, `peer-answers-assembler.ts:166-172`). **MATCHES**.
- **R4 — who receives the result:** whoever COMPLETED the assignment — the assigned inspector, or a supervisor completing under
  `claim.override_ground_inspection` (`resolveInspectorOverride`, handlers `:204-223`) — and, on re-read and for the note write, whoever
  passes that SAME identity guard on the assignment. ⚠ If that actor is HIDDEN on the claim by the ONE predicate
  (`isActorOwnVisitPending(db, pariwarId, claimCaseId, actorId)`, `approver-own-visit.ts:67` — a supervisor holding their OWN pending
  visit on the same claim), the result is `{ state: 'withheld', reason: 'own_visit' | 'check_failed' }` — 6.27b's ONE withheld shape
  (`withheldReasonOf`, `hidden-reader-notes.ts:63`), ⛔ never a difference and ⛔ never "no difference" (uniform: it does ⛔ not depend on
  the result) — on the completion response, the re-read AND the note write (AC2, AC6). The CF2 row is "the inspector" = the person who
  sat with the family. **WIDENS PM25 (a)'s *"the inspector's OWN re-read"*** (6.27a `6-27-…md:778`) to the override completer and any
  override holder who passes the guard — ⭐ but adds ⛔ no new viewer in v1: the guard needs the conduct key (District Admin / Block
  Admin / Super Admin) AND, for a non-assigned actor, the override key (held only by `pariwar_admin` — `roles.ts:352` — and `super_admin`;
  `block_admin` deliberately lacks it, `roles.ts:571-574`) ⇒ in practice the Super Admin, or a Pariwar Admin who also holds a district /
  block grant — both later approvers who already read every answer on the console. A non-assigned Block Admin gets 403 on all three routes
  (a test, Task 4.5). ⚠ If the role catalogue ever grants the override key more widely, this reading must be re-judged.
- **R5 — staff see the showing and the notes ONLY inside the neighbours' section** (`assemblePeerSection`, `peer-answers-assembler.ts:117`
  — the ONE assembler behind the verifier console AND 6.27b's on-demand `GET …/peer-answers`), AFTER its PM25 (c) hide. ⇒ the audience is
  exactly the audience already entitled to every neighbour answer (CF2's District Admin / verifiers / later approvers), and a hidden reader
  sees ⛔ nothing (the whole section is absent). ⛔ NEVER on the inspection module's claim-wide list read (`GET …/ground-inspection?district=|block=`):
  its audience is every conduct-key holder at the locator — e.g. another Block Admin — who is ⛔ not on CF2's list, and a showing's key
  (*"a neighbour said not died"*) is neighbour-derived. **MATCHES** (⛔ no new viewer of neighbour-derived content). ⭐ This is also how
  6.27b's X1 A is met for the NEW staff free-text note (6.27b AC7, `6-27b-…md:468-471`: *"withheld from a hidden reader unless they wrote
  the note themselves (the inspector's OWN findings stay visible to them)"*; `hidden-reader-notes.ts`): inside the section the
  whole-section hide covers it; on the re-read and the note write R4's hidden check covers it (a hidden author gets the withheld shape,
  ⛔ not their own notes — this NARROWS X1 A's author exception (X1 A is an author answer, BigDev 2026-10-14, recorded in 6.27b) for these
  two routes only, because the withheld re-read is ONE shape — returning the author's notes beside a withheld result would be the partial
  withholding [[feedback_withholding_must_be_uniform]] forbids; the staff view, inside the section, is untouched by this). There is ⛔ no enumerated list of note sources or fence to enrol in.
- **R4a — the notes' writer and their visibility (BigDev, 2026-10-14, this validate pass):** the writer is R4's guard (the assigned
  inspector or an override holder who passes it — usually the override completer). Notes are ONE per (assignment, question); every note
  carries `authorActorId` on the RE-READ only (the page's own-note comparison; ⛔ in the staff transcript) and, on both, `authorDisplay` (the author's stored admin display name, captured at write
  through `getDisplayName` — `apps/api/src/modules/auth/admin/admin-auth.repo.ts:186`; a missing name refuses the write, as
  `AdminDisplayNameMissingError` does at `claims.appeal.handlers.ts:178-179` — ⛔ never a raw id on screen), and BOTH the re-read and the
  staff view return ALL of that assignment's notes WITH their author — so the
  assigned inspector who finds a box already filled by a supervisor sees whose it is, ⛔ never an empty box that 409s. ⛔ No new viewer:
  the re-read's audience is R4's, the staff view's is R5's.
- **R6 — the notes are Tier-1 under the EXISTING field class `'ground_inspection'`** (`CLAIM_GROUND_INSPECTION_FIELD_CLASS`,
  `apps/api/src/context.ts:188`; helpers `ground-inspection-crypto.ts:21-55`) — ⛔ not a new class (v2.x said "a field class of its
  own"; a new class is three un-gated edit sites and buys nothing: the note is written by the same inspector, about the same visit).
  Implementation only.

### Recorded observation — ⛔ NOT this story's to change, ⛔ NOT routed by it (Gap-analysis posture: observed, escalation proposed to BigDev)

⚠ CF2's table is by ROLE. When the inspector IS the District Admin of that district (or a verifier, a later approver, or the Super
Admin), 6.27a's built hide (`peerSectionHiddenFromActorSql`) lifts at their completed FULL visit, and at that commit EVERY hidden surface
opens together: the console's neighbours' section (EVERY answer — the District Admin row, ⛔ not only the differences — the inspector
row), 6.27b's `GET …/peer-answers`, and 6.27b's `peer_*` warning keys on the correction queue and the four approver hosts. ⚠ The
concrete harm: such a person can open the console BETWEEN completing and re-asking the family, and then knows what the neighbours said
— defeating `-305` §2 item 3's open-ended re-ask. 6.27b's Policy-meaning **P3** (`6-27b-…md:125`, implementing `-327` decision 2's
*"The hide ends when the actor completes a full visit, or when ⛔ none of their assignments is `scheduled` any more"*; author-commit,
⛔ not ratified) reads the same way. The Panel was ⛔ never asked
which row governs a person who holds both; under the routing template's §0 that is two RATIFIED rows meeting in one person ⇒ if it is
ever escalated, it is the Panel's. 6.27d's own surfaces follow the inspector row exactly and make the case ⛔ no worse (R5 only adds to
a section such a person already sees). ⭐ **BigDev (2026-10-14, this validate pass): recorded, ⛔ not routed now** — see Completion Notes.

## Acceptance Criteria

1. **AC1 — preconditions:** 6.27a `done` ✅ (sprint row) and its shared Task 0.4 author-commit (`-311`, status Committed) ✅ — met at
   `8fcf7826`. ⛔ No decision is owed before code: R1–R6 + R4a are author readings recorded in THIS file (⛔ no `.decision-log.md` entry
   needed — R1's narrowing of `-311` is BigDev's author confirmation; ⛔ none widens a Trustee-ratified row; if review finds one that does,
   STOP and route it).
2. **AC2 — nothing before completing (kept true):** an actor holding an un-completed assignment on the claim with ⛔ no completed FULL visit
   learns ⛔ nothing from 6.27d on ANY surface — ⛔ no showing, ⛔ no note, ⛔ no count, ⛔ no "hidden" line, and ⛔ no response that varies
   with the showing:
   - the inspection page renders ⛔ no discrepancy panel for a `scheduled` assignment (Task 3.3);
   - the neighbours' section (R5) stays absent for them (the existing hide — a regression leg proving the NEW fields ride inside it, Task 4.5);
   - the re-read (AC5) answers the withheld shape (R4) with ⛔ no notes for a hidden caller (Task 4.5);
   - the note write (AC6) refuses a hidden caller with ONE neutral refusal BEFORE any showing / exists check (AC6 step 3 — after the 404
     and the window, neither of which reads neighbour-derived data) — a hidden override holder probing `has_died` and `death_date` gets
     identical status, `error.code` and `error.message`, and ⛔ no `details` on either on an in-window claim (only `error.request_id` differs —
     `middleware/error-mapping/index.ts:135-144`) (Task 4.5). ⚠ Without this, 201 vs 409
     `discrepancy_not_shown` tells a hidden supervisor whether a neighbour said "not died".
   ⛔ Never a second hide predicate — `isActorOwnVisitPending` everywhere, failing CLOSED (an error ⇒ `check_failed`, ⛔ never `shown`).
3. **AC3 — the comparison** (① and ② only; R1, R2): `completeGroundInspection` returns `discrepancy: { questionKeys: ('has_died' |
   'death_date')[] } | null` — `null` unless `death_date_source = 'family_statement'` (R1); the keys of the questions that differ, in `COMPARABLE_QUESTION_KEYS` order,
   ⛔ no values. Computed INSIDE the transaction after the completion UPDATE, against the claim's LIVE answers (`superseded_at IS NULL`,
   submitted or not — as `peerReplyColumnsSql`), ⛔ no lock on answers, ⛔ no KMS. ① = a live `has_died` answer whose codes are exactly
   `['not_died']`. ② = a live `death_date` answer with a 3-element `death_date_window_indexes` that does ⛔ NOT contain the completed row's
   `death_date_index` (a neighbour's `unknown` date, a NULL window or a NULL family index ⇒ ⛔ not compared, ⛔ never "differs"). Through
   ONE per-answer predicate SHARED with 6.27b's `derivePeerReplyWarningKeys` (Task 2.1). Tests: equal date ⇒ none (asserted FIRST — 6.27b
   Trap 3); D±1 ⇒ none; D±2 ⇒ `death_date` (month end, year end, 29 Feb); `not_sure` / `did_not_know` / `died` ⇒ none; a superseded
   `not_died` ⇒ none; a `death_cause` / `death_illness` answer ⇒ ⛔ never a key (a UNIT test over the rule table, in `packages/domain/tests/claim/` — ⛔ inside the live spec); a pre-0147 completed row
   with a NULL `death_date_source` on a full stage ⇒ `null`; an answer whose writer is BLOCKED on the claim lock while completion holds it
   lands AFTER and is ⛔ not in the result (a two-connection leg) — AND an answer writer whose transaction BEGAN before the completion's
   but took the claim lock after it is excluded by BOTH the in-tx result and the as-of recompute (R2's clock basis; red-check: switch
   `completed_at` to `now()` and watch the recompute diverge); a fence: ⛔ no decrypt / `value_ciphertext` / KMS and ⛔ no
   `member_medical_disclosures` in the comparator module (Task 6).
4. **AC4 — the two screens** (admin, English; copy VERBATIM from PM25 (a)):
   - ⛔ no difference, or ⛔ no answer yet (incl. a claim with ⛔ no neighbour selection — CF4 *"the ground inspection carries the claim"*) ⇒
     *"Thank you, your response has been recorded. No further action needed."*
   - a difference ⇒ *"Thank you, your response has been recorded. We found the family's answers don't match the neighbours' observations.
     Please ask the family again, in your own words, without mentioning anyone else's answer, and record their response in the note next
     to each question."* — then per differing key: ① *"The family reported that the member has died. A neighbour's answer differs."*;
     ② *"The family said: {familyDeathDate}. A neighbour's answer differs."* (`familyDeathDate` per R3, shown exactly as the page shows
     a death date today — the raw `YYYY-MM-DD` string, `InspectorRecord`'s `{a.deathDate ?? '—'}`, `GroundInspectionPage.tsx:427`; ⚠ the
     staff view's `PeerMeshView` shows DD-MM-YYYY (`PeerMeshView.tsx:131`) — keep each surface's own format, ⛔ never mint a formatter;
     an `unavailable` date (R3) renders the page's existing `'—'`) — each with ONE note box.
   - the withheld result (R4) ⇒ the shared `<WithheldNote>` (6.27b, `apps/admin/src/modules/claim-verification/WithheldNote.tsx:28`) —
     ⛔ never either screen.
   - ⛔ no name, ⛔ no count, ⛔ no neighbour's value anywhere in the response or the DOM (a test asserts the response's key set and that
     ⛔ no `valueCodes` / name / count field exists); the response SHAPE does ⛔ not vary with the number of neighbours or answers.
   - a `certificate_check` (or NULL-source) completion shows ⛔ neither screen (R1).
   - The staff labels *"Recorded"* and *"Recorded after the difference was shown"* are story-minted English (⛔ not ruled copy).
5. **AC5 — the showing and the re-read:**
   - after the completion transaction closes, the handler — ONLY when the result it will return is `state: 'shown'` — writes the showing
     in its OWN transaction:
     `INSERT … SELECT … FROM claim_ground_inspections WHERE ground_inspection_id = $1 AND status = 'completed' AND death_date_source = 'family_statement'
     ON CONFLICT (ground_inspection_id) DO NOTHING` (⚠ `closeScopeTx` swallows a failed COMMIT — `multi-tenant/scope-tx.ts:57-66`, 6.27a
     deferred D1 — so the INSERT must ⛔ never trust that the completion persisted), plus the DB backstop trigger (Task 1.3). A WITHHELD
     result writes ⛔ no showing (⛔ nobody was shown anything); the first re-read or note write by a caller who is ⛔ not hidden recomputes
     and writes it; a completion whose COMMIT was swallowed is answered `withheld`, ⛔ never `shown` (Task 4.1);
   - the showing holds `question_keys` (possibly EMPTY — a delivered result with ⛔ no difference writes a row with `'{}'`, so "absent" means
     ONLY "never delivered, or the write failed", ⛔ never "no difference") and `shown_at clock_timestamp()` (= when the showing was first
     RECORDED — the completion's delivery on the normal path; after a failed or withheld write, the first un-hidden re-read or note write
     that recorded it, ⛔ never back-dated); ⛔ no values;
   - `completed_at` < `shown_at` (an ordering test in SEPARATE committed transactions — [[project_db_clock_ordering_tests_tie]]; red-check
     it by reversing the comparator);
   - a failed showing write ⛔ never fails the completion response (logged ids-only; the response still carries the in-tx result);
     ⚠ AMENDED (code review round 2, R2-20, 2026-10-14 — this line contradicted Task 4.1, which the code follows): only a failure
     AFTER the guarded statement answered `persisted = true` (the delivery's closing COMMIT) answers `shown` with the in-tx keys;
     a RAISE from that statement, or `persisted = false`, answers `withheld/check_failed` — in every case a 200, ⛔ a failed response;
   - `GET …/ground-inspection/:ground_inspection_id/discrepancy` (the re-read; R4's guard) — order: guard → 404 → hidden check → read.
     404 `ground_inspection.not_found` (the module's existing code, handlers `:94-96`) for ANY assignment whose `status` is ⛔ not
     `completed` (`scheduled` / `superseded` / `photo_refused` / `evidence_unavailable`) or whose `death_date_source` is ⛔ not
     `family_statement` (R1) — one neutral code, ⛔ never reaching the recompute. A hidden caller ⇒ the withheld shape with ⛔ no notes
     (R4). Otherwise it returns the RECORDED showing; if ABSENT it RECOMPUTES against the answers live AS OF `completed_at`
     (`saved_at <= completed_at AND (superseded_at IS NULL OR superseded_at > completed_at)` — exact by R2's clock basis), writes it
     (`ON CONFLICT DO NOTHING`, then re-reads the winner) and returns it; plus ALL of the assignment's notes with their author (R4a);
   - tests: a lost completion response (the re-read returns the same keys); a failed showing write (simulated — the re-read recomputes the
     SAME keys even after a later answer arrives); a withheld completion writes ⛔ no showing and a later un-hidden re-read writes it with
     the same keys; an empty showing; idempotency under two concurrent re-reads (one row); each 404 status.
6. **AC6 — the notes:** `POST …/ground-inspection/:ground_inspection_id/discrepancy-notes` `{ questionKey, note }` (R4's guard; R4a).
   The writer's order, all inside ONE transaction, after the handler has encrypted the note (Trap 9):
   1. the assignment read (⛔ not `completed` or ⛔ not `family_statement` ⇒ 404 `ground_inspection.not_found`, as AC5);
   2. `lockClaimInWindow` — the ONE window (`isClaimInAnswerWindow`; ⛔ never re-composed) ⇒ else 409 `ground_inspection.not_allowed`
      (the module's existing window code: `GroundInspectionClaimNotInVerificationError`, handlers `:67-73` — ⛔ never a new one). The window
      after a full-visit completion: completion is an identity-state event (`ground-inspection-persist.ts:1047-1048`) and itself requires the
      window, so notes are writable at once and stay so while the claim is in `CLAIM_REVIEW_WINDOW_STATES` (`review-window.ts:15-21` —
      `verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed`, `state_trustee_freeze`) or `state_trustee_approved`
      while R9-routed; closed in every other state (`approved`, `settled`, `denied`, the other appeal stages, `closed`);
   3. the HIDDEN check — `isActorOwnVisitPending` (fail closed) ⇒ `OwnGroundVisitPendingError` → ONE 409
      `ground_inspection.own_ground_visit_pending`, ⛔ no `details` (6.27b BD4's error, `claim/errors.ts:745`) — BEFORE steps 4–5, so the
      refusal never depends on the showing (AC2);
   4. the showing: read the recorded row; if ABSENT, recompute-and-insert as the re-read does (`readOrRecomputeInspectionDiscrepancy` —
      a completion whose post-commit showing write failed still accepts the note the inspector was shown); a key ⛔ not in it ⇒ 409
      `ground_inspection.discrepancy_not_shown` (also enforced by the Task 1.3 trigger);
   5. ONCE per (assignment, question): a pre-check under the claim lock (exact — every note writer on the claim takes that lock) ⇒ 409
      `ground_inspection.discrepancy_note_exists`; the `UNIQUE` 23505 is the backstop (mapped to the same 409);
   6. INSERT: Tier-1 (R6), `noted_at clock_timestamp()`, `author_actor_id` through `normalizeActorId`, `author_display` (R4a — resolved
      by the handler AFTER `resolveInspectorOverride` and BEFORE the transaction, with the encryption: `getDisplayName(deps.pool, actorId)`,
      `null` ⇒ `AdminDisplayNameMissingError` — already an `ApiError` 409 `admin.display_name_missing`, `apps/api/src/http-errors.ts:82-91`,
      ⛔ no mapping; the column precedents: `claim_verifier_decisions.actor_display` (`0059:47`) and `claim_correction_marks.set_by_actor_display` with its btrim CHECK, `0126:40`).
   - 201 `{ questionKey, notedAt, authorActorId, authorDisplay }` (⛔ the note text — the caller has it).
   - The note body is `.strict()`, `note: z.string().min(1)` with ⛔ no `.max` — exactly as `CompleteBody.notes`
     (`claims.ground-inspection.routes.ts:98`); there is ⛔ no visit-notes limit to copy. ⚠ AMENDED (code review round 2,
     R2-15): ⛔ a BLANK note either (refused 400 after trim; stored as typed) — the slot is once-only and append-only.
   - The completed inspection row is ⛔ never changed (a test compares its `to_jsonb` before / after the showing and note writes).
   - The note is shown to staff (R5) marked *"Recorded after the difference was shown"* (story-minted) with its `noted_at` and author, and
     on the re-read with its author (R4a).
7. **AC7 — answers after completion:** an answer saved after `completed_at` ⛔ never reaches the inspector's screen or the re-read (the
   showing is as-of `completed_at`); it reaches the District Admin through the console's existing live answers (a test on each side —
   Task 2.6 domain, Task 4.5 API).
8. **AC8 — erasure, policies, gates:** the notes table's erasure arm in 0143's form + its scrub in the anonymizer + the rtbf pin raised
   (Task 1.4 / 5); RLS + per-command policies + a policy spec on BOTH tables; the showings table ⛔ never updated or deleted (no UPDATE grant,
   no UPDATE / DELETE policy, trigger); the completion handler's new field reaches the admin (a complete-only response schema — Task 4.4);
   the contracts' `.strict()` transcript gains its field with every fixture amended (Task 4.3 — the console and `…/peer-answers` routes
   PARSE their responses through the zod `serializerCompiler`, `plugins/zod-openapi/index.ts:25`, so a missing required field is a 500);
   `pnpm ci:local` green, and the domain + api live specs touching these files re-run with `DATABASE_URL` set; and the counsel evidence
   line for the notes table (Task 7 — `-304` Q4 A).

## Tasks / Subtasks

- [x] **Task 0 — re-read before code.** `git diff --name-only 8fcf7826..HEAD -- packages apps scripts infra`; re-read every cited file that
      moved. Grep the code for `6.27d` (two doc-block notes today: `packages/domain/src/questionnaires/keys.ts:41-43`,
      `packages/domain/src/claim/peer-mesh-reply.ts:618-622`). Re-check the role catalogue still grants `claim.override_ground_inspection`
      ONLY to `pariwar_admin` (+ `super_admin`) — R4's "no new viewer" rests on it. ⛔ No governance commit is owed (AC1).

- [x] **Task 1 — migration `0160` (AC5, AC6, AC8).** Next free number at HEAD is **0160** (journal ends at idx 159, `0159_ground-inspection-note-authors`);
      re-check at build. Hand-authored SQL + a `meta/_journal.json` entry (⛔ never `db:generate`; ⛔ never edit an applied migration —
      [[project_live_db_test_gotchas]]). Order as 0119: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes. Iterate on a throwaway
      database first (6.27a's `twt_scratch_627a` practice), then apply to **:5432 AND :5433**, then prove both from zero.
  - [x] 1.0 ⚠ `claim_ground_inspections` has ONLY its primary key (`0055:46`; its FKs are single-column, `0055:78-80`) ⇒ ADD
        `claim_ground_inspections_owner_uq UNIQUE (pariwar_id, ground_inspection_id, claim_case_id)` (0157's ownership-backstop form,
        `0157:11,17`) — required, ⛔ not optional.
  - [x] 1.1 `claim_ground_inspection_discrepancy_showings`: `pariwar_id`, `claim_case_id`, `ground_inspection_id` (`UNIQUE (ground_inspection_id)`),
        `question_keys text[] NOT NULL` with `CHECK (question_keys <@ ARRAY['has_died','death_date']::text[])`, `shown_at timestamptz NOT NULL DEFAULT clock_timestamp()`.
        FKs: `(pariwar_id, ground_inspection_id, claim_case_id)` → `claim_ground_inspections (pariwar_id, ground_inspection_id, claim_case_id)`
        `ON DELETE CASCADE` (so a child can ⛔ never name another claim than its parent) and `(pariwar_id, claim_case_id)` → `claims`
        (`claims_pariwar_claim_case_uq`, `0143:53`) `ON DELETE CASCADE` — "DELETE only by cascade" (1.3) needs both stated. `GRANT SELECT, INSERT` ONLY.
  - [x] 1.2 `claim_ground_inspection_discrepancy_notes`: `pariwar_id`, `claim_case_id`, `ground_inspection_id`, `question_key text NOT NULL
        CHECK (question_key IN ('has_died','death_date'))`, `note_ciphertext text NOT NULL` (Tier-1, `piiColumn(1,'ground_inspection')` in
        the drizzle schema — R6), `author_actor_id text NOT NULL CHECK (length(btrim(author_actor_id)) > 0)` (0159's author CHECK, NOT NULL
        here), `author_display text NOT NULL CHECK (length(btrim(author_display)) > 0)` (the author's stored admin display name, captured at
        write — the house attribution source, [[project_admin_display_name_attribution]]; staff data, ⛔ member PII), `noted_at timestamptz NOT NULL
        DEFAULT clock_timestamp()`, `UNIQUE (ground_inspection_id, question_key)`; the same FKs as 1.1.
        `GRANT SELECT, INSERT` + column-level `GRANT UPDATE ("note_ciphertext")` (the scrub — without the column grant the scrub FAILS with
        42501; without the UPDATE policy of 1.4 it would silently match 0 rows under FORCE RLS — `0143:75` is that policy's comment, `-279`
        A12). ⚠ #37(a): ⛔ no CHECK on `note_ciphertext` beyond NOT NULL (the scrub writes a non-NULL sentinel).
  - [x] 1.3 Triggers (invoker functions — the house form; a trigger reading the parent row under FORCE RLS works in scope — 0156's answer trigger reads its reply, `0156:238-240`):
        (a) on BOTH tables a BEFORE INSERT trigger refusing a row whose parent (`pariwar_id`, `ground_inspection_id`, `claim_case_id`) is
        ⛔ not, in the inserting transaction's view, `status = 'completed'` AND `death_date_source = 'family_statement'` (R1) — the backstop
        for an UNGUARDED writer (23000). ⚠ The handler's guarded `INSERT … SELECT` (Task 4.1) yields 0 rows in the swallowed-COMMIT case
        — its WHERE filters first, so the per-row trigger never fires; the handler detects that case by `persisted` (4.1), ⛔ not by this
        trigger. (⚠ The trigger cannot see whether an insert shares the completion's own transaction — the writers never do that, recorded
        in the header); on the notes table it ALSO refuses a `question_key` ⛔ in that assignment's showing `question_keys`
        (⛔ no showing ⇒ refused). (b) showings: refuse UPDATE; DELETE only at `pg_trigger_depth() > 1` (cascade); refuse TRUNCATE — 0143's
        form (`0143:82-112`). (c) notes — the erasure arm in 0143's form (0156 carries ⛔ no DELETE / TRUNCATE trigger — it relies on ⛔ no
        grant; "0156's form" is the erasure arm only): UPDATE passes ONLY when `(to_jsonb(NEW) - 'note_ciphertext') IS NOT DISTINCT FROM
        (to_jsonb(OLD) - 'note_ciphertext')` AND `OLD.note_ciphertext IS NOT NULL AND NEW.note_ciphertext IS NOT NULL`; DELETE only by
        cascade; TRUNCATE refused. ⭐ Every refusal raises `integrity_constraint_violation` (23000), as 0143 — the new tables JOIN the
        cascade set of `claim-death-certificate-policy-regression.spec.ts`'s live `TRUNCATE claim_death_certificate_uploads CASCADE`
        (`:439-460`, via 0147's `compared_certificate_upload_id` FK; `lockTruncateSetNowait` builds the set recursively), which expects 23000.
        ⚠ RECORD in the migration header, as 0149 does (`0149:24-25`), that *"the trigger cannot tell the RTBF scrub from any other writer"*.
  - [x] 1.4 RLS: `ENABLE` + `FORCE`; per-command policies (`for: 'select'`, `'insert'`, and on notes `'update'` — the scrub needs it, `-279`
        A12) with the house `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` scope; ⛔ never `FOR ALL`; ⛔ no DELETE
        policy. Policy files `packages/domain/src/policies/claim-ground-inspection-discrepancy-{showings,notes}-rls.ts`, exported from
        `policies/index.ts` (pattern: `claim-peer-mesh-replies-rls.ts`). Drizzle schema files in `packages/domain/src/schema/` + the barrel.
  - [x] 1.5 Policy spec `packages/domain/tests/integration/rls/claim-ground-inspection-discrepancy-policy-regression.spec.ts` (pattern:
        `claim-peer-mesh-replies-policy-regression.spec.ts` — each refusal under a SAVEPOINT `attempt()` returning the SQLSTATE): grants,
        cross-tenant, FORCE, fail-closed scope, ⛔ no DELETE, the showings' UPDATE refused, the notes' non-erasure UPDATE refused and the
        sentinel UPDATE admitted, a NULL ciphertext refused, the Task 1.3 (a) refusals (scheduled / certificate_check / superseded parent;
        a note key not in the showing; a pre-0147 NULL-source parent), the CHECKs. The cross-tenant INSERT leg asserts the TRIGGER's message
        (an invoker trigger that cannot see the parent refuses before RLS WITH CHECK — precedent
        `claim-peer-mesh-replies-policy-regression.spec.ts:421-423`), ⛔ not 42501. The TRUNCATE leg uses the binding + temp-twin pattern
        (`claim-warning-approvals-policy-regression.spec.ts:518-530`), ⛔ never a live TRUNCATE. ⚠ No helper TRUNCATEs `claims` or
        `claim_ground_inspections` (cleanup is ROLLBACK, a `DELETE FROM claims` cascade — admitted at `pg_trigger_depth() > 1` — or the
        own-committing specs' `session_replication_role='replica'` DELETE, `peer-mesh-reply-concurrency.spec.ts:51-57`); the only live
        TRUNCATE reaching these tables is the death-certificate spec above — re-run it ([[project_fk_truncate_cascade_deadlock]]).

- [x] **Task 2 — the comparison and the domain writers (AC2, AC3, AC5, AC6, AC7; R1, R2).**
  - [x] 2.1 EXTRACT the per-answer rule from `derivePeerReplyWarningKeys` (`packages/domain/src/claim/approval-warnings.ts:324-355`, doc
        `:315-323`; its input is `{ id, key, codes, window }` and it already compares against a reference index — 6.27b passes
        `currentAcceptedDateIndex`, 6.27d passes the FAMILY's `death_date_index`; the reference is a PARAMETER, so 6.27b is unchanged) into
        ONE exported pure predicate (e.g. `peerAnswerDiffers(answer, referenceDateIndex): 'has_died' | 'death_date' | null`) and make
        `derivePeerReplyWarningKeys` call it — ⛔ never a copy. 6.27b's tests stay green UNCHANGED (red-check: break the predicate, watch
        BOTH 6.27b's and 6.27d's tests go red). ⛔ Do ⛔ not call `derivePeerReplyWarningKeys` itself with the family's index — it mints
        `peer_*` WARNING keys (the wrong vocabulary, and `-304` Q3: *"⛔ never a warning"*).
  - [x] 2.2 A new pure module `packages/domain/src/claim/inspection-discrepancy.ts`: a rule table typed `Record<ComparableQuestionKey, 'compare' | 'not_comparable'>`
        over `COMPARABLE_QUESTION_KEYS` (`questionnaires/keys.ts:44` — ⛔ never a second hand-written list; ⚠ ⛔ no `ComparableQuestionKey`
        type exists — declare `type ComparableQuestionKey = (typeof COMPARABLE_QUESTION_KEYS)[number]`): `has_died` / `death_date` ⇒
        `'compare'`; `death_cause` / `death_illness` ⇒ `'not_comparable'` with a doc-line *"owed by row 6-32 — the family side and a keyed
        comparable form"*. The SQL reads ONLY the `'compare'` keys DERIVED from the table. A `deriveInspectionDiscrepancy({ answers, familyDateIndex })`
        returns the ordered key list. ⚠ JSDoc comments only and no `**/` inside them ([[project_markdown_emphasis_closes_jsdoc]]; 6.27b Trap 13).
  - [x] 2.3 The SQL fragment(s): live answers (`superseded_at IS NULL`) and as-of answers (`saved_at <= $asOf AND (superseded_at IS NULL OR superseded_at > $asOf)`),
        selecting `question_key`, `value_codes`, `death_date_window_indexes` ONLY — ⛔ never `value_ciphertext` (the shape of
        `peerReplyColumnsSql`, `approval-warnings.ts:532-552`, which is private, correlated on alias `c`, and returns a `json_agg(...)`
        scalar subquery: export a parameterised sibling there or build the fragment in the new module — ONE fragment for both the in-tx and
        the as-of read; keep the own-claim filter `-261` C3 that fragment carries). ⚠ That fragment filters on
        `PEER_MESH_WARNING_QUESTION_KEYS` (`keys.ts:23`, `['has_died','death_date']`) — a SECOND key list beside 2.2's derived one: a parity
        test asserts the `'compare'` keys equal it, or derive one from the other. `clampLimit` is N/A: the domain-limit gate flags only a
        dynamic `.limit()`, and this read has none.
  - [x] 2.4 Wire into `completeGroundInspection` (`packages/domain/src/claim/ground-inspection-persist.ts:933-1059`): after the UPDATE
        (`:1007-1035`) and before / after `projectClaimState` (keep its event untouched), when `deathDateSource === 'family_statement'`,
        read the live answers (⛔ no lock — the claim lock is already held: lock order assignment → claim, 6.26a Trap 1; answer writers go
        claim → ping → reply) and add `discrepancy` to `CompleteGroundInspectionResult` (`:907-915`); `null` otherwise. ⛔ No KMS. A retried
        completion still throws `GroundInspectionNotActiveError` first (409) — the re-read is the recovery path. ⛔ Never touch the
        `completedAt: sql\`clock_timestamp()\`` line (`:1017`) — R2's clock basis rests on it.
  - [x] 2.5 Domain functions for Tasks 4–5, IN `ground-inspection-persist.ts` (⚠ `lockClaimInWindow` is a NON-exported function there,
        `:292-296` — the note writer lives beside it; ⛔ never export-and-recompose it elsewhere; the module already passes every fence
        pattern): `recordInspectionDiscrepancyShowing` (the guarded INSERT … SELECT, own tx supplied by the caller),
        `readOrRecomputeInspectionDiscrepancy` (recorded row, else as-of recompute + insert + re-read), `recordInspectionDiscrepancyNote`
        (AC6's six steps — assignment read → `lockClaimInWindow` → hidden check (`assertActorMayApprove`'s pattern,
        `approver-own-visit.ts:105-107`, throwing `OwnGroundVisitPendingError`) → read-or-recompute the showing → exists pre-check → INSERT;
        23505 ⇒ the same typed error), `readInspectionDiscrepancyNotes` (ALL notes of an assignment, with `authorActorId` — R4a). Export
        through the claim barrel.
  - [x] 2.6 Tests (domain, live — `packages/domain/tests/integration/claim/ground-inspection-discrepancy.spec.ts`; fixtures
        `_peer-reply-fixtures.ts`; dates via `fixtureDeathDateIndex` / `deathDateWindow(...).map(fixtureDeathDateIndex)` — 6.27b Trap 3;
        completion takes the fixture's `now` — 6.26a Trap 9): every AC3 leg; AC7's domain leg (an answer saved after `completed_at` is
        ⛔ not in the recompute); the note writer's six steps incl. a hidden caller refused identically whether or not the key is in the
        showing, and a note accepted after a missing showing (recomputed); AC6's `to_jsonb` before / after leg and the 23505 backstop (a
        forced duplicate past the pre-check); AC5's concurrent-re-read leg (one row); the ordering and race legs in an OWN-COMMITTING spec (the
        `ground-inspection-concurrency.spec.ts` header pattern; cleanup by the replica-mode DELETE), `{ timeout: 20000 }`; assert membership,
        ⛔ never counts of shared tables.

- [x] **Task 3 — the screens (AC2, AC4, AC5, AC6; admin).** `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` + `i18n-en.ts`
      (plain English constants — ⛔ not `useT`; `gi.result.completed` at `i18n-en.ts:126` is unused — as are `gi.result.refused` and
      `gi.result.photoUploaded` — reuse it or remove it, ⛔ never leave it dangling twice; leave the other two alone). The module has ⛔ no
      hooks in `apps/admin/src/api/hooks.ts` — it calls `useQuery` / `useMutation` inline on `api.*`; follow that.
  - [x] 3.1 ⚠ `CompleteAction` (`:521-633`) renders only while the assignment is `scheduled` (`isActive = a.status === 'scheduled'`, `:344`;
        render `:405-411`); its `onSuccess` invalidates the list, the refetch shows `completed`, and it UNMOUNTS — `mutation.data` is lost
        ([[project_tanstack_onsettled_before_success]]). ⇒ on success, SEED a query keyed by the assignment id
        (`qc.setQueryData([...,'discrepancy', id], { discrepancy: response.discrepancy, notes: [] })` — the SAME `{ discrepancy, notes }` shape
        the GET returns; `staleTime: Infinity` on that query — the default `0` refetches on mount) BEFORE `onMutated()`, and render a
        `DiscrepancyPanel` on the COMPLETED card (beside `InspectorRecord`, `:404`), which reads that query. ⚠ The page has ⛔ NO "may complete" eligibility to reuse — `CompleteAction` renders for EVERY viewer of a scheduled card
        and the page never reads the viewer's identity. ⇒ the query is ENABLED only when (a) this session's completion seeded the cache
        (served without a fetch — `staleTime: Infinity`; a 409 `discrepancy_note_exists` calls `refetch()`), or (b) the session's `useSession().data?.userId` (`hooks.ts:43`; precedent `R9CasePanel.tsx`, `apps/admin/src/modules/r9-voting/`)
        names `a.inspectorActorId` under the domain's `normalizeActorId` rule (trim the six whitespace characters, then lower-case —
        `approver-own-visit.ts:32-40`) — ⚠ a LOCAL helper in the page: the admin is a browser bundle and ⛔ cannot import `@twt/domain`
        (`banners/derive.ts:12-13`; write it as `normalize(a) === normalize(b)` — ⛔ no lint forbids the copy, and ⛔ no admin helper exists);
        convenience only, the server's guard is the boundary — and only for a `completed` card whose `deathDateSource === 'family_statement'`
        (R1 — ⛔ never the stage; the list row carries it, `client.ts:1241`). Every OTHER viewer of such a card gets an on-demand *"Show the
        result"* button (story-minted) — the page ⛔ cannot identify an override holder (`useSession()` carries only `userId` and
        `nationalGrants`, `packages/contracts/src/auth/session.ts:32-44`; a Pariwar Admin's pariwar-scope override grant is ⛔ not in it); a
        non-holder's click gets the server's 403 (one audited denial per click, ⛔ never automatic). ⚠ Why:
        every 403 runs `auditAuthorizationDenied` (handlers `:216-219`) — an automatic fetch per card per viewer floods the audit log.
        ⚠ AMENDED (code review round 3, R3-1 — the CR1 / R2-13 replacements had reached only the Completion Notes): ⛔ a seed in
        the shared query cache keyed by the assignment id — that actor-blind, never-expiring entry is what round 1's CR1 (HIGH)
        found showing one actor's result and notes to the next. The completion's result is held in the ASSIGNMENT CARD's own state
        and served to the panel as `initialData` (no GET); the panel's query is keyed per OPENING (`useId`) with `gcTime: 0` and is
        removed on unmount; the cards re-key when one known viewer gives way to another. And ⛔ `useSession().data?.userId` as it
        stands: the viewer is known only after the session was fetched SUCCESSFULLY after the page mounted (R2-13 — a sign-out
        only invalidates the session, so the cache can still name the previous actor), latched against a later failed refetch.
  - [x] 3.2 The panel: the two screens (AC4); one note box per differing key, saved per row with per-call `mutateAsync().then`
        ([[project_tanstack_mutate_callbacks_latest_only]]; a test with two deferred promises); a saved note shows read-only (*"Recorded"*,
        story-minted) with its author's display name when ⛔ the viewer's own (R4a); a note returned as `{ status: 'unavailable' }` renders
        *"This note could not be shown"* (story-minted), ⛔ never blank; on a 201 `refetch()` the `[…,'discrepancy', id]` query (the seeded
        cache is `staleTime: Infinity` — nothing else updates it; ⚠ AMENDED (round 3, R3-1): the opening's own query, per Task 3.1's
        amendment — the 201 first installs the confirmed note in it, then re-reads); a 409 `discrepancy_note_exists` re-reads (and then SHOWS the existing
        note with its author — ⛔ never an empty box again); 409 `ground_inspection.not_allowed` (the window) and 409
        `ground_inspection.own_ground_visit_pending` have ⛔ no page words today (⛔ not in `WORDED_ERROR_CODES`, `:44-51` — the server's
        message would show under the box) ⇒ add `gi.error.not_allowed` / `gi.error.own_ground_visit_pending` (story-minted English) to that
        list; results announced in a polite live region (6.27a family 13). ⚠ AMENDED (code review round 2, R2-2): ⛔ "that list" —
        `not_allowed` is the MODULE-WIDE window code, so the note's refusals are worded in a NOTE-scoped list
        (`NOTE_WORDED_ERROR_CODES`, keys `gi.discrepancy.error.*`) used only by the note box. ⛔ Never inside OP14's *"Other claims for this death"* section
        (`:155-180` — 6.27a Trap 5).
  - [x] 3.3 Tests `apps/admin/tests/ground-inspection-discrepancy.test.tsx` with a REAL `useQuery` + the list refetch flipping to
        `completed` in the same flush (the unmount case); the DOM never contains a neighbour name / value / count; the withheld shape renders
        `<WithheldNote>`; a `certificate_check` or NULL-source completion renders no panel; a `scheduled` card renders no panel (AC2); a completed card
        viewed by a non-inspector fires ⛔ no GET; a note written by another author renders read-only with that author; both screens' copy
        VERBATIM (AC4); ② renders the date as the page does and `'—'` when `unavailable`; an `unavailable` note renders its story-minted text.

- [x] **Task 4 — routes, contracts, client (AC2, AC4, AC5, AC6, AC7, AC8).**
  - [x] 4.1 Completion handler (`claims.ground-inspection.handlers.ts` `complete()` `:604-685`; it opens its OWN scope tx, `openScopeTx`
        `:639`): after `closeScopeTx(scopeTx, ok)` (`:659`), when `result.discrepancy !== null`: open a NEW scope tx (`openScopeTx` — the
        first is released, so this is the request's second connection, ⛔ not a third; precedent for a best-effort post-commit tx that
        never fails the response: `claims.cycle-freeze.handlers.ts:663→713/737`), (i) evaluate
        `isActorOwnVisitPending(db, ctx.pariwarId, assignment.claimCaseId, ctx.actorId)` (`approver-own-visit.ts:67`) → hidden ⇒ R4's
        withheld shape `own_visit`; (ii) ONLY when ⛔ not hidden, write the showing (Task 2.5) — a withheld result writes ⛔ nothing (AC5);
        close. ⚠ FAIL CLOSED: ANY failure BEFORE (i) has answered — `openScopeTx` throwing, the check erroring — returns
        `{ state: 'withheld', reason: 'check_failed' }`, ⛔ never `shown`. ⚠ The swallowed-COMMIT case (`closeScopeTx`,
        `multi-tenant/scope-tx.ts:57-66` — the completion did ⛔ not persist, the parent is still `scheduled`): for the ASSIGNED inspector
        step (i) already answers `withheld/own_visit` (their assignment is still `scheduled`, so the ONE predicate hides them); for an
        override completer step (i) passes, so (ii) must DETECT it. ⇒ (ii) is ONE statement that reports whether the parent persisted:
        `WITH parent AS (SELECT … FROM claim_ground_inspections WHERE ground_inspection_id = $1 AND status = 'completed' AND
        death_date_source = 'family_statement'), ins AS (INSERT … SELECT … FROM parent ON CONFLICT (ground_inspection_id) DO NOTHING)
        SELECT EXISTS (SELECT 1 FROM parent) AS persisted`. `persisted = false` ⇒ `{ state: 'withheld', reason: 'check_failed' }`; a raise
        from that statement (e.g. the Task 1.3 (a) trigger's 23000) ⇒ `check_failed` too — ⛔ never `shown` for a record that is ⛔ not
        known to be saved (CF2: the inspector could otherwise see the difference and then complete their record again). `persisted = true`
        with a conflict (a concurrent un-hidden re-read wrote the row first — possible only after the completion committed) ⇒ `shown` (the
        keys equal the in-tx result by R2). ONLY a failure AFTER that statement answered `persisted = true` (e.g. the closing COMMIT) is
        logged ids-only and the response carries `shown` with the in-tx keys. Return `{ groundInspectionId, status, photoCount, discrepancy }` where `discrepancy` is `null`
        (R1) | `{ state: 'withheld', reason: 'own_visit' | 'check_failed' }` | `{ state: 'shown', questionKeys, familyDeathDate:
        { status: 'shown', date } | null }` (`date` = `body.deathDate` when `death_date` ∈ keys, else `familyDeathDate: null` — R3). ONE
        union for both routes: the re-read's `familyDeathDate` adds only the `{ status: 'unavailable' }` arm (4.2). Use `assignment.claimCaseId`, ⛔ never
        `params.claimCaseId` — `resolveGroundInspectionAssignment` loads by (pariwar, id) only and never checks the path's claim id (routes
        `:150-163`). ⛔ Never the post-commit work on `request.scopeTx` (it commits in `onSend` — `multi-tenant/index.ts:21-27`; #42(b)).
        Keep `void reply.status(N); return body;` ([[project_fastify_onsend_doublesend]]).
  - [x] 4.2 `GET …/ground-inspection/:ground_inspection_id/discrepancy` and `POST …/ground-inspection/:ground_inspection_id/discrepancy-notes`
        in `claims.ground-inspection.routes.ts` with the SAME inline `preHandler: [adminSession, scope, resolveAssignment, conductFromRow]`
        as `complete` (`:245-252`) and `resolveInspectorOverride` in the handler (R4; it checks identity only — ⛔ no status, ⛔ no hide —
        so the hidden check of AC2 / AC6 is the handler's / writer's job). The file is in the human-actor gate's `ENROLMENT_OWED`
        (`scripts/claim-adjudication-human-actor-invariant/check.ts:290-293`), whose entries are only PRINTED — the scan loop walks
        `COVERAGE_SET` alone (`:376`) ⇒ ⛔ no list change, and the gate stays green (only a NEW `claims.*.routes.ts` file would fail, as
        unclassified). Bodies `.strict()`; the note body per AC6 (⛔ no `.max`, as `CompleteBody.notes`, `:98`). Use `assignment.claimCaseId`
        (4.1). The GET runs its domain read-or-recompute-and-insert in its OWN `openScopeTx`, closes it, and only THEN decrypts the date (R3)
        and the notes — ⛔ never on `request.scopeTx` (the insert's unique-index entry would stay locked across the KMS calls until `onSend`,
        Trap 9) and ⛔ never under `underSavepoint` (unsafe for read-then-write — `later-approval-warnings.ts:172-180`). It returns the same
        `discrepancy` union, with `familyDeathDate: { status: 'shown', date } | { status: 'unavailable' } | null` on the re-read (`null` when
        `death_date` ∉ keys; R3) + `notes:
        { questionKey, note | { status: 'unavailable' }, notedAt, authorActorId, authorDisplay }[]` (ALL of the assignment's notes — R4a; `[]` for a
        withheld caller). Map `claim.OwnGroundVisitPendingError` DIRECTLY in `translateGroundInspectionError` (`:66`): `throw new ConflictError(<story-minted
        words — ⛔ "approve">, 'ground_inspection.own_ground_visit_pending')`, ⛔ no `details` — ⛔ not through
        `translateLaterApprovalWarningError` (its `LaterApprovalRoutePrefix` union lacks `ground_inspection`, `later-approval-warnings.ts:14`;
        its words end *"…before you can approve."*, `:18-19`); ⛔ no test pins which routes may emit the code. Widen the error's doc
        (`claim/errors.ts:738-744`) to name the note writer. Map the new note errors → `…discrepancy_note_exists` / `…discrepancy_not_shown`
        there too. Audit: the note write emits `emitAuthAudit(deps, request, type,
        { actorId, pariwarId, context })` (`apps/api/src/modules/auth/shared/audit.ts:14`) post-commit with codes only (`question_key`) — a new dotted member of the
        closed `AuthAuditEventType` union (`apps/api/src/audit/audit-sink.ts:15`; ground-inspection members `:399-409`; F40; no test pins the
        whole union); the GET emits ⛔ none (the showing row is the record of when the result was first recorded).
  - [x] 4.3 The staff view (R5): `assemblePeerSection` (`apps/api/src/modules/claims/peer-answers-assembler.ts:117`) — AFTER its hide
        (`:129-138`) — reads the claim's showings + notes PER CLAIM (two reads, ⛔ never per assignment — `verifier-console.spec.ts:728`
        counts real SQL statements and fails if they grow with rows), each through `ctx.run` + `bump`; the notes are decrypted outside any
        lock, each failure → that note `{ status: 'unavailable' }`, ⛔ never blank. Carry the data through the `PeerSection` `present`
        variant (`:103-109`) and `UnstitchedPeerMeshSection` (`:92-96`) into `assemblePeerMeshSection` (`:286-314`), which BUILDS the wire
        transcript (`stitchPeerAnswerFlags`, `:324-353`, passes it through by spread). The `present` transcript
        (`packages/contracts/src/claims/verifier-console.ts` `PeerMeshTranscript`, `.strict()` at `:275`) gains
        `inspectionDiscrepancies: { groundInspectionId, completedAt, shownAt, questionKeys, notes: { questionKey, note | { status: 'unavailable' }, notedAt, authorDisplay }[] }[]`
        (REQUIRED, possibly empty — ⛔ never optional-for-some-readers; a claim with ⛔ no neighbour selection returns `{ status: 'empty' }`
        with ⛔ no transcript — harmless, ⛔ no difference is possible there). Amend the FIVE transcript constructions
        (`packages/contracts/tests/claims-verifier-console.test.ts:88`, `packages/contracts/tests/claims-peer-answers.test.ts:32`,
        `apps/admin/tests/verifier-console.test.tsx:92`, `apps/admin/tests/neighbours-answers-panel.test.tsx:43`,
        `apps/api/tests/unit/peer-answers-stitch.test.ts:29`) — re-grep, [[project_contracts_tests_outside_tsc]], `npx vitest run` in
        contracts. The admin has ⛔ no copy of the schema (`client.ts:32`, `:325` import it from `@twt/contracts`). `VERIFIER_CONSOLE_MAX_READS`
        27 → **29** (`claims.verifier-console.handlers.ts:238`, + a ledger line in its comment `:225-237`) and its FOUR pins in step:
        `verifier-console-ground-inspection.spec.ts:219`, `:349`, `verifier-console.spec.ts:1189`, `suspicion-refusal-routes.spec.ts:483`.
        (6.27b's `GET …/peer-answers` passes `() => {}` as `bump` — `claims.peer-answers.handlers.ts:121-138` — ⛔ no ceiling there.)
        `PeerMeshView` (`apps/admin/src/modules/claim-verification/PeerMeshView.tsx`; `NeighboursAnswersPanel` renders it, `:176` — so the
        block goes into `PeerMeshView` ONLY) renders the block (*"Recorded after the difference was shown"*, story-minted, with the author) —
        a `PeerMeshView` admin test renders it with its author and label, and an `unavailable` note's text.
  - [x] 4.4 Admin client (`apps/admin/src/api/client.ts`): `GroundInspectionWriteResponse` (`:1268-1272`, non-strict — it DROPS unknown
        keys today) is SHARED by schedule (`:1317`), findings (`:1333`), complete (`:1362`) and refusal (`:1376`) ⇒ ⛔ never add a required
        field to it; define a complete-only `GroundInspectionCompleteResponse = GroundInspectionWriteResponse.extend({ discrepancy })` and use
        it in `completeGroundInspection` (`:1354-1365`) ONLY; new client calls for the GET and the note POST (inline `useQuery` /
        `useMutation` on `api.*` in the page — Task 3). A test that the parsed completion response KEEPS `discrepancy`, and that the other
        three calls still parse a response without it.
  - [x] 4.5 API live specs (`apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts`, one HTTP request per step): the three
        response shapes; the override completer receives it; a hidden override completer gets `withheld` AND ⛔ no showing row is written;
        a fault before the hidden check ⇒ `withheld/check_failed`; a non-assigned Block Admin ⇒ 403 on all three routes (R4); the re-read
        after a lost response; the re-read's 404 for each non-`completed` status, for `certificate_check`, and for a pre-0147 completed row
        with a NULL `death_date_source`; a hidden caller's re-read ⇒
        withheld with `notes: []` (AC2); the note write rules (once, key-not-shown, window `not_allowed`, a missing showing recomputed); a
        HIDDEN override holder probing `has_died` and `death_date` gets identical status, `error.code`, `error.message` and ⛔ no `details`
        (only `error.request_id` differs) (AC2); a completion whose COMMIT is swallowed (simulated) returns `withheld` — `own_visit` for the assigned inspector,
        `check_failed` for an override completer — ⛔ never `shown`, and ⛔ no showing row (4.1, AC5); a user with ⛔ no display name ⇒ 409
        `admin.display_name_missing` on the note write, while a non-holder with ⛔ no name still gets 403 (AC6); a note by an override holder is
        returned to the assigned inspector on the re-read with its author (R4a); a fault in the re-read's hidden check ⇒ withheld (AC2);
        every AC4 / AC5 leg not carried by Task 2.6 — the response key-set assertion and the shape not varying with the number of neighbours
        (AC4), a simulated failed showing write that neither fails the completion response nor changes the re-read's keys after a later
        answer, a withheld completion followed by an un-hidden re-read writing the same keys, an empty showing (AC5); the console's `peerMesh` carries the block for the
        District Admin and is ABSENT for a hidden reader (AC2); a later answer is on the console, ⛔ not on the re-read (AC7).

- [x] **Task 5 — erasure (AC8; PM17 d's half).** In `packages/domain/src/member/anonymize.ts`, inside GI13's deceased-claims block
      (`if (deceasedClaimIds.length > 0)`, `:284`; block `:270-319`): `UPDATE claim_ground_inspection_discrepancy_notes SET note_ciphertext =
      inspectionSentinel WHERE claim_case_id IN (…) AND note_ciphertext IS NOT NULL` — REUSE the block's existing `inspectionSentinel`
      (`:285`, field class `ground_inspection` = R6's), GI13's shape. Raise the rtbf pins (`packages/domain/tests/member/rtbf-anonymize.test.ts`),
      every one: the `it` title (`:122`, *"TWENTY … twenty-three statements"*), 23 → 24 statements (`:198`), the table list (`:200-221`) + its
      schema import, TWENTY → TWENTY-ONE tables (`:233`, with its history comment). The no-claims leg (`:265`, 21) stays 21 — the new statement
      sits inside the `deceasedClaimIds.length > 0` block and `run([])` yields ⛔ no claim ids (verified at `8fcf7826`; re-verify); add the
      notes table to that leg's `not.toContain` list (`:263-264`). A live RTBF
      leg: a note scrubbed, the showing untouched (it holds ⛔ no PII), the trigger admitting exactly the scrub. GI13's deferred item
      (`deferred-work.md` — *"whose data a neighbour's answer is"*) gains the notes table. ⚠ The note writer is another writer of the shape of
      the deferred item *"Erasure scrub not serialized with the peer-reply writer; saves after erasure not refused"* (it can store a fresh Tier-1
      note after the scrub) — append the notes table to THAT item too, ⛔ not fixed here.

- [x] **Task 6 — fences (AC3, AC8).** In `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`: add
      `inspection-discrepancy.ts` and `ground-inspection-persist.ts` (the note writer lives there — Task 2.5; it passes every
      `FORBIDDEN_PATTERNS` and decrypt pattern at `8fcf7826`) to `FENCED_FILES` (`50` → `52` at `:187`, with the history comment extended)
      and to 6.27a's decrypt `it` block (`:375-391`). ⚠ That block's patterns do ⛔ not include `value_ciphertext` (`:385`), and adding it to
      the SHARED list turns `peer-mesh-reply.ts` red (it writes `valueCiphertext`, `:451`, and reads `r.value_ciphertext`, `:590`) ⇒ AC3's *"no `value_ciphertext`"* is a SEPARATE
      assertion scoped to `inspection-discrepancy.ts` only. ⚠ `FORBIDDEN_PATTERNS` includes `toLowerCase()\s*===` — the comparator never
      compares lower-cased ids with `===` (use `isSameActorId`). A NEW `it` forbidding `member_medical_disclosures` / `medicalDisclosure` /
      an import from `../medical` in the two modules, with TEETH (the scan fires on a known positive,
      `packages/domain/src/medical/disclosure-read.ts`) — `-304` Q4 A; ⛔ no such fence exists today.

- [x] **Task 7 — close (AC8).** `pnpm ci:local` with `DATABASE_URL` on :5433; then the api integration suite on its own (`ci:local` stops at
      domain — 6.27b); record red-checks in the Debug Log (the shared predicate, the ordering comparator, the scrub's `WHERE`, the INSERT
      guard, `completed_at` → `now()` diverging the recompute (AC3), the medical fence's teeth (Task 6)). Change Log + File List. `deferred-work.md`: ONE item for ③ / ④ — *"the family's cause / illness answers (row 6-32) and a
      keyed blind index per option code are owed before the inspector can be shown a cause / illness difference"* — pointed at row 6-32.
      ⭐ `-304` Q4 A's counsel clause: add ONE evidence line to the counsel / privacy scope (Row 27, `docs/launch-gate-inventory/inventory-roster.md`
      — or a pointer on row 6-32's counsel line) naming `claim_ground_inspection_discrepancy_notes` as holding the family's free-text re-told
      account (possibly cause of death) — a go-live fence, ⛔ not a merge blocker. Sprint row → `review`.

### Review Findings

Code review 2026-10-14 — full diff `8fcf7826..15f87a15`; independent Blind Hunter, Edge Case Hunter and Acceptance Auditor,
then parent verification. **6 patch, 1 defer, 1 dismissed; no decision needed.** Author readings R1–R6/R4a and the recorded
dual-role observation are retained. The findings below describe the reviewed build; their dispositions and patch validation follow below.

- [x] [Review][Patch][HIGH][CR1] Scope the discrepancy cache to its authorized actor and lifecycle
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:65] — the key excludes the actor; infinite freshness
  and retention plus `seeded = any cached data` bypass the current viewer's identity/hide check. Logout only invalidates
  the session (`RootLayout.tsx:46`). Reproduced with one real QueryClient: actor A reads a difference and family note,
  unmounts, then actor B loads the same completed assignment; B sees A's note and difference with **zero GETs**, even
  though B's GET would return 403. Violates AC2/R4 and invariant families 3/6. Preserve the completion-to-card seed bridge
  for the actor who received it, and clear/revalidate it across session and authorization lifecycle changes.
- [x] [Review][Patch][MEDIUM][CR2] Allow a withheld result to recover
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:715] — `withheld/check_failed` and `withheld/own_visit`
  receive the same infinite cache defaults; the panel has no retry and no note box through which to trigger its only
  refetch. A transient failure, or a hidden supervisor subsequently completing their own visit, remains withheld on
  reopening. Reproduced: after unmount/remount, a now-successful GET is never called and the panel has no retry control.
  Add a recoverable re-read while preserving uniform withholding and the completion seed (AC5 recovery).
- [x] [Review][Patch][MEDIUM][CR3] Preserve a recorded note when its follow-up refresh fails
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:783] — POST success clears the text and announces
  success, but the discarded `query.refetch()` promise can fail; error rendering only runs when `query.data` is absent.
  Reproduced: the old `notes: []` remains, the saved response disappears, an empty editable box is displayed, and there
  is no error or refresh retry. Retain/display the confirmed submission and expose refresh failure/recovery rather
  than relying solely on the GET to make the box read-only (AC6/R4a; Task 3.2).
- [x] [Review][Patch][MEDIUM][CR4] Announce the discrepancy result transition
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:752] — loading has `role="status"`, but the delivered
  found/none/withheld result replaces it with ordinary content; the only polite region announces note saves. A
  screen-reader user who requests the result receives no announcement of its outcome or required re-ask. Add a stable
  polite result announcement and verify the reachable result arms (Task 3.2; invariant family 13(d), REAL GAP).
- [x] [Review][Patch][MEDIUM][CR5] Add the new routes' runtime tenant/actor boundary regression legs
  [apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts:343] — the HTTP suite covers same-tenant
  non-assigned actors and hidden supervisors, but no explicit cross-Pariwar request or tampered/non-human/system actor
  denial for the new note mutation; DB policy tests do not exercise those route boundaries. Add explicit denial legs
  for the POST and a cross-Pariwar GET probe, with valid own-tenant positive controls. This is a required missing test,
  **not a demonstrated server authorization vulnerability** (invariant family 3, REAL GAP).
- [x] [Review][Patch][MEDIUM][CR6] Prevent the legacy-row fixture's table-lock upgrade deadlock
  [packages/domain/tests/integration/claim/_inspection-discrepancy-fixtures.ts:28] — both the domain and policy specs
  call this helper after inserting an inspection in their transaction. Each can hold ROW EXCLUSIVE on the same table
  and then request ACCESS EXCLUSIVE for `ALTER TABLE`; the default forks runner permits those files concurrently.
  Reproduced using the actual helper on two connections holding the exact preceding table-lock mode: one returns
  **40P01 deadlock detected**, the other succeeds after the first rolls back. All reproduction DDL was rolled back.
  Serialize these fixtures before their conflicting table access, or isolate the legacy DDL setup, without disabling
  the independent two-connection domain race proofs (AC8 reliable live validation).
- [x] [Review][Defer][MEDIUM][CR7] The note POST inherits the shared swallowed-COMMIT false-success behavior
  [apps/api/src/modules/claims/claims.ground-inspection.handlers.ts:962] — deferred, pre-existing. `closeScopeTx` never
  throws on COMMIT failure, so an unpersisted note can be answered 201 and audited recorded. This is the existing
  Story 1.9 helper defect already carried in deferred-work (6.23 round 3 and earlier scope-tx/compensating-audit
  reviews); the story's special completion/showing protection does not repair the house-wide helper. Carry this
  caller into that scope-tx hardening work; do not claim commit confirmation for this POST.

**Verification:** focused existing suites passed **201 tests across 17 files**: admin 42, domain unit/fence/RTBF 46,
contracts 23, live domain/policy/concurrency/RTBF/death-certificate 61, live API discrepancy/peer-console/inspection-console
29. The sandbox initially refused local DB access; the authorized reruns above passed. Full `ci:local` was not rerun.
Three additional UI diagnostics assert the observed CR1–CR3 failures (they are reproductions, not proof of corrected
behavior); source retained at `/private/tmp/twt-627d-review-ui/review.test.tsx`. The temporary repository test file was
removed. CR6 reproduction: `/private/tmp/twt-627d-lock-repro.ts`.

**Invariant verdicts (only touched families):** 1 covered by the window guard/domain window tests; 2 covered by the live
two-connection discrepancy concurrency spec and claim-lock note serialization, with CR6's test-fixture gap above
(⚠ corrected by round 2, R2-8: ⛔ test exercised the note writer's claim-lock serialization until R2-8 added one);
3 REAL GAP (CR1/CR5); 4 covered by construction (existing completion event/payload unchanged); 5 covered by the explicit
0160 policy-regression spec; 6 REAL GAP (CR1), server fields otherwise picked and attribution stored; 8 author attribution
and codes-only audit covered by the API note-rule/R4a tests, with CR7's inherited commit limitation disclosed; 9 deliberate
exceptions recorded in R1–R6/R4a and migration header; 10 closure limits recorded honestly; 11 no member-benefit predicate
introduced; 12 assignment-derived claim scope/composite ownership FKs and wrong-claim policy test cover ownership;
13 REAL GAP (CR4), native labels/handlers and note-save announcement otherwise covered. Family 7 untouched.

**Dismissed (1):** a completion response could differ from a concurrent winning showing after erasure. The report's
only identified divergence depends on the erased-date recomputation exception explicitly accepted by R2/Dev Notes;
no independent non-erasure divergence was established. This review does not reopen that accepted exception.

### Review Patch Validation

BigDev selected **Apply every patch** on 2026-10-14. CR1–CR6 are fixed; CR7 remains deferred.

- **CR1:** completion seeds live in the assignment card, which is replaced on actor, Pariwar, claim or jurisdiction
  changes. Query keys additionally include the actor and a unique opening id; `gcTime: 0` and explicit removal forget
  the read on unmount. No global seed survives sign-out/reopen. Tests cover both sign-out/remount and an actor change
  while mounted, plus the original completion-unmount bridge (still no GET on that transition).
- **CR2:** a withheld or failed read has an explicit **Try again** control. Reopening obtains a fresh read; both
  withholding reasons and recovery are tested without revealing result-dependent content while withheld.
- **CR3:** POST success installs the confirmed submitted note in the current opening's cache before clearing the box.
  A failed follow-up GET keeps that note read-only and displays a refresh failure with retry; the regression proves
  the note remains visible and is not posted twice.
- **CR4:** a stable polite live region announces loading and each found/none/withheld result. Tests verify both
  withholding reasons and the recovered found/none outcomes. Ruled copy is unchanged.
- **CR5:** live HTTP tests supply valid own-tenant positive controls, then deny a cross-Pariwar resource even when
  the actor has conduct grants in both tenants; no-session calls and a tampered session naming a nonexistent
  system/service principal are denied on both new routes. Stored notes/attribution are checked for unintended writes.
- **CR6:** the domain legacy-row helper now shadows the public inspection table with a connection-local temporary
  copy. Only that private copy's CHECK is dropped/re-added to model the historical NULL-source row; the shared table
  and CHECK are untouched. The policy trigger is exercised against that connection's historical parent; the other
  policy legs still use the real FORCE-RLS tables. A live two-connection regression starts with the exact preceding
  ROW EXCLUSIVE lock mode, creates both historical fixtures concurrently, and verifies the private legacy rows plus
  the unchanged public scheduled rows. Existing completion/answer/re-read race tests remain independent and pass.

**Current patch checks:** admin discrepancy tests 17/17; live domain/policy/concurrency/RTBF/death-certificate 62/62;
API discrepancy/peer-console/inspection-console 32/32. Admin, domain and API type checks and targeted lint passed.
Full local CI is running; its result is recorded below when complete. No migration or ratified ruling changed.
⚠ **Correction (code review round 2, R2-9, 2026-10-14):** ⛔ result was ever recorded for that run — the session ended first,
and round 2 found no process still running. The CR1–CR6 tree was therefore never proven by a full `ci:local`; round 2's run
on the final tree is recorded under *Review Patch Validation — Round 2*.

The review's REAL GAP verdicts for families 3/6/13 are now **covered-by-test** by the named CR1, CR5 and CR4 regression
legs above; CR6's concurrency-fixture gap is covered by its two-connection test. CR7's existing commit limitation is
still disclosed, not claimed fixed.

### Review Findings — Round 2 (2026-10-14)

Code review round 2: the full branch `8fcf7826` → working tree (round 1's uncommitted CR1–CR6 fixes included), split into three
chunks reviewed in parallel (server source, admin UI, server tests) by an independent Blind Hunter, Edge Case Hunter and
Acceptance Auditor each, then parent verification. **0 decision-needed, 20 patch, 1 defer, 40 dismissed.** Nothing passes the
Panel-routing gate's §0 (no disclosure, no duty owed, no basis, no conflict between ratified clauses). Round 1's claims
re-checked: CR1–CR5 hold; CR6's deadlock fix holds but its "the trigger is exercised against that connection's historical
parent" claim is NOT proven (R2-5); the promised `ci:local` result was never recorded (R2-9).

- [x] [Review][Patch][MEDIUM][R2-1] Lock-order deadlock between the note POST and the showing writers that take no claim lock
  [packages/domain/src/claim/ground-inspection-persist.ts:1160] — the note writer holds the claim row `FOR UPDATE`
  (`lockClaimCase`, `read.ts:104`), then INSERTs the showing when absent; the re-read GET (`handlers.ts:898`) and the post-commit
  delivery (`:326`) INSERT the showing first, and that statement's FK check (`claim_gi_discrepancy_showings_claim_case_fk`) takes
  `FOR KEY SHARE` on the same claims row (conflicts with `FOR UPDATE`) while the note writer's `ON CONFLICT` waits on the
  uncommitted showing tuple ⇒ 40P01, an unmapped 500 (GET / note POST) or a spurious `check_failed` (delivery). Reachable only
  while the showing is absent (failed or withheld delivery) and a re-read or delivery races a note write on the same assignment.
  Take the claim row `FOR KEY SHARE` before the showing INSERT so every path orders claim → showing; add a two-connection leg.
- [x] [Review][Patch][MEDIUM][R2-2] The note refusals' words are page-wide [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:52]
  — `not_allowed` is the module-wide window code (schedule, certificate, photo, complete, refuse); adding it to the shared
  `WORDED_ERROR_CODES` makes every out-of-window action read *"This claim is no longer open for notes on the visit."* (false
  for a claim not yet in the window; those actions showed the server's message before). Word `not_allowed` /
  `own_ground_visit_pending` / `discrepancy_note_exists` only inside the note box; amend Task 3.2's "to that list".
- [x] [Review][Patch][MEDIUM][R2-3] `crypto.randomUUID()` during render crashes the page outside a secure context
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:689] — the documented trap at `apps/admin/src/api/hooks.ts:552-560`
  (`newIdempotencyKey`); over plain HTTP every completed full-visit card throws. Use `useId()` (only per-mount uniqueness is needed).
- [x] [Review][Patch][MEDIUM][R2-4] Reachable states not announced (invariant family 13(d), REAL GAP)
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:706] — the box's `{live}` region sits at a different child
  position in the editable and read-only branches, so "Note recorded." is announced only by TanStack's `setTimeout` notify order
  (and an empty editable box can flash first); the 409 `discrepancy_note_exists` → "Recorded by {author}" flip is never announced;
  a "Try again" that returns the same withheld result (or fails again) re-announces nothing; a retry after an error announces no
  loading. One stable live region per box outside the branch; announce the author state; re-announce per read.
- [x] [Review][Patch][MEDIUM][R2-5] CR6's temp-shadow legs cannot fail for the right reason (families 5 / 10)
  [packages/domain/tests/integration/claim/_inspection-discrepancy-fixtures.ts:19] — the public row stays `scheduled`, so the
  policy leg's 23000 `NOT_A_FULL_VISIT` (`claim-ground-inspection-discrepancy-policy-regression.spec.ts:198-210`) is the same error
  the public row produces; whether the guard's unqualified lookup (`0160:94/113`) reads the shadow depends on search-path /
  plpgsql plan-cache state. No positive control, no rowCount check on the copy or the UPDATE (an empty shadow hides every
  inspection — vacuous NotFound legs), a second call 42P07s, and the notes guard has no NULL-source leg. Assert both rowCounts,
  refuse a second shadow per transaction, add a same-transaction positive control (a completed + `family_statement` shadow is
  admitted / found), add the notes-guard leg.
- [x] [Review][Patch][MEDIUM][R2-6] The as-of recompute's supersession arm is untested
  [packages/domain/src/claim/inspection-discrepancy.ts:117] — every leg changes `died` → `not_died` after completion; deleting
  `OR superseded_at > asOf` keeps all green, and R2 names `superseded_at` as a clock basis. Add: `not_died` saved before completion,
  changed to `died` after ⇒ the recompute still returns `['has_died']`; record the red-check.
- [x] [Review][Patch][MEDIUM][R2-7] R3 / Task 4.2 / 4.3 `unavailable` mapping has no server test; the staff block never crosses the serializer
  [apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts:591] — nothing re-reads after the GI13 scrub or with an
  undecryptable ciphertext (`displayFamilyDeathDate` / `noteDtoOf`, `handlers.ts:362-396`; the assembler's note decrypt); the R5
  legs call `assemblePeerMesh` in-process, so a non-empty `inspectionDiscrepancies` never passes the `.strict()` response parse
  (AC8's 500 risk). Add an erased / corrupt leg (date and note `unavailable`, never the sentinel, never 500) and one HTTP console request.
- [x] [Review][Patch][MEDIUM][R2-8] Invariant family 2 REAL GAP — the note writer has no live two-connection race
  [packages/domain/tests/integration/claim/ground-inspection-discrepancy-concurrency.spec.ts:227] — round 1's verdict credits
  "claim-lock note serialization" but no test exercises it (the 23505 leg is single-connection behind a Proxy); the two-re-read
  leg has no barrier (`Promise.all`, may serialize); the race legs open transactions without try/finally (a failure leaves the
  claim lock held and hangs cleanup). Add a `waitUntilBlocked` note-vs-note leg (one 201, one `note_exists`), a barrier on the
  re-read race, and rollback-on-failure cleanup.
- [x] [Review][Patch][MEDIUM][R2-9] Closure honesty (family 10) — the patched tree's `ci:local` is promised, never recorded
  [_bmad-output/implementation-artifacts/6-27d-inspector-discrepancy-at-completion.md:638] — and stale record text: the Completion
  Notes still describe the CR1-replaced seed (`staleTime` / `gcTime: Infinity`), the Debug Log's seed and INSERT-guard red-checks
  predate CR1 / CR6, "Recorded readings" still says the domain legacy leg drops 0147's CHECK on the real table, and round 1's
  family-2 credit (R2-8) is overstated. Run `ci:local` (+ the API integration suite) on the final tree and record the result;
  correct each line with a dated note (no silent rewrite).
- [x] [Review][Patch][LOW][R2-10] The "failed showing write" fault never reaches the handler's COMMIT-failure branch
  [apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts:44] — the mock ROLLBACKs and re-BEGINs, so the handler's
  own `COMMIT` (`handlers.ts:342`) succeeds on an empty transaction and the catch at `:343-348` is dead in every test. Make the
  delivery's COMMIT itself fail; assert `shown` with the in-tx keys and the re-read's recompute.
- [x] [Review][Patch][LOW][R2-11] "Show the result" is a no-op, and the completion's result is dropped, while the session has no user id
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:693] — `enabled` needs `viewerId !== null`, so the click sets
  `requested` and nothing happens (family 13(c)); `onCompleted` drops the seed (`:438`). Disable / hide the button until the
  viewer is known.
- [x] [Review][Patch][LOW][R2-12] Note-box continuations outlive the panel and ignore a newly hidden reader
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:808] — a POST settling after unmount calls `saved` /
  `onChanged` → `query.refetch()` on a detached observer (an unrequested GET; the removed key is re-created); a 409
  `own_ground_visit_pending` (the reader became hidden) leaves the cached shown result and other authors' notes on screen.
  Guard continuations with a mounted ref; re-read on that code as on `discrepancy_note_exists`.
- [x] [Review][Patch][LOW][R2-13] Sign-out residue — the CR1 actor-switch test passes on timing; the MutationCache keeps the note text
  [apps/admin/tests/ground-inspection-discrepancy.test.tsx:316] — the second render reuses a QueryClient whose `['session']` still
  names INSPECTOR; `not.toHaveBeenCalled()` holds only because `loadScope()` lets the session refetch land first. The note
  mutation's `variables` (Tier-1) and the completion's `data.discrepancy` stay in the MutationCache for the default 5 min across
  sign-out (no reader found). Make the test deterministic; `gcTime: 0` on both mutations.
- [x] [Review][Patch][LOW][R2-14] Admin assertions that cannot fail
  [apps/admin/tests/ground-inspection-discrepancy.test.tsx:104] — `expectNoNeighbourContent` looks for strings no fixture supplies
  (Task 3.3's "DOM never contains a neighbour name / value / count" is unproven); the CR3 POST mock returns `note` text the real
  client schema strips. Add a client-parse leg injecting neighbour keys (stripped); mock the real 201 shape.
- [x] [Review][Patch][LOW][R2-15] A whitespace-only note permanently fills the once-only slot
  [apps/api/src/modules/claims/claims.ground-inspection.routes.ts:120] — `z.string().min(1)` admits `"   "`; notes are ONE per
  (assignment, question) and append-only, so the real re-told answer can never be recorded (the page blocks it, a direct call
  does not). Refuse a blank note after trim (⛔ still no `.max`); amend AC6's body line.
- [x] [Review][Patch][LOW][R2-16] The contracts' question-key list has no lockstep test
  [packages/contracts/src/claims/verifier-console.ts:267] — a fourth hand list; when row 6-32 makes a key comparable the
  `.strict()` console / `…/peer-answers` parse 500s. Pin it equal to the domain's compared keys in a test that sees both (PM23's form).
- [x] [Review][Patch][LOW][R2-17] The API spec's legacy helper still runs committed DDL on the shared table
  [apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts:666] — ACCESS EXCLUSIVE in a file-parallel suite
  (`pool: 'forks'`; a fresh connection, so ⛔ a lock upgrade / deadlock — a stall and a 10 s `lock_timeout` flake risk), a
  committed NULL-source row on :5433, no rowCount check. Assert the UPDATE's rowCount; record why it must commit (the handler
  reads on another connection) and why it cannot deadlock.
- [x] [Review][Patch][LOW][R2-18] Weak, vacuous or mislabelled server-test assertions
  [packages/domain/tests/integration/claim/ground-inspection-discrepancy.spec.ts:324] — "no showing recorded" asserted after a
  refusal under a rolled-back savepoint (`:324`, `:340`); the 23505 Proxy never counts an interception (`:280-297`); AC7's date
  half swallowed by `.catch(() => undefined)` (`:246`); a rule-table loop with no non-empty guard (`inspection-discrepancy.test.ts:105`);
  the CR5 cross-Pariwar leg checks status only (`api spec:368-369` — `pariwar.not_found` passes too); titles that contradict their
  bodies (`suspicion-refusal-routes.spec.ts:482`, `verifier-console-ground-inspection.spec.ts:218`, `:348`, `api spec:407`).
- [x] [Review][Patch][LOW][R2-19] The policy spec does not pin what it names
  [packages/domain/tests/integration/rls/claim-ground-inspection-discrepancy-policy-regression.spec.ts:367] — the INSERT policies'
  `WITH CHECK` and roles are never exercised or pinned (the trigger refuses first — a `WITH CHECK (true)` passes); the column
  UPDATE grant is not pinned as EXACTLY `note_ciphertext` (`:153-157`); the trigger-binding leg compares names, not `tgtype`
  (`:308-325`).
- [x] [Review][Patch][LOW][R2-20] Comments and spec lines that contradict the code
  [packages/domain/src/claim/ground-inspection-persist.ts:1305] — "the showing's parent guard requires" `completed_at` (it does
  not; the only completion writer sets it); `claims.verifier-console.handlers.ts:242` "notes decrypt in the handler" (the
  assembler); `withheld-note.ts:14` documents `check_failed` as the hide check failing only; AC5 "a failed showing write … the
  response still carries the in-tx result" vs Task 4.1's ordered `check_failed` on a raise (the code follows 4.1 — amend AC5);
  the admin test header's "REAL QueryClient defaults (`refetchOnMount: 'always'`)" and `DiscrepancyPanel`'s "FETCHES on its own
  only for a seeded result".
- [x] [Review][Defer][R2-21] The new routes' path `:claimCaseId` is never checked against the assignment
  [apps/api/src/modules/claims/claims.ground-inspection.routes.ts:281] — deferred, pre-existing: `resolveGroundInspectionAssignment`
  loads by (pariwar, id) for every ground-inspection route; the id is ⛔ never trusted (every read, write, audit and hide uses
  `assignment.claimCaseId`, Task 4.1), so no cross-claim effect — only access logs keyed on the path can name the wrong claim.

**Dismissed (40):** false positives (a double `closeScopeTx` — it never throws; a blank `author_display` — `getDisplayName`
nulls whitespace; staff notes decrypted "under a lock" — the assembler already decrypts names / answers / mobiles there, no
row lock; a tampered-session restore keyed wrong — `admin_sessions.user_id` is a plain column; a fail-closed fault aborting
the completion — the hide check runs in the delivery's own second transaction); by design per the spec (the in-tx comparison
inside the completion — R2; drafts compared — "submitted or not"; ① never reads the family's answer; a GET that writes — AC5;
the GET unaudited — Task 4.2; encrypt before the writer — Trap 9; a required `discrepancy` in the complete-only schema —
Task 4.4; R2's accepted erasure divergence); already recorded (CR7's note POST false success and the completion's own
swallowed COMMIT — 6.27a D1 / scope-tx item; the erasure scrub race and family-member erasure scope — the two items Task 5
appended to); unreachable or noise (another path throwing `OwnGroundVisitPendingError`; a NULL `completed_at`; trigger
23000 / 23514 unmapped — guarded writers never reach them; duplicate showing keys from an unguarded writer; the drizzle
schema lacking CHECKs; a dead rule-table check; fence-regex and contract-test nits; session-late card remount; mock-reset
hygiene; `$`-patterns in a controlled staff display name; focus after button removal; a duplicate region label; "Try again"
on a 403 / `own_visit`; the completion list-refresh recovery (pre-existing 6.26a behaviour); the non-assigned Block Admin
control's status-only body; the HTTP probe pair; the RTBF negative leg; the API spec's retained rows; the API ordering
`toBeLessThanOrEqual`; guard → 404 order (by construction — the identity guard runs before the transaction)).

### Review Patch Validation — Round 2

BigDev selected **Apply every patch** on 2026-10-14. **R2-1 – R2-20 are fixed; R2-21 is deferred** (pre-existing, recorded in
`deferred-work.md`). ⛔ No migration, ⛔ ruling and ⛔ ratified text moved; the spec amendments below are author-side (R2-2, R2-15,
R2-20 — each marked *AMENDED (code review round 2)* in place, the original words kept).
⚠ **Correction (code review round 3, R3-16):** "fixed" is too strong for two of them. **R2-7** is closed with a DISCLOSED
SUBSTITUTE — the in-process assembler plus the block's strict element parse, ⛔ the HTTP console request the finding asked for
(the fixture seeds ⛔ deceased district, which the console route derives). **R2-9**'s own run of `ci:local` on the final tree
was ⛔ green (8 integration failures, recorded below, and run BEFORE three later admin fixes); the final tree's run is round 3's
R3-18. And **R2-15**'s blank refusal is ⛔ constructible as a DB backstop — `note_ciphertext` is Tier-1 ciphertext, so ⛔ CHECK
can see the plaintext; the route's refusal is the only control.

- **R2-1:** `recordInspectionDiscrepancyShowing`'s parent CTE JOINs `claims` and takes `FOR KEY SHARE OF c`, so every showing writer
  (the delivery, the re-read's recompute, the note writer) locks the claim BEFORE inserting the showing. `persisted` is unchanged
  (`EXISTS (parent)`). New own-committing leg *"R2-1 — a note writer holding the claim lock and a re-read recording the ABSENT
  showing …"*; red-check (drop `FOR KEY SHARE OF c`) ⇒ `40P01 deadlock detected` in the showing's FK check on `claims` — the exact
  cycle the reviewers predicted.
- **R2-2:** the page-wide `WORDED_ERROR_CODES` is back to its six 6.26a codes; the three note refusals are worded by
  `NOTE_WORDED_ERROR_CODES` / `noteErrorText` (keys `gi.discrepancy.error.*`) in the note box only. Test: a Refuse action's 409
  `not_allowed` keeps the server's words. Red-checked.
- **R2-3:** the per-opening id is `useId()` (⛔ `crypto.randomUUID`). Test with `randomUUID` stubbed to throw. Red-checked.
- **R2-4:** one stable polite region per note box outside the editable / read-only switch; the confirmed note renders read-only at
  once; the 409 author state is announced; a retry announces its loading and its result again (alerts keyed on `errorUpdateCount`).
  Tests assert the SAME region node before / after. Red-checked (five reverts).
- **R2-5:** the temp-shadow fixture asserts ONE row copied and ONE rewritten, refuses a second shadow per transaction, and runs
  `DISCARD PLANS` (a plpgsql plan cached before the shadow would keep reading the public row). Every shadow leg now has a
  same-transaction POSITIVE CONTROL (`shadowAsCompletedFullVisit` — the same guard ADMITS, the same domain read FINDS); the notes
  guard gained its NULL-source leg.
- **R2-6:** the as-of supersession arm has its leg (*"AC5 / R2 — answers that DIFFERED at completion and changed AFTER it …"*);
  red-check (delete `OR superseded_at > asOf`) ⇒ that leg alone red — nothing caught it before.
- **R2-7:** an ERASED (the house sentinel, encrypted as GI13 writes it) and an UNDECRYPTABLE family date and note read
  `{ status: 'unavailable' }` on the re-read and in the staff block — ⛔ the sentinel text, ⛔ a 500 — and the block passes its strict
  element schema. ⚠ Recorded: the console is reached through the in-process assembler, ⛔ HTTP (the fixture seeds ⛔ deceased
  district, which the console route derives); the block's strict parse stands in for the serializer's. Red-checked (the note's
  sentinel mapping removed).
- **R2-8:** two new two-connection legs — note vs note on ONE question (the second waits on the claim row, then the pre-check
  refuses it: ONE note) and the R2-1 leg; the two-re-reads leg now has a real barrier (B waits on A's uncommitted showing); every
  opened transaction is rolled back after a failing test. ⚠ Round 1's family-2 credit is corrected in place (R2-9).
- **R2-9:** the dated corrections in place (round 1's promised CI result, its family-2 verdict, the Debug Log's seed and
  INSERT-guard red-checks, the Completion Notes' seed mechanism, the Recorded readings' legacy fixture). This round's CI below.
- **R2-10:** a scope-tx fault makes the delivery's OWN COMMIT throw after `persisted = true`; the completion answers `shown` with
  the in-tx keys, records ⛔ showing, and the re-read recomputes the same keys. Red-checked (that branch answering `check_failed`).
  The older fault is retitled *"a showing write LOST without an error"* (what it simulates).
- **R2-11 / R2-12 / R2-13:** "Show the result" is disabled until the viewer is known; note continuations are guarded by a mounted
  ref; a 409 `own_ground_visit_pending` re-reads (the cached result gives way to the withheld shape); the viewer is LATCHED from
  the first SUCCESSFUL session fetch after mount, and the cards re-key only when one known viewer gives way to another; `gcTime: 0`
  on the completion and note mutations; the CR1 actor-switch test is deterministic (the new session's fetch held open).
- **R2-14:** a client-parse leg proves neighbour keys injected into the completion, re-read and note-write responses are STRIPPED;
  the CR3 mock returns the real 201 shape. ⚠ The page-level `expectNoNeighbourContent` was ⛔ red-checked (it would need code that
  renders unknown keys); the client-parse leg is the proof.
- **R2-15:** a blank note is refused (400, stored as typed otherwise); the leg proves ⛔ row is written. Red-checked.
- **R2-16:** `peer-answers-stitch.test.ts` pins the contracts' key list to the domain's compared keys and schema constant.
- **R2-17:** the API legacy helper asserts its one-row UPDATE and records why it must commit shared DDL (another connection reads
  it) and why it cannot deadlock (a fresh connection — ⛔ lock upgrade).
- **R2-18:** step 2 / step 3's "⛔ showing recorded" run WITHOUT a rolled-back savepoint — red-check (the hidden check moved after
  the recompute, refusals still identical) ⇒ step 3 red; the 23505 leg counts ONE blinded pre-check and ONE insert; AC7's date half
  is awaited (on a second neighbour — `not_died` supersedes the same neighbour's date); the rule-table loop must run; the CR5
  cross-Pariwar leg asserts `ground_inspection.not_found` after a positive control proving the grant in the other tenant is live;
  four titles corrected.
- **R2-19:** the policy spec pins every policy's role, PERMISSIVE and ONE scope expression (USING / WITH CHECK); a leg proves the
  INSERT `WITH CHECK` is LIVE (a shadow lets the guard see another tenant's parent ⇒ 42501, and the same row is admitted in its own
  scope); the column-UPDATE grant set is EXACTLY `note_ciphertext`; the trigger bindings pin `tgtype` (7 / 11 / 19 / 34).
- **R2-20:** the comments corrected (`completed_at`, "decrypt in the assembler", `check_failed`'s 6.27d use); AC5 amended to Task 4.1.

**Fix-diff review** ([[feedback_review_the_fix_diff_before_commit]]): ONE fresh read-only reviewer over the round-2 patch diff
alone (1604 lines): ⛔ high / medium. Three LOW, all applied: the viewer derived from `isFetchedAfterMount` alone also counted a
FAILED refetch (stale actor) — now latched on a successful one; re-keying cards on `viewerId` remounted every card once per page
mount (dropping an in-progress completion and a just-seeded result) — now an `epoch` that changes only between two KNOWN viewers;
alerts keyed on `errorUpdatedAt` (ms) — now `errorUpdateCount`. Two new tests, each red-checked. The reviewer verified R2-1's lock
order against every other `claims` writer, the scope-tx mock, the `.refine` and the fixture as sound.

**Verification (final tree):** domain live — discrepancy 18/18, concurrency 8/8, policy 20/20, RTBF 2/2 (incl. the new legs); domain unit
(discrepancy / fence / rtbf) 46/46; API discrepancy spec 20/20 + stitch 9/9; admin 1159/1159 (71 files), admin / API / domain
typecheck and the changed files' eslint clean. **`pnpm ci:local` (shared :5433 `twt_dev`, run BEFORE the three fix-diff-review
admin fixes, which were then re-proven by the admin suite, typecheck and lint):** every job green but `integration-tests` —
domain 5143 passed / 8 failed: 7 in `reconciliation/review-queue-read.spec.ts` (the known shared-`PARIWAR_A` accumulation, #15 —
the same 7 the dev run saw) and 1 in `multi-tenant/cross-pariwar-leak.spec.ts` (`runAsCrossTenant`, a 5000 ms timeout under the
full suite's load — 19/19 when re-run alone; ⛔ 6.27d file touches either). **The API integration suite on its own:** 108 / 108
files, 1311 / 1311 tests.

The round-2 REAL GAP verdicts close: family 2 (R2-1, R2-8), family 5 (R2-5, R2-19), family 10 (R2-9), family 13(c)/(d) (R2-4,
R2-11) — each now covered-by-test by the legs named above. ⚠ (Round 3, R3-16: family 10 — closure honesty — is a property of the
RECORD, ⛔ of a test; round 3 found it still open (R3-1, R3-16). And R2-8's note-vs-note leg could ⛔ tell the claim lock from the
other serializers until round 3's R3-7.)

### Review Findings — Round 3 (2026-10-14)

Code review round 3: the round-2 patch alone (the round-1 state → the working tree, 1665 lines, 17 files), an independent Blind
Hunter, Edge Case Hunter and Acceptance Auditor in parallel, then parent verification. **0 decision-needed, 18 patch, 1 defer,
10 dismissed.** ⛔ Panel question — the auditor checked the three round-2 amendments against the ratified text (CF2 as put,
`-305` §2 item 3): each MATCHES; none widens a disclosure. R2-1's lock order re-verified against every other `claims` writer.

- [x] [Review][Patch][MEDIUM][R3-1] Tasks 3.1 / 3.2 still order the seed design and the viewer source that CR1 and R2-13 replaced
  [_bmad-output/implementation-artifacts/6-27d-inspector-discrepancy-at-completion.md:392] — Task 3.1 still prescribes the
  actor-blind `qc.setQueryData([...,'discrepancy', id], …)` seed with `staleTime: Infinity` (the cache CR1 found leaking) and
  `useSession().data?.userId` as the viewer; Task 3.2 still refetches `[…,'discrepancy', id]`. Only the Completion Notes carry the
  correction ([[feedback_spec_edits_must_propagate_to_tasks]]). Mark both AMENDED in place.
- [x] [Review][Patch][LOW][R3-2] The panel's query key carries `viewerId`: the viewer becoming known drops what the opening fetched
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:712] — cards re-key on `viewer.epoch` (unknown → known keeps
  the card), but the panel's key changes, so a retried result or a note saved while the viewer was unknown falls back to the seed
  with ⛔ refetch. The opening's `useId` + the epoch re-key already isolate actors — drop `viewerId` from the key.
- [x] [Review][Patch][LOW][R3-3] A confirmed note outlives a successful re-read that does not carry it
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:908] — `props.existing ?? confirmed` keeps "Recorded" for the
  opening's life when the re-read has ⛔ note for that key (CR7's swallowed COMMIT — a 201 for a note never stored); before R2-4 the
  refetch restored the editable box. Keep `confirmed` only until a re-read SUCCEEDS after the save.
- [x] [Review][Patch][LOW][R3-4] A reader newly hidden (409 `own_ground_visit_pending`) still sees the cached result if the re-read fails
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:902] — install the withheld shape locally (uniform
  withholding), then re-read.
- [x] [Review][Patch][LOW][R3-5] A 409 `discrepancy_note_exists` whose note is ALREADY on screen is never announced
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:873] — the effect keys on an unchanged `existing` (structural
  sharing), so the author state is ⛔ announced and the flag stays set. Announce at once when the note is already there.
- [x] [Review][Patch][LOW][R3-6] `gcTime: 0` on a mutation spins a 0 ms timer while it is pending and unobserved
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:617] — query-core `Mutation.optionalRemove` re-arms
  `scheduleGc` while `pending` (verified in `@tanstack/query-core` `build/modern/mutation.js:72-80`). A short positive `gcTime`.
- [x] [Review][Patch][LOW][R3-7] The note-vs-note race leg cannot tell the claim lock from the other serializers
  [packages/domain/tests/integration/claim/ground-inspection-discrepancy-concurrency.spec.ts:315] — with the claim `FOR UPDATE`
  removed, the second writer still blocks (on the first's showing or note tuple) and the 23505 mapping yields the same error.
  Pre-record the showing, assert the blocked statement IS the claim lock, and that the second writer issues ⛔ note INSERT.
- [x] [Review][Patch][LOW][R3-8] The failed-session-fetch admin leg asserts before the session has failed
  [apps/admin/tests/ground-inspection-discrepancy.test.tsx:586] — wait for the session query's `error` state first.
- [x] [Review][Patch][LOW][R3-9] A "Try again" that FAILS re-announces the old result as if fresh
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:743] — after a failed retry the polite region returns to the
  unchanged words beside the failure alert. Announce the result again only after a SUCCESSFUL read.
- [x] [Review][Patch][LOW][R3-10] An invisible note (zero-width / format characters only) passes the blank refusal
  [apps/api/src/modules/claims/claims.ground-inspection.routes.ts:122] — `trim()` keeps U+200B / U+2060 / U+FEFF …; the
  once-only slot is lost the same way. Refuse a note with ⛔ visible character (server + the page's Save).
- [x] [Review][Patch][LOW][R3-11] The fourth `MAX_READS` pin's title still says 26
  [apps/api/tests/integration/claims/verifier-console.spec.ts:1177] — R2-18 corrected three; Task 4.3 names four.
- [x] [Review][Patch][LOW][R3-12] The admin client's own key list is not pinned
  [apps/admin/src/api/client.ts:1280] — R2-16 pinned contracts ↔ domain; the admin's `INSPECTION_DISCREPANCY_KEYS` would fail
  the completion parse after the completion committed. Pin it to the contracts (the `GROUND_INSPECTION_OTHER_CLAIM_STAGES` precedent).
- [x] [Review][Patch][LOW][R3-13] A failed session fetch leaves the page silently degraded
  [apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:86] — every "Show the result" disabled with ⛔ reason, the
  inspector's own card never fetches, and their own note reads "Recorded by {their name}". Say why, with a way to retry.
- [x] [Review][Patch][LOW][R3-14] The API legacy helper's doc misstates its lock
  [apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts:771] — ACCESS EXCLUSIVE is held from the DROP to the
  COMMIT (⛔ "one UPDATE"), and `lock_timeout` bounds only its own wait, ⛔ the files queued behind it.
- [x] [Review][Patch][LOW][R3-15] `withheld-note.ts`'s `check_failed` line omits that the assigned inspector gets `own_visit` first
  [packages/contracts/src/claims/withheld-note.ts:15] — on a swallowed completion COMMIT their own still-scheduled visit hides them.
- [x] [Review][Patch][LOW][R3-16] Round 2's closure language overstates
  [_bmad-output/implementation-artifacts/6-27d-inspector-discrepancy-at-completion.md:789] — "R2-1 – R2-20 are fixed" collapses
  R2-7 (closed with a disclosed substitute — ⛔ HTTP) and R2-9 (the final tree's `ci:local` was ⛔ shown green); family 10 is a
  record property, ⛔ "covered-by-test"; R2-15's blank rule is not constructible at the DB (Tier-1 ciphertext) and the record does
  ⛔ say so ([[feedback_closure_language_precision]]).
- [x] [Review][Patch][LOW][R3-17] A failing race leg's in-flight call outlives its rollback
  [packages/domain/tests/integration/claim/ground-inspection-discrepancy-concurrency.spec.ts:92] — `afterEach` rolls back while a
  blocked multi-statement domain call is still running; its later statements run after ROLLBACK on a released client. Track the
  in-flight call; roll back the lock holders, settle the calls, then the rest.
- [x] [Review][Patch][LOW][R3-18] Run `ci:local` on the FINAL tree and record it
  [_bmad-output/implementation-artifacts/6-27d-inspector-discrepancy-at-completion.md:854] — round 2's run preceded three admin
  fixes; this round's fixes need the same proof.
- [x] [Review][Defer][R3-19] The parent-guard triggers resolve their parent table by SEARCH PATH
  [packages/domain/migrations/0160_ground-inspection-discrepancy.sql:94] — deferred, pre-existing house pattern: ⛔ of the 39
  trigger functions in the migrations pins `search_path` or schema-qualifies; `twt_app` holds TEMP, so a session able to run
  arbitrary SQL could shadow the parent with a temp table (RLS still binds the tenant — the 42501 leg). A house-wide hardening
  pass, and the 6.27d temp-shadow fixtures would then need another way to seed a legacy row.

**Dismissed (10):** R2-10 answering `shown` on a failed delivery COMMIT (Task 4.1 orders exactly that — the completion is known
saved; the re-read and the note writer recompute the same keys); the viewer latch "keeping the previous actor after sign-out"
(sign-out navigates to `/login` — the page unmounts; a re-login mounts a fresh latch); the notes' erasure arm admitting any
ciphertext (0149's recorded limit, in the migration header and the policy spec); `FOR KEY SHARE` on the read path (short waits;
`claims`' policy is `FOR ALL` with the same scope — verified twice); the two-re-reads leg "unable to tell the winner" (it compares
`shownAt` — the winner's row); the read-only-at-once test's scheduler timing (red-checked by the fork); the `completedAt` cast
(the one writer sets it; recorded); a 409 hiding the typed text (Task 3.2's ruled behaviour — the slot is once-only); the
lockstep test's file; a non-English catalogue (the module is English constants; i18n parity passed).

### Review Patch Validation — Round 3

BigDev selected **Apply every patch** on 2026-10-14. **R3-1 – R3-18 are applied** (R3-13 by REMOVAL — see below); R3-19 is
deferred (pre-existing, in `deferred-work.md`). ⛔ No migration, ⛔ ruling and ⛔ ratified text moved; the only spec edits are the
Task 3.1 / 3.2 AMENDED markers (R3-1) and the dated round-2 corrections (R3-16), each beside the words it corrects.

- **Domain / API / contracts:** R3-7 — the note-vs-note leg records the showing first, asserts the second writer's BLOCKED
  statement is the claim `FOR UPDATE`, and counts ⛔ note INSERT from it; red-check (drop `lockClaimCase`'s `FOR UPDATE`) ⇒ the
  second writer blocks in its note INSERT instead — red. R3-17 — transactions track their in-flight call; `afterEach` rolls back
  the lock holders, settles the calls, then the rest (exercised by that very red-check — ⛔ hang). R3-10 — the server refuses a
  note with ⛔ visible character (`/[^\p{White_Space}\p{Default_Ignorable_Code_Point}\u2800]/u`, the page uses the same);
  red-check (the old `trim()` rule, then the first-draft `\p{Cf}` rule) ⇒ a zero-width-only and a variation-selector-only note
  were each answered 201. R3-11 / R3-14 / R3-15 — the title and the two comments.
- **Admin** (a fork, then the fix-diff review's corrections): R3-2 the panel's key drops `viewerId` (the per-opening `useId` and
  the cards' epoch re-key isolate actors); R3-3 a confirmed note gives way only when a SUCCESSFUL re-read AFTER the save lacks it —
  on any such read, ⛔ only the first — and its reason clears once a note for that question arrives; R3-4 a newly hidden reader's
  panel installs the withheld shape before re-reading; R3-5 a 409 whose note is already on screen announces its author at once;
  R3-6 `gcTime: 1000` on the two mutations (⛔ a 0 ms re-arming timer); R3-8 the failed-session leg waits for the `error` state;
  R3-9 a failed "Try again" says ⛔ the old result again, and the flag resets only when the RESULT changes (⛔ on a note save's cache
  write); R3-12 the admin client's key list is exported and pinned to the contracts'. Every new leg red-checked.
- **R3-13 — closed by REMOVAL (⚠ recorded honestly):** the round-3 fork added a page status line + session retry for a FAILED
  session fetch; the fix-diff review showed `GroundInspectionRoute` already sends a failed session to sign-in, so that state never
  renders the page — the line and its two story-minted keys are removed. The reachable residual is the mount's session fetch IN
  FLIGHT (milliseconds): "Show the result" is disabled and the inspector's own card waits. ⚠ The fork's neutral "Recorded" while
  the viewer is unknown is REVERTED: it passed another author's note off as the viewer's (R4a) — every note names its author unless
  it is the KNOWN viewer's own, read through a ref so a 409's announcement sees the current viewer.

**Fix-diff review** (one fresh read-only reviewer over the round-3 patch alone, 778 lines): ⛔ high; two MEDIUM (the neutral
"Recorded" — R4a; the unreachable R3-13 status) and three LOW (R3-9's reset on any cache write; R3-3 checking only the first
re-read and never clearing its reason; `\p{Cf}` missing default-ignorable code points and refusing a few visible signs) — all
five applied above, each with a red-checked test (the R3-3 "reason clears" leg was first written so a new save cleared it on its
own; rewritten to bring the note in through ANOTHER box's refresh, then red). It verified R3-2's actor isolation, R3-4, R3-5,
R3-7's statement text and Proxy, R3-17 (⛔ deadlock or hang) and the two predicates' identity as sound.

**Verification (final tree):** admin 1170 / 1170 (71 files); admin / API / domain typecheck and the changed files' eslint clean
(eslint's own exit code); API discrepancy spec 20 / 20; domain concurrency 8 / 8. **`pnpm ci:local` on the FINAL tree (shared
:5433 `twt_dev`): 35 jobs green; `integration-tests` red ONLY on the 7 known `reconciliation/review-queue-read.spec.ts` failures
(#15 — the shared-`PARIWAR_A` accumulation, the same 7 the dev run saw); domain 5144 passed / 7 failed.** (`cross-pariwar-leak`
passed this run; its two earlier timeouts were its full read of `events_log` — 579,720 rows / 320 MB on :5433, ⛔ row of it
6.27d's — under load.) ⚠ Innocence of #15 is by identity with the dev run's failures, ⛔ by a scratch-DB run this round. **The API
integration suite on its own: 108 / 108 files, 1311 / 1311.**

## Dev Notes

- **Traps** (6.27a's list applies; re-read Traps 1, 5, 9, 12 there):
  - **1** — ⛔ never a neighbour's content toward the family: the SCREEN WORDS are the control (open-ended, ⛔ never who / what).
  - **5** — ⛔ never merge the discrepancy UI into OP14's *"Other claims for this death"* section.
  - **9** — ⛔ no KMS under a lock (the note handler encrypts FIRST; the comparison never decrypts).
  - **12** — `clock_timestamp()` for `shown_at` / `noted_at`, ⛔ never `now()`.
  - ⚠ v3.0 correction: v2.x cited *"Trap 13 (⛔ never lock answers from the inspection path)"* — 6.27a's Trap 13 is the lock ORDER
    (claim → ping → reply). The rule this story needs is Task 2.4's: completion READS answers under the claim lock it already holds; ⛔ never `FOR UPDATE` on an answer.
- ⚠ **The completed inspection row is ⛔ NOT frozen in the database** (no trigger; table-wide UPDATE grant `0055:82`; policy `FOR ALL`
  `0055:98`; 0149 records it deferred). "Never changed" is a property of 6.27d's WRITERS (they never UPDATE it) — asserted by AC6's
  `to_jsonb` test, ⛔ not by a constraint. That is why the showing and notes are SEPARATE tables (PM25).
- ⚠ **`completeGroundInspection` takes `lockActiveAssignment` (requires `scheduled`)** — a retried completion throws 409
  `ground_inspection.not_active` and NEVER reaches the post-commit code; hence the re-read GET is the only recovery path.
- ⚠ **The admin silently drops new response keys today** (`GroundInspectionWriteResponse` is a non-strict `z.object`); the API route has
  ⛔ no response schema (`claims.ground-inspection.routes.ts:245-252`) and there is ⛔ no ground-inspection contracts module — the admin
  client schema IS the contract for these routes (don't invent a contracts module for two fields — [[feedback_no_premature_package]]).
- ⚠ **Live answers are read submitted OR not** (as `peerReplyColumnsSql`) — PM25 says *"SAVED by then"*. ⛔ Never filter on `submitted_at`.
- ⚠ **Inspection stages are `initial` / `corroboration` / `additional_evidence` / `certificate_check`** (`claim_ground_inspections.ts:60`)
  — there is ⛔ no `full`; "FULL visit" = any stage but `certificate_check`.
- ⚠ **`has_died` codes** `['died','not_died','not_sure','did_not_know']` (`keys.ts:47`); a date answer of `unknown` carries ⛔ no ciphertext
  and ⛔ no indexes (`keys.ts:50-51`); the 3-element window is CHECKed `cardinality = 3` (`0156:174`).
- ⚠ **The family's `death_date_index` is ONE keyed index of D** (`claim_ground_inspections.ts:234-236`), the neighbour's is {D−1, D, D+1}
  under the SAME field class (`DEATH_DATE_INDEX_FIELD_CLASS`, `encryption/field-classes.ts:91`; ONE helper `deathDateBlindIndex`,
  `ground-inspection-crypto.ts:63`) ⇒ ② is set membership. Erasure NULLs the family index (GI13) ⇒ a later as-of recompute finds ⛔ no
  difference on ② — acceptable (the recorded showing is the normal path; the recompute is for a lost write).
- **Withholding** ([[feedback_withholding_must_be_uniform]]): one rule per reader per surface — the inspector's screen never varies in
  shape with the neighbours; a hidden reader sees the whole neighbours' section absent (R5) and a withheld re-read (R4), never a partial.
- **Who can be an inspector:** `inspectorActorId` is a free actor id in the schedule body (`z.string().min(1)`; `-327` / 6.27b BF21) — a
  District Admin, Block Admin, Pariwar Admin or the Super Admin can be one. ⛔ Never assume a role.
- **Previous stories:** 6.26a (completion, GI1–GI13, the lock order, NOT VALID re-check on UPDATE — #37), 6.26b (index comparisons, `null`
  ⛔ never `false`, ordering tests in separate txns), 6.27a (the answers, the hide, migration discipline, erasure arms, fences), 6.27b (the
  ONE hide predicate, BD4, the notes withholding + `<WithheldNote>`, `underSavepoint` for console READS only — `apps/api/src/modules/claims/later-approval-warnings.ts:181`).

### Project Structure Notes

- Migrations `packages/domain/migrations/NNNN_slug.sql` + `meta/_journal.json`; schema `packages/domain/src/schema/*.ts`; policies
  `packages/domain/src/policies/*-rls.ts` + `index.ts`; domain tests `packages/domain/tests/integration/{claim,rls}/*.spec.ts`.
- API `apps/api/src/modules/claims/claims.ground-inspection.{routes,handlers}.ts`, assembler `peer-answers-assembler.ts`; audit types
  `apps/api/src/audit/audit-sink.ts`; tests `apps/api/tests/integration/claims/`, fixture `apps/api/tests/integration/_peer-reply-fixture.ts`.
- Contracts `packages/contracts/src/claims/verifier-console.ts`; admin `apps/admin/src/modules/ground-inspection/`, `apps/admin/src/api/{client,hooks}.ts`,
  `apps/admin/src/modules/**/PeerMeshView.tsx` / `NeighboursAnswersPanel.tsx`; tests `apps/admin/tests/`.
- ⛔ Prettier is not enforced — hand-format; never `prettier --write` an existing file ([[project_prettier_not_enforced]]).

### Testing commands

- All: `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' pnpm ci:local`.
- Domain live: `cd packages/domain && DATABASE_URL=… pnpm exec vitest run tests/integration/claim/ground-inspection-discrepancy.spec.ts`.
- API live: `cd apps/api && env $(grep -v '^#' .env | xargs) pnpm exec vitest run tests/integration/claims/ground-inspection-discrepancy.spec.ts`.
- Contracts: `cd packages/contracts && npx vitest run`; admin: `pnpm --filter @twt/admin test` + `typecheck`.
- Known reds NOT caused by this story ([[project_known_livedb_test_failures]]): `reconciliation/review-queue-read.spec.ts` (shared
  `PARIWAR_A`), load / pool timeouts — prove innocence on a scratch DB, never by loosening.

### References

- 6.27a: PM25 (`6-27-…md:754-790`), PM17 (`:666-672`), Invariant 7 (`:253-259`), F37 (`:398-404`), F35, F40, F41, Traps (`:1217-1256`).
- 6.27b: BD4 (`6-27b-…md:364-390`), AC7 (`:441-475`), Policy-meaning P3 (`:125`), X1 A / Y3 (notes withholding — `hidden-reader-notes.ts`),
  routing note 2026-10-14 (Y2 — WRITTEN, ⛔ not sent; it concerns the pre-visit briefing and a Super Admin's direction to a hidden reader,
  ⛔ not this story's screens, showing or notes).
- `.decision-log.md`: `-304` Q3 / Q4 / Q6, `-305` §2 item 3, `-310` CF2 / CF4, `-311`, `-327`. Highest id at `8fcf7826`: `2026-10-13-329`.
- `epics.md` Story 6.27d (`:3232-3245`) — consistent with this file.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5[1m]`) — `bmad-dev-story 6.27d`, 2026-10-14.

### Debug Log References

- **Task order:** Task 4 (API, client) ran before Task 3 (the page) — the page consumes 4.4's client calls and the wire shape;
  ⛔ behaviour difference. Task 0: `git diff --name-only 8fcf7826..HEAD -- packages apps scripts infra` empty; the two `6.27d`
  doc-block notes found; `claim.override_ground_inspection` still held only by `pariwar_admin` (`roles.ts:352`) + `super_admin`.
- **Found while iterating on the scratch DB (`twt_scratch_627d`, :5433):** (1) Postgres TRUNCATES identifiers over 63 bytes —
  `claim_ground_inspection_discrepancy_showings_tenant_isolation_insert` became `…_tenant_isolation_i`. ⇒ every DERIVED name
  (constraints, policies, indexes, triggers, functions) uses the prefix `claim_gi_discrepancy_{showings,notes}_*`; the TABLE
  names are the story's. (2) plpgsql resolves `NEW.question_key` at plan time even behind a `TG_TABLE_NAME` guard ⇒ the
  parent guard is ONE function per table (`claim_gi_discrepancy_{showings,notes}_guard`).
- **Red-checks (each restored and re-run green):**
  - the SHARED predicate (`peerAnswerDiffers`: `!window.includes(ref)` → `includes`) ⇒ 7 tests red across BOTH
    `approval-warnings.test.ts` (6.27b) and `inspection-discrepancy.test.ts` (6.27d);
  - R2's clock basis (`completedAt: sql\`clock_timestamp()\`` → `now()`) ⇒ the own-committing leg *"a writer that committed
    AFTER the completion's transaction began but BEFORE it took the lock: IN both"* red — the as-of recompute diverged;
  - the ordering comparator (`completed_at < shown_at` → `>`) ⇒ the AC5 ordering leg red (the steps really are separate
    committed transactions);
  - the scrub's `WHERE` (`isNotNull(note_ciphertext)` removed) ⇒ the rtbf unit leg red;
  - the AC2 order (the hidden check moved AFTER the showing check in `recordInspectionDiscrepancyNote`) ⇒ the API probe test
    AND the domain step-3 leg red (the `death_date` probe answered `discrepancy_not_shown` — the leak AC2 forbids);
  - the INSERT guard (`status = 'completed'` + `death_date_source = 'family_statement'` dropped from the showing write's
    parent CTE) ⇒ 3 domain legs red (a `certificate_check`, a pre-0147 NULL-source parent and a scheduled parent all
    reported `persisted` — the trigger backstop then raised); ⚠ (round 2, R2-9) recorded BEFORE round 1's CR6 moved the
    NULL-source legs onto a connection-local temp shadow — round 2 (R2-5) added the positive controls that now prove those
    legs read the shadow;
  - the medical fence's teeth are IN the test (a positive control on `medical/disclosure-read.ts` and an import specimen);
  - the admin seed (`qc.setQueryDefaults(…)` removed) ⇒ the SEEDS test red: under the app's `gcTime: 0` /
    `refetchOnMount: 'always'` defaults a seed without them is lost or refetched. ⚠ (round 2, R2-9) superseded: round 1's
    CR1 replaced that mechanism (the seed is the card's state + `initialData`, `gcTime: 0`) — this red-check no longer
    names live code.
- **`ci:local` on the SHARED :5433 `twt_dev`:** every job green but `integration-tests` — 7 failures, ALL in
  `reconciliation/review-queue-read.spec.ts` (Story 9.8), domain 5138 passed / 7 failed; the run stopped before the API
  integration suite. The known shared-`PARIWAR_A` accumulation class (known-failures #15): 539 live alerts under the fixed
  tenant, past the read's 500-cycle bound; ⛔ 6.27d file touches reconciliation or alerts. Re-run on a scratch database
  (`twt_ci_627d`, BigDev's choice) — below.
- **`ci:local` on the scratch database `twt_ci_627d` (:5433, migrated from zero):** every job green but `integration-tests`,
  whose ONE failure is the Story 10.23 gate refusing any database ⛔ named `twt_dev`
  (`restoration-discipline-production-path-live.test.ts` — known-failures note; `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS` is ⛔ passed
  through turbo). Domain 360 / 360 files (5145 passed, `review-queue-read.spec.ts` included); admin 1142; channels, events,
  niyamavali-engine, queue, validity-service all green. Then, on the same scratch DB: the gated spec run directly with the
  override — 3 / 3; the API integration suite on its own — 108 / 108 files, 1306 tests (the new spec 15 / 15). Both scratch
  databases (`twt_ci_627d`, `twt_scratch_627d`) dropped afterwards.

### Completion Notes List
- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
- 2026-10-14 — v3.0 re-authored by `bmad-create-story 6.27d` against `8fcf7826`. ⛔ No code.
- 2026-10-14 — v3.1 `bmad-create-story validate 6.27d` (four read-only verifiers; ⛔ no code). BigDev's author answers: R1 NARROWS `-311`
  PM25 (a) ① (confirmed); R4a — the notes keep R4's writer and are returned WITH their author; the dual-role CF2 case (Recorded
  observation) — ⭐ PROPOSED to BigDev as a possible Panel question (two ratified CF2 rows meeting in one person); BigDev: recorded,
  ⛔ not routed now. If it is ever routed, it goes from the routing-note template, committed alone before any code.
- 2026-10-14 — **`bmad-dev-story 6.27d` — implemented (all eight tasks).** ⛔ No ruling moved; ⛔ no decision-log entry (AC1).
  - **Migration 0160** (hand-authored, journal idx 160): the inspection's ownership UNIQUE; `…_discrepancy_showings` (PK
    `ground_inspection_id` — the story's `UNIQUE (ground_inspection_id)`; `question_keys` CHECKed `<@ {has_died, death_date}`;
    `shown_at clock_timestamp()`; SELECT + INSERT only) and `…_discrepancy_notes` (Tier-1 `note_ciphertext`, `author_actor_id`
    + `author_display` with the btrim CHECK, `UNIQUE (ground_inspection_id, question_key)`, a column UPDATE grant for the
    scrub); both with composite FKs `ON DELETE CASCADE` to the inspection AND the claim; the parent guard (completed +
    `family_statement`; a note's key IN the showing), the showings' no-update / cascade-only delete / no-truncate, the notes'
    0143-form erasure arm — every refusal 23000; per-command RLS (⛔ DELETE, ⛔ `FOR ALL`). Applied to :5432 AND :5433;
    proven from zero on a scratch DB.
  - **Domain:** `claim/inspection-discrepancy.ts` (the rule table over `COMPARABLE_QUESTION_KEYS`, the DERIVED compared keys,
    THE ONE per-answer predicate `peerAnswerDiffers` — now also behind 6.27b's `derivePeerReplyWarningKeys` — and ONE answers
    fragment for the live and the as-of read; a leaf, ⛔ ciphertext). In `ground-inspection-persist.ts` (beside
    `lockClaimInWindow`): the comparison INSIDE `completeGroundInspection` (`discrepancy: { questionKeys } | null` — `null`
    unless `family_statement`), `readInspectionDiscrepancyTarget` (the neutral 404), `recordInspectionDiscrepancyShowing`
    (ONE statement that also reports `persisted`), `readOrRecomputeInspectionDiscrepancy` (as of `completed_at` by an SQL
    reference — ⛔ a JS Date, µs), `recordInspectionDiscrepancyNote` (AC6's six steps; the hidden refusal BEFORE the showing),
    the note / claim-level reads. Two typed errors; `OwnGroundVisitPendingError`'s doc widened. The anonymizer scrubs the
    notes inside GI13's block with the block's `inspectionSentinel`.
  - **API:** the completion delivers the in-tx result in a SECOND scope transaction after its own closed — the hidden check,
    then the guarded showing write; `persisted = false`, a raise, or any failure before the check ⇒ `withheld/check_failed`;
    ONLY a failed closing COMMIT is logged ids-only and still answers `shown` (it commits itself to log that). `GET …/discrepancy`
    (guard → 404 → hidden check (fail closed) → recorded-or-recomputed showing + ALL notes with their author; its own
    transaction closed BEFORE any decrypt) and `POST …/discrepancy-notes` (guard → display name → encrypt → the writer →
    audit `admin_ground_inspection.discrepancy_note_recorded`, codes only). The staff view: two per-claim reads inside
    `assemblePeerSection` after its hide; `PeerMeshTranscript.inspectionDiscrepancies` REQUIRED; `VERIFIER_CONSOLE_MAX_READS`
    27 → 29 (+ ledger, four pins); the section's exact-read pins in `peer-answers-console.spec.ts` 6 → 8 and 5 → 7.
  - **Admin:** a complete-only response schema; the re-read and note calls; `<DiscrepancyPanel>` on a completed
    `family_statement` card — SEEDED by the completion under per-key cache defaults (`staleTime` / `gcTime: Infinity`,
    `refetchOnMount: false` — the app-wide defaults would lose the seed; ⚠ round 2, R2-9: superseded by round 1's CR1 —
    the seed now lives in the assignment card's state, per actor and opening, `gcTime: 0`), fetched on its own only for the session's own
    inspector (local `normalizeActorId`), "Show the result" for every other viewer; the ruled copy verbatim; per-row
    `mutateAsync` note boxes; another author's note read-only WITH the author; the window / hidden refusals worded; the
    unused `gi.result.completed` removed. `<PeerMeshView>` renders the staff block ("Recorded after the difference was
    shown", the author and time; `unavailable` worded).
  - **Fences / pins:** `FENCED_FILES` 50 → 52 (+ the 6.27a decrypt block); a SEPARATE ⛔-ciphertext assertion scoped to the
    comparison; a NEW medical fence with teeth; rtbf pins 23 → 24 statements, 20 → 21 tables (the no-claims leg stays 21,
    the notes table added to its `not.toContain`).
  - **Docs:** `deferred-work.md` — ③ / ④ owed by row 6-32 (ONE item); the GI13 item and the *"Erasure scrub not serialized"*
    item gain the notes table. Row 27 gains evidence line (5) — the notes table under counsel's `-304` Q4 A scope (a go-live
    fence, ⛔ a merge blocker).
  - **Recorded readings (implementation only, ⛔ a ruling):** the pre-0147 NULL-source leg is seeded by dropping 0147's
    `NOT VALID` CHECK, completing the row, and re-adding the CHECK by its own catalog definition inside ONE transaction
    (rolled back in the domain spec; committed in the API spec) — the only way to reproduce such a row (⚠ round 2, R2-9:
    since round 1's CR6 the domain and policy legs do this on a connection-local TEMP SHADOW of the inspection table, ⛔ on
    the shared table; only the API spec still commits it on the shared table — R2-17); the staff block
    says *"No difference from the neighbours was shown to the inspector."* for an EMPTY showing (story-minted).

### File List

- `packages/domain/migrations/0160_ground-inspection-discrepancy.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/claim_ground_inspection_discrepancies.ts` (new)
- `packages/domain/src/schema/claim_ground_inspections.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/policies/claim-ground-inspection-discrepancy-showings-rls.ts` (new)
- `packages/domain/src/policies/claim-ground-inspection-discrepancy-notes-rls.ts` (new)
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/claim/inspection-discrepancy.ts` (new)
- `packages/domain/src/claim/approval-warnings.ts`
- `packages/domain/src/claim/ground-inspection-persist.ts`
- `packages/domain/src/claim/errors.ts`
- `packages/domain/src/claim/index.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/tests/claim/inspection-discrepancy.test.ts` (new)
- `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/integration/claim/_inspection-discrepancy-fixtures.ts` (new)
- `packages/domain/tests/integration/claim/ground-inspection-discrepancy.spec.ts` (new)
- `packages/domain/tests/integration/claim/ground-inspection-discrepancy-concurrency.spec.ts` (new)
- `packages/domain/tests/integration/claim/ground-inspection-rtbf.spec.ts`
- `packages/domain/tests/integration/rls/claim-ground-inspection-discrepancy-policy-regression.spec.ts` (new)
- `packages/contracts/src/claims/verifier-console.ts`
- `packages/contracts/src/claims/withheld-note.ts` (code review round 2 — `check_failed`'s doc)
- `packages/contracts/tests/claims-verifier-console.test.ts`
- `packages/contracts/tests/claims-peer-answers.test.ts`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/modules/claims/claims.ground-inspection.handlers.ts`
- `apps/api/src/modules/claims/claims.ground-inspection.routes.ts`
- `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`
- `apps/api/src/modules/claims/peer-answers-assembler.ts`
- `apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts` (new)
- `apps/api/tests/integration/claims/peer-answers-console.spec.ts`
- `apps/api/tests/integration/claims/verifier-console.spec.ts`
- `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`
- `apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts`
- `apps/api/tests/unit/peer-answers-stitch.test.ts`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`
- `apps/admin/src/modules/ground-inspection/i18n-en.ts`
- `apps/admin/src/modules/claim-verification/PeerMeshView.tsx`
- `apps/admin/src/modules/claim-verification/i18n-en.ts`
- `apps/admin/tests/ground-inspection-discrepancy.test.tsx` (new)
- `apps/admin/tests/ground-inspection-discrepancy-client.test.ts` (new)
- `apps/admin/tests/peer-mesh-inspection-discrepancy.test.tsx` (new)
- `apps/admin/tests/ground-inspection-page.test.tsx`
- `apps/admin/tests/verifier-console.test.tsx`
- `apps/admin/tests/neighbours-answers-panel.test.tsx`
- `docs/launch-gate-inventory/inventory-roster.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-27d-inspector-discrepancy-at-completion.md`

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 4.3 | Code review round 3 (`bmad-code-review 6.27d`, the round-2 patch alone + a fix-diff review): 18 patches applied (R3-1 Tasks 3.1 / 3.2 amended to the CR1 / R2-13 design; R3-2 – R3-6 / R3-9 / R3-12 admin edges; R3-7 / R3-17 the race legs; R3-10 a note with ⛔ visible character refused, server + page; R3-13 closed by removal — the route already sends a failed session to sign-in; record corrections), R3-19 deferred (trigger functions resolve by search path — house-wide), 10 dismissed; `ci:local` on the final tree green but the 7 known #15. Status stays `done`. ⛔ No migration, ⛔ ruling moved. |
| 2026-10-14 | 4.2 | Code review round 2 (`bmad-code-review 6.27d`, the full branch in three parallel chunks + a fix-diff review): 20 patches applied (R2-1 the note writer / re-read 40P01 — the showing writer locks the claim `FOR KEY SHARE` first; R2-5 positive controls for round 1's temp-shadow legs; the admin's page-wide note words, render-time `crypto.randomUUID`, unannounced states, stale-session viewer; the as-of supersession, `unavailable`, note-writer race and delivery-COMMIT legs; policy pins; a blank note refused; record corrections), R2-21 deferred, 40 dismissed; AC5 / AC6 / Task 3.2 amended in place. Status → `done`. ⛔ No migration, ⛔ ruling moved. |
| 2026-10-14 | 4.1 | Code review round 1: CR1–CR6 applied (uncommitted until round 2), CR7 deferred. |
| 2026-10-14 | 4.0 | `bmad-dev-story 6.27d` — implemented: migration 0160 (the showings + notes tables, the inspection's ownership UNIQUE, the guard triggers, the erasure arm, per-command RLS); the comparison inside the completion through ONE per-answer predicate shared with 6.27b; the guarded post-commit showing write (`persisted`), the re-read GET and the note POST (the hidden refusal before any showing check); the staff block inside the neighbours' section (`MAX_READS` 27 → 29); the admin panel (seeded result, ruled copy verbatim, per-row notes with author) and `PeerMeshView`'s block; the anonymizer scrub + rtbf pins; two fences; Row 27 evidence line (5); deferred ③ / ④. Status → `review`. |
| 2026-10-14 | 3.1 | ⭐ Round-2 fresh-context re-validate: ⛔ no BLOCKER / HIGH. 2 MEDIUM in round 1's own swallowed-COMMIT patch — the assigned inspector already gets `own_visit` there (only an override completer reaches the INSERT), and a guarded `INSERT … SELECT` yields 0 rows (⛔ a trigger raise) ⇒ Task 4.1's step (ii) is ONE statement reporting `persisted`, and Task 1.3 (a) is the backstop for UNGUARDED writers only. LOW: the note POST's 201 body + `refetch()`; `admin.display_name_missing` (already an `ApiError`); copy / PeerMeshView render tests homed; the probe's "no details" scoped to an in-window claim; `authorActorId` on the re-read only; round 1's `approver-own-visit.ts:104-106` "correction" REVERTED to `:105-107` (it was wrong — #24(e)); `:135-144`; AC5 names the withheld answer; Task 7's red-checks. |
| 2026-10-14 | 3.1 | ⭐ Round-1 fresh-context re-validate of the v3.1 rewrite (1 HIGH, 7 MEDIUM, 8 LOW — most of them the pass's own): a swallowed completion COMMIT returned `shown` (Task 4.1 now `withheld/check_failed` when the guarded INSERT finds no completed parent); AC2's note-writer order aligned with AC6; `shown_at` = first RECORDED, ⛔ "first delivery"; the probe test compares status, code, message and the absence of `details`, ignoring `request_id`; the note writer maps `OwnGroundVisitPendingError` directly (6.27b's mapper's prefix union lacks `ground_inspection`, its words say approve); ONE `{ discrepancy, notes }` cache shape; the page ⛔ cannot see a pariwar-scope override grant ⇒ an on-demand button for every other viewer; Task 3.1 keyed on `deathDateSource`; notes carry a stored `author_display` (⛔ a raw id on screen) and an `unavailable` render; orphan tests homed + Task tags; four cites, two quotes, the window list, the rtbf `not.toContain`, the NULL-source 404 leg. |
| 2026-10-14 | 3.1 | `bmad-create-story validate 6.27d` — four read-only verifiers (governance; domain/DB; API/admin/contracts; design adversary) against `8fcf7826` (= `main`, ⛔ no code moved). 2 HIGH: the note POST leaked the showing to a HIDDEN caller (201 vs 409 `discrepancy_not_shown`) — AC2 / AC6 now order ONE neutral `own_ground_visit_pending` refusal BEFORE any showing check, and a withheld re-read returns ⛔ no notes; the admin's "may complete" eligibility did ⛔ not exist — Task 3.1 fetches only on a seeded cache or the inspector's own id (local `normalizeActorId` rule; ⛔ no `@twt/domain` in the browser). MEDIUM: a withheld result writes ⛔ no showing (`shown_at` = first delivery); R4a (notes with author — BigDev); R1 relabelled NARROWS and keyed on `death_date_source = 'family_statement'` everywhere (pre-0147 NULL-source rows); R4 relabelled WIDENS-wording, ⛔ no new viewer (role catalogue); `-304` Q4's counsel clause carried (Task 7); the Recorded observation re-attributed to 6.27b P3 and completed (all surfaces, the concrete harm); the 3-column owner UNIQUE + `ON DELETE CASCADE` FKs; the column-grant rationale (42501); the TRUNCATE guidance (23000, temp twin, replica cleanup); `lockClaimInWindow` is private ⇒ the writer lives in the persist module, window code `not_allowed` named + page words; ⛔ no notes max to copy; a complete-only admin response schema; the GET's own tx before decrypts; the `value_ciphertext` assertion separate; R2's clock basis recorded with its race leg. LOW: the 404 set, the `unavailable` date / note arms, fail-closed before the hidden check, a note after a failed showing write, the staff-view build path + `MAX_READS` 27 → 29 with FOUR pins, five fixtures, the rtbf pins, `inspectionSentinel`, `ComparableQuestionKey`, the key-list parity, the author CHECK, the date format per surface, the human-actor gate is print-only for this file, `assignment.claimCaseId`, quotes (CF4, "FULL", `-305` label), story-minted labels, X1 A tied in, AC2 / AC7 tagged, cite ranges. ⛔ No ruling moved. |
| 2026-10-14 | 3.0 | ⭐ `bmad-create-story 6.27d` (BigDev chose 6.27d over the still-gated 6.27c): RE-PINNED `fa2687ce` (⛔ not an ancestor) → `8fcf7826`; Status `backlog` → `ready-for-dev`; every code cite re-read (completion `:933-1059`, handler `:604-688`, OP14 `:156-179`, migration `0160`). Author readings R1–R6 recorded (FULL visit only; compare inside the tx; the date in hand; who receives it incl. the override completer and the withheld arm; staff see it only inside the neighbours' section; the existing field class). New in the ACs: the swallowed-COMMIT INSERT guard + trigger backstop; the admin unmount and the dropped response key; the `.strict()` transcript; the shared per-answer predicate (⛔ never `derivePeerReplyWarningKeys` itself); the medical fence is NEW work; Trap 13 cite corrected; the "District Admin who inspects … by design (Invariant 7)" note REMOVED (Invariant 7 never said it) and replaced by a recorded observation (CF2's dual-role case). ⛔ No ruling moved. |
| 2026-10-10 | 2.4 | Round 5: AC5 gains the leg for the empty showing row. |
| 2026-10-10 | 2.3 | Round 4: Task 4 names the inspector's own re-read and its idempotent recompute (`ON CONFLICT DO NOTHING`); a showing row is written even when nothing differs, so "absent" can only mean a failed write. |
| 2026-10-10 | 2.2 | Round-3 validate: AC2 ⛔ never judged on 6.27b's code (its kinds filter applies once b lands); the showing write IDEMPOTENT (`UNIQUE` per assignment) with an as-of-`completed_at` RECOMPUTE when absent — "never lost for good" now holds. |
| 2026-10-10 | 2.1 | Round-2 validate: ①'s wording (*"The family reported that the member has died …"* — the family has ⛔ no `has_died` field); ② gated on `death_date_source = 'family_statement'` (a source value); the family's date shown is the inspector's own entry, decrypted in the handler after commit; the showing record is a SEPARATE table written in its own transaction after the completion commit (the ordering test is buildable); the erasure arm in 0143's form (F37 corrected); *"no FULL visit"* for the blind-first rule. |
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 items 1 and 3): PM25 (a) — ① / ② only, open-ended re-asking, the notes and showing record. |
