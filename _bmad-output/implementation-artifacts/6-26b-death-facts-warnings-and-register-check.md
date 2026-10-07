---
baseline_commit: 3311fc97
---

<!--
⭐ MERGED 2026-10-07 with Story 6.26a as PR #259 (REBASE-merge): every 6.26 SHA this file cites (`9282d108`, `97403945`, …) was
rewritten by the rebase. The citations are kept AS WRITTEN; the proved map to their `main` twins is the header of
`6-26-ground-inspection-before-approval-and-death-facts.md` (each pair by identical `git patch-id --stable`).
-->

<!--
BASELINE — `3311fc97` on `main`. ⚠ This story starts only when Story 6.26a (`6-26-ground-inspection-before-approval-and-death-facts.md`)
is `done` — it READS 6.26a's columns (`original_certificate_verdict`, `compared_certificate_upload_id`, `death_date_index`) and constant
(`DEATH_DATE_INDEX_FIELD_CLASS`). ⇒ Task 0 RE-PINS to 6.26a's merge commit and re-derives every code claim below against it.

GLYPH REGISTER / ADDRESSING RULE: as 6.26a's header (`⛔` sits only on a negation word; ⛔ no `file:NNN` into the newest-first ledgers).
LETTERS: `GI1`…`GI18` are Story 6.26's author decisions, defined ONCE in 6.26a's file and committed by ONE author-commit — ✅ `2026-10-06-282`.
This story BUILDS the ones tagged **[b]** or **[a+b]** there — GI6, GI7, GI8, GI17, GI18 and the [b] halves of GI10, GI11, GI13, GI15, GI16.
This file ⛔ never restates a different version of a GI: where a summary below and 6.26a's text disagree, 6.26a's text (and the decision
entry) is the record.
⭐ v1.2 — `2026-10-06-283` (the first fresh-context validate of 6.26a and 6.26b, combined) amends GI6 here (**A3**: a printed date from
a REPLACED original ⛔ no longer warns) and GI2/GI16 in 6.26a (**A2**: the inheritance needs a full visit). 6.26a's GI block carries a
`⚠ AMENDED by -283` line under each amended GI; where a GI and its line disagree, the line is the build.
⭐ v1.3 — `2026-10-06-284` E1 amends GI7 here: the correction queue's late-warning arm ALSO scans `state_trustee_approved` while the claim
is R9-routed (`-283` A1 lets an inspection complete there). ⭐ The Policy-meaning sentences P1–P4 read the same in both files (v2.5 / v1.4).
-->

# Story 6.26b: The Death Facts Become Warnings — a Differing Date of Death, an Original That Does Not Match, a Register That Does Not Match — and the District Admin Records the Government-Register Check `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.26a makes the inspector record the original certificate's match and the family's
> date of death. This story makes those facts **ask something of an approver**: a family's date of death that **differs** from the accepted
> certificate (`-262` FQ8 C, named in `-264` FQ12), an inspector's **"the original does not match the copy"**, and the District Admin's
> **"the government register does not match"** (`2026-10-06-281` Q1 B) are each a **warning** under the ONE rule 6.23a built — approving
> while one shows needs a chosen reason and a written note, from every approver (`-277` Q2 C); one that first appears after the District
> Admin approved makes the final approval **wait** for the District Admin's reason (`-277` Q3 B). And the District Admin, when accepting a
> certificate, **records the government death-register (CRS) check** — matches / does not match / could not be checked online (`-262` FQ8 B).
> ⭐ **The system still refuses nothing.**

> ⭐ **Not in `epics.md`'s story list** — 6.26a's Task 0 adds `### Story 6.26b`. Row `6-26b-death-facts-warnings-and-register-check`.
> ⭐ **Closes 6.26a's go-live coupling:** until this story ships, the inspector's mismatch and a differing date are shown but ask nothing,
> and no register check is recorded.

> ⚠⚠ **FOUR FACTS — read before anything else** (traced at `3311fc97`; re-derive at the re-pin).
> 1. ⭐ **The rule exists; this story adds KINDS, ⛔ never a rule.** `APPROVAL_WARNING_KINDS` (`claim/approval-warnings.ts:86`) and its
>    contracts mirror (`packages/contracts/src/claims/verification-decision.ts:121`), a key `kind:subjectId`, ONE claim-level statement
>    (`readClaimApprovalWarnings`, `:213`) and its bulk twin, both feeding ONE pure derivation; every approver already calls the assertion.
>    6.23a's pin test on the kind list says a new kind enters 6.23b's wait only by a decision — `-281` Q1 B rules it for GI17/GI18, GI7 decides
>    it for GI6.
> 2. ⚠ **The warning module never decrypts** (6.23a invariant 7) — and both dates are Tier-1. ⇒ the date difference is a comparison of two
>    keyed **indexes** in SQL: the inspection's `death_date_index` (6.26a) against the current accepted review's `accepted_date_index` (THIS
>    story adds it, written by the review handler on every accept), under ONE field-class constant `DEATH_DATE_INDEX_FIELD_CLASS` (6.26a).
> 3. ⚠⚠ **6.23b's correction queue would never tell the District Admin — TWICE.** Its cheap candidate test assumes a late key arises ONLY from a live
>    determination decided after the live approval (`correction-queue-read.ts:162-173`, the `lateWarningCandidate` select, and `:196-209`,
>    the SQL superset arm — two copies on purpose). 6.26a's window lets an assignment complete AFTER approval ⇒ a second source (GI7). ⚠⚠ And the queue filters on
>    `CORRECTABLE_SCAN_STATES` (`correction-queue-read.ts:51-57`, applied at `:179` BEFORE every arm) — ⛔ no `state_trustee_approved` — while
>    `-283` A1 lets an R9-routed claim complete an inspection THERE ⇒ its late key makes R9 wait for a District Admin who is ⛔ never told
>    (`-284` E1). `-280`'s recorded fact *"⛔ no late key arises there"* stops holding the moment this story ships.
> 4. ⭐ **The kind-label map is typed `satisfies Record<ApprovalWarningKind, string>`** (`apps/admin/src/modules/claim-verification/i18n-en.ts:136-139`)
>    ⇒ typecheck forces each new kind's words; the later surfaces render through the ONE shared block (`LaterApprovalWarnings.tsx` — used by
>    `EscalationPanel`, `PariwarClosureStrip`, `PendingCaseCard`, `R9CasePanel`), so the words reach them without per-surface edits (verify
>    at the re-pin). ⚠ **A SECOND typed map exists:** `NomineeDeclarationPanel.tsx:119` is `satisfies Record<ApprovalWarningKind,
>    (firstFiledAt) => string>` and the contract `nominee-declaration.ts:56` is `warnings: z.array(ApprovalWarningKind)` — the timeline's
>    per-VERSION warnings. Typecheck will demand timeline words for three kinds that are ⛔ never about a version ⇒ narrow the timeline's
>    type (and its contract field) to the VERSION kinds (`post_death_version`, `recent_nominee_change`), ⛔ never write version words for
>    them (Trap 7). ⚠ The block's heading reads *"Nominee-change warnings on this claim"* (`i18n-en.ts:135`) — it would mislabel the three new
>    kinds ⇒ reword it to cover every kind (e.g. *"Warnings on this claim"*).

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
| `-262` reading | the comparison is by **date**; the time is shown, compared with nothing; the register record is *matches / does not match / could not be checked online* | ⚠ OUR reading |
| `-281` reading | a mismatch about a certificate the claim no longer relies on ⛔ no longer warns (it stays shown); `could_not_check` is ⛔ never a warning | ⚠ OUR reading |
| `-264` reading | FQ13's check records the date of death on the fresh original against the District Admin's accepted date ⇒ a `certificate_check`'s printed date can raise the date kind | ⚠ OUR reading |
| `2026-10-06-283` A3 | that printed date warns only while its original is the CURRENT upload (GI17's currency) | ⚠ Author-commit (BigDev) — amends GI6 |

**⛔ Not covered by any ruling (stays open):** what an approver must weigh under a warning; which states' registers can be searched;
whether an unsearchable register is ever treated differently.

## ⭐ THE INVARIANTS
1. **The system refuses nothing** — every kind is a condition on the FORM of an approval (a reason + a note) or a WAIT; ⛔ never a denial.
2. **ONE rule, ONE derivation** — three kinds, three keys, three producers; the assertion is ⛔ never edited; both readers share the pure
   derivation.
3. **⛔ No decrypt in the warning module** — indexes and plaintext enums only.
4. **⛔ No staff surface learns a date it did not show before** — the warning carries a KIND, ⛔ never a date (the console's GI10 [a] display
   of the family's date is 6.26a's, behind its own decrypt).

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

## ⚖️ Decisions built here (defined in 6.26a's file; ✅ committed by `2026-10-06-282`)
- **GI6** `inspection_death_date_differs:<ground_inspection_id>` — an OWN completed assignment's `death_date_index` IS DISTINCT FROM the
  current accepted review's `accepted_date_index`, both non-null; ⛔ no accepted certificate ⇒ ⛔ no key; an inherited inspection ⇒ ⛔ no key.
  ⚠ **`-283` A3:** a row whose `death_date_source = 'original_certificate'` counts only while its `compared_certificate_upload_id` is the
  claim's CURRENT upload; a `family_statement` row is ⛔ not filtered.
- **GI7** the date kind ENTERS the wait; 6.23b's queue gains the completed-after-approval disjunct in BOTH candidate copies. ⚠ **`-284` E1:**
  the scan ALSO admits `state_trustee_approved` for the LATE-WARNING arm only, while the claim carries a live `routed_to_r9` routing row
  (6.26a's leaf, through its SQL fragment `liveRoutedToR9Exists` — ⛔ never a new copy); every other arm keeps `CORRECTABLE_SCAN_STATES`.
- **GI8** `register_check` required on ACCEPT, refused on REJECT; stored plaintext with `accepted_date_index` on the review row; ⛔ no new
  conjunct (the certificate conjunct already requires a current accepted review); ⛔ no certificate number stored.
- **GI17** `original_certificate_mismatch:<ground_inspection_id>` — an OWN completed assignment, verdict `does_not_match`, compared against the
  CURRENT upload. Enters the wait.
- **GI18** `register_check_mismatch:<review_id>` — the CURRENT accepted review's `register_check = 'does_not_match'`. Enters the wait.
- **GI10 [b]** the console shows *"differs from the certificate"*, the two mismatch warnings, and the register check (document section +
  history). **GI11 [b]** the three kinds' words wherever kinds render. **GI13 [b]** erasure sets the review's `accepted_date_index` NULL.
  **GI15 [b]** the certificate fixtures pass `register_check: 'matches'` + the index; a default fixture raises ⛔ no new warning.
  **GI16** ⛔ no new permission key, event, rule code or member-facing string.

## Acceptance Criteria

### AC0 — Governance and re-pin (Task 0)
6.26a is `done`; the author-commit (GI1–GI18) and `-281` are in `.decision-log.md`; the baseline is re-pinned to 6.26a's merge commit and
every code claim here re-derived; work is on `story/6-26b-death-facts-warnings-and-register-check`. ⛔ No code before.

### AC7 — The register check (GI8) *(the number is kept from v1 of Story 6.26 — 6.26a cites it)*
An ACCEPT without `register_check` → 409 `death_certificate_review.register_check_required`; a REJECT with one →
`…register_check_not_allowed`; an accept stores it and `accepted_date_index` (computed by the handler under `DEATH_DATE_INDEX_FIELD_CLASS`);
the console's document section and the review history show it in words; ⛔ no certificate number is stored; ⛔ nothing pre-selected in the
form.

### AC8 — The warnings (GI6, GI7, GI17, GI18)
**Given** an accepted certificate dated D:
- a completed full assignment whose family date ≠ D ⇒ `inspection_death_date_differs`; = D ⇒ ⛔ no key; ⛔ no accepted certificate ⇒ ⛔ no key;
  an inherited inspection ⇒ ⛔ no key; a `certificate_check` whose printed date ≠ D ⇒ the key too (6.26a GI5's `original_certificate` source)
  — but ⛔ no key once that original is ⛔ no longer the claim's current upload (`-283` A3; still shown);
- a completed assignment with verdict `does_not_match` compared against the CURRENT upload ⇒ `original_certificate_mismatch`; against a
  replaced upload ⇒ ⛔ no key (still shown);
- the current accepted review with `register_check = 'does_not_match'` ⇒ `register_check_mismatch`; `matches` / `could_not_check` ⇒ ⛔ no key;
  a superseded review's ⇒ ⛔ no key.
**And** the District Admin's approval while any of these shows needs a warning reason and a note (6.23a NW6 — unchanged code path), and
every later approver's too (6.23b). **Given** the District Admin approved and an assignment then completes with a differing date or a
`does_not_match` verdict ⇒ the final approval WAITS (`LateWarningReasonRequiredError`) until the District Admin's NW14 late reason covers
the new key, **and meanwhile the claim is listed in the District Admin's correction queue** (`lateWarningAwaitingReason: true`) — **including an R9-routed
claim in `state_trustee_approved`** (`-284` E1).
**And** both readers derive every kind from the SAME pure function (a parity test feeds the same rows to both); `APPROVAL_WARNING_KINDS`'
pin test and the contracts mirror are updated with a message citing GI6 / GI17 / GI18 and `-281`.

### AC9b — What the console and the later surfaces say (GI10 [b], GI11 [b])
Each kind has its own words (in the typed map); the console's assignment rows show *"differs from the certificate"* where the date key
exists and the mismatch where GI17's does; the register check shows on the document section. ⛔ No warning text carries a date.

### AC11b — Erasure (GI13 [b])
The anonymizer sets the review's `accepted_date_index` NULL beside its accepted-date scrub; the RTBF spec asserts it and its counts.

### AC12b — Nothing else moves (GI16)
Catalog version / key count unchanged; ⛔ no new event; ⛔ no new rule or reason code; ⛔ no member-facing file changes.

### AC13b — The proof
Every test below passes; GI15 [b]'s fixtures raise ⛔ no warning on any approve-path spec; `pnpm ci:local` green with `DATABASE_URL` at :5433; the migration applied to BOTH :5432 and :5433.

## Tasks / Subtasks
- [ ] **Task 0 (AC0)** — confirm 6.26a `done`; `git fetch origin`; re-pin; re-read 6.26a's merged columns, constant and the warning module; branch.
- [ ] **Task 1 — Migration (GI8)** — `0149_death-certificate-register-check.sql` (⚠ `0148` was taken by 6.26a's second code review — `0148_ground-inspection-photo-certificate-stamp`, 2026-10-07; re-read the journal at the re-pin): enum `death_certificate_register_check` (`matches`, `does_not_match`, `could_not_check`); `claim_death_certificate_reviews` + `register_check`, `accepted_date_index text`; a CHECK **`NOT VALID`** that a `rejected` review carries ⛔ neither. ⚠⚠ "an `accepted` review carries both" is ⛔ NOT a CHECK — it is the WRITER's guard (Task 2) + a test: Postgres re-checks a `NOT VALID` constraint on every UPDATE, and every pre-6.26b accepted review lacks both columns, while two existing UPDATEs rewrite those rows — the anonymizer's note scrub sets `noteCiphertext` on EVERY review of the deceased (`member/anonymize.ts:237-243`), and the review writer's supersession (`death-certificate-review-persist.ts:178`, `SET superseded_at`) — so such a CHECK would fail every erasure and make every pre-6.26b certificate un-re-reviewable; and GI13 [b] NULLs `accepted_date_index` on erasure anyway. ⚠⚠ **GRANTS and the immutability trigger:** `0122` grants `twt_app` only `SELECT, INSERT` plus `UPDATE ("superseded_at", "superseded_reason", "accepted_date_ciphertext", "note_ciphertext")` (*"⛔ No other column is writable"*) ⇒ add `GRANT UPDATE ("accepted_date_index") ON "claim_death_certificate_reviews" TO twt_app` (GI13 [b]'s erasure — without it every erasure of a deceased with a review fails **42501**); and add `register_check` to the `claim_death_certificate_reviews_reject_mutation` trigger's immutable-column list (`0122`, the `IS DISTINCT FROM` chain) — the list names columns, so a new column is mutable unless added (`accepted_date_index` stays OUT of it: the scrub NULLs it). Drizzle schema; journal; :5432 AND :5433.
- [ ] **Task 2 — Domain: the review writer (GI8)** — `recordDeathCertificateReview` takes `registerCheck` and `acceptedDateIndex`; the two refusals; `DeathCertificateReviewRefusedError`'s reason union widened.
- [ ] **Task 3 — Domain: the kinds (GI6, GI17, GI18)** (`claim/approval-warnings.ts`)
  - [ ] 3.1 `APPROVAL_WARNING_KINDS` += the three; the pin test; the contracts mirror + its lockstep test.
  - [ ] 3.2 Both statements (`readClaimApprovalWarnings` and the bulk twin) select the own completed assignments' `(ground_inspection_id, death_date_index, original_certificate_verdict, compared_certificate_upload_id)`, the current upload id, and the current accepted review's `(review_id, accepted_date_index, register_check)` — ⛔ no ciphertext; the SHARED pure derivation adds the keys; raw SQL with explicit aliases ([[project_epic6_drizzle_correlated_subquery_bug]]); the bulk twin keeps 6.23b's slicing.
- [ ] **Task 4 — Domain: the queue (GI7 + `-284` E1)** — `correction-queue-read.ts`: the state filter lives ONCE, in `candidateBatch`'s shared raw-SQL WHERE (`:176-216`, the `inArray(... CORRECTABLE_SCAN_STATES)` at `:179`) ⇒ it becomes `(state IN CORRECTABLE AND (existing arms)) OR (state = 'state_trustee_approved' AND ${liveRoutedToR9Exists(claims)} AND <the late-warning arm>)` — 6.26a's SQL fragment, ⛔ never a per-claim call (an N+1) and ⛔ never a new copy. ⭐ `qualifyingRows` needs ⛔ no change: it recomputes the return and check arms per row, and in `state_trustee_approved` neither can hold (a live routing row and a live `correction_return` never coexist — `TrusteeExclusionConflictError`; a name check is recordable only in the review window); the per-row closure read answers `no_live_return`; the queue UI offers a late-only row "open the claim" alone; the console offers NW14 there (`-280`). Then BOTH late-warning candidate copies gain *"or an own assignment of this claim `completed` with `completed_at > v.decided_at`"*; the *"ONLY that way"* comment amended (⛔ not deleted); and append to `deferred-work.md`'s item *"⚠ EA10's late-warning arm keys on a NEW determination"* that 6.26b added the completed-after-approval arm — its row-6-22 trigger still stands for the member-declare and innocence-finding sources.
  - ⚠ **Owed from 6.26a's second code review (2026-10-07, `deferred-work.md`):** both GI15 fixtures complete the inspection on `fixtureReviewNow(date)` = `max(now, date 12:00 IST)`, which can be AFTER the review's `decided_at` — GI7's `completed_at > v.decided_at` arm would then list EVERY fixture-seeded claim as a late warning. Seed the completion before the review, or pin the clock, before this arm lands (see Task 9).
- [ ] **Task 5 — Erasure (GI13 [b])** — `member/anonymize.ts`: `accepted_date_index` → NULL beside the existing accepted-date scrub (the Task 1 CHECK admits it); `packages/domain/tests/member/rtbf-anonymize.test.ts` pins + the live RTBF spec (erase a deceased whose claim has an accepted review written AFTER this migration — ⛔ no 23514, ⛔ no 42501). The immutability of `register_check` is proved in the RLS spec below — ⛔ not here (as `twt_app`, the missing column grant refuses it first, 42501).
- [ ] **Task 6 — API** — `claims.death-certificate.handlers.ts`: `register_check` + the index on accept (via `DEATH_DATE_INDEX_FIELD_CLASS` — ⛔ never a second literal); map the two refusals; the console's document section and assignment rows (GI10 [b]).
- [ ] **Task 7 — Contracts** — `death-certificate.ts` (`register_check` on the request + the history item); the console fields; the kind enum. Run contracts / mobile vitest ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 8 — Admin** — `DeathCertificateReviewControl.tsx`: the register-check choice on accept (⛔ nothing pre-selected); the review HISTORY line showing it in words (AC7); the three kind lines in `i18n-en.ts` (typecheck forces them) and the block heading reworded (Fact 4); `NomineeDeclarationPanel.tsx`'s map narrowed to version kinds (Fact 4 / Trap 7); the console's assignment-row and document-section words; `microcopy.yaml` check (it scans all `apps/admin/src/**`; `report` is banned).
- [ ] **Task 9 — Fixtures (GI15 [b]; AC13b)** — `seedAcceptedDeathCertificate` (domain) and `ensureAcceptedDeathCertificate` (API) pass `register_check: 'matches'` + the index. ⚠ **RED BY DESIGN, listed and AMENDED (⛔ never a weakened assertion):** a spec that re-reviews the SAME upload with a DIFFERENT date after 6.26a's fixture seeded the inspection — e.g. `packages/domain/tests/integration/claim/death-certificate.spec.ts:448-466` (fixture → `seedAcceptedDeathCertificate({ date: PAST })` → fixture again): ORIGINAL_SEEN still holds (same upload) so nothing re-seeds, the family date stays the fixture's TOMORROW, and a `family_statement` row is ⛔ not currency-filtered (A3) ⇒ `inspection_death_date_differs` fires and the approval needs a reason. Amend each to pass a warning reason or to seed with `inspection: 'skip'` and complete explicitly with the matching date; `grep` the domain and API suites for every re-review after the fixture. Then run the WHOLE suites — any OTHER red is a fixture gap.
  - ⚠ **Owed from 6.26a's second code review (2026-10-07):** fix the fixture completion clock named under Task 4 (`packages/domain/tests/integration/_helpers.ts` `fixtureReviewNow`; `apps/api/tests/integration/_nominee-name-check-fixture.ts`). ⭐ Also: an original's photo is now uploaded WITH the compared certificate's token (`2026-10-07-287` J1) — both fixtures already pass the current upload.
- [ ] **Task 10 — Tests** (below); red-check each load-bearing one.
- [ ] **Task 11 — Records** — `sprint-status.yaml`; File List; Change Log.

## Dev Notes

### Traps
1. **One field class** — the review index MUST use 6.26a's `DEATH_DATE_INDEX_FIELD_CLASS`; a second literal makes every claim "differ".
2. **The bulk reader drifts** — derive ONLY in the shared pure function; the parity test is the guard (6.23b's pattern).
3. **Both queue copies change together** — they exist so a fault in the enrichment read cannot drop a candidate.
4. **Currency** — GI17 compares against the CURRENT upload, GI18 reads the CURRENT accepted review; a test replaces each and sees the key go.
5. **Pre-6.26b accepted reviews have ⛔ no index** ⇒ ⛔ no date key on them (dev data only — ⛔ not in production); backfill ⛔ nothing
   ([[feedback_record_unattested_no_backfill]]). A re-review writes it.
6. **Fixture defaults raise nothing** — register `matches`, family date = accepted date (6.26a GI15), verdict `matches`; otherwise every
   approve-path spec gains a warning (the 6.23a Trap-5 lesson). ⚠ Except a spec that RE-REVIEWS with a different date after the fixture —
   red by design (Task 9).
7. **The timeline** (`NomineeDeclarationPanel`, `claims.nominee-declaration.handlers.ts`) classifies VERSIONS only — the three new kinds are ⛔ not
   version kinds; widening the shared enum must ⛔ not make the timeline emit them, and its typed map (`NomineeDeclarationPanel.tsx:119`) and
   contract field (`nominee-declaration.ts:56`) narrow to the version kinds (Fact 4).
8. **Currency for the printed date** (`-283` A3) — a test replaces the original after a `certificate_check` and sees the date key go.
9. **The review CHECK is narrow on purpose** (Task 1) — an UPDATE of any pre-6.26b accepted review must still pass it.

### Testing
- **Domain unit:** the derivation table of AC8 (each kind: present / absent / no accepted review / replaced upload / superseded review / inherited).
- **Domain live-DB (RLS):** `packages/domain/tests/integration/rls/claim-death-certificate-policy-regression.spec.ts` — the owner-role trigger test (after `RESET ROLE`, `:376-396`) gains a `register_check` leg; the 42501 test (`:330`) gains a `register_check` leg; *"twt_app CAN scrub"* (`:353`) gains `accepted_date_index`; the per-name CHECK test (`:208`) gains the new CHECK.
- **Domain live-DB:** `approval-warnings.spec.ts` + `approval-warnings-every-approver.spec.ts` (each kind blocks an un-reasoned approval at every approver; the late wait for GI6 and GI17); the bulk-vs-single parity; the queue (`listClaimsUnderCorrection` — tested in `approval-warnings-every-approver.spec.ts`, domain and API; ⛔ no separate correction-queue spec exists): the completed-after-approval listing, incl. an R9-routed claim in `state_trustee_approved` (listed) and the same claim with ⛔ no live routing row (⛔ not listed); `death-certificate.spec.ts` (AC7); the RTBF spec.
- **API live-DB:** `death-certificate.spec.ts` (register check codes); `verifier-console.spec.ts` / `-shape.spec.ts` (the new fields); one approval-route test showing the reason requirement for a new kind.
- **Admin:** `death-certificate-review.test.tsx` (the choice, nothing pre-selected); the kind lines on the console and on one later surface.
- **Gate:** `pnpm ci:local` ([[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]] before calling a flake).

### References
- `.decision-log.md`: `2026-10-06-284` E1 (amends GI7) · `2026-10-06-283` A1, A2, A3 (amends `-282`) · `-280` · `2026-10-06-281` · `2026-09-28-262` FQ8 B/C · `-264` FQ12 · `-277` Q2 C, Q3 B · `-278` NW1, NW6, NW14 · `-279` A4, A6 · `2026-10-06-282` (6.26's author-commit, GI1–GI18).
- `_bmad-output/implementation-artifacts/6-26-ground-inspection-before-approval-and-death-facts.md` (Story 6.26a — GI1–GI18, the record).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md`.
- Stories `6-23-post-death-nominee-change-warnings.md` (NW1–NW18), `6-23b-every-approver-gives-a-warning-reason.md` (EA2, EA7, EA10), `6-21-death-certificate-clear-date-rule.md` (the review writer).

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
