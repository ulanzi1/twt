---
baseline_commit: 3d6b46c5
---

<!--
PINNED: `3d6b46c5` = `origin/main` (`git fetch origin` 2026-11-01 — Story 12.1 landed, PR #318). The traces ran at `beae5116` and were
re-run at `3d6b46c5` by five read-only verifiers on 2026-11-01 (governance + records; the claim / finding substrate; moderation, RBAC and
sign-up; schema / erasure / events / surfaces; the footgun catalogue), each critical re-read by hand. Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/6-22-fraud-register-blacklist-instrument-and-identifier-set`, branch
`story/6-22-fraud-register-blacklist-instrument-and-identifier-set`. Its upstream is UNSET — it does NOT track `origin/main`; push with an
explicit refspec ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — the main checkout was not switched).
Re-locate every code claim by FUNCTION, not by line number — line numbers rot.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the BEHAVIOUR is
the Panel's and is RULED — `2026-09-21-238` (the release; blacklisting; two outcomes only), `2026-09-21-240` (what is kept, how far the ban
reaches, who imposes and lifts), `2026-09-28-261` D3 A (the lock is lifted ONLY by the investigation's finding), `-262` FQ4 (go-live may
precede the release). WHAT this story builds, WHERE the record lives and WHO holds each key are the AUTHOR's (DL — BigDev at Task 0.2).
Six edges the ruled words do not decide — or that this build NARROWS — are the Panel's: PQ1–PQ6 in ONE note (Task 0.3). PQ1 is a DECLARED
NARROWING carried from 6.38 and is a GO-LIVE condition for the guilty arm; PQ3–PQ6 are asked now so row `6-22d` is built on rulings.
⚠ The IDENTIFIER SET (`-238` cl. 6 — PAN and Aadhaar of nominee and claimant) is COUNSEL-GATED and counsel has not been asked (G15) — this
story does not build it (DL0).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. Where a negation decides what the dev builds, the
sentence is written in plain words. No `file:NNN` into `.decision-log.md`, `deferred-work.md`, `sprint-status.yaml` or
`inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or the row key. Bare `DLn` means THIS
story's; another story's is written `6.38 DL7`, `6.20 D8`.

NUMBERS: not claimed by this file. "Anywhere" means EVERY branch and worktree (`git for-each-ref refs/heads refs/remotes` + each worktree's
dirty tree), not `main` alone. At 2026-11-01: `main` holds decision `-430`, ledger `2026-11-01a`, migration `0193_marketplace-modules`
(journal idx 193), permission catalog v56 / 74 keys / 13 bundles, `CLAIM_EVENT_TYPES` 37, `MEMBER_EVENT_TYPES` 24. ⚠ Siblings hold or
RESERVE more: `story/11b-5a-…` decisions to `-432`, migrations to `0194`; `story/13-2-…` and `story/14-3-…` ledger `2026-11-01c` (both — they
collide with each other), decision `-433` and migration `0195` reserved (also by `12-2`'s untracked story file; `12-2` plans `0196`);
`14-3` also reserves catalog v57 and roster Row 46; `story/6-39-…` proposes v57, `CLAIM_EVENT_TYPES` 38, migrations "≥ `0194`" and Row 46.
This file's validate ledger is `2026-11-01d`. ⇒ Every number this story takes (decision entry, migrations, catalog bump, event counts,
roster row) is "the next free one" at the commit that takes it — READ LIVE then, across branches (TR10).

LETTERS: **G** = found facts (G1–G19); **DL** = build decisions (DL0–DL17 — PROPOSED, BigDev answers at Task 0.2; DL0's split is ANSWERED);
**PQ** = Panel questions (PQ1–PQ6) + **TL** = lines the note TELLS the Panel (TL1–TL3); **TR** = traps (TR1–TR14); **AC1–AC14**.
-->

# Story 6.22: The Fraud Register, First Half — Staff Investigate a Death Claim Filed Against a Living Member; an Innocent Member Is Released at Once and the False Claim Is Closed

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled on 2026-09-21 that a death claim filed against a member who is **alive**
> must not lock that member for life: an **investigation** finds the member **innocent** or **guilty**, and there is no third outcome
> (`-238` cl. 1, cl. 4). Innocent ⇒ the member is released **immediately**. Guilty ⇒ the member is **terminated and blacklisted** through a
> chain the Panel set: the operator **flags**, the District Admin **verifies**, the Pariwar Admin **refers**, the **State Trustee imposes**,
> the **Super Admin may lift** (`-238` cl. 3 as amended by `-240` cl. 5). Three shipped stories have built locks that wait on that finding,
> and nothing writes it yet: 6.20's nominee lock, 6.38's erasure / withdrawal / Life Events locks (one leaf predicate,
> `isDeathReportStanding`), and the peer-mesh anchor (`-339` / `-340`). Today a living member wrongly reported dead is frozen out of all of
> them with no way out. **This story builds the investigation up to and including its finding**: the flag (helpline operator and District
> Admin), the District Admin's finding — which requires that the member was confirmed ALIVE — the release (the existing writer, hardened),
> the false claim CLOSED through the shipped closure core, and the guilty finding RECORDED (the claim closed, the member's locks kept).
> **It does not build** the refer → impose → lift chain, the termination or the ban (row `6-22d`), the identifier set, filer bans and the
> `-240` cl. 1 deletion (row `6-22b`, counsel-gated), or the disqualified-nominee ladder (row `6-22c`) — DL0.

**What already ships and this story REUSES — rebuild none of it:**
- `claim_nominee_findings` (migration `0119`, `packages/domain/src/schema/claim_nominee_findings.ts`) — `kind` is a TEXT column with a
  CHECK (not a pgEnum): `member_found_innocent` | `nominee_disqualified`; ONE innocence finding per claim (partial unique index
  `claim_nominee_findings_one_innocence_per_claim_uq`), append-only (GRANT SELECT, INSERT), RLS enabled + forced. Its header: *"THE PRODUCER
  OF THESE ROWS IS ROW `6-22` … ⛔ NOT BUILT."* (G1).
- `recordMemberInnocenceFinding(client, input)` (`packages/domain/src/claim/nominee-lock.ts`) — locks the claim row, inserts the finding,
  emits the identity annotation `claim.nominee_lock_released` through `projectClaimState` (`trigger: 'fraud_register_innocence_finding'` —
  a free `z.string()`, `finding_id`). No production caller (G1). It carries four defects this story owes (G2).
- `isDeathReportStanding(db, pariwarId, memberId)` (`packages/domain/src/claim/death-report.ts`) — the ONE leaf predicate: a claim names
  the member as deceased and no `member_found_innocent` finding has released THAT claim. Its consumers lift TOGETHER on the finding (G3).
  Do not change it (N3; PQ1 is built on the unchanged side).
- `intakeAdvisoryLockKey` (`packages/domain/src/claim/icp-lock.ts`, re-exported by `claim/icp.ts`) and `lockAndReadDeathReport`
  (`claim/death-report-lock.ts`) — the lock order every death-report writer keeps: the intake advisory lock FIRST, both ids lower-cased
  (6.38 R2 P1).
- **The closure core** (`packages/domain/src/claim/suspicion-refusal-persist.ts`) — `claim.closed` is emitted ONLY through it
  (`closeLockedClaim`, private; exported entry points `closeClaimsHeldBySuspicionAppeal`, `closeClaimsOfPaidDeath`,
  `closeClaimIfDeathPaid`). It takes the keys intake → `appealAdvisoryLockKey` → `r9VotingAdvisoryLockKey` →
  `stateTrusteeDecisionAdvisoryLockKey` → the claim row (the "Trap 8 / 40P01" order) and runs `endLiveProcesses` (closes an open appeal
  journey; supersedes a live Stage-2 panel session, a live R9 session and its `routed_to_r9` row, a live correction return; ends an open
  correction run) (G5).
- The verifier console (`apps/admin/src/routes/VerifierConsoleRoute.tsx`, `modules/claim-verification/*`; key `claim.verify`, district
  dimension — `district_admin` holds it, `helpline_operator` does NOT) and the helpline console (`apps/admin/src/modules/helpline-claims`).
  `DeathCertificateReviewControl.tsx` is the FORM template (nothing pre-selected, textarea note, `role="alert"` errors, always-mounted
  `role="status"`; it has NO step-up). `HelplineClaimPage` is the STEP-UP template (catches `auth.step_up_required`, shows the step-up panel
  via `useRequestStepUp` / `useVerifyStepUp`).
- The death-report race fixtures (`apps/api/tests/integration/_death-report-fixture.ts`): `sendWhileHolding(t, key, send, whileWaiting?,
  timeoutMs = 4000)`, `raceFirstIntake(t, pariwarId, memberId, send, timeoutMs?)`, `seedLifecycleMember(t, { pariwarId })`, `findInnocent`
  — the house tools that prove a lock by a test that FAILS without it (6.38 R2 P2/P3).

## Story

As **a member who has been wrongly reported dead, and the helpline operator and District Admin who look into such a report**,
I want **a recorded investigation that ends in one of the two findings the Panel ruled — and only once the member has been confirmed alive:
innocent, which releases every lock on the member at once and closes the false claim; or guilty, which closes the false claim and records
the finding the Pariwar Admin will later refer**,
so that **a living member is no longer frozen out of their own record for ever by someone else's lie, and no claim is ever paid on a death
that did not happen**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-09-21-238` cl. 1 | *"A claim filed against a member who is **alive** does ⛔ not lock that member's declaration for life. On investigation finding the member **innocent**, the declaration **unlocks immediately**."* | Trustee-ratified (DR + KB) |
| `-238` cl. 2 | *"BLACKLISTING IS A NEW SANCTION, ABOVE TERMINATION. It means **never joining or re-joining**. **Indefinite.** **⛔ Not appealable.** The **Super Admin may lift it.**"* | Trustee-ratified ⇒ `6-22d` |
| `-238` cl. 4 · cl. 5 | *"TWO OUTCOMES ONLY. An investigation finds the member **innocent** or **guilty**. ⛔ No third outcome."* · guilty ⇒ *"terminated and blacklisted … along with nominee and claimant (if nominee and claimant are different person)"*. | Trustee-ratified — cl. 4 here; cl. 5 ⇒ `6-22d` (member) / `6-22b` (filers) |
| `-238` cl. 3 (as amended) | *"operator flags → District Admin verifies and confirms → escalate to Pariwar Admin → ~~Pariwar Admin imposes~~"* — only the last step REPLACED by `-240` cl. 5 (*"it replaces that step"*). Kept, not re-read ([[feedback_supersede_never_reinterpret]]). | Trustee-ratified, partly superseded |
| `-238` cl. 6 + COUNSEL GATE | *"PAN and Aadhaar of nominee and claimant are to be collected on the filing form and 'will be served as unique identifier'."* — *"WHAT IS COUNSEL-GATED … The whole identifier set of cl.6 … ⛔ MUST NOT BE BUILT BEFORE IT CLEARS"*: (a) §17(1)(c) indefinite retention about NON-members, (b) a UID token obtainable at all, (c) Aadhaar Data Vault obligations. | Trustee-ratified; ⚠ counsel-gated — not cleared (G15) ⇒ `6-22b` |
| `-238` "narrows §8.8" | *"a member may appeal the termination and ⛔ **not** the exclusion flowing from the same finding … The **Super Admin lift** is the only remedy."* | Trustee-ratified (named narrowing) ⇒ `6-22d` |
| `-238` NOT covered | (i) whether the **nominee** is blacklisted automatically or only on a finding they conspired; (ii) how a NON-member is sanctioned — *"The blacklist must therefore key on an identifier, ⛔ not on `member_id`"*; (iii) who may originate the flag. | not ruled — (i) is PQ2; (ii) `6-22b`; (iii) DL4 |
| `2026-09-21-240` cl. 1 | *"RETENTION — only the guilty are kept … where a claim closes with ⛔ **no** finding of fraud they are **deleted**."* · *"the register holds the guilty, ⛔ never everyone who ever claimed"*. | Trustee-ratified — nothing to delete today (G14) ⇒ `6-22b` |
| `-240` cl. 2 · cl. 3 | REACH — *"filers only … A banned person named as someone's nominee is caught **at the moment they come forward to claim**"*. WHAT MAY BAR — *"Only an **exact** identifier (PAN, Aadhaar token) may bar automatically. A match on **name / date of birth / father's name** raises a **review a human must confirm** — it ⛔ never bars on its own."* | Trustee-ratified — cl. 3 decides PQ3 (`6-22d`) |
| `-240` cl. 4 | *"Two nominees and **one** involved ⇒ **the other receives the whole amount**. Where ⛔ **no** honest nominee remains … the **State Trustee** may authorise payment to a person who produces **proof of succession**."* | Trustee-ratified ⇒ `6-22c` |
| `-240` cl. 5 | *"THE BAN IS TRUST-WIDE, AND IMPOSED ONE LEVEL UP. The Pariwar Admin **refers**; the **State Trustee imposes**; the **Super Admin may lift**. ⛔ The Pariwar Admin ⛔ no longer imposes it."* + why: *"a Super Admin who both imposes and lifts leaves the lift checking ⛔ nothing."* | Trustee-ratified ⇒ `6-22d` (PQ5, PQ6) |
| `-240` cl. 6 | *"refusal now, a ban only on a finding … a lifetime ban follows **only** after the same investigation required for a faked death."* | Trustee-ratified (the post-death-rewrite case — the member is dead, the guilty are filers ⇒ `6-22b`) |
| `-240` Consequence 5 | *"A `state_trustee`-imposed route is RANK-ORDER BLOCKED in this codebase … the imposing route ⛔ cannot simply be gated on that role."* | ratified consequence ⇒ PQ5 |
| `2026-09-21-241` §6 · Consequence 3 | *"Story 6.20 builds the **unlock mechanism and its outcome**; the **finding that fires it arrives from `6-22`**."* · *"`6-22` … owes 6.20 the innocent/guilty finding that drives the release route."* | author-commit (6.20) |
| `2026-09-28-261` D3 A · N2 | *"WAIT FOR THE FRAUD REGISTER. A living member locked by a wrong claim is unlocked only by the investigation's finding … Our reading (B — let staff record 'this member is alive' now) was ⛔ NOT TAKEN."* · N2: *"`other` … ⛔ does not block the living member's unlocking"*. | Trustee-ratified — ⚠ the finding must be an INVESTIGATION's (N1) |
| `2026-09-28-262` FQ4 | *"GO-LIVE MAY GO AHEAD BEFORE A WRONGLY LOCKED LIVING MEMBER CAN BE UNLOCKED."* | Trustee-ratified ⇒ this story is not a go-live condition for the release |
| `2026-10-16-339` RF1 C · `-340` | *"The first filing counts, unless an investigation found the member innocent of a claim filed while they were alive."* · the anchor excludes a claim carrying `member_found_innocent`. | Trustee-ratified · author-commit — readers that START working when this lands |
| `2026-10-10-311` PM1 (+ the row's 2026-10-12 pointer) | members *"with a claim filed for their own death"* are filtered from the five; *"⚠ The exclusion STAYS even after such a release — a known residual; whoever builds this row's release decides whether the peer-mesh exclusion follows it."* | author-commit ⇒ DL11 |
| `2026-10-30-423` Q1 (b) A | *"**A false report.** Once the report is closed because the member is alive, erasure is possible again."* | Trustee-ratified ⇒ PQ1 (the guilty arm narrows it) |
| `2026-10-31-424` Q2 (a) A + reading | withdrawal *"lifted on the same terms as erasure"*; reading (not ratified): *"the report closed because the member is alive" = the fraud register's innocence finding … `-238` cl. 4's GUILTY arm is 6-22's to put.* | Trustee-ratified + reading |
| `2026-10-31-425` 6.38 DL4 · 6.38 DL7 · DL12 (ii) | *"Releasing on INNOCENCE ONLY narrows `-423` Q1 (b)'s 'closed because the member is alive' (a guilty-but-alive finding) — 6-22 must put that to the Panel or justify it."* · two residual edges (a released claim still a convergence candidate; `overrideIntakeAttempt` with no door). · the export's step-up does not prove the nominee. | author-commit (6.38) ⇒ PQ1, DL9 |
| `2026-09-25-243` cl. 1 · cl. 2 | *"A DEATH CERTIFICATE IS ⛔ NOT AN IDENTITY DOCUMENT within `-240` cl.1"* · kept *"for as long as claim records are kept"*. | Trustee-ratified ⇒ `6-22b`'s deletion must exclude it (the cascade trap, G14) |
| `-195` cl. 2 | permission keys are minted only in a governance (author-commit) decision. | ratified ⇒ Task 0.4 |
| Niyamavali §8.8 (ratified by `-121` Q2B) · §8.4 · §8.5 · §2.5 | §8.8 *"each is separately appealable"* — ratified; §8.4 termination *"subject to the [[12-month]] rejoin lock"*; §8.5 grounds 1–3 *"Forged documents … Identity fraud … Financial fraud"*; §2.5 the re-join lock's key is an *"Aadhaar HMAC"* (the code uses a MOBILE blind index). "Blacklist" / "ban" appear nowhere. Apart from §8.8, a rulebook, not ratified ([[feedback_niyamavali_rulebook_not_spec]]). | §8.8 ratified; the rest the Policy-meaning check only |

## 📜 Policy meaning (AI-10-1)

**This story gives a shipped, inert predicate its first producer (1), keeps a declared narrowing of it (2), introduces a predicate that ends
a family's claim (3), and changes one selection predicate (4). The ban at joining is NOT built here — its Policy-meaning note is owed by
row `6-22d`.**

1. **The release (shipped by 6.20 / 6.38; this story writes its first finding).** *In the member's terms:* **"If someone reports you dead
   while you are alive, your record stays locked — you cannot change your nominees, your address or your posting, leave the Trust or have
   your data erased — until the District Admin, having confirmed you are alive and looked into the report, records that you were not part
   of it; from that moment all of it unlocks at once and the false claim is closed."**
   - ⚠ *Also true:* EVERY claim filed about you needs its own finding — a second false report keeps you locked until it, too, is looked
     into (the predicate is "ANY standing report", G3); and your account stays marked frozen while any other claim for your death is still
     open (G5).
   - ⚠ *Also true:* "unlocked" means the ordinary rules apply again — e.g. an `active` member still cannot have their data erased (TR1).
2. **A member found GUILTY stays locked (6.38's declared narrowing, kept — PQ1).** *In the member's terms:* **"If the investigation finds you
   took part in a false report of your own death, the claim is closed but your record stays locked: you cannot leave the Trust or have your
   data erased."** This NARROWS `-423` Q1 (b) (*"closed because the member is alive"*) and `-424` Q2 (a); it is declared in Task 0.4, put to
   the Panel as PQ1, and is a go-live condition for the guilty arm.
3. **A claim closed because the member is alive (NEW).** *In the claimant's terms:* **"If the Trust's investigation confirms the person your
   claim names is alive, your claim is closed; the app does not tell you, and the closure cannot be appealed."**
4. **Peer-mesh selection (CHANGED — DL11).** *In the member's terms:* **"If you were wrongly reported dead and found innocent, you can again
   be one of the five people asked to confirm a colleague's death."** (Only peer-mesh: "People who know me" and nominee links still treat
   you as reported — a named residual, DL11.)

**Checked against the Niyamavali** (the git-ignored copy in the main checkout, `docs/legal/niyamavali.md`, 2026-11-01) — result:
- 1, 2 — §8.5 grounds 1–3 CONSISTENT (a false report of one's own death is grounds under any of them); otherwise SILENT on a member wrongly
  reported dead — `-238` cl. 1 / `-261` D3 A are the instrument. 2's narrowing is of `-423` / `-424`, not of the rulebook.
- 3 — SILENT: no clause speaks to closing a claim because the subject is alive; §8.8's appeals reach moderation acts, not claim closures.
  The no-notice / no-appeal choice is TOLD to the Panel (TL2).
- 4 — SILENT (the five are a `-311` construct).

## ⭐ THE INVARIANTS

**N1 — A finding is an investigation's outcome, and it requires the member confirmed ALIVE.** A finding (innocent | guilty) can be recorded
ONLY on a claim that carries a `flagged` step and no `found_*` step, by the District Admin, with a note AND an `alive_confirmation` (DL3) —
never a bare staff "alive" mark (`-261` D3 A rejected exactly that). A flag on a claim whose member is in fact dead simply never receives
a finding; the claim proceeds (the post-death cases are `6-22b`). One investigation per claim, ever; its steps are append-only.

**N2 — Two outcomes only.** `member_found_innocent` (existing kind) or `member_found_guilty` (NEW kind) in `claim_nominee_findings` — at
most ONE member finding per claim, of EITHER kind (the partial unique index WIDENS to both kinds — DL2). No "inconclusive", no "withdrawn".

**N3 — The leaf predicate is UNCHANGED.** `isDeathReportStanding` keeps releasing on `member_found_innocent` ONLY. There is no second copy
of the release rule anywhere — every new reader goes through the leaf or is a named copy on the fence's lists (TR2).

**N4 — Finding + close is ONE transaction, in the closure core's lock order.** `recordFraudFinding` takes intake → appeal → R9 → trustee
keys → the claim row (the closure core's order), writes the finding (innocent: through the hardened `recordMemberInnocenceFinding`), the
`found_*` step, and — if the claim is CLOSABLE — `claim.closed` through a NEW exported closer in the closure core, which runs
`endLiveProcesses`. Triggers: `fraud_finding_innocent` / `fraud_finding_guilty` (DL13). An `approved` / `settled` claim is not closable:
the finding is still recorded (an innocent member is still released) and the claim is left for row `6-22c` (DL9).

**N5 — Every claim-closing path refuses a payout on a living member.** After a finding, the claim is `closed` (terminal) — or, if already
`approved` / `settled`, recorded for `6-22c` and named in the response. No finding writer ever moves money or a pool.

**N6 — No Tier-1 in events, logs or audits.** Every staff note (flag, finding) is a Tier-1 ciphertext; events and audit contexts carry ids,
outcome, `alive_confirmation` and reason codes only.

## Found facts (traced at `beae5116`; re-verified at `3d6b46c5`)

- **G1 — The finding table and its writers exist; no production caller.** `claim_nominee_findings` (`0119`): `finding_id` (PK, producer-
  supplied, no default), `claim_case_id` (FK `claims`, `ON DELETE cascade`), `pariwar_id`, `kind` (text CHECK
  `claim_nominee_findings_kind_check`), `rank` (CHECK `claim_nominee_findings_rank_coherence_check`: NULL for the innocence kind, 1 / 2 for
  `nominee_disqualified`), `recorded_by_actor_id`, `recorded_by_display`, `recorded_at`. Partial unique
  `claim_nominee_findings_one_innocence_per_claim_uq ON (claim_case_id) WHERE kind = 'member_found_innocent'` + a per-rank disqualification
  unique index. GRANT SELECT, INSERT only; RLS forced. The CHECKs live ONLY in SQL (the TS schema has no `check()`; drizzle snapshots stop
  at `0020`) — a migration touching them is HAND-WRITTEN. Writers in `claim/nominee-lock.ts`: `recordMemberInnocenceFinding`,
  `recordNomineeDisqualificationFinding`. Callers: TESTS only (`nominee-lock.spec.ts`, `findInnocent` in `_death-report-fixture.ts`,
  `nominee-determination.spec.ts`; others seed RAW rows). `CLAIM_NOMINEE_FINDING_KINDS` is defined in the schema file and imported nowhere
  in `src`. No reader filters on "any finding" or `kind <> 'nominee_disqualified'` — the leaf and its copies use `= 'member_found_innocent'`.
- **G2 — The four writer defects ("deferred to Story 6-22").** (a) both writers use an UNTARGETED `.onConflictDoNothing()` — a PK collision
  reads as `duplicate`; (b) a same-`finding_id` retry is not idempotent (it throws `duplicate`); (c) `recordNomineeDisqualificationFinding`
  takes a `Db`, emits no claim event, has no state window and no rank-exists check; (d) the innocence writer locks the claim row but not the
  intake advisory lock — while every 6.38 consumer of the leaf (erasure, withdrawal, declare, intake) serialises on that lock FIRST.
- **G3 — The leaf and its consumers.** `isDeathReportStanding` — raw SQL: EXISTS a `claims` row for the member as deceased with no
  `member_found_innocent` finding on THAT claim. Consumers: `isNomineeDeclarationLocked` → 409 `nominee.locked_claim_filed` (`guardDeclare`
  → `lockNomineeDeclarationForEdit`, `nominee.handlers.ts`); `resolveRtbfLegality` (`member/rtbf-legality.ts`) → 409 `rtbf.death_reported`
  on both erasure routes; withdrawal / Life Events / medical handlers → 409 `withdrawal.` / `life_events.` / `medical.death_reported`;
  `tryConverge`'s door (1b) (`claim/icp.ts`). Read-only copies the fence allows: `claim/approval-warnings.ts` (three — the 90-day
  `first_filed_at` anchor) and `claim/peer-mesh-read.ts` (`resolvePeerMeshFilingCut` — the `-340` anchor). Other gates the member still
  meets after release: withdrawal only from `WITHDRAWABLE_STATES` (`active`, `active-in-grace`, `lapsed-unpaid`) with step-up `withdrawal`;
  Life Events refuse `TERMINAL_STATES`; a re-declaration outside pre-lock-in states needs a fresh `nominee_change` step-up
  (`StepUpRequiredError`); erasure of an `active` member is `rtbf.invalid_state` (TR1).
- **G4 — The fence.** `apps/api/tests/unit/erasure-and-death-report-fence.test.ts` scans `apps/api/src`, `apps/jobs/src` and
  `packages/domain/src` only: (i) where the gate SQL may appear (`gateSqlCopies`); (ii) an EXACT allow-list of files that may contain the
  literal `'member_found_innocent'` or `CLAIM_NOMINEE_FINDING_KINDS` (`findingKindLiteralFiles`: `death-report.ts`, `approval-warnings.ts`,
  `peer-mesh-read.ts`, `nominee-lock.ts`, the schema file). The pattern does NOT match `member_found_guilty`; migrations, contracts and
  admin are out of its reach; `known-people.ts` is on neither list (TR2).
- **G5 — Closing.** `claim.closed` moves every state except `CLAIM_NOT_CLOSABLE_STATES = ['settled', 'approved', 'closed']` (`claim/state.ts`
  — *"⛔ Never widen it to `approved` / `settled` (Trap 16 …)"*); `denied`, the three appeal stages, `reversed` and `state_trustee_approved`
  ARE closable — so live appeals and R9 sessions are reachable from a finding. `CLAIM_CLOSED_TRIGGERS = ['suspicion_appeal_allowed',
  'death_already_finally_approved']`; `ClaimClosedPayloadSchema` (`claim/events.ts`) is `.strict()` with `trigger: z.enum(…)` and REQUIRES
  `held_by_claim_case_id: z.string().uuid()` and `deceased_member_id`. The events.ts header: `claim.closed` is *"Emitted ONLY through the
  closure core in `suspicion-refusal-persist.ts`"*. Readers: `suspicion-notice.ts` `readClosingEvent` filters on `trigger =
  SUSPICION_APPEAL_ALLOWED_TRIGGER` (safe); `one-payment-per-death.ts` OP10 `readClosedHolderRefusedBulk` does NOT look at the trigger — it
  joins every `claim.closed` on `(op_e.payload ->> 'held_by_claim_case_id')::uuid` whose holder is `denied` / `closed` and labels the claim
  *"Closed — the other claim for this death was later refused; the family may file again"*. `ACCOUNT_UNFREEZE_EVENT_TYPES =
  ['claim.settled', 'claim.denied_no_appeal', 'claim.closed']` (`member/overlay.ts`; `directory-read.ts` imports it) — the overlay folds
  per claim stream and stays frozen while ANY stream is frozen; `claim.nominee_lock_released` does not unfreeze. The registry description
  of `claim.closed` (`packages/events/src/registry.ts`) names `held_by_claim_case_id`.
- **G6 — No "alive" fact anywhere else.** The finding row is the only "alive" fact; "investigation" appears only in comments. The closest
  shipped mechanism is 6.24a's suspicion refusal (the closure core's own callers).
- **G7 — Who may flag and find, and in which dimension.** Claim routes are `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/<action>`,
  district-dimension via `resolveNomineeNameCheckDistrict()` (defined in `claims.nominee-name-check.routes.ts`; imported by
  `claims.death-certificate.routes.ts`). A pariwar-ceiling grant (`helpline_operator` — which already holds the district-dimension key
  `claim.view_nominee_name_check`) contains any resolved district target. ⚠ The resolver stashes `posting?.district ?? null`, and
  `scopeContains` returns false on a NULL target for everyone, `super_admin` included (`resolveQueueScopeStash`'s doc) — a member with no
  posting can be neither flagged nor found (residual, AC3).
- **G8 — The helpline console sees a claim only as its own intake's result.** `HelplineClaimPage` / `HelplineConsoleShell` is search →
  read-back → intake; the only claim id it shows is `result.claimCaseId` ("created" / "exists" / "closed"). No helpline read lists the
  claims naming a member as deceased; `helpline_operator` lacks `claim.verify`, so the verifier console is closed to it.
- **G9 — The closed-claim staff label is trigger-blind.** `apps/admin/src/modules/claim-verification/i18n-en.ts` `claimStateLabels.closed`
  = *"Closed — another claim for this death goes ahead"* (and a second `closed:` entry, "… goes ahead."), rendered through
  `closedClaimStateLabel` at `HelplineAppeal`, `HelplineCertificateReplacement`, `HelplineClaimContact`, `NomineeRefusalsRoute`. The
  contracts carry no trigger (`closed_holder_refused` is the only extra bit). The mobile closed copy (`apps/mobile/lib/closed-helpline-
  copy.ts`) is generic and stays true. The 6.38 helpdesk copy (`apps/admin/src/modules/helpdesk/i18n-en.ts`, the erasure refusal)
  says *"only a finding that the member is alive lifts it"* — false for a guilty-alive member (PQ1).
- **G10 — Intake convergence and the override.** `getConvergenceCandidate` (`icp.ts`) filters out `CLAIM_TERMINAL_STATES = ['settled',
  'denied', 'closed']` (`claim/read.ts`) — a closed claim is not a candidate. `overrideIntakeAttempt` (`icp.ts`) checks only that the attempt
  is `pending` and `assertRefileAllowed`; `overrideConvergence` (`claims.convergence.handlers.ts`) checks only that the against-claim exists
  and is for the same death — NEITHER refuses a `closed` target or runs the door. Its DELIBERATE doc block says *"Re-examine when row 6-22
  writes `member_found_innocent`"*. A self-closed claim leaves `assertRefileAllowed` keyed on a closures row only, so the family can re-file.
- **G11 — Keys.** `SEED_PERMISSION_KEYS` + `PERMISSION_CATALOG_VERSION` 56 (`packages/domain/src/rbac/permissions.ts`, a "Bumped N → N+1"
  history note per bump), grants in `rbac/roles.ts`, pins in `packages/domain/tests/rbac/permissions.test.ts` (`toBe(56)`,
  `toHaveLength(74)`) and `roles.test.ts` (`toHaveLength(13)`). No migration seeds permissions. 6.33's key-add touched `permissions.ts`,
  `roles.ts`, the two tests, `apps/admin/src/api/client.ts` and the route file. Keys are minted ONLY in an author-commit decision (`-195`
  cl. 2). `super_admin`'s bundle is `permissions: PERMISSION_CATALOG.keys` — it auto-derives every key (⚠ relevant to `6-22d`, PQ5).
  Step-up purposes are FREE strings (`requireStepUp(deps, actionContext: string)`, ≤ 128 chars — *"⚠ THERE IS NO STEP-UP CONTEXT
  REGISTRY"*); the precedent is one exported constant shared by the route and the admin OTP caller (`contracts/memorial/takedown.ts`).
- **G12 — Events, audits, pins.** Claim events through `projectClaimState(client, …)` in the row's transaction (annotations via
  `requireIdentityTransition`). Per annotation: `claim/events.ts` (schema, tuple, payload map, header count prose), the `state.ts` reducer
  identity arm, `packages/events/src/registry.ts`, and three tests — `packages/domain/tests/claim/dpdpa-consent-events.test.ts`
  (`toHaveLength(37)` + a per-story history comment), `packages/events/tests/claim-registry-coverage.test.ts` (the exact set), and the
  frozen literals `STORY_6_20 / 6_21A / 6_24A / 6_36_CLAIM_EVENTS` in `packages/domain/tests/claim/nominee-name-check-events.test.ts` (an
  exclusion filter + an "all live" assertion). Audits through `emitAuthAudit` (`apps/api/src/modules/auth/shared/audit.ts`; type added to
  `AuthAuditEventType`, `apps/api/src/audit/audit-sink.ts`; `event.context` hashed into `request_payload_hash`; the only check on new types
  is `audit-log-sink.test.ts`'s dotted-action leg).
- **G13 — `namedByClaimSql` reaches far beyond peer-mesh.** `namedByClaimSql` (`member/known-people.ts`) = EXISTS ANY claim naming the
  member as deceased (it IGNORES the finding). It is a SQL fragment (the leaf is an async boolean — a fragment cannot "call" it). Consumers:
  `knownPersonEligibleSql`, `knownPeopleCallerSql` (the member's own "People who know me" gate — `-333` call 1), `namedUnavailableSql`
  (`known-people-prompts.ts` `replaceNeeded` + the "unavailable" label) — all `known-people.ts`; `peerMeshEligibleMemberSql`
  (`peer-mesh-read.ts`); `readPeerMeshRequestEligibility`'s `no_target:peer_reported_deceased` label (`peer-mesh-request.ts`); and
  `nominee/member-links.ts` × 5 (resolution through `knownPersonEligibleSql`, `nomineeLinkAnswererSql`, the request list, the answer
  `UPDATE … AND NOT namedByClaim(declarer)`, the data-export `listed` column). `known-people.ts` records *"a living member wrongly reported
  dead stays out"* as an accepted cost.
- **G14 — What identity data the Trust holds about filers.** `CLAIM_DOCUMENT_TYPES = ['death_certificate', 'ground_inspection_photo',
  'hospital_record']` — no identity document; no PAN or father's-name column; no full Aadhaar (`aadhaar_masked_id` is Tier-3 last-4 on
  `member_kyc_profiles`, NULL on the manual path); claimant name / mobile / address are `piiColumn(1, 'claim_contact')` in `claim_contacts`
  with *"⛔ No mobile blind index"*. ⇒ `-240` cl. 1's deletion has nothing to delete today, and no non-member can be matched by an exact
  identifier. ⚠ The 6.21 trap stands for `6-22b`: deleting `claim_documents` rows CASCADES (`0122`) into every kept certificate upload and
  review.
- **G15 — Counsel.** No decision records an answer to `-238` (a) / (b) / (c); `-339` (2026-10-16) still calls the producer *"counsel-gated
  … waits on legal advice"*; no counsel-question file exists for them (the only one, `counsel-question-2026-10-18-nominee-contact-basis.md`,
  is about contact, WRITTEN not sent); no `inventory-roster.md` row names the fraud register, the identifier set or the death locks (the
  roster tops out at Row 45 on every branch). The PAN-verification author-commit (`-240`) has its four owed consequences (fail mode, fuzzy
  name match, processor, whose PAN) all open.
- **G16 — Deferred items and pointers that name this row** (`deferred-work.md`, cite by phrase): 6.38 Task 0.5 item 1 (6.38 DL4 / DL7 — the
  release, the guilty arm, the two residual edges); 6.38 round-2 D1 (the copy points a falsely-reported member at a helpline that cannot lift
  — (b) MANDATES the words *"mechanism built, lift deferred to 6-22", never "Q1 (b) closed"*; (c) the go-live list); 6.38 DL12 (ii) (the
  export step-up); 6.20 chunk 1 (G2's defects; a correction raised on a released claim racing a declare); the *"adversarial review of the
  applied 6-20 patches (2026-09-24b)"* item (the 40P01 deadlock — *"Revisit with `6-22` (map 40P01 to `concurrent`, or align the orders)"*);
  6.23a (FQ1's *"corrected after the death"* label — trigger *"row `6-22`'s first production release"*); 6.23b EA10 + its "second row-6-22
  mechanism" (an earlier claim's release moves the 90-day anchor of a LATER open claim — reachable for an OPEN claim); 6.36 W2 (an anchor
  later than the claim selected for); 6.36e NE9 / 6.36f (a declare after an unlock); 6.21 (the cascade trap); 12.1 C4 (*"nominee-lock has ⛔
  production release until row 6-22"*); the PM1 pointer on this row's sprint-status block.
- **G17 — Code pointers that name this row.** An OBLIGATION: `icp.ts` `convergeIntakeAttempt` / `overrideIntakeAttempt` (*"Re-examine when
  row 6-22 writes `member_found_innocent`"* — DL9). Pointers only ("no producer until 6-22"): `nominee-lock.ts`, `claim_nominee_findings.ts`,
  `death-report.ts`, `peer-mesh-read.ts`, `claim/events.ts`, the `0119` header, `ids/index.ts`, `claim/errors.ts`, test comments,
  `nominee-history-copy.test.ts` — Task 7.
- **G18 — Admin surfaces and copy.** No general claims list; the console is entered by claim id (`/p/$pariwarId/claims/$claimCaseId/
  verify`). Lists that exist: `/helpline`, `/ground-inspection`, `/nominee-refusals`, `/nominee-corrections`, `/claims/under-correction`,
  `/cycle-freeze`, `/r9-voting`, `/trustee`, `/moderation/appeals`. Admin copy is English-only and PER MODULE
  (`modules/claim-verification/i18n-en.ts`, `modules/helpline-claims/i18n-en.ts`, …).
- **G19 — Erasure.** `member/anonymize.ts` scrubs 6.21a's review notes keyed on `deceased_member_id` (`.where(eq(
  claimDeathCertificateReviews.deceasedMemberId, memberId))`) with the field-class constant `FIELD_CLASS_DEATH_CERTIFICATE_REVIEW` and its
  `apps/api/src/context.ts` twin `DEATH_CERTIFICATE_REVIEW_FIELD_CLASS`; it keeps `mobile_blind_index` (*"CRITICAL GUARDRAIL"*). Pins in
  `packages/domain/tests/member/rtbf-anonymize.test.ts`: `toHaveLength(31)` statements, `new Set(tables).size` `toBe(28)`, and
  `toHaveLength(27)` for the no-claims run. The 0122 append-only template: `GRANT UPDATE ("superseded_at", "superseded_reason",
  "accepted_date_ciphertext", "note_ciphertext")` + `claim_death_certificate_reviews_reject_mutation()` (every frozen column `NEW.x IS
  DISTINCT FROM OLD.x`; DELETE allowed only when `pg_trigger_depth() > 1` — the cascade from `claims`; a separate `BEFORE TRUNCATE`
  trigger). Policies are `pgPolicy`, per-command (no `FOR ALL`), generated by `drizzle-kit generate` from `*-rls.ts`; grants and triggers are
  HAND-APPENDED.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL0 — SCOPE: the investigation to its finding; three new rows. ⭐ The split is ANSWERED (BigDev, validate 2026-11-01: *"Split: new row
  6-22d"*).** This story builds the flag, both findings, the release and the close. Three new rows (Task 0.5):
  - **`6-22d-fraud-register-refer-impose-lift-and-member-ban`** — the refer → impose → lift chain with DECLINE arms, the termination through
    `moderateMember`, the ban table, the bar at joining, the register page and the member screen. Gated on PQ3 (a mobile cannot bar
    automatically under `-240` cl. 3 as ruled), PQ5 (who "the State Trustee" is), PQ6 (Trust-wide reach) and an actor-separation design
    (`super_admin` derives refer + impose + lift — `-240` cl. 5's named collapse; the 10.22 precedent `ModerationAppealAdjudicatorExcludedError`).
    It must also address: a banned member never reaches sign-up (OTP verify issues a continuation only when `memberships.length === 0`, and
    erasure keeps the identity row) — what they meet is login (`auth.member_terminated` only under `termination_access_block`, default OFF);
    one `moderateMember` transaction with suspend + terminate TIES on `acted_at` / `created_at` and `resolveMembersByMobile`'s latest-act
    `ORDER BY` falls to a random uuid (the terminate needs a strictly later `now`); the terminate handler's session revocation is IN the
    transaction and its notice / audit are private closures (extract, do not copy); `rejoinPermittedAt` (`addTwelveMonths`, apps/api),
    `r7aRestorationsUsedSnapshot`, `actorDisplay` and the handler-only plaintext guards are inputs; the 12-month lock is per-Pariwar and a
    same-Pariwar re-join after it lapses is 409 `auth.member_already_exists`; there is ONE member-creation path (`signupCreate` →
    `insertMemberIdentity`) and no mobile-change writer; the terminate fields are inline in `ModerationStrip.tsx`; `pariwar_admin` already
    holds `member.moderate`; the geo resolver now exists (Story 1.18, ADR-0038) — re-trace `-240` Consequence 5's rank-order wall.
  - **`6-22b-fraud-register-identifier-set-and-filer-bans`** — ⚠ COUNSEL-GATED (`-238` (a)–(c)): the PAN / Aadhaar-token collection, the
    PAN-verification service (`-240` author-commit (a)–(d)), the bar at FILING on an exact identifier + the human review on a name / DOB /
    father's-name match (`-240` cl. 2–3, incl. *"caught at the moment they come forward to claim"*), bans on nominees and claimants (PQ2),
    the post-death-rewrite and fake-certificate investigations whose guilty are FILERS (`-240` cl. 6), and the `-240` cl. 1 deletion
    (excluding certificates — `-243`; the cascade trap, G14; and whether innocent-outcome investigation NOTES fall in it — DL15). ⭐ Its
    FIRST task is to WRITE the counsel question (G15) — not written today.
  - **`6-22c-disqualified-nominee-and-proof-of-succession`** — the `nominee_disqualified` producer (6.20's D17(c) re-rank is built, no
    caller; G2 (c)), the State Trustee's payment on proof of succession (`-240` cl. 4), and a claim already `approved` / `settled` when the
    member is found alive (N4 — a drive raised for a living member; the 40P01 item; the correction race on such a claim).
  - *Rejected:* waiting for counsel to build anything (the release is a living member's way out of six locks today); building the ban on a
    mobile key now (it bars no one through the app and goes beyond `-240` cl. 3); building the identifier set stubbed (an inert gate that
    reads as built — [[feedback_gate_scope_semantic_coverage]]). The slug keeps naming the identifier set; it is not renamed (four decisions
    and six story files cite the key).
- **DL1 — The investigation record: a NEW table `claim_fraud_investigation_steps`** (append-only), migration "the next free number" (READ
  LIVE — TR10). Columns: `step_id uuid PK` (producer-supplied — idempotent retries), `claim_case_id` (FK `claims`, `ON DELETE cascade`),
  `pariwar_id`, `deceased_member_id`, `step` — a TEXT column with a CHECK (`flagged | found_innocent | found_guilty`; the
  `claim_nominee_findings.kind` precedent; NOT a pgEnum, so no `ALTER TYPE … ADD VALUE` now or when `6-22d` widens it), `finding_id`
  (nullable FK `claim_nominee_findings` — set iff `found_*`), `alive_confirmation` (text CHECK, NOT NULL iff `found_*` — DL3),
  `note_ciphertext` (Tier-1, `piiColumn`, REQUIRED on every step), `actor_id`, `actor_display`, `acted_at`. Unique `(claim_case_id, step)`
  — each step at most once per claim (N1). RLS by `pariwar_id` declared in TS (`packages/domain/src/policies/claim-fraud-investigation-
  rls.ts` + `policies/index.ts`, copying `claim-death-certificate-rls.ts`) INCLUDING a per-command UPDATE policy; `GRANT SELECT, INSERT,
  UPDATE ("note_ciphertext")` AT BIRTH (the scrub — DL15); the 0122 guard IN SHAPE (G19): every frozen column refused, DELETE only at
  `pg_trigger_depth() > 1` (the `claims` cascade — spec cleanups delete claims), TRUNCATE refused, all hand-appended — never regenerated
  ([[project_append_only_guard_names_erasure_columns]] — at birth, not a later REPLACE). The chain order is enforced in the domain writer,
  not by a trigger. Branded id `ClaimFraudInvestigationStepId = uuidBrand('ClaimFraudInvestigationStepId')` (`ids/index.ts`,
  [[project_branded_ids_lowercase]]). *Rejected:* a mutable "investigation" row with stage columns (two writers racing on one row; the house
  shape for staff acts is append-only — `claim_death_certificate_reviews`).
- **DL2 — The guilty finding kind.** A HAND-WRITTEN migration, ALONE, before DL1's: `DROP CONSTRAINT claim_nominee_findings_kind_check` →
  re-ADD with `'member_found_guilty'`; `DROP CONSTRAINT claim_nominee_findings_rank_coherence_check` → re-ADD as `(kind IN
  ('member_found_innocent', 'member_found_guilty') AND rank IS NULL) OR (kind = 'nominee_disqualified' AND rank IN (1, 2))`; `DROP INDEX
  claim_nominee_findings_one_innocence_per_claim_uq` → `CREATE UNIQUE INDEX claim_nominee_findings_one_member_finding_per_claim_uq ON
  claim_nominee_findings (claim_case_id) WHERE kind IN ('member_found_innocent', 'member_found_guilty')` — mirrored in the TS
  `uniqueIndex(…).where(…)` (N2). `CLAIM_NOMINEE_FINDING_KINDS` gains the value (the leaf does not read it — N3). G1 already shows no
  reader filters on "any finding"; Task 0.1 re-runs that grep — if one appears, re-point it to an equality on `member_found_innocent` and
  record it. *Rejected:* recording guilt only in DL1's steps (then a PQ1 = A ruling needs a second table in the leaf).
- **DL3 — The finding writer (N1, N4).** `recordFraudFinding(client, { claimCaseId, pariwarId, outcome: 'innocent' | 'guilty',
  aliveConfirmation, stepId, findingId, noteCiphertext, actor… })` in a NEW `packages/domain/src/claim/fraud-investigation-persist.ts`:
  1. take the closure core's keys in ITS order — `intakeAdvisoryLockKey(pariwar, deceased)` (lower-cased), `appealAdvisoryLockKey`,
     `r9VotingAdvisoryLockKey`, `stateTrusteeDecisionAdvisoryLockKey` — then lock the claim row (the closure core's "Trap 8 / 40P01" order;
     add this writer to the "every intake-key taker" list in `acquireSuspicionReversalLockForClaim`'s doc block);
  2. require a `flagged` step and no `found_*` step on this claim (409 `fraud_investigation.not_flagged` / `.already_found`);
  3. `aliveConfirmation` REQUIRED — text CHECK `in_person | video_call | ground_inspection` (PROPOSED values; a phone call alone is not
     proof — someone may answer for the member); missing ⇒ 400;
  4. INNOCENT ⇒ the HARDENED `recordMemberInnocenceFinding` (DL12) — GUILTY ⇒ insert `member_found_guilty` + append the annotation
     `claim.member_found_guilty`;
  5. insert the `found_*` step;
  6. if `isClaimClosable(state)` ⇒ `claim.closed` through a NEW exported self-mode closer in `suspicion-refusal-persist.ts` (a sibling of
     `closeClaimIfDeathPaid`, taking `trigger: 'fraud_finding_innocent' | 'fraud_finding_guilty'`, `endLiveProcesses` run — the keys are
     already held); a claim ALREADY `closed` (e.g. a suspicion closure) records the finding and is not closed again; `approved` / `settled`
     ⇒ the finding (and an innocent member's release) stands, the claim is not closed, and the response says so (`closed: false, reason:
     'committed'`) — `6-22c`.
  The response lists the member's OTHER standing claims (ids and states, no PII) so the District Admin sees the member is still locked by
  them. *Rejected:* one finding releasing every claim on the member (a finding is an investigation's outcome on ONE report — `-261` D3 A);
  closing a guilty claim with the same trigger as an innocent one (it would read literally as "closed because the member is alive" and
  still refuse erasure — PQ1); leaving a guilty claim open (a claim on a living member could then be approved and paid — N5).
- **DL4 — The flag.** `flagClaimForFraudInvestigation(client, { claimCaseId, pariwarId, stepId, noteCiphertext, actor… })` — any claim in
  ANY state that is not already flagged. The ruled flagger is the helpline operator (`-238` cl. 3 *"operator flags"*); adding the District
  Admin as a flagger is the AUTHOR's (`-238` NOT covered (iii) — in the post-death case the discovery is the District Admin's). A District
  Admin may flag AND find the same claim (the ruled chain's "verifies" is the finding) — TOLD (TL3). Annotation `claim.fraud_flagged`. The
  flag has no effect on the claim's state or on any approval gate (a flag is a question, not a hold — TL1).
- **DL5 — The helpline's way to a claim (G8).** A NEW helpline read: *"claims naming this member as deceased"* — for the member the operator
  has already found by search, the claim ids, states and filed dates (no claimant PII), each with a Flag action. Gated by the flag key
  (district dimension, resolved from the member's posting). *Rejected:* flag only on an intake result (the living member calling in is not
  filing an intake); District-Admin-only flagging (drops the ruled "operator flags").
- **DL6 — The keys** — minted in Task 0.4's decision, catalog "the next free version" (READ LIVE — TR10):
  | Key | Dimension | Seeded holders | Step-up |
  |---|---|---|---|
  | `claim.flag_fraud` | district | `helpline_operator`, `district_admin` | — |
  | `claim.record_fraud_finding` | district | `district_admin` | ✅ purpose `fraud_finding` (one exported constant, G11) |
  The helpline read (DL5) is gated by `claim.flag_fraud`. `super_admin` derives both. `6-22d` mints its own keys.
- **DL7 — Who sees the investigation.** The verifier console's `FraudInvestigationPanel` shows the steps (outcome, actor display, time —
  notes decrypted only for holders of `claim.record_fraud_finding`); the helpline sees only "flagged" / "found" status on its read.
- **DL8 — No effect on the leaf (N3, PQ1).** `isDeathReportStanding` is not edited. A guilty member stays locked out of erasure, withdrawal
  and Life Events — 6.38's declared narrowing, carried as a DECLARED NARROWING of `-423` Q1 (b) / `-424` Q2 (a) in Task 0.4, PQ1, and a
  go-live leg (Task 0.5). If PQ1 is ruled A, the change is ONE kind in the leaf's `NOT EXISTS` plus the fence's allow-list — record that in
  the leaf's header as the swap point.
- **DL9 — 6.38 DL7's two residual edges.** (a) A released claim as a convergence candidate — CLOSED by DL3's close for every closable state
  (a `closed` claim is not a candidate — G10); `approved` / `settled` released claims stay candidates ⇒ `6-22c` (recorded). (b) The
  override has no door (G10) ⇒ BUILD: under the intake lock, `overrideIntakeAttempt` refuses a `closed` against-claim and, when no report
  stands (`!isDeathReportStanding`), runs `resolveClaimIntakeDoor` — the `tryConverge` (1b) shape; rewrite the DELIBERATE doc block (AC10).
  (c) A GUILTY member's later death reports skip the door for ever (the guilty claim stands in the leaf; it is `closed`, so not a candidate;
  a new report mints a fresh claim with no door) — a named residual ⇒ `6-22d` (a door keyed on a standing ban).
- **DL10 — The surfaces.** (i) Verifier console: a `FraudInvestigationPanel` (`DeathCertificateReviewControl.tsx`'s FORM shape +
  `HelplineClaimPage`'s STEP-UP handling) — Flag (note), then Record finding (innocent / guilty radios, nothing pre-selected;
  `alive_confirmation` radios, nothing pre-selected; note required; step-up), showing the member's OTHER standing claims after the finding.
  (ii) Helpline console: DL5's read + Flag. (iii) The closed-claim staff label (G9): contracts gain `closed_member_alive: boolean` beside
  `closed_holder_refused`; `closedClaimStateLabel` renders *"Closed — the member was found alive"* for it (English, verbatim — BigDev
  reviews at Task 0.2). Every refusal mapped to copy (no raw code); `role="alert"` errors and an always-mounted `role="status"` (6.38 R4 P1).
  Copy in the module's own `i18n-en.ts` (G18).
- **DL11 — The peer-mesh exclusion FOLLOWS the release; nothing else does (PM1's pointer).** PM1's pointer reaches only peer-mesh, and
  `namedByClaimSql` gates far more (G13). So: a NEW fragment `standingReportNamesSql` in `peer-mesh-read.ts` (already on the fence's literal
  list) = "a claim names the member as deceased and no `member_found_innocent` finding released it", added to the fence's `gateSqlCopies`
  list; used ONLY by `peerMeshEligibleMemberSql` and `readPeerMeshRequestEligibility`'s label (Task 0.1 traces whether
  `peerMeshEligibleMemberSql` reaches `namedByClaimSql` directly or through `knownPersonEligibleSql`, and confines the change to the
  peer-mesh selection either way). `namedByClaimSql` is UNCHANGED — "People who know me", the unavailable prompts and nominee links keep
  treating a released member as reported (a NAMED residual in `known-people.ts`'s accepted-cost comment and `deferred-work.md`). A member
  found innocent re-enters the five — TOLD (TL1).
- **DL12 — Harden the existing writers (G2).** `recordMemberInnocenceFinding`: (a) TARGETED conflict — `onConflictDoNothing({ target:
  claimNomineeFindings.claimCaseId, where: <the new index's predicate> })`, so a PK collision is a 500, never "duplicate"; (b) a
  same-`finding_id` retry with the same inputs is IDEMPOTENT (returns the existing row's event version, no second event); (d) it takes
  `intakeAdvisoryLockKey` as its FIRST statement — a re-entrant no-op when DL3 already holds it, and the fix for the test-fixture callers
  and any future caller. The disqualifier's defects (c) ⇒ `6-22c` (its producer) — recorded, not fixed here (no caller in this story).
- **DL13 — Events.** Claim: `claim.fraud_flagged` and `claim.member_found_guilty` (identity annotations); `claim.closed` gains two triggers
  `fraud_finding_innocent` and `fraud_finding_guilty` (named so they do not spell `'member_found_innocent'` — the fence, TR2).
  `ClaimClosedPayloadSchema` becomes a `z.discriminatedUnion('trigger', …)`: the two existing triggers keep the REQUIRED
  `held_by_claim_case_id`; the fraud triggers carry no `held_by` and keep `deceased_member_id` REQUIRED (the overlay matches on it). OP10's
  join gains `AND op_e.payload ->> 'trigger' NOT IN ('fraud_finding_innocent', 'fraud_finding_guilty')`; the registry description is
  updated. `CLAIM_EVENT_TYPES` +2 (READ LIVE — 6.39 adds one); a frozen literal `STORY_6_22_CLAIM_EVENTS` in
  `nominee-name-check-events.test.ts`. No member-stream event (the member events belong to `6-22d`). No notification on a fraud close —
  the claimant is told nothing by the app (TL2).
- **DL14 — Audits.** `admin_claim.fraud_flagged`, `admin_claim.fraud_finding_recorded` — `AuthAuditEventType` entries; contexts carry ids,
  the outcome and `alive_confirmation` only (N6, asserted with a planted value).
- **DL15 — Erasure.** `claim_fraud_investigation_steps.note_ciphertext` is scrubbed by `member/anonymize.ts` keyed on `deceased_member_id`
  (the reported, living subject — the 6.21a pattern, G19, with a new field-class constant + its `context.ts` twin). Reachable only for an
  INNOCENT member (a guilty one stays erasure-locked — DL8). ⚠ `-240` cl. 1 (*"the register holds the guilty, ⛔ never everyone who ever
  claimed"*): innocent-outcome notes may describe the FILER; whether they fall in `6-22b`'s deletion is recorded there (DL0). A retention-
  matrix row is owed for the steps table (Task 0.5).
- **DL16 — Records this story CLOSES or annotates (G16), with exact closure words** ([[feedback_closure_language_precision]];
  [[feedback_shown_to_panel_means_sent]]):
  - 6.38 Task 0.5 item 1 — *"innocence release built by 6.22; the guilty arm records its finding and closes the claim, its locks kept — a
    declared narrowing written as PQ1, not yet sent; 6.38 DL7 (a) closed for closable states, (b) built (6.22 DL9 (b))"*.
  - 6.38 round-2 D1 — *"mechanism built, innocence lift built by 6.22; guilty-alive narrowing pending PQ1"* (D1 (b)'s mandated shape —
    never "Q1 (b) closed"); D1 (c) — a go-live leg (Task 0.5).
  - 6.20 chunk 1 — (a) / (b) / (d) *"Closed by 6.22"*; (c) *"deferred to `6-22c`"*; the correction race — *"unreachable for a closed claim
    (corrections refuse it — `raiseNomineeCorrection`'s `CLAIM_REVIEW_WINDOW_STATES`); `approved` / `settled` ⇒ `6-22c`"*.
  - The 2026-09-24b 40P01 item — *"aligned for the finding writer (the closure core's order); `approved` / `settled` ⇒ `6-22c`"*.
  - 6.23a — *"trigger reached; still deferred"* + the reason (Task 0.1 (vi)). 6.23b EA10 second mechanism — reachable for an OPEN later
    claim: *"trigger reached; owed"* — re-traced at Task 0.1 (vi) and either fixed here or re-deferred with a new trigger.
  - 6.36 W2 — re-traced at Task 0.1 and annotated. 6.36e NE9 / 6.36f — *"trigger reached; not addressed"*. 6.38 DL12 (ii) — *"not
    addressed"*. 6.21's cascade trap — *"moved to `6-22b`"*. 12.1 C4 — *"stale: 6.22 is the production release"*. The PM1 pointer —
    *"Closed by 6.22 DL11 (peer-mesh only; known-people / nominee links a named residual)"*.
- **DL17 — Scope fence.** Not here: the identifier set, PAN service, filer bans, filing-form changes, deletion (`6-22b`); the
  disqualification producer, succession payment, committed-claim recovery (`6-22c`); refer / impose / lift, termination, the ban, the bar
  at joining, any member-facing screen (`6-22d`); a change to the leaf (PQ1); a new moderation reason code; a notification to the claimant
  or nominee; the flag as an approval hold; a backfill (no member uses the system).

## Panel questions — ONE note at Task 0.3 (WRITTEN; BigDev sends)

- **PQ1 — A member found ALIVE but GUILTY: do the death locks lift?** (`-425` 6.38 DL4: *"6-22 must put that to the Panel or justify it"*.)
  `-423` Q1 (b)'s words — *"closed because the member is alive"* — cover a guilty member, and this story closes the guilty claim. ⭐ THE ONE
  FACT: lifting means a member just found to have faked their own death could have their data ERASED and LEAVE the Trust before any ban.
  Options: **A** lift on either finding (the literal words); **B** lift on innocence only (built — a DECLARED NARROWING of `-423` Q1 (b) /
  `-424` Q2 (a), justified by `-240` cl. 1 *"only the guilty are kept"*); **C** lift on guilt only once `6-22d`'s ban is imposed or
  declined. *Built: B. Suggest: B.* ⚠ A GO-LIVE condition for the guilty arm, and the 6.38 helpdesk copy (G9) changes with the ruling.
- **PQ2 — The NOMINEE of a guilty member: banned automatically, or only on a finding of their own?** (`-238` / `-240` NOT covered (i) —
  the claimant half is ruled by `-238` cl. 5.) ⭐ THE ONE FACT: a nominee may never have known they were named. Options: **A**
  automatically; **B** only on a finding naming them. *Built: neither (`6-22b`). Suggest: B.*
- **PQ3 (for `6-22d`) — Until the identifier set exists, may a MOBILE NUMBER bar a returning member?** `-240` cl. 3: *"Only an **exact**
  identifier (PAN, Aadhaar token) may bar automatically"* — a mobile is not on that list, and Indian numbers are RECYCLED to strangers.
  ⭐ THE ONE FACT: a mobile bar would be a WIDENING of a ratified clause, and it also cannot catch a member on a new number (*"catching them
  even on a new phone number is the whole point"* — the note the Panel ruled on). Options: **A** widen cl. 3 to a mobile (a stranger with a
  recycled number is refused until the Super Admin lifts — which also frees the fraudster); **B** a mobile match is held for a human to
  confirm (a new "held" sign-up state); **C** no bar until `6-22b`. *Suggest: C.*
- **PQ4 (for `6-22d`) — What is a barred person told when they try to join?** No ruling covers it. Options: **A** plainly that they are
  barred by a Trust decision; **B** *"We cannot register this mobile number. If you think this is a mistake, please call the helpline."*;
  **C** the 12-month lock's words (false — they show a date). *Suggest: B.*
- **PQ5 (for `6-22d`) — Who is "the State Trustee" who imposes?** `-240` cl. 5 rules *"the State Trustee imposes"*; the system cannot gate
  an act on that role (`-240` Consequence 5). House readings map State-Trustee acts to `pariwar_admin` as Trustee-Lite (`-305` §1 (c),
  `-421` QE6) — but here the Pariwar Admin REFERS, so that would let the referrer impose. ⭐ THE ONE FACT: the only role distinct from both
  is `trustee_panel`, and §8.8 (ratified by `-121`) requires a termination appeal to be heard by *"a member of the Panel who did not take
  part in the act"* — with a two-trustee Panel, the imposer cannot hear the appeal. Options: **A** `trustee_panel` imposes; **B** another
  role the Panel names. *Suggest: A, with the §8.8 hearer cost named.*
- **PQ6 (for `6-22d`) — "THE BAN IS TRUST-WIDE": does it end the person's memberships in OTHER Pariwars?** `-240` cl. 5 / `-238` cl. 2
  (*"ABOVE TERMINATION"*). ⭐ THE ONE FACT: stopping only NEW joins leaves existing memberships elsewhere standing — a narrowing of
  "Trust-wide". Options: **A** terminate every membership; **B** stop new joins only. *Suggest: A.*
- **TL1 (told) — three quiet choices.** (i) A flag is a question, not a hold — a flagged claim keeps moving until a finding; (ii) a member
  found innocent can again be one of the five asked to confirm a colleague's death (DL11) — "People who know me" and nominee links still
  treat them as reported (residual); (iii) bans on nominees, claimants and non-members wait for counsel, and counsel has not yet been asked
  (`6-22b`'s first task writes the question).
- **TL2 (told) — a claim closed because the member is alive tells the claimant nothing and cannot be appealed** (Policy meaning 3); a
  finding requires the member confirmed alive in person, by video or by ground inspection.
- **TL3 (told) — the release is built before counsel, and one District Admin may flag and find the same claim** (the ruled chain is
  *"operator flags → District Admin verifies"*; the Panel rejected B — *"the District Admin records it, the Pariwar Admin approves"* —
  under `-261`; this build adds a recorded flag, a recorded alive confirmation and a step-up).

## Acceptance Criteria

1. **AC1 — The records (DL1, DL2).** Migrations in order — the `claim_nominee_findings` CHECK + index change ALONE (hand-written), then
   `claim_fraud_investigation_steps`; drizzle schema + journal agree ([[project_live_db_test_gotchas]]). Live-DB: a second member finding of
   EITHER kind on one claim ⇒ 23505; a `member_found_guilty` with a rank ⇒ 23514; a second step of the same kind ⇒ 23505; a `found_*`
   step without `alive_confirmation` ⇒ 23514; UPDATE of any step column but `note_ciphertext` ⇒ refused; DELETE ⇒ refused, but deleting the
   parent claim cascades; TRUNCATE ⇒ refused; another Pariwar's session sees no step.
2. **AC2 — The leaf is untouched and blind to guilt (N3, DL8).** Live-DB: a claim with `member_found_guilty` ⇒ `isDeathReportStanding`
   TRUE (erasure 409 `rtbf.death_reported`, withdrawal 409 `withdrawal.death_reported`, Life Events 409, declare 409
   `nominee.locked_claim_filed`); a different seeded claim with `member_found_innocent` ⇒ FALSE. ONE test named for PQ1 so a ruling of A
   flips it visibly. `git diff` shows `death-report.ts` unchanged except its header's swap-point note.
3. **AC3 — Flag (DL4, DL5).** API live-DB: a helpline operator (through DL5's read) and a District Admin each flag (201, step row,
   `claim.fraud_flagged`, state unchanged); a second flag ⇒ 409 `fraud_investigation.already_flagged`; a verifier / `pariwar_admin` ⇒ 403;
   a District Admin of another district ⇒ 403; a member with no posting ⇒ 403 for every role (G7 — recorded residual); a flag with no note
   ⇒ 400; a flagged claim still passes P1 approval (not a hold). DL5's read returns ids / states / dates only (a planted claimant name is
   absent).
4. **AC4 — The innocence finding releases and closes (DL3, DL12, N4).** API live-DB, the member seeded through real events
   (`seedLifecycleMember` — TR3): un-flagged ⇒ 409 `fraud_investigation.not_flagged`; no `alive_confirmation` / no note ⇒ 400; flagged +
   innocent ⇒ the finding row, `claim.nominee_lock_released`, `claim.closed` (`fraud_finding_innocent`, no `held_by`), the step — ONE
   transaction; THEN, for the member: a nominee re-declare succeeds (with its `nominee_change` step-up), erasure is refused only by its
   ordinary rules (`active` ⇒ `rtbf.invalid_state`, not `death_reported`), withdrawal (with step-up) and a Life Events write succeed, the
   account-frozen overlay is OFF. A member with a SECOND standing claim stays locked, the overlay stays ON, and the response lists that
   claim. An `approved` claim ⇒ finding + release, no close, `closed: false, reason: 'committed'`, the overlay stays ON. A claim whose
   `other` follow-up is open still releases (`-261` N2). Without step-up ⇒ 401 / 403 step-up.
5. **AC5 — The closure core runs (DL3).** A finding on a claim in `appeal_stage_1` with an open appeal journey, and one with a live R9
   session, closes the claim AND ends the process (`endLiveProcesses`' observable rows). A two-connection race between the finding and an
   appeal writer on the same claim ⇒ one waits, both complete, no 40P01.
6. **AC6 — The lock order is real (DL3, DL12).** Using `sendWhileHolding`: hold the intake key on a second connection, fire the finding,
   prove it WAITS (`pg_blocking_pids`), release ⇒ it commits. A SECOND INTAKE for the same member racing the finding: with the lock, the
   intake either converges before the close or mints a NEW standing claim after it — never absorbed into the closed claim (mutation: remove
   the finding's intake lock ⇒ RED). An upper-case id ⇒ the same key (TR11).
7. **AC7 — The guilty finding (DL2, DL3).** Flagged + guilty ⇒ `member_found_guilty`, `claim.member_found_guilty`, `claim.closed`
   (`fraud_finding_guilty`), step `found_guilty`; the member stays locked (AC2); the overlay unfreezes for that stream. A second finding of
   either kind ⇒ 409 `fraud_investigation.already_found`.
8. **AC8 — Idempotence and targeted conflicts (DL12).** Retrying the same request (same `step_id` / `finding_id`) ⇒ 200 with the SAME event
   version and no second event; a different `finding_id` on a found claim ⇒ 409; a planted PK collision ⇒ 500 (never "duplicate"). The
   existing `nominee-lock.spec.ts` / `nominee-determination.spec.ts` / `findInnocent` callers stay green with no assertion weakened.
9. **AC9 — OP10 and the close trigger (DL13).** A claim closed by `fraud_finding_*` is NOT labelled `closedHolderRefused`; a sibling claim
   of the same death keeps its existing OP10 behaviour; `suspicion-notice.ts` does not send `closed_after_appeal` for it (a test each).
   `ClaimClosedPayloadSchema` rejects a suspicion-trigger payload without `held_by` and a fraud-trigger payload with one.
10. **AC10 — The override door (DL9 (b)).** `overrideIntakeAttempt` onto a `closed` against-claim ⇒ refused; onto a claim whose report no
    longer stands ⇒ the door answers (a `pending-kyc` / `withdrawn` member refused as at intake); the existing override specs stay green.
11. **AC11 — Peer-mesh follows the release, and only peer-mesh (DL11).** Live-DB: a member with a claim released by innocence is ELIGIBLE as
    one of the five (`peerMeshEligibleMemberSql`) and is not labelled `no_target:peer_reported_deceased`; a member with a guilty or un-found
    claim stays excluded; `knownPeopleCallerSql` / `nominee/member-links.ts` behaviour is UNCHANGED for the released member (a test pins
    the residual). The fence (G4) lists the new fragment.
12. **AC12 — Events and audits (DL13, DL14, N6).** `CLAIM_EVENT_TYPES` +2 (READ LIVE; the pin's history comment), `STORY_6_22_CLAIM_EVENTS`
    frozen literal, `claim-registry-coverage.test.ts` updated; every payload and audit context contains no note and no name (planted value
    asserted absent on the serialized payloads).
13. **AC13 — The staff surfaces (DL10).** Admin component tests: the panel's flag and finding forms (radios not pre-selected; note and
    alive confirmation required; the other-claims list after the finding; step-up path); the helpline read + flag; the closed-claim label
    *"Closed — the member was found alive"* for `closed_member_alive` and the existing label otherwise; every refusal → copy (no raw code);
    `role="alert"` / always-mounted `role="status"`. A real-browser pass ([[project_admin_browser_pass_launcher]];
    [[project_agent_chrome_cannot_reach_localhost]] — probe once) — or recorded un-attested ([[feedback_record_unattested_no_backfill]]).
14. **AC14 — Erasure and the gate (DL15).** Live-DB as `twt_app`: `anonymizeMember` on an innocence-released member scrubs every step's
    `note_ciphertext` (rows matched > 0 — the UPDATE policy) and leaves every other column; `rtbf-anonymize.test.ts`'s three pins move
    (31 → 32, 28 → 29, 27 → 28 at `3d6b46c5` — READ LIVE) with a history comment and the table list. Every `ci:local` job green (37 / 37 at
    `3d6b46c5` — READ LIVE) on a FRESH container, DB named `twt_dev`, the story's own port ([[project_prepush_hook_inherits_5432]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST, no code** ([[feedback_governance_commits_precede_implementation]])
  - [ ] 0.1 `git fetch origin`; confirm `3d6b46c5` is an ancestor of HEAD; `git diff --name-only 3d6b46c5 origin/main -- apps packages
        scripts` — re-derive G1–G19 if anything moved (⚠ 6.39 touches `assertClaimApprovable`, `CLAIM_EVENT_TYPES`, the catalog and the
        migrations); `git log 3d6b46c5..origin/main -- .decision-log.md _bmad-output docs/launch-gate-inventory` — read any new entry; re-read
        the NUMBERS block across EVERY branch and worktree. TRACE and record here: (i) whether `peerMeshEligibleMemberSql` reaches
        `namedByClaimSql` directly or through `knownPersonEligibleSql` (DL11); (ii) the grep of G1 / DL2 (no "any finding" reader); (iii)
        every surface that renders a `closed` claim (G9 — confirm the list); (iv) 6.36 W2's and 6.23b EA10's reachability now that a finding
        exists (DL16); (v) the closure core's exported entry points and `endLiveProcesses`' inputs (DL3 step 6). Check `ListAgents` + the
        branch before every commit ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [ ] 0.2 Put DL1–DL17 to BigDev (DL0's split is answered; DL3's `alive_confirmation` values; DL6's table; DL10's label verbatim). Record
        the answers here.
  - [ ] 0.3 Draft ONE routing note from the template (by path, not copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-22-fraud-register-first-half.md` — PQ1–PQ6 + TL1–TL3;
        plain-English question first, THE ONE FACT, options with an honest cost on each, evidence LAST; E4 commands run. Status: WRITTEN, not
        sent (BigDev sends). Non-blocking for build and merge; PQ1 blocks the guilty arm's GO-LIVE; PQ3–PQ6 gate `6-22d`'s build.
  - [ ] 0.4 Decision entry (AUTHOR-COMMIT, the next free number across branches — `-433` is reserved by siblings): DL0–DL17 as answered;
        the two keys (`-195` cl. 2); cites `-238`, `-240`, `-261` D3 A, `-425` 6.38 DL4 / DL7; declares the scope split (`6-22b`, `6-22c`,
        `6-22d`, named); DECLARES the guilty arm's kept locks as a narrowing of `-423` Q1 (b) / `-424` Q2 (a) pending PQ1; declares the
        District Admin as an author-added flagger (`-238` NOT covered (iii)); supersedes no ratified entry. Committed ALONE, first.
  - [ ] 0.5 Records: the three rows `6-22b-…` / `6-22c-…` / `6-22d-…` in `sprint-status.yaml` (backlog, with comment blocks carrying DL0's
        lists verbatim); `deferred-work.md` — PQ1–PQ6 open, the `6-22b` counsel question owed, DL11's residual, DL9 (c); a go-live roster
        row or legs in `docs/launch-gate-inventory/inventory-roster.md` (READ the roster first — Row 46 is reserved by two siblings; take the
        next free row of the same shape): (a) PQ1 ruled and reflected (the guilty arm; the 6.38 helpdesk copy, G9); (b) 6.22's browser pass
        attested; (c) `6-22b`'s counsel question SENT; (d) 6.38 round-2 D1 (c); a retention-matrix row for `claim_fraud_investigation_steps`.
        An `epics.md` entry for Story 6.22 (none today — 6.20's `> ⚠ Minted by…` header shape).
  - [ ] 0.6 Ledger line + row `ready-for-dev → in-progress` ([[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [ ] **Task 1 — The records (AC1)**
  - [ ] 1.1 The findings migration (DL2) ALONE, hand-written; `CLAIM_NOMINEE_FINDING_KINDS` + the schema file's `uniqueIndex`; the fence
        allow-list unchanged (the schema file is already on it).
  - [ ] 1.2 `claim_fraud_investigation_steps` (DL1): schema file, barrel, RLS policy file + `policies/index.ts`, branded id, grants and the
        0122-shaped guard at birth.
  - [ ] 1.3 Live-DB tests for AC1 (copy the 6.21a reviews table's spec).
- [ ] **Task 2 — The writers (AC2, AC4–AC8)**
  - [ ] 2.1 DL12 on `recordMemberInnocenceFinding` (targeted conflict, idempotent retry, intake key first) — its existing tests stay green
        with no assertion weakened.
  - [ ] 2.2 The exported fraud closer in `suspicion-refusal-persist.ts` (DL3 step 6; `endLiveProcesses`); the discriminated
        `ClaimClosedPayloadSchema`, OP10's guard, the registry text (DL13).
  - [ ] 2.3 `fraud-investigation-persist.ts`: `flagClaimForFraudInvestigation`, `recordFraudFinding` (DL3, DL4); errors in `claim/errors.ts`;
        the two annotations + two triggers — tuple, payload map, reducer arms, registry, counts.
  - [ ] 2.4 Tests: AC2 (with the PQ1-named leg), AC4 (domain half), AC5, AC6 (`sendWhileHolding` — add the finding to the fixture), AC7,
        AC8, AC9.
- [ ] **Task 3 — The override door (AC10)** — DL9 (b) in `overrideIntakeAttempt`; the DELIBERATE doc block rewritten.
- [ ] **Task 4 — Keys and API (AC3, AC4, AC12)**
  - [ ] 4.1 Keys (DL6) — `SEED_PERMISSION_KEYS` with reuse-check comments, the bump block citing Task 0.4's decision (READ LIVE the
        version), grants, the two pins, `apps/admin/src/api/client.ts`; the step-up purpose constant.
  - [ ] 4.2 Contracts `packages/contracts/src/claims/fraud-investigation.ts` (`.strict()`; ⚠ new required fields break fixtures —
        [[project_contracts_tests_outside_tsc]]); `closed_member_alive` beside `closed_holder_refused`.
  - [ ] 4.3 Routes + handlers `apps/api/src/modules/claims/claims.fraud-investigation.{routes,handlers}.ts` (flag, finding, DL5's helpline
        read; district dimension via `resolveNomineeNameCheckDistrict()`; step-up on the finding) registered in `registerClaimsModule`
        (`modules/claims/index.ts`); the file in the human-actor gate's `COVERAGE_SET`
        (`scripts/claim-adjudication-human-actor-invariant/check.ts` — `{file, pathSubstrings, owner, expectedMethods}`; `COVERAGE_FLOOR`
        +1 with a history note — READ LIVE); audits (DL14).
  - [ ] 4.4 Tests: the API legs of AC3, AC4, AC12.
- [ ] **Task 5 — Peer-mesh (AC11)** — DL11's fragment in `peer-mesh-read.ts`; the two call sites; the fence's `gateSqlCopies`; the residual
      named in `known-people.ts`'s accepted-cost comment.
- [ ] **Task 6 — Surfaces (AC13)** — admin client + hooks (copy `postDeathCertificateReview`); `FraudInvestigationPanel.tsx`; the helpline
      read + flag; `closedClaimStateLabel`'s new branch; copy in each module's `i18n-en.ts`; component tests; the browser pass (or
      un-attested).
- [ ] **Task 7 — Close** — DL15 anonymize + AC14's pins; DL16's annotations in `deferred-work.md` (exact words); the code comments that say
      "no producer until 6-22" re-worded (G17 — grep `6-22` across `apps` `packages`); the 6.38 helpdesk sentence (G9) is left AS SHIPPED and
      its change tracked by the PQ1 roster leg (true for every member until a guilty finding exists in production); `ci:local` on a FRESH
      container on the story's own DB; Completion Notes, File List, Change Log; Status → review.

## Dev Notes

### Traps

- **TR1 — "Release" is NOT "erasable".** After an innocence finding, an `active` member's erasure is still `rtbf.invalid_state` (6.38 round
  4 patch 9). Assert the ordinary refusal, not success.
- **TR2 — The fence (G4) fires on the NAME.** Any new file under `apps/api/src`, `apps/jobs/src` or `packages/domain/src` that spells
  `'member_found_innocent'` or imports `CLAIM_NOMINEE_FINDING_KINDS` goes RED. `fraud-investigation-persist.ts`'s "already found" check uses
  `kind IN (…)` through `nominee-lock.ts` or the step table — never the literal. The new close triggers are named `fraud_finding_*` for this
  reason. Where a new file MUST name a kind, add it to the allow-list with a history line — never widen the scan's pattern. DL11's fragment
  lives in `peer-mesh-read.ts` (already listed) and is added to `gateSqlCopies`.
- **TR3 — Fixtures replay.** A member with zero events replays to `pending-kyc` and the door refuses it; seed through real events —
  `seedLifecycleMember(t, { pariwarId })` (`apps/api/tests/integration/_death-report-fixture.ts`) for the API legs; `seedOpenMemberStream`
  and `seedClaim` (`packages/domain/tests/integration/_helpers.ts`) for domain legs (a `seedClaim` row with no events fails
  `projectClaimState`'s replay — seed a claim WITH events, 6.38 TR2). Production has no `active` members (no `lock_in_expired` producer), so
  `active` exists only in seeded tests.
- **TR4 — RLS masks the tenant predicate.** A cross-Pariwar test as `twt_app` never exercises the SQL's own `pariwar_id` filter. Also run it
  on the test transaction WITHOUT `enterAppScope` (the superuser — `getTx()` alone), as `packages/domain/tests/integration/claim/
  death-report.spec.ts`'s "ON THE PREDICATE'S OWN — with RLS out of the way" case does (6.38 R2 P10). There is no named helper for it.
- **TR5 — The closure core is the ONLY door to `claim.closed`.** Do not emit `claim.closed` from `fraud-investigation-persist.ts`; call the
  new exported closer. Do not take the claim row before the appeal / R9 / trustee keys (`closeClaimIfDeathPaid`'s doc: *"taking `appeal:` /
  `r9:` / trustee keys AFTER the claim's row would invert the order"*).
- **TR6 — `held_by_claim_case_id` is load-bearing in OP10.** Do not fill it with the claim's own id to satisfy the schema — OP10 would label
  the claim *"the other claim for this death was later refused; the family may file again"*. Use DL13's discriminated union.
- **TR7 — The new close triggers are a schema change.** Every reader of `claim.closed` must still type-check AND behave: `suspicion-notice.ts`
  filters on its own trigger (safe — assert it); OP10 branches on `held_by`, not on the trigger (guard it).
- **TR8 — The overlay is per stream.** "Overlay OFF" after a finding holds only when no other claim stream for the member is frozen (an
  `approved` claim, a second standing claim). Assert both.
- **TR9 — Re-entrant lock.** `recordMemberInnocenceFinding` re-taking `intakeAdvisoryLockKey` inside DL3's transaction is a no-op
  (`pg_advisory_xact_lock` is re-entrant per session) — do not add a "lock must already be held" assertion that breaks its test callers.
- **TR10 — Numbers collide with siblings.** Decision `-433`, migration `0195`, catalog v57, `CLAIM_EVENT_TYPES` 38, ledger `2026-11-01c`
  and roster Row 46 are already reserved or taken by 6.39, 13-2, 14-3 or 12-2. Whichever lands second renumbers on rebase; the drizzle
  journal's `when` order matters ([[project_sibling_migration_when_order_shared_db]]).
- **TR11 — Case-normalised keys.** `intakeAdvisoryLockKey` lower-cases both ids; a raw `body.member_id` may not — probe with an UPPER-case id
  (6.38 R2 P1).
- **TR12 — A member with no posting.** The district resolver returns NULL and every role is refused (G7). Do not "fix" it with a pariwar
  fallback in this story — it is a recorded residual (AC3).
- **TR13 — "Innocent" is not "alive".** A finding is only legal with `alive_confirmation` (N1). Never let a District Admin close a claim with
  a finding on a member whose aliveness was not confirmed — that would close a genuine family's claim, silently and for good.
- **TR14 — Withholding on the wire.** DL5's helpline read and the finding's "other claims" list carry ids, states and dates only — no
  claimant name, mobile or address ([[feedback_withholding_must_be_uniform]]).

### What this story does not do

It does not collect, store or match PAN / Aadhaar / father's name; ban anyone; refer, impose, lift or terminate (`6-22d`); investigate a
death that DID happen (`6-22b`); delete anything (`6-22b`); produce `nominee_disqualified` or pay on proof of succession (`6-22c`); touch a
committed claim beyond recording the finding (`6-22c`); change `isDeathReportStanding`; change `namedByClaimSql`; add a moderation reason
code; notify a claimant or nominee; add any member-facing screen.

### Project Structure Notes

- Domain: `packages/domain/src/claim/fraud-investigation-persist.ts` (flag, finding), `claim/nominee-lock.ts` (DL12),
  `claim/suspicion-refusal-persist.ts` (the exported fraud closer), `claim/events.ts` + `claim/state.ts` (annotations, triggers, the
  discriminated payload), `claim/one-payment-per-death.ts` (OP10 guard), `claim/icp.ts` (DL9 (b)), `claim/peer-mesh-read.ts` +
  `claim/peer-mesh-request.ts` (DL11), schema `claim_fraud_investigation_steps.ts`, `policies/claim-fraud-investigation-rls.ts`,
  `ids/index.ts`, `member/anonymize.ts` (DL15), `rbac/permissions.ts`, `rbac/roles.ts`.
- Migrations: `packages/domain/migrations/` (the next free numbers; journal).
- Events: `packages/events/src/registry.ts`.
- API: `apps/api/src/modules/claims/claims.fraud-investigation.{routes,handlers}.ts`, `modules/claims/index.ts`,
  `apps/api/src/audit/audit-sink.ts`, `apps/api/src/context.ts` (field-class twin).
- Contracts: `packages/contracts/src/claims/fraud-investigation.ts`; the closed-claim bit beside `closed_holder_refused`.
- Admin: `apps/admin/src/modules/claim-verification/FraudInvestigationPanel.tsx`, `modules/claim-verification/i18n-en.ts`,
  `modules/helpline-claims/*` (+ its `i18n-en.ts`), `api/client.ts`.
- Gate: `scripts/claim-adjudication-human-actor-invariant/check.ts`.
- ⚠ Epic placement: kept in Epic 6 (the release is a claim-path fact; the row key is cited by four decisions).

### References

- Decisions: `2026-09-21-238`, `-239`, `-240`, `-241` §6; `2026-09-25-243`; `2026-09-28-261` D3, N2, `-262` FQ4; `2026-10-10-311` PM1;
  `2026-10-16-339` RF1, `-340`; `2026-10-30-423` Q1 (b); `2026-10-31-424` Q2 (a); `2026-10-31-425` 6.38 DL4, 6.38 DL7, DL12 (ii); `-195`
  cl. 2; `-121` Q2B (§8.8); `-305` §1 (c), `-421` QE6 (Trustee-Lite readings).
- Routing notes: `trustee-panel-routing-note-2026-09-21-fraud-register-what-we-keep.md`,
  `…-2026-09-21-fraud-register-how-far-the-ban-reaches.md`, `…-2026-09-20-6-20-living-member-locked.md`.
- Stories: `6-20-nominee-declaration-history-and-as-at-death-rule.md` (AC2's release route, D8, D17(c), P5);
  `6-38-death-locks-erasure-and-non-member-claims-refused.md` (N1, DL4, DL7, TR2–TR10, review rounds 1–5); `6-24` / 6.24a (the closure
  core); `6-21a` (the review table template); 10.18–10.22 (moderation, the `trustee_panel` role, the appeal — for `6-22d`).
- Code: as cited in G1–G19.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-01 | 1.0 | Created by `bmad-create-story 6.22` in its own worktree, traced at `beae5116`, pinned at `origin/main` `3d6b46c5`: the counsel-free first half of the fraud register; DL0–DL18 PROPOSED; PQ1–PQ4 + TL1–TL4; AC1–AC16. Row `backlog → ready-for-dev`; ledger `2026-11-01b`. |
| 2026-11-01 | 1.1 | Validated by `bmad-create-story validate 6.22` (five read-only verifiers, each critical re-read by hand at `3d6b46c5`); BigDev: split → new row `6-22d`, apply all. The refer / impose / lift chain, termination and the member ban move to `6-22d` (as designed they barred no one — sign-up is unreachable for an existing mobile — went beyond `-240` cl. 3, and let `super_admin` impose and lift, `-240` cl. 5's named collapse). The close now runs through the shipped closure core (its lock order and `endLiveProcesses`) with discriminated `fraud_finding_*` triggers (OP10 joined on `held_by`); a finding requires the member confirmed alive; the guilty arm is a DECLARED narrowing (PQ1, go-live); peer-mesh-only release (`namedByClaimSql` gates nominee links and "People who know me"); a helpline read for the flag; the override door built; the vacuous erasure race replaced by the intake race; PQ2 narrowed to the nominee; PQ3–PQ6 added for `6-22d`; numbers, pins, file homes and closure words corrected. Ledger `2026-11-01d`. |
