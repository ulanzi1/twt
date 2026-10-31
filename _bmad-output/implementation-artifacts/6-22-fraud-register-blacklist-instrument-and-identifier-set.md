---
baseline_commit: 3d6b46c5
---

<!--
PINNED: `3d6b46c5` = `origin/main` (`git fetch origin` 2026-11-01 — Story 12.1 landed, PR #318). The traces ran at `beae5116`; the
branch was fast-forwarded to `3d6b46c5` before the first commit, and `git diff --name-only beae5116 3d6b46c5 -- apps packages` touches ⛔
cited function (12.1's marketplace / helpdesk / `events_log` files; `policies/index.ts` and `ids/index.ts` only gain entries). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/6-22-fraud-register-blacklist-instrument-and-identifier-set`, branch
`story/6-22-fraud-register-blacklist-instrument-and-identifier-set` (upstream UNSET — ⛔ it tracks `origin/main`; push with an explicit
refspec) ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — the main checkout was ⛔ switched).
Every `apps/` / `packages/` claim below was traced at `beae5116` on 2026-10-31 / 11-01 by three read-only traces (governance + counsel; the
code substrate; the 6.20 / 6.38 story files) and the load-bearing ones re-read by hand (`recordMemberInnocenceFinding`,
`isDeathReportStanding`, `CLAIM_NOT_CLOSABLE_STATES`, `CLAIM_CLOSED_TRIGGERS`, `MODERATION_REASON_CODES`, the `trustee_panel` bundle's
rank-order note). Re-locate by FUNCTION, ⛔ by line number — line numbers rot.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the BEHAVIOUR is
the Panel's and is RULED — `2026-09-21-238` (the release route; blacklisting as a new sanction; two outcomes only), `2026-09-21-240` (what
is kept, how far the ban reaches, who imposes and lifts), `2026-09-28-261` D3 A (the lock is lifted ONLY by the investigation's finding),
`-262` FQ4 (go-live may precede the release). WHAT this story builds first, WHERE the record lives, WHO holds each key and HOW the ban bars
a returning member are the AUTHOR's (DL — BigDev at Task 0.2). Four edges the ruled words do ⛔ decide are the Panel's: PQ1–PQ4 (ONE
NON-BLOCKING note at Task 0.3; each built on the side stated). ⚠ The IDENTIFIER SET (`-238` cl. 6 — PAN and Aadhaar of nominee and
claimant) is COUNSEL-GATED and counsel has ⛔ been asked (G15) — this story ⛔ builds it (DL0).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or
the row key.

NUMBERS: ⛔ claimed by this file. "Anywhere" means EVERY branch and worktree (`git for-each-ref refs/heads refs/remotes` + each worktree's
dirty tree), ⛔ `main` alone. At 2026-11-01: `main` holds decision `-430`, ledger `2026-11-01a`, migration `0193_marketplace-modules`
(journal idx 193), permission catalog v56 / 74 keys / 13 bundles, `CLAIM_EVENT_TYPES` 37. ⚠ The siblings hold MORE: `story/11b-5a-…`
decisions to `-432`, ledger to `2026-10-31am`, migrations to `0194`; `story/6-39-…` ledger `aj` and a
PROPOSED catalog v57, `CLAIM_EVENT_TYPES` 38 and three migrations "≥ `0194`" (⚠ the SAME next numbers this story needs — expect a rebase
renumber). ⇒ next free at authoring: decision ≥ `-433`, migrations ≥ `0195`, catalog ≥ v57. Task 0.4's decision entry, the migrations,
the catalog bump and the event count are "the next free one" at the commit that takes each — READ LIVE then, across branches.

LETTERS: **G** = found facts (G1–G17); **DL** = build decisions (DL0–DL18 — PROPOSED, BigDev answers at Task 0.2); **PQ** = Panel
questions (PQ1–PQ4 — non-blocking) + **TL** = lines the note TELLS the Panel (TL1–TL4); **TR** = traps (TR1–TR12); **AC1–AC16**.
-->

# Story 6.22: The Fraud Register, First Half — Staff Investigate a Death Claim Filed Against a Living Member; an Innocent Member Is Released at Once, and a Guilty One Is Terminated and Barred From Ever Joining Again

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled on 2026-09-21 that a death claim filed against a member who is **alive**
> must ⛔ lock that member for life: an **investigation** finds the member **innocent** or **guilty** — ⛔ a third outcome (`-238` cl. 1,
> cl. 4). Innocent ⇒ the member is released **immediately**. Guilty ⇒ the member is **terminated and blacklisted** — never to join or
> re-join, **indefinitely**, ⛔ appealable, liftable only by the **Super Admin** (`-238` cl. 2, cl. 5) — through a chain the Panel set:
> a helpline operator or District Admin **flags**, the District Admin **verifies**, the Pariwar Admin **refers**, the **State Trustee
> imposes**, the **Super Admin may lift** (`-240` cl. 5, superseding `-238` cl. 3's last step). Since then THREE shipped stories have
> built locks that wait on that finding and ⛔ thing writes it: 6.20's nominee lock, 6.38's erasure / withdrawal / Life Events locks
> (one leaf predicate, `isDeathReportStanding`), and the peer-mesh anchor (`-339`/`-340`). Today a living member wrongly reported dead
> is frozen out of all of them with ⛔ way out. **This story builds the finding and everything the Panel ruled around it that does ⛔
> wait on counsel**: the flag, the District Admin's finding (innocent ⇒ the existing release writer, hardened, plus the false claim
> CLOSED; guilty ⇒ a new finding kind), the refer → impose → lift chain, the termination through the existing moderation writer, and a
> Trust-wide **ban on the guilty MEMBER** that refuses them at sign-up. ⛔ It does ⛔ build the identifier set (PAN / Aadhaar of nominee
> and claimant — counsel-gated, ⛔ yet asked), bans on non-members, the claim-form collection, the `-240` cl. 1 deletion, or the
> disqualified-nominee payout ladder (DL0 — two new rows).

**What already ships and this story REUSES — rebuild none of it:**
- `claim_nominee_findings` (migration `0119`, `packages/domain/src/schema/claim_nominee_findings.ts`) — `kind` (a text column with a CHECK,
  ⛔ a pgEnum) `member_found_innocent` | `nominee_disqualified`, ONE innocence finding per claim (partial unique index), append-only
  (GRANT SELECT, INSERT), RLS-forced. Its header: *"THE PRODUCER OF THESE ROWS IS ROW `6-22` … ⛔ NOT BUILT."* (G1).
- `recordMemberInnocenceFinding(client, input)` (`packages/domain/src/claim/nominee-lock.ts`) — locks the claim row, inserts the finding,
  emits the identity annotation `claim.nominee_lock_released` (`trigger: 'fraud_register_innocence_finding'`, `finding_id`). ⛔ Production
  caller (G1). ⚠ It carries three deferred defects this story owes (G2).
- `isDeathReportStanding(db, pariwarId, memberId)` (`packages/domain/src/claim/death-report.ts`) — the ONE leaf predicate: a claim names
  the member as deceased and ⛔ `member_found_innocent` finding has released it. Its consumers lift TOGETHER on the finding (G3): the
  nominee lock (`isNomineeDeclarationLocked`), erasure on both routes (`resolveRtbfLegality` → `rtbf.death_reported`), withdrawal
  (`withdrawal.death_reported`), the member's own Life Events (`life_events.death_reported`) and medical (`medical.death_reported`) writes,
  and the intake door's re-arm. ⛔ Change it (PQ1 is built on the unchanged side).
- `lockAndReadDeathReport` / `intakeAdvisoryLockKey` (`claim/death-report-lock.ts`) — the lock order every death-report writer keeps:
  the intake advisory lock FIRST, lower-cased key (6.38 R2 P1).
- `claim.closed` (`packages/domain/src/claim/state.ts`; trigger vocabulary `CLAIM_CLOSED_TRIGGERS`, `claim/events.ts`) — a lifecycle
  transition from every CLOSABLE state (`isClaimClosable` — ⛔ `settled` / `approved` / `closed`); `ACCOUNT_UNFREEZE_EVENT_TYPES`
  (`member/overlay.ts`) already lists it, so closing unfreezes the account overlay (G5).
- `moderateMember` (`packages/domain/src/member/moderation/write.ts`) — the ONE moderation writer (suspend / terminate / restore; the
  `none → terminate` illegality; the 7-day dwell with its recorded immediate-termination exception; the 10.20 escalation presence
  backstop; `rejoin_permitted_at`); the terminate HANDLER's session revocation and notice enqueue
  (`apps/api/src/modules/member-moderation/handlers.ts`) (G8).
- `resolveMembersByMobile` (`apps/api/src/modules/auth/member/member-auth.repo.ts`) + the two re-join locks in
  `apps/api/src/modules/auth/member/signup.handlers.ts` — the cross-tenant, service-pool lookup on `member_identities.mobile_blind_index`
  that a Trust-wide ban extends (G9). Erasure keeps `mobile_blind_index` by design (`member/anonymize.ts`).
- The `trustee_panel` role (`packages/domain/src/rbac/roles.ts`, Story 10.18 — pariwar ceiling, the ONLY holder of
  `member.restore_terminated`) — the role this story maps the ruled "State Trustee" onto (DL6, TL1).
- The verifier console (`apps/admin/src/routes/VerifierConsoleRoute.tsx`, `modules/claim-verification/*`) and the helpline claims
  module (`apps/admin/src/modules/helpline-claims`) — the two surfaces the flag and the finding sit on; `DeathCertificateReviewControl.tsx`
  is the closest template for a staff "record a finding with a note" form.
- The death-report race fixtures `sendWhileHolding` / `raceFirstIntake` (`apps/api/tests/integration/_death-report-fixture.ts`) — the
  house tool that proves a lock by a test that FAILS without it (6.38 R2 P2/P3).

## Story

As **a member who has been wrongly reported dead, the District Admin who looks into such a report, and the Trust that must never pay out
on — or re-admit — someone who faked a death**,
I want **a recorded investigation that ends in one of the two findings the Panel ruled: innocent, which releases every lock on the member
at once and closes the false claim; or guilty, which — once the Pariwar Admin refers it and the Trustee Panel imposes it — terminates the
member and bars them from ever joining the Trust again, until the Super Admin lifts it**,
so that **a living member is ⛔ frozen out of their own record for ever by someone else's lie, and a member who took part in one ⛔ comes
back**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-09-21-238` cl. 1 | *"A claim filed against a member who is **alive** does ⛔ not lock that member's declaration for life. On investigation finding the member **innocent**, the declaration **unlocks immediately**."* | Trustee-ratified (DR + KB) |
| `-238` cl. 2 | *"BLACKLISTING IS A NEW SANCTION, ABOVE TERMINATION. It means **never joining or re-joining**. **Indefinite.** **⛔ Not appealable.** The **Super Admin may lift it.**"* | Trustee-ratified |
| `-238` cl. 4 · cl. 5 | *"TWO OUTCOMES ONLY. An investigation finds the member **innocent** or **guilty**. ⛔ No third outcome."* · guilty ⇒ *"terminated and blacklisted … along with nominee and claimant (if nominee and claimant are different person)"*. | Trustee-ratified |
| `-238` cl. 3 (as amended) | *"operator flags → District Admin verifies and confirms → escalate to Pariwar Admin → ~~Pariwar Admin imposes~~"* — the last step REPLACED by `-240` cl. 5. Kept, ⛔ re-read ([[feedback_supersede_never_reinterpret]]). | Trustee-ratified, partly superseded |
| `-238` cl. 6 + COUNSEL GATE | *"PAN and Aadhaar of nominee and claimant are to be collected on the filing form and 'will be served as unique identifier'."* — ⛔ *"The whole identifier set of cl.6 … ⛔ MUST NOT BE BUILT BEFORE IT CLEARS"*: (a) s.17(1)(c) indefinite retention about NON-members, (b) a UID token obtainable at all, (c) Aadhaar Data Vault obligations. | Trustee-ratified; ⚠ counsel-gated — ⛔ cleared (G15) |
| `-238` "narrows §8.8" | *"a member may appeal the termination and ⛔ **not** the exclusion flowing from the same finding … The **Super Admin lift** is the only remedy."* | Trustee-ratified (named narrowing) |
| `-238` NOT covered | (i) whether the nominee is blacklisted automatically or only on a finding they conspired; (ii) how a NON-member is sanctioned — *"The blacklist must therefore key on an identifier, ⛔ not on `member_id`"*; (iii) who may originate the flag. | ⛔ ruled — (i) is PQ2; (ii) DL0; (iii) DL4 |
| `2026-09-21-240` cl. 1 | *"RETENTION — only the guilty are kept … where a claim closes with ⛔ **no** finding of fraud they are **deleted**."* | Trustee-ratified — ⛔ reachable today (G14) ⇒ row `6-22b` |
| `-240` cl. 2 · cl. 3 | REACH — *"filers only … A banned person named as someone's nominee is caught **at the moment they come forward to claim**"*. WHAT MAY BAR — *"Only an **exact** identifier (PAN, Aadhaar token) may bar automatically. A match on **name / date of birth / father's name** raises a **review a human must confirm**."* | Trustee-ratified — cl. 3 is PQ3's evidence |
| `-240` cl. 4 | *"Two nominees and **one** involved ⇒ **the other receives the whole amount**. Where ⛔ **no** honest nominee remains … the **State Trustee** may authorise payment to a person who produces **proof of succession**."* | Trustee-ratified ⇒ row `6-22c` (DL0) |
| `-240` cl. 5 | *"THE BAN IS TRUST-WIDE, AND IMPOSED ONE LEVEL UP. The Pariwar Admin **refers**; the **State Trustee imposes**; the **Super Admin may lift**. ⛔ The Pariwar Admin ⛔ no longer imposes it."* + why: *"a Super Admin who both imposes and lifts leaves the lift checking ⛔ nothing."* | Trustee-ratified |
| `-240` cl. 6 | *"refusal now, a ban only on a finding … a lifetime ban follows **only** after the same investigation required for a faked death."* | Trustee-ratified (the post-death-rewrite case — ⛔ this story's subject: the member is dead, the guilty are filers ⇒ `6-22b`) |
| `-240` Consequence 5 | *"A `state_trustee`-imposed route is RANK-ORDER BLOCKED in this codebase … the imposing route ⛔ cannot simply be gated on that role."* | ratified consequence ⇒ DL6 / TL1 |
| `2026-09-21-241` §6 · Consequence 3 | *"Story 6.20 builds the **unlock mechanism and its outcome**; the **finding that fires it arrives from `6-22`**."* · *"`6-22` … owes 6.20 the innocent/guilty finding that drives the release route."* | author-commit (6.20) |
| `2026-09-28-261` D3 A | *"WAIT FOR THE FRAUD REGISTER. A living member locked by a wrong claim is unlocked only by the investigation's finding … Our reading (B — let staff record 'this member is alive' now) was ⛔ NOT TAKEN."* | Trustee-ratified — ⚠ the finding must be an INVESTIGATION's (DL3) |
| `2026-09-28-262` FQ4 | *"GO-LIVE MAY GO AHEAD BEFORE A WRONGLY LOCKED LIVING MEMBER CAN BE UNLOCKED."* | Trustee-ratified ⇒ this story is ⛔ a go-live condition for the release |
| `2026-10-16-339` RF1 C · `-340` | *"The first filing counts, unless an investigation found the member innocent of a claim filed while they were alive."* · the anchor excludes a claim carrying `member_found_innocent`. | Trustee-ratified · author-commit — readers that START working when this lands |
| `2026-10-10-311` PM1 (+ the row's 2026-10-12 pointer) | members *"with a claim filed for their own death"* are filtered from the five; *"⚠ The exclusion STAYS even after such a release — a known residual; whoever builds this row's release decides whether the peer-mesh exclusion follows it."* | author-commit ⇒ DL11 |
| `2026-10-30-423` Q1 (b) A | *"**A false report.** Once the report is closed because the member is alive, erasure is possible again."* | Trustee-ratified |
| `2026-10-31-424` Q2 (a) A + reading | withdrawal *"lifted on the same terms as erasure"*; reading (⛔ ratified): *"the report closed because the member is alive" = the fraud register's innocence finding … `-238` cl. 4's GUILTY arm is 6-22's to put.* | Trustee-ratified + reading |
| `2026-10-31-425` DL4 · DL7 | *"Releasing on INNOCENCE ONLY narrows `-423` Q1 (b)'s 'closed because the member is alive' (a guilty-but-alive finding) — 6-22 must put that to the Panel or justify it."* · two residual edges (a released claim still a convergence candidate; `overrideIntakeAttempt` with ⛔ door). | author-commit (6.38) ⇒ PQ1, DL9 |
| `2026-09-25-243` cl. 1 | *"A DEATH CERTIFICATE IS ⛔ NOT AN IDENTITY DOCUMENT within `-240` cl.1"* — kept *"for as long as claim records are kept"*. | Trustee-ratified ⇒ `6-22b`'s deletion must exclude it (the cascade trap, G14) |
| Niyamavali §8.4 · §8.5 · §8.8 · §2.5 | termination *"subject to the [[12-month]] rejoin lock"*; grounds 1–3 *"Forged documents … Identity fraud … Financial fraud"*; *"each is separately appealable"*; the re-join lock's key is an *"Aadhaar HMAC"* (the code uses a MOBILE blind index). ⛔ blacklist anywhere. A rulebook, ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]). | ⛔ ratified — the Policy-meaning check only |

## 📜 Policy meaning (AI-10-1)

**This story INTRODUCES two predicates that gate a member's access to a benefit or a right, and gives a THIRD (shipped, inert) its first
producer.**

1. **The release (shipped by 6.20 / 6.38; this story writes its first finding).** *In the member's terms:* **"If someone reports you dead
   while you are alive, your record stays locked — you cannot change your nominees, your address or your posting, leave the Trust or have
   your data erased — until the District Admin, having looked into the report, records that you were not part of it; from that moment all
   of it unlocks at once and the false claim is closed."**
   - ⚠ *What the member must also be told, because it is TRUE:* the lock lifts only for an INNOCENT member. A member found GUILTY stays
     locked out of erasure, withdrawal and their own Life Events — that is the narrowing 6.38 declared and this story keeps (PQ1, built on
     the unchanged side).
   - ⚠ And: EVERY claim filed about you needs its own finding — a second false report keeps you locked until it, too, is looked into (the
     predicate is "ANY standing report", G3; DL3 surfaces the others).
2. **The ban at joining (NEW).** *In the member's terms:* **"If the Trust's investigation finds you took part in a false report of your own
   death, and the Trustee Panel imposes the ban after the Pariwar Admin refers it, you are terminated and can never again join the Trust,
   in any Pariwar, from the mobile number you were a member with — and you can appeal the termination but ⛔ the ban; only the Super Admin
   can lift it."**
   - ⚠ *What the member must also be told, because it is TRUE:* the ban is keyed on the MOBILE number (until counsel clears the identifier
     set) — so a person who joins from a new number is ⛔ caught, and a stranger who later gets a recycled number IS (PQ3).
   - ⚠ And: memberships the person already holds in OTHER Pariwars are ⛔ terminated by it — the ban stops joining, ⛔ membership elsewhere
     (DL7).
3. **Peer-mesh selection (CHANGED — DL11).** *In the member's terms:* **"If you were wrongly reported dead and found innocent, you can
   again be one of the five people asked to confirm a colleague's death."**

**Checked against the Niyamavali** (the git-ignored copy in the main checkout, `docs/legal/niyamavali.md`, 2026-11-01) — result: the
rulebook has ⛔ blacklist at all; the Panel's rulings (`-238`, `-240`) are the instrument:
- §8.5 grounds 1–3 (*"Forged documents … Identity fraud … Financial fraud"*) — CONSISTENT: a false report of one's own death is grounds for
  termination under any of them. ⚠ The moderation registry has ⛔ "financial fraud" code — only `r14-forgery` (TL3).
- §8.4 (*"Termination is recoverable only by explicit Trustee reinstatement, and is subject to the [[12-month]] rejoin lock"*) —
  INCONSISTENT in kind: the ban outlasts the 12-month lock indefinitely. The Panel created it knowingly (`-238` cl. 2 *"more than
  termination"*). ⛔ A blocker.
- §8.8 (*"each is separately appealable"*) — NARROWED, and the narrowing is the Panel's own (`-238`): the termination is appealable, the
  ban ⛔. A restored member (an allowed appeal) is a member again but still barred from JOINING (TR8).
- §2.5 (the re-join lock keyed on an *"Aadhaar HMAC"*) — the code keys on a MOBILE blind index; this story's ban inherits that divergence
  (recorded by `-238`, ⛔ resolved here; PQ3).
- ⛔ Clause speaks to a member wrongly reported dead — SILENT; `-238` cl. 1 / `-261` D3 A are the instrument.

## ⭐ THE INVARIANTS

**N1 — One investigation per claim, and the finding is its outcome.** A finding (innocent | guilty) can be recorded ONLY on a claim
carrying an OPEN flag, by the District Admin, with a note — ⛔ a bare staff "alive" mark (`-261` D3 A rejected exactly that). ONE
investigation per claim, ever; its steps are append-only.

**N2 — Two outcomes only.** `member_found_innocent` (existing kind) or `member_found_guilty` (NEW kind) in `claim_nominee_findings` — at most
ONE member finding per claim, of EITHER kind (the partial unique index WIDENS to both kinds — DL2). ⛔ "inconclusive", ⛔ "withdrawn".

**N3 — The leaf predicate is UNCHANGED.** `isDeathReportStanding` keeps releasing on `member_found_innocent` ONLY (PQ1 built on 6.38's
side). ⛔ Second copy of the release rule anywhere — every NEW reader goes through the leaf or through the fence's allow-list (TR2).

**N4 — Release = finding + close, in ONE transaction, under the intake lock.** The innocence writer takes `intakeAdvisoryLockKey(pariwar,
deceased)` FIRST (the 6.38 order), then the claim row, writes the finding, appends `claim.nominee_lock_released` and — if the claim is
CLOSABLE — `claim.closed` with the NEW trigger `member_found_alive`. A guilty finding closes the claim the same way (the member is alive
either way). An `approved` / `settled` claim is ⛔ closable: the finding is still recorded (the member is still released) and the claim is
left for row `6-22c` (DL9).

**N5 — The chain is one-way and each step is a different key.** flag → finding → (guilty only) refer → impose → (later) lift. Refer and
impose each have a DECLINE arm with a note that ENDS the chain (TL2). ⛔ Step is skipped, ⛔ step is repeated, ⛔ one role holds two
consecutive keys (DL6's role map is tested).

**N6 — Imposition is ONE transaction: terminate + ban.** The termination goes through `moderateMember` (⛔ a second moderation writer);
the ban row is written beside it. If the member is already terminated, only the ban is written.

**N7 — The ban is Trust-wide and indefinite; only the Super Admin lifts it.** A STANDING ban (⛔ `lifted_at`) refuses EVERY member-creation
path for its key in EVERY Pariwar (DL7). The lift is one-way (⛔ re-impose on the same row — a new investigation needs a new ban row).

**N8 — ⛔ Tier-1 out of events, logs and audits.** Every staff note (flag, finding, referral, imposition, decline, lift) is a Tier-1
ciphertext; events and audit contexts carry ids, outcome and reason codes only.

## Found facts (traced at `beae5116`; unchanged at `3d6b46c5`)

- **G1 — The finding table and its writers exist; ⛔ production caller.** `claim_nominee_findings` (`0119`): `finding_id` (PK, producer-
  supplied, ⛔ default), `claim_case_id` (FK `claims`, cascade), `pariwar_id`, `kind` (CHECK), `rank` (CHECK: NULL for the innocence kind,
  1 / 2 for `nominee_disqualified`), `recorded_by_actor_id`, `recorded_by_display`, `recorded_at`. Partial unique index: one
  `member_found_innocent` per claim. GRANT SELECT, INSERT only; RLS forced. Writers in `claim/nominee-lock.ts`:
  `recordMemberInnocenceFinding` and `recordNomineeDisqualificationFinding`. Callers: TESTS only (`nominee-lock.spec.ts`,
  `_death-report-fixture.ts`, `nominee-determination.spec.ts`; others seed RAW rows) — grep `apps/*/src` returns ⛔ caller.
- **G2 — The three deferred writer defects (6.20 code review, "deferred to Story 6-22").** (a) both writers use an UNTARGETED
  `.onConflictDoNothing()` — a PK collision reads as `duplicate`; (b) a same-`finding_id` retry is ⛔ idempotent (it throws `duplicate`);
  (c) `recordNomineeDisqualificationFinding` takes a `Db`, emits ⛔ claim event, has ⛔ state window and ⛔ rank-exists check. ⚠ And
  one this trace adds: (d) the innocence writer locks the claim row but ⛔ the intake advisory lock — while every 6.38 consumer of the
  leaf (erasure, withdrawal, declare, intake) serialises on that lock FIRST.
- **G3 — The leaf and its consumers.** `isDeathReportStanding` (`claim/death-report.ts`) — raw SQL: EXISTS a `claims` row for the member as
  deceased with ⛔ `member_found_innocent` finding on THAT claim. Consumers: `isNomineeDeclarationLocked` (delegates);
  `resolveRtbfLegality` (`member/rtbf-legality.ts`) → 409 `rtbf.death_reported` on both erasure routes; withdrawal / Life Events / medical
  handlers (409 `withdrawal.` / `life_events.` / `medical.death_reported`); `tryConverge`'s door (`claim/icp.ts`). Read-only copies the
  fence allows: `claim/approval-warnings.ts` (three — the 90-day `first_filed_at` anchor) and `claim/peer-mesh-read.ts`
  (`resolvePeerMeshFilingCut` — the `-340` anchor).
- **G4 — The fence.** `apps/api/tests/unit/erasure-and-death-report-fence.test.ts`: (i) where the gate SQL may appear; (ii) an EXACT
  allow-list of files that may contain the literal `'member_found_innocent'` or `CLAIM_NOMINEE_FINDING_KINDS` (`death-report.ts`,
  `approval-warnings.ts`, `peer-mesh-read.ts`, `nominee-lock.ts`, the schema file). ⇒ any new file naming the literal goes RED (TR2).
- **G5 — Closing.** `claim.closed` moves every state except `CLAIM_NOT_CLOSABLE_STATES = ['settled', 'approved', 'closed']`
  (`claim/state.ts` — *"⛔ Never widen it to `approved` / `settled` (Trap 16 — closing a committed claim would strand a spawned pool)"*).
  `CLAIM_CLOSED_TRIGGERS = ['suspicion_appeal_allowed', 'death_already_finally_approved']`; the payload schema is `z.enum` of it
  (`ClaimClosedPayloadSchema`). Readers that branch on the TRIGGER: `claim/suspicion-notice.ts` (the family notice `closed_after_appeal`),
  `claim/one-payment-per-death.ts` (OP10). `ACCOUNT_UNFREEZE_EVENT_TYPES` includes `claim.closed` (⛔ `claim.nominee_lock_released`) — so
  TODAY a released-but-unclosed claim leaves the account-frozen overlay ON (`member/overlay.ts`; `directory-read.ts` uses the same rule).
  ⇒ DL3's close fixes it for every closable state.
- **G6 — ⛔ "alive" anywhere else.** grep of alive / living / not_deceased / investigation across domain, contracts, api and admin sources:
  the finding row is the only "alive" fact; "investigation" appears only in comments. The closest shipped mechanism is 6.24a's suspicion
  refusal (`claim/suspicion-refusal*.ts` — a `post_death_nominee_change` denial that closes sibling claims through `claim.closed`).
- **G7 — Who may be flagged, by whom, in which dimension.** Claim routes are `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/<action>`,
  district-dimension via `resolveNomineeNameCheckDistrict()` (`claims.death-certificate.routes.ts`) — a pariwar-ceiling grant
  (`helpline_operator`) CONTAINS a district target, so ONE district-dimension key serves both flaggers.
- **G8 — Termination today.** `moderateMember` (`member/moderation/write.ts`): `none → terminate` is ILLEGAL (`status.ts` legality — suspend
  first); a 7-day dwell (`isDwellElapsed`) with an immediate-termination exception that requires a recorded reason; terminate requires the
  two escalation ciphertexts (10.20 AC6 backstop + the `escalation_iff_terminate` CHECK). Route `POST
  /api/v1/p/:pariwarId/members/:memberId/moderation/terminate` — `member.moderate` (pariwar; `pariwar_admin`, `trustee_panel`) +
  `requireStepUp('member_moderation_terminate')`. The handler sets `rejoinPermittedAt = addTwelveMonths(now)`, revokes member sessions,
  audits `member_moderation.terminated`, enqueues the termination notice. Login after termination is blocked only under the
  `termination_access_block` flag (default OFF). Restore (`member.restore_terminated`, `trustee_panel` only) clears the termination AND its
  re-join lock. Reason codes are a FROZEN code-level list of SEVEN grounds (`MODERATION_REASON_CODES`, `reason-codes.ts`) — `r14-forgery`
  is the nearest to a faked death; ⛔ "financial fraud"; each carries Q6-RATIFIED `ordinarilyResultsIn` guidance ⇒ ⛔ a code minted by
  delegation (TL3).
- **G9 — The re-join locks.** `resolveMembersByMobile` runs on the service pool, cross-tenant, `WHERE mi.mobile_blind_index = $1`,
  LEFT JOINing `members`, `member_withdrawals`, and the latest moderation act (LATERAL). `signup.handlers.ts` enforces two locks, both 403
  `auth.rejoin_locked`: the moderation lock (terminated, `now < rejoin_permitted_at`; audit `member_moderation.rejoin_blocked`) and the
  withdrawal lock. ⚠ Both check ONLY the default sign-up Pariwar (`priorInThisPariwar`) — effectively per-Pariwar. The mobile surface
  is `apps/mobile/app/(auth)/rejoin-locked.tsx`, whose copy carries a DATE (`withdrawal.rejoin_locked_body`: *"This identity withdrew on
  {withdrawnDate}. You may rejoin on or after {rejoinDate}."*) — ⛔ reusable for an indefinite ban (PQ4). Member-identity writers:
  `member/identity-write.ts`, `member/project.ts` (Task 0.1 enumerates EVERY path that creates a `member_identities` row — TR5).
- **G10 — The rank-order wall.** `scopeWithinCeiling` / `scopeContains` (`rbac/scope.ts`) make a `state`-ceiling grant UNABLE to satisfy a
  `pariwar`-dimension check; there is ⛔ `state`-dimension resolver either (`member-moderation/routes.ts`: *"there is no geo-tree
  resolver"*). `roles.ts` repeats it for every Trustee-Lite key. The `trustee_panel` bundle's own note: *"Before this role existed there was
  no way to distinguish a Panel act from a `pariwar_admin` act."* 6.20 D8 mapped a State-Trustee step to `pariwar_admin`; ⚠ here that
  would let the REFERRER impose — the very collapse `-240` cl. 5 forbids.
- **G11 — Keys.** `SEED_PERMISSION_KEYS` + `PERMISSION_CATALOG_VERSION` 56 (`rbac/permissions.ts`, a "Bumped N → N+1" history note per
  bump), grants in `roles.ts`, pins in `tests/rbac/permissions.test.ts` (`56`, 74 keys) and `roles.test.ts` (13 bundles). Keys are minted
  ONLY in an author-commit decision (`-195` cl. 2). `super_admin` auto-derives every key.
- **G12 — Events and audits.** Claim events through `projectClaimState(client, …)` in the row's transaction (`from_state`, `to_state`,
  `trigger`, `actor`; annotations via `requireIdentityTransition`); member events through `projectMemberState`. Registry
  `packages/events/src/registry.ts`; `CLAIM_EVENT_TYPES` (37) pinned in `tests/claim/dpdpa-consent-events.test.ts`. Audits through
  `emitAuthAudit` (type added to `AuthAuditEventType`, `apps/api/src/audit/audit-sink.ts`; context stored hashed) or
  `audit.writeAuditEntry`.
- **G13 — The peer-mesh exclusion IGNORES the finding.** `namedByClaimSql` (`member/known-people.ts`): EXISTS ANY claim naming the member as
  deceased — used by `peerMeshEligibleMemberSql` (`peer-mesh-read.ts`), `knownPersonEligibleSql`, `knownPeopleCallerSql`, and
  `readPeerMeshRequestEligibility`'s `no_target:peer_reported_deceased` label (`peer-mesh-request.ts`). `known-people.ts` records *"a living
  member wrongly reported dead stays out"* as an accepted cost.
- **G14 — What identity data the Trust holds about filers.** `CLAIM_DOCUMENT_TYPES = ['death_certificate', 'ground_inspection_photo',
  'hospital_record']` — ⛔ identity document; ⛔ PAN or father's-name column anywhere; ⛔ full Aadhaar (`aadhaar_masked_id` is Tier-3 last-4,
  NULL on the manual path); claimant name / mobile / address are Tier-1 in `claim_contacts`; ⛔ blind index on any nominee or claimant
  mobile. ⇒ `-240` cl. 1's deletion has NOTHING to delete today (the certificate is excluded by `-243`), and ⛔ non-member can be matched
  by an exact identifier. ⚠ The 6.21 trap stands for `6-22b`: deleting `claim_documents` rows CASCADES (`0122`) into every kept
  certificate upload and review.
- **G15 — Counsel.** ⛔ Decision records an answer to `-238` (a) / (b) / (c); `-339` (2026-10-16) still calls the producer *"counsel-gated …
  waits on legal advice"*; ⛔ counsel-question file exists for them (the only one, `counsel-question-2026-10-18-nominee-contact-basis.md`,
  is about contact, WRITTEN ⛔ sent); ⛔ `inventory-roster.md` row names them. The PAN-verification author-commit (`-240`) has its four
  owed consequences (fail mode, fuzzy name match, processor, whose PAN) all open.
- **G16 — Deferred items that name this row** (`deferred-work.md`): 6.38 Task 0.5 item 1 (DL4 / DL7 — the release, the guilty arm, the
  two residual edges) and round-2 D1 (the copy points a falsely-reported member at a helpline that cannot lift); 6.38 DL12 (ii) (the export
  step-up); 6.20 chunk 1 (G2's defects; a correction raised on a released claim racing a declare; the 40P01 deadlock); 6.23a (FQ1's
  *"corrected after the death"* label — trigger *"row `6-22`'s first production release"*); 6.23b EA10 + its "second row-6-22 mechanism"
  (a key appearing with ⛔ new determination after an unlock / a finding — trigger *"row `6-22` lands"*); 6.36 W2 (an anchor later than the
  claim selected for); 6.36e NE9 / 6.36f (a declare after an unlock); 6.21 (the cascade trap).
- **G17 — Admin surfaces.** ⛔ general claims list; the console is entered by claim id (`/p/$pariwarId/claims/$claimCaseId/verify`). Lists
  that exist: `/helpline`, `/ground-inspection`, `/nominee-refusals`, `/nominee-corrections`, `/cycle-freeze`, `/r9-voting`, `/trustee`,
  `/moderation/appeals`; member moderation at `/p/$pariwarId/members` (`modules/member-status/ModerationSection.tsx`). Admin copy is
  English-only (`i18n-en.ts`).

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL0 — SCOPE: the first half, and two new rows.** This story builds what ⛔ waits on counsel: the investigation of a claim against a
  member who may be ALIVE, its two findings, the release, the chain, the termination and the MEMBER ban. Two new rows (Task 0.5, minted
  only on BigDev's yes):
  - **`6-22b-fraud-register-identifier-set-and-filer-bans`** — ⚠ COUNSEL-GATED (`-238` (a)–(c)): the PAN / Aadhaar-token collection on the
    filing form, the PAN-verification service (`-240` author-commit (a)–(d)), the bar at FILING on an exact identifier and the human review
    on a name / DOB / father's-name match (`-240` cl. 2–3), bans on nominees and claimants (members or not — PQ2), the post-death-rewrite
    and fake-certificate investigations whose guilty are FILERS (`-240` cl. 6), and the `-240` cl. 1 deletion (excluding certificates —
    `-243`; the cascade trap, G14). ⭐ Its FIRST task is to WRITE the counsel question (G15) — ⛔ written today.
  - **`6-22c-disqualified-nominee-and-proof-of-succession`** — the `nominee_disqualified` producer (6.20's D17(c) re-rank is built, ⛔
    caller), the State Trustee's payment on proof of succession (`-240` cl. 4), and a claim already `approved` / `settled` when the member
    is found alive (N4 — a drive raised for a living member).
  - *Rejected:* waiting for counsel to build anything (the release is a living member's way out of six locks today); building the whole
    row with the identifier set stubbed (an inert gate that reads as built — [[feedback_gate_scope_semantic_coverage]]). The slug keeps
    naming the identifier set; ⛔ renamed (four decisions and six story files cite the key).
- **DL1 — The investigation record: a NEW table `claim_fraud_investigation_steps`** (append-only), migration "the next free number" (≥
  `0195`; READ LIVE). Columns: `step_id uuid PK` (producer-supplied — idempotent retries, DL12), `claim_case_id` (FK `claims`),
  `pariwar_id`, `deceased_member_id`, `step` enum `flagged | found_innocent | found_guilty | referred | referral_declined | imposed |
  imposition_declined`, `finding_id` (nullable FK `claim_nominee_findings` — set iff `found_*`), `ban_id` (nullable — set iff `imposed`),
  `note_ciphertext` (Tier-1, `piiColumn`, REQUIRED on every step), `actor_id`, `actor_display`, `acted_at`. Unique `(claim_case_id, step)`
  — each step at most once per claim (N1, N5). RLS by `pariwar_id` declared in TS (`packages/domain/src/policies/claim-fraud-investigation-
  rls.ts` + `policies/index.ts`, copying `claim-death-certificate-rls.ts`) INCLUDING a per-command UPDATE policy; GRANT SELECT, INSERT +
  `UPDATE ("note_ciphertext")` AT BIRTH (the scrub — DL15); a mutation guard refusing any change but `note_ciphertext`
  ([[project_append_only_guard_names_erasure_columns]] — at birth, ⛔ a later REPLACE); ⛔ DELETE. The CHAIN ORDER is enforced in the
  domain writer (DL5), ⛔ by a trigger. A branded id `ClaimFraudInvestigationStepId`. *Rejected:* a mutable "investigation" row with stage
  columns (two writers racing on one row; the house shape for staff acts is append-only — `claim_death_certificate_reviews`).
- **DL2 — The guilty finding kind.** Migration (ALONE, before DL1's): `claim_nominee_findings`' `kind` CHECK widened to
  `member_found_guilty` (rank NULL — the rank CHECK names it beside the innocence kind); the partial unique index REPLACED to cover BOTH
  member kinds (`WHERE kind IN ('member_found_innocent', 'member_found_guilty')`) — N2. `CLAIM_NOMINEE_FINDING_KINDS` gains the value
  (`member_found_guilty` is ⛔ read by the leaf — N3). ⚠ Verify at Task 0.1 that ⛔ reader filters on "any finding" / `kind <>
  'nominee_disqualified'` (it would start releasing on guilt). *Rejected:* recording guilt only in DL1's steps (then a PQ1 = A ruling needs a
  second table in the leaf).
- **DL3 — The finding writers (N1, N4).** `recordFraudFinding(client, { claimCaseId, pariwarId, outcome: 'innocent' | 'guilty', stepId,
  findingId, noteCiphertext, actor… })` in a NEW `packages/domain/src/claim/fraud-investigation-persist.ts`: (1)
  `pg_advisory_xact_lock(intakeAdvisoryLockKey(pariwar, deceased))` FIRST (lower-cased — 6.38 R2 P1); (2) lock the claim row; (3) require an
  OPEN `flagged` step and ⛔ finding on this claim (409 `fraud_investigation.not_flagged` / `.already_found`); (4) INNOCENT ⇒ call the
  HARDENED `recordMemberInnocenceFinding` (DL12) — GUILTY ⇒ insert `member_found_guilty` + append the annotation
  `claim.member_found_guilty`; (5) insert the `found_*` step; (6) if `isClaimClosable(state)` ⇒ `claim.closed` with the NEW trigger
  `member_found_alive` (`CLAIM_CLOSED_TRIGGERS` gains it — DL13). A claim ALREADY `closed` (e.g. a suspicion closure) takes the finding ⛔
  close. `approved` / `settled` ⇒ the finding (and the release) stands, the claim is ⛔ closed, and the response says so
  (`closed: false, reason: 'committed'`) — the case belongs to `6-22c`. The response lists the member's OTHER standing claims (their ids
  and states, ⛔ PII) so the District Admin sees the member is still locked by them (Policy meaning 1). *Rejected:* one finding releasing
  every claim on the member (a finding is an investigation's outcome on ONE report — `-261` D3 A; and guilt on a sibling report filed by a
  stranger is ⛔ shown by this investigation).
- **DL4 — The flag.** `flagClaimForFraudInvestigation(client, { claimCaseId, pariwarId, stepId, noteCiphertext, actor… })` — any claim in
  ANY state ⛔ already flagged; the flagger is a helpline operator or a District Admin (the routing note's chain; `-238` NOT covered (iii) —
  in the post-death case the discovery is the District Admin's, and they may flag then find). Annotation `claim.fraud_flagged`. ⛔ Effect
  on the claim's state or on any approval gate (a flag is a question, ⛔ a hold — TL4). A District Admin may flag AND find the same claim
  (the ruled chain's "verifies" is the finding).
- **DL5 — Refer / impose / lift (N5, N6, N7).** In `packages/domain/src/fraud-register/` (a NEW module — the ban outlives the claim and
  keys on the member):
  - `referFraudFinding(…, { decision: 'refer' | 'decline' })` — requires `found_guilty` and ⛔ `referred` / `referral_declined`.
  - `imposeFraudBan(…, { decision: 'impose' | 'decline', moderation: { reasonCode, decisionNoteCiphertext, escalation…Ciphertexts,
    immediateTerminationReasonCiphertext } })` — requires `referred` and ⛔ `imposed` / `imposition_declined`. On `impose`, ONE transaction:
    (i) the moderation acts through `moderateMember` — `none` ⇒ `suspend` then `terminate` (immediate, its reason recorded); `suspended` ⇒
    `terminate` (immediate); `terminated` ⇒ ⛔ act (N6); (ii) the ban row (DL7); (iii) the `imposed` step with the `ban_id`. The API
    handler then does what the terminate handler does after commit (session revocation, the termination notice — REUSE its post-commit
    helper, ⛔ copy it; trace at Task 0.1). ⚠ The member is told ONLY what any terminated member is told today (⛔ new words — ⛔ the word
    "ban").
  - `liftFraudBan(…, { banId, noteCiphertext })` — sets `lifted_at` / `lifted_by` / `lift_note_ciphertext` once (one-way trigger); ⛔
    restore of the termination (that is `member.restore_terminated` / the 10.22 appeal — separate acts, TR8).
- **DL6 — The keys and who holds them (G10, G11)** — minted in Task 0.4's decision, catalog "the next free version" (≥ v57 — 6.39 also
  proposes v57; READ LIVE):
  | Key | Dimension | Seeded holders | Step-up |
  |---|---|---|---|
  | `claim.flag_fraud` | district | `helpline_operator`, `district_admin` | ⛔ |
  | `claim.record_fraud_finding` | district | `district_admin` | ✅ `fraud_finding` |
  | `fraud_register.refer` | pariwar | `pariwar_admin` | ✅ `fraud_register_refer` |
  | `fraud_register.impose` | pariwar | `trustee_panel` (⚠ "the State Trustee" — TL1) | ✅ `fraud_register_impose` |
  | `fraud_register.lift` | pariwar | ⛔ seeded role — `super_admin` auto-derives | ✅ `fraud_register_lift` |
  | `fraud_register.read` | pariwar | `pariwar_admin`, `trustee_panel` | ⛔ |
  ⚠ `trustee_panel` already holds `member.moderate`; `fraud_register.impose` does ⛔ require it (the domain writer is called directly) —
  the impose key IS the authority. A test asserts ⛔ seeded role holds both `fraud_register.refer` and `fraud_register.impose` (N5).
  *Rejected:* `pariwar_admin` imposing as Trustee-Lite (the referrer would impose — `-240` cl. 5's named collapse); a `state` dimension (⛔
  resolver; and the rank order forbids it anyway — G10).
- **DL7 — The ban (N7).** NEW table `fraud_register_bans` (same migration as DL1 or the next): `ban_id uuid PK`, `subject_member_id`
  (NOT NULL now — `6-22b` relaxes it for filers), `origin_pariwar_id`, `claim_case_id`, `mobile_blind_index` (SNAPSHOT at imposition from
  `member_identities` — the key survives a later number change and erasure), `imposed_by_actor_id`, `imposed_by_display`, `imposed_at`,
  `lifted_at`, `lifted_by_actor_id`, `lifted_by_display`, `lift_note_ciphertext` (Tier-1). Partial unique: ONE standing ban per member.
  GRANT SELECT, INSERT, `UPDATE (lifted_*, lift_note_ciphertext)`; a one-way trigger (`lifted_at` NULL → value, ⛔ back); ⛔ DELETE. RLS by
  `origin_pariwar_id` for admin reads; the SIGN-UP read runs on the service pool (as `resolveMembersByMobile` does). **The bar:** a
  helper `isJoinBarredByFraudBan(servicePool, mobileBlindIndex)` = EXISTS a standing ban whose `mobile_blind_index = $1` OR whose
  `subject_member_id` is ANY member whose identity carries `$1` — ⛔ Pariwar filter (Trust-wide — ⚠ unlike G9's two locks). Wired into
  EVERY member-creation path (TR5's list), checked BEFORE the existing two locks; 403 `auth.join_barred` (PQ4 built B); audit
  `fraud_register.join_blocked` (context: ban id only). ⚠ Existing memberships in OTHER Pariwars are ⛔ touched (Policy meaning 2 —
  declared).
- **DL8 — ⛔ Effect on the leaf (N3, PQ1).** `isDeathReportStanding` is ⛔ edited. A guilty member stays locked out of erasure,
  withdrawal and Life Events (6.38's declared narrowing, now put to the Panel as PQ1). If PQ1 is ruled A, the change is ONE kind in the
  leaf's `NOT EXISTS` and the fence's allow-list — record that in the leaf's header as the swap point.
- **DL9 — DL7's two residual edges (6.38).** (a) a released claim as a convergence candidate — CLOSED by DL3's close for every closable
  state (a `closed` claim is ⛔ candidate — `icp.ts` filters out `CLAIM_TERMINAL_STATES = ['settled', 'denied', 'closed']`, `claim/read.ts`); `approved` / `settled` released claims stay candidates ⇒ `6-22c`
  (recorded). (b) `overrideIntakeAttempt` with ⛔ door beside a claim later released — Task 0.1 traces whether override onto a `closed`
  claim is refused; if ⛔, add the door check to `overrideIntakeAttempt` for a released target (the 6.38 DELIBERATE doc block names the
  trigger).
- **DL10 — The surfaces.** (i) Verifier console: a `FraudInvestigationPanel` (copy `DeathCertificateReviewControl.tsx`'s shape) — Flag
  (with note), then Record finding (innocent / guilty radios, ⛔ pre-selected; note required; step-up), showing the member's OTHER standing
  claims after an innocence finding (DL3). (ii) Helpline claims module: Flag only. (iii) A NEW page `/p/$pariwarId/fraud-register` (keys
  `fraud_register.*`): referrals awaiting the Pariwar Admin, impositions awaiting the Trustee Panel (with the moderation fields of the
  existing terminate form — REUSE its field component; ⛔ second form), and the register (standing / lifted bans) with Lift for the Super
  Admin. ⛔ PII on the list beyond what the moderation page already shows for the member (name via the existing member read; ⛔ the
  claimant's details). Every refusal mapped to copy (⛔ raw code).
- **DL11 — The peer-mesh exclusion FOLLOWS the release (PM1's pointer).** `namedByClaimSql` (`member/known-people.ts`) becomes "a STANDING
  report names the member" — it calls / inlines through the leaf (⛔ a fourth copy of the release SQL — the fence's (i) list gains it if
  inlined, TR2). A member found innocent re-enters the five. ⚠ This changes WHO IS ASKED — but back to the default every living member is
  under; `-339` RF1 C already ruled the same finding moves the anchor. Author call, TOLD to the Panel (TL4). `known-people.ts`'s
  accepted-cost comment is rewritten.
- **DL12 — Harden the existing writers (G2).** Both writers: TARGETED conflicts (`onConflictDoNothing({ target: … })` on the member-kind
  unique index / `(claim_case_id, rank)` — a PK collision becomes a 500, ⛔ "duplicate"); a same-`finding_id` retry with the same inputs is
  IDEMPOTENT (returns the existing row's event version, ⛔ a second event); the innocence writer takes the intake lock FIRST (G2 (d) —
  callable only from DL3, which already holds it: assert the lock is held via a `pg_locks` probe in tests, ⛔ re-take it). The disqualifier's
  `Db` / event / window / rank-exists defects (G2 (c)) ⇒ `6-22c` (its producer) — recorded, ⛔ fixed here (⛔ caller in this story).
- **DL13 — Events.** Claim: `claim.fraud_flagged` (annotation), `claim.member_found_guilty` (annotation) + the new
  `CLAIM_CLOSED_TRIGGERS` value `member_found_alive` (⚠ a `z.enum` widening — every reader that branches on the trigger is re-checked:
  `suspicion-notice.ts` and `one-payment-per-death.ts` must IGNORE it — G5). Member stream (identity annotations via `projectMemberState`):
  `member.fraud_register.banned`, `member.fraud_register.ban_lifted`. Refer / decline steps are AUDIT-only (they change nothing a member or
  claim reader sees). `CLAIM_EVENT_TYPES` 37 → 39 (READ LIVE — 6.39 adds one); a frozen literal `STORY_6_22_CLAIM_EVENTS`. ⛔ Notification
  on `member_found_alive` — the claimant of a false report is told nothing by the app (TL4); verify at Task 0.1 that ⛔ family surface
  renders a `closed` claim with trigger-specific words that would be false here.
- **DL14 — Audits.** `admin_claim.fraud_flagged`, `admin_claim.fraud_finding_recorded`, `fraud_register.referred`,
  `fraud_register.referral_declined`, `fraud_register.imposed`, `fraud_register.imposition_declined`, `fraud_register.lifted`,
  `fraud_register.join_blocked` — `AuthAuditEventType` entries; contexts carry ids and the outcome only (N8, asserted with a planted value).
- **DL15 — Erasure.** `claim_fraud_investigation_steps.note_ciphertext` is scrubbed by `member/anonymize.ts` for the deceased-keyed member
  (the 6.21a pattern + its field-class constant and the `apps/api/src/context.ts` twin) — reachable only for an INNOCENT member (a guilty
  one stays erasure-locked, DL8). `fraud_register_bans` is ⛔ scrubbed: the ban and its blind index are the register `-240` cl. 1 keeps for
  the guilty — ⚠ the INDEFINITE retention of a member's blind index after erasure is a NEW retention (the 12-month lock kept it only for 12
  months) ⇒ a counsel leg on the go-live roster (Task 0.5), ⛔ a build blocker ([[project_not_in_production_merge_is_not_golive]]).
- **DL16 — Copy.** Admin: English, `i18n-en.ts` (the panel, the page, every refusal). Member: ONE new screen state for `auth.join_barred` —
  en + hi, `packages/i18n/locales/{en,hi}/common.json`, PQ4's built B words (*"We cannot register this mobile number. If you think this is a
  mistake, please call the helpline."* — BigDev reviews the Hindi; `$comment` names who and when); routed in the mobile sign-up flow
  beside `rejoin-locked.tsx` (⛔ reuse its dated copy); microcopy enrolment; a `friction-budget.md` disposition (a new member-facing
  refusal).
- **DL17 — Records this story CLOSES or annotates (G16), with exact closure words** ([[feedback_closure_language_precision]]): 6.38 Task
  0.5 item 1 — *"Closed by 6.22 (the release producer + the guilty arm); the innocence-only narrowing put to the Panel as PQ1; DL7 (a)
  closed for closable states, (b) per DL9"*; 6.38 D1 — *"mechanism built; the helpline can now route a falsely-reported member to a
  finding"*; 6.20 chunk 1 — (a)/(b)/(d) *"Closed by 6.22"*, (c) *"deferred to `6-22c`"*, the correction race — *"unreachable for a closed
  claim; `approved` / `settled` ⇒ `6-22c`"*; 6.23a and 6.23b EA10 — *"trigger reached; still deferred"* with the reason (reachable only for
  a claim committed before the finding ⇒ `6-22c`); 6.36 W2 — re-traced at Task 0.1 and annotated; 6.21's cascade trap — *"moved to
  `6-22b`"*; the PM1 pointer — *"Closed by 6.22 DL11"*.
- **DL18 — ⛔ Scope creep.** ⛔ Identifier set, PAN service, filer bans, filing-form changes, deletion (`6-22b`); ⛔ disqualification
  producer, succession payment, committed-claim recovery (`6-22c`); ⛔ change to the leaf (PQ1); ⛔ new moderation reason code (TL3); ⛔ new
  words in the termination notice; ⛔ notification to the claimant or nominee; ⛔ flag as an approval hold; ⛔ backfill (⛔ member uses the
  system).

## Panel questions — PROPOSED (one non-blocking note at Task 0.3)

- **PQ1 — A member found ALIVE but GUILTY: do the death locks lift?** (`-425` DL4: *"6-22 must put that to the Panel or justify it"*.)
  `-423` Q1 (b)'s words — *"closed because the member is alive"* — cover a guilty member; `-240` cl. 1 keeps *"only the guilty"*. ⭐ THE ONE
  FACT: lifting means a member just found to have faked their own death could then have their data ERASED and LEAVE the Trust before the
  ban is imposed. Options: **A** lift on either finding (the literal words; the register keeps only the ban row and blind index — DL15);
  **B** lift on innocence only (as built by 6.38 — a narrowing of `-423` Q1 (b), justified by `-240` cl. 1); **C** lift on guilt only once
  the ban is imposed or declined. *Built: B (unchanged). Suggest: B.*
- **PQ2 — The nominee and the claimant of a guilty member: banned automatically, or only on a finding of their own?** (`-238` and `-240`
  NOT covered.) ⭐ THE ONE FACT: a nominee may never have known they were named. Options: **A** automatically (the literal *"along with
  nominee and claimant"*); **B** each only on a finding naming them. ⚠ Either way ⛔ ban on a filer is built here (most are non-members and
  need the counsel-gated identifiers — `6-22b`). *Built: neither (DL0). Suggest: B.*
- **PQ3 — Until the identifier set exists, may a MOBILE NUMBER bar a returning member?** `-240` cl. 3: *"Only an **exact** identifier (PAN,
  Aadhaar token) may bar automatically"* — a mobile number is exact but is ⛔ an identity, and Indian numbers are RECYCLED to strangers. ⭐
  THE ONE FACT: without it, the ban stops ⛔ one, because the member's mobile is the only key the Trust holds for them. Options: **A** the
  mobile bars (a stranger with a recycled number is refused until the Super Admin lifts — which also frees the fraudster); **B** a mobile
  match is held for a human to confirm (⛔ "held" sign-up state exists — new build); **C** ⛔ bar until `6-22b`. *Built: A. Suggest: A,
  with the cost named.*
- **PQ4 — What is a barred person told when they try to join?** ⛔ ruling covers it. Options: **A** plainly that they are barred
  permanently by a Trust decision; **B** a general *"we cannot register this number — please call the helpline"*; **C** the 12-month lock's
  words (⛔ — false: it shows a date). *Built: B. Suggest: B.*
- **TL1 (told) — "The State Trustee imposes" is built as the TRUSTEE PANEL role.** The system cannot gate an act on the State Trustee role
  (the rank order — `-240` Consequence 5); the Pariwar Admin cannot impose (they refer — `-240` cl. 5). The Trustee Panel role is the one
  distinct from both. If the Panel wants other people to hold it, only the role grant changes.
- **TL2 (told) — the referrer and the imposer may each DECLINE, with a note, ending the chain.** A step that can only say yes checks
  nothing (the Panel's own reason for separating impose from lift). A declined chain leaves the guilty finding standing and ⛔ ban.
- **TL3 (told) — the termination's ground is chosen from the existing seven** (`r14-forgery` the nearest). Rulebook §8.5's ground 3,
  *"Financial fraud"*, has ⛔ code; adding one changes ratified guidance and is the Panel's, ⛔ ours.
- **TL4 (told) — four quiet choices.** (i) A flag is a question, ⛔ a hold — a flagged claim keeps moving until a finding; (ii) the claimant
  of a false report is told nothing by the app when the claim closes; (iii) a member found innocent can again be asked to confirm a
  colleague's death (DL11); (iv) bans on nominees, claimants and non-members wait for counsel, and counsel has ⛔ yet been asked — this
  story's records write that question's row (`6-22b`).

## Acceptance Criteria

1. **AC1 — The records (DL1, DL2, DL7).** Migrations in order — the `claim_nominee_findings` CHECK + index change ALONE, then
   `claim_fraud_investigation_steps`, then `fraud_register_bans` (or both together — ⛔ with an enum `ADD VALUE`); drizzle schema + journal
   agree ([[project_live_db_test_gotchas]]). Live-DB: a second member finding of EITHER kind on one claim ⇒ 23505; a second step of the same
   kind ⇒ 23505; UPDATE of any step column but `note_ciphertext` ⇒ refused; DELETE ⇒ refused; a second standing ban for a member ⇒ 23505;
   `lifted_at` back to NULL ⇒ refused; another Pariwar's session sees ⛔ step and ⛔ ban.
2. **AC2 — The leaf is untouched and blind to guilt (N3, DL8).** Live-DB: a claim with `member_found_guilty` ⇒ `isDeathReportStanding`
   TRUE (erasure 409 `rtbf.death_reported`, withdrawal 409, Life Events 409, declare 409); the same claim with `member_found_innocent` (a
   different seeded claim) ⇒ FALSE. ONE test named for PQ1 so a ruling of A flips it visibly. `git diff` shows `death-report.ts` unchanged.
3. **AC3 — Flag (DL4).** API live-DB: a helpline operator and a District Admin each flag (201, step row, `claim.fraud_flagged`, state
   unchanged); a second flag ⇒ 409 `fraud_investigation.already_flagged`; a verifier / pariwar_admin ⇒ 403; a District Admin of another
   district ⇒ 403; a flagged claim still passes P1 approval (⛔ hold — TL4 (i)).
4. **AC4 — The innocence finding releases and closes (DL3, DL12, N4).** API live-DB: un-flagged ⇒ 409 `fraud_investigation.not_flagged`;
   flagged + innocent ⇒ the finding row, `claim.nominee_lock_released`, `claim.closed` (`member_found_alive`), the step, ONE transaction;
   THEN, for the member: a nominee declare succeeds, erasure is refused only by its ordinary rules (an `active` member ⇒
   `rtbf.invalid_state`, ⛔ `death_reported`), withdrawal and a Life Events write succeed, the account-frozen overlay is OFF. A member with a
   SECOND standing claim stays locked and the response lists it. An `approved` claim ⇒ finding + release, ⛔ close, `closed: false, reason:
   'committed'`. Without step-up ⇒ 401/403 step-up.
5. **AC5 — The lock order is real (DL3, DL12).** Using `sendWhileHolding`: hold the intake key on a second connection, fire the finding,
   prove it WAITS (`pg_blocking_pids`), release ⇒ it commits. And a finding racing an erasure request on the same member: exactly one
   outcome, ⛔ erasure of a member whose report then reads released-in-the-same-instant (mutation: remove the lock ⇒ RED). Upper-case id ⇒
   same key.
6. **AC6 — The guilty finding (DL2, DL3).** Flagged + guilty ⇒ `member_found_guilty`, `claim.member_found_guilty`, `claim.closed`
   (`member_found_alive`), step `found_guilty`; the member stays locked (AC2). A second finding of either kind ⇒ 409
   `fraud_investigation.already_found`.
7. **AC7 — Idempotence and targeted conflicts (DL12).** Retrying the same request (same `step_id` / `finding_id`) ⇒ 200 with the SAME event
   version and ⛔ second event; a different `finding_id` on a found claim ⇒ 409; a planted PK collision ⇒ 500 (⛔ "duplicate").
8. **AC8 — The chain (DL5, DL6, N5).** Refer before a guilty finding ⇒ 409 `fraud_register.not_found_guilty`; impose before referral ⇒ 409
   `fraud_register.not_referred`; decline at refer ⇒ impose 409 `fraud_register.chain_ended`; each step once (second ⇒ 409); refer by
   `trustee_panel` ⇒ 403, impose by `pariwar_admin` ⇒ 403, lift by `trustee_panel` ⇒ 403, lift by `super_admin` ⇒ 200; a unit test: ⛔
   seeded role holds both `fraud_register.refer` and `fraud_register.impose`. Catalog version / key count / bundle pins updated (READ LIVE).
9. **AC9 — Imposition (DL5, DL7, N6).** Live-DB through the API, for a member in `none`, `suspended` and `terminated`: `none` ⇒
   `member.moderation.suspended` + `member.moderation.terminated` (immediate, reason recorded) + the ban + `member.fraud_register.banned` +
   step `imposed`, ONE transaction (a planted failure in the ban insert ⇒ ⛔ moderation act persists); `suspended` ⇒ terminate + ban;
   `terminated` ⇒ ban only. Sessions revoked and the termination notice enqueued exactly as the terminate route does (assert through the
   same helper's observable effects). The ban's `mobile_blind_index` equals the member identity's.
10. **AC10 — The bar at joining (DL7, PQ3 A, PQ4 B).** Live-DB through EVERY member-creation path (TR5's list): the banned member's mobile,
    signing up in the SAME Pariwar and in ANOTHER Pariwar ⇒ 403 `auth.join_barred` + audit; after the member changes their number, the OLD
    number is still barred (snapshot) and the NEW one is barred via `subject_member_id`; after the Super Admin lifts ⇒ the existing
    12-month moderation lock answers (403 `auth.rejoin_locked`) until it lapses, then sign-up succeeds; an unrelated mobile ⇒ unaffected.
    The barred check runs BEFORE the two existing locks.
11. **AC11 — Lift (DL5).** One-way; a second lift ⇒ 409; the lift does ⛔ restore the termination; a lifted member can be banned again only
    by a NEW investigation (a second ban row after the first is lifted — the partial unique index allows it).
12. **AC12 — Peer-mesh follows the release (DL11).** Live-DB: a member with a claim released by innocence is ELIGIBLE as one of the five
    (`peerMeshEligibleMemberSql`, `knownPersonEligibleSql`) and ⛔ labelled `no_target:peer_reported_deceased`; a member with a guilty or
    un-found claim stays excluded. The fence (G4) covers the new site.
13. **AC13 — Events and audits (DL13, DL14, N8).** `CLAIM_EVENT_TYPES` +2 (READ LIVE), `STORY_6_22_CLAIM_EVENTS` frozen literal, the
    member events registered; `CLAIM_CLOSED_TRIGGERS` gains `member_found_alive` and `suspicion-notice.ts` / `one-payment-per-death.ts`
    ignore it (a test each); every payload and audit context contains ⛔ note, ⛔ name (planted value asserted absent on the serialized
    payloads).
14. **AC14 — The staff surfaces (DL10).** Admin component tests: the panel's flag and finding forms (radios ⛔ pre-selected; note required;
    the other-claims list after innocence); the helpline flag; the register page's three sections each hidden without its key; the impose
    form reuses the terminate field component; every refusal → copy (⛔ raw code); `role="alert"` / always-mounted `role="status"` (6.38 R4
    P1). A real-browser pass ([[project_admin_browser_pass_launcher]]; [[project_agent_chrome_cannot_reach_localhost]] — probe once) — or
    recorded un-attested ([[feedback_record_unattested_no_backfill]]).
15. **AC15 — The member surface (DL16).** Mobile: `auth.join_barred` routes to the barred state, en + hi through the real `t()` in BOTH
    locales ([[feedback_stub_must_call_not_transcribe]]); announced on iOS and Android (executed tests); ⛔ date shown; microcopy and
    friction gates green.
16. **AC16 — Erasure and the gate (DL15).** Live-DB as `twt_app`: `anonymizeMember` on an innocence-released member scrubs every step's
    `note_ciphertext` (rows matched > 0 — the UPDATE policy) and leaves every other column; ⛔ ban row is scrubbed. `ci:local` 36 / 36 on a
    FRESH container, DB named `twt_dev`, the story's own port ([[project_prepush_hook_inherits_5432]]; 6.38 D7).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [ ] 0.1 `git fetch origin`; confirm `3d6b46c5` is an ancestor of HEAD; `git diff --name-only 3d6b46c5 origin/main -- apps packages
        scripts` — re-derive G1–G17 if anything moved (⚠ 6.39 touches `assertClaimApprovable`, `CLAIM_EVENT_TYPES`, the catalog and the
        migrations); `git log 3d6b46c5..origin/main -- .decision-log.md _bmad-output docs/launch-gate-inventory` — read any new entry; re-read
        the NUMBERS block across EVERY branch and worktree. TRACE and record here: (i) EVERY path that creates a `member_identities` /
        `members` row (TR5); (ii) the terminate handler's post-commit helper (DL5); (iii) whether `overrideIntakeAttempt` refuses a `closed`
        target (DL9 (b)); (iv) every reader of `claim_nominee_findings.kind` that is ⛔ an equality on `member_found_innocent` (DL2); (v)
        every surface that renders a `closed` claim by trigger (DL13); (vi) 6.36 W2's reachability now that a finding exists; (vii) whether
        the correction routes refuse a `closed` claim (DL17). Check `ListAgents` + the branch before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [ ] 0.2 Put DL0–DL18 to BigDev (DL0's two rows named; DL6's table; DL16's English verbatim). Record the answers here.
  - [ ] 0.3 Draft ONE routing note from the template (by path, ⛔ copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-22-fraud-register-first-half.md` — PQ1–PQ4 + TL1–TL4;
        plain-English question first, THE ONE FACT, options with an honest cost on each, evidence LAST; E4 commands run. Status: WRITTEN, ⛔
        sent (BigDev sends). Non-blocking for build and merge.
  - [ ] 0.4 Decision entry (AUTHOR-COMMIT, the next free number across branches — ≥ `-433` at 2026-11-01): DL0–DL18 as answered; the six
        keys (`-195` cl. 2); cites `-238`, `-240`, `-261` D3 A, `-425` DL4 / DL7; declares the scope split (`-238` cl. 5's filer half and
        cl. 6 deferred, named), TL1's role map and N3's kept narrowing; ⛔ supersedes a ratified entry. Committed ALONE, first.
  - [ ] 0.5 Records: the two rows `6-22b-…` / `6-22c-…` in `sprint-status.yaml` (backlog, with their comment blocks — on BigDev's DL0
        yes); `deferred-work.md` — PQ1–PQ4 open; the `6-22b` counsel question named as owed; a NEW go-live roster row or legs in
        `docs/launch-gate-inventory/inventory-roster.md` (READ the roster first; 6.39 proposes Row 46 "Members' claims go live" — add legs
        there if it exists, else a row of the same shape): (a) PQ1–PQ4 ruled and reflected; (b) counsel on the indefinite retention of a
        banned member's blind index (DL15); (c) 6.22's browser pass attested; (d) `6-22b`'s counsel question SENT. An `epics.md` entry for
        Story 6.22 (⛔ exists today — 6.20's `> ⚠ Minted by…` header shape).
  - [ ] 0.6 Ledger line + row `ready-for-dev → in-progress` ([[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [ ] **Task 1 — The records (AC1)**
  - [ ] 1.1 The findings migration (DL2) ALONE; `CLAIM_NOMINEE_FINDING_KINDS` + the schema file; the fence allow-list unchanged (the
        schema file is already on it).
  - [ ] 1.2 `claim_fraud_investigation_steps` + `fraud_register_bans` (DL1, DL7): schema files, barrel, RLS policy files + `policies/
        index.ts`, branded ids, grants / guard / one-way trigger at birth.
  - [ ] 1.3 Live-DB tests for AC1 (copy the 6.21a reviews table's spec).
- [ ] **Task 2 — The writers (AC2, AC4–AC7)**
  - [ ] 2.1 DL12 on `recordMemberInnocenceFinding` (targeted conflict, idempotent retry, the lock-held assertion) — its existing tests
        stay green with ⛔ assertion weakened.
  - [ ] 2.2 `fraud-investigation-persist.ts`: `flagClaimForFraudInvestigation`, `recordFraudFinding` (DL3, DL4); errors in
        `claim/errors.ts`; the `member_found_alive` trigger + the two annotations (DL13) — registry, tuple, payload map, reducer arms, count.
  - [ ] 2.3 Tests: AC2 (with the PQ1-named leg), AC4 (domain half), AC5 (`sendWhileHolding` — add the finding to the fixture), AC6, AC7.
- [ ] **Task 3 — The chain and the ban (AC8, AC9, AC11)**
  - [ ] 3.1 `packages/domain/src/fraud-register/`: `referFraudFinding`, `imposeFraudBan` (through `moderateMember` — ⛔ second writer),
        `liftFraudBan`, `isJoinBarredByFraudBan`; the member annotations.
  - [ ] 3.2 Keys (DL6) — `SEED_PERMISSION_KEYS` with reuse-check comments, the bump block citing Task 0.4's decision (READ LIVE the version),
        grants, pins, the N5 role test.
  - [ ] 3.3 Tests: AC8, AC9 (incl. the planted-failure rollback), AC11.
- [ ] **Task 4 — The API (AC3, AC4, AC8–AC11, AC13)**
  - [ ] 4.1 Contracts (`packages/contracts/src/claims/fraud-investigation.ts`, `.../fraud-register.ts` — `.strict()`, lockstep tests;
        ⚠ new required fields break fixtures — [[project_contracts_tests_outside_tsc]]).
  - [ ] 4.2 Routes + handlers: `apps/api/src/modules/claims/claims.fraud-investigation.{routes,handlers}.ts` (flag, finding; district
        dimension via `resolveNomineeNameCheckDistrict()`; step-up on the finding) registered in `registerClaimsModule`; a NEW module
        `apps/api/src/modules/fraud-register/` (list, refer, impose, lift; pariwar dimension; step-up) registered in `server.ts`; both in the
        human-actor gate's coverage set; the impose handler's post-commit reuse (Task 0.1 (ii)); audits (DL14).
  - [ ] 4.3 Sign-up (DL7): `isJoinBarredByFraudBan` BEFORE the two locks on EVERY creation path; 403 `auth.join_barred`; audit.
  - [ ] 4.4 Tests: the API legs of AC3, AC4, AC8–AC11, AC13.
- [ ] **Task 5 — Peer-mesh (AC12)** — DL11 in `known-people.ts` (through the leaf); the fence's site list; rewrite the accepted-cost comment.
- [ ] **Task 6 — Surfaces (AC14, AC15)** — admin client + hooks (copy `postDeathCertificateReview`); `FraudInvestigationPanel.tsx`; the
      helpline flag; the `/fraud-register` route + page; copy in `i18n-en.ts`; component tests; the mobile barred state + en / hi keys +
      microcopy + friction disposition; executed announcement tests; the browser pass (or un-attested).
- [ ] **Task 7 — Close** — DL15 anonymize + AC16's leg; DL17's annotations in `deferred-work.md` (exact words); the 6.38 / 6.20 / 6.36
      code comments that say "⛔ producer until 6-22" re-worded (grep `6-22` across `apps` `packages`); `ci:local` on a FRESH container on the
      story's own DB; Completion Notes, File List, Change Log; Status → review.

## Dev Notes

### Traps

- **TR1 — "Release" is NOT "erasable".** After an innocence finding, an `active` member's erasure is still `rtbf.invalid_state` (6.38
  round 4 patch 9). Assert the ordinary refusal, ⛔ success.
- **TR2 — The fence (G4) fires on the NAME.** Any new file that spells `'member_found_innocent'` or imports `CLAIM_NOMINEE_FINDING_KINDS`
  goes RED. Prefer calling the existing writer / the leaf; where a new file MUST name a kind (DL2's guilty writer), add it to the
  allow-list with a history line — ⛔ widen the scan's pattern. DL11 must go THROUGH the leaf, or be added to (i)'s site list.
- **TR3 — Fixtures replay.** A member with zero events replays to `pending-kyc` and the door refuses it; seed through real events to
  `lock-in` / `active` (`seedOpenMemberStream`, `seedLifecycleMember`, `seedSubject({ replayed: true })`). `recordMemberInnocenceFinding`
  replays the claim stream through `projectClaimState` — a `seedClaim` row with ⛔ events fails it; seed a claim WITH events (6.38 TR2).
- **TR4 — RLS masks the tenant predicate.** A cross-Pariwar test as `twt_app` never exercises the SQL's own `pariwar_id` filter — also run
  on an unscoped superuser connection — reuse the helper 6.38's round-2 patch 10 test used (find it by that test; ⚠ ⛔ helper is named
  `asUnscopedSuperuser` — a name an authoring trace invented, removed at v1.0) (6.38 R2 P10). The ban's SIGN-UP read is DELIBERATELY cross-tenant: test it from a DIFFERENT Pariwar.
- **TR5 — Every way in.** The ban is worthless if one creation path skips it. Task 0.1 lists every writer of `members` /
  `member_identities` (at least `member/identity-write.ts`, `member/project.ts`, the sign-up handler; check helpline-assisted, field-worker
  and WhatsApp-code sign-up — 5.13 — and any re-activation of a `withdrawn` / `anonymized` identity). AC10 runs once per path.
- **TR6 — `moderateMember`'s legality and dwell.** `none → terminate` is illegal — suspend FIRST, in the same transaction; the dwell
  needs the immediate-termination reason; terminate needs BOTH escalation ciphertexts (the `escalation_iff_terminate` CHECK). Copy the
  terminate route's body validation — ⛔ invent defaults.
- **TR7 — The new close trigger is a `z.enum` widening.** Every `switch` / `if` on `trigger` must still type-check AND behave: the
  suspicion notice must ⛔ send `closed_after_appeal` for `member_found_alive`; OP10 must ⛔ treat it as a holding-claim closure.
- **TR8 — Restore vs ban.** An allowed termination appeal (10.22) or `member.restore_terminated` makes the person a member again; the ban
  stays standing and bites only if they LEAVE and try to come back. ⛔ "fix" it by lifting the ban on restore (⛔ appealable — `-238`).
- **TR9 — Two locks, one order.** The finding writer takes intake → claim row. `imposeFraudBan` touches the member's moderation rows and the
  claim; take the claim row first, then the member (the moderation writer's own locks) — and prove ⛔ deadlock with the terminate route on
  the same member (a two-connection race; 40P01 ⇒ a mapped 409, ⛔ 500 — the 6.20 lesson).
- **TR10 — Numbers collide with 6.39.** Catalog v57, `CLAIM_EVENT_TYPES` 38, migrations ≥ `0194` are 6.39's PROPOSED numbers. Whichever
  lands second renumbers on rebase; the drizzle journal's `when` order matters ([[project_sibling_migration_when_order_shared_db]]).
- **TR11 — Case-normalised keys.** `intakeAdvisoryLockKey` lower-cases; a raw `body.member_id` may not — probe with an UPPER-case id (6.38
  R2 P1).
- **TR12 — Withholding on the wire.** The member sign-up screen says nothing about a ban (PQ4 B) — so the 403 body carries ⛔ `details`,
  ⛔ ban id, ⛔ date ([[feedback_withholding_must_be_uniform]]; 6.38 TR10).

### What this story does ⛔ do

⛔ Collect, store or match PAN / Aadhaar / father's name; ⛔ ban a nominee or claimant; ⛔ investigate a death that DID happen
(post-death rewrite, fake certificate — `6-22b`); ⛔ delete anything (`-240` cl. 1 — `6-22b`); ⛔ produce `nominee_disqualified` or pay on
proof of succession (`6-22c`); ⛔ touch a committed claim (`6-22c`); ⛔ change `isDeathReportStanding`; ⛔ add a moderation reason code; ⛔
change the termination notice; ⛔ notify a claimant or nominee.

### Project Structure Notes

- Domain: `packages/domain/src/claim/fraud-investigation-persist.ts` (flag, finding), `claim/nominee-lock.ts` (DL12),
  `packages/domain/src/fraud-register/` (NEW — refer, impose, lift, the bar), schema files `claim_fraud_investigation_steps.ts`,
  `fraud_register_bans.ts`, policies, ids, `member/known-people.ts` (DL11), `member/anonymize.ts` (DL15), `rbac/permissions.ts`,
  `rbac/roles.ts`.
- Migrations: `packages/domain/migrations/` (the next free numbers; journal).
- API: `apps/api/src/modules/claims/claims.fraud-investigation.*`, `apps/api/src/modules/fraud-register/` (NEW),
  `apps/api/src/modules/auth/member/signup.handlers.ts` (+ every other creation path), `apps/api/src/audit/audit-sink.ts`.
- Contracts: `packages/contracts/src/claims/fraud-investigation.ts`, `packages/contracts/src/fraud-register.ts` (or under `admin/` — follow
  the moderation contracts' placement).
- Admin: `apps/admin/src/modules/claim-verification/FraudInvestigationPanel.tsx`, `modules/helpline-claims/*`, NEW
  `modules/fraud-register/`, `router.tsx`, `api/client.ts`, `i18n-en.ts`.
- Mobile: the sign-up flow beside `apps/mobile/app/(auth)/rejoin-locked.tsx`; `packages/i18n/locales/{en,hi}/common.json`.
- ⚠ Epic placement: kept in Epic 6 (the release is a claim-path fact; the row key is cited by four decisions). The sanction is a
  moderation act (Epic 10's instrument) — the module boundary (`fraud-register/` separate from `claim/`) reflects it.

### References

- Decisions: `2026-09-21-238`, `-239`, `-240`, `-241` §6; `2026-09-25-243`; `2026-09-28-261` D3, `-262` FQ4; `2026-10-10-311` PM1;
  `2026-10-16-339` RF1, `-340`; `2026-10-30-423` Q1 (b); `2026-10-31-424` Q2 (a); `2026-10-31-425` DL4, DL7, DL12 (ii).
- Routing notes: `trustee-panel-routing-note-2026-09-21-fraud-register-what-we-keep.md`,
  `…-2026-09-21-fraud-register-how-far-the-ban-reaches.md`, `…-2026-09-20-6-20-living-member-locked.md`.
- Stories: `6-20-nominee-declaration-history-and-as-at-death-rule.md` (AC2's release route, D8, D17(c), P5);
  `6-38-death-locks-erasure-and-non-member-claims-refused.md` (N1, DL4, DL7, TR2–TR10, review rounds 1–5); `6-21a` (the review table
  template); 10.18–10.22 (moderation, the `trustee_panel` role, the appeal).
- Code: as cited in G1–G17.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-01 | 1.0 | Created by `bmad-create-story 6.22` in its own worktree, traced at `beae5116`, pinned at `origin/main` `3d6b46c5`: the counsel-free first half of the fraud register (DL0 — the identifier set, filer bans and deletion → row `6-22b`, counsel-gated and ⛔ yet asked; the disqualified-nominee ladder and committed-claim recovery → row `6-22c`); DL0–DL18 PROPOSED; PQ1–PQ4 + TL1–TL4 for ONE non-blocking note; AC1–AC16. Row `backlog → ready-for-dev`; ledger `2026-11-01b`. |
