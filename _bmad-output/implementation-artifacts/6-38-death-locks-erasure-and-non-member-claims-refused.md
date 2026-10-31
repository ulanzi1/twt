---
baseline_commit: 01062c51
---

<!--
PINNED: `01062c51` = `origin/main` (`git fetch origin` 2026-10-30, at authoring). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/6-38-death-locks-erasure-and-non-member-claims-refused`, branch
`story/6-38-death-locks-erasure-and-non-member-claims-refused` (upstream UNSET — ⛔ it tracks `origin/main`; push with an explicit refspec)
([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — the peer session `twt-47` was idle; the main checkout was ⛔ switched).
Every `apps/` / `packages/` claim below was traced at `01062c51` on 2026-10-30 by three read-only traces (erasure, intake, the nominated person)
and the load-bearing ones re-read by hand. Re-locate by FUNCTION, ⛔ by line number — line numbers are a convenience and rot.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the BEHAVIOUR is the
Panel's and is RULED — `2026-10-30-423` (Q1 (a) A, Q1 (b) A, Q2 A, Q3 B). Everything named DL below is the AUTHOR's (HOW to build the ruling) —
BigDev answers at Task 0.2. Three edges the ruled words do ⛔ decide are the Panel's and are PQ1–PQ3 (one NON-BLOCKING note, Task 0.3):
each is built on the NARROW / unchanged side until answered, so ⛔ answer gates the build or the merge. ⛔ Counsel question is raised here
(`-423` Consequence 3 already owns counsel's).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or
the row key.

NUMBERS: ⛔ claimed by this file. At authoring the highest decision anywhere (every ref) is `2026-10-30-423`; the highest ledger letter is
`2026-10-30q` (main). This create-story run's ledger line takes `2026-10-30r`. Task 0.4's decision entry is "the next free one" at the
commit that takes it.

LETTERS: **G** = found facts (G1–G16); **DL** = build decisions (DL1–DL19 — ANSWERED 2026-10-31: DL1–DL16 at Task 0.2, all as recommended; DL17 added and approved the same day; DL18–DL19 build `-424`); **PQ** = Panel questions
(PQ1 (a) / (b), PQ2 (a) / (b), PQ3 — RULED 2026-10-31 as `2026-10-31-424`); **TR** = traps (TR1–TR10); **AC1–AC15**.
-->

# Story 6.38: Once a Death Is Reported the Member's Record Is Never Erased — Unless the Member Is Found Alive — and a Claim for Someone Who Was ⛔ a Member at Death Is Refused at the Door

Status: review

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled three things on 2026-10-30 (`2026-10-30-423`). **(a)** From the moment a claim
> is filed for a member's death, nobody can have that member's record erased — not the member's own account (`POST /api/v1/member/rtbf`),
> not a Pariwar Admin off-portal (`member-data-rights/erasure`) — unless the report is closed because the member is ALIVE. **(b)** The person
> the member nominated may SEE the record and ASK for a correction, ⛔ erase it. **(c)** A claim for someone who, at death, had ⛔ finished
> joining (⛔ identity check — `pending-kyc`), had left (`withdrawn`), had been erased (`anonymized`) or had been removed (terminated —
> the moderation overlay) is REFUSED at the door — on the helpline AND in the app — with ⛔ claim record and ⛔ appeal; the helpline
> operator is shown WHY, so a mistyped search (the member id or mobile number the operator searched with) can be re-checked with the
> caller before the call ends. This story builds ONE leaf predicate ("a death is reported and stands"), puts it in the ONE erasure
> legality function both routes already share, serialises erasure against intake on the intake lock, adds ONE intake door inside the ONE
> mint path both intakes already share, and gives the operator, the Pariwar Admin and the app their words. ⛔ Migration, ⛔ new table,
> ⛔ new audit type, ⛔ new nominee surface. **The Panel then ruled the edges (`2026-10-31-424`):** the door also refuses someone who never
> paid the joining fee (Q1 (b) B); once a death is reported the membership cannot be WITHDRAWN (Q2 (a) A) and the record cannot be changed
> DIRECTLY from the account — only asked; a staff change never removes the old entry (Q2 (b) A + the Panel's addition); the caller and the
> app are told one general reason — *"the person was not a member of the Trust when they died"* (Q3 B). Q1 (a) C — staff check an
> unchecked identity before any drive opens — is a NEW row (`6-39-…`), ⛔ this story's.

**What already ships and this story REUSES — rebuild none of it:**
- `resolveRtbfLegality` (`packages/domain/src/member/rtbf-legality.ts`) — the ONE erasure legality function; its header: *"declared ONCE,
  here… Do not inline a second copy"*. Called by exactly two handlers (G1).
- `isNomineeDeclarationLocked` (`packages/domain/src/claim/nominee-lock.ts`) — the EXACT shape of "a claim was ever filed and ⛔ released
  by an innocence finding", keyed to the durable `claims` row, ⛔ the `account-frozen` overlay (G4).
- `intakeAdvisoryLockKey` (`packages/domain/src/claim/icp-lock.ts`) — a LEAF module (imports only `node:crypto`), the key every intake
  takes; the nominee edit already serialises on it (Story 6.20 D3). `icp.ts` re-exports it.
- The domain-owns-the-vocabulary, contracts-mirrors-it pattern (`@twt/domain` ⛔ imports `@twt/contracts` — `domain/src/errors.ts`
  header): e.g. `APPROVAL_WARNING_REASON_REFUSALS`, pinned by `packages/contracts/tests/claims-verifier-decision.test.ts`;
  `reconciliation/review-reason-codes.ts` + `contracts/tests/reconciliation-review.test.ts`.
- `tryConverge` (`packages/domain/src/claim/icp.ts`) — the ONE mint path; reached by the helpline and the member app through
  `initiateIntake` (`apps/api/src/modules/claims/claims.service.ts`).
- `translateRefileRequiresConfirmation` + `REFILE_REQUIRES_CONFIRMATION_CODE` — the precedent for a domain refusal mapped to a 409 at
  both intake callers, with a contracts constant the mobile catch cross-checks.
- The mobile calm-refusal pattern `(claim)/refile-helpline.tsx` + `apps/mobile/lib/refile-helpline-copy.ts` (pure key map, real-`t()` test).
- The admin `refusalKey()` pattern (`apps/admin/src/modules/helpline-claims/HelplineClaimContact.tsx`) — a code → copy key, generic fallback,
  ⛔ a raw code.

## Story

As **a family reporting a member's death, a helpline operator taking that call, a Pariwar Admin handling a data-rights request, and the
person a member nominated**,
I want **the member's record to stay exactly as the member left it once their death is reported — open to see and to correct, ⛔ to
erase — and a claim to be refused at once, with the reason shown to the operator, when the person was ⛔ a member when they died**,
so that **the claim, the drive and every donor's record stay tied to a named member, no one can withdraw on a dead member's behalf the
agreement they gave while alive, and no money is raised in the name of someone who was ⛔ a member**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-30-423` Q1 (a) A | *"From the moment a claim is filed for the member's death, an erasure request is refused, for good — unless the report is closed as false (Q1 (b))."* Reason: *"the member agreed to how their data is used while they were alive; … no one can withdraw it on their behalf afterwards."* Cost accepted: *"Nobody — not the nominee, not the family — can have a dead member's record erased; it is kept indefinitely. Whether the law allows the Trust to refuse is counsel's to confirm."* | Trustee-ratified (DR + KB) |
| `-423` Q1 (b) A | *"Once the report is closed because the member is alive, erasure is possible again."* Cost accepted: *"while the false report is open, the member cannot have their data erased."* | Trustee-ratified |
| `-423` Q2 A | *"The person the member nominated (the draft privacy policy's "nominate a person to exercise your rights in the event of death") may SEE the record and ask for a CORRECTION, ⛔ erase it; the privacy policy is changed to say so before members agree to it."* Cost accepted: *"If counsel says the law gives the nominated person a right to erase, A must change."* | Trustee-ratified |
| `-423` Q3 B | *"A claim for someone who, at their death, had not finished joining (⛔ identity check), had left the Trust, had been removed, or had been erased is refused when it is filed: the helpline tells the caller the claim cannot be filed; ⛔ claim record is kept."* Cost accepted: *"No record and no appeal; a mistyped member number turns a real family away silently."* ⛔ Touched: *"members in their first days after joining, behind on contributions, or suspended"*. | Trustee-ratified (⛔ our suggestion A) |
| `-423` "Our readings — ⛔ NOT RATIFIED" | (1) *"A death is reported"* = a claim FILED; a claim later withdrawn or refused for another reason still counts. (2) *"⛔ recorded"* leaves the staff SECURITY audit line (`claims.helpline.handlers.ts`, *"a probing/invalid id is never audit-silent"*). (3) The mistyped-number cost is MITIGATED by showing the operator WHY. | readings — build on them; challenge ⇒ back to the Panel |
| `-423` Consequence 1 | the build row: (a) both erasure routes; (b) the nominated person's access / correction without erasure; (c) intake refuses at the door — helpline and app — `pending-kyc`, `withdrawn`, `anonymized`, terminated, *"with the reason shown to the operator"*. | the row this story is |
| `-423` Consequences 2 · 3 | (2) the privacy policy (draft, outside this repository) must say Q2 A before members agree to it — BigDev and counsel; (3) counsel confirms the law allows the refusal (Q1 (a)) and gives the nominated person ⛔ right to erase (Q2). ⛔ Built here — TRACKED by Task 0.5 (iii) so they do ⛔ go untracked once this row closes. | obligations outside the code |
| `2026-10-31-424` | Q1 (a) **C** — an identity nobody has checked: filed, but staff check it *"before any drive opens"* (cost: *"it must be built before members' claims go live"*). Q1 (b) **B** — fee never paid: refused at the door. Q2 (a) **A** — withdrawal refused once a death is reported, lifted as erasure is. Q2 (b) **A** — only ask, ⛔ direct change; the Panel's addition, verbatim: *"even though staff can change, old entry cannot be gone in this particular case, but clearly visible along with new entry made by staff"*. Q3 **B** — one general reason: *"the person was not a member of the Trust when they died"*. Our readings in the entry (⛔ ratified). | Trustee-ratified (DR + KB) |
| `-159` cl. 11 | SUPERSEDED IN PART by `-423`: *"a deceased member IS reachable"* / *"RTBF → the name GOES"* no longer hold once a death is reported. *"death → the name STAYS"* is unchanged. | author-commit, superseded in part |
| `-238` cl. 1 · cl. 4 · cl. 5 · `-241` §6 | cl. 1: *"A claim filed against a member who is **alive** does ⛔ not lock that member's declaration for life. On investigation finding the member **innocent**, the declaration **unlocks immediately**."* — scoped to the NOMINEE DECLARATION. cl. 4: *"TWO OUTCOMES ONLY. An investigation finds the member innocent or guilty."* cl. 5: guilty ⇒ *"terminated and blacklisted"*. `-241` §6: the finding's producer is row `6-22` (⛔ built). ⚠ That the SAME innocence finding releases the ERASURE lock is this story's READING (DL4), ⛔ a ratified rule. | Trustee-ratified / author-commit |
| Niyamavali §2.1, §8.4, §8.4a, Part 10 | *"Registration alone does not constitute membership"*; termination ends beneficiary entitlement; *"honours … erasure … subject to lawful retention"*. A rulebook, ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]) — read for the Policy-meaning check only. | ⛔ ratified |

## 📜 Policy meaning (AI-10-1)

**This story INTRODUCES two predicates that gate a member's (or their family's) access to a benefit or a right.**

1. **The erasure lock (`resolveRtbfLegality` gains a conjunct).** *In the member's terms:* **"Once anyone files a claim for your death,
   nobody — not you, your family, the person you nominated, or the Trust's staff — can have your record erased, and it is kept
   indefinitely; if you are in fact alive, you can ask again once the claim is found to be about a living member."** ⚠ What the member must also be told, because it is TRUE
   today and ⛔ a defect of this story: the "found alive" finding has ⛔ producer until row `6-22` lands, so until then a living member who
   is falsely reported can ⛔ have their record erased at all (DL4). **Checked against the Niyamavali:** Part 10 honours erasure *"subject
   to lawful retention"* — CONSISTENT in kind (a retention exception); whether this retention is lawful is counsel's (`-423`
   Consequence 3), ⛔ the Niyamavali's. ⛔ Clause contradicts it.
2. **The intake door (a new conjunct on who a claim may be filed for).** *In the member's terms:* **"If, when your death is first
   reported, you had only signed up and never done your identity check, had never paid the joining fee, had left the Trust, had been removed from it, or had had your record erased,
   no claim can be filed for you — the helpline tells your family so on the call and keeps no claim; if you were new, behind on your
   contributions or suspended, a claim is filed as usual and the existing rules decide it."** **Checked against the Niyamavali:** §2.1
   (*"Registration alone does not constitute membership"*) and §8.4 / §8.4a (termination: beneficiary entitlement *"Ended"*) —
   CONSISTENT. Withdrawal and erasure: the Niyamavali is SILENT (⛔ clause found). ⚠ **Two mismatches, routed, ⛔ built** — §2.1 lists
   (a) registration, (b) identity verification (KYC), (c) the fee, (d) admission, so the Niyamavali alone would ALSO refuse:
   **(i) an identity nobody has checked** — a member who joined through the manual fallback (`self_declared`, `trusteeVerified: false`),
   in ANY state: the ruled words *"had not finished joining (⛔ identity check)"* literally reach them, while `-423` Consequence 1 (c)
   lists only `pending-kyc` and the *"⛔ Touched … first days after joining"* list covers `lock-in` — where, TODAY, they stay for good
   (G9a) ⇒ **PQ1 (a)**; this story builds them OPEN — a DECLARED NARROWING of the ruled words, ⛔ silent; **(ii) `pending-fee`** (fee unpaid —
   identity verified OR given through the unverified manual fallback) — the fee is ⛔ in the Panel's words at all ⇒ **PQ1 (b)**; built
   OPEN.

   ⭐ **RULED 2026-10-31 (`-424`):** (i) Q1 (a) **C** — the typed-in identity is FILED (the door stays open — this story), and staff check
   it before any drive opens (row `6-39-…` — ⛔ this story); (ii) Q1 (b) **B** — `pending-fee` is REFUSED at the door (`not_paid`) —
   CONSISTENT with §2.1 (c). The family is told one general reason (Q3 B).

   ⚠ **What the door refuses is tied to the lifecycle STATES, ⛔ to how identity is checked.** "Never finished joining" means
   `pending-kyc` only because today `pending-kyc` is reached only at signup. Any change to the KYC basis — DigiLocker made mandatory, KYC
   moved before a member record exists, a re-verification of typed-in identities — REOPENS PQ1 (a), and any new way INTO a refused state
   (e.g. a re-verification that sends a paid member back to `pending-kyc`) would silently refuse that member's family as "never finished
   joining". DL17 makes that fail CI.

3. **The after-death locks on the member's own account (Q2 (a) / (b), `-424`; NEW conjuncts on withdrawal and on Life Events).** *In the
   member's terms:* **"Once anyone files a claim for your death, your membership can no longer be withdrawn and your details can no
   longer be changed from your account — your family asks the helpline instead, and any change the Trust's staff make is added beside
   the old entry, never replacing it; if you are in fact alive, both open again once the claim is found to be about a living member."**
   **Checked against the Niyamavali:** withdrawal after death and changes to a dead member's record — SILENT (⛔ clause found; the
   nominee declaration is already locked by 6.20). ⚠ Today ⛔ member can withdraw at all (G9a), so the withdrawal lock binds only once
   row `3-14` lets members leave lock-in.

## ⭐ THE INVARIANTS

**N1 — One predicate for "a death is reported and stands".** `isDeathReportStanding(db, pariwarId, memberId)` = a `claims` row exists for
the member as the deceased, in ANY state, that ⛔ `member_found_innocent` finding has released. ONE SQL, in a LEAF module; the nominee lock,
the erasure lock and the intake door all call it. ⛔ A second copy anywhere (AC11's fence).

**N2 — Erasure is refused on BOTH routes while N1 holds.** The refusal lives INSIDE `resolveRtbfLegality` (the one function both handlers
call), ⛔ in either handler. The member's state does ⛔ matter: an `active`, `withdrawn` or terminated member with a standing report is refused
alike. An `anonymized` member still answers `already_anonymized` (nothing left to protect).

**N3 — Erasure and intake serialise on the SAME lock.** Each erasure transaction takes `pg_advisory_xact_lock(intakeAdvisoryLockKey(p, m))`
BEFORE the existing `rtbfAdvisoryLockKey` lock and BEFORE the N1 read — through ONE domain helper (DL3); intake already takes it before
minting. ⛔ Path takes the rtbf key and then the intake key ⇒ ⛔ lock-order cycle. ⚠ **What the lock is FOR — said plainly so the test is
⛔ vacuous:** erasure is legal only for a `withdrawn` or terminated member, and the door refuses exactly those, so in a TWO-party race
over a member already erasable ⛔ claim can be minted in either order — the DOOR closes that case, ⛔ the lock. The lock closes the
case where the member's state CHANGES during the race: an intake that passed the door on `active` holds the lock with its claim
uncommitted; a withdrawal (which takes ⛔ lock) commits; an erasure then reads `withdrawn` — without the lock it sees ⛔ committed
claim and erases, and both commit; with it, it waits, sees the claim and is refused `death_reported`. It also keeps the race closed if
PQ1 later narrows the door.
⚠ **CORRECTED 2026-10-31 (code review round 5, patch 11):** "a withdrawal (which takes ⛔ lock)" was true at authoring. Since DL18 the
withdrawal route takes the intake key itself (`lockAndReadDeathReport`), so it waits behind the intake. The lock-free writer into an
erasable state is now a moderation TERMINATION (`moderateMember` takes ⛔ advisory lock). The race spec runs both as stand-ins (rounds 4–5).

**N4 — The door is checked ONCE per death, at the first report.** Inside `tryConverge`, under the intake lock: when N1 is FALSE (⛔ claim,
or every claim released as alive) the door decides; when N1 is TRUE the death was already reported while the person passed the door, and
today's flow (converge / idempotent / cross-channel pending / re-file guard) runs UNCHANGED. "At their death" = the state when the death is
first reported (G10: ⛔ death date exists at intake). ⚠ **A standing claim that is TERMINAL** (`CLAIM_TERMINAL_STATES` =
`settled` / `denied` / `closed`, `claim/read.ts`; ⛔ innocence-released) is ⛔ a convergence candidate, so a new report reaches the MINT
branch — with ⛔ door (N1 is TRUE), even for a member withdrawn or terminated since — and meets the EXISTING mint guards UNCHANGED, which
decide it (⛔ the door, ⛔ "it mints"):
  - most recent terminal claim `closed` FOR NO RESPONSE (a `claim_correction_closures` row in state `closed`) ⇒ `assertRefileAllowed`
    throws 409 `claim.refile_requires_confirmation` until a person records a re-file confirmation (`-254`); then it mints and consumes it;
  - `denied` (incl. a stage-3 uphold), or `closed` by another trigger (⛔ correction-closure row) ⇒ mints freely;
  - the death's payment already committed (`settled`, or the paid claim overridden apart) ⇒ mints and is CLOSED IN THE MINT (6.28 OP4
    H(ii), `2026-10-11-319`).
  (`approved` and `reversed` are ⛔ terminal ⇒ candidates ⇒ converge / pend, as today.) The door sits BEFORE all of this, so for a FIRST
  report the door's 409 wins over the re-file 409; for a later report the door never runs. Consistent with `-423` reading 1 (the death was
  reported while the person passed the door); AC8 tests each leg. ⚠ Termination and withdrawal take ⛔ intake lock, so one that commits DURING a first intake does ⛔ stop that
intake's mint — consistent with "the state at the first report"; noted, ⛔ fixed.
⚠ **CORRECTED (round 5, patch 11):** since DL18 a WITHDRAWAL takes the intake key (it waits behind a first intake, then is refused
`withdrawal.death_reported`). Only a termination is still lock-free. The termination case stands as written.

**N5 — Refused at the door means ⛔ record.** A refusal writes ⛔ `claims` row, ⛔ `intake_attempts` row, ⛔ `events_log` row, ⛔ new audit
type. It throws BEFORE any write in `tryConverge`. Two EXISTING security lines stay, unchanged in kind: the helpline catch's
`helpline_claim.intake_failed` (a staff ACTION — `-423` reading 2; its `context.error` = `${err.name}: ${err.message}` =
*"ConflictError: A claim cannot be filed for this member"*) and the member route's `member_claim.intake_failed` (`context.error` =
`err.name` — the deceased's OWN account acting, ⛔ a caller's record; reading 2's logic covers it). ⚠ Neither carries the reason, and
`emitAuthAudit`'s `context` is only SHA-256 HASHED (`audit_log_entries` has ⛔ context column — `auth/shared/audit.ts`), so ⛔ text in
either line is readable at rest. Whether the helpline line NAMES the reason (via `resourceLocator`) is DL16 — BigDev's.

**N6 — Exactly five refusals, and only these (`-423` Q3 B + `-424` Q1 (b) B).** `anonymized` ⇒ `erased`; terminated (moderation overlay)
⇒ `removed`; `withdrawn` ⇒ `left`; `pending-kyc` ⇒ `not_joined`; `pending-fee` ⇒ `not_paid`. Checked in that order. Every other
lifecycle state (`pending-valid`, `lock-in`, `active`, `active-in-grace`, `lapsed-unpaid`) and `suspended` ⇒ open — the existing rules
decide them later (`-423` Q3 *"⛔ Touched"*). A typed-in identity nobody checked is OPEN in any state (`-424` Q1 (a) C — "filed"; the
check before a drive is row `6-39-…`). An exhaustive `switch` with a `never` arm: a new lifecycle state FAILS TO COMPILE until someone
decides it. A new way INTO an existing refused state is caught by DL17.

**N7 — The operator is told WHY; the caller and the app are told ONE GENERAL reason (`-424` Q3 B).** The helpline sees one line per
reason, is told to read back what they searched with, and to tell the caller only: *"the person was not a member of the Trust when they
died"*. The app shows ONE calm message carrying that same general sentence — ⛔ which of the five it was — and the specific reason is ⛔
on the member route's WIRE (uniform withholding: a reason the screen hides but the 409 body carries is a disclosure — DL8).

**N9 — After a death is reported, the member's account can ⛔ WITHDRAW and ⛔ CHANGE the record directly (`-424` Q2 (a) / (b)).** The
same predicate (N1) gates withdrawal (DL18) and the member's own Life Events writes — address, posting, the answer to a suggested
workplace, the medical declaration (DL19); the nominee declaration is already locked (6.20). Each write path takes the INTAKE key first
(the 6.20 D3 precedent), then reads N1. Lifted exactly as erasure is: only by the innocence finding (DL4). ⭐ **The Panel's addition:** a
STAFF change to such a member's record never removes the old entry — both stay, the old clearly visible beside the staff's new entry
(DL19 (c)).

**N8 — See and ask stay OPEN after a death is reported — for a member who is ⛔ `withdrawn` / `anonymized`.** The in-app data export (the
deceased's session — Ravi mode), the Pariwar Admin's off-portal export (`member-data-rights` `requestExport` + delivery), the
`dpdpa-data-rights` helpdesk ticket and the staff `recordCorrection` keep working for a member with a standing report — fenced by tests
(AC11), so a later freeze conjunct cannot silently remove what Q2 A grants. ⚠ **The edge this story does ⛔ close:** both exports refuse
a `withdrawn` member (`DATA_EXPORT_TERMINAL_STATES` → 409 `data_export.member_terminal`), and withdrawal stays reachable after a death is
reported (`assertWithdrawable` reads ⛔ claim) — so ONE post-death withdrawal ends SEE on both routes (only `recordCorrection`, a record,
survives). That is PQ2's harm; ⛔ built until the Panel answers.

## Found facts (traced at `01062c51`)

- **G1 — Erasure has exactly two call sites, both synchronous.** `apps/api/src/modules/rtbf/handlers.ts` `assertAnonymizable` (→ `confirm`):
  `memberExists` → `pg_advisory_xact_lock(rtbfAdvisoryLockKey)` → `getMemberStateAt(tx, memberId, deps.clock())` →
  `resolveRtbfLegality` → 409 `rtbf.already_anonymized` / `rtbf.invalid_state`; then `anonymizeMember` + `projectMemberState`
  (`member.rtbf_anonymized`) in ONE `openScopeTx`. `apps/api/src/modules/member-data-rights/handlers.ts` `fulfilErasure`: ticket →
  attribution → `claimIdempotency` → `openScopeTxClaimed` → `requireTicketInScope` → `memberExists` → the same advisory lock →
  `getMemberStateAt` → `resolveRtbfLegality` → the same two 409s → `withCompensatingAudit(anonymizeMember + projectMemberState)`.
  `anonymizeMember(` has ⛔ other production caller; ⛔ job runs an erasure later (⛔ grace period). Traced 2026-10-31: the member route is
  ONE synchronous step (`rtbf/routes.ts` has one route — the confirm; ⛔ request-then-execute); the off-portal ticket is filed EARLIER
  but the erasure is a separate act whose legality is read INSIDE the executing transaction, so a ticket filed before a death report and
  executed after it is refused; a replay of the irreversible act is refused (409 `member_data_rights.idempotency_replay`) and a FAILED
  attempt releases its key, so a retry re-reads legality. `member.rtbf_anonymized` is emitted ONLY by the two handlers; the
  `ANONYMIZED_SENTINEL` is written ONLY inside `member/anonymize.ts`. The jobs that DELETE rows (`apps/jobs/src/device-token-cleanup.ts`
  — stale push tokens; `sms-delivery-prune.ts` — the global SMS delivery-report inbox) prune OPERATIONAL rows, ⛔ the member's record;
  ⛔ touched (⛔ an erasure in `-423`'s sense).
- **G2 — `resolveRtbfLegality(db, memberId, currentState)`** returns `already_anonymized` | `legal via withdrawn` | `legal via terminated`
  (reads `getCurrentMemberModerationOverlay`, unbounded, on purpose) | `illegal`. ⛔ `pariwarId` parameter, ⛔ claim input. ⛔ Direct unit
  test of the predicate (the race is covered by `packages/domain/tests/integration/member/rtbf-concurrency.spec.ts`).
- **G3 — `claims`** (`packages/domain/migrations/0051_claims-lifecycle.sql`; `packages/domain/src/schema/claims.ts`): `deceased_member_id uuid
  NOT NULL`, index `claims_deceased_member_id_idx`; ⛔ DELETE grant (never row-deleted). `claim_lifecycle_state` includes `denied`,
  `reversed`, `settled`, `closed`; `claim.closed` triggers are only `suspicion_appeal_allowed`, `death_already_finally_approved`. ⛔ Event or
  state means "closed because the member is alive".
- **G4 — The one "alive" fact the code has** is `claim_nominee_findings.kind = 'member_found_innocent'` (`-238` cl. 1: *"A claim filed
  against a member who is **alive** does ⛔ not lock that member's declaration for life"*; the finding kinds today are
  `member_found_innocent` and `nominee_disqualified` — ⛔ guilty kind yet), written by `recordMemberInnocenceFinding` — ⛔ production caller until row
  `6-22-fraud-register-blacklist-instrument-and-identifier-set` lands (`nominee-lock.ts` header; that row is `backlog`).
  `isNomineeDeclarationLocked` is raw SQL with explicit aliases ([[project_epic6_drizzle_correlated_subquery_bug]]); the same
  "⛔ released" filter recurs in `claim/approval-warnings.ts` (THREE copies) and `claim/peer-mesh-read.ts` (one) — read-only uses whose
  comments name `nominee-lock.ts` / `isNomineeDeclarationLocked` as the source (DL13 re-points the comments; the SQL is ⛔ touched).
- **G5 — Locks.** Erasure: `rtbfAdvisoryLockKey` = sha256 `member.rtbf:${p}:${m}` (`member/rtbf-legality.ts`). Intake:
  `intakeAdvisoryLockKey` = sha256 `${p}:${m}` (`claim/icp-lock.ts`, a leaf). The two keys differ and intake ⛔ locks the `members` row ⇒
  TODAY an erasure and an intake can both commit (READ COMMITTED). The nominee edit's D3 (`acquireNomineeDeclarationLock`) is the precedent:
  the intake key FIRST, then the check. Intake-key takers today: `icp.ts` (`acquireIntakeLock`), `refile-guard.ts`,
  `verifier-decision-persist.ts`, `suspicion-refusal-persist.ts` (twice — its header lists *"Every intake-key taker"*), the nominee edit.
  rtbf-key takers: the two erasure handlers + three `member-data-rights` delivery / redeem paths (rtbf key ONLY). ⛔ Path takes rtbf
  then intake. `anonymizeMember` takes ⛔ lock. The withdrawal and moderation writers take ⛔ lock.
- **G6 — Import direction.** `claim/` already imports `member/` (`nominee-correction-persist.ts`, `peer-mesh-*.ts`); `member/` imports ⛔
  `claim/` module today. A `member/ → claim/<leaf>` import is safe ONLY if that leaf imports nothing from `claim/` ([[project_type_only_import_cycle_trap]]).
- **G7 — The intake paths.** The ONE `insert(claims)` is `claim/project.ts` (via `projectClaimState`); the two mints emitting
  `claim.intake_initiated` are `tryConverge` and `overrideIntakeAttempt` (`claim/icp.ts`). `tryConverge` is reached only through
  `initiateIntake` — by the helpline (`claims.helpline.handlers.ts`: `memberExists` only, 404 `member.not_found`) and the member app
  (`POST /api/v1/member/claims/intake`, `claims.handlers.ts`: the deceased IS the session member — Ravi mode; ⛔ `memberExists`, ⛔ state
  read). `overrideIntakeAttempt` mints only from a `pending` intake attempt, which exists only beside a candidate claim ⇒ the death is
  already reported (N4) — ⛔ gated.
- **G8 — `tryConverge` order:** `acquireIntakeLock` → `getConvergenceCandidate` (non-terminal, ⛔ window) → ⛔ candidate: `assertRefileAllowed`
  then mint; same-channel: idempotent; cross-channel: `pending` attempt.
- **G9 — Member state.** `MEMBER_LIFECYCLE_STATES` (`packages/domain/src/schema/members.ts`): `pending-kyc`, `pending-fee` (*"KYC done
  (DigiLocker-verified or manual fallback), awaiting fee"*), `pending-valid` (*"lock-in elapsed but KYC still unverified"*), `lock-in`,
  `active`, `active-in-grace`, `lapsed-unpaid`, `withdrawn`, `anonymized`. ⛔ `deceased` state (death is an overlay —
  [[project_death_is_an_overlay_not_a_state]]). Termination is the moderation overlay: `getCurrentMemberModerationOverlay(db, memberId)`
  (`member/moderation/overlay.ts`, unbounded — the bounded variant is unsafe for legality; returns `{ status, reasonCode, since,
  lastActionAt }`, `NO_MODERATION.status === 'none'` for a never-moderated member), `MODERATION_STATUSES = ['none','suspended','terminated']`
  (`member/moderation/status.ts`). Moderation writes do ⛔ gate on lifecycle ⇒ `withdrawn` + terminated and terminated-then-`anonymized`
  are both reachable. `getCurrentMemberState(db, memberId): Promise<MemberLifecycleState>` (`member/read.ts`) = the unbounded
  `events_log` replay (the clock-domain-safe read; ⛔ `members.state`, a projected cache). ⚠ A member with ZERO events replays to
  `pending-kyc` (the reducer's initial state) — this is what makes TR2 bite. `kyc_manual_fallback` moves `pending-kyc` → `pending-fee`
  WITHOUT verification; `lock_in_expired` with `kyc_verified: false` gives `pending-valid` (`member/state.ts`).
- **G9a — How identity is checked TODAY, and the two missing steps** (traced 2026-10-31). Signup = phone only (`pending-kyc`, ⛔ name).
  Then `kyc.routes.ts`: DigiLocker (`/kyc/initiate` + `/confirm` — the Trust receives the Aadhaar-backed details from DigiLocker;
  `verificationStrength: 'aadhaar_kyc'`; `member.kyc_completed`) OR the manual fallback (`/kyc/manual` — the member's own entry;
  `'self_declared'`, `trusteeVerified: false`; `member.kyc_manual_fallback`), the choice per cohort by the inverted `kyc_manual_fallback`
  flag (default: manual AVAILABLE) or a stale DigiLocker certificate; ⛔ DigiLocker secrets ⇒ the fixture provider. ⚠ **Missing:** (i) ⛔
  production emitter of `member.lock_in_expired` (only test seeds), and `lock-in` has ⛔ other exit ⇒ ⛔ member reaches `active` or
  `pending-valid`; the renewal scheduler fires grace only from `active`; withdrawal is allowed only from `active` / grace / lapsed (so
  PQ2 (a) is unreachable today); `lock-in` IS covered (`VALID_STATES`). (ii) `trusteeVerified` is set `true` nowhere; ⛔ staff / trustee
  surface verifies a typed-in identity. Recorded as an observed gap in `deferred-work.md` (2026-10-31). ⛔ This story's to build; the door
  is unaffected (it reads the state; the `pending-valid` arm is inert today).
- **G10 — ⛔ death date at intake.** Neither intake request carries one; OCR is the all-null provider; the certificate date arrives at 6.21a
  review ([[project_ocr_v1_always_empty]]) ⇒ the state at the first report stands in for the state at death.
- **G11 — Signup** creates the member at `pending-kyc` with only a phone (`signup.handlers.ts`); the name lives only in
  `member_kyc_profiles` (written at KYC) — hence the blank name the routing note found.
- **G12 — Who reaches the app intake.** `pending-kyc`: yes (a full session at signup). Terminated: yes while `termination_access_block` is
  OFF (default). `withdrawn` / `anonymized`: login and refresh refuse — only a ≤ 15-minute access-token window. The door is in the shared
  core, so all are covered.
- **G13 — The operator's screens.** The lookup is the 4.7 member search (`member-validity/handlers.ts`): it shows the lifecycle `state`
  badge, ⛔ moderation status (a terminated member looks ordinary). The search is by `HelplineLookupMethod` = `memberId` / `mobile` /
  `pariwar` — there is ⛔ membership number ([[project_membership_number_deferred_feature]]). `HelplineClaimPage.tsx` `submitIntake`
  `onError` only SETS STATE for two codes (`auth.step_up_required` → `setStepUpRequired`; `claim.refile_requires_confirmation` →
  `setRefileClaimId` from `details.closed_claim_case_id`) and renders nothing. The alert TEXT always comes from the `submitError`
  EXPRESSION passed to `HelplineConsoleShell` (`submitError?: string` → ONE `<p role="alert">`): `messageOf(intake.error)` — the raw
  server English — for every error except step-up (so the refile 409's raw English still shows beside its card). `resetDownstreamState`
  (called by `selectMember` and `onSearch`) resets the step-ups and `refileClaimId` but ⛔ calls `intake.reset()` — a failed submit's
  error OUTLIVES a change of member. The admin keeps the refile code as a LOCAL literal. Admin `ApiError` (`apps/admin/src/api/client.ts`)
  carries `code`, `status`, `details` (parsed from `body.error.details`). Copy: `helpline-claims/i18n-en.ts` (`resolveEn(key)` — untyped
  `Record<string,string>`, returns the KEY when missing; ⛔ test checks keys exist), English only; the `helpline.intake.*` namespace is free.
- **G14 — The Pariwar Admin's erasure** button lives in `apps/admin/src/modules/helpdesk/HelpdeskDetailShell.tsx`; refusals render as
  `messageOf(err)` (raw server English) in `HelpdeskDetailPage.tsx` — the `dataRightsError` `??` chain (a stale `buildExport` error sits
  AHEAD of the erasure error), passed to the Shell's `role="alert"`; copy in `helpdesk/i18n-en.ts` (`helpdesk.dataRights.*`).
  ⛔ Admin test exercises the erasure button, and ⛔ test renders `HelpdeskDetailPage` at all (it needs eight hooks); the Shell is tested in
  `apps/admin/tests/helpdesk-responder-console.test.tsx` (`describe('<HelpdeskDetailShell> (D5)…')`, a `dataRightsDetail` fixture).
- **G15 — The nominated person (Q2).** ⛔ Separate data-rights nominee exists: the only nomination is the claim nominee (`member_nominees`,
  Story 3.4); `member_nominee_links` (6.36e) grants ⛔ access. The nominee acts through the DECEASED'S own session (Ravi mode — 9.1; the
  `claim_handover` OTP to the nominee's declared mobile gates the claim filing). That session reaches: the data export
  (`data-export/routes.ts` — blocked only for `withdrawn` / `anonymized`; download step-up `data_export`, whose code goes to the
  DECEASED'S mobile), the `dpdpa-data-rights` helpdesk subcategory (`apps/mobile/app/(helpdesk)/new.tsx`), Life Events edits (address
  with ⛔ step-up, posting, medical with `medical_change`), and WITHDRAWAL (`withdrawal/routes.ts`; `assertWithdrawable` checks only
  `active` / `active-in-grace` / `lapsed-unpaid`, reads ⛔ claim; ⛔ session revoked). Erasure after that withdrawal is reachable at the
  API ONLY (`POST /member/rtbf` within the 15-minute token window) — ⛔ through any app screen (G16); the realistic path is a
  `dpdpa-data-rights` ticket then the Pariwar Admin's off-portal erasure (the routing note's E3, now traced). The `account-frozen`
  overlay has ⛔ consumer in the session guard, step-up, export, helpdesk or data-rights handlers ⇒ ⛔ existing freeze blocks SEE / ASK
  today. The nominee declaration itself is locked (6.20). The staff `recordCorrection` (`member-data-rights/handlers.ts`) is a RECORD
  (*"THIS RECORDS; IT DOES NOT WRITE"*), checks only `memberExists`, and has ⛔ "who asked" field.
- **G16 — The mobile app has ⛔ erasure screen** (`anonymizeMember` in `packages/api-client` has ⛔ mobile caller); `rtbf.*` copy keys in
  `packages/i18n/locales/{en,hi}/common.json` have ⛔ consumer.

## Build decisions — ANSWERED (BigDev, 2026-10-31, Task 0.2: *"DL1-DL16 as recommended"*)

Every DL below is built as written; where a DL offers a choice, the recommended option is the answer (DL16 ⇒ (a)). DL17 was added
after Task 0.2 (BigDev's question on a later change to the KYC basis) and approved the same day: *"yes, add DL17"*. The proposed
English copy of DL9 / DL10 / DL11 is approved as written. The DL10 Hindi TITLE + BODY are HUMAN-REVIEWED — BigDev, 2026-10-31: *"DL10
Hindi is fine"*. The call + back strings are the already-reviewed `refile.*` ones (2026-10-01).

- **DL1 — The leaf predicate.** NEW `packages/domain/src/claim/death-report.ts` exporting `isDeathReportStanding(db: Db, pariwarId: PariwarId,
  memberId: MemberId): Promise<boolean>` — the SQL of `isNomineeDeclarationLocked`, MOVED here unchanged (raw SQL, explicit aliases, the
  explicit `pariwar_id` predicate as well as RLS). It imports ONLY `drizzle-orm`'s `sql`, the `Db` type (`../db.js`) and id types
  (`../ids/index.js`) — ⛔ anything from `claim/` (so `member/` may import it — G6). `isNomineeDeclarationLocked` becomes a one-line delegation (its name, signature, header and
  callers unchanged). *Rejected:* a copy of the SQL in `member/` (a second definition of "reported"); importing `nominee-lock.ts` from
  `member/` (it imports `icp.js` and `project.js` — a runtime init cycle typecheck cannot see).
- **DL2 — The erasure refusal.** `resolveRtbfLegality(db, pariwarId, memberId, currentState)` (⭐ `pariwarId` ADDED; both callers have it)
  gains `{ kind: 'death_reported'; fromState }`, checked AFTER `anonymized` → `already_anonymized` and BEFORE the `withdrawn` / terminated
  arms. Both handlers map it to 409 **`rtbf.death_reported`**, message *"Erasure is refused: a claim has been filed for this member's death"*.
  ⛔ Change to the other kinds or codes. ⚠ The new kind also carries `fromState`, so a handler that keeps today's two `if`s and then
  reads `legality.fromState` COMPILES and ERASES: each handler narrows with an exhaustive `switch (legality.kind)` + a `never` default
  (or `if (legality.kind !== 'legal')` before reading `fromState`), so a missing arm fails to compile. ⛔ `rtbf.death_reported` key in
  `packages/i18n` `common.json` (the `rtbf.*` keys have ⛔ consumer; ⛔ unreviewed Hindi ships).
- **DL3 — Serialise (N3), through ONE helper.** NEW `acquireErasureLocks(client, pariwarId, memberId)` in `member/rtbf-legality.ts`:
  `SELECT pg_advisory_xact_lock(intakeAdvisoryLockKey(pariwarId, memberId))` then the existing `rtbfAdvisoryLockKey` lock — taking ⛔
  advisory lock before the intake key. It imports `../claim/icp-lock.js` (a leaf — `node:crypto` only). BOTH handlers replace their
  inline rtbf-lock call with it, in the same transaction, and the AC5 race spec CALLS it (⛔ a hand copy of the lock order — a copy proves
  only the copy: [[feedback_stub_must_call_not_transcribe]]). Order everywhere: intake key → rtbf key. The handlers' entry reads before
  it (`memberExists`, `requireTicketInScope`) take ⛔ lock, which satisfies `suspicion-refusal-persist.ts`'s intake-key-taker rule.
- **DL4 — The release is `member_found_innocent`, and nothing else.** It is the only fact the code has that a reported member is alive
  (G4). ⛔ 6.38 builds a "found alive" act — that is the fraud register's (row 6-22). ⚠ Consequence, said plainly: until 6-22 lands, a
  living member wrongly reported can ⛔ have their record erased at all (the same named residual 6.20 carries for the nominee lock).
  Recorded in `deferred-work.md` (trigger: 6-22's create-story) and as a dated comment line on the 6-22 row. ⚠ Also for 6-22: it WILL
  build the GUILTY arm — ratified and owed (`-238` cl. 4 *"TWO OUTCOMES ONLY"*, cl. 5 guilty ⇒ *"terminated and blacklisted"*; `-241`
  Consequence 3). Q1 (b)'s words (*"closed because the member is alive"*) cover a guilty-but-alive finding too, so releasing the erasure
  lock on INNOCENCE ONLY is a NARROWING of Q1 (b) that 6-22 must put to the Panel or justify (⛔ reachable today — ⛔ finding of any kind
  is written). Equating "closed because the member is alive" with `member_found_innocent` is this story's READING, ⛔ ratified.
- **DL5 — "Filed" = a `claims` row exists** (any state, any closure — `-423` reading 1). An `intake_attempts` row alone ⛔ counts (it
  exists only beside a candidate claim anyway — G7).
- **DL6 — The door.** NEW `packages/domain/src/claim/intake-door.ts`: `resolveClaimIntakeDoor(db, memberId): Promise<{ kind: 'open' } |
  { kind: 'refused'; reason: ClaimIntakeRefusalReason }>`, importing DIRECTLY `getCurrentMemberState` from `../member/read.js` (unbounded
  replay — G9) and `getCurrentMemberModerationOverlay` from `../member/moderation/overlay.js` (unbounded; refuse on `overlay.status ===
  'terminated'`) — the `claim/nominee-correction-persist.ts` precedent; ⛔ cycle (`member/` imports only `claim/death-report.js` and
  `claim/icp-lock.js`, both leaves). Precedence N6. ⚠ **The vocabulary is DOMAIN-OWNED** (`@twt/domain` ⛔ imports `@twt/contracts` —
  contracts depends on domain, a turbo cycle): `CLAIM_INTAKE_REFUSAL_REASONS = ['erased', 'removed', 'left', 'not_joined', 'not_paid'] as const` +
  `type ClaimIntakeRefusalReason` live in `claim/intake-door.ts` (`claim/errors.ts` type-imports it). Contracts MIRRORS the tuple with ⛔
  source import, in a NEW `packages/contracts/src/claims/intake-refusal.ts` beside `CLAIM_INTAKE_REFUSED_CODE` (contracts-only — API and
  mobile use it), re-exported by an `export * from './intake-refusal.js'` line in `packages/contracts/src/claims/index.ts` (the barrel the
  top `index.ts` re-exports); a lockstep test in `packages/contracts/tests/` pins the two tuples equal (the `APPROVAL_WARNING_REASON_REFUSALS`
  precedent).
- **DL7 — Where the door runs (N4).** In `tryConverge`, after `acquireIntakeLock` and BEFORE `getConvergenceCandidate` (the `db =
  bindScopedDb(client)` already in scope): `if (!(await isDeathReportStanding(db, input.pariwarId, input.deceasedMemberId))) { const door =
  await resolveClaimIntakeDoor(db, input.deceasedMemberId); if (door.kind === 'refused') throw new
  ClaimIntakeRefusedError(input.deceasedMemberId, door.reason); }`. ⛔ Gate on `overrideIntakeAttempt` (G7). ⛔ Gate in either handler (one
  door). ⚠ Two residual edges, ⛔ reachable until 6-22 writes a finding (the innocence finding changes ⛔ claim state, so a released
  claim can still be a non-terminal candidate): (a) when the door opens for a released member, a new report CONVERGES onto the released
  claim; (b) a `pending` attempt parked beside a claim later released can still be overridden by `overrideIntakeAttempt` with ⛔ door.
  Recorded for 6-22 in the same deferred item as DL4; ⛔ built.
- **DL8 — The 409, and who sees the reason.** `ClaimIntakeRefusedError` in `claim/errors.ts`; `translateClaimIntakeRefused(err, { withReason })`
  in `claims.service.ts`, called in `initiateIntake`'s `catch` beside `translateRefileRequiresConfirmation` → `ConflictError('A claim
  cannot be filed for this member', CLAIM_INTAKE_REFUSED_CODE, withReason ? { reason } : undefined)` (`ConflictError(message, code,
  details?)` — `details` reaches the wire via `toErrorResponse`), `CLAIM_INTAKE_REFUSED_CODE = 'claim.intake_refused'` exported from
  contracts (the `REFILE_REQUIRES_CONFIRMATION_CODE` precedent, `contracts/src/claims/death-certificate.ts`). ⭐ **Only the HELPLINE
  route passes `withReason: true`;** the member route's 409 carries ⛔ `details` at all (N7 — uniform withholding: the app hides the
  reason, so the wire must too, or PQ3 is answered by default). Thread the flag from each handler into `initiateIntake` (or strip in
  `claims.handlers.ts`) — the dev picks, the test (AC7) pins it. ⛔ Name, ⛔ member id in the message or details. The two existing
  audit lines stay as N5 describes; ⛔ new audit type.
- **DL9 — The operator's words** (`helpline-claims/i18n-en.ts`, keys `helpline.intake.refused.<reason>` + `helpline.intake.refused.tellCaller`):
  a pure `intakeRefusalKey(err)` in `HelplineClaimPage.tsx` (the `refusalKey` pattern of `HelplineClaimContact.tsx`) returns the reason's
  key when `err instanceof ApiError && err.code === CLAIM_INTAKE_REFUSED_CODE` and `details.reason` is in `CLAIM_INTAKE_REFUSAL_REASONS`
  — BOTH imported at RUNTIME from `@twt/contracts` (⛔ a local literal; the admin already imports runtime contracts values, e.g.
  `DPDPA_DATA_RIGHTS_SUBCATEGORY`), else `null`. The line is derived IN the `submitError` expression (G13): a key ⇒ `resolveEn(key) + ' '
  + resolveEn('helpline.intake.refused.tellCaller')`; else today's `messageOf`. ⛔ New state in `onError` (TR7). ⭐ And
  `resetDownstreamState` ALSO calls `intake.reset()`, so a refusal for member A is ⛔ shown after the operator selects member B or
  searches again — the very re-check `-423` reading 3 relies on. Proposed copy (BigDev approves or edits; there is ⛔ membership number —
  G13):
  - `not_joined` — *"This person signed up but never finished joining — their identity check was not done. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it."*
  - `left` — *"This member had left the Trust. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it."*
  - `removed` — *"This member had been removed from the Trust. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it."*
  - `erased` — *"This member's record was erased at their request. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it."*
  - `not_paid` (`-424` Q1 (b)) — *"This person gave their details but never paid the joining fee. A claim cannot be filed. Read back to the caller the member ID or mobile number you searched with, to check it."*
  - the shared `tellCaller` line after each (`-424` Q3 B): *"If the details are right, tell the caller: the person was not a member of the Trust when they died, so a claim cannot be filed."* — ⛔ the specific reason.
- **DL10 — The app's words.** NEW calm state `apps/mobile/app/(claim)/cannot-file.tsx` (the `refile-helpline.tsx` shape: plain `YStack`,
  ONE `accessible` labelled container announced on arrival, `<CallHelplineCTA chromeless={false} theme="accent" height={56}>`, a chromeless
  back button `router.replace('/(tabs)')`; ⛔ `CLAIM_STEPS`; `closed-helpline.tsx` / `closed-helpline-copy.ts` is an equally close
  precedent — a calm screen that gives ⛔ reason). The announce effect depends on the RESOLVED STRINGS (`[title, body]`), ⛔ on `t` —
  `useClaimT()` returns a fresh closure every render ([[project_uset_fresh_closure_memo_trap]]). Pure key map
  `apps/mobile/lib/cannot-file-copy.ts` (zero imports; holds the code LITERAL — the cross-check against `@twt/contracts` lives in the
  test, the `refile-helpline-copy.ts` precedent), keys `cannot_file.{title,body,call,back}` in the `claim` namespace. Routed from
  `relationship.tsx`'s catch (the ONLY mobile caller of `claimApi.initiateIntake`): after the `auth.step_up_required` branch and beside the
  refile branch, BEFORE `setError(t('relationship.error'))` — `if (e.code === CLAIM_INTAKE_REFUSED_CODE) { router.replace('/(claim)/cannot-file');
  return; }`, ⛔ `saveClaimDraft`. ⛔ Reason shown (N7) — and ⛔ reason is on this route's wire (DL8). ⚠ With ⛔ record kept, each re-entry
  walks the wizard back to `relationship.tsx`'s submit before the refusal shows — accepted (Q3 B's ⛔ record). Proposed copy — en: title
  *"A claim cannot be filed"*; body (`-424` Q3 B — the general reason) *"We cannot file this claim: the person was not a member of the
  Trust when they died. If you have a question, please call the helpline."*; call *"Call the helpline"*; back *"Go back"*. hi: *"दावा दर्ज
  नहीं किया जा सकता"* (reviewed — BigDev 2026-10-31) · *"हम यह दावा दर्ज नहीं कर सकते, क्योंकि मृत्यु के समय वे ट्रस्ट के सदस्य नहीं थे।
  कोई प्रश्न हो तो कृपया हेल्पलाइन पर कॉल करें।"* (the BODY is NEW after `-424` — reviewed by BigDev 2026-10-31: *"Hindi is fine"*; the
  earlier reviewed body is superseded) · *"हेल्पलाइन पर कॉल करें"* · *"वापस जाएँ"* (call + back are the ALREADY-REVIEWED `refile.call` / `refile.back`
  strings, 2026-10-01). ⚠ "call the helpline" is a route to a QUESTION, ⛔ an
  appeal (Q3 B) — the helpline is refused by the same door.
- **DL11 — The Pariwar Admin's words.** `helpdesk.dataRights.erasureRefused.deathReported` in `helpdesk/i18n-en.ts`, shown when the erasure
  error's code is `rtbf.death_reported` (other codes keep `messageOf`): *"This member's data cannot be erased: a claim has been filed for
  their death. The person they nominated may see the record and ask for corrections. It can be erased only if the claim is found to be
  about a member who is alive."* ⚠ **SUPERSEDED 2026-10-31 (code review round 5, decision E — BigDev: "1"):** the last sentence is now
  *"This stays so even if the claim is closed or refused; only a finding that the member is alive lifts it, and then the usual erasure
  rules apply."* The old sentence promised an erasure that an `active` member is still refused once released (round 4, patch 9). Round 4's
  interim wording (*"While the claim stands…"*) could be read as "while the claim is open", but a closed or refused claim still locks
  (`-423` reading 1). The quotation above is kept as approved at `-425`. ⛔ Pre-emptive disabling of the button (⛔ read exists that carries the fact; the refusal is the
  control). Build: a pure `erasureErrorText(err)` next to `messageOf` in `HelpdeskDetailPage.tsx` (the DL11 line for `rtbf.death_reported`,
  else `messageOf`), used at the erasure leg of the `dataRightsError` `??` chain; move the erasure leg FIRST in that chain so a stale
  `buildExport` error cannot hide the refusal.
- **DL12 — Q2 is built by DL2 + fences, ⛔ a new surface (N8).** SEE = the in-app export via the deceased's session, and the Pariwar
  Admin's off-portal export; ASK = the `dpdpa-data-rights` ticket + staff `recordCorrection` (a record — "ask, ⛔ edit" holds by
  construction); ⛔ ERASE = DL2. Both SEE routes are open only while the member is ⛔ `withdrawn` / `anonymized` (N8's edge — PQ2). ⚠
  READINGS for BigDev (⛔ the Panel's unless challenged): (i) the claim nominee IS the privacy policy's "nominated person" — the only
  nomination the Trust records; the draft policy's own words are *"**Nominate** a person to exercise your rights in the event of death or
  incapacity"* (`docs/legal/privacy-policy.md`, main checkout only) (BigDev + counsel own the policy wording — `-423` Consequence 2); (ii) the deceased's session holder is ⛔ proven to be the
  nominee for the export (its step-up code goes to the deceased's mobile) — recorded in `deferred-work.md` as a risk, ⛔ built: moving the
  export to the `claim_handover` code would cost a falsely-reported LIVING member their own export with ⛔ release until 6-22 — a cost ⛔
  put to the Panel.
- **DL13 — Stale text re-worded** (comments / docstrings only, ⛔ behaviour):
  - `rtbf-legality.ts` header (the rule text) and `resolveRtbfLegality`'s JSDoc `@param` list (add `pariwarId`);
  - `rtbf/handlers.ts` doc-block *"The rule is: legal from `withdrawn`, OR … `terminated`"* and `member-data-rights/handlers.ts`'s
    *"⛔ The SHARED predicate — legal from `withdrawn`, OR …"* comment (in `fulfilErasure`);
  - `member/state.ts`'s `member.rtbf_anonymized` arm comment (*"legal from EVERY live state"* — keep the reducer arm BROAD, legality is
    the predicate's; say the death lock lives there; fix its stale *"(`withdrawn` only)"* caller note);
  - `packages/api-client/src/index.ts` `anonymizeMember` docstring (already stale);
  - `claim/suspicion-refusal-persist.ts`'s *"Every intake-key taker"* list — add the erasure handlers via `acquireErasureLocks`;
  - `claim/approval-warnings.ts` (its header + the copy near the third filter) and `claim/peer-mesh-read.ts` — they name
    `isNomineeDeclarationLocked` / `nominee-lock.ts` as the predicate's source ⇒ name `death-report.ts`;
  - `member/anonymize.ts` — ADD (⛔ comment states reachability today) a note on the deceased-keyed scrubs (memorial MA15, 6.21a
    death-certificate reviews, 6.23a warning approvals, the `if (deceasedClaimIds.length > 0)` block): now reachable only for an
    innocence-released claim or a pre-6.38 row.

  Each cites `2026-10-30-423`. The `-159` cl. 11 citations in code cite the name-STAYS half ⇒ ⛔ edited.
- **DL14 — Fixtures follow the door.** Every test that files a claim for a member whose REPLAYED state is a refused one is re-seeded
  through events to an open state (TR2). ⛔ Test is weakened to get green; ⛔ door bypass flag.
- **DL15 — A caller fence for erasure.** A source-scan test in `apps/api/tests/unit/` (modelled on
  `family-account-reach-fence.test.ts`): comments stripped, scanning `apps/api/src`, `apps/jobs/src` and `packages/domain/src` —
  EXCLUDING the definition in `member/anonymize.ts` and `packages/api-client` (whose own `anonymizeMember(` method is ⛔ a production
  caller) — `memberDomain.anonymizeMember(` / `anonymizeMember(` appears at EXACTLY the two G1 sites; and in each of those FILES,
  `resolveRtbfLegality(` — or the `assertAnonymizable(` call that wraps it (`rtbf/handlers.ts` `confirm` reaches the predicate only
  through it) — precedes `anonymizeMember(` in the same function. A POSITIVE CONTROL (a planted third caller in a fixture string) is
  caught. A third caller fails CI until it is reviewed against `-423`. ⭐ **Delayed-job protection — the fence pins the ERASURE ACT,
  ⛔ only the function name**, because a future job or sweep could erase without calling `anonymizeMember(`: the same file also asserts
  (i) `'member.rtbf_anonymized'` as an `eventType` is emitted ONLY at the two G1 handlers (the reducer accepts it from EVERY live state —
  DL13 keeps that arm broad — so an emitter elsewhere would bypass the lock entirely), and (ii) `ANONYMIZED_SENTINEL` is WRITTEN only in
  `member/anonymize.ts` (comparisons `===` / `!==` and the read-side imports are allow-listed). Both scans cover `apps/jobs/src`. And
  the `rtbf-legality.ts` header (DL13) states the RULE a future deferred / scheduled erasure must follow: legality is decided at
  EXECUTION, inside the executing transaction, after `acquireErasureLocks` — ⛔ at request or scheduling time (a death can be reported
  in between). ⚠ Out of the fence's reach, said plainly: SQL in migrations or operator scripts; those are reviewed by hand.
- **DL16 — Does the helpline audit line NAME the reason? (BigDev's.)** Today ⛔ (N5: `context` is hashed). Option (a): pass
  `resourceLocator` = `claim-intake-refused:<reason>` (lowercase, NON-PII, caller-authored — `auth/shared/audit.ts`'s only readable
  channel) on the helpline catch's line when `err.code === CLAIM_INTAKE_REFUSED_CODE` — cost: the operator's refusals become countable
  per reason at rest (a membership-history fact about the searched person, ⛔ a name). Option (b): leave it — cost: a disputed refusal
  cannot be reconstructed from the audit log. **ANSWERED (a)** (2026-10-31) — for the helpline only; the member route's line stays
  reason-less (N7).
- **DL17 — A fence on the ways INTO a refused state (the door's inputs).** The door is keyed on state labels, so its meaning can change
  without its code changing: a later story that adds a transition INTO a refused state — e.g. a KYC re-verification that sends a paid
  member back to `pending-kyc` — compiles, passes N6's exhaustive switch, and silently refuses that member's family as `not_joined`. The
  AI-10-1 policy-meaning check catches a story that edits the DOOR, ⛔ one that edits its INPUTS. NEW unit test (⛔ DB)
  `packages/domain/tests/member/door-input-fence.test.ts`:
  - drives the REAL reducer — `memberStateMachine.step(from, event)` for every `from` in `MEMBER_LIFECYCLE_STATES` × every type in
    `MEMBER_EVENT_TYPES` (⛔ the documentation `transitions` matrix — `state.test.ts` checks that matrix against the reducer for the
    `rtbf_anonymized` rows ONLY, so it cannot be trusted as the map), each with an empty payload AND every payload variant a reducer arm
    branches on (today only `member.lock_in_expired` `{ kyc_verified: true | false }`); the creation event `member.signup_initiated` is
    the replay's initial step;
  - collects every edge `from → to` with `from ≠ to` and `to` ∈ the door's refused STATES, and asserts the set EQUALS exactly:
    `pending-kyc` ← ⛔ edge (reached only as the replay's initial state); `pending-fee` ← `member.kyc_completed` and
    `member.kyc_manual_fallback` from `pending-kyc` (`-424` Q1 (b) made it a refused state); `withdrawn` ← `member.withdrawal_completed`
    from `active` / `active-in-grace` / `lapsed-unpaid`; `anonymized` ← `member.rtbf_anonymized` from every other state;
  - the refused set is READ from `claim/intake-door.ts`'s own mapping (export the lifecycle states the switch refuses, e.g.
    `DOOR_REFUSED_LIFECYCLE_STATES`), ⛔ restated in the test — so widening the door (PQ1) moves the fence with it;
  - fails with a message naming `2026-10-30-423` Q3 B, `resolveClaimIntakeDoor` and PQ1 (a): *"a new way into a state the claim door
    refuses — decide whether those members' families may file before changing this list"*;
  - a POSITIVE CONTROL: a stub reducer with one extra edge into `pending-kyc` is caught.
  ⚠ Limits, said plainly: payload branches the test does ⛔ know about (a future arm that branches on a new payload field) are covered
  only if that story adds its variant; and TERMINATED is the moderation overlay (Panel-governed `-238` / 10.20 machinery, its own
  invariants), ⛔ a lifecycle state — outside this fence.

- **DL18 — Withdrawal refused while a death report stands (`-424` Q2 (a) A, N9).** In `apps/api/src/modules/withdrawal/handlers.ts`
  `assertWithdrawable`, inside the request's scope transaction and BEFORE the state read: `pg_advisory_xact_lock(intakeAdvisoryLockKey(p,
  m))` (a withdrawal and a first intake then serialise — an intake first ⇒ the withdrawal sees the claim and is refused; a withdrawal
  first ⇒ the intake meets the door, `left`), then `claim.isDeathReportStanding` ⇒ 409 **`withdrawal.death_reported`**, message *"The
  membership cannot be withdrawn: a claim has been filed for this member's death"*. Checked BEFORE `WITHDRAWABLE_STATES` (the more
  specific refusal wins). Mobile: `apps/mobile/app/(withdrawal)/index.tsx` maps the code to a calm line (⛔ the raw server English) — en
  *"A claim has been filed for this member's death, so the membership cannot be withdrawn. If this is a mistake, please call the
  helpline."*; hi *"इस सदस्य की मृत्यु के लिए दावा दर्ज हो चुका है, इसलिए सदस्यता वापस नहीं ली जा सकती। यदि यह गलती है, तो कृपया
  हेल्पलाइन पर कॉल करें।"* (reviewed by BigDev 2026-10-31); key in the namespace that screen already uses. ⚠ Unreachable in production
  today (⛔ member can withdraw — G9a); built and tested on a seeded `active` member.
- **DL19 — The member's own direct changes refused while a death report stands; staff changes keep the old entry (`-424` Q2 (b) A, N9).**
  (a) `apps/api/src/modules/life-events/handlers.ts` `assertMemberExistsAndNotTerminal` — the ONE guard of address, posting and the
  answer to a suggested workplace (6.36c) — and the medical guard in `apps/api/src/modules/medical/medical.handlers.ts` (the 3.5 service
  Life Events reuses): take the intake key first, then N1 ⇒ 409 **`life_events.death_reported`** / **`medical.death_reported`**. The
  nominee route is already refused (`nominee.locked_claim_filed`, 6.20) — unchanged. (b) Mobile: the `(life-events)` screens map both
  codes to one calm line — en *"A claim has been filed for this member's death, so these details can no longer be changed here. To ask
  for a correction, please call the helpline."*; hi *"इस सदस्य की मृत्यु के लिए दावा दर्ज हो चुका है, इसलिए ये विवरण अब यहाँ बदले नहीं जा
  सकते। सुधार के लिए कृपया हेल्पलाइन पर कॉल करें।"* (reviewed by BigDev 2026-10-31). The staff `recordCorrection` (ASK) stays open (N8).
  (c) **The Panel's addition — staff changes never remove the old entry.** Today ⛔ staff path writes a member's address, posting or
  medical declaration, and those three are APPEND-ONLY history (prior value preserved — `schema/member_addresses.ts`,
  `member_postings.ts`, `member_medical_disclosures.ts`), so the rule holds by construction for them; the 6.20 staff NOMINEE correction
  writes a new version into `member_nominee_versions` (the old version kept — whether the staff screens show old WITH new is ⛔ traced);
  the KYC NAME is stored latest-wins (`member_kyc_profiles` UPSERT). ⇒ this story builds ⛔ staff-change path; the rule is recorded in
  `deferred-work.md` (trigger: the first story that lets staff change a member's record, or touches the nominee-correction screens).
  ⛔ Weaken an append-only guard.

## Panel questions — RULED 2026-10-31 (`2026-10-31-424`)

⭐ Q1 (a) **C**, Q1 (b) **B**, Q2 (a) **A**, Q2 (b) **A** (+ the Panel's addition), Q3 **B** — built by N6, N7, N9, DL9, DL10, DL18, DL19;
Q1 (a) C's staff identity check is row `6-39-identity-check-before-a-drive-for-an-unchecked-identity`. The questions as put are kept below.

- **PQ1 — "Had not finished joining": where does it end?** The ruled words: *"had not finished joining (⛔ identity check)"*; `-423`
  Consequence 1 (c) lists only `pending-kyc`. Two edges, put separately:
  - **PQ1 (a) — an identity nobody has checked.** A member who joined through the manual fallback (`member_kyc_profiles`:
    `verification_strength = 'self_declared'`, `trusteeVerified = false`), whatever their state — TODAY that is `pending-fee` or `lock-in`
    for good, because the trustee-verification step and the lock-in exit are ⛔ built (G9a; `pending-valid` is unreachable). The ruled
    words literally reach them; Consequence 1 (c) does ⛔, and the *"first days after joining"* exemption covers their state. Built: OPEN
    — a DECLARED narrowing. ⚠ "Refuse" is ⛔ an arm of N6's switch: it needs the identity record read beside the state. The note suggests
    **C** — filed, but staff confirm the identity from the death documents before any drive opens (a NEW step, ⛔ this story's); A stands
    until then.
  - **PQ1 (b) — the FEE never paid.** `pending-fee`, identity verified or manual: Niyamavali §2.1 (c) makes the fee a condition of
    membership; the Panel's words do ⛔ mention it. Built: OPEN (one arm of N6's switch if refused). The note suggests B (refuse). A person
    in both (typed-in AND unpaid) is refused if either answer refuses.
- **PQ2 — After a death is reported, what may the member's account still do?** Two questions (a mixed question is two — the template):
  - **PQ2 (a) — WITHDRAW the membership?** `-423`'s own reason (*"no one can withdraw it on their behalf afterwards"*) points at
    withdrawal too — but the ruled words cover erasure only, so a refusal would WIDEN the ruling. Built: unchanged (reachable). The harm:
    a withdrawal after death ends the nominee's own Ravi-mode access (login refuses `withdrawn`) AND closes BOTH exports
    (`data_export.member_terminal` — N8), so it defeats the SEE right Q2 A grants. The note suggests A (refuse, lifted as erasure is).
  - **PQ2 (b) — CHANGE the record directly** (address and posting — ⛔ step-up; medical declaration — `medical_change`; G15), or only ASK
    for a correction as Q2 A's words say? Built: unchanged. The note suggests A (only ask).
- **PQ3 — May the helpline tell the caller WHY** (e.g. *"this member left the Trust"*, *"…was removed"*)? A disclosure of a person's
  membership history to a caller. Built: the operator sees why (`-423` reading 3); the copy tells them to say only that the claim cannot
  be filed; the app shows ⛔ reason. The note suggests B (one general reason for every case: *"the person was not a member of the Trust
  when they died"*) — the caller already hears the member's NAME at the read-back before filing.

## Acceptance Criteria

1. **AC1 — The leaf predicate (N1, DL1).** `isDeathReportStanding` exists in `claim/death-report.ts`, imports nothing from `claim/`, and
   `isNomineeDeclarationLocked` delegates to it with byte-identical behaviour (its existing 6.20 tests —
   `apps/api/tests/integration/nominee/nominee-lock.spec.ts`, `packages/domain/tests/integration/nominee/nominee-history-concurrency.spec.ts`
   — pass with ⛔ assertion changed; the latter's member seed is re-seeded per TR2). Live-DB tests: ⛔ claim ⇒ false; a claim in each of
   `intake_pending`, `denied`, `closed`, `settled` ⇒ true; a claim + a `member_found_innocent` finding ⇒ false; two claims, one released
   ⇒ true; a claim in ANOTHER Pariwar ⇒ false.
2. **AC2 — Erasure refused on the member route (Q1 (a)).** `POST /api/v1/member/rtbf` for a `withdrawn` member with a standing report ⇒ 409
   `rtbf.death_reported`; the member is ⛔ anonymized, ⛔ `member.rtbf_anonymized` event, ⛔ `member_rtbf.completed` audit. The same member
   WITHOUT a claim ⇒ erased as today.
3. **AC3 — Erasure refused off-portal (Q1 (a)).** `POST /api/v1/p/:pariwarId/member-data-rights/erasure` for a TERMINATED member with a
   standing report ⇒ 409 `rtbf.death_reported`; ⛔ anonymization; the idempotency claim is released (a retry gets the same 409). Without a
   claim ⇒ erased as today.
4. **AC4 — The lock lifts only when the member is found alive (Q1 (b), DL4).** With the claim's `member_found_innocent` finding seeded
   (`recordMemberInnocenceFinding`, as 6.20's AC11(ii) does), both routes erase again. A claim `denied` / `closed` / `reversed` / `settled`
   WITHOUT the finding still refuses.
5. **AC5 — Erasure and intake cannot both commit (N3, DL3).** Two parts, both own-committing clients (the `rtbf-concurrency.spec.ts`
   shape), both calling `acquireErasureLocks` and `tryConverge` — ⛔ a hand copy of either:
   (i) **two-party, over an already-erasable member** (`withdrawn`, and terminated): in EITHER lock order ⛔ claim is minted — erasure first
   ⇒ anonymized + intake refused `erased`; intake first ⇒ intake refused `left` / `removed`, then anonymized.
   (ii) **three-party, the case the lock exists for:** T1 = an intake for an `active` member holding the intake lock with its claim minted
   and UNCOMMITTED; T2 = a withdrawal (`member.withdrawal_completed`, or the suspended → terminated pair) that COMMITS; T3 = an erasure,
   which must BLOCK on the intake key, then (after T1 commits) be refused `rtbf.death_reported`. The test is shown to FAIL with the
   intake-key lock removed from `acquireErasureLocks` (prove it can fail — note the run in the Completion Notes), and passes across
   repeated runs with ⛔ deadlock.
6. **AC6 — The door, helpline (Q3 B).** `POST /api/v1/p/:pariwarId/admin/claims/intake` for a member at `pending-kyc` / `withdrawn` /
   `anonymized` / terminated ⇒ 409 `claim.intake_refused` with `details.reason` = `not_joined` / `left` / `erased` / `removed`; ⛔ `claims`
   row, ⛔ `intake_attempts` row, ⛔ claim event; the existing `helpline_claim.intake_failed` audit line IS written (asserted through the
   in-memory audit sink / the persisted action, ⛔ its hashed text; plus the `resourceLocator` (DL16 (a)). A member at `pending-fee` ⇒
   409 with `not_paid` (`-424` Q1 (b)), whether the identity was verified or typed in. A member at `pending-valid`, `lock-in` (incl. a
   typed-in identity — `-424` Q1 (a) "filed"), `active`, `active-in-grace`, `lapsed-unpaid`, and a SUSPENDED active member ⇒ filed as
   today. Precedence:
   a terminated `withdrawn` member ⇒ `removed`; an `anonymized` terminated member ⇒ `erased`. An unknown id ⇒ 404 `member.not_found` as
   today.
7. **AC7 — The door, app (Q3 B).** `POST /api/v1/member/claims/intake` (Ravi mode) for a `pending-kyc` member and a terminated member ⇒ 409
   `claim.intake_refused` with ⛔ `details` key at all (asserted absent — DL8), ⛔ record; the existing `member_claim.intake_failed` line IS
   written. Mobile, by SOURCE SCAN (the calm-screen precedent `apps/mobile/tests/unit/refile-copy-resolves.test.ts` — ⛔ a mounted screen):
   NEW `apps/mobile/tests/unit/cannot-file-copy-resolves.test.ts` asserts the four `cannot_file.*` keys resolve through the real
   `t(key, undefined, { locale, namespace: 'claim' })` in BOTH locales ([[feedback_stub_must_call_not_transcribe]]); the copy file's code
   literal equals `@twt/contracts`' `CLAIM_INTAKE_REFUSED_CODE`; the screen source contains `<CallHelplineCTA`, `accessible={true}` and
   `announceForAccessibility`; `relationship.tsx` contains the code check and `router.replace('/(claim)/cannot-file')`; the en body
   CONTAINS *"the person was not a member of the Trust when they died"* (`-424` Q3 B) and does ⛔ match
   `/left|removed|erased|identity|KYC|fee|member (id|number)/i` (⛔ specific reason). `apps/mobile/tests/unit/helpline-cta-presence.test.ts`
   gains a `describe` for `(claim)/cannot-file.tsx` (as 6.19c did).
8. **AC8 — Once per death (N4).** A member with a STANDING report whose state has since become refusable (e.g. terminated after the first
   filing) gets today's flow on a second report — ⛔ door refusal — in each of: idempotent (same channel); cross-channel `pending`; a
   TERMINAL standing claim, per N4's three legs — `closed` for no response ⇒ 409 `claim.refile_requires_confirmation` (⛔
   `claim.intake_refused`), then minted once a confirmation is recorded; `denied` ⇒ minted; `settled` ⇒ minted and closed in the mint. A member whose ONLY claim was released by an innocence finding meets the door again on a new report.
9. **AC9 — The operator sees why (`-423` reading 3, DL9).** `apps/admin/tests/helpline-claim-page.test.tsx` (the submit-flow template is its
   "Story 6.28 (OP10)" test; `new api.ApiError(409, code, msg, details)`): a 409 `claim.intake_refused` with each reason renders that
   reason's EXACT English sentence (all five) + the `tellCaller` sentence (the general reason) in the console's ONE `role="alert"` (assert the sentences — `resolveEn`
   returns the key when missing, so "something rendered" proves nothing); an unknown reason or code falls back to today's `messageOf`; ⛔
   raw code rendered. And after a refusal for member A, selecting member B or searching again shows ⛔ refusal line (`intake.reset()`).
10. **AC10 — The Pariwar Admin sees why (DL11).** A unit test of the pure `erasureErrorText(err)` (`rtbf.death_reported` ⇒ the DL11
    sentence; any other code ⇒ `messageOf`), and a Shell test in `apps/admin/tests/helpdesk-responder-console.test.tsx` that a
    `dataRightsError` renders in the Shell's `role="alert"`. A full `HelpdeskDetailPage` test is optional (eight hooks to mock).
11. **AC11 — See and ask stay open; one definition (N1, N8, DL12, DL15).** Live-DB, for an `active` member with a standing report: the
    in-app export create + download (with its step-up) succeeds; the Pariwar Admin's off-portal export request succeeds; and the staff
    `recordCorrection` on a `dpdpa-data-rights` ticket succeeds. Source fences (one file, with a POSITIVE CONTROL each): the gate SQL —
    pattern `f.kind = 'member_found_innocent'` inside a `NOT EXISTS` — appears ONLY in `death-report.ts`, with a named allow-list of the
    read-only copies (`approval-warnings.ts` ×3, `peer-mesh-read.ts` ×1; the writer, the schema and the migration do ⛔ match the pattern);
    `death-report.ts`'s imports are only `drizzle-orm`, `../db.js`, `../ids/index.js` (TR1); and DL15's fences — the two `anonymizeMember(` callers, the two `member.rtbf_anonymized` emitters, the one sentinel writer.
12. **AC12 — ⛔ Regression.** `pnpm ci:local` 36 / 36 green on the story's own database ([[project_prepush_hook_inherits_5432]] —
    `DATABASE_URL=<story port>` on every push) — including `friction-budget` (a row or a 6.38 disposition, Task 4.3) and `i18n-parity`;
    every existing rtbf, member-data-rights, helpline-intake, member-intake, nominee-lock, refile, `claim/icp`,
    `nominee-refusal-inheritance` and `nominee-history-concurrency` test passes (fixtures re-seeded per DL14 / TR2, ⛔ assertion weakened).
13. **AC13 — A new way into a refused state fails CI (DL17).** `packages/domain/tests/member/door-input-fence.test.ts` passes on the
    reducer as it stands (the three edge sets of DL17, exactly), reads the refused states from `claim/intake-door.ts`, and its positive
    control (an extra edge into `pending-kyc`) fails it with the `-423` message.
14. **AC14 — Withdrawal refused after a death is reported (`-424` Q2 (a), DL18).** Live-DB, a seeded `active` member: with a standing
    claim ⇒ withdrawal 409 `withdrawal.death_reported`, ⛔ `member.withdrawal_completed`, the session unchanged; with the claim's
    innocence finding ⇒ withdrawn as today; ⛔ claim ⇒ withdrawn as today. A withdrawal racing a first intake (own-committing clients)
    never ends with both a minted claim and a withdrawal. Mobile source-scan: the withdrawal screen maps the code to its copy key; both
    locales resolve through the real `t()`.
15. **AC15 — Direct changes refused after a death is reported; staff entries never overwrite (`-424` Q2 (b), DL19).** Live-DB, with a
    standing claim: address, posting, the suggested-workplace answer ⇒ 409 `life_events.death_reported`; medical ⇒ 409
    `medical.death_reported`; ⛔ new history row in each case; the prior rows unchanged. With the innocence finding, or ⛔ claim ⇒
    accepted as today. The staff `recordCorrection` on a `dpdpa-data-rights` ticket still succeeds (N8). Mobile source-scan: the Life
    Events screens map both codes to the copy key; both locales resolve through the real `t()`.

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [x] 0.1 `git fetch origin`; confirm `01062c51` is an ancestor of HEAD and re-derive G1–G16 at the tip (`git diff --name-only 01062c51
        origin/main -- apps packages`); STOP and re-read if any cited function moved. Check `ListAgents` + the branch before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [x] 0.2 Put DL1–DL16 to BigDev (the copy of DL9 / DL10 / DL11 verbatim; the Hindi title + body for review — call + back are
        already reviewed; DL16 (a) / (b)). Record the answers. — ✅ 2026-10-31, BigDev: *"DL1-DL16 as recommended"* ⇒ every DL as
        written, DL16 (a), the English copy approved; the DL10 Hindi title + body confirmed reviewed by BigDev the same day (*"DL10 Hindi
        is fine"*).
  - [x] 0.3 Draft ONE routing note from the template (by path, ⛔ copied): `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-38-door-and-after-death.md`
        — PQ1 (a), PQ1 (b), PQ2 (with N8's export harm), PQ3; plain-English question first, THE ONE FACT, options with an honest cost on
        each, evidence LAST. Status: WRITTEN, ⛔ sent (BigDev sends). Non-blocking: ⛔ gates the build or the merge. — ✅ 2026-10-31:
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-38-door-and-after-death.md` (Q1 (a) / (b), Q2 (a) / (b),
        Q3; suggestions C · B · A · A · B — Q1 (a) rewritten the same day from A to C once G9a was traced; E4 re-run clean). SENT by BigDev;
        RULED the same day — `2026-10-31-424` (every suggestion taken; Q2 (b) with the Panel's addition).
  - [x] 0.4 Decision entry (AUTHOR-COMMIT, the next free number — `-424` is the Panel's ruling, already recorded): DL1–DL19 as answered;
        cites `-423` and `-424`; ⛔ supersedes a ratified entry. Committed ALONE, first.
  - [x] 0.5 `deferred-work.md`: (i) DL4 — the release has ⛔ producer until 6-22 (trigger: 6-22's create-story) + the guilty arm 6-22
        OWES (`-238` cl. 4–5) and whether it releases the erasure lock (Q1 (b)'s words cover it) + DL7's two residual edges; (ii) DL12 (ii)
        — the export's step-up does not prove the nominee (trigger: PQ2's answer or any change to `data-export/routes.ts`); (iii) `-423`
        Consequences 2 · 3 — the privacy policy says Q2 A before members agree to it, and counsel on Q1 (a) / Q2 (trigger: go-live of
        member data-rights, or counsel's answer) — or a roster go-live row instead, BigDev's pick; (iv) PQ1–PQ3 — ✅ RULED (`-424`), ⛔ item
        needed; (v) the `-424` Q2 (b) addition (DL19 (c)) — ✅ recorded 2026-10-31 at the ruling. A dated comment line on the `6-22-…` row in
        `sprint-status.yaml`.
  - [x] 0.6 Ledger line + row `ready-for-dev → in-progress` (prepend safely — [[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [x] **Task 1 — The leaf predicate (AC1)**
  - [x] 1.1 Create `packages/domain/src/claim/death-report.ts` (DL1), header citing `-423`, `-238` cl. 1, N1, and the import rule.
  - [x] 1.2 Delegate `isNomineeDeclarationLocked`; export `isDeathReportStanding` from the `claim` barrel.
  - [x] 1.3 Live-DB tests (AC1) in `packages/domain/tests/integration/claim/death-report.spec.ts` — seed with `seedClaim(tx, pariwarId, {
        deceasedMemberId, currentState })` (`packages/domain/tests/integration/_helpers.ts`; it sets `app.claim_state_writer`, so every
        state seeds) and the finding as a RAW `claim_nominee_findings` row (`recordMemberInnocenceFinding` replays the claim stream through
        `projectClaimState`, and a `seedClaim` row has ⛔ events).
- [x] **Task 2 — The erasure lock (AC2–AC4)**
  - [x] 2.1 `resolveRtbfLegality`: add `pariwarId`, the `death_reported` kind (DL2); `acquireErasureLocks` (DL3); import
        `../claim/death-report.js` and `../claim/icp-lock.js` (the two leaves only — TR1).
  - [x] 2.2 `rtbf/handlers.ts` `assertAnonymizable` and `member-data-rights/handlers.ts` `fulfilErasure`: `acquireErasureLocks` in place
        of the inline rtbf-key lock (DL3); the exhaustive narrowing on `legality.kind` (DL2); map `death_reported` → 409
        `rtbf.death_reported`. `fulfilErasure`'s idempotency claim is ALREADY released on any throw (`ok = false` + the `finally`) — assert
        it in AC3, ⛔ add code for it. `rtbf/handlers.ts` imports `{ ids, member }` today — add `claim` only if it needs it.
  - [x] 2.3 Tests: extend `apps/api/tests/integration/rtbf/rtbf.spec.ts` (AC2, AC4 — post `'{}'`, TR8) and
        `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts` (AC3, AC4). Neither has claim helpers: copy
        `fileClaim` / `forceClaimState` / `appendClaimEvent` / `inScope` from `apps/api/tests/integration/nominee/nominee-lock.spec.ts`,
        and its AC11(ii) for the finding — `claim.recordMemberInnocenceFinding(s.client, { claimCaseId, pariwarId, findingId, actorId,
        actorDisplay, actor })`.
- [x] **Task 3 — The door (AC5–AC8)**
  - [x] 3.1 Domain vocabulary + contracts mirror (DL6, DL8): `CLAIM_INTAKE_REFUSAL_REASONS` + type in `claim/intake-door.ts`; NEW
        `packages/contracts/src/claims/intake-refusal.ts` with the mirrored tuple + `CLAIM_INTAKE_REFUSED_CODE`; an `export *` line in
        `packages/contracts/src/claims/index.ts`; a lockstep test in `packages/contracts/tests/`. ⛔ `@twt/contracts` import in `@twt/domain`.
  - [x] 3.2 `claim/intake-door.ts` `resolveClaimIntakeDoor` with the exhaustive switch (N6); `ClaimIntakeRefusedError` in `claim/errors.ts`;
        export both from the `claim` barrel.
  - [x] 3.3 `tryConverge`: the gate at DL7's position. ⛔ Write before it.
  - [x] 3.4 `claims.service.ts`: `translateClaimIntakeRefused` in `initiateIntake`'s catch (DL8, TR6), with the helpline-only reason flag
        threaded from each handler; DL16's `resourceLocator` on the helpline catch if BigDev picks (a).
  - [x] 3.5 Domain unit tests for every lifecycle state × moderation status (the full 9 × 3 = 27 table — five refusals) and the precedence; API live-DB
        tests AC6 (`helpline-claim-intake.spec.ts`), AC7 (`claims-intake.spec.ts` — incl. `details` ABSENT), AC8.
  - [x] 3.6 The race (AC5 (i) + (ii)) — AFTER 3.3, because "intake refused `erased`" exists only once the door is in `tryConverge`: in
        `packages/domain/tests/integration/member/rtbf-concurrency.spec.ts` or a sibling, CALLING `acquireErasureLocks` and `tryConverge`
        (⛔ a hand copy of the handler sequence — that spec's existing `takeLock` and `members.state` read are ⛔ the pattern to follow
        for the new cases). Run (ii) once with the intake-key lock removed and record that it fails.
- [x] **Task 3A — The after-death locks (AC14, AC15)**
  - [x] 3A.1 DL18: `assertWithdrawable` — intake key, N1, 409 `withdrawal.death_reported`; live-DB tests (AC14) incl. the race.
  - [x] 3A.2 DL19 (a): the Life Events guard + the medical guard — intake key, N1, the two 409s; live-DB tests (AC15).
  - [x] 3A.3 Mobile: the withdrawal screen + the `(life-events)` screens map the codes to their copy keys (en + hi — the Hindi
        reviewed by BigDev 2026-10-31, *"Hindi is fine"*: a `$comment` naming that review; ⛔ go-live row needed);
        source-scan tests; `friction-budget.md` rows for both refusals (payer: whoever holds the dead member's account — `-424`'s accepted
        cost); enrol the changed files in `microcopy.yaml` if they are not already.
- [x] **Task 4 — Words (AC7, AC9, AC10)**
  - [x] 4.1 Admin helpline (DL9, TR7): keys (five reasons + the general `tellCaller`); the pure `intakeRefusalKey`; the line derived in the `submitError` expression;
        `intake.reset()` in `resetDownstreamState`; RTL tests in `apps/admin/tests/helpline-claim-page.test.tsx` (AC9).
  - [x] 4.2 Admin helpdesk (DL11): the key; `erasureErrorText` in `HelpdeskDetailPage.tsx`; the erasure leg first in the `dataRightsError`
        chain; its unit test + the Shell test in `apps/admin/tests/helpdesk-responder-console.test.tsx` (AC10).
  - [x] 4.3 Mobile (DL10): `cannot-file-copy.ts`, `(claim)/cannot-file.tsx`, the `relationship.tsx` branch; keys `cannot_file.*` in
        BOTH `packages/i18n/locales/{en,hi}/claim.json` (parity is a gate) with a `$comment.cannot_file` in both — the title
        reviewed by BigDev (2026-10-31), call + back the reviewed `refile.*` strings, the BODY rewritten after `-424` and reviewed by BigDev
        the same day (*"Hindi is fine"*) — ⛔ go-live row needed; the AC7 source-scan tests. ⭐ **`friction-budget.md` (repo root): a new row — or a 6.38 disposition — for the
        refused-at-door state** (payer: the family of a non-member, or of a mistyped search — `-423` Q3 B's accepted cost; the 6.19c
        re-file-screen row is the precedent); run `pnpm friction:check` before push — `MEMBER_FACING_PREFIXES` includes `apps/mobile/`, so
        without it the gate fails. Enrol `apps/mobile/app/(claim)/cannot-file.tsx` and `apps/mobile/lib/cannot-file-copy.ts` in
        `microcopy.yaml` `code_globs` (6.19c enrolled the refile files). ⚠ The worktree has ⛔ `.expo/types`, so `tsc` does ⛔ check the
        new `/(claim)/cannot-file` href ([[project_mobile_typed_routes_worktree]]) — check the path by hand. ⚠
        [[project_mobile_vitest_and_expo_install_traps]].
- [x] **Task 5 — Fences, stale text, fixtures (AC11, AC12, AC13)**
  - [x] 5.1 The N8 live-DB tests (in-app export, off-portal export request, correction — for an `active` member with a standing report).
  - [x] 5.2 The DL15 + N1 + TR1 source fences — ONE file, `apps/api/tests/unit/erasure-and-death-report-fence.test.ts` (modelled on
        `family-account-reach-fence.test.ts`), each with a positive control.
  - [x] 5.3 DL13's comment re-wordings ([[project_markdown_emphasis_closes_jsdoc]] — ⛔ `**` adjacent to `/` inside a JSDoc).
  - [x] 5.4 DL14 fixture re-seeds (TR2) — list each re-seeded file in the Completion Notes.
  - [x] 5.5 DL17's door-input fence (AC13): export the refused lifecycle states from `claim/intake-door.ts`; the reducer-driven test with
        its positive control.
- [x] **Task 6 — Gate and records**
  - [x] 6.1 `pnpm ci:local` on the story's own DB container (AC12 — incl. `friction-budget`, `i18n-parity`). `typecheck` + `lint` per package.
  - [x] 6.2 Story File List, Completion Notes, Change Log; ledger line; row → `review`.

### Review Findings

Full three-layer code review, 2026-10-31, baseline `01062c51` → `e813e5ee`.

- [x] [Review][Patch] **P2 — Announce the new after-death refusals on iOS**
  [`apps/mobile/app/(withdrawal)/index.tsx:69`, `apps/mobile/app/(life-events)/address.tsx:50`,
  `apps/mobile/app/(life-events)/medical.tsx:84`] — Checklist family 13(d), applied to AC14 / AC15:
  after a standing death report, the new 409 branches set the refusal text (including both OTP retry legs), but their
  error renderers only use `accessibilityLiveRegion` / an alert role. They have no iOS announcement, so a VoiceOver user
  can remain focused on Submit / Verify without hearing why the action was refused. Use the existing platform-aware
  `AnnouncedText` pattern (`components/peer-request/announce.tsx`) or an equivalent iOS announcement while preserving the
  Android live region; cover announcement wiring for all three surfaces. The workplace refusal lines already use
  `AnnouncedText`, and `cannot-file.tsx` explicitly announces its message. The copy-resolution tests currently prove
  translated text and error mapping, not these announcements.

  **Resolved 2026-10-31 (BigDev: "1"):** the address and withdrawal errors and the shared `MedicalForm` error now render
  through the existing `AnnouncedText`. It announces on iOS and uses the Android live region without a duplicate announce
  call. `death-report-refusal-announcements.test.ts` executes the real three screens, the shared medical form, the step-up
  hook and the announcement component, mocking native primitives / HTTP / storage / navigation / locale hooks. Ten cases
  cover iOS and Android, including both withdrawal and medical OTP retries and no repeat announcement on a plain rerender.
  Before the fix: 7 failed / 3 passed (all five iOS cases failed; withdrawal also lacked an alert role on Android).
  After the fix: 10 / 10 passed; related copy / announcement tests bring the focused run to 26 / 26. Mobile typecheck and
  ESLint of the four changed code / test files pass. The preceding review's 298 targeted tests passed, including the live
  database tests on :5461; full `ci:local` was not rerun for this UI patch. Native VoiceOver / TalkBack behavior still needs
  a device. No unresolved review finding remains; story and sprint row → `done`. Changes are uncommitted.

### Review Findings — round 2 (2026-10-31)

Second full three-layer review, run in two chunks at BigDev's choice — **A:** the 44 non-test source files (1,493 diff lines);
**B:** the 30 test / fixture files, including the untracked announcement test (2,515 lines) — against `origin/main` `b2f36fe9`
with the round-1 patch (uncommitted) included. Six layers ran, none failed. 83 raw items became 19 findings and 32 dismissals.
Every claim a layer made that changed a verdict was re-read against the tree before it was classified.

**Panel-routing gate (template §0) applied: 0 decision-needed.** Every policy-shaped item is either inside a ratified clause
(`-423` Q3 B, `-424` Q3 B) or already a declared residual (`-425` DL4 / DL7, `deferred-work.md`). **No acceptance-criterion
violation in the non-test source:** every ratified clause (`-423` Q1 (a), Q2, Q3 B; `-424` Q1 (a) / (b), Q2 (a) / (b), Q3 B)
MATCHES; the one narrowing (`-423` Q1 (b) — released only by an innocence finding) is the declared one.
**Checklist verdicts:** family 2 = **REAL GAP** (patches 1–3, same severity as an AC violation); family 10 = patches 13–14;
family 13 = patch 9 (evidence strength) and defer D5; families 1, 3, 4, 5, 6, 8, 9, 11, 12 covered by test or by construction
(family 5: no migration, by `-425` Consequence 1 — verified none in the diff).

- [x] [Review][Patch] **1 — Lock-key case divergence: erasure and the two export-grant paths no longer share the `rtbf` key for a
  non-lower-case id** [`packages/domain/src/member/rtbf-legality.ts:112`,
  `apps/api/src/modules/member-data-rights/handlers.ts:535`, `:851` (vs `:1169`)] — family 2, REAL GAP. `acquireErasureLocks` is
  called with branded ids (`uuidBrand` lower-cases); the grant paths still hash the raw `body.member_id`, and the contract accepts
  any-case `uuid()`. Before 6.38 both hashed the raw string and matched; now an upper-case id gives erasure and grant different keys
  and the "no grant against an artifact about to be zeroed" serialisation (10.21) is lost for that input. Exposure is narrow (the
  console sends lower-case) but this story introduced it. Fix: lower-case inside `rtbfAdvisoryLockKey` (and defensively
  `intakeAdvisoryLockKey` — lower-case input hashes identically, so no live key moves) + one integration case with an upper-case id.
  Found by edge + auditor (chunk A); confirmed by reading the code.
- [x] [Review][Patch] **2 — The erasure handlers' use of `acquireErasureLocks` is pinned by no test or fence**
  [`apps/api/src/modules/rtbf/handlers.ts:99`, `apps/api/src/modules/member-data-rights/handlers.ts:1169`,
  `apps/api/tests/unit/erasure-and-death-report-fence.test.ts:58`] — family 2, REAL GAP; AC5, DL3 / N3. Verified: the only test
  reference is the race spec's own `erase()` helper; `guardedBeforeErasure` accepts `resolveRtbfLegality(` / `assertAnonymizable(`
  alone. Reverting either handler to the old rtbf-key-only lock turns nothing red. Fix: extend the fence — `acquireErasureLocks(`
  must precede the legality read in both files — with a positive control.
- [x] [Review][Patch] **3 — The intake-key lock on withdrawal, Life Events and medical is proven by nothing that fails without it;
  the AC14 race is unforced** [`apps/api/tests/integration/withdrawal/withdrawal.spec.ts:327`,
  `apps/api/src/modules/withdrawal/handlers.ts:96`, `apps/api/src/modules/life-events/handlers.ts:192`,
  `apps/api/src/modules/medical/medical.handlers.ts:143`, `packages/domain/src/claim/death-report-lock.ts`] — family 2, REAL GAP;
  N9, DL18, DL19, AC14. Verified: `it.each([1, 2, 3])` ignores its parameter; two `inject` calls run in a `Promise.all`; the
  assertion accepts either winner, so a missing lock passes unless the bad interleave happens by luck. `lockAndReadDeathReport` has
  no test reference at all. Found by all three chunk-B layers. Fix, as `erasure-intake-race.spec.ts` does: hold the intake key on a
  second connection, fire the request, wait on `pg_blocking_pids`, commit a claim, expect the 409 and no write — one probe each for
  withdrawal, address / posting / answer, and medical (or one helper probe plus a fence that each caller invokes it before its
  state read).
- [x] [Review][Patch] **4 — Helpline console: changing member or searching while an intake is in flight loses the result**
  [`apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx:100`, `:140`, `:188-198`] — `canChangeCaller` checks only the
  peer-request flag, not `intake.isPending`; `resetDownstreamState` now calls `intake.reset()` (DL9), which detaches the in-flight
  mutation so the per-call `onSuccess` never runs. The claim is minted and the account frozen on the server; the console shows
  nothing and the operator has no case id to give the caller. (Before DL9 the same overlap showed member A's result beside member
  B.) Fix: `canChangeCaller` returns false while `intake.isPending`, plus a test. Found by edge (chunk A); confirmed by reading.
- [x] [Review][Patch] **5 — The precedence legs are untested: every new lock test uses a state that is otherwise legal**
  [`withdrawal.spec.ts`, `rtbf.spec.ts`, `life-events.spec.ts`, `apps/api/tests/integration/medical/medical-disclose.spec.ts:640`]
  — DL2 / N2 ("the death check wins over the state arm"), DL18 ("before `WITHDRAWABLE_STATES`"). Moving the death check behind
  the state check would stay green. Add: lock-in member + claim → `withdrawal.death_reported`; active member + claim on erasure →
  `rtbf.death_reported` (not `rtbf.invalid_state`); withdrawn member's address / medical → `*.death_reported` (not
  `*.member_terminal`). Also the medical AC15 tests seed `seedMemberPendingFee` + `fileClaim` — a member the door would refuse
  (`not_paid`); re-seed an active member so the reachable path is the one shown.
- [x] [Review][Patch] **6 — AC3's same-key retry cannot tell a re-evaluation from a replayed 409**
  [`apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts:1640-1660`] — the comment says the failed
  attempt "released its idempotency claim"; the retry asserts only 409 + the same code, which a cached replay also produces. Fix:
  after the retry, `findInnocent`, retry with the same key, expect 200 and one erasure event.
- [x] [Review][Patch] **7 — `HelpdeskDetailPage`'s death-reported wiring is untested**
  [`apps/admin/src/modules/helpdesk/HelpdeskDetailPage.tsx:183-190`, `apps/admin/tests/helpdesk-responder-console.test.tsx`] —
  AC10 / DL11. The tests cover `erasureErrorText` (pure) and the Shell with the sentence passed in as a prop; reverting line 185 to
  `messageOf(...)`, or moving the erasure leg behind `buildExport`, stays green. AC10 makes the page test optional (letter-
  compliant), but the wiring has no coverage. Fix: a page-level test with a mocked data-rights hook (erasure error = 409
  `rtbf.death_reported`, plus a stale build error).
- [x] [Review][Patch] **8 — Admin reason-key guard: the contracts helper is not used, and the page test lists reasons by hand**
  [`apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx:60-65`, `packages/contracts/src/claims/intake-refusal.ts:20`,
  `apps/admin/tests/helpline-claim-page.test.tsx:488-521`] — the contracts comment calls `isClaimIntakeRefusalReason` "the admin
  console's guard", but only the API imports it; the page casts and `.includes`. The page's comment ("a future reason never
  renders as a raw key") holds only for a reason outside the tuple: a sixth reason added to the tuple with no admin line renders
  the raw key on the operator console, and the test's cases are written out, not iterated from `CLAIM_INTAKE_REFUSAL_REASONS`.
  Fix: use the helper; iterate the tuple in the test through the real lookup.
- [x] [Review][Patch] **9 — The UI death-refusal branches are evidenced by source scan only**
  [`apps/mobile/app/(claim)/cannot-file.tsx:31-33`, `apps/mobile/app/(claim)/relationship.tsx:94`,
  `apps/mobile/components/workplace/WorkplacePicker.tsx:120`, `WorkplaceSuggestionQuestion.tsx:123`,
  `apps/mobile/lib/workplace-i18n.ts`, `apps/mobile/tests/unit/cannot-file-copy-resolves.test.ts:42`,
  `death-report-copy-resolves.test.ts`] — family 13 (d), evidence strength. AC7 specified a source scan, so this is letter-
  compliant; but round 1 held address / withdrawal / medical to executed announcement tests, and the same class is open on the new
  `cannot-file` screen (its announcement on arrival is its main content), on the 409 routing and no-draft behaviour in
  `relationship.tsx`, and on the workplace `{ namespace: 'common' }` override (the existing render tests mock `useWorkplaceT`, so
  the override never runs). Fix: executed tests — mount `CannotFileScreen` (one `announceForAccessibility`), the relationship
  submit rejecting 409 `claim.intake_refused` (`router.replace`, no draft save), and the workplace components with a rejected
  `life_events.death_reported`.
- [x] [Review][Patch] **10 — The cross-Pariwar case is masked by RLS**
  [`packages/domain/tests/integration/claim/death-report.spec.ts:74`] — it runs as `twt_app`, so the predicate's own
  `c.pariwar_id` filter is never exercised; dropping it stays green. Fix: also run it unscoped (`asUnscopedSuperuser`) with a
  claim seeded only in the other Pariwar → false.
- [x] [Review][Patch] **11 — The source-scan fences are textual and narrower than the rule they pin (optional hardening)**
  [`apps/api/tests/unit/erasure-and-death-report-fence.test.ts:98` (`gateSqlCopies`), `anonymizeCallers`, the sentinel allow-list,
  `importsOf`] — AC11 / N1 ("a second copy anywhere"). `gateSqlCopies` matches one spelling (`NOT EXISTS (` … `f.kind =
  'member_found_innocent'` within 400 characters), so a second definition under another alias, a `LEFT JOIN … IS NULL` or a
  Drizzle `notExists` escapes; `anonymizeCallers` matches the literal `anonymizeMember(` only; the sentinel allow-list admits an
  alias; `importsOf` lets a side-effect import swallow the next. Each has a positive control, but the controls are written to
  match the pattern exactly. Fix: a literal-based scan of `member_found_innocent` with the writer and schema allow-listed, plus
  alias-evasion controls.
- [x] [Review][Patch] **12 — Minor test gaps** — (a) AC14 "the session unchanged" is not asserted (`withdrawal.spec.ts`); (b) AC4
  off-portal runs only `settled` (`denied` / `closed` / `reversed` run on the member route only); (c) no door case for suspended →
  terminated → restored (appeal allowed ⇒ open; `intake-door.spec.ts`); (d) the helpline 404 test does not assert the default
  `resourceLocator` (`helpline-claim-intake.spec.ts`); (e) "staff correction is recorded" asserts only the status code
  (`delivery-and-correction.spec.ts`).
- [x] [Review][Patch] **13 — Closure honesty: the fixture "replaces five copies" — it does not**
  [story Completion Notes `:922`, `apps/api/tests/integration/_death-report-fixture.ts`] — family 10. The diff removes none;
  `fileClaim` is still defined in `nominee-lock.spec.ts`, `nominee-member-link.spec.ts`, `nominee-marks-save.spec.ts`,
  `known-people.spec.ts` and `claim-contact.spec.ts`, and the fixture adds a sixth. Fix: reword the note ("adds a shared copy;
  consolidating the five is a follow-up").
- [x] [Review][Patch] **14 — Closure honesty: `done` is ahead of the evidence** (⚠ PARTIAL — the commit it called for is BigDev's; round 3, patch 8)
  [story `Status:`, `sprint-status.yaml` row 6-38, ledger `2026-10-31n`] — AC12, family 10. The 36 / 36 `ci:local` ran at
  `e813e5ee`. The round-1 patch (`address.tsx`, `(withdrawal)/index.tsx`, the shared `MedicalForm.tsx` — also used by
  `(signup)/medical.tsx` — and one new test) is uncommitted and has had only a focused 26-test run; and this round leaves patches
  open. Fix: keep the story and row `in-progress` until the patches land, then commit, re-run the gate on the final tree, and
  record the run.
  **Resolved 2026-10-31 (BigDev: "1" — apply every patch; patches 1–13).** Each fix was shown to FAIL without it — a mutation of
  the production line, run, then restored byte-identical to `HEAD` — not only to pass with it:
  ⚠ **CORRECTED 2026-10-31 (code review round 3, patch 8):** that sentence was too broad. Which fixes have a mutation result, and which
  do not, is the item-by-item table at the end of round 3. And "restored byte-identical to `HEAD`" holds for the files that were only
  MUTATED — ⛔ for the three the patches changed on purpose (`rtbf-legality.ts`, `icp-lock.ts`, `HelplineClaimPage.tsx`), which were
  restored to their post-patch content.
  1. `rtbfAdvisoryLockKey` and `intakeAdvisoryLockKey` lower-case both ids. New `packages/domain/tests/member/erasure-lock-keys.test.ts`:
     red before the fix (the two upper-case cases), green after; the lower-case keys are pinned to the bigints the old code produced.
  2. The fence gains `locksBeforeLegality` (DL3 / N3), keyed on the function enclosing each `resolveRtbfLegality(` read (the RTBF lock
     sits in a helper, not the method). Reverting EITHER real handler to the rtbf-key-only lock turns exactly that test red.
  3. New fixture helper `raceFirstIntake`: it holds the intake key on a second connection, fires the request unawaited, proves the
     request is WAITING (`pg_blocking_pids`), commits a claim, releases. Forced probes for withdrawal, address and medical; deleting
     the one `pg_advisory_xact_lock` line in `lockAndReadDeathReport` turns all three red ("did not wait on the claim-intake key").
     The free-running race is kept as ONE sanity run, relabelled — it went red in that mutation run too, by luck, which is why it was
     never the proof.
  4. `canChangeCaller` ignores a change while `intake.isPending`. The new test was red before the fix and is green after.
  5. Precedence: rtbf (active + claim), withdrawal (lock-in + claim), address and medical (withdrawn + claim), each beside a no-claim
     control that shows state alone refuses. The life-events and medical 6.38 legs now seed an ACTIVE member — they had used a
     `pending-fee` member, whom the door refuses. Demoting the death check in `resolveRtbfLegality` turns the rtbf case red.
  6. AC3: after the two 409s the finding lands and the SAME key succeeds (200, one erasure event) — a re-evaluation, not a replay.
  7. New `apps/admin/tests/helpdesk-detail-page-erasure.test.tsx` runs the PAGE: reverting the erasure leg to `messageOf` fails both
     tests; moving it behind the export leg fails the ordering test.
  8. The admin page uses `isClaimIntakeRefusalReason`; the page test asserts its written-out cases equal the contracts tuple and
     that every reason has an operator line.
  9. Executed: new `apps/mobile/tests/unit/death-refusal-claim-screens.test.ts` (cannot-file announces once, in the active locale, in
     one accessible container, with the CTA and a working way back; relationship routes a 409 `claim.intake_refused` to the calm
     state with no draft saved, plus a generic-error control; `useWorkplaceT`'s `common` override, plus a throws-without control) and
     two death-reported cases in `workplace-suggestion-question.test.ts` (direct and abandoned POST). Four behaviours of the new
     file and the component's branch were each mutation-checked. ⚠ **NOT done:** the `WorkplacePicker` save branch (four lines, the
     same shape) is still evidenced by source scan — no harness drives its multi-phase flow; its namespace override is covered
     through `useWorkplaceT`.
  10. `death-report.spec`: an unscoped (superuser) cross-Pariwar case with a same-connection positive control. Dropping the
     predicate's `c.pariwar_id` turns it red; the old RLS-masked case stayed green through the same mutation.
  11. Fences: `anonymizeNamers` (alias / destructure / callback), alias-following `sentinelWriters`, `findingKindLiteralFiles`
     (spelling-proof N1), set-valued `importsOf` (side-effect, `export … from`, dynamic, `require`) — each with an evasion control.
     ⚠ `stripComments` is unchanged.
  12. (a) the same bearer token still authenticates after the refused withdrawal; (b) AC4 off-portal runs `denied` / `closed` /
     `reversed` / `settled`; (c) a removed-then-RESTORED member's door is open, beside a removed control; (d) the 404 keeps the default
     `resourceLocator`; (e) "correction recorded" asserts the row.
  13. The Completion Note is annotated (not rewritten): the fixture adds a sixth copy; the five remain.
  **Evidence, run live on the story DB (:5461):** domain `death-report` + `intake-door` + lock-key tests 52 / 52; api withdrawal 11,
  life-events 10, medical 21, rtbf 14, data-rights 36, helpline-intake 29, fence 19 (unit); admin helpline page 28 + the new page test
  2; mobile 11 new + workplace question 11. `tsc` clean in domain, api and admin (their projects include these tests); the mobile
  files were type-checked ad hoc (their project includes no unit tests); ESLint clean on every changed file.

  **Patch 14 — resolved 2026-10-31, with what is NOT done said plainly.**
  (i) **AC12 re-gate on the final tree** — `pnpm ci:local` on the story DB (:5461): **35 / 36 on the first run.** `integration-tests`
  was green (it ran the new forced-race probes and the other live-DB specs). The one red, `test (unit)`, was **16 admin timeouts**
  (`Test timed out in 5000ms` × 8, the rest their fallout) in six admin files this round did not touch —
  `ground-inspection-{questionnaire,page,discrepancy}`, `questionnaire-versions-page`, `helpline-peer-requests`,
  `announcement-channels-page` — the class `scripts/ci-local.sh` already names for this job's concurrency; the two admin files this
  round changed passed in that same run. Those six files alone: 215 / 215. All of admin alone: 87 files / 1,554 tests. Then the same
  job re-run at turbo `--concurrency=2` (4 → 2): **37 / 37 tasks, 0 failures** — admin 1,554, mobile 2,200, domain 3,191, api 790,
  jobs 1,242 passed (the skips are the DB-gated specs that self-skip without a `DATABASE_URL`, by design). So every one of the 36
  jobs has been green on the final tree — **across two runs, not one.**
  (ii) The round-1 patch (`address.tsx`, `(withdrawal)/index.tsx`, `MedicalForm.tsx`, the announcement test) was inside that gated tree.
  (iii) **Not done: the patches are not committed.** ⚠ CORRECTED 2026-10-31 (round 3, patch 8) — this said "nothing is committed — the
  whole tree is still uncommitted", which was wrong: `HEAD` `e813e5ee` is the committed 74-file build; what is uncommitted is the
  round-1 and round-2 patches, awaiting BigDev. **This round's patch diff has not
  itself been reviewed** (BigDev's standing rule: the fix diff gets the adversarial layers before it is committed).
  (iv) The device VoiceOver / TalkBack check is carried as `deferred-work.md` D5 — un-attested, ⛔ backfilled.
  ⇒ Story and row set to `review`, ⛔ `done`: what `done` still needs is the review of the patch diff and the commit.
- [x] [Review][Defer] **D1 — The death locks lift only on an innocence finding, and the copy points a falsely-reported member at a
  helpline that cannot yet lift them** [`packages/domain/src/claim/death-report.ts:36-43`] — deferred (tracked): already the first
  6.38 bullet in `deferred-work.md` (DL4 / DL7, row 6-22 pointer) — a declared narrowing of `-423` Q1 (b); `overrideIntakeAttempt`
  mints without the door; any claim in any state locks. Added by this round: the withdrawal line says "If this is a mistake,
  please call the helpline" and the helpdesk line says it "can be erased only if the claim is found to be about a member who is
  alive", while nothing yet lets the helpline lift anything; closure wording must stay "mechanism built, lift deferred to 6-22",
  never "Q1 (b) closed"; the go-live list should carry it.
- [x] [Review][Defer] **D2 — An OTP is spent before the refusal appears**
  [`apps/api/src/modules/withdrawal/handlers.ts:96`, `apps/mobile/app/(withdrawal)/index.tsx:65-95`,
  `apps/mobile/app/(life-events)/medical.tsx:94-101`] — deferred: the guard sits in the handler, after the step-up preHandler, so a
  permanent refusal costs an OTP SMS; withdrawal's catch re-arms Confirm for a retry that cannot succeed; medical keeps the OTP
  prompt open after any post-verify failure (existing behaviour). DL18 records withdrawal as unreachable in production today.
- [x] [Review][Defer] **D3 — A sticky erasure refusal can mask a newer export / delivery failure**
  [`apps/admin/src/modules/helpdesk/HelpdeskDetailPage.tsx:183-190`] — deferred: AC10 put the erasure leg first on purpose;
  react-query `isError` is sticky for every leg, so the chain has always shown the first stale error.
- [x] [Review][Defer] **D4 — `fulfilErasure`'s `body.member_id` is not bound to the ticket's subject**
  [`apps/api/src/modules/member-data-rights/handlers.ts:871`] — deferred, pre-existing (the file's own comment admits it).
- [x] [Review][Defer] **D5 — Native VoiceOver / TalkBack behaviour of the new announcements is un-attested**
  [`apps/mobile/app/(claim)/cannot-file.tsx`, `address.tsx`, `(withdrawal)/index.tsx`, `MedicalForm.tsx`] — deferred (un-attested,
  not backfilled): code and executed unit tests exist; no device pass has been run. For a device: whether `accessible={true}` plus
  announce-on-arrival double-reads on `cannot-file` (TalkBack re-read is a known issue here), and that `AnnouncedText` does not
  repeat.

**Dismissed (32 raw items):** declared or ratified readings (the door reads the state at the first report — G10; the one general
reason and the 409 as a disclosure — `-424` Q3 B; `overrideIntakeAttempt` ungated — DL7); false positives on re-read (the
`rows.rows?.[0]` idiom is used 15 times in the domain package; `tryConverge` has one caller and both callers translate the
refusal; the real `t()` throws on a missing key, so the copy "non-empty" checks are not vacuous; moderation order is
`event_version`, so same-transaction clock ties cannot reorder it; the audit event names asserted absent all exist; no mobile
RTBF screen exists to map `rtbf.death_reported`); house conventions (the `⛔` glyph register, `$comment` keys in the i18n catalogs);
and comment nits or test-hygiene points that do not change what a test can catch.

### Review Findings — round 3 (2026-10-31) — the round-2 PATCH diff

BigDev's rule — the fix diff gets the adversarial layers before it is committed — chosen at the close of round 2 ("2": re-run code
review). Diff: **1,337 lines** (83 production source — the two lock-key functions, `canChangeCaller`, the contracts guard — and 1,254
tests / fixture), 15 tracked files + 3 new; one chunk (under the 3,000-line threshold); three layers, none failed. 38 raw items became
**8 patches + 1 defer (D6), 8 dismissed** — and a second defer, **D7**, found afterwards while gating the fixes (below). Panel-routing gate (template §0): **0 decision-needed.** The Acceptance Auditor found **no HIGH**:
of round 2's 14 patches 11 are satisfied, 3 partial (1, 9, 14 — 9 and 14 were disclosed, 1 was not). Checked by me before classifying:
the tree is byte-identical to what the layers read; **no other code computes either lock key** (the only places that hash those two
string shapes are the two patched functions — every other advisory lock is a different namespace); `apiFetch` has **no transport
timeout** (only the workplace write is bounded).

- [x] [Review][Patch] **1 — Nothing proves a GRANT path shares the erasure key for an upper-case `member_id`** — round-2 patch 1 asked for
  an integration case; a unit test replaced it, and the Resolved block did not say so
  [`apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts`, the three `rtbfAdvisoryLockKey(` sites in
  `apps/api/src/modules/member-data-rights/handlers.ts`] — family 2, REAL GAP (partial delivery of round-2 patch 1). The unit test pins the
  key FUNCTION; nothing pins that the grant handlers keep calling it, and an inline re-hash in a grant path would reopen the
  divergence. The grant takes the `rtbf` key BEFORE any read, so a live probe is cheap: hold the lower-case `rtbf` key on a second
  connection, send the grant with an UPPER-case `member_id`, prove the request WAITS. Plus a fence: every `pg_advisory_xact_lock` in
  the data-rights handlers takes `rtbfAdvisoryLockKey(…)` or comes from `acquireErasureLocks`, ⛔ a hand-built key.
- [x] [Review][Patch] **2 — The two ERASURE routes have no HTTP-level forced probe** [`apps/api/tests/integration/rtbf/rtbf.spec.ts`,
  `…/member-data-rights/delivery-and-correction.spec.ts`, `apps/api/tests/unit/erasure-and-death-report-fence.test.ts`] — family 2. The fence
  is textual and the domain race spec calls the HELPER, ⛔ the handlers: a handler that calls `acquireErasureLocks(` un-awaited, or in a
  dead branch, passes the fence with no live proof. Fix: `raceFirstIntake` against `POST /api/v1/member/rtbf` (a withdrawn member) and
  against the off-portal erasure — expect `waited`, a 409 `rtbf.death_reported`, ⛔ anonymized.
- [x] [Review][Patch] **3 — `raceFirstIntake` blames production for a slow runner, and can leak a live request** [`apps/api/tests/integration/_death-report-fixture.ts`
  `raceFirstIntake`] — (a) when the request neither waits nor answers within the 5 s poll, the caller is told "its guard does not take
  it" — a scheduling delay reported as a missing lock (and 5 s is vitest's own default test timeout, so the diagnostic may never print);
  (b) if `fileClaim` or the poll throws, the holder is rolled back, the blocked request wakes and may commit a real write while
  `teardown` closes the pool; (c) the holder is released only after `await pending`; (d) a connection whose ROLLBACK failed goes back
  to the pool. Fix: a distinct "inconclusive — neither waited nor answered in N ms" error, default 4 s; in `finally`, after ROLLBACK,
  await `pending` (bounded); release the holder right after COMMIT; `release(true)` when COMMIT / ROLLBACK failed.
- [x] [Review][Patch] **4 — The fence scans over-claim** [`apps/api/tests/unit/erasure-and-death-report-fence.test.ts`: `enclosingFunctionStart`
  / `locksBeforeLegality`, `sentinelWriters`, `findingKindLiteralFiles`, `importsOf`] — family 10. `enclosingFunctionStart` takes the
  nearest preceding `async name(`, so a read inside an arrow function, `private async`, `static async` or `export default async function`
  is attributed to an EARLIER locked method and **false-passes** — the comment says "fails CLOSED" (a node probe by the auditor returned
  `true`); `sentinelWriters` follows a same-file `const` alias only — `import { ANONYMIZED_SENTINEL as X }`, or an `export const S = …`
  used from another file, escapes; `findingKindLiteralFiles` / the dynamic-`import()` pattern read `'` and `"` only (a backtick
  escapes) and ignore `CLAIM_NOMINEE_FINDING_KINDS`; "spelling-proof" claims more than the scan does. Fix: add the missing function-start
  forms (with a control — an arrow after a locked method now FAILS the scan), follow import aliases, flag an exported alias, widen the
  quote class to the backtick and name the tuple; reword the comments to say what the scans are — textual tripwires; the live probes
  (patches 1–2) are the proof.
- [x] [Review][Patch] **5 — The helpline console silently ignores a change of caller while a filing is in flight**
  [`apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx` `canChangeCaller`] — family 13 (d). The click does nothing and nothing is
  said, visibly or to a screen reader; with no transport timeout a hung POST leaves the operator unable to change caller until a
  reload. Fix: a visible `role="status"` line while the change is held (a new admin i18n line) + a test; the transport bound is
  deferred (D6).
- [x] [Review][Patch] **6 — The precedence legs are not honest about what they pin** [`apps/api/tests/integration/life-events/life-events.spec.ts`,
  `…/medical/medical-disclose.spec.ts`, `…/rtbf/rtbf.spec.ts`] — families 10 and 11. The address and medical legs seed a WITHDRAWN member
  with a standing claim: the door refuses that at filing and DL18 refuses withdrawal afterwards — the exact objection round-2 patch 5
  raised against `pending-fee` — and the file comment explains only the active re-seed. The rtbf leg's no-claim control is another
  test ("the test above" is not above it). Fix: label those legs as ORDER guards (reachable only for a claim filed before DL18 /
  DL19 existed, or a race the locks now prevent); give the rtbf test its own inline no-claim control.
- [x] [Review][Patch] **7 — Test overclaims and hygiene** — (a) `withdrawal.spec.ts` "the session unchanged" asserts a stateless JWT
  still verifies: it cannot fail on any session change (the handler has no session code — true by construction) → relabel it; (b)
  `death-refusal-claim-screens.test.ts` compares `CLAIM_INTAKE_REFUSED_CODE` to its own literal — the real pin is
  `cannot-file-copy-resolves.test.ts` → delete; (c) the "explicitly accessible" test asserts the MOCK's prop mapping → retitle it as the
  prop, ⛔ a device claim; (d) `helpdesk-detail-page-erasure.test.tsx` queues `mockRejectedValueOnce` with no reset between tests → a
  `beforeEach` reset.
- [x] [Review][Patch] **8 — Closure language outruns the record** [this file's Resolved block and Change Log 2.2, `sprint-status.yaml` row comment and
  ledger `2026-10-31o`, `deferred-work.md` D2] — family 10. (a) "Each fix was shown to FAIL without it" holds for patches 1, 2, 3, 4, 7,
  9, 10 and the rtbf leg of 5 — ⛔ for 5's withdrawal / address / medical legs, 6, 8, 12 — and "restored byte-identical to `HEAD`"
  cannot be said of the three files changed by design; (b) "all 14 patches applied" while 1, 9 and 14 are partial; (c) "nothing is
  committed — the whole tree is uncommitted" is false: `HEAD` `e813e5ee` is the committed build, what is uncommitted is the round-1 and
  round-2 patches; (d) patch 14 is ticked though its fix included the commit; (e) the File List's records line omits this review's
  edits; (f) `deferred-work.md` D2 cites a `file:NNN`, against that file's own rule; (g) "the Picker's override is covered through
  `useWorkplaceT`" proves the hook, ⛔ that the Picker passes it. Fix: run the cheap missing mutations and state each result — and
  which have none — and reword (a)–(g).
  **Resolved 2026-10-31 (BigDev: "1" — apply every patch; round-3 patches 1–8).**
  1. **Grant path, live.** New probe in `delivery-and-correction.spec.ts`: hold the lower-case `rtbf` key, send `member-direct` with an
     UPPER-case `member_id`, require it to WAIT. Dropping the lower-casing of the member id in `rtbfAdvisoryLockKey` turns it red (the
     original defect, end to end). Fence: `handBuiltAdvisoryLocks` — every `pg_advisory_xact_lock` in the data-rights handlers is built by
     `rtbfAdvisoryLockKey(` (3 calls pinned, so the scan cannot pass by matching nothing); making a grant hand-build its key turns it red.
     ⚠ **CORRECTED (round 4, patch 3):** the count pinned the CALLS, ⛔ the parsed calls. An object-form `query({ text, values })`
     escaped both counts, and the `RTBF` assertion was vacuous. The fence now requires the keyed-parsed count to EQUAL the call count.
     ⚠ Only the member-direct grant is probed live; the staff-mediated grant shares the fence, ⛔ a live probe.
  2. **Erasure routes, live.** `raceFirstIntake` against `POST /api/v1/member/rtbf` (a withdrawn member) and against the off-portal
     erasure: each goes red when its handler is reverted to the rtbf-key-only lock, and so does the fence.
  3. **`sendWhileHolding`** (the general helper; `raceFirstIntake` is a wrapper): an explicit INCONCLUSIVE error when the request neither
     waits nor answers (default 4 s, ⛔ vitest's 5 s); the holder is released straight after COMMIT; a request still in flight is
     awaited (bounded) before return; `release(true)` after a failed ROLLBACK. ⚠ Those cleanup paths (a throwing `fileClaim`, a failed
     ROLLBACK) are written and read but ⛔ driven by a test — the probes' mutations cover the wait and the no-wait paths only.
  4. **Fence.** `FUNCTION_STARTS` (arrow, `private` / `static` / `export default async`, property and inline `async (…) =>` forms);
     import-alias and exported-alias following in `sentinelWriters`; backtick quotes and `CLAIM_NOMINEE_FINDING_KINDS` in the literal
     scan; the comments now say what the scans are. The first version's matcher WAS shown to false-pass an arrow function (evaluated
     directly), and the new controls fail the scan for arrow / `private async` / `export default` / inline callback. ⚠ Residual, in the
     comments: textual tripwires — a function-start form not on the list can still false-pass; a kind reached through another
     constant escapes; `stripComments` is unchanged.
  5. **Console.** `intakeChangeHeld` + a polite `role="status"` line (`helpline.intake.changeHeld`), cleared when the filing settles;
     test extended. Removing the setter turns it red; so does removing the guard from `onSearch` alone.
  6. **Precedence legs.** The withdrawn-member legs are labelled ORDER GUARDS (the combination is reachable only for a claim filed before
     DL18 / DL19, or a race the locks now prevent); the rtbf test has its own inline no-claim control.
  7. **Hygiene.** 12(a) relabelled a smoke check (true by construction); the redundant constant test deleted (the real pin is
     `cannot-file-copy-resolves.test.ts` against `@twt/contracts`); the accessible-container test retitled as the PROP; the new admin page
     test resets its mocks in `beforeEach`.
  8. **Closure.** Corrections annotated above; the table below replaces round 2's blanket claim.

  | Round-2 patch | The production mutation that turns it red | Run |
  |---|---|---|
  | 1 lock keys lower-case | drop `.toLowerCase()` on the ids → the unit test AND the UPPER-case grant probe | 2 · 3 |
  | 2 erasure-handler lock | revert either handler to the rtbf-key-only lock → the fence AND the live probe | 2 · 3 |
  | 3 N9 locks | delete the lock line in `lockAndReadDeathReport` → all three probes | 2 |
  | 4 `canChangeCaller` | remove the guard / remove it from `onSearch` alone / remove the notice | 2 · 3 |
  | 5 precedence | demote the death check: rtbf (2); withdrawal, life-events, medical (3) | 2 · 3 |
  | 6 release-retry | **none** — a stronger assertion; a mutation would need the idempotency layer to cache failed attempts | — |
  | 7 helpdesk page | revert the leg to `messageOf` (both tests) / move it behind the export leg (the ordering test) | 2 |
  | 8 reason tuple | add a sixth reason to the contracts tuple → "cover EXACTLY the tuple" | 3 |
  | 9 executed mobile tests | drop the announce / `accessible` / routing branch / namespace override; the component's branch | 2 |
  | 10 cross-Pariwar | drop the predicate's `c.pariwar_id` | 2 |
  | 11 fences | evasion controls (2); reverting a real handler / a hand-built key (3) | 2 · 3 |
  | 12 (a) session | **none possible** — a smoke check | — |
  | 12 (b) AC4 ×4 | the predicate ignores a `denied` claim | 3 |
  | 12 (c) restored door | a RESTORE no longer clears a termination | 3 |
  | 12 (d) 404 locator | a locator built for every failure | 3 |
  | 12 (e) correction row | the handler answers 200 and inserts nothing | 3 |
  | 13 · 14 | records | — |

  **Gate on the final tree** (`ci:local` on :5461). **Run 1: 35 / 36** — `test (unit)` GREEN this time (admin 1,554, mobile 2,199, domain
  3,191, api 795); `integration-tests` RED on ONE spec, `rls/announcement-activity-read.spec.ts` (`of(big)` undefined). **Diagnosis, checked
  — ⛔ assumed:** the DB held 14 committed `PARIWAR_A` cycle rows, all `Trustee One` with `P-TEST-` pools, in two batches of 7 (07:22 and
  08:55 UTC) — one per COMPLETE earlier integration run; they come from eight unrelated specs (api claims / payment / self-verify, domain
  pool / contribution, validity-service), none touched by this story, and nothing this story changed mentions the table. The spec seeds
  its two cycles at "now − 1 h" and asks for the 2 most recent, so a committed cycle newer than that crowds them out; the 08:55 batch
  was 50 minutes old. This run's own domain failure stopped turbo before the later packages ran, so it added none. **The prediction was
  tested:** after the DB clock passed 09:55:44 UTC the spec passed ALONE on the same DB and tree, and the exact `integration-tests` job
  command then passed in full — **24 / 24 tasks** (domain 6,856 passed, api 2,576, jobs 1,962, public 807, validity-service 284, channels
  468, niyamavali-engine 144, events 36). So every one of the 36 jobs is green on the final tree — **across two runs, not one.**
  ⚠ The same residue will fail that spec for an hour after this run too (D7).
- [x] [Review][Defer] **D7 — A complete `integration-tests` run leaves 7 committed `PARIWAR_A` cycles; `announcement-activity-read.spec.ts` fails if run within an hour after one on the same DB**
  [`packages/domain/tests/integration/rls/announcement-activity-read.spec.ts` (seeds at "now − 1 h", `limit: 2`); the eight specs that commit
  `Trustee One` / `P-TEST-` cycles] — deferred, pre-existing, ⛔ this story's: the "double-run pollution" trap, still alive in the integration job.
  Clears with an hour, or by recreating the container. Fix sketch: seed the spec's cycles relative to the DB's newest committed cycle
  (or in a throwaway Pariwar), ⛔ a fixed "an hour ago". Trigger: any second `ci:local` on a reused DB within the hour.
- [x] [Review][Defer] **D6 — A hung intake POST holds the helpline console: `apiFetch` has no transport timeout**
  [`apps/admin/src/api/client.ts`, `HelplineClaimPage`] — deferred (a design choice for the intake's contract, ⛔ a patch): only the
  workplace write is bounded (`boundedWrite` / `AbortSignal.timeout`), because it is idempotent. The intake is idempotent server-side
  too (a re-tap returns the same claim), but aborting a request the server then completes would show a failure for a minted claim.
  Trigger: any change to the client's fetch wrapper, or a reported hang.

**Dismissed (8):** a new test file "may not be in the vitest include glob" — false, it ran (6 tests); "other code may compute the lock keys
by a different formula" and "the pinned bigints may be self-generated" — false, grepped (the only computations are the two patched
functions) and the pins were computed from the OLD formula and passed against the unmodified code; "`resourceLocator` undefined may be
vacuous" — the refusal test in the same spec asserts that field positively; "the medical precedence test sends a made-up
`imaListVersion`" — the state and death checks run before any version check, so a reorder fails loudly; "the search half of the
in-flight test may not need the guard" — dropping the guard from `onSearch` alone turns it red (run); "hooks called outside a component"
— `useT` is mocked as a plain function, and a future hook in `useWorkplaceT` would fail the test loudly, the right signal; "a
negative assertion right after a `waitFor`" — the 409 branch returns before `setError`; "the sticky erasure error is unpinned" —
already D3, deliberate.

### Review Findings — round 4 (2026-10-31) — the full branch

BigDev's scope: *"full branch in one shot"*. Diff: `b2f36fe9..2c20ed03` restricted to code (`apps/`, `packages/`, `scripts/`,
`friction-budget.md`, `microcopy.yaml`). That is **5,236 lines** across 79 files: over the 3,000-line threshold, and chunking was declined. Three
layers, none failed. 34 raw items deduplicate to **1 decision-needed (A — routed to the Panel, now carried as a defer), 10 patches and 12 dismissed**. The Acceptance Auditor
found **no HIGH**: every AC1–AC15 is implemented and exercised, and round-3 Resolved items 1–8 match the code with the residue below. Before
classifying, I checked the following by hand rather than taking them on trust: (1) `tryConverge` has ONE production caller, at
`claims.service.ts`. (2) `icp-lock.ts` imports `node:crypto` only. (3) `closeScopeTx` is idempotent: there is a `closed` flag. (4)
`WorkplacePicker`'s `setBusy(false)` is in a `finally`. (5) `apps/api/vitest.config.ts` sets `testTimeout: 20000`. (6) The joining-fee
confirm (`vyawastha-shulk/handlers.ts`) has ⛔ death check.

- [x] [Review][Defer] **A — The door's "when they died" is measured at FILING: a refused family can pay the fee (or finish KYC) and file
  again** — **RESOLVED → ROUTED TO THE PANEL (BigDev: "1").** The routing note is
  `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-38-paid-after-death.md`: WRITTEN, then SENT and ✅ **RULED
  2026-10-31 as `2026-10-31-430` (DR + KB: "Q1 - B, Q2 - A")**. Q1 B grows row `6-39` (the staff date comparison before any drive).
  Q2 A leaves the door as built. This story is ⛔ changed. At routing it asked Q1
  (a fee paid after the death; we suggest B, the staff date check before any drive, extending row `6-39`) and Q2 (a membership ended
  between the death and the report; we suggest A, as built). It is non-blocking: this story builds A in both. The item is carried in `deferred-work.md` (round 4).
  Reason deferred: the Panel's (§0), with the build half following their answer. Originally decision-needed. The Edge Case Hunter raised this, with the mirror case from the Blind Hunter. `resolveClaimIntakeDoor` reads the CURRENT replayed state
  (`packages/domain/src/claim/intake-door.ts:71-77`), because ⛔ death date exists at intake (G10). A refusal writes nothing (N5), so a
  `pending-fee` member's family can be refused `not_paid` and then confirm the joining fee from the deceased's session. The confirm moves
  `pending-fee → lock-in` with ⛔ death check. Filing again then mints a claim. The same holds for `pending-kyc → manual KYC → fee`. The mirror case:
  an `active` member who dies and is withdrawn or terminated before anyone reports the death is refused and told *"the person was not a
  member of the Trust when they died"*, which is false. **§0 gate: the PANEL's.** Stripped of citations, the question is *"if a person who never paid
  dies, and their family pays afterwards, does the Trust owe them a claim?"*. That is what the Trust OWES. Pinning the refusal would also
  supersede the ruled *"⛔ recorded"* (`-423`), so two ratified things are in tension. **Split:** the engineering half (what to
  record and where, a death check on the fee or KYC confirm) follows the answer and is ⛔ asked.
- [x] [Review][Patch] **1 — The "change held" line is mounted already filled, so screen readers may not announce it** [`apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx:527`]
  — blind + auditor, family 13 (d). A polite live region inserted together with its text is often not spoken, and a second held click
  re-renders nothing. The test checks the role and the text only. Fix: keep an empty `role="status"` element always mounted and fill it.
- [x] [Review][Patch] **2 — Comments still describe the withdrawal as lock-free, and the posting gate as "⛔ a claim check"**
  [`packages/domain/src/member/rtbf-legality.ts:129`, `packages/domain/tests/integration/member/erasure-intake-race.spec.ts:10`,
  `apps/api/src/modules/life-events/handlers.ts:479`] — all three layers, family 10. Since DL18 a real withdrawal takes the intake key, so the
  three-party race now reaches T2 only through a raw projector step. The path still reachable without the key is a moderation
  TERMINATION. Fix: correct all three comments, and make spec (ii)'s T2 a termination, or say plainly that it is a projector step standing in for one.
- [x] [Review][Patch] **3 — The hand-built-key fence counts calls, ⛔ parsed calls: an object-form query escapes it**
  [`apps/api/tests/unit/erasure-and-death-report-fence.test.ts:124-134, 308-310`] — auditor, families 2 / 10. Rewriting a grant as
  `query({ text: 'SELECT pg_advisory_xact_lock($1)', values: [k] })` gives `handBuilt 0, calls 3`, so the scan passes. The `RTBF`
  assertion is vacuous: that file has ⛔ `pg_advisory_xact_lock` left. Fix: assert that the parsed calls equal all calls (3), and drop or replace the
  vacuous line. Round-3 Resolved item 1's *"cannot pass by matching nothing"* needs correcting.
- [x] [Review][Patch] **4 — The AC15 workplace-answer test seeds a member the door would refuse** [`apps/api/tests/integration/workplaces/workplaces.spec.ts:680`]
  — auditor, DL14 / TR2. `seedMemberRow` replays to `pending-kyc`, so the standing claim it seeds is unreachable. That is round-2 patch 5's class, which was
  fixed only for life-events and medical. Fix: an event-seeded active member.
- [x] [Review][Patch] **5 — AC11's "export succeeds" leg proves REUSE, on an unreachable member** [`apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts:1738`]
  — auditor, family 10. The `ready` export is pre-seeded and asserted equal, and the subject is a bare row. Fix: an event-seeded member with a
  standing claim, a fresh build (⛔ pre-seeded export), and the delivery leg too.
- [x] [Review][Patch] **6 — The two mint paths that bypass the door carry ⛔ DELIBERATE block** [`packages/domain/src/claim/icp.ts:479` `convergeIntakeAttempt`,
  `:587` `overrideIntakeAttempt`] — auditor, family 9. DL7 residual (b) records the bypass, but ⛔ in code. Fix: a DELIBERATE doc block at each,
  giving the rationale and the re-examination trigger (row 6-22).
- [x] [Review][Patch] **7 — `sendWhileHolding` gives a wrong diagnosis on a fast non-lock failure, and its timing rationale is stale**
  [`apps/api/tests/integration/_death-report-fixture.ts:93, 117-144`] — edge + blind. A request that answers quickly with a 4xx or 500 is
  reported as *"did not wait on the claim-intake key"*. The *"before vitest's own 5 s"* rationale is false (`testTimeout: 20000`), and the bounded-await
  `setTimeout` in `finally` is never cleared. Fix: put the status and body in the no-wait error, correct the comment, and clear the timer.
- [x] [Review][Patch] **8 — Race spec (i) leaves `filed` un-awaited on its failure path** [`packages/domain/tests/integration/member/erasure-intake-race.spec.ts:184`]
  — edge. If `blockedBy` is false, the `expect` throws and the eraser rolls back. `filed` then rejects unhandled and races `pool.end()`. Fix: settle
  it in `finally`, as spec (ii) does with `t3Result`.
- [x] [Review][Patch] **9 — The admin erasure-refusal line promises an erasure the member may still be refused** [`apps/admin/src/modules/helpdesk/i18n-en.ts:99`]
  — edge. *"It can be erased only if the claim is found to be about a member who is alive"*: once the claim is released, an `active` member is still
  `rtbf.invalid_state`. Fix: drop the promise, or condition it ("…and only once the member has left or been removed"). This is operator copy,
  DL11, the author's to change.
- [x] [Review][Patch] **10 — The records drift from the commit** [this file: File List, the Task 3A and Task 6 completion notes] — auditor, family 10.
  The File List says *"D1–D6"* and ledgers *"n / o / p"*, but `2c20ed03` adds D1–D7 and n / o / p / q. Two round-3 SOURCE files
  (`HelplineClaimPage.tsx`, `i18n-en.ts`) are filed under "Modified — tests". The Task 3A note still says *"concurrently (×3)"*, but round 2 cut that to one
  sanity run. The Task 6 *"⭐ RESOLVED — AC12 MET"* describes `e813e5ee` and is not marked superseded.

**Resolved 2026-10-31 (BigDev: "1" — apply every patch; round-4 patches 1–10).** Finding A was routed first (above). Nothing is
committed. ⚠ This round's own patch diff has ⛔ been reviewed by the layers.
1. **Console.** The `role="status"` paragraph is always mounted, and only its text changes. The test asserts it is present and EMPTY
   before the hold and empty again after. **Mutation:** restoring the conditional mount turns the test red. ⚠ Residual, in the comment:
   a second held click while the line is showing changes nothing, so it is ⛔ re-read. ⚠ (Round 5: every test is jsdom DOM shape, so a
   real screen reader announcing the line is un-attested. D8 carries both.)
2. **Comments + race.** `acquireErasureLocks`' rationale now names the moderation TERMINATION as the lock-free writer and states DL18.
   The posting gate's doc says it now checks the claim. Race spec (ii)'s T2 runs both as a termination (the fixture's `terminate`,
   the overlay's own events) and as a withdrawal projector step, labelled as a stand-in. It is now one run per kind; it was three runs of the
   withdrawal before, and the proof is `pg_blocking_pids`, ⛔ repetition. **Mutation:** removing the intake key from
   `acquireErasureLocks` turns both (ii) legs and both (i) erasure-first legs red (4 / 6).
3. **Fence.** `keyedAdvisoryLocks` must EQUAL `advisoryLockCalls` (3). `RTBF` now asserts ⛔ raw lock call at all (its locks
   come only through `acquireErasureLocks`). There is a new object-form positive control. **Mutation:** rewriting the first grant in
   `member-data-rights/handlers.ts` into `query({ text, values })` turns the fence red. Before this patch, that rewrite passed.
4. **AC15 fixture.** The workplace-answer leg seeds `seedLifecycleMember` (real events, `active`).
5. **SEE leg.** `seedSubject` gained `replayed` (real events) and `status: 'none'`. The export leg now BUILDS (one row, the route's
   own id), and a new member-direct DELIVERY leg is issued for a member with a standing claim.
6. **DELIBERATE blocks** at `convergeIntakeAttempt` and `overrideIntakeAttempt`: the rationale, the DL7 residual, and the trigger, row 6-22.
7. **`sendWhileHolding`.** `answeredWithoutWaiting` (status + body) is appended to all six `race.waited` messages. The comment's
   "vitest's own 5 s" is corrected (`testTimeout` is 20 s). The bounded await's timer is cleared. ⛔ Mutation: diagnostic only.
8. **Race spec (i).** `filed` is settled in `finally`. It was exercised by the patch-2 mutation run, where both (i) erasure-first legs failed
   cleanly.
9. **Copy.** *"While the claim stands it cannot be erased; if the claim is found to be about a member who is alive, the usual erasure
   rules apply again."* The source and both admin tests are updated. This is DL11's operator line, changed by BigDev's "apply every patch".
10. **Records.** The File List, the Task 3A and Task 6 notes, and round-3 Resolved item 1 are annotated CORRECTED / SUPERSEDED.

**Checks run on the patched tree** (story DB :5461). These are ⛔ a `ci:local` run:
- admin, 3 files: 50 / 50
- api fence unit: 25 / 25
- domain `erasure-intake-race.spec.ts`: 6 / 6
- api integration: `workplaces`, `delivery-and-correction`, `withdrawal`, `life-events`, `medical-disclose`, `rtbf` — 123 / 123
- `tsc --noEmit`: api, admin and domain clean (tests included)
- ESLint on every changed file: clean

Each mutation was restored from a byte copy and checked with `git diff --stat`.

**Dismissed (12):**
- *A zero-event member is refused `not_joined`*: `events_log` is the authority, and a bare row is a test-only artifact (TR2). Its real consequence is patches 4 and 5.
- *The mobile RTBF screen lacks `rtbf.death_reported` copy*: there is ⛔ mobile erasure screen (G16).
- *A sticky erasure error masks a later data-rights failure*: already D3.
- *Other `tryConverge` callers could 500*: there is one caller.
- *`sendWhileHolding` can hang on pool exhaustion*: that needs ≥10 held connections against pg's default pool. Speculative.
- *`stripComments` eats `/*` in strings*: a residual disclosed at round 3, item 4.
- *`icp-lock.ts` is not fenced as a leaf*: it imports `node:crypto` only, so there is ⛔ cycle today.
- *`inScope` double close*: `closeScopeTx` is idempotent.
- *`WorkplacePicker`'s early return skips cleanup*: `setBusy(false)` is in `finally`.
- *`cannot-file` is read twice, or swallowed on iOS*: the device behaviour is D5, un-attested and recorded.
- *A mistaken claim locks a living member out of erasure*: that is D1, with DL4 / DL7 and row 6-22.
- *No DB trigger backs the erasure refusal*: ⛔ migration by design. The fences plus the live probes carry it.

### Review Findings — round 5 (2026-10-31) — the round-4 PATCH diff

BigDev: *"run the code review on patches"*. Diff: the uncommitted `git diff HEAD -- apps packages` — **536 lines**, 17 files, one chunk.
Three layers, none failed. The ~50 raw items become **1 decision-needed, 11 patches, 1 defer and 15 dismissed**. **Panel-routing gate (§0):**
the one decision is the operator's copy — the author's (DL11), ⛔ the Panel's. Stripped of citations it reads: "which words tell staff
that a closed claim still blocks erasure". That changes ⛔ what any member is owed. Checked by hand before classifying: `terminate()` exists
in the race spec (a superuser append of the moderation pair); `tsc` passes the new `FirstIntakeRace` field; `seedLifecycleMember` writes
⛔ `member_identities` row (so `seedSubject({ replayed })` ⛔ collides); ⛔ other test that renders `HelplineClaimPage` queries
`getByRole('status')`.

- [x] [Review][Decision] **E — The new erasure-refusal sentence ("While the claim stands…") can be read as "while the claim is open"**
  — **RESOLVED (BigDev: "1") → applied:** *"This stays so even if the claim is closed or refused; only a finding that the member is
  alive lifts it, and then the usual erasure rules apply."* It is in `helpdesk/i18n-en.ts` and both admin tests, and DL11 is annotated
  SUPERSEDED. ⚠ It points staff at a finding with ⛔ producer yet (D1, row 6-22). Originally:
  — edge + auditor + blind. A `denied`, `closed` or `settled` claim still locks (`-423` reading 1, AC4), but an operator may expect the
  erasure to work once the claim is closed. The sentence also repeats "cannot be erased" (blind). The auditor adds that DL11's text was
  approved "as written" (`-425`), and round 4 replaced it with wording BigDev never saw. ⇒ the exact words are BigDev's to approve, and the
  change must be recorded against DL11 (⛔ silently).
- [x] [Review][Patch] **1 — The live-region test re-queries the node at each step, so a REMOUNT passes** [`apps/admin/tests/helpline-claim-page.test.tsx:154-170`]
  — edge + blind, family 13 (d). Capture the node at page load, BEFORE any interaction, and assert `toBe` the same node held and cleared.
- [x] [Review][Patch] **2 — Race spec (i): `filed` can reject before any handler is attached** [`packages/domain/tests/integration/member/erasure-intake-race.spec.ts:189`]
  — edge. With the intake key removed the door refuses within milliseconds while `blockedBy` polls for 5 s, giving an unhandled rejection.
  Attach `.catch(() => undefined)` straight after creating it (the `sendWhileHolding` pattern); the `finally` keeps the await.
- [x] [Review][Patch] **3 — Race spec (ii): nothing proves T2 made the member ERASABLE** [`erasure-intake-race.spec.ts` (ii)] — edge + blind.
  `resolveRtbfLegality` checks the death report first, so T3's `death_reported` holds whether or not T2 did anything. Add, after T2 commits
  and while T1's claim is still uncommitted, a fresh-tx `resolveRtbfLegality` that returns `legal`. That is the counterfactual the comment claims:
  without the lock, this erasure proceeds.
- [x] [Review][Patch] **4 — AC5 (ii) says "passes across REPEATED runs with ⛔ deadlock", and round 4 cut it to one run per kind**
  [`erasure-intake-race.spec.ts` (ii)] — auditor + blind, family 10. Restore three runs for each kind.
- [x] [Review][Patch] **5 — The termination leg is labelled "as the moderation writers append it", but it is a raw superuser INSERT**
  [`erasure-intake-race.spec.ts` (ii) comment + header] — auditor, family 10. Label it honestly: the fixture appends the overlay pair that
  `moderateMember` writes, and `moderateMember` takes ⛔ advisory lock (checked by the auditor).
- [x] [Review][Patch] **6 — The fence counts only `pg_advisory_xact_lock(`** [`apps/api/tests/unit/erasure-and-death-report-fence.test.ts`
  `advisoryLockCalls` / `parsedAdvisoryLocks`] — edge + auditor + blind, family 2. `pg_advisory_lock(`, `pg_try_advisory_xact_lock(` and
  `pg_advisory_xact_lock_shared(` are invisible to both counts. A live example of the session form exists (`member-auth.service.ts`). Widen
  the pattern to `pg_(?:try_)?advisory_(?:xact_)?lock(?:_shared)?\(`.
- [x] [Review][Patch] **7 — "Keyed" accepts EITHER key function, and accepts a key wrapped in `hashtext(…)`** [same file] — edge + blind.
  The test title promises `rtbfAdvisoryLockKey(`. A data-rights grant keyed by the intake key would invert the lock order, and
  `pg_advisory_xact_lock(hashtext($1))` over a key-function param locks a DIFFERENT key. Fix: for the data-rights scan, keyed means the
  `rtbfAdvisoryLockKey(` key AND the bare `($n)` SQL argument. Add positive controls for both.
- [x] [Review][Patch] **8 — The object-form control asserts only `.not.toBe`** [same file] — blind. Pin it: keyed 1, calls 2.
- [x] [Review][Patch] **9 — The ASK leg next to patch 5 still seeds a bare row** [`apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts`
  "6.38 N8 / AC15 — ASK stays open"] — edge + auditor, DL14 / TR2. Use `seedSubject(…, { replayed: true })`.
- [x] [Review][Patch] **10 — "The export is BUILT" proves a NEW REQUEST, ⛔ a build** [same file, the N8 SEE export leg] — auditor + blind + edge.
  `requestExport` inserts a `pending` row and queues the build. Fix: retitle the test ("a NEW export request is created, ⛔ the reuse path"), assert
  `status = 'pending'`, and state in `seedSubject`'s doc that `status: 'none'` returns an `exportId` with ⛔ row behind it.
- [x] [Review][Patch] **11 — The records lag** [this file] — auditor, family 10. (a) The round-4 finding A, the File List and Change Log 2.5
  still say the routing note is "⛔ sent", though `-430` RULED it. (b) The round-4 records line omits `.decision-log.md` and
  `sprint-status.yaml`. (c) Invariants N3 and N4 still say a withdrawal "takes ⛔ lock" (true at authoring; since DL18 it takes the intake
  key). (d) The Debug Log's "three repeated (ii) runs" (patch 4 restores those runs). (e) Round-4 Resolved item 1 does ⛔ say that the
  announcement is proven in jsdom only.
- [x] [Review][Defer] **D8 — A second held click while the "held" line shows is ⛔ re-announced, and no screen reader has heard the line**
  [`apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx`] — deferred. The repeat case is a known limit of a polite live region (the
  text does not change). Every test is jsdom DOM shape, so a real VoiceOver / NVDA pass is un-attested. Trigger: the admin accessibility
  audit (11b.8) or a reported miss.

**Resolved 2026-10-31 (BigDev: "1" — apply every patch; round-5 patches 1–11).** Decision E was settled first (above). Then:
1. **Live region:** the node is captured at FIRST render and asserted `toBe` the same node when held and when cleared.
   **Mutation:** a `key` that remounts it turns the test red.
2. **Race (i):** `filed.catch(() => undefined)` is attached at creation. **Mutation:** with the intake key removed from
   `acquireErasureLocks`, the legs fail cleanly (8 / 10 red) with ⛔ unhandled rejection.
3. **Race (ii) counterfactual:** after T2 commits, a lock-free `resolveRtbfLegality` must return `legal` (the erasure the lock
   prevents). **Mutation:** removing T2 turns all six (ii) runs red ("T2 did not make the member erasable").
4. **Repetition:** three runs per kind, so the suite is 10 tests.
5. **Labels:** both T2 forms are named stand-ins (`terminate` = a superuser append of the pair `moderateMember` writes).
6. **Lock spellings:** `ADVISORY_LOCK_FN` covers `pg_(try_)advisory_(xact_)lock(_shared)`; an unlock is ⛔ counted.
7. **Keying:** "keyed" now means a bare `$n` argument AND `rtbfAdvisoryLockKey(`, with positive controls for `hashtext`-wrapped,
   intake-keyed, session-form and `try_` calls. The three real call sites still count as keyed (the fence is green).
8. **Object-form control:** pinned at calls 2, keyed 1.
9. **ASK leg:** `replayed: true`.
10. **SEE export leg:** retitled "a NEW … request (⛔ the reuse path)", and asserts `[{ export_id, status: 'pending' }]`; the `seedSubject` doc
    warns that `'none'`'s `exportId` has ⛔ row behind it.
11. **Records:** N3 and N4 CORRECTED (DL18); the Debug Log annotated; the round-4 finding A, the File List and the records line
    carry `-430`; round-4 item 1 carries the jsdom caveat (D8).

**Checks on the patched tree** (story DB :5461; ⛔ `ci:local`): race spec 10 / 10; `delivery-and-correction` 39 / 39; fence unit
26 / 26; admin `helpline-claim-page` 28 / 28 and the two copy tests 22 / 22; `tsc` (api, admin, domain) and ESLint on every
changed file are clean. Every mutation was restored from a byte copy and checked with `git diff --stat`.

**Dismissed (15):**
- *The fence cannot see a lock taken through a wrapper*, and *the fence scans only two files*: textual tripwires, disclosed as such (round 3).
  The other guards go through the ONE domain helper `lockAndReadDeathReport`, and the forced probes are the proof.
- *`terminate` is undefined*: it is defined in the spec.
- *`FirstIntakeRace`'s new field breaks a builder*: `tsc` is clean, and `raceFirstIntake` returns `sendWhileHolding`'s object.
- *`describeAnswer` and a circular body / PII in logs*: test data only.
- *`describeAnswer` loses a non-JSON body in the spec wrappers*: the status still prints.
- *The 5 s bound "overclaims"*: it says bounded.
- *4 s + 5 s against the 20 s timeout*: inside the budget.
- *The ⛔ glyph is misreadable*: house convention.
- *The workplace answer / member-direct grant have no forced probe*: they share the guard, by construction, as disclosed at round 4.
- *Presence assertions now always pass*: the test asserts text, and no other file uses that test id.
- *Clients leak if `pidOf` throws*: a SELECT on an open connection.
- *`seedTerminatedSubject` hard-codes versions*: it does ⛔ forward `replayed`, so this is unreachable.
- *The workplaces suite leaks member rows*: pre-existing, on a fresh tenant.
- *The AC3 terminated legs seed claim-after-termination*: the combination is reachable in the other order (a claim, then a termination), and the legality reads both, order-free.

## Dev Notes

### Traps

- **TR1 — The import cycle.** `member/rtbf-legality.ts` may import `../claim/death-report.js` and `../claim/icp-lock.js` ONLY (both leaves);
  if `death-report.ts` ever imports from `claim/` (even a type re-export through `icp.ts`), the domain package acquires a runtime init
  cycle that typecheck cannot see ([[project_type_only_import_cycle_trap]]). The fence in Task 5.2 asserts the leaf's import list.
- **TR2 — Fixtures replay to `pending-kyc`.** The door reads the EVENT REPLAY (G9), and a member with ZERO events replays to `pending-kyc`
  ⇒ refused `not_joined`. The door runs only on a FIRST report (N1 false), so a test whose intake follows a seeded prior claim is
  UNAFFECTED. Traced at `01062c51`:
  - **Breaks — re-seed the member through events to an open state** (`signup_initiated` → `kyc_completed` → `vyawastha_shulk_paid`, i.e. `lock-in` — ⛔ `pending-fee`, which `-424` Q1 (b) made
    REFUSED; or the domain member helpers; the `project(...)` helper `rtbf.spec.ts` uses at API level), under the same Pariwar scope:
    `packages/domain/tests/integration/claim/icp.spec.ts` (random member ids, ⛔ row, ⛔ events — every "NO CANDIDATE → mints" leg and
    the merge / override legs); `packages/domain/tests/integration/claim/nominee-refusal-inheritance.spec.ts` (raw-inserts `'active'`, ⛔
    events); `packages/domain/tests/integration/nominee/nominee-history-concurrency.spec.ts` (its `seedMember` projects
    `signup_initiated` only — the D3 tests); `apps/api/tests/integration/claims/helpline-claim-intake.spec.ts` (its `seedMember` replays
    to `pending-kyc` — the first-filing tests; its prior-claim test is unaffected).
  - **Unaffected — a prior claim is seeded before every intake** (`claimAt` / `paidApart` / `refusedClaim` / `emit(...)` / a closure):
    domain `claim/correction-closure`, `claim/one-payment-per-death-{closure,concurrency,paths}`, `claim/suspicion-refusal{,-concurrency}`;
    API `suspicion-refusal-routes`, `one-payment-per-death-routes`, `correction-closure`. `_nominee-name-check-fixture.ts` never calls
    intake.
  - ⚠ **NEWLY breaking after `-424` Q1 (b) (`pending-fee` ⇒ `not_paid`):** `nominee-bank`, `claim-contact`, `dpdpa-consent` and
    `claims-intake` seed their deceased at `pending-fee` via events — every FIRST-report leg in them is now refused; add the
    `member.vyawastha_shulk_paid` event (⇒ `lock-in`). Grep every other fixture that stops at `kyc_completed` / `kyc_manual_fallback`
    for a first report too.
  - Claims seeded through `projectClaimState` / `seedClaim` / `driveClaimTo` bypass `tryConverge` entirely.
  - ⚠ Still grep every `tryConverge(` / `initiateIntake(` / intake-route test for a FIRST report on a member with no events before the
    first run — this list is a trace, ⛔ a guarantee.
- **TR3 — The erasure specs that call `anonymizeMember` DIRECTLY** (⛔ the routes) on a member with a claim or a memorial — they stay green
  (`anonymizeMember` is unchanged) and stay VALUABLE as defence-in-depth (a pre-6.38 row, or an innocence-released claim, can still meet
  an erased member) — ⛔ delete or "fix" them; re-word a header only if it claims the scenario is ordinary:
  `packages/domain/tests/integration/claim/{ground-inspection,death-certificate,peer-mesh-reply,approval-warnings}-rtbf.spec.ts`,
  `packages/domain/tests/integration/nominee/nominee-history-rtbf.spec.ts`, and in `apps/api/tests/integration/`:
  `claims/death-certificate.spec.ts`, `memorial/memorial-gates.spec.ts`, `public-pages/sahyog-vivran-memorial.spec.ts`,
  `memorial-takedown/takedown.spec.ts`, `nominee/nominee-marks-save.spec.ts`, `contributions/pool-contributors-rtbf.spec.ts`,
  `rls/memorial-policy-regression.spec.ts`.
- **TR4 — The drizzle correlated-subquery tautology.** Keep the moved SQL raw with explicit aliases
  ([[project_epic6_drizzle_correlated_subquery_bug]]).
- **TR5 — Clock domain.** Read state with the UNBOUNDED replay (`getCurrentMemberState`) and the unbounded overlay — ⛔ `getMemberStateAt(…,
  deps.clock())` for the door (the erasure handlers' existing `getMemberStateAt` call is ⛔ this story's to change).
- **TR6 — 409 placement in `initiateIntake`'s catch.** The translators are `instanceof` no-ops on disjoint error types, so the order
  against `translateRefileRequiresConfirmation` and the `ClaimStreamConcurrencyError` backstop does ⛔ change behaviour — put
  `translateClaimIntakeRefused` beside the refile translator, before the backstop, for readability; ⛔ more is load-bearing.
- **TR7 — The admin helpline's alert text is an EXPRESSION, ⛔ `onError`.** `onError` only sets state; the text is the `submitError`
  expression (G13). Derive the refusal line THERE (DL9) — ⛔ new state in `onError` (it would also need clearing on a member change) and
  ⛔ a blanket switch that hides future codes; `messageOf` stays the fallback. Alternative only if the line needs markup: widen
  `submitError` to `ReactNode` and add `HelplineConsoleShell.tsx` to the File List.
- **TR8 — Fastify empty body.** The rtbf confirm body is `{}` strict — tests post `'{}'` ([[project_fastify_empty_json_body_400]]).
- **TR9 — Live-DB hygiene.** Own DB container named `twt_dev`; known failures #13–#15 ([[project_known_livedb_test_failures]]);
  separate transactions for ordering ([[project_db_clock_ordering_tests_tie]]); every `git push` prefixed with the story's `DATABASE_URL`.
- **TR10 — Uniform withholding on the wire.** The translation lives in the SHARED `initiateIntake`, so the easy build sends `details.reason`
  to BOTH routes — and the app's 409 body then discloses what its screen hides (N7). Only the helpline route carries `details`; AC7
  asserts the key ABSENT on the member route ([[feedback_withholding_must_be_uniform]]).

### What this story does ⛔ do

⛔ A "found alive" closure (6-22's); ⛔ a guilty-finding release rule (6-22's — DL4); ⛔ a separate data-rights nominee; ⛔ moderation
status in the 4.7 search results; ⛔ disabling the admin erasure button pre-emptively; ⛔ a refusal of withdrawal or of direct edits
after death beyond `-424` Q2 (a) / (b)'s member-side refusals; ⛔ telling the caller the SPECIFIC reason (`-424` Q3 B — the general
sentence only); ⛔ refusing a typed-in identity, and ⛔ the staff identity check before a drive (`-424` Q1 (a) C — row `6-39-…`); ⛔ a
staff path that changes a member's record (DL19 (c) — the rule is recorded for it); ⛔ any change to the erasure of a living member for whom ⛔ claim has been filed; ⛔ backfill of existing claims (⛔ member uses the
system yet — the routing note's "What is at stake right now"); ⛔ the privacy policy (outside this repository — BigDev and counsel;
tracked by Task 0.5 (iii)).

### Project Structure Notes

- Domain: `packages/domain/src/claim/{death-report,intake-door}.ts` (NEW), `claim/{nominee-lock,icp,errors}.ts`,
  `claim/index.ts` (barrel), `member/rtbf-legality.ts`, `member/state.ts` (comment), `member/anonymize.ts` (comment);
  comments only: `claim/{suspicion-refusal-persist,approval-warnings,peer-mesh-read}.ts`.
- Contracts: `packages/contracts/src/claims/intake-refusal.ts` (NEW — the mirrored reasons + the code), `packages/contracts/src/claims/index.ts`
  (barrel line); a lockstep test in `packages/contracts/tests/`.
- API: `apps/api/src/modules/rtbf/handlers.ts`, `apps/api/src/modules/member-data-rights/handlers.ts`,
  `apps/api/src/modules/claims/{claims.service,claims.helpline.handlers,claims.handlers}.ts`; the fence
  `apps/api/tests/unit/erasure-and-death-report-fence.test.ts` (NEW).
- Admin: `apps/admin/src/modules/helpline-claims/{HelplineClaimPage.tsx,i18n-en.ts}` (+ `HelplineConsoleShell.tsx` only if TR7's
  alternative), `apps/admin/src/modules/helpdesk/{HelpdeskDetailPage.tsx,i18n-en.ts}`; tests `apps/admin/tests/{helpline-claim-page,helpdesk-responder-console}.test.tsx`.
- API (`-424`): `apps/api/src/modules/withdrawal/handlers.ts` (DL18), `apps/api/src/modules/life-events/handlers.ts` and
  `apps/api/src/modules/medical/medical.handlers.ts` (DL19).
- Mobile: `apps/mobile/app/(claim)/{cannot-file,relationship}.tsx`, `apps/mobile/lib/cannot-file-copy.ts`; i18n `packages/i18n/locales/{en,hi}/claim.json`;
  (`-424`) `apps/mobile/app/(withdrawal)/index.tsx`, the `apps/mobile/app/(life-events)/` screens that post address / posting / medical /
  the workplace answer, and their locale keys;
  tests `apps/mobile/tests/unit/{cannot-file-copy-resolves,helpline-cta-presence}.test.ts`.
- Domain test (NEW, DL17): `packages/domain/tests/member/door-input-fence.test.ts` (unit, ⛔ DB).
- Records: `friction-budget.md` (repo root), `microcopy.yaml` (`code_globs`).
- API client: `packages/api-client/src/index.ts` (docstring only).
- ⛔ Migration: every table and index needed exists (`claims_deceased_member_id_idx`, `claim_nominee_findings`'s unique per claim).
- Hand-format (Prettier is ⛔ enforced — [[project_prettier_not_enforced]]); ESLint cwd-relative ([[project_eslint_config_per_package_cwd]]).

### References

- `.decision-log.md` — `2026-10-30-423` (the ruling, the readings, Consequences); `2026-08-24-159` cl. 11; `2026-09-21-238` cl. 1, 4, 5;
  `2026-09-21-241` §6 and Consequence 3.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-30-erasure-after-a-death-is-reported.md` — Q1–Q3 as put; E3 (the
  code as traced); "What is at stake right now".
- `_bmad-output/planning-artifacts/epics.md` — `### Story 6.38` (the epics entry).
- `_bmad-output/implementation-artifacts/deferred-work.md` — "Deferred from: BigDev's questions while reviewing Story 6.33" (DISCHARGED into this row).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — row `6-38-death-locks-erasure-and-non-member-claims-refused` (its comment block).
- Precedent stories: 6.20 (the nominee lock, D3, AC11), 6.19c (the re-file 409 at both intake callers, the calm helpline screen), 10.21
  (the off-portal data rights), 3.12 (RTBF), 9.1 (Ravi mode).
- `docs/legal/niyamavali.md` (main checkout only — gitignored, [[project_legal_corpus_private_repo_split]]): §2.1, §8.4, §8.4a, Part 10.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 6.38`, 2026-10-31, in the story's own worktree (branch fast-forwarded to
`origin/main` `b2f36fe9`; ⛔ `apps/` / `packages/` change since the pin `01062c51`). Live DB: the story's own container
`twt-638-pg` (:5461, DB `twt_dev`, 192 migrations).

### Debug Log References

- Red checks run and recorded (each restored byte-for-byte afterwards — `git diff` of the file re-checked):
  - AC2 / AC3 / AC4 — the `death_reported` line in `resolveRtbfLegality` disabled ⇒ **7 of the new erasure tests FAIL** (member
    route ×5, off-portal ×2); restored ⇒ green.
  - ⭐ AC5 (ii) — the intake-key lock removed from `acquireErasureLocks` ⇒ **5 FAIL**: (i) erasure-first ×2 (*"the intake did
    not wait for the erasure's intake-key lock"*) and (ii) three-party ×3 (*"the erasure did not wait for the intake's lock
    (N3)"*); restored ⇒ 7 / 7 green, three repeated (ii) runs, ⛔ deadlock. ⚠ (Round 4 cut (ii) to one run per kind, and round 5
    restored three per kind, for a termination and a withdrawal T2 — the suite is now 10 tests. Round 5 also added a lock-free legality
    read proving T2 made the member erasable.) ⚠ The failure shows at the server-truth WAIT
    assertion (`pg_blocking_pids`), which precedes the outcome assertion — without the lock T3 never waits.
  - AC9 — `intake.reset()` removed from `resetDownstreamState` ⇒ the member-change test FAILS; restored ⇒ green.
- TR2 trace confirmed by running, ⛔ guessed: the door broke exactly the traced files (domain `icp.spec.ts` ×5,
  `nominee-refusal-inheritance.spec.ts` ×5, `nominee-history-concurrency.spec.ts` ×2 D3; API `helpline-claim-intake`,
  `claims-intake`, `claim-contact` ×10, `dpdpa-consent` ×11, `nominee-bank` ×8). Two other first-run reds
  (`approval-warnings-every-approver`, `memorial-takedown/takedown`) were 30 s / 20 s TIMEOUTS under a concurrent full run +
  `tsc`; both pass in isolation (145 / 145 with the re-seeded files).

### Completion Notes List

- 2026-10-30 (`bmad-create-story 6.38`): the comprehensive developer guide was written from three read-only traces at `01062c51` plus a
  hand re-read of the load-bearing claims. Status ready-for-dev; next is Task 0 (governance first).
- 2026-10-31 (`bmad-dev-story 6.38`) — **Task 0:** decision `2026-10-31-425` AUTHOR-COMMIT (DL1–DL19 as answered) committed ALONE
  (`23ac6f19`); `deferred-work.md` — DL4 / DL7 (innocence-only release, the guilty arm 6-22 owes, the two residual edges),
  DL12 (ii), `-423` Consequences 2 · 3 (in `deferred-work.md`, ⛔ a roster row — BigDev may move it); a dated POINTER on row
  `6-22-…`; ledger `2026-10-31l`, row → in-progress (`bcd51be4`).
- **Task 1 (AC1):** `claim/death-report.ts` `isDeathReportStanding` — the nominee lock's SQL MOVED unchanged; the nominee lock
  delegates (its 6.20 specs green, ⛔ assertion changed). 9 live-DB cases (incl. a `nominee_disqualified` finding ⛔ releasing).
- **Task 2 (AC2–AC4):** `resolveRtbfLegality(db, pariwarId, memberId, state)` gains `death_reported` (after `anonymized`, before
  both legal arms); `acquireErasureLocks` (intake key → rtbf key); both handlers switch EXHAUSTIVELY (`never` arm) and answer
  409 `rtbf.death_reported`. AC3 asserts the failed attempt's idempotency key is released (a same-key retry re-reads legality).
- **Task 3 (AC5–AC8):** `claim/intake-door.ts` (`CLAIM_INTAKE_REFUSAL_REASONS`, the exhaustive `lifecycleRefusal`,
  `DOOR_REFUSED_LIFECYCLE_STATES` derived from it, `resolveClaimIntakeDoor`); `ClaimIntakeRefusedError`; the gate in
  `tryConverge` after the lock, before any read or write, only while ⛔ report stands. Contracts mirror
  (`claims/intake-refusal.ts`: the code, the tuple, `isClaimIntakeRefusalReason`) + lockstep test. `translateClaimIntakeRefused`
  — `details.reason` on the HELPLINE route only (`revealRefusalReason: true`); the member route's 409 has ⛔ `details` (AC7
  asserts the key absent). DL16 (a): the helpline `helpline_claim.intake_failed` line carries `resourceLocator =
  claim-intake-refused:<reason>` (asserted on the sink event); the member line stays reason-less. Domain: the full 9 × 3 table
  (27 cells, five refusals), N5 ⛔ writes, AC8 legs — idempotent, cross-channel `pending`, `denied` ⇒ mints, `settled` ⇒ minted
  and CLOSED, `closed` for no response ⇒ the RE-FILE 409 then minted on a confirmation (in `correction-closure.spec.ts`, beside
  its 6.19c test), the released-only member meets the door again. Race spec `member/erasure-intake-race.spec.ts` calls
  `acquireErasureLocks` + `resolveRtbfLegality` + `tryConverge` (⛔ a hand copy).
- **Task 3A (AC14, AC15):** ONE domain helper `claim/death-report-lock.ts` `lockAndReadDeathReport` (intake key, then the
  predicate — the 6.20 D3 shape) so the three guards ⛔ re-type the lock order: withdrawal (`withdrawal.death_reported`, checked
  BEFORE the state), the Life Events guard (`life_events.death_reported` — address, posting, the workplace answer) and medical
  (`medical.death_reported`). AC14's race fires the member's own intake and withdrawal concurrently (×3): exactly one wins.
  ⚠ **CORRECTED 2026-10-31 (code review round 4, patch 10):** round 2 cut that race to ONE sanity run. The proof is the
  forced-interleave probe (`raceFirstIntake`, `withdrawal.spec.ts`), ⛔ the repetition.
  Mobile: pure `lib/death-report-copy.ts`; the withdrawal, address and medical screens and BOTH workplace components (the
  picker, the suggestion question) route their failure through it. ⚠ **A deviation from the letter of DL19 (b), noted:** the
  workplace components resolve the line from `common` (⛔ the `workplace` namespace, whose `$comment` promises ⛔ key there
  names a death or a claim). DL19 (c): ⛔ staff-change path built (the rule is in `deferred-work.md`, recorded at `-424`).
- **Task 4 (AC7, AC9, AC10):** admin helpline — five reason lines + `tellCaller`, the pure `intakeRefusalKey` (contracts RUNTIME
  values), the line derived in the `submitError` expression, `intake.reset()` on a member change; admin helpdesk —
  `erasureErrorText` + the erasure leg FIRST in the `dataRightsError` chain; mobile — `(claim)/cannot-file.tsx`,
  `lib/cannot-file-copy.ts`, the `relationship.tsx` branch (⛔ draft saved), `cannot_file.*` en + hi with
  `$comment.cannot_file`; withdrawal / Life Events lines in `common` with `$comment.death_reported` (Hindi reviewed by BigDev
  2026-10-31 — ⛔ go-live row). `friction-budget.md`: THREE rows (the refused-at-door state; withdrawal refused; direct changes
  refused). `microcopy.yaml`: three files enrolled (a comment in `cannot-file-copy.ts` reworded — the vocabulary gate reads
  "report").
- **Task 5 (AC11–AC13):** N8 live-DB — the in-app export create + download (step-up) for an ACTIVE member with a standing claim;
  the off-portal export request and the staff correction (`delivery-and-correction.spec.ts`). Fences
  `apps/api/tests/unit/erasure-and-death-report-fence.test.ts` (11 cases, a positive control each): two `anonymizeMember(`
  callers, each guarded in its own method; two `member.rtbf_anonymized` EMITTERS (named also only in `state.ts` / `events.ts`);
  ⛔ sentinel WRITE outside `anonymize.ts` (the constant or its literal); the gate SQL — `death-report.ts` ×1,
  `approval-warnings.ts` ×3, `peer-mesh-read.ts` ×1; `death-report.ts`'s imports. DL17 `door-input-fence.test.ts` drives the real
  reducer; its edge set equals DL17's exactly. DL13 comments re-worded (each cites `-423`); ⛔ `**` beside `/` in a JSDoc.
- **DL14 / TR2 — fixtures re-seeded** (through events to an OPEN state — `lock-in`; ⛔ assertion weakened, ⛔ bypass flag):
  domain `integration/_helpers.ts` (NEW `seedOpenMemberStream`), `claim/icp.spec.ts` (5 tests), `claim/nominee-refusal-inheritance.spec.ts`
  (5), `nominee/nominee-history-concurrency.spec.ts` (the two D3 tests, `openForIntake`); API `claims/helpline-claim-intake.spec.ts`
  (`seedMember` → `lock-in`), `claims/claims-intake.spec.ts`, `claims/claim-contact.spec.ts`, `claims/dpdpa-consent.spec.ts`,
  `claims/nominee-bank.spec.ts` (each `pending-fee` seed + `member.vyawastha_shulk_paid`). The API's shared NEW
  `integration/_death-report-fixture.ts` (claim filing through the projector, forced state, the innocence finding, a member at any
  lifecycle state ± moderation) replaces five copies of the nominee-lock helpers. TR3's direct-`anonymizeMember` specs untouched.
  ⚠ **CORRECTED 2026-10-31 (code review round 2, patch 13):** that sentence was wrong — the fixture replaces NONE of them; it ADDS a
  shared copy. `fileClaim` is still defined in `nominee/nominee-lock.spec.ts`, `nominee/nominee-member-link.spec.ts`,
  `nominee/nominee-marks-save.spec.ts`, `known-people/known-people.spec.ts` and `claims/claim-contact.spec.ts`. Consolidating the
  five onto the fixture is a follow-up, not done here.
- **Task 6 — the gate (AC12), reported as it ran.** `pnpm ci:local` on the story DB (:5461): **34 / 36** on the first run. (1)
  `test (unit)` — MINE, FIXED: a Life Events comment spelled the `dpdpa-data-rights` literal, which
  `contracts/tests/member-data-rights-single-literal.test.ts` allows in ONE module; reworded, 3 / 3. The `--continue` re-run then
  showed the mobile workplace render tests red — MINE, FIXED: a bare `useT()` in the two workplace components had ⛔ provider
  under those tests' `lib/workplace-i18n` mock; the `common` line now goes through `useWorkplaceT(…, { namespace: 'common' })`
  (mobile 112 files / 2177 green). A final `--continue` unit pass: 35 / 37 tasks, the two reds 5 s TIMEOUTS / an unfound
  element in files this story does ⛔ touch (`admin` ground-inspection-discrepancy, memorial-review; `mobile`
  nominee-form-link-render) — green alone and in full (admin 86 files / 1550; mobile 2177): the known unit `--concurrency=4`
  oversubscription class. (2) `integration-tests` — ⛔ this story's: `domain` `rls/announcement-activity-read.spec.ts` fails
  ALONE too, because the story DB holds 14 COMMITTED `PARIWAR_A` cycles (`Trustee One`, 7 per full API run, the first at
  04:26 UTC — before this session) that crowd its own seeds out of its newest-two read — the `PARIWAR_A` accumulation class
  (`project_known_livedb_test_failures` #15 shape). ⛔ Touched by this diff. The remedy (recreate `twt-638-pg`) is destructive
  ⇒ BigDev's call, ⛔ taken. Every OTHER integration package green with `--continue`: api 2552 (+1 skipped), jobs 1962,
  domain 6847 / 6849 (the one red above), channels 468, public 807, validity-service 284, niyamavali-engine 144, events 36,
  queue 4. Every other `ci:local` job green, incl. `i18n-parity`, `microcopy`, `friction-budget` (its AC-4 facet is dormant
  until commit — the three ledger rows are in place), `member-state-invariant`, `claim-state-invariant`.
  ⭐ **RESOLVED 2026-10-31 — AC12 MET.** BigDev: *"yes, recreate twt-638-pg and rerun the gate"* ⇒ `docker rm -f -v twt-638-pg`,
  recreated to its inspected config (`postgres:16-alpine`, :5461, DB `twt_dev`; ⚠ now without `--rm`), then `pnpm ci:local`
  (it migrates first): **`ci:local PASSED — 36 job(s) green`**, every turbo task successful (unit 37 / 37, integration 24 / 24) —
  `announcement-activity-read` included. The residue diagnosis is confirmed by the class, ⛔ root-caused per spec (the owing fix
  is a per-test tenant in the specs that commit `PARIWAR_A` cycles — ⛔ this story's).
  ⚠ **SUPERSEDED (code review round 4, patch 10):** that green run was at `e813e5ee`. The review rounds changed the tree after it,
  and each later gate is reported in its own round, run by run: round 2 got 35 / 36, then a unit re-run 37 / 37; round 3 got 35 / 36,
  then the integration job 24 / 24 once the residue aged out (D7). "AC12 MET" holds for `e813e5ee`. The tree since has been
  gated only in split runs.

### File List

**Records (committed with Task 0):** `.decision-log.md` (`-425`, `23ac6f19`); `_bmad-output/implementation-artifacts/deferred-work.md`,
`_bmad-output/implementation-artifacts/sprint-status.yaml` (`bcd51be4`).

**Records (code review rounds 1–3 — committed together, after the code, `2c20ed03`):** this story file; `_bmad-output/implementation-artifacts/deferred-work.md` (D1–D7, on top);
`_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger lines `2026-10-31n` / `o` / `p` / `q`; the row is `review`).
(Corrected at round 4: this line said "D1–D6" and "`n` / `o` / `p`".)

**Records (code review rounds 4–5, and the Panel's ruling `-430`):** `.decision-log.md` (`2026-10-31-430`); this story file;
`_bmad-output/implementation-artifacts/deferred-work.md` (round-4 finding A, DISCHARGED into row 6-39; round-5 D8);
`_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger `2026-10-31r` / `s` / `t`; the row 6-39 comment);
NEW `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-6-38-paid-after-death.md` (written, sent, RULED `-430`).

**New:**
- `packages/domain/src/claim/death-report.ts`, `packages/domain/src/claim/death-report-lock.ts`, `packages/domain/src/claim/intake-door.ts`
- `packages/contracts/src/claims/intake-refusal.ts`, `packages/contracts/tests/claims-intake-refusal.test.ts`
- `packages/domain/tests/integration/claim/death-report.spec.ts`, `packages/domain/tests/integration/claim/intake-door.spec.ts`,
  `packages/domain/tests/integration/member/erasure-intake-race.spec.ts`, `packages/domain/tests/member/door-input-fence.test.ts`
- `apps/api/tests/integration/_death-report-fixture.ts`, `apps/api/tests/unit/erasure-and-death-report-fence.test.ts`
- `apps/mobile/app/(claim)/cannot-file.tsx`, `apps/mobile/lib/cannot-file-copy.ts`, `apps/mobile/lib/death-report-copy.ts`,
  `apps/mobile/tests/unit/cannot-file-copy-resolves.test.ts`, `apps/mobile/tests/unit/death-report-copy-resolves.test.ts`
- `apps/mobile/tests/unit/death-report-refusal-announcements.test.ts` (review patch: executed screen / OTP announcement cases)
- Code review round 2: `packages/domain/tests/member/erasure-lock-keys.test.ts`, `apps/admin/tests/helpdesk-detail-page-erasure.test.tsx`,
  `apps/mobile/tests/unit/death-refusal-claim-screens.test.ts`

**Modified — source:**
- domain: `claim/{nominee-lock,icp,errors,index}.ts`, `member/rtbf-legality.ts`; comments only: `member/{state,anonymize}.ts`,
  `claim/{suspicion-refusal-persist,approval-warnings,peer-mesh-read}.ts`
- contracts: `src/claims/index.ts`
- api: `modules/rtbf/handlers.ts`, `modules/member-data-rights/handlers.ts`, `modules/claims/{claims.service,claims.helpline.handlers}.ts`,
  `modules/withdrawal/handlers.ts`, `modules/life-events/handlers.ts`, `modules/medical/medical.handlers.ts`
- api-client: `src/index.ts` (docstring)
- admin: `modules/helpline-claims/{HelplineClaimPage.tsx,i18n-en.ts}`, `modules/helpdesk/{HelpdeskDetailPage.tsx,i18n-en.ts}`
- mobile: `app/(claim)/relationship.tsx`, `app/(withdrawal)/index.tsx`, `app/(life-events)/{address,medical}.tsx`,
  `components/workplace/{WorkplacePicker,WorkplaceSuggestionQuestion}.tsx`, `lib/workplace-i18n.ts`
- mobile (review patch): `components/life-events/MedicalForm.tsx`
- code review round 2: domain `claim/icp-lock.ts`, `member/rtbf-legality.ts` (lower-case lock keys); admin `modules/helpline-claims/HelplineClaimPage.tsx`
  (`canChangeCaller` + the contracts guard)
- code review round 3: admin `modules/helpline-claims/{HelplineClaimPage.tsx,i18n-en.ts}` (the held-change line + its copy). These
  were filed under "Modified — tests" below until round 4.
- code review round 4: admin `modules/helpline-claims/HelplineClaimPage.tsx` (the live region always mounted),
  `modules/helpdesk/i18n-en.ts` (the erasure-refusal sentence); domain `claim/icp.ts`, `member/rtbf-legality.ts` (comments
  only); api `modules/life-events/handlers.ts` (comment only)
- i18n: `packages/i18n/locales/{en,hi}/{claim,common}.json`
- records: `friction-budget.md`, `microcopy.yaml`

**Modified — tests:**
- domain: `tests/integration/_helpers.ts`, `tests/integration/claim/{icp,nominee-refusal-inheritance,correction-closure}.spec.ts`,
  `tests/integration/nominee/nominee-history-concurrency.spec.ts`
- api: `tests/integration/rtbf/rtbf.spec.ts`, `tests/integration/member-data-rights/delivery-and-correction.spec.ts`,
  `tests/integration/claims/{helpline-claim-intake,claims-intake,claim-contact,dpdpa-consent,nominee-bank}.spec.ts`,
  `tests/integration/{withdrawal/withdrawal,life-events/life-events,medical/medical-disclose,workplaces/workplaces,data-export/data-export}.spec.ts`
- admin: `tests/{helpline-claim-page,helpdesk-responder-console}.test.tsx`
- mobile: `tests/unit/helpline-cta-presence.test.ts`
- code review round 2: domain `tests/integration/claim/{death-report,intake-door}.spec.ts`; api `tests/unit/erasure-and-death-report-fence.test.ts`,
  `tests/integration/_death-report-fixture.ts` (`raceFirstIntake`), and the withdrawal, life-events, medical, rtbf, data-rights and
  helpline-intake specs; admin `tests/helpline-claim-page.test.tsx`; mobile `tests/unit/workplace-suggestion-question.test.ts`
- code review round 3: api `tests/integration/_death-report-fixture.ts` (`sendWhileHolding`; `raceFirstIntake` now a wrapper),
  `tests/unit/erasure-and-death-report-fence.test.ts`, `tests/integration/rtbf/rtbf.spec.ts`,
  `tests/integration/member-data-rights/delivery-and-correction.spec.ts`, comment-only edits to the withdrawal / life-events / medical
  specs; admin `tests/{helpline-claim-page,helpdesk-detail-page-erasure}.test.tsx` (the two SOURCE files once listed here moved
  to "Modified — source", round 4); mobile `tests/unit/death-refusal-claim-screens.test.ts`
- code review round 4: domain `tests/integration/member/erasure-intake-race.spec.ts`; api `tests/integration/_death-report-fixture.ts`,
  `tests/unit/erasure-and-death-report-fence.test.ts`, `tests/integration/{workplaces/workplaces,member-data-rights/delivery-and-correction}.spec.ts`,
  and the waited-assertion messages in the withdrawal, life-events, medical and rtbf specs; admin
  `tests/{helpline-claim-page,helpdesk-responder-console,helpdesk-detail-page-erasure}.test.tsx`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-30 | 1.0 | Story created (`bmad-create-story 6.38`) against `2026-10-30-423`; DL1–DL15 proposed, PQ1–PQ3 identified (non-blocking). |
| 2026-10-31 | 2.0 | `bmad-dev-story 6.38` — Tasks 0–6 built: decision `-425` + records committed first; the leaf predicate, the erasure lock + `acquireErasureLocks`, the claim door (five refusals, once per death, the reason on the helpline wire only, DL16 (a)), the after-death withdrawal / Life Events / medical locks, the operator / Pariwar Admin / app words, the fences (DL15, N1, TR1, DL17), the TR2 fixture re-seeds. Gate: `ci:local` 36 / 36 green on a recreated `twt-638-pg` (BigDev's go-ahead; the one earlier red was `PARIWAR_A` residue). Status → review. |
| 2026-10-31 | 2.1 | Full three-layer code review: one P2 accessibility patch, applied on BigDev's "1"; address / withdrawal / medical refusal errors use `AnnouncedText`. Executed screen tests cover iOS announcements, Android live regions and both OTP retry paths (10 / 10; 26 / 26 with related tests); mobile typecheck and changed-file lint pass. No unresolved review item; story and sprint row → done. Full CI not rerun for the patch; changes uncommitted. |
| 2026-10-31 | 2.2 | Code review round 2 (two chunks — source, then tests; six layers, none failed): 0 decision-needed, 14 patch, 5 defer, 32 dismissed. All 14 patches applied on BigDev's "1" — three were checklist-family-2 REAL GAPS (the `rtbf` lock key hashed the spelling of the ids; the erasure handlers' lock call and the withdrawal / Life Events / medical intake-key lock were pinned by no test: now a fence and forced-interleave probes), each shown to fail under a mutation of the production line. New: `erasure-lock-keys.test.ts`, `helpdesk-detail-page-erasure.test.tsx`, `death-refusal-claim-screens.test.ts`, fixture `raceFirstIntake`. Gate on the final tree: 35 / 36 first run (`test (unit)` = load timeouts in six untouched admin files), the unit job re-run at `--concurrency=2` 37 / 37. Not done: the `WorkplacePicker` save branch is still source-scanned; nothing committed; this round's patch diff is unreviewed. Status → `review`. |
| 2026-10-31 | 2.4 | **COMMITTED locally** (supersedes the "uncommitted" wording in 2.2, 2.3 and the round-2 / round-3 Resolved blocks, which were true when written): the round-1 patch as `85581ad6`; the round-2 and round-3 code and tests as `5a213f79`; these records in the commit that follows. ⛔ Pushed, ⛔ yet through CI on a PR; the round-3 patch diff has ⛔ itself been reviewed (BigDev, after weighing the trade-off, chose to commit). Status stays `review`; `done` follows CI on the PR. |
| 2026-10-31 | 2.5 | Code review round 4 (the full branch, code only, in one pass — BigDev; 5,236 lines; three layers, none failed): 1 decision-needed, 10 patches, 12 dismissed, no HIGH. Decision A (a fee paid after the death opens the door) was ROUTED TO THE PANEL. The note `trustee-panel-routing-note-2026-10-31-6-38-paid-after-death.md` is written but ⛔ sent; it is non-blocking, and it is carried in `deferred-work.md`. All 10 patches were applied on BigDev's "1": the console live region, comments plus a termination leg in the three-party race, a fence that counts parsed calls, two reachable-member fixtures, a fresh-build export leg plus a delivery leg, DELIBERATE blocks, the `sendWhileHolding` diagnostics, the race-spec cleanup, the operator copy, and the records. The targeted tests, typechecks and lint are green; ⛔ `ci:local`. ⛔ Committed, and this round's patch diff is unreviewed. Status stays `review`. |
| 2026-10-31 | 2.6 | Code review round 5 (the round-4 PATCH diff, 536 lines; three layers, none failed): 1 decision-needed, 11 patches, 1 defer (D8), 15 dismissed, ⛔ HIGH. Decision E: the operator's erasure-refusal ending, BigDev's wording "1" (DL11 annotated SUPERSEDED). All 11 patches applied on BigDev's "1". Also: the Panel RULED the round-4 note as `2026-10-31-430` (Q1 B, Q2 A), which supersedes 2.5's "⛔ sent"; row 6-39 grows by the staff date comparison, and this story is ⛔ changed. Targeted tests, typecheck and lint are green; ⛔ `ci:local` before the push. Status stays `review`. |
| 2026-10-31 | 2.3 | Code review round 3 — the round-2 PATCH diff (1,337 lines; three layers, none failed): 0 decision-needed, 8 patch, 2 defer (D6, and D7 found while gating), 8 dismissed. All 8 patches applied on BigDev's "1". **Corrects 2.2:** patches 1, 9 and 14 of round 2 were PARTIAL, not "all 14 applied"; "nothing is committed" was wrong (`HEAD` `e813e5ee` is the committed build; the round-1, -2 and -3 patches are uncommitted); "each fix was shown to fail" now has an item-by-item table (12 of 14 have a production mutation; 6 and 12 (a) cannot). New live proof: an UPPER-case grant waits on the erasure's `rtbf` lock; both erasure routes take the intake key first (forced probes); `sendWhileHolding`; a hardened fence; the console says when it holds a change of caller. Gate on the final tree: run 1 35 / 36 (`integration-tests` red on `announcement-activity-read.spec.ts` = another suite's committed residue in the reused DB, diagnosed and the prediction tested); the integration job re-run once the residue aged out 24 / 24. Not done: the `WorkplacePicker` save branch is still source-scanned; the cleanup paths of `sendWhileHolding` are ⛔ driven by a test; nothing committed; this round's patch diff is unreviewed. Status stays `review`. |
| 2026-10-31 | 1.8 | The three new Hindi strings — the cannot-file body (DL10), the withdrawal refusal (DL18), the Life Events refusal (DL19) — reviewed by BigDev: *"Hindi is fine"*. ⛔ Go-live row needed for any of them. |
| 2026-10-31 | 1.7 | The Panel RULED the note — `2026-10-31-424` (DR + KB: Q1 (a) C, Q1 (b) B, Q2 (a) A, Q2 (b) A + the Panel's addition, Q3 B). Built here: N6 five refusals (`pending-fee` ⇒ `not_paid`); N7 / DL9 / DL10 the general reason to the caller and the app (the app body's Hindi NEW, ⛔ yet reviewed); N9 + DL18 (withdrawal refused) + DL19 (direct changes refused; staff changes never remove the old entry — recorded); AC14 / AC15, Task 3A; TR2 — the `pending-fee` fixtures now break; DL17's edges add `pending-fee`. Q1 (a) C's staff identity check is row `6-39-…`, ⛔ this story's. |
| 2026-10-31 | 1.6 | DL17 added (BigDev: *"yes, add DL17"*), from BigDev's question on a later change to the KYC basis: a reducer-driven fence on every way INTO a state the door refuses (`pending-kyc` ← none; `withdrawn` ← withdrawal from active / grace / lapsed; `anonymized` ← erasure), refused set read from `intake-door.ts`, positive control — AC13, Task 5.5; the Policy-meaning note that a KYC-basis change reopens PQ1 (a). Edge sets checked against the reducer at `01062c51`. |
| 2026-10-31 | 1.5 | How identity is verified today traced (G9a): DigiLocker or a self-declared entry; ⛔ trustee verification step and ⛔ lock-in exit exist, so `pending-valid` is unreachable and ⛔ member becomes `active`. PQ1 (a) re-framed to "an identity nobody has checked" (any state; refusing needs the identity record, ⛔ a switch arm); the note's Q1 (a) rewritten, suggestion A → C; the gap recorded in `deferred-work.md`, observational. |
| 2026-10-31 | 1.4 | Two technicals clarified (BigDev): (1) N4 / AC8 — a TERMINAL standing claim meets the existing mint guards, ⛔ "it mints": `closed` for no response ⇒ 409 re-file confirmation first; `denied` ⇒ mints; `settled` ⇒ mints and is closed in the mint. (2) G1 / DL15 — ⛔ delayed erasure exists (legality read at execution, failed attempts release the key); the fence now pins the ACT (the `member.rtbf_anonymized` emitters and the sentinel writer, incl. `apps/jobs/src`), and the header states the execution-time rule for any future deferred erasure. |
| 2026-10-31 | 1.3 | Task 0.3 done — the routing note `trustee-panel-routing-note-2026-10-31-6-38-door-and-after-death.md` WRITTEN (⛔ sent): Q1 (a) / (b), Q2 (a) / (b), Q3. PQ2 split into (a) / (b); PQ1 (a) is `pending-valid` only (manual-fallback `pending-fee` moves to PQ1 (b); manual-fallback `lock-in` is ⛔ asked — `-423`'s "first days after joining"). The DL10 Hindi confirmed reviewed by BigDev (*"DL10 Hindi is fine"*). |
| 2026-10-31 | 1.2 | Task 0.2 answered — BigDev: *"DL1-DL16 as recommended"* (DL16 (a); the English copy approved; the DL10 Hindi ⛔ yet confirmed as reviewed). |
| 2026-10-31 | 1.1 | Fresh-context validation (`bmad-create-story validate 6.38`): the refusal vocabulary is domain-owned (contracts mirrors it); AC5 split into the two-party and the three-party race, run through the new `acquireErasureLocks` helper, moved to Task 3.6; the reason kept off the member route's wire; N5's audit lines corrected and DL16 added; N8 qualified for withdrawn members; the stale operator alert cleared on a member change; PQ1 split into (a) / (b); TR2 / TR3 re-traced; the friction-budget row, the fences, the test helpers and the omitted `-423` / `-238` text added. |
