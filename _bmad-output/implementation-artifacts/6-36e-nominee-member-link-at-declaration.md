---
baseline_commit: 1268d47e
---

<!--
PINNED: `1268d47e` = `origin/main` (`git fetch origin` 2026-10-23, after 6.36d LANDED — PR #300, `c8ad2327` + the `23af` ledger). Created at
`1268d47e`. Built in its OWN worktree `/Users/dev/Developer/projects/TWT/.claude/worktrees/6-36e-nominee-member-link-at-declaration`, branch
`story/6-36e-nominee-member-link-at-declaration` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — ⛔ switch the
main checkout; sibling worktrees 3-3c / 5-11 / 6-35 / 11b-4 exist). Two facts, stated separately: (1) the pin is an ancestor of this branch
(durable); (2) every `apps/` / `packages/` claim below was traced at `1268d47e` on 2026-10-23 by four read-only research passes and the
load-bearing ones spot-checked (perishable — re-check at Task 0.1). Re-locate by FUNCTION, ⛔ by line number.

STATUS: ready-for-dev (v1.1). NE1–NE14 are PROPOSED — BigDev answers them at Task 0.2; ONE author-commit records them BEFORE any code
(Task 0.3, [[feedback_governance_commits_precede_implementation]]). TWO Panel questions (PQ1, PQ2) are OWED — the row itself says so
(*"Needs the nominee's agreement and its OWN Panel question (new processing, outside `-384`)"*); WRITTEN 2026-10-23 (BigDev: *"yes commit and write the panel note"*) as
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-6-36e-nominee-member-link.md`, ⛔ sent. The code (Task 1+) waits
for the ruling (PQ1 option C would mean ⛔ build) unless BigDev rules otherwise at Task 0.2.

§0 GATE (the routing template's): matching nominees by a member link inside the ONE eligibility predicate is the AUTHOR's — the `-340` /
`-341` / `-386` class (*"which members are asked"*). THREE halves touch §0 bullets and go to the Panel as ONE note with TWO questions:
PQ1 — *"a LEGAL or consent BASIS for handling someone's data"* (recording which member ACCOUNT a nominee is, a new processing of the
nominee-member's data outside `-384` Q1 A's *"only"*; WHEN the nominee's agreement is needed); PQ2 — *"what the Trust DISCLOSES about a
person, or to whom"* (telling a member they were named a nominee; telling the declarer which of their contacts are members FOR THIS
PURPOSE — an extension of `-310` CF5 A, ratified for "people who know me"). Counsel's WRITTEN basis + a privacy-policy line stay a GO-LIVE
condition (a new roster Row 31 leg (j), Task 0.4), ⛔ the build, ⛔ the merge.

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never") · ⭐ = action /
emphasis · ⚠ = hazard.

ADDRESSING RULE: ⛔ file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite decision id +
clause, item heading, row key).

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*), each re-grepped at the commit that
takes it (`git log --all` + every worktree): decisions — highest `-391` (`story/11b-4-…`, committed `fd27c797`; `-389` / `-390` on
`story/5-11-…`, `cd06cc5d`) ⇒ the author-commit takes ≥ `-392`. Migrations — highest COMMITTED `0180_peer-mesh-request-peer-is-nominee`;
⚠ the uncommitted 11b.4 story PLANS `0181` ⇒ this story's is `0181` only if it commits first, else ≥ `0182`
([[project_sibling_migration_when_order_shared_db]] — journal `when` order). Ledger letters: `2026-10-23ak` is the highest on any branch
(11b-4) ⇒ this creation line takes `2026-10-23al` (re-grep at commit).

LETTERS: G = found facts (traced at the pin) · NE = build decisions (PROPOSED) · PQ = Panel questions (OWED) · TR = traps.
-->

# Story 6.36e: A Member May Mark a Nominee Who Is Also a Member — Found From Their Own Contacts, Told in the App — So That Nominee Is Never Among the Five, Whatever Number They Sign In With `[PRIMITIVE]` `[SURFACE]`

Status: ready-for-dev

> ⭐ **Next: Task 0.1 (preflight), then Task 0.2 — BigDev answers NE1–NE14, and the Panel note (PQ1 + PQ2) is written from the template and
> sent by BigDev.** ⛔ Code until the author-commit (Task 0.3) is committed ALONE and the records (Task 0.4) follow it.

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

Story 6.36d keeps a dead member's NOMINEES out of the five members asked about the death — but it can only recognise a nominee who is a
member by PHONE NUMBER: the number the deceased typed for the nominee must equal the number that nominee SIGNED UP with (6.36d G18 /
ND8 — *"The only true fix is a member link captured at declaration"*; BigDev accepted the gap and asked for this follow-up row). A
nominee on a second SIM, a family phone, or a typo escapes and can be asked. This story lets a member, when declaring nominees in **Life
Events**, mark a nominee as a fellow member by **finding them in their own phone contacts** (6.36b's contact-matching shape — the server
answers only *which* numbers are members, ⛔ who), records the matched **member account** on that nominee's declaration in a NEW link
table, **tells that member in the app** that they were named (they answer "Yes, that's me" / "No, that's not me"; the declarer sees the
answer), and widens 6.36d's ONE nominee fragment so the five also leave out a member linked this way — matched by account, so the
number they sign in with no longer matters. Only declarations made after it ships are covered (⛔ backfill). WHETHER the link may be
recorded, WHEN the nominee's answer is needed, and WHAT each side is told are the Panel's (PQ1, PQ2) — the rest is the author's.

## Story

As a member declaring my nominees,
I want to mark a nominee who is also a TWT member by finding them in my contacts,
so that the Trust never asks my nominee about my death — even if they sign in with a different number from the one I gave for them.

## 📜 Policy meaning (AI-10-1)

**This story CHANGES a predicate** — it widens the nominee conjunct of `peerMeshEligibleMemberSql` (the ONE predicate that decides which
members may be asked about a death) from "matched by number" to "matched by number OR by a recorded member link". **In the member's
terms (the deceased's):** *"If you mark one of your nominees as a fellow member, by finding them in your phone contacts, the Trust will
never ask that person about your death — whatever number they sign in with. They are told in the app that you named them, and you see
their answer. Neither of you gains or loses any benefit, cover or vote by it."* **In the nominee-member's terms:** *"If a member names you
as their nominee and marks you as a member, you will be told in the app and asked whether it is you; while the mark stands, the Trust will
not ask you to vouch for that member's death — nothing else about your own membership changes."*

**Checked against the Niyamavali** (canonical home: the private repo `ulanzi1/twt-legal` (`-167`); read from the main checkout's gitignored
copy `docs/legal/niyamavali.md`, dated 2026-08-16 — a rulebook, ⛔ ratified, [[feedback_niyamavali_rulebook_not_spec]]): §2.4 (*"Each member
declares one or two nominees at signup or via Life Events"*; *"Nominee identity does not require KYC"*) — ⛔ silent on a nominee who is a
member and on a nominee's agreement at declaration; §6.1 / §6.2 — ⛔ clause says who is ASKED; Part 10 (*"processes member/nominee/claimant
data lawfully, for specified purposes, on a lawful basis"*) bears on the NEW processing — that is PQ1 (and counsel, Row 31 (j)). **Result: ⛔
conflict on the selection rule; the data basis is OPEN (PQ1).** **What the predicate decides:** who is ASKED — ⛔ what a family is owed; the
peer mesh is a signal, ⛔ never a gate (`-263` FQ10 A). Its one visible consequence is 6.36d's: at a small workplace the claim can reach
"nobody to ask" sooner, and the ground inspection carries it (`-330` SW25).

**A SECOND predicate is introduced and it gates ⛔ benefit:** who may be linked as a nominee (NE5 — an `active` / `active-in-grace` member of
the same Pariwar, ⛔ the declarer, ⛔ reported dead). It decides only whether the mark can be made; a member who cannot be linked is still
declared as a nominee by name and number exactly as today. ⛔ Payout, nominee determination, claim filing or contact reads the link (NE14).

## The rulings and decisions this story builds on

| Source | Key (verbatim, short) | Status |
|---|---|---|
| `-386` Not covered (item 1) | *"a nominee's member link captured at declaration — the only fix for the ND8 gap; a follow-up backlog row (Story 6.36d Task 0.4) that needs the nominee's agreement and its OWN Panel question"* | AUTHOR-COMMIT — ⭐ THIS ROW'S ORIGIN |
| `-386` ND2 | the nominee mobiles HMAC'd into the LOGIN space and matched in `peerMeshEligibleMemberSql`; *"Rejected: a stored nominee blind index (joinable to the login key); resolving to member ids first."* | AUTHOR-COMMIT — ⚠ NE7 adds a member-id leg BESIDE ND2 (a stored member LINK chosen by the declarer, ⛔ a number resolved to an id at selection) — ND2's rejection is about the select job's resolution path and stays as written |
| `-386` ND8 | *"a nominee who is a member is found ONLY if the deceased typed the number that nominee SIGNED UP with … ⛔ second number, ID or member link exists anywhere"* | AUTHOR-COMMIT — NARROWED IN PART by this story (for linked declarations made after it ships) |
| `-386` ND9 | *"⛔ backfill. Nothing is in production"* | AUTHOR-COMMIT — precedent for NE12 |
| `-384` Q1 A | *"Yes — use the nominee's number for this check."*; the question as put: *"… only to make sure a nominee who is also a member is never one of the five"*; Not covered: *"any other use of a nominee's number"*, *"a nominee who signs in with a DIFFERENT number from the one the member gave — ⛔ matched, can still be asked"* | ⭐ TRUSTEE-RATIFIED — ⛔ covers a member LINK (PQ1) |
| `-384` Q2 A | *"Yes — warn staff about nominee changes too."*; cost as put: *"… including when someone re-saved the nominees without changing them, or declared them at sign-up within those 90 days."* | ⭐ TRUSTEE-RATIFIED — a link is set only by a declaration save (a new version) ⇒ already inside it (NE8) |
| `-310` CF5 A | *"With the member's permission, the app checks their phone contacts against the member list, shows the matches under the names the member saved, and keeps ⛔ no non-member's number; counsel confirms the basis."* | ⭐ TRUSTEE-RATIFIED — ruled for "people who know me"; reuse for a nominee is an EXTENSION (PQ2) |
| `-309` item 3 | the matches are shown under the member's saved names, *"⛔ never the member's registered name (members' mobile numbers are private: showing 'this number is member X' would let anyone map numbers to members)"*; *"the registered name is shown to the member only after acceptance"* | AUTHOR-COMMIT — binds NE3 / NE6 |
| `-307` §2 item 3 (iii) / `-330` SW14 | the named person ACCEPTS in the app (*"[Name] has named you as someone who knows them. Do you know him/her?"*), told first *"[Name] will see your answer."*; ⛔ SMS, push or WhatsApp | AUTHOR-COMMIT — the agreement SHAPE NE6 reuses |
| `-330` SW16 (1) / 6.36b AC10 | *"a member is ⛔ not yet `active` while signing up"* ⇒ ⛔ signup step | AUTHOR-COMMIT — binds NE4 |
| `-234` X | *"Yes nominee should cover names, relationship, mobile, address, split. Yes all of them can be changed as long as member is alive."* | ⭐ TRUSTEE-RATIFIED — the link is ⛔ a sixth declaration FIELD (NE1: own table, ⛔ in the declaration lock's correctable set) |
| `-233` / `-234` V / `-235` Y / `-239` | the declaration locks at the first claim; a change on or after the day of death is discarded for the PAYOUT and raises suspicion | ⭐ TRUSTEE-RATIFIED — the link follows the declaration's lock (NE2 / NE9) |
| `-160` cl.3 / roster Row 17 (2026-08-28) | *"⛔ Nobody may cite this amendment as authority that a member's T&C reaches another person's data."* | ⭐ TRUSTEE-RATIFIED — the declarer's acceptance is ⛔ a basis for processing the nominee-member's account (PQ1) |
| `-156` cl.7(a) | *"If a surface ships differing materially from that description — a new data class, a new subject population, a new recipient — the clearance does ⛔ NOT extend to it and the review re-opens."* | ⭐ TRUSTEE-RATIFIED — why a browsable members list is REJECTED (NE3) |
| `-356` / its reading (ii) | *"drop WhatsApp only notification for nominee."*; (ii) a member nominee's member opt-in *"does not count by itself"* | ⭐ TRUSTEE-RATIFIED (ruling) — NE6's notice is IN-APP only; ⛔ WhatsApp |
| `-263` FQ10 A | *"THE CHECK WITH NEIGHBOURS IS A SIGNAL, ⛔ NOT A GATE"* | ⭐ TRUSTEE-RATIFIED |
| `-340` call 2 / `-341` / `-386` §0 | removing a person with a stake from the pool is the author's class | AUTHOR-COMMIT — ⭐ THE PRECEDENT for NE7 |

### §0 re-run — every edge against the ruled words ([[feedback_panel_gate_read_ratified_verbatim]])

| Edge | Ratified text | Verdict |
|---|---|---|
| Excluding a LINKED nominee from the five | `-310` CF4 A names where the five come from; every filter since is an author-commit (`-340`, `-341`, `-386`) | **MATCH** (author's) |
| Recording which member account a nominee is | `-384` Q1 A is scoped *"only"* to comparing NUMBERS and lists *"any other use"* as not covered; `-160` cl.3's limit forbids resting it on the declarer's T&C; the nominee's own Claim Terms do ⛔ exist (`-177` D5(a), UN-ATTESTED) | **the Panel's — PQ1** (a legal / consent basis) |
| WHEN the nominee's answer is needed (before the link counts, or never) | ⛔ ratified text; the row note says *"needs the nominee's agreement"* — written by the author at `-386`, ⛔ a Panel words | **the Panel's — PQ1** (it decides whether processing waits on consent) |
| Telling the nominee-member they were named | ⛔ ratified text; a member's nominee choice is their own data, disclosed to a third person | **the Panel's — PQ2** (*"what the Trust DISCLOSES … to whom"*) |
| Telling the declarer which contacts are members, for a nominee | `-310` CF5 A ruled it for "people who know me" (the option as put: *"people who know me"*) | **the Panel's — PQ2** (an EXTENSION of CF5 A to a new purpose) |
| The staff warning for a link change | `-384` Q2 A: nominees *"declared or changed"*; a link is set ONLY by a declaration save (NE2), which writes versions | **MATCH** — ⛔ new trigger needed (NE8) |
| No signup step | `-330` SW16 (1) (author's) | **MATCH** (author's) |
| No backfill | `-386` ND9 (author's); nothing in production | **MATCH** (author's) |
| A browsable / searchable members list | `-309` item 3 (number→member mapping forbidden); `-156` cl.7(a) (a new recipient re-opens the clearance); ⛔ name blind index exists | **REJECTED** — ⛔ offered (it would be a Panel question and a new index) |

## FOUND FACTS (G) — traced at `1268d47e`

- **G1 — ⛔ nominee→member link exists anywhere.** `NomineeDeclareEntry` (`packages/contracts/src/nominee/declaration.ts`) is `.strict()`
  `{ name: EnglishScriptName, relationship, mobile: MobileNumber, address? }`; `NomineeDeclareRequest` `{ nominees: 1..2 }` (the split is
  DERIVED server-side). The only member ids on nominee rows are the DECLARER's (`member_nominees.member_id`, `nominee_corrections.member_id`,
  …). The only "is this nominee a member" resolver is 6.36d's number match (`peerMeshNomineeMatchSql`); `claims.claimant_actor_id` is NULL on
  every v1 path. 6.36d G18 is the full investigation.
- **G2 — two tables, two write disciplines.** `member_nominees` (`schema/member_nominees.ts`, `0025`) is the CURRENT projection, PK
  `(member_id, rank)`, rewritten DELETE-then-INSERT by `replaceMemberNominees` (`nominee/declaration-write.ts`) on every declare — anything
  hung off it is orphaned. `member_nominee_versions` (`0119`) is APPEND-ONLY: grants `SELECT, INSERT` + column `UPDATE (name_ciphertext,
  mobile_ciphertext, address_ciphertext)` (the RTBF scrub); `member_nominee_versions_reject_mutation()` enumerates every non-ciphertext
  column by `IS DISTINCT FROM` and exempts DELETE only at `pg_trigger_depth() > 1`; CHECK `kind_coherence` (a `declared` version carries
  name / relationship / mobile / split; a `vacated` one carries NULL in every nominee field). ⇒ an agreement that arrives AFTER the
  declaration can ⛔ be written onto the version row.
- **G3 — the declare handler.** `createNomineeHandlers(deps).declare` (`apps/api/src/modules/nominee/nominee.handlers.ts`) serves BOTH
  `POST /api/v1/member/nominees` (signup; `requireMemberSession` only) and `POST /api/v1/member/life-events/nominees` (`life-events/routes.ts`,
  `requireMemberStepUp(deps, 'nominee_change')`). Order: count guard → `deriveNomineeSplit` → `hasFreshElevation` read BEFORE the tx →
  `openScopeTx` → `claimDomain.lockNomineeDeclarationForEdit` (409 `nominee.locked_claim_filed`) → terminal-state guard (409
  `nominee.member_terminal`) → D9 re-declaration step-up → `encryptNomineeField` ×3 (inside the tx) → `readDatabaseClock` →
  `planDeclarationVersions(getNomineeVersionHeads(…), ranks)` → `replaceMemberNominees` → `projectMemberState('member.nominees_declared', …)`
  → `appendMemberDeclarationVersions` → `buildStatus` → commit → `emitAuthAudit('member_nominees.declared', …)`. ⛔ Idempotency key on declare.
- **G4 — 6.36b's matching, as built.** `POST /api/v1/member/known-people/contact-matches` (`apps/api/src/modules/known-people/routes.ts`,
  `handlers.ts`) → `matchContactNumbers` (`packages/domain/src/member/known-people.ts`): `normaliseContactNumbers` → `chargeContactMatch`
  (counters `contact_match_requests` 3/day, `contact_match_numbers` 2,000 / 30 days, Pariwar 100,000/day; IST days) → `contactMatchIndexes`
  (`mobileBlindIndexMany`, ⛔ inside a tx, ONE audit line, purpose `contact_match`) → `matchedContactPositions` (`member_identities` ⋈
  `members`, explicit `pariwar_id`, `knownPersonEligibleSql`) → `{ matched: number[] }` POSITIONS ONLY (⛔ id, name or count). The caller gate
  `isKnownPeopleCaller` = `active` AND ⛔ named by a claim as the deceased (403 `known_people.not_available`). The ask resolves a NUMBER to a
  member SERVER-side (`askKnownPerson` — the client never sends a member id); every reason a target is unavailable is ONE 404
  `known_people.not_a_member`. Mobile: `app/(life-events)/known-people-find.tsx`; contacts only in `lib/known-people-contacts.ts`
  (`readContactsForMatching`, `pickOneContact` = the iOS picker, `shareMoreContacts`); pure helpers `lib/known-people.ts` (`prepareContacts`,
  `applyMatches`, `filterBySavedName`, `fallbackFor` — iOS picker / Android typed number); saved names kept on the phone in MMKV
  (`lib/known-people-saved-names.ts`). Number fence: `apps/api/tests/unit/known-people-number-fence.test.ts`.
- **G5 — ⛔ member-facing members list.** `searchMembers` (`member/search-read.ts`) is STAFF-only, exact id / mobile blind index; names carry
  ⛔ blind index (name search deferred). The public directory is a paged browse, ⛔ live (Row 17). For a member, contact matching is the ONLY
  way to find another member. ⚠ The row note's *"PICK the nominee from the members list (6.36b's picker shape)"* names a shape 6.36b does ⛔
  have — 6.36b finds members from the member's CONTACTS (NE3 reads the row by its parenthesis, ⛔ its noun).
- **G6 — the agreement substrate.** `member_known_people` (`0162`): ids only (⛔ number, ⛔ name); states `asked | accepted | declined | lapsed |
  removed | withdrawn | erased`, forward-only guard trigger `member_known_people_guard`, write-once `responded_at` / `ended_at`, not-self
  CHECK, partial UNIQUE on live links, BEFORE-INSERT backstop under an advisory xact lock; twt_app `SELECT, INSERT, UPDATE (state,
  responded_at, ended_at)`, ⛔ DELETE; RLS FORCE by `pariwar_id` with separate SELECT / INSERT / UPDATE policies. The asked person answers
  IN THE APP ONLY: `components/known-people/KnownPeopleRequestEntry.tsx` (home `app/(tabs)/index.tsx`, `PanchayatNoticeboard.tsx`) →
  `/(life-events)/known-people`; copy namespace `known_people` (`packages/i18n/locales/{en,hi}/known_people.json`, `useKnownPeopleT`).
  Names are decrypted AFTER commit (`names.ts`: `readNameCiphertexts` in the tx, `decryptNames` after). ⛔ Generic member inbox; push is
  ⛔ wired (`lib/push-notifications.ts` unimported); SMS only via DLT-approved templates; WhatsApp only via Meta-approved templates.
- **G7 — 6.36d's plug points.** `PeerMeshEligibilityExclusions { deceasedMemberId; nomineeMobileIndexes: readonly string[] }` (REQUIRED,
  ND4) and `PeerMeshEligibleSnapshotInput` (`claim/peer-mesh-read.ts`); `peerMeshNomineeMatchSql(m, indexes)` (an `EXISTS` on
  `member_identities` by `mobile_blind_index = ANY(…)`; an empty list matches nothing) inside `peerMeshEligibleMemberSql` as `AND NOT …`.
  `peerMeshNomineeMobileIndexes({ pariwarId, deceasedMemberId, cut, enc, inScope })` (`claim/peer-mesh-nominees.ts`): one `inScope` read of
  `listNomineeDeclarationVersions` → `peerMeshNomineeCiphertextsAsOf(versions, cut.cut)` (`recordedAt < cut`, per rank
  `projectedVersionOfRank`; a `vacated` rank ⇒ nobody) → decrypt / normalise OUTSIDE any tx → ONE `mobileBlindIndexMany` (purpose
  `peer_mesh_nominee_exclusion`); THROWS on any fault (ND6). Callers: `runClaimPeerMeshSelect` (`apps/jobs/src/claim-peer-mesh.ts` — the
  pre-read, the 1 h deferral / 24 h `nominee_check_unavailable`, the in-lock `ClaimPeerMeshNomineeIndexesStaleError` check), and
  `readPeerMeshNomineeIndexes` in `scheduler/claim-peer-mesh-requests.ts` and `scheduler/claim-peer-mesh-wa-reminders.ts` (via
  `resolvePeerMeshSelectionFilingCut`). The send-time labeller `readPeerMeshRequestEligibility` (`claim/peer-mesh-request.ts`) returns the
  first of `peer_not_active` → `peer_reported_deceased` → `no_sendable_number` → `peer_filed_for_this_death` → `peer_is_nominee` →
  `peer_not_eligible`; `packages/domain/tests/integration/claim/peer-mesh-request.spec.ts` pins that the labels cover every conjunct.
- **G8 — a contact picked from MATCHED contacts carries the nominee's LOGIN number.** If that number is also what the member declares as
  the nominee's `mobile`, 6.36d's number match already excludes them. ⇒ The link adds protection in exactly two cases: (i) the member
  wants the Trust to reach the nominee on a DIFFERENT number from the one they sign in with (the G18 / ND8 case — the declared `mobile` and
  the link's number differ), and (ii) the nominee's login number changes later (AR-24, ⛔ built — deferred-work's *"Row 6-36d's nominee
  match is the ONLY nominee→member link, and it degrades the day a member's login number becomes changeable"*). The story must say so
  plainly in the copy and the ACs (TR1).
- **G9 — the lock and the step-up.** `lockNomineeDeclarationForEdit` = the D3 advisory lock (`intakeAdvisoryLockKey`, shared with intake —
  it must be the tx's FIRST lock) + `isNomineeDeclarationLocked` (a claim for this death, unless a `member_found_innocent` finding). The
  Life Events route is step-up gated (`nominee_change`); the signup route is ⛔; the D9 rule re-requires step-up for a re-declaration.
- **G10 — corrections copy fields explicitly.** `decideNomineeCorrectionAsPariwarAdmin` (`claim/nominee-correction-persist.ts`) inserts a
  correction version with an explicit column list and calls `applyCorrectionToProjection` only when it corrects the rank's head;
  corrections are recordable only in the review window (after the filing ⇒ AFTER the `-339` cut ⇒ ⛔ seen by 6.36d's as-of-cut read).
- **G11 — readers that must stay blind or be taught.** `getEffectiveNomineeDeclaration*` (`claim/nominee-effective.ts`, explicit raw-SQL
  columns, a token) — blind, unchanged. Data export: `assembleMemberExport` (`data-export/assemble.ts`) maps explicitly; `apps/jobs/src/data-export.ts`
  STRICT-parses each section against `contracts.ProfileSection` ([[project_data_export_sections_strict_parsed]] — a key added in
  `assemble.ts` without the contract breaks EVERY export; only `apps/jobs/tests/data-export.test.ts` reaches that parse). RTBF:
  `anonymizeMember` (`member/anonymize.ts`) scrubs nominee ciphertexts and calls `eraseKnownPeopleLinks` for 6.36b's table. Events:
  `NomineesDeclaredPayloadSchema` (`member/events.ts`, `.strict()`, plaintext JSONB). The mobile status response is strict-parsed by the
  api-client (`packages/api-client/src/index.ts`) — a new response key needs the client in the same change.
- **G12 — the jobs DB role.** `twt_service` holds ⛔ grant on any nominee table (roster Row 26, `jobs-db-role`, dated 2026-10-23 note: the
  6.36d reads of `member_nominee_versions` *"would 42501 in production"*; its round-4 note: closure must cover the nominee tables). A new
  link table read by the select / request / reminder jobs JOINS that list — recorded at Task 0.4, ⛔ fixed here.
- **G13 — migrations are hand-authored SQL.** ⛔ `db:generate` (snapshots stop at `0020`; re-emitting applied migrations ⇒ 42P07,
  [[project_live_db_test_gotchas]]); a hand entry in `packages/domain/migrations/meta/_journal.json` (last: idx 180, tag
  `0180_peer-mesh-request-peer-is-nominee`, `when` steps +86400001); statements split by `--> statement-breakpoint`; order CREATE → FKs →
  CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → functions → triggers. Precedents: `0162_member-known-people.sql` (the whole
  link-table shape), `0179_member-preferred-locale.sql` (idempotent `IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS`).
- **G14 — mobile.** Both nominee screens share `components/life-events/NomineeForm.tsx` (`NomineeFormEntry { name, relationship, mobile,
  address }`, `firstValidationError`, relationship chips from `NOMINEE_RELATIONSHIP_CODES`, mobile a free-text phone-pad `Input`).
  `app/(life-events)/nominees.tsx` (`LifeEventsNomineesScreen`): `useStepUpGate('nominee_change')`, MMKV draft key
  `life-events-draft:<memberId>:nominees` (`components/life-events/draft-store.ts` — an OLD draft lacks any new field), locked state from
  `memberAuth.nomineesStatus`. `app/(signup)/nominees.tsx` → `memberAuth.nomineesDeclare` → `/(signup)/medical`. Wizard order
  `['tc','kyc','workplace','nominees','medical','whatsapp','payment']` — the member is ⛔ `active` at the nominees step. ⛔ Unit test of
  `NomineeForm` or either screen exists. Copy: flat `nominees.*` keys in `packages/i18n/locales/{en,hi}/common.json` (parity:
  `packages/i18n/scripts/check-parity.ts`).

## ⚖️ Build decisions NE1–NE14 (PROPOSED — BigDev answers at Task 0.2)

Each carries the recommendation first. ⚠ NE6 / NE7 depend on PQ1's ruling; the recommendation is written for PQ1 A and the PQ1 B variant
is stated inline so the dev agent never has to infer it.

- **NE1 — where the link lives. RECOMMEND (a): a NEW table `member_nominee_links`**, one row per link, hung off the VERSION that declared
  it: `link_id` PK, `pariwar_id`, `declarer_member_id` (FK `members`, cascade), `version_id` (FK `member_nominee_versions`, NO ACTION —
  TR3), `rank` (CHECK 1|2), `nominee_member_id` (FK `members`, cascade), `found_by` (`contacts | picker | typed`), `state` (`asked | confirmed |
  not_me | ended | erased`), `carried_from_link_id` (self-FK, NULL), `asked_at` (default `clock_timestamp()`), `responded_at`, `ended_at`,
  `end_reason` (`redeclared | removed_by_declarer | erased`, NULL while live). CHECKs: not-self (`declarer_member_id <> nominee_member_id`),
  answered ⇔ `responded_at`, terminal ⇔ `ended_at` + `end_reason`; partial UNIQUE `(version_id) WHERE state IN ('asked','confirmed','not_me')`;
  a forward-only guard trigger in the `member_known_people_guard` form; twt_app `SELECT, INSERT, UPDATE (state, responded_at, ended_at,
  end_reason)`, ⛔ DELETE; RLS ENABLE + FORCE by `pariwar_id`, separate SELECT / INSERT / UPDATE policies (⛔ FOR ALL). Ids only — ⛔ number,
  ⛔ name. **Rejected:** (b) a column on `member_nominee_versions` — append-only; the answer arrives later (G2); it would also need the
  0119 trigger, grant and `kind_coherence` reworked; (c) a column on `member_nominees` — delete-then-insert orphans it (G2).
- **NE2 — how a link is set, kept and ended. RECOMMEND:** a link is set ONLY by a Life Events declaration save, in the SAME request and the
  SAME tx as the versions it hangs off (⛔ separate "link" endpoint — so the step-up, the claim lock, the D3 lock order and the ND7 staff line
  all apply unchanged). `NomineeDeclareEntry` gains an OPTIONAL `memberLink` — `{ kind: 'new', mobile: MobileNumber, foundBy }` (a number from
  matched contacts / the picker / typed — the SERVER resolves it, ⛔ a member id from the client) or `{ kind: 'keep', linkId }` (carry the
  link already on that rank's head version: the new link row copies `nominee_member_id`, `found_by`, `state`, `responded_at` and sets
  `carried_from_link_id`; the old row ends `redeclared` — the nominee is ⛔ re-asked when the declarer only re-saves). A rank re-saved
  WITHOUT `memberLink` ends its live link `removed_by_declarer`; a rank vacated ends it `redeclared`. A `keep` whose `linkId` is ⛔ the live
  link of that rank's head version ⇒ 409 `nominee.link_stale` (re-load and re-save). After the first claim the declaration is locked (G9) ⇒
  links are locked with it.
- **NE3 — how the member finds the nominee. RECOMMEND:** 6.36b's contact matching, REUSED AS IS — the same endpoint
  (`POST /api/v1/member/known-people/contact-matches`), the same counters and audit purpose (one budget for one disclosure), the same
  phone-side helpers (`lib/known-people-contacts.ts`, `lib/known-people.ts`), with the iOS picker / Android typed-number fallback. On the
  nominee form, per nominee: *"Is [this nominee] a TWT member? Find them in your contacts"* → the member's matched contacts under the names
  THEY saved (`-309` — ⛔ the registered name) → pick ONE → the picked number goes into `memberLink.mobile` and, if the declared `mobile` is
  empty, is offered as it (editable — G8 / TR1). **Rejected:** a browsable or name-searchable members list (`-309` item 3; `-156` cl.7(a); ⛔
  name blind index exists — G5); a member id sent by the client.
- **NE4 — where it is offered. RECOMMEND (a): Life Events ONLY.** The signup step is unchanged (`-330` SW16 (1): ⛔ `active` at the nominees
  step; `isKnownPeopleCaller` refuses); the signup route REJECTS a `memberLink` (400 `nominee.link_not_available`). A member who declared at
  signup adds a link by re-saving in Life Events (step-up; new versions ⇒ the ND7 line, the cost `-384` Q2 A accepted). **Rejected:** (b) a
  post-activation home prompt (the 6.36c prompt shape) — deferred (deferred-work, Task 0.4).
- **NE5 — who may be linked (the second predicate). RECOMMEND:** an `active` or `active-in-grace` member of the SAME Pariwar, ⛔ the declarer,
  ⛔ named by any claim as deceased — i.e. `knownPersonEligibleSql` (`member/known-people.ts`), reused, ⛔ re-written. Every failure (⛔ a
  member, erased, withdrawn, reported dead, another Pariwar, the declarer) ⇒ ONE indistinguishable 422 `nominee.link_not_found` and the
  WHOLE declaration is refused (the member removes the mark or picks again) — ⛔ a silent save without the link. The SAME member on both
  ranks ⇒ 422 `nominee.link_duplicate`. The caller gate is `isKnownPeopleCaller` (`active`, ⛔ reported dead).
- **NE6 — what the nominee-member is told, and their answer. RECOMMEND (for PQ1 A / PQ2 A):** IN THE APP ONLY (⛔ SMS, push or WhatsApp —
  `-356`, 6.36b AC6): a `NomineeLinkRequestEntry` on home and the noticeboard (the `KnownPeopleRequestEntry` shape) → a screen in
  `(life-events)`: *"[Declarer's registered name] has named you as their nominee in TWT and marked you as a member. Is that you?"*, above
  the answers *"[Name] will see your answer."*, then *"Yes, that's me"* ⇒ `confirmed` / *"No, that's not me"* ⇒ `not_me`. ONE answer; ⛔
  lapse (it stays open while the link stands); ⛔ withdraw (being someone's nominee is the declarer's choice — the nominee can only say it is
  not them; whether a withdrawal must exist is PQ1's counsel half). The declarer sees, per rank: *Asked* / *Confirmed — [registered name]* /
  *Said it is not them* (the registered name only after `confirmed` — `-309`). Copy in a NEW namespace `nominee_link` (hi + en), with a
  real-`t()` test ([[feedback_stub_must_call_not_transcribe]]); the Hindi strings drafted by the dev and approved by BigDev (the 6.35 LS14
  precedent).
- **NE7 — what the five leave out (the author's, the `-340` class). RECOMMEND (for PQ1 A):** a member LINKED on the projected version of a
  rank as of the `-339` cut — the link's `asked_at` < cut, and ⛔ ended before the cut — is excluded WHATEVER the nominee answered
  (`asked`, `confirmed` or `not_me`). Fail-safe: a "not me" (true or false) never puts a possible payee back among the five; a wrong pick
  costs one colleague until the declarer fixes it — the same residual 6.36d accepted for a mistyped number (ND8). *(PQ1 B variant: only a
  link `confirmed` before the cut counts.)* Built as ONE fragment so the gate and the label cannot drift: `peerMeshNomineeMatchSql(m,
  match: PeerMeshNomineeMatch)` where `PeerMeshNomineeMatch = { readonly mobileIndexes: readonly string[]; readonly memberIds: readonly
  MemberId[] }` = `(EXISTS … mobile_blind_index = ANY(…)) OR ${m}.member_id = ANY(${sql.param([...memberIds])}::uuid[])`; the field
  `nomineeMobileIndexes` becomes `nomineeMatch` on EVERY ND4 type (required, ⛔ optional, ⛔ defaulted); `peerMeshNomineeMobileIndexes` becomes
  `peerMeshNomineeMatch` returning both (the member ids read in the SAME `inScope` read as the versions — DB only, ⛔ KMS — via a pure
  `peerMeshNomineeLinkedMembersAsOf(versions, links, cut)` beside `peerMeshNomineeCiphertextsAsOf`); the `is_nominee` labelling column uses
  the same fragment ⇒ `peer_is_nominee` is REUSED (⛔ vocabulary migration, ⛔ new label). The select job's stale-cut check, the 1 h / 24 h
  deferral and the two children carry the member ids for free. ⛔ `metric_version` bump (the `-340` / `-341` / `-386` precedent).
- **NE8 — the staff line. RECOMMEND: ⛔ change.** A link is set or ended only by a declaration save (NE2), which records versions ⇒
  `getPeerMeshNomineeChangeBeforeFiling` already fires. The nominee's ANSWER does ⛔ set the line — under NE7 (PQ1 A) it never changes who is
  asked. *(PQ1 B variant: an answer inside `[cut.recentFrom, cut.cut)` DOES change who is asked ⇒ it joins the line as a fourth disjunct — a
  reading of `-384` Q2 A's "changed", to state in the note.)*
- **NE9 — corrections. RECOMMEND: ⛔ touch links.** A staff correction neither sets nor clears a link and ⛔ carries one (G10 — corrections are
  recorded after the cut, ⛔ seen by the as-of-cut read). Recorded as a residual: a post-filing correction of a linked rank leaves the link on
  the corrected version only.
- **NE10 — erasure and export. RECOMMEND:** `anonymizeMember` gains an arm that sets every link where the member is the DECLARER or the
  NOMINEE to `erased` (`eraseNomineeLinks`, the `eraseKnownPeopleLinks` form). Export: the declarer's `nominees[]` entries gain `memberLink:
  { state, name|null }` (name only when `confirmed`); a new section lists "members who named you as nominee" (`{ state, askedAt, name }` —
  the declarer's registered name, already shown to them by NE6) — BOTH in `contracts.ProfileSection` FIRST (G11).
- **NE11 — events and audit. RECOMMEND:** ⛔ events_log change (a link is ⛔ member state; another member's id ⛔ enters a plaintext payload);
  audit lines after commit `member_nominee_links.asked` / `.carried` / `.ended` / `.confirmed` / `.not_me` with `link_id` + `rank` only (⛔
  number, ⛔ name, ⛔ the other member's id); the 6.36b number fence extended to the nominee module.
- **NE12 — ⛔ backfill.** Only declarations saved after it ships carry links (`-386` ND9; nothing in production,
  [[project_not_in_production_merge_is_not_golive]]).
- **NE13 — the jobs role.** The link table is read by the select job and both children ⇒ it joins roster Row 26's list (a dated note,
  Task 0.4; ⛔ grant here).
- **NE14 — who else reads the link. RECOMMEND: NOBODY else in this story** — ⛔ payout, nominee determination, claim filing, the claim
  contact ladder, the nominee console, the District Admin's nominee panel. Each would be a new use (`-384`'s *"any other use"*; PQ1) and is
  deferred (deferred-work, Task 0.4).

## 🏛️ Panel questions — WRITTEN 2026-10-23, ⛔ sent (one note, two questions, from the TEMPLATE; sent by BigDev)

> *Dated 2026-10-23 (v1.1): the note is WRITTEN at BigDev's request, ahead of Task 0.2 (the 6.36d precedent) — it assumes NE3, NE4, NE6 and NE7
> as recommended and is revised before sending if BigDev answers otherwise. Its E1 quotes were checked verbatim and its E4 commands run (all
> as expected; the `git grep` for the new table names is EMPTY). ⛔ Sent — ⛔ shown to the Panel until BigDev sends it.*

Written from `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` — §0 first, then the plain-English question, THE ONE
FACT THAT DECIDES IT, options with an honest cost each, evidence LAST — as
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-6-36e-nominee-member-link.md` (date = the day it is written). The
shape precedent is `trustee-panel-routing-note-2026-10-23-6-36d-nominees-not-asked.md`. ⛔ A second note shape; ⛔ a copy of the template.

- **PQ1 — may the Trust record which member account a nominee is, and when does the nominee's answer matter?** The one fact: today the
  Trust can only recognise a nominee by the phone number the member typed; if the nominee signs in on another number they can be one of
  the five asked about the death (`-384`'s own not-covered line). Options (each with its cost):
  **A** — record it when the member marks them; tell the nominee; the mark keeps them out of the five whatever they answer. *Cost: a
  member's account is linked before they have said yes; a wrong pick keeps an uninvolved colleague out until the member fixes it.*
  **B** — record it, but use it only once the nominee says "Yes, that's me". *Cost: a nominee who never answers, or says "not me" when it is
  them, can still be asked — the gap this row was opened to close stays open for exactly the people with a reason to stay in.*
  **C** — do not link member accounts; keep the number check alone. *Cost: the gap stays; this row is closed unbuilt.*
  **Our reading: A** — the mark is the member's own statement, the same strength as the number they type today (which `-384` Q1 A already
  lets the Trust use without the nominee's yes), and only A cannot be undone by the person it protects against. ⚠ A READS the row note's
  *"needs the nominee's agreement"* as *"the nominee is told and answers"*, ⛔ *"the link waits for a yes"* — that is a NARROWING of the
  author's own row note, stated here so it is decided, ⛔ assumed (footgun 57). Counsel's written basis stays a go-live condition either way.
- **PQ2 — what may each side be told?** The one fact: to mark a nominee, the app must tell the member which of their contacts are members
  (ruled for "people who know me" only, `-310` CF5 A), and telling the nominee shows them a choice the member made. Options:
  **A** — both: the member sees which contacts are members (under their own saved names, as CF5 A), the nominee is told in the app and the
  member sees their answer. *Cost: one more purpose for contact matching; a member learns a colleague's answer; a nominee learns they
  were named.* **B** — the member sees the matches; the nominee is ⛔ told (a silent mark). *Cost: a member's account is marked without
  their knowledge; ⛔ "not me" can ever reach the member.* **C** — ⛔ matching for nominees; the member types the nominee's sign-in number
  and the server says only "marked" or "not found". *Cost: the member must know the other number; a typed number is a guess at someone's
  membership (`-309`'s concern, one number at a time).* **Our reading: A.**

Neither question is about which code is correct. Code (Task 1+) waits for the ruling — PQ1 C means ⛔ build — unless BigDev rules at
Task 0.2 that it may start on our reading.

## Acceptance Criteria

**AC0 — governance before code.** Task 0.2 recorded (NE1–NE14 answered verbatim; the Panel note written, sent and RULED, or BigDev's
explicit word that code may start on our reading); the author-commit committed ALONE (Task 0.3); the records commit after it (Task 0.4).
⛔ `apps/` / `packages/` change before both.

**AC1 — the table (NE1).** Migration `<NNNN>_member-nominee-links.sql` (number per the NUMBERS rule) creates `member_nominee_links` exactly
as NE1 states, with its journal entry; the drizzle schema `packages/domain/src/schema/member_nominee_links.ts` and RLS mirror
`packages/domain/src/policies/member-nominee-links-rls.ts` exported in the barrels. A policy-regression spec
(`packages/domain/tests/integration/rls/member-nominee-links-policy-regression.spec.ts`, the 6.36b / 0119 spec form) asserts: the grants
(twt_app ⛔ DELETE; column-level UPDATE only), ⛔ FOR ALL policy, cross-Pariwar invisibility, every CHECK's `pg_get_constraintdef`, the guard
trigger refusing a backward move and an identity-column change (23000), the not-self CHECK, the live-link UNIQUE. The migration is ⛔
regenerated after it is applied anywhere ([[project_live_db_test_gotchas]]).

**AC2 — contracts.** `NomineeDeclareEntry.memberLink` is OPTIONAL (`z.discriminatedUnion('kind', [{ kind:'new', mobile: MobileNumber, foundBy
}, { kind:'keep', linkId: uuid }])`, both `.strict()`); `NomineeSummaryEntry` gains `memberLink: { linkId, state: 'asked'|'confirmed'|'not_me',
name: string|null } | null` (name non-null only when `confirmed`). New request / response contracts for the nominee-member's side
(`NomineeLinkRequestView`, the answer body `{ answer: 'yes'|'not_me' }`). `pnpm contracts:emit-openapi` re-run; the determinism check green;
`packages/contracts/tests` cover every new strict shape (and a fixture sweep for the new required response field —
[[project_contracts_tests_outside_tsc]]). The api-client updated in the same change (G11 strict response parse).

**AC3 — the declare path (NE2, NE4, NE5).** On `POST /api/v1/member/life-events/nominees`: every `kind:'new'` number is normalised
(`normalizeMobile`; `null` ⇒ 422 `nominee.link_not_found`) and HMAC'd with ONE `mobileBlindIndexMany` call BEFORE `openScopeTx` (⛔ KMS
inside the scope tx for the link; purpose `nominee_link_resolve`); inside the tx, after `lockNomineeDeclarationForEdit` and the existing
guards: the caller gate, the resolution to a member through `knownPersonEligibleSql`, the NE5 refusals, the carry / end rules of NE2, the
link rows inserted after `appendMemberDeclarationVersions` (they reference its version ids). On `POST /api/v1/member/nominees` (signup) a
`memberLink` ⇒ 400 `nominee.link_not_available` and nothing is written. Integration legs: new link; keep (state and `responded_at` carried,
⛔ re-ask, old row `redeclared`); re-save without ⇒ `removed_by_declarer`; vacated rank; stale `keep` ⇒ 409; each NE5 refusal is the SAME
422 body; duplicate ⇒ 422; locked declaration ⇒ 409 and ⛔ link row; a rollback leaves ⛔ link row (a failure injected after the insert).

**AC4 — the nominee-member's side (NE6).** `GET /api/v1/member/nominee-links/requests` (the links naming the caller in `asked`, plus
answered ones, keyset-paged; the declarer's registered name decrypted AFTER commit, the 6.36b `names.ts` pattern) and
`POST /api/v1/member/nominee-links/requests/:linkId/answer` (`requireMemberSession`; Idempotency-Key; a second answer or an ended link ⇒
409 `nominee_link.request_closed`; another member's link ⇒ 404). ⛔ SMS, push or WhatsApp dispatch from the module (a test asserting ⛔
dispatcher call, the 6.36b AC6 form). PQ2 B ⇒ this AC is DROPPED, ⛔ built dark.

**AC5 — the mobile surface (NE3, NE4, NE6).** `NomineeForm` gains, per nominee and on the Life Events screen ONLY (a prop — the signup screen
passes ⛔ it), *"Is this nominee a TWT member? Find them in your contacts"* → a find screen reusing 6.36b's phone-side helpers and the
contact-matches endpoint (matched contacts under the member's SAVED names; iOS picker / Android typed fallback) → pick one → the mark shows
on the form; *"Remove mark"*. The copy states G8 plainly: *"If they sign in with a different number from the one above, this still keeps
them out of the people asked about your death."* (the words the author's; hi + en). The saved declaration shows each rank's label (NE6).
`NomineeLinkRequestEntry` on home and the noticeboard; the answer screen in `(life-events)`. The MMKV draft tolerates an OLD draft with ⛔
`memberLink` (G14). Mobile unit tests for the pure helpers and the form's link state; RTL `cleanup` and `lib/mmkv` mocked
([[project_mobile_vitest_and_expo_install_traps]]); any list renders its empty / error state OUTSIDE the list
([[project_fabric_flatlist_empty_populated_crash]]).

**AC6 — the exclusion (NE7).** `peerMeshNomineeMatchSql` takes `PeerMeshNomineeMatch`; `nomineeMatch` is REQUIRED on every ND4 type; the
select job, both children and the replacement walk pass it; the `is_nominee` labeller uses the same fragment. Legs (live DB, each a
MUTATION that goes RED when its line is removed): a linked nominee whose login number ≠ the declared number is ⛔ selected, ⛔ texted on
re-check, ⛔ reminded, ⛔ a replacement, labelled `peer_is_nominee`; a link asked AFTER the cut ⇒ ⛔ excluded; a link ended before the cut ⇒ ⛔
excluded; a `not_me` answer before the cut ⇒ STILL excluded (PQ1 A; inverted for B); a link on a NON-projected version (re-declared
without `keep`) ⇒ ⛔ excluded; an empty `memberIds` ⇒ the number match alone (6.36d legs green, unchanged); the label-coverage leg in
`peer-mesh-request.spec.ts` still green.

**AC7 — the staff line (NE8).** Unchanged for PQ1 A — a leg asserts an answer inside the window does ⛔ set `recent_change_before_filing`
and a linked re-save does. (PQ1 B: the fourth disjunct + its legs.)

**AC8 — erasure and export (NE10).** `anonymizeMember` erases both directions (the rtbf pin test extended); the export carries the NE10
fields through `ProfileSection` and `apps/jobs/tests/data-export.test.ts` runs the strict parse with a linked declaration on BOTH sides.

**AC9 — fences (NE11).** ⛔ number, name or other member's id in any log, audit or alarm call from the nominee / nominee-link modules (the
6.36b number fence extended); ⛔ events_log payload change; audit names declared in `audit-sink.ts`.

**AC10 — the gates.** `tsc`, ESLint, i18n parity, `ci:local` on a test database (⛔ `:5432`; [[project_prepush_hook_inherits_5432]]);
known reds named, ⛔ hidden ([[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [ ] **Task 0 — governance (AC0)**
  - [ ] 0.1 Preflight: `git fetch origin`; rebase if `origin/main` moved; re-run G1–G14's greps (a sibling can add a reader of the predicate or
        of the nominee tables — grep `peerMeshNomineeMatchSql`, `nomineeMobileIndexes`, `member_nominee_versions`, `known-people`); re-take the
        NUMBERS (decision ≥ `-392`, migration `0181` vs 11b.4's `0181`, ledger letter).
  - [ ] 0.2 BigDev answers NE1–NE14 (recorded VERBATIM here and in the Completion Notes). The Panel note (PQ1 + PQ2) — ⭐ WRITTEN 2026-10-23 ahead
        of the NE answers (revise it first if they differ from NE3 / NE4 / NE6 / NE7) — was written from the
        template (§0 first; E1 quotes re-verified verbatim; E4 commands run) and SENT by BigDev; its ruling transcribed into the note's block
        and into `.decision-log.md` as its own TRUSTEE-RATIFIED entry ([[feedback_shown_to_panel_means_sent]] — "sent" only once it went out).
        Revise NE6 / NE7 / NE8 to the ruling (the PQ1 B variants are already written inline).
  - [ ] 0.3 The author-commit — the next free decision id, *"AUTHOR-COMMIT (BigDev) — STORY 6.36e's BUILD DECISIONS NE1–NE14 …"*, with §0, the
        §0 re-run table, NE1–NE14 as decided (citing the Panel ruling for PQ1 / PQ2), and: NARROWS IN PART `-386` ND8 (for linked declarations
        saved after this ships); records that ND2's *"resolving to member ids first"* rejection is ⛔ reversed (NE7's ids are a declarer-chosen
        link, ⛔ a resolution at selection); records the residuals (a wrong pick; signup-only declarations unlinked; post-filing corrections;
        a nominee who is ⛔ in the member's contacts and whose other number they do ⛔ know). Committed ALONE as `governance: …`; its SHA written
        after ([[project_decision_log_writes_user_inserted]] — if the write is refused, ask once).
  - [ ] 0.4 The records commit (append-only, each dated):
        - `epics.md` — a `### Story 6.36e` entry after Story 6.36d, before 6.37, in 6.36d's form (the *"⚠ Added <date> (Story 6.36e, Task
          0.4)"* blockquote: the row was added by `-386` Not covered / 6.36d Task 0.4, ⛔ by Panel ruling; As a member …; ACs in brief);
        - the sprint row's note (and the `-386` follow-up named done-by-creation, ⛔ "Closed by");
        - roster Row 31 — a new leg **(j)** (the nominee member link: the Panel's answers — the new decision id; counsel's WRITTEN basis and a
          privacy-policy line — OPEN; `docs/legal/privacy-policy.md` §3's nominee row lists *"Name, relationship"* only); *"ALL NINE"* →
          *"ALL TEN"* with a dated recount note; roster Row 26 — a dated note (`member_nominee_links` joins the nominee tables the jobs read);
        - the counsel question `counsel-question-2026-10-18-nominee-contact-basis.md` — an added question 7 (written, ⛔ sent);
        - `deferred-work.md` — dated lines on the FAMILY item (narrows further on `done`), on *"Row 6-36d's nominee match is the ONLY
          nominee→member link …"* (a linked declaration survives AR-24), on the 6.36d normalisation item (*"Revisit with the follow-up row"* —
          answered), and NEW items: the signup prompt (NE4 (b)), the other readers (NE14), the post-filing correction residual (NE9);
        - 6.36d story — a dated annotation on ND8 / G18 (⛔ rewritten); 6.36b story — a dated note that its contact matching has a second
          purpose (per PQ2).
- [ ] **Task 1 — the table (AC1)** — migration + journal + schema + RLS mirror + barrels + the policy-regression spec.
- [ ] **Task 2 — the domain (AC3, AC6)**
  - [ ] 2.1 `packages/domain/src/nominee/member-links.ts` — `resolveNomineeLinkTargets` (the `knownPersonEligibleSql` lookup by index, inside
        the caller's tx), `writeNomineeLinksForDeclaration` (insert / carry / end per NE2, given the planned versions), `listNomineeLinksForMember`,
        `listNomineeLinkRequests`, `answerNomineeLinkRequest`, `eraseNomineeLinks`, `getNomineeLinksForExport`; exported through the nominee barrel.
        ⚠ ⛔ import `claim/` from `nominee/` ([[project_type_only_import_cycle_trap]] — the lock lives in `claim/` for that reason).
  - [ ] 2.2 `claim/peer-mesh-nominees.ts` — `peerMeshNomineeMatch` + pure `peerMeshNomineeLinkedMembersAsOf`; `claim/peer-mesh-read.ts` —
        `PeerMeshNomineeMatch`, the widened fragment, `nomineeMatch` on every ND4 type; `claim/peer-mesh-request.ts` — the labeller.
- [ ] **Task 3 — contracts + API (AC2, AC3, AC4, AC9)** — the declare handler (both routes); a new module
      `apps/api/src/modules/nominee-links/` (routes, handlers, names-after-commit); audit names; the number fence extended; OpenAPI re-emitted.
- [ ] **Task 4 — jobs (AC6)** — `runClaimPeerMeshSelect`, `readPeerMeshNomineeIndexes` in both children → the match object; the stale-cut check
      compares both halves; test fixtures that seed a REAL login blind index where a leg needs a number ≠ link case (6.36d G16).
- [ ] **Task 5 — mobile (AC5)** — `NomineeForm` link control + prop; the find screen; the request entry; the answer screen; api-client; i18n
      `nominee_link` hi + en with the real-`t()` test; parity.
- [ ] **Task 6 — erasure + export (AC8)** — `anonymizeMember` arm; `ProfileSection` FIRST, then `assemble.ts`; the jobs export test.
- [ ] **Task 7 — gates (AC10)** — and the records of the run (Debug Log), the ledger line, File List.

### Review Findings

*(empty — filled by `bmad-code-review`)*

## Dev Notes

### Current state of the code this story changes (traced at `1268d47e`)

- **Declare handler** (`nominee.handlers.ts`, `declare`) — see G3 for the exact order. This story adds: the pre-tx HMAC batch for link
  numbers (beside the pre-tx `hasFreshElevation` read), the link resolution + writes INSIDE the existing tx after
  `appendMemberDeclarationVersions`, and the signup-route refusal. **Preserve:** the D3 advisory lock FIRST; the D9 step-up rule; the
  split derivation; `member.nominees_declared` and its payload byte-for-byte; the audit after commit; the 409 vocabulary.
- **6.36d's nominee read** (`peer-mesh-nominees.ts`) — preserve ND6 (throw, ⛔ `[]` on error), the decrypt outside any tx, the single
  `mobileBlindIndexMany` call and its purpose; the link ids join the SAME `inScope` read (one extra SELECT on `member_nominee_links` by
  `version_id = ANY(…)`).
- **`peerMeshEligibleMemberSql`** — preserve every conjunct and its order; only the nominee fragment widens.
- **`NomineeForm`** — preserve its validation and both screens' behaviour; the signup screen renders exactly as today.

### Shipped substrate this story READS — rebuild none of it

`matchContactNumbers` / the contact-matches route / phone-side helpers (6.36b); `knownPersonEligibleSql`, `isKnownPeopleCaller`;
`mobileBlindIndexMany`, `normalizeMobile`; `listNomineeDeclarationVersions`, `projectedVersionOfRank`, `planDeclarationVersions`,
`getNomineeVersionHeads`; `lockNomineeDeclarationForEdit`; `resolvePeerMeshFilingCut` / `resolvePeerMeshSelectionFilingCut`; 6.36b's
`names.ts` decrypt-after-commit; `eraseKnownPeopleLinks` (the shape for the erase arm); `KnownPeopleRequestEntry` (the shape for the
request entry).

### Traps

- **TR1 — the link's value is narrow and must be said.** A contact picked from matched contacts IS the nominee's login number (G8); if the
  member also declares it as the nominee's `mobile`, the link adds nothing TODAY. The copy (AC5) and the Policy meaning must not promise
  more than: "whatever number they sign in with". ⛔ Claim the link improves contact or payout.
- **TR2 — append-only versions.** ⛔ ALTER `member_nominee_versions` (G2). The link table references versions; the versions never reference links.
- **TR3 — FK actions.** `version_id` → versions must be NO ACTION (the 0119 trigger refuses an UPDATE from `SET NULL`); `declarer_member_id` /
  `nominee_member_id` → `members` cascade (the 0162 precedent — members are soft-deleted, so erasure goes through `anonymizeMember`, ⛔ the FK).
- **TR4 — one fragment.** If the gate and the label do not share `peerMeshNomineeMatchSql`, a link-only match falls to `peer_not_eligible`
  and the label-coverage spec goes red — ⛔ "fix" the spec.
- **TR5 — `uuid[]` parameter.** `sql.param([...ids])::uuid[]` with an EMPTY array must match nothing (6.36d TR5 — the precedent site returns
  early); a leg with `memberIds: []`.
- **TR6 — KMS outside the tx.** The link numbers' HMACs run before `openScopeTx` (the jobs-pool / API-pool starvation and the per-HMAC audit
  lock — [[project_kms_audit_per_hmac_global_lock]], [[project_jobs_pool_two_connection_starvation]]); ONE batch call.
- **TR7 — withholding is uniform.** One 422 for every NE5 failure ([[feedback_withholding_must_be_uniform]]); the registered name only after
  `confirmed`; ⛔ the declarer learns WHY a link failed.
- **TR8 — strict parses.** Export sections (G11) and the api-client's response parse — the contract changes FIRST.
- **TR9 — the old draft.** An MMKV draft written before this story has ⛔ `memberLink` — read it as "no mark".
- **TR10 — markdown in JSDoc.** `**cl.3**`-style emphasis inside a `/** … */` can close it ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR11 — typed routes in a worktree.** ⛔ `.expo/types` ⇒ `tsc` does ⛔ check `Href` for the new screens ([[project_mobile_typed_routes_worktree]]) —
  grep every `router.push` target by hand.
- **TR12 — TanStack.** A per-row answer uses a per-call `mutateAsync` ([[project_tanstack_mutate_callbacks_latest_only]]); ⛔ `reset()` in
  `onSettled` wipes the banner ([[project_tanstack_onsettled_before_success]]).

### Testing standards

Live-DB integration on a TEST database (`:5433` / `:5434`, ⛔ `:5432`); separate transactions where `now()` ordering matters
([[project_db_clock_ordering_tests_tie]]); every exclusion leg is a mutation (RED when its line is removed, recorded in the Debug Log);
the policy-regression spec for the new table; contracts vitest; mobile vitest with RTL `cleanup`; `ci:local` before push.

### Project Structure Notes

New: `packages/domain/migrations/<NNNN>_member-nominee-links.sql`, `packages/domain/src/schema/member_nominee_links.ts`,
`packages/domain/src/policies/member-nominee-links-rls.ts`, `packages/domain/src/nominee/member-links.ts`, `apps/api/src/modules/nominee-links/`,
`packages/contracts/src/nominee/member-link.ts`, `packages/i18n/locales/{en,hi}/nominee_link.json`, mobile screens under
`apps/mobile/app/(life-events)/` and a component under `apps/mobile/components/nominee-link/`. Updated: the files named in G3, G7, G11, G14.

### References

- 6.36d story (G1–G18, ND1–ND10): `_bmad-output/implementation-artifacts/6-36d-exclude-nominees-from-the-five.md`
- 6.36b story (the matching and agreement shape): `_bmad-output/implementation-artifacts/6-36b-people-who-know-me.md`
- Decisions: `-386` (Not covered, ND2, ND8, ND9), `-384` (Q1 A, Q2 A), `-310` CF5 A, `-309` item 3, `-307` §2 item 3, `-330` SW14 / SW16,
  `-234` X, `-160` cl.3, `-156` cl.7(a), `-356`, `-263` FQ10 A — `.decision-log.md`
- Roster Rows 17, 26, 31, 34 — `docs/launch-gate-inventory/inventory-roster.md`
- Counsel question — `_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md` (WRITTEN, ⛔ sent)
- Routing template — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`
- PRD FR-4 / FR-5 / FR-37 / FR-74 (`_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`); architecture §2.7 (Tier-1 / Tier-2),
  §2.12 (consent registry), §1.2 (RLS)
- Privacy policy §3 (the nominee row) — `docs/legal/privacy-policy.md` (gitignored local copy)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-10-23 — Created by `bmad-create-story 6.36e` (v1.0): four parallel read-only research passes (governance, nominee-declaration code,
  6.36b matching + 6.36d exclusion code, planning artifacts); load-bearing code claims spot-checked at `1268d47e`. Ultimate context engine
  analysis completed — comprehensive developer guide created.

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-23 | 1.1 | The Panel note WRITTEN (BigDev: *"yes commit and write the panel note"*): `trustee-panel-routing-note-2026-10-23-6-36e-nominee-member-link.md` — Q1 (record the account; when the answer counts — A / B / C), Q2 (what each side is told — A / B / C); our reading A, A; E1 checked verbatim, E4 run; ⛔ sent. Ledger `2026-10-23am`. |
| 2026-10-23 | 1.0 | Created (`bmad-create-story 6.36e`): G1–G14, NE1–NE14 PROPOSED, PQ1 / PQ2 OWED, AC0–AC10, Tasks 0–7. Status ready-for-dev; ⛔ code. |
