---
baseline_commit: 4e57fa42
---

<!--
PINNED: `4e57fa42` = `origin/main` (`git fetch origin` 2026-10-27, in sync; the 6.36f / TalkBack landing). Created at `4e57fa42` in its OWN
worktree `/Users/dev/Developer/projects/TWT/.claude/worktrees/6-32-inspector-questionnaire-at-the-ground-inspection`, branch
`story/6-32-inspector-questionnaire-at-the-ground-inspection` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] —
two peer sessions were live; the main checkout was ⛔ switched). Two facts, stated separately: (1) the pin is an ancestor of this branch
(durable); (2) every `apps/` / `packages/` claim below was traced at `4e57fa42` on 2026-10-27 by two read-only research passes (governance;
code) and the load-bearing ones re-read by hand (`inspection-discrepancy.ts`, `questionnaires/{types,validator,registry,keys,answers}.ts`,
`0156` / `0160`, `ground-inspection-crypto.ts`, `-304`, `-310`, `-307`, `-330` SW25, PM23 / PM25, 6.28 OP14) — perishable, re-check at
Task 0.1. Re-locate by FUNCTION, ⛔ by line number.

STATUS: ready-for-dev (v1.3). **IQ1–IQ13 DECIDED** by [`-413`](../../.decision-log.md#decision-2026-10-28-413) (AUTHOR-COMMIT, committed alone,
2026-10-28; BigDev: *"IQ13 A — keep the letter optional"*, then *"recommendation accepted for IQ1-IQ12"*) — every IQ as recommended. Task 0 is DONE
(0.1 rebased onto `origin/main`; 0.2 answered; 0.3 `-413`; 0.4 records). ⛔ No Panel question is NEEDED to build; the NON-BLOCKING IQ7 confirm is
DRAFTED for BigDev to send (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-28-6-32-family-answers-audience.md`); roster Row 42
is minted. Implementation starts at Task 1.

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never") · ⭐ = action /
emphasis · ⚠ = hazard.

ADDRESSING RULE: ⛔ file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite decision id +
clause, item heading, row key).

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*), each re-grepped at the commit that takes it (`git log --all` + every worktree), as of 2026-10-27: decisions — highest COMMITTED on any
branch `2026-10-27-412` (11b.4a's worktree; main's is `-410`) ⇒ the author-commit takes ≥ `-413`. Migrations — main's highest is
`0185_contribution-suppression-batch-indexes`; 11b.4a's branch holds `0186`–`0187` ⇒ this story's migration takes ≥ `0188` (and its journal
`when` must be GREATER than every sibling's — [[project_sibling_migration_when_order_shared_db]]). Roster — highest row `41`
(`family-memorial-authorship-live`) ⇒ this story mints Row `42`. Ledger letters — 11b.4a's branch holds `2026-10-27k`…`-27q`; main's
latest is `-27j` ⇒ this creation commit takes `2026-10-27r` (mind the `---` separators at the rebase,
[[project_rebase_ledger_conflict_separator]]); every later line takes the next free letter OF ITS OWN DATE. Re-checked 2026-10-28: 11b.4a has
LANDED on main (`0186` / `0187` and decisions to `-412` are on `origin/main`; main's ledger is at `2026-10-28e`) — the floors (`-413`, `0188`,
Row `42`) still hold; Task 0.1 rebases onto it.

LETTERS: G = found facts (traced at the pin) · IQ = build decisions (PROPOSED) · TR = traps · I = invariants.
-->

# Story 6.32: The Inspector Asks the Family a Short Questionnaire — How the Member Died, Which Illness, and the Head's Letter — Saved as They Go, Compared Without Decrypting to What the Neighbours Said, and Shown to Staff as Context Only `[SURFACE]` `[PRIMITIVE]`

Status: in-progress

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

When a family's death claim has no neighbour to ask, or any time the ground inspector sits with the family, the Panel ruled two things
that no code yet does. (1) *"The inspector asks the family the same question"* the neighbours were asked — **how did the member die**
(`-304` Q3 A) and, after an illness, **which illness** (Q4 A) — and is then shown **only where the family's account and a neighbour's
differ**. (2) When nobody could be asked, **the inspector collects a letter from the head of the school or office** (`-310` CF4 A (3)); the
author extended that to **every full visit** (`-330` SW25) so the question tells the inspector nothing about the neighbours. This story
builds: the engine's `ground_inspection` rule and its first version (reviewed CODE, as `peer_mesh` v1–v4 are, until row 6-33's chain);
a pinned, append-only, Tier-1 store for the family's answers; the **comparable form** 6.27a PM25 (a) says this row OWES — a keyed blind
index per option code, on BOTH sides, so ③ cause and ④ illness are compared at completion **without a decrypt**; the inspector's panel on
the existing admin page; and the staff read of the family's answers. **It gates nothing**: the completion predicate (6.26a's ONE
definition of "complete") is ⛔ touched, ⛔ a question is ever a warning or a flag, and ⛔ a missing answer or letter holds any claim — the letter
half is IQ13 (A) (BigDev, 2026-10-28), which supersedes `-308` call 2's "hard check" in part at Task 0.3.

## Story

As **the ground inspector** sitting with a member's family,
I want **to ask the family how the member died, which illness, and whether the head of the school or office gave a letter — saving each
answer as I go — and, after I complete my own record, to be told only where the family and a neighbour differ**,
so that **I can ask the family again in my own words, and the staff who decide the claim have the family's account beside the neighbours' as
context — ⛔ never as a reason to hold, flag or refuse a family.**

## 📜 Policy meaning (AI-10-1)

**IQ13 was answered (A)** (BigDev, 2026-10-28: *"IQ13 A — keep the letter optional"*): the letter is recorded, ⛔ a condition of approval. The
option NOT taken would have introduced a predicate — *"when nobody could be asked about the member's death, the family's claim cannot be approved until
the inspector records that the head of the school or office gave a letter"* — and that sentence is kept here so the choice reads as made, ⛔ missed.
In the family's terms: *"If the head of the school or office cannot or will not give a letter, your claim is not held for it."*

**This story introduces NO predicate that gates a member's or a family's access to a benefit, and changes none — and that sentence is the
invariant, not boilerplate** ([[feedback_gate_scope_semantic_coverage]]: the shape that turned Story 10.10 into a permanent ban was a
"harmless" conjunct on an existing gate). The one existing gate this story sits beside is **6.26a's completion predicate** — *"no approval
before the ground inspection is complete"* (`groundInspectionApprovalState`, `claim/ground-inspection-approval.ts`; invariant 2: *"ONE gate,
ONE conjunct, ONE definition of 'complete'"*). **The questionnaire is ⛔ part of "complete"**: an inspection completes, and an approval
proceeds, with ZERO questionnaire answers, with the head's letter ⛔ collected, with the neighbours' and the family's accounts in total
disagreement. The discrepancy result (③ / ④ as ① / ②) is shown and recorded; ⛔ no approval, refusal, warning, flag, payment or claim state
reads it (`-304` Q3 A: *"⛔ never a warning, ⛔ never a flag on its own"*; CF3 (b); 6.27d's Policy meaning).

**In the family's terms:** *"What you tell the inspector about how your family member died or which illness they had, and whether the head of
their school gave a letter, is written down for the Trust's staff as background. It is never a reason to delay, flag, refuse or reduce your
claim, and it is fine to say 'I don't know'."* **In the inspector's terms:** *"You will be asked to record a few answers. If you cannot, or
the family cannot say, complete the visit anyway — the answers are optional; the original-certificate checks are what hold an approval."*

**Checked against the Niyamavali** (the main checkout's gitignored copy `docs/legal/niyamavali.md`, mtime 2026-08-16; a rulebook, ⛔ ratified —
[[feedback_niyamavali_rulebook_not_spec]]): §5.1 *"Eligibility is governed by the **actual cause of death**, not by a pre-existing illness
**that was honestly declared**"*; §5.5 excludes **suicide** and **murder where a nominee is an accused**, *"subject to State-Trustee
review"*; §5.6 *"If a member dies of an illness they **failed to declare** … and that illness is on the **IMA reference list**, the engine
**flags** the claim for **State-Trustee review** — it is **never auto-denied**."* ⚠ **This is the highest-sensitivity place the story
touches**: the cause options include *"Suicide"* and *"Killed by someone"*, and cause genuinely matters to eligibility (§5.1, §5.5). The
Panel's ruling is that the answer is **context only** — and that ruling is what keeps this story out of §5.5 / §5.6: nothing here reads a
cause or an illness to decide, flag or route a claim; §5.5's State-Trustee review and §5.6's engine flag run on their own evidence, ⛔ on
this answer (`-304` Q4 A: *"⛔ never compared automatically with the member's medical declaration"* — a fence test already bars
`member_medical_disclosures` from the comparison, `nominee-name-no-comparison-fence.test.ts`; this story EXTENDS the fence to the new
modules). **Result: ⛔ conflict — and a standing hazard, recorded:** the day any reader uses the family's cause or illness to gate, delay or
flag, it changes who is paid — and that is the Panel's ([[feedback_mechanization_split_commitment]]; `-304`: *"making any other answer gate,
delay or flag a claim changes who is paid — that stays the Panel's"*).

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Key (verbatim, short) | Status |
|---|---|---|
| `-304` Q3 A / Q4 A | Q3: the neighbours are asked *"How did they die?"* (illness over a long time · sudden illness (heart attack, stroke) · old age · accident (road, drowning, electric shock, snake bite, fire, other) · suicide · killed by someone · other · I don't know); *"⭐ As put in Q3, the **inspector asks the family the same question**, so the inspector is shown only where the two differ."* Q4: *"Do you know which illness?"* (cancer · heart disease · diabetes · kidney disease · liver disease · TB · stroke or paralysis · lung disease (asthma, COPD) · other · I don't know; more than one allowed) — *"**context only, ⛔ never compared automatically with the member's medical declaration; counsel confirms the legal basis before go-live**. ⭐ As put, the inspector asks the family the same."* | ⭐⭐ TRUSTEE-RATIFIED — the questions, the codes, context-only, the counsel go-live gate |
| `-304` Q8 + Consequence 3 | *"Pariwar Admin proposes, State Trustee proposes/approves with/without modification. Super Admin make it live for one pariwar/all pariwar … Superadmin can add question directly and make it live."*; Consequence 3: *"Row `6-32-…` builds the inspector's questionnaire under Q8, incl. the family's cause and illness answers (Q3 A, Q4 A as put)."* | ⭐⭐ TRUSTEE-RATIFIED (the Panel's own words) — the CHAIN is row 6-33's; THIS row builds the questionnaire the chain will edit |
| `-310` CF2 | The inspector — *"⛔ Nothing before completing their own record; then only THAT the family and a neighbour differ, question by question — ⛔ never the neighbour's answer itself, ⛔ never who; they ask the family again, open-ended."*; and who sees the NEIGHBOURS' answers (the District Admin and the district's verifiers; whoever approves at a later step, for that claim at that step only; ⛔ never the family) | ⭐⭐ TRUSTEE-RATIFIED |
| `-310` CF3 (a)–(d) | (a) every question the Panel ruled is in every version; (b) *"a question added through the chain is ⛔ never a warning or a flag"*; (c) an alcohol question needs Q5 changed first; (d) *"every health question is asked only once counsel has confirmed the basis"* | ⭐⭐ TRUSTEE-RATIFIED |
| `-310` CF4 A (3) | *"otherwise nobody — the ground inspection carries the claim and the inspector collects a letter from the head of the school or office."* | ⭐⭐ TRUSTEE-RATIFIED — the letter is a RULED collection, so `-310` is the question's `approvedBy` (IQ1) |
| `-308` call 2 | *"The hard checks are unchanged (the ground inspection for every approval, FQ9; **the head's letter when ⛔ no one can be asked**; a "they have not died" warns every approver)."* | AUTHOR-COMMIT — lists the letter beside FQ9 as a HARD CHECK ⇒ **IQ13** |
| 6.36 story, *"Recorded, ⛔ built here"* | *"after this part, a claim with nobody to ask is inspected and approvable WITHOUT the letter until 6-32 is `done`."* | Story record (⛔ a decision) — reads as if 6-32 makes the letter REQUIRED for that case ⇒ **IQ13** |
| `-307` §2 item 1 (D) + Consequence 2 | *"(a question in row 6-32's inspector questionnaire)"* | AUTHOR-COMMIT — assigns the letter to this row |
| `-330` SW25 | *"a forward note to row `6-32`: ask for the head's letter on EVERY full visit, so the question tells the inspector ⛔ nothing about the neighbours (CF2)"* | AUTHOR-COMMIT (BigDev "all A"). ⚠ `6-36a-…md` calls the same sentence *"our suggestion to 6-32"* — the DECISION ENTRY is the record; WIDENS CF4 A (3) from "nobody to ask" to "every full visit" (§0 row 3) |
| `-305` §4 | *"Row 27 — 6.27's counsel row (… health information from neighbours — ⛔ not the family's health answers: row 6-32 mints its own)"* | AUTHOR-COMMIT — ⇒ Row 42 (IQ11) |
| 6.27a PM23 (a) / PM25 (a) | PM23: *"the `ground_inspection` kind (row 6-32) gets ITS OWN rule from its own story — ⛔ never these seven keys"*; `COMPARABLE_QUESTION_KEYS` — *"the SAME keys and codes wherever BOTH sides answer"*. PM25 (a): *"③ (cause) and ④ (illness) are ⛔ NOT built: the family's answers come from row 6-32, and comparing ENCRYPTED codes needs a comparable form (a keyed blind index per option code) — a design OWED by row 6-32"* | AUTHOR-COMMIT (`-311`, *"accepted as recommended"*) — THE COMPARABLE FORM IS THIS ROW'S |
| `deferred-work.md` — *"The inspector is ⛔ shown a cause / illness difference (③ / ④)"* | *"Trigger: row 6-32 (the family side), which must also add the keyed comparable form; then flip the two rules to `'compare'` and widen 0160's two CHECKs."* | OPEN — discharged by AC5 / AC6 once `done` ([[feedback_closure_language_precision]]) |
| 6.27d R1 / R2 / R3 / R5 | the comparison runs ONLY on a FULL visit (`death_date_source = 'family_statement'`), INSIDE the completion tx under its locks; the display value decrypts in the HANDLER after the commit; staff see the showing and notes ONLY inside the neighbours' section | AUTHOR readings — REUSED unchanged for ③ / ④ |
| 6.26a invariant 2 | *"ONE gate, ONE conjunct, ONE definition of 'complete' … ⛔ No second copy of 'is the inspection complete' anywhere."* | AUTHOR invariant — binds I1 |
| 6.28 OP14 (d) | *"the inspector questionnaire … asks the family 'Has the family filed any other claim for this death?' — recorded on that row's comment"*; ledger: *"as an extra signal, ⛔ never the control"* (BigDev, 2026-10-10, *"yes, fold it"*) | AUTHOR-COMMIT by reference — `-319` OP14: *"BUILT … the ground inspector sees them too"*, committing 6.28's OP1–OP14 *"ALL AS WRITTEN"* (v1.6, which carries (d)'s routing to this row); ⚠ NOT approvable by the validator today ⇒ **IQ2** (a change of routing supersedes `-319` OP14 IN PART) |
| Ledger, 2026-10-10 (rows added; BigDev *"Yes, do it"*) | *"a versioned, conditional form beside 6.26a's fixed checks; the family's comparable answers under shared keys; offline saving"* | BigDev in session — ⚠ "offline saving" has NO ruling and NO substrate ⇒ **IQ8** |
| PRD FR-40 | *"A block-/district-level admin schedules a physical visit. Confirms facts on the ground (visit notes, photo of family, school principal letter optional)."* | PRD — the letter is OPTIONAL |

### §0 — whose decision is this ([[feedback_panel_gate_read_ratified_verbatim]])

The template's test: what does the Trust DISCLOSE, OWE, or need a BASIS for, and which ratified clause would have to give? Edge by edge:

| Edge | Ratified text | Verdict |
|---|---|---|
| 1. The inspector asks the family cause and illness; same questions, same codes | `-304` Q3 A / Q4 A *"the inspector asks the family the same"* | **MATCH** (ruled) |
| 2. ③ / ④ compared at completion; the inspector told only THAT they differ, question by question | `-304` Q3 A; CF2 inspector row; PM25 (a) | **MATCH** (ruled; the comparable form is the author's engineering) |
| 3. The head's letter on EVERY full visit (SW25), not only when nobody was asked | CF4 A (3): *"otherwise nobody"* | **WIDENS CF4 A (3)'s trigger**, ⛔ its substance: it collects the same letter from the same person; it asks the INSPECTOR one more question and discloses nothing new about anyone. Already an author-commit (`-330` SW25, BigDev "all A") ⇒ ⛔ new Panel question; recorded here because the widening is real |
| 4. Answers saved to the server as the visit goes; keyed code indexes on both sides | — | **the AUTHOR's** (engineering: stripped of citations it is "the server stores the same answers it was always going to, plus a hash per option") |
| 5. Who READS the family's cause / illness (IQ7) | `-304` Q3 A: *"the answer is shown to staff as context only"* (the NEIGHBOURS'); CF2 lists who sees the NEIGHBOURS' answers; ⛔ no ruling names who sees the FAMILY's | **UNRULED — MATCH IN AUDIENCE, NEW IN SOURCE.** The proposal gives the family's answers EXACTLY the neighbours' audience (no new viewer, one assembler, one hide). Under the template's first test (*"what the Trust DISCLOSES about a person, or to whom"*) this is the Panel's IF the audience widens; it does ⛔ widen. ⇒ built as the author's, with a **NON-BLOCKING confirm recommended** (IQ7) and the data held behind Row 42 until counsel's basis is recorded |
| 6. A "has the family filed any other claim?" question | no ruling | **NOT BUILT here** (IQ2): the validator admits a question only on a Panel-ratified `approvedBy`; the Panel's own route for a new question is `-304` Q8's CHAIN (row 6-33). Shipping it in code would be the author adding a question outside the chain the Panel ruled |
| 7. "Offline saving at the visit" | no ruling; architecture §4.5a: *"Mutations … requiring server-confirmed outcome … require network and fail with a retry prompt if offline"* | **the AUTHOR's / BigDev's scope** (IQ8) — ⛔ a Panel matter |
| 8. Does a MISSING letter hold an approval when nobody could be asked? (IQ13) | CF4 A (3): *"otherwise nobody — the ground inspection carries the claim and the inspector collects a letter from the head of the school or office."* (Trustee-ratified; it says the inspector COLLECTS, and is ⛔ silent on approval); `-308` call 2 (author-commit): *"the head's letter when ⛔ no one can be asked"* listed among *"the hard checks"*; 6.36's record: *"approvable WITHOUT the letter until 6-32 is `done`"*; FR-40: *"school principal letter optional"* | **UNSETTLED — the record points both ways.** (A) optional ⇒ MATCHES FR-40 and CF4 A (3)'s words, but NARROWS `-308` call 2's "hard check" (an author-commit ⇒ superseded IN PART by the Task 0.3 entry, ⛔ re-read) and states plainly that 6.36's sentence is ⛔ carried out. (B) a gate ⇒ a NEW conjunct on the approval for a no-one-asked claim — it changes WHO IS PAID (a family whose head of school will not write is ⛔ paid) ⇒ **the Panel's** under the template's first test, and it touches 6.26a invariant 2 (*"ONE gate, ONE conjunct"*). ⇒ IQ13 is answered FIRST; (B) routes a Panel note from the template BEFORE any code. **✅ ANSWERED (A)** (BigDev, 2026-10-28) ⇒ the AUTHOR's: ⛔ a Panel question; `-308` call 2 superseded in part by the Task 0.3 entry |

## FOUND FACTS (G) — traced at `4e57fa42`

- **G1 — the engine (`packages/domain/src/questionnaires/`).** PURE (no `db`/`pg`/`drizzle`; a reachability test proves it). `QUESTIONNAIRE_KINDS =
  ['peer_mesh','ground_inspection']` (`types.ts`); question kinds `single | multi | date | yes_no`. **Versions are CODE**: `QUESTIONNAIRE_REGISTRY`
  (`registry.ts`) is a hard-coded array of `PEER_MESH_QUESTIONNAIRE_V1..V4`, validated at module load; `resolveLiveVersion(kind, pariwarId)`
  takes an optional `registry` (tests inject); for `ground_inspection` it returns `null` today. `servedDefinition(def)` skips every question
  whose `counselBasis` is `'pending'` and its `showIf` dependants. `checkAnswer(served, key, value, live, todayIst)` validates one answer and
  returns its STORAGE form (`codes`, or `encrypted` plaintext + optional date window).
- **G2 — the validator (`validator.ts`).** Applies to every kind: `approvedBy` (version AND each question) must be in
  `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS` (`keys.ts`: `-262 -263 -303 -304 -328 -331`) — ⚠ **`-310` and `-307` are NOT listed**; `warning` only on
  keys of `warningKeysFor(kind)` (`[]` for `ground_inspection`); a `health` question carries `counselBasis` (`'pending'` | a decision id) and is
  `sensitive`; a `date` question is `sensitive`; no alcohol (`FORBIDDEN_TOPIC_RE`); `showIf` only to an EARLIER key; pages of 1–3 questions. The
  seven-key / `has_died`-first / v2+ rules are `peer_mesh`-ONLY — `ground_inspection` has no rule of its own (G1's `null`).
- **G3 — the ruled codes already exist** in `peer-mesh.ts` (v2+): `death_cause` — `illness_long, illness_sudden, old_age, accident, suicide,
  killed, other, dont_know` (`single`, showIf `has_died ∈ {died}`); `death_illness` — `cancer, heart_disease, diabetes, kidney_disease,
  liver_disease, tb, stroke_paralysis, lung_disease, other, dont_know` (`multi`, `dont_know` exclusive, showIf `death_cause ∈ {illness_long,
  illness_sudden}`). Both `sensitive: true, health: true, counselBasis: 'pending'`, `approvedBy: [-304]`. Words: `peer_request_questions.death_cause.*` /
  `.death_illness.*` in `packages/i18n/locales/{en,hi}/claim.json` (flat dotted keys; the Hindi is ⛔ human-reviewed).
- **G4 — the neighbours' health answers do not exist yet, and cannot until counsel.** In `peer_mesh.v4` (LIVE) `death_cause` / `death_illness` are
  `counselBasis: 'pending'` ⇒ `servedDefinition` skips them ⇒ ⛔ no neighbour is ever shown them ⇒ ⛔ no row exists (6.27c's sweep and child HOLD while
  either is pending — AC2b). ⇒ **adding a column to `claim_peer_mesh_reply_answers` needs NO backfill** (state it; ⛔ do not write one).
- **G5 — the neighbours' answer table** (`0156`): `claim_peer_mesh_reply_answers` — `value_codes text[]` XOR `value_ciphertext` (CHECK `one_value`),
  `death_date_window_indexes text[]` (CHECK `indexes_check`: ONLY `question_key = 'death_date'`, beside its ciphertext, always three), append-only
  trigger, ONE live row per (reply, key) (`_live_uq`), `saved_at` / `superseded_at` = `clock_timestamp()`. Sensitive answers are Tier-1
  (`PEER_MESH_ANSWER_FIELD_CLASS = 'peer_mesh_answer'`); `0158` CHECKs the lockstep with `PEER_MESH_SENSITIVE_QUESTION_KEYS`. `GRANT UPDATE
  ("superseded_at", "value_ciphertext", "death_date_window_indexes")` — the anonymizer's scrub columns. The neighbours' WRITER
  (`apps/api/src/modules/claims/peer-request-core.ts`, ~`:258-262`) computes the window indexes through `deathDateBlindIndex` in the HANDLER, BEFORE
  the domain writer's locks (Trap 9: ⛔ no KMS under a lock) and detects an UNCHANGED answer from the decrypted live value.
- **G6 — the comparison seam (`claim/inspection-discrepancy.ts`).** `INSPECTION_DISCREPANCY_RULES` has `has_died: 'compare'`, `death_date: 'compare'`,
  `death_cause: 'not_comparable'`, `death_illness: 'not_comparable'` (each with the doc-line *"Owed by row 6-32 — the family side and a keyed
  comparable form"*). ONE per-answer predicate `peerAnswerDiffers(answer, referenceDateIndex)` is SHARED with 6.27b's `derivePeerReplyWarningKeys` (⛔
  never call that with the family's index — it mints `peer_*` WARNING keys). `inspectionDiscrepancyAnswersSql(pariwarRef, claimRef, asOf)` reads ONLY
  `value_codes` + `death_date_window_indexes` of the claim's neighbour answers (⛔ never `value_ciphertext`), live or as of `completed_at`.
  `deriveInspectionDiscrepancy({answers, familyDateIndex})` returns the differing keys in `INSPECTION_DISCREPANCY_COMPARED_KEYS` order (derived from the
  rule table) — ⛔ values, ⛔ who, ⛔ a count. `InspectionDiscrepancyKey = 'has_died' | 'death_date'`. ⚠ `INSPECTION_DISCREPANCY_QUESTION_KEYS` is ⛔ in
  this file: it lives in `schema/claim_ground_inspection_discrepancies.ts:25` AND contracts `verifier-console.ts:276` (both `['has_died','death_date']`).
  The module is a LEAF (drizzle + `questionnaires/keys.ts` only); the fence (`nominee-name-no-comparison-fence.test.ts`) bars `../encryption` and
  `\bkms\b` in BOTH this file and `ground-inspection-persist.ts`, the SUBSTRING `ciphertext` in this file, and the medical module in both.
- **G7 — the discrepancy tables (`0160`).** `claim_ground_inspection_discrepancy_showings` (PK `ground_inspection_id`; `question_keys text[]`, CHECK
  `<@ ARRAY['has_died','death_date']`; `shown_at`) and `…_notes` (UNIQUE `(ground_inspection_id, question_key)`, CHECK `question_key IN
  ('has_died','death_date')`; Tier-1 `note_ciphertext`; the erasure-only `GRANT UPDATE ("note_ciphertext")` + its UPDATE policy, `-279` A12). BEFORE
  INSERT guards require the parent `completed` AND `family_statement`; a note's key must be in the showing. **Both CHECKs must widen** (deferred-work) —
  by name: `claim_gi_discrepancy_showings_question_keys_check` and `claim_gi_discrepancy_notes_question_key_check`.
- **G7a — the neighbours' answer GUARD names the erasure columns.** `claim_peer_mesh_reply_answers_guard` (0156:210-259) admits an UPDATE as the erasure
  scrub only when `to_jsonb(NEW) - 'value_ciphertext' - 'death_date_window_indexes'` equals the same of OLD; any other column change falls to *"an answer row is
  append-only"*. ⇒ a new `value_code_indexes` column that the anonymizer NULLs makes the scrub RAISE unless the migration REPLACES the guard function to admit
  that column → NULL (TR14).
- **G8 — the completion (`claim/ground-inspection-persist.ts` `completeGroundInspection`).** Locks assignment → claim (`lockClaimInWindow`) → the inspector
  guard; requires ≥ 1 photo, ≥ 1 `original_certificate` photo, a verdict, the compared-certificate upload id still current, a real non-future death date
  whose source matches the stage; runs the discrepancy INSIDE the tx; `completed_at = clock_timestamp()`. **No questionnaire or findings content is
  checked** (`structuredFindings` is optional and the admin page never writes it — `recordGroundInspectionFindings` in `client.ts` has no caller).
  The approval gate reads ONLY assignments (`ground-inspection-approval.ts`: `complete ⇔ VISITED ∧ ORIGINAL_SEEN`).
- **G9 — the surface is the ADMIN WEB console, not the mobile app.** `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`
  (route `/p/$pariwarId/ground-inspection`, `router.tsx`): the inspector types a claim case id + one of district / block; each `AssignmentCard`
  holds `PhotoUpload`, `CompleteAction` (verdict + date + time held in local `useState`, sent in ONE `POST …/complete`), `RefuseAction`,
  `InspectorRecord` and `DiscrepancyPanel` (per-key copy hard-coded as a TWO-way ternary: `has_died` else the date string). This module's chrome copy
  is English-only (`i18n-en.ts`, a `resolveEn` map; the module dir holds only that and the page). ⚠ The admin app DOES use `@twt/i18n` elsewhere —
  `modules/helpline-claims/i18n-en.ts:10` (`readBackScript`, en + hi) rendered in `HelplineClaimContact.tsx:474-475` — the precedent for a Hindi line
  under an English one. **The served-questionnaire precedent:** `modules/helpline-claims/HelplinePeerRequests.tsx` renders the neighbours' served definition
  (`q.words.en`, `:303,:367`) with `PeerAnswerEditor` from `@twt/api-client` and an `isShownFor` showIf helper (`:39`); the words come from
  `toWireQuestionnaire` (`apps/api/src/modules/claims/peer-request-core.ts:101-122`, `t(copyKey, {member}, {locale:'en'|'hi', namespace:'claim'})`).
  `apps/mobile` has ⛔ any inspector screen.
- **G10 — OFFLINE: NOT FOUND, and not buildable on this surface today.** Grepped `apps/admin` for offline / `navigator.onLine` / service worker /
  IndexedDB / localStorage / sessionStorage / workbox / persist: only comments ("NO IndexedDB persister", `hooks.ts`) and TanStack paused-query
  handling; `createQueryClient` is `staleTime: 0, gcTime: 0, retry: false`; no PWA dependency, manifest or write queue. Architecture §4.5a puts
  the queue on MOBILE (MMKV) and says *"Mutations … requiring server-confirmed outcome … fail with a retry prompt if offline"*; the field-worker surface is
  *"Scope deferred"*. `completeGroundInspection` re-checks the CURRENT certificate under the claim lock and carries NO Idempotency-Key — a retry is
  `409 not_active`, so a queued replay is ⛔ idempotent today. ⇒ **IQ8**.
- **G11 — who the inspector is.** No "inspector" role: a free-text `inspector_actor_id` on the assignment. `claim.conduct_ground_inspection` gates every
  GI route (`district_admin`, `block_admin`; `super_admin` all keys); `claim.override_ground_inspection` (held by `pariwar_admin` + `super_admin`) lets
  someone act on an assignment that is not theirs; `resolveInspectorOverride` (`handlers.ts`) is the identity guard; geo scope via `blockAware`
  (`routes.ts`). ⚠ `resolveInspectorOverride` checks the override at `dimension: 'district'` only (`handlers.ts:267`), and `pariwar_admin` holds the
  override but ⛔ `claim.conduct_ground_inspection` — so it cannot pass the route gate alone. ⛔ No step-up on any GI route. **Transaction + audit
  pattern:** every GI handler opens its OWN `openScopeTx(deps, ctx.pariwarId)` / `closeScopeTx` (`multi-tenant/scope-tx.ts:35`) and audits AFTER the
  commit with `emitAuthAudit` (codes and counts only, `admin_ground_inspection.*`); every action name is in the union at
  `apps/api/src/audit/audit-sink.ts:436-450`. (The neighbours' save handlers use the OTHER pattern — `request.scopeTx` + `withCompensatingAudit` — ⛔ mix
  them.) The discrepancy GET and the list read write ⛔ an audit line today.
- **G12 — events and gates.** `claim.ground_inspection_scheduled` / `_completed` only (`packages/events/src/registry.ts`; payload `ground_inspection_id`
  + `photo_count`); the discrepancy emits ⛔ an event. `CLAIM_EVENT_TYPES` has 37 entries pinned by `toHaveLength(37)` (`dpdpa-consent-events.test.ts`).
  No golden / OpenAPI snapshot exists; `route-registry.ts` + `login-wall.spec.ts` + `forced-pagination.spec.ts` check every route's session gate and bounded
  pages. The access-wrapper scan (`scripts/access-wrapper-invariants/check.ts` `CLAIM_ROOTS`) covers `apps/api/src/modules/claims`, `…/nominee` +
  `packages/domain/src/claim`. ⚠ `claims.ground-inspection.routes.ts` is on `ENROLMENT_OWED` in `scripts/claim-adjudication-human-actor-invariant/check.ts:293-296`
  — ⛔ enrolled, so that gate asserts NOTHING about a GI route today (green there proves nothing — [[feedback_gate_scope_semantic_coverage]]).
- **G13 — erasure.** `member/anonymize.ts:337-389` (inside `if (deceasedClaimIds.length > 0)`) scrubs the inspection's death date / time ciphertext
  (sentinel) and `death_date_index` (NULL), the neighbours' answer ciphertext (sentinel) and window indexes (NULL), and the discrepancy notes (sentinel).
  ⚠ It does ⛔ scrub the inspection's OTHER Tier-1 columns (location, family contact, notes, photo captions — `:334-336` says so); ⛔ this story's to
  change. The statement pin is `tests/member/rtbf-anonymize.test.ts:248` `toHaveLength(30)` and `:290` 27 tables (the title at `:149` is stale). A NEW
  Tier-1 table needs its OWN arm, its UPDATE policy and column grants (`-279` A12: without the policy the scrub silently updates 0 rows under FORCE RLS).
- **G13a — `checkAnswer`'s storage form.** For a `sensitive` single / multi answer it returns `{ form: 'encrypted', plaintext: JSON.stringify(codes),
  dateWindow: null }` AND the normalized `codes` at the top level (`answers.ts:27, :96-99`); an exclusive option combined with another code is refused
  `invalid_value` (`:86-88`).
- **G13b — field classes have NO registry.** They are plain string consts; several have by-value twins (`CLAIM_GROUND_INSPECTION_FIELD_CLASS =
  'ground_inspection'` is in `apps/api/src/context.ts:191`, ⛔ in domain; `anonymize.ts:114` holds `FIELD_CLASS_GROUND_INSPECTION`). The test fake is
  `createFakeKmsProvider({ kekBytes, hmacKeyBytes })` (`encryption/fake-kms-provider.ts:17`). `blindIndexMany(fieldClass, plaintexts, {pariwarId}, kms,
  hmacKeyRef, audit, limiter?)` writes ONE audit line and must ⛔ run inside a transaction.
- **G14 — blind-index machinery.** `encryption.blindIndex(fieldClass, value, {pariwarId}, kms, hmacKeyRef)` and `encryption.blindIndexMany(...)`
  (`packages/domain/src/encryption/blind-index.ts`); field classes are declared ONCE in `encryption/field-classes.ts`. `DEATH_DATE_INDEX_FIELD_CLASS`
  is deliberately shared by two tables (a second literal ⇒ every comparison "differs"). The family's date index is `death_date_index` on the assignment.
- **G15 — the roster.** `docs/launch-gate-inventory/inventory-roster.md`: highest row `41`; Row 27 (`peer-mesh-request-counsel-basis`) holds the
  neighbours' health data (f) and evidence line (5) for the discrepancy notes; Row 28 the Hindi review of 6.27's texts; ⛔ any row names 6-32. 6.36
  recorded (*"Recorded, ⛔ built here"*): after 6.36 *"a claim with nobody to ask is inspected and approvable WITHOUT the letter until 6-32 is `done`.
  ⛔ Not in production. ⭐ A launch-gate row making 6-32 a go-live predecessor was PROPOSED to BigDev on 2026-10-15 (BigDev adds it)"* — ⛔ NOT in the roster.
- **G16 — stale pointers to 6-32 (recorded, not routed).** `claim_peer_mesh_selections.ts` (`deceasedWorkplaceId` / `deceasedPreviousWorkplaceId`:
  *"row 6-32 reads it"*) and `peer-mesh-read.ts` (*"stored for row 6-32"*) pre-date SW25. Under SW25 the letter is asked on EVERY full visit ⇒ **this
  story reads NONE of the selection's columns**. `deferred-work.md` 6.36 **W1** (no DB backstop for the two workplace-id columns — *"Trigger: row 6-32
  (the columns' reader)"*) therefore stays **OPEN, its trigger ⛔ pulled** (Task 9.4 records that precisely; ⛔ "closed by 6-32").

## ⚖️ Build decisions IQ1–IQ13 (✅ DECIDED — all as recommended, [`-413`](../../.decision-log.md#decision-2026-10-28-413))

Every IQ below is DECIDED as its recommended option: IQ2 (A), IQ3 (A), IQ7 (A), IQ8 (A), IQ13 (A); the rest as written. The options ⛔ taken are kept
as the question was put. `-413` supersedes `-308` call 2 in part (IQ13) and `-319` OP14 in part (IQ2).

- **IQ1 — v1 carries only the RULED questions: `death_cause`, `death_illness`, `head_letter`.** `ground_inspection.v1`, scope `all`, status `live`, in a NEW
  `questionnaires/ground-inspection.ts` (reviewed CODE until row 6-33, as `peer-mesh.ts` is). Pages: (1) `head_letter`; (2) `death_cause`; (3)
  `death_illness`. `death_cause` / `death_illness` copy the peer definitions' CODES verbatim (G3) with `showIf: null` for cause (the family has no
  `has_died`) and illness `showIf death_cause ∈ {illness_long, illness_sudden}`; both `optional: true`, `warning: false`, `sensitive: true, health: true,
  counselBasis: 'pending'`, `approvedBy: ['2026-10-10-304']`; `dont_know` is `exclusive` on illness (the `opts(key, codes, exclusive)` shape). `head_letter`:
  `single`, codes `collected` / `not_collected`, `optional: true`, `showIf: null`, `sensitive: false`,
  `health: false`, `warning: false` (the validator already refuses `warning: true` on EVERY `ground_inspection` key — `validator.ts:90`), `approvedBy: ['2026-10-10-310']` (CF4 A (3) — Trustee-ratified; ADD `2026-10-10-310` to
  `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS` — a reviewed code edit that cites it, as that list's own doc-comment requires). The version's `approvedBy`:
  `['2026-10-10-304','2026-10-10-310']`. The version's `closingNoteCopyKey` / `thankYouCopyKey` are REQUIRED (`validator.ts:134`; the copy-key test
  `questionnaires.test.ts:384-394` needs both in en AND hi; the wire `PeerRequestQuestionnaire` requires `closingNote` / `thankYou`):
  `inspector_questions.closing_note` (the inspector's line to the family at the end — *"Thank you. These answers are only background for the Trust's
  staff; they never delay or decide the claim."*-style, the family's-terms sentence of the Policy meaning) and `inspector_questions.thank_you` (the
  panel's "answers saved" line). **Shipped state:** cause and illness are `'pending'` ⇒ the SERVED definition is the letter question ALONE until
  Row 42 (a) closes — a test pins that (TR7). *Why only these:* the validator admits a question only on a Panel-ratified id; the Panel's route for any
  other is the chain (IQ2).
- **IQ2 — ⭐ BigDev: *"Has the family filed any other claim for this death?"* (6.28 OP14 (d), "yes, fold it") — where does it go?** (A, recommended) **It
  waits for row 6-33's chain** — the Super Admin "can add question directly and make it live" (`-304` Q8), which is exactly the Panel's route for a
  question it has not ruled; recorded as a precise deferral on OP14 (d) and on this row (Task 9), ⛔ "folded" and ⛔ closed. *Cost:* the extra signal OP14 (d)
  wanted is absent until 6-33 lands; 6.28's OP2 / OP4 are the control and are ⛔ affected. (A) changes the routing `-319` OP14 committed *"as written"* ⇒ the
  Task 0.3 entry supersedes `-319` OP14 IN PART (the (d) routing only). (B) Put a one-line ratification to the Panel and ship it in v1
  (template §0: *"what the Trust COLLECTS about a family from others"*). *Cost:* a Panel round trip, for a non-health, non-warning question. (C) Add the
  author-commit id to the validator's allow-list for non-health questions. *Cost:* the author adds questions in code OUTSIDE the chain the Panel ruled —
  **not recommended**; it is the exact bypass Q7 / Q8 were ruled to prevent. ⛔ Silently dropped: BigDev said "fold it", so the answer is recorded in the
  author-commit either way.
- **IQ3 — ⭐ BigDev: what is recorded about the head's letter?** (A, recommended) **Only the answer**: `collected` / `not_collected` (+ who and when, from
  the answer row). The letter's own photograph is ⛔ taken in this story. *Why:* the photo kinds today are `site` and `original_certificate`
  (`claim_ground_inspection_photos.ts`); a third kind (`head_letter`) is a third-party document about a member, stored — new enum value (delegated by `-210`
  cl. 2), new counsel scope, and NO decision says WHERE the original letter is kept. *Cost:* an approver sees "Letter: collected" but ⛔ the letter. (B) Add
  the photo kind now (PRD FR-40: *"school principal letter optional"* lists it beside the photo of the family). *Cost:* its own migration (enum values in their
  OWN migration — 6.26a Trap 6), the upload route and the console's photo list, and a Row 42 leg for third-party documents. Recorded as a deferred item with
  trigger *"BigDev says where the letter is kept"* under (A). In EITHER: the answer is OPTIONAL to RECORD; whether a MISSING letter holds an approval is
  IQ13's, ⛔ this item's.
- **IQ4 — the comparable form: a keyed blind index per option code, on BOTH sides, scoped to the CLAIM.** New field class `ANSWER_CODE_INDEX_FIELD_CLASS =
  'answer_code'` declared ONCE in `encryption/field-classes.ts` (G14: ⛔ a second literal). Index of one code = `blindIndex('answer_code',
  `${claimCaseId}|${questionKey}|${code}`, {pariwarId}, …)` — the **claim case id and the question key are IN the hashed value**, so equal answers on two
  claims have DIFFERENT indexes (a DB reader cannot see "the same cause on a hundred claims" — unlike the date index, which is deliberately cross-claim for OP14).
  `value_code_indexes text[]` = one index per selected code, written ONLY for `death_cause` / `death_illness`, ONLY beside a `value_ciphertext`, and **NULL when
  the answer includes `dont_know`** (so *"I don't know"* is ⛔ compared — §0/PM25 "`I don't know` never counts"; decided at WRITE time, ⛔ by reading a
  ciphertext). Both the indexes and the `dont_know` test are built from `checkAnswer`'s top-level `codes` (G13a) — ⛔ parse the `plaintext` JSON.
  `'answer_code'` has NO registry to join (G13b): the "one literal" pin is a GREP over `packages/` + `apps/` (excluding the declaration), and a by-value
  twin of THIS class is forbidden (unlike the existing classes' twins). Computed in the HANDLER before the writer's locks with `blindIndexMany` (one batched KMS call — [[project_kms_audit_per_hmac_global_lock]]; ≤ 10
  codes). The neighbours' table gains the column (G4: no backfill); the new family table has it from day one.
- **IQ5 — the family's answers are their own pair of tables (⛔ columns on the assignment).** `claim_ground_inspection_questionnaires` (header: PK
  `ground_inspection_id`, `pariwar_id`, `claim_case_id`, `questionnaire_version_id` text CHECK `^[a-z_]+\.v[0-9]+$`, `started_at`; FK to the assignment's
  `owner_uq (pariwar_id, ground_inspection_id, claim_case_id)`) pins the version at the FIRST save (the neighbours' `claim_peer_mesh_replies` precedent: a newer
  version applies to new visits only). `claim_ground_inspection_answers`: `answer_id`, `pariwar_id`, `claim_case_id`, `ground_inspection_id`, `question_key`,
  `value_codes text[]` XOR `value_ciphertext` (CHECK — the Tier-1 keys `death_cause` / `death_illness` are ALWAYS ciphertext, in lockstep with a CHECK like `0158`),
  `value_code_indexes text[]` (IQ4), `saved_by_actor_id`, `saved_at` / `superseded_at` (`clock_timestamp()`), ONE live row per (assignment, key); append-only
  trigger; BEFORE INSERT guard: the parent assignment is `scheduled`, its stage is ⛔ `certificate_check`, and `claim_peer_mesh_answer_window_open` holds (the
  same ONE window as `answer-window.ts` — ⛔ re-composed); RLS per-command (ENABLE + FORCE, no DELETE policy, ⛔ `FOR ALL`); erasure-only `GRANT UPDATE
  ("value_ciphertext","value_code_indexes")` + the UPDATE policy; the append-only guard's erasure arm names BOTH columns from day one (G7a). Field class:
  the EXISTING `'ground_inspection'` (`CLAIM_GROUND_INSPECTION_FIELD_CLASS`, `apps/api/src/context.ts:191` — reachable from the HANDLER, which is where the
  encryption happens; the domain writer receives ciphertext and never names a class) — ⛔ a new class (6.27d R6's reasoning: same inspector, same visit; a new class is three un-gated edit sites).
- **IQ6 — what "differs" means for ③ / ④ — ONE rule: both answers are DEFINITE and share NO option code.** In SQL: `a.indexes IS NOT NULL AND b.indexes IS NOT
  NULL AND NOT (a.indexes && b.indexes)` (array overlap) — the same expression serves the single cause (arrays of length 1) and the multi-select illness. So
  *family: cancer* vs *neighbour: cancer + diabetes* ⇒ ⛔ differs (they share cancer); *family: cancer* vs *neighbour: TB* ⇒ differs; either side
  *"I don't know"*, NULL (erased) or ⛔ answered ⇒ ⛔ compared. *Cost:* two overlapping-but-unequal illness lists are treated as a match — fewer re-asks, one
  possible missed nuance; an exact-set rule would over-prompt on every partial list neighbours naturally give. The rule only decides whether the inspector
  is asked to re-ask; it gates ⛔ nothing (I1).
- **IQ7 — ⭐ BigDev: who READS the family's cause and illness?** (A, recommended) **Exactly the neighbours' audience (CF2), through the ONE assembler**:
  `assemblePeerSection` (`peer-answers-assembler.ts`) gains a `familyAccount` block beside the neighbours' answers — the District Admin and the district's
  verifiers; whoever approves at a later step, for that claim at that step only — AFTER the SAME PM25 (c) hide (so a hidden actor sees ⛔ nothing, and the
  section stays ONE withholding rule — [[feedback_withholding_must_be_uniform]]); ⛔ the claim-wide list read (`GET …/ground-inspection?district=|block=`, whose
  audience is every conduct-key holder at the locator — 6.27d R5's reason); ⛔ the family, the claimant, the nominee, any member, the public. The inspector
  who typed an answer reads it back (own record, decrypted in the handler, audited). *Match / widen / narrow:* **MATCH in audience** (`-310` CF2 for the
  neighbours' answers), **NEW in source** (CF2 is silent on the family's) — and `-304` Q3 A reads *"shown to staff as context only"* of the answer the
  inspector's question mirrors. A NON-BLOCKING confirm to the Panel is recommended (Task 0.4), ⛔ blocking: the data is held dark behind Row 42 (a) anyway.
  (B) store and compare ONLY — ⛔ approver read. *Cost:* the family's account never reaches the staff the Panel meant it for ("context") — the answers
  become write-only except for the inspector's own screen and the difference prompt.
- **IQ8 — ⭐ BigDev: "OFFLINE saving at the visit" (the 2026-10-10 row scope).** G10: no substrate, no ruling, completion cannot be offline. (A, recommended)
  **"Never lose what was typed to a momentary drop"**: each answer saves to the server on change (IQ10); a failed save is held in an IN-MEMORY per-assignment queue
  and retried (backoff + on `online`), serialized per question key; the page shows `Saved` / `Saving…` / `Not saved — retrying` per answer, warns before the tab is
  left with anything unsaved, and ⛔ stores ANY answer in the browser's storage (the answers are health information — Tier-1 at rest on the server; plaintext in
  `localStorage` / `sessionStorage` on a staff laptop would defeat that). *Cost:* closing the tab or losing power while offline loses the unsaved answers; ⛔
  true offline. (B) Build a real offline visit: an encrypted browser draft (WebCrypto, non-extractable key), a service worker / persisted query client, an
  Idempotency-Key on `complete`, replay ordering — a PRIMITIVE-sized story of its own, and `complete` would STILL need the server (G10). Recorded as deferred with
  trigger *"the field-worker surface is placed (architecture §4.1: 'Scope deferred')"*. (C) Drop "offline" from this row's description and say so in the ledger.
  ⚠ Whichever BigDev picks, the ledger line *"offline saving"* is corrected by a NEW dated entry (supersede, never reinterpret).
- **IQ9 — words and languages.** The family is asked in Hindi, the admin chrome is English: the served definition resolves each question's and option's words
  in BOTH languages on the server (as 6.27a does), under a NEW namespace `inspector_questions.*` in `packages/i18n/locales/{en,hi}/claim.json` (flat dotted
  keys, parity-gated) — **the same CODES as the neighbours' options, NEW copy keys** (the inspector asks the FAMILY: *"How did {member} die?"*-style wording,
  ⛔ a reuse of the neighbours' `peer_request_questions.*` keys, whose words address a neighbour). The panel shows the English line and, beneath it, the Hindi
  line for the inspector to read aloud. **REUSE, ⛔ rebuild:** the server resolves words exactly as `toWireQuestionnaire` does (extract or call it — ⛔ a
  second resolver); the panel follows `HelplinePeerRequests.tsx` (`PeerAnswerEditor`, `isShownFor`) and adds the `.hi` line that screen omits; the
  `@twt/i18n` precedent in admin is `helpline-claims/i18n-en.ts` (G9). The Hindi is ⛔ human-reviewed ⇒ Row 42 (b), not Row 28 (whose scope is 6.27's texts and screens). The page chrome stays
  English (`i18n-en.ts`, story-minted keys); ⛔ a Hindi admin chrome.
- **IQ10 — saving.** `PUT /api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection/:id/questionnaire/answers/:questionKey` body `{ codes: string[] }` (a
  `date` question does not exist in v1); `GET …/:id/questionnaire` returns the served definition (en + hi words), the pinned version, and the inspector's own live
  answers (decrypted in the handler, AFTER the tx). Last write wins; ⛔ an Idempotency-Key (a retry re-sends the same final value — safe by construction; the
  client serializes per key, so two in-flight PUTs of one key cannot race). Guards in order: conduct permission + geo (`blockAware`) → the assignment
  (`resolveGroundInspectionAssignment`) → `resolveInspectorOverride` (assigned inspector, or the override key — denial audited) → typed refusals: `409
  ground_inspection.not_active` (not `scheduled`), `409 ground_inspection.questionnaire_not_for_certificate_check`, `409 ground_inspection.not_allowed` (the
  window), `422 questionnaire.answer_invalid:<reason>` (the engine's `AnswerRefusalReason`), `404` when no live version. Lock order **assignment → claim**
  (6.26a Trap 1). ⛔ Step-up (none on any GI route, G11). **Pattern: the GI one** (G11) — the handler's own `openScopeTx` / `closeScopeTx`, KMS work
  (`encryptField` + `blindIndexMany`) BEFORE it, audit post-commit via `emitAuthAudit`; ⛔ `request.scopeTx` / `withCompensatingAudit`. An unchanged value is a
  no-op (the writer returns `written: false` before any insert, and ⛔ an audit line — the neighbours' writer's precedent, `peer-mesh-reply.ts:391-393`).
  Audit `admin_ground_inspection.questionnaire_answer_saved` (key, count — ⛔ a value) and `.questionnaire_read` (counts), both ADDED to the union in
  `apps/api/src/audit/audit-sink.ts:436-450`. ⛔ New permission key, ⛔ new claim event (GI16), ⛔ new member-facing string, ⛔ SMS.
- **IQ11 — Row 42.** `42` `ground-inspection-family-answers-live` in `docs/launch-gate-inventory/inventory-roster.md`, decision-authored by the
  Task 0.3 entry: (a) **counsel's basis** for collecting the family's cause and illness (health information from the family) AND the notes that hold the family's
  re-told account (the 6.27d notes table — move Row 27's evidence line (5) pointer here, ⛔ delete it); recording it is a reviewed edit of
  `ground-inspection.ts` setting `counselBasis` to the decision id of counsel's recorded basis + its test (the `peer-mesh.ts` v2 header's own procedure); (b) the
  **Hindi human review** of `inspector_questions.*`; (c) the **predecessor fence** 6.36 recorded as PROPOSED: *"a claim with nobody to ask is inspected and
  approvable WITHOUT the letter until 6-32 is `done`"* ⇒ this row cannot close while the story is not `done`; (d) the **Panel's non-blocking confirm** of IQ7, if
  sent. ⚠ "done" ≠ live: merge ≠ go-live ([[project_not_in_production_merge_is_not_golive]]).
- **IQ12 — pin and flip.** `resolveLiveVersion('ground_inspection', pariwarId)` is read at the FIRST save of an assignment and PINNED in the header (IQ5); when
  it returns `null` the screen shows NO questionnaire panel (today's behaviour, byte for byte); a later live version applies to NEW visits only (an old
  answer stays tied to its version and its words — the neighbours' rule). Row 6-33's database-backed versions replace the registry source WITHOUT a screen
  change: the served-definition shape and `resolveLiveVersion` are the seam (AC1).
- **IQ13 — ✅ ANSWERED (A), BigDev 2026-10-28: *"IQ13 A — keep the letter optional"*. When nobody could be asked about the death, does a MISSING head's
  letter hold the approval? — ⛔ No.** Recorded in the Task 0.3 entry, which supersedes `-308` call 2 IN PART and states that 6.36's sentence is ⛔ carried
  out. The question as put (kept for the record): §0 row 8
  quotes the record, which points both ways. **THE ONE FACT THAT DECIDES IT:** CF4 A (3), the only Trustee-ratified text, says the inspector *"collects"*
  the letter and is ⛔ silent on approval; the "hard check" wording is an AUTHOR-COMMIT (`-308` call 2). (A, recommended) **Recorded, ⛔ a gate**: the letter
  is asked on every full visit (SW25), its answer is shown to approvers (AC10), and a missing letter holds ⛔ nothing; the Task 0.3 entry supersedes `-308`
  call 2 IN PART (*"the head's letter when ⛔ no one can be asked"* leaves the hard-check list) and records that 6.36's *"approvable WITHOUT the letter until
  6-32 is `done`"* is ⛔ carried out. *Cost:* a no-one-asked claim rests on the inspection alone (FQ9 + ORIGINAL_SEEN) — the independent check CF4 A (3)
  named is collected but ⛔ enforced; a family whose head of school will not write is still paid. (B) **A gate for the no-one-asked case only**: a
  `claim.peer_mesh_none_to_ask` claim cannot be approved until a completed full visit records `head_letter = collected`. *Cost:* a new conjunct on
  6.26a's ONE gate (invariant 2 is amended, ⛔ bypassed — the conjunct goes INTO `groundInspectionApprovalState`, ⛔ a second "complete"); a family is
  ⛔ paid when a head refuses, is absent, or the school has closed — so it needs an exception path; it changes WHO IS PAID ⇒ **a Panel question** routed
  from `trustee-panel-routing-note-TEMPLATE.md` BEFORE any code; I1, AC4, AC10 and the Policy meaning are rewritten; the inspector must still learn
  ⛔ nothing about the neighbours (CF2) — the gate is server-side and ⛔ shown on the inspector's screen. (C) **Ask the Panel without a recommendation.**
  *Cost:* a round trip; the story waits. ⛔ Silently pick: either answer supersedes or routes something on the record.

## Invariants (I)

- **I1 — nothing gates.** The questionnaire is ⛔ in `groundInspectionApprovalState`, ⛔ in `completeGroundInspection`'s required list, ⛔ a warning kind
  (`APPROVAL_WARNING_KINDS` does not move), ⛔ a flag, ⛔ read by any approval, refusal, routing or payment path. A completed inspection with ZERO answers is
  `complete`; one with answers in total disagreement is `complete`; a no-one-asked claim with `head_letter` ⛔ collected (or ⛔ recorded) is `complete` (IQ13 (A)).
- **I2 — the inspector sees nothing about the neighbours before completing their own record** (CF2). The questionnaire's questions are IDENTICAL whatever the
  neighbours answered, and whether any were asked (SW25: the letter is asked on every full visit). ⛔ A question's presence, order or wording depends on
  neighbour data; ⛔ the panel reads `claim_peer_mesh_*`.
- **I3 — no decrypt in the comparison; no KMS under a lock.** Indexes are computed in the handler before the locks; the completion transaction compares index
  arrays only; the display value of ③ / ④ is decrypted in the handler AFTER the commit.
- **I4 — the ruled questions are never editable through the chain** (`-304` reading, CF3 (a)): `death_cause`, `death_illness` and `head_letter` are in every
  `ground_inspection` version (the validator, AC1).
- **I5 — the neighbours' side and the family's side use the SAME keys, codes and index function.** One field-class constant, one index helper, one rule.

## Acceptance Criteria

0. **AC0 — governance first.** ⛔ No code before Task 0.3's author-commit (IQ1–IQ13 as answered; it supersedes in part `-330` SW25's *"forward note"* only by
   REFINING it into IQ1 / IQ3, supersedes `-319` OP14 (the (d) routing) per IQ2's answer, supersedes `-308` call 2 in part per IQ13 (A) (answered 2026-10-28), and corrects the ledger's *"offline saving"* per IQ8 — each by a NEW dated entry, ⛔ an in-place
   edit). Row 42 and the epics.md `### Story 6.32` entry follow it (Task 0.4).
1. **AC1 — the engine's `ground_inspection` rule and v1.** `questionnaires/keys.ts` gains `GROUND_INSPECTION_RULED_QUESTION_KEYS = ['head_letter','death_cause',
   'death_illness']` and `2026-10-10-310` in `PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS`; `validator.ts` gains a `ground_inspection` block: all three ruled keys in EVERY
   version (I4); `death_cause` / `death_illness` `health: true` (⇒ sensitive ⇒ counsel) and their option CODES equal `peer_mesh`'s (a lockstep test — PM23 (a)
   "the SAME … codes"); `head_letter` is ⛔ `sensitive` / `health`; `warning` refused everywhere (already `[]`); the `peer_mesh` first-question / seven-key rules are
   ⛔ applied; **every `ground_inspection` question is `optional: true`** (I1 lives IN the validator so row 6-33's versions inherit it — TR11); `death_cause` /
   `death_illness` must be `sensitive: true` (today only health ⇒ sensitive is enforced for this kind — a `health: false` cause would pass). `ground-inspection.ts` exports `GROUND_INSPECTION_QUESTIONNAIRE_V1` (IQ1), registered LIVE; `resolveLiveVersion('ground_inspection', anyPariwar)`
   returns it; `servedDefinition(v1)` is the letter question ALONE while cause / illness are `'pending'` (TR7); `pendingCounselBasisKeys(v1)` lists both; v1's
   `closingNoteCopyKey` / `thankYouCopyKey` (IQ1) exist in en AND hi `claim.json`. The module
   stays PURE (the reachability test, G1). ⛔ A second v1 hand list of codes — derive from one const shared with `peer-mesh.ts`'s options where identical (or assert
   equality).
2. **AC2 — the store.** One migration (≥ `0188`, hand-authored, ⛔ regenerated — [[project_live_db_test_gotchas]]): the header and answers tables (IQ5) in the
   statement order CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes; `claim_peer_mesh_reply_answers.value_code_indexes text[]` with a CHECK
   (`question_key IN ('death_cause','death_illness') AND value_ciphertext IS NOT NULL`, the same shape on both tables), the column added to the erasure `GRANT
   UPDATE`, AND `claim_peer_mesh_reply_answers_guard` REPLACED (`CREATE OR REPLACE FUNCTION`) so its erasure arm admits `value_code_indexes` → NULL and still
   refuses any other change to it (G7a, TR14 — a live-DB leg: the scrub of a row carrying indexes succeeds; a non-NULL rewrite of the indexes is refused); the new
   answers table's guard admits the same two columns; `0160`'s two CHECKs widened to `has_died, death_date, death_cause, death_illness` (drop + add, same migration as the rule flip — TR4); the Tier-1 CHECK in
   lockstep with `PEER_MESH_SENSITIVE_QUESTION_KEYS`-style constants (a policy-spec leg pins them equal); the journal entry's `when` > every sibling's (TR9). Live-DB
   specs prove: an answer refused on a `completed` / `superseded` / `certificate_check` assignment; refused outside the window; ONE live row per (assignment, key);
   append-only; RLS isolation across Pariwars; ⛔ DELETE; the CHECKs refuse a plaintext `death_cause`.
3. **AC3 — the save and the read** (IQ10). Both routes with the guard order, typed refusals and audit actions of IQ10; enrolled in `route-registry.ts`; the login-wall and
   bounded-page specs stay green; the access-wrapper scan stays green with the new handlers (no direct `audit.writeAuditEntry`). ⚠ The GI routes file is on
   `ENROLMENT_OWED` in `scripts/claim-adjudication-human-actor-invariant` (G12) — its green says NOTHING here; the human-actor property of the two new routes is
   proven by this story's OWN route tests (a non-human actor is refused), and the `ENROLMENT_OWED` entry is ⛔ removed here (recorded as observed). A save by a stranger (no conduct key / wrong geo / not the assigned inspector and no override key) is 403 with the denial audited
   as `resolveInspectorOverride` already does. The save computes ciphertext AND indexes in the handler BEFORE `openScopeTx`'s locks (TR2).
4. **AC4 — completion is unchanged (I1).** `completeGroundInspection`'s required list, `groundInspectionApprovalState` and `projectClaimState` are ⛔ edited except for
   feeding ③ / ④ to the discrepancy (AC6). Tests: (a) a pure-table scenario that the approval state is `complete` for a completed full visit with no answers, with
   answers, and with a registered live version whose cause is `'pending'`; (b) a live-DB test that `complete` succeeds with ZERO answers on a visit whose pinned
   version has a recorded counsel basis; (c) a mutant — making `head_letter` required for completion — turns (a) / (b) RED; (d) the 37-event pin and the
   permission catalogue are ⛔ moved.
5. **AC5 — the comparable form, both sides** (IQ4). The family's writer and the neighbours' writer (`peer-request-core.ts`) compute `value_code_indexes` through ONE
   helper in `ground-inspection-crypto.ts` (or `encryption/`) using `ANSWER_CODE_INDEX_FIELD_CLASS`; `dont_know` ⇒ NULL; an unchanged neighbour answer keeps its indexes
   (the writer's `unchanged` branch); the anonymizer NULLs the column on both tables. A unit test with a REAL-shape fake KMS proves: the same (claim, key, code) hashes
   equal on both sides; a different claim, key or code does not; a `dont_know`-containing set stores NULL. A pin proves the field-class literal appears ONCE.
6. **AC6 — ③ / ④ are compared** (IQ6; 6.27d R1 / R2 / R3). `INSPECTION_DISCREPANCY_RULES.death_cause` / `.death_illness` flip to `'compare'`;
   `InspectionDiscrepancyKey` widens; `peerAnswerDiffers` gains the overlap branch (the family's indexes become a second parameter — ⛔ a second predicate; and
   ⛔ `derivePeerReplyWarningKeys` stays on dates only: 6.27b's warning kinds do not move); `inspectionDiscrepancyAnswersSql` also selects `value_code_indexes` and
   the family's live indexes are read under the completion's existing locks (assignment → claim); the as-of recompute equals the in-tx result (both ends on
   `clock_timestamp()`, TR8). Only a FULL visit (`death_date_source = 'family_statement'`) compares. The display values decrypt in the handler AFTER the commit and
   fall to `{ status: 'unavailable' }` on an erased / undecryptable value — ⛔ a sentinel, ⛔ a 500 (R3). The existing `has_died` / `death_date` behaviour is
   byte-for-byte unchanged (their tests are ⛔ edited except the intended lockstep legs, TR4). A mutant that compares through `value_ciphertext` turns the fence red.
7. **AC7 — the screens.** `GroundInspectionPage.tsx` renders, on a `scheduled` non-`certificate_check` assignment with a live version, a `QuestionnairePanel`
   (own file in the same module) BEFORE `CompleteAction`: per page, per served question, the English line, the Hindi line beneath, the options (single → radio, multi →
   checkboxes with `dont_know` exclusive), the per-answer state `Saved / Saving… / Not saved — retrying`, a leave-the-page warning while anything is unsaved, and the
   note that the questions are optional. No panel when `GET …/questionnaire` is 404 (IQ12). `CompleteAction` is ⛔ disabled by an unanswered question (I1). The
   `DiscrepancyPanel`'s per-key copy becomes a TABLE (`has_died`, `death_date`, `death_cause`, `death_illness`) — ⛔ another ternary (TR12); ③ / ④ read *"The family said:
   [their answer, in the option's English words]. A neighbour's answer differs."* beside the existing open-ended prompt, ⛔ a count, ⛔ who. One note box per differing
   key as today. Story-minted English keys in `i18n-en.ts`.
8. **AC8 — who reads the family's answers** (IQ7 A). The `familyAccount` block rides `assemblePeerSection` AFTER the PM25 (c) hide, appears on the console's
   neighbours' section and 6.27b's `GET …/peer-answers`, never on the claim-wide list, never to a hidden actor (the whole section is absent — uniform), audited as
   the section's read already is (a decrypt of health answers is ⛔ unaudited — the 6.27a S12 lesson). Contracts (`verifier-console.ts` and the `.strict()` peer-answers
   parse) widen in lockstep with the key list (TR5). ⛔ the family, the claimant, the nominee, other members, the public — a route-matrix spec.
9. **AC9 — erasure.** `anonymize.ts` scrubs the family's answers' `value_ciphertext` (a sentinel, in 0143's form) / `value_code_indexes` (NULL) and the neighbours'
   `value_code_indexes` (NULL — in the SAME statement as their ciphertext / window-index scrub, which the replaced guard admits, AC2); the RTBF pins move from 30
   statements / 27 tables by exactly the statements and tables added (and the stale `:149` title is corrected); the erasure of the notes (already built) is exercised for a ③ / ④ note.
10. **AC10 — the head's letter on every full visit.** `head_letter` is served on EVERY non-`certificate_check` assignment regardless of any neighbour selection (a test:
    the served definition is byte-identical with zero, three and five selected neighbours); the story READS none of `claim_peer_mesh_selections`' columns (a grep
    pin); an approver sees the answer as `Letter: collected / not collected / not recorded`; ⛔ it gates (IQ13 (A), I1) — AC4 (a) gains the row "a no-one-asked claim, completed full visit, `head_letter` not collected ⇒ `complete`", and the I1
    mutant (letter required) turns it red; IQ3 (A) records only the answer.
11. **AC11 — nothing else moves.** ⛔ New permission key, ⛔ new claim event, ⛔ new member-facing string or SMS template, ⛔ edit of 6.27b's warning kinds, ⛔ edit of
    `has_died` / `death_date` comparison semantics. **THE lockstep list — the ONE place it is kept (TR4 / TR5 / TR12 point here).** Each item changes deliberately,
    is named in the commit, and is ⛔ "fixed" by weakening the assertion:
    - *Sources that widen together:* `0160`'s two CHECKs (G7 names); `INSPECTION_DISCREPANCY_RULES` + `InspectionDiscrepancyKey` (`inspection-discrepancy.ts`);
      `INSPECTION_DISCREPANCY_QUESTION_KEYS` in `schema/claim_ground_inspection_discrepancies.ts:25` AND contracts `verifier-console.ts:276`; the `.strict()`
      `PeerMeshTranscript` (`verifier-console.ts:297-321`, + `familyAccount`) and `ClaimPeerAnswersResponse`; `apps/admin` `client.ts` key list; the
      `DiscrepancyPanel` copy table.
    - *Tests that go red ON PURPOSE:* `inspection-discrepancy.test.ts` (rule table; and `:45`, which asserts the compared keys EQUAL `PEER_MESH_WARNING_QUESTION_KEYS`
      — after the flip that is false BY DESIGN: rewrite it as "the warning keys ⊂ the compared keys, and `derivePeerReplyWarningKeys` mints only `has_died` /
      `death_date`", ⛔ delete it); `peer-answers-stitch.test.ts`; `ground-inspection-discrepancy-client.test.ts`; `questionnaires.test.ts:82` (the exact registry list)
      and `:94` (`resolveLiveVersion('ground_inspection')` is `null` → now v1); `nominee-name-no-comparison-fence.test.ts:201` (`FENCED_FILES.length` 54 → + the new
      modules this story fences); `rtbf-anonymize.test.ts:248` / `:290` (30 / 27, AC9); the policy-regression specs' key lists (`claim-peer-mesh-replies-policy-regression.spec.ts:550`,
      `claim-ground-inspection-discrepancy-policy-regression.spec.ts:125-126`); the contracts tests outside tsc ([[project_contracts_tests_outside_tsc]]).
    - *Unions that must gain entries:* the two audit actions in `apps/api/src/audit/audit-sink.ts:436-450`; `route-registry.ts` (two routes).
12. **AC12 — the proof.** Each AC has a test that is RED first and a named mutant that turns it red (I1's completion mutant; the overlap rule inverted; the index
    claim-scope removed; the hide bypassed; the dont_know NULL dropped; a plaintext cause stored). Live-DB specs on a fresh `twt_dev` (:5432 trap —
    [[project_prepush_hook_inherits_5432]]); `pnpm ci:local` green or an honest record ([[feedback_record_unattested_no_backfill]]); the admin page checked in a REAL
    browser against a local API (Task 8.4), ⛔ jsdom alone ([[feedback_stub_must_call_not_transcribe]]).
13. **AC13 — the records.** Row 42 minted; epics.md `### Story 6.32` written; `deferred-work.md`: the ③ / ④ item marked DISCHARGED (not deleted) when `done`; W1 annotated
    "trigger not pulled" (G16); the two new deferrals (IQ3 B, IQ8 B) with triggers; OP14 (d)'s dated pointer; the two stale source comments (G16) corrected in place;
    the ledger entry. Closure language is exact: "Closed by" / "deferred" / "not addressed" ([[feedback_closure_language_precision]]).

## Tasks / Subtasks

- [x] **Task 0 — governance first (AC0).** Nothing below starts before 0.3 is committed. ✅ DONE 2026-10-28 (0.3 = `-413`).
  - [x] 0.1 `git fetch origin`; rebase onto `origin/main` if it moved; `git diff --name-only 4e57fa42..HEAD -- packages apps scripts infra docs` — re-read any cited file that
        moved; re-grep the highest decision, migration, roster row and ledger letter on EVERY branch (NUMBERS block).
  - [x] 0.2 Put IQ1–IQ12 to BigDev; the four real asks (IQ2, IQ3, IQ7, IQ8) first, each with its honest cost (written above). IQ13 is answered (A) (2026-10-28).
        ✅ *"recommendation accepted for IQ1-IQ12"* (BigDev, 2026-10-28).
  - [x] 0.3 ONE author-commit decision entry (≥ `-413`), committed ALONE (`governance:` prefix): IQ1–IQ13 as answered; the supersessions by NEW dated entries (IQ2 →
        `-319` OP14 in part, IQ8, IQ13 (A) → `-308` call 2 in part); its §0 table (edges 1–8); "How much to trust this entry" naming what was traced vs inferred.
  - [x] 0.4 Records commit: roster Row 42 (IQ11); epics.md `### Story 6.32` (title, `[SURFACE] [PRIMITIVE]`, the ACs in brief, the minted-by-ruling banner); a dated
        pointer under 6.28 OP14 (d); `deferred-work.md` entries (IQ3 B, IQ8 B, W1 annotation); the ledger line. If IQ7 (A): draft the NON-BLOCKING confirm note FROM
        `trustee-panel-routing-note-TEMPLATE.md` (§0 first, the deciding fact first, an honest cost on every option) — ⛔ send it; BigDev sends.
- [x] **Task 1 — the engine (AC1).** `keys.ts` (rule keys, allow-list `-310`), `validator.ts` (`ground_inspection` block), `ground-inspection.ts` (v1), `registry.ts`
      (register), `index.ts` (export), the `inspector_questions.*` copy keys incl. `closing_note` / `thank_you` (en + hi — the module-load validation and the copy-key
      test need them), `questionnaires.test.ts` legs (validator refusals incl. a non-optional and a non-sensitive cause, lockstep codes with `peer_mesh`, served-skip,
      purity reachability, a mutant per rule; `:82` / `:94` updated per AC11).
- [x] **Task 2 — the store (AC2, AC9).** Schema files (`claim_ground_inspection_questionnaire.ts` NEW; `claim_peer_mesh_replies.ts` column; `claim_ground_inspection_discrepancies.ts` key
      list), the hand-authored migration (incl. `CREATE OR REPLACE FUNCTION` for `claim_peer_mesh_reply_answers_guard` — G7a / TR14), the journal entry,
      `anonymize.ts` arms, the RTBF pins, the policy-spec legs and live-DB specs (incl. the scrub of a neighbour row that carries indexes).
- [x] **Task 3 — the writer and the comparable form (AC3, AC5).** Domain writer `claim/ground-inspection-questionnaire.ts` (locks assignment → claim; `checkAnswer`; supersede then insert;
      ⛔ KMS); the ONE index helper + the field class; the neighbour writer's index feed; unit + live-DB tests.
- [x] **Task 4 — the comparison (AC6).** `inspection-discrepancy.ts` rule flip + overlap branch + SQL fragment + family side; `ground-inspection-persist.ts` feed under the existing locks;
      the as-of recompute; the display decrypt in the handler; widen 0160-bound TS lists; update the three lockstep tests deliberately.
- [x] **Task 5 — the API (AC3, AC8).** Routes + handlers (IQ10 — the GI transaction / audit pattern), `route-registry.ts`, the two audit actions in `audit-sink.ts`'s
      union, the served words via `toWireQuestionnaire` (⛔ a second resolver), `peer-answers-assembler.ts` `familyAccount` (+ `assemblePeerMeshSection`,
      `stitchPeerAnswerFlags`), `claims.verifier-console.handlers.ts` read ledger line (the bounded-reads pin, if the console gains a read), contracts.
- [x] **Task 6 — contracts and client (AC7, AC8).** `packages/contracts/src/claims/ground-inspection-questionnaire.ts` (NEW — REUSE `peer-request.ts`'s question wire schemas where
      identical, ⛔ copy), `verifier-console.ts` widening, `apps/admin/src/api/client.ts` + `hooks.ts` (the per-key serialized save + the in-memory retry queue, IQ8 A).
- [x] **Task 7 — the screens (AC7).** `QuestionnairePanel.tsx` (built on `HelplinePeerRequests.tsx`'s `PeerAnswerEditor` + `isShownFor` — ⛔ a fresh editor; adds the
      `.hi` line), the table-driven `DiscrepancyPanel` copy, `i18n-en.ts`, `packages/i18n/locales/{en,hi}/claim.json` `inspector_questions.*`
      (parity gate), the approver's `familyAccount` rendering in `NeighboursAnswersPanel.tsx` / `PeerMeshView.tsx`.
- [ ] **Task 8 — proof (AC4, AC10, AC12).** 8.1 unit + contracts + admin tests — incl. AC4 (a) the approval-state scenario table, AC5 the real-shape fake-KMS index test and the
      one-literal pin, AC6 the overlap-rule table (single, multi, `dont_know`, NULL, erased, partial overlap) and "every compared key has copy" (TR12), AC10 the served definition
      byte-identical with 0 / 3 / 5 selected neighbours and the grep pin that no `claim_peer_mesh_selections` column is read, TR13's no-browser-storage grep pin, AC1's purity
      reachability and `peer_mesh`-code lockstep; 8.2 live-DB specs — incl. AC2's refusals / RLS / CHECKs, AC4 (b) `complete` with zero answers, AC6's in-tx result EQUAL to the as-of
      recompute, AC8's route matrix (who gets the `familyAccount`, who gets nothing, a hidden actor gets the section absent), AC9's scrub incl. the neighbours' column; 8.3 mutants (one per
      AC12's list); 8.4 a real-browser pass (the admin dev server against a seeded local API
      on a throwaway database — claim with a full-visit assignment, answers saved with the network paused and restored, a completion with a ③ difference, the approver's read);
      8.5 `pnpm ci:local`; 8.6 fix-diff review.
- [x] **Task 9 — records (AC13).** 9.1 Row 42 evidence; 9.2 deferred-work discharge/annotation (exact language); 9.3 correct the two stale source comments (G16); 9.4 the W1 note
      ("trigger not pulled"); 9.5 Change Log + File List + the ledger entry (safe prepend — [[project_sprint_status_safe_prepend]]).

### Review Findings

Full three-layer code review, 2026-10-28, at `6bf6b5a3` against `main` (`64e01121`): Blind Hunter, Edge Case Hunter, Acceptance Auditor.
After deduplication: **0 decision-needed, 7 patch, 0 defer; 1 candidate dismissed**. All retained items are **MEDIUM / P2**; R6 and R7
are verification gaps, not demonstrated runtime bypasses. No Trustee Panel decision is needed. Product code was not changed by this review.

**Disposition (BigDev, 2026-10-28): option 2 — leave all seven findings as action items.** R1–R7 remain unchecked; no patches were applied.
The story status is `in-progress`, matching its sprint row; Task 8 and the real-browser evidence remain open.

- [x] [Review][Patch] **R1 — Warn before in-app transitions discard unsaved answers (MEDIUM; blind + edge).** The only leave guard is
  `beforeunload`; loading another claim or navigating within the app does not fire it. Unmount calls `editor.dispose()`, which clears queued edits.
  Completing the visit also removes the panel; completion can obtain the assignment lock before a queued/retrying save, after which the answer is
  refused as `not_active` and its draft disappears. Coordinate pending edits with these transitions: preserve/drain them where possible, or obtain
  explicit confirmation before discarding them. Keep completion possible with zero answers (I1); do not make any answer mandatory. Add regression
  coverage for both a claim/route change and completion during an outstanding save. **AC7, IQ8 (A).**
  [apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx:158; apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:468]
- [x] [Review][Patch] **R2 — Allow recovery from an unreadable saved answer (MEDIUM; blind + edge).** The writer requires decrypted codes for
  every live ciphertext row and classifies every absent decrypted value as a stale read. Once a health answer is erased, malformed or persistently
  undecryptable, even saving the unrelated head's letter or replacing that unreadable answer fails as `questionnaire_stale` on every attempt.
  Distinguish a changed pre-read row from a known unreadable value, preserve the dependency fail-closed check, and permit unrelated/replacement saves.
  Test unreadable cause/illness rows alongside a genuine concurrent stale read. Reachable when the health questions are enabled; the shipped v1
  still serves only the letter. **AC3/AC7, IQ8 (A).** [packages/domain/src/claim/ground-inspection-questionnaire.ts:197]
- [x] [Review][Patch] **R3 — Include zero-answer completed visits in the family's account (MEDIUM; blind + edge + auditor).**
  `readClaimFamilyAccount` starts from headers created on first save, then inner-joins answers. A completed full visit with zero answers therefore
  yields no account, and the staff component hides the whole block. In the shipped letter-only questionnaire, skipping the optional letter question
  never produces the required **Letter: not recorded** line. Include completed full visits without saved answers and exercise the actual reader plus
  staff view for a no-neighbour, zero-save visit. The existing component test supplies another answer and misses that state. **AC10, I1/AC4.**
  [packages/domain/src/claim/ground-inspection-questionnaire.ts:322; apps/admin/src/modules/claim-verification/PeerMeshView.tsx:31]
- [x] [Review][Patch] **R4 — Bind both new routes to the claim named in their path (MEDIUM; auditor).** Their shared resolver loads by
  `(pariwarId, ground_inspection_id)` only; neither new handler checks `claimCaseId`. A request naming claim A with an inspection for claim B reads or
  saves B's answers if the caller passes B's actual assignment/permission checks. This demonstrates a case-binding defect, not a permission bypass.
  Reject a mismatched path claim before reading or writing; test GET and PUT with two different claims. The resolver predates this story, but these
  two endpoints are new consumers and owe their own resource binding. **Load-bearing checklist family 12(a).**
  [apps/api/src/modules/claims/claims.ground-inspection.routes.ts:320; resolver at :178]
- [x] [Review][Patch] **R5 — Announce the per-answer save-state transitions (MEDIUM; auditor).** `Saving…`, `Not saved — retrying`, and
  `Saved` change inside an ordinary span without live-region semantics. The separate generic unsaved `role="status"` does not announce entry into
  retry or successful saving when it disappears. Provide a stable announcement region for the actual question/save state, and verify retry and success
  announcements as well as visible text. **AC7; load-bearing checklist family 13(d).**
  [apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx:232]
- [x] [Review][Patch] **R6 — Add the expressly required tampered/non-human actor route proof (MEDIUM; auditor; verification gap).**
  The new HTTP suite tests an absent session and ordinary permission/inspector denials, but never a populated session naming a nonexistent
  system/service actor. AC3 explicitly requires this story's own non-human denial proof because the shared human-actor invariant excludes this
  route file. Exercise GET and PUT with that tampered session, a positive human control, and no answer mutation on refusal. This review has not
  established a runtime actor bypass. **AC3; load-bearing checklist family 3.**
  [apps/api/tests/integration/claims/ground-inspection-questionnaire.spec.ts:313]
- [ ] [Review][Patch] **R7 — Complete the required real-browser pass against the local API (MEDIUM; auditor; verification gap).**
  Task 8.4 remains explicitly un-attested. Exercise a seeded full visit, interrupted saving and reconnection, completion with a cause/illness
  discrepancy using an isolated recorded-basis fixture, and the approver's read. Record actual evidence; keep this item open if the environment
  still cannot run it. The existing limitation record is honest and is not a false completion claim. **AC12 / Task 8.4.**
  [_bmad-output/implementation-artifacts/6-32-inspector-questionnaire-at-the-ground-inspection.md, Dev Agent Record / Debug Log References]

**Resolution (`bmad-dev-story 6.32`, 2026-10-28, review continuation):** R1–R6 FIXED — `c285bfcf` (R2, R3, R4, R6) and `b8f23db8`
(R1, R5); every new leg was run RED against the pre-fix code (R6 is a proof, so it passes on both — as written, "not a demonstrated bypass").
**R7 stays OPEN** — re-attempted: the agent's Chrome still shows its error page for a trivial local probe page (`127.0.0.1:5199`) that `curl`
from the same machine fetches; ⛔ attested, ⛔ faked. One finding the R2 leg surfaced, fixed in the same commit: `dependantsToSupersede`
superseded EVERY dependant whose condition did not hold after a change — so saving the unrelated letter beside an unreadable cause ERASED the
illness beneath it; it now follows only a CHANGED parent (identical for every all-known answer set, the neighbours' writer included).

**Verification performed by this review:** 138 tests passed across nine focused files: admin questionnaire/discrepancy (51), domain
answer-code indexes/questionnaire approval/fence/discrepancy/questionnaire definition (62), contracts peer answers/verifier console (25).
No live-DB suite, full `ci:local`, or real-browser pass was rerun. Existing live-DB test coverage below was inspected in source, not re-attested.
The recorded 35/36 CI run is qualified honestly and AC12 permits an honest CI record; it is not an additional finding.

**Load-bearing-invariant verdicts (touched families only):**

| Family | Verdict and evidence |
|---|---|
| 1 — State guards | Covered-by-test: questionnaire writer typed refusals and the questionnaire policy-regression suite's completed/superseded/certificate-check/window refusals. |
| 2 — Concurrency/idempotency | Covered-by-construction: saves and completion take the same assignment → claim locks; first-save pinning is serialized, identical values return without insertion, and the editor serializes saves. No new worker/redelivery path. R1 covers the missing UI coordination. |
| 3 — Tenant/actor boundaries | **REAL GAP: R6.** Tenant isolation is covered by the dedicated policy regression's cross-tenant/unscoped read and cross-tenant insert cases. |
| 5 — DB backstops | Covered-by-test: `claim-ground-inspection-questionnaire-policy-regression.spec.ts` checks FKs, CHECKs, grants, FORCE RLS, partial uniqueness, append-only rules and erasure. |
| 6 — Projection/snapshots | Covered-by-test/construction: first-save version pin/new-visit version test, explicit DTO field selection, and hidden-reader whole-section omission. R3 addresses the missing zero-answer projection. |
| 8 — Audit/attribution | Covered-by-test/construction: HTTP saved/unchanged audit test and authenticated actor attribution. IQ10 expressly specifies the existing GI post-commit audit pattern; AC11 forbids a new claim event. |
| 9 — Deliberate exceptions | Covered-by-construction: new routes retain conduct/geo/inspector-or-override checks and override attribution. R4 addresses case-resource binding. |
| 10 — Closure honesty | Covered-by-construction: browser and CI limitations are disclosed and Task 8 remains unchecked. R7 keeps the outstanding browser evidence open. |
| 11 — Benefit-gating policy | Covered-by-test: approval scenario table, zero-answer/not-collected completion cases, and source fences; the story states the member/family policy meaning. |
| 12 — Cross-member ownership | **REAL GAP: R4.** |
| 13 — Semantic accessibility | **REAL GAP: R5.** Native fieldsets/legends/labels/inputs and working buttons cover the other applicable surface semantics. |

**Dismissed candidate:** additional restrictions on hypothetical future versions' question kind/conditions were not promoted: shipped v1 is correct,
the questionnaire editing chain is not built here, and no explicit validator AC establishes the proposed additional restriction.

## Dev Notes

### Current state of the code this story changes (traced at `4e57fa42`)

| File | Today | This story | Must be preserved |
|---|---|---|---|
| `packages/domain/src/questionnaires/{keys,validator,registry,index}.ts` | `peer_mesh` rules only; `ground_inspection` kind declared, no version | add the `ground_inspection` rule, allow-list `-310`, register v1 | every `peer_mesh` rule and test; module purity; v1–v4 untouched |
| `packages/domain/src/claim/inspection-discrepancy.ts` | `has_died`, `death_date` compare; cause / illness `'not_comparable'` | flip two rules, overlap branch, family side, SQL fragment | the shared predicate with 6.27b; leaf imports; the three fences; ① / ② byte-identical |
| `packages/domain/src/claim/ground-inspection-persist.ts` | `completeGroundInspection` (G8) | feed ③ / ④ inputs to the in-tx comparison | the required list, the lock order, `completed_at = clock_timestamp()`, the guarded showing write |
| `packages/domain/src/schema/claim_peer_mesh_replies.ts` + `0156`/`0158` | `death_date_window_indexes` only | `value_code_indexes` + CHECK + grant | the append-only trigger, `one_value`, the `0158` lockstep |
| `packages/domain/src/schema/claim_ground_inspection_discrepancies.ts` + `0160` | keys `has_died`, `death_date` | widen the list and both CHECKs | the parent guards, the erasure-only grants and policy |
| `apps/api/src/modules/claims/peer-request-core.ts` | encrypts, computes the date window, detects `unchanged` | compute `value_code_indexes` for the two health keys | KMS before the locks; the `unchanged` rule |
| `apps/api/src/modules/claims/claims.ground-inspection.{routes,handlers}.ts` | ten routes (G11) | + `GET`/`PUT` questionnaire; `discrepancy` read decrypts ③ / ④ display | every existing route, guard order and audit action |
| `apps/api/src/modules/claims/peer-answers-assembler.ts` | `assemblePeerSection` = ONE assembler + the hide | `familyAccount` block | the hide order; fail-closed; the SAVEPOINT `run` |
| `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` | G9 | `QuestionnairePanel`, table-driven discrepancy copy | the completion flow, photo upload, refusal, the seeded discrepancy panel |
| `packages/i18n/locales/{en,hi}/claim.json` | `peer_request_questions.*` | + `inspector_questions.*` | the parity gate; the neighbours' words ⛔ edited |

### Traps (TR)

- **TR1 — a second "complete".** Any new "is the inspection complete / ready" helper is a defect (6.26a invariant 2). Reuse `groundInspectionApprovalState`; ⛔ read answers there.
- **TR2 — KMS under a lock.** Ciphertext and `blindIndexMany` in the HANDLER, before `openScopeTx`. The completion tx compares arrays only.
- **TR3 — one literal.** `'answer_code'` once, in `field-classes.ts`; both writers import it. A second literal makes every overlap empty ⇒ EVERY visit prompts a ③ difference (the safe-looking
  failure). A test hashes the same triple on both sides.
- **TR4 — lockstep goes red on purpose.** Everything on AC11's ONE list changes TOGETHER or the build 500s at runtime (6.27d R2-16). A red test ⛔ on that list is a
  real defect, ⛔ a lockstep.
- **TR5 — `.strict()` parses.** The staff view and `GET …/peer-answers` are `.strict()` (`PeerMeshTranscript`, `ClaimPeerAnswersResponse`); widening the key list, or
  adding `familyAccount`, in one place ⇒ a 500 for every claim with a showing (AC11's list).
- **TR6 — erasure.** New Tier-1 columns without a scrub, a column grant AND an UPDATE policy silently update 0 rows under FORCE RLS (`-279` A12).
- **TR7 — shipped state is dark.** v1's cause / illness stay `'pending'`; tests use an INJECTED registry with a recorded basis. ⛔ Never edit v1's `counselBasis` to make a test pass — recording the basis is Row 42 (a)'s reviewed edit.
- **TR8 — DB-clock ties.** Writes, completion and recompute use `clock_timestamp()` (6.27d R2); tests that need ordering use SEPARATE transactions ([[project_db_clock_ordering_tests_tie]]).
- **TR9 — migration order.** Re-grep the number at the commit; the journal `when` must exceed every sibling's, or drizzle skips one ([[project_sibling_migration_when_order_shared_db]]); never regenerate an applied migration (42P07).
- **TR10 — a hidden actor.** The family's answers ride the neighbours' section — the hide covers them. A route that returns them outside it is a leak.
- **TR11 — the validator is the gate, not the test.** Rules live in `validator.ts` so row 6-33's DB-backed versions inherit them; a rule only in a test is a rule 6-33 drops.
- **TR12 — per-key copy tables.** The page's two-way ternary breaks silently on a third key (a ③ would render the date sentence). Table-driven, with a "every compared key has copy" test over `INSPECTION_DISCREPANCY_COMPARED_KEYS`.
- **TR13 — the answers are health data in the browser.** ⛔ `localStorage` / `sessionStorage` / IndexedDB (IQ8 A). A grep pin over `apps/admin/src/modules/ground-inspection/` keeps it true.
- **TR14 — append-only guards name their erasure columns.** `claim_peer_mesh_reply_answers_guard` compares `to_jsonb(NEW)` minus the two scrub columns; a THIRD
  column NULLed by the anonymizer raises *"an answer row is append-only"* — the RTBF of a deceased member's claim then FAILS. Replace the function in the same
  migration; a live-DB leg scrubs a row that carries indexes.
- **TR15 — two handler patterns.** GI handlers: own `openScopeTx` + post-commit `emitAuthAudit`. Neighbours' save: `request.scopeTx` + `withCompensatingAudit`.
  The questionnaire routes are GI routes — use the GI pattern (IQ10); a mix double-opens a scope or loses the audit on rollback.

### Libraries and versions

No new dependency. Admin: React + TanStack Query v5 as in `apps/admin` (a `useMutation` per question key with a per-key promise chain; `onlineManager` for the `online` retry — see
`hooks.ts`' client defaults: `retry: false`, `gcTime: 0` — the retry queue is the panel's own, ⛔ a global default change). Crypto: `@twt/domain` `encryption.*` only.

### Testing standards

Unit (vitest, pure domain) → contracts (outside tsc) → admin (RTL + a `cleanup`; mock none of `t()` — a real-`t()` leg for the NEW copy keys,
[[feedback_stub_must_call_not_transcribe]]) → live-DB integration (`twt_dev`, an isolated container; shell `DATABASE_URL` set ON the command,
[[project_prepush_hook_inherits_5432]], [[project_known_livedb_test_failures]]). Every AC: RED first, named mutant. Friction budget
([[project_friction_budget_baseline_ratchet]]) and `pnpm ci:local` before the push. Prettier is ⛔ enforced — hand-format ([[project_prettier_not_enforced]]).

### Project Structure Notes

Domain pure code under `packages/domain/src/questionnaires/` and `claim/`; API under `apps/api/src/modules/claims/`; admin under `apps/admin/src/modules/ground-inspection/`;
copy under `packages/i18n/locales/`; records under `docs/launch-gate-inventory/` and `_bmad-output/`. ⚠ `packages/contracts` mirrors the WIRE shape only (domain cannot import it).
No architecture variance: the surface is `apps/admin` (§4.1), ⛔ `apps/mobile`; offline is NOT claimed beyond IQ8.

### Recorded observations — ⛔ NOT this story's to change, ⛔ NOT routed (gap-analysis posture: observed, escalation proposed to BigDev)

- `recordGroundInspectionFindings` (`client.ts`) has NO caller — the page never writes `structuredFindings` (four fixed `yes|no|unclear` keys). The questionnaire does ⛔ reuse or replace it.
- `completeGroundInspection` carries NO Idempotency-Key and a retry is `409 not_active` (G10) — the standing reason IQ8 (B) is a story of its own.
- `6-36a-…md:470` labels SW25 *"our suggestion to 6-32"*; `-330` records it as an author-commit. The decision entry is the record (the file is ⛔ edited here).
- The ledger's *"(only if the Panel approves Q3 / Q4)"* is stale — `-304` ruled A on both; already annotated at the 2026-10-10n ledger line.
- `claims.ground-inspection.routes.ts` sits on the human-actor invariant's `ENROLMENT_OWED` list (G12) — every GI route, not only this story's, is unasserted there.
- `anonymize.ts` leaves the inspection's location, family contact, notes and photo captions unscrubbed (G13; its own comment says so).
- `claims.ground-inspection.routes.ts:3`'s header still says *"Seven"* routes; there are ten (twelve after this story — correct the count in passing, it is this file).
- Hindi for staff-added questions (`-304` reading: *"the chain supplies both languages and a person reviews the Hindi before it goes live"*) is row 6-33's; this story's Hindi is IQ9 / Row 42 (b).

### References

- `.decision-log.md`: `-304` (Q3–Q8, Consequence 3), `-310` (CF2, CF3, CF4), `-307` (§2 item 1, Consequence 2), `-308` (call 2 — IQ13), `-319` (OP14 — IQ2), `-330` (SW25), `-305` (§4), `-311` (PM23, PM25), `-263` (FQ9), `-279` A12, `-210` cl. 2.
- `_bmad-output/implementation-artifacts/`: `6-27-peer-mesh-sending-replies-and-date-of-death.md` (PM23, PM25, F-facts), `6-27d-inspector-discrepancy-at-completion.md` (R1–R6, AC3–AC6),
  `6-26-ground-inspection-before-approval-and-death-facts.md` (invariants 1–3, AC2), `6-28-one-payment-per-death-second-approval-guard.md` (OP14 (d)), `6-36-peer-mesh-school-wise-selection.md` (SW25, the letter note), `deferred-work.md` (③ / ④; 6.36 W1).
- `_bmad-output/planning-artifacts/`: `architecture.md` §4.1 (surfaces), §4.5 / §4.5a (offline); `prds/prd-TWT-2026-05-22/prd.md` FR-40; `trustee-panel-routing-note-TEMPLATE.md`; `epics.md` (Stories 6.26a, 6.27a–d).
- `docs/legal/niyamavali.md` (main checkout, gitignored) §5.1, §5.5, §5.6; `docs/launch-gate-inventory/inventory-roster.md` (Rows 27, 28, 41).

## Dev Agent Record

### Agent Model Used

(story created by Claude Sonnet 5.5 — `bmad-create-story 6.32`.) Implemented by Claude Opus 5.5 (`bmad-dev-story 6.32`, 2026-10-28) in the story's own
worktree, branch `story/6-32-inspector-questionnaire-at-the-ground-inspection`.

### Debug Log References

- Live-DB specs on a dedicated container `twt-632-pg` (:5448, database `twt_dev`); `ci:local` on a FRESH container `twt-632-ci-pg` (:5449, `twt_dev`).
- ⚠ **Found by the fresh container (fixed, `b23ccfcb`):** on a fresh database the migrator applies EVERY migration in ONE transaction; 0188's `LANGUAGE sql`
  helper compared `inspection_stage` with `'certificate_check'` — a value ADDED to that enum by an earlier migration — and a `LANGUAGE sql` body is validated at
  CREATE ⇒ `55P04 unsafe use of new value`. An already-migrated database never saw it. 0188 now compares both enums AS TEXT.
- ⚠ **Task 8.4 (the real-browser pass) is ⛔ attested.** The Chrome reached by the agent's browser tool could ⛔ load the local dev host
  (`localhost:5173` / `127.0.0.1:5173` — Chrome's error page; three attempts, inside and outside the shell sandbox) while `curl` from the same machine got 200.
  Recorded as an un-attested item in `deferred-work.md` (6-32 section) and Row 42's evidence line (5) — ⛔ faked.

### Completion Notes List

- **Task 1 — the engine (AC1).** `ground_inspection.v1` (LIVE, all Pariwars): `head_letter` (`-310` CF4 A (3) — added to the Panel-ratified allow-list),
  `death_cause`, `death_illness`. The validator's `ground_inspection` block holds I4 (the three ruled keys in every version), I1 (every question optional — so
  row 6-33 inherits it), the cause / illness `health` + `sensitive` with the neighbours' CODES (ONE `DEATH_CAUSE_CODES` / `DEATH_ILLNESS_CODES` list in
  `keys.ts`, `peer-mesh.ts` now reads it), the letter ⛔ sensitive / health. Shipped state: cause / illness `'pending'` ⇒ the served definition is the letter ALONE
  (TR7). 25 `inspector_questions.*` keys in en + hi (the Hindi agent-authored — Row 42 (b)). Six mutants killed.
- **Task 2 — the store (AC2, AC9).** Migration `0188` (journal `when` 1795750800032 > every sibling): the header (version pinned at the first save) and the
  append-only answers (Tier-1 cause / illness — the EXISTING `ground_inspection` class; `value_code_indexes`; the guard: `scheduled`, ⛔ `certificate_check`,
  the ONE answer window; the 0143-form erasure arm); the neighbours' answers gain `value_code_indexes` (⛔ backfill — ⛔ such row exists, G4) + the erasure grant,
  and their guard is REPLACED (TR14 — a live-DB leg scrubs a row carrying indexes; the OLD guard restored in the DB turns it red); 0160's two CHECKs widened.
  `anonymize.ts`: the family's answers (sentinel + NULL indexes) and the neighbours' `value_code_indexes` in their SAME statement; RTBF pins 30 → 31 statements,
  27 → 28 tables, the stale title corrected. ⚠ Deviation, narrower than written: the header's version CHECK is `^ground_inspection\.v[0-9]+$` (⛔ any kind).
- **Task 3 — the writer and the comparable form (AC3, AC5).** `claim/ground-inspection-questionnaire.ts` (lock assignment → claim, the exported 6.26a helpers —
  ⛔ copies; ⛔ KMS; stale / invalid / unavailable / certificate-check typed errors). ONE input rule `questionnaires.answerCodeIndexInputs`
  (`${claim}|${key}|${code}`, `dont_know` ⇒ NULL) and ONE helper `claim.answerCodeBlindIndexes` (API wrapper `answerCodeIndexes`) for BOTH writers, under ONE
  literal `'answer_code'` (a grep pin; ⛔ twin). ⚠ **Deviation from IQ4's "with `blindIndexMany`":** per-code `blindIndex` (≤ 10 audit lines) — the neighbours'
  handler runs inside its request transaction, where `blindIndexMany` is forbidden (*"⛔ Never call it inside a transaction"*); the date window's precedent.
- **Task 4 — the comparison (AC6).** `death_cause` / `death_illness` → `'compare'`; `peerAnswerDiffers` takes the family's code indexes as a further parameter
  (6.27b ⛔ passes it ⇒ ⛔ a warning — a leg pins it); ONE rule (both definite, ⛔ shared index); the family's indexes read under the completion's locks and AS OF
  `completed_at` in the recompute (equal — a live-DB leg). ① / ② unchanged. `inspection-discrepancy.test.ts:45` rewritten (warning keys ⊂ compared keys), ⛔ deleted.
- **Task 5 — the API (AC3, AC8).** `GET …/questionnaire` (the served definition via `toWireQuestionnaire` — ⛔ a second resolver; 404 ⇔ ⛔ panel) and
  `PUT …/questionnaire/answers/:questionKey` (the GI transaction / audit pattern; KMS before the write transaction; audited post-commit only for a write, counts
  only). ⚠ The 422's code is `questionnaire.answer_invalid` with the engine's reason in `details.reason` (the neighbours' `peer_request.invalid_answer`
  precedent), ⛔ appended to the code. ③ / ④ on the completion and the re-read carry `familyAnswers` (the family's answer in English words, decrypted after the
  transaction). The family account rides `assemblePeerSection` AFTER the hide (one bounded read; console ceiling 29 → 30 with its ledger line) — ⚠ **on
  `present` AND `empty`**, at the SECTION level (⛔ only inside `PeerMeshTranscript` as AC11 wrote): a no-one-asked claim has ⛔ selection, so a transcript-only
  field would hide exactly the letter AC10 says the approver sees. The `ENROLMENT_OWED` entry is ⛔ touched (recorded, as AC3 says).
- **Task 6 — contracts and client.** `packages/contracts/src/claims/ground-inspection-questionnaire.ts` (reuses `PeerRequestQuestionnaire`); the section's
  `familyAccount` REQUIRED; the four keys in contracts, domain schema and the admin client (the lockstep test pins them).
- **Task 7 — the screens (AC7).** `QuestionnairePanel.tsx` on the neighbours' `PeerAnswerEditor` (IQ8 (A): in-memory retry with backoff and at once on
  `online`, a stale read 3 times, per-answer state, the leave warning; ⛔ browser storage — a grep pin); the discrepancy copy is a TABLE (TR12);
  `PeerMeshSectionView` — ONE view for the console and the approvers' panel, + the family's account (the letter ALWAYS said, *"Not recorded"* included).
- **Task 8 — proof.** Mutants KILLED: the six validator rules, registration; the overlap rule inverted, the empty-index guard, a rule flipped back; the claim
  scope removed, the `dont_know` NULL dropped; I1's completion mutant (letter required — domain AND HTTP AC4 legs red); the hide bypassed; a comparison through
  `value_ciphertext` (the fence); the Tier-1 CHECK dropped in the DB; the old neighbours' guard; the `online` wake (first SURVIVED — the leg was tightened, then
  killed); the exclusive option; the ③ copy line. 8.4 ⛔ attested (above). 8.6 — the fix-diff review found and fixed: the panel's editor was disposed on every
  `data.answers` identity change (listeners dropped) — now the helpline screen's activate-once + `replaceFromServer`; an unused contracts re-export removed.
  8.5 — the FIRST full `ci:local` (fresh container) failed 2 jobs, both this story's: lint (an unused destructured binding in a contracts test) and a FOURTH
  console read-ceiling pin (`verifier-console.spec.ts`, 29 → 30) the first pass missed; both fixed, `turbo lint` 20/20 and the affected suites re-run green; a
  clean full re-run (a recreated fresh container) was **35 / 36 green** — the integration leg included; the ONE red was `test (unit)`: a 6.27d admin test
  (`ground-inspection-discrepancy.test.tsx`, "R2-12 / R2-13") TIMED OUT at 5 s under the job's parallel load — the documented contention class
  ([[project_ci_local_concurrency_oversubscription]]); it passes alone 3 / 3 (~1.3 s) and the whole admin package passes 81 / 81 (1,395 tests). ⛔ A clean
  36 / 36 is ⛔ yet recorded — the pre-push hook's run is the next attestation.
- **Review continuation (2026-10-28, `bmad-dev-story 6.32`) — R1–R6 resolved, R7 open.**
  - ✅ Resolved review finding [MEDIUM]: **R1** — `unsaved-answers.tsx` (in memory only) tracks the visits with unsaved answers; loading another
    claim and leaving the page in the app wait until they are saved (the helpline screen's `history.block`; `/login` still goes); the completion
    waits and goes out once they are saved, or without them on "Complete without the unsaved answers" (I1 — `ready` reads none of it; the I1 source
    pin stays green); the inputs lock while the completion is in flight. 4 admin legs + a control.
  - ✅ Resolved review finding [MEDIUM]: **R2** — the handler passes `unreadableLive` (read but ⛔ decryptable); the writer treats those as `null`,
    so the letter or a replacement saves, and a dependant of an unknown parent stays refused. ⚠ The R2 leg found a second defect, fixed with it:
    `dependantsToSupersede` dropped every dependant whose condition did not hold AFTER a change — so the letter's save ERASED the illness beneath
    an unreadable cause; it now follows only a CHANGED parent (unchanged for any all-known answer set — the neighbours' suites green). 3 domain
    legs, 1 engine leg, 1 HTTP leg.
  - ✅ Resolved review finding [MEDIUM]: **R3** — `readClaimFamilyAccount` starts from the completed full visits (left joins);
    `questionnaireVersionId` is `null` for a visit that saved nothing. A domain leg and an HTTP leg (the no-one-asked claim, zero saves).
  - ✅ Resolved review finding [MEDIUM]: **R4** — `requirePathClaim` in both questionnaire handlers: a path claim ≠ the assignment's claim ⇒ the
    same 404 `ground_inspection.not_found`, before any read or write. HTTP leg (two claims, a positive control, ⛔ row, ⛔ extra audit line).
  - ✅ Resolved review finding [MEDIUM]: **R5** — ONE stable `role="status"` `aria-live="polite"` region announces each change of an answer's
    save line, ⛔ the lines shown at load; the generic unsaved line lost its duplicate `role="status"`. 3 admin legs.
  - ✅ Resolved review finding [MEDIUM]: **R6** — the tampered-session leg on GET and PUT (a nonexistent actor ⇒ 404; a positive human control
    first; the answer row unchanged and attributed to the inspector). Passes on the pre-fix code too — a proof, ⛔ a fix.
  - ⛔ **R7 OPEN** — re-attempted with a static probe page: the agent's Chrome still shows its error page while `curl` fetches it. Then BigDev
    ran a PARTIAL manual pass against a seeded local API and stopped it (*"I would rather stop here and move on"*): R1's wait-then-complete order
    was observed; one completion was refused `409` for a reason ⛔ captured; the rest ⛔ attested — recorded in `deferred-work.md` (6-32 section).
  - Proof: every new leg RED against the pre-fix code (except R6 and the "nothing unsaved" control). `ci:local` on a FRESH container (`twt-632-ci-pg`
    :5449): the first run at `b8f23db8` was 35 / 36 — `microcopy` refused the word "report" in a comment of the new `unsaved-answers.tsx`; reworded
    (`179d8b8f`); the re-run on a RECREATED container: **36 / 36 green at `179d8b8f`** (integration included).
- **Task 9 — records.** Row 42 evidence lines (1)–(5); the ③ / ④ deferred item annotated BUILT on the branch (⛔ discharged until `done` on `main`); the
  un-attested browser item; the two stale source comments (G16) corrected in place; 6.36 W1's "trigger ⛔ pulled" and the IQ3 B / IQ8 B deferrals and the OP14 (d)
  pointer were recorded at Task 0.4 (unchanged).

### File List

- `_bmad-output/implementation-artifacts/6-32-inspector-questionnaire-at-the-ground-inspection.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/admin/src/api/client.ts`
- `apps/admin/src/modules/claim-verification/NeighboursAnswersPanel.tsx`
- `apps/admin/src/modules/claim-verification/PeerMeshView.tsx`
- `apps/admin/src/modules/claim-verification/SignalsPanel.tsx`
- `apps/admin/src/modules/claim-verification/i18n-en.ts`
- `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`
- `apps/admin/src/modules/ground-inspection/QuestionnairePanel.tsx` (new)
- `apps/admin/src/modules/ground-inspection/i18n-en.ts`
- `apps/admin/src/modules/ground-inspection/unsaved-answers.tsx` (new — code review R1)
- `apps/admin/tests/ground-inspection-discrepancy-client.test.ts`
- `apps/admin/tests/ground-inspection-discrepancy.test.tsx`
- `apps/admin/tests/ground-inspection-page.test.tsx`
- `apps/admin/tests/ground-inspection-questionnaire.test.tsx` (new)
- `apps/admin/tests/neighbours-answers-panel.test.tsx`
- `apps/admin/tests/peer-mesh-source-not-on-inspector-wire.test.ts`
- `apps/admin/tests/verifier-console.test.tsx`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/modules/claims/claims.ground-inspection.handlers.ts`
- `apps/api/src/modules/claims/claims.ground-inspection.routes.ts`
- `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`
- `apps/api/src/modules/claims/ground-inspection-crypto.ts`
- `apps/api/src/modules/claims/peer-answers-assembler.ts`
- `apps/api/src/modules/claims/peer-request-core.ts`
- `apps/api/tests/integration/claims/ground-inspection-discrepancy.spec.ts`
- `apps/api/tests/integration/claims/ground-inspection-questionnaire.spec.ts` (new)
- `apps/api/tests/integration/claims/peer-answers-approvers.spec.ts`
- `apps/api/tests/integration/claims/peer-answers-console.spec.ts`
- `apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts`
- `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`
- `apps/api/tests/integration/claims/verifier-console.spec.ts`
- `apps/api/tests/unit/peer-answers-stitch.test.ts`
- `docs/launch-gate-inventory/inventory-roster.md`
- `packages/contracts/src/claims/ground-inspection-questionnaire.ts` (new)
- `packages/contracts/src/claims/index.ts`
- `packages/contracts/src/claims/verifier-console.ts`
- `packages/contracts/tests/claims-peer-answers.test.ts`
- `packages/contracts/tests/claims-verifier-console.test.ts`
- `packages/domain/migrations/0188_ground-inspection-questionnaire.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/claim/answer-code-index.ts` (new)
- `packages/domain/src/claim/ground-inspection-persist.ts`
- `packages/domain/src/claim/ground-inspection-questionnaire.ts` (new)
- `packages/domain/src/claim/index.ts`
- `packages/domain/src/claim/inspection-discrepancy.ts`
- `packages/domain/src/claim/peer-mesh-read.ts`
- `packages/domain/src/claim/peer-mesh-reply.ts`
- `packages/domain/src/encryption/field-classes.ts`
- `packages/domain/src/encryption/index.ts`
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/src/policies/claim-ground-inspection-questionnaire-rls.ts` (new)
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/questionnaires/answers.ts`
- `packages/domain/src/questionnaires/ground-inspection.ts` (new)
- `packages/domain/src/questionnaires/index.ts`
- `packages/domain/src/questionnaires/keys.ts`
- `packages/domain/src/questionnaires/peer-mesh.ts`
- `packages/domain/src/questionnaires/registry.ts`
- `packages/domain/src/questionnaires/validator.ts`
- `packages/domain/src/schema/claim_ground_inspection_discrepancies.ts`
- `packages/domain/src/schema/claim_ground_inspection_questionnaire.ts` (new)
- `packages/domain/src/schema/claim_peer_mesh_replies.ts`
- `packages/domain/src/schema/claim_peer_mesh_selections.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/tests/claim/answer-code-index.test.ts` (new)
- `packages/domain/tests/claim/ground-inspection-questionnaire-approval.test.ts` (new)
- `packages/domain/tests/claim/ground-inspection-questionnaire-fence.test.ts` (new)
- `packages/domain/tests/claim/inspection-discrepancy.test.ts`
- `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`
- `packages/domain/tests/integration/claim/_peer-reply-fixtures.ts`
- `packages/domain/tests/integration/claim/ground-inspection-questionnaire.spec.ts` (new)
- `packages/domain/tests/integration/claim/peer-mesh-reply-rtbf.spec.ts`
- `packages/domain/tests/integration/claim/peer-mesh-reply.spec.ts`
- `packages/domain/tests/integration/rls/claim-ground-inspection-discrepancy-policy-regression.spec.ts`
- `packages/domain/tests/integration/rls/claim-ground-inspection-questionnaire-policy-regression.spec.ts` (new)
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/questionnaires/ground-inspection-questionnaire.test.ts` (new)
- `packages/domain/tests/questionnaires/questionnaires.test.ts`
- `packages/i18n/locales/en/claim.json`
- `packages/i18n/locales/hi/claim.json`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-27 | 1.0 | `bmad-create-story 6.32` (BigDev: *"6.32 in its worktree"*) at `4e57fa42`. Two read-only research passes (governance; code) + hand re-checks. Row `backlog` → `ready-for-dev`. IQ1–IQ12 PROPOSED; four need BigDev (IQ2 the "other claim" question — the validator admits only Panel-ratified ids; IQ3 the letter's record; IQ7 who reads the family's answers; IQ8 "offline saving" — no substrate or ruling). The comparable form PM25 (a) says this row OWES is built (AC5 / AC6). Policy meaning: nothing gates — the completion predicate is untouched (I1). Row 42 to be minted at Task 0.4. ⛔ No Panel question needed to build; one non-blocking confirm recommended (IQ7). |
| 2026-10-28 | 1.1 | Fresh-context validate (`bmad-create-story validate 6.32`, BigDev: *"all"*), facts re-traced on the branch (two read-only passes, domain/schema and API/admin). **IQ13 added** — `-308` call 2 lists *"the head's letter when ⛔ no one can be asked"* among *"the hard checks"*, and 6.36 recorded *"approvable WITHOUT the letter until 6-32 is `done`"*; the story's "optional, never gates" was unreconciled with both ⇒ §0 row 8, answered FIRST, (B) is the Panel's. **G7a / TR14** — the neighbours' answer guard names its erasure columns; AC2 now replaces it. **AC11** — the ONE lockstep list (adds `questionnaires.test.ts:82/:94`, `inspection-discrepancy.test.ts:45` rewritten ⛔ deleted, the fence's 54, the RTBF 30 / 27, the audit-sink union). **IQ1** — every question `optional`, the required `closingNoteCopyKey` / `thankYouCopyKey`. Facts corrected: G6 (constant locations), G7 (CHECK names), G9 (admin uses `@twt/i18n`; the `HelplinePeerRequests` precedent to REUSE), G11 (two handler patterns; override district-only), G12 (`ENROLMENT_OWED`), G13 (what erasure covers), OP14 (d) is committed by `-319`. Numbers re-checked on every branch: `-413` / `0188` / Row 42 hold. |
| 2026-10-28 | 1.2 | **IQ13 answered (A)** — BigDev: *"IQ13 A — keep the letter optional"*. The letter is recorded and shown to approvers, ⛔ a condition of approval; ⛔ Panel question. Status, Policy meaning, §0 row 8, I1, AC0, AC10 (+ an AC4 (a) row) and Task 0.2 updated; the decision is recorded in the Task 0.3 entry with IQ1–IQ12 (superseding `-308` call 2 in part) — ⛔ a decision until committed. Four asks remain: IQ2, IQ3, IQ7, IQ8. |
| 2026-10-28 | 1.4 | `bmad-dev-story 6.32` (Claude Opus 5.5): Tasks 1–7 and 9 DONE; Task 8 done EXCEPT 8.4 — the real-browser pass could ⛔ be run (the agent's Chrome could ⛔ reach the local dev host) ⇒ recorded un-attested, ⛔ faked; the row stays `in-progress` (the workflow's completion gate). Built: `ground_inspection.v1`, migration `0188` (+ a fresh-database fix, 55P04), the writer, the comparable form on both answer tables, ③ / ④ compared without a decrypt, GET / PUT questionnaire routes, the family's account on the neighbours' section (present AND empty), the inspector's panel and the staff view. Deviations recorded in the Completion Notes: per-code `blindIndex` (⛔ `blindIndexMany`), the 422's reason in `details`, `familyAccount` at the section level, the header's narrower version CHECK. |
| 2026-10-28 | 1.5 | Addressed code review findings — 6 items resolved (R1–R6; Date: 2026-10-28): `c285bfcf` (R2, R3, R4, R6 — incl. `dependantsToSupersede` following only a changed parent, found by the R2 leg), `b8f23db8` (R1, R5), `179d8b8f` (a microcopy word). R7 / Task 8.4 (the real-browser pass) stays OPEN — the agent's Chrome still cannot load a local page; ⛔ faked. `ci:local` **36 / 36** at `179d8b8f` on a fresh container. Row stays `in-progress` (Task 8 unchecked). |
| 2026-10-28 | 1.3 | **Task 0 DONE.** BigDev: *"recommendation accepted for IQ1-IQ12"*. 0.1 — rebased onto `origin/main` (11b.4a landed; the branch's lines verified identical before / after; journal idx / `when` unique); cited files that moved: `audit-sink.ts` (a memorial action appended after the GI actions) and the roster (Row 41 status) — neither shifts a claim here. 0.3 — [`-413`](../../.decision-log.md#decision-2026-10-28-413) committed alone (IQ1–IQ13 all as recommended; supersedes `-308` call 2 and `-319` OP14 in part). 0.4 — roster Row 42 `ground-inspection-family-answers-live` (+ a dated pointer on Row 27 note (5)); `epics.md` `### Story 6.32`; a dated note under 6.28 OP14 (d); `deferred-work.md` — a new section (the "any other claim?" question, the letter's photograph, true offline), 6.36 W1 annotated "trigger ⛔ pulled", the ③ / ④ item marked owned (⛔ discharged); the IQ7 confirm note drafted (BigDev sends); the ledger line. Implementation starts at Task 1. |
