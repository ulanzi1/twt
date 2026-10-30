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

LETTERS: **G** = found facts (G1–G16); **DL** = build decisions (DL1–DL15 — PROPOSED, BigDev answers at Task 0.2); **PQ** = Panel questions
(PQ1–PQ3, non-blocking); **TR** = traps; **AC1–AC12**.
-->

# Story 6.38: Once a Death Is Reported the Member's Record Is ⛔ Never Erased — Unless the Member Is Found Alive — and a Claim for Someone Who Was ⛔ a Member at Death Is Refused at the Door

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled three things on 2026-10-30 (`2026-10-30-423`). **(a)** From the moment a claim
> is filed for a member's death, ⛔ nobody can have that member's record erased — not the member's own account (`POST /api/v1/member/rtbf`),
> not a Pariwar Admin off-portal (`member-data-rights/erasure`) — unless the report is closed because the member is ALIVE. **(b)** The person
> the member nominated may SEE the record and ASK for a correction, ⛔ erase it. **(c)** A claim for someone who, at death, had ⛔ finished
> joining (⛔ identity check — `pending-kyc`), had left (`withdrawn`), had been erased (`anonymized`) or had been removed (terminated —
> the moderation overlay) is REFUSED at the door — on the helpline AND in the app — with ⛔ claim record and ⛔ appeal; the helpline
> operator is shown WHY, so a mistyped member number can be re-checked with the caller before the call ends. This story builds ONE leaf
> predicate ("a death is reported and stands"), puts it in the ONE erasure legality function both routes already share, serialises
> erasure against intake on the intake lock, adds ONE intake door inside the ONE mint path both intakes already share, and gives the
> operator, the Pariwar Admin and the app their words. ⛔ Migration, ⛔ new table, ⛔ new audit type, ⛔ new nominee surface.

**What already ships and this story REUSES — rebuild none of it:**
- `resolveRtbfLegality` (`packages/domain/src/member/rtbf-legality.ts`) — the ONE erasure legality function; its header: *"declared ONCE,
  here… Do not inline a second copy"*. Called by exactly two handlers (G1).
- `isNomineeDeclarationLocked` (`packages/domain/src/claim/nominee-lock.ts`) — the EXACT shape of "a claim was ever filed and ⛔ released
  by an innocence finding", keyed to the durable `claims` row, ⛔ the `account-frozen` overlay (G4).
- `intakeAdvisoryLockKey` (`packages/domain/src/claim/icp-lock.ts`) — a LEAF module (imports only `node:crypto`), the key every intake
  takes; the nominee edit already serialises on it (Story 6.20 D3).
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
| `2026-10-30-423` Q1 (a) A | *"From the moment a claim is filed for the member's death, an erasure request is refused, for good — unless the report is closed as false (Q1 (b))."* Reason: *"the member agreed to how their data is used while they were alive; … no one can withdraw it on their behalf afterwards."* | Trustee-ratified (DR + KB) |
| `-423` Q1 (b) A | *"Once the report is closed because the member is alive, erasure is possible again."* Cost accepted: *"while the false report is open, the member cannot have their data erased."* | Trustee-ratified |
| `-423` Q2 A | *"The person the member nominated … may SEE the record and ask for a CORRECTION, ⛔ erase it"*; the privacy policy changes to say so (BigDev and counsel). | Trustee-ratified |
| `-423` Q3 B | *"A claim for someone who, at their death, had not finished joining (⛔ identity check), had left the Trust, had been removed, or had been erased is refused when it is filed: the helpline tells the caller the claim cannot be filed; ⛔ claim record is kept."* Cost accepted: *"No record and no appeal; a mistyped member number turns a real family away silently."* ⛔ Touched: *"members in their first days after joining, behind on contributions, or suspended"*. | Trustee-ratified (⛔ our suggestion A) |
| `-423` "Our readings — ⛔ NOT RATIFIED" | (1) *"A death is reported"* = a claim FILED; a claim later withdrawn or refused for another reason still counts. (2) *"⛔ recorded"* leaves the staff SECURITY audit line (`claims.helpline.handlers.ts`, *"a probing/invalid id is never audit-silent"*). (3) The mistyped-number cost is MITIGATED by showing the operator WHY. | readings — build on them; challenge ⇒ back to the Panel |
| `-423` Consequence 1 | the build row: (a) both erasure routes; (b) the nominated person's access / correction without erasure; (c) intake refuses at the door — helpline and app — `pending-kyc`, `withdrawn`, `anonymized`, terminated, *"with the reason shown to the operator"*. | the row this story is |
| `-159` cl. 11 | SUPERSEDED IN PART by `-423`: *"a deceased member IS reachable"* / *"RTBF → the name GOES"* no longer hold once a death is reported. *"death → the name STAYS"* is unchanged. | author-commit, superseded in part |
| `-238` cl. 1 · `-241` §6 | a claim against a LIVING member must not lock them for life; the release is the fraud register's INNOCENCE finding (`member_found_innocent`), whose producer is row `6-22` (⛔ built). | Trustee-ratified / author-commit |
| Niyamavali §2.1, §8.4, §8.4a, Part 10 | *"Registration alone does not constitute membership"*; termination ends beneficiary entitlement; *"honours … erasure … subject to lawful retention"*. A rulebook, ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]) — read for the Policy-meaning check only. | ⛔ ratified |

## 📜 Policy meaning (AI-10-1)

**This story INTRODUCES two predicates that gate a member's (or their family's) access to a benefit or a right.**

1. **The erasure lock (`resolveRtbfLegality` gains a conjunct).** *In the member's terms:* **"Once anyone files a claim for your death,
   nobody — not you, your family, the person you nominated, or the Trust's staff — can have your record erased; if you are in fact alive,
   you can ask again once the claim is found to be about a living member."** ⚠ What the member must also be told, because it is TRUE
   today and ⛔ a defect of this story: the "found alive" finding has ⛔ producer until row `6-22` lands, so until then a living member who
   is falsely reported can ⛔ have their record erased at all (DL4). **Checked against the Niyamavali:** Part 10 honours erasure *"subject
   to lawful retention"* — CONSISTENT in kind (a retention exception); whether this retention is lawful is counsel's (`-423`
   Consequence 3), ⛔ the Niyamavali's. ⛔ Clause contradicts it.
2. **The intake door (a new conjunct on who a claim may be filed for).** *In the member's terms:* **"If, when your death is first
   reported, you had never finished your identity check, had left the Trust, had been removed from it, or had had your record erased,
   no claim can be filed for you — the helpline tells your family so on the call and keeps no claim; if you were new, behind on your
   contributions or suspended, a claim is filed as usual and the existing rules decide it."** **Checked against the Niyamavali:** §2.1
   (*"Registration alone does not constitute membership"*) and §8.4 / §8.4a (termination: beneficiary entitlement *"Ended"*) —
   CONSISTENT. Withdrawal and erasure: the Niyamavali is SILENT (⛔ clause found). ⚠ **One mismatch, routed, ⛔ built:** §2.1 also makes
   the FEE a condition of membership, so the Niyamavali alone would refuse `pending-fee` (identity checked, fee unpaid) too; the Panel's
   words name only the identity check ⇒ PQ1, and this story builds the NARROW reading (only `pending-kyc`).

## ⭐ THE INVARIANTS

**N1 — One predicate for "a death is reported and stands".** `isDeathReportStanding(db, pariwarId, memberId)` = a `claims` row exists for
the member as the deceased, in ANY state, that ⛔ `member_found_innocent` finding has released. ONE SQL, in a LEAF module; the nominee lock,
the erasure lock and the intake door all call it. ⛔ A second copy anywhere (AC11's fence).

**N2 — Erasure is refused on BOTH routes while N1 holds.** The refusal lives INSIDE `resolveRtbfLegality` (the one function both handlers
call), ⛔ in either handler. The member's state does ⛔ matter: an `active`, `withdrawn` or terminated member with a standing report is refused
alike. An `anonymized` member still answers `already_anonymized` (nothing left to protect).

**N3 — Erasure and intake serialise on the SAME lock.** Each erasure transaction takes `pg_advisory_xact_lock(intakeAdvisoryLockKey(p, m))`
BEFORE the existing `rtbfAdvisoryLockKey` lock and BEFORE the N1 read; intake already takes it before minting. Intake ⛔ ever takes the
rtbf key ⇒ ⛔ lock-order cycle. Whichever commits first wins: an erasure first ⇒ the intake sees `anonymized` and the door refuses
(`erased`); an intake first ⇒ the erasure sees the claim and is refused.

**N4 — The door is checked ONCE per death, at the first report.** Inside `tryConverge`, under the intake lock: when N1 is FALSE (⛔ claim,
or every claim released as alive) the door decides; when N1 is TRUE the death was already reported while the person passed the door, and
today's flow (converge / idempotent / cross-channel pending / re-file guard) runs UNCHANGED. "At their death" = the state when the death is
first reported (G10: ⛔ death date exists at intake).

**N5 — Refused at the door means ⛔ record.** A refusal writes ⛔ `claims` row, ⛔ `intake_attempts` row, ⛔ `events_log` row, ⛔ new audit
type. It throws BEFORE any write in `tryConverge`. The one line that stays is the EXISTING helpline catch audit
(`helpline_claim.intake_failed`, a staff ACTION — `-423` reading 2), whose text carries the reason CODE only, ⛔ a name.

**N6 — Exactly four refusals, and only these.** `anonymized` ⇒ `erased`; terminated (moderation overlay) ⇒ `removed`; `withdrawn` ⇒ `left`;
`pending-kyc` ⇒ `not_joined`. Checked in that order. Every other lifecycle state (`pending-fee`, `pending-valid`, `lock-in`, `active`,
`active-in-grace`, `lapsed-unpaid`) and `suspended` ⇒ open — the existing rules decide them later (`-423` Q3 *"⛔ Touched"*; PQ1). An
exhaustive `switch` with a `never` arm: a new lifecycle state FAILS TO COMPILE until someone decides it.

**N7 — The operator is told WHY; the caller is told only that it cannot be filed.** The helpline sees one line per reason and is told to read
the number back. The app shows ONE calm message with ⛔ reason (PQ3).

**N8 — See and ask stay OPEN after a death is reported.** The in-app data export (the deceased's session — Ravi mode), the `dpdpa-data-rights`
helpdesk ticket and the staff `recordCorrection` keep working for a member with a standing report — fenced by tests (AC8), so a later
freeze conjunct cannot silently remove what Q2 A grants.

## Found facts (traced at `01062c51`)

- **G1 — Erasure has exactly two call sites, both synchronous.** `apps/api/src/modules/rtbf/handlers.ts` `assertAnonymizable` (→ `confirm`):
  `memberExists` → `pg_advisory_xact_lock(rtbfAdvisoryLockKey)` → `getMemberStateAt(tx, memberId, deps.clock())` →
  `resolveRtbfLegality` → 409 `rtbf.already_anonymized` / `rtbf.invalid_state`; then `anonymizeMember` + `projectMemberState`
  (`member.rtbf_anonymized`) in ONE `openScopeTx`. `apps/api/src/modules/member-data-rights/handlers.ts` `fulfilErasure`: ticket →
  attribution → `claimIdempotency` → `openScopeTxClaimed` → `requireTicketInScope` → `memberExists` → the same advisory lock →
  `getMemberStateAt` → `resolveRtbfLegality` → the same two 409s → `withCompensatingAudit(anonymizeMember + projectMemberState)`.
  `anonymizeMember(` has ⛔ other production caller; ⛔ job runs an erasure later (⛔ grace period).
- **G2 — `resolveRtbfLegality(db, memberId, currentState)`** returns `already_anonymized` | `legal via withdrawn` | `legal via terminated`
  (reads `getCurrentMemberModerationOverlay`, unbounded, on purpose) | `illegal`. ⛔ `pariwarId` parameter, ⛔ claim input. ⛔ Direct unit
  test of the predicate (the race is covered by `packages/domain/tests/integration/member/rtbf-concurrency.spec.ts`).
- **G3 — `claims`** (`packages/domain/migrations/0051_claims-lifecycle.sql`; `packages/domain/src/schema/claims.ts`): `deceased_member_id uuid
  NOT NULL`, index `claims_deceased_member_id_idx`; ⛔ DELETE grant (never row-deleted). `claim_lifecycle_state` includes `denied`,
  `reversed`, `settled`, `closed`; `claim.closed` triggers are only `suspicion_appeal_allowed`, `death_already_finally_approved`. ⛔ Event or
  state means "closed because the member is alive".
- **G4 — The one "alive" fact the code has** is `claim_nominee_findings.kind = 'member_found_innocent'` (`-238` cl. 1: *"a claim filed
  against a LIVING member"*), written by `recordMemberInnocenceFinding` — ⛔ production caller until row
  `6-22-fraud-register-blacklist-instrument-and-identifier-set` lands (`nominee-lock.ts` header; that row is `backlog`).
  `isNomineeDeclarationLocked` is raw SQL with explicit aliases ([[project_epic6_drizzle_correlated_subquery_bug]]); the same
  "⛔ released" filter recurs in `claim/approval-warnings.ts` and `claim/peer-mesh-read.ts` (read-only uses; ⛔ touched here).
- **G5 — Locks.** Erasure: `rtbfAdvisoryLockKey` = sha256 `member.rtbf:${p}:${m}` (`member/rtbf-legality.ts`). Intake:
  `intakeAdvisoryLockKey` = sha256 `${p}:${m}` (`claim/icp-lock.ts`, a leaf). The two keys differ and intake ⛔ locks the `members` row ⇒
  TODAY an erasure and an intake can both commit (READ COMMITTED). The nominee edit's D3 (`acquireNomineeDeclarationLock`) is the precedent:
  the intake key FIRST, then the check.
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
  (`member/moderation/overlay.ts`, unbounded — the bounded variant is unsafe for legality), `MODERATION_STATUSES = ['none','suspended','terminated']`.
  `getCurrentMemberState(db, memberId)` (`member/read.ts`) = the unbounded `events_log` replay (the clock-domain-safe read; ⛔
  `members.state`, a projected cache).
- **G10 — ⛔ death date at intake.** Neither intake request carries one; OCR is the all-null provider; the certificate date arrives at 6.21a
  review ([[project_ocr_v1_always_empty]]) ⇒ the state at the first report stands in for the state at death.
- **G11 — Signup** creates the member at `pending-kyc` with only a phone (`signup.handlers.ts`); the name lives only in
  `member_kyc_profiles` (written at KYC) — hence the blank name the routing note found.
- **G12 — Who reaches the app intake.** `pending-kyc`: yes (a full session at signup). Terminated: yes while `termination_access_block` is
  OFF (default). `withdrawn` / `anonymized`: login and refresh refuse — only a ≤ 15-minute access-token window. The door is in the shared
  core, so all are covered.
- **G13 — The operator's screens.** The lookup is the 4.7 member search (`member-validity/handlers.ts`): it shows the lifecycle `state`
  badge, ⛔ moderation status (a terminated member looks ordinary). `HelplineClaimPage.tsx` `submitIntake` `onError` handles only
  `auth.step_up_required` and `claim.refile_requires_confirmation`; everything else is `messageOf(err)` — the raw server English — in
  `HelplineConsoleShell`'s `<p role="alert">`. Copy: `helpline-claims/i18n-en.ts` (`resolveEn(key)`), English only.
- **G14 — The Pariwar Admin's erasure** button lives in `apps/admin/src/modules/helpdesk/HelpdeskDetailShell.tsx`; refusals render as
  `messageOf(err)` (raw server English) in `HelpdeskDetailPage.tsx`; copy in `helpdesk/i18n-en.ts` (`helpdesk.dataRights.*`).
  ⛔ Admin test exercises the erasure button.
- **G15 — The nominated person (Q2).** ⛔ Separate data-rights nominee exists: the only nomination is the claim nominee (`member_nominees`,
  Story 3.4); `member_nominee_links` (6.36e) grants ⛔ access. The nominee acts through the DECEASED'S own session (Ravi mode — 9.1; the
  `claim_handover` OTP to the nominee's declared mobile gates the claim filing). That session reaches: the data export
  (`data-export/routes.ts` — blocked only for `withdrawn` / `anonymized`; download step-up `data_export`, whose code goes to the
  DECEASED'S mobile), the `dpdpa-data-rights` helpdesk subcategory (`apps/mobile/app/(helpdesk)/new.tsx`), Life Events edits (address
  with ⛔ step-up, posting, medical with `medical_change`), and WITHDRAWAL (`withdrawal/routes.ts`; ⛔ session revoked) — then erasure within
  the 15-minute token window (the routing note's E3 inference: CONFIRMED reachable by trace). The nominee declaration itself is locked
  (6.20). The staff `recordCorrection` (`member-data-rights/handlers.ts`) is a RECORD, ⛔ a profile write; it has ⛔ "who asked" field.
- **G16 — The mobile app has ⛔ erasure screen** (`anonymizeMember` in `packages/api-client` has ⛔ mobile caller); `rtbf.*` copy keys in
  `packages/i18n/locales/{en,hi}/common.json` have ⛔ consumer.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL1 — The leaf predicate.** NEW `packages/domain/src/claim/death-report.ts` exporting `isDeathReportStanding(db: Db, pariwarId: PariwarId,
  memberId: MemberId): Promise<boolean>` — the SQL of `isNomineeDeclarationLocked`, MOVED here unchanged (raw SQL, explicit aliases, the
  explicit `pariwar_id` predicate as well as RLS). It imports ONLY `drizzle-orm`'s `sql`, the `Db` type and id types — ⛔ anything from
  `claim/` (so `member/` may import it — G6). `isNomineeDeclarationLocked` becomes a one-line delegation (its name, signature, header and
  callers unchanged). *Rejected:* a copy of the SQL in `member/` (a second definition of "reported"); importing `nominee-lock.ts` from
  `member/` (it imports `icp.js` and `project.js` — a runtime init cycle typecheck cannot see).
- **DL2 — The erasure refusal.** `resolveRtbfLegality(db, pariwarId, memberId, currentState)` (⭐ `pariwarId` ADDED; both callers have it)
  gains `{ kind: 'death_reported'; fromState }`, checked AFTER `anonymized` → `already_anonymized` and BEFORE the `withdrawn` / terminated
  arms. Both handlers map it to 409 **`rtbf.death_reported`**, message *"Erasure is refused: a claim has been filed for this member's death"*.
  ⛔ Change to the other kinds or codes.
- **DL3 — Serialise (N3).** Both handlers take `SELECT pg_advisory_xact_lock(intakeAdvisoryLockKey(pariwarId, memberId))` immediately BEFORE
  the existing `rtbfAdvisoryLockKey` lock (⛔ advisory lock before it), in the same transaction. Order everywhere: intake key → rtbf key.
- **DL4 — The release is `member_found_innocent`, and nothing else.** It is the only fact the code has that a reported member is alive
  (G4). ⛔ 6.38 builds a "found alive" act — that is the fraud register's (row 6-22). ⚠ Consequence, said plainly: until 6-22 lands, a
  living member wrongly reported can ⛔ have their record erased at all (the same named residual 6.20 carries for the nominee lock).
  Recorded in `deferred-work.md` (trigger: 6-22's create-story) and as a dated comment line on the 6-22 row. ⚠ Also for 6-22: if it
  builds a GUILTY-but-alive arm (a member complicit in a false report), whether that releases the erasure lock is a §0 question THERE
  (⛔ reachable today — ⛔ finding of any kind is written).
- **DL5 — "Filed" = a `claims` row exists** (any state, any closure — `-423` reading 1). An `intake_attempts` row alone ⛔ counts (it
  exists only beside a candidate claim anyway — G7).
- **DL6 — The door.** NEW `packages/domain/src/claim/intake-door.ts`: `resolveClaimIntakeDoor(db, memberId): Promise<{ kind: 'open' } |
  { kind: 'refused'; reason: ClaimIntakeRefusalReason }>`, reading `member.getCurrentMemberState` (unbounded replay — G9) and
  `member.moderation.getCurrentMemberModerationOverlay` (unbounded). Precedence N6. The wire vocabulary lives in contracts:
  `CLAIM_INTAKE_REFUSAL_REASONS = ['erased', 'removed', 'left', 'not_joined'] as const` (+ type), in
  `packages/contracts/src/claims/` beside the helpline contracts, exported from the package index.
- **DL7 — Where the door runs (N4).** In `tryConverge`, after `acquireIntakeLock` and BEFORE `getConvergenceCandidate`:
  `if (!(await isDeathReportStanding(db, p, m))) { const door = await resolveClaimIntakeDoor(db, m); if (door.kind === 'refused') throw new
  ClaimIntakeRefusedError(m, door.reason); }`. ⛔ Gate on `overrideIntakeAttempt` (G7). ⛔ Gate in either handler (one door).
- **DL8 — The 409.** `ClaimIntakeRefusedError` in `claim/errors.ts`; `translateClaimIntakeRefused(err)` in `claims.service.ts`, called in
  `initiateIntake`'s `catch` BEFORE `translateRefileRequiresConfirmation` → `ConflictError('A claim cannot be filed for this member',
  CLAIM_INTAKE_REFUSED_CODE, { reason })`, `CLAIM_INTAKE_REFUSED_CODE = 'claim.intake_refused'` exported from contracts (the
  `REFILE_REQUIRES_CONFIRMATION_CODE` precedent). ⛔ Name, ⛔ member id in the message or details. The helpline catch's existing
  `helpline_claim.intake_failed` line then records `${err.name}: ${err.message}` — the security line `-423` keeps; ⛔ new audit type.
- **DL9 — The operator's words** (`helpline-claims/i18n-en.ts`, keys `helpline.intake.refused.<reason>` + `helpline.intake.refused.readBack`):
  a `intakeRefusalKey(err)` in `HelplineClaimPage.tsx` (the `refusalKey` pattern) picks the line when `err.code === CLAIM_INTAKE_REFUSED_CODE`
  and `details.reason` is one of the four; any other shape keeps today's `messageOf(err)`. Proposed copy (BigDev approves or edits):
  - `not_joined` — *"This member number belongs to someone who never finished joining — their identity check was not done. A claim cannot be filed. Read the member number back to the caller to check it."*
  - `left` — *"This member had left the Trust. A claim cannot be filed. Read the member number back to the caller to check it."*
  - `removed` — *"This member had been removed from the Trust. A claim cannot be filed. Read the member number back to the caller to check it."*
  - `erased` — *"This member's record was erased at their request. A claim cannot be filed. Read the member number back to the caller to check it."*
  - a shared second line under each: *"If the number is right, tell the caller the claim cannot be filed."* — ⛔ "tell them why" (PQ3).
- **DL10 — The app's words.** NEW calm state `apps/mobile/app/(claim)/cannot-file.tsx` (the `refile-helpline.tsx` shape: plain `YStack`,
  ONE labelled container announced on arrival, `<CallHelplineCTA>`, a back button; ⛔ `CLAIM_STEPS`), pure key map
  `apps/mobile/lib/cannot-file-copy.ts` (+ the code constant cross-checked against contracts), routed from `relationship.tsx`'s catch on
  `CLAIM_INTAKE_REFUSED_CODE`. ⛔ Reason shown (N7). Proposed copy — en: title *"A claim cannot be filed"*; body *"We cannot file a claim
  for this member. If you have a question, please call the helpline."*; call *"Call the helpline"*; back *"Go back"*. hi (agent-authored,
  for BigDev's review): *"दावा दर्ज नहीं किया जा सकता"* · *"इस सदस्य के लिए हम दावा दर्ज नहीं कर सकते। कोई प्रश्न हो तो कृपया हेल्पलाइन पर
  कॉल करें।"* · *"हेल्पलाइन पर कॉल करें"* · *"वापस जाएँ"*. ⚠ "call the helpline" is a route to a QUESTION, ⛔ an appeal (Q3 B) — the
  helpline is refused by the same door.
- **DL11 — The Pariwar Admin's words.** `helpdesk.dataRights.erasureRefused.deathReported` in `helpdesk/i18n-en.ts`, shown when the erasure
  error's code is `rtbf.death_reported` (other codes keep `messageOf`): *"This member's data cannot be erased: a claim has been filed for
  their death. The person they nominated may see the record and ask for corrections. It can be erased only if the claim is found to be
  about a member who is alive."* ⛔ Pre-emptive disabling of the button (⛔ read exists that carries the fact; the refusal is the
  control).
- **DL12 — Q2 is built by DL2 + fences, ⛔ a new surface (N8).** SEE = the in-app export via the deceased's session; ASK = the
  `dpdpa-data-rights` ticket + staff `recordCorrection` (a record — "ask, ⛔ edit" holds by construction); ⛔ ERASE = DL2. ⚠ READINGS for
  BigDev (⛔ the Panel's unless challenged): (i) the claim nominee IS the privacy policy's "nominated person" — the only nomination the
  Trust records (BigDev + counsel own the policy wording — `-423` Consequence 2); (ii) the deceased's session holder is ⛔ proven to be the
  nominee for the export (its step-up code goes to the deceased's mobile) — recorded in `deferred-work.md` as a risk, ⛔ built: moving the
  export to the `claim_handover` code would cost a falsely-reported LIVING member their own export with ⛔ release until 6-22 — a cost ⛔
  put to the Panel.
- **DL13 — Stale text re-worded** (comments / docstrings only, ⛔ behaviour): `rtbf-legality.ts` header (the rule text); `member/state.ts`'s
  `member.rtbf_anonymized` arm comment (*"legal from EVERY live state"* — keep the reducer arm BROAD, legality is the predicate's; say the
  death lock lives there; fix its stale *"(`withdrawn` only)"* caller note); `packages/api-client/src/index.ts` `anonymizeMember` docstring
  (already stale); `member/anonymize.ts`'s claim-scrub branch comment (now reachable only for an innocence-released claim). Each cites
  `2026-10-30-423`. The `-159` cl. 11 citations in code cite the name-STAYS half ⇒ ⛔ edited.
- **DL14 — Fixtures follow the door.** Every test that files a claim for a member whose REPLAYED state is a refused one is re-seeded
  through events to an open state (TR2). ⛔ Test is weakened to get green; ⛔ door bypass flag.
- **DL15 — A caller fence for erasure.** A source-scan test asserting `anonymizeMember(` has EXACTLY the two production call sites of G1 and
  that each enclosing handler calls `resolveRtbfLegality` before it — a third caller fails CI until it is reviewed against `-423`.

## Panel questions — NON-BLOCKING (one note, Task 0.3; BigDev sends)

- **PQ1 — "Not finished joining": the identity check only, or the fee too?** The ruled words: *"had not finished joining (⛔ identity
  check)"*. The Niyamavali §2.1 requires KYC AND the fee. Built: only `pending-kyc` refused; `pending-fee` / `pending-valid` OPEN (filed,
  existing rules decide). If the Panel widens, it is one arm of N6's switch.
- **PQ2 — After a death is reported, may the member's account still WITHDRAW the membership or CHANGE the record directly** (address,
  posting, medical declaration — G15), or only ASK for a correction? Q2 A names see + ask; `-423`'s own reason (*"no one can withdraw it
  on their behalf afterwards"*) points at withdrawal too — but the ruled words cover erasure only, so a refusal would WIDEN the ruling.
  Built: unchanged (reachable); a withdrawal after death also ends the nominee's own Ravi-mode access (login refuses `withdrawn`) — the
  harm the note must show.
- **PQ3 — May the helpline tell the caller WHY** (e.g. *"this member left the Trust"*, *"…was removed"*)? A disclosure of a person's
  membership history to a caller. Built: the operator sees why (`-423` reading 3); the copy tells them to say only that the claim cannot
  be filed; the app shows ⛔ reason.

## Acceptance Criteria

1. **AC1 — The leaf predicate (N1, DL1).** `isDeathReportStanding` exists in `claim/death-report.ts`, imports nothing from `claim/`, and
   `isNomineeDeclarationLocked` delegates to it with byte-identical behaviour (its existing 6.20 tests pass UNCHANGED). Live-DB tests: ⛔
   claim ⇒ false; a claim in each of `intake_pending`, `denied`, `closed`, `settled` ⇒ true; a claim + a `member_found_innocent` finding ⇒
   false; two claims, one released ⇒ true; a claim in ANOTHER Pariwar ⇒ false.
2. **AC2 — Erasure refused on the member route (Q1 (a)).** `POST /api/v1/member/rtbf` for a `withdrawn` member with a standing report ⇒ 409
   `rtbf.death_reported`; the member is ⛔ anonymized, ⛔ `member.rtbf_anonymized` event, ⛔ `member_rtbf.completed` audit. The same member
   WITHOUT a claim ⇒ erased as today.
3. **AC3 — Erasure refused off-portal (Q1 (a)).** `POST /api/v1/p/:pariwarId/member-data-rights/erasure` for a TERMINATED member with a
   standing report ⇒ 409 `rtbf.death_reported`; ⛔ anonymization; the idempotency claim is released (a retry gets the same 409). Without a
   claim ⇒ erased as today.
4. **AC4 — The lock lifts only when the member is found alive (Q1 (b), DL4).** With the claim's `member_found_innocent` finding seeded
   (`recordMemberInnocenceFinding`, as 6.20's AC11(ii) does), both routes erase again. A claim `denied` / `closed` / `reversed` / `settled`
   WITHOUT the finding still refuses.
5. **AC5 — Erasure and intake cannot both commit (N3).** A two-client, own-committing race (the `rtbf-concurrency.spec.ts` shape) of an
   erasure and a first intake for the same member ends in EXACTLY one of: {claim minted, erasure refused `rtbf.death_reported`} or {member
   anonymized, intake refused `claim.intake_refused` / `erased`} — ⛔ both, across repeated runs; ⛔ deadlock.
6. **AC6 — The door, helpline (Q3 B).** `POST /api/v1/p/:pariwarId/admin/claims/intake` for a member at `pending-kyc` / `withdrawn` /
   `anonymized` / terminated ⇒ 409 `claim.intake_refused` with `details.reason` = `not_joined` / `left` / `erased` / `removed`; ⛔ `claims`
   row, ⛔ `intake_attempts` row, ⛔ claim event; the existing `helpline_claim.intake_failed` audit line IS written. A member at `pending-fee`,
   `pending-valid`, `lock-in`, `active`, `active-in-grace`, `lapsed-unpaid`, and a SUSPENDED active member ⇒ filed as today. Precedence:
   a terminated `withdrawn` member ⇒ `removed`; an `anonymized` terminated member ⇒ `erased`. An unknown id ⇒ 404 `member.not_found` as
   today.
7. **AC7 — The door, app (Q3 B).** `POST /api/v1/member/claims/intake` (Ravi mode) for a `pending-kyc` member and a terminated member ⇒ the
   same 409 + reason, ⛔ record. The mobile `relationship.tsx` routes that code to `(claim)/cannot-file`; the screen renders the four keys in
   BOTH locales through the real `t()` ([[feedback_stub_must_call_not_transcribe]]), announces once, and shows ⛔ reason.
8. **AC8 — Once per death (N4).** A member with a STANDING report whose state has since become refusable (e.g. terminated after the first
   filing) gets today's flow on a second report (idempotent / cross-channel pending / re-file guard) — ⛔ door refusal. A member whose ONLY
   claim was released by an innocence finding meets the door again on a new report.
9. **AC9 — The operator sees why (`-423` reading 3, DL9).** `apps/admin` RTL test: a 409 `claim.intake_refused` with each reason renders
   that reason's line + the read-back line in the console's alert; an unknown reason or code falls back to today's `messageOf`. ⛔ Raw code
   rendered.
10. **AC10 — The Pariwar Admin sees why (DL11).** `apps/admin` RTL test: a 409 `rtbf.death_reported` on the erasure button renders the
    DL11 line; other erasure errors render as today.
11. **AC11 — See and ask stay open; one definition (N1, N8, DL12, DL15).** Live-DB: for a member with a standing report, the in-app export
    create + download (with its step-up) succeeds, and the staff `recordCorrection` on a `dpdpa-data-rights` ticket succeeds. Source fences:
    the gate SQL (`claims` ⛔ released by `member_found_innocent`) exists ONLY in `death-report.ts` (the read-only
    `approval-warnings.ts` / `peer-mesh-read.ts` filters are named, allow-listed exceptions in the fence); `anonymizeMember(` has exactly the two G1
    production callers, each calling `resolveRtbfLegality` first.
12. **AC12 — ⛔ Regression.** `pnpm ci:local` 36 / 36 green on the story's own database ([[project_prepush_hook_inherits_5432]] —
    `DATABASE_URL=<story port>` on every push); every existing rtbf, member-data-rights, helpline-intake, member-intake, nominee-lock and
    refile test passes (fixtures re-seeded per DL14, ⛔ assertion weakened).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [ ] 0.1 `git fetch origin`; confirm `01062c51` is an ancestor of HEAD and re-derive G1–G16 at the tip (`git diff --name-only 01062c51
        origin/main -- apps packages`); STOP and re-read if any cited function moved. Check `ListAgents` + the branch before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [ ] 0.2 Put DL1–DL15 to BigDev (the copy of DL9 / DL10 / DL11 verbatim, the Hindi for review). Record the answers.
  - [ ] 0.3 Draft ONE routing note from the template (by path, ⛔ copied): `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-38-door-and-after-death.md`
        — PQ1–PQ3, plain-English question first, THE ONE FACT, options with an honest cost on each, evidence LAST. Status: WRITTEN, ⛔
        sent (BigDev sends). Non-blocking: ⛔ gates the build or the merge.
  - [ ] 0.4 Decision entry (AUTHOR-COMMIT, the next free number): DL1–DL15 as answered; names PQ1–PQ3 routed; cites `-423`; ⛔ supersedes
        a ratified entry. Committed ALONE, first.
  - [ ] 0.5 `deferred-work.md`: (i) DL4 — the release has ⛔ producer until 6-22 (trigger: 6-22's create-story) + the guilty-alive §0
        question for 6-22; (ii) DL12 (ii) — the export's step-up does not prove the nominee (trigger: PQ2's answer or any change to
        `data-export/routes.ts`). A dated comment line on the `6-22-…` row in `sprint-status.yaml`.
  - [ ] 0.6 Ledger line + row `ready-for-dev → in-progress` (prepend safely — [[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [ ] **Task 1 — The leaf predicate (AC1)**
  - [ ] 1.1 Create `packages/domain/src/claim/death-report.ts` (DL1), header citing `-423`, `-238` cl. 1, N1, and the import rule.
  - [ ] 1.2 Delegate `isNomineeDeclarationLocked`; export `isDeathReportStanding` from the `claim` barrel.
  - [ ] 1.3 Live-DB tests (AC1) in `packages/domain/tests/integration/claim/death-report.spec.ts`.
- [ ] **Task 2 — The erasure lock (AC2–AC5)**
  - [ ] 2.1 `resolveRtbfLegality`: add `pariwarId`, the `death_reported` kind (DL2); import `../claim/death-report.js` (the leaf only).
  - [ ] 2.2 `rtbf/handlers.ts` `assertAnonymizable` and `member-data-rights/handlers.ts` `fulfilErasure`: the intake-key lock BEFORE the
        rtbf-key lock (DL3); map `death_reported` → 409 `rtbf.death_reported`; in `fulfilErasure` make sure the idempotency claim is
        released on this 409 exactly as on `rtbf.invalid_state`.
  - [ ] 2.3 Tests: extend `apps/api/tests/integration/rtbf/rtbf.spec.ts` (AC2, AC4) and
        `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts` (AC3, AC4); the race (AC5) in
        `packages/domain/tests/integration/member/rtbf-concurrency.spec.ts` or a sibling spec driving the API-level lock order.
- [ ] **Task 3 — The door (AC6–AC8)**
  - [ ] 3.1 Contracts: `CLAIM_INTAKE_REFUSAL_REASONS`, its type, `CLAIM_INTAKE_REFUSED_CODE` (DL6, DL8); export from the index.
  - [ ] 3.2 `claim/intake-door.ts` `resolveClaimIntakeDoor` with the exhaustive switch (N6); `ClaimIntakeRefusedError` in `claim/errors.ts`.
  - [ ] 3.3 `tryConverge`: the gate at DL7's position. ⛔ Write before it.
  - [ ] 3.4 `claims.service.ts`: `translateClaimIntakeRefused` in `initiateIntake`'s catch (DL8).
  - [ ] 3.5 Domain unit tests for every lifecycle state × moderation status (the full 9 × 3 table) and the precedence; API live-DB tests
        AC6 (`helpline-claim-intake.spec.ts`), AC7 (`claims-intake.spec.ts`), AC8.
- [ ] **Task 4 — Words (AC7, AC9, AC10)**
  - [ ] 4.1 Admin helpline: keys + `intakeRefusalKey` (DL9); RTL test in `apps/admin/tests/helpline-claim-page.test.tsx`.
  - [ ] 4.2 Admin helpdesk: the DL11 key + the code check in `HelpdeskDetailPage.tsx`; RTL test (new, the erasure button has none).
  - [ ] 4.3 Mobile: `cannot-file-copy.ts`, `(claim)/cannot-file.tsx`, the `relationship.tsx` route; keys in
        `packages/i18n/locales/{en,hi}/claim.json` with a `$comment.cannot_file` naming who reviewed the Hindi; real-`t()` test in both
        locales; the code constant cross-checked against `@twt/contracts` (the refile precedent). ⚠ [[project_mobile_vitest_and_expo_install_traps]].
- [ ] **Task 5 — Fences, stale text, fixtures (AC11, AC12)**
  - [ ] 5.1 The N8 live-DB tests (export + correction for a standing report).
  - [ ] 5.2 The DL15 + N1 source fences (one test file, `packages/domain/tests/claim/death-report-fence.test.ts` or the api tests).
  - [ ] 5.3 DL13's comment re-wordings ([[project_markdown_emphasis_closes_jsdoc]] — ⛔ `**` adjacent to `/` inside a JSDoc).
  - [ ] 5.4 DL14 fixture re-seeds (TR2) — list each re-seeded file in the Completion Notes.
- [ ] **Task 6 — Gate and records**
  - [ ] 6.1 `pnpm ci:local` on the story's own DB container (AC12). `typecheck` + `lint` per package.
  - [ ] 6.2 Story File List, Completion Notes, Change Log; ledger line; row → `review`.

## Dev Notes

### Traps

- **TR1 — The import cycle.** `member/rtbf-legality.ts` may import `../claim/death-report.js` ONLY; if `death-report.ts` ever imports from
  `claim/` (even a type re-export through `icp.ts`), the domain package acquires a runtime init cycle that typecheck cannot see
  ([[project_type_only_import_cycle_trap]]). The fence in Task 5.2 can assert the leaf's import list.
- **TR2 — Fixtures replay to `pending-kyc`.** The door reads the EVENT REPLAY (G9). `apps/api/tests/integration/claims/helpline-claim-intake.spec.ts`'s
  `seedMember` seeds `pending-kyc` ⇒ every existing helpline test starts refusing — re-seed to `active` (or `lock-in`) through events.
  `suspicion-refusal-routes.spec.ts`, `one-payment-per-death-routes.spec.ts`, `correction-closure.spec.ts` and
  `_nominee-name-check-fixture.ts` raw-`INSERT INTO members … 'active'` with ⛔ events ⇒ they REPLAY to `pending-kyc` and are refused — add
  the lifecycle events (the `project(...)` helper `rtbf.spec.ts` uses). Grep every `tryConverge` / `initiateIntake` / intake-route test
  for its member seed before the first run; `nominee-bank`, `claim-contact`, `dpdpa-consent`, `claims-intake` seed `pending-fee` via
  events (open) — unaffected.
- **TR3 — The claim-side erasure specs** (`packages/domain/tests/integration/claim/{ground-inspection,death-certificate,peer-mesh-reply,approval-warnings}-rtbf.spec.ts`)
  seed a claim for an erased member by calling `anonymizeMember` DIRECTLY (⛔ the routes). They stay green and stay VALUABLE as
  defence-in-depth (a pre-6.38 row, or an innocence-released claim, can still meet an erased member) — ⛔ delete them; re-word their headers
  if they claim the scenario is ordinary.
- **TR4 — The drizzle correlated-subquery tautology.** Keep the moved SQL raw with explicit aliases
  ([[project_epic6_drizzle_correlated_subquery_bug]]).
- **TR5 — Clock domain.** Read state with the UNBOUNDED replay (`getCurrentMemberState`) and the unbounded overlay — ⛔ `getMemberStateAt(…,
  deps.clock())` for the door (the erasure handlers' existing `getMemberStateAt` call is ⛔ this story's to change).
- **TR6 — 409 ordering in `initiateIntake`'s catch.** `translateClaimIntakeRefused` must run BEFORE the `ClaimStreamConcurrencyError`
  backstop; it is a no-op for any other error.
- **TR7 — The admin helpline's error union.** `submitIntake`'s `onError` special-cases two codes by name; add the third the same way and
  keep `messageOf` as the fallback — ⛔ a blanket switch that hides future codes.
- **TR8 — Fastify empty body.** The rtbf confirm body is `{}` strict — tests post `'{}'` ([[project_fastify_empty_json_body_400]]).
- **TR9 — Live-DB hygiene.** Own DB container named `twt_dev`; known failures #13–#15 ([[project_known_livedb_test_failures]]);
  separate transactions for ordering ([[project_db_clock_ordering_tests_tie]]); every `git push` prefixed with the story's `DATABASE_URL`.

### What this story does ⛔ do

⛔ A "found alive" closure (6-22's); ⛔ a separate data-rights nominee; ⛔ moderation status in the 4.7 search results; ⛔ disabling the
admin erasure button pre-emptively; ⛔ a refusal of withdrawal or of direct edits after death (PQ2); ⛔ telling the caller why (PQ3); ⛔
refusing `pending-fee` / `pending-valid` (PQ1); ⛔ any change to living members' erasure; ⛔ backfill of existing claims (⛔ member uses the
system — `-423` "What is at stake"); ⛔ the privacy policy (outside this repository — BigDev and counsel).

### Project Structure Notes

- Domain: `packages/domain/src/claim/{death-report,intake-door}.ts` (NEW), `claim/{nominee-lock,icp,errors}.ts`,
  `claim/index.ts` (barrel), `member/rtbf-legality.ts`, `member/state.ts` (comment), `member/anonymize.ts` (comment).
- Contracts: `packages/contracts/src/claims/` (the reasons + code), the package index.
- API: `apps/api/src/modules/rtbf/handlers.ts`, `apps/api/src/modules/member-data-rights/handlers.ts`,
  `apps/api/src/modules/claims/claims.service.ts`.
- Admin: `apps/admin/src/modules/helpline-claims/{HelplineClaimPage.tsx,i18n-en.ts}`, `apps/admin/src/modules/helpdesk/{HelpdeskDetailPage.tsx,i18n-en.ts}`.
- Mobile: `apps/mobile/app/(claim)/{cannot-file,relationship}.tsx`, `apps/mobile/lib/cannot-file-copy.ts`; i18n `packages/i18n/locales/{en,hi}/claim.json`.
- API client: `packages/api-client/src/index.ts` (docstring only).
- ⛔ Migration: every table and index needed exists (`claims_deceased_member_id_idx`, `claim_nominee_findings`'s unique per claim).
- Hand-format (Prettier is ⛔ enforced — [[project_prettier_not_enforced]]); ESLint cwd-relative ([[project_eslint_config_per_package_cwd]]).

### References

- `.decision-log.md` — `2026-10-30-423` (the ruling, the readings, Consequences); `2026-08-24-159` cl. 11; `2026-09-21-238` cl. 1; `2026-09-21-241` §6.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-30-erasure-after-a-death-is-reported.md` — Q1–Q3 as put; E3 (the code as traced).
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
