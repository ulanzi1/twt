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
Panel half are Trustee-ratified by `2026-10-23-384` (BigDev's confirmation of them as build decisions still owed). ONE author-commit records them BEFORE any code (Task 0.3,
[[feedback_governance_commits_precede_implementation]]); it still needs BigDev's answer on the `-356` reading and his confirmation of
ND7 / ND10 (Task 0.2).

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

Status: ready-for-dev

> ⭐ **Next: Task 0.2's last answer (the `-356` reading), then Task 0.3** — governance FIRST, ⛔ code. ND1–ND10 are decided and the Panel
> has ruled (`-384`); the author-commit is committed ALONE (Task 0.3), the records commit follows (Task 0.4), and only then Task 1.

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
- **ND7 — the staff line, and ⛔ other new record.** **CHOSEN (b) — Trustee-ratified, `-384` Q2 A: a nominee version recorded in
  `[cut.recentFrom, cut.cut)` also sets `recent_change_before_filing`** (a third disjunct in `getPeerMeshGroupedSnapshot`, a plain EXISTS
  on `member_nominee_versions` — ⛔ decrypt), and the admin copy `peerMesh.recentChangeBeforeFiling` reads *"The member's workplace, the
  people they named or their nominees changed in the 90 days before the filing used to choose whom to ask."* (en; the admin console has ⛔
  hi file; the words are the author's — `-384` ratified the warning, ⛔ its wording). It keeps SC1 A's accepted cost condition (*"staff see
  the warning"*) for the new channel. **Rejected:** (a) ⛔ staff line (widens SC1 A's cost; the Panel chose Q2 A = ND7 (b)). Also: ⛔ `metric_version` bump (the `-340` / `-341` precedent, G14); ⛔ excluded count, ⛔
  event-payload change; the zero branch keeps `no_workplace_colleague_or_named_person` (G15 — recorded imprecision).
- **ND8 — residuals RECORDED, ⛔ built.**
  - a nominee whose declared mobile differs from their login mobile (a second phone, a changed number) escapes — still selected, texted
    and, if opted in, reminded (the `-366` (vii) exposure, carried);
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
- **AC4 — send time (6.27c).** The child computes the indexes once per run (ND4), after `nothing_due`, outside any tx, with the cut from the
  selection's anchor claim (ND1 (b)), and passes them into `beginPeerMeshRequest` and `finalisePeerMeshNoSendableNumber`. A ping whose member
  BECAME a nominee match after selection (a member who took a nominee's number after the selection was drawn) ⇒ fresh:
  `no_target:peer_is_nominee` (ND5) + a replacement that also skips nominees; re-claimed:
  `error` + `exhausted:recheck_peer_ineligible`, as today. A child with nothing due decrypts nothing (P5 kept). A KMS fault ⇒ one alarm +
  `ClaimCorrectionTransientError`, ⛔ ping begun (ND6).
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
  applied to BOTH :5432 and :5433 ([[project_live_db_test_gotchas]]); tsc and eslint exit 0.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0)**
  - [ ] 0.1 Preflight: `git fetch origin`; `git diff --name-only 69e35f73 origin/main -- apps packages scripts infra` — if non-empty, rebase
        and re-verify G1–G17 by FUNCTION; STOP if any of: (S1) the predicate already has a nominee conjunct; (S2) a nominee blind index now
        exists; (S3) a new caller of the predicate exists that G2 does not list; (S4) `member_nominees` / `member_nominee_versions`
        `mobile_ciphertext` changed shape; (S5) row 6-35 is on `main` — re-verify G11 / G13 against its begin inputs and take the next free
        migration (Sequencing). `ListAgents`; re-grep every ref and worktree (`git for-each-ref`, `git worktree list`) for the highest
        decision id, migration number and ledger letter. (Known: 0119 backfills nothing, by design (`-232`; *"A dev database holding old
        rows is RESET"*); the one writer appends versions with every declare ⇒ a member with no version has no nominee for ND1 (b) —
        recorded, ⛔ fixed; nothing in production.)
  - [ ] 0.2 BigDev's answers, VERBATIM (also in the Completion Notes):
        - ND1–ND6, ND8, ND9 — 2026-10-23: *"For ND1–ND6, ND8, ND9 - your recommendation is accepted, however fix the ND6/AC3 contradiction,
          and clean up the stale decision-status language before the first implementation commit."* (both done in v1.3);
        - ND7 (b) and ND10's Panel half — `2026-10-23-384` (Trustee-ratified, *"by DR and KB"* / *"Q1 A, Q2 A"*);
        - ⭐ STILL OWED: the PROPOSED `-356` reading (Task 0.3's RECORDS bullet), and BigDev's one-line confirmation of ND7 (b) / ND10 (a)
          as the author's build decisions (the Panel ruled the questions — `-384` Consequence 1: *"At Task 0.2 BigDev answers the rest"*;
          Row 31 (i) and the single counsel instrument are ND10's author-side half, named in `-384` Consequences 2–3). Task 0.3 waits on both.
  - [ ] 0.3 The author-commit: the next free decision id (≥ `-385`, dated the day it is COMMITTED), *"AUTHOR-COMMIT (BigDev) — STORY
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
          notification for nominee"*) is recorded as a READING, ⛔ assumed away. PROPOSED reading (⭐ STILL OWED — BigDev confirms or
          replaces it at Task 0.2): it is ⛔ a "notification for nominee" — the reminder goes to them as one of the five, the system ⛔
          knowing them as a nominee;
        - records the ND6 delivery-failure §0 row (`-295` §0).
        Committed ALONE as `governance: …`; its SHA written after, ⛔ before ([[project_decision_log_writes_user_inserted]] — if the write is
        refused, ask once).
  - [ ] 0.4 The records commit (append-only, each dated):
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
        - the Panel note — DONE: written, sent and answered 2026-10-23 (`-384`); it is a record now — ⛔ edit it.
- [ ] **Task 1 — the predicate and the indexes (AC1, AC2)**
  - [ ] 1.1 `nomineeMobileIndexes` (required) on every ND4 type + `peerMeshNomineeMatchSql` + the ND2 conjunct; doc comments extended in the
        house style.
  - [ ] 1.2 `peerMeshNomineeMobileIndexes` and `PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE` in `packages/domain/src/claim/peer-mesh-nominees.ts`,
        exported through the claim barrel; ⛔ logging of inputs.
- [ ] **Task 2 — the select job (AC3, AC7)**
  - [ ] 2.1 The ND3 pre-read (claim, selection, state, cut, ciphertexts), closed, then KMS; pass the indexes into `getPeerMeshGroupedSnapshot`
        → both snapshot readers; the retryable throw when the locked tx reaches the snapshot without them. Required `encryption` in
        `ClaimPeerMeshDeps`; wire `jobsEncryption` in `boot.ts`.
  - [ ] 2.2 ND6: the alarm, the retry policy on the OCR hook's send, `{ includeMetadata: true }` on the select `boss.work` and `attempt`
        threaded into `runClaimPeerMeshSelect`; on the nominee-exclusion fault only — the 1 h self re-send carrying the first-failure
        instant, and the 24 h finish (an EMPTY selection, `nominee_check_unavailable`, `claim.peer_mesh_none_to_ask`, the second alarm).
  - [ ] 2.3 ND7: the nominee-change disjunct in `getPeerMeshGroupedSnapshot`; the admin copy and its two test pins.
  - [ ] 2.4 The header comment's frozen-file / no-KMS notes amended (dated, citing the new decision).
- [ ] **Task 3 — send time and the reminder (AC4, AC6)**
  - [ ] 3.1 `readPeerMeshRequestEligibility`: input gains the indexes; a labelling column `is_nominee` (`peerMeshNomineeMatchSql` on `pr_m`);
        the order of AC5.
  - [ ] 3.2 `beginPeerMeshRequest`, `insertPeerMeshReplacementPing`, `finalisePeerMeshNoSendableNumber`, `beginPeerMeshWaReminder` thread
        the indexes; the two children compute them once (after `nothing_due`), outside any tx, with the anchor-claim cut; ND6's alarm + throw.
- [ ] **Task 4 — the label (AC5)** — the migration (dry-run inside `BEGIN … ROLLBACK` on
      :5433 first; then both DBs), journal, constants, every G12 pin. ⛔ Edit 0166 in place.
- [ ] **Task 5 — tests (AC9)** — extend `peer-mesh-workplace-snapshot.spec.ts` (SW23 block), `peer-mesh-request.spec.ts`,
      `peer-mesh-wa-reminder.spec.ts`, `apps/jobs/tests/claim-peer-mesh.test.ts`, `claim-peer-mesh-requests-live.test.ts`,
      `claim-peer-mesh-wa-reminders-live.test.ts`; a unit test for the function's filter / normalise / dedupe / empty / fault paths; and the
      test-tree callers tsc lists (G2: `apps/api/tests/integration/claims/peer-request-after-send.spec.ts`, the two concurrency specs,
      `claim-peer-mesh.test.ts`'s direct `insertPeerMeshReplacementPing` call and its `deps()` / `windowDeps()` — pass `[]` / `enc`). Real
      envelopes and real indexes where a leg goes through the function (G16, TR8); recorded times placed explicitly
      ([[project_db_clock_ordering_tests_tie]]). Run M1–M16 (incl. M8b–M8e); record each.
- [ ] **Task 6 — the gate (AC10)** — `ci:local` on :5433; push only with `DATABASE_URL=…:5433…` explicitly
      ([[project_prepush_hook_inherits_5432]]).
- [ ] **Task 7 — closing records** — story Status → review, File List, Change Log, the sprint row + ledger line (next free letter).
      ⛔ "Closed by" on deferred-work / `-366` decision 5 / Row 35 (g) until the row is `done` on `main` ([[feedback_closure_language_precision]]).

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

### Debug Log References

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

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 1.0 | Created (`bmad-create-story 6.36d`): G1–G16 found at `b883dc15`; ND1–ND10 PROPOSED for BigDev at Task 0.2; ⛔ Panel question blocking (ND10's basis half split off); row `backlog` → `ready-for-dev`. |
| 2026-10-23 | 1.1 | Validated (`bmad-create-story validate 6.36d`; four verifiers; BigDev *"all"* on 25 findings; then two fresh-context re-validators of the pass's own text — 6 HIGH, all the pass's own, applied). Re-pinned `40420410`. ND1 recommendation (a) → **(b)**, the `-339` cut (one set per claim; both options the author's — `-339`'s words are scoped to a later claim, `-340` call 1); ND7 gains **(b)** the staff line for nominee changes, EXTENDING `-330` SW20 (ii) (ratified in effect) subject to PQ2; ND10 (a) is now a non-blocking Panel question (`-352` Q2, superseded in part by `-356`), ⛔ a told item — ⇒ TWO non-blocking PQs in one note, both named in Row 31 leg (i); ND6 rewritten (⛔ DLQ exists — G17; alarm + retry policy + `includeMetadata` + a final-attempt arm on the nominee fault only: defer-then-finish / finish with `nominee_check_unavailable` / rethrow; a delivery failure, `-295` §0); ND3 supersedes `-330` SW19 (⛔ "6.36's author rule") and pre-reads so a no-op run calls ⛔ KMS; ND4 REQUIRED on every input type; ND2's `${m}` alias, one match fragment; ND8 residuals; AC2 one function (`InScope` shape); Task 0.3 supersessions / amendment / RESOLVES IN PART; Task 0.4 reference sites; G2 / G4 / G5 / G7 / G10 / G12 / G14 / G16 corrected, G17 added; Sequencing with 6-35; mutants M8b, M11–M16; AC7 (staff line) added, ACs renumbered AC0–AC10 as bullets; Policy meaning made conditional on the declared number and the Niyamavali cite located. |
| 2026-10-23 | 1.2 | The Panel note written early and ANSWERED — `2026-10-23-384` (Trustee-ratified, DR + KB): Q1 A, Q2 A. ND7 settled as (b), ND10's Panel half as (a); counsel's written basis stays a go-live condition (Row 31 (i)). Dated notes only — ⛔ earlier text edited. Status stays `ready-for-dev`. |
| 2026-10-23 | 1.3 | Task 0.2: BigDev accepted ND1–ND6, ND8, ND9 as recommended. Rebased onto `69e35f73` and re-pinned. ND6/AC3 contradiction fixed (ND3's "never without the indexes" scoped to selections that choose anyone; AC3 owns the select-job fault path; M8b–M8e). Decision-status cleanup: ND1–ND10 now state CHOSEN / Rejected; the Panel-questions section is the `-384` ruling with a pointer to the note; ACs, Tasks and Dev Notes lose the branches for rejected options. ⛔ Commitment softened (a fresh-context check of the diff restored the two it found). Still owed: the `-356` reading and BigDev's confirmation of ND7 / ND10. |
