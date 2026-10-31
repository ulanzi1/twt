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

Status: ready-for-dev

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
  कोई प्रश्न हो तो कृपया हेल्पलाइन पर कॉल करें।"* (⚠ the BODY is NEW after `-424` — agent-authored, ⛔ yet reviewed; the earlier reviewed
  body is superseded) · *"हेल्पलाइन पर कॉल करें"* · *"वापस जाएँ"* (call + back are the ALREADY-REVIEWED `refile.call` / `refile.back`
  strings, 2026-10-01). ⚠ "call the helpline" is a route to a QUESTION, ⛔ an
  appeal (Q3 B) — the helpline is refused by the same door.
- **DL11 — The Pariwar Admin's words.** `helpdesk.dataRights.erasureRefused.deathReported` in `helpdesk/i18n-en.ts`, shown when the erasure
  error's code is `rtbf.death_reported` (other codes keep `messageOf`): *"This member's data cannot be erased: a claim has been filed for
  their death. The person they nominated may see the record and ask for corrections. It can be erased only if the claim is found to be
  about a member who is alive."* ⛔ Pre-emptive disabling of the button (⛔ read exists that carries the fact; the refusal is the
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
  हेल्पलाइन पर कॉल करें।"* (agent-authored, ⛔ yet reviewed); key in the namespace that screen already uses. ⚠ Unreachable in production
  today (⛔ member can withdraw — G9a); built and tested on a seeded `active` member.
- **DL19 — The member's own direct changes refused while a death report stands; staff changes keep the old entry (`-424` Q2 (b) A, N9).**
  (a) `apps/api/src/modules/life-events/handlers.ts` `assertMemberExistsAndNotTerminal` — the ONE guard of address, posting and the
  answer to a suggested workplace (6.36c) — and the medical guard in `apps/api/src/modules/medical/medical.handlers.ts` (the 3.5 service
  Life Events reuses): take the intake key first, then N1 ⇒ 409 **`life_events.death_reported`** / **`medical.death_reported`**. The
  nominee route is already refused (`nominee.locked_claim_filed`, 6.20) — unchanged. (b) Mobile: the `(life-events)` screens map both
  codes to one calm line — en *"A claim has been filed for this member's death, so these details can no longer be changed here. To ask
  for a correction, please call the helpline."*; hi *"इस सदस्य की मृत्यु के लिए दावा दर्ज हो चुका है, इसलिए ये विवरण अब यहाँ बदले नहीं जा
  सकते। सुधार के लिए कृपया हेल्पलाइन पर कॉल करें।"* (agent-authored, ⛔ yet reviewed). The staff `recordCorrection` (ASK) stays open (N8).
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

- [ ] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [ ] 0.1 `git fetch origin`; confirm `01062c51` is an ancestor of HEAD and re-derive G1–G16 at the tip (`git diff --name-only 01062c51
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
  - [ ] 0.4 Decision entry (AUTHOR-COMMIT, the next free number — `-424` is the Panel's ruling, already recorded): DL1–DL19 as answered;
        cites `-423` and `-424`; ⛔ supersedes a ratified entry. Committed ALONE, first.
  - [ ] 0.5 `deferred-work.md`: (i) DL4 — the release has ⛔ producer until 6-22 (trigger: 6-22's create-story) + the guilty arm 6-22
        OWES (`-238` cl. 4–5) and whether it releases the erasure lock (Q1 (b)'s words cover it) + DL7's two residual edges; (ii) DL12 (ii)
        — the export's step-up does not prove the nominee (trigger: PQ2's answer or any change to `data-export/routes.ts`); (iii) `-423`
        Consequences 2 · 3 — the privacy policy says Q2 A before members agree to it, and counsel on Q1 (a) / Q2 (trigger: go-live of
        member data-rights, or counsel's answer) — or a roster go-live row instead, BigDev's pick; (iv) PQ1–PQ3 — ✅ RULED (`-424`), ⛔ item
        needed; (v) the `-424` Q2 (b) addition (DL19 (c)) — ✅ recorded 2026-10-31 at the ruling. A dated comment line on the `6-22-…` row in
        `sprint-status.yaml`.
  - [ ] 0.6 Ledger line + row `ready-for-dev → in-progress` (prepend safely — [[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [ ] **Task 1 — The leaf predicate (AC1)**
  - [ ] 1.1 Create `packages/domain/src/claim/death-report.ts` (DL1), header citing `-423`, `-238` cl. 1, N1, and the import rule.
  - [ ] 1.2 Delegate `isNomineeDeclarationLocked`; export `isDeathReportStanding` from the `claim` barrel.
  - [ ] 1.3 Live-DB tests (AC1) in `packages/domain/tests/integration/claim/death-report.spec.ts` — seed with `seedClaim(tx, pariwarId, {
        deceasedMemberId, currentState })` (`packages/domain/tests/integration/_helpers.ts`; it sets `app.claim_state_writer`, so every
        state seeds) and the finding as a RAW `claim_nominee_findings` row (`recordMemberInnocenceFinding` replays the claim stream through
        `projectClaimState`, and a `seedClaim` row has ⛔ events).
- [ ] **Task 2 — The erasure lock (AC2–AC4)**
  - [ ] 2.1 `resolveRtbfLegality`: add `pariwarId`, the `death_reported` kind (DL2); `acquireErasureLocks` (DL3); import
        `../claim/death-report.js` and `../claim/icp-lock.js` (the two leaves only — TR1).
  - [ ] 2.2 `rtbf/handlers.ts` `assertAnonymizable` and `member-data-rights/handlers.ts` `fulfilErasure`: `acquireErasureLocks` in place
        of the inline rtbf-key lock (DL3); the exhaustive narrowing on `legality.kind` (DL2); map `death_reported` → 409
        `rtbf.death_reported`. `fulfilErasure`'s idempotency claim is ALREADY released on any throw (`ok = false` + the `finally`) — assert
        it in AC3, ⛔ add code for it. `rtbf/handlers.ts` imports `{ ids, member }` today — add `claim` only if it needs it.
  - [ ] 2.3 Tests: extend `apps/api/tests/integration/rtbf/rtbf.spec.ts` (AC2, AC4 — post `'{}'`, TR8) and
        `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts` (AC3, AC4). Neither has claim helpers: copy
        `fileClaim` / `forceClaimState` / `appendClaimEvent` / `inScope` from `apps/api/tests/integration/nominee/nominee-lock.spec.ts`,
        and its AC11(ii) for the finding — `claim.recordMemberInnocenceFinding(s.client, { claimCaseId, pariwarId, findingId, actorId,
        actorDisplay, actor })`.
- [ ] **Task 3 — The door (AC5–AC8)**
  - [ ] 3.1 Domain vocabulary + contracts mirror (DL6, DL8): `CLAIM_INTAKE_REFUSAL_REASONS` + type in `claim/intake-door.ts`; NEW
        `packages/contracts/src/claims/intake-refusal.ts` with the mirrored tuple + `CLAIM_INTAKE_REFUSED_CODE`; an `export *` line in
        `packages/contracts/src/claims/index.ts`; a lockstep test in `packages/contracts/tests/`. ⛔ `@twt/contracts` import in `@twt/domain`.
  - [ ] 3.2 `claim/intake-door.ts` `resolveClaimIntakeDoor` with the exhaustive switch (N6); `ClaimIntakeRefusedError` in `claim/errors.ts`;
        export both from the `claim` barrel.
  - [ ] 3.3 `tryConverge`: the gate at DL7's position. ⛔ Write before it.
  - [ ] 3.4 `claims.service.ts`: `translateClaimIntakeRefused` in `initiateIntake`'s catch (DL8, TR6), with the helpline-only reason flag
        threaded from each handler; DL16's `resourceLocator` on the helpline catch if BigDev picks (a).
  - [ ] 3.5 Domain unit tests for every lifecycle state × moderation status (the full 9 × 3 = 27 table — five refusals) and the precedence; API live-DB
        tests AC6 (`helpline-claim-intake.spec.ts`), AC7 (`claims-intake.spec.ts` — incl. `details` ABSENT), AC8.
  - [ ] 3.6 The race (AC5 (i) + (ii)) — AFTER 3.3, because "intake refused `erased`" exists only once the door is in `tryConverge`: in
        `packages/domain/tests/integration/member/rtbf-concurrency.spec.ts` or a sibling, CALLING `acquireErasureLocks` and `tryConverge`
        (⛔ a hand copy of the handler sequence — that spec's existing `takeLock` and `members.state` read are ⛔ the pattern to follow
        for the new cases). Run (ii) once with the intake-key lock removed and record that it fails.
- [ ] **Task 3A — The after-death locks (AC14, AC15)**
  - [ ] 3A.1 DL18: `assertWithdrawable` — intake key, N1, 409 `withdrawal.death_reported`; live-DB tests (AC14) incl. the race.
  - [ ] 3A.2 DL19 (a): the Life Events guard + the medical guard — intake key, N1, the two 409s; live-DB tests (AC15).
  - [ ] 3A.3 Mobile: the withdrawal screen + the `(life-events)` screens map the codes to their copy keys (en + hi — the Hindi
        agent-authored, ⛔ yet reviewed: a `$comment` saying NOT YET HUMAN-REVIEWED + a roster go-live row unless BigDev reviews first);
        source-scan tests; `friction-budget.md` rows for both refusals (payer: whoever holds the dead member's account — `-424`'s accepted
        cost); enrol the changed files in `microcopy.yaml` if they are not already.
- [ ] **Task 4 — Words (AC7, AC9, AC10)**
  - [ ] 4.1 Admin helpline (DL9, TR7): keys (five reasons + the general `tellCaller`); the pure `intakeRefusalKey`; the line derived in the `submitError` expression;
        `intake.reset()` in `resetDownstreamState`; RTL tests in `apps/admin/tests/helpline-claim-page.test.tsx` (AC9).
  - [ ] 4.2 Admin helpdesk (DL11): the key; `erasureErrorText` in `HelpdeskDetailPage.tsx`; the erasure leg first in the `dataRightsError`
        chain; its unit test + the Shell test in `apps/admin/tests/helpdesk-responder-console.test.tsx` (AC10).
  - [ ] 4.3 Mobile (DL10): `cannot-file-copy.ts`, `(claim)/cannot-file.tsx`, the `relationship.tsx` branch; keys `cannot_file.*` in
        BOTH `packages/i18n/locales/{en,hi}/claim.json` (parity is a gate) with a `$comment.cannot_file` in both — the title
        reviewed by BigDev (2026-10-31), call + back the reviewed `refile.*` strings, the BODY rewritten after `-424` and ⛔ yet reviewed
        (NOT-YET-HUMAN-REVIEWED form + a roster go-live row, unless BigDev reviews it first); the AC7 source-scan tests. ⭐ **`friction-budget.md` (repo root): a new row — or a 6.38 disposition — for the
        refused-at-door state** (payer: the family of a non-member, or of a mistyped search — `-423` Q3 B's accepted cost; the 6.19c
        re-file-screen row is the precedent); run `pnpm friction:check` before push — `MEMBER_FACING_PREFIXES` includes `apps/mobile/`, so
        without it the gate fails. Enrol `apps/mobile/app/(claim)/cannot-file.tsx` and `apps/mobile/lib/cannot-file-copy.ts` in
        `microcopy.yaml` `code_globs` (6.19c enrolled the refile files). ⚠ The worktree has ⛔ `.expo/types`, so `tsc` does ⛔ check the
        new `/(claim)/cannot-file` href ([[project_mobile_typed_routes_worktree]]) — check the path by hand. ⚠
        [[project_mobile_vitest_and_expo_install_traps]].
- [ ] **Task 5 — Fences, stale text, fixtures (AC11, AC12, AC13)**
  - [ ] 5.1 The N8 live-DB tests (in-app export, off-portal export request, correction — for an `active` member with a standing report).
  - [ ] 5.2 The DL15 + N1 + TR1 source fences — ONE file, `apps/api/tests/unit/erasure-and-death-report-fence.test.ts` (modelled on
        `family-account-reach-fence.test.ts`), each with a positive control.
  - [ ] 5.3 DL13's comment re-wordings ([[project_markdown_emphasis_closes_jsdoc]] — ⛔ `**` adjacent to `/` inside a JSDoc).
  - [ ] 5.4 DL14 fixture re-seeds (TR2) — list each re-seeded file in the Completion Notes.
  - [ ] 5.5 DL17's door-input fence (AC13): export the refused lifecycle states from `claim/intake-door.ts`; the reducer-driven test with
        its positive control.
- [ ] **Task 6 — Gate and records**
  - [ ] 6.1 `pnpm ci:local` on the story's own DB container (AC12 — incl. `friction-budget`, `i18n-parity`). `typecheck` + `lint` per package.
  - [ ] 6.2 Story File List, Completion Notes, Change Log; ledger line; row → `review`.

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

### Debug Log References

### Completion Notes List

- 2026-10-30 (`bmad-create-story 6.38`): the comprehensive developer guide was written from three read-only traces at `01062c51` plus a
  hand re-read of the load-bearing claims. Status ready-for-dev; next is Task 0 (governance first).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-30 | 1.0 | Story created (`bmad-create-story 6.38`) against `2026-10-30-423`; DL1–DL15 proposed, PQ1–PQ3 identified (non-blocking). |
| 2026-10-31 | 1.7 | The Panel RULED the note — `2026-10-31-424` (DR + KB: Q1 (a) C, Q1 (b) B, Q2 (a) A, Q2 (b) A + the Panel's addition, Q3 B). Built here: N6 five refusals (`pending-fee` ⇒ `not_paid`); N7 / DL9 / DL10 the general reason to the caller and the app (the app body's Hindi NEW, ⛔ yet reviewed); N9 + DL18 (withdrawal refused) + DL19 (direct changes refused; staff changes never remove the old entry — recorded); AC14 / AC15, Task 3A; TR2 — the `pending-fee` fixtures now break; DL17's edges add `pending-fee`. Q1 (a) C's staff identity check is row `6-39-…`, ⛔ this story's. |
| 2026-10-31 | 1.6 | DL17 added (BigDev: *"yes, add DL17"*), from BigDev's question on a later change to the KYC basis: a reducer-driven fence on every way INTO a state the door refuses (`pending-kyc` ← none; `withdrawn` ← withdrawal from active / grace / lapsed; `anonymized` ← erasure), refused set read from `intake-door.ts`, positive control — AC13, Task 5.5; the Policy-meaning note that a KYC-basis change reopens PQ1 (a). Edge sets checked against the reducer at `01062c51`. |
| 2026-10-31 | 1.5 | How identity is verified today traced (G9a): DigiLocker or a self-declared entry; ⛔ trustee verification step and ⛔ lock-in exit exist, so `pending-valid` is unreachable and ⛔ member becomes `active`. PQ1 (a) re-framed to "an identity nobody has checked" (any state; refusing needs the identity record, ⛔ a switch arm); the note's Q1 (a) rewritten, suggestion A → C; the gap recorded in `deferred-work.md`, observational. |
| 2026-10-31 | 1.4 | Two technicals clarified (BigDev): (1) N4 / AC8 — a TERMINAL standing claim meets the existing mint guards, ⛔ "it mints": `closed` for no response ⇒ 409 re-file confirmation first; `denied` ⇒ mints; `settled` ⇒ mints and is closed in the mint. (2) G1 / DL15 — ⛔ delayed erasure exists (legality read at execution, failed attempts release the key); the fence now pins the ACT (the `member.rtbf_anonymized` emitters and the sentinel writer, incl. `apps/jobs/src`), and the header states the execution-time rule for any future deferred erasure. |
| 2026-10-31 | 1.3 | Task 0.3 done — the routing note `trustee-panel-routing-note-2026-10-31-6-38-door-and-after-death.md` WRITTEN (⛔ sent): Q1 (a) / (b), Q2 (a) / (b), Q3. PQ2 split into (a) / (b); PQ1 (a) is `pending-valid` only (manual-fallback `pending-fee` moves to PQ1 (b); manual-fallback `lock-in` is ⛔ asked — `-423`'s "first days after joining"). The DL10 Hindi confirmed reviewed by BigDev (*"DL10 Hindi is fine"*). |
| 2026-10-31 | 1.2 | Task 0.2 answered — BigDev: *"DL1-DL16 as recommended"* (DL16 (a); the English copy approved; the DL10 Hindi ⛔ yet confirmed as reviewed). |
| 2026-10-31 | 1.1 | Fresh-context validation (`bmad-create-story validate 6.38`): the refusal vocabulary is domain-owned (contracts mirrors it); AC5 split into the two-party and the three-party race, run through the new `acquireErasureLocks` helper, moved to Task 3.6; the reason kept off the member route's wire; N5's audit lines corrected and DL16 added; N8 qualified for withdrawn members; the stale operator alert cleared on a member change; PQ1 split into (a) / (b); TR2 / TR3 re-traced; the friction-budget row, the fences, the test helpers and the omitted `-423` / `-238` text added. |
