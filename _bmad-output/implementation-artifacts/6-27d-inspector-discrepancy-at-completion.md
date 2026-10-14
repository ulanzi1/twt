---
baseline_commit: 8fcf7826
---

<!--
⭐ CUT 2026-10-10 from Story 6.27 v2.0 (`2026-10-10-305` §2 item 1).
⭐ RE-PINNED 2026-10-14 (v3.0 — `bmad-create-story 6.27d` run on this EXISTING file) from `fa2687ce` to `8fcf7826` (`main` after 6.27a AND
6.27b shipped). ⚠ `fa2687ce` is ⛔ NOT an ancestor of `main` (its twin is `0281d449` — 6.27a's SHA map); every `file:NNN` below is AS OF
`8fcf7826`, re-read by four read-only checkers (governance; ground-inspection code; peer-mesh code; prior stories + diff) and the author.
⚠ Before Task 1: `git diff --name-only 8fcf7826..HEAD -- packages apps scripts infra` — re-read any cited file that moved.

STATUS: `ready-for-dev` — its one condition (6.27a `done`) is met; 6.27b is `done` too. 6.27c (sending) waits for THIS story.
⭐ THE RECORD is 6.27a's file (`6-27-peer-mesh-sending-replies-and-date-of-death.md` — rulings, Invariants, F1–F41, PM1–PM25). This file
BUILDS **PM25 (a)** and its erasure arm (PM17's d half). Where a summary below and 6.27a's text disagree, 6.27a's text is the record —
EXCEPT the six author readings R1–R6 below, which this file records because 6.27a's text was written before the code it now runs on existed.
GLYPH REGISTER, ADDRESSING RULE: as 6.27a.
-->

# Story 6.27d: The Inspector Forms Their Own View First — Shown Only Where the Family and a Neighbour Differ, After Completing Their Record, and Asked to Re-Ask the Family in Their Own Words `[SURFACE]`

Status: ready-for-dev

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
- `-305` §2 item 3: *"**THE INSPECTOR ASKS THE FAMILY OPEN-ENDED.** When a difference is shown, the inspector asks the family again in
  open terms (*'please tell me again how they died'*) and records the answer — ⛔ never stating what any neighbour said, ⛔ never who. ⇒ ⛔ no
  neighbour's answer reaches the family, directly or by paraphrase (the closing note's *'never the family'*, ratified as put under `-304`
  Q6, holds as worded). The inspector still SEES the difference (`-304` Q3 / Q4 as put)."* (⚠ v3.0 cite fix: the words *"never the
  family"* live in routing note `…2026-10-10-6-27-the-neighbours-questions.md:61`, quoted by `-305` — ⛔ not in `-304` itself.)
- `-310` CF2 (Trustee-ratified; the table as put, `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` §CF2): **The inspector** —
  *"⛔ Nothing before completing their own record; then only THAT the family and a neighbour differ, question by question — ⛔ never the
  neighbour's answer itself, ⛔ never who; they ask the family again, open-ended."*
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
  transaction AFTER the completion commits; idempotent; recomputed as of `completed_at` if absent), **answers after completion reach the
  District Admin, ⛔ never the inspector**.
- **PM17 (d's half):** the notes table's erasure arm in 0143's form; the rtbf pin raised again.

### Author readings R1–R6 (v3.0 — each is the AUTHOR's under the routing template's §0: an implementation of ratified text that changes ⛔ nothing a person sees or is owed; the ratified sentence each implements is quoted)

- **R1 — the comparison runs ONLY on a FULL visit** (`death_date_source = 'family_statement'`, which 0147's CHECK makes equivalent to
  `inspection_stage <> 'certificate_check'`). Implements Invariant 7 / CF2: *"⛔ nothing before completing their own **FULL** visit's
  record"* and PM25 (c): *"a `certificate_check` alone does ⛔ not count — it records ⛔ no family account"*. ① compares a neighbour's
  `not_died` against *"the inspection having happened"* (`keys.ts:41-43`) — a `certificate_check` records ⛔ no family account, and ①'s
  ruled words begin *"The family reported…"*. ⇒ a `certificate_check` completion: ⛔ no comparison, ⛔ no showing row, `discrepancy: null`,
  ⛔ no new screen. **MATCHES** the ratified text (PM25 (a) said ② only for `family_statement`; R1 applies the same gate to ①).
- **R2 — the comparison runs INSIDE the completion transaction, under its existing locks; only the SHOWING write is post-commit.**
  Implements PM25 (a): *"compares against the neighbours' answers **SAVED by then**"*. Every answer writer takes the CLAIM row lock first
  (`peer-mesh-reply.ts:340-341`); completion holds that same lock (`lockClaimInWindow`), so "saved by then" is exact only inside the
  transaction — computed after commit, an answer saved in between would land in the result. **MATCHES**.
- **R3 — the ② display date is the plaintext the completion handler ALREADY holds** (it encrypts `body.deathDate` itself —
  `claims.ground-inspection.handlers.ts:621-628`), echoed back, ⛔ no decrypt; the RE-READ decrypts in its handler after its domain read
  (outside any lock). Implements PM25 (a): *"decrypted in the HANDLER after the completion commit, for display only"* — the intent (⛔ no
  KMS under a lock, display only) holds; a decrypt of the value in hand would add KMS for nothing. **MATCHES**.
- **R4 — who receives the result:** whoever COMPLETED the assignment — the assigned inspector, or a supervisor completing under
  `claim.override_ground_inspection` (`resolveInspectorOverride`, handlers `:204-223`) — and, on re-read, whoever may complete it (the SAME
  identity guard). ⚠ If that actor is HIDDEN on the claim after the commit by the ONE predicate (`isActorOwnVisitPending` — a supervisor
  holding their OWN pending visit on the same claim), the result is `{ state: 'withheld', reason: 'own_visit' | 'check_failed' }` —
  6.27b's ONE withheld shape, ⛔ never a difference and ⛔ never "no difference" (uniform: it does ⛔ not depend on the result). The CF2
  row is "the inspector" = the person who sat with the family. **MATCHES**; the withheld arm applies CF2's *"⛔ nothing before completing
  their own record"* to the supervisor's OWN pending visit.
- **R5 — staff see the showing and the notes ONLY inside the neighbours' section** (`assemblePeerSection`, `peer-answers-assembler.ts:117`
  — the ONE assembler behind the verifier console AND 6.27b's on-demand `GET …/peer-answers`), AFTER its PM25 (c) hide. ⇒ the audience is
  exactly the audience already entitled to every neighbour answer (CF2's District Admin / verifiers / later approvers), and a hidden reader
  sees ⛔ nothing (the whole section is absent). ⛔ NEVER on the inspection module's claim-wide list read (`GET …/ground-inspection?district=|block=`):
  its audience is every conduct-key holder at the locator — e.g. another Block Admin — who is ⛔ not on CF2's list, and a showing's key
  (*"a neighbour said not died"*) is neighbour-derived. **MATCHES** (⛔ no new viewer of neighbour-derived content).
- **R6 — the notes are Tier-1 under the EXISTING field class `'ground_inspection'`** (`CLAIM_GROUND_INSPECTION_FIELD_CLASS`,
  `apps/api/src/context.ts:188`; helpers `ground-inspection-crypto.ts:21-55`) — ⛔ not a new class (v2.x said "a field class of its
  own"; a new class is three un-gated edit sites and buys nothing: the note is written by the same inspector, about the same visit).
  Implementation only.

### Recorded observation — ⛔ NOT this story's to change, ⛔ NOT routed by it (Gap-analysis posture: observed, escalation proposed to BigDev)

⚠ CF2's table is by ROLE. When the inspector IS the District Admin of that district (or a verifier / later approver), 6.27a's built hide
(`peerSectionHiddenFromActorSql`) lifts at their completed FULL visit, and from then the console shows them EVERY answer (the District
Admin row), ⛔ not only the differences (the inspector row). `-327` P3 (author-commit, ⛔ not ratified) reads the same way (*"cannot approve
… until they have done their own full visit"*). The Panel was ⛔ never asked which row governs a person who holds both. 6.27d's own
surfaces follow the inspector row exactly; whether the dual-role case needs a Panel question is BigDev's call — see the closing summary.

## Acceptance Criteria

1. **AC1 — preconditions:** 6.27a `done` ✅ and its shared Task 0.4 author-commit (`-311`) ✅ — met at `8fcf7826`. ⛔ No decision is owed
   before code: R1–R6 are author readings recorded in THIS file (⛔ no `.decision-log.md` entry needed — they implement ratified text;
   if review finds one that widens, STOP and route it).
2. **AC2 — nothing before completing (kept true):** an actor holding an un-completed assignment on the claim with ⛔ no completed FULL visit
   sees ⛔ no showing, ⛔ no note, ⛔ no count and ⛔ no "hidden" line from 6.27d on ANY surface: the inspection page renders ⛔ no discrepancy
   panel for a `scheduled` assignment; the neighbours' section (R5) stays absent for them (the existing hide — a regression leg proving the
   NEW fields ride inside it); the re-read (AC5) answers the withheld shape (R4) for a hidden caller. ⛔ Never a second hide predicate.
3. **AC3 — the comparison** (① and ② only; R1, R2): `completeGroundInspection` returns `discrepancy: { questionKeys: ('has_died' |
   'death_date')[] } | null` — `null` for a `certificate_check`; the keys of the questions that differ, in `COMPARABLE_QUESTION_KEYS` order,
   ⛔ no values. Computed INSIDE the transaction after the completion UPDATE, against the claim's LIVE answers (`superseded_at IS NULL`,
   submitted or not — as `peerReplyColumnsSql`), ⛔ no lock on answers, ⛔ no KMS. ① = a live `has_died` answer whose codes are exactly
   `['not_died']`. ② = a live `death_date` answer with a 3-element `death_date_window_indexes` that does ⛔ NOT contain the completed row's
   `death_date_index` (a neighbour's `unknown` date, a NULL window or a NULL family index ⇒ ⛔ not compared, ⛔ never "differs"). Through
   ONE per-answer predicate SHARED with 6.27b's `derivePeerReplyWarningKeys` (Task 2.1). Tests: equal date ⇒ none (asserted FIRST — 6.27b
   Trap 3); D±1 ⇒ none; D±2 ⇒ `death_date` (month end, year end, 29 Feb); `not_sure` / `did_not_know` / `died` ⇒ none; a superseded
   `not_died` ⇒ none; a `death_cause` / `death_illness` answer ⇒ ⛔ never a key (a unit test over the rule table); an answer whose writer is
   BLOCKED on the claim lock while completion holds it lands AFTER and is ⛔ not in the result (a two-connection leg); a fence: ⛔ no
   decrypt / `value_ciphertext` / KMS and ⛔ no `member_medical_disclosures` in the comparator module (Task 6).
4. **AC4 — the two screens** (admin, English; copy VERBATIM from PM25 (a)):
   - ⛔ no difference, or ⛔ no answer yet (incl. a claim with ⛔ no neighbour selection — CF4 *"the inspection carries the claim"*) ⇒
     *"Thank you, your response has been recorded. No further action needed."*
   - a difference ⇒ *"Thank you, your response has been recorded. We found the family's answers don't match the neighbours' observations.
     Please ask the family again, in your own words, without mentioning anyone else's answer, and record their response in the note next
     to each question."* — then per differing key: ① *"The family reported that the member has died. A neighbour's answer differs."*;
     ② *"The family said: {familyDeathDate}. A neighbour's answer differs."* (`familyDeathDate` per R3, formatted as the page formats a
     death date today) — each with ONE note box.
   - the withheld result (R4) ⇒ the shared `<WithheldNote>` (6.27b) — ⛔ never either screen.
   - ⛔ no name, ⛔ no count, ⛔ no neighbour's value anywhere in the response or the DOM (a test asserts the response's key set and that
     ⛔ no `valueCodes` / name / count field exists); the response SHAPE does ⛔ not vary with the number of neighbours or answers.
   - a `certificate_check` completion shows ⛔ neither screen (R1).
5. **AC5 — the showing and the re-read:**
   - after the completion transaction closes, the handler writes the showing in its OWN transaction:
     `INSERT … SELECT … FROM claim_ground_inspections WHERE ground_inspection_id = $1 AND status = 'completed' AND inspection_stage <> 'certificate_check'
     ON CONFLICT (ground_inspection_id) DO NOTHING` (⚠ `closeScopeTx` swallows a failed COMMIT — `multi-tenant/scope-tx.ts:57-66`, 6.27a
     deferred D1 — so the INSERT must ⛔ never trust that the completion persisted), plus the DB backstop trigger (Task 1.3);
   - the showing holds `question_keys` (possibly EMPTY — a completion with ⛔ no difference writes a row with `'{}'`, so "absent" means ONLY
     "the write never happened", ⛔ never "no difference") and `shown_at clock_timestamp()`; ⛔ no values;
   - `completed_at` < `shown_at` (an ordering test in SEPARATE committed transactions — [[project_db_clock_ordering_tests_tie]]; red-check
     it by reversing the comparator);
   - a failed showing write ⛔ never fails the completion response (logged ids-only; the response still carries the in-tx result);
   - `GET …/ground-inspection/:ground_inspection_id/discrepancy` (the re-read; R4's guard) returns the RECORDED showing; if ABSENT it
     RECOMPUTES against the answers live AS OF `completed_at` (`saved_at <= completed_at AND (superseded_at IS NULL OR superseded_at > completed_at)`),
     writes it (`ON CONFLICT DO NOTHING`, then re-reads the winner) and returns it; plus the caller's own notes (Task 4.2); 404 for a
     `scheduled` / `superseded` / `certificate_check` assignment (one neutral code);
   - tests: a lost completion response (the re-read returns the same keys); a failed showing write (simulated — the re-read recomputes the
     SAME keys even after a later answer arrives); an empty showing; idempotency under two concurrent re-reads (one row).
6. **AC6 — the notes:** `POST …/ground-inspection/:ground_inspection_id/discrepancy-notes` `{ questionKey, note }` (R4's guard):
   - written ONCE per (assignment, question) — a second ⇒ 409 `ground_inspection.discrepancy_note_exists`;
   - ONLY for a key in that assignment's showing (⛔ no showing or a key not in it ⇒ 409 `ground_inspection.discrepancy_not_shown` —
     enforced in the writer AND by the Task 1.3 trigger);
   - ONLY while the claim is in PM8's answer window (`lockClaimInWindow` — the ONE window, `isClaimInAnswerWindow`; ⛔ never re-composed) ⇒
     else the inspection module's existing window refusal code (grep it — ⛔ never a new one);
   - Tier-1 (R6), `noted_at clock_timestamp()`, `author_actor_id` through `normalizeActorId`; ⛔ no KMS under a lock (encrypt FIRST in the
     handler — Trap 9); the completed inspection row is ⛔ never changed (a test compares its `to_jsonb` before / after the showing and
     note writes);
   - the note is shown to staff (R5) marked *"Recorded after the difference was shown"* with its `noted_at`, and to its author on the re-read.
7. **AC7 — answers after completion:** an answer saved after `completed_at` ⛔ never reaches the inspector's screen or the re-read (the
   showing is as-of `completed_at`); it reaches the District Admin through the console's existing live answers (a test on each side).
8. **AC8 — erasure, policies, gates:** the notes table's erasure arm in 0143's form + its scrub in the anonymizer + the rtbf pin raised
   (Task 1.4 / 5); RLS + per-command policies + a policy spec on BOTH tables; the showings table ⛔ never updated or deleted (no UPDATE grant,
   no UPDATE / DELETE policy, trigger); the completion handler's new field reaches the admin (BOTH client schemas — Task 4.4); the
   contracts' `.strict()` transcript gains its field with every fixture amended (Task 4.3); `pnpm ci:local` green, and the domain + api
   live specs touching these files re-run with `DATABASE_URL` set.

## Tasks / Subtasks

- [ ] **Task 0 — re-read before code.** `git diff --name-only 8fcf7826..HEAD -- packages apps scripts infra`; re-read every cited file that
      moved. Grep the code for `6.27d` (two doc-block notes today: `packages/domain/src/questionnaires/keys.ts:41-43`,
      `packages/domain/src/claim/peer-mesh-reply.ts:619-621`). ⛔ No governance commit is owed (AC1).

- [ ] **Task 1 — migration `0160` (AC5, AC6, AC8).** Next free number at HEAD is **0160** (journal ends at idx 159, `0159_ground-inspection-note-authors`);
      re-check at build. Hand-authored SQL + a `meta/_journal.json` entry (⛔ never `db:generate`; ⛔ never edit an applied migration —
      [[project_live_db_test_gotchas]]). Order as 0119: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes. Iterate on a throwaway
      database first (6.27a's `twt_scratch_627a` practice), then apply to **:5432 AND :5433**, then prove both from zero.
  - [ ] 1.1 `claim_ground_inspection_discrepancy_showings`: `pariwar_id`, `claim_case_id`, `ground_inspection_id` (`UNIQUE (ground_inspection_id)`),
        `question_keys text[] NOT NULL` with `CHECK (question_keys <@ ARRAY['has_died','death_date']::text[])`, `shown_at timestamptz NOT NULL DEFAULT clock_timestamp()`.
        Composite FK `(pariwar_id, ground_inspection_id)` → `claim_ground_inspections` and `(pariwar_id, claim_case_id)` → the claim
        (0157's ownership-backstop pattern — check the target has a matching unique key; add one only if needed). `GRANT SELECT, INSERT` ONLY.
  - [ ] 1.2 `claim_ground_inspection_discrepancy_notes`: `pariwar_id`, `claim_case_id`, `ground_inspection_id`, `question_key text NOT NULL
        CHECK (question_key IN ('has_died','death_date'))`, `note_ciphertext text NOT NULL` (Tier-1, `piiColumn(1,'ground_inspection')` in
        the drizzle schema — R6), `author_actor_id text NOT NULL`, `noted_at timestamptz NOT NULL DEFAULT clock_timestamp()`,
        `UNIQUE (ground_inspection_id, question_key)`; the same composite FKs. `GRANT SELECT, INSERT` + column-level `GRANT UPDATE ("note_ciphertext")`
        (the scrub — without it the scrub silently updates 0 rows under FORCE RLS, `0143:75`). ⚠ #37(a): ⛔ no CHECK on `note_ciphertext` beyond
        NOT NULL (the scrub writes a non-NULL sentinel).
  - [ ] 1.3 Triggers: (a) on BOTH tables a BEFORE INSERT trigger refusing a row whose `ground_inspection_id` is ⛔ not, in the inserting
        transaction's view, a row with `status = 'completed'` AND `inspection_stage <> 'certificate_check'` in the same `pariwar_id` /
        `claim_case_id` — the backstop for AC5's swallowed-COMMIT case (the handler inserts in a LATER transaction, so a completion whose
        COMMIT failed is still `scheduled` there and is refused; ⚠ the trigger cannot see whether an insert shares the completion's own
        transaction — the writers never do that, recorded in the header); on the notes table it ALSO refuses a `question_key` ⛔ in that assignment's showing
        `question_keys` (⛔ no showing ⇒ refused). (b) showings: refuse UPDATE; DELETE only at `pg_trigger_depth() > 1` (cascade); refuse
        TRUNCATE (0143's form). (c) notes — the erasure arm in 0143's / 0156's form: UPDATE passes ONLY when `(to_jsonb(NEW) - 'note_ciphertext')
        IS NOT DISTINCT FROM (to_jsonb(OLD) - 'note_ciphertext')` AND `OLD.note_ciphertext IS NOT NULL AND NEW.note_ciphertext IS NOT NULL`;
        DELETE only by cascade; TRUNCATE refused. ⚠ RECORD in the migration header, as 0149 does, that *"the trigger cannot tell the RTBF
        scrub from any other writer"*.
  - [ ] 1.4 RLS: `ENABLE` + `FORCE`; per-command policies (`for: 'select'`, `'insert'`, and on notes `'update'` — the scrub needs it, `-279`
        A12) with the house `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` scope; ⛔ never `FOR ALL`; ⛔ no DELETE
        policy. Policy files `packages/domain/src/policies/claim-ground-inspection-discrepancy-{showings,notes}-rls.ts`, exported from
        `policies/index.ts` (pattern: `claim-peer-mesh-replies-rls.ts`). Drizzle schema files in `packages/domain/src/schema/` + the barrel.
  - [ ] 1.5 Policy spec `packages/domain/tests/integration/rls/claim-ground-inspection-discrepancy-policy-regression.spec.ts` (pattern:
        `claim-peer-mesh-replies-policy-regression.spec.ts` — each refusal under a SAVEPOINT `attempt()` returning the SQLSTATE): grants,
        cross-tenant, FORCE, fail-closed scope, ⛔ no DELETE, the showings' UPDATE refused, the notes' non-erasure UPDATE refused and the
        sentinel UPDATE admitted, a NULL ciphertext refused, the Task 1.3 (a) refusals (scheduled / certificate_check / superseded parent;
        a note key not in the showing), the CHECKs. ⚠ The new FKs enlarge every `TRUNCATE claim_ground_inspections CASCADE` set — grep the
        RLS specs for it and lock children first ([[project_fk_truncate_cascade_deadlock]]).

- [ ] **Task 2 — the comparison (AC3; R1, R2).**
  - [ ] 2.1 EXTRACT the per-answer rule from `derivePeerReplyWarningKeys` (`packages/domain/src/claim/approval-warnings.ts:324-357`) into
        ONE exported pure predicate (e.g. `peerAnswerDiffers(answer, referenceDateIndex): 'has_died' | 'death_date' | null`) and make
        `derivePeerReplyWarningKeys` call it — ⛔ never a copy. 6.27b's tests stay green UNCHANGED (red-check: break the predicate, watch
        BOTH 6.27b's and 6.27d's tests go red). ⛔ Do ⛔ not call `derivePeerReplyWarningKeys` itself with the family's index — it mints
        `peer_*` WARNING keys (the wrong vocabulary, and `-304` Q3: *"⛔ never a warning"*).
  - [ ] 2.2 A new pure module `packages/domain/src/claim/inspection-discrepancy.ts`: a rule table typed `Record<ComparableQuestionKey, 'compare' | 'not_comparable'>`
        over `COMPARABLE_QUESTION_KEYS` (`questionnaires/keys.ts:44` — ⛔ never a second hand-written list): `has_died` / `death_date` ⇒
        `'compare'`; `death_cause` / `death_illness` ⇒ `'not_comparable'` with a doc-line *"owed by row 6-32 — the family side and a keyed
        comparable form"*. The SQL reads ONLY the `'compare'` keys DERIVED from the table. A `deriveInspectionDiscrepancy({ answers, familyDateIndex })`
        returns the ordered key list. ⚠ JSDoc comments only and no `**/` inside them ([[project_markdown_emphasis_closes_jsdoc]]; 6.27b Trap 13).
  - [ ] 2.3 The SQL fragment(s): live answers (`superseded_at IS NULL`) and as-of answers (`saved_at <= $asOf AND (superseded_at IS NULL OR superseded_at > $asOf)`),
        selecting `question_key`, `value_codes`, `death_date_window_indexes` ONLY — ⛔ never `value_ciphertext` (the shape of
        `peerReplyColumnsSql`, `approval-warnings.ts:532-552`, which is private and aliases claim `c`: export a parameterised sibling there or
        build the fragment in the new module — ONE fragment for both the in-tx and the as-of read; keep the own-claim filter `-261` C3
        that fragment carries). `clampLimit` is N/A (bounded by the claim's pings) — say so in a comment if the domain-limit gate asks.
  - [ ] 2.4 Wire into `completeGroundInspection` (`packages/domain/src/claim/ground-inspection-persist.ts:933-1059`): after the UPDATE
        (:1007-1034) and before / after `projectClaimState` (keep its event untouched), when `deathDateSource === 'family_statement'`,
        read the live answers (⛔ no lock — the claim lock is already held: lock order assignment → claim, 6.26a Trap 1; answer writers go
        claim → ping → reply) and add `discrepancy` to the result type (:906-914); `null` otherwise. ⛔ No KMS. A retried completion still
        throws `GroundInspectionNotActiveError` first (409) — the re-read is the recovery path.
  - [ ] 2.5 Domain functions for Tasks 4–5: `recordInspectionDiscrepancyShowing` (the guarded INSERT … SELECT, own tx supplied by the
        caller), `readOrRecomputeInspectionDiscrepancy` (recorded row, else as-of recompute + insert + re-read), `recordInspectionDiscrepancyNote`
        (assignment read → `lockClaimInWindow` → the showing check → INSERT; 23505 ⇒ a typed error), `readInspectionDiscrepancyNotes`.
        Export through the claim barrel.
  - [ ] 2.6 Tests (domain, live — `packages/domain/tests/integration/claim/ground-inspection-discrepancy.spec.ts`; fixtures
        `_peer-reply-fixtures.ts`; dates via `fixtureDeathDateIndex` / `deathDateWindow(...).map(fixtureDeathDateIndex)` — 6.27b Trap 3;
        completion takes the fixture's `now` — 6.26a Trap 9): every AC3 leg; the ordering and race legs in an OWN-COMMITTING spec (the
        `ground-inspection-concurrency.spec.ts` header pattern), `{ timeout: 20000 }`; assert membership, ⛔ never counts of shared tables.

- [ ] **Task 3 — the screens (AC4, AC5, AC6; admin).** `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` + `i18n-en.ts`
      (plain English constants — ⛔ not `useT`; the unused `gi.result.completed` key at `i18n-en.ts:126` may be reused or removed, ⛔ never
      left dangling twice).
  - [ ] 3.1 ⚠ `CompleteAction` (`:521-631`) renders only while the assignment is `scheduled` (`:405-410`); its `onSuccess` invalidates the
        list, the refetch shows `completed`, and it UNMOUNTS — `mutation.data` is lost ([[project_tanstack_onsettled_before_success]]). ⇒ on
        success, SEED a query keyed by the assignment id (`qc.setQueryData([...,'discrepancy', id], response.discrepancy)`) BEFORE
        `onMutated()`, and render a `DiscrepancyPanel` on the COMPLETED card (beside `InspectorRecord`, `:404`), which reads that query (and
        fetches the re-read GET when the cache is empty — a reload, another device). Render it only where the viewer may complete that
        assignment (the page's existing eligibility for `CompleteAction` — find it; ⛔ never a 403 storm from every viewer).
  - [ ] 3.2 The panel: the two screens (AC4); one note box per differing key, saved per row with per-call `mutateAsync().then`
        ([[project_tanstack_mutate_callbacks_latest_only]]; a test with two deferred promises); a saved note shows read-only (*"Recorded"*);
        a 409 `discrepancy_note_exists` re-reads; the window refusal shows the module's existing wording; results announced in a polite
        live region (6.27a family 13). ⛔ Never inside OP14's *"Other claims for this death"* section (`:156-179` — 6.27a Trap 5).
  - [ ] 3.3 Tests `apps/admin/tests/ground-inspection-discrepancy.test.tsx` with a REAL `useQuery` + the list refetch flipping to
        `completed` in the same flush (the unmount case); the DOM never contains a neighbour name / value / count; the withheld shape renders
        `<WithheldNote>`; a `certificate_check` completion renders no panel.

- [ ] **Task 4 — routes, contracts, client (AC4, AC5, AC6, AC8).**
  - [ ] 4.1 Completion handler (`claims.ground-inspection.handlers.ts` `complete()` `:604-688`): after `closeScopeTx(scopeTx, ok)` (`:660`),
        when `result.discrepancy !== null`: open a NEW scope tx (`openScopeTx` — the first is released, so this is the request's second
        connection, ⛔ not a third), (i) evaluate `isActorOwnVisitPending(ctx.actorId)` → R4's withheld shape (`check_failed` on error),
        (ii) write the showing (Task 2.5), close; a failure here is logged ids-only and ⛔ never fails the response. Return
        `{ groundInspectionId, status, photoCount, discrepancy }` where `discrepancy` is `null` (certificate_check) | `{ state: 'withheld', reason }`
        | `{ state: 'shown', questionKeys, familyDeathDate: string | null }` (`familyDeathDate` = `body.deathDate` when `death_date` ∈
        keys, else `null` — R3). ⛔ Never the post-commit work on `request.scopeTx` (it commits in `onSend` — `multi-tenant/index.ts:21-27`; #42(b)).
        Keep `void reply.status(N); return body;` ([[project_fastify_onsend_doublesend]]).
  - [ ] 4.2 `GET …/ground-inspection/:ground_inspection_id/discrepancy` and `POST …/ground-inspection/:ground_inspection_id/discrepancy-notes`
        in `claims.ground-inspection.routes.ts` with the SAME inline `preHandler: [adminSession, scope, resolveAssignment, conductFromRow]`
        as `complete` (`:245-252`) and `resolveInspectorOverride` in the handler (R4) — inline arrays (the human-actor gate reads them
        literally); the file is in the gate's `ENROLMENT_OWED` (`scripts/claim-adjudication-human-actor-invariant/check.ts:290-293`) ⇒ ⛔ no
        list change, but confirm the gate stays green. Bodies `.strict()`; the note's max length = the existing visit-notes limit in
        `CompleteBody` (`:94-111`). The GET returns the same `discrepancy` union (the date decrypted in the handler after the domain read, R3)
        + `notes: { questionKey, note, notedAt }[]` (the caller's view). Audit: the note write emits `emitAuthAudit` post-commit with codes
        only (`question_key`) — a new member of the closed `AuthAuditEventType` union (`apps/api/src/audit/audit-sink.ts`; F40); the GET emits
        ⛔ none (the showing row is the record of the first showing).
  - [ ] 4.3 The staff view (R5): `assemblePeerSection` (`apps/api/src/modules/claims/peer-answers-assembler.ts:117`) — AFTER its hide —
        reads the claim's showings + notes (decrypting notes outside any lock, each failure → that note `unavailable`, ⛔ never blank), and
        the `present` transcript (`packages/contracts/src/claims/verifier-console.ts` `PeerMeshTranscript`, `.strict()` at `:275`) gains
        `inspectionDiscrepancies: { groundInspectionId, completedAt, shownAt, questionKeys, notes: { questionKey, note | unavailable, notedAt }[] }[]`
        (REQUIRED, possibly empty — ⛔ never optional-for-some-readers). Every fixture of `PeerMeshTranscript` in `packages/contracts/tests`,
        `apps/*/tests` amended ([[project_contracts_tests_outside_tsc]] — run `npx vitest run` in contracts; grep `apps/*/tests` for the
        schema name). ⚠ If the assembler's reads count against `VERIFIER_CONSOLE_MAX_READS` (27, `claims.verifier-console.handlers.ts:238`),
        raise every pin in step. `PeerMeshView` / `NeighboursAnswersPanel` render the block (*"Recorded after the difference was shown"*).
  - [ ] 4.4 Admin client (`apps/admin/src/api/client.ts`): `GroundInspectionWriteResponse` (`:1268-1272`, non-strict — it DROPS unknown
        keys today) and `completeGroundInspection`'s return type (`:1354-1365`) gain `discrepancy`; new client calls + hooks for the GET and
        the note POST. A test that the parsed completion response KEEPS `discrepancy`.
  - [ ] 4.5 API live specs (`apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts`, one HTTP request per step): the three
        response shapes; the override completer receives it; a hidden override completer gets `withheld`; a non-inspector without the
        override key ⇒ 403; the re-read after a lost response; the note write rules (once, key-not-shown, window); the console's
        `peerMesh` carries the block for the District Admin and is ABSENT for a hidden reader; a later answer is on the console, ⛔ not
        on the re-read.

- [ ] **Task 5 — erasure (AC8; PM17 d's half).** In `packages/domain/src/member/anonymize.ts`, inside GI13's deceased-claims block
      (`:270-317`): `UPDATE claim_ground_inspection_discrepancy_notes SET note_ciphertext = <the house sentinel> WHERE claim_case_id IN (…)
      AND note_ciphertext IS NOT NULL` (GI13's shape). Raise the rtbf pin (`packages/domain/tests/member/rtbf-anonymize.test.ts`):
      TWENTY → TWENTY-ONE tables (`:233`), 23 → 24 statements (`:198`); the no-claims leg (`:265`, 21) stays 21 ONLY if the new statement
      sits inside the claims block — verify, don't assume. A live RTBF leg: a note scrubbed, the showing untouched (it holds ⛔ no PII), the
      trigger admitting exactly the scrub. GI13's deferred item (`deferred-work.md` — *"whose data a neighbour's answer is"*) gains the notes table.

- [ ] **Task 6 — fences (AC3, AC8).** In `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`: add
      `inspection-discrepancy.ts` (and the persist module if separate) to `FENCED_FILES` (`50` → `51`/`52` at `:187`, with the history comment
      extended) and to 6.27a's decrypt `it` block (`:375-391`); a NEW `it` forbidding `member_medical_disclosures` / `medicalDisclosure` /
      an import from `../medical` in the comparator + persist modules, with TEETH (the scan fires on a known positive, e.g.
      `packages/domain/src/medical/disclosure-read.ts`) — `-304` Q4 A; ⛔ no such fence exists today.

- [ ] **Task 7 — close.** `pnpm ci:local` with `DATABASE_URL` on :5433; then the api integration suite on its own (`ci:local` stops at
      domain — 6.27b); record red-checks in the Debug Log (the shared predicate, the ordering comparator, the scrub's `WHERE`, the INSERT
      guard). Change Log + File List. `deferred-work.md`: ONE item for ③ / ④ — *"the family's cause / illness answers (row 6-32) and a
      keyed blind index per option code are owed before the inspector can be shown a cause / illness difference"* — pointed at row 6-32.
      Sprint row → `review`.

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
  ONE hide predicate, BD4, the notes withholding + `<WithheldNote>`, `underSavepoint` for console reads — `later-approval-warnings.ts:161`).

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

- 6.27a: PM25 (`6-27-…md:754-790`), PM17 (`:666-672`), Invariant 7 (`:253-259`), F37 (`:398-404`), F35, F40, F41, Traps (`:1217-1253`).
- 6.27b: AC7 / BD4 (`6-27b-…md:364-386`, `:441-475`), X1 A / Y3 (notes withholding), routing note 2026-10-14 (Y2 — WRITTEN, ⛔ not sent;
  it concerns the pre-visit briefing, ⛔ not this story's screens).
- `.decision-log.md`: `-304` Q3 / Q4 / Q6, `-305` §2 item 3, `-310` CF2 / CF4, `-311`, `-327`. Highest id at `8fcf7826`: `2026-10-13-329`.
- `epics.md` Story 6.27d (`:3232-3245`) — consistent with this file.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- 2026-10-10 — cut from Story 6.27 v2.0 (`-305`). ⛔ No code.
- 2026-10-14 — v3.0 re-authored by `bmad-create-story 6.27d` against `8fcf7826`. ⛔ No code.

### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 3.0 | ⭐ `bmad-create-story 6.27d` (BigDev chose 6.27d over the still-gated 6.27c): RE-PINNED `fa2687ce` (⛔ not an ancestor) → `8fcf7826`; Status `backlog` → `ready-for-dev`; every code cite re-read (completion `:933-1059`, handler `:604-688`, OP14 `:156-179`, migration `0160`). Author readings R1–R6 recorded (FULL visit only; compare inside the tx; the date in hand; who receives it incl. the override completer and the withheld arm; staff see it only inside the neighbours' section; the existing field class). New in the ACs: the swallowed-COMMIT INSERT guard + trigger backstop; the admin unmount and the dropped response key; the `.strict()` transcript; the shared per-answer predicate (⛔ never `derivePeerReplyWarningKeys` itself); the medical fence is NEW work; Trap 13 cite corrected; the "District Admin who inspects … by design (Invariant 7)" note REMOVED (Invariant 7 never said it) and replaced by a recorded observation (CF2's dual-role case). ⛔ No ruling moved. |
| 2026-10-10 | 2.4 | Round 5: AC5 gains the leg for the empty showing row. |
| 2026-10-10 | 2.3 | Round 4: Task 4 names the inspector's own re-read and its idempotent recompute (`ON CONFLICT DO NOTHING`); a showing row is written even when nothing differs, so "absent" can only mean a failed write. |
| 2026-10-10 | 2.2 | Round-3 validate: AC2 ⛔ never judged on 6.27b's code (its kinds filter applies once b lands); the showing write IDEMPOTENT (`UNIQUE` per assignment) with an as-of-`completed_at` RECOMPUTE when absent — "never lost for good" now holds. |
| 2026-10-10 | 2.1 | Round-2 validate: ①'s wording (*"The family reported that the member has died …"* — the family has ⛔ no `has_died` field); ② gated on `death_date_source = 'family_statement'` (a source value); the family's date shown is the inspector's own entry, decrypted in the handler after commit; the showing record is a SEPARATE table written in its own transaction after the completion commit (the ordering test is buildable); the erasure arm in 0143's form (F37 corrected); *"no FULL visit"* for the blind-first rule. |
| 2026-10-10 | 1.0 | Cut from Story 6.27 v2.0 (`2026-10-10-305` §2 items 1 and 3): PM25 (a) — ① / ② only, open-ended re-asking, the notes and showing record. |
