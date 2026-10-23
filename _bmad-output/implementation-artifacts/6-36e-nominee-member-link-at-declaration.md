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

⭐ v1.4 (2026-10-24): TASK 0.4 DONE — the records written (ledger `2026-10-24d`); AC0 MET ⇒ Task 1 (code) may start.
⭐ v1.3 (2026-10-24): TASKS 0.1–0.3 DONE — BigDev *"NE1-NE14 all recommended"*; the Panel RULED Q1 A, Q2 A (*"by DR and KB"*) ⇒
`2026-10-24-396` (TRUSTEE-RATIFIED, committed alone `44a65afa`) and the author-commit `2026-10-24-397` (committed alone `0f202476`).
Everything below that says PROPOSED / OWED / ⛔ sent is kept as written at v1.2 — read it with this line. Next: Task 0.4 (records), then
Task 1. The PQ1 A + PQ2 A row of the rulings → build table applies; every B / C variant is ⛔ built.

STATUS: ready-for-dev (v1.2 — VALIDATED by `bmad-create-story validate 6.36e`, 2026-10-24: four read-only verifiers, 26 consolidated
findings V1–V26, BigDev *"all"*; the Panel note REVISED with it, still ⛔ sent). NE1–NE14 are PROPOSED — BigDev answers them at Task 0.2; ONE author-commit records them BEFORE any code
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
takes it (`git log --all` + every worktree): decisions — *(v1.2, re-grepped 2026-10-24)* highest COMMITTED `-395` (`story/11b-4-…`,
`84dac52e`; `-392` `bb53d680` and `-393` `8145d0c3` there too); `-394` committed on `story/5-11-…` (`8eb8cee0`) ⇒ the author-commit
takes ≥ `-396`. *(v1.0 said ≥ `-392` — already taken by 11b-4 nine minutes before this story's creation commit.)* Migrations — highest COMMITTED
`0180_peer-mesh-request-peer-is-nominee`; the 11b.4 story (committed `a836c4b5`) PLANS `0181_memorial-authorship` (a plan, ⛔ a commit)
⇒ this story's is `0181` only if it commits first, else ≥ `0182` ([[project_sibling_migration_when_order_shared_db]] — journal `when`
order). ⚠ 11b.4 ALSO extends `anonymizeMember` (its table-count pin "raises this number in the same commit") and the
`AuthAuditEventType` union (`audit-sink.ts`) — whichever of the two lands SECOND re-bases the RTBF table count and the audit union.
Ledger letters: v1.0's `2026-10-23al` COLLIDES — 11b-4 committed its `al` first (`14c49051`, 23:11 IST, before this story's `bed977cb`,
23:18) ⇒ under `-366` decision 6 `al` is 11b-4's and this story's creation line RE-LETTERS at its rebase onto main; `am` is this
story's; 11b-4 also holds `an`–`ap` ⇒ the 10-23 sequence is exhausted to `ap`; the v1.2 validate commit takes `2026-10-24a` (the
first-of-day letter; ⛔ `2026-10-24` entry on any branch or worktree at 2026-10-24) — re-grep at every commit.

LETTERS: G = found facts (traced at the pin) · NE = build decisions (PROPOSED) · PQ = Panel questions (OWED) · TR = traps · V = the v1.2
validate findings (Change Log).
-->

# Story 6.36e: A Member May Mark a Nominee Who Is Also a Member — Found From Their Own Contacts, Told in the App — So That Nominee Is Never Among the Five, Even if They Sign In on a Different Number From the One Declared `[PRIMITIVE]` `[SURFACE]`

Status: in-progress

> ✅ **v1.4 (2026-10-24): Task 0.4 DONE — AC0 MET. ⭐ Next: Task 1 (the table).**
>
> ✅ **v1.3 (2026-10-24): Tasks 0.1–0.3 DONE** (`-396` ruled Q1 A / Q2 A; `-397` NE1–NE14 as recommended). ⭐ **Next: Task 0.4 (the
> records commit), then Task 1 (code).** The banner below is the v1.2 text, kept.
>
> ⭐ **Next: Task 0.1 (preflight), then Task 0.2 — BigDev answers NE1–NE14; the Panel note (PQ1 + PQ2) is WRITTEN (v1.1, revised at
> v1.2) — revise it again only if the NE answers differ from what it assumes, then BigDev SENDS it.** ⛔ Code until the author-commit
> (Task 0.3) is committed ALONE and the records (Task 0.4) follow it.

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

Story 6.36d keeps a dead member's NOMINEES out of the five members asked about the death — but it can only recognise a nominee who is a
member by PHONE NUMBER: the number the deceased typed for the nominee must equal the number that nominee SIGNED UP with (6.36d G18 /
ND8 — *"The only true fix is a member link captured at declaration"*; BigDev accepted the gap and asked for this follow-up row). A
nominee on a second SIM, a family phone, or a typo escapes and can be asked. This story lets a member, when declaring nominees in **Life
Events**, mark a nominee as a fellow member by **finding them in their own phone contacts** (6.36b's contact-matching shape — the server
answers only *which* numbers are members, ⛔ who), records the matched **member account** on that nominee's declaration in a NEW link
table, **tells that member in the app** that they were named (they answer "Yes, that's me" / "No, that's not me"; the declarer sees the
answer), and widens 6.36d's ONE nominee fragment so the five also leave out a member linked this way — matched by ACCOUNT, so the
nominee is left out even when the number declared for them differs from the one they sign in with. ⚠ **What it does NOT cover (V6):**
the mark can be made only if the member HOLDS the number the nominee signs in with (a matched contact, or typed); a nominee who signed up
on a number the member does not have — often a FAMILY phone, saved in the member's contacts under the relative's name — stays
uncovered exactly as under 6.36d. A later change of login number (AR-24) would also be covered, but ⛔ row or story builds a
login-number change today (`epics.md` AR-24 lists "mobile change" only as a step-up operation) — so TODAY the link helps only where the
declared number differs from a sign-in number the member holds. Only declarations made after it ships are covered (⛔ backfill).
WHETHER the link may be recorded, WHEN the nominee's answer is needed, and WHAT each side is told are the Panel's (PQ1, PQ2) — the rest
is the author's.

> ⚠ **A cheaper alternative, put to BigDev at Task 0.2 (V6 — ⛔ recommended, ⛔ adopted):** the TYPO case alone can be closed with ⛔ new
> processing and ⛔ Panel question — the phone's own contact picker on the declared `mobile` field (⛔ member lookup), so the number is
> copied, ⛔ typed. The link table is needed only for the dual-number case. BigDev may choose it INSTEAD (⇒ this story shrinks to a
> picker; PQ1 / PQ2 withdrawn) or AS WELL.

## Story

As a member declaring my nominees,
I want to mark a nominee who is also a TWT member by finding them in my contacts,
so that the Trust never asks my nominee about my death — even if they sign in with a different number from the one I gave for them.

## 📜 Policy meaning (AI-10-1)

**This story CHANGES a predicate** — it widens the nominee conjunct of `peerMeshEligibleMemberSql` (the ONE predicate that decides which
members may be asked about a death) from "matched by number" to "matched by number OR by a recorded member link". **In the member's
terms (the deceased's) — ONE sentence (V23):** *"If you mark a nominee as a fellow member by finding them in your phone contacts, the
Trust will not ask that person about your death even if they sign in on a different number from the one you gave for them (if the
Panel rules PQ1 B: only once they confirm it is them) — and neither of you gains or loses any benefit, cover or vote by it."* **In the
nominee-member's terms:** *"While a member's mark naming you stands, the Trust will not ask you to vouch for that member's death, and
nothing else about your own membership changes"* — plus, under PQ2 A only, *"you are told in the app and asked whether it is you"*
(under PQ2 B the nominee is ⛔ told — the sentence then ends at "changes").

**Checked against the Niyamavali** (canonical home: the private repo `ulanzi1/twt-legal` (`-167`); read from the main checkout's gitignored
copy `docs/legal/niyamavali.md` — file dated (mtime) 2026-08-16, its own Version / Effective fields unfilled placeholders — a rulebook, ⛔
ratified, [[feedback_niyamavali_rulebook_not_spec]]): §2.4 (*"Each member
declares one or two nominees at signup or via Life Events"*; *"Nominee identity does not require KYC"*) — ⛔ silent on a nominee who is a
member and on a nominee's agreement at declaration; §6.3 (*"At claim time the nominee provides bank/IFSC details (not collected earlier)
and the **explicit DPDPA consents** in Part 10"*) — the NEAREST clause on a nominee's agreement, and it places it at CLAIM time, ⛔ at
declaration — ⛔ conflict, ⛔ answer; §6.1 / §6.2 — ⛔ clause says who is ASKED; Part 10 (*"processes member/nominee/claimant
data lawfully, for specified purposes, on a lawful basis"*) bears on the NEW processing — that is PQ1 (and counsel, Row 31 (j)). **Result: ⛔
conflict on the selection rule; the data basis is OPEN (PQ1).** **What the predicate decides:** who is ASKED — ⛔ what a family is owed; the
peer mesh is a signal, ⛔ never a gate (`-263` FQ10 A). Its one visible consequence is 6.36d's: at a small workplace the claim can reach
"nobody to ask" sooner, and the ground inspection carries it (`-330` SW25).

**A SECOND predicate is introduced and it gates ⛔ benefit:** who may be linked as a nominee (NE5 — an `active` / `active-in-grace` member of
the same Pariwar, ⛔ the declarer, ⛔ reported dead). **In the member's terms (V23):** *"You can mark a nominee as a member only if they are
an active member of your own Pariwar who has not been reported dead; anyone else you still name as your nominee exactly as today."*
Checked against the Niyamavali: §2.4 ⛔ restricts who may be a nominee and this gates only the MARK ⇒ ⛔ conflict. It decides only
whether the mark can be made; a member who cannot be linked is still declared as a nominee by name and number exactly as today. ⛔ Payout,
nominee determination, claim filing or contact reads the link (NE14).

## The rulings and decisions this story builds on

| Source | Key (verbatim, short) | Status |
|---|---|---|
| `-386` Not covered (item 1) | *"a nominee's member link captured at declaration — the only fix for the ND8 gap; a follow-up backlog row (Story 6.36d Task 0.4) that needs the nominee's agreement and its OWN Panel question"* | AUTHOR-COMMIT — ⭐ THIS ROW'S ORIGIN |
| `-386` ND2 | the nominee mobiles HMAC'd into the LOGIN space and matched in `peerMeshEligibleMemberSql`; *"Rejected: a stored nominee blind index (joinable to the login key); resolving to member ids first."* | AUTHOR-COMMIT — ⚠ **SUPERSEDED IN PART by the 6.36e author-commit (V8)** — ⛔ "stays as written": ND2 defines the conjunct as matching `member_identities.mobile_blind_index` ONLY (NE7 widens it), and its first rejection's GROUND (6.36d: a stored index *"would make every nominee row joinable to the login key"*) is exactly the property NE1 creates — a stored, direct nominee→member-account link. The author-commit records: the conjunct matches by number OR by a recorded link; the joinability ground gives way for a DECLARER-MARKED link (authority: the PQ1 ruling); the rejection of resolving numbers to member ids AT SELECTION stands |
| `-386` ND8 | *"a nominee who is a member is found ONLY if the deceased typed the number that nominee SIGNED UP with … ⛔ second number, ID or member link exists anywhere"* | AUTHOR-COMMIT — a FACT about the system: TO BE NARROWED IN PART by the 6.36e author-commit, effective once row 6-36e is `done` on `main` (⛔ before; ⛔ at all under PQ1 C) — the `-386` "RESOLVES IN PART … once … `done`" form (V8) |
| `-386` ND9 | *"⛔ backfill. Nothing is in production"* | AUTHOR-COMMIT — precedent for NE12 |
| `-384` Q1 A | *"Yes — use the nominee's number for this check."*; the question as put: *"… only to make sure a nominee who is also a member is never one of the five"*; Not covered: *"any other use of a nominee's number"*, *"a nominee who signs in with a DIFFERENT number from the one the member gave — ⛔ matched, can still be asked"* | ⭐ TRUSTEE-RATIFIED — ⛔ covers a member LINK (PQ1) |
| `-384` Q2 A | *"Yes — warn staff about nominee changes too."*; cost as put: *"… including when someone re-saved the nominees without changing them, or declared them at sign-up within those 90 days."* | ⭐ TRUSTEE-RATIFIED — a link is set only by a declaration save (a new version) ⇒ already inside it (NE8) |
| `-310` CF5 A | *"With the member's permission, the app checks their phone contacts against the member list, shows the matches under the names the member saved, and keeps ⛔ no non-member's number; counsel confirms the basis."* | ⭐ TRUSTEE-RATIFIED — ruled for "people who know me"; reuse for a nominee is an EXTENSION (PQ2) |
| `-309` item 3 | the matches are shown under the member's saved names, *"⛔ never the member's registered name (members' mobile numbers are private: showing 'this number is member X' would let anyone map numbers to members)"*; *"the registered name is shown to the member only after acceptance"* | AUTHOR-COMMIT — binds NE3 / NE6 |
| `-307` §2 item 3 (iii) / `-330` SW14 | the named person ACCEPTS in the app (*"[Name] has named you as someone who knows them. Do you know him/her?"*), told first *"[Name] will see your answer."*; (the "⛔ SMS, push or WhatsApp" rule is 6.36b AC6's, ⛔ these decisions' — V26) | AUTHOR-COMMIT — the agreement SHAPE NE6 reuses |
| `-330` SW16 (1) / 6.36b AC10 | *"a member is ⛔ not yet `active` while signing up"* ⇒ ⛔ signup step | AUTHOR-COMMIT — binds NE4 |
| `-234` X | *"Yes nominee should cover names, relationship, mobile, address, split. Yes all of them can be changed as long as member is alive."* | ⭐ TRUSTEE-RATIFIED — the link is ⛔ a sixth declaration FIELD (NE1: own table, ⛔ in the declaration lock's correctable set) |
| `-233` / `-234` V / `-235` Y / `-239` | the declaration locks at the first claim; a change on or after the day of death is discarded for the PAYOUT and raises suspicion | ⭐ TRUSTEE-RATIFIED — the link follows the declaration's lock (NE2 / NE9) |
| `-160` cl.3 / roster Row 17 (2026-08-28) | *"⛔ Nobody may cite this amendment as authority that a member's T&C reaches another person's data."* | ⭐ TRUSTEE-RATIFIED — the declarer's acceptance is ⛔ a basis for processing the nominee-member's account (PQ1) |
| `-156` cl.7(a) | *"If a surface ships differing materially from that description — a new data class, a new subject population, a new recipient — the clearance does ⛔ NOT extend to it and the review re-opens."* | ⭐ TRUSTEE-RATIFIED — why a browsable members list is REJECTED (NE3) |
| `-356` / its reading (ii) | *"drop WhatsApp only notification for nominee."*; (ii) a member nominee's member opt-in *"does not count by itself"* | ⭐ TRUSTEE-RATIFIED (the ruling only); reading (ii) sits under `-356`'s "⚠ Our reading — NOT RATIFIED" — the author's, ⛔ ratified (V22) — NE6's notice is IN-APP only; ⛔ WhatsApp |
| `-263` FQ10 A | *"THE CHECK WITH NEIGHBOURS IS A SIGNAL, ⛔ NOT A GATE"* | ⭐ TRUSTEE-RATIFIED |
| `-340` call 2 / `-341` / `-386` §0 | removing a person with a stake from the pool is the author's class | AUTHOR-COMMIT — ⭐ THE PRECEDENT for NE7 |
| `-386` Not covered item 1's *"needs the nominee's agreement"* | (quoted in the first row) | AUTHOR-COMMIT — ⚠ under PQ1 A it is SUPERSEDED IN PART by the 6.36e author-commit (*"needs the nominee's agreement"* → "the nominee is told and answers; the mark does ⛔ wait for a yes"), citing the PQ1 ruling; ⛔ edited, ⛔ "read" (V8, [[feedback_supersede_never_reinterpret]]) |

### §0 re-run — every edge against the ruled words ([[feedback_panel_gate_read_ratified_verbatim]])

| Edge | Ratified text | Verdict |
|---|---|---|
| Excluding a LINKED nominee from the five | `-310` CF4 A names where the five come from; every filter since is an author-commit (`-340`, `-341`, `-386`) | **MATCH** (author's) |
| Recording which member account a nominee is | `-384` Q1 A is scoped *"only"* to comparing NUMBERS and lists *"any other use"* as not covered; `-160` cl.3's limit forbids resting it on the declarer's T&C; the nominee's own Claim Terms do ⛔ exist (`-177` D5(a), UN-ATTESTED) | **the Panel's — PQ1** (a legal / consent basis) |
| WHEN the nominee's answer is needed (before the link counts, or never) | ⛔ ratified text; the row note says *"needs the nominee's agreement"* — written by the author at `-386`, ⛔ the Panel's words | **the Panel's — PQ1** (it decides whether processing waits on consent) |
| Telling the nominee-member they were named | ⛔ ratified text; a member's nominee choice is their own data, disclosed to a third person | **the Panel's — PQ2** (*"what the Trust DISCLOSES … to whom"*) |
| Telling the declarer which contacts are members, for a nominee | `-310` CF5 A ruled it for "people who know me" (the question as put, `trustee-panel-routing-note-2026-10-10-6-27-confirms.md`: *"to help a member name the people who know them"* — V22) | **the Panel's — PQ2** (an EXTENSION of CF5 A to a new purpose) |
| The staff warning for a link change | `-384` Q2 A: nominees *"declared or changed"*; a link is set ONLY by a declaration save (NE2), which writes versions | **MATCH** under PQ1 A — ⛔ new trigger needed (NE8). ⚠ Under PQ1 B a nominee's ANSWER (⛔ a declaration) would change who is asked ⇒ joining it to the warning EXTENDS `-384` Q2 A to a new trigger — the Panel's; stated in the note's Q1 B row (V22) |
| Is the link part of "the nominee" (`-234` X — *"names, relationship, mobile, address, split … can be changed as long as member is alive"*)? | `-234` X | **MATCH** — the link changes ONLY with a declaration save and locks with it (NE2 / G9), so X's right to change is untouched; ⛔ a sixth field by BEHAVIOUR (the own table is the storage, ⛔ the reason) (V22) |
| Gating and metering the new number lookup (NE5's counter, V2) | `-309` item 3 (number→member mapping is the concern); 6.36b's counters (author's) | **MATCH** (author's) — the cost is stated in the note's Q2 A |
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
  → `appendMemberDeclarationVersions` → `buildStatus` → `ok = true` → `emitAuthAudit('member_nominees.declared', …)` → COMMIT in `finally`
  (`closeScopeTx(scopeTx, ok)`, `multi-tenant/scope-tx.ts`). ⚠ *(v1.2, V10 — v1.0 said "commit → audit")*: the audit fires INSIDE the
  `try`, BEFORE the COMMIT, guarded only by `ok` (the in-code comment says why). ⛔ Idempotency key on declare. Both routes bind the SAME
  `declare` with the SAME `NomineeDeclareRequest` (`nominee.routes.ts`, `life-events/routes.ts`) ⇒ the handler cannot tell which route
  called it (V20). The D9 re-declaration step-up applies on BOTH routes outside `PRE_LOCK_IN_STATES` — G9's "the signup route is ⛔
  step-up gated" is true only of the static preHandler.
- **G4 — 6.36b's matching, as built.** `POST /api/v1/member/known-people/contact-matches` (`apps/api/src/modules/known-people/routes.ts`,
  `handlers.ts`) → `matchContactNumbers` (`packages/domain/src/member/known-people.ts`): `normaliseContactNumbers` → `chargeContactMatch`
  (counters `contact_match_requests` 3/day, `contact_match_numbers` 2,000 / 30 days, Pariwar 100,000/day; IST days) → `contactMatchIndexes`
  (`mobileBlindIndexMany`, ⛔ inside a tx, ONE audit line, purpose `contact_match`) → `matchedContactPositions` (`member_identities` ⋈
  `members`, explicit `pariwar_id`, `knownPersonEligibleSql`) → `{ matched: number[] }` POSITIONS ONLY (⛔ id, name or count). The caller gate
  `isKnownPeopleCaller` = `active` AND ⛔ named by a claim as the deceased (403 `known_people.not_available`). The ask resolves a NUMBER to a
  member SERVER-side (`askKnownPerson` — the client never sends a member id); every unavailable-TARGET reason except self is ONE 404
  `known_people.not_a_member` (self is a separate 422 `known_people.self`; `cannot_ask_now` / `limit_reached` are 409s — V26). ⚠ 6.36b
  charges and gates BEFORE any HMAC (`chargeContactMatch` / `chargeKnownPersonAsk` — "a refused request costs ⛔ KMS call"), and caps
  single typed asks at `KNOWN_PEOPLE_ASKS_PER_DAY = 10` (counter `known_people_ask`); the counter vocabulary is pinned by
  `member_daily_counters_counter_check` (`0162`, ⚠ LOCKSTEP with `MEMBER_DAILY_COUNTERS` in `schema/member_daily_counters.ts`). Limits:
  `CONTACT_MATCH_REQUESTS_PER_DAY = 3`, `CONTACT_MATCH_MAX_NUMBERS` 1,000 per request, 2,000 per 30 days. The caller gate
  `knownPeopleCallerSql` is `state = 'active'` ONLY (⛔ `active-in-grace`) AND ⛔ `namedByClaimSql`; the target gate `knownPersonEligibleSql`
  is `active | active-in-grace`, ⛔ the caller, ⛔ `namedByClaimSql` (same-Pariwar from the query's explicit `pariwar_id`). Audit lines put
  the OTHER member's id in `resourceLocator: member:<id>` (`known-people/handlers.ts`) — NE11 does ⛔ copy that (V18). Mobile: `app/(life-events)/known-people-find.tsx`; contacts only in `lib/known-people-contacts.ts`
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
  pre-read, the 1 h deferral / 24 h `nominee_check_unavailable`, the in-lock `ClaimPeerMeshNomineeIndexesStaleError` check — which
  compares the cut / anchor and tests `=== null`, ⛔ index values (V16)), and `readPeerMeshNomineeIndexes` — DEFINED once in
  `scheduler/claim-peer-mesh-requests.ts`, IMPORTED by `scheduler/claim-peer-mesh-wa-reminders.ts` (via
  `resolvePeerMeshSelectionFilingCut`). ⚠ *(v1.2, V16)* `nomineeMobileIndexes` is ALSO a field of five inline input types beyond the two
  ND4 interfaces: `readPeerMeshRequestEligibility`, `insertPeerMeshReplacementPing` (the replacement walk), `beginPeerMeshRequest`,
  `finalisePeerMeshNoSendableNumber` (all `claim/peer-mesh-request.ts`) and `beginPeerMeshWaReminder` (`claim/peer-mesh-wa-reminder.ts`);
  fixtures that construct them: `apps/api/tests/integration/claims/peer-request-after-send.spec.ts`, `apps/jobs/tests/claim-peer-mesh.test.ts`,
  `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts`, `packages/domain/tests/claim/peer-mesh-nominees.test.ts` (calls the renamed
  function, ⛔ builds the field),
  `packages/domain/tests/integration/claim/peer-mesh-{request,request-concurrency,wa-reminder,wa-reminder-concurrency,workplace-snapshot}.spec.ts`
  (re-grep `nomineeMobileIndexes` at Task 0.1 — every hit renames). The send-time labeller `readPeerMeshRequestEligibility` (`claim/peer-mesh-request.ts`) returns the
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
  api-client (`packages/api-client/src/index.ts` — `nomineesDeclare`, `nomineesStatus`, `lifeEventsUpdateNominees`) — a new response key
  needs the client in the same change. ⚠ *(v1.2, V5)* **`memberAuth.nomineesStatus()` is ALSO read by the CLAIM flow** —
  `apps/mobile/app/(claim)/contact.tsx`, `(claim)/nominee-review.tsx`, `lib/claim-contact.ts` (the family filing on the deceased's
  session); and `NomineeSummaryEntry`'s own contract comment (`contracts/src/nominee/declaration.ts`) says *"NON-PII only … NEVER the raw
  name"* ⇒ a field added to `NomineeStatusResponse` reaches the claim flow (NE14 forbids that). Name collision: a second
  `NomineeSummaryEntry` exists in `domain/src/schema/member_search_projection.ts` (admin search) and `NomineeSummaryEntryDto` in
  `contracts/members/validity.ts` — neither is touched. Export: `ProfileSection.nominees[]` comes from the projection (⛔ version id);
  `nomineeHistory[]` carries versions; the 6.36b precedent is ONE `knownPeople: { named, namedBy }` object (`contracts/data-export`).
- **G12 — the jobs DB role.** `twt_service` holds ⛔ grant on any nominee table (roster Row 26, `jobs-db-role`, dated 2026-10-23 note: the
  6.36d reads of `member_nominee_versions` *"would 42501 in production"*; its round-4 note: closure must cover the nominee tables). A new
  link table read by the select / request / reminder jobs JOINS that list — recorded at Task 0.4, ⛔ fixed here.
- **G13 — migrations are hand-authored SQL.** ⛔ `db:generate` (snapshots stop at `0020`; re-emitting applied migrations ⇒ 42P07,
  [[project_live_db_test_gotchas]]); a hand entry in `packages/domain/migrations/meta/_journal.json` (last: idx 180, tag
  `0180_peer-mesh-request-peer-is-nominee`, `when` steps +86400001); statements split by `--> statement-breakpoint`; order CREATE → FKs →
  CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → functions → triggers. Precedents: `0162_member-known-people.sql` (the grants / RLS
  / guard-trigger FORM — ⚠ ⛔ its CHECK set: its `answer_window` (`responded_at >= asked_at AND < asked_at + 30 days`), `lapse_date`,
  `ended_after` CHECKs, its guard's lapse arm and its 3-live advisory-lock backstop do ⛔ fit NE1 — there is ⛔ lapse and a carried row's
  answer predates the carry (V1)), `0179_member-preferred-locale.sql` (idempotent `IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS`).
- **G14 — mobile.** Both nominee screens share `components/life-events/NomineeForm.tsx` (`NomineeFormEntry { name, relationship, mobile,
  address }`, `firstValidationError`, relationship chips from `NOMINEE_RELATIONSHIP_CODES`, mobile a free-text phone-pad `Input`).
  `app/(life-events)/nominees.tsx` (`LifeEventsNomineesScreen`): `useStepUpGate('nominee_change')`, MMKV draft key
  `life-events-draft:<memberId>:nominees` (`components/life-events/draft-store.ts` — an OLD draft lacks any new field), locked state from
  `memberAuth.nomineesStatus`. `app/(signup)/nominees.tsx` → `memberAuth.nomineesDeclare` → `/(signup)/medical`. Wizard order
  `['tc','kyc','workplace','nominees','medical','whatsapp','payment']` — the member is ⛔ `active` at the nominees step. ⛔ RENDER test of
  `NomineeForm` or either screen exists; a source-scan copy test does (`apps/mobile/tests/unit/nominee-name-copy-resolves.test.ts`, V26).
  ⚠ *(v1.2, V3)* **The Life Events form starts EMPTY**: the status carries ⛔ PII, so `initialForms` comes only from an MMKV draft —
  every save is a full re-type, positional by rank (`ranks[i]` in the handler). Home order (`app/(tabs)/index.tsx`): My Pool card (Story
  8.2 keeps it TOPMOST) → `PeerRequestEntry` → `KnownPeopleRequestEntry` → `HomePromptCards`. Copy: flat `nominees.*` keys in `packages/i18n/locales/{en,hi}/common.json` (parity:
  `packages/i18n/scripts/check-parity.ts`).

## ⚖️ Build decisions NE1–NE14 (PROPOSED — BigDev answers at Task 0.2)

Each carries the recommendation first. ⚠ NE6 / NE7 depend on PQ1's ruling; the recommendation is written for PQ1 A and the PQ1 B variant
is stated inline so the dev agent never has to infer it.

- **NE1 — where the link lives. RECOMMEND (a): a NEW table `member_nominee_links`**, one row per link, hung off the VERSION that declared
  it: `link_id` PK, `pariwar_id`, `declarer_member_id` (FK `members`, cascade), `version_id` (FK `member_nominee_versions`, NO ACTION —
  TR3), `rank` (CHECK 1|2), `nominee_member_id` (FK `members`, cascade), `found_by` (`contacts | picker | typed`), `carried_from_link_id`
  (self-FK, NULL), value CHECKs on `found_by` / `answer` / `state` / `end_reason`, `state` NOT NULL DEFAULT `'live'` (the state CHECKs
  below are sound only with it — a NULL `state` would pass all three), `asked_at` (NOT NULL, ⛔ default — set EXPLICITLY: a new link takes the declare's `recordedAt`, a carried link COPIES the
  old row's `asked_at`), and — *(v1.2, V1: v1.0's single `state` column made an answered link impossible to end or erase — the CHECK
  "answered ⇔ `responded_at`" plus a write-once `responded_at` refuse `state = 'ended'` on a `confirmed` row ⇒ every re-save of an
  answered rank 500s, RTBF aborts, and the answer is lost)* — TWO axes: **`answer`** (`confirmed | not_me`, NULL until answered) with
  **`responded_at`**, both write-once; **`state`** (`live | ended | erased`) with `ended_at`, `end_reason` (`redeclared |
  removed_by_declarer | erased`). CHECKs: not-self (`declarer_member_id <> nominee_member_id`); `(answer IS NULL) = (responded_at IS
  NULL)`; `(state = 'live') = (ended_at IS NULL)`; `(state = 'live') = (end_reason IS NULL)`; `(state = 'erased') = (end_reason IS NOT
  DISTINCT FROM 'erased')`. ⛔ 0162's answer-window / lapse / ended-after CHECKs or 3-live backstop (G13). Partial UNIQUE `(version_id) WHERE state =
  'live'`. A guard trigger in the `member_known_people_guard` FORM: every identity column (`link_id`, `pariwar_id`, `declarer_member_id`,
  `version_id`, `rank`, `nominee_member_id`, `found_by`, `carried_from_link_id`, `asked_at`) never changes; `answer` / `responded_at` /
  `ended_at` / `end_reason` write-once; transitions `live → ended | erased` only; an answer is set only while `live`. A BEFORE INSERT
  check (V21) that `version_id`'s version is `declared`, of the SAME `rank`, `member_id` (= `declarer_member_id`) and `pariwar_id` —
  `member_nominee_versions` cannot gain the composite UNIQUE a composite FK would need (TR2). twt_app `SELECT, INSERT, UPDATE (state,
  answer, responded_at, ended_at, end_reason)`, ⛔ DELETE; RLS ENABLE + FORCE by `pariwar_id`, separate SELECT / INSERT / UPDATE policies
  (⛔ FOR ALL). Ids only — ⛔ number, ⛔ name. The label shown (NE6 / AC2) = `coalesce(answer, 'asked')` on a `live` row. A `NomineeLinkId`
  brand in `packages/domain/src/ids/index.ts` (the `knownPersonLinkId` precedent; lower-case, [[project_branded_ids_lowercase]]). **Rejected:** (b) a column on `member_nominee_versions` — append-only; the answer arrives later (G2); it would also need the
  0119 trigger, grant and `kind_coherence` reworked; (c) a column on `member_nominees` — delete-then-insert orphans it (G2).
- **NE2 — how a link is set, kept and ended. RECOMMEND:** a link is set ONLY by a Life Events declaration save, in the SAME request and the
  SAME tx as the versions it hangs off (⛔ separate "link" endpoint — so the step-up, the claim lock, the D3 lock order and the ND7 staff line
  all apply unchanged). `NomineeDeclareEntry` gains an OPTIONAL `memberLink` — `{ kind: 'new', mobile: MobileNumber, foundBy }` (a number from
  matched contacts / the picker / typed — the SERVER resolves it, ⛔ a member id from the client) or `{ kind: 'keep', linkId }` (carry a
  live link: the new link row copies `nominee_member_id`, `found_by`, `asked_at`, `answer`, `responded_at` and sets `carried_from_link_id`
  — the nominee is ⛔ re-asked when the declarer only re-saves). *(v1.2, V4 — v1.0 left the rank's old link live when the rank got a
  `new` link, left links live on versions no longer projected after an innocence-finding unlock (NE9), 409'd forever on a rank swap, and
  could lose an answer racing a carry.)* **The rule:** in the declare tx, AFTER `lockNomineeDeclarationForEdit` (the D3 lock stays the
  FIRST lock), `SELECT … FOR UPDATE` EVERY `live` link of this declarer (any version, any rank). A `keep` must name one of them — on ANY
  rank, carried to the rank it is submitted on — else 409 `nominee.link_stale` (re-load and re-save). Every live link NOT carried ENDS:
  `redeclared` when its rank is vacated or given a `new` link, or it sat, BEFORE this save, on a version that was not its rank's head
  (e.g. after a correction); `removed_by_declarer` when its
  rank is re-saved WITHOUT `memberLink`. A `keep` does ⛔ re-run NE5 (the target was eligible when marked; a carried link of a member
  since reported dead is harmless — the five never include them). After the first claim the declaration is locked (G9) ⇒ links are
  locked with it.
- **NE3 — how the member finds the nominee. RECOMMEND:** 6.36b's contact matching, REUSED AS IS — the same endpoint
  (`POST /api/v1/member/known-people/contact-matches`), the same counters and audit purpose (one budget for one disclosure), the same
  phone-side helpers (`lib/known-people-contacts.ts`, `lib/known-people.ts`), with the iOS picker / Android typed-number fallback. On the
  nominee form, per nominee: *"Is [this nominee] a TWT member? Find them in your contacts"* → the member's matched contacts under the names
  THEY saved (`-309` — ⛔ the registered name) → pick ONE → the picked number goes into `memberLink.mobile` and, if the declared `mobile` is
  empty, is offered as it (editable — G8 / TR1). *(v1.2, V12)* **Budget:** the contact-match counters are SHARED with 6.36b (3 requests /
  day; 1,000 numbers per request, 2,000 per 30 days) ⇒ ONE match call per nominee-form session serves BOTH ranks (the matched list held in
  the form's memory, dropped on unmount; ⛔ a second request for rank 2). **Purpose:** the request carries `purpose: 'known_people' |
  'nominee_link'` (optional, default `known_people` — 6.36b's client unchanged), which changes ONLY the audit purpose string
  (`contact_match` vs `contact_match_nominee`) — same counters; logging the nominee use under `contact_match` would hide the second purpose
  PQ2 asks the Panel to allow (V12). **Rejected:** a browsable or name-searchable members list (`-309` item 3; `-156` cl.7(a); ⛔
  name blind index exists — G5); a member id sent by the client. *(PQ2 C variant: ⛔ find screen and ⛔ contact matching for nominees —
  `foundBy` is `typed` only; the control is a number field metered by NE5's counter.)*
- **NE4 — where it is offered. RECOMMEND (a): Life Events ONLY.** The signup step is unchanged (`-330` SW16 (1): ⛔ `active` at the nominees
  step; `isKnownPeopleCaller` refuses); the signup route REJECTS a `memberLink` (400 `nominee.link_not_available`) — checked FIRST, before
  any normalise / HMAC / tx, through a route flag (`declare` wrapped `{ allowLink: false }` on `nominee.routes.ts`, `{ allowLink: true }` on
  Life Events — the two routes share one handler and one body schema, G3; V20). ⚠ The signup route is reachable AFTER activation (D9):
  a save there with ⛔ `memberLink` applies NE2's end rules exactly as Life Events does (a re-saved rank ⇒ `removed_by_declarer`) — ⛔
  a live link left on a version no longer projected (V20). A member who declared at signup adds a link by re-saving in Life Events
  (step-up; new versions ⇒ the ND7 line, the cost `-384` Q2 A accepted). **Rejected:** (b) a post-activation home prompt (the 6.36c prompt
  shape) — deferred (deferred-work, Task 0.4).
- **NE5 — who may be linked (the second predicate). RECOMMEND:** an `active` or `active-in-grace` member of the SAME Pariwar, ⛔ the declarer,
  ⛔ named by any claim as deceased — i.e. `knownPersonEligibleSql` (`member/known-people.ts`), reused, ⛔ re-written. Every failure (⛔ a
  member, erased, withdrawn, reported dead, another Pariwar, the declarer) ⇒ ONE indistinguishable 422 `nominee.link_not_found` and the
  WHOLE declaration is refused (the member removes the mark or picks again) — ⛔ a silent save without the link. The SAME member on both
  ranks — after resolution, whatever the `kind` (two `keep`s of one `linkId`, or a `keep` and a `new` resolving to one member) ⇒ 422
  `nominee.link_duplicate`. **The caller gate** is `isKnownPeopleCaller` (`active` ONLY, ⛔ reported dead) and applies to
  `kind:'new'` ONLY — a failure is the SAME 422 `nominee.link_not_found` (TR7); `keep` and a save without `memberLink` are ⛔ gated, so an
  `active-in-grace` member keeps today's right to save (V11 — v1.0 named no code and, read literally, refused their whole declaration).
  **The meter (V2 — v1.0 had none: a typed / picked `kind:'new'` answered "is this number a member of my Pariwar?" with a 422 or a
  success, for free, as often as one `nominee_change` elevation window allowed — `-309` item 3's concern, which 6.36b meters):** BEFORE
  any HMAC, in its OWN short scoped tx, run the caller gate and charge ONE unit per `kind:'new'` entry to a NEW `member_daily_counters`
  counter `nominee_link_resolve` — **4 per IST day** (two ranks, one retry each) — the 6.36b `chargeKnownPersonAsk` shape; the migration
  widens `member_daily_counters_counter_check` and `MEMBER_DAILY_COUNTERS` in LOCKSTEP; over the limit ⇒ 429 `nominee.link_daily_limit`,
  ⛔ KMS call, nothing written. A refusal by the caller gate also costs ⛔ KMS call.
- **NE6 — what the nominee-member is told, and their answer. RECOMMEND (for PQ1 A / PQ2 A):** IN THE APP ONLY (⛔ SMS, push or WhatsApp —
  `-356`, 6.36b AC6): a `NomineeLinkRequestEntry` on home and the noticeboard (the `KnownPeopleRequestEntry` shape) → a screen in
  `(life-events)`: *"[Declarer's registered name] has named you as their nominee in TWT and marked you as a member. Is that you?"*, above
  the answers *"[Name] will see your answer."*, then *"Yes, that's me"* ⇒ `confirmed` / *"No, that's not me"* ⇒ `not_me`. ONE answer; ⛔
  lapse (it stays open while the link stands); ⛔ withdraw (being someone's nominee is the declarer's choice — the nominee can only say it is
  not them; whether a withdrawal must exist is PQ1's counsel half). The declarer sees, per rank: *Asked* / *Confirmed — [registered name]* /
  *Said it is not them* (the registered name only after `confirmed` — `-309`). **The consequence is told to BOTH sides (V14):** the
  nominee's screen adds *"While this stands, you will not be asked about [Name]'s death."*; the declarer, under *Said it is not them*, sees
  *"The mark still counts until you remove it or pick again."* (PQ1 A; under PQ1 B: *"The mark counts only once they confirm it is
  them."*). **Who may answer, and until when (V13):** the answerer is an `active` / `active-in-grace` member ⛔ named by a claim as
  deceased; a link whose DECLARER is named by any claim as deceased (`namedByClaimSql`) is ⛔ listed and its answer ⇒ 409
  `nominee_link.request_closed` (else the card *"[Name] has named you … Is that you?"* would stay open after the declarer's death). Copy in a
  NEW namespace `nominee_link` (hi + en), with a real-`t()` test ([[feedback_stub_must_call_not_transcribe]]); the English is the words
  QUOTED in NE6 / AC5, final; the Hindi strings drafted by the dev and approved by BigDev (the 6.35 LS14 precedent). *(PQ2 B variant — a
  silent mark: ⛔ request entry, ⛔ answer screen, ⛔ answer endpoints; `answer` is always NULL; the declarer sees only *Marked*. ⚠ PQ2 B
  is ⛔ possible with PQ1 B — nobody could confirm; PQ1 B × PQ2 B ≡ PQ1 C (⛔ build).)*
- **NE7 — what the five leave out (the author's, the `-340` class). RECOMMEND (for PQ1 A):** a member LINKED on a rank's version
  PROJECTED as of the `-339` cut (the SAME walk as `peerMeshNomineeCiphertextsAsOf` — `recordedAt < cut`, `projectedVersionOfRank`; a
  `vacated` projection ⇒ nobody) whose link is `ended_at IS NULL OR ended_at >= cut` is excluded WHATEVER the nominee answered (`answer`
  NULL, `confirmed` or `not_me`). *(v1.2, V15: v1.0 also required `asked_at < cut` — redundant, since a link is written in the same tx as
  its version, and harmful with a `clock_timestamp()` default that is LATER than the version's `recordedAt`: a save straddling IST
  midnight of the filing day would count the version but not its link.)* Fail-safe: a "not me" (true or false) never puts a possible payee
  back among the five; a wrong pick costs one colleague until the declarer fixes it — the same residual 6.36d accepted for a mistyped
  number (ND8). *(PQ1 B variant: only a link with `answer = 'confirmed' AND responded_at < cut` counts.)* Built as ONE fragment so the gate and the label cannot drift: `peerMeshNomineeMatchSql(m,
  match: PeerMeshNomineeMatch)` where `PeerMeshNomineeMatch = { readonly mobileIndexes: readonly string[]; readonly memberIds: readonly
  MemberId[] }` = `(EXISTS … mobile_blind_index = ANY(…)) OR ${m}.member_id = ANY(${sql.param([...memberIds])}::uuid[])`; the field
  `nomineeMobileIndexes` becomes `nomineeMatch` on EVERY ND4 type (required, ⛔ optional, ⛔ defaulted); `peerMeshNomineeMobileIndexes` becomes
  `peerMeshNomineeMatch` returning both (the member ids read in the SAME `inScope` read as the versions — DB only, ⛔ KMS — via a pure
  `peerMeshNomineeLinkedMembersAsOf(versions, links, cut)` beside `peerMeshNomineeCiphertextsAsOf`); the `is_nominee` labelling column uses
  the same fragment ⇒ `peer_is_nominee` is REUSED (⛔ vocabulary migration, ⛔ new label). The 1 h / 24 h deferral and the two children
  carry the member ids for free; the stale-cut check tests `nomineeMatch === null` (it compares the cut / anchor, ⛔ values — G7). Every
  inline input type and fixture G7 lists renames `nomineeMobileIndexes` → `nomineeMatch`. ⛔ `metric_version` bump (the `-340` / `-341` /
  `-386` precedent).
- **NE8 — the staff line. RECOMMEND: ⛔ change.** A link is set or ended only by a declaration save (NE2), which records versions ⇒
  `getPeerMeshNomineeChangeBeforeFiling` already fires. The nominee's ANSWER does ⛔ set the line — under NE7 (PQ1 A) it never changes who is
  asked. *(PQ1 B variant: an answer inside `[cut.recentFrom, cut.cut)` DOES change who is asked ⇒ it joins the line as a fourth disjunct — an
  EXTENSION of `-384` Q2 A to a new trigger, the Panel's (§0 table); STATED in the note's Q1 B row (v1.2), so a B ruling carries it.)*
- **NE9 — corrections. RECOMMEND: ⛔ touch links.** A staff correction neither sets nor clears a link and ⛔ carries one (G10 — corrections are
  recorded after the cut, ⛔ seen by the as-of-cut read). Recorded as a residual: a post-filing correction of a linked rank leaves the link on
  the corrected version only.
- **NE10 — erasure and export. RECOMMEND:** `anonymizeMember` gains an arm that sets every LIVE link (`state = 'live'`) where the member
  is the DECLARER or the NOMINEE to `erased` (`eraseNomineeLinks`, the `eraseKnownPeopleLinks` form — 6.36b erases live links only; an
  already-`ended` row keeps its write-once `ended_at` / `end_reason`, V21). Export (V25 — links hang off VERSIONS, and
  `ProfileSection.nominees[]` comes from the projection with ⛔ version id): ONE new `nomineeLinks: { marked, namedBy }` object in the 6.36b
  `knownPeople: { named, namedBy }` shape — `marked[]` = the declarer's links `{ rank, versionNo, state, answer, askedAt, name|null }`
  (name only when `answer = 'confirmed'`), joinable to `nomineeHistory[]` by `(rank, versionNo)`; `namedBy[]` = "members who named you as
  nominee" `{ state, answer, askedAt, name }` (the declarer's registered name, already shown to them by NE6) — in
  `contracts.ProfileSection` FIRST (G11, TR8). *(PQ2 B variant: the `namedBy[]` half is the PANEL's — it either reveals the silent mark or
  withholds the nominee's own data from their access request; stated in the note's Q2 B cost (v1.2); ⛔ built until ruled.)*
- **NE11 — events and audit. RECOMMEND:** ⛔ events_log change (a link is ⛔ member state; another member's id ⛔ enters a plaintext payload);
  audit lines `member_nominee_links.asked` / `.carried` / `.ended` / `.confirmed` / `.not_me` with `resourceLocator:
  nominee_link:<link_id lower-cased>` and `context: { rank }` only (V18 — `context` is stored ONLY as a SHA-256 hash, `audit.ts`; the
  locator is the one readable resource name; ⛔ number, ⛔ name, ⛔ the other member's id — ⛔ the 6.36b `member:<id>` locator). WHERE
  (V10): the declare's link lines sit BESIDE the existing `member_nominees.declared` emit — after `buildStatus`, guarded by `ok`, before
  the COMMIT in `finally` (the handler's established pattern, ⛔ a new one); the answer endpoint follows 6.36b's handler pattern. The 6.36b
  number fence extended to the nominee and nominee-links modules (its hand-maintained `FILES` list, `known-people-number-fence.test.ts`).
- **NE12 — ⛔ backfill.** Only declarations saved after it ships carry links (`-386` ND9; nothing in production,
  [[project_not_in_production_merge_is_not_golive]]).
- **NE13 — the jobs role.** The link table is read by the select job and both children ⇒ it joins roster Row 26's list (a dated note,
  Task 0.4; ⛔ grant here).
- **NE14 — who else reads the link. RECOMMEND: NOBODY else in this story** — ⛔ payout, nominee determination, claim filing, the claim
  contact ladder (which reads `nomineesStatus()` — hence the link has its OWN read, AC2, V5), the nominee console, the District Admin's
  nominee panel. Each would be a new use (`-384`'s *"any other use"*; PQ1) and is
  deferred (deferred-work, Task 0.4).

## 🏛️ Panel questions — WRITTEN 2026-10-23, SENT and ANSWERED 2026-10-24: `2026-10-24-396` — PQ1 A, PQ2 A (one note, two questions, from the TEMPLATE)

> ✅ *Dated 2026-10-24 (v1.3): the Panel ruled — *"by DR and KB"* / *"Q1 A, Q2 A"* (relayed by BigDev) — recorded as `2026-10-24-396`
> (Trustee-ratified; Dhiraj Rahul, Kalpana Bharti) and transcribed into the note's RULED block. PQ1 and PQ2 are Closed by `-396`. The
> text below is kept as written (the questions as put).*

> *Dated 2026-10-23 (v1.1): the note is WRITTEN at BigDev's request, ahead of Task 0.2 (the 6.36d precedent) — it assumes NE3, NE4, NE6 and NE7 (and, from v1.2, NE5's four-a-day cap)
> as recommended and is revised before sending if BigDev answers otherwise. Its E1 quotes were checked verbatim and its E4 commands run (all
> as expected; the `git grep` for the new table names is EMPTY). ⛔ Sent — ⛔ shown to the Panel until BigDev sends it.*
> *Dated 2026-10-24 (v1.2, the validate pass): the note REVISED in place (still unsent, so ⛔ "as put" yet): the one fact no longer
> promises "whatever number they sign in with" (V6); Q1 A's cost names the stored link (V8); Q1 B names the staff-warning extension
> (V22); Q2 A's cost names the capped typed lookup (V2); Q2 B's cost names the data-access conflict and B × B ≡ C (V7); "you recorded
> this gap" → "our note told you of it" (V24). E4 re-run.*

Written from `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` — §0 first, then the plain-English question, THE ONE
FACT THAT DECIDES IT, options with an honest cost each, evidence LAST — as
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-6-36e-nominee-member-link.md` (date = the day it is written). The
shape precedent is `trustee-panel-routing-note-2026-10-23-6-36d-nominees-not-asked.md`. ⛔ A second note shape; ⛔ a copy of the template.

- **PQ1 — may the Trust record which member account a nominee is, and when does the nominee's answer matter?** The one fact: today the
  Trust can only recognise a nominee by the phone number the member typed; if the nominee signs in on another number they can be one of
  the five asked about the death (`-384`'s own not-covered line) — and the mark closes that only where the member HOLDS the number the
  nominee signs in with (V6). Options (each with its cost):
  **A** — record it when the member marks them; tell the nominee; the mark keeps them out of the five whatever they answer. *Cost: a
  member's account is linked before they have said yes; a wrong pick keeps an uninvolved colleague out until the member fixes it; and it
  STORES a direct link from a nominee to a member's account — which the first check deliberately avoided (V8).*
  **B** — record it, but use it only once the nominee says "Yes, that's me". *Cost: a nominee who never answers, or says "not me" when it is
  them, can still be asked — the gap this row was opened to close stays open for exactly the people with a reason to stay in. Staff are
  also warned when a nominee ANSWERS in the 90 days before the claim — one more reason for the warning ruled at `-384` Q2 A (NE8).*
  **C** — do not link member accounts; keep the number check alone. *Cost: the gap stays; this row is closed unbuilt.*
  **Our reading: A** — the mark is the member's own statement, the same strength as the number they type today (which `-384` Q1 A already
  lets the Trust use without the nominee's yes), and only A cannot be undone by the person it protects against. ⚠ A SUPERSEDES IN PART
  the row note's *"needs the nominee's agreement"* (→ *"the nominee is told and answers"*; ⛔ *"the link waits for a yes"*) in the
  author-commit, citing the PQ1 ruling — a NARROWING of the author's own row note, stated here so it is decided, ⛔ assumed (footgun 57). Counsel's written basis stays a go-live condition either way.
- **PQ2 — what may each side be told?** The one fact: to mark a nominee, the app must tell the member which of their contacts are members
  (ruled for "people who know me" only, `-310` CF5 A), and telling the nominee shows them a choice the member made. Options:
  **A** — both: the member sees which contacts are members (under their own saved names, as CF5 A), the nominee is told in the app and the
  member sees their answer. *Cost: one more purpose for contact matching; a member learns a colleague's answer; a nominee learns they
  were named; and a typed number (the fallback when contacts are refused) still answers "member or not" one number at a time — capped at
  four a day (V2).* **B** — the member sees the matches; the nominee is ⛔ told (a silent mark). *Cost: a member's account is marked
  without their knowledge; ⛔ "not me" can ever reach the member; a nominee who asks for a copy of their own data either learns of the
  mark or receives a copy that leaves it out (V7). ⚠ ⛔ Possible with PQ1 B — a nominee cannot confirm what they are not told; PQ1 B ×
  PQ2 B ≡ PQ1 C.* **C** — ⛔ matching for nominees; the member types the nominee's sign-in number and the server says only "marked" or
  "not found". *Cost: the member must know the other number; a typed number is a guess at someone's membership (`-309`'s concern, one
  number at a time, capped as in A).* **Our reading: A.**

Neither question is about which code is correct. Code (Task 1+) waits for the ruling — PQ1 C (or PQ1 B × PQ2 B) means ⛔ build — unless
BigDev rules at Task 0.2 that it may start on our reading.

**What each ruling does to the build (V7 — so the dev never infers it):**

| Ruling | NE / AC / Task changes |
|---|---|
| PQ1 A + PQ2 A | as written (the recommendation) |
| PQ1 B | NE7: only `answer = 'confirmed' AND responded_at < cut`; NE8 / AC7: the answer joins the staff line (fourth disjunct + legs); AC6's `not_me` leg INVERTED, plus a leg for an unanswered link ⇒ ⛔ excluded; the Policy meaning's B clause; NE6 / AC5 declarer copy *"The mark counts only once they confirm it is them."* |
| PQ2 B (PQ1 A only) | DROP: AC2's request / answer contracts; AC4 entire; AC5's request entry, answer screen and the *Confirmed* / *Said it is not them* labels (the declarer sees only *Marked*); NE11's `.confirmed` / `.not_me`; NE10's `namedBy[]` (the Panel's — see NE10); the `answer` column stays (always NULL) so a later ruling needs ⛔ migration; AC2's `label` is `'marked'` (⛔ `coalesce(answer,'asked')`); the title's "Told in the App" and the Policy meaning's PQ2 A clause fall |
| PQ2 C | NE3's find screen and the contact-matching reuse DROP; `foundBy` = `typed` only; AC5's control is a number field; NE5's counter is the only meter; ⛔ `purpose: 'nominee_link'` |
| PQ1 B × PQ2 B, or PQ1 C | ⛔ build — the row closes unbuilt (a dated note on the row, `-386` ND8 stays as written) |

## Acceptance Criteria

**AC0 — governance before code.** Task 0.2 recorded (NE1–NE14 answered verbatim; the Panel note written, sent and RULED, or BigDev's
explicit word that code may start on our reading); the author-commit committed ALONE (Task 0.3); the records commit after it (Task 0.4).
⛔ `apps/` / `packages/` change before both.

**AC1 — the table (NE1).** Migration `<NNNN>_member-nominee-links.sql` (number per the NUMBERS rule) creates `member_nominee_links` exactly
as NE1 states, with its journal entry; the drizzle schema `packages/domain/src/schema/member_nominee_links.ts` and RLS mirror
`packages/domain/src/policies/member-nominee-links-rls.ts` exported in the barrels. A policy-regression spec
(`packages/domain/tests/integration/rls/member-nominee-links-policy-regression.spec.ts`, the 6.36b / 0119 spec form) asserts: the grants
(twt_app ⛔ DELETE; column-level UPDATE only), ⛔ FOR ALL policy, cross-Pariwar invisibility, every CHECK's `pg_get_constraintdef`, the guard
trigger refusing a backward move (`ended → live`), a second answer, an answer on an ended row and an identity-column change (23000), the
not-self CHECK, the live-link UNIQUE, the BEFORE INSERT version check (a `vacated` version, another rank, another member ⇒ refused); and
the V1 legs: a `confirmed` link and a `not_me` link EACH end (`redeclared`) and EACH erase without error, keeping `answer` /
`responded_at`. The same migration widens `member_daily_counters_counter_check` with `nominee_link_resolve` (LOCKSTEP with
`MEMBER_DAILY_COUNTERS`; that table's policy spec updated). The migration is ⛔
regenerated after it is applied anywhere ([[project_live_db_test_gotchas]]).

**AC2 — contracts.** `NomineeDeclareEntry.memberLink` is OPTIONAL (`z.discriminatedUnion('kind', [{ kind:'new', mobile: MobileNumber, foundBy
}, { kind:'keep', linkId: uuid }])`, both `.strict()`). ⚠ *(v1.2, V5)* `NomineeSummaryEntry` / `NomineeStatusResponse` are ⛔ CHANGED — the
claim flow reads them (G11) and their contract is "NON-PII only". The declarer's marks have their OWN Life-Events-only read: `GET
/api/v1/member/life-events/nominee-links` (`requireMemberSession`) → `NomineeLinksView { links: { rank, linkId, label:
'asked'|'confirmed'|'not_me', name: string|null }[] }` (one per LIVE link on a head version; `name` non-null only when `confirmed`,
decrypted AFTER commit — the 6.36b `names.ts` pattern, ⛔ in `buildStatus`, ⛔ KMS inside the tx). The declare response stays
`NomineeStatusResponse`; the screen refetches the links read after a save. New request / response contracts for the nominee-member's side
(`NomineeLinkRequestView`, the answer body `{ answer: 'yes'|'not_me' }`) in `packages/contracts/src/nominee/member-link.ts`. `pnpm
contracts:emit-openapi` re-run; the determinism check green; `packages/contracts/tests` cover every new strict shape (and a fixture sweep
for any new required response field — [[project_contracts_tests_outside_tsc]]). The api-client gains `createMemberNomineeLinksClient`
(the `createMemberKnownPeopleClient` precedent, `packages/api-client/src/index.ts`), instantiated in a new `apps/mobile/lib/nominee-links-api.ts`
(the `lib/known-people-api.ts` precedent). The contact-matches request gains the optional `purpose` (NE3).

**AC3 — the declare path (NE2, NE4, NE5).** On `POST /api/v1/member/life-events/nominees`, in this order: (1) if any entry is
`kind:'new'` — its own short scoped tx runs the caller gate and charges `nominee_link_resolve` (NE5; refused ⇒ the 422 or 429, ⛔ KMS);
(2) every `kind:'new'` number is normalised (`normalizeMobile`; `null` ⇒ 422 `nominee.link_not_found`) and HMAC'd with ONE
`mobileBlindIndexMany` call BEFORE `openScopeTx` (⛔ KMS inside the scope tx for the link; purpose `nominee_link_resolve` — a house
constant, the purpose is a free string matching `/^[a-z][a-z0-9_]{0,63}$/`); (3) inside the tx, after `lockNomineeDeclarationForEdit`
and the existing guards: `SELECT … FOR UPDATE` of the declarer's live links, the resolution to a member through `knownPersonEligibleSql`
(imported from `../member/known-people.js` directly, ⛔ the member barrel — TR13), the NE5 refusals, the carry / end rules of NE2, the
link rows inserted after `appendMemberDeclarationVersions` (they reference its version ids). On `POST /api/v1/member/nominees` (signup)
a `memberLink` ⇒ 400 `nominee.link_not_available` BEFORE step (1) and nothing is written; a signup-route save WITHOUT `memberLink`
applies NE2's end rules (NE4). Integration legs: new link; keep on the SAME rank (`answer`, `responded_at`, `asked_at` carried, ⛔
re-ask, old row `redeclared`); keep moved to the OTHER rank (ranks swapped) ⇒ carried, ⛔ 409; a rank given a `new` link ends its old
one `redeclared`; re-save without ⇒ `removed_by_declarer`; vacated rank; a `confirmed` link re-saved without ⇒ ended, ⛔ 500 (V1);
stale `keep` ⇒ 409; each NE5 refusal AND a caller-gate refusal is the SAME 422 body; duplicate ⇒ 422; the 5th `kind:'new'` in an IST
day ⇒ 429 and ⛔ `mobileBlindIndexMany` call (V2); an `active-in-grace` declarer's `keep` and plain re-save succeed (V11); signup
route: a `memberLink` ⇒ 400 with ⛔ KMS call, a plain re-save ends a live link; locked declaration ⇒ 409 and ⛔ link row; a rollback
leaves ⛔ link row (a failure injected after the insert); a nominee's answer committed DURING a carry is ⛔ lost (separate connections:
the answer waits on the `FOR UPDATE`, then hits the ended row ⇒ 409, or lands first and is carried).

**AC4 — the nominee-member's side (NE6).** `GET /api/v1/member/nominee-links/requests` (the caller's `live` links — unanswered (`answer IS
NULL`) and answered — keyset-paged; the declarer's registered name decrypted AFTER commit, the 6.36b `names.ts` pattern) and
`POST /api/v1/member/nominee-links/requests/:linkId/answer` (`requireMemberSession`; Idempotency-Key — per-handler,
`idempotency.createKeyedStore`, the 6.36b `known-people/handlers.ts` pattern, ⛔ a plugin; the UPDATE is `WHERE state = 'live' AND
answer IS NULL`, 0 rows ⇒ 409 `nominee_link.request_closed` — a second answer, an ended link, or a declarer named by a claim as
deceased (NE6, V13); another member's link ⇒ 404). The caller is an `active` / `active-in-grace` member ⛔ named by a claim as deceased;
the list omits links whose declarer is `namedByClaimSql`. Module registered in `apps/api/src/server.ts` (the known-people precedent).
⛔ SMS, push or WhatsApp dispatch from the module (a test asserting ⛔ dispatcher call, the 6.36b AC6 form). PQ2 B ⇒ this AC is DROPPED
with the rest of the PQ2 B row (the rulings table above), ⛔ built dark.

**AC5 — the mobile surface (NE3, NE4, NE6).** `NomineeForm` gains, per nominee and on the Life Events screen ONLY (a prop — the signup screen
passes ⛔ it), *"Is this nominee a TWT member? Find them in your contacts"* → a NEW find screen (6.36b's `known-people-find.tsx` is tied
to asking, slots and invites — ⛔ reused; its pure / contacts-only helpers in `lib/known-people.ts` and `lib/known-people-contacts.ts`
ARE) calling the contact-matches endpoint with `purpose: 'nominee_link'` (matched contacts under the member's SAVED names; iOS picker /
Android typed fallback — the typed path is metered by NE5's counter) → pick one → the mark shows on the form; *"Remove mark"*.
**Before the permission prompt** the find screen shows its OWN notice (`nominee_link.note_*`: *to check whether your nominee is a TWT
member*) — ⛔ 6.36b's *"find your colleagues …"* notice, which names a different purpose (V12). **One match per form session** serves
both ranks (NE3). **States, each rendered OUTSIDE any list:** 429 `daily_limit` / `monthly_limit`; 403 `not_available` (the control is
HIDDEN for a caller who is not `active` — V11); zero matches (*"None of your contacts is a member — the number you gave above is still
checked."*); a network error; the match call's 429 `known_people.busy`; ⛔ invite list of non-matches. **Save refusals** (each its own
`nominee_link.*` copy, rendered OUTSIDE any list): 422 `nominee.link_not_found` (ONE message for every reason — TR7), 422
`nominee.link_duplicate`, 409 `nominee.link_stale` (re-load the links read, then re-save), 429 `nominee.link_daily_limit`. **Pre-fill and `keep` (V3 — the form starts EMPTY, G14):** each slot shows
the saved rank's mark from the links read (AC2) and submits `{kind:'keep', linkId}` unless the member taps *Remove mark* or finds again;
editing that slot's name or mobile shows *"Is this still [label]? Keep the mark / Remove it"* before save (a swap of the two nominees
must ⛔ silently carry a mark onto the wrong person). The MMKV draft STORES `memberLink` (incl. `linkId`); an OLD draft lacking it, for
a rank whose links read shows a live link, restores as `keep` — ⛔ as "no mark" (TR9). The copy states G8 plainly: *"If they sign in with
a different number from the one above, this still keeps them out of the people asked about your death."* — the English quoted here and in
NE6 is FINAL; the Hindi drafted by the dev and approved by BigDev (NE6's rule). The saved declaration shows each rank's label (NE6).
`NomineeLinkRequestEntry` on home — AFTER `KnownPeopleRequestEntry`, BEFORE `HomePromptCards` (the My Pool card stays TOPMOST, G14) —
and on the noticeboard; the answer screen in `(life-events)`. The `nominee_link` namespace REGISTERED in `packages/i18n/src/catalog.ts`
(the en / hi imports, the resource maps, `KNOWN_NAMESPACES`; enforced by `packages/i18n/tests/catalog-registration.test.ts`) and
classified in `packages/i18n/locales/classification.json`. Mobile unit tests for the pure helpers and the form's link state — incl. an
unedited re-save sends `keep`, a Remove sends none, an edited slot asks first; RTL `cleanup` and `lib/mmkv` mocked
([[project_mobile_vitest_and_expo_install_traps]]); any list renders its empty / error state OUTSIDE the list
([[project_fabric_flatlist_empty_populated_crash]]); every `router.push` target grepped by hand (TR11).

**AC6 — the exclusion (NE7).** `peerMeshNomineeMatchSql` takes `PeerMeshNomineeMatch`; `nomineeMatch` is REQUIRED on every ND4 type; the
select job, both children and the replacement walk pass it; the `is_nominee` labeller uses the same fragment. Legs (live DB, each a
MUTATION that goes RED when its line is removed): a linked nominee whose login number ≠ the declared number is ⛔ selected, ⛔ texted on
re-check, ⛔ reminded, ⛔ a replacement, labelled `peer_is_nominee`; a link on a version RECORDED AFTER the cut ⇒ ⛔ excluded (V15 — replaces
v1.0's "asked after the cut", which no realistic fixture could turn RED); a link ended before the cut ⇒ ⛔ excluded (the only way a link on a
STILL-projected version ends is erasure — a declare-ended link always sits on a non-projected version — and a real erasure makes one
party `anonymized`, which the predicate's `state = 'active'` conjunct already excludes ⇒ ⛔ realistic fixture exists: the fixture FORGES
an `erased` row (`ended_at` < cut) as the table owner while the nominee stays `active`; say so in the test name); a `not_me` answer before the cut ⇒ STILL excluded (PQ1 A; inverted for B); a link on a NON-projected version
(re-declared without `keep`) ⇒ ⛔ excluded; a carried link (`keep`) on the projected version ⇒ excluded; an empty `memberIds` ⇒ the number
match alone (6.36d legs green, unchanged); the label-coverage leg in `peer-mesh-request.spec.ts` still green. Every fixture G7 lists
compiles against `nomineeMatch`.

**AC7 — the staff line (NE8).** Unchanged for PQ1 A — a leg asserts an answer inside the window does ⛔ set `recent_change_before_filing`
and a linked re-save does. (PQ1 B: the fourth disjunct + its legs.)

**AC8 — erasure and export (NE10).** `anonymizeMember` erases both directions, LIVE links only — an `ended` link keeps its `end_reason`, an
answered link erases without error (the rtbf pin test extended; ⚠ its table-count pin is also raised by 11b.4 — re-base it if 11b.4
lands first); the export carries NE10's `nomineeLinks: { marked, namedBy }` through `ProfileSection` and
`apps/jobs/tests/data-export.test.ts` runs the strict parse with a linked declaration on BOTH sides. *(PQ2 B: `namedBy` ⛔ built until
the Panel rules on it — NE10.)*

**AC9 — fences (NE11).** ⛔ number, name or other member's id in any log, audit or alarm call from the nominee / nominee-link modules (the
6.36b number fence's `FILES` list extended); audit lines carry `resourceLocator: nominee_link:<id>` + `context: { rank }` only; ⛔
events_log payload change; audit names declared as literals of the `AuthAuditEventType` union in `audit-sink.ts` (⚠ 11b.4 also extends
that union — whichever lands second re-bases).

**AC10 — the gates.** `tsc`, ESLint, i18n parity, `ci:local` on a test database (⛔ `:5432`; [[project_prepush_hook_inherits_5432]]);
known reds named, ⛔ hidden ([[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [x] **Task 0 — governance (AC0)** — 0.1–0.3 DONE 2026-10-24; 0.4 DONE 2026-10-24 (ledger `2026-10-24d`). AC0 MET.
  - [x] 0.1 *(2026-10-24: `git fetch origin` — `origin/main` still `1268d47e` = the pin, ⛔ rebase, so G1–G14 hold at the base; NUMBERS
        re-taken across every branch and worktree — highest decision `-395` ⇒ `-396` / `-397` taken; ledger `2026-10-24a` this branch's,
        `2026-10-24b` 11b-4's (committed first, `41ec0862`) ⇒ this records commit `2026-10-24c`; ⛔ `0181` committed anywhere. The 11b.4 overlap re-greps stay OWED at the next rebase onto a moved main.)*
        Preflight: `git fetch origin`; rebase if `origin/main` moved; re-run G1–G14's greps (a sibling can add a reader of the predicate or
        of the nominee tables — grep `peerMeshNomineeMatchSql`, `nomineeMobileIndexes`, `member_nominee_versions`, `known-people`); re-take the
        NUMBERS (decision ≥ `-396` at v1.2, migration `0181` vs 11b.4's `0181`, ledger letter after `2026-10-24a` at v1.2; this story's `al` creation
        line re-letters at its rebase — 11b-4 committed `al` first); re-grep `nomineeMobileIndexes` (G7's list), `anonymizeMember`'s
        table-count pin and `AuthAuditEventType` (11b.4 touches both).
  - [x] 0.2 *(2026-10-24 — BigDev, verbatim: *"NE1-NE14 all recommended"* / *"by DR and KB"* / *"Q1 A, Q2 A"*. NE1–NE14 as recommended;
        the Panel's ruling ⇒ `2026-10-24-396`, transcribed into the note's RULED block. NE6 / NE7 / NE8 / NE10 stand as written for PQ1 A /
        PQ2 A — ⛔ revision needed. The V6 alternative was ⛔ answered ⇒ ⛔ adopted (the default; ⛔ recommended), carried to
        deferred-work at 0.4. ⚠ Which text of the note the trustees saw (v1.1 or v1.2, or a summary) is ⛔ recorded.)*
        BigDev answers NE1–NE14 (recorded VERBATIM here and in the Completion Notes), and the V6 alternative (the phone's contact
        picker on the declared `mobile` field — INSTEAD of, AS WELL AS, or ⛔). The Panel note (PQ1 + PQ2) — ⭐ WRITTEN 2026-10-23 ahead
        of the NE answers (revise it first if they differ from NE3 / NE4 / NE5 / NE6 / NE7) — was written from the
        template (§0 first; E1 quotes re-verified verbatim; E4 commands run) and SENT by BigDev; its ruling transcribed into the note's block
        and into `.decision-log.md` as its own TRUSTEE-RATIFIED entry ([[feedback_shown_to_panel_means_sent]] — "sent" only once it went out).
        Revise NE6 / NE7 / NE8 to the ruling (the PQ1 B variants are already written inline).
  - [x] 0.3 *(2026-10-24 — `2026-10-24-397` committed ALONE as `0f202476`, after `-396` (`44a65afa`); it carries every V8 move below.)*
        The author-commit — the next free decision id, *"AUTHOR-COMMIT (BigDev) — STORY 6.36e's BUILD DECISIONS NE1–NE14 …"*, with §0, the
        §0 re-run table, NE1–NE14 as decided (citing the Panel ruling for PQ1 / PQ2), and (V8): NARROWS IN PART `-386` ND8, effective once
        row 6-36e is `done` on `main` (for linked declarations saved after it ships); SUPERSEDES IN PART `-386` ND2 — the one conjunct
        matches by number OR by a recorded link, and its rejection's JOINABILITY ground gives way for a declarer-marked link (authority:
        the PQ1 ruling) — while ND2's rejection of resolving numbers to member ids AT SELECTION stands; under PQ1 A, SUPERSEDES IN PART
        `-386` Not covered item 1's *"needs the nominee's agreement"* (as the Panel ruled PQ1; ⛔ edited); records the residuals (a wrong
        pick; signup-only declarations unlinked; post-filing corrections; a nominee whose sign-in number the member does ⛔ hold — often a
        family phone (V6); ⛔ login-number change exists, so the AR-24 benefit is prospective). Committed ALONE as `governance: …`; its SHA written
        after ([[project_decision_log_writes_user_inserted]] — if the write is refused, ask once).
  - [x] 0.4 *(2026-10-24, ledger `2026-10-24d` — every record below written, each dated, append-only: `epics.md` `### Story 6.36e`
        (after 6.36d, before 6.37); roster Row 31 leg (j) (ALL NINE → ALL TEN, recount noted; status, evidence, owner, discharge path)
        and a Row 26 dated note (`member_nominee_links` joins the nominee tables); counsel question 7 (WRITTEN, ⛔ sent); `deferred-work.md`
        — dated lines on the family item, the ONLY-link item and the normalisation item, and a NEW section with five items (family-phone
        residual, the picker alternative, the signup prompt, the other readers, the post-filing correction); dated annotations on 6.36d
        (G18, ND8) and 6.36b (AC3 — the second purpose); the sprint row's note. ⛔ Rewritten anywhere.)*
        The records commit (append-only, each dated):
        - `epics.md` — a `### Story 6.36e` entry after Story 6.36d, before 6.37, in 6.36d's form (the *"⚠ Added <date> (Story 6.36e, Task
          0.4)"* blockquote: the row was added by `-386` Not covered / 6.36d Task 0.4, ⛔ by Panel ruling; As a member …; ACs in brief);
        - the sprint row's note (and the `-386` follow-up named done-by-creation, ⛔ "Closed by"); ⚠ the row comment was stale at v1.1
          (still "⛔ written or sent") — a dated v1.2 line was appended by the validate pass's commit (ledger `2026-10-24a`);
        - roster Row 31 — a new leg **(j)** (the nominee member link: the Panel's answers — the new decision id; counsel's WRITTEN basis and a
          privacy-policy line — OPEN; `docs/legal/privacy-policy.md` §3's nominee row lists *"Name, relationship"* only); *"ALL NINE"* →
          *"ALL TEN"* with a dated recount note; roster Row 26 — a dated note (`member_nominee_links` joins the nominee tables the jobs read);
        - the counsel question `counsel-question-2026-10-18-nominee-contact-basis.md` — an added question 7 (written, ⛔ sent);
        - `deferred-work.md` — dated lines on the FAMILY item (narrows further on `done`), on *"Row 6-36d's nominee match is the ONLY
          nominee→member link …"* (a linked declaration survives AR-24), on the 6.36d normalisation item (*"Revisit with the follow-up row"* —
          answered), and NEW items: the signup prompt (NE4 (b)), the other readers (NE14), the post-filing correction residual (NE9),
          the family-phone / unknown-sign-in-number residual (V6), and — if BigDev declines it at Task 0.2 — the V6 contact-picker
          alternative;
        - 6.36d story — a dated annotation on ND8 / G18 (⛔ rewritten); 6.36b story — a dated note that its contact matching has a second
          purpose (per PQ2).
- [ ] **Task 1 — the table (AC1)** — migration (the NE1 two-axis state, the BEFORE INSERT version check, the `nominee_link_resolve` counter
      CHECK widening) + journal + schema + RLS mirror + `MEMBER_DAILY_COUNTERS` + the `NomineeLinkId` brand + barrels + the policy-regression
      spec (incl. the V1 end / erase legs).
- [ ] **Task 2 — the domain (AC3, AC6)**
  - [ ] 2.1 `packages/domain/src/nominee/member-links.ts` — `resolveNomineeLinkTargets` (the `knownPersonEligibleSql` lookup by index, inside
        the caller's tx), `chargeNomineeLinkResolve` (the caller gate + the NE5 counter, its own short tx), `lockLiveNomineeLinks`
        (`FOR UPDATE`, NE2), `writeNomineeLinksForDeclaration` (insert / carry / end per NE2, given the planned versions and the locked
        live links), `listNomineeLinksForMember` (the AC2 links read — ciphertexts only; names decrypted by the handler after commit),
        `listNomineeLinkRequests`, `answerNomineeLinkRequest`, `eraseNomineeLinks` (live only), `getNomineeLinksForExport`; exported
        through the nominee barrel. ⚠ ⛔ import `claim/` from `nominee/` ([[project_type_only_import_cycle_trap]] — the lock lives in
        `claim/` for that reason); import `knownPersonEligibleSql` / `knownPeopleCallerSql` / `namedByClaimSql` from
        `../member/known-people.js` DIRECTLY, ⛔ the member barrel (TR13).
  - [ ] 2.2 `claim/peer-mesh-nominees.ts` — `peerMeshNomineeMatch` + pure `peerMeshNomineeLinkedMembersAsOf`; `claim/peer-mesh-read.ts` —
        `PeerMeshNomineeMatch`, the widened fragment, `nomineeMatch` on every ND4 type; `claim/peer-mesh-request.ts` — the labeller and
        the four inline input types (G7); `claim/peer-mesh-wa-reminder.ts` — `beginPeerMeshWaReminder`'s input.
- [ ] **Task 3 — contracts + API (AC2, AC3, AC4, AC9)** — the declare handler (both routes, the `allowLink` route flag, the charge → HMAC →
      tx order, the signup end rules); the contact-matches `purpose` field; a new module `apps/api/src/modules/nominee-links/` (the AC2 links
      read, the AC4 request list + answer, names-after-commit, per-handler idempotency) REGISTERED in `apps/api/src/server.ts`; audit names
      in the `AuthAuditEventType` union; the number fence's `FILES` list extended; OpenAPI re-emitted; `createMemberNomineeLinksClient`.
- [ ] **Task 4 — jobs (AC6, AC7)** — `runClaimPeerMeshSelect`, `readPeerMeshNomineeIndexes` (defined in the requests child, imported by the
      reminder child) → the match object; the stale-cut check tests `nomineeMatch === null` (it compares the cut, ⛔ values); every G7
      fixture renamed; test fixtures that seed a REAL login blind index where a leg needs a number ≠ link case (6.36d G16); AC7's staff-line
      legs.
- [ ] **Task 5 — mobile (AC5)** — `NomineeForm` link control + prop + pre-fill / `keep` / edit-confirm; the find screen (own notice, one
      match per session, the states); the draft carries `memberLink`; the request entry (home placement per AC5); the answer screen;
      `lib/nominee-links-api.ts`; i18n `nominee_link` hi + en registered in `catalog.ts` + `classification.json`, with the real-`t()` test;
      parity.
- [ ] **Task 6 — erasure + export (AC8)** — `anonymizeMember` arm (live links); `ProfileSection` FIRST (`nomineeLinks: { marked, namedBy }`),
      then `assemble.ts`; the jobs export test.
- [ ] **Task 7 — gates (AC10)** — and the records of the run (Debug Log), the ledger line, File List.

### Review Findings

*(empty — filled by `bmad-code-review`)*

## Dev Notes

### Current state of the code this story changes (traced at `1268d47e`)

- **Declare handler** (`nominee.handlers.ts`, `declare`) — see G3 for the exact order. This story adds: the route flag, the pre-tx
  charge + caller gate (own short tx) and HMAC batch for link numbers (beside the pre-tx `hasFreshElevation` read), the `FOR UPDATE` of
  live links + the link resolution + writes INSIDE the existing tx after `appendMemberDeclarationVersions`, and the signup-route refusal.
  **Preserve:** the D3 advisory lock FIRST; the D9 step-up rule; the split derivation; `member.nominees_declared` and its payload
  byte-for-byte; the audit's position (after `buildStatus`, guarded by `ok`, before the COMMIT in `finally` — G3); `buildStatus` and
  `NomineeStatusResponse` unchanged (the claim flow reads them — G11); the 409 vocabulary.
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
  more than: "even if they sign in on a different number from the one you gave for them" (v1.2, V6 — ⛔ "whatever number": a nominee
  whose sign-in number the member does ⛔ hold cannot be marked). ⛔ Claim the link improves contact or payout.
- **TR2 — append-only versions.** ⛔ ALTER `member_nominee_versions` (G2). The link table references versions; the versions never reference links.
- **TR3 — FK actions.** `version_id` → versions NO ACTION: versions are deleted ONLY by the `members` cascade (the 0119 DELETE exemption at
  `pg_trigger_depth() > 1`), which also cascades the link through `declarer_member_id`, and NO ACTION is checked at statement end ⇒ the
  cascade succeeds. ⛔ SET NULL — it would UPDATE the LINK row (⛔ a version, so the 0119 trigger never runs), and NE1's own guard refuses a
  `version_id` change. *(v1.2, V17: v1.0 gave the wrong reason.)* `declarer_member_id` / `nominee_member_id` → `members` cascade (the 0162
  precedent — members are soft-deleted, so erasure goes through `anonymizeMember`, ⛔ the FK).
- **TR4 — one fragment.** If the gate and the label do not share `peerMeshNomineeMatchSql`, a link-only match falls to `peer_not_eligible`
  and the label-coverage spec goes red — ⛔ "fix" the spec.
- **TR5 — `uuid[]` parameter.** `sql.param([...ids])::uuid[]` with an EMPTY array must match nothing — `peerMeshNomineeMatchSql` does ⛔
  return early, it renders `= ANY('{}'::text[])` via `sql.param` (the early-return site is `matchedContactPositions`; v1.0 had it
  backwards — V16); a leg with `memberIds: []`.
- **TR6 — KMS outside the tx.** The link numbers' HMACs run before `openScopeTx` (the jobs-pool / API-pool starvation and the per-HMAC audit
  lock — [[project_kms_audit_per_hmac_global_lock]], [[project_jobs_pool_two_connection_starvation]]); ONE batch call.
- **TR7 — withholding is uniform.** One 422 for every NE5 failure ([[feedback_withholding_must_be_uniform]]); the registered name only after
  `confirmed`; ⛔ the declarer learns WHY a link failed.
- **TR8 — strict parses.** Export sections (G11) and the api-client's response parse — the contract changes FIRST.
- **TR9 — the old draft.** An MMKV draft written before this story has ⛔ `memberLink`. ⚠ *(v1.2, V3 — v1.0 said "read it as no mark",
  which silently ENDS a live link `removed_by_declarer` on save)*: for a rank whose links read (AC2) shows a live link, restore it as
  `keep`; only a rank with ⛔ live link restores as "no mark". New drafts store `memberLink` (incl. `linkId`).
- **TR10 — markdown in JSDoc.** `**cl.3**`-style emphasis inside a `/** … */` can close it ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR11 — typed routes in a worktree.** ⛔ `.expo/types` ⇒ `tsc` does ⛔ check `Href` for the new screens ([[project_mobile_typed_routes_worktree]]) —
  grep every `router.push` target by hand.
- **TR12 — TanStack.** A per-row answer uses a per-call `mutateAsync` ([[project_tanstack_mutate_callbacks_latest_only]]); ⛔ `reset()` in
  `onSettled` wipes the banner ([[project_tanstack_onsettled_before_success]]).
- **TR13 — the import guard (V19).** `member/lock-in-gate.ts` imports `nominee/` ⇒ `nominee/member-links.ts` imports
  `../member/known-people.js` DIRECTLY, ⛔ the member barrel (a runtime init cycle `tsc` cannot see — [[project_type_only_import_cycle_trap]]).
- **TR14 — the unmetered oracle (V2).** Any path where a client-supplied number gets a "member / not a member" answer must be CHARGED
  before the HMAC and gated before the charge — the declare's `kind:'new'` included. A refused request costs ⛔ KMS call.
- **TR15 — the claim flow reads the nominee status (V5).** ⛔ add a field to `NomineeStatusResponse` / `NomineeSummaryEntry`; the link has
  its own read.

### Testing standards

Live-DB integration on a TEST database (`:5433` / `:5434`, ⛔ `:5432`); separate transactions where `now()` ordering matters
([[project_db_clock_ordering_tests_tie]]); every exclusion leg is a mutation (RED when its line is removed, recorded in the Debug Log);
the policy-regression spec for the new table; contracts vitest; mobile vitest with RTL `cleanup`; `ci:local` before push.

### Project Structure Notes

New: `packages/domain/migrations/<NNNN>_member-nominee-links.sql`, `packages/domain/src/schema/member_nominee_links.ts`,
`packages/domain/src/policies/member-nominee-links-rls.ts`, `packages/domain/src/nominee/member-links.ts`, `apps/api/src/modules/nominee-links/`,
`packages/contracts/src/nominee/member-link.ts`, `packages/i18n/locales/{en,hi}/nominee_link.json`, `apps/mobile/lib/nominee-links-api.ts`,
mobile screens under `apps/mobile/app/(life-events)/` and a component under `apps/mobile/components/nominee-link/`. Updated: the files named
in G3, G4 (the contact-matches `purpose`), G7 (incl. every fixture), G11, G14; `apps/api/src/server.ts`; `packages/i18n/src/catalog.ts`
and `locales/classification.json`; `packages/domain/src/ids/index.ts`; `schema/member_daily_counters.ts`; `audit-sink.ts`;
`packages/api-client/src/index.ts`; the number-fence test.

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
- 2026-10-23 — v1.1: the Panel routing note WRITTEN (BigDev: *"yes commit and write the panel note"*), ⛔ sent.
- 2026-10-24 — v1.2: VALIDATED by `bmad-create-story validate 6.36e` at `6c24441f` (code = `1268d47e`): four parallel read-only verifiers
  (code claims, mechanism, governance, premise / reuse / clarity) — 60 raw findings, 26 consolidated (V1–V26: 1 CRITICAL, 9 HIGH, 15 MED,
  1 LOW-bundle); BigDev: *"all"*. Load-bearing code claims re-checked by hand (the audit before COMMIT, the claim-flow readers of
  `nomineesStatus()`, `planDeclarationVersions` writing every submitted rank, 0162's answer-window CHECK). The Panel note revised in
  place (still unsent). Then ONE fresh-context re-validator of the pass's own edits: 9 defects (2 HIGH — an AC6 fixture no realistic
  data can build, a records line claiming a sprint-status append not yet made), all applied. ⛔ Code; ⛔ decision id taken.
- 2026-10-24 — v1.3: Task 0.2 answered — BigDev, verbatim: *"NE1-NE14 all recommended"* / *"by DR and KB"* / *"Q1 A, Q2 A"*. Recorded:
  `2026-10-24-396` TRUSTEE-RATIFIED (Q1 A, Q2 A; committed alone `44a65afa`); `2026-10-24-397` AUTHOR-COMMIT (NE1–NE14 as recommended;
  committed alone `0f202476`); the note's RULED block; ledger `2026-10-24c`. The V6 picker alternative ⛔ adopted (⛔ answered; the
  default). ⛔ Code. Next: Task 0.4.
- 2026-10-24 — v1.4: Task 0.4 DONE (BigDev: *"yes, do it"*) — the records commit, ledger `2026-10-24d` (`a`/`c` this branch's, `b`
  11b-4's). AC0 MET. ⛔ Code. Next: Task 1.

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-24 | 1.4 | Task 0.4 DONE (BigDev *"yes, do it"*): `epics.md` `### Story 6.36e`; roster Row 31 leg (j) (ALL TEN) + Row 26 note; counsel question 7; `deferred-work.md` dated lines + a new section (five items); 6.36d (G18, ND8) and 6.36b (AC3) dated annotations; the sprint row note; ledger `2026-10-24d`. AC0 MET; next Task 1. |
| 2026-10-24 | 1.3 | Tasks 0.1–0.3 DONE: BigDev *"NE1-NE14 all recommended"*; the Panel ruled *"Q1 A, Q2 A"* (*"by DR and KB"*) ⇒ `2026-10-24-396` (Trustee-ratified, `44a65afa`) + `2026-10-24-397` (author-commit, `0f202476`), each committed alone; the note's RULED block filled; the PQ section dated; ledger `2026-10-24c` (`b` is 11b-4's, committed first). Status ready-for-dev; next Task 0.4. |
| 2026-10-24 | 1.2 | VALIDATED (`bmad-create-story validate 6.36e`; BigDev *"all"*): **V1** NE1's state split into `answer` × `state` (an answered link could never end or erase), `asked_at` explicit / carried, ⛔ 0162's CHECKs; **V2** a metered caller-gated `nominee_link_resolve` counter (4/day) BEFORE the HMAC (the declare was a free membership oracle); **V3** pre-fill + `keep` + edit-confirm, the draft carries the link, TR9 inverted; **V4** NE2's end rules (`FOR UPDATE` every live link, `keep` across ranks, every un-carried link ends, a raced answer is ⛔ lost); **V5** the link gets its OWN read — `NomineeStatusResponse` is read by the claim flow and is NON-PII; **V6** the premise narrowed (family phone, AR-24 unbuilt), the title, the cheaper picker alternative put to BigDev; **V7** a rulings → build table for every PQ outcome (PQ1 B × PQ2 B ≡ C); **V8** SUPERSEDES IN PART `-386` ND2 and Not covered item 1, ND8 "to be narrowed once done"; **V9** NUMBERS (≥ `-396`; `al` is 11b-4's; ≥ `aq`; 11b.4's rtbf count + audit union); **V10** G3's audit order; **V11** caller gate on `kind:'new'` only; **V12** one match per session, own notice, states, `purpose`; **V13** request closes on the declarer's death; **V14** consequence copy both sides; **V15** NE7 by projected version, AC6 legs; **V16** G7's five inline types + fixtures, TR5, stale check; **V17** TR3's reason; **V18** audit locator / context; **V19** wiring (i18n catalog, server.ts, api-client, fence, idempotency, brand, TR13); **V20** route flag, signup end rules; **V21** BEFORE INSERT version check, erase live only; **V22** CF5 "as put" quote, `-356` (ii) unratified, §0 rows for `-234` X / the meter / NE8 B; **V23** AI-10-1 one sentence each predicate, Niyamavali §6.3; **V24** the note's "you recorded this gap" → "our note told you of it"; **V25** export `nomineeLinks: { marked, namedBy }`; **V26** stale / loose text. The Panel note revised (still ⛔ sent). |
| 2026-10-23 | 1.1 | The Panel note WRITTEN (BigDev: *"yes commit and write the panel note"*): `trustee-panel-routing-note-2026-10-23-6-36e-nominee-member-link.md` — Q1 (record the account; when the answer counts — A / B / C), Q2 (what each side is told — A / B / C); our reading A, A; E1 checked verbatim, E4 run; ⛔ sent. Ledger `2026-10-23am`. |
| 2026-10-23 | 1.0 | Created (`bmad-create-story 6.36e`): G1–G14, NE1–NE14 PROPOSED, PQ1 / PQ2 OWED, AC0–AC10, Tasks 0–7. Status ready-for-dev; ⛔ code. |
