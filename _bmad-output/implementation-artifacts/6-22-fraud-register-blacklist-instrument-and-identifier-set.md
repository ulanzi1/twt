---
baseline_commit: 91ea2c81
---

<!--
PINNED: `91ea2c81` = `origin/main` (`git fetch origin` 2026-11-01 — Stories 11b.5a (PR #319) and 12.2 (PR #320) landed; the branch was
REBASED from `3d6b46c5` onto it, ledger-only conflict). The traces ran at `beae5116`, were re-run at `3d6b46c5` (v1.1) and again at
`91ea2c81` (v1.3) by five read-only verifiers each time (governance + records; the claim / finding / closure substrate; the overlay,
peer-mesh and erasure; RBAC, routes and surfaces; the footgun catalogue), each critical re-read by hand. No file under
`packages/domain/src/claim/`, the overlay, the directory, the helpline or step-up changed between the two pins; rbac, `anonymize.ts`
(pins unchanged) and the `ids` / `policies` / `schema` barrels did. Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/6-22-fraud-register-blacklist-instrument-and-identifier-set`, branch
`story/6-22-fraud-register-blacklist-instrument-and-identifier-set`. Its upstream is UNSET — it does NOT track `origin/main`; push with an
explicit refspec ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — the main checkout was not switched).
Re-locate every code claim by FUNCTION, not by line number — line numbers rot.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the BEHAVIOUR
is the Panel's and is RULED — `2026-09-21-238` (the release; blacklisting; two outcomes only), `2026-09-21-240` (what is kept, how far the
ban reaches, who imposes and lifts), `2026-09-28-261` D3 A (the lock is lifted ONLY by the investigation's finding), `-262` FQ4 (go-live
may precede the release). WHAT this story builds, WHERE the record lives and WHO holds each key are the AUTHOR's (DL — BigDev at Task
0.2). Nine edges the ruled words do not decide — or that this build NARROWS — are the Panel's: PQ1–PQ9 in ONE note (Task 0.3). PQ1 is a
DECLARED NARROWING carried from 6.38 and is a GO-LIVE condition for the guilty arm; PQ7 (what an open flag does to approval — `-263` FQ10
already made a neighbour's *"they have not died"* a WARNING, and `-304`'s (unratified) reading says making any other answer gate a claim
*"changes who is paid"*) and PQ8 (notice, appeal and re-filing after a found-alive closure — the Panel has ruled both ways on a closure
notice, `-291` Q2 B and `-318` Q3 A) are GO-LIVE conditions for the flag and the close; PQ9 (what proof that the member is alive lets
staff close a claim) is a GO-LIVE condition for the finding; PQ3–PQ6 are asked now so row `6-22d` is built on rulings. The flag is seeded
on the helpline operator ONLY, so the ruled two-actor chain (*"operator flags → District Admin verifies"*) is kept, not narrowed (DL4).
⚠ The IDENTIFIER SET (`-238` cl. 6 — PAN and Aadhaar of nominee and claimant) is COUNSEL-GATED and counsel has not been asked (G15) — this
story does not build it (DL0).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. Where a negation decides what the dev builds, the
sentence is written in plain words. No `file:NNN` into `.decision-log.md`, `deferred-work.md`, `sprint-status.yaml` or
`inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or the row key. Bare `DLn` means THIS
story's; another story's is written `6.38 DL7`, `6.20 D8`.

NUMBERS: not claimed by this file — every number it takes is "the next free one" at the commit that takes it, READ LIVE across every
branch and worktree (TR10 holds the 2026-11-01 snapshot).

LETTERS: **G** = found facts (G1–G21); **N** = invariants (N1–N7); **DL** = build decisions (DL0–DL17 — ALL ANSWERED at Task 0.2,
2026-11-01; DL16's EA10 row re-trace-then-decide); **PQ** = Panel questions (PQ1–PQ9) + **TL** = lines the note TELLS the Panel (TL1–TL2); **TR** =
traps (TR1–TR16); **AC1–AC14**.
-->

# Story 6.22: The Fraud Register, First Half — Staff Investigate a Death Claim Filed Against a Living Member; an Innocent Member Is Released at Once and the False Claim Is Closed

Status: done

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled on 2026-09-21 that a death claim filed against a member who is **alive**
> must not lock that member for life: an **investigation** finds the member **innocent** or **guilty**, and there is no third outcome
> (`-238` cl. 1, cl. 4). Innocent ⇒ the member is released **immediately**. Guilty ⇒ the member is **terminated and blacklisted** through a
> chain the Panel set: the operator **flags**, the District Admin **verifies**, the Pariwar Admin **refers**, the **State Trustee imposes**,
> the **Super Admin may lift** (`-238` cl. 3 as amended by `-240` cl. 5). Three shipped stories have built locks that wait on that finding,
> and nothing writes it yet: 6.20's nominee lock, 6.38's erasure / withdrawal / Life Events locks (one leaf predicate,
> `isDeathReportStanding`), and the peer-mesh anchor (`-339` / `-340`). Today a living member wrongly reported dead is frozen out of all of
> them with no way out. **This story builds the investigation up to and including its finding**: the flag (the helpline operator — the
> ruled flagger), the District Admin's finding — which requires that the member was confirmed ALIVE, by a different person from the
> flagger — the release (the existing writer, hardened), the false claim CLOSED through the shipped closure core, and the guilty finding
> RECORDED (the claim closed — unless it was already approved or settled, which this story does not stop (row `6-22c`); the member's death locks kept AND the account held frozen by a sticky freeze, so a
> member found guilty never reads "Active" — N7).
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
- The helpline's per-member claim reads (G8): `listLiveClaimsForDeceasedMember` (`claim/read.ts`) behind
  `GET …/admin/members/:memberId/death-certificate/claims` (6.21b D5, `getClaimsForMember`), `…/appeals` and
  `…/nominee-corrections/claims` — ids, states and dates, no PII, pariwar-dimension. DL5's read is built in THIS shape.
- `readClosedHolderRefusedBulk` (`claim/one-payment-per-death.ts`) and its three SAVEPOINT call sites — the shape of DL10 (iii)'s
  `closed_member_alive` read. The shared `StepUpPanel` (`apps/admin/src/modules/workplaces/StepUpPanel.tsx`, reused by 12.2).

## Story

As **a member who has been wrongly reported dead, and the helpline operator and District Admin who look into such a report**,
I want **a recorded investigation that ends in one of the two findings the Panel ruled — and only once the member has been confirmed alive:
innocent, which releases every lock on the member at once and closes the false claim; or guilty, which closes the false claim and records
the finding the Pariwar Admin will later refer**,
so that **a living member is no longer frozen out of their own record for ever by someone else's lie, and a claim found to be about a
living member is stopped**.

> ⚠ **What this story does NOT yet guarantee — two kinds of claim on a living member can still be paid:**
> 1. a FLAGGED claim that has no finding yet moves through approval and can reach payment — the flag gates nothing until the Panel rules
>    what an open flag does to approval (PQ7, a go-live condition; N5 is the one home of this rule). Every approval still needs a completed
>    ground inspection (`-263` FQ9), the backstop in the meantime;
> 2. a claim ALREADY `approved` / `settled` when the member is found alive is NOT closed — the finding is recorded and an innocent member
>    released, but the claim goes on to payment, or was already paid (row `6-22c`; DL3 step 6 names it in the response).

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-09-21-238` cl. 1 | *"A claim filed against a member who is **alive** does ⛔ not lock that member's declaration for life. On investigation finding the member **innocent**, the declaration **unlocks immediately**."* | Trustee-ratified (DR + KB) |
| `-238` cl. 4 · cl. 5 | *"TWO OUTCOMES ONLY. An investigation finds the member **innocent** or **guilty**. ⛔ No third outcome."* · guilty ⇒ *"terminated and blacklisted … along with nominee and claimant (if nominee and claimant are different person)"*. | Trustee-ratified — cl. 4 here; cl. 5 ⇒ `6-22d` (member) / `6-22b` (filers) |
| `-238` cl. 3 (as amended) | *"operator flags → District Admin verifies and confirms → escalate to Pariwar Admin → ~~Pariwar Admin imposes~~"* — only the last step REPLACED by `-240` cl. 5 (*"it replaces that step"*). Kept, not re-read ([[feedback_supersede_never_reinterpret]]). | Trustee-ratified, partly superseded |
| `-238` cl. 6 + COUNSEL GATE | *"PAN and Aadhaar of nominee and claimant are to be collected on the filing form and 'will be served as unique identifier'."* — *"WHAT IS COUNSEL-GATED, AND ⛔ MUST NOT BE BUILT BEFORE IT CLEARS: The whole identifier set of cl.6."* — its three questions (abridged): (a) §17(1)(c) indefinite retention about NON-members, (b) whether a UID token can be obtained at all, (c) Aadhaar Data Vault obligations. | Trustee-ratified; ⚠ counsel-gated — not cleared (G15) ⇒ `6-22b` |
| `-238` NOT covered | (i) whether the **nominee** is blacklisted automatically or only on a finding they conspired; (ii) how a NON-member is sanctioned — *"The blacklist must therefore key on an identifier, ⛔ not on `member_id`"*; (iii) who may originate the flag. | not ruled — (i) is PQ2; (ii) `6-22b`; (iii) for a LIVING member the ruled chain's words name the operator (kept, DL4); the post-death originator is `6-22b`'s, to be put to the Panel |
| `2026-09-21-240` cl. 1 | *"RETENTION — only the guilty are kept … where a claim closes with ⛔ **no** finding of fraud they are **deleted**."* · *"the register holds the guilty, ⛔ never everyone who ever claimed"*. | Trustee-ratified — nothing to delete today (G14) ⇒ `6-22b` |
| OUT OF SCOPE HERE — rulings for rows `6-22b` / `6-22c` / `6-22d` | `-238` cl. 2 (blacklisting: never joining or re-joining, indefinite, not appealable, the Super Admin may lift) and its named narrowing of §8.8; `-240` cl. 2 (reach: filers only, a banned nominee caught when they come forward) · cl. 3 (only an EXACT identifier bars automatically; a name / DOB / father's-name match raises a human review) · cl. 4 (the honest co-nominee takes all; succession proof) · cl. 5 (Trust-wide; the Pariwar Admin refers, the State Trustee imposes, the Super Admin may lift) · cl. 6 (a ban only after the same investigation — the post-death-rewrite case) · Consequence 5 (the `state_trustee` rank-order wall — an engineering fact recorded in a ratified entry, not a ruling); `2026-09-25-243` cl. 1–2 (a death certificate is not an identity document; kept as long as claim records are). Quoted verbatim where used — PQ2–PQ6, DL0. | Trustee-ratified ⇒ `6-22b` / `6-22c` / `6-22d` |
| `2026-09-21-241` §6 · Consequence 3 | *"Story 6.20 builds the **unlock mechanism and its outcome**; the **finding that fires it arrives from `6-22`**."* · *"`6-22` … owes 6.20 the innocent/guilty finding that drives the release route."* | author-commit (6.20) |
| `2026-09-28-261` D3 A · N2 | *"WAIT FOR THE FRAUD REGISTER. A living member locked by a wrong claim is unlocked only by the investigation's finding … Our reading (B — let staff record 'this member is alive' now) was ⛔ NOT taken."* · N2: *"`other` … ⛔ does not block the living member's unlocking"*. | Trustee-ratified — ⚠ the finding must be an INVESTIGATION's (N1) |
| `2026-09-28-262` FQ4 | *"GO-LIVE MAY GO AHEAD BEFORE A WRONGLY LOCKED LIVING MEMBER CAN BE UNLOCKED."* | Trustee-ratified ⇒ this story is not a go-live condition for the release |
| `2026-10-16-339` RF1 C · `-340` | *"The first filing counts, unless an investigation found the member innocent of a claim filed while they were alive."* · the anchor excludes a claim carrying `member_found_innocent`. | Trustee-ratified · author-commit — readers that START working when this lands |
| `2026-10-10-311` PM1 (+ the row's 2026-10-12 pointer) | members *"with a claim filed for their own death"* are filtered from the five; *"⚠ The exclusion STAYS even after such a release — a known residual; whoever builds this row's release decides whether the peer-mesh exclusion follows it."* | author-commit ⇒ DL11 |
| `2026-10-30-423` Q1 (b) A | *"**A false report.** Once the report is closed because the member is alive, erasure is possible again."* | Trustee-ratified ⇒ PQ1 (the guilty arm narrows it) |
| `2026-10-31-424` Q2 (a) A + reading | withdrawal *"lifted on the same terms as erasure"*; reading (not ratified): *"the report closed because the member is alive" = the fraud register's innocence finding … `-238` cl. 4's GUILTY arm is 6-22's to put.* | Trustee-ratified + reading |
| `2026-10-31-425` 6.38 DL4 · 6.38 DL7 · DL12 (ii) | *"Releasing on INNOCENCE ONLY narrows `-423` Q1 (b)'s 'closed because the member is alive' (a guilty-but-alive finding) — 6-22 must put that to the Panel or justify it."* · two residual edges (a released claim still a convergence candidate; `overrideIntakeAttempt` with no door). · the export's step-up does not prove the nominee. | author-commit (6.38) ⇒ PQ1, DL9 |
| `2026-09-08-210` (WHAT IS NOT DELEGATED) · `-195` cl. 2 | `-210` (Trustee-ratified) delegates minting enum values but leaves *"anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key"* — and *"the closure-language vocabulary"* — OUTSIDE the delegation: a key is minted only in a recorded decision (`-421` QE6, `-433` QE2 precedents); `-195` cl. 2 (author-commit) is the one-key precedent. | ratified (`-210`) ⇒ Task 0.4; DL16's three labels |
| `2026-08-21-147` cl. 3 (THE ACCOUNT-FROZEN STANDING FENCE, widened) | *"Any future change that introduces a new **source/reason** for account-frozen must re-examine the directory exclusion predicate and the ratified member-facing sentence, and route the resulting policy question if necessary."* — it names *"a reversed or erroneous claim"* among the reasons it reaches. | Trustee-ratified ⇒ FIRES on DL13 (N7) — Task 0.4 records the re-examination |
| `2026-10-10-304` "Our reading — ⛔ NOT RATIFIED" | *"A staff-added question is ⛔ never a WARNING or a FLAG. Only `-263` FQ10 … and `-262` FQ8 E … raise warnings; making any other answer gate, delay or flag a claim changes who is paid"* — that stays the Panel's. | author READING for its "changes who is paid" sentence (its first sentence was ratified for chain questions by `-310` CF3 (b)) ⇒ PQ7 rests on §0, not on this line |
| `2026-10-11-318` Q3 A · `2026-10-12-321` | *"⛔ No text when a claim is closed this way. The app already shows 'This claim has been closed. Please call the helpline.'; helpline staff see 'Closed — another claim for this death goes ahead' (or, once the holding claim is itself later refused, that the family may file again)."* · `-321` narrows the parenthetical: only once ⛔ no other claim for the death is still in progress. | Trustee-ratified ⇒ PQ8 (a), DL10 (v)'s OP10 label |
| `2026-10-07-291` Q2 B | when an allowed appeal closes the TRUE NOMINEE's claim, *"she is texted once"* — *"Your claim for [member] has been closed. Please call the helpline."* (to the nominee's declared mobile; its §0: a message to *"a person who never agreed to be contacted"* is the Panel's). | Trustee-ratified ⇒ PQ8 (a) |
| `2026-10-30-422` Q1 A | *"A Pariwar Admin approves a new version, acting for the State Trustee"* — the Panel's only ruling on who acts for the State Trustee; its §0: who acts for a ruled actor is the Panel's. | Trustee-ratified ⇒ PQ5 |
| Niyamavali §8.8 (ratified by `-121`; its hearer rule is Q2B) · §8.4 · §8.5 · §2.5 | §8.8 *"each is separately appealable"* — ratified; §8.4 termination *"subject to the [[12-month]] rejoin lock"*; §8.5 grounds 1–3 *"Forged documents … Identity fraud … Financial fraud"*; §2.5 the re-join lock's key is an *"Aadhaar HMAC"* (the code uses a MOBILE blind index). "Blacklist" / "ban" appear nowhere. Apart from §8.8, a rulebook, not ratified ([[feedback_niyamavali_rulebook_not_spec]]). | §8.8 ratified; the rest the Policy-meaning check only |

## 📜 Policy meaning (AI-10-1)

**This story gives a shipped, inert predicate its first producer (1), keeps a declared narrowing of it (2), introduces a predicate that ends
a family's claim (3), changes one selection predicate (4), and builds a flag that gates nothing until the Panel rules (5). The ban at
joining is NOT built here — its Policy-meaning note is owed by row `6-22d`.**

1. **The release (shipped by 6.20 / 6.38; this story writes its first finding).** *In the member's terms:* **"If someone reports you dead
   while you are alive, your record stays locked — you cannot change your nominees, your address or your posting, leave the Trust or have
   your data erased — until the District Admin, having confirmed you are alive and looked into the report, records that you were not part
   of it; from that moment all of it unlocks at once and the false claim is closed."**
   - ⚠ *Also true:* EVERY claim filed about you needs its own finding — a second false report keeps you locked until it, too, is looked
     into (the predicate is "ANY standing report", G3); and your account stays marked frozen while any other claim for your death is still
     open (G5) — including a claim that had already been approved when you were found innocent (it is not closed — `6-22c`).
   - ⚠ *Also true:* "unlocked" means the ordinary rules apply again — e.g. an `active` member still cannot have their data erased (TR1).
2. **A member found GUILTY stays locked AND stays marked as reported dead (6.38's declared narrowing, kept — PQ1).** *In the member's
   terms:* **"If the investigation finds you took part in a false report of your own death, the claim is closed — unless it had already been
   approved or settled, which this story does not stop (row `6-22c`) — and your record stays as it was while the report stood: you cannot leave the Trust or have your data erased, you stay off the
   Member Directory, and — like any frozen account — you are not sent the urgent text announcing a new contribution cycle."** This NARROWS
   `-423` Q1 (b) (*"closed because the member is alive"*) and `-424` Q2 (a); it is declared in Task 0.4, put to the Panel as PQ1, and is a
   go-live condition for the guilty arm. It is also a new REASON the account stays frozen, so `-147` cl. 3's fence fires (Task 0.4).
3. **A claim closed because the member is alive (NEW — pending PQ8, PQ9).** *In the claimant's terms, as BUILT:* **"If the Trust's
   investigation confirms, in person, by video or by a ground inspection, that the person your claim names is alive, your claim is closed;
   you are not sent any message — the app shows the claim as closed, with 'please call the helpline', when you next open it — you cannot
   appeal, and you may file again; a new claim needs its own investigation."** What proof of life suffices (PQ9), the notice, the appeal
   and re-filing (PQ8) are the Panel's; the built side is a go-live condition, not a ruling.
4. **Peer-mesh selection (CHANGED — DL11).** *In the member's terms:* **"If you were wrongly reported dead and found innocent, you can again
   be one of the five people asked to confirm a colleague's death."** (Only peer-mesh: "People who know me" and nominee links still treat
   you as reported — a named residual, DL11.)
5. **An open flag (NO predicate today — pending PQ7).** *In the family's terms:* **"A staff flag on your claim, as built, changes nothing
   about how it is decided or paid."** If PQ7 is ruled A (a wait) or B (a warning), the flag becomes a predicate on the family's payout and
   its Policy-meaning note is owed with that build.

**Checked against the Niyamavali** (the git-ignored copy in the main checkout, `docs/legal/niyamavali.md`, 2026-11-01) — result:
- 1, 2 — §8.5 CONSISTENT (a false report of one's own death is grounds under ground 3 at least, and ground 1 where a document was forged);
  otherwise SILENT on a member wrongly reported dead — `-238` cl. 1 / `-261` D3 A are the instrument. 2's narrowing is of `-423` / `-424`,
  not of the rulebook.
- 3 — SILENT: no clause speaks to closing a claim because the subject is alive, or to proof of life; §8.8's appeals reach moderation acts,
  not claim closures. The notice, appeal and proof standard are put to the Panel (PQ8, PQ9), not told.
- 4 — SILENT (the five are a `-311` construct).
- 5 — SILENT; the Panel's own rule for "someone says the member is alive" is `-263` FQ10's warning (PQ7).

## ⭐ THE INVARIANTS

**N1 — A finding is an investigation's outcome, and it requires the member confirmed ALIVE.** A finding (innocent | guilty) can be recorded
ONLY on a claim that carries a `flagged` step and no `found_*` step, by a holder of `claim.record_fraud_finding` (seeded on
`district_admin`; `super_admin` derives it) who is NOT the person who flagged it, with a note AND an `alive_confirmation` (DL3; its
values are PQ9's) — never a bare staff "alive" mark (`-261` D3 A rejected exactly that). A flag on a claim whose member is in fact dead
simply never receives a finding; the claim proceeds (the post-death cases are `6-22b`). One investigation per claim, ever; its steps are
append-only.

**N2 — Two outcomes only.** `member_found_innocent` (existing kind) or `member_found_guilty` (NEW kind) in `claim_nominee_findings` — at
most ONE member finding per claim, of EITHER kind (the partial unique index WIDENS to both kinds — DL2). No "inconclusive", no "withdrawn".

**N3 — The leaf predicate is UNCHANGED.** `isDeathReportStanding`'s body keeps releasing on `member_found_innocent` ONLY. There is no second
copy of the release rule anywhere — every new reader goes through the leaf's own SQL fragment (DL3's `listStandingDeathReports` shares it)
or is a named copy on the fence's lists (TR2).

**N4 — Finding + close is ONE transaction, in the closure core's lock order.** `recordFraudFinding` takes intake → appeal → R9 → trustee
keys → the claim row (the closure core's order), writes the finding (innocent: the hardened `recordMemberInnocenceFinding`; guilty: the new
`recordMemberGuiltFinding`, both in `nominee-lock.ts`), the `found_*` step, and — if the claim is CLOSABLE — `claim.closed` through a NEW
exported closer in the closure core, which runs `endLiveProcesses`. Triggers: `fraud_finding_innocent` / `fraud_finding_guilty` (DL13).
An `approved` / `settled` claim is not closable: the finding is still recorded (an innocent member is still released) and the claim is left
for row `6-22c` (DL9).

**N5 — A finding closes its own claim when that claim can be closed; nothing else stops a claim (the ONE home of this rule).** After a
finding the claim is `closed` (terminal) — or, if already `approved` / `settled`, NOT stopped by this story: recorded for `6-22c` and
named in the response (it goes on to payment, or was already paid). Before a finding, nothing stops any claim: the flag gates nothing
(built side of PQ7 — a go-live condition). No finding writer ever moves money or a pool. Other sections point here rather than restate it.

**N6 — No Tier-1 in events, logs or audits.** Every staff note (flag, finding) is a Tier-1 ciphertext; events and audit contexts carry ids,
outcome, `alive_confirmation` and reason codes only.

**N7 — A guilty finding never lets the account read "alive, normal" while it keeps the death locks.** For every claim stream carrying
`claim.member_found_guilty`, the account overlay reads FROZEN in all three readers (`getMemberAccountOverlay` / `evaluateAccountOverlay`,
`directory-read.ts` `NOT_DECEASED`, `listAccountFrozenMemberIds`) whatever follows it on that stream — `claim.closed`,
`claim.denied_no_appeal`, `claim.settled` — so a member found guilty is never shown as "Active" on the public Member Directory (DL13's
STICKY freeze is the one home of the mechanism). ⚠ Outside this story the leaf and the overlay ALREADY disagree by design: `claim.settled`,
`claim.denied_no_appeal` and the suspicion / paid-death closes unfreeze the overlay while the leaf (ANY state) still stands — N7 does not
change that; and an innocent finding on an `approved` claim leaves the locks OFF and the overlay ON (`6-22c`). If PQ1 is ruled A, the leaf
and the sticky freeze flip TOGETHER — ⚠ across SIX hand-written SQL copies of the release rule plus the constant, ⛔ one (DL8, amended by the
code review of 2026-11-02, RA2; `release-rule-agreement.spec.ts` goes red if one is changed alone).

## Found facts (traced at `beae5116`; re-verified at `3d6b46c5` and `91ea2c81`)

- **G1 — The finding table and its writers exist; no production caller.** `claim_nominee_findings` (`0119`): `finding_id` (PK, producer-
  supplied, no default), `claim_case_id` (FK `claims`, `ON DELETE cascade`), `pariwar_id`, `kind` (text CHECK
  `claim_nominee_findings_kind_check`), `rank` (CHECK `claim_nominee_findings_rank_coherence_check`, verbatim: `("kind" =
  'member_found_innocent' AND "rank" IS NULL) OR ("kind" = 'nominee_disqualified' AND "rank" IS NOT NULL AND "rank" IN (1, 2))` — the `IS
  NOT NULL` is load-bearing: a CHECK passes on NULL), `recorded_by_actor_id`, `recorded_by_display`, `recorded_at`. Partial unique
  `claim_nominee_findings_one_innocence_per_claim_uq ON (claim_case_id) WHERE kind = 'member_found_innocent'` + a per-rank
  disqualification unique index. GRANT SELECT, INSERT only; RLS forced; NO reject-mutation trigger (a `claims` delete cascades into it
  freely). The CHECKs live ONLY in SQL (the TS schema has no `check()`; drizzle snapshots stop at `0020`) — a migration touching them is
  HAND-WRITTEN. Writers in `claim/nominee-lock.ts`: `recordMemberInnocenceFinding`, `recordNomineeDisqualificationFinding`. Callers: TESTS
  only (`nominee-lock.spec.ts`, `findInnocent` in `_death-report-fixture.ts`, `nominee-determination.spec.ts`; others seed RAW rows).
  `CLAIM_NOMINEE_FINDING_KINDS` is defined in the schema file and imported nowhere in `src`. No reader filters on "any finding" or `kind
  <> 'nominee_disqualified'` — the leaf and its copies use `= 'member_found_innocent'`.
- **G2 — The four writer defects ("deferred to Story 6-22").** (a) both writers use an UNTARGETED `.onConflictDoNothing()` — a PK collision
  reads as `duplicate`; (b) a same-`finding_id` retry is not idempotent (it throws `duplicate`); (c) `recordNomineeDisqualificationFinding`
  takes a `Db`, emits no claim event, has no state window and no rank-exists check; (d) the innocence writer locks the claim row but not the
  intake advisory lock — while every 6.38 consumer of the leaf (erasure, withdrawal, declare, intake) serialises on that lock FIRST. Its
  input (`RecordClaimNomineeFindingInput`) carries `claimCaseId` + `pariwarId` but NO deceased member id; it has NO state window (it records
  on any claim state); signature `(client: pg.PoolClient, input)` → `{ eventVersion }`.
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
  `packages/domain/src` only: (i) where the gate SQL may appear (`gateSqlCopies` — an EXACT `{ file: count }` map: `death-report.ts` 1,
  `approval-warnings.ts` 3, `peer-mesh-read.ts` 1; its structural regex is
  `NOT\s+EXISTS\s*\([\s\S]{0,400}?f\.kind\s*=\s*'member_found_innocent'` — the findings alias must be `f`); (ii) an EXACT allow-list of
  files that may contain the literal `'member_found_innocent'` or `CLAIM_NOMINEE_FINDING_KINDS` (`findingKindLiteralFiles`:
  `death-report.ts`, `approval-warnings.ts`, `peer-mesh-read.ts`, `nominee-lock.ts`, the schema file). The pattern does NOT match
  `member_found_guilty`; migrations, contracts and admin are out of its reach; `known-people.ts` and `peer-mesh-request.ts` are on neither
  list (TR2). Any index predicate or SQL that spells `'member_found_innocent'` (in any quote style) outside the five files goes RED.
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
  of `claim.closed` (`packages/events/src/registry.ts`) names `held_by_claim_case_id`. The private `closeLockedClaim(client, db, input,
  row)` takes a REQUIRED `causeClaimCaseId` and ALWAYS writes `held_by_claim_case_id: input.causeClaimCaseId`; its `trigger` is typed
  `ClaimClosedTrigger`. `closeClaimIfDeathPaid` takes NO keys — it expects them held (*"taking `appeal:` / `r9:` / trustee keys AFTER
  the claim's row would invert the order"*). `appealAdvisoryLockKey`, `r9VotingAdvisoryLockKey` and `stateTrusteeDecisionAdvisoryLockKey`
  are keyed by (pariwar, claim id) and hash the ids RAW — unlike `intakeAdvisoryLockKey`, they do not lower-case (TR11).
  `endLiveProcesses` → `endCorrectionRun` re-takes the trustee key with the row's id. `claim.denied_no_appeal` is an identity annotation
  on a `denied` claim that UNFREEZES the overlay (G20). OP10's join is NULL-safe for a payload with no `held_by` — the reachable case is
  the REVERSE direction: a claim R closed `suspicion_appeal_allowed` with `held_by = C`, where C is later fraud-closed — OP10 then labels R
  *"the other claim … was later refused; the family may file again"* about a member found alive (DL13).
- **G6 — No "alive" fact anywhere else.** The finding row is the only "alive" fact; "investigation" appears only in comments. The closest
  shipped mechanism is 6.24a's suspicion refusal (the closure core's own callers).
- **G7 — Who may flag and find, and in which dimension.** Claim routes are `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/<action>`,
  district-dimension via `resolveNomineeNameCheckDistrict()` (defined in `claims.nominee-name-check.routes.ts`; imported by 7 route
  files) — it reads `claimCaseId` FROM THE ROUTE PARAMS (`getClaimCase`), so it cannot gate a member-keyed route. Every helpline-operator
  per-member read and write is checked at PARIWAR dimension (`…/members/:memberId/death-certificate/claims` on `claim.file` — *"the
  operator is ⛔ not district-scoped"*; `…/appeals`; `claim.raise_nominee_correction` *"Checked at `dimension: 'pariwar'`"*). A
  pariwar-ceiling grant (`helpline_operator` — which already holds the district-dimension key
  `claim.view_nominee_name_check`) contains any resolved district target. ⚠ The resolver stashes `posting?.district ?? null`, and
  `scopeContains` returns false on a NULL target for everyone, `super_admin` included (`resolveQueueScopeStash`'s doc) — a member with no
  posting cannot be FOUND (the finding is district-dimension — residual, AC4); the flag is pariwar-dimension (DL6) and is unaffected.
  `role_grants` has no unique constraint on (user, role): ONE person may hold both a `helpline_operator` and a `district_admin` grant.
- **G8 — The helpline already lists a selected member's claims — but not ALL of them.** `HelplineClaimPage` (search → read-back → intake)
  mounts four per-member sections (`HelplineNomineeCorrection`, `HelplineCertificateReplacement`, `HelplineAppeal`, `HelplineClaimContact`,
  each `memberId={selected?.memberId ?? null} identityConfirmed={identityConfirmed}`), backed by member-keyed GETs —
  `…/admin/members/:memberId/death-certificate/claims` (6.21b D5, `getClaimsForMember`, `claim.file`, audited
  `admin_death_certificate.claims_read`), `…/appeals`, `…/nominee-corrections/claims` — on `listLiveClaimsForDeceasedMember(db, pariwarId,
  deceasedMemberId, { includeClosed })` (`claim/read.ts`): ids, states, `createdAt`, no PII, `.limit(10)`, and it DROPS `settled` /
  `denied` (`closed` only with `includeClosed`). The leaf counts a claim in ANY state — so a member locked by a `denied` false claim never
  appears in today's lists. `helpline_operator` lacks `claim.verify`, so the verifier console is closed to it.
- **G9 — The closed-claim staff label is trigger-blind.** `apps/admin/src/modules/claim-verification/i18n-en.ts` `claimStateLabels.closed`
  = *"Closed — another claim for this death goes ahead"* (and a second `closed:` entry, "… goes ahead."), rendered through
  `closedClaimStateLabel` at `HelplineAppeal`, `HelplineCertificateReplacement`, `HelplineClaimContact`, `NomineeRefusalsRoute`. The
  contracts carry no trigger (`closed_holder_refused` is the only extra bit) — on THREE `.strict()` DTOs (`contracts/claims/nominee-
  declaration.ts` `NomineeRefusalItem`, `death-certificate.ts` `DeathCertificateHelplineClaimStatus`, `appeal.ts`
  `HelplineAppealClaimsResponse.claims[]`), each filled by `readClosedHolderRefusedBulk` under `underSavepoint` (degrading to an empty
  set) in three handlers (`claims.nominee-declaration.handlers.ts`, `claims.death-certificate.handlers.ts` `getClaimsForMember`,
  `claims.appeal.handlers.ts` `getHelplineAppealClaims`); `closedClaimStateLabel(closedHolderRefused, claimState)` has exactly the four
  callers above. The mobile closed copy (`apps/mobile/lib/closed-helpline- copy.ts`) is generic and stays true: the member app shows the
  filer the calm *"closed — please call the helpline"* screen when the claim read carries `claim_closed` — no message is sent, but the
  closure is SHOWN. The 6.38 helpdesk copy (`apps/admin/src/modules/helpdesk/i18n-en.ts`, the erasure refusal) says *"only a finding that
  the member is alive lifts it"* — false for a guilty-alive member (PQ1).
- **G10 — Intake convergence and the override.** `getConvergenceCandidate` (`icp.ts`) filters out `CLAIM_TERMINAL_STATES = ['settled',
  'denied', 'closed']` (`claim/read.ts`) — a closed claim is not a candidate. `overrideIntakeAttempt` (`icp.ts`) checks only that the attempt
  is `pending` and `assertRefileAllowed`; `overrideConvergence` (`claims.convergence.handlers.ts`) checks only that the against-claim exists
  and is for the same death — NEITHER refuses a `closed` target or runs the door, and the handler's catch maps ONLY
  `translateRefileRequiresConfirmation` (`ClaimIntakeRefusedError` is mapped by `translateClaimIntakeRefused`, `claims.service.ts`, called
  from `initiateIntake` alone — a door refusal here would be a 500). TWO DELIBERATE doc blocks say *"Re-examine when row 6-22 writes
  `member_found_innocent`"* — `overrideIntakeAttempt`'s and `convergeIntakeAttempt`'s (*"a new report CONVERGES onto the released
  claim"*). `confirmMerge` checks `getConvergenceCandidate` BEFORE the intake lock and `convergeIntakeAttempt` does not re-check the
  state. A self-closed claim leaves `assertRefileAllowed` keyed on a closures row only, so the family can re-file.
- **G11 — Keys.** `SEED_PERMISSION_KEYS` + `PERMISSION_CATALOG_VERSION` (57 at `91ea2c81` — 12.2's `module.manage`;
  `packages/domain/src/rbac/permissions.ts`, a "Bumped N → N+1" history note per bump), grants in `rbac/roles.ts`, pins in
  `packages/domain/tests/rbac/permissions.test.ts` (`toBe(57)`, `toHaveLength(75)`) and `roles.test.ts` (`toHaveLength(13)`; exact
  holder sets pinned as `expect(holdersOf('claim.determine_nominee_declaration')).toEqual(['district_admin', 'super_admin'])`). No
  migration seeds permissions. `apps/admin/src/api/client.ts` has NO permission-key list (keys appear there only in comments). Keys sit
  OUTSIDE `-210`'s delegated mint and are minted only in a recorded decision (`-421` QE6, `-433` QE2). `super_admin`'s bundle is
  `permissions: PERMISSION_CATALOG.keys` — it auto-derives every key (⚠ relevant to `6-22d`, PQ5).
  Step-up purposes are FREE strings (`requireStepUp(deps, actionContext: string)`, ≤ 128 chars — *"⚠ THERE IS NO STEP-UP CONTEXT
  REGISTRY"*); the precedent is one exported constant shared by the route and the admin OTP caller (`MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT`,
  `contracts/memorial/takedown.ts`). `requireStepUp` throws `StepUpRequiredError` = 403 `auth.step_up_required`. The shared admin
  step-up UI is `StepUpPanel` (`modules/workplaces/StepUpPanel.tsx` — `needsStepUp`, `holdOnce`, `useHoldGenerations`; 12.2's
  `ModuleDetailPage` reuses it); admin step-up works for any admin session (the `adminStepUpDelivery` stub). Admin actors' display
  names come from `users.display_name` via `resolveDisplay` (`claims.death-certificate.handlers.ts`) — a missing name throws
  `AdminDisplayNameMissingError`, never a fallback.
- **G12 — Events, audits, pins.** Claim events through `projectClaimState(client, …)` in the row's transaction (annotations via
  `requireIdentityTransition`). Per annotation: `claim/events.ts` (schema, tuple, payload map, header count prose), the `state.ts` reducer
  identity arm, `packages/events/src/registry.ts`, and three tests — `packages/domain/tests/claim/dpdpa-consent-events.test.ts`
  (`toHaveLength(37)` + a per-story history comment), `packages/events/tests/claim-registry-coverage.test.ts` (DERIVED from
  `CLAIM_EVENT_TYPES` — passes unchanged once the registry has the entries), and the frozen literals `STORY_6_20 / 6_21A / 6_24A /
  6_36_CLAIM_EVENTS` in `packages/domain/tests/claim/nominee-name-check-events.test.ts` (an exclusion filter + an "all live" assertion).
  Audits through `emitAuthAudit` (`apps/api/src/modules/auth/shared/audit.ts`; type added to `AuthAuditEventType`,
  `apps/api/src/audit/audit-sink.ts`; `event.context` hashed into `request_payload_hash` — the stored row holds only the hash, so contexts
  are asserted on `td.auditSink` (`CapturingAuditSink`, `_setup.ts`); `audit-log-sink.test.ts`'s dotted-action leg loops a HAND-WRITTEN
  list of 16 auth types, so a new type is checked only if added there). Each staff write is paired with a `_rejected` type carrying the
  reason code (`'admin_claim.death_certificate_reviewed' | 'admin_claim.death_certificate_review_rejected'`); a decrypting read is audited
  (`admin_death_certificate.history_read`, `admin_claim.contact_details_read`).
- **G13 — `namedByClaimSql` reaches far beyond peer-mesh.** `namedByClaimSql` (`member/known-people.ts`) = EXISTS ANY claim naming the
  member as deceased (it IGNORES the finding). It is a SQL fragment (the leaf is an async boolean — a fragment cannot "call" it). Consumers:
  `knownPersonEligibleSql`, `knownPeopleCallerSql` (the member's own "People who know me" gate — `-333` call 1), `namedUnavailableSql`
  (`known-people-prompts.ts` `replaceNeeded` + the "unavailable" label), `listRequestsNamingMe` and `answerKnownPersonRequest` (the
  namer-side `AND NOT namedByClaim(namer)`) — all `known-people.ts`; `peerMeshEligibleMemberSql` (`peer-mesh-read.ts` — DIRECTLY,
  `AND NOT ${namedByClaimSql(…)}`, not through `knownPersonEligibleSql`; it also requires a `member_identities` row and `state =
  'active'`); `readPeerMeshRequestEligibility`'s `no_target:peer_reported_deceased` label (`peer-mesh-request.ts`); and
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
- **G16 — Deferred items and pointers that name this row** — ALL in DL16's table (one list, so the two cannot drift), each verified present
  in `deferred-work.md` at `91ea2c81` by its phrase; the PM1 pointer is in row `6-22`'s `sprint-status.yaml` block, not in `-311`. 6.38
  round-2 D1 (b) MANDATES its words never read "Q1 (b) closed".
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
  trigger). Policies are declared as `pgPolicy` in `*-rls.ts` (per-command, never `FOR ALL`) AND written BY HAND as `CREATE POLICY` in the
  migration: the WHOLE migration (table, FKs, CHECKs, grants, ENABLE / FORCE RLS, policies, indexes, triggers) is HAND-AUTHORED in
  0122's statement order — the drizzle snapshots stop at `0020`, and `0122` / `0195` both say ⛔ never regenerate (`db:generate` diffs
  against 0020 ⇒ the 42P07 footgun). Field-class constants live in `encryption/field-classes.ts` (*"the single authority; do not
  re-declare"*; `anonymize.ts` imports `MEMORIAL_FIELD_CLASS` from it). At `91ea2c81` the three pins are unchanged (11b.5a edited an
  existing statement). Erasure is legal only for `withdrawn` or a `terminated` overlay (`rtbf-legality.ts`); production has no
  `withdrawn` members (no `lock_in_expired` producer), so a scrub is reachable there only through the moderation `terminated` route.
- **G20 — What the account-frozen overlay gates.** `member/overlay.ts`: frozen on `claim.intake_initiated` naming the member, unfrozen per
  stream (last-wins fold) by `ACCOUNT_UNFREEZE_EVENT_TYPES` (`claim.closed` among them — trigger-blind). The three readers that *"MUST STAY
  OBSERVATIONALLY EQUIVALENT"* (its header — *"Change one, check the other"*): (1) `evaluateAccountOverlay` — a PURE fold whose input
  `AccountOverlayEventInput` is `{ type, occurredAt, streamId? }` (NO payload), fed by `getMemberAccountOverlay`, which selects whole rows
  but has NO production caller today (tests only); (2) `member/directory-read.ts` `NOT_DECEASED` (the PUBLIC Member Directory — the 11a.3
  incident that published reported-dead members as "Active"; reached through `listPublicDirectoryMembers` / `countPublicDirectoryMembers`;
  the domain read has no kill switch, INNER-JOINs `member_kyc_profiles`, and lists only visible states); (3) `listAccountFrozenMemberIds`
  (the degraded-mode bridge's cycle-open text, 5.8b, called from `apps/jobs/src/scheduler/contribution-notify-triggers.ts`; it reads
  `current_setting('app.pariwar_id')` WITHOUT `missing_ok`). That is all: the header's Module Shelf note (12.4) is unbuilt, and
  `pool/sahyog-vivran-read.ts` only cites the constant in a comment. No equivalence test across the three exists today. ⇒ Closing a GUILTY
  claim through the closure core would unfreeze all three while `isDeathReportStanding` stays TRUE — and so would a guilty finding on a
  claim the overlay had ALREADY unfrozen (`claim.denied_no_appeal` on a `denied` claim, or a claim already `closed`, where no new close is
  emitted) (N7, DL13's sticky freeze).
- **G21 — What the Panel already ruled about a signal that the member is alive, and about a claim closed under a claimant.**
  `assertClaimApprovable` (`claim/nominee-name-check.ts`) has two shipped shapes: a WAIT that is not a denial
  (`SuspicionAppealPendingError` — `-262` FQ5 A / `-291` Q1 A; `GroundInspectionRequiredError` — every approval needs a completed ground
  inspection, `-263` FQ9) and the late-WARNING wait (`LateWarningReasonRequiredError` — `-277` Q3 B). `-263` FQ10 made a neighbour's
  *"they have not died"* a WARNING (on `-264` FQ12's list); `-304`'s author READING (⛔ not ratified) adds that making any other answer
  *"gate, delay or flag a claim changes who is paid"* — that stays the Panel's. `assertClaimApprovable(db, pariwarId, claimCaseId,
  deceasedMemberId, opts)` with `opts.step: 'district_admin' | 'final'` checks certificate → name check → ground inspection → (final only)
  suspicion appeal + one payment per death → late warnings. `-291` Q2 B: when an allowed appeal closes the TRUE NOMINEE's claim, *"she is
  texted once"* (at her declared mobile) — *"Your claim for [member] has been closed. Please call the helpline."* — and its §0: *"whether
  the Trust sends a new message to a person who never agreed to be contacted"* is the Panel's. `-318` Q3 A went the other way for a
  one-payment-per-death closure: *"⛔ No text when a claim is closed this way"* — the app shows the closed status. A suspicion refusal is
  appealable for 90 days (`-291` Q1 A). And a closed claim can be RE-FILED at once (G10 — `assertRefileAllowed` keys on a closures row
  only): the same filer can re-lock a released member with a new report; and `refile-guard.ts` `mostRecentTerminalClaim` would take a
  fraud-closed claim (no closures row) as the death's most recent terminal claim, masking a 6.19c closed-for-no-response guard on an
  earlier claim.

## Build decisions — ANSWERED (BigDev, 2026-11-01, Task 0.2): DL0 split; DL1–DL17 accepted as written; DL16's EA10 row re-trace-then-decide

- **DL0 — SCOPE: the investigation to its finding; three new rows. ⭐ The split is ANSWERED (BigDev, validate 2026-11-01: *"Split: new row
  6-22d"*).** This story builds the flag, both findings, the release and the close. Three new rows (Task 0.5):
  - **`6-22d-fraud-register-refer-impose-lift-and-member-ban`** — the refer → impose → lift chain with DECLINE arms, the termination
    through `moderateMember`, the ban table, the bar at joining, the register page and the member screen. Gated on PQ3 (a mobile cannot
    bar automatically under `-240` cl. 3 as ruled), PQ5 (who "the State Trustee" is), PQ6 (Trust-wide reach) and an actor-separation
    design (`super_admin` derives refer + impose + lift — `-240` cl. 5's named collapse; the 10.22 precedent
    `ModerationAppealAdjudicatorExcludedError`). Its trace list — carried VERBATIM into the row's comment block at Task 0.5, not built
    here: a banned member never reaches sign-up (OTP verify issues a continuation only when `memberships.length === 0`, and erasure keeps
    the identity row) — what they meet is login (`auth.member_terminated` only under `termination_access_block`, default OFF); one
    `moderateMember` transaction with suspend + terminate TIES on `acted_at` / `created_at` and `resolveMembersByMobile`'s latest-act
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
    member is found alive (N4, N5 — a drive raised for a living member; an innocent member's account overlay left ON by it, N7).
  - *Rejected:* waiting for counsel to build anything (the release is a living member's way out of six locks today); building the ban on a
    mobile key now (it bars no one through the app and goes beyond `-240` cl. 3); building the identifier set stubbed (an inert gate that
    reads as built — [[feedback_gate_scope_semantic_coverage]]). The slug keeps naming the identifier set; it is not renamed (four decisions
    and six story files cite the key).
- **DL1 — The investigation record: a NEW table `claim_fraud_investigation_steps`** (append-only), migration "the next free number" (READ
  LIVE — TR10). Columns: `step_id uuid PK` (producer-supplied — idempotent retries), `claim_case_id` (FK `claims`, `ON DELETE cascade`),
  `pariwar_id`, `deceased_member_id`, `step` — a TEXT column with a CHECK (`flagged | found_innocent | found_guilty`; the
  `claim_nominee_findings.kind` precedent; NOT a pgEnum, so no `ALTER TYPE … ADD VALUE` now or when `6-22d` widens it), `finding_id`
  (nullable FK `claim_nominee_findings` — set iff `found_*`), `alive_confirmation` (text CHECK, NOT NULL iff `found_*` — DL3),
  `note_ciphertext` (Tier-1, `piiColumn(1, <field class>)('note_ciphertext')`, REQUIRED on every step — the erasure scrub writes the house
  sentinel, never NULL), `actor_id`, `actor_display` (snapshotted from `users.display_name` via `resolveDisplay` at action time; a missing
  name ⇒ `AdminDisplayNameMissingError`, never a fallback — [[project_admin_display_name_attribution]]), `acted_at`. Unique
  `(claim_case_id, step)` — each step at most once per claim — AND a partial unique `ON (claim_case_id) WHERE step IN ('found_innocent',
  'found_guilty')` — at most ONE found step per claim, of either kind (N1, N2). Coherence CHECK, NULL-safe (a CHECK passes on NULL — the
  0119 / 0122 trap): `(step = 'flagged' AND finding_id IS NULL AND alive_confirmation IS NULL) OR (step IN ('found_innocent',
  'found_guilty') AND finding_id IS NOT NULL AND alive_confirmation IS NOT NULL AND alive_confirmation IN (…PQ9's values…))`. The
  `finding_id` FK is `ON DELETE no action` (the default) — never `restrict`, which would fail a `claims` delete before both cascades run.
  RLS by `pariwar_id` declared in TS (`packages/domain/src/policies/claim-fraud-investigation- rls.ts` + `policies/index.ts`, copying
  `claim-death-certificate-rls.ts`) INCLUDING a per-command UPDATE policy; `GRANT SELECT, INSERT, UPDATE ("note_ciphertext")` AT BIRTH
  (the scrub — DL15); the 0122 guard IN SHAPE (G19): every frozen column refused — `step_id, claim_case_id, pariwar_id,
  deceased_member_id, step, finding_id, alive_confirmation, actor_id, actor_display, acted_at` (all but `note_ciphertext`) — DELETE only
  at `pg_trigger_depth() > 1` (the `claims` cascade — spec cleanups `DELETE FROM claims`), TRUNCATE refused. The WHOLE migration is
  HAND-AUTHORED in 0122's statement order, policies included — ⛔ never `db:generate` (G19;
  [[project_append_only_guard_names_erasure_columns]] — the guard at birth, not a later REPLACE). The field-class constant lives in
  `encryption/field-classes.ts` (G19). The chain order is enforced in the domain writer, not by a trigger. Branded id in the house shape —
  `export type ClaimFraudInvestigationStepId = Brand<'ClaimFraudInvestigationStepId'>; export const claimFraudInvestigationStepId =
  uuidBrand('ClaimFraudInvestigationStepId');` (`ids/index.ts`, as `deathCertificateReviewId`; [[project_branded_ids_lowercase]]). Add the
  table to the jobs `*-no-decision.test.ts` decision-table lists where `claim_nominee_findings`'s siblings are listed (Task 0.1 greps).
  *Rejected:* a mutable "investigation" row with stage columns (two writers racing on one row; the house shape for staff acts is
  append-only — `claim_death_certificate_reviews`).
- **DL2 — The guilty finding kind.** A HAND-WRITTEN migration, ALONE, before DL1's: `DROP CONSTRAINT claim_nominee_findings_kind_check` →
  re-ADD with `'member_found_guilty'`; `DROP CONSTRAINT claim_nominee_findings_rank_coherence_check` → re-ADD as `("kind" IN
  ('member_found_innocent', 'member_found_guilty') AND "rank" IS NULL) OR ("kind" = 'nominee_disqualified' AND "rank" IS NOT NULL AND
  "rank" IN (1, 2))` — keep 0119's `IS NOT NULL` (without it a NULL-rank disqualification passes: FALSE OR NULL = NULL); `DROP INDEX
  claim_nominee_findings_one_innocence_per_claim_uq` → `CREATE UNIQUE INDEX claim_nominee_findings_one_member_finding_per_claim_uq ON
  claim_nominee_findings (claim_case_id) WHERE kind IN ('member_found_innocent', 'member_found_guilty')` — mirrored in the TS
  `uniqueIndex(…).where(…)` (N2) through ONE exported constant in the schema file, `MEMBER_FINDING_UNIQUE_PREDICATE` (raw, UNQUALIFIED
  `sql\`kind IN ('member_found_innocent', 'member_found_guilty')\`` — the schema file is on the fence's list), used by the index and by
  both member-finding writers' targeted conflicts (DL12). `CLAIM_NOMINEE_FINDING_KINDS` gains the value (the leaf does not read it — N3).
  G1 already shows no reader filters on "any finding"; Task 0.1 re-runs that grep — if one appears, re-point it to an equality on
  `member_found_innocent` and record it. *Rejected:* recording guilt only in DL1's steps (then a PQ1 = A ruling needs a second table in
  the leaf).
- **DL3 — The finding writer (N1, N4).** `recordFraudFinding(client, { claimCaseId, pariwarId, outcome: 'innocent' | 'guilty',
  aliveConfirmation, stepId, findingId, noteCiphertext, actor… })` in a NEW `packages/domain/src/claim/fraud-investigation-persist.ts`:
  1. ONE unlocked read of the claim's `deceased_member_id` (the `acquireSuspicionReversalLockForClaim` shape — *"takes it FIRST, or after
     ONE unlocked read"*), then the closure core's keys in ITS order — `intakeAdvisoryLockKey(pariwar, deceased)` (lower-cases),
     `appealAdvisoryLockKey`, `r9VotingAdvisoryLockKey`, `stateTrusteeDecisionAdvisoryLockKey` (these three hash the ids RAW — build them
     from branded ids / the DB row's id, never a raw request string, TR11) — then lock the claim row and re-check it names the same member
     (the closure core's "Trap 8 / 40P01" order; add this writer to the "every intake-key taker" list in
     `acquireSuspicionReversalLockForClaim`'s doc block);
  2. REPLAY first: a `found_*` step with THIS `step_id` and the same outcome ⇒ return the ORIGINAL result (no write, no event); the
     version returned is the LAST event the finding wrote (`claim.closed` if it closed the claim, else its annotation), read back from
     `events_log` (by `payload ->> 'finding_id'` / the stream's `claim.closed`) — [[project_idempotent_write_handler_shape]]. Then require a
     `flagged` step and no `found_*` step on this claim (409 `fraud_investigation.not_flagged` / `.already_found`), and that the finder is
     NOT the flag's `actor_id` (409 `fraud_investigation.finder_is_flagger` — the ruled two-actor chain; the 10.22 precedent
     `ModerationAppealAdjudicatorExcludedError`). It bites for `super_admin` (derives both keys) AND for any ONE person granted both
     `helpline_operator` and `district_admin` (`role_grants` allows it — G7);
  3. `aliveConfirmation` REQUIRED — text CHECK, values PROPOSED `in_person | video_call | ground_inspection` (a phone call alone is not
     proof — someone may answer for the member); WHICH proof suffices is the Panel's (PQ9 — it decides when a family's claim closes for
     good), so the built set is a go-live condition. Defined ONCE in `@twt/domain` (`FRAUD_ALIVE_CONFIRMATIONS`), mirrored in contracts
     (`z.enum`) with a lockstep test (admin cannot import `@twt/domain` — [[project_contracts_domain_bundle_boundary]]); missing ⇒ 400;
  4. INNOCENT ⇒ the HARDENED `recordMemberInnocenceFinding` (DL12) — GUILTY ⇒ a NEW `recordMemberGuiltFinding(client, input)` in
     `nominee-lock.ts` beside it (that file is on the fence's list; `fraud-investigation-persist.ts` never spells a kind — TR2), which
     inserts `member_found_guilty` (targeted conflict on `MEMBER_FINDING_UNIQUE_PREDICATE`) and appends the annotation
     `claim.member_found_guilty` — its payload CARRIES `deceased_member_id` (the overlay matches on it; `projectClaimState` does not add
     it) — on EVERY guilty finding, closable or not (DL13's sticky freeze rests on it);
  5. insert the `found_*` step;
  6. if `isClaimClosable(state)` ⇒ `claim.closed` through a NEW exported self-mode closer in `suspicion-refusal-persist.ts` (a sibling of
     `closeClaimIfDeathPaid`, which takes no keys — they are already held), with `endLiveProcesses` run. `closeLockedClaim`'s input becomes
     DISCRIMINATED — `{ trigger: HeldClosedTrigger; causeClaimCaseId }` | `{ trigger: FraudClosedTrigger }` — writing
     `held_by_claim_case_id` ONLY on the first arm; `CLAIM_CLOSED_TRIGGERS` splits into `CLAIM_CLOSED_HELD_TRIGGERS` and
     `CLAIM_CLOSED_FRAUD_TRIGGERS`, and `closeOtherClaimsOfDeath` accepts only the held arm (so no held closer can emit a fraud trigger with
     a `held_by`). A claim ALREADY `closed` (e.g. a suspicion closure) records the finding and is not closed again; `approved` / `settled` ⇒
     the finding (and an innocent member's release) stands, the claim is not closed, and the response says so (`closed: false, reason:
     'committed'`) — `6-22c`.
  The response lists the member's OTHER standing claims (ids and states, no PII) so the finder sees the member is still locked by them —
  from ONE new export in `death-report.ts`, `listStandingDeathReports(db, pariwarId, memberId)`, built from the SAME SQL fragment as
  `isDeathReportStanding` (the fence's `death-report.ts` count stays 1; `isDeathReportStanding`'s body is unchanged — N3), bounded by
  `clampLimit` ([[project_domain_limit_clamp_and_savepoint_retry]]). *Rejected:* one finding releasing every claim on the member (a
  finding is an investigation's outcome on ONE report — `-261` D3 A);
  closing a guilty claim with the same trigger as an innocent one (it would read literally as "closed because the member is alive" and
  still refuse erasure — PQ1); leaving a guilty claim open (a claim on a living member could then be approved and paid — N5).
- **DL4 — The flag: the helpline operator ONLY.** `flagClaimForFraudInvestigation(client, { claimCaseId, pariwarId, stepId,
  noteCiphertext, actor… })` — any claim in ANY state that is not already flagged; a retry with the SAME `step_id` ⇒ 200 replay of the
  original result (no second event); a flag with a DIFFERENT `step_id` on a flagged claim ⇒ 409 `fraud_investigation.already_flagged`. The
  ruled chain is TWO people: *"operator flags → District Admin verifies and confirms"* (`-238` cl. 3). So the flag key is seeded on
  `helpline_operator` alone and the finding key on `district_admin` alone, and DL3 step 2 refuses the same ACTOR for both (`super_admin`,
  or one person granted both roles — G7). A living member wrongly reported dead reaches the Trust through the helpline (6.38 D1's copy
  points them there), so the operator is where the flag starts. *Rejected:* letting the District Admin flag AND find (one person doing the
  whole chain is weaker than option B, which the Panel REJECTED under `-261` D3 A — *"the District Admin records it, the Pariwar Admin
  approves"*; it would narrow `-238` cl. 3); a District Admin flagger with a different-DA finder (one DA per district would leave the claim
  unfindable). The post-death case, where the discovery IS the District Admin's, is `6-22b`'s. Annotation `claim.fraud_flagged`. What the
  flag does to approval: nothing (N5, PQ7).
- **DL5 — The helpline's way to a claim (G8) — in the house shape.** `GET
  /api/v1/p/:pariwarId/admin/members/:memberId/fraud-investigation/claims` — for the member the operator has already found and read back,
  EVERY claim naming the member as deceased, in EVERY state (the leaf's own scope — today's helpline reads drop `settled` / `denied`, G8),
  bounded by `clampLimit`: claim ids, states, filed dates and each claim's step status `none | flagged | found` (read from the steps
  table, never the finding-kind literal — TR2); no claimant PII (TR14). Built on `listLiveClaimsForDeceasedMember` with a new option (or a
  sibling reader in `claim/read.ts` that shares its `where`) — ⛔ a separate hand-written query elsewhere. Gated by `claim.flag_fraud` at
  PARIWAR dimension (DL6). Mounted as a fifth section `<HelplineFraudFlag pariwarId memberId identityConfirmed>` in `HelplineClaimPage`,
  the `HelplineAppeal` shape (client-side read-back first), each row with a Flag action. *Rejected:* flag only on an intake result (the
  living member calling in is not filing an intake); District-Admin-only flagging (drops the ruled "operator flags"); reusing a shipped
  read as-is (a `denied` false claim would be unflaggable for ever).
- **DL6 — The keys** — minted in Task 0.4's decision (`-210` keeps keys outside the delegated mint), catalog "the next free version" (READ
  LIVE — TR10):
  | Key | Dimension | Seeded holders | Step-up |
  |---|---|---|---|
  | `claim.flag_fraud` | pariwar (the house shape for a pariwar-ceiling operator key — `claim.file`, `claim.raise_nominee_correction`; no resolver) | `helpline_operator` | — |
  | `claim.record_fraud_finding` | district (`resolveNomineeNameCheckDistrict()`) | `district_admin` | ✅ `FRAUD_FINDING_STEP_UP_CONTEXT` — one exported constant in contracts, shared by the route and the admin caller (G11) |
  The helpline read (DL5) and the flag are gated by `claim.flag_fraud` at `{ dimension: 'pariwar' }`; only the FINDING (and DL7's read,
  DL10 (iv)'s list) is district-scoped. `super_admin` derives both — DL3's actor check keeps one person from doing both steps. Pin the
  exact holder sets: `holdersOf('claim.flag_fraud')` `toEqual(['helpline_operator', 'super_admin'])`,
  `holdersOf('claim.record_fraud_finding')` `toEqual(['district_admin', 'super_admin'])`. `6-22d` mints its own keys.
- **DL7 — Who sees the investigation.** A NEW read `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/fraud-investigation` (`claim.verify`
  at the district via `resolveNomineeNameCheckDistrict()`, the console-section shape of `…/death-certificate/history`): the steps (step,
  `actor_display`, `acted_at`, `alive_confirmation`), each note as a `ReadableNote` (`contracts/claims/nominee-name-check.ts`) WITHHELD
  UNIFORMLY on every step unless the viewer holds `claim.record_fraud_finding` at that district
  ([[feedback_withholding_must_be_uniform]]), and `viewer.canRecordFinding` judged on the SERVER (as `certificateReview.viewer.canReview`).
  A read that decrypts a note is audited `admin_claim.fraud_notes_read` (the `admin_claim.contact_details_read` precedent). The helpline
  sees only the `none | flagged | found` status on DL5's read.
- **DL8 — No effect on the leaf (N3, PQ1).** `isDeathReportStanding`'s body is not edited. A guilty member stays locked out of erasure,
  withdrawal and Life Events — 6.38's declared narrowing, carried as a DECLARED NARROWING of `-423` Q1 (b) / `-424` Q2 (a) in Task 0.4,
  PQ1, and a go-live leg (Task 0.5). If PQ1 is ruled A, the change is ONE kind in the leaf's `NOT EXISTS` plus the fence's allow-list, AND
  removing the ONE sticky-freeze constant (DL13) — record BOTH in the leaf's header and the overlay header as the one swap point (N7).
  ⚠ **Amended by the code review of 2026-11-02 (RA2) — the "ONE kind in the leaf" above was true when DL8 was written, before DL11 added a
  second copy.** The release rule is spelled out in SIX hand-written SQL copies — the leaf (1), `approval-warnings.ts` (3), `peer-mesh-read.ts` (2)
  — and a Q1 = A change moves all six plus the sticky constant and the fence's per-file counts. `tests/integration/claim/release-rule-agreement.spec.ts`
  asks all six the same question and fails if one is changed alone; the leaf's header names them.
- **DL9 — 6.38 DL7's two residual edges, and the convergence code the finding touches.** (a) A released claim as a convergence candidate —
  CLOSED by DL3's close for every closable state (a `closed` claim is not a candidate — G10); `approved` / `settled` released claims stay
  candidates ⇒ `6-22c` (recorded). (b) The override has no door (G10) ⇒ BUILD: under the intake lock, `overrideIntakeAttempt` refuses a
  `closed` against-claim (a NEW domain error, its own 409 code) and, when no report stands (`!isDeathReportStanding` — reachable: an
  attempt parked beside an `approved` claim released by innocence), runs `resolveClaimIntakeDoor` — the `tryConverge` (1b) shape;
  `overrideConvergence`'s catch ALSO calls `translateClaimIntakeRefused(err, { withReason: true })` (409 `claim.intake_refused`) and maps
  the closed-against error — else a door refusal is a 500; rewrite `overrideIntakeAttempt`'s DELIBERATE doc block (AC10). (c) A GUILTY
  member's later death reports skip the door for ever (the guilty claim stands in the leaf; it is `closed`, so not a candidate; a new
  report mints a fresh claim with no door) — a named residual ⇒ `6-22d` (a door keyed on a standing ban). (d) Rewrite
  `convergeIntakeAttempt`'s DELIBERATE doc block too (*"a new report CONVERGES onto the released claim"* is false for closable states after
  DL3). (e) `convergeIntakeAttempt` re-checks, UNDER the intake lock, that the canonical claim is still a candidate (`confirmMerge` reads
  the candidate before the lock — a merge must not land in a claim a finding closed in between). (f) An attempt parked `pending` beside a
  claim that is later found-alive-closed has no candidate and cannot be overridden onto it — it stays `pending` as history (the RF2
  precedent, *"the attempt row stays as history"*) — a named residual. ⚠ *[Corrected 2026-11-02, code review round 2 R2-5: the built
  refusal — and `-438` item 8's words, *"the override refuses a `closed` against-claim"* — cover a claim CLOSED for ANY reason (a fraud
  finding, a suspicion-appeal close, a death already finally approved …), ⛔ only a found-alive close, so the residual is the same for every
  closure; the family's NEW report mints a claim as before. Pinned for a non-fraud close in `fraud-convergence-door.spec.ts`.]*
- **DL10 — The surfaces.** (i) Verifier console: a `FraudInvestigationPanel` (`DeathCertificateReviewControl.tsx`'s FORM shape; step-up
  through the shared `StepUpPanel` — `modules/workplaces/StepUpPanel.tsx`, as 12.2 reuses it — with `FRAUD_FINDING_STEP_UP_CONTEXT`
  imported from contracts), fed by DL7's read: the flag shown read-only (who flagged, when), then Record finding (innocent / guilty
  radios, nothing pre-selected; `alive_confirmation` radios, nothing pre-selected; note required; the `finder_is_flagger` refusal mapped
  to copy), showing the member's OTHER standing claims after the finding. (ii) Helpline console: DL5's section + Flag (the only place a
  flag is raised). (iii) The closed-claim staff label (G9): a domain bulk read `readClosedMemberAliveBulk(db, pariwarId, claimCaseIds)`
  beside `readClosedHolderRefusedBulk` — a `closed` claim carrying a `found_*` step in `claim_fraud_investigation_steps` (the STEP table,
  never the trigger or the finding literal: a claim already `closed` before its finding has no fraud `claim.closed`, TR2), OR a `closed`
  claim whose `held_by` holder carries one (v) — called under the same `underSavepoint`, degrading to an empty set, in the three handlers
  G9 names; the three `.strict()` contracts gain `closed_member_alive: boolean` beside `closed_holder_refused` (fixtures move —
  [[project_contracts_tests_outside_tsc]]); `closedClaimStateLabel` gains the argument at all four call sites and renders *"Closed — the
  member was found alive"* (English, verbatim — BigDev reviews at Task 0.2); `closed_member_alive` WINS over `closed_holder_refused`. (iv)
  A District Admin work-list: `/p/$pariwarId/fraud-investigations` — flagged claims with no `found_*` step in the viewer's districts (ids,
  state, flagged date, no PII; `clampLimit`) ⚠ *[2026-11-02, code review round 2 R2-6: + `is_flagger` per row — a claim the VIEWER
  flagged is labelled, ⛔ hidden]*, each linking to the console; API `GET /api/v1/p/:pariwarId/admin/fraud-investigations` on
  `claim.record_fraud_finding`, district-scoped in the `resolveQueueScopeStash` shape of the correction-closure / certificate-reminder
  queues (`claims.correction-closure.routes.ts`). Without it a flag reaches no finder (the console is entered by claim id — G18). (v)
  OP10's reverse direction (G5): a claim R closed `held_by` a claim C that is later fraud-closed reads *"Closed — the member was found
  alive"* (the member alive is the truth of every claim for that death), not *"the other claim … was later refused; the family may file
  again"* — PROPOSED, BigDev confirms the label at Task 0.2 (`-318` Q3 A / `-321` ruled the held-closure wording; this replaces it only
  where a finding says the member is alive — put to the Panel inside PQ8). Every refusal mapped to copy (no raw code); `role="alert"`
  errors and an always-mounted `role="status"` (6.38 R4 P1). Copy in the module's own `i18n-en.ts` (G18), passing the microcopy gate
  (TR16).
- **DL11 — The peer-mesh exclusion FOLLOWS the release; nothing else does (PM1's pointer).** PM1's pointer reaches only peer-mesh, and
  `namedByClaimSql` gates far more (G13). Traced: `peerMeshEligibleMemberSql` calls `namedByClaimSql` DIRECTLY. So: a NEW fragment
  `standingReportNamesSql` in `peer-mesh-read.ts` (already on the fence's literal list) = the leaf's `EXISTS (claims c … AND NOT EXISTS
  (claim_nominee_findings f WHERE f.pariwar_id = c.pariwar_id AND f.claim_case_id = c.claim_case_id AND f.kind =
  'member_found_innocent'))`, taking SQL column arguments — the findings alias MUST be `f` (the fence's structural regex, G4), and the
  fence's `gateSqlCopies` count for `peer-mesh-read.ts` moves 1 → 2. It replaces `namedByClaimSql` in exactly ONE line of
  `peerMeshEligibleMemberSql` and feeds `readPeerMeshRequestEligibility`'s `reported_deceased` column — `peer-mesh-request.ts` IMPORTS the
  fragment and never inlines it (it is not on `findingKindLiteralFiles`). `namedByClaimSql` and `known-people.ts` are UNCHANGED — "People
  who know me", the unavailable prompts, `listRequestsNamingMe` / `answerKnownPersonRequest` and nominee links keep treating a released
  member as reported (a NAMED residual in `known-people.ts`'s accepted-cost comment and `deferred-work.md`). A member found innocent
  re-enters the five — TOLD (TL1).
- **DL12 — Harden the existing writer (G2).** `recordMemberInnocenceFinding`: (a) TARGETED conflict — `onConflictDoNothing({ target:
  claimNomineeFindings.claimCaseId, where: MEMBER_FINDING_UNIQUE_PREDICATE })` (drizzle-orm 0.45.2 renders `on conflict ("claim_case_id")
  where … do nothing`; the predicate raw and unqualified so Postgres infers the partial index), so a PK collision is a 500, never
  "duplicate"; (b) on a 0-row conflict, RE-READ the claim's member finding: same `finding_id` and kind ⇒ IDEMPOTENT (returns that finding's
  event version, no second event); otherwise `duplicate`; (d) it acquires `intakeAdvisoryLockKey` FIRST, after ONE unlocked read of the
  claim's `deceased_member_id` (its input has none — G2), then `lockClaimRow` — a re-entrant no-op when DL3 already holds the key, and the
  fix for the test-fixture callers and any future caller. `recordMemberGuiltFinding` (DL3 step 4) is built with (a), (b), (d) from the
  start. The disqualifier's defects (c) ⇒ `6-22c` (its producer) — recorded, not fixed here (no caller in this story).
- **DL13 — Events.** Claim: `claim.fraud_flagged` and `claim.member_found_guilty` (identity annotations; `claim.member_found_guilty`'s
  payload carries `deceased_member_id`); `claim.closed` gains two triggers `fraud_finding_innocent` and `fraud_finding_guilty` (named so
  they do not spell `'member_found_innocent'` — the fence, TR2). `ClaimClosedPayloadSchema` becomes a `z.discriminatedUnion('trigger', …)`
  of `.strict()` members (zod 3.25.76; `projectClaimState` uses `.parse`, the registry types `schema` as `z.ZodTypeAny`, nothing reads
  `.shape`): the held triggers keep the REQUIRED `held_by_claim_case_id`; the fraud triggers carry no `held_by` and keep
  `deceased_member_id` REQUIRED (the overlay matches on it). OP10's join gains `AND op_e.payload ->> 'trigger' NOT IN
  ('fraud_finding_innocent', 'fraud_finding_guilty')` — DEFENSIVE (the NULL `held_by` already never joins); the reachable OP10 change is
  DL10 (v). The registry description is updated. `CLAIM_EVENT_TYPES` +2 (READ LIVE — 6.39 adds one); a frozen literal
  `STORY_6_22_CLAIM_EVENTS` in `nominee-name-check-events.test.ts`. No member-stream event (the member events belong to `6-22d`). No
  notification on a fraud close — the built side of PQ8 (a). **The overlay — a STICKY freeze (N7, G20; the ONE home of this mechanism).**
  A claim stream carrying `claim.member_found_guilty` is FROZEN whatever follows it on that stream — `claim.closed`,
  `claim.denied_no_appeal`, a later `claim.settled`. It cannot be a last-wins freeze: the annotation and the close share one transaction's
  `now()` and the close's higher `event_version` wins ([[project_db_clock_ordering_tests_tie]]); and a guilty finding on a `denied` claim
  already unfrozen by `claim.denied_no_appeal`, or on a claim already `closed`, emits no close at all (G20) ⚠ *[corrected 2026-11-02,
  code review round 2 R2-14 (a): a `denied` claim IS closable (`CLAIM_NOT_CLOSABLE_STATES = ['settled', 'approved', 'closed']`), so a guilty
  finding there DOES emit `claim.closed`; only a claim already `closed` emits none. The sticky leg is still needed for the shared-`now()`
  tie and the already-`closed` case]*. So: export ONE constant
  `ACCOUNT_STICKY_FREEZE_EVENT_TYPE = 'claim.member_found_guilty'` from `overlay.ts`, used by all three readers — `evaluateAccountOverlay`
  gets a per-stream `stickyFrozen` flag (a stream that has seen the type stays frozen; `AccountOverlayEventInput` needs no payload — the
  TYPE decides; add the type to `OVERLAY_EVENT_TYPES`; `getMemberAccountOverlay` selects it — ⚠ `OVERLAY_EVENT_TYPES` is module-private
  AND the IN-list of `listAccountFrozenMemberIds`' latest-per-stream fold: once the type is in it, that fold reads a guilty stream as
  unfrozen and ONLY the OR-EXISTS leg keeps it frozen — test the approved-and-guilty case; the sticky stream's `frozenSince` stays the
  intake's `occurred_at`), and `NOT_DECEASED` and `listAccountFrozenMemberIds` add `OR EXISTS (… the stream carries the sticky type at ≤
  now)` through ONE exported SQL fragment in `overlay.ts` (keep `listAccountFrozenMemberIds`' `app.pariwar_id` predicate) — so 12.4's
  future Module Shelf inherits it. `ACCOUNT_UNFREEZE_EVENT_TYPES` is unchanged; `fraud_finding_innocent` unfreezes as any close does. ONE
  equivalence test runs the three over the same seeded members (*"Change one, check the other"*; AC7). ⚠ `-147` cl. 3's STANDING FENCE
  FIRES: a guilty finding is a new REASON the freeze persists, and an innocent close a new path that ends it — Task 0.4 records the
  re-examination of `NOT_DECEASED` and of the `-146` member sentence (*"you stop appearing once your death has been reported … from the
  moment a claim naming you is opened"*), and if a policy question results it rides PQ1.
- **DL14 — Audits.** `admin_claim.fraud_flagged` / `admin_claim.fraud_flag_rejected`, `admin_claim.fraud_finding_recorded` /
  `admin_claim.fraud_finding_rejected` (every refusal, with its reason code — the `…_review_rejected` precedent), and
  `admin_claim.fraud_notes_read` (DL7) — `AuthAuditEventType` entries, each added to `audit-log-sink.test.ts`'s hand-written dotted-action
  list; contexts carry ids, the outcome, `alive_confirmation` and reason codes only (N6) — asserted on `td.auditSink`
  (`CapturingAuditSink`) with a planted note value absent (the stored row holds only a hash).
  ⭐ **Amended by the code review of 2026-11-02 (chunk B, RB9):** a SIXTH type, `admin_claim.fraud_claims_read` (the member id and a count), for the helpline's per-member list (DL5).
- **DL15 — Erasure.** `claim_fraud_investigation_steps.note_ciphertext` is scrubbed by `member/anonymize.ts` keyed on `deceased_member_id`
  (the reported, living subject — the 6.21a pattern, G19), writing the house sentinel (the column is NOT NULL — as 6.21a's
  `reviewSentinel`), with ONE new field-class constant in `encryption/field-classes.ts` re-exported by `apps/api/src/context.ts` and
  imported by `anonymize.ts`. Reachable only for an INNOCENT member who is `withdrawn` or `terminated` (a guilty one stays erasure-locked —
  DL8; in production only the moderation `terminated` route reaches it — G19). ⚠ `-240` cl. 1 (*"the register holds the guilty, ⛔ never
  everyone who ever claimed"*): innocent-outcome notes may describe the FILER; whether they fall in `6-22b`'s deletion is recorded there
  (DL0), and the note TELLS the Panel they are kept until then (TL1 (iv)). A retention-matrix row is owed for the steps table (Task 0.5).
- **DL16 — Records this story CLOSES or annotates (G16) — ONLY the three ratified closure labels** (*"Closed by [edit]"* / *"Resolved via
  explicit deferral"* / *"Not addressed"* — `-210` keeps the vocabulary out of the delegation; ⛔ a fourth label), each as a dated line
  ([[feedback_closure_language_precision]]; [[feedback_shown_to_panel_means_sent]]):
  | Item (cite by phrase) | Exact closure words |
  |---|---|
  | 6.38 Task 0.5 item 1 (6.38 DL4 / DL7) | *"Closed by 6.22 DL3 (the innocence release) and DL9 (a) / (b) (closable claims leave the candidates; the override door). The guilty arm — Resolved via explicit deferral: PQ1, written and ⛔ not sent; owner the Panel; trigger PQ1's ruling. DL7 (a) for `approved` / `settled` — Resolved via explicit deferral to `6-22c`."* |
  | 6.38 round-2 D1 | (b) *"innocence arm Closed by 6.22 DL3; guilty-alive arm Resolved via explicit deferral — PQ1 written, ⛔ not sent; owner the Panel; trigger PQ1's ruling"* (never "Q1 (b) closed"); (c) *"Not addressed by 6.22 — a go-live leg (Task 0.5)"*. |
  | 6.20 chunk 1 — "The 6-22 finding writers" | *"(a) / (b) Closed by 6.22 DL12; the disqualifier half — Resolved via explicit deferral to `6-22c` (trigger: its producer)"*; the correction race on a released claim — *"Closed by 6.22 DL3 — unreachable: every released claim is `closed` or `approved` / `settled`, all outside `NOMINEE_CORRECTION_WINDOW_STATES`"*. (G2 (d) is this story's own finding — nothing to close.) |
  | "adversarial review of the applied 6-20 patches (2026-09-24b)" (the 40P01 item — a correction racing a declare) | *"Closed by 6.22 DL3 — unreachable: every released claim is `closed` or `approved` / `settled`, all outside the correction window"*. |
  | 6.23a — the *"corrected after the death"* label | *"Not addressed by 6.22 — trigger reached (row `6-22`'s first production release); reason and new trigger recorded"* (Task 0.1 (vi)). |
  | 6.23b EA10 — the second row-6-22 mechanism (reachable for an OPEN later claim) | ANSWERED (BigDev, Task 0.2): re-traced at Task 0.1 (iv); a small anchor fix ⇒ built here, *"Closed by 6.22 DLn"*; otherwise *"Resolved via explicit deferral"* naming owner and trigger — BigDev confirms which before Task 0.4. |
  | 6.36 round-2 W2 | re-traced at Task 0.1 (iv), then one of the three labels. |
  | 6.36e NE9 / the 6.36f `-407` append | *"Not addressed by 6.22 — trigger reached; new trigger named"*. |
  | 6.38 DL12 (ii) (the export's step-up) | *"Not addressed by 6.22"*. |
  | 6.21 — the `claim_documents` CASCADE item | *"Resolved via explicit deferral to `6-22b`"*. |
  | 12.1 C4 | *"Not addressed by 6.22 (owner 12.4) — its premise is stale: 6.22 is now the production release"*. |
  | The PM1 pointer (row `6-22`'s sprint-status block) | *"Closed by 6.22 DL11 (peer-mesh); known-people / nominee links — Not addressed (a named residual)"*. |
- **DL17 — Scope fence.** Not here: the identifier set, PAN service, filer bans, filing-form changes, deletion (`6-22b`); the
  disqualification producer, succession payment, committed-claim recovery (`6-22c`); refer / impose / lift, termination, the ban, the bar
  at joining, any member-facing screen (`6-22d`); a change to the leaf (PQ1); a new moderation reason code; a notification to the claimant
  or nominee (PQ8); the flag as an approval wait or warning (PQ7); an appeal of a found-alive closure, or a re-filing bar (PQ8); a
  proof-of-life rule beyond the built set (PQ9); a backfill (no member uses the system).

## Panel questions — ONE note at Task 0.3 (WRITTEN; BigDev sends)

- **PQ1 — A member found ALIVE but GUILTY: do the death locks lift, and does the account stop reading "reported dead"?** (`-425` 6.38 DL4:
  *"6-22 must put that to the Panel or justify it"*.) `-423` Q1 (b)'s words — *"closed because the member is alive"* — cover a guilty
  member, and this story closes the guilty claim (unless it was already approved or settled — row `6-22c`). ⭐ THE ONE FACT: lifting means a member just found to have faked
  their own death could have their data ERASED and LEAVE the Trust before any ban. Options: **A** lift on either finding (the literal
  words) — cost: the member reappears on the public Member Directory as "Active", and may erase and leave before `6-22d`'s ban exists;
  **B** lift on innocence only (built — a DECLARED NARROWING of `-423` Q1 (b) / `-424` Q2 (a), justified by `-240` cl. 1 *"only the
  guilty are kept"*; the account stays frozen with the locks, so the member stays off the directory — N7) — cost: a member WRONGLY found
  guilty stays locked for ever: there is no appeal against a finding and the steps table admits no second finding on that claim (N1 / DL1)
  — a "who may appeal" edge the Panel also owns; **C** lift on guilt only once `6-22d`'s ban is imposed or declined — cost: the member is
  locked for as long as the refer → impose chain takes, which `6-22d` has not built; until then C behaves as B. *Built: B. Suggest: B.*
  ⚠ A GO-LIVE condition for the guilty arm, and the 6.38 helpdesk copy (G9) changes with the ruling. It also carries `-147` cl. 3's
  re-examination (DL13) if a policy question results.
- **PQ2 — The NOMINEE of a guilty member: banned automatically, or only on a finding of their own?** (`-238` / `-240` NOT covered (i) —
  the claimant half is ruled by `-238` cl. 5.) ⭐ THE ONE FACT: a nominee may never have known they were named. Options: **A**
  automatically — cost: an unknowing nominee is barred for life, with only the Super Admin's lift as a remedy; **B** only on a finding
  naming them — cost: each nominee needs their own investigation, and a complicit nominee who is never investigated is never barred.
  *Built: neither (`6-22b`). Suggest: B.*
- **PQ3 (for `6-22d`) — Until the identifier set exists, may a MOBILE NUMBER bar a returning member?** `-240` cl. 3: *"Only an **exact**
  identifier (PAN, Aadhaar token) may bar automatically"* — a mobile is not on that list, and Indian numbers are RECYCLED to strangers.
  ⭐ THE ONE FACT: a mobile bar would be a WIDENING of a ratified clause, and it also cannot catch a member on a new number (*"catching them
  even on a new phone number is the whole point"* — the note the Panel ruled on). Options: **A** widen cl. 3 to a mobile — cost: a stranger
  with a recycled number is refused until the Super Admin lifts, which also frees the fraudster; **B** a mobile match is held for a human to
  confirm (a new "held" sign-up state) — cost: a new sign-up state and a staff queue, and it still misses a new number; **C** no bar until
  `6-22b` — cost: a member found guilty can re-join on any number until the identifier set clears counsel. *Built: nothing (`6-22d`).
  Suggest: C.*
- **PQ4 (for `6-22d`) — What is a barred person told when they try to join?** No ruling covers it. Options: **A** plainly that they are
  barred by a Trust decision — cost: it tells whoever holds the number (perhaps a stranger with a recycled number) that someone was barred;
  **B** *"We cannot register this mobile number. If you think this is a mistake, please call the helpline."* — cost: a barred person is not
  told the real reason and must call to learn it; **C** the 12-month lock's words — cost: false (they show a date). *Built: nothing
  (`6-22d`). Suggest: B.*
- **PQ5 (for `6-22d`) — Who is "the State Trustee" who imposes?** `-240` cl. 5 rules *"the State Trustee imposes"*; the system cannot gate
  an act on that role (`-240` Consequence 5). The Panel's only ruling on who acts for the State Trustee is `-422` Q1 A — *"A Pariwar Admin
  approves a new version, acting for the State Trustee"* (Trustee-ratified) — but here the Pariwar Admin REFERS, so that reading would let
  the referrer impose. ⭐ THE ONE FACT: the only role distinct from both is `trustee_panel`, and §8.8 (ratified by `-121`) requires a
  termination appeal to be heard by *"a member of the Panel who did not take part in the act"* — with a two-trustee Panel, the imposer
  cannot hear the appeal. Options: **A** `trustee_panel` imposes — cost: it departs from `-422` Q1 A's mapping, and leaves one trustee to
  hear any appeal; **B** another role the Panel names — cost: a new role or grant to design and seed before `6-22d` can be built. *Built:
  nothing (`6-22d`). Suggest: A, with both costs named.*
- **PQ6 (for `6-22d`) — "THE BAN IS TRUST-WIDE": does it end the person's memberships in OTHER Pariwars?** `-240` cl. 5 / `-238` cl. 2
  (*"ABOVE TERMINATION"*). ⭐ THE ONE FACT: stopping only NEW joins leaves existing memberships elsewhere standing — a narrowing of
  "Trust-wide". Options: **A** terminate every membership — cost: it ends memberships in Pariwars where the person did nothing, without the
  prior suspension and notice §8.4 sets for a termination; **B** stop new joins only — cost: a narrowing of "Trust-wide"; the person keeps
  contributing and claiming elsewhere. *Built: nothing (`6-22d`). Suggest: A.*
- **PQ7 — What does an open fraud flag do to a claim's approval?** No ruling covers a STAFF flag; who is paid is the Panel's (§0 — what
  the Trust owes a family). ⭐ THE ONE FACT: as built, a flagged claim on a member who may be alive can be approved and PAID before a
  finding — and once it is `approved` / `settled`, a finding can no longer close it (`6-22c`). The Panel's own rule for the nearest signal
  — a neighbour's *"they have not died"* (`-263` FQ10) — is a WARNING; `-304`'s author reading (⛔ not ratified) says *"making any other
  answer gate, delay or flag a claim changes who is paid"* — a neighbour's answer, not a staff flag (G21). Options: **A** a WAIT at both
  approvals until a finding (the `SuspicionAppealPendingError` shape) — cost: a flag on a death that DID happen never receives a finding,
  so the claim would wait for ever unless the Panel adds a "flag closed: death confirmed" step, which it must confirm is not a third
  outcome under `-238` cl. 4; **B** a WARNING on `-264` FQ12's list (the approver records a reason to go on — the late-warning wait,
  `-277` Q3 B) — cost: a determined approver can still approve with a reason; **C** nothing (built) — cost: a living member's false claim
  can be paid during the investigation; the ground inspection every approval needs (`-263` FQ9) is the only backstop. *Built: C. Suggest:
  B — it is the Panel's own rule for "someone says the member is alive".* ⚠ A GO-LIVE condition for the flag.
- **PQ8 — When an investigation closes a claim because the member is alive: is the claimant told, may they appeal, and may they file
  again?** No ruling covers it. ⭐ THE ONE FACT: the Panel has ruled BOTH ways on a closure notice — `-291` Q2 B texts the TRUE NOMINEE
  once at her declared mobile when an allowed appeal closes her claim; `-318` Q3 A sends ⛔ no text when a claim is closed for another
  claim of the death (the app shows the closed status) — and here the person a text would reach is the FILER, at the `claim_contacts`
  mobile, who may be the person who lied. As built the same filer can file again at once and re-lock the released member (G21). Options:
  (a) notice — **A** the `-291` Q2 B text, once (*"Your claim for [member] has been closed. Please call the helpline."* — accusing no one;
  its DLT template reused) — cost: a message to a filer who may be the fraudster, warning them before `6-22d` acts (a filer agreed to be
  contacted at filing — 6.19a, as `-291`'s reading records — so `-262` FQ7's counsel question, which `-291` Q2 B rides, does not reach
  this text); **B** nothing (built — the app shows *"This claim has been closed. Please call the helpline."*, the `-318` Q3 A shape) —
  cost: an honest filer who does not open the app learns only by calling; (b) appeal — **A** appealable within 90 days (the `-291` Q1 A
  shape) — cost: a staff appeal path for a claim whose subject has been SEEN alive; **B** not appealable (built) — cost: a family whose
  claim was closed on a wrong proof of life (PQ9) has no remedy but to file again; (c) re-filing — **A** allowed, each new claim needs its
  own investigation (built) — cost: the same filer can re-lock the member at once; **B** a new claim for a member found innocent is
  refused at intake unless a District Admin allows it — cost: a later REAL death of that member is held at intake until a District Admin
  acts. And what helpline staff SAY to a calling claimant is a disclosure: the label *"Closed — the member was found alive"* (DL10 (iii),
  and for a claim held by a fraud-closed claim, DL10 (v)) — `-318` put the staff wording to the Panel; this asks it to confirm this one.
  *Built: (a) B, (b) B, (c) A, the label as DL10. Suggest: (a) B, (b) B, (c) B, the label as built.* ⚠ A GO-LIVE condition for the close.
- **PQ9 — What proof that the member is ALIVE lets staff close a claim?** No ruling sets a proof-of-life standard (`-261` D3 A rejected a
  bare staff "alive" mark; nothing says what replaces it). ⭐ THE ONE FACT: the proof decides when a family's death claim is closed for
  good — a wrong "alive" closes a genuine family's claim (TR13), and as built a found-alive close is not appealable (PQ8 (b)). Options:
  **A** in person only — cost: slow or impossible for a member far from any staff; **B** in person or by video call — cost: a video can be
  staged, or answered by someone else for the member; **C** B, or a ground inspection that finds the member alive — cost: the inspection
  was designed to confirm a death, not a life, and the inspector is not the finder. A phone call alone is excluded in every option (anyone
  may answer for the member). *Built: C (`in_person | video_call | ground_inspection`). Suggest: B.* ⚠ A GO-LIVE condition for the finding.
- **TL1 (told) — four quiet choices.** (i) A member found innocent can again be one of the five asked to confirm a colleague's death
  (DL11) — "People who know me" and nominee links still treat them as reported (residual); (ii) bans on nominees, claimants and
  non-members wait for counsel, and counsel has not yet been asked (`6-22b`'s first task writes the question); (iii) the release is built
  before counsel — the Panel was told twice that the register *"waits on legal advice"* (the `-261` D3 option text, note
  `2026-09-27-6-20-confirm-what-we-recorded`, and `-339` RF1 C's cost); counsel gates only `-238` cl. 6's identifier set, which this story
  does not build; (iv) investigation notes, which may describe a filer who is not a member, are kept with the claim until `6-22b` applies
  `-240` cl. 1.
- **TL2 (told) — how a finding is made.** The helpline operator flags, a DIFFERENT person — the District Admin — records the finding (the
  ruled chain, kept), with a note and a step-up; WHAT proof of life is required is PQ9's, not told.

## Acceptance Criteria

1. **AC1 — The records (DL1, DL2).** Migrations in order — the `claim_nominee_findings` CHECK + index change ALONE (hand-written), then
   `claim_fraud_investigation_steps` (hand-authored whole, policies included — ⛔ `db:generate`); drizzle schema + journal agree, `idx` /
   `when` unique after any rebase ([[project_live_db_test_gotchas]], [[project_sibling_migration_when_order_shared_db]]). Live-DB: a second
   member finding of EITHER kind on one claim ⇒ 23505; a `member_found_guilty` with a rank ⇒ 23514; a `nominee_disqualified` with a NULL
   rank ⇒ 23514 (the `IS NOT NULL` kept); a second step of the same kind ⇒ 23505; a `found_innocent` AND a `found_guilty` step on one
   claim ⇒ 23505; a `found_*` step without `alive_confirmation` or `finding_id`, and a `flagged` step WITH either ⇒ 23514; UPDATE of any
   step column but `note_ciphertext` ⇒ refused; DELETE ⇒ refused, but deleting the parent claim cascades through both tables; TRUNCATE ⇒
   refused; another Pariwar's session sees no step.
2. **AC2 — The leaf's body is untouched and blind to guilt (N3, DL8).** Live-DB: a claim with `member_found_guilty` ⇒ `isDeathReportStanding`
   TRUE (erasure 409 `rtbf.death_reported`, withdrawal 409 `withdrawal.death_reported`, Life Events 409, declare 409
   `nominee.locked_claim_filed`); a different seeded claim with `member_found_innocent` ⇒ FALSE; `listStandingDeathReports` returns exactly
   the claims `isDeathReportStanding` counts (same seed). ONE test named for PQ1 so a ruling of A flips it visibly. `git diff` shows
   `isDeathReportStanding`'s body unchanged — `death-report.ts` gains only `listStandingDeathReports` (sharing its fragment; fence count 1)
   and the header's swap-point note.
3. **AC3 — Flag (DL4, DL5, DL6).** API live-DB: a helpline operator (through DL5's read) flags (201, step row, `claim.fraud_flagged`, state
   unchanged); the same `step_id` again ⇒ 200 replay, no second event; a DIFFERENT `step_id` ⇒ 409 `fraud_investigation.already_flagged`;
   a District Admin, a verifier and a `pariwar_admin` ⇒ 403; a member with NO posting can still be flagged (pariwar dimension) — but not
   found (AC4); a flag with no note ⇒ 400. DL5's read lists a `denied` and a `settled` claim naming the member (the shipped reads drop both
   — the leg FAILS on a reuse of them as-is), returns ids / states / dates / step status only (a planted claimant name is absent), and
   clamps its limit. ONE domain test named for PQ7: a flagged claim with no finding still passes `assertClaimApprovable(…, { step:
   'district_admin' })` AND `{ step: 'final' }` — seeded fully approvable with `claimAt('verifier_review' | 'verifier_approved')`
   (`packages/domain/tests/integration/claim/ground-inspection-approval.spec.ts`), the `.resolves.toBeUndefined()` shape; its HTTP twin
   copies `apps/api/tests/integration/claims/ground-inspection-required-routes.spec.ts` asserting success (the built side C — a ruling of A
   or B flips both visibly). Unit: the exact holder sets of DL6.
4. **AC4 — The innocence finding releases and closes (DL3, DL12, N4).** API live-DB, the member seeded through real events
   (`seedLifecycleMember` — TR3): un-flagged ⇒ 409 `fraud_investigation.not_flagged`; no `alive_confirmation` / no note ⇒ 400; a
   `super_admin` who flagged the claim, and a user granted BOTH `helpline_operator` and `district_admin` who flagged it, then trying to find
   it ⇒ 409 `fraud_investigation.finder_is_flagger`; a member with no posting ⇒ the finding 403s for every role (G7 — a recorded residual);
   flagged + innocent ⇒ the finding row, `claim.nominee_lock_released`, `claim.closed` (`fraud_finding_innocent`, no `held_by`), the step —
   ONE transaction; THEN, for the member: a nominee re-declare succeeds (with its `nominee_change` step-up), erasure is refused only by its
   ordinary rules (`active` ⇒ `rtbf.invalid_state`, not `death_reported`), withdrawal (with step-up) and a Life Events write succeed, the
   account-frozen overlay is OFF. A member with a SECOND standing claim stays locked, the overlay stays ON, and the response lists that
   claim. An `approved` claim (seeded through the projector — the local `claimAt` of
   `apps/api/tests/integration/claims/peer-answers-approvers.spec.ts`, copied (the domain `_one-payment-fixtures.ts` is not importable from
   apps/api) — ⛔ `forceClaimState`, whose state the finding's replay resets — TR3)
   ⇒ finding + release, no close, `closed: false, reason: 'committed'`, the overlay stays ON. A member whose declared nominee's relationship
   is `other` (the correction foreclosed — `-237` cl. 2; seeded with `relationship: 'other'`) is still released (`-261` N2). Without a fresh
   step-up for `FRAUD_FINDING_STEP_UP_CONTEXT` ⇒ 403 `auth.step_up_required`, and no step row, no finding, no event.
5. **AC5 — The closure core runs (DL3).** A finding on a claim in `appeal_stage_1` with an open appeal journey, and one with a live R9
   session (both seeded through `claimAt` / `emitClaim`), closes the claim AND ends the process (`endLiveProcesses`' observable rows). A
   two-connection race between the finding and an appeal writer on the same claim ⇒ one waits (`pg_blocking_pids`), no 40P01; if the
   finding commits first the appeal writer is REFUSED by its own state guard (the claim is `closed`), otherwise the finding closes the
   claim the appeal writer left — both orders run; mutation: take the claim row before the appeal key ⇒ RED.
6. **AC6 — The lock order is real (DL3, DL12).** Using `sendWhileHolding`: hold the intake key on a second connection, fire the finding,
   prove it WAITS (`pg_blocking_pids`), release ⇒ it commits. A SECOND INTAKE racing the finding: drive `recordFraudFinding` on a test-held
   client (BEGIN, call, do NOT commit), fire the intake over HTTP, assert it waits, COMMIT, assert a NEW standing claim was minted — never
   absorbed into the closed claim (mutation: remove the finding's intake key ⇒ RED — `tryConverge` (3b) / (3c) takes no claim-row lock, so
   without the key it is absorbed). An upper-case id ⇒ the same intake key, and the appeal / R9 / trustee keys built from the row's id
   (TR11).
7. **AC7 — The guilty finding and the sticky freeze (DL2, DL3, DL13, N7).** Flagged + guilty ⇒ `member_found_guilty`,
   `claim.member_found_guilty` (payload carries `deceased_member_id`), `claim.closed` (`fraud_finding_guilty`), step `found_guilty`; the
   member stays locked (AC2) AND the account stays frozen: ONE equivalence test runs `getMemberAccountOverlay`,
   `memberDomain.listPublicDirectoryMembers(db, pariwarId, { now })` and `listAccountFrozenMemberIds` over the SAME seeded members —
   innocent-closed, guilty-closed, guilty on a `denied` claim AFTER `claim.denied_no_appeal`, guilty on a claim already `closed` (no new
   close), open, approved — and the three agree. Seeding: each member in a visible state (`active` / `active-in-grace` / `lock-in`) WITH a
   `member_kyc_profiles` row (the read INNER-JOINs it; `seedLifecycleMember` seeds none — copy `seedDirectoryMember`), no suspension; the
   innocent-closed member is PRESENT in the directory as the positive control (else "absent" passes vacuously); `listAccountFrozenMemberIds`
   runs with `app.pariwar_id` set (it throws without it). The test is named for PQ1 so a ruling of A flips the guilty rows visibly. A
   second finding of either kind ⇒ 409 `fraud_investigation.already_found`.
8. **AC8 — Idempotence and targeted conflicts (DL3, DL12).** Retrying the same finding request (same `step_id` / `finding_id`) ⇒ 200 with
   the SAME event version (the LAST event the finding wrote) and no second event; a different `finding_id` on a found claim ⇒ 409; a
   planted PK collision ⇒ 500 (never "duplicate"); the same for `recordMemberGuiltFinding`. The existing `nominee-lock.spec.ts` /
   `nominee-determination.spec.ts` / `findInnocent` callers stay green with no assertion weakened.
9. **AC9 — OP10 and the close trigger (DL10 (v), DL13).** A claim R closed `suspicion_appeal_allowed` with `held_by` = a claim C later
   fraud-closed reads `closed_member_alive` and the label *"Closed — the member was found alive"* — not *"the other claim … was later
   refused; the family may file again"* (the reachable change; mutation: drop the holder leg of `readClosedMemberAliveBulk` ⇒ RED). The
   OP10 trigger guard is DEFENSIVE — a raw-inserted `claim.closed` carrying BOTH a fraud trigger and a `held_by` is not labelled
   `closedHolderRefused` (the only leg that can prove it). A sibling claim of the same death keeps its existing OP10 behaviour;
   `suspicion-notice.ts` does not send `closed_after_appeal` for a fraud close (a test each). `ClaimClosedPayloadSchema` rejects a held-
   trigger payload without `held_by` and a fraud-trigger payload with one; `closeOtherClaimsOfDeath` does not type-check with a fraud
   trigger.
10. **AC10 — The override door (DL9 (b), (e), (f)).** `overrideIntakeAttempt` onto a `closed` against-claim ⇒ 409 (its own code, through
    `overrideConvergence`'s catch — ⛔ a 500); onto an `approved` claim released by innocence ⇒ the door answers (a `pending-kyc` /
    `withdrawn` member ⇒ 409 `claim.intake_refused`, as at intake); a merge confirmed after a finding closed the canonical claim is refused
    under the lock; an attempt parked beside a claim later found-alive-closed stays `pending` (the residual, pinned); the existing override
    specs stay green.
11. **AC11 — Peer-mesh follows the release, and only peer-mesh (DL11).** Live-DB: the released member seeded `active` WITH a
    `member_identities` row (the jobs `claim-peer-mesh.test.ts` seeding; `seedLifecycleMember` seeds none); the positive leg first proves
    the same member eligible with NO claim; then a member with a claim released by innocence is ELIGIBLE as one of the five
    (`peerMeshEligibleMemberSql`) and is not labelled `no_target:peer_reported_deceased`; a member with a guilty or un-found claim stays
    excluded; `knownPeopleCallerSql` / `listRequestsNamingMe` / `nominee/member-links.ts` behaviour is UNCHANGED for the released member (a
    test pins the residual). The fence's `gateSqlCopies` shows `peer-mesh-read.ts: 2`.
12. **AC12 — Events and audits (DL13, DL14, N6).** `CLAIM_EVENT_TYPES` +2 (READ LIVE; the pin's history comment),
    `STORY_6_22_CLAIM_EVENTS` frozen literal; `claim-registry-coverage.test.ts` passes UNCHANGED once the registry has both entries; every
    payload and audit context contains no note and no name (a planted value asserted absent on the serialized payloads and on
    `td.auditSink`); every refusal emits its `_rejected` audit with the reason code; a note-decrypting read emits
    `admin_claim.fraud_notes_read`; the new types are in `audit-log-sink.test.ts`'s dotted-action list.
13. **AC13 — The staff surfaces (DL7, DL10).** Admin component tests: the panel's finding form (radios not pre-selected; note and alive
    confirmation required; the other-claims list after the finding; the `StepUpPanel` path); DL7's read — a non-holder of
    `claim.record_fraud_finding` sees every note `withheld` uniformly and no Record action, a holder sees the notes (API leg: the decrypting
    read audited); the helpline section + flag (a `denied` claim listed); the District Admin work-list (a flagged un-found claim in the
    viewer's district listed and linked, one in another district absent); the closed-claim label *"Closed — the member was found alive"*
    for `closed_member_alive` (own close and held-by), the existing labels otherwise, `closed_member_alive` winning over
    `closed_holder_refused`; every refusal → copy (no raw code); `role="alert"` / always-mounted `role="status"`; `pnpm microcopy:check`
    green (TR16). A real-browser pass ([[project_admin_browser_pass_launcher]]; [[project_agent_chrome_cannot_reach_localhost]] — probe
    once) — or recorded un-attested ([[feedback_record_unattested_no_backfill]]).
14. **AC14 — Erasure and the gate (DL15).** Live-DB as `twt_app`: `anonymizeMember` on an innocence-released member scrubs every step's
    `note_ciphertext` to the sentinel (rows matched > 0 — the UPDATE policy) and leaves every other column; `rtbf-anonymize.test.ts`'s
    three pins move (31 → 32, 28 → 29, 27 → 28 — unchanged at `91ea2c81`; READ LIVE) with a history comment and the table list. Every
    `ci:local` job green (37 / 37 at `91ea2c81` — READ LIVE) on a FRESH container, DB named `twt_dev`, the story's own port
    ([[project_prepush_hook_inherits_5432]]).

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST, no code** ([[feedback_governance_commits_precede_implementation]])
  - [x] 0.1 `git fetch origin`; confirm `91ea2c81` is an ancestor of HEAD (rebase if `origin/main` moved — ledger-only conflicts, branch on
        top, [[project_rebase_ledger_conflict_separator]]); `git diff --name-only 91ea2c81 origin/main -- apps packages scripts` — re-derive
        G1–G21 if anything moved (⚠ 6.39 touches `assertClaimApprovable`, `CLAIM_EVENT_TYPES`, the catalog and the migrations); `git log
        91ea2c81..origin/main -- .decision-log.md _bmad-output docs/launch-gate-inventory` — read any new entry; re-read TR10's numbers
        across EVERY branch and worktree. TRACE and record here: (i) DONE at `91ea2c81` — `peerMeshEligibleMemberSql` calls `namedByClaimSql`
        directly (DL11); re-confirm; (ii) the grep of G1 / DL2 (no "any finding" reader); (iii) every surface that renders a `closed` claim
        (G9 — confirm the four `closedClaimStateLabel` callers and three handlers); (iv) 6.36 W2's and 6.23b EA10's reachability now that a
        finding exists (DL16); (v) the closure core's exported entry points and `endLiveProcesses`' inputs (DL3 step 6); (vi) the 6.23a
        label's reason and new trigger (DL16); (vii) the jobs `*-no-decision.test.ts` table lists (DL1). Check `ListAgents` + the branch
        before every commit ([[feedback_concurrent_review_agents_mutate_tree]]).
        - **2026-11-01 — DONE at `91ea2c81`** (`origin/main` unmoved — ⛔ rebase; G1–G21 stand). Numbers re-read on every branch:
          ⛔ sibling has taken any yet (6.39 / 14-3 / 13-2 sit at `-430`, `0193`, v56) — next free stays `-438`, `0196`, v58, Row 46
          (reserved by 6.39 / 14-3 in their files — Task 0.5 re-reads), ledger `ab`. Results in the Debug Log: (i) ✅; (ii) ✅ seven
          readers, each an exact kind equality — ⛔ "any finding" reader; (iii) ✅ four callers, three handlers; (iv) **6.23b EA10 —
          UNREACHABLE both ways; ⛔ anchor fix exists to build** (the third outcome — BigDev confirms at Task 0.4); 6.36 W2 — unreachable
          by N4; (v) ✅; (vi) recorded; (vii) two `DECISION_TABLE_NAMES` lists.
  - [x] 0.2 Put DL1–DL17 to BigDev (DL0's split is answered). Specifically: DL3's `alive_confirmation` values (built pending PQ9); DL6's
        table; DL10 (iii)'s label verbatim and (v)'s label for a claim held by a fraud-closed claim; DL10 (iv)'s work-list; DL16's 6.23b EA10
        choice (fix here, or explicit deferral with owner + trigger). Record the answers here.
        - **2026-11-01 — BigDev: *"DL1-DL16 accepted as written."*** DL1–DL16 stand as written in v1.3, including: DL3's
          `alive_confirmation` set `in_person | video_call | ground_inspection` (built side, pending PQ9); DL6's table (flag pariwar,
          finding district + step-up); DL10 (iii)'s label *"Closed — the member was found alive"* verbatim and (v)'s use of it for a
          claim held by a fraud-closed claim; DL10 (iv)'s District Admin work-list. ⚠ STILL OPEN: **DL17** (the scope fence — not in
          the accepted range) and **DL16's 6.23b EA10 row**, which as written leaves the choice open (fix here, or explicit deferral
          with owner + trigger) — Task 0.2 stays unticked until both are answered.
        - **2026-11-01 — BigDev, both open items:** DL17 — *accepted as written*. DL16's 6.23b EA10 row — *re-trace, then decide*:
          Task 0.1 (iv) re-traces it; if the fix is a small change to the 90-day anchor it is BUILT here (*"Closed by 6.22 DLn"*, with
          its own Task and AC leg added then), otherwise it gets *"Resolved via explicit deferral"* naming owner and trigger. ⭐ BigDev
          CONFIRMS which, from the re-trace, BEFORE Task 0.4's decision entry is written. Task 0.2 complete.
  - [x] 0.3 Draft ONE routing note from the template (by path, not copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-22-fraud-register-first-half.md` — PQ1–PQ9 + TL1–TL2;
        plain-English question first, THE ONE FACT, options with an honest cost on EACH, evidence LAST; E4 commands run. Status: WRITTEN, not
        sent (BigDev sends). Non-blocking for build and merge; PQ1 blocks the guilty arm's GO-LIVE, PQ7 the flag's, PQ8 the close's, PQ9 the
        finding's; PQ3–PQ6 gate `6-22d`'s build.
        - **2026-11-01 — WRITTEN, ⛔ NOT SENT:** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-01-6-22-fraud-register-first-half.md`
          — Q1–Q9 (= PQ1–PQ9) + "Told" 1–5 (= TL1 (i)–(iv), TL2); every option costed; suggestions as the PQs; E4 run 2026-11-01 at
          `91ea2c81` — every command returns the cited text (the approval-check grep EMPTY by design; the re-file grep corrected to
          `readRefileGuard` → `closedClosureIdOf` after it first returned empty).
  - [x] 0.4 ⭐ FIRST, BigDev confirms DL16's EA10 closure from Task 0.1 (iv)'s re-trace. Decision entry (AUTHOR-COMMIT, the next free number across branches — `-438` at `91ea2c81`; READ LIVE): DL0–DL17 as answered;
        the two keys (outside `-210`'s delegated mint); cites `-238`, `-240`, `-261` D3 A, `-425` 6.38 DL4 / DL7; declares the scope split
        (`6-22b`, `6-22c`, `6-22d`, named); DECLARES the guilty arm's kept locks and sticky-frozen account as a narrowing of `-423` Q1 (b) /
        `-424` Q2 (a) pending PQ1; RECORDS `-147` cl. 3's re-examination — the fence fires (a guilty finding is a new reason the freeze
        persists; an innocent close a new path that ends it): `NOT_DECEASED`'s predicate and the `-146` sentence re-read, the result stated,
        and any policy question routed inside PQ1; records that the flag gates nothing (PQ7), that a found-alive close sends no message and
        has no appeal (PQ8), and the built proof-of-life set (PQ9) as BUILT SIDES pending rulings, not as decisions; keeps the ruled
        two-actor chain (operator flags, District Admin finds); supersedes no ratified entry. Committed ALONE, first.
        - **2026-11-01 — BigDev, EA10:** *"Closed, test pins it"* (the re-trace's third outcome — ⛔ fix exists to build; Task 2.4 gains
          the pin). **Decision `2026-11-01-438` committed ALONE as `8ce9f87b`** — DL0–DL17 as answered; the two keys minted; the split;
          the guilty arm DECLARED a narrowing of `-423` Q1 (b) / `-424` Q2 (a) (both quoted in full) pending Q1; `-147` cl. 3 re-examined —
          predicate gains the sticky leg only, the `-146` sentence stays true, the question rides Q1; Q7 / Q8 / Q9 recorded as BUILT SIDES;
          the two-actor chain kept; EA10 and W2 closure words fixed (item 12); supersedes nothing.
  - [x] 0.5 Records: the three rows `6-22b-…` / `6-22c-…` / `6-22d-…` in `sprint-status.yaml` (backlog, with comment blocks carrying DL0's
        lists verbatim — `6-22d`'s trace list included); `deferred-work.md` — PQ1–PQ9 open, the `6-22b` counsel question owed, DL11's
        residual, DL9 (c) and (f); a go-live roster row or legs in `docs/launch-gate-inventory/inventory-roster.md` (READ the roster first —
        Row 46 is reserved by 6.39 and 14-3; take the next free row of the same shape): (a) PQ1 ruled and reflected (the guilty arm; the 6.38
        helpdesk copy, G9; `-147`'s result); (b) PQ7 ruled and built — the flag must not go live while a flagged claim can be paid; (c) PQ8
        ruled and built (notice, appeal, re-filing, the staff label); (d) PQ9 ruled and the built set matched; (e) 6.22's browser pass
        attested; (f) `6-22b`'s counsel question SENT; (g) 6.38 round-2 D1 (c); a retention-matrix row for `claim_fraud_investigation_steps`.
        An `epics.md` entry for Story 6.22 (none today — 6.20's `> ⚠ Minted by…` header shape).
        - **2026-11-01 — DONE:** rows `6-22d-…` / `6-22b-…` / `6-22c-…` minted `backlog` in `sprint-status.yaml` with DL0's lists
          verbatim (+ `6-22d`'s trace list, DL9 (c), the disqualifier's defects); `deferred-work.md` — a "Story 6-22 — Task 0.5" section
          (Q1–Q9 open, the counsel question owed, DL11's residual, DL9 (c) / (f)); roster **Row 47** `fraud-register-finding-live` (Row 46
          is 6.39's, re-read on every branch) — legs (a)–(g) as listed + (h) the retention-matrix row (OUT-OF-REPO — architecture §2.12, the
          6.20 precedent: carried as a leg, ⛔ written here); `epics.md` — Story 6.22 after 6.38, the minted-header shape.
  - [x] 0.6 Ledger line + row `ready-for-dev → in-progress` ([[project_sprint_status_safe_prepend]]; verify the YAML parses).
        - **2026-11-01 — DONE:** ledger `2026-11-01ac`; row `6-22` → `in-progress`; YAML parsed after the prepend.
- [x] **Task 1 — The records (AC1)**
  - [x] 1.1 The findings migration (DL2) ALONE, hand-written — the rank CHECK keeps `IS NOT NULL`; `CLAIM_NOMINEE_FINDING_KINDS`,
        `MEMBER_FINDING_UNIQUE_PREDICATE` and the schema file's `uniqueIndex`; the fence allow-list unchanged (the schema file is on it).
  - [x] 1.2 `claim_fraud_investigation_steps` (DL1): schema file, barrel, RLS policy file + `policies/index.ts`, branded id (house shape),
        the field-class constant in `encryption/field-classes.ts`, re-exported from `apps/api/src/context.ts`; the migration HAND-AUTHORED
        whole in 0122's order (both unique indexes, the NULL-safe coherence CHECK, the `no action` FK, grants, ENABLE / FORCE RLS, `CREATE
        POLICY` by hand, the guard naming every frozen column, the TRUNCATE trigger) — ⛔ `db:generate`; the jobs `*-no-decision.test.ts`
        lists (Task 0.1 (vii)).
  - [x] 1.3 Live-DB tests for AC1 (copy `tests/integration/rls/claim-death-certificate-policy-regression.spec.ts` and the 6.21a reviews
        spec).
- [x] **Task 2 — The writers (AC2, AC4–AC9)**
  - [x] 2.1 DL12 on `recordMemberInnocenceFinding` (targeted conflict on the predicate, re-read on a 0-row conflict, one unlocked read then
        the intake key then `lockClaimRow`); `recordMemberGuiltFinding` beside it in `nominee-lock.ts`; `listStandingDeathReports` in
        `death-report.ts` sharing the leaf's fragment — existing tests stay green with no assertion weakened.
  - [x] 2.2 The closure core (DL3 step 6, DL13): `closeLockedClaim`'s discriminated input; `CLAIM_CLOSED_HELD_TRIGGERS` /
        `CLAIM_CLOSED_FRAUD_TRIGGERS`; the exported fraud closer (`endLiveProcesses`); the discriminated `ClaimClosedPayloadSchema`; OP10's
        defensive guard; the registry text. The STICKY freeze (DL13): `ACCOUNT_STICKY_FREEZE_EVENT_TYPE` + its SQL fragment exported from
        `member/overlay.ts`, used by `evaluateAccountOverlay` (per-stream flag; `OVERLAY_EVENT_TYPES`), `getMemberAccountOverlay`,
        `member/directory-read.ts` `NOT_DECEASED` and `listAccountFrozenMemberIds`; the overlay header's consumer list corrected (G20) and
        the swap point named (DL8); `packages/domain/tests/member/overlay.test.ts` gains the sticky cases.
  - [x] 2.3 `fraud-investigation-persist.ts`: `flagClaimForFraudInvestigation` (replay on the same `step_id`), `recordFraudFinding` (DL3
        steps 1–6 — the replay first; never spelling a finding kind, TR2); `readClosedMemberAliveBulk` beside
        `readClosedHolderRefusedBulk` (steps table + the `held_by` holder leg, DL10 (iii) / (v)); `FRAUD_ALIVE_CONFIRMATIONS`; DL5's
        reader in `claim/read.ts` and DL10 (iv)'s work-list read (`clampLimit`); this writer added to
        `acquireSuspicionReversalLockForClaim`'s "every intake-key taker" list; errors in `claim/errors.ts`; the two annotations + two
        triggers — tuple, payload map, reducer arms, registry, counts.
  - [x] 2.4 Tests: AC2 (with the PQ1-named leg), AC3 (the PQ7-named domain leg), AC4 (domain half), AC5, AC6 (the test-held finding client
        for the intake race), AC7 (the three-reader equivalence test, with its positive control), AC8, AC9 (the holder-direction leg + the
        raw-insert guard leg). ⭐ The 6.23b EA10 pin (BigDev, Task 0.4; `-438` item 12): approve C2 with reasons over its keys, record
        innocence on an EARLIER claim C1 of the same member, assert C2's warning keys are a SUBSET of before and ⛔ late key is queued
        (`correction-queue-read.ts` `lateArm`) — named for `-279` A7. Seed claim states through `claimAt` / `emitClaim`
        (`packages/domain/tests/integration/claim/_one-payment-fixtures.ts`), ⛔ `forceClaimState` (TR3).
- [x] **Task 3 — The override door and convergence (AC10)** — DL9 (b) in `overrideIntakeAttempt` (closed-against error + the door);
      `overrideConvergence`'s catch maps both (`translateClaimIntakeRefused(err, { withReason: true })` + the new code); DL9 (e) the
      under-lock candidate re-check in `convergeIntakeAttempt`; BOTH DELIBERATE doc blocks rewritten (DL9 (b), (d)); DL9 (f)'s residual
      pinned by a test.
- [x] **Task 4 — Keys and API (AC3, AC4, AC12, AC13)**
  - [x] 4.1 Keys (DL6) — `SEED_PERMISSION_KEYS` with reuse-check comments, the bump block citing Task 0.4's decision (READ LIVE the version —
        58 if still 57), grants, the two count pins + the exact `holdersOf` pins; `FRAUD_FINDING_STEP_UP_CONTEXT` exported from contracts.
  - [x] 4.2 Contracts `packages/contracts/src/claims/fraud-investigation.ts` (`.strict()`; flag / finding requests and responses, DL5's
        read, DL7's read with `ReadableNote` + `viewer.canRecordFinding`, DL10 (iv)'s list, the `alive_confirmation` `z.enum` mirrored from
        `FRAUD_ALIVE_CONFIRMATIONS` with a lockstep test); `closed_member_alive` on the three DTOs beside `closed_holder_refused` — ⚠ new
        required fields break fixtures (`packages/contracts/tests/claims-suspicion-refusal.test.ts` and the admin tests G9's callers feed);
        run the contracts vitest ([[project_contracts_tests_outside_tsc]]).
  - [x] 4.3 Routes + handlers `apps/api/src/modules/claims/claims.fraud-investigation.{routes,handlers}.ts`, registered in
        `registerClaimsModule` (`modules/claims/index.ts`): (a) `POST …/claims/:claimCaseId/fraud-investigation/flag` and (b) `GET
        …/members/:memberId/fraud-investigation/claims` — `claim.flag_fraud` at `{ dimension: 'pariwar' }`; (c) `POST
        …/claims/:claimCaseId/fraud-investigation/finding` — `claim.record_fraud_finding` at the district via
        `resolveNomineeNameCheckDistrict()`, step-up `FRAUD_FINDING_STEP_UP_CONTEXT`; (d) `GET …/claims/:claimCaseId/fraud-investigation`
        (DL7) — `claim.verify` at the district; (e) `GET …/fraud-investigations` (DL10 (iv)) — district-scoped (`resolveQueueScopeStash`).
        `actor_display` via `resolveDisplay`. `closed_member_alive` filled in the three G9 handlers under `underSavepoint`. Every path
        contains `fraud-investigation(s)`; the file in the human-actor gate's `COVERAGE_SET`
        (`scripts/claim-adjudication-human-actor-invariant/check.ts` — `{ file, pathSubstrings: ['fraud-investigation'], owner: 'Story
        6.22', expectedMethods }` listing every method) and `COVERAGE_FLOOR` set to the new `COVERAGE_SET.length` (the floor is 16 while
        the set holds 18 entries at `91ea2c81` — READ LIVE) with a history note; audits (DL14) incl. the `_rejected` types and the
        decrypting read, added to `audit-log-sink.test.ts`'s list.
  - [x] 4.4 Tests: the API legs of AC3, AC4, AC12, AC13 (DL7's withholding, the work-list scope).
- [x] **Task 5 — Peer-mesh (AC11)** — DL11's fragment in `peer-mesh-read.ts` (alias `f`); the one-line swap in
      `peerMeshEligibleMemberSql`; `peer-mesh-request.ts` IMPORTS it; the fence's `gateSqlCopies` `peer-mesh-read.ts: 2`; the residual named
      in `known-people.ts`'s accepted-cost comment (comment-only edit there).
- [x] **Task 6 — Surfaces (AC13)** — `apps/admin/src/api/client.ts` functions + `api/hooks.ts` hooks (copy `postDeathCertificateReview` /
      `usePostDeathCertificateReview`, `useDeathCertificateClaimsForMember`); `FraudInvestigationPanel.tsx` (DL7's read, the shared
      `StepUpPanel`); `HelplineFraudFlag` in `HelplineClaimPage`; the `/p/$pariwarId/fraud-investigations` route + list;
      `closedClaimStateLabel`'s new argument at all four call sites; copy in each module's `i18n-en.ts`; component tests; `pnpm
      microcopy:check` (TR16); the browser pass (or un-attested).
- [x] **Task 7 — Close** — DL15 anonymize (the sentinel) + AC14's pins; DL16's dated lines in `deferred-work.md` (the table's exact words);
      the code comments that say "no producer until 6-22" re-worded (G17 — grep `6-22` across `apps` `packages`); the 6.38 helpdesk sentence
      (G9) is left AS SHIPPED and its change tracked by the PQ1 roster leg (true for every member until a guilty finding exists in
      production); after every doc-block edit (the leaf header, `icp.ts`'s two blocks, `known-people.ts`, the overlay header, G17's
      re-wording) `grep -n '\*\*/'` the edited files + the package typecheck ([[project_markdown_emphasis_closes_jsdoc]]); `ci:local` on a
      FRESH container on the story's own DB; Completion Notes, File List, Change Log; Status → review.

### Review Findings — chunk A: the domain / DB layer (2026-11-02, `bmad-code-review 6.22`)

Scope of THIS pass: `91ea2c81..caa15727` (the story branch against `origin/main`, which has not moved) restricted to `packages/domain` +
`packages/events` — migrations 0196 / 0197, the schema, the RLS policy file, the events, the writers and persist, the three overlay readers,
`nominee-lock`, `anonymize`, the RBAC keys and the domain tests (48 files, 4,314 diff lines). The whole story diff is 101 files / 9,313 diff
lines, so BigDev chose a chunked review; the records are spec context, not a review target. NOT yet reviewed: chunk B (contracts, API
routes / handlers / crypto, the audit sink, the human-actor gate script, the API tests) and chunk C (the admin surfaces, the roster Row 47
text, the admin tests). Three layers ran in parallel, read-only: Blind Hunter (the diff as a scratchpad file, told to read nothing else),
Edge Case Hunter (the diff plus the worktree), Acceptance Auditor (the diff, this story, and the load-bearing-invariant checklist as a
lens). Every finding below was re-checked against the tree by the reviewer before it was written. NOT run: `ci:local`, any test, any
database — the review read code and tests, so nothing below is proven by execution, and the story's own "37/37" is not reproduced. The
Acceptance Auditor ran one `git fetch origin` against its read-only brief; it only refreshed remote-tracking refs, and `origin/main` is
still `91ea2c81`.

Panel-routing gate (the template's section 0) applied to every finding: none changes what a person sees or is owed, so there is no
`decision-needed` and no new Panel question. RA1 corrects words the Panel will read; it asks the Panel nothing.

Carried to chunk B (an API-layer claim, not judged from the domain diff): (1) whether every flag / finding / refusal path writes its audit
in the same transaction — the domain writers take an `auditId` only for the `claim.closed` event, so the flag and the non-closing finding
paths carry no audit id on their events; (2) whether the contract rejects a blank or whitespace-only note BEFORE encryption (the domain
checks `noteCiphertext.trim()`, which an encrypted blank passes); (3) the status / `_rejected` mapping for the writers' refusal reasons
(`claim_not_found`, `step_conflict`, `missing_note`, `missing_alive_confirmation`, `missing_display`) and the DTO field-pick (the step
record carries `actorId`; DL7 lists only `actor_display`); (4) `RecordFraudFindingResult.close.reason` is `committed | already_closed`
where DL3 names only `committed`; (5) the human-actor gate script covers the two new routes (the domain writers do not check the actor
kind; the handlers pass a constant); (6) `listClaimsNamingMemberForFraudFlag` returns the newest 20 (cap 50) and drops older claims
without a signal; (7) `apps/api/tests/integration/nominee/nominee-lock.spec.ts` carries a stale "no producer" comment (RA15).

- [x] [Review][Patch] **RA1 — The guilty arm is described as "closed, so nothing is ever paid", which is false for an approved or settled claim; the unsent Panel note still says it (MED)** — the code closes a CLOSABLE claim only: a guilty finding on an `approved` / `settled` claim returns `{ closed: false, reason: 'committed' }`, and the `approvedGuilty` member in `overlay-three-readers.spec.ts` pins it. The sentence appears in: Policy meaning item 2 ("the claim is closed so nothing is ever paid on it"), the PQ1 text in this story ("this story closes the guilty claim (so it can never be paid)"), decision `-438` item 2 (the same sentence), and the routing note `trustee-panel-routing-note-2026-11-01-6-22-fraud-register-first-half.md` — in Q1's lead-in ("their false claim so it can never be paid"), in the option B row of its table ("A guilty member's claim is closed so nothing is paid") and in the closing plain-English paragraph ("nothing is ever paid on it"). The note's own "Corrected in this note" line says the earlier draft's "no claim on a living member is ever paid" was false and that Q7 and the trust section now say so — but the Q1 guilty option, the part a trustee reads to rule PQ1, still carries the unqualified form. Policy meaning item 1 already carries the caveat; item 2 does not. Fix: qualify each sentence ("closed — unless it was already approved or settled, which this story does not stop; row `6-22c`"). The note is NOT SENT, so edit it before BigDev sends. `-438` is an unmerged author-commit, not a ratified ruling; whether to amend it or add a correcting line is BigDev's call on form. Checklist family 11 (REAL GAP, wording); the deferral itself (row `6-22c`) is recorded and is not the finding. Sources: Acceptance Auditor F6; the note and decision sentences located by the reviewer.
- [x] [Review][Patch] **RA2 — The Q1 swap point is six SQL copies plus a constant, but the new header and the story call it ONE (MED)** — `git grep "kind = 'member_found_innocent'"` over `packages/domain/src` finds `death-report.ts` (1), `approval-warnings.ts` (3: three approval-warning reads) and `peer-mesh-read.ts` (2: the filing anchor and `standingReportNamesSql`). The paragraph this diff added to `death-report.ts` says that if Q1 is ruled A "the change is ONE kind in the fragment below + the source fence's allow-list, AND removing the ONE sticky-freeze constant", and N7 / DL8 say "one swap point". The fence (`erasure-and-death-report-fence.test.ts`) counts the copies per file, so a leaf-only flip turns the leaf's own count red (1 to 0) while the other five copies keep their counts and stay green: peer-mesh selection and the anchor, and the three approval reads, would keep treating a guilty member as standing, and `fraud-peer-mesh.spec` (which asserts a guilty member is excluded) would stay green. The fence header also still reads `peer-mesh-read.ts × 1` while its count test says 2. Fix: (a) reword the header, N7 / DL8 and the fence header to name every copy; (b) add a test that ties the copies together — for a guilty-finding fixture the leaf, the peer-mesh fragment and anchor, and the approval reads must agree — so a Q1 = A change cannot go half-way unseen. This lands on a go-live-gating ruling, so the drift is not hypothetical. Sources: Blind Hunter 10, Edge Case Hunter 3, Acceptance Auditor F2 (three layers, independently).
- [x] [Review][Patch] **RA3 — AC5's live-process legs: only the open-appeal leg is tested, and the omission is not in the recorded deviations (MED)** — `endLiveProcesses` ends four things (an open appeal, a live Stage-2 panel, a live R9 session with its `routed_to_r9` row, a live correction return); AC5 (a) names the appeal AND the R9 session. A grep of the domain fraud specs for `r9`, `routed_to_r9`, `stage_2`, `correction` finds nothing (the one `panel` hit is a header comment about the Panel's Q1); `fraud-investigation.spec.ts` has one AC5 test and the concurrency spec races only `initiateAppeal`. The Dev Agent Record's only R9 mentions describe `endLiveProcesses` itself; none is a deviation. If the finding's closer stopped ending the R9 session, nothing would fail. Mitigation (the Auditor's, not re-traced): the same closer is tested by the 6.24a closers. Fix: add the R9-session leg (the AC names it), ideally the other two, or record the omission as a dated deviation — carry it as an un-attested risk, never back-fill. Checklist family 10 (REAL GAP). Source: Acceptance Auditor F1; the grep re-run by the reviewer.
- [x] [Review][Patch] **RA4 — No cross-Pariwar test, and no test with RLS out of the way, for any of the new SQL (MED)** — `readClosedMemberAliveBulk`, `listOpenFraudInvestigations`, `listClaimsNamingMemberForFraudFlag` and the `claim_not_found` paths of the two writers are exercised only after `enterAppScope` (RLS on); there is no second Pariwar in the domain fraud specs or in the API routes spec (the steps table's own RLS is covered in the policy-regression spec). TR4 in this story says to also run the test on the transaction WITHOUT `enterAppScope`. Dropping the explicit `pariwar_id` predicate from any of these would stay green. Fix: one cross-Pariwar leg per reader and writer, run with the scope not entered. Checklist family 3 (REAL GAP). Source: Acceptance Auditor F4; grep re-run.
- [x] [Review][Patch] **RA5 — The database does not tie a step to its finding (MED-LOW)** — `finding_id` is a single-column FK to `claim_nominee_findings`, and the coherence CHECK constrains only NULL-ness, so a `found_innocent` step can point at a guilty finding, or at another claim's finding. The policy-regression spec plants exactly that row (a `found_guilty` step on claim X referencing claim `other`'s guilty finding) to reach the unique index, and the insert gets that far. The leaf, the overlay and peer-mesh read findings; `readClosedMemberAliveBulk` and `listClaimsNamingMemberForFraudFlag` read steps; a mismatched pair makes them disagree. Not reachable today — the only non-test caller of the two finding writers is `recordFraudFinding` (grep) — so fix it while no production row exists. Fix: a unique on findings over (`finding_id`, `claim_case_id`, `kind`), a composite FK from the steps, and a step-to-kind CHECK. Migration form is the author's call; a database that already ran 0197 will not re-run an amended file ([[project_live_db_test_gotchas]]), so a new 0198 is the safer shape. Checklist family 5. Sources: Blind Hunter 2, Edge Case Hunter 5.
- [x] [Review][Patch] **RA6 — Exactly-once is proven only sequentially (MED-LOW)** — replay is tested serially; nothing races the same `step_id` twice, an innocent against a guilty finding on one claim, or two flags with different step ids. It holds by construction (the intake key, the row lock, the two unique indexes), but family 2 asks for "exactly one write, N-1 idempotent no-ops, one event" proven live. Fix: three two-connection tests in the concurrency spec. Checklist family 2 (REAL GAP). Source: Acceptance Auditor F5.
- [x] [Review][Patch] **RA7 — The concurrency spec's "finding first, then the appeal" test cannot fail for the reason it names (LOW-MED)** — the title says the appeal "is REFUSED by its own state guard"; the assertions are `out.ok === false` and `error.code !== '40P01'`, so a TypeError or a "claim not found" passes. Fix: assert the appeal writer's specific refusal (class or code). Sources: Blind Hunter 7a, Edge Case Hunter; read by the reviewer.
- [x] [Review][Patch] **RA8 — The work-list reader is fail-open by default, and its district rule is a second copy (LOW)** — `listOpenFraudInvestigations` takes `isVisible` as optional, and omitting it returns every flagged claim in the Pariwar, `district: null` rows included; the only production caller passes it, so this is a default, not a live leak. The district comes from an inline subquery ordered `created_at DESC, posting_id DESC`, while `getMemberPostingLatest` orders by `created_at DESC` alone — the Edge Case Hunter reports the per-claim gate path uses the latter (not re-traced here), so two postings with equal `created_at` can give different districts. No domain test exercises the keyset loop (the "filter before the page limit, never crowded out" claim) beyond the route spec's two rows. Fix: make `isVisible` required; one district resolver; a domain test with more invisible rows than one scan batch ahead of the visible ones. Sources: Blind Hunter 5, Edge Case Hunter 4 / 7 / 8.
- [x] [Review][Patch] **RA9 — The "defensive guard" test has no positive control (LOW)** — it inserts a raw `claim.closed` carrying a fraud trigger AND `held_by`, forces the claim to `closed`, and expects an empty holder-refused set. It never shows that the same raw shape with a HELD trigger returns the claim, and it does not assert that the `UPDATE ... SET current_state = 'closed'` matched a row — if the claim never reached the join, the test passes without the guard. Fix: a twin with a held trigger that must return `{x}`, and a row-count assertion. Source: Blind Hunter 7b; read by the reviewer.
- [x] [Review][Patch] **RA10 — `recordFraudFinding` validates `aliveConfirmation` at run time but not `outcome` (LOW)** — any value other than `'innocent'` takes the guilty writer, which writes the finding row and the sticky annotation first; it is saved only because `FOUND_STEP[undefined]` later violates NOT NULL and the caller rolls back. Unreachable through the API (the contract enum), reachable by an untyped caller. Fix: the same early guard as `aliveConfirmation`. Source: Blind Hunter 9; read by the reviewer.
- [x] [Review][Patch] **RA11 — A step id already used on another claim or Pariwar surfaces as a raw 23505 (a 500), not `step_conflict` (LOW)** — the replay lookup is per claim and RLS-scoped, so the collision meets the global primary key at the insert; nothing partial persists (the transaction rolls back). AC8 sanctions a 500 only for a planted `finding_id` collision. Fix: catch the steps primary-key 23505 and map it to `step_conflict`, in both the flag and the finding writer. Checklist family 12 (a), low. Sources: Acceptance Auditor F8, Edge Case Hunter 1, Blind Hunter 14.
- [x] [Review][Patch] **RA12 — Three branches have no test (LOW)** — (a) the `catch` in `recordFraudFinding` that turns a member finding recorded OUTSIDE the investigation into `already_found` — the claim then answers `already_found` for ever and stays on the work-list with nothing able to close it; (b) the `annotation.replayed` branch beside it; (c) `FRAUD_ALIVE_CONFIRMATIONS` is not tied to the SQL CHECK list by a test (the policy-regression spec inserts `in_person` and `video_call`, not `ground_inspection`; PQ9 may change the set). (a) and (b) are reachable only by calling the public low-level writer directly or from a seeded row. Fix: tests for (a) and (b) that record the intended behaviour, and one test that inserts every tuple value against the CHECK and refuses one outside it. Sources: Edge Case Hunter 9, Acceptance Auditor F9.
- [x] [Review][Patch] **RA13 — Two spec'd outcomes are asserted nowhere, and neither is a recorded deviation (LOW)** — AC2's guilty-member consumers (erasure 409 `rtbf.death_reported`, withdrawal 409, Life Events 409, declare 409): the PQ1 test asserts only that the leaf is true, and the existing `rtbf.death_reported` spec is for a terminated member with a standing claim, not a guilty one; and AC11's wider residual pin (`listRequestsNamingMe`, `nominee/member-links.ts` unchanged) — only `knownPeopleCallerSql` is pinned. Each consumer reads the shared leaf, so the risk is a consumer re-pointed away from it. Fix: one assertion per consumer for a guilty member, or record the reduction as a dated deviation. Checklist family 10. Source: Acceptance Auditor F3; grep re-run.
- [x] [Review][Patch] **RA14 — Six comment-and-doc drifts, all checked against the tree (LOW)** — (a) `listFraudInvestigationSteps` says "At most three rows exist per claim (the indexes)"; the two unique indexes allow two (the flag plus one found step); (b) in `peer-mesh-read.ts` the new `standingReportNamesSql` JSDoc sits between `peerMeshEligibleMemberSql`'s large JSDoc and its declaration, so the eligibility contract now documents the wrong function; (c) in `rbac/roles.ts` the Story 6.22 FLAG comment and `CLAIM_FLAG_FRAUD` sit between the Story 6.20 "RAISE a nominee correction" comment and `CLAIM_RAISE_NOMINEE_CORRECTION`; (d) the `ClaimClosedPayloadSchema` doc in `events.ts` (re-wrapped by this diff) still reads "`CLAIM_EVENT_TYPES` stays 36" — the count is 39; (e) the fence test header says `peer-mesh-read.ts × 1` (RA2); (f) the replay docs of the flag and the finding say they return "the original result", but the replay recomputes `claimState` / `close.reason` from the current row, so a later close changes what a replay reports (behaviour acceptable; the sentence should say so). Also re-read the comment in the concurrency spec's AC6 (a) ("the inner writer also takes the key — but AFTER the row"), which the Blind Hunter reads as the opposite of the inner writer's own code (not verified). Sources: Blind Hunter 13 / 11 / 14, Acceptance Auditor.
- [x] [Review][Patch] **RA15 — One stale pointer survives G17's sweep (LOW)** — the header of migration `0119` still says "No production writer until row 6-22 lands" (G17 and Task 7 asked for the "no producer until 6-22" comments to be re-worded). Edit the comment only — never regenerate an applied migration ([[project_live_db_test_gotchas]]); if the repo treats an applied migration's text as frozen, record the pointer here instead. The second stale pointer is in a chunk B file (carried above). Source: Acceptance Auditor F10; the 0119 line re-checked.
- [x] [Review][Defer] **RD1 — The two member-finding writers are exported and carry none of the chain's controls** — deferred: `recordMemberInnocenceFinding` / `recordMemberGuiltFinding` are in the package barrel and write the release (or the sticky freeze) with no flag, no finder-is-not-flagger check and no proof of life, because those controls live in `recordFraudFinding`; the source fence pins their kind spelling (TR2), not their callers. The only non-test caller today is `recordFraudFinding` (grep), so nothing is reachable; the shape is from 6.20, which exported the writer with no producer. Trigger: any second importer — then a caller fence or un-export. Source: Blind Hunter 2 (first half).

Dismissed as noise (15 items, covering 21 raised findings), each checked against the tree or the record: (1) a wrongly guilty member can never be corrected — already put to the Panel inside PQ1 ("a member WRONGLY found guilty stays locked for ever ... a 'who may appeal' edge the Panel also owns") and in `deferred-work.md` Q1; (2) an innocent or guilty finding on an `approved` / `settled` claim leaves it live and payable, and an open flag gates nothing — declared (N5, DL9; row `6-22c`; PQ7 is a go-live condition; the wording defect is RA1, not this); (3) a later report on a member found guilty skips the intake door, and an intake attempt parked beside a finding-closed claim stays `pending` — declared (DL9 (c) and (f)), recorded in `deferred-work.md`, and (f) is pinned by a test; (4) a flagged claim whose member has no posting has a null district and no one can record the finding — declared (G7, TR12); (5) the `@ts-expect-error` line in `fraud-closed-payload.test.ts` is a runtime tautology — `packages/domain/tsconfig.json` includes `tests/**/*`, so the compile-time pin is live; (6) the steps note can be overwritten by `twt_app`, and `pg_trigger_depth() > 1` admits any nested delete — deliberate (DL15: the column grant exists for the RTBF scrub), the depth idiom is the one in 0119, 0122 and 0143, and `twt_app` holds no DELETE (a 42501 test); (7) `otherStandingClaims` and the flag picker are capped at 20 — recorded deviation 2, and more than 20 unreleased claims for one member is not reachable through the intake door; (8) the `⛔` glyph reads as an inversion — it is the story's declared register; (9) `DROP CONSTRAINT` without `IF EXISTS` in 0196 (the names exist in 0119, checked by the Edge Case Hunter), the sticky leg in `NOT_DECEASED` without a tenant scope (the same as the pre-existing leg; member ids are global), and the unconditional `encSentinel` per erasure (one production caller, a rare path, the 6.21a pattern); (10) the leaf body is "unchanged" in AC2 yet moved into `standingReportWhere` — recorded deviation 1 (the predicate is byte-identical); (11) the domain writers do not check the actor kind — the API gate and the human-actor gate script own it (chunk B); (12) `claim.fraud_flagged` carries no `deceased_member_id` — no overlay or hook reads it, and the pre-existing `claim.nominee_lock_released` omits it too; (13) the merge re-check compares the candidate by strict equality — that is the intended guard (family 12 (a)), and the handler reads the candidate through the same resolver; (14) the work-list scan is unbounded — it is bounded by the number of open flags and ends on a short batch; (15) a JS `new Date()` in `overlay-three-readers.spec.ts` and an unused `client` argument on the `frozen` helper — trivial, no failure scenario.

Triage: 0 `decision-needed`, 15 `patch`, 1 `defer`, 15 dismissed. RA1-RA15 were applied the same day (below; RA8 in part, and RA1 leaves decision `-438` untouched); RD1 is deferred; the status stays `review` until chunks B and C are reviewed.

#### Patches applied (2026-11-02 — BigDev answered "1", "Apply every patch", to the patch menu)

All fifteen are applied and UNCOMMITTED on `story/6-22-…`. How each landed, and what checks it. "Mutation" below means: the guarded code was broken on purpose, the spec was run and went RED, and the file was restored from a backup (each restore confirmed identical to the pre-mutation state).

- **RA1 — applied to the story and the unsent routing note; NOT applied to decision `-438`.** The story (the summary quote, Policy meaning item 2, the PQ1 text) and the routing note (Q1's opening, option B's row, the closing paragraph, and its "Corrected in this note" line) now say a guilty member's claim is closed *unless it had already been approved or settled*. (Patch-diff review PD1: the routing note's own words are *approved or paid* throughout, and its Q8 opening and closing summary — whose innocent-member sentences had carried no exception at all — now carry it; the story keeps its state words.) Decision `2026-11-01-438` item 2 still carries the unqualified sentence — whether to amend an unmerged author-commit or add a correcting line is BigDev's call on form, and nothing was written to `.decision-log.md`.
- **RA2 — applied.** `death-report.ts`'s PQ1 paragraph names all six copies (leaf 1, `approval-warnings.ts` 3, `peer-mesh-read.ts` 2) plus the sticky constant plus the fence counts; the `standingReportNamesSql` JSDoc points at it; the fence header says `× 2`; N7 and DL8 here carry an amendment. NEW `release-rule-agreement.spec.ts` (6 tests) asks the leaf, the peer-mesh fragment, the peer-mesh anchor and the three approval reads the same question for an innocent, a guilty and an un-found claim, with a `stands()` line to change first. Mutation: a Q1 = A change in any ONE of the six copies turns it red (six runs, six reds).
- **RA3 — applied.** NEW `fraud-investigation-live-processes.spec.ts` (3 tests): a live R9 session with its `routed_to_r9` row, a live correction return with its open run, and an un-finalized Stage-2 panel, each shown live BEFORE the finding. Mutation: disabling each of the three supersessions in `endLiveProcesses` turns exactly its own test red.
- **RA4 — applied.** NEW `fraud-investigation-reads.spec.ts`: the six readers and both writers asked for PARIWAR_A about PARIWAR_B's data with RLS bypassed (the superuser, scope not entered), each with a PARIWAR_B control. Mutation: dropping the explicit `pariwar_id` predicate from each of the readers (6 sites) turns it red. The finding writer checks the Pariwar twice (its first read and the row lock), so removing EITHER one alone changes nothing observable (an equivalent mutant); removing both turns it red. The two writers are separate tests so one cannot mask the other.
- **RA5 — applied; needs a fresh-container run.** NEW migration `0198_claim-fraud-step-ties-its-finding.sql` (hand-authored; journal idx 198, `when` 1796701200043; no other branch or worktree claims 0198): `UNIQUE (finding_id, claim_case_id, kind)` on the findings, a stored generated `finding_kind` on the steps, and the single-column FK replaced by a composite FK. The TS schemas declare the column, the FK and the unique. Five new regression tests (own-claim, own-kind, the generated column is unwritable, the steps' own one-found-step index still bites with the FK dropped inside a rolled-back transaction, and RA12's tuple). Mutation: dropping the FK on the story DB turns four tests red; restored with the identical statement. ⚠ *[Corrected 2026-11-02, code review round 2 R2-15 (b): the patch-diff review's PD11 later REPLACED the "FK dropped inside a rolled-back transaction" leg with a `pg_temp` clone ([[project_test_only_ddl_use_pg_temp_clone]]), and ⛔ mutation was run on the replaced leg; the four-red mutation above (dropping the FK turned the OTHER four tests red) predates PD11, and ⛔ mutation was run on the clone leg PD11 wrote. PD13's corrected-in-place list omitted this record.]* The first version of the TS schema spelled a finding-kind literal in a sixth file and the source fence (TR2) went red; the kind spelling now lives in `MEMBER_FINDING_KIND_BY_OUTCOME` in the findings schema, and the fence list is unchanged. ⚠ The story DB (:5451) has 0198 applied; `ci:local` on a FRESH container has not been run.
- **RA6 — applied.** Four own-committing races in the concurrency spec (the same finding twice, innocent against guilty, two flags with different step ids, the same flag twice), each read back from the tables and the event stream. Mutation: removing the claim-row lock turns the two flag races red (the finding races are held by the intake key).
- **RA7 — applied.** The appeal-after-finding test asserts `AppealNotDeniedError` with `currentState: 'closed'`.
- **RA8 — applied IN PART.** Applied: `isVisible` is required (and pinned by a `@ts-expect-error`); a domain test puts more invisible rows than one scan batch ahead of the visible ones (limit counts visible rows, oldest flag first, `null` district dropped); mutation: stopping the loop after the first batch turns it red. NOT applied: one shared district resolver — `getMemberPostingLatest` is documented as deliberately nondeterministic on a `created_at` tie (Story 1.19 D3, `2026-08-13-103`: *"closing it is its own story"*) and has more than ten API callers, so the work-list's tie-break divergence is documented as DELIBERATE in the reader's doc block instead, with a re-examination trigger.
- **RA9 — applied.** The defensive-guard test now runs the same raw payload with a HELD trigger (the control: labelled holder-refused) and a FRAUD trigger (not labelled), and asserts both the insert and the forced `closed` matched a row. Mutation: removing the OP10 guard turns only the fraud variant red — which also shows the ORIGINAL assertion had bitten; the change makes the test prove it without a mutation run.
- **RA10 — applied.** `recordFraudFinding` refuses an unknown `outcome` before any write; a test pins no finding row, no event, no step. Mutation: removing the guard turns it red.
- **RA11 — applied.** A steps primary-key 23505 becomes `step_conflict` in both writers; a test (each leg under a SAVEPOINT the caller rolls back to) pins the mapped reason for BOTH writers and, as its control, that a fresh step id then succeeds. Mutation: unmapping either writer's catch turns it red. (Patch-diff review PD8: the first version also asserted, after the rollback, that no step, finding row or annotation survived. Those assertions held with the fix deleted — the savepoint rollback removes the rows whether or not the error was mapped — so they are removed. That a failed call leaves nothing behind is the caller's rollback, not this writer's code, and is not separately tested.)
- **RA12 — applied.** The `duplicate` and `replayed` branches are pinned (including that the claim stays on the work-list — pinned, not endorsed; the low-level writer has one production caller); the TS tuple is tied to the SQL CHECK by inserting every value and one outside it.
- **RA13 — applied at the DOMAIN level.** AC2: the erasure resolver (`death_reported`), the nominee-declaration lock and the lock-then-read the withdrawal and Life Events handlers take, for a guilty member, with an innocent member as the control. The HTTP 409 mapping of withdrawal and Life Events is the pre-existing 6.38 path and is NOT re-asserted for a guilty member at the HTTP level (chunk B territory). AC11: `namedByClaimSql` still names a released member, and a source scan shows `known-people.ts` and `nominee/member-links.ts` were not re-pointed to `standingReportNamesSql`. Mutation: both pins turn red.
- **RA14 — applied** (a)-(f) and the AC6 (a) comment reworded. **RA15 — applied** to migration `0119` as a comment-only edit (the statements are unchanged); the second stale pointer (`nominee-lock.spec.ts`, chunk B) is still carried to chunk B.

**Verification** (story DB :5451, `DATABASE_URL` set explicitly; ⚠ the shell's default points at :5432): `packages/domain` `tsc` clean; ESLint exit 0 on every file touched; `db:check`, `schema:check`, `schema:test` green; the full domain suite — 490 files, 7605 passed, 1 skipped — on the final tree; the source fence 26/26; all 74 `apps/api` unit files (782 passed); the API integration folders `claims`, `known-people`, `life-events`, `member-data-rights`, `nominee` — 790 of 791, the one failure being `ground-inspection-discrepancy.spec.ts` (`lock timeout` on its own `ALTER TABLE claim_ground_inspections` while other files ran in parallel on one database; 20 of 20 in isolation). A second flake, `suspicion-notice-concurrency.spec.ts` (RB15), failed once in one of three full domain runs and passed 5 of 5 in isolation; no file it exercises was changed in this pass. Neither is a documented known failure.

**NOT done:** `ci:local` on a fresh container; an independent review of THIS patch diff ([[feedback_review_the_fix_diff_before_commit]]); the review of chunks B and C; any commit.

### Review Findings — chunk B: the API / contracts / gate-script layer (2026-11-02, `bmad-code-review 6.22`)

Scope of THIS pass: `91ea2c81` to the working tree (the branch tip `caa15727` plus the uncommitted chunk A patches) restricted to `apps/api` (src + tests), `apps/jobs/tests`, `packages/contracts` (src + tests) and `scripts/claim-adjudication-human-actor-invariant` — 25 files, 1,641 diff lines. Chunk A (`packages/domain`, `packages/events`) is reviewed and patched above; NOT yet reviewed: chunk C (the admin surfaces and tests, the roster Row 47 text). Three layers ran in parallel, read-only: Blind Hunter (the diff as a scratchpad file, told to read nothing else), Edge Case Hunter (the diff plus the worktree), Acceptance Auditor (the diff, this story, and the load-bearing-invariant checklist as a lens; told to skip chunk A's section except its "Carried to chunk B" paragraph). Every finding below was re-checked against the tree by the reviewer before it was written. NOT run: any test, `ci:local`, any database. The Auditor ran the human-actor gate once (static; it passes and lists all five routes).

Panel-routing gate applied to every finding: none changes what a person sees or is owed, so there is no `decision-needed` and no new Panel question.

**The seven items carried from chunk A, answered.** (1) Audit in the same transaction — the events and the step row are (the domain writes them in one transaction); the audit line is NOT: `emitAuditBestEffort` runs after the mutation's transaction commits (after rollback for a refusal) through the fire-and-forget sink. That is the house shape on the claim surface (`claims.death-certificate.handlers.ts` has the same wrapper; the access-wrapper gate scans for it), so it is not an AC violation; the missing join key between the audit row and `claim.closed` is RB8. (2) A blank note is rejected before encryption in both handlers (`body.note.trim() === ''`, audited `_rejected`, 400); only a zero-width or braille-blank note slips past (RB11). (3) All nine `FraudInvestigationRefusalReason` values map (404 / 400 / 409) and every handler refusal writes a `_rejected` audit; `ClaimStreamConcurrencyError` is 409 `fraud_investigation.concurrent`, which the contract's code list omits (RB6); the DTOs are field-picked (`actorId` is used for `viewer.is_flagger` and never sent) with `.strict()` responses. (4) `not_closed_reason` carries `committed | already_closed`; `already_closed` is not asserted over HTTP (RB3). (5) The gate covers all five routes (`COVERAGE_SET` entry, methods `post, get, post, get, get`, floor 19 equals the live length). (6) Confirmed: the helpline list returns the newest 20 and the route has no `limit` — deferred (RD2). (7) Confirmed: `nominee-lock.spec.ts:319` still says the producer is row 6-22 (RB12).

- [x] [Review][Patch] **RB1 — The route spec has no denial tests for the layers that guard these routes, and the one G7 test can pass for the wrong reason (MED)** — `fraud-investigation-routes.spec.ts` has one extra world, in the SAME Pariwar; `staff(w, roles, district)` is never given another district; there is no request without a session and no tampered-session non-human actor; no 403 on `GET …/fraud-investigation` (the console read) or `GET …/members/:memberId/fraud-investigation/claims`; no District Admin of another district on the finding POST or the console read. Every sibling staff-act spec has these (`death-certificate.spec.ts`: cross-Pariwar, "a TAMPERED session naming a non-human actor is EXACTLY 404", "WITHOUT the key"). The G7 test does `await stepUp(a, …).catch(() => undefined)` and asserts only `statusCode === 403`, so a failed step-up and a null-district permission denial are indistinguishable (the permission hook runs BEFORE step-up, so the step-up there is not even needed); the flag-denied loop and the operator-on-work-list check are status-only too. A regression that made the finding route's district constant, or fell back to the Pariwar, would let a District Admin of district B close a family's claim in district A with nothing failing. Fix: add the tests (401, tampered non-human 404 with its positive control, cross-Pariwar, cross-district on the finding POST and the console read, both GET 403s) and assert the denial's error code, not the status; drop the swallowed step-up. Checklist family 3 (REAL GAP). Sources: Acceptance Auditor F1, Edge Case Hunter 4, Blind Hunter 7 / 8.
- [x] [Review][Patch] **RB2 — The GUILTY arm has no HTTP coverage, and it is the PQ1 go-live arm (MED)** — `grep guilty apps/api/tests` finds nothing; `findOf` defaults to `outcome: 'innocent'`. `postFinding` passes `outcome: body.outcome` straight to the domain, echoes it in the response and the audit context; a handler that hard-coded or mis-mapped the outcome would release a member the District Admin found guilty and no API test would fail (the domain specs call the writer directly). RA13 handed the HTTP consumers of a guilty member to this layer. Fix: a guilty finding over HTTP — 201, the claim closed, the audit context says `guilty`, the member STILL meets `rtbf.death_reported` on the real erasure route, the account overlay stays frozen, the helpline list labels the closed claim `closed_member_alive`. Checklist families 3, 10 (the reduction is not a recorded deviation). Sources: Acceptance Auditor F2, Blind Hunter 8, Edge Case Hunter 6.
- [x] [Review][Patch] **RB3 — The finding and flag routes' remaining behaviours are unproven over HTTP (MED-LOW)** — not asserted anywhere: a finding replay (200, `replayed: true`, and NO second `fraud_finding_recorded` audit — the admin's step-up hold re-runs the write with the same ids, so the 200 mapping matters), `already_found`, `step_conflict`, `already_closed`, a flag on an unknown claim (404), the `admin_claim.fraud_flagged` audit (once, none on replay), `viewer.is_flagger: true` / `can_record_finding: false` after a finding, a TWO-step console read (a verifier sees both notes withheld, a District Admin both readable — one boolean, no per-item hiding), and the console's `anonymized` and `unreadable` note states (the RTBF sentinel is stored as an ENVELOPE, so the `anonymized` branch is reachable; nothing proves it). Deleting any of these branches would leave the suite green. Checklist families 2 (HTTP half), 6. Sources: Acceptance Auditor F4, Edge Case Hunter 5 / 6, Blind Hunter 8 / 16.
- [x] [Review][Patch] **RB4 — "A missing display name BLOCKS the action" is untested for both routes (LOW-MED)** — the sibling `death-certificate.spec.ts` has "an actor with NO display name is refused before the domain, and STILL audited"; this spec has none. The wire code is `admin.display_name_missing` (409, from `http-errors.ts`) while `auditReason()` returns `'missing_display'`, and its doc comment claims lockstep with `translate`; the domain's own `missing_display` is unreachable from the handler because `resolveDisplay` throws first. A regression to an email-derived fallback would pass every test. Fix: the test for the flag and the finding (409, rejected audit, nothing written) and a corrected comment. Checklist family 8 (REAL GAP, test side). Source: Acceptance Auditor F5.
- [x] [Review][Patch] **RB5 — The new convergence error arms are untested over HTTP (MED-LOW)** — `claims.convergence.handlers.ts` gains three arms: `IntakeMergeTargetNotCandidateError` to 409 `convergence.invalid_candidate` (the under-lock re-check — a race the handler's own earlier candidate check cannot produce), `translateClaimIntakeRefused(…, { withReason: true })` to 409 `claim.intake_refused`, and `IntakeOverrideAgainstClosedClaimError` to 409 `convergence.against_claim_closed`. Only the last is asserted (one HTTP test). Deleting either of the others turns a refusal into a 500 with nothing failing; DL9 says "else a door refusal is a 500". Fix: a unit test that stubs the domain calls (precedent: `vi.mock('@twt/domain')` in `apps/api/tests/unit`) and asserts each mapping. Sources: Acceptance Auditor F3, Edge Case Hunter 6, Blind Hunter 8.
- [x] [Review][Patch] **RB6 — `FRAUD_INVESTIGATION_ERROR_CODES` is dead and wrong, and the contract test never touches it (LOW-MED)** — the contract calls it "closed (the admin maps each to copy)"; its only reference in the repo is its own definition. It omits `fraud_investigation.concurrent` (which `translate` emits for a `ClaimStreamConcurrencyError`, a retriable 409) and nothing ties it to `translate` — a new domain reason silently becomes an unlisted code. (`missing_display` is on the list and IS emittable: `translate` maps any domain reason generically, even though the handler's own display check normally throws first.) The admin's copy map has no `concurrent`, so the "please try again" meaning is lost. The contract test also never exercises the `Readable` / `anonymized` / `unreadable` / `withheld` note variants and its step-up-context test is a bare `toBe('fraud_finding')`. Fix: add `concurrent`; export `translate`; a test that turns every `FraudInvestigationRefusalReason` (compile-time exhaustive) and the concurrency error into their wire codes and asserts the list is exactly that set; a contract test for the four note variants and their strictness. Carried to chunk C: the admin console's copy map must cover `concurrent`. Sources: Blind Hunter 9 / 17, Acceptance Auditor F6, Edge Case Hunter 2.
- [x] [Review][Patch] **RB7 — The console GET returns decrypted Tier-1 notes with no `Cache-Control: no-store` (LOW-MED)** — the sibling decrypting reads set it (`claims.correction-closure.handlers.ts`, `claims.certificate-reminder.handlers.ts`, `claims.correction-chase.handlers.ts`, `claims.contact-call.handlers.ts`, `claims.correction-escalation.handlers.ts`); `getInvestigation` takes no `reply`, so a browser or proxy may keep the plaintext of a staff note. Fix: `no-store` when the viewer holds the finding key (notes decrypted). Source: Edge Case Hunter 13.
- [x] [Review][Patch] **RB8 — WITHDRAWN on verification: the audit id joins nothing (LOW)** — chunk B's first write-up said `recordFraudFinding`'s `auditId` "lands on `claim.closed`" and that passing one would give the audit row a join key to the event (the Edge Case Hunter's reading, repeated here). Tracing it: `projectClaimState` only ECHOES `auditId` in its result (`ProjectClaimStateResult.auditId`); no event payload and no `events_log` column stores it, and the convergence handlers' `audit_id` is likewise only a field inside the audit context. So an id minted in `postFinding` would have no counterpart anywhere. It was applied and then REVERTED (no plumbing left). The audit row already names the claim (`resource_locator = claim:<id>`) and its time. Sources: Edge Case Hunter 3, Acceptance Auditor (carried 1) — both wrong on the mechanism.
- [x] [Review][Patch] **RB9 — The helpline's per-member list is unaudited, against its sibling's precedent (LOW-MED)** — the 6.21b `death-certificate/claims` list is audited (`admin_death_certificate.claims_read`); this one lists EVERY claim naming any member of the Pariwar, in every state including `denied` and `settled`, to any `claim.flag_fraud` holder, and writes no audit (recorded deviation 12: DL14 names five types and the precedent was "not copied"). DL5 says "in the house shape"; DL14 and DL5 pull in different directions. This is an engineering-parity call, not a disclosure question to the Panel (ids, states and dates only, no claimant PII). Fix: an `admin_claim.fraud_claims_read` audit line (member id and count), added to `AuthAuditEventType` and to `audit-log-sink.test.ts`'s dotted-action list; deviation 12 amended. Sources: Acceptance Auditor F8, Blind Hunter 5.
- [x] [Review][Patch] **RB10 — The jobs `*-no-decision` fences do not forbid the fraud writers (LOW)** — both tests gained the `claim_fraud_investigation_steps` table (DL1) but neither `FORBIDDEN` list names `recordFraudFinding`, `flagClaimForFraudInvestigation`, `recordMemberInnocenceFinding`, `recordMemberGuiltFinding` or `closeClaimOnFraudFinding`, and `claim_nominee_findings` — the table that carries the release — is not in `DECISION_TABLE_NAMES`. Task 0.1 (vii) left it to "Task 1.2 decides" and no outcome is recorded. The human-actor gate's new comment says "no job ever flags or finds" — true by grep today, enforced by nothing. Fix: add the names and the table to both tests. Sources: Acceptance Auditor F10, Edge Case Hunter 9.
- [x] [Review][Patch] **RB11 — A note of zero-width or braille-blank characters satisfies "every step carries a note" (LOW)** — `trim()` does not strip U+200B-U+200D, U+2060, U+2800 or U+3164, so `body.note.trim() === ''` passes them in both handlers, and the staff-accountability note is visually empty. (The same class chunk 12.2's RP1 closed for display names.) Fix: refuse a note with no letter or digit (`/[\p{L}\p{N}]/u`) with the same audited 400 `missing_note`. Sources: Blind Hunter 19, Edge Case Hunter 14.
- [x] [Review][Patch] **RB12 — Comment and record drift (LOW)** — (a) the contract's `NoteIn` / `alive_confirmation` comments and the contract test title say a missing note or proof "reaches the writer's own audited" refusal; the HANDLER raises both (before encryption and before the writer), so the writer never sees them from HTTP; (b) `auditReason`'s "lockstep with `translate`" comment (RB4); (c) `apps/api/tests/integration/nominee/nominee-lock.spec.ts:319` still says the finding's producer is row 6-22 (G17 / Task 7 swept the header at line 12 only); (d) AC8 says a replay returns "200 with the SAME event version", but neither response carries an `event_version` (6.21a's does) — true at the domain, absent on the wire; record it as a deviation, not a silent drift. Sources: Blind Hunter 14, Acceptance Auditor F5 / F9 / F11, Edge Case Hunter 15.
- [x] [Review][Defer] **RD2 — Both lists are silently bounded** — deferred: the helpline's per-member list returns the newest 20 (the route has no `limit`, so the cap of 50 is unreachable) and the work-list returns 50 (cap 200) oldest-first; neither response carries a `truncated` flag or a cursor. More than 20 claims naming one member needs repeated re-filing (PQ8 (c) is built "re-filing allowed"), and the work-list's head clears as it is worked, so nothing is lost — but an operator cannot see that the list is cut, and an old UNRELEASED claim beyond the newest 20 cannot be flagged from the UI. Trigger: the Panel's ruling on re-filing (PQ8), or a report of a member with more than 20 claims — then a `truncated` flag on both responses (which needs the admin UI's `.strict()` parse updated in the same change). Sources: Blind Hunter 15, Acceptance Auditor F7, Edge Case Hunter 7 / 8.
- [x] [Review][Defer] **RD3 — A persisted `_rejected` audit row cannot recover its reason** — deferred: `audit_log_entries` stores the action, a resource locator and a HASH of the context, and `statusForAuthEvent` maps only `.failure` to a non-200 status, so a persisted `admin_claim.fraud_*_rejected` row looks like a success and carries no reason code; the reason is visible only on the in-memory sink the tests read. Every existing `_rejected` audit type shares this. Trigger: a change to the audit store's shape. Source: Edge Case Hunter 10.
- [x] [Review][Defer] **RD4 — The human-actor gate's name heuristic credits `resolveQueueScopeStash` as a "scope" hook** — deferred: `categoryFromName` credits any hook identifier containing "scope", so a route that uses `resolveQueueScopeStash` would keep the `scope` category even if the real `scopeResolutionHook` were removed. Pre-existing and shared by five claims route files (`correction-closure`, `nominee-name-check`, `certificate-reminder`, `correction-escalation`, and this story's work-list); the route fails closed at run time because `resolveQueueScopeStash` throws 401 without a `scopeTx`. Trigger: the next change to the gate's `lib.ts`. Source: Edge Case Hunter 11.

Dismissed as noise (15 items, covering 24 raised findings), each checked against the tree or the record: (1) the audit is post-commit and best-effort, after a decrypting read and after the mutation — the house shape (`claims.death-certificate.handlers.ts` carries the identical wrapper; the access-wrapper gate scans for it); the missing join key is RB8; (2) the district is derived in a pre-handler transaction and the write runs in a second one — every staff-act handler does this (19 handler files use `openScopeTx`); (3) two scope transactions per request and the pool-starvation worry — the same pattern; (4) the console read returns `actor_display`, the step kind and the proof-of-life method to every `claim.verify` holder — DL7 specifies exactly that, and only notes are withheld; (5) the console for a non-holder and the work-list write no audit — DL14 audits a DECRYPTING read; (6) a flag is accepted on a claim whose member has no posting and nobody can then find it — the declared G7 / TR12 residual, which the spec asserts; (7) `alive_confirmation` is self-attested — Q9, declared and a go-live condition; (8) a client-minted `finding_id` that collides surfaces as a 500 — AC8 says "a planted PK collision ⇒ 500 (never 'duplicate')" (the `step_id` half was fixed under RA11); (9) the three label reads share one savepoint, so a failure of the new read also drops `closed_holder_refused` — DELIBERATE: splitting them would leave `closed_holder_refused` showing for a claim whose member was found alive, which is a wrong label ("the other claim was refused; the family may file again"), whereas both false shows a plain "closed"; (10) a finding on a committed claim returns 201 — declared (row `6-22c`; the response says `not_closed_reason: 'committed'`); (11) the RTBF `anonymized` state may never be produced — the sentinel is stored as an envelope, so the branch is reachable (its test is RB3); (12) the gate's coverage floor "lagged" — it now equals the live set (19); (13) a required `closed_member_alive` on strict responses breaks an older admin client, the note ciphertext's AAD does not bind a claim or step, `actor: 'operator'` is a constant, the spec's `afterAll` leaves seeded rows — one deploy ships both sides, the AAD is the sibling helpers' shape, the constant is the sibling handlers', and the spec uses fresh Pariwars; (14) the five routes are not in `openapi/v1.yaml` — that file holds 163 hand-registered paths and no `/admin/claims` route at all; the CI gate only checks that re-emission is byte-identical; (15) a deadlock or long lock wait is unmapped, and Zod validation failures carry no `fraud_investigation.*` code — the finding's lock order is proven deadlock-free (chunk A) and a Zod 400 is the standard shape.

Carried to chunk C: (1) the admin console's copy map must cover `fraud_investigation.concurrent` (RB6) and `admin.display_name_missing`; (2) the UI's handling of `not_closed_reason: 'already_closed'` and of the `anonymized` / `unreadable` / `withheld` note states; (3) `viewer.can_record_finding` is presentation only — the server still gates; (4) if RD2 is ever fixed, the `.strict()` client parse changes with it.

Triage: 0 `decision-needed`, 12 `patch`, 3 `defer`, 15 dismissed. RB1-RB12 were applied the same day (below; RB8 was WITHDRAWN on verification, so eleven landed); RD2-RD4 are deferred; the status stays `review` until chunk C is reviewed.

#### Patches applied (2026-11-02 — BigDev answered "1", "Apply every patch", to the chunk B patch menu)

All twelve are dealt with and UNCOMMITTED on `story/6-22-…`. "Mutation" means: the guarded code was broken on purpose, the spec was run and went RED, and the file was restored from a backup (restore confirmed identical to the pre-mutation state).

- **RB1 — applied.** `fraud-investigation-routes.spec.ts` gains an access group: no session ⇒ 401 on all five routes; a tampered session naming a non-human actor ⇒ EXACTLY 404 on all five (with an untampered positive control and nothing written — the control reaches the three READS; the two POSTs' reachability is shown by the other tests in the file, which flag and find with the same helpers); every role without the key ⇒ one 403 code (eight attempts: operator on the console and the finding, District Admin on the flag and the member list, verifier on the flag, the finding, the member list and the work-list); a District Admin and a verifier of ANOTHER district ⇒ 403 on the finding and the console read (own district reaches it); staff of Pariwar X ⇒ 403/404 on all five of Y's routes with no body naming the claim (X reachable). The G7 test no longer swallows its step-up and no longer asserts a bare status: the step-up is DONE, the 403 is not `auth.step_up_required`, and no step was written.
- **RB2 — applied.** A guilty finding over HTTP: 201, the claim closed, the audit says `guilty`/`ground_inspection`, the finding row is `member_found_guilty`, the member is STILL `rtbf.death_reported` on the real erasure route, the account overlay is frozen, and the helpline list labels the claim `closed_member_alive`. Mutation: hard-coding the handler's outcome to `innocent` turns it red.
- **RB3 — applied.** Finding replay (200, `replayed: true`, ONE audit, ONE `claim.closed`), `already_found`, `step_conflict` (the flag's step id) and the matching `_rejected` reasons; a flag on an unknown claim (404 + audit); the `fraud_flagged` audit once and none on a replay; `already_closed`; a TWO-step console read (withheld together for a verifier, readable together for a District Admin, `is_flagger`); and the `anonymized` and `unreadable` note states (the sentinel written as an ENVELOPE). Mutations: replay answering 201, every viewer a holder, and the `anonymized` branch removed each turn their test red.
- **RB4 — applied.** An actor with no display name: 409 `admin.display_name_missing`, a `_rejected` audit (`missing_display`), nothing written — for the flag and for the finding, each with a named-actor control (the finding's control was added by the patch-diff review, PD13; the first version had only the flag's). Mutation: a fallback name turns both red. The `auditReason` comment is corrected (the audit reason is `missing_display`; the wire code is the generic admin one).
- **RB5 — applied.** NEW `tests/unit/convergence-handlers-fraud-refusals.test.ts` (7 tests, `vi.mock('@twt/domain')`): `convergence.invalid_candidate` from the under-lock re-check, `claim.intake_refused` carrying its reason, `convergence.against_claim_closed`, each with a success control and a "another error is rethrown untouched" case. Mutation: removing any one of the three arms turns exactly its test red.
- **RB6 — applied.** `FRAUD_INVESTIGATION_ERROR_CODES` gains `concurrent` and its comment now says what it is; `translate` is exported as `translateFraudRefusal`; NEW `tests/unit/fraud-investigation-error-codes.test.ts` turns every domain reason (a compile-time EXHAUSTIVE map) and the concurrency error into wire codes and fails unless the list equals that set, with the status class of each; the contract test pins the four note states and their strictness. (`missing_display` stays: `translate` emits it for any domain throw even though the handler's own check usually pre-empts it.) Carried to chunk C: the admin console's copy map still has no `concurrent`.
- **RB7 — applied.** The console GET sets `Cache-Control: no-store` when the viewer holds the finding key (notes decrypted); asserted. Mutation: removing it turns the console test red.
- **RB8 — WITHDRAWN.** See the entry above: the premise was wrong; the change was reverted.
- **RB9 — applied.** `admin_claim.fraud_claims_read` (the member id and a count, resource locator `member:<id>`) on the helpline's per-member list; the audit-sink type and the dotted-action list gain it; DL14 and deviation (12) below are amended. Mutation: removing the emit turns its test red.
- **RB10 — applied.** Both suspicion jobs' `*-no-decision` fences (the notice and the staff-email — each reads only the files it lists; no fence reads `apps/jobs` as a whole, so ANOTHER job calling these writers would not be seen; patch-diff review PD13) name `flagClaimForFraudInvestigation`, `recordFraudFinding`, `recordMemberInnocenceFinding`, `recordMemberGuiltFinding`, `closeClaimOnFraudFinding`, and the `claim_nominee_findings` table; the positive controls plant each name and the two table forms and must catch them.
- **RB11 — applied, with a correction on the way.** A note with no visible character is `missing_note` (audited 400) on both routes (the audit lines were asserted only from the patch-diff review, PD13; mutation: dropping either emit turns the case red). My first rule ("a letter or digit") passed the Hangul filler U+3164, which is category `Lo`; the new unit test caught it. The handlers now reuse the repo's ONE blank rule (`isMemorialTextBlank`: strip the invisible and filler class, then require a letter, number, punctuation or symbol) instead of a third copy. Mutation: reverting to `trim()` turns all three HTTP cases red.
- **RB12 — applied.** The contract's `NoteIn` / `alive_confirmation` comments and the contract test title now say the HANDLER refuses a missing note or proof; the stale comment at `nominee-lock.spec.ts:319` is reworded; deviation (13) below records that AC8's "same event version" is proven at the domain and the wire carries `replayed`.

**Verification** (story DB :5451, `DATABASE_URL` set explicitly): `apps/api` and `packages/contracts` `tsc` clean; ESLint exit 0 on every file this pass touched (api, jobs, contracts); the route spec 28 tests (11 + 17); the contracts suite 95 files / 1,697 tests; all `apps/api` unit tests 76 files / 804 passed, 1 skipped; both jobs fences 15 tests; the OpenAPI determinism gate green. The API integration folders `claims`, `known-people`, `life-events`, `member-data-rights`, `nominee`: 807 of 808 passed — the one failure is again `ground-inspection-discrepancy.spec.ts` (its own `ALTER TABLE claim_ground_inspections` hitting `lock_timeout` while other files run in parallel). It has now failed in BOTH batch runs and passed 20 of 20 alone four times; no ground-inspection file was touched by this review, so it is a batch-load interaction, not a change of ours — but it is reproducible, not a one-off. `packages/domain` was NOT re-run this pass (no domain file changed since its green full run).

**NOT done:** `ci:local` on a fresh container; an independent review of THIS patch diff; the review of chunk C; any commit.

### Review Findings — chunk C: the admin UI and the roster text (2026-11-02, `bmad-code-review 6.22`)

Scope of THIS pass: `91ea2c81` to the working tree restricted to `apps/admin` (src + tests) and `docs/launch-gate-inventory/inventory-roster.md` (Row 47) — 22 files, 1,241 diff lines. Chunks A (domain / DB) and B (API / contracts / gate script) are reviewed and patched above; this is the LAST chunk. Three layers ran in parallel, read-only: Blind Hunter (the diff as a scratchpad file, told to read nothing else), Edge Case Hunter (the diff plus the worktree), Acceptance Auditor (the diff, this story, the load-bearing-invariant checklist as a lens, and chunk B's "Carried to chunk C" list). Every finding below was re-checked against the tree by the reviewer before it was written. NOT run: any admin test, a browser, `ci:local`. The Auditor ran the microcopy tone gate (`scripts/microcopy/check.ts`, a static read); it passes with no findings.

Panel-routing gate applied to every finding: none changes what a person is owed or told about a person beyond what is already ruled or already put to the Panel (PQ1, PQ7, PQ8), so there is no `decision-needed`. RC1 and RC11 correct staff-facing and record wording only.

**The four items carried from chunk B, answered.** (1) Error-copy coverage — NOT satisfied: the console's finding map covers `admin.display_name_missing` but not `fraud_investigation.concurrent`; the helpline flag's `flagRefusal` covers neither, nor `claim_not_found` (RC2). (2) `not_closed_reason`: `committed` and `already_closed` each have their own words (RC1 corrects what they say); `NoteText` renders all four note states distinctly, and only `withheld` and `readable` are UI-tested (RC8). (3) `viewer.can_record_finding` is presentation only — confirmed: the server re-gates on the key at the district, the step-up, and the domain checks (flagged, not already found, not the flagger). (4) The two lists are bounded (the helpline's newest 20, the work-list 50 / cap 200) and the UI neither says so nor implies completeness beyond "No claim names this member."; this is the deferred RD2, not re-raised.

- [x] [Review][Patch] **RC1 — The finder's own wording over-promises, and the result never says what was recorded (MED)** — the form intro reads *"A finding closes the claim, and only one is ever recorded."* The finding does NOT close an `approved` or `settled` claim (N5, DL3 step 6: it goes on to payment or was already paid); `FraudInvestigationResponse` carries `claim_state` and the panel ignores it, so the correction (`result.committed`) arrives only AFTER the step-up-gated, irreversible write, and even then says only *"so it was not closed"* — not that it can still be paid. The result words (`resultWords`) read only `closed` / `not_closed_reason`, so a GUILTY finding reads exactly like an innocent one (nothing says the member stays locked — Decision `-438` item 6, the declared narrowing), a null or unknown `not_closed_reason` is shown as *"This claim was already closed"*, and a replayed answer (`replayed: true`: the first submission stands, edits dropped) is shown as a fresh success. The submit button reads "Record the finding" whichever radio is set, with no confirmation step (the step-up is a re-authentication, not a content check). This is the staff-side twin of chunk A's RA1. Fix: gate the intro on `claim_state` and show a warning before submit when the claim is `approved` / `settled`; make the button restate the chosen outcome; make the result name the outcome and, for guilty, that the member stays locked; make the committed copy say the claim may still be paid; add a `replayed` notice; fall back to a neutral line for an unknown reason; reword the `audited` line (nothing is recorded for a viewer who is shown only the placeholder). Checklist families 10, 11. Sources: Acceptance Auditor C1 / C7, Edge Case Hunter (copy findings), Blind Hunter 1 / 2 / 12.
- [x] [Review][Patch] **RC2 — Error copy is incomplete: `concurrent` has none, and the helpline flag maps two codes of the many it can receive (LOW-MED)** — the finding map has no `fraud_investigation.concurrent`, so a retriable 409 reads "could not be recorded just now" (the form stays unlocked and a same-id resubmit would replay safely, but nothing says so); `flagRefusal` maps only `already_flagged` and `missing_note`, so `admin.display_name_missing` (a permanent condition RB4 proves the server emits) and `claim_not_found` read as a transient failure and the operator retries uselessly. Nothing ties either map to `FRAUD_INVESTIGATION_ERROR_CODES`, which `@twt/contracts` exports, so the gap is invisible; and `t.refusal[err.code]` looks a code up with `!== undefined`, which a code such as `constructor` would satisfy from `Object.prototype`. Fix: add the copy, look codes up with `Object.hasOwn`, and add a test that every code in the contract list has finding-form copy. Checklist family 8 (REAL GAP, UI side). Sources: Acceptance Auditor C4, Edge Case Hunter 1 / 2, Blind Hunter 7.
- [x] [Review][Patch] **RC3 — The finding hook refreshes only on success, and two audited reads refetch on reconnect (LOW-MED)** — `useRecordFraudFinding` has `onSuccess` only (the flag hook uses `onSettled`), so a refusal that proves the panel is stale (`already_found`, `not_flagged`, `finder_is_flagger`, `step_conflict`, `concurrent`) leaves the form offered, the other admin's finding unseen and the work-list still listing the claim; the flag hook does not refresh the work-list. `createQueryClient` leaves `refetchOnReconnect` at its default (true) and `staleTime: 0`, so a network blip refetches `useFraudInvestigation` — a DECRYPTING, audited read nobody asked for (`useClaimPeerAnswers` sets it false; the same holds for the audited member list, RB9). The registry `AUDITED_ON_DEMAND_READ_PREFIXES` that keeps a broad `invalidateQueries` from refetching such reads does not list the new keys (latent: the only banner mounted in the console passes `canClose={false}`). Fix: refresh on settle unless the error is the step-up hold; invalidate the work-list on a flag; `refetchOnReconnect: false` on both audited reads; register both key prefixes. Sources: Blind Hunter 3 / 5 / 15, Acceptance Auditor C7, Edge Case Hunter (hooks, registry).
- [x] [Review][Patch] **RC4 — A failed refetch after a successful finding wipes the result (LOW)** — the panel tests `read.isError || !data`; in TanStack Query v5 a failed background refetch sets `isError` while KEEPING `data`, and the post-finding invalidation refetches automatically, so one network blip replaces the whole body — the other-standing-claims list and any held step-up panel included — with "could not be loaded". Fix: show the load error only when there is no data. Sources: Blind Hunter 6, Acceptance Auditor C7, Edge Case Hunter.
- [x] [Review][Patch] **RC5 — Accessibility: focus is lost after submit, a second flag is not announced, and nothing says which field is missing (LOW-MED)** — (a) on success the form holding the focused button unmounts (and a pending `<fieldset disabled>` disables it), so keyboard and screen-reader users land on `<body>`; (b) the helpline status region renders the fixed string "The claim is flagged…", so flagging a second claim changes nothing and is not re-announced, and `flaggedClaim` is cleared only on a member change, so the text sits beside a later refusal; (c) the single "incomplete" alert has no `aria-invalid` on the missing field; (d) every row's "Flag this claim" / "Open the claim" button has the same accessible name. Checklist family 13 (d), applied to web. Fix: move focus to the status line after success; make the flag status claim-specific and clear it on open; `aria-invalid` on the note; row-specific button labels. Sources: Blind Hunter 8, Edge Case Hunter, Acceptance Auditor (family 13).
- [x] [Review][Patch] **RC6 — `crypto.randomUUID()` is called at render in a component the verifier console mounts for EVERY claim (LOW-MED)** — the repo documents it as secure-context-gated, from a real incident (`newIdempotencyKey` in `hooks.ts`: over plain `http://` on a LAN or staging host it is `undefined`). The panel mints its ids in a `useState` initializer, so on such an origin the exception is thrown during render and takes down the whole verifier console, not only this panel; the helpline form mints its step id in a click handler (the failure is then confined to that click). The ids must be UUID-shaped (the contract is `z.string().uuid()`), so `newIdempotencyKey`'s `dt-…` fallback cannot be reused. Fix: a guarded `newUuid()` (a v4 built from `getRandomValues` when `randomUUID` is missing), minted lazily at the first submit. Sources: Edge Case Hunter, Blind Hunter 16.
- [x] [Review][Patch] **RC7 — State and display hygiene (LOW)** — (a) the typed finding note stays in React state after a successful finding (the textarea unmounts, the text does not), and the helpline note survives Cancel; (b) `youFlagged` ("another District Admin must record the finding") still shows after a finding exists; (c) the other-standing-claims list and the work-list render a `closed` claim with the trigger-blind staff label *"Closed — another claim for this death goes ahead"* (G9), which is FALSE for a guilty-closed claim — the helpline list already special-cases `closed` to plain "Closed" for exactly this reason; (d) `NoteText` renders a multi-line note on one line (no whitespace preservation). Sources: Acceptance Auditor C3 / C7, Edge Case Hunter, Blind Hunter 15 / 16.
- [x] [Review][Patch] **RC8 — The work-list view has no component test, AC13 names it, and the header's reason is false (MED-LOW)** — AC13: *"the District Admin work-list (a flagged un-found claim in the viewer's district listed and linked, one in another district absent)"*. The test file's header says the view is not rendered because it "needs the router for `useNavigate`"; nine sibling tests stub the router with `vi.mock('@tanstack/react-router', …)` and `withheld-note.test.tsx` renders `NomineeRefusalsRoute` that way. Untested as a result: the list, the Open link's target, the 403 "only a District Admin" branch, the empty branch, the 401 redirect, and the nav entry. The reduction is not among the recorded deviations. Fix: the component test (with the router stubbed) and the correct header. Checklist family 10. Sources: Acceptance Auditor C2, Edge Case Hunter, Blind Hunter 13.
- [x] [Review][Patch] **RC9 — Several built UI behaviours would not fail any test if removed (LOW-MED)** — the required-fields test selects an outcome and leaves proof AND note empty, so deleting either the proof check or the note check still passes; the step-up test cancels the hold, so `onDone -> retry` (the re-send with the same ids) is never run — a no-op `retry` stays green; `committed` / `already_closed` / `noOtherClaims` copy, the `anonymized` and `unreadable` note text, and "closing FORGETS" (`removeQueries`) are untested; the flag's `step_id` stability across a retry is untested and every helpline fixture has `investigation: 'none'`, so "no Flag button on a flagged or found claim" is unproven; the helpline test titled for "a refusal is shown in words" never provokes one; and each of the four edited `closedClaimStateLabel` sites is exercised only with `closed_member_alive: false`, so a site passing the wrong field compiles and passes. Fix: add them. Sources: Acceptance Auditor C5, Blind Hunter 13, Edge Case Hunter.
- [x] [Review][Patch] **RC10 — The sign-in return path for the work-list is dead (LOW)** — `FraudInvestigationsRoute` redirects a signed-out admin to `/login?next=/p/<id>/fraud-investigations`, but `allowedNextPariwarId` accepts ONLY the nominee-refusals path and `LoginPage.completeLogin` navigates only there, so the `next` is dropped and sign-in lands on `/audit/integrity`; the module's header still says the refusal list is the only one. Safe (no open redirect) but the code implies a return it does not deliver. Fix: extend the strict allow-list to this one path with a destination-returning function, `LoginPage` following it, and the same bad-input test list. Sources: Acceptance Auditor C6, Edge Case Hunter, Blind Hunter 11.
- [x] [Review][Patch] **RC11 — Row 47 states four things less accurately than the record it cites (LOW-MED; closure honesty)** — (a) leg (b) restates `-438` Consequence 1 (*"Q7 ruled and built (the flag must not go live while a flagged claim can be paid)"*) with an added qualifier, *"approved and paid with nothing shown to the approver"*, which would let a warning-only build (Q7 option B) satisfy a leg the Panel-authored text does not — quote it verbatim; (b) leg (e) is ticked MET with no commit and no limits: the pass ran at `30226c15`, the Task 6 note says it drove only the innocent arm and saw only the no-other-claims state, sign-in was a cookie helper and step-up delivery the admin stub — and the server code changed afterwards (the chunk A and B patches), so a dated re-run is owed before the tick is read as covering what ships; (c) leg (g) *"addressed or re-recorded with a live owner"* is circular — 6.38's D1 (c) asked that the go-live list CARRY the item, `deferred-work.md` points here, and this leg has no independent test; say plainly that it is discharged by carriage; (d) the source line cites `-438` items 3, 4, 6, 7, 9 but legs (f) and (h) come from items 1 and 10. Also missing: the finding route sits behind the ADMIN step-up, whose delivery is the always-stub `adminStepUpDelivery` (deferral R4: admins have no mobile column), so in production a District Admin cannot complete the OTP — pre-existing and shared by every admin step-up, but the finding is unusable without it. Checklist family 10. Sources: Edge Case Hunter, Acceptance Auditor C8 / section 5, Blind Hunter 14.
- [x] [Review][Patch] **RC12 — The helpline form's DELIBERATE note gives no rationale or trigger (LOW)** — `HelplineFraudFlag` carries *"⚠ DELIBERATE — the read-back gate is CLIENT-SIDE ONLY (the D5 precedent …)"* and nothing else; the sibling `HelplineCertificateReplacement` states why and what would re-open it. The list is audited server-side (RB9) and the server gates the flag itself, so this is covered by construction; the note should say so and name a re-examination trigger. Checklist family 9. Source: Acceptance Auditor (family 9).

Dismissed as noise (11 items, covering 23 raised findings), each checked against the tree or the record: (1) the flag is invisible to the approver — the collapsed, audited disclosure is DL7, and what an open flag does to approval is PQ7, declared and a go-live leg (roster (b)); (2) decrypted notes stay cached after navigation — `createQueryClient` sets `gcTime: 0` and the panel calls `removeQueries` on close, and the post-finding refresh is the panel re-reading for the same person who just acted; (3) the finding form shows on an unflagged claim — the server's `can_record_finding` requires a flag, no found step and a non-flagger; (4) the nav link is shown to every role in a Pariwar — the Trustee and Correction-queue links beside it are equally ungated and the server key is the boundary (the Blind Hunter's "the neighbour is conditional" is wrong); (5) the finding has no confirmation dialog — `DeathCertificateReviewControl`, whose shape this copies, has none; RC1's outcome-restating button and result are the proportionate answer; (6) "Closed — the member was found alive" gives families no next step — Q8, unsent and declared; (7) the roster cites private memory notes and a "highest row is 45" — `[[…]]` links are the house style of every story and roster record, and the Edge Case Hunter found no Row 46 or 47 on any other ref; (8) the guilty radio has no UI switch — merge is not go-live and Row 47 (a) is the control; (9) `holdOnce({ id: Date.now() })`, an `identityConfirmed` flip keeping a draft, the client-side read-back gate — house shapes or declared; (10) work-list rows are indistinguishable and use `navigate()`, `Record<string,string>` casts, an unknown enum renders blank — the DTO carries no name or id by design, the enums are closed contracts, the shapes are the siblings'; (11) a client `trim()` is weaker than the server's rule — the server answers `missing_note` and both forms map it.

Triage: 0 `decision-needed`, 12 `patch`, 0 `defer`, 11 dismissed. RC1-RC12 were applied the same day (below). All three chunks are now reviewed; the status stays `review` until the patch-diff review, `ci:local` on a fresh container and the commits.

#### Patches applied (2026-11-02 — BigDev answered "1", "Apply every patch", to the chunk C patch menu)

All twelve are applied and UNCOMMITTED on `story/6-22-…`. "Mutation" means: the guarded code was broken on purpose, the admin specs run, and the result recorded; each file was restored from a backup and the suite re-run green. The findings below enumerate twenty UI mutations; one stayed green (see RC7). An earlier draft of this sentence said twenty-one with twenty RED, which the record does not support (patch-diff review PD13).

- **RC1 — applied.** The form intro now says a finding closes the claim *unless it is already approved or paid*; when `claim_state` is `approved` / `settled` a warning appears BEFORE the write (the finding stands, the claim may still be paid); the submit button restates the chosen outcome; the result names the outcome recorded ("Recorded: found guilty …"), says a guilty member's record stays locked (Decision `-438` item 6), says a committed claim "may still be paid", falls back to a neutral line for an unknown reason (⛔ "already closed"), and says when the server replayed ("the first submission stands and nothing new was written"); the `audited` line is true for every viewer. Mutations: dropping the warning, the guilty-locked sentence, the outcome-restating label or the replay notice each turn a test red.
- **RC2 — applied.** Copy for `concurrent` (finding form) and for `claim_not_found`, `concurrent` and `admin.display_name_missing` (helpline flag, the last said as permanent); codes are looked up as OWN properties; a test fails unless every code in `FRAUD_INVESTIGATION_ERROR_CODES` (bar `already_flagged`, the flag route's alone) has finding-form copy. Mutations: the prototype lookup, an unmapped display-name code and a missing `concurrent` entry each turn a test red.
- **RC3 — applied.** The finding hook refreshes on SETTLE, except for the step-up hold; the flag hook also refreshes the work-list; both audited reads (`useFraudInvestigation`, `useMemberFraudClaims`) set `refetchOnReconnect: false` (asserted by taking the browser offline and online); both key prefixes are registered in `AUDITED_ON_DEMAND_READ_PREFIXES` (their key factories moved above the set — a `const` used before its definition would throw at load), asserted. Mutations: breaking the settle hook's step-up skip, `refetchOnReconnect` or the registry turned tests red. ⚠ The finding's console-packet and work-list refreshes and the flag's work-list refresh had NO test until the patch-diff review (PD10), which asserts the exact set of keys each write refreshes (four mutations, all red, one of them a stray extra refresh).
- **RC4 — applied.** The load-error branch shows only when there is NO data; a failed refresh keeps the steps and the result and adds a "may be out of date" line. Mutation: the old condition turns the test red.
- **RC5 — applied.** Focus moves to the result line on success (both forms); the helpline status line names the claim, so a second flag changes the text and is announced again, and opening another form clears it; `aria-invalid` on the missing field; each row's Flag / Open button has its own accessible name. Mutations: no focus move and a constant status string each turn a test red.
- **RC6 — applied.** NEW `src/api/new-uuid.ts` — a v4 UUID from `crypto.randomUUID`, else `getRandomValues`, else `Math.random` — and the panel mints its ids on the FIRST SEND (⛔ at render); the helpline mints at form-open with the same helper. Tests render the console and send a finding with `crypto.randomUUID` removed, and check the format. Mutation: calling `crypto.randomUUID` directly turns it red.
- **RC7 — applied, with one honest limit.** The success handler clears the note; `youFlagged` is hidden once a finding exists; the other-claims list and the work-list render a `closed` claim as plain "Closed"; `NoteText` keeps line breaks. Mutations on `youFlagged`, the plain label and the line-break class turn tests red. **The Cancel-time note reset in `HelplineFraudFlag` and the note-clearing on success are hygiene the DOM cannot observe** (the form is unmounted; the open handler also resets): removing the Cancel reset alone leaves the suite green, by construction — and so does removing the open reset alone; removing BOTH turns the test red (checked in the patch-diff review, PD12 (a)). `NoteText` keeping line breaks is observable only as the `whitespace-pre-wrap` class plus the untouched text (jsdom does no layout). I first wrote a test that claimed to prove it, found it could not fail, and removed it; the remaining test is titled for what it proves (a re-opened form starts empty).
- **RC8 — applied.** NEW `tests/fraud-investigation-surfaces.test.tsx` renders the work-list view and route with the router stubbed (as nine siblings do): the list with state and both dates, plain "Closed", the Open button's own name and its target, the empty / 403 / generic-error branches, the 401 redirect carrying `next`, the signed-out route redirect, the nav entry (shown inside a Pariwar, ⛔ at the top level, with a positive control), the audited-read registry, and `newUuid`. The old header's false reason is replaced.
- **RC9 — applied.** Missing outcome / missing proof / a whitespace-only note each refused with the field marked invalid; the held write re-sent through the REAL step-up flow (request, code, verify) with the same ids and body; ⚠ *[corrected 2026-11-02, code review round 2 R2-15 (e): the real `StepUpPanel` renders and is driven, but the api client's `requestStepUp` / `verifyStepUp` are MOCKED in `fraud-investigation.test.tsx` — the real request / verify ran in the browser pass, its code delivered by the admin step-up stub]* six of the eight base result sentences (the patch-diff review, PD9, added the other two, a negative control for the replay line and the "no other claims" line — each branch now has a mutation); the four note states; close-FORGETS (a reopen shows "loading", ⛔ the old notes); a stale refusal refreshes and a hold does not; a failed refresh keeps the result; the flag's step id stable across a retry and new on a re-open; no Flag button on a `flagged` / `found` claim; and each of the four `closedClaimStateLabel` sites tested with `closed_member_alive: true` beside a control row (the contact picker filters out closed claims, so its case is wiring on a listed claim, said so in the test).
- **RC10 — applied.** `allowedNextReturn` (two allowlisted routes, each strict) alongside the unchanged nominee-only `allowedNextPariwarId`; `LoginPage` follows it; the same hostile-input list is run against the new path (absolute URL, `//host`, a query, a trailing slash, `..`, upper-case, a prefix-extended name, `javascript:`), and the round trip lands on the work-list. Mutation: dropping the fraud branch turns two tests red.
- **RC11 — applied to Row 47.** Leg (b) now quotes `-438` Consequence 1 verbatim and says it does not pre-judge Q7; leg (e) reads "MET 2026-11-01 — for the tree at commit `30226c15` ONLY", lists its limits (cookie sign-in, stub step-up delivery, innocent arm only, "no other claim" only, the found-alive label not reached) and says a dated re-run is owed; leg (g) is described as carriage with no test of its own; the source line cites items 1, 3, 4, 6, 7, 9, 10 and Consequence 1; the notes name the admin step-up delivery stub (deferral R4) as a dependency. Decision `-438` is untouched (its Consequence 3: "this entry is not edited").
- **RC12 — applied.** `HelplineFraudFlag`'s DELIBERATE note now says why the client-side read-back gate is safe (it protects the operator's script; the server authorizes the list and the flag and audits every list read) and names a re-examination trigger.

**Verification** (admin app; no database): `tsc` clean; ESLint exit 0 on every file touched; the microcopy tone gate green; the full admin suite 96 files / 1,808 tests passed; the seven spec files this pass touched 132 tests (the fraud UI file grew from 9 to 49, the new surfaces file has 11). `apps/api`, `packages/domain` and `packages/contracts` were NOT touched this pass, so were not re-run.

**NOT done:** a real-browser re-run of the UI (Row 47 leg (e) — owed, and now more so: the UI changed); `ci:local` on a fresh container; an independent review of the patch diff of chunks A, B and C together; any commit.

### Review Findings — patch-diff review: the three chunks' patches, together (2026-11-02, `bmad-code-review 6.22`)

Scope of THIS pass: everything the three chunk reviews changed, `caa15727` to the working tree, without the story file and `deferred-work.md` (those records are read by the Auditor only as claims to check) — 48 files; the production code, migration, copy and docs as a 1,370-line diff and the tests as a 2,605-line diff. Three layers ran in parallel, read-only: Blind Hunter (the production diff as a scratchpad file, told to read nothing else), Edge Case Hunter (the same diff plus the worktree, told to look for what the FIXES broke), Test-and-claims Auditor (the test diff plus every "Patches applied" claim above). Every finding below was re-checked against the tree by the reviewer before it was written. NOT run: any test, a browser, `ci:local` (the subagents were read-only; the reviewer's checks were reads and greps).

Panel-routing gate applied to every finding: none changes what a person is owed or told about a person. PD1 corrects an UNSENT routing note so that it says what `-438` items 1 and 3 already rule; PD2 REMOVES a gloss of a ratified Consequence (the Panel's wording is left as written); PD3–PD4 correct roster wording. So there is no `decision-needed`.

**Checked and found sound** (so the next reader need not re-check): `isStepIdCollision` handles both error shapes (drizzle 0.45 wraps pg errors, `.cause` carries `code` and `constraint`); the aborted transaction is rolled back by `closeScopeTx(…, false)` and the handler never queries it again; the unknown-`outcome` guard runs before any write; `isVisible` is required and its one production caller passes it; "SIX copies" of the release rule is true by grep (1 + 3 + 2); the migration's SQL and TS generated expressions are identical, the FK name matches 0197, MATCH SIMPLE is right for the `flagged` step (the 0197 coherence CHECK makes `finding_id` NULL exactly there), a NO ACTION foreign key on a stored generated column is allowed, journal idx 198 / `when` 1796701200043 sorts after 0197; the audit locator `member:<lower-case uuid>` matches the sink pattern; `getInvestigation(request, reply)` is wired by Fastify like seven siblings; `isMemorialTextBlank` rejects ZWSP, Hangul filler and combining-mark-only notes; `hooks.ts` has no TDZ; the login `next` regexes are anchored and `$` has no `m` flag. The Auditor re-counted and confirmed: 6 release-rule tests, 3 live-process, 4 races, 28 route tests, 7 convergence, 15 jobs-fence tests, +5 regression, fraud UI 9→49, surfaces 11, 132 across seven admin files, 163 OpenAPI paths.

- [x] [Review][Patch] **PD1 — The unsent routing note still promises "closed" without the exception, and says "approved" where its own correction says "approved or settled" (MED-LOW)** — `trustee-panel-routing-note-2026-11-01-6-22-fraud-register-first-half.md`: line 182 (Q8: "When the investigation confirms the member is alive, the claim is closed.") and line 276 ("An innocent member is released at once and the false claim is closed.") carry NO exception, though `-438` items 1 and 3 and the note's own Q7 say an `approved` or `settled` claim is not closed by either outcome; lines 56, 64 and 277 say "approved" while the "Corrected in this note" bullet (line 264) and the RA1 record above say "approved or settled". (A settled claim was approved first, so "approved" is not false — but one note must not name the exception two ways, and the Panel reads two sentences that state the retracted promise.) Fix: lines 182 and 276 gain "unless it had already been approved or paid (Q7)"; lines 56, 64, 264 and 277 all say "approved or paid" (the Panel's plain words — Q7 already says "approved and paid"); the RA1 record is brought to the same words. The note stays UNSENT. Sources: Blind Hunter 10, Edge Case Hunter 3, Auditor F6.
- [x] [Review][Patch] **PD2 — Roster Row 47 (b): my gloss re-reads the quotation it sits beside (MED)** — the leg quotes `-438` Consequence 1 verbatim ("the flag must not go live while a flagged claim can be paid") and then adds that "the leg does not say WHAT Q7's ruling must be — a wait, a warning or neither". "Neither" leaves a flagged claim payable while the flag is live — the opposite of the quotation. Only the Panel can relax a ratified Consequence, and by a superseding Decision, ⛔ a re-reading ([[feedback_supersede_never_reinterpret]]). Fix: delete the gloss; say instead that a ruling under which a flagged claim stays payable (a warning, or nothing) is a SUPERSEDING Decision of `-438` Consequence 1, recorded as one. Source: Blind Hunter 8 (checked against `-438`).
- [x] [Review][Patch] **PD3 — Roster Row 47 (g) can only close with the row it gates (LOW-MED)** — "(g) … CARRIED … discharged when 6.38's records point here (done — `deferred-work.md`) and this row reaches closure": a leg of "ALL EIGHT" cannot wait for the row to close, so as written it never gates; `deferred-work.md` labels the same item "Not addressed by 6.22 — a go-live leg" while the roster says CARRIED (two labels for one thing). Fix: (g) reads "CARRIED and MET — 6.38's records point here (done: the round-2 D1 entry in `deferred-work.md`, clause (c)); no independent test; ⛔ waits for nothing else", and names the other file's label so a grep for either finds both. Sources: Edge Case Hunter 2, Blind Hunter 9.
- [x] [Review][Patch] **PD4 — Roster Row 47 notes: "In production the OTP is logged" is false (LOW-MED)** — `createLogStepUpDelivery` adds the code to its log line only when `revealForDev`, and `deps.ts:500` passes `!isProd`; in production the code is neither delivered nor logged, so no one can complete the step-up. The row's consequence (the finding is unusable until deferral R4 is discharged) is right; the mechanism was not. Fix: reword. Source: Edge Case Hunter 1 (checked: `step-up-delivery.ts:119-134`, `deps.ts:500`).
- [x] [Review][Patch] **PD5 — Five comments the patches left stale (LOW)** — (a) `packages/contracts/src/claims/fraud-investigation.ts:194` still says "Pinned to the handlers' `translate`" (renamed `translateFraudRefusal`, RB1); (b) `packages/domain/src/claim/errors.ts` `step_conflict` doc still says the step id was used for a different step "on this claim" (RA11 added "on another claim or Pariwar"); (c) `apps/admin/src/routes/login-next.ts:22` still names `allowedNextPariwarId` as the allow-list `LoginPage` applies — it is `allowedNextReturn`, and the old function now has NO production caller, only tests: give it one (the refusals branch of `allowedNextReturn` calls it) rather than leave dead code with a pinned test; (d) `apps/admin/src/api/hooks.ts` ~853: the two new key exports sit between the registry's JSDoc and the Set, so TypeScript attaches the JSDoc to `memberFraudClaimsKey`, and the JSDoc lists only two audited reads — move the exports and their `//` note above the JSDoc and list all four; (e) `events.ts:696` "(it is 39 now …)" is a count that will rot — drop the number. Sources: Blind Hunter 12, Edge Case Hunter 6 and 7.
- [x] [Review][Patch] **PD6 — The helpline flag has no words for `step_conflict`, the code RA11 added (LOW)** — `flagRefusal` falls to the generic "just now" line, which invites a retry that resends the same step id from the still-open form. Reachable only when a step id repeats (a duplicate UUID, practically the `Math.random` fallback of RC6), but it is the very case the typed code exists for. Fix: a `helpline.fraud.refusal.step_conflict` line ("This form was already used for another step. Cancel it and open it again."); Cancel plus re-open already mints a new id; a test. Sources: Blind Hunter 3, Edge Case Hunter 5.
- [x] [Review][Patch] **PD7 — Keyboard focus is lost when the helpline form opens and when it is cancelled (LOW)** — opening hides the clicked Flag button and Cancel unmounts the form, so focus drops to `body`; only the success path (RC5) moves focus. Family 13 is applied to web. Fix: focus the note field on open (a ref effect); on Cancel focus the section's status line, as success does; a test for each. Source: Edge Case Hunter 8.
- [x] [Review][Patch] **PD8 — RA11's "nothing partial survives" assertions cannot fail (MED-LOW)** — the test asserts the step list, the event count and the finding count AFTER `ROLLBACK TO SAVEPOINT`, which removes those rows whether or not the writer mapped the error; so they hold with the fix deleted, and the record above ("a test … shows nothing partial survives — including the finding row and annotation") overstates. What IS pinned: the mapped reason for both writers and the fresh-id control. Fix: remove the three post-rollback assertions (or relabel them as the caller's rollback, which is all they show); retitle the test; correct the RA11 record. Source: Auditor F1.
- [x] [Review][Patch] **PD9 — "Every result-copy variant" (RC9) is six of eight, and the replay notice has no negative control (MED-LOW)** — `alreadyClosedGuilty` and `notClosedGuilty` are asserted nowhere; `noOtherClaims` is not asserted. Fix: a table-driven test over the exported `resultWords` (each outcome × closed / already-closed / committed / not-closed, the neighbouring strings asserted ABSENT), the replay line absent when `replayed` is false, and `noOtherClaims` rendered when there is none; correct the RC9 record. Source: Auditor F2.
- [x] [Review][Patch] **PD10 — Several RC3 invalidations have no test (LOW-MED)** — the finding refreshes `verifierConsoleKey` and `openFraudInvestigationsKey`, the flag refreshes `openFraudInvestigationsKey`; only the panel's own re-read is counted. The RC3 record ("each of the four breaks turns a test red") is false for those. Fix: tests that seed the cache and assert `getQueryState(key)?.isInvalidated` after each write succeeds, with an unrelated key as the control; correct the record. Source: Auditor F5.
- [x] [Review][Patch] **PD11 — The 0198 "FK out of the way" test runs `ALTER TABLE … DROP CONSTRAINT` on the shared steps table (MED-LOW)** — an ACCESS EXCLUSIVE lock on `claim_fraud_investigation_steps` (and a SHARE ROW EXCLUSIVE one on `claim_nominee_findings`) held until the harness rolls back, in a database other specs share. The house precedent for test-only DDL is a `pg_temp` clone (`_inspection-discrepancy-fixtures.ts`). Lock-wait flakes already exist in the batch (known failure #19, a `lock_timeout` in another spec's own `ALTER TABLE`); whether THIS test contributes is not established, and the record is silent on it. Fix: run the leg on a `pg_temp` clone (`CREATE TEMP TABLE … (LIKE … INCLUDING INDEXES)`), so no shared table is altered; state in the record that the contribution to #19 is unmeasured. Source: Auditor F3.
- [x] [Review][Patch] **PD12 — Smaller test-strength gaps (LOW)** — (a) "a re-opened form starts empty" stays green if EITHER of its two resets is removed, and RC7's "honest limit" understates this (F4); (b) the `aria-invalid` assertions are one aggregate check and the helpline textarea's is untested (F8); (c) the tuple-versus-CHECK test checks one direction — a value OUTSIDE `FRAUD_ALIVE_CONFIRMATIONS` is not shown refused (23514) (F9); (d) the first `newUuid` test passes on the `Math.random` path (spy on `crypto.randomUUID`), the intro test asserts the i18n constant rather than the rendered text, "keeps line breaks" is proven by a class name only, the audit-sink test is a regex (F11). Fix: the missing assertions; retitle where a test proves less than it says. Source: Auditor F4, F8, F9, F11.
- [x] [Review][Patch] **PD13 — Record and header wording that is false or overstated (LOW)** — the RB4 record ("each with a named-actor control" — the finding test has none), RB11 ("400, audited" — no audit assertion), RB1 (the tampered-session control covers the GETs only); the header of `fraud-investigation.test.tsx` lines 9-11 says the sign-in return path and the four label call sites are in `fraud-investigation-surfaces.test.tsx` (they are in `login-return-path.test.tsx` and the four call-site tests; the surfaces file holds the work-list view, the nav, `newUuid` and the registry); the jobs-fence claim is wider than the two suspicion fences it edits; "five readers" is six; "twenty-one UI mutations" enumerates twenty. Fix: correct each in place, with the true statement. Sources: Auditor F7, F10, F12, F13.
- [x] [Review][Defer] **RD5 — Widening `step` in row `6-22d` must widen the generated `finding_kind` in step** — the `CASE` has no `ELSE`: a new FOUND step value added to the TEXT CHECK without a matching branch gets a NULL kind, and a MATCH SIMPLE foreign key then enforces nothing for that row, silently. Not a defect today (three step values, all mapped). Trigger: row `6-22d` widens `FRAUD_INVESTIGATION_STEPS` — extend the `CASE` (SQL and TS together), add a CHECK that `finding_id` and `finding_kind` are NULL together, and a test over the tuple. Source: Blind Hunter 7. Appended to `deferred-work.md`.
- [x] [Review][Defer] **RD6 — The focus-on-status pattern (RC5) is un-attested with a screen reader** — focus moves onto an element that is also a `role="status"` live region receiving new text in the same commit; some readers may speak the result twice. No assistive technology was run in this session, so this is carried as a RISK, not asserted either way ([[feedback_record_unattested_no_backfill]]). Trigger: the real-browser re-run Row 47 (e) already owes — add one pass with a screen reader on the console panel and the helpline flag. Sources: Blind Hunter 13, Edge Case Hunter 9. Appended to `deferred-work.md`.

Dismissed as noise (15 items, merging the overlapping reports of the three layers), each checked against the tree or the record: (1) the committed-claim warning reads data that is not refreshed — the console read refetches on mount (`refetchOnMount: 'always'`, `gcTime: 0`), the warning is advisory before submit, the server's `not_closed_reason: 'committed'` is authoritative after, "approved or paid" is `approved` / `settled` (settled IS paid), and `CLAIM_NOT_CLOSABLE_STATES` is exactly approved / settled / closed; (2) the comment-only edit to applied migration 0119 contradicts 0198's header — the header's sentence is about 0197, `migrate.ts` has no content hash, and the edit says it is comment-only and dated; (3) the hook's step-up skip is a different predicate from the panel's `needsStepUp` — both test `auth.step_up_required`; (4) a decrypted note lingers in the retry closure — the retried body is what the SAME staff member typed, and the query cache is `gcTime: 0`; (5) "each look is recorded" versus a best-effort audit — the house copy (siblings: "Opening the details is recorded in the audit trail"), already dismissed in chunk B (1); (6) `DROP CONSTRAINT` without `IF EXISTS`, a table rewrite, the new column's grants — the name exists in 0197, the tables are empty in production, no row trigger fires, table-level GRANTs and RLS do not name columns, and the anonymize UPDATE sets only `note_ciphertext`; (7) schema module-load order and the fence's literal counts — no TDZ, and the fence strips comments before counting; (8) the `aria-label` override of the visible text — the accessible name STARTS with the visible text ("Flag: …"), so label-in-name holds; (9) `idsRef` is not reset when the claim changes — the panel is keyed by claim (`VerifierConsoleRoute.tsx:609`); (10) `getInvestigation(request, reply)` may not be wired — Fastify passes `reply`; seven sibling handlers do the same; (11) the client's blank-note check is narrower than the server's — the server's 400 `missing_note` is mapped to the same words, and the audited rejection is the design (RB3); (12) the `roles.ts` reorder against snapshots — comments and key order only, nothing reads the order; (13) the replay wording and exporting `resultWords` from a component module — ESLint is clean and the wording is accurate; (14) the `Math.random` fallback — deliberate for plain-http origins (RC6), and a repeated id is exactly what `step_conflict` now answers (PD6); (15) a client-minted `finding_id` that collides with `claim_nominee_findings`' primary key is still a raw 500 — AC8 says "a planted PK collision ⇒ 500", chunk A dismissed it (item 8), and the shipped UI mints the pair together so it cannot reach it.

Triage: 0 `decision-needed`, 13 `patch`, 2 `defer`, 15 dismissed. PD1-PD13 were applied the same day (below); RD5 and RD6 are in `deferred-work.md`. The status stays `review`.

#### Patches applied (2026-11-02 — BigDev answered "1", "Apply every patch", to the patch-diff review's menu)

All thirteen are applied and UNCOMMITTED on `story/6-22-…` (the branch was checked before the first edit and again before this record). "Mutation" means: the guarded code was broken on purpose, the specs run, the result recorded; every file was restored from a backup and byte-compared with its original (a driver script did this, so a mutation cannot be left behind).

- **PD1 — applied.** The routing note (STILL UNSENT): Q1's lead-in, option B's row, Q8's opening, the "Corrected in this note" line and the closing summary all say *approved or paid*; the two innocent-member sentences (Q8, the summary) that had no exception now carry it, and the correction line says a third pass made them agree. The story keeps its state words (*approved or settled*); the RA1 record says so.
- **PD2 — applied.** Roster Row 47 (b): the gloss is deleted. The leg quotes `-438` Consequence 1 verbatim and now adds only that a ruling under which a flagged claim stays payable (a warning, or nothing) is a SUPERSEDING Decision of it, recorded as one — ⛔ a re-reading. The decision log is untouched.
- **PD3 — applied.** Row 47 (g) reads CARRIED and MET and waits for nothing else; it names both labels (*CARRIED* here, *"Not addressed by 6.22 — a go-live leg"* in `deferred-work.md`) so a search for either finds the other.
- **PD4 — applied.** Row 47's notes say the production step-up code is neither delivered nor logged, citing `createLogStepUpDelivery` (`revealForDev`) and `deps.ts` (`!isProd`).
- **PD5 — applied (five comments).** The contracts comment names `translateFraudRefusal`; the `step_conflict` doc covers another claim or Pariwar; `login-next.ts` names `allowedNextReturn` and its refusals branch now CALLS `allowedNextPariwarId` (so the old function has a production caller; the thirteen login tests are unchanged and green); in `hooks.ts` the two key exports and their note sit ABOVE the registry's JSDoc, which now lists all four audited reads; `events.ts` no longer prints a count that will rot.
- **PD6 — applied.** The helpline flag answers `step_conflict` in its own words ("This form was already used for another step. Cancel it and open the form again."); a new row in the refusal table test. Mutation: removing the mapping turns it red.
- **PD7 — applied.** Opening the form focuses the note; Cancel focuses the section heading (`tabIndex={-1}`). One test with a control (focus starts on the Flag button). Two mutations, both red.
- **PD8 — applied.** The three post-rollback assertions are removed from the RA11 test, which is retitled and carries a comment saying what it pins and what it does not. Mutation: unmapping either writer's catch turns it red (two runs).
- **PD9 — applied.** The result table has nine rows (the two GUILTY gaps added), asserts every OTHER base sentence absent (and that the eight are distinct and none contains another), the replay line iff `replayed`, the "stays locked" line iff guilty; the "no other claims" line is asserted in both directions. Five mutations, all red.
- **PD10 — applied.** Three tests record `invalidateQueries` under a real client and assert the EXACT key set each write refreshes (a finding; a stale refusal, with the step-up hold refreshing none; a flag), with a "nothing before the write" control. Four mutations, all red — one of them an extra, stray refresh.
- **PD11 — applied.** The 0198 index leg runs on a `pg_temp` clone (`LIKE … INCLUDING ALL`): no `ALTER TABLE` on a shared table; a control (another claim's found step is accepted); the refused insert differs from the first only in `step`, so only the partial one-finding-per-claim index can raise the 23505. ⚠ NOT measured: whether the old DDL version contributed to known failure #19 (it was not re-run); no mutation was run on this test.
- **PD12 — applied, with one item left as it was.** (a) The re-opened-form test's comment now says it pins the PAIR of resets — mutations: the open reset alone removed GREEN, the Cancel reset alone GREEN, both RED. (b) The `aria-invalid` cases assert the EXACT set of controls marked (two mutations red), with a "nothing marked before the first try" control; the helpline textarea has its own test. (c) The RA12 test gains a catalog leg: the CHECK's literals equal `FRAUD_ALIVE_CONFIRMATIONS` (mutation: dropping a value from the tuple turns it red). (d) The first `newUuid` test now stubs `crypto` so only `randomUUID` can produce its answer (mutation red); the fallback test counts `getRandomValues` calls; the intro test also checks the rendered form (mutation red); the line-break test says what it observes. **Not changed:** the audit-sink test still proves only that each type maps to a dotted action — the union's membership is compile-time.
- **PD13 — applied.** The overstated records above are corrected in place (RA1, RA4, RA11, RB1, RB4, RB10, RB11, RC3, RC7, RC9, the mutation count); the `fraud-investigation.test.tsx` header says where each group of tests really is; the two jobs fences say what they scan; the finding's display-name test gained its named-actor control and the blank-note test its two audit assertions (two mutations red).

**Verification:** admin — `tsc` and ESLint clean, the full suite 96 files / 1,819 tests passed (the fraud UI file 49 → 59, the surfaces file 11 → 12); domain — `tsc`, ESLint and the full suite 490 files / 7,605 passed / 1 skipped (unchanged counts, the three specs edited here ran green against the story DB `:5451`); API — the whole unit suite 76 files / 804 passed, the routes spec 28 passed, ESLint clean; contracts `tsc` and ESLint clean; jobs fences 15 passed, ESLint clean; the microcopy gate green (the one new copy key). Mutations this pass: 19 admin runs (17 red, 2 green — the two predicted by PD12 (a)), 3 domain (all red), 2 API (both red).

**NOT done:** the OpenAPI determinism gate and the other API integration folders (nothing there changed but one comment); a real-browser re-run of the UI (Row 47 leg (e) — overdue, and now more so); a screen-reader pass (RD6); `ci:local` on a FRESH container; any commit.

#### Verification after the commits (2026-11-02 — BigDev: "run ci:local and in browser")

Both were run on the tree of `9693d402` (four review commits on top of `caa15727`; `git status` clean before and after).

- **`ci:local` — 37 / 37 GREEN on the FIRST run.** A FRESH container (`twt-622-ci-pg`, `postgres:16-alpine`, DB `twt_dev`, :5452; the integration job applied the migrations through idx 198), `DATABASE_URL` typed explicitly — ⛔ the shell's :5432. No red and none of the known failures (#13-#20) appeared; the unit task alone took 10 min 24 s; the container was removed afterwards. (The earlier 34 / 37 first run at `caa15727` is in the Completion Notes.)
- **The real-browser pass RAN** (a throwaway launcher spec on its own seeded Pariwar and district — one member with an in-review and an approved claim, a second member with an in-review claim — Chrome through a cookie helper; the launcher spec was deleted and the tree is clean). Covered: the helpline flag, the work-list rendered by the router, the finding through the step-up hold (innocent unapproved; innocent APPROVED; GUILTY — the first time), a verifier's withheld view, the "Closed — the member was found alive" picker label, a signed-out visit sent to sign-in with `next`. The DB was read after each write: one flag step attributed to the operator with the note stored as `enc:v1:`; one found step with the generated `finding_kind` (0198 working in the real flow); exactly one finding and one `claim.closed` (`fraud_finding_innocent`) for the unapproved claim; for the APPROVED claim a finding, the release annotation and ⛔ `claim.closed` (the claim stays `approved`); for the GUILTY one a `closed` claim (`fraud_finding_guilty`), `claim.member_found_guilty` on its stream, ⛔ a release event. The new behaviours were seen as designed: focus into the note on open and onto the section heading on Cancel (PD7), the empty-note refusal in words with the note marked invalid, the status line naming its claim, the exact `aria-invalid` set, the submit button restating the outcome, the committed-claim warning, the three result sentences, the work-list empty once every claim has a finding. Roster Row 47 (e) now carries a dated RE-RUN line with these limits.
- **Limits, stated:** sign-in was the cookie helper (no passkey), so following `next` AFTER sign-in is component-tested only; step-up delivery was the admin stub; a plain-http origin (the `randomUUID` fallback) was ⛔ reached — Vite served `localhost`, a secure context; no screen reader (RD6); the audit lines were not read (the launcher's sink is the capturing test one); console errors were read for ONE page. Five small rough edges are recorded as RD7 (none fixed).
- **NOT done:** a push; the ledger and `sprint-status.yaml` (status stays `review`); RD6; the two un-reached browser limits above.

### Review Findings — round 2: the FULL story diff (2026-11-02, `bmad-code-review 6.22`)

Scope of THIS pass: `91ea2c81..ca3f6776` (the story branch against `origin/main`, fetched — unmoved), the WHOLE code diff at once (BigDev:
*"full diff"*) — 106 code files, the production code as a 4,947-line diff and the tests as a 5,102-line diff; the records (this file,
`deferred-work.md`, the ledger, `epics.md`, the routing note, `-438`) read only as claims to check. Four layers ran in parallel, read-only:
Blind Hunter (the production diff only), Edge Case Hunter (the diff + the worktree, told to look for what round 1's fixes broke), Acceptance
Auditor (spec + `-438` + Row 47 + checklist families 1–13), Test-and-claims Auditor (the test diff + every round-1 "applied" claim). 36 raw
findings → 1 decision-needed, 15 patch (19 raw, four merged), 1 defer, 15 dismissed. Every finding re-checked against the tree by the reviewer.

Panel-routing gate applied to every finding: none is about what the Trust discloses about a person, owes a person, or a legal basis. R2-Q1
is a correction to an AUTHOR-COMMIT's words — BigDev's, ⛔ the Panel's (the routing note already puts the substance, Q1 / Q7). R2-5's bare
sentence ("a report parked beside a claim later closed for any reason can no longer be made its own claim by staff; the family may report
again") changes nothing a person is owed, and `-438` item 8 already says *"the override refuses a `closed` against-claim"* without a kind.

**Checklist (AI-6-5) verdicts, round 2:** families 1–9 and 12 covered (by test or by construction — the Acceptance Auditor named each test);
**10 REAL GAP** (R2-Q1, R2-5), **11 REAL GAP** (R2-Q1: `-438` item 2's sentence is false for a committed claim), **13 REAL GAP** (R2-10). RD6
(screen reader) stays un-attested, carried as a risk, ⛔ backfilled.

**Checked and found sound** (so the next reader need not re-check): every round-1 "applied" patch is in the code (the Auditor walked RA8,
RA10, RA11, RA14 (a)–(f), RA15, RB4, RB6, RB7, RB9, RB11, RC1–RC7, RC10, RC12, PD5 (a)–(e), PD6, PD7); the flag gates nothing (no reader of the
steps table or `claim.fraud_flagged` outside the investigation's reads and the overlay); every producer of `closed_holder_refused` also
produces `closed_member_alive`; the test counts in the record match the files; the journal idx 196–198 and their `when`s; the concurrency
races are real two-connection waits; the RLS legs run as `twt_app`.

- [x] [Review][Decision] **R2-Q1 — RESOLVED 2026-11-02 — BigDev: *"1"* ⇒ Decision `2026-11-02-439` (author-commit, committed ALONE `6bf11501`) supersedes `-438` Policy meaning item 2 and its title IN PART: a guilty finding closes the claim only if it is not already approved or settled; ⛔ code change.** The finding as put: **`-438` item 2 still says a guilty claim "is closed so nothing is ever paid on it"; nothing records BigDev's answer on how to correct it (MED)** — RA1 fixed the story and the unsent routing note and left `-438` untouched as *"BigDev's call on form"*; no answer, correcting entry, `deferred-work.md` line or Row 47 leg exists, and the branch is otherwise ready to merge. The code closes a CLOSABLE claim only: a guilty finding on an `approved` / `settled` claim returns `{ closed: false, reason: 'committed' }` (`closeClaimOnFraudFinding`), and that claim can still be paid. `-438` item 1 carries the caveat ("a claim already `approved` / `settled` is ⛔ closed (row `6-22c`)"); item 2 and the title ("GUILTY CLOSES IT") do not. Options: **(a)** a new author-commit entry, committed ALONE before merge, that supersedes `-438` item 2's sentence in part — "closed, unless it was already approved or settled, which this story does not stop (row `6-22c`)" ([[feedback_supersede_never_reinterpret]], [[feedback_governance_commits_precede_implementation]]); cost: one more decision id and a ledger line. **(b)** a dated `deferred-work.md` line + Row 47 leg naming the correction as owed at `6-22c` or at the Q1 ruling; cost: an author-commit that states a false thing merges to `main`. **(c)** edit `-438` in place (it is unmerged); cost: rewrites a committed governance entry, which the house rule forbids. Reviewer's reading: **(a)**. Sources: Acceptance Auditor AA1; RA1.
- [x] [Review][Patch] **R2-1 — Nothing proves a finding refused AFTER its writes leaves nothing behind (MED-LOW)** [`apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts`] — reachable: `recordFraudFinding` writes the member finding and the release (step 4) BEFORE the step insert (step 5), whose step-id collision with ANOTHER claim's step is `step_conflict` (RA11); the rollback is the handler's `closeScopeTx(scopeTx, ok)` alone, untested since PD8 removed the vacuous post-savepoint asserts. RB3's `step_conflict` leg reuses the claim's OWN flag's step id, so it refuses before any write. Fix: flag A with step S; flag B; POST a finding on B with `step_id` S ⇒ 409 `fraud_investigation.step_conflict`; then no `claim_nominee_findings` row for B, no `claim.nominee_lock_released` on B's stream, erasure still refused `rtbf.death_reported`. Source: Test-and-claims Auditor TC1 (reachability re-read by the reviewer: `fraud-investigation-persist.ts` steps (4) → (5)).
- [x] [Review][Patch] **R2-2 — `closed_member_alive` is pinned over HTTP on one of its three handlers, and the holder direction on none (LOW-MED)** [`apps/api/src/modules/claims/claims.appeal.handlers.ts:364`, `claims.nominee-declaration.handlers.ts:809`] — the only HTTP assertions are on the death-certificate helpline read, for a claim's OWN close; a hard-coded `false` or the wrong set in either other handler satisfies the `.strict()` DTO and stays green (the admin tests feed mocked DTOs). Fix: one HTTP leg per remaining handler — claim R closed `held_by` a claim C later fraud-closed ⇒ R reads `true`; a control claim ⇒ `false`. Source: Test-and-claims Auditor TC2.
- [x] [Review][Patch] **R2-3 — A finding whose response is lost reads "could not be recorded" beside the recorded finding, and the other-claims answer is lost (LOW-MED)** [`apps/admin/src/modules/claim-verification/FraudInvestigationPanel.tsx:120`, `:174`, `:258`] — the POST commits, the response never arrives (a drop, a 502): `onSettled` refreshes, the re-read shows the found step with `can_record_finding: false`, the form unmounts, but `record.isError` keeps `refusalGeneric` on screen and `result` stays `null` — so `other_standing_claims`, the finder's only sight of what else keeps the member locked, is never shown, and with the form gone nothing re-sends the held ids (whose replay would return it). If the refresh ALSO fails and the admin changes the outcome, the resend is `step_conflict`, whose copy hides that a finding exists. Fix: when a generic (non-typed) error is showing and `idsRef.current` is set, offer one "Check what was recorded" action that re-sends the SAME body (a 200 replay carries the other claims); suppress the generic line once the refresh shows a found step. A test for the lost-response path. Sources: Edge Case Hunter EC1, Blind Hunter BH10 (merged).
- [x] [Review][Patch] **R2-4 — A replay is matched on the step id alone: a different `finding_id`, or a different ACTOR, gets 200 `replayed` (LOW)** [`packages/domain/src/claim/fraud-investigation-persist.ts:281` (finding), `:152` (flag)] — the finding replay checks only the step kind, so a retry with the same `step_id` and a new `finding_id` returns the ORIGINAL finding and silently drops the request's id, note and proof (AC8: *"a different `finding_id` on a found claim ⇒ 409"*); and the replay runs before `finder_is_flagger`, so a request from ANOTHER actor carrying a known step id is answered 200 with no audit line (the handlers audit only `!replayed`). Unreachable from the shipped UI (it mints both ids once; step ids appear in no read DTO) — reachable by an untyped caller. Fix: in both writers a replay must match `actor_id` (case-insensitive) and, for the finding, `finding_id`; a mismatch is `step_conflict`; a domain test for each. Sources: Acceptance Auditor AA3, Edge Case Hunter EC4 (merged).
- [x] [Review][Patch] **R2-5 — The override now refuses EVERY closed against-claim, but DL9 (f)'s residual and the doc block name only a found-alive close (LOW-MED)** [`packages/domain/src/claim/icp.ts:639`, the doc block above `overrideIntakeAttempt`] — `against?.currentState === 'closed'` refuses an RF6 (`suspicion_appeal_allowed`) or OP4 (`death_already_finally_approved`) closure too, where before 6.22 the override minted a separate claim; a closed claim is no merge candidate either, so such an attempt can now never be resolved — it stays `pending` as history, and the family's NEW report mints a claim as before (re-filing and one-payment-per-death unchanged). The generality matches `-438` item 8; the RECORDS are narrower than the code (family 10). `fraud-convergence-door.spec.ts` covers a fraud close only. Fix: widen DL9 (f)'s residual, the `deferred-work.md` residual line and the doc block to "a claim later CLOSED (any trigger)"; one test with an RF6- or OP4-closed against-claim ⇒ `IntakeOverrideAgainstClosedClaimError`. Source: Acceptance Auditor AA2 (the `-438` item 8 wording checked by the reviewer).
- [x] [Review][Patch] **R2-6 — The work-list shows a claim the VIEWER flagged and can never finish (LOW)** [`apps/api/src/modules/claims/claims.fraud-investigation.handlers.ts:374` (`isVisible`); `apps/admin/src/routes/FraudInvestigationsRoute.tsx`] — `super_admin` derives both keys, and one person can hold both roles: their own flag joins their work-list, opens to "You flagged this claim…", and a submit is `finder_is_flagger`; the row stays until someone else finds it, with no sign it is not theirs. Fix: return `is_flagger` per row (the console read already computes it) and render "You flagged this — another District Admin must record the finding" on the row; ⛔ hide it (a lone Super Admin must still see it exists). A test. Source: Edge Case Hunter EC2.
- [x] [Review][Patch] **R2-7 — A 403 on submit reads "just now" on both forms (LOW)** [`FraudInvestigationPanel.tsx:42` `refusalWords`; `HelplineFraudFlag.tsx:32` `flagRefusal`] — a grant revoked, or the deceased's latest posting moved district, between load and submit gives the generic "could not be recorded / flagged just now", which invites retries that cannot succeed. Fix: one 403 line on each form ("You can no longer act on this claim here. Reload the page."); a test each. (The helpline's missing `fraud_investigation.missing_display` alias is NOT owed — the contract documents it as a backstop the HTTP path never shows; the handler's `admin.display_name_missing` is mapped.) Source: Edge Case Hunter EC3 (the alias half dismissed by the reviewer).
- [x] [Review][Patch] **R2-8 — The helpline flag form stays open after `already_flagged` (LOW)** [`apps/admin/src/modules/helpline-claims/HelplineFraudFlag.tsx:170`] — after a 409 the list refresh marks the row `flagged`, but `open && form` does not check `c.investigation`, so the form stays submittable and every resend is the same 409. Fix: render the form only while the row's `investigation === 'none'` (close it otherwise, keeping the refusal line); a test. Source: Blind Hunter BH12.
- [x] [Review][Patch] **R2-9 — Losing the identity read-back keeps the open form, the typed note and the "flagged" status line (LOW)** [`HelplineFraudFlag.tsx:76-83`] — the reset effect keys on `memberId` only; un-confirming the caller for the SAME member switches the body to "need member" but the always-mounted status line still names the flagged claim, and re-confirming restores the open form with the earlier note. Fix: key the reset on `ready` as well; a test. Source: Blind Hunter BH11.
- [x] [Review][Patch] **R2-10 — The work-list's empty state is not announced (LOW; family 13 (d) REAL GAP)** [`apps/admin/src/routes/FraudInvestigationsRoute.tsx:57`] — a bare `<p>`, where the sibling `NomineeRefusalsRoute.tsx:63` uses `role="status"`; DL10 asks for an always-mounted `role="status"`. Fix: `role="status"` on the empty line; assert it by role. Source: Acceptance Auditor AA4.
- [x] [Review][Patch] **R2-11 — No test checks `role="alert"` on any refusal (LOW)** [`apps/admin/tests/fraud-investigation.test.tsx`] — refusals are found by `data-testid`; removing the role from `FraudInvestigationPanel.tsx:143,149,235,254` or `HelplineFraudFlag.tsx:129,198,203` stays green (AC13). Fix: query the refusals with `getByRole('alert')` and the helpline status with `getByRole('status')`. Source: Test-and-claims Auditor TC3.
- [x] [Review][Patch] **R2-12 — The `closeOtherClaimsOfDeath` type pin pins an alias, not the function (LOW)** [`packages/domain/tests/claim/fraud-closed-payload.test.ts` (last test); `suspicion-refusal-persist.ts:196`] — the `@ts-expect-error` assigns to `ClaimClosedHeldTrigger`; widening the function's parameter to `ClaimClosedTrigger` stays green (AC9). Fix: assert on `Parameters<typeof closeOtherClaimsOfDeath>` (or an exported input type). Source: Test-and-claims Auditor TC4.
- [x] [Review][Patch] **R2-13 — Test titles and loose assertions (LOW)** — (a) AC6 (a)'s "upper-case id" leg cannot fail for a case reason (`intakeAdvisoryLockKey` and the brand both lower-case): retitle to what it proves; AC6 (b) is the discriminating TR11 test; (b) the `pariwar_admin` flag denial is status-only — assert the code, as the RB1 one-code block does; (c) the "no step-up ⇒ nothing written" leg runs on an UN-flagged claim, so its "nothing written" half cannot fail — run it on a flagged claim; (d) the DL5 limit clamp is untested — one domain test per reader at the cap; (e) the EA10 pin's `not.toContain(ctx.cid)` has no positive control — assert the key IS present before the finding. Sources: Test-and-claims Auditor TC5, TC6 (the cross-Pariwar `[403, 404]` and the AC11 source-scan items left as is: both are the house shape).
- [x] [Review][Patch] **R2-14 — Two comments say false things (LOW)** — (a) `packages/domain/src/member/overlay.ts:49-51` says a guilty finding on a `denied` claim already unfrozen by `claim.denied_no_appeal` "emits ⛔ close at all" — `denied` is closable (`CLAIM_NOT_CLOSABLE_STATES = ['settled','approved','closed']`), the close IS emitted, and `overlay-three-readers.spec.ts:101-105` seeds exactly that; reword to "a claim already `closed`" (the sticky leg is still needed for the shared-`now()` tie), and DL13's sentence with it; (b) `apps/admin/src/modules/helpline-claims/i18n-en.ts:232` — "PERMANENT until the Super Admin acts" sits above `step_conflict` (fixed by Cancel + re-open, as its own text says); it belongs to `display_name_missing` one line below. Sources: Acceptance Auditor AA5, Blind Hunter BH19.
- [x] [Review][Patch] **R2-15 — Records now false or stale (LOW)** — (a) Completion Notes, Task 6: "the work-list view is ⛔ component-rendered (it needs the router)" — RC8 rendered it; (b) the RA5 "applied" record still describes "the FK dropped inside a rolled-back transaction … four tests red" — PD11 replaced that leg with a `pg_temp` clone and ran no mutation on it; PD13's corrected-in-place list omits RA5; (c) the Completion Notes say "Deviations (1)–(12)" — there are 13 (RB12 added the 13th); (d) `deferred-work.md` files RD7 under the "patch-diff review" heading — it came from the post-commit browser pass; (e) RC9 says "the held write re-sent through the REAL step-up flow" — the real `StepUpPanel` renders, `requestStepUp` / `verifyStepUp` are mocked. Fix each in place, dated. Source: Test-and-claims Auditor TC7.
- [x] [Review][Defer] **RD8 — The sticky freeze adds a second un-indexed `events_log` payload scan to the directory predicate** [`packages/domain/src/member/overlay.ts` `stickyFrozenMemberSql`; `member/directory-read.ts` `NOT_DECEASED`] — deferred, pre-existing: `NOT_DECEASED` already runs a correlated `events_log` scan on `lower(payload ->> 'deceased_member_id')` per directory row with no expression index (0001 indexes `(pariwar_id, stream_id, event_version)` and `(pariwar_id, occurred_at)` only); 6.22 adds one more `EXISTS` of the same shape. Unmeasured; the directory is not live (Row 17). Source: Blind Hunter BH18.
- [x] [Review][Defer] **RD9 — The helpline APPEAL list's `closed_member_alive` and `closed_holder_refused` are false by construction** [`apps/api/src/modules/claims/claims.appeal.handlers.ts` (~364); `claim/appeal-eligibility.ts` `HELPLINE_APPEAL_LISTED_STATES`] — deferred, pre-existing (`closed_holder_refused` since 6.28): the list carries only `denied` / `appeal_stage_*` claims and both bulk reads answer only for `closed` ones, so both bits are always `false` there and the admin's `closedClaimStateLabel` arm on that screen is dead. Harmless today. Found by the R2-2 patch (patch-diff PT3).
- [x] [Review][Defer] **RD10 — The verifier console, after losing Pariwar access mid-session, says "Temporarily unavailable … Try again shortly" and "This claim is resolved"** [`apps/admin/src/routes/VerifierConsoleRoute.tsx` (the `console_.isError` branch); `VerificationDecisionStrip.tsx` (`!isActive && !isRevisable` ⇒ historical)] — deferred, pre-existing (seen in the round-2 browser pass): a 404 `pariwar.not_found` is not `isForbidden`, so the console shows the transient line, and the decision strip, with no packet, reads the claim as resolved. Both false for an `intake_pending` claim; nothing is written.

**Dismissed (15), each re-checked:** BH1 (a found-alive finding leaves the death's sibling claims open) — by design, `-438` item 1: *"EVERY claim filed about you needs its own finding"*; the response lists them. BH2 (opposite findings on two claims) — by design (DL2: one member finding per claim, of either kind); the guilty claim keeps standing, so the member stays locked — coherent. BH3 (decrypting reads audited best-effort) — the house shape (`emitAuthAudit` is a synchronous sink enqueue, emitted after success, as in `claims.contact.handlers.ts`); chunk B accepted it. BH4 (a `finding_id` PK collision is a 500) — AC8 sanctions exactly that. BH5 (event actor `'operator'`) — `claimActorSchema` is `member | operator | trustee | system`; `operator` is staff. BH6 (no `auditId` into the finding writer) — RB8 withdrawn on verification (the id joins nothing). BH7 (the flag locks the row without the intake key) — the flag takes no advisory key after the row, so no cycle (Edge Case Hunter checked `projectClaimState`). BH8 (a second scope transaction per write) — the house pattern (`openScopeTx(deps, …)` in ten modules). BH9 (refresh on every error) — the client validates the note / outcome / proof first, so the 400s are unreachable from the UI, and the refresh on a 5xx is what R2-3 builds on. BH13 (silent list cut-offs) — already deferred by chunk B. BH14 (the two label reads share one savepoint) — deliberate ("degrade together"): degrading only the new read would print the false OP10 "may file again" label. BH15 (guilty result "No other claim…" beside "stays locked") — literally true ("other"), and the locked line says why. BH16 (the convergence re-check refuses a stale merge target) — DL9 (e) as designed. BH17 (a missing against-claim passes the door) — the handler resolves the against-claim's death against the attempt before the writer; claims are never deleted. BH20 (other producers of the widened DTOs) — every producer of `closed_holder_refused` also sets `closed_member_alive` (grep).

#### Round 2 — patches applied (2026-11-02, BigDev: *"1"* — apply every patch)

R2-Q1 → Decision `2026-11-02-439` (committed ALONE, `6bf11501`). The fifteen patches were applied by three agents in parallel on disjoint
files (domain / API + contracts / admin; the DB specs on two databases — the story DB :5451 and a fresh `twt-622-r2b-pg` :5454 — so the two
live-DB halves never shared one), the records by the reviewer; then an independent read-only PATCH-DIFF audit (below). UNCOMMITTED until the
verification commit.

- **R2-1 — applied.** `fraud-investigation-routes.spec.ts` (RB3): claim A flagged with step S, claim B flagged; an innocent finding on B with `step_id` S ⇒ 409 `step_conflict`, the `_rejected` audit `['step_conflict']`, ⛔ finding row, ⛔ `claim.nominee_lock_released`, steps `['flagged']`, state unchanged, erasure still `rtbf.death_reported`, A's step untouched; the CONTROL (a fresh step id) ⇒ 201, one finding row, the release event written (PT9) and erasure `rtbf.invalid_state`. ⚠ **The finding overstated the risk:** the step-id collision is a 23505 that ABORTS the transaction, so Postgres would refuse to commit it even if the handler's `ok` were true — the leg pins the OUTCOME, ⛔ `closeScopeTx` in isolation, and ⛔ rollback mutation was attempted. The flag route is not mirrored (it writes only its step, so nothing precedes the collision).
- **R2-2 — applied, the appeal half by construction only.** Nominee-refusals list: four claims of one death — R closed `suspicion_appeal_allowed` held by C, K held by D (never found) — all `false` before; after C's finding, C `true` (own close), R `true` (holder direction), K and D `false`; mutation (a hard-coded `false` in the handler) ⇒ RED. ⚠ **The helpline APPEAL list can never carry `true`:** it lists only `denied` / `appeal_stage_*` claims (`HELPLINE_APPEAL_LISTED_STATES`) and `readClosedMemberAliveBulk` answers only for `closed` ones — so the leg pins the fraud-closed claim's ABSENCE and `false` on the death's other row; a hard-coded `false` there would still pass. The same is true of `closed_holder_refused` since 6.28 — recorded as RD9.
- **R2-3 — applied (+ PT1).** `FraudInvestigationPanel.tsx`: `refusalWords` returns `null` for an untyped failure; `lastSentRef` keeps the last body (cleared on success); ONE "Check what was recorded" action re-sends it under the SAME ids; once the refresh shows a found step the generic line becomes "A finding is now recorded on this claim…". PT1: while the check is offered, the FORM is locked (`formLocked` includes `canCheck`), so an edited outcome can no longer be sent under the same ids into a `step_conflict` that hides a written finding; mutation (the lock removed) ⇒ RED. Tests: a dropped connection and a 502 (`it.each`); refresh-without-finding with the locked form; a typed refusal offers no check.
- **R2-4 — applied.** Both writers: a replay must match the ACTOR (and, for the finding, the `finding_id`), case-insensitively (`sameId`); else `step_conflict`. Doc comments state the replay key. Domain tests (AC8 block): a different finding id or another actor ⇒ `step_conflict` with ⛔ write (events, steps, findings unchanged), the same actor in upper case still replays — for innocent, guilty and the flag; mutation ⇒ 3 RED. Every existing replay test uses the same actor.
- **R2-5 — applied.** `icp.ts` doc block, DL9 (f) (a dated correction) and the `deferred-work.md` residual widened to "closed for ANY reason"; `fraud-convergence-door.spec.ts` `it.each` over `suspicion_appeal_allowed` / `death_already_finally_approved` ⇒ `IntakeOverrideAgainstClosedClaimError`, the attempt still `pending`; mutation ⇒ RED. ⚠ `-438` item 8's own residual sentence still names only *"a claim later found-alive-closed"* — true, merely narrower; ⛔ superseded (the code and every record that USES it say "any closure").
- **R2-6 — applied.** `listOpenFraudInvestigations` returns `flaggerActorId`; the contract item gains a required `is_flagger` (`.strict()` kept); the handler's one `isFlaggedBy` serves both the console and the work-list; the route renders the panel's `youFlagged` line on such a row (⛔ hidden). Tests: API (a Super Admin's own flag ⇒ `true`, another District Admin ⇒ `false`, then `finder_is_flagger`), contracts (missing field fails), admin (both values); mutation ⇒ RED. OpenAPI: the fraud schemas are not in `openapi/v1.yaml`; the determinism gate passes.
- **R2-7 — applied.** A non-step-up 403 ⇒ "You can no longer act on this claim here. Reload the page." on both forms (`authz.forbidden` from RBAC, `auth.forbidden` from handlers — `it.each` over both).
- **R2-8 — applied (+ PT7).** The form renders only while the row is `none`; an effect closes a stale form (focus to the heading) and keeps the refusal on THAT row (`role="alert"`). PT7: the refusal is recorded in the write's own `onError` (`lastRefusalRef`), ⛔ read from `flag.isError` when the refreshed list lands — no ordering dependence. A mutation of the render guard ALONE stays green (the effect closes the form in the same update) — recorded, the effect is pinned.
- **R2-9 — applied.** The reset keys on `[memberId, ready]`. ⚠ PT4: of the form test's assertions only "the Flag button is back" can fail (an unconfirmed member renders only the need-member line; opening the form clears the note anyway) — retitled to say so; the status-line test beside it is sound.
- **R2-10 — applied.** `role="status"` on the empty line, asserted by role.
- **R2-11 — applied.** Every listed alert / status line is now found by ROLE; mutation (a role removed) ⇒ 8 / 6 / 2 RED.
- **R2-12 — applied.** `CloseOtherClaimsOfDeathTrigger = Parameters<typeof closeOtherClaimsOfDeath>[1]['trigger']` (a type only; the function stays private); the `@ts-expect-error` assigns to it, plus a check that every held trigger is accepted; mutation (the parameter widened) ⇒ `tsc` TS2578.
- **R2-13 — applied, (e) differently.** (a) AC6 (a) retitled (it proves the ORDER; case is irrelevant by construction; AC6 (b) is the TR11 test). (b) the `pariwar_admin` denial asserts `authz.forbidden`. (c) the no-step-up leg runs on a FLAGGED claim the District Admin could find. (d) `fraud-investigation-reads.spec.ts`: cap+1 rows seeded for each reader, the clamp and the constants asserted (PT6: a false clause in its comment deleted). (e) ⚠ the control was added AFTER the finding (a new open claim of the death ⇒ `other_claim_for_death:<c3>` listed), ⛔ before it as asked (no key can appear and vanish before the finding); PT5: it is a DIFFERENT key kind from the `recent_nominee_change` key EA10 guards — a queue blind to that kind alone would pass both legs; the direct `readClaimApprovalWarnings` keys / kinds assertions above it carry that weight.
- **R2-14 — applied.** (a) `overlay.ts` header reworded; DL13 carries a dated correction. (b) the comment moved to `display_name_missing`; `step_conflict` has its own.
- **R2-15 — applied** — (a)–(e) dated in place; (b) and (e) tightened by PT8 (d) / (e).

**Patch-diff audit (read-only, one Test-and-claims layer over the 826-line test diff + the records; the reviewer read the 478-line production diff by hand):** PT1 (R2-3's edit-then-Submit path) — FIXED above; PT2 (the records said nothing applied) — this block; PT3 (the appeal list) — recorded under R2-2 + RD9; PT4 — retitled; PT5 — recorded under R2-13 (e); PT6 — fixed; PT7 — fixed; PT8 (a) the routes-spec header, (b) DL10 (iv) gains `is_flagger`, (c) `-438` item 8 — recorded under R2-5, (d) / (e) reworded; PT9 — R2-1's control asserts the release event; R2-5's after-throw checks left (harmless; the error class carries the test). The reviewer's own pass over the production diff found nothing further.

**Verification of the patches (before the full gate):** domain — `tsc` clean, ESLint clean, the eight touched files 101 passed on :5451 (`fraud-investigation.spec` 26 → 29, `fraud-convergence-door.spec` 5 → 7, `fraud-investigation-reads.spec` 5 → 7, `approval-warnings.spec` 26, concurrency 9, three-readers 1, payload 6, overlay unit 16), the API source fence 26 / 26; API + contracts — `tsc` clean (both), ESLint clean, routes spec 28 → 32 on :5454, the API unit suite 76 files / 804 passed, contracts 95 files / 1,697 passed, the OpenAPI determinism gate green; admin — `tsc` clean, ESLint clean, the full suite 96 files / 1,833 passed (1,819 → 1,833), `microcopy:check` green; after PT1 / PT4 / PT6 / PT7 / PT9 the two fraud UI files 85 passed, the routes spec 32 passed, the reads spec 7 passed.

#### Round 2 — verification after the commits (2026-11-02, BigDev: *"run it in browser too"*)

- **`ci:local` — 37 / 37 GREEN on the FIRST run** at `3118c528`, on a FRESH container (`twt-622-ci-pg`, `postgres:16-alpine`, DB `twt_dev`, :5452), `DATABASE_URL` typed explicitly; the container removed afterwards. (A throwaway browser launcher was written into `apps/api/tests/integration/` while the gate ran; it was renamed out of the test glob within minutes, before the API test job started — the log never names it.)
- **The real-browser pass RAN** at `3118c528` (Chrome reached localhost on the first probe; a throwaway launcher on a fresh Postgres :5455 behind a FRONT PROXY that can let one finding POST commit and then drop the socket; the cookie helper; all deleted afterwards — the launcher's orphaned worker stopped by PID). Legs: R2-6 (the Super Admin's own flag labelled, a District Admin's same rows not); R2-10 (the empty work-list a `role="status"` line); R2-3 (a GENUINELY lost response after the step-up re-send ⇒ the recorded finding shown with *"A finding is now recorded…"*, ⛔ "could not be recorded", ONE check button; pressing it ⇒ the replay sentence, the other-claims answer, focus on the result; the DB read: one finding, one found step, one `claim.closed`); R2-7 (a district grant revoked between load and submit ⇒ ⛔ written, and the CONSOLE's own forbidden line — see below); R2-8 (`already_flagged` from a second operator ⇒ the form closes, the refusal on THAT row, focus on the section; one flag step, the second operator's); R2-9 (un-confirming the read-back closes the open form; re-confirming shows the Flag button). Roster Row 47 (e) carries the dated re-run line with its limits.
- ⚠ **What the browser showed that the tests did not:** (1) **R2-7's panel line is a BACKSTOP, ⛔ what a user sees** — the hook's `onSettled` refreshes the verifier console too, the console read is refused for the same reason, and the console's error branch replaces the whole packet (the panel included) with its own *"You don't have access to this claim from your current scope…"*; that line is honest, so nothing is owed for R2-7. (2) **Losing EVERY grant in the Pariwar** (my first, too-broad revoke) makes every route answer 404 `pariwar.not_found`, and the console then shows *"Temporarily unavailable — this signal could not be loaded. Try again shortly."* beside *"This claim is resolved — the decision is shown for reference…"* for an `intake_pending` claim — both false; pre-existing verifier-console behaviour (the decision strip treats a missing packet as historical), ⛔ 6.22's — recorded as RD10.


## Dev Notes

### Traps

- **TR1 — "Release" is NOT "erasable".** After an innocence finding, an `active` member's erasure is still `rtbf.invalid_state` (6.38 round
  4 patch 9). Assert the ordinary refusal, not success.
- **TR2 — The fence (G4) fires on the NAME.** Any new file under `apps/api/src`, `apps/jobs/src` or `packages/domain/src` that spells
  `'member_found_innocent'` or imports `CLAIM_NOMINEE_FINDING_KINDS` goes RED. `fraud-investigation-persist.ts`'s "already found" check
  reads the STEP table; every kind-spelling write lives in `nominee-lock.ts` (`recordMemberGuiltFinding`), every kind-spelling predicate
  in the schema file (`MEMBER_FINDING_UNIQUE_PREDICATE`) — never the literal in a new file. The new close triggers are named
  `fraud_finding_*` for this reason. Where a new file MUST name a kind, add it to the allow-list with a history line — never widen the
  scan's pattern. DL11's fragment lives in `peer-mesh-read.ts` (already listed), uses the alias `f`, moves `gateSqlCopies`' count 1 → 2,
  and is IMPORTED by `peer-mesh-request.ts`, never inlined.
- **TR3 — Fixtures replay.** A member with zero events replays to `pending-kyc` and the door refuses it; seed through real events —
  `seedLifecycleMember(t, { pariwarId })` (`apps/api/tests/integration/_death-report-fixture.ts`) for the API legs; `seedOpenMemberStream`
  and `seedClaim` (`packages/domain/tests/integration/_helpers.ts`) for domain legs (a `seedClaim` row with no events fails
  `projectClaimState`'s replay — seed a claim WITH events, 6.38 TR2). For a claim in `approved` / an appeal stage / a live R9 session use
  `claimAt` / `emitClaim` (`packages/domain/tests/integration/claim/_one-payment-fixtures.ts`) — ⛔ `forceClaimState`
  (`_death-report-fixture.ts`): `projectClaimState` REPLAYS the whole stream and overwrites `current_state`, so the finding's own
  annotation resets a forced state and the `approved ⇒ not closed` leg would wrongly close it. Directory and peer-mesh legs need a
  `member_kyc_profiles` / `member_identities` row that `seedLifecycleMember` does not seed (AC7, AC11). Production has no `active` members
  (no `lock_in_expired` producer), so `active` exists only in seeded tests.
- **TR4 — RLS masks the tenant predicate.** A cross-Pariwar test as `twt_app` never exercises the SQL's own `pariwar_id` filter. Also run it
  on the test transaction WITHOUT `enterAppScope` (the superuser — `getTx()` alone), as `packages/domain/tests/integration/claim/
  death-report.spec.ts`'s "ON THE PREDICATE'S OWN — with RLS out of the way" case does (6.38 R2 P10). There is no named helper for it.
  EXCEPT `listAccountFrozenMemberIds`, whose tenant predicate IS the `app.pariwar_id` GUC (read without `missing_ok`): run it as superuser
  with the GUC set via `set_config`.
- **TR5 — The closure core is the ONLY door to `claim.closed`.** Do not emit `claim.closed` from `fraud-investigation-persist.ts`; call the
  new exported closer. Do not take the claim row before the appeal / R9 / trustee keys (`closeClaimIfDeathPaid`'s doc: *"taking `appeal:` /
  `r9:` / trustee keys AFTER the claim's row would invert the order"*).
- **TR6 — `held_by_claim_case_id` is load-bearing in OP10.** Do not fill it with the claim's own id to satisfy the schema — OP10 would label
  the claim *"the other claim for this death was later refused; the family may file again"*. Use DL13's discriminated union.
- **TR7 — The new close triggers are a schema change.** Every reader of `claim.closed` must still type-check AND behave: `suspicion-notice.ts`
  filters on its own trigger (safe — assert it); OP10 branches on `held_by`, not on the trigger (guard it).
- **TR8 — The overlay is per stream.** "Overlay OFF" after an INNOCENT finding holds only when no other claim stream for the member is
  frozen (an `approved` claim, a second standing claim). Assert both. After a GUILTY finding the overlay stays ON by design, whatever
  follows on that stream (N7, DL13's sticky freeze).
- **TR9 — Re-entrant lock.** `recordMemberInnocenceFinding` re-taking `intakeAdvisoryLockKey` inside DL3's transaction is a no-op
  (`pg_advisory_xact_lock` is re-entrant per session) — do not add a "lock must already be held" assertion that breaks its test callers.
- **TR10 — Numbers collide with siblings (the 2026-11-01 snapshot — READ LIVE at each commit).** `main` at `91ea2c81` holds decision `-437`
  (`-433`–`-437` minted by 12.2), ledger `2026-11-01x`, migration `0195_marketplace-partners-and-publications` (journal idx 195), catalog
  v57 / 75 keys / 13 bundles, `CLAIM_EVENT_TYPES` 37, `MEMBER_EVENT_TYPES` 24, roster top Row 45, `ci:local` 37 jobs. Next free there:
  decision `-438`, migration `0196`, catalog v58 (75 → 77 keys), ledger `2026-11-01y`. Still contested by unlanded siblings: `0196`
  (`story/6-39-…` plans `0196_claim-membership-checks`), the next catalog version (6.39, 14-3), `CLAIM_EVENT_TYPES` 38 (6.39), roster Row 46
  (6.39, 14-3), ledger `d` (`story/13-2-…` holds a `d` beside this branch's). Whichever lands second renumbers on rebase; the drizzle
  journal's `when` order matters ([[project_sibling_migration_when_order_shared_db]]).
- **TR11 — Case-normalised keys.** `intakeAdvisoryLockKey` lower-cases both ids; a raw `body.member_id` may not — probe with an UPPER-case id
  (6.38 R2 P1). `appealAdvisoryLockKey`, `r9VotingAdvisoryLockKey` and `stateTrusteeDecisionAdvisoryLockKey` do NOT normalise: build all
  three from branded ids (`ids.claimId()` lower-cases) or the DB row's id — a differently-cased key is a SECOND lock, taken after the row by
  `endCorrectionRun`'s re-take (an order inversion).
- **TR12 — A member with no posting.** The district resolver returns NULL and every role is refused the FINDING (G7); the flag is
  pariwar-dimension and unaffected. Do not "fix" it with a pariwar fallback in this story — it is a recorded residual (AC4).
- **TR13 — "Innocent" is not "alive".** A finding is only legal with `alive_confirmation` (N1). Never let a District Admin close a claim with
  a finding on a member whose aliveness was not confirmed — that would close a genuine family's claim, silently and for good.
- **TR14 — Withholding on the wire.** DL5's helpline read and the finding's "other claims" list carry ids, states and dates only — no
  claimant name, mobile or address ([[feedback_withholding_must_be_uniform]]).
- **TR15 — Two "reported dead" truths.** The leaf (`isDeathReportStanding`) and the account overlay are different readers of the same fact,
  and already differ by design for terminal claims (N7). A `claim.closed` unfreezes the overlay by event TYPE, so a guilty close would make
  the account read "Active" while every lock still reads "reported dead" — and the public Member Directory would show a member the Trust has
  just found faked their own death. Excluding the close is NOT enough (a `denied_no_appeal` stream, an already-`closed` claim — G20): the
  freeze is STICKY on `claim.member_found_guilty`, through ONE exported constant + fragment, in ALL THREE readers or none (the 11a.3
  incident is the cost of one reader drifting).
- **TR16 — The admin microcopy gate.** `pnpm microcopy:check` scans EVERY line of `apps/admin/src/**` (`*.ts` / `*.tsx`), comments
  included: the bare word `report` — and `death-report` in a comment — FAILS (`microcopy.yaml` maps it to *Sahyog Vivran*;
  `scripts/microcopy/lib.ts` `checkVocabulary`, a `\b…\b` match) — write "claim" or "reported". The `moderation-advice` rule forbids
  *"should be (suspend|terminat|ban)…"*, *"action required"*, *"candidates for termination"*. *"Closed — the member was found alive"*
  passes.

### What this story does not do

It does not collect, store or match PAN / Aadhaar / father's name; ban anyone; refer, impose, lift or terminate (`6-22d`); investigate a
death that DID happen (`6-22b`); delete anything (`6-22b`); produce `nominee_disqualified` or pay on proof of succession (`6-22c`); touch a
committed claim beyond recording the finding (`6-22c`); change `isDeathReportStanding`'s body; change `namedByClaimSql`; add a moderation
reason
code; notify a claimant or nominee; add any member-facing screen.

### Project Structure Notes

- Domain: `packages/domain/src/claim/fraud-investigation-persist.ts` (flag, finding, `readClosedMemberAliveBulk` or beside
  `readClosedHolderRefusedBulk` in `claim/one-payment-per-death.ts`), `claim/nominee-lock.ts` (DL12 + `recordMemberGuiltFinding`),
  `claim/death-report.ts` (`listStandingDeathReports` only), `claim/read.ts` (DL5's option), `member/overlay.ts` +
  `member/directory-read.ts` (the sticky freeze), `encryption/field-classes.ts`,
  `claim/suspicion-refusal-persist.ts` (the exported fraud closer), `claim/events.ts` + `claim/state.ts` (annotations, triggers, the
  discriminated payload), `claim/one-payment-per-death.ts` (OP10 guard), `claim/icp.ts` (DL9 (b)), `claim/peer-mesh-read.ts` +
  `claim/peer-mesh-request.ts` (DL11), schema `claim_fraud_investigation_steps.ts`, `policies/claim-fraud-investigation-rls.ts`,
  `ids/index.ts`, `member/anonymize.ts` (DL15), `rbac/permissions.ts`, `rbac/roles.ts`.
- Migrations: `packages/domain/migrations/` (the next free numbers; journal).
- Events: `packages/events/src/registry.ts`.
- API: `apps/api/src/modules/claims/claims.fraud-investigation.{routes,handlers}.ts`, `modules/claims/index.ts`,
  `apps/api/src/audit/audit-sink.ts`, `apps/api/src/context.ts` (field-class twin).
- Contracts: `packages/contracts/src/claims/fraud-investigation.ts` (+ `FRAUD_FINDING_STEP_UP_CONTEXT`); the closed-claim bit on
  `nominee-declaration.ts`, `death-certificate.ts`, `appeal.ts` beside `closed_holder_refused`.
- Admin: `apps/admin/src/modules/claim-verification/FraudInvestigationPanel.tsx`, `modules/claim-verification/i18n-en.ts`,
  `modules/helpline-claims/HelplineFraudFlag.tsx` + `HelplineClaimPage.tsx` (+ its `i18n-en.ts`), the work-list route + `router.tsx`,
  `api/client.ts` + `api/hooks.ts`; the shared `modules/workplaces/StepUpPanel.tsx` (reused, not copied).
- API: also `claims.convergence.handlers.ts` (DL9 (b)) and the three G9 handlers (`closed_member_alive`).
- Gate: `scripts/claim-adjudication-human-actor-invariant/check.ts`.
- ⚠ Epic placement: kept in Epic 6 (the release is a claim-path fact; the row key is cited by four decisions).

### References

- Decisions: `2026-09-21-238`, `-239`, `-240`, `-241` §6; `2026-09-25-243`; `2026-09-28-261` D3, N2, `-262` FQ4; `2026-10-10-311` PM1;
  `2026-10-16-339` RF1, `-340`; `2026-10-30-423` Q1 (b); `2026-10-31-424` Q2 (a); `2026-10-31-425` 6.38 DL4, 6.38 DL7, DL12 (ii); `-195`
  cl. 2; `-210` (not delegated: keys, closure vocabulary); `-121` (§8.8; Q2B the hearer rule); `-305` §1 (c), `-421` QE6 (Trustee-Lite
  readings); `2026-08-21-147` cl. 3 (the account-frozen fence) and `-146` (the member sentence); `2026-10-10-304` (the reading, not ruled);
  `2026-10-07-291` Q1 A / Q2 B; `2026-10-11-318` Q3 A; `2026-10-12-321`; `2026-10-30-422` Q1 A; `-433` QE2 (the key-mint precedent).
- Routing notes: `trustee-panel-routing-note-2026-09-21-fraud-register-what-we-keep.md`,
  `…-2026-09-21-fraud-register-how-far-the-ban-reaches.md`, `…-2026-09-20-6-20-living-member-locked.md`.
- Stories: `6-20-nominee-declaration-history-and-as-at-death-rule.md` (AC2's release route, D8, D17(c), P5);
  `6-38-death-locks-erasure-and-non-member-claims-refused.md` (N1, DL4, DL7, TR2–TR10, review rounds 1–5); `6-24` / 6.24a (the closure
  core); `6-21a` (the review table template); 10.18–10.22 (moderation, the `trustee_panel` role, the appeal — for `6-22d`).
- Code: as cited in G1–G21.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 6.22`, in the story's own worktree.

### Debug Log References

**Task 0.1 — traces at `91ea2c81` (2026-11-01; two read-only agents for (ii) / (iv) / (vi) / (vii), each load-bearing claim re-read by
hand).**
- (i) `peerMeshEligibleMemberSql` (`peer-mesh-read.ts`) still calls `namedByClaimSql` directly (`AND NOT ${namedByClaimSql(…)}`), and
  `peer-mesh-request.ts` `readPeerMeshRequestEligibility` inlines `namedByClaimSql(…) AS reported_deceased` — DL11's two swap points.
- (ii) Seven readers of `claim_nominee_findings`, all in `packages/domain/src` (⛔ in `apps/api/src` / `apps/jobs/src`): `approval-warnings.ts`
  × 3 (`readClaimApprovalWarnings`, `readClaimApprovalWarningsSlice`, `getClaimWarningAnchor`), `death-report.ts` `isDeathReportStanding`,
  `peer-mesh-read.ts` `resolvePeerMeshFilingCut` — each `f.kind = 'member_found_innocent'`; `nominee-effective.ts` `readRaw` × 2 — each
  `kind = 'nominee_disqualified'`. ⛔ Reader filters on "any finding", `<>`, `ne(` or `notInArray` — DL2's new kind moves none of them.
- (iii) `closedClaimStateLabel(closedHolderRefused, claimState)` (`claim-verification/i18n-en.ts`) — exactly four callers:
  `HelplineCertificateReplacement.tsx`, `HelplineAppeal.tsx`, `HelplineClaimContact.tsx`, `NomineeRefusalsRoute.tsx`;
  `readClosedHolderRefusedBulk` — exactly three handlers: `claims.death-certificate.handlers.ts`, `claims.nominee-declaration.handlers.ts`,
  `claims.appeal.handlers.ts`. G9 stands.
- (iv-a) **6.23b EA10 — both row-`6-22` mechanisms are UNREACHABLE; ⛔ anchor fix exists to build.** (1) The round-2 append (*"the 90-day
  anchor moves LATER, and a `recent_nominee_change` key can appear"*) has the direction wrong: `first_filed_at` = the earliest filing among
  claims with ⛔ innocence finding; a finding only REMOVES a claim, so the anchor only moves LATER; `isRecentNomineeChange(effectiveAt,
  anchor)` = `istDateOf(effectiveAt) >= anchor − 90` with ⛔ upper bound, so a later anchor yields a SUBSET of the keys — keys vanish,
  ⛔ appear. Findings are never withdrawn (GRANT SELECT, INSERT; N2). The ratified record already says so: `-279` A7 *"the anchor only
  moves LATER (which RE[MOVES 90-day keys])"*; and `-278` NW3 / `-339` RF1 C rule the later anchor. (2) The parent mechanism (a member
  declare after the release) needs a claim still awaiting approval while the member is unlocked — but any such claim with ⛔ finding keeps
  `isDeathReportStanding` TRUE (declare 409), and a found claim in an approvable state is CLOSED by DL3 (N4); only an `approved` /
  `settled` claim is released-and-open, and neither has a later approval gate. ⇒ Proposed closure: *"Closed by 6.22 — unreachable (the
  anchor only moves later, `-279` A7; a released member has ⛔ claim awaiting approval, N4); a domain test pins it"* — the pin: approve C2
  with reasons, find C1 innocent, assert C2's keys ⊆ before and ⛔ late key listed. The 6.26b append under the same item (the determination
  arm compares two transaction-start `now()`s) is ⛔ 6.22's (⛔ determination written) — *"Not addressed by 6.22"*, its trigger kept.
  ⚠ This is NEITHER of BigDev's two named outcomes (build a small anchor fix / explicit deferral) — BigDev confirms at Task 0.4.
- (iv-b) **6.36 round-2 W2 — unreachable by N4.** `resolvePeerMeshFilingCut` is called only by `runClaimPeerMeshSelect`
  (`apps/jobs/src/claim-peer-mesh.ts`), which locks the claim and returns before the cut unless it is `documents_pending`; DL3 writes the
  finding and `claim.closed` in ONE transaction under the claim row (`documents_pending` is closable), so the select never sees an
  innocence-lifted `documents_pending` claim; a selection made before the finding is stored, never re-derived (`-340`). ⇒ *"Closed by 6.22
  N4 / DL3 — unreachable"*, contingent on N4 as built (AC4's one-transaction leg). The one-line guard in `resolvePeerMeshFilingCut` would be
  a new reading of `-339` — ⛔ built.
- (v) Closure core (`suspicion-refusal-persist.ts`) — exported: `acquireSuspicionReversalLockForClaim`, `closeClaimsHeldBySuspicionAppeal`,
  `closeClaimsOfPaidDeath`, `closeClaimIfDeathPaid`; private: `closeOtherClaimsOfDeath`, `closeLockedClaim(client, db, input: Pick<…,
  'pariwarId' | 'causeClaimCaseId' | 'trigger' | 'actor' | 'actorId' | 'auditId'>, row)` (always writes `held_by_claim_case_id`),
  `endLiveProcesses(client, db, pariwarId, held: ClaimRow)` — (1) open appeal → `closed`, (2) live Stage-2 panel superseded, (3) live R9
  session + `routed_to_r9` superseded, (4) live correction return superseded + open run ended `decided`. The "every intake-key taker" list
  is in `acquireSuspicionReversalLockForClaim`'s doc. DL3 step 6 stands.
- (vi) 6.23a — `listAppliedCorrectionLabels` (`approval-warnings.ts`) reads every `nominee_corrections` `applied` row for the MEMBER (⛔
  claim-state or finding filter), so a correction applied under a claim later found innocent labels that version *"corrected after the
  death"* on the member's history — including on a later genuine claim's timeline. Reason it is ⛔ addressed: the words are ratified copy
  (`-262` FQ1; NW4 — ⛔ reworded) and DL17 keeps copy changes out. New trigger: the first production innocence finding on a claim under
  which a nominee correction was applied (or a Panel question on the wording, whichever first); owner the Panel. ⛔ `6-22c` (a
  disqualification means the death happened — the label stays true there).
- (vii) `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts` and `claim-suspicion-staff-email-no-decision.test.ts` — each a
  `DECISION_TABLE_NAMES` array (`… 'claim_death_certificate_reviews', 'claim_correction_closures', 'claim_ground_inspections', …`);
  `'claim_fraud_investigation_steps'` goes after `'claim_ground_inspections'` in both; their "the table list is REAL" leg needs
  `claimFraudInvestigationSteps` exported from the schema barrel. `claim-correction-closure-` / `claim-certificate-reminder-no-decision`
  list function names (`DECISION_WRITERS` / `FORBIDDEN`) — the finding writers' names may be added there (Task 1.2 decides).
  `claim_nominee_findings` itself is on ⛔ list.

### Completion Notes List

- **Task 1 (AC1) — 2026-11-01.** Migrations `0196_claim-nominee-findings-guilty-kind` (DL2 alone: kind + rank CHECKs re-added, 0119's
  `IS NOT NULL` kept; the one-innocence index replaced by `claim_nominee_findings_one_member_finding_per_claim_uq`) and
  `0197_claim-fraud-investigation-steps` (DL1, hand-authored whole in 0122's order — two unique indexes, NULL-safe coherence CHECK,
  `NO ACTION` finding FK, `GRANT UPDATE ("note_ciphertext")`, per-command policies, the guard naming all ten frozen columns, TRUNCATE
  refused); journal `when` 1796528400041 / 1796614800042 (⚠ 6.39 plans `0196` — whichever lands second renumbers). Schema:
  `MEMBER_FINDING_UNIQUE_PREDICATE` (one constant: index + writers), `CLAIM_NOMINEE_FINDING_KINDS` + `member_found_guilty`,
  `claim_fraud_investigation_steps.ts` (`FRAUD_INVESTIGATION_STEPS`, `FRAUD_ALIVE_CONFIRMATIONS`), RLS file + barrels, branded
  `ClaimFraudInvestigationStepId`, `CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS` (field-classes.ts, re-exported by `apps/api/src/context.ts`).
  The two jobs `DECISION_TABLE_NAMES` lists gained the table. Tests: `rls/claim-fraud-investigation-policy-regression.spec.ts` 13/13 on
  the story DB (:5451, fresh container `twt-622-pg`); the RLS folder + nominee-lock / determination specs 1299/1299; fence 26/26; domain
  `tsc` clean; `db:check`, `schema:test`, `schema:check` green.

- **Task 2 (domain — AC2, AC3's Q7 leg, AC4 domain half, AC5, AC6, AC7, AC8, AC9; the EA10 pin) — 2026-11-01.**
  `nominee-lock.ts` — DL12 on the innocence writer (one unlocked read → intake key → row; targeted conflict on
  `MEMBER_FINDING_UNIQUE_PREDICATE`; a same-id/kind retry REPLAYS with the original annotation's version) and
  `recordMemberGuiltFinding` beside it; both return `{ eventVersion, replayed }`. `death-report.ts` — `listStandingDeathReports`.
  `events.ts` / `state.ts` / `registry.ts` — `claim.fraud_flagged` + `claim.member_found_guilty` (39 events), the trigger split
  (`CLAIM_CLOSED_HELD_TRIGGERS` / `CLAIM_CLOSED_FRAUD_TRIGGERS`), `ClaimClosedPayloadSchema` a discriminated union. The closure
  core — `closeLockedClaim`'s input discriminated, `closeOtherClaimsOfDeath` takes held triggers only, `takeClaimClosureKeys`
  (the per-claim key order, exported once), `closeClaimOnFraudFinding` (self-mode). `overlay.ts` / `directory-read.ts` — the
  STICKY freeze (`ACCOUNT_STICKY_FREEZE_EVENT_TYPE`, `stickyFrozenMemberSql`), the header's reader list corrected (G20) and the
  PQ1 swap point named. `one-payment-per-death.ts` — OP10's defensive guard + `readClosedMemberAliveBulk`. `read.ts` —
  `listClaimsNamingMemberForFraudFlag` (DL5) and `listOpenFraudInvestigations` (DL10 (iv), `isVisible` before the limit).
  `fraud-investigation-persist.ts` — the flag, the finding (DL3 steps 1–6), `listFraudInvestigationSteps` (DL7); errors
  `FraudInvestigationRefusedError`. Tests: `fraud-investigation.spec.ts` 21, `fraud-investigation-concurrency.spec.ts` 5,
  `member/overlay-three-readers.spec.ts` 1 (seven members, positive control), `fraud-closed-payload.test.ts` 6, the overlay unit
  sticky cases 6, the EA10 pin in `approval-warnings.spec.ts`; the two event pins moved (37 → 39; `STORY_6_22_CLAIM_EVENTS`).
  Mutation checks, each RED then restored: the evaluator's sticky branch; the directory's and the frozen list's sticky legs;
  OP10's guard; `readClosedMemberAliveBulk`'s holder leg; the row before the closure keys; the finding's own intake key removed.
  Whole domain suite on the story DB: 7567 passed / 484 files.
  ⚠ **Recorded deviations from the story text** (each the smallest true reading; none changes behaviour the ACs ask for):
  (1) AC2 says `git diff` shows `isDeathReportStanding`'s body unchanged — sharing the leaf's SQL with
  `listStandingDeathReports` (N3: ⛔ a second copy) means the WHERE moved, VERBATIM, into one private fragment both call; the
  predicate is byte-identical and the fence's count for the file stays 1. (2) `listStandingDeathReports` is bounded by a fixed
  `STANDING_DEATH_REPORTS_LIMIT = 20`, ⛔ `clampLimit` — the leaf may import only `drizzle-orm`, `db`, `ids` (the fence's TR1).
  (3) DL13 puts the sticky type into `OVERLAY_EVENT_TYPES`; it is in the evaluator's read list only — the set-based folds keep a
  freeze/unfreeze IN-list (`FREEZE_FOLD_EVENT_TYPES`), so a guilty annotation can never become a stream's "latest" event and
  silently drop a freeze; both SQL readers OR `stickyFrozenMemberSql` in. (4) OP10's guard spells the two fraud triggers locally
  (`OP10_EXCLUDED_CLOSE_TRIGGERS`) — importing `events.ts` there is a runtime init cycle; a test pins equality. (5) The fraud
  `claim.closed` payload carries `finding_id` (the replay reads it). (6) AC6's "remove the finding's intake key ⇒ RED": DL12's
  inner writer ALSO takes the key (after the row), so a plain race stays green; the ORDER is pinned instead by a NOWAIT probe —
  while the finding waits on a key it holds ⛔ the claim row — and that mutation goes RED (AC5's row-before-key mutation too).
  (7) AC6's second-intake race runs at the domain level (`tryConverge`); its HTTP twin is Task 4's.
- **Task 3 (AC10) — 2026-11-01.** `icp.ts` — `overrideIntakeAttempt` under the intake lock refuses a `closed` against-claim
  (`IntakeOverrideAgainstClosedClaimError`) and, when ⛔ report stands, runs `resolveClaimIntakeDoor` (the `tryConverge` (1b)
  shape); `convergeIntakeAttempt` re-reads the candidate under the lock (`IntakeMergeTargetNotCandidateError`); BOTH
  DELIBERATE doc blocks rewritten. `claims.convergence.handlers.ts` — `confirmMerge` maps the re-check to 409
  `convergence.invalid_candidate`; `overrideConvergence`'s catch adds `translateClaimIntakeRefused(err, { withReason: true })`
  (409 `claim.intake_refused`) and 409 `convergence.against_claim_closed`. Tests: `fraud-convergence-door.spec.ts` 5 (incl. DL9
  (f)'s residual pinned); the existing convergence / override specs green (domain 87, API 66). The HTTP 409 legs are Task 4's.
- **Task 4 (keys, contracts, API — AC3, AC4, AC10's HTTP 409, AC12, AC13's API legs) — 2026-11-01.** Catalog 57 → 58, keys
  75 → 77 (`claim.flag_fraud` → `helpline_operator`; `claim.record_fraud_finding` → `district_admin`; both derived by
  `super_admin`), pins + exact `holdersOf` sets. Contracts `claims/fraud-investigation.ts` (`FRAUD_FINDING_STEP_UP_CONTEXT`, the
  requests / responses, a lockstep test with the domain tuples); `closed_member_alive` on the three `.strict()` DTOs (fixtures
  moved). Routes + handlers `claims.fraud-investigation.{routes,handlers}.ts` (+ `fraud-investigation-crypto.ts`), registered;
  the five audit types (+ the sink test's dotted list); the three G9 handlers read `closed_member_alive` in the SAME savepoint
  as OP10's read; the human-actor gate's COVERAGE_SET + the floor 16 → 19 (the set's LIVE length — two earlier enrolments had
  left the floor behind). Tests: `apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts` 11 (the flag + list incl.
  `denied` / `settled`, 403s, 400 + `_rejected` audit; the Q7 HTTP twin — DA approval 201 + the cycle-freeze vote; the finding's
  step-up, `not_flagged`, `finder_is_flagger` for one person with both roles AND for a Super Admin, the no-posting 403, the
  release proven on the erasure route (`rtbf.death_reported` → `rtbf.invalid_state`) + the overlay OFF + `closed_member_alive`
  on the helpline read; the `approved` + second-standing-claim leg; the console's uniform withholding + the audited decrypt; the
  work-list's district scope; the override's 409 `convergence.against_claim_closed`); ⛔ note in any audit context.
  `contracts` 1696 / `forced-pagination` (the work-list's `limit` bounded) / OpenAPI determinism / PII scrape green; whole API
  suite on the story DB 2677 / 2678 before the `limit` fix, then the failing spec green.
  ⚠ **Recorded deviations / not built** — (8) DL7 names `ReadableNote`; its `withheld` variant requires a 6.27b reason
  (`own_visit` / `check_failed`) that would MISLABEL a missing key, so the console note is `FraudInvestigationNote` —
  `ReadableErasable` + a reason-less `withheld`. (9) AC4's per-lock HTTP legs (re-declare with step-up, withdrawal, a Life
  Events write) are proven through ONE real lock route (erasure) + the leaf they all share (6.38 — one predicate); ⛔ each route
  re-driven. (10) AC4's `relationship: 'other'` leg is ⛔ built: the leaf reads ⛔ nominee row (structurally unaffected), so the test
  would be vacuous. (11) AC6's second-intake race runs at the domain level only — ⛔ HTTP twin. (12) The helpline per-member list
  writes ⛔ audit line (DL14 names five types; the 6.21b list's `claims_read` precedent is ⛔ copied). ⭐ **AMENDED by the code review of
  2026-11-02 (RB9): it now writes `admin_claim.fraud_claims_read`.** (13) AC8's *"200 with the SAME event version"* is proven at the DOMAIN (a replay
  returns the same `eventVersion`, `replayed: true`); neither HTTP response carries an `event_version` (6.21a's does) — the wire says
  `replayed: true` (code review RB12 (d)).
- **Task 5 (AC11) — 2026-11-01.** `peer-mesh-read.ts` — `standingReportNamesSql` (the leaf's predicate as a fragment, alias
  `f`), swapped into `peerMeshEligibleMemberSql`'s one line; `peer-mesh-request.ts` imports it for `reported_deceased`; the
  fence's `gateSqlCopies` `peer-mesh-read.ts: 2`; `known-people.ts`'s accepted-cost comment names the residual (comment-only).
  Test `fraud-peer-mesh.spec.ts` (control first; released ⇒ askable + `eligible`; guilty / un-found ⇒ `peer_reported_deceased`;
  `knownPeopleCallerSql` still false for the released member — the residual pinned). Existing peer-mesh / known-people /
  member-links specs green (domain 261, jobs 251); fence 26.
- **Task 6 (AC13) — 2026-11-01.** Admin: client + hooks (five calls); `FraudInvestigationPanel.tsx` in the verifier console
  (behind a disclosure — opening is the audited read, closing forgets it; the flag read-only; the finding form with ⛔
  pre-selected radios, note required, refusals in words, the shared `StepUpPanel` holding the write and re-running it with the
  SAME ids, the other standing claims after a finding, an always-mounted `role="status"`); `HelplineFraudFlag.tsx` mounted in
  `HelplineClaimPage` (every claim naming the member, flag with a required note, `step_id` minted when the form opens); the
  `/p/$pariwarId/fraud-investigations` work-list route + nav link; `closedClaimStateLabel` gains `closedMemberAlive` (WINS) at
  all four call sites; copy in each module's `i18n-en.ts`. Tests `apps/admin/tests/fraud-investigation.test.tsx` 9; the admin
  suite 1741 green before them; `pnpm microcopy:check` green; admin `tsc` + eslint clean.
  ⚠ The FIRST probe found ⛔ browser (*"Browser extension is not connected"*, ⛔ browser listed) and the pass was recorded
  un-attested; BigDev then connected the browser (*"browser connected now"*) and the probe loaded. ✅ **The real-browser pass
  RAN, 2026-11-01** (the [[project_admin_browser_pass_launcher]] recipe — a throwaway launcher on the story DB :5451, admin Vite
  :3001, a cookie helper; the launcher file deleted afterwards): the helpline operator found the member (Member ID), confirmed the read-back, met the empty-note refusal in words, flagged the claim (the row → *"Flagged — waiting for a District Admin"*, the status line announced); a VERIFIER opened the console's investigation — the flag shown, its note WITHHELD, ⛔ form; the District Admin opened the work-list (the claim listed), opened it into the console, read the operator's note, chose innocent + video call + a note, met the step-up HOLD (*"Waiting to save: Record the finding"*), sent and verified the code — the held write re-ran: the innocent step shown, *"The finding is recorded and the claim is closed"*, *"No other claim keeps this member's death recorded"*; the DB held EXACTLY one finding row, one found step and `claim.closed` (`fraud_finding_innocent`) — ⛔ double write; the operator's helpline then read the claim *"Closed — A finding is recorded"*. ⚠ ⛔ reached in the browser: the *"Closed — the member was found alive"* LABEL (it renders only in the multi-claim pickers / refusal lists, which a one-claim member does not populate) — proven by the component test and the API leg (`closed_member_alive: true`). The work-list view is ⛔ component-rendered (it
  needs the router); its scope is proven over HTTP. ⚠ *[Corrected 2026-11-02, code review round 2 R2-15 (a): RC8 later rendered the
  view with the router stubbed (`fraud-investigation-surfaces.test.tsx`); this line was true at Task 6 only.]*
- **Task 7 (close — AC14, DL15, DL16, G17) — 2026-11-01 / 02.** `anonymize.ts` scrubs every step's note to the sentinel (keyed on
  the reported member), the three pins moved 31 → 32 / 28 → 29 / 27 → 28, the live leg as `twt_app`
  (`fraud-investigation-rtbf.spec.ts`); DL16's dated lines written under each item in `deferred-work.md` (the three labels only;
  EA10 per BigDev's *"Closed, test pins it"*) and the PM1 pointer line in row `6-22`'s block; G17's stale "no producer until 6-22"
  comments re-worded (`events.ts`, `peer-mesh-read.ts`, the registry, four test comments); ⛔ `**/` in any edited file.
  **`ci:local` — 37 / 37 GREEN** on a FRESH container (`twt-622-pg`, DB `twt_dev`, :5451) on the tree of this commit. The FIRST
  run (also fresh) was 34 / 37: `domain-invariants` (DL5's list read clamped into a local, ⛔ inline — the accessor gate wants
  `.limit(clampLimit(…))`) and `lint` (two unused `_` destructures in this story's tests) — both fixed; and `test (unit)` (four
  admin specs — `ground-inspection-page`, `helpline-claim-page`) that passed 53 / 53 run alone and green in the second full run
  (the known unit=4 oversubscription — [[project_ci_local_concurrency_oversubscription]]).
- **Summary.** The investigation is built to its finding: the helpline flags, a DIFFERENT person (the District Admin) finds,
  with a note, a proof of life and a step-up; innocent releases every death lock and closes the claim through the closure core;
  guilty closes it, keeps the locks and the frozen account (a declared narrowing — Panel Q1); the override door and the merge
  re-check; peer-mesh follows the release; the staff surfaces; erasure. Governance first (`-438` alone), the routing note WRITTEN
  ⛔ sent, rows `6-22b` / `6-22c` / `6-22d`, roster Row 47 (leg (e) met by the browser pass). Deviations (1)–(12) above. ⚠ *[Corrected 2026-11-02, code review round 2 R2-15 (c): there are THIRTEEN — chunk B's RB12 (d) added deviation (13), the replay's event version absent on the wire.]*

### File List

- `.decision-log.md` (Decision `2026-11-01-438`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-01-6-22-fraud-register-first-half.md` (new)
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `docs/launch-gate-inventory/inventory-roster.md` (Row 47)
- `_bmad-output/implementation-artifacts/6-22-fraud-register-blacklist-instrument-and-identifier-set.md`
- `packages/domain/migrations/0196_claim-nominee-findings-guilty-kind.sql` (new)
- `packages/domain/migrations/0197_claim-fraud-investigation-steps.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/claim_nominee_findings.ts`
- `packages/domain/src/schema/claim_fraud_investigation_steps.ts` (new)
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/policies/claim-fraud-investigation-rls.ts` (new)
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/encryption/field-classes.ts`
- `packages/domain/src/encryption/index.ts`
- `apps/api/src/context.ts`
- `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts`
- `apps/jobs/tests/claim-suspicion-staff-email-no-decision.test.ts`
- `packages/domain/tests/integration/rls/claim-fraud-investigation-policy-regression.spec.ts` (new)
- `packages/domain/src/claim/nominee-lock.ts`
- `packages/domain/src/claim/death-report.ts`
- `packages/domain/src/claim/events.ts`
- `packages/domain/src/claim/state.ts`
- `packages/domain/src/claim/errors.ts`
- `packages/domain/src/claim/suspicion-refusal-persist.ts`
- `packages/domain/src/claim/one-payment-per-death.ts`
- `packages/domain/src/claim/read.ts`
- `packages/domain/src/claim/fraud-investigation-persist.ts` (new)
- `packages/domain/src/claim/index.ts`
- `packages/domain/src/member/overlay.ts`
- `packages/domain/src/member/directory-read.ts`
- `packages/events/src/registry.ts`
- `packages/domain/tests/integration/claim/fraud-investigation.spec.ts` (new)
- `packages/domain/tests/integration/claim/fraud-investigation-concurrency.spec.ts` (new)
- `packages/domain/tests/integration/member/overlay-three-readers.spec.ts` (new)
- `packages/domain/tests/claim/fraud-closed-payload.test.ts` (new)
- `packages/domain/tests/member/overlay.test.ts`
- `packages/domain/tests/claim/dpdpa-consent-events.test.ts`
- `packages/domain/tests/claim/nominee-name-check-events.test.ts`
- `packages/domain/tests/integration/claim/approval-warnings.spec.ts`
- `packages/domain/src/claim/icp.ts`
- `apps/api/src/modules/claims/claims.convergence.handlers.ts`
- `packages/domain/tests/integration/claim/fraud-convergence-door.spec.ts` (new)
- `packages/domain/src/rbac/permissions.ts`
- `packages/domain/src/rbac/roles.ts`
- `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/tests/rbac/roles.test.ts`
- `packages/contracts/src/claims/fraud-investigation.ts` (new)
- `packages/contracts/src/claims/index.ts`
- `packages/contracts/src/claims/nominee-declaration.ts`
- `packages/contracts/src/claims/death-certificate.ts`
- `packages/contracts/src/claims/appeal.ts`
- `packages/contracts/tests/claims-fraud-investigation.test.ts` (new)
- `packages/contracts/tests/claims-suspicion-refusal.test.ts`
- `apps/api/src/modules/claims/claims.fraud-investigation.routes.ts` (new)
- `apps/api/src/modules/claims/claims.fraud-investigation.handlers.ts` (new)
- `apps/api/src/modules/claims/fraud-investigation-crypto.ts` (new)
- `apps/api/src/modules/claims/index.ts`
- `apps/api/src/modules/claims/claims.death-certificate.handlers.ts`
- `apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts`
- `apps/api/src/modules/claims/claims.appeal.handlers.ts`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/tests/unit/audit-log-sink.test.ts`
- `apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts` (new)
- `scripts/claim-adjudication-human-actor-invariant/check.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/integration/claim/fraud-investigation-rtbf.spec.ts` (new)
- `apps/api/tests/integration/_death-report-fixture.ts`
- `apps/api/tests/integration/nominee/nominee-lock.spec.ts`
- `packages/domain/tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts`
- `packages/domain/tests/integration/claim/nominee-determination.spec.ts`
- `docs/launch-gate-inventory/inventory-roster.md` (Row 47 leg (e))
- `packages/domain/src/claim/peer-mesh-read.ts`
- `packages/domain/src/claim/peer-mesh-request.ts`
- `packages/domain/src/member/known-people.ts`
- `apps/api/tests/unit/erasure-and-death-report-fence.test.ts`
- `packages/domain/tests/integration/claim/fraud-peer-mesh.spec.ts` (new)
- `apps/admin/src/api/client.ts`
- `apps/admin/src/api/hooks.ts`
- `apps/admin/src/modules/claim-verification/FraudInvestigationPanel.tsx` (new)
- `apps/admin/src/modules/claim-verification/i18n-en.ts`
- `apps/admin/src/modules/helpline-claims/HelplineFraudFlag.tsx` (new)
- `apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx`
- `apps/admin/src/modules/helpline-claims/i18n-en.ts`
- `apps/admin/src/modules/helpline-claims/HelplineAppeal.tsx`
- `apps/admin/src/modules/helpline-claims/HelplineCertificateReplacement.tsx`
- `apps/admin/src/modules/helpline-claims/HelplineClaimContact.tsx`
- `apps/admin/src/routes/NomineeRefusalsRoute.tsx`
- `apps/admin/src/routes/VerifierConsoleRoute.tsx`
- `apps/admin/src/routes/FraudInvestigationsRoute.tsx` (new)
- `apps/admin/src/routes/RootLayout.tsx`
- `apps/admin/src/routes/login-next.ts`
- `apps/admin/src/router.tsx`
- `apps/admin/tests/fraud-investigation.test.tsx` (new)
- `apps/admin/tests/suspicion-refusal-helpline-appeal.test.tsx`
- `apps/admin/tests/helpline-certificate-replacement.test.tsx`
- `apps/admin/tests/helpline-claim-contact.test.tsx`
- `apps/admin/tests/withheld-note.test.tsx`
- ⭐ Code review chunk A (2026-11-02):
- `packages/domain/migrations/0198_claim-fraud-step-ties-its-finding.sql` (new — RA5)
- `packages/domain/migrations/0119_nominee-declaration-history.sql` (a comment-only edit — RA15)
- `packages/domain/tests/integration/claim/release-rule-agreement.spec.ts` (new — RA2)
- `packages/domain/tests/integration/claim/fraud-investigation-live-processes.spec.ts` (new — RA3)
- `packages/domain/tests/integration/claim/fraud-investigation-reads.spec.ts` (new — RA4, RA8)
- ⭐ Code review chunk B (2026-11-02):
- `apps/api/tests/unit/fraud-investigation-error-codes.test.ts` (new — RB6, RB11)
- `apps/api/tests/unit/convergence-handlers-fraud-refusals.test.ts` (new — RB5)
- (changed by the chunk B review: `apps/api/src/modules/claims/claims.fraud-investigation.handlers.ts` (RB4, RB7, RB9, RB11, RB6 export), `apps/api/src/audit/audit-sink.ts` + `apps/api/tests/unit/audit-log-sink.test.ts` (RB9), `apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts` (RB1-RB4, RB7, RB9, RB11), `apps/api/tests/integration/nominee/nominee-lock.spec.ts` (RB12 comment), `apps/jobs/tests/claim-suspicion-{notice,staff-email}-no-decision.test.ts` (RB10), `packages/contracts/src/claims/fraud-investigation.ts` + `packages/contracts/tests/claims-fraud-investigation.test.ts` (RB6, RB12))
- ⭐ Code review chunk C (2026-11-02):
- `apps/admin/src/api/new-uuid.ts` (new — RC6)
- `apps/admin/tests/fraud-investigation-surfaces.test.tsx` (new — RC8, RC3, RC6, RC10)
- (changed by the chunk C review: `apps/admin/src/modules/claim-verification/FraudInvestigationPanel.tsx` + `i18n-en.ts` (RC1, RC2, RC4-RC7), `apps/admin/src/modules/helpline-claims/HelplineFraudFlag.tsx` + `i18n-en.ts` (RC2, RC5-RC7, RC12), `apps/admin/src/routes/FraudInvestigationsRoute.tsx` (RC5, RC7), `apps/admin/src/routes/login-next.ts` + `LoginPage.tsx` (RC10), `apps/admin/src/api/hooks.ts` (RC3), `apps/admin/tests/{fraud-investigation,login-return-path,suspicion-refusal-helpline-appeal,helpline-certificate-replacement,helpline-claim-contact,withheld-note}.test.tsx` (RC9, RC10), `docs/launch-gate-inventory/inventory-roster.md` (RC11))
- (changed again by the review: `packages/domain/migrations/meta/_journal.json`, `src/claim/{death-report,events,fraud-investigation-persist,peer-mesh-read,read}.ts`, `src/rbac/roles.ts`, `src/schema/{claim_fraud_investigation_steps,claim_nominee_findings}.ts`, the specs `fraud-investigation`, `fraud-investigation-concurrency`, `fraud-peer-mesh`, `claim-fraud-investigation-policy-regression`, `apps/api/tests/unit/erasure-and-death-report-fence.test.ts` (a header comment), the routing note and `deferred-work.md`)
- ⭐ Patch-diff review (2026-11-02): (changed again) `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-01-6-22-fraud-register-first-half.md` (PD1, still unsent), `docs/launch-gate-inventory/inventory-roster.md` (PD2-PD4), `packages/contracts/src/claims/fraud-investigation.ts`, `packages/domain/src/claim/{errors,events}.ts` (PD5), `apps/admin/src/routes/login-next.ts`, `apps/admin/src/api/hooks.ts` (PD5), `apps/admin/src/modules/helpline-claims/HelplineFraudFlag.tsx` + `i18n-en.ts` (PD6, PD7), `apps/admin/tests/fraud-investigation.test.tsx` (PD6, PD7, PD9, PD10, PD12, PD13), `apps/admin/tests/fraud-investigation-surfaces.test.tsx` (PD12), `packages/domain/tests/integration/claim/fraud-investigation.spec.ts` (PD8), `packages/domain/tests/integration/rls/claim-fraud-investigation-policy-regression.spec.ts` (PD11, PD12), `apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts` (PD13), `apps/jobs/tests/claim-suspicion-{notice,staff-email}-no-decision.test.ts` (PD13 comments); `deferred-work.md` (RD5, RD6).

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-01 | 1.0 | Created by `bmad-create-story 6.22` in its own worktree, traced at `beae5116`, pinned at `origin/main` `3d6b46c5`: the counsel-free first half of the fraud register; DL0–DL18 PROPOSED; PQ1–PQ4 + TL1–TL4; AC1–AC16. Row `backlog → ready-for-dev`; ledger `2026-11-01b`. |
| 2026-11-01 | 1.1 | Validated by `bmad-create-story validate 6.22` (five read-only verifiers, each critical re-read by hand at `3d6b46c5`); BigDev: split → new row `6-22d`, apply all. The refer / impose / lift chain, termination and the member ban move to `6-22d` (as designed they barred no one — sign-up is unreachable for an existing mobile — went beyond `-240` cl. 3, and let `super_admin` impose and lift, `-240` cl. 5's named collapse). The close now runs through the shipped closure core (its lock order and `endLiveProcesses`) with discriminated `fraud_finding_*` triggers (OP10 joined on `held_by`); a finding requires the member confirmed alive; the guilty arm is a DECLARED narrowing (PQ1, go-live); peer-mesh-only release (`namedByClaimSql` gates nominee links and "People who know me"); a helpline read for the flag; the override door built; the vacuous erasure race replaced by the intake race; PQ2 narrowed to the nominee; PQ3–PQ6 added for `6-22d`; numbers, pins, file homes and closure words corrected. Ledger `2026-11-01d`. |
| 2026-11-01 | 1.2 | BigDev's four checks (*"check these"*), each verified in the repo and the decision log, then fixed. (1) A flagged claim could be approved and paid before a finding — the "no claim is ever paid" promise is withdrawn; what an open flag does to approval is now PQ7 (the Panel's own rule for a neighbour's *"they have not died"* is a WARNING, `-263` FQ10; built C, a go-live condition). (2) No notice / no appeal on a found-alive close was a TOLD line — it is now PQ8 (`-291` Q2 B texts a claimant whose claim is closed under her; a suspicion refusal is appealable 90 days), with re-filing added (a released member can be re-locked by a new filing). (3) The District Admin could flag AND find — the flag is now the helpline operator's alone (the ruled two-actor chain) plus a `finder_is_flagger` 409 for `super_admin`. (4) A guilty close unfroze the account (public directory "Active") while the death lock stood — the guilty trigger no longer unfreezes, in all three overlay readers (N7, TR15), one swap point with PQ1. |
| 2026-11-01 | 1.3 | Re-validated by `bmad-create-story validate 6.22` at `origin/main` `91ea2c81` (Stories 11b.5a + 12.2 landed; the branch REBASED from `3d6b46c5`, ledger-only conflict) — five read-only verifiers (governance + records; claim / closure substrate; overlay / peer-mesh / erasure; RBAC / routes / surfaces; the footgun catalogue), each critical re-read by hand; BigDev: "all". The guilty freeze is now STICKY on `claim.member_found_guilty` (excluding the close missed a `denied_no_appeal` stream and an already-closed claim; the pure evaluator never sees a payload) and `-147` cl. 3's standing fence is recorded as FIRING; N5 / N7 retitled to what is true (an `approved` claim found innocent is not stopped; the leaf and the overlay already differ for terminal claims). G8 was false — DL5 now lists EVERY state in the shipped `listLiveClaimsForDeceasedMember` shape; the flag is PARIWAR-dimension (the district resolver reads a claim id); new reads for the console panel (uniform withholding, audited decrypt) and a District Admin work-list; `closed_member_alive` computed from the steps table in the three handlers, incl. a claim held by a fraud-closed claim (OP10's reachable direction). DL2's CHECK keeps `IS NOT NULL`; the other-claims list shares the leaf's fragment (`listStandingDeathReports`); the closer's input and trigger set are discriminated; the override door's refusals are mapped (no 500); the whole migration hand-authored (⛔ `db:generate`). Governance: `-304`'s line is a reading, not a ruling; `-210` (not `-195`) keeps keys and the closure vocabulary out of the delegation; proof of life is PQ9 (not told); PQ8 cites `-318` Q3 A and who a text would reach (the filer) — its suggested (a) moves to B; PQ5 cites `-422` Q1 A; every option costed; DL16 uses only the three labels, and the 40P01 / correction-race items close as unreachable. Also: fence mechanics (count map, alias `f`), lock-key case, replay-first idempotence, realistic seeding (no `forceClaimState`; KYC / identity rows; the GUC), the microcopy gate (TR16), audits incl. `_rejected`, numbers re-read (`-438` / `0196` / v58 / ledger `y` next). Ledger `2026-11-01y`. |
| 2026-11-01 | 1.4 | Task 0.2, in part — BigDev: *"DL1-DL16 accepted as written."* Recorded under Task 0.2; the Build-decisions heading updated. Open: DL17 (scope fence) and DL16's 6.23b EA10 choice. No decision entry, no code. Ledger `2026-11-01z`. |
| 2026-11-01 | 1.5 | Task 0.2 complete — BigDev: DL17 accepted as written; DL16's 6.23b EA10 row: re-trace at Task 0.1 (iv), then build here if a small anchor fix, else an explicit deferral — BigDev confirms before Task 0.4. Ledger `2026-11-01aa`. |
| 2026-11-01 | 1.6 | `bmad-dev-story 6.22` — Task 0.1 (traces at `91ea2c81`; `origin/main` unmoved; numbers unchanged) and Task 0.3 (the routing note WRITTEN, ⛔ sent) complete. Task 0.1 (iv): 6.23b EA10 is UNREACHABLE by construction (the anchor only moves later — `-279` A7) — ⛔ fix to build; awaits BigDev's confirmation of its closure before Task 0.4. No decision entry, no code. Ledger `2026-11-01ab`. |
| 2026-11-01 | 1.7 | Task 0 complete — BigDev on EA10: *"Closed, test pins it"* (Task 2.4 gains the pin). Decision `2026-11-01-438` committed ALONE (`8ce9f87b`). Records: rows `6-22b` / `6-22c` / `6-22d` minted (backlog, DL0 verbatim); `deferred-work.md` Task 0.5 section; roster Row 47 `fraud-register-finding-live` (legs (a)–(h)); `epics.md` Story 6.22. Row `6-22` → in-progress; Status → in-progress. No code. Ledger `2026-11-01ac`. |
| 2026-11-02 | 1.8 | `bmad-dev-story 6.22` — Tasks 1–7 BUILT: the records (0196, 0197), the writers (flag, finding, closure, sticky freeze, OP10, reads), the override door, keys v58 + API, peer-mesh, the staff surfaces, erasure; the real-browser pass RAN (BigDev connected the browser — roster Row 47 (e) met); DL16 closures and G17 re-wording written; `ci:local` 37 / 37 on a fresh container. Twelve recorded deviations (Completion Notes). Status → review; row `6-22` → review. Ledger `2026-11-02a`. |
| 2026-11-02 | 1.9 | `bmad-code-review 6.22`, chunk A (the domain / DB layer) — three layers in parallel; 0 decision-needed, 15 patch, 1 defer, 15 dismissed; every finding re-checked against the tree. RA1-RA15 APPLIED the same day (RA8 in part; RA1 leaves decision `-438` untouched): migration 0198, three new specs, a corrected unsent routing note, the release-rule agreement spec. Domain suite 490 files / 7605 passed on the final tree. UNCOMMITTED; `ci:local` and a patch-diff review not run; chunks B and C not yet reviewed. |
| 2026-11-02 | 1.10 | `bmad-code-review 6.22`, chunk B (the API / contracts / gate-script layer) — three layers in parallel; 0 decision-needed, 12 patch, 3 defer, 15 dismissed; every finding re-checked against the tree. RB1-RB12 dealt with the same day (RB8 WITHDRAWN on verification — the audit id joins nothing): the HTTP denial / guilty / replay / display-name / convergence tests, the error-code pin, `no-store`, a sixth audit type, the jobs fences, a visible-text rule that reuses the repo's blank rule. Unit 804, contracts 1,697, route spec 28; integration 807 of 808 (a reproducible batch-load lock timeout in an unrelated spec). UNCOMMITTED; `ci:local` and a patch-diff review not run; chunk C not yet reviewed. |
| 2026-11-02 | 1.11 | `bmad-code-review 6.22`, chunk C (the admin UI and the roster text) — the LAST chunk; three layers in parallel; 0 decision-needed, 12 patch, 0 defer, 11 dismissed; every finding re-checked against the tree. RC1-RC12 applied the same day: honest finder wording (an approved claim is not closed; a guilty result keeps the member locked), error copy, refresh on a stale refusal, a guarded UUID helper, focus and announcements, the work-list and the four label sites under test, a live sign-in return path, and Row 47 corrected (leg (b) verbatim, leg (e) bounded to `30226c15`, leg (g) as carriage, the admin step-up stub named). Admin suite 96 files / 1,808 tests; 21 mutations, 20 red and one honest equivalent. UNCOMMITTED; a browser re-run, `ci:local` and a patch-diff review across A+B+C are owed. |
| 2026-11-02 | 1.12 | `bmad-code-review 6.22`, the independent PATCH-DIFF review of chunks A + B + C together — three layers in parallel (a production-diff Blind Hunter, an Edge Case Hunter looking for what the fixes broke, a test-and-claims Auditor); 0 decision-needed, 13 patch, 2 defer, 15 dismissed; every finding re-checked against the tree. PD1-PD13 APPLIED the same day: an unsent routing note that agrees with itself (approved or paid), Row 47 without a re-reading of `-438` and without a circular leg, five stale comments, the helpline flag's `step_conflict` words and keyboard focus, and test-strength fixes (assertions that could not fail removed, the result copy and cache refreshes pinned exactly, test DDL moved to a `pg_temp` clone) with the overstated records corrected. RD5 (widen `finding_kind` with `step`) and RD6 (screen-reader pass) deferred. Admin 96 files / 1,819; domain 490 files / 7,605; API unit 76 / 804. UNCOMMITTED; `ci:local` on a fresh container, a real-browser re-run and the commits still owed. Status stays `review`. |
| 2026-11-02 | 1.13 | Verification after the review commits (`9693d402`, tree clean): `ci:local` 37 / 37 GREEN on the first run on a fresh container; the real-browser pass RAN (helpline flag, router-rendered work-list, step-up finding — innocent, innocent on an APPROVED claim, and for the first time GUILTY — a verifier's withheld view, the found-alive picker label, a signed-out sign-in `next`), the DB read after each write. Roster Row 47 (e) carries a dated re-run line with its limits; RD7 records five small rough edges (none fixed). Docs-only change, UNCOMMITTED. Status stays `review`. |
| 2026-11-02 | 1.14 | `bmad-code-review 6.22`, ROUND 2 over the FULL diff (BigDev: *"full diff"*) — four layers in parallel (Blind Hunter, Edge Case Hunter, Acceptance Auditor with checklist families 1–13, Test-and-claims Auditor); 36 raw ⇒ 1 decision-needed, 15 patch, 1 defer (RD8), 15 dismissed; every finding re-checked against the tree. R2-Q1 → BigDev *"1"* ⇒ Decision `2026-11-02-439` (author-commit, committed ALONE `6bf11501`; supersedes `-438` item 2 and its title IN PART). R2-1–R2-15 applied (BigDev *"1"*): the replay key (actor + finding id), `is_flagger` on the work-list, the lost-response check (form locked), 403 copy, helpline form hygiene, role-based tests, the type pin on the function, the DL9 (f) residual widened, records corrected in place. Patch-diff audit PT1–PT9 applied or recorded; RD9 (the appeal list's closed bits false by construction) deferred. Status stays `review`; ⛔ ledger line (records only). |
| 2026-11-02 | 1.15 | LANDED on `main` by fast-forward — PR #321 MERGED 2026-11-02T09:56:13Z, `91ea2c81..fc559b9b`, SHAs unchanged; GitHub CI 37 / 37 on `fc559b9b`; the branch push's pre-push `ci:local` 37 / 37 on a fresh container. Status → done; row `6-22` → done. Ledger `2026-11-02b`. ⚠ Merge ≠ go-live (roster Row 47). |
