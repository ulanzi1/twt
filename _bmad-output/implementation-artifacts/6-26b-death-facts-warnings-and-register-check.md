---
baseline_commit: b665a19a
---

<!--
⭐ MERGED 2026-10-07 with Story 6.26a as PR #259 (REBASE-merge): every 6.26 SHA this file cites (`9282d108`, `97403945`, …) was
rewritten by the rebase. The citations are kept AS WRITTEN; the proved map to their `main` twins is the header of
`6-26-ground-inspection-before-approval-and-death-facts.md` (each pair by identical `git patch-id --stable`).
-->

<!--
BASELINE — RE-PINNED 2026-10-07 to `b665a19a` on `main` (`bmad-create-story 6.26b`, after Story 6.26a went `done` and merged as PR #259;
`b665a19a` = 6.26a's SHA-map commit on top of the merged tree `264c8e4e`). The v1.x pin `3311fc97` is an ancestor of `b665a19a`;
`git diff --name-only 3311fc97..b665a19a -- packages apps scripts docs` = 6.26a's build ONLY (71 files). Two facts kept apart, as always:
  · DURABLE — the pin `b665a19a` is an ancestor of HEAD (`git merge-base --is-ancestor b665a19a HEAD`).
  · PERISHABLE — every code claim below was RE-DERIVED against `b665a19a` on 2026-10-07 (three fresh-context read-only verifiers, each
    `file:NNN` read with `sed -n`; the load-bearing ones re-read by the author). ⚠ Before Task 1, run
    `git diff --name-only b665a19a..HEAD -- packages apps scripts`; any cited file in that list is re-read.

STATUS: `ready-for-dev` (6.26a is `done` — the 6.21b / 6.23b precedent: the row flips when its sibling is `done`).

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / nowhere); `⭐` = key fact or
action; `⚠` = hazard. Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every prepend
rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code, as of `b665a19a`.
LETTERS: `GI1`…`GI18` are Story 6.26's author decisions, defined ONCE in 6.26a's file and committed by ONE author-commit — ✅ `2026-10-06-282`.
This story BUILDS the ones tagged **[b]** or **[a+b]** there — GI6, GI7, GI8, GI17, GI18 and the [b] halves of GI10, GI11, GI13, GI15, GI16.
This file ⛔ never restates a different version of a GI: where a summary below and 6.26a's text disagree, 6.26a's text (and the decision
entry) is the record. `-283` A3 amends GI6; `-284` E1 amends GI7; `2026-10-07-288` K1 amends GI18 and K2 amends GI10 [b], K3 records the
completion clock, K4 records GI6's key; `2026-10-07-289` (an erratum to `-288`) keys GI18 by UPLOAD (L1), makes a recorded register
mismatch un-withdrawable (L2), makes an INHERITED visit's differing date a GI6 key (L3) and sets "nothing compared" without an accepted
certificate (L4) (6.26a's GI block carries each as an `⚠ AMENDED` line — the line is the build).
`RD1`…`RD21` (v2.0) and `RD22`…`RD31` (v2.2) are FOUND facts from re-deriving against 6.26a's shipped build, each with the build response it
implies (author mechanics under §0 — ⛔ no GI moves, ⛔ no entry owed). ⭐ Where a fact needed a CHOICE, the choice is recorded: RD1's clock
(BigDev 2026-10-07, *"Confirm RD1 = DB clock"*, v2.1; refined to `clock_timestamp()` by `-288` K3, v2.2).
-->

# Story 6.26b: The Death Facts Become Warnings — a Differing Date of Death, an Original That Does Not Match, a Register That Does Not Match — and the District Admin Records the Government-Register Check `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.26a (**`done`**, PR #259) makes the inspector record the original certificate's
> match and the family's date of death. This story makes those facts **ask something of an approver**: a family's date of death that
> **differs** from the accepted certificate (`-262` FQ8 C, named in `-264` FQ12), an inspector's **"the original does not match the copy"**,
> and the District Admin's **"the government register does not match"** (`2026-10-06-281` Q1 B) are each a **warning** under the ONE rule
> 6.23a built — approving while one shows needs a chosen reason and a written note, from every approver (`-277` Q2 C, built by 6.23b); one
> that first appears after the District Admin approved makes the final approval **wait** for the District Admin's reason (`-277` Q3 B) and
> **lists the claim in their correction queue** (`-279` A4, `-284` E1). And the District Admin, when accepting a certificate, **records the
> government death-register (CRS) check** — matches / does not match / could not be checked online (`-262` FQ8 B).
> ⭐ **The system still refuses nothing.**

> ✅ **6.26a is `done`** (row `6-26-ground-inspection-before-approval-and-death-facts`; merged as PR #259). This story READS its columns
> (`claim_ground_inspections.death_date_index`, `death_date_source`, `original_certificate_verdict`, `compared_certificate_upload_id`), its
> constant (`DEATH_DATE_INDEX_FIELD_CLASS`, `encryption/field-classes.ts:91`) through its API helper (`deathDateBlindIndex`,
> `apps/api/src/modules/claims/ground-inspection-crypto.ts:63-65`), its SQL fragments (`liveRoutedToR9Exists`, `claim/r9-routing.ts:38-40`;
> `currentDeathCertificateUploadIdSql`, `claim/death-certificate-approval.ts:86-98`) and its fixtures. Re-implement ⛔ none of it.
> ⭐ **Closes 6.26a's go-live coupling:** until this story ships, the inspector's mismatch and a differing date are shown but ask nothing,
> and ⛔ no register check is recorded.
> ⭐ `epics.md` carries `### Story 6.26b` (6.26a's Task 0.6). Row `6-26b-death-facts-warnings-and-register-check`.

> ⚠⚠ **FOUR FACTS — read before anything else** (re-derived at `b665a19a`).
> 1. ⭐ **The rule exists; this story adds KINDS, ⛔ never a rule.** `APPROVAL_WARNING_KINDS` (`claim/approval-warnings.ts:86`) and its
>    contracts mirror (`packages/contracts/src/claims/verification-decision.ts:121-122`, lockstep test
>    `packages/contracts/tests/claims-verifier-decision.test.ts:223-224`); a key `kind:subjectId` (`approvalWarningKey`, `:93`); ONE claim-level
>    statement (`readClaimApprovalWarnings`, `:213`) and its bulk twin (`readClaimApprovalWarningsBulk`, `:350`, sliced by `BULK_READ_SLICE = 500`
>    through `readClaimApprovalWarningsSlice`, `:362`), both feeding ONE private pure derivation (`deriveClaimApprovalWarnings`, `:518`, over
>    `RawWarningsRow`, `:190-204`). ⭐ **The wait has ⛔ no per-kind filter** — `assertLateWarningsCovered` (`:656`) → `lateWarningWait` →
>    `uncoveredKeys` (`:579-594`) covers every key ⇒ a new kind ENTERS the wait by construction, which is why 6.23a pinned the kind list
>    (`packages/domain/tests/claim/approval-warnings.test.ts:56-61` — *"a new kind enters 6.23b's wait … its producer row decides or routes that
>    before extending this list"*). `-281` Q1 B rules it for GI17/GI18; GI7 decides it for GI6.
> 2. ⚠ **The warning module never decrypts** (6.23a invariant 7 — ⛔ no crypto import there today) — and both dates are Tier-1. ⇒ the date
>    difference compares two keyed **indexes**: the inspection's `death_date_index` (6.26a) against the current accepted review's
>    `accepted_date_index` (THIS story adds it, written on every accept), both under `DEATH_DATE_INDEX_FIELD_CLASS`. SQL selects them; the
>    shared pure derivation compares them (so both readers agree by construction).
> 3. ⚠⚠ **6.23b's correction queue would never tell the District Admin — TWICE.** Its late-warning arm keys ONLY on a live determination
>    decided after the live approval (`correction-queue-read.ts:162-173`, the `lateWarningCandidate` column, and `:196-209`, the WHERE arm —
>    each an INNER `JOIN nominee_determinations nd … nd.decided_at > v.decided_at`; the *"TODAY a late key can arise ONLY that way"* comment at
>    `:198`). 6.26a's window lets an assignment complete AFTER approval ⇒ a second source (GI7). ⚠⚠ And the scan filters on
>    `CORRECTABLE_SCAN_STATES` (`:51-57`, five states — the SAME five as `CLAIM_REVIEW_WINDOW_STATES`, `claim/review-window.ts:15`; ⛔ no
>    `state_trustee_approved`), applied at `:179` before every arm — while `-283` A1 lets an R9-routed claim complete an inspection THERE ⇒ its
>    late key makes R9 wait for a District Admin who is ⛔ never told (`-284` E1). `-280`'s *"⛔ no late key arises there"* stops holding the
>    moment this story ships.
> 4. ⭐ **Two typed kind maps, and ~15 staff strings that say "nominee-change".** `apps/admin/src/modules/claim-verification/i18n-en.ts:136-139`
>    is `satisfies Record<ApprovalWarningKind, string>` ⇒ typecheck forces each new kind's words; it reaches the console
>    (`VerificationDecisionStrip.tsx:338-343`, `:427`) and the four later surfaces through `LaterApprovalWarnings.tsx` (`PendingCaseCard.tsx:309`,
>    `R9CasePanel.tsx:428`, `EscalationPanel.tsx:312`, `PariwarClosureStrip.tsx:255`) with ⛔ no per-surface edit. ⚠ The SECOND map,
>    `NomineeDeclarationPanel.tsx:115-119`, is the timeline's per-VERSION warnings — narrowed, ⛔ never given words for the new kinds (RD8,
>    Trap 7). ⚠ The heading (`i18n-en.ts:135`, *"Nominee-change warnings on this claim"*) and about fifteen more staff strings name
>    "nominee-change" (RD10) — they would mislabel a date or register warning ⇒ reworded kind-neutral.

## Story

As the **District Admin** — and every approver after me —
I want **the claim to warn me when the family's date of death differs from the certificate, when the inspector found the original does not
match the copy, or when the government register does not match — and to record my own register check when I accept a certificate**,
so that **⛔ no sign of a forged certificate can be approved past without a named person's chosen reason and written note, while ⛔ no family
is ever refused because of one.**

## The rulings this story builds

| Ruling | Key | Status |
|---|---|---|
| `-262` FQ8 B | *"the District Admin checks the certificate number on the government's online death register (CRS) and records that they did"* | ⭐ Trustee-ratified |
| `-262` FQ8 C | the inspector records the family's date and time of death; *"the system shows the District Admin any difference from the certificate"* | ⭐ Trustee-ratified |
| `-264` FQ12 | approving while any warning shows — incl. *"a date of death that differs from the certificate (at the inspection …)"* — needs a reason and a note | ⭐ Trustee-ratified |
| `-277` Q2 C / Q3 B | every approver gives a reason and a note; a late warning waits for the District Admin | ⭐ Trustee-ratified |
| `2026-10-06-281` Q1 B | a "does not match" — the original vs the copy, or the register — is a **warning** under the one rule; a late one waits for the District Admin; ⛔ never a refusal | ⭐ Trustee-ratified |
| `2026-10-06-285` A | FQ9 holds every approval, incl. where the District Admin never approved | ⭐ Trustee-ratified — ⛔ no new mechanism. ⛔ No District Admin approval ⇒ ⛔ no late key. ⚠ Interaction: on its R9-first path an inspection completing mid-session makes every approve vote cast before it short (RD4, `-279` A2) — an AC8 leg |
| `-262` reading | the comparison is by **date**; the time is shown, compared with nothing; the register record is *matches / does not match / could not be checked online*; *"'Could not be checked' is covered by `-263` FQ11"* | ⚠ OUR reading |
| `-281` reading (recorded in `-281`, ⛔ not ratified; built by `-282` GI17/GI18, `-283` A3, `-288` K1) | a verdict against a REPLACED upload ⛔ no longer warns (it stays shown). ⚠ GI18 as first written also dropped a SUPERSEDED review's mismatch — and a review is superseded mostly by a re-review of the SAME certificate, where *"no longer relies on"* does ⛔ not hold ⇒ `-288` K1 keys GI18 on the current UPLOAD | ⚠ OUR reading (K1 / `-289` L1 remove the narrowing) |
| `-281` Q1 B on `could_not_check` | it is ⛔ not a warning — Q1 B makes only *"does not match"* one (FOUND); whether an unsearchable register should ever be treated differently is open (`-281` *"does NOT cover"*) | FOUND + open |
| `-264` reading | FQ13's check records the date of death on the fresh original against the District Admin's accepted date ⇒ a `certificate_check`'s printed date can raise the date kind | ⚠ OUR reading |
| `2026-10-06-283` A3 | that printed date warns only while its original is the CURRENT upload (GI17's currency) | ⚠ Author-commit (BigDev) — amends GI6 |
| `2026-10-06-284` E1 | the queue's late-warning arm also scans `state_trustee_approved` while R9-routed | ⚠ Author-commit (BigDev) — amends GI7 |
| `2026-10-07-288` K1–K4 | K1 GI18 warns while its certificate is the current upload; K2 the console shows ANY date difference, inherited included (`-262` FQ8 C *"any difference"*); K3 `completed_at = clock_timestamp()`; K4 GI6's key stays per inspection | ⚠ Author-commit (BigDev) — amends GI18, GI10 [b] |
| `2026-10-07-289` L1–L5 | erratum to `-288`: L1 GI18's key is `register_check_mismatch:<upload_id>`; L2 a recorded mismatch is answered, ⛔ never withdrawn; L3 an inherited visit's differing family date IS a GI6 key while the inheritance applies (`-264` FQ12); L4 ⛔ no accepted certificate ⇒ nothing compared; L5 six text corrections | ⚠ Author-commit (BigDev) — amends GI6, supersedes K1's key and K2's label |

**⛔ Not covered by any ruling (stays open):** what an approver must weigh under a warning; which states' registers can be searched;
whether an unsearchable register is ever treated differently; whether the **family** is told that a claim is waiting for the District
Admin (`-277` *"does NOT cover"* — this story creates new late waits; GI16 keeps ⛔ no member-facing string).

## ⭐ THE INVARIANTS
1. **The system refuses nothing** — every kind is a condition on the FORM of an approval (a reason + a note) or a WAIT; ⛔ never a denial.
2. **ONE rule, ONE derivation** — three kinds, three keys, three producers; the assertion is ⛔ never edited; both readers share the pure
   derivation.
3. **⛔ No decrypt in the warning module** — indexes and plaintext codes only.
4. **⛔ No staff surface learns a date it did not show before** — the warning carries a KIND (and, on the console, per-assignment
   comparison codes and booleans — RD18), ⛔ never a date and ⛔ never an index (the console's GI10 [a] display of the family's date is
   6.26a's, behind its own decrypt).
5. **An unknown is ⛔ never shown as "no warning"** (6.18's fail-closed rule): a warnings read that fails makes every per-assignment flag
   that COULD carry a key, and every completed row's date comparison, `null` ("could not be checked just now"), ⛔ never `false`; a flag the
   assignment section alone rules out (an un-completed row; `originalMismatchWarning` on an inherited row or a verdict ≠ `does_not_match`)
   stays `false` (RD18).

## 📜 Policy meaning (AI-10-1)
⭐ This story ADDS conjuncts to an existing benefit-gating predicate (the warning rule). In the member's terms:
- **P2 (GI8):** *"A District Admin cannot accept a death certificate without recording whether they checked it on the government's death
  register — and 'could not be checked online' is always an allowed answer, so this never stops a family's claim on its own."* — `-262` FQ8 B: consistent.
- **P3 (GI6/GI7 + `-283` A3 + `-289` L3):** *"If the date of death the family gave the inspector — on this claim, or on an earlier claim whose
  visit this claim relies on — or the date printed on the original certificate the
  inspector held, while that original is still the certificate the claim relies on — differs from the certificate the Trust accepted, anyone
  approving the claim must pick a reason and write a note; and if it appears after the District Admin approved, the claim waits for the District Admin's
  reason."* — `-264` FQ12 + its reading + `-277` Q3 B: consistent.
- **P4 (GI17/GI18 + `-288` K1):** *"If the inspector finds the original does not match the copy the claim relies on, or the government
  register did not match the certificate the claim relies on (even if a later check of that same certificate says otherwise), anyone
  approving the claim must pick a reason and write a note; and if it appears after the District Admin approved, the claim waits for the
  District Admin's reason; it never refuses the claim."* — `-281` Q1 B: consistent. ⚠ 6.26a's P4 (written before `-288`) omits the wait
  clause and K1's parenthetical; `-288` Consequence 2 amends it — 6.26a carries an `⚠ AMENDED by -288` line.
- **K2 (GI10 [b]) adds no predicate** — it changes what a staff screen SHOWS (any date difference, inherited included), ⛔ never who may approve.
- Niyamavali §6.2 (document authenticity is verified): consistent; ⛔ no clause on any of these; ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).
- ⭐ **v2.0 re-checked:** RD1–RD21 change the build's mechanics, ⛔ never who may approve or when. RD4 (an R9 approve vote cast before a new
  key must be revised) is `-279` A2's existing rule meeting a new key — "anyone approving" already says it. P2–P4 read the same in 6.26a's file.

## ⚖️ Decisions built here (defined in 6.26a's file; ✅ committed by `2026-10-06-282`; amended by `-283`, `-284`, `-288`, `-289`, `-290`)
- **GI6** `inspection_death_date_differs:<ground_inspection_id>` — an OWN completed assignment's `death_date_index` IS DISTINCT FROM the
  current accepted review's `accepted_date_index`, both non-null; ⛔ no accepted certificate ⇒ ⛔ no key.
  ⚠ **`-283` A3:** a row whose `death_date_source = 'original_certificate'` counts only while its `compared_certificate_upload_id` is the
  claim's CURRENT upload; a `family_statement` row is ⛔ not filtered.
  ⚠ **AMENDED by `-289` L3** (supersedes GI6's *"an inherited inspection produces ⛔ no key"*): a completed row of the INHERITED source
  (`inheritedGroundInspectionSourceSql`) raises the key too — counted ONLY while the claim has ⛔ no own completed FULL assignment (the
  inheritance's own condition, and the console's). An inherited `original_certificate` row was compared against the OTHER claim's upload ⇒
  ⛔ never current ⇒ ⛔ no key (A3); an inherited `family_statement` row is compared.
- **GI7** the date kind ENTERS the wait; 6.23b's queue gains the completed-after-approval disjunct (RD2: ONE hoisted fragment, used by the
  column and the WHERE). ⚠ **`-284` E1:** the scan ALSO admits `state_trustee_approved` for the LATE-WARNING arm only, while the claim
  carries a live `routed_to_r9` routing row (6.26a's leaf, through `liveRoutedToR9Exists()` — ⛔ never a new copy); every other arm keeps
  `CORRECTABLE_SCAN_STATES`. ⚠ **AMENDED by `-290` M1/M2:** an inherited key is also late when the SOURCE gains a completed visit after
  the approval, or the source changes ⇒ a third disjunct lists every approved claim relying on an inherited visit as a candidate (RD2 b).
- **GI8** `register_check` required on ACCEPT, refused on REJECT; stored plaintext with `accepted_date_index` on the review row; ⛔ no new
  conjunct (the certificate conjunct already requires a current accepted review); ⛔ no certificate number stored.
- **GI17** `original_certificate_mismatch:<ground_inspection_id>` — an OWN completed assignment, verdict `does_not_match`, compared against the
  CURRENT upload. Enters the wait.
- **GI18** ⚠ **AMENDED by `-288` K1, its key by `-289` L1:** ONE key `register_check_mismatch:<upload_id>` for the claim's CURRENT upload,
  present while ANY `accepted` review of that upload (live OR superseded) recorded `register_check = 'does_not_match'`. Re-stating the mismatch
  is the SAME key (still covered); a later `matches` / `could_not_check` re-review does ⛔ not erase it; a first `does_not_match` after the
  District Admin approved is a new key ⇒ late; a replaced upload stops it. `could_not_check` is ⛔ not a warning. Enters the wait.
  ⚠ **`-289` L2:** a mistaken mismatch is ANSWERED by each approver's reason and note — ⛔ never withdrawn (RD29).
- **GI10 [b]** the console shows the two mismatch warnings and the register check (document section + history). ⚠ **AMENDED by `-288`
  K2:** each assignment's date line shows *"differs from the certificate"* wherever its `death_date_index` and the current accepted review's
  `accepted_date_index` both exist and differ — own OR inherited, by the SAME pure comparison GI6 uses; a row with GI6's key is a warning
  (an inherited one labelled *"given on an earlier claim"* — provenance only, `-289` L3); a printed date from a replaced original is ⛔ not
  compared; ⛔ no current accepted certificate ⇒ nothing compared (`-289` L4); *"could not be compared with the certificate"* when the
  current accepted review has ⛔ no index (pre-6.26b — `'not_indexed'`), *"could not be checked just now"* when a read failed (L4's fixed
  point: "just now" is said ONLY of a failed read — or, per RD18, a completed row the warnings read did not see, the same kind of unknown).
  **GI11 [b]** the three kinds' words wherever kinds render. **GI13 [b]** erasure sets the review's `accepted_date_index` NULL.
  **GI15 [b]** the certificate fixtures pass `register_check: 'matches'` + the index; a default fixture raises ⛔ no new warning.
  **GI16** ⛔ no new permission key, event, payload field, rule code or member-facing string (`claim.death_certificate_reviewed`'s explicit
  payload, `death-certificate-review-persist.ts:215-225`, gains ⛔ no `register_check` — only the AUDIT does, RD17).
- **`-288` K3** the completion stores `completed_at = clock_timestamp()` (RD1). **`-288` K4** GI6's key stays per inspection — a re-review
  after the District Admin's approval that moves the accepted date to ANOTHER differing date keeps the key covered (⛔ no late wait, ⛔ no
  queue listing for that move); every later approver still gives a reason. Recorded, ⛔ not a defect to "fix".

## ⭐ v2.0 / v2.2 — WHAT RE-DERIVING AGAINST 6.26a's SHIPPED BUILD CHANGED (RD1–RD31; FOUND, ⛔ not decided)

v1.4 was traced at `3311fc97`, before 6.26a existed; 6.26a then went through four review rounds (`-286`, `-287`). Each item below is a fact in
the code at `b665a19a` and what it changes here. ⛔ None moves a GI; each is threaded into the ACs, Tasks and Traps below.

**The queue and the clock**
- **RD1 — ⚠⚠ The fixture clock makes EVERY seeded claim a late-warning candidate — worse than the deferred item says, and against a
  different column.** `completeGroundInspection` stores `completedAt: input.now ?? sql\`now()\`` (`claim/ground-inspection-persist.ts:996-999`
  — 6.26a's first code review, patch #2, pinned at `packages/domain/tests/integration/claim/ground-inspection.spec.ts:640-642`). Both fixtures
  pass `max(Date.now(), date 12:00 IST)` (domain `fixtureReviewNow`, `_helpers.ts:922-924`; API inline, `_nominee-name-check-fixture.ts:129`,
  `:196`) with a default date of TOMORROW (IST) ⇒ `completed_at` is always in the future. And GI7's arm compares it with the **verifier
  approval's** `decided_at` (`claim_verifier_decisions v`). The `deferred-work.md` item *"The fixture's completion clock can be in the FUTURE"*
  has the right FORMULA (*"`completed_at > v.decided_at`"*) but wrong prose and a wrong proposed fix (*"seed the completion before the
  review"* would ⛔ not fix it — the comparator is the approval, ⛔ not the review).
  ⭐ **AUTHOR CHOICE — ✅ CONFIRMED by BigDev 2026-10-07 (*"Confirm RD1 = DB clock"*), refined by `-288` K3 (*"clock_timestamp()"*):** the
  completion writer stores `completedAt: sql\`clock_timestamp()\`` and keeps `input.now` for the "day of completion" validation ONLY. This
  RESTORES `-283` A6's *"6.21a D4's own shape"* (validation-only `now`, as the review writer: `decided_at` is the DB default; its injected `now`
  serves the D4 check alone, `death-certificate-review-persist.ts:167`) — 6.26a's first review patch #2 (*"the two should share one time
  source"*) had departed from A6 without an entry. Production is unaffected (the route passes ⛔ no `now`). Record the reversal and its reason
  in this file's Change Log and as an appended note in 6.26a's *"Review Findings — bmad-code-review 2026-10-07 (chunked: …)"* section,
  `packages/domain` chunk, citing `-283` A6 and `-288` K3 (⛔ never an edit of the finding). It lands BEFORE the GI7 disjunct (Task 4.0).
  ⭐ **Why `clock_timestamp()`, ⛔ not `now()` (`-288` K3):** `now()` is the transaction START. A completion transaction that began before an
  approval's but took the claim lock after it (`lockActiveAssignment` → `lockClaimInWindow`, `ground-inspection-persist.ts:924-925`) would
  store `completed_at < v.decided_at` ⇒ never a queue candidate, while its key is late (absent from the approval row's keys) ⇒ the claim
  waits and the District Admin is ⛔ never told — permanently. `clock_timestamp()` is read at the UPDATE, after the lock ⇒ later than any
  approval that committed first. (The reverse race is harmless: an approval that locks after a committed completion reads its key and
  covers it ⇒ a candidate with ⛔ no uncovered key, dropped by `qualifyingRows`.) ⚠ The determination arm (`nd.decided_at > v.decided_at`,
  both transaction-start `now()`) has the same race — ⛔ not changed here; a `deferred-work.md` item (Task 4.2).
  ⚠⚠ **The ordering tests (BigDev, v2.1):** every test that asserts an ORDER between an approval and a completion runs the two in
  SEPARATE COMMITTED transactions (Task 4.0, Trap 10, Testing). `clock_timestamp()` would also order two statements inside ONE
  transaction, but the approval's `decided_at` is still transaction-start `now()` ⇒ inside one BEGIN/ROLLBACK the completion is always
  "after" whatever order the statements run in, and the test proves nothing. (The repo's other single-transaction ordering technique —
  `backdateApproval`, `approval-warnings-every-approver.spec.ts:295-308`, a superuser UPDATE of `decided_at` — orders by forging a timestamp,
  ⛔ not by running the writers in order; it stays valid for the determination arm, ⛔ never as proof of GI7's ordering.) ⚠ Side effect:
  after K3 every `backdateApproval` claim's fixture inspection is also a gi-disjunct candidate (`completed_at` > the back-dated approval) —
  harmless, those claims are determination-arm candidates already.
- **RD2 — the queue's WHERE is Drizzle, and the late arm is an INNER JOIN.** `candidateBatch` is `.where(and(eq(claims.pariwarId, …),
  inArray(claims.currentState, [...CORRECTABLE_SCAN_STATES]), sql\`( EXISTS(return) OR EXISTS(check) OR EXISTS(late) )\`, <keyset>))`
  (`correction-queue-read.ts:176-216`) — ⛔ not one raw WHERE. ⇒ (a) hoist the late arm into ONE local `const lateArm = sql\`EXISTS (…)\``
  used by the `lateWarningCandidate` column AND both WHERE uses (Trap 3 becomes "one fragment" — the two copies existed so the column and the
  WHERE agree, which one fragment guarantees); (b) rewrite it as `EXISTS (SELECT 1 FROM claim_verifier_decisions v WHERE <v live approved,
  this claim> AND (EXISTS (nd … nd.decided_at > v.decided_at) OR EXISTS (SELECT 1 FROM claim_ground_inspections gi WHERE gi.pariwar_id =
  v.pariwar_id AND gi.claim_case_id = v.claim_case_id AND gi.status = 'completed' AND gi.completed_at > v.decided_at) OR (NOT EXISTS
  (SELECT 1 FROM claim_ground_inspections own_gi WHERE own_gi.pariwar_id = v.pariwar_id AND own_gi.claim_case_id = v.claim_case_id AND
  own_gi.status = 'completed' AND own_gi.inspection_stage <> 'certificate_check') AND ${inheritedGroundInspectionSourceSql(sql\`v.pariwar_id\`,
  sql\`v.claim_case_id\`)} IS NOT NULL)))` — ⭐ the THIRD disjunct is `-290` M2: an inherited key can turn late through the SOURCE claim
  (reversed on appeal and re-inspected, or a changed source) with ⛔ no row of THIS claim completing after the approval ⇒ every approved
  claim relying on an inherited visit is a CANDIDATE; `qualifyingRows`' exact key check drops it when nothing is uncovered (the bulk reader
  carries the inherited rows — RD6); (c) replace the
  `inArray` conjunct and the arms fragment with `or(and(inArray(…CORRECTABLE…), sql\`(<three arms>)\`), sql\`("claims"."current_state" =
  'state_trustee_approved' AND ${liveRoutedToR9Exists()} AND ${lateArm})\`)` — `eq(pariwarId)` and the keyset stay outer conjuncts.
- **RD3 — `liveRoutedToR9Exists(claimRef: SQL = sql.raw('"claims"'))`** takes SQL, ⛔ not the Drizzle table: v1.4's
  `${liveRoutedToR9Exists(claims)}` fails typecheck. Call it with ⛔ no argument (the default matches the queue's `"claims".` qualifiers; its
  inner alias `r9_route` collides with nothing). Using it here is ⛔ not another of the deferred "bulk inline twins" — `r9-routing.ts`'s header
  names this consumer.
- **RD4 — a late key during R9 also makes every live approve vote short.** `finalizeR9Outcome` (`r9-voting-persist.ts:672-691`) requires EACH
  live approve vote's own `r9_vote` row to cover EVERY current key (`r9ApproveVotesMissingKeys`; `-279` A2) — after the gate, so after the
  District Admin's late wait. An inspection completing while R9-routed (`-283` A1) therefore needs BOTH the District Admin's late reason AND
  each approve voter's revision (the existing supersede-then-insert revise, `R9ApproveVotesNeedWarningReasonError`). ⛔ Nothing new to build;
  AC8 tests it.
- **RD5 — what `qualifyingRows` needs:** ⛔ nothing (`:290-383` — ⛔ no state check; `lateWarningAwaitingReason = faultCandidate ||
  uncoveredKeys(w).length > 0`; the late count includes every kind). The API handler (`claims.nominee-name-check.handlers.ts:551-590`) has ⛔ no
  state filter; `readClosureReadiness` answers `no_live_return` (`correction-closure.ts:731-737`); the contract types `claim_state` as
  `z.string()` (`nominee-name-check.ts:384`); `CorrectionQueueRoute.tsx:181` renders it, `:255` offers a late-only row "open the claim" alone.

**The warning module**
- **RD6 — the per-assignment select needs `death_date_source` too** (`-283` A3 keys on it), and `status = 'completed'` rows.
  `RawWarningsRow` gains an `inspections` array of `(ground_inspection_id, inherited, death_date_index, death_date_source,
  original_certificate_verdict, compared_certificate_upload_id)`, the `current_upload_id`, whether a current accepted review EXISTS and its
  `accepted_date_index`, and ⭐ (`-288` K1 / `-289` L1) `register_mismatch_present` — a boolean: EXISTS an `accepted` review of the claim
  (live OR superseded) with `register_check = 'does_not_match'` AND `upload_id = current_upload_id`. ⭐ (`-288` K2 / `-289` L3) The
  `inspections` array carries the OWN completed rows AND — ONLY when the claim has ⛔ no own completed FULL assignment (`status =
  'completed' AND inspection_stage <> 'certificate_check'`, the console's `ownVisited`, `claims.verifier-console.handlers.ts:757-759`) — the
  inherited source's completed rows of EVERY stage (`inherited = true`; the console's list, `:766-768`, has ⛔ no stage filter — `-283` A2's
  stage conjunct lives only INSIDE the fragment, choosing the SOURCE, `nominee-refusal-read.ts:122`). The source comes through the EXISTING
  fragment `inheritedGroundInspectionSourceSql(p, c)` (`claim/nominee-refusal-read.ts:99`, already used by `ground-inspection-approval.ts:99`;
  it imports only drizzle / `db` types / ids / pagination ⇒ a safe leaf — add it to the module's safe-leaves comment and keep the transitive
  import scan green). Inherited rows feed GI6's key (`-289` L3) and the console's date comparison; GI17 makes ⛔ no key from them (their
  compared upload is the other claim's). Both readers select them — the keys stay in bulk / single parity.
- **RD7 — reuse `currentDeathCertificateUploadIdSql(pariwarIdSql, claimCaseIdSql)`** (`death-certificate-approval.ts:86-98`; inner aliases
  `cur_cd`/`cur_u`) for `current_upload_id` — ⛔ never a third copy of the current-upload JOIN (two pre-exist in this module: the single
  reader's `cur` CTE `:226-241` and the bulk LATERAL `:414-432` — left as they are). `death-certificate-approval.ts` is already on the
  module's "safe leaves" list (`:44-46`); re-run the transitive import-scan test (`approval-warnings.test.ts:344-349`). The existing `cur`
  row IS the current accepted review (`superseded_at IS NULL AND verdict = 'accepted' AND upload_id = current`, ordered `decided_at DESC,
  review_id DESC LIMIT 1`, `:280` / `:431`; at most one live review by a partial unique index) — today it selects only `review_id, decided_at`;
  it gains `accepted_date_index` (⛔ no new review read). GI18's input is `register_mismatch_present`, an EXISTS in the SAME statement (⛔ not
  the `cur` row's `register_check` — that would drop a superseded same-upload mismatch).
- **RD8 — the timeline's narrowing reaches the DOMAIN and the API.** `classifyNomineeVersion` (`approval-warnings.ts:122-135`) returns
  `ApprovalWarningKind[]` and `claims.nominee-declaration.handlers.ts:289-333` passes it to `warnings:` ⇒ narrowing only the contract
  (`nominee-declaration.ts:56`) breaks the API typecheck. ⇒ export `NOMINEE_VERSION_WARNING_KINDS = ['post_death_version',
  'recent_nominee_change'] as const` (+ its type) from `approval-warnings.ts`, typed as the classifier's return, with `APPROVAL_WARNING_KINDS`
  built as `[...NOMINEE_VERSION_WARNING_KINDS, <the three>]`; mirror it in contracts (`NomineeVersionWarningKind`) with a lockstep test; use it
  at `nominee-declaration.ts:56` and `NomineeDeclarationPanel.tsx:115-119`. ⛔ No version-kind subset exists today (grep).
- **RD9 — the derivation is private.** `deriveClaimApprovalWarnings` (`:518`) is ⛔ not exported; today's parity is live only
  (`approval-warnings-every-approver.spec.ts:443-466`, bulk vs single). ⇒ put the three kinds' rule in ONE exported pure helper
  (`deriveDeathFactWarningKeys`) that the private derivation calls; the AC8 unit table targets it; the live parity test gains rows carrying
  each new kind. ⭐ The same module exports the ONE date comparison (`deathDateComparison(row, currentReview, currentUploadId)` →
  `'differs' | 'same' | 'not_compared' | 'not_indexed'`) that BOTH `deriveDeathFactWarningKeys` (GI6) and the console's per-assignment line (K2) use —
  ⛔ never a second comparison. Its ORDER (`-289` L4): (1) `'not_compared'` when the row has ⛔ no `death_date_index`, or is an
  `original_certificate` row whose compared upload is ⛔ not the current upload; (2) `'not_compared'` when the claim has ⛔ no current
  accepted review; (3) `'not_indexed'` when the current accepted review has ⛔ no `accepted_date_index` (pre-6.26b — dev data only, Trap 5);
  (4) `'differs'` / `'same'`. The pure function ⛔ never returns `null`; `null` is the CONSOLE's word for a failed read (RD18). ⚠ The three new kinds are derived OUTSIDE the `if (postDeath === 'evaluated')` block (`:529-534`) — their
  inputs (the current review, the inspections) are exact whatever the determination's state; `approval-warnings.spec.ts:414-418` depends on it.

**The review writer, the migration, erasure**
- **RD10 — "nominee-change" in ~15 staff strings**, ⛔ not only the heading: admin `claim-verification/i18n-en.ts` `:135` (heading), `:154`,
  `:160` (`unavailable`), `:157` (revise blocked), `:181-182` (`warningReasonRequired` / `…Ungrounded`), `:194-198` (R9 votes), `:333-339`
  (the correction queue's late lines — which GI7 now fills with date and inspection keys); `approval-warning-reasons/i18n-en.ts:16`, `:18` (the
  Super Admin's reason page — its reasons now serve every kind); API `later-approval-warnings.ts:46`, `:54`, `:66` and
  `claims.verification-decision.handlers.ts:59`, `:61`. ⇒ reword EXACTLY these kind-neutral ("warning(s) on this claim"). Every one is
  staff-facing ⇒ GI16's *"⛔ no member-facing string"* holds. ⚠ ⛔ No blanket reword: `grep -rn -i "nominee-change\|nominee change"
  apps/admin/src apps/api/src` returns 51 hits at `b665a19a`, and afterwards it must still show the ones that are GENUINELY about a nominee
  change — the `-239` refusal list and its heading (`i18n-en.ts:580`, *"Claims refused on suspicion of a nominee change"*),
  `ConvergenceDecisionStrip.tsx:223`, `NomineeRefusalsRoute.tsx:3`, the AR-24 step-up text (`nominee.handlers.ts:34`, `claims.routes.ts:181`),
  log lines and code comments (optional). ⛔ Never reword `kindLine.recent_nominee_change` (`:138`) or the timeline's
  `nomineeDeclaration.warning.*` (`:399-410`). Optional, ⛔ not staff-visible: the error detail at `verifier-decision-persist.ts:634` and five
  warn-log lines (`verifier-console.handlers.ts:513`, `correction-escalation`, `correction-closure`, `r9-voting`, `cycle-freeze` handlers).
  ⚠ Tests: `apps/admin/tests/correction-queue.test.tsx:678` (`/^2 nominee-change warnings/`) goes red — amend it to the new words; `:668`
  (`not.toHaveTextContent(/\b0 nominee-change/)`) would pass VACUOUSLY after the reword — re-target it to the new wording (e.g. `/\b0 warnings/`),
  ⛔ never left vacuous. ⛔ No other test asserts an RD10 string.
  ⚠ **ERRATUM (code review 2026-10-07, round 1 patch #3; recorded in round 2):** `claims.verification-decision.handlers.ts:61`
  (`warnings_not_current`) is ⛔ NOT kind-neutral, and correctly so — that error fires ONLY while the nominee determination is stale
  (`kinds.length === 0` AND `postDeath === 'awaiting_determination'`), and the three death-fact kinds are derived OUTSIDE that block (RD9) and
  are ⛔ never stale ⇒ only the nominee-change kind is unknown there. RD10's list and AC9b's "every RD10 staff string is kind-neutral" read
  with this one string EXCLUDED; `:59` stays reworded.
- **RD11 — the review's 409s need ⛔ no API mapping, but the admin words are ⛔ not forced.** `translateReview`
  (`claims.death-certificate.handlers.ts:99-115`) maps EVERY reason to 409 `death_certificate_review.${err.reason}` (only `not_found` → 404) and
  `auditReason` (`:120`) returns `err.reason` ⇒ widening `DeathCertificateReviewRefusedError`'s union (`claim/errors.ts:584-604`) is enough.
  ⚠ The admin refusal-words map (`claim-verification/i18n-en.ts:738-753`) is `as Record<string, string>` ⇒ the two new codes silently fall to
  `refusedGeneric` unless added by hand (+ a test).
- **RD12 — the index helper exists:** `deathDateBlindIndex(date, pariwarId, enc)` (`ground-inspection-crypto.ts:63-65`, used at
  `claims.ground-inspection.handlers.ts:624`; already imported by the API fixture, `_nominee-name-check-fixture.ts:33`). The review handler
  holds the plaintext `body.accepted_date` where it encrypts (`claims.death-certificate.handlers.ts:175-180`, Pariwar `p = outer.pariwarId`,
  `:155`) ⇒ it calls the helper there — ⛔ never a second `blindIndex(` call, ⛔ never a literal class. Domain fixtures use the stand-in
  `fixtureDeathDateIndex(date)` (`_helpers.ts:1026-1028`) — the same function 6.26a's inspection fixture uses, so the two indexes agree.
- **RD13 — the wire is `.strict()`.** `DeathCertificateReviewRequest` (`packages/contracts/src/claims/death-certificate.ts:31-45`) is strict
  (*"loose"* means ⛔ no verdict⇔field `superRefine`, so each refusal reaches its own audited 409) ⇒ `register_check` is
  `.optional()` there. The history item `DeathCertificateHistoryReview` (`:62-76`, strict) is served by `getHistory` (handler `:253-341`; its
  explicit object `:290-313` needs the field — the domain read `.select()`s full rows) and rendered by `DeathCertificateHistory`
  (`DeathCertificateReviewControl.tsx:290-358`, review line `:328-340`). The admin submit spreads each field explicitly
  (`VerifierConsoleRoute.tsx:419-431`). ⛔ No contracts test pins these review shapes.
- **RD14 — the migration's shape.** The table's own convention is `text` + an `as const` array + a SQL CHECK (`schema/claim_death_certificate_reviews.ts:44-56`,
  `:84-86`), ⛔ not a `pgEnum` ⇒ `register_check text` + `claim_death_certificate_reviews_register_check_check` (the three values). The
  coherence CHECK (*a `rejected` review carries ⛔ neither column*) holds on EVERY existing row (both columns are new, NULL) ⇒ a plain
  VALIDATED CHECK (6.26a author choice 2's precedent), ⛔ not `NOT VALID` — Trap 9's reasoning still decides what is ⛔ not a CHECK. The
  trigger function `claim_death_certificate_reviews_reject_mutation` (`0122_death-certificate-clear-date-rule.sql:159-187`) is a deny-list ⇒
  `CREATE OR REPLACE FUNCTION` restating the whole body + `register_check` (the triggers themselves stay). GRANTs at `0122:138` (SELECT, INSERT)
  and `:140` (the column UPDATE) — `:143-145` are the POLICIES; ⛔ no later migration alters the table (`0137:33` only references it). `0149`
  is free (journal ends at idx 148, `0148_ground-inspection-photo-certificate-stamp`, `when: 1793504400000`) ⇒ idx 149's `when` =
  `1793590800000` (+86400000, the convention) — ⚠ Drizzle's migrator runs an entry only if its `when` exceeds the last applied one; a copied
  or lower `when` is SILENTLY skipped, and ⛔ nothing in `scripts/` checks the journal. ⚠ Constraint names ≤ 63 chars (Postgres truncates
  silently; the RLS spec asserts each by exact name): `claim_death_certificate_reviews_register_check_check` (52) and
  `claim_death_certificate_reviews_register_check_coherence_check` (62), the latter written null-safe as `"verdict" <> 'rejected' OR
  ("register_check" IS NULL AND "accepted_date_index" IS NULL)`. ⚠ The trigger's deny-list (11 columns) leaves the two scrub targets
  (`accepted_date_ciphertext`, `note_ciphertext`) free of ANY transition — only the column grant limits `twt_app`. `accepted_date_index`
  follows that precedent (OUT of the list, granted UPDATE for the scrub); ⇒ a `twt_app` UPDATE could forge an index — the same exposure the
  ciphertext columns carry today, ⛔ not tightened here. The `register_check` value set is declared in FOUR places (domain const, SQL CHECK,
  contracts `z.enum`, the admin local type) — a LOCKSTEP comment at each, the `0122:44-45` pattern.
  ⚠ **ERRATUM (code review round 2, 2026-10-07; BigDev chose "tighten"):** the index is ⛔ NOT "the same exposure the ciphertext columns
  carry" — a forged ciphertext corrupts a display, a forged index silently turns GI6's `differs` into `same` ⇒ `0149`'s trigger now refuses
  any new NON-NULL `accepted_date_index` (only the scrub's NULL passes; edited in place, the function re-applied and the journal hash updated
  on :5432 AND :5433); the RLS spec asserts the forge and the restore refused. The value set is now declared in THREE places (domain const,
  SQL CHECK, contracts `z.enum`); the console packet and the admin DERIVE from the contract.
- **RD15 — the index needs a writer guard too.** v1.4 named none. ⇒ an accept without a non-empty `acceptedDateIndex` ⇒ `invalid_date` (the
  date and its index travel together; the API computes the index from the same regex-checked `body.accepted_date`, so `blindIndex('')` is
  unreachable); a reject with one ⇒ `date_on_reject`. ⭐ **Placement (pinned):** the index checks go INSIDE the existing guards — joined to
  `invalid_date` (`:115`) and to `date_on_reject` (`:119`); then `register_check_required` / `register_check_not_allowed` AFTER `:128`. The
  four existing shape guards (`death-certificate-review-persist.ts:113-128` — `reason_on_accept`, `invalid_date`, `date_on_reject`,
  `missing_reason`; `missing_display` `:108` and `missing_note` `:112` before them) keep their order, so every existing refusal keeps its code
  (the API refusal table builds its reject rows from `acceptBody`, `apps/api/tests/integration/claims/death-certificate.spec.ts:238-247`), and
  "accept with neither field" / "reject with both" each have ONE defined code a test pins.
  ⚠⚠ **The two new input fields are OPTIONAL and every new guard tests NULLISH** — `readonly registerCheck?: DeathCertificateRegisterCheck |
  null; readonly acceptedDateIndex?: string | null;` and `== null` / `!= null`, ⛔ never `!== null`. The house style (`readonly acceptedDate:
  string | null;` at `:65`, guarded `!== null` at `:119`) would either break every typed reject caller at typecheck (required `T | null`) or,
  if made optional but guarded `!== null`, refuse EVERY reject that leaves them out at RUNTIME (`undefined !== null`) — including the callers
  cast `as never`, which typecheck cannot see (jobs `claim-certificate-reminders-live.test.ts:188`, API `certificate-reminder.spec.ts:203`).
  ⇒ find those by `grep`, ⛔ never by `tsc`.
- **RD16 — erasure moved and adds ⛔ no statement.** The review scrub is `member/anonymize.ts:242-249` (⛔ no row filter — every review of the
  deceased); `acceptedDateIndex: null` joins its existing `.set` ⇒ the pins stay **22 statements / 19 tables** (`rtbf-anonymize.test.ts:191`,
  `:225`) and **21** with ⛔ no claims (`:256`). Live specs: `packages/domain/tests/integration/claim/death-certificate-rtbf.spec.ts:38` (raw
  inserts as `twt_app` — add the index, assert NULL; this one exercises the grant ⇒ 42501 without it) and the API `death-certificate.spec.ts:519`
  (real writer + real anonymizer).
- **RD17 — the success audit carries ⛔ no `register_check`** (`claims.death-certificate.handlers.ts:225-236`). ⭐ Add it — a plaintext non-PII
  code, GI14's posture (codes, ids, counts). ⛔ Never the date or its index.

**The console and the fixtures**
- **RD18 — the console has ⛔ no per-assignment warning source.** `approvalWarnings` carries `kinds` only (`verifier-console.ts:376`; the shape
  spec pins its exact keys, `verifier-console-shape.spec.ts:519-520`; the handler drops `w.keys`, `:494`), and the date flag can ⛔ not be derived
  client-side (the console never carries the accepted date). ⇒ the handler STITCHES three per-item fields after both sections are
  assembled (`groundInspection` at `:313`, `approvalWarnings` at `:330`), on `GroundInspectionItem` (`packages/contracts/src/claims/verifier-console.ts:199-237`
  — strict, camelCase, consumed only by the console handler and `SignalsPanel`):
  · `dateComparison: 'differs' | 'same' | 'not_compared' | 'not_indexed' | null` (`-288` K2, `-289` L4) — from the warnings result's per-inspection
    comparison (RD9's ONE `deathDateComparison`, its order), for every completed row the console shows, own AND inherited; an un-completed
    row ⇒ `'not_compared'`; a completed row absent from the warnings result's map ⇒ `null` (the stitch matches by `ground_inspection_id`;
    the console and warnings reads are separate READ COMMITTED statements, so a row can appear between them — an unknown, ⛔ never
    "nothing"); on a FAILED read ⇒ `null` on every completed row.
  · `dateDiffersWarning: boolean | null` and `originalMismatchWarning: boolean | null` — from the warnings KEYS. ⭐ `false` wherever the
    ASSIGNMENT SECTION ALONE rules a key out (⛔ never judged from the warnings result): both flags on an un-completed row;
    `originalMismatchWarning` on an inherited row (`-289` L3 — its compared upload is the other claim's) or where the verdict is ⛔ not
    `does_not_match`. On a SUCCESSFUL read the rest come from the keys (`dateDiffersWarning` is then `false` wherever `dateComparison` ≠
    `'differs'`). On a FAILED read every flag the section does ⛔ not rule out is `null`. (A flat "`null` for every row" would print "could
    not be checked" on rows that can ⛔ never warn; a "`false` where `dateComparison` ≠ `'differs'`" judged on a failed read would turn every
    unknown into "no warning" — invariant 5.)
  ⭐ **How the keys reach the stitch:** `w` is local to the exported `assembleApprovalWarnings` (`:464-529`), which returns the strict
  `ApprovalWarningsStatus` (⛔ no keys); `w.keys` exists (`ClaimApprovalWarnings.keys`, `approval-warnings.ts:163`). ⇒ an INTERNAL
  `readApprovalWarningsSection` returns `{ section, keys: readonly string[] | null, inspectionComparisons: … | null }` (`null` on the catch
  path); the exported `assembleApprovalWarnings` keeps its signature (returns `.section`) so `verifier-console.spec.ts:1142` (the exact read
  count) and `:1179` (the call; its `toEqual` on the whole failure shape at `:1195`) stand UNCHANGED; `assembleVerifierConsole` stitches from the internal result.
  The shape pin `verifier-console-shape.spec.ts:519-520` stays byte-identical — the proof ⛔ no key reaches the wire.
  ⛔ No new read (`VERIFIER_CONSOLE_MAX_READS` stays **20**, `:177`, pinned `toBe(20)` at `verifier-console-ground-inspection.spec.ts:212`).
  The register check reaches the document section (`VerifierReviewItem.review`, `verifier-console.ts:116-133`) through
  `readDeathCertificateSnapshot`'s explicit SELECT (`death-certificate-approval.ts:121-128`) + `LiveDeathCertificateReview` (`:46-53`) + its
  row mapping (`:148`) ⇒ `review.registerCheck` — a DOMAIN edit (Task 2), ⛔ no new read. Fixtures that gain the strict fields:
  `packages/contracts/tests/claims-verifier-console.test.ts:177-195`, `apps/admin/tests/verifier-console.test.tsx`,
  `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`, the `review` fixtures in
  `apps/admin/tests/death-certificate-review.test.tsx` and `verifier-console-route-name-check.test.tsx`, and the domain unit fixture
  `packages/domain/tests/claim/death-certificate-family-status.test.ts:41` (`reviewOf` — a typed `LiveDeathCertificateReview`; domain tests
  are typechecked).
- **RD19 — the red-by-design list is far wider than v1.4's one spec.** The 6.23a/b warning specs BUILD their late keys by re-reviewing with
  another date after the default fixture ⇒ the fixture's `family_statement` row (⛔ not currency-filtered — A3) now differs ⇒ +1
  `inspection_death_date_differs` key, and the exact counts move:
  domain `approval-warnings.spec.ts` (`determine(ctx, istDaysAgo(…))` at `:400`, `:407`, `:438`, `:450`, `:466`, `:474`, `:489`, `:513`, `:526`;
  pins `:440-452`, `~:494`) · domain `approval-warnings-every-approver.spec.ts` (`redetermineAndRecheck` at `:293`, `:496`, `:520`, `:536`, `:723`,
  `:754`, `:782`, `:998`; `determine` at `:439`) · API `approval-warnings.spec.ts` (`redetermine` `:338`, `:391`; `uncoveredSinceApproval: 1` at
  `:398`; the `:401` re-accept; kind pins `:342-343`, `:356`, `:360`, `:382`) · API `approval-warnings-every-approver.spec.ts` (`redetermine`
  `:342`, `:630`, `:830`; `kinds: ['post_death_version'], uncovered_count: 1` at `:413`, `:416`, `:638`, `:640`, `:672`, `:840`, `:879`; kind
  arrays `:404`, `:649`, `:860`) · domain `death-certificate.spec.ts:448-466` (v1.4's one) · domain `nominee-name-check.spec.ts:769-818`
  (6.23b Trap 17 — `determine(-45)` after the fixture; `toMatchObject({ kinds: ['post_death_version'] })` at `:805-808` compares the ARRAY
  exactly). ⚠ `death-certificate.spec.ts:387`, `r9-voting.spec.ts:475` and `approval-warnings.spec.ts:501` are ⛔ not red (the certificate
  conjunct answers first, `nominee-name-check.ts:416`); `approval-warnings.spec.ts:409` stays `kinds: []` (the family date is tomorrow).
  ⭐ **A SECOND mechanism — a literal index stand-in** on a claim whose accepted review now carries the fixture's (or the real) index ⇒ the
  date "differs": domain `ground-inspection-approval.spec.ts` (`inspectNow`, `:207-229`, completes with `index: 'idx'` ⇒ AC3 (a) `:365-373`
  and (b) `:375-387` throw `ApprovalWarningReasonRequiredError` on `vote(ctx)`; AC3 (c) `:389-436`'s finalize throws
  `R9ApproveVotesNeedWarningReasonError`) — amend `inspectNow` to `fixtureDeathDateIndex(<the accepted date>)`; API
  `verifier-console-shape.spec.ts:215-247` (`seedInspection` raw-inserts `'fixture-death-date-index'`; `adjudicate(…'approved')` at `:381`,
  `:384` sends ⛔ no reason ⇒ throws) — amend the raw row to `deathDateBlindIndex(<accepted date>, p, deps.encryption)`.
  ⚠⚠ **⛔ NOT amended by naming the key: `approval-warnings.spec.ts:414-418`** (`-279` A3 — *"a stale determination ⇒ `warnings_not_current`"*).
  Its `rereviewOnly(ctx, istDaysAgo(10))` makes the family date differ ⇒ a date key ⇒ `reviseDecision` answers `warning_approval_final`
  FIRST (`kinds.length > 0` is checked before `awaiting_determination`, `verifier-decision-persist.ts:629-642`) ⇒ naming the key would delete
  A3's coverage. ⇒ rebuild it on a SAME-date re-review — a new review id makes the determination stale with ⛔ no date key — through a
  DIRECT `recordDeathCertificateReview` call (`seedAcceptedDeathCertificate` returns early on a same-date ciphertext, `_helpers.ts:951-959`).
  ⭐ **A THIRD, checked and EMPTY — `-288` K3 inside one BEGIN/ROLLBACK:** every claim approved through `adjudicateClaim` in a
  single-transaction test becomes a candidate for the inspection arm (its completion's `clock_timestamp()` is later than the approval's
  transaction-start `now()`, whatever the statement order). On the normal path it is dropped (⛔ no uncovered key); on the FAULT path it
  lists — but the only domain fault-path spec (`approval-warnings-every-approver.spec.ts:986-1050`) already lists its two approved claims
  (`late`, `second`), and `returned.cid` has ⛔ no verifier-decision row (`driveClaimTo` only projects events, `_helpers.ts:722-759`; the
  late arm needs a live APPROVED `v` row) ⇒ ⛔ nothing red, ⛔ no `backdateCompletion` helper. API Trap 15 (`:886-905`): `lateWarnedWorld`
  seeds its inspection BEFORE the approval request ⇒ ⛔ not a candidate. ⚠ v2.2 wrote that `:1000-1046` goes red and ordered a back-date —
  false (struck in v2.3).
- **RD20 — direct accept callers break when `registerCheck` becomes required** (Task 2), incl. **`apps/jobs`, which v1.4 never named**:
  domain `death-certificate.spec.ts` (`accept()` helper `:111` → `:171`, `:213`, `:218`, `:237-298`; ⚠ `reject()` `:128-136` is BUILT FROM
  `accept()` ⇒ once `accept()` carries `registerCheck: 'matches'` + an index, every valid `reject()` (`:269`, `:287`, `:298`, `:331`, `:577`,
  `:610`) is refused — `date_on_reject` first (the index check joins `:119`), else `register_check_not_allowed` — `reject()` overrides `registerCheck: null, acceptedDateIndex: null`; and `accept()`
  derives its index from the SAME date its ciphertext carries — `fixtureDeathDateIndex(over.acceptedDate ?? PAST)`, ⛔ never a static
  `fixtureDeathDateIndex(PAST)`, since `seedGroundInspection` reads the family date back from the ciphertext, `fixtureAcceptedDateOf`,
  `_helpers.ts:1031-1034`), `death-certificate-concurrency.spec.ts:149-155`;
  API `death-certificate.spec.ts`'s `acceptBody` (`:197-207` → every HTTP accept `:215`, `:266`, `:270`, `:281`, `:344`, `:353`); jobs
  `apps/jobs/tests/_claim-correction-seed.ts:164-167`, `claim-certificate-reminders-live.test.ts:527-528`,
  `claim-ocr-parity-death-certificate.test.ts:192-199` (its accept leg). The rejects (`certificate-reminder.spec.ts:203`, API
  `death-certificate.spec.ts:174`) need ⛔ no field. Raw review INSERTs (the RLS spec, `death-certificate-rtbf.spec.ts`) stay valid (⛔ no CHECK
  requires the new columns on accept). ⇒ run the **jobs** suite too.
- **RD21 — the test helpers exist.** Domain `seedGroundInspection(client, p, c, { deathDate?, verdict?, stage?, force? })` (`_helpers.ts:1046`)
  already takes a date and a verdict; the API twin `ensureGroundInspection(deps, scopeTx, p, c, { force, verdict })`
  (`apps/api/tests/integration/_nominee-name-check-fixture.ts:142-198` — ⚠ under `integration/`, ⛔ not `claims/`) takes `{ force, stage,
  verdict }` and copies the accepted date (`:156-159`) ⇒ it gains a `deathDate?` option for the date kind. ⚠ Without `force` it returns null
  at `:153` once the default inspection is complete ⇒ every per-kind call is `{ force: true, deathDate }` / `{ force: true, verdict }`.
  ⭐ Both default fixtures seed the review FIRST and the inspection LAST (domain `_helpers.ts:1336` → `:1375`; API `:304` → `:312`/`:353`).
- **RD22 — GI18 has ⛔ no fixture path, and building it by re-review drags in the re-determination.** Neither certificate fixture takes a
  register check, and both reuse an accepted review by comparing the DATE only (domain `_helpers.ts:958`, after the `opts.date === undefined`
  early return at `:953`; API a decrypted-date compare at `:103`) ⇒ passing `does_not_match` to an already-accepted claim with the same date silently gets the reused `matches` review. A second
  review stales the determination (`assertDeathCertificateAcceptedForApproval` → `determination_stale`, `death-certificate-approval.ts:424-425`)
  ⇒ a test that re-reviews meets that 409 before the warning. ⇒ both certificate fixtures gain `registerCheck?` (default `'matches'`), threaded
  through BOTH `seedNomineeNameCheck` copies' opts so a GI18 claim is accepted `does_not_match` BEFORE its determination, and the reuse path
  (incl. the `opts.date === undefined` early return) compares `register_check` too — ⛔ never the date alone. K1's same-certificate leg (a `does_not_match` review superseded by a `matches`
  re-review of the SAME upload ⇒ the key STAYS; and L1's — a second `does_not_match` re-review ⇒ the SAME key, still covered) re-determines after the re-review (the `death-certificate.spec.ts:448-466` dance).

**v2.2 additions (the fresh-context validate of v2.1)**
- **RD23 — a name-scanning source fence covers four of the files this story edits.** `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`
  — `FENCED_FILES` (`:38-110`) includes `approval-warnings.ts`, `death-certificate-review-persist.ts`, `death-certificate-approval.ts`,
  `correction-queue-read.ts`; the rule at `:136` forbids `toLowerCase()\s*===` / `toUpperCase()\s*===` / `trim()\s*=== '<x>'`; `:331-336` forbids
  `decrypt`, `accepted_date_ciphertext` (and four more) in `approval-warnings.ts`; `:159` pins `FENCED_FILES.length` at `toBe(36)`. ⇒ compare
  ids with plain `===` (PG returns lower-case uuids — [[project_branded_ids_lowercase]]), ⛔ never `.toLowerCase() ===`; ⛔ never
  `registerCheck.trim() === …`; `deriveDeathFactWarningKeys` / `deathDateComparison` live IN `approval-warnings.ts` (a new module would
  join `FENCED_FILES`, 36 → 37, in the same commit).
- **RD24 — the kind-pin test's message carries a tripwire for row 6-27.** `approval-warnings.test.ts:56-61` reads *"a new kind enters 6.23b's
  wait (`-277` Q3 B) — its producer row decides or routes that before extending this list"*; `-279` A6 + its Consequence 2 bind rows 6-26
  AND 6-27. ⇒ the message KEEPS that sentence (6-27 still owes it) and ADDS *"GI6 / GI7 (`-282`) and GI17 / GI18 (`-281` Q1 B) discharged
  it for these three"* — ⛔ never replaced ([[feedback_mechanization_split_commitment]]).
- **RD25 — the leg-(a) / RD1 "not a candidate" assertion is INVISIBLE on the queue's normal path.** `qualifyingRows` drops a candidate with
  ⛔ no uncovered key (`correction-queue-read.ts:354-358` — `if (!hasLiveUnresubmittedReturn && !sentBackByCheck && !lateWarningAwaitingReason)
  continue;`) and a fixture inspection before approval yields ⛔ no key, or keys the approval row covered (`verifier-decision-persist.ts:478-490`) ⇒ the
  claim is unlisted whether or not it is a candidate; a normal-path leg (a) stays green with the comparator reversed or K3 reverted.
  ⇒ candidacy is asserted on the FAULT path (force the late-arm read to fail — `approval-warnings-every-approver.spec.ts:1022-1031`,
  corrupting the UUID parameters of the statement containing `discarded_member_version_ids`; candidates then list with
  `lateWarningAwaitingReason: true, lateWarningUncoveredCount: null`; the API twin's `withFault`, `:62-69`, its proxy `:39-49`). ⚠ **Non-vacuity:** in a fresh Pariwar with ⛔ no other candidate the late-arm
  statement never runs and the fault never fires — seed a CONTROL candidate (e.g. a returned claim) and assert the fault fired (`told === 1`,
  as `:1049` does).
- **RD26 — "⛔ not listed once its routing row is superseded" is HOLLOW with real writers.** Only `finalizeR9Outcome` supersedes a routing
  row (`r9-voting-persist.ts:714-726`); finalize-approve cannot pass the late wait (the gate runs first, `:657-667`); finalize-deny moves the
  claim to `denied`, which `CORRECTABLE_SCAN_STATES` already excludes ⇒ that leg stays green with `liveRoutedToR9Exists()` deleted. ⇒ the
  routing row is superseded by a direct superuser UPDATE (the `verifier-console-shape.spec.ts:276-286` `supersedeDecision` pattern), the claim
  still in `state_trustee_approved`; red-check: deleting the `liveRoutedToR9Exists()` conjunct turns it red.
- **RD27 — E1 widens an existing deferred gap.** The queue's coverage has ⛔ no actor exclusion (`correction-queue-read.ts:326-329`; the
  `deferred-work.md` item *"A late key covered ONLY by a late reason whose recorder then approves is ⛔ not listed"*). Pariwar Admins hold
  `claim.approve` (`roles.ts:348`) and may record the late reason (`claims.verification-decision.routes.ts:131-142`) ⇒ in R9 an approve voter's
  own late reason hides the claim from the queue while finalize still waits for the District Admin — the `-280` scenario
  (`approval-warnings.spec.ts:471-484`), now reachable for the new kinds. ⛔ Not fixed here (an actor-relative queue is the item's own
  question) — appended to that item (Task 4.2).
- **RD28 — the erasure item's trigger FIRES.** `deferred-work.md`'s *"6.7's own Tier-1 inspection columns are ⛔ not in the member erasure"*
  ends *"⭐ Trigger: … or the next story that touches `anonymize.ts`"* — this story. Whose data those columns are is still counsel's
  (the `-243` posture) ⇒ recorded as FIRED, ⛔ NOT ADDRESSED, ⛔ no widening (Task 11).
- **RD29 — a register check is immutable, and a recorded mismatch is ANSWERED, ⛔ never withdrawn (`-289` L2).** `register_check` is
  immutable (the trigger) ⇒ a District Admin who recorded `could_not_check` and later checks writes a NEW review, which stales the
  determination and the name check (6.21a D8). ⛔ Never "fixed" with an UPDATE path. ⭐ A `does_not_match`, once recorded on the current
  upload, stays a warning for that certificate whatever later reviews say (GI18 / L1) — a mistaken one is answered by each approver's reason
  and note. ⚠ The only way it stops is a replaced upload, allowed only after a REJECT (`death-certificate-approval.ts:196`) — a loophole
  recorded in `deferred-work.md` (Task 11), ⛔ not closed here. A re-review after approval lists the claim in the queue once the District
  Admin RE-DETERMINES (the `nd.decided_at > v.decided_at` arm); until then the gate answers `determination_stale` (6.21a, unchanged).
- **RD30 — the domain snapshot change is a domain task.** `death-certificate-approval.ts:121-128` (SELECT gains `r.register_check`), `:46-53`
  (`LiveDeathCertificateReview` gains `registerCheck`), `:148` (the row mapping) — Task 2, ⛔ not Task 6.
- **RD31 — admin pieces v2.1 left out:** the accept-object builder in `submit()` (`DeathCertificateReviewControl.tsx:133-137`); the
  `incompleteAccept` words (`claim-verification/i18n-en.ts:733`, *"Enter the date of death and write a note…"*) must name the register check;
  words for `register_check: null` on an ACCEPTED pre-6.26b review (*"register check not recorded"*) in the history line and the status line
  (a rejected row shows nothing); `NomineeDeclarationPanel.tsx:121`'s `warningLine(kind: ApprovalWarningKind…)` takes the narrowed type too;
  `DeathCertificateReviewStatus` is DEFINED at `DeathCertificateReviewControl.tsx:39-56` (rendered at `VerifierReviewPanel.tsx:114`); the
  doc-blocks addressed to this story — `SignalsPanel.tsx:364` (*"(Story 6.26b turns it into a warning)"*) and contracts `verifier-console.ts:217` (*"(Story 6.26b turns a `does_not_match` into a warning)"*), `verifier-console-ground-inspection.spec.ts:264` (*"6.26b makes it a warning"*) — amended to the present tense where the files are touched.

## Acceptance Criteria

### AC0 — Governance and re-pin (Task 0)
6.26a is `done` ✅; the author-commit (GI1–GI18), `-281`, `-283`, `-284`, `-288`, `-289`, `-290` (and `-285`, `-286`, `-287`, which add
⛔ no mechanism here) are in `.decision-log.md` ✅ (`-288` `0152ead9`, `-289` `51c8eb4e`, `-290` `94a0fad2` — each committed alone); the baseline is re-pinned to `b665a19a` and every code claim
re-derived ✅ (v2.0, re-verified v2.2); work is on `story/6-26b-death-facts-warnings-and-register-check` ✅. RD1's author choice ✅ confirmed
by BigDev 2026-10-07 and refined by `-288` K3. ⛔ No code before.

### AC7 — The register check (GI8) *(the number is kept from v1 of Story 6.26 — 6.26a cites it)*
An ACCEPT without `register_check` → 409 `death_certificate_review.register_check_required`; a REJECT with one →
`…register_check_not_allowed` (after the existing four guards — RD15); an accept stores it and `accepted_date_index` (computed by the handler
through `deathDateBlindIndex` — RD12); the success audit carries the code (RD17) and the `claim.death_certificate_reviewed` payload does
⛔ not (GI16); the console's document section and the review history show it in words, and an accepted review with ⛔ no register check
(pre-6.26b) shows *"register check not recorded"* (RD31); ⛔ no certificate number is stored; ⛔ nothing pre-selected in the form; Submit
stays disabled on accept until one is chosen, and the incomplete-accept words name it (RD31); the two new codes have their own admin words
(RD11). Every existing refusal keeps its code, and a reject that omits the new fields is ⛔ never refused for them (RD15). The value is
immutable — a later check is a new review, and a recorded `does_not_match` is ⛔ never withdrawn by one (RD29, `-289` L2).

### AC8 — The warnings (GI6, GI7, GI17, GI18)
**Given** an accepted certificate dated D:
- a completed full assignment whose family date ≠ D ⇒ `inspection_death_date_differs`; = D ⇒ ⛔ no key; ⛔ no accepted certificate ⇒ ⛔ no key;
  an INHERITED visit whose family date ≠ D ⇒ the key too, while the claim has ⛔ no own completed full visit, and ⛔ no key once it has one
  (`-289` L3); an inherited `certificate_check` ⇒ ⛔ no key (the other claim's upload); a `certificate_check` whose printed date ≠ D ⇒ the key too (6.26a GI5's `original_certificate` source)
  — but ⛔ no key once that original is ⛔ no longer the claim's current upload (`-283` A3; still shown); a pre-6.26b accepted review (⛔ no
  index) ⇒ ⛔ no date key;
- a completed assignment with verdict `does_not_match` compared against the CURRENT upload ⇒ `original_certificate_mismatch`; against a
  replaced upload ⇒ ⛔ no key (still shown);
- any accepted review of the CURRENT upload with `register_check = 'does_not_match'` ⇒ ONE key `register_check_mismatch:<upload_id>` —
  ⭐ STILL when a later `matches` / `could_not_check` re-review of the SAME upload superseded it (`-288` K1); a second `does_not_match`
  re-review ⇒ the SAME key, still covered (⛔ no new wait — `-289` L1); a first `does_not_match` after the District Admin approved ⇒ late;
  ⛔ no key once the upload is replaced; `matches` / `could_not_check` alone ⇒ ⛔ no key.
**And** the District Admin's approval while any of these shows needs a warning reason and a note (6.23a NW6 — unchanged code path), and
every later approver's too (6.23b). **Given** the District Admin approved and an assignment then completes with a differing date or a
`does_not_match` verdict ⇒ the final approval WAITS (`LateWarningReasonRequiredError`) until the District Admin's NW14 late reason covers
the new key, **and meanwhile the claim is listed in the District Admin's correction queue** (`lateWarningAwaitingReason: true`) — **including an
R9-routed claim in `state_trustee_approved`** (`-284` E1), which is ⛔ not listed once its routing row is superseded (RD26 — a direct
supersession, the claim still in that state); **and** a refile with ⛔ no own completed full visit that relies on an inherited visit is
listed (`lateWarningAwaitingReason: true`) when its SOURCE gains a completed visit with a differing family date after the District Admin's
approval (`-290` M2; Task 4.0 (e)) — and with nothing uncovered it is ⛔ not listed on the normal path; and at R9 finalize every approve vote cast before the new key must be revised (RD4) —
including on `-285`'s R9-first path, where ⛔ no District Admin approved (⛔ no late wait, only the votes' revision). **And** a claim whose
inspection completed BEFORE its approval is ⛔ not a late-warning candidate (RD1 / K3) — asserted on the queue's FAULT path (RD25), every
ordering assertion proved in SEPARATE COMMITTED transactions (Task 4.0). **And** a re-review after the District Admin's approval that
moves the accepted date to ANOTHER differing date keeps GI6's key covered (`-288` K4 — a pinned test, ⛔ not a defect).
**And** both readers derive every kind from the SAME pure helper (`deriveDeathFactWarningKeys`, over the ONE `deathDateComparison` — a unit
table for each, plus the live bulk-vs-single parity with each kind); `APPROVAL_WARNING_KINDS`' pin test and the contracts mirror are updated,
the pin's message KEEPING the row-6-27 sentence and adding GI6 / GI7 / GI17 / GI18 and `-281` (RD24); the timeline's kind type is
`NOMINEE_VERSION_WARNING_KINDS` (RD8); the no-comparison fence stays green at its count (RD23).

### AC9b — What the console and the later surfaces say (GI10 [b], GI11 [b])
Each kind has its own words (in the typed map); every RD10 staff string is kind-neutral and every genuinely nominee-change string is
unchanged (RD10); the console's assignment rows (RD18, `-288` K2) show *"differs from the certificate"* wherever `dateComparison` is
`'differs'` — as a WARNING where `dateDiffersWarning` is true (an inherited one labelled *"given on an earlier claim"*, provenance only —
`-289` L3); *"Could not be compared with the certificate"* where `'not_indexed'`; *"Whether this differs from the certificate could not be
checked just now"* (words distinct from the register check's *"could not be checked online"*) where `dateComparison` is `null` (a failed
read — or a completed row the warnings read did not see, RD18); nothing where `'same'` / `'not_compared'`. On the VERDICT line: the mismatch warning where `originalMismatchWarning` is true;
*"Whether this is a warning could not be checked just now"* where it is `null`; nothing where `false`. The register check shows on the
document section and in the review history. ⛔ No warning text carries a date — a test renders every kind line, every new date-comparison
line and the mismatch line, and asserts ⛔ no `YYYY-MM-DD` / day-month pattern IN THEM (the GI10 [a] date line is 6.26a's and shows the date
by design).

### AC11b — Erasure (GI13 [b])
The anonymizer sets the review's `accepted_date_index` NULL in the existing review scrub (RD16 — ⛔ no new statement; pins unchanged); the
unit test asserts the column in the SET; the live RTBF spec erases a deceased whose claim has an accepted review written AFTER this
migration — ⛔ no 23514, ⛔ no 42501.

### AC12b — Nothing else moves (GI16)
Catalog version **51** / key count **65** unchanged (`permissions.test.ts` — its existing pins stay green); ⛔ no new event and ⛔ no new
payload field; ⛔ no new rule or reason code beyond GI8's two refusals; ⛔ no file under `apps/mobile`, `apps/public` or `packages/i18n`
changes — checked at Task 11 by `git diff --name-only b665a19a..HEAD -- apps/mobile apps/public packages/i18n` (empty).

### AC13b — The proof
Every test below passes; GI15 [b]'s fixtures raise ⛔ no warning on any approve-path spec; every RD19 / RD20 spec is amended, ⛔ never weakened;
`pnpm ci:local` green with `DATABASE_URL` at :5433 (domain, API, **jobs**, admin, contracts); the migration applied to BOTH :5432 and :5433.

## Tasks / Subtasks
- [x] **Task 0 (AC0)** — ✅ 6.26a `done`; ✅ re-pinned to `b665a19a` and re-derived (v2.0; re-verified v2.2, 2026-10-07); ✅ `-288` / `-289` / `-290`
  committed (`0152ead9`, `51c8eb4e`, `94a0fad2`); ✅ branch. At the build: `git fetch origin`; `git diff --name-only b665a19a..HEAD -- packages apps scripts` (re-read any cited
  file it lists); confirm ⛔ no decision after `-290` touches GI6–GI8 / GI17 / GI18 or the [b] halves of GI10 / GI11 / GI13 / GI15 / GI16.
  (RD1 ✅ confirmed by BigDev 2026-10-07, refined by `-288` K3 — ⛔ nothing left to ask.)
- [x] **Task 1 — Migration (AC7, AC11b, AC13b; GI8; RD14)** — `0149_death-certificate-register-check.sql`: `claim_death_certificate_reviews` +
  `register_check text` (`claim_death_certificate_reviews_register_check_check`: `IN ('matches','does_not_match','could_not_check')`, NULL
  allowed) + `accepted_date_index text`; a VALIDATED CHECK `claim_death_certificate_reviews_register_check_coherence_check` — `"verdict" <>
  'rejected' OR ("register_check" IS NULL AND "accepted_date_index" IS NULL)`. ⚠⚠ "an `accepted` review carries both" is ⛔ NOT a CHECK — it
  is the WRITER's guard (Task 2) + a test: every pre-6.26b accepted review lacks both, and two existing UPDATEs rewrite those rows — the
  anonymizer's review scrub sets `noteCiphertext` on EVERY review of the deceased (`member/anonymize.ts:242-249`) and the review writer's
  supersession (`death-certificate-review-persist.ts:178`) — so such a CHECK would fail every erasure and make every pre-6.26b certificate
  un-re-reviewable. ⚠⚠ **GRANTS and the trigger:** `0122:138` / `:140` grant `twt_app` only `SELECT, INSERT` + `UPDATE ("superseded_at",
  "superseded_reason", "accepted_date_ciphertext", "note_ciphertext")` ⇒ add `GRANT UPDATE ("accepted_date_index") ON
  "claim_death_certificate_reviews" TO twt_app` (GI13 [b]'s scrub — else 42501); `CREATE OR REPLACE FUNCTION
  claim_death_certificate_reviews_reject_mutation()` restating `0122:159-187`'s body with `register_check` added to the `IS DISTINCT FROM`
  list (`accepted_date_index` stays OUT — the scrub NULLs it; the ciphertext precedent, RD14). Drizzle schema
  (`schema/claim_death_certificate_reviews.ts` — an `as const` values array + type, the table's convention, with a LOCKSTEP comment); journal
  idx 149, `when: 1793590800000` (> 0148's `1793504400000`); apply to :5432 AND :5433 ([[project_live_db_test_gotchas]]).
- [x] **Task 2 — Domain: the review writer and the snapshot (AC7; GI8; RD15, RD29, RD30)** — `RecordDeathCertificateReviewInput`
  (`death-certificate-review-persist.ts:58-81`) gains OPTIONAL `registerCheck?: … | null` and `acceptedDateIndex?: string | null`; every new
  guard tests NULLISH (RD15 — ⛔ never `!== null`). The index checks join `invalid_date` (`:115`, accept without a non-empty index) and
  `date_on_reject` (`:119`, reject with one); then, after `:128`, accept ⇒ `register_check_required`, reject ⇒ `register_check_not_allowed`.
  `DeathCertificateReviewRefusedError`'s union (`claim/errors.ts:584-604`) widened by the two codes. ⛔ No API mapping change (RD11); ⛔ no
  event-payload field (GI16, `:215-225`). The snapshot (RD30): `death-certificate-approval.ts:121-128` SELECT gains `r.register_check`,
  `LiveDeathCertificateReview` (`:46-53`) gains `registerCheck`, the mapping at `:148` carries it; `death-certificate-family-status.test.ts:41`'s
  `reviewOf` gains it. ⛔ No compare written `.toLowerCase() ===` / `.trim() === '…'` (RD23).
- [x] **Task 3 — Domain: the kinds and the comparison (AC8, AC9b; GI6, GI17, GI18, `-288` K1/K2; RD6–RD9, RD23, RD24)** (`claim/approval-warnings.ts`)
  - [x] 3.1 `NOMINEE_VERSION_WARNING_KINDS` exported; `APPROVAL_WARNING_KINDS = [...NOMINEE_VERSION_WARNING_KINDS, 'inspection_death_date_differs',
    'original_certificate_mismatch', 'register_check_mismatch']`; `classifyNomineeVersion` returns the version type (RD8); the pin test's
    expected list, its message KEEPING the row-6-27 sentence and ADDING the discharge (RD24); the contracts mirror (+ `NomineeVersionWarningKind`)
    and both lockstep tests.
  - [x] 3.2 Both statements select (RD6) the completed `inspections` — own, AND inherited (through `inheritedGroundInspectionSourceSql`,
    every stage, ONLY while the claim has ⛔ no own completed FULL assignment; `inherited` flag) — `(ground_inspection_id, inherited, death_date_index, death_date_source,
    original_certificate_verdict, compared_certificate_upload_id)` as a JSON array (single: a CTE / scalar subselect; bulk: a `LEFT JOIN
    LATERAL` with `coalesce(json_agg(…), '[]')`); `current_upload_id` via `currentDeathCertificateUploadIdSql(sql\`c.pariwar_id\`,
    sql\`c.claim_case_id\`)` (RD7); whether a current accepted review exists and its `accepted_date_index`; and `register_mismatch_present`
    (`-289` L1 — EXISTS an accepted `does_not_match` review of the current upload, live or superseded). ⛔ No ciphertext; raw SQL with explicit aliases
    ([[project_epic6_drizzle_correlated_subquery_bug]]); the bulk twin keeps its slicing; `nominee-refusal-read.ts` added to the safe-leaves
    comment and the transitive import scan (`approval-warnings.test.ts:330-349`) stays green.
  - [x] 3.3 Exported, pure, in THIS module (RD9, RD23): `deathDateComparison(row, currentReview, currentUploadId)` →
    `'differs' | 'same' | 'not_compared' | 'not_indexed'`, in RD9's ORDER (`-289` L4); `deriveDeathFactWarningKeys` — GI6 (every selected
    row, own or inherited, whose comparison is `'differs'` — `-289` L3), GI17 (OWN rows only, `does_not_match`, compared upload = current),
    GI18 (ONE key `register_check_mismatch:<current upload_id>` when `register_mismatch_present` — `-289` L1). Called by `deriveClaimApprovalWarnings` OUTSIDE the `postDeath === 'evaluated'` block (`:529-534`); the result also carries the
    per-inspection comparisons for the console (K2). Keys via `approvalWarningKey`.
- [x] **Task 4 — Domain: the clock and the queue (AC8; GI7 + `-284` E1, `-288` K3; RD1–RD5, RD25–RD27)** — `correction-queue-read.ts`
  - [x] 4.0 ⭐ FIRST, the clock (RD1, `-288` K3): `completeGroundInspection` stores `completedAt: sql\`clock_timestamp()\``; `input.now`
    validates only; amend the pin (`ground-inspection.spec.ts:631-642`) and its comment — in SQL, in the same test transaction, after a
    `SELECT pg_sleep(0.001)` before the completion: `completed_at > now()` (STRICT — `clock_timestamp()` at the UPDATE is after the
    transaction start; a revert to `now()` ties and fails) AND `completed_at <>` the injected `now` (the pin injects a PAST `now`,
    `2026-06-01T19:00Z`, so a revert to the injected clock fails too); append the reversal note to
    6.26a's *"Review Findings — bmad-code-review 2026-10-07 (chunked: …)"* section, `packages/domain` chunk (citing `-283` A6 and `-288` K3);
    in `deferred-work.md`, mark *"The fixture's completion clock can be in the FUTURE"* DISCHARGED with an appended line correcting its prose
    and its proposed fix (the comparator is the verifier approval's `decided_at`, as its own formula says) — ⛔ never deleted
    ([[feedback_closure_language_precision]]).
    ⭐ **Transaction-separated ordering tests (BigDev, v2.1):** every assertion of an ORDER between an approval and a completion runs them
    in SEPARATE COMMITTED transactions — ⛔ never inside one `setupLiveDb` BEGIN/ROLLBACK envelope (there `clock_timestamp()` is always later
    than the approval's transaction-start `now()`, whatever the statement order).
    · **Domain:** a NEW own-committing spec (e.g. `claim/correction-queue-late-inspection.spec.ts`), the
      `packages/domain/tests/integration/claim/ground-inspection-concurrency.spec.ts` pattern (its own `pg.Pool`, each step `BEGIN` →
      `setPariwarScope` → work → `COMMIT` on its own client; cleanup by THIS suite's claim ids + derived idempotency keys — a `claims` delete
      cascades to inspections and photos; `events_log` rows removed under `SET LOCAL session_replication_role = 'replica'`; members and nominee
      versions are ⛔ not removed by the cascade — delete them too). ⭐ A FRESH random Pariwar per test (the queue is Pariwar-scoped and pages
      newest-first at 50; the concurrency spec's shared `PARIWAR_A` would mix suites). Precedent for domain fixtures in own transactions:
      `nominee/nominee-history-concurrency.spec.ts:146-150`. Sequence: tx1 `driveClaimTo(…'verifier_review')` + `seedNomineeDeclaration` +
      `seedNomineeNameCheck`; tx2 `adjudicateClaim` approve; tx3 `seedGroundInspection(c, p, cid, { force: true, deathDate | verdict })`;
      tx4 `listClaimsUnderCorrection` + `voteOnFrozenClaim` (it reaches the wait first — the gate runs at `state-trustee-decision-persist.ts:582`,
      before the reason rule at `:602`). Leg (c): `seedR9` (superuser), the P3 vote, `routeToR9` from `state_trustee_approved`.
    · **API:** each HTTP request is its own transaction (`openScopeTx`, `scope-tx.ts:34-48`; fixtures commit via `closeScopeTx(…, true)`) ⇒
      ⛔ never collapse the steps into one `scopeTx` fixture call.
    · **The legs ((a)–(c) in BOTH layers; (d), (e) domain only):** (a) the fixture inspection COMMITTED, THEN the approval COMMITTED ⇒ ⛔ not a candidate, asserted on
      the queue's FAULT path (RD25 — absent from the degraded list); (b) the approval COMMITTED, THEN a completion with a differing date (and,
      separately, a `does_not_match` verdict) COMMITTED ⇒ listed, `lateWarningAwaitingReason: true`, the final approval waits; (c) leg (b) on
      an R9-routed claim in `state_trustee_approved` ⇒ listed, and ⛔ not listed once its routing row is superseded by a direct superuser
      UPDATE, the claim still in that state (RD26). ⭐ Red-checks: (b) goes red when the disjunct is deleted; (a) goes red when the comparator
      is reversed (`completed_at < v.decided_at`) AND when K3 is reverted to the injected clock; (c)'s second half goes red when the
      `liveRoutedToR9Exists()` conjunct is deleted. Leg (a) seeds a CONTROL candidate and asserts the fault fired (RD25 non-vacuity).
      (d) ⭐ **THE RACE K3 EXISTS FOR (`-288` K3 (ii)), domain only:** connection A `BEGIN`s and runs one statement (fixing its `now()`);
      connection B commits the approval (the gate needs the fixture's completed visit first — so a SECOND assignment is scheduled, its
      original-certificate photo added against the current upload, and committed beforehand); A then runs `completeGroundInspection` on that second assignment (a differing date) and commits ⇒ the claim IS a candidate
      (fault path) and listed with `lateWarningAwaitingReason: true` (normal path). Red-check: revert K3 to `now()` ⇒ A's `completed_at`
      precedes the approval ⇒ red. (A blocks on B's claim lock only if B still holds it — commit B first, as written.)
      (e) ⭐ **THE INHERITED-SOURCE PATH (`-290` M2), domain only, REAL state transitions** (a `forceState` does ⛔ not survive the
      appeal writers' replay — `projectClaimState` replays the stream, and `reviewAppealStage1` needs a `claim_appeals` anchor ⇒ the T17
      spec's raw `refuse()` + `forceState` construction CANNOT reach `reversed`): tx1, S: `driveClaimTo(…'verifier_review')` + a post-death
      nominee change + `determine` (a discarded version) + `seedAcceptedDeathCertificate` + `seedGroundInspection` (a full visit), then the
      REAL `adjudicateClaim` denied `post_death_nominee_change` and the REAL `initiateAppeal` (precedent: `approval-warnings-every-approver.spec.ts:609-622`),
      COMMITTED. tx2, R (same deceased): `driveClaimTo(R, …'verifier_review')` + certificate + name check + determination; the District
      Admin approves (with reasons), COMMITTED. tx3: `reviewAppealStage1(S, 'reversed')` by a reviewer who is ⛔ none of S's deciders,
      COMMITTED (S's `-239` denial stays live — only `reviseDecision` supersedes a verifier decision, `verifier-decision-persist.ts:647-656`
      — so S stays the source). tx4: `seedGroundInspection(S, { force: true, deathDate: ≠ R's accepted date })`, COMMITTED ⇒ R is listed,
      `lateWarningAwaitingReason: true`, and `voteOnFrozenClaim(R)` waits. Red-check: delete the third disjunct ⇒ R unlisted ⇒ red. ⚠ A leg that survives its red-check is hollow — its steps share a transaction, or it
      reads the normal path where candidacy is invisible.
  - [x] 4.1 Hoist `lateArm` (RD2 a), rewrite it with the completed-after-approval disjunct AND `-290` M2's inherited-visit disjunct (RD2 b —
    `inheritedGroundInspectionSourceSql`, the one fragment, ⛔ never a copy; the queue module imports it from `nominee-refusal-read.ts`), and restructure the WHERE with the R9
    admission (RD2 c, `liveRoutedToR9Exists()` — RD3). ⛔ Never a per-claim call (an N+1); ⛔ never a new copy of the R9 predicate. The
    *"TODAY a late key can arise ONLY that way"* comment (`:198`), the `lateWarningCandidate` doc-block (`:157-161`) and the
    `lateWarningAwaitingReason` doc-block (`:81-86`, *"(a determination decided after the live approval)"*) amended (⛔ not deleted): THREE
    sources now — a determination after the approval, an own completion after it, and reliance on an inherited visit (`-290` M2) — plus the
    R9 admission; the `:197-199` *"⛔ never 'every approved claim'"* still holds, qualified: *"only claims relying on an inherited visit, a
    rare refile path"*.
  - [x] 4.2 `deferred-work.md` appends (⛔ never edits): to *"⚠ EA10's late-warning arm keys on a NEW determination"* — 6.26b added the
    completed-after-approval arm; its row-6-22 trigger still stands for the member-declare and innocence-finding sources; and the
    determination arm's transaction-start race (`-288` K3 (ii) — ⛔ not changed). To *"A late key covered ONLY by a late reason whose recorder
    then approves is ⛔ not listed"* — E1 makes it reachable in R9 for the new kinds (RD27).
- [x] **Task 5 — Erasure (AC11b; GI13 [b]; RD16)** — `member/anonymize.ts:242-249`: `acceptedDateIndex: null` in the existing `.set`;
  `rtbf-anonymize.test.ts` asserts the column (counts unchanged: 22 / 19 / 21); `death-certificate-rtbf.spec.ts` (insert an index, assert NULL
  after erasure) + the API `death-certificate.spec.ts:519` leg. The immutability of `register_check` is proved in the RLS spec (Task 10) —
  ⛔ not here (as `twt_app`, the missing column grant refuses it first, 42501).
- [x] **Task 6 — API (AC7, AC9b; RD12, RD13, RD17, RD18)** — `claims.death-certificate.handlers.ts`: pass `registerCheck: body.register_check ??
  null` and `acceptedDateIndex` (`deathDateBlindIndex(body.accepted_date, p, deps.encryption)` when the date is present) to the writer;
  `register_check` in the success audit context and in `getHistory`'s explicit object. `claims.verifier-console.handlers.ts`:
  `review.registerCheck` from the snapshot (Task 2); the internal `readApprovalWarningsSection` (RD18 — `assembleApprovalWarnings` keeps its
  signature); the three per-assignment fields stitched after both sections per RD18's rules. The API server strings of RD10.
- [x] **Task 7 — Contracts (AC7, AC8, AC9b; RD8, RD13, RD18)** — `death-certificate.ts`: `register_check` optional on the request, nullable on
  the history item; `verifier-console.ts`: `VerifierReviewItem.review.registerCheck` (nullable) and, on `GroundInspectionItem`, `dateComparison`,
  `dateDiffersWarning`, `originalMismatchWarning` (RD18); the kind enum + `NomineeVersionWarningKind`; `nominee-declaration.ts:56` narrowed;
  the `:217` doc-block's *"(Story 6.26b turns a `does_not_match` into a warning)"* to the present tense (RD31). Run contracts + mobile vitest
  ([[project_contracts_tests_outside_tsc]]).
- [x] **Task 8 — Admin (AC7, AC9b; RD10, RD11, RD13, RD18, RD31)** — `DeathCertificateReviewControl.tsx`: the register-check radio inside the accept
  fieldset (`useState<…|null>(null)` — the reject-reason radio's pattern, `:200-220`, ⛔ nothing pre-selected); `ready` (`:94`) requires it on
  accept; the fingerprint reset (`:87-93`) clears it; the local submit type (`:26-31`); the accept-object builder in `submit()` (`:133-137`);
  the history line (`:328-340`) and `DeathCertificateReviewStatus` (`:39-56`, rendered at `VerifierReviewPanel.tsx:114`) show it in words,
  and *"register check not recorded"* for an accepted review with ⛔ none. `incompleteAccept` (`i18n-en.ts:733`) names the register check.
  `VerifierConsoleRoute.tsx:419-431` passes it. The three kind lines in `i18n-en.ts` (typecheck forces them — ⚠ `register_check_mismatch`'s words say the mismatch was recorded on a
  review of THIS certificate, e.g. *"The government register was recorded as not matching this certificate"*, since under `-289` L1 the
  document section can show a later `matches` while the warning stands) and EXACTLY the RD10 strings
  reworded; the two refusal words (RD11); `NomineeDeclarationPanel.tsx:115-119` and `:121` narrowed to the version type (RD8);
  `SignalsPanel.tsx` `InspectorRecordLines` (`:367-390`) — the mismatch warning on the verdict `<li>`, the date line per AC9b (warning, inherited
  ones labelled "given on an earlier claim" / "could not be compared" on `'not_indexed'` / "could not be checked just now" on `null`), the `:364` doc-block to the present tense. `microcopy.yaml` (`scope.code_globs`
  scans every line of `apps/admin/src/**/*.ts(x)`, comments included: `report`, `passbook`, `receipt`, `invoice` whole-word, and ALL tone
  patterns — e.g. *"action required"*, *"needs action"*, *"outside the system"*, *"not counted"*, *"by mistake"*). ⚠ `EscalationPanel.tsx` is ⛔
  not touched (its words come through the shared map) ⇒ the deferred *"A FAILED refetch after a 409 hides the whole approval surface"*
  item's `EscalationPanel` half — whose trigger reads "touching either surface", judged here as the FILE — does ⛔ not trigger.
- [x] **Task 9 — Fixtures and the red-by-design specs (AC8, AC13b; GI15 [b]; RD19–RD22)**
  - [x] 9.1 `seedAcceptedDeathCertificate` (domain, `_helpers.ts:935-982`) passes `registerCheck` (default `'matches'`) + `fixtureDeathDateIndex(date)`;
    `ensureAcceptedDeathCertificate` (API, `apps/api/tests/integration/_nominee-name-check-fixture.ts:89-132`) passes the same +
    `deathDateBlindIndex(date, …)`; both take `registerCheck?`, threaded through BOTH `seedNomineeNameCheck` copies, and their reuse path
    compares it (RD22); `ensureGroundInspection` gains `deathDate?` (RD21).
  - [x] 9.2 Every direct accept caller of RD20 (domain, API, **jobs**) passes a register check and an index; the domain `reject()` overrides
    both to `null`; `accept()`'s index follows its date (RD20).
  - [x] 9.3 ⚠ **RED BY DESIGN, listed and AMENDED (⛔ never a weakened assertion):** every RD19 spec, by its mechanism — (i) re-review /
    re-determine after the fixture ⇒ name the new `inspection_death_date_differs` key/kind and count it (it IS the correct behaviour — the
    certificate moved away from the family's date); (ii) a literal index stand-in ⇒ the matching index; (iii) ⚠ `approval-warnings.spec.ts:414-418`
    is REBUILT on a same-date re-review (⛔ not by naming the key — that deletes `-279` A3's coverage) — once RD22 lands,
    `seedAcceptedDeathCertificate(…, { date: <same>, registerCheck: 'could_not_check' })` (a new review id stales the determination,
    `approval-warnings.ts:521-526`, and raises ⛔ no key); a direct `recordDeathCertificateReview` would need a `now` on or after TOMORROW.
    (K3's single-transaction effect turns ⛔ nothing red — RD19's checked-and-EMPTY third mechanism; v2.2's back-date order is struck.)
    ⛔ No `inspection: 'skip'` route (removed in v2.1, BigDev): these specs approve BEFORE they re-review, the gate needs a complete
    inspection before that first approval, and the family's date is fixed at completion ⇒ skipping only MOVES the key, ⛔ never removes it.
    ⛔ Never loosened to `toContain` without its count. Then run the WHOLE domain, API and jobs suites — any OTHER red is a fixture gap.
- [x] **Task 10 — Tests (AC7–AC13b)** (below); red-check each load-bearing one (revert the line, watch it fail, restore).
- [x] **Task 11 — Records (AC12b, AC13b)** — `sprint-status.yaml`: the row flips per [[project_sprint_status_ledger]], and ONE ledger entry
  PREPENDED as the top `last_updated` comment (size-guarded, YAML re-verified — [[project_sprint_status_safe_prepend]]); File List; Change
  Log; `deferred-work.md` (Task 4.0, Task 4.2, and RD28: append to *"6.7's own Tier-1 inspection columns are ⛔ not in the member erasure"* —
  *"Trigger fired <date> (Story 6.26b touched `anonymize.ts` for GI13 [b] only). ⛔ Not addressed: whose data the 6.7 columns are is still
  counsel's; ⛔ no widening."*; and a NEW item for `-289` L2 / Consequence 3 — *"A recorded register mismatch (and GI17's verdict) stops
  only on a replaced upload, and an upload is allowed only after a REJECT ⇒ a District Admin can launder a real mismatch by rejecting a valid
  certificate with an untrue reason and having the family re-upload the same paper"*, Trigger: the next story that touches the certificate
  reject reasons or the upload rule); AC12b's `git diff` check (empty).

### Review Findings

*(`bmad-code-review` 2026-10-07 — Blind Hunter + Edge Case Hunter + Acceptance Auditor, run in parallel per explicit instruction; triaged against `b665a19a..HEAD`.)*

- [x] [Review][Patch] Admin hand-redeclares the register-check enum instead of importing `@twt/contracts`' `DeathCertificateRegisterCheck`; of the four declarations (contracts, domain schema, migration CHECK, admin), only contracts↔domain is lockstep-tested [apps/admin/src/modules/claim-verification/DeathCertificateReviewControl.tsx:25-29] — fixed: `RegisterCheck` is now a type alias of the contract's `DeathCertificateRegisterCheck`, `REGISTER_CHECKS` derives from its `.options` (admin typecheck + `apps/admin/tests` green)
- [x] [Review][Patch] `registerChecks` i18n map is typed `as Record<string, string>` instead of `satisfies Record<RegisterCheck, string>` like every sibling kind-map in the file, losing the compile-time lockstep check [apps/admin/src/modules/claim-verification/i18n-en.ts:742-756] — fixed: now `satisfies Record<DeathCertificateRegisterCheck, string>`
- [x] [Review][Patch] `warnings_not_current`'s reworded message now claims "every warning" is unknown, but the error only ever fires when the nominee determination is stale — wrong remedy for the three new death-fact kinds, which are computed outside the post-death block and are never stale [apps/api/src/modules/claims/claims.verification-decision.handlers.ts:60-61] — fixed: reverted to the accurate nominee-determination-specific wording, with a comment explaining why this message (unlike `warning_approval_final`) was never meant to widen (`apps/api`/`apps/admin`/`packages/contracts` suites green)
- [x] [Review][Defer] `stitchDeathFactFlags` lowercases the ground-inspection id for one lookup but not the other two — harmless today (`uuidBrand` + Postgres `uuid` normalization already guarantee canonical lowercase) [apps/api/src/modules/claims/claims.verifier-console.handlers.ts:592-603] — deferred, zero functional risk, see `deferred-work.md`
- [x] [Review][Defer] No test exercises `inspection_death_date_differs` and `determination_stale` co-occurring at R9 finalize; the fixture's own new comment documents the priority (warning-reason refusal wins) but nothing asserts it directly [packages/domain/tests/integration/claim/r9-voting.spec.ts:472-479] — deferred, test-coverage gap, see `deferred-work.md`
- [x] [Review][Defer] The "no own completed FULL visit" inheritance cutoff is reimplemented independently in `deathFactColumnsSql()`'s raw SQL and in the console's own display logic, with nothing tying the two together [packages/domain/src/claim/approval-warnings.ts; apps/api/src/modules/claims/claims.verifier-console.handlers.ts] — deferred, maintainability risk, see `deferred-work.md`
- [x] [Review][Defer] `dateComparison: null` conflates a failed warnings read with a benign READ-COMMITTED race, with no telemetry distinguishing the two [packages/contracts/src/claims/verifier-console.ts:218-237] — deferred, observability gap, see `deferred-work.md`
- [x] [Review][Defer] The register-check guard runs after (and is dominated by) the pre-existing date/reason guards — deliberate, but means a client omitting both fields needs two round trips [packages/domain/src/claim/death-certificate-review-persist.ts:126-147] — deferred, minor UX rough edge, see `deferred-work.md`
- [x] [Review][Defer] "Could not be checked online" is always allowed and never raises a warning by design, with no escalation signal if a Pariwar always answers it — observational, explicitly out of scope for 6.26b [apps/admin/src/modules/claim-verification/i18n-en.ts; packages/domain/src/claim/approval-warnings.ts] — deferred, out of scope, see `deferred-work.md`
- [x] [Review][Defer] An assignment completing in the narrow window between `assembleGroundInspection`'s read and `readApprovalWarningsSection`'s read renders `not_compared` instead of reflecting the new warning [apps/api/src/modules/claims/claims.verifier-console.handlers.ts:313-336,588-589] — deferred, narrow race window, see `deferred-work.md`

**Dismissed (5, not carried forward):** the `register_check` DB CHECK gap and the `completedAt: clock_timestamp()` change (both flagged by the diff-only layer) are deliberate, already-governed decisions — migration 0149's own comment explains the CHECK tradeoff; RD1/`-288` K3/`-283` A6 record the clock split — not defects. One Edge Case Hunter finding quoted a `mismatchRuledOut` expression with three conditions that does not match the actual code (it has two), and is independently corroborated as fine by the Acceptance Auditor's RD18 check. Two Acceptance Auditor notes resolved on inspection: a spec self-contradiction the diff over-delivers against, and a "missing Records files" observation that was an artifact of this review's diff being scoped to code dirs (`git show --stat cb26fb27` confirms the actual commit includes them).

#### Review Findings — ROUND 2

*(`bmad-code-review` 2026-10-07, round 2 — a fresh full re-review of `b665a19a..HEAD` (code dirs, 4,615 diff lines, round 1's patches included), Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallel per explicit instruction, read-only; every load-bearing claim re-checked at HEAD before triage. 1 decision-needed, 7 patch, 2 deferred, 8 dismissed. ⛔ No HIGH; ⛔ no AC broken by the build.)*

- [x] [Review][Decision → Patch] `accepted_date_index` can be UPDATEd by `twt_app` to ANY value, ⛔ not only NULL — and unlike the ciphertexts it DECIDES a warning — RD14 recorded *"a `twt_app` UPDATE could forge an index — the same exposure the ciphertext columns carry today, ⛔ not tightened here"*. All three layers found independently that it is ⛔ not the same exposure: a forged ciphertext corrupts a display, a forged index (e.g. the inspection's `death_date_index` copied in) turns GI6's `differs` into `same` and silently lifts the warning and any wait, with ⛔ no event and the review row still looking immutable. The column grant (`0149:38`) exists only for the RTBF scrub (→ NULL); the restated trigger leaves the column off its deny-list; `rls/claim-death-certificate-policy-regression.spec.ts` asserts `SET accepted_date_index = 'idx'` SUCCEEDS (it pins the hole). Engineering-only (a DB backstop — ⛔ not the Panel's). Options: (a) tighten — a trigger arm refusing `NEW.accepted_date_index IS NOT NULL AND NEW.accepted_date_index IS DISTINCT FROM OLD.accepted_date_index` (in-place edit of the unmerged `0149`, the `CREATE OR REPLACE FUNCTION` re-applied on :5432 AND :5433; the RLS test flipped to "NULL allowed, any other value refused"); (b) keep RD14's choice and carry it to `deferred-work.md` with a trigger. [packages/domain/migrations/0149_death-certificate-register-check.sql:38,47-76] — ✅ RESOLVED (a) by BigDev, fixed: the trigger refuses any new NON-NULL `accepted_date_index`; `0149` edited in place, the function re-applied and the `__drizzle_migrations` hash updated on :5432 AND :5433 (both verified); the RLS spec now asserts the forge AND the restore refused (23000), NULL (twice) allowed; RD14 carries an ERRATUM
- [x] [Review][Patch] (MEDIUM) RD9 is untested: ⛔ no test fails if the death-fact derivation moves INSIDE `if (postDeath === 'evaluated')` — P4's and the `-279` A3 test's incidental coverage was removed by RD19's same-date rebuilds; the A3 test at `:220-226` re-reviews to ANOTHER date with ⛔ no re-determination (a date key exists) but asserts only the absence of `post_death_version:` keys ⇒ assert the kinds there (Testing: "`postDeath` ≠ `evaluated` ⇒ the three kinds still derived") [packages/domain/tests/integration/claim/approval-warnings.spec.ts:220-226] — fixed: `expect(w.kinds).toEqual(['inspection_death_date_differs'])` under `awaiting_determination`
- [x] [Review][Patch] A fifth copy of the register-check value set — the console contract's inline `z.enum([...])` ⛔ not `DeathCertificateRegisterCheck`, ⛔ no lockstep test — and the "four places / the admin's local `RegisterCheck` type" comments went stale with round 1's patch #1 ⇒ reuse the contract enum; correct the comments in the schema and contracts (the migration's comment left as applied) [packages/contracts/src/claims/verifier-console.ts:124; packages/contracts/src/claims/death-certificate.ts:32-33; packages/domain/src/schema/claim_death_certificate_reviews.ts:62-63] — fixed: `registerCheck: DeathCertificateRegisterCheck.nullable()`; comments now say THREE declarations + two derivations (the migration's comment corrected too, as `0149` was edited anyway — hash re-updated)
- [x] [Review][Patch] "an inherited `does_not_match` raises ⛔ GI17 key" cannot fail: the source's family date = the fixture's accepted date, the only assertion is `kinds: []`, and nothing shows the inherited row was READ — an empty `inspections` aggregate passes too ⇒ assert the source row's comparison is present (`inspectionComparisons.get(sourceGid)`). (The pure guard `!row.inherited` IS covered by the unit test, whose row compares the current upload.) [packages/domain/tests/integration/claim/approval-warnings-death-facts.spec.ts:393-411] — fixed: asserts `inspectionComparisons.get(sourceGid) === 'same'` before `kinds: []`
- [x] [Review][Patch] The API "⛔ no index on the wire" assertion is vacuous: it greps for the literal `fixture-death-date-index`, but the API fixture indexes through the real `deathDateBlindIndex` ⇒ assert against the claim's ACTUAL index values read from the DB [apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts:316] — fixed: every real `death_date_index` / `accepted_date_index` of the source + refile (≥ 2) is asserted absent from the packet
- [x] [Review][Patch] Round 1's patch #3 (correct on substance — `warnings_not_current` fires only on a stale nominee determination) leaves AC9b / RD10 unmet AS WRITTEN (RD10 lists `claims.verification-decision.handlers.ts:61` for the kind-neutral reword) with the deviation recorded only in a review bullet ⇒ an erratum line on RD10 [this file, RD10] — fixed: an ERRATUM line under RD10
- [x] [Review][Patch] Two unit cases prove nothing: the GI18 "it STAYS when a later `matches` re-review superseded it …" case calls the pure function twice with IDENTICAL input (K1 / L1 are the reader's EXISTS — covered live at `approval-warnings-death-facts.spec.ts:309-325`), and the second "overlap" row duplicates the L4 row (a null review cannot carry a null index) ⇒ rename the first to what it checks and point at the live leg; drop the duplicate [packages/domain/tests/claim/death-fact-warnings.test.ts:66,158-164] — fixed: the case now proves the key is the UPLOAD's with or without a current review, and points at the live K1/L1 leg; the duplicate overlap row removed
- [x] [Review][Patch] (LOW) GI18 is ⛔ never refused at a LATER approver (GI6 and GI17 each are; Testing: "each kind blocks an un-reasoned approval at every approver") — covered by construction (⛔ no per-kind branch), but cheap ⇒ a vote leg [packages/domain/tests/integration/claim/approval-warnings-death-facts.spec.ts:308-331] — fixed: a new leg — refused un-reasoned at the District Admin AND at the vote, then each passes with a reason
- [x] [Review][Defer] An erasure of the deceased while a claim is in flight removes an unanswered GI6 key: the scrub NULLs both indexes ⇒ `not_compared`; the key leaves the set and a waiting final vote proceeds with ⛔ no reason; an inspection completed after it reads `not_indexed`, whose doc says "dev data only" [packages/domain/src/claim/approval-warnings.ts:195,210-220; packages/domain/src/member/anonymize.ts] — deferred, reachability narrow (erasure needs `withdrawn` or a `terminated` overlay AND a claim in flight), see `deferred-work.md`
- [x] [Review][Defer] The API console spec's `insertCompletedInspection` still raw-inserts `'fixture-death-date-index'` while the accepted review now carries a real index ⇒ its read-count / AC13 claims carry an unintended `inspection_death_date_differs` (⛔ nothing approves there — ⛔ nothing red; RD19's mechanism (ii) list was incomplete) [apps/api/tests/integration/claims/verifier-console.spec.ts:238] — deferred, see `deferred-work.md`

**Dismissed (8):** the failed-read stitch showing "just now" on rows the section alone could rule out (v2.4 explicitly ⛔ not applied — fail-closed, cosmetic; the no-date row it newly renders is pre-6.26a dev data only); the inconsistent id lower-casing in `stitchDeathFactFlags` (round 1's defer); the unreachable `differs`-without-warning branch (defensive; follows from the same lower-casing item); the injected clock no longer stamping `completed_at` (K3, deliberate); the late arm's lock ordering (`adjudicateClaim` takes `lockClaim` at `verifier-decision-persist.ts:357` before the warnings read at `:430` — the feared interleaving cannot occur); the trigger restated from `0122` reverting later amendments (`0122` is the function's latest prior definition); a NULL `inspection_stage` (`NOT NULL` at `0055:50`); the API RTBF query's missing `ORDER BY` (that test writes exactly one review).

## Dev Notes

### Traps
1. **One field class** — the review index MUST go through `deathDateBlindIndex` (API) / `fixtureDeathDateIndex` (domain fixtures); a second
   literal or a different stand-in makes every claim "differ".
2. **The bulk reader drifts** — derive ONLY in the shared pure helper; the live parity test is the guard (6.23b's pattern).
3. **One late-arm fragment** (RD2) — the column and the WHERE read the SAME `lateArm`; the R9 admission ANDs it, ⛔ never a copy.
4. **Currency** — GI17 compares against the CURRENT upload; GI18 (`-288` K1) reads every accepted `does_not_match` review of the CURRENT
   upload. A test replaces the upload and sees each key go; a second test re-reviews the SAME upload `does_not_match` → `matches` and sees
   GI18's key STAY (the case a "current review only" reading would silently drop).
5. **Pre-6.26b accepted reviews have ⛔ no index** ⇒ ⛔ no date key on them (dev data only — ⛔ not in production); backfill ⛔ nothing
   ([[feedback_record_unattested_no_backfill]]). A re-review writes it.
6. **Fixture defaults raise nothing** — register `matches`, family date = accepted date (6.26a GI15), verdict `matches`; otherwise every
   approve-path spec gains a warning (the 6.23a Trap-5 lesson). ⚠ Except a spec that RE-REVIEWS with a different date after the fixture,
   or completes with a LITERAL index stand-in (`'idx'`, `'fixture-death-date-index'`) — red by design (RD19, Task 9.3).
7. **The timeline classifies VERSIONS only** — `NOMINEE_VERSION_WARNING_KINDS` (RD8); widening the shared enum must ⛔ not make the timeline
   emit or word the three new kinds.
8. **Currency for the printed date** (`-283` A3) — a test replaces the original after a `certificate_check` and sees the date key go.
9. **The review CHECK is narrow on purpose** (Task 1) — an UPDATE of any pre-6.26b accepted review must still pass it.
10. **The clock** (RD1, `-288` K3) — a completion committed before an approval must ⛔ not read as "completed after approval"; a REAL
    completion after approval must. ⚠⚠ Both legs run in SEPARATE COMMITTED transactions (Task 4.0): inside one BEGIN/ROLLBACK the
    completion's `clock_timestamp()` is always later than the approval's transaction-start `now()`, so a single-transaction ordering test
    passes or fails by construction, ⛔ never by the code. ⚠ And the "not a candidate" leg is read on the FAULT path (RD25) — on the normal
    path an un-keyed candidate is dropped and the leg proves nothing.
11. **`null` is ⛔ never `false` — and `false` is ⛔ never `null` where the section rules a key out** (RD18, invariant 5) — a failed read
    shows "could not be checked just now" on every completed row's DATE line (own or inherited) and on the VERDICT line only where the
    verdict is `does_not_match` on an own row; an un-completed row, an inherited row's verdict line, and a `matches` verdict line show ⛔ no
    such line. `'not_indexed'` (pre-6.26b) is its own words, ⛔ never "just now".
12. **Guard order** (RD15) — the index checks sit inside `invalid_date` / `date_on_reject`; the two register-check refusals run after the
    existing four; the API refusal table proves each existing code survives.
13. **Nullish, ⛔ never `!== null`** (RD15) — the two new writer inputs are optional; a reject that leaves them out must ⛔ never be refused.
    Callers cast `as never` hide from `tsc` — grep them.
14. **The no-comparison fence** (RD23) — plain `===` on ids, ⛔ never `.toLowerCase() ===`; the helpers live in `approval-warnings.ts`.
15. **ONE date comparison** (RD9, `-288` K2) — GI6's key and the console's date line both call `deathDateComparison`; a second comparison
    is the Trap-2 drift in a new place.
16. **GI6's key is stable on purpose** (`-288` K4) — a re-review to ANOTHER differing date keeps the key covered; ⛔ never re-key it by
    review to "fix" it (that is a GI6 amendment, ⛔ not a patch). GI18's key is per UPLOAD (`-289` L1) — re-stating a mismatch is the same key.
17. **A recorded register mismatch is ⛔ never withdrawn** (`-289` L2, RD29) — ⛔ no code path clears it short of a replaced upload; ⛔ never
    add one.

### Testing
- **Domain unit:** `deathDateComparison`'s table, in its ORDER (`differs` / `same` / ⛔ no row index ⇒ `not_compared` / a replaced
  original ⇒ `not_compared` / ⛔ no current accepted review ⇒ `not_compared` / ⛔ no accepted index ⇒ `not_indexed` / the overlap cases —
  ⛔ no row index AND ⛔ no accepted index ⇒ `not_compared`); `deriveDeathFactWarningKeys`' table (each kind: present / absent / ⛔ no
  accepted review / pre-6.26b review ⛔ no index / replaced upload / GI18 superseded by a same-upload `matches` re-review ⇒ STAYS (K1) / a
  second `does_not_match` ⇒ the SAME single key (L1) / GI18 on a replaced upload ⇒ goes / an inherited `family_statement` row ⇒ the GI6 key
  (L3) / an inherited `original_certificate` row ⇒ ⛔ no key / an inherited `does_not_match` ⇒ ⛔ no GI17 key / `could_not_check` /
  `postDeath` ≠ `evaluated` ⇒ the three kinds still derived); the pin (its message keeps the
  6-27 sentence — RD24) + lockstep tests; the no-comparison fence green at 36 (RD23); `rtbf-anonymize.test.ts` (the column in the SET).
- **Domain live-DB (RLS):** `rls/claim-death-certificate-policy-regression.spec.ts` — the owner-role trigger test (after `RESET ROLE`, `:376-396`)
  gains a `register_check` leg and a leg showing the trigger lets `accepted_date_index` go to NULL; the 42501 test (`:330`) gains a
  `register_check` leg; *"twt_app CAN scrub"* (`:353`) seeds `accepted_date_index: 'idx'` (the default `review()` has none — NULL→NULL would
  prove nothing) and asserts NULL after; the per-name CHECK test (`:208`) gains both new CHECKs by their exact names (RD14).
- **Domain live-DB:** `approval-warnings.spec.ts` + `approval-warnings-every-approver.spec.ts` (each kind blocks an un-reasoned approval at
  every approver; the late wait for GI6 and GI17; RD4's R9 finalize — the District Admin's wait first, then the approve votes' revision); the
  bulk-vs-single parity with each kind; the queue (`listClaimsUnderCorrection` — tested in `approval-warnings-every-approver.spec.ts`; ⛔ no
  separate correction-queue spec exists): the completed-after-approval listing, an R9-routed claim in `state_trustee_approved` (listed) and the
  same claim with its routing row superseded by a direct UPDATE (⛔ not listed — RD26), and a claim inspected before approval (⛔ not a
  candidate, on the FAULT path — RD25) — ⚠ every ORDERING leg in a NEW own-committing spec (Task 4.0: legs a–e, separate committed
  transactions), ⛔ never inside these BEGIN/ROLLBACK files; K4's pinned leg (re-review after approval to another differing date ⇒ ⛔ no
  late key); `-285`'s R9-first leg (an inspection completing mid-session ⇒ the earlier approve votes must revise, ⛔ no late wait);
  `ground-inspection.spec.ts` (the amended clock pin — `completed_at` ⛔ never the injected clock, STRICTLY `>` the transaction's `now()` after `pg_sleep(0.001)` — Task 4.0);
  `death-certificate.spec.ts` (AC7, guard order, a reject OMITTING both fields still succeeds, the K1 / L1 same-upload re-reviews);
  the inherited leg (a refile with ⛔ no own visit whose inherited family date differs ⇒ the key at the District Admin's approval; then an
  own full visit completes ⇒ the inherited key LEAVES the set — `-289` L3; ⚠ if that own visit records the SAME differing date, its own
  key is NEW and late ⇒ the District Admin answers again — correct under GI6 / K4's per-inspection key, ⛔ not a defect to "fix");
  `death-certificate-rtbf.spec.ts`.
- **API live-DB:** `death-certificate.spec.ts` (register-check codes; the refusal table; the history field; the audit code; the
  `claim.death_certificate_reviewed` event payload carries ⛔ no `register_check` — GI16); `verifier-console.spec.ts`
  / `-shape.spec.ts` / `verifier-console-ground-inspection.spec.ts` (`registerCheck`; `dateComparison` incl. an INHERITED differing row
  (with `dateDiffersWarning: true`), `'not_indexed'` on a pre-6.26b review, `'not_compared'` with ⛔ no accepted certificate, and `null` on
  every completed row on a failed read; the two flags incl. `null` on a failed read and `false` by construction on an un-completed row and on
  `originalMismatchWarning` of an inherited or `matches` row; MAX_READS still 20; `:1142` / `:1179` (`:1195`) and the `:519-520` shape pin
  UNCHANGED); one approval-route test per new kind showing the reason
  requirement (`ensureGroundInspection({ force: true, verdict: 'does_not_match' })` / `{ force: true, deathDate }` /
  `seedNomineeNameCheck(…, { registerCheck: 'does_not_match' })` — RD22); Task 4.0's ordering legs a/b/c over HTTP — each step its own
  request (its own transaction).
- **Jobs:** the three RD20 files.
- **Admin:** `death-certificate-review.test.tsx` (the choice, ⛔ nothing pre-selected, Submit disabled without it, the incomplete-accept words,
  the history words incl. *"register check not recorded"*, the two refusal words; its exact payload assertions `:190-199`, `:347-370`
  amended); the kind lines on the console and on one later surface; the per-assignment lines — warning (an inherited one labelled "given
  on an earlier claim") / "could not be compared" on `not_indexed` / "could not be checked just now" on `null` / nothing on `same` and
  `not_compared`; ⛔ no date in any kind, date-comparison or mismatch line (AC9b — ⛔ not the GI10 [a] date line); the timeline still words only its
  two kinds; `correction-queue.test.tsx:678` amended and `:668` re-targeted (RD10 — ⛔ never left vacuous).
- **Gate:** `pnpm ci:local` ([[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]],
  [[project_fk_truncate_cascade_deadlock]] before calling a flake).

### Previous-story intelligence (6.26a, 6.23b)
- 6.26a's default-ON fixture made nearly every parallel approve-path spec write the inspection tables; the TRUNCATE leg of the RLS spec needed
  a wider lock retry (300) — ⛔ not a flake to dismiss if it recurs; read the PG log.
- Drizzle's migrator applies every pending file in ONE transaction: only `ALTER TYPE … ADD VALUE` is hazardous (0146); `0149` adds ⛔ no enum.
- A forced `claims.current_state` does ⛔ not survive a writer (`projectClaimState` replays) — drive states through real events.
- 6.23b round 2: an "unknown" shown as "0" was a real defect; the 500-id bulk cap must slice, ⛔ never throw — keep `readClaimApprovalWarningsSlice`.
- [[feedback_story_validate_footguns]]: re-judge an exclusion rule at EVERY coverage reader (the queue, the gate, R9 finalize, the console).
- ⭐ The R9 admission and the late arm both require a live APPROVED verifier decision: on `-285`'s paths (R9 before the District Admin
  decided) ⛔ no row qualifies — correct, there is ⛔ no District Admin wait to tell anyone about.

### Libraries
⛔ No new dependency and ⛔ no version change: Drizzle (`or`, `and`, `inArray`, `sql`), zod (`.optional()`, `z.enum`), React + TanStack Query as
already used in these files. ⛔ No web research needed.

### References
- `.decision-log.md`: `2026-10-07-290` M1–M3 (erratum to `-289` L3 — the inherited-source queue disjunct) · `2026-10-07-289` L1–L5
  (erratum to `-288`; amends GI6) · `2026-10-07-288` K1–K4 (amends GI18, GI10 [b]) · `2026-10-06-284` E1 (amends GI7) · `2026-10-06-283` A1, A2, A3, A6, A8 · `2026-10-06-285` · `-280` · `2026-10-06-281` ·
  `2026-09-28-262` FQ8 B/C · `-264` FQ12 · `-277` Q2 C, Q3 B · `-278` NW1, NW6, NW14 · `-279` A2, A4, A6 · `2026-10-06-282` (GI1–GI18) ·
  `2026-10-07-286` / `-287` (GI4 — ⛔ no effect here).
- `_bmad-output/implementation-artifacts/6-26-ground-inspection-before-approval-and-death-facts.md` (Story 6.26a — GI1–GI18, the record;
  its Completion Notes and review findings).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md`.
- Stories `6-23-post-death-nominee-change-warnings.md` (NW1–NW18), `6-23b-every-approver-gives-a-warning-reason.md` (EA2, EA5, EA7, EA10),
  `6-21-death-certificate-clear-date-rule.md` (the review writer).
- `deferred-work.md`: *"The fixture's completion clock can be in the FUTURE"*; *"⚠ EA10's late-warning arm keys on a NEW determination"*;
  *"A late key covered ONLY by a late reason whose recorder then approves is ⛔ not listed"*; *"6.7's own Tier-1 inspection columns are ⛔
  not in the member erasure"*; *"The R9 routing predicate's BULK inline twins …"*; *"A FAILED refetch after a 409 hides the whole approval surface"*.
- Gates: `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` (RD23); `microcopy.yaml` (Task 8).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.26b`, 2026-10-07.

### Debug Log References

- Task 0 at the build: `git fetch origin`; `git diff --name-only b665a19a..HEAD -- packages apps scripts` EMPTY (⛔ no cited file moved);
  ⛔ no decision after `-290` in `.decision-log.md`.
- Migration `0149` applied to BOTH :5432 and :5433 (`pnpm --filter @twt/domain db:migrate`); the two columns, the two CHECKs (by exact
  name) and the restated trigger body (`register_check` in its deny-list) verified on each.
- ⚠ **FOUND — a red the story's RD19 called "⛔ not red":** `packages/domain/tests/integration/claim/r9-voting.spec.ts` P4
  (*"a determination made against an EARLIER review"*). Its spoil re-reviews to ANOTHER date ⇒ `inspection_death_date_differs`, and the
  R9 VOTE's own reason rule (`castR9Vote` → `checkLaterApprovalWarningReason`) refuses before finalize ever reaches the certificate
  conjunct. RD19's *"the certificate conjunct answers first"* holds for `finalizeR9Outcome`'s gate, ⛔ for the vote. Rebuilt by RD19's
  own mechanism (iii) — a SAME-date re-review (only the register check moves): stale with ⛔ no key, the test's subject kept.
- ⚠ **FOUND — RD10's "⛔ no other test asserts an RD10 string" is not quite true:** `apps/admin/tests/correction-queue.test.tsx:653` and
  `:666` match `/appeared after your approval/`. The queue's new kind-neutral words keep that phrase (*"A warning appeared after your
  approval"*), so both stand UNCHANGED; `:678` is amended (`/^2 warnings appeared after your approval/`) and `:668` re-targeted
  (`/\b0 warnings/`), as RD10 ordered.
- `-288` K4's pinned leg needed ONE inspection on its claim: with the default fixture visit present, the re-review to another date ALSO
  makes the fixture visit's date differ — a NEW key, correctly late — which is ⛔ K4's case.
- RD19 (iii) — `approval-warnings.spec.ts:414-418` rebuilt through the fixture after RD22 (`seedAcceptedDeathCertificate(…, { date: <same>,
  registerCheck: 'could_not_check' })`), ⛔ a direct writer call; RD19's checked-and-EMPTY third mechanism confirmed EMPTY (nothing red).
- The new own-committing spec (`correction-queue-late-inspection.spec.ts`) cleans up BY PARIWAR — every `pariwar_id` table of this suite's
  fresh random Pariwars, in replica mode (append-only triggers and RI cascades off), plus their idempotency keys — rather than by claim ids
  (the fixtures write determinations, name checks, contacts, reviews, uploads, members and nominee versions the `claims` cascade does ⛔
  reach). A fresh tenant per test makes that exact.
- Red-checks run (each reverted, watched fail, restored): the clock pin vs `now()` AND vs the injected clock; legs (a) comparator reversed
  + K3 → injected clock; (b) disjunct (2) deleted; (c) `liveRoutedToR9Exists()` deleted; (d) K3 → `now()`; (e) disjunct (3) deleted; the
  HTTP legs (a) / (b) / (c) the same; GI18's superseded-review leg (`AND wrm.superseded_at IS NULL` added ⇒ red); `-283` A3's currency
  (removed ⇒ red, live + unit); the RD15 nullish guard (`!== null` ⇒ the omitted-fields reject red); the erasure index scrub (removed ⇒
  unit + live red).

### Completion Notes List

- ✅ **Task 1 — migration 0149** (`register_check` + `accepted_date_index`, the value CHECK, the null-safe coherence CHECK — VALIDATED, the
  column UPDATE grant for the scrub, the reject-mutation function restated with `register_check` immutable); Drizzle schema with the
  `DEATH_CERTIFICATE_REGISTER_CHECKS` const + LOCKSTEP comments (four places); journal idx 149 `when: 1793590800000`.
- ✅ **Task 2 — the writer** takes OPTIONAL `registerCheck` / `acceptedDateIndex`, every new guard NULLISH; the index joins `invalid_date` /
  `date_on_reject`; `register_check_required` / `register_check_not_allowed` after the four shape guards; the union widened; ⛔ no event
  field. The snapshot carries `registerCheck` (SELECT + type + mapping).
- ✅ **Task 3 — the kinds**: `NOMINEE_VERSION_WARNING_KINDS` + the three kinds; `classifyNomineeVersion` narrowed; ONE fragment
  (`deathFactColumnsSql`) selects `current_upload_id` (the ONE current-upload rule), `register_mismatch_present` (`-289` L1 — live OR
  superseded) and the completed `inspections` (own + inherited through the ONE inheritance fragment, only while ⛔ own full visit) for
  BOTH readers; the pure `deathDateComparison` (L4's order) and `deriveDeathFactWarningKeys` live in `approval-warnings.ts` (the fence
  stays at 36), called OUTSIDE the post-death block; the result also carries `inspectionComparisons`. The pin keeps the 6-27 sentence.
- ✅ **Task 4 — the clock and the queue**: `completedAt: clock_timestamp()` (K3; the injected `now` validates only) + the strict pin; ONE
  hoisted `lateArm` with THREE sources (determination, own completion, `-290` M2's inherited-visit reliance) used by the column and the
  WHERE, and the `-284` E1 R9 admission (`or(and(CORRECTABLE…, arms), state_trustee_approved ∧ liveRoutedToR9Exists() ∧ lateArm)`); three
  doc-blocks amended; the reversal note appended to 6.26a's finding; `deferred-work.md` appends (DISCHARGED clock item with its corrected
  prose; the EA10 item; the actor-exclusion item).
- ✅ **Task 5 — erasure**: `acceptedDateIndex: null` in the existing review scrub (⛔ new statement; pins 22 / 19 / 21 unchanged).
- ✅ **Task 6 — API**: the handler computes the index through `deathDateBlindIndex` and passes `register_check`; the success audit carries
  the code (⛔ the event); `getHistory` serves it; the console's `review.registerCheck` from the snapshot; the INTERNAL
  `readApprovalWarningsSection` (the exported `assembleApprovalWarnings` keeps its signature) and the exported pure `stitchDeathFactFlags`
  (RD18's rules — `false` only where the section rules a key out, `null` on a failed read or an unseen completed row); MAX_READS stays 20;
  RD10's five API strings kind-neutral.
- ✅ **Task 7 — contracts**: `register_check` optional on the request / nullable on the history; `registerCheck` on the console review;
  `dateComparison` / `dateDiffersWarning` / `originalMismatchWarning` on `GroundInspectionItem`; the kind enum + `NomineeVersionWarningKind`;
  the timeline narrowed; the `:217` doc-block in the present tense. Lockstep tests for the version kinds and the register-check set.
- ✅ **Task 8 — admin**: the register-check radio (⛔ pre-selected; Submit disabled until chosen; the reset; the submit builder; the route
  passes it); the status line and the history line in words, *"register check not recorded"* for a pre-6.26b accepted review; the three
  kind lines; EXACTLY the RD10 strings reworded (the `-239` list, `kindLine.recent_nominee_change` and the timeline words untouched); the
  two refusal words; the timeline map narrowed; `SignalsPanel`'s comparison and mismatch lines. `EscalationPanel.tsx` ⛔ touched.
- ✅ **Task 9 — fixtures**: both certificate fixtures write a register check (default `matches`) + the index, take `registerCheck?` (threaded
  through both `seedNomineeNameCheck` copies; the reuse path compares it when given); `ensureGroundInspection` takes `deathDate?`; a domain
  `fixtureCurrentAcceptedDate` helper (shared by `seedGroundInspection` and the amended literal-index spec). Every RD19 / RD20 spec amended
  by its mechanism — ⛔ none weakened; jobs' three accept callers.
- ✅ **Task 10 — tests** (all red-checked, see the Debug Log): domain unit (`death-fact-warnings.test.ts` — the two tables), the pin + the
  lockstep, the erasure SET; domain live (`approval-warnings-death-facts.spec.ts` — each kind, currency, parity, the reason at every
  approver, the late waits for GI6 / GI17 / GI18, K1 / L1, K4, L3, RD4, `-285`; `correction-queue-late-inspection.spec.ts` — legs a–e in
  committed transactions; AC7's writer legs; the RLS legs; the RTBF spec); API (`death-certificate.spec.ts` codes / audit / event / history /
  erasure, the console's flags incl. the failed read, one approval-route test per kind, legs a–c over HTTP; `stitchDeathFactFlags` unit);
  admin (the review form, the words, the kind lines on the strip and a later surface, the per-assignment lines, the no-date assertion).
- ✅ **AC13b** — `pnpm ci:local` with `DATABASE_URL` at :5433: **34 / 34 jobs green** (incl. `integration-tests` — domain, API, jobs —
  lint, typecheck, build, microcopy, the invariant gates). Also run directly: domain 329 files / 4,600+ tests, API 150 files, jobs 48 files /
  568 tests, admin 59 files / 951 tests, contracts 74 files, mobile 44 files / 668 tests.
- ✅ **AC12b** — `git diff --name-only b665a19a -- apps/mobile apps/public packages/i18n` EMPTY; ⛔ no permission key / event / payload field /
  rule code beyond GI8's two refusals; ⛔ member-facing string.

### File List

**New**
- `packages/domain/migrations/0149_death-certificate-register-check.sql`
- `packages/domain/tests/claim/death-fact-warnings.test.ts`
- `packages/domain/tests/integration/claim/approval-warnings-death-facts.spec.ts`
- `packages/domain/tests/integration/claim/correction-queue-late-inspection.spec.ts`
- `apps/api/tests/unit/verifier-console-death-fact-stitch.test.ts`

**Modified — domain**
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/claim_death_certificate_reviews.ts`
- `packages/domain/src/claim/approval-warnings.ts`
- `packages/domain/src/claim/correction-queue-read.ts`
- `packages/domain/src/claim/death-certificate-approval.ts`
- `packages/domain/src/claim/death-certificate-review-persist.ts`
- `packages/domain/src/claim/errors.ts`
- `packages/domain/src/claim/ground-inspection-persist.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/tests/claim/approval-warnings.test.ts`
- `packages/domain/tests/claim/death-certificate-family-status.test.ts`
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/integration/_helpers.ts`
- `packages/domain/tests/integration/claim/approval-warnings.spec.ts`
- `packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts`
- `packages/domain/tests/integration/claim/death-certificate.spec.ts`
- `packages/domain/tests/integration/claim/death-certificate-concurrency.spec.ts`
- `packages/domain/tests/integration/claim/death-certificate-rtbf.spec.ts`
- `packages/domain/tests/integration/claim/ground-inspection.spec.ts`
- `packages/domain/tests/integration/claim/ground-inspection-approval.spec.ts`
- `packages/domain/tests/integration/claim/nominee-name-check.spec.ts`
- `packages/domain/tests/integration/claim/r9-voting.spec.ts`
- `packages/domain/tests/integration/rls/claim-death-certificate-policy-regression.spec.ts`

**Modified — contracts**
- `packages/contracts/src/claims/death-certificate.ts`
- `packages/contracts/src/claims/nominee-declaration.ts`
- `packages/contracts/src/claims/verification-decision.ts`
- `packages/contracts/src/claims/verifier-console.ts`
- `packages/contracts/tests/claims-verifier-console.test.ts`
- `packages/contracts/tests/claims-verifier-decision.test.ts`

**Modified — api**
- `apps/api/src/modules/claims/claims.death-certificate.handlers.ts`
- `apps/api/src/modules/claims/claims.verification-decision.handlers.ts`
- `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`
- `apps/api/src/modules/claims/later-approval-warnings.ts`
- `apps/api/tests/integration/_nominee-name-check-fixture.ts`
- `apps/api/tests/integration/claims/approval-warnings.spec.ts`
- `apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts`
- `apps/api/tests/integration/claims/death-certificate.spec.ts`
- `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`
- `apps/api/tests/integration/claims/verifier-console-shape.spec.ts`

**Modified — jobs**
- `apps/jobs/tests/_claim-correction-seed.ts`
- `apps/jobs/tests/claim-certificate-reminders-live.test.ts`
- `apps/jobs/tests/claim-ocr-parity-death-certificate.test.ts`

**Modified — admin**
- `apps/admin/src/modules/approval-warning-reasons/i18n-en.ts`
- `apps/admin/src/modules/claim-verification/DeathCertificateReviewControl.tsx`
- `apps/admin/src/modules/claim-verification/NomineeDeclarationPanel.tsx`
- `apps/admin/src/modules/claim-verification/SignalsPanel.tsx`
- `apps/admin/src/modules/claim-verification/i18n-en.ts`
- `apps/admin/src/routes/VerifierConsoleRoute.tsx`
- `apps/admin/tests/approval-warnings.test.tsx`
- `apps/admin/tests/correction-queue.test.tsx`
- `apps/admin/tests/death-certificate-review.test.tsx`
- `apps/admin/tests/later-approval-warnings.test.tsx`
- `apps/admin/tests/verifier-console-route-name-check.test.tsx`
- `apps/admin/tests/verifier-console.test.tsx`

**Records**
- `_bmad-output/implementation-artifacts/6-26b-death-facts-warnings-and-register-check.md` (this file)
- `_bmad-output/implementation-artifacts/6-26-ground-inspection-before-approval-and-death-facts.md` (the RD1 reversal note, appended)
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-06 | Split out of Story 6.26 v1.1 (BigDev; `2026-10-06-281` Consequence 2) after the Panel ruled Q1 B · Q2 A. Owns GI6, GI7, GI8, GI17, GI18 and the [b] halves of GI10/11/13/15/16. `backlog` until 6.26a is `done`; ⛔ not re-pinned yet. |
| v1.1 | 2026-10-06 | GI1–GI18 committed by `2026-10-06-282` (cited here). ⛔ No GI changed; still `backlog`. |
| v1.2 | 2026-10-06 | The first fresh-context validate (combined with 6.26a's v2.3; `2026-10-06-283`, `e8200366`). GI6 amended by **A3** (a printed date from a replaced original ⛔ no longer warns — BigDev: *"Add currency filter"*; P3 now names the printed date; a `-264` reading row). Task 1's CHECK narrowed: "an accepted review carries both" is the writer's guard, ⛔ not a CHECK (a `NOT VALID` CHECK re-checks every pre-6.26b accepted review on the anonymizer's note scrub and on supersession — every erasure would fail). Fact 4 names the SECOND typed kind map (`NomineeDeclarationPanel.tsx:119`, narrowed to version kinds) and the mislabelling heading. Task 4 appends to the EA10 deferred item; Task 8 gains the review-history line; the queue's tests live in `approval-warnings-every-approver.spec.ts`. ⛔ Not re-pinned; still `backlog`. |
| v1.3 | 2026-10-06 | Round 2 (with 6.26a v2.4; `2026-10-06-284`, `72afe24d`). **E1** (BigDev: *"Scan it while R9-routed"*): the queue's late-warning arm also scans `state_trustee_approved` while R9-routed — Fact 3, GI7, AC8, Task 4 and the queue test carry it. Task 1 gains the column GRANT (`accepted_date_index` — the erasure would otherwise fail 42501) and adds `register_check` to the reject-mutation trigger's immutable list. P3/P4 match 6.26a word for word and carry A3's currency. ⛔ Not re-pinned; still `backlog`. |
| v1.4 | 2026-10-06 | Round 3 (with 6.26a v2.5): ⛔ no BLOCKER / HIGH. Task 4 rewritten — the state admission lives ONCE in the shared WHERE and uses 6.26a's SQL fragment `liveRoutedToR9Exists` (⛔ never a per-claim call); why `qualifyingRows` needs ⛔ no change. Task 9 / Trap 6 list the red-by-design re-review specs (A3 leaves `family_statement` unfiltered). Task 5 and Testing: `register_check`'s immutability is proved in `rls/claim-death-certificate-policy-regression.spec.ts` (four legs), ⛔ not through `twt_app`. P2 now identical to 6.26a's. ⛔ Not re-pinned; still `backlog`. |
| v2.0 | 2026-10-07 | **Created for dev** (`bmad-create-story 6.26b`) — re-pinned `3311fc97` → `b665a19a` (6.26a merged as PR #259) and every code claim re-derived by three fresh-context read-only verifiers (warnings + queue; review writer + migration + erasure + fixtures; API + contracts + admin), the load-bearing ones re-read by the author. ⛔ No GI or ruling moved. **RD1–RD21** (found facts) change the build: ⚠ RD1 the fixture clock (6.26a's completion stores the injected clock, always in the future; GI7 compares the VERIFIER approval's `decided_at`) — author choice: store the DB clock, `now` validates only (reverses 6.26a review patch #2; BigDev confirms at Task 0); RD2 the queue's WHERE is Drizzle and its late arm an INNER JOIN — one hoisted fragment, an `or(and(…), R9 admission)`; RD3 `liveRoutedToR9Exists()` takes SQL; RD4 a late key during R9 also makes the approve votes short (`-279` A2); RD6–RD9 the select needs `death_date_source`, reuse `currentDeathCertificateUploadIdSql`, `NOMINEE_VERSION_WARNING_KINDS` reaches the classifier + API, an exported pure `deriveDeathFactWarningKeys`; RD10 ~15 "nominee-change" staff strings reworded; RD11 the review 409s need ⛔ no mapping but the admin words are unforced; RD12 `deathDateBlindIndex` reused; RD13 strict contracts; RD14 text + CHECK, a VALIDATED coherence CHECK, the trigger restated; RD15 the index guard and guard order; RD16 erasure adds ⛔ no statement; RD17 the audit code; RD18 the console's per-assignment flags stitched from `w.keys` (`boolean | null`, ⛔ no new read); RD19–RD20 the red-by-design list (four warning specs) and the direct accept callers incl. `apps/jobs`; RD21 the helpers. `backlog` → **`ready-for-dev`**. |
| v2.1 | 2026-10-07 | BigDev: *"Confirm RD1 = DB clock and amend Task 4.0 / Trap 10 / Testing to require transaction-separated ordering tests"* and *"Remove the unsupported inspection: 'skip' fixture option from Task 9.3"*. **RD1 ✅ confirmed** (AC0, Task 0, the RD1 text). With the DB clock every `now()` in one BEGIN/ROLLBACK is the same instant ⇒ an approval and a completion TIE and a single-transaction ordering test proves nothing ⇒ Task 4.0 requires every approval↔completion ORDER to be asserted in SEPARATE COMMITTED transactions — domain: a new own-committing spec (the `ground-inspection-concurrency.spec.ts` pattern); API: one request per step — legs (a) inspection-then-approval ⛔ not a candidate, (b) approval-then-completion listed and waiting, (c) the R9-routed leg, with red-checks that expose a hollow single-transaction leg; the clock pin asserts the transaction's own `now()`. Trap 10, Testing (domain + API) and AC8 carry it. **Task 9.3's `inspection: 'skip'` route removed** — ⚠ the option itself EXISTS in both fixtures (domain `_helpers.ts:1269`, API `_nominee-name-check-fixture.ts:248`; 18 specs use it); it is removed because it cannot do what 9.3 asked: those specs approve before they re-review, the gate needs a complete inspection first, and the family's date is fixed at completion ⇒ skipping only moves the key. ⛔ No GI or ruling moved; still `ready-for-dev`. |
| v2.2 | 2026-10-07 | The fresh-context validate of v2.1 (`bmad-create-story validate 6.26b`; four read-only verifiers — warnings + queue + clock; review writer + migration + erasure; API + contracts + admin; governance). ⛔ No code moved since `b665a19a`; ⛔ no decision after `-287` before this pass. 2 HIGH, 16 MEDIUM, ~39 LOW — all applied. **`2026-10-07-288` written and committed ALONE first (`0152ead9`)**, BigDev answering each item in session: **K1** GI18 keyed on the current UPLOAD (*"Key on current upload"* — a same-certificate re-review ⛔ no longer erases a `does_not_match`); **K2** the console shows ANY date difference, inherited included, as `-262` FQ8 C says (*"Show it, as not a warning"*); **K3** `completed_at = clock_timestamp()` (*"clock_timestamp()"* — the `now()` commit-order race left a late key unlisted for good); **K4** GI6's key kept, recorded (*"Keep, record it"*). HIGH: (1) leg (a) / the RD1 "not a candidate" assertion was invisible on the queue's normal path (`qualifyingRows` drops an un-keyed candidate) ⇒ asserted on the FAULT path (RD25); (2) RD19 missed `nominee-name-check.spec.ts:769-818`, the literal-index specs (`ground-inspection-approval.spec.ts`'s `inspectNow`, API `verifier-console-shape.spec.ts`'s `seedInspection`) and K3's single-transaction side effect (`approval-warnings-every-approver.spec.ts:1000-1046`), and its "name the key and count it" would have DELETED `-279` A3's coverage at `approval-warnings.spec.ts:414-418` ⇒ rebuilt on a same-date re-review. MEDIUM (found): optional + nullish writer inputs (RD15); the domain `reject()` built from `accept()` (RD20); GI18's fixture path (RD22); the no-comparison fence (RD23); the pin message keeps row 6-27's tripwire (RD24); the R9 supersession leg was hollow (RD26); E1 widens the actor-exclusion deferred item (RD27); the erasure item's trigger fires (RD28); RD10 is an exact list, ⛔ never a blanket reword, and two admin tests move; the console's keys reach the stitch through an internal section reader, and flags are `false` by construction where ⛔ no key can exist (RD18). LOW: cites (`0122:138`/`:140`, not `:143-145`; the history item `:62-76`; the default-fixture call `:1336`; `DeathCertificateReviewStatus` DEFINED in `DeathCertificateReviewControl.tsx:39-56`); the journal `when`; constraint names ≤ 63; the trigger precedent stated; the RLS scrub leg seeded; RD29–RD31; AC tags on every Task (AC12b now carried by Task 11); `-281` Q1 B's wait clause, P4's wait clause, FQ8 B's *"certificate number"*; `-285`'s R9-first interaction; RD1 restores `-283` A6; the header's "⛔ none is a decision" reworded; `-277`'s open family-notice item. ⚠ **Correction to v2.1's row (kept as written):** *"18 specs use it"* — `inspection: 'skip'` appears in **4** spec files at **16** call sites (18 lines, two of them comments); the two option sites it named are right. Still `ready-for-dev`. |
| v2.3 | 2026-10-07 | Round 2 of the validate — a fresh-context re-validate of `-288` and of the v2.2 rewrite, in parallel. ⛔ No blocker; 3 HIGH (all in v2.2's OWN edits), ~10 MEDIUM, ~20 LOW — all applied. **`2026-10-07-289` written and committed ALONE first (`51c8eb4e`)**, an erratum to `-288`, BigDev answering each item: **L1** GI18 keyed by UPLOAD (*"Key by upload"* — keyed by review, re-entering a true `does_not_match` to fix a typed date made a new late key); **L2** a recorded mismatch is answered, ⛔ never withdrawn (*"Reasons are the path"*); **L3** an inherited visit's differing family date IS a GI6 key (*"Make it a warning"* — K2 had made GI6's narrowing of the ratified `-264` FQ12 visible); **L4** ⛔ no accepted certificate ⇒ nothing compared (*"Nothing compared"*); L5 six found text corrections to `-288`. HIGH: (1) ⛔ no test distinguished K3's `clock_timestamp()` from `now()` ⇒ the pin is STRICT (`completed_at > now()` after `pg_sleep`) and a two-connection leg (d) proves the race; (2) **v2.2's RD19 "third mechanism" was FALSE** — `returned.cid` has ⛔ no verifier-decision row (`driveClaimTo` only projects events) ⇒ never a candidate ⇒ ⛔ nothing red; the `backdateCompletion` order is struck (the paragraph now records it as checked and EMPTY); (3) the console's failed-read rules contradicted each other (RD18 vs invariant 5, Trap 11, AC9b) ⇒ ONE rule set: `false` only where the assignment section alone rules a key out, `null` otherwise on a failed read; `'not_indexed'` split from `null` so "just now" means only a failed read. MEDIUM: AC9b's no-date test scoped to the NEW lines (the GI10 [a] date line shows the date by design); `deathDateComparison`'s ORDER; the inherited row set (every stage, only while ⛔ no own full visit — the console's `ownVisited`, ⛔ not a stage filter); the fault-path leg's non-vacuity control; RD29 rewritten for L2; RD19 (iii) via the fixture once RD22 lands. LOW: cites (`_helpers.ts:958`/`:953`, API `:103`, `ground-inspection-persist.ts:924-925`, `verifier-console.spec.ts:1195`, `approval-warnings.spec.ts:471-484`, API `withFault` `:62-69`, `ground-inspection.spec.ts:631-642`); RD20's first refusal is `date_on_reject`; RD25 "⛔ no key, or covered keys"; the two doc-block quotes; RD10's count is 51; the event-payload test; Trap 6 names the literal-index mechanism; 6.26a's K2 line moved out of `-282`'s GI10 sentence. Still `ready-for-dev`. |
| v2.4 | 2026-10-07 | Round 3 of the validate — a fresh-context re-validate of `-289` and the v2.3 rewrite: ⛔ no blocker, **1 HIGH**, 3 MEDIUM, ~8 LOW — all applied. **HIGH:** `-289` L3 opened a late-key path the queue never lists — a refile relying on an inherited visit gains a late key when the SOURCE is reversed on appeal and re-inspected (or the source changes), with ⛔ no row of the refile completing after its approval ⇒ it waits and the District Admin is ⛔ never told. **`2026-10-07-290` written and committed ALONE first (`94a0fad2`)**, BigDev: *"Add the queue condition"* — RD2 (b) gains a third disjunct (⛔ no own completed full visit AND `inheritedGroundInspectionSourceSql(…) IS NOT NULL` — the one fragment), Task 4.1 builds it, Task 4.0 gains leg (e) with its red-check. MEDIUM: AC0 / Task 0 / References name `-289` and `-290` (Task 0's "⛔ no decision after" check moves to `-290`); Testing's clock pin is STRICT `>` (the `≥` that round 2's HIGH (1) removed had survived there); `'not_indexed'` words reconciled (*"could not be compared with the certificate"*; "just now" ONLY for a failed read — L4's fixed point). LOW: a console row absent from the warnings map ⇒ `null` (⛔ "nothing" — the reads are separate statements); leg (d)'s second assignment carries its original-certificate photo; the own-visit-same-date re-answer recorded as correct; the register-mismatch kind line names THIS certificate. ⛔ Not applied: extending the failed-read rule-out list to rows the section alone can rule out (fail-closed as written; cosmetic). Rounds: 1 (4 verifiers) → 2 (3 HIGH, all the pass's own) → 3 (1 HIGH, in `-289`) → stop pending round 4. Still `ready-for-dev`. |
| v2.5 | 2026-10-07 | Round 4 of the validate — a fresh-context re-validate of `-290` and the v2.4 changes: **⛔ no BLOCKER, ⛔ no HIGH ⇒ the rounds stop** ([[feedback_story_validate_footguns]] #33(b)). 2 MEDIUM, 4 LOW — all applied: Task 4.0 leg (e) rebuilt on REAL state transitions (the T17 spec's raw `refuse()` + `forceState` cannot reach `reversed` — the appeal writers replay the stream and need a `claim_appeals` anchor); AC8 carries `-290` M2's listing; Task 4.1 amends THREE doc-blocks (incl. `lateWarningAwaitingReason`, `:81-86`) for three sources; the decisions block and GI7 name `-290`; "just now" also covers a row the warnings read did not see (RD18); the legs' layers stated ((a)–(c) both, (d)/(e) domain). `-290` needs ⛔ no erratum. Still `ready-for-dev`. |
| v3.0 | 2026-10-07 | **Built** (`bmad-dev-story 6.26b`). Migration `0149` (register check + accepted-date index, both CHECKs, the scrub grant, the trigger restated) on :5432 and :5433; the writer's two GI8 refusals (nullish, after the four shape guards); the three death-fact kinds through ONE fragment for both readers and ONE pure comparison / derivation (`deathDateComparison`, `deriveDeathFactWarningKeys`); `completed_at = clock_timestamp()` (RD1 / K3 — 6.26a's review patch #2 reversed, noted there); the queue's hoisted late arm with three sources + the `-284` E1 R9 admission; erasure NULLs the index; API (index via `deathDateBlindIndex`, audit code, history, the console's stitched per-assignment flags); contracts; admin (the register-check radio, words, kind lines, RD10 rewords, the console lines). Two FOUND facts recorded in the Debug Log: `r9-voting.spec.ts` P4 was red (the vote's reason rule answers before finalize's certificate conjunct) — rebuilt on a same-date re-review; two more admin assertions matched the queue's late-warning words — kept compatible. ⛔ No GI or ruling moved. `in-progress` → `review`. |
| v3.1 | 2026-10-07 | Code review ROUND 2 (`bmad-code-review 6.26b`; a fresh full re-review of `b665a19a..HEAD`, three layers in parallel, every load-bearing claim re-checked at HEAD): 1 decision-needed → patch (BigDev: *"tighten"* — `0149`'s trigger refuses any new non-NULL `accepted_date_index`; RD14 ERRATUM), 7 patches applied (RD9 asserted; the console's register-check copy reuses the contract; three tests that could not fail; GI18 at a later approver; RD10 ERRATUM), 2 deferred, 8 dismissed. `ci:local` 34/34. Stays `done`. |
