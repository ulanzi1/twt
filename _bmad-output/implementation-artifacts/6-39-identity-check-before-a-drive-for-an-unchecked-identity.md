---
baseline_commit: beae5116
---

<!--
PINNED: `beae5116` = `origin/main` (`git fetch origin` 2026-10-31, at authoring — Story 6.38 landed, PR #317). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/6-39-identity-check-before-a-drive-for-an-unchecked-identity`, branch
`story/6-39-identity-check-before-a-drive-for-an-unchecked-identity` (upstream UNSET — ⛔ it tracks `origin/main`; push with an explicit
refspec) ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — the main checkout was ⛔ switched; its local `main`
is behind `origin/main` at authoring and was ⛔ touched).
Every `apps/` / `packages/` claim below was traced at `beae5116` on 2026-10-31 by three read-only traces (claim → drive; KYC / fee / date
of death; staff surfaces / keys / numbers) and the load-bearing ones re-read by hand (`assertClaimApprovable`, the joining-fee confirm,
`death-certificate-approval.ts`, `CLAIM_REVIEW_WINDOW_STATES`). Re-locate by FUNCTION, ⛔ by line number — line numbers rot.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the BEHAVIOUR is
the Panel's and is RULED — `2026-10-31-424` Q1 (a) C (staff check an unchecked identity before any drive opens) and `2026-10-31-430` Q1 B
(staff compare the certificate's date of death with the fee date before any drive opens; ⛔ drive if the fee came after). WHERE the hold
sits, WHO checks, WHAT the record looks like and HOW the dates are compared are the AUTHOR's (DL — BigDev at Task 0.2). Two edges the ruled
words do ⛔ decide are the Panel's: PQ1 (a fee paid ON the day of death — `-430` reading: *"must put that edge, ⛔ assume it"*) and PQ2 (what
the family is told when ⛔ drive opens — `-430` reading: *"⛔ ruled"*). ONE non-blocking note at Task 0.3; each is built on the unchanged /
literal side until answered, and both must be ruled before members' claims go live (the row's own go-live condition).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or
the row key.

NUMBERS: ⛔ claimed by this file. At authoring the highest decision anywhere is `2026-10-31-430`; the highest ledger letter is `2026-10-31u`;
the highest migration is `0192_questionnaire-versions` (journal idx 192); the permission catalog is v56 with 74 keys; `CLAIM_EVENT_TYPES`
is pinned at 37. This create-story run's ledger line takes `2026-10-31v`. Task 0.4's decision entry, the migration, the catalog bump and
the event count are "the next free one" at the commit that takes each — READ LIVE then.

LETTERS: **G** = found facts (G1–G14); **DL** = build decisions (DL1–DL16 — PROPOSED, BigDev answers at Task 0.2); **PQ** = Panel
questions (PQ1, PQ2 — non-blocking); **TR** = traps (TR1–TR11); **AC1–AC13**.
-->

# Story 6.39: Before Any Drive Opens, Staff Check That the Person Who Died Is the Member — When Nobody Has Checked Their Identity — and That the Joining Fee Was Paid Before the Death

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled two staff checks that must happen **before any drive opens** for a death
> claim. **(a)** `2026-10-31-424` Q1 (a) C — when the member joined by **typing in their own identity details** and nobody has checked
> them since (the manual fallback: `self_declared`, `trusteeVerified` false — today EVERY member who joined that way, because the
> trustee-verification step is ⛔ built), the claim is FILED as usual, but staff check the identity *"from the death documents and the
> details on record"* first. **(b)** `2026-10-31-430` Q1 B — for **every** claim, whatever the identity route, staff compare the **date
> of death on the certificate** with the **date the joining fee was paid**, and ⛔ drive opens if the fee was paid after the death. This
> story builds ONE staff act — **the membership check** — recorded on the claim, by the District Admin who already accepts the death
> certificate (Story 6.21a), on the claim's verifier console. The SYSTEM computes the date comparison from the date the District Admin
> already entered when accepting the certificate and the joining-fee receipt (the staff member sees both dates and the result, and
> cannot override it); the STAFF MEMBER judges the identity. ONE new conjunct in the ONE approval gate every approval path already
> shares (`assertClaimApprovable`) makes a claim WAIT (a typed 409, ⛔ a denial) until a current check passes; the cycle-freeze commit,
> the last step before the pools spawn, re-checks it. A claim whose fee came after the death can never pass; staff end it through the
> existing District Admin denial, with a dedicated reason code. ⛔ New family-facing words (PQ2), ⛔ change to the door (Story 6.38),
> ⛔ change to any member's lifecycle.

**What already ships and this story REUSES — rebuild none of it:**
- `assertClaimApprovable` (`packages/domain/src/claim/nominee-name-check.ts`) — the ONE approval gate, called by all six approval sites
  (P1 `adjudicateClaim`, the final vote `voteOnFrozenClaim`, `finalizeR9Outcome`, both `decideEscalatedClosure` arms,
  `approveNoCorrectionNeeded`); its doc comment: *"whatever conjunct is added later — still refuses it"*, and the `-251` waived approve
  inherits every conjunct but the name check BY CONSTRUCTION (G1).
- Story 6.21a's death-certificate review — the District Admin types the certificate's date of death when accepting it
  (`claim_death_certificate_reviews.accepted_date_ciphertext`, `YYYY-MM-DD`, Tier-1), one LIVE review per claim, a re-review supersedes
  (G4); its approval conjunct `death-certificate-approval.ts` is the LEAF pattern this story's conjunct copies (G6).
- The 6.21a "the handler decrypts and compares, the domain writer re-asserts the id under the lock" pattern, and the no-comparison fence
  (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`) that forbids `decrypt` in the gate and writer modules (G5).
- The verifier console (`apps/admin/src/routes/VerifierConsoleRoute.tsx`) and `DeathCertificateReviewControl.tsx` — the closest template
  for a staff "check and record" form; the console packet's `memberRecord` already carries the deceased's decrypted KYC name and date of
  birth beside the certificate (G7).
- `istCalendarDate` / `formatCalendarDate` (`packages/domain/src/cycle-calendar/holiday-resolver.ts`) — an instant → India calendar date
  (G3; TR6 — check it is safe to import from the writer's module graph).
- The dedicated-deny-code precedent `post_death_nominee_change` (Story 6.20 D14 — a pgEnum value added by migration `0120`, valid for
  `denied` only, recognisable downstream) (G9).
- `groundInspectionApprovalState` and the cycle-freeze commit's skip-and-keep loop (`commitCycleFreeze`,
  `packages/domain/src/claim/state-trustee-decision-persist.ts`) — the pattern for a commit-time re-check (G10).

## Story

As **a family whose member has died, the District Admin who reviews their claim, and every member who will be asked to give**,
I want **staff to confirm, before any drive opens, that the person who died is the member — whenever nobody has checked the identity the
member typed in — and that the joining fee was paid before the death**,
so that **no drive raises money in the name of someone who was ⛔ the member, or who became a member only after they had died**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-31-424` Q1 (a) C | *"A claim for someone who typed in their own identity details, never verified since, is **filed** — but **the identity is checked first**, by staff, from the death documents and the details on record, **before any drive opens**."* Cost accepted: *"A new step for staff that does not exist today; it must be built before members' claims go live."* | Trustee-ratified (DR + KB) |
| `-424` "Our readings — ⛔ NOT RATIFIED" (Q1 (a)) | *"an identity nobody has checked" = a KYC record written by the manual route (`self_declared`) and never verified (`trusteeVerified` false), in any lifecycle state. The door stays OPEN for them … the check-before-a-drive step is a NEW build with its own row.* | reading — build on it |
| `-424` Q3 B | One general reason at the DOOR: *"the person was not a member of the Trust when they died"*. ⚠ Scoped to a refusal AT THE DOOR — a later moment is PQ2. | Trustee-ratified |
| `2026-10-31-430` Q1 B | *"**Before any drive opens**, staff compare the **date of death on the certificate** with the **date the fee was paid**, and ⛔ drive opens if the fee was paid after the death. This is added to the staff check that `-424` Q1 (a) C already requires before any drive."* Cost accepted: *"The family is stopped LATER — after filing and sending documents — which is harder news than a refusal at the door. Until it is built, A stands."* | Trustee-ratified (DR + KB) |
| `-430` "Our readings — ⛔ NOT RATIFIED" | (1) *"The date the fee was paid" = the joining-fee receipt's payment date (`vyawastha_shulk` receipt `paidAt`) … "After the death" = a payment DATE later than the certificate's date of death. ⚠ A fee paid ON the day of death is ⛔ decided by these words … Row `6-39`'s create-story must put that edge, ⛔ assume it.* (2) *Scope: every claim, whatever the identity route.* (3) *What the family is told when ⛔ drive opens: ⛔ ruled … Our reading is `-424` Q3 B's one general reason … which is now TRUE for this person.* (4) Q2's case (membership ended between death and report) is already refused at the door. | readings — (1) the fee date and (2) the scope are built on; the same-day edge is PQ1; (3) is PQ2 |
| `-430` Consequence 1 | the row GROWS by the date comparison; *"the same staff step before any drive, and it remains a go-live condition"*; the slug names only the identity half; ⛔ rename. | the row this story is |
| `2026-09-20-235` Y · `-236` BB | a certificate without a clear date is rejected; *"family will be asked to produce certificate with clear date without the claim being denied"* — the WAIT-not-deny shape this story's identity outcome reads by analogy (DL8). | Trustee-ratified (6.21a) |
| Niyamavali §2.1 | *"A person becomes a member only on **all** of: (a) registration; (b) identity verification (KYC); (c) payment of the Vyawastha Shulk; and (d) admission under these rules."* A rulebook, ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]) — read for the Policy-meaning check only. | ⛔ ratified |

## 📜 Policy meaning (AI-10-1)

**This story INTRODUCES one predicate that gates a family's access to a benefit — the drive — with two halves.**

*In the member's terms:* **"When you die, no drive opens for your family until the Trust's staff have checked two things: that the
joining fee was paid before the date of death on your death certificate — if it was paid after, no drive opens at all — and, if you
joined by typing in your own identity details and nobody has checked them since, that the person on the death certificate is you. If
the staff cannot yet confirm it is you, your family is asked for more, and the claim waits; it is not refused for that."**

**Checked against the Niyamavali** (the git-ignored copy in the main checkout, `docs/legal/niyamavali.md`, 2026-10-31):
- §2.1 (b) identity verification and (c) the fee are conditions of membership — CONSISTENT: the identity half checks (b) for a person
  whose (b) was never verified; the fee half checks that (c) came while they lived.
- ⛔ Clause speaks to WHEN the fee must be paid relative to a death, or to checking identity after death — SILENT; the Panel's
  rulings (`-424`, `-430`) are the instrument.
- ⚠ **A declared edge, ⛔ built either way silently:** a fee paid on the day of death (PQ1) — built as ⛔ "after" (the drive may open)
  until the Panel answers, because the ruled words refuse only a fee paid *after* the death and a certificate shows ⛔ time.
- ⚠ **What the member must also be told, because it is TRUE:** until row `3-13` builds verification during life, EVERY member who typed
  their details in is checked this way at death (G2), and a typed-in member who is later verified (3-13) is ⛔ checked again at death —
  the identity half reads the record at the time of the check.

## ⭐ THE INVARIANTS

**N1 — One check, one place, before any drive.** The membership check is ONE recorded staff act per claim (a LIVE row; a re-check
supersedes). It is read by ONE state function (`membershipCheckApprovalState`) used by the ONE approval conjunct inside
`assertClaimApprovable` — so all six approval sites, AND the `-251` waived approve, require it, by construction — and by the cycle-freeze
commit's skip-and-keep loop. ⛔ A second definition anywhere.

**N2 — Every claim needs it; the identity half only for an unchecked identity.** The fee half applies to every claim (`-430` reading 2).
The identity half applies iff the deceased's KYC record is ⛔ DigiLocker-verified AND ⛔ trustee-verified — `verification_strength <>
'aadhaar_kyc' AND trustee_verified = false` — or there is ⛔ KYC record at all (fail closed). The gate re-reads the KYC record each time
(cheap, plaintext columns), so a record the check called "not required" can never mask an unchecked identity.

**N3 — The system computes the date comparison; staff ⛔ type or override it.** The fee date is the IST calendar date of the joining
receipt's `paidAt`; the death date is the date the District Admin entered on the CURRENT accepted certificate review. The comparison is
`before_death` | `same_day` | `after_death`, computed by the API HANDLER (it decrypts — G5) and recorded on the check; the domain writer
re-asserts, under the claim lock, that the review it was computed against is still the live accepted one.

**N4 — Stale means re-check.** A check is CURRENT only while the live accepted certificate review it was computed against is still the
current one. A new review (re-reviewed / replaced certificate — a new date) makes it stale ⇒ the claim waits for a new check.

**N5 — Waiting, ⛔ denying.** Every refusal of the conjunct is a typed 409 the claim WAITS on — ⛔ a denial, ⛔ an event that changes
state. ⛔ The deny path is ever gated by it (the 6.18 asymmetry: *"a denial is never gated"*).

**N6 — `after_death` can never pass.** Only a new certificate review (a different date) can change it, through N4. Staff end the claim
through the existing P1 denial with the dedicated reason `fee_paid_after_death`, which the domain accepts ONLY while the live check says
`after_death`.

**N7 — ⛔ Tier-1 out of events, logs and audits.** The death date, the fee date and the staff note never appear in an event payload, a log
line or an audit context — ids, outcome codes and reason codes only (6.21a T10).

## Found facts (traced at `beae5116`)

- **G1 — The path to a drive, and where it can be held.** Claim states (`packages/domain/src/schema/claims.ts`): `intake_pending →
  intake_converged → documents_pending → verification_in_progress → verifier_review → verifier_approved (P1, District Admin,
  `claim.approve`) → state_trustee_freeze → state_trustee_approved (final vote / R9 / correction-closure arms) → approved
  (`commitCycleFreeze`, `cycle.freeze` + step-up) → settled`. After the commit, `postCommit`
  (`apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts`) enqueues `CYCLE_SPAWN_PARENT` (`cycle-spawn-queue.ts`) →
  `runCycleSpawnParent` / `planCycleSpawn` → `runCycleSpawnChild` / `spawnChildPool` (`packages/domain/src/pool/spawn.ts`). ⚠ **The spawn
  side reads ⛔ claim state at all** — every protection is upstream. `assertClaimApprovable` runs, in order: the accepted certificate →
  the name check (+ accounts, determination) → the ground inspection → (final only) the suspicion appeal wait, one-payment-per-death →
  the late-warning wait **LAST**. Its header: *"Every refusal above keeps its code and order"*. `commitCycleFreeze` re-checks, under its
  lock, state, R9 routing, the live return, the suspicion wait, `groundInspectionApprovalState(...).complete` and the payment-committed
  claim, and SKIPS (keeps `state_trustee_approved`) a claim that fails.
- **G2 — The identity record.** `member_kyc_profiles` (`packages/domain/src/schema/member_kyc_profiles.ts`, migration `0024`): ONE row per
  member (PK `member_id`), latest-wins (`upsertMemberKycProfile` — `onConflictDoUpdate`); `verification_strength` ∈ `aadhaar_kyc`
  (DigiLocker) | `self_declared` (manual) | `unverified`; `source` ∈ `digilocker` | `manual`; `trusteeVerified boolean NOT NULL DEFAULT
  false` — set `true` NOWHERE (only `false` is ever written: `kyc.handlers.ts` both routes, `profile-write.ts` default). Name + DOB + photo
  are Tier-1 ciphertext; `aadhaar_masked_id` NULL on the manual route; ⛔ address here (`member_addresses`). ⭐ Both KYC write routes are
  gated on `pending-kyc` (`/initiate`; `/manual` — the pre-transition state), and Story 6.38's door refuses a claim for a `pending-kyc`
  member ⇒ **once a claim exists, the deceased's KYC record cannot change** (inference from the two gates — Task 0.1 re-verifies; a
  future 3-13 that sets `trusteeVerified` only relaxes N2).
- **G3 — The joining fee.** `vyawastha_shulk_receipts` (`packages/domain/src/schema/vyawastha_shulk_receipts.ts`): `paid_at timestamptz NOT
  NULL DEFAULT now()` — the SERVER's instant when the member self-attests the UTR (⛔ the bank's time); SELECT / INSERT only (append-only).
  ⚠ A member may hold SEVERAL receipts: one per annual renewal, and the joining confirm ALWAYS commits its receipt in tx-1 even when the
  lock-in gate then fails (the member stays `pending-fee`; an idempotent re-confirm with the same `tr` reuses THAT receipt —
  `apps/api/src/modules/vyawastha-shulk/handlers.ts` confirm). ⛔ Column marks the joining receipt. The `pending-fee → lock-in` step
  emits `member.vyawastha_shulk_paid` with `{ from_state: 'pending-fee', to_state: 'lock-in', utr, amount_inr }` then
  `member.lock_in_entered`, in one transaction; it is the ONLY production producer of that transition. ⇒ the joining receipt is the one
  whose `(pariwar_id, utr)` equals that event's `utr` (DL3). ⛔ IST conversion anywhere on this path today; the IST helpers exist in
  `cycle-calendar/holiday-resolver.ts` (`istCalendarDate`, `formatCalendarDate`) and `member/workplace.ts` (`istToday`).
- **G4 — The date of death.** Three places, one of them authoritative:
  (i) `claim_death_certificate_reviews.accepted_date_ciphertext` (Tier-1, `YYYY-MM-DD`, ACCEPTED reviews only) +
  `accepted_date_index` (a keyed blind index — EQUALITY only, ⛔ ordering), written by the District Admin through
  `claims.death-certificate.handlers.ts` (`claim.review_death_certificate`); one LIVE review per claim (a unique index), a re-review
  supersedes (`re_reviewed` / `replaced`); reject reasons include `no_date_of_death` / `date_of_death_unclear` / `date_of_death_in_future`.
  ⭐ This is the date 6.20's determination already reads as the death date. (ii) `claim_ground_inspections.death_date_ciphertext`,
  `death_time_ciphertext`, `death_date_source` ∈ `family_statement` | `original_certificate` — the inspector's; `approval-warnings.ts`
  compares its index with (i)'s (`same` | `differs` | `not_indexed`). (iii) `claim_documents.date_of_death_ciphertext` — OCR, ALWAYS NULL in
  v1 ([[project_ocr_v1_always_empty]] — its "death date = filing date" half is stale except for the 90-day warning anchor). ⇒ (i) is "the
  date of death on the certificate". ⛔ Time of death on (i).
- **G5 — Who may decrypt.** 6.21a T5 / rule 7: ⛔ `decrypt` in the domain gate or writer modules; the no-comparison fence
  (`nominee-name-no-comparison-fence.test.ts`, `FENCED_FILES`, anti-vacuity floor 23 at 6.21a) enforces it and must be AMENDED, ⛔ weakened
  (T9). The HANDLER decrypts and compares; the writer re-asserts the review id under the claim lock (6.21a D8). The date is decrypted on
  demand and audited (6.21a T10); the console packet carries ⛔ decrypted date.
- **G6 — The leaf rule.** `death-certificate-approval.ts` header: *"A LEAF, AND IT MUST STAY ONE (T8)"* — `nominee-name-check.ts` imports
  it, and `nominee-determination-persist.ts` imports `nominee-name-check.ts` and evaluates a constant from it at load ⇒ a conjunct module
  that imports the determination writer (or anything that does) closes a runtime init cycle typecheck cannot see
  ([[project_type_only_import_cycle_trap]]). Allowed imports: schema tables, id types, `errors.ts`, import-free helpers.
- **G7 — The staff surface.** `/p/$pariwarId/claims/$claimCaseId/verify` → `VerifierConsoleRoute.tsx` (single-claim console; the 6.21a
  review sits on it, mounted only when the server-computed `viewer.canReview` is true). `DeathCertificateReviewControl.tsx`: accept /
  reject toggle (`aria-pressed`), radio reasons with nothing pre-selected, a required note, `role="alert"` for incomplete / error and
  `role="status"` for "recorded", `expected_live_review_id` optimistic concurrency, `mutateAsync(...).then(()=>true).catch(()=>false)`.
  `DocumentPreview.tsx` renders the certificate (`<img>` / PDF `<iframe>`) from a 300 s signed URL. `SignalsPanel.tsx` shows the
  deceased's name + DOB; `VerifierReviewPanel.tsx` puts the documents beside the member's record. The console packet's `memberRecord`
  (`claims.verifier-console.handlers.ts`, `claim.verify`) carries the deceased's decrypted KYC name + DOB. Data: `apps/admin/src/api/
  client.ts` (`apiFetch` → `ApiError(status, code, message, details)`), `apps/admin/src/api/hooks.ts` (`usePostDeathCertificateReview`
  invalidates the console packet; a stale 409 refetches).
- **G8 — Keys and roles.** `packages/domain/src/rbac/permissions.ts`: `PERMISSION_CATALOG_VERSION = 56`, 74 keys, `<resource>.<action>`
  (ONE dot). `district_admin` (ceiling `district`) holds `claim.verify`, `claim.review_death_certificate`, `claim.approve`;
  `super_admin` derives every key; claim keys are checked at `dimension: 'district'` against the deceased's posting district. Minting a
  key touches: `permissions.ts` (bump block, `SEED_PERMISSION_KEYS`, the version), `roles.ts` (a `permissionKey(...)` const + the grant),
  `packages/domain/tests/rbac/permissions.test.ts` (history comment, `toBe(56)`, `toHaveLength(74)`), `roles.test.ts` (a holder test),
  the handler's key constant. ⛔ Migration seeds keys.
- **G9 — The denial.** `VERIFIER_REASON_CODES` (pgEnum `verifier_reason_code`) + `REASON_CODE_OUTCOME_COMPAT` + `isReasonCodeValidForOutcome`
  — ONE source the contract's `superRefine` and the domain writer both consume. `post_death_nominee_change` is the dedicated deny-only
  precedent (6.20 D14, migration `0120`, which states the shipped denial *"is already appealable once through 6.16"*). `adjudicateClaim` (`verifier-decision-persist.ts`): *"⛔ A DENIAL IS NEVER GATED"*. A `denied`
  claim shows the family the "file appeal" affordance (`apps/mobile/lib/appeal-status.ts`) — ⛔ reason text found on the family's side
  (Task 0.1 re-verifies what the family sees on a denial, for PQ2).
- **G10 — The review window and the commit.** `CLAIM_REVIEW_WINDOW_STATES = ['verification_in_progress', 'verifier_review',
  'verifier_approved', 'reversed', 'state_trustee_freeze']` — a certificate can be re-reviewed AFTER P1 approval but ⛔ after the final
  vote ⇒ the FINAL gate is what catches a P1-time check made stale by a re-review; the commit re-check (DL6) is defence in depth.
- **G11 — Event and audit shapes.** `claim.death_certificate_reviewed` (`packages/events/src/registry.ts`) — an annotation, ⛔ state
  change, ids + codes only; claim event lockstep: `packages/domain/src/claim/events.ts`, `claim/state.ts` (the reducer's no-op arm),
  `CLAIM_EVENT_TYPES toHaveLength(37)` (`packages/domain/tests/claim/dpdpa-consent-events.test.ts`). Audit types in
  `apps/api/src/audit/audit-sink.ts` (`admin_claim.death_certificate_reviewed`, `…_review_rejected` with its reason code,
  `admin_death_certificate.history_read`) — written after the transaction closes, ⛔ the date or the note.
- **G12 — Today's members.** ⛔ Production emitter of `member.lock_in_expired` (rows `3-13` / `3-14`) ⇒ every paid member is in `lock-in`
  for good, and every typed-in member is `self_declared` + `trusteeVerified = false` for good ⇒ TODAY the identity half applies to every
  member who joined through the manual route, which is on by default (`kyc_manual_fallback`).
- **G13 — Story 6.38's door.** `resolveClaimIntakeDoor` (`claim/intake-door.ts`) refuses `erased` / `removed` / `left` / `not_joined`
  (`pending-kyc`) / `not_paid` (`pending-fee`) at the first report; its header: *"a typed-in identity nobody checked is FILED, in any state
  (its check before a drive is row `6-39-…`)"* — the one code pointer to this row (DL15 re-words it once built).
- **G14 — Numbers.** Highest migration `0192` (journal idx 192); highest decision `-430`; ledger `2026-10-31u`; catalog v56 / 74 keys;
  `CLAIM_EVENT_TYPES` 37.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL1 — ONE record: a NEW table `claim_membership_checks`** (migration `0194_claim-membership-checks.sql` after DL9's enum-value migration `0193` — or the next free pair),
  append-only with a supersede, copying `claim_death_certificate_reviews`' shape: `check_id uuid PK`, `pariwar_id`, `claim_case_id` (FK),
  `deceased_member_id`, `death_certificate_review_id` (FK — the accepted review the comparison was computed against; the currency token),
  `fee_receipt_id` (FK `vyawastha_shulk_receipts`), `fee_outcome` enum `before_death | same_day | after_death`, `identity_required boolean`
  (N2 at the time of the check), `identity_outcome` enum `not_required | confirmed | not_confirmed`, `identity_reason` (nullable — DL8's
  codes, set iff `not_confirmed`), `note_ciphertext` (Tier-1, `piiColumn`; REQUIRED when `not_confirmed`, optional otherwise),
  `decided_by_actor_id`, `decided_by_display`, `decided_at`, `superseded_at`, `superseded_reason`. ONE live row per claim (partial unique
  index `WHERE superseded_at IS NULL`); RLS by `pariwar_id`; grants SELECT / INSERT + UPDATE of the two `superseded_*` columns only (a
  one-way trigger as 6.21a's `0121`); ⛔ DELETE. The ⛔-stored dates are deliberate: the outcome is the fact the gate needs, and storing the
  fee or death date again would be a second copy of Tier-1-adjacent data. *Rejected:* columns on the certificate review (6.21a's one
  writer per table); an event-only record (the gate needs a cheap, lockable read).
- **DL2 — The comparison (N3).** A pure function `compareFeeDateWithDeathDate(paidAt: Date, deathDate: string /* YYYY-MM-DD */):
  'before_death' | 'same_day' | 'after_death'` — the fee date is `formatCalendarDate(istCalendarDate(paidAt))` (G3; India time, because a
  certificate's date is a local date); string compare of two `YYYY-MM-DD`. It lives in an import-free module the handler calls (⛔ in the
  gate leaf). The HANDLER decrypts the CURRENT accepted review's date, reads the joining receipt, computes, and passes the outcome + the
  review id + the receipt id to the writer; the writer, under the claim lock, re-asserts the review is still the live accepted one and the
  receipt is still the joining one (DL3) — else 409 `claim.membership_check_stale` (the console refetches). ⛔ Staff input for either date.
- **DL3 — The joining receipt.** The receipt whose `(pariwar_id, utr)` equals the `utr` of the deceased's ONE `member.vyawastha_shulk_paid`
  event with `from_state = 'pending-fee'` (read via the member's event stream — ⛔ "the earliest receipt": a gate-failed attempt or a
  renewal would be wrong). ⛔ Such event, or ⛔ matching receipt ⇒ the check CANNOT be recorded: 409 `claim.membership_check_no_fee_receipt`
  and the console says so (fail closed — the claim waits; a staff escalation, ⛔ a guess). ⚠ The edge `-430` reading 1 flags — a receipt
  committed BEFORE the death whose lock-in step completed AFTER it (a gate-failed confirm re-tried) — compares the RECEIPT's `paidAt`, as
  the ruled words say ("the date the fee was paid"), so the drive may open; recorded, ⛔ a Panel question (the words decide it).
- **DL4 — The identity half's trigger (N2).** `identity_required = (no KYC row) OR (verification_strength <> 'aadhaar_kyc' AND
  trusteeVerified = false)` — so `self_declared` AND `unverified` both count as unchecked. Read by the handler (to show and record) AND by
  the gate's state function (to enforce — plaintext columns, ⛔ decrypt).
- **DL5 — The gate (N1, N5).** NEW leaf `packages/domain/src/claim/membership-check-approval.ts`: `membershipCheckApprovalState(db,
  pariwarId, claimCaseId, deceasedMemberId)` → `{ passed: true } | { passed: false; reason: 'not_checked' | 'stale' |
  'identity_not_confirmed' | 'fee_after_death' }` (precedence: `not_checked` → `stale` → `fee_after_death` → `identity_not_confirmed`; an
  identity required by TODAY's KYC row but recorded `not_required` ⇒ `stale`), and `assertMembershipCheckedForApproval(...)` throwing
  `MembershipCheckRequiredError(reason)`. Called inside `assertClaimApprovable` AFTER the ground inspection and BEFORE the final-only
  conjuncts (so every existing refusal keeps its order — the late-warning wait stays LAST), at BOTH steps (`district_admin` and `final`);
  ⛔ waived by `nameCheck: 'waived_251'`. API: 409 `claim.membership_check_required`, `details.reason` = the reason (staff routes only —
  every caller of the gate is a staff route). Imports per G6 only; it reads `claim_membership_checks`, `member_kyc_profiles` and the
  live accepted review id (reuse `death-certificate-approval.ts`'s snapshot read — it is a leaf). ⛔ `decrypt` (G5 — added to
  `FENCED_FILES`, floor raised).
- **DL6 — The commit re-check (G10).** `commitCycleFreeze`'s skip-and-keep loop also skips a claim whose
  `membershipCheckApprovalState(...).passed` is false, beside the ground-inspection skip — the last read before the pools spawn. Defence in
  depth (the review window closes at the final vote), the same reason the ground-inspection skip exists; the skipped claim stays
  `state_trustee_approved` and the cycle-freeze page shows why (DL12).
- **DL7 — Who checks: a NEW key `claim.check_membership`**, granted to `district_admin` (ceiling `district`, checked at `dimension:
  'district'` on the deceased's posting district — the same person who accepts the certificate), `super_admin` by derivation. Catalog
  56 → 57, 74 → 75 keys. The checker MAY be the P1 approver (as with the certificate review). *Rejected:* reusing
  `claim.review_death_certificate` (a separate act deserves its own grant and audit, and a later separation of duties needs it); a
  Pariwar-level role (the evidence — the certificate, the inspection — sits with the district). ⚠ "Staff" is the Panel's word; WHICH staff
  is the author's within it — a MATCH, ⛔ a narrowing.
- **DL8 — The identity judgment.** The staff member sees, side by side: the CURRENT certificate (`DocumentPreview`), its accepted date,
  and the details on record — the KYC name + date of birth (decrypted, audited — the packet's `memberRecord`), the KYC route (`typed in,
  never checked`), the member's address and posting (the latest of each). They choose `confirmed` or `not_confirmed`; `not_confirmed` needs
  a reason — `name_differs` | `age_or_birth_date_differs` | `document_unreadable` | `other` — and a note. `not_confirmed` makes the claim
  WAIT (N5) — the family is asked for further documents by staff, as for an unclear certificate (`-236` BB, by analogy); a later check
  SUPERSEDES it. ⛔ It denies: the existing P1 deny remains available, unchanged. ⚠ That a failed identity check WAITS rather than ends
  the claim is the author's reading of *"the identity is checked first … before any drive opens"* (the ruling holds the drive; it says ⛔
  more) — the unchanged side; challenge ⇒ the Panel.
- **DL9 — The fee half's outcome (N6).** `after_death` ⇒ the gate refuses for good (until a new certificate review — N4). NEW verifier
  reason code `fee_paid_after_death` (deny ONLY — `REASON_CODE_OUTCOME_COMPAT` in `claim/verifier-decision.ts` + its contracts mirror, pinned by
  the lockstep test; the pgEnum value in its OWN hand-authored migration `ALTER TYPE "verifier_reason_code" ADD VALUE IF NOT EXISTS
  'fee_paid_after_death'` — `0120`'s exact form: *"a newly-added enum value cannot be USED in the transaction that added it"*). The domain
  denial writer accepts it ONLY while the live check says `after_death` (409 `claim.fee_paid_after_death_not_shown` otherwise). `same_day`
  passes (PQ1 — the literal side) and is SHOWN to staff as "paid on the day of death". `before_death` passes.
- **DL10 — Routes.** `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/membership-check` (`claim.check_membership`): the preview — the
  live check (if any), the computed comparison for the CURRENT review (both dates, decrypted, AUDITED `admin_claim.membership_check_read`),
  `identity_required`, the KYC details on record, `expected_live_review_id`. `POST …/membership-check` (`claim.check_membership`):
  `{ expected_live_review_id, identity_outcome, identity_reason?, note? }` → the handler recomputes (⛔ trusts the client's dates — it
  sends none) and writes. Zod contracts in `packages/contracts/src/claims/` (`.strict()`); the reason / outcome tuples DOMAIN-owned,
  contracts mirrors them with a lockstep test (the 6.38 DL6 pattern). Claim-state guard: the same window as the certificate review
  (`CLAIM_REVIEW_WINDOW_STATES`) — a check outside it is 409 `claim.membership_check_window_closed`.
- **DL11 — Event + audits (N7).** NEW event `claim.membership_checked` (annotation, ⛔ state change — the reducer's no-op arm; payload:
  `check_id`, `death_certificate_review_id`, `fee_outcome`, `identity_required`, `identity_outcome`, `identity_reason`), lockstep files
  per G11 (`CLAIM_EVENT_TYPES` 37 → 38). Audits: `admin_claim.membership_checked`, `admin_claim.membership_check_rejected` (every refusal,
  with its code), `admin_claim.membership_check_read`. ⛔ Date, ⛔ note, ⛔ name in any of them.
- **DL12 — Staff words.** The verifier console: a NEW `MembershipCheckControl.tsx` beside `DeathCertificateReviewControl` (mounted iff the
  server's `viewer.canCheckMembership`; disabled with a line until a certificate is accepted). The approve-blocked line, the
  cycle-freeze page and the R9 case panel map `claim.membership_check_required` + each reason to a copy key (the 6.21a mappings in
  `VerifierConsoleRoute` / `CycleFreezePage` / `R9CasePanel`; the `refusalKey()` pattern — code → key, generic fallback, ⛔ a raw code).
  Proposed English (BigDev approves at 0.2): *"Membership check needed before approval."* · *"The certificate changed since the
  membership check — check again."* · *"The person's identity has not been confirmed."* · *"The joining fee was paid after the date of
  death on the certificate. No drive can open for this claim — deny it with the reason "Fee paid after the death"."* · fee lines: *"Paid
  before the death"* / *"Paid on the day of death"* / *"Paid after the death"* · *"Typed in at joining, never checked"* /
  *"Checked through DigiLocker"*. Follow `DeathCertificateReviewControl`'s copy location and language handling (TR9).
- **DL13 — Fixtures (TR1).** A test helper `seedPassedMembershipCheck(tx, { pariwarId, claimCaseId, deceasedMemberId, reviewId })` that
  writes a RAW live row (`fee_outcome 'before_death'`, `identity_outcome 'confirmed'`) — the gate reads only the row, the live review id
  and the KYC row — added wherever an existing test seeds an accepted certificate for an approval. ⛔ Assertion weakened, ⛔ bypass flag,
  ⛔ env switch (the 6.38 DL14 rule).
- **DL14 — RTBF / anonymize.** `note_ciphertext` is Tier-1: follow EXACTLY what 6.21a did for `claim_death_certificate_reviews.note_*`
  in `member/anonymize.ts` and the append-only guard ([[project_append_only_guard_names_erasure_columns]] — a new scrubbed column ⇒
  REPLACE the guard function, ⛔ only a GRANT). (Erasure is refused while a death report stands — 6.38 — so this binds only after a
  `member_found_innocent` release.)
- **DL15 — Stale comments.** `intake-door.ts`'s header pointer (G13) and the `-424` / `-430` "row 6-39" pointers in code comments are
  re-worded to name the built conjunct; ⛔ behaviour.
- **DL16 — ⛔ Scope creep.** ⛔ Family-facing words (PQ2); ⛔ helpline change; ⛔ change to the door or to any member lifecycle state;
  ⛔ `trusteeVerified` written (row `3-13`); ⛔ backfill (⛔ member uses the system); ⛔ automatic denial.

## Panel questions — PROPOSED (one non-blocking note at Task 0.3)

- **PQ1 — A joining fee paid ON the day of death.** A certificate gives a date, ⛔ a time; the fee's time is known. The ruled words stop a
  drive only when the fee was paid *after* the death. Options for the note: **A** — the same day counts as before (the drive may open);
  cost: a fee paid hours AFTER a death, the same day, opens a drive. **B** — the same day counts as after (⛔ drive); cost: a member who
  paid in the morning and died that evening — a real member — gets ⛔ drive. **C** — staff use a time of death when one was recorded from
  the ORIGINAL certificate at the ground inspection, else A; cost: rests on a time few certificates carry, and more staff work. Suggest
  **A** (the literal words; the case needs the family to pay from the dead member's phone before filing, the same day). **Built: A**
  (`same_day` passes, shown to staff) — a declared side; B flips ONE arm of DL5's precedence; C is a follow-up.
- **PQ2 — What the family is told when ⛔ drive opens because the fee came after the death.** `-424` Q3 B ruled the words AT THE DOOR;
  this is a later moment, after filing and documents, so using them here WIDENS that ruling (a disclosure — §0). Today a denied claim
  shows the family the appeal affordance (G9 — Task 0.1 confirms what else). Options: **A** — as today: the denial, ⛔ reason; cost: the
  family learns nothing after sending documents. **B** — the one general reason, *"the person was not a member of the Trust when they
  died"* (TRUE for this person — `-430` reading 3); cost: a small disclosure, the same as at the door. **C** — the specific reason (*"the
  joining fee was paid after the date of death on the certificate"*); cost: tells the family exactly what to dispute. Suggest **B**.
  **Built: A** (⛔ new family words) until ruled; B or C is a follow-up task on this row if ruled before Task 6, else a deferred item. ⚠
  The note also TELLS (⛔ asks) the Panel: an appeal of that denial follows the existing appeal process (a filed claim's denial already
  has one — unchanged), and a failed IDENTITY check waits (DL8) — so they can object.

## Acceptance Criteria

1. **AC1 — The record (DL1).** Two migrations: the `fee_paid_after_death` enum value ALONE, then `claim_membership_checks` with RLS, the grants,
   the one-way trigger and the one-live-row index; the drizzle schema + journal agree ([[project_live_db_test_gotchas]] — ⛔ regenerate an
   applied migration). Live-DB: a second live row for a claim ⇒ 23505; UPDATE of any column but `superseded_*` ⇒ refused; DELETE ⇒
   refused; another Pariwar's session sees ⛔ row.
2. **AC2 — The comparison (DL2).** Unit: `compareFeeDateWithDeathDate` at the IST boundaries — `paidAt` 18:29:59Z and 18:30:00Z on the
   day before / of / after the death date ⇒ the exact outcome each; a malformed date string throws.
3. **AC3 — The joining receipt (DL3).** Live-DB: a member with a gate-failed receipt, then a renewal receipt, and the joining event's UTR
   on a third ⇒ the third is chosen; ⛔ event ⇒ 409 `claim.membership_check_no_fee_receipt` and ⛔ row.
4. **AC4 — Recording a check (DL2, DL4, DL8, DL10).** Live-DB through the API: a DigiLocker-verified deceased ⇒ `identity_required false`,
   `identity_outcome` must be `not_required` (any other ⇒ 400); a `self_declared` (and an `unverified`, and a no-KYC-row) deceased ⇒
   `identity_required true` and `not_required` ⇒ 400; `not_confirmed` without reason or note ⇒ 400; a stale `expected_live_review_id` ⇒
   409 `claim.membership_check_stale` and ⛔ row; ⛔ accepted certificate ⇒ 409 (the console's disabled state); outside the review window ⇒
   409 `claim.membership_check_window_closed`; a second check supersedes the first (`superseded_reason`), ONE live row after.
5. **AC5 — The gate at every approval site (DL5, N1).** Live-DB: P1 approve, the final vote, R9 finalize, both `decideEscalatedClosure`
   arms, `approveNoCorrectionNeeded` AND the `-251` waived approve each ⇒ 409 `claim.membership_check_required` with ⛔ check; each
   passes with a passing check. One site per reason (`not_checked`, `stale` — a re-reviewed certificate after the check,
   `identity_not_confirmed`, `fee_after_death`); a check recorded `not_required` whose deceased's KYC row is then made `self_declared` by a
   raw write ⇒ `stale`. The existing refusals keep their order (a claim missing BOTH the certificate and the check ⇒ the certificate's
   409, as today).
6. **AC6 — The deny path is never gated (N5, DL9).** A P1 DENY with ⛔ check succeeds; `fee_paid_after_death` is accepted only while the
   live check says `after_death` (else 409 `claim.fee_paid_after_death_not_shown`); it is refused for `approved` by the contract AND the
   domain (`REASON_CODE_OUTCOME_COMPAT`).
7. **AC7 — The commit (DL6).** Live-DB: a `state_trustee_approved` claim whose check is made stale by a raw supersede is SKIPPED by
   `commitCycleFreeze` (stays `state_trustee_approved`, ⛔ `claim.approved`, ⛔ spawn trigger for it) while a passing sibling commits.
8. **AC8 — Same day (PQ1 — built A).** A check with `fee_outcome 'same_day'` passes the gate; the preview and the console say "Paid on the
   day of death". ONE test names PQ1 so a ruling of B flips it visibly.
9. **AC9 — Events and audits (DL11, N7).** `claim.membership_checked` appended per write, the claim state unchanged; `CLAIM_EVENT_TYPES`
   38; every audit line + the event payload contain ⛔ date, ⛔ note, ⛔ name (asserted on the serialized payloads, with a planted value).
10. **AC10 — Who (DL7).** Catalog v57 / 75 keys; `district_admin` holds `claim.check_membership` at `district`; a `verifier`, a
    `pariwar_admin` and a `helpline_operator` ⇒ 403 on both routes; a district admin of ANOTHER district ⇒ 403.
11. **AC11 — The fences (G5, G6).** `membership-check-approval.ts` and the writer are in `FENCED_FILES` (floor raised) and contain ⛔
    `decrypt`; a planted `decrypt` turns the fence red. The leaf imports only what G6 allows (a source test, as 6.21a's).
12. **AC12 — The staff surface (DL12).** Admin component tests: the control renders the two dates, the fee line, the KYC route and the
    certificate; `confirmed` / `not_confirmed` (radios, nothing pre-selected; reason + note required for `not_confirmed`); `role="alert"`
    / `role="status"` lines; a stale 409 refetches; hidden when `viewer.canCheckMembership` is false. The approve-blocked line, the
    cycle-freeze page and the R9 panel map each reason to its copy (⛔ raw code). A real-browser pass of the console (the 6.33 AC11 route —
    [[project_admin_browser_pass_launcher]]; [[project_agent_chrome_cannot_reach_localhost]] — probe once) — or recorded un-attested
    ([[feedback_record_unattested_no_backfill]]).
13. **AC13 — The gate stays green (DL13).** Every existing approval-path test passes with ⛔ assertion changed, its fixture given a passing
    check through `seedPassedMembershipCheck`; `ci:local` 36 / 36 on a fresh DB (the story's own port —
    [[project_prepush_hook_inherits_5432]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [ ] 0.1 `git fetch origin`; confirm `beae5116` is an ancestor of HEAD; `git diff --name-only beae5116 origin/main -- apps packages` —
        re-derive G1–G14 if anything moved. Re-verify: G2's "the KYC record cannot change once a claim exists" (every writer of
        `member_kyc_profiles`, every state gate); G9's family-facing denial surface (what the family sees on `denied`, for PQ2); G10's
        window. Check `ListAgents` + the branch before every commit ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [ ] 0.2 Put DL1–DL16 to BigDev (DL12's English verbatim). Record the answers here.
  - [ ] 0.3 Draft ONE routing note from the template (by path, ⛔ copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-39-same-day-and-family-told.md` — PQ1, PQ2 (+ the told
        lines on the appeal and on DL8's wait); plain-English question first, THE ONE FACT, options with an honest cost on each, evidence
        LAST; E4 commands run. Status: WRITTEN, ⛔ sent (BigDev sends). Non-blocking for build and merge; both ruled before go-live.
  - [ ] 0.4 Decision entry (AUTHOR-COMMIT, the next free number): DL1–DL16 as answered; cites `-424` Q1 (a) C and `-430` Q1 B; names PQ1 /
        PQ2 as open; ⛔ supersedes a ratified entry. Committed ALONE, first.
  - [ ] 0.5 Records: `deferred-work.md` — PQ1 / PQ2 open (trigger: the ruling); a row-`3-13` dated comment in `sprint-status.yaml` (a
        member verified in life by 3-13 skips the identity half — N2 reads `trusteeVerified`); the roster go-live row for "members'
        claims go live" (if one exists — grep `docs/launch-gate-inventory/inventory-roster.md`) gains a pointer to this row's PQ1 / PQ2.
  - [ ] 0.6 Ledger line + row `ready-for-dev → in-progress` ([[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [ ] **Task 1 — The record (AC1)**
  - [ ] 1.1 Two migrations (the next free pair; READ the journal LIVE — [[project_sibling_migration_when_order_shared_db]]): the enum
        value ALONE (`0120`'s form, DL9), then the table + `packages/domain/src/schema/claim_membership_checks.ts` + schema barrel.
  - [ ] 1.2 RLS / grant / trigger / index live-DB tests (AC1) — copy the 6.21a reviews table's spec.
- [ ] **Task 2 — The comparison and the joining receipt (AC2, AC3)**
  - [ ] 2.1 `compareFeeDateWithDeathDate` in an import-free module (DL2) + unit tests.
  - [ ] 2.2 `readJoiningFeeReceipt(db, pariwarId, memberId)` (DL3) + live-DB tests.
- [ ] **Task 3 — The writer, routes, event, audits (AC4, AC9, AC10)**
  - [ ] 3.1 Domain vocabulary (outcomes, reasons) + contracts mirror + lockstep test; errors in `claim/errors.ts`.
  - [ ] 3.2 Writer `recordMembershipCheck` (claim lock; re-assert the live review id and the receipt; supersede; event) — ⛔ `decrypt`.
  - [ ] 3.3 Event `claim.membership_checked` (registry, `claim/events.ts`, reducer no-op arm, count 38).
  - [ ] 3.4 The key `claim.check_membership` (G8's five places; READ LIVE the version at the commit).
  - [ ] 3.5 Handlers + routes (GET preview — decrypt + audit; POST) in `apps/api/src/modules/claims/` beside
        `claims.death-certificate.handlers.ts`; audit types in `audit-sink.ts`; `viewer.canCheckMembership` on the console packet.
- [ ] **Task 4 — The gate (AC5, AC6, AC8, AC11)**
  - [ ] 4.1 `membership-check-approval.ts` (DL5) — the state function + the assert; wire into `assertClaimApprovable` at DL5's position;
        map the error to 409 at every caller's translation (find them by the certificate error's translation — 6.21a D7).
  - [ ] 4.2 `fee_paid_after_death` (DL9): enum + compat map + the domain guard in `adjudicateClaim`'s deny arm.
  - [ ] 4.3 Fence amendment (AC11).
  - [ ] 4.4 Fixtures (DL13) — grep every test that seeds an accepted certificate and then approves; add the helper call; run the
        approval-path specs; ⛔ assertion changed.
- [ ] **Task 5 — The commit re-check (AC7)** — DL6 in `commitCycleFreeze` + live-DB test.
- [ ] **Task 6 — The staff surface (AC12)** — client + hooks (copy `postDeathCertificateReview` / `usePostDeathCertificateReview`);
      `MembershipCheckControl.tsx`; the three mappings; component tests; the browser pass (or un-attested).
- [ ] **Task 7 — Close** — DL15 comments; DL14 anonymize; `ci:local` on the story's own DB; Completion Notes, File List, Change Log;
      Status → review.

## Dev Notes

### Traps

- **TR1 — The fixture blast radius.** Adding a conjunct to `assertClaimApprovable` turns RED every existing test that approves a claim
  (P1, final vote, R9, D27, `-251`, the cycle-freeze commit and everything downstream that seeds an `approved` claim THROUGH the
  approval paths). 6.21a named its blast radius file by file (its D12) — do the same in Task 4.4 BEFORE wiring, and fix by seeding a
  passing check (DL13), ⛔ by weakening.
- **TR2 — Order.** Insert AFTER the ground inspection, BEFORE the final-only conjuncts; the late-warning wait stays LAST. A test missing
  two conjuncts must still see the earlier one's 409 (AC5).
- **TR3 — ⛔ decrypt in the domain** (G5). The preview handler decrypts; the writer and the gate never do. Envelope ciphertext never
  compares equal; the blind index gives EQUALITY only — ordering needs the plaintext, in the handler.
- **TR4 — The leaf** (G6). `membership-check-approval.ts` must not import the determination writer or anything that does — check with the
  runtime import, ⛔ only typecheck ([[project_type_only_import_cycle_trap]]).
- **TR5 — The joining receipt is ⛔ the earliest receipt** (G3, DL3).
- **TR6 — IST.** `paidAt` is UTC in the DB; the certificate date is a local date. Use the existing helper; check `holiday-resolver.ts`'s
  import graph is safe for the module you put the comparison in (it may pull calendar tables) — if not, a small import-free helper with
  its own boundary tests.
- **TR7 — Two dates on the claim.** The inspector's death date (G4 (ii)) is ⛔ "the date on the certificate" — the ruling says the
  certificate; use the ACCEPTED review's date only.
- **TR8 — Bodyless POST.** Tests post `'{}'` where a body is optional ([[project_fastify_empty_json_body_400]]); this POST has a body.
- **TR9 — Admin copy.** Follow `DeathCertificateReviewControl`'s copy location; if the admin console carries Hindi, the Hindi is
  HUMAN-REVIEWED by BigDev before merge ([[feedback_stub_must_call_not_transcribe]] — a real-`t()` leg for every new key).
- **TR10 — `ALTER TYPE … ADD VALUE` gets its OWN migration file** (`0120` / the `0040` posture) — a value cannot be used in the
  transaction that added it; a fresh-DB `ci:local` proves the pair
  ([[project_known_livedb_test_failures]] — own container, DB named `twt_dev`).
- **TR11 — Every `git push` needs the story's `DATABASE_URL`** prefixed ([[project_prepush_hook_inherits_5432]]).

### What this story does ⛔ do

⛔ Change the intake door (6.38) or any lifecycle state; ⛔ write `trusteeVerified` (3-13); ⛔ emit `lock_in_expired` (3-14); ⛔ new
family-facing or helpline words (PQ2); ⛔ deny automatically; ⛔ store a second copy of either date; ⛔ make the fee comparison overridable.

### Project Structure Notes

- Domain: `packages/domain/src/claim/membership-check-approval.ts` (leaf), `claim/membership-check-persist.ts` (writer),
  `claim/membership-check-read.ts` (the joining receipt + KYC route reads, ⛔ decrypt), `claim/fee-death-date.ts` (DL2, import-free),
  `schema/claim_membership_checks.ts`, `migrations/0193_…sql` (enum value) + `0194_…sql` (table) — or the next free pair.
- API: `apps/api/src/modules/claims/claims.membership-check.{handlers,routes}.ts`.
- Contracts: `packages/contracts/src/claims/membership-check.ts` + `index.ts` export.
- Admin: `apps/admin/src/modules/claim-verification/MembershipCheckControl.tsx`, `api/client.ts`, `api/hooks.ts`,
  `routes/VerifierConsoleRoute.tsx`, the cycle-freeze and R9 mappings.

### References

- `.decision-log.md` — `2026-10-31-424` (Q1 (a) C, Q3 B, readings), `2026-10-31-430` (Q1 B, readings, Consequence 1), `-425` (6.38's DLs).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-38-door-and-after-death.md`,
  `…-2026-10-31-6-38-paid-after-death.md` (the questions as put).
- `_bmad-output/implementation-artifacts/6-21-death-certificate-clear-date-rule.md` (6.21a — D7, D8, T5, T8, T9, T10, D12).
- `_bmad-output/implementation-artifacts/6-38-death-locks-erasure-and-non-member-claims-refused.md` (the door; DL6 / DL14 patterns).
- `sprint-status.yaml` rows `6-39-…`, `3-13-…`, `3-14-…`; `deferred-work.md` round-4 item A of 6.38 (DISCHARGED into this row).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-10-31 — Created by `bmad-create-story 6.39`: ultimate context engine analysis completed — comprehensive developer guide created.
  Three read-only traces at `beae5116` + a hand re-read. DL1–DL16 PROPOSED; PQ1 / PQ2 PROPOSED (non-blocking).

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-31 | Created (`bmad-create-story 6.39`) on `story/6-39-identity-check-before-a-drive-for-an-unchecked-identity`, pinned `beae5116`. |
