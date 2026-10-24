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

Status: review

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
*(Dated 2026-10-24, `2026-10-24-401`: the two sentences above are the INTERNAL record of the policy, stated in the member's terms for the AI-10-1 gate — they are ⛔ shown in the app. The screens say ⛔ that the Trust asks members about a death.)*
**The export, in the marked member's terms (code review `-399`; round 3):** *"When you ask for your data, a mark that names you shows the
name of the member who made it only while the app would show you that request. Once it has left your list — they removed it or were
erased, or a claim names them — or while your own membership has lapsed, it is listed as ended, with no name; it reads as live again,
with the name, when you renew."*

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

**TWO MORE predicates gate who may USE the feature — stated by the 2026-10-24 code review (family 11; the first draft named only the
target side), and CORRECTED by its fix-diff round: the first wording of the caller-gate sentence was FALSE for a member a claim names.**
*The caller gate (NE5 — `isKnownPeopleCaller`: `active` ONLY, ⛔ named by any claim):* **In the member's terms:** *"You can ADD a new
mark only while your membership is fully active and no claim has ever named you. In renewal grace you can still keep or remove a mark
you already have and still save your nominees, but you cannot add one (the app then simply says the nominee could not be found). If a
claim names you, your nominee declaration is LOCKED — every save is refused, keeping or removing a mark included — until an innocence
finding releases it, and even then you cannot add a mark."* Checked against the Niyamavali: §2.4 (*"Each member declares one or two
nominees at signup or via Life Events"*) is ⛔ restricted — this gates only the MARK, never the declaration (the lock is 6.20's D3) ⇒ ⛔
conflict; the cost for a member wrongly reported dead is `-333` D1's, recorded there.
*The answerer gate (NE6 — `nomineeLinkAnswererSql`: `active` or `active-in-grace`, ⛔ named by any claim):* **In the member's terms:**
*"You can see and answer a mark naming you for as long as you could have been marked — in grace too. If a claim names the member who
marked you, their mark is no longer shown to you and cannot be answered; if a claim names YOU, nothing is shown to you."* It gates a ⛔
benefit: it decides only whether a card is shown and an answer taken, and the mark keeps you out of the five whatever the card says
(`-396` Q1 A). **What is pinned:** the caller gate by the `active-in-grace` declarer's refusal (TR7 — RED when the gate is ⛔
enforced); the claim-named half of it is ⛔ reachable through the route without an innocence finding and is ⛔ TESTED. The answerer
gate by the grace answerer (RED when narrowed to `active`) and by the claim-named DECLARER's request (V13); "a claim names YOU ⇒ nothing
is shown" is the gate's SQL, ⛔ a test of its own.

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
  *Dated 2026-10-24 (fix-diff review): a `new` mark of the member ALREADY live on the SAME rank (a re-pick, or a retried save whose response
  was lost) is planned as a CARRY of that link — the answer and `asked_at` stay and nobody is asked again — ⛔ the rank's old link ended
  `redeclared` and a fresh one asked. On the OTHER rank the same member is still `duplicate`. Costs, recorded: (1) the quota unit for that
  `new` mark is ⛔ saved — the metering transaction charges it BEFORE the plan; (2) re-picking a member who ANSWERED (`not_me` /
  `confirmed`) gives that answer back — to ask again, the declarer removes the mark, saves, and marks again; the pre-save line says
  "…unless they have already answered". The rule's tests: `member-links.test.ts` (plan), `member-links.spec.ts`, and the concurrent
  saves in `nominee-member-link.spec.ts` (RED on the old planner).*
  *Dated 2026-10-24 (fix-diff review, round 3 + 4): WIDENED and SUPERSEDING the note above — a `new` mark of a member ALREADY live on
  ANY rank is a CARRY to the rank it is submitted on (a re-pick, a retried save, or a MOVE of the mark between ranks): ⛔ "on the OTHER
  rank the same member is still `duplicate`" any more. Two `new` marks of ONE member in one save still plan two carries of one link ⇒
  `duplicate`; so does a `keep` of the link on one rank beside a `new` of the same member on the other. A member is live on at most
  one rank, so the planner makes ONE lookup. The pre-save line (`form.will_ask*`, en + hi) no longer says "…unless they have already
  answered" in general: it reads "A member who has already answered this same mark is not asked again" — a member whose earlier mark
  ENDED is asked again. Tests: `member-links.test.ts` (a move; a move beside a new member; the duplicate) and `member-links.spec.ts`
  (the moved mark keeps the answer and `asked_at`). ⚠ NE2's "ends `redeclared` when its rank is … given a `new` link" is changed by
  this and by the same-rank note above BY DATED NOTE ONLY — no decision-log entry; `deferred-work.md` (round 3) carries the
  author-commit `-400` it would need.*
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
  *Dated 2026-10-24 (code review): the offer of the picked number as the declared `mobile` when it is empty was ticked done in Task 5
  ⛔ without being built (the review found it by grep) — it is now built in `applyPick` (ten digits, editable, confirmed for the slot). The
  match call goes through `matchContactsForNominee`, the ONE place `purpose: 'nominee_link'` is set (pinned by
  `nominee-link-match-purpose.test.ts`).*
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
  *Dated 2026-10-24 (code review): the meter's own transaction now asks the cheap refusals FIRST — a claim-locked declaration, a terminal
  state, a missing `nominee_change` step-up — and an unusable number is refused before it; ⛔ any of them is charged. (The OTP retry after
  a step-up used to charge a second time, spending the "one retry each" the 4 a day is budgeted for.)*
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
  *Dated 2026-10-24 (BigDev, on the device run; ⭐ [`2026-10-24-401`](../../.decision-log.md#decision-2026-10-24-401) — committed ALONE as `ab154cbe`, BEFORE the copy change; `-397` is ⛔ edited): the **consequence sentences of V14 are REMOVED** — the nominee's *"While this stands, you will not be asked about [Name]'s death."* (`request.consequence*`) and the declarer's `form.why` — with NO replacement, and a test pins that no string of the namespace mentions a death. Reason (BigDev): the Trust must not tell members that their chosen neighbours will be asked after a death — a group could use the exclusion rule to steer who is asked. Every `-396` Q2 A disclosure stays (the marked member is told in the app that they were named and marked, answers, and the declarer sees the answer). ⚠ Left in, flagged: the declarer's `label.not_me_note` (*"The mark still counts until you remove it or pick again."*).*
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
  *Dated 2026-10-24 (code review): the export's rule is `2026-10-24-399` (BigDev, option A — it extends `-333` call 3(a) and `-334` call 1 to
  these lists; `-397` is ⛔ edited): an erased link reads `ended`; `namedBy[]` carries the declarer's name ONLY on a row the app lists (a
  `live` mark whose declarer no claim names) and every other row reads `ended` with ⛔ name; a mark carried through re-saves is ONE
  `namedBy[]` row. The code comment's "Every state" is superseded. Residual, RULED for 6.36b by `2026-10-15-335` call 2 (BigDev, option A —
  recorded; hiding names on every ended row was rejected because it strips names a member DID see, of people never erased) and carried
  here because `-399` extends `-333` / `-334` as `-335` clarified them: an erased nominee's confirmed `marked[]` row has no name where a
  removed one has.*
  *Dated 2026-10-24 (fix-diff review, round 3): that carry-over to 6.36e is the AUTHOR'S INFERENCE — `-335` ruled the residual for 6.36b's
  lists; `-399` (an author-commit) is what extends it — ⛔ a ratified ruling. And `namedBy[]` also reads `ended`, ⛔ name, for a member
  whose membership has LAPSED (the app lists them no request) until they renew, when the same row reads `live`, with the name — `-399`
  call 2's principal clause (*"only on a row the app lists to the marked member"*) read literally — its enumerated rows (removed or
  corrected, an erased declarer, a claim-named declarer) do not name a lapsed viewer; round 4 corrected the wording "as written"
  (BigDev, round 3: *"1"* — keep it, and say it).*
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
*Dated 2026-10-24 (code review): "that table's policy spec updated" is met ⛔ literally — `member-known-people-policy-regression.spec.ts` is
unchanged (it probes `'sms'` only and still passes); the counter CHECK's lockstep and the charge are asserted in the NEW
`member-nominee-links-policy-regression.spec.ts`.*

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
*Dated 2026-10-24 (round 4): the "keep on the OTHER rank ⇒ carried" leg above is joined by a `new` mark of a member live on the other rank ⇒
carried too (NE2, widened); and `duplicate` is the SAME member on both ranks after resolution, ⛔ merely "live on the other rank".*
*Dated 2026-10-24 (fix-diff review): the ORDER above is now — normalise every `kind:'new'` number (an unusable one ⇒ the 422, ⛔ charged);
look up the `nominee_change` elevation; the metering transaction asks the cheap refusals FIRST (`guardDeclare`: the D3 lock, a
claim-locked declaration ⇒ 409, a terminal state ⇒ 409, a missing step-up ⇒ 403) and only then runs the caller gate and charges; then
the ONE HMAC batch; then the main transaction asks `guardDeclare` again (authoritatively) before the link work. None of the early
refusals is charged, and the OTP retry after a step-up charges ONCE. Task 3, the Dev Notes and the Debug Log describe the earlier order
(charge → HMAC) and are kept as written.*

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

*Dated 2026-10-24 (`2026-10-24-401`): AC5's two consequence lines — the declarer's `form.why` and the marked member's `request.consequence*` — are REMOVED, in both languages (81 → 78 keys); the requests screen shows the question, "[Name] will see your answer.", the name note, Yes / No, and the answered line, and the nominee form shows the mark label, the pre-save line (the nominee is asked whether it is THEM), *Find…*, *Pick a different member*, *Remove mark*. Tests: `nominee-link-copy.test.ts` (an absence test over the catalogue, en + hi), the form and requests render specs (a death-word guard on the screens).*

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
*Dated 2026-10-24 (code review): the export's shape is `2026-10-24-399`'s (see NE10); `apps/jobs/tests/data-export.test.ts` also parses an
erased declarer's mark (`ended`, ⛔ name, ⛔ the word `erased`).*
*Dated 2026-10-24 (round 3): a member whose membership has lapsed exports an inbound mark as `ended`, ⛔ name, until they renew
(`-399` call 2's principal clause, read literally); `packages/domain/tests/integration/nominee/member-links.spec.ts` pins it both ways (lapsed, then renewed).*

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
- [x] **Task 1 — the table (AC1)** *(2026-10-24: migration `0181_member-nominee-links` — ⛔ committed anywhere before; the policy spec 19 / 19 on a FRESH `twt_6_36e` (:5434))* — migration (the NE1 two-axis state, the BEFORE INSERT version check, the `nominee_link_resolve` counter
      CHECK widening) + journal + schema + RLS mirror + `MEMBER_DAILY_COUNTERS` + the `NomineeLinkId` brand + barrels + the policy-regression
      spec (incl. the V1 end / erase legs).
- [x] **Task 2 — the domain (AC3, AC6)** *(2026-10-24 — domain suite 6,229 / 6,230 then the one red (a fixture's double clock read) fixed and green alone; see Debug Log)*
  - [x] 2.1 `packages/domain/src/nominee/member-links.ts` — `resolveNomineeLinkTargets` (the `knownPersonEligibleSql` lookup by index, inside
        the caller's tx), `chargeNomineeLinkResolve` (the caller gate + the NE5 counter, its own short tx), `lockLiveNomineeLinks`
        (`FOR UPDATE`, NE2), `writeNomineeLinksForDeclaration` (insert / carry / end per NE2, given the planned versions and the locked
        live links), `listNomineeLinksForMember` (the AC2 links read — ciphertexts only; names decrypted by the handler after commit),
        `listNomineeLinkRequests`, `answerNomineeLinkRequest`, `eraseNomineeLinks` (live only), `getNomineeLinksForExport`; exported
        through the nominee barrel. ⚠ ⛔ import `claim/` from `nominee/` ([[project_type_only_import_cycle_trap]] — the lock lives in
        `claim/` for that reason); import `knownPersonEligibleSql` / `knownPeopleCallerSql` / `namedByClaimSql` from
        `../member/known-people.js` DIRECTLY, ⛔ the member barrel (TR13).
  - [x] 2.2 `claim/peer-mesh-nominees.ts` — `peerMeshNomineeMatch` + pure `peerMeshNomineeLinkedMembersAsOf`; `claim/peer-mesh-read.ts` —
        `PeerMeshNomineeMatch`, the widened fragment, `nomineeMatch` on every ND4 type; `claim/peer-mesh-request.ts` — the labeller and
        the four inline input types (G7); `claim/peer-mesh-wa-reminder.ts` — `beginPeerMeshWaReminder`'s input.
- [x] **Task 3 — contracts + API (AC2, AC3, AC4, AC9)** *(2026-10-24 — the API spec 16 / 16 on `twt_6_36e`; two mutants RED; see Debug Log)* — the declare handler (both routes, the `allowLink` route flag, the charge → HMAC →
      tx order, the signup end rules); the contact-matches `purpose` field; a new module `apps/api/src/modules/nominee-links/` (the AC2 links
      read, the AC4 request list + answer, names-after-commit, per-handler idempotency) REGISTERED in `apps/api/src/server.ts`; audit names
      in the `AuthAuditEventType` union; the number fence's `FILES` list extended; OpenAPI re-emitted; `createMemberNomineeLinksClient`.
- [x] **Task 4 — jobs (AC6, AC7)** *(2026-10-24: DONE — the three jobs live legs (select, request child, reminder child) 3 / 3 and RED under the `memberIds` mutant; the AC6 / AC7 domain legs landed with Task 2. Earlier: the RENAME half done with Task 2 so every commit builds — `readPeerMeshNomineeIndexes` → `readPeerMeshNomineeMatch`, `nomineeMatch` through the select job and both children, the jobs / api fixtures, and the 6.31 hash fence's `peer-mesh-wa-reminder.ts` pin re-taken (rename-only, dated note). The jobs' live legs remain.)* — `runClaimPeerMeshSelect`, `readPeerMeshNomineeIndexes` (defined in the requests child, imported by the
      reminder child) → the match object; the stale-cut check tests `nomineeMatch === null` (it compares the cut, ⛔ values); every G7
      fixture renamed; test fixtures that seed a REAL login blind index where a leg needs a number ≠ link case (6.36d G16); AC7's staff-line
      legs.
- [x] **Task 5 — mobile (AC5)** *(2026-10-24 — mobile 1,407 / 1,407; i18n 122 / 122 + parity; ⚠ the Hindi AWAITS BigDev's approval — see Completion Notes)* — `NomineeForm` link control + prop + pre-fill / `keep` / edit-confirm; the find screen (own notice, one
      match per session, the states); the draft carries `memberLink`; the request entry (home placement per AC5); the answer screen;
      `lib/nominee-links-api.ts`; i18n `nominee_link` hi + en registered in `catalog.ts` + `classification.json`, with the real-`t()` test;
      parity.
- [x] **Task 6 — erasure + export (AC8)** *(2026-10-24 — rtbf pin 22 / 22 (raised 26 → 27 statements, 23 → 24 tables); jobs export 4 / 4)* — `anonymizeMember` arm (live links); `ProfileSection` FIRST (`nomineeLinks: { marked, namedBy }`),
      then `assemble.ts`; the jobs export test.
- [x] **Task 7 — gates (AC10)** *(2026-10-24 — `ci:local` on `twt_6_36e` (:5434): 34 / 36 jobs first run; the two reds resolved — see Debug Log)* — and the records of the run (Debug Log), the ledger line, File List.

### Review Findings

Code review 2026-10-24 (`bmad-code-review 6.36e`) — branch `story/6-36e-nominee-member-link-at-declaration` at `dc7a8aeb`, diff `1268d47e..dc7a8aeb` (the
story's `baseline_commit`; `main` has since moved 16 commits, so a rebase is owed before landing — it is not part of this review): 89 files, +7048 / −160.
Reviewed in three chunks — (1) `packages/domain` + `packages/contracts`, (2) `apps/api` + `apps/jobs` + `packages/api-client` + `openapi/v1.yaml`, (3)
`apps/mobile` + `packages/i18n` — each by three layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor): nine agents, all read-only, run in parallel. The
records half (~1,500 lines: this story, `-396`, `-397`, the Panel note, the ledgers) was the Auditors' spec, not a chunk. The Blind Hunters read their diff from
a file (1,800–3,600 lines) rather than inline and were told to read nothing else. 99 raw findings → 1 `decision-needed` (resolved the same day to a `patch`: BigDev, option A) + 16 `patch`
+ 9 `defer` after merging and verification (a tenth was added while applying the patches); 11 dismissed. **VERIFIED** = the triager re-read it against the tree at `dc7a8aeb`; **REPORTED** = it rests on a layer's trace only.
Panel gate (§0) was applied to both items the Auditors labelled `POSSIBLE decision_needed`: the export (decision 1) is BigDev's under `-333`'s own §0 line, not
the Panel's; the "nobody is told" copy (patch 8) is already answered by `-396` Q2 A (the marked member IS told, in the app), so it is copy to correct. Nothing
here is a Panel question. No code was changed by the review.

- [x] [Review][Patch] **(from decision 1 — RESOLVED 2026-10-24: BigDev chose option A, *"1"*; the author-commit entry is owed first and commits ALONE, before this fix)** The data export tells a member more about another member than the app showed them — an erasure, a removed or corrected mark, a claim-hidden declarer, and the declarer's re-save count — and NE10's words and `-333` / `-334` point opposite ways [packages/domain/src/data-export/assemble.ts:418-436, packages/contracts/src/data-export/data-export.ts `NomineeLinkExportFields`] — MED (privacy; checklist family 6). VERIFIED; three layers (Blind c1, Edge c1, Auditor c1).
      What the code does: `marked[]` and `namedBy[]` pass `state: l.state` raw, so `erased` is exported when the other member was RTBF-erased; `namedBy[]` resolves the declarer's name for EVERY row, but the app (`listNomineeLinkRequests`) lists only `live` links whose declarer no claim names — so for a mark that was removed or corrected within minutes (`removed_by_declarer` / `redeclared`), or whose declarer is erased or claim-named, the marked member never saw the name; and a mark carried through N re-saves exports N + 1 `namedBy` rows (live + N ended), telling the marked member how many times the declarer re-saved. The code comment says "Every state"; NE10 (`-397`, as recommended) says "in the 6.36b `knownPeople` shape" and the declarer's name is "already shown to them by NE6". 6.36b ruled the sibling lists the other way, twice: `-333` call 3(a) (an erasure-ended link reads `ended`, never `erased`) and `-334` call 1 (a "named you" request that left the list for a reason that is not the member's own act reads `ended`, no name, no end date). Tests cover live rows only (`apps/jobs/tests/data-export.test.ts`; `member-links.spec.ts` asserts `[['ended', a], ['live', a]]` and nothing about erased / claim-hidden).
      Gate result: not the Panel's. `-333`'s §0 line: "each call REMOVES a signal one member could read about another … ⛔ nothing a member, a family or a nominee is owed changes … the keep-as-built option … would have gone to the Panel — ⛔ chosen". Withholding is the author's call; disclosing more would be the Panel's. Bare sentence: *may a member's own data export say that someone who named them has since removed the mark or erased their account, and name that person, for a mark their app no longer shows?*
      Options. **A (recommended)** — extend `-333` call 3(a) and `-334` call 1 to 6.36e's lists: `erased` reads `ended` on both; `namedBy` shows the declarer's name only on a `live` row the app lists, and an ended / erased / claim-hidden row reads `ended` with no name; a carry chain exports as one row. Cost: the export drops a name a marked member may have seen in the app before the mark ended (the same cost `-334` recorded), and counsel may yet read the right of access as owing the raw record (roster Row 31, assumed). Needs an author-commit entry BEFORE the fix, and a contract change (`erased` leaves the state enum). **B** — keep as built. Cost: contradicts the standing `-333` / `-334` rule, tells a member that another member erased their account or removed a mark, shows the re-save count, and would itself go to the Panel as new disclosure. **C** — map `erased` → `ended` only (state, not names). Cost: still names a declarer for a request the member never saw, and still exposes the re-save count.
      **APPLIED** — `shapeNomineeLinkExport` (PURE) holds the rule; `getNomineeLinksForExport` reads `listed` (a `live` mark whose declarer no claim names) and the carry chain; the contract's state enum is `live | ended` and an `ended` `namedBy[]` row carries ⛔ name; `assemble.ts` resolves a name only where `nameSeen`, memoised per member. Tests: 5 unit (`shapeNomineeLinkExport`), 2 live in `member-links.spec.ts` (1 updated), the contract, and the jobs strict-parse build with an erased declarer. Residual stated in NE10.

- [x] [Review][Patch] The "Is this still [label]?" guard (V3) is lost whenever the form remounts, so a mark can ride onto a different person [apps/mobile/components/life-events/NomineeForm.tsx:112, apps/mobile/app/(life-events)/nominees.tsx:71-90,147-157,176-182, apps/mobile/lib/nominee-links.ts:38-46] — HIGH. VERIFIED; three layers (Blind c3, Edge c3, Auditor c3). `questions` is plain `useState([false, false])` inside `NomineeForm`; the draft stores the edited name and `memberLink: keep` but not the open question; every `remountWith` (a pick, a 409 `link_stale` reload, `onContinueDraft`) bumps `formKey` and rebuilds the form with every question closed, so the Save gate (`questions.some(open)`) has nothing to block. Reachable: mark rank 1 → edit its name (the question opens) → Find on rank 2 → pick → return → Save sends `{kind:'keep', linkId}` for a slot that now names someone else, and the server carries a `keep` without re-checking identity (`planNomineeLinks`: "A keep does not re-run eligibility"). Same root: `reconcileMarks` reads `memberLink === undefined` as "pre-story draft" and attaches the rank's live link, but `addSecond` (`EMPTY` has no `memberLink`) also produces `undefined` — remove slot 2, add another nominee, then a stale reload or a draft resume pins the old rank-2 mark on the new person; and a stale reload swaps a dead `keep` for the rank's CURRENT link under the old name. This is TR9 / AC5's named trap. Fix: keep a name + mobile fingerprint in the `keep` mark and re-open the question on any remount where the slot differs from it; give a brand-new slot an explicit `memberLink: null`; add a test that remounts a form with an edited marked slot (`nominee-form-link-render.test.ts` mounts once).
      **APPLIED** — the question is DERIVED: every mark carries `confirmedFor` (the slot fingerprint it was last confirmed for), `markNeedsQuestion` / `confirmMark`, ⛔ component state; a stale-replaced `keep` and a typed pre-story draft ASK; `addSecond` writes `memberLink: null`; `applyPick` confirms for the slot. The render test unmounts after an edit and remounts with what the form reported (RED with the derivation disabled; RED with `addSecond` undefined).
- [x] [Review][Patch] The 4-a-day mark quota is charged and COMMITTED before every cheap refusal, and the step-up round trip charges it twice [apps/api/src/modules/nominee/nominee.handlers.ts:176-194 (charge) vs 197, 236, 249, 263 (refusals); apps/mobile/app/(life-events)/nominees.tsx:135,166] — MED. VERIFIED; four layers (Blind c2, Edge c1, c2, c3). `closeScopeTx(chargeTx, charged)` commits when the charge succeeds; the unusable-number 422, the locked-claim 409, the terminal-state 409 and the step-up 403 then refuse with no refund. On the ordinary path: a Life Events save is a re-declaration, `stepUp.guard` POSTs first, the handler charges, then answers 403; after the OTP the retry charges again — two new marks spend the whole day's 4 in one save, and one typo then locks the member out until the IST day rolls. NE5 budgets "two ranks, one retry each"; the step-up retry silently spends the retry. Fix: normalise the numbers first (pure), look the elevation up before the charge, and run the terminal / locked / step-up pre-checks inside the charge transaction BEFORE charging (the main transaction keeps the authoritative checks); test that a step-up refusal and a locked declaration leave the counter untouched and that the post-OTP retry charges once. `save.daily_limit` should also say the nominees can still be saved without the mark.
      **APPLIED** — numbers are normalised before the charge; `guardDeclare` (claim lock, terminal state, step-up) runs in the charge transaction BEFORE it charges and again in the main one; the elevation lookup moved before both. API test: an unusable number, a missing step-up and a locked declaration are ⛔ charged, the OTP retry charges ONCE (RED on the pre-review handler).
- [x] [Review][Patch] A stalled read blocks the whole nominee form, and a stalled refetch leaves the answer buttons busy forever [apps/mobile/components/nominee-links/useNomineeLinkQueries.ts:40,61-62 and `onSettled`; apps/mobile/app/(life-events)/nominees.tsx:227; apps/mobile/app/(life-events)/nominee-link-requests.tsx `onAnswer`] — MED. VERIFIED (three layers). The API client has no timeout; 6.36b wraps EVERY list read in `withReadTimeout` (added over its review rounds 6–8, `useKnownPeopleQueries.ts`), the three 6.36e reads pass `signal` straight through. `nominees.tsx` shows a spinner with no Retry while `links.isLoading`, so one stalled marks read blocks all nominee editing — a regression on an existing grief-paced screen. `onSettled: () => qc.invalidateQueries(...)` returns the promise, so `mutateAsync` waits for the refetch: a stalled refetch never reaches `setMessage(request.done)` or clears `busyLink`. Fix: reuse `withReadTimeout` on the three reads (do not retry the timeout), do not return the invalidate from `onSettled`, and give the nominees screen a Retry when the marks read fails or times out.
      **APPLIED** — `withReadTimeout` (6.36b's, imported — its second consumer) on both reads, a timeout ⛔ retried, `onSettled` no longer returns the invalidate; `nominees.tsx` gates on `links.data` (⛔ `isLoading`) with a Retry that stays mounted. `nominee-links-hooks.test.ts`: 4 of 5 RED on the pre-review hooks.
- [x] [Review][Patch] Family 13(d): the states AC5 ratifies are not announced on iOS [apps/mobile/components/life-events/NomineeForm.tsx:215,359-361, apps/mobile/app/(life-events)/nominees.tsx:273,290, apps/mobile/app/(life-events)/nominee-link-find.tsx `choose`, apps/mobile/app/(life-events)/nominee-link-requests.tsx (`error.load`)] — MED (REAL GAP, un-mechanized family). VERIFIED against `components/peer-request/announce.tsx` ("`accessibilityLiveRegion` is Android-only … a bare alert role is not reliably announced"). The edit question, the "answer the question first" gate and the four `nominee_link.*` save refusals go through `accessibilityLiveRegion` / a bare `alert` role only; a VoiceOver user taps Save and hears nothing. A pick's success and *Remove mark* (the form remounts, focus resets) are silent; the requests load failure is a bare alert. The find and requests screens' own messages are correct (`AnnouncedText`). Fix: route these lines through `AnnouncedText` / `announcementPlan` and announce "Marked as a member: [name]" after a pick (6.36b did the same, review P2).
      **APPLIED** — the question, the gate and the refusals (Life Events only) and the load errors use `AnnouncedText`; *Remove mark* and a pick SAY so; the form's buttons name their slot. The render test mocks only `react-native`, so the REAL `AnnouncedText` / `announcementPlan` run, and asserts `announceForAccessibility`. ⚠ Not heard on a device.
- [x] [Review][Patch] Checklist families 12(a), 3, 11 and 2 have no test that would fail without the behaviour [apps/api/tests/integration/nominee/nominee-member-link.spec.ts, packages/domain/tests/integration/nominee/member-links.spec.ts] — MED (REAL GAP per the AI-6-5 lens). Auditor c2 plus the triager's grep. (a) No test makes a SECOND declarer `keep` another declarer's real live link id — every `keep(...)` argument is the declarer's own link or `randomUUID()`; the enforcement is the `declarer_member_id` filter in `lockLiveNomineeLinks` (present), and dropping it leaves the suite green (the class that recurred at 10.29). (b) `POST …/answer` is never called without a token, with a non-member principal, or with a token from another Pariwar; only the two GETs have a 401 leg. (c) The answerer gate admits `active-in-grace` (`nomineeLinkAnswererSql`) but the denial loop uses `['pending-fee','withdrawn']` only — changing the gate to `= 'active'` stays green. (d) No two-connection test of answer-vs-answer, the same key in flight (`idempotencyInProgress`), or two concurrent declares by one declarer. (e) The caller-gate refusal's "costs no KMS call" (NE5 / TR14) is asserted only on the daily-limit leg. (f) `purpose: 'nominee_link'` has one call site in the find screen and no mobile test pins it — dropping the argument keeps everything green and silently logs the second purpose under 6.36b's. Fix: add one test per item.
      **APPLIED** — (a) foreign `keep` ⇒ 409 (RED without the declarer filter); (b) the answer route: no token, two wrong-kind tokens, a ghost principal ⇒ 403, another Pariwar ⇒ 404; (c) the grace answerer (RED with `= 'active'`); (d) two answers at once ⇒ 200 + 409 (RED without `answer IS NULL`), two concurrent saves ⇒ one live link (RED without the D3 lock — and, since the fix-diff round, ⛔ passing on the old planner: it also asserts the second save CARRIED the first's link); (e) the caller gate ⇒ ⛔ HMAC line, ⛔ counter row; (f) `nominee-link-match-purpose.test.ts` (the wrapper + a source scan of the find screen; RED when the purpose is dropped). NOT added: the same Idempotency-Key IN FLIGHT — the keyed store's in-progress window cannot be held deterministically from a test.
- [x] [Review][Patch] The find screen writes matched contacts into module memory after the screen or the session is gone [apps/mobile/app/(life-events)/nominee-link-find.tsx:87-103] — MED. VERIFIED (Blind c3, Edge c3). `setNomineeLinkSessionMatches(held)` runs before the `mounted` guard, and `clearNomineeLinkSession()` (form unmount, the four `session-context` clears) is not epoch-guarded. Tap Continue, back out of the form or sign out while `contactMatches` is in flight (no transport timeout) → the late response refills the cleared handoff; the next find screen — possibly the next account on a shared phone — opens straight on the previous contacts' saved names and numbers, skipping the note and the permission prompt. Fix: capture a session epoch (bumped by `clearNomineeLinkSession`) before the await and drop the result if it changed (6.36b guards the same class with `savedNamesGeneration`).
      **APPLIED** — `nomineeLinkSessionEpoch()` moves on every clear; `check()` drops a response whose epoch changed. The epoch is unit-tested; the screen itself is not render-tested.
- [x] [Review][Patch] The save-and-resume draft persists other members' registered names and picked contacts' saved names to MMKV, against the cache module's own policy [apps/mobile/app/(life-events)/nominees.tsx:71-76,314-315, apps/mobile/lib/nominee-links.ts `FormMark`, apps/mobile/components/nominee-links/nominee-links-cache.ts] — MED. VERIFIED (path); REPORTED (the MMKV store is unencrypted, and the forced-sign-out paths clear the nominee cache but not drafts — Edge c3). `saveDraft(memberId, DRAFT_KEY, forms)` writes `keep.name` (a confirmed member's registered name) and `new.savedName`; the cache module keeps registered names out of persistence (`gcTime: 0`) and `lib/nominee-links.ts` says the handoff is "⛔ MMKV". `reconcileMarks` already refreshes the name from the marks read on restore, so storing it is unnecessary. Fix: redact `keep.name` / `new.savedName` before `saveDraft`; clear drafts on the two forced-sign-out handlers.
      **APPLIED** — `redactForDraft` strips `keep.name` / `new.savedName` before BOTH `saveDraft` calls; the names are re-read on restore. NOT applied: clearing drafts on the two INVOLUNTARY sign-out handlers — what a draft now holds is the member's OWN typed nominee data, and wiping it on a session expiry would destroy the save-and-resume the screen exists for (BigDev to say otherwise). The MMKV store being unencrypted stays REPORTED, ⛔ checked.
- [x] [Review][Patch] The disclosure copy says "nobody is told" on the screen that starts a flow in which the marked member IS told, and the declarer is never told that before saving [packages/i18n/locales/en/nominee_link.json `note.body`, `note.body_no_name` (and `hi`), `form.marked`, `form.why`, `request.will_see`] — MED. VERIFIED (Blind c3, Edge c3, Auditor c3). `-396` Q2 A: "the marked member is told in the app". `note.body` ("Your contacts are not stored, and nobody is told.") is true of the contacts check but sits on the entry screen of the whole mark flow, as the prominent disclosure; the other pre-save declarer copy never says the marked person will see a card naming the declarer, and a "Yes" shows the declarer the registered name while `request.will_see` says only "{name} will see your answer." Not the Panel's (the ruling already answers it) — correct the wording: scope "nobody is told" to the check, add one pre-save line ("they will be asked in the app and will see your name") and one to `request.will_see`. The Hindi is awaiting BigDev's approval anyway (defer 8).
      **APPLIED** — `note.body*` say "nobody is told that you checked" and that the marked person will be asked in the app and see the name; `form.will_ask*` says so per new mark BEFORE saving; `request.name_note` tells the marked member what a "yes" shows. `request.will_see` and `find.no_matches` (quoted FINAL in the story) are untouched. Pinned through the real `t()`. The Hindi is agent-drafted and AWAITS BigDev (defer 8).
- [x] [Review][Patch] A `new` mark of the member already live on that rank ends the answered link and re-asks them [packages/domain/src/nominee/member-links.ts:175-215 `planNomineeLinks`] — MED. VERIFIED (Blind c1, Edge c1, c2). A `new` always becomes an insert with `carriedFrom: null`, and the duplicate check compares only the inserts with each other — never with `live`. Re-picking the same contact, or a lost-response retry of a `new` save, ends the live (possibly answered) link `redeclared`, inserts a fresh unanswered one, re-asks the member, drops their answer, spends 1–2 quota units, and their old `linkId` now answers 409. Fix: when a `new` resolves to the nominee of the live link on the SAME rank, plan it as a carry of that link (keep the other-rank case as `duplicate`); add a plan test and an integration leg.
      **APPLIED** — `planNomineeLinks` plans it as a carry (the other rank is still `duplicate`); 2 unit tests + 1 live test (the answer and `asked_at` stay).
- [x] [Review][Patch] NE3's "if the declared `mobile` is empty, offer the picked number as it" is not built, and the story does not say so [apps/mobile/lib/nominee-links.ts `applyPick`, apps/mobile/app/(life-events)/nominees.tsx] — LOW (checklist family 10, closure honesty). VERIFIED. `applyPick` sets only `memberLink`; nothing writes the form's `mobile`. Task 5 is `[x]`; the Completion Notes and Debug Log are silent (grep for "offered" finds only NE3's own text). Build it, or record the omission against NE3 / Task 5.
      **APPLIED** — `applyPick` offers the picked number (ten digits, editable) when the declared mobile is empty and confirms the pick for the slot; NE3 carries a dated note.
- [x] [Review][Patch] The find screen dead-ends after a limit refusal, zero matches or iOS limited access, and the disclosure has no "Not now" [apps/mobile/app/(life-events)/nominee-link-find.tsx:87-110, 'note' phase] — LOW. Partly VERIFIED (the `catch` returns to the `note` phase with only *Continue*); the zero-match / limited-access paths REPORTED (Edge c3). After `known_people.daily_limit` (the 3-a-day budget is shared with 6.36b) or `busy`, the member can only press *Continue* again; the picker / typed-number path — the designed fallback, resolved at save and not touching the match counter — is never offered; iOS "limited access" is told "none of your contacts is a member" with no share-more action; 6.36b's note had `note.cancel` ("Not now"), 6.36e's has none. Fix: go to the fallback phase on those refusals, offer *share more* when `limited`, add *Not now*.
      **APPLIED** — a limit / busy / failed check ⇒ the picker / typed number; zero matches shows it too; `note.decline` (*Don't read my contacts*) ⇒ the fallback without the prompt; `find.add_more` on iOS limited access; `known_people.not_available` still returns to the note. ⚠ Not run on a device.
- [x] [Review][Patch] Failure states are silent or lose the form in the requests and nominees screens [apps/mobile/app/(life-events)/nominee-link-requests.tsx:54-66 + load-more, apps/mobile/app/(life-events)/nominees.tsx:227,288-298] — LOW. REPORTED (Blind c3, Edge c3, Auditor c3), gating lines VERIFIED. The error row shows only while `items.length === 0`, so a failed *Show more* or a failed post-answer refetch with rows present shows nothing (6.36b P9 reports it); TanStack v5 resets an errored query with no data to pending on *Retry*, unmounting the Retry button (6.36b keeps a local `retrying` flag); `links.isError ? null : <NomineeForm>` keys on the flag, not on data presence, so a failed background refetch hides the form. Fix per 6.36b.
      **APPLIED** — the requests screen says ANY failure (a first load, a refetch behind rows, *Show more*) with a Retry that stays mounted (`retrying`); `nominees.tsx` as above; a failed 409 reload says `save.stale_not_reloaded` instead of "reloaded".
- [x] [Review][Patch] The export resolves the other member's name once per link row with no memo [packages/domain/src/data-export/assemble.ts:421-435 `seenName`] — LOW. VERIFIED (Blind c1, Edge c1). Every keep re-save adds an ended row plus a live row, so a heavily re-saved declaration costs N sequential KYC reads, decrypts and audit lines for the same person. Memoise by `otherMemberId` (decision 1 option A also collapses the chain).
      **APPLIED** — `seenName` is memoised per member (and the carry chain collapses — decision 1).
- [x] [Review][Patch] Record and comment drift [packages/domain/migrations/0181_member-nominee-links.sql:22, packages/domain/src/claim/peer-mesh-nominees.ts:12, packages/i18n/locales/classification.json `$comment`, apps/mobile hook `useNomineeLinkT` memo note, this story's AC1 / Policy meaning / NE2] — LOW. The migration header calls the version check "function (4)" (it is section 3; 4 is the counter); the `peer-mesh-nominees.ts` header still says "the system records ⛔ member link for a nominee" directly above the 6.36e paragraph that narrows it; `classification.json`'s `$comment` still describes only the 6.36a entry; AC1's "that table's policy spec updated" is not literally met (`member-known-people-policy-regression.spec.ts` is unchanged — the new spec carries the lockstep leg and the 6.36b spec still passes because it probes only `'sms'`); the Policy-meaning section has no one-sentence member meaning, checked against the Niyamavali, for the CALLER gate (`isKnownPeopleCaller`: active only, never claim-named) or the ANSWERER gate (family 11), and `keep` skipping NE5 re-eligibility has a rationale but no DELIBERATE block or re-examination trigger (family 9); the contracts twins (`NomineeLinkFoundByWire`, `NOMINEE_LINK_REQUESTS_LIMIT_MAX`) have no drift pin to the domain tuples.
      **APPLIED** — migration header (3); the `peer-mesh-nominees.ts` header dated (it reads correctly under the glyph register — a reader misread it); the registry comment; the `useNomineeLinkT` note; the DELIBERATE block + re-examination trigger for `keep` (family 9, in `planNomineeLinks`); the contracts↔domain twin pin (`apps/api/tests/unit/nominee-link-twins.test.ts`); the AC1 annotation and the family-11 sentences in Policy meaning.
- [x] [Review][Patch] Small copy, accessibility and performance defects in the new screens [packages/i18n/locales/{en,hi}/nominee_link.json, apps/mobile/app/(life-events)/nominee-link-find.tsx, apps/mobile/app/(life-events)/nominee-link-requests.tsx] — LOW. REPORTED unless marked. `find.matches_count` reads "1 of your contacts are members." (no plural); `find.no_matches` says "the number you gave above is still checked" on a screen where nothing is above; `request.empty` ("Nobody has named you as their nominee") is untrue for someone named but not marked; `find.permission_denied` is shown for `unavailable` too; every row's Yes / No carries the same accessible label (6.36b names the person), and the buttons are 40 dp where the repo uses 48; the requests `Spinner` is labelled `request.title`; a repeated identical `find.bad_number` is not re-spoken (`key={message}` — use a sequence as 6.36b does) and is never cleared on edit; *Continue* has no in-flight guard, so a double tap can spend the shared 3-a-day match budget twice; matched contacts render as an unvirtualised list of up to 1,000 buttons.
      **APPLIED** — `find.matches_count_one`, `find.unavailable`, `request.empty`, accessible names with the declarer, the `loading` label, `bad_number` sequenced and cleared on edit, an in-flight guard on *Continue*. NOT applied: the unvirtualised matches list (moved to `deferred-work.md` — it restructures the screen from a `ScrollView` into a flex column and needs a device run; never measured); `find.no_matches` wording (quoted FINAL in the story — BigDev's); the 40 dp chromeless *Retry* / *Show more* (6.36b's are the same).
- [x] [Review][Patch] Three tests pass whether or not the behaviour they name is present [packages/domain/tests/claim/peer-mesh-nominees.test.ts:256-278, packages/domain/tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts (AC7 second leg), apps/mobile/tests/unit/nominee-form-link-render.test.ts] — LOW. VERIFIED for the first. (1) In "a link on a version NOT projected as of the cut" and "a vacated rank counts no link" the excluded link is built with `endedAt: BEFORE`, so the `endedAt < cut` check alone excludes it and deleting `if (!projected.has(l.versionId)) continue;` leaves those legs green (the V15 leg, with `endedAt: null`, does isolate it) — give those legs `endedAt: null`. (2) AC7's second leg ("a linked re-save inside the window does set `recent_change_before_filing`") is true with no link code at all — the re-save writes a nominee version, which is 6.36d's own disjunct; only its first half ("an answer inside the window does not set it") can go red. (3) The form-render test's `useNomineeLinkT` mock returns the key and never throws, where the real `t()` throws on an unsupplied token (the transcribe-not-call stub). Every exclusion leg hand-inserts link rows; no test composes `applyNomineeLinkPlan` with the reader, so the writer-to-reader seam (`ended_at` as stamped) is unproven.
      **APPLIED** — the two projection legs are `endedAt: null` (3 legs RED when the filter is deleted); the AC7 leg retitled + a case that a link row ALONE sets nothing (RED when the staff line reads `asked_at`); the form render test uses the REAL `t()`; a writer-to-reader seam test (`applyNomineeLinkPlan` → `listNomineeLinksOfVersions` → `peerMeshNomineeLinkedMembersAsOf`).

- [x] [Review][Defer] The audit lines are emitted before the COMMIT that can still fail [apps/api/src/modules/nominee/nominee.handlers.ts:362-390] — deferred, pre-existing. The structure is 6.20's (`1268d47e` already emits `member_nominees.declared` after `ok = true` and before `closeScopeTx`) and NE11 / V10 sanction it as "the established pattern"; 6.36e extends it to the link lines. The "failure AFTER the link insert" test asserts rows only, never the audit sink. Trigger: emit after commit, as the answer handler does.
- [x] [Review][Defer] The answer's Idempotency-Key is not bound to `linkId` / `answer`, the header is unbounded, and the mobile mints a fresh key per tap [apps/api/src/modules/nominee-links/handlers.ts `idempotent`, apps/mobile/app/(life-events)/nominee-link-requests.tsx:36] — deferred, pre-existing. Inherited from 6.36b (same key shape in `known-people/handlers.ts`; 6.36b's screens also mint per tap); the shipped client cannot reuse a key across requests, and a lost-response retry gets 409 `request_closed` for an answer that was saved. Cross-feature; fix once for both.
- [x] [Review][Defer] `openapi/v1.yaml` registers `memberLink` only on the signup declare (which always answers 400) and none of the Life Events declare, the three nominee-links routes or the new error codes [openapi/v1.yaml] — deferred, house practice. 6.36b's known-people routes are absent too; `forced-pagination.spec.ts` walks the committed OpenAPI, so the new collection GET is invisible to it (its zod `limit` is bounded and coerced).
- [x] [Review][Defer] NE9's recorded residual has a screen consequence not yet written down [packages/domain/src/nominee/member-links.ts `listNomineeLinksForDeclarer` (head version only) vs `listNomineeLinkRequests` / `peerMeshNomineeLinkedMembersAsOf`] — deferred, recorded residual. After a post-filing correction leaves a link on a non-head version, the declarer's screen shows no mark while the marked member still sees a live request and stays excluded, and a later re-save with no mark ends it `redeclared` silently. Add the consequence to NE9's record.
- [x] [Review][Defer] No DB backstop for "one live link per (declarer, rank)", "one live link per (declarer, nominee)" or "the nominee is in the declarer's Pariwar" [packages/domain/migrations/0181_member-nominee-links.sql] — deferred, hardening. NE1 does not specify one; the only writer is `applyNomineeLinkPlan` under the D3 lock and `resolveNomineeLinkTargets` pins the Pariwar. Revisit if a second writer appears.
- [x] [Review][Defer] The OTP retry re-submits the `pending` payload, so a pick or an edit made after the first Save is dropped (and an edit skips the V3 gate) [apps/mobile/app/(life-events)/nominees.tsx `onSubmit` / `onVerifyOtp`] — deferred, pre-existing Life Events pattern, more exposed now that Find is a normal navigation away from the form.
- [x] [Review][Defer] The find screen is reachable by deep link without the form; the pick lingers and is applied at the next form focus [apps/mobile/app/(life-events)/nominee-link-find.tsx `choose`, apps/mobile/lib/nominee-links.ts `pendingPick`] — deferred, SUSPECTED not traced (expo-router exposes every route; whether the stack gives `router.back()` a target was not checked).
- [x] [Review][Defer] The Hindi `nominee_link` copy is agent-drafted and awaits BigDev's approval, and none of the mobile surface has been seen on a device [packages/i18n/locales/hi/nominee_link.json] — deferred, already disclosed (catalog `$comment`, Completion Notes); go-live conditions, not build defects.
- [x] [Review][Defer] The jobs role's grants on the nominee tables (G12) [roster Row 26] — deferred, already recorded; the live proof is a go-live step.
- [x] [Review][Defer] The find screen's matched contacts render as an unvirtualised list of up to 1,000 buttons [apps/mobile/app/(life-events)/nominee-link-find.tsx] — deferred while applying the patches (2026-10-24): never measured, and a `FlashList` (6.36b's form) restructures the screen from a `ScrollView` into a flex column — not shippable without a device run.

Dismissed (11): (1) "duplicate numbers give `mobileBlindIndexMany` an `undefined` index" — false, `blindIndexMany` maps every input to one output in order; (2) "the client's `limit=50` string 400s every real call" — false, the query schema uses `z.coerce.number()`; (3) "a save through the signup route silently ends a live mark" — ratified (NE4 / V20: both routes apply NE2's end rules), and the route is reachable only before lock-in because any later re-declaration needs a step-up the signup screen never does; (4) "erasure covers live links only, so ended rows keep ids" — ratified (NE10 / V21); (5) "a `keep` mints a new `link_id`, so the marked member's open request answers 409" — accepted (NE2 / AC3) and the answer hook refetches on any outcome; (6) "two `new` marks of one number tell a member from a non-member" — inside `-396` Q2 A's typed-number "member or not" answer, capped at 4 a day, which a single mark already gives; (7) "a `not_me` answer still keeps the nominee out" — ratified (`-396` Q1 A, "whatever they answer"); (8) "the RLS INSERT `WITH CHECK` is never exercised" — not constructible, the BEFORE INSERT trigger fires first and the spec honestly pins 23514; (9) "the guard trigger's forward-transition branch is unreachable" — belt and braces under the CHECKs; (10) "a member found alive after a claim can keep but never add a mark" — `-333` D1's recorded cost; (11) "`found_by` and `purpose` are client-asserted" — audit labels by design (`purpose` is optional and defaults to 6.36b's).

**Patches applied 2026-10-24** (BigDev: *"1"* on the decision — `2026-10-24-399`, committed ALONE as `ae0f3249` BEFORE any export code — then *"1"* — apply every patch). All 17 are applied and **uncommitted** on top of `ae0f3249`; the Status stays `review`.
Verified at the working tree (the live suites on a disposable `twt_6_36e`, `:5434`, never `:5432`):
- `@twt/domain` live: 412 files, **6,240 passed**, 1 skipped (6,230 at dev complete — the Debug Log's final integration run; the 6,228 beside Task 2 was a mid-task run with one red). `apps/api` live: 179 files, **2,103 passed**, 1 skipped. `apps/jobs`: 1,441 tests — 73 files green, and the 10.23 gate, which refuses any database not named `twt_dev`, run ALONE with its documented override on this disposable database: 3 / 3. `@twt/contracts` 1,455; `@twt/i18n` 124; `@twt/mobile` 1,426 (1,407 at dev complete).
- `tsc` clean across the workspace (turbo `typecheck`, 20 / 20); ESLint exit 0 over every changed file; the ten static gates that can see this change — contracts-determinism, i18n-parity, pii-scrape, friction-budget, schema-diff, microcopy, domain-invariants, access-wrapper, governance-boundary, expo-config — exit 0.
- Ten mutants, each RED with its line broken and the file restored byte-for-byte: the pre-review handler (quota) · `lockLiveNomineeLinks` without the declarer filter · the answer UPDATE without `answer IS NULL` · the answerer gate narrowed to `active` · `markNeedsQuestion` always false · `addSecond` adding an `undefined` mark · the match call without its purpose · the pre-review hooks · the projected-version filter deleted · the staff line reading `asked_at`.
- **NOT done, and ⛔ claimed:** `pnpm ci:local` (the 36-job pipeline — the pre-push hook runs it); the fix-diff review the repo asks for BEFORE committing code (three layers on `git diff HEAD` PLUS the three new untracked tests — [[feedback_review_the_fix_diff_before_commit]]); any device run (VoiceOver / TalkBack, the find screen, the form remount); the rebase — the branch is still 16 commits behind `main` (the ledgers and `_journal.json` will conflict). The Hindi copy awaits BigDev.
- Not applied, with reasons (each is in its bullet above): clearing drafts on an involuntary sign-out; the unvirtualised matches list (deferred); `find.no_matches` wording; the same-key-in-flight race test.

#### Fix-diff review — round 2 (2026-10-24, BigDev: *"2"*)

The patch diff itself, as the repo asks before code is committed ([[feedback_review_the_fix_diff_before_commit]]): `git diff HEAD` over `apps/` + `packages/` PLUS the three untracked tests (a plain diff omits them) — 2,736 lines, 30 files, ONE chunk (under the 3,000-line threshold), tree at `ae0f3249` + the uncommitted patches. Three layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor), read-only, in parallel. 32 raw findings → 0 `decision-needed` + 17 `patch` + 3 `defer`, 7 dismissed; no HIGH. **Exactly ONE is a regression the patches caused (patch 1).** *[Corrected 2026-10-24, round 3: false — round 3 found three more of round 1's and round 2's patches' making; see its introduction.]* Each kept finding below was re-read against the tree. The Auditor labelled one item `POSSIBLE decision_needed` (an erased nominee's confirmed `marked[]` row has no name): it is ⛔ a new question — `-335` call 2 ruled that residual for 6.36b (BigDev, option A: record it; hiding names on every ended row was rejected because it strips names from members who saw them), and `-399` extends `-333` / `-334` as `-335` clarified them — so patch 15 CITES it; a "no" from BigDev would reopen it.

- [x] [Review][Patch] REGRESSION — an answered request keeps live Yes / No buttons until the refetch lands, so a second tap says "can no longer be answered" straight after "saved" [apps/mobile/components/nominee-links/useNomineeLinkQueries.ts `useNomineeLinkAnswer.onSettled`, apps/mobile/app/(life-events)/nominee-link-requests.tsx `onAnswer`] — MED. VERIFIED; three layers (Blind, Edge, Auditor). Patch 4 of round 1 stopped `mutateAsync` waiting on the refetch (a stalled one left every button busy forever), so `busyLink` clears at once while the row is still `answer === null` in `q.data`: the buttons are live again for up to the 15 s bound, and a second tap (a new Idempotency-Key) gets 409 `nominee_link.request_closed`; a 404 shows `request.changed` ("the list has been reloaded") before any reload. Fix: remember the answers locally — a row the member has just answered renders as answered (`yes ⇒ confirmed`) — and disable a row's buttons after a 409 / 404 until the reload; a pure helper + a unit test.
      **APPLIED** — `shownRequestAnswer` + `answeredNow` / `closedNow` on the requests screen: a just-answered row renders as answered at once (`yes ⇒ confirmed`), a row the server calls `request_closed` / `not_found` has its buttons OFF until the reload, any other failure leaves them live. NEW `nominee-link-requests-render.test.ts` (5): 3 RED on the old row rendering, 1 RED without the closed-row disable.
- [x] [Review][Patch] The find screen offers no picker / typed number when the check found SOMEONE but not the nominee, and re-entering Find skips the note and its decline [apps/mobile/app/(life-events)/nominee-link-find.tsx, `matches` phase and the `useState` initialiser] — MED. VERIFIED (Edge). `fallbackControls` renders only for ZERO matches, a decline or a failed check, so a member whose nominee signs in on a number they did not save (a family phone), or sits in the unchecked remainder past 1,000, cannot reach the alternative for the rest of the form session — round 1's "no dead ends" was true of its cases only. Fix: a *"Not in this list?"* action in the matches phase that opens the fallback (en + hi).
      **APPLIED** — *Not in this list? Add them another way* (`find.not_listed`, en + hi) in the matches phase opens the picker / typed number. NEW `nominee-link-find-render.test.ts` (8): RED without the button.
- [x] [Review][Patch] The caller-gate sentence added to Policy meaning is FALSE for the member it names, and "pinned by a test" is overstated [this story, Policy meaning — "TWO MORE predicates"] — MED (families 10, 11). VERIFIED against `claim/nominee-lock.ts` (`isNomineeDeclarationLocked`: ANY claim naming the member, in ANY state, locks the declaration unless a `member_found_innocent` finding exists): a member a claim names gets 409 `nominee.locked_claim_filed` on EVERY save — keep and remove included — not "can still keep or remove"; after an innocence finding the declaration unlocks and the caller gate STILL refuses a new mark. The answerer sentence omits the other way a mark disappears (once its declarer is claim-named the request is no longer listed or answerable). Of the caller gate only the `active-in-grace` half has a test; the claim-named half is unreachable through the route without a finding and is untested. Fix: rewrite both sentences and the test claim to say exactly that.
      **APPLIED** — the Policy-meaning sentences rewritten to what the code does: a claim-named member's declaration is LOCKED (every save refused) until an innocence finding, and even then no new mark; the tested halves are named (TR7's grace declarer; the grace answerer; V13's claim-named declarer) and the untested ones STATED as untested. The wrong wording is superseded in place by the correction it carries.
- [x] [Review][Patch] The same-rank `new`-as-a-carry rule is unrecorded on NE2 / AC3, its code comment is wrong about the quota, and the pre-save line still says the nominee "will be asked" [packages/domain/src/nominee/member-links.ts `planNomineeLinks`, packages/i18n/locales/{en,hi}/nominee_link.json `form.will_ask*`, this story NE2 / AC3] — LOW-MED. VERIFIED (Blind, Auditor ×2). (a) The comment says a re-ask "would spend a quota unit for nothing": the unit is charged in the metering transaction BEFORE planning, so a carried `new` mark has already spent one. (b) A declarer who re-picks a member who answered `not_me` / `confirmed` now gets that answer back and no new request — the line "they will be asked" is untrue for that case, and "pick again" does nothing for the SAME member (re-asking is still possible: remove the mark, save, mark again). (c) NE2 and AC3 say a rank given a `new` link ends the old one `redeclared` and asks fresh, with no note; AC3's order (meter → normalise) and Task 3 / Dev Notes / the Debug Log still describe charge → HMAC. Fix: correct the comment; the line becomes "…will be asked in the app, unless they have already answered, and will see your name" (en + hi); dated notes on NE2 and AC3 (the rule, the quota, the way to re-ask, the new order).
      **APPLIED** — the `planNomineeLinks` comment no longer says a quota unit is saved (it is not — the meter charges before the plan); `form.will_ask*` now reads "…unless they have already answered…" (en + hi, pinned through the real `t()`); NE2 and AC3 carry dated notes (the rule, both costs, the way to re-ask, the new order).
- [x] [Review][Patch] A repeated load failure after *Retry* is not announced, on two screens [apps/mobile/app/(life-events)/nominees.tsx `nominee-links-error`, apps/mobile/app/(life-events)/nominee-link-requests.tsx `nominee-requests-error`] — LOW (family 13(d)). VERIFIED (Blind, Edge, Auditor). The error line stays mounted through the retry (that is the point), `AnnouncedText` speaks only when its text changes, and the text does not: the second failure is silent on both platforms. Fix: key it by `errorUpdatedAt`.
      **APPLIED** — both error lines are keyed by `errorUpdatedAt`. Render test (requests screen): the SECOND failure is spoken again, RED unkeyed. The nominees screen's line is keyed the same way; ⛔ a render test of its own (that screen is not render-tested).
- [x] [Review][Patch] `check()` can leave the find screen on the spinner, and a stalled match call blocks every retry [apps/mobile/app/(life-events)/nominee-link-find.tsx `check`] — LOW. VERIFIED by reading; the mounted path to the first is not traced (Blind, Edge). A response that arrives after the session epoch moved while the screen is STILL mounted returns without leaving `checking`; `matchContactsForNominee` has no bound, so one that never settles keeps `checking.current` true and the in-flight guard refuses every later tap. Fix: back to the note on an epoch mismatch while mounted; bound the call with `withReadTimeout` (a timeout ⇒ the generic message + the fallback).
      **APPLIED** — an epoch mismatch while mounted returns to the note; the match call is bounded by `withReadTimeout` (a timeout ⇒ the generic message + the picker, the in-flight guard released). Find-screen render test: both legs, each RED without its fix.
- [x] [Review][Patch] Picking a contact BEFORE typing the name makes "Is this still [name]?" fire on the first keystroke, about a mark the member made seconds ago [apps/mobile/lib/nominee-links.ts `applyPick` / `markNeedsQuestion`, apps/mobile/components/life-events/NomineeForm.tsx `patch`] — LOW-MED (UX; the old code asked on every edit too, but NE3's pre-filled number invites this order). VERIFIED (Blind, Edge). Fix: a `new` mark picked on a slot with no name is COMPLETED — not changed — by the name typed next (`completeMarkName`); a later edit asks as before. Pure + render tests.
      **APPLIED** — `namePending` on a `new` mark picked on a nameless slot; `completeMarkName` keeps the pick confirmed for the WHOLE name typed (letter by letter); an edit of the MOBILE asks; `acceptMark` (*Keep the mark*) closes the window. Pure tests + a render test through the real form. ⚠ The first cut completed only the FIRST keystroke — the new render test caught that before anything else did.
- [x] [Review][Patch] The export's `listed` ignores whether the exporting member can still be shown the request, so a member who has since lapsed gets the declarer's name [packages/domain/src/nominee/member-links.ts `getNomineeLinksForExport`] — LOW. VERIFIED by reading (Edge). `-399` call 2 says "a row the app lists to the marked member"; the app lists it only to an answerer (`nomineeLinkAnswererSql`), and `listed` is only `state = 'live' AND NOT namedByClaimSql(declarer)`. Same posture as 6.36b, but the words are `-399`'s. Fix: AND the exporting member's answerer gate; a live test.
      **APPLIED** — `listed` also requires the EXPORTING member to be an answerer (`nomineeLinkAnswererSql`); a live test (a lapsed nominee ⇒ `ended`, no name; an active one ⇒ `live`, name) — RED without the gate.
- [x] [Review][Patch] `shareMoreContacts().then(check)` is unguarded [apps/mobile/app/(life-events)/nominee-link-find.tsx] — LOW. VERIFIED (Blind). A rejection is an unhandled promise rejection. Fix: `.catch`.
      **APPLIED** — `.catch(() => undefined)` on the chain; find-screen test: a rejecting picker is ⛔ an unhandled rejection (RED without the catch).
- [x] [Review][Patch] `redactForDraft` still stores a kept mark's `label` — another member's answer (`confirmed` / `not_me`) [apps/mobile/lib/nominee-links.ts] — LOW. VERIFIED (Blind). `reconcileMarks` refreshes the label from the marks read on restore, so storing it is unnecessary. Fix: store `asked`. (The picked number STAYS: it is the declared mobile's twin and the draft already holds that — by AC5.)
      **APPLIED** — a kept mark's label is stored as `asked` (`reconcileMarks` re-reads it on restore); unit-tested.
- [x] [Review][Patch] *"Don't read my contacts"* and *"Keep the mark"* change the screen in silence [apps/mobile/app/(life-events)/nominee-link-find.tsx, apps/mobile/components/life-events/NomineeForm.tsx `keepMark`] — LOW (family 13(d)). VERIFIED (Auditor). The decline unmounts the focused button and shows the fallback with nothing spoken; *Keep the mark* closes the question with nothing spoken (only a removal says so). Fix: announce the fallback phase; a `form.kept` notice (en + hi).
      **APPLIED** — the fallback phase is announced when no message of its own speaks (the decline); *Keep the mark* says `form.kept` (en + hi). Find-screen and form render tests, each RED without.
- [x] [Review][Patch] The "writer-to-reader seam" test's last leg is decided by VERSION PROJECTION, not by the `ended_at` the writer stamps [packages/domain/tests/integration/nominee/member-links.spec.ts] — LOW. VERIFIED (Blind). The dropped link sits on a superseded version, which the projection excludes whatever `ended_at` says — round 1's own projection fix says so. Fix: assert the stamp (`ended_at` = the save's `recordedAt`) and correct the comment.
      **APPLIED** — the seam test asserts the writer's STAMP (`ended_at` = the save's `recordedAt`, on the old link at the carry and on the carried link at the drop) and its comment says the last read is decided by the projection. RED when the writer stamps the wall clock.
- [x] [Review][Patch] "Two concurrent saves ⇒ one live link" passes under the OLD planner too [apps/api/tests/integration/nominee/nominee-member-link.spec.ts] — LOW. VERIFIED (Auditor). It fails without the D3 lock but not without the carry, though its comment says it covers the carry. Fix: assert the surviving link is a CARRY (`carried_from_link_id` set).
      **APPLIED** — the test asserts exactly one CARRY and one `redeclared` row; RED on the old planner.
- [x] [Review][Patch] The jobs strict-parse test covers only an erased DECLARER [apps/jobs/tests/data-export.test.ts] — LOW. VERIFIED (Auditor). A removed-within-minutes row, a carry chain and an erased NOMINEE on `marked[]` never go through `assembleMemberExport` + the strict parse. Fix: add them (the claim-named row stays covered by the live domain test).
      **APPLIED** — the build now also parses a removed-within-minutes row, a carry chain (ONE row, listed, the declarer's name) and an erased NOMINEE on `marked[]` (`ended`, no name; ⛔ `erased` / `removed` / `redeclared` / `anonymized` anywhere in the JSON); RED with the chain collapse removed.
- [x] [Review][Patch] Records overstate, and the `-335` citation is missing [this story: round 1's patch 1 and 6 notes, NE10; packages/domain/src/nominee/member-links.ts `shapeNomineeLinkExport`] — LOW (family 10). VERIFIED (Auditor). Patch 1 says "6 unit" tests (there are 5); patch 6's concurrent-saves wording claims the carry (patch 13); the erased-nominee residual is described as "the one 6.36b's `named` list carries" without the ruling that accepted it — `-335` call 2. Fix: correct the counts, and cite `-335` call 2 on NE10 and in the docstring.
      **APPLIED** — round 1's counts and the concurrent-saves wording corrected; `-335` call 2 cited on NE10 and in `shapeNomineeLinkExport`; ⛔ a new question.
- [x] [Review][Patch] The purpose pin's source scan counts a call inside a COMMENT [apps/mobile/tests/unit/nominee-link-match-purpose.test.ts] — LOW. VERIFIED (Blind). Fix: strip comments first (as `peer-request-link.test.ts` does).
      **APPLIED** — the scan strips comments first.
- [x] [Review][Patch] The English `request.empty` reads as being marked a member rather than named as a nominee [packages/i18n/locales/en/nominee_link.json] — LOW (Blind). Fix: "No member has named you as a nominee and marked you as a member."
      **APPLIED** — en `request.empty` = "No member has named you as a nominee and marked you as a member."; pinned.

- [x] [Review][Defer] A restored draft shows a `new` mark WITHOUT its name, so the member cannot tell whom it points at [apps/mobile/app/(life-events)/nominees.tsx `onContinueDraft`, apps/mobile/lib/nominee-links.ts `redactForDraft`] — deferred: the price of not storing the name a contact was saved under (round 1 patch 8); the number is kept. Revisit if a resumed pick is ever mistaken (a masked-number hint is the obvious aid).
- [x] [Review][Defer] `reconcileMarks` keeps `null` for BOTH "the member removed it" and "no mark existed", so a draft resumed after a mark appeared from another device sends no mark and the server ends it [apps/mobile/lib/nominee-links.ts] — deferred, pre-existing; SUSPECTED (needs a second device), not traced on one.
- [x] [Review][Defer] No test reads the audit sink for a carried `new` mark (checklist family 8) [apps/api/tests/integration/nominee/nominee-member-link.spec.ts] — deferred: covered by construction (the handler loops `links.carried`); add with the "audit before COMMIT" item when that is taken.

Dismissed (7): (1) "the nominees screen spins forever if the marks query is disabled" — `useNomineeLinksQuery()` is called with no override, so it is disabled only while the SESSION loads (transient), and the screen is unreachable signed out; (2) "an `ended` row still exports `askedAt`" — `-399` call 2: *"the member's own facts stay: `askedAt`, and `answer`"*; (3) "drafts written before the fix keep full names" — unreleased, the branch is unmerged; (4) "the new `nominees.*_label` keys cannot be caught by the key-echo stub" — they are the form's long-standing heading keys; (5) "the fingerprint ignores digits before the last ten" — by design (a country prefix is not an identity); (6) "`errorSeq` re-announces only form-level errors" — the parent clears its error on every submit, so the line remounts; (7) "the `announce` mock leaks history between tests" — `afterEach` runs `vi.clearAllMocks()`.

**Round-2 patches applied 2026-10-24** (BigDev: *"1"* — apply every patch). All 17 are applied and **uncommitted** on top of `ae0f3249` (the only commit of the review is `.decision-log.md` `-399`); the Status stays `review`. Verified at the working tree (live suites on the disposable `twt_6_36e`, `:5434`, never `:5432`):
- `@twt/domain` live: 412 files, **6,241 passed**, 1 skipped (6,240 after round 1). `apps/api` live: 179 files, **2,103 passed**, 1 skipped. `apps/jobs`: 1,441 tests — 73 files green, and the 10.23 gate (it refuses any database not named `twt_dev`) run ALONE with its documented override on this disposable database: 3 / 3. `@twt/contracts` 1,455; `@twt/i18n` 125 (124); `@twt/mobile` 92 files, **1,445** (1,426).
- `tsc` clean across the workspace (turbo `typecheck`, 20 / 20) — it caught ONE error vitest cannot: `Array.from(…)` destructuring in the jobs test is `string | undefined` under this repo's strict indexing; ESLint exit 0 over every changed and new file (it caught one unused binding of mine); the ten static gates that can see this change exit 0.
- Twelve more mutants, each RED with its line broken and the file restored byte-for-byte: the export without the viewer's answerer gate · the writer stamping `ended_at` with the wall clock · the old planner (a same-rank `new` is not a carry) · no chain collapse (through the jobs build) · the requests row showing only the server's answer (the regression: 3 RED) · a closed request with live buttons · the error line unkeyed · the "Not in this list?" button gone · an epoch mismatch left on the spinner · the match call unbounded · share-more without its catch · a silent decline.
- **Two defects of my own found on the way:** the first cut of the pick-before-name fix completed only the FIRST keystroke (the new render test failed on the second letter of "Asha" — `namePending` now lasts the whole name); and `acceptMark` left a lint error. Round 1's regression (`onSettled`) is the one the review caught; the requests screen now has the render test it lacked.
- **NOT done, and ⛔ claimed:** `pnpm ci:local` (the 36-job pipeline — the pre-push hook runs it); a THIRD fix-diff review of this round's patches (the rule asks for review "until a round finds only LOW items" — round 2 found LOW / MED only, and round 3 has ⛔ been run); any device run (VoiceOver, TalkBack, the find screen, the form remount); the rebase — the branch is still 16 commits behind `main`. The Hindi copy (including `find.not_listed`, `form.kept` and the reworded `form.will_ask*`) awaits BigDev.

#### Fix-diff review — round 3 (2026-10-24, BigDev: *"2"* again)

The whole patch diff again — both rounds' patches, `git diff HEAD` + the 5 untracked tests, 3,420 lines, over the 3,000 threshold ⇒ TWO chunks, each under it: BACKEND (domain, contracts, i18n, api, jobs — 1,301 lines, 18 files) and MOBILE (lib, form, three screens, hooks, six tests — 2,119 lines, 14 files), × three read-only layers = six agents, in parallel, tree at `ae0f3249`. 56 raw findings → 1 `decision-needed` (resolved by BigDev to option 1 ⇒ the 21st patch) + 20 `patch` + 5 `defer`, 8 dismissed; **no HIGH**. Each kept finding was re-read against the tree. **Three of the mobile findings are defects my own earlier patches introduced** — a failed contacts check now strands the member in the fallback (HEAD returned to the note); the `namePending` window I added never closes on a name-only edit; the "speak the fallback" logic re-fires when a message clears — so round 2's "exactly ONE regression" was wrong, and the last patch corrects it. One layer broke its read-only rule (two scratch files in the scratchpad, none in the repo; removed).

- [x] [Review][Decision] RESOLVED (2026-10-24, BigDev: *"1"* — keep as built and SAY it; becomes the last patch below, no new author-commit: it is `-399` call 2 as written) A member who can no longer be shown their inbound requests (a lapsed membership) exports a mark that is STILL LIVE as `ended`, with no name — and it reads `live`, with the name, once they renew [packages/domain/src/nominee/member-links.ts `getNomineeLinksForExport` (`listed`) + `shapeNomineeLinkExport`, packages/contracts/src/data-export/data-export.ts] — LOW-MED (disclosure; the author's under `-399`'s own §0 line, ⛔ the Panel's — it WITHHOLDS). VERIFIED; four layers (Blind b, Edge b, Auditor b, plus the Edge b's note that the lapsed member CAN export — `DATA_EXPORT_TERMINAL_STATES` refuses only withdrawn / anonymized).
      What the code does: round 2's patch 8 made `listed` also require the EXPORTING member to be an answerer (`nomineeLinkAnswererSql`), because `-399` call 2 says the name goes only on *"a row the app lists to the marked member"* and the app lists a request only to an answerer. A lapsed member is not one, so every inbound row reads `ended`, no name — the same reading `-399` call 2 / `-334` call 1 give a claim-hidden LIVE row. The link is in fact live, still keeps that member out of the five (`-396` Q1 A), and they saw the name while active. Bare sentence: *may a member's data export call a mark naming them `ended` and drop the declarer's name, when the mark is still live and only their own lapsed membership stops the app showing it?*
      Options. **1 (recommended) — keep as built, and SAY it:** it is `-399` call 2 as written, and the same uniform `ended` that `-334` chose for a hidden live row; document the lapsed case in the contract comment, the NE10 note and Policy meaning (the member-terms sentence the Auditor found missing). Cost: for that export the state is untrue, and it flips to `live` after renewal. **2 — report the TRUE state, withhold only the name** (`live`, name `null`) for a viewer who cannot be shown the request; claim-hidden rows stay `ended`. Cost: it SUPERSEDES `-399` call 2 for this case, so it needs its own author-commit entry first; a second flag in the read. **3 — drop the viewer gate** (revert round 2's patch 8): a lapsed member's export names the declarer, as the member saw them while active. Cost: it names a declarer the app would no longer show them, against `-399`'s words the other way.

- [x] [Review][Patch] REGRESSION — a failed contacts check strands the member in the fallback; the only control that re-runs the check is *Continue*, which exists only on the note [apps/mobile/app/(life-events)/nominee-link-find.tsx `check`, catch] — MED. VERIFIED (Blind m, Edge m). HEAD returned to the note after ANY failure, so a 503, a timeout or *busy* could be retried; round 1's change sends all of them to the fallback, which has only the picker / typed number. The render test's title ("the member can try again") taps nothing after the failure. Fix: a daily / monthly limit ⇒ the fallback (the check cannot succeed today); `not_available` ⇒ the note with no way on; every OTHER failure ⇒ the note, where *Continue* AND *Don't read my contacts* both stay — so the picker is one tap away AND the check can be retried.
      **APPLIED** — a first check that fails returns to the NOTE (busy, a 503, a timeout, anything unclassified); a daily / monthly limit ⇒ the fallback; "not available" ⇒ a note with ⛔ *Continue* and ⛔ decline (no way on). Tests: a 503 and *busy* retried from the note (the second *Continue* succeeds), the stall past the read bound retried, the blocked note. Mutants F3, F8 RED.
- [x] [Review][Patch] No test can detect removal of the in-flight guard or its `finally` release [apps/mobile/tests/unit/nominee-link-find-render.test.ts] — MED (test; the header claims both are pinned). VERIFIED (Blind m, Auditor m). Nothing double-taps and nothing triggers a second `check()` after the first. Fix: a double tap on *Continue* ⇒ ONE match call; after a failure a second *Continue* ⇒ a second call (RED without the guard, RED without the release).
      **APPLIED** — a double tap (both clicks inside one `act`) ⇒ ONE contacts read and ONE metered call; the retry after a failure proves the release. Mutants F1 (no guard), F2 (no release) RED.
- [x] [Review][Patch] *Share more* spends another of the shared daily checks, and a refusal of that second check throws away the matches the member is looking at [apps/mobile/app/(life-events)/nominee-link-find.tsx] — MED. VERIFIED (Blind m). Its catch sets `fallback` / `note`, so the held list vanishes from the screen though the session still holds it; the `ok === true` path has no test. Fix: a failed RE-check keeps the list on screen and says why; test both paths.
      **APPLIED** — `check(held)`: a re-check that fails, or whose permission is gone, puts the held matches back and says why; tests for the refused and for the successful re-check. Mutant F6 RED.
- [x] [Review][Patch] The in-flight guard is per screen instance, so leaving and re-entering mid-check spends the shared 3-a-day budget twice [apps/mobile/app/(life-events)/nominee-link-find.tsx, apps/mobile/lib/nominee-links.ts] — LOW-MED. VERIFIED (Edge m). The new instance sees no held matches and starts a second call; the first cannot be aborted. Fix: the in-flight check lives in the form session (`shareNomineeLinkCheck` — a second caller attaches to the first's promise; cleared with the session).
      **APPLIED** — `shareNomineeLinkCheck(key, start)` in `lib/nominee-links.ts` (the same numbers attach to the call in flight; released on settle and on `clearNomineeLinkSession`); the find screen wraps the match call in it; a render test leaves and returns mid-check (ONE match call) and unit tests cover attach / release. Mutant F5 RED.
- [x] [Review][Patch] The `namePending` window lets the member replace the whole name with no question, never closes on its own, and survives a draft; and answering the mobile question before a name exists closes it too early [apps/mobile/lib/nominee-links.ts `completeMarkName` / `acceptMark` / `reconcileMarks`] — MED. VERIFIED (Edge m ×2, Blind m, Auditor m — a flaw in MY round-2 fix). Pick on a nameless slot, type "Asha", select all and paste "Ravi Kumar": every guard still passes. After *Keep the mark* on a still-nameless slot the first letter asks. Fix: complete only while the new name extends or truncates the old one (an append or a backspace), or the old one is empty; close the window when a draft is restored with a name; *Keep the mark* keeps it while the name is empty. Tests.
      **APPLIED** — `completeMarkName` completes an extension, a shortening to something that is left, or a first name; a REPLACED or CLEARED name asks. `acceptMark` keeps the window while the name is empty. `redactForDraft` closes it once a name is stored. Logic + render tests (typo fixed by a backspace, select-all + paste, clear, *Keep the mark* on a nameless slot). Mutants N1, N2, N4 RED.
- [x] [Review][Patch] The "speak the fallback" announcement re-fires whenever a message clears [apps/mobile/app/(life-events)/nominee-link-find.tsx `useAnnounceOnChange`] — LOW-MED (family 13(d)). VERIFIED (Blind m, Edge m, Auditor m — my round-2 patch 11). It is keyed on `message === null`, so the first keystroke after "not a mobile number" re-speaks "Type their mobile number" over the typing echo (iOS: tapping *Choose a contact* after "no mobile"). Fix: speak it on the TRANSITION into the fallback by the decline / *Not in this list?* only.
      **APPLIED** — `Phase.fallback.announce` (true only for the decline and *Not in this list?*); the announcement is keyed on it, ⛔ on `message === null`; a test taps through a message that appears and clears (ONE announcement). Mutant F4 RED.
- [x] [Review][Patch] The pick notice goes stale, speaks in the old language, and has no gutter [apps/mobile/app/(life-events)/nominees.tsx] — LOW-MED. VERIFIED (Blind m ×2, Edge m, Auditor m). `pickNotice` is cleared only by a form edit — `remountWith` (a stale reload, *Continue draft*) replaces the slots and leaves "Marked as a member: X" standing; the focus callback captured `lt` with `[initialForms, links.data]` deps (a language change leaves it in the old locale); it renders bare in the `ScrollView` with no side gutter. Fix: `remountWith` clears it; store `{ name, seq }` and translate at render; wrap it like its siblings.
      **APPLIED** — `{ name, seq }` translated at render, cleared by every `remountWith` (a pick sets it after), inside the gutter. ⚠ Pinned by PRESENCE on the source (`nominee-screen-draft-pins.test.ts`) — ⛔ executed: no test renders this screen; a VoiceOver / device run is still owed. Mutants P3, P4 RED.
- [x] [Review][Patch] The answer POST is unbounded, so a stalled one leaves every Yes / No on every row disabled for good [apps/mobile/app/(life-events)/nominee-link-requests.tsx `onAnswer`] — LOW-MED (pre-existing in 6.36b's shape; round 1 fixed the reload and not the write). VERIFIED (Blind m, Edge m). Fix: `withTimeout(…, CALL_TIMEOUT_MS)` from `lib/with-timeout.ts`; a late success then shows as closed on the reload.
      **APPLIED** — `withTimeout(…, CALL_TIMEOUT_MS)`; a render test stalls the POST, advances the clock and taps again. Mutant R1 RED.
- [x] [Review][Patch] The requests screen's answered state is a copy of what was TAPPED, the home card is not updated, and a closed row says nothing [apps/mobile/app/(life-events)/nominee-link-requests.tsx, apps/mobile/components/nominee-links/useNomineeLinkQueries.ts] — LOW. VERIFIED (Blind m, Edge m, Auditor m). (a) `answeredNow` stores `yes` / `not_me`; the response carries the RECORDED answer (a replay returns the first). (b) `NomineeLinkRequestEntry` reads the same query key and keeps asking "Tell them whether it is you" until the reload lands. (c) a `closedNow` row has dead buttons and, once the message is replaced, no words. (d) during *Retry* the page shows two spinners and the error line. (e) `request.changed` says "has been reloaded" while the reload is deliberately not awaited. Fix: use the response; `setQueryData` the cached row on success; a `request.closed` line under a closed row; hide the loading spinner while retrying; "…is being reloaded" (en + hi).
      **APPLIED** — (a) `answeredNow` stores `recorded.answer` (a test where the server answers `confirmed` to a tap on No); (b) `useNomineeLinkAnswer.onSuccess` marks the cached row answered (`withRequestAnswered`; a hook test with a stalling reload); (c) a closed / changed row drops Yes / No and shows `request.closed` / `request.changed`; (d) the page spinner is hidden while *Retry* runs and the `|| retrying` branch is exercised; (e) `request.changed` reads "…is being reloaded" (en + hi). Mutants R2, R3, R4, H1 RED. *[Corrected 2026-10-24, round 4: that scenario is ⛔ reachable on this screen — a fresh Idempotency-Key never replays, so the server's answer equals the tap; the test asserts what the screen BELIEVES, and the code keeps the server's word as the source. Round 4 makes a retry of the SAME answer carry the SAME key, which is when a replay happens.]*
- [x] [Review][Patch] A stale "Answer the question about the member mark first" outlives the question [apps/mobile/components/life-events/NomineeForm.tsx] — LOW. VERIFIED (Edge m, Auditor m). `inlineError` is cleared only by *Keep* / *Remove* / a clean submit; reverting the edit, or removing the slot, makes the question vanish and leaves the red, spoken refusal. Fix: show it only while a question is still open. Test.
      **APPLIED** — `answerFirst` is a flag, shown only while `forms.some(markNeedsQuestion)`; a test reverts the edit and removes the mark. Mutant N3 RED.
- [x] [Review][Patch] Draft redaction is wired at two call sites and NOTHING pins either; the comment's reason for keeping the picked number is false in the dual-number case [apps/mobile/app/(life-events)/nominees.tsx, apps/mobile/lib/nominee-links.ts `redactForDraft`] — MED (family 6, REAL GAP). VERIFIED (Auditor m). Deleting `redactForDraft(…)` at either `saveDraft` call leaves every test green. "The picked number is the declared mobile's twin" holds only when the declared mobile was blank (`applyPick` copies it then); when the nominee signs in on a DIFFERENT number the draft gains a number it would not otherwise hold. Fix: a source scan pinning both sites (as the purpose pin does), and the comment says what is true. (The residual — a picked number in an unencrypted draft until saved or discarded — is AC5's design; recorded as a defer, ⛔ a Panel question: it is the member's own phone.)
      **APPLIED** — a source scan pins BOTH `saveDraft(` calls to `redactForDraft(…)` and that there are exactly two; the `redactForDraft` comment says what is true, residual included (deferred, `deferred-work.md`). Mutants P1, P2 RED.
- [x] [Review][Patch] After "not available for your account" the note still offers *Don't read my contacts*, and *Not in this list?* is a 40 dp target [apps/mobile/app/(life-events)/nominee-link-find.tsx] — LOW. VERIFIED (Auditor m, Blind m). The decline leads to a mark whose save is refused (`save.not_found` — "remove the mark or pick again", a dead end for a non-caller); and the only route for a nominee on an unsaved number is smaller than the screen's 48 / 56 dp buttons. Fix: a blocked note offers no way on; the button is 48 dp.
      **APPLIED** — the blocked note (see the first patch); *Not in this list?* is `height={48}`; a render test asserts every control on the matches is at least 48 dp. Mutant F7 RED.
- [x] [Review][Patch] Mobile tests and headers claim more than they pin [apps/mobile/tests/unit/nominee-links-logic.test.ts, nominee-link-find-render.test.ts, nominee-form-link-render.test.ts, nominee-link-requests-render.test.ts] — LOW (family 10). VERIFIED (Blind m, Auditor m). The logic test's title lists "a cleared flag" it never asserts; the epoch test's `⛔ stored` asserts only the shown half (moving the guard after `setNomineeLinkSessionMatches` stays green); the form test's header says "only `react-native` is mocked" (`tamagui`, `@twt/i18n/react`, `lib/mmkv` are too); the requests Retry's `|| retrying` branch (v5's reset to pending) is not exercised. Fix: assert the session is empty after a late response; exercise the pending reset; correct the headers and titles.
      **APPLIED** — the epoch test asserts `nomineeLinkSessionMatches()` is null after a late response (mutant F9: the store moved before the guard ⇒ RED); the form test's header lists what IS mocked; the logic test's title no longer promises a cleared flag it never asserted; the requests *Retry*'s `|| retrying` branch is exercised.
- [x] [Review][Patch] A `new` mark of a member live on the OTHER rank is still a fresh ask when that rank is vacated, re-marked or saved without a mark; the comment says it is "still a duplicate" [packages/domain/src/nominee/member-links.ts `planNomineeLinks`] — LOW. VERIFIED (Edge b). `sameRank` matches only `s.rank`. Fix: carry a `new` mark of a member live on ANY rank to the rank it is submitted on (as a `keep` already is); two inserts of one member stay `duplicate`.
      **APPLIED** — the planner carries a `new` mark of a member live on ANY rank (the submitted rank preferred); two `new` marks of one member stay `duplicate`; unit legs (a move, a swap with a new member, the duplicate) + a live leg. Mutant M1 RED.
- [x] [Review][Patch] The pre-save line promises more than the planner does, and one English sentence names the wrong act [packages/i18n/locales/{en,hi}/nominee_link.json `form.will_ask*`, `note.body*`] — LOW-MED. VERIFIED (Blind b). "…unless they have already answered" is true only when the member is LIVE (the carry); if their earlier mark ENDED and the declarer marks them again, they are asked again. `note.body*` says "mark someone as your nominee" where the flow marks a nominee as a MEMBER. Fix: "…will be asked in the app and will see your name. A member who has already answered this same mark is not asked again."; "if you then mark your nominee as a member". Pinned in en + hi.
      **APPLIED** — en + hi `form.will_ask*` and `note.body*` reworded; pinned in en and hi.
- [x] [Review][Patch] The export contract's `state` enum is a by-value copy of the domain states and nothing pins it [packages/contracts/src/data-export/data-export.ts, apps/api/tests/unit/nominee-link-twins.test.ts] — LOW-MED. VERIFIED (Blind b, Edge b). A fourth domain state would fail the strict parse and the WHOLE member export for everyone with such a link; round 1's twin pin covers `foundBy` and the page cap only. Fix: pin the states (minus `erased`) and the answers.
      **APPLIED** — `nominee-link-twins.test.ts` pins the export's states (every domain state but `erased` parses on both lists; `erased` and an unknown word are refused) and its answers. Mutants M5, M6 RED.
- [x] [Review][Patch] `shapeNomineeLinkExport`'s unit tests do not isolate `state` from `listed`, and the SQL parity with the app's list is untested [packages/domain/tests/nominee/member-links.test.ts, packages/domain/tests/integration/nominee/member-links.spec.ts] — LOW. VERIFIED (Blind b ×2). Every non-live fixture also sets `listed: false`, so `namedBy` could ignore `state` and stay green; `listed` is a hand-copy of the request list's predicate with no test tying the two. (The precedence worry is ⛔ real — both fragments are self-parenthesised.) Fix: `{ state: 'ended', listed: true }` ⇒ `ended`; a live test that the rows with `nameSeen` equal the rows `listNomineeLinkRequests` shows.
      **APPLIED** — unit leg: `{ ended | erased, listed: true }` and `{ live, listed: false }` read apart; live parity leg: the export's `nameSeen` rows are exactly the declarers `listNomineeLinkRequests` shows (live, removed, claim-named, a three-link chain, erased). Mutants M2, M4 RED.
- [x] [Review][Patch] Backend test legs claim coverage they do not provide [packages/domain/tests/integration/nominee/member-links.spec.ts, apps/api/tests/integration/nominee/nominee-member-link.spec.ts] — LOW. VERIFIED (Edge b, Auditor b, Blind b). The "NOMINEE erased ⇒ the declarer's reads `ended`" leg erases the DECLARER; a claim-named viewer is never tested; the gate leg's `member_daily_counters = []` cannot go RED (a refused charge rolls back whatever the order — only the HMAC line has teeth). Fix: erase the NOMINEE and read the declarer's `marked[]`; a claim-named viewer ⇒ `ended`; say what the counter assertion proves.
      **APPLIED** — the NOMINEE erased ⇒ the declarer's `marked[]` reads `ended` (the answer stays); a claim-named viewer ⇒ `ended`, no name; the gate leg's comment says the HMAC line proves the ORDER and the counter row only the rollback.
- [x] [Review][Patch] Backend comments overstate [packages/domain/src/nominee/member-links.ts `shapeNomineeLinkExport`, `planNomineeLinks`] — LOW. VERIFIED (Blind b ×2, Auditor b). The export docstring cites `-335` ("hiding names on every ended row was rejected") as the reason for a design that DOES strip the declarer's name from every ended `namedBy` row — `-335` call 2 ruled only the erased-nominee residual on `marked[]`; the `keep` DELIBERATE block says a `keep` "answers the same 200 whatever they are today", but a `keep` of an erased / ended link is 409 `link_stale`, and it reuses "⛔ re-checked" right after "does ⛔ re-run eligibility". Fix: say what each is.
      **APPLIED** — `shapeNomineeLinkExport` says what `-335` call 2 covers (the `marked[]` residual) and that the `namedBy` strip is `-399` call 2's; the `keep` DELIBERATE block says what a keep of an ended / erased link answers (409 `link_stale`); the contradictory "re-checked" wording is gone.
- [x] [Review][Patch] The story's records are stale or overstated [this story: Completion Notes ("Open for review" 4) and the Debug Log's Task 3 note, NE10 / AC3 / round-1 and round-2 notes, the 6,228 baseline, round 2's "Exactly ONE is a regression"; packages/contracts/src/data-export/data-export.ts, packages/domain/src/data-export/assemble.ts] — LOW (family 10). VERIFIED (Auditor b ×3, Auditor m). (a) Both still say a declarer a claim names who submits a NEW mark gets the 422, ⛔ the 409 — `guardDeclare` now runs the claim lock first. (b) The export's `listed` rule is described without the exporting-member conjunct in four places, and Policy meaning has no member-terms sentence for it (family 11). (c) Round 1 says "6,228 at dev complete"; the Debug Log's figure is 6,230. (d) Round 2's "Exactly ONE is a regression the patches caused" is false (see above). (e) The NE10 note presents the `-335` carry-over as settled; it is the author's inference. (f) Two i18n tests assert catalog strings, not that a caller selects `find.matches_count_one`, nor Hindi's `form.will_ask` qualifier. Fix: correct each.
      **APPLIED** — dated notes on the Debug Log's Task 3 ordering and Completion Notes (4) (the 409 now); the 6,228 baseline corrected; round 2's "Exactly ONE" corrected; the NE10 note marks the `-335` carry-over as the author's inference; the `listed` conjunct is described in the contract JSDoc, the `assemble.ts` comment, the NE10 note, AC8 and the Policy meaning; the count wording (`find.matches_count_one`) is executed through the find screen and Hindi's qualifier is asserted.

- [x] [Review][Patch] Say, where the export is described, that a member whose membership has lapsed exports an inbound mark as `ended` with no name (and `live` with the name once they renew) [packages/contracts/src/data-export/data-export.ts (`NomineeLinkNamedByExport` JSDoc), packages/domain/src/data-export/assemble.ts, packages/domain/src/nominee/member-links.ts (`getNomineeLinksForExport` `listed`), this story (NE10 note, Policy meaning member-terms sentence, AC8)] — LOW (family 11, records only; the decision's option 1). Four places describe the `listed` rule without the exporting-member conjunct; Policy meaning has no sentence a member could read. Fix: one sentence in each — *"a mark that names you reads `ended`, with no name, while your membership cannot be shown the request, and `live` with the name when it can"* — and a live test that a lapsed viewer's `namedBy[]` row reads `ended` / `nameSeen: false` and the same row reads `live` after renewal (RED without the viewer conjunct).
      **APPLIED** — the lapsed reading is stated in the contract JSDoc, `assemble.ts`, `getNomineeLinksForExport`'s `listed`, the NE10 note, AC8 and Policy meaning; the live leg proves a lapsed member's row reads `ended` / no name and `live` / name after renewal. Mutant M3 RED.

- [x] [Review][Defer] `contactMatches` takes no abort signal, so the read bound ABANDONS a metered POST — it keeps running, the server still spends the check and writes the audit line, and the response is dropped [packages/api-client/src/index.ts `contactMatches`, apps/mobile/app/(life-events)/nominee-link-find.tsx] — deferred: threading a signal changes the shared 6.36b client; with patch 1 the member can retry, which would spend another of the day's 3. Trigger: a slow-network report, or when the client gains signals.
- [x] [Review][Defer] A concurrent double-submit of a FIRST-EVER declaration (a post-lock-in member, no prior declaration, no fresh elevation) can charge twice across a step-up [apps/api/src/modules/nominee/nominee.handlers.ts `declare`] — deferred: both charge transactions see "not a re-declaration", the first main transaction commits a version, the second then needs a step-up; the charge cannot move into the main transaction without putting the HMAC inside the lock. Reachable only by two overlapping POSTs; the old code charged before every guard.
- [x] [Review][Defer] The same-rank `new` ⇒ carry rule changes NE2's end rule by a dated story note only — no decision-log supersession entry [`-397` NE2, this story] — deferred: a process choice for BigDev (NE3 / NE5 were changed the same way); a `-400`-style author-commit would record "a re-pick of a member already live on that rank is a carry, and the pre-save line says so". Not a contradiction of `-396`.
- [x] [Review][Defer] A draft keeps a picked contact's number in unencrypted storage until the form is saved or discarded — in the dual-number case a number the declared mobile does not hold [apps/mobile/lib/nominee-links.ts `redactForDraft`] — deferred: AC5's design (*"the draft STORES `memberLink`"*); the member's own phone; ⛔ a Panel question (nothing the Trust discloses). The alternative — persisting a pick as "no mark" — costs a second contacts check to resume. Revisit with the privacy-policy line (roster Row 31 (j)).
- [x] [Review][Defer] Several `AnnouncedText` announcements can fire in the same commit on iOS (after `remountWith`: the pick notice, the open question, a stale-reload error) and a later one probably interrupts an earlier one [apps/mobile/app/(life-events)/nominees.tsx] — deferred: SUSPECTED, not traced; needs a VoiceOver run.

Dismissed (8): (1) "the nominees screen spins forever if the marks query is disabled" — third time raised; `useNomineeLinksQuery()` is called with no override, so it is disabled only while the SESSION loads, and the screen is unreachable signed out; (2) "the fingerprint cannot see non-ASCII digits" — the server's `MobileNumber` is ASCII-only (`^[+0-9][0-9\s\-()]*$`), so the field cannot hold them; (3) "operator precedence in the `listed` SQL" — both interpolated fragments are self-parenthesised (`(… AND NOT EXISTS(…))`, `EXISTS (…)`); (4) "a comment-only edit to an applied migration" — nothing pins the file's bytes (only the journal references it) and the migration is unmerged; (5) "the `classification.json` comment is false — no `nominee_link` entry" — the entry exists; (6) "`request.name_note` is a disclosure `-396` does not mention" — `-397` NE6 / `-309` item 3 release the registered name after a yes; (7) "the new `nominees.*_label` keys cannot be caught" — they exist in en and hi `common.json`; (8) "`request.empty` is untrue when a claim hides a request" — deliberate: saying otherwise would disclose the claim.

**Round-3 patches applied 2026-10-24** (BigDev: *"1"* on the decision — keep as built and say it, no new author-commit — then *"1"* — apply every patch). All 21 are applied and **uncommitted** on top of `ae0f3249` (the only commit of the review is `.decision-log.md` `-399`); the Status stays `review`. Verified at the working tree (live suites on the disposable `twt_6_36e`, `:5434`, never `:5432`):
- `@twt/domain` live: 412 files, **6,247 passed**, 1 skipped (6,241 after round 2). `apps/api` live: 179 files, **2,105 passed**, 1 skipped (2,103). `apps/jobs`: 1,441 tests — 73 files green, and the 10.23 gate (it refuses any database not named `twt_dev`) run ALONE with its documented override on this disposable database: 3 / 3. `@twt/contracts` 1,455; `@twt/i18n` 125; `@twt/mobile` 93 files, **1,470** (1,445).
- `tsc` clean across the workspace (turbo `typecheck`, 20 / 20); ESLint exit 0 over every changed and new file, per package; the ten static gates that can see this change exit 0, and the Expo app-config check passes.
- **Twenty-eight mutants, each proven RED then restored byte-for-byte** (a copy compared with `cmp`): backend — M1 the planner's any-rank carry removed, M2 `namedBy` ignoring `state`, M3 the viewer conjunct dropped, M4 the claim-hidden conjunct dropped, M5 the contract admitting `erased`, M6 the contract dropping `ended`; find screen — F1 no in-flight guard, F2 guard never released, F3 a failure back to the fallback, F4 the announcement on `message === null`, F5 no shared call, F6 share-more losing the held matches, F7 *Not in this list?* at 40 dp, F8 the blocked note still offering a way on, F9 the store moved before the epoch guard; requests — R1 unbounded POST, R2 the tapped answer shown, R3 a closed row keeping its buttons, R4 the page spinner during *Retry*, H1 no cache mark; form / lib — N1 no replace / clear rule, N2 *Keep the mark* closing the window on a nameless slot, N3 a refusal outliving its question, N4 a draft keeping the window; screen pins — P1, P2 an unredacted `saveDraft`, P3 a remount not clearing the pick line, P4 frozen text.
- **Round 3's own residuals, ⛔ hidden:** (1) `nominees.tsx` is pinned by PRESENCE on its source (`nominee-screen-draft-pins.test.ts`), ⛔ rendered by any test — what the pick line does on a phone, and in what order a screen reader speaks the pick line, the open question and an error, still need a device; (2) the name window now asks when the name is CLEARED outright (the way to type another one), so a member who backspaces a whole name and types it again is asked once — a choice, recorded in `completeMarkName`; (3) ⛔ `ci:local`, ⛔ a fourth look at THIS round's patches, ⛔ a device run; the branch is still 16 commits behind `main`; the Hindi `nominee_link` copy (now including the reworded `form.will_ask*`, `note.body*`, `request.changed`) awaits BigDev's approval.

#### Fix-diff review — round 4 (2026-10-24, BigDev: *"1"* — a fourth look)

Round 3's OWN patches, as a delta: the pre-round-3 tree was rebuilt from the saved round-3 input diffs (`HEAD` + `r3-backend.diff` + `r3-mobile.diff` — checked byte-for-byte against six files backed up before round 3's edits) and the current tree diffed against it — 1,736 lines, 22 files, ONE chunk (under the 3,000 threshold) × three read-only layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). About 32 raw findings (13 Blind, 7 Edge, 5 + 7 record items Auditor) → **0 `decision-needed` + 10 `patch` + 0 new `defer`, 7 dismissed**; no HIGH. Each kept finding was re-read against the tree. Three layers found the same flaw in round 3's patch 10 (`answerFirst`), two the same hole in patch 5 (the name window), three the same untested control in patch 12; **the Auditor found no patch missing**, and its one MED is a spec record my patches 14 and 15 left stale.

- [x] [Review][Patch] The "Answer the question … first" refusal comes back BY ITSELF — `answerFirst` is set on a refused Save and cleared only by `fail()` and a clean submit [apps/mobile/components/life-events/NomineeForm.tsx `answerFirst`, `commit`, `shownError`] — MED. VERIFIED; three layers (Blind 2, Auditor 2, Edge 1) — a flaw in MY round-3 patch 10. Trigger: edit a marked name, Save (refused), revert / *Keep the mark* / *Remove it*, then edit again: the question reopens and the red, SPOKEN line is back without a Save. The test saves again before retyping, so it cannot see it. Fix: `commit` (every edit, keep and remove) clears the flag — the refusal belongs to the Save that produced it. Test: refused Save → revert → edit again ⇒ no alert.
      **APPLIED** — `commit()` (every edit, *Keep the mark*, *Remove it*) clears the flag; a test refuses a Save, reverts, then edits again ⇒ no alert and nothing spoken. Mutant A1 RED.
- [x] [Review][Patch] The name-pending window is still passable by sharing a LETTER — it is judged per keystroke on `startsWith` either way [apps/mobile/lib/nominee-links.ts `completeMarkName`] — MED. VERIFIED; two layers (Blind 1, Edge 6) — a hole in MY round-3 patch 5. Select-all and type "A" over "Asha" (an edit whose result is a prefix of the old name), or backspace to "A" and type "nil": every keystroke is a prefix of the last, so a different nominee gets the mark with no question — the "mark rides onto another person" failure the window was meant NOT to reopen. Fix (the SAFE direction, a cost recorded): the window completes only an EXTENSION of the name (typing on, or the first letters from empty); ANY shortening asks. Cost: a typo fixed by a backspace asks "Is this still …?" once (*Keep the mark* closes the window, and the next edits ask as they always have). Round 3's "a typo fixed by a backspace is the same name" is withdrawn. Tests: logic + form render (select-all + "A", backspace-then-retype, the extension still silent).
      **APPLIED** — `completeMarkName` completes only an EXTENSION (or the first letters); every shortening, replacement and clearing asks, and the question stays open through the keystrokes that follow. Cost recorded: a typo fixed by a backspace asks once; round 3's "a backspace typo is the same name" is withdrawn. Logic + form render tests (select-all + "A" then "nil", backspace, paste, clear, *Keep the mark* on a nameless slot). Mutant A2 RED.
- [x] [Review][Patch] "Every control on the matches is at least 48 dp" is not what the test proves — the iOS *Share more contacts* button is `size="$3"` with no height, and the test renders full access only [apps/mobile/app/(life-events)/nominee-link-find.tsx, apps/mobile/tests/unit/nominee-link-find-render.test.ts] — LOW-MED. VERIFIED; three layers (Blind 5, Auditor 3, Edge 7). Fix: `height={48}` on it; the test renders limited access and asserts every button; the comment's "NaN" is wrong (`Number(null)` is 0) and is corrected. (The requests screen's *Retry* / *Show more* at 40 dp follow the repo's convention for secondary links and are ⛔ in this finding.)
      **APPLIED** — *Share more contacts* is `height={48}`; the render test runs full AND limited access, asserts the button count (none escapes) and that each is at least 48 dp; the `NaN` comment is corrected. Mutant A3 RED.
- [x] [Review][Patch] A second instance of the find screen does not CONSULT the session before checking — leaving mid-check protects only the time the call is in flight [apps/mobile/app/(life-events)/nominee-link-find.tsx `check`] — MED. VERIFIED (Edge 2). The session is read once, in the `useState` initialiser; the first call settles while the member reads the note (it stores its matches in the session), and the new instance's *Continue* then finds `inFlightCheck` empty and spends another of the 3 a day for numbers the session already holds. Fix: a first (⛔ held) `check()` shows the session's matches at once when it has them — no read, no call. Test: leave mid-check, let it settle on the note, tap *Continue* ⇒ ONE match call.
      **APPLIED** — a first (⛔ held) `check()` shows the session's matches when it has them (no read, no call); a render test leaves mid-check, lets it settle on the note, taps *Continue* ⇒ ONE match call, ONE contacts read. Mutant A4 RED.
- [x] [Review][Patch] A check abandoned at the read bound is retried as a FRESH metered call while the first may still be running and succeed — and `shareNomineeLinkCheck` has one slot [apps/mobile/app/(life-events)/nominee-link-find.tsx, apps/mobile/lib/nominee-links.ts] — LOW-MED. PLAUSIBLE→VERIFIED in code (Edge 3, Blind 12). The shared promise is the BOUNDED one, so the slot frees at 15 s although the request cannot be aborted (`contactMatches` takes no signal — round 3's defer 1); a retry then starts a second call, and 3 of them burn the day. A call with a different key also overwrites the slot. Fix: share the RAW call (held in the slot until IT settles, a `Map` by numbers), have the call store its own result in the session (guarded by the epoch), and bound each CALLER separately with `withReadTimeout`; with the previous patch, a retry after a late success shows the session's matches instead of calling again. The defer (an abort signal in the shared client) stays — this removes the double charge, ⛔ the wasted request.
      **APPLIED** — `shareNomineeLinkCheck` is a `Map` by numbers and holds the RAW call until it settles; the call stores its OWN result in the session (epoch-guarded); each caller is bounded separately. Render tests: a never-settling call is attached to by *Continue* (ONE call); a call that lands after the bound is found in the session (no second call, no second read); unit test: a different set of numbers does ⛔ displace the first. The abort signal stays deferred. Mutants A5, A6 RED.
- [x] [Review][Patch] The answers screen has no SYNCHRONOUS in-flight guard and mints a fresh Idempotency-Key per tap — after the 15 s bound a retry races a POST that may have landed [apps/mobile/app/(life-events)/nominee-link-requests.tsx `onAnswer`; apps/mobile/tests/unit/nominee-link-requests-render.test.ts] — LOW-MED. VERIFIED in code (Edge 4, Edge 5, Blind 3) — mine (round 3 patch 8 introduced the bound). Two taps in one batch, or a tap after the timeout, send a second POST that can only answer 409 `request_closed`: a red "can no longer be answered" beside "saved". And the "recorded, not tapped" test covers a case this screen cannot produce (a fresh key never replays). Fix: a ref guard like the find screen's; the key is kept per (request, answer) across a non-final failure and dropped on success or a closure, so a retry of the SAME answer replays the first outcome; the "recorded" test and the record are made honest (the screen believes the server's response — today equal to the tap); tests: a double tap makes ONE POST, a retry after the stall carries the SAME key.
      **APPLIED** — a ref guard (one answer at a time) and an Idempotency-Key kept per (request, answer) across a non-final failure, dropped on success and on a closure; the `lib/idempotency-key` mock is a counter. Render tests: two taps in one batch ⇒ one POST; a retry of the same answer after the stall carries the SAME key, the other answer a new one. The "recorded" test and round 3's APPLIED line are made honest. Mutants A7, A8 RED.
- [x] [Review][Patch] The closed row says "The list is being reloaded." for as long as the row stands — a TRANSIENT state in persistent text [apps/mobile/app/(life-events)/nominee-link-requests.tsx; test] — LOW. VERIFIED (Blind 7). If the reload stalls or fails, the row claims one is under way forever. Fix: the row's own line is always `request.closed` ("This request can no longer be answered."); the transient `request.changed` stays in the spoken alert only.
      **APPLIED** — the closed row's line is always `request.closed`; "being reloaded" stays in the spoken alert; the render test asserts the row does ⛔ say "reloaded". Mutant A9 RED.
- [x] [Review][Patch] Records and comments that overstate or went stale [this story NE2 note and AC3; apps/mobile/tests/unit/*-render.test.ts headers ×3; packages/contracts/src/data-export/data-export.ts; packages/domain/src/nominee/member-links.ts; packages/domain/src/nominee/member-links.ts `getNomineeLinksForExport`; apps/mobile/lib/nominee-links.ts `withRequestAnswered`; `deferred-work.md` round-3 item 3] — MED→LOW (family 10). VERIFIED; Auditor 1, records list, Blind 4. (a) **NE2's dated notes still say the same member on the OTHER rank is a `duplicate` and cite "unless they have already answered"** — patches 14 and 15 changed both with no dated note on NE2 / AC3, and `deferred-work.md`'s supersession item describes only the same-rank rule (the any-rank carry departs from `-397` NE2 further): add the dated note, widen the deferred item (the author-commit `-400` it proposes would record "a re-pick or a move of a member already live is a carry, and the pre-save line says so"). (b) Three test headers say "only `react-native` … is mocked" beside the corrected list (form header line, find, requests). (c) The contract JSDoc says "an ACTIVE membership"; `nomineeLinkAnswererSql` admits `active` and `active-in-grace`. (d) The lapsed reading's comment is absent from `getNomineeLinksForExport`'s SQL (patch 21's APPLIED line says it is there). (e) ⚠ "**`-399` call 2 as written**" — used in the contract JSDoc, `member-links.ts`, the NE10 note, the ledger, and in the framing of the decision BigDev answered — OVERSTATES: call 2's enumerated list is *removed or corrected, erased declarer, claim-named declarer*; a lapsed viewer is covered by its PRINCIPAL clause (*"only on a row the app lists to the marked member"*) read literally, not by name. BigDev's *"1"* stands (keep and say it); the wording becomes "`-399` call 2's principal clause, read literally". (f) `withRequestAnswered`'s comment says a denied page "carries no items" — `DENIED_NOMINEE_LINK_REQUESTS_PAGE` carries `items: []`. (g) Round 3's APPLIED line for patch 9(a) ("a test where the server answers `confirmed` to a tap on No") claims a reachable scenario — see the answers patch.
      **APPLIED** — NE2 and AC3 carry dated notes (any-rank carry, the reworded pre-save line, "changed by dated note only"); `deferred-work.md`'s supersession item is widened; the form test's header no longer says "only `react-native` is mocked" and the find and requests headers list their mocks; the contract JSDoc says `active` or `active-in-grace`; `getNomineeLinksForExport` carries the lapsed reading beside its SQL; "`-399` call 2 as written" is now "its principal clause, read literally" in the code, the NE10 note and the AC8 note; `withRequestAnswered`'s comment is true (`items: []`); round 3's APPLIED line 9(a) is corrected.
- [x] [Review][Patch] Test hygiene [apps/mobile/tests/unit/nominee-links-logic.test.ts, apps/mobile/tests/unit/nominee-screen-draft-pins.test.ts, packages/domain/tests/integration/nominee/member-links.spec.ts, apps/api/tests/unit/nominee-link-twins.test.ts, packages/i18n/tests/nominee-link-copy.test.ts] — LOW (family 10). VERIFIED (Auditor 4, 5; Blind 6, 13). (a) The draft test's last assertion (`slot(pending).memberLink.namePending`) reads a fresh fixture and cannot fail — it becomes "the INPUT forms are not mutated by `redactForDraft`". (b) The moved-mark live test claims `asked_at` is kept and never asserts it. (c) The twins pin proves "no other word" with ONE word — it now compares the `marked` list's `state` options to the domain's exact set (the `namedBy` one is a refined schema without `.shape`). (d) The source pin slices to a marker it never checks exists (a rename widens it to the whole file), strips `//` inside strings, counts only single-line `saveDraft(` calls and matches `redactForDraft\(\w+\)` only: marker existence asserted, comments stripped only at a word boundary, calls extracted with a paren matcher, the argument matched as any expression. (e) Hindi `note.body` / `note.body_no_name`, English `note.body_no_name` presence and `request.changed` (en + hi) are ⛔ pinned though patch 15's record says "pinned in en and hi".
      **APPLIED** — the draft test asserts the INPUT forms are not mutated; the moved-mark live test asserts `asked_at`; the twins pin compares the `marked` list's `state` and `answer` options to the domain's exact sets; the source pin asserts its markers exist, strips comments at a word boundary, extracts calls with a paren matcher across lines, and matches any `redactForDraft(…)` argument; Hindi `note.body*`, English `note.body_no_name` and `request.changed` (en + hi) are pinned. Mutants A10 (an extra export state), A11 (a multi-line unredacted writer) RED.
- [x] [Review][Patch] `planNomineeLinks` keeps a dead first lookup and a comment that contradicts it [packages/domain/src/nominee/member-links.ts] — LOW. VERIFIED (Blind 11). `live.find(rank && member) ?? live.find(member)`; the comment says a member cannot be live on both ranks — then the first `find` is the second's subset. The live-link unique index is on `version_id`, but a second link for one member would have been refused as `duplicate` at the save that made it. Fix: one lookup, the comment says why.
      **APPLIED** — one lookup, `live.find(member)`, and the comment says why (a member is live on at most one rank); the planner tests (move, move beside a new member, duplicate) and the live moved-mark leg stay green.

Dismissed (7): (1) "*Your contacts are not stored* sits beside a picked number in draft storage" (Blind 8) — the sentence is about the CONTACT LIST (`-396` Q2 A, the Panel's words); the picked-number residual is round 3's defer 4; (2) "the blocked note is a dead end" (Blind 9) — deliberate: the spoken line states the reason, the caller gate refuses BEFORE the counter (a leg asserts it), and leaving and re-entering costs nothing; (3) "the export reports a still-live mark as `ended` for a lapsed member" (Blind 10) — BigDev's *"1"* of this round, stated in the contract JSDoc; (4) the `r.state === 'live'` belt-and-braces "only exercised by an impossible input" (Blind 10) — that is its purpose; the unit leg isolates it; (5) the form copy "this same mark" does not say a move between ranks counts (Blind 11) — "the same mark" is the member's own act of marking that person; (6) a Hindi IME autocorrect raising the question needlessly (Blind 13) — a nuisance in the SAFE direction; (7) the requests screen's *Retry* / *Show more* at 40 dp (Edge 7) — the repo's convention for secondary links (the same height as the nominees screen's own).

**Round-4 patches applied 2026-10-24** (BigDev: *"1"* — apply every patch; the first attempt was cut by a usage limit and finished after it reset). All 10 are applied and **uncommitted** on top of `ae0f3249` (the only commit of the review is `.decision-log.md` `-399`); the Status stays `review`. Verified at the working tree (live suites on the disposable `twt_6_36e`, `:5434`, never `:5432`):
- `@twt/domain` live: 412 files, **6,247 passed**, 1 skipped (unchanged — the round's domain edits are a simplification and one assertion). `apps/api` live: 179 files, **2,105 passed**, 1 skipped. `apps/jobs`: 1,441 tests — 73 files green, and the 10.23 gate (it refuses any database not named `twt_dev`) run ALONE with its documented override on this disposable database: 3 / 3. `@twt/contracts` 1,455; `@twt/i18n` 125; `@twt/mobile` 93 files, **1,478** (1,470).
- `tsc` clean across the workspace (turbo `typecheck`, 20 / 20); ESLint exit 0 over every changed and new file, per package; the ten static gates that can see this change exit 0, and the Expo app-config check passes.
- **Eleven mutants, each proven RED then restored byte-for-byte** (`cmp` against a copy): A1 the flag kept by `commit`, A2 the prefix-passable window, A3 *Share more* unsized, A4 no session consult, A5 the call not storing its own result, A6 one in-flight slot, A7 no answer guard, A8 a fresh key per tap, A9 the reload line on the row, A10 an extra export state, A11 a multi-line unredacted `saveDraft`.
- **Round 4's own residuals, ⛔ hidden:** (1) a typo fixed by a backspace after a pick now asks "Is this still …?" once — the safe direction, a choice (BigDev may veto); (2) the abort signal in the shared client is still ⛔ threaded (round 3's defer 1) — a timed-out request still runs to its end, only the second charge is gone; (3) `nominees.tsx` is still pinned by PRESENCE only, and a VoiceOver / device run is still owed; (4) the any-rank carry and the reworded pre-save line change NE2 by dated note only — the `-400` author-commit is BigDev's call (`deferred-work.md`); (5) ⛔ `ci:local`, ⛔ a fifth look at THIS round's patches, ⛔ a device run; the branch is still 16 commits behind `main`; the Hindi `nominee_link` copy (including the reworded `form.will_ask*`, `note.body*`, `request.changed`) awaits BigDev's approval.

**Device run 2026-10-24 (BigDev: *"commit it, then do the device run"*) — Android emulator `Pixel_9` (Android 15), the committed tree at `295584c0`.** A real dev-client build from this worktree (`expo prebuild` + `expo run:android`, ≈12 min with the Gradle cache), Metro from the worktree, the real API (`apps/api`, `KMS_TEST_MODE=fake`, the pepper the seed used) against the disposable `twt_6_36e` (`:5434`, ⛔ `:5432` / `:5433`), one seeded Pariwar (a declarer and two members), three contacts inserted into the emulator (two members, one non-member), login by the dev OTP stub. **Driven by `uiautomator` dumps + `input` events + screenshots — ⛔ by a person, ⛔ with TalkBack or VoiceOver.**
- **Worked, end to end:** login → Life events → the nominee form (the marks read gates the form) → *Find them in your contacts* → the note (the corrected wording) → *Continue* → the system contacts read → `POST contact-matches` → ONLY the two members listed, the non-member ⛔ → pick ⇒ the form takes the mark, the number is OFFERED as the declared mobile (`9876500001`), "Marked as a member: …", the pre-save line (new wording) → typing the full name after the pick asks ⛔ (the window) → ONE backspace asks "Is this still …?" (round 4's rule) → *Keep the mark* ("Mark kept.") → a first save returns 403 → the step-up OTP prompt → verify → the save succeeds (200) and the member is back on Life events ("On record") → the DB: ONE live link, `found_by = contacts`, and `nominee_link_resolve` = 1 (charged ONCE across the step-up round trip, round 1's fix) → the marked member's home shows "Someone has named you as their nominee — Tell them whether it is you" (⛔ a name on the card) → the requests screen names the declarer, says what a yes shows and what stands, both answers 48 dp with the declarer's name in their labels → *Yes* ⇒ "Your answer has been saved." + "You said this is you.", no buttons, the home card gone, the DB `confirmed` → the declarer's form now reads "Confirmed — Meena Sharma" (the registered name, ⛔ the name saved on the phone) → the API down: *Continue* returns to the NOTE with "Something went wrong. Try again.", *Continue* and *Don't read my contacts* both still there (round 3's fix) → *Don't read my contacts* ⇒ the typed-number field ("That is not a mobile number." for a bad one; a good one ⇒ "Marked as a member", no name) → Hindi: the form, the confirmed label ("पुष्टि हुई — Meena Sharma"), the explanatory line and the buttons render without truncation.
- **Found:** (1) **the installed dev client predated `expo-contacts`**: every contacts screen failed to load ("Cannot find native module 'ExpoContacts'") until a native rebuild — a build gap, ⛔ a code fault; an older dev client will do the same; (2) **the mark controls are 36 dp tall** *[PATCHED the same day, BigDev: "1 and 2" — `height={48}` on all five, a render test per control, two mutants RED]* (*Find…*, *Pick a different member*, *Remove mark*, *Keep the mark*, *Remove it* — `size="$3"`, like the relationship chips), against 44–56 dp for the form's other buttons; for this audience *Keep the mark* / *Remove it* are the safety-relevant choices — recorded in `deferred-work.md` with a recommendation; (3) on the find note the lower part of the screen is a different grey from the content block (the content's background ends where the content does) — seen, ⛔ checked whether other screens do the same; (4) a restarted API signs with fresh ephemeral JWT keys, so a session from before the restart gets a 401 (dev only; ⛔ the story).
- **NOT covered, ⛔ hidden:** iOS / VoiceOver (no simulator build here; `announceForAccessibility` ⛔ exercised); TalkBack's SPOKEN output (the accessibility TREE was read — labels, roles, sizes — ⛔ what is spoken or in what order); the contacts-permission DENIED path and iOS limited access; the daily-limit refusal (the meter was not run to 3); a second nominee and a move of the mark between ranks; the draft save-and-resume; a person's hand on a real phone.

**Rebase + `ci:local` 2026-10-24 (BigDev: *"1 and 2"*).** `git fetch origin`: `origin/main` = `6c4c1e47` (16 commits, ALL story 5.11; ⛔ a new migration, so `0181` stands). `git rebase origin/main` replayed the 21 commits; the only conflicts were the shared ledgers every story prepends to — `sprint-status.yaml`, `.decision-log.md`, `deferred-work.md` — resolved by keeping both (mine above main's 5.11 entries; an explicit `---` between decision and deferred-work entries, the trap `project_rebase_ledger_conflict_separator` records), the YAML re-parsed (row `review`, 5.11 `done`), the code diff compared with the pre-rebase tip (identical but one hunk's line number). Tip `49d78454` at the rebase, ⛔ pushed. **`ci:local`** on a fresh database (`twt_6_36e_ci`, :5434, ⛔ :5432 / :5433), `DATABASE_URL` exported and `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS=1`: 34 of 36 jobs green in the one run (lint, typecheck, build, db-check and every gate; integration: domain 6,249, queue 4, events 36, niyamavali-engine 144, channels 452, validity-service 284, jobs 1,579). The two reds, each re-run ALONE: (1) `test (unit)` — `apps/admin` `helpline-claim-page.test.tsx` "a STALE bank-save 403 from claim A does NOT raise the step-up panel" (a 6.18 test, ⛔ this story's) timed out at 5.2 s under load; alone 17 / 17 — the CPU-contention flake `project_ci_local_concurrency_oversubscription` records; turbo then cancelled `api`, `jobs`, `domain`, `i18n`, whose unit-mode runs are now green (i18n 125; api 635 + skips; jobs 1,032 + skips; domain 2,939 + skips); (2) `integration-tests` — the 10.23 restoration gate refused the database name (turbo strips the override from its environment) and the abort left `apps/api` unrun: the gate alone with its override 3 / 3, `apps/api` live alone 2,105 passed. ⛔ NOT a single 36 / 36 invocation: the same two reds the dev-complete run had (`ledger 2026-10-24g`), the same remedies.

**Device run, second pass 2026-10-24 (BigDev: *"yes, do it"* — the paths the first pass left out).** The same Android emulator (`Pixel_9`, Android 15, Play-Store image), the REBASED tip (`49d78454`, Metro from this worktree), the real API on `twt_6_36e`, a second seeded declarer (Anita Verma, `9811100002`) beside the first Pariwar's three members; driven by `uiautomator` + `input` + screenshots, plus TalkBack itself for the speech checks. **Worked:**
- **Contacts permission DENIED:** the system prompt → *Don't allow* → "Contacts access was not given." with the typed-number field open; ⛔ a counter row spent (no metered call was made). A later *Continue* asks again and *Allow* ⇒ the matches.
- **Contacts-check daily limit:** the counter at 3 ⇒ the API's 429 ⇒ the typed fallback with "You have checked your contacts three times today. Try again tomorrow."
- **Mark daily limit:** four new marks in a day (two typed / contacts, then a swap) and a fifth ⇒ "You have marked nominees as members too many times today. Try again tomorrow, or save your nominees without the mark." (read in full on the screenshot); the counter stays at 4.
- **A second nominee** (typed number on rank 1, contacts on rank 2; one save, ONE step-up; `nominee_link_resolve` = 2, `contact_match_requests` = 1); **Kiran answers *No*** ⇒ the declarer's form reads "Said it is not them" + "The mark still counts until you remove it or pick again.", and a question about that kept mark reads "Is this still the member you marked?" (⛔ a name); **a swap of the two marks** (Kiran on rank 1, Meena on rank 2, both as new picks) ⇒ BOTH links carried across ranks in the database — Kiran's `not_me` travelled with him, Meena's `asked_at` stayed, the old rows ended `redeclared` — and the second rank's finder showed the SESSION's matches at once, ⛔ a second contacts call.
- **Draft save-and-resume:** leaving the form mid-edit and re-entering shows "You have an unfinished update…"; *Continue* restores the name, the relationship and the mobile (`Kiran Rao`, Sister, `9876500002`) with the marks re-read from the server. **The stored draft** (`run-as`, the app's MMKV file): ⛔ "Meena from school", ⛔ "Kiran from work", ⛔ any other member's registered name; present: the declared names and numbers the member TYPED, `memberLink`, and the picked number (AC5's design, recorded residual).
- **The 48 dp patch on the device:** *Pick a different member* 199 × 48 dp, *Remove mark* 130 × 48 dp, the second slot's *Find…* 347 × 48 dp.
- **TalkBack** (the Google `talkback` package on the image; its utterances read from TalkBack's own log in the seconds after it starts, before its TTS is ready — the ONLY window in which it logs the text): activating *Remove mark* ⇒ "Mark removed." (ONCE); typing "x" into a marked slot's name ⇒ the typing echo "x", then "Is this still the member you marked?" (ONCE); *Save my nominees* with that question open ⇒ "Answer the question about the member mark first.. Alert" (ONCE); *Not in this list?* ⇒ "Type their mobile number" (ONCE).
- **Found (not patched):** (1) "Mark kept." stays on screen, in small type, above the next red refusal until the member edits — cosmetic; (2) the re-declaration form starts EMPTY (3.9's G14) — *[DECIDED the same day, BigDev: "C: server keeps the details" ⇒ Story 6.36f, backlog]* — so removing or swapping ONE mark means retyping every nominee's name, relationship and mobile — the first save was refused "Please enter your nominee's mobile number." for the unchanged first nominee — pre-existing, ⛔ this story's, but the marks make it likelier to be met; (3) after a *No*, the nominee's own row still says "While this stands, you will not be asked about … death" — as ruled (`-396` Q1 A: the answer changes ⛔ who is asked).
- **NOT covered, ⛔ hidden:** iOS / VoiceOver (only the Command Line Tools are installed — ⛔ Xcode, ⛔ `simctl`); iOS limited access; TalkBack on the REQUESTS screen and on the whole reading ORDER of a screen (only four utterances were read, ⛔ a swipe-through); TalkBack in Hindi; the speech text once TalkBack's TTS is ready (⛔ logged — each capture above is the first utterance after enabling it, so a SECOND utterance cannot be excluded beyond what the screen shows); a real phone in a real hand.

**Wording of "asked", 2026-10-24 (BigDev: *"they will be asked in the app raises a question for the member — what will be asked? We need to clarify that"*; chosen: *"see your name, confirm it is them"*).** The finder note (`note.body*`) and the pre-save line (`form.will_ask*`) now read *"…they will see your name and be asked in the app to confirm that it is them"* / *"When you save, [Name] will see your name in the app and be asked to confirm it is them. A member who has already answered this same mark is not asked to confirm again."*; the declarer's unanswered label `label.asked` *"Asked"* → *"Waiting for their answer"*. The question the nominee sees is unchanged (*"…Is that you?"*). Hindi redrafted to match (awaits BigDev's review). Author-level copy (⛔ Panel-quoted: `-396` Q2 A says only that the marked member is told in the app); ⛔ a decision-log entry. The death-word guard of `-401` still passes (it pins ⛔ "asked about", ⛔ death words — ⛔ "asked to confirm").

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

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 6.36e`, 2026-10-24.

### Debug Log References

- **Test database:** a FRESH `twt_6_36e` on the `:5434` container (`twt-test-pg-b`; `ALTER DATABASE … SET timezone 'UTC'`; the
  project's migrator, 181 migrations). ⛔ `:5433` — an unmerged `0181` there would make 11b-4's planned `0181` (the same journal
  `when` step) skip silently ([[project_sibling_migration_when_order_shared_db]]); ⛔ `:5432`.
- **Task 1:** policy spec 19 / 19; neighbours (6.36b policy, 6.20 history policy, `tests/integration/nominee`) 74 / 74. One spec
  assertion corrected on the first run: under ANOTHER Pariwar's scope the BEFORE INSERT check refuses (23514 — the version is
  invisible) BEFORE RLS's WITH CHECK (42501) is reached; pinned as such.
- **Task 2 mutations (each RED with its line removed, restored after):** the fragment's account half (`OR member_id = ANY(…)`) ⇒ 3
  snapshot legs + the labeller, replacement-walk and reminder legs RED; `peerMeshNomineeLinkedMembersAsOf`'s ended-before-cut filter
  ⇒ the forged-erasure leg RED; its projected-version filter ⇒ the recorded-after-cut leg RED.
- **Task 2 runs:** `peer-mesh-nominees.test.ts` 20 / 20; `member-links.test.ts` (the plan) 9 / 9; `member-links.spec.ts` 14 / 14
  (first run 4 red — a FIXTURE fault: a second `scene()` seeded members under the first Pariwar's app scope, 42501; fixed by a
  `RESET ROLE`); `member-links-concurrency.spec.ts` 2 / 2; the peer-mesh snapshot / request / reminder / concurrency specs 126 / 126.
  Full `@twt/domain` (live, `twt_6_36e`, load ≈ 25–32 from a peer session): **6,228 passed, 1 failed, 1 skipped** — the one red was
  this story's race spec: its version seed read `clock_timestamp()` TWICE in one INSERT, so under load `effective_at` landed a µs
  after `recorded_at` (0119's CHECK). Fixed (ONE read); 2 / 2 alone.
- **Jobs / api on the renamed path:** `claim-peer-mesh.test.ts`, `claim-contact-ladder-whatsapp.test.ts` (the hash fence),
  `claim-peer-mesh-requests-live`, `claim-peer-mesh-wa-reminders-live`: 190 / 192 — the two reds (`response after the AR-61 outcome
  resolved…` and `round-2 P4 — the marker's OWN 72-hour recheck…`) each failed at ~20.9 s (the 20 s timeout) under load ≈ 32 and
  passed ALONE (1 / 1 each); neither touches the nominee path. `peer-request-after-send.spec.ts` 1 / 1. `tsc` clean for
  `@twt/domain` (src + tests), `apps/jobs`, `apps/api` (`@twt/domain` resolves to SOURCE — ⛔ a stale dist); ESLint exit 0.
- **Hash fences:** every `createHash('sha256')` pin in `apps/*/tests` and `packages/*/tests` cross-checked against the changed
  files — ONE hit, `peer-mesh-wa-reminder.ts` in `claim-contact-ladder-whatsapp.test.ts`, re-taken with a dated note (the diff is the
  `nomineeMatch` rename and its type import only).

- **Task 3 runs (`twt_6_36e`):** the new `nominee-member-link.spec.ts` 16 / 16 (first run 13 / 15 — two TEST faults: the KMS hook
  also records the declare's field ENCRYPTIONS, so the leg now counts HMAC lines only; and the "unresolvable" loop wrongly listed the
  declarer's OWN number, an eligible member to any OTHER declarer — the self-mark leg is its own). Mutants (each RED, restored): the
  signup route's `allowLink` guard off ⇒ the NE4 leg RED; the charge skipped ⇒ the V2 leg RED. Neighbours: `tests/integration/nominee`,
  `life-events`, `known-people` 71 / 71; `login-wall.spec.ts` 5 / 5; api unit 593 / 593 (the number fence 2 / 2 with its new
  positive controls); contracts 1,453 / 1,453; api-client 38 / 38; domain known-people 83 / 83. `pnpm contracts:emit-openapi` + the
  determinism check + the PII scrape green. `tsc` clean for contracts, domain, api, mobile; ESLint (per package) exit 0.
- **Task 4 runs (`twt_6_36e`):** three new jobs legs — the SELECT job (a marked colleague, ⛔ ranked; a `not_me`-answered mark still
  excludes — PQ1 A; the same world with ⛔ mark ranks them: the positive control), the REQUEST child (`no_target:peer_is_nominee` and
  the replacement texted), the REMINDER child (`skipped_recipient_ineligible`, zero Meta calls) — each with the declared number one
  NOBODY signs in with, so the account is the only match. Mutant: `peerMeshNomineeMatch` returning ⛔ `memberIds` ⇒ all three RED
  (restored). The four peer-mesh jobs files in full: 195 / 195 (the two earlier load timeouts green under lower load). `tsc` +
  ESLint clean for `apps/jobs`. AC7's two staff-line legs are in `peer-mesh-workplace-snapshot.spec.ts` (Task 2).
- **Task 5 runs:** `nominee-links-logic.test.ts` 11 / 11 (TR9's old draft ⇒ `keep`, the stale keep, the swap, the refusal keys,
  the entry's denial, the session memory); `nominee-form-link-render.test.ts` 8 / 8 (jsdom; RTL `cleanup`; `lib/mmkv` mocked) — an
  unedited re-save sends `keep`, *Remove mark* sends none, an edited slot ASKS first (the save refused until answered), the signup
  form sends ⛔ mark. Mutant: the form's "answer first" guard off ⇒ the edit leg RED (restored). The whole mobile suite 1,407 /
  1,407; `tsc` + ESLint clean. i18n: `nominee-link-copy.test.ts` (the real `t()`: registered, member-facing, every key en + hi,
  the story's English verbatim, WCAG 2.5.3 on the pick button) — the package 122 / 122; `check-parity` green. `router.push`
  targets grepped by hand (TR11): `/(life-events)/nominee-link-find` and `/(life-events)/nominee-link-requests` — both files exist
  (typed routes are absent in a worktree, so `tsc` cannot check an `Href` — [[project_mobile_typed_routes_worktree]]).
- **Task 6 runs (`twt_6_36e`):** `rtbf-anonymize.test.ts` 22 / 22 — the pin RAISED (27 statements, 24 tables; ⚠ 11b.4 also raises
  it — whichever lands second re-bases) and a new leg (ONE statement, LIVE only, declarer OR nominee); `eraseNomineeLinks` rewritten
  in the drizzle BUILDER form (the same SQL) so the pin captures it by table. `apps/jobs/tests/data-export.test.ts` 4 / 4 — a new leg
  builds a REAL export (the strict parse of every section) for a member with two marks (one confirmed, one asked) who is also marked
  by another member: the name only on the confirmed mark and on `namedBy`, ⛔ a member id. First run: a FIXTURE fault (fake
  `enc:v1:n` version ciphertexts — the export decrypts every version), then an ORDER found: one save's marks share `asked_at`, so
  `getNomineeLinksForExport` fell back to the random link id — now `asked_at, rank, version_no, link_id`. Domain export / rtbf /
  nominee integration 78 / 78; contracts `nominee-member-link.test.ts` 10 / 10 (the export shape added); OpenAPI re-emitted —
  unchanged (`ProfileSection` is ⛔ in it).
- **Task 7 — `ci:local`** (`DATABASE_URL` = `twt_6_36e` on `:5434` — ⛔ `:5432`, ⛔ the shared `:5433`; load ≈ 3): **34 / 36 jobs
  green** (lint, typecheck, build, unit, i18n-parity, pii-scrape, schema-diff, contracts-determinism and every invariant gate). The
  TWO reds, named ([[project_known_livedb_test_failures]] — ⛔ hidden):
  1. `friction-budget` — the mobile files changed with ⛔ declaration in `friction-budget.md`: a REAL gap of this story. Fixed — ONE new
     `optional` row (marking a nominee who is also a member) + the Story 6.36e disposition block (6.36b's shape), committed;
     `pnpm friction:check` green after the commit (AC-4 reads committed history).
  2. `integration-tests` — ONE file, `apps/jobs/tests/restoration-discipline-production-path-live.test.ts`, REFUSED to run: its gate
     allows only a database named `twt_dev` (it writes to an append-only table). `twt_6_36e` is this story's own DISPOSABLE database, so
     the gate's documented override (`TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS=1`) was set for that ONE file: 3 / 3. ⛔ A code fault. Turbo
     stopped the run there, so the API package's live suite had ⛔ run — run on its own: **2,096 passed, 1 skipped**. The rest of
     integration: domain **6,230 / 6,231** (1 skipped), jobs 1,438 (+ the 3 above), channels 446, validity-service 284,
     niyamavali-engine 144, events 36, queue 4. Unit (the same run): contracts 1,455, mobile 1,407, admin 1,263, public 748, …
- **Task 3 — a found ordering, kept as specified:** AC3's order puts the caller gate (step 1) BEFORE the claim lock (step 3), so a
  declarer a claim names who submits a NEW mark gets the ONE 422 `nominee.link_not_found`, ⛔ the 409 `nominee.locked_claim_filed` —
  a `keep` or a plain save still gets the 409 (the leg asserts both routes of it). Harmless: the status read already says
  `locked: true`, so the app shows the locked state before any save.
  *Dated 2026-10-24 (code review round 1 + fix-diff round 3): SUPERSEDED — `guardDeclare` runs the D3 lock and the terminal-state check
  BEFORE the charge, so a declarer a claim names who submits a NEW mark now gets the 409 `nominee.locked_claim_filed` (the leg asserts
  it); the order above is the ORIGINAL.*

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
- 2026-10-24 — DEV (`bmad-dev-story 6.36e`, ledger `2026-10-24e`): row → in-progress. **Task 1** (`c78b8950`): migration
  `0181_member-nominee-links` exactly as NE1 (answer × state, both written once; the guard; the BEFORE INSERT version check; the live
  UNIQUE per version; per-command RLS + FORCE, ⛔ DELETE) + `nominee_link_resolve` in `member_daily_counters_counter_check` (LOCKSTEP
  with `MEMBER_DAILY_COUNTERS`); schema, RLS mirror, `NomineeLinkId`, barrels; an extra `(version_id)` index for the exclusion's read
  (it must see ENDED rows, which the live UNIQUE does not cover).
- 2026-10-24 — **Task 2**: `nominee/member-links.ts` — `chargeNomineeLinkResolve` (6.36b's caller gate + the counter, all-or-nothing;
  6.36b's `chargeMemberCounter` EXPORTED for it — the SAME upsert), `resolveNomineeLinkTargets` (`knownPersonEligibleSql`, imported
  from `../member/known-people.js` directly — TR13), `lockLiveNomineeLinks` (`FOR UPDATE OF l`, with `onHead` computed BEFORE the
  save appends), PURE `planNomineeLinks` (NE2's carry / end / insert and the three refusals) + `applyNomineeLinkPlan` (ends dated the
  save's `recordedAt`; a carry copies the answer and `asked_at` IN SQL, µs kept), `listNomineeLinksForDeclarer` (head versions),
  `listNomineeLinkRequests` (keyset; ⛔ a dead declarer's), `answerNomineeLinkRequest` (once; `request_closed` / `not_found` /
  `not_available` — the answerer gate `nomineeLinkAnswererSql`), `eraseNomineeLinks` (live only), `getNomineeLinksForExport`,
  `listNomineeLinksOfVersions` (the exclusion's read). 6.36d's fragment widened to `PeerMeshNomineeMatch` (numbers OR marked
  accounts); `nomineeMatch` REQUIRED on every ND4 type; `peerMeshNomineeMatch` reads the links in the SAME `inScope` read (DB only)
  through pure `peerMeshNomineeLinkedMembersAsOf`; `peer_is_nominee` reused. ⚠ Done WITH Task 2 so the tree builds: Task 4's
  RENAME half (jobs + fixtures + the hash pin) — Task 4's own legs remain.
- 2026-10-24 — **Task 3**: contracts — `nominee/member-link.ts` (`NomineeMemberLink` new | keep, the declarer's `NomineeLinksView`, the
  marked member's `NomineeLinkRequestView` / page / query / params, the answer `yes` | `not_me` ⇒ `confirmed` | `not_me`,
  `NOMINEE_LINK_ERROR_CODES`), `NomineeDeclareEntry.memberLink` OPTIONAL, the contact-matches `purpose` (domain:
  `CONTACT_MATCH_NOMINEE_AUDIT_PURPOSE = 'contact_match_nominee'`, the SAME counters). The declare handler: `declare({ allowLink })`
  (signup `false` — 400 FIRST, ⛔ elevation lookup, charge, KMS or tx; Life Events `true`); the charge in its own scoped tx → normalise
  + ONE `mobileBlindIndexMany` (purpose `nominee_link_resolve`) OUTSIDE any tx → in the tx after the D3 lock and guards: lock the live
  links, resolve, PLAN before any write, then apply after `appendMemberDeclarationVersions`; one audit line per link written / ended
  (`nominee_link:<id>`, `{ rank }`). New module `modules/nominee-links/` (the declarer's read, the requests, the answer with
  per-handler idempotency — names decrypted AFTER commit through 6.36b's `names.ts`, reused), registered in `server.ts`. Five audit
  names in `AuthAuditEventType`. The number fence: the 6.36e files listed, the mark's identifiers added, and a SECOND rule for those
  files (⛔ a name or the other member's id in a sink — `err.name` excepted). OpenAPI re-emitted (the declare entry's `memberLink`;
  the signup 400). `createMemberNomineeLinksClient` + `contactMatches(numbers, purpose?)`.
- 2026-10-24 — **Task 7 / Step 9**: `ci:local` 34 / 36, the two reds resolved (the friction declaration added; the restoration gate's
  disposable-database override for this story's own database, and the API live suite run on its own) — Debug Log. Status → `review`
  (ledger `2026-10-24g` — `f` is 11b-4's). ⚠ **Open for review, ⛔ hidden:** (1) the Hindi `nominee_link` copy AWAITS BigDev's approval;
  (2) go-live waits on roster Row 31 (j) (counsel in writing) — ⛔ a merge blocker; (3) ⛔ demonstrated on a device (jsdom render tests
  only); (4) a declarer a claim names who submits a NEW mark gets the 422, ⛔ the 409 (Task 3's found ordering) *[dated 2026-10-24, round 3:
  SUPERSEDED — the review's `guardDeclare` makes it the 409]*; (5) 11b.4 also raises the
  rtbf pin and extends the audit union — whichever lands second re-bases.
- 2026-10-24 — **Task 6**: `anonymizeMember` gains the `eraseNomineeLinks` arm (every LIVE mark where the member is the declarer
  OR the nominee ⇒ `erased`; an ended mark keeps its end, an answered one its answer). `ProfileSection.nomineeLinks: { marked,
  namedBy }` in the contract FIRST (G11), then `assemble.ts` (marked: rank, versionNo, state, answer, askedAt, the name only once
  CONFIRMED; namedBy: state, answer, askedAt, the declarer's name — the request showed it); the presentation mode is now resolved
  when the member's only other-member names are marks.
- 2026-10-24 — **Task 4**: the jobs' three live legs (select, request child, reminder child) — a nominee marked by ACCOUNT with a
  declared number nobody signs in with; RED under a `memberIds`-dropping mutant.
- 2026-10-24 — **Task 5**: `NomineeForm` gains the `link` prop (Life Events ONLY): per slot the mark's label (asked / confirmed —
  the registered name / said it is not them + *"The mark still counts…"*), *Remove mark*, *Find* (hidden unless the caller may —
  `canNamePeople`, the SAME caller predicate as the match endpoint; V11), the G8 sentence, and *"Is this still …?"* on a marked
  slot's name / mobile edit (the save waits for the answer). The Life Events screen waits for the marks read (⛔ a form that would
  END every mark; a failed read shows Retry ⛔ the form), starts each slot with its rank's live mark as a `keep`, restores an OLD
  draft the same way (TR9), applies the find screen's pick on focus (an in-memory handoff — the keyed form remounts), maps each
  mark refusal to its own copy, and reloads the marks on a 409 stale. The NEW find screen `nominee-link-find` (its own notice; ONE
  match per form session held in memory, `purpose: 'nominee_link'`; iOS picker / Android typed; every state outside any list; ⛔
  invite list). The requests screen `nominee-link-requests` (the question, *"[Name] will see your answer."*, the consequence —
  V14 — and the two answers; ONE answer, a per-call `mutateAsync`, outcomes SHOWN AND SPOKEN). `NomineeLinkRequestEntry` on home
  (after the people card, before the prompt cards) and in the notice strip. `lib/nominee-links-api.ts`; the query keys under
  `['nominee-links', …]` with `gcTime: 0`, cleared on every account change. The `nominee_link` namespace (en + hi) registered in
  `catalog.ts` and classified member-facing. ⚠ **The Hindi is agent-drafted and AWAITS BigDev's approval** (NE6's rule, the 6.35
  LS14 precedent) — ⛔ approved by this run.

### File List

*(Complete at Step 9, 2026-10-24. Every path is relative to the repo root.)*

- `packages/domain/migrations/0181_member-nominee-links.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/member_nominee_links.ts` (new)
- `packages/domain/src/policies/member-nominee-links-rls.ts` (new)
- `packages/domain/src/schema/member_daily_counters.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/ids/index.ts`
- `packages/domain/src/nominee/member-links.ts` (new)
- `packages/domain/src/nominee/index.ts`
- `packages/domain/src/member/known-people.ts` (`chargeMemberCounter` exported; Task 3: the contact-match `purpose`)
- `packages/domain/src/claim/peer-mesh-nominees.ts`
- `packages/domain/src/claim/peer-mesh-read.ts`
- `packages/domain/src/claim/peer-mesh-request.ts`
- `packages/domain/src/claim/peer-mesh-wa-reminder.ts`
- `apps/jobs/src/claim-peer-mesh.ts`
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`
- `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts`
- `packages/domain/tests/integration/rls/member-nominee-links-policy-regression.spec.ts` (new)
- `packages/domain/tests/nominee/member-links.test.ts` (new)
- `packages/domain/tests/integration/nominee/member-links.spec.ts` (new)
- `packages/domain/tests/integration/nominee/member-links-concurrency.spec.ts` (new)
- `packages/domain/tests/claim/peer-mesh-nominees.test.ts`
- `packages/domain/tests/integration/claim/peer-mesh-workplace-snapshot.spec.ts`
- `packages/domain/tests/integration/claim/peer-mesh-request.spec.ts`
- `packages/domain/tests/integration/claim/peer-mesh-request-concurrency.spec.ts`
- `packages/domain/tests/integration/claim/peer-mesh-wa-reminder.spec.ts`
- `packages/domain/tests/integration/claim/peer-mesh-wa-reminder-concurrency.spec.ts`
- `apps/jobs/tests/claim-peer-mesh.test.ts` (Task 4: the select leg)
- `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts`
- `apps/jobs/tests/claim-peer-mesh-wa-reminders-live.test.ts`
- `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts`
- `apps/api/tests/integration/claims/peer-request-after-send.spec.ts`
- `packages/contracts/src/nominee/member-link.ts` (new)
- `packages/contracts/src/nominee/declaration.ts`
- `packages/contracts/src/nominee/index.ts`
- `packages/contracts/src/members/known-people.ts`
- `packages/contracts/scripts/emit-openapi.ts`
- `packages/contracts/tests/nominee-member-link.test.ts` (new)
- `openapi/v1.yaml`
- `apps/api/src/modules/nominee/nominee.handlers.ts`
- `apps/api/src/modules/nominee/nominee.routes.ts`
- `apps/api/src/modules/life-events/routes.ts`
- `apps/api/src/modules/known-people/handlers.ts`
- `apps/api/src/modules/nominee-links/handlers.ts` (new)
- `apps/api/src/modules/nominee-links/routes.ts` (new)
- `apps/api/src/modules/nominee-links/index.ts` (new)
- `apps/api/src/server.ts`
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/tests/unit/known-people-number-fence.test.ts`
- `apps/api/tests/integration/nominee/nominee-member-link.spec.ts` (new)
- `packages/api-client/src/index.ts`
- `packages/api-client/tests/nominee-links-client.test.ts` (new)
- `packages/i18n/locales/en/nominee_link.json` (new)
- `packages/i18n/locales/hi/nominee_link.json` (new)
- `packages/i18n/src/catalog.ts`
- `packages/i18n/locales/classification.json`
- `packages/i18n/tests/nominee-link-copy.test.ts` (new)
- `apps/mobile/lib/nominee-links.ts` (new)
- `apps/mobile/lib/nominee-links-api.ts` (new)
- `apps/mobile/lib/nominee-link-i18n.ts` (new)
- `apps/mobile/lib/session-context.tsx`
- `apps/mobile/components/nominee-links/nominee-links-cache.ts` (new)
- `apps/mobile/components/nominee-links/useNomineeLinkQueries.ts` (new)
- `apps/mobile/components/nominee-links/NomineeLinkRequestEntry.tsx` (new)
- `apps/mobile/components/life-events/NomineeForm.tsx`
- `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx`
- `apps/mobile/app/(life-events)/nominees.tsx`
- `apps/mobile/app/(life-events)/nominee-link-find.tsx` (new)
- `apps/mobile/app/(life-events)/nominee-link-requests.tsx` (new)
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/tests/unit/nominee-links-logic.test.ts` (new)
- `apps/mobile/tests/unit/nominee-form-link-render.test.ts` (new)
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/src/data-export/assemble.ts`
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/contracts/src/data-export/data-export.ts`
- `apps/jobs/tests/data-export.test.ts`
- `friction-budget.md` (Task 7 — the new row + the Story 6.36e disposition)

*Task 0 (governance, before dev — ledgers `2026-10-23al` … `2026-10-24d`):*

- `.decision-log.md` (`2026-10-24-396`, `2026-10-24-397`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-6-36e-nominee-member-link.md` (new)
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/6-36b-people-who-know-me.md`
- `_bmad-output/implementation-artifacts/6-36d-exclude-nominees-from-the-five.md`
- `docs/launch-gate-inventory/inventory-roster.md`
- `_bmad-output/implementation-artifacts/6-36e-nominee-member-link-at-declaration.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Code review 2026-10-24 — the patches (uncommitted on top of `ae0f3249`).** Modified: `apps/api/src/modules/nominee/nominee.handlers.ts`,
`apps/api/tests/integration/nominee/nominee-member-link.spec.ts`, `apps/jobs/tests/data-export.test.ts`,
`apps/mobile/app/(life-events)/{nominee-link-find,nominee-link-requests,nominees}.tsx`, `apps/mobile/components/life-events/NomineeForm.tsx`,
`apps/mobile/components/nominee-links/useNomineeLinkQueries.ts`, `apps/mobile/lib/{nominee-link-i18n,nominee-links-api,nominee-links}.ts`,
`apps/mobile/tests/unit/{nominee-form-link-render,nominee-links-logic}.test.ts`, `packages/contracts/src/data-export/data-export.ts`,
`packages/contracts/tests/nominee-member-link.test.ts`, `packages/domain/migrations/0181_member-nominee-links.sql` (a header comment only),
`packages/domain/src/{claim/peer-mesh-nominees,data-export/assemble,nominee/member-links}.ts`,
`packages/domain/tests/{claim/peer-mesh-nominees,nominee/member-links}.test.ts`,
`packages/domain/tests/integration/{claim/peer-mesh-workplace-snapshot,nominee/member-links}.spec.ts`,
`packages/i18n/locales/{classification.json,en/nominee_link.json,hi/nominee_link.json}`, `packages/i18n/tests/nominee-link-copy.test.ts`,
this story, and `deferred-work.md`. New: `apps/api/tests/unit/nominee-link-twins.test.ts`, `apps/mobile/tests/unit/nominee-link-match-purpose.test.ts`,
`apps/mobile/tests/unit/nominee-links-hooks.test.ts`. Committed alone: `.decision-log.md` (`2026-10-24-399`, `ae0f3249`).
**Round 2 (the fix-diff review's patches — the SAME files, plus):** new `apps/mobile/tests/unit/nominee-link-requests-render.test.ts` and
`apps/mobile/tests/unit/nominee-link-find-render.test.ts`; further changes in `apps/mobile/lib/nominee-links.ts` (`shownRequestAnswer`, `completeMarkName`,
`acceptMark`, `namePending`, the neutral draft label), `NomineeForm.tsx`, the three mobile screens, `packages/domain/src/nominee/member-links.ts` (the export's
viewer gate, the planner comment, the `-335` citation), the en + hi `nominee_link.json` (`find.not_listed`, `form.kept`, reworded `form.will_ask*`, `request.empty`),
and the tests beside each. `sprint-status.yaml`: ledger `2026-10-24h` and `2026-10-24i` (comments only; the row stays `review`).
**Round 3 (the fix-diff review's second set of patches — the SAME files, plus):** new `apps/mobile/tests/unit/nominee-screen-draft-pins.test.ts`; further changes in
`apps/mobile/lib/nominee-links.ts` (`shareNomineeLinkCheck`, `withRequestAnswered`, `shownRequestAnswer`, `completeMarkName`, `acceptMark`, `redactForDraft`,
`closeNameWindow`), `nominee-link-find.tsx` (the failure routes, `check(held)`, the announcement flag, the blocked note, 48 dp), `nominees.tsx` (the pick line),
`nominee-link-requests.tsx` (the recorded answer, the bounded POST, the closed line), `useNomineeLinkQueries.ts` (the cache mark), `NomineeForm.tsx` (the derived
refusal), `packages/domain/src/nominee/member-links.ts` (the any-rank carry, `shapeNomineeLinkExport`, the `listed` docstring), the contract JSDoc, `assemble.ts`,
the en + hi `nominee_link.json` (`form.will_ask*`, `note.body*`, `request.changed`), and the tests beside each (`apps/api/tests/unit/nominee-link-twins.test.ts`,
`packages/domain/tests/{nominee,integration/nominee}/member-links.*`, `apps/api/tests/integration/nominee/nominee-member-link.spec.ts`). `deferred-work.md`: a
round-3 section (five items); `sprint-status.yaml`: ledger `2026-10-24j` (comments only; the row stays `review`).
**Round 4 (the third set of patches — the SAME files, plus):** `apps/mobile/lib/nominee-links.ts` (`completeMarkName` append-only; `shareNomineeLinkCheck` a `Map`),
`nominee-link-find.tsx` (the session consult, the shared raw call that stores its own result, *Share more* at 48 dp), `nominee-link-requests.tsx` (the answer guard,
the kept Idempotency-Key, the permanent closed line), `NomineeForm.tsx` (`commit` clears the refusal), `packages/domain/src/nominee/member-links.ts` (one lookup, the
`-399` wording, the SQL `listed` comment), the contract JSDoc, and the tests beside each (the three render specs, the logic spec, the pins spec, the twins test, the
i18n copy test, `member-links.spec.ts`); `deferred-work.md`: the supersession item widened and the abort-signal item annotated; `sprint-status.yaml`: ledger `2026-10-24k`.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-24 | 1.15 | WORDING (BigDev: *"what will be asked? … we need to clarify that"*; chose *"see your name, confirm it is them"*): `note.body*`, `form.will_ask*` say the nominee will see the declarer's name and be asked to confirm it is them; `label.asked` *"Asked"* → *"Waiting for their answer"*; en + hi; the pins and the form render test updated. Mobile 1,481 · i18n 126 · typecheck 20 / 20 · gates 0. Hindi awaits BigDev. Status stays `review`. |
| 2026-10-24 | 1.14 | **DISCLOSURE REMOVED** (BigDev, answering *"where will `form.why` be used?"*: *"our system shouldn't be telling that we are going to ask the member chosen neighbours upon his death … people will … make groups to manipulate/bypass the system"*; *"go with option 1 and simply drop the nominee's consequence line"*): `2026-10-24-401` (author-commit, committed ALONE `ab154cbe`) supersedes V14's two consequence sentences; the copy + code `f77e6f61` deletes `form.why`, `request.consequence*` (81 → 78 keys en + hi) and their render sites, with an absence test and screen guards (each proven RED). Mobile 1,481 · i18n 126. NE6 / AC5 / Policy meaning carry dated notes. ⚠ Not covered, BigDev's: 6.36b's shipped `known_people.intro` (*"If none of your colleagues can be asked…"*); the privacy-policy line (roster Row 31 (j) — generic purpose, counsel's wording). Status stays `review`. |
| 2026-10-24 | 1.13 | FOLLOW-UP DECIDED (BigDev, on the device run's empty-form finding: *"C: server keeps the details"*): Story 6.36f `6-36f-nominee-mark-only-save` added as `backlog` (a marks-only save the server fulfils from the existing encrypted details; ⛔ prefill, ⛔ personal data to the phone); `epics.md` entry + `deferred-work.md` + ledger `2026-10-24o`. ⛔ A change to THIS story's code or Status (`review`). |
| 2026-10-24 | 1.12 | DEVICE RUN, SECOND PASS (BigDev: *"yes, do it"*): the permission-denied, contacts-limit and mark-limit paths, a second nominee, a swap of the two marks (both carried), *No* → "Said it is not them", draft save-and-resume, the stored draft inspected (⛔ a contact-saved name or another member's registered name), the 48 dp controls, and four TalkBack utterances each spoken once. Three pre-existing / cosmetic observations. ⛔ iOS / VoiceOver (no Xcode). Details: `**Device run, second pass**`. |
| 2026-10-24 | 1.11 | REBASED onto `origin/main` `6c4c1e47` (16 commits, all 5.11; no migration collision) and `ci:local` run (BigDev: *"1 and 2"*): 34 / 36 jobs in one run, the two reds (an admin load-flake; the 10.23 database-name guard + the aborted API live suite) each green re-run alone. Tests: domain 6,249 · api 2,105 · jobs 1,579 live · contracts 1,462 · i18n 125 · mobile 1,479. Status stays `review`; ⛔ pushed. Details: `**Rebase + ci:local**`. |
| 2026-10-24 | 1.10 | COMMITTED (`295584c0`, `6d07945d`) + THE DEVICE RUN (Android emulator, a real dev-client build, the real API on `twt_6_36e`; BigDev: *"commit it, then do the device run"*) + the one finding patched (BigDev: *"1 and 2"*): the five member-mark controls are 48 dp (they were 36); the run's record is `**Device run 2026-10-24**`. Mobile 1,479. Status stays `review`. |
| 2026-10-24 | 1.9 | FIX-DIFF REVIEW (round 4; BigDev: *"1"* — a fourth look, then *"1"* apply every patch): round 3's OWN delta (1,736 lines, 22 files, one chunk, rebuilt from the saved round-3 inputs and checked byte-for-byte against six backups) × three layers — about 32 raw findings → 0 decision + 10 patch + 0 new defer, 7 dismissed; no HIGH; the Auditor found no patch missing. Three more flaws in the previous round's patches fixed (the refusal that came back by itself, the name window passable by sharing a letter, the double-charge routes in the find flow); the answers screen gets a guard and a stable key; NE2 / AC3 gain the dated notes my patches 14–15 had skipped; the `-399` "as written" wording corrected (a lapsed viewer is covered by its principal clause, not by name). All 10 applied, **uncommitted**. Tests: domain 6,247 · api 2,105 · jobs 1,441 · contracts 1,455 · i18n 125 · mobile 1,478; 11 mutants RED. Status stays `review`. Details: `#### Fix-diff review — round 4`. |
| 2026-10-24 | 1.8 | FIX-DIFF REVIEW (round 3; BigDev: *"2"* again, then *"1"* on the decision and *"1"* apply every patch): the whole patch diff, 3,420 lines, TWO chunks (backend 1,301 · mobile 2,119) × three layers — 56 raw findings → 1 decision + 20 patch + 5 defer, 8 dismissed; **three more regressions of the earlier patches found and fixed** (a failed contacts check stranded the member in the fallback; the name window never closed; the fallback announcement re-fired). The decision — a lapsed member's export reads a live inbound mark as `ended`, no name, until they renew — resolved to option 1 (keep as `-399` call 2 reads, and SAY it) ⇒ the 21st patch, no new author-commit. All 21 applied, **uncommitted**; Policy meaning gains the export in the member's terms. Tests: domain 6,247 · api 2,105 · jobs 1,441 · contracts 1,455 · i18n 125 · mobile 1,470; 28 mutants RED. Status stays `review`. Details: `#### Fix-diff review — round 3`. |
| 2026-10-24 | 1.7 | FIX-DIFF REVIEW (round 2; BigDev: *"2"*, then *"1"* apply every patch): `git diff HEAD` + 3 untracked tests, 2,736 lines, one chunk × three layers — 32 raw findings → 0 decision + 17 patch + 3 defer, 7 dismissed; **one regression found and fixed (the answered request kept live buttons)**. All 17 applied, **uncommitted**; NE2, NE3, NE10 and AC3 carry dated notes, Policy meaning's caller-gate sentence CORRECTED (it was false for a member a claim names). Tests: domain 6,241 · api 2,103 · jobs 1,441 · contracts 1,455 · i18n 125 · mobile 1,445; two new render tests (requests, find). Status stays `review`. Details: `#### Fix-diff review — round 2`. |
| 2026-10-24 | 1.6 | CODE REVIEW (`bmad-code-review 6.36e`: three chunks × three layers, 99 raw findings) + the patches (BigDev: *"1"* on the decision, *"1"* apply every patch): 1 decision — the data export says no more about the other member than the app showed — resolved to option A as `2026-10-24-399` (committed ALONE, `ae0f3249`), extending `-333` call 3(a) / `-334` call 1; 16 patches + that decision applied, **uncommitted**; 10 deferred (`deferred-work.md`), 11 dismissed. NE3, NE5, NE10, AC1 and AC8 carry dated notes; Policy meaning gains the caller-gate and answerer-gate sentences. Status stays `review`: the patched code has ⛔ been through the fix-diff review, `ci:local` or a rebase. Details: `### Review Findings`. |
| 2026-10-24 | 1.5 | DEV COMPLETE (`bmad-dev-story 6.36e`): Tasks 1–7 — migration `0181_member-nominee-links`; the domain (NE2 plan / carry / end, the metered resolution, the answer, erase, export; 6.36d's fragment matches by number OR marked account); contracts + API (the declare's `allowLink` route flag and order, the `nominee-links` module, audit names, the fence, OpenAPI, the client); the jobs' live legs; mobile (the form's mark, the find and requests screens, the home / notice-strip entry, `nominee_link` en + hi — the Hindi AWAITS BigDev); erasure + export; the friction declaration. `ci:local` 34 / 36 then both reds resolved (Debug Log). Status → `review`. |
| 2026-10-24 | 1.4 | Task 0.4 DONE (BigDev *"yes, do it"*): `epics.md` `### Story 6.36e`; roster Row 31 leg (j) (ALL TEN) + Row 26 note; counsel question 7; `deferred-work.md` dated lines + a new section (five items); 6.36d (G18, ND8) and 6.36b (AC3) dated annotations; the sprint row note; ledger `2026-10-24d`. AC0 MET; next Task 1. |
| 2026-10-24 | 1.3 | Tasks 0.1–0.3 DONE: BigDev *"NE1-NE14 all recommended"*; the Panel ruled *"Q1 A, Q2 A"* (*"by DR and KB"*) ⇒ `2026-10-24-396` (Trustee-ratified, `44a65afa`) + `2026-10-24-397` (author-commit, `0f202476`), each committed alone; the note's RULED block filled; the PQ section dated; ledger `2026-10-24c` (`b` is 11b-4's, committed first). Status ready-for-dev; next Task 0.4. |
| 2026-10-24 | 1.2 | VALIDATED (`bmad-create-story validate 6.36e`; BigDev *"all"*): **V1** NE1's state split into `answer` × `state` (an answered link could never end or erase), `asked_at` explicit / carried, ⛔ 0162's CHECKs; **V2** a metered caller-gated `nominee_link_resolve` counter (4/day) BEFORE the HMAC (the declare was a free membership oracle); **V3** pre-fill + `keep` + edit-confirm, the draft carries the link, TR9 inverted; **V4** NE2's end rules (`FOR UPDATE` every live link, `keep` across ranks, every un-carried link ends, a raced answer is ⛔ lost); **V5** the link gets its OWN read — `NomineeStatusResponse` is read by the claim flow and is NON-PII; **V6** the premise narrowed (family phone, AR-24 unbuilt), the title, the cheaper picker alternative put to BigDev; **V7** a rulings → build table for every PQ outcome (PQ1 B × PQ2 B ≡ C); **V8** SUPERSEDES IN PART `-386` ND2 and Not covered item 1, ND8 "to be narrowed once done"; **V9** NUMBERS (≥ `-396`; `al` is 11b-4's; ≥ `aq`; 11b.4's rtbf count + audit union); **V10** G3's audit order; **V11** caller gate on `kind:'new'` only; **V12** one match per session, own notice, states, `purpose`; **V13** request closes on the declarer's death; **V14** consequence copy both sides; **V15** NE7 by projected version, AC6 legs; **V16** G7's five inline types + fixtures, TR5, stale check; **V17** TR3's reason; **V18** audit locator / context; **V19** wiring (i18n catalog, server.ts, api-client, fence, idempotency, brand, TR13); **V20** route flag, signup end rules; **V21** BEFORE INSERT version check, erase live only; **V22** CF5 "as put" quote, `-356` (ii) unratified, §0 rows for `-234` X / the meter / NE8 B; **V23** AI-10-1 one sentence each predicate, Niyamavali §6.3; **V24** the note's "you recorded this gap" → "our note told you of it"; **V25** export `nomineeLinks: { marked, namedBy }`; **V26** stale / loose text. The Panel note revised (still ⛔ sent). |
| 2026-10-23 | 1.1 | The Panel note WRITTEN (BigDev: *"yes commit and write the panel note"*): `trustee-panel-routing-note-2026-10-23-6-36e-nominee-member-link.md` — Q1 (record the account; when the answer counts — A / B / C), Q2 (what each side is told — A / B / C); our reading A, A; E1 checked verbatim, E4 run; ⛔ sent. Ledger `2026-10-23am`. |
| 2026-10-23 | 1.0 | Created (`bmad-create-story 6.36e`): G1–G14, NE1–NE14 PROPOSED, PQ1 / PQ2 OWED, AC0–AC10, Tasks 0–7. Status ready-for-dev; ⛔ code. |
