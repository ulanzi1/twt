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
entry) is the record. `-283` A3 amends GI6; `-284` E1 amends GI7 (6.26a's GI block carries each as an `⚠ AMENDED` line — the line is the build).
`RD1`…`RD21` (v2.0) are FOUND facts from re-deriving against 6.26a's shipped build — ⛔ none is a decision; each says what it changes in the
build. ⚠ ONE of them (RD1) carries an author choice the dev must ⛔ not make silently — it is named as such, with its alternative.
-->

# Story 6.26b: The Death Facts Become Warnings — a Differing Date of Death, an Original That Does Not Match, a Register That Does Not Match — and the District Admin Records the Government-Register Check `[SURFACE]`

Status: ready-for-dev

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
| `-262` FQ8 B | the District Admin checks the certificate on the government's online death register (CRS) and records that they did | ⭐ Trustee-ratified |
| `-262` FQ8 C | the inspector records the family's date and time of death; *"the system shows the District Admin any difference from the certificate"* | ⭐ Trustee-ratified |
| `-264` FQ12 | approving while any warning shows — incl. *"a date of death that differs from the certificate (at the inspection …)"* — needs a reason and a note | ⭐ Trustee-ratified |
| `-277` Q2 C / Q3 B | every approver gives a reason and a note; a late warning waits for the District Admin | ⭐ Trustee-ratified |
| `2026-10-06-281` Q1 B | a "does not match" — the original vs the copy, or the register — is a **warning** under the one rule; ⛔ never a refusal | ⭐ Trustee-ratified |
| `2026-10-06-285` A | FQ9 holds every approval, incl. where the District Admin never approved | ⭐ Trustee-ratified — ⛔ no effect here (⛔ no District Admin approval ⇒ ⛔ no late key; the reason rule applies at whichever approval comes) |
| `-262` reading | the comparison is by **date**; the time is shown, compared with nothing; the register record is *matches / does not match / could not be checked online* | ⚠ OUR reading |
| `-281` reading | a mismatch about a certificate the claim no longer relies on ⛔ no longer warns (it stays shown); `could_not_check` is ⛔ never a warning | ⚠ OUR reading |
| `-264` reading | FQ13's check records the date of death on the fresh original against the District Admin's accepted date ⇒ a `certificate_check`'s printed date can raise the date kind | ⚠ OUR reading |
| `2026-10-06-283` A3 | that printed date warns only while its original is the CURRENT upload (GI17's currency) | ⚠ Author-commit (BigDev) — amends GI6 |
| `2026-10-06-284` E1 | the queue's late-warning arm also scans `state_trustee_approved` while R9-routed | ⚠ Author-commit (BigDev) — amends GI7 |

**⛔ Not covered by any ruling (stays open):** what an approver must weigh under a warning; which states' registers can be searched;
whether an unsearchable register is ever treated differently.

## ⭐ THE INVARIANTS
1. **The system refuses nothing** — every kind is a condition on the FORM of an approval (a reason + a note) or a WAIT; ⛔ never a denial.
2. **ONE rule, ONE derivation** — three kinds, three keys, three producers; the assertion is ⛔ never edited; both readers share the pure
   derivation.
3. **⛔ No decrypt in the warning module** — indexes and plaintext codes only.
4. **⛔ No staff surface learns a date it did not show before** — the warning carries a KIND (and, on the console, a per-assignment boolean),
   ⛔ never a date (the console's GI10 [a] display of the family's date is 6.26a's, behind its own decrypt).
5. **An unknown is ⛔ never shown as "no warning"** (6.18's fail-closed rule): a warnings read that fails makes the console's per-assignment
   flags `null` ("could not be checked"), ⛔ never `false`.

## 📜 Policy meaning (AI-10-1)
⭐ This story ADDS conjuncts to an existing benefit-gating predicate (the warning rule). In the member's terms:
- **P2 (GI8):** *"A District Admin cannot accept a death certificate without recording whether they checked it on the government's death
  register — and 'could not be checked online' is always an allowed answer, so this never stops a family's claim on its own."* — `-262` FQ8 B: consistent.
- **P3 (GI6/GI7 + `-283` A3):** *"If the date of death the family gave the inspector — or the date printed on the original certificate the
  inspector held, while that original is still the certificate the claim relies on — differs from the certificate the Trust accepted, anyone
  approving the claim must pick a reason and write a note; and if it appears after the District Admin approved, the claim waits for the District Admin's
  reason."* — `-264` FQ12 + its reading + `-277` Q3 B: consistent.
- **P4 (GI17/GI18):** *"If the inspector finds the original does not match the copy the claim relies on, or the government register does
  not match the certificate the Trust accepted, anyone approving the claim must pick a reason and write a note; it never refuses the claim."* — `-281` Q1 B: consistent.
- Niyamavali §6.2 (document authenticity is verified): consistent; ⛔ no clause on any of these; ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).
- ⭐ **v2.0 re-checked:** RD1–RD21 change the build's mechanics, ⛔ never who may approve or when. RD4 (an R9 approve vote cast before a new
  key must be revised) is `-279` A2's existing rule meeting a new key — "anyone approving" already says it. P2–P4 read the same in 6.26a's file.

## ⚖️ Decisions built here (defined in 6.26a's file; ✅ committed by `2026-10-06-282`)
- **GI6** `inspection_death_date_differs:<ground_inspection_id>` — an OWN completed assignment's `death_date_index` IS DISTINCT FROM the
  current accepted review's `accepted_date_index`, both non-null; ⛔ no accepted certificate ⇒ ⛔ no key; an inherited inspection ⇒ ⛔ no key.
  ⚠ **`-283` A3:** a row whose `death_date_source = 'original_certificate'` counts only while its `compared_certificate_upload_id` is the
  claim's CURRENT upload; a `family_statement` row is ⛔ not filtered.
- **GI7** the date kind ENTERS the wait; 6.23b's queue gains the completed-after-approval disjunct (RD2: ONE hoisted fragment, used by the
  column and the WHERE). ⚠ **`-284` E1:** the scan ALSO admits `state_trustee_approved` for the LATE-WARNING arm only, while the claim
  carries a live `routed_to_r9` routing row (6.26a's leaf, through `liveRoutedToR9Exists()` — ⛔ never a new copy); every other arm keeps
  `CORRECTABLE_SCAN_STATES`.
- **GI8** `register_check` required on ACCEPT, refused on REJECT; stored plaintext with `accepted_date_index` on the review row; ⛔ no new
  conjunct (the certificate conjunct already requires a current accepted review); ⛔ no certificate number stored.
- **GI17** `original_certificate_mismatch:<ground_inspection_id>` — an OWN completed assignment, verdict `does_not_match`, compared against the
  CURRENT upload. Enters the wait.
- **GI18** `register_check_mismatch:<review_id>` — the CURRENT accepted review's `register_check = 'does_not_match'`. Enters the wait.
- **GI10 [b]** the console shows *"differs from the certificate"*, the two mismatch warnings, and the register check (document section +
  history). **GI11 [b]** the three kinds' words wherever kinds render. **GI13 [b]** erasure sets the review's `accepted_date_index` NULL.
  **GI15 [b]** the certificate fixtures pass `register_check: 'matches'` + the index; a default fixture raises ⛔ no new warning.
  **GI16** ⛔ no new permission key, event, rule code or member-facing string.

## ⭐ v2.0 — WHAT RE-DERIVING AGAINST 6.26a's SHIPPED BUILD CHANGED (RD1–RD21; FOUND, ⛔ not decided)

v1.4 was traced at `3311fc97`, before 6.26a existed; 6.26a then went through four review rounds (`-286`, `-287`). Each item below is a fact in
the code at `b665a19a` and what it changes here. ⛔ None moves a GI; each is threaded into the ACs, Tasks and Traps below.

**The queue and the clock**
- **RD1 — ⚠⚠ The fixture clock makes EVERY seeded claim a late-warning candidate — worse than the deferred item says, and against a
  different column.** `completeGroundInspection` stores `completedAt: input.now ?? sql\`now()\`` (`claim/ground-inspection-persist.ts:996-999`
  — 6.26a's first code review, patch #2, pinned at `packages/domain/tests/integration/claim/ground-inspection.spec.ts:640-642`). Both fixtures
  pass `max(Date.now(), date 12:00 IST)` (domain `fixtureReviewNow`, `_helpers.ts:922-924`; API inline, `_nominee-name-check-fixture.ts:129`,
  `:196`) with a default date of TOMORROW (IST) ⇒ `completed_at` is always in the future. And GI7's arm compares it with the **verifier
  approval's** `decided_at` (`claim_verifier_decisions v`), ⛔ not the review's (the `deferred-work.md` item *"The fixture's completion clock can
  be in the FUTURE"* names the review) — so *"seed the completion before the review"* would ⛔ not fix it; in a domain BEGIN/ROLLBACK test
  every DB `now()` is the transaction start, so even a PAST date stores a JS clock later than any approval in the same test.
  ⭐ **AUTHOR CHOICE (recommended — confirm at Task 0):** the completion writer stores the DB clock (`completedAt: sql\`now()\``) and keeps
  `input.now` for the "day of completion" validation ONLY — exactly the review writer's posture (`decided_at` is the DB default; its injected
  `now` serves the D4 check alone, `death-certificate-review-persist.ts:167`). Production is unaffected (the route passes ⛔ no `now`). This
  REVERSES 6.26a's review patch #2 (*"the two should share one time source"*) — record the reversal and its reason in this file's Change Log and
  in 6.26a's review-findings section as an appended note (⛔ never an edit of the finding), and amend the pin to assert `completedAt` is ⛔ not
  the injected clock. ⚠ The alternative — a fixture-only fix — is ⛔ not clean: the date check needs `now` on or after a TOMORROW date.
  Either way this lands BEFORE the GI7 disjunct (Task 4.0).
- **RD2 — the queue's WHERE is Drizzle, and the late arm is an INNER JOIN.** `candidateBatch` is `.where(and(eq(claims.pariwarId, …),
  inArray(claims.currentState, [...CORRECTABLE_SCAN_STATES]), sql\`( EXISTS(return) OR EXISTS(check) OR EXISTS(late) )\`, <keyset>))`
  (`correction-queue-read.ts:176-216`) — ⛔ not one raw WHERE. ⇒ (a) hoist the late arm into ONE local `const lateArm = sql\`EXISTS (…)\``
  used by the `lateWarningCandidate` column AND both WHERE uses (Trap 3 becomes "one fragment" — the two copies existed so the column and the
  WHERE agree, which one fragment guarantees); (b) rewrite it as `EXISTS (SELECT 1 FROM claim_verifier_decisions v WHERE <v live approved,
  this claim> AND (EXISTS (nd … nd.decided_at > v.decided_at) OR EXISTS (SELECT 1 FROM claim_ground_inspections gi WHERE gi.pariwar_id =
  v.pariwar_id AND gi.claim_case_id = v.claim_case_id AND gi.status = 'completed' AND gi.completed_at > v.decided_at)))`; (c) replace the
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
- **RD6 — the per-assignment select needs `death_date_source` too** (`-283` A3 keys on it), and `status = 'completed'` own rows only.
  `RawWarningsRow` gains an `inspections` array of `(ground_inspection_id, death_date_index, death_date_source, original_certificate_verdict,
  compared_certificate_upload_id)`, the `current_upload_id`, and the current review's `accepted_date_index` + `register_check`.
- **RD7 — reuse `currentDeathCertificateUploadIdSql(pariwarIdSql, claimCaseIdSql)`** (`death-certificate-approval.ts:86-98`; inner aliases
  `cur_cd`/`cur_u`) for `current_upload_id` — ⛔ never a third copy of the current-upload JOIN (two pre-exist in this module: the single
  reader's `cur` CTE `:226-241` and the bulk LATERAL `:414-432` — left as they are). `death-certificate-approval.ts` is already on the
  module's "safe leaves" list (`:44-46`); re-run the transitive import-scan test (`approval-warnings.test.ts:344-349`). The existing `cur`
  row IS the current accepted review (`superseded_at IS NULL AND verdict = 'accepted' AND upload_id = current`, ordered `decided_at DESC,
  review_id DESC LIMIT 1`, `:280` / `:431`; at most one live review by a partial unique index) — today it selects only `review_id, decided_at`;
  it gains `accepted_date_index, register_check` (⛔ no new review read).
- **RD8 — the timeline's narrowing reaches the DOMAIN and the API.** `classifyNomineeVersion` (`approval-warnings.ts:122-135`) returns
  `ApprovalWarningKind[]` and `claims.nominee-declaration.handlers.ts:289-333` passes it to `warnings:` ⇒ narrowing only the contract
  (`nominee-declaration.ts:56`) breaks the API typecheck. ⇒ export `NOMINEE_VERSION_WARNING_KINDS = ['post_death_version',
  'recent_nominee_change'] as const` (+ its type) from `approval-warnings.ts`, typed as the classifier's return, with `APPROVAL_WARNING_KINDS`
  built as `[...NOMINEE_VERSION_WARNING_KINDS, <the three>]`; mirror it in contracts (`NomineeVersionWarningKind`) with a lockstep test; use it
  at `nominee-declaration.ts:56` and `NomineeDeclarationPanel.tsx:115-119`. ⛔ No version-kind subset exists today (grep).
- **RD9 — the derivation is private.** `deriveClaimApprovalWarnings` (`:518`) is ⛔ not exported; today's parity is live only
  (`approval-warnings-every-approver.spec.ts:443-466`, bulk vs single). ⇒ put the three kinds' rule in ONE exported pure helper
  (`deriveDeathFactWarningKeys`) that the private derivation calls; the AC8 unit table targets it; the live parity test gains rows carrying
  each new kind.

**The review writer, the migration, erasure**
- **RD10 — "nominee-change" in ~15 staff strings**, ⛔ not only the heading: admin `claim-verification/i18n-en.ts` `:135` (heading), `:154`,
  `:160` (`unavailable`), `:157` (revise blocked), `:181-182` (`warningReasonRequired` / `…Ungrounded`), `:194-198` (R9 votes), `:333-339`
  (the correction queue's late lines — which GI7 now fills with date and inspection keys); `approval-warning-reasons/i18n-en.ts:16`, `:18` (the
  Super Admin's reason page — its reasons now serve every kind); API `later-approval-warnings.ts:46`, `:54`, `:66` and
  `claims.verification-decision.handlers.ts:59`, `:61`. ⇒ reword each kind-neutral ("warning(s) on this claim"). Every one is staff-facing ⇒
  GI16's *"⛔ no member-facing string"* holds; `grep -rn -i "nominee-change\|nominee change" apps/admin/src apps/api/src` is the completeness check.
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
  `.optional()` there. The history item `DeathCertificateHistoryReview` (`:64-79`, strict) is served by `getHistory` (handler `:253-341`; its
  explicit object `:290-313` needs the field — the domain read `.select()`s full rows) and rendered by `DeathCertificateHistory`
  (`DeathCertificateReviewControl.tsx:290-358`, review line `:328-340`). The admin submit spreads each field explicitly
  (`VerifierConsoleRoute.tsx:419-431`). ⛔ No contracts test pins these review shapes.
- **RD14 — the migration's shape.** The table's own convention is `text` + an `as const` array + a SQL CHECK (`schema/claim_death_certificate_reviews.ts:44-56`,
  `:84-86`), ⛔ not a `pgEnum` ⇒ `register_check text` + `claim_death_certificate_reviews_register_check_check` (the three values). The
  coherence CHECK (*a `rejected` review carries ⛔ neither column*) holds on EVERY existing row (both columns are new, NULL) ⇒ a plain
  VALIDATED CHECK (6.26a author choice 2's precedent), ⛔ not `NOT VALID` — Trap 9's reasoning still decides what is ⛔ not a CHECK. The
  trigger function `claim_death_certificate_reviews_reject_mutation` (`0122_death-certificate-clear-date-rule.sql:159-187`) is a deny-list ⇒
  `CREATE OR REPLACE FUNCTION` restating the whole body + `register_check` (the triggers themselves stay). GRANTs at `0122:143-145` confirmed;
  ⛔ no later migration alters the table (`0137:33` only references it). `0149` is free (journal ends at idx 148, `0148_ground-inspection-photo-certificate-stamp`).
- **RD15 — the index needs a writer guard too.** v1.4 named none. ⇒ an accept without a non-empty `acceptedDateIndex` ⇒ `invalid_date` (the
  date and its index travel together); a reject with one ⇒ `date_on_reject`. ⭐ **Guard order:** the four existing shape guards
  (`death-certificate-review-persist.ts:113-128` — `reason_on_accept`, `invalid_date`, `date_on_reject`, `missing_reason`) run FIRST, then
  `register_check_required` / `register_check_not_allowed` — so every existing refusal keeps its code (the API refusal table builds its reject
  rows from `acceptBody`, `apps/api/tests/integration/claims/death-certificate.spec.ts:238-247`).
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
  client-side (the console never carries the accepted date). ⇒ the handler STITCHES two per-item fields from `w.keys` after both sections are
  assembled (`groundInspection` at `:313`, `approvalWarnings` at `:330`): `dateDiffersWarning` and `originalMismatchWarning`, each
  `boolean | null` (`null` when the warnings read failed — invariant 5). ⛔ No new read (`VERIFIER_CONSOLE_MAX_READS` stays **20**,
  `:177`, pinned `toBe(20)` at `verifier-console-ground-inspection.spec.ts:212`); ⛔ no key exposed on the wire. The register check reaches the
  document section through `readDeathCertificateSnapshot`'s explicit SELECT (`death-certificate-approval.ts:121-128`) + `LiveDeathCertificateReview`
  (`:46-53`) ⇒ `review.registerCheck` — ⛔ no new read. Fixtures that gain the strict fields: `packages/contracts/tests/claims-verifier-console.test.ts:177-195`,
  `apps/admin/tests/verifier-console.test.tsx`, `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`, the `review`
  fixtures in `apps/admin/tests/death-certificate-review.test.tsx` and `verifier-console-route-name-check.test.tsx`.
- **RD19 — the red-by-design list is far wider than v1.4's one spec.** The 6.23a/b warning specs BUILD their late keys by re-reviewing with
  another date after the default fixture ⇒ the fixture's `family_statement` row (⛔ not currency-filtered — A3) now differs ⇒ +1
  `inspection_death_date_differs` key, and the exact counts move:
  domain `approval-warnings.spec.ts` (`determine(ctx, istDaysAgo(…))` at `:400`, `:407`, `:438`, `:450`, `:466`, `:474`, `:489`, `:513`, `:526`;
  pins `:440-452`, `~:494`) · domain `approval-warnings-every-approver.spec.ts` (`redetermineAndRecheck` at `:293`, `:496`, `:520`, `:536`, `:723`,
  `:754`, `:782`, `:998`; `determine` at `:439`) · API `approval-warnings.spec.ts` (`redetermine` `:338`, `:391`; `uncoveredSinceApproval: 1` at
  `:398`; the `:401` re-accept) · API `approval-warnings-every-approver.spec.ts` (`redetermine` `:342`, `:630`, `:830`; `kinds:
  ['post_death_version'], uncovered_count: 1` at `:413`, `:416`, `:638`, `:640`, `:672`, `:840`, `:879`) · domain `death-certificate.spec.ts:448-466`
  (v1.4's one). ⚠ `death-certificate.spec.ts:387` and `r9-voting.spec.ts:475` are ⛔ not red (the certificate conjunct answers first,
  `nominee-name-check.ts:416`).
- **RD20 — direct accept callers break when `registerCheck` becomes required** (Task 2), incl. **`apps/jobs`, which v1.4 never named**:
  domain `death-certificate.spec.ts` (`accept()` helper `:111` → `:171`, `:213`, `:218`, `:237-298`), `death-certificate-concurrency.spec.ts:149-155`;
  API `death-certificate.spec.ts`'s `acceptBody` (`:197-207` → every HTTP accept `:215`, `:266`, `:270`, `:281`, `:344`, `:353`); jobs
  `apps/jobs/tests/_claim-correction-seed.ts:164-167`, `claim-certificate-reminders-live.test.ts:527-528`,
  `claim-ocr-parity-death-certificate.test.ts:192-199` (its accept leg). The rejects (`certificate-reminder.spec.ts:203`, API
  `death-certificate.spec.ts:174`) need ⛔ no field. Raw review INSERTs (the RLS spec, `death-certificate-rtbf.spec.ts`) stay valid (⛔ no CHECK
  requires the new columns on accept). ⇒ run the **jobs** suite too.
- **RD21 — the test helpers exist.** Domain `seedGroundInspection(client, p, c, { deathDate?, verdict?, stage?, force? })` (`_helpers.ts:1046`)
  already takes a date and a verdict; the API twin `ensureGroundInspection(deps, scopeTx, p, c, { force, verdict })`
  (`_nominee-name-check-fixture.ts:142-198`) copies the accepted date (`:156-159`) ⇒ it gains a `deathDate?` option for the date kind. ⭐ Both
  default fixtures seed the review FIRST and the inspection LAST (domain `_helpers.ts:1335` → `:1375`; API `:304` → `:312`/`:353`).

## Acceptance Criteria

### AC0 — Governance and re-pin (Task 0)
6.26a is `done` ✅; the author-commit (GI1–GI18), `-281`, `-283`, `-284` (and `-285`, `-286`, `-287`, which move ⛔ nothing here) are in
`.decision-log.md` ✅; the baseline is re-pinned to `b665a19a` and every code claim re-derived ✅ (v2.0); work is on
`story/6-26b-death-facts-warnings-and-register-check` ✅. ⭐ BigDev confirms RD1's author choice (or names the alternative) before Task 4.0.
⛔ No code before.

### AC7 — The register check (GI8) *(the number is kept from v1 of Story 6.26 — 6.26a cites it)*
An ACCEPT without `register_check` → 409 `death_certificate_review.register_check_required`; a REJECT with one →
`…register_check_not_allowed` (after the existing four guards — RD15); an accept stores it and `accepted_date_index` (computed by the handler
through `deathDateBlindIndex` — RD12); the success audit carries the code (RD17); the console's document section and the review history show it
in words; ⛔ no certificate number is stored; ⛔ nothing pre-selected in the form; the two new codes have their own admin words (RD11).

### AC8 — The warnings (GI6, GI7, GI17, GI18)
**Given** an accepted certificate dated D:
- a completed full assignment whose family date ≠ D ⇒ `inspection_death_date_differs`; = D ⇒ ⛔ no key; ⛔ no accepted certificate ⇒ ⛔ no key;
  an inherited inspection ⇒ ⛔ no key; a `certificate_check` whose printed date ≠ D ⇒ the key too (6.26a GI5's `original_certificate` source)
  — but ⛔ no key once that original is ⛔ no longer the claim's current upload (`-283` A3; still shown); a pre-6.26b accepted review (⛔ no
  index) ⇒ ⛔ no date key;
- a completed assignment with verdict `does_not_match` compared against the CURRENT upload ⇒ `original_certificate_mismatch`; against a
  replaced upload ⇒ ⛔ no key (still shown);
- the current accepted review with `register_check = 'does_not_match'` ⇒ `register_check_mismatch`; `matches` / `could_not_check` ⇒ ⛔ no key;
  a superseded review's ⇒ ⛔ no key.
**And** the District Admin's approval while any of these shows needs a warning reason and a note (6.23a NW6 — unchanged code path), and
every later approver's too (6.23b). **Given** the District Admin approved and an assignment then completes with a differing date or a
`does_not_match` verdict ⇒ the final approval WAITS (`LateWarningReasonRequiredError`) until the District Admin's NW14 late reason covers
the new key, **and meanwhile the claim is listed in the District Admin's correction queue** (`lateWarningAwaitingReason: true`) — **including an
R9-routed claim in `state_trustee_approved`** (`-284` E1), which is ⛔ not listed once its routing row is superseded; and at R9 finalize
every approve vote cast before the new key must be revised (RD4). **And** a default-fixture claim that is approved is ⛔ not a late-warning
candidate (RD1).
**And** both readers derive every kind from the SAME pure helper (`deriveDeathFactWarningKeys` — a unit table, plus the live bulk-vs-single
parity with each kind); `APPROVAL_WARNING_KINDS`' pin test and the contracts mirror are updated with a message citing GI6 / GI17 / GI18 and
`-281`; the timeline's kind type is `NOMINEE_VERSION_WARNING_KINDS` (RD8).

### AC9b — What the console and the later surfaces say (GI10 [b], GI11 [b])
Each kind has its own words (in the typed map); every staff string that said "nominee-change" is kind-neutral (RD10); the console's
assignment rows show *"differs from the certificate"* where `dateDiffersWarning` is true, the mismatch warning where `originalMismatchWarning`
is true, and *"could not be checked"* where either is `null` (RD18); the register check shows on the document section and in the review
history. ⛔ No warning text carries a date.

### AC11b — Erasure (GI13 [b])
The anonymizer sets the review's `accepted_date_index` NULL in the existing review scrub (RD16 — ⛔ no new statement; pins unchanged); the
unit test asserts the column in the SET; the live RTBF spec erases a deceased whose claim has an accepted review written AFTER this
migration — ⛔ no 23514, ⛔ no 42501.

### AC12b — Nothing else moves (GI16)
Catalog version **51** / key count **65** unchanged; ⛔ no new event; ⛔ no new rule or reason code beyond GI8's two refusals; ⛔ no file under
`apps/mobile`, `apps/public` or `packages/i18n` changes.

### AC13b — The proof
Every test below passes; GI15 [b]'s fixtures raise ⛔ no warning on any approve-path spec; every RD19 / RD20 spec is amended, ⛔ never weakened;
`pnpm ci:local` green with `DATABASE_URL` at :5433 (domain, API, **jobs**, admin, contracts); the migration applied to BOTH :5432 and :5433.

## Tasks / Subtasks
- [ ] **Task 0 (AC0)** — ✅ 6.26a `done`; ✅ re-pinned to `b665a19a` and re-derived (v2.0, 2026-10-07); ✅ branch. At the build:
  `git fetch origin`; `git diff --name-only b665a19a..HEAD -- packages apps scripts` (re-read any cited file it lists); confirm ⛔ no decision
  after `-287` touches GI6–GI8 / GI17 / GI18; ⭐ get BigDev's word on RD1's choice.
- [ ] **Task 1 — Migration (GI8; RD14)** — `0149_death-certificate-register-check.sql`: `claim_death_certificate_reviews` + `register_check text`
  (CHECK `IN ('matches','does_not_match','could_not_check')`, NULL allowed) + `accepted_date_index text`; a VALIDATED CHECK that a `rejected`
  review carries ⛔ neither. ⚠⚠ "an `accepted` review carries both" is ⛔ NOT a CHECK — it is the WRITER's guard (Task 2) + a test: every
  pre-6.26b accepted review lacks both, and two existing UPDATEs rewrite those rows — the anonymizer's review scrub sets `noteCiphertext` on EVERY
  review of the deceased (`member/anonymize.ts:242-249`) and the review writer's supersession (`death-certificate-review-persist.ts:178`) —
  so such a CHECK would fail every erasure and make every pre-6.26b certificate un-re-reviewable. ⚠⚠ **GRANTS and the trigger:** `0122:143-145`
  grants `twt_app` only `SELECT, INSERT` + `UPDATE ("superseded_at", "superseded_reason", "accepted_date_ciphertext", "note_ciphertext")` ⇒ add
  `GRANT UPDATE ("accepted_date_index") ON "claim_death_certificate_reviews" TO twt_app` (GI13 [b]'s scrub — else 42501); `CREATE OR REPLACE
  FUNCTION claim_death_certificate_reviews_reject_mutation()` restating `0122:159-187`'s body with `register_check` added to the
  `IS DISTINCT FROM` list (`accepted_date_index` stays OUT — the scrub NULLs it). Drizzle schema (`schema/claim_death_certificate_reviews.ts` — an
  `as const` values array + type, the table's convention); journal idx 149; apply to :5432 AND :5433 ([[project_live_db_test_gotchas]]).
- [ ] **Task 2 — Domain: the review writer (GI8; RD15)** — `RecordDeathCertificateReviewInput` (`death-certificate-review-persist.ts:58-81`) gains
  `registerCheck` and `acceptedDateIndex`; the guards AFTER the existing four (`:113-128`): accept ⇒ `registerCheck` required
  (`register_check_required`) and a non-empty index (`invalid_date`); reject ⇒ neither (`register_check_not_allowed` / `date_on_reject`);
  `DeathCertificateReviewRefusedError`'s union (`claim/errors.ts:584-604`) widened by the two codes. ⛔ No API mapping change (RD11).
- [ ] **Task 3 — Domain: the kinds (GI6, GI17, GI18; RD6–RD9)** (`claim/approval-warnings.ts`)
  - [ ] 3.1 `NOMINEE_VERSION_WARNING_KINDS` exported; `APPROVAL_WARNING_KINDS = [...NOMINEE_VERSION_WARNING_KINDS, 'inspection_death_date_differs',
    'original_certificate_mismatch', 'register_check_mismatch']`; `classifyNomineeVersion` returns the version type (RD8); the pin test's
    expected list + message (citing GI6/GI17/GI18, `-281`); the contracts mirror (+ `NomineeVersionWarningKind`) and both lockstep tests.
  - [ ] 3.2 Both statements select the own `completed` assignments' `(ground_inspection_id, death_date_index, death_date_source,
    original_certificate_verdict, compared_certificate_upload_id)` as a JSON array (single: a CTE / scalar subselect; bulk: a `LEFT JOIN LATERAL`
    with `coalesce(json_agg(…), '[]')`), `current_upload_id` via `currentDeathCertificateUploadIdSql(sql\`c.pariwar_id\`, sql\`c.claim_case_id\`)`
    (RD7), and the `cur` review's `accepted_date_index, register_check` — ⛔ no ciphertext; raw SQL with explicit aliases
    ([[project_epic6_drizzle_correlated_subquery_bug]]); the bulk twin keeps its slicing.
  - [ ] 3.3 `deriveDeathFactWarningKeys` (exported, pure) — GI6 (+ A3's currency on `original_certificate` rows), GI17 (currency), GI18 (current
    review only); called by `deriveClaimApprovalWarnings` (RD9). Keys via `approvalWarningKey`.
- [ ] **Task 4 — Domain: the queue (GI7 + `-284` E1; RD1–RD5)** — `correction-queue-read.ts`
  - [ ] 4.0 ⭐ FIRST, the clock (RD1, as BigDev confirms): `completeGroundInspection` stores `completedAt: sql\`now()\``; `input.now` validates
    only; amend the pin (`ground-inspection.spec.ts:640-642`) and its comment; append the reversal note to 6.26a's review-findings section;
    in `deferred-work.md`, mark *"The fixture's completion clock can be in the FUTURE"* DISCHARGED with an appended line correcting its
    comparator (the verifier approval's `decided_at`) — ⛔ never deleted ([[feedback_closure_language_precision]]).
  - [ ] 4.1 Hoist `lateArm` (RD2 a), rewrite it with the completed-after-approval disjunct (RD2 b), and restructure the WHERE with the R9
    admission (RD2 c, `liveRoutedToR9Exists()` — RD3). ⛔ Never a per-claim call (an N+1); ⛔ never a new copy of the R9 predicate. The
    *"TODAY a late key can arise ONLY that way"* comment (`:198`) and the `lateWarningCandidate` doc-block (`:157-161`) amended (⛔ not deleted):
    two sources now, plus the R9 admission.
  - [ ] 4.2 Append to `deferred-work.md`'s item *"⚠ EA10's late-warning arm keys on a NEW determination"* that 6.26b added the
    completed-after-approval arm — its row-6-22 trigger still stands for the member-declare and innocence-finding sources.
- [ ] **Task 5 — Erasure (GI13 [b]; RD16)** — `member/anonymize.ts:242-249`: `acceptedDateIndex: null` in the existing `.set`;
  `rtbf-anonymize.test.ts` asserts the column (counts unchanged: 22 / 19 / 21); `death-certificate-rtbf.spec.ts` (insert an index, assert NULL
  after erasure) + the API `death-certificate.spec.ts:519` leg. The immutability of `register_check` is proved in the RLS spec (Task 10) —
  ⛔ not here (as `twt_app`, the missing column grant refuses it first, 42501).
- [ ] **Task 6 — API (RD12, RD13, RD17, RD18)** — `claims.death-certificate.handlers.ts`: pass `registerCheck: body.register_check ?? null` and
  `acceptedDateIndex` (`deathDateBlindIndex(body.accepted_date, p, deps.encryption)` when the date is present) to the writer; `register_check` in
  the success audit context and in `getHistory`'s explicit object. `claims.verifier-console.handlers.ts`: `review.registerCheck` from the
  snapshot (`death-certificate-approval.ts:121-128` SELECT + `LiveDeathCertificateReview`); the two per-assignment flags stitched from `w.keys`
  after both sections (RD18) — `null` when `approvalWarnings.available` is false. The API server strings of RD10.
- [ ] **Task 7 — Contracts (RD8, RD13, RD18)** — `death-certificate.ts`: `register_check` optional on the request, on the history item (nullable);
  `verifier-console.ts`: `review.registerCheck` (nullable) and the two per-item flags (`boolean | null`); the kind enum + `NomineeVersionWarningKind`;
  `nominee-declaration.ts:56` narrowed. Run contracts + mobile vitest ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 8 — Admin (RD10, RD11, RD13, RD18)** — `DeathCertificateReviewControl.tsx`: the register-check radio inside the accept fieldset
  (`useState<…|null>(null)` — the reject-reason radio's ⛔-pre-selected pattern, `:200-220`); `ready` (`:94`) requires it on accept; the fingerprint
  reset (`:87-93`) clears it; the local submit type (`:26-31`); the history line (`:328-340`) shows it in words. `VerifierConsoleRoute.tsx:419-431`
  passes it. The three kind lines in `i18n-en.ts` (typecheck forces them) and every RD10 string reworded; the two refusal words (RD11);
  `NomineeDeclarationPanel.tsx:115-119` narrowed to the version type (RD8); `SignalsPanel.tsx` `InspectorRecordLines` (`:367-390`) — the mismatch
  warning on the verdict `<li>`, *"differs from the certificate"* after the date line, *"could not be checked"* on `null`; the register check in
  `DeathCertificateReviewStatus` (`VerifierReviewPanel.tsx:114`). `microcopy.yaml` (whole-word scan of `apps/admin/src/**`; `report`,
  `passbook`, `receipt`, `invoice` banned). ⚠ `EscalationPanel.tsx` itself is ⛔ not edited (its words come through the shared map) ⇒ the
  deferred *"A FAILED refetch after a 409 hides the whole approval surface"* item's `EscalationPanel` half does ⛔ not trigger here.
- [ ] **Task 9 — Fixtures and the red-by-design specs (GI15 [b]; RD19–RD21; AC13b)**
  - [ ] 9.1 `seedAcceptedDeathCertificate` (domain, `_helpers.ts:935-982`) passes `registerCheck: 'matches'` + `fixtureDeathDateIndex(date)`;
    `ensureAcceptedDeathCertificate` (API, `_nominee-name-check-fixture.ts:89-132`) passes `'matches'` + `deathDateBlindIndex(date, …)`;
    `ensureGroundInspection` gains `deathDate?` (RD21).
  - [ ] 9.2 Every direct accept caller of RD20 (domain, API, **jobs**) passes a register check and an index.
  - [ ] 9.3 ⚠ **RED BY DESIGN, listed and AMENDED (⛔ never a weakened assertion):** every RD19 spec. Each amended to name the new
    `inspection_death_date_differs` key/kind and count it (it IS the correct behaviour — the certificate moved away from the family's date), or —
    where the spec's subject must stay nominee-change only — seeded with `inspection: 'skip'` and completed explicitly with the matching date.
    ⛔ Never loosened to `toContain` without its count. Then run the WHOLE domain, API and jobs suites — any OTHER red is a fixture gap.
- [ ] **Task 10 — Tests** (below); red-check each load-bearing one (revert the line, watch it fail, restore).
- [ ] **Task 11 — Records** — `sprint-status.yaml` (row + one ledger entry); File List; Change Log; `deferred-work.md` (Task 4.0, 4.2).

## Dev Notes

### Traps
1. **One field class** — the review index MUST go through `deathDateBlindIndex` (API) / `fixtureDeathDateIndex` (domain fixtures); a second
   literal or a different stand-in makes every claim "differ".
2. **The bulk reader drifts** — derive ONLY in the shared pure helper; the live parity test is the guard (6.23b's pattern).
3. **One late-arm fragment** (RD2) — the column and the WHERE read the SAME `lateArm`; the R9 admission ANDs it, ⛔ never a copy.
4. **Currency** — GI17 compares against the CURRENT upload, GI18 reads the CURRENT accepted review; a test replaces each and sees the key go.
5. **Pre-6.26b accepted reviews have ⛔ no index** ⇒ ⛔ no date key on them (dev data only — ⛔ not in production); backfill ⛔ nothing
   ([[feedback_record_unattested_no_backfill]]). A re-review writes it.
6. **Fixture defaults raise nothing** — register `matches`, family date = accepted date (6.26a GI15), verdict `matches`; otherwise every
   approve-path spec gains a warning (the 6.23a Trap-5 lesson). ⚠ Except a spec that RE-REVIEWS with a different date after the fixture —
   red by design (RD19, Task 9.3).
7. **The timeline classifies VERSIONS only** — `NOMINEE_VERSION_WARNING_KINDS` (RD8); widening the shared enum must ⛔ not make the timeline
   emit or word the three new kinds.
8. **Currency for the printed date** (`-283` A3) — a test replaces the original after a `certificate_check` and sees the date key go.
9. **The review CHECK is narrow on purpose** (Task 1) — an UPDATE of any pre-6.26b accepted review must still pass it.
10. **The clock** (RD1) — a test approval followed by a fixture-completed inspection must ⛔ not read as "completed after approval"; and a
    REAL completion after approval must. Both legs.
11. **`null` is ⛔ never `false`** (RD18, invariant 5) — a failed warnings read on the console shows "could not be checked" per assignment.
12. **Guard order** (RD15) — the new refusals run AFTER the existing four; the API refusal table proves each existing code survives.

### Testing
- **Domain unit:** `deriveDeathFactWarningKeys`' table (each kind: present / absent / ⛔ no accepted review / pre-6.26b review ⛔ no index /
  replaced upload / superseded review / inherited / `could_not_check`); the pin + lockstep tests; `rtbf-anonymize.test.ts` (the column in the SET).
- **Domain live-DB (RLS):** `rls/claim-death-certificate-policy-regression.spec.ts` — the owner-role trigger test (after `RESET ROLE`, `:376-396`)
  gains a `register_check` leg; the 42501 test (`:330`) gains a `register_check` leg; *"twt_app CAN scrub"* (`:353`) gains `accepted_date_index`;
  the per-name CHECK test (`:208`) gains both new CHECKs.
- **Domain live-DB:** `approval-warnings.spec.ts` + `approval-warnings-every-approver.spec.ts` (each kind blocks an un-reasoned approval at
  every approver; the late wait for GI6 and GI17; RD4's R9 finalize — the District Admin's wait first, then the approve votes' revision); the
  bulk-vs-single parity with each kind; the queue (`listClaimsUnderCorrection` — tested in `approval-warnings-every-approver.spec.ts`; ⛔ no
  separate correction-queue spec exists): the completed-after-approval listing, an R9-routed claim in `state_trustee_approved` (listed) and the
  same claim with its routing row superseded (⛔ not listed), and a default-fixture approved claim (⛔ not a candidate — RD1); `ground-inspection.spec.ts`
  (the amended clock pin); `death-certificate.spec.ts` (AC7, guard order); `death-certificate-rtbf.spec.ts`.
- **API live-DB:** `death-certificate.spec.ts` (register-check codes; the refusal table; the history field; the audit code); `verifier-console.spec.ts`
  / `-shape.spec.ts` / `verifier-console-ground-inspection.spec.ts` (`registerCheck`, the two flags incl. `null`; MAX_READS still 20); one
  approval-route test per new kind showing the reason requirement (`ensureGroundInspection({ force: true, verdict: 'does_not_match' })` /
  `{ deathDate }`).
- **Jobs:** the three RD20 files.
- **Admin:** `death-certificate-review.test.tsx` (the choice, ⛔ nothing pre-selected, Submit disabled without it, the history words, the two
  refusal words; its exact payload assertions `:190-199`, `:347-370` amended); the kind lines on the console and on one later surface; the
  per-assignment lines incl. "could not be checked"; the timeline still words only its two kinds.
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
- `.decision-log.md`: `2026-10-06-284` E1 (amends GI7) · `2026-10-06-283` A1, A2, A3 · `2026-10-06-285` · `-280` · `2026-10-06-281` ·
  `2026-09-28-262` FQ8 B/C · `-264` FQ12 · `-277` Q2 C, Q3 B · `-278` NW1, NW6, NW14 · `-279` A2, A4, A6 · `2026-10-06-282` (GI1–GI18) ·
  `2026-10-07-286` / `-287` (GI4 — ⛔ no effect here).
- `_bmad-output/implementation-artifacts/6-26-ground-inspection-before-approval-and-death-facts.md` (Story 6.26a — GI1–GI18, the record;
  its Completion Notes and review findings).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md`.
- Stories `6-23-post-death-nominee-change-warnings.md` (NW1–NW18), `6-23b-every-approver-gives-a-warning-reason.md` (EA2, EA5, EA7, EA10),
  `6-21-death-certificate-clear-date-rule.md` (the review writer).
- `deferred-work.md`: *"The fixture's completion clock can be in the FUTURE"*; *"⚠ EA10's late-warning arm keys on a NEW determination"*;
  *"The R9 routing predicate's BULK inline twins …"*; *"A FAILED refetch after a 409 hides the whole approval surface"*.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-06 | Split out of Story 6.26 v1.1 (BigDev; `2026-10-06-281` Consequence 2) after the Panel ruled Q1 B · Q2 A. Owns GI6, GI7, GI8, GI17, GI18 and the [b] halves of GI10/11/13/15/16. `backlog` until 6.26a is `done`; ⛔ not re-pinned yet. |
| v1.1 | 2026-10-06 | GI1–GI18 committed by `2026-10-06-282` (cited here). ⛔ No GI changed; still `backlog`. |
| v1.2 | 2026-10-06 | The first fresh-context validate (combined with 6.26a's v2.3; `2026-10-06-283`, `e8200366`). GI6 amended by **A3** (a printed date from a replaced original ⛔ no longer warns — BigDev: *"Add currency filter"*; P3 now names the printed date; a `-264` reading row). Task 1's CHECK narrowed: "an accepted review carries both" is the writer's guard, ⛔ not a CHECK (a `NOT VALID` CHECK re-checks every pre-6.26b accepted review on the anonymizer's note scrub and on supersession — every erasure would fail). Fact 4 names the SECOND typed kind map (`NomineeDeclarationPanel.tsx:119`, narrowed to version kinds) and the mislabelling heading. Task 4 appends to the EA10 deferred item; Task 8 gains the review-history line; the queue's tests live in `approval-warnings-every-approver.spec.ts`. ⛔ Not re-pinned; still `backlog`. |
| v1.3 | 2026-10-06 | Round 2 (with 6.26a v2.4; `2026-10-06-284`, `72afe24d`). **E1** (BigDev: *"Scan it while R9-routed"*): the queue's late-warning arm also scans `state_trustee_approved` while R9-routed — Fact 3, GI7, AC8, Task 4 and the queue test carry it. Task 1 gains the column GRANT (`accepted_date_index` — the erasure would otherwise fail 42501) and adds `register_check` to the reject-mutation trigger's immutable list. P3/P4 match 6.26a word for word and carry A3's currency. ⛔ Not re-pinned; still `backlog`. |
| v1.4 | 2026-10-06 | Round 3 (with 6.26a v2.5): ⛔ no BLOCKER / HIGH. Task 4 rewritten — the state admission lives ONCE in the shared WHERE and uses 6.26a's SQL fragment `liveRoutedToR9Exists` (⛔ never a per-claim call); why `qualifyingRows` needs ⛔ no change. Task 9 / Trap 6 list the red-by-design re-review specs (A3 leaves `family_statement` unfiltered). Task 5 and Testing: `register_check`'s immutability is proved in `rls/claim-death-certificate-policy-regression.spec.ts` (four legs), ⛔ not through `twt_app`. P2 now identical to 6.26a's. ⛔ Not re-pinned; still `backlog`. |
| v2.0 | 2026-10-07 | **Created for dev** (`bmad-create-story 6.26b`) — re-pinned `3311fc97` → `b665a19a` (6.26a merged as PR #259) and every code claim re-derived by three fresh-context read-only verifiers (warnings + queue; review writer + migration + erasure + fixtures; API + contracts + admin), the load-bearing ones re-read by the author. ⛔ No GI or ruling moved. **RD1–RD21** (found facts) change the build: ⚠ RD1 the fixture clock (6.26a's completion stores the injected clock, always in the future; GI7 compares the VERIFIER approval's `decided_at`) — author choice: store the DB clock, `now` validates only (reverses 6.26a review patch #2; BigDev confirms at Task 0); RD2 the queue's WHERE is Drizzle and its late arm an INNER JOIN — one hoisted fragment, an `or(and(…), R9 admission)`; RD3 `liveRoutedToR9Exists()` takes SQL; RD4 a late key during R9 also makes the approve votes short (`-279` A2); RD6–RD9 the select needs `death_date_source`, reuse `currentDeathCertificateUploadIdSql`, `NOMINEE_VERSION_WARNING_KINDS` reaches the classifier + API, an exported pure `deriveDeathFactWarningKeys`; RD10 ~15 "nominee-change" staff strings reworded; RD11 the review 409s need ⛔ no mapping but the admin words are unforced; RD12 `deathDateBlindIndex` reused; RD13 strict contracts; RD14 text + CHECK, a VALIDATED coherence CHECK, the trigger restated; RD15 the index guard and guard order; RD16 erasure adds ⛔ no statement; RD17 the audit code; RD18 the console's per-assignment flags stitched from `w.keys` (`boolean | null`, ⛔ no new read); RD19–RD20 the red-by-design list (four warning specs) and the direct accept callers incl. `apps/jobs`; RD21 the helpers. `backlog` → **`ready-for-dev`**. |
