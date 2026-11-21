---
baseline_commit: 9f5e2c84
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
RE-VERIFIED 2026-11-21 (v1.3, `bmad-create-story validate 6.39`, a DRIFT pass) at `origin/main` `9f5e2c84` — 345 commits past the pin
(Stories 6.22, 12.1, 12.2, 11b.5a, 13.x, 14.3 and others landed): two read-only traces, the load-bearing numbers re-read by hand. Every
G1–G17 BEHAVIOUR holds (`git diff beae5116 9f5e2c84` is EMPTY on the gate, the commit loop, both deny vocabularies, the review window, the
claim states, the KYC writers, the receipt + its event, the certificate review, the fence test, the four translators); the NUMBERS, TR1's
list, DL14's premise and G15's counts had moved and are corrected in place. The branch was then REBASED onto `9f5e2c84` (records only —
this branch carries ⛔ code).

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the BEHAVIOUR is
the Panel's and is RULED — `2026-10-31-424` Q1 (a) C (staff check an unchecked identity before any drive opens) and `2026-10-31-430` Q1 B
(staff compare the certificate's date of death with the fee date before any drive opens; ⛔ drive if the fee came after). WHERE the hold
sits, WHO checks, WHAT the record looks like and HOW the dates are compared are the AUTHOR's (DL — BigDev at Task 0.2). Two edges the ruled
words do ⛔ decide are the Panel's: PQ1 (what "the date the fee was paid" means at its two edges — a fee paid ON the day of death, `-430`
reading: *"must put that edge, ⛔ assume it"*; and a UTR attested AFTER a payment made in life) and PQ2 (what the family is told when ⛔ drive
opens, or while the identity check waits — `-430` reading: *"⛔ ruled"*). ONE non-blocking note at Task 0.3; each is built on the unchanged /
literal side until answered. That both are ruled before members' claims go live is the AUTHOR's condition (roster Row 46, Task 0.5) — the
Panel's own go-live condition is that the staff step exists (`-424` Q1 (a) C cost; `-430` Q1 B cost).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or
the row key.

NUMBERS: ⛔ claimed by this file. "Anywhere" means EVERY branch and worktree (`git for-each-ref refs/heads refs/remotes` + each worktree's
dirty tree), ⛔ `main` alone. ⭐ At 2026-11-21 (`9f5e2c84`): `main` holds decision `-471`, ledger `2026-11-21b`, migration
`0209_breach-withdrawal-and-opened-stamp` (journal idx 209), `PERMISSION_CATALOG_VERSION = 64` / 95 keys, `CLAIM_EVENT_TYPES` 39
(`STORY_6_22_CLAIM_EVENTS` the latest frozen literal), the human-actor gate's COVERAGE_SET 19 entries / `COVERAGE_FLOOR = 19`,
`FENCED_FILES` 62, `VERIFIER_CONSOLE_MAX_READS` 33, roster highest Row 53 (Row 46 RESERVED for this story by name — Row 53's note), `ci:local`
40 jobs. ⛔ Unmerged branch holds more: `story/6-22b-…` (records only, 2026-11-02) stops at migration `0198` / catalog 58 / decision `-440`;
every other unmerged `story/*` ref is older and lower. ⇒ next free: decision ≥ `-472`, ledger ≥ `2026-11-21c`, migrations ≥ `0210` /
`0211` / `0212`, catalog v65 / 96 keys, `CLAIM_EVENT_TYPES` 40. (Superseded 2026-10-31 values, kept for the trail: decision `-430`, migration
`0192`, catalog v56 / 74, events 37.) This branch's ledger lines: `2026-10-31ag` (created), `2026-10-31ah` (validated), `2026-10-31aj` (the
note) — all three FREE on `main` (it skipped them) — and `2026-11-21c` (this drift validation). Task 0.4's decision entry, the
migrations, the catalog bump and the event count are "the next free one" at the commit that takes each — READ LIVE then, across branches.

LETTERS: **G** = found facts (G1–G17); **DL** = build decisions (DL1–DL16 — PROPOSED, BigDev answers at Task 0.2); **PQ** = Panel
questions (PQ1 (a) / (b), PQ2 — non-blocking) + **TL** = lines the note TELLS the Panel (TL1–TL3); **TR** = traps (TR1–TR15); **AC1–AC14**.
-->

# Story 6.39: Before Any Drive Opens, Staff Check That the Person Who Died Is the Member — When Nobody Has Checked Their Identity — and That the Joining Fee Was Paid Before the Death

Status: done

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled two staff checks that must happen **before any drive opens** for a death
> claim. **(a)** `2026-10-31-424` Q1 (a) C — when the member joined by **typing in their own identity details** and nobody has checked
> them since (the manual fallback: `self_declared`, `trusteeVerified` false — today EVERY member who joined that way, because the
> trustee-verification step is ⛔ built), the claim is FILED as usual, but staff check the identity *"from the death documents and the
> details on record"* first. **(b)** `2026-10-31-430` Q1 B — for **every** claim, whatever the identity route, staff compare the **date
> of death on the certificate** with the **date the joining fee was paid**, and ⛔ drive opens if the fee was paid after the death. This
> story builds ONE staff act — **the membership check** — recorded on the claim, by the District Admin who already accepts the death
> certificate (Story 6.21a), on the claim's verifier console. The SYSTEM computes the date comparison from the date the District Admin
> already entered when accepting the certificate and the joining-fee receipt; the District Admin sees both dates and the result and
> records the check — that recorded act is the staff comparison the Panel ruled (⚠ a declared narrowing: the result is binding, ⛔
> overridable — N3; the edge where it bites a real member is PQ1 (b)). The STAFF MEMBER judges the identity. ONE new conjunct in the ONE
> approval gate every approval path already shares (`assertClaimApprovable`) makes a claim WAIT (a typed 409, ⛔ a denial) until a
> current check passes; the cycle-freeze commit, the last step before the pools spawn, re-checks it. A claim whose fee came after the
> death can never pass; staff end it with a dedicated reason code `fee_paid_after_death` on whichever denial the claim's state allows —
> the District Admin's P1 denial before P1, the Pariwar Admin's final-vote denial after it (DL9). ⛔ New family-facing words (PQ2), ⛔
> change to the door (Story 6.38), ⛔ change to any member's lifecycle.

**What already ships and this story REUSES — rebuild none of it:**
- `assertClaimApprovable` (`packages/domain/src/claim/nominee-name-check.ts`) — the ONE approval gate, called at exactly SIX production
  sites: P1 `adjudicateClaim` (`verifier-decision-persist.ts`), the final vote `voteOnFrozenClaim` (`state-trustee-decision-persist.ts`),
  `finalizeR9Outcome` (`r9-voting-persist.ts`), `decideEscalatedClosure`'s full arm AND its `-251` waived arm, and
  `approveNoCorrectionNeeded` (all three in `correction-closure.ts`) — the `-251` waived approve IS one of the six, ⛔ a seventh. Its doc
  comment: *"whatever conjunct is added later — still refuses it"*; the waiver (`nameCheck: 'waived_251'`) returns early only inside the
  INNER name-check helper, so every OUTER conjunct — this story's included — binds the waived arm BY CONSTRUCTION (G1).
- Story 6.21a's death-certificate review — the District Admin types the certificate's date of death when accepting it
  (`claim_death_certificate_reviews.accepted_date_ciphertext`, `YYYY-MM-DD`, Tier-1, migration `0122`), one LIVE review per claim, a
  re-review supersedes (G4); its approval conjunct `death-certificate-approval.ts` is the LEAF pattern this story's conjunct copies (G6),
  and its `readDeathCertificateSnapshot(db, pariwarId, claimCaseId)` gives the CURRENT accepted review (`.currentReview` — live AND of the
  current upload; ⚠ `.liveReview` may be of an older upload) — reuse it from the new leaf.
- `getCurrentAcceptedDeathCertificate` (`claim/death-certificate-review-read.ts`, → `{ reviewId, acceptedDateCiphertext }`) +
  `decryptDeathCertificateReviewField` (`death-certificate-crypto.ts`) — the handler-side read and decrypt 6.20's `postDetermination`
  (`claims.nominee-declaration.handlers.ts`) already uses, with its `unreadable` / `anonymized` sentinel handling (G5).
- The 6.21a "the handler decrypts and compares, the domain writer re-asserts the id under the lock" pattern, and its per-story `decrypt`
  ban — an `it` block in `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` (G5).
- `isDeathCertificateDeterminationStale` (`death-certificate-approval.ts`) — the currency-check precedent (lower-cased id `===`).
- The verifier console (`apps/admin/src/routes/VerifierConsoleRoute.tsx`) and
  `apps/admin/src/modules/claim-verification/DeathCertificateReviewControl.tsx` — the closest template for a staff "check and record"
  form; the console packet's `memberRecord` already carries the deceased's decrypted KYC name and date of birth beside the certificate (G7).
- `istDateOf(instant): CalendarDateString` + `isRealCalendarDate(value)` (`packages/domain/src/cycle-calendar/holiday-resolver.ts` — ZERO
  imports, safe from any module graph) — an instant → India calendar date; the review writer already compares `acceptedDate >
  istDateOf(now)` (`death-certificate-review-persist.ts`) (G3).
- `getLockInClock` (`member/read.ts`) — the pattern for reading ONE member event by `streamId = memberId` + `eventType` (DL3).
- The dedicated-deny-code precedent `post_death_nominee_change` (Story 6.20 D14 — a pgEnum value added by migration `0120`, valid for
  `denied` only, guarded by `assertPostDeathRefusalGrounded` in BOTH `adjudicateClaim` and `reviseDecision`) (G9).
- `groundInspectionApprovalState` and the cycle-freeze commit's skip-and-keep loop (`commitCycleFreeze`,
  `packages/domain/src/claim/state-trustee-decision-persist.ts`) — the pattern for a commit-time re-check (G10).
- The composite test fixture `seedNomineeNameCheck` — domain `packages/domain/tests/integration/_helpers.ts`, API twin
  `apps/api/tests/integration/_nominee-name-check-fixture.ts` — with its `certificate: 'accepted' | 'skip'` (6.21a D12) and `inspection:
  'completed' | 'skip'` options: the home of DL13's new option.

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
| `2026-10-31-430` Q1 B | *"**Before any drive opens**, staff compare the **date of death on the certificate** with the **date the fee was paid**, and ⛔ drive opens if the fee was paid after the death. This is added to the staff check that `-424` Q1 (a) C already requires before any drive."* Cost accepted, IN FULL: *"The staff step is ⛔ built yet and grows by one comparison; it must exist before members' claims go live, as you already ruled for it. The family is stopped LATER — after filing and sending documents — which is harder news than a refusal at the door. Until it is built, A stands."* | Trustee-ratified (DR + KB) |
| `-430` "Our readings — ⛔ NOT RATIFIED" | (1) *"The date the fee was paid" = the joining-fee receipt's payment date (`vyawastha_shulk` receipt `paidAt`) … "After the death" = a payment DATE later than the certificate's date of death. ⚠ A fee paid ON the day of death is ⛔ decided by these words … Row `6-39`'s create-story must put that edge, ⛔ assume it.* (2) *Scope: every claim, whatever the identity route.* (3) *What the family is told when ⛔ drive opens: ⛔ ruled. Row `6-39`'s create-story owes it. Our reading is `-424` Q3 B's one general reason … which is now TRUE for this person.* (4) Q2's case (membership ended between death and report) is already refused at the door. | readings — (1) the fee date and (2) the scope are built on; the same-day edge is PQ1 (a), and (1)'s "`paidAt`" is the attest instant, ⛔ the bank's (PQ1 (b)); (3) is PQ2 — ⚠ this story ⛔ builds (3)'s reading B, because B carries `-424` Q3 B's door words past the door (a widening — §0); built A = unchanged |
| `2026-09-20-235` Y | *"A change done before a day of death will be assumed to be done by member, everything else will be discarded."* — the Panel's OWN day-of-death boundary (nominee changes), whose reading counts the day of death as AFTER, in Indian calendar days. ⭐ It leads PQ1 (a)'s evidence and is the precedent for DL2's IST choice. | Trustee-ratified (6.20 / 6.21a) |
| `-430` Consequence 1 | the row GROWS by the date comparison; *"the same staff step before any drive, and it remains a go-live condition"*; the slug names only the identity half; ⛔ rename. | the row this story is |
| `2026-09-20-235` Y · `-236` BB | a certificate without a clear date is rejected; *"family will be asked to produce certificate with clear date without the claim being denied"* — the WAIT-not-deny shape this story's identity outcome reads by analogy (DL8). | Trustee-ratified (6.21a) |
| Niyamavali §2.1 | *"A person becomes a member only on **all** of: (a) registration; (b) identity verification (KYC); (c) payment of the Vyawastha Shulk; and (d) admission under these rules. **Registration alone does not constitute membership.**"* A rulebook, ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]) — read for the Policy-meaning check only. | ⛔ ratified |
| Niyamavali §2.2 | *"Joining lock-in: a new member's beneficiary eligibility is locked for [[15 days]] after fee payment."* — a death on the day of payment, or within 15 days of it, is ineligible under the rulebook. ⛔ Built in the claim path (the lock-in clock never ends today — G12); ⛔ a blocker (⛔ ratified); ⭐ evidence for PQ1 (a). | ⛔ ratified |

## 📜 Policy meaning (AI-10-1)

**This story INTRODUCES one predicate that gates a family's access to a benefit — the drive — with two halves.**

*In the member's terms (ONE sentence):* **"When you die, no drive opens for your family until the Trust's staff have checked that your
joining fee was paid no later than the date of death on your death certificate — if it was paid after it, no drive ever opens — and, if
you joined by typing in your own identity details and nobody has checked them since, that the person on the certificate is you, and
while they cannot yet confirm that, the claim waits rather than being refused."**
⚠ **AMENDED by [`-473`](../../.decision-log.md#decision-2026-11-21-473) Q1 B / [`-474`](../../.decision-log.md#decision-2026-11-21-474) item 2**
(noted by the 2026-11-21 code review; the words above are kept): *"no later than the date of death"* now reads **"before the date of
death"** — a fee paid ON the day of death counts as after it, and no drive opens. `-473`'s member sentence is the operative one — in full only once row `6-39a` builds Q2 B; until then a fee paid in life but recorded after the death still stops the drive with no remedy (`-474`'s Policy meaning).

*What that sentence deliberately does ⛔ promise:* that the family is ASKED for anything. Nothing built asks: once a certificate is
accepted every upload is closed (`CLAIM_DOCUMENT_UPLOADABLE_STATES` + the accepted-certificate block, `death-certificate-approval.ts`), ⛔
claim state leads back to `documents_pending`, and ⛔ documents-request route exists; 6.21b / 6.19d ask only for a REPLACEMENT certificate
after a rejection. Staff may reach the family outside the app — a call to the CLAIMANT rests on their filing agreement (`-367` decision 2
names *"phone call"*); a call to a NOMINEE waits on roster Row 34 (counsel's basis). What the
family is told while the identity waits is PQ2.

**Checked against the Niyamavali** (the git-ignored copy in the main checkout, `docs/legal/niyamavali.md`, 2026-10-31) — result: CONSISTENT
with §2.1, one RELEVANT unbuilt clause (§2.2), otherwise silent:
- §2.1 (b) identity verification and (c) the fee are conditions of membership — CONSISTENT: the identity half checks (b) for a person
  whose (b) was never verified; the fee half checks that (c) came while they lived.
- §2.2's 15-day joining lock-in — RELEVANT, ⛔ built, ⛔ a blocker: under it a death on the day of payment is ineligible (it points PQ1 (a)
  toward B). It is put to the Panel as evidence, ⛔ built here.
- §4.1 (a Pool opens on a *"verified qualifying event"*) and §6.2 (*"The Trust verifies … the claimant's entitlement"*) — CONSISTENT with a
  staff check before a drive.
- ⛔ Clause speaks to checking identity after death — SILENT; the Panel's rulings (`-424`, `-430`) are the instrument.
- ⚠ **A declared edge, ⛔ built either way silently:** a fee paid on the day of death (PQ1 (a)) — built as ⛔ "after" (the drive may open)
  until the Panel answers, because the ruled words refuse only a fee paid *after* the death and a certificate shows ⛔ time.
  ⚠ **AMENDED by `-473` Q1 B / `-474` item 2** (the words above are kept): a fee paid on the day of death is now built as AFTER — the claim is HELD (⛔ drive) and `fee_paid_after_death` is accepted for it.
- ⚠ **What the member must also be told, because it is TRUE:** until row `3-13` builds verification during life, EVERY member who typed
  their details in is checked this way at death (G2), and a typed-in member who is later verified (3-13) is ⛔ checked again at death —
  the identity half reads the record at the time of the check.

## ⭐ THE INVARIANTS

**N1 — One check, one place, before any drive.** The membership check is ONE recorded staff act per claim (a LIVE row; a re-check
supersedes). It is read by ONE state function (`membershipCheckApprovalState`) used by the ONE approval conjunct inside
`assertClaimApprovable` — so all SIX approval sites (the `-251` waived arm among them) require it, by construction — and by the
cycle-freeze commit's skip-and-keep loop. ⛔ A second definition anywhere.

**N2 — Every claim needs it; the identity half only for an unchecked identity.** The fee half applies to every claim (`-430` reading 2).
The identity half applies iff the deceased's KYC record is ⛔ DigiLocker-verified AND ⛔ trustee-verified — `verification_strength <>
'aadhaar_kyc' AND trustee_verified = false` — or there is ⛔ KYC record at all (fail closed). The gate re-reads the KYC record each time
(cheap, plaintext columns), so a record the check called "not required" can never mask an unchecked identity. ⚠ Reachable TODAY: only
(`aadhaar_kyc`, `digilocker`, false) and (`self_declared`, `manual`, false) — `unverified` is never written in production and a member
past the door always has a row (G2); those two arms are fail-closed DEFENCE. ⚠ `aadhaar_kyc` is trusted as "checked" only while the
DigiLocker provider is the live one: with its secret names absent the API falls back to the FIXTURE provider (`provider-registry.ts`,
`config.ts`), which also writes `aadhaar_kyc` — roster Row 46 carries the leg "the fixture KYC provider is never active in production".

**N3 — The system computes the date comparison; staff ⛔ type or override it.** The fee date is the IST calendar date of the joining
receipt's `paidAt`; the death date is the date the District Admin entered on the CURRENT accepted certificate review
(`readDeathCertificateSnapshot(...).currentReview`, status `accepted`). The comparison is `before_death` | `same_day` | `after_death`,
computed by the API HANDLER (it decrypts — G5) and recorded on the check; the domain writer re-asserts, under the claim lock, that the
review it was computed against is still the current accepted one. ⚠ **Match / narrow, declared:** `-430` says *"staff compare"*. The
District Admin DOES compare — both dates and the result are on screen and the check is their recorded act (a MATCH on who) — but the
outcome is binding (a NARROWING of staff discretion, against the Panel's pattern of showing, ⛔ deciding — `-235` Y reading 2, `-226`
cl.5). It is built binding because the ruled words are a bright line (*"⛔ drive opens if the fee was paid after the death"*) and an
override would be a new power nobody ruled. Where it bites a real member — `paidAt` is the SERVER instant the member self-attested the
UTR, ⛔ the bank's time, so a UPI payment made in life and attested after the death reads `after_death` — is PQ1 (b).

**N4 — Stale means re-check.** A check is CURRENT only while the accepted certificate review it was computed against is still the current
one. ANY new review (re-reviewed / replaced certificate — even one with the same date) makes it stale ⇒ the claim waits for a new check.

**N5 — Waiting, ⛔ denying.** Every refusal of the conjunct is a typed 409 the claim WAITS on — ⛔ a denial, ⛔ an event that changes
state. ⛔ The deny path is ever gated by it (the 6.18 asymmetry: *"a denial is never gated"*).

**N6 — `after_death` can never pass.** Only a new certificate review (a different date) can change it, through N4. Staff end the claim
with the dedicated reason `fee_paid_after_death` on the denial its state allows (DL9): the P1 denial (`adjudicateClaim`, `reviseDecision`)
in `verification_in_progress` / `verifier_review`, the final-vote denial (`voteOnFrozenClaim`) in `verifier_approved` / `reversed` /
`state_trustee_freeze`. Every writer accepts it ONLY while the live check says `after_death`.

**N7 — ⛔ Tier-1 out of events, logs and audits.** The death date, the fee date and the staff note never appear in an event payload, a log
line or an audit context — ids, outcome codes and reason codes only (6.21a T10).

## Found facts (traced at `beae5116`)

- **G1 — The path to a drive, and where it can be held.** Claim states (`packages/domain/src/schema/claims.ts`): `intake_pending →
  intake_converged → documents_pending → verification_in_progress → verifier_review → verifier_approved (P1, District Admin,
  `claim.approve`) → state_trustee_freeze → state_trustee_approved (final vote / R9 / correction-closure arms) → approved
  (`commitCycleFreeze`, `cycle.freeze` + step-up) → settled`. After the commit, `postCommit`
  (`apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts`) calls the injected trigger — in production
  `createPgBossCycleSpawnEnqueuer` → `CYCLE_SPAWN_PARENT` (`cycle-spawn-queue.ts`) → `runCycleSpawnParent` / `runCycleSpawnChild`
  (`apps/jobs/src/cycle-spawn.ts`) → `planCycleSpawn` / `spawnChildPool` (`packages/domain/src/pool/spawn.ts`). ⚠ **The spawn side reads ⛔
  claim state at all** — every protection is upstream. `assertClaimApprovable` runs, in order: the accepted certificate →
  the name check (+ accounts, determination) → the ground inspection → (final only) the suspicion appeal wait, one-payment-per-death →
  the late-warning wait **LAST**. Its `@throws` block (on `LateWarningReasonRequiredError`): *"Every refusal above keeps its code and
  order"*. `commitCycleFreeze` re-checks, under its lock (`acquireTrusteeLock` then `lockClaim` per candidate), state, R9 routing, the live
  return, the suspicion wait, `groundInspectionApprovalState(await readGroundInspectionApprovalFacts(...)).complete` and the
  payment-committed claim, and SKIPS (keeps `state_trustee_approved`) a claim that fails — a silent `continue`: it returns
  `committedClaimIds` only, its audit records `committed_count` only, and ⛔ skip reason reaches the cycle-freeze page today.
  ⭐ (v1.3) Story 6.22's fraud register (landed) adds ⛔ conjunct and ⛔ commit skip: the flag *"gates NOTHING (the built side of the
  Panel's Q7 — ⛔ no approval gate reads it)"* (`fraud-investigation-persist.ts`); a guilty or innocent finding CLOSES the claim (`closed`,
  with a derived "found alive" label from `claim_fraud_investigation_steps` — ⛔ a new state; `-439`: a guilty finding leaves an approved /
  settled claim as it is). ⇒ ⛔ Wire the membership check to the fraud flag: a closed claim is outside the review window, so a check there
  is simply `membership_check.window_closed`.
- **G2 — The identity record.** `member_kyc_profiles` (`packages/domain/src/schema/member_kyc_profiles.ts`, migration `0024`): ONE row per
  member (PK `member_id`), latest-wins (`upsertMemberKycProfile` — `onConflictDoUpdate`); `verification_strength` ∈ `aadhaar_kyc`
  (DigiLocker) | `self_declared` (manual) | `unverified`; `source` ∈ `digilocker` | `manual`; `trusteeVerified boolean NOT NULL DEFAULT
  false` — set `true` NOWHERE (only `false` is ever written: `kyc.handlers.ts` both routes, `profile-write.ts` default). Name + DOB + photo
  are Tier-1 ciphertext; `aadhaar_masked_id` NULL on the manual route; ⛔ address here (`member_addresses`). The only production writers:
  `upsertMemberKycProfile` (`kyc/profile-write.ts`, two callers — the DigiLocker `POST /api/v1/kyc/callback` and `/manual`) and
  `anonymizeMember` (scrubs name / DOB / photo / `aadhaar_masked_id`, ⛔ `verification_strength` / `source` / `trusteeVerified`). ⚠
  `/manual` is gated on `pending-kyc`; the CALLBACK is ⛔ gated on member state — only on a `pending`, unexpired `kyc_transactions` row,
  minted by `/initiate` while `pending-kyc`, TTL 15 min (the env setting `DIGILOCKER_TRANSACTION_TTL_MS`, read in `config.ts`,
  default `15 * MINUTE` — ⛔ a code constant). ⇒ **once a claim exists the deceased's KYC
  record cannot change**, short of a callback landing within 15 minutes of a KYC start (`self_declared` → `aadhaar_kyc` only — N2's re-read
  covers it); erasure is refused while a death report stands (`resolveRtbfLegality` → `isDeathReportStanding`). A future 3-13 that sets
  `trusteeVerified` only relaxes N2.
- **G3 — The joining fee.** `vyawastha_shulk_receipts` (`packages/domain/src/schema/vyawastha_shulk_receipts.ts`, Tier-3 plaintext
  throughout): `paid_at timestamptz NOT NULL DEFAULT now()` — the SERVER's transaction instant when the member self-attests the UTR (⛔
  the bank's time; `insertVyawasthaShulkReceipt` never passes it ⇒ fixtures needing a fee before / on / after a death must raw-INSERT
  `paid_at`); `member_id` carried; UNIQUE `tr` and UNIQUE `(pariwar_id, utr)` (`0029`); append-only by GRANT (SELECT / INSERT, `0027`), ⛔
  trigger. ⚠ A member may hold SEVERAL receipts: the joining confirm ALWAYS commits its receipt in tx-1 even when the lock-in gate then
  fails (the member stays `pending-fee`; an idempotent re-confirm with the same `tr` reuses THAT receipt — `getReceiptByTr`), the joining
  confirm also accepts a member ALREADY in `lock-in` (only `withdrawn` / `anonymized` refused) and adds a receipt with ⛔ event — even after
  a death — and `renewConfirm` is built (states `active` / `active-in-grace` / `lapsed-unpaid`, unreachable today; `kind: 'renewal'`). ⛔
  Column marks the joining receipt. The `pending-fee → lock-in` step emits `member.vyawastha_shulk_paid` (`VyawasthaShulkPaidPayloadSchema`,
  `.strict()`: `{ from_state: 'pending-fee', to_state: 'lock-in', trigger, actor, utr, amount_inr }`) then `member.lock_in_entered`, in one
  transaction; it is the ONLY production producer of that transition. ⚠ The event's `utr` is the request BODY's UTR (`handlers.ts` confirm),
  ⛔ the stored receipt's: on a re-confirm (same `tr`, a corrected UTR typed) it matches ⛔ receipt of this member — and could equal ANOTHER
  member's receipt under `(pariwar_id, utr)` alone (DL3). UTR is plaintext in both places (masked only in audits — `maskUtr`).
  `getLatestReceipt` (`payment/receipt-read.ts`) exists and is WRONG here (it would pick a receipt added after the death). ⛔ IST
  conversion anywhere on this path today; `istDateOf` (`cycle-calendar/holiday-resolver.ts`, zero imports) is the helper —
  ⛔ `member/workplace.ts` `istToday` (its module imports drizzle / db / schema). Handler-side import precedent (v1.3):
  `claims.certificate-reminder.handlers.ts` and `claims.correction-chase.handlers.ts` already call it as `cycleCalendar.istDateOf` — copy
  that import in the API handler.
  ⚠ **AMENDED by [`-475`](../../.decision-log.md#decision-2026-11-21-475)** (code review 2026-11-21; the words above are kept): since `-475` the joining confirm's `pending-fee → lock-in` event carries the STORED receipt's UTR, ⛔ the request body's — a re-confirm with a corrected UTR names this member's receipt. The body-UTR shape survives only in an event written before it (or a raw one): the `member_id` leg's defence.
- **G4 — The date of death.** Three places, one of them authoritative:
  (i) `claim_death_certificate_reviews.accepted_date_ciphertext` (Tier-1, `YYYY-MM-DD`, ACCEPTED reviews only) +
  `accepted_date_index` (a keyed blind index — EQUALITY only, ⛔ ordering), written by the District Admin through
  `claims.death-certificate.handlers.ts` (`claim.review_death_certificate`); one LIVE review per claim (a unique index), a re-review
  supersedes (`re_reviewed` / `replaced`); reject reasons include `no_date_of_death` / `date_of_death_unclear` / `date_of_death_in_future`.
  ⭐ This is the date 6.20's determination already reads as the death date. (ii) `claim_ground_inspections.death_date_ciphertext`,
  `death_time_ciphertext`, `death_date_source` ∈ `family_statement` | `original_certificate` — the inspector's; `approval-warnings.ts`
  compares its index with (i)'s (`DeathDateComparison` = `same` | `differs` | `not_compared` | `not_indexed`). (i)'s table is migration
  `0122` (coherence CHECK: accepted ⇒ a date and ⛔ reason; `accepted_date_index` from `0149`). (iii) `claim_documents.date_of_death_ciphertext` — OCR, ALWAYS NULL in
  v1 ([[project_ocr_v1_always_empty]] — its "death date = filing date" half is stale except for the 90-day warning anchor). ⇒ (i) is "the
  date of death on the certificate". ⛔ Time of death on (i).
- **G5 — Who may decrypt.** 6.21a T5 / rule 7: ⛔ `decrypt` in the domain gate or writer modules. Two DIFFERENT mechanisms in
  `nominee-name-no-comparison-fence.test.ts`: (a) `FENCED_FILES` scans for NAME-comparison patterns only (⛔ `decrypt`), pinned as an EXACT
  count — `expect(FENCED_FILES.length).toBe(62)` + a uniqueness check, with a history comment ("6.21a FROM 23" … "6.33 FROM 56"); (b) the
  `decrypt` bans are per-story `it` blocks (6.21a's: three files, forbidden `['decrypt', 'nameCiphertext', 'getMemberNominees']`) with ⛔
  positive control. Both are AMENDED, ⛔ weakened (T9). The HANDLER decrypts and compares; the writer re-asserts the review id under the
  claim lock (6.21a D8). The accepted date is decrypted on demand: `getHistory` (`claims.death-certificate.handlers.ts`) through its
  `readable()` helper (RTBF sentinel ⇒ `anonymized`, failure / empty ⇒ `unreadable`), audited `admin_death_certificate.history_read` (ids
  + counts only); `postDetermination` decrypts without a read audit. The console packet carries ⛔ decrypted date (contract comment "carries
  NO decrypted date (T10)").
- **G6 — The leaf rule.** `death-certificate-approval.ts` header: *"A LEAF, AND IT MUST STAY ONE (T8)"* — `nominee-name-check.ts` imports
  it, and `nominee-determination-persist.ts` imports `NOMINEE_NAME_CHECK_RECORDABLE_STATES` from `nominee-name-check.ts` and evaluates
  `NOMINEE_DETERMINATION_RECORDABLE_STATES` from it at load ⇒ a conjunct module that imports the determination writer (or anything that
  does) closes a runtime init cycle typecheck cannot see ([[project_type_only_import_cycle_trap]]). Allowed imports (what the leaf itself
  imports): drizzle, `Db`, id types, schema tables, `errors.ts`, `review-window.ts`, import-free helpers. The enforcing test is the
  TRANSITIVE NW1 import scan in `packages/domain/tests/claim/approval-warnings.test.ts` (its entry list) — ⛔ a 6.21a source test.
- **G7 — The staff surface.** `/p/$pariwarId/claims/$claimCaseId/verify` (`apps/admin/src/router.tsx`) → `VerifierConsoleRoute.tsx`
  (single-claim console). All components below are in `apps/admin/src/modules/claim-verification/`. `DeathCertificateReviewControl.tsx`
  is PURELY presentational: accept / reject toggle (`aria-pressed`), radio reasons with nothing pre-selected (`useState(null)`), a
  required note, `role="alert"` for incomplete / error and `role="status"` for "recorded"; the `expected_live_review_id` and
  `mutateAsync(...).then(()=>true).catch(()=>false)` live in the ROUTE (`VerifierConsoleRoute.tsx`). Its mount gate `viewer.canReview` is
  PER REVIEW ITEM (`packet.documentReview.reviews[].review.viewer.canReview`, inside the `.strict()` review block), computed in
  `claims.verifier-console.handlers.ts` as `isInDeathCertificateReviewWindow(state) && rbac.hasPermission(grants,
  DEATH_CERTIFICATE_REVIEW_KEY, { dimension: 'district', value: ctx.district })`. `DocumentPreview.tsx` renders a document (`<img>` / PDF
  `<iframe>`) from a 300 s signed URL (`SIGNED_URL_TTL_SECONDS`). `SignalsPanel.tsx` shows the deceased's name + DOB;
  `VerifierReviewPanel.tsx` puts the documents beside the member's record. The console packet's `memberRecord = { name, dateOfBirth }`
  (decrypted KYC, audited under `admin_verifier_console.read`) — ⛔ address, ⛔ posting, ⛔ KYC route. The approve-blocked line is computed
  BEFORE submit from packet sections (a nested ternary over e.g. `packet.groundInspectionGate.{ available, complete, waitReason }` —
  6.26a), and every console read counts against `VERIFIER_CONSOLE_MAX_READS` (in `claims.verifier-console.handlers.ts`, asserted in
  `verifier-console.spec.ts` and `suspicion-refusal-routes.spec.ts` — READ the value live). Data: `apps/admin/src/api/client.ts`
  (`apiFetch(path, zodSchema, init?)` — module-PRIVATE; `ApiError(status, code, message, details?)`), `apps/admin/src/api/hooks.ts`
  (`usePostDeathCertificateReview` invalidates the console, nominee-declaration and history queries; codes in
  `DEATH_CERTIFICATE_REVIEW_STALE_CODES` refetch). ⚠ Admin `apiFetch` has ⛔ transport timeout (6.38 D6 — still OPEN at `9f5e2c84`; only
  the workplace writes' `boundedWrite` has one) — a hung POST leaves the control pending.
  ⭐ (v1.3) The NEWEST console panel, Story 6.22's `FraudInvestigationPanel.tsx`, uses a DIFFERENT pattern: mounted UNCONDITIONALLY
  (`<FraudInvestigationPanel key={claimCaseId} …/>`), it fetches its OWN read only when its disclosure opens (`useFraudInvestigation(…,
  open)`) and gates its form on the server's `data.viewer.can_record_finding` — ⛔ packet section, ⛔ `VERIFIER_CONSOLE_MAX_READS` bump.
  The packet's sections at `9f5e2c84` are unchanged by it (identity, validity, concealment, documentReview, peerMesh?, groundInspection,
  priorVerifierComments, recentPrecedents, shepherd, nomineeNameCheck, groundInspectionGate, suspicionRefusal, otherClaimsForDeath,
  finallyApprovedElsewhere, approvalWarnings). DL10 names the choice.
- **G8 — Keys and roles.** `packages/domain/src/rbac/permissions.ts`: `PERMISSION_CATALOG_VERSION = 64`, 95 keys at `9f5e2c84` (56 / 74 at
  the pin — 21 keys since, among them 6.22's `claim.flag_fraud` / `claim.record_fraud_finding`, `module.manage` and the `field_worker.*`
  keys; READ LIVE at the commit), `<resource>.<action>`
  (ONE dot; `claim.check_nominee_name` is the `claim.check_*` precedent). `district_admin` (ceiling `district`) holds `claim.verify`,
  `claim.review_death_certificate`, `claim.approve`; `super_admin` derives every key; claim keys are enforced by
  `requirePermissionHook(deps, KEY, { dimension: 'district', resolveValue: districtFromStash })`, the district resolved by
  `resolveNomineeNameCheckDistrict()` (exported from `claims.nominee-name-check.routes.ts`; `districtFromStash` is a per-file closure — copy
  `claims.death-certificate.routes.ts`). Minting a key touches: `permissions.ts` (the key's doc block, the bump block citing its
  author-commit decision id + a "REUSE CHECK" paragraph, `SEED_PERMISSION_KEYS`, the version), `roles.ts` (a `permissionKey(...)` const +
  the grant), `packages/domain/tests/rbac/permissions.test.ts` (history comment, `toBe(64)` → `toBe(65)`, `toHaveLength(95)` →
  `toHaveLength(96)` at `9f5e2c84` — READ LIVE), `roles.test.ts` (a holder test), optionally `matching-grant.test.ts`, the handler's key
  constant. ⛔ Migration seeds keys; ⛔ contracts mirror; ⛔ admin nav. `claims.fraud-investigation.routes.ts` (6.22) is the newest copy of
  the `districtFromStash` closure. ⚠ (v1.3) Story 13.1 changed `requirePermissionHook` (`apps/api/src/modules/rbac/index.ts`) to also
  store a frozen `VerifiedAuthorization` (`request.authorizations[key]`); ONLY field-worker handlers read it (their events carry the
  snapshot) — a claims key and handler need ⛔ snapshot and ⛔ change for it. ⛔ Build one.
- **G9 — The denial.** `VERIFIER_REASON_CODES` (pgEnum `verifier_reason_code`) + `REASON_CODE_OUTCOME_COMPAT` + `isReasonCodeValidForOutcome`
  (`packages/domain/src/claim/verifier-decision.ts`) — and a HAND-KEPT contracts copy (`packages/contracts/src/claims/verification-decision.ts`
  — enum, compat map, predicate: *"the domain write-path re-checks with its own canonical copy"*) pinned by the lockstep describe in
  `packages/contracts/tests/claims-verifier-decision.test.ts`, which ALSO pins `reasonCodesForOutcome('denied')` to an exact list (⇒ edited).
  ⛔ ONE source. `post_death_nominee_change` is the dedicated deny-only precedent (6.20 D14, migration `0120`: *"a `denied` decision already
  requires a rationale and is already appealable once through 6.16"*), guarded by `assertPostDeathRefusalGrounded` in BOTH `adjudicateClaim`
  and `reviseDecision` (a same-outcome revise can switch reason codes) → `verifier_decision.post_death_refusal_ungrounded`, with an admin
  label (`i18n-en.ts` `reasonCodes`) and a refusal copy (`postDeathRefusalUngrounded`). `ReasonCodeDropdown.tsx` offers EVERY
  `reasonCodesForOutcome('denied')` code ⇒ a new deny code appears in every deny dropdown. `adjudicateClaim` (`verifier-decision-persist.ts`):
  *"⛔ A DENIAL IS NEVER GATED"* — and it decides ONLY from `verification_in_progress` / `verifier_review` (any other state ⇒
  `ClaimNotInVerifierReviewError`); `reviseDecision` only in `verifier_approved` / `denied`, same-outcome. After P1 the denial is the final
  vote's (`voteOnFrozenClaim`, `TRUSTEE_VOTABLE_STATES` = `verifier_approved` / `reversed` / `state_trustee_freeze`, `cycle.freeze`) with
  `STATE_TRUSTEE_REASON_CODES` (`state-trustee-decision.ts`, pgEnum `state_trustee_reason_code`: `standing_not_met`,
  `documents_insufficient`, `concealment_upheld` (needs a live flag), `other` — ⛔ fee code); in `state_trustee_approved` only `routeToR9` →
  a `finalizeR9Outcome` denial (`r9_panel_denied`); `returnToDistrictAdmin` writes metadata only. **What the family sees on `denied`** (PQ2):
  only `appeal.eligible` — *"This claim was not approved. If you believe that was a mistake, you can ask us to look at it again."*
  (`packages/i18n/locales/en/claim.json`) + an "Ask for a review" button, ⛔ reason text (`apps/mobile/lib/appeal-status.ts`); a plain denial
  is appealable once with ⛔ deadline (`appeal-eligibility.ts`; only `post_death_nominee_change` has the 90-day limit).
- **G10 — The review window and the commit.** `CLAIM_REVIEW_WINDOW_STATES` (`packages/domain/src/claim/review-window.ts`, import-free;
  `NOMINEE_NAME_CHECK_RECORDABLE_STATES` re-exports it) `= ['verification_in_progress', 'verifier_review', 'verifier_approved', 'reversed',
  'state_trustee_freeze']` — `reversed` = an appeal reversed a denial; it re-enters approval through the final vote, SKIPPING P1. A
  certificate can be re-reviewed AFTER P1 approval but ⛔ after the final vote ⇒ the FINAL gate is what catches a P1-time check made stale
  by a re-review; the commit re-check (DL6) is defence in depth. ⚠ R9 finalize runs the gate in `state_trustee_approved` (R9-routed —
  `answer-window.ts`), OUTSIDE the window: safe, because reaching `state_trustee_approved` required the final vote's passing check and
  nothing writes a review or a KYC row in that state (G2) — the only way to fail there is a raw write.
- **G11 — Event and audit shapes.** `claim.death_certificate_reviewed` (`packages/events/src/registry.ts`) — an annotation, ⛔ state
  change, ids + codes only; claim event lockstep: `packages/domain/src/claim/events.ts` (the tuple + the payload map), `claim/state.ts` (the
  reducer's no-op arm), `CLAIM_EVENT_TYPES toHaveLength(39)` at `9f5e2c84` (37 at the pin; 6.22 added `claim.fraud_flagged` + `claim.member_found_guilty`)
  (`packages/domain/tests/claim/dpdpa-consent-events.test.ts`), AND the per-story FROZEN-LITERAL vocabulary diff in
  `packages/domain/tests/claim/nominee-name-check-events.test.ts` (`STORY_6_21A_CLAIM_EVENTS`, … `STORY_6_22_CLAIM_EVENTS` the latest —
  fails on ANY new `claim.*` event until listed); `packages/events/tests/claim-registry-coverage.test.ts` follows the registry
  automatically. Audit types in `apps/api/src/audit/audit-sink.ts` (`admin_claim.death_certificate_reviewed`, `…_review_rejected` with its
  reason code, `admin_death_certificate.history_read`) — written after the transaction closes, ⛔ the date or the note; ⚠ the
  `access-wrapper-invariants` gate scans `apps/api/src/modules/claims` for direct `writeAuditEntry` calls — follow
  `claims.death-certificate.handlers.ts`'s audit path exactly. 6.21a's commit `67121138` is the true file set for a new claim table: also
  `packages/domain/src/policies/claim-death-certificate-rls.ts` + `policies/index.ts` (RLS is declared in TS), `packages/domain/src/ids/index.ts`
  (a branded id), the `claim/index.ts` barrel, the test-fixture twins, and `apps/api/src/context.ts` (the field-class twin).
- **G12 — Today's members.** ⛔ Production emitter of `member.lock_in_expired` (rows `3-13` / `3-14`) ⇒ every paid member is in `lock-in`
  for good, and every typed-in member is `self_declared` + `trusteeVerified = false` for good ⇒ TODAY the identity half applies to every
  member who joined through the manual route, which is AVAILABLE by default (`KYC_MANUAL_FALLBACK_ENABLED`, `apps/api/src/config.ts`,
  default `'true'`; ⚠ the `kyc_manual_fallback` cutover flag has INVERTED polarity — enabled ⇒ DigiLocker mandatory, manual hidden — and is
  `off`).
- **G13 — Story 6.38's door.** `resolveClaimIntakeDoor` (`claim/intake-door.ts`, `CLAIM_INTAKE_REFUSAL_REASONS`) refuses `erased` /
  `removed` / `left` / `not_joined` (`pending-kyc`) / `not_paid` (`pending-fee`) at the first report; its header: *"a typed-in identity
  nobody checked is FILED, in any state (its check before a drive is row `6-39-…`)"* — the ONLY code pointer to this row anywhere in
  `apps/`, `packages/`, `scripts/` (DL15 re-words it once built).
- **G14 — Numbers.** See the NUMBERS block (top) — at `9f5e2c84`: on `main` migration `0209`, decision `-471`, ledger `2026-11-21b`;
  ACROSS branches the next free are migrations `0210` / `0211` / `0212`, decision `-472`, ledger `2026-11-21c`; catalog v64 / 95 keys;
  `CLAIM_EVENT_TYPES` 39; `FENCED_FILES` 62; COVERAGE_SET 19 / floor 19; `VERIFIER_CONSOLE_MAX_READS` 33; roster Row 46 reserved.
- **G15 — Gates that see a new claims route.** `scripts/claim-adjudication-human-actor-invariant/check.ts` fails on ANY unclassified
  `claims.*.routes.ts` (*"an unlisted adjudication route is invisible to this gate"*) — its COVERAGE_SET (19 entries, `COVERAGE_FLOOR = 19` at `9f5e2c84` — 6.22 added `claims.fraud-investigation.routes.ts` and raised the
  floor to the set's LIVE length; ⇒ 6.39 makes it 20 / floor 20) needs an
  entry `{ file, pathSubstrings: ['membership-check'], owner, expectedMethods: ['get', 'post'] }`, as 6.21a's
  `claims.death-certificate.routes.ts`. Routes register in `registerClaimsModule` (`apps/api/src/modules/claims/index.ts`, after
  `registerDeathCertificateRoutes` and `registerFraudInvestigationRoutes` — 6.22's, the newest).
- **G16 — Where the gate's refusals are translated and shown.** Each approval route PREFIXES its own codes — FOUR translators:
  `translateDecisionError` (`claims.verification-decision.handlers.ts`, `verifier_decision.`), `translateCycleFreezeError`
  (`claims.cycle-freeze.handlers.ts`, `cycle_freeze.`), `translateR9Error` (`claims.r9-voting.handlers.ts`, `r9_voting.`),
  `translateClosureError` (`claims.correction-closure.handlers.ts`, `closure.` — shared by `claims.correction-escalation.handlers.ts`, which
  serves `decideEscalatedClosure`). Admin side, FOUR surfaces: `VerifierConsoleRoute.tsx` `decisionErrorMessage` (matches `===
  'verifier_decision.…'`), `CycleFreezePage.tsx` `errorMessage()` and `R9CasePanel.tsx` `errorMessage()` (both `endsWith('.…')`), and
  `apps/admin/src/modules/correction-closure/errors.ts` `closureErrorText`, which shows the SERVER's message for `closure.*` ⇒ there the API
  message IS the staff copy. The reason → words helpers live in `claim-verification/nominee-errors.ts`
  (`deathCertificateAcceptanceRequiredMessage`, `trusteeDeathCertificateAcceptanceRequiredMessage` — `details.reason` → key, fallback);
  the API's human message helper precedent is `groundInspectionRequiredMessage`. ⛔ `refusalKey()` here (it exists only in
  `helpline-claims/HelplineClaimContact.tsx`).
- **G17 — Admin copy.** English ONLY: console copy lives in `apps/admin/src/modules/claim-verification/i18n-en.ts` (`verifierConsoleEn` —
  `deathCertificate`, `approveBlocked`, `trusteeApprovalGate`, `reasonCodes`), a module-local const (*"HERE, NOT in @twt/i18n runtime keys …
  this admin surface is English-facing"*); ⛔ Hindi, ⛔ `t()` catalog, ⛔ parity gate in the admin app.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL1 — ONE record: a NEW table `claim_membership_checks`** (DL9's TWO enum-value migrations first, each ALONE — the next free numbers
  across branches, `0210` / `0211` at `9f5e2c84` — then the table, `0212_claim-membership-checks.sql`; READ LIVE),
  append-only with a supersede, copying `claim_death_certificate_reviews`' shape: `check_id uuid PK`, `pariwar_id`, `claim_case_id` (FK),
  `deceased_member_id`, `death_certificate_review_id` (FK — the accepted review the comparison was computed against; the currency token),
  `fee_receipt_id` (FK `vyawastha_shulk_receipts`), `fee_outcome` enum `before_death | same_day | after_death`, `identity_required boolean`
  (N2 at the time of the check), `identity_outcome` enum `not_required | confirmed | not_confirmed`, `identity_reason` (nullable — DL8's
  codes, set iff `not_confirmed`), `note_ciphertext` (Tier-1, `piiColumn`; REQUIRED when `not_confirmed`, optional otherwise),
  `decided_by_actor_id`, `decided_by_display`, `decided_at`, `superseded_at`, `superseded_reason`. A branded id `ClaimMembershipCheckId`
  (`packages/domain/src/ids/index.ts`). ONE live row per claim (partial unique index `WHERE superseded_at IS NULL`); RLS by `pariwar_id`,
  declared in TS (`packages/domain/src/policies/claim-membership-check-rls.ts` + `policies/index.ts`, copying
  `claim-death-certificate-rls.ts`) INCLUDING a per-command UPDATE policy (without it the RTBF scrub matches 0 rows under FORCE — 6.23a,
  `anonymize.ts`); grants SELECT / INSERT + `UPDATE ("superseded_at", "superseded_reason", "note_ciphertext")` AT BIRTH (the 6.21a `0122`
  shape — its grant also names its ciphertext columns for the scrub); a mutation guard that refuses any change outside those three columns
  and leaves `note_ciphertext` OUT of its `IS DISTINCT FROM` list (so the scrub is writable — the `0122` `…_reject_mutation()` shape, ⛔ a
  later REPLACE needed because the table is new — [[project_append_only_guard_names_erasure_columns]]), and a supersession one-way trigger
  as `0122`'s `claim_death_certificate_reviews_supersession_one_way()` (⛔ `0121`, which is Story 6.20's); ⛔ DELETE. The ⛔-stored dates are
  deliberate: the outcome is the fact the gate needs; the death date is Tier-1 and has ONE home (the review), the fee date is a derivable
  fact with ONE home (the receipt) — one source each. *Rejected:* columns on the certificate review (6.21a's one writer per table); an
  event-only record (the gate needs a cheap, lockable read).
- **DL2 — The comparison (N3).** A pure function `compareFeeDateWithDeathDate(paidAt: Date, deathDate: string /* YYYY-MM-DD */):
  'before_death' | 'same_day' | 'after_death'` — throws unless `isRealCalendarDate(deathDate)`; the fee date is `istDateOf(paidAt)` (G3;
  India time, because a certificate's date is a local date — and the Panel's own day boundary, `-235` Y, is an Indian calendar day);
  string compare of two `YYYY-MM-DD`. It lives in an import-free module the handler calls (`claim/fee-death-date.ts`, importing only
  `holiday-resolver.ts`; ⛔ in the gate leaf). The HANDLER reads the CURRENT accepted review (`getCurrentAcceptedDeathCertificate`),
  decrypts its date (`decryptDeathCertificateReviewField`), reads the joining receipt, computes, and passes the outcome + the review id +
  the receipt id to the writer; a date that decrypts to the RTBF sentinel or fails / is empty (`unreadable` / `anonymized` — copy
  `postDetermination`'s and `getHistory`'s `readable()` handling) is a typed 409 `membership_check.certificate_date_unreadable`, ⛔ a 500
  from the comparison's throw. The writer, under the claim lock, re-asserts the review is still the current accepted one and the receipt
  is still the joining one (DL3) — else 409 `membership_check.stale` (added to the admin hook's stale-code list; the console refetches). ⛔
  Staff input for either date.
- **DL3 — The joining receipt.** Read the deceased's ONE `member.vyawastha_shulk_paid` event with `payload->>'from_state' = 'pending-fee'`
  (copy `getLockInClock`'s `streamId = memberId` + `eventType` read, `member/read.ts`), then the receipt with `pariwar_id = the Pariwar AND
  member_id = the deceased AND utr = the event's utr` — ⚠ `member_id` is REQUIRED: the event carries the request body's UTR (G3), so
  `(pariwar_id, utr)` alone can name ANOTHER member's receipt. ⛔ `getLatestReceipt`; ⛔ `occurred_at` of the event (that is when lock-in
  happened, ⛔ when the fee was paid). ⛔ Matching receipt ⇒ the check CANNOT be recorded: 409 `membership_check.no_fee_receipt` and the
  console says so (fail closed — the claim waits; a staff escalation, ⛔ a guess). It is REACHABLE: a gate-failed confirm re-confirmed with
  the same `tr` and a corrected UTR leaves the event's UTR on ⛔ receipt; ⛔ event at all is unreachable past the door (defence). *Considered
  and rejected (BigDev's call, 2026-10-31 validation):* "the member's EARLIEST receipt" — a renewal or post-lock-in receipt can never be
  the earliest, and a gate-failed receipt is a real payment, so it differs only when the member paid twice before lock-in; rejected
  because the receipt the lock-in event names is the one the membership was admitted on (a cheap swap if the Panel's PQ1 (b) answer
  prefers it). ⚠ The edge `-430` reading 1 flags — a receipt committed BEFORE the death whose lock-in step completed AFTER it (a
  gate-failed confirm whose T&C consent / medical disclosure the family supplied after the death) — compares the RECEIPT's `paidAt`, as
  the ruled words say, so the drive may open. Built that way; ⛔ settled here — it is TL3 in the note (it brushes the story's own *"became
  a member only after they had died"* and Niyamavali §2.1 (d) admission).
  ⚠ **AMENDED by [`-475`](../../.decision-log.md#decision-2026-11-21-475) and [`-476`](../../.decision-log.md#decision-2026-11-21-476) item 2** (the words above are kept): *"It is REACHABLE"* now reads UNREACHABLE through the door (the event names the stored receipt) — kept as the fail-closed defence; *"a staff escalation"* is replaced by the staff line *"Please tell the Super Admin."* (an escalation never unblocked the claim: the gate runs at both steps and all six sites).
- **DL4 — The identity half's trigger (N2).** `identity_required = (no KYC row) OR (verification_strength <> 'aadhaar_kyc' AND
  trusteeVerified = false)` — so `self_declared` AND `unverified` both count as unchecked (the latter and the no-row arm are fail-closed
  defence, unreachable today — N2). Read by the handler (to show and record) AND by the gate's state function (to enforce — plaintext
  columns, ⛔ decrypt).
- **DL5 — The gate (N1, N5).** NEW leaf `packages/domain/src/claim/membership-check-approval.ts`: `membershipCheckApprovalState(db,
  pariwarId, claimCaseId, deceasedMemberId)` → `{ passed: true } | { passed: false; reason: 'not_checked' | 'stale' |
  'identity_not_confirmed' | 'fee_after_death' }` (precedence: `not_checked` → `stale` → `fee_after_death` → `identity_not_confirmed`; an
  identity required by TODAY's KYC row but recorded `not_required` ⇒ `stale`), and `assertMembershipCheckedForApproval(...)` throwing
  `MembershipCheckRequiredError(reason)`. Called inside `assertClaimApprovable` AFTER the ground inspection and BEFORE the final-only
  conjuncts — i.e. after `await assertGroundInspectionCompleteForApproval(...)` and before `if (opts.step === 'final')` — so every existing refusal keeps its
  relative order and the late-warning wait stays LAST; at BOTH steps (`district_admin` and `final`); ⛔ waived by `nameCheck: 'waived_251'`
  (it sits in the OUTER helper). Add its entry to the `@throws` doc block. The ONE intended order change: a claim missing BOTH this check and
  a final-only condition now sees this 409 first (DL13's fixtures cover it). API: 409 `<prefix>.membership_check_required` with
  `details.reason` = the reason, at EACH of the four translators (G16 — `verifier_decision.` / `cycle_freeze.` / `r9_voting.` /
  `closure.`), with a plain-words human message from a helper like `groundInspectionRequiredMessage` (the `closure.*` surface shows it
  verbatim). Imports per G6 only; it reads `claim_membership_checks`, `member_kyc_profiles` and the CURRENT accepted review id
  (`readDeathCertificateSnapshot(...).currentReview` — a leaf), comparing ids as `isDeathCertificateDeterminationStale` does. ⛔ `decrypt`
  (G5 — a new 6.39 `it` block in the fence test bans it in the leaf, the writer and the read module; the leaf is added to the NW1 scan).
- **DL6 — The commit re-check (G10).** `commitCycleFreeze`'s skip-and-keep loop also skips a claim whose
  `membershipCheckApprovalState(...).passed` is false, beside the ground-inspection skip — the last read before the pools spawn. Defence in
  depth (the review window closes at the final vote), the same reason the ground-inspection skip exists. The skipped claim stays
  `state_trustee_approved` with ⛔ reason shown — exactly as today's ground-inspection, suspicion and payment skips (G1; surfacing skip
  reasons is ⛔ this story's scope). ⚠ A skipped claim is STRANDED: `state_trustee_approved` is outside the review window, so ⛔ new check or
  re-review can be recorded; its only exit is `routeToR9`. Reachable only by a raw write (G10), so this is a recorded dead end, ⛔ a built
  path.
- **DL7 — Who checks: a NEW key `claim.check_membership`**, granted to `district_admin` (ceiling `district`, checked at `dimension:
  'district'` on the deceased's posting district — the same person who accepts the certificate), `super_admin` by derivation. Catalog
  64 → 65, 95 → 96 keys at `9f5e2c84` (READ LIVE at the commit). The checker MAY be the P1 approver (as with the certificate review). *Rejected:* reusing
  `claim.review_death_certificate` (a separate act deserves its own grant and audit, and a later separation of duties needs it); a
  Pariwar-level role (the evidence — the certificate, the inspection — sits with the district). ⚠ "Staff" is the Panel's word; WHICH staff
  is the author's within it — a MATCH, ⛔ a narrowing.
- **DL8 — The identity judgment.** The staff member sees, side by side: **the death documents** (`-424`: *"from the death documents and
  the details on record"* — a MATCH, ⛔ a narrowing to the certificate): EVERY document on the claim through the console's existing
  `DocumentPreview` (the certificate and its accepted date, a `hospital_record`, `ground_inspection_photo`s), and the ground inspection's
  record AS THE CONSOLE ALREADY SHOWS IT (⛔ new decrypt); and **the details on record**: the KYC name + date of birth (the packet's
  `memberRecord` — ⛔ second decrypt site; the control reads the packet), the KYC route (`typed in, never checked` / `checked through
  DigiLocker` — plaintext), and the latest posting (`member_postings`, plaintext; may be absent). ⛔ Address: it is Tier-1, optional
  (written only by Life Events 3.9, ⛔ at signup — often absent), and ⛔ staff decrypt path exists — adding one is a new disclosure this
  story ⛔ needs. *Advisory confirm criterion* (shown with the radios, ⛔ a rule — staff judge): "the same person" (`-236`'s words) — the
  name and age / date of birth on the documents agree with the record, or a difference is explained by the documents or the inspection.
  They choose `confirmed` or `not_confirmed`; `not_confirmed` needs a reason — `name_differs` | `age_or_birth_date_differs` |
  `document_unreadable` | `other` — and a note. `not_confirmed` makes the claim WAIT (N5); a later check SUPERSEDES it. ⛔ In-app ask
  exists: staff may reach the family outside the app (the claimant by phone under their filing agreement; a nominee by phone only once
  roster Row 34 — counsel's basis — closes), and the wait has ⛔ time
  limit (TL2). ⛔ It denies: the existing denials remain available, unchanged. ⚠ That a failed identity check WAITS rather than ends the
  claim is the author's reading of *"the identity is checked first … before any drive opens"* (the ruling holds the drive; it says ⛔ more)
  — the unchanged side; challenge ⇒ the Panel (TL2 tells them).
- **DL9 — The fee half's outcome (N6).** `after_death` ⇒ the gate refuses for good (until a new certificate review — N4). The claim is
  ended on whichever denial its state allows (G9), so ONE new reason code on EACH of the two denial vocabularies:
  (a) **P1** (`verification_in_progress` / `verifier_review`): verifier reason `fee_paid_after_death` — deny ONLY in
  `REASON_CODE_OUTCOME_COMPAT` (`claim/verifier-decision.ts`) + its hand-kept contracts copy + the lockstep test AND its pinned
  `reasonCodesForOutcome('denied')` list; guarded in BOTH `adjudicateClaim` AND `reviseDecision`, placed after the live-decision guard
  exactly where `assertPostDeathRefusalGrounded` sits.
  (b) **After P1** (`verifier_approved` / `reversed` / `state_trustee_freeze` — re-review is open there, so a re-check can turn
  `after_death`; a `reversed` claim never passes P1 again): state-trustee reason `fee_paid_after_death` in `STATE_TRUSTEE_REASON_CODES`
  (`claim/state-trustee-decision.ts`) + its contracts copy, accepted on the final-vote DENY only, guarded in `voteOnFrozenClaim`.
  Each pgEnum value (`verifier_reason_code`, `state_trustee_reason_code`) in its OWN hand-authored migration `ALTER TYPE "…" ADD VALUE IF
  NOT EXISTS 'fee_paid_after_death'` — `0120`'s exact form (*"a newly-added enum value cannot be USED in the transaction that added it …
  Hand-authored — ⛔ never regenerate"*). Every writer accepts the code ONLY while the live check says `after_death`, else 409
  `<prefix>.fee_paid_after_death_not_shown` (`verifier_decision.` / `cycle_freeze.`). (`state_trustee_approved` is reachable only past a
  passing check — G10; its R9 denial records `r9_panel_denied`, unchanged.) Admin: a label in `i18n-en.ts` `reasonCodes` (P1's
  `ReasonCodeDropdown` and the final vote's reason list) + a refusal copy for `…fee_paid_after_death_not_shown`, as
  `postDeathRefusalUngrounded`. `same_day` passes (PQ1 (a) — the literal side) and is SHOWN to staff as "paid on the day of death".
  `before_death` passes.
- **DL10 — Routes.** `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/membership-check` (`claim.check_membership`): the preview — the
  live check (if any), the computed comparison for the CURRENT review (the certificate's date — decrypted, AUDITED
  `admin_claim.membership_check_read`, ids + outcome only — and the fee's IST date, plaintext), `identity_required`, the KYC route and the
  latest posting (plaintext; name + DOB come from the console packet's `memberRecord`, ⛔ a second decrypt here), `expected_live_review_id`.
  `POST …/membership-check` (`claim.check_membership`):
  `{ expected_live_review_id, identity_outcome, identity_reason?, note? }` → the handler recomputes (⛔ trusts the client's dates — it
  sends none) and writes. Route-level codes use the route's own prefix, as `death_certificate_review.*`: `membership_check.stale`,
  `.no_fee_receipt`, `.certificate_not_accepted`, `.certificate_date_unreadable`, `.window_closed`, `.invalid_outcome`. Zod contracts in
  `packages/contracts/src/claims/membership-check.ts` (`.strict()`, exported from `claims/index.ts` as `death-certificate.js` is); the reason
  / outcome tuples DOMAIN-owned, contracts MIRRORS them (⛔ imports) with a lockstep test `packages/contracts/tests/claims-membership-check.test.ts`
  (the 6.38 DL6 pattern — `intake-refusal.ts` + `claims-intake-refusal.test.ts`). The console's knowledge of the check is a NEW packet
  section `membershipCheckGate: { available, passed, reason, viewer: { canCheckMembership } }` in `packages/contracts/src/claims/verifier-console.ts`
  (`VerifierConsolePacket`), computed in `claims.verifier-console.handlers.ts` as `canReview` is (window && `claim.check_membership` at the
  deceased's district) — it drives both the control's mount and the approve-blocked line's new arm (after the ground inspection's); its reads
  are added to the read ledger and `VERIFIER_CONSOLE_MAX_READS` bumped (33 at `9f5e2c84` — READ LIVE; G7). *Considered (v1.3):* 6.22's
  `FraudInvestigationPanel` pattern — mounted always, its own read on open, the form gated on the server's `viewer` flag, ⛔ packet
  section, ⛔ read-budget bump (G7). Kept the packet section because the approve-blocked line is computed from PACKET sections before
  submit (6.26a) and must know the check's state without the panel opened; the control MAY still load its preview (DL10's GET) on open,
  as 6.22's does. ⚠ A new REQUIRED packet field breaks the fixtures in
  `packages/contracts/tests/claims-verifier-console.test.ts` and the admin tests — contracts tests sit OUTSIDE tsc
  ([[project_contracts_tests_outside_tsc]]); run them. Claim-state guard: the same window as the certificate review
  (`CLAIM_REVIEW_WINDOW_STATES`) — a check outside it is 409 `membership_check.window_closed`. Routes file registered in
  `registerClaimsModule` and classified in the human-actor gate's COVERAGE_SET (G15).
  ⚠ **AMENDED** (code review 2026-11-21; the words above are kept): the POST body gains a REQUIRED nullable `expected_live_check_id` (the preview's `live_check.check_id`; `null` = none) and the refusals gain `membership_check.check_changed` (the live check is ⛔ the one the staff member saw — refused under the claim lock; the console refetches on it); the preview gains `fee_blocks_approval` (N1). Review patches 3 and 4 were WRITTEN as "`stale`"; BUILT as this separate code, so a changed certificate and a changed check say different things.
- **DL11 — Event + audits (N7).** NEW event `claim.membership_checked` (annotation, ⛔ state change — the reducer's no-op arm; payload:
  `check_id`, `death_certificate_review_id`, `fee_outcome`, `identity_required`, `identity_outcome`, `identity_reason`), lockstep files
  per G11 (`CLAIM_EVENT_TYPES` 39 → 40 at `9f5e2c84`; a new frozen literal `STORY_6_39_CLAIM_EVENTS = ['claim.membership_checked']` + its exclusion
  clause in `nominee-name-check-events.test.ts` — ⛔ loosened). Audits: `admin_claim.membership_checked`,
  `admin_claim.membership_check_rejected` (every refusal, with its code), `admin_claim.membership_check_read` — through
  `claims.death-certificate.handlers.ts`'s audit path (G11). ⛔ Date, ⛔ note, ⛔ name in any of them.
- **DL12 — Staff words.** The verifier console: a NEW presentational `MembershipCheckControl.tsx` beside `DeathCertificateReviewControl`
  (mounted iff `packet.membershipCheckGate.viewer.canCheckMembership`; disabled with a line until a certificate is accepted); the route owns
  the mutation and `expected_live_review_id`, as for the review (G7). The refusals map to copy at FOUR surfaces (G16) — the console's
  `decisionErrorMessage` + its packet-driven approve-blocked line, `CycleFreezePage` `errorMessage()`, `R9CasePanel` `errorMessage()` (match
  `endsWith('.membership_check_required')`, then `details.reason` → copy through a new `membershipCheckRequiredMessage` in
  `nominee-errors.ts` with a generic fallback — ⛔ a raw code), and `closureErrorText`, which shows the API's own message (so that message is
  plain staff words). Proposed English (BigDev approves at 0.2): *"Membership check needed before approval."* · *"The certificate changed
  since the membership check — check again."* · *"The person's identity has not been confirmed."* · fee after death — on the CONSOLE (P1):
  *"The joining fee was paid after the date of death on the certificate. No drive can open for this claim — deny it with the reason "Fee
  paid after the death"."*; on the CYCLE-FREEZE page (final vote): *"… — refuse it in the final vote with the reason "Fee paid after the
  death"."*; on the R9 panel and the closure surfaces: *"The joining fee was paid after the date of death on the certificate. No drive can
  open for this claim."* (⛔ instruction — neither denial there takes the code) · fee lines: *"Paid before the death"* / *"Paid on the day of
  death"* / *"Paid after the death"* · *"Typed in at joining, never checked"* / *"Checked through DigiLocker"* · the reason label *"Fee paid
  after the death"* · the not-shown refusal *"This reason can be used only when the membership check found the fee was paid after the
  death."* Copy goes in `claim-verification/i18n-en.ts` (`verifierConsoleEn`) — English only (G17).
- **DL13 — Fixtures (TR1).** A test helper `seedPassedMembershipCheck(tx, { pariwarId, claimCaseId, deceasedMemberId, reviewId })` that
  writes a RAW live row (`fee_outcome 'before_death'`, `identity_outcome 'confirmed'`) — the gate reads only the row, the current review
  id and the KYC row — in `packages/domain/tests/integration/_helpers.ts` beside `seedAcceptedDeathCertificate` AND its API twin in
  `apps/api/tests/integration/_nominee-name-check-fixture.ts` beside `ensureAcceptedDeathCertificate`; AND a new option
  `membershipCheck?: 'passed' | 'skip'` (default `'passed'`, seeded after the certificate is accepted) on BOTH `seedNomineeNameCheck`
  fixtures, as `certificate` / `inspection` — 44 of the 46 blast-radius files go through them (TR1, corrected v1.3); the other two do
  ⛔ — `peer-mesh-reply` calls the helper directly, `nominee-refusal-inheritance` only denies (⇒ likely untouched; run it).
  ⛔ Assertion weakened, ⛔ bypass flag, ⛔ env switch (the 6.38 DL14 rule).
- **DL14 — RTBF / anonymize.** `note_ciphertext` is Tier-1: follow EXACTLY what 6.21a did for `claim_death_certificate_reviews` in
  `member/anonymize.ts` — the sentinel write (here `isNotNull(note)`-guarded as a row filter, the 6.23a / memorial-review-decision
  pattern, because the note is optional). ⭐ (v1.3) The field class: TWO precedents now — 6.21a's LOCAL value constant
  (`FIELD_CLASS_DEATH_CERTIFICATE_REVIEW`) and the newer SHARED one in `packages/domain/src/encryption/field-classes.ts`
  (`CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS`, 6.22; `MEMORIAL_FIELD_CLASS`), imported by `anonymize.ts` and re-exported by
  `apps/api/src/context.ts` as `encryptionRuntime.*` — FOLLOW 6.22's (one source for the writer, the handler and the scrub). The DB side
  is DL1's at-birth grant + UPDATE policy + guard (⛔ later REPLACE — [[project_append_only_guard_names_erasure_columns]]). (Erasure is
  refused while a death report stands — `resolveRtbfLegality` → `isDeathReportStanding`, 6.38.) ⚠ (v1.3) The release is NOW LIVE: Story
  6.22's `recordFraudFinding` (`fraud-investigation-persist.ts`, from `claims.fraud-investigation.handlers.ts`) calls
  `recordMemberInnocenceFinding` ⇒ a false claim closed as "found alive" lifts the erasure refusal and the scrub RUNS for real on a
  check recorded before the flag — this binds at merge, ⛔ "once 6-22 lands".
- **DL15 — Stale comments.** `intake-door.ts`'s header pointer (G13) — the ONE "row 6-39" pointer in code — is re-worded to name the
  built conjunct; ⛔ behaviour.
- **DL16 — ⛔ Scope creep.** ⛔ Family-facing words (PQ2); ⛔ helpline change; ⛔ change to the door or to any member lifecycle state;
  ⛔ `trusteeVerified` written (row `3-13`); ⛔ backfill (⛔ member uses the system); ⛔ automatic denial; ⛔ commit skip reasons surfaced
  (DL6); ⛔ in-app documents request (DL8); ⛔ staff address decrypt (DL8); ⛔ staff override of the fee outcome (N3 — PQ1 (b)); ⛔
  `receipt_id` added to the joining event (DL3 — 3.6b's producer, unchanged); ⛔ link to 6.22's fraud flag or finding (G1 — the flag
  gates nothing; a finding closes the claim, and the window then refuses a check).

## Panel questions — PROPOSED (one non-blocking note at Task 0.3)

> ⭐ **RULED 2026-11-21 — [`-473`](../../.decision-log.md#decision-2026-11-21-473) (Trustee-ratified, DR + KB): PQ1 (a) B, PQ1 (b) B, PQ2 (i) B, PQ2 (ii) B** — all four the suggested option. ⚠ This story is BUILT A on all four (DL9, DL12, DL16, AC8); the build to B
> needs a ROW — inside this story before it merges, or a new row — BigDev's call (`-473` Consequence 1). What the ruling does NOT
> cover (Q2 B's who / when / matching; any language but English; when Q4's line shows and stops) is listed in `-473`. The questions
> below are kept as written.

- **PQ1 — What "the date the fee was paid" means at its two edges** (`-430` reading 1 is ⛔ ratified).
  - **(a) A joining fee paid ON the day of death.** A certificate gives a date, ⛔ a time; the fee's time is known. ⭐ Evidence FIRST in
    the note: the Panel's OWN day-of-death boundary, `-235` Y — *"A change done before a day of death will be assumed to be done by
    member, everything else will be discarded"* — counts the day of death as AFTER; and Niyamavali §2.2's 15-day joining lock-in (⛔
    ratified, ⛔ built) would make a death on the day of payment ineligible anyway. The ruled words stop a drive only when the fee was paid
    *after* the death. Options: **A** — the same day counts as before (the drive may open); cost: a fee paid hours AFTER a death, the same
    day, opens a drive — the Panel's `-235` Y boundary points the other way. **B** — the same day counts as after (⛔ drive), as `-235` Y;
    cost: a member who paid in the morning and died that evening — a real member — gets ⛔ drive. **C** — staff use a time of death when
    one was recorded from the ORIGINAL certificate at the ground inspection, else B; cost: rests on a time few certificates carry, and more
    staff work. Suggest **B** (consistent with `-235` Y and §2.2; the same-day-after case needs the family to pay from the dead member's
    phone before filing). **Built: A** (`same_day` passes, shown to staff) — the literal side of the ruled words until ruled; B flips ONE
    arm of DL5's precedence (`same_day` joins `fee_after_death`); C is a follow-up.
  - **(b) A fee paid in life whose UTR was attested after the death.** `paidAt` is the SERVER instant of the member's self-attest, ⛔ the
    bank's time (G3); the result is binding (N3). A member who paid by UPI and died before the app recorded the UTR (or whose family
    attested it later from the phone) reads `after_death` — ⛔ drive, for good, with ⛔ staff remedy. Options: **A** — the attest instant
    is the date (as built); cost: that real member is refused. **B** — staff may record the BANK's date when they have the bank's
    statement, recorded with a reason and audited; cost: a staff override of a bright line, and a document trail nobody collects today.
    **C** — refuse as A, but name the case as grounds for the existing appeal; cost: the appeal cannot open a drive either (TL1). Suggest
    **B**. **Built: A** until ruled; B is a follow-up (a new staff input + its own DL).
- **PQ2 — What the family is told** (a disclosure — `-424` Q3 B ruled the words AT THE DOOR; using them later WIDENS that ruling, §0).
  Two moments: (i) ⛔ drive opens because the fee came after the death; (ii) the claim WAITS because staff cannot yet confirm the identity
  (DL8 — ⛔ in-app ask exists; staff may phone the claimant, a nominee only once roster Row 34 closes). Today a denied claim shows the family only *"This
  claim was not approved. If you believe that was a mistake, you can ask us to look at it again."* + "Ask for a review", ⛔ reason (G9); a
  waiting claim shows its existing in-review status. Options for (i): **A** — as today: the denial, ⛔ reason; cost: the family learns
  nothing after sending documents. **B** — the one general reason, *"the person was not a member of the Trust when they died"* (TRUE for
  this person — `-430` reading 3); cost: a small disclosure, the same as at the door. **C** — the specific reason (*"the joining fee was
  paid after the date of death on the certificate"*); cost: tells the family exactly what to dispute. Suggest **B**. Options for (ii):
  **A** — as today (in review, ⛔ more); cost: an open-ended silence. **B** — *"We need to confirm a few details before this claim can go
  ahead. Our staff will contact you."*; cost: a promise of contact staff must keep (a nominee only by letter until Row 34 closes). Suggest
  **B**. **Built: A** for
  both (⛔ new family words) until ruled; B or C is a follow-up task on this row if ruled before Task 6, else a deferred item.
- **TOLD LINES (⛔ asked — the note states them so the Panel can object):**
  - **TL1 — The appeal cannot open a drive.** A `fee_paid_after_death` denial is appealable once with ⛔ deadline through the existing
    appeal (6.16 — unchanged), but even an ALLOWED appeal cannot open a drive: `after_death` never passes without a new certificate review
    (N6). Contrast `-430` Q2 at the door, which gives ⛔ appeal at all.
  - **TL2 — A failed identity check waits, with ⛔ time limit** (DL8), and the existing denials stay available to staff.
  - **TL3 — Admitted after the death.** A receipt committed BEFORE the death whose lock-in step completed AFTER it (the family supplied
    the T&C consent / medical disclosure later) compares the RECEIPT's date — the drive may open (DL3), though the person *"became a member
    only after they had died"* by Niyamavali §2.1 (d). Built on the ruled words; the Panel may make it a question.

## Acceptance Criteria

1. **AC1 — The record (DL1).** Three migrations: the verifier and the state-trustee `fee_paid_after_death` enum values, EACH ALONE, then
   `claim_membership_checks` with the TS-declared RLS (incl. the UPDATE policy), the at-birth grants, the mutation guard, the one-way
   trigger and the one-live-row index; the drizzle schema + journal agree ([[project_live_db_test_gotchas]] — ⛔ regenerate an applied
   migration). Live-DB: a second live row for a claim ⇒ 23505; UPDATE of any column but `superseded_*` / `note_ciphertext` ⇒ refused;
   `superseded_at` back to NULL ⇒ refused; DELETE ⇒ refused; another Pariwar's session sees ⛔ row.
2. **AC2 — The comparison (DL2).** Unit: `compareFeeDateWithDeathDate` at the IST boundaries — `paidAt` 18:29:59Z and 18:30:00Z on the
   day before / of / after the death date ⇒ the exact outcome each; a malformed date string throws.
3. **AC3 — The joining receipt (DL3).** Live-DB (receipts raw-INSERTed with explicit `paid_at` — G3): a member with a gate-failed receipt
   (`tr1` / `utr1`), the joining receipt whose UTR the `pending-fee → lock-in` event carries (`tr2` / `utr2`), and a later receipt added in
   `lock-in` ⇒ the joining one is chosen; ANOTHER member of the Pariwar holding a receipt whose UTR equals a re-confirm's typed UTR is ⛔
   chosen (the `member_id` leg); a re-confirm with a corrected UTR (the event's UTR on ⛔ receipt of the member) ⇒ 409
   `membership_check.no_fee_receipt` and ⛔ row.
   ⚠ **AMENDED by [`-475`](../../.decision-log.md#decision-2026-11-21-475)** (the words above are kept): the corrected-UTR leg is now the fail-closed DEFENCE — a raw event naming ⛔ receipt of the member ⇒ 409 `membership_check.no_fee_receipt`; a REAL re-confirm with a corrected UTR finds the receipt (`vyawastha-shulk.spec.ts`, the `-475` leg, through `readJoiningFeeReceipt`).
4. **AC4 — Recording a check (DL2, DL4, DL8, DL10).** Live-DB through the API: a DigiLocker-verified deceased ⇒ `identity_required false`,
   `identity_outcome` must be `not_required` (any other ⇒ 400); a `self_declared` deceased ⇒ `identity_required true` and `not_required` ⇒
   400; the `unverified` and no-KYC-row deceased (raw fixtures — fail-closed defence, unreachable today) ⇒ `identity_required true`;
   `not_confirmed` without reason or note ⇒ 400; a stale `expected_live_review_id` ⇒ 409 `membership_check.stale` and ⛔ row; ⛔ accepted
   certificate ⇒ 409 `membership_check.certificate_not_accepted` (the console's disabled state); a sentinel / undecryptable date ⇒ 409
   `membership_check.certificate_date_unreadable`; outside the review window ⇒ 409 `membership_check.window_closed`; a second check
   supersedes the first (`superseded_reason`), ONE live row after.
5. **AC5 — The gate at every approval site (DL5, N1).** Live-DB at all SIX sites — P1 approve, the final vote, R9 finalize,
   `approveNoCorrectionNeeded`, `decideEscalatedClosure`'s full arm and its `-251` waived arm — each ⇒ 409
   `<prefix>.membership_check_required` (`verifier_decision.` / `cycle_freeze.` / `r9_voting.` / `closure.`) `{ reason: 'not_checked' }`
   with ⛔ check; each passes with a passing check. One site per reason: `not_checked`; `stale` — made by a RAW supersede of the review the
   check names plus a new accepted review, OR by re-recording the determination and the name check against a re-reviewed certificate
   (⚠ a bare re-review trips `determination_stale` first — TR12); `identity_not_confirmed`; `fee_after_death`; and a check recorded
   `not_required` whose deceased's KYC row is then made `self_declared` by a raw write ⇒ `stale`. The existing refusals keep their order
   (a claim missing BOTH the certificate and the check ⇒ the certificate's 409, as today; missing BOTH the inspection and the check ⇒
   the inspection's).
6. **AC6 — The deny path is never gated (N5, DL9).** A P1 DENY and a final-vote DENY with ⛔ check succeed; `fee_paid_after_death` is
   accepted only while the live check says `after_death` — in `adjudicateClaim`, `reviseDecision` (a revise ONTO it) and the final-vote deny
   (else 409 `<prefix>.fee_paid_after_death_not_shown`); a P1-approved claim whose re-check reads `after_death` is ended by the final-vote
   deny with that code; the code is refused for `approved` by the contract AND the domain (`REASON_CODE_OUTCOME_COMPAT`) and is offered
   with its label in the deny dropdown.
7. **AC7 — The commit (DL6).** Live-DB: a `state_trustee_approved` claim whose check is made stale by a raw supersede is SKIPPED by
   `commitCycleFreeze` (stays `state_trustee_approved`, ⛔ `claim.approved`, ⛔ spawn trigger for it) while a passing sibling commits.
8. **AC8 — Same day (PQ1 (a) — built A).** A check with `fee_outcome 'same_day'` passes the gate; the preview and the console say "Paid on
   the day of death". ONE test names PQ1 (a) so a ruling of B flips it visibly.
   ⚠ **AMENDED 2026-11-21 by [`-474`](../../.decision-log.md#decision-2026-11-21-474) item 2** (the Panel ruled B — `-473` Q1; the words above
   are kept): a `same_day` check now HOLDS the claim with the gate's `fee_after_death` answer and accepts the `fee_paid_after_death` deny;
   the label stays "Paid on the day of death". The ONE test that names PQ1 (a) flips. See AC15.
9. **AC9 — Events and audits (DL11, N7).** `claim.membership_checked` appended per write, the claim state unchanged; `CLAIM_EVENT_TYPES`
   38; the frozen literal `STORY_6_39_CLAIM_EVENTS` listed; every audit line + the event payload contain ⛔ date, ⛔ note, ⛔ name (asserted
   on the serialized payloads, with a planted value).
10. **AC10 — Who (DL7).** Catalog v65 / 96 keys (at `9f5e2c84` — READ LIVE); `district_admin` holds `claim.check_membership` at `district`; a `verifier`, a
    `pariwar_admin` and a `helpline_operator` ⇒ 403 on both routes; a district admin of ANOTHER district ⇒ 403; the human-actor gate
    classifies the new routes file (G15 — COVERAGE_SET 20, `COVERAGE_FLOOR` raised to 20).
11. **AC11 — The fences (G5, G6).** A new 6.39 `it` block in the fence test forbids `decrypt` in the leaf, the writer and the read
    module, with a planted-specimen positive control that turns it red; the handler, the contract and `MembershipCheckControl.tsx` join
    `FENCED_FILES` (`toBe(62)` → `toBe(65)`, a history-comment line — ⛔ a floor); the leaf is in the NW1 transitive import scan
    (`approval-warnings.test.ts`) and passes it.
12. **AC12 — The staff surface (DL12).** Admin component tests: the control renders the two dates, the fee line, the KYC route, the
    posting, and the claim's documents; `confirmed` / `not_confirmed` (radios, nothing pre-selected; reason + note required for
    `not_confirmed`; the advisory criterion shown); `role="alert"` / `role="status"` lines; a stale 409 refetches; hidden when
    `membershipCheckGate.viewer.canCheckMembership` is false. The console's approve-blocked line, `decisionErrorMessage`, the cycle-freeze
    page and the R9 panel map each reason to its copy (⛔ raw code), and a `closure.*` refusal shows the API's plain message. A
    real-browser pass of the console (the 6.33 AC11 route — [[project_admin_browser_pass_launcher]];
    [[project_agent_chrome_cannot_reach_localhost]] — probe once) — or recorded un-attested ([[feedback_record_unattested_no_backfill]]).
13. **AC13 — The gate stays green (DL13).** Every existing approval-path test (the 46 files — TR1) passes with ⛔ assertion changed, its
    fixture given a passing check through `seedNomineeNameCheck`'s new default or `seedPassedMembershipCheck`; the console read budget,
    contracts and admin fixtures updated; `ci:local` ALL jobs green (40 at `9f5e2c84` — READ LIVE) on a FRESH container, DB named `twt_dev` (the story's own port —
    [[project_prepush_hook_inherits_5432]]; 6.38 D7 — a reused DB fails a second run on `PARIWAR_A` residue).
14. **AC14 — The erasure scrub (DL14).** Live-DB as `twt_app`: `anonymizeMember` on a member whose claim carries a check with a note
    (called directly, as 6.21a's anonymize leg for `claim_death_certificate_reviews` does — find it in the anonymize specs) writes the sentinel into
    `note_ciphertext` (1 row matched, ⛔ 0 — the UPDATE policy), leaves a note-less check untouched, and every other column unchanged.
    ⭐ (v1.3) PLUS one leg through the REAL release (now live — DL14): a check with a note recorded, the claim flagged and found
    innocent through `recordFraudFinding`, then `anonymizeMember` — the note scrubbed (template: 6.22's
    `packages/domain/tests/integration/claim/fraud-investigation-rtbf.spec.ts`).
15. **AC15 — Q1 B (`-473` Q1; `-474` items 2–3).** `MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES` is `['after_death', 'same_day']`; a `same_day`
    check gives `{ passed: false, reason: 'fee_after_death' }` (unit), holds every approval site and is skipped by the commit (live-DB,
    one leg each through the existing specs), and `fee_paid_after_death` is accepted for it on the P1 deny. Every staff line that opened
    *"The joining fee was paid after the date of death on the certificate."* now opens *"The joining fee was not paid before the date of
    death on the certificate."* (⛔ other word changed — grep: the old sentence occurs ⛔ in `apps/admin/src`); the console's
    `feeAfterDeathNote` shows for `same_day` as for `after_death` (component test).
16. **AC16 — Q3 B (`-473` Q3; `-474` item 4).** `MemberAppealStatusResponse` gains `refusal_reason: 'not_a_member_when_died' | null` —
    `not_a_member_when_died` iff the claim is `denied` and its LIVE P1 verifier denial OR its LIVE final-vote denial carries
    `fee_paid_after_death` (live-DB: both writers; a `denied` claim with another reason ⇒ `null`; a claim reversed on appeal ⇒ `null`);
    ⛔ the reason code leaves the server. The family's appeal card shows `appeal.refused_not_member` INSTEAD of `appeal.eligible` then, and
    only then (pure-view unit test), in `en` AND `hi`, word for word as `-474` item 4, with a real-`t()` leg
    ([[feedback_stub_must_call_not_transcribe]]).
    ⚠ **AMENDED** (code review 2026-11-21; the words above are kept), under `-474` item 4's *"its LIVE denial"*: the value follows the denial that MADE the claim `denied` — the P1 verifier's (`claim.verifier_denied`) or the final vote's (`claim.state_trustee_denied`, phase `frozen_vote`), an appeal's `upheld` review skipped. So a P1 fee denial reversed on appeal and then denied otherwise — by the final vote or by R9 — ⇒ `null`; a reversal then a final-vote fee denial ⇒ `not_a_member_when_died`; *"a claim reversed on appeal ⇒ `null`"* holds while it is `reversed`. Proved in `membership-check-approval.spec.ts`, "AC16 — through an appeal" (five legs).
17. **AC17 — Q4 B (`-473` Q4; `-474` item 5).** `MemberDeathCertificateStatusResponse` gains `identity_check_waiting: boolean` — `true`
    iff the certificate is `accepted` and `membershipCheckApprovalState` answers `identity_not_confirmed` (live-DB: `true` there; `false`
    for `not_checked`, `stale`, `fee_after_death`, a confirmed identity, and a claim that is no longer in review); ⛔ the gate's reason leaves
    the server. The family's notice keeps `certificate.accepted` and adds `certificate.identity_wait` beneath it then, and only then (pure-view
    unit test), in `en` AND `hi`, word for word as `-474` item 5, with a real-`t()` leg.

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [x] 0.1 `git fetch origin`; confirm `9f5e2c84` (the v1.3 re-verification and rebase point; `beae5116` was the v1.0 pin) is an
        ancestor of HEAD — if `origin/main` has moved, REBASE onto it first (backup branch; records only ⇒ a ledger conflict at most —
        TR15); `git diff --name-only 9f5e2c84 origin/main -- apps packages
        scripts` — re-derive G1–G17 if anything moved; AND `git log 9f5e2c84..origin/main -- .decision-log.md _bmad-output
        docs/launch-gate-inventory` — read any new entry (a ruling on PQ1 / PQ2, a supersession); AND re-read the NUMBERS block across
        EVERY branch and worktree (`git for-each-ref refs/heads refs/remotes` + each `.claude/worktrees/*` dirty tree) before taking a
        decision number, ledger letter, migration or catalog version. Re-verify: G2's "the KYC record cannot change once a claim exists"
        (every writer of `member_kyc_profiles`, every state gate, the callback's TTL); G9's family-facing denial surface; G10's window.
        Check `ListAgents` + the branch before every commit ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [x] 0.2 Put DL1–DL16 to BigDev (DL12's English verbatim; DL3's rejected alternative named). Record the answers here.
  - [x] 0.3 Draft ONE routing note from the template (by path, ⛔ copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-39-fee-date-and-family-told.md` — PQ1 (a) (evidence led by
        `-235` Y and Niyamavali §2.2), PQ1 (b), PQ2 (i) + (ii), and TL1–TL3; plain-English question first, THE ONE FACT, options with an
        honest cost on each, evidence LAST; E4 commands run. Status: WRITTEN, ⛔ sent (BigDev sends). Non-blocking for build and merge;
        ruled before go-live (Row 46). ⭐ **DONE 2026-10-31** (ledger `2026-10-31aj`): the Panel's numbering is **Q1 = PQ1 (a), Q2 = PQ1
        (b), Q3 = PQ2 (i), Q4 = PQ2 (ii)**, told lines 1–3 = TL1–TL3; suggestions B / B / B / B; E4's 13 commands run at `f792d4e3`, all as
        stated (one re-pointed: `-235` Y's reading is found by *"on the day of death or any day after"*). ⚠ (v1.3, 2026-11-21) STILL
        ⛔ SENT, three weeks on, and ⛔ ruled (⛔ decision on `main` answers it). BEFORE BigDev sends it: re-run its E4 commands at the
        rebased HEAD (they ran at `f792d4e3`, 345 commits behind) and fix any that moved — [[feedback_shown_to_panel_means_sent]].
  - [x] 0.4 Decision entry (AUTHOR-COMMIT, the next free number across branches — ≥ `-472` at 2026-11-21, `9f5e2c84`): DL1–DL16 as answered; cites
        `-424` Q1 (a) C and `-430` Q1 B; declares N3's narrowing and DL8's "death documents" match; names PQ1 (a) / (b) and PQ2 as open;
        ⛔ supersedes a ratified entry. Committed ALONE, first. It is also the decision the permission bump block cites (G8).
  - [x] 0.5 Records: `deferred-work.md` — PQ1 (a) / (b) and PQ2 open (trigger: the ruling); a row-`3-13` dated comment in
        `sprint-status.yaml` (a member verified in life by 3-13 skips the identity half — N2 reads `trusteeVerified`); a NEW roster row
        in `docs/launch-gate-inventory/inventory-roster.md` — **Row 46, "Members' claims go live"** (⛔ such row exists: Rows 1–45 ⛔ mention
        it; decision-authored, Row 45's format) with legs: (a) 6.39 `done` on `main`; (b) PQ1 (a) / (b) ruled and reflected in code; (c)
        PQ2 ruled and reflected in code; (d) 6.39's browser pass attested; (e) the fixture KYC provider is never active in production (N2);
        (f) 6.38's D1 (c) (the go-live list it asked for) — ⛔ a PQ that can stay open for ever.
  - [x] 0.6 Ledger line + row `ready-for-dev → in-progress` ([[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [x] **Task 1 — The record (AC1, AC14)**
  - [x] 1.1 Three migrations (the next free numbers; READ the journal LIVE across branches — [[project_sibling_migration_when_order_shared_db]]):
        the verifier enum value ALONE, the state-trustee enum value ALONE (`0120`'s form, DL9), then the table +
        `packages/domain/src/schema/claim_membership_checks.ts` + schema barrel + the RLS policy file + `policies/index.ts` + the branded
        id (DL1).
  - [x] 1.2 RLS / grant / guard / trigger / index live-DB tests (AC1) — copy the 6.21a reviews table's spec.
- [x] **Task 2 — The comparison and the joining receipt (AC2, AC3)**
  - [x] 2.1 `compareFeeDateWithDeathDate` in `claim/fee-death-date.ts` (DL2 — `istDateOf` + `isRealCalendarDate`) + unit tests (AC2).
  - [x] 2.2 `readJoiningFeeReceipt(db, pariwarId, memberId)` (DL3 — the event via the `getLockInClock` pattern, the receipt by
        `(pariwar_id, member_id, utr)`) + live-DB tests (AC3, raw `paid_at`).
- [x] **Task 3 — The writer, routes, event, audits (AC4, AC9, AC10)**
  - [x] 3.1 Domain vocabulary (outcomes, reasons) + contracts mirror `membership-check.ts` + `claims/index.ts` export + lockstep test
        `claims-membership-check.test.ts`; errors in `claim/errors.ts`.
  - [x] 3.2 Writer `recordMembershipCheck` (the claim-row lock only, as the review writer; re-assert the current review id and the
        receipt; supersede; event) — ⛔ `decrypt`.
  - [x] 3.3 Event `claim.membership_checked` (registry, `claim/events.ts` tuple + payload map, reducer no-op arm, count 38, the frozen
        literal `STORY_6_39_CLAIM_EVENTS` — G11).
  - [x] 3.4 The key `claim.check_membership` (G8's places, the bump block citing Task 0.4's decision; READ LIVE the version at the commit).
  - [x] 3.5 Handlers + routes (GET preview — decrypt the certificate date + audit, sentinel → 409; POST) in
        `apps/api/src/modules/claims/claims.membership-check.{handlers,routes}.ts`, registered in `registerClaimsModule`, classified in the
        human-actor gate's COVERAGE_SET (G15); audit types in `audit-sink.ts` through the death-certificate handler's audit path; the
        `membershipCheckGate` packet section + its read-ledger lines + `VERIFIER_CONSOLE_MAX_READS` bump (DL10); the contracts and admin
        fixtures the new required field breaks.
  - [x] 3.6 Tests: the API live-DB legs of AC4; the event + audit planted-value legs of AC9; the 403 legs of AC10 (verifier,
        pariwar_admin, helpline_operator, another district) + the permission / role tests.
- [x] **Task 4 — The gate (AC5, AC6, AC8, AC11)**
  - [x] 4.1 `membership-check-approval.ts` (DL5) — the state function + the assert; wire into `assertClaimApprovable` at DL5's position
        (+ the `@throws` entry); map the error to `<prefix>.membership_check_required` `{ reason }` + a plain message at ALL FOUR
        translators (G16).
  - [x] 4.2 `fee_paid_after_death` (DL9): both enum values + both compat / vocabulary maps + contracts copies + the pinned
        `reasonCodesForOutcome('denied')` list; the domain guard in `adjudicateClaim`, `reviseDecision` AND the final-vote deny
        (`voteOnFrozenClaim`); the `…_not_shown` refusal at the translators.
  - [x] 4.3 Fence amendment (AC11): the 6.39 `decrypt` `it` block + planted control; `FENCED_FILES` additions + `toBe` + history line;
        the leaf in the NW1 scan.
  - [x] 4.4 Fixtures (DL13) BEFORE wiring: the helper + its API twin; the `membershipCheck` option on both `seedNomineeNameCheck`
        fixtures; the direct caller(s) (TR1's corrected list — `peer-mesh-reply`); run the approval-path specs; ⛔ assertion changed.
  - [x] 4.5 Tests: AC5 (six sites × `not_checked` / pass, one site per reason, the KYC raw-write `stale`, the order legs); AC6 (the deny
        legs in all three writers, the post-P1 final-vote deny); AC8 (the ONE test naming PQ1 (a)).
- [x] **Task 5 — The commit re-check (AC7)** — DL6 in `commitCycleFreeze` + live-DB test.
- [x] **Task 6 — The staff surface (AC12)** — client + hooks (copy `postDeathCertificateReview` / `usePostDeathCertificateReview`; add the
      `membership_check.*` stale codes to the refetch list); `MembershipCheckControl.tsx` (presentational; the route owns the mutation);
      the approve-blocked arm; the FOUR mappings (G16) + `membershipCheckRequiredMessage`; the reason label + the not-shown refusal copy in
      `i18n-en.ts`; component tests; the browser pass (or un-attested).
- [x] **Task 7 — Close** — DL15 comment; DL14 anonymize + AC14's leg; `deferred-work.md` round-4 item A of 6.38 annotated "Closed by 6.39
      (built A on PQ1 (a) / PQ2 until ruled)"; `ci:local` on a FRESH container on the story's own DB; Completion Notes, File List, Change
      Log; Status → review.
- [x] **Task 8 — Build three of the Panel's four answers (`-473`; `-474`) — AC15, AC16, AC17** ⭐ added 2026-11-21 (story v1.7)
  - [x] 8.1 Q1 B: the constant, its comment, the AC8 test flipped; the four staff lines re-worded; `feeAfterDeathNote` for `same_day`.
  - [x] 8.2 Q3 B: the domain read (live denial reason, both vocabularies), the contract field, the handler, the mobile view + copy (`en`, `hi`).
  - [x] 8.3 Q4 B: the contract field, the handler (through `membershipCheckApprovalState` — the ONE definition), the mobile view + copy.
  - [x] 8.4 Tests (AC15–AC17), the contracts fixtures ([[project_contracts_tests_outside_tsc]] — a new REQUIRED field breaks them), the
        friction / microcopy gates; `ci:local` on a FRESH container on the story's own DB; records; Status → review.
  - ⛔ Q2 B — row `6-39a-bank-date-for-a-fee-recorded-after-the-death` (`-474` item 1).

### Review Findings

Code review 2026-11-21 (`bmad-code-review`, mode `full`): the whole branch `9f5e2c84..c5041036`, source only (66 files; tests and
records read in the tree, not in the diff). Three parallel read-only layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 1
decision-needed, 9 patch, 0 defer, 11 dismissed. Every finding was re-verified by hand at `c5041036`. Who decides (§0): all are the
AUTHOR's. None is the Panel's.
⭐ **RESOLVED 2026-11-21** (BigDev: *"1"* for the decision, then *"all"* for the patches): the decision became the first patch, under
author-commit [`-475`](../../.decision-log.md#decision-2026-11-21-475) (`68ac6305`, committed ALONE, before the code); all ten patches
APPLIED in `27898db7`. Each new test was proved RED first by reverting its fix (the lost-update guard: the writer, API and race legs
red; the refusal-reason read: the "after a reversal" leg red — which first showed that the leg needed the appeal's journey row, now
seeded; the UTR line: the fee re-confirm leg red). Run at `27898db7`: typecheck (4 packages), lint (changed files), the domain unit
suite (893), contracts (18), admin (111), the API unit suite with the fence (1154), the jobs fences (15), the microcopy and
human-actor gates, the OpenAPI determinism gate; live-DB on the story's `twt-639-pg` (:5449, ⛔ fresh — reused by this session's
targeted runs): domain 41/41 (the approval, concurrency and joining-receipt specs), API 63/63 (membership-check, appeal,
vyawastha-shulk, required-routes). ⚠ **`ci:local` on a FRESH container NOT run** — recreating the container and `db:migrate` were
refused by the session's auto-mode classifier; recorded un-attested ([[feedback_record_unattested_no_backfill]]), so the Status
stays `review` until that run is green. ⚠ The real-browser pass of the console (Row 46 (d)) stays un-attested; the console changed
again here (the note now follows `fee_blocks_approval`; the `check_changed` refusal and its refetch).
⚠ **CORRECTED by round 2** (the words above are kept): (i) *"Each new test was proved RED first"* is TRUE only of the three named —
the lost-update guard, the refusal-reason read, the UTR line; the AC15 / AC17 legs pin behaviour that already existed (⛔ fix to revert),
and the N1, contract and predicate tests were ⛔ reverted. (ii) `ci:local` on a FRESH container has SINCE RUN: **40 / 40 at
`fb14510e`** on `twt-639-review-pg` (port 5450, DB `twt_dev`, 212 migrations — BigDev ran `db:migrate` from the worktree after the
session's was refused), so the stated condition for leaving `review` is met. (iii) Patches 3 and 4 were BUILT as the code
`check_changed`, ⛔ `stale` (DL10's amendment note).

- [x] [Review][Decision] ⭐ RESOLVED 2026-11-21 by BigDev: option (a) — now the first [Review][Patch] below. A member who paid can leave the claim with no way to ever be checked, and "Escalate this claim" does not unblock it —
  DL3's reachable case is a gate-failed confirm re-confirmed with the same `tr` and a corrected UTR. The vyawastha-shulk re-confirm keeps
  the stored receipt's ORIGINAL UTR, but writes `utr: body.utr` (the corrected one) into the `pending-fee → lock-in` event. So
  `readJoiningFeeReceipt` finds no receipt of this member and every POST returns 409 `no_fee_receipt`. DL3 names "a staff escalation" as
  the exit, and the refusal copy says "Escalate this claim." But the gate runs at BOTH steps and at all six sites, so the escalation's
  approve, the final vote and R9 finalize all answer `not_checked`. The only exit is a denial on another ground. No deferred-work entry
  records the dead end. Options: (a) fix the source — the re-confirm's lock-in event carries the STORED receipt's UTR (a 3.x payload
  change; forward-only, since nothing is live); (b) DL3 falls back to the member's receipt named by the lock-in path (re-opens BigDev's
  2026-10-31 rejection of "earliest receipt"); (c) keep fail-closed, record the dead end in deferred-work and the roster, and change the
  refusal copy so it no longer promises an exit. [`packages/domain/src/claim/membership-check-read.ts:79`;
  `apps/api/src/modules/vyawastha-shulk/handlers.ts:304`; `apps/api/src/modules/claims/claims.membership-check.handlers.ts:76`]
- [x] [Review][Patch] (from the Decision, option (a)) The fee re-confirm's `pending-fee → lock-in` event records the STORED receipt's UTR, not `body.utr`, so DL3's lookup always finds the joining receipt. Needs an author-commit decision entry FIRST (a 3.x event-payload change); a live leg: gate-failed confirm, then a re-confirm with the same `tr` and a corrected UTR ⇒ the check records against that receipt; AC3's "corrected UTR ⇒ 409 `no_fee_receipt`" leg then becomes the defence-only raw-fixture case. The refusal copy keeps "Escalate" only if a real exit remains [`apps/api/src/modules/vyawastha-shulk/handlers.ts:304`; `packages/domain/src/claim/membership-check-read.ts:79`]
- [x] [Review][Patch] Staff intro still says the fee must be paid "no later than the date of death", which contradicts `-473` Q1 B (a same-day fee holds); checklist family 11 REAL GAP. Reword to `-474`'s staff phrase ("not paid before the date of death"); fix the two comments; annotate the Policy-meaning sentence (§ line 132) as amended by `-474`, keeping the original words [`apps/admin/src/modules/claim-verification/i18n-en.ts:941`; `packages/domain/src/rbac/permissions.ts:1606`; `packages/domain/src/ids/index.ts:824`]
- [x] [Review][Patch] Lost update: a re-check silently supersedes a live check the writer never saw (A records `not_confirmed`; B, on a preview with `staleTime: Infinity`, records `confirmed` and the hold is gone); checklist family 12 (c) REAL GAP. Add `expected_live_check_id: uuid | null` to the request (the preview already returns `live_check`), refuse `stale` under the lock when it does not match, admin sends it, plus an API leg [`packages/domain/src/claim/membership-check-persist.ts:212`; `packages/contracts/src/claims/membership-check.ts:75`]
- [x] [Review][Patch] No two-connection race test for the writer (two concurrent POSTs ⇒ one live row, one supersede, one event each), and 23505 on `claim_membership_checks_one_live_per_claim_uq` is unmapped (a 500 if the lock were ever bypassed); checklist family 2 REAL GAP. Add the live race leg; map 23505 to `membership_check.stale` in `translate` [`packages/domain/src/claim/membership-check-persist.ts:177`; `apps/api/src/modules/claims/claims.membership-check.handlers.ts`]
- [x] [Review][Patch] AC15 needs live-DB `same_day` legs at "every approval site … and is skipped by the commit"; only P1 has one. Add the legs, and rename the misnamed commit test (titled `stale`, but its second leg is `identity_not_confirmed`) [`packages/domain/tests/integration/claim/membership-check-approval.spec.ts:640`; `apps/api/tests/integration/claims/membership-check-required-routes.spec.ts`]
- [x] [Review][Patch] AC17's live-DB legs are missing `stale` and "a claim that is no longer in review" (the window conjunct that makes the line go away is untested) [`apps/api/tests/integration/claims/membership-check.spec.ts:574`]
- [x] [Review][Patch] `refusal_reason` reads `null` for a GENUINE fee refusal by the final vote after an appeal reversal: the blanket `NOT EXISTS (… status = 'reversed')` blanks it. Nothing shows today (one appeal per claim, so the affordance never renders), but it departs from `-474` item 4's "its LIVE denial"; checklist family 11 REAL GAP. After a reversed appeal, count only a final-vote denial decided after the appeal's decision. Add a live leg on the real path, not the raw `denied`-and-`reversed` fixture [`packages/domain/src/claim/membership-check-read.ts:176`]
- [x] [Review][Patch] Second hand-written definition of the blocking fee outcomes in admin (`'after_death' || 'same_day'`), against N1's "⛔ a second definition anywhere". Have the preview carry a server-derived flag (e.g. `fee_blocks_approval`) from `MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES` [`apps/admin/src/modules/claim-verification/MembershipCheckControl.tsx:186`]
- [x] [Review][Patch] Deny-guard refusal says "found the fee was paid after the death", but the reason now also covers a same-day fee. Align it to `-474`'s staff phrase ("found the fee was not paid before the date of death") in both copies [`apps/admin/src/modules/claim-verification/i18n-en.ts:1058`; `apps/api/src/modules/claims/membership-check-required-message.ts:28`]
- [x] [Review][Patch] Task 8's top-level box is unticked while 8.1–8.4 are ticked and v1.8 says DEV COMPLETE [this file, Task 8]

Dismissed (11, each re-verified): claims stranded past the window (DL6's recorded raw-write-only dead end; R9's other from-states are in
the window; nothing is live); two receipts with one UTR (`UNIQUE (pariwar_id, utr)`, 0029); family reads 500 on RLS (the live-DB API
legs run as the family session); two "current accepted certificate" readers (`getCurrentAcceptedDeathCertificate` IS the snapshot);
the gate ignores the receipt (one receipt per UTR; the joining event is fixed); the note column UPDATE grant (6.21a's scrub-column
pattern); `ON DELETE cascade` (sibling pattern; receipts have no DELETE grant); the fee deny offered only on `ready_to_freeze` (that
bucket holds `reversed`); two pooled connections (the repo-wide `openScopeTx` pattern); "latest posting" as a raw id (a plaintext
district name); other producers of the new required fields (typecheck + `ci:local` 40/40).

### Review Findings — round 2 (the fix diff)

Adversarial review 2026-11-21 of the FIXES (`c5041036..fb14510e`, 26 files; three parallel read-only layers), run at BigDev's ask
after `ci:local` went **40 / 40 green at `fb14510e`** on a FRESH container (`twt-639-review-pg`, port 5450, DB `twt_dev`; 212
migrations; BigDev ran `db:migrate` from the worktree). 1 decision-needed, 9 patch, 1 defer, 13 dismissed. Each finding re-verified
by hand. Who decides (§0): all the AUTHOR's; none the Panel's.

- [x] [Review][Decision] ⭐ RESOLVED 2026-11-21 by BigDev (*"1"*): option (a) — recorded in author-commit [`-476`](../../.decision-log.md#decision-2026-11-21-476) (`536925b5`, committed ALONE). Patch 9 rewrote a staff line that `-472` DL12 approved WORD FOR WORD — *"This reason can be used only when the membership check found the fee was paid after the death."* → *"… found the fee was not paid before the date of death."* (API, admin, domain error) — with no decision entry; `-475`'s Consequences wrongly said the other patches "need no entry". BigDev's "all" covered the patch text that quoted the new words, so the approval exists in the session, ⛔ in the log. Options: (a) record it in a new author-commit entry (`-476`) that amends DL12's not-shown line and also corrects `-475`'s two slips (the "REACHABLE" / "a staff escalation" words it quotes are the STORY's DL3, which `-472` adopted as written; "Please tell the Super Admin." was the helpline and ground-inspection surfaces' words, ⛔ this console's); (b) revert the line to DL12's words. [`apps/admin/src/modules/claim-verification/i18n-en.ts:1059`; `apps/api/src/modules/claims/membership-check-required-message.ts:28`; `packages/domain/src/claim/errors.ts:699`]
- [x] [Review][Patch] The story's spec text was not annotated for `-475` / the fixes (the AC8 "⚠ AMENDED … words kept" pattern): G3 and DL3 (the event carries the body's UTR; "It is REACHABLE"; "a staff escalation"), AC3 (a real corrected-UTR re-confirm now FINDS the receipt; the 409 leg is the raw defence), AC16 (keyed on the denial that made the claim denied — a P1 fee denial reversed then denied otherwise ⇒ `false`; a reversal then a final-vote fee denial ⇒ `true`), DL10 (the required `expected_live_check_id`; the new code `check_changed`), patches 3 and 4 (built as `check_changed`, ⛔ `stale`), the Niyamavali bullet that still says a same-day fee is built as "after… the drive may open", and the Policy-meaning note's "operative" sentence (true only once row 6-39a builds Q2 B) [this file]
- [x] [Review][Patch] Records: the green `ci:local` (40 / 40 at `fb14510e`) shown on the round-1 note, a Change Log row, the ledger and Completion Notes; the "each new test proved red first" over-claim narrowed to the three named (the AC15 / AC17 legs pin behaviour that already existed); the File List gains the six files of `27898db7` [this file; `sprint-status.yaml`]
- [x] [Review][Patch] Stale comments: `membership-check-read.ts` header (the DL3 note still says the event carries the BODY's UTR); its escalation note (after an escalation denial there is ⛔ live verifier decision — `resolveEscalation` supersedes the escalated row — ⛔ "an `escalated` one"); the `phase = 'frozen_vote'` narrowing stated (only the final vote may carry the reason: DL9, the escalation refuses it, R9's denial is always `r9_panel_denied`); `membership-check-persist.ts` header guard list lacks (5b) [`packages/domain/src/claim/membership-check-read.ts:16`, `:150`; `packages/domain/src/claim/membership-check-persist.ts:11`]
- [x] [Review][Patch] `check_changed` audit: the rejection's context records neither the client's `expected_live_check_id` nor a way to see which check blocked it (family 8) — add the client-echoed token beside the client-echoed review id [`apps/api/src/modules/claims/claims.membership-check.handlers.ts`]
- [x] [Review][Patch] The `check_changed` words blame "another" check — a lost-response RETRY of the staff member's OWN committed check gets them too. Neutral words: *"The membership check on this claim changed since you opened it. It has been reloaded — check again."* (API: *"… — open it again."*) [`apps/admin/src/modules/claim-verification/i18n-en.ts:1046`; `apps/api/src/modules/claims/claims.membership-check.handlers.ts`]
- [x] [Review][Patch] The `-475` live leg re-writes the DL3 join by hand — call `readJoiningFeeReceipt` itself, so the leg fails if the reader drifts [`apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts`]
- [x] [Review][Patch] The 23505 backstop's catch path is untested (the race spec is serialised by the claim lock, so it proves (5b)). Constructible: a holder inserts a live row RAW without the claim lock, uncommitted; the writer passes (5b), blocks on the index; the holder commits ⇒ the writer's typed `check_changed`, ⛔ a 500. ⚠ **Applied as far as it can be — the claim was WRONG:** built that way, the leg ran GREEN with the 23505 mapping REMOVED. The raw insert's FK check takes a KEY SHARE lock on the claim row, which conflicts with the writer's `FOR UPDATE`, so the writer waits at (1) and (5b) answers. Every inserter of a check row serialises on the claim row: the backstop is NOT constructible (covered by construction; the predicate test stands). The leg is kept, renamed for what it proves (a lockless raw writer still serialises), and the comments say so [`packages/domain/tests/integration/claim/membership-check-concurrency.spec.ts`]
- [x] [Review][Patch] `refusal_reason` branches untested: an ESCALATION's denial (`claim.verifier_denied` with ⛔ live verifier decision) and an R9 denial after a reversal (`claim.r9_outcome`) ⇒ `false` even with a P1 fee row still live [`packages/domain/tests/integration/claim/membership-check-approval.spec.ts`]
- [x] [Review][Defer] On a re-confirm with a corrected UTR the corrected value is now stored NOWHERE in full (the receipt and the event keep the first one; the audit keeps only the masked last four), and the event's `amount_inr` still comes from config, not the receipt (no reader today) [`apps/api/src/modules/vyawastha-shulk/handlers.ts:307`] — deferred: a reconciliation concern for row 6-39a (the Trust's bank statement), ⛔ the gate's

Dismissed (13): `event_version` "may be a schema version" (it is the per-stream sequence: `events_log_stream_id_event_version_uq`, ≥ 1, monotonic); the `frozen_vote` narrowing as a bug (only the final vote can carry the reason — recorded above as a comment fix); the preview's `live_check` null while a live row exists (`getLiveMembershipCheck` reads any live row); other writers of the joining lock-in event (only the joining confirm writes `pending-fee → lock-in`; line 552 is the renewal); the upheld leg "passes on the old read" (it is what proves the CTE's appeal-review skip: without the skip the latest denial is the review and the read is `false`); the console re-sending after a refetch (the form's fingerprint includes `live_check.check_id`, so the answer resets); the API appeal leg being weak (the domain legs carry it — by design, said in its comment); the OpenAPI / error catalogue (the determinism gate is green; the route is not in `openapi/v1.yaml`); the concurrency spec's committed members and receipts (a fresh tenant, the sibling specs' pattern); the "Fee paid after the death" label beside "not paid before" (`-474` kept the label); the escalation result (correct; only its comment is wrong — above); the 23505 path "unreachable" as a bug (it is the backstop — its test is above); the audit's masked body UTR differing from the event (folded into the defer).

## Dev Notes

### Traps

- **TR1 — The fixture blast radius.** Adding a conjunct to `assertClaimApprovable` turns RED every existing test that approves a claim
  (P1, final vote, R9, D27, `-251`, the cycle-freeze commit and everything downstream that seeds an `approved` claim THROUGH the
  approval paths). Traced at `beae5116`: **44 files**, + 2 at `9f5e2c84` (v1.3 — Story 6.22: API `fraud-investigation-routes.spec.ts`,
  which drives a P1 approve and a final vote to `state_trustee_approved`, and domain `fraud-investigation.spec.ts`, whose "PQ7 (built C)"
  test asserts `assertClaimApprovable(...)` RESOLVES at both steps — both through `seedNomineeNameCheck`) ⇒ **46** — API
  (`apps/api/tests/integration/claims/`, 14 + 1): `approval-warnings-every-approver`,
  `approval-warnings`, `correction-closure`, `cycle-freeze`, `death-certificate`, `ground-inspection-required-routes`,
  `nominee-declaration`, `nominee-name-check`, `one-payment-per-death-routes`, `r9-voting`, `suspicion-refusal-routes`,
  `verifier-console-shape`, `verifier-console`, `verifier-decision` (`.spec.ts`); domain (`packages/domain/tests/integration/claim/`, 30):
  `_correction-closure-fixture.ts`, `approval-warnings{-death-facts,-every-approver,-peer-reply,}`, `concealment`, `correction-chase`,
  `correction-closure{-concurrency,}`, `correction-queue-late-{inspection,peer-reply}`, `death-certificate`,
  `ground-inspection-{approval,questionnaire}`, `nominee-name-check{-return-loop,}`, `nominee-refusal-inheritance`,
  `one-payment-per-death{-closure,-concurrency,-guard,-paths,-warning,}`, `peer-mesh-reply`, `r9-voting{-concurrency,}`,
  `state-trustee-cycle-freeze{-concurrency,}`, `suspicion-refusal{-concurrency,}` (`.spec.ts`), + 1 domain (6.22, above). ⚠ CORRECTED
  v1.3 (the v1.1 "four" was wrong at the pin too): all but TWO go through `seedNomineeNameCheck` — `_correction-closure-fixture.ts`
  CALLS it (twice), and `one-payment-per-death-concurrency` reaches it through `_one-payment-fixtures.ts` — so DL13's default fixes
  them. The two that do ⛔: `peer-mesh-reply` (`seedAcceptedDeathCertificate` + a direct `assertClaimApprovable`) calls
  `seedPassedMembershipCheck` directly; `nominee-refusal-inheritance` only DENIES (N5 — ⛔ gated), so it is expected untouched — run it.
  NOT in the list (they reach `approved` by a RAW drive or approve nothing, ⛔ through the gate): 6.22's `fraud-convergence-door`,
  `member/overlay-three-readers`, `fraud-investigation-live-processes`.
  Admin `.tsx` tests mock the API (unaffected by the gate; affected by the packet field — DL10). Re-run the list in Task 4.4 BEFORE wiring
  (6.21a D12 did the same); fix by seeding a passing check, ⛔ by weakening.
- **TR2 — Order.** Insert AFTER the ground inspection, BEFORE the final-only conjuncts; the late-warning wait stays LAST. A test missing
  two conjuncts must still see the earlier one's 409 (AC5).
- **TR3 — ⛔ decrypt in the domain** (G5). The preview handler decrypts; the writer and the gate never do. Envelope ciphertext never
  compares equal; the blind index gives EQUALITY only — ordering needs the plaintext, in the handler.
- **TR4 — The leaf** (G6). `membership-check-approval.ts` must not import the determination writer or anything that does — add it to the
  NW1 transitive import scan (`approval-warnings.test.ts`) and run the runtime import, ⛔ only typecheck
  ([[project_type_only_import_cycle_trap]]).
- **TR5 — The joining receipt is ⛔ the earliest receipt and ⛔ the latest** (G3, DL3) — and ⛔ matched by `(pariwar_id, utr)` alone.
- **TR6 — IST.** `paidAt` is UTC in the DB; the certificate date is a local date. `istDateOf` (`holiday-resolver.ts` — ZERO imports,
  verified) is safe from any module; ⛔ `member/workplace.ts` `istToday` (it imports drizzle / db / schema).
- **TR7 — Two dates on the claim.** The inspector's death date (G4 (ii)) is ⛔ "the date on the certificate" — the ruling says the
  certificate; use the ACCEPTED review's date only.
- **TR8 — Bodyless POST.** Tests post `'{}'` where a body is optional ([[project_fastify_empty_json_body_400]]); this POST has a body.
- **TR9 — Admin copy.** English only, in `claim-verification/i18n-en.ts` (`verifierConsoleEn`) — ⛔ Hindi, ⛔ `t()` catalog, ⛔ parity
  gate in the admin app (G17). The API message for `closure.*` is shown verbatim (G16) — write it as staff copy.
- **TR10 — `ALTER TYPE … ADD VALUE` gets its OWN migration file** (`0120` / the `0040` posture) — a value cannot be used in the
  transaction that added it; a fresh-DB `ci:local` proves the pair
  ([[project_known_livedb_test_failures]] — own container, DB named `twt_dev`).
- **TR11 — Every `git push` needs the story's `DATABASE_URL`** prefixed ([[project_prepush_hook_inherits_5432]]).
- **TR12 — A re-review trips an EARLIER conjunct.** A later re-review or replacement makes the nominee determination
  `determination_stale` (`nominee-determination-persist.ts`), refused BEFORE this conjunct is reached. A test of `stale` must re-record
  the determination and the name check against the new review, or use a raw supersede (AC5).
- **TR13 — The wire-code shape.** Approval-gate codes are PREFIXED per route (G16) — ⛔ `claim.membership_check_required` anywhere;
  route-level codes are `membership_check.*`. The admin matches with `endsWith`.
- **TR14 — Two deny vocabularies.** P1's verifier reasons and the final vote's state-trustee reasons are separate enums with separate
  contracts copies and separate pgEnums (DL9) — a code in only one leaves a post-P1 `after_death` claim with ⛔ way to end it.
- **TR15 — Sibling branches.** (v1.3) The 2026-10-31 siblings (`12-1`, `11b-5a`) have LANDED; at `9f5e2c84` the only open sibling is
  `story/6-22b-…` (records only, migration `0198` / catalog 58 / decision `-440` — all below `main`). This branch carries ⛔ code, so a
  rebase conflicts only in `sprint-status.yaml` ([[project_rebase_ledger_conflict_separator]] — keep both, re-check the `---`). Still read
  numbers across EVERY branch and worktree at each commit that takes one (Task 0.1) — a new sibling can appear.

### What this story does ⛔ do

⛔ Change the intake door (6.38) or any lifecycle state; ⛔ write `trusteeVerified` (3-13); ⛔ emit `lock_in_expired` (3-14); ⛔ new
family-facing or helpline words (PQ2); ⛔ deny automatically; ⛔ store a second copy of either date; ⛔ make the fee comparison overridable
(PQ1 (b)); ⛔ surface commit skip reasons; ⛔ build an in-app documents request; ⛔ decrypt the address for staff.

### Project Structure Notes

- Domain: `packages/domain/src/claim/membership-check-approval.ts` (leaf), `claim/membership-check-persist.ts` (writer),
  `claim/membership-check-read.ts` (the joining receipt + KYC route reads, ⛔ decrypt), `claim/fee-death-date.ts` (DL2, import-free),
  `claim/index.ts` barrel, `schema/claim_membership_checks.ts` + schema barrel, `policies/claim-membership-check-rls.ts` +
  `policies/index.ts`, `ids/index.ts` (`ClaimMembershipCheckId`), `claim/verifier-decision.ts` + `claim/state-trustee-decision.ts`
  (DL9), `member/anonymize.ts` + `encryption/field-classes.ts` (DL14); migrations — two enum values + the table, the next free numbers
  across branches (`0210` / `0211` / `0212` at `9f5e2c84`).
- Domain tests: `tests/integration/_helpers.ts` (helper + the `seedNomineeNameCheck` option), `tests/claim/nominee-name-no-comparison-fence.test.ts`,
  `tests/claim/approval-warnings.test.ts` (NW1), `tests/claim/nominee-name-check-events.test.ts`, `tests/claim/dpdpa-consent-events.test.ts`,
  `tests/rbac/{permissions,roles}.test.ts`.
- Events: `packages/events/src/registry.ts`.
- API: `apps/api/src/modules/claims/claims.membership-check.{handlers,routes}.ts`, `claims/index.ts` (registration), the four
  translators (G16), `claims.verifier-console.handlers.ts` (packet section + read budget), `audit/audit-sink.ts`, `context.ts`;
  `apps/api/tests/integration/_nominee-name-check-fixture.ts`; `scripts/claim-adjudication-human-actor-invariant/check.ts`.
- Contracts: `packages/contracts/src/claims/membership-check.ts` + `claims/index.ts` export, `verifier-console.ts`,
  `verification-decision.ts` + the state-trustee decision contract (DL9); tests `claims-membership-check.test.ts`,
  `claims-verifier-decision.test.ts`, `claims-verifier-console.test.ts`.
- Admin: `apps/admin/src/modules/claim-verification/MembershipCheckControl.tsx`, `claim-verification/nominee-errors.ts`,
  `claim-verification/i18n-en.ts`, `api/client.ts`, `api/hooks.ts`, `routes/VerifierConsoleRoute.tsx`,
  `modules/cycle-freeze/CycleFreezePage.tsx`, `modules/r9-voting/R9CasePanel.tsx`.
- Records: `docs/launch-gate-inventory/inventory-roster.md` (Row 46), `deferred-work.md`, `sprint-status.yaml`, `.decision-log.md`.

### References

- `.decision-log.md` — `2026-10-31-424` (Q1 (a) C, Q3 B, readings), `2026-10-31-430` (Q1 B, readings, Consequence 1), `-425` (6.38's DLs),
  `2026-09-20-235` Y (the day-of-death boundary), `-236` BB, `-239` (the post-death refusal grounding).
- Niyamavali (git-ignored copy, main checkout `docs/legal/niyamavali.md`) §2.1, §2.2, §4.1, §6.2.
- `6-38-…md` deferrals D1 (c) (the go-live list), D6 (admin `apiFetch` ⛔ timeout), D7 (`PARIWAR_A` residue — fresh container).
- 6.21a's commit `67121138` — the true file set for a new claim table, event and key.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-38-door-and-after-death.md`,
  `…-2026-10-31-6-38-paid-after-death.md` (the questions as put).
- `_bmad-output/implementation-artifacts/6-21-death-certificate-clear-date-rule.md` (6.21a — D7, D8, T5, T8, T9, T10, D12).
- `_bmad-output/implementation-artifacts/6-38-death-locks-erasure-and-non-member-claims-refused.md` (the door; DL6 / DL14 patterns).
- `sprint-status.yaml` rows `6-39-…`, `3-13-…`, `3-14-…`; `deferred-work.md` round-4 item A of 6.38 (DISCHARGED into this row).

## Dev Agent Record

### Agent Model Used

Claude Fable 5.2 (`claude-fable-5-2`) — `bmad-dev-story 6.39`, 2026-11-21, in the story's own worktree.

### Debug Log References

- The story's own database: container `twt-639-pg`, port 5449, DB `twt_dev` (recreated fresh before each `ci:local`). Every test and
  `ci:local` command was typed with that `DATABASE_URL` (the shell exports `:5432` — [[project_prepush_hook_inherits_5432]]); `:5432`
  and `:5433` were ⛔ touched.
- Approval-path specs BEFORE wiring the conjunct (fixtures in, gate not wired): domain `tests/integration/{claim,member}` 119 files /
  1602 tests, API `tests/integration/claims` 43 files / 695 tests — all green. AFTER wiring: 6 failures in 2 files
  (`nominee-name-check.spec.ts` ×2, `approval-warnings-every-approver.spec.ts` ×4) — each builds its claim outside the fixture default
  or re-reviews the certificate; fixed by seeding a passing check, ⛔ an assertion changed.
- Mutation checks (a spec that went green first time is ⛔ trusted until it has failed once): the conjunct removed from
  `assertClaimApprovable` ⇒ 13 of the gate spec's tests fail; the commit skip removed ⇒ both AC7 tests fail; the erasure spec was
  run RED before the scrub existed (2 of 2 failed), then green.
- Runtime import of each touched module on its own (`tsx -e import(...)`): the leaf, `nominee-name-check`,
  `nominee-determination-persist`, the writer, the read, both decision writers — ⛔ init cycle (TR4).

### Completion Notes List

- 2026-10-31 — Created by `bmad-create-story 6.39`: ultimate context engine analysis completed — comprehensive developer guide created.
  Three read-only traces at `beae5116` + a hand re-read. DL1–DL16 PROPOSED; PQ1 / PQ2 PROPOSED (non-blocking).
- 2026-10-31 — Validated (`bmad-create-story validate 6.39`, BigDev: "all"): four read-only traces at `beae5116` (the gate; KYC / fee /
  date of death; staff surface / keys / numbers; governance + the footgun sweep) and a hand re-read of `-235` Y, Niyamavali §2.2, the
  `adjudicateClaim` state guard and the KYC provider fallback.
- 2026-11-21 — Drift-validated (`bmad-create-story validate 6.39`, BigDev: "all, then rebase") at `origin/main` `9f5e2c84`: two read-only
  traces (the gate / denials / commit / fixtures; KYC / fee / keys / console / anonymize / numbers), the load-bearing numbers re-read by
  hand; 2 critical / 6 should-fix / 3 low, ALL applied (v1.3); branch rebased onto `9f5e2c84`.

- 2026-11-21 — **Dev started (`bmad-dev-story 6.39`). Task 0 — governance first.**
  - **0.1** `git fetch origin`: `origin/main` = `9f5e2c84` = the branch's base (⛔ drift — `git diff 9f5e2c84 origin/main -- apps packages
    scripts` EMPTY; ⛔ new governance commit). Numbers re-read live across every ref and worktree (all clean): decision `-471` highest
    anywhere, migration `0209`, catalog v64 / 95, `CLAIM_EVENT_TYPES` 39, `FENCED_FILES` 62, `COVERAGE_FLOOR` 19,
    `VERIFIER_CONSOLE_MAX_READS` 33. G2 re-checked (`trusteeVerified` is written `false` only — `kyc.handlers.ts` ×2, `profile-write.ts`
    default); G10's window unchanged. `ListAgents`: one idle peer session, ⛔ in this worktree.
  - **0.2 — BigDev's answers (the question dialog, 2026-11-21):** DL1–DL16 — **"Accept all 16 (Recommended)"**; DL3 (the joining
    receipt) — **"The lock-in event's receipt (Recommended)"** (the rejected alternative, "The member's earliest receipt", was named);
    DL12 (the English staff copy, shown verbatim) — **"Approve verbatim (Recommended)"**. ⇒ every DL is built as written in v1.3.
  - **0.4** Author-commit decision `2026-11-21-472`, committed ALONE (`3fd29221`). ⚠ Two things it does NOT claim, on purpose: it does
    ⛔ cite `-210` cl. 2 for the two enum values (that delegation is for tracking vocabularies — unverified for a deny reason, so left
    out), and it quotes `-430` Q1 B with its own glyph.
  - **0.5** Roster Row 46 `members-claims-go-live` (six legs, all open; leg (f) asks for a dated line, ⛔ for Row 47 to be closed —
    `-262` FQ4 B); `deferred-work.md` — PQ1 (a) / (b) and PQ2 open, trigger the ruling; a dated comment on row `3-13`.
  - **0.6** Ledger `2026-11-21d`; row `ready-for-dev → in-progress`; the YAML parses (314 rows).

- 2026-11-21 — **Tasks 1–7 built (`bmad-dev-story 6.39`).** What follows is what was ACTUALLY built and tested.
  - **Task 1 — the record.** Migrations `0210` / `0211` (the two `fee_paid_after_death` enum values, each alone) and `0212`
    (`claim_membership_checks`: one LIVE row per claim, append-only with a column-aware guard, one-way supersession, RLS with
    SELECT / INSERT / UPDATE legs, the note scrubbable at birth). 17 live-DB tests assert each backstop directly (AC1).
    ⚠ The outcome / reason columns are `text` + a named CHECK (the `0122` reviews table's own idiom, lockstep TS tuples), ⛔ pg enum
    types — DL1's "enum" is read as "a closed set"; a later widening (e.g. PQ1) then needs ⛔ `ALTER TYPE`.
  - **Task 2.** `compareFeeDateWithDeathDate` (import-free but for `holiday-resolver`; 21 unit tests at the 18:30Z boundary) and
    `readJoiningFeeReceipt` (the lock-in event's UTR, matched by Pariwar + member + UTR; 6 live-DB tests incl. the other-member leg).
  - **Task 3.** The writer `recordMembershipCheck` (the claim-row lock; the review and the receipt re-asserted; the identity half
    re-read under the lock; supersede; ONE event), the 40th claim event `claim.membership_checked`, the key `claim.check_membership`
    (catalog v65 / 96 keys, `district_admin`), `GET` preview + `POST` under the human-actor chain (COVERAGE_SET 20 / floor 20), three
    audit types, the contracts mirror + lockstep test, and the console packet's `membershipCheckGate` (read budget 33 → 36: the gate
    reads through its own state function — three statements).
  - **Task 4.** The leaf `membership-check-approval.ts` (ONE resolver — the conjunct, the commit re-check, the deny-reason guard and
    the console all call it), wired into `assertClaimApprovable` after the ground inspection; 409 `<prefix>.membership_check_required`
    `{ reason }` at the four translators with DL12's words; `fee_paid_after_death` on both vocabularies with its guard in
    `adjudicateClaim`, `reviseDecision` and `voteOnFrozenClaim`; the fence block (⛔ `decrypt` / a date's or a name's ciphertext in the
    leaf, writer and read — with a planted control) and `FENCED_FILES` 62 → 65; the leaf in the NW1 import scan; the fixtures
    (`seedMembershipCheck` / `seedPassedMembershipCheck` / `ensurePassedMembershipCheck` + the `membershipCheck` option, both twins).
  - **Task 5.** `commitCycleFreeze` skips and keeps a claim whose check no longer passes (AC7 — the sibling commits; a later commit
    takes the kept claim once it passes again).
  - **Task 6.** `MembershipCheckControl.tsx` (presentational; the route owns the preview-on-open, the mutation and the claim keying),
    the approve-blocked arm, the four mappings, the reason label on the District Admin's dropdown and on the final vote's list.
  - **Task 7.** The erasure scrub (only where a note exists; 30 tables / 33 statements), AC14's two legs (direct, and through 6.22's
    real innocence release), the intake door's comment, the jobs "a notice writes ⛔ decision" fences (table + writer), records.
- **Decisions made while building — each is the session's, flagged for the reviewer:**
  1. **`same_day` passes** (PQ1 (a), built A) through ONE constant, `MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES = ['after_death']`; the
     ONE test that names PQ1 (a) is in `membership-check-approval.spec.ts` (AC8).
  2. **The identity half binds only while the identity is unchecked TODAY** (N2 re-read): a recorded `not_confirmed` stops holding a
     claim once the record reads DigiLocker-verified. The story states the `not_required`-then-unchecked ⇒ `stale` direction; this is
     the other direction of the same re-read — reachable only by the 15-minute callback window (G2).
  3. **DL9 (b) read strictly:** `fee_paid_after_death` is refused on an ESCALATION's denial (`resolveEscalation`) and is ⛔ a Super
     Admin refusal reason (`isSuperAdminRefusalReasonCode` — a deny-list; the contracts lockstep test caught that the new code had
     slipped into it). The admin card offers it on a freeze-ready claim only. Recorded in `deferred-work.md`.
  4. **The preview `GET` answers 200** with ⛔ date / ⛔ comparison when there is ⛔ accepted certificate or ⛔ identifiable joining
     fee (the console's disabled states need the rest); it answers 409 `membership_check.certificate_date_unreadable` only for an
     erased / unreadable date. The `POST` refuses each with its own code.
  5. **`latest_posting_district`** is the district the route's permission check already resolved (`getMemberPostingLatest`) — ⛔ a
     third "latest posting" reader.
  6. **Staff copy beyond DL12's list** (the control's headings, radio labels, help lines, refusal lines, the advisory criterion's
     sentence) was written by the session in the same plain style — DL12's lines are in the copy file word for word and pinned as
     literals in `membership-check.test.tsx`. ⚠ One line reads *"The record of the member's joining fee cannot be identified…"*: the
     microcopy gate bans the natural word for it in admin copy.
  7. **`-210` cl. 2 is ⛔ relied on** for the two enum values, the event or the key (the permission bump block says so).
  8. **AC9's "`CLAIM_EVENT_TYPES` 38"** is a stale number in the AC text; the live count is 40 (39 + this story's one), as the NUMBERS
     block and DL11 say.
- **Existing tests touched, and why (AC13 — ⛔ assertion weakened):** the read-budget pins 33 → 36 (four, with the ledger line); the
  permission / role / event / reason-code pins the story names; the anonymize unit pins (29 → 30 tables, 32 → 33 statements);
  `nominee-name-check.spec.ts` and `approval-warnings-every-approver.spec.ts` gained a seeded passing check where they bypass the
  fixture default or re-review the certificate (as 6.26a did for the inspection, RD19 for the name check); four admin fixtures gained
  the neutral packet section.
- **Tests added:** domain — 17 (table) + 21 (comparison) + 6 (joining receipt) + 27 (gate: six sites, each reason, the order, the
  deny legs, AC7, AC8, the writer's re-assertions) + 2 (erasure) + the fence block + 1 anonymize unit; contracts — 14 + 1; API — 26
  (`membership-check.spec.ts`) + 8 (`membership-check-required-routes.spec.ts`); admin — 41 (`membership-check.test.tsx`) + 6
  (cycle-freeze page) + 2 (R9 panel).
- **Browser pass (AC12) — RUN, 2026-11-21** (BigDev connected the Mac's Chrome on request; the 127.0.0.1 probe loaded). A real
  Chrome → the admin dev server (:3001) → the real API on a THROWAWAY database (port 5450, migrated from scratch; an uncommitted
  launcher spec, a cookie sign-in helper — all deleted afterwards). Six legs:
  (1) District Admin, typed-in member, fee before the death — the gate line and the disabled Approve say *"Membership check needed
  before approval."*; opened: the two dates, *"Paid before the death"*, *"The system compares the two dates. You cannot change the
  result."*, *"Typed in at joining, never checked"*, the name and date of birth on record, the posting, two documents; ⛔ radio
  pre-selected; an empty submit and a reason-less "cannot confirm yet" each refused in words (`role="alert"`); with a reason and a
  note ⇒ *"The membership check is recorded."* (`role="status"`), the claim still `verifier_review`, the gate line now *"The
  person's identity has not been confirmed."*; a second check "confirmed" ⇒ the gate passes and Approve is enabled; the database
  shows the first row superseded (with its note) and the second live.
  (2) A verifier on a fresh claim — ⛔ membership section, ⛔ certificate control; Approve disabled with the reason.
  (3) A fee paid AFTER the death — *"Paid after the death"*, the check recorded, Approve held with the deny instruction; the deny
  list offers *"Fee paid after the death"*; denied through the existing confirm dialog ⇒ `denied`, reason `fee_paid_after_death`.
  (4) DigiLocker member, fee paid ON the day of death — *"Paid on the day of death"*, *"Checked through DigiLocker"*, ⛔ identity
  question (the note is the only input); recorded `not_required`; the gate passes (PQ1 (a), built A).
  (5) ⛔ accepted certificate — the control shows its line and ⛔ disclosure; Approve names the certificate first.
  (6) The cycle-freeze page (Pariwar Admin) on a P1-approved claim whose re-check reads `after_death` — Approve ⇒ the final-vote
  words; the reason list offers *"Fee paid after the death"*; denied with it ⇒ `denied`, `frozen_vote` / `fee_paid_after_death`.
  Afterwards: 14 membership audit lines and the API log searched for both dates, the note and three names — ⛔ one found.
  ⚠ **Limits:** sign-in by cookie helper (⛔ passkey); most presses made by script in the page (two by a real pointer); one script ran
  twice (a tool retry — it toggled the control shut, ⛔ other effect); the certificate date was the fixture's (tomorrow, IST); document
  frames rendered with fixture files (their content ⛔ checked); in dev StrictMode an opening reads the preview twice. ⛔ Exercised: the
  stale-409 refetch, the R9 panel, the closure surfaces, the no-joining-fee and window-closed states, a screen reader.
  ⭐ **The pass found a defect the jsdom tests missed:** the death certificate's preview was titled `death_certificate` (the packet's
  `filename` is the raw document type). Fixed (`17df45f8` — a known kind's label wins), re-checked live, and reproduced in a test.
  ⭐ **A self-review fix after the pass, then re-checked in the browser:** closing the control kept the decrypted preview in the query
  cache, so a reopen showed the date with ⛔ new recorded read — against the control's own line *"Each look is recorded."* Fixed in
  `e189a663` (closing FORGETS it — the certificate history's posture; a test that failed first). A short second browser run at
  `e189a663` on a new throwaway database: open (one read line) → close (the date gone from the page) → reopen (a second read line).
  The six legs were ⛔ repeated at `e189a663`.
- **`ci:local` on a FRESH container** (`twt-639-pg`, port 5449, DB `twt_dev`, recreated before each run): three complete runs. (1) `da858fa7` (before the browser pass): 40 / 40. (2) `e189a663` (the final code tree): 39 / 40 — the ONE red was `apps/api/tests/integration/claims/cycle-freeze.spec.ts` (the 6.19b *"a mark write that fails rolls the return back"* test: *canceling statement due to lock timeout* on its own test-only `CREATE TRIGGER` on the shared `claim_correction_marks`), a known pre-existing collision between spec files, ⛔ a regression; it then passed alone and twice beside its sibling specs. ⚠ Said plainly: this story's `membership-check-required-routes.spec.ts` is one MORE parallel user of that table (its `returned()` helper), so it adds to the odds; the real fix (the test installing its trigger without contending) is still owed and is ⛔ this story's. (3) `e189a663` again, the WHOLE job on a fresh container: **40 / 40**. A run started at `17df45f8` was stopped part-way when `e189a663` superseded it and is ⛔ counted.
- **For BigDev, outside this story's tasks:** (a) the Panel note (`…-6-39-fee-date-and-family-told.md`) is still WRITTEN, ⛔ sent —
  its evidence commands must be re-run before it goes (Task 0.3). ⭐ **2026-11-21, later: DONE** — E4 re-run at `eedc9be3` (19
  commands, all as stated) and told line 4 added (`abe2d306`); then SENT (reported by BigDev; channel and time ⛔ recorded), ⛔ ruled
  — see Change Log v1.5; (b) the breach runbook's list of where personal data is held does
  ⛔ name the new table (`deferred-work.md`); (c) nothing was pushed — the branch is local (first push needs an explicit refspec and
  the story's `DATABASE_URL`).

- **Task 8 (2026-11-21, story v1.7 → v1.8) — three of the Panel's four answers built** (`-473`; `-474`), code `5b4efdbb`:
  - **Q1 B (AC15).** `MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES = ['after_death', 'same_day']`; a `same_day` check gives the gate's
    `fee_after_death` answer (⛔ new wait reason — the contract's closed set is unchanged), so every approval site holds the claim and the
    `fee_paid_after_death` deny is accepted for it (DL9's guard reads that answer). The AC8 test that named PQ1 (a) FLIPPED (domain and
    API); AC6's leg now accepts the reason after a `same_day` check. The four staff lines (console P1, final vote, R9, the API's plain
    message) open *"The joining fee was not paid before the date of death on the certificate."* — the old sentence occurs ⛔ in source or
    tests (grep, 0). The console's record-then-deny note shows for `same_day` (component test, three outcomes).
  - **Q3 B (AC16).** `isFeePaidAfterDeathRefusalStanding` (`membership-check-read.ts`): `denied` + a LIVE P1 OR trustee-decision
    denial with `fee_paid_after_death` + ⛔ reversed appeal. `MemberAppealStatusResponse.refusal_reason` (`'not_a_member_when_died' |
    null`, required). The card shows `appeal.refused_not_member` INSTEAD of `appeal.eligible`. Live-DB: domain (P1 with / without the
    reason, a same-day fee, the final-vote denial with / without it) and API (the reason, another reason, a reversed appeal ⇒ `null`; the
    code ⛔ on the wire). ⚠ **Its limit, by design:** the line sits where `appeal.eligible` sat — with the "file appeal" affordance;
    once an appeal is filed the card shows the stage line, and after a Stage-3 uphold the exhausted lines, ⛔ the reason (as before for
    every refusal). Whether the reason should follow the family through the appeal is ⛔ ruled; ⛔ built.
  - **Q4 B (AC17).** `MemberDeathCertificateStatusResponse.identity_check_waiting` (required): `accepted` + `isInMembershipCheckWindow`
    + `membershipCheckApprovalState` answers `identity_not_confirmed` (the ONE definition). The notice keeps `certificate.accepted` and
    adds `certificate.identity_wait` as its second line. API live-DB: ⛔ before a check, ⛔ for a fee after the death (the gate answers
    that first), ⛔ once confirmed; the reason, the identity reason and the note ⛔ on the wire.
  - **Copy:** `en` and `hi`, word for word as `-474` items 4–5 — the Hindi of Q3 is two shipped strings joined (checked
    programmatically); Q4's Hindi is new (BigDev-approved, ⛔ native-speaker review recorded). Real-`t()` test
    `panel-473-family-copy-resolves.test.ts` (both locales, exact words; ⛔ "fee", a code or a digit in either line). ⛔ Invisible
    characters in the added lines (scanned).
  - **Gates:** `friction-budget` AC-4 FAILED the first `ci:local` (a member-facing surface touched, ⛔ ledger change) — fixed by a
    **Story 6.39 disposition** (no new row: two read-only lines, nothing asked of the family), `37460d6b`; OpenAPI unchanged (these two
    member reads are ⛔ in the registry — the determinism check is clean).
  - **`ci:local` on a FRESH container** (`twt-639-pg`, port 5449, DB `twt_dev`, recreated before each run): (1) `5b4efdbb` — 39 / 40,
    the one red `friction-budget` AC-4 (above; ⛔ a code fault); (2) `37460d6b` (the disposition committed; the code tree unchanged) —
    **40 / 40**.
  - **⚠ Roster Row 46 leg (d) RE-OPENED.** Its own words: *"A later change to the control re-opens this leg."* Task 8 changed the
    control (the `same_day` note) and the staff lines. The real-browser pass was ATTEMPTED 2026-11-21 and ⛔ run: the Mac's Chrome was connected and loaded a 127.0.0.1 probe, but the throwaway database
    (`twt-639-bp`, :5450) could ⛔ be migrated — the session's `db:migrate` was refused by the permission check, and BigDev's two
    runs reached another database (:5450 stayed empty; which one is ⛔ known). BigDev: *"option 3, record it un-attested"*.
    The leg is UN-ATTESTED for `5b4efdbb` until a pass runs ([[feedback_record_unattested_no_backfill]]); the component tests cover
    both changes. The family's two lines have ⛔ device check (apps/mobile has ⛔ render
    harness — the pure view + real `t()` stand in).
  - ⛔ Q2 B — row `6-39a-…` (`-474` item 1); until it lands the comparison stays binding with ⛔ staff remedy.

- **Code review 2026-11-21 — two rounds** (`bmad-code-review`; § Review Findings, both rounds):
  - Round 1 (the whole branch, source only): 1 decision + 9 patch. The decision ⇒ author-commit `-475` (`68ac6305`); all ten patches
    in `27898db7`; records `fb14510e`.
  - **`ci:local` on a FRESH container: 40 / 40 at `fb14510e`** (`twt-639-review-pg`, port 5450, DB `twt_dev`, 212 migrations).
  - Round 2 (the fix diff `c5041036..fb14510e`): 1 decision + 8 patch + 1 defer, 13 dismissed. The decision ⇒ author-commit `-476`
    (`536925b5`, DL12's not-shown line, `-475`'s two slips); the eight patches in `5df89866`: the spec annotated (G3, DL3,
    DL10, AC3, AC16, the same-day edge, the Policy-meaning note), comments, the `check_changed` audit field and neutral words, the `-475`
    leg through `readJoiningFeeReceipt`, the refusal-reason R9 and escalation legs, and the backstop leg — which showed the 23505
    backstop is ⛔ constructible (the FK's KEY SHARE on the claim row). The defer (a corrected UTR is stored nowhere in full) is in
    `deferred-work.md` against row 6-39a.
  - **`ci:local` at the round-2 tip `3c45bc98`:** on `twt-639-review-pg` (:5450, its SECOND run) 39 / 40 — the one red
    `announcement-activity-read.spec.ts`, known failure #18 (14 committed PARIWAR_A `trustee-actor-1` `cycle_freeze_commits` from the
    two runs, confirmed by query; this branch touches ⛔ cycle or announcement code); the integration job re-run with `--continue` —
    every other package green. Then on a FRESH container `twt-639-review2-pg` (port 5451, DB `twt_dev`, 212 migrations, BigDev ran
    `db:migrate`): **40 / 40**, all 24 integration tasks. Status → `done`.
  - ⚠ Roster Row 46 (d)'s real-browser pass of the console stays UN-ATTESTED; the console changed again in both rounds.

- **Browser pass after the code review (AC12; roster Row 46 (d)) — RUN 2026-11-21 at `3c45bc98`.** A real Chrome on this Mac
  (`localhost:3001` admin → `localhost:3000` API) against a throwaway database (`twt-639-review-pg`, :5450), signed in through the
  real passkey routes (faked passkey); a throwaway, uncommitted launcher (removed afterwards). Seen: the same-day fee's note (from
  `fee_blocks_approval`) and the intro's *"before the date of death"*; a check recorded; the lost-update refusal (`role="alert"`, the
  neutral words, the preview reloaded and the answer reset, ⛔ row written, audited `check_changed` with the client's token) and a
  deliberate re-check after it; the fee-reason deny without a check refused with `-476`'s words; the no-certificate state; the
  cycle-freeze card's fee reason and its Approve refused with the final-vote words. The audit lines and the API log carry ⛔ date,
  ⛔ name, ⛔ note. Limits: seeded data, a faked passkey, ⛔ screen reader, the family's two mobile lines ⛔ device-checked. Row 46 (d)
  MET for `3c45bc98` only (dated line in the roster). The "Row 46 (d) stays UN-ATTESTED" lines above are superseded by this one.
- **LANDED on `main` 2026-11-21** by fast-forward — PR #331, `9f5e2c84..e244a907` (SHAs unchanged; GitHub marked it merged).
  GitHub CI **40 / 40** on the PR and on the push to `main` (run `44888099491`). The pre-push hook skipped `ci:local` for the branch
  push (`SKIP_CI_LOCAL=1`, BigDev's call — `ci:local` had run 40 / 40 at `3c45bc98`) and for the landing (every commit already on
  `origin`). The code-escrow mirror workflow failed on the push, as it has on every push to `main` (`MIRROR_DESTINATION_URL` unset —
  Story 0.3 Task 8), ⛔ this story's. The "Not pushed" lines of v1.9–v1.12 and the ledger are superseded by this one. Roster Row 46 (a)
  MET; the row stays `open`.
### File List

**New**
- `packages/domain/migrations/0210_verifier-reason-fee-paid-after-death.sql`
- `packages/domain/migrations/0211_state-trustee-reason-fee-paid-after-death.sql`
- `packages/domain/migrations/0212_claim-membership-checks.sql`
- `packages/domain/src/schema/claim_membership_checks.ts`
- `packages/domain/src/policies/claim-membership-check-rls.ts`
- `packages/domain/src/claim/fee-death-date.ts`
- `packages/domain/src/claim/membership-check-approval.ts`
- `packages/domain/src/claim/membership-check-read.ts`
- `packages/domain/src/claim/membership-check-persist.ts`
- `packages/domain/tests/claim/fee-death-date.test.ts`
- `packages/domain/tests/integration/rls/claim-membership-check-policy-regression.spec.ts`
- `packages/domain/tests/integration/claim/membership-check-joining-receipt.spec.ts`
- `packages/domain/tests/integration/claim/membership-check-approval.spec.ts`
- `packages/domain/tests/integration/claim/membership-check-rtbf.spec.ts`
- `packages/contracts/src/claims/membership-check.ts`
- `packages/contracts/tests/claims-membership-check.test.ts`
- `apps/api/src/modules/claims/claims.membership-check.handlers.ts`
- `apps/api/src/modules/claims/claims.membership-check.routes.ts`
- `apps/api/src/modules/claims/membership-check-crypto.ts`
- `apps/api/src/modules/claims/membership-check-required-message.ts`
- `apps/api/tests/integration/claims/membership-check.spec.ts`
- `apps/api/tests/integration/claims/membership-check-required-routes.spec.ts`
- `apps/admin/src/modules/claim-verification/MembershipCheckControl.tsx`
- `apps/admin/tests/membership-check.test.tsx`

**Modified — domain**
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/index.ts` · `packages/domain/src/policies/index.ts` · `packages/domain/src/ids/index.ts`
- `packages/domain/src/encryption/field-classes.ts` · `packages/domain/src/encryption/index.ts`
- `packages/domain/src/claim/index.ts` · `errors.ts` · `events.ts` · `state.ts` · `nominee-name-check.ts` · `intake-door.ts`
- `packages/domain/src/claim/verifier-decision.ts` · `verifier-decision-persist.ts`
- `packages/domain/src/claim/state-trustee-decision.ts` · `state-trustee-decision-persist.ts` · `correction-closure.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/src/rbac/permissions.ts` · `packages/domain/src/rbac/roles.ts`
- `packages/domain/tests/integration/_helpers.ts` · `tests/integration/claim/nominee-name-check.spec.ts`
- `packages/domain/tests/claim/{approval-warnings,dpdpa-consent-events,nominee-name-check-events,nominee-name-no-comparison-fence,verifier-decision}.test.ts`
- `packages/domain/tests/member/rtbf-anonymize.test.ts` · `packages/domain/tests/rbac/{permissions,roles}.test.ts`

**Modified — events, contracts**
- `packages/events/src/registry.ts`
- `packages/contracts/src/claims/{index,verifier-console,verification-decision,cycle-freeze}.ts`
- `packages/contracts/tests/{claims-verifier-console,claims-verifier-decision}.test.ts`

**Modified — API, jobs, scripts**
- `apps/api/src/context.ts` · `apps/api/src/audit/audit-sink.ts` · `apps/api/src/modules/claims/index.ts`
- `apps/api/src/modules/claims/claims.{verification-decision,cycle-freeze,r9-voting,correction-closure,verifier-console}.handlers.ts`
- `apps/api/tests/integration/_nominee-name-check-fixture.ts`
- `apps/api/tests/integration/claims/{approval-warnings-every-approver,suspicion-refusal-routes,verifier-console,verifier-console-ground-inspection}.spec.ts`
- `apps/jobs/tests/{claim-suspicion-notice-no-decision,claim-suspicion-staff-email-no-decision}.test.ts`
- `scripts/claim-adjudication-human-actor-invariant/check.ts`

**Modified — admin**
- `apps/admin/src/api/{client,hooks}.ts`
- `apps/admin/src/modules/claim-verification/{i18n-en,nominee-errors}.ts`
- `apps/admin/src/modules/cycle-freeze/{CycleFreezePage,PendingCaseCard}.tsx` · `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`
- `apps/admin/src/routes/VerifierConsoleRoute.tsx`
- `apps/admin/tests/{cycle-freeze-page,later-approval-warnings,death-certificate-review,nominee-declaration-route,verifier-console-route-name-check,verifier-console}.test.tsx`

**Modified — records**
- `.decision-log.md` (`2026-11-21-472`) · `docs/launch-gate-inventory/inventory-roster.md` (Row 46)
- `_bmad-output/implementation-artifacts/{deferred-work.md,sprint-status.yaml}` · this story file

**Task 8 (`-473` / `-474`)**
- New: `apps/mobile/tests/unit/panel-473-family-copy-resolves.test.ts`
- Modified: `packages/domain/src/claim/{membership-check-approval,membership-check-read,fee-death-date,errors}.ts` ·
  `packages/domain/src/schema/claim_membership_checks.ts` · `packages/domain/tests/integration/claim/membership-check-approval.spec.ts` ·
  `packages/contracts/src/claims/{appeal,death-certificate}.ts` · `packages/contracts/tests/{claims-membership-check,claims-suspicion-refusal}.test.ts` ·
  `packages/i18n/locales/{en,hi}/claim.json` · `apps/api/src/modules/claims/{claims.appeal.handlers,claims.death-certificate-member.handlers,membership-check-required-message}.ts` ·
  `apps/api/tests/integration/claims/{appeal,membership-check,membership-check-required-routes}.spec.ts` ·
  `apps/mobile/{lib/appeal-status,lib/death-certificate-view,components/claim/AppealStatusCard}.ts(x)` ·
  `apps/mobile/tests/unit/{appeal-status,death-certificate-view}.test.ts` ·
  `apps/admin/src/modules/claim-verification/{MembershipCheckControl.tsx,i18n-en.ts}` ·
  `apps/admin/tests/{membership-check,later-approval-warnings,cycle-freeze-page}.test.tsx` · `friction-budget.md`
- Records: `.decision-log.md` (`-473`, `-474`), the routing note, roster Row 46, `epics.md` (6.39 lines, the 6.39a stub),
  `deferred-work.md`, `sprint-status.yaml` (row `6-39a-…` minted)

**Code review 2026-11-21** (`27898db7` and round 2)
- New: `packages/domain/tests/integration/claim/membership-check-concurrency.spec.ts`,
  `packages/domain/tests/claim/membership-check-one-live-violation.test.ts`
- Modified: `apps/api/src/modules/vyawastha-shulk/handlers.ts`, `apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts`,
  `apps/api/tests/integration/claims/appeal.spec.ts`, `apps/admin/src/api/hooks.ts` (and the 6.39 files already listed:
  the membership-check writer, read, errors, contract, handler, messages, console control and route, i18n, and their specs)
- Records: `.decision-log.md` (`-475`, `-476`), `deferred-work.md`, `sprint-status.yaml`

**Deleted** — none. (Throwaway, never committed: the browser-pass launcher spec, its cookie helper, the probe.)

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-31 | Created (`bmad-create-story 6.39`) on `story/6-39-identity-check-before-a-drive-for-an-unchecked-identity`, pinned `beae5116`. |
| v1.2 | 2026-10-31 | Task 0.3 done: the routing note `trustee-panel-routing-note-2026-10-31-6-39-fee-date-and-family-told.md` WRITTEN (⛔ sent) — Q1–Q4 = PQ1 (a) / PQ1 (b) / PQ2 (i) / PQ2 (ii), TL1–TL3 as told lines, E4 run. Corrected while writing it: a staff phone call to the CLAIMANT rests on their filing agreement (`-367` decision 2); only a call to a NOMINEE waits on roster Row 34 (Policy meaning, DL8, PQ2). |
| v1.3 | 2026-11-21 | DRIFT validation (`bmad-create-story validate 6.39`, BigDev: "all, then rebase") at `origin/main` `9f5e2c84` (345 commits past `beae5116`): two read-only traces + the numbers re-read by hand. Every G1–G17 BEHAVIOUR holds (gate order + six sites, commit loop, both deny vocabularies, review window, claim states, KYC writers, receipt + event, certificate review, fence, translators — ⛔ diff); ⛔ Panel ruling on PQ1 / PQ2; ⛔ supersession of `-424` / `-430`. Corrected: NUMBERS (decision ≥ `-472`, migrations `0210`–`0212`, catalog v65 / 96, events 40, COVERAGE_SET 20 / floor 20, `ci:local` 40 jobs, ledger `2026-11-21c`); TR1 (46 files; only `peer-mesh-reply` bypasses the fixture — v1.1's "four" was wrong); DL14 (the innocence release is LIVE through 6.22's `recordFraudFinding` ⇒ the scrub binds at merge; follow 6.22's shared `encryption/field-classes.ts` constant) + an AC14 real-release leg; G7 / DL10 (6.22's self-fetching panel pattern considered, packet section kept); G8 (13.1's `VerifiedAuthorization` — ⛔ needed for claims); G15 registration after `registerFraudInvestigationRoutes`; G1 / DL16 (6.22's flag gates nothing — ⛔ link); G3 (`cycleCalendar.istDateOf` precedent; the TTL is an env setting); TR15 (siblings landed); Task 0.1 re-pinned to `9f5e2c84`; Task 0.3 — the note is still ⛔ sent: re-run E4 before sending. Branch REBASED onto `9f5e2c84` (backup `backup/6-39-pre-rebase-2026-11-21`); SHA map — `c15e47ca` → `450cb34a`, `f792d4e3` → `22979b70` (the E4 run Task 0.3 cites), `a5d74012` → `3825ce5c`, this v1.3 commit `e8af3dde` → `388b5d69`. |
| v1.1 | 2026-10-31 | Fresh-context validation (`bmad-create-story validate 6.39`): DL9 gives `fee_paid_after_death` to BOTH denial vocabularies (P1 verifier + final-vote state-trustee; P1 cannot deny after P1), guarded in `adjudicateClaim`, `reviseDecision` and `voteOnFrozenClaim`; the Policy meaning is ONE sentence, ⛔ promises an ask nothing builds, and records Niyamavali §2.2; DL1 / AC1 grant `note_ciphertext` + an UPDATE policy at birth for DL14 (the `0122` shape, ⛔ `0121`), AC14 added; DL3 matches the receipt by `member_id` too (the event carries the body's UTR); the gate's codes prefixed per route at four translators + four admin surfaces (G16); AC5's `stale` leg avoids `determination_stale` (TR12); numbers re-read across branches (decision ≥ `-432`, ledger `ag` / `ah`, migrations ≥ `0194`); N3's binding outcome declared a narrowing, PQ1 split into (a) same day — evidence led by `-235` Y + §2.2, suggestion B — and (b) the attest-vs-bank time; DL8 shows every death document; TL1–TL3 told lines; DL6's "page shows why" dropped and the stranded claim recorded; the fixture-KYC-provider leg and roster Row 46; G15–G17 + the fence, NW1 scan, frozen event list, read budget, COVERAGE_SET, RLS policy file, branded id and 44-file blast radius named. |
| v1.4 | 2026-11-21 | DEV COMPLETE (`bmad-dev-story 6.39`): Task 0 (BigDev accepted DL1–DL16 as written — author-commit `2026-11-21-472`; roster Row 46; ledger `2026-11-21d`), Tasks 1–7 built and tested (see the Dev Agent Record): migrations `0210`–`0212`, the membership check's record / writer / routes / event / key, the gate at all six approval sites and at the commit, `fee_paid_after_death` on both denials, the console control, the erasure scrub. `ci:local` 40 / 40 on a fresh container at the final code tree `e189a663` (its first run there was 39 / 40 — one known pre-existing lock-timeout flake; the whole job was re-run); the real-browser pass RUN (six legs; one defect found and fixed; one self-review fix re-checked). Status → `review`. Built A on PQ1 (a) / (b) and PQ2 — the Panel note is still ⛔ sent. |
| v1.5 | 2026-11-21 | Records only (⛔ code): the Panel routing note re-checked before sending (`abe2d306`) — E4 re-run at `eedc9be3` against the BUILT code, 19 commands all as stated (command 1 re-anchored, command 13 now `review`, six new commands); E3 "will be built" → built; told line 4 added (the system, ⛔ staff, compares the dates and staff cannot override it — `-472`'s declared narrowing of `-430` Q1 B "staff compare"); Q1–Q4 and the suggestions unchanged. Then SENT (BigDev: *"sent the note to Panel"*; channel, time and whether the sent text is identical ⛔ recorded); ⛔ ruled. PQ1 (a) / (b) and PQ2 stay open; roster Row 46 (b), (c) dated; ledger `2026-11-21f`, `g`. Status stays `review`. |
| v1.6 | 2026-11-21 | Records only (⛔ code): the Panel RULED the note — [`-473`](../../.decision-log.md#decision-2026-11-21-473) (Trustee-ratified, DR + KB, *"Q1 B / Q2 B / Q3 B / Q4 B"*), committed ALONE (`35014835`). All four MATCH option B; Q3 B widens `-424` Q3 B past the door (the Panel's); Q2 B overrides `-472` N3's "cannot override" in its one case. The note's ⏳ block replaced (questions unedited); `deferred-work.md` PQ1 (a) / (b), PQ2 DISCHARGED as questions; roster Row 46 (b), (c) — "ruled" MET, "reflected in code" OPEN; `epics.md` annotated; ledger `2026-11-21h`. ⚠ Built A on all four — the build to B has ⛔ row yet (BigDev's call). Status stays `review`. |
| v1.7 | 2026-11-21 | Scope GROWN by author-commit [`-474`](../../.decision-log.md#decision-2026-11-21-474) (`8a9801a2`, BigDev: *"split as recommended — Q1, Q3, Q4 in 6.39, Q2 new row"*, then the three wordings approved): Task 8 + AC15–AC17 added; AC8 annotated AMENDED (kept). Status review → in-progress. Q2 B → new row `6-39a-bank-date-for-a-fee-recorded-after-the-death` (backlog). |
| v1.8 | 2026-11-21 | DEV COMPLETE for Task 8 (`-473` Q1 B, Q3 B, Q4 B under `-474`): code `5b4efdbb`, the friction-budget disposition `37460d6b`; `ci:local` on a fresh container 39 / 40 at `5b4efdbb` (`friction-budget` AC-4 only), then **40 / 40** at `37460d6b`. Roster Row 46 (d) RE-OPENED by the control change — the browser pass ATTEMPTED, ⛔ run (the throwaway DB could ⛔ be migrated), recorded UN-ATTESTED on BigDev's word. Two `deferred-work.md` items (Q3's line stops at the appeal; Q4's Hindi un-reviewed). Status in-progress → review. |
| v1.9 | 2026-11-21 | CODE REVIEW (`bmad-code-review`, the whole branch `9f5e2c84..c5041036`, source only, three parallel read-only layers): 1 decision-needed, 9 patch, 0 defer, 11 dismissed (§ Review Findings). BigDev chose option (a) for the decision — author-commit [`-475`](../../.decision-log.md#decision-2026-11-21-475) (`68ac6305`): the joining fee's lock-in event records the STORED receipt's UTR; amends `-472` DL3 — then "all": ten patches applied in `27898db7` (the fee re-confirm UTR; "before the date of death" in the staff intro and the deny-guard line; a REQUIRED nullable `expected_live_check_id` with a `check_changed` refusal under the lock, and its 23505 backstop; a two-connection race spec; the preview's `fee_blocks_approval` (N1); `refusal_reason` keyed on the denial that made the claim denied; AC15's `same_day` legs at all six sites and the commit; AC17's `stale` and out-of-review legs; Task 8 ticked). The Policy-meaning sentence annotated as amended by `-473` Q1 B (its words kept). ⚠ `ci:local` on a fresh container NOT run (the classifier refused the container recreate and `db:migrate`) — Status stays `review`. |
| v1.10 | 2026-11-21 | Records + code (FIX REVIEW, round 2, at BigDev's ask after `ci:local` went **40 / 40 at `fb14510e`** on a FRESH container `twt-639-review-pg` :5450): the fix diff `c5041036..fb14510e` reviewed by three parallel read-only layers — 1 decision, 8 patch, 1 defer, 13 dismissed. BigDev *"1"*: author-commit [`-476`](../../.decision-log.md#decision-2026-11-21-476) (`536925b5`) records DL12's not-shown line as amended and corrects `-475`'s two slips. BigDev *"1"*: the eight patches in `5df89866` + this record — the spec annotated (G3, DL3, DL10, AC3, AC16, the same-day edge, the Policy-meaning note, words kept), comments, the `check_changed` audit field and neutral words, the `-475` leg through `readJoiningFeeReceipt`, refusal-reason R9 and escalation legs; the 23505 backstop shown ⛔ constructible (the FK's KEY SHARE). The round-1 note corrected (red-first narrowed to three; `ci:local` now run). Defer: a corrected UTR stored nowhere in full (row 6-39a). |
| v1.11 | 2026-11-21 | Records only: **`ci:local` 40 / 40 at `3c45bc98`** on a FRESH container (`twt-639-review2-pg`, :5451, DB `twt_dev`, 212 migrations); the earlier 39 / 40 on `twt-639-review-pg`'s second run was known failure #18 (its signature confirmed), every other package green with `--continue`. Status `review` → `done` (`bmad-code-review` step 6: every decision and patch of both rounds resolved, ⛔ HIGH / MEDIUM open). ⚠ Roster Row 46 (d)'s browser pass stays UN-ATTESTED — a go-live item, ⛔ a merge blocker. Not pushed. |
| v1.12 | 2026-11-21 | Records only: the real-browser pass of the console RUN at `3c45bc98` (BigDev: *"complete browser pass and open pr"*) — every leg the two review rounds changed seen in a real Chrome; roster Row 46 (d) MET for `3c45bc98` (dated line); limits recorded. |
| v1.13 | 2026-11-21 | LANDED on `main` by fast-forward — PR #331, `9f5e2c84..e244a907`; GitHub CI 40 / 40 on the PR and on the push to `main` (run `44888099491`). Roster Row 46 (a) MET (dated line); the row stays `open`. Merge is not go-live. |
