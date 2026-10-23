---
baseline_commit: 69e35f73
---

<!--
PINNED: `69e35f73` = `origin/main` (`git fetch origin` 2026-10-23, after 8.15 landed; the branch was rebased onto it). Created at `b883dc15`;
validated at `40420410`. Of the commits since: 3.3c's touch KYC-name files (only `packages/contracts/src/_common/primitives.ts` is cited here
— G5: `MobileNumber` unchanged); 8.15's touch pool / contribution files only — ⛔ claim, nominee or jobs code moved. Built in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/6-36d-exclude-nominees-from-the-five`, branch `story/6-36d-exclude-nominees-from-the-five`
([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — ⛔ switch the main checkout; peer sessions and sibling
worktrees 6-35 / 8-15 exist). Two facts, stated separately: (1) the pin is an ancestor of this branch (durable); (2) every `apps/` /
`packages/` claim below was re-derived at `40420410` on 2026-10-23 and re-checked against `69e35f73` (perishable — re-check at Task 0.1).
Re-locate by FUNCTION, ⛔ by line number (a cite can be exact and still sit in the wrong function).

STATUS: ready-for-dev (v1.3). Build decisions (2026-10-23): BigDev accepted the recommendation on ND1–ND6, ND8, ND9; ND7 (b) and ND10's
Panel half are Trustee-ratified by `2026-10-23-384` (BigDev confirmed both as build decisions). ONE author-commit records them BEFORE any code (Task 0.3,
[[feedback_governance_commits_precede_implementation]]). Task 0.2 is complete (incl. the `-356` reading and the accepted data-model gap, G18).

§0 GATE (the routing template's): which members are asked is the AUTHOR's — the class `-340` §0 states (*"Call 2 removes the people who
asserted the death from the pool"*; `-341` the same for reporters), each by author-commit, ⛔ routed (and ⛔ told to the Panel since);
removing a person with a stake in the payout is the analogous class. TWO halves touched §0 bullets and were SPLIT OFF to the Panel: ND10
(*"a LEGAL or consent BASIS for handling someone's data"* — the nominee's mobile used for a new internal purpose) and ND7 (the nominee
declaration as a NEW channel by which a family can change who is asked — an extension of `-331` SC1 A's staff warning, `-330` SW20 (ii)).
Both ANSWERED by `2026-10-23-384` (Q1 A, Q2 A). Counsel's WRITTEN confirmation of the data ground stays a GO-LIVE condition (Row 31 (i)),
⛔ the build, ⛔ the merge.

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never") · ⭐ = action /
emphasis · ⚠ = hazard.

ADDRESSING RULE: ⛔ file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite decision id +
clause, item heading, row key).

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*): each is "the next free one" at the
commit that takes it. At the rebase (2026-10-23): decisions — `-383` on `main` (8.15), `-384` on THIS branch (the Panel's ruling) ⇒ the
author-commit takes ≥ `-385`. Migrations — highest `0178_member-wa-opt-in-codes` everywhere ⇒ `0179`, ⚠ ALSO planned by row 6-35 (see
Sequencing). Ledger letters: `2026-10-22w` is this story's creation line; `2026-10-23a`–`f` are 8.15's (on `main`); this branch's
`2026-10-23` lines are `g` (validation), `h` (the note), `i` (the ruling) — re-lettered from `b` / `f` / `g` at the rebase, since 8.15
landed first; the cleanup takes the next free letter at its commit (`j` when checked — re-grep then). ⛔ Claimed by this file. ⛔ A new roster row is needed (ND10 adds leg (i) to Row 31).

LETTERS: G = found facts (traced to code at the pin) · ND = build decisions (DECIDED 2026-10-23) · PQ = Panel questions (ANSWERED,
`-384`) · TR = traps.
-->

# Story 6.36d: A Member's Nominees Are Never Among the Five Asked About Their Death — Matched by Phone Number at Selection and Again Before Every Message `[PRIMITIVE]`

Status: done

> ⭐ **Next: Task 1 (code)** — re-run Task 0.1's preflight first. Governance is DONE: Task 0.2 (ND1–ND10 decided, the Panel has ruled `-384`,
> the `-356` reading answered), Task 0.3 (`-386`, committed alone as `bd249a6f`), Task 0.4 (the records); earlier: the author-commit is committed ALONE (Task 0.3), the records commit follows (Task 0.4), and only then Task 1.
>
> *Dated 2026-10-23 (third review round): the banner above was true at v1.5 and is STALE — Tasks 1–7 are done, the code was reviewed three times and rebased onto `origin/main` `d87d047a`; the story is `review`, awaiting BigDev's calls (the AC10 exception; an optional re-run of the fresh-database gate). See `### Review Findings` and the Debug Log.*

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

When a member dies, the Trust texts up to five of that member's colleagues (otherwise the people the member named) and asks what they know
(6.36 selection → 6.27c texts → 6.31 WhatsApp reminder). A member's NOMINEES are the people who receive the payout. If a nominee happens to
be a colleague, today they can be one of the five — and their answer is ⛔ independent (BigDev, 2026-10-19: *"if nominee could be neighbour,
how do we expect to get honest answer?"* → *"Exclude at selection"*). This story adds ONE conjunct to the ONE eligibility predicate
(`peerMeshEligibleMemberSql`): a member whose login mobile is one of the deceased's nominee mobiles **as recorded before the filing cut**
(ND1 (b) — the same `-339` cut the five are chosen by) is ⛔ eligible. A nominee row has ⛔ member link and its mobile is stored ⛔ hashed, so ONE domain function decrypts
the deceased's ≤ 2 nominee mobiles OUTSIDE any transaction, normalises them, hashes them into the login blind-index space, and the
predicate matches those hashes against `member_identities.mobile_blind_index` in SQL. Because the predicate is shared, the same exclusion
applies at selection (6.36), at every send-time re-check and replacement (6.27c), and at the WhatsApp reminder's re-check (6.31). A nominee
change in the 90 days before the filing also raises the existing staff line (ND7 (b)).

## Story

As the Trust,
I want the people a member declared as nominees never to be among the members asked about that member's death,
so that every answer the Trust weighs comes from someone with ⛔ stake in the payout.

## 📜 Policy meaning (AI-10-1)

**This story CHANGES a predicate** — it adds a conjunct to `peerMeshEligibleMemberSql`, the ONE predicate that decides which members may be
asked about a death. **In the member's terms:** *"When the Trust picks members to ask what they know about your death, it leaves out anyone
you named as a nominee who is also a member and signs in with the mobile number you gave for them — they would receive the support, so the
Trust asks your colleagues, or the people you named as knowing you, instead. The Trust compares your nominees' numbers with members'
numbers only for this, and keeps no number from the comparison (if someone already chosen is later found to match, staff see that they
are a nominee); being someone's nominee costs you nothing of your own."*

**Checked against the Niyamavali** (canonical home: the private repo `ulanzi1/twt-legal` (`-167`); read from the main checkout's gitignored
copy `docs/legal/niyamavali.md`, dated 2026-08-16 — a rulebook, ⛔ ratified, [[feedback_niyamavali_rulebook_not_spec]]): §2.4 (one or two
nominees, declared at signup or in Life Events), §6.1 (the nominee or a bereaved relative files), §6.2 (the Trust verifies the event, the
entitlement and the documents) — ⛔ clause says who is ASKED, so ⛔ conflict on the selection rule. Part 10 (*"processes
member/nominee/claimant data lawfully, for specified purposes, on a lawful basis"*) bears on the NEW purpose (comparing nominee numbers) —
the Panel permitted it (`-384` Q1 A); counsel's written confirmation of the ground is a go-live condition (Row 31 (i)). **What the predicate decides:** who is asked — ⛔ what a family is owed. The peer
mesh is a signal, ⛔ never a gate (`-263` FQ10 A). Its one visible consequence: at a small workplace where
every colleague is a nominee, the claim can reach "nobody to ask" and the ground inspection carries it (`-330` SW25) — the consequence the
filer exclusion already has (G15), unrecorded there. ⛔ A member's own benefits, eligibility, coverage or consent are touched.

*Dated note 2026-10-23 (code review of 6.36d, patch 8 — the narrowing of THIS story's own sentence; `-384` Q1 as put is ratified text and stays unedited).
The parenthesis "(if someone already chosen is later found to match, staff see that they are a nominee)" describes DEFENSIVE DEPTH, not an expected case:
the selection already excludes the nominee, the nominee set is frozen at the cut, and the sign-up number is written at sign-up only (`member/identity-write.ts`;
⛔ change writer — G18), so `peer_is_nominee` is reachable in production only for a selection drawn before this story ships and re-checked after it; the
M11 / M12 legs reach it by `UPDATE member_identities`. The sentence stays as the member-facing meaning; this note records its reach. The reviewer's call,
⛔ the Panel's.*

## The rulings and decisions this story builds on

| Source | Key (verbatim, short) | Status |
|---|---|---|
| `-310` CF4 A | *"The people asked are: the members at the member's workplace … otherwise up to three members the member named who agreed; otherwise nobody … ⛔ Never the district; the family ⛔ never chooses."* — ⛔ exception list | ⭐ TRUSTEE-RATIFIED |
| `-331` SC1 A | the action: *"staff are told when the member's workplace or the people they named changed in the 90 days before the claim"*; the accepted cost: *"a family that plans ahead can still change who is asked — staff see the warning, and the ground inspection always runs"*; SC1 narrowed CF4 A at *"the family ⛔ never chooses"* (`-331` §0) | ⭐ TRUSTEE-RATIFIED |
| `-339` RF1 C | carries A as put: *"A change made to the dead member's account after the first filing ⛔ never decides who is asked, on any later claim."*; A's accepted cost: *"A genuine correction made between two claims … is ignored too, and staff are ⛔ not told of it; the ground inspection always runs."* | ⭐ TRUSTEE-RATIFIED — the cut ND1 (b) reuses; ⛔ decides ND1 (A's text and cost are scoped to a LATER claim; `-340` call 1 reads it so: *"a refile asks the same five, minus anyone no longer eligible (SW23 is read at selection time)"*) |
| `-330` SW20 (ii) — the staff line (ratified in its effect, `-331` Consequence 3) | staff see ONE line when the dead member's latest posting was recorded, or any of their named people was ACCEPTED or REMOVED, in the 90 days before the cut; the shipped copy matches SC1 A's words | AUTHOR-COMMIT, ratified in effect — EXTENDED to nominee changes by `-384` Q2 A (ND7 (b)) |
| `-303` Q1 A | *"EACH OF THE FIVE IS TEXTED, NAMING THE MEMBER"* — ⛔ defines who the five are | ⭐ TRUSTEE-RATIFIED |
| `-356` | *"drop WhatsApp only notification for nominee."*; its NOT-ratified reading (ii): a member nominee's existing member opt-in *"does not count by itself"* | ⭐ TRUSTEE-RATIFIED (ruling); (ii) ⛔ ratified |
| `-234` V / `-233` | `-234` V: *"allowing nominee change until claim has been filed. However if nominee has been changed after death that nominee claim will be denied"*; our reading (⛔ ratified, `-234` Consequence 1): the lock starts at the first claim; `-233`'s *"After member has died nominee they declared cannot be changed"* is read through it | ⭐ TRUSTEE-RATIFIED (the rulings); the lock-at-first-claim reading ⛔ ratified |
| `-235` Y / `-239` | `-235` Y: *"A change done before a day of death will be assumed to be done by member, everything else will be discarded."*; `-239`: *"'dated on or after the day of death' by itself enough to treat it as deliberate … System shouldn't refuse the claim, district admin will act upon suspicion and refuse"* | ⭐ TRUSTEE-RATIFIED |
| `-352` Q2 | the Panel's words: processing the nominee's personal data *"(phone number/email) to reach out is permissible if it is necessary to enforce legal rights, prevent fraud, or fulfill contractual/regulatory obligations"*; its not-covered (a): whether the DPDP Act has that ground *"is for counsel to confirm in writing"* | ⭐ TRUSTEE-RATIFIED — SUPERSEDED IN PART by `-356` (WhatsApp to the nominee); the ground stands as the Panel's statement, its not-covered (a) is counsel's — EXTENDED to the comparison by `-384` Q1 A |
| `-384` Q1 A / Q2 A | Q1 A: *"Yes — use the nominee's number for this check."* — cost as put: *"One more use of the nominee's number. Our lawyer has not yet confirmed the legal ground you quoted; nothing goes live until that is done."*; Q2 A: *"Yes — warn staff about nominee changes too."* — cost as put: *"One more reason for the warning to show — including when someone re-saved the nominees without changing them, or declared them at sign-up within those 90 days."* | ⭐ TRUSTEE-RATIFIED (DR + KB, 2026-10-23) — settles ND7 (b) and ND10's Panel half; the exact staff-line words stay the author's |
| `-263` FQ10 A | *"THE CHECK WITH NEIGHBOURS IS A SIGNAL, ⛔ NOT A GATE"* | ⭐ TRUSTEE-RATIFIED |
| `-311` PM1 (i) | *"Ineligible members — ⛔ not `active`, or with a claim filed for their own death, or with ⛔ no sendable mobile — are FILTERED when the people are first chosen"*; §0 *"⛔ never a narrowing"* | AUTHOR-COMMIT |
| `-330` SW19 / SW23 / SW25 (the SW block of the 6.36a story file IS `-330`'s record) | SW19: *"⛔ No decrypt, ⛔ no KMS call in the select job"*; SW23: ONE eligibility predicate, read at selection time (I8's exception), and — under *"⚠ Recorded, ⛔ not changed"* — *"a relative of the deceased is ⛔ not excluded"*; SW25: the zero branch | AUTHOR-COMMIT — SW19 SUPERSEDED IN PART; SW23's recorded residual NARROWED (Task 0.3) |
| `-306` §2 item 1 | *"The claimant stays excluded; a relative is flagged by 'How do you know [member]?'"* | AUTHOR-COMMIT — SUPERSEDED IN PART (Task 0.3) |
| `-340` call 2 | *"⛔ NOBODY WHO FILED ANY CLAIM FOR THIS DEATH IS ASKED ABOUT IT"* — example *"a colleague who is also the nominee files"*; §0 *"Call 2 removes the people who asserted the death from the pool"* | AUTHOR-COMMIT — ⭐ THE PRECEDENT |
| `-341` | *"⛔ NOBODY WHO REPORTED THE DEATH IS ASKED ABOUT IT, THROUGH ANY CHANNEL"* — *"C, a colleague and the nominee, can be one of the five asked about the death C reported"* (the gap it closed) | AUTHOR-COMMIT — ⭐ THE PRECEDENT |
| `-365` MATCH (iii) / WR2 (ix) | nominees leave the five at SELECTION (row 6-36d), *"so the reminder carries ⛔ nominee check and `-356` is never in play"*; (ix) "still an eligible member" | AUTHOR-COMMIT — MATCH (iii) AMENDED IN PART (Task 0.3) |
| `-366` decision 5 (vii) | (ix) *"applies who the five ARE (`-310` CF4 A and `-311` PM1's filters)"*; *"a nominee-member selected as one of the five can be texted and, if opted in, reminded — the exposure the story records"*; `-365` MATCH (iii) is CONDITIONAL until row 6-36d ships | AUTHOR-COMMIT |
| BigDev, 2026-10-19 (6.31 validate, in session) | *"Exclude at selection"* — recorded in `-365`'s Occasion and the row's sprint note (⛔ a Panel ruling) | BigDev's decision, recorded |

### §0 re-run — every edge against the ruled words ([[feedback_panel_gate_read_ratified_verbatim]])

| Edge | Ratified text | Verdict |
|---|---|---|
| Removing nominees from the pool | `-310` CF4 A names WHERE the five come from; ⛔ text forbids a filter, and every filter since (`-306` §2 claimant, `-311` PM1, SW23, `-340`, `-341`) is an author-commit; `-366` (vii) reads the filters as part of who the five ARE | **MATCH** (author's) |
| Fewer than five asked | CF4 A itself allows *"otherwise nobody"*; the replacement walk keeps the number at five while the group lasts (`-311` §0: *"⛔ never a narrowing"*) | **MATCH** |
| WHICH nominee set (ND1) | `-339` RF1 C (carrying A): *"… ⛔ never decides who is asked, on any later claim"* — scoped to a LATER claim; `-340` call 1: *"a refile asks the same five, minus anyone no longer eligible (SW23 is read at selection time)"* | **author's, (a) and (b)** — eligibility conjuncts are read at selection / send time (SW23, I8's exception; `-340` reads `-339` the same way); after the first filing the declaration is locked (G10), so neither option lets a family steer. (b) CHOSEN for one set per claim and replay stability, ⛔ because (a) is the Panel's. ⚠ ND1 (c) "every version ever" would let repeated changes exclude many colleagues ⇒ widens SC1 A's accepted cost ⇒ the Panel's |
| "The family ⛔ never chooses" | `-234` V lets whoever holds the member's login change nominees after the death until the first filing; `-235` Y / `-239` discard that change only for the PAYOUT. With ND1 (b) such a change still excludes ≤ 2 colleagues (bounded: ≤ 2 ranks; the replacement keeps five while the group lasts; `-239` makes a change on or after the day of death a ground to refuse). `-331` SC1 A accepted *"a family that plans ahead can still change who is asked"* on the condition *"staff see the warning"* — and its warning covers only *"the member's workplace or the people they named"* | **the Panel's — ANSWERED: `-384` Q2 A** — the exclusion adds a channel to SC1 A's accepted cost (a further NARROWING of CF4 A's *"the family ⛔ never chooses"*), and ND7 (b) EXTENDS SC1 A's action / `-330` SW20 (ii)'s trigger and words to cover it; the Panel chose the extension, so SC1 A's condition (*"staff see the warning"*) holds for the new channel |
| A KMS fault outlasting the retries (ND6) | CF4 A / `-303` Q1 A ask the five; `-295` §0 classes a loss to *"a provider fault — a delivery failure, ⛔ not a policy narrowing"* | **author's (a delivery failure)** — after ND6 (a)'s 24 h of deferral, nobody is asked though colleagues may exist, alarmed, recorded with its OWN skip reason `nominee_check_unavailable` (⛔ the "no colleague" reason) |
| `-356` / `-366` decision 5 | the exclusion removes the reminder-to-a-nominee case for every nominee whose declared number is their login number; the ND8 residual (a different number) is still texted and, if opted in, reminded — the exposure `-366` (vii) recorded | **MATCH** — RESOLVES IN PART `-366` decision 5's condition |
| The nominee's mobile used to exclude | ⛔ ratified text on this purpose. `-352` Q2's ground covers processing the number *"to reach out"* to *"prevent fraud"*; comparing it with members' numbers EXTENDS that ground. The roster's basis line (*"nominee information + bank details → the nominee's own Claim Terms"*, roster Row 17's 2026-08-28 amendment, `-160` cl.3 — with its own limit *"⛔ Nobody may cite this amendment as authority that a member's T&C reaches another person's data"*) does ⛔ reach this: a non-claimant nominee has accepted ⛔ Claim Terms at selection | **the Panel's — ANSWERED: `-384` Q1 A**; counsel's written confirmation of the ground is a go-live condition (Row 31 (i)) |
| The select job decrypts | `-330` SW19 (author-commit): *"⛔ No decrypt, ⛔ no KMS call in the select job"* | **author's — SUPERSEDED IN PART** by the new entry (ND3), ⛔ re-read |
| A relative who is a nominee | `-306` §2 item 1 (*"a relative is flagged by …"*) / `-330` SW23's recorded residual (*"a relative of the deceased is ⛔ not excluded"*) — author-commits; ⛔ in CF4 A as put (`-310`) | **author's** — SUPERSEDES IN PART `-306` §2 item 1 and NARROWS SW23's residual: a relative who is a declared nominee (matched by number) is excluded; other relatives stay flagged only; ⛔ ratified clause moves |

## FOUND FACTS (G) — traced at `40420410`, re-checked at `69e35f73`

- **G1 — the predicate.** `peerMeshEligibleMemberSql(m: SQL, x: PeerMeshEligibilityExclusions)` (`packages/domain/src/claim/peer-mesh-read.ts`;
  `PeerMeshEligibilityExclusions = { readonly deceasedMemberId: MemberId }`). Every column reference inside it is `${m}.…` — callers pass
  `sql\`m\`` (the snapshots) and `sql\`pr_m\`` (`readPeerMeshRequestEligibility`, `insertPeerMeshReplacementPing`). Conjuncts:
  `state = 'active'`; ⛔ named as deceased by any claim (`namedByClaimSql`); a `member_identities` row exists; ⛔ the deceased; ⛔ a claimant
  of any claim for this death (`-340`); ⛔ a filer of any `intake_attempts` row for this death (`-341`). Pure SQL, ⛔ decrypt.
- **G2 — every reader of the predicate** (grep again at Task 0.1 — a sibling can add one). SRC: `getPeerMeshWorkplaceSnapshot` and
  `getPeerMeshNamedSnapshot` (both via `getPeerMeshGroupedSnapshot`, `peer-mesh-read.ts`, called only by `runClaimPeerMeshSelect`);
  `readPeerMeshRequestEligibility` and `insertPeerMeshReplacementPing` (`packages/domain/src/claim/peer-mesh-request.ts`);
  `beginPeerMeshRequest` and `finalisePeerMeshNoSendableNumber` reach them (both called from `claim-peer-mesh-requests.ts`);
  `beginPeerMeshWaReminder` (`packages/domain/src/claim/peer-mesh-wa-reminder.ts`, WR2 (ix)) calls `readPeerMeshRequestEligibility`.
  `getPeerMeshCandidateSnapshot` (the 6.6 cohort reader) is legacy, has ⛔ production caller and does ⛔ use the predicate — ⛔ a G2 reader.
  ⛔ api SRC caller; the reply path does ⛔ re-check (6.36 W3, still open). TEST-tree callers (tsc checks them — every package's tsconfig
  includes `tests/**/*`): `apps/api/tests/integration/claims/peer-request-after-send.spec.ts` (`beginPeerMeshRequest`),
  `packages/domain/tests/integration/claim/peer-mesh-request-concurrency.spec.ts`, `…/peer-mesh-wa-reminder-concurrency.spec.ts`,
  `apps/jobs/tests/claim-peer-mesh.test.ts` (a direct `insertPeerMeshReplacementPing` call; `deps()` / `windowDeps()`), plus the Task 5 files.
- **G3 — the select job holds the claim lock for everything.** `runClaimPeerMeshSelect` (`apps/jobs/src/claim-peer-mesh.ts`) runs ONE
  `withPariwarScope` tx: `lockClaimCase` (FOR UPDATE) → (2) idempotency probe (a selection exists ⇒ no-op; the no-op branch still runs the
  self-heal enqueues) → (3) state guard (⛔ `documents_pending` ⇒ ⛔ selection) → the payload's deceased checked against the claim →
  `resolvePeerMeshFilingCut` → grouped snapshot → `runPeerMeshMetric` → `persistPeerMeshSelection` → zero branch or pings. It is enqueued
  from the OCR hook on EVERY document upload (`singletonKey: claimCaseId`), so most runs are no-ops. `ClaimPeerMeshDeps` has ⛔ encryption
  today and is SHARED with the window worker (`runClaimPeerMeshWindow`). *"⛔ No decrypt, ⛔ no KMS call in the select job"* is `-330` SW19
  (author-commit), restated in 6.36 AC4 (*"The select job decrypts ⛔ nothing and calls ⛔ no KMS … ⛔ no encryption dependency is added to
  the job"*) and Dev Note Trap 2; this story SUPERSEDES IN PART SW19 for the nominee read (ND3).
- **G4 — the nominee mobile has ⛔ hash.** `member_nominees.mobile_ciphertext` is Tier-1 envelope ciphertext, NOT NULL, ⛔ blind index
  (`packages/domain/src/schema/member_nominees.ts`; migration `0025_member-nominees.sql`); PK `(member_id, rank)`, ⛔ rank CHECK (the ≤ 2 cap
  comes from the contract and the writer); the projection is replaced delete-then-insert (`replaceMemberNominees`,
  `nominee/declaration-write.ts`). History: `member_nominee_versions` (`0119`), append-only, `member_nominee_versions_rank_check CHECK
  (rank IN (1,2))`, kinds `declared` / `vacated` (a `vacated` version has NULL mobile), sources `member` / `correction`, `recorded_at`
  NOT NULL, its own `mobile_ciphertext`. RTBF writes a sentinel envelope of `'[anonymized]'` under class `member_nominee` and the real
  Pariwar (`member/anonymize.ts`).
- **G5 — the nominee mobile is stored RAW (⛔ normalised).** Both writers call `encryptNomineeField(raw, pariwarId)` on the typed string —
  the declaration (`apps/api/src/modules/nominee/nominee.handlers.ts`) and the correction (`claims.nominee-declaration.handlers.ts`); the
  input shape `MobileNumber` trims, allows 10–20 chars and `.regex(/^[+0-9][0-9\s\-()]*$/)` (`packages/contracts/src/_common/primitives.ts`).
  The member's login mobile is canonical E.164 (`normalizeMobile` then `encryptMobile(canonical)`). ⇒ `normalizeMobile` after decrypt is
  MANDATORY. `normalizeMobile` handles a 10-digit number, 12-digit `91…`, 11-digit `0…`, `+`, spaces and hyphens; a 13-digit form
  (`0091…`, `+91 0…`) returns `null`; `null` (invalid, sentinel) excludes nobody.
- **G6 — the member side is already hashed.** `member_identities.mobile_blind_index` = HMAC class `member_mobile` under the global
  `MEMBER_IDENTITY_NAMESPACE`, UNIQUE per `(pariwar_id, mobile_blind_index)` (`member_identities_pariwar_mobile_uq`); every member has exactly
  one identity row ([[project_member_always_has_mobile_invariant]]). `mobileBlindIndexMany(canonicals, enc, { pariwarId, purpose })`
  (`packages/domain/src/encryption/member-fields.ts`, built for 6.36b) returns the same indexes as `mobileBlindIndex`, in order — *"⛔ Never
  call it inside a transaction"*; an empty batch calls nothing; `purpose` is a free string checked by `AUDIT_PURPOSE =
  /^[a-z][a-z0-9_]{0,63}$/` (`blind-index.ts`); the house form is an exported constant (`CONTACT_MATCH_AUDIT_PURPOSE`,
  `KNOWN_PEOPLE_ASK_AUDIT_PURPOSE`). The SQL idiom exists: `mi.mobile_blind_index = ANY(${sql.param([...indexes])}::text[])`
  (`matchedContactPositions`, `packages/domain/src/member/known-people.ts`) — ⚠ that site returns early on an empty list, so an EMPTY array
  in the predicate has ⛔ precedent (TR5). The orchestration shape "short scoped read, closed → batch HMAC outside any tx" ships as
  `matchContactNumbers` with `export type InScope = <T>(fn: (db: Db) => Promise<T>) => Promise<T>` (same file).
- **G7 — the decrypt helper exists.** `resolveCorrectionMobile(serialized | null, source, pariwarId, enc)`
  (`packages/domain/src/claim/correction-crypto.ts`) — `null` for null / blank; otherwise decrypt under the source's class with the REAL
  `pariwarId`, then `return normalizeMobile(plaintext)` (so a sentinel or invalid number ⇒ `null`, ⛔ throw). It THROWS on a KMS fault AND on
  a malformed envelope (`parseEnvelope`). Jobs-side precedents with `mobileSource` `'member_nominee'`: `scheduler/claim-correction-reminders.ts`,
  `claim-certificate-reminders.ts`, `claim-suspicion-notices.ts`, `claim-contact-ladder.ts` — all read `member_nominee_versions`; ⛔ jobs
  src reads `member_nominees` today.
- **G8 — the hash spaces are disjoint on purpose.** `field-classes.ts` (`CLAIM_CONTACT_MOBILE_FIELD_CLASS`): *"⛔ DELIBERATELY ⛔ NOT
  `MEMBER_MOBILE_FIELD_CLASS` … that hash IS `member_identities.mobile_blind_index`, the login key — using it here would make every reminder
  row joinable to a member's identity."* That warning is about STORING a hash. This story computes a login-space hash TRANSIENTLY and
  stores ⛔ it (the 6.36b contact-matching precedent) — ⛔ `correctionNumberHash` (wrong space).
- **G9 — jobs KMS writes ⛔ audit line.** Only `apps/api/src/deps.ts` sets `kms.auditHook`; `apps/jobs/src/boot.ts` does not ⇒ the
  [[project_kms_audit_per_hmac_global_lock]] trap does not bite in jobs (and the `purpose` string is recorded nowhere in jobs). The jobs pool
  is `max: 2` ([[project_jobs_pool_two_connection_starvation]]) ⇒ the KMS work runs with ⛔ transaction open (a short scope-tx read, closed,
  then KMS, then the locked tx). `jobsEncryption` (`buildJobsEncryptionDeps(pepper)` = `{ kms, kekRef, hmacKeyRef }`, structurally
  `FieldCryptoDeps`) is in scope at the select worker's registration in `boot.ts`.
- **G10 — the declaration is stable after filing; corrections come later.** It LOCKS at the first claim (`claim/nominee-lock.ts`; the D3
  advisory lock `intakeAdvisoryLockKey` serialises an edit with intake); only an innocence finding releases it. Between the death and the
  first filing it can still change (`-234` V). Corrections and nominee determinations are recordable only in `CLAIM_REVIEW_WINDOW_STATES`
  (`verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed` …, `review-window.ts`) — ⛔ at selection
  (`documents_pending`), where `getEffectiveNomineeDeclaration` reads `undetermined`; at send / reminder time one can exist. A correction
  updates `member_nominees` only when it corrects the rank's HEAD (`applyCorrectionToProjection`; *"the projection can LAG a correction
  (D16)"*). The version that a rank's projection was last written from, as of any set of versions, is `projectedVersionOfRank(versionsInOrder)`
  (`nominee/declaration-history.ts`, pure; `null` for a `vacated` tombstone); `listNomineeDeclarationVersions(db, pariwarId, memberId)`
  returns every version, rank then `version_no` ascending, ciphertext as stored.
- **G11 — send time (6.27c).** `beginPeerMeshRequest` locks claim then ping, then ① window ② the claim-wide name fault (read BEFORE the tx)
  ③ `readPeerMeshRequestEligibility` — the SAME predicate plus labelling columns in order `peer_not_active`, `peer_reported_deceased`,
  `no_sendable_number`, `peer_filed_for_this_death`, fallback `peer_not_eligible`. A fresh failure ⇒ `no_target:<reason>` +
  `insertPeerMeshReplacementPing` (walks `ranked_member_ids` through the predicate, `LIMIT 1`); a re-claimed row ⇒ `error` +
  `exhausted:recheck_peer_ineligible`. The child (`apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`, `runPeerMeshRequestChild`) handles
  ONE claim per run (`enqueuePeerMeshRequestChild`, `singletonKey: claimCaseId`, batch 1), reads the due queue, returns `nothing_due` BEFORE
  decrypting anything (6.27c review round 2 P5), then reads the deceased's name ONCE outside any tx (`readMemberFacingDeceasedName` — on a
  decrypt fault it alarms and throws `ClaimCorrectionTransientError` before any begin). The child calls only `beginPeerMeshRequest` and,
  after commit and an unusable decrypted number, `finalisePeerMeshNoSendableNumber` (a second locked tx); each calls
  `insertPeerMeshReplacementPing` inside. Child jobs retry `CHILD_RETRY_LIMIT` (4) times with a 60 s base delay and backoff.
- **G12 — the label vocabulary is pinned in many places.** Source: `PEER_MESH_REQUEST_REPLACEABLE_REASONS` and
  `PEER_MESH_REQUEST_DETAIL_PATTERN` (`packages/domain/src/schema/claim_peer_mesh_pings.ts`); migration `0166_peer-mesh-request-sending.sql`'s
  two CHECKs (`claim_peer_mesh_pings_detail_vocabulary_check`, `…first_detail_vocabulary_check` — named `*_vocabulary_check` so they sort
  after 0156's `*_length_check`) and its `CREATE FUNCTION claim_peer_mesh_pings_replacement_guard()` with a hard-coded IN-list (0166 is the
  only definition of all three). Tests: the R4 leg *"the four labels cover today's predicate"*
  (`packages/domain/tests/integration/claim/peer-mesh-request.spec.ts`); the same file's `it.each(PEER_MESH_REQUEST_REPLACEABLE_REASONS
  .filter((r) => r !== 'peer_not_eligible'))` driving an `exclude(s, m, reason)` switch; `packages/domain/tests/claim/peer-mesh-request-detail.test.ts`
  (`expect(noTarget).toEqual([...PEER_MESH_REQUEST_REPLACEABLE_REASONS, ...PEER_MESH_REQUEST_NAME_REASONS])` — the regex's `no_target:(…)`
  alternation must list labels in the SAME order as the array); `packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts`
  (asserts each CHECK's `pg_get_constraintdef` pattern `toBe(PEER_MESH_REQUEST_DETAIL_PATTERN)` — byte for byte);
  `packages/domain/tests/claim/_peer-mesh-request-details.ts`; `packages/channels/tests/sms.test.ts` (`new RegExp(…DETAIL_PATTERN)`).
  The staff console shows `detail` verbatim (`peer-answers-assembler.ts` `noTargetReason`; `PeerMeshView.tsx`; contract
  `z.string().nullable()` — ⛔ copy key, ⛔ enum) — to the District Admin and later approvers, ⛔ the inspector, the helpline or a member
  (CF2). Those audiences already see the nominee declaration.
- **G13 — the reminder (6.31).** `beginPeerMeshWaReminder` re-checks with `readPeerMeshRequestEligibility` and finishes a failure as
  `skipped_recipient_ineligible` (one bucket, ⛔ label). Its child (`runPeerMeshWaReminderChild`, `claim-peer-mesh-wa-reminders.ts`) is one
  claim per run, returns `nothing_due` first, and already has `ClaimPeerMeshWaReminderDeps.encryption`.
- **G14 — what is recorded.** `claim_peer_mesh_selections.candidate_snapshot` (jsonb) and `ranked_member_ids` are built from the FILTERED
  candidates ⇒ an excluded person never appears; replay (`replayPeerMeshSelection`) reads the persisted row only; `anchor_claim_case_id` is
  the claim whose filing `-339`'s cut is (set from `resolvePeerMeshFilingCut`; NULL only on a legacy row); `-340` / `-341` added conjuncts
  WITHOUT a `metric_version` bump. `skip_reason` is plain text (⛔ CHECK). `claim.peer_mesh_none_to_ask`'s payload is
  `{ ...auditShape, metric_id, metric_version }.strict()` (`claim/events.ts`). ⛔ Excluded count is recorded anywhere, for filers either.
  `recent_change_before_filing` is the SC1 A staff line: `getPeerMeshGroupedSnapshot` sets it from the deceased's posting change OR
  `getPeerMeshNamedChangeBeforeFiling` (`member_known_people` changes in `[cut.recentFrom, cut.cut)`); the admin copy
  (`apps/admin/src/modules/claim-verification/i18n-en.ts`, key `peerMesh.recentChangeBeforeFiling`) reads *"The member's workplace or the
  people they named changed in the 90 days before the filing used to choose whom to ask."*; `apps/admin/tests/peer-mesh-source-not-on-inspector-wire.test.ts`
  keeps the flag off the inspector's wire.
- **G15 — the zero branch's reason is already imprecise.** When every colleague is excluded (a filer today; a nominee after this story) the
  group is empty and the reason is still `no_workplace_colleague_or_named_person`. ⭐ An empty WORKPLACE group falls through to the NAMED
  group (the predicate filters before grouping) — the behaviour `-340` / `-341` already have.
- **G16 — test fixtures fake the identity.** `peer-mesh-workplace-snapshot.spec.ts`'s `member()` and `apps/jobs/tests/claim-peer-mesh.test.ts`'s
  `insertMember` (via `seedClaim`) seed `mobile_ciphertext 'enc:v1:x'` / `mobile_blind_index 'idx-<uuid>'`; `claim-peer-mesh-requests-live.test.ts`
  builds REAL ciphertexts with its `enc` but still seeds a FAKE `idx-<uuid>` index. The test `enc` is `buildJobsEncryptionDeps(…)` — ⛔
  `mobileBlindIndex` method; a real index is `mobileBlindIndex(<canonical>, enc)` (the domain function). The jobs test pool is a real
  `createDb(DATABASE_URL, { max: 6 })` (`created.pool` reachable); a KMS wrapper precedent is `{ ...enc, kms }` in the 6.27c live test.
- **G17 — the select job's retry policy.** `registerClaimPeerMeshWorkers` calls `boss.createQueue(QUEUE_NAMES.CLAIM_PEER_MESH_SELECT)` with ⛔
  options, and the OCR hook's `boss.send(…)` passes only `singletonKey`. pg-boss's `QUEUE_DEFAULTS` are `retry_limit: 2, retry_delay: 0` ⇒
  three attempts within seconds, then `failed`. ⛔ Dead-letter queue and ⛔ final-failure alarm exist (`deadLetter` / "DLQ" appear only in
  comments). The only exits from `documents_pending` are `claim.peer_mesh_pinged` and `claim.peer_mesh_none_to_ask` (`claim/state.ts`), both
  written only by `runClaimPeerMeshSelect` ⇒ a select job that fails for good leaves the claim in `documents_pending` until another upload
  re-enqueues it. The final-attempt precedent: `job.retryCount >= job.retryLimit` (6.37c's `finalAttempt`, `claim-certificate-reminders.ts`).
- **G18 — the declared number is the ONLY link from a nominee to a member (investigated 2026-10-23 at BigDev's request).** Each member
  has exactly ONE number on file: `member_identities` (one row per member) is written only at sign-up (`member/identity-write.ts`: *"The
  signup flow is the SOLE writer"*); the only UPDATE is erasure (`member/anonymize.ts`, ciphertext → sentinel, blind index kept); ⛔
  history table, ⛔ `member.mobile_changed` event (`-112` 4(b): *"No mobile-change history exists"*); a mobile-change flow is planned
  (AR-24), ⛔ built. ⛔ Second number anywhere: the WhatsApp opt-in keeps a COPY of the login index; 5.13's code table stores a code hash
  and sends to the registered number only; KYC holds ⛔ mobile; `members.custom_fields` rejects phone keys; audit lines keep only the
  last 4 digits. ⛔ Non-phone route: the nominee declaration (`NomineeDeclareEntry`) captures name, relationship, mobile, address and
  split — ⛔ DOB, ⛔ ID, ⛔ member link; names carry ⛔ blind index (`member/search-read.ts`). ⛔ Existing resolver of "is this nominee a
  member" (9.1's console acts as the deceased; 6.36b matches the login space only). ⇒ ND2's match IS the complete phone-based route;
  the residual is a DATA-MODEL gap (ND8), accepted by BigDev.
  > ⭐ *Dated annotation, 2026-10-24 (Story 6.36e Task 0.4, `2026-10-24-397` / `2026-10-24-396` Q1 A) — ⛔ rewritten:* the follow-up row
  > `6-36e-nominee-member-link-at-declaration` is DECIDED (`ready-for-dev`): a member may MARK a nominee who is also a member, found in their
  > own contacts in Life Events, and the link (`member_nominee_links`, off the declaration version) widens ND2's conjunct to match by
  > number OR by account. This G18 stays TRUE at `1268d47e` and until 6.36e is `done` on `main`; `-397` NARROWS IN PART `-386` ND8 from then
  > (for linked declarations only) and SUPERSEDES IN PART ND2's joinability ground.

## ⚖️ Build decisions ND1–ND10 (DECIDED 2026-10-23)

BigDev, at Task 0.2: *"For ND1–ND6, ND8, ND9 - your recommendation is accepted"*; ND7 (b) and ND10's Panel half by `2026-10-23-384`
(Trustee-ratified). Each ND states the CHOSEN option; the rejected ones are kept, briefly, as the record the author-commit carries.

- **ND1 — WHICH nominee set.** **CHOSEN (b): the deceased's declaration AS RECORDED BEFORE THE FILING CUT** — the same cut the five are
  chosen by (`-339` RF1 C's first filing, `resolvePeerMeshFilingCut`): `listNomineeDeclarationVersions` → keep `recorded_at < cut.cut` → per
  rank `projectedVersionOfRank` → that version's `mobile_ciphertext` (a `vacated` rank ⇒ nobody). At selection the cut comes from
  `resolvePeerMeshFilingCut`; at send time and at the reminder it is `peerMeshFilingCut(<the anchor claim's created_at>)`, the anchor being the
  selection row's persisted `anchor_claim_case_id` (this claim's own `created_at` when it is NULL — a legacy row). ⇒ ONE set per claim,
  identical at every check. Why: one set per claim, so selection, every send-time re-check, the reminder and replay all read the same
  nominees; it reuses the cut the five are already chosen by. Both (a) and (b) are the author's (§0 row: `-339`'s words are scoped to a
  LATER claim; `-340` call 1 reads eligibility at selection time). **Rejected:** (a) the CURRENT `member_nominees`, read fresh at every
  check — a District Admin correction of the rank's HEAD (from `verification_in_progress` on, G10) moves the set mid-claim, so selection
  and send would read different sets; (c) every version ever declared — repeated changes could exclude many colleagues (widens SC1 A's
  accepted cost ⇒ the Panel's). **Residuals of (b), recorded:** a post-filing District Admin correction of a
  mistyped nominee number does ⛔ re-exclude — an author-accepted residual (the nearest ratified analogue is `-339` A's cost, *"a genuine
  correction made between two claims … is ignored too"*, whose scope is a later claim, ⛔ this one); a nominee declared on the filing day
  before filing is ⛔ in the set (SC1 A's "before the filing day").
- **ND2 — HOW the match is made.** Decrypt each ND1 mobile with `resolveCorrectionMobile(ct, 'member_nominee', pariwarId, enc)`
  (decrypt + `normalizeMobile`; `null` dropped), de-duplicate, hash with `mobileBlindIndexMany(distinct, enc, { pariwarId, purpose:
  PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE })` (an exported constant `'peer_mesh_nominee_exclusion'`) into the LOGIN space, and add ONE
  conjunct — written with the `${m}` alias, ⛔ a literal `m.`:
  `AND NOT EXISTS (SELECT 1 FROM member_identities pm_n WHERE pm_n.pariwar_id = ${m}.pariwar_id AND pm_n.member_id = ${m}.member_id AND
  pm_n.mobile_blind_index = ANY(${sql.param([...x.nomineeMobileIndexes])}::text[]))`. ONE exported fragment builds the EXISTS
  (`peerMeshNomineeMatchSql(m, indexes)`), used negated by the predicate and plain by the `is_nominee` labelling column, so the two cannot
  drift. ⛔ Stored anywhere; ⛔ logged. **Rejected:** a stored nominee blind index (a migration + KMS backfill, and it would make every
  nominee row joinable to the login key — G8's warning exactly); resolving to `excludedMemberIds` first (an extra query at four sites and a
  check-to-use gap, for ⛔ testability gain).
- **ND3 — WHERE the decrypt happens.** OUTSIDE every transaction: a short scope-tx read, closed; then KMS; then the existing locked tx. In the
  select job the pre-read (one `withPariwarScope` tx) reads the claim UNLOCKED (`getClaimCase(db, pariwarId, claimCaseId)`),
  `getPeerMeshSelectionByClaim` and the cut (`resolvePeerMeshFilingCut`), and RETURNS `null` — ⛔ KMS — when a selection exists, the state
  is ⛔ `documents_pending`, the claim is missing, or the payload's deceased ≠ the claim's. AFTER that tx has returned, the job calls
  `peerMeshNomineeMobileIndexes` with `inScope = (fn) => withPariwarScope(deps.pool, pariwarId, (db) => fn(db))` (its own short tx for the
  version read, closed before KMS) — ⛔ the function called inside the pre-read's callback (KMS would then run inside an open tx, TR3). The
  locked tx then runs every step as today (lock, probe, guard, deceased check) and uses the indexes; it THROWS a retryable error — the retry
  re-reads — if it reaches the snapshot WITHOUT indexes (the state became `documents_pending` after the pre-read) or if its own
  `resolvePeerMeshFilingCut` anchor differs from the pre-read's (an innocence finding on the anchor, or an earlier sibling claim, committed
  in between — unreachable today: nothing writes that finding until row 6-22). A selection that CHOOSES anyone is ⛔ ever made without
  the indexes. The ONE selection written without them is ND6's finish — EMPTY (⛔ candidate, ⛔ one asked), skip reason
  `nominee_check_unavailable` — which reads ⛔ predicate, so the exclusion has nothing to filter. ⛔ KMS call on a no-op or wrong-state run
  (6.27c P5's rule, applied to selection). `ClaimPeerMeshDeps` gains a
  REQUIRED `encryption` (wired from `jobsEncryption`; the shared type forces it on the window worker and the tests' `windowDeps()` too). This
  SUPERSEDES IN PART `-330` SW19's *"⛔ No decrypt, ⛔ no KMS call in the select job"* for this read only (the anchor stays the filing date).
- **ND4 — the send-time re-check.** The 6.27c child computes the indexes ONCE per child run (one run = one claim), keyed on the claim's own
  `deceased_member_id` (`getClaimCase`; ⛔ an envelope field), AFTER the `nothing_due` return and beside the name read, outside any tx, and
  passes them into `beginPeerMeshRequest` and `finalisePeerMeshNoSendableNumber`, which thread them into `readPeerMeshRequestEligibility` /
  `insertPeerMeshReplacementPing`. The 6.31 reminder child does the same for `beginPeerMeshWaReminder`. `nomineeMobileIndexes: readonly
  string[]` is REQUIRED — ⛔ `?`, ⛔ `?? []`, ⛔ a default — on `PeerMeshEligibilityExclusions` AND on every input type on the path:
  `PeerMeshSnapshotInput`, and the inputs of `readPeerMeshRequestEligibility`, `insertPeerMeshReplacementPing`, `beginPeerMeshRequest`,
  `finalisePeerMeshNoSendableNumber` and `beginPeerMeshWaReminder` (`PeerMeshSnapshotInput` itself may stay unchanged, the three predicate
  readers taking `PeerMeshSnapshotInput & { readonly nomineeMobileIndexes: readonly string[] }` — `getPeerMeshNamedChangeBeforeFiling` and
  the ND7 helper use ⛔ predicate); ⛔ a literal `[]` (or `?? []`) passed AS `nomineeMobileIndexes` anywhere in `packages/domain/src` or
  `apps/jobs/src` — the value always comes from `peerMeshNomineeMobileIndexes` (tests may pass `[]`). tsc then lists every caller, src and
  tests (G2). Both children get the cut from ONE domain read `resolvePeerMeshSelectionFilingCut(db, pariwarId, claimRow)` — the selection's
  `anchorClaimCaseId` (this claim when NULL) → `getClaimCase` → `peerMeshFilingCut(createdAt)`; a missing selection or anchor row ⇒ throw
  (the child's transient path, ND6) — called inside the same short read as the version read (the request child's existing `scoped` helper
  already has the `InScope` shape).
  *Dated note 2026-10-23 (code review of 6.36d, patch 9). The build reads the cut and the versions in TWO short scope transactions
  (`readPeerMeshNomineeIndexes`: `resolvePeerMeshSelectionFilingCut`, then `peerMeshNomineeMobileIndexes`'s own `inScope`), ⛔ "inside the same short
  read" as written above and in `-386`. TR3 holds — both close before any KMS call — and the property ND4 serves (ONE nominee set per claim, identical at
  selection and every re-check) is pinned by the ND1 (refile) legs. An implementation detail, ⛔ a change of decision: `-386` is append-only and is ⛔
  superseded. Until now recorded only in the Debug Log.*
- **ND5 — the label.** **CHOSEN (a): a new no-target label `peer_is_nominee`**, labelled after `peer_filed_for_this_death`; a migration
  (next free number) widens 0166's two CHECKs and the trigger's replaceable list; every G12 pin moves in lockstep; the R4 test becomes "the
  five labels cover today's predicate". Audience: the District Admin and later approvers only (G12), who already see the declaration ⇒ ⛔
  new disclosure ([[feedback_withholding_must_be_uniform]]). **Rejected:** (b) fold into the fallback `peer_not_eligible` — a known
  conjunct would land on the "future conjunct" fallback and staff would see a vaguer reason. The label is the author's (ND5); ⛔ `-210`
  cl.2 is needed (that delegation covers the tracking vocabulary).
- **ND6 — a KMS or envelope fault fails CLOSED, and is ALARMED.** A decrypt or HMAC error (a KMS fault OR an unreadable envelope) never
  becomes `[]`. **Request / reminder child:** ONE ids-only alarm (`[jobs] <label>: peer_mesh_nominee_exclusion failed for claim <id> —
  retrying (⛔ ping begun)`, TR12) then `throw new ClaimCorrectionTransientError(…)` before any begin — exactly as `readMemberFacingDeceasedName`
  does; pg-boss retries the SAME job (G11); only that claim is affected. **Select job:** ONE ids-only alarm, then rethrow; the OCR hook's
  `boss.send(CLAIM_PEER_MESH_SELECT, …)` gains the child retry policy (`retryLimit: CHILD_RETRY_LIMIT`, `retryDelay:
  CHILD_RETRY_DELAY_SECONDS`, `retryBackoff: true`) — today three attempts within seconds, then `failed`, with ⛔ dead-letter queue (G17).
  The FINAL attempt is knowable only with metadata: `registerClaimPeerMeshWorkers` registers the select worker with `{ includeMetadata: true }`
  and passes `attempt = { retryCount, retryLimit }` (the 6.37c cast `job as Job & { retryCount?: unknown; retryLimit?: unknown }`,
  `registerClaimCertificateReminderWorkers`) as a new optional 4th argument of `runClaimPeerMeshSelect`; absent ⇒ ⛔ the final attempt.
  The final-attempt arm applies ONLY to the nominee-exclusion fault (a throw from `peerMeshNomineeMobileIndexes`) — a final-attempt "claim
  not found", deceased mismatch or `ClaimStreamConcurrencyError` keeps today's behaviour. **CHOSEN (a) — defer, then finish:**
  - **Defer.** On that final attempt, `boss.send` a fresh select job with `startAfter` 1 h and the same retry policy (the 6.27c
    defer-to-later shape), with an alarm each cycle, then RETURNS (the job completes; ⛔ rethrow after the re-send). The payload gains ONE
    non-PII field, the instant of the FIRST nominee-exclusion failure, carried unchanged into every deferred job — absent on the OCR
    hook's send, so the first re-send sets it to that job's `createdOn` (metadata; ≤ ~15 min before its final attempt). (The select queue's default pg-boss policy puts ⛔
    uniqueness on `singletonKey`, so the re-send from inside the active job is ⛔ dropped.) Cost: a KMS outage delays the neighbour check by
    up to its length; ⛔ claim is skipped for an outage shorter than 24 h.
  - **Finish — once a deferred job's final attempt fails 24 h or more after that first failure.** Open the normal locked tx and run lock →
    probe → state guard → deceased check exactly as today (any of them returning ⇒ ⛔ write); then `resolvePeerMeshFilingCut` and persist a
    `workplace_named_v1` row with `selectedMemberIds: []`, `candidates: []`, `rankedMemberIds: []`, `anchorClaimCaseId` from the cut,
    `previousWorkplaceCounted` / the deceased's workplace ids from a deceased-only postings read (split out of `getPeerMeshWorkplaceSnapshot`
    — it needs ⛔ predicate), `recentChangeBeforeFiling` from all three disjuncts (posting, named people, ND7's nominee versions — none needs
    the predicate); `claim.peer_mesh_none_to_ask`; `skipPeerMesh`
    with a NEW constant `PEER_MESH_SKIP_REASON_NOMINEE_CHECK_UNAVAILABLE = 'nominee_check_unavailable'` — ⛔ the zero-branch constant (it
    would say "no colleague" when colleagues may exist); plus a second alarm. This is the ONE selection written without indexes (ND3) — it
    chooses nobody. The claim moves on; nobody who might hold a stake is asked; the ground inspection carries it (`-330` SW25) — a delivery
    failure, ⛔ a policy narrowing (`-295` §0; the §0 row).
  - **Rejected:** (b) finish at once on the first final attempt — a KMS outage longer than ~15 min (4 retries, 60 s base, backoff) would
    permanently end the neighbour check for every claim that reached `documents_pending` in it; (c) rethrow and leave the job `failed` —
    the claim would stay in `documents_pending` until another upload (the peer mesh becomes a gate on a fault).
  *Dated note 2026-10-23 (code review of 6.36d, patches 1 + 2 and the patch review; ND6 / AC3 text above is unedited). Four refinements, none a change of decision:
  (1) **The first-failure instant** on the first chain is the job's `createdOn` CLAMPED to no earlier than 35 min before the final attempt
  (`PEER_MESH_NOMINEE_CHECK_RETRY_SPAN_MS`: pg-boss's equal-jitter backoff makes the 4-retry chain 15–30 min, plus slack) — the "≤ ~15 min" above is the
  chain's MINIMUM (it takes 15–30 min; ⚠ corrected in the third review round — this note first said "mean"), ⛔ the bound, and `createdOn` includes queue wait. A jobs-worker outage therefore RESTARTS the 24 h window (⚠ on the FIRST chain only — corrected in the fourth review round: a carried instant is ⛔ clamped, so an outage after a deferral counts toward the 24 h): deliberate — the claim waits, it is
  ⛔ abandoned. (2) **The carried `nomineeCheckFailingSince`** is honoured only in the exact `toISOString()` form this file writes; `null`, `'0'`,
  `'garbage 1'` and a date-only string parse to FINITE dates in V8 and would have ended the chain after one failure. (3) **Alarms on a last attempt:**
  "other faults keep today's behaviour" still holds for the OUTCOME (rethrown, ⛔ re-send, ⛔ finish); the addition is ONE ids-only alarm when the
  pre-read or the locked transaction fails with no retry left, and a 'chain LOST' alarm when the 1 h re-send itself fails or creates no job — and
  the "re-sent in 1 h" alarm now follows the send. ⚠ A stranded `documents_pending` claim is ALARMED, ⛔ recovered (deferred-work). (4) The select
  job's wiring is extracted (`claimPeerMeshSelectAttemptOf`, `enqueueClaimPeerMeshSelect`) so it can be pinned without a database.*
- **ND7 — the staff line, and ⛔ other new record.** **CHOSEN (b) — Trustee-ratified, `-384` Q2 A: a nominee version recorded in
  `[cut.recentFrom, cut.cut)` also sets `recent_change_before_filing`** (a third disjunct in `getPeerMeshGroupedSnapshot`, a plain EXISTS
  on `member_nominee_versions` — ⛔ decrypt), and the admin copy `peerMesh.recentChangeBeforeFiling` reads *"The member's workplace, the
  people they named or their nominees changed in the 90 days before the filing used to choose whom to ask."* (en; the admin console has ⛔
  hi file; the words are the author's — `-384` ratified the warning, ⛔ its wording). It keeps SC1 A's accepted cost condition (*"staff see
  the warning"*) for the new channel. **Rejected:** (a) ⛔ staff line (widens SC1 A's cost; the Panel chose Q2 A = ND7 (b)). Also: ⛔ `metric_version` bump (the `-340` / `-341` precedent, G14); ⛔ excluded count, ⛔
  event-payload change; the zero branch keeps `no_workplace_colleague_or_named_person` (G15 — recorded imprecision).
- **ND8 — residuals RECORDED, ⛔ built.**
  - ⭐ THE DATA-MODEL GAP (G18; BigDev ACCEPTED it, 2026-10-23): a nominee who is a member is found ONLY if the deceased typed the number
    that nominee SIGNED UP with. The system records ⛔ member link for a nominee, and each member has exactly ONE number on file — the
    sign-up number, which ⛔ changes and keeps ⛔ history. A nominee who signed up on another number (a second SIM, a family phone, a typo)
    escapes — still selected, texted and, if opted in, reminded (the `-366` (vii) exposure, carried; read as ⛔ within `-356`, Task 0.3).
    The only true fix is a member link captured at declaration (a follow-up row, Task 0.4);
    ⭐ *(dated 2026-10-24, Story 6.36e Task 0.4 — ⛔ rewritten: that row is decided — `-396` Q1 A / Q2 A, `-397` NE1–NE14; the gap NARROWS
    for linked declarations once 6.36e is `done`; a nominee whose sign-in number the deceased did ⛔ hold, often a family phone, stays
    uncovered even then);*
  - a stored number in a 13-digit form (`0091…`, `+91 0…`) normalises to `null` ⇒ ⛔ excluded;
  - a post-filing correction of a nominee number is ⛔ reflected (ND1 (b), an author-accepted residual);
  - a nominee REPLACED between the death and the filing (`-234` V) is ⛔ in the set, though `-235` Y / `-239` may make them the payee — they
    can be among the five; the District Admin's nominee determination and the ground inspection carry it;
  - a colleague matched only because of a MISTYPED nominee number is absent from `ranked_member_ids` for good — ⛔ re-admitted later;
  - a non-member nominee matches nobody (nothing to do);
  - the deceased's OTHER relatives stay un-excluded (deferred-work's family item NARROWS to them);
  - a TEXTED ping and the reply path still do ⛔ re-check (6.36 W3); the answer-counting surfaces (`runClaimPeerMeshWindow`'s
    `distinctPeerMeshResponderCount`, the FQ10 warning) do ⛔ re-derive the exclusion — W3's class;
  - the ND7 nominee disjunct fires on ANY version recorded in the window (the cost `-384` Q2 A accepted) — a re-save that changed nothing, or a sign-up
    declaration — because versions are ⛔ deduplicated (T3, `declaration-history.ts`); the warning over-reports, ⛔ under-reports (the
    posting disjunct already fires on a sign-up posting);
  - the deceased's RTBF turns the nominee ciphertexts (projection AND versions) into sentinels ⇒ nobody is excluded — unreachable for any send (the 6.27c begin's ②
    name fault comes before ③; the reminder finishes `no_target` on the name fault).
- **ND9 — ⛔ backfill.** Nothing is in production ([[project_not_in_production_merge_is_not_golive]]; re-stated 2026-10-20 and in the
  2026-10-22u ledger); an existing selection is ⛔ re-drawn; an unsent ping is re-checked at send time anyway.
- **ND10 — the data basis (the split-off §0 half).** **CHOSEN (a): the Panel was asked — ANSWERED, `-384` Q1 A** (the nominee numbers may
  be compared, only for this) — PLUS a new leg **(i)** on roster Row 31 (`peer-mesh-selection-data-basis`): the Panel's answers recorded as
  `-384`; counsel's WRITTEN basis for comparing the deceased's nominee mobiles with members' numbers to keep an interested party out of the
  check (no number stored or sent) and a privacy-policy line — both OPEN. Counsel is asked through ONE instrument: an added question on the
  existing WRITTEN, unsent `counsel-question-2026-10-18-nominee-contact-basis.md` (Rows 18 / 34), which Row 31 (i) cites. It gates GO-LIVE
  (`-384` Q1's cost as put: *"nothing goes live until that is done"*), ⛔ the build or the merge; Row 35 (g) already waits on this row.
  **Rejected:** (b) counsel's leg only, ⛔ Panel question (the routing template's §0 lists a legal basis for data as the Panel's).

## 🏛️ Panel questions: ANSWERED — `2026-10-23-384`

The two §0 halves (ND10's data use, ND7's staff warning) went to the Panel as ONE note —
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-6-36d-nominees-not-asked.md` (written 2026-10-23 at BigDev's request,
sent by BigDev; the question as put is kept unedited there) — and were ANSWERED the same day: **`2026-10-23-384`, TRUSTEE-RATIFIED**
(Dhiraj Rahul + Kalpana Bharti, relayed by BigDev: *"by DR and KB"* / *"Q1 A, Q2 A"*).

- **PQ1 — A** (Closed by `-384`): the dead member's nominee numbers may be compared with members' numbers, only to keep a nominee out of
  the five. ⚠ Its cost as put makes counsel's WRITTEN confirmation of the ground a GO-LIVE condition (*"nothing goes live until that is
  done"*) — Row 31 (i).
- **PQ2 — A** (Closed by `-384`): nominee changes in the 90 days before the claim join the staff warning (ND7). The exact words of the
  line stay the author's.
- **Not covered by `-384`:** leaving nominees out itself (BigDev's — the author-commit), a nominee who signs in with a different number
  (ND8), `-356`, any other use of a nominee's number.

## Acceptance Criteria

Notation: unit legs are pure vitest (`env -u DATABASE_URL`); live legs run on :5433 with `DATABASE_URL` set EXPLICITLY
(`postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable`); `skipIf(!hasDatabase)` skips SILENTLY, so every touched live
spec is run WITH the DB and its count recorded. Expected values are COMPUTED through the real functions (`mobileBlindIndex`,
`normalizeMobile`) — ⛔ transcribed. The ACs build the CHOSEN options (ND1–ND10, decided 2026-10-23).

- **AC0 — start and preflight.** Rows 6-36, 6-27c and 6-31 are `done` and on `main` (MET at authoring). Task 0.1's preflight passes; ND1–ND10
  are answered and the author-commit is on the branch before the first code commit.
- **AC1 — ONE predicate, one new conjunct.** `nomineeMobileIndexes` is REQUIRED on every type ND4 lists; `peerMeshEligibleMemberSql` adds the
  ND2 conjunct through `peerMeshNomineeMatchSql` with the `${m}` alias; an EMPTY list excludes nobody and renders valid SQL (`= ANY('{}'::text[])`
  is false ⇒ NOT EXISTS is true — this leg is the only proof, TR5); ⛔ second predicate ([[feedback_gate_scope_semantic_coverage]]; 6.36 Trap 6
  — 6.36b's own predicate stays separate and untouched).
- **AC2 — the indexes, ONE function.** `peerMeshNomineeMobileIndexes(input: { pariwarId; deceasedMemberId; cut: PeerMeshFilingCut; enc:
  FieldCryptoDeps; inScope: InScope })` (in `packages/domain/src/claim/peer-mesh-nominees.ts`, exported through the claim barrel; the
  `matchContactNumbers` / `InScope` shape): (1) `inScope((db) => listNomineeDeclarationVersions(db, pariwarId, deceasedMemberId))` → keep
  `recordedAt < cut.cut` → per rank `projectedVersionOfRank` → that version's `mobileCiphertext` (⛔ a new query); (2) after the scope
  closes: `resolveCorrectionMobile(ct, 'member_nominee', pariwarId, enc)` each → drop `null` → `[...new Set(…)]` → `mobileBlindIndexMany`.
  The select job and both children call this function and nothing else for the read. ⛔ Version recorded before the cut ⇒ `[]` and ⛔ KMS
  call of any kind. Versions whose numbers are all unusable (sentinel / invalid) ⇒ their decrypts run, ⛔ HMAC call, `[]`. A stored number
  with spaces, a `+91`, a `0` prefix or hyphens matches the member's canonical number (G5). A vacated / sentinel / invalid number excludes
  nobody and does ⛔ throw. A KMS error or a malformed envelope THROWS (ND6). Two versions with the same number make ONE HMAC input
  (de-duplication, asserted by an HMAC call count).
- **AC3 — selection.** `runClaimPeerMeshSelect` does the ND3 pre-read and computes the indexes before `lockClaimCase`, and passes them to
  `getPeerMeshGroupedSnapshot`; `ClaimPeerMeshDeps.encryption` is REQUIRED and wired in `boot.ts`. A nominee-member is absent from
  `candidate_snapshot`, `selected_member_ids` and `ranked_member_ids` in EVERY group (`workplace_previous`, `workplace_current`, `named`);
  a nominee colleague is replaced by the next-ranked colleague (still five while the group lasts); a workplace group made empty only by the
  exclusion falls through to the named group (G15); a group made empty everywhere ⇒ the zero branch, `claim.peer_mesh_none_to_ask` with
  `no_workplace_colleague_or_named_person`, exactly as today. A nominee version recorded on or after the cut excludes nobody (ND1 (b)). A
  no-op re-run (a selection exists) and a wrong-state run make ⛔ KMS call. ⛔ KMS call is made while a pool client is checked out by this
  job. Every selection that chooses anyone is made WITH the indexes (ND3). A member of ANOTHER Pariwar holding the same number is unaffected
  (coverage-only — the reads are Pariwar-scoped).
  **On a nominee-exclusion fault (ND6 (a)):** ONE ids-only alarm, then the job rethrows — ⛔ selection, ⛔ event; the OCR hook's send
  carries the child retry policy; the worker is registered with `{ includeMetadata: true }`. On the final attempt the job instead re-sends
  itself with `startAfter` 1 h, carrying the first-failure instant (alarm each cycle), and returns. Once a deferred job's final attempt fails 24 h or more after
  that instant, the job FINISHES: an EMPTY `workplace_named_v1` selection (⛔ candidate, ⛔ one asked) with skip reason
  `nominee_check_unavailable` (⛔ the zero branch's reason), `claim.peer_mesh_none_to_ask`, and a second alarm — the ONE selection written
  without indexes. A final-attempt fault of any OTHER kind (claim not found, deceased mismatch, `ClaimStreamConcurrencyError`) behaves as
  today.
  *Dated note 2026-10-23 (code review of 6.36d, third round): "behaves as today" holds for the OUTCOME — rethrown, ⛔ re-send, ⛔ finish. The one addition is ONE ids-only alarm when the pre-read or the locked transaction fails with no retry left (`alarmIfLastAttempt`); see the ND6 dated note.*
- **AC4 — send time (6.27c).** The child computes the indexes once per run (ND4), after `nothing_due`, outside any tx, with the cut from the
  selection's anchor claim (ND1 (b)), and passes them into `beginPeerMeshRequest` and `finalisePeerMeshNoSendableNumber`. A ping whose member
  BECAME a nominee match after selection (a member who took a nominee's number after the selection was drawn) ⇒ fresh:
  `no_target:peer_is_nominee` (ND5) + a replacement that also skips nominees; re-claimed:
  `error` + `exhausted:recheck_peer_ineligible`, as today. A child with nothing due decrypts nothing (P5 kept). A KMS fault ⇒ one alarm +
  `ClaimCorrectionTransientError`, ⛔ ping begun (ND6).
  *Dated note 2026-10-23 (code review of 6.36d, patch 8): "a member who took a nominee's number after the selection was drawn" is a case with NO
  production path — the selection already excludes the nominee, the nominee set is frozen at the cut, and the sign-up number is written at sign-up only
  (`member/identity-write.ts`; ⛔ change writer — G18). `peer_is_nominee` is reachable only for a selection drawn before this story ships and re-checked
  after it; M11 / M12 reach it by `UPDATE member_identities`. Defensive depth, ⛔ an expected case. (See the note under Policy meaning.)*
- **AC5 — the label, in lockstep (ND5).** A forward migration (next free number, hand-authored, journal entry — ⛔ `db:generate`)
  drops and re-adds both 0166 CHECKs under the SAME names, with the CHECK text written from `PEER_MESH_REQUEST_DETAIL_PATTERN`, and
  `CREATE OR REPLACE FUNCTION claim_peer_mesh_pings_replacement_guard()` with 0166's WHOLE body plus `peer_is_nominee` in the IN-list. The TS
  constant and the regex move together (the regex lists the label at the array's position); the labeller's order is not_active →
  reported_deceased → no_sendable_number → filed_for_this_death → **is_nominee** → fallback; the R4 leg proves the FIVE labels cover the
  predicate; the `it.each` `exclude()` switch gains a `peer_is_nominee` arm (its `begin()` helper takes the indexes per case); every G12 test
  pin passes. (`first_detail` cannot actually receive the label — `skipFresh` does not write it — the CHECK is widened for lockstep only.)
- **AC6 — the reminder (6.31).** `beginPeerMeshWaReminder` receives the indexes (computed once per claim, outside any tx, after the child's
  `nothing_due` return, cut as AC4); a nominee-match ⇒ `skipped_recipient_ineligible`; a KMS fault ⇒ one alarm + `ClaimCorrectionTransientError`,
  ⛔ reminder begun; ⛔ other reminder behaviour changes.
- **AC7 — the staff line (ND7, `-384` Q2 A).** A nominee version recorded in `[cut.recentFrom, cut.cut)` sets `recent_change_before_filing`; one
  recorded before `cut.recentFrom` or on / after `cut.cut` does not; the admin copy reads as ND7 states, and both admin copy pins of the old
  sentence (`apps/admin/tests/neighbours-answers-panel.test.tsx`, `apps/admin/tests/verifier-console.test.tsx`) are updated to the new one;
  the inspector wire still carries ⛔ flag (`peer-mesh-source-not-on-inspector-wire.test.ts` green).
- **AC8 — nothing new leaves the process.** ⛔ index, plaintext or nominee identifier is stored, logged, put in an event payload or a job
  payload; `claim.peer_mesh_none_to_ask` stays `.strict()` and unchanged; ⛔ count of excluded people anywhere; alarms carry ids only (TR12).
- **AC9 — tests prove it, each new leg RED under a named mutant** (the 6.37e convention: a scratch runner asserts the edit landed exactly
  once and ALWAYS restores the file; each run recorded by name in the Debug Log; a leg no mutant turns RED is labelled coverage-only):

  | Mutant | Must turn RED |
  |---|---|
  | M1 the conjunct removed from `peerMeshEligibleMemberSql` | the snapshot exclusion leg AND the send-time leg |
  | M2 `resolveCorrectionMobile` returns `plaintext` un-normalised (scratch edit in `correction-crypto.ts`), or the function bypasses it | the "stored with spaces / `+91` / `0`" leg |
  | M3 the select job passes `[]` | the jobs selection leg |
  | M4 `insertPeerMeshReplacementPing` given `[]` | the replacement-skips-a-nominee leg |
  | M5 `finalisePeerMeshNoSendableNumber` given `[]` | its replacement leg |
  | M6 `beginPeerMeshWaReminder` passes `[]` to `readPeerMeshRequestEligibility` | the reminder skip leg |
  | M7 `correctionNumberHash` in place of the login blind index | the match leg (wrong hash space) |
  | M8 a KMS error swallowed to `[]` | the fail-closed leg (select job AND request child) |
  | M8b the select job's final attempt rethrows instead of re-sending itself (ND6 defer) | the defer leg (a deferred job exists with `startAfter` ≈ 1 h and the first-failure instant; ⛔ selection) |
  | M8c the finish writes `no_workplace_colleague_or_named_person` in place of `nominee_check_unavailable` | the finish leg (≥ 24 h: an EMPTY selection with `nominee_check_unavailable` + `claim.peer_mesh_none_to_ask`) |
  | M8d the 24 h test dropped — the first final attempt finishes (rejected ND6 (b)) | the "before 24 h: another deferral, ⛔ selection" leg |
  | M8e the 24 h test never true — the job defers for ever | the finish leg |
  | M9 the decrypt moved inside the locked tx | the "⛔ client checked out during KMS" leg (fake KMS records `pool.totalCount − pool.idleCount`, baseline measured before the run) |
  | M10 labeller order swapped (nominee before filed) | the labelling-order leg (a filer who is also a nominee ⇒ `peer_filed_for_this_death`) |
  | M11 the 6.27c child passes `[]` to `beginPeerMeshRequest` | the live child leg (a nominee ping ⇒ `no_target:…`, zero SMS sends on a zero-call recorder) |
  | M12 the 6.31 child passes `[]` to `beginPeerMeshWaReminder` | the live reminder-child leg (`skipped_recipient_ineligible`, zero Meta calls) |
  | M13 the nominee read moved before `nothing_due` (request child, then reminder child) | the P5 leg (zero nominee decrypt calls) |
  | M14 the pre-read always computes the indexes | the no-op-re-run leg (zero KMS calls) |
  | M15 `recorded_at < cut.cut` dropped from the ND1 filter | the "version recorded after the cut excludes nobody" leg |
  | M16 the ND7 disjunct removed | the staff-line leg |

  The M8 / M8b–M8e / M13 / M14 legs seed the deceased with ≥ 1 `declared` nominee version recorded BEFORE the cut, with a REAL envelope (G16), and
  assert the counting KMS saw ≥ 1 decrypt in the unmutated positive control — ⛔ an empty-nominee fixture (it makes zero KMS calls with or
  without the mutant, so the leg is vacuous).

  Plus coverage legs: an empty nominee list renders valid SQL; a vacated / sentinel nominee excludes nobody; a non-member nominee; the
  other-Pariwar member; a nominee in the NAMED group; the workplace group emptied → named; the five stay five after a nominee colleague
  is dropped.
- **AC10 — the gate.** `DATABASE_URL=…:5433… pnpm ci:local` PASSED (36 / 36 or the current count), recorded with its count; the migration
  *Dated note 2026-10-23 (fourth review round; the AC text is unedited): MET as written — `ci:local` 36 / 36 on a freshly recreated `:5433` at `b58d3857` (Debug Log); `:5432` was migrated in v2.0.*
  applied to BOTH :5432 and :5433 ([[project_live_db_test_gotchas]]); tsc and eslint exit 0.

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (AC0)** — 0.2–0.4 done; 0.1's preflight is re-run at the start of Task 1
  - [x] 0.1 Preflight: `git fetch origin`; `git diff --name-only 69e35f73 origin/main -- apps packages scripts infra` — if non-empty, rebase
        and re-verify G1–G17 by FUNCTION; STOP if any of: (S1) the predicate already has a nominee conjunct; (S2) a nominee blind index now
        exists; (S3) a new caller of the predicate exists that G2 does not list; (S4) `member_nominees` / `member_nominee_versions`
        `mobile_ciphertext` changed shape; (S5) row 6-35 is on `main` — re-verify G11 / G13 against its begin inputs and take the next free
        migration (Sequencing). `ListAgents`; re-grep every ref and worktree (`git for-each-ref`, `git worktree list`) for the highest
        decision id, migration number and ledger letter. (Known: 0119 backfills nothing, by design (`-232`; *"A dev database holding old
        rows is RESET"*); the one writer appends versions with every declare ⇒ a member with no version has no nominee for ND1 (b) —
        recorded, ⛔ fixed; nothing in production.)
  - [x] 0.2 BigDev's answers, VERBATIM (also in the Completion Notes):
        - ND1–ND6, ND8, ND9 — 2026-10-23: *"For ND1–ND6, ND8, ND9 - your recommendation is accepted, however fix the ND6/AC3 contradiction,
          and clean up the stale decision-status language before the first implementation commit."* (both done in v1.3);
        - ND7 (b) and ND10's Panel half — `2026-10-23-384` (Trustee-ratified, *"by DR and KB"* / *"Q1 A, Q2 A"*);
        - ND7 (b) / ND10 (a) as the author's build decisions — 2026-10-23, BigDev: *"Confirm both (Recommended)"* (the Panel ruled the
          questions, `-384`; Row 31 (i) and the single counsel instrument are ND10's author-side half, named in `-384` Consequences 2–3);
        - the `-356` reading — BigDev, 2026-10-23 (verbatim): *"I would not accept the residual-risk argument until we establish why the
          system cannot compare the two numbers.First, investigate whether the nominee's declared number can be resolved to an existing
          member account. If it can, exclude that account from the five, regardless of whether its login number matches the declared number.
          If it cannot, document the precise data-model limitation and decide whether it is acceptable."* The investigation (G18): ⛔ other
          route exists. Then BigDev: *"Accept + follow-ups (Recommended)"* — build as designed; ND8 records the gap precisely; the reminder to
          an unmatched nominee is read as ⛔ within `-356`; two follow-ups recorded (Task 0.4). And on the `-340` / `-341` finding:
          *"Verify + record (Recommended)"* — verified and recorded in `deferred-work.md` (2026-10-23).
        ⇒ Task 0.2 is COMPLETE.
  - [x] 0.3 The author-commit: ⭐ DONE — [`2026-10-23-386`](../../.decision-log.md#decision-2026-10-23-386), committed ALONE as `bd249a6f`
        (`-385` was row 6-35's, committed first). The next free decision id (≥ `-385`, dated the day it is COMMITTED), *"AUTHOR-COMMIT (BigDev) — STORY
        6.36d's BUILD DECISIONS ND1–ND10 …"*, with §0 (the `-340` §0 class; the ND7 and ND10 halves answered by `-384`), the §0 re-run table,
        ND1–ND10 as decided (citing `-384` for ND7 and ND10), and:
        - SUPERSEDES IN PART `-330` SW19's *"⛔ No decrypt, ⛔ no KMS call in the select job"* — for the nominee read only; `-330` ⛔ edited;
        - SUPERSEDES IN PART `-306` §2 item 1's *"a relative is flagged by …"* and NARROWS the residual `-330` SW23 records (*"a relative of
          the deceased is ⛔ not excluded"*) — a relative who is a declared nominee (matched by number) is excluded; other relatives stay
          flagged only; ⛔ in CF4 A as put, so ⛔ ratified clause moves;
        - records that `-384` Q2 A EXTENDED `-330` SW20 (ii) (ratified in its effect by `-331` Consequence 3): a nominee version recorded
          in `[cut.recentFrom, cut.cut)` also sets the staff line, and `peerMesh.recentChangeBeforeFiling` gains "or their nominees" (the
          words the author's); and that `-384` Q1 A permits ND10's use of the nominee numbers; `-330` / `-331` ⛔ edited;
        - SUPERSEDES IN PART `-365` MATCH (iii) (as corrected by `-366` decision 5): the reminder's WR2 (ix) re-check now carries the nominee
          conjunct through the shared predicate (ND4 / AC6); MATCH (iii)'s *"carries ⛔ nominee check"* and *"`-356` is never in play"* stay as
          written; `-365` / `-366` ⛔ edited;
        - RESOLVES IN PART `-366` decision 5's condition on `-365` MATCH (iii) — matched-number nominees, once this row is `done` on `main`
          — ⛔ "Closed by"; and RECORDS afresh (`-366`'s "until then" ends with this row): a nominee-member whose login number differs from the
          declared one is still texted and, if opted in, reminded on WhatsApp — whether that reminder is within `-356` (*"drop WhatsApp only
          notification for nominee"*) is recorded as a READING, ⛔ assumed away. BigDev's reading (Task 0.2): it is ⛔ a "notification for
          nominee" — the reminder goes to them as one of the five, and the system cannot know them as a nominee (G18: the declared number is
          the ONLY link, and it does not match their sign-up number);
        - records the ND6 delivery-failure §0 row (`-295` §0).
        Committed ALONE as `governance: …`; its SHA written after, ⛔ before ([[project_decision_log_writes_user_inserted]] — if the write is
        refused, ask once).
  - [x] 0.4 The records commit (append-only, each dated): ⭐ DONE 2026-10-23 (the commit after `bd249a6f`).
        - `epics.md` — a `### Story 6.36d` entry after Story 6.36, before 6.37, in the `### Story 6.37` form (a blockquote *"⚠ **Added
          <date> (Story 6.36d, Task 0.4)** — the row … was added by BigDev in session (`-365` Occasion: *"Exclude at selection"*), ⛔ by Panel
          ruling, with ⛔ `epics.md` entry (*'owed at its create-story'*)"*), then As the Trust / ACs in brief;
        - the sprint row's note; the 6-31 row's 2026-10-19 correction comment (*"a nominee leaves the five only once row 6-36d SHIPS"*) — a
          dated line;
        - `deferred-work.md` — a dated line on *"The deceased's FAMILY who are themselves members are ⛔ not excluded from the five (PM1,
          RECORDED)"* (narrows on `done`); and on 6.36's W3 (*"Someone already asked who LATER files for the same death keeps their live
          ask"*): *"trigger read against 6.36d — the reply path is ⛔ touched (ND8); the texted-ping residual now also covers a member who
          becomes a nominee match after being texted; stays OPEN"*;
        - roster Row 31 — leg **(i)** (the Panel's answers, recorded as `-384` — met; counsel's WRITTEN basis + the privacy-policy line for
          the nominee-number comparison — OPEN); *"ALL EIGHT"* → *"ALL NINE"* with a dated recount note (the 6.36a (h) precedent);
          `closure_evidence_link` gains *"(i) — Panel half: `2026-10-23-384`; counsel's written basis + privacy-policy line: (empty)"*; the owner line splits (i): counsel (Story 0.13) — (i)'s basis; Trustee Panel —
          (g), (i)'s PQ answers; `architecture_source_line` gains the new decision id for (i); `current_status` notes (i) open;
        - the counsel question — an added question on `counsel-question-2026-10-18-nominee-contact-basis.md` (written, ⛔ sent);
        - roster Row 35 (g) and its `cross_story_discharge_path` (*"rows 5-12 and 6-36d → (g)"*) — dated notes; Row 27's note naming rows
          5-12 / 6-36d — a dated note;
        - roster Row 26 — a dated note that the select job and the request / reminder children now read `member_nominee_versions` (Row 26's
          systemic note: `twt_service` holds ⛔ grant on any nominee table — this read joins the list that would 42501 in production; ⛔ fixed
          here);
        - 6.36 story — a dated annotation on AC4 / Trap 2; 6.36a story — a dated annotation on SW19 and SW23; 6.31 story — dated annotations
          on §0 edge (iii) (*"6.31 therefore adds ⛔ nominee check of its own"*), its Row 35 (g) line and its UPSTREAM (⛔ a merge fence) note;
        - the Panel note — DONE: written, sent and answered 2026-10-23 (`-384`); it is a record now — ⛔ edit it;
        - FOLLOW-UP 1 (BigDev, *"Accept + follow-ups"*): a NEW `backlog` sprint row for "a nominee's member link captured at declaration"
          (the member picks the nominee from the members list; the only fix for G18's gap) — with a row note: it needs the nominee's
          agreement and its OWN Panel question (new processing, outside `-384`), and covers only declarations made after it ships;
        - FOLLOW-UP 2 — DONE 2026-10-23: the `deferred-work.md` item (*"Row 6-36d's nominee match is the ONLY nominee→member link, and it
          degrades the day a member's login number becomes changeable"*) with its trigger on the FUTURE mobile-change story (AR-24).
- [x] **Task 1 — the predicate and the indexes (AC1, AC2)**
  - [x] 1.1 `nomineeMobileIndexes` (required) on every ND4 type + `peerMeshNomineeMatchSql` + the ND2 conjunct; doc comments extended in the
        house style.
  - [x] 1.2 `peerMeshNomineeMobileIndexes` and `PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE` in `packages/domain/src/claim/peer-mesh-nominees.ts`,
        exported through the claim barrel; ⛔ logging of inputs.
- [x] **Task 2 — the select job (AC3, AC7)**
  - [x] 2.1 The ND3 pre-read (claim, selection, state, cut, ciphertexts), closed, then KMS; pass the indexes into `getPeerMeshGroupedSnapshot`
        → both snapshot readers; the retryable throw when the locked tx reaches the snapshot without them. Required `encryption` in
        `ClaimPeerMeshDeps`; wire `jobsEncryption` in `boot.ts`.
  - [x] 2.2 ND6: the alarm, the retry policy on the OCR hook's send, `{ includeMetadata: true }` on the select `boss.work` and `attempt`
        threaded into `runClaimPeerMeshSelect`; on the nominee-exclusion fault only — the 1 h self re-send carrying the first-failure
        instant, and the 24 h finish (an EMPTY selection, `nominee_check_unavailable`, `claim.peer_mesh_none_to_ask`, the second alarm).
  - [x] 2.3 ND7: the nominee-change disjunct in `getPeerMeshGroupedSnapshot`; the admin copy and its two test pins.
  - [x] 2.4 The header comment's frozen-file / no-KMS notes amended (dated, citing the new decision).
- [x] **Task 3 — send time and the reminder (AC4, AC6)**
  - [x] 3.1 `readPeerMeshRequestEligibility`: input gains the indexes; a labelling column `is_nominee` (`peerMeshNomineeMatchSql` on `pr_m`);
        the order of AC5.
  - [x] 3.2 `beginPeerMeshRequest`, `insertPeerMeshReplacementPing`, `finalisePeerMeshNoSendableNumber`, `beginPeerMeshWaReminder` thread
        the indexes; the two children compute them once (after `nothing_due`), outside any tx, with the anchor-claim cut; ND6's alarm + throw.
- [x] **Task 4 — the label (AC5)** — the migration (dry-run inside `BEGIN … ROLLBACK` on
      :5433 first; then both DBs), journal, constants, every G12 pin. ⛔ Edit 0166 in place.
- [x] **Task 5 — tests (AC9)** — extend `peer-mesh-workplace-snapshot.spec.ts` (SW23 block), `peer-mesh-request.spec.ts`,
      `peer-mesh-wa-reminder.spec.ts`, `apps/jobs/tests/claim-peer-mesh.test.ts`, `claim-peer-mesh-requests-live.test.ts`,
      `claim-peer-mesh-wa-reminders-live.test.ts`; a unit test for the function's filter / normalise / dedupe / empty / fault paths; and the
      test-tree callers tsc lists (G2: `apps/api/tests/integration/claims/peer-request-after-send.spec.ts`, the two concurrency specs,
      `claim-peer-mesh.test.ts`'s direct `insertPeerMeshReplacementPing` call and its `deps()` / `windowDeps()` — pass `[]` / `enc`). Real
      envelopes and real indexes where a leg goes through the function (G16, TR8); recorded times placed explicitly
      ([[project_db_clock_ordering_tests_tie]]). Run M1–M16 (incl. M8b–M8e); record each.
- [x] **Task 6 — the gate (AC10)** — `ci:local` on :5433; push only with `DATABASE_URL=…:5433…` explicitly
      ([[project_prepush_hook_inherits_5432]]).
      *Dated note 2026-10-23 (after the rebase): the 34 / 36 recorded above MISSED a stale fence pin (see the Review Findings); after the re-take AC10 stands at 35 / 36 by component with the known, unrelated integrity-check red, and the `:5432` leg still owed — the Debug Log has the numbers. Task 6's `[x]` records that the gate was RUN, ⛔ that AC10 is met. Update (third round): the `:5432` leg is DONE; the fresh-database re-run was started and KILLED by the machine's memory safeguard (not repeated). ⛔ "Closed by" until BigDev's calls and the row is `done` on `main`.*
- [x] **Task 7 — closing records** — story Status → review, File List, Change Log, the sprint row + ledger line (next free letter).
      ⛔ "Closed by" on deferred-work / `-366` decision 5 / Row 35 (g) until the row is `done` on `main` ([[feedback_closure_language_precision]]).

### Review Findings

Code review 2026-10-23 (`bmad-code-review 6.36d`) — branch `story/6-36d-exclude-nominees-from-the-five` at `52ece667`, diff `origin/main...HEAD` (`origin/main`
= `d87d047a`; the pin `69e35f73` is its ancestor), code only (`apps/` + `packages/`: 26 files, +1502 / −74). Three layers, read-only, run in parallel
(Blind Hunter, Edge Case Hunter, Acceptance Auditor); 30 raw findings → 4 `defer` + 9 `patch` after merging and verification, 0 `decision-needed`, 7
dismissed. Each `patch` was re-read against the code before it was kept. Nothing here is a Trustee Panel question (the §0 gate: every item is "the code
should do X", with no change to what a person sees or is owed). No code was changed by the review.

- [x] [Review][Patch] The 24 h give-up clock reads wrong in two ways, and both err toward the irreversible empty selection [apps/jobs/src/claim-peer-mesh.ts:299-301] — MED. (a) On the first chain the first-failure instant is `attempt.createdOn`, which includes any queue wait: a select job that sat for about 24 h (jobs worker down) and then fails five attempts on a KMS fault goes straight to FINISH — an empty `nominee_check_unavailable` selection — with no 1 h deferral, though ND6 assumes the instant is "≤ ~15 min before its final attempt". (b) `nomineeCheckFailingSince` is an unvalidated string: an unparsable value gives an Invalid Date, `now − NaN < 24 h` is false, and the job FINISHes after one failure. The sibling `claim-peer-mesh-wa-reminders.ts:521` guards the same shape with `Number.isFinite`. Fix: fall back to `attempt.createdOn ?? now` when the carried instant is not finite, and clamp the first-failure instant to no earlier than `now − (the retry span, ~15 min)`. (Blind ×2, Edge ×2, Auditor.) **APPLIED** — `nomineeCheckFirstFailureInstant` (pure, exported): a carried instant wins only in the exact `toISOString()` form we write (a round-trip check — the patch review found that `null`, `'0'` and `'garbage 1'` parse to FINITE dates in V8 and would still have finished the job); otherwise `createdOn` clamped to ≥ `now − 35 min` (`PEER_MESH_NOMINEE_CHECK_RETRY_SPAN_MS`) and ≤ `now`. Legs: M8f, M8g, three no-DB unit legs, the span-covers-the-policy leg; mutants M-clock and M-iso RED.
- [x] [Review][Patch] The final-attempt arms have no recovery if their own write fails, and the "re-sent in 1 h" alarm is emitted before the send [apps/jobs/src/claim-peer-mesh.ts:304-318] — MED, low likelihood. DEFER and FINISH run only when no retries remain: if `boss.send` throws, or the FINISH transaction throws (`ClaimStreamConcurrencyError`, `ClaimPeerMeshNomineeIndexesStaleError`, a DB fault), the job goes to `failed` with no chain, the claim stays `documents_pending`, and the log has already said "re-sent". The OCR hook (`boot.ts`) and this re-send are the only two enqueuers of the select queue (grep) and nothing re-enqueues a stranded claim, so the strand lasts until another upload. A `null` return from `send` is NOT reachable: the queue is created with the default (standard) policy, and pg-boss 12.19.1 `plans.js` builds `singleton_key` unique indexes only for short / singleton / stately / exclusive / key_strict_fifo. Fix: emit the alarm after the send; wrap the send in try/catch and raise a distinct "chain lost — claim X will not be retried" alarm before rethrowing. (Edge, Blind.) **APPLIED** — the "re-sent in 1 h" alarm now follows the send; the send is in a try/catch → ONE "chain LOST" alarm (ids only) + rethrow; a `null` from `send` is a failed re-send; `finalAttempt` is hoisted and `alarmIfLastAttempt` is chained onto BOTH the pre-read and the locked transaction (one alarm, rethrow — the outcome is otherwise as today, ND6; see the ND6 dated note). Legs: M8b (the success alarm, asserted), M8h, M8j, M8k, the "OTHER kind" leg; mutants M-lost, M-order, M-final, M-null, M-pre, M-okalarm RED. ⚠ The strand itself is ALARMED, ⛔ recovered — deferred (deferred-work.md).
- [x] [Review][Patch] Nothing pins the wiring that activates ND6's defer and finish arms; the one "retry policy" test compares the constant with the constants it is built from [apps/jobs/src/claim-peer-mesh.ts:716-728, apps/jobs/src/boot.ts:586, apps/jobs/tests/claim-peer-mesh.test.ts:1107-1109] — MED. If the `includeMetadata` registration or the `retryCount` / `retryLimit` / `createdOn` adapter breaks, `attempt` is `undefined`, `finalAttempt` is false, and the select job rethrows until pg-boss marks it `failed` — the option ND6 rejected (c) — while every runner-level leg (M8, M8b–M8e), which passes `attempt` by hand, stays green. Dropping `...CLAIM_PEER_MESH_SELECT_RETRY` from the OCR hook's `boss.send` is equally invisible. The field names are correct today against the installed pg-boss 12.19.1 types; the gap is only that nothing pins them. Fix: a unit test with a fake `boss.work` that captures the options and handler (precedent: `apps/jobs/tests/claim-correction-control-paths.test.ts:565`), asserts `{ includeMetadata: true }`, and drives a job carrying the metadata into the deferred arm; and one that asserts the OCR hook's send options carry the retry policy. AC9: a leg no mutant turns RED is labelled coverage-only. (Auditor, Edge.) **APPLIED** — `claimPeerMeshSelectAttemptOf` and `enqueueClaimPeerMeshSelect` extracted (`boot.ts` calls the helper). Legs: no-DB `includeMetadata` registration, mapper and helper-options legs (these run with `DATABASE_URL` unset — the live legs skip silently there) + live M8i; mutants M-meta, M-hook, M-adapt RED. ⚠ COVERAGE-ONLY for two mutants: `boot.ts`'s one-line call is not exercised (tsc pins its shape; reverting it to an inline `boss.send` without the retry options would stay green), and M8i's job objects are hand-built with pg-boss 12.19.1's metadata field names (checked against its types), so a pg-boss rename is not caught. ⭐ Closed for `boot.ts` in the third round: its one-line call is pinned by SOURCE (the call's regex + the absence of any inline SELECT-queue send; reverting it turns the leg RED with `DATABASE_URL` unset — the repo's precedent for boot.ts one-liners); M8i's hand-built job objects stay coverage-only.
- [x] [Review][Patch] The refile-anchor branch of `resolvePeerMeshSelectionFilingCut` has no test, so "one nominee set per claim" is unpinned for a refiled claim [packages/domain/src/claim/peer-mesh-nominees.ts:94-98] — MED. No test file references the function or `anchor_claim_case_id`; both children worlds persist the anchor as NULL. Replacing the anchor lookup with `claimRow.createdAt` leaves every new test green, yet a nominee correction recorded between the first filing and the refile would then move the set between selection and send. Fix: a live child leg whose selection anchors to an earlier sibling claim, with a nominee version recorded between the two filings, asserting the nominee is NOT excluded at send (the selection's set); plus legs for the no-selection and missing-anchor throws becoming the child's transient. (Edge, Blind.) **APPLIED** — `world()` gained `anchorClaimId`, `nomineeIs()` / `declareNominee()` a `recordedAt`, and a `filedEarlier` helper; legs: ND1 (refile) + its control in BOTH the 6.27c request child and the 6.31 reminder child, and the missing-anchor transient (request child); mutants M-anchor (both children) and M-missing RED. The no-selection throw has NO leg: unreachable from a child (`listDuePeerMeshRequestPings` joins pings to selections through a cascading FK — a claim with no selection returns `nothing_due` before the nominee read).
- [x] [Review][Patch] Branch not rebased: `origin/main` moved to `d87d047a` (6.35 landed) after the pin; the story's own S5 stop condition is now true [branch `story/6-36d-exclude-nominees-from-the-five`] — MED (landing). A trial `git merge-tree` against `origin/main` conflicts in 7 files: `packages/domain/migrations/meta/_journal.json`, `peer-mesh-request.ts`, `peer-mesh-wa-reminder.ts`, and the four domain integration specs (`peer-mesh-request`, `peer-mesh-request-concurrency`, `peer-mesh-wa-reminder`, `peer-mesh-wa-reminder-concurrency`); 19 files overlap. Migration order is safe: `0179` carries `when` 1794973200023, below `0180`'s 1795059600024. Rebase, keep idx 179 then 180, and re-run both stories' legs. The Debug Log assigns "whichever of 6-35 / 6-36d lands second applies `0179` then `0180` on :5432" — that is this story. AC10 is recorded "met at 34/36" with :5432 not applied (BigDev: "Accept with the record" / "Hold until 6-35 lands"; disclosed); re-close it at 36/36 on both databases after the rebase, and keep the "met" wording out until then. The two `ci:local` failures attributed to `0179` are expected to clear after the rebase — UNVERIFIED. (Auditor ×2, Blind, Edge.) **APPLIED** (BigDev: *"1"* — the rebase; BigDev ran `git rebase origin/main` himself after the auto-mode classifier declined it for the session, and the session resolved the conflicts) — onto `origin/main` `d87d047a` (6.35 landed); 12 commits replayed, FIVE conflict stops. The newest-first ledgers kept BOTH sides: `sprint-status.yaml` (6.36d's entry on top); `.decision-log.md` ordered by NUMBER (`-388 / -387 / -386 / -385 / -384`, the `---` separators a plain keep-both drops restored, the `-384` and `-386` bodies byte-identical to their commits); `deferred-work.md` (a pure 24-line insertion); `inventory-roster.md` Row 35 (g) by a character-level three-way merge (6.36d's inserted text + 6.35's appended tail). Commit 9 was the real merge: 6.35's per-locale `templates` (replacing the single `template`) and `unusableLocales` beside 6.36d's `nomineeMobileIndexes` in the reminder begin, the request begin, both schedulers and the specs; `_journal.json` runs `0179` then `0180` (180 entries, strictly increasing `when`). The SHA map is in the Debug Log. Verified on the rebased tree: `tsc` (domain, contracts, jobs, api, admin) and ESLint (25 files) clean; domain integration specs 115/115 plus the two `0179`-attributed specs; jobs 189/189; the API suite 2080 + 1 skipped. `ci:local` then found one real defect (the next item). ⚠ AC10's `:5432` leg is STILL OWED — nothing was applied there.
- [x] [Review][Patch] Test hygiene: several new legs pass whether or not the behaviour they name is present [apps/jobs/tests/claim-peer-mesh-wa-reminders-live.test.ts:900-908, packages/domain/tests/claim/peer-mesh-nominees.test.ts:206-212, apps/jobs/tests/claim-peer-mesh.test.ts:1064-1078] — LOW. VERIFIED: (1) reminders M13: `const h = harness(w)` is never passed to `child(...)`, so `expect(h.sent).toHaveLength(0)` is vacuous; the `calls() >= 3` positive control (also in the 6.27c M13 leg) does not pin the nominee read, since the name and the neighbour's decrypt + HMAC alone can reach 3 — the real assertion, `k.calls()` is 0 on the due run, is sound; (2) `peer-mesh-nominees.test.ts` "the version read opens ONE scope; KMS runs after it returned" asserts only `opened() === 1` — nothing checks the order its title names; (3) ND3 anchor-moved: the side insert is a fire-and-forget async IIFE with no `.catch` plus a 150 ms sleep, so a failing insert is an unhandled rejection and a slow commit flakes — keep the promise and await it. UNVERIFIED (Blind Hunter; check when fixing): the 6.27c M8 child `every(...)` over a possibly empty array needs a length assertion; the `not.toContain('98765')` literal should derive from the world's own constant; `encryption: brokenHmac as never` hides any mismatch with the real interface. (Blind, Edge.) **APPLIED** — M13 (both children): the dead harness removed; the positive control now compares with a no-nominee world (the bare run asserted `accepted`, calls > 0, the difference ≥ 2); the ordering test logs scope open / close and distinct `kms:decrypt` / `kms:hmac` (⚠ against a stub it proves "awaited before KMS" — the live M9 pins a real pool); ND3 awaits its side insert; the 6.27c M8 child asserts its 2 pings. The UNVERIFIED items, resolved on reading: `'98765'` is the shared prefix of every seeded neighbour number, so a leak IS detected, and the `every(...)` ran over 2 rows — no defect; `brokenHmac as never` rejects after a real decrypt and the M8 mutant turns it RED — no defect.
- [x] [Review][Patch] Stale doc comment: `recentChangeBeforeFiling` is still described as "workplace or the people they named" only [packages/contracts/src/claims/verifier-console.ts:313-315] — LOW, doc only. ND7 / `-384` Q2 A widened the line to nominee changes; the admin string and both admin pins were updated, the contract's comment was not. (Auditor.) **APPLIED** — the comment now names ND7 / `-384` Q2 A. (`packages/contracts/src/claims/verifier-console.ts` is a contracts SOURCE file: COMMENT-only; the "no contracts source change" line under Project Structure Notes stays true of behaviour.)
- [x] [Review][Patch] The Policy-meaning sentence over-claims the "staff see that they are a nominee" leg [story, Policy meaning (AI-10-1) and AC4] — LOW, record only. `peer_is_nominee` is written only when a send-time re-check finds a chosen neighbour matching; the selection already excludes nominees, the nominee set is frozen at the cut, and the login index is written only at sign-up (Auditor's trace of `member/identity-write.ts` and `anonymize.ts`; not re-run by the reviewer) — so in production the label can be reached only by a selection drawn before 6.36d ships, and the M11 / M12 legs reach it by `UPDATE member_identities`. It is defensive depth, which is fine. Fix: a dated note narrowing the story's sentence; `-384` Q1 as put is a ratified text and is not edited. The reviewer's call, not the Panel's. (Auditor.) **APPLIED** — dated notes under Policy meaning (AI-10-1) AND AC4.
- [x] [Review][Patch] ND4 deviation is recorded only in the Debug Log [story ND4; `readPeerMeshNomineeIndexes` in `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`] — LOW, record only. ND4 and `-386` say the cut is read "inside the same short read as the version read"; the build reads the cut, then the versions, in two short scope transactions. TR3 holds (both close before KMS). Fix: a dated note on ND4; `-386` stays append-only. (Auditor.) **APPLIED** — dated note under ND4 ("every re-check" is now true of both children: the 6.31 reminder has its own refile leg).
- [x] [Review][Defer] A bare `catch {}` collapses every cause, so the alarm cannot say which fault happened, and the send-time children have no terminal arm [apps/jobs/src/claim-peer-mesh.ts:292, apps/jobs/src/scheduler/claim-peer-mesh-requests.ts `readPeerMeshNomineeIndexes`] — deferred: ND6 / TR12 deliberately keep the cause out of the alarm and of pg-boss's stored output, and a permanent fault is not reachable at the children, because the select job decrypts the same ciphertext set first and ends in its 24 h empty selection; the children see only transient KMS faults, which resume when KMS recovers. Revisit to add the error CLASS name (ids only) to the alarm.
- [x] [Review][Defer] Alarm volume during a KMS outage: one per select attempt (about 120 per claim over the 24 h window) and one per child sweep per claim [apps/jobs/src/claim-peer-mesh.ts, apps/jobs/src/scheduler/claim-peer-mesh-requests.ts] — deferred: ND6 chose "alarm" and no throttle exists in the alarm sink; tuning belongs with the alarm sink, not this story.
- [x] [Review][Defer] A declared nominee number that does not normalise (`0091 98765 43210`, `+91 0 98765…`) is dropped with no alarm or count [packages/domain/src/claim/peer-mesh-nominees.ts:72-77] — deferred: the residual is already recorded (ND8: the 13-digit forms are not excluded); only the missing count is new, and it is additive observability.
- [x] [Review][Defer] Smaller coverage gaps: no select-job leg for a failing `computeHmac` or a throwing batch audit hook (the HMAC fault has a unit leg); the children's "KMS outside any transaction" is not pinned (M9 covers the select job only); no jobs-level leg where every candidate is a nominee (covered by construction; G15 acknowledges the imprecision); M8c does not pin the nominee-version disjunct of the staff line (the snapshot spec's M16 does) [apps/jobs/tests/claim-peer-mesh.test.ts, apps/jobs/tests/claim-peer-mesh-requests-live.test.ts] — deferred: each is covered another way or by construction.

Dismissed (7), with the reason, so a later review does not re-raise them: the eager nominee read before the send-window / opt-in checks (once-per-run after `nothing_due` is ND4 / AC4, and a fault fails closed by design); "fails CLOSED" is half true (the header comment itself states the 24 h empty selection); the `⛔` glyph in alarm and comment text (the story's GLYPH REGISTER); migration 0180 hazards — the journal `when` order (moot: `0179` < `0180`, verified), the replacement-guard body (only `0166` and `0180` define `claim_peer_mesh_pings_replacement_guard`, verified) and the CHECK re-validation lock (the table is small and not in production); the staff-line noise on sign-up declarations (`-384` Q2 A's cost as put names exactly that case); the cross-Pariwar leg that cannot go RED (the story labels it coverage-only; the candidate set is Pariwar-scoped, so a member of another Pariwar cannot be constructed as a candidate); the Edge Hunter's journal-`when` ordering item (the same as the migration item). The Blind Hunter's ten context questions were answered from the code and none became a finding: standard-policy `singletonKey` does not dedupe; the only enqueuers carry the retry policy; `skip_reason` is plain `text`; the admin has `i18n-en.ts` only; the District Admin sees `peer_is_nominee` verbatim by ND5; `claim-correction-reminders.ts` does not import `claim-peer-mesh.ts`; `buildJobsEncryptionDeps` defaults to the fake KMS and does not throw at module load; the G2 reader list is complete; the 24 h empty selection is ND6 (a); the shared-number false positive is G18 / ND8.

- [x] [Review][Patch] The AC11 fence pin on `peer-mesh-wa-reminder.ts` was STALE — found by the post-rebase `ci:local`, FIXED [apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts] — MED. 6.37d's test pins the file's sha256: 6.35 re-took it (`b37a0ce5…`), the merged file hashes `ca622a58…`, so `test (unit)` failed. It was stale BEFORE the rebase too — the base's pin `cf1e8f1f…` against this branch's file `a34beb30…`, and 6.36d never touched the test — and Task 6's AC10 record (0179 + load flakes) did not name it: a miss in the story's own record, caught only because the rebase put a second story's re-take in front of it. Only this pin is re-taken, with a dated comment (`c0631882`); the whole fence file passes 33/33. Mutant: reverting the pin to `b37a0ce5…` turns the leg RED.

#### Patch review (2026-10-23) — the layers run on the PATCH diff, before any commit

Per BigDev (*"run adversarial review on patches applied once done"*, [[feedback_review_the_fix_diff_before_commit]]): `git diff HEAD` of the code the patches
changed (742 lines, 7 files; no untracked files), three read-only layers in parallel. 28 raw findings (Blind 10, Edge 7, Auditor 11) → **11 groups applied**,
**2 deferred**, **6 dismissed**; ⛔ HIGH. Applied (all in the patches above): the carried instant must be the exact ISO form (3 layers); a `null` from `send`
is a failed re-send (2); the pre-read alarms on a last attempt (1); the final-attempt alarm's scope and text, and its widening of "other faults keep
today's behaviour", recorded in the ND6 dated note (2); a positive success-path alarm assertion in M8b; the stronger M13 controls (3); the ordering log's
tokens (2); a 6.31 refile leg (1); test / describe titles that claimed more than they assert (3); the retry-span comment (equal jitter, not full) and its
test title (2); the ND6 and AC4 dated notes and this story's File List / Change Log (2).
- [x] [Review][Defer] Nothing re-enqueues a stranded `documents_pending` claim: a final attempt that fails for a NON-KMS reason is alarmed and rethrown (ND6: other faults keep today's behaviour), and one that EXPIRES outside the handler (pg-boss's 15 min default `expireInSeconds`; no deadline around the nominee read) ends the chain with no deferral and no alarm [apps/jobs/src/claim-peer-mesh.ts] — deferred (deferred-work.md): pre-existing in kind, and ND6 pins "other faults as today". (Edge ×2.)
- Dismissed (6): the raw `send` error rethrown into pg-boss's stored output (TR12 keeps the nominee-check CAUSE out; the envelope is non-PII ids and a pg error is not the cause); the `⛔` glyph in comments (the GLYPH REGISTER); "any later write" going unalarmed (the step-(9) window enqueue, the shepherd and the neighbour-text enqueues each catch and alarm for themselves — verified); fixture hygiene of `filedEarlier` (the pariwar-wide `afterAll` removes the rows — verified by the Edge Hunter); the cross-Pariwar anchor leg (by construction `getClaimCase` is Pariwar- and RLS-scoped); the no-selection leg (unreachable, see patch 4). The Blind Hunter's eight context questions were answered from the code (scope of `DAY` / `enc`, `.catch` typing, unused imports — `tsc` and ESLint clean — and the contracts comment: ND7's computation IS in this branch).
- Evidence (2026-10-23): `tsc --noEmit` clean in `apps/jobs`, `packages/domain`, `packages/contracts`; ESLint clean on every changed file from its package cwd; `apps/jobs` 170 tests on :5433 (the three peer-mesh files + the three OCR-parity files) and 7 no-DB legs with `DATABASE_URL` unset; `packages/domain` `tests/claim` 818. **16 mutants, 0 survived** (each edit asserted to land exactly once, the named legs run on :5433, the file restored byte-identical by sha256): M-clock, M-lost, M-order, M-final, M-meta, M-hook, M-adapt · M-anchor, M-missing, M-noread · M-iso, M-null, M-pre, M-okalarm, M-anchor (both children), M-noread (the ≥ 2 controls).
- The round-2 edits (the strict ISO check, the null-send guard, the pre-read alarm, the 6.31 refile leg, the controls) were re-reviewed in the third round, below.

#### Third review round (2026-10-23) — the by-hand merge with 6.35, the round-2 edits and the pin

Per BigDev (*"1,2,3"* — the third item of the three offered), after the rebase onto `origin/main` `d87d047a`: three read-only layers on (A) the nine merged files (`git diff origin/main HEAD`, 586 lines — 6.36d layered on 6.35's code), (B) the fixes in final form (933 lines), (C) the pin (16 lines). 29 raw findings (Blind 16, Edge 5, Auditor 8) → **0 HIGH, no defect in the hand-merge**: the Auditor confirmed against `origin/main` that every 6.35 behaviour and test survived (the nine files, the three jobs live tests' removed-line lists, the decision-log entries byte for byte, the SHA map, the pin hashes), and the Edge Hunter checked every caller of the five changed functions in `src` AND tests, the order of the checks inside both begins, the re-claim paths, the `counts` shapes and the SQL aliases. Applied: **9 raw → 4 code / test groups** — (i) **the real gap, at the seam:** `-387` S2 commits to "the nominee re-check ③ runs BEFORE the `waiting_template` wait" and no leg set both options at once, so moving the wait above ③ kept every test green while the five stopped being five; one leg per begin now (a ranked nominee whose language's template is unusable is finished `no_target:peer_is_nominee` AND REPLACED; the reminder `skipped_recipient_ineligible`; the same ping without the nominee WAITS), mutants RED in both; (ii) `boot.ts`'s one-line call pinned by SOURCE; (iii) the `(0)` pre-read comment back beside its code and a history comment turned into a description; (iv) stale labels and titles ("four labels" ×2, the AC4 re-claim test asserting the ROW outcome its title names, M6's "same neighbour", the ordering test's title); **5 raw → records fixes** — this banner, AC3 and ND6 dated notes, the ND6 arithmetic ("mean" → minimum), the SHA-map sentence, the File List, the ledger wording, Task 6's note. **5 raw deferred** (below), **10 dismissed**: the `singletonKey`-vs-comment worry (the queue is standard-policy — `plans.js` builds `singleton_key` unique indexes only for short / singleton / stately / exclusive / key_strict_fifo, and the select job's own header says the key is inert; M8j mocks `send`), the side-insert test timing, an `alarm` sink that throws, a canonical-but-ancient carried ISO date (the contract is "what this file wrote"), the duplicated raw-SQL `filedEarlier` helper, the contracts comment (ND7's producer IS in this branch), the retry-span test's formula, the bare `nomineeMobileIndexes` JSDoc, an Edge suggestion to skip the nominee read when `nameFault` is set (it would pass a literal `[]` — ⛔ ND4 / AC1's "never `[]`" rule), and the refile fixtures (cleanup is Pariwar-wide, verified).
- [x] [Review][Defer] **The SMS child's nominee-read fault has no deferral:** past its 15–30 min of retries the neighbours' texts wait for the NEXT daily sweep (10:30 IST) — up to ~23 h late, about a third of the 72 h window; the reminder child is less exposed (an hourly sweep) [apps/jobs/src/scheduler/claim-peer-mesh-requests.ts `readPeerMeshNomineeIndexes`] — deferred (deferred-work.md): ND6 gave ONLY the select job the 1 h deferral and BigDev accepted it; a child deferral would change a ratified build decision. (Edge.)
- [x] [Review][Defer] **A nominee found at send or reminder time is silent** — a first-attempt `peer_is_nominee`, or a reminder's `skipped_recipient_ineligible` for a ping already texted, carries no alarm and (for the reminder) no reason [claim-peer-mesh-requests.ts; peer-mesh-wa-reminder.ts] — deferred: with the selection and the send-time set drawn at the same anchor cut, reaching it needs a selection drawn before this story ships (defensive depth; see the AC4 dated note), and AC5b leaves first-attempt skips unalarmed. (Edge ×2.)
- Evidence: `tsc` + ESLint clean (domain, jobs); request spec 42, reminder spec 35, nominees unit 14 on :5433; jobs peer-mesh 53 on :5433 and 8 no-DB; **3 more mutants RED** (the wait pre-empting ③ in each begin; `boot.ts` back to an inline send), files restored byte-identical.


#### Fourth review round (2026-10-23) — fresh eyes on the whole story diff

Per BigDev (*"1"*: the full code diff in one pass): branch at `e6b2635c`, diff `origin/main...HEAD -- apps packages` (`origin/main` = `d87d047a`; 28 files, +2014 / −100, 3053 lines). No code had changed since round 3 (`ca6694a4` was its last code commit). Three read-only layers, run in parallel (Blind Hunter, Edge Case Hunter, Acceptance Auditor + the load-bearing-invariant checklist: families 1–6 and 8–11 covered by test or by construction, ⛔ REAL GAP). 15 raw → 13 after merging → **0 `decision-needed`, 4 `patch` (all LOW), 1 `defer`, 8 dismissed**. ⛔ HIGH, ⛔ MED left standing, ⛔ AC violation. Nothing here is a Panel question (§0: each item is "the code / the record should say X").

- [x] [Review][Patch] **The 24 h FINISH alarm announces the outcome before the write** — *"… for 24 h — finishing with ⛔ one asked (nominee_check_unavailable)"* is emitted BEFORE the locked transaction, which can still no-op (a selection committed by another chain, the state moved on) or throw; round 1 fixed the same class for DEFER ("re-sent" now follows the send). Word it as an attempt (the post-commit *"moved on with ⛔ one asked"* alarm, `outcome.created`, stays the outcome) [apps/jobs/src/claim-peer-mesh.ts:419] — LOW. (Blind, Auditor.) **APPLIED** — the alarm now reads *"… for 24 h — attempting the empty selection (nominee_check_unavailable)"*, with a comment that it names the attempt; ⛔ test asserts the text (M8c / M8e count two alarms and their digits).
- [x] [Review][Patch] **Row 26 does not name what the select job does if the nominee-table read is refused in production** — the code sends ANY throw from `peerMeshNomineeMobileIndexes` down ND6's arms (ND6's own letter: *"a throw from `peerMeshNomineeMobileIndexes`"*), so if Row 26's grant gap is closed for `claims` but ⛔ for `member_nominee_versions`, every claim defers for 24 h and then FINISHES EMPTY (`nominee_check_unavailable`), and the children retry for ever. ⛔ code change (ND6 as decided; round 1 deferred the cause-collapsing `catch`); a dated line on Row 26 so the go-live gate covers it [docs/launch-gate-inventory/inventory-roster.md:456] — LOW, records. (Blind, Auditor.) **APPLIED** — Row 26 gains a dated 2026-10-23 note: the closure must cover the nominee tables together with `claims`; ⛔ a new closure leg.
- [x] [Review][Patch] **Stale wiring comment on the select-job hook** — still says *"Wired in boot.ts to `boss.send(CLAIM_PEER_MESH_SELECT, …, { singletonKey: claim_case_id })` so a re-run of the OCR job does not double-select"*; `boot.ts` now calls `enqueueClaimPeerMeshSelect` with the retry policy, and the key is inert on a standard-policy queue [apps/jobs/src/claim-ocr-parity.ts:143] — LOW, doc. (Auditor.) **APPLIED** — the comment names `enqueueClaimPeerMeshSelect` and the idempotency probe as what makes a re-run a no-op.
- [x] [Review][Patch] **"A jobs-worker outage restarts the 24 h window" holds for the FIRST chain only** — the clamp applies to `createdOn`; a carried `nomineeCheckFailingSince` is ⛔ clamped (ND6: *"24 h or more after that first failure"*), so an outage AFTER the first deferral counts toward the 24 h. The code follows ND6; the comment (and ND6's dated note (1)) over-state it. Say "on the first chain" [apps/jobs/src/claim-peer-mesh.ts:143] — LOW, doc. (Blind.) **APPLIED** — the `PEER_MESH_NOMINEE_CHECK_RETRY_SPAN_MS` comment and ND6's dated note (1) (an inline ⚠ correction, the rest unedited) now say "on the FIRST chain".
- [x] [Review][Defer] **Each OCR upload during a KMS outage starts its own hourly deferral chain** — the select queue is standard-policy, so `singletonKey` de-duplicates nothing; before 6.36d a duplicate select was a one-shot no-op, now each lives up to 24 h (more KMS calls, more alarms; the earliest chain's FINISH decides, and it runs only if the read is still failing on that attempt) [apps/jobs/src/claim-peer-mesh.ts the 1 h re-send; apps/jobs/src/boot.ts `enqueueClaimPeerMeshSelect`] — deferred (deferred-work.md), LOW. (Edge.)
- Dismissed (8): new reason codes vs downstream vocabularies (`skip_reason` has ⛔ CHECK and ⛔ reader; `noTargetReason` is `z.string()`; ⛔ admin label map); a stale-cut throw stranding a final attempt (the Edge Hunter traced it reachable only via a state change that brings its own OCR enqueue; the strand class is already deferred); skipping the nominee read on a name fault (dismissed in round 3, ND4 / AC1); a module-init cycle via `claim-correction-reminders.ts` (none: it imports neither `claim-peer-mesh.ts` nor anything that does); the KMS-fault test's `not.toContain('98765')` (the fixtures are `+9198765…`, so it bites); an un-awaited `expectIdsOnly` in the reminder test (that helper is synchronous); the warning copy over pre-6.36d selections (one locale file; no such rows exist — not live); a non-normalising nominee number dropped silently (already deferred in round 1, ND8 / G5).
- Evidence: `tsc --noEmit` and ESLint clean in `apps/jobs` (the two changed files); `apps/jobs/tests/claim-peer-mesh.test.ts` 53 / 53 on :5433. The patches change one alarm string and three comments / records — ⛔ behaviour, so ⛔ mutant was owed. Status stays `review`: the fresh-database confirmation of AC10 (35 / 36) is still BigDev's call (v2.0).

## Dev Notes

### Current state of the code this story changes (re-read at `40420410`; unchanged at `69e35f73`)

- `packages/domain/src/claim/peer-mesh-read.ts` — `PeerMeshEligibilityExclusions`, `peerMeshEligibleMemberSql` (G1), `PeerMeshSnapshotInput`,
  the two snapshot readers, `getPeerMeshNamedChangeBeforeFiling` and `getPeerMeshGroupedSnapshot` (G2, G14), `resolvePeerMeshFilingCut` /
  `peerMeshFilingCut`. **Preserve:** the six existing conjuncts, the as-of-cut reads (I8), the grouping and settled-first ranking, the
  filtered snapshot that replay depends on, the two existing staff-line disjuncts.
- `packages/domain/src/claim/peer-mesh-request.ts` — `readPeerMeshRequestEligibility` (labels), `insertPeerMeshReplacementPing`,
  `lockClaimThenPing`, `beginPeerMeshRequest`, `finalisePeerMeshNoSendableNumber` (G11). **Preserve:** lock order (claim then ping,
  `lock_timeout '30s'`), ①→②→③ order, the re-claimed-row `exhausted:recheck_peer_ineligible` path.
- `packages/domain/src/claim/peer-mesh-wa-reminder.ts` — `beginPeerMeshWaReminder` (G13). **Preserve:** every WR condition and outcome.
- `apps/jobs/src/claim-peer-mesh.ts` — `ClaimPeerMeshDeps`, `runClaimPeerMeshSelect`, `registerClaimPeerMeshWorkers` (G3, G17), and
  `ClaimPeerMeshSelectPayload` (gains ONE optional non-PII field, the first nominee-exclusion failure instant — ND6).
  **Preserve:** the lock-first order inside the tx, the idempotency probe and the no-op self-heal enqueues, ⛔ swallowing
  `ClaimStreamConcurrencyError`, the post-commit enqueue hooks, the window worker.
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` and `claim-peer-mesh-wa-reminders.ts` — the children (G11, G13). **Preserve:**
  P5 (nothing due ⇒ ⛔ decrypt), the send window, the per-ping tx shape, the name-fault path.
- `apps/jobs/src/boot.ts` — the select worker registration (wire `encryption: jobsEncryption`) and the OCR hook's select `boss.send` (ND6
  retry policy).
- `apps/admin/src/modules/claim-verification/i18n-en.ts` — `peerMesh.recentChangeBeforeFiling` (ND7).
- `packages/domain/src/schema/claim_peer_mesh_pings.ts` + a new migration (ND5 (a)).

### Shipped substrate this story READS — rebuild none of it

`resolveCorrectionMobile` (G7), `normalizeMobile` / `mobileBlindIndexMany` / `mobileBlindIndex` (G6), `listNomineeDeclarationVersions` and
`projectedVersionOfRank` (`nominee/declaration-history.ts`, G10), `InScope` / `matchContactNumbers` as
the shape (G6), `resolvePeerMeshFilingCut` / `peerMeshFilingCut`, `getClaimCase`, `getPeerMeshSelectionByClaim`, `withPariwarScope`,
`ClaimCorrectionTransientError` and `readMemberFacingDeceasedName` as the fault pattern (G11), `CHILD_RETRY_LIMIT` /
`CHILD_RETRY_DELAY_SECONDS`, the test encryption deps used by the 6.27c live test (G16).

### Sequencing — row 6-35 (`story/6-35-in-app-language-switch`, ready-for-dev in its worktree)

6.35's §Sequencing note addresses this story: both plan migration `0179` (journal idx 179), both edit `schema/claim_peer_mesh_pings.ts`,
both change the inputs of `beginPeerMeshRequest` / `beginPeerMeshWaReminder` (and, under its LS10 (b), their result unions) and both child
call sites. ⛔ Shared CHECK (6.35 touches the `*_locale*` checks and `guard_delivery()`; this story the detail checks and
`replacement_guard()`). Whichever lands second rebases, renumbers its migration and journal `when`, and re-runs both stories' legs (S5).
No other branch or worktree touches the peer-mesh files.

### Traps

1. **TR1 — the nominee mobile is RAW** (G5): compare normalised-to-normalised, never ciphertext or plaintext as typed.
2. **TR2 — the wrong hash space** (G8): `correctionNumberHash` is per-Pariwar class `claim_contact_mobile`; the login index is
   `MEMBER_MOBILE_FIELD_CLASS` under `MEMBER_IDENTITY_NAMESPACE`. Only the latter matches `member_identities.mobile_blind_index`.
3. **TR3 — KMS inside a tx** (G9): the pool is `max: 2`; `mobileBlindIndexMany` says *"⛔ Never call it inside a transaction"*. Read
   ciphertexts in their own short scope tx, close it, then KMS, then lock.
4. **TR4 — the scope handle**: the ciphertext read runs inside `withPariwarScope` (a tx + `SET LOCAL app.pariwar_id`) WITH the explicit
   `pariwar_id` predicate (`listNomineeDeclarationVersions` has it) — ⛔ a bare pool query. In jobs `withPariwarScope` does ⛔ `SET ROLE` and
   the pool is `SERVICE_DATABASE_URL`, so the explicit predicate is what scopes the read; the production grant gap is Row 26's.
5. **TR5 — drizzle arrays**: a JS array interpolated into `sql` expands to a parameter LIST; use `${sql.param([...xs])}::text[]`. The
   `known-people.ts` site never sends an empty array (it returns early), so the AC1 empty-list leg is the ONLY proof that `'{}'::text[]`
   renders and excludes nobody.
6. **TR6 — the R4 pin** (G12): adding the conjunct without a label makes a nominee fall to `peer_not_eligible` and the R4 leg fails —
   that failure is the pin working; change it deliberately per ND5.
7. **TR7 — one label, many pins** (G12): the TS constant, the regex (same position as the array), both CHECKs (written FROM the constant —
   the RLS regression spec compares `pg_get_constraintdef` to it byte for byte), the trigger IN-list (`CREATE OR REPLACE` with 0166's whole
   body), and the test pins. Miss the trigger and a replacement after `peer_is_nominee` is refused at the DB, rolling back the begin.
8. **TR8 — fake identities in fixtures** (G16): `'idx-<uuid>'` never matches a real hash — a leg that goes THROUGH
   `peerMeshNomineeMobileIndexes` and is built on it passes vacuously. Predicate-level legs (snapshot / request / reminder specs) take the
   indexes as input and may pass the seeded member's own `idx-…` string — that still tests the conjunct.
9. **TR9 — every reader**: grep `peerMeshEligibleMemberSql` and `readPeerMeshRequestEligibility` again; the field is REQUIRED on every ND4
   type so tsc lists the callers — ⛔ make it optional, ⛔ default it.
10. **TR10 — two predicates** (6.36 Trap 6): 6.36b's known-people predicate admits renewal grace and is NOT this one — ⛔ touch it.
11. **TR11 — the frozen-file comment** in `claim-peer-mesh.ts` (6.6's file) — amend with a dated note; ⛔ rewrite history in comments.
12. **TR12 — logs** ([[project_anonymous_diagnostic_log_convention]]): an alarm names the ACTION (`peer_mesh_nominee_exclusion`), the claim
    and the Pariwar — ⛔ a number, an index or a nominee rank.
13. **TR13 — the `m` alias** (G1): inside `peerMeshEligibleMemberSql` every reference is `${m}.…`; a literal `m.` passes the snapshot legs
    and fails the send-time path with 42P01 (the alias there is `pr_m`).

### Testing standards

Domain live specs: `pnpm --filter @twt/domain exec vitest run tests/integration/claim/<file>` with `DATABASE_URL` on :5433; jobs live:
`pnpm --filter @twt/jobs exec vitest run tests/<file>` (own `DATABASE_URL` gate). Full gate: `pnpm ci:local` (integration job
`--concurrency=1`). Known shared-:5433 pollution ([[project_known_livedb_test_failures]]): re-run a suspect spec alone; the cure is
recreating `twt-test-pg`, ⛔ `DROP SCHEMA`. Recorded times a minute in the past (container clock skew); separate committed txns where
ordering matters.

### Project Structure Notes

All SOURCE changes sit in existing modules (`packages/domain/src/claim/`, `apps/jobs/src/`, `packages/domain/migrations/`) plus one admin
copy line (ND7). ⛔ api, mobile, contracts or i18n-package SOURCE change. Test files change in domain, jobs, ONE api test
(`peer-request-after-send.spec.ts`, G2) and the two admin copy pins (`neighbours-answers-panel.test.tsx`,
`verifier-console.test.tsx`).

### References

- `_bmad-output/implementation-artifacts/6-36-peer-mesh-school-wise-selection.md` (AC4, AC6, Traps 2 / 6, W3)
- `_bmad-output/implementation-artifacts/6-36a-member-workplace-and-posting-history.md` (THE RECORD of `-330` — SW19, SW23, SW25, I8, SF17)
- `_bmad-output/implementation-artifacts/6-27c-peer-mesh-sending-texts-and-links.md` (R1, R2, R4, BF6, P5)
- `_bmad-output/implementation-artifacts/6-31-peer-mesh-whatsapp-reminder-at-48-hours.md` (§0 edge (iii), WR2 (ix), the UPSTREAM note)
- `_bmad-output/implementation-artifacts/6-35-in-app-language-switch.md` — on `story/6-35-in-app-language-switch` (worktree
  `.claude/worktrees/6-35-in-app-language-switch`; ⛔ on `main` at the pin) — its §Sequencing
- `.decision-log.md` — `-310` CF4 A, `-311` PM1, `-330` SW19 / SW23 / SW25, `-331` SC1 A, `-339` RF1 C, `-340` call 2, `-341`, `-352` Q2,
  `-356`, `-234` V, `-235` Y, `-239`, `-263` FQ10, `-306` §2, `-365` MATCH (iii), `-366` decision 5
- `docs/launch-gate-inventory/inventory-roster.md` — Rows 17 (2026-08-28 amendment), 26, 27, 31, 35 (g)
- `_bmad-output/implementation-artifacts/deferred-work.md` — *"The deceased's FAMILY who are themselves members are ⛔ not excluded from the
  five (PM1, RECORDED)"*; 6.36 round 2 W3
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` (§0); `counsel-question-2026-10-18-nominee-contact-basis.md`

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 6.36d`, 2026-10-23.

### Debug Log References

- **Task 0.1 preflight (2026-10-23):** `git fetch origin` — `origin/main` still `69e35f73`; `git diff --name-only 69e35f73 origin/main -- apps packages scripts infra` empty ⇒ ⛔ rebase. S1–S4 clear (the predicate had six conjuncts; ⛔ nominee blind index; G2's readers unchanged — `known-people.ts` names the predicate in a comment only; the two nominee tables unchanged). S5: row 6-35 ⛔ on `main`, BUT it has COMMITTED `0179_member-preferred-locale` on its branch (journal idx 179, `when` …023) ⇒ by `-366` decision 6 this story takes **`0180`** (idx 180, `when` 1795059600024). Highest decision `-387` (6-35's), ledger `23p` held elsewhere ⇒ this branch's ledger line is `2026-10-23q`. `ListAgents`: one peer session (`twt-c8`, busy) — worked only in this worktree.
- **Migration 0180** — dry-run inside `BEGIN … ROLLBACK` on :5433 first (12 844 existing pings, 0 failing the new pattern; both CHECKs re-added; the guard's body contains `peer_is_nominee`), then `pnpm db:migrate` on :5433 (`__drizzle_migrations` id 183, `created_at` 1795059600024). ⚠ **:5432 NOT applied — held for BigDev:** 6-35's `0179` is applied on :5433 but ⛔ on :5432; drizzle's migrator applies only files whose journal `when` is LATER than the last applied row, so applying `0180` (…024) to :5432 first would make it SILENTLY SKIP 6-35's `0179` (…023) there for good.
- **Deviations from the story text, recorded (⛔ silently):** (1) ND4 says the children read the anchor cut "inside the same short read as the version read" — built as TWO short scope transactions (the cut, then `peerMeshNomineeMobileIndexes`' own version read), each CLOSED before KMS: the function needs the cut before it opens its read. TR3 holds (M9 / M13 legs). (2) ND6 "then rethrow" — the select job throws a FRESH ids-only `ClaimPeerMeshNomineeCheckError` (⛔ `cause`) in place of the raw KMS / envelope error, so nothing from the fault reaches pg-boss's stored output (AC8). (3) The 24 h finish builds its EMPTY selection through `runPeerMeshMetric` with `candidates: []` (the same dispatch replay uses), so `source` / `rankedMemberIds` match the zero branch exactly. (4) `readPeerMeshNomineeIndexes` (the children's shared wrapper) lives in `claim-peer-mesh-requests.ts` beside `readMemberFacingDeceasedName` and is imported by the reminder child, the 6.31 form.
- **A test assertion of mine was wrong, fixed:** the alarm legs first asserted `not.toMatch(/[0-9]{7}/)` — a claim / Pariwar UUID can hold a 7-digit run, so it failed on an ids-only alarm. Replaced by the nominee's own digits (`not.toContain('98765')`).
- **Shared-:5433 contention (⛔ this story):** a peer session held `ALTER TABLE audit_log_entries` while `claim-peer-mesh-requests-live.test.ts`' `afterAll` cleaned up ⇒ `lock_timeout` in the teardown (all 52 legs green) and a leftover Pariwar whose fixed link code `St4lledCode1` broke the AC4 leg on the next run. The leftover Pariwars (`9b279c95-…`, `a4e7907e-…`) were removed with the file's own teardown statement; re-run on a quiet DB: 52 / 52, clean teardown.
- **AC9 — the mutation run** (scratch runner: each edit asserted to land EXACTLY once, the named leg(s) run on :5433, the file ALWAYS restored; `git diff` clean afterwards). 24 legs, **0 survived**:
  M1 → snapshot `M1 —` RED, request `peer_is_nominee` (the `it.each` arm) RED · M2 → unit `M2 / M7` RED · M3 → jobs `M3 —` RED · M4 → request `M4 —` RED · M5 → request `M5 —` RED · M6 → reminder `M6 —` RED · M7 → unit `M2 / M7` RED, jobs `M3 —` RED · M8 → jobs `M8 —` RED, request-live `M8 (child)` RED · M8b → `M8b —` RED · M8c → `M8c / M8e` RED · M8d → `M8d —` RED · M8e → `M8c / M8e` RED · M9 → `M9 —` RED · M10 → request `M10 —` RED · M11 → request-live `M11 —` RED · M12 → reminder-live `M12 —` RED · M13 (request child) → request-live `M13 —` RED · M13 (reminder child) → reminder-live `M13 —` RED · M14 → `M14 —` RED · M15 → unit `M15 —` RED (2 legs) · M16 → snapshot `M16 —` RED.
  The M8 / M8b–M8e / M13 / M14 legs seed a `declared` version recorded BEFORE the cut with a REAL envelope and assert the counting KMS saw ≥ 1 decrypt in the positive control (M3 leg; M13 legs' first run). Coverage-only legs (⛔ mutant): the empty-list SQL leg, vacated / sentinel / invalid, a non-member nominee, the other-Pariwar member, the named-group nominee and the workplace→named fall-through, the five-stay-five leg, the ND3 stale-anchor throw, the retry-policy constant.
- **Per-file runs on :5433 (DATABASE_URL explicit):** domain unit `peer-mesh-nominees.test.ts` 14 / 14; snapshot spec 34 / 34; request spec 31 / 31 (incl. the `it.each` `peer_is_nominee` arm and the R4 five-label leg); reminder spec 25 / 25; both concurrency specs 3 / 3 + 3 / 3; `peer-mesh-request-detail.test.ts` + the RLS regression spec 62 / 63 (the one failure: below); channels `sms.test.ts` 154 / 154; jobs `claim-peer-mesh.test.ts` 39 / 39; request-live 52 / 52; reminder-live 30 / 30; api `peer-request-after-send.spec.ts` 1 / 1; admin copy pins + inspector wire 83 / 83. tsc (domain, jobs, api, admin) and eslint on every touched file: exit 0.
- **AC10 — `DATABASE_URL=…:5433… pnpm ci:local` (2026-10-23): FAILED — 34 / 36 jobs green; `test (unit)` and `integration-tests` red.** The failures, each re-run in ISOLATION:
  (a) `claim-peer-mesh-replies-policy-regression.spec.ts` "the structural CHECKs …" and (b) `peer-mesh-wa-reminder-record.spec.ts` "accepted ⇒ … locale_source …" — both FAIL in isolation too: each pins `locale_source = 'member_choice'` as REFUSED, and row 6-35's `0179` (applied to the shared :5433 by its worktree) admits it. ⛔ This story's code; they stay red on :5433 until 6-35 lands (its own spec edits) or :5433 is rebuilt without `0179`.
  (c) `import-workplaces.spec.ts` (the CLI leg), (d) `cross-pariwar-leak.spec.ts` (two `runAsCrossTenant` legs), (e) validity-service `determinism.test.ts` (100× threads) — each PASSES in isolation (14 / 14, 20 / 20, 1 / 1): the shared-DB / oversubscription class ([[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]]).
- **BigDev's calls on Task 6 (2026-10-23, verbatim):** :5432 — *"Hold until 6-35 lands (Recommended)"*: `0180` stays OFF :5432; AC10's "both DBs" leg is OWED — whichever of 6-35 / 6-36d lands second applies `0179` then `0180` there, in journal order. The gate — *"Accept with the record (Recommended)"*: AC10 is counted met on the evidence above (34 / 36; the two failures 6-35's `0179`, the three isolation-green), ⛔ a clean 36 / 36. ⚠ Push only with `DATABASE_URL=…:5433…` explicit ([[project_prepush_hook_inherits_5432]]) — :5432 lacks `0180`.
- **Code review 2026-10-23 (`bmad-code-review 6.36d`) + apply-all + the patch review:** the findings, the 16-mutant run and the evidence are in `### Review Findings` (above); patch 5 (the rebase onto `origin/main` `d87d047a`) was OPEN when this was written — see the rebase bullets below.
- **SHA map — rebase onto `origin/main` `d87d047a` (2026-10-23).** Old tip kept as the local branch `backup/6-36d-pre-rebase-2026-10-23b` (`e8a18d74`); the earlier `backup/6-36d-pre-rebase-2026-10-23` is the 8.15-era rebase. every SHA cited above this line in this story, the ledger and the decision log is an OLD one — EXCEPT `c0631882` and the commits after it, which are new — kept as written ([[feedback_supersede_never_reinterpret]]):
  `46b8cb3e` → `d2e700da` · `b749bd5d` → `48f6dacc` · `fd529315` → `a0b1ec28` (`-384`) · `9f08ccfa` → `56e1bbf0` · `6304e610` → `d9a3367f` · `3c772aa6` → `279e629a` · `bd249a6f` → `c2a9ee82` (`-386`) · `0f2e65e4` → `b056584d` · `15937e87` → `66f40932` (Tasks 1–5) · `52ece667` → `fb9bd615` · `c2b51d4e` → `6d54b1b9` (review fixes) · `e8a18d74` → `e3f6da43` (review records) · NEW: `c0631882` (the AC11 pin). `git range-diff`: commits 3, 5, 10, 11, 12 patch-identical (`=`); the rest differ only by the conflict resolutions.
- **Post-rebase gate, AC10 (2026-10-23, on :5433, `DATABASE_URL` explicit).** First full `ci:local` at `e3f6da43`: **34 / 36** — `test (unit)` (the stale pin, now fixed) and `integration-tests` (the pin + the integrity-check timeout). After `c0631882`: `test (unit)` re-run with its exact `ci:local` command — 37 / 37 tasks, `@twt/jobs` 896 passed; `integration-tests` re-run with its exact command — `domain` 6168, `events`, `queue`, `niyamavali-engine`, `validity-service`, `channels` all green, `@twt/jobs` 1435 / 1436, the one red being `tests/audit/integrity-check.test.ts` "chunk-boundary deletion" (20 s timeout); turbo aborts at that red, so `@twt/api` was run SEPARATELY: 177 files, 2080 passed + 1 skipped, 0 failed (the 8.15 / 6.35 precedent). The integrity-check red is the known one (8.15's ledger): it ALSO fails alone on :5433, the audit code and the test are byte-identical to `origin/main` (no file this branch changes is on its path), and the chain it walks holds 90 362 rows. ⚠ So AC10 is NOT met as written ("36 / 36"): 35 / 36 by component, ⛔ one end-to-end run, with the one exception unrelated to this story — BigDev's call, as for 8.15. The `:5432` leg (`0179` then `0180`, in journal order) is still OWED.
- **`:5432` — `0179` then `0180` APPLIED (2026-10-23; BigDev: *"1,2,3"*, the first item, on the standing call *"Hold until 6-35 lands"*).** Read-only first: 178 migrations, `0178` the latest, `0179` / `0180` absent, the role superuser, `claim_peer_mesh_pings` 420 rows. A DRY RUN of both files in one `BEGIN … ROLLBACK` (no error; the 420 rows satisfy the new CHECKs; the rollback left the schema unchanged); then `DATABASE_URL=…:5432… pnpm db:migrate` (the project's migrator, journal order). After: 180 migrations, `0179` and `0180` present, `members.preferred_locale` + `preferred_locale_set_at` exist, two CHECKs name `peer_is_nominee`, the guard function carries the label, the 420 rows untouched, and the journal hashes of both equal the files' sha256 AND `:5433`'s. ⛔ tests were run against `:5432` (they commit rows into the dev database).
- **Fresh-database gate on `:5434` (`twt_6_36d`, created for this run; BigDev: the third item) — STARTED, then KILLED by Claude Code's memory safeguard, ⛔ restarted.** `ci:local` with `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS=1` (the 10.23 gate's own override for a disposable database) got through `lint`, `typecheck` and `build` (green) and was inside `test (unit)` (the 4th job, `DATABASE_URL` unset) when the machine (8 GB RAM) ran low on memory; no process of mine survived and nothing reached the database (the audit chain there is empty, 180 migrations). The database is kept pristine for a re-run, which is BigDev's call. So the AC10 numbers above stand unchanged: 35 / 36 by component on `:5433`, ⛔ a fresh-database confirmation of the integrity-check leg.
- **Fresh-database gate — PASSED, 36 / 36 (2026-10-23, fourth review round).** The shared `:5433` container (`twt-test-pg`) was RECREATED (BigDev: *"Recreate :5433, re-push"*; ⛔ connection open on it, checked first; same `postgres:16` image and env), migrated by the project's migrator (180 migrations), then the pre-push hook's `ci:local` ran with `DATABASE_URL=…:5433…` explicit at `b58d3857`: **`ci:local PASSED — 36 job(s) green`** (jobs 1437 / 1437, api 2080 + 1 skipped, domain 6170 + 1 skipped). Why recreated: the first push's hook failed ONE job, `integration-tests`, on `apps/jobs/tests/audit/integrity-check.test.ts` "chunk-boundary deletion" (20 s timeout, also in isolation) — `verifyAuditChain` with `chunkSize: 1` walks the whole chain and the long-lived database held 89,623 `audit_log_entries` rows (the accumulation class, ⛔ this story). This is the fresh-database confirmation v2.0 left open; AC10 now MET as written (36 / 36).

### Completion Notes List

- 2026-10-22 — Story created by `bmad-create-story 6.36d` (v1.0): three parallel read-only research passes (code at `b883dc15`; the
  governance record; 6.36 / 6.27c / 6.31 intelligence) + the author's own spot-checks of G1, G6, G7, G9, G11. Ultimate context engine
  analysis completed — comprehensive developer guide created.
- 2026-10-23 — Validated by `bmad-create-story validate 6.36d` (v1.1): branch fast-forwarded to `origin/main` `40420410`; four parallel
  read-only verifiers (code claims, mechanism, governance, premise / reuse / clarity); the disputed points spot-checked against the source
  (`-339` RF1 C's text; `-330`'s "the SW block … is the record"; pg-boss `QUEUE_DEFAULTS`). BigDev: *"all"*. Then two fresh-context
  re-validators of the pass's OWN text (mechanism: 2 H / 4 M / 6 L; governance: 4 H / 6 M / 4 L — incl. the pass's own `-339` over-reading,
  a v1.0 residual it had dropped (the nominee replaced between death and filing — restored to ND8), PQ2's missing roster leg, and SW20 (ii)
  extended without being named); every finding applied; `-340` call 1 and `-295` §0 quotes spot-checked.

- 2026-10-23 — The Panel note was written early (BigDev: *"write the routing note now"*), sent by BigDev and ANSWERED: *"by DR and KB"* /
  *"Q1 A, Q2 A"* ⇒ `2026-10-23-384` (Trustee-ratified), committed alone (`cc0c63bb`, `fd529315` after the rebase onto `69e35f73` — BigDev ran the commit after the tool's commit was
  refused). Records follow in the next commit.
- 2026-10-23 — Task 0.2, BigDev (verbatim): *"8-15 is closed and landed on main. For ND1–ND6, ND8, ND9 - your recommendation is accepted,
  however fix the ND6/AC3 contradiction, and clean up the stale decision-status language before the first implementation commit."* Done in
  v1.3: the branch rebased onto `69e35f73` (8.15 landed; ⛔ claim / nominee / jobs code moved; ledger lines re-lettered `23b`/`23f`/`23g` →
  `23g`/`23h`/`23i`); the ND6/AC3 contradiction — ND3 (which AC3 builds on) said ⛔ selection is ever made without the indexes, while ND6's
  chosen arm finishes by writing one, and AC3 carried ⛔ clause for the select job's fault path — fixed: ND3 now says no selection that
  CHOOSES anyone is made without them, the ONE exception being ND6's EMPTY finish; AC3 gains the fault path (alarm + rethrow, the retry
  policy, the 1 h self re-send, the 24 h finish with `nominee_check_unavailable`); mutants M8b–M8e split to match. Stale decision-status
  wording replaced throughout (PROPOSED / RECOMMENDED / non-blocking / subject-to-PQ2 / "under ND… (x)" branches → CHOSEN / Rejected /
  ANSWERED by `-384`). Then one fresh-context check of the cleanup diff (0 HIGH; 2 MEDIUM, 5 LOW — incl. two #57 losses of the pass's
  own: BigDev's confirmation of ND7 / ND10 restored as OWED, and "⛔ claimed by this file" restored); all applied. Still owed at Task 0.2:
  the `-356` reading and BigDev's confirmation of ND7 / ND10.

- 2026-10-23 — Task 0.2 COMPLETED. ND7 (b) / ND10 (a) confirmed (*"Confirm both (Recommended)"*). The `-356` reading: BigDev would not
  accept the residual until it was established why the two numbers cannot be compared (verbatim in Task 0.2); a read-only investigation
  found ⛔ other route (G18, its load-bearing claims spot-checked: the sole writer, the erasure-only UPDATE, `-112` 4(b), the declaration
  contract); BigDev: *"Accept + follow-ups (Recommended)"* — ND8 rewritten to state the gap precisely, the reminder read as ⛔ within
  `-356`, two follow-ups in Task 0.4. A side finding — `-340` / `-341`'s filer conjuncts exclude nobody in v1 (every intake path writes
  `claimant_actor_id` NULL) — verified and recorded in `deferred-work.md` (*"Verify + record (Recommended)"*).

- 2026-10-23 — Task 0.3: [`2026-10-23-386`](../../.decision-log.md#decision-2026-10-23-386) (author-commit, ND1–ND10) committed ALONE as
  `bd249a6f` (`-385` was taken first by row 6-35). Task 0.4: the records — `epics.md` `### Story 6.36d`; roster Row 31 leg (i) (ALL EIGHT →
  ALL NINE, its Panel half met by `-384`, counsel's half open) + dated notes on Rows 26 / 27 / 35 (g); `deferred-work.md` — the family item
  and 6.36's W3; dated annotations on 6.36 (AC4, Trap 2), 6.36a (SW19, SW23) and 6.31 (§0 edge (iii), UPSTREAM); question 6 added to
  `counsel-question-2026-10-18-nominee-contact-basis.md` (⛔ sent); the follow-up row `6-36e-nominee-member-link-at-declaration` (backlog).

- 2026-10-23 — **Tasks 1–5 implemented** (`bmad-dev-story 6.36d`). ONE conjunct on `peerMeshEligibleMemberSql` through ONE fragment (`peerMeshNomineeMatchSql`, also the `is_nominee` label); ONE read of the indexes (`peerMeshNomineeMobileIndexes` — ND1 (b)'s as-of-cut projected versions, decrypt + normalise + de-duplicate, ONE batch HMAC into the login space, ⛔ inside any transaction); the select job pre-reads unlocked, computes the indexes with ⛔ transaction open, and fails CLOSED (ND6: alarm + rethrow under the child retry policy; a 1 h self re-send on the final attempt; an EMPTY `nominee_check_unavailable` selection after 24 h); both send-time children compute the indexes once, after `nothing_due`, by the selection's anchor cut; `peer_is_nominee` in lockstep (constant, pattern, migration `0180`'s two CHECKs and the replacement guard); the staff line's third disjunct and copy (ND7). Every AC9 mutant RED. ⚠ Two items await BigDev before Task 6 can close: `0180` on :5432 (held — it would orphan 6-35's `0179` there), and `ci:local`'s two :5433 failures caused by 6-35's `0179` (Debug Log).

- 2026-10-23 — **Task 6 / Task 7.** BigDev: *"Hold until 6-35 lands (Recommended)"* and *"Accept with the record (Recommended)"* (verbatim in the Debug Log). AC10 met on the record (34 / 36 — ⛔ this story's failures); `0180` OWED on :5432 to whichever of 6-35 / 6-36d lands second. Status → review. ⛔ "Closed by" anywhere (deferred-work's family item, `-366` decision 5, Row 35 (g)) until the row is `done` on `main` ([[feedback_closure_language_precision]]). Go-live still waits on Row 31 (i) (counsel's written basis + the privacy-policy line).

### File List

Source:
- `packages/domain/src/claim/peer-mesh-nominees.ts` (new) — `peerMeshNomineeMobileIndexes`, `peerMeshNomineeCiphertextsAsOf`, `resolvePeerMeshSelectionFilingCut`, `PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE`
- `packages/domain/src/claim/index.ts` — barrel export
- `packages/domain/src/claim/peer-mesh-read.ts` — `nomineeMobileIndexes` on `PeerMeshEligibilityExclusions`; `peerMeshNomineeMatchSql`; the conjunct; `PeerMeshEligibleSnapshotInput`; `getPeerMeshDeceasedWorkplace` (split out); `getPeerMeshNomineeChangeBeforeFiling`, `getPeerMeshRecentChangeBeforeFiling` (ND7)
- `packages/domain/src/claim/peer-mesh-request.ts` — the indexes threaded; the `is_nominee` label column and order
- `packages/domain/src/claim/peer-mesh-wa-reminder.ts` — the indexes threaded into WR2 (ix)
- `packages/domain/src/claim/peer-mesh-persist.ts` — `PEER_MESH_SKIP_REASON_NOMINEE_CHECK_UNAVAILABLE`
- `packages/domain/src/schema/claim_peer_mesh_pings.ts` — `peer_is_nominee` in the array and the pattern
- `packages/domain/migrations/0180_peer-mesh-request-peer-is-nominee.sql` (new), `packages/domain/migrations/meta/_journal.json`
- `apps/jobs/src/claim-peer-mesh.ts` — ND3 pre-read, `encryption` dep, ND6 (alarm / rethrow / defer / finish), `includeMetadata`, the dated header note
- `apps/jobs/src/boot.ts` — `encryption: jobsEncryption`; the OCR hook's retry policy (review 2026-10-23: now `enqueueClaimPeerMeshSelect(boss, input)`)
- review 2026-10-23, `apps/jobs/src/claim-peer-mesh.ts` — `nomineeCheckFirstFailureInstant`, `PEER_MESH_NOMINEE_CHECK_RETRY_SPAN_MS`, `claimPeerMeshSelectAttemptOf`, `enqueueClaimPeerMeshSelect`; the final-attempt alarms; `packages/contracts/src/claims/verifier-console.ts` (doc comment only)
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` — `readPeerMeshNomineeIndexes`; the child threads the indexes
- `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts` — the reminder child threads the indexes
- `apps/admin/src/modules/claim-verification/i18n-en.ts` — `peerMesh.recentChangeBeforeFiling` (ND7)

Tests:
- `packages/domain/tests/claim/peer-mesh-nominees.test.ts` (new)
- `packages/domain/tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts`, `peer-mesh-request.spec.ts`, `peer-mesh-wa-reminder.spec.ts`, `peer-mesh-request-concurrency.spec.ts`, `peer-mesh-wa-reminder-concurrency.spec.ts`
- `apps/jobs/tests/claim-peer-mesh.test.ts`, `claim-peer-mesh-requests-live.test.ts`, `claim-peer-mesh-wa-reminders-live.test.ts`
- review 2026-10-23: the three jobs files above gain the review legs (M8f–M8k, the no-DB `describe`, the ND1 refile pairs, the M13 controls); `packages/domain/tests/claim/peer-mesh-nominees.test.ts` the ordering log
- review 2026-10-23 (post-rebase): `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts` — the AC11 pin on `peer-mesh-wa-reminder.ts` re-taken
- review round 4 (2026-10-23): `apps/jobs/src/claim-ocr-parity.ts` — the select hook's doc comment (`enqueueClaimPeerMeshSelect`, the idempotency probe); `apps/jobs/src/claim-peer-mesh.ts` — the FINISH alarm text, the retry-span comment; `docs/launch-gate-inventory/inventory-roster.md` — Row 26 dated note
- `apps/api/tests/integration/claims/peer-request-after-send.spec.ts`
- `apps/admin/tests/neighbours-answers-panel.test.tsx`, `apps/admin/tests/verifier-console.test.tsx`

Records:
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (row `in-progress`; ledger `2026-10-23q`; review: row `review` → `in-progress`, ledger `2026-10-23y`)
- `_bmad-output/implementation-artifacts/deferred-work.md` (review: a section for this story)
- Task 0.4's records (also in the Completion Notes): `docs/launch-gate-inventory/inventory-roster.md` (Row 31 leg (i); dated notes on Rows 26 / 27 / 35 (g)), `_bmad-output/planning-artifacts/epics.md` (`### Story 6.36d`), `.decision-log.md` (`-384`, `-386`), the routing note `trustee-panel-routing-note-2026-10-23-6-36d-nominees-not-asked.md`, and `counsel-question-2026-10-18-nominee-contact-basis.md` (question 6)
- `_bmad-output/implementation-artifacts/6-36d-exclude-nominees-from-the-five.md`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 1.0 | Created (`bmad-create-story 6.36d`): G1–G16 found at `b883dc15`; ND1–ND10 PROPOSED for BigDev at Task 0.2; ⛔ Panel question blocking (ND10's basis half split off); row `backlog` → `ready-for-dev`. |
| 2026-10-23 | 1.1 | Validated (`bmad-create-story validate 6.36d`; four verifiers; BigDev *"all"* on 25 findings; then two fresh-context re-validators of the pass's own text — 6 HIGH, all the pass's own, applied). Re-pinned `40420410`. ND1 recommendation (a) → **(b)**, the `-339` cut (one set per claim; both options the author's — `-339`'s words are scoped to a later claim, `-340` call 1); ND7 gains **(b)** the staff line for nominee changes, EXTENDING `-330` SW20 (ii) (ratified in effect) subject to PQ2; ND10 (a) is now a non-blocking Panel question (`-352` Q2, superseded in part by `-356`), ⛔ a told item — ⇒ TWO non-blocking PQs in one note, both named in Row 31 leg (i); ND6 rewritten (⛔ DLQ exists — G17; alarm + retry policy + `includeMetadata` + a final-attempt arm on the nominee fault only: defer-then-finish / finish with `nominee_check_unavailable` / rethrow; a delivery failure, `-295` §0); ND3 supersedes `-330` SW19 (⛔ "6.36's author rule") and pre-reads so a no-op run calls ⛔ KMS; ND4 REQUIRED on every input type; ND2's `${m}` alias, one match fragment; ND8 residuals; AC2 one function (`InScope` shape); Task 0.3 supersessions / amendment / RESOLVES IN PART; Task 0.4 reference sites; G2 / G4 / G5 / G7 / G10 / G12 / G14 / G16 corrected, G17 added; Sequencing with 6-35; mutants M8b, M11–M16; AC7 (staff line) added, ACs renumbered AC0–AC10 as bullets; Policy meaning made conditional on the declared number and the Niyamavali cite located. |
| 2026-10-23 | 1.2 | The Panel note written early and ANSWERED — `2026-10-23-384` (Trustee-ratified, DR + KB): Q1 A, Q2 A. ND7 settled as (b), ND10's Panel half as (a); counsel's written basis stays a go-live condition (Row 31 (i)). Dated notes only — ⛔ earlier text edited. Status stays `ready-for-dev`. |
| 2026-10-23 | 1.3 | Task 0.2: BigDev accepted ND1–ND6, ND8, ND9 as recommended. Rebased onto `69e35f73` and re-pinned. ND6/AC3 contradiction fixed (ND3's "never without the indexes" scoped to selections that choose anyone; AC3 owns the select-job fault path; M8b–M8e). Decision-status cleanup: ND1–ND10 now state CHOSEN / Rejected; the Panel-questions section is the `-384` ruling with a pointer to the note; ACs, Tasks and Dev Notes lose the branches for rejected options. ⛔ Commitment softened (a fresh-context check of the diff restored the two it found). Still owed: the `-356` reading and BigDev's confirmation of ND7 / ND10. |
| 2026-10-23 | 1.4 | Task 0.2 complete: ND7 / ND10 confirmed; the `-356` reading answered after an investigation (G18 — the declared number is the only nominee→member link; BigDev accepted the data-model gap + two follow-ups in Task 0.4); ND8's first residual rewritten precisely; the `-340` / `-341` null-claimant finding recorded in `deferred-work.md`. Next: Task 0.3. |
| 2026-10-23 | 1.5 | Task 0.3 (`-386`, `bd249a6f`) and Task 0.4 (records across epics, roster, deferred-work, three sibling stories, the counsel question; new backlog row 6-36e) done. Governance complete; next is Task 1. |
| 2026-10-23 | 1.6 | `bmad-dev-story 6.36d`: Status → in-progress; Task 0.1 preflight (migration `0180` — `0179` is row 6-35's); Tasks 1–5 implemented and tested, M1–M16 (M8b–M8e, both M13 halves) all RED. Task 6 open: `ci:local` 34 / 36 (two failures from 6-35's `0179` on the shared :5433, three isolation-green load flakes) and `0180` held on :5432 — both for BigDev. |
| 2026-10-23 | 1.7 | Task 6 closed on BigDev's calls (*"Hold until 6-35 lands"* — `0180` off :5432, owed; *"Accept with the record"* — AC10 counted met at 34 / 36, the record in the Debug Log). Task 7: Status → review; sprint row `in-progress` → `review` (ledger `2026-10-23r`). |
| 2026-10-23 | 1.8 | `bmad-code-review 6.36d` + apply-all (BigDev: *"1"*) + the patch review (*"run adversarial review on patches applied once done"*): Status `review` → `in-progress`; patches 1–4 and 6–9 applied, patch 5 (the rebase onto `origin/main`) OPEN; 4 + 1 items deferred; dated notes on ND4, ND6, AC4 and Policy meaning; 16 mutants RED. Details: `### Review Findings`. |
| 2026-10-23 | 1.9 | Patch 5 applied: rebased onto `origin/main` `d87d047a` (6.35 landed; five conflict stops, the SHA map in the Debug Log). The post-rebase `ci:local` found a STALE AC11 fence pin on `peer-mesh-wa-reminder.ts` (also stale before the rebase; re-taken, `c0631882`). AC10: 35 / 36 by component — the known integrity-check red; the `:5432` leg owed. Status `in-progress` → `review`. |
| 2026-10-23 | 2.0 | BigDev *"1,2,3"*: `:5432` migrated (`0179` then `0180`, dry-run first, hashes equal `:5433`'s); the third review round (0 HIGH; the 6.35 × 6.36d begin ORDER now pinned in both begins, `boot.ts`'s hook pinned by source, comments / titles / records tidied); the fresh-database gate was started and killed by the memory safeguard — not repeated. Status stays `review`. |
| 2026-10-23 | 2.1 | Fourth review round (BigDev *"1"*: the whole story diff in one pass; three read-only layers): 15 raw → 4 `patch` (LOW), 1 `defer`, 8 dismissed; ⛔ HIGH / MED / AC violation. Apply-all (BigDev *"1, after that open pr"*): the FINISH alarm names the attempt, Row 26 dated note, the OCR hook comment, the "first chain" correction (comment + ND6 note (1)). Status stays `review`. |
| 2026-10-23 | 2.2 | BigDev *"yes, record it … if not then move to done"*: the fresh-database gate PASSED 36 / 36 (`:5433` recreated, pushed through the hook; PR #300); AC10 met as written; ⛔ open task, review item or merge-fence item remains (go-live items stay in Rows 31 (i) / 26; deferrals in deferred-work). Status `review` → **`done`**. |
